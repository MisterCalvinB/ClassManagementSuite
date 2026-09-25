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
    if (type === 'wordbank' || type === 'wordbanks') {
      return makeUrn('wordbank', id, p.anchor);
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

      case 'word':
      case 'wordbank': {
        var cleanFileW = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: { type: 'wordbanks', file: cleanFileW } });
        }
        window.open('manage-database.html?type=wordbanks&file=' + encodeURIComponent(cleanFileW), '_blank');
        return true;
      }

      case 'gapfill':
      case 'gapfillbank': {
        var cleanFileG = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: { type: 'gapfillbanks', file: cleanFileG } });
        }
        window.open('manage-database.html?type=gapfillbanks&file=' + encodeURIComponent(cleanFileG), '_blank');
        return true;
      }

      case 'grammar':
      case 'grammarbank': {
        var cleanFileGr = p.id.indexOf('#') !== -1 ? p.id.split('#')[0] : p.id;
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: { type: 'grammarbanks', file: cleanFileGr } });
        }
        window.open('manage-database.html?type=grammarbanks&file=' + encodeURIComponent(cleanFileGr), '_blank');
        return true;
      }

      case 'phase':
      case 'activity': {
        if (desktop && typeof desktop.openTool === 'function') {
          return desktop.openTool('manage-database.html', { query: { type: 'phases' } });
        }
        window.open('manage-database.html?type=phases', '_blank');
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
    storeGradeAttachment: storeGradeAttachment,
    updatePath: updatePath
  };
});
