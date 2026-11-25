/**
 * DeMiniDb - Per-document Mini Database panel for Document Editor.
 * Allows creating custom fields and records saved inside the document,
 * inserting {{db.field}} placeholders like Mailposting, live previewing,
 * and batch exporting per record.
 */
(function (global) {
  'use strict';

  const MINI_DB_ATTR = 'data-cmt-mini-db="true"';
  const MINI_DB_REGEX = /<script\b[^>]*data-cmt-mini-db="true"[^>]*>([\s\S]*?)<\/script>\s*/gi;

  let _state = {
    fields: [],   // [{ id, key, label }]
    records: [],  // [{ id, values: { [key]: string } }]
    activeRecordIndex: 0
  };
  let _panelVisible = false;
  let _pendingData = null;
  let _previewTimer = null;
  let _wired = false;

  function _tr(key, fallback) {
    try {
      if (global.i18n && typeof global.i18n.t === 'function') {
        const v = global.i18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (_) {}
    return fallback;
  }

  function _esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _uid(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return prefix + '-' + global.crypto.randomUUID().slice(0, 8);
    }
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  function _sanitizeKey(rawLabel, excludeId) {
    let base = String(rawLabel || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!base) base = 'field';
    if (/^[0-9]/.test(base)) base = 'f_' + base;

    let candidate = base;
    let counter = 2;
    const exists = (k) => _state.fields.some(f => f.id !== excludeId && f.key.toLowerCase() === k.toLowerCase());
    while (exists(candidate)) {
      candidate = base + '_' + counter;
      counter++;
    }
    return candidate;
  }

  function _markModified() {
    try {
      if (typeof global.docModified !== 'undefined') {
        global.docModified = true;
      }
      if (typeof global.updateDocIndicator === 'function') {
        global.updateDocIndicator();
      }
    } catch (_) {}
  }

  function _schedulePreview() {
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => {
      _previewTimer = null;
      if (typeof global.renderPreview === 'function') {
        global.renderPreview();
      }
    }, 120);
  }

  function _normalizeState(data) {
    if (!data || typeof data !== 'object') {
      return { fields: [], records: [], activeRecordIndex: 0 };
    }
    const fields = [];
    const seenKeys = new Set();
    if (Array.isArray(data.fields)) {
      data.fields.forEach((f, idx) => {
        if (!f || typeof f !== 'object') return;
        const label = String(f.label || f.key || ('Field ' + (idx + 1))).trim();
        let key = String(f.key || '').trim().replace(/[^\w-]/g, '_');
        if (!key) key = 'field_' + (idx + 1);
        while (seenKeys.has(key.toLowerCase())) {
          key = key + '_2';
        }
        seenKeys.add(key.toLowerCase());
        fields.push({
          id: String(f.id || _uid('dbf')),
          key,
          label: label || key
        });
      });
    }

    const records = [];
    if (Array.isArray(data.records)) {
      data.records.forEach((r) => {
        if (!r || typeof r !== 'object') return;
        const values = {};
        const srcVals = (r.values && typeof r.values === 'object') ? r.values : {};
        fields.forEach(f => {
          values[f.key] = srcVals[f.key] != null ? String(srcVals[f.key]) : '';
        });
        records.push({
          id: String(r.id || _uid('dbr')),
          values
        });
      });
    }

    let idx = parseInt(data.activeRecordIndex, 10);
    if (!Number.isFinite(idx) || idx < 0) idx = 0;
    if (records.length > 0 && idx >= records.length) idx = records.length - 1;
    if (records.length === 0) idx = 0;

    return { fields, records, activeRecordIndex: idx };
  }

  function _updateCountBadge() {
    const badge = document.getElementById('db-panel-count');
    if (badge) {
      const count = _state.fields.length;
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
    const batchBtn = document.getElementById('btn-db-batch-export');
    if (batchBtn) {
      batchBtn.disabled = _state.records.length === 0 || _state.fields.length === 0;
    }
    const clearBtn = document.getElementById('btn-db-clear');
    if (clearBtn) {
      clearBtn.disabled = _state.records.length === 0 && _state.fields.length === 0;
    }
  }

  function _renderActiveRecordSelect() {
    const sel = document.getElementById('db-active-record-select');
    if (!sel) return;
    if (_state.records.length === 0) {
      sel.innerHTML = '<option value="0">' + _esc(_tr('deMiniDbNoRecords', 'No records')) + '</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    const firstKey = _state.fields[0] ? _state.fields[0].key : null;
    sel.innerHTML = _state.records.map((rec, i) => {
      const previewVal = firstKey && rec.values[firstKey] ? String(rec.values[firstKey]).trim() : '';
      const label = previewVal
        ? ('#' + (i + 1) + ' — ' + previewVal.slice(0, 28))
        : (_tr('deMiniDbRecordN', 'Record #{n}').replace('{n}', String(i + 1)));
      return '<option value="' + i + '"' + (i === _state.activeRecordIndex ? ' selected' : '') + '>' + _esc(label) + '</option>';
    }).join('');
  }

  function renderPanel() {
    _updateCountBadge();
    _renderActiveRecordSelect();

    const body = document.getElementById('db-panel-body');
    if (!body) return;

    if (_state.fields.length === 0) {
      body.innerHTML =
        '<div class="db-empty-state">' +
        '<span>' + _esc(_tr('deMiniDbEmptyHint', 'Add fields above (e.g. title, date, score) to build your mini database. Click any field tag to insert {{db.field}} into your document.')) + '</span>' +
        '</div>';
      return;
    }

    let html = '<table class="db-table"><thead><tr>';
    html += '<th class="db-th-idx" title="' + _esc(_tr('deMiniDbActiveRecord', 'Active preview record')) + '">#</th>';

    _state.fields.forEach((f) => {
      const tag = '{{db.' + f.key + '}}';
      html +=
        '<th class="db-th-field" data-field-id="' + _esc(f.id) + '">' +
        '<div class="db-th-top">' +
        '<span class="db-field-label" title="' + _esc(_tr('deMiniDbRenameHint', 'Click to rename field')) + '" data-db-action="rename-field" data-field-id="' + _esc(f.id) + '">' + _esc(f.label) + '</span>' +
        '<button type="button" class="db-icon-btn db-del-field-btn" data-db-action="delete-field" data-field-id="' + _esc(f.id) + '" title="' + _esc(_tr('deMiniDbDeleteField', 'Delete field')) + '">' +
        '<img src="../assets/icons/close.svg" class="btn-icon" alt="" />' +
        '</button>' +
        '</div>' +
        '<button type="button" class="db-field-tag-btn" data-db-action="insert-tag" data-db-tag="' + _esc(tag) + '" title="' + _esc(_tr('deMiniDbInsertTagTitle', 'Insert placeholder at cursor')) + '">' +
        '<code>' + _esc(tag) + '</code>' +
        '</button>' +
        '</th>';
    });

    html += '<th class="db-th-actions"></th>';
    html += '</tr></thead><tbody>';

    if (_state.records.length === 0) {
      html += '<tr><td colspan="' + (_state.fields.length + 2) + '" class="db-no-rows">' +
        _esc(_tr('deMiniDbNoRowsHint', 'No records yet. Click "+ Record" to add a row.')) +
        '</td></tr>';
    } else {
      _state.records.forEach((rec, rIdx) => {
        const isActive = rIdx === _state.activeRecordIndex;
        html += '<tr class="db-row' + (isActive ? ' active' : '') + '" data-record-index="' + rIdx + '">';
        html +=
          '<td class="db-td-idx">' +
          '<button type="button" class="db-row-pick-btn' + (isActive ? ' active' : '') + '" data-db-action="select-record" data-record-index="' + rIdx + '" title="' + _esc(_tr('deMiniDbPreviewRow', 'Preview this record')) + '">' +
          (rIdx + 1) +
          '</button>' +
          '</td>';

        _state.fields.forEach((f) => {
          const val = rec.values[f.key] != null ? rec.values[f.key] : '';
          html +=
            '<td class="db-td-cell">' +
            '<input type="text" class="db-cell-input" data-record-id="' + _esc(rec.id) + '" data-field-key="' + _esc(f.key) + '" value="' + _esc(val) + '" placeholder="' + _esc(f.label) + '">' +
            '</td>';
        });

        html +=
          '<td class="db-td-actions">' +
          '<button type="button" class="db-icon-btn db-del-row-btn" data-db-action="delete-record" data-record-id="' + _esc(rec.id) + '" title="' + _esc(_tr('deMiniDbDeleteRecord', 'Delete record')) + '">' +
          '<img src="../assets/icons/trash.svg" class="btn-icon" alt="" />' +
          '</button>' +
          '</td>';
        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    body.innerHTML = html;
  }

  function addField(rawLabel) {
    const label = String(rawLabel || '').trim();
    if (!label) return false;
    const key = _sanitizeKey(label, null);
    const id = _uid('dbf');
    _state.fields.push({ id, key, label });
    _state.records.forEach(rec => {
      if (!rec.values || typeof rec.values !== 'object') rec.values = {};
      if (rec.values[key] === undefined) rec.values[key] = '';
    });
    if (_state.records.length === 0) {
      addRecord(true);
    }
    _markModified();
    renderPanel();
    _schedulePreview();
    return true;
  }

  async function renameField(fieldId) {
    const field = _state.fields.find(f => f.id === fieldId);
    if (!field) return;
    let nextLabel = null;
    if (typeof global.showPrompt === 'function') {
      nextLabel = await global.showPrompt(_tr('deMiniDbRenamePrompt', 'Rename field:'), field.label);
    }
    if (nextLabel == null) return;
    const trimmed = String(nextLabel).trim();
    if (!trimmed || trimmed === field.label) return;

    const oldKey = field.key;
    const newKey = _sanitizeKey(trimmed, field.id);
    field.label = trimmed;
    field.key = newKey;

    if (oldKey !== newKey) {
      _state.records.forEach(rec => {
        if (rec.values && Object.prototype.hasOwnProperty.call(rec.values, oldKey)) {
          rec.values[newKey] = rec.values[oldKey];
          delete rec.values[oldKey];
        }
      });
    }
    _markModified();
    renderPanel();
    _schedulePreview();
  }

  function deleteField(fieldId) {
    const idx = _state.fields.findIndex(f => f.id === fieldId);
    if (idx === -1) return;
    const removed = _state.fields.splice(idx, 1)[0];
    _state.records.forEach(rec => {
      if (rec.values && removed) delete rec.values[removed.key];
    });
    _markModified();
    renderPanel();
    _schedulePreview();
  }

  function addRecord(silent) {
    if (_state.fields.length === 0) {
      if (!silent && typeof global.showToast === 'function') {
        global.showToast(_tr('deMiniDbAddFieldFirst', 'Add at least one field first.'), true);
      }
      return null;
    }
    const values = {};
    _state.fields.forEach(f => { values[f.key] = ''; });
    const rec = { id: _uid('dbr'), values };
    _state.records.push(rec);
    _state.activeRecordIndex = _state.records.length - 1;
    if (!silent) {
      _markModified();
      renderPanel();
      _schedulePreview();
    }
    return rec;
  }

  function deleteRecord(recordId) {
    const idx = _state.records.findIndex(r => r.id === recordId);
    if (idx === -1) return;
    _state.records.splice(idx, 1);
    if (_state.activeRecordIndex >= _state.records.length) {
      _state.activeRecordIndex = Math.max(0, _state.records.length - 1);
    }
    _markModified();
    renderPanel();
    _schedulePreview();
  }

  function setActiveRecord(index) {
    const idx = parseInt(index, 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= _state.records.length) return;
    if (_state.activeRecordIndex === idx) return;
    _state.activeRecordIndex = idx;

    // In-place highlight update without rebuilding the table DOM
    const sel = document.getElementById('db-active-record-select');
    if (sel && sel.value !== String(idx)) sel.value = String(idx);
    const body = document.getElementById('db-panel-body');
    if (body) {
      body.querySelectorAll('tr.db-row').forEach(tr => {
        const rIdx = parseInt(tr.getAttribute('data-record-index'), 10);
        const active = rIdx === idx;
        tr.classList.toggle('active', active);
        const btn = tr.querySelector('.db-row-pick-btn');
        if (btn) btn.classList.toggle('active', active);
      });
    }
    _schedulePreview();
  }

  function stepActiveRecord(delta) {
    if (_state.records.length === 0) return;
    const next = (_state.activeRecordIndex + delta + _state.records.length) % _state.records.length;
    setActiveRecord(next);
  }

  function insertTag(tag) {
    if (!tag) return;
    if (typeof global.mpInsertTagAtCursor === 'function') {
      global.mpInsertTagAtCursor(tag);
    } else if (typeof global.insertTextAtCursor === 'function') {
      global.insertTextAtCursor(tag);
    }
  }

  function togglePanel(forceState) {
    const wrapper = document.getElementById('db-panel-wrapper');
    const btn = document.getElementById('btn-toggle-db-panel');
    if (!wrapper) return;
    _panelVisible = typeof forceState === 'boolean' ? forceState : !_panelVisible;
    wrapper.classList.toggle('visible', _panelVisible);
    if (btn) btn.classList.toggle('active', _panelVisible);
    if (_panelVisible) renderPanel();
  }

  async function clearAll() {
    if (_state.fields.length === 0 && _state.records.length === 0) return;
    if (typeof global.showConfirm === 'function') {
      const ok = await global.showConfirm(_tr('deMiniDbClearConfirm', 'Clear all fields and records from this document\'s Mini Database?'));
      if (!ok) return;
    }
    _state = { fields: [], records: [], activeRecordIndex: 0 };
    _pendingData = null;
    _markModified();
    renderPanel();
    _schedulePreview();
    if (typeof global.showToast === 'function') {
      global.showToast(_tr('deMiniDbClearedToast', 'Mini Database cleared.'));
    }
  }

  function openBatchExport() {
    if (_state.records.length === 0 || _state.fields.length === 0) {
      if (typeof global.showToast === 'function') {
        global.showToast(_tr('deMiniDbNoRecordsExport', 'Add at least one field and one record before batch exporting.'), true);
      }
      return;
    }
    if (typeof global.mpOpenExportModal === 'function') {
      global.mpOpenExportModal('@minidb@');
    }
  }

  function wireEvents() {
    if (_wired) return;
    _wired = true;

    const toggleBtn = document.getElementById('btn-toggle-db-panel');
    if (toggleBtn) toggleBtn.addEventListener('click', () => togglePanel());

    const addFieldBtn = document.getElementById('btn-db-add-field');
    const fieldInput = document.getElementById('db-new-field-input');
    const handleAddField = () => {
      if (!fieldInput) return;
      if (addField(fieldInput.value)) {
        fieldInput.value = '';
        fieldInput.focus();
      }
    };
    if (addFieldBtn) addFieldBtn.addEventListener('click', handleAddField);
    if (fieldInput) {
      fieldInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddField();
        }
      });
    }

    const addRecBtn = document.getElementById('btn-db-add-record');
    if (addRecBtn) addRecBtn.addEventListener('click', () => addRecord(false));

    const prevRecBtn = document.getElementById('btn-db-prev-record');
    if (prevRecBtn) prevRecBtn.addEventListener('click', () => stepActiveRecord(-1));

    const nextRecBtn = document.getElementById('btn-db-next-record');
    if (nextRecBtn) nextRecBtn.addEventListener('click', () => stepActiveRecord(1));

    const recSelect = document.getElementById('db-active-record-select');
    if (recSelect) {
      recSelect.addEventListener('change', () => setActiveRecord(recSelect.value));
    }

    const batchBtn = document.getElementById('btn-db-batch-export');
    if (batchBtn) batchBtn.addEventListener('click', openBatchExport);

    const clearBtn = document.getElementById('btn-db-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearAll);

    const importBtn = document.getElementById('btn-db-import');
    if (importBtn) importBtn.addEventListener('click', () => openImportModal());

    const importClose = document.getElementById('db-import-close');
    if (importClose) importClose.addEventListener('click', closeImportModal);
    const importCancel = document.getElementById('btn-db-import-cancel');
    if (importCancel) importCancel.addEventListener('click', closeImportModal);
    const importOverlay = document.getElementById('db-import-modal');
    if (importOverlay) {
      importOverlay.addEventListener('click', (e) => {
        if (e.target === importOverlay) closeImportModal();
      });
    }
    const importConfirm = document.getElementById('btn-db-import-confirm');
    if (importConfirm) importConfirm.addEventListener('click', confirmImportModal);

    const importTextarea = document.getElementById('db-import-textarea');
    const importDelim = document.getElementById('db-import-delimiter');
    const importHeader = document.getElementById('db-import-has-header');
    if (importTextarea) importTextarea.addEventListener('input', updateImportSummary);
    if (importDelim) importDelim.addEventListener('change', updateImportSummary);
    if (importHeader) importHeader.addEventListener('change', updateImportSummary);

    const importFileInput = document.getElementById('db-import-file-input');
    if (importFileInput) {
      importFileInput.addEventListener('change', handleImportFileSelect);
    }

    const wrapper = document.getElementById('db-panel-wrapper');
    const body = document.getElementById('db-panel-body');
    if (wrapper) {
      wrapper.addEventListener('mousedown', (e) => {
        if (!e.target.closest('input, select, textarea, button, a') && body) {
          setTimeout(() => body.focus(), 0);
        }
      });
      wrapper.addEventListener('paste', (e) => {
        const clip = e.clipboardData || global.clipboardData;
        const text = clip ? clip.getData('text/plain') : '';
        if (!text) return;
        const isCellInput = e.target && e.target.closest && e.target.closest('input.db-cell-input, #db-new-field-input');
        const isMultiCell = text.indexOf('\t') !== -1 || text.indexOf('\n') !== -1 || text.indexOf('\r') !== -1;
        if (!isCellInput || isMultiCell) {
          e.preventDefault();
          e.stopPropagation();
          openImportModal(text);
        }
      }, true);
    }
    if (body) {
      body.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-db-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-db-action');
        if (action === 'insert-tag') {
          insertTag(actionEl.getAttribute('data-db-tag'));
        } else if (action === 'delete-field') {
          deleteField(actionEl.getAttribute('data-field-id'));
        } else if (action === 'rename-field') {
          renameField(actionEl.getAttribute('data-field-id'));
        } else if (action === 'select-record') {
          setActiveRecord(actionEl.getAttribute('data-record-index'));
        } else if (action === 'delete-record') {
          deleteRecord(actionEl.getAttribute('data-record-id'));
        }
      });

      body.addEventListener('input', (e) => {
        const input = e.target.closest('input.db-cell-input');
        if (!input) return;
        const recId = input.getAttribute('data-record-id');
        const key = input.getAttribute('data-field-key');
        const rec = _state.records.find(r => r.id === recId);
        if (!rec) return;
        if (!rec.values || typeof rec.values !== 'object') rec.values = {};
        rec.values[key] = input.value;
        _markModified();
        // Update active record select label in-place if first field changed
        if (_state.fields[0] && _state.fields[0].key === key) {
          _renderActiveRecordSelect();
        }
        _schedulePreview();
      });
    }
  }

  function _detectDelimiter(text) {
    const sample = String(text || '').split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 8);
    if (sample.length === 0) return '\t';
    const countOutsideQuotes = (line, ch) => {
      let inQ = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQ = !inQ;
        else if (!inQ && c === ch) count++;
      }
      return count;
    };
    const sumFor = (ch) => sample.reduce((acc, l) => acc + countOutsideQuotes(l, ch), 0);
    const tabs = sumFor('\t');
    if (tabs > 0) return '\t';
    const semis = sumFor(';');
    const commas = sumFor(',');
    if (semis > commas) return ';';
    if (commas > 0) return ',';
    return '\t';
  }

  function parseDelimitedText(text, delimMode) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    if (!raw.trim()) return [];
    let delim = '\t';
    if (delimMode === 'comma') delim = ',';
    else if (delimMode === 'semicolon') delim = ';';
    else if (delimMode === 'tab') delim = '\t';
    else delim = _detectDelimiter(raw);

    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      const next = i + 1 < raw.length ? raw[i + 1] : '';

      if (inQuotes) {
        if (ch === '"') {
          if (next === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"' && cell.length === 0) {
        inQuotes = true;
        continue;
      }

      if (ch === delim) {
        row.push(cell);
        cell = '';
        continue;
      }

      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        continue;
      }

      cell += ch;
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    // Trim trailing completely empty rows
    while (rows.length > 0 && rows[rows.length - 1].every(c => String(c).trim() === '')) {
      rows.pop();
    }
    return rows;
  }

  function importRows(rows, options) {
    if (!Array.isArray(rows) || rows.length === 0) return { fields: 0, records: 0 };
    const opts = options || {};
    const hasHeader = opts.hasHeader !== false;
    const mode = opts.mode === 'append' ? 'append' : 'replace';

    const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    if (maxCols === 0) return { fields: 0, records: 0 };

    const headerRow = hasHeader ? rows[0] : null;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    if (mode === 'replace' || _state.fields.length === 0) {
      _state.fields = [];
      _state.records = [];
      _state.activeRecordIndex = 0;

      for (let c = 0; c < maxCols; c++) {
        const rawLabel = headerRow ? String(headerRow[c] || '').trim() : '';
        const label = rawLabel || ('Field ' + (c + 1));
        const id = _uid('dbf');
        const key = _sanitizeKey(label, id);
        _state.fields.push({ id, key, label });
      }

      dataRows.forEach(r => {
        const values = {};
        _state.fields.forEach((f, idx) => {
          values[f.key] = r[idx] != null ? String(r[idx]) : '';
        });
        _state.records.push({ id: _uid('dbr'), values });
      });
    } else {
      // Append mode: match by header name (case-insensitive) or column index
      const colToField = [];
      for (let c = 0; c < maxCols; c++) {
        let targetField = null;
        if (headerRow) {
          const hName = String(headerRow[c] || '').trim().toLowerCase();
          if (hName) {
            targetField = _state.fields.find(f =>
              f.label.toLowerCase() === hName || f.key.toLowerCase() === hName
            ) || null;
          }
        } else if (c < _state.fields.length) {
          targetField = _state.fields[c];
        }

        if (!targetField) {
          const rawLabel = headerRow ? String(headerRow[c] || '').trim() : '';
          const label = rawLabel || ('Field ' + (c + 1));
          const id = _uid('dbf');
          const key = _sanitizeKey(label, id);
          targetField = { id, key, label };
          _state.fields.push(targetField);
          _state.records.forEach(rec => {
            if (!rec.values) rec.values = {};
            rec.values[key] = '';
          });
        }
        colToField.push(targetField);
      }

      dataRows.forEach(r => {
        const values = {};
        _state.fields.forEach(f => { values[f.key] = ''; });
        colToField.forEach((f, idx) => {
          if (r[idx] != null) values[f.key] = String(r[idx]);
        });
        _state.records.push({ id: _uid('dbr'), values });
      });
    }

    if (_state.records.length > 0 && _state.activeRecordIndex >= _state.records.length) {
      _state.activeRecordIndex = 0;
    }

    _markModified();
    renderPanel();
    _schedulePreview();
    return { fields: _state.fields.length, records: dataRows.length };
  }

  function updateImportSummary() {
    const summaryEl = document.getElementById('db-import-summary');
    const ta = document.getElementById('db-import-textarea');
    const delim = document.getElementById('db-import-delimiter');
    const hasHeader = document.getElementById('db-import-has-header');
    if (!summaryEl || !ta) return;

    const rows = parseDelimitedText(ta.value, delim ? delim.value : 'auto');
    if (rows.length === 0) {
      summaryEl.textContent = '';
      return;
    }
    const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const recCount = (hasHeader && hasHeader.checked) ? Math.max(0, rows.length - 1) : rows.length;
    summaryEl.textContent = _tr('deMiniDbImportSummary', '{fields} fields, {records} records')
      .replace('{fields}', String(cols))
      .replace('{records}', String(recCount));
  }

  function openImportModal(prefillText) {
    const ta = document.getElementById('db-import-textarea');
    const fileIn = document.getElementById('db-import-file-input');
    if (fileIn) fileIn.value = '';
    if (ta) ta.value = typeof prefillText === 'string' ? prefillText : '';

    const appendRadio = document.querySelector('input[name="db-import-mode"][value="append"]');
    const replaceRadio = document.querySelector('input[name="db-import-mode"][value="replace"]');
    if (_state.fields.length === 0 && replaceRadio) replaceRadio.checked = true;
    else if (appendRadio && _state.fields.length > 0 && replaceRadio) replaceRadio.checked = true;

    updateImportSummary();
    if (typeof global.showModal === 'function') global.showModal('db-import-modal');
    if (ta) setTimeout(() => ta.focus(), 30);
  }

  function closeImportModal() {
    if (typeof global.hideModal === 'function') global.hideModal('db-import-modal');
  }

  function handleImportFileSelect(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    const ta = document.getElementById('db-import-textarea');
    if (!ta) return;

    if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => {
        ta.value = String(reader.result || '');
        updateImportSummary();
      };
      reader.readAsText(file);
      return;
    }

    if (typeof global.XLSX !== 'undefined') {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wb = global.XLSX.read(new Uint8Array(reader.result), { type: 'array' });
          const firstSheet = wb.SheetNames && wb.SheetNames[0];
          if (!firstSheet) return;
          const csv = global.XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet], { FS: '\t' });
          const delimSel = document.getElementById('db-import-delimiter');
          if (delimSel) delimSel.value = 'tab';
          ta.value = csv;
          updateImportSummary();
        } catch (err) {
          if (typeof global.showToast === 'function') {
            global.showToast(_tr('deMiniDbImportFileErr', 'Could not read spreadsheet file: ') + (err.message || err), true);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  function confirmImportModal() {
    const ta = document.getElementById('db-import-textarea');
    const delim = document.getElementById('db-import-delimiter');
    const hasHeader = document.getElementById('db-import-has-header');
    const modeEl = document.querySelector('input[name="db-import-mode"]:checked');

    const rows = parseDelimitedText(ta ? ta.value : '', delim ? delim.value : 'auto');
    if (rows.length === 0) {
      if (typeof global.showToast === 'function') {
        global.showToast(_tr('deMiniDbImportEmpty', 'Paste or load spreadsheet data first.'), true);
      }
      return;
    }

    const res = importRows(rows, {
      hasHeader: hasHeader ? hasHeader.checked : true,
      mode: modeEl ? modeEl.value : 'replace'
    });
    closeImportModal();
    if (!_panelVisible) togglePanel(true);
    if (typeof global.showToast === 'function') {
      global.showToast(_tr('deMiniDbImportSuccess', 'Imported {records} records ({fields} fields).')
        .replace('{records}', String(res.records))
        .replace('{fields}', String(res.fields)));
    }
  }

  function extractFromContent(rawContent) {
    let parsed = null;
    const stripped = String(rawContent || '').replace(MINI_DB_REGEX, function (_m, jsonText) {
      try {
        const cleaned = String(jsonText || '').split('<\\' + '/script').join('<' + '/script').trim();
        if (cleaned) {
          parsed = JSON.parse(cleaned);
        }
      } catch (e) {
        console.warn('[DeMiniDb] Failed to parse embedded mini DB:', e);
      }
      return '';
    });
    _pendingData = parsed;
    return { content: stripped, dbData: parsed };
  }

  function injectIntoContent(content, _docType) {
    if (_state.fields.length === 0 && _state.records.length === 0) {
      return content;
    }
    const payload = JSON.stringify({
      version: 1,
      fields: _state.fields,
      records: _state.records,
      activeRecordIndex: _state.activeRecordIndex
    });
    const safeJson = payload.split('<' + '/script').join('<\\' + '/script');
    const tag = '<' + 'script type="application/json" ' + MINI_DB_ATTR + '>\n' + safeJson + '\n<' + '/script>';
    if (/<\/body>/i.test(content)) {
      return content.replace(/<\/body>/i, function () { return tag + '\n</body>'; });
    }
    return content + '\n' + tag;
  }

  function applyPendingOrReset() {
    _state = _normalizeState(_pendingData);
    _pendingData = null;
    renderPanel();
  }

  function reset() {
    _pendingData = null;
    _state = { fields: [], records: [], activeRecordIndex: 0 };
    renderPanel();
  }

  function getActiveRecordDict() {
    if (_state.fields.length === 0 || _state.records.length === 0) return {};
    const rec = _state.records[_state.activeRecordIndex] || _state.records[0];
    if (!rec || !rec.values) return {};
    const out = {};
    _state.fields.forEach(f => {
      out[f.key] = rec.values[f.key] != null ? String(rec.values[f.key]) : '';
    });
    return out;
  }

  function getAvailableTags() {
    return _state.fields.map(f => ({
      id: 'db.' + f.key,
      label: f.label,
      tag: '{{db.' + f.key + '}}',
      category: 'Mini DB'
    }));
  }

  function getRecordsForBatch() {
    const firstKey = _state.fields[0] ? _state.fields[0].key : null;
    return _state.records.map((rec, idx) => {
      const vals = {};
      _state.fields.forEach(f => {
        vals[f.key] = rec.values && rec.values[f.key] != null ? String(rec.values[f.key]) : '';
      });
      const display = (firstKey && vals[firstKey]) ? vals[firstKey].trim() : ('Record_' + (idx + 1));
      return {
        id: rec.id || ('dbr-' + (idx + 1)),
        fullName: display,
        firstName: display,
        lastName: '',
        email: '',
        _miniDbValues: vals
      };
    });
  }

  function getRecordCount() {
    return _state.records.length;
  }

  function getFieldCount() {
    return _state.fields.length;
  }

  global.DeMiniDb = {
    wireEvents,
    togglePanel,
    renderPanel,
    addField,
    renameField,
    deleteField,
    addRecord,
    deleteRecord,
    setActiveRecord,
    insertTag,
    openBatchExport,
    clearAll,
    openImportModal,
    parseDelimitedText,
    importRows,
    extractFromContent,
    injectIntoContent,
    applyPendingOrReset,
    reset,
    getActiveRecordDict,
    getAvailableTags,
    getRecordsForBatch,
    getRecordCount,
    getFieldCount
  };
})(typeof window !== 'undefined' ? window : this);
