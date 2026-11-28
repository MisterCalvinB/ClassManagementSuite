// Planner reminder engine and IPC listeners extracted from electron-main.js
'use strict';

function registerPlannerRemindersIpc(ctx) {
  const {
    BrowserWindow,
    ipcMain,
    fs,
    fsSync,
    path,
    ROOT_DIR,
    getSaveTargets
  } = ctx;

  // ── Planner reminder engine ──────────────────────────────────────────────────

  let _plannerReminderEntries = [];
  let _todoReminderItems = [];
  let _autoLessonEnd5Min = true;
  let _plannerClassMeta = {};
  let _plannerConfigClasses = {};
  const _shownReminders = new Set();
  let _reminderInterval = null;

  function _getPlannerClassTitle(classId) {
    if (!classId) return '';
    if (_plannerClassMeta && _plannerClassMeta[classId] && _plannerClassMeta[classId].name) {
      return _plannerClassMeta[classId].name;
    }
    if (_plannerConfigClasses && _plannerConfigClasses[classId] && _plannerConfigClasses[classId].name) {
      return _plannerConfigClasses[classId].name;
    }
    return classId;
  }

  async function _loadPlannerEntries() {
    try {
      const targets = getSaveTargets();
      const userDir = targets.user;

      // Read auto-end-reminder setting and classes from planner-config.js
      let plannerConfigClasses = {};
      try {
        const cfgPath = path.join(userDir, 'planner-config.js');
        const cfgContent = await fs.readFile(cfgPath, 'utf8').catch(() => null);
        if (cfgContent) {
          const fn = new Function('window', cfgContent + '\n' +
            'if (typeof PLANNER_CONFIG !== "undefined" && PLANNER_CONFIG) return PLANNER_CONFIG;\n' +
            'if (window && window.PLANNER_CONFIG) return window.PLANNER_CONFIG;\n' +
            'return null;'
          );
          const cfgObj = fn({ PLANNER_CONFIG: null });
          if (cfgObj) {
            _autoLessonEnd5Min = !(cfgObj.reminderSettings && cfgObj.reminderSettings.autoLessonEnd5Min === false);
            if (cfgObj.classes && typeof cfgObj.classes === 'object') {
              plannerConfigClasses = cfgObj.classes;
            }
          }
        }
      } catch (_ce) { }
      _plannerConfigClasses = plannerConfigClasses;

      // Load class-groups.js for class display names/titles
      let plannerClassMeta = {};
      try {
        const groupsPath = path.join(userDir, 'class-groups.js');
        const groupsContent = await fs.readFile(groupsPath, 'utf8').catch(() => null);
        if (groupsContent) {
          const fn = new Function('window', groupsContent + '\n' +
            'if (typeof CLASS_GROUPS_DATA !== "undefined" && CLASS_GROUPS_DATA) return CLASS_GROUPS_DATA;\n' +
            'if (typeof CLASS_GROUPS_META !== "undefined" && CLASS_GROUPS_META) return { classGroupsMeta: CLASS_GROUPS_META };\n' +
            'if (window && window.CLASS_GROUPS_DATA) return window.CLASS_GROUPS_DATA;\n' +
            'if (window && window.CLASS_GROUPS_META) return { classGroupsMeta: window.CLASS_GROUPS_META };\n' +
            'if (window && window.CLASS_GROUPS) return { classGroups: window.CLASS_GROUPS };\n' +
            'if (typeof CLASS_GROUPS !== "undefined" && CLASS_GROUPS) return { classGroups: CLASS_GROUPS };\n' +
            'return null;'
          );
          const cgd = fn({});
          if (cgd && cgd.classGroupsMeta) {
            plannerClassMeta = cgd.classGroupsMeta;
          } else if (cgd && cgd.classGroups) {
            plannerClassMeta = cgd.classGroups;
          }
        }
      } catch (_ge) { }
      _plannerClassMeta = plannerClassMeta;

      let all = [];
      const plannerDir = path.join(userDir, 'planner');
      try {
        const perClassFiles = (await fs.readdir(plannerDir)).filter(f => f.endsWith('.js'));
        for (const file of perClassFiles) {
          try {
            const content = await fs.readFile(path.join(plannerDir, file), 'utf8');
            const match = content.match(/PLANNER_ENTRIES_BY_CLASS\[[^\]]+\]\s*=\s*(\[[\s\S]*\]);/);
            if (match) all = all.concat(JSON.parse(match[1]));
          } catch (_e) { }
        }
      } catch (_) { }

      if (all.length === 0) {
        const filePath = path.join(userDir, 'planner-entries.js');
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const match = content.match(/PLANNER_ENTRIES\s*=\s*(\[[\s\S]*\])\s*;/);
          if (match) all = JSON.parse(match[1]);
        } catch (_) { }
      }
      // Include entries with explicit reminders, plus all lesson entries with timeEnd for auto-end check
      _plannerReminderEntries = all.filter(
        e => e && e.date && (
          (e.reminder && e.reminder.minutesBefore > 0) ||
          (e.reminderEnd && e.reminderEnd.minutesBefore > 0) ||
          (e.timeEnd && (!e.type || e.type === 'lesson'))
        )
      );

      // Load todos for reminder engine
      try {
        const todosJsonPath = path.join(userDir, 'todos.json');
        const todosJsonContent = await fs.readFile(todosJsonPath, 'utf8').catch(() => null);
        const todosPath = path.join(userDir, 'todos.js');
        const todosContent = todosJsonContent ? null : await fs.readFile(todosPath, 'utf8').catch(() => null);
        if (todosJsonContent) {
          const allTodos = JSON.parse(todosJsonContent);
          _todoReminderItems = Array.isArray(allTodos) ? allTodos.filter(td => !td.archivedAt && td.reminderAt) : [];
        } else if (todosContent) {
          const todosMatch = todosContent.match(/TODOS\s*=\s*(\[[\s\S]*\])\s*;/);
          if (todosMatch) {
            const allTodos = JSON.parse(todosMatch[1]);
            _todoReminderItems = allTodos.filter(td => !td.archivedAt && td.reminderAt);
          } else {
            _todoReminderItems = [];
          }
        } else {
          _todoReminderItems = [];
        }
      } catch (_te) { _todoReminderItems = []; }
    } catch (_err) {
      _plannerReminderEntries = [];
      _todoReminderItems = [];
    }
  }

  function _broadcastReminder(data) {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('planner:reminder', data);
      }
    }
  }

  function _checkPlannerReminders() {
    const nowMs = Date.now();
    for (const entry of _plannerReminderEntries) {
      const classLabel = _getPlannerClassTitle(entry.classId);
      const timeLabel = entry.time ? entry.time + (entry.timeEnd ? '–' + entry.timeEnd : '') : '';
      const bodyParts = [timeLabel, entry.type || '', entry.topic || ''].filter(Boolean);
      const body = bodyParts.join(' · ');

      // ── Start reminder ─────────────────────────────────────────────
      if (entry.reminder && entry.reminder.minutesBefore > 0) {
        const key = String(entry.id) + '@start@' + String(entry.reminder.minutesBefore);
        if (!_shownReminders.has(key)) {
          const timeParts = (entry.time || '09:00').split(':');
          const entryMs = new Date(entry.date + 'T'
            + String(parseInt(timeParts[0], 10) || 9).padStart(2, '0') + ':'
            + String(parseInt(timeParts[1], 10) || 0).padStart(2, '0') + ':00').getTime();
          if (!isNaN(entryMs)) {
            const fireMs = entryMs - entry.reminder.minutesBefore * 60000;
            if (nowMs >= fireMs && nowMs < fireMs + 120000 && entryMs > nowMs) {
              _shownReminders.add(key);
              const mb = entry.reminder.minutesBefore;
              const whenStr = mb < 60 ? 'in ' + mb + ' min'
                : mb === 60 ? 'in 1 hour'
                  : mb < 1440 ? 'in ' + (mb / 60) + ' hours'
                    : 'tomorrow';
              _broadcastReminder({ title: (classLabel ? classLabel + ' — ' : '') + whenStr, body });
            }
          }
        }
      }

      // ── Auto end reminder (5 min, lesson slots only) ───────────────
      if (_autoLessonEnd5Min && entry.timeEnd && (!entry.type || entry.type === 'lesson') &&
        !(entry.reminderEnd && entry.reminderEnd.minutesBefore > 0)) {
        const key = String(entry.id) + '@auto-end@5';
        if (!_shownReminders.has(key)) {
          const aeParts = entry.timeEnd.split(':');
          const aeEndMs = new Date(entry.date + 'T'
            + String(parseInt(aeParts[0], 10) || 0).padStart(2, '0') + ':'
            + String(parseInt(aeParts[1], 10) || 0).padStart(2, '0') + ':00').getTime();
          if (!isNaN(aeEndMs)) {
            const aeFireMs = aeEndMs - 5 * 60000;
            if (nowMs >= aeFireMs && nowMs < aeFireMs + 120000 && aeEndMs > nowMs) {
              _shownReminders.add(key);
              _broadcastReminder({ title: (classLabel ? classLabel + ' — ' : '') + '5 min left', body });
            }
          }
        }
      }

      // ── End reminder ───────────────────────────────────────────────
      if (entry.reminderEnd && entry.reminderEnd.minutesBefore > 0 && entry.timeEnd) {
        const key = String(entry.id) + '@end@' + String(entry.reminderEnd.minutesBefore);
        if (!_shownReminders.has(key)) {
          const endParts = entry.timeEnd.split(':');
          const endMs = new Date(entry.date + 'T'
            + String(parseInt(endParts[0], 10) || 0).padStart(2, '0') + ':'
            + String(parseInt(endParts[1], 10) || 0).padStart(2, '0') + ':00').getTime();
          if (!isNaN(endMs)) {
            const fireMs = endMs - entry.reminderEnd.minutesBefore * 60000;
            if (nowMs >= fireMs && nowMs < fireMs + 120000 && endMs > nowMs) {
              _shownReminders.add(key);
              const mb = entry.reminderEnd.minutesBefore;
              const whenStr = mb === 1 ? '1 min left' : mb < 60 ? mb + ' min left' : '1 hour left';
              _broadcastReminder({ title: (classLabel ? classLabel + ' — ' : '') + whenStr, body });
            }
          }
        }
      }
    }

    // ── Todo reminders ─────────────────────────────────────────────
    for (const td of _todoReminderItems) {
      if (!td.reminderAt) continue;
      const key = 'td@' + String(td.id) + '@' + td.reminderAt.slice(0, 16);
      if (!_shownReminders.has(key)) {
        const fireMs = new Date(td.reminderAt).getTime();
        if (!isNaN(fireMs) && nowMs >= fireMs && nowMs < fireMs + 120000) {
          _shownReminders.add(key);
          const label = td.text || '';
          const sub = td.dueDate ? 'Due: ' + td.dueDate : '';
          _broadcastReminder({ title: label, body: sub });
        }
      }
    }
  }

  function _startReminderEngine() {
    _loadPlannerEntries().catch(() => { });
    if (_reminderInterval) clearInterval(_reminderInterval);
    _reminderInterval = setInterval(_checkPlannerReminders, 60000);
    // Delay first check so windows have time to open
    setTimeout(_checkPlannerReminders, 8000);
  }

  ipcMain.on('planner:reload-entries', _loadPlannerEntries);

  ipcMain.on('planner:reminder-dismiss', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('planner:reminder-dismiss');
      }
    }
  });

  return {
    loadPlannerEntries: _loadPlannerEntries,
    startReminderEngine: _startReminderEngine
  };
}

module.exports = { registerPlannerRemindersIpc };
