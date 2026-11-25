// Time-based archiving and rollover IPC handlers extracted from electron-main.js
'use strict';

const { runBackupWorker } = require('./backup-worker-client');

function registerArchiveIpc(ctx) {
  const {
    app,
    BrowserWindow,
    ipcMain,
    fs,
    path,
    getWritableRootDir,
    collectDirEntries,
    buildZip
  } = ctx;

  // ── Batch Time-Related Archiving & Rollover ──────────────────────────────────

  function _sanitizeArchiveFolderName(str) {
    return (str || '').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 60);
  }

  ipcMain.handle('app:archive-time-data', async (_event, options = {}) => {
    const {
      label = 'Archive',
      termScope = 'all',
      dateCutoff = null,
      modules = {},
      comments = ''
    } = options;

    const writableRoot = getWritableRootDir();
    const userDir = path.join(writableRoot, 'user');
    const archivesDir = path.join(userDir, 'archives');
    const safetyDir = path.join(archivesDir, '_safety_backups');

    try {
      await fs.mkdir(archivesDir, { recursive: true });
      await fs.mkdir(safetyDir, { recursive: true });

      // 1. Pre-archive safety snapshot ZIP of user/ directory
      const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyZipPath = path.join(safetyDir, `safety_backup_${safetyTimestamp}.zip`);
      const safetyRes = await runBackupWorker({
        op: 'zip',
        sourceDir: userDir,
        destFile: safetyZipPath,
        rootPrefix: 'user',
        includeMeta: false
      });
      if (!safetyRes || !safetyRes.ok) {
        throw new Error((safetyRes && safetyRes.error) || 'Failed to create safety backup ZIP');
      }



      // 2. Create archive target directory
      const datePrefix = new Date().toISOString().slice(0, 10);
      const cleanLabel = _sanitizeArchiveFolderName(label) || 'archive';
      const archiveId = `archive_${datePrefix}_${cleanLabel}_${Date.now().toString(36)}`;
      const archiveTargetDir = path.join(archivesDir, archiveId);
      await fs.mkdir(archiveTargetDir, { recursive: true });

      const archivedFiles = [];
      const recordCounts = {
        plannerEntries: 0,
        gradeFiles: 0,
        participationFiles: 0,
        mindmapFiles: 0,
        scheduleFiles: 0,
        toPrintFiles: 0,
        totalFiles: 0
      };

      // Move a single file and log it
      async function moveFileToArchive(srcRelPath, destSubdir = '') {
        const srcFull = path.join(userDir, srcRelPath);
        const exists = await fs.access(srcFull).then(() => true).catch(() => false);
        if (!exists) return false;
        const stat = await fs.stat(srcFull).catch(() => null);
        if (!stat || stat.isDirectory()) return false;

        const destFull = path.join(archiveTargetDir, destSubdir, path.basename(srcRelPath));
        await fs.mkdir(path.dirname(destFull), { recursive: true });
        await fs.copyFile(srcFull, destFull);
        await fs.unlink(srcFull).catch(() => { });

        archivedFiles.push({
          originalRelativePath: srcRelPath.replace(/\\/g, '/'),
          archiveRelativePath: path.relative(archiveTargetDir, destFull).replace(/\\/g, '/'),
          size: stat.size,
          mtimeMs: stat.mtimeMs
        });
        return true;
      }

      // Recursively move directory contents
      async function moveDirContentsToArchive(srcRelDir, destSubdir = '') {
        const srcFull = path.join(userDir, srcRelDir);
        let dirents;
        try {
          dirents = await fs.readdir(srcFull, { withFileTypes: true });
        } catch {
          return 0;
        }
        let movedCount = 0;
        for (const d of dirents) {
          const itemSrcRel = path.join(srcRelDir, d.name);
          if (d.isDirectory()) {
            movedCount += await moveDirContentsToArchive(itemSrcRel, path.join(destSubdir, d.name));
          } else if (d.isFile()) {
            const ok = await moveFileToArchive(itemSrcRel, destSubdir);
            if (ok) movedCount++;
          }
        }
        try {
          const remaining = await fs.readdir(srcFull);
          if (remaining.length === 0) await fs.rmdir(srcFull);
        } catch { }
        return movedCount;
      }

      // --- Module: Planner ---
      if (modules.planner) {
        const plannerCfgPath = path.join(userDir, 'planner-config.js');
        if (await fs.access(plannerCfgPath).then(() => true).catch(() => false)) {
          try {
            const cfgContent = await fs.readFile(plannerCfgPath, 'utf8');
            const fn = new Function('window', cfgContent + '\nreturn window.PLANNER_CONFIG || null;');
            const cfg = fn({ PLANNER_CONFIG: null });
            if (cfg) {
              let archivedEntries = [];
              let retainedEntries = [];
              let archivedTodos = [];
              let retainedTodos = [];

              if (Array.isArray(cfg.entries)) {
                if (dateCutoff) {
                  for (const e of cfg.entries) {
                    const entryDate = e.date || e.start || '';
                    if (entryDate && entryDate <= dateCutoff) archivedEntries.push(e);
                    else retainedEntries.push(e);
                  }
                } else {
                  archivedEntries = cfg.entries;
                  retainedEntries = [];
                }
              }

              if (Array.isArray(cfg.todos)) {
                if (dateCutoff) {
                  for (const t of cfg.todos) {
                    const tDate = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : '') || '';
                    if (tDate && tDate <= dateCutoff) archivedTodos.push(t);
                    else retainedTodos.push(t);
                  }
                } else {
                  archivedTodos = cfg.todos;
                  retainedTodos = [];
                }
              }

              const archivedCfg = Object.assign({}, cfg, {
                entries: archivedEntries,
                todos: archivedTodos
              });
              const archivedCfgPath = path.join(archiveTargetDir, 'planner-config.js');
              await fs.writeFile(archivedCfgPath, 'window.PLANNER_CONFIG = ' + JSON.stringify(archivedCfg, null, 2) + ';\n', 'utf8');
              const stat = await fs.stat(archivedCfgPath);
              archivedFiles.push({
                originalRelativePath: 'planner-config.js',
                archiveRelativePath: 'planner-config.js',
                size: stat.size,
                mtimeMs: stat.mtimeMs,
                entriesCount: archivedEntries.length,
                todosCount: archivedTodos.length
              });
              recordCounts.plannerEntries += archivedEntries.length;

              cfg.entries = retainedEntries;
              cfg.todos = retainedTodos;
              await fs.writeFile(plannerCfgPath, 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n', 'utf8');
            }
          } catch (pe) {
            console.warn('Archiving planner-config error:', pe);
          }
        }

        const plannerDirCount = await moveDirContentsToArchive('planner', 'planner');
        recordCounts.plannerEntries += plannerDirCount;
        await moveFileToArchive('todos.js', '');
      }

      // --- Module: Grades ---
      if (modules.grades) {
        const g1 = await moveDirContentsToArchive('grades', 'grades');
        const g2 = await moveDirContentsToArchive(path.join('log', 'grade-sheet'), path.join('log', 'grade-sheet'));
        recordCounts.gradeFiles += (g1 + g2);
      }

      // --- Module: Attendance & Participation ---
      if (modules.participation) {
        const p1 = await moveDirContentsToArchive('participation', 'participation');
        const p2 = await moveDirContentsToArchive('sessions', 'sessions');
        const p3 = await moveDirContentsToArchive('group-participation', 'group-participation');
        const p4 = await moveDirContentsToArchive('game-results', 'game-results');
        recordCounts.participationFiles += (p1 + p2 + p3 + p4);
      }

      // --- Module: Mindmaps (Constellations) ---
      if (modules.mindmaps) {
        const mmSrcFull = path.join(userDir, 'mindmaps');
        try {
          const dirents = await fs.readdir(mmSrcFull, { withFileTypes: true });
          for (const d of dirents) {
            if (d.name.toLowerCase() === 'templates' && d.isDirectory()) continue;
            if (d.isDirectory()) {
              recordCounts.mindmapFiles += await moveDirContentsToArchive(path.join('mindmaps', d.name), path.join('mindmaps', d.name));
            } else if (d.isFile()) {
              const ok = await moveFileToArchive(path.join('mindmaps', d.name), 'mindmaps');
              if (ok) recordCounts.mindmapFiles++;
            }
          }
        } catch { }
      }

      // --- Module: Schedules & Oral Marking ---
      if (modules.schedules) {
        const s1 = await moveDirContentsToArchive('schedules', 'schedules');
        const s2 = await moveDirContentsToArchive('oral-marking', 'oral-marking');
        recordCounts.scheduleFiles += (s1 + s2);
      }

      // --- Module: Print Queue ---
      if (modules.toprint) {
        const tp = await moveDirContentsToArchive('to-print', 'to-print');
        recordCounts.toPrintFiles += tp;
      }

      recordCounts.totalFiles = archivedFiles.length;

      // 3. Write archive-manifest.json
      const manifest = {
        archiveId,
        name: label || cleanLabel,
        createdAt: Date.now(),
        createdIso: new Date().toISOString(),
        termScope,
        dateCutoff,
        comments: comments || '',
        modules,
        recordCounts,
        safetyBackupZip: path.relative(userDir, safetyZipPath).replace(/\\/g, '/'),
        archivedFiles
      };

      await fs.writeFile(
        path.join(archiveTargetDir, 'archive-manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
      );

      // Broadcast change notification to all active windows
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('app:data-changed', { action: 'archive-rollover', archiveId });
        }
      }

      return {
        ok: true,
        archiveId,
        archivePath: archiveTargetDir,
        relativeArchivePath: path.relative(userDir, archiveTargetDir).replace(/\\/g, '/'),
        manifest,
        safetyBackupZipPath: safetyZipPath
      };
    } catch (err) {
      console.error('Error during archiveTimeData:', err);
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('app:list-archives', async () => {
    const writableRoot = getWritableRootDir();
    const archivesDir = path.join(writableRoot, 'user', 'archives');
    const results = [];

    try {
      const dirents = await fs.readdir(archivesDir, { withFileTypes: true });
      for (const d of dirents) {
        if (!d.isDirectory() || d.name === '_safety_backups') continue;
        const archiveDir = path.join(archivesDir, d.name);
        const manifestPath = path.join(archiveDir, 'archive-manifest.json');
        let manifest = null;
        if (await fs.access(manifestPath).then(() => true).catch(() => false)) {
          try {
            const raw = await fs.readFile(manifestPath, 'utf8');
            manifest = JSON.parse(raw);
          } catch { }
        }

        if (!manifest) {
          const stat = await fs.stat(archiveDir).catch(() => null);
          manifest = {
            archiveId: d.name,
            name: d.name.replace(/^archive_\d{4}-\d{2}-\d{2}_/, '').replace(/_[a-z0-9]+$/, '').replace(/_/g, ' '),
            createdAt: stat ? stat.birthtimeMs : Date.now(),
            createdIso: stat ? stat.birthtime.toISOString() : new Date().toISOString(),
            recordCounts: { totalFiles: 0 },
            modules: {}
          };
        }
        results.push(manifest);
      }
    } catch { }

    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { ok: true, archives: results };
  });

  ipcMain.handle('app:inspect-archive', async (_event, { archiveId } = {}) => {
    if (!archiveId) return { ok: false, error: 'archiveId required' };
    const writableRoot = getWritableRootDir();
    const archiveDir = path.join(writableRoot, 'user', 'archives', _sanitizeArchiveFolderName(archiveId));
    const manifestPath = path.join(archiveDir, 'archive-manifest.json');
    try {
      if (!(await fs.access(archiveDir).then(() => true).catch(() => false))) {
        return { ok: false, error: 'Archive not found' };
      }
      let manifest = null;
      if (await fs.access(manifestPath).then(() => true).catch(() => false)) {
        manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      }
      const files = await collectDirEntries(archiveDir, '');
      return { ok: true, manifest, files: files.map(f => ({ name: f.name, size: f.data ? f.data.length : 0, mtimeMs: f.mtimeMs })) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:restore-archive', async (_event, { archiveId, modules = null, replaceExisting = true } = {}) => {
    if (!archiveId) return { ok: false, error: 'archiveId required' };
    const writableRoot = getWritableRootDir();
    const userDir = path.join(writableRoot, 'user');
    const archiveDir = path.join(userDir, 'archives', _sanitizeArchiveFolderName(archiveId));

    try {
      if (!(await fs.access(archiveDir).then(() => true).catch(() => false))) {
        return { ok: false, error: 'Archive not found' };
      }

      async function restoreSubdir(subdir) {
        const srcSub = path.join(archiveDir, subdir);
        const destSub = path.join(userDir, subdir);
        if (!(await fs.access(srcSub).then(() => true).catch(() => false))) return 0;
        let count = 0;
        async function copyRec(s, d) {
          const dirents = await fs.readdir(s, { withFileTypes: true });
          for (const dirent of dirents) {
            const sFull = path.join(s, dirent.name);
            const dFull = path.join(d, dirent.name);
            if (dirent.isDirectory()) {
              await copyRec(sFull, dFull);
            } else if (dirent.isFile()) {
              if (!replaceExisting && (await fs.access(dFull).then(() => true).catch(() => false))) {
                continue;
              }
              await fs.mkdir(path.dirname(dFull), { recursive: true });
              await fs.copyFile(sFull, dFull);
              count++;
            }
          }
        }
        await copyRec(srcSub, destSub);
        return count;
      }

      let restoredCount = 0;
      const restoreAll = !modules || Object.keys(modules).length === 0 || Object.values(modules).every(v => v);

      if (restoreAll || (modules && modules.planner)) {
        const archivedCfgPath = path.join(archiveDir, 'planner-config.js');
        const activeCfgPath = path.join(userDir, 'planner-config.js');
        if (await fs.access(archivedCfgPath).then(() => true).catch(() => false)) {
          try {
            const archivedRaw = await fs.readFile(archivedCfgPath, 'utf8');
            const fnA = new Function('window', archivedRaw + '\nreturn window.PLANNER_CONFIG || null;');
            const archivedCfg = fnA({ PLANNER_CONFIG: null });
            if (archivedCfg) {
              let activeCfg = { entries: [], todos: [] };
              if (await fs.access(activeCfgPath).then(() => true).catch(() => false)) {
                try {
                  const activeRaw = await fs.readFile(activeCfgPath, 'utf8');
                  const fnB = new Function('window', activeRaw + '\nreturn window.PLANNER_CONFIG || null;');
                  activeCfg = fnB({ PLANNER_CONFIG: null }) || activeCfg;
                } catch { }
              }
              const activeEntries = Array.isArray(activeCfg.entries) ? activeCfg.entries : [];
              const existingIds = new Set(activeEntries.map(e => e.id).filter(Boolean));
              const toAddEntries = (Array.isArray(archivedCfg.entries) ? archivedCfg.entries : [])
                .filter(e => !e.id || !existingIds.has(e.id));
              activeCfg.entries = [...activeEntries, ...toAddEntries];

              const activeTodos = Array.isArray(activeCfg.todos) ? activeCfg.todos : [];
              const existingTodoIds = new Set(activeTodos.map(t => t.id).filter(Boolean));
              const toAddTodos = (Array.isArray(archivedCfg.todos) ? archivedCfg.todos : [])
                .filter(t => !t.id || !existingTodoIds.has(t.id));
              activeCfg.todos = [...activeTodos, ...toAddTodos];

              await fs.writeFile(activeCfgPath, 'window.PLANNER_CONFIG = ' + JSON.stringify(activeCfg, null, 2) + ';\n', 'utf8');
              restoredCount += (toAddEntries.length + toAddTodos.length);
            }
          } catch (e) { console.warn('Error restoring planner-config:', e); }
        }
        restoredCount += await restoreSubdir('planner');
      }

      if (restoreAll || (modules && modules.grades)) {
        restoredCount += await restoreSubdir('grades');
        restoredCount += await restoreSubdir(path.join('log', 'grade-sheet'));
      }

      if (restoreAll || (modules && modules.participation)) {
        restoredCount += await restoreSubdir('participation');
        restoredCount += await restoreSubdir('sessions');
        restoredCount += await restoreSubdir('group-participation');
        restoredCount += await restoreSubdir('game-results');
      }

      if (restoreAll || (modules && modules.mindmaps)) {
        restoredCount += await restoreSubdir('mindmaps');
      }

      if (restoreAll || (modules && modules.schedules)) {
        restoredCount += await restoreSubdir('schedules');
        restoredCount += await restoreSubdir('oral-marking');
      }

      if (restoreAll || (modules && modules.toprint)) {
        restoredCount += await restoreSubdir('to-print');
      }

      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('app:data-changed', { action: 'archive-restored', archiveId });
        }
      }

      return { ok: true, restoredCount };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:delete-archive', async (_event, { archiveId } = {}) => {
    if (!archiveId) return { ok: false, error: 'archiveId required' };
    const writableRoot = getWritableRootDir();
    const archiveDir = path.join(writableRoot, 'user', 'archives', _sanitizeArchiveFolderName(archiveId));
    try {
      if (await fs.access(archiveDir).then(() => true).catch(() => false)) {
        await fs.rm(archiveDir, { recursive: true, force: true });
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerArchiveIpc };
