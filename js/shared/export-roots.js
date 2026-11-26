// Shared service for managing custom export root folders (modeled after user/to-print)
(function (global) {
  'use strict';

  var RESERVED_FOLDERS = new Set([
    'to-print', 'lessons', 'mindmaps', 'custom-data', 'data', 'grades',
    'group-participation', 'document-editor', 'class-plans', 'game-results',
    'log', 'tests', 'export-css', 'trash', 'history', 'backups', 'node_modules'
  ]);

  function _t(key, fallback) {
    if (global.i18n && typeof global.i18n.t === 'function') {
      var val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function slugify(raw) {
    var s = String(raw || '').trim().toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
    s = s.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!s || s === '.' || s === '..' || RESERVED_FOLDERS.has(s)) return '';
    return s;
  }

  function isReservedFolder(folderName) {
    return RESERVED_FOLDERS.has(String(folderName || '').trim().toLowerCase());
  }

  function targetFor(rootOrId) {
    var id = typeof rootOrId === 'string' ? rootOrId : (rootOrId && rootOrId.id);
    if (!id) return '';
    return String(id).startsWith('exportRoot:') ? String(id) : ('exportRoot:' + id);
  }

  async function list() {
    if (global.Desktop && typeof global.Desktop.getExportRoots === 'function') {
      try {
        var res = await global.Desktop.getExportRoots();
        if (res && res.ok && Array.isArray(res.roots)) return res.roots;
      } catch (_) {}
    }
    try {
      var raw = global.localStorage ? global.localStorage.getItem('cmt-custom-export-roots') : null;
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  async function saveAll(roots, extra) {
    var payload = Object.assign({ roots: Array.isArray(roots) ? roots : [] }, extra || {});
    if (global.Desktop && typeof global.Desktop.saveExportRoots === 'function') {
      var res = await global.Desktop.saveExportRoots(payload);
      if (res && res.ok) {
        try {
          if (global.localStorage) {
            global.localStorage.setItem('cmt-custom-export-roots', JSON.stringify(res.roots || []));
          }
        } catch (_) {}
      }
      return res;
    }
    try {
      if (global.localStorage) {
        global.localStorage.setItem('cmt-custom-export-roots', JSON.stringify(payload.roots));
      }
      return { ok: true, roots: payload.roots };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function add(label, customFolderName) {
    var cleanLabel = String(label || '').trim();
    var folderName = slugify(customFolderName || cleanLabel);
    if (!cleanLabel) return { ok: false, error: _t('exportRootInvalidName', 'Please enter a folder name.') };
    if (!folderName) return { ok: false, error: _t('exportRootReservedName', 'That folder name is reserved or invalid.') };

    var current = await list();
    var exists = current.some(function (r) {
      return r.folderName.toLowerCase() === folderName.toLowerCase() || r.id.toLowerCase() === folderName.toLowerCase();
    });
    if (exists) {
      return { ok: false, error: _t('exportRootFolderExists', 'An export root folder with that name already exists.') };
    }

    var newRoot = { id: folderName, label: cleanLabel, folderName: folderName };
    var next = current.concat([newRoot]);
    var res = await saveAll(next);
    if (!res || !res.ok) return res || { ok: false, error: 'Failed to save export root.' };
    return { ok: true, root: newRoot, roots: res.roots || next };
  }

  async function update(id, patch) {
    var current = await list();
    var idx = current.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return { ok: false, error: 'Export root not found.' };
    var prev = current[idx];
    var nextLabel = String((patch && patch.label !== undefined) ? patch.label : prev.label).trim();
    var nextFolder = slugify((patch && patch.folderName !== undefined) ? patch.folderName : prev.folderName);
    if (!nextLabel) return { ok: false, error: _t('exportRootInvalidName', 'Please enter a folder name.') };
    if (!nextFolder) return { ok: false, error: _t('exportRootReservedName', 'That folder name is reserved or invalid.') };

    var dup = current.some(function (r, i) {
      return i !== idx && r.folderName.toLowerCase() === nextFolder.toLowerCase();
    });
    if (dup) {
      return { ok: false, error: _t('exportRootFolderExists', 'An export root folder with that name already exists.') };
    }

    var next = current.slice();
    next[idx] = { id: prev.id, label: nextLabel, folderName: nextFolder };
    var renames = (prev.folderName && nextFolder && prev.folderName !== nextFolder)
      ? [{ from: prev.folderName, to: nextFolder }]
      : undefined;
    var res = await saveAll(next, renames ? { renames: renames } : undefined);
    if (!res || !res.ok) return res || { ok: false, error: 'Failed to update export root.' };
    return { ok: true, root: next[idx], roots: res.roots || next };
  }

  async function remove(id, options) {
    var current = await list();
    var target = current.find(function (r) { return r.id === id; });
    if (!target) return { ok: false, error: 'Export root not found.' };
    var next = current.filter(function (r) { return r.id !== id; });
    var extra = (options && options.deleteFolder && target.folderName)
      ? { deleteFolders: [target.folderName] }
      : undefined;
    var res = await saveAll(next, extra);
    if (!res || !res.ok) return res || { ok: false, error: 'Failed to remove export root.' };
    return { ok: true, roots: res.roots || next };
  }

  async function promptNewRootFolder() {
    var promptFn = global.showPrompt;
    var label = null;
    if (typeof promptFn === 'function') {
      label = await promptFn(
        _t('exportNewRootFolderPrompt', 'Enter a name for the new export root folder (created under user/):'),
        ''
      );
    }
    if (!label || !String(label).trim()) return null;
    var res = await add(String(label).trim());
    if (!res || !res.ok) {
      if (typeof global.showToast === 'function') {
        global.showToast((res && res.error) || 'Could not create folder.', true);
      }
      return null;
    }
    if (typeof global.showToast === 'function') {
      global.showToast(
        _t('exportRootFolderAdded', 'Export root folder "{name}" created.').replace('{name}', res.root.label)
      );
    }
    return res.root;
  }

  global.ExportRootsService = {
    slugify: slugify,
    isReservedFolder: isReservedFolder,
    targetFor: targetFor,
    list: list,
    saveAll: saveAll,
    add: add,
    update: update,
    remove: remove,
    promptNewRootFolder: promptNewRootFolder
  };
})(window);
