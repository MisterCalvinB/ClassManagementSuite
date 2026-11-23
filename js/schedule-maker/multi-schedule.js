(function () {
  'use strict';

  var _sessionSeq = 0;

  function makeSessionId() {
    _sessionSeq += 1;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return 'sched-' + crypto.randomUUID();
    }
    return 'sched-' + Date.now() + '-' + _sessionSeq;
  }

  /**
   * Add `days` to a YYYY-MM-DD date string. Returns '' if input is empty/invalid.
   */
  function addDaysToDateStr(dateStr, days) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    var parts = dateStr.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(dt.getTime())) return '';
    dt.setDate(dt.getDate() + (days || 0));
    var y = dt.getFullYear();
    var m = String(dt.getMonth() + 1).padStart(2, '0');
    var d = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function createSession(index, baseDate, baseStartTime, labelPrefix, baseRoom) {
    var prefix = labelPrefix || 'Schedule';
    var date = baseDate ? addDaysToDateStr(baseDate, index) : '';
    return {
      id: makeSessionId(),
      label: prefix + ' ' + (index + 1),
      date: date,
      startTime: baseStartTime || '08:00',
      room: baseRoom || '',
      items: []
    };
  }

  /**
   * Place `numBreaks` evenly among student/group items.
   */
  function insertEvenBreaks(items, numBreaks) {
    var list = items.filter(function (i) { return i && i.type !== 'break'; });
    var count = Math.max(0, parseInt(numBreaks, 10) || 0);
    if (count > 0 && list.length > 0) {
      var step = Math.floor(list.length / (count + 1));
      var inserted = 0;
      for (var b = 1; b <= count; b++) {
        var pos = b * step + inserted;
        if (pos >= list.length) pos = list.length;
        list.splice(pos, 0, { type: 'break' });
        inserted++;
      }
    }
    return list;
  }

  /**
   * Distribute non-break items evenly across `sessions`.
   */
  function splitItemsEvenly(allItems, sessions, numBreaks) {
    if (!Array.isArray(sessions) || sessions.length === 0) return;
    var nonBreaks = (allItems || []).filter(function (i) { return i && i.type !== 'break'; });
    var k = sessions.length;
    var base = Math.floor(nonBreaks.length / k);
    var rem = nonBreaks.length % k;
    var cursor = 0;
    sessions.forEach(function (sess, idx) {
      var size = base + (idx < rem ? 1 : 0);
      var chunk = nonBreaks.slice(cursor, cursor + size);
      cursor += size;
      sess.items = (numBreaks !== undefined) ? insertEvenBreaks(chunk, numBreaks) : chunk;
    });
  }

  /**
   * Initialize 2 sessions when toggling multi-schedule mode ON.
   */
  function initSessionsFromSingle(orderItems, baseDate, baseStartTime, labelPrefix, numBreaks, baseRoom) {
    var s1 = createSession(0, baseDate, baseStartTime, labelPrefix, baseRoom);
    var s2 = createSession(1, baseDate, baseStartTime, labelPrefix, baseRoom);
    var sessions = [s1, s2];
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      splitItemsEvenly(orderItems, sessions, numBreaks);
    }
    return sessions;
  }

  /**
   * Merge all sessions' items back into a single flat array when toggling multi-schedule mode OFF.
   */
  function mergeSessionsToSingle(sessions) {
    if (!Array.isArray(sessions)) return [];
    var merged = [];
    sessions.forEach(function (s) {
      if (Array.isArray(s.items)) {
        s.items.forEach(function (item) {
          merged.push(item);
        });
      }
    });
    return merged;
  }

  /**
   * Move an item from one session to another.
   */
  function moveItemBetweenSessions(sessions, fromSessionId, itemIndex, toSessionId) {
    if (!Array.isArray(sessions) || fromSessionId === toSessionId) return false;
    var fromSess = sessions.find(function (s) { return s.id === fromSessionId; });
    var toSess = sessions.find(function (s) { return s.id === toSessionId; });
    if (!fromSess || !toSess || !Array.isArray(fromSess.items)) return false;
    if (itemIndex < 0 || itemIndex >= fromSess.items.length) return false;
    var moved = fromSess.items.splice(itemIndex, 1)[0];
    if (!Array.isArray(toSess.items)) toSess.items = [];
    toSess.items.push(moved);
    return true;
  }

  function countActiveCandidates(items) {
    if (!Array.isArray(items)) return 0;
    return items.filter(function (i) {
      return i && (i.type === 'student' || i.type === 'group') && !i.excluded;
    }).length;
  }

  var api = {
    makeSessionId: makeSessionId,
    addDaysToDateStr: addDaysToDateStr,
    createSession: createSession,
    insertEvenBreaks: insertEvenBreaks,
    splitItemsEvenly: splitItemsEvenly,
    initSessionsFromSingle: initSessionsFromSingle,
    mergeSessionsToSingle: mergeSessionsToSingle,
    moveItemBetweenSessions: moveItemBetweenSessions,
    countActiveCandidates: countActiveCandidates
  };

  if (typeof window !== 'undefined') {
    window.ScheduleMakerMulti = api;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})();
