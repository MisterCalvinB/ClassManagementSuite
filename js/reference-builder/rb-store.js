/**
 * js/reference-builder/rb-store.js
 * Persistence, search indexing, and data model for Reference Builder.
 * Stores index.json + manuals/<id>.json in user/references/ via electron-bridge.js,
 * with localStorage fallback for standalone browser mode.
 */
(function (root) {
  'use strict';

  var INDEX_FILE = 'index.json';
  var LS_INDEX_KEY = 'cmt_references_index_v1';
  var LS_MANUAL_PREFIX = 'cmt_reference_manual_';
  var LS_MEDIA_PREFIX = 'cmt_reference_media_';

  function uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'rb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function _isElectron() {
    return !!(typeof window !== 'undefined' && (
      (window.Desktop && window.Desktop.isElectron) ||
      (window.electronApi && window.electronApi.isElectron)
    ));
  }

  async function _readTargetJson(target, relPath) {
    if (_isElectron()) {
      try {
        var res = null;
        if (window.Desktop && typeof window.Desktop.readText === 'function') {
          res = await window.Desktop.readText(target, relPath);
        } else if (window.electronApi && typeof window.electronApi.readByPath === 'function') {
          res = await window.electronApi.readByPath({ target: target, relativePath: relPath });
        }
        var txt = typeof res === 'string' ? res : (res && res.content);
        if (txt) return JSON.parse(txt);
      } catch (_) {}
    }
    return null;
  }

  async function _saveTargetJson(target, relPath, data) {
    if (_isElectron()) {
      if (window.Desktop && typeof window.Desktop.saveJson === 'function') {
        return await window.Desktop.saveJson(target, relPath, data);
      }
      if (window.electronApi && typeof window.electronApi.saveByPath === 'function') {
        return await window.electronApi.saveByPath({
          target: target,
          relativePath: relPath,
          content: JSON.stringify(data, null, 2)
        });
      }
    }
    return null;
  }

  function _defaultIndex() {
    return {
      version: 1,
      subjects: [],
      manualSummaries: [],
      manualIds: [],
      customModuleTypes: [],
      savedPhrases: []
    };
  }

  async function loadIndex() {
    var idx = await _readTargetJson('references', INDEX_FILE);
    if (!idx && typeof localStorage !== 'undefined') {
      try {
        var raw = localStorage.getItem(LS_INDEX_KEY);
        if (raw) idx = JSON.parse(raw);
      } catch (_) {}
    }
    if (!idx || typeof idx !== 'object') idx = _defaultIndex();
    idx.subjects = Array.isArray(idx.subjects) ? idx.subjects : [];
    idx.manualSummaries = Array.isArray(idx.manualSummaries) ? idx.manualSummaries : [];
    idx.manualIds = Array.isArray(idx.manualIds) ? idx.manualIds : [];
    idx.customModuleTypes = Array.isArray(idx.customModuleTypes) ? idx.customModuleTypes : [];
    idx.savedPhrases = Array.isArray(idx.savedPhrases) ? idx.savedPhrases : [];
    return idx;
  }

  async function saveIndex(idx) {
    var payload = Object.assign(_defaultIndex(), idx || {});
    payload.manualIds = payload.manualSummaries.map(function (m) { return m.id; });
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LS_INDEX_KEY, JSON.stringify(payload));
      } catch (_) {}
    }
    await _saveTargetJson('references', INDEX_FILE, payload);
    return payload;
  }

  function createSubjectObj(input) {
    var now = new Date().toISOString();
    return {
      id: (input && input.id) || uuid(),
      name: String((input && input.name) || 'New Subject').trim(),
      description: String((input && input.description) || '').trim(),
      color: (input && input.color) || '#5b8fcc',
      icon: (input && input.icon) || 'reference-builder.svg',
      defaultLevels: Array.isArray(input && input.defaultLevels) ? input.defaultLevels : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      defaultYears: Array.isArray(input && input.defaultYears) ? input.defaultYears : [],
      defaultSubDisciplines: Array.isArray(input && input.defaultSubDisciplines) ? input.defaultSubDisciplines : [],
      createdAt: (input && input.createdAt) || now,
      updatedAt: now
    };
  }

  function createManualObj(input) {
    var now = new Date().toISOString();
    var chId = uuid();
    return {
      id: (input && input.id) || uuid(),
      subjectId: (input && input.subjectId) || '',
      title: String((input && input.title) || 'Untitled Reference').trim(),
      subtitle: String((input && input.subtitle) || '').trim(),
      author: String((input && input.author) || '').trim(),
      level: String((input && input.level) || '').trim(),
      year: String((input && input.year) || '').trim(),
      subDiscipline: String((input && input.subDiscipline) || '').trim(),
      tags: Array.isArray(input && input.tags) ? input.tags : [],
      coverColor: (input && input.coverColor) || '#e2c96e',
      chapters: Array.isArray(input && input.chapters) && input.chapters.length ? input.chapters : [
        {
          id: chId,
          title: 'Topic 1',
          level: String((input && input.level) || '').trim(),
          year: String((input && input.year) || '').trim(),
          subDiscipline: String((input && input.subDiscipline) || '').trim(),
          summary: '',
          modules: []
        }
      ],
      createdAt: (input && input.createdAt) || now,
      updatedAt: now
    };
  }

  function summarizeManual(manual) {
    var moduleCount = 0;
    var chapters = Array.isArray(manual.chapters) ? manual.chapters : [];
    chapters.forEach(function (ch) {
      if (ch && Array.isArray(ch.modules)) moduleCount += ch.modules.length;
    });
    return {
      id: manual.id,
      subjectId: manual.subjectId || '',
      title: manual.title || 'Untitled Reference',
      subtitle: manual.subtitle || '',
      level: manual.level || '',
      year: manual.year || '',
      subDiscipline: manual.subDiscipline || '',
      tags: Array.isArray(manual.tags) ? manual.tags : [],
      coverColor: manual.coverColor || '#e2c96e',
      chapterCount: chapters.length,
      moduleCount: moduleCount,
      updatedAt: manual.updatedAt || new Date().toISOString()
    };
  }

  async function loadManual(manualId) {
    if (!manualId) return null;
    var manual = await _readTargetJson('references', 'manuals/' + manualId + '.json');
    if (!manual && typeof localStorage !== 'undefined') {
      try {
        var raw = localStorage.getItem(LS_MANUAL_PREFIX + manualId);
        if (raw) manual = JSON.parse(raw);
      } catch (_) {}
    }
    if (!manual) return null;
    manual.chapters = Array.isArray(manual.chapters) ? manual.chapters : [];
    manual.tags = Array.isArray(manual.tags) ? manual.tags : [];
    return manual;
  }

  async function saveManual(manual, indexObj) {
    if (!manual || !manual.id) throw new Error('Invalid manual');
    manual.updatedAt = new Date().toISOString();
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LS_MANUAL_PREFIX + manual.id, JSON.stringify(manual));
      } catch (_) {}
    }
    await _saveTargetJson('references', 'manuals/' + manual.id + '.json', manual);

    var idx = indexObj || await loadIndex();
    var summary = summarizeManual(manual);
    var existingPos = idx.manualSummaries.findIndex(function (m) { return m.id === manual.id; });
    if (existingPos >= 0) {
      idx.manualSummaries[existingPos] = summary;
    } else {
      idx.manualSummaries.unshift(summary);
    }
    await saveIndex(idx);
    return { manual: manual, index: idx };
  }

  async function deleteManual(manualId, indexObj) {
    var idx = indexObj || await loadIndex();
    idx.manualSummaries = idx.manualSummaries.filter(function (m) { return m.id !== manualId; });
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(LS_MANUAL_PREFIX + manualId); } catch (_) {}
    }
    if (_isElectron() && window.electronApi && typeof window.electronApi.deleteByPath === 'function') {
      try {
        await window.electronApi.deleteByPath({ target: 'references', relativePath: 'manuals/' + manualId + '.json' });
      } catch (_) {}
    }
    return await saveIndex(idx);
  }

  async function saveMediaBlob(manualId, fileName, dataUrlOrBase64, mimeType) {
    var safeName = String(fileName || 'media').replace(/[^a-zA-Z0-9._-]+/g, '_');
    var uniqueName = Date.now().toString(36) + '-' + safeName;
    var relPath = manualId + '/' + uniqueName;
    if (_isElectron() && window.Desktop && typeof window.Desktop.saveBlob === 'function') {
      try {
        await window.Desktop.saveBlob('referenceMedia', relPath, dataUrlOrBase64, mimeType || 'application/octet-stream');
        return { relPath: relPath, storage: 'disk', dataUrl: dataUrlOrBase64 };
      } catch (_) {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LS_MEDIA_PREFIX + relPath, dataUrlOrBase64);
      } catch (_) {}
    }
    return { relPath: relPath, storage: 'local', dataUrl: dataUrlOrBase64 };
  }

  function filterSummaries(summaries, filters) {
    var q = String((filters && filters.query) || '').trim().toLowerCase();
    var subj = (filters && filters.subjectId) || '';
    var level = String((filters && filters.level) || '').trim().toLowerCase();
    var year = String((filters && filters.year) || '').trim().toLowerCase();
    var subDisc = String((filters && filters.subDiscipline) || '').trim().toLowerCase();

    return (summaries || []).filter(function (m) {
      if (subj && m.subjectId !== subj) return false;
      if (level && String(m.level || '').toLowerCase() !== level) return false;
      if (year && String(m.year || '').toLowerCase() !== year) return false;
      if (subDisc && String(m.subDiscipline || '').toLowerCase() !== subDisc) return false;
      if (q) {
        var hay = [
          m.title, m.subtitle, m.level, m.year, m.subDiscipline,
          Array.isArray(m.tags) ? m.tags.join(' ') : ''
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  root.RbStore = {
    uuid: uuid,
    loadIndex: loadIndex,
    saveIndex: saveIndex,
    createSubjectObj: createSubjectObj,
    createManualObj: createManualObj,
    summarizeManual: summarizeManual,
    loadManual: loadManual,
    saveManual: saveManual,
    deleteManual: deleteManual,
    saveMediaBlob: saveMediaBlob,
    filterSummaries: filterSummaries
  };
})(typeof window !== 'undefined' ? window : globalThis);
