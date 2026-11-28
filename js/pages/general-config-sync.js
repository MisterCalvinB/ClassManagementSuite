// Sync UI, Conflict Resolution Modal, Sync Log & Remote Sync (FTP / Google Drive / WebDAV)
// Extracted from pages/general-config.html
(function () {
  'use strict';

  var syncStatusEl = document.getElementById('syncStatus');
  var syncAddedDetails = document.getElementById('syncAddedDetails');
  var syncAddedSummary = document.getElementById('syncAddedSummary');
  var syncAddedList = document.getElementById('syncAddedList');
  var syncConflictOverlay = document.getElementById('syncConflictOverlay');
  var syncConflictList = document.getElementById('syncConflictList');
  var syncConflictApply = document.getElementById('syncConflictApply');
  var syncConflictCancel = document.getElementById('syncConflictCancel');
  var syncBulkKeepSrc = document.getElementById('syncBulkKeepSrc');
  var syncBulkKeepDest = document.getElementById('syncBulkKeepDest');
  var syncBulkSkip = document.getElementById('syncBulkSkip');
  var syncBulkArchiveOlder = document.getElementById('syncBulkArchiveOlder');
  var syncBulkArchiveAll = document.getElementById('syncBulkArchiveAll');
  var syncConflictSearch = document.getElementById('syncConflictSearch');
  var syncConflictDiffSize = document.getElementById('syncConflictDiffSize');
  var syncConflictDateTol = document.getElementById('syncConflictDateTol');
  var syncConflictCount = document.getElementById('syncConflictCount');
  var syncConflictSinceLastSync = document.getElementById('syncConflictSinceLastSync');
  var syncConflictSinceLastSyncLbl = document.getElementById('syncConflictSinceLastSyncLabel');
  var syncChipsDays = document.getElementById('syncChipsDays');
  var syncChipsCat = document.getElementById('syncChipsCat');
  var _syncDaysVal = '0';
  var _syncCatVal = '';
  var _syncTolS = (function () { try { return +(JSON.parse(localStorage.getItem('cmt-general-config') || '{}').syncMtimeTolS || 0); } catch { return 0; } })();

  var SYNC_CAT_RULES = {
    classdata: function (p) {
      return /^(config|export-config|app-settings|class-groups|roles|ui-prefs|correction-criteria|grade-scale-models|students)\./.test(p)
        || p.startsWith('grades/')
        || p.startsWith('log/grade-sheet/')
        || p.startsWith('group-participation/')
        || p.startsWith('class-plans/');
    },
    board: function (p) {
      return /^(board-config|board-sessions-backup)\./.test(p)
        || p.startsWith('mindmaps/');
    },
    planner: function (p) {
      return p.startsWith('planner/')
        || /^(planner-entries|planner-config|todos)\./.test(p);
    },
    doceditor: function (p) {
      return p.startsWith('document-editor/');
    },
    customdata: function (p) {
      return p.startsWith('custom-data/') || p.startsWith('data/');
    }
  };

  function setChipActive(container, val) {
    container.querySelectorAll('.sync-chip').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.val === val);
    });
  }

  var syncLastSyncEl = document.getElementById('syncLastSync');
  var autoSyncToggle = document.getElementById('autoSyncToggle');
  var startupSyncToggle = document.getElementById('startupSyncToggle');
  var startupSyncModeRow = document.getElementById('startupSyncModeRow');
  var startupSyncModeSelect = document.getElementById('startupSyncModeSelect');
  var syncAccessibilityBadge = document.getElementById('syncAccessibilityBadge');

  function updateAccessibilityBadge(hasPath, isAccessible) {
    if (!syncAccessibilityBadge) return;
    if (!hasPath) {
      syncAccessibilityBadge.style.display = 'none';
      return;
    }
    syncAccessibilityBadge.style.display = 'inline-flex';
    if (isAccessible) {
      syncAccessibilityBadge.className = 'sync-status-badge badge-accessible';
      syncAccessibilityBadge.textContent = typeof t === 'function' ? t('gcSyncAccessible') : 'Accessible';
    } else {
      syncAccessibilityBadge.className = 'sync-status-badge badge-inaccessible';
      syncAccessibilityBadge.textContent = typeof t === 'function' ? t('gcSyncInaccessible') : 'Not accessible';
    }
  }

  var _lastSyncTime = parseInt(localStorage.getItem('lastSyncTime') || '0', 10) || 0;

  function _saveLastSyncTime() {
    _lastSyncTime = Date.now();
    localStorage.setItem('lastSyncTime', String(_lastSyncTime));
    _refreshLastSyncDisplay();
  }

  function _refreshLastSyncDisplay() {
    if (_lastSyncTime > 0) {
      syncLastSyncEl.textContent = t('gcLastSynced') + new Date(_lastSyncTime).toLocaleString();
    } else {
      syncLastSyncEl.textContent = '';
    }
  }

  _refreshLastSyncDisplay();

  var _syncConflictsAll = [];
  var _syncConflictItems = new Map();
  var _syncChildRows = new Map();
  var _syncExpandedGroups = new Set();
  var _syncSubGroupItems = new Map();
  var _syncSubGroupChildren = new Map();
  var _syncConflictTbody = null;
  var _syncSortCol = 'name';
  var _syncSortAsc = true;

  function setSyncStatus(message, kind) {
    syncStatusEl.textContent = message || '';
    syncStatusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function showSyncAdded(added) {
    if (!added || added.length === 0) { syncAddedDetails.style.display = 'none'; return; }
    syncAddedList.innerHTML = '';
    for (var i = 0; i < added.length; i++) {
      var li = document.createElement('li');
      li.textContent = added[i];
      syncAddedList.appendChild(li);
    }
    syncAddedSummary.textContent = tFmt('gcNewFilesAdded', { n: added.length });
    syncAddedDetails.open = false;
    syncAddedDetails.style.display = '';
  }

  async function refreshSyncPath() {
    if (!window.electronApi || !window.electronApi.getSyncLocation) return;
    var res = await window.electronApi.getSyncLocation();
    var hasSyncLocation = res && res.ok && res.syncLocation;
    var isAccessible = res && res.accessible === true;
    var runSyncBtn = document.getElementById('runSyncBtn');
    var runMirrorAppToSyncBtn = document.getElementById('runMirrorAppToSyncBtn');
    var runMirrorSyncToAppBtn = document.getElementById('runMirrorSyncToAppBtn');
    if (hasSyncLocation) {
      var syncPathEl = document.getElementById('syncPath');
      if (syncPathEl) {
        syncPathEl.removeAttribute('data-i18n');
        syncPathEl.textContent = res.syncLocation;
      }
      updateAccessibilityBadge(true, isAccessible);
      if (runSyncBtn) runSyncBtn.disabled = !isAccessible;
      if (runMirrorAppToSyncBtn) runMirrorAppToSyncBtn.disabled = !isAccessible;
      if (runMirrorSyncToAppBtn) runMirrorSyncToAppBtn.disabled = !isAccessible;
      if (autoSyncToggle) autoSyncToggle.disabled = false;
      if (startupSyncToggle) {
        startupSyncToggle.disabled = false;
        startupSyncToggle.checked = res.startupSync === true;
      }
      if (startupSyncModeRow) {
        startupSyncModeRow.style.display = res.startupSync === true ? 'flex' : 'none';
      }
      if (startupSyncModeSelect) {
        startupSyncModeSelect.value = res.startupSyncMode || 'prompt';
      }
    } else {
      var syncPathEl2 = document.getElementById('syncPath');
      if (syncPathEl2) {
        syncPathEl2.setAttribute('data-i18n', 'notSet');
        syncPathEl2.textContent = typeof t === 'function' ? t('notSet') : 'Not set';
      }
      updateAccessibilityBadge(false, false);
      if (runSyncBtn) runSyncBtn.disabled = true;
      if (runMirrorAppToSyncBtn) runMirrorAppToSyncBtn.disabled = true;
      if (runMirrorSyncToAppBtn) runMirrorSyncToAppBtn.disabled = true;
      if (autoSyncToggle) {
        autoSyncToggle.disabled = true;
        autoSyncToggle.checked = false;
      }
      if (startupSyncToggle) {
        startupSyncToggle.disabled = true;
        startupSyncToggle.checked = false;
      }
      if (startupSyncModeRow) startupSyncModeRow.style.display = 'none';
    }
    if (hasSyncLocation && window.electronApi && window.electronApi.getAutoSync) {
      try {
        var asr = await window.electronApi.getAutoSync();
        if (autoSyncToggle) autoSyncToggle.checked = asr && asr.autoSync === true;
      } catch (e) { }
    }
  }

  autoSyncToggle.addEventListener('change', async function () {
    if (!window.electronApi || !window.electronApi.setAutoSync) return;
    autoSyncToggle.disabled = true;
    try {
      var res = await window.electronApi.setAutoSync({ enabled: autoSyncToggle.checked });
      if (!res || !res.ok) {
        autoSyncToggle.checked = !autoSyncToggle.checked;
        setSyncStatus(t('gcAutoSyncUpdFailed'), 'err');
      } else if (res.autoSync) {
        setSyncStatus(t('gcAutoSyncEnabled'), 'ok');
      } else {
        setSyncStatus(t('gcAutoSyncDisabled'), '');
      }
    } catch (err) { setSyncStatus(String(err && err.message ? err.message : err), 'err'); }
    finally { autoSyncToggle.disabled = false; }
  });

  if (startupSyncToggle) {
    startupSyncToggle.addEventListener('change', async function () {
      if (!window.electronApi || !window.electronApi.setStartupSync) return;
      startupSyncToggle.disabled = true;
      try {
        var mode = startupSyncModeSelect ? startupSyncModeSelect.value : 'prompt';
        var res = await window.electronApi.setStartupSync({ enabled: startupSyncToggle.checked, mode: mode });
        if (!res || !res.ok) {
          startupSyncToggle.checked = !startupSyncToggle.checked;
          setSyncStatus(t('gcStartupSyncFailed'), 'err');
        } else {
          if (startupSyncModeRow) startupSyncModeRow.style.display = startupSyncToggle.checked ? 'flex' : 'none';
          setSyncStatus(t('gcStartupSyncUpdated'), 'ok');
        }
      } catch (err) {
        setSyncStatus(String(err && err.message ? err.message : err), 'err');
      } finally {
        startupSyncToggle.disabled = false;
      }
    });
  }

  if (startupSyncModeSelect) {
    startupSyncModeSelect.addEventListener('change', async function () {
      if (!window.electronApi || !window.electronApi.setStartupSync) return;
      try {
        var enabled = startupSyncToggle ? startupSyncToggle.checked : true;
        await window.electronApi.setStartupSync({ enabled: enabled, mode: startupSyncModeSelect.value });
        setSyncStatus(t('gcStartupSyncUpdated'), 'ok');
      } catch (err) {
        setSyncStatus(String(err && err.message ? err.message : err), 'err');
      }
    });
  }

  document.getElementById('pickSyncBtn').addEventListener('click', async function () {
    this.disabled = true;
    setSyncStatus(t('gcPickingFolder'), '');
    try {
      var res = await window.electronApi.pickSyncLocation();
      if (!res) {
        setSyncStatus(t('gcNoResponse'), 'err');
      } else if (res.canceled) {
        setSyncStatus(t('gcFolderCanceled'), '');
      } else if (!res.ok) {
        setSyncStatus(res.error || t('gcCouldNotSetFolder'), 'err');
      } else {
        setSyncStatus(t('gcSyncFolderUpdated'), 'ok');
        await refreshSyncPath();
      }
    } catch (err) { setSyncStatus(String(err && err.message ? err.message : err), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('runSyncBtn').addEventListener('click', doSync);
  var runMirrorAppToSyncBtnEl = document.getElementById('runMirrorAppToSyncBtn');
  if (runMirrorAppToSyncBtnEl) runMirrorAppToSyncBtnEl.addEventListener('click', doMirrorAppToSync);
  var runMirrorSyncToAppBtnEl = document.getElementById('runMirrorSyncToAppBtn');
  if (runMirrorSyncToAppBtnEl) runMirrorSyncToAppBtnEl.addEventListener('click', doMirrorSyncToApp);

  document.getElementById('resetSyncBaselineBtn').addEventListener('click', async function () {
    var api = (window.electronApi && typeof window.electronApi.resetSyncBaseline === 'function')
      ? window.electronApi
      : (window.Desktop && typeof window.Desktop.resetSyncBaseline === 'function' ? window.Desktop : null);
    if (!api) return;
    this.disabled = true;
    try {
      var res = await api.resetSyncBaseline();
      if (res && res.ok) {
        setSyncStatus(t('gcResetSyncBaselineDone'), 'ok');
      } else {
        setSyncStatus((res && res.error) || t('gcResetSyncBaselineErr'), 'err');
      }
    } catch (err) {
      setSyncStatus(String(err && err.message ? err.message : err), 'err');
    } finally {
      this.disabled = false;
    }
  });

  function groupSyncItems(items) {
    var subfolderParents = new Set();
    for (var i = 0; i < items.length; i++) {
      var p = items[i].relativePath.split('/');
      if (p.length >= 3) subfolderParents.add(p[0] + '/' + p[1]);
    }

    function getKeys(relativePath) {
      var parts = relativePath.split('/');
      if (parts.length < 2) return { l1: null, l2: null };
      if (parts[0] === 'log') {
        if (parts[1] === 'constellation' && parts.length >= 4)
          return { l1: 'log/constellation', l2: 'log/constellation/' + parts[2] };
        if (parts.length >= 3) return { l1: 'log/' + parts[1], l2: null };
        return { l1: 'log', l2: null };
      }
      if (parts.length >= 3) return { l1: parts[0], l2: parts[0] + '/' + parts[1] };
      var base = parts[1].replace(/\.[^.]+$/, '');
      var l2cand = parts[0] + '/' + base;
      return { l1: parts[0], l2: subfolderParents.has(l2cand) ? l2cand : null };
    }

    function computeStats(g, leaves) {
      g.fileCount = leaves.length;
      var kinds = new Set(leaves.map(function (i) { return i.kind; }));
      g.kind = kinds.size === 1 ? [...kinds][0] : 'mixed';
      g.srcMtimeMs = Math.max.apply(null, leaves.map(function (i) { return i.srcMtimeMs || 0; }));
      g.destMtimeMs = Math.max.apply(null, leaves.map(function (i) { return i.destMtimeMs || 0; }));
      g.srcSize = leaves.reduce(function (s, i) { return s + (i.srcSize || 0); }, 0);
      g.destSize = leaves.reduce(function (s, i) { return s + (i.destSize || 0); }, 0);
      var sides = new Set(leaves.map(function (i) { return i.side; }).filter(Boolean));
      g.side = sides.size === 1 ? [...sides][0] : 'mixed';
    }

    var result = [];
    var l1Map = new Map();
    var l2Map = new Map();

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var keys = getKeys(item.relativePath);
      if (!keys.l1) { result.push(item); continue; }

      if (!l1Map.has(keys.l1)) {
        var g = { relativePath: keys.l1, isGroup: true, groupItems: [] };
        l1Map.set(keys.l1, g);
        result.push(g);
      }
      var l1g = l1Map.get(keys.l1);

      if (keys.l2) {
        if (!l2Map.has(keys.l2)) {
          var sg = { relativePath: keys.l2, isSubGroup: true, groupItems: [] };
          l2Map.set(keys.l2, sg);
          l1g.groupItems.push(sg);
        }
        l2Map.get(keys.l2).groupItems.push(item);
      } else {
        l1g.groupItems.push(item);
      }
    }

    for (var [, sg] of l2Map) computeStats(sg, sg.groupItems);

    for (var [, g] of l1Map) {
      var allLeaves = [];
      for (var k = 0; k < g.groupItems.length; k++) {
        var child = g.groupItems[k];
        if (child.isSubGroup) allLeaves = allLeaves.concat(child.groupItems);
        else allLeaves.push(child);
      }
      computeStats(g, allLeaves);
    }

    return result;
  }

  function _syncBadgeIcon(iconFile) {
    return '<img src="../assets/icons/' + iconFile + '" class="sync-badge-icon" alt="" /> ';
  }

  function _getSyncBadge(kind, side) {
    if (kind === 'new') {
      if (side === 'src-only') return '<span class="new-file-badge badge-added-app">+ ' + t('gcStatusAddedApp') + '</span>';
      if (side === 'dest-only') return '<span class="new-file-badge badge-added-sync">+ ' + t('gcStatusAddedSync') + '</span>';
      return '<span class="new-file-badge badge-added-app">+ ' + t('gcStatusNew') + '</span>';
    }
    if (kind === 'deleted-src') return '<span class="new-file-badge badge-deleted-app">- ' + t('gcStatusDeletedApp') + '</span>';
    if (kind === 'deleted-dest') return '<span class="new-file-badge badge-deleted-sync">- ' + t('gcStatusDeletedSync') + '</span>';
    if (kind === 'modified-src') return '<span class="new-file-badge badge-mod-app">' + _syncBadgeIcon('edit.svg') + t('gcStatusModifiedApp') + '</span>';
    if (kind === 'modified-dest') return '<span class="new-file-badge badge-mod-sync">' + _syncBadgeIcon('edit.svg') + t('gcStatusModifiedSync') + '</span>';
    if (kind === 'conflict-delete-src') return '<span class="new-file-badge badge-conflict">' + _syncBadgeIcon('zap.svg') + t('gcStatusConflictDeleteApp') + '</span>';
    if (kind === 'conflict-delete-dest') return '<span class="new-file-badge badge-conflict">' + _syncBadgeIcon('zap.svg') + t('gcStatusConflictDeleteSync') + '</span>';
    if (kind === 'conflict') return '<span class="new-file-badge badge-conflict">' + _syncBadgeIcon('zap.svg') + t('gcStatusConflict') + '</span>';
    if (kind === 'mixed') return '<span class="group-count-badge">Mixed</span>';
    return '';
  }

  function _getSyncRowClass(kind) {
    if (kind === 'new') return 'new-row';
    if (kind === 'deleted-src' || kind === 'deleted-dest') return 'deleted-row';
    if (kind === 'modified-src' || kind === 'modified-dest') return 'modified-row';
    if (kind === 'conflict' || (kind && kind.startsWith('conflict-'))) return 'conflict-row';
    return '';
  }

  function _getSyncActionOptions(kind, side, isChild) {
    var cls = isChild ? 'action-select child-action-select' : 'action-select';
    var opt = [];
    if (kind === 'new') {
      if (side === 'src-only') {
        opt.push({ val: 'keep-source', label: t('gcActionCopyToSync'), def: true });
        opt.push({ val: 'skip', label: t('gcActionSkip') });
        opt.push({ val: 'delete-source', label: t('gcActionDeleteApp') });
        opt.push({ val: 'bak-source', label: t('gcActionBakSource') });
        if (!isChild) opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
      } else {
        opt.push({ val: 'keep-target', label: t('gcActionCopyToApp'), def: true });
        opt.push({ val: 'skip', label: t('gcActionSkip') });
        opt.push({ val: 'delete-target', label: t('gcActionDeleteSync') });
        opt.push({ val: 'bak-target', label: t('gcActionBakTarget') });
        if (!isChild) opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
      }
    } else if (kind === 'deleted-src') {
      opt.push({ val: 'delete-target', label: t('gcActionDeleteSync'), def: true });
      opt.push({ val: 'keep-target', label: t('gcActionRestoreApp') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-target', label: t('gcActionBakTarget') });
      if (!isChild) opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    } else if (kind === 'deleted-dest') {
      opt.push({ val: 'delete-source', label: t('gcActionDeleteApp'), def: true });
      opt.push({ val: 'keep-source', label: t('gcActionRestoreSync') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-source', label: t('gcActionBakSource') });
      if (!isChild) opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    } else if (kind === 'conflict-delete-src') {
      opt.push({ val: 'keep-target', label: t('gcActionKeepSync'), def: true });
      opt.push({ val: 'delete-target', label: t('gcActionDeleteSync') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-target', label: t('gcActionBakTarget') });
      if (!isChild) opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    } else if (kind === 'conflict-delete-dest') {
      opt.push({ val: 'keep-source', label: t('gcActionKeepApp'), def: true });
      opt.push({ val: 'delete-source', label: t('gcActionDeleteApp') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-source', label: t('gcActionBakSource') });
      if (!isChild) opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    } else if (kind === 'modified-src') {
      opt.push({ val: 'keep-source', label: t('gcActionKeepApp'), def: true });
      opt.push({ val: 'keep-target', label: t('gcActionKeepSync') });
      opt.push({ val: 'keep-newer', label: t('gcActionKeepNewer') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-source', label: t('gcActionBakSource') });
      opt.push({ val: 'bak-target', label: t('gcActionBakTarget') });
      opt.push({ val: 'archive-older', label: t('gcActionArchiveOlder') });
      opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    } else if (kind === 'modified-dest') {
      opt.push({ val: 'keep-target', label: t('gcActionKeepSync'), def: true });
      opt.push({ val: 'keep-source', label: t('gcActionKeepApp') });
      opt.push({ val: 'keep-newer', label: t('gcActionKeepNewer') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-source', label: t('gcActionBakSource') });
      opt.push({ val: 'bak-target', label: t('gcActionBakTarget') });
      opt.push({ val: 'archive-older', label: t('gcActionArchiveOlder') });
      opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    } else {
      opt.push({ val: 'keep-newer', label: t('gcActionKeepNewer'), def: true });
      opt.push({ val: 'keep-source', label: t('gcActionKeepApp') });
      opt.push({ val: 'keep-target', label: t('gcActionKeepSync') });
      opt.push({ val: 'skip', label: t('gcActionSkip') });
      opt.push({ val: 'bak-source', label: t('gcActionBakSource') });
      opt.push({ val: 'bak-target', label: t('gcActionBakTarget') });
      opt.push({ val: 'archive-older', label: t('gcActionArchiveOlder') });
      opt.push({ val: 'archive-all', label: t('gcActionArchiveAll') });
    }
    return { cls: cls, options: opt };
  }

  function _buildSelectHtml(nameEsc, conf) {
    var html = '<select class="' + conf.cls + '" name="sync-action-' + nameEsc + '">';
    for (var i = 0; i < conf.options.length; i++) {
      var o = conf.options[i];
      html += '<option value="' + o.val + '"' + (o.def ? ' selected' : '') + '>' + o.label + '</option>';
    }
    html += '</select>';
    return html;
  }

  function _syncChildrenAction(parentKey, action) {
    var children = _syncChildRows.get(parentKey) || [];
    for (var i = 0; i < children.length; i++) {
      var ch = children[i];
      if (ch.isSubGroup) {
        var sgSel = ch.tr.querySelector('select.action-select');
        if (sgSel) {
          var opt = sgSel.querySelector('option[value="' + action + '"]');
          if (opt) sgSel.value = action;
        }
        var subLeaves = _syncSubGroupChildren.get(ch.key) || [];
        for (var j = 0; j < subLeaves.length; j++) {
          var leafSel = subLeaves[j].querySelector('select.child-action-select');
          if (leafSel) {
            var lOpt = leafSel.querySelector('option[value="' + action + '"]');
            if (lOpt) leafSel.value = action;
          }
        }
      } else {
        var leafSel2 = ch.tr.querySelector('select.child-action-select');
        if (leafSel2) {
          var lOpt2 = leafSel2.querySelector('option[value="' + action + '"]');
          if (lOpt2) leafSel2.value = action;
        }
      }
    }
  }

  function _deletedCellHtml() {
    return '<span class="absent-cell cell-deleted"><img src="../assets/icons/close.svg" class="sync-badge-icon sync-badge-icon-dark" alt="" /> ' + t('gcDeleted') + '</span>';
  }

  function renderSyncRow(c) {
    var tr = document.createElement('tr');
    tr.dataset.path = c.relativePath;
    tr.className = _getSyncRowClass(c.kind);
    function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var pathEsc = escHtml(c.relativePath);
    var nameEsc = CSS.escape(c.relativePath);

    var srcAbsent = (c.kind === 'new' && c.side === 'dest-only') || c.kind === 'deleted-src' || c.kind === 'conflict-delete-src';
    var destAbsent = (c.kind === 'new' && c.side === 'src-only') || c.kind === 'deleted-dest' || c.kind === 'conflict-delete-dest';
    var isSrcDeleted = c.kind === 'deleted-src' || c.kind === 'conflict-delete-src';
    var isDestDeleted = c.kind === 'deleted-dest' || c.kind === 'conflict-delete-dest';

    var srcSizeHtml = isSrcDeleted ? _deletedCellHtml() : (srcAbsent ? '<span class="absent-cell">-</span>' : fmtSize(c.srcSize));
    var srcDateHtml = isSrcDeleted ? _deletedCellHtml() : (srcAbsent ? '<span class="absent-cell">-</span>' : fmtDate(c.srcMtimeMs));
    var destSizeHtml = isDestDeleted ? _deletedCellHtml() : (destAbsent ? '<span class="absent-cell">-</span>' : fmtSize(c.destSize));
    var destDateHtml = isDestDeleted ? _deletedCellHtml() : (destAbsent ? '<span class="absent-cell">-</span>' : fmtDate(c.destMtimeMs));

    var srcTime = c.srcMtimeMs || 0;
    var destTime = c.destMtimeMs || 0;
    var srcNewer = srcTime > destTime;
    var destNewer = destTime > srcTime;
    if (c.kind === 'new') {
      if (c.side === 'src-only') { srcNewer = true; destNewer = false; }
      if (c.side === 'dest-only') { destNewer = true; srcNewer = false; }
    }
    var srcCellClass = (srcNewer && !srcAbsent && !isSrcDeleted) ? 'newer-cell' : '';
    var destCellClass = (destNewer && !destAbsent && !isDestDeleted) ? 'newer-cell' : '';

    var nameHtml, statusHtml, actionSelectHtml;
    var badgeHtml = _getSyncBadge(c.kind, c.side);

    if (c.isGroup) {
      tr.dataset.isGroup = '1';
      nameHtml = '<button type="button" class="sync-expand-btn" title="+">+</button>' + pathEsc + '/ <span class="group-count-badge">' + c.fileCount + ' files</span>' + badgeHtml;
      statusHtml = badgeHtml;
      var actConf = _getSyncActionOptions(c.kind, c.side, false);
      actionSelectHtml = _buildSelectHtml(nameEsc, actConf);
    } else {
      nameHtml = pathEsc + badgeHtml;
      statusHtml = badgeHtml;
      var actConfLeaf = _getSyncActionOptions(c.kind, c.side, false);
      actionSelectHtml = _buildSelectHtml(nameEsc, actConfLeaf);
    }

    tr.innerHTML = '<td class="conflict-path-cell">' + nameHtml + '</td>' +
      '<td class="size-cell ' + srcCellClass + '">' + srcSizeHtml + '</td>' +
      '<td class="date-cell ' + srcCellClass + '">' + srcDateHtml + '</td>' +
      '<td class="size-cell ' + destCellClass + '">' + destSizeHtml + '</td>' +
      '<td class="date-cell ' + destCellClass + '">' + destDateHtml + '</td>' +
      '<td class="status-cell">' + statusHtml + '</td>' +
      '<td class="action-cell">' + actionSelectHtml + '</td>';

    if (c.isGroup) {
      var sel = tr.querySelector('select.action-select');
      if (sel) {
        sel.addEventListener('change', function () {
          _syncChildrenAction(c.relativePath, this.value);
        });
      }
    }

    return tr;
  }

  function renderSyncSubGroupRow(sg, parentKey) {
    var tr = document.createElement('tr');
    tr.className = 'sync-child-row sync-subgroup-row ' + _getSyncRowClass(sg.kind);
    tr.dataset.parentGroup = parentKey;
    tr.dataset.path = sg.relativePath;
    function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var displayName = sg.relativePath.startsWith(parentKey + '/') ? sg.relativePath.slice(parentKey.length + 1) : sg.relativePath;

    var srcAbsent = (sg.kind === 'new' && sg.side === 'dest-only') || sg.kind === 'deleted-src' || sg.kind === 'conflict-delete-src';
    var destAbsent = (sg.kind === 'new' && sg.side === 'src-only') || sg.kind === 'deleted-dest' || sg.kind === 'conflict-delete-dest';
    var isSrcDeleted = sg.kind === 'deleted-src' || sg.kind === 'conflict-delete-src';
    var isDestDeleted = sg.kind === 'deleted-dest' || sg.kind === 'conflict-delete-dest';

    var srcSizeHtml = isSrcDeleted ? _deletedCellHtml() : (srcAbsent ? '<span class="absent-cell">-</span>' : fmtSize(sg.srcSize));
    var srcDateHtml = isSrcDeleted ? _deletedCellHtml() : (srcAbsent ? '<span class="absent-cell">-</span>' : fmtDate(sg.srcMtimeMs));
    var destSizeHtml = isDestDeleted ? _deletedCellHtml() : (destAbsent ? '<span class="absent-cell">-</span>' : fmtSize(sg.destSize));
    var destDateHtml = isDestDeleted ? _deletedCellHtml() : (destAbsent ? '<span class="absent-cell">-</span>' : fmtDate(sg.destMtimeMs));

    var srcTime = sg.srcMtimeMs || 0, destTime = sg.destMtimeMs || 0;
    var srcNewer = srcTime > destTime, destNewer = destTime > srcTime;
    if (sg.kind === 'new') {
      if (sg.side === 'src-only') { srcNewer = true; destNewer = false; }
      if (sg.side === 'dest-only') { destNewer = true; srcNewer = false; }
    }
    var badgeHtml = _getSyncBadge(sg.kind, sg.side);
    var nameEsc = CSS.escape(sg.relativePath);
    var actConf = _getSyncActionOptions(sg.kind, sg.side, false);
    var actionHtml = _buildSelectHtml(nameEsc, actConf);

    tr.innerHTML = '<td class="conflict-path-cell sync-child-path">' +
      '<button type="button" class="sync-expand-btn" title="+">+</button>' +
      escHtml(displayName) + '/ <span class="group-count-badge">' + sg.fileCount + ' files</span>' + badgeHtml + '</td>' +
      '<td class="size-cell ' + (srcNewer && !srcAbsent && !isSrcDeleted ? 'newer-cell' : '') + '">' + srcSizeHtml + '</td>' +
      '<td class="date-cell ' + (srcNewer && !srcAbsent && !isSrcDeleted ? 'newer-cell' : '') + '">' + srcDateHtml + '</td>' +
      '<td class="size-cell ' + (destNewer && !destAbsent && !isDestDeleted ? 'newer-cell' : '') + '">' + destSizeHtml + '</td>' +
      '<td class="date-cell ' + (destNewer && !destAbsent && !isDestDeleted ? 'newer-cell' : '') + '">' + destDateHtml + '</td>' +
      '<td class="status-cell">' + badgeHtml + '</td>' +
      '<td class="action-cell">' + actionHtml + '</td>';

    var sel = tr.querySelector('select.action-select');
    if (sel) {
      sel.addEventListener('change', function () {
        var subLeaves = _syncSubGroupChildren.get(sg.relativePath) || [];
        for (var j = 0; j < subLeaves.length; j++) {
          var leafSel = subLeaves[j].querySelector('select.child-action-select');
          if (leafSel) {
            var lOpt = leafSel.querySelector('option[value="' + this.value + '"]');
            if (lOpt) leafSel.value = this.value;
          }
        }
      });
    }

    return tr;
  }

  function renderSyncChildRow(c, groupKey, isDeep) {
    var tr = document.createElement('tr');
    tr.className = 'sync-child-row ' + _getSyncRowClass(c.kind);
    tr.dataset.parentGroup = groupKey;
    tr.dataset.path = c.relativePath;
    function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var pathClass = isDeep ? 'sync-leaf-path' : 'sync-child-path';
    var displayPath = c.relativePath.startsWith(groupKey + '/') ? c.relativePath.slice(groupKey.length + 1) : c.relativePath;

    var srcAbsent = (c.kind === 'new' && c.side === 'dest-only') || c.kind === 'deleted-src' || c.kind === 'conflict-delete-src';
    var destAbsent = (c.kind === 'new' && c.side === 'src-only') || c.kind === 'deleted-dest' || c.kind === 'conflict-delete-dest';
    var isSrcDeleted = c.kind === 'deleted-src' || c.kind === 'conflict-delete-src';
    var isDestDeleted = c.kind === 'deleted-dest' || c.kind === 'conflict-delete-dest';

    var srcSizeHtml = isSrcDeleted ? _deletedCellHtml() : (srcAbsent ? '<span class="absent-cell">-</span>' : fmtSize(c.srcSize));
    var srcDateHtml = isSrcDeleted ? _deletedCellHtml() : (srcAbsent ? '<span class="absent-cell">-</span>' : fmtDate(c.srcMtimeMs));
    var destSizeHtml = isDestDeleted ? _deletedCellHtml() : (destAbsent ? '<span class="absent-cell">-</span>' : fmtSize(c.destSize));
    var destDateHtml = isDestDeleted ? _deletedCellHtml() : (destAbsent ? '<span class="absent-cell">-</span>' : fmtDate(c.destMtimeMs));

    var srcTime = c.srcMtimeMs || 0, destTime = c.destMtimeMs || 0;
    var srcNewer = srcTime > destTime, destNewer = destTime > srcTime;
    if (c.kind === 'new') {
      if (c.side === 'src-only') { srcNewer = true; destNewer = false; }
      if (c.side === 'dest-only') { destNewer = true; srcNewer = false; }
    }
    var badgeHtml = _getSyncBadge(c.kind, c.side);
    var nameEsc = CSS.escape(c.relativePath);
    var actConf = _getSyncActionOptions(c.kind, c.side, true);
    var actionSelectHtml = _buildSelectHtml(nameEsc, actConf);

    tr.innerHTML = '<td class="conflict-path-cell ' + pathClass + '">' + escHtml(displayPath) + '</td>' +
      '<td class="size-cell ' + (srcNewer && !srcAbsent && !isSrcDeleted ? 'newer-cell' : '') + '">' + srcSizeHtml + '</td>' +
      '<td class="date-cell ' + (srcNewer && !srcAbsent && !isSrcDeleted ? 'newer-cell' : '') + '">' + srcDateHtml + '</td>' +
      '<td class="size-cell ' + (destNewer && !destAbsent && !isDestDeleted ? 'newer-cell' : '') + '">' + destSizeHtml + '</td>' +
      '<td class="date-cell ' + (destNewer && !destAbsent && !isDestDeleted ? 'newer-cell' : '') + '">' + destDateHtml + '</td>' +
      '<td class="status-cell">' + badgeHtml + '</td>' +
      '<td class="action-cell">' + actionSelectHtml + '</td>';
    return tr;
  }

  function _updateSyncSortHeaders() {
    if (!syncConflictList) return;
    var ths = syncConflictList.querySelectorAll('th.th-sort');
    for (var i = 0; i < ths.length; i++) {
      var th = ths[i];
      var span = th.querySelector('.th-arrow');
      if (!span) continue;
      span.textContent = th.dataset.col === _syncSortCol ? (_syncSortAsc ? '▲' : '▼') : '';
    }
  }

  function buildSyncConflictModal(conflicts, newFiles) {
    newFiles = newFiles || [];
    var flat = (conflicts || []).map(function (c) { return Object.assign({}, c, { kind: c.kind || 'conflict' }); })
      .concat((newFiles || []).map(function (f) { return Object.assign({}, f, { kind: f.kind || 'new' }); }));
    _syncConflictsAll = groupSyncItems(flat);
    _syncConflictItems.clear();
    _syncChildRows.clear();
    _syncExpandedGroups.clear();
    _syncSubGroupItems.clear();
    _syncSubGroupChildren.clear();
    syncConflictSearch.value = '';
    _syncDaysVal = '0'; setChipActive(syncChipsDays, '0');
    _syncCatVal = ''; setChipActive(syncChipsCat, '');
    syncConflictDiffSize.checked = false;
    syncConflictDateTol.value = String(_syncTolS);
    syncConflictSinceLastSync.checked = false;
    if (_lastSyncTime > 0) {
      syncConflictSinceLastSyncLbl.style.display = 'inline-flex';
      syncConflictSinceLastSyncLbl.title = 'Show only files changed since last sync (' + new Date(_lastSyncTime).toLocaleString() + ')';
    } else {
      syncConflictSinceLastSyncLbl.style.display = 'none';
    }
    _syncSortCol = 'name'; _syncSortAsc = true;

    syncConflictList.innerHTML =
      '<table class="conflict-table"><thead><tr>' +
      '<th class="th-sort" data-col="name">' + t('gcSyncColName') + ' <span class="th-arrow"></span></th>' +
      '<th class="th-sort" data-col="size-src">' + t('gcSyncColAppSize') + ' <span class="th-arrow"></span></th>' +
      '<th class="th-sort" data-col="date-src">' + t('gcSyncColAppDate') + ' <span class="th-arrow"></span></th>' +
      '<th class="th-sort" data-col="size-dest">' + t('gcSyncColSyncSize') + ' <span class="th-arrow"></span></th>' +
      '<th class="th-sort" data-col="date-dest">' + t('gcSyncColSyncDate') + ' <span class="th-arrow"></span></th>' +
      '<th class="th-sort" data-col="status">' + t('gcSyncColStatus') + ' <span class="th-arrow"></span></th>' +
      '<th>' + t('gcSyncColAction') + '</th>' +
      '</tr></thead><tbody id="syncConflictTbody"></tbody></table>';
    _syncConflictTbody = syncConflictList.querySelector('#syncConflictTbody');

    var ths = syncConflictList.querySelectorAll('th.th-sort');
    for (var i = 0; i < ths.length; i++) {
      (function (th) {
        th.addEventListener('click', function () {
          if (_syncSortCol === th.dataset.col) { _syncSortAsc = !_syncSortAsc; }
          else { _syncSortCol = th.dataset.col; _syncSortAsc = true; }
          _updateSyncSortHeaders();
          applySyncConflictFilters();
        });
      })(ths[i]);
    }
    _updateSyncSortHeaders();

    for (var j = 0; j < _syncConflictsAll.length; j++) {
      var c = _syncConflictsAll[j];
      _syncConflictItems.set(c.relativePath, renderSyncRow(c));
      if (c.isGroup) {
        var childEntries = [];
        for (var ci = 0; ci < c.groupItems.length; ci++) {
          (function (child) {
            if (child.isSubGroup) {
              var sgTr = renderSyncSubGroupRow(child, c.relativePath);
              _syncSubGroupItems.set(child.relativePath, sgTr);
              childEntries.push({ tr: sgTr, isSubGroup: true, key: child.relativePath, data: child });
              _syncSubGroupChildren.set(child.relativePath, child.groupItems.map(function (leaf) {
                return renderSyncChildRow(leaf, child.relativePath, true);
              }));
            } else {
              childEntries.push({ tr: renderSyncChildRow(child, c.relativePath, false), isSubGroup: false, data: child });
            }
          })(c.groupItems[ci]);
        }
        _syncChildRows.set(c.relativePath, childEntries);
      }
    }
    applySyncConflictFilters();
  }

  function applySyncConflictFilters() {
    var search = syncConflictSearch.value.trim().toLowerCase();
    var days = parseInt(_syncDaysVal, 10);
    var cutoff = days > 0 ? Date.now() - days * 86400000 : 0;
    if (syncConflictSinceLastSync.checked && _lastSyncTime > 0) cutoff = Math.max(cutoff, _lastSyncTime);
    var diffSizeOnly = syncConflictDiffSize.checked;
    var dateTolMs = Math.max(0, parseFloat(syncConflictDateTol.value) || 0) * 1000;
    var cat = _syncCatVal;

    function itemMatchesSearch(item, q) {
      if (item.relativePath.toLowerCase().indexOf(q) !== -1) return true;
      if ((item.isGroup || item.isSubGroup) && item.groupItems) {
        return item.groupItems.some(function (child) { return itemMatchesSearch(child, q); });
      }
      return false;
    }

    function allConflictLeaves(item, pred) {
      if (item.isGroup || item.isSubGroup) {
        return item.groupItems.every(function (child) { return allConflictLeaves(child, pred); });
      }
      if (item.kind !== 'conflict') return true;
      return pred(item);
    }

    var filtered = _syncConflictsAll.filter(function (c) {
      if (search && !itemMatchesSearch(c, search)) return false;
      if (cat && SYNC_CAT_RULES[cat]) {
        var catPath = c.relativePath + (c.isGroup && !c.relativePath.endsWith('/') ? '/' : '');
        if (!SYNC_CAT_RULES[cat](catPath)) return false;
      }
      if (cutoff > 0) {
        var newest = Math.max(c.srcMtimeMs || 0, c.destMtimeMs || 0);
        if (newest < cutoff) return false;
      }
      if (c.kind === 'conflict') {
        if (diffSizeOnly && allConflictLeaves(c, function (l) { return l.srcSize === l.destSize; })) return false;
        if (dateTolMs > 0 && allConflictLeaves(c, function (l) { return Math.abs((l.srcMtimeMs || 0) - (l.destMtimeMs || 0)) <= dateTolMs; })) return false;
      }
      return true;
    });

    var statusOrder = { 'new': 0, 'deleted-src': 1, 'deleted-dest': 1, 'modified-src': 2, 'modified-dest': 2, 'conflict': 3, 'mixed': 4 };
    filtered.sort(function (a, b) {
      var va, vb;
      if (_syncSortCol === 'name') { va = a.relativePath; vb = b.relativePath; }
      else if (_syncSortCol === 'status') { va = statusOrder[a.kind] != null ? statusOrder[a.kind] : 5; vb = statusOrder[b.kind] != null ? statusOrder[b.kind] : 5; }
      else if (_syncSortCol === 'date-src') { va = a.srcMtimeMs || 0; vb = b.srcMtimeMs || 0; }
      else if (_syncSortCol === 'date-dest') { va = a.destMtimeMs || 0; vb = b.destMtimeMs || 0; }
      else if (_syncSortCol === 'size-src') { va = a.srcSize || 0; vb = b.srcSize || 0; }
      else if (_syncSortCol === 'size-dest') { va = a.destSize || 0; vb = b.destSize || 0; }
      else { va = a.relativePath; vb = b.relativePath; }
      var cmp = typeof va === 'string' ? va.localeCompare(vb) : (va - vb);
      return _syncSortAsc ? cmp : -cmp;
    });

    function childVisible(entry) {
      var c = entry.data;
      if (!c) return true;
      if (entry.isSubGroup) {
        if (search && !itemMatchesSearch(c, search)) return false;
        if (cutoff > 0 && Math.max(c.srcMtimeMs || 0, c.destMtimeMs || 0) < cutoff) return false;
        if (c.kind === 'conflict') {
          if (diffSizeOnly && allConflictLeaves(c, function (l) { return l.srcSize === l.destSize; })) return false;
          if (dateTolMs > 0 && allConflictLeaves(c, function (l) { return Math.abs((l.srcMtimeMs || 0) - (l.destMtimeMs || 0)) <= dateTolMs; })) return false;
        }
      } else {
        if (search && c.relativePath.toLowerCase().indexOf(search) === -1) return false;
        if (cutoff > 0 && Math.max(c.srcMtimeMs || 0, c.destMtimeMs || 0) < cutoff) return false;
        if (c.kind === 'conflict') {
          if (diffSizeOnly && c.srcSize === c.destSize) return false;
          if (dateTolMs > 0 && Math.abs((c.srcMtimeMs || 0) - (c.destMtimeMs || 0)) <= dateTolMs) return false;
        }
      }
      return true;
    }

    if (_syncConflictTbody) {
      _syncConflictTbody.innerHTML = '';
      for (var i = 0; i < filtered.length; i++) {
        var row = _syncConflictItems.get(filtered[i].relativePath);
        if (!row) continue;
        if (filtered[i].isGroup) {
          var allGroupChildren = _syncChildRows.get(filtered[i].relativePath) || [];
          var visibleChildren = allGroupChildren.filter(childVisible);
          var badgeEl = row.querySelector('.group-count-badge');
          if (badgeEl) {
            var visCount = 0;
            for (var vc = 0; vc < visibleChildren.length; vc++) {
              visCount += visibleChildren[vc].isSubGroup ? (visibleChildren[vc].data.fileCount || 0) : 1;
            }
            badgeEl.textContent = visCount < filtered[i].fileCount
              ? (visCount + ' / ' + filtered[i].fileCount + ' files')
              : (filtered[i].fileCount + ' files');
          }
          _syncConflictTbody.appendChild(row);
          if (_syncExpandedGroups.has(filtered[i].relativePath)) {
            for (var ci = 0; ci < visibleChildren.length; ci++) {
              _syncConflictTbody.appendChild(visibleChildren[ci].tr);
              if (visibleChildren[ci].isSubGroup && _syncExpandedGroups.has(visibleChildren[ci].key)) {
                var subLeaves = _syncSubGroupChildren.get(visibleChildren[ci].key) || [];
                for (var si = 0; si < subLeaves.length; si++) {
                  _syncConflictTbody.appendChild(subLeaves[si]);
                }
              }
            }
          }
        } else {
          _syncConflictTbody.appendChild(row);
        }
      }
    }

    var total = _syncConflictsAll.length;
    var shown = filtered.length;
    var addedCount = _syncConflictsAll.filter(function (c) { return c.kind === 'new'; }).length;
    var delCount = _syncConflictsAll.filter(function (c) { return c.kind === 'deleted-src' || c.kind === 'deleted-dest'; }).length;
    var modCount = _syncConflictsAll.filter(function (c) { return c.kind === 'modified-src' || c.kind === 'modified-dest'; }).length;
    var cCount = _syncConflictsAll.filter(function (c) { return c.kind === 'conflict' || (c.kind && c.kind.startsWith('conflict-')); }).length;
    var mCount = _syncConflictsAll.filter(function (c) { return c.kind === 'mixed'; }).length;
    var parts = [];
    if (addedCount > 0) parts.push(tFmt('gcCountAdded', { n: addedCount }));
    if (delCount > 0) parts.push(tFmt('gcCountDeleted', { n: delCount }));
    if (modCount > 0) parts.push(tFmt('gcCountModified', { n: modCount }));
    if (cCount > 0) parts.push(tFmt('gcCountConflicts', { n: cCount }));
    if (mCount > 0) parts.push(mCount + ' mixed');
    var breakdown = parts.join(', ');
    syncConflictCount.textContent = shown < total ? (shown + ' / ' + total + ' (' + breakdown + ')') : breakdown;
  }

  function setSyncBulkAction(action) {
    function applyToSelect(sel) {
      if (!sel) return;
      var opt = sel.querySelector('option[value="' + action + '"]');
      if (opt) {
        sel.value = action;
      } else {
        if (action === 'keep-source') {
          if (sel.querySelector('option[value="delete-target"]')) sel.value = 'delete-target';
        } else if (action === 'keep-target') {
          if (sel.querySelector('option[value="delete-source"]')) sel.value = 'delete-source';
        }
      }
    }
    for (var [, item] of _syncConflictItems) {
      applyToSelect(item.querySelector('select.action-select'));
    }
    for (var [, item] of _syncSubGroupItems) {
      applyToSelect(item.querySelector('select.action-select'));
    }
    for (var [, children] of _syncChildRows) {
      for (var ci = 0; ci < children.length; ci++) {
        applyToSelect(children[ci].tr.querySelector('select.child-action-select'));
      }
    }
    for (var [, subLeaves] of _syncSubGroupChildren) {
      for (var si = 0; si < subLeaves.length; si++) {
        applyToSelect(subLeaves[si].querySelector('select.child-action-select'));
      }
    }
  }

  // Collect decisions for all items (including those temporarily hidden by filters)
  function collectSyncDecisions() {
    var decisions = [];
    for (var [relPath, item] of _syncConflictItems) {
      var entry = null;
      for (var i = 0; i < _syncConflictsAll.length; i++) {
        if (_syncConflictsAll[i].relativePath === relPath) { entry = _syncConflictsAll[i]; break; }
      }
      if (entry && entry.isGroup) {
        var sel = item.querySelector('select.action-select');
        var groupAction = sel ? sel.value : 'skip';
        var children = _syncChildRows.get(entry.relativePath) || [];
        for (var j = 0; j < children.length; j++) {
          var ch = children[j];
          if (ch.isSubGroup) {
            var sgRow = _syncSubGroupItems.get(ch.key);
            var sgSel = sgRow && sgRow.querySelector('select.action-select');
            var sgAction = sgSel ? sgSel.value : groupAction;
            var subLeaves = _syncSubGroupChildren.get(ch.key) || [];
            for (var k = 0; k < ch.data.groupItems.length; k++) {
              var leaf = ch.data.groupItems[k];
              var leafRow = subLeaves[k];
              var leafSel = leafRow && leafRow.querySelector('select.child-action-select');
              var leafAct = (leafSel && leafSel.value) ? leafSel.value : sgAction;
              if (leafAct === 'keep-newer') {
                leafAct = (leaf.srcMtimeMs || 0) >= (leaf.destMtimeMs || 0) ? 'keep-source' : 'keep-target';
              }
              decisions.push({ relativePath: leaf.relativePath, action: leafAct });
            }
          } else {
            var leafData = ch.data;
            var leafRow2 = ch.tr;
            var leafSel2 = leafRow2 && leafRow2.querySelector('select.child-action-select');
            var leafAct2 = (leafSel2 && leafSel2.value) ? leafSel2.value : groupAction;
            if (leafAct2 === 'keep-newer') {
              leafAct2 = (leafData.srcMtimeMs || 0) >= (leafData.destMtimeMs || 0) ? 'keep-source' : 'keep-target';
            }
            decisions.push({ relativePath: leafData.relativePath, action: leafAct2 });
          }
        }
      } else {
        var sel2 = item.querySelector('select.action-select');
        var act2 = sel2 ? sel2.value : 'skip';
        if (act2 === 'keep-newer') {
          act2 = (entry && (entry.srcMtimeMs || 0) >= (entry.destMtimeMs || 0)) ? 'keep-source' : 'keep-target';
        }
        decisions.push({ relativePath: relPath, action: act2 });
      }
    }
    return decisions;
  }

  syncBulkKeepSrc.addEventListener('click', function () { setSyncBulkAction('keep-source'); });
  syncBulkKeepDest.addEventListener('click', function () { setSyncBulkAction('keep-target'); });
  syncBulkSkip.addEventListener('click', function () { setSyncBulkAction('skip'); });
  syncBulkArchiveOlder.addEventListener('click', function () { setSyncBulkAction('archive-older'); });
  syncBulkArchiveAll.addEventListener('click', function () { setSyncBulkAction('archive-all'); });

  syncConflictSearch.addEventListener('input', applySyncConflictFilters);
  syncConflictDiffSize.addEventListener('change', applySyncConflictFilters);
  syncConflictDateTol.addEventListener('input', function () {
    _syncTolS = parseFloat(this.value) || 0;
    try { var c = JSON.parse(localStorage.getItem('cmt-general-config') || '{}'); c.syncMtimeTolS = _syncTolS; localStorage.setItem('cmt-general-config', JSON.stringify(c)); } catch { }
    applySyncConflictFilters();
  });
  syncConflictSinceLastSync.addEventListener('change', applySyncConflictFilters);

  syncConflictList.addEventListener('click', function (e) {
    var btn = e.target.closest('.sync-expand-btn');
    if (!btn) return;
    var groupKey = btn.closest('tr').dataset.path;
    if (_syncExpandedGroups.has(groupKey)) {
      _syncExpandedGroups.delete(groupKey);
      btn.textContent = '+'; btn.title = '+';
    } else {
      _syncExpandedGroups.add(groupKey);
      btn.textContent = '-'; btn.title = '-';
    }
    applySyncConflictFilters();
  });

  syncChipsDays.addEventListener('click', function (e) {
    var btn = e.target.closest('.sync-chip');
    if (!btn) return;
    _syncDaysVal = btn.dataset.val;
    setChipActive(syncChipsDays, _syncDaysVal);
    applySyncConflictFilters();
  });
  syncChipsCat.addEventListener('click', function (e) {
    var btn = e.target.closest('.sync-chip');
    if (!btn) return;
    _syncCatVal = btn.dataset.val;
    setChipActive(syncChipsCat, _syncCatVal);
    applySyncConflictFilters();
  });

  function closeSyncConflictModal() {
    syncConflictOverlay.classList.remove('open');
    var runSyncBtn = document.getElementById('runSyncBtn');
    if (runSyncBtn) runSyncBtn.disabled = false;
  }

  syncConflictCancel.addEventListener('click', closeSyncConflictModal);

  syncConflictOverlay.addEventListener('click', function (e) {
    if (e.target === syncConflictOverlay) {
      closeSyncConflictModal();
    }
  });

  function notifySyncCompleted(syncInfo) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        var bc = new BroadcastChannel('cmt-sync');
        bc.postMessage({ type: 'sync-complete', info: syncInfo, timestamp: Date.now() });
        bc.close();
      } catch (_) {}
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'cmt-sync-complete', info: syncInfo }, '*');
    }
  }

  syncConflictApply.addEventListener('click', async function () {
    var decisions = collectSyncDecisions();
    syncConflictApply.disabled = true;
    syncConflictOverlay.classList.remove('open');
    setSyncStatus(t('gcApplyingResolutions'), '');
    try {
      var res = await window.electronApi.applySyncChoices({ decisions: decisions });
      if (!res || !res.ok) { setSyncStatus((res && res.error) || t('gcResolutionsFailed'), 'err'); return; }
      var errCount = (res.errors && res.errors.length) || 0;
      if (res.applied > 0) {
        _saveLastSyncTime();
        notifySyncCompleted({ mode: 'conflicts-resolved', applied: res.applied });
      }
      if (errCount) {
        setSyncStatus(tFmt('gcResolutionsDoneErrors', { applied: res.applied, errors: errCount }), 'err');
      } else {
        setSyncStatus(tFmt('gcSyncCompleteConflicts', { applied: res.applied }), 'ok');
      }
      refreshSyncLog();
    } catch (err) { setSyncStatus(String(err && err.message ? err.message : err), 'err'); }
    finally { syncConflictApply.disabled = false; document.getElementById('runSyncBtn').disabled = false; }
  });

  async function doSync() {
    document.getElementById('runSyncBtn').disabled = true;
    setSyncStatus(t('gcSyncing'), '');
    syncAddedDetails.style.display = 'none';
    try {
      var res = await window.electronApi.runSync({ mode: 'both', mtimeTolMs: _syncTolS * 1000 });
      if (!res || !res.ok) { setSyncStatus((res && res.error) || t('gcSyncFailed'), 'err'); return; }
      var errCount = (res.errors && res.errors.length) || 0;
      var hasConflicts = res.conflicts && res.conflicts.length > 0;
      var hasNewFiles = res.newFiles && res.newFiles.length > 0;
      if (hasConflicts || hasNewFiles) {
        var parts = [];
        if (hasConflicts) parts.push(tFmt('gcSyncConflictsCount', { n: res.conflicts.length }));
        if (hasNewFiles) parts.push(tFmt('gcSyncNewFilesCount', { n: res.newFiles.length }));
        setSyncStatus(tFmt('gcSyncNeedReview', { items: parts.join(', ') }), '');
        buildSyncConflictModal(res.conflicts || [], res.newFiles || []);
        syncConflictOverlay.classList.add('open');
        return;
      }
      if (errCount) {
        setSyncStatus(tFmt('gcSyncedWith', { n: errCount }), 'err');
      } else {
        setSyncStatus(t('gcSyncComplete'), 'ok');
        _saveLastSyncTime();
        notifySyncCompleted({ mode: 'both', copied: res.copied });
      }
      refreshSyncLog();
    } catch (err) { setSyncStatus(String(err && err.message ? err.message : err), 'err'); }
    finally {
      if (!syncConflictOverlay.classList.contains('open')) document.getElementById('runSyncBtn').disabled = false;
    }
  }

  async function doMirrorAppToSync() {
    var confirmMsg = typeof t === 'function' ? t('gcMirrorAppToSyncConfirm') : 'Mirror App to Sync?';
    var confirmed = (typeof showConfirm === 'function')
      ? await showConfirm(confirmMsg)
      : window.confirm(confirmMsg);
    if (!confirmed) return;

    var btnAppToSync = document.getElementById('runMirrorAppToSyncBtn');
    var btnSyncToApp = document.getElementById('runMirrorSyncToAppBtn');
    var btnSync = document.getElementById('runSyncBtn');
    if (btnAppToSync) btnAppToSync.disabled = true;
    if (btnSyncToApp) btnSyncToApp.disabled = true;
    if (btnSync) btnSync.disabled = true;

    setSyncStatus(t('gcMirroring'), '');
    syncAddedDetails.style.display = 'none';
    try {
      var res = await window.electronApi.runSync({ mode: 'mirror-to-target' });
      if (!res || !res.ok) {
        setSyncStatus((res && res.error) || t('gcSyncFailed'), 'err');
        return;
      }
      var errCount = (res.errors && res.errors.length) || 0;
      if (errCount) {
        setSyncStatus(tFmt('gcSyncedWith', { n: errCount }), 'err');
      } else {
        setSyncStatus(tFmt('gcMirrorComplete', { copied: res.copied || 0, deleted: res.deleted || 0 }), 'ok');
        _saveLastSyncTime();
        notifySyncCompleted({ mode: 'mirror-to-target', copied: res.copied });
      }
      refreshSyncLog();
    } catch (err) {
      setSyncStatus(String(err && err.message ? err.message : err), 'err');
    } finally {
      if (btnAppToSync) btnAppToSync.disabled = false;
      if (btnSyncToApp) btnSyncToApp.disabled = false;
      if (btnSync) btnSync.disabled = false;
    }
  }

  async function doMirrorSyncToApp() {
    var confirmMsg = typeof t === 'function' ? t('gcMirrorSyncToAppConfirm') : 'Mirror Sync to App?';
    var confirmed = (typeof showConfirm === 'function')
      ? await showConfirm(confirmMsg)
      : window.confirm(confirmMsg);
    if (!confirmed) return;

    var btnAppToSync = document.getElementById('runMirrorAppToSyncBtn');
    var btnSyncToApp = document.getElementById('runMirrorSyncToAppBtn');
    var btnSync = document.getElementById('runSyncBtn');
    if (btnAppToSync) btnAppToSync.disabled = true;
    if (btnSyncToApp) btnSyncToApp.disabled = true;
    if (btnSync) btnSync.disabled = true;

    setSyncStatus(t('gcMirroring'), '');
    syncAddedDetails.style.display = 'none';
    try {
      var res = await window.electronApi.runSync({ mode: 'mirror-to-source' });
      if (!res || !res.ok) {
        setSyncStatus((res && res.error) || t('gcSyncFailed'), 'err');
        return;
      }
      var errCount = (res.errors && res.errors.length) || 0;
      if (errCount) {
        setSyncStatus(tFmt('gcSyncedWith', { n: errCount }), 'err');
      } else {
        setSyncStatus(tFmt('gcMirrorComplete', { copied: res.copied || 0, deleted: res.deleted || 0 }), 'ok');
        _saveLastSyncTime();
        notifySyncCompleted({ mode: 'mirror-to-source', copied: res.copied });
      }
      refreshSyncLog();
    } catch (err) {
      setSyncStatus(String(err && err.message ? err.message : err), 'err');
    } finally {
      if (btnAppToSync) btnAppToSync.disabled = false;
      if (btnSyncToApp) btnSyncToApp.disabled = false;
      if (btnSync) btnSync.disabled = false;
    }
  }

  async function refreshSyncLog() {
    var summaryEl = document.getElementById('syncLogSummary');
    var listEl = document.getElementById('syncLogList');
    var pathEl = document.getElementById('syncLogPathEl');
    if (!summaryEl || !listEl) return;

    try {
      var res = (window.electronApi && typeof window.electronApi.getSyncLog === 'function')
        ? await window.electronApi.getSyncLog()
        : { ok: true, entries: [], logPath: '' };
      var entries = (res && Array.isArray(res.entries)) ? res.entries : [];
      summaryEl.textContent = tFmt('gcSyncLogTitle', { n: entries.length });
      if (pathEl) {
        pathEl.textContent = (res && res.logPath) ? (t('gcSyncLogPathLabel') + res.logPath) : '';
      }

      listEl.textContent = '';
      if (entries.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'sync-log-empty';
        emptyDiv.textContent = t('gcSyncLogEmpty');
        listEl.appendChild(emptyDiv);
        return;
      }

      entries.forEach(function (entry) {
        var card = document.createElement('div');
        card.className = 'sync-log-entry';

        var head = document.createElement('div');
        head.className = 'sync-log-entry-head';
        var timeSpan = document.createElement('span');
        timeSpan.textContent = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
        var modeSpan = document.createElement('span');
        modeSpan.className = 'sync-log-mode';
        modeSpan.textContent = entry.mode || 'sync';
        head.appendChild(timeSpan);
        head.appendChild(modeSpan);
        card.appendChild(head);

        var savedArr = Array.isArray(entry.saved) ? entry.saved : [];
        var deletedArr = Array.isArray(entry.deleted) ? entry.deleted : [];
        var archivedArr = Array.isArray(entry.archived) ? entry.archived : [];
        var errArr = Array.isArray(entry.errors) ? entry.errors : [];

        var parts = [];
        if (savedArr.length > 0) parts.push(tFmt('gcSyncLogSavedCount', { n: savedArr.length }));
        if (deletedArr.length > 0) parts.push(tFmt('gcSyncLogDeletedCount', { n: deletedArr.length }));
        if (archivedArr.length > 0) parts.push(tFmt('gcSyncLogArchivedCount', { n: archivedArr.length }));
        if (errArr.length > 0) parts.push(tFmt('gcSyncLogErrorsCount', { n: errArr.length }));

        var countsEl = document.createElement('div');
        countsEl.className = 'sync-log-counts';
        countsEl.textContent = parts.length > 0 ? parts.join(' | ') : t('gcSyncLogNoChanges');
        card.appendChild(countsEl);

        if (savedArr.length > 0 || deletedArr.length > 0 || archivedArr.length > 0 || errArr.length > 0) {
          var ul = document.createElement('ul');
          ul.className = 'sync-log-files';
          savedArr.forEach(function (f) {
            var li = document.createElement('li');
            var dirLabel = f.direction === 'to-source' ? '<- ' : '-> ';
            li.textContent = dirLabel + (f.path || '');
            ul.appendChild(li);
          });
          deletedArr.forEach(function (f) {
            var li = document.createElement('li');
            li.textContent = '[deleted:' + (f.side || '') + '] ' + (f.path || '');
            ul.appendChild(li);
          });
          archivedArr.forEach(function (f) {
            var li = document.createElement('li');
            li.textContent = '[bak:' + (f.side || '') + '] ' + (f.path || '');
            ul.appendChild(li);
          });
          errArr.forEach(function (e) {
            var li = document.createElement('li');
            li.className = 'sync-log-file-err';
            li.textContent = '[error] ' + (e.path || e.relativePath || '') + ': ' + (e.error || '');
            ul.appendChild(li);
          });
          card.appendChild(ul);
        }

        listEl.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to load sync log:', err);
    }
  }

  var _refreshSyncLogBtn = document.getElementById('refreshSyncLogBtn');
  if (_refreshSyncLogBtn) {
    _refreshSyncLogBtn.addEventListener('click', refreshSyncLog);
  }
  var _clearSyncLogBtn = document.getElementById('clearSyncLogBtn');
  if (_clearSyncLogBtn) {
    _clearSyncLogBtn.addEventListener('click', async function () {
      var msg = t('gcSyncLogClearConfirm');
      var ok = (typeof showConfirm === 'function') ? await showConfirm(msg) : window.confirm(msg);
      if (!ok) return;
      if (window.electronApi && typeof window.electronApi.clearSyncLog === 'function') {
        await window.electronApi.clearSyncLog();
      }
      refreshSyncLog();
    });
  }
  refreshSyncLog();

  // ── Shared subfolder definitions ────────────────────────────────────────────
  var REMOTE_FOLDERS = [
    { id: 'config', labelKey: 'gcSyncFolderConfig' },
    { id: 'grades', labelKey: 'gcSyncFolderGrades' },
    { id: 'groups', labelKey: 'gcSyncFolderGroups' },
    { id: 'mindmaps', labelKey: 'gcSyncFolderMindmaps' },
    { id: 'customData', labelKey: 'gcSyncFolderCustomData' },
    { id: 'classPlans', labelKey: 'gcSyncFolderClassPlans' },
    { id: 'documents', labelKey: 'gcSyncFolderDocuments' },
  ];

  function buildSubfolderGrid(containerId, selectedIds) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    REMOTE_FOLDERS.forEach(function (f) {
      var lbl = document.createElement('label');
      lbl.style.cssText = 'display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:0.87rem;white-space:nowrap;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = f.id;
      cb.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--accent);';
      cb.checked = !selectedIds || selectedIds.length === 0 || selectedIds.indexOf(f.id) !== -1;
      lbl.appendChild(cb);
      var span = document.createElement('span');
      span.setAttribute('data-i18n', f.labelKey);
      span.textContent = typeof t === 'function' ? t(f.labelKey) : f.id;
      lbl.appendChild(span);
      container.appendChild(lbl);
    });
  }

  function getCheckedSubfolders(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return [];
    var checked = [];
    container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      if (cb.checked) checked.push(cb.value);
    });
    return checked;
  }

  function setRemoteStatus(elId, msg, type) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = 'status' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
  }

  // ── FTP Sync ─────────────────────────────────────────────────────────────────

  async function refreshFtpConfig() {
    if (!window.electronApi) return;
    var res = await window.electronApi.ftpGetConfig();
    if (!res || !res.ok) return;
    var cfg = res.config || {};
    document.getElementById('ftpHost').value = cfg.host || '';
    document.getElementById('ftpPort').value = cfg.port || 21;
    document.getElementById('ftpUser').value = cfg.user || '';
    document.getElementById('ftpPassword').value = cfg.hasPassword ? '***' : '';
    document.getElementById('ftpRemotePath').value = cfg.remotePath || '';
    document.getElementById('ftpSecure').checked = !!cfg.secure;
    document.getElementById('ftpAutoSyncToggle').checked = !!cfg.autoSync;
    var intervalSel = document.getElementById('ftpIntervalSelect');
    if (cfg.syncIntervalMinutes) {
      var opt = intervalSel.querySelector('option[value="' + cfg.syncIntervalMinutes + '"]');
      if (opt) opt.selected = true;
    }
    document.getElementById('ftpIntervalRow').style.display = cfg.autoSync ? 'flex' : 'none';
    buildSubfolderGrid('ftpSubfolderGrid', cfg.subfolders || []);
  }

  document.getElementById('ftpAutoSyncToggle').addEventListener('change', function () {
    document.getElementById('ftpIntervalRow').style.display = this.checked ? 'flex' : 'none';
  });

  document.getElementById('ftpSaveBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    var pw = document.getElementById('ftpPassword').value;
    var res = await window.electronApi.ftpSaveConfig({
      host: document.getElementById('ftpHost').value.trim(),
      port: parseInt(document.getElementById('ftpPort').value, 10) || 21,
      user: document.getElementById('ftpUser').value.trim(),
      password: pw,
      remotePath: document.getElementById('ftpRemotePath').value.trim(),
      secure: document.getElementById('ftpSecure').checked,
      autoSync: document.getElementById('ftpAutoSyncToggle').checked,
      syncIntervalMinutes: parseInt(document.getElementById('ftpIntervalSelect').value, 10) || 30,
      subfolders: getCheckedSubfolders('ftpSubfolderGrid'),
    });
    setRemoteStatus('ftpStatus', res && res.ok ? t('gcFtpSaved') : t('gcSyncFailed'), res && res.ok ? 'ok' : 'err');
  });

  document.getElementById('ftpTestBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('ftpStatus', t('gcFtpTesting'), '');
    this.disabled = true;
    try {
      var pw = document.getElementById('ftpPassword').value;
      await window.electronApi.ftpSaveConfig({
        host: document.getElementById('ftpHost').value.trim(),
        port: parseInt(document.getElementById('ftpPort').value, 10) || 21,
        user: document.getElementById('ftpUser').value.trim(),
        password: pw,
        remotePath: document.getElementById('ftpRemotePath').value.trim(),
        secure: document.getElementById('ftpSecure').checked,
      });
      var res = await window.electronApi.ftpTest();
      setRemoteStatus('ftpStatus', res && res.ok ? t('gcFtpConnected') : tFmt('gcFtpConnFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
    } catch (e) { setRemoteStatus('ftpStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('ftpUploadBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('ftpStatus', t('gcFtpUploading'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.ftpUpload();
      setRemoteStatus('ftpStatus', res && res.ok ? t('gcFtpUploadDone') : tFmt('gcFtpUploadFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
      refreshSyncLog();
    } catch (e) { setRemoteStatus('ftpStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('ftpDownloadBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('ftpStatus', t('gcFtpDownloading'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.ftpDownload();
      setRemoteStatus('ftpStatus', res && res.ok ? t('gcFtpDownloadDone') : tFmt('gcFtpDownloadFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
      if (res && res.ok) notifySyncCompleted({ remote: 'ftp' });
      refreshSyncLog();
    } catch (e) { setRemoteStatus('ftpStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  // ── Google Drive Sync ─────────────────────────────────────────────────────────

  async function refreshDriveConfig() {
    if (!window.electronApi) return;
    var res = await window.electronApi.driveGetConfig();
    if (!res || !res.ok) return;
    var cfg = res.config || {};
    document.getElementById('driveClientId').value = cfg.clientId || '';
    document.getElementById('driveClientSecret').value = cfg.clientSecretSet ? '***' : '';
    document.getElementById('driveFolderName').value = cfg.driveFolderName || 'Class Management Tools';
    buildSubfolderGrid('driveSubfolderGrid', cfg.subfolders || []);
    setDriveConnectedState(cfg.isConnected, cfg.userEmail);
  }

  function setDriveConnectedState(connected, email) {
    document.getElementById('driveNotConnectedRow').style.display = connected ? 'none' : '';
    document.getElementById('driveConnectedRow').style.display = connected ? 'flex' : 'none';
    document.getElementById('driveUploadBtn').disabled = !connected;
    document.getElementById('driveDownloadBtn').disabled = !connected;
    if (connected && email) {
      document.getElementById('driveConnectedEmail').textContent = tFmt('gcDriveConnected', { email: email });
    }
  }

  document.getElementById('driveCredSaveBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    var secret = document.getElementById('driveClientSecret').value;
    var res = await window.electronApi.driveSaveCredentials({
      clientId: document.getElementById('driveClientId').value.trim(),
      clientSecret: secret !== '***' ? secret : undefined,
      driveFolderName: document.getElementById('driveFolderName').value.trim(),
      subfolders: getCheckedSubfolders('driveSubfolderGrid'),
    });
    if (res && res.ok) flashSaved(document.getElementById('driveCredSaveStatus'));
    else setRemoteStatus('driveStatus', t('gcSyncFailed'), 'err');
  });

  document.getElementById('driveConnectBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    var secret = document.getElementById('driveClientSecret').value;
    await window.electronApi.driveSaveCredentials({
      clientId: document.getElementById('driveClientId').value.trim(),
      clientSecret: secret !== '***' ? secret : undefined,
    });
    setRemoteStatus('driveStatus', t('gcDriveConnecting'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.driveAuthStart();
      if (res && res.ok) {
        setRemoteStatus('driveStatus', t('gcDriveAuthDone'), 'ok');
        setDriveConnectedState(true, res.email);
      } else {
        setRemoteStatus('driveStatus', tFmt('gcDriveAuthFailed', { error: (res && res.error) || '' }), 'err');
      }
    } catch (e) { setRemoteStatus('driveStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('driveDisconnectBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    await window.electronApi.driveDisconnect();
    setDriveConnectedState(false, '');
    setRemoteStatus('driveStatus', '', '');
  });

  document.getElementById('driveUploadBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    await window.electronApi.driveSaveCredentials({ subfolders: getCheckedSubfolders('driveSubfolderGrid') });
    setRemoteStatus('driveStatus', t('gcDriveUploading'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.driveUpload();
      setRemoteStatus('driveStatus', res && res.ok ? t('gcDriveUploadDone') : tFmt('gcDriveUploadFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
      refreshSyncLog();
    } catch (e) { setRemoteStatus('driveStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('driveDownloadBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('driveStatus', t('gcDriveDownloading'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.driveDownload();
      setRemoteStatus('driveStatus', res && res.ok ? t('gcDriveDownloadDone') : tFmt('gcDriveDownloadFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
      if (res && res.ok) notifySyncCompleted({ remote: 'drive' });
      refreshSyncLog();
    } catch (e) { setRemoteStatus('driveStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  // ── WebDAV Sync ───────────────────────────────────────────────────────────────

  async function refreshWebdavConfig() {
    if (!window.electronApi) return;
    var res = await window.electronApi.webdavGetConfig();
    if (!res || !res.ok) return;
    var cfg = res.config || {};
    document.getElementById('webdavServerUrl').value = cfg.serverUrl || '';
    document.getElementById('webdavUsername').value = cfg.username || '';
    document.getElementById('webdavPassword').value = (cfg.hasPassword || cfg.password) ? '***' : '';
    document.getElementById('webdavRemotePath').value = cfg.remotePath || '';
    document.getElementById('webdavAutoSyncToggle').checked = !!cfg.autoSync;
    var intervalSel = document.getElementById('webdavIntervalSelect');
    if (cfg.syncIntervalMinutes) {
      var opt = intervalSel.querySelector('option[value="' + cfg.syncIntervalMinutes + '"]');
      if (opt) opt.selected = true;
    }
    document.getElementById('webdavIntervalRow').style.display = cfg.autoSync ? 'flex' : 'none';
    buildSubfolderGrid('webdavSubfolderGrid', cfg.subfolders || []);
  }

  document.getElementById('webdavAutoSyncToggle').addEventListener('change', function () {
    document.getElementById('webdavIntervalRow').style.display = this.checked ? 'flex' : 'none';
  });

  document.getElementById('webdavSaveBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    var pw = document.getElementById('webdavPassword').value;
    var res = await window.electronApi.webdavSaveConfig({
      serverUrl: document.getElementById('webdavServerUrl').value.trim(),
      username: document.getElementById('webdavUsername').value.trim(),
      password: pw,
      remotePath: document.getElementById('webdavRemotePath').value.trim(),
      autoSync: document.getElementById('webdavAutoSyncToggle').checked,
      syncIntervalMinutes: parseInt(document.getElementById('webdavIntervalSelect').value, 10) || 30,
      subfolders: getCheckedSubfolders('webdavSubfolderGrid'),
    });
    setRemoteStatus('webdavStatus', res && res.ok ? t('gcFtpSaved') : t('gcSyncFailed'), res && res.ok ? 'ok' : 'err');
  });

  document.getElementById('webdavTestBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('webdavStatus', t('gcFtpTesting'), '');
    this.disabled = true;
    try {
      var pw = document.getElementById('webdavPassword').value;
      await window.electronApi.webdavSaveConfig({
        serverUrl: document.getElementById('webdavServerUrl').value.trim(),
        username: document.getElementById('webdavUsername').value.trim(),
        password: pw,
        remotePath: document.getElementById('webdavRemotePath').value.trim(),
      });
      var res = await window.electronApi.webdavTest();
      setRemoteStatus('webdavStatus', res && res.ok ? t('gcFtpConnected') : tFmt('gcFtpConnFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
    } catch (e) { setRemoteStatus('webdavStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('webdavUploadBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('webdavStatus', t('gcWebdavUploading'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.webdavUpload();
      setRemoteStatus('webdavStatus', res && res.ok ? t('gcWebdavUploadDone') : tFmt('gcFtpUploadFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
      refreshSyncLog();
    } catch (e) { setRemoteStatus('webdavStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  document.getElementById('webdavDownloadBtn').addEventListener('click', async function () {
    if (!window.electronApi) return;
    setRemoteStatus('webdavStatus', t('gcWebdavDownloading'), '');
    this.disabled = true;
    try {
      var res = await window.electronApi.webdavDownload();
      setRemoteStatus('webdavStatus', res && res.ok ? t('gcWebdavDownloadDone') : tFmt('gcFtpDownloadFailed', { error: (res && res.error) || '' }), res && res.ok ? 'ok' : 'err');
      if (res && res.ok) notifySyncCompleted({ remote: 'webdav' });
      refreshSyncLog();
    } catch (e) { setRemoteStatus('webdavStatus', String(e && e.message || e), 'err'); }
    finally { this.disabled = false; }
  });

  // Expose functions used by init() and handleInitialNavigation() in general-config.html
  window.refreshSyncPath = refreshSyncPath;
  window.refreshFtpConfig = refreshFtpConfig;
  window.refreshDriveConfig = refreshDriveConfig;
  window.refreshWebdavConfig = refreshWebdavConfig;
  window.doSync = doSync;
  window.setSyncStatus = setSyncStatus;
  window.buildSyncConflictModal = buildSyncConflictModal;
  window.refreshSyncLog = refreshSyncLog;
  window.syncConflictOverlay = syncConflictOverlay;
})();
