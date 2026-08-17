(function () {
  'use strict';

  function formatFirstLastInitial(firstName, lastName) {
    var fn = String(firstName || '').trim();
    var ln = String(lastName || '').trim();
    if (!fn && !ln) return '';
    if (!ln) return fn;
    var initial = ln.charAt(0).toUpperCase();
    return fn ? (fn + ' ' + initial + '.') : (initial + '.');
  }

  function formatInitials(firstName, lastName) {
    var fn = String(firstName || '').trim();
    var ln = String(lastName || '').trim();
    var parts = [];
    if (fn) {
      fn.split(/\s+/).forEach(function (p) {
        if (p) parts.push(p.charAt(0).toUpperCase() + '.');
      });
    }
    if (ln) {
      ln.split(/\s+/).forEach(function (p) {
        if (p) parts.push(p.charAt(0).toUpperCase() + '.');
      });
    }
    return parts.join('');
  }

  function formatStudentDisplayName(student, mode, fallbackMode) {
    if (!student) return '';
    if (typeof student === 'string') {
      var sStr = student.trim();
      if (!mode || mode === 'full') return sStr;
      var spaceIdx = sStr.indexOf(' ');
      if (spaceIdx === -1) return sStr;
      var f = sStr.slice(0, spaceIdx);
      var l = sStr.slice(spaceIdx + 1);
      if (mode === 'first') return f;
      if (mode === 'last') return l;
      if (mode === 'firstLastInitial') return formatFirstLastInitial(f, l);
      if (mode === 'initials') return formatInitials(f, l);
      return sStr;
    }

    var fn = String(student.firstName || '').trim();
    var ln = String(student.lastName || '').trim();
    var cn = String(student.customName || '').trim();
    var m = mode || 'full';

    if (m === 'custom') {
      if (cn) return cn;
      // Fallback if customName is not explicitly set
      if (fallbackMode === 'first') return fn || ln;
      if (fallbackMode === 'initials') return formatInitials(fn, ln);
      if (fallbackMode === 'firstLastInitial') return formatFirstLastInitial(fn, ln);
      return formatFirstLastInitial(fn, ln) || ((fn + ' ' + ln).trim());
    }

    if (m === 'first') return fn || ln || cn;
    if (m === 'last') return ln || fn || cn;
    if (m === 'firstLastInitial') return formatFirstLastInitial(fn, ln) || cn;
    if (m === 'initials') return formatInitials(fn, ln) || cn;

    // Default 'full'
    var full = (fn + ' ' + ln).trim();
    return full || cn || '';
  }

  var root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
  root.StudentNameUtils = {
    formatFirstLastInitial: formatFirstLastInitial,
    formatInitials: formatInitials,
    formatStudentDisplayName: formatStudentDisplayName
  };
})();
