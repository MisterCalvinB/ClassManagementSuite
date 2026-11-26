// Global Quick Switcher (Ctrl+K / Cmd+K) across all Class Management Tools windows.
(function () {
  'use strict';

  if (window._cmtQuickSwitcher) return;
  window._cmtQuickSwitcher = true;

  function _t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      var val = window.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _assetPrefix() {
    return (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) ? '../assets/icons/' : 'assets/icons/';
  }

  function _pageHref(href) {
    var isInPages = typeof location !== 'undefined' && /\/pages\//.test(location.pathname);
    if (href === 'launcher.html') return isInPages ? '../launcher.html' : 'launcher.html';
    return isInPages ? href : 'pages/' + href;
  }

  function _openTarget(url, query) {
    var rawUrl = String(url || '');
    var qIdx = rawUrl.indexOf('?');
    var pageFile = (qIdx !== -1 ? rawUrl.slice(0, qIdx) : rawUrl).split('/').pop();
    var mergedQuery = {};
    if (qIdx !== -1) {
      try {
        var inlineParams = new URLSearchParams(rawUrl.slice(qIdx + 1));
        inlineParams.forEach(function (v, k) {
          mergedQuery[k] = v;
        });
      } catch (_) { }
    }
    if (query && typeof query === 'object') {
      Object.keys(query).forEach(function (k) {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          mergedQuery[k] = query[k];
        }
      });
    }
    var hasQuery = Object.keys(mergedQuery).length > 0;
    if (window.Desktop && typeof window.Desktop.openTool === 'function') {
      window.Desktop.openTool(pageFile, hasQuery ? { query: mergedQuery } : undefined);
    } else if (window.electronBridge && typeof window.electronBridge.openTool === 'function') {
      window.electronBridge.openTool(pageFile, hasQuery ? { query: mergedQuery } : undefined);
    } else if (window.electronApi && typeof window.electronApi.openTool === 'function') {
      var req = { pageFile: pageFile };
      if (hasQuery) req.query = mergedQuery;
      window.electronApi.openTool(req);
    } else {
      var targetUrl = qIdx !== -1 ? rawUrl.slice(0, qIdx) : rawUrl;
      if (hasQuery) {
        var sp = new URLSearchParams();
        Object.keys(mergedQuery).forEach(function (k) {
          sp.set(k, String(mergedQuery[k]));
        });
        var qs = sp.toString();
        if (qs) targetUrl += '?' + qs;
      }
      window.location.href = targetUrl;
    }
  }

  function _injectStyles() {
    if (document.getElementById('cmt-qs-styles')) return;
    var s = document.createElement('style');
    s.id = 'cmt-qs-styles';
    s.textContent = [
      '.cmt-qs-backdrop{position:fixed;inset:0;background:rgba(20,20,20,0.45);z-index:100500;display:none;align-items:flex-start;justify-content:center;padding-top:10vh;box-sizing:border-box}',
      '.cmt-qs-backdrop.open{display:flex}',
      '.cmt-qs-modal{width:min(640px,92vw);background:#f5f5f0;border:2px solid #333333;border-radius:10px;box-shadow:4px 4px 0 #555555;overflow:hidden;font-family:"Lexend",system-ui,-apple-system,sans-serif;color:#222222}',
      '.cmt-qs-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#ffffff;border-bottom:2px solid #333333}',
      '.cmt-qs-head img{width:18px;height:18px;flex-shrink:0}',
      '.cmt-qs-input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:0.98rem;font-weight:600;color:#222222;min-width:0}',
      '.cmt-qs-kbd{font-size:0.72rem;font-weight:700;padding:2px 6px;border:1.5px solid #333333;border-radius:4px;background:#f5f5f0;color:#333333}',
      '.cmt-qs-list{max-height:52vh;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px}',
      '.cmt-qs-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:2px solid transparent;border-radius:6px;background:transparent;cursor:pointer;text-align:left;font-family:inherit;color:#222222;width:100%;box-sizing:border-box;transition:background-color 0.1s ease,border-color 0.1s ease}',
      '.cmt-qs-item:hover,.cmt-qs-item.active{background:#ffffff;border-color:#333333;box-shadow:2px 2px 0 #555555}',
      '.cmt-qs-item img{width:18px;height:18px;flex-shrink:0}',
      '.cmt-qs-item-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
      '.cmt-qs-item-title{font-size:0.88rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cmt-qs-item-sub{font-size:0.74rem;color:#555555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cmt-qs-badge{font-size:0.68rem;font-weight:800;text-transform:uppercase;padding:2px 7px;border:1.5px solid #333333;border-radius:4px;background:#e2c96e;color:#222222;flex-shrink:0}',
      '.cmt-qs-badge.cat-class{background:#6abf8e}',
      '.cmt-qs-badge.cat-student{background:#5b8fcc;color:#ffffff}',
      '.cmt-qs-badge.cat-doc{background:#d4895a;color:#ffffff}',
      '.cmt-qs-badge.cat-board{background:#8b7cc2;color:#ffffff}',
      '.cmt-qs-badge.cat-print{background:#c96b6b;color:#ffffff}',
      '.cmt-qs-badge.cat-word{background:#5a9a9e;color:#ffffff}',
      '.cmt-qs-empty{padding:24px 12px;text-align:center;color:#555555;font-size:0.86rem;font-weight:600}',
      '.cmt-qs-actions{display:inline-flex;align-items:center;gap:4px;flex-shrink:0}',
      '.cmt-qs-act-btn{font-family:inherit;font-size:0.68rem;font-weight:800;padding:2px 7px;border:1.5px solid #333333;border-radius:4px;background:#fafaf7;color:#222222;cursor:pointer;white-space:nowrap}',
      '.cmt-qs-act-btn:hover{background:#e2c96e}',
      '.cmt-qs-subhead{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#e2c96e;border:2px solid #333333;border-radius:6px;font-size:0.82rem;font-weight:800;margin-bottom:4px}',
      '.cmt-qs-foot{padding:8px 14px;background:#ffffff;border-top:2px solid #333333;font-size:0.74rem;font-weight:600;color:#555555;display:flex;justify-content:space-between;align-items:center}'
    ].join('');
    document.head.appendChild(s);
  }

  var _backdrop = null;
  var _input = null;
  var _listEl = null;
  var _items = [];
  var _filtered = [];
  var _activeIdx = 0;
  var _loadedDynamic = false;
  var _actionTarget = null;
  var _savedQuery = '';
  var _dictItems = [];
  var _dictQuery = '';
  var _dictTimer = null;
  var _dictSeq = 0;
  var _dictInitPromise = null;

  function _openDictionaryWord(word) {
    var q = typeof word === 'string' ? word.trim() : '';
    if (window.electronBridge && typeof window.electronBridge.openDictionary === 'function') {
      window.electronBridge.openDictionary(q);
      return;
    }
    if (window.Desktop && typeof window.Desktop.openDictionary === 'function') {
      window.Desktop.openDictionary(q);
      return;
    }
    try {
      var bc = new BroadcastChannel('cmt-dictionary');
      bc.postMessage({ type: 'search', q: q });
      bc.close();
    } catch (_) { }
    if (window.electronApi && typeof window.electronApi.openHtml === 'function') {
      window.electronApi.openHtml({
        file: 'dictionary.html',
        query: q ? { q: q } : undefined,
        width: 880,
        height: 680,
        reuseId: 'dictionary'
      });
    } else {
      window.open(_pageHref('dictionary.html') + (q ? '?q=' + encodeURIComponent(q) : ''), 'cmt_quick_dictionary');
    }
  }

  function _ensureDictBanksReady() {
    var api = window.electronApi;
    if (!api || !api.isElectron || typeof api.dictionarySearch !== 'function') {
      return Promise.resolve(false);
    }
    if (_dictInitPromise) return _dictInitPromise;
    _dictInitPromise = (async function () {
      try {
        if (typeof api.dictionaryListBanks !== 'function' || typeof api.dictionarySetBanks !== 'function') {
          return true;
        }
        var res = await api.dictionaryListBanks();
        if (!res || !res.ok || !Array.isArray(res.banks) || res.banks.length === 0) {
          return false;
        }
        var st = res.status || {};
        if (st.state === 'ready' && Array.isArray(st.selected) && st.selected.length > 0) {
          return true;
        }
        var offSet = new Set();
        try {
          var rawOff = JSON.parse(localStorage.getItem('cmt-dict-banks-off') || '[]');
          if (Array.isArray(rawOff)) rawOff.forEach(function (n) { offSet.add(n); });
        } catch (_) { }
        var enabled = res.banks.map(function (b) { return b.name; }).filter(function (n) { return !offSet.has(n); });
        if (enabled.length === 0) return false;
        await api.dictionarySetBanks({ banks: enabled });
        return true;
      } catch (_) {
        return false;
      }
    })();
    return _dictInitPromise;
  }

  function _scheduleDictSearch(rawQuery) {
    clearTimeout(_dictTimer);
    var q = String(rawQuery || '').trim();
    if (_actionTarget || q.length < 2) {
      _dictSeq++;
      _dictItems = [];
      _dictQuery = '';
      return;
    }
    var api = window.electronApi;
    if (!api || !api.isElectron || typeof api.dictionarySearch !== 'function') return;
    var seq = ++_dictSeq;
    _dictTimer = setTimeout(async function () {
      var ready = await _ensureDictBanksReady();
      if (!ready || seq !== _dictSeq) return;
      try {
        var payload = await api.dictionarySearch({ q: q, scope: 'word', limit: 25 });
        if (seq !== _dictSeq) return;
        var results = (payload && payload.ok && Array.isArray(payload.results)) ? payload.results : [];
        var seen = Object.create(null);
        var mapped = [];
        results.forEach(function (entry) {
          if (!entry || !entry.word) return;
          var key = entry.word.toLowerCase() + '::' + (entry.pos || '');
          if (seen[key]) return;
          seen[key] = true;
          var subParts = [];
          if (entry.pos) subParts.push('[' + entry.pos + ']');
          if (entry.definition) subParts.push(entry.definition);
          else if (entry.bank) subParts.push(entry.bank);
          mapped.push({
            id: 'word:' + key,
            cat: 'word',
            catLabel: _t('qsCatWord', 'Word'),
            title: entry.word,
            sub: subParts.join(' '),
            icon: 'dictionary.svg',
            word: entry.word,
            onSelect: function () {
              _openDictionaryWord(entry.word);
            }
          });
        });
        _dictItems = mapped;
        _dictQuery = q.toLowerCase();
        if (_backdrop && _backdrop.classList.contains('open') && !_actionTarget) {
          _renderList(_input ? _input.value : '');
        }
      } catch (_) { }
    }, 120);
  }

  function _getTargetActions(target) {
    var isStudent = target.cat === 'student';
    var studentName = isStudent ? target.title : '';
    var studentId = isStudent ? (target.studentId || '') : '';
    var className = isStudent ? target.sub : target.title;
    var classId = target.classId || '';
    var list = [
      { label: 'Participation Tracker', icon: 'participation-tracker.svg', href: 'participation-tracker.html', mode: 'tracker' },
      { label: 'Grade Sheet', icon: 'grade-sheet.svg', href: 'grade-sheet.html', mode: 'grades' },
      { label: _t('qsActionDossier', '360 Dossier'), icon: 'links.svg', href: 'file-manager.html', mode: 'dossier' },
      { label: 'Competence Portfolio', icon: 'competence-portfolio.svg', href: 'competence-portfolio.html', mode: 'portfolio' },
      { label: 'Oral Marking', icon: 'oral-marking.svg', href: 'oral-marking.html', mode: 'oral' },
      { label: 'Group Editor', icon: 'group-editor.svg', href: 'group-editor.html', mode: 'groups' }
    ];
    return list.map(function (a) {
      return {
        id: 'act:' + a.mode,
        cat: 'tool',
        catLabel: a.mode,
        title: a.label,
        sub: (studentName ? studentName + ' — ' : '') + className,
        icon: a.icon,
        url: _pageHref(a.href),
        mode: a.mode,
        studentName: studentName,
        studentId: studentId,
        className: className,
        classId: classId
      };
    });
  }

  function _launchAction(act) {
    try {
      localStorage.setItem('cmt-qs-context', JSON.stringify({
        student: act.studentName || '',
        studentId: act.studentId || '',
        className: act.className || '',
        classId: act.classId || '',
        mode: act.mode || '',
        ts: Date.now()
      }));
      if (act.mode === 'dossier') {
        localStorage.setItem('cmt-qs-target-dossier', act.studentName || act.className || '');
      }
    } catch (_) { }
    var query = {};
    if (act.classId) query.classId = act.classId;
    if (act.className) query.className = act.className;
    if (act.studentId) query.studentId = act.studentId;
    if (act.studentName) query.studentName = act.studentName;
    _close();
    _openTarget(act.url, Object.keys(query).length > 0 ? query : null);
  }

  function _normalizeRoster(rawData, rawMeta) {
    var out = [];
    if (Array.isArray(rawData)) {
      rawData.forEach(function (cls) {
        if (cls && cls.name) out.push(cls);
      });
      return out;
    }
    if (rawData && typeof rawData === 'object') {
      Object.keys(rawData).forEach(function (groupName) {
        var students = Array.isArray(rawData[groupName]) ? rawData[groupName] : [];
        var meta = (rawMeta && rawMeta[groupName]) || {};
        out.push({
          id: meta.id || groupName,
          name: groupName,
          students: students
        });
      });
    }
    return out;
  }

  function _extractJsObject(txt, varName) {
    var re = new RegExp('(?:const|let|var|window\\.)\\s*' + varName + '\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*;');
    var m = txt.match(re);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (_) { return null; }
  }

  function _parseRosterText(txt) {
    if (!txt || typeof txt !== 'string') return [];
    try {
      var trimmed = txt.trim();
      if (trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{') {
        var parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.classGroups) return _normalizeRoster(parsed.classGroups, parsed.classGroupsMeta);
        return _normalizeRoster(parsed.groups || parsed.classes || parsed, null);
      }
      // CSP-safe extraction first (no eval / new Function required)
      var dataObj = _extractJsObject(txt, 'CLASS_GROUPS_DATA');
      if (dataObj && dataObj.classGroups) {
        return _normalizeRoster(dataObj.classGroups, dataObj.classGroupsMeta);
      }
      var cgObj = _extractJsObject(txt, 'CLASS_GROUPS');
      var cgMeta = _extractJsObject(txt, 'CLASS_GROUPS_META');
      if (cgObj) {
        return _normalizeRoster(cgObj, cgMeta);
      }
      // Fallback for non-JSON JS files on pages with unsafe-eval
      var fn = new Function(
        txt +
        '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA' +
        ' : { classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : (window.CLASS_GROUPS || null)),' +
        ' classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : (window.CLASS_GROUPS_META || null)) };'
      );
      var res = fn();
      if (Array.isArray(res)) return res;
      if (res && res.classGroups) return _normalizeRoster(res.classGroups, res.classGroupsMeta);
      return _normalizeRoster(res, null);
    } catch (_) {
      return [];
    }
  }

  async function _readUserText(relPath) {
    try {
      if (window.Desktop && typeof window.Desktop.readText === 'function') {
        var r = await window.Desktop.readText('user', relPath);
        if (r && r.ok && typeof r.content === 'string') return r.content;
      }
      if (window.electronApi && typeof window.electronApi.readFile === 'function') {
        var r2 = await window.electronApi.readFile({ target: 'user', filename: relPath, encoding: 'utf8' });
        if (r2 && r2.ok && typeof r2.content === 'string') return r2.content;
      }
      if (typeof fetch === 'function') {
        var prefix = (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) ? '../user/' : 'user/';
        var resp = await fetch(prefix + relPath);
        if (resp && resp.ok) return await resp.text();
      }
    } catch (_) { }
    return '';
  }

  function _normalizeSearchText(str) {
    var s = String(str || '').toLowerCase();
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return s;
  }

  function _matchesQuery(haystack, query) {
    var q = _normalizeSearchText(query).trim();
    if (!q) return true;
    var h = _normalizeSearchText(haystack);
    var tokens = q.split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] && h.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  async function _listUserSubdir(subdir) {
    try {
      var res = null;
      if (window.Desktop && typeof window.Desktop.listByPath === 'function') {
        res = await window.Desktop.listByPath('user', subdir, { recursive: true });
      } else if (window.electronApi && typeof window.electronApi.listByPath === 'function') {
        res = await window.electronApi.listByPath({ target: 'user', relativePath: subdir, recursive: true });
      }
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.files)) return res.files;
      if (res && Array.isArray(res.entries)) return res.entries;
    } catch (_) { }
    return [];
  }

  async function _collectDynamicItems(force) {
    if (_loadedDynamic && !force) return;
    _loadedDynamic = true;
    var nextDynamic = [];

    // 1. In Electron, use the dedicated cross-page read-only IPC index
    var classes = [];
    var docFiles = [];
    var conFiles = [];
    var printFiles = [];
    var customExportRoots = [];

    if (window.electronApi && typeof window.electronApi.quickSwitcherIndex === 'function') {
      try {
        var idx = await window.electronApi.quickSwitcherIndex();
        if (idx && idx.ok) {
          if (Array.isArray(idx.classes) && idx.classes.length > 0) {
            classes = idx.classes;
          } else if (idx.rosterText) {
            classes = _parseRosterText(idx.rosterText);
          }
          if (Array.isArray(idx.documents)) docFiles = idx.documents;
          if (Array.isArray(idx.constellations)) conFiles = idx.constellations;
          if (Array.isArray(idx.toPrint)) printFiles = idx.toPrint;
          if (Array.isArray(idx.customExportFiles)) customExportRoots = idx.customExportFiles;
        }
      } catch (_) { }
    }

    // 2. Fallbacks (LinksService, browser mode, or in-memory globals)
    if (classes.length === 0 && window.LinksService && typeof window.LinksService.ensureRosterLoaded === 'function') {
      try { await window.LinksService.ensureRosterLoaded(); } catch (_) { }
    }
    if (classes.length === 0) {
      try {
        var rosterTxt = await _readUserText('class-groups.js');
        if (rosterTxt) classes = _parseRosterText(rosterTxt);
      } catch (_) { }
    }
    if (classes.length === 0 && (window.CLASS_GROUPS_DATA || window.CLASS_GROUPS)) {
      var cg = (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroups) || window.CLASS_GROUPS;
      var cgm = (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta) || window.CLASS_GROUPS_META;
      classes = _normalizeRoster(cg, cgm);
    }
    if (Array.isArray(window.STUDENTS_ROSTER) && window.STUDENTS_ROSTER.length > 0) {
      var extraStudents = window.STUDENTS_ROSTER.map(function (st) {
        if (!st) return null;
        var nm = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || '').trim();
        var grp = (st.enrollments && st.enrollments[0] && st.enrollments[0].groupName) || st.adminClass || 'Students';
        return nm ? { id: st.uuid || st.id || nm, name: nm, group: grp } : null;
      }).filter(Boolean);
      if (extraStudents.length > 0 && classes.length === 0) {
        var byGrp = {};
        extraStudents.forEach(function (es) {
          if (!byGrp[es.group]) {
            byGrp[es.group] = { id: es.group, name: es.group, students: [] };
            classes.push(byGrp[es.group]);
          }
          byGrp[es.group].students.push({ id: es.id, name: es.name });
        });
      }
    }
    if (classes.length === 0 && typeof localStorage !== 'undefined') {
      classes = _parseRosterText(localStorage.getItem('cmt-class-groups') || '');
    }

    var seenStudents = Object.create(null);
    classes.forEach(function (cls) {
      if (!cls || !cls.name) return;
      nextDynamic.push({
        id: 'cls:' + (cls.id || cls.name),
        cat: 'class',
        catLabel: _t('qsCatClass', 'Class'),
        title: cls.name,
        sub: (Array.isArray(cls.students) ? cls.students.length : 0) + ' students',
        icon: 'group-editor.svg',
        url: _pageHref('grade-sheet.html'),
        classId: cls.id || cls.name,
        className: cls.name
      });
      if (Array.isArray(cls.students)) {
        cls.students.forEach(function (stu) {
          var sName = typeof stu === 'string'
            ? stu
            : (stu && (stu.name || [stu.firstName, stu.lastName].filter(Boolean).join(' ')));
          if (!sName) return;
          var stuKey = cls.name + '::' + sName;
          if (seenStudents[stuKey]) return;
          seenStudents[stuKey] = true;
          nextDynamic.push({
            id: 'stu:' + (cls.id || cls.name) + ':' + ((stu && stu.id) || sName),
            cat: 'student',
            catLabel: _t('qsCatStudent', 'Student'),
            title: sName,
            sub: cls.name,
            icon: 'participation-tracker.svg',
            url: _pageHref('participation-tracker.html'),
            classId: cls.id || cls.name,
            className: cls.name,
            studentId: (stu && (stu.id || stu.uuid)) || '',
            studentName: sName
          });
        });
      }
    });

    if (docFiles.length === 0) docFiles = await _listUserSubdir('document-editor/docs');
    docFiles.forEach(function (f) {
      var rawPath = typeof f === 'string' ? f : (f && (f.relativePath || f.name || f.filename));
      if (!rawPath) return;
      var relPath = String(rawPath).replace(/\\/g, '/');
      if (/(^|\/)(history|trash|backups|node_modules)(\/|$)/i.test(relPath)) return;
      var fileName = relPath.split('/').pop();
      nextDynamic.push({
        id: 'doc:' + relPath,
        cat: 'doc',
        catLabel: _t('qsCatDoc', 'Document'),
        title: fileName,
        sub: 'user/document-editor/docs/' + relPath,
        icon: 'document-editor.svg',
        url: _pageHref('document-editor.html') + '?editTarget=docEditorDocs&editRelPath=' + encodeURIComponent(relPath)
      });
    });

    if (conFiles.length === 0) conFiles = await _listUserSubdir('constellations');
    conFiles.forEach(function (f) {
      var rawPath = typeof f === 'string' ? f : (f && (f.relativePath || f.name || f.filename));
      if (!rawPath) return;
      var relPath = String(rawPath).replace(/\\/g, '/');
      if (/(^|\/)(history|trash|backups|node_modules)(\/|$)/i.test(relPath)) return;
      var fileName = relPath.split('/').pop();
      nextDynamic.push({
        id: 'con:' + relPath,
        cat: 'board',
        catLabel: _t('qsCatBoard', 'Constellation'),
        title: fileName,
        sub: 'user/constellations/' + relPath,
        icon: 'board.svg',
        url: _pageHref('board.html') + '?openSession=1&openTarget=constellations&openFilename=' + encodeURIComponent(fileName) + '&openRelPath=' + encodeURIComponent(relPath)
      });
    });

    if (printFiles.length === 0) printFiles = await _listUserSubdir('to-print');
    printFiles.forEach(function (f) {
      var rawPath = typeof f === 'string' ? f : (f && (f.relativePath || f.name || f.filename));
      if (!rawPath) return;
      var relPath = String(rawPath).replace(/\\/g, '/');
      if (/(^|\/)(history|trash|backups|node_modules)(\/|$)/i.test(relPath)) return;
      var fileName = relPath.split('/').pop();
      var printItem = {
        id: 'print:' + relPath,
        cat: 'print',
        catLabel: _t('qsCatPrint', 'To-Print'),
        title: fileName,
        sub: 'user/to-print/' + relPath,
        icon: 'printer.svg'
      };
      if (/\.pdf$/i.test(fileName)) {
        printItem.url = _pageHref('pdf-viewer.html') + '?openTarget=toPrint&openRelPath=' + encodeURIComponent(relPath);
      } else if (/\.(md|markdown|html|htm|txt)$/i.test(fileName)) {
        printItem.url = _pageHref('document-editor.html') + '?editTarget=toPrint&editRelPath=' + encodeURIComponent(relPath);
      } else {
        printItem.onSelect = function () {
          if (window.Desktop && typeof window.Desktop.openNative === 'function') {
            window.Desktop.openNative('toPrint', relPath);
          } else if (window.electronApi && typeof window.electronApi.openNative === 'function') {
            window.electronApi.openNative({ target: 'toPrint', relativePath: relPath });
          } else {
            _openTarget(_pageHref('file-manager.html'));
          }
        };
      }
      nextDynamic.push(printItem);
    });

    customExportRoots.forEach(function (root) {
      if (!root || !Array.isArray(root.files)) return;
      var rTarget = root.target || ('exportRoot:' + root.id);
      var rLabel = root.label || root.folderName || 'Export';
      var rFolder = root.folderName || root.id;
      root.files.forEach(function (f) {
        var rawPath = typeof f === 'string' ? f : (f && (f.relativePath || f.name || f.filename));
        if (!rawPath) return;
        var relPath = String(rawPath).replace(/\\/g, '/');
        if (/(^|\/)(history|trash|backups|node_modules)(\/|$)/i.test(relPath)) return;
        var fileName = relPath.split('/').pop();
        var item = {
          id: 'exproot:' + root.id + ':' + relPath,
          cat: 'print',
          catLabel: rLabel,
          title: fileName,
          sub: 'user/' + rFolder + '/' + relPath,
          icon: 'folder.svg'
        };
        if (/\.pdf$/i.test(fileName)) {
          item.url = _pageHref('pdf-viewer.html') + '?openTarget=' + encodeURIComponent(rTarget) + '&openRelPath=' + encodeURIComponent(relPath);
        } else if (/\.(md|markdown|html|htm|txt)$/i.test(fileName)) {
          item.url = _pageHref('document-editor.html') + '?editTarget=' + encodeURIComponent(rTarget) + '&editRelPath=' + encodeURIComponent(relPath);
        } else {
          item.onSelect = function () {
            if (window.Desktop && typeof window.Desktop.openNative === 'function') {
              window.Desktop.openNative(rTarget, relPath);
            } else if (window.electronApi && typeof window.electronApi.openNative === 'function') {
              window.electronApi.openNative({ target: rTarget, relativePath: relPath });
            } else {
              _openTarget(_pageHref('file-manager.html'));
            }
          };
        }
        nextDynamic.push(item);
      });
    });

    _seedTools();
    _items = _items.concat(nextDynamic);

    if (_backdrop && _backdrop.classList.contains('open')) {
      _renderList(_input ? _input.value : '');
    }
  }

  function _seedTools() {
    _items = [];
    _items.push({
      id: 'action:window-helper',
      cat: 'tool',
      catLabel: _t('qsCatTool', 'Tool'),
      title: _t('wh_title', 'Window Reorder Helper'),
      sub: 'Ctrl+Shift+W',
      icon: 'layout.svg',
      onSelect: function () {
        if (window.WindowHelper && typeof window.WindowHelper.open === 'function') {
          window.WindowHelper.open();
        }
      }
    });
    _items.push({
      id: 'action:audit-console',
      cat: 'tool',
      catLabel: _t('qsCatTool', 'Tool'),
      title: _t('auditTitle', 'Audit Console'),
      sub: _t('auditSubtitle', 'Live diagnostic stream (Main, IPC, Renderers, Sync, I/O, Server)'),
      icon: 'zap.svg',
      onSelect: function () {
        if (window.Desktop && typeof window.Desktop.auditOpenConsole === 'function') {
          window.Desktop.auditOpenConsole();
        }
      }
    });
    var apps = Array.isArray(window.CMT_APPS) ? window.CMT_APPS : [];
    apps.forEach(function (app) {
      if (!app || !app.href) return;
      _items.push({
        id: 'tool:' + app.href,
        cat: 'tool',
        catLabel: _t('qsCatTool', 'Tool'),
        title: app.label,
        sub: app.href,
        icon: app.icon || 'launcher.svg',
        url: _pageHref(app.href)
      });
    });
  }

  function _renderList(query) {
    if (!_listEl) return;
    var q = String(query || '').trim().toLowerCase();
    var prefix = _assetPrefix();

    if (_actionTarget) {
      var allActs = _getTargetActions(_actionTarget);
      _filtered = !q ? allActs : allActs.filter(function (a) {
        return _matchesQuery(a.title + ' ' + a.sub, q);
      });
      if (_activeIdx >= _filtered.length) _activeIdx = 0;
      _listEl.innerHTML = '';

      var subhead = document.createElement('div');
      subhead.className = 'cmt-qs-subhead';
      var titleSpan = document.createElement('span');
      var hdrKey = _actionTarget.cat === 'student' ? 'qsOpenStudentWith' : 'qsOpenClassWith';
      var hdrTpl = _t(hdrKey, 'Open {name} with...');
      titleSpan.textContent = hdrTpl.replace('{name}', _actionTarget.title);
      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'cmt-qs-act-btn';
      backBtn.textContent = _t('qsActionBack', 'Back to search');
      backBtn.addEventListener('click', function () {
        _actionTarget = null;
        _activeIdx = 0;
        if (_input) {
          _input.value = _savedQuery;
          _input.focus();
        }
        _renderList(_savedQuery);
      });
      subhead.appendChild(titleSpan);
      subhead.appendChild(backBtn);
      _listEl.appendChild(subhead);

      _filtered.forEach(function (act, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cmt-qs-item' + (idx === _activeIdx ? ' active' : '');
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', idx === _activeIdx ? 'true' : 'false');

        var img = document.createElement('img');
        img.src = prefix + act.icon;
        img.alt = '';

        var main = document.createElement('div');
        main.className = 'cmt-qs-item-main';
        var tEl = document.createElement('div');
        tEl.className = 'cmt-qs-item-title';
        tEl.textContent = act.title;
        var sEl = document.createElement('div');
        sEl.className = 'cmt-qs-item-sub';
        sEl.textContent = act.sub;
        main.appendChild(tEl);
        main.appendChild(sEl);

        btn.appendChild(img);
        btn.appendChild(main);
        btn.addEventListener('click', function () {
          _launchAction(act);
        });
        _listEl.appendChild(btn);
      });
      return;
    }

    if (!q) {
      var tools = _items.filter(function (it) { return it.cat === 'tool'; }).slice(0, 10);
      var classes = _items.filter(function (it) { return it.cat === 'class'; });
      var students = _items.filter(function (it) { return it.cat === 'student'; }).slice(0, 15);
      var files = _items.filter(function (it) { return it.cat === 'doc' || it.cat === 'board' || it.cat === 'print'; }).slice(0, 10);
      _filtered = tools.concat(classes, students, files);
    } else {
      var localMatches = _items.filter(function (it) {
        return _matchesQuery(it.title + ' ' + it.sub + ' ' + it.catLabel, q);
      }).slice(0, 50);
      var dictMatches = (q.length >= 2 && _dictQuery === q) ? _dictItems : [];
      _filtered = localMatches.concat(dictMatches);
    }

    if (_activeIdx >= _filtered.length) _activeIdx = 0;

    _listEl.innerHTML = '';
    if (_filtered.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'cmt-qs-empty';
      empty.textContent = _t('qsEmpty', 'No matching tools, classes, students, files, or words.');
      _listEl.appendChild(empty);
      return;
    }

    _filtered.forEach(function (item, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cmt-qs-item' + (idx === _activeIdx ? ' active' : '');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', idx === _activeIdx ? 'true' : 'false');

      var img = document.createElement('img');
      img.src = prefix + item.icon;
      img.alt = '';

      var main = document.createElement('div');
      main.className = 'cmt-qs-item-main';
      var tEl = document.createElement('div');
      tEl.className = 'cmt-qs-item-title';
      tEl.textContent = item.title;
      var sEl = document.createElement('div');
      sEl.className = 'cmt-qs-item-sub';
      sEl.textContent = item.sub;
      main.appendChild(tEl);
      main.appendChild(sEl);

      btn.appendChild(img);
      btn.appendChild(main);

      if (item.cat === 'student' || item.cat === 'class') {
        var actsWrap = document.createElement('span');
        actsWrap.className = 'cmt-qs-actions';
        var quickDefs = [
          { short: 'Grades', href: 'grade-sheet.html', mode: 'grades' },
          { short: 'Tracker', href: 'participation-tracker.html', mode: 'tracker' },
          { short: '360°', href: 'file-manager.html', mode: 'dossier' }
        ];
        quickDefs.forEach(function (qd) {
          var qBtn = document.createElement('span');
          qBtn.className = 'cmt-qs-act-btn';
          qBtn.textContent = qd.short;
          qBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            _launchAction({
              url: _pageHref(qd.href),
              mode: qd.mode,
              studentName: item.cat === 'student' ? item.title : '',
              studentId: item.cat === 'student' ? (item.studentId || '') : '',
              className: item.cat === 'student' ? item.sub : item.title,
              classId: item.classId || ''
            });
          });
          actsWrap.appendChild(qBtn);
        });
        btn.appendChild(actsWrap);
      }

      var badge = document.createElement('span');
      badge.className = 'cmt-qs-badge cat-' + item.cat;
      badge.textContent = item.catLabel;
      btn.appendChild(badge);

      btn.addEventListener('click', function () {
        if (item.cat === 'student' || item.cat === 'class') {
          _savedQuery = _input ? _input.value : '';
          _actionTarget = item;
          _activeIdx = 0;
          if (_input) _input.value = '';
          _renderList('');
          if (_input) _input.focus();
          return;
        }
        _close();
        if (typeof item.onSelect === 'function') {
          item.onSelect();
        } else {
          _openTarget(item.url);
        }
      });
      _listEl.appendChild(btn);
    });
  }

  function _ensureModal() {
    if (_backdrop) return;
    _injectStyles();

    _backdrop = document.createElement('div');
    _backdrop.className = 'cmt-qs-backdrop';
    _backdrop.setAttribute('role', 'dialog');
    _backdrop.setAttribute('aria-modal', 'true');
    _backdrop.setAttribute('aria-label', _t('qsTitle', 'Quick Switcher'));

    var modal = document.createElement('div');
    modal.className = 'cmt-qs-modal';

    var head = document.createElement('div');
    head.className = 'cmt-qs-head';
    var searchImg = document.createElement('img');
    searchImg.src = _assetPrefix() + 'search.svg';
    searchImg.alt = '';
    _input = document.createElement('input');
    _input.type = 'text';
    _input.className = 'cmt-qs-input';
    _input.placeholder = _t('qsPlaceholder', 'Jump to a tool, class, student, file, or word...');
    _input.setAttribute('aria-label', _t('qsTitle', 'Quick Switcher'));
    var kbd = document.createElement('span');
    kbd.className = 'cmt-qs-kbd';
    kbd.textContent = 'Ctrl+K';
    head.appendChild(searchImg);
    head.appendChild(_input);
    head.appendChild(kbd);

    _listEl = document.createElement('div');
    _listEl.className = 'cmt-qs-list';
    _listEl.setAttribute('role', 'listbox');

    var foot = document.createElement('div');
    foot.className = 'cmt-qs-foot';
    var hint = document.createElement('span');
    hint.textContent = _t('qsHint', 'Up/Down to navigate, Enter to open, Esc to close');
    foot.appendChild(hint);

    modal.appendChild(head);
    modal.appendChild(_listEl);
    modal.appendChild(foot);
    _backdrop.appendChild(modal);
    document.body.appendChild(_backdrop);

    _backdrop.addEventListener('click', function (e) {
      if (e.target === _backdrop) _close();
    });

    _input.addEventListener('input', function () {
      _activeIdx = 0;
      _renderList(_input.value);
      _scheduleDictSearch(_input.value);
    });

    _input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_filtered.length > 0) {
          _activeIdx = (_activeIdx + 1) % _filtered.length;
          _renderList(_input.value);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_filtered.length > 0) {
          _activeIdx = (_activeIdx - 1 + _filtered.length) % _filtered.length;
          _renderList(_input.value);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var chosen = _filtered[_activeIdx];
        if (chosen) {
          if (_actionTarget) {
            _launchAction(chosen);
          } else if (chosen.cat === 'student' || chosen.cat === 'class') {
            _savedQuery = _input ? _input.value : '';
            _actionTarget = chosen;
            _activeIdx = 0;
            if (_input) _input.value = '';
            _renderList('');
          } else if (typeof chosen.onSelect === 'function') {
            _close();
            chosen.onSelect();
          } else {
            _close();
            _openTarget(chosen.url);
          }
        }
      } else if (e.key === 'Backspace' && _actionTarget && !_input.value) {
        e.preventDefault();
        _actionTarget = null;
        _activeIdx = 0;
        _input.value = _savedQuery;
        _renderList(_savedQuery);
        _scheduleDictSearch(_savedQuery);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (_actionTarget) {
          _actionTarget = null;
          _activeIdx = 0;
          _input.value = _savedQuery;
          _renderList(_savedQuery);
          _scheduleDictSearch(_savedQuery);
        } else {
          _close();
        }
      }
    });
  }

  function _open() {
    _ensureModal();
    if (_items.length === 0) _seedTools();
    _actionTarget = null;
    _savedQuery = '';
    _activeIdx = 0;
    _dictInitPromise = null;
    _dictItems = [];
    _dictQuery = '';
    _input.value = '';
    if (window.CmtModal && typeof window.CmtModal.open === 'function') {
      window.CmtModal.open(_backdrop, {
        initialFocus: _input,
        onClose: function () {
          clearTimeout(_dictTimer);
          _dictSeq++;
        }
      });
    } else {
      _backdrop.classList.add('open');
      setTimeout(function () { if (_input) _input.focus(); }, 20);
    }
    _renderList('');
    _collectDynamicItems(true);
  }

  function _close() {
    clearTimeout(_dictTimer);
    _dictSeq++;
    if (window.CmtModal && typeof window.CmtModal.close === 'function' && _backdrop) {
      window.CmtModal.close(_backdrop);
      return;
    }
    if (_backdrop) _backdrop.classList.remove('open');
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (_backdrop && _backdrop.classList.contains('open')) {
        _close();
      } else {
        _open();
      }
    }
  });

  window.QuickSwitcher = {
    open: _open,
    close: _close,
    ensureLoaded: function () {
      if (_items.length === 0) _seedTools();
      return _collectDynamicItems().then(function () { return _items; });
    },
    search: function (query, limit) {
      if (_items.length === 0) _seedTools();
      var q = String(query || '').trim().toLowerCase();
      if (!q) return [];
      return _items.filter(function (it) {
        if (it.cat === 'tool') return false;
        return _matchesQuery(it.title + ' ' + it.sub + ' ' + it.catLabel, q);
      }).slice(0, limit || 16);
    },
    openForTarget: function (item) {
      if (!item) return;
      _ensureModal();
      if (_items.length === 0) _seedTools();
      if (item.cat === 'student' || item.cat === 'class') {
        _savedQuery = '';
        _actionTarget = item;
        _activeIdx = 0;
        _input.value = '';
        _backdrop.classList.add('open');
        _renderList('');
        setTimeout(function () { if (_input) _input.focus(); }, 20);
      } else if (item.url) {
        _openTarget(item.url);
      }
    },
    launchAction: _launchAction
  };
})();
