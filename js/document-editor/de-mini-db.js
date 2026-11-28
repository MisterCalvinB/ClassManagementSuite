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
  let _sortState = { fieldKey: null, direction: null };
  let _panelVisible = false;
  let _pendingData = null;
  let _previewTimer = null;
  let _wired = false;
  const _naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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
      if (global.DeDetach && typeof global.DeDetach.notifyMiniDbChanged === 'function') {
        global.DeDetach.notifyMiniDbChanged(getState());
      }
    } catch (_) {}
  }

  function getState() {
    return JSON.parse(JSON.stringify(_state));
  }

  function applyExternalState(nextState) {
    _state = _normalizeState(nextState);
    renderPanel();
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
    updateSourceStatus();

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
      const isSorted = _sortState.fieldKey === f.key;
      const sortDir = isSorted ? _sortState.direction : null;
      const sortIcon = sortDir === 'desc' ? 'arrow-down.svg' : 'arrow-up.svg';
      const sortTitle = sortDir === 'asc'
        ? _tr('deMiniDbSortDesc', 'Sort descending')
        : _tr('deMiniDbSortAsc', 'Sort ascending');
      html +=
        '<th class="db-th-field" data-field-id="' + _esc(f.id) + '">' +
        '<div class="db-th-top">' +
        '<span class="db-field-label" title="' + _esc(_tr('deMiniDbRenameHint', 'Click to rename field')) + '" data-db-action="rename-field" data-field-id="' + _esc(f.id) + '">' + _esc(f.label) + '</span>' +
        '<div class="db-th-btns">' +
        '<button type="button" class="db-icon-btn db-sort-field-btn' + (isSorted ? ' active' : '') + '" data-db-action="sort-field" data-field-id="' + _esc(f.id) + '" title="' + _esc(sortTitle) + '">' +
        '<img src="../assets/icons/' + sortIcon + '" class="btn-icon" alt="" />' +
        '</button>' +
        '<button type="button" class="db-icon-btn db-del-field-btn" data-db-action="delete-field" data-field-id="' + _esc(f.id) + '" title="' + _esc(_tr('deMiniDbDeleteField', 'Delete field')) + '">' +
        '<img src="../assets/icons/close.svg" class="btn-icon" alt="" />' +
        '</button>' +
        '</div>' +
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
            '<td class="db-td-cell" data-record-index="' + rIdx + '" data-field-key="' + _esc(f.key) + '">' +
            '<input type="text" class="db-cell-input" data-record-id="' + _esc(rec.id) + '" data-field-key="' + _esc(f.key) + '" value="' + _esc(val) + '" placeholder="' + _esc(f.label) + '">' +
            '<span class="db-fill-handle" data-record-index="' + rIdx + '" data-field-key="' + _esc(f.key) + '" title="' + _esc(_tr('deMiniDbFillHandleTitle', 'Drag or double-click to fill (increments numbers; hold Ctrl to copy)')) + '"></span>' +
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
      if (_sortState.fieldKey === oldKey) _sortState.fieldKey = newKey;
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
    if (global.DeDetach && typeof global.DeDetach.notifyMiniDbChanged === 'function') {
      global.DeDetach.notifyMiniDbChanged(getState());
    }
  }

  function deleteField(fieldId) {
    const idx = _state.fields.findIndex(f => f.id === fieldId);
    if (idx === -1) return;
    const removed = _state.fields.splice(idx, 1)[0];
    if (removed && _sortState.fieldKey === removed.key) {
      _sortState = { fieldKey: null, direction: null };
    }
    _state.records.forEach(rec => {
      if (rec.values && removed) delete rec.values[removed.key];
    });
    _markModified();
    renderPanel();
    _schedulePreview();
    if (global.DeDetach && typeof global.DeDetach.notifyMiniDbChanged === 'function') {
      global.DeDetach.notifyMiniDbChanged(getState());
    }
  }

  function _compareFieldValues(aVal, bVal, direction) {
    const sa = String(aVal == null ? '' : aVal).trim();
    const sb = String(bVal == null ? '' : bVal).trim();
    if (sa === '' && sb === '') return 0;
    if (sa === '') return 1;
    if (sb === '') return -1;

    const dir = direction === 'desc' ? -1 : 1;
    const numRe = /^-?\d+(?:\.\d+)?$/;
    if (numRe.test(sa) && numRe.test(sb)) {
      const diff = Number(sa) - Number(sb);
      if (diff !== 0) return diff * dir;
    }
    return _naturalCollator.compare(sa, sb) * dir;
  }

  function sortByField(fieldId) {
    const field = _state.fields.find(f => f.id === fieldId);
    if (!field) return;
    const nextDir = (_sortState.fieldKey === field.key && _sortState.direction === 'asc') ? 'desc' : 'asc';
    _sortState = { fieldKey: field.key, direction: nextDir };

    if (_state.records.length > 1) {
      const activeRec = _state.records[_state.activeRecordIndex] || null;
      _state.records.sort((a, b) => {
        const av = a && a.values ? a.values[field.key] : '';
        const bv = b && b.values ? b.values[field.key] : '';
        return _compareFieldValues(av, bv, nextDir);
      });
      if (activeRec) {
        const newIdx = _state.records.indexOf(activeRec);
        if (newIdx !== -1) _state.activeRecordIndex = newIdx;
      }
      _markModified();
      _schedulePreview();
    }
    renderPanel();
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
    if (global.DeDetach && typeof global.DeDetach.notifyMiniDbChanged === 'function') {
      global.DeDetach.notifyMiniDbChanged(getState());
    }
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
    if (global.DeDetach && typeof global.DeDetach.notifyMiniDbChanged === 'function') {
      global.DeDetach.notifyMiniDbChanged(getState());
    }
  }

  function stepActiveRecord(delta) {
    if (_state.records.length === 0) return;
    const next = (_state.activeRecordIndex + delta + _state.records.length) % _state.records.length;
    setActiveRecord(next);
  }

  function insertTag(tag) {
    if (!tag) return;
    if (global.DeDetach && global.DeDetach.isDetached() && global.DeDetach.sendInsertTag(tag)) return;
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
    _sortState = { fieldKey: null, direction: null };
    _pendingData = null;
    _markModified();
    renderPanel();
    _schedulePreview();
    if (typeof global.showToast === 'function') {
      global.showToast(_tr('deMiniDbClearedToast', 'Mini Database cleared.'));
    }
  }

  function openBatchExport() {
    if (global.DeDetach && global.DeDetach.isDetached() && global.DeDetach.sendOpenBatchExport()) return;
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

    const importClassesBtn = document.getElementById('btn-db-import-classes');
    if (importClassesBtn) {
      importClassesBtn.addEventListener('click', () => {
        if (global.DeDetach && global.DeDetach.isDetached() && global.DeDetach.sendOpenConnectClasses()) return;
        if (typeof global.mpOpenConnectModal === 'function') global.mpOpenConnectModal();
      });
    }

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
        } else if (action === 'sort-field') {
          sortByField(actionEl.getAttribute('data-field-id'));
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

      const computeFillValue = (sourceVal, stepOffset, forceCopy) => {
        if (forceCopy || stepOffset === 0) return sourceVal;
        const str = String(sourceVal == null ? '' : sourceVal);
        if (!str) return str;

        // Pure integer (preserves sign & zero-padding like "001" -> "002")
        const intMatch = str.match(/^(-?)(\d+)$/);
        if (intMatch) {
          const sign = intMatch[1];
          const digits = intMatch[2];
          const base = (sign ? -1 : 1) * parseInt(digits, 10);
          const next = base + stepOffset;
          if (digits.length > 1 && digits.startsWith('0')) {
            const absStr = String(Math.abs(next)).padStart(digits.length, '0');
            return (next < 0 ? '-' : '') + absStr;
          }
          return String(next);
        }

        // Pure decimal (preserves decimal places like "1.5" -> "2.5")
        const decMatch = str.match(/^(-?)(\d+)\.(\d+)$/);
        if (decMatch) {
          const decimals = decMatch[3].length;
          const next = parseFloat(str) + stepOffset;
          return next.toFixed(decimals);
        }

        // Text with trailing integer (e.g. "Item 1" -> "Item 2", "Q01" -> "Q02"),
        // skipping fractions like "18/20".
        const trailMatch = str.match(/^(.*?)(\d+)$/);
        if (trailMatch && !trailMatch[1].endsWith('/')) {
          const prefix = trailMatch[1];
          const digits = trailMatch[2];
          const next = parseInt(digits, 10) + stepOffset;
          if (next >= 0) {
            const formatted = (digits.length > 1 && digits.startsWith('0'))
              ? String(next).padStart(digits.length, '0')
              : String(next);
            return prefix + formatted;
          }
        }

        return str;
      };

      const applyFillRange = (startIdx, endIdx, fieldKey, sourceVal, forceCopy) => {
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        let changed = false;
        for (let i = lo; i <= hi; i++) {
          const rec = _state.records[i];
          if (!rec) continue;
          const val = computeFillValue(sourceVal, i - startIdx, forceCopy);
          if (!rec.values || typeof rec.values !== 'object') rec.values = {};
          if (rec.values[fieldKey] !== val) {
            rec.values[fieldKey] = val;
            changed = true;
          }
          const inp = body.querySelector('td.db-td-cell[data-record-index="' + i + '"][data-field-key="' + CSS.escape(fieldKey) + '"] input.db-cell-input');
          if (inp && inp.value !== val) inp.value = val;
        }
        if (changed) {
          _markModified();
          if (_state.fields[0] && _state.fields[0].key === fieldKey) {
            _renderActiveRecordSelect();
          }
          _schedulePreview();
        }
      };

      body.addEventListener('dblclick', (e) => {
        const handle = e.target.closest('.db-fill-handle');
        if (!handle) return;
        e.preventDefault();
        e.stopPropagation();
        const startIdx = parseInt(handle.getAttribute('data-record-index'), 10);
        const fieldKey = handle.getAttribute('data-field-key');
        const rec = _state.records[startIdx];
        if (Number.isNaN(startIdx) || !fieldKey || !rec) return;
        const val = (rec.values && rec.values[fieldKey] != null) ? String(rec.values[fieldKey]) : '';
        if (_state.records.length - 1 > startIdx) {
          applyFillRange(startIdx, _state.records.length - 1, fieldKey, val, Boolean(e.ctrlKey || e.metaKey));
        }
      });

      body.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.db-fill-handle');
        if (!handle) return;
        e.preventDefault();
        e.stopPropagation();
        const startIdx = parseInt(handle.getAttribute('data-record-index'), 10);
        const fieldKey = handle.getAttribute('data-field-key');
        const rec = _state.records[startIdx];
        if (Number.isNaN(startIdx) || !fieldKey || !rec) return;
        const val = (rec.values && rec.values[fieldKey] != null) ? String(rec.values[fieldKey]) : '';

        const cells = Array.from(body.querySelectorAll('td.db-td-cell[data-field-key="' + CSS.escape(fieldKey) + '"]'));
        const rowRects = cells.map(td => ({
          idx: parseInt(td.getAttribute('data-record-index'), 10),
          td,
          rect: td.getBoundingClientRect()
        }));

        let currentEndIdx = startIdx;
        const sourceTd = handle.closest('td.db-td-cell');
        if (sourceTd) sourceTd.classList.add('db-fill-source');

        const updateHighlights = (endIdx) => {
          currentEndIdx = endIdx;
          const lo = Math.min(startIdx, endIdx);
          const hi = Math.max(startIdx, endIdx);
          rowRects.forEach(item => {
            const inRange = item.idx >= lo && item.idx <= hi && item.idx !== startIdx;
            item.td.classList.toggle('db-fill-target', inRange);
          });
        };

        const onMouseMove = (ev) => {
          let bestIdx = currentEndIdx;
          for (let i = 0; i < rowRects.length; i++) {
            const r = rowRects[i].rect;
            if (ev.clientY >= r.top && ev.clientY <= r.bottom) {
              bestIdx = rowRects[i].idx;
              break;
            }
          }
          if (rowRects.length > 0) {
            if (ev.clientY < rowRects[0].rect.top) bestIdx = rowRects[0].idx;
            else if (ev.clientY > rowRects[rowRects.length - 1].rect.bottom) bestIdx = rowRects[rowRects.length - 1].idx;
          }
          if (bestIdx !== currentEndIdx) updateHighlights(bestIdx);
        };

        const onMouseUp = (ev) => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          document.body.classList.remove('db-filling');
          if (sourceTd) sourceTd.classList.remove('db-fill-source');
          rowRects.forEach(item => item.td.classList.remove('db-fill-target'));
          if (currentEndIdx !== startIdx) {
            applyFillRange(startIdx, currentEndIdx, fieldKey, val, Boolean(ev && (ev.ctrlKey || ev.metaKey)));
          }
        };

        document.body.classList.add('db-filling');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
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
    _sortState = { fieldKey: null, direction: null };
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

  function _ensureRosterField(key, label) {
    let existing = _state.fields.find(f => f.key.toLowerCase() === key.toLowerCase());
    if (!existing) {
      existing = { id: _uid('dbf'), key, label };
      _state.fields.push(existing);
    }
    return existing.key;
  }

  function importFromClasses(classIds, options) {
    const opts = options || {};
    const mp = global.MailpostingService;
    const metas = (global.mpState && global.mpState.classesMeta) || (mp && mp.classesMeta) || {};
    const roster = (global.mpState && global.mpState.studentRoster) || (mp && mp.studentRoster) || {};
    const ids = Array.from(new Set((Array.isArray(classIds) ? classIds : [classIds]).filter(id => id && metas[id])));
    if (ids.length === 0) {
      if (opts.replaceRoster && _state.records.length > 0) {
        _state.records = _state.records.filter(r => !r.values || !r.values.student_id);
        _state.activeRecordIndex = 0;
        renderPanel();
        _markModified();
        _schedulePreview();
      }
      return { added: 0, updated: 0 };
    }

    const kFull = _ensureRosterField('full_name', 'Full Name');
    const kFirst = _ensureRosterField('first_name', 'First Name');
    const kLast = _ensureRosterField('last_name', 'Last Name');
    const kCustom = _ensureRosterField('custom_name', 'Custom Name');
    const kEmail = _ensureRosterField('email', 'Email');
    const kClass = _ensureRosterField('class_name', 'Class');
    const kId = _ensureRosterField('student_id', 'Student ID');

    const incomingKeys = new Set();
    const byComposite = new Map();
    _state.records.forEach(r => {
      const sid = r.values && r.values[kId] ? String(r.values[kId]) : '';
      const cls = r.values && r.values[kClass] ? String(r.values[kClass]) : '';
      if (sid) byComposite.set(sid + '::' + cls, r);
    });

    let added = 0;
    let updated = 0;
    ids.forEach(cid => {
      const cMeta = metas[cid];
      const className = (cMeta && cMeta.name) ? cMeta.name : cid;
      const rawStudents = Array.isArray(cMeta.students) ? cMeta.students : [];
      rawStudents.forEach((rawStu, idx) => {
        const s = mp && typeof mp.normalizeStudent === 'function'
          ? mp.normalizeStudent(rawStu, idx, roster)
          : (typeof rawStu === 'object' ? rawStu : { id: String(rawStu), fullName: String(rawStu) });
        const sid = String(s.id || ('st-' + (idx + 1)));
        const compKey = sid + '::' + className;
        incomingKeys.add(compKey);

        const existingRec = byComposite.get(compKey);
        if (existingRec) {
          existingRec.values[kFull] = s.fullName || '';
          existingRec.values[kFirst] = s.firstName || '';
          existingRec.values[kLast] = s.lastName || '';
          existingRec.values[kCustom] = s.customName || '';
          existingRec.values[kEmail] = s.email || '';
          existingRec.values[kClass] = className;
          existingRec.values[kId] = sid;
          updated++;
        } else {
          const vals = {};
          _state.fields.forEach(f => { vals[f.key] = ''; });
          vals[kFull] = s.fullName || '';
          vals[kFirst] = s.firstName || '';
          vals[kLast] = s.lastName || '';
          vals[kCustom] = s.customName || '';
          vals[kEmail] = s.email || '';
          vals[kClass] = className;
          vals[kId] = sid;
          const newRec = { id: _uid('dbr'), values: vals };
          _state.records.push(newRec);
          byComposite.set(compKey, newRec);
          added++;
        }
      });
    });

    if (opts.replaceRoster) {
      _state.records = _state.records.filter(r => {
        const sid = r.values && r.values[kId] ? String(r.values[kId]) : '';
        const cls = r.values && r.values[kClass] ? String(r.values[kClass]) : '';
        if (!sid) return true;
        return incomingKeys.has(sid + '::' + cls);
      });
    }
    if (_state.activeRecordIndex >= _state.records.length) {
      _state.activeRecordIndex = Math.max(0, _state.records.length - 1);
    }

    renderPanel();
    _markModified();
    _schedulePreview();
    return { added, updated };
  }

  function _recordToStudentObj(rec, idx) {
    const vals = {};
    _state.fields.forEach(f => {
      vals[f.key] = rec.values && rec.values[f.key] != null ? String(rec.values[f.key]) : '';
    });
    const firstKey = _state.fields[0] ? _state.fields[0].key : null;
    const display = (vals.full_name || (firstKey && vals[firstKey]) || ('Record_' + (idx + 1))).trim();
    return {
      id: vals.student_id || rec.id || ('dbr-' + (idx + 1)),
      fullName: vals.full_name || display,
      firstName: vals.first_name || display,
      lastName: vals.last_name || '',
      customName: vals.custom_name || '',
      email: vals.email || '',
      _className: vals.class_name || '',
      _miniDbValues: vals
    };
  }

  function getActiveStudentAndClass() {
    if (_state.fields.length === 0 || _state.records.length === 0) return null;
    const idx = Math.max(0, Math.min(_state.activeRecordIndex, _state.records.length - 1));
    const rec = _state.records[idx];
    if (!rec) return null;
    const student = _recordToStudentObj(rec, idx);
    const className = student._className || '';
    const sameClassStudents = className
      ? _state.records.map((r, i) => _recordToStudentObj(r, i)).filter(s => s._className === className)
      : _state.records.map((r, i) => _recordToStudentObj(r, i));
    return {
      student,
      classInfo: { name: className, students: sameClassStudents }
    };
  }

  function getRecordsForBatch() {
    return _state.records.map((rec, idx) => _recordToStudentObj(rec, idx));
  }

  function getRecordCount() {
    return _state.records.length;
  }

  function getFieldCount() {
    return _state.fields.length;
  }

  const _ROSTER_KEYS = new Set(['full_name', 'first_name', 'last_name', 'custom_name', 'email', 'class_name', 'student_id']);

  function hasCustomFields() {
    return _state.fields.some(f => !_ROSTER_KEYS.has(String(f.key || '').toLowerCase()));
  }

  function getRecordDictForStudent(studentId, className) {
    const sid = String(studentId || '').trim();
    if (!sid || _state.fields.length === 0 || _state.records.length === 0) return null;
    const cls = String(className || '').trim();
    let rec = null;
    if (cls) {
      rec = _state.records.find(r => r.values && String(r.values.student_id || '') === sid && String(r.values.class_name || '') === cls);
    }
    if (!rec) {
      rec = _state.records.find(r => r.values && String(r.values.student_id || '') === sid);
    }
    if (!rec || !rec.values) return null;
    const out = {};
    _state.fields.forEach(f => {
      out[f.key] = rec.values[f.key] != null ? String(rec.values[f.key]) : '';
    });
    return out;
  }

  function resolvePreviewContext(mpStateObj, useSampleFallback) {
    const hasRoster = Boolean(mpStateObj && mpStateObj.connectedClass && Array.isArray(mpStateObj.studentList) && mpStateObj.studentList.length > 0);
    if (hasRoster) {
      const idx = mpStateObj.previewStudentIndex || 0;
      const activeStudent = mpStateObj.studentList[idx] || mpStateObj.studentList[0];
      const activeClass = mpStateObj.connectedClass;
      const matched = activeStudent ? getRecordDictForStudent(activeStudent.id, activeClass && activeClass.name) : null;
      return {
        activeStudent,
        activeClass,
        miniDbRecord: matched || getActiveRecordDict()
      };
    }
    if (_state.records.length > 0 && _state.fields.length > 0) {
      const dbCtx = getActiveStudentAndClass();
      if (dbCtx) {
        return {
          activeStudent: dbCtx.student,
          activeClass: dbCtx.classInfo,
          miniDbRecord: getActiveRecordDict()
        };
      }
    }
    if (useSampleFallback) {
      return {
        activeStudent: {
          id: 'st-sample',
          firstName: 'Jane',
          lastName: 'Doe',
          fullName: 'Jane Doe',
          customName: 'Janie',
          email: 'jane.doe@school.edu'
        },
        activeClass: {
          name: 'Class 101 (Sample)',
          students: [
            { id: 'st-1', firstName: 'Alex', lastName: 'Smith', fullName: 'Alex Smith', email: 'alex.smith@school.edu' },
            { id: 'st-2', firstName: 'Emma', lastName: 'Johnson', fullName: 'Emma Johnson', email: 'emma.johnson@school.edu' },
            { id: 'st-3', firstName: 'Lucas', lastName: 'Brown', fullName: 'Lucas Brown', email: 'lucas.brown@school.edu' }
          ]
        },
        miniDbRecord: getActiveRecordDict()
      };
    }
    return {
      activeStudent: {},
      activeClass: {},
      miniDbRecord: getActiveRecordDict()
    };
  }

  function updateSourceStatus() {
    const el = document.getElementById('db-source-status');
    if (!el) return;
    const mp = global.mpState;
    const hasRoster = Boolean(mp && mp.connectedClass && Array.isArray(mp.studentList) && mp.studentList.length > 0);
    const hasDb = _state.records.length > 0 && _state.fields.length > 0;
    if (!hasRoster || !hasDb) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    const matchedCount = mp.studentList.filter(s => Boolean(getRecordDictForStudent(s.id, mp.connectedClass.name))).length;
    if (matchedCount > 0) {
      el.textContent = _tr('deMiniDbSourceDualMatched', 'Class Roster drives {{student.*}} · Mini DB drives {{db.*}} ({matched}/{total} students matched).')
        .replace('{matched}', String(matchedCount))
        .replace('{total}', String(mp.studentList.length));
    } else {
      el.textContent = _tr('deMiniDbSourceDual', 'Class Roster drives {{student.*}} · Active Mini DB record drives {{db.*}}.');
    }
    el.hidden = false;
  }

  global.DeMiniDb = {
    wireEvents,
    togglePanel,
    renderPanel,
    addField,
    renameField,
    deleteField,
    sortByField,
    addRecord,
    deleteRecord,
    setActiveRecord,
    insertTag,
    openBatchExport,
    clearAll,
    openImportModal,
    parseDelimitedText,
    importRows,
    importFromClasses,
    extractFromContent,
    injectIntoContent,
    applyPendingOrReset,
    reset,
    getState,
    applyExternalState,
    getActiveRecordDict,
    getRecordDictForStudent,
    resolvePreviewContext,
    updateSourceStatus,
    hasCustomFields,
    getActiveStudentAndClass,
    getAvailableTags,
    getRecordsForBatch,
    getRecordCount,
    getFieldCount
  };
})(typeof window !== 'undefined' ? window : this);
