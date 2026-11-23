(function () {
  'use strict';

  /**
   * Resolve firstName, lastName, and customName from a student item,
   * falling back gracefully for legacy saved schedules that only store `name`.
   */
  function resolveStudentNameParts(item) {
    if (!item || typeof item !== 'object') {
      return { firstName: '', lastName: '', customName: '', fullName: '' };
    }
    var fn = String(item.firstName || '').trim();
    var ln = String(item.lastName || '').trim();
    var cn = String(item.customName || '').trim();
    var full = String(item.name || '').trim();

    if (!fn && !ln && full) {
      var parts = full.split(/\s+/);
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }
    if (!full) {
      full = [fn, ln].filter(Boolean).join(' ').trim() || cn;
    }

    return {
      firstName: fn,
      lastName: ln,
      customName: cn,
      fullName: full
    };
  }

  /**
   * Return the primary comparison key for a student item given a sort mode.
   * Supported modes: 'firstName', 'lastName', 'customName', 'alpha'.
   */
  function getStudentSortKey(item, mode) {
    var parts = resolveStudentNameParts(item);
    if (mode === 'lastName') {
      return parts.lastName || parts.firstName || parts.fullName;
    }
    if (mode === 'customName') {
      if (parts.customName) return parts.customName;
      if (typeof window !== 'undefined' && window.StudentNameUtils && typeof window.StudentNameUtils.formatStudentDisplayName === 'function') {
        return window.StudentNameUtils.formatStudentDisplayName(parts, 'custom') || parts.fullName;
      }
      return parts.fullName;
    }
    // 'firstName' or legacy 'alpha'
    return parts.firstName || parts.fullName;
  }

  function compareStrings(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base', numeric: true });
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Sort an array of schedule items (students, groups, breaks).
   * Breaks remain in their slot positions; non-break items are sorted according to `mode`.
   */
  function sortScheduleItems(items, mode) {
    if (!Array.isArray(items) || items.length === 0) return [];
    if (mode === 'manual') return items.slice();

    var sortable = [];
    var breakIndices = [];
    items.forEach(function (item, idx) {
      if (item && item.type === 'break') {
        breakIndices.push({ index: idx, item: item });
      } else if (item) {
        sortable.push(item);
      }
    });

    if (mode === 'random') {
      shuffleArray(sortable);
    } else {
      sortable.sort(function (a, b) {
        if (a.type === 'group' && b.type === 'group') {
          return compareStrings(a.label || '', b.label || '');
        }
        if (a.type === 'group') return 1;
        if (b.type === 'group') return -1;

        var keyA = getStudentSortKey(a, mode);
        var keyB = getStudentSortKey(b, mode);
        var cmp = compareStrings(keyA, keyB);
        if (cmp !== 0) return cmp;

        var partsA = resolveStudentNameParts(a);
        var partsB = resolveStudentNameParts(b);
        if (mode === 'lastName') {
          cmp = compareStrings(partsA.firstName, partsB.firstName);
          if (cmp !== 0) return cmp;
        } else if (mode === 'firstName' || mode === 'alpha') {
          cmp = compareStrings(partsA.lastName, partsB.lastName);
          if (cmp !== 0) return cmp;
        }
        return compareStrings(partsA.fullName, partsB.fullName);
      });
    }

    if (breakIndices.length === 0) return sortable;

    var result = new Array(items.length);
    breakIndices.forEach(function (b) {
      result[b.index] = b.item;
    });
    var sIdx = 0;
    for (var i = 0; i < result.length; i++) {
      if (!result[i]) {
        result[i] = sortable[sIdx++];
      }
    }
    return result;
  }

  var api = {
    resolveStudentNameParts: resolveStudentNameParts,
    getStudentSortKey: getStudentSortKey,
    sortScheduleItems: sortScheduleItems
  };

  if (typeof window !== 'undefined') {
    window.ScheduleMakerSortUtils = api;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})();
