// ZIP backup/restore and .board archive IPC handlers extracted from electron-main.js
'use strict';

function registerBackupBoardIpc(ctx) {
  const {
    app,
    dialog,
    ipcMain,
    fs,
    path,
    zlib,
    getWritableRootDir,
    collectDirEntries,
    buildZip,
    dosDateTimeToMs,
    getRequestingPage,
    sanitizeFilename,
    resolveAllowedTargetPath,
    sanitizeRelativePath,
    _broadcastDataChanged,
    normalizePlannerEntryIds,
    _sessionMetaCache
  } = ctx;

  ipcMain.handle('app:backup-zip', async (event) => {
    const BACKUP_META_ENTRY = '__backup_meta__.json';
    const writableRoot = getWritableRootDir();
    const targets = [
      { dir: path.join(writableRoot, 'user'), prefix: 'user' }
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Backup',
      defaultPath: path.join(app.getPath('downloads'), `backup-${dateStr}.zip`),
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    });

    if (canceled || !filePath) {
      return { ok: false, canceled: true };
    }

    const entries = [];
    for (const t of targets) {
      entries.push(...await collectDirEntries(t.dir, t.prefix));
    }

    const timestampMap = {};
    for (const entry of entries) {
      timestampMap[entry.name] = {
        mtimeMs: Number(entry.mtimeMs) || undefined,
        ctimeMs: Number(entry.ctimeMs) || undefined,
        birthtimeMs: Number(entry.birthtimeMs) || undefined
      };
    }

    const backupMeta = {
      version: 1,
      generatedAt: Date.now(),
      timestamps: timestampMap
    };
    entries.push({
      name: BACKUP_META_ENTRY,
      data: Buffer.from(JSON.stringify(backupMeta), 'utf8'),
      mtimeMs: Date.now()
    });

    const zipBuffer = await buildZip(entries);
    await fs.writeFile(filePath, zipBuffer);
    return { ok: true, path: filePath, count: entries.length };
  });

  // Extract zip entries into an array of { name, data, mtimeMs }
  // Supports optional entryFilter(filename) to skip decompressing or buffering unneeded entries
  async function parseZipEntries(zipBuffer, entryFilter = null) {
    const entries = [];
    let offset = 0;
    let loopCount = 0;

    while (offset < zipBuffer.length - 22) {
      const signature = zipBuffer.readUInt32LE(offset);

      // Local file header
      if (signature === 0x04034b50) {
        const filenameLen = zipBuffer.readUInt16LE(offset + 26);
        const extraLen = zipBuffer.readUInt16LE(offset + 28);
        const compressedSize = zipBuffer.readUInt32LE(offset + 18);
        const uncompressedSize = zipBuffer.readUInt32LE(offset + 22);
        const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
        const dosTime = zipBuffer.readUInt16LE(offset + 10);
        const dosDate = zipBuffer.readUInt16LE(offset + 12);
        const mtimeMs = dosDateTimeToMs(dosTime, dosDate);

        const filename = zipBuffer.toString('utf8', offset + 30, offset + 30 + filenameLen);
        const dataStart = offset + 30 + filenameLen + extraLen;
        const dataEnd = dataStart + compressedSize;

        if (typeof entryFilter === 'function' && !entryFilter(filename)) {
          offset = dataEnd;
          continue;
        }

        let data;
        if (compressionMethod === 8) {
          // Deflate compressed - async inflate in thread pool
          data = await new Promise((resolve) => {
            zlib.inflateRaw(zipBuffer.slice(dataStart, dataEnd), (err, res) => {
              resolve(err ? null : res);
            });
          });
        } else if (compressionMethod === 0) {
          // Stored (no compression)
          data = zipBuffer.slice(dataStart, dataEnd);
        }

        if (data && uncompressedSize === data.length) {
          entries.push({ name: filename, data, mtimeMs: mtimeMs || undefined });
        }

        offset = dataEnd;
        loopCount++;
        if (loopCount % 10 === 0) {
          await new Promise(r => setImmediate(r));
        }
      } else {
        offset += 1;
      }
    }

    return entries;
  }

  function normalizeZipEntryPath(entryName) {
    const raw = String(entryName || '').replace(/\\+/g, '/').trim();
    if (!raw) return null;

    // Normalize separators and remove leading "./" segments.
    const normalized = path.posix.normalize(raw).replace(/^\.\//, '');
    if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
      return null;
    }

    return normalized;
  }

  ipcMain.handle('app:restore-zip', async (event) => {
    const BACKUP_META_ENTRY = '__backup_meta__.json';
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Backup ZIP File',
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { ok: false, canceled: true };
    }

    const zipPath = filePaths[0];

    try {
      const zipBuffer = await fs.readFile(zipPath);
      const parsedEntries = await parseZipEntries(zipBuffer);
      const entries = parsedEntries.filter((entry) => normalizeZipEntryPath(entry.name) !== BACKUP_META_ENTRY);

      const writableRoot = getWritableRootDir();
      const targets = {
        log: path.join(writableRoot, 'user', 'log'),
        user: path.join(writableRoot, 'user')
      };

      // Check for conflicts
      const conflicts = [];
      for (const entry of entries) {
        const normalizedEntryPath = normalizeZipEntryPath(entry.name);
        if (!normalizedEntryPath) continue;

        const parts = normalizedEntryPath.split('/');
        if (parts.length < 2) continue;

        const target = parts[0];
        const relativePath = parts.slice(1).join('/');
        const targetDir = targets[target];

        if (!targetDir) continue;

        const fullPath = path.join(targetDir, relativePath);

        try {
          await fs.access(fullPath);
          // File exists, add to conflicts
          conflicts.push({
            id: normalizedEntryPath.replace(/\//g, '_'),
            path: normalizedEntryPath
          });
        } catch {
          // File doesn't exist, no conflict
        }
      }

      return {
        ok: true,
        zipPath,
        conflicts,
        fileCount: entries.length
      };
    } catch (err) {
      return {
        ok: false,
        error: err && err.message ? err.message : 'Failed to read zip file'
      };
    }
  });

  ipcMain.handle('app:apply-restore-choices', async (event, request = {}) => {
    const BACKUP_META_ENTRY = '__backup_meta__.json';
    const { zipPath, choices = {} } = request;

    if (!zipPath) {
      return { ok: false, error: 'No zip path provided' };
    }

    try {
      const zipBuffer = await fs.readFile(zipPath);
      const parsedEntries = await parseZipEntries(zipBuffer);
      const backupMetaEntry = parsedEntries.find((entry) => normalizeZipEntryPath(entry.name) === BACKUP_META_ENTRY);
      let backupMetaTimestamps = null;

      if (backupMetaEntry) {
        try {
          const parsed = JSON.parse(backupMetaEntry.data.toString('utf8'));
          if (parsed && typeof parsed === 'object' && parsed.timestamps && typeof parsed.timestamps === 'object') {
            backupMetaTimestamps = parsed.timestamps;
          }
        } catch { }
      }

      const entries = parsedEntries.filter((entry) => normalizeZipEntryPath(entry.name) !== BACKUP_META_ENTRY);

      const writableRoot = getWritableRootDir();
      const targets = {
        log: path.join(writableRoot, 'user', 'log'),
        user: path.join(writableRoot, 'user')
      };

      let restored = 0;

      for (const entry of entries) {
        const normalizedEntryPath = normalizeZipEntryPath(entry.name);
        if (!normalizedEntryPath) continue;

        const parts = normalizedEntryPath.split('/');
        if (parts.length < 2) continue;

        const target = parts[0];
        const relativePath = parts.slice(1).join('/');
        const targetDir = targets[target];

        if (!targetDir) continue;

        const fullPath = path.join(targetDir, relativePath);
        const entryId = normalizedEntryPath.replace(/\//g, '_');
        const choice = choices[entryId];

        // Check if file exists
        let fileExists = false;
        try {
          await fs.access(fullPath);
          fileExists = true;
        } catch { }

        // Skip if file exists and choice is 'skip' or not specified
        if (fileExists && (!choice || choice === 'skip')) {
          continue;
        }

        // Handle rename (backup original)
        if (fileExists && choice === 'rename') {
          const ext = path.extname(fullPath);
          const base = fullPath.slice(0, -ext.length);
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const backupPath = `${base}.bak-${timestamp}${ext}`;
          await fs.rename(fullPath, backupPath);
        }

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // Write file (overwrite or new) — use atomic temp+rename to avoid 0-byte
        // files if the process is interrupted mid-write.
        const tmpRestorePath = fullPath + '.tmp';
        try {
          await fs.writeFile(tmpRestorePath, entry.data);
          await fs.unlink(fullPath).catch(() => { });
          await fs.rename(tmpRestorePath, fullPath);
        } catch (writeErr) {
          await fs.unlink(tmpRestorePath).catch(() => { });
          throw writeErr;
        }

        const metaTs = backupMetaTimestamps && backupMetaTimestamps[normalizedEntryPath]
          ? backupMetaTimestamps[normalizedEntryPath]
          : null;
        const mtimeMs = Number(
          (metaTs && metaTs.mtimeMs) ||
          entry.mtimeMs ||
          0
        );
        if (Number.isFinite(mtimeMs) && mtimeMs > 0) {
          const t = new Date(mtimeMs);
          await fs.utimes(fullPath, t, t).catch(() => { });
        }

        restored++;
      }

      return {
        ok: true,
        restored,
        message: `Successfully restored ${restored} files`
      };
    } catch (err) {
      return {
        ok: false,
        error: err && err.message ? err.message : 'Failed to restore files'
      };
    }
  });

  // ── Board Archive (.cstz) IPC Handlers ────────────────────────────────
  ipcMain.handle('app:save-board-archive', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const target = request.target || 'mindmaps';
    const rawFilename = request.filename || request.name || 'board.cstz';
    const filename = sanitizeFilename(rawFilename);
    const { targetDir } = resolveAllowedTargetPath(pageFile, target, request.subdir ? path.join(request.subdir, filename) : filename);

    const rawEntries = Array.isArray(request.entries) ? request.entries : [];
    const zipEntries = [];

    for (const entry of rawEntries) {
      if (!entry || !entry.name) continue;
      const name = String(entry.name).replace(/\\/g, '/');
      let data;
      if (Buffer.isBuffer(entry.data)) {
        data = entry.data;
      } else if (entry.data && entry.data.buffer instanceof ArrayBuffer) {
        data = Buffer.from(entry.data.buffer, entry.data.byteOffset || 0, entry.data.byteLength || entry.data.length);
      } else if (entry.encoding === 'base64') {
        let rawB64 = String(entry.data || '');
        const commaIdx = rawB64.indexOf(',');
        if (rawB64.startsWith('data:') && commaIdx !== -1) {
          rawB64 = rawB64.slice(commaIdx + 1);
        }
        data = Buffer.from(rawB64, 'base64');
      } else {
        data = Buffer.from(String(entry.data || ''), 'utf8');
      }
      const store = entry.store !== false && entry.compressionMethod !== 8;
      zipEntries.push({
        name,
        data,
        store,
        compressionMethod: store ? 0 : 8,
        mtimeMs: entry.mtimeMs || Date.now()
      });
    }

    const zipBuffer = await buildZip(zipEntries);
    const finalDir = request.subdir ? path.resolve(targetDir, sanitizeRelativePath(request.subdir)) : targetDir;
    await fs.mkdir(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, filename);
    const randTag = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    const tmpPath = path.join(finalDir, '.' + filename + '.' + randTag + '.tmp');

    try {
      await fs.writeFile(tmpPath, zipBuffer);
      let renamed = false;
      let lastErr = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await fs.rename(tmpPath, finalPath);
          renamed = true;
          break;
        } catch (renameErr) {
          lastErr = renameErr;
          if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST' || renameErr.code === 'EBUSY' || renameErr.code === 'EACCES') {
            await fs.unlink(finalPath).catch(() => { });
            await new Promise(r => setTimeout(r, 60));
          } else {
            break;
          }
        }
      }
      if (!renamed) {
        throw lastErr || new Error('Could not rename temp archive to target path');
      }
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => { });
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }

    _broadcastDataChanged(event, pageFile, {
      action: 'save-file',
      filename,
      target,
      subdir: request.subdir || null
    });

    return { ok: true, filename, path: finalPath, size: zipBuffer.length };
  });

  ipcMain.handle('app:read-board-archive', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const target = request.target || 'mindmaps';
    const relativePath = request.relativePath || request.filename || '';
    const { fullPath } = resolveAllowedTargetPath(pageFile, target, relativePath);

    try {
      const zipBuffer = await fs.readFile(fullPath);
      const parsedEntries = await parseZipEntries(zipBuffer);

      let manifest = null;
      let boardData = null;
      const history = [];
      const media = {};
      const thumbnails = {};

      for (const entry of parsedEntries) {
        const normName = normalizeZipEntryPath(entry.name) || entry.name;
        if (normName === 'manifest.json') {
          try { manifest = JSON.parse(entry.data.toString('utf8')); } catch { }
        } else if (normName === 'board.json') {
          try { boardData = JSON.parse(entry.data.toString('utf8')); } catch { }
        } else if (normName.startsWith('history/') && normName.endsWith('.json')) {
          try {
            history.push({
              name: normName.slice('history/'.length),
              data: JSON.parse(entry.data.toString('utf8')),
              mtimeMs: entry.mtimeMs
            });
          } catch { }
        } else if (normName.startsWith('page-snapshots/') || normName.startsWith('thumbnails/') || normName.startsWith('thumbnail.') || normName === 'thumbnail.png') {
          const base64 = entry.data.toString('base64');
          const mimeType = (normName.endsWith('.png')) ? 'image/png' : (normName.endsWith('.jpg') || normName.endsWith('.jpeg') ? 'image/jpeg' : 'image/webp');
          const dataUrl = 'data:' + mimeType + ';base64,' + base64;
          thumbnails[normName] = dataUrl;
          const fileName = normName.split('/').pop();
          const mediaEntry = {
            name: fileName,
            kind: 'pics',
            subPath: normName,
            base64: base64,
            size: entry.data.length,
            mtimeMs: entry.mtimeMs
          };
          media[normName] = mediaEntry;
        } else if (normName.startsWith('media/') || /^(pdf|pics|images|sounds|sound|audio|videos|video)\//i.test(normName)) {
          const mediaSubPath = normName.startsWith('media/') ? normName.slice('media/'.length) : normName;
          const parts = mediaSubPath.split('/');
          const rawKind = parts[0].toLowerCase();
          const kind = rawKind === 'images' ? 'pics' : ((rawKind === 'sound' || rawKind === 'audio' || rawKind === 'sounds') ? 'sounds' : ((rawKind === 'video' || rawKind === 'videos') ? 'videos' : rawKind));
          const fileName = parts.slice(1).join('/');
          const ext = path.extname(fileName).toLowerCase();
          let mime = '';
          if (ext === '.webp') mime = 'image/webp';
          else if (ext === '.png') mime = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
          else if (ext === '.gif') mime = 'image/gif';
          else if (ext === '.svg') mime = 'image/svg+xml';
          else if (ext === '.pdf') mime = 'application/pdf';
          else if (ext === '.mp3') mime = 'audio/mpeg';
          else if (ext === '.wav') mime = 'audio/wav';
          else if (ext === '.ogg') mime = kind === 'sounds' ? 'audio/ogg' : 'video/ogg';
          else if (ext === '.m4a') mime = 'audio/mp4';
          else if (ext === '.aac') mime = 'audio/aac';
          else if (ext === '.flac') mime = 'audio/flac';
          else if (ext === '.mp4') mime = 'video/mp4';
          else if (ext === '.m4v') mime = 'video/mp4';
          else if (ext === '.avi') mime = 'video/x-msvideo';
          else if (ext === '.mkv') mime = 'video/x-matroska';
          else if (ext === '.mov') mime = 'video/quicktime';
          else if (ext === '.webm') mime = kind === 'sounds' ? 'audio/webm' : 'video/webm';
          else if (ext === '.opus' || ext === '.weba') mime = kind === 'sounds' ? 'audio/ogg' : 'video/webm';
          else mime = kind === 'pics' ? 'image/webp' : (kind === 'sounds' ? 'audio/wav' : (kind === 'videos' ? 'video/webm' : 'application/octet-stream'));

          const mediaEntry = {
            name: fileName,
            kind: kind,
            mime: mime,
            subPath: mediaSubPath,
            base64: entry.data.toString('base64'),
            size: entry.data.length,
            mtimeMs: entry.mtimeMs
          };
          media[mediaSubPath] = mediaEntry;
          media['media/' + mediaSubPath] = mediaEntry;
          media[kind + '/' + fileName] = mediaEntry;
          media[fileName] = mediaEntry;
          media[fileName.toLowerCase()] = mediaEntry;
        }
      }

      if (manifest && boardData) {
        if (!boardData._createdAt && (manifest.createdAt || manifest._createdAt)) {
          boardData._createdAt = Number(manifest.createdAt || manifest._createdAt);
        }
        if (!boardData._savedAt && (manifest.updatedAt || manifest.savedAt || manifest._savedAt)) {
          boardData._savedAt = Number(manifest.updatedAt || manifest.savedAt || manifest._savedAt);
        }
        if (!boardData.dateCreated && manifest.dateCreated) {
          boardData.dateCreated = manifest.dateCreated;
        }
      }

      return {
        ok: true,
        filename: path.basename(fullPath),
        manifest,
        boardData,
        history,
        media,
        thumbnails,
        size: zipBuffer.length
      };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  function extractSearchTextFromBoardData(boardData, maxLen = 50000) {
    if (!boardData || typeof boardData !== 'object') return '';
    const tokens = [];
    let totalLen = 0;

    function addText(str) {
      if (!str || totalLen >= maxLen) return;
      const clean = String(str).trim();
      if (!clean) return;
      tokens.push(clean);
      totalLen += clean.length + 1;
    }

    function processPage(page) {
      if (!page || typeof page !== 'object') return;
      addText(page.title);

      if (Array.isArray(page.nodes)) {
        for (const node of page.nodes) {
          if (!node) continue;
          addText(node.baseWord);
          addText(node.dbWord);
          addText(node.sourceWord);
          addText(node.notes);
          addText(node.comment);
          addText(node.label);
        }
      }

      if (Array.isArray(page.notes)) {
        for (const note of page.notes) {
          if (!note) continue;
          addText(note.title);
          addText(note.text);
          addText(note.content);
        }
      }

      if (Array.isArray(page.tables)) {
        for (const table of page.tables) {
          if (!table) continue;
          addText(table.title);
          if (Array.isArray(table.headers)) {
            for (const h of table.headers) addText(h);
          }
          if (Array.isArray(table.rows)) {
            for (const row of table.rows) {
              if (Array.isArray(row)) {
                for (const cell of row) addText(cell);
              }
            }
          }
        }
      }

      if (Array.isArray(page.groups)) {
        for (const group of page.groups) {
          if (!group) continue;
          addText(group.title);
          addText(group.label);
        }
      }

      if (Array.isArray(page.edges)) {
        for (const edge of page.edges) {
          if (!edge) continue;
          addText(edge.label);
        }
      }

      if (Array.isArray(page.shapes)) {
        for (const shape of page.shapes) {
          if (!shape) continue;
          addText(shape.text);
          addText(shape.label);
        }
      }

      if (Array.isArray(page.media)) {
        for (const m of page.media) {
          if (!m) continue;
          addText(m.title);
          addText(m.name);
          addText(m.caption);
        }
      }
    }

    addText(boardData.title);
    if (Array.isArray(boardData.pages) && boardData.pages.length > 0) {
      for (const page of boardData.pages) {
        processPage(page);
      }
    } else {
      processPage(boardData);
    }

    return tokens.join(' ').slice(0, maxLen);
  }

  ipcMain.handle('app:inspect-board-archive', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const target = request.target || 'mindmaps';
    const relativePath = request.relativePath || request.filename || '';
    const { fullPath } = resolveAllowedTargetPath(pageFile, target, relativePath);

    try {
      const zipBuffer = await fs.readFile(fullPath);
      // Selective inspection: only parse manifest, board data, and primary thumbnail.
      // Skip all media assets (images, sound recordings, videos, pdfs) to avoid memory and CPU overhead!
      const parsedEntries = await parseZipEntries(zipBuffer, (name) => {
        const n = (normalizeZipEntryPath(name) || name).toLowerCase();
        return n === 'manifest.json' ||
          n === 'board.json' ||
          n === 'thumbnail.webp' ||
          n === 'thumbnail.png' ||
          n === 'page-snapshots/page-001.webp' ||
          n === 'page-snapshots/page-001.png';
      });

      let manifest = null;
      let rawBoardData = null;
      let boardDataSummary = null;
      let thumbnail = null;

      for (const entry of parsedEntries) {
        const normName = normalizeZipEntryPath(entry.name) || entry.name;
        if (normName === 'manifest.json') {
          try { manifest = JSON.parse(entry.data.toString('utf8')); } catch { }
        } else if (normName === 'board.json') {
          try {
            rawBoardData = JSON.parse(entry.data.toString('utf8'));
            const rawPids = normalizePlannerEntryIds(
              rawBoardData._plannerEntryIds,
              rawBoardData.plannerEntryIds,
              rawBoardData._plannerEntryId,
              rawBoardData.plannerEntryId,
              rawBoardData.manifest && rawBoardData.manifest.plannerEntryIds,
              rawBoardData.manifest && rawBoardData.manifest.plannerEntryId
            );
            boardDataSummary = {
              title: rawBoardData.title,
              _type: rawBoardData._type,
              classGroup: rawBoardData._classGroup || rawBoardData.classGroup || '',
              _classGroup: rawBoardData._classGroup || rawBoardData.classGroup || '',
              _plannerEntryIds: rawPids,
              plannerEntryIds: rawPids,
              _plannerEntryId: rawPids[0] || '',
              plannerEntryId: rawPids[0] || '',
              lessonId: rawBoardData._lessonId || rawBoardData.lessonId || (rawBoardData.manifest && (rawBoardData.manifest.lessonId || rawBoardData.manifest._lessonId)) || '',
              competences: Array.isArray(rawBoardData.competences) ? rawBoardData.competences : (Array.isArray(rawBoardData.competenceTags) ? rawBoardData.competenceTags : []),
              pageCount: Array.isArray(rawBoardData.pages) ? rawBoardData.pages.length : 1
            };
          } catch { }
        } else if (!thumbnail && (normName === 'page-snapshots/page-001.webp' || normName === 'page-snapshots/page-001.png' || normName === 'thumbnail.webp' || normName === 'thumbnail.png')) {
          const mimeType = (normName.endsWith('.png')) ? 'image/png' : 'image/webp';
          thumbnail = 'data:' + mimeType + ';base64,' + entry.data.toString('base64');
        }
      }

      if (manifest && !manifest.classGroup && boardDataSummary && boardDataSummary.classGroup) {
        manifest.classGroup = boardDataSummary.classGroup;
      }

      const combinedPlannerEntryIds = normalizePlannerEntryIds(
        manifest && manifest.plannerEntryIds,
        manifest && manifest._plannerEntryIds,
        manifest && manifest.plannerEntryId,
        boardDataSummary && boardDataSummary.plannerEntryIds,
        boardDataSummary && boardDataSummary._plannerEntryId
      );
      if (manifest) {
        manifest.plannerEntryIds = combinedPlannerEntryIds;
        manifest.plannerEntryId = combinedPlannerEntryIds[0] || '';
      }

      let searchText = '';
      if (manifest && typeof manifest.searchText === 'string' && manifest.searchText) {
        searchText = manifest.searchText;
      } else if (rawBoardData) {
        searchText = extractSearchTextFromBoardData(rawBoardData, 50000);
      }

      const stat = await fs.stat(fullPath);
      const createdAt = Number(manifest && (manifest.createdAt || manifest._createdAt))
        || Number(boardDataSummary && (boardDataSummary._createdAt || boardDataSummary.createdAt))
        || ((boardDataSummary && boardDataSummary.dateCreated) ? Date.parse(String(boardDataSummary.dateCreated).replace(/_\d+$/, '')) : 0)
        || ((manifest && manifest.dateCreated) ? Date.parse(String(manifest.dateCreated).replace(/_\d+$/, '')) : 0)
        || 0;
      const savedAt = Number(manifest && (manifest.updatedAt || manifest.savedAt || manifest._savedAt))
        || Number(boardDataSummary && (boardDataSummary._savedAt || boardDataSummary.savedAt))
        || stat.mtimeMs;

      return {
        ok: true,
        filename: path.basename(fullPath),
        relativePath,
        manifest: manifest || boardDataSummary,
        thumbnail: thumbnail || null,
        classGroup: (manifest && manifest.classGroup) || (boardDataSummary && boardDataSummary.classGroup) || '',
        plannerEntryIds: combinedPlannerEntryIds,
        plannerEntryId: combinedPlannerEntryIds[0] || '',
        lessonId: (manifest && (manifest.lessonId || manifest._lessonId)) || (boardDataSummary && boardDataSummary.lessonId) || '',
        competences: (manifest && Array.isArray(manifest.competences)) ? manifest.competences : ((boardDataSummary && Array.isArray(boardDataSummary.competences)) ? boardDataSummary.competences : []),
        createdAt: createdAt || undefined,
        savedAt: savedAt || stat.mtimeMs,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        searchText: searchText || ''
      };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  ipcMain.handle('app:update-board-archive-meta', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const target = request.target || 'mindmaps';
    const relativePath = request.relativePath || request.filename || '';
    if (!relativePath) return { ok: false, error: 'Missing relativePath' };
    const { fullPath } = resolveAllowedTargetPath(pageFile, target, relativePath);
    const ext = path.extname(fullPath).toLowerCase();

    const computeNextPlannerEntryIds = (existingIds) => {
      let next = normalizePlannerEntryIds(existingIds);
      if (Array.isArray(request.plannerEntryIds)) {
        next = normalizePlannerEntryIds(request.plannerEntryIds);
      } else if (typeof request.plannerEntryId === 'string') {
        next = normalizePlannerEntryIds(request.plannerEntryId);
      }
      if (request.addPlannerEntryIds) {
        next = normalizePlannerEntryIds(next, request.addPlannerEntryIds);
      }
      if (request.removePlannerEntryIds) {
        const rem = new Set(normalizePlannerEntryIds(request.removePlannerEntryIds));
        next = next.filter(id => !rem.has(id));
      }
      return next;
    };

    try {
      if (ext === '.cstz' || ext === '.zip') {
        const zipBuffer = await fs.readFile(fullPath);
        const parsedEntries = await parseZipEntries(zipBuffer);
        let manifestObj = null;
        let boardObj = null;

        for (const entry of parsedEntries) {
          const normName = normalizeZipEntryPath(entry.name) || entry.name;
          if (normName === 'manifest.json') {
            try { manifestObj = JSON.parse(entry.data.toString('utf8')); } catch { }
          } else if (normName === 'board.json') {
            try { boardObj = JSON.parse(entry.data.toString('utf8')); } catch { }
          }
        }

        const existingIds = normalizePlannerEntryIds(
          manifestObj && manifestObj.plannerEntryIds,
          manifestObj && manifestObj._plannerEntryIds,
          manifestObj && manifestObj.plannerEntryId,
          boardObj && boardObj._plannerEntryIds,
          boardObj && boardObj.plannerEntryIds,
          boardObj && boardObj._plannerEntryId,
          boardObj && boardObj.plannerEntryId
        );
        const nextIds = computeNextPlannerEntryIds(existingIds);
        const primaryId = nextIds[0] || '';
        const now = Date.now();

        const zipEntries = [];
        let sawManifest = false;
        for (const entry of parsedEntries) {
          const normName = normalizeZipEntryPath(entry.name) || entry.name;
          if (normName === 'manifest.json') {
            sawManifest = true;
            const updatedManifest = Object.assign({}, manifestObj || {}, {
              plannerEntryIds: nextIds,
              plannerEntryId: primaryId,
              updatedAt: now,
              savedAt: now
            });
            if (typeof request.classGroup === 'string' && request.classGroup) {
              updatedManifest.classGroup = request.classGroup;
            }
            zipEntries.push({
              name: 'manifest.json',
              data: Buffer.from(JSON.stringify(updatedManifest, null, 2), 'utf8'),
              store: true,
              compressionMethod: 0,
              mtimeMs: now
            });
          } else if (normName === 'board.json' && boardObj && typeof boardObj === 'object') {
            boardObj._plannerEntryIds = nextIds;
            boardObj.plannerEntryIds = nextIds;
            if (primaryId) {
              boardObj._plannerEntryId = primaryId;
              boardObj.plannerEntryId = primaryId;
            } else {
              delete boardObj._plannerEntryId;
              delete boardObj.plannerEntryId;
            }
            if (typeof request.classGroup === 'string' && request.classGroup && !boardObj._classGroup) {
              boardObj._classGroup = request.classGroup;
            }
            boardObj._savedAt = now;
            zipEntries.push({
              name: 'board.json',
              data: Buffer.from(JSON.stringify(boardObj, null, 2), 'utf8'),
              store: true,
              compressionMethod: 0,
              mtimeMs: now
            });
          } else {
            zipEntries.push({
              name: normName,
              data: entry.data,
              store: entry.compressionMethod === 0,
              compressionMethod: entry.compressionMethod || 0,
              mtimeMs: entry.mtimeMs || now
            });
          }
        }

        if (!sawManifest) {
          const newManifest = {
            version: 1,
            format: 'cstz',
            title: (boardObj && boardObj.title) || path.basename(fullPath, ext),
            classGroup: (typeof request.classGroup === 'string' && request.classGroup) || (boardObj && (boardObj._classGroup || boardObj.classGroup)) || '',
            plannerEntryIds: nextIds,
            plannerEntryId: primaryId,
            updatedAt: now,
            savedAt: now
          };
          zipEntries.unshift({
            name: 'manifest.json',
            data: Buffer.from(JSON.stringify(newManifest, null, 2), 'utf8'),
            store: true,
            compressionMethod: 0,
            mtimeMs: now
          });
        }

        const newZipBuffer = await buildZip(zipEntries);
        const finalDir = path.dirname(fullPath);
        const filename = path.basename(fullPath);
        const randTag = String(now) + '-' + Math.random().toString(36).slice(2, 8);
        const tmpPath = path.join(finalDir, '.' + filename + '.' + randTag + '.tmp');
        try {
          await fs.writeFile(tmpPath, newZipBuffer);
          let renamed = false;
          let lastErr = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              await fs.rename(tmpPath, fullPath);
              renamed = true;
              break;
            } catch (renameErr) {
              lastErr = renameErr;
              if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST' || renameErr.code === 'EBUSY' || renameErr.code === 'EACCES') {
                await fs.unlink(fullPath).catch(() => { });
                await new Promise(r => setTimeout(r, 60));
              } else {
                break;
              }
            }
          }
          if (!renamed) throw lastErr || new Error('Could not rename temp archive');
        } catch (writeErr) {
          await fs.unlink(tmpPath).catch(() => { });
          throw writeErr;
        }

        _sessionMetaCache.clear();
        _broadcastDataChanged(event, pageFile, {
          action: 'save-file',
          filename,
          target,
          relativePath
        });
        return { ok: true, filename, relativePath, plannerEntryIds: nextIds, plannerEntryId: primaryId };
      } else if (ext === '.js' || ext === '.json') {
        const rawText = await fs.readFile(fullPath, 'utf8');
        const isJs = ext === '.js' || /^\s*window\.[A-Z0-9_]+\s*=/m.test(rawText);
        let prefix = 'window.CONSTELLATION_SESSION_EXPORT = ';
        let jsonStr = rawText.trim();
        const assignMatch = jsonStr.match(/^(\s*(?:\/\/[^\n]*\n\s*)*window\.[A-Za-z0-9_]+\s*=\s*)/);
        if (assignMatch) {
          prefix = assignMatch[1];
          jsonStr = jsonStr.slice(assignMatch[1].length).replace(/;\s*$/, '').trim();
        }
        const parsed = JSON.parse(jsonStr);
        const existingIds = normalizePlannerEntryIds(
          parsed._plannerEntryIds,
          parsed.plannerEntryIds,
          parsed._plannerEntryId,
          parsed.plannerEntryId
        );
        const nextIds = computeNextPlannerEntryIds(existingIds);
        const primaryId = nextIds[0] || '';
        parsed._plannerEntryIds = nextIds;
        parsed.plannerEntryIds = nextIds;
        if (primaryId) {
          parsed._plannerEntryId = primaryId;
          parsed.plannerEntryId = primaryId;
        } else {
          delete parsed._plannerEntryId;
          delete parsed.plannerEntryId;
        }
        if (typeof request.classGroup === 'string' && request.classGroup && !parsed._classGroup) {
          parsed._classGroup = request.classGroup;
        }
        parsed._savedAt = Date.now();
        const outText = isJs
          ? (prefix + JSON.stringify(parsed, null, 2) + ';\n')
          : (JSON.stringify(parsed, null, 2) + '\n');
        await fs.writeFile(fullPath, outText, 'utf8');
        _sessionMetaCache.clear();
        const filename = path.basename(fullPath);
        _broadcastDataChanged(event, pageFile, {
          action: 'save-file',
          filename,
          target,
          relativePath
        });
        return { ok: true, filename, relativePath, plannerEntryIds: nextIds, plannerEntryId: primaryId };
      }
      return { ok: false, error: 'Unsupported board file extension: ' + ext };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });
}

module.exports = { registerBackupBoardIpc };
