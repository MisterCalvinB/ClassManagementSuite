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
      } else if (ext === 'pdf') {
        return await _parsePdf(file);
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

    if (Array.isArray(data)) {
      if (!data.length) return { ok: true, headers: [], rows: [] };
      if (Array.isArray(data[0])) {
        return _formatAoaResult(data);
      }
      return _formatObjectArrayResult(data);
    }

    if (data && typeof data === 'object') {
      var keys = Object.keys(data);
      var arrayKey = keys.find(function (k) { return Array.isArray(data[k]) && data[k].length > 0; });
      if (arrayKey) {
        var arr = data[arrayKey];
        if (Array.isArray(arr[0])) {
          return _formatAoaResult(arr);
        }
        return _formatObjectArrayResult(arr);
      }
      return _formatObjectArrayResult([data]);
    }

    return { ok: false, error: 'Invalid JSON format: expected array or object' };
  }

  function _formatObjectArrayResult(arr) {
    var headerSet = [];
    arr.forEach(function (item) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item).forEach(function (k) {
          if (headerSet.indexOf(k) === -1) headerSet.push(k);
        });
      }
    });
    if (!headerSet.length) {
      return { ok: true, headers: [], rows: [] };
    }
    var rows = arr.map(function (item) {
      if (!item || typeof item !== 'object') return headerSet.map(function () { return ''; });
      return headerSet.map(function (k) {
        var v = item[k];
        return v !== undefined && v !== null ? (typeof v === 'object' ? JSON.stringify(v) : v) : '';
      });
    });
    return { ok: true, headers: headerSet, rows: rows };
  }

  function _sliceRowsByHeaderIndex(rawRows, headerIdx, maxCols) {
    if (!rawRows || !rawRows.length) {
      return { ok: true, headers: [], rows: [] };
    }
    if (headerIdx < 0) headerIdx = 0;
    if (headerIdx >= rawRows.length) headerIdx = rawRows.length - 1;

    if (!maxCols) {
      maxCols = 0;
      rawRows.forEach(function (r) {
        if (r && r.length > maxCols) maxCols = r.length;
      });
    }

    var rawHeaders = rawRows[headerIdx] || [];
    var headers = [];
    for (var h = 0; h < maxCols; h++) {
      var val = rawHeaders[h];
      var hText = (val !== null && val !== undefined) ? String(val).trim() : '';
      headers.push(hText || ('Col ' + (h + 1)));
    }

    var dataRows = rawRows.slice(headerIdx + 1);
    var rows = dataRows.map(function (r) {
      var cells = [];
      for (var c = 0; c < headers.length; c++) {
        var val = r ? r[c] : undefined;
        if (val === undefined || val === null) {
          cells.push('');
        } else if (val instanceof Date) {
          cells.push(val);
        } else {
          cells.push(typeof val === 'string' ? val.trim() : val);
        }
      }
      return cells;
    }).filter(function (r) {
      return r.some(function (c) {
        return c !== '' && c !== null && c !== undefined;
      });
    });

    return { ok: true, headers: headers, rows: rows };
  }

  function _formatAoaResult(rawRows) {
    var nonBlank = (rawRows || []).filter(function (r) {
      return Array.isArray(r) && r.some(function (c) {
        return c !== null && c !== undefined && String(c).trim() !== '';
      });
    });
    if (!nonBlank.length) {
      return { ok: true, headers: [], rows: [], rawRows: [], headerRowIdx: 0 };
    }

    var maxCols = 0;
    nonBlank.forEach(function (r) {
      if (r.length > maxCols) maxCols = r.length;
    });

    var headerIdx = 0;
    if (nonBlank.length > 1 && maxCols > 1) {
      var row0Filled = nonBlank[0].filter(function (c) { return c !== null && c !== undefined && String(c).trim() !== ''; }).length;
      var row1Filled = nonBlank[1].filter(function (c) { return c !== null && c !== undefined && String(c).trim() !== ''; }).length;
      if (row0Filled === 1 && row1Filled > 1) {
        headerIdx = 1;
      }
    }

    var res = _sliceRowsByHeaderIndex(nonBlank, headerIdx, maxCols);
    res.rawRows = nonBlank;
    res.headerRowIdx = headerIdx;
    return res;
  }

  function _parseCsvText(text) {
    if (!text) return [];
    text = text.replace(/^\uFEFF/, '');

    var sampleLines = text.split(/\r?\n/).slice(0, 5).filter(function (l) { return l.trim(); });
    var counts = { ',': 0, ';': 0, '\t': 0 };
    sampleLines.forEach(function (line) {
      var inQuotes = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && counts[ch] !== undefined) counts[ch]++;
      }
    });
    var delim = ',';
    if (counts[';'] > counts[','] && counts[';'] > counts['\t']) delim = ';';
    else if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) delim = '\t';

    var rows = [];
    var currentRow = [];
    var currentCell = '';
    var inQuotes = false;
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      var next = text[i + 1];

      if (inQuotes) {
        if (ch === '"') {
          if (next === '"') {
            currentCell += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          currentCell += ch;
          i++;
          continue;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
          continue;
        } else if (ch === delim) {
          currentRow.push(currentCell);
          currentCell = '';
          i++;
          continue;
        } else if (ch === '\r') {
          if (next === '\n') i++;
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
          continue;
        } else if (ch === '\n') {
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
          continue;
        } else {
          currentCell += ch;
          i++;
          continue;
        }
      }
    }
    if (currentCell !== '' || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }
    return rows;
  }

  async function _parseCsvFile(file) {
    var text = await file.text();
    var rawRows = _parseCsvText(text);
    return _formatAoaResult(rawRows);
  }

  async function _parseXlsxOrCsv(file, ext) {
    if (typeof XLSX !== 'undefined') {
      try {
        var ab = await file.arrayBuffer();
        var wb = XLSX.read(ab, { type: 'array', cellDates: true });
        var firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          return { ok: true, headers: [], rows: [] };
        }
        var ws = wb.Sheets[firstSheetName];
        var rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false, raw: true, cellDates: true });
        return _formatAoaResult(rawRows);
      } catch (xlsxErr) {
        if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
          return await _parseCsvFile(file);
        }
        throw xlsxErr;
      }
    }

    if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      return await _parseCsvFile(file);
    }

    throw new Error('XLSX library not loaded');
  }

  async function _ensurePdfjsLib() {
    if (window._cmtPdfjsLib) return window._cmtPdfjsLib;
    var mod = await import('../modules/pdf.min.mjs');
    mod.GlobalWorkerOptions.workerSrc = new URL('../modules/pdf.worker.min.mjs', location.href).href;
    window._cmtPdfjsLib = mod;
    return mod;
  }

  async function _parsePdf(file) {
    var pdfjsLib = await _ensurePdfjsLib();
    var ab = await file.arrayBuffer();
    var doc = await pdfjsLib.getDocument({
      data: ab,
      standardFontDataUrl: new URL('../modules/standard_fonts/', location.href).href,
      disableFontFace: false,
      useSystemFonts: false
    }).promise;

    var allRows = [];
    var maxCols = 0;

    for (var p = 1; p <= doc.numPages; p++) {
      var page = await doc.getPage(p);
      var textContent = await page.getTextContent();
      var items = textContent.items || [];
      if (!items.length) continue;

      // Filter non-empty items
      var validItems = items.filter(function (it) {
        return it && it.str && it.str.trim() !== '';
      });
      if (!validItems.length) continue;

      // Group into lines by Y coordinate (within 3.5px threshold)
      var lines = [];
      validItems.forEach(function (item) {
        var x = item.transform[4];
        var y = item.transform[5];
        var text = item.str;
        var width = item.width || (text.length * 6);

        var line = lines.find(function (l) { return Math.abs(l.y - y) <= 3.8; });
        if (!line) {
          line = { y: y, items: [] };
          lines.push(line);
        }
        line.items.push({ x: x, y: y, text: text, width: width });
      });

      // Sort lines top to bottom (descending Y in PDF)
      lines.sort(function (a, b) { return b.y - a.y; });

      // Determine column boundaries on this page by clustering X start positions
      var xPositions = [];
      lines.forEach(function (l) {
        l.items.sort(function (a, b) { return a.x - b.x; });
        l.items.forEach(function (it) { xPositions.push(it.x); });
      });
      xPositions.sort(function (a, b) { return a - b; });

      // Cluster close X coordinates into column anchors (cluster radius ~ 14px)
      var colAnchors = [];
      xPositions.forEach(function (x) {
        var anchor = colAnchors.find(function (a) { return Math.abs(a.center - x) <= 14; });
        if (anchor) {
          anchor.count++;
          anchor.sum += x;
          anchor.center = anchor.sum / anchor.count;
        } else {
          colAnchors.push({ center: x, sum: x, count: 1 });
        }
      });
      // Keep anchors that appear across multiple lines/items
      var significantAnchors = colAnchors.filter(function (a) { return a.count >= 2 || colAnchors.length <= 4; });
      significantAnchors.sort(function (a, b) { return a.center - b.center; });

      // Map line items to columns
      lines.forEach(function (l) {
        var rowCells = [];
        if (significantAnchors.length > 1) {
          // Put each item into nearest column anchor
          for (var c = 0; c < significantAnchors.length; c++) rowCells.push([]);
          l.items.forEach(function (item) {
            var bestIdx = 0;
            var bestDist = Infinity;
            significantAnchors.forEach(function (anch, aIdx) {
              var d = Math.abs(anch.center - item.x);
              if (d < bestDist) { bestDist = d; bestIdx = aIdx; }
            });
            rowCells[bestIdx].push(item.text);
          });
          var flatRow = rowCells.map(function (cItems) { return cItems.join(' ').trim(); });
          // Only push if row has at least one non-empty cell
          if (flatRow.some(function (c) { return c !== ''; })) {
            allRows.push(flatRow);
            if (flatRow.length > maxCols) maxCols = flatRow.length;
          }
        } else {
          // Fallback: merge tokens with space or split on wide gap
          var rowText = l.items.map(function (it) { return it.text; }).join(' ').trim();
          if (rowText) {
            var tokens = rowText.split(/\s{2,}|\t/);
            allRows.push(tokens);
            if (tokens.length > maxCols) maxCols = tokens.length;
          }
        }
      });
    }

    if (!allRows.length) return { ok: true, headers: [], rows: [], rawRows: [], isPdf: true, headerRowIdx: 0 };

    // Find best header row (first row with at least 2 non-empty cells)
    var headerRowIdx = 0;
    for (var i = 0; i < Math.min(allRows.length, 8); i++) {
      var filled = allRows[i].filter(function (c) { return c && c.trim() !== ''; }).length;
      if (filled >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    var res = _sliceRowsByHeaderIndex(allRows, headerRowIdx, maxCols);
    res.isPdf = true;
    res.rawRows = allRows;
    res.headerRowIdx = headerRowIdx;
    return res;
  }

  function setStartRow(parsedResult, headerRowIndex) {
    if (!parsedResult || !parsedResult.rawRows || !parsedResult.rawRows.length) return parsedResult;
    var idx = parseInt(headerRowIndex, 10);
    if (isNaN(idx) || idx < 0) idx = 0;
    if (idx >= parsedResult.rawRows.length) idx = parsedResult.rawRows.length - 1;

    var maxCols = 0;
    parsedResult.rawRows.forEach(function (r) {
      if (r && r.length > maxCols) maxCols = r.length;
    });

    var res = _sliceRowsByHeaderIndex(parsedResult.rawRows, idx, maxCols);
    parsedResult.headers = res.headers;
    parsedResult.rows = res.rows;
    parsedResult.headerRowIdx = idx;
    return parsedResult;
  }

  // Apply column mapping to raw rows → array of field-keyed objects
  function applyMapping(rows, headers, mapping, fields) {
    return rows.map(function (row) {
      var obj = {};
      fields.forEach(function (field) {
        var colIdx = mapping[field.key];
        var raw;
        if (colIdx && typeof colIdx === 'object' && colIdx.type === 'manual') {
          raw = colIdx.value;
        } else {
          raw = colIdx !== null && colIdx !== undefined ? row[colIdx] : '';
        }
        if (field.type === 'boolean') {
          if (typeof raw === 'boolean') {
            obj[field.key] = raw;
          } else {
            raw = raw === null || raw === undefined ? '' : String(raw).trim();
            obj[field.key] = /^(1|true|yes|oui|ja|si|y|o)$/i.test(raw);
          }
        } else if (field.type === 'date') {
          raw = raw === null || raw === undefined ? '' : String(raw).trim();
          obj[field.key] = _normalizeDate(raw);
        } else {
          obj[field.key] = raw === null || raw === undefined ? '' : String(raw).trim();
        }
      });
      return obj;
    }).filter(function (obj, idx) {
      var rawRow = rows[idx];
      var hasAnySpreadsheetValue = false;
      var hasAnyMappedSpreadsheetField = false;
      fields.forEach(function (field) {
        var colIdx = mapping[field.key];
        if (colIdx && typeof colIdx === 'object' && colIdx.type === 'manual') {
          // Manual field
        } else if (colIdx !== null && colIdx !== undefined) {
          hasAnyMappedSpreadsheetField = true;
          var raw = rawRow[colIdx];
          if (raw !== '' && raw !== null && raw !== undefined) {
            hasAnySpreadsheetValue = true;
          }
        }
      });
      if (hasAnyMappedSpreadsheetField && !hasAnySpreadsheetValue) return false;

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

  function syncStudentEnrollments(rosterInput, classGroupsMeta) {
    var isArr = Array.isArray(rosterInput);
    var rosterMap = {};
    if (isArr) {
      rosterInput.forEach(function (s) { if (s && s.uuid) rosterMap[s.uuid] = s; });
    } else if (rosterInput && typeof rosterInput === 'object') {
      rosterMap = rosterInput;
    }

    var meta = (classGroupsMeta && typeof classGroupsMeta === 'object') ? classGroupsMeta : {};

    // Map of studentUuid -> array of group enrollments
    var studentEnrollmentsMap = {};

    Object.keys(meta).forEach(function (groupId) {
      var g = meta[groupId] || {};
      var sids = Array.isArray(g.students) ? g.students : [];
      sids.forEach(function (sid) {
        if (!sid) return;
        var uuid = (typeof sid === 'string' && sid.startsWith('st-')) ? sid : (sid.uuid || null);
        if (!uuid) return;
        if (!studentEnrollmentsMap[uuid]) studentEnrollmentsMap[uuid] = [];
        studentEnrollmentsMap[uuid].push({
          groupUuid: groupId,
          groupName: g.name || groupId,
          year: g.year !== undefined ? String(g.year) : '',
          semester: (g.semester === 'all' || g.semester === 'both') ? 'all' : (g.semester !== undefined && g.semester !== '' && !isNaN(Number(g.semester)) ? Number(g.semester) : null),
          level: g.level !== undefined && g.level !== '' ? Number(g.level) : null,
          archived: !!g.archived
        });
      });
    });

    Object.keys(rosterMap).forEach(function (uuid) {
      var student = rosterMap[uuid];
      if (!student) return;
      var activeEnrollments = studentEnrollmentsMap[uuid] || [];
      // Keep any existing historical enrollments that might be from groups not currently in meta
      var existingEnrollments = Array.isArray(student.enrollments) ? student.enrollments : [];
      var combined = [];
      var seenGroupIds = new Set();

      activeEnrollments.forEach(function (e) {
        seenGroupIds.add(e.groupUuid);
        combined.push(Object.assign({}, e, { adminClass: student.adminClass || '' }));
      });

      existingEnrollments.forEach(function (e) {
        if (e && e.groupUuid && !seenGroupIds.has(e.groupUuid)) {
          seenGroupIds.add(e.groupUuid);
          combined.push(e);
        }
      });

      // Sort by year descending, semester descending
      combined.sort(function (a, b) {
        var ya = String(a.year || '');
        var yb = String(b.year || '');
        if (ya !== yb) return yb.localeCompare(ya);
        var sa = (a.semester === 'all' || a.semester === 'both') ? 99 : (a.semester !== null && a.semester !== undefined ? Number(a.semester) || 0 : 0);
        var sb = (b.semester === 'all' || b.semester === 'both') ? 99 : (b.semester !== null && b.semester !== undefined ? Number(b.semester) || 0 : 0);
        return sb - sa;
      });

      student.enrollments = combined;
    });

    return isArr ? Object.values(rosterMap) : rosterMap;
  }

  function findStudentMatches(incoming, rosterInput) {
    var rosterList = Array.isArray(rosterInput) ? rosterInput : Object.values(rosterInput || {});
    var inFn = String(incoming.firstName || '').trim().toUpperCase();
    var inLn = String(incoming.lastName || '').trim().toUpperCase();
    var inKey = (inFn + ' ' + inLn).trim();
    if (!inKey) return [];

    return rosterList.filter(function (s) {
      if (!s) return false;
      var sFn = String(s.firstName || '').trim().toUpperCase();
      var sLn = String(s.lastName || '').trim().toUpperCase();
      var sKey = (sFn + ' ' + sLn).trim();
      return inKey === sKey;
    });
  }

  function buildStudentsFileContent(roster) {
    var arr = Array.isArray(roster) ? roster : Object.values(roster || {});
    return 'const STUDENTS_ROSTER = ' + JSON.stringify(arr, null, 2) + ';\n';
  }

  function buildGroupsFileContent(classGroupsData) {
    return 'const CLASS_GROUPS_DATA = ' + JSON.stringify(classGroupsData, null, 2) + ';\n';
  }

  window.ImportUtils = {
    generateStudentUuid: generateStudentUuid,
    generateGroupUuid: generateGroupUuid,
    normalizeHeader: normalizeHeader,
    autoDetectMapping: autoDetectMapping,
    parseFile: parseFile,
    setStartRow: setStartRow,
    applyMapping: applyMapping,
    loadStudentRoster: loadStudentRoster,
    loadClassGroupsData: loadClassGroupsData,
    buildStudentsFileContent: buildStudentsFileContent,
    buildGroupsFileContent: buildGroupsFileContent,
    syncStudentEnrollments: syncStudentEnrollments,
    findStudentMatches: findStudentMatches
  };
})();

