/**
 * js/links-service.js - Central Link Graph & Contextual Inheritance Engine
 * Class Management Tools (CMT)
 *
 * Provides bidirectional entity linking, global #tagging, contextual inheritance,
 * deep-link routing, and cross-window real-time synchronization.
 */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LinksService = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var STORAGE_KEY = 'cmt_links_registry';
  var FILE_TARGET = 'user';
  var FILE_NAME = 'links-registry.json';
  var SYNC_CHANNEL = 'cmt-links-sync';

  var _registryCache = null;
  var _loadPromise = null;
  var _channel = null;

  // Initialize BroadcastChannel if available
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      _channel = new BroadcastChannel(SYNC_CHANNEL);
      _channel.onmessage = function(ev) {
        if (ev && ev.data) {
          // Invalidate cache and reload silently
          _registryCache = null;
          _invalidateDossierScanCaches();
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('cmt-links-changed', { detail: ev.data }));
          }
        }
      };
    } catch (_) {}
  }

  // ── 1. URN Helpers ──────────────────────────────────────────────────────────
  /**
   * Format: cmt:<type>:<id>[#<anchor>]
   */
  function parseUrn(urnStr) {
    if (!urnStr || typeof urnStr !== 'string') return null;
    var trimmed = urnStr.trim();
    if (trimmed.startsWith('urn:cmt:')) {
      trimmed = trimmed.slice(4);
    }
    if (!trimmed.startsWith('cmt:')) {
      // Support raw file paths or short ids by inferring
      return { type: 'unknown', id: trimmed, anchor: '', raw: trimmed };
    }
    var withoutPrefix = trimmed.slice(4); // remove 'cmt:'
    var hashIdx = withoutPrefix.indexOf('#');
    var mainPart = hashIdx !== -1 ? withoutPrefix.slice(0, hashIdx) : withoutPrefix;
    var anchor = hashIdx !== -1 ? withoutPrefix.slice(hashIdx + 1) : '';

    var colonIdx = mainPart.indexOf(':');
    var type = colonIdx !== -1 ? mainPart.slice(0, colonIdx) : 'general';
    var id = colonIdx !== -1 ? mainPart.slice(colonIdx + 1) : mainPart;

    return {
      type: type.toLowerCase(),
      id: id,
      anchor: anchor,
      raw: trimmed
    };
  }

  function makeUrn(type, id, anchor) {
    var base = 'cmt:' + String(type || 'general').toLowerCase() + ':' + String(id || '');
    if (anchor) base += '#' + String(anchor);
    return base;
  }

  /**
   * Normalizes document, class, test, and evaluation URNs to standard canonical forms
   * so slight path/target variations (e.g. user/doceditor vs docEditorDocs) match seamlessly.
   */
  function canonicalizeUrn(urnStr) {
    if (!urnStr || typeof urnStr !== 'string') return urnStr;
    var trimmed = urnStr.trim();
    if (!trimmed.startsWith('cmt:')) return trimmed;
    var p = parseUrn(trimmed);
    if (!p) return trimmed;
    var type = p.type;
    var id = p.id;
    if (type === 'doc' || type === 'doc_section' || type === 'docs' || type === 'document') {
      var normId = id.replace(/\\/g, '/').replace(/^\/+/, '');
      if (normId.startsWith('user/document-editor/docs/')) {
        normId = 'docEditorDocs/' + normId.slice('user/document-editor/docs/'.length);
      } else if (normId.startsWith('user/doceditor/')) {
        normId = 'docEditorDocs/' + normId.slice('user/doceditor/'.length);
      } else if (normId.startsWith('doceditor/')) {
        normId = 'docEditorDocs/' + normId.slice('doceditor/'.length);
      } else if (!normId.includes('/')) {
        normId = 'docEditorDocs/' + normId;
      }
      return makeUrn('doc', normId, p.anchor);
    }
    if (type === 'class' || type === 'classes') {
      return makeUrn('class', id, p.anchor);
    }
    if (type === 'student' || type === 'students') {
      return makeUrn('student', id, p.anchor);
    }
    if (type === 'wordbank' || type === 'wordbanks' || type === 'word' || type === 'words' || type === 'vocab') {
      return makeUrn('wordbank', id, p.anchor);
    }
    if (type === 'quotebank' || type === 'quotebanks' || type === 'quote' || type === 'quotes') {
      return makeUrn('quotebank', id, p.anchor);
    }
    if (type === 'dictation' || type === 'dictations') {
      return makeUrn('dictation', id, p.anchor);
    }
    if (type === 'grammarbank' || type === 'grammarbanks' || type === 'grammar') {
      return makeUrn('grammarbank', id, p.anchor);
    }
    if (type === 'gapfillbank' || type === 'gapfillbanks' || type === 'gapfill') {
      return makeUrn('gapfillbank', id, p.anchor);
    }
    if (type === 'errorbank' || type === 'errorbanks' || type === 'error' || type === 'errors') {
      return makeUrn('errorbank', id, p.anchor);
    }
    if (type === 'sentencebank' || type === 'sentencebanks' || type === 'sentence' || type === 'sentences') {
      return makeUrn('sentencebank', id, p.anchor);
    }
    if (type === 'storybank' || type === 'storybanks' || type === 'story' || type === 'stories') {
      return makeUrn('storybank', id, p.anchor);
    }
    if (type === 'quiz' || type === 'quizzes' || type === 'quizbank') {
      return makeUrn('quiz', id, p.anchor);
    }
    if (type === 'testbank' || type === 'testbanks' || type === 'exercise' || type === 'exercises' || type === 'customexercises') {
      return makeUrn('testbank', id, p.anchor);
    }
    if (type === 'phase' || type === 'phases' || type === 'activity' || type === 'activities') {
      return makeUrn('phase', id, p.anchor);
    }
    if (type === 'chip' || type === 'chips' || type === 'observationchips' || type === 'personalisedchips') {
      return makeUrn('chip', id, p.anchor);
    }
    if (type === 'test' || type === 'tests') {
      return makeUrn('test', id, p.anchor);
    }
    if (type === 'eval' || type === 'evaluation') {
      return makeUrn('eval', id, p.anchor);
    }
    if (type === 'competence' || type === 'competences') {
      return makeUrn('competence', id, p.anchor);
    }
    if (type === 'criteria' || type === 'criterion') {
      return makeUrn('criteria', id, p.anchor);
    }
    if (type === 'scale' || type === 'scales') {
      return makeUrn('scale', id, p.anchor);
    }
    if (type === 'planner' || type === 'slot') {
      return makeUrn('planner', id, p.anchor);
    }
    if (type === 'lesson' || type === 'lessons' || type === 'lessonplan') {
      return makeUrn('lesson', id, p.anchor);
    }
    if (type === 'board' || type === 'mindmap' || type === 'constellation') {
      return makeUrn('board', id.replace(/\\/g, '/'), p.anchor);
    }
    if (type === 'gradesheet' || type === 'gradesheets' || type === 'eval' || type === 'evaluation' || type === 'grade') {
      return makeUrn('gradesheet', id, p.anchor);
    }
    if (type === 'year' || type === 'academic_year' || type === 'school_year' || type === 'academicyear') {
      return makeUrn('year', id, p.anchor);
    }
    if (type === 'level' || type === 'grade_level' || type === 'yearlevel') {
      return makeUrn('level', id, p.anchor);
    }
    if (type === 'board_node' || type === 'board-node') {
      return makeUrn('board-node', id, p.anchor);
    }
    if (type === 'board_note' || type === 'board-note') {
      return makeUrn('board-note', id, p.anchor);
    }
    if (type === 'board_group' || type === 'board-group') {
      return makeUrn('board-group', id, p.anchor);
    }
    if (type === 'board_shape' || type === 'board-shape') {
      return makeUrn('board-shape', id, p.anchor);
    }
    if (type === 'todo' || type === 'todos') {
      return makeUrn('todo', id, p.anchor);
    }
    if (type === 'file') {
      return makeUrn('file', id.replace(/\\/g, '/'), p.anchor);
    }
    return makeUrn(type, id, p.anchor);
  }

  function normalizeTag(tagStr) {
    if (!tagStr || typeof tagStr !== 'string') return '';
    var clean = tagStr.trim().toLowerCase();
    if (!clean) return '';
    if (!clean.startsWith('#')) clean = '#' + clean;
    // Replace spaces and special characters with hyphens
    return clean.replace(/[\s\/\\]+/g, '-');
  }

  // ── 2. Storage & Persistence ────────────────────────────────────────────────
  function defaultRegistry() {
    return {
      version: 1,
      updatedAt: Date.now(),
      tags: {},     // { '#tag': ['urn1', 'urn2'] }
      edges: [],    // [ { id, source, target, relation, meta, createdAt } ]
      entities: {}  // { 'urn': { title, subtitle, type, target, relativePath, meta } }
    };
  }

  async function loadRegistry(forceReload) {
    if (_registryCache && !forceReload) {
      return _registryCache;
    }
    if (_loadPromise && !forceReload) {
      return _loadPromise;
    }

    _loadPromise = (async function() {
      var reg = defaultRegistry();
      var loaded = false;

      // 1. Try Electron filesystem
      if (typeof window !== 'undefined' && window.Desktop && typeof Desktop.readJson === 'function') {
        try {
          var res = await Desktop.readJson(FILE_TARGET, FILE_NAME);
          if (res && res.ok && res.data && typeof res.data === 'object') {
            reg = Object.assign(defaultRegistry(), res.data);
            reg.tags = reg.tags || {};
            reg.edges = Array.isArray(reg.edges) ? reg.edges : [];
            reg.entities = reg.entities || {};
            loaded = true;
          }
        } catch (e) {
          console.warn('LinksService: Error reading links-registry.json:', e);
        }
      }

      // 2. Try localStorage fallback or sync
      if (!loaded && typeof localStorage !== 'undefined') {
        try {
          var raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              reg = Object.assign(defaultRegistry(), parsed);
              reg.tags = reg.tags || {};
              reg.edges = Array.isArray(reg.edges) ? reg.edges : [];
              reg.entities = reg.entities || {};
              loaded = true;
            }
          }
        } catch (_) {}
      }

      _registryCache = reg;
      _loadPromise = null;
      return _registryCache;
    })();

    return _loadPromise;
  }

  var _diskSavePromise = null;
  var _diskSaveScheduled = false;

  async function _flushRegistryToDisk() {
    if (_diskSavePromise) {
      _diskSaveScheduled = true;
      return _diskSavePromise;
    }
    _diskSavePromise = (async function() {
      try {
        do {
          _diskSaveScheduled = false;
          var snapshot = _registryCache;
          if (typeof window !== 'undefined' && window.Desktop && typeof Desktop.saveJson === 'function') {
            try {
              var res = await Desktop.saveJson(FILE_TARGET, FILE_NAME, snapshot);
              if (!res || !res.ok) {
                console.warn('LinksService: Desktop.saveJson returned not ok:', res);
              }
            } catch (saveErr) {
              console.error('LinksService: Error saving links-registry.json:', saveErr);
            }
          }
        } while (_diskSaveScheduled);
      } finally {
        _diskSavePromise = null;
      }
    })();
    return _diskSavePromise;
  }

  async function saveRegistry(reg) {
    if (!reg || typeof reg !== 'object') return false;
    reg.updatedAt = Date.now();
    _registryCache = reg;

    // 1. Save to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reg));
      } catch (_) {}
    }

    // 2. Coalesced save to Electron filesystem
    await _flushRegistryToDisk();

    // 3. Broadcast sync message
    if (_channel) {
      try {
        _channel.postMessage({
          action: 'sync',
          updatedAt: reg.updatedAt
        });
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cmt-links-changed', { detail: { action: 'sync', updatedAt: reg.updatedAt } }));
    }

    return true;
  }

  // ── 3. Entity Metadata Registry ─────────────────────────────────────────────
  async function registerEntity(urn, meta) {
    if (!urn || !meta) return;
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    reg.entities[cUrn] = Object.assign({}, reg.entities[cUrn] || reg.entities[urn] || {}, meta, {
      urn: cUrn,
      updatedAt: Date.now()
    });
    if (cUrn !== urn) {
      reg.entities[urn] = reg.entities[cUrn];
    }
    await saveRegistry(reg);
  }

  async function getEntityMeta(urn) {
    if (!urn) return null;
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    return reg.entities[cUrn] || reg.entities[urn] || null;
  }

  // ── Roster & Class Display Resolvers (Human-Readable Names) ───────────────
  var _rosterNameCache = null;
  var _rosterDiskLoadPromise = null;

  function _buildRosterCache() {
    var students = {};
    var classes = {};

    function isUuid(str) {
      if (!str || typeof str !== 'string') return false;
      return /^st-[a-z0-9_-]+$/i.test(str) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ||
        /^[0-9a-f]{8,}$/i.test(str);
    }

    // 0. Load from window.STUDENTS_ROSTER if present
    var stRoster = (typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER))
      ? window.STUDENTS_ROSTER
      : (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER) ? STUDENTS_ROSTER : null);
    if (stRoster) {
      stRoster.forEach(function(s) {
        if (!s) return;
        var sid = s.uuid || s.id;
        if (!sid) return;
        var sname = ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.customName || s.name || '').trim();
        var enrollments = Array.isArray(s.enrollments) ? s.enrollments.slice() : [];
        var classIds = [];
        var classNames = [];
        enrollments.forEach(function(enr) {
          if (!enr) return;
          var gid = enr.groupUuid || enr.groupId || enr.id || '';
          var gname = enr.groupName || enr.name || gid || '';
          if (gid && !classIds.includes(gid)) classIds.push(gid);
          if (gname && !classNames.includes(gname)) classNames.push(gname);
        });
        if (s.adminClass) {
          if (!classIds.includes(s.adminClass)) classIds.push(s.adminClass);
          if (!classNames.includes(s.adminClass)) classNames.push(s.adminClass);
        }
        var clsId = classIds[0] || (enrollments[0] && enrollments[0].groupUuid) || s.adminClass || '';
        var clsName = classNames[0] || (enrollments[0] && enrollments[0].groupName) || s.adminClass || '';
        students[sid] = {
          id: sid,
          name: sname || sid,
          firstName: s.firstName || '',
          lastName: s.lastName || '',
          customName: s.customName || '',
          classId: clsId,
          className: clsName,
          classIds: classIds,
          classNames: classNames,
          enrollments: enrollments,
          number: s.number || null
        };
      });
    }

    function addStudent(s, classId, className) {
      if (!s) return;
      var sid = typeof s === 'string' ? s : (s.uuid || s.id);
      if (!sid) return;
      var sname = null;
      if (typeof s === 'object') {
        sname = ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.customName || s.name || '').trim();
      }
      if (!sname && students[sid] && students[sid].name && !isUuid(students[sid].name)) {
        sname = students[sid].name;
      }
      if (!sname && stRoster) {
        var found = stRoster.find(function(r) { return r && (r.uuid === sid || r.id === sid); });
        if (found) {
          sname = ([found.firstName, found.lastName].filter(Boolean).join(' ') || found.customName || found.name || '').trim();
        }
      }
      if (!sname && typeof s === 'string' && !isUuid(s)) {
        sname = s;
      }
      if (!sname) sname = sid;

      var existing = students[sid] || {
        id: sid,
        name: sname,
        firstName: '',
        lastName: '',
        customName: '',
        classId: '',
        className: '',
        classIds: [],
        classNames: [],
        enrollments: [],
        number: null
      };

      var classIds = Array.isArray(existing.classIds) ? existing.classIds.slice() : (existing.classId ? [existing.classId] : []);
      var classNames = Array.isArray(existing.classNames) ? existing.classNames.slice() : (existing.className ? [existing.className] : []);
      var enrollments = Array.isArray(existing.enrollments) ? existing.enrollments.slice() : [];

      if (classId && !classIds.includes(classId)) {
        classIds.push(classId);
      }
      var resolvedCName = className || classId;
      if (resolvedCName && !classNames.includes(resolvedCName)) {
        classNames.push(resolvedCName);
      }

      if (classId) {
        var hasEnr = enrollments.some(function(e) { return e && (e.groupUuid === classId || e.groupId === classId); });
        if (!hasEnr) {
          enrollments.push({ groupUuid: classId, groupName: resolvedCName || classId });
        }
      }

      var numVal = (typeof s === 'object' && s && s.number != null) ? s.number : existing.number;
      var fName = (typeof s === 'object' && s && s.firstName) ? s.firstName : (existing.firstName || '');
      var lName = (typeof s === 'object' && s && s.lastName) ? s.lastName : (existing.lastName || '');
      var cstName = (typeof s === 'object' && s && s.customName) ? s.customName : (existing.customName || '');

      students[sid] = {
        id: sid,
        name: sname || existing.name || sid,
        firstName: fName,
        lastName: lName,
        customName: cstName,
        classId: classIds[0] || classId || existing.classId || '',
        className: classNames[0] || resolvedCName || existing.className || '',
        classIds: classIds,
        classNames: classNames,
        enrollments: enrollments,
        number: numVal
      };
    }

    function addClass(cid, cname) {
      if (!cid) return;
      classes[cid] = cname || cid;
    }

    if (typeof window !== 'undefined') {
      var cgd = window.CLASS_GROUPS_DATA;
      if (cgd) {
        if (Array.isArray(cgd.classes)) {
          cgd.classes.forEach(function(cls) {
            if (!cls) return;
            addClass(cls.id, cls.name || cls.id);
            if (Array.isArray(cls.students)) {
              cls.students.forEach(function(st) { addStudent(st, cls.id, cls.name); });
            }
          });
        }
        if (cgd.classGroupsMeta && typeof cgd.classGroupsMeta === 'object') {
          Object.keys(cgd.classGroupsMeta).forEach(function(k) {
            if (k.startsWith('_')) return;
            var m = cgd.classGroupsMeta[k];
            addClass(k, (m && m.name) || k);
            if (m && Array.isArray(m.students)) {
              m.students.forEach(function(st) { addStudent(st, k, (m && m.name) || k); });
            }
          });
        }
        if (cgd.classGroups && typeof cgd.classGroups === 'object') {
          Object.keys(cgd.classGroups).forEach(function(k) {
            if (k.startsWith('_')) return;
            var g = cgd.classGroups[k];
            addClass(k, (g && g.name) || k);
            var arr = Array.isArray(g) ? g : ((g && g.students) || []);
            arr.forEach(function(st) { addStudent(st, k, (g && g.name) || k); });
          });
        }
      }
      var metaSource = (window.CLASS_GROUPS_META && typeof window.CLASS_GROUPS_META === 'object') ? window.CLASS_GROUPS_META : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && typeof CLASS_GROUPS_META === 'object') ? CLASS_GROUPS_META : null);
      if (metaSource) {
        Object.keys(metaSource).forEach(function(k) {
          if (k.startsWith('_')) return;
          var m = metaSource[k];
          addClass(k, (m && m.name) || k);
          if (m && Array.isArray(m.students)) {
            m.students.forEach(function(st) { addStudent(st, k, (m && m.name) || k); });
          }
        });
      }
      var groupsSource = (window.CLASS_GROUPS && typeof window.CLASS_GROUPS === 'object') ? window.CLASS_GROUPS : ((typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS && typeof CLASS_GROUPS === 'object') ? CLASS_GROUPS : null);
      if (groupsSource) {
        Object.keys(groupsSource).forEach(function(k) {
          if (k.startsWith('_')) return;
          var g = groupsSource[k];
          addClass(k, (g && g.name) || k);
          var arr = Array.isArray(g) ? g : ((g && g.students) || []);
          arr.forEach(function(st) { addStudent(st, k, (g && g.name) || k); });
        });
      }
      if (window.appState && Array.isArray(window.appState.classes)) {
        window.appState.classes.forEach(function(cls) {
          if (!cls) return;
          addClass(cls.id, cls.name || cls.id);
          if (Array.isArray(cls.students)) {
            cls.students.forEach(function(st) { addStudent(st, cls.id, cls.name); });
          }
        });
      }
      if (window.PLANNER_CONFIG && window.PLANNER_CONFIG.classes && typeof window.PLANNER_CONFIG.classes === 'object') {
        Object.keys(window.PLANNER_CONFIG.classes).forEach(function(k) {
          var c = window.PLANNER_CONFIG.classes[k];
          addClass(k, (c && c.name) || k);
        });
      }
    }
    return { students: students, classes: classes };
  }

  async function _ensureRosterLoaded() {
    if (_rosterNameCache && Object.keys(_rosterNameCache.students).length > 0) {
      var hasRealNames = Object.values(_rosterNameCache.students).some(function(st) {
        return st && st.name && !/^st-[a-z0-9_-]+$/i.test(st.name) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(st.name);
      });
      if (hasRealNames) return _rosterNameCache;
    }
    if (_rosterDiskLoadPromise) return _rosterDiskLoadPromise;

    _rosterDiskLoadPromise = (async function() {
      if (typeof window !== 'undefined' && window.Desktop && typeof Desktop.readText === 'function') {
        // 1. Load students.js
        try {
          var stRes = await Desktop.readText('user', 'students.js');
          if (stRes && stRes.ok && stRes.content) {
            var fnSt = new Function(
              stRes.content +
              '\nreturn (typeof STUDENTS_ROSTER !== "undefined") ? STUDENTS_ROSTER : [];'
            );
            var parsedSt = fnSt();
            if (Array.isArray(parsedSt)) {
              window.STUDENTS_ROSTER = parsedSt;
            }
          }
        } catch (_) {}

        // 2. Load class-groups.js
        try {
          var res = await Desktop.readText('user', 'class-groups.js');
          if (res && res.ok && res.content) {
            var fn = new Function(
              res.content +
              '\nreturn { ' +
              '  classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null),' +
              '  classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null),' +
              '  classGroupsData: (typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : null)' +
              '};'
            );
            var parsed = fn();
            if (parsed) {
              var glob = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
              if (glob) {
                if (parsed.classGroupsMeta) glob.CLASS_GROUPS_META = parsed.classGroupsMeta;
                if (parsed.classGroups) glob.CLASS_GROUPS = parsed.classGroups;
                if (parsed.classGroupsData) glob.CLASS_GROUPS_DATA = parsed.classGroupsData;
              }
            }
          }
        } catch (_) {}
      } else if (typeof fetch === 'function') {
        try {
          var stResp = await fetch('../user/students.js').catch(function() { return fetch('user/students.js'); });
          if (stResp && stResp.ok) {
            var stTxt = await stResp.text();
            var fnSt2 = new Function(stTxt + '\nreturn (typeof STUDENTS_ROSTER !== "undefined") ? STUDENTS_ROSTER : [];');
            var parsedSt2 = fnSt2();
            if (Array.isArray(parsedSt2)) window.STUDENTS_ROSTER = parsedSt2;
          }
        } catch (_) {}
        try {
          var cgResp = await fetch('../user/class-groups.js').catch(function() { return fetch('user/class-groups.js'); });
          if (cgResp && cgResp.ok) {
            var cgTxt = await cgResp.text();
            var fnCg = new Function(
              cgTxt +
              '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA' +
              ' : { classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null),' +
              '   classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null) };'
            );
            var parsedCg = fnCg();
            if (parsedCg) {
              if (parsedCg.classGroupsMeta && !window.CLASS_GROUPS_META) window.CLASS_GROUPS_META = parsedCg.classGroupsMeta;
              if (parsedCg.classGroups && !window.CLASS_GROUPS) window.CLASS_GROUPS = parsedCg.classGroups;
              if (!window.CLASS_GROUPS_DATA) window.CLASS_GROUPS_DATA = parsedCg;
            }
          }
        } catch (_) {}
      }
      _rosterNameCache = _buildRosterCache();
      _rosterDiskLoadPromise = null;
      return _rosterNameCache;
    })();

    return _rosterDiskLoadPromise;
  }

  function resolveStudentName(studentId) {
    if (!studentId) return null;
    var cache = _rosterNameCache || _buildRosterCache();
    if (cache.students[studentId] && cache.students[studentId].name) {
      var n = cache.students[studentId].name;
      if (!/^st-[a-z0-9_-]+$/i.test(n) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(n)) {
        return n;
      }
    }
    var lowerId = String(studentId).toLowerCase();
    var matchKey = Object.keys(cache.students).find(function(k) {
      return k.toLowerCase() === lowerId;
    });
    if (matchKey && cache.students[matchKey] && cache.students[matchKey].name) {
      var n2 = cache.students[matchKey].name;
      if (!/^st-[a-z0-9_-]+$/i.test(n2) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(n2)) {
        return n2;
      }
    }
    // Check window.STUDENTS_ROSTER directly
    if (typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER)) {
      var sEntry = window.STUDENTS_ROSTER.find(function(r) {
        return r && (r.uuid === studentId || r.id === studentId || String(r.uuid).toLowerCase() === lowerId);
      });
      if (sEntry) {
        var fnLn = ([sEntry.firstName, sEntry.lastName].filter(Boolean).join(' ') || sEntry.customName || sEntry.name || '').trim();
        if (fnLn) return fnLn;
      }
    }
    // Check if studentId itself looks like a human name rather than a UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId) &&
        !/^st-[a-z0-9_-]+$/i.test(studentId) &&
        !/^[0-9a-f]{8,}$/i.test(studentId) && studentId.length < 35 && studentId.includes(' ')) {
      return studentId;
    }
    return null;
  }

  function resolveStudentInfo(studentId) {
    if (!studentId) return null;
    var cache = _rosterNameCache || _buildRosterCache();
    if (cache.students[studentId]) return cache.students[studentId];
    var lowerId = String(studentId).toLowerCase();
    var matchKey = Object.keys(cache.students).find(function(k) {
      return k.toLowerCase() === lowerId;
    });
    return matchKey ? cache.students[matchKey] : null;
  }

  function resolveClassName(classId) {
    if (!classId) return null;
    var cache = _rosterNameCache || _buildRosterCache();
    if (cache.classes[classId]) return cache.classes[classId];
    var lowerId = String(classId).toLowerCase();
    var matchKey = Object.keys(cache.classes).find(function(k) {
      return k.toLowerCase() === lowerId;
    });
    if (matchKey) return cache.classes[matchKey];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classId) &&
        !/^[0-9a-f]{8,}$/i.test(classId) && classId.length < 35) {
      return classId;
    }
    return null;
  }

  function resolveClassLevel(classId) {
    if (!classId) return null;
    var cache = _rosterNameCache || _buildRosterCache();
    var cName = (cache && cache.classes && cache.classes[classId]) || classId;

    if (typeof window !== 'undefined') {
      var meta = (window.CLASS_GROUPS_META && window.CLASS_GROUPS_META[classId]) ||
        (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[classId]) ||
        (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta && window.CLASS_GROUPS_DATA.classGroupsMeta[classId]) ||
        (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta && CLASS_GROUPS_DATA.classGroupsMeta[classId]);
      if (meta) {
        if (meta.level !== undefined && meta.level !== null && String(meta.level).trim() !== '') return String(meta.level).trim();
        if (meta.yearLevel !== undefined && meta.yearLevel !== null && String(meta.yearLevel).trim() !== '') return String(meta.yearLevel).trim();
        if (meta.grade !== undefined && meta.grade !== null && String(meta.grade).trim() !== '') return String(meta.grade).trim();
        if (meta.year !== undefined && meta.year !== null && String(meta.year).trim() !== '' && !String(meta.year).includes('-')) return String(meta.year).trim();
      }
      if (window.PLANNER_CONFIG && window.PLANNER_CONFIG.classes && window.PLANNER_CONFIG.classes[classId]) {
        var pc = window.PLANNER_CONFIG.classes[classId];
        if (pc.level !== undefined && pc.level !== null && String(pc.level).trim() !== '') return String(pc.level).trim();
        if (pc.yearLevel !== undefined && pc.yearLevel !== null && String(pc.yearLevel).trim() !== '') return String(pc.yearLevel).trim();
        if (pc.grade !== undefined && pc.grade !== null && String(pc.grade).trim() !== '') return String(pc.grade).trim();
        if (pc.year !== undefined && pc.year !== null && String(pc.year).trim() !== '' && !String(pc.year).includes('-')) return String(pc.year).trim();
      }
    }

    var targetStr = (cName + ' ' + classId).toLowerCase();

    // Specific French / Swiss / International secondary class patterns
    // 6ème / Grade 6 / Year 7 / 6e
    if (/\b(6[eè]me?|6e\b|grade\s*6|g6|year\s*7|lvl\s*6|level\s*6)\b/i.test(targetStr) || /^6[a-z]{1,4}\b/i.test(classId) || /^6[a-z]\b/i.test(classId) || /^6[a-z]{1,4}\b/i.test(cName)) return '6eme';
    // 5ème / Grade 7 / Year 8 / 5e
    if (/\b(5[eè]me?|5e\b|grade\s*7|g7|year\s*8|lvl\s*5|level\s*5)\b/i.test(targetStr) || /^5[a-z]{1,4}\b/i.test(classId) || /^5[a-z]\b/i.test(classId) || /^5[a-z]{1,4}\b/i.test(cName)) return '5eme';
    // 4ème / Grade 8 / Year 9 / 4e / 4ANdf / 4DF / 4OS
    if (/\b(4[eè]me?|4e\b|grade\s*8|g8|year\s*9|lvl\s*4|level\s*4)\b/i.test(targetStr) || /^4[a-z]{1,4}\b/i.test(classId) || /^4[a-z]\b/i.test(classId) || /^4[a-z]{1,4}\b/i.test(cName)) return '4eme';
    // 3ème / Grade 9 / Year 10 / 3e / 3ANdf / 3DF / 3OS
    if (/\b(3[eè]me?|3e\b|grade\s*9|g9|year\s*10|lvl\s*3|level\s*3)\b/i.test(targetStr) || /^3[a-z]{1,4}\b/i.test(classId) || /^3[a-z]\b/i.test(classId) || /^3[a-z]{1,4}\b/i.test(cName)) return '3eme';
    // 2nde / Grade 10 / Year 11 / 2de / 2ANdf / 2DF / 2OS
    if (/\b(2[nnd]de?|2de\b|seconde|grade\s*10|g10|year\s*11|lvl\s*2|level\s*2)\b/i.test(targetStr) || /^2[a-z]{1,4}\b/i.test(classId) || /^2[a-z]\b/i.test(classId) || /^2[a-z]{1,4}\b/i.test(cName)) return '2nde';
    // 1ère / Grade 11 / Year 12 / 1re / 1ANdf / 1DF / 1OS
    if (/\b(1[eè]re?|1re\b|premi[eè]re|grade\s*11|g11|year\s*12|lvl\s*1|level\s*1)\b/i.test(targetStr) || /^1[a-z]{1,4}\b/i.test(classId) || /^1[a-z]\b/i.test(classId) || /^1[a-z]{1,4}\b/i.test(cName)) return '1ere';
    // Terminale / Grade 12 / Year 13 / Tle
    if (/\b(term(inale)?|tle\b|grade\s*12|g12|year\s*13)\b/i.test(targetStr)) return 'terminale';

    // Leading digit level heuristic: e.g. "4A", "4-01", "4_02", "3B", "3-01", "2C", "1A"
    var leadMatch = classId.match(/^([1-6])[-_.\s]?[a-z0-9]/i) || cName.match(/^([1-6])[-_.\s]?[a-z0-9]/i);
    if (leadMatch) {
      var d = leadMatch[1];
      if (d === '6') return '6eme';
      if (d === '5') return '5eme';
      if (d === '4') return '4eme';
      if (d === '3') return '3eme';
      if (d === '2') return '2nde';
      if (d === '1') return '1ere';
    }

    var cefrMatch = targetStr.match(/\b([a-c][1-2])\b/i);
    if (cefrMatch) return cefrMatch[1].toUpperCase();

    return null;
  }

  function resolveClassYear(classId) {
    if (!classId) return null;
    if (typeof window !== 'undefined') {
      var meta = (window.CLASS_GROUPS_META && window.CLASS_GROUPS_META[classId]) ||
        (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta && window.CLASS_GROUPS_DATA.classGroupsMeta[classId]);
      if (meta) {
        if (meta.academicYear) return String(meta.academicYear).trim();
        if (meta.schoolYear) return String(meta.schoolYear).trim();
        if (meta.year && String(meta.year).includes('-')) return String(meta.year).trim();
      }
      if (window.PLANNER_CONFIG) {
        if (window.PLANNER_CONFIG.academicYear) return String(window.PLANNER_CONFIG.academicYear).trim();
        if (window.PLANNER_CONFIG.schoolYear) return String(window.PLANNER_CONFIG.schoolYear).trim();
        if (window.PLANNER_CONFIG.year && String(window.PLANNER_CONFIG.year).includes('-')) return String(window.PLANNER_CONFIG.year).trim();
        if (window.PLANNER_CONFIG.classes && window.PLANNER_CONFIG.classes[classId]) {
          var pc = window.PLANNER_CONFIG.classes[classId];
          if (pc.academicYear) return String(pc.academicYear).trim();
          if (pc.year && String(pc.year).includes('-')) return String(pc.year).trim();
        }
      }
      if (window.CONFIG && window.CONFIG.academicYear) return String(window.CONFIG.academicYear).trim();
      if (window.USER_CONFIG && window.USER_CONFIG.academicYear) return String(window.USER_CONFIG.academicYear).trim();
    }
    var d = new Date();
    var currentYear = d.getFullYear();
    var month = d.getMonth() + 1;
    var startY = (month >= 8) ? currentYear : (currentYear - 1);
    return startY + '-' + (startY + 1);
  }

  function _normalizeClassToken(str) {
    return String(str || '').toLowerCase().replace(/[\s\-_]/g, '');
  }

  function _stripZeroPaddingClassToken(str) {
    return _normalizeClassToken(str).replace(/([a-z])0+(\d+)/gi, '$1$2');
  }

  function resolveClassGroupFromFilename(filename) {
    if (!filename) return '';
    var rawPath = String(filename).replace(/\\/g, '/');
    var base = rawPath.split('/').pop().replace(/\.(js|json|cstz|zip)$/i, '');
    var cache = _rosterNameCache || _buildRosterCache();
    var classes = Object.keys(cache.classes || {});

    // Sort classes by ID/name length descending so longer, more specific IDs match first (e.g. "3ANdf-02" before "3A")
    classes.sort(function(a, b) {
      var lenA = Math.max((a || '').length, ((cache.classes && cache.classes[a]) || '').length);
      var lenB = Math.max((b || '').length, ((cache.classes && cache.classes[b]) || '').length);
      return lenB - lenA;
    });

    var baseLower = base.toLowerCase();
    var baseNorm = _normalizeClassToken(base);
    var baseNoZero = _stripZeroPaddingClassToken(base);

    for (var i = 0; i < classes.length; i++) {
      var cid = classes[i];
      var cname = cache.classes[cid];
      if (!cid) continue;

      var cidLower = cid.toLowerCase();
      var cnameLower = cname ? cname.toLowerCase() : '';
      var cidNorm = _normalizeClassToken(cid);
      var cnameNorm = cname ? _normalizeClassToken(cname) : '';
      var cidNoZero = _stripZeroPaddingClassToken(cid);
      var cnameNoZero = cname ? _stripZeroPaddingClassToken(cname) : '';

      // 1. Direct match on basename
      if (baseLower === cidLower || (cnameLower && baseLower === cnameLower)) return cid;
      if (baseLower.startsWith(cidLower + '_') || baseLower.startsWith(cidLower + ' - ') || baseLower.startsWith(cidLower + ' ') || baseLower.startsWith(cidLower + '-')) return cid;
      if (cnameLower && (baseLower.startsWith(cnameLower + '_') || baseLower.startsWith(cnameLower + ' - ') || baseLower.startsWith(cnameLower + ' ') || baseLower.startsWith(cnameLower + '-'))) return cid;

      // 2. Check path directory segments (e.g. "3andf-02/session.json" or "archived/3andf-02/session.json")
      var pathSegments = rawPath.split('/');
      for (var s = 0; s < pathSegments.length; s++) {
        var seg = pathSegments[s].trim();
        var segLower = seg.toLowerCase();
        var segNorm = _normalizeClassToken(seg);
        var segNoZero = _stripZeroPaddingClassToken(seg);
        if (segLower === cidLower || (cnameLower && segLower === cnameLower)) return cid;
        if (segNorm === cidNorm || (cnameNorm && segNorm === cnameNorm)) return cid;
        if (segNoZero === cidNoZero || (cnameNoZero && segNoZero === cnameNoZero)) return cid;
      }

      // 3. Check delimiter-separated tokens: " - " or "/" or " _ " or spaces (preserving internal dashes/underscores in names)
      var tokens = base.split(/\s+-\s+|\s*[/|\\]\s*|\s+_\s+/).concat(base.split(/\s+/));
      for (var t = 0; t < tokens.length; t++) {
        var tok = tokens[t].trim();
        var tokLower = tok.toLowerCase();
        var tokNorm = _normalizeClassToken(tok);
        var tokNoZero = _stripZeroPaddingClassToken(tok);
        if (tokLower === cidLower || (cnameLower && tokLower === cnameLower)) return cid;
        if (tokNorm === cidNorm || (cnameNorm && tokNorm === cnameNorm)) return cid;
        if (tokNoZero === cidNoZero || (cnameNoZero && tokNoZero === cnameNoZero)) return cid;
      }

      // 4. Normalized prefix match
      if (baseNorm.startsWith(cidNorm) || (cnameNorm && baseNorm.startsWith(cnameNorm))) return cid;
      if (baseNoZero.startsWith(cidNoZero) || (cnameNoZero && baseNoZero.startsWith(cnameNoZero))) return cid;

      // 5. Word boundary regex
      try {
        var escCid = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp('\\b' + escCid + '\\b', 'i').test(base)) return cid;
        if (cname) {
          var escCname = cname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp('\\b' + escCname + '\\b', 'i').test(base)) return cid;
        }
      } catch (_) {}
    }
    return '';
  }

  // ── Declarative Entity Hierarchy & Relationship Rules ──────────────────────
  var RELATIONSHIP_RULES = {
    student: {
      parents: ['class'],
      resolveParents: function(studentId) {
        var st = resolveStudentInfo(studentId);
        if (!st) return [];
        var ids = Array.isArray(st.classIds) && st.classIds.length > 0
          ? st.classIds
          : (st.classId ? [st.classId] : []);
        return ids.filter(Boolean).map(function(cid) { return makeUrn('class', cid); });
      }
    },
    class: {
      parents: ['level'],
      resolveParents: function(classId) {
        var parents = [];
        var lvl = resolveClassLevel(classId);
        if (lvl) parents.push(makeUrn('level', lvl));
        return parents;
      }
    },
    planner: {
      parents: ['class'],
      resolveParents: function(slotId) {
        var clean = slotId.split('#')[0];
        if (clean.startsWith('sched:')) {
          var parts = clean.split(':');
          if (parts[1]) return [makeUrn('class', parts[1])];
        }
        if (typeof window !== 'undefined' && window.PLANNER_ENTRIES_BY_CLASS) {
          var byClass = window.PLANNER_ENTRIES_BY_CLASS;
          for (var cid in byClass) {
            var arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
            if (arr.some(function(e) { return e && (e.id === clean || e.plannerEntryId === clean); })) {
              return [makeUrn('class', cid)];
            }
          }
        }
        if (typeof window !== 'undefined' && window.PLANNER_CONFIG && Array.isArray(window.PLANNER_CONFIG.entries)) {
          var ent = window.PLANNER_CONFIG.entries.find(function(e) { return e && e.id === clean; });
          if (ent && ent.classId) return [makeUrn('class', ent.classId)];
        }
        if (_registryCache && _registryCache.entities) {
          var entMeta = _registryCache.entities[makeUrn('planner', clean)] || _registryCache.entities[makeUrn('slot', clean)] || _registryCache.entities[canonicalizeUrn(makeUrn('planner', clean))];
          if (entMeta) {
            var cid2 = entMeta.classId || entMeta.classGroup || (entMeta.meta && (entMeta.meta.classId || entMeta.meta.classGroup));
            if (cid2) return [makeUrn('class', cid2)];
          }
        }
        return [];
      }
    },
    slot: {
      parents: ['class'],
      resolveParents: function(slotId) {
        return RELATIONSHIP_RULES.planner.resolveParents(slotId);
      }
    },
    board: {
      parents: ['class', 'planner'],
      resolveParents: function(boardId) {
        var clean = boardId.split('#')[0];
        var parents = [];
        var classGroup = '';
        var plannerId = '';

        if (_registryCache && _registryCache.entities) {
          var meta = _registryCache.entities[makeUrn('board', clean)] || _registryCache.entities[canonicalizeUrn(makeUrn('board', clean))];
          if (meta) {
            classGroup = meta.classGroup || meta.classId || (meta.meta && (meta.meta.classGroup || meta.meta.classId)) || '';
            plannerId = meta.plannerEntryId || (meta.meta && (meta.meta.plannerEntryId || meta.meta.plannerId)) || '';
          }
        }
        if (!classGroup && !plannerId) {
          var metaCache = {};
          if (typeof localStorage !== 'undefined') {
            try { metaCache = JSON.parse(localStorage.getItem('board_history_meta_cache_v1') || '{}') || {}; } catch (_) {}
          }
          if (typeof window !== 'undefined' && window.boardHistoryMetaCache && typeof window.boardHistoryMetaCache === 'object') {
            metaCache = Object.assign({}, metaCache, window.boardHistoryMetaCache);
          }
          var hMeta = metaCache[clean] || metaCache[clean.split('/').pop()];
          if (hMeta) {
            classGroup = hMeta.classGroup || '';
            plannerId = hMeta.plannerEntryId || '';
          }
        }
        if (!classGroup) {
          classGroup = resolveClassGroupFromFilename(clean);
        }

        if (plannerId) parents.push(makeUrn('planner', plannerId));
        if (classGroup) parents.push(makeUrn('class', classGroup));
        return parents;
      }
    },
    mindmap: {
      parents: ['class', 'planner'],
      resolveParents: function(boardId) {
        return RELATIONSHIP_RULES.board.resolveParents(boardId);
      }
    },
    'board-node': {
      parents: ['board'],
      resolveParents: function(nodeId) {
        var clean = nodeId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board_node': {
      parents: ['board'],
      resolveParents: function(nodeId) {
        var clean = nodeId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board-note': {
      parents: ['board'],
      resolveParents: function(noteId) {
        var clean = noteId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board_note': {
      parents: ['board'],
      resolveParents: function(noteId) {
        var clean = noteId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board-group': {
      parents: ['board'],
      resolveParents: function(groupId) {
        var clean = groupId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board_group': {
      parents: ['board'],
      resolveParents: function(groupId) {
        var clean = groupId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board-shape': {
      parents: ['board'],
      resolveParents: function(shapeId) {
        var clean = shapeId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'board_shape': {
      parents: ['board'],
      resolveParents: function(shapeId) {
        var clean = shapeId.split('#')[0].split(':')[0];
        return clean ? [makeUrn('board', decodeURIComponent(clean))] : [];
      }
    },
    'doc_section': {
      parents: ['doc'],
      resolveParents: function(secId) {
        var clean = secId.split('#')[0];
        return clean ? [makeUrn('doc', clean)] : [];
      }
    },
    'phase': {
      parents: ['lesson'],
      resolveParents: function(phaseId) {
        var clean = phaseId.split('#')[0];
        if (clean && clean.indexOf(':') !== -1) {
          clean = clean.split(':')[0];
        }
        return clean ? [makeUrn('lesson', clean)] : [];
      }
    },
    'test-exercise': {
      parents: ['test'],
      resolveParents: function(exId) {
        var clean = exId.split('#')[0];
        return clean ? [makeUrn('test', clean)] : [];
      }
    },
    'eval': {
      parents: ['class'],
      resolveParents: function(evalId) {
        var parts = evalId.split(':');
        return parts[0] ? [makeUrn('class', parts[0])] : [];
      }
    },
    'gradesheet': {
      parents: ['class'],
      resolveParents: function(gsId) {
        var parts = gsId.split(':');
        return parts[0] ? [makeUrn('class', parts[0])] : [];
      }
    },
    'grade': {
      parents: ['class'],
      resolveParents: function(gId) {
        return RELATIONSHIP_RULES.gradesheet.resolveParents(gId);
      }
    },
    'grade_cell': {
      parents: ['eval', 'student'],
      resolveParents: function(cellId) {
        var parts = cellId.split(':');
        var results = [];
        if (parts.length >= 3) {
          results.push(makeUrn('eval', parts[0] + ':' + parts[1] + ':' + parts[2]));
        }
        if (parts[3] === 'student' && parts[4]) {
          results.push(makeUrn('student', parts[4]));
        }
        return results;
      }
    }
  };

  function resolveEntityAncestors(urn) {
    if (!urn) return [];
    var p = parseUrn(urn);
    if (!p) return [];
    var cUrn = canonicalizeUrn(urn);
    var ancestors = [];
    var visited = new Set([cUrn]);

    function walk(type, id) {
      var rule = RELATIONSHIP_RULES[type];
      if (!rule || typeof rule.resolveParents !== 'function') return;
      try {
        var parents = rule.resolveParents(id);
        if (Array.isArray(parents)) {
          parents.forEach(function(parentUrn) {
            if (!parentUrn) return;
            var cParent = canonicalizeUrn(parentUrn);
            if (!visited.has(cParent)) {
              visited.add(cParent);
              ancestors.push(cParent);
              var parsed = parseUrn(cParent);
              if (parsed) walk(parsed.type, parsed.id);
            }
          });
        }
      } catch (_) {}
    }

    walk(p.type, p.id);
    return ancestors;
  }

  /**
   * Resolves an entity's display information (title, subtitle, badge, type, relativePath, tags)
   * from registered metadata or infers it gracefully from the URN.
   * Guarantees human-readable student names and class titles instead of raw UUIDs.
   */
  async function resolveUrnDisplay(urn) {
    if (!urn) return { urn: '', canonicalUrn: '', type: 'unknown', title: 'Unknown', subtitle: '', badge: '[ITEM]', tags: [] };
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    await _ensureRosterLoaded();
    var meta = (reg.entities && (reg.entities[cUrn] || reg.entities[urn])) || null;
    var p = parseUrn(urn) || { type: 'unknown', id: urn, anchor: '' };
    var type = p.type;
    var badge = '[' + type.toUpperCase() + ']';

    // Detect if meta.title is a raw UUID or default "Student: <uuid>"
    var isRawTitle = false;
    if (meta && meta.title) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meta.title) ||
          /^student:\s*[0-9a-f-]{30,}$/i.test(meta.title) ||
          /^class:\s*[0-9a-f-]{30,}$/i.test(meta.title)) {
        isRawTitle = true;
      }
    }

    if (meta && meta.title && !isRawTitle && type !== 'student' && type !== 'class') {
      return {
        urn: urn,
        canonicalUrn: cUrn,
        type: type,
        badge: meta.badge || badge,
        icon: meta.icon || 'links.svg',
        title: meta.title,
        subtitle: meta.subtitle || meta.relativePath || '',
        relativePath: meta.relativePath || '',
        target: meta.target || '',
        tags: getTagsForSync(cUrn),
        meta: meta
      };
    }

    // Infer friendly display when not explicitly registered
    var title = p.id;
    var subtitle = '';
    var relPath = '';
    var target = '';
    var icon = 'links.svg';

    switch (type) {
      case 'doc':
      case 'document': {
        badge = '[DOC]';
        var docName = p.id.split('/').pop() || p.id;
        title = docName.replace(/\.md$/i, '').replace(/_/g, ' ');
        subtitle = 'Document Editor • ' + p.id;
        relPath = p.id;
        target = 'docEditorDocs';
        break;
      }
      case 'lesson': {
        badge = '[LESSON]';
        title = p.id.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        subtitle = 'Lesson Plan • ' + p.id;
        relPath = p.id;
        target = 'user';
        break;
      }
      case 'test': {
        badge = '[TEST]';
        title = p.id.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        subtitle = 'Test Creator • ' + p.id;
        relPath = p.id;
        target = 'user';
        break;
      }
      case 'board': {
        badge = '[MINDMAP]';
        title = p.id.replace(/\.(json|js|cstz|zip)$/i, '').replace(/_/g, ' ');
        subtitle = 'Board Mindmap • ' + p.id;
        relPath = p.id;
        target = 'mindmaps';
        break;
      }
      case 'board-node':
      case 'board_node': {
        badge = '[BOARD NODE]';
        var bParts = p.id.split(':');
        var bFile = decodeURIComponent(bParts[0] || '');
        var bNode = decodeURIComponent(bParts[1] || p.id);
        title = (meta && meta.title && !isRawTitle) ? meta.title : bNode;
        subtitle = 'Board Node • ' + (bFile ? bFile.replace(/\.(json|js|cstz)$/i, '') + ' • ' : '') + bNode;
        break;
      }
      case 'board-note':
      case 'board_note': {
        badge = '[BOARD NOTE]';
        var nParts = p.id.split(':');
        var nFile = decodeURIComponent(nParts[0] || '');
        var nNote = decodeURIComponent(nParts[1] || p.id);
        title = (meta && meta.title && !isRawTitle) ? meta.title : ('Note ' + nNote);
        subtitle = 'Board Sticky Note • ' + (nFile ? nFile.replace(/\.(json|js|cstz)$/i, '') + ' • ' : '') + nNote;
        break;
      }
      case 'board-group':
      case 'board_group': {
        badge = '[BOARD GROUP]';
        var gParts = p.id.split(':');
        var gFile = decodeURIComponent(gParts[0] || '');
        var gGroup = decodeURIComponent(gParts[1] || p.id);
        title = (meta && meta.title && !isRawTitle) ? meta.title : ('Group ' + gGroup);
        subtitle = 'Board Mindmap Group • ' + (gFile ? gFile.replace(/\.(json|js|cstz)$/i, '') + ' • ' : '') + gGroup;
        break;
      }
      case 'board-shape':
      case 'board_shape': {
        badge = '[BOARD SHAPE]';
        var sParts = p.id.split(':');
        var sFile = decodeURIComponent(sParts[0] || '');
        var sShape = decodeURIComponent(sParts[1] || p.id);
        title = (meta && meta.title && !isRawTitle) ? meta.title : ('Shape ' + sShape);
        subtitle = 'Board Shape • ' + (sFile ? sFile.replace(/\.(json|js|cstz)$/i, '') + ' • ' : '') + sShape;
        break;
      }
      case 'planner':
      case 'slot': {
        badge = '[PLANNER]';
        icon = 'planner.svg';
        var slotTitle = (meta && meta.title && !isRawTitle) ? meta.title : null;
        if (!slotTitle) {
          if (p.id.startsWith('sched:')) {
            var parts = p.id.split(':');
            var cName = resolveClassName(parts[1]) || parts[1];
            slotTitle = (cName ? cName + ' • ' : '') + (parts[2] || '') + (parts[3] ? ' ' + parts[3] : '');
          } else if (typeof window !== 'undefined' && window.PLANNER_CONFIG && Array.isArray(window.PLANNER_CONFIG.entries)) {
            var ent = window.PLANNER_CONFIG.entries.find(function(e) { return e && e.id === p.id; });
            if (ent) {
              var cName2 = resolveClassName(ent.classId) || ent.classId;
              slotTitle = (cName2 ? cName2 + ' • ' : '') + (ent.date || '') + (ent.time ? ' ' + ent.time : '') + (ent.topic ? ' · ' + ent.topic : '');
            }
          }
        }
        title = slotTitle || ('Planner Slot: ' + p.id);
        subtitle = 'Timetable Slot';
        break;
      }
      case 'year':
      case 'academic_year':
      case 'school_year': {
        badge = '[YEAR]';
        icon = 'calendar.svg';
        title = (meta && meta.title && !isRawTitle) ? meta.title : ('Academic Year ' + p.id);
        subtitle = 'School Year';
        break;
      }
      case 'todo':
      case 'todos': {
        badge = '[TODO]';
        icon = 'planner.svg';
        var todoText = (meta && (meta.text || meta.title) && !isRawTitle) ? (meta.text || meta.title) : null;
        if (!todoText && typeof window !== 'undefined' && Array.isArray(window.TODOS)) {
          var matchedTd = window.TODOS.find(function(t) { return t && (t.id === p.id || String(t.id) === String(p.id)); });
          if (matchedTd && matchedTd.text) todoText = matchedTd.text;
        }
        title = todoText || ('To-Do: ' + p.id);
        subtitle = 'Planner To-Do';
        break;
      }
      case 'level':
      case 'yearlevel': {
        badge = '[LEVEL]';
        icon = 'groups.svg';
        var lvlId = p.id.toUpperCase();
        var lvlLabel = lvlId;
        if (lvlId === '6EME' || lvlId === '6' || lvlId === '6E' || lvlId === '6ÈME') lvlLabel = '6ème (Grade 6)';
        else if (lvlId === '5EME' || lvlId === '5' || lvlId === '5E' || lvlId === '5ÈME') lvlLabel = '5ème (Grade 7)';
        else if (lvlId === '4EME' || lvlId === '4' || lvlId === '4E' || lvlId === '4ÈME') lvlLabel = '4ème (Grade 8)';
        else if (lvlId === '3EME' || lvlId === '3' || lvlId === '3E' || lvlId === '3ÈME') lvlLabel = '3ème (Grade 9)';
        else if (lvlId === '2NDE' || lvlId === '2DE' || lvlId === '2' || lvlId === '2È' || lvlId === 'SECONDE') lvlLabel = '2nde (Grade 10)';
        else if (lvlId === '1ERE' || lvlId === '1RE' || lvlId === '1' || lvlId === '1È' || lvlId === 'PREMIERE' || lvlId === 'PREMIÈRE') lvlLabel = '1ère (Grade 11)';
        else if (lvlId === 'TERMINALE' || lvlId === 'TLE' || lvlId === 'TERM') lvlLabel = 'Terminale (Grade 12)';
        title = (meta && meta.title && !isRawTitle) ? meta.title : ('Level: ' + lvlLabel);
        subtitle = 'Academic Grade Level';
        break;
      }
      case 'class': {
        badge = '[CLASS]';
        icon = 'groups.svg';
        var resolvedCName = resolveClassName(p.id) || (meta && meta.title && !isRawTitle ? meta.title : null) || p.id;
        title = resolvedCName;
        subtitle = 'Class Group';
        break;
      }
      case 'student': {
        badge = '[STUDENT]';
        icon = 'admin-groups.svg';
        var stObj = resolveStudentInfo(p.id);
        var stName = (stObj && stObj.name) || resolveStudentName(p.id) || (meta && meta.title && !isRawTitle ? meta.title : null) || p.id;
        title = stName;
        var displayClasses = (stObj && Array.isArray(stObj.classNames) && stObj.classNames.length > 0)
          ? stObj.classNames.join(', ')
          : ((stObj && stObj.className) || '');
        subtitle = displayClasses ? ('Student • ' + displayClasses) : 'Student Roster';
        break;
      }
      case 'gradesheet':
      case 'eval':
      case 'evaluation': {
        badge = '[GRADE SHEET]';
        icon = 'grade-sheet.svg';
        var parts = p.id.split(':');
        var cId = parts[0] || '';
        var sem = parts[1] || 'sem1';
        var testParam = parts[2] || '';
        var cTitle = resolveClassName(cId) || cId;
        var sLabel = sem === 'sem1' ? 'Sem 1' : 'Sem 2';
        if (parts[3] === 'student' && parts[4]) {
          var stn = resolveStudentName(parts[4]) || parts[4];
          title = stn + ' (' + cTitle + ' • ' + sLabel + ' Test ' + (parseInt(testParam, 10) + 1 || testParam) + ')';
          subtitle = 'Grade Evaluation • ' + cTitle;
        } else if (parts.length === 1 || !testParam) {
          title = cTitle + ' Grade Sheet';
          subtitle = 'Class Evaluations & Assessments';
        } else {
          title = cTitle + ' (' + sLabel + (testParam !== '' ? ' • Test ' + (parseInt(testParam, 10) + 1 || testParam) : '') + ')';
          subtitle = 'Grade Sheet Evaluation • ' + cTitle;
        }
        break;
      }
      case 'competence': {
        badge = '[COMPETENCE]';
        title = p.id;
        subtitle = 'Curriculum Standard / CEFR';
        break;
      }
      case 'criteria':
      case 'criterion': {
        badge = '[CRITERIA]';
        title = p.id.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        subtitle = 'Evaluation Criteria Rubric';
        break;
      }
      case 'scale': {
        badge = '[SCALE]';
        title = p.id;
        subtitle = 'Grading Scale';
        break;
      }
      case 'vocab':
      case 'word':
      case 'words':
      case 'wordbanks':
      case 'wordbank': {
        icon = 'book.svg';
        var cleanW = p.id.split('#')[0];
        var isFile = /\.(json|js)$/i.test(cleanW);
        var leafW = cleanW.split(/[\\/]/).pop() || cleanW;
        if (isFile) {
          badge = '[WORDBANK]';
          title = leafW.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
          if (p.anchor) title += ' #' + p.anchor;
          subtitle = 'Vocabulary Word Bank • ' + leafW;
          relPath = cleanW;
          target = 'customWordbanks';
        } else {
          badge = '[WORD]';
          title = decodeURIComponent(cleanW);
          if (p.anchor) title += ' #' + p.anchor;
          subtitle = 'Vocabulary Word • ' + title;
          relPath = cleanW;
          target = 'customWordbanks';
        }
        break;
      }
      case 'quotebank':
      case 'quote': {
        icon = 'chat.svg';
        badge = '[QUOTE]';
        var cleanQ = p.id.split('#')[0];
        var leafQ = cleanQ.split(/[\\/]/).pop() || cleanQ;
        title = leafQ.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Quotes Bank • ' + leafQ;
        relPath = cleanQ;
        target = 'customQuotes';
        break;
      }
      case 'dictation': {
        badge = '[DICTATION]';
        var cleanD = p.id.split('#')[0];
        var leafD = cleanD.split(/[\\/]/).pop() || cleanD;
        title = leafD.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Dictations Bank • ' + leafD;
        relPath = cleanD;
        target = 'customDictations';
        break;
      }
      case 'grammar':
      case 'grammarbank': {
        badge = '[GRAMMAR]';
        var cleanGr = p.id.split('#')[0];
        var leafGr = cleanGr.split(/[\\/]/).pop() || cleanGr;
        title = leafGr.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Grammar Bank • ' + leafGr;
        relPath = cleanGr;
        target = 'customGrammarbanks';
        break;
      }
      case 'gapfill':
      case 'gapfillbank': {
        badge = '[GAP-FILL]';
        var cleanGf = p.id.split('#')[0];
        var leafGf = cleanGf.split(/[\\/]/).pop() || cleanGf;
        title = leafGf.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Gap-Fill Bank • ' + leafGf;
        relPath = cleanGf;
        target = 'customGapfillbanks';
        break;
      }
      case 'error':
      case 'errorbank': {
        badge = '[ERROR BANK]';
        var cleanErr = p.id.split('#')[0];
        var leafErr = cleanErr.split(/[\\/]/).pop() || cleanErr;
        title = leafErr.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Error Correction Bank • ' + leafErr;
        relPath = cleanErr;
        target = 'customErrorbanks';
        break;
      }
      case 'sentence':
      case 'sentencebank': {
        badge = '[SENTENCE]';
        var cleanSen = p.id.split('#')[0];
        var leafSen = cleanSen.split(/[\\/]/).pop() || cleanSen;
        title = leafSen.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Sentences Bank • ' + leafSen;
        relPath = cleanSen;
        target = 'customSentences';
        break;
      }
      case 'story':
      case 'storybank': {
        badge = '[STORY]';
        var cleanSt = p.id.split('#')[0];
        var leafSt = cleanSt.split(/[\\/]/).pop() || cleanSt;
        title = leafSt.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Stories Bank • ' + leafSt;
        relPath = cleanSt;
        target = 'customStorybanks';
        break;
      }
      case 'quiz':
      case 'quizzes': {
        badge = '[QUIZ]';
        var cleanQz = p.id.split('#')[0];
        var leafQz = cleanQz.split(/[\\/]/).pop() || cleanQz;
        title = leafQz.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Quiz Bank • ' + leafQz;
        relPath = cleanQz;
        target = 'customQuizzes';
        break;
      }
      case 'testbank':
      case 'exercise': {
        badge = '[TEST BANK]';
        var cleanTb = p.id.split('#')[0];
        var leafTb = cleanTb.split(/[\\/]/).pop() || cleanTb;
        title = leafTb.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Exercises Bank • ' + leafTb;
        relPath = cleanTb;
        target = 'customExercises';
        break;
      }
      case 'phase':
      case 'activity': {
        badge = '[PHASE]';
        var cleanPh = p.id.split('#')[0];
        var leafPh = cleanPh.split(/[\\/]/).pop() || cleanPh;
        title = leafPh.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Lesson Phases Bank • ' + leafPh;
        relPath = cleanPh;
        target = 'customPhases';
        break;
      }
      case 'chip':
      case 'chips': {
        badge = '[CHIP]';
        var cleanCp = p.id.split('#')[0];
        var leafCp = cleanCp.split(/[\\/]/).pop() || cleanCp;
        title = leafCp.replace(/\.(json|js)$/i, '').replace(/_/g, ' ');
        if (p.anchor) title += ' #' + p.anchor;
        subtitle = 'Observation Chips • ' + leafCp;
        relPath = cleanCp;
        target = 'customChips';
        break;
      }
      case 'file': {
        badge = '[FILE]';
        var fn = p.id.split('/').pop() || p.id;
        title = fn;
        subtitle = 'Attachment • ' + p.id;
        relPath = p.id;
        target = 'user';
        break;
      }
      default: {
        badge = '[' + type.toUpperCase() + ']';
        title = p.id;
        subtitle = type;
      }
    }

    return {
      urn: urn,
      canonicalUrn: cUrn,
      type: type,
      badge: badge,
      icon: icon,
      title: title,
      subtitle: subtitle,
      relativePath: relPath,
      target: target,
      tags: getTagsForSync(cUrn),
      meta: meta
    };
  }

  /**
   * Retrieves all items tagged with a specific tag, resolved with rich display metadata.
   */
  async function getItemsForTag(tagStr) {
    var tag = normalizeTag(tagStr);
    if (!tag) return [];
    var urns = await findByTag(tag);
    var results = [];
    for (var i = 0; i < urns.length; i++) {
      results.push(await resolveUrnDisplay(urns[i]));
    }
    return results;
  }

  /**
   * Returns a summary list of all tags present in the system with their resource count.
   */
  async function getTagSummary() {
    var reg = await loadRegistry();
    var tags = Object.keys(reg.tags || {}).sort();
    return tags.map(function(t) {
      return {
        tag: t,
        count: Array.isArray(reg.tags[t]) ? reg.tags[t].length : 0
      };
    });
  }

  // ── 4. Graph Edge Operations (Bidirectional Links) ───────────────────────────
  function _createInferredEdge(reg, urnA, urnB, primaryEdgeId, cascadeType) {
    if (!urnA || !urnB || urnA === urnB) return null;
    var cA = canonicalizeUrn(urnA);
    var cB = canonicalizeUrn(urnB);
    if (cA === cB) return null;

    var exists = reg.edges.some(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      return (s === cA && t === cB) || (s === cB && t === cA);
    });
    if (exists) return null;

    var infEdge = {
      id: 'edge_inf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      source: cA,
      target: cB,
      relation: 'inferred_hierarchy',
      meta: {
        inferred: true,
        autoLinkedFrom: primaryEdgeId,
        cascadeType: cascadeType
      },
      createdAt: Date.now()
    };
    reg.edges.push(infEdge);
    return infEdge;
  }

  function _findAssociatedBoardUrnsForClassOrSlot(classId, slotId, reg) {
    var results = new Set();
    if (!reg) return [];
    var cClassUrn = classId ? canonicalizeUrn(makeUrn('class', classId)) : '';
    var cSlotUrn = slotId ? canonicalizeUrn(makeUrn('planner', slotId)) : '';

    if (reg.entities) {
      Object.keys(reg.entities).forEach(function(u) {
        var p = parseUrn(u);
        if (p && (p.type === 'board' || p.type === 'mindmap')) {
          var meta = reg.entities[u];
          var mClass = meta.classGroup || meta.classId || (meta.meta && (meta.meta.classGroup || meta.meta.classId));
          var mSlot = meta.plannerEntryId || (meta.meta && (meta.meta.plannerEntryId || meta.meta.plannerId));
          if ((classId && mClass === classId) || (slotId && mSlot === slotId)) {
            results.add(canonicalizeUrn(u));
          }
        }
      });
    }

    if (reg.edges) {
      reg.edges.forEach(function(e) {
        var s = canonicalizeUrn(e.source);
        var t = canonicalizeUrn(e.target);
        var sp = parseUrn(s);
        var tp = parseUrn(t);
        if (sp && (sp.type === 'board' || sp.type === 'mindmap')) {
          if ((cClassUrn && t === cClassUrn) || (cSlotUrn && t === cSlotUrn)) results.add(s);
        }
        if (tp && (tp.type === 'board' || tp.type === 'mindmap')) {
          if ((cClassUrn && s === cClassUrn) || (cSlotUrn && s === cSlotUrn)) results.add(t);
        }
      });
    }

    if (typeof window !== 'undefined' && window.boardHistoryMetaCache) {
      Object.keys(window.boardHistoryMetaCache).forEach(function(k) {
        var h = window.boardHistoryMetaCache[k];
        if (h && ((classId && h.classGroup === classId) || (slotId && h.plannerEntryId === slotId))) {
          var normFile = k.replace(/\\/g, '/');
          results.add(canonicalizeUrn(makeUrn('board', normFile)));
        }
      });
    }

    return Array.from(results);
  }

  function _findAssociatedGradeSheetsForClass(classId) {
    if (!classId) return [];
    var results = [canonicalizeUrn(makeUrn('gradesheet', classId))];
    return results;
  }

  function expandAutonomousLinks(cSrc, cTgt, primaryEdgeId, reg) {
    if (!cSrc || !cTgt || !reg) return [];
    var pSrc = parseUrn(cSrc);
    var pTgt = parseUrn(cTgt);
    var srcType = (pSrc ? pSrc.type : '').toLowerCase();
    var tgtType = (pTgt ? pTgt.type : '').toLowerCase();

    var isConcreteArtifact = function(t) {
      return t.startsWith('board') || t === 'doc' || t === 'document' || t === 'file' ||
             t === 'lesson' || t === 'test' || t === 'eval' || t === 'gradesheet' || t === 'planner' || t === 'slot';
    };

    var srcAncestors = resolveEntityAncestors(cSrc);
    var tgtAncestors = resolveEntityAncestors(cTgt);
    var created = [];

    // 1. Source connects upward to Target's direct ancestors
    tgtAncestors.forEach(function(tgtAnc) {
      var pAnc = parseUrn(tgtAnc);
      var ancType = (pAnc ? pAnc.type : '').toLowerCase();
      // Concrete artifacts must NEVER connect upward to a generic grade LEVEL
      if (ancType === 'level' && isConcreteArtifact(srcType)) {
        return;
      }
      var e = _createInferredEdge(reg, cSrc, tgtAnc, primaryEdgeId, 'upward_target');
      if (e) created.push(e);
    });

    // 2. Target connects upward to Source's direct ancestors
    srcAncestors.forEach(function(srcAnc) {
      var pAnc2 = parseUrn(srcAnc);
      var ancType2 = (pAnc2 ? pAnc2.type : '').toLowerCase();
      if (ancType2 === 'level' && isConcreteArtifact(tgtType)) {
        return;
      }
      var e = _createInferredEdge(reg, cTgt, srcAnc, primaryEdgeId, 'upward_source');
      if (e) created.push(e);
    });

    return created;
  }

  async function addLink(sourceUrn, targetUrn, opts) {
    if (sourceUrn && typeof sourceUrn === 'object' && !targetUrn) {
      opts = sourceUrn;
      sourceUrn = opts.sourceUrn || opts.source;
      targetUrn = opts.targetUrn || opts.target;
      opts = {
        relation: opts.relation || opts.rel || 'related',
        meta: Object.assign({}, opts.meta || {}, opts.label ? { label: opts.label } : {})
      };
    }
    if (!sourceUrn || !targetUrn) return null;
    var cSrc = canonicalizeUrn(sourceUrn);
    var cTgt = canonicalizeUrn(targetUrn);
    if (cSrc === cTgt) return null;
    var reg = await loadRegistry();
    opts = opts || {};

    // Check if edge already exists in either direction (canonical match)
    var existing = reg.edges.find(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      return (s === cSrc && t === cTgt) || (s === cTgt && t === cSrc);
    });

    if (existing) {
      // If it was previously an inferred edge and now being explicitly added, promote it
      if (existing.meta && existing.meta.inferred) {
        delete existing.meta.inferred;
        delete existing.meta.autoLinkedFrom;
        delete existing.meta.cascadeType;
      }
      if (opts.relation) existing.relation = opts.relation;
      if (opts.meta) existing.meta = Object.assign({}, existing.meta || {}, opts.meta);
      await saveRegistry(reg);
      return existing;
    }

    var edge = {
      id: 'edge_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      source: cSrc,
      target: cTgt,
      relation: opts.relation || 'related',
      meta: opts.meta || {},
      createdAt: Date.now()
    };

    reg.edges.push(edge);

    // Optionally save entity summaries if provided in opts
    if (opts.sourceMeta) reg.entities[cSrc] = Object.assign(reg.entities[cSrc] || {}, opts.sourceMeta);
    if (opts.targetMeta) reg.entities[cTgt] = Object.assign(reg.entities[cTgt] || {}, opts.targetMeta);

    // Autonomous cascade of hierarchical links
    if (opts.autonomous !== false) {
      await _ensureRosterLoaded();
      expandAutonomousLinks(cSrc, cTgt, edge.id, reg);
    }

    await saveRegistry(reg);

    if (_channel) {
      try {
        _channel.postMessage({ action: 'link-added', source: cSrc, target: cTgt, edgeId: edge.id });
      } catch (_) {}
    }

    return edge;
  }

  async function promoteInferredLink(sourceUrn, targetUrn) {
    if (!sourceUrn || !targetUrn) return false;
    var cSrc = canonicalizeUrn(sourceUrn);
    var cTgt = canonicalizeUrn(targetUrn);
    var reg = await loadRegistry();
    var found = reg.edges.find(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      return (s === cSrc && t === cTgt) || (s === cTgt && t === cSrc);
    });
    if (!found) return false;
    if (found.meta) {
      delete found.meta.inferred;
      delete found.meta.autoLinkedFrom;
      delete found.meta.cascadeType;
    }
    if (found.relation === 'inferred_hierarchy') {
      found.relation = 'related';
    }
    await saveRegistry(reg);
    if (_channel) {
      try {
        _channel.postMessage({ action: 'link-promoted', source: cSrc, target: cTgt });
      } catch (_) {}
    }
    return true;
  }

  async function removeLink(sourceUrn, targetUrn) {
    if (!sourceUrn || !targetUrn) return false;
    var cSrc = canonicalizeUrn(sourceUrn);
    var cTgt = canonicalizeUrn(targetUrn);
    var reg = await loadRegistry();
    var prevLen = reg.edges.length;

    reg.edges = reg.edges.filter(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      var isDirect = (s === cSrc && t === cTgt);
      var isReverse = (s === cTgt && t === cSrc);
      return !(isDirect || isReverse);
    });

    if (reg.edges.length === prevLen) return true; // Nothing removed

    await saveRegistry(reg);

    if (_channel) {
      try {
        _channel.postMessage({ action: 'link-removed', source: cSrc, target: cTgt });
      } catch (_) {}
    }

    return true;
  }

  async function removeLinksFor(urn) {
    if (!urn) return false;
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    var prevLen = reg.edges.length;

    reg.edges = reg.edges.filter(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      return s !== cUrn && t !== cUrn;
    });

    if (reg.edges.length === prevLen) return true;

    await saveRegistry(reg);

    if (_channel) {
      try {
        _channel.postMessage({ action: 'links-pruned', urn: cUrn });
      } catch (_) {}
    }

    return true;
  }

  async function getLinksFor(urn) {
    if (!urn) return [];
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    var results = [];

    reg.edges.forEach(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      if (s === cUrn) {
        results.push({
          edgeId: e.id,
          source: e.source,
          target: e.target,
          otherUrn: e.target,
          relation: e.relation,
          meta: e.meta || {},
          targetMeta: reg.entities[t] || reg.entities[e.target] || null,
          createdAt: e.createdAt,
          direction: 'outbound'
        });
      } else if (t === cUrn) {
        results.push({
          edgeId: e.id,
          source: e.source,
          target: e.target,
          otherUrn: e.source,
          relation: e.relation,
          meta: e.meta || {},
          targetMeta: reg.entities[s] || reg.entities[e.source] || null,
          createdAt: e.createdAt,
          direction: 'inbound'
        });
      }
    });

    return results;
  }

  function getLinksForSync(urn) {
    if (!urn || !_registryCache) return [];
    var cUrn = canonicalizeUrn(urn);
    var reg = _registryCache;
    var results = [];
    reg.edges.forEach(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      if (s === cUrn) {
        results.push({
          edgeId: e.id,
          source: e.source,
          target: e.target,
          otherUrn: e.target,
          relation: e.relation,
          meta: e.meta || {},
          targetMeta: (reg.entities && (reg.entities[t] || reg.entities[e.target])) || null,
          createdAt: e.createdAt,
          direction: 'outbound'
        });
      } else if (t === cUrn) {
        results.push({
          edgeId: e.id,
          source: e.source,
          target: e.target,
          otherUrn: e.source,
          relation: e.relation,
          meta: e.meta || {},
          targetMeta: (reg.entities && (reg.entities[s] || reg.entities[e.source])) || null,
          createdAt: e.createdAt,
          direction: 'inbound'
        });
      }
    });
    return results;
  }

  async function isLinked(sourceUrn, targetUrn) {
    if (!sourceUrn || !targetUrn) return false;
    var cSrc = canonicalizeUrn(sourceUrn);
    var cTgt = canonicalizeUrn(targetUrn);
    var reg = await loadRegistry();
    return reg.edges.some(function(e) {
      var s = canonicalizeUrn(e.source);
      var t = canonicalizeUrn(e.target);
      return (s === cSrc && t === cTgt) || (s === cTgt && t === cSrc);
    });
  }

  // ── 5. Global Tagging System (#tags) ─────────────────────────────────────────
  async function addTag(urn, tagStr) {
    var tag = normalizeTag(tagStr);
    if (!urn || !tag) return false;
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    if (!reg.tags[tag]) reg.tags[tag] = [];
    if (!reg.tags[tag].some(function(u) { return canonicalizeUrn(u) === cUrn; })) {
      reg.tags[tag].push(cUrn);
      await saveRegistry(reg);
      if (_channel) {
        try {
          _channel.postMessage({ action: 'tag-added', urn: cUrn, tag: tag });
        } catch (_) {}
      }
    }
    return true;
  }

  async function removeTag(urn, tagStr) {
    var tag = normalizeTag(tagStr);
    if (!urn || !tag) return false;
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    if (!reg.tags[tag]) return true;

    reg.tags[tag] = reg.tags[tag].filter(function(u) { return canonicalizeUrn(u) !== cUrn; });
    if (reg.tags[tag].length === 0) {
      delete reg.tags[tag];
    }

    await saveRegistry(reg);
    if (_channel) {
      try {
        _channel.postMessage({ action: 'tag-removed', urn: cUrn, tag: tag });
      } catch (_) {}
    }
    return true;
  }

  async function getTagsFor(urn) {
    if (!urn) return [];
    var cUrn = canonicalizeUrn(urn);
    var reg = await loadRegistry();
    var tags = [];
    Object.keys(reg.tags).forEach(function(t) {
      if (Array.isArray(reg.tags[t]) && reg.tags[t].some(function(u) { return canonicalizeUrn(u) === cUrn; })) {
        tags.push(t);
      }
    });
    return tags.sort();
  }

  function getTagsForSync(urn) {
    if (!urn || !_registryCache) return [];
    var cUrn = canonicalizeUrn(urn);
    var reg = _registryCache;
    var tags = [];
    Object.keys(reg.tags || {}).forEach(function(t) {
      if (Array.isArray(reg.tags[t]) && reg.tags[t].some(function(u) { return canonicalizeUrn(u) === cUrn; })) {
        tags.push(t);
      }
    });
    return tags.sort();
  }

  async function getAllTags() {
    var reg = await loadRegistry();
    return Object.keys(reg.tags).sort();
  }

  async function findByTag(tagStr) {
    var tag = normalizeTag(tagStr);
    if (!tag) return [];
    var reg = await loadRegistry();
    return Array.isArray(reg.tags[tag]) ? reg.tags[tag].slice() : [];
  }

  function _resolveUrnClassGroup(urn, targetMeta) {
    if (!urn) return '';
    var p = parseUrn(urn);
    if (!p) return '';
    if (p.type === 'class') return p.id;
    if (p.type === 'student') {
      var st = resolveStudentInfo(p.id);
      return (st && st.classId) || '';
    }
    if (p.type === 'eval' || p.type === 'gradesheet' || p.type === 'grade') {
      return p.id.split(':')[0] || '';
    }
    if (p.type === 'planner' || p.type === 'slot') {
      var clean = p.id.split('#')[0];
      if (clean.startsWith('sched:')) {
        return clean.split(':')[1] || '';
      }
      if (typeof window !== 'undefined' && window.PLANNER_CONFIG && Array.isArray(window.PLANNER_CONFIG.entries)) {
        var ent = window.PLANNER_CONFIG.entries.find(function(e) { return e && e.id === clean; });
        if (ent && ent.classId) return ent.classId;
      }
      if (typeof window !== 'undefined' && window.PLANNER_ENTRIES_BY_CLASS) {
        for (var cid in window.PLANNER_ENTRIES_BY_CLASS) {
          var arr = window.PLANNER_ENTRIES_BY_CLASS[cid] || [];
          if (arr.some(function(e) { return e && (e.id === clean || e.plannerEntryId === clean); })) {
            return cid;
          }
        }
      }
    }
    if (p.type === 'board' || p.type.startsWith('board-') || p.type.startsWith('board_')) {
      var bFile = p.id.split('#')[0].split(':')[0];
      var bClass = resolveClassGroupFromFilename(bFile);
      if (bClass) return bClass;
      if (_registryCache && _registryCache.entities) {
        var entMeta = _registryCache.entities[makeUrn('board', bFile)] || _registryCache.entities[canonicalizeUrn(makeUrn('board', bFile))];
        if (entMeta) {
          var cId = entMeta.classGroup || entMeta.classId || (entMeta.meta && (entMeta.meta.classGroup || entMeta.meta.classId));
          if (cId) return cId;
          var pid = entMeta.plannerEntryId || (entMeta.meta && (entMeta.meta.plannerEntryId || entMeta.meta.plannerId));
          if (pid) {
            var pClass = _resolveUrnClassGroup(makeUrn('planner', pid));
            if (pClass) return pClass;
          }
        }
      }
      var metaCache = {};
      if (typeof localStorage !== 'undefined') {
        try { metaCache = JSON.parse(localStorage.getItem('board_history_meta_cache_v1') || '{}') || {}; } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.boardHistoryMetaCache && typeof window.boardHistoryMetaCache === 'object') {
        metaCache = Object.assign({}, metaCache, window.boardHistoryMetaCache);
      }
      var hMeta = metaCache[bFile] || metaCache[bFile.split('/').pop()];
      if (hMeta) {
        if (hMeta.classGroup) return hMeta.classGroup;
        if (hMeta.plannerEntryId) {
          var pClass2 = _resolveUrnClassGroup(makeUrn('planner', hMeta.plannerEntryId));
          if (pClass2) return pClass2;
        }
      }
    }
    if (p.type === 'lesson') {
      if (_registryCache && _registryCache.entities) {
        var lMeta = _registryCache.entities[makeUrn('lesson', p.id)] || _registryCache.entities[canonicalizeUrn(makeUrn('lesson', p.id))];
        if (lMeta) {
          var lcId = lMeta.classId || lMeta.classGroup || (lMeta.meta && (lMeta.meta.classId || lMeta.meta.classGroup));
          if (lcId) return lcId;
          var lPid = lMeta.plannerEntryId || (lMeta.meta && (lMeta.meta.plannerEntryId || lMeta.meta.plannerId));
          if (lPid) return _resolveUrnClassGroup(makeUrn('planner', lPid));
        }
      }
    }
    if (targetMeta) {
      var tmClass = targetMeta.classId || targetMeta.classGroup || (targetMeta.meta && (targetMeta.meta.classId || targetMeta.meta.classGroup));
      if (tmClass) return String(tmClass);
    }
    return '';
  }

  function _isUrnOrMetaBoundToDifferentClass(otherUrn, targetMeta, classId, classIds) {
    if (!classId && (!classIds || !classIds.length)) return false;
    if (!otherUrn) return false;
    var boundClass = _resolveUrnClassGroup(otherUrn, targetMeta);
    if (!boundClass) return false;
    var boundLower = boundClass.trim().toLowerCase();
    if (Array.isArray(classIds) && classIds.length > 0) {
      var matchAny = classIds.some(function(cid) {
        return cid && String(cid).trim().toLowerCase() === boundLower;
      });
      return !matchAny;
    }
    if (classId) {
      return boundLower !== classId.trim().toLowerCase();
    }
    return false;
  }

  // ── 6. Context Inheritance Resolver & Multi-Tier Graph Traversal ───────────
  /**
   * Resolves direct links + parent class links + level links + container links for smart preselection.
   * @param {Object} entityRef - { type, id, classId, classIds, tags, ... }
   */
  async function resolveContext(entityRef) {
    if (!entityRef) return { direct: [], inherited: [], tags: [], criteria: [], scales: [], competences: [] };
    await _ensureRosterLoaded();
    var entityUrn = entityRef.urn || (entityRef.type && entityRef.id ? makeUrn(entityRef.type, entityRef.id, entityRef.anchor) : null);
    var cUrn = entityUrn ? canonicalizeUrn(entityUrn) : null;

    var directLinks = cUrn ? await getLinksFor(cUrn) : [];
    var directTags = cUrn ? await getTagsFor(cUrn) : [];

    var inheritedLinks = [];
    var seenInheritedUrns = new Set();
    var parsed = cUrn ? parseUrn(cUrn) : null;

    var classId = entityRef.classId || entityRef.classGroup || null;
    var classIds = Array.isArray(entityRef.classIds) ? entityRef.classIds.slice() : (classId ? [classId] : []);
    if (!classId && parsed) {
      if (parsed.type === 'student') {
        var stInfo = resolveStudentInfo(parsed.id);
        if (stInfo) {
          if (Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0) {
            classIds = stInfo.classIds.slice();
          }
          if (stInfo.classId) classId = stInfo.classId;
        }
      } else if (parsed.type === 'class') {
        classId = parsed.id;
        if (!classIds.includes(classId)) classIds.push(classId);
      } else if (parsed.type === 'eval' || parsed.type === 'gradesheet') {
        classId = parsed.id.split(':')[0];
        if (!classIds.includes(classId)) classIds.push(classId);
      } else if (parsed.type === 'board' || parsed.type.startsWith('board-')) {
        var bFile = parsed.id.split(':')[0];
        classId = resolveClassGroupFromFilename(bFile);
        if (classId && !classIds.includes(classId)) classIds.push(classId);
      }
    }

    var ancestors = cUrn ? resolveEntityAncestors(cUrn) : [];

    // 1. Ancestor Hierarchy traversal (e.g. Student -> Class -> Level)
    if (ancestors.length > 0) {
      for (var ai = 0; ai < ancestors.length; ai++) {
        var ancUrn = ancestors[ai];
        if (ancUrn === cUrn) continue;
        var aLinks = await getLinksFor(ancUrn);
        var parsedAnc = parseUrn(ancUrn);
        aLinks.forEach(function(al) {
          var otherCan = canonicalizeUrn(al.otherUrn);
          if (otherCan !== cUrn && !seenInheritedUrns.has(otherCan)) {
            var po = parseUrn(otherCan);
            var oType = (po ? po.type : '').toLowerCase();
            // From a generic grade LEVEL, only inherit curriculum standards (competence, criteria, scale).
            // NEVER inherit concrete class documents, lessons, board files, or planner slots.
            if (parsedAnc && parsedAnc.type === 'level') {
              if (oType !== 'competence' && oType !== 'criteria' && oType !== 'criterion' && oType !== 'scale') {
                return;
              }
            }
            if (_isUrnOrMetaBoundToDifferentClass(al.otherUrn, al.targetMeta, classId, classIds)) {
              return; // Skip cross-class inherited link
            }
            seenInheritedUrns.add(otherCan);
            inheritedLinks.push(Object.assign({}, al, {
              inheritedFrom: ancUrn,
              inheritanceReason: (parsedAnc && parsedAnc.type) || 'hierarchy'
            }));
          }
        });
      }
    }

    // 2. Class-specific inheritance fallback for all resolved classIds
    if (classIds.length > 0) {
      for (var ci = 0; ci < classIds.length; ci++) {
        var cid = classIds[ci];
        if (!cid) continue;
        var classUrn = canonicalizeUrn(makeUrn('class', cid));
        if (classUrn !== cUrn && (!ancestors || !ancestors.includes(classUrn))) {
          var cLinks = await getLinksFor(classUrn);
          cLinks.forEach(function(cl) {
            var otherCan = canonicalizeUrn(cl.otherUrn);
            if (otherCan !== cUrn && !seenInheritedUrns.has(otherCan)) {
              if (_isUrnOrMetaBoundToDifferentClass(cl.otherUrn, cl.targetMeta, cid, classIds)) {
                return;
              }
              seenInheritedUrns.add(otherCan);
              inheritedLinks.push(Object.assign({}, cl, { inheritedFrom: classUrn, inheritanceReason: 'class' }));
            }
          });
          var lvl = resolveClassLevel(cid);
          if (lvl) {
            var lvlUrn = canonicalizeUrn(makeUrn('level', lvl));
            var lLinks = await getLinksFor(lvlUrn);
            lLinks.forEach(function(ll) {
              var otherCan = canonicalizeUrn(ll.otherUrn);
              if (otherCan !== cUrn && !seenInheritedUrns.has(otherCan)) {
                if (_isUrnOrMetaBoundToDifferentClass(ll.otherUrn, ll.targetMeta, cid, classIds)) {
                  return;
                }
                seenInheritedUrns.add(otherCan);
                inheritedLinks.push(Object.assign({}, ll, { inheritedFrom: lvlUrn, inheritanceReason: 'level' }));
              }
            });
          }
        }
      }
    }

    // Merge and categorize links
    var all = directLinks.concat(inheritedLinks);
    var criteriaPresets = [];
    var gradingScales = [];
    var competences = [];
    var files = [];

    all.forEach(function(item) {
      var p = parseUrn(item.otherUrn);
      if (!p) return;
      if (p.type === 'criteria' || (item.meta && item.meta.category === 'criteria')) {
        criteriaPresets.push(item);
      } else if (p.type === 'scale' || (item.meta && item.meta.category === 'scale')) {
        gradingScales.push(item);
      } else if (p.type === 'competence' || (item.meta && item.meta.category === 'competence')) {
        competences.push(item);
      } else if (p.type === 'file' || p.type === 'doc' || p.type === 'document') {
        files.push(item);
      }
    });

    var topCrit = criteriaPresets[0] || null;
    var topScale = gradingScales[0] || null;
    var topInherited = inheritedLinks[0] || null;
    var critPresetVal = topCrit ? ((topCrit.meta && (topCrit.meta.bank || topCrit.meta.label)) || (parseUrn(topCrit.otherUrn) && parseUrn(topCrit.otherUrn).id) || null) : null;
    var scaleVal = topScale ? ((topScale.meta && (topScale.meta.modelKey || topScale.meta.label)) || (parseUrn(topScale.otherUrn) && parseUrn(topScale.otherUrn).id) || null) : null;
    var inhFromVal = topInherited ? ((topInherited.targetMeta && topInherited.targetMeta.title) || (topInherited.meta && topInherited.meta.label) || (parseUrn(topInherited.inheritedFrom) && parseUrn(topInherited.inheritedFrom).id) || null) : null;

    return {
      urn: entityUrn,
      direct: directLinks,
      inherited: inheritedLinks,
      tags: directTags,
      criteria: criteriaPresets,
      scales: gradingScales,
      competences: competences,
      files: files,
      criteriaPreset: critPresetVal,
      gradingScale: scaleVal,
      inheritedFrom: inhFromVal
    };
  }

  // ── 7. Deep-Linking Navigation Dispatcher ───────────────────────────────────
  /**
   * Opens any URN in the appropriate tool window with deep-link query params.
   */
  async function openUrn(urnStr) {
    var p = parseUrn(urnStr);
    if (!p) return false;

    var desktop = (typeof window !== 'undefined' && window.Desktop) ? window.Desktop : null;

    switch (p.type) {
      case 'gradesheet':
      case 'grade_cell':
      case 'eval':
      case 'evaluation':
      case 'submission':
      case 'grade': {
        // ID format: <classId> or <classId>:<sem>:<testIndexOrName> or <classId>:<sem>:<testIndex>:student:<studentId>
        var parts = p.id.split(':');
        var classId = parts[0] || '';
        var sem = parts[1] || 'sem1';
        var testParam = parts[2] || '';
        var query = { classId: classId };
        if (parts.length > 1) {
          query.sem = sem;
        }
        if (testParam !== '') {
          if (/^\d+$/.test(testParam)) {
            query.testIndex = parseInt(testParam, 10);
          } else {
            query.testName = testParam;
          }
        }
        if (parts[3] === 'student' && parts[4]) {
          query.studentId = parts[4];
        } else if (p.anchor) {
          query.studentId = p.anchor;
        }
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('grade-sheet.html', { query: query });
        }
        var qs = new URLSearchParams(query).toString();
        window.open('grade-sheet.html?' + qs, '_blank');
        return true;
      }

      case 'doc':
      case 'document':
      case 'doc_section': {
        // ID format: <target>/<relativePath> or <relativePath>
        var docParts = p.id.split('/');
        var target = 'docEditorDocs';
        var relPath = p.id;
        if (docParts[0] === 'docEditorDocs') {
          target = 'docEditorDocs';
          relPath = docParts.slice(1).join('/');
        } else if (docParts[0] === 'doceditor') {
          target = 'docEditorDocs';
          relPath = docParts.slice(1).join('/');
        } else if (docParts[0] === 'user') {
          if (docParts[1] === 'document-editor' && docParts[2] === 'docs') {
            target = 'docEditorDocs';
            relPath = docParts.slice(3).join('/');
          } else if (docParts[1] === 'doceditor') {
            target = 'docEditorDocs';
            relPath = docParts.slice(2).join('/');
          } else {
            target = 'user';
            relPath = docParts.slice(1).join('/');
          }
        }
        var docQuery = { editTarget: target, editRelPath: relPath };
        if (p.anchor) docQuery.section = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('document-editor.html', { query: docQuery });
        }
        var docQs = new URLSearchParams(docQuery).toString();
        window.open('document-editor.html?' + docQs, '_blank');
        return true;
      }

      case 'competence': {
        var compQuery = { code: p.id };
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('competence-portfolio.html', { query: compQuery });
        }
        window.open('competence-portfolio.html?code=' + encodeURIComponent(p.id), '_blank');
        return true;
      }

      case 'class': {
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('group-editor.html', { query: { classId: p.id } });
        }
        window.open('group-editor.html?classId=' + encodeURIComponent(p.id), '_blank');
        return true;
      }

      case 'student': {
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('group-editor.html', { query: { studentId: p.id } });
        }
        window.open('group-editor.html?studentId=' + encodeURIComponent(p.id), '_blank');
        return true;
      }

      case 'vocab':
      case 'word':
      case 'words':
      case 'wordbanks':
      case 'wordbank': {
        var cleanFileW = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var isFile = /\.(js|json)$/i.test(cleanFileW);
        var qW;
        if (isFile) {
          qW = { type: 'wordbanks', file: cleanFileW };
          if (p.anchor) qW.record = p.anchor;
        } else {
          qW = { type: 'wordbanks', word: decodeURIComponent(cleanFileW) };
        }
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qW });
        }
        var qsW = new URLSearchParams(qW).toString();
        window.open('manage-database.html?' + qsW, '_blank');
        return true;
      }

      case 'quote':
      case 'quotebank': {
        var cleanFileQ = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qQ = { type: 'quotebanks', file: cleanFileQ };
        if (p.anchor) qQ.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qQ });
        }
        var qsQ = new URLSearchParams(qQ).toString();
        window.open('manage-database.html?' + qsQ, '_blank');
        return true;
      }

      case 'dictation': {
        var cleanFileD = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qD = { type: 'dictations', file: cleanFileD };
        if (p.anchor) qD.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qD });
        }
        var qsD = new URLSearchParams(qD).toString();
        window.open('manage-database.html?' + qsD, '_blank');
        return true;
      }

      case 'gapfill':
      case 'gapfillbank': {
        var cleanFileG = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qG = { type: 'gapfillbanks', file: cleanFileG };
        if (p.anchor) qG.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qG });
        }
        var qsG = new URLSearchParams(qG).toString();
        window.open('manage-database.html?' + qsG, '_blank');
        return true;
      }

      case 'grammar':
      case 'grammarbank': {
        var cleanFileGr = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qGr = { type: 'grammarbanks', file: cleanFileGr };
        if (p.anchor) qGr.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qGr });
        }
        var qsGr = new URLSearchParams(qGr).toString();
        window.open('manage-database.html?' + qsGr, '_blank');
        return true;
      }

      case 'error':
      case 'errorbank': {
        var cleanFileErr = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qErr = { type: 'errorbanks', file: cleanFileErr };
        if (p.anchor) qErr.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qErr });
        }
        var qsErr = new URLSearchParams(qErr).toString();
        window.open('manage-database.html?' + qsErr, '_blank');
        return true;
      }

      case 'sentence':
      case 'sentencebank': {
        var cleanFileSen = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qSen = { type: 'sentencebanks', file: cleanFileSen };
        if (p.anchor) qSen.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qSen });
        }
        var qsSen = new URLSearchParams(qSen).toString();
        window.open('manage-database.html?' + qsSen, '_blank');
        return true;
      }

      case 'story':
      case 'storybank': {
        var cleanFileSt = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qSt = { type: 'storybanks', file: cleanFileSt };
        if (p.anchor) qSt.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qSt });
        }
        var qsSt = new URLSearchParams(qSt).toString();
        window.open('manage-database.html?' + qsSt, '_blank');
        return true;
      }

      case 'quiz':
      case 'quizzes': {
        var cleanFileQz = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qQz = { type: 'quizzes', file: cleanFileQz };
        if (p.anchor) qQz.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qQz });
        }
        var qsQz = new URLSearchParams(qQz).toString();
        window.open('manage-database.html?' + qsQz, '_blank');
        return true;
      }

      case 'testbank':
      case 'exercise': {
        var cleanFileTb = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qTb = { type: 'testbanks', file: cleanFileTb };
        if (p.anchor) qTb.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qTb });
        }
        var qsTb = new URLSearchParams(qTb).toString();
        window.open('manage-database.html?' + qsTb, '_blank');
        return true;
      }

      case 'phase':
      case 'activity': {
        var cleanFilePh = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qPh = { type: 'phases' };
        if (cleanFilePh && cleanFilePh !== 'phases') qPh.file = cleanFilePh;
        if (p.anchor) qPh.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qPh });
        }
        var qsPh = new URLSearchParams(qPh).toString();
        window.open('manage-database.html?' + qsPh, '_blank');
        return true;
      }

      case 'chip':
      case 'chips': {
        var cleanFileCp = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qCp = { type: 'chips', file: cleanFileCp };
        if (p.anchor) qCp.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qCp });
        }
        var qsCp = new URLSearchParams(qCp).toString();
        window.open('manage-database.html?' + qsCp, '_blank');
        return true;
      }

      case 'criteria':
      case 'criterion': {
        var cleanFileCr = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qCr = { type: 'criteria', file: cleanFileCr };
        if (p.anchor) qCr.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qCr });
        }
        var qsCr = new URLSearchParams(qCr).toString();
        window.open('manage-database.html?' + qsCr, '_blank');
        return true;
      }

      case 'scale':
      case 'scales': {
        var cleanFileSc = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        var qSc = { type: 'scales', file: cleanFileSc };
        if (p.anchor) qSc.record = p.anchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: qSc });
        }
        var qsSc = new URLSearchParams(qSc).toString();
        window.open('manage-database.html?' + qsSc, '_blank');
        return true;
      }

      case 'test':
      case 'test-exercise': {
        var rawTestId = p.id;
        var testAnchor = p.anchor || null;
        if (rawTestId.indexOf('#') !== -1) {
          var tParts = rawTestId.split('#');
          rawTestId = tParts[0];
          if (!testAnchor) testAnchor = tParts[1];
        }
        var testQuery = { testId: rawTestId };
        if (testAnchor) testQuery.exerciseId = testAnchor;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('test-creator.html', { query: testQuery });
        }
        var qs = new URLSearchParams(testQuery).toString();
        window.open('test-creator.html?' + qs, '_blank');
        return true;
      }

      case 'lesson': {
        var lQuery = { planId: p.id };
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('lesson-creator.html', { query: lQuery });
        }
        window.open('lesson-creator.html?planId=' + encodeURIComponent(p.id), '_blank');
        return true;
      }

      case 'planner':
      case 'planner-entry': {
        var planQuery = { entryId: p.id };
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('planner.html', { query: planQuery });
        }
        window.open('planner.html?entryId=' + encodeURIComponent(p.id), '_blank');
        return true;
      }

      case 'todo':
      case 'todos': {
        if (typeof localStorage !== 'undefined') {
          try { localStorage.setItem('cmt-planner-todo', p.id); } catch (_) {}
        }
        var todoQuery = { openTodo: p.id };
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('planner.html', { query: todoQuery });
        }
        var qsTd = new URLSearchParams(todoQuery).toString();
        window.open('planner.html?' + qsTd, '_blank');
        return true;
      }

      case 'board':
      case 'board_node':
      case 'board-node': {
        var bQuery = {};
        if (p.type === 'board-node' || p.type === 'board_node') {
          var nodeParts = p.id.split(':');
          if (nodeParts.length > 1) {
            bQuery.openSession = '1';
            bQuery.openTarget = 'mindmaps';
            bQuery.openSection = 'constellation';
            bQuery.openFilename = decodeURIComponent(nodeParts[0]);
            bQuery.nodeId = decodeURIComponent(nodeParts[1]);
          } else {
            bQuery.nodeId = p.id;
          }
        } else {
          bQuery.openSession = '1';
          bQuery.openTarget = 'mindmaps';
          bQuery.openSection = 'constellation';
          bQuery.openFilename = p.id;
          if (p.anchor) bQuery.nodeId = p.anchor;
        }
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('board.html', { query: bQuery });
        }
        var bQs = new URLSearchParams(bQuery).toString();
        window.open('board.html?' + bQs, '_blank');
        return true;
      }

      case 'file': {
        // Launch file via default OS app or in-app previewer
        if (desktop && typeof desktop.openPath === 'function') {
          desktop.openPath(p.id);
          return true;
        }
        if (typeof window.TagLinkModal !== 'undefined' && typeof window.TagLinkModal.previewFile === 'function') {
          window.TagLinkModal.previewFile(p.id);
          return true;
        }
        window.open(p.id, '_blank');
        return true;
      }

      default:
        console.warn('LinksService: Unknown URN type for openUrn:', p.type);
        return false;
    }
  }

  // ── 8. Managed Grade Sheet Attachment Store ─────────────────────────────────
  /**
   * Securely saves an attachment into user/attachments/grades/<classId>/<evalId>/
   */
  async function storeGradeAttachment(opts) {
    if (!opts || !opts.filename || !opts.content) {
      return { ok: false, error: 'Missing filename or content' };
    }
    var classId = String(opts.classId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    var evalId = String(opts.evalId || 'eval').replace(/[^a-zA-Z0-9_-]/g, '_');
    var studentPrefix = opts.studentId ? String(opts.studentId).replace(/[^a-zA-Z0-9_-]/g, '_') + '_' : '';

    var cleanFilename = studentPrefix + String(opts.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    var subdir = 'attachments/grades/' + classId + '/' + evalId;

    if (typeof window !== 'undefined' && window.Desktop && typeof Desktop.saveFile === 'function') {
      try {
        var res = await Desktop.saveFile({
          target: 'user',
          subdir: subdir,
          filename: cleanFilename,
          content: opts.content,
          encoding: opts.encoding || 'utf8'
        });
        if (res && res.ok) {
          var relPath = 'attachments/grades/' + classId + '/' + evalId + '/' + cleanFilename;
          var fileUrn = makeUrn('file', 'user/' + relPath);
          await registerEntity(fileUrn, {
            title: opts.title || cleanFilename,
            subtitle: (opts.studentName ? opts.studentName + ' • ' : '') + classId,
            type: 'file',
            target: 'user',
            relativePath: relPath
          });
          return { ok: true, relPath: relPath, urn: fileUrn };
        }
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    // Browser fallback
    return { ok: true, relPath: cleanFilename, urn: makeUrn('file', cleanFilename) };
  }

  // ── 9. Path Update Listener (File Renames) ───────────────────────────────────
  async function updatePath(oldPath, newPath) {
    if (!oldPath || !newPath) return false;
    var reg = await loadRegistry();
    var normOld = String(oldPath).replace(/\\/g, '/');
    var normNew = String(newPath).replace(/\\/g, '/');
    var modified = false;

    // Update in entities
    Object.keys(reg.entities).forEach(function(urn) {
      var ent = reg.entities[urn];
      if (ent && ent.relativePath) {
        var r = String(ent.relativePath).replace(/\\/g, '/');
        if (r === normOld || r.startsWith(normOld + '/')) {
          ent.relativePath = normNew + r.slice(normOld.length);
          modified = true;
        }
      }
    });

    if (modified) {
      await saveRegistry(reg);
    }
    return true;
  }

  function on(eventName, handler) {
    if (typeof window === 'undefined' || typeof handler !== 'function') return function () {};
    var wrapped = function (e) {
      handler(e && e.detail ? e.detail : e);
    };
    var evt = eventName === 'links-changed' ? 'cmt-links-changed' : eventName;
    window.addEventListener(evt, wrapped);
    return function () {
      window.removeEventListener(evt, wrapped);
    };
  }

  function _parseGradeFileContent(content) {
    try {
      var sandbox = {};
      var fn = new Function('window', content);
      fn(sandbox);
      return sandbox.GRADE_TEST_DATA || sandbox.GRADE_CLASS || null;
    } catch (_) {
      return null;
    }
  }

  // ── High-Performance In-Memory File Scanner Caches ──────────────────────────
  var _gradeScanCache = null;
  var _gradeScanPromise = null;
  var _boardScanCache = null;
  var _boardScanPromise = null;
  var _docScanCache = null;
  var _docScanPromise = null;
  var _participationScanCache = null;
  var _participationScanPromise = null;

  function _invalidateDossierScanCaches() {
    _gradeScanCache = null;
    _gradeScanPromise = null;
    _boardScanCache = null;
    _boardScanPromise = null;
    _docScanCache = null;
    _docScanPromise = null;
    _participationScanCache = null;
    _participationScanPromise = null;
  }

  async function _getOrScanGradeFiles() {
    if (_gradeScanCache && (Date.now() - _gradeScanCache.ts < 20000)) {
      return _gradeScanCache.data;
    }
    if (_gradeScanPromise) return _gradeScanPromise;

    _gradeScanPromise = (async function() {
      var result = { classList: [], testList: [] };
      if (typeof window === 'undefined' || !window.Desktop || typeof window.Desktop.listByPath !== 'function') {
        _gradeScanCache = { ts: Date.now(), data: result };
        _gradeScanPromise = null;
        return result;
      }
      try {
        var listResult = await window.Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
        if (!listResult || !listResult.ok || !Array.isArray(listResult.files)) {
          _gradeScanCache = { ts: Date.now(), data: result };
          _gradeScanPromise = null;
          return result;
        }

        var classFiles = listResult.files.filter(function(f) { return f.filename === '_class.js'; });
        var testFiles = listResult.files.filter(function(f) { return f.filename !== '_class.js'; });

        // Read all class files in parallel once
        await Promise.all(classFiles.map(async function(cf) {
          try {
            var res = await window.Desktop.readByPath('grades', cf.relativePath);
            if (!res || !res.content) return;
            var meta = _parseGradeFileContent(res.content);
            if (!meta) return;
            var normRel = cf.relativePath.replace(/\\/g, '/');
            var subdir = normRel.split('/').slice(0, -1).join('/');
            result.classList.push({ meta: meta, subdir: subdir, relativePath: normRel });
          } catch (_) {}
        }));

        // Read all test files in parallel once
        await Promise.all(testFiles.map(async function(tf) {
          try {
            var tRes = await window.Desktop.readByPath('grades', tf.relativePath);
            if (!tRes || !tRes.content) return;
            var testData = _parseGradeFileContent(tRes.content);
            if (!testData) return;
            var normRel = tf.relativePath.replace(/\\/g, '/');
            result.testList.push({ data: testData, relativePath: normRel });
          } catch (_) {}
        }));

        _gradeScanCache = { ts: Date.now(), data: result };
      } catch (_) {
        _gradeScanCache = { ts: Date.now(), data: result };
      }
      _gradeScanPromise = null;
      return result;
    })();

    return _gradeScanPromise;
  }

  async function _getOrScanBoardFiles() {
    if (_boardScanCache && (Date.now() - _boardScanCache.ts < 20000)) {
      return _boardScanCache.data;
    }
    if (_boardScanPromise) return _boardScanPromise;

    _boardScanPromise = (async function() {
      var allBoards = [];
      var metaCache = {};
      if (typeof localStorage !== 'undefined') {
        try {
          metaCache = JSON.parse(localStorage.getItem('board_history_meta_cache_v1') || '{}') || {};
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.boardHistoryMetaCache && typeof window.boardHistoryMetaCache === 'object') {
        metaCache = Object.assign({}, metaCache, window.boardHistoryMetaCache);
      }

      var seenPaths = new Set();

      function registerRawBoard(relPath, m, source, target) {
        if (!relPath) return;
        var normRel = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
        var key = normRel.toLowerCase();
        if (seenPaths.has(key)) return;
        seenPaths.add(key);

        var baseName = normRel.split('/').pop().replace(/\.(js|json|cstz|zip)$/i, '');
        var bClass = (m && (m.classGroup || m.classId)) || resolveClassGroupFromFilename(normRel) || '';
        var bSlot = (m && (m.plannerEntryId || m.plannerId)) || '';

        allBoards.push({
          relativePath: normRel,
          baseName: baseName,
          title: (m && m.title) || baseName.replace(/_/g, ' '),
          classGroup: bClass,
          plannerEntryId: bSlot,
          meta: m || {},
          source: source || 'mindmaps',
          target: target || 'mindmaps'
        });
      }

      // 1. Process items from metaCache
      Object.keys(metaCache).forEach(function(rel) {
        registerRawBoard(rel, metaCache[rel], 'cache', 'mindmaps');
      });

      // 2. Process items from board-sessions-backup.json
      if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.readJson === 'function') {
        try {
          var backupRes = await window.Desktop.readJson('user', 'board-sessions-backup.json');
          var store = (backupRes && backupRes.ok && backupRes.data) ? backupRes.data : null;
          if (store) {
            ['constellation', 'textanalysis', 'notes'].forEach(function(section) {
              var list = Array.isArray(store[section]) ? store[section] : [];
              list.forEach(function(e) {
                if (!e) return;
                var fn = e.relativePath || e.filename || (e.id ? (e.id + '.json') : '');
                var eMeta = {
                  classGroup: e.classGroup || (e.data && (e.data._classGroup || e.data.classGroup)) || '',
                  plannerEntryId: e.plannerEntryId || (e.data && (e.data._plannerEntryId || e.data.plannerEntryId)) || '',
                  title: e.name || e.title || '',
                  competences: e.competences || (e.data && e.data.competences) || []
                };
                registerRawBoard(fn, eMeta, 'backup', 'user');
              });
            });
          }
        } catch (_) {}
      }

      // 3. Process items from mindmaps filesystem
      if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.listByPath === 'function') {
        try {
          var listRes = await window.Desktop.listByPath('mindmaps', '', { recursive: true, extensions: ['.js', '.json', '.cstz', '.zip'] });
          var files = (listRes && listRes.ok && Array.isArray(listRes.files)) ? listRes.files : [];
          for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var relP = (f.relativePath || f.filename || '').replace(/\\/g, '/');
            if (!relP) continue;
            var cachedMeta = metaCache[relP] || metaCache[relP.split('/').pop()] || null;
            registerRawBoard(relP, cachedMeta, 'disk', 'mindmaps');
          }
        } catch (_) {}

        // Also scan user subfolders for constellations & mindmaps
        var userMindmapDirs = ['constellations', 'mindmaps', 'board'];
        for (var dIdx = 0; dIdx < userMindmapDirs.length; dIdx++) {
          try {
            var uListRes = await window.Desktop.listByPath('user', userMindmapDirs[dIdx], { recursive: true, extensions: ['.js', '.json', '.cstz', '.zip'] });
            if (uListRes && uListRes.ok && Array.isArray(uListRes.files)) {
              for (var uIdx = 0; uIdx < uListRes.files.length; uIdx++) {
                var uf = uListRes.files[uIdx];
                var uRel = (uf.relativePath || uf.filename || '').replace(/\\/g, '/');
                if (!uRel) continue;
                var uCached = metaCache[uRel] || metaCache[uRel.split('/').pop()] || null;
                registerRawBoard(uRel, uCached, 'disk', 'user');
              }
            }
          } catch (_) {}
        }
      }

      _boardScanCache = { ts: Date.now(), data: allBoards };
      _boardScanPromise = null;
      return allBoards;
    })();

    return _boardScanPromise;
  }

  async function _getOrScanDocEditorFiles() {
    if (_docScanCache && (Date.now() - _docScanCache.ts < 20000)) {
      return _docScanCache.data;
    }
    if (_docScanPromise) return _docScanPromise;

    _docScanPromise = (async function() {
      var allDocs = [];
      var seenKeys = new Set();

      function registerDoc(target, relPath, fileObj) {
        if (!relPath) return;
        var normRel = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
        var key = (target + ':' + normRel).toLowerCase();
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        var fn = normRel.split('/').pop() || normRel;
        var extMatch = fn.match(/\.([a-z0-9]+)$/i);
        var ext = extMatch ? extMatch[1].toLowerCase() : '';
        var baseName = fn.replace(/\.[^.]+$/, '');
        var title = baseName.replace(/_/g, ' ');

        allDocs.push({
          target: target,
          relativePath: normRel,
          filename: fn,
          baseName: baseName,
          title: title,
          extension: ext,
          meta: (fileObj && fileObj.meta) || {}
        });
      }

      var isElectron = typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.listByPath === 'function';
      if (isElectron) {
        // 1. Scan docEditorDocs target
        try {
          var listDocs = await window.Desktop.listByPath('docEditorDocs', '', { recursive: true, extensions: ['.md', '.html', '.typ', '.txt', '.pdf', '.docx'] });
          if (listDocs && Array.isArray(listDocs.files)) {
            listDocs.files.forEach(function(f) {
              registerDoc('docEditorDocs', f.relativePath || f.filename, f);
            });
          }
        } catch (_) {}

        // 2. Scan user target in document-editor / doceditor / files / attachments / tests / lessons
        var userSubdirs = ['doceditor', 'document-editor/docs', 'files', 'attachments', 'lessons', 'tests'];
        for (var i = 0; i < userSubdirs.length; i++) {
          try {
            var uList = await window.Desktop.listByPath('user', userSubdirs[i], { recursive: true, extensions: ['.md', '.html', '.typ', '.pdf', '.docx', '.txt', '.json'] });
            if (uList && Array.isArray(uList.files)) {
              uList.files.forEach(function(f) {
                var p = userSubdirs[i] + '/' + (f.relativePath || f.filename).replace(/\\/g, '/');
                registerDoc('user', p, f);
              });
            }
          } catch (_) {}
        }
      }

      _docScanCache = { ts: Date.now(), data: allDocs };
      _docScanPromise = null;
      return allDocs;
    })();

    return _docScanPromise;
  }

  /**
   * Scans user/grades/ to extract all tests, scores, criteria rubrics, and observations
   * recorded in Grade Sheet for a given student and computes weighted semester/annual averages.
   */
  async function _loadStudentGradeSheetData(studentId, classId, studentName, allClassIds) {
    var emptyRes = { classId: classId || '', className: '', classIds: [], tests: [], sem1Average: null, sem2Average: null, yearAverage: null, gradedCount: 0, totalTests: 0 };
    if (!studentId) return emptyRes;

    try {
      var scanResult = await _getOrScanGradeFiles();
      var classList = scanResult.classList || [];
      var testList = scanResult.testList || [];

      var targetName = (studentName || '').trim().toUpperCase();
      var stInfo = resolveStudentInfo(studentId) || {};
      var targetClassIds = Array.isArray(allClassIds) && allClassIds.length > 0
        ? allClassIds.slice()
        : (Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0
          ? stInfo.classIds.slice()
          : (classId ? [classId] : []));
      if (classId && !targetClassIds.includes(classId)) {
        targetClassIds.unshift(classId);
      }

      var matchedSubdirs = [];
      var subdirMetaMap = {};
      var gsStudentId = null;

      // 1. Locate matching class directories and student roster entries
      for (var i = 0; i < classList.length; i++) {
        var item = classList[i];
        var meta = item.meta || {};
        var subdir = item.subdir;
        var isTargetClassMatch = false;

        if (classId) {
          if (meta.classId === classId || meta.groupId === classId || subdir === classId) {
            isTargetClassMatch = true;
          }
        } else if (targetClassIds.length > 0) {
          if (targetClassIds.includes(meta.classId) || targetClassIds.includes(meta.groupId) || targetClassIds.includes(subdir)) {
            isTargetClassMatch = true;
          }
        }

        var studentMatch = (meta.students || []).find(function(s) {
          if (s.id && (s.id === studentId || String(s.id).toLowerCase() === String(studentId).toLowerCase())) return true;
          var first = (s.firstName || '').trim().toUpperCase();
          var last = (s.lastName || '').trim().toUpperCase();
          var full = last ? (first + ' ' + last) : first;
          return (targetName && (full === targetName || first === targetName));
        });

        if (studentMatch && !gsStudentId) {
          gsStudentId = studentMatch.id;
        }

        // If specific classId requested: only match that class
        if (classId) {
          if (isTargetClassMatch || (targetClassIds.length === 1 && studentMatch)) {
            if (!matchedSubdirs.includes(subdir)) {
              matchedSubdirs.push(subdir);
              subdirMetaMap[subdir] = meta;
            }
          }
        } else {
          // Multi-class / 360 dossier: collect all classes where student is enrolled
          if (isTargetClassMatch || studentMatch) {
            if (!matchedSubdirs.includes(subdir)) {
              matchedSubdirs.push(subdir);
              subdirMetaMap[subdir] = meta;
            }
          }
        }
      }

      if (matchedSubdirs.length === 0 && classId) {
        matchedSubdirs.push(classId);
      }
      if (matchedSubdirs.length === 0 && targetClassIds.length > 0) {
        targetClassIds.forEach(function(cid) { if (!matchedSubdirs.includes(cid)) matchedSubdirs.push(cid); });
      }
      if (matchedSubdirs.length === 0) {
        return emptyRes;
      }

      var targetStudentId = gsStudentId || studentId;

      // 2. Filter test files for all matched class subdirs
      var relevantTestFiles = testList.filter(function(t) {
        return matchedSubdirs.some(function(sub) {
          return t.relativePath.startsWith(sub + '/');
        });
      });

      var tests = [];
      var sem1Tests = [];
      var sem2Tests = [];
      var isMultiClass = matchedSubdirs.length > 1;

      for (var j = 0; j < relevantTestFiles.length; j++) {
        var testData = relevantTestFiles[j].data;
        if (!testData) continue;

        var sem = testData.semester;
        if (sem !== 'sem1' && sem !== 'sem2') continue;
        var idx = typeof testData.testIndex === 'number' ? testData.testIndex : 0;
        var cfg = testData.testConfig || {};
        var results = Array.isArray(testData.results) ? testData.results : [];

        var studentResult = results.find(function(r) {
          if (r.studentId && (r.studentId === targetStudentId || r.studentId === studentId || String(r.studentId).toLowerCase() === String(studentId).toLowerCase())) return true;
          if (targetName && r.name && r.name.trim().toUpperCase() === targetName) return true;
          return false;
        });

        var score = (studentResult && studentResult.score != null) ? studentResult.score : null;
        var testNotes = studentResult ? (studentResult.testNotes || []) : [];
        if (!Array.isArray(testNotes) && testNotes) testNotes = [testNotes];
        var criteriaResults = studentResult ? (studentResult.criteriaResults || {}) : {};
        var isOverridden = studentResult ? !!studentResult.gradeOverride : false;

        var testName = cfg.testName || ('Test ' + (idx + 1));
        var testDate = cfg.testDate || '';
        var testType = cfg.type || 'written';
        var coeff = (typeof cfg.coefficient === 'number' && !isNaN(cfg.coefficient)) ? cfg.coefficient : 1;
        var fixedW = (typeof cfg.fixedWeight === 'number' && !isNaN(cfg.fixedWeight)) ? cfg.fixedWeight : null;
        var maxScore = cfg.maxScore || null;
        var gradingScale = cfg.gradingScale || '';

        var fileRelPath = relevantTestFiles[j].relativePath;
        var fileSubdir = fileRelPath.split('/')[0] || '';
        var fileMeta = subdirMetaMap[fileSubdir] || {};
        var fileClassId = fileMeta.classId || fileSubdir || classId || 'active';
        var fileClassName = fileMeta.className || resolveClassName(fileClassId) || fileClassId;

        var testUrn = 'cmt:gradesheet:' + fileClassId + ':' + sem + ':' + idx + ':student:' + studentId;
        var semLabel = sem === 'sem1' ? 'SEM 1' : 'SEM 2';

        var subParts = [];
        if (score != null) {
          subParts.push('Score: ' + score + (maxScore ? ('/' + maxScore) : ''));
        } else {
          subParts.push('No score recorded');
        }
        if (isMultiClass && fileClassName) {
          subParts.push(fileClassName);
        }
        if (fixedW != null) {
          subParts.push('Fixed: ' + fixedW + '%');
        } else {
          subParts.push('Coeff: ' + coeff);
        }
        if (testDate) {
          subParts.push(testDate);
        }

        var badgeLabel = '[' + semLabel + (isMultiClass && fileClassName ? (' • ' + fileClassName) : '') + ' • ' + (testType || 'TEST').toUpperCase() + ']';

        var testItem = {
          urn: testUrn,
          type: 'gradesheet',
          source: 'gradesheet',
          semester: sem,
          testIndex: idx,
          title: testName,
          testDate: testDate,
          testType: testType,
          score: score,
          isOverridden: isOverridden,
          coefficient: coeff,
          fixedWeight: fixedW,
          maxScore: maxScore,
          gradingScale: gradingScale,
          testNotes: testNotes,
          criteriaResults: criteriaResults,
          criteria: cfg.criteria || [],
          badge: badgeLabel,
          subtitle: subParts.join(' • '),
          meta: {
            classId: fileClassId,
            className: fileClassName,
            semester: sem,
            testIndex: idx,
            testName: testName,
            testDate: testDate,
            testType: testType,
            score: score,
            maxScore: maxScore,
            coefficient: coeff,
            fixedWeight: fixedW,
            isOverridden: isOverridden,
            testNotes: testNotes,
            criteriaResults: criteriaResults,
            gradingScale: gradingScale
          }
        };

        tests.push(testItem);
        if (sem === 'sem1') sem1Tests.push(testItem);
        else sem2Tests.push(testItem);
      }

      tests.sort(function(a, b) {
        if (a.semester !== b.semester) return a.semester === 'sem1' ? -1 : 1;
        return a.testIndex - b.testIndex;
      });

      function calcSemAvg(tList) {
        var fixedSum = 0, fixedPct = 0, normalSum = 0, normalWeight = 0;
        var scoredCount = 0;
        tList.forEach(function(t) {
          if (t.score == null || isNaN(t.score)) return;
          scoredCount++;
          var num = Number(t.score);
          if (t.fixedWeight != null && !isNaN(t.fixedWeight) && t.fixedWeight > 0) {
            fixedSum += num * t.fixedWeight / 100;
            fixedPct += t.fixedWeight / 100;
          } else {
            var c = (typeof t.coefficient === 'number' && !isNaN(t.coefficient) && t.coefficient > 0) ? t.coefficient : 1;
            normalSum += num * c;
            normalWeight += c;
          }
        });
        if (scoredCount === 0) return null;
        if (fixedPct === 0 && normalWeight === 0) return null;
        if (fixedPct > 0 && normalWeight === 0) return fixedSum / fixedPct;
        var normalProportion = Math.max(0, 1 - fixedPct);
        var normalAvg = normalWeight > 0 ? normalSum / normalWeight : 0;
        return fixedSum + normalProportion * normalAvg;
      }

      var sem1Avg = calcSemAvg(sem1Tests);
      var sem2Avg = calcSemAvg(sem2Tests);
      var validAvgs = [sem1Avg, sem2Avg].filter(function(v) { return v != null; });
      var yearAvg = validAvgs.length ? (validAvgs.reduce(function(a, b) { return a + b; }, 0) / validAvgs.length) : null;
      var scoredTests = tests.filter(function(t) { return t.score != null && !isNaN(t.score); });
      var gradedCount = scoredTests.length;

      // Robust fallback: if semester-specific averages could not be calculated, compute overall weighted average of all scored tests
      if (yearAvg == null && scoredTests.length > 0) {
        var totalW = 0, totalWScore = 0;
        scoredTests.forEach(function(stItem) {
          var w = (typeof stItem.coefficient === 'number' && !isNaN(stItem.coefficient) && stItem.coefficient > 0) ? stItem.coefficient : 1;
          var sc = Number(stItem.score);
          var max = (typeof stItem.maxScore === 'number' && stItem.maxScore > 0) ? stItem.maxScore : 6;
          var normScore = max === 6 ? sc : (sc / max) * 6;
          totalWScore += normScore * w;
          totalW += w;
        });
        if (totalW > 0) {
          yearAvg = totalWScore / totalW;
        }
      }

      var primaryMatchedClassId = matchedSubdirs[0] || classId || '';
      var primaryMatchedClassName = (subdirMetaMap[primaryMatchedClassId] && subdirMetaMap[primaryMatchedClassId].className) || resolveClassName(primaryMatchedClassId) || '';

      return {
        classId: primaryMatchedClassId,
        className: primaryMatchedClassName,
        classIds: matchedSubdirs,
        tests: tests,
        sem1Average: sem1Avg != null ? Number(sem1Avg.toFixed(2)) : null,
        sem2Average: sem2Avg != null ? Number(sem2Avg.toFixed(2)) : null,
        yearAverage: yearAvg != null ? Number(yearAvg.toFixed(2)) : null,
        gradedCount: gradedCount,
        totalTests: tests.length
      };
    } catch (err) {
      console.warn('_loadStudentGradeSheetData error:', err);
      return emptyRes;
    }
  }

  /**
   * Scans and aggregates all board constellation and mindmap session files
   * associated with a student, their class groups, or their class planner slots.
   */
  async function _loadStudentBoardData(studentId, classId, level, allClassIds) {
    var boards = [];
    var seenKeys = new Set();
    if (!classId && !studentId && (!allClassIds || !allClassIds.length)) return boards;

    var stInfo = resolveStudentInfo(studentId) || {};
    var targetClassIds = Array.isArray(allClassIds) && allClassIds.length > 0
      ? allClassIds.slice()
      : (Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0
        ? stInfo.classIds.slice()
        : (classId ? [classId] : []));
    if (classId && !targetClassIds.includes(classId)) {
      targetClassIds.unshift(classId);
    }

    var cleanStId = String(studentId || '').trim().toLowerCase();
    var stFirstName = (stInfo.firstName || '').trim().toLowerCase();
    var stLastName = (stInfo.lastName || '').trim().toLowerCase();
    var normStudentName = (stInfo.name || '').trim().toLowerCase();
    var reg = await loadRegistry();

    // 1. Gather all planner slot IDs and lesson IDs belonging to ANY of the student's classes
    var classSlotIds = new Set();
    if (typeof window !== 'undefined') {
      targetClassIds.forEach(function(cid) {
        var cleanCid = String(cid).trim();
        var cleanCidLower = cleanCid.toLowerCase();
        if (window.PLANNER_ENTRIES_BY_CLASS && window.PLANNER_ENTRIES_BY_CLASS[cleanCid]) {
          var slots = Array.isArray(window.PLANNER_ENTRIES_BY_CLASS[cleanCid]) ? window.PLANNER_ENTRIES_BY_CLASS[cleanCid] : [];
          slots.forEach(function(s) {
            if (s && s.id) classSlotIds.add(String(s.id).trim());
            if (s && s.plannerEntryId) classSlotIds.add(String(s.plannerEntryId).trim());
          });
        }
        if (window.PLANNER_CONFIG && Array.isArray(window.PLANNER_CONFIG.entries)) {
          window.PLANNER_CONFIG.entries.forEach(function(e) {
            if (!e) return;
            var eCid = (e.classId || e.classGroup || '').trim();
            if (cleanCid && eCid.toLowerCase() === cleanCidLower && e.id) {
              classSlotIds.add(String(e.id).trim());
            }
          });
        }
      });
    }

    // 2. Gather relevant URNs for graph edge matching
    var relevantUrns = new Set();
    if (studentId) {
      relevantUrns.add(canonicalizeUrn(makeUrn('student', studentId)));
    }
    targetClassIds.forEach(function(cid) {
      if (cid) relevantUrns.add(canonicalizeUrn(makeUrn('class', cid)));
    });
    classSlotIds.forEach(function(sid) {
      relevantUrns.add(canonicalizeUrn(makeUrn('planner', sid)));
      relevantUrns.add(canonicalizeUrn(makeUrn('lesson', sid)));
    });

    // 3. Traverse registry edges for connected board mindmaps
    if (reg && Array.isArray(reg.edges)) {
      for (var rIdx = 0; rIdx < reg.edges.length; rIdx++) {
        var e = reg.edges[rIdx];
        var sCan = canonicalizeUrn(e.source);
        var tCan = canonicalizeUrn(e.target);
        var matchedOther = null;

        if (relevantUrns.has(sCan)) {
          matchedOther = tCan;
        } else if (relevantUrns.has(tCan)) {
          matchedOther = sCan;
        }

        if (matchedOther) {
          var pOther = parseUrn(matchedOther);
          var oType = (pOther ? pOther.type : '').toLowerCase();
          var isBoard = oType.startsWith('board') || oType === 'mindmap' || oType === 'mindmaps' || oType === 'constellation';
          if (!isBoard && e.meta && (e.meta.category === 'mindmap' || e.meta.category === 'board')) {
            isBoard = true;
          }

          if (isBoard) {
            var normRelOther = (pOther ? pOther.id : matchedOther).replace(/^cmt:board:/, '').replace(/^mindmaps\//, '');
            var keyOther = normRelOther.toLowerCase();
            if (!seenKeys.has(keyOther)) {
              seenKeys.add(keyOther);
              var display = await resolveUrnDisplay(matchedOther);
              var isArchivedOther = normRelOther.startsWith('archived/');
              var badgeOther = isArchivedOther ? '[ARCHIVED MINDMAP]' : '[MINDMAP]';
              var subOther = display.subtitle || ('Board Mindmap' + (targetClassIds[0] ? (' • ' + (resolveClassName(targetClassIds[0]) || targetClassIds[0])) : ''));

              boards.push({
                urn: matchedOther,
                type: 'board',
                source: 'registry',
                title: display.title,
                subtitle: subOther,
                badge: badgeOther,
                isArchived: isArchivedOther,
                relativePath: normRelOther,
                target: 'mindmaps',
                meta: Object.assign({}, display.meta || {}, e.meta || {}, {
                  classGroup: targetClassIds[0] || '',
                  isArchived: isArchivedOther,
                  relativePath: normRelOther,
                  target: 'mindmaps'
                })
              });
            }
          }
        }
      }
    }

    // 4. Match all scanned raw boards
    var allRawBoards = await _getOrScanBoardFiles();

    for (var i = 0; i < allRawBoards.length; i++) {
      var item = allRawBoards[i];
      var normRel = item.relativePath;
      var key = normRel.toLowerCase();
      if (seenKeys.has(key)) continue;

      var bClass = item.classGroup || resolveClassGroupFromFilename(normRel) || '';
      var bSlot = item.plannerEntryId || '';
      var relLower = normRel.toLowerCase();
      var baseLower = (item.baseName || '').toLowerCase();

      var isMatch = false;

      // Student match (UUID or name in file path/name)
      if (cleanStId && (relLower.includes(cleanStId) || baseLower.includes(cleanStId))) {
        isMatch = true;
      } else if (normStudentName && normStudentName.length >= 3 && (relLower.includes(normStudentName) || baseLower.includes(normStudentName.replace(/\s+/g, '_')))) {
        isMatch = true;
      } else if (stFirstName && stLastName && stFirstName.length >= 2 && stLastName.length >= 2 &&
                 (baseLower.includes(stFirstName) && baseLower.includes(stLastName))) {
        isMatch = true;
      }

      // Class match against any of targetClassIds
      if (!isMatch && targetClassIds.length > 0) {
        for (var tci = 0; tci < targetClassIds.length; tci++) {
          var cleanCid = String(targetClassIds[tci] || '').trim();
          var cleanCidLower = cleanCid.toLowerCase();
          var cleanCidNoPad = _stripZeroPaddingClassToken(cleanCid);
          if (!cleanCid) continue;

          if (bClass && (bClass.trim().toLowerCase() === cleanCidLower || _stripZeroPaddingClassToken(bClass) === cleanCidNoPad)) {
            isMatch = true;
            break;
          } else {
            var inferred = resolveClassGroupFromFilename(normRel);
            if (inferred && (inferred.trim().toLowerCase() === cleanCidLower || _stripZeroPaddingClassToken(inferred) === cleanCidNoPad)) {
              isMatch = true;
              break;
            } else {
              var pathParts = normRel.split('/');
              for (var pIdx = 0; pIdx < pathParts.length - 1; pIdx++) {
                var part = pathParts[pIdx].trim().toLowerCase();
                if (part === cleanCidLower || _stripZeroPaddingClassToken(part) === cleanCidNoPad) {
                  isMatch = true;
                  break;
                }
              }
              if (isMatch) break;
              var fnClassTokens = baseLower.split(/[^a-z0-9]+/);
              if (fnClassTokens.includes(cleanCidLower) || (cleanCidNoPad && fnClassTokens.includes(cleanCidNoPad))) {
                isMatch = true;
                break;
              }
            }
          }
        }
      }

      // Slot match
      if (!isMatch && bSlot && classSlotIds.has(bSlot)) {
        isMatch = true;
      }

      if (!isMatch) continue;

      seenKeys.add(key);
      var bUrn = canonicalizeUrn(makeUrn('board', normRel));
      var isArchived = normRel.startsWith('archived/');
      var badge = isArchived ? '[ARCHIVED MINDMAP]' : '[MINDMAP]';
      var subtitleParts = ['Board Mindmap'];
      if (isArchived) {
        subtitleParts.unshift('Archived');
      }
      if (bClass) {
        var cName = resolveClassName(bClass) || bClass;
        subtitleParts.push(cName);
      } else if (targetClassIds[0]) {
        var cName2 = resolveClassName(targetClassIds[0]) || targetClassIds[0];
        subtitleParts.push(cName2);
      }
      if (normRel.includes('/')) {
        subtitleParts.push(normRel);
      }

      boards.push({
        urn: bUrn,
        type: 'board',
        source: item.source || 'mindmaps',
        title: item.title || item.baseName.replace(/_/g, ' '),
        subtitle: subtitleParts.join(' • '),
        badge: badge,
        isArchived: isArchived,
        relativePath: normRel,
        target: item.target || 'mindmaps',
        meta: Object.assign({}, item.meta || {}, {
          classGroup: bClass || targetClassIds[0] || '',
          plannerEntryId: bSlot,
          isArchived: isArchived,
          relativePath: normRel,
          target: item.target || 'mindmaps'
        })
      });
    }

    return boards;
  }

  /**
   * Scans and aggregates all planner lesson slots for a student's class groups.
   */
  async function _loadStudentLessonData(studentId, classId, allClassIds) {
    var lessons = [];
    var seenIds = new Set();
    var stInfo = resolveStudentInfo(studentId) || {};
    var targetClassIds = Array.isArray(allClassIds) && allClassIds.length > 0
      ? allClassIds.slice()
      : (Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0
        ? stInfo.classIds.slice()
        : (classId ? [classId] : []));
    if (classId && !targetClassIds.includes(classId)) {
      targetClassIds.unshift(classId);
    }
    if (targetClassIds.length === 0) return lessons;

    var targetClassIdsLower = targetClassIds.map(function(c) { return String(c).trim().toLowerCase(); });

    if (typeof window !== 'undefined') {
      targetClassIds.forEach(function(cleanCid) {
        if (!cleanCid) return;
        if (window.PLANNER_ENTRIES_BY_CLASS && window.PLANNER_ENTRIES_BY_CLASS[cleanCid]) {
          var list = Array.isArray(window.PLANNER_ENTRIES_BY_CLASS[cleanCid]) ? window.PLANNER_ENTRIES_BY_CLASS[cleanCid] : [];
          list.forEach(function(ent) {
            if (!ent || !ent.id) return;
            var key = String(ent.id).trim();
            if (seenIds.has(key)) return;
            seenIds.add(key);
            var lUrn = canonicalizeUrn(makeUrn('planner', ent.id));
            var title = ent.title || ent.lessonTitle || ent.unitTitle || ('Lesson ' + (ent.slotIndex || ent.id));
            var subParts = [ent.date || ''];
            if (targetClassIds.length > 1) {
              subParts.push(resolveClassName(cleanCid) || cleanCid);
            }
            if (ent.subject) subParts.push(ent.subject);
            if (ent.room) subParts.push(ent.room);
            var sub = subParts.filter(Boolean).join(' • ');
            lessons.push({
              urn: lUrn,
              type: 'planner',
              source: 'planner',
              title: title,
              subtitle: sub || 'Planner Lesson Slot',
              badge: '[LESSON]',
              meta: ent
            });
          });
        }
      });

      if (window.PLANNER_CONFIG && Array.isArray(window.PLANNER_CONFIG.entries)) {
        window.PLANNER_CONFIG.entries.forEach(function(ent) {
          if (!ent || !ent.id) return;
          var eCid = (ent.classId || ent.classGroup || '').trim();
          if (!targetClassIdsLower.includes(eCid.toLowerCase())) return;
          var key = String(ent.id).trim();
          if (seenIds.has(key)) return;
          seenIds.add(key);
          var lUrn = canonicalizeUrn(makeUrn('planner', ent.id));
          var title = ent.title || ent.lessonTitle || ent.unitTitle || ('Lesson ' + (ent.slotIndex || ent.id));
          var subParts2 = [ent.date || ''];
          if (targetClassIds.length > 1 && eCid) {
            subParts2.push(resolveClassName(eCid) || eCid);
          }
          if (ent.subject) subParts2.push(ent.subject);
          if (ent.room) subParts2.push(ent.room);
          var sub2 = subParts2.filter(Boolean).join(' • ');
          lessons.push({
            urn: lUrn,
            type: 'planner',
            source: 'planner',
            title: title,
            subtitle: sub2 || 'Planner Lesson Slot',
            badge: '[LESSON]',
            meta: ent
          });
        });
      }
    }
    return lessons;
  }

  /**
   * Scans and aggregates all documents, handouts, worksheets, and attached files
   * associated with a student, their class groups, their evaluations/tests, or their delivered lesson plans.
   */
  async function _loadStudentDocumentData(studentId, classId, level, studentName, gradeData, lessonData, allClassIds) {
    var documents = [];
    var seenUrns = new Set();
    var reg = await loadRegistry();

    var stInfo = resolveStudentInfo(studentId) || {};
    var targetClassIds = Array.isArray(allClassIds) && allClassIds.length > 0
      ? allClassIds.slice()
      : (Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0
        ? stInfo.classIds.slice()
        : (classId ? [classId] : []));
    if (classId && !targetClassIds.includes(classId)) {
      targetClassIds.unshift(classId);
    }

    var cleanStId = String(studentId || '').trim().toLowerCase();
    var normStudentName = (studentName || '').trim().toLowerCase();
    var stFirstName = (stInfo.firstName || '').trim().toLowerCase();
    var stLastName = (stInfo.lastName || '').trim().toLowerCase();

    // 1. Gather all related URNs for graph edge matching
    var relevantUrns = new Set();
    if (studentId) {
      relevantUrns.add(canonicalizeUrn(makeUrn('student', studentId)));
    }
    targetClassIds.forEach(function(cid) {
      if (cid) relevantUrns.add(canonicalizeUrn(makeUrn('class', cid)));
    });
    (gradeData && gradeData.tests ? gradeData.tests : []).forEach(function(t) {
      if (t.urn) relevantUrns.add(canonicalizeUrn(t.urn));
      var tClass = (t.meta && t.meta.classId) || targetClassIds[0] || '';
      if (tClass && t.semester && t.testIndex !== undefined) {
        relevantUrns.add(canonicalizeUrn(makeUrn('eval', tClass + ':' + t.semester + ':' + t.testIndex)));
        if (studentId) {
          relevantUrns.add(canonicalizeUrn(makeUrn('eval', tClass + ':' + t.semester + ':' + t.testIndex + ':student:' + studentId)));
        }
      }
    });
    (lessonData || []).forEach(function(l) {
      if (l.urn) relevantUrns.add(canonicalizeUrn(l.urn));
      if (l.meta && l.meta.id) {
        relevantUrns.add(canonicalizeUrn(makeUrn('planner', l.meta.id)));
        relevantUrns.add(canonicalizeUrn(makeUrn('lesson', l.meta.id)));
      }
    });

    // 2. Traverse registry edges for connected documents/files/handouts
    if (reg && Array.isArray(reg.edges)) {
      for (var i = 0; i < reg.edges.length; i++) {
        var e = reg.edges[i];
        var sCan = canonicalizeUrn(e.source);
        var tCan = canonicalizeUrn(e.target);
        var matchedOther = null;

        if (relevantUrns.has(sCan)) {
          matchedOther = tCan;
        } else if (relevantUrns.has(tCan)) {
          matchedOther = sCan;
        }

        if (matchedOther) {
          var pOther = parseUrn(matchedOther);
          var oType = (pOther ? pOther.type : '').toLowerCase();
          var isDocOrFile = oType === 'doc' || oType === 'document' || oType === 'file' || oType === 'doc_section' || oType === 'submission' || oType === 'handout';
          if (!isDocOrFile && e.meta && (e.meta.category === 'file' || e.meta.category === 'doc' || e.meta.relation === 'handout_for_lesson' || e.meta.relation === 'printable_handout')) {
            isDocOrFile = true;
          }

          if (isDocOrFile && !seenUrns.has(matchedOther)) {
            seenUrns.add(matchedOther);
            var display = await resolveUrnDisplay(matchedOther);
            var isHandout = (e.relation && e.relation.includes('handout')) || (e.meta && e.meta.relation && e.meta.relation.includes('handout')) || display.title.toLowerCase().includes('handout') || (display.subtitle && display.subtitle.toLowerCase().includes('handout'));
            var isSubm = oType === 'submission' || (e.relation === 'submission') || (e.meta && e.meta.relation === 'submission');
            var badge = isSubm ? '[SUBMISSION]' : (isHandout ? '[HANDOUT]' : display.badge || '[DOC]');

            documents.push({
              urn: matchedOther,
              type: oType === 'file' ? 'file' : 'doc',
              source: 'registry',
              title: display.title,
              subtitle: display.subtitle || (isHandout ? 'Class Handout' : 'Document Editor'),
              badge: badge,
              relativePath: display.relativePath || (pOther ? pOther.id : ''),
              target: display.target || 'docEditorDocs',
              meta: Object.assign({}, display.meta || {}, e.meta || {}, { edgeRelation: e.relation })
            });
          }
        }
      }
    }

    // 3. Scan filesystem for class / student documents & handouts
    try {
      var scannedDocs = await _getOrScanDocEditorFiles();
      for (var j = 0; j < scannedDocs.length; j++) {
        var d = scannedDocs[j];
        var relLower = d.relativePath.toLowerCase();
        var fnLower = d.filename.toLowerCase();
        var isMatch = false;
        var matchReason = '';
        var matchedClass = '';

        // Check student match (student uuid or student name in filename/path)
        if (cleanStId && (relLower.includes(cleanStId) || fnLower.includes(cleanStId))) {
          isMatch = true;
          matchReason = 'student_id';
        } else if (normStudentName && normStudentName.length >= 3 && (relLower.includes(normStudentName) || fnLower.includes(normStudentName.replace(/\s+/g, '_')))) {
          isMatch = true;
          matchReason = 'student_name';
        } else if (stFirstName && stLastName && stFirstName.length >= 2 && stLastName.length >= 2 &&
                   (fnLower.includes(stFirstName) && fnLower.includes(stLastName))) {
          isMatch = true;
          matchReason = 'student_fullname';
        }

        // Check class match against any of targetClassIds
        if (!isMatch && targetClassIds.length > 0) {
          for (var tIdx = 0; tIdx < targetClassIds.length; tIdx++) {
            var cleanCid = String(targetClassIds[tIdx] || '').trim();
            var cleanCidLower = cleanCid.toLowerCase();
            var cleanCidNoPad = _stripZeroPaddingClassToken(cleanCid);
            if (!cleanCid) continue;

            var pathParts = d.relativePath.split('/');
            for (var pIdx = 0; pIdx < pathParts.length - 1; pIdx++) {
              var part = pathParts[pIdx].trim().toLowerCase();
              if (part === cleanCidLower || _stripZeroPaddingClassToken(part) === cleanCidNoPad) {
                isMatch = true;
                matchReason = 'class_folder';
                matchedClass = cleanCid;
                break;
              }
            }

            if (!isMatch) {
              var fnClassTokens = fnLower.split(/[^a-z0-9]+/);
              if (fnClassTokens.includes(cleanCidLower) || (cleanCidNoPad && fnClassTokens.includes(cleanCidNoPad))) {
                isMatch = true;
                matchReason = 'class_filename';
                matchedClass = cleanCid;
                break;
              }
            }
            if (isMatch) break;
          }
        }

        if (isMatch) {
          var docUrn = canonicalizeUrn(makeUrn(d.target === 'user' ? 'file' : 'doc', d.target === 'docEditorDocs' ? ('docEditorDocs/' + d.relativePath) : d.relativePath));
          if (!seenUrns.has(docUrn)) {
            seenUrns.add(docUrn);
            var isHandoutFn = fnLower.includes('handout') || fnLower.includes('worksheet') || fnLower.includes('exercise') || fnLower.includes('fiche') || fnLower.includes('polycopie');
            var isTestFn = fnLower.includes('test') || fnLower.includes('eval') || fnLower.includes('exam') || fnLower.includes('quiz');
            var isSubmFn = matchReason.startsWith('student');

            var docBadge = isSubmFn ? '[SUBMISSION]' : (isHandoutFn ? '[HANDOUT]' : (isTestFn ? '[TEST PAPER]' : (d.extension === 'pdf' ? '[FILE]' : '[DOC]')));
            var subParts = [];
            if (d.target === 'docEditorDocs') subParts.push('Document Editor');
            else if (d.target === 'user') subParts.push('User Files');
            if (matchedClass || targetClassIds[0]) subParts.push(resolveClassName(matchedClass || targetClassIds[0]) || (matchedClass || targetClassIds[0]));
            subParts.push(d.relativePath);

            documents.push({
              urn: docUrn,
              type: d.target === 'user' ? 'file' : 'doc',
              source: 'disk',
              title: d.title,
              subtitle: subParts.join(' • '),
              badge: docBadge,
              relativePath: d.relativePath,
              target: d.target,
              meta: Object.assign({}, d.meta || {}, { matchReason: matchReason, classGroup: matchedClass || targetClassIds[0] || '' })
            });
          }
        }
      }
    } catch (_) {}

    // 4. Extract attached handouts/files from Grade Sheet tests and Lesson plans
    (gradeData && gradeData.tests ? gradeData.tests : []).forEach(function(gt) {
      var rawAtts = [];
      if (gt.meta) {
        if (gt.meta.handout) rawAtts.push(gt.meta.handout);
        if (gt.meta.handoutUrn) rawAtts.push(gt.meta.handoutUrn);
        if (gt.meta.attachedDoc) rawAtts.push(gt.meta.attachedDoc);
        if (Array.isArray(gt.meta.attachments)) rawAtts = rawAtts.concat(gt.meta.attachments);
        if (Array.isArray(gt.meta.attachedFiles)) rawAtts = rawAtts.concat(gt.meta.attachedFiles);
      }
      rawAtts.forEach(function(att) {
        if (!att) return;
        var attUrn = typeof att === 'string' ? (att.startsWith('cmt:') ? canonicalizeUrn(att) : makeUrn('file', att)) : (att.urn || makeUrn('file', att.relativePath || att.filename || att.id));
        attUrn = canonicalizeUrn(attUrn);
        if (!seenUrns.has(attUrn)) {
          seenUrns.add(attUrn);
          var attTitle = typeof att === 'object' ? (att.title || att.name || att.filename) : attUrn.split(':').pop().split('/').pop();
          documents.push({
            urn: attUrn,
            type: 'file',
            source: 'gradesheet',
            title: String(attTitle || 'Attachment').replace(/\.[^.]+$/, '').replace(/_/g, ' '),
            subtitle: 'Test Evaluation Attachment • ' + (gt.title || gt.testName || 'Test'),
            badge: '[HANDOUT]',
            relativePath: typeof att === 'object' ? (att.relativePath || att.filename || '') : att,
            target: 'user',
            meta: typeof att === 'object' ? att : { sourceTest: gt.urn }
          });
        }
      });
    });

    return documents;
  }

  /**
   * Scans and aggregates all live participation tracker records for a student.
   * Loads class session logs from groupParticipation target, applies notes/tombstones,
   * and calculates attendance rate, net score, trend, and session history across all enrolled groups.
   */
  async function _loadStudentParticipationData(studentId, classId, studentName, allClassIds) {
    var emptyRes = {
      classId: classId || '',
      classIds: [],
      totalSessions: 0,
      attendedSessions: 0,
      absentCount: 0,
      attendanceRate: 100,
      picksCount: 0,
      pluses: 0,
      minuses: 0,
      teamPluses: 0,
      teamMinuses: 0,
      badgePositive: 0,
      badgeNegative: 0,
      netScore: 0,
      netRatioPerSession: 0,
      ratio: null,
      trend: 'flat',
      provisionalGrade: null,
      notesCount: 0,
      notes: [],
      sessions: []
    };

    if (!studentId && !studentName) return emptyRes;

    try {
      var scanData = await _getOrScanParticipationFiles();
      var allSessions = (scanData && scanData.allSessions) ? scanData.allSessions : [];
      var deletedIds = (scanData && scanData.deletedIds) ? scanData.deletedIds : new Set();
      var notesPatch = (scanData && scanData.notesPatch) ? scanData.notesPatch : {};
      var rules = (scanData && scanData.rules) ? scanData.rules : {};

      if (!allSessions || allSessions.length === 0) {
        return emptyRes;
      }

      var stInfo = resolveStudentInfo(studentId) || {};
      var targetClassIds = Array.isArray(allClassIds) && allClassIds.length > 0
        ? allClassIds.slice()
        : (Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0
          ? stInfo.classIds.slice()
          : (classId ? [classId] : []));
      if (classId && !targetClassIds.includes(classId)) {
        targetClassIds.unshift(classId);
      }

      var cleanCid = (classId || '').trim();
      var cleanCidLower = cleanCid.toLowerCase();
      var cleanCidNormalized = cleanCid.replace(/[-_ ]/g, '').toLowerCase();
      var normStudentName = (studentName || '').trim().toUpperCase();
      var normStudentId = String(studentId || '').trim().toLowerCase();

      var studentObjInRoster = stInfo;
      var candidateNames = new Set([
        normStudentName,
        String(studentObjInRoster.name || '').trim().toUpperCase(),
        String(studentObjInRoster.customName || '').trim().toUpperCase(),
        String(studentObjInRoster.firstName ? (studentObjInRoster.firstName + ' ' + (studentObjInRoster.lastName || '')) : '').trim().toUpperCase(),
        String(studentId || '').trim().toUpperCase()
      ].filter(Boolean));

      function simplifyStr(str) {
        if (!str) return '';
        try {
          return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase();
        } catch (_) {
          return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        }
      }

      var simplifiedCandidates = new Set();
      candidateNames.forEach(function(cn) {
        var s = simplifyStr(cn);
        if (s) simplifiedCandidates.add(s);
      });

      var totalSessions = 0;
      var attendedSessions = 0;
      var absentCount = 0;
      var picksCount = 0;
      var totalPluses = 0;
      var totalMinuses = 0;
      var totalTeamPluses = 0;
      var totalTeamMinuses = 0;
      var totalBadgePos = 0;
      var totalBadgeNeg = 0;
      var notesList = [];
      var sessionEntries = [];
      var sessionNets = [];

      // Sort sessions chronologically
      var sortedSessions = allSessions.slice().sort(function(a, b) {
        var tA = Date.parse(String(a.id || a.date || '')) || 0;
        var tB = Date.parse(String(b.id || b.date || '')) || 0;
        return tA - tB;
      });

      sortedSessions.forEach(function(session) {
        if (!session || !session.groups) return;
        if (session.id && deletedIds.has(String(session.id))) return;

        var sessGroup = String(session.activeGroup || '').trim();
        var sessGroupNorm = sessGroup.replace(/[-_ ]/g, '').toLowerCase();

        // If a specific class filter was explicitly passed and session group is known, check match
        if (classId && sessGroup && cleanCidNormalized &&
            sessGroupNorm !== cleanCidNormalized &&
            _stripZeroPaddingClassToken(sessGroup) !== _stripZeroPaddingClassToken(cleanCid)) {
          // If class doesn't match, still allow if studentId is an exact UUID
          if (!normStudentId.startsWith('st-') && normStudentId.length < 20) {
            return;
          }
        }

        // Search for student across all tables/groups in session
        var matchedSt = null;
        var groupKeys = Object.keys(session.groups);
        for (var gi = 0; gi < groupKeys.length; gi++) {
          var stArr = session.groups[groupKeys[gi]];
          if (!Array.isArray(stArr)) continue;
          for (var si = 0; si < stArr.length; si++) {
            var st = stArr[si];
            if (!st) continue;
            var stId = String(st.id || st.uuid || '').trim().toLowerCase();
            var stName = String(st.name || '').trim().toUpperCase();
            var stSimple = simplifyStr(stName);

            var isMatch = false;
            if (normStudentId && stId && (stId === normStudentId || stId === normStudentId.replace(/^st-/, ''))) {
              isMatch = true;
            } else if (stName && candidateNames.has(stName)) {
              isMatch = true;
            } else if (stSimple && simplifiedCandidates.has(stSimple)) {
              isMatch = true;
            }

            if (isMatch) {
              matchedSt = st;
              break;
            }
          }
          if (matchedSt) break;
        }

        if (!matchedSt) return;

        totalSessions++;
        var isAbsent = !!matchedSt.isAbsent;
        if (isAbsent) {
          absentCount++;
        } else {
          attendedSessions++;
        }

        if (matchedSt.isPicked) picksCount++;

        var pluses = Number(matchedSt.pluses) || 0;
        var minuses = Number(matchedSt.minuses) || 0;
        var tPluses = Number(matchedSt.teamPluses) || 0;
        var tMinuses = Number(matchedSt.teamMinuses) || 0;

        totalPluses += pluses;
        totalMinuses += minuses;
        totalTeamPluses += tPluses;
        totalTeamMinuses += tMinuses;

        var badges = Array.isArray(matchedSt.badges) ? matchedSt.badges : [];
        var sessPosBadges = 0;
        var sessNegBadges = 0;
        badges.forEach(function(b) {
          if (!b) return;
          var sent = b.sentiment || (b.isPositive ? 'positive' : (b.isNegative ? 'negative' : 'neutral'));
          if (sent === 'positive' || b.positive) { sessPosBadges++; totalBadgePos++; }
          else if (sent === 'negative' || b.negative) { sessNegBadges++; totalBadgeNeg++; }
        });

        // Compute session net
        var sessNet = (pluses + tPluses) - (minuses + tMinuses) + sessPosBadges - sessNegBadges;
        sessNet = parseFloat(sessNet.toFixed(2));
        if (!isAbsent) {
          sessionNets.push(sessNet);
        }

        // Apply notes patch if available
        var stNote = matchedSt.notes || '';
        if (notesPatch[session.id] && notesPatch[session.id][matchedSt.name] !== undefined) {
          stNote = notesPatch[session.id][matchedSt.name];
        }
        if (stNote && typeof stNote === 'string' && stNote.trim()) {
          var cleanNote = stNote.trim();
          if (!notesList.includes(cleanNote)) notesList.push(cleanNote);
        }

        var sessDate = session.id ? session.id.split('T')[0] : (session.date || '');
        sessionEntries.push({
          id: session.id,
          date: sessDate,
          time: session.time || '',
          group: sessGroup || '',
          isAbsent: isAbsent,
          isPicked: !!matchedSt.isPicked,
          pluses: pluses + tPluses,
          minuses: minuses + tMinuses,
          netChange: sessNet,
          badges: badges,
          notes: stNote ? String(stNote).trim() : ''
        });
      });

      var attendanceRate = totalSessions > 0 ? parseFloat(((attendedSessions / totalSessions) * 100).toFixed(1)) : 100;
      var totalGood = totalPluses + totalTeamPluses + totalBadgePos;
      var totalBad = totalMinuses + totalTeamMinuses + totalBadgeNeg;
      var netScore = parseFloat((totalGood - totalBad).toFixed(2));
      var netRatioPerSession = attendedSessions > 0 ? parseFloat((netScore / attendedSessions).toFixed(2)) : 0;
      var ratioVal = totalBad > 0 ? parseFloat((totalGood / totalBad).toFixed(2)) : (totalGood > 0 ? 999 : null);

      // Trend calculation
      var trend = 'flat';
      if (sessionNets.length >= 2) {
        var mid = Math.ceil(sessionNets.length / 2);
        var firstHalf = sessionNets.slice(0, mid);
        var secondHalf = sessionNets.slice(sessionNets.length - mid);
        var avg1 = firstHalf.reduce(function(a, b) { return a + b; }, 0) / firstHalf.length;
        var avg2 = secondHalf.reduce(function(a, b) { return a + b; }, 0) / secondHalf.length;
        var diff = avg2 - avg1;
        if (diff > 0.1) trend = 'up';
        else if (diff < -0.1) trend = 'down';
      }

      // Provisional Grade calculation (if rules exist for class)
      var provGrade = null;
      var classRule = rules[cleanCid] || rules[classId] || (targetClassIds[0] ? rules[targetClassIds[0]] : null);
      if (classRule && typeof classRule === 'object') {
        var baseGrade = Number(classRule.baseGrade != null ? classRule.baseGrade : 4);
        var targetNet = Number(classRule.targetNet || classRule.targetPoints || 10);
        var maxGrade = Number(classRule.maxGrade || 6);
        var minGrade = Number(classRule.minGrade || 1);
        if (targetNet > 0) {
          var earnedRatio = Math.max(-1, Math.min(1.5, netScore / targetNet));
          var calcGrade = baseGrade + earnedRatio * (maxGrade - baseGrade);
          provGrade = parseFloat(Math.max(minGrade, Math.min(maxGrade, calcGrade)).toFixed(2));
        }
      }

      return {
        classId: cleanCid || targetClassIds[0] || classId,
        classIds: targetClassIds,
        totalSessions: totalSessions,
        attendedSessions: attendedSessions,
        absentCount: absentCount,
        attendanceRate: attendanceRate,
        picksCount: picksCount,
        pluses: totalPluses + totalTeamPluses,
        minuses: totalMinuses + totalTeamMinuses,
        teamPluses: totalTeamPluses,
        teamMinuses: totalTeamMinuses,
        badgePositive: totalBadgePos,
        badgeNegative: totalBadgeNeg,
        netScore: netScore,
        netRatioPerSession: netRatioPerSession,
        ratio: ratioVal,
        trend: trend,
        provisionalGrade: provGrade,
        notesCount: notesList.length,
        notes: notesList,
        sessions: sessionEntries
      };
    } catch (err) {
      console.warn('_loadStudentParticipationData error:', err);
      return emptyRes;
    }
  }

  function _parseParticipationContent(content) {
    if (!content) return [];
    var text = String(content).trim();
    try {
      var sandbox = { window: {} };
      var fn = new Function('window', text);
      fn(sandbox.window);
      var res = sandbox.window.CMS_DB_EXPORT || sandbox.window.DB_EXPORT || sandbox.CMS_DB_EXPORT || sandbox.DB_EXPORT;
      if (Array.isArray(res)) return res;
    } catch (_) {}

    try {
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}

    var match = text.match(/(?:const|let|var)?\s*(?:window\.)?(?:CMS_)?DB_EXPORT\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (match) {
      try { return JSON.parse(match[1]); } catch (_) {}
    }
    return [];
  }

  async function _getOrScanParticipationFiles() {
    if (_participationScanCache && (Date.now() - _participationScanCache.ts < 20000)) {
      return _participationScanCache.data;
    }
    if (_participationScanPromise) return _participationScanPromise;

    _participationScanPromise = (async function() {
      var result = {
        allSessions: [],
        deletedIds: new Set(),
        notesPatch: {},
        rules: {}
      };

      if (typeof window !== 'undefined') {
        if (Array.isArray(window.CMS_DB_EXPORT) && window.CMS_DB_EXPORT.length > 0) {
          result.allSessions = window.CMS_DB_EXPORT.slice();
        } else if (Array.isArray(window.DB_EXPORT) && window.DB_EXPORT.length > 0) {
          result.allSessions = window.DB_EXPORT.slice();
        }
        if (window.CMS_NOTES_PATCH) result.notesPatch = window.CMS_NOTES_PATCH;
        if (window.CMS_PARTICIPATION_RULES) result.rules = window.CMS_PARTICIPATION_RULES;
      }

      var isElectron = typeof window !== 'undefined' && window.electronApi && window.electronApi.isElectron;
      var Desktop = (typeof window !== 'undefined' && window.Desktop) ? window.Desktop : null;

      if (isElectron && Desktop && typeof Desktop.listByPath === 'function') {
        // 1. Read deleted tombstones
        try {
          var tombRes = await Desktop.readText('groupParticipation', 'pt-deleted.js');
          if (tombRes && tombRes.ok && tombRes.content) {
            var tm = tombRes.content.match(/window\.CMS_DELETED_SESSIONS\s*=\s*(\[[\s\S]*?\]);?/);
            if (tm) {
              var arr = JSON.parse(tm[1]);
              if (Array.isArray(arr)) arr.forEach(function(id) { result.deletedIds.add(String(id)); });
            }
          }
        } catch (_) {}

        // 2. Read notes patch
        try {
          var npRes = await Desktop.readText('groupParticipation', 'pt-notes.js');
          if (npRes && npRes.ok && npRes.content) {
            var npm = npRes.content.match(/window\.CMS_NOTES_PATCH\s*=\s*(\{[\s\S]*\});?\s*$/);
            if (npm) result.notesPatch = JSON.parse(npm[1]) || {};
          }
        } catch (_) {}

        // 3. Read rules
        try {
          var rpRes = await Desktop.readText('groupParticipation', 'pt-rules.js');
          if (rpRes && rpRes.ok && rpRes.content) {
            var rpm = rpRes.content.match(/window\.CMS_PARTICIPATION_RULES\s*=\s*(\{[\s\S]*\});?\s*$/);
            if (rpm) result.rules = JSON.parse(rpm[1]) || {};
          }
        } catch (_) {}

        // 4. Scan disk files if in-memory DB is empty
        if (!result.allSessions.length) {
          var sessionFiles = [];
          try {
            var listRes = await Desktop.listByPath('groupParticipation', '', { recursive: true, extensions: ['.js', '.json'] });
            if (listRes && Array.isArray(listRes.files)) {
              sessionFiles = listRes.files.filter(function(f) {
                var p = String(f.relativePath || f.filename || '').replace(/\\/g, '/');
                var fn = f.filename || p.split('/').pop() || '';
                return !p.startsWith('archived/') && fn !== 'pt-deleted.js' && fn !== 'pt-notes.js' && fn !== 'pt-rules.js' && fn !== 'pt-presets.js';
              }).map(function(f) {
                return { target: 'groupParticipation', relativePath: f.relativePath };
              });
            }
          } catch (_) {}

          // Fallback: try user target
          if (!sessionFiles.length) {
            try {
              var userListRes = await Desktop.listByPath('user', 'group-participation', { recursive: true, extensions: ['.js', '.json'] });
              if (userListRes && Array.isArray(userListRes.files) && userListRes.files.length) {
                sessionFiles = userListRes.files.filter(function(f) {
                  var p = String(f.relativePath || f.filename || '').replace(/\\/g, '/');
                  var fn = f.filename || p.split('/').pop() || '';
                  return !p.startsWith('archived/') && fn !== 'pt-deleted.js' && fn !== 'pt-notes.js' && fn !== 'pt-rules.js' && fn !== 'pt-presets.js';
                }).map(function(f) {
                  return { target: 'user', relativePath: 'group-participation/' + f.relativePath.replace(/\\/g, '/') };
                });
              }
            } catch (_) {}
          }

          if (sessionFiles.length > 0) {
            await Promise.all(sessionFiles.map(async function(fInfo) {
              try {
                var res = await Desktop.readByPath(fInfo.target, fInfo.relativePath);
                if (res && res.ok && res.content) {
                  var extracted = _parseParticipationContent(res.content);
                  extracted.forEach(function(s) {
                    if (s && s.id && !result.deletedIds.has(String(s.id))) {
                      result.allSessions.push(s);
                    }
                  });
                }
              } catch (_) {}
            }));
          }

          // Legacy flat file candidates
          if (!result.allSessions.length) {
            var candidates = ['cms-db.js', 'cms-db.json', 'cms-db.txt'];
            for (var ci = 0; ci < candidates.length; ci++) {
              try {
                var cRes = await Desktop.readText('groupParticipation', candidates[ci]);
                if (cRes && cRes.ok && cRes.content) {
                  var cExtracted = _parseParticipationContent(cRes.content);
                  cExtracted.forEach(function(s) {
                    if (s && s.id && !result.deletedIds.has(String(s.id))) {
                      result.allSessions.push(s);
                    }
                  });
                  if (result.allSessions.length > 0) break;
                }
              } catch (_) {}
            }
          }
        }
      }

      _participationScanCache = { ts: Date.now(), data: result };
      _participationScanPromise = null;
      return result;
    })();

    return _participationScanPromise;
  }

  /**
   * 360° Academic Dossier Aggregator for a Student.
   * Traverses direct and indirect links to assemble evaluations, assessed competences,
   * delivered lesson plans, linked documents, and board constellations, seamlessly
   * integrating all recorded tests, boards, participation metrics, and computed weighted averages across all enrolled groups.
   */
  async function getStudentAcademicDossier(studentId, opts) {
    if (!studentId) return null;
    opts = opts || {};
    await _ensureRosterLoaded();
    var studentUrn = makeUrn('student', studentId);
    var stInfo = resolveStudentInfo(studentId) || {};

    var explicitClassId = opts.classId || null;
    var allClassIds = Array.isArray(stInfo.classIds) && stInfo.classIds.length > 0
      ? stInfo.classIds.slice()
      : (stInfo.classId ? [stInfo.classId] : []);
    if (explicitClassId && !allClassIds.includes(explicitClassId)) {
      allClassIds.unshift(explicitClassId);
    }

    var primaryClassId = explicitClassId || stInfo.classId || allClassIds[0] || '';
    var primaryClassName = opts.className || resolveClassName(primaryClassId) || stInfo.className || '';

    var allClasses = allClassIds.map(function(cid) {
      return {
        id: cid,
        name: resolveClassName(cid) || cid,
        level: resolveClassLevel(cid) || ''
      };
    });

    var classNames = (stInfo.classNames && stInfo.classNames.length > 0)
      ? stInfo.classNames.slice()
      : allClasses.map(function(c) { return c.name; });

    var combinedClassName = classNames.length > 0 ? classNames.join(', ') : primaryClassName;
    var primaryLevel = opts.level || resolveClassLevel(primaryClassId) || stInfo.level || (allClasses[0] ? allClasses[0].level : '');
    var studentName = opts.studentName || opts.title || opts.name || stInfo.name || resolveStudentName(studentId) || studentId;

    var studentObj = {
      id: studentId,
      urn: studentUrn,
      name: studentName,
      classId: primaryClassId,
      className: combinedClassName,
      primaryClassId: primaryClassId,
      primaryClassName: primaryClassName,
      classIds: allClassIds,
      classNames: classNames,
      classes: allClasses,
      enrollments: stInfo.enrollments || [],
      level: primaryLevel
    };

    var results = await Promise.all([
      resolveContext({
        urn: studentUrn,
        classId: explicitClassId || (allClassIds.length === 1 ? primaryClassId : null),
        classIds: allClassIds
      }),
      _loadStudentGradeSheetData(studentId, explicitClassId, studentName, allClassIds),
      _loadStudentBoardData(studentId, explicitClassId, primaryLevel, allClassIds),
      _loadStudentLessonData(studentId, explicitClassId, allClassIds),
      _loadStudentParticipationData(studentId, explicitClassId, studentName, allClassIds)
    ]);

    var context = results[0] || { direct: [], inherited: [] };
    var gradeData = results[1] || { tests: [], sem1Average: null, sem2Average: null, yearAverage: null, gradedCount: 0, totalTests: 0 };
    var boardData = results[2] || [];
    var lessonData = results[3] || [];
    var participationData = results[4] || {
      classId: primaryClassId,
      classIds: allClassIds,
      totalSessions: 0,
      attendedSessions: 0,
      absentCount: 0,
      attendanceRate: 100,
      picksCount: 0,
      pluses: 0,
      minuses: 0,
      teamPluses: 0,
      teamMinuses: 0,
      badgePositive: 0,
      badgeNegative: 0,
      netScore: 0,
      netRatioPerSession: 0,
      ratio: null,
      trend: 'flat',
      provisionalGrade: null,
      notesCount: 0,
      notes: [],
      sessions: []
    };

    var documentData = await _loadStudentDocumentData(studentId, explicitClassId, primaryLevel, studentName, gradeData, lessonData, allClassIds);

    var dossier = {
      student: studentObj,
      gradesSummary: gradeData,
      participationSummary: participationData,
      evaluations: [].concat(gradeData.tests || []),
      competences: [],
      lessons: [].concat(lessonData || []),
      documents: [].concat(documentData || []),
      boards: [].concat(boardData || []),
      other: []
    };

    var allEdges = [].concat(context.direct, context.inherited);
    var seenUrns = new Set();
    (gradeData.tests || []).forEach(function(gt) {
      seenUrns.add(canonicalizeUrn(gt.urn));
    });
    (boardData || []).forEach(function(b) {
      seenUrns.add(canonicalizeUrn(b.urn));
    });
    (lessonData || []).forEach(function(l) {
      seenUrns.add(canonicalizeUrn(l.urn));
    });
    (documentData || []).forEach(function(d) {
      seenUrns.add(canonicalizeUrn(d.urn));
    });

    for (var i = 0; i < allEdges.length; i++) {
      var edge = allEdges[i];
      var oUrn = canonicalizeUrn(edge.otherUrn);
      if (seenUrns.has(oUrn)) continue;
      seenUrns.add(oUrn);

      var p = parseUrn(oUrn);
      var type = (p ? p.type : '').toLowerCase();
      var display = await resolveUrnDisplay(oUrn);
      var item = {
        urn: oUrn,
        type: type,
        title: display.title,
        subtitle: display.subtitle,
        badge: display.badge,
        meta: edge.meta || {},
        isInherited: edge.isInherited || false
      };

      if (type === 'eval' || type === 'grade' || type === 'gradesheet' || type === 'grade_cell' || type === 'test') {
        dossier.evaluations.push(item);
      } else if (type === 'competence' || type === 'criteria' || type === 'scale') {
        dossier.competences.push(item);
      } else if (type === 'lesson' || type === 'planner' || type === 'phase') {
        dossier.lessons.push(item);
      } else if (type === 'doc' || type === 'document' || type === 'file' || type === 'submission' || type === 'handout') {
        dossier.documents.push(item);
      } else if (type.startsWith('board')) {
        dossier.boards.push(item);
      } else {
        dossier.other.push(item);
      }
    }

    // Ensure gradesSummary has valid averages whenever evaluations contain marks
    if (dossier.gradesSummary.yearAverage == null && dossier.gradesSummary.sem1Average == null && dossier.gradesSummary.sem2Average == null) {
      var scoredEvals = (dossier.evaluations || []).filter(function(e) {
        var sc = e.score != null ? e.score : (e.meta && e.meta.score != null ? e.meta.score : (e.points != null ? e.points : null));
        return sc != null && !isNaN(sc);
      });
      if (scoredEvals.length > 0) {
        var totalW = 0, sumW = 0;
        scoredEvals.forEach(function(e) {
          var sc = Number(e.score != null ? e.score : (e.meta && e.meta.score != null ? e.meta.score : e.points));
          var max = Number(e.maxScore || (e.meta && e.meta.maxScore) || 6);
          var w = Number(e.coefficient || (e.meta && e.meta.coefficient) || 1);
          if (isNaN(w) || w <= 0) w = 1;
          var norm = max === 6 ? sc : (sc / max) * 6;
          sumW += norm * w;
          totalW += w;
        });
        if (totalW > 0) {
          var compAvg = Number((sumW / totalW).toFixed(2));
          dossier.gradesSummary.yearAverage = compAvg;
          if (!dossier.gradesSummary.gradedCount) {
            dossier.gradesSummary.gradedCount = scoredEvals.length;
          }
          if (!dossier.gradesSummary.totalTests) {
            dossier.gradesSummary.totalTests = dossier.evaluations.length;
          }
        }
      }
    }

    return dossier;
  }

  async function syncAutoRegressiveLinks() {
    var reg = await loadRegistry();
    var changed = false;

    // Purge stale inferred edges that leaked concrete files to grade levels
    if (Array.isArray(reg.edges)) {
      var origLen = reg.edges.length;
      reg.edges = reg.edges.filter(function(e) {
        if (!e.meta || !e.meta.inferred) return true;
        var pS = parseUrn(e.source);
        var pT = parseUrn(e.target);
        var sT = (pS ? pS.type : '').toLowerCase();
        var tT = (pT ? pT.type : '').toLowerCase();
        var isArtifact = function(t) {
          return t.startsWith('board') || t === 'doc' || t === 'document' || t === 'file' ||
                 t === 'lesson' || t === 'test' || t === 'eval' || t === 'gradesheet' || t === 'planner' || t === 'slot';
        };
        if ((sT === 'level' && isArtifact(tT)) || (tT === 'level' && isArtifact(sT))) {
          return false;
        }
        return true;
      });
      if (reg.edges.length !== origLen) changed = true;
    }

    if (typeof window !== 'undefined') {
      var byClass = window.PLANNER_ENTRIES_BY_CLASS || {};
      var cfg = window.PLANNER_CONFIG;

      Object.keys(byClass).forEach(function(cid) {
        var entries = Array.isArray(byClass[cid]) ? byClass[cid] : [];
        entries.forEach(function(ent) {
          if (!ent || !ent.id) return;
          var slotUrn = canonicalizeUrn(makeUrn('planner', ent.id));
          var classUrn = canonicalizeUrn(makeUrn('class', cid));
          var e = _createInferredEdge(reg, slotUrn, classUrn, 'auto_sync_' + ent.id, 'upward_class');
          if (e) changed = true;
        });
      });

      var allKnownClassIds = new Set();
      if (cfg && cfg.classes) {
        Object.keys(cfg.classes).forEach(function(cid) { allKnownClassIds.add(cid); });
      }
      var rosterCache = _rosterNameCache || _buildRosterCache();
      if (rosterCache && rosterCache.classes) {
        Object.keys(rosterCache.classes).forEach(function(cid) { allKnownClassIds.add(cid); });
      }

      allKnownClassIds.forEach(function(cid) {
        var classUrn = canonicalizeUrn(makeUrn('class', cid));
        var lvl = resolveClassLevel(cid);
        if (lvl) {
          var el = _createInferredEdge(reg, classUrn, makeUrn('level', lvl), 'auto_sync_lvl_' + cid, 'upward_level');
          if (el) changed = true;
        }
      });

      if (window.boardHistoryMetaCache) {
        Object.keys(window.boardHistoryMetaCache).forEach(function(k) {
          var h = window.boardHistoryMetaCache[k];
          if (!h) return;
          var bUrn = canonicalizeUrn(makeUrn('board', k.replace(/\\/g, '/')));
          if (h.plannerEntryId) {
            var slotUrn = canonicalizeUrn(makeUrn('planner', h.plannerEntryId));
            var eSlot = _createInferredEdge(reg, bUrn, slotUrn, 'auto_sync_board_' + h.plannerEntryId, 'upward_slot');
            if (eSlot) changed = true;
          }
          if (h.classGroup) {
            var classUrn = canonicalizeUrn(makeUrn('class', h.classGroup));
            var eCls = _createInferredEdge(reg, bUrn, classUrn, 'auto_sync_board_cls_' + h.classGroup, 'upward_class');
            if (eCls) changed = true;
          }
        });
      }
    }

    if (changed) {
      await saveRegistry(reg);
    }
    return true;
  }

  // ── Export Service ──────────────────────────────────────────────────────────
  return {
    parseUrn: parseUrn,
    makeUrn: makeUrn,
    createUrn: makeUrn,
    on: on,
    canonicalizeUrn: canonicalizeUrn,
    normalizeTag: normalizeTag,
    loadRegistry: loadRegistry,
    saveRegistry: saveRegistry,
    registerEntity: registerEntity,
    registerItem: function(urnOrItem, maybeMeta) {
      if (typeof urnOrItem === 'string') return registerEntity(urnOrItem, maybeMeta || {});
      if (urnOrItem && typeof urnOrItem === 'object') {
        var u = urnOrItem.urn || makeUrn(urnOrItem.type, urnOrItem.id);
        return registerEntity(u, urnOrItem);
      }
      return Promise.resolve();
    },
    getEntityMeta: getEntityMeta,
    addLink: addLink,
    removeLink: removeLink,
    removeLinksFor: removeLinksFor,
    getLinksFor: getLinksFor,
    getLinksForSync: getLinksForSync,
    getLinksForUrn: function(urn) { return getLinksForSync(urn) || []; },
    isLinked: isLinked,
    addTag: addTag,
    removeTag: removeTag,
    getTagsFor: getTagsFor,
    getTagsForSync: getTagsForSync,
    getTagsForUrn: function(urn) { return getTagsForSync(urn) || []; },
    getAllTags: getAllTags,
    findByTag: findByTag,
    resolveContext: resolveContext,
    openUrn: openUrn,
    navigateToUrn: openUrn,
    resolveStudentName: resolveStudentName,
    resolveStudentInfo: resolveStudentInfo,
    resolveClassName: resolveClassName,
    resolveClassLevel: resolveClassLevel,
    resolveClassYear: resolveClassYear,
    resolveEntityAncestors: resolveEntityAncestors,
    resolveUrnDisplay: resolveUrnDisplay,
    promoteInferredLink: promoteInferredLink,
    getStudentAcademicDossier: getStudentAcademicDossier,
    ensureRosterLoaded: _ensureRosterLoaded,
    getItemsForTag: getItemsForTag,
    getTagSummary: getTagSummary,
    storeGradeAttachment: storeGradeAttachment,
    syncAutoRegressiveLinks: syncAutoRegressiveLinks,
    updatePath: updatePath
  };
});
