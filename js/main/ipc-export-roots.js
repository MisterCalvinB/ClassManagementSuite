// Custom Export Root Folders IPC (modeled after user/to-print)
'use strict';

function registerExportRootsIpc(ctx) {
  const {
    ipcMain,
    fs,
    path,
    getWritableRootDir,
    getRequestingPage,
    getCustomExportRoots,
    invalidateExportRootsCache,
    sanitizeExportRootFolderName,
    _broadcastDataChanged
  } = ctx;

  function buildConfigJsContent(data) {
    return [
      'const CLASS_MANAGEMENT_CONFIG = ' + JSON.stringify(data, null, 2) + ';',
      '',
      "var CLASS_GROUPS = CLASS_GROUPS || (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA.classGroups) || {};",
      "var CLASS_GROUPS_META = CLASS_GROUPS_META || (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA.classGroupsMeta) || {};",
      'const ROLE_DEFINITIONS = CLASS_MANAGEMENT_CONFIG.roleDefinitions || [];',
      ''
    ].join('\n');
  }

  function parseConfigJs(content) {
    if (!content || typeof content !== 'string') return {};
    const vm = require('vm');
    const sandbox = { window: {}, globalThis: {} };
    try {
      const normalized = content.replace(/^\s*(const|let)\s+/gm, 'var ');
      vm.runInNewContext(normalized, sandbox, { timeout: 250 });
      if (sandbox.CLASS_MANAGEMENT_CONFIG && typeof sandbox.CLASS_MANAGEMENT_CONFIG === 'object') {
        return sandbox.CLASS_MANAGEMENT_CONFIG;
      }
    } catch (_) {}
    try {
      const match = content.match(/CLASS_MANAGEMENT_CONFIG\s*=\s*(\{[\s\S]*?\});/);
      if (match) return JSON.parse(match[1]);
    } catch (_) {}
    return {};
  }

  ipcMain.handle('app:get-export-roots', async () => {
    try {
      const roots = getCustomExportRoots();
      return { ok: true, roots };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err), roots: [] };
    }
  });

  ipcMain.handle('app:save-export-roots', async (event, request = {}) => {
    try {
      const pageFile = getRequestingPage(event);
      const rawRoots = Array.isArray(request.roots) ? request.roots : [];
      const userDir = path.join(getWritableRootDir(), 'user');
      await fs.mkdir(userDir, { recursive: true });

      const cleanRoots = [];
      const seenIds = new Set();
      const seenFolders = new Set();

      for (const item of rawRoots) {
        if (!item || typeof item !== 'object') continue;
        const label = String(item.label || item.name || '').trim();
        const folderName = sanitizeExportRootFolderName(item.folderName || label);
        if (!label || !folderName) continue;
        let id = String(item.id || folderName).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
        if (!id) id = folderName;
        if (seenIds.has(id) || seenFolders.has(folderName.toLowerCase())) continue;
        seenIds.add(id);
        seenFolders.add(folderName.toLowerCase());
        cleanRoots.push({ id, label, folderName });
      }

      // Optional folder renames on disk
      if (Array.isArray(request.renames)) {
        for (const rn of request.renames) {
          if (!rn || !rn.from || !rn.to) continue;
          const fromSafe = sanitizeExportRootFolderName(rn.from);
          const toSafe = sanitizeExportRootFolderName(rn.to);
          if (!fromSafe || !toSafe || fromSafe === toSafe) continue;
          const fromPath = path.join(userDir, fromSafe);
          const toPath = path.join(userDir, toSafe);
          try {
            await fs.access(fromPath);
            try {
              await fs.access(toPath);
            } catch (_) {
              await fs.rename(fromPath, toPath);
            }
          } catch (_) {}
        }
      }

      // Ensure each root folder exists on disk
      for (const root of cleanRoots) {
        await fs.mkdir(path.join(userDir, root.folderName), { recursive: true });
      }

      // Optional folder deletions (only if explicitly requested and safe)
      if (Array.isArray(request.deleteFolders)) {
        for (const delName of request.deleteFolders) {
          const safeDel = sanitizeExportRootFolderName(delName);
          if (!safeDel) continue;
          const delPath = path.join(userDir, safeDel);
          try {
            await fs.rm(delPath, { recursive: true, force: true });
          } catch (_) {}
        }
      }

      // Persist to user/config.js
      const configPath = path.join(userDir, 'config.js');
      let configData = {};
      try {
        const existing = await fs.readFile(configPath, 'utf8');
        configData = parseConfigJs(existing);
      } catch (_) {}
      if (!configData || typeof configData !== 'object') configData = {};
      if (!configData.export || typeof configData.export !== 'object') configData.export = {};
      configData.export.customRoots = cleanRoots;

      await fs.writeFile(configPath, buildConfigJsContent(configData), 'utf8');
      invalidateExportRootsCache();

      _broadcastDataChanged(event, pageFile, {
        action: 'save-export-roots',
        target: 'user',
        filename: 'config.js'
      });

      return { ok: true, roots: cleanRoots };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });
}

module.exports = { registerExportRootsIpc };
