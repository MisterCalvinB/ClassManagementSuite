(function () {
  'use strict';

  function _tr(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      var val = window.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function _trFmt(key, params, fallback) {
    if (window.i18n && typeof window.i18n.tFmt === 'function') {
      var val = window.i18n.tFmt(key, params);
      if (val && val !== key) return val;
    }
    var out = fallback;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) {
        out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
      });
    }
    return out;
  }

  function _parseJsOrJson(txt, varNames) {
    if (!txt || typeof txt !== 'string') return null;
    var trimmed = txt.trim();
    if (!trimmed) return null;
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try { return JSON.parse(trimmed); } catch (_) {}
    }
    try {
      var sandbox = {};
      var expr = varNames.map(function (v) {
        return '(window.' + v + ' !== undefined ? window.' + v + ' : (typeof ' + v + ' !== "undefined" ? ' + v + ' : undefined))';
      }).join(' || ');
      var fn = new Function('window', txt + '; return (' + expr + ');');
      return fn(sandbox);
    } catch (_) {
      return null;
    }
  }

  function _detectJsGlobalPrefix(txt, varNames) {
    if (!txt || typeof txt !== 'string') return null;
    var trimmed = txt.trim();
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') return null;
    for (var i = 0; i < varNames.length; i++) {
      var v = varNames[i];
      var re = new RegExp('(?:window\\.|var\\s+|let\\s+|const\\s+)?' + v + '\\s*=');
      if (re.test(txt)) {
        return 'window.' + v + ' = ';
      }
    }
    return null;
  }

  async function _readUserFile(rel) {
    try {
      if (window.Desktop && typeof window.Desktop.readText === 'function') {
        var r = await window.Desktop.readText('user', rel);
        if (r && r.ok && typeof r.content === 'string') return r.content;
      }
      if (window.electronApi && typeof window.electronApi.readFile === 'function') {
        var r2 = await window.electronApi.readFile({ target: 'user', filename: rel, encoding: 'utf8' });
        if (r2 && r2.ok && typeof r2.content === 'string') return r2.content;
      }
    } catch (_) {}
    return '';
  }

  async function _listUserDir(dir) {
    try {
      var r = null;
      if (window.Desktop && typeof window.Desktop.listByPath === 'function') {
        r = await window.Desktop.listByPath('user', dir, { recursive: false });
      } else if (window.electronApi && typeof window.electronApi.listByPath === 'function') {
        r = await window.electronApi.listByPath({ target: 'user', relativePath: dir, recursive: false });
      }
      if (Array.isArray(r)) return r;
      if (r && Array.isArray(r.files)) return r.files;
      if (r && Array.isArray(r.entries)) return r.entries;
    } catch (_) {}
    return [];
  }

  async function _saveUserJsonOrJs(relPath, data, jsPrefix) {
    if (!window.Desktop || !window.Desktop.isElectron()) {
      throw new Error('Desktop API unavailable');
    }
    if (jsPrefix) {
      var content = jsPrefix + JSON.stringify(data, null, 2) + ';\n';
      return window.Desktop.saveText('user', relPath, content);
    }
    return window.Desktop.saveJson('user', relPath, data);
  }

  async function _deleteUserRelPath(relPath) {
    if (!window.Desktop || !window.Desktop.isElectron()) {
      throw new Error('Desktop API unavailable');
    }
    if (typeof window.Desktop.deleteByPath === 'function') {
      return window.Desktop.deleteByPath('user', relPath);
    }
    return window.Desktop.deleteFile('user', relPath);
  }

  function _makeBtn(iconName, label, cls, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fm-health-btn' + (cls ? ' ' + cls : '');
    if (iconName) {
      var img = document.createElement('img');
      img.src = '../assets/icons/' + iconName;
      img.className = 'btn-icon';
      img.alt = '';
      btn.appendChild(img);
    }
    var span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(span);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function _toast(msg, isErr) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, !!isErr);
    }
  }

  async function _applyRelink(iss, targetClass) {
    if (!iss || !targetClass) return;
    if (iss.kindType === 'grade') {
      if (iss.fileData.classId !== undefined || iss.fileData.groupId === undefined) {
        iss.fileData.classId = targetClass.id;
      } else {
        iss.fileData.groupId = targetClass.id;
      }
      if (iss.fileData.className !== undefined) {
        iss.fileData.className = targetClass.name;
      }
      await _saveUserJsonOrJs(iss.fileRel, iss.fileData, iss.jsPrefix);
    } else if (iss.kindType === 'planner') {
      iss.entryRef.classId = targetClass.id;
      if (iss.entryRef.className !== undefined) {
        iss.entryRef.className = targetClass.name;
      }
      await _saveUserJsonOrJs(iss.fileRel, iss.fileData, iss.jsPrefix || 'window.PLANNER_CONFIG = ');
    } else if (iss.kindType === 'constellation') {
      iss.fileData.classId = targetClass.id;
      if (iss.fileData.className !== undefined) {
        iss.fileData.className = targetClass.name;
      }
      await _saveUserJsonOrJs(iss.fileRel, iss.fileData, iss.jsPrefix);
    }
  }

  async function _applyUnlink(iss) {
    if (!iss) return;
    if (iss.kindType === 'planner' && iss.entryRef) {
      delete iss.entryRef.classId;
      await _saveUserJsonOrJs(iss.fileRel, iss.fileData, iss.jsPrefix || 'window.PLANNER_CONFIG = ');
    } else if (iss.kindType === 'constellation' && iss.fileData) {
      delete iss.fileData.classId;
      await _saveUserJsonOrJs(iss.fileRel, iss.fileData, iss.jsPrefix);
    }
  }

  async function _removePlannerEntry(iss) {
    if (!iss || iss.kindType !== 'planner' || !Array.isArray(iss.entryList)) return;
    var idx = iss.entryList.indexOf(iss.entryRef);
    if (idx !== -1) {
      iss.entryList.splice(idx, 1);
      await _saveUserJsonOrJs(iss.fileRel, iss.fileData, iss.jsPrefix || 'window.PLANNER_CONFIG = ');
    }
  }

  window.runFmDataHealthCheck = async function () {
    var summaryEl = document.getElementById('fmHealthSummary');
    var resultsEl = document.getElementById('fmHealthResults');
    if (!summaryEl || !resultsEl) return;

    summaryEl.style.display = 'flex';
    summaryEl.className = 'fm-health-summary';
    summaryEl.innerHTML = '';
    var loadingSpan = document.createElement('span');
    loadingSpan.className = 'fm-health-summary-text';
    loadingSpan.textContent = _tr('fmHealthRunning', 'Scanning data files...');
    summaryEl.appendChild(loadingSpan);
    resultsEl.innerHTML = '';

    var issues = [];
    var stats = { classes: 0, students: 0, gradeFiles: 0, plannerEntries: 0, constellations: 0 };

    // 1. Load master roster
    var rosterRaw = await _readUserFile('class-groups.js');
    var rosterParsed = _parseJsOrJson(rosterRaw, ['CLASS_GROUPS_DATA', 'CLASS_GROUPS', 'classGroups']);
    var classes = [];
    if (Array.isArray(rosterParsed)) {
      classes = rosterParsed;
    } else if (rosterParsed && typeof rosterParsed === 'object') {
      var cgObj = rosterParsed.classGroups || rosterParsed.groups || rosterParsed;
      var cgMeta = rosterParsed.classGroupsMeta || {};
      if (Array.isArray(cgObj)) {
        classes = cgObj;
      } else if (cgObj && typeof cgObj === 'object') {
        Object.keys(cgObj).forEach(function (gName) {
          var meta = cgMeta[gName] || {};
          classes.push({
            id: meta.id || gName,
            name: gName,
            students: Array.isArray(cgObj[gName]) ? cgObj[gName] : []
          });
        });
      }
    }

    var validClassIds = new Set();
    var validStudentIds = new Set();
    var classByName = new Map();
    classes.forEach(function (c) {
      if (!c) return;
      stats.classes++;
      if (c.id) validClassIds.add(String(c.id));
      if (c.name) classByName.set(String(c.name).trim().toLowerCase(), c);
      if (Array.isArray(c.students)) {
        c.students.forEach(function (s) {
          stats.students++;
          if (s && s.id) validStudentIds.add(String(s.id));
        });
      }
    });

    // 2. Scan user/grades/
    var gradeFiles = await _listUserDir('grades');
    for (var g = 0; g < gradeFiles.length; g++) {
      var gName = typeof gradeFiles[g] === 'string' ? gradeFiles[g] : (gradeFiles[g] && gradeFiles[g].name);
      if (!gName || (!gName.endsWith('.json') && !gName.endsWith('.js'))) continue;
      stats.gradeFiles++;
      var gRel = 'grades/' + gName;
      var gRaw = await _readUserFile(gRel);
      var gData = _parseJsOrJson(gRaw, ['GRADE_DATA', 'gradeData']);
      if (!gData || typeof gData !== 'object') {
        if (gRaw && gRaw.trim()) {
          issues.push({
            source: gRel,
            kindType: 'grade',
            isUnreadable: true,
            kind: _tr('fmHealthUnreadableFile', 'Unreadable File'),
            detail: _tr('fmHealthDetailUnreadable', 'Could not parse file contents as valid JSON or JS data.'),
            fileRel: gRel,
            fileName: gName,
            toolPage: 'grade-sheet.html',
            toolLabel: _tr('fmHealthOpenTool_grade', 'Open Grade Sheet'),
            canDelete: true
          });
        }
        continue;
      }
      var cid = gData.classId || gData.groupId || '';
      if (cid && validClassIds.size > 0 && !validClassIds.has(String(cid))) {
        var matchCls = gData.className ? classByName.get(String(gData.className).trim().toLowerCase()) : null;
        var gPrefix = _detectJsGlobalPrefix(gRaw, ['GRADE_DATA', 'gradeData']);
        var canWriteGrade = gName.endsWith('.json') || !!gPrefix;
        issues.push({
          source: gRel,
          kindType: 'grade',
          kind: _tr('fmHealthOrphanGrade', 'Orphaned Class UUID'),
          detail: _trFmt('fmHealthDetailMissingClass', { id: cid }, 'References missing class ID "{id}"') +
            (gData.className ? ' (' + gData.className + ')' : ''),
          canRelink: !!(matchCls && canWriteGrade),
          canPickClass: canWriteGrade && classes.length > 0,
          relinkTarget: matchCls,
          fileRel: gRel,
          fileName: gName,
          fileData: gData,
          jsPrefix: gPrefix,
          toolPage: 'grade-sheet.html',
          toolLabel: _tr('fmHealthOpenTool_grade', 'Open Grade Sheet'),
          canDelete: true
        });
      }
    }

    // 3. Scan planner-config.js
    var plannerRaw = await _readUserFile('planner-config.js');
    var plannerData = _parseJsOrJson(plannerRaw, ['PLANNER_CONFIG', 'plannerConfig']);
    var plannerPrefix = _detectJsGlobalPrefix(plannerRaw, ['PLANNER_CONFIG', 'plannerConfig']) || 'window.PLANNER_CONFIG = ';
    if (plannerData && typeof plannerData === 'object') {
      var entries = Array.isArray(plannerData.entries) ? plannerData.entries
        : (Array.isArray(plannerData.schedule) ? plannerData.schedule : []);
      entries.forEach(function (entry, idx) {
        stats.plannerEntries++;
        if (entry && entry.classId && validClassIds.size > 0 && !validClassIds.has(String(entry.classId))) {
          var pClassName = entry.className || entry.groupName || '';
          var pMatch = pClassName ? classByName.get(String(pClassName).trim().toLowerCase()) : null;
          issues.push({
            source: 'planner-config.js',
            kindType: 'planner',
            kind: _tr('fmHealthOrphanPlanner', 'Orphaned Planner Class UUID'),
            detail: _trFmt('fmHealthDetailPlannerEntry', { num: idx + 1, id: entry.classId }, 'Entry #{num} references missing class ID "{id}"') +
              (pClassName ? ' (' + pClassName + ')' : ''),
            canRelink: !!pMatch,
            canPickClass: classes.length > 0,
            canUnlink: true,
            canRemoveEntry: true,
            relinkTarget: pMatch,
            fileRel: 'planner-config.js',
            fileName: 'planner-config.js',
            fileData: plannerData,
            entryRef: entry,
            entryList: entries,
            jsPrefix: plannerPrefix,
            toolPage: 'planner.html',
            toolLabel: _tr('fmHealthOpenTool_planner', 'Open Planner')
          });
        }
      });
    }

    // 4. Scan constellations/
    var conFiles = await _listUserDir('constellations');
    for (var cIdx = 0; cIdx < conFiles.length; cIdx++) {
      var cName = typeof conFiles[cIdx] === 'string' ? conFiles[cIdx] : (conFiles[cIdx] && conFiles[cIdx].name);
      if (!cName || !cName.endsWith('.json')) continue;
      stats.constellations++;
      var cRel = 'constellations/' + cName;
      var cRaw = await _readUserFile(cRel);
      var cData = _parseJsOrJson(cRaw, []);
      if (!cData || typeof cData !== 'object') {
        if (cRaw && cRaw.trim()) {
          issues.push({
            source: cRel,
            kindType: 'constellation',
            isUnreadable: true,
            kind: _tr('fmHealthUnreadableFile', 'Unreadable File'),
            detail: _tr('fmHealthDetailUnreadable', 'Could not parse file contents as valid JSON or JS data.'),
            fileRel: cRel,
            fileName: cName,
            toolPage: 'board.html',
            toolOpts: { query: { openSession: '1', openTarget: 'user', openFilename: cName, openRelPath: cRel } },
            toolLabel: _tr('fmHealthOpenTool_board', 'Open in Board'),
            canDelete: true
          });
        }
        continue;
      }
      if (cData && cData.classId && validClassIds.size > 0 && !validClassIds.has(String(cData.classId))) {
        var cClassName = cData.className || '';
        var cMatch = cClassName ? classByName.get(String(cClassName).trim().toLowerCase()) : null;
        issues.push({
          source: cRel,
          kindType: 'constellation',
          kind: _tr('fmHealthOrphanConstellation', 'Orphaned Constellation Class UUID'),
          detail: _trFmt('fmHealthDetailMissingClass', { id: cData.classId }, 'References missing class ID "{id}"') +
            (cClassName ? ' (' + cClassName + ')' : ''),
          canRelink: !!cMatch,
          canPickClass: classes.length > 0,
          canUnlink: true,
          relinkTarget: cMatch,
          fileRel: cRel,
          fileName: cName,
          fileData: cData,
          toolPage: 'board.html',
          toolOpts: { query: { openSession: '1', openTarget: 'user', openFilename: cName, openRelPath: cRel } },
          toolLabel: _tr('fmHealthOpenTool_board', 'Open in Board'),
          canDelete: true
        });
      }
    }

    // Render summary banner with actions
    var countMsg = issues.length === 0
      ? _tr('fmHealthAllGood', 'All checked references match the master roster.')
      : _trFmt('fmHealthIssuesFound', { count: issues.length }, issues.length + ' issue(s) found');

    var statsMsg = _trFmt(
      'fmHealthCheckedStats',
      stats,
      'Checked ' + stats.classes + ' classes, ' + stats.students + ' students, ' + stats.gradeFiles + ' grade files, ' + stats.plannerEntries + ' planner entries, ' + stats.constellations + ' constellations.'
    );

    summaryEl.className = 'fm-health-summary ' + (issues.length === 0 ? 'is-ok' : 'is-warn');
    summaryEl.innerHTML = '';

    var summaryTextWrap = document.createElement('div');
    summaryTextWrap.className = 'fm-health-summary-text';
    var summaryTitle = document.createElement('div');
    summaryTitle.className = 'fm-health-summary-title';
    summaryTitle.textContent = countMsg;
    var summaryStats = document.createElement('div');
    summaryStats.className = 'fm-health-summary-stats';
    summaryStats.textContent = statsMsg;
    summaryTextWrap.appendChild(summaryTitle);
    summaryTextWrap.appendChild(summaryStats);
    summaryEl.appendChild(summaryTextWrap);

    var summaryActions = document.createElement('div');
    summaryActions.className = 'fm-health-summary-actions';

    var autoRelinkable = issues.filter(function (i) { return i.canRelink && i.relinkTarget; });
    if (autoRelinkable.length > 0 && window.Desktop && window.Desktop.isElectron()) {
      summaryActions.appendChild(_makeBtn(
        'links.svg',
        _trFmt('fmHealthRelinkAll', { count: autoRelinkable.length }, 'Auto-Relink All (' + autoRelinkable.length + ')'),
        'primary',
        async function () {
          var ok = typeof window.showConfirm === 'function'
            ? await window.showConfirm(_trFmt('fmHealthRelinkAllConfirm', { count: autoRelinkable.length }, 'Automatically relink {count} issue(s) to their matching class names?'))
            : true;
          if (!ok) return;
          var fixed = 0;
          for (var i = 0; i < autoRelinkable.length; i++) {
            try {
              await _applyRelink(autoRelinkable[i], autoRelinkable[i].relinkTarget);
              fixed++;
            } catch (_) {}
          }
          _toast(_trFmt('fmHealthRelinkAllDone', { count: fixed }, 'Relinked ' + fixed + ' item(s).'));
          window.runFmDataHealthCheck();
        }
      ));
    }

    if (window.Desktop && typeof window.Desktop.openTool === 'function') {
      summaryActions.appendChild(_makeBtn(
        'group-editor.svg',
        _tr('fmHealthOpenGroupEditor', 'Open Group Editor'),
        '',
        function () {
          window.Desktop.openTool('group-editor.html');
        }
      ));
    }

    summaryActions.appendChild(_makeBtn(
      'refresh.svg',
      _tr('fmHealthRescan', 'Re-scan'),
      '',
      function () {
        window.runFmDataHealthCheck();
      }
    ));

    summaryEl.appendChild(summaryActions);

    // Render issue cards
    var isElectron = !!(window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron());

    issues.forEach(function (iss) {
      var card = document.createElement('div');
      card.className = 'fm-health-card';

      var main = document.createElement('div');
      main.className = 'fm-health-card-main';

      var title = document.createElement('div');
      title.className = 'fm-health-card-title';
      title.textContent = iss.kind + ' — ' + iss.source;
      main.appendChild(title);

      var desc = document.createElement('div');
      desc.className = 'fm-health-card-desc';
      desc.textContent = iss.detail;
      main.appendChild(desc);

      // Manual class picker row when there is no auto-match or user wants another class
      if (isElectron && iss.canPickClass && classes.length > 0) {
        var relinkRow = document.createElement('div');
        relinkRow.className = 'fm-health-relink-row';

        var select = document.createElement('select');
        select.className = 'fm-health-select';
        var placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = _tr('fmHealthSelectClass', 'Select class to relink...');
        select.appendChild(placeholderOpt);

        classes.forEach(function (cls) {
          if (!cls || !cls.id) return;
          var opt = document.createElement('option');
          opt.value = String(cls.id);
          opt.textContent = cls.name || String(cls.id);
          if (iss.relinkTarget && String(iss.relinkTarget.id) === String(cls.id)) {
            opt.selected = true;
          }
          select.appendChild(opt);
        });

        var applyBtn = _makeBtn('check.svg', _tr('fmHealthApply', 'Relink'), 'success', async function () {
          var chosenId = select.value;
          if (!chosenId) return;
          var targetCls = classes.find(function (c) { return c && String(c.id) === chosenId; });
          if (!targetCls) return;
          try {
            await _applyRelink(iss, targetCls);
            _toast(_tr('fmHealthRelinked', 'Relinked successfully.'));
            window.runFmDataHealthCheck();
          } catch (err) {
            _toast(_tr('fmHealthRelinkFailed', 'Relink failed:') + ' ' + ((err && err.message) || err), true);
          }
        });

        relinkRow.appendChild(select);
        relinkRow.appendChild(applyBtn);
        main.appendChild(relinkRow);
      }

      card.appendChild(main);

      var actions = document.createElement('div');
      actions.className = 'fm-health-card-actions';

      // Quick 1-click Auto-Relink button when exact class name match exists
      if (isElectron && iss.canRelink && iss.relinkTarget) {
        actions.appendChild(_makeBtn(
          'links.svg',
          _tr('fmHealthRelink', 'Relink') + ' -> ' + iss.relinkTarget.name,
          'primary',
          async function () {
            try {
              await _applyRelink(iss, iss.relinkTarget);
              _toast(_tr('fmHealthRelinked', 'Relinked successfully.'));
              window.runFmDataHealthCheck();
            } catch (err) {
              _toast(_tr('fmHealthRelinkFailed', 'Relink failed:') + ' ' + ((err && err.message) || err), true);
            }
          }
        ));
      }

      // Open in corresponding app tool
      if (iss.toolPage && window.Desktop && typeof window.Desktop.openTool === 'function') {
        actions.appendChild(_makeBtn(
          iss.kindType === 'grade' ? 'grade-sheet.svg' : (iss.kindType === 'planner' ? 'planner.svg' : 'board.svg'),
          iss.toolLabel || iss.toolPage,
          '',
          function () {
            window.Desktop.openTool(iss.toolPage, iss.toolOpts || undefined);
          }
        ));
      }

      // Open file in OS default editor
      if (isElectron && iss.fileRel && typeof window.Desktop.openNative === 'function') {
        actions.appendChild(_makeBtn(
          'external-link.svg',
          _tr('fmHealthOpenFile', 'Open File'),
          '',
          async function () {
            var res = await window.Desktop.openNative('user', iss.fileRel);
            if (res && res.ok === false) {
              _toast(_tr('fmOpenNativeFailed', 'Could not open file.'), true);
            }
          }
        ));
      }

      // Show in folder
      if (isElectron && iss.fileRel && typeof window.Desktop.showInFolder === 'function') {
        actions.appendChild(_makeBtn(
          'folder-open.svg',
          _tr('fmHealthShowInFolder', 'Show in Folder'),
          '',
          function () {
            window.Desktop.showInFolder('user', iss.fileRel);
          }
        ));
      }

      // Unlink class reference (planner entry / constellation)
      if (isElectron && iss.canUnlink) {
        actions.appendChild(_makeBtn(
          'clear.svg',
          _tr('fmHealthUnlink', 'Unlink Class'),
          '',
          async function () {
            try {
              await _applyUnlink(iss);
              _toast(_tr('fmHealthUnlinked', 'Class reference removed.'));
              window.runFmDataHealthCheck();
            } catch (err) {
              _toast(_tr('fmHealthActionFailed', 'Action failed:') + ' ' + ((err && err.message) || err), true);
            }
          }
        ));
      }

      // Remove planner entry
      if (isElectron && iss.canRemoveEntry) {
        actions.appendChild(_makeBtn(
          'trash.svg',
          _tr('fmHealthRemoveEntry', 'Remove Entry'),
          'danger',
          async function () {
            var ok = typeof window.showConfirm === 'function'
              ? await window.showConfirm(_tr('fmHealthRemoveEntryConfirm', 'Remove this orphaned entry from planner-config.js?'))
              : true;
            if (!ok) return;
            try {
              await _removePlannerEntry(iss);
              _toast(_tr('fmHealthEntryRemoved', 'Planner entry removed.'));
              window.runFmDataHealthCheck();
            } catch (err) {
              _toast(_tr('fmHealthActionFailed', 'Action failed:') + ' ' + ((err && err.message) || err), true);
            }
          }
        ));
      }

      // Delete orphaned/corrupted file
      if (isElectron && iss.canDelete && iss.fileRel) {
        actions.appendChild(_makeBtn(
          'trash.svg',
          _tr('fmHealthDeleteFile', 'Delete File'),
          'danger',
          async function () {
            var ok = typeof window.showConfirm === 'function'
              ? await window.showConfirm(_trFmt('fmHealthDeleteConfirm', { file: iss.fileRel }, 'Permanently delete "' + iss.fileRel + '"? This cannot be undone.'))
              : true;
            if (!ok) return;
            try {
              await _deleteUserRelPath(iss.fileRel);
              _toast(_tr('fmHealthDeleted', 'File deleted.'));
              window.runFmDataHealthCheck();
            } catch (err) {
              _toast(_tr('fmHealthActionFailed', 'Action failed:') + ' ' + ((err && err.message) || err), true);
            }
          }
        ));
      }

      card.appendChild(actions);
      resultsEl.appendChild(card);
    });
  };
})();
