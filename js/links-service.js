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

    // 2. Save to Electron filesystem
    var savedOk = true;
    if (typeof window !== 'undefined' && window.Desktop && typeof Desktop.saveJson === 'function') {
      try {
        var res = await Desktop.saveJson(FILE_TARGET, FILE_NAME, reg);
        savedOk = !!(res && res.ok);
      } catch (e) {
        console.error('LinksService: Error saving links-registry.json:', e);
        savedOk = false;
      }
    }

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

    return savedOk;
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
        var clsId = (s.enrollments && s.enrollments[0] && s.enrollments[0].groupUuid) || s.adminClass || '';
        var clsName = (s.enrollments && s.enrollments[0] && s.enrollments[0].groupName) || s.adminClass || '';
        students[sid] = {
          id: sid,
          name: sname || sid,
          classId: clsId,
          className: clsName,
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
      students[sid] = {
        id: sid,
        name: sname,
        classId: classId || (students[sid] && students[sid].classId) || '',
        className: className || classId || (students[sid] && students[sid].className) || '',
        number: (typeof s === 'object' && s && s.number) ? s.number : (students[sid] ? students[sid].number : null)
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
      if (window.CLASS_GROUPS_META && typeof window.CLASS_GROUPS_META === 'object') {
        Object.keys(window.CLASS_GROUPS_META).forEach(function(k) {
          if (k.startsWith('_')) return;
          var m = window.CLASS_GROUPS_META[k];
          addClass(k, (m && m.name) || k);
          if (m && Array.isArray(m.students)) {
            m.students.forEach(function(st) { addStudent(st, k, (m && m.name) || k); });
          }
        });
      }
      if (window.CLASS_GROUPS && typeof window.CLASS_GROUPS === 'object') {
        Object.keys(window.CLASS_GROUPS).forEach(function(k) {
          if (k.startsWith('_')) return;
          var g = window.CLASS_GROUPS[k];
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
              '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA' +
              ' : { classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null),' +
              '   classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null) };'
            );
            var parsed = fn();
            if (parsed) {
              if (parsed.classGroupsMeta && !window.CLASS_GROUPS_META) window.CLASS_GROUPS_META = parsed.classGroupsMeta;
              if (parsed.classGroups && !window.CLASS_GROUPS) window.CLASS_GROUPS = parsed.classGroups;
              if (!window.CLASS_GROUPS_DATA) window.CLASS_GROUPS_DATA = parsed;
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
        title = 'Planner Slot: ' + p.id;
        subtitle = 'Timetable Slot';
        break;
      }
      case 'class': {
        badge = '[CLASS]';
        var resolvedCName = resolveClassName(p.id) || (meta && meta.title && !isRawTitle ? meta.title : null) || p.id;
        title = resolvedCName;
        subtitle = 'Class Group';
        break;
      }
      case 'student': {
        badge = '[STUDENT]';
        var stObj = resolveStudentInfo(p.id);
        var stName = (stObj && stObj.name) || resolveStudentName(p.id) || (meta && meta.title && !isRawTitle ? meta.title : null) || p.id;
        title = stName;
        subtitle = stObj && stObj.className ? ('Student • ' + stObj.className) : 'Student Roster';
        break;
      }
      case 'gradesheet':
      case 'eval':
      case 'evaluation': {
        badge = '[GRADE]';
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
      // Update metadata / relation if changed
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

    await saveRegistry(reg);

    if (_channel) {
      try {
        _channel.postMessage({ action: 'link-added', source: cSrc, target: cTgt, edgeId: edge.id });
      } catch (_) {}
    }

    return edge;
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

  // ── 6. Context Inheritance Resolver ─────────────────────────────────────────
  /**
   * Resolves direct links + parent class links + tag links for smart preselection.
   * @param {Object} entityRef - { type, id, classId, tags, ... }
   */
  async function resolveContext(entityRef) {
    if (!entityRef) return { direct: [], inherited: [], tags: [], criteria: [], scales: [], competences: [] };
    var entityUrn = entityRef.urn || (entityRef.type && entityRef.id ? makeUrn(entityRef.type, entityRef.id, entityRef.anchor) : null);

    var directLinks = entityUrn ? await getLinksFor(entityUrn) : [];
    var directTags = entityUrn ? await getTagsFor(entityUrn) : [];

    var inheritedLinks = [];
    var classId = entityRef.classId;

    if (classId) {
      var classUrn = makeUrn('class', classId);
      if (classUrn !== entityUrn) {
        var cLinks = await getLinksFor(classUrn);
        cLinks.forEach(function(cl) {
          inheritedLinks.push(Object.assign({}, cl, { inheritedFrom: classUrn, inheritanceReason: 'class' }));
        });
      }
    }

    // Merge and categorize links
    var all = directLinks.concat(inheritedLinks);
    var criteriaPresets = [];
    var gradingScales = [];
    var competences = [];
    var files = [];

    all.forEach(function(item) {
      var parsed = parseUrn(item.otherUrn);
      if (!parsed) return;
      if (parsed.type === 'criteria' || (item.meta && item.meta.category === 'criteria')) {
        criteriaPresets.push(item);
      } else if (parsed.type === 'scale' || (item.meta && item.meta.category === 'scale')) {
        gradingScales.push(item);
      } else if (parsed.type === 'competence' || (item.meta && item.meta.category === 'competence')) {
        competences.push(item);
      } else if (parsed.type === 'file' || parsed.type === 'doc') {
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
    resolveUrnDisplay: resolveUrnDisplay,
    ensureRosterLoaded: _ensureRosterLoaded,
    getItemsForTag: getItemsForTag,
    getTagSummary: getTagSummary,
    storeGradeAttachment: storeGradeAttachment,
    updatePath: updatePath
  };
});
