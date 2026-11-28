/**
 * role-sets-service.js — Shared service for managing custom role databases & per-class role sets
 *
 * Responsibilities:
 *  - Provides standard default role definitions (empty by default, falls back to config.js)
 *  - Normalization of role definition records ({ role, explanation })
 *  - Loading role sets from Desktop target 'customRoles' (user/custom-data/roles/)
 *  - Resolution of active role set per class with fallback to defaultSetId or 'default'
 *  - Memory cache for loaded role sets
 */

(function (global) {
  'use strict';

  var DEFAULT_ID = 'default';

  var DEFAULT_ROLE_DEFINITIONS = [];

  function normalizeRole(raw) {
    if (typeof raw === 'string') {
      var trimmedStr = raw.trim();
      if (!trimmedStr) return null;
      return { role: trimmedStr, explanation: '' };
    }
    if (!raw || typeof raw !== 'object') return null;

    var role = String(
      raw.role != null ? raw.role : (raw.name != null ? raw.name : (raw.title != null ? raw.title : ''))
    ).trim();
    if (!role) return null;

    var explanation = String(
      raw.explanation != null
        ? raw.explanation
        : (raw.description != null ? raw.description : (raw.meaning != null ? raw.meaning : ''))
    ).trim();

    return {
      role: role,
      explanation: explanation
    };
  }

  function normalizeDefs(definitions) {
    var source = Array.isArray(definitions) ? definitions : [];
    var seen = new Set();
    var result = [];

    source.forEach(function (raw) {
      var item = normalizeRole(raw);
      if (!item || !item.role) return;
      var key = item.role.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });

    return result;
  }

  function parseFileContent(content) {
    if (!content || typeof content !== 'string') return [];
    var trimmed = content.trim();

    // 1. JSON Array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        var arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr;
      } catch (_) {}
    }

    // 2. JSON Object with roles/roleDefinitions/customRoleBank property
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        var obj = JSON.parse(trimmed);
        if (Array.isArray(obj.roles)) return obj.roles;
        if (Array.isArray(obj.roleDefinitions)) return obj.roleDefinitions;
        if (Array.isArray(obj.customRoleBank)) return obj.customRoleBank;
      } catch (_) {}
    }

    // 3. Executable JS assignment (e.g. const customRoleBank = [...];)
    try {
      var varMatch = String(content).match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
      var detectedVar = varMatch ? varMatch[1] : null;
      var code = content + '\n;try{\n' +
        'if (typeof customRoleBank !== "undefined" && Array.isArray(customRoleBank)) return customRoleBank;\n' +
        'if (typeof customRoles !== "undefined" && Array.isArray(customRoles)) return customRoles;\n' +
        'if (typeof ROLE_DEFINITIONS !== "undefined" && Array.isArray(ROLE_DEFINITIONS)) return ROLE_DEFINITIONS;\n' +
        'if (typeof roleDefinitions !== "undefined" && Array.isArray(roleDefinitions)) return roleDefinitions;\n' +
        'if (typeof roles !== "undefined" && Array.isArray(roles)) return roles;\n' +
        (detectedVar ? 'if (typeof ' + detectedVar + ' !== "undefined" && Array.isArray(' + detectedVar + ')) return ' + detectedVar + ';\n' : '') +
        'return null;\n}catch(e){return null;}';
      var fn = new Function(code);
      var res = fn();
      if (Array.isArray(res)) return res;
    } catch (_) {}

    return [];
  }

  var setCache = new Map(); // setId -> roles[]

  var RoleSets = {
    DEFAULT_ID: DEFAULT_ID,
    DEFAULT_ROLE_DEFINITIONS: DEFAULT_ROLE_DEFINITIONS,

    normalizeRole: normalizeRole,
    normalizeDefs: normalizeDefs,
    parseFileContent: parseFileContent,

    getDefaultDefs: function () {
      return DEFAULT_ROLE_DEFINITIONS.map(function (r) {
        return { role: r.role, explanation: r.explanation || '' };
      });
    },

    clearCache: function (setId) {
      if (setId) setCache.delete(setId);
      else setCache.clear();
    },

    setCachedDefs: function (setId, defs) {
      if (!setId) return;
      setCache.set(setId, normalizeDefs(defs));
    },

    getCachedDefs: function (setId) {
      return setCache.get(setId) || null;
    },

    getAllCachedDefs: function () {
      return new Map(setCache);
    },

    listSets: async function () {
      var sets = [{ id: DEFAULT_ID, name: 'Default (config.js)', isDefault: true }];
      var isElec = typeof window !== 'undefined' && window.Desktop && (typeof window.Desktop.isElectron === 'function' ? window.Desktop.isElectron() : !!window.Desktop.isElectron);

      if (isElec) {
        try {
          var res = await window.Desktop.listFiles('customRoles', { extensions: ['.js', '.json'] });
          var files = Array.isArray(res) ? res : (res && Array.isArray(res.files) ? res.files : []);
          files.forEach(function (f) {
            var fullName = typeof f === 'string' ? f : (f.filename || f.name || '');
            if (!fullName) return;
            var id = fullName.replace(/\.(js|json)$/i, '');
            if (id && !sets.some(function (s) { return s.id === id; })) {
              sets.push({ id: id, filename: fullName, name: id, isDefault: false });
            }
          });
        } catch (e) {
          console.warn('[RoleSets] Failed to list customRoles files:', e);
        }
      }

      setCache.forEach(function (_, cachedId) {
        if (cachedId && cachedId !== DEFAULT_ID && !sets.some(function (s) { return s.id === cachedId; })) {
          sets.push({ id: cachedId, filename: cachedId + '.js', name: cachedId, isDefault: false });
        }
      });

      return sets;
    },

    loadSet: async function (setId, fallbackConfigDefs) {
      if (!setId || setId === DEFAULT_ID) {
        var base = Array.isArray(fallbackConfigDefs) ? fallbackConfigDefs : DEFAULT_ROLE_DEFINITIONS;
        var norm = normalizeDefs(base);
        setCache.set(DEFAULT_ID, norm);
        return norm;
      }

      var cleanId = String(setId || '').replace(/\.(js|json)$/i, '');
      if (setCache.has(cleanId)) {
        return setCache.get(cleanId);
      }
      if (setCache.has(setId)) {
        return setCache.get(setId);
      }

      var isElec = typeof window !== 'undefined' && window.Desktop && (typeof window.Desktop.isElectron === 'function' ? window.Desktop.isElectron() : !!window.Desktop.isElectron);
      if (isElec) {
        var filenames = [cleanId + '.js', cleanId + '.json'];
        for (var i = 0; i < filenames.length; i++) {
          try {
            var readRes = await window.Desktop.readText('customRoles', filenames[i]);
            var content = (typeof readRes === 'string') ? readRes : (readRes && readRes.content ? readRes.content : null);
            if (content) {
              var raw = parseFileContent(content);
              var normalized = normalizeDefs(raw);
              setCache.set(cleanId, normalized);
              if (cleanId !== setId) setCache.set(setId, normalized);
              return normalized;
            }
          } catch (_) {}
        }
      }

      return null;
    },

    resolveForClass: function (classId, roleSetSettings) {
      var s = roleSetSettings || {};
      var classSets = s.classSets || {};
      if (classId && classSets[classId]) {
        return classSets[classId];
      }
      return s.defaultSetId || DEFAULT_ID;
    },

    findRoleDef: function (roleName, activeDefs) {
      var normName = String(roleName || '').trim().toLowerCase();
      if (!normName) return null;

      if (Array.isArray(activeDefs)) {
        var match = activeDefs.find(function (d) {
          return String(d.role || '').trim().toLowerCase() === normName;
        });
        if (match) return match;
      }

      for (var entry of setCache.entries()) {
        var defs = entry[1];
        if (!Array.isArray(defs) || defs === activeDefs) continue;
        var m = defs.find(function (d) {
          return String(d.role || '').trim().toLowerCase() === normName;
        });
        if (m) return m;
      }

      return null;
    }
  };

  global.RoleSets = RoleSets;
})(typeof window !== 'undefined' ? window : globalThis);
