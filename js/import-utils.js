(function () {
  'use strict';

  function generateStudentUuid() {
    return 'st-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  }

  function generateGroupUuid() {
    return 'ge-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  }

  function normalizeHeader(h) {
    return String(h || '').toLowerCase().trim().replace(/[^a-z0-9 éèêàâùûîïôç]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Score a column header against a list of known aliases (0 = no match, higher = better)
  function matchScore(header, aliases) {
    var norm = normalizeHeader(header);
    for (var i = 0; i < aliases.length; i++) {
      if (norm === aliases[i]) return 100 - i;
      if (norm.indexOf(aliases[i]) !== -1 || aliases[i].indexOf(norm) !== -1) return 50 - i;
    }
    return 0;
  }

  // Returns {fieldKey: columnIndex | null} for all fields
  function autoDetectMapping(headers, fields) {
    var mapping = {};
    var usedCols = {};
    fields.forEach(function (field) {
      var best = -1, bestScore = 0;
      headers.forEach(function (h, i) {
        if (usedCols[i]) return;
        var s = matchScore(h, field.autoMatch || []);
        if (s > bestScore) { bestScore = s; best = i; }
      });
      mapping[field.key] = bestScore > 0 ? best : null;
      if (best !== -1 && bestScore > 0) usedCols[best] = true;
    });
    return mapping;
  }

  // Parse an uploaded File object → {ok, headers, rows, error}
  // rows is array of arrays (raw cells), headers is array of strings
  async function parseFile(file) {
    var ext = (file.name || '').split('.').pop().toLowerCase();
    try {
      if (ext === 'json') {
        return await _parseJson(file);
      } else {
        return await _parseXlsxOrCsv(file, ext);
      }
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  async function _parseJson(file) {
    var text = await file.text();
    var data = JSON.parse(text);
    // Accept array of objects
    if (!Array.isArray(data)) data = [data];
    if (!data.length) return { ok: true, headers: [], rows: [] };
    var headers = Object.keys(data[0]);
    var rows = data.map(function (obj) {
      return headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
    });
    return { ok: true, headers: headers, rows: rows };
  }

  async function _parseXlsxOrCsv(file, ext) {
    if (!window.XLSX) throw new Error('SheetJS (XLSX) not loaded');
    var ab = await file.arrayBuffer();
    var wb = window.XLSX.read(ab, { type: 'array', cellDates: true });
    var sheet = wb.Sheets[wb.SheetNames[0]];
    var raw = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!raw.length) return { ok: true, headers: [], rows: [] };
    var headers = raw[0].map(function (h) { return String(h === null || h === undefined ? '' : h); });
    var rows = raw.slice(1).filter(function (r) { return r.some(function (c) { return c !== '' && c !== null && c !== undefined; }); });
    rows = rows.map(function (r) {
      // Pad short rows
      while (r.length < headers.length) r.push('');
      return r.map(function (c) { return c === null || c === undefined ? '' : c; });
    });
    return { ok: true, headers: headers, rows: rows };
  }

  // Apply column mapping to raw rows → array of field-keyed objects
  function applyMapping(rows, headers, mapping, fields) {
    return rows.map(function (row) {
      var obj = {};
      fields.forEach(function (field) {
        var colIdx = mapping[field.key];
        var raw = colIdx !== null && colIdx !== undefined ? row[colIdx] : '';
        raw = raw === null || raw === undefined ? '' : String(raw).trim();
        if (field.type === 'boolean') {
          obj[field.key] = /^(1|true|yes|oui|ja|si|y|o)$/i.test(raw);
        } else if (field.type === 'date') {
          obj[field.key] = _normalizeDate(raw);
        } else {
          obj[field.key] = raw;
        }
      });
      return obj;
    }).filter(function (obj) {
      // Drop completely empty rows
      return fields.some(function (f) { return obj[f.key] !== '' && obj[f.key] !== false; });
    });
  }

  function _normalizeDate(raw) {
    if (!raw) return '';
    // Handle JS Date objects (from SheetJS cellDates)
    if (raw instanceof Date) {
      var y = raw.getFullYear(), m = raw.getMonth() + 1, d = raw.getDate();
      return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }
    // Try to detect DD/MM/YYYY or YYYY-MM-DD
    var str = String(raw).trim();
    var mDMY = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (mDMY) return mDMY[3] + '-' + mDMY[2].padStart(2, '0') + '-' + mDMY[1].padStart(2, '0');
    var mYMD = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (mYMD) return mYMD[1] + '-' + mYMD[2].padStart(2, '0') + '-' + mYMD[3].padStart(2, '0');
    return str;
  }

  async function loadStudentRoster() {
    if (!window.Desktop || !Desktop.isElectron()) return { ok: false, data: [] };
    try {
      var r = await Desktop.readText('user', 'students.js');
      if (r && r.ok && r.content) {
        var fn = new Function(r.content + '; return typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : [];');
        var arr = fn();
        return { ok: true, data: Array.isArray(arr) ? arr : [] };
      }
      return { ok: true, data: [] };
    } catch (e) {
      return { ok: false, data: [], error: e.message };
    }
  }

  async function loadClassGroupsData() {
    if (!window.Desktop || !Desktop.isElectron()) return { ok: false, data: null };
    try {
      var r = await Desktop.readText('user', 'class-groups.js');
      if (r && r.ok && r.content) {
        var fn = new Function(r.content + '; return typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : null;');
        var data = fn();
        return { ok: true, data: data };
      }
      return { ok: true, data: { activeYear: '', activeSemester: null, activeSemesterStart: '', activeSemesterEnd: '', classGroupsMeta: {} } };
    } catch (e) {
      return { ok: false, data: null, error: e.message };
    }
  }

  function buildStudentsFileContent(arr) {
    return 'const STUDENTS_ROSTER = ' + JSON.stringify(arr, null, 2) + ';\n';
  }

  function buildGroupsFileContent(data) {
    var meta = data.classGroupsMeta || {};
    var metaLines = Object.keys(meta).map(function (uuid) {
      var m = meta[uuid] || {};
      var entry = {
        year: m.year !== undefined ? m.year : '',
        semester: m.semester !== undefined ? m.semester : '',
        level: m.level !== undefined ? m.level : ''
      };
      if (m.name) entry.name = m.name;
      if (m.halfGroups && ((m.halfGroups.A && m.halfGroups.A.length) || (m.halfGroups.B && m.halfGroups.B.length))) {
        entry.halfGroups = m.halfGroups;
      }
      if (m.students && m.students.length) entry.students = m.students;
      if (m.archived) entry.archived = true;
      return '    ' + JSON.stringify(uuid) + ': ' + JSON.stringify(entry);
    });
    return [
      'const CLASS_GROUPS_DATA = {',
      '  "activeYear": ' + JSON.stringify(data.activeYear || '') + ',',
      '  "activeSemester": ' + JSON.stringify(data.activeSemester !== undefined ? data.activeSemester : null) + ',',
      '  "activeSemesterStart": ' + JSON.stringify(data.activeSemesterStart || '') + ',',
      '  "activeSemesterEnd": ' + JSON.stringify(data.activeSemesterEnd || '') + ',',
      '  "classGroupsMeta": {',
      metaLines.join(',\n').split('\n').map(function (l) { return '  ' + l; }).join('\n'),
      '  }',
      '};',
      '',
      'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};',
      ''
    ].join('\n');
  }

  window.ImportUtils = {
    generateStudentUuid: generateStudentUuid,
    generateGroupUuid: generateGroupUuid,
    normalizeHeader: normalizeHeader,
    autoDetectMapping: autoDetectMapping,
    parseFile: parseFile,
    applyMapping: applyMapping,
    loadStudentRoster: loadStudentRoster,
    loadClassGroupsData: loadClassGroupsData,
    buildStudentsFileContent: buildStudentsFileContent,
    buildGroupsFileContent: buildGroupsFileContent
  };
})();
