/**
 * Launcher Sidebar Calendar Viewer (Day / Week / Month / Year)
 * Renders inside #sbUpcomingSection above #sbEventsList and uses the
 * Planner config, entries, holidays, and Grade Sheet correction deadlines.
 */
(function (global) {
  'use strict';

  var STORAGE_VIEW_KEY = 'sbCalView';
  var VALID_VIEWS = { day: 1, week: 1, month: 1, year: 1 };

  var state = {
    view: 'month',
    cursorDate: localTodayStr(),
    cfg: null,
    classMeta: {},
    entries: [],
    deadlines: [],
    gradeClassNames: {},
    dateCache: Object.create(null),
    initialized: false
  };

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatYmd(dateObj) {
    return dateObj.getFullYear() + '-' + pad2(dateObj.getMonth() + 1) + '-' + pad2(dateObj.getDate());
  }

  function parseYmd(ds) {
    if (!ds || typeof ds !== 'string') return new Date();
    var p = ds.split('-');
    if (p.length < 3) return new Date();
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0, 0);
  }

  function localTodayStr() {
    return formatYmd(new Date());
  }

  function addDays(ds, delta) {
    var d = parseYmd(ds);
    d.setDate(d.getDate() + delta);
    return formatYmd(d);
  }

  function addMonths(ds, delta) {
    var d = parseYmd(ds);
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    var maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, maxDay));
    return formatYmd(d);
  }

  function getMondayOfWeek(ds) {
    var d = parseYmd(ds);
    var dow = d.getDay();
    var diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return formatYmd(d);
  }

  function getLocaleStr() {
    if (typeof global.getLocale === 'function') return global.getLocale();
    if (typeof global.getLang === 'function') {
      var map = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' };
      return map[global.getLang()] || 'en-GB';
    }
    return 'en-GB';
  }

  function tr(key, fallback) {
    if (typeof global.t === 'function') {
      var val = global.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function esc(str) {
    if (typeof global.escHtml === 'function') return global.escHtml(str);
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function typeLabel(type) {
    if (typeof global.sbTypeLabel === 'function') return global.sbTypeLabel(type);
    var map = {
      lesson: tr('sbTypeLesson', 'Lesson'),
      test: tr('sbTypeTest', 'Test'),
      assignment: tr('sbTypeAssignment', 'Assignment'),
      'correction-deadline': tr('sbTagDeadline', 'Deadline')
    };
    return map[type] || tr('sbTypeOther', 'Event');
  }

  function typeClass(type) {
    if (typeof global.sbTypeClass === 'function') return global.sbTypeClass(type);
    return {
      lesson: 'sb-tag-lesson',
      test: 'sb-tag-test',
      assignment: 'sb-tag-assignment',
      'correction-deadline': 'sb-tag-deadline'
    }[type] || 'sb-tag-other';
  }

  function dotClass(type) {
    return {
      lesson: 'dot-lesson',
      test: 'dot-test',
      assignment: 'dot-assignment',
      'correction-deadline': 'dot-deadline'
    }[type] || 'dot-other';
  }

  function resolveClassName(classId, fallbackName) {
    if (typeof global.sbResolveClassTitle === 'function') {
      return global.sbResolveClassTitle(classId, fallbackName);
    }
    if (classId && state.classMeta[classId] && state.classMeta[classId].name) {
      return state.classMeta[classId].name;
    }
    if (classId && state.gradeClassNames[classId]) {
      return state.gradeClassNames[classId];
    }
    return fallbackName || '';
  }

  function findSemesterForDate(ds) {
    var cfg = state.cfg;
    if (!cfg || !Array.isArray(cfg.semesters) || !cfg.semesters.length) return null;
    for (var i = 0; i < cfg.semesters.length; i++) {
      var s = cfg.semesters[i];
      if (s && s.semesterStart && s.semesterEnd && ds >= s.semesterStart && ds <= s.semesterEnd) {
        return { sem: s, semKey: 'sem' + (i + 1) };
      }
    }
    return null;
  }

  function isHolidayDate(ds, semInfo) {
    var cfg = state.cfg;
    var sems = semInfo && semInfo.sem ? [semInfo.sem] : (cfg && Array.isArray(cfg.semesters) ? cfg.semesters : []);
    for (var i = 0; i < sems.length; i++) {
      var hols = (sems[i] && sems[i].holidays) || [];
      for (var j = 0; j < hols.length; j++) {
        var h = hols[j];
        if (!h || !h.date) continue;
        var end = h.dateTo || h.date;
        if (ds >= h.date && ds <= end) return true;
      }
    }
    return false;
  }

  function getDayInfo(ds) {
    if (state.dateCache[ds]) return state.dateCache[ds];

    var cfg = state.cfg;
    var semInfo = findSemesterForDate(ds);
    var holiday = isHolidayDate(ds, semInfo);
    var dow = parseYmd(ds).getDay();
    var events = [];
    var consumed = Object.create(null);

    // Map entries for this date
    var emap = Object.create(null);
    for (var i = 0; i < state.entries.length; i++) {
      var e = state.entries[i];
      if (!e || e.date !== ds || e.isCorrectionDeadline || e.type === 'correction-deadline') continue;
      if (e.type === 'holiday') {
        holiday = true;
        continue;
      }
      var k = e.classId || '';
      if (!emap[k]) emap[k] = [];
      emap[k].push(e);
    }

    // Scheduled classes inside semester range (when not on holiday)
    if (!holiday && cfg && cfg.classes && semInfo) {
      var semKey = semInfo.semKey;
      var classIds = Object.keys(cfg.classes);
      for (var c = 0; c < classIds.length; c++) {
        var cid = classIds[c];
        if (state.classMeta[cid] && state.classMeta[cid].archived) continue;
        var cCfg = cfg.classes[cid] || {};
        if (semKey && cCfg.semesters && cCfg.semesters[semKey] === false) continue;
        var sched = cCfg.schedule || [];
        for (var sIdx = 0; sIdx < sched.length; sIdx++) {
          var s = sched[sIdx];
          if (parseInt(s.day, 10) !== dow) continue;
          consumed[cid] = true;
          var entArr = emap[cid] || [null];
          for (var ei = 0; ei < entArr.length; ei++) {
            var ent = entArr[ei];
            events.push({
              date: ds,
              classId: cid,
              time: (ent && ent.time) || s.time || '',
              timeEnd: (ent && ent.timeEnd) || s.timeEnd || '',
              type: (ent && ent.type) || 'lesson',
              topic: (ent && ent.topic) || '',
              entryId: (ent && ent.id) || ''
            });
          }
        }
      }
    }

    // Orphan entries for this date
    if (!holiday) {
      var entryKeys = Object.keys(emap);
      for (var ek = 0; ek < entryKeys.length; ek++) {
        var ecid = entryKeys[ek];
        if (ecid && consumed[ecid]) continue;
        if (ecid && state.classMeta[ecid] && state.classMeta[ecid].archived) continue;
        var list = emap[ecid];
        for (var li = 0; li < list.length; li++) {
          var oe = list[li];
          events.push({
            date: ds,
            classId: oe.classId || '',
            time: oe.time || '',
            timeEnd: oe.timeEnd || '',
            type: oe.type || 'lesson',
            topic: oe.topic || '',
            entryId: oe.id || ''
          });
        }
      }
    }

    // Correction deadlines on this date
    for (var d = 0; d < state.deadlines.length; d++) {
      var dl = state.deadlines[d];
      if (!dl || dl.deadline !== ds) continue;
      if (dl.classId && state.classMeta[dl.classId] && state.classMeta[dl.classId].archived) continue;
      events.push({
        date: ds,
        time: dl.time || '18:00',
        type: 'correction-deadline',
        topic: dl.testTitle || '',
        classId: dl.classId || '',
        className: dl.className || '',
        semester: dl.semester || 'sem1',
        testIndex: typeof dl.testIndex === 'number' ? dl.testIndex : 0
      });
    }

    events.sort(function (a, b) {
      if (a.type === 'correction-deadline' && b.type !== 'correction-deadline') return -1;
      if (b.type === 'correction-deadline' && a.type !== 'correction-deadline') return 1;
      if (a.time && b.time && a.time !== b.time) return a.time < b.time ? -1 : 1;
      return 0;
    });

    var res = { holiday: holiday, events: events };
    state.dateCache[ds] = res;
    return res;
  }

  function loadSavedView() {
    try {
      if (typeof global.sbGetPrefs === 'function') {
        var v = global.sbGetPrefs()[STORAGE_VIEW_KEY];
        if (v && VALID_VIEWS[v]) return v;
      }
    } catch (e) {}
    return 'month';
  }

  function saveView(view) {
    try {
      if (typeof global.sbSavePrefs === 'function') {
        var obj = {};
        obj[STORAGE_VIEW_KEY] = view;
        global.sbSavePrefs(obj);
      }
    } catch (e) {}
  }

  function openSlot(slot) {
    if (!slot || typeof global.openApp !== 'function') return;
    if (slot.type === 'correction-deadline') {
      try {
        localStorage.setItem('cmt-grade-sheet-nav', JSON.stringify({
          classId: slot.classId || '',
          semester: slot.semester || 'sem1',
          testIndex: typeof slot.testIndex === 'number' ? slot.testIndex : 0
        }));
      } catch (e) {}
      global.openApp('pages/grade-sheet.html');
    } else {
      try {
        localStorage.removeItem('cmt-planner-todo');
        localStorage.setItem('cmt-planner-nav', JSON.stringify({
          date: slot.date || state.cursorDate,
          classId: slot.classId || '',
          time: slot.time || ''
        }));
      } catch (e) {}
      global.openApp('planner.html');
    }
  }

  function renderDotsHtml(events) {
    if (!events || !events.length) return '<div class="sb-cal-dots"></div>';
    var seen = Object.create(null);
    var types = [];
    for (var i = 0; i < events.length; i++) {
      var tp = events[i].type || 'other';
      if (!seen[tp]) {
        seen[tp] = true;
        types.push(tp);
      }
      if (types.length >= 3) break;
    }
    var html = '<div class="sb-cal-dots">';
    for (var j = 0; j < types.length; j++) {
      html += '<span class="sb-cal-dot ' + dotClass(types[j]) + '"></span>';
    }
    html += '</div>';
    return html;
  }

  function renderAgendaList(ds, info) {
    var loc = getLocaleStr();
    var dObj = parseYmd(ds);
    var dateLabel = dObj.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
    var countLabel = info.events.length === 1
      ? tr('sbCalEventSingle', '1 event')
      : tr('sbCalEventsCount', '{n} events').replace('{n}', info.events.length);

    var html = '<div class="sb-cal-agenda">';
    html += '<div class="sb-cal-agenda-hd">';
    html += '<button type="button" class="sb-cal-agenda-date" data-action="open-date" data-date="' + esc(ds) + '">' + esc(dateLabel) + '</button>';
    if (info.holiday) {
      html += '<span class="sb-cal-holiday-badge">' + esc(tr('sbCalHoliday', 'Holiday')) + '</span>';
    } else {
      html += '<span class="sb-cal-agenda-count">' + esc(countLabel) + '</span>';
    }
    html += '</div>';

    if (!info.events.length) {
      html += '<div class="sb-cal-agenda-empty">' + esc(tr('sbCalNoEvents', 'No events on this day')) + '</div>';
    } else {
      html += '<div class="sb-cal-agenda-list">';
      for (var i = 0; i < info.events.length; i++) {
        var ev = info.events[i];
        var clsName = resolveClassName(ev.classId, ev.className);
        var title = ev.topic || clsName || '—';
        html += '<button type="button" class="sb-cal-agenda-item" data-action="open-event" data-date="' + esc(ds) + '" data-idx="' + i + '">';
        html += '<span class="sb-tag ' + typeClass(ev.type) + '">' + esc(typeLabel(ev.type)) + '</span>';
        if (ev.time) html += '<span class="sb-cal-agenda-time">' + esc(ev.time) + '</span>';
        html += '<span class="sb-cal-agenda-title" title="' + esc(title) + '">' + esc(title) + '</span>';
        html += '</button>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function getWeekdayLabels(loc) {
    // 2024-01-01 was a Monday
    var base = new Date(2024, 0, 1, 12, 0, 0, 0);
    var labels = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(base);
      d.setDate(base.getDate() + i);
      labels.push(d.toLocaleDateString(loc, { weekday: 'narrow' }));
    }
    return labels;
  }

  function renderDayView(bodyEl, periodEl, loc) {
    var ds = state.cursorDate;
    var dObj = parseYmd(ds);
    periodEl.textContent = dObj.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    var info = getDayInfo(ds);
    bodyEl.innerHTML = renderAgendaList(ds, info);
  }

  function renderWeekView(bodyEl, periodEl, loc) {
    var mon = getMondayOfWeek(state.cursorDate);
    var sun = addDays(mon, 6);
    var monObj = parseYmd(mon);
    var sunObj = parseYmd(sun);
    if (monObj.getMonth() === sunObj.getMonth()) {
      periodEl.textContent = monObj.getDate() + '–' + sunObj.getDate() + ' ' + sunObj.toLocaleDateString(loc, { month: 'short', year: 'numeric' });
    } else {
      periodEl.textContent = monObj.toLocaleDateString(loc, { day: 'numeric', month: 'short' }) + ' – ' + sunObj.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    var today = localTodayStr();
    var html = '<div class="sb-cal-week-strip">';
    for (var i = 0; i < 7; i++) {
      var ds = addDays(mon, i);
      var dObj = parseYmd(ds);
      var info = getDayInfo(ds);
      var cls = 'sb-cal-day sb-cal-week-day';
      if (ds === today) cls += ' is-today';
      if (ds === state.cursorDate) cls += ' is-selected';
      if (info.holiday) cls += ' is-holiday';
      var wk = dObj.toLocaleDateString(loc, { weekday: 'short' }).slice(0, 2);
      html += '<button type="button" class="' + cls + '" data-action="select-day" data-date="' + esc(ds) + '">';
      html += '<span class="sb-cal-wd-name">' + esc(wk) + '</span>';
      html += '<span class="sb-cal-day-num">' + dObj.getDate() + '</span>';
      html += renderDotsHtml(info.events);
      html += '</button>';
    }
    html += '</div>';
    html += renderAgendaList(state.cursorDate, getDayInfo(state.cursorDate));
    bodyEl.innerHTML = html;
  }

  function renderMonthView(bodyEl, periodEl, loc) {
    var cur = parseYmd(state.cursorDate);
    var year = cur.getFullYear();
    var month = cur.getMonth();
    periodEl.textContent = new Date(year, month, 1, 12, 0, 0).toLocaleDateString(loc, { month: 'long', year: 'numeric' });

    var wkLabels = getWeekdayLabels(loc);
    var html = '<div class="sb-cal-weekdays">';
    for (var w = 0; w < 7; w++) {
      html += '<span>' + esc(wkLabels[w]) + '</span>';
    }
    html += '</div>';

    var firstDay = new Date(year, month, 1, 12, 0, 0);
    var startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    var gridStart = new Date(year, month, 1 - startOffset, 12, 0, 0);
    var today = localTodayStr();

    html += '<div class="sb-cal-grid">';
    for (var i = 0; i < 42; i++) {
      var cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      var ds = formatYmd(cellDate);
      var isOutside = cellDate.getMonth() !== month;
      var info = getDayInfo(ds);
      var cls = 'sb-cal-day';
      if (isOutside) cls += ' is-outside';
      if (info.holiday) cls += ' is-holiday';
      if (ds === today) cls += ' is-today';
      if (ds === state.cursorDate) cls += ' is-selected';

      html += '<button type="button" class="' + cls + '" data-action="select-day" data-date="' + esc(ds) + '">';
      html += '<span class="sb-cal-day-num">' + cellDate.getDate() + '</span>';
      html += renderDotsHtml(info.events);
      html += '</button>';
    }
    html += '</div>';
    html += renderAgendaList(state.cursorDate, getDayInfo(state.cursorDate));
    bodyEl.innerHTML = html;
  }

  function renderYearView(bodyEl, periodEl, loc) {
    var cur = parseYmd(state.cursorDate);
    var year = cur.getFullYear();
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    periodEl.textContent = String(year);

    var html = '<div class="sb-cal-year-grid">';
    for (var m = 0; m < 12; m++) {
      var mDate = new Date(year, m, 1, 12, 0, 0);
      var mLabel = mDate.toLocaleDateString(loc, { month: 'short' });
      var daysInMonth = new Date(year, m + 1, 0).getDate();
      var evCount = 0;
      var hasTestOrDeadline = false;
      for (var d = 1; d <= daysInMonth; d++) {
        var ds = year + '-' + pad2(m + 1) + '-' + pad2(d);
        var info = getDayInfo(ds);
        if (info.events.length) {
          evCount += info.events.length;
          for (var ei = 0; ei < info.events.length; ei++) {
            var tp = info.events[ei].type;
            if (tp === 'test' || tp === 'correction-deadline') hasTestOrDeadline = true;
          }
        }
      }
      var cls = 'sb-cal-month-tile';
      if (year === nowYear && m === nowMonth) cls += ' is-current';
      if (m === cur.getMonth()) cls += ' is-selected';

      html += '<button type="button" class="' + cls + '" data-action="select-month" data-year="' + year + '" data-month="' + m + '">';
      html += '<span class="sb-cal-month-name">' + esc(mLabel) + '</span>';
      html += '<span class="sb-cal-month-count' + (hasTestOrDeadline ? ' has-alert' : '') + '">' + (evCount > 0 ? evCount : '—') + '</span>';
      html += '</button>';
    }
    html += '</div>';
    bodyEl.innerHTML = html;
  }

  function updateViewButtons() {
    var wrap = document.getElementById('sbCalViews');
    if (!wrap) return;
    var btns = wrap.querySelectorAll('.sb-cal-view-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      btn.classList.toggle('active', btn.getAttribute('data-view') === state.view);
    }
  }

  function render() {
    var bodyEl = document.getElementById('sbCalBody');
    var periodEl = document.getElementById('sbCalPeriod');
    if (!bodyEl || !periodEl) return;

    updateViewButtons();
    var loc = getLocaleStr();
    if (state.view === 'day') renderDayView(bodyEl, periodEl, loc);
    else if (state.view === 'week') renderWeekView(bodyEl, periodEl, loc);
    else if (state.view === 'year') renderYearView(bodyEl, periodEl, loc);
    else renderMonthView(bodyEl, periodEl, loc);
  }

  function stepPeriod(dir) {
    if (state.view === 'day') {
      state.cursorDate = addDays(state.cursorDate, dir);
    } else if (state.view === 'week') {
      state.cursorDate = addDays(state.cursorDate, dir * 7);
    } else if (state.view === 'month') {
      state.cursorDate = addMonths(state.cursorDate, dir);
    } else if (state.view === 'year') {
      state.cursorDate = addMonths(state.cursorDate, dir * 12);
    }
    render();
  }

  function bindEvents() {
    if (state.initialized) return;
    var root = document.getElementById('sbCal');
    if (!root) return;
    state.initialized = true;
    state.view = loadSavedView();

    var viewsWrap = document.getElementById('sbCalViews');
    if (viewsWrap) {
      viewsWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.sb-cal-view-btn');
        if (!btn) return;
        var v = btn.getAttribute('data-view');
        if (v && VALID_VIEWS[v] && v !== state.view) {
          state.view = v;
          saveView(v);
          render();
        }
      });
    }

    var prevBtn = document.getElementById('sbCalPrevBtn');
    if (prevBtn) prevBtn.addEventListener('click', function () { stepPeriod(-1); });

    var nextBtn = document.getElementById('sbCalNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', function () { stepPeriod(1); });

    var todayBtn = document.getElementById('sbCalTodayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', function () {
        state.cursorDate = localTodayStr();
        render();
      });
    }

    var bodyEl = document.getElementById('sbCalBody');
    if (bodyEl) {
      bodyEl.addEventListener('click', function (e) {
        var target = e.target.closest('[data-action]');
        if (!target) return;
        var action = target.getAttribute('data-action');
        if (action === 'select-day') {
          var ds = target.getAttribute('data-date');
          if (ds) {
            state.cursorDate = ds;
            render();
          }
        } else if (action === 'select-month') {
          var y = parseInt(target.getAttribute('data-year'), 10);
          var m = parseInt(target.getAttribute('data-month'), 10);
          if (!isNaN(y) && !isNaN(m)) {
            state.cursorDate = y + '-' + pad2(m + 1) + '-01';
            state.view = 'month';
            saveView('month');
            render();
          }
        } else if (action === 'open-date') {
          var ods = target.getAttribute('data-date');
          openSlot({ date: ods || state.cursorDate, type: 'lesson' });
        } else if (action === 'open-event') {
          var eds = target.getAttribute('data-date');
          var idx = parseInt(target.getAttribute('data-idx'), 10);
          var info = getDayInfo(eds);
          if (info && info.events && info.events[idx]) {
            openSlot(info.events[idx]);
          }
        }
      });

      bodyEl.addEventListener('contextmenu', function (e) {
        var item = e.target.closest('.sb-cal-agenda-item');
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        var eds = item.getAttribute('data-date');
        var idx = parseInt(item.getAttribute('data-idx'), 10);
        var info = getDayInfo(eds);
        if (info && info.events && info.events[idx] && typeof global.sbShowEventCtx === 'function') {
          global.sbShowEventCtx(e.clientX, e.clientY, info.events[idx]);
        }
      });
    }
  }

  function setData(payload) {
    if (!payload) return;
    state.cfg = payload.cfg || null;
    state.classMeta = payload.classMeta || {};
    state.entries = Array.isArray(payload.entries) ? payload.entries : [];
    state.deadlines = Array.isArray(payload.deadlines) ? payload.deadlines : [];
    state.gradeClassNames = payload.gradeClassNames || {};
    state.dateCache = Object.create(null);
    bindEvents();
    render();
  }

  function init() {
    bindEvents();
    render();
  }

  global.LauncherCalendar = {
    init: init,
    render: render,
    setData: setData
  };
})(window);
