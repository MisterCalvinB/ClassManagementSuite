// File/directory operations, class UUID migration, and disk pickers extracted from electron-main.js
'use strict';

function registerFileOpsIpc(ctx) {
  const {
    app,
    dialog,
    ipcMain,
    fs,
    fsSync,
    os,
    path,
    crypto,
    buildZip,
    getSaveTargets,
    getRequestingPage,
    listAllowedPathFiles,
    createAllowedPathDirectory,
    _broadcastDataChanged,
    resolveAllowedTargetDir,
    sanitizeFilename,
    renameAllowedPathEntry,
    statAllowedPathEntry,
    copyAllowedPathEntry,
    moveAllowedPathEntry,
    deleteAllowedPathEntry,
    sanitizeRelativePath,
    resolveAllowedTargetPath
  } = ctx;

  ipcMain.handle('app:quick-switcher-index', async () => {
    const vm = require('vm');
    const targets = getSaveTargets();

    function _evalScript(code) {
      if (!code || typeof code !== 'string') return {};
      const sandbox = { window: {}, globalThis: {} };
      try {
        const normalized = code.replace(/^\s*(const|let)\s+/gm, 'var ');
        vm.runInNewContext(normalized, sandbox, { timeout: 250 });
      } catch (_) {}
      return Object.assign({}, sandbox.window, sandbox);
    }

    let rosterText = '';
    try {
      rosterText = await fs.readFile(path.join(targets.user, 'class-groups.js'), 'utf8');
    } catch (_) {}

    let studentsText = '';
    try {
      studentsText = await fs.readFile(path.join(targets.user, 'students.js'), 'utf8');
    } catch (_) {}

    const studentByUuid = Object.create(null);
    let sArr = [];
    if (studentsText) {
      const sEnv = _evalScript(studentsText);
      sArr = Array.isArray(sEnv.STUDENTS_ROSTER) ? sEnv.STUDENTS_ROSTER : [];
      sArr.forEach((s) => {
        if (s && s.uuid) {
          studentByUuid[String(s.uuid)] = ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.customName || s.name || '').trim();
        }
      });
    }

    const classes = [];
    const seenStudentKeys = new Set();
    if (rosterText) {
      const rEnv = _evalScript(rosterText);
      const dataObj = rEnv.CLASS_GROUPS_DATA || null;
      const cg = (dataObj && dataObj.classGroups) || rEnv.CLASS_GROUPS || null;
      const metaMap = (dataObj && dataObj.classGroupsMeta) || rEnv.CLASS_GROUPS_META || {};

      if (Array.isArray(cg)) {
        cg.forEach((cls) => {
          if (cls && cls.name) classes.push(cls);
        });
      } else if (cg && typeof cg === 'object') {
        Object.keys(cg).forEach((groupName) => {
          if (groupName === '_meta' || groupName.startsWith('_')) return;
          const meta = (metaMap && metaMap[groupName]) || {};
          const rawStudents = Array.isArray(cg[groupName]) ? cg[groupName]
            : (Array.isArray(meta.students) ? meta.students : []);
          const resolvedStudents = rawStudents.map((st) => {
            if (typeof st === 'string') {
              const nm = studentByUuid[st] || st;
              seenStudentKeys.add(String(st));
              seenStudentKeys.add(String(nm).toLowerCase());
              return { id: st, name: nm };
            }
            if (st && typeof st === 'object') {
              const uuid = st.uuid || st.id;
              const nm = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || (uuid && studentByUuid[uuid]) || '').trim();
              if (uuid) seenStudentKeys.add(String(uuid));
              if (nm) seenStudentKeys.add(nm.toLowerCase());
              return nm ? { id: uuid || nm, name: nm } : null;
            }
            return null;
          }).filter(Boolean);
          classes.push({
            id: meta.id || groupName,
            name: (meta && meta.name) || groupName,
            students: resolvedStudents
          });
        });
      }
    }

    // Also include all students from STUDENTS_ROSTER (migrated rosters store students in students.js)
    if (sArr.length > 0) {
      const classByName = new Map();
      classes.forEach((c) => {
        if (c && c.name) classByName.set(String(c.name), c);
      });
      sArr.forEach((st) => {
        if (!st || (!st.uuid && !st.id)) return;
        const sId = String(st.uuid || st.id);
        const sName = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || sId).trim();
        if (!sName || seenStudentKeys.has(sId) || seenStudentKeys.has(sName.toLowerCase())) return;
        seenStudentKeys.add(sId);
        seenStudentKeys.add(sName.toLowerCase());
        const primaryGroup = (st.enrollments && st.enrollments[0] && st.enrollments[0].groupName) || st.adminClass || 'Students';
        let targetCls = classByName.get(primaryGroup);
        if (!targetCls) {
          targetCls = { id: primaryGroup, name: primaryGroup, students: [] };
          classByName.set(primaryGroup, targetCls);
          classes.push(targetCls);
        }
        targetCls.students.push({ id: sId, name: sName });
      });
    }

    async function _listDirNames(dirPath, limit) {
      if (!dirPath) return [];
      const out = [];
      const ignoredDirs = new Set(['history', 'trash', 'backups', 'node_modules']);
      async function _walk(curDir, relPrefix) {
        if (out.length >= limit) return;
        let entries;
        try {
          entries = await fs.readdir(curDir, { withFileTypes: true });
        } catch (_) {
          return;
        }
        for (const e of entries) {
          if (out.length >= limit) break;
          if (!e || !e.name || e.name.startsWith('.')) continue;
          const relPath = relPrefix ? `${relPrefix}/${e.name}` : e.name;
          if (e.isDirectory()) {
            if (ignoredDirs.has(e.name.toLowerCase())) continue;
            await _walk(path.join(curDir, e.name), relPath);
          } else if (e.isFile()) {
            out.push(relPath);
          }
        }
      }
      await _walk(dirPath, '');
      out.sort((a, b) => a.localeCompare(b));
      return out;
    }

    const documents = await _listDirNames(targets.docEditorDocs, 5000);
    const constellations = await _listDirNames(targets.constellations || targets.mindmaps, 5000);
    const toPrint = await _listDirNames(targets.toPrint, 5000);
    return { ok: true, classes, rosterText, documents, constellations, toPrint };
  });

  ipcMain.handle('app:list-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const files = await listAllowedPathFiles(
      pageFile,
      request.target,
      request.relativePath,
      request
    );
    return { ok: true, files };
  });

  ipcMain.handle('app:create-directory-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const created = await createAllowedPathDirectory(
      pageFile,
      request.target,
      request.relativePath
    );
    _broadcastDataChanged(event, pageFile, {
      action: 'create-directory-by-path',
      target: request.target,
      relativePath: request.relativePath
    });
    return { ok: true, created };
  });

  ipcMain.handle('app:rename-file', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const targetDir = resolveAllowedTargetDir(pageFile, request.target);
    const oldName = sanitizeFilename(request.oldFilename);
    const newName = sanitizeFilename(request.newFilename);
    const oldPath = path.join(targetDir, oldName);
    const newPath = path.join(targetDir, newName);
    try {
      await fs.access(newPath);
      throw new Error('A file with that name already exists.');
    } catch (err) {
      if (err.message === 'A file with that name already exists.') throw err;
    }
    await fs.rename(oldPath, newPath);
    _broadcastDataChanged(event, pageFile, {
      action: 'rename-file',
      target: request.target,
      filename: newName,
      oldFilename: oldName,
      newFilename: newName
    });
    return { ok: true, filename: newName };
  });

  ipcMain.handle('app:rename-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const renamed = await renameAllowedPathEntry(
      pageFile,
      request.target,
      request.oldRelativePath,
      request.newRelativePath
    );
    _broadcastDataChanged(event, pageFile, {
      action: 'rename-by-path',
      target: request.target,
      oldRelativePath: request.oldRelativePath,
      newRelativePath: request.newRelativePath,
      relativePath: request.newRelativePath
    });
    return { ok: true, renamed };
  });

  ipcMain.handle('app:stat-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    return statAllowedPathEntry(pageFile, request.target, request.relativePath);
  });

  let _cachedSystemFonts = null;
  async function getSystemFontBuffers() {
    if (_cachedSystemFonts) return _cachedSystemFonts;
    const platform = process.platform;
    const fontDirs = [];

    if (platform === 'win32') {
      const winDir = process.env.WINDIR || process.env.SystemRoot || 'C:\\Windows';
      fontDirs.push(path.join(winDir, 'Fonts'));
      if (process.env.LOCALAPPDATA) {
        fontDirs.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts'));
      }
    } else if (platform === 'darwin') {
      fontDirs.push('/System/Library/Fonts', '/Library/Fonts');
      const home = os.homedir();
      if (home) fontDirs.push(path.join(home, 'Library', 'Fonts'));
    } else {
      fontDirs.push('/usr/share/fonts', '/usr/local/share/fonts');
      const home = os.homedir();
      if (home) {
        fontDirs.push(path.join(home, '.local', 'share', 'fonts'), path.join(home, '.fonts'));
      }
    }

    const buffers = [];
    const visited = new Set();

    function scanDir(dir, depth = 0) {
      if (depth > 2 || !dir || visited.has(dir)) return;
      visited.add(dir);
      try {
        if (!fsSync.existsSync(dir)) return;
        const entries = fsSync.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else if (entry.isFile() && /\.(ttf|otf|ttc)$/i.test(entry.name)) {
            try {
              const buf = fsSync.readFileSync(fullPath);
              buffers.push(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
            } catch (_) { }
          }
        }
      } catch (_) { }
    }

    for (const d of fontDirs) {
      scanDir(d, 0);
    }

    _cachedSystemFonts = buffers;
    return buffers;
  }

  ipcMain.handle('app:get-system-fonts', async () => {
    try {
      return await getSystemFontBuffers();
    } catch (err) {
      console.warn('Could not load system fonts:', err);
      return [];
    }
  });


  ipcMain.handle('app:copy-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const result = await copyAllowedPathEntry(pageFile, request);
    _broadcastDataChanged(event, pageFile, {
      action: 'copy-by-path',
      target: request.destinationTarget || request.target,
      relativePath: request.destinationRelativePath,
      sourceTarget: request.sourceTarget,
      sourceRelativePath: request.sourceRelativePath
    });
    return result;
  });

  ipcMain.handle('app:move-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const result = await moveAllowedPathEntry(pageFile, request);
    _broadcastDataChanged(event, pageFile, {
      action: 'move-by-path',
      target: request.destinationTarget || request.target,
      oldRelativePath: request.sourceRelativePath,
      newRelativePath: request.destinationRelativePath,
      relativePath: request.destinationRelativePath,
      sourceTarget: request.sourceTarget
    });
    return result;
  });

  // ── UUID helpers for class migration ────────────────────────────────────────
  function generateClassUuid() {
    return 'ge-' + require('crypto').randomBytes(4).toString('hex');
  }
  function isClassUuid(key) {
    return /^ge-[0-9a-f]{8}$/.test(key);
  }
  function sanitizeGroupName(name) {
    return String(name || '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^\.+/, '')
      .trim() || '_class';
  }

  ipcMain.handle('app:migrate-class-uuids', async () => {
    const targets = getSaveTargets();
    const userDir = targets.user;
    const gpDir = targets.groupParticipation;
    const classPlansDir = targets.classPlans;
    const gradesDir = targets.grades;

    // 1. Read class-groups.js
    if (!userDir) return { ok: true, migrated: false, reason: 'no-user-dir' };
    const cgPath = path.join(userDir, 'class-groups.js');
    if (!fsSync.existsSync(cgPath)) return { ok: true, migrated: false, reason: 'no-file' };

    let cgContent;
    try { cgContent = await fs.readFile(cgPath, 'utf8'); }
    catch (e) { return { ok: false, error: 'read: ' + e.message }; }

    let cgData;
    try {
      const fn = new Function(cgContent + '\nreturn typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : null;');
      cgData = fn();
    } catch (e) { return { ok: false, error: 'parse: ' + e.message }; }

    if (!cgData || !cgData.classGroups) return { ok: true, migrated: false, reason: 'empty' };

    // 2. Check if already migrated
    const allKeys = Object.keys(cgData.classGroups);
    if (allKeys.length > 0 && allKeys.every(k => isClassUuid(k)))
      return { ok: true, migrated: false, reason: 'already-done' };

    // 3. Build nameToUuid map
    const nameToUuid = {};
    for (const key of allKeys)
      nameToUuid[key] = isClassUuid(key) ? key : generateClassUuid();

    // 4. Rewrite class-groups.js with UUID keys + name field in meta
    const newGroups = {}, newMeta = {};
    for (const [name, students] of Object.entries(cgData.classGroups)) {
      const uuid = nameToUuid[name];
      newGroups[uuid] = students;
      const oldM = (cgData.classGroupsMeta || {})[name] || {};
      newMeta[uuid] = Object.assign({}, oldM, { name: String(name) });
    }
    const groupLines = Object.keys(newGroups).map(u =>
      `    ${JSON.stringify(u)}: [${(newGroups[u] || []).map(s => JSON.stringify(s)).join(', ')}]`);
    const metaLines = Object.keys(newMeta).map(u =>
      `    ${JSON.stringify(u)}: ${JSON.stringify(newMeta[u])}`);
    const newCgContent = [
      'const CLASS_GROUPS_DATA = {',
      `  "activeYear": ${JSON.stringify(cgData.activeYear || '')},`,
      `  "activeSemester": ${JSON.stringify(cgData.activeSemester || null)},`,
      `  "activeSemesterStart": ${JSON.stringify(cgData.activeSemesterStart || '')},`,
      `  "activeSemesterEnd": ${JSON.stringify(cgData.activeSemesterEnd || '')},`,
      '  "classGroups": {',
      groupLines.join(',\n').split('\n').map(l => '  ' + l).join('\n'),
      '  },',
      '  "classGroupsMeta": {',
      metaLines.join(',\n').split('\n').map(l => '  ' + l).join('\n'),
      '  }',
      '};',
      '',
      'var CLASS_GROUPS = CLASS_GROUPS_DATA.classGroups || {};',
      'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};',
      ''
    ].join('\n');
    try { await fs.writeFile(cgPath, newCgContent, 'utf8'); }
    catch (e) { return { ok: false, error: 'write-cg: ' + e.message }; }

    // 5. Migrate planner-config.js (cfg.classes keys)
    const plannerCfgPath = path.join(userDir, 'planner-config.js');
    if (fsSync.existsSync(plannerCfgPath)) {
      try {
        const cfgContent = await fs.readFile(plannerCfgPath, 'utf8');
        const fn = new Function('window', cfgContent + '\nreturn window.PLANNER_CONFIG || null;');
        const cfg = fn({ PLANNER_CONFIG: null });
        if (cfg && cfg.classes) {
          const newClasses = {};
          for (const [name, data] of Object.entries(cfg.classes))
            newClasses[nameToUuid[name] || name] = data;
          cfg.classes = newClasses;
          await fs.writeFile(plannerCfgPath, 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n', 'utf8');
        }
      } catch (e) { console.warn('migrate planner-config:', e.message); }
    }

    // 6. Migrate planner entry files (user/planner/{name}.js → {uuid}.js)
    const plannerDir = path.join(userDir, 'planner');
    if (fsSync.existsSync(plannerDir)) {
      for (const [name, uuid] of Object.entries(nameToUuid)) {
        if (name === uuid) continue;
        const oldFile = path.join(plannerDir, name + '.js');
        if (!fsSync.existsSync(oldFile)) continue;
        try {
          const entryContent = await fs.readFile(oldFile, 'utf8');
          const sandbox = { PLANNER_ENTRIES_BY_CLASS: {} };
          const fn = new Function('window', entryContent);
          fn(sandbox);
          const entries = (sandbox.PLANNER_ENTRIES_BY_CLASS || {})[name] || [];
          const updated = entries.map(e => e.classId === name ? Object.assign({}, e, { classId: uuid }) : e);
          const newContent =
            'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
            'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(uuid) + '] = ' +
            JSON.stringify(updated, null, 2) + ';\n';
          await fs.writeFile(path.join(plannerDir, uuid + '.js'), newContent, 'utf8');
          await fs.unlink(oldFile);
        } catch (e) { console.warn('migrate planner entry "' + name + '":', e.message); }
      }
    }

    // 7. Migrate class-plan data (classPlans/plans.js group keys)
    if (classPlansDir && fsSync.existsSync(classPlansDir)) {
      const classPlansFile = path.join(classPlansDir, 'plans.js');
      if (fsSync.existsSync(classPlansFile)) {
        try {
          const plansContent = await fs.readFile(classPlansFile, 'utf8');
          const fn = new Function(plansContent + '\nreturn { plans: (typeof SAVED_CLASS_PLANS !== "undefined" ? SAVED_CLASS_PLANS : null), layouts: (typeof SAVED_CLASSROOM_LAYOUTS !== "undefined" ? SAVED_CLASSROOM_LAYOUTS : null) };');
          const result = fn();
          const plans = result.plans;
          const layouts = result.layouts;
          if (plans && typeof plans === 'object') {
            const newPlans = {};
            for (const [name, arr] of Object.entries(plans))
              newPlans[nameToUuid[name] || name] = arr;
            let out = 'var SAVED_CLASS_PLANS = ' + JSON.stringify(newPlans, null, 2) + ';';
            if (layouts) {
              out += '\nvar SAVED_CLASSROOM_LAYOUTS = ' + JSON.stringify(layouts, null, 2) + ';';
            }
            await fs.writeFile(classPlansFile, out, 'utf8');
          }
        } catch (e) { console.warn('migrate class-plan plans.js:', e.message); }
      }
    }

    // 8. Migrate participation session files (update groups keys + rename folders)
    if (gpDir && fsSync.existsSync(gpDir)) {
      const safeToUuid = {};
      for (const [name, uuid] of Object.entries(nameToUuid))
        safeToUuid[sanitizeGroupName(name)] = uuid;

      async function migratePtFolder(folderPath, folderName) {
        let files;
        try { files = await fs.readdir(folderPath); } catch { return; }
        for (const file of files) {
          if (!file.endsWith('.js')) continue;
          const filePath = path.join(folderPath, file);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const sandbox = { window: {} };
            new Function('window', content)(sandbox.window);
            let sessions = sandbox.window.CMS_DB_EXPORT || sandbox.window.DB_EXPORT;
            if (!Array.isArray(sessions)) continue;
            let changed = false;
            sessions = sessions.map(session => {
              if (!session || !session.groups) return session;
              const ng = {};
              let sc = false;
              for (const [k, v] of Object.entries(session.groups)) {
                const mu = nameToUuid[k];
                if (mu && mu !== k) { ng[mu] = v; sc = true; }
                else ng[k] = v;
              }
              if (sc) { changed = true; return Object.assign({}, session, { groups: ng }); }
              return session;
            });
            if (changed) {
              await fs.writeFile(filePath,
                'window.CMS_DB_EXPORT = ' + JSON.stringify(sessions, null, 2) + ';\nwindow.DB_EXPORT = window.CMS_DB_EXPORT;\n',
                'utf8');
            }
          } catch (e) { console.warn('migrate pt file ' + filePath + ':', e.message); }
        }
        const targetUuid = safeToUuid[folderName];
        if (targetUuid && folderName !== targetUuid) {
          const newPath = path.join(path.dirname(folderPath), targetUuid);
          try { await fs.rename(folderPath, newPath); }
          catch (e) { console.warn('migrate pt rename ' + folderName + ':', e.message); }
        }
      }

      let gpEntries = [];
      try { gpEntries = await fs.readdir(gpDir, { withFileTypes: true }); } catch { }
      for (const entry of gpEntries) {
        if (entry.isDirectory() && entry.name !== 'archived')
          await migratePtFolder(path.join(gpDir, entry.name), entry.name);
      }
      const archivedDir = path.join(gpDir, 'archived');
      if (fsSync.existsSync(archivedDir)) {
        let archEntries = [];
        try { archEntries = await fs.readdir(archivedDir, { withFileTypes: true }); } catch { }
        for (const entry of archEntries) {
          if (entry.isDirectory())
            await migratePtFolder(path.join(archivedDir, entry.name), entry.name);
        }
      }
    }

    // 9. Add groupId to grade _class.js files
    if (gradesDir && fsSync.existsSync(gradesDir)) {
      async function migrateGradeDir(dir) {
        let entries = [];
        try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          if (entry.isDirectory()) { await migrateGradeDir(path.join(dir, entry.name)); continue; }
          if (entry.name !== '_class.js') continue;
          const filePath = path.join(dir, entry.name);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const sandbox = { window: {} };
            new Function('window', content)(sandbox.window);
            const cls = sandbox.window.GRADE_CLASS;
            if (!cls || cls.groupId) continue;
            const gid = nameToUuid[cls.className];
            if (!gid) continue;
            cls.groupId = gid;
            await fs.writeFile(filePath,
              '// _savedAt: ' + (cls._savedAt || Date.now()) + '\nwindow.GRADE_CLASS = ' + JSON.stringify(cls, null, 2) + ';\n',
              'utf8');
          } catch (e) { console.warn('migrate grade _class ' + filePath + ':', e.message); }
        }
      }
      await migrateGradeDir(gradesDir);
    }

    return { ok: true, migrated: true, uuidMap: nameToUuid };
  });

  ipcMain.handle('app:delete-file', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const targetDir = resolveAllowedTargetDir(pageFile, request.target);
    const filename = sanitizeFilename(request.filename);
    const filePath = path.join(targetDir, filename);
    await fs.unlink(filePath);

    // Constellation saves can include a companion folder (same basename) with media.
    // When requested, remove that folder too.
    let companionFolderDeleted = false;
    if (request.deleteCompanionFolder && request.target === 'mindmaps') {
      const companionRelativePath = path.parse(filename).name;
      if (companionRelativePath) {
        try {
          await deleteAllowedPathEntry(pageFile, request.target, companionRelativePath, { recursive: true, force: true });
          companionFolderDeleted = true;
        } catch { }
      }
    }

    _broadcastDataChanged(event, pageFile, {
      action: 'delete-file',
      target: request.target,
      filename,
      deleteCompanionFolder: companionFolderDeleted
    });

    return { ok: true, companionFolderDeleted };
  });

  ipcMain.handle('app:delete-by-path', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const deleted = await deleteAllowedPathEntry(
      pageFile,
      request.target,
      request.relativePath,
      {
        recursive: request.recursive,
        force: request.force
      }
    );
    _broadcastDataChanged(event, pageFile, {
      action: 'delete-by-path',
      target: request.target,
      relativePath: request.relativePath
    });
    return { ok: true, deleted };
  });

  ipcMain.handle('app:pick-folder', async (_event, request = {}) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: String(request.title || 'Choose destination folder'),
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: String(request.buttonLabel || 'Select folder')
    });
    if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
    return { ok: true, canceled: false, folderPath: path.resolve(filePaths[0]) };
  });

  ipcMain.handle('app:export-files', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const files = Array.isArray(request.files) ? request.files : [];

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Export files – choose destination folder',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Export here'
    });

    if (canceled || !filePaths?.[0]) {
      return { ok: false, canceled: true };
    }

    const destDir = path.resolve(String(filePaths[0]));
    // Strip trailing separator so drive-root paths (e.g. 'E:\') don't produce a double-separator prefix
    const destBase = destDir.endsWith(path.sep) ? destDir.slice(0, -1) : destDir;
    const exported = [];
    const errors = [];
    const destRoot = destBase + path.sep;

    for (const item of files) {
      try {
        const exportRelative = item.relativeExportPath
          ? sanitizeRelativePath(String(item.relativeExportPath || ''))
          : sanitizeFilename(String(item.filename || path.basename(String(item.relativePath || '')) || ''));
        const destPath = path.resolve(destDir, exportRelative);
        if (destPath !== destBase && !destPath.startsWith(destRoot)) {
          throw new Error('Export path is outside the selected folder.');
        }

        await fs.mkdir(path.dirname(destPath), { recursive: true });

        if (Object.prototype.hasOwnProperty.call(item, 'content')) {
          const encoding = item.encoding === 'base64' ? 'base64' : 'utf8';
          const data = encoding === 'base64'
            ? Buffer.from(String(item.content || ''), 'base64')
            : String(item.content || '');
          await fs.writeFile(destPath, data, encoding === 'base64' ? undefined : 'utf8');
          if (item.mtimeMs) {
            const t = new Date(Number(item.mtimeMs));
            await fs.utimes(destPath, t, t).catch(() => { });
          }
          exported.push(exportRelative);
          continue;
        }

        const target = String(item.target || '');
        const relativePath = String(item.relativePath || '').trim();
        const filename = sanitizeFilename(String(item.filename || path.basename(relativePath) || ''));
        const srcPath = relativePath
          ? resolveAllowedTargetPath(pageFile, target, relativePath).fullPath
          : path.join(resolveAllowedTargetDir(pageFile, target), filename);
        await fs.copyFile(srcPath, destPath);
        exported.push(exportRelative);
      } catch (err) {
        errors.push({ filename: String(item.filename || ''), error: String(err?.message || err) });
      }
    }

    return { ok: true, canceled: false, folderPath: destDir, exported, errors };
  });

  ipcMain.handle('app:zip-and-delete-archived', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const target = request.target || 'mindmaps';
    const targetDir = resolveAllowedTargetDir(pageFile, target);
    const destSubdir = sanitizeRelativePath(request.subdir || 'archived');
    const archivedDir = path.resolve(targetDir, destSubdir);

    const rawZipFilename = request.zipFilename || `archived-${new Date().toISOString().slice(0, 10)}.zip`;
    let zipFilename = sanitizeFilename(rawZipFilename);
    if (!zipFilename.toLowerCase().endsWith('.zip')) {
      zipFilename += '.zip';
    }

    const items = Array.isArray(request.items) ? request.items : [];
    if (!items.length) {
      return { ok: false, error: 'No files provided to zip.' };
    }

    const zipEntries = [];
    const entriesToDelete = [];
    const processedFullPaths = new Set();

    for (const item of items) {
      const rawRel = typeof item === 'string' ? item : (item.relativePath || item.filename || '');
      const relPath = sanitizeRelativePath(rawRel);
      if (!relPath) continue;

      let fullPath;
      try {
        fullPath = resolveAllowedTargetPath(pageFile, target, relPath).fullPath;
      } catch {
        continue;
      }

      if (processedFullPaths.has(fullPath)) continue;

      let stats;
      try {
        stats = await fs.stat(fullPath);
      } catch {
        continue;
      }

      processedFullPaths.add(fullPath);

      let entryZipPath = relPath.replace(/\\/g, '/');
      if (destSubdir && entryZipPath.toLowerCase().startsWith(destSubdir.toLowerCase() + '/')) {
        entryZipPath = entryZipPath.slice(destSubdir.length + 1);
      }

      if (stats.isDirectory()) {
        const dirEntries = await collectDirEntries(fullPath, entryZipPath);
        zipEntries.push(...dirEntries);
        entriesToDelete.push({ fullPath, isDir: true, relPath });
      } else if (stats.isFile()) {
        const parsed = path.parse(fullPath);
        const parentDirName = path.basename(parsed.dir);
        const isNestedSessionFolderFile = target === 'mindmaps'
          && (relPath.endsWith('.js') || relPath.endsWith('.json'))
          && parentDirName.toLowerCase() === parsed.name.toLowerCase();

        if (isNestedSessionFolderFile && !processedFullPaths.has(parsed.dir)) {
          processedFullPaths.add(parsed.dir);
          processedFullPaths.add(fullPath);
          const folderZipPath = entryZipPath.includes('/') ? entryZipPath.replace(/\/[^/]+$/, '') : parsed.name;
          const dirEntries = await collectDirEntries(parsed.dir, folderZipPath);
          zipEntries.push(...dirEntries);
          const folderRelPath = relPath.includes('/') ? relPath.replace(/\/[^/]+$/, '') : parsed.name;
          entriesToDelete.push({ fullPath: parsed.dir, isDir: true, relPath: folderRelPath });
        } else if (!processedFullPaths.has(fullPath)) {
          try {
            const data = await fs.readFile(fullPath);
            zipEntries.push({
              name: entryZipPath,
              data,
              mtimeMs: stats.mtimeMs,
              ctimeMs: stats.ctimeMs,
              birthtimeMs: stats.birthtimeMs
            });
            entriesToDelete.push({ fullPath, isDir: false, relPath });
          } catch (err) {
            console.warn('Failed to read file for zip:', fullPath, err);
          }

          if (target === 'mindmaps' && (relPath.endsWith('.js') || relPath.endsWith('.json'))) {
            const companionFullPath = path.join(parsed.dir, parsed.name);
            if (!processedFullPaths.has(companionFullPath)) {
              try {
                const compStats = await fs.stat(companionFullPath);
                if (compStats.isDirectory()) {
                  processedFullPaths.add(companionFullPath);
                  const compZipPath = entryZipPath.replace(/\.(js|json)$/i, '');
                  const dirEntries = await collectDirEntries(companionFullPath, compZipPath);
                  zipEntries.push(...dirEntries);
                  const compRelPath = relPath.replace(/\.(js|json)$/i, '');
                  entriesToDelete.push({ fullPath: companionFullPath, isDir: true, relPath: compRelPath });
                }
              } catch { }
            }
          }
        }
      }
    }

    if (!zipEntries.length) {
      return { ok: false, error: 'No files found to archive.' };
    }

    const zipBuffer = await buildZip(zipEntries);
    await fs.mkdir(archivedDir, { recursive: true });
    const finalZipPath = path.join(archivedDir, zipFilename);
    const tmpZipPath = finalZipPath + '.tmp';

    try {
      await fs.writeFile(tmpZipPath, zipBuffer);
      try {
        await fs.rename(tmpZipPath, finalZipPath);
      } catch (renameErr) {
        if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST') {
          await fs.unlink(finalZipPath).catch(() => { });
          await fs.rename(tmpZipPath, finalZipPath);
        } else {
          throw renameErr;
        }
      }
    } catch (err) {
      await fs.unlink(tmpZipPath).catch(() => { });
      return { ok: false, error: 'Failed to write zip file: ' + (err && err.message ? err.message : String(err)) };
    }

    let deletedCount = 0;
    for (const entry of entriesToDelete) {
      if (path.resolve(entry.fullPath) === path.resolve(finalZipPath)) continue;
      try {
        if (entry.isDir) {
          await fs.rm(entry.fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(entry.fullPath);
        }
        deletedCount++;
      } catch (delErr) {
        console.warn('Failed to delete original file after zip:', entry.fullPath, delErr);
      }
    }

    _broadcastDataChanged(event, pageFile, {
      action: 'zip-archived-files',
      target,
      zipFilename,
      deletedCount
    });

    return {
      ok: true,
      zipFilename,
      path: finalZipPath,
      count: entriesToDelete.length,
      deletedCount,
      size: zipBuffer.length
    };
  });

  ipcMain.handle('app:save-to-disk', async (_event, request = {}) => {
    const filters = Array.isArray(request.filters) ? request.filters : [];
    const defaultPath = String(request.defaultPath || '').trim();
    const options = {
      title: String(request.title || 'Save file'),
      filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]
    };
    if (defaultPath) options.defaultPath = defaultPath;

    const { canceled, filePath } = await dialog.showSaveDialog(options);
    if (canceled || !filePath) {
      return { ok: false, canceled: true };
    }

    try {
      const encoding = request.encoding === 'base64' ? 'base64' : 'utf8';
      const data = encoding === 'base64'
        ? Buffer.from(String(request.content || ''), 'base64')
        : String(request.content || '');
      await fs.writeFile(filePath, data, encoding === 'base64' ? undefined : 'utf8');
      return { ok: true, canceled: false, path: filePath, name: path.basename(filePath) };
    } catch (err) {
      return { ok: false, canceled: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:pick-and-read-file', async (_event, request = {}) => {
    const filters = Array.isArray(request.filters) ? request.filters : [];
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: String(request.title || 'Open file'),
      properties: ['openFile'],
      filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]
    });
    if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
    const filePath = filePaths[0];
    const name = path.basename(filePath);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { ok: true, canceled: false, name, path: filePath, filePath, content };
    } catch (err) {
      return { ok: false, canceled: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:read-disk-file', async (_event, request = {}) => {
    if (!request.absolutePath) return { ok: false, error: 'No path specified.' };
    try {
      const fullPath = path.resolve(String(request.absolutePath));
      const stats = await fs.stat(fullPath);
      if (request.maxBytes && stats.size > request.maxBytes) {
        return { ok: false, tooLarge: true, size: stats.size, path: fullPath, name: path.basename(fullPath) };
      }
      if (request.encoding === 'binary') {
        const content = await fs.readFile(fullPath);
        return { ok: true, path: fullPath, name: path.basename(fullPath), size: stats.size, encoding: 'binary', content };
      }
      const content = await fs.readFile(fullPath, request.encoding === 'base64' ? 'base64' : 'utf8');
      return { ok: true, path: fullPath, name: path.basename(fullPath), size: stats.size, content };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:write-disk-file', async (_event, request = {}) => {
    if (!request.absolutePath) return { ok: false, error: 'No path specified.' };
    try {
      const fullPath = path.resolve(String(request.absolutePath));
      const encoding = request.encoding === 'base64' ? 'base64' : 'utf8';
      const data = encoding === 'base64'
        ? Buffer.from(String(request.content || ''), 'base64')
        : String(request.content || '');
      await fs.writeFile(fullPath, data, encoding === 'base64' ? undefined : 'utf8');
      return { ok: true, path: fullPath, name: path.basename(fullPath) };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:stat-disk-file', async (_event, request = {}) => {
    if (!request.absolutePath) return { ok: false, exists: false, error: 'No path specified.' };
    try {
      const fullPath = path.resolve(String(request.absolutePath));
      const stats = await fs.stat(fullPath);
      return {
        ok: true,
        exists: true,
        path: fullPath,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtimeMs: stats.mtimeMs
      };
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return { ok: true, exists: false, path: path.resolve(String(request.absolutePath)) };
      }
      return { ok: false, exists: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:pick-and-copy-files', async (event, request = {}) => {
    const pageFile = getRequestingPage(event);
    const target = String(request.target || '');
    const filters = Array.isArray(request.filters) ? request.filters : [];

    const targetDir = resolveAllowedTargetDir(pageFile, target);
    const subdir = request.subdir ? sanitizeRelativePath(String(request.subdir)) : null;
    const destDir = (subdir && subdir !== '.')
      ? (() => {
        const resolved = path.resolve(targetDir, subdir);
        const targetRoot = path.resolve(targetDir);
        if (resolved !== targetRoot && !resolved.startsWith(targetRoot + path.sep)) {
          throw new Error('Subdir is outside the allowed target directory.');
        }
        return resolved;
      })()
      : targetDir;

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: String(request.title || 'Select files'),
      properties: ['openFile', 'multiSelections'],
      filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]
    });
    if (canceled || !filePaths?.length) return { ok: false, canceled: true };

    await fs.mkdir(destDir, { recursive: true });
    const copied = [];
    const errors = [];
    for (const srcPath of filePaths) {
      const name = path.basename(srcPath);
      const destPath = path.join(destDir, name);
      try {
        await fs.copyFile(srcPath, destPath);
        copied.push({ name });
      } catch (err) {
        errors.push({ name, error: String(err?.message || err) });
      }
    }
    return { ok: true, canceled: false, copied, errors };
  });
}

module.exports = { registerFileOpsIpc };
