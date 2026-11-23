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

  async function readPlannerConfig() {
    if (window.Desktop && Desktop.isElectron && Desktop.isElectron() && typeof Desktop.readText === 'function') {
      var res = await Desktop.readText('user', 'planner-config.js');
      if (res && res.ok && res.content) {
        var fn = new Function('var window = {}; ' + res.content + '; return window.PLANNER_CONFIG || (typeof PLANNER_CONFIG !== "undefined" ? PLANNER_CONFIG : null);');
        var cfg = fn();
        if (cfg && typeof cfg === 'object') return cfg;
      }
    }
    if (window.PLANNER_CONFIG && typeof window.PLANNER_CONFIG === 'object') {
      return window.PLANNER_CONFIG;
    }
    return { entries: [], classes: {} };
  }

  async function savePlannerConfig(cfg) {
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron() || typeof Desktop.saveText !== 'function') {
      return { ok: false, error: tr('smElectronOnly', 'Requires the Electron desktop app.') };
    }
    var content = 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n';
    var res = await Desktop.saveText('user', 'planner-config.js', content);
    if (res && res.ok && typeof BroadcastChannel !== 'undefined') {
      try {
        var ch = new BroadcastChannel('cmt-planner-sync');
        ch.postMessage({ type: 'planner-config-updated', source: 'schedule-maker' });
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

  async function findGradeSheetFolder(classId, groupTitle) {
    if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron() || typeof Desktop.listByPath !== 'function') {
      return null;
    }
    var listRes = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
    var files = (listRes && Array.isArray(listRes.files)) ? listRes.files : [];
    var metaFiles = files.filter(function (f) { return f.filename === '_class.js'; });
    for (var i = 0; i < metaFiles.length; i++) {
      var mf = metaFiles[i];
      var slug = mf.relativePath.replace(/\/_class\.js$/, '');
      try {
        var r = await Desktop.readByPath('grades', mf.relativePath);
        if (r && r.ok && r.content) {
          var fn = new Function('var window = {}; ' + r.content + '; return window.GRADE_CLASS_META || (typeof GRADE_CLASS_META !== "undefined" ? GRADE_CLASS_META : null);');
          var meta = fn();
          if (meta && (meta.classId === classId || meta.groupId === classId || meta.className === groupTitle || slug === classId)) {
            return { classSlug: slug, meta: meta };
          }
        }
      } catch (_) {}
    }
    return null;
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
    var cfg = await readPlannerConfig();
    var entries = Array.isArray(cfg.entries) ? cfg.entries : [];
    var classId = resolvePlannerClassId(ctx.group, ctx.classGroupsMeta);
    var sessions = ctx.multiMode && Array.isArray(ctx.sessions) && ctx.sessions.length
      ? ctx.sessions
      : [{ id: null, label: ctx.title || tr('smTitle', 'Schedule'), date: ctx.date, startTime: ctx.startTime, room: ctx.room }];

    var matching = entries.filter(function (e) {
      if (!e || !e.date) return false;
      if (classId && e.classId && e.classId !== classId) return false;
      return true;
    }).sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    }).slice(0, 20);

    var sessionsSummary = sessions.map(function (s, idx) {
      return '<li><strong>' + esc(s.label || ('Schedule ' + (idx + 1))) + '</strong>'
        + (s.date ? ' — ' + esc(s.date) : '')
        + (s.startTime ? ' (' + esc(s.startTime) + ')' : '')
        + (s.room ? ' · ' + esc(s.room) : '')
        + '</li>';
    }).join('');

    var existingListHtml = matching.length
      ? matching.map(function (e) {
          return '<button type="button" class="sm-link-pick-item" data-entry-id="' + esc(e.id) + '">'
            + '<span class="sm-link-pick-title">' + esc(e.topic || e.type || 'Entry') + '</span>'
            + '<span class="sm-link-pick-meta">' + esc(e.date) + (e.timeSlot ? ' · ' + esc(e.timeSlot) : '') + '</span>'
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
        if (!Array.isArray(cfg.entries)) cfg.entries = [];
        var linked = [];
        sessions.forEach(function (sess, idx) {
          var targetDate = sess.date || new Date().toISOString().slice(0, 10);
          var topic = (ctx.title || tr('smTitle', 'Oral Exam')) + (ctx.multiMode && sess.label ? ' (' + sess.label + ')' : '');
          var existingEntry = (ctx.linkedPlannerEntries || []).map(function (l) {
            return cfg.entries.find(function (e) { return e && e.id === l.entryId; });
          }).find(function (e) { return e && (!sess.id || (e.scheduleLink && e.scheduleLink.sessionId === sess.id)); });

          if (existingEntry) {
            existingEntry.date = targetDate;
            existingEntry.topic = topic;
            existingEntry.type = 'test';
            if (classId) existingEntry.classId = classId;
            if (sess.room) existingEntry.room = sess.room;
            existingEntry.scheduleLink = { filename: ctx.currentFilename || null, sessionId: sess.id || null };
            linked.push({ entryId: existingEntry.id, date: existingEntry.date, label: sess.label || topic, sessionId: sess.id || null });
          } else {
            var newId = genId('pl-');
            var newEntry = {
              id: newId,
              date: targetDate,
              classId: classId || '',
              topic: topic,
              type: 'test',
              testSubType: 'oral',
              timeSlot: sess.startTime || '',
              room: sess.room || '',
              objective: sess.room ? (tr('smLabelRoom', 'Room') + ': ' + sess.room) : '',
              scheduleLink: { filename: ctx.currentFilename || null, sessionId: sess.id || null }
            };
            cfg.entries.push(newEntry);
            linked.push({ entryId: newId, date: targetDate, label: sess.label || topic, sessionId: sess.id || null });
          }
        });

        var saveRes = await savePlannerConfig(cfg);
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
        var entryId = btn.getAttribute('data-entry-id');
        var entry = cfg.entries.find(function (e) { return e && e.id === entryId; });
        if (!entry) return;
        entry.scheduleLink = { filename: ctx.currentFilename || null, sessionId: null };
        var saveRes = await savePlannerConfig(cfg);
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
    for (var i = 0; i < 8; i++) {
      var label = semKey + '-test-' + String(i + 1).padStart(2, '0');
      try {
        var trRes = await Desktop.readByPath('grades', gsFolder.classSlug + '/' + label + '.js');
        if (trRes && trRes.ok && trRes.content) {
          var tFn = new Function('var window = {}; ' + trRes.content + '; return window.GRADE_TEST_DATA || (typeof GRADE_TEST_DATA !== "undefined" ? GRADE_TEST_DATA : null);');
          var tData = tFn();
          existingTests.push({
            index: i,
            testName: (tData && tData.testConfig && tData.testConfig.testName) || ('Test ' + (i + 1)),
            testDate: (tData && tData.testConfig && tData.testConfig.testDate) || ''
          });
        }
      } catch (_) {}
    }

    var nextFreeIdx = -1;
    var usedSet = new Set(existingTests.map(function (tItem) { return tItem.index; }));
    for (var k = 0; k < 8; k++) {
      if (!usedSet.has(k)) { nextFreeIdx = k; break; }
    }

    var listHtml = existingTests.length
      ? existingTests.map(function (tItem) {
          return '<button type="button" class="sm-link-pick-item" data-test-idx="' + tItem.index + '" data-test-name="' + esc(tItem.testName) + '">'
            + '<span class="sm-link-pick-title">' + esc(tItem.testName) + '</span>'
            + '<span class="sm-link-pick-meta">' + esc(semKey.toUpperCase()) + ' · Test ' + (tItem.index + 1) + (tItem.testDate ? ' · ' + esc(tItem.testDate) : '') + '</span>'
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
          var metaContent = '// _savedAt: ' + Date.now() + '\nwindow.GRADE_CLASS_META = ' + JSON.stringify(gsFolder.meta, null, 2) + ';\n';
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
        var idx = parseInt(btn.getAttribute('data-test-idx'), 10);
        var name = btn.getAttribute('data-test-name') || ('Test ' + (idx + 1));
        if (typeof window.smSetLinkedGradeTest === 'function') {
          window.smSetLinkedGradeTest({
            classId: gsFolder.classSlug,
            className: ctx.group,
            semester: semKey,
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
    var navParams = {
      classId: linkedGradeTest.classId,
      semester: linkedGradeTest.semester || 'sem1',
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
    if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool('grade-sheet.html');
    } else {
      window.location.href = 'grade-sheet.html';
    }
  }

  function openInPlanner(linkedEntries) {
    var first = Array.isArray(linkedEntries) && linkedEntries[0] ? linkedEntries[0] : null;
    var url = 'planner.html' + (first && first.date ? ('?date=' + encodeURIComponent(first.date)) : '');
    if (window.Desktop && typeof Desktop.openHtml === 'function') {
      Desktop.openHtml(url);
    } else if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool(url);
    } else {
      window.location.href = url;
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
    var params = [];
    if (ctx.currentFilename) params.push('openSchedule=' + encodeURIComponent(ctx.currentFilename));
    if (ctx.multiMode && ctx.activeSessionId && ctx.activeSessionId !== 'all') {
      params.push('sessionId=' + encodeURIComponent(ctx.activeSessionId));
    }
    var url = 'oral-marking.html' + (params.length ? ('?' + params.join('&')) : '');
    if (window.Desktop && typeof Desktop.openHtml === 'function') {
      Desktop.openHtml(url);
    } else if (window.Desktop && typeof Desktop.openTool === 'function') {
      Desktop.openTool(url);
    } else {
      window.location.href = url;
    }
  }

  var api = {
    openPlannerLinkModal: openPlannerLinkModal,
    openGradeSheetLinkModal: openGradeSheetLinkModal,
    openInGradeSheet: openInGradeSheet,
    openInPlanner: openInPlanner,
    openInOralMarking: openInOralMarking,
    closeModal: closeModal
  };

  if (typeof window !== 'undefined') window.ScheduleMakerLinks = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})();
