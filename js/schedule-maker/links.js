(function () {
  'use strict';

  function tr(key, fallback) {
    if (typeof window.t === 'function') {
      var val = window.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function genId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return (prefix || 'id-') + crypto.randomUUID();
    }
    return (prefix || 'id-') + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function getContext() {
    return typeof window.smGetLinkContext === 'function' ? window.smGetLinkContext() : {};
  }

  async function readAllPlannerEntries() {
    var byClass = {};
    var all = [];
    if (window.Desktop && Desktop.isElectron && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
      try {
        var listRes = await Desktop.listByPath('user', 'planner/', { extensions: ['.js'], recursive: false });
        var files = (listRes && Array.isArray(listRes.files)) ? listRes.files : [];
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (!f || !f.filename) continue;
          try {
            var r = await Desktop.readByPath('user', 'planner/' + f.filename);
            if (r && r.ok && r.content) {
              var fn = new Function('var window = {}; ' + r.content + '; return window.PLANNER_ENTRIES_BY_CLASS || {};');
              var parsed = fn();
              if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(function (cid) {
                  if (Array.isArray(parsed[cid])) {
                    byClass[cid] = (byClass[cid] || []).concat(parsed[cid]);
                    all = all.concat(parsed[cid]);
                  }
                });
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    } else if (window.PLANNER_ENTRIES_BY_CLASS && typeof window.PLANNER_ENTRIES_BY_CLASS === 'object') {
      Object.keys(window.PLANNER_ENTRIES_BY_CLASS).forEach(function (cid) {
        if (Array.isArray(window.PLANNER_ENTRIES_BY_CLASS[cid])) {
          byClass[cid] = window.PLANNER_ENTRIES_BY_CLASS[cid].slice();
          all = all.concat(window.PLANNER_ENTRIES_BY_CLASS[cid]);
        }
      });
    }
    return { byClass: byClass, entries: all };
  }

  async function savePlannerClassEntries(classId, classEntries) {
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron() || typeof Desktop.saveText !== 'function') {
      return { ok: false, error: tr('smElectronOnly', 'Requires the Electron desktop app.') };
    }
    var cid = classId || '';
    var filename = (cid || '__unassigned') + '.js';
    var content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
      'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(cid) + '] = ' +
      JSON.stringify(classEntries || [], null, 2) + ';\n';
    var res = await Desktop.saveText('user', filename, content, 'planner');
    if (res && res.ok && typeof BroadcastChannel !== 'undefined') {
      try {
        var ch = new BroadcastChannel('cmt-planner-sync');
        ch.postMessage({ type: 'planner-entries-updated', filename: filename, subdir: 'planner', source: 'schedule-maker' });
        setTimeout(function () { try { ch.close(); } catch (_) {} }, 500);
      } catch (_) {}
    }
    return res || { ok: false };
  }

  function resolvePlannerClassId(groupTitle, classGroupsMeta) {
    if (!groupTitle) return '';
    var keys = Object.keys(classGroupsMeta || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var m = classGroupsMeta[k] || {};
      if ((m.name || k) === groupTitle) return k;
    }
    return groupTitle;
  }

  function parseGradeFile(content) {
    try {
      var sandbox = {};
      new Function('window', content)(sandbox);
      return sandbox.GRADE_TEST_DATA || sandbox.GRADE_CLASS || sandbox.GRADE_CLASS_META || null;
    } catch (_) {
      return null;
    }
  }

  function slugifyPathPart(s) {
    return String(s || 'class').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'class';
  }

  async function findGradeSheetFolder(classId, groupTitle) {
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron() || typeof Desktop.listByPath !== 'function') {
      return null;
    }
    var listRes = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
    var files = (listRes && Array.isArray(listRes.files)) ? listRes.files : [];
    var metaFiles = files.filter(function (f) { return f.filename === '_class.js'; });
    for (var i = 0; i < metaFiles.length; i++) {
      var mf = metaFiles[i];
      var slug = String(mf.relativePath || '').replace(/\\/g, '/').split('/')[0];
      try {
        var r = await Desktop.readByPath('grades', mf.relativePath);
        if (r && r.ok && r.content) {
          var meta = parseGradeFile(r.content);
          if (meta && (meta.classId === classId || meta.groupId === classId || meta.className === groupTitle || slug === classId)) {
            return { classSlug: slug, meta: meta };
          }
        }
      } catch (_) {}
    }

    // Auto-create Grade Sheet _class.js if not yet present (mirrors Planner's findGradeSheetClass)
    var cName = groupTitle || classId;
    if (!cName) return null;
    var cSlug = slugifyPathPart(cName);
    var newMeta = {
      _savedAt: Date.now(),
      classId: classId || cSlug,
      groupId: classId || cSlug,
      className: cName,
      testCounts: { sem1: 0, sem2: 0 },
      students: []
    };
    try {
      var metaContent = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_CLASS = ' + JSON.stringify(newMeta, null, 2) + ';\n';
      await Desktop.saveText('grades', '_class.js', metaContent, cSlug);
      return { classSlug: cSlug, meta: newMeta };
    } catch (_) {
      return null;
    }
  }

  function closeModal() {
    var ov = document.getElementById('sm-link-modal');
    if (ov) ov.classList.remove('open');
  }

  function openModal(title, bodyHtml) {
    var ov = document.getElementById('sm-link-modal');
    var titleEl = document.getElementById('sm-link-modal-title');
    var bodyEl = document.getElementById('sm-link-modal-body');
    if (!ov || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    ov.classList.add('open');
  }

  async function openPlannerLinkModal() {
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron()) {
      if (typeof window.showNotice === 'function') window.showNotice(tr('smElectronOnly', 'Requires the Electron desktop app.'), true);
      return;
    }
    var ctx = getContext();
    var loaded = await readAllPlannerEntries();
    var byClass = loaded.byClass;
    var entries = loaded.entries;
    var classId = resolvePlannerClassId(ctx.group, ctx.classGroupsMeta);
    var sessions = ctx.multiMode && Array.isArray(ctx.sessions) && ctx.sessions.length
      ? ctx.sessions
      : [{ id: null, label: ctx.title || tr('smTitle', 'Schedule'), date: ctx.date, startTime: ctx.startTime, endTime: ctx.endTime || '', room: ctx.room }];

    var matching = entries.filter(function (e) {
      if (!e || !e.date) return false;
      if (classId && e.classId && e.classId !== classId) return false;
      return true;
    }).sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    }).slice(0, 20);

    var sessionsSummary = sessions.map(function (s, idx) {
      var timeRange = s.startTime ? (s.endTime ? (s.startTime + '–' + s.endTime) : s.startTime) : '';
      return '<li><strong>' + esc(s.label || ('Schedule ' + (idx + 1))) + '</strong>'
        + (s.date ? ' — ' + esc(s.date) : '')
        + (timeRange ? ' (' + esc(timeRange) + ')' : '')
        + (s.room ? ' · ' + esc(s.room) : '')
        + '</li>';
    }).join('');

    var linkedEntryIdSet = new Set((ctx.linkedPlannerEntries || []).map(function (l) { return l && l.entryId; }).filter(Boolean));
    var existingListHtml = matching.length
      ? matching.map(function (e) {
          var isLinked = linkedEntryIdSet.has(e.id) || (e.scheduleLink && ctx.currentFilename && e.scheduleLink.filename === ctx.currentFilename);
          return '<button type="button" class="sm-link-pick-item' + (isLinked ? ' active' : '') + '" data-entry-id="' + esc(e.id) + '" data-class-id="' + esc(e.classId || '') + '">'
            + '<span class="sm-link-pick-title">' + esc(e.topic || e.type || 'Entry') + (isLinked ? ' (Linked)' : '') + '</span>'
            + '<span class="sm-link-pick-meta">' + esc(e.date) + (e.time ? ' · ' + esc(e.time) + (e.timeEnd ? '–' + e.timeEnd : '') : (e.timeSlot ? ' · ' + esc(e.timeSlot) : '')) + '</span>'
            + '</button>';
        }).join('')
      : '<div class="sm-modal-empty">' + esc(tr('smLinkNoPlannerEntries', 'No matching Planner entries found.')) + '</div>';

    var html = '<div class="sm-link-section">'
      + '<div class="sm-label">' + esc(tr('smLinkCreatePlannerTitle', 'Create / Sync Planner Test Entries')) + '</div>'
      + '<ul class="sm-link-summary-list">' + sessionsSummary + '</ul>'
      + '<button type="button" id="sm-link-sync-planner-btn" class="sm-group-modal-create-btn">'
      + esc(tr('smLinkSyncPlannerBtn', 'Create / Sync in Planner'))
      + '</button>'
      + '</div>'
      + '<div class="sm-link-section" style="margin-top:14px;">'
      + '<div class="sm-label" style="margin-bottom:6px;">' + esc(tr('smLinkPickExistingPlanner', 'Or link to an existing Planner entry')) + '</div>'
      + '<div class="sm-link-pick-list">' + existingListHtml + '</div>'
      + '</div>';

    openModal(tr('smLinkPlannerModalTitle', 'Link to Planner'), html);

    var syncBtn = document.getElementById('sm-link-sync-planner-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', async function () {
        if (!ctx.currentFilename && ctx.hasItems && typeof window.smSaveForLinking === 'function') {
          await window.smSaveForLinking();
          ctx = getContext();
        }
        var targetCid = classId || '';
        if (!Array.isArray(byClass[targetCid])) byClass[targetCid] = [];
        var classEntries = byClass[targetCid];
        var linked = [];

        sessions.forEach(function (sess) {
          var targetDate = sess.date || new Date().toISOString().slice(0, 10);
          var topic = (ctx.title || tr('smTitle', 'Oral Exam')) + (ctx.multiMode && sess.label ? ' (' + sess.label + ')' : '');
          var existingEntry = (ctx.linkedPlannerEntries || []).map(function (l) {
            return classEntries.find(function (e) { return e && e.id === l.entryId; });
          }).find(function (e) { return e && (!sess.id || (e.scheduleLink && e.scheduleLink.sessionId === sess.id)); });

          if (existingEntry) {
            existingEntry.date = targetDate;
            existingEntry.topic = topic;
            existingEntry.type = 'test';
            if (targetCid) existingEntry.classId = targetCid;
            if (sess.startTime) existingEntry.time = sess.startTime;
            if (sess.endTime) existingEntry.timeEnd = sess.endTime;
            if (sess.room) existingEntry.room = sess.room;
            existingEntry.scheduleLink = { filename: ctx.currentFilename || null, sessionId: sess.id || null };
            linked.push({ entryId: existingEntry.id, date: existingEntry.date, label: sess.label || topic, sessionId: sess.id || null });
          } else {
            var newId = genId('pl-');
            var newEntry = {
              id: newId,
              date: targetDate,
              classId: targetCid,
              topic: topic,
              type: 'test',
              testSubType: 'oral',
              time: sess.startTime || '',
              timeEnd: sess.endTime || '',
              room: sess.room || '',
              objective: sess.room ? (tr('smLabelRoom', 'Room') + ': ' + sess.room) : '',
              scheduleLink: { filename: ctx.currentFilename || null, sessionId: sess.id || null }
            };
            classEntries.push(newEntry);
            linked.push({ entryId: newId, date: targetDate, label: sess.label || topic, sessionId: sess.id || null });
          }
        });

        var saveRes = await savePlannerClassEntries(targetCid, classEntries);
        if (saveRes && saveRes.ok) {
          if (typeof window.smSetLinkedPlannerEntries === 'function') window.smSetLinkedPlannerEntries(linked);
          closeModal();
          if (typeof window.showNotice === 'function') window.showNotice(tr('smLinkPlannerSaved', 'Linked to Planner!'));
        } else {
          if (typeof window.showNotice === 'function') window.showNotice((saveRes && saveRes.error) || 'Error', true);
        }
      });
    }

    document.querySelectorAll('#sm-link-modal-body .sm-link-pick-item').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!ctx.currentFilename && ctx.hasItems && typeof window.smSaveForLinking === 'function') {
          await window.smSaveForLinking();
          ctx = getContext();
        }
        var entryId = btn.getAttribute('data-entry-id');
        var entryCid = btn.getAttribute('data-class-id') || '';
        var classEntries = byClass[entryCid] || [];
        var entry = classEntries.find(function (e) { return e && e.id === entryId; });
        if (!entry) return;
        entry.scheduleLink = { filename: ctx.currentFilename || null, sessionId: null };
        var saveRes = await savePlannerClassEntries(entryCid, classEntries);
        if (saveRes && saveRes.ok) {
          if (typeof window.smSetLinkedPlannerEntries === 'function') {
            window.smSetLinkedPlannerEntries([{ entryId: entry.id, date: entry.date, label: entry.topic || entry.date, sessionId: null }]);
          }
          closeModal();
          if (typeof window.showNotice === 'function') window.showNotice(tr('smLinkPlannerSaved', 'Linked to Planner!'));
        }
      });
    });
  }

  async function openGradeSheetLinkModal() {
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron()) {
      if (typeof window.showNotice === 'function') window.showNotice(tr('smElectronOnly', 'Requires the Electron desktop app.'), true);
      return;
    }
    var ctx = getContext();
    if (!ctx.group) {
      if (typeof window.showNotice === 'function') window.showNotice(tr('smNoGroup', 'Select a group first.'), true);
      return;
    }

    var classId = resolvePlannerClassId(ctx.group, ctx.classGroupsMeta);
    var gsFolder = await findGradeSheetFolder(classId, ctx.group);
    var semKey = ctx.semester === '2' ? 'sem2' : 'sem1';

    if (!gsFolder) {
      openModal(tr('smLinkGsModalTitle', 'Link to Grade Sheet'),
        '<div class="sm-modal-empty">' + esc(tr('smLinkGsNoClass', 'No Grade Sheet folder found for this class yet. Open Grade Sheet once for this class or save grades from Oral Marking.')) + '</div>');
      return;
    }

    var existingTests = [];
    try {
      var listRes = await Desktop.listByPath('grades', gsFolder.classSlug, { extensions: ['.js'], recursive: false });
      var testFiles = (listRes && Array.isArray(listRes.files))
        ? listRes.files.filter(function (f) { return f && f.filename && /^sem[12]-test-\d+\.js$/i.test(f.filename); })
        : [];
      testFiles.sort(function (a, b) { return String(a.filename).localeCompare(String(b.filename)); });
      for (var fi = 0; fi < testFiles.length; fi++) {
        var tf = testFiles[fi];
        var m = tf.filename.match(/^(sem[12])-test-(\d+)\.js$/i);
        if (!m) continue;
        var fSem = m[1].toLowerCase();
        var fIdx = parseInt(m[2], 10) - 1;
        try {
          var trRes = await Desktop.readByPath('grades', gsFolder.classSlug + '/' + tf.filename);
          if (trRes && trRes.ok && trRes.content) {
            var tData = parseGradeFile(trRes.content);
            existingTests.push({
              semester: fSem,
              index: fIdx,
              testName: (tData && tData.testConfig && tData.testConfig.testName) || ('Test ' + (fIdx + 1)),
              testDate: (tData && tData.testConfig && tData.testConfig.testDate) || ''
            });
          }
        } catch (_) {}
      }
    } catch (_) {}

    var nextFreeIdx = -1;
    var usedSet = new Set(existingTests.filter(function (tItem) { return tItem.semester === semKey; }).map(function (tItem) { return tItem.index; }));
    for (var k = 0; k < 8; k++) {
      if (!usedSet.has(k)) { nextFreeIdx = k; break; }
    }

    var curLinked = ctx.linkedGradeTest;
    var listHtml = existingTests.length
      ? existingTests.map(function (tItem) {
          var isLinked = !!(curLinked && curLinked.classId === gsFolder.classSlug && curLinked.semester === tItem.semester && curLinked.testIndex === tItem.index);
          return '<button type="button" class="sm-link-pick-item' + (isLinked ? ' active' : '') + '" data-test-sem="' + esc(tItem.semester) + '" data-test-idx="' + tItem.index + '" data-test-name="' + esc(tItem.testName) + '">'
            + '<span class="sm-link-pick-title">' + esc(tItem.testName) + (isLinked ? ' (Linked)' : '') + '</span>'
            + '<span class="sm-link-pick-meta">' + esc(tItem.semester.toUpperCase()) + ' · Test ' + (tItem.index + 1) + (tItem.testDate ? ' · ' + esc(tItem.testDate) : '') + '</span>'
            + '</button>';
        }).join('')
      : '<div class="sm-modal-empty">' + esc(tr('smLinkGsNoTests', 'No tests created in this term yet.')) + '</div>';

    var createHtml = nextFreeIdx >= 0
      ? '<div class="sm-link-section">'
        + '<div class="sm-label" style="margin-bottom:6px;">' + esc(tr('smLinkCreateGsTitle', 'Create New Oral Test Slot')) + ' (' + esc(semKey.toUpperCase()) + ' · Test ' + (nextFreeIdx + 1) + ')</div>'
        + '<button type="button" id="sm-link-create-gs-btn" class="sm-group-modal-create-btn">' + esc(tr('smLinkCreateGsBtn', 'Create & Link Oral Test')) + '</button>'
        + '</div>'
      : '';

    var html = createHtml
      + '<div class="sm-link-section" style="margin-top:14px;">'
      + '<div class="sm-label" style="margin-bottom:6px;">' + esc(tr('smLinkPickGsTitle', 'Or link to an existing Grade Sheet test')) + '</div>'
      + '<div class="sm-link-pick-list">' + listHtml + '</div>'
      + '</div>';

    openModal(tr('smLinkGsModalTitle', 'Link to Grade Sheet'), html);

    var createBtn = document.getElementById('sm-link-create-gs-btn');
    if (createBtn && nextFreeIdx >= 0) {
      createBtn.addEventListener('click', async function () {
        var testName = ctx.title || tr('smTitle', 'Oral Exam');
        var testLabel = semKey + '-test-' + String(nextFreeIdx + 1).padStart(2, '0');
        var testData = {
          _savedAt: Date.now(),
          classId: gsFolder.meta.classId || gsFolder.classSlug,
          semester: semKey,
          testIndex: nextFreeIdx,
          testConfig: {
            coefficient: 1,
            fixedWeight: null,
            testName: testName,
            testDate: ctx.date || '',
            testType: 'Oral',
            scope: ''
          },
          criteria: [],
          grades: {}
        };
        var content = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_TEST_DATA = ' + JSON.stringify(testData, null, 2) + ';\n';
        await Desktop.saveText('grades', testLabel + '.js', content, gsFolder.classSlug);

        if (gsFolder.meta) {
          gsFolder.meta.testCounts = gsFolder.meta.testCounts || { sem1: 0, sem2: 0 };
          gsFolder.meta.testCounts[semKey] = Math.max(gsFolder.meta.testCounts[semKey] || 0, nextFreeIdx + 1);
          gsFolder.meta._savedAt = Date.now();
          var metaContent = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_CLASS = ' + JSON.stringify(gsFolder.meta, null, 2) + ';\n';
          await Desktop.saveText('grades', '_class.js', metaContent, gsFolder.classSlug);
        }

        if (typeof window.smSetLinkedGradeTest === 'function') {
          window.smSetLinkedGradeTest({
            classId: gsFolder.classSlug,
            className: ctx.group,
            semester: semKey,
            testIndex: nextFreeIdx,
            testName: testName
          });
        }
        closeModal();
        if (typeof window.showNotice === 'function') window.showNotice(tr('smLinkGsSaved', 'Linked to Grade Sheet!'));
      });
    }

    document.querySelectorAll('#sm-link-modal-body .sm-link-pick-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sem = btn.getAttribute('data-test-sem') || semKey;
        var idx = parseInt(btn.getAttribute('data-test-idx'), 10);
        var name = btn.getAttribute('data-test-name') || ('Test ' + (idx + 1));
        if (typeof window.smSetLinkedGradeTest === 'function') {
          window.smSetLinkedGradeTest({
            classId: gsFolder.classSlug,
            className: ctx.group,
            semester: sem,
            testIndex: idx,
            testName: name
          });
        }
        closeModal();
        if (typeof window.showNotice === 'function') window.showNotice(tr('smLinkGsSaved', 'Linked to Grade Sheet!'));
      });
    });
  }

  function openInGradeSheet(linkedGradeTest) {
    if (!linkedGradeTest || !linkedGradeTest.classId) return;
    var sem = linkedGradeTest.semester || 'sem1';
    var navParams = {
      classId: linkedGradeTest.classId,
      semester: sem,
      sem: sem,
      testIndex: linkedGradeTest.testIndex
    };
    try {
      localStorage.setItem('cmt-grade-sheet-nav', JSON.stringify(navParams));
      if (typeof BroadcastChannel !== 'undefined') {
        var ch = new BroadcastChannel('cmt-gradesheet-nav');
        ch.postMessage(navParams);
        setTimeout(function () { try { ch.close(); } catch (_) {} }, 500);
      }
    } catch (_) {}
    var query = {
      classId: linkedGradeTest.classId,
      sem: sem,
      testIndex: String(linkedGradeTest.testIndex)
    };
    if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool('grade-sheet.html', { query: query });
    } else {
      window.location.href = 'grade-sheet.html?' + new URLSearchParams(query).toString();
    }
  }

  function openInPlanner(linkedEntries) {
    var first = Array.isArray(linkedEntries) && linkedEntries[0] ? linkedEntries[0] : null;
    var query = {};
    if (first && first.entryId) {
      query.entryId = first.entryId;
    } else if (first && first.date) {
      query.navDate = first.date;
    }
    try {
      if (first && (first.date || first.entryId)) {
        localStorage.setItem('cmt-planner-nav', JSON.stringify({
          date: first.date || '',
          entryId: first.entryId || ''
        }));
      }
    } catch (_) {}
    if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool('planner.html', { query: query });
    } else {
      var qs = new URLSearchParams(query).toString();
      window.location.href = 'planner.html' + (qs ? ('?' + qs) : '');
    }
  }

  async function openInOralMarking() {
    var ctx = getContext();
    if (!ctx.hasItems) {
      if (typeof window.showNotice === 'function') window.showNotice(tr('smNothingToSave', 'Generate a schedule first.'), true);
      return;
    }
    if (!ctx.currentFilename && typeof window.smSaveForLinking === 'function') {
      var saved = await window.smSaveForLinking();
      if (!saved) return;
      ctx = getContext();
    }
    var query = {};
    if (ctx.currentFilename) query.openSchedule = ctx.currentFilename;
    if (ctx.multiMode && ctx.activeSessionId && ctx.activeSessionId !== 'all') {
      query.sessionId = ctx.activeSessionId;
    }
    try {
      localStorage.setItem('cmt-oral-marking-open', JSON.stringify(query));
      if (typeof BroadcastChannel !== 'undefined') {
        var omCh = new BroadcastChannel('cmt-oral-marking-nav');
        omCh.postMessage(query);
        setTimeout(function () { try { omCh.close(); } catch (_) {} }, 500);
      }
    } catch (_) {}
    if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool('oral-marking.html', { query: query });
    } else {
      var qs = new URLSearchParams(query).toString();
      window.location.href = 'oral-marking.html' + (qs ? ('?' + qs) : '');
    }
  }

  var _syncTimers = {};

  async function syncLinkedPlannerDates(opts) {
    var options = opts || {};
    var newDate = String(options.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return { ok: false, updated: 0 };
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron()) {
      return { ok: false, updated: 0 };
    }

    var ctx = getContext();
    var linked = Array.isArray(ctx.linkedPlannerEntries) ? ctx.linkedPlannerEntries : [];
    if (linked.length === 0) return { ok: true, updated: 0 };

    var targetIds = new Set();
    var allLinkedIds = new Set();
    linked.forEach(function (pe) {
      if (pe && pe.entryId) allLinkedIds.add(pe.entryId);
    });

    if (ctx.multiMode && options.sessionId) {
      linked.forEach(function (pe) {
        if (pe && pe.entryId && pe.sessionId === options.sessionId) {
          targetIds.add(pe.entryId);
        }
      });
      if (targetIds.size === 0 && options.isFirstSession) {
        linked.forEach(function (pe) {
          if (pe && pe.entryId && !pe.sessionId) targetIds.add(pe.entryId);
        });
      }
    } else {
      var hasUntagged = linked.some(function (pe) { return pe && pe.entryId && !pe.sessionId; });
      linked.forEach(function (pe) {
        if (pe && pe.entryId && (!hasUntagged || !pe.sessionId)) {
          targetIds.add(pe.entryId);
        }
      });
    }

    var loaded = await readAllPlannerEntries();
    var byClass = loaded.byClass || {};
    var dirtyClassIds = {};
    var matchedIds = new Set();
    var updatedCount = 0;

    Object.keys(byClass).forEach(function (cid) {
      var arr = byClass[cid];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (entry) {
        if (!entry || !entry.id) return;
        var isMatch = targetIds.has(entry.id) ||
          (ctx.multiMode && options.sessionId && allLinkedIds.has(entry.id) &&
            entry.scheduleLink && entry.scheduleLink.sessionId === options.sessionId);
        if (!isMatch) return;
        matchedIds.add(entry.id);
        if (entry.date !== newDate) {
          entry.date = newDate;
          dirtyClassIds[cid] = true;
          updatedCount++;
        }
      });
    });

    var dirtyCids = Object.keys(dirtyClassIds);
    for (var i = 0; i < dirtyCids.length; i++) {
      var cid = dirtyCids[i];
      await savePlannerClassEntries(cid, byClass[cid]);
    }

    if (matchedIds.size > 0) {
      var nextLinked = linked.map(function (pe) {
        if (pe && matchedIds.has(pe.entryId)) {
          return Object.assign({}, pe, { date: newDate });
        }
        return pe;
      });
      if (typeof window.smSetLinkedPlannerEntries === 'function') {
        window.smSetLinkedPlannerEntries(nextLinked);
      }
    }

    if (updatedCount > 0 && typeof window.showNotice === 'function') {
      window.showNotice(tr('smPlannerDateUpdated', 'Planner date updated!'));
    }

    return { ok: true, updated: updatedCount };
  }

  function scheduleSyncLinkedPlannerDates(opts) {
    var options = opts || {};
    var key = options.sessionId ? String(options.sessionId) : '__single';
    if (_syncTimers[key]) clearTimeout(_syncTimers[key]);
    _syncTimers[key] = setTimeout(function () {
      delete _syncTimers[key];
      syncLinkedPlannerDates(options);
    }, 250);
  }

  var api = {
    openPlannerLinkModal: openPlannerLinkModal,
    openGradeSheetLinkModal: openGradeSheetLinkModal,
    openInGradeSheet: openInGradeSheet,
    openInPlanner: openInPlanner,
    openInOralMarking: openInOralMarking,
    syncLinkedPlannerDates: syncLinkedPlannerDates,
    scheduleSyncLinkedPlannerDates: scheduleSyncLinkedPlannerDates,
    closeModal: closeModal
  };

  if (typeof window !== 'undefined') window.ScheduleMakerLinks = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})();
