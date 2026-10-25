/**
 * badge-sets-service.js — Shared service for managing custom badge databases & per-class sets
 *
 * Responsibilities:
 *  - Provides standard default badge definitions (minus built-in markers) and the full built-in list
 *  - Normalization of badge definition records (icon, label, tone, meaning, coefficient, scope, flags)
 *  - Loading badge sets from Desktop target 'customBadges' (user/custom-data/badges/)
 *  - Resolution of active badge set per class with fallback to defaultSetId or 'default'
 *  - Memory cache for loaded badge sets
 */

(function (global) {
  'use strict';

  var DEFAULT_ID = 'default';

  var BUILTIN_BADGES = [
    { icon: '+', label: 'Plus', tone: 'positive', meaning: 'Participation mark', coefficient: 1, inlineInRoster: true, strikeOnAward: true, scope: 'individual', hidden: false, isBuiltin: true },
    { icon: '-', label: 'Minus', tone: 'negative', meaning: 'Participation mark', coefficient: 1, inlineInRoster: true, strikeOnAward: true, scope: 'individual', hidden: false, isBuiltin: true }
  ];

  var DEFAULT_BADGE_DEFINITIONS = [
    { icon: '+', label: 'Plus', tone: 'positive', meaning: 'Participation mark', coefficient: 1, inlineInRoster: true, strikeOnAward: true, scope: 'individual', hidden: false, isBuiltin: true },
    { icon: '-', label: 'Minus', tone: 'negative', meaning: 'Participation mark', coefficient: 1, inlineInRoster: true, strikeOnAward: true, scope: 'individual', hidden: false, isBuiltin: true },
    { icon: '💎', label: 'Diamond', tone: 'positive', meaning: 'Outstanding contribution', strikeOnAward: true, scope: 'individual', hidden: false },
    { icon: '👍', label: 'Good Job', tone: 'positive', meaning: 'Solid work and focus', scope: 'individual', hidden: false },
    { icon: '👏', label: 'Well Tried', tone: 'positive', meaning: 'Strong effort and perseverance', scope: 'individual', hidden: false },
    { icon: 'RV', label: 'RV', tone: 'negative', meaning: 'Renvoi', scope: 'individual', hidden: false },
    { icon: 'DNF', label: 'DNF', tone: 'negative', meaning: 'Devoir non fait', scope: 'individual', hidden: false },
    { icon: 'OM', label: 'OM', tone: 'negative', meaning: 'Oubli matériel', scope: 'individual', hidden: false },
    { icon: 'AT', label: 'AT', tone: 'negative', meaning: 'Arrivée tardive', scope: 'individual', hidden: false },
    { icon: '1️⃣', label: 'Level 1', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
    { icon: '2️⃣', label: 'Level 2', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
    { icon: '3️⃣', label: 'Level 3', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
    { icon: '4️⃣', label: 'Level 4', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
    { icon: '5️⃣', label: 'Level 5', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
    { icon: '6️⃣', label: 'Level 6', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false }
  ];

  function normalizeScope(scope) {
    var value = String(scope || 'individual').trim().toLowerCase();
    return ['individual', 'team', 'both'].indexOf(value) !== -1 ? value : 'individual';
  }

  function normalizeDefs(definitions) {
    var source = Array.isArray(definitions) ? definitions : [];
    var seen = new Set();
    return source.map(function (entry) {
      var icon = String(entry && (entry.icon != null ? entry.icon : (entry.emoji || entry.symbol || ''))).trim();
      var label = String(entry && (entry.label != null ? entry.label : (entry.name || entry.title || ''))).trim();
      return {
        icon: icon,
        label: label,
        tone: String(entry && entry.tone || 'positive').trim().toLowerCase() === 'negative' ? 'negative' : 'positive',
        meaning: String(entry && (entry.meaning != null ? entry.meaning : (entry.description || ''))).trim(),
        coefficient: Number.isFinite(Number(entry && entry.coefficient)) ? Number(entry.coefficient) : 1,
        inlineInRoster: !!(entry && entry.inlineInRoster === true),
        strikeOnAward: !!(entry && entry.strikeOnAward === true),
        scope: normalizeScope(entry && entry.scope),
        hidden: !!(entry && entry.hidden === true),
        isBuiltin: !!(entry && entry.isBuiltin === true)
      };
    }).filter(function (entry) {
      var key = (entry.icon + '|' + entry.label).toLowerCase();
      if (!entry.icon || !entry.label || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function injectBuiltins(defs, plusMinusCoeff) {
    var coeff = (typeof plusMinusCoeff === 'number' && Number.isFinite(plusMinusCoeff)) ? plusMinusCoeff : 1;
    var list = Array.isArray(defs) ? defs.slice() : [];
    for (var i = BUILTIN_BADGES.length - 1; i >= 0; i--) {
      var b = BUILTIN_BADGES[i];
      var exists = list.some(function (d) { return d.isBuiltin && d.icon === b.icon; });
      if (!exists) {
        list.unshift(Object.assign({}, b, { coefficient: coeff }));
      }
    }
    return list;
  }

  function parseFileContent(content) {
    if (!content || typeof content !== 'string') return [];
    var trimmed = content.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        var arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr;
      } catch (_) {}
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        var obj = JSON.parse(trimmed);
        if (Array.isArray(obj.badges)) return obj.badges;
        if (Array.isArray(obj.customBadgeBank)) return obj.customBadgeBank;
      } catch (_) {}
    }
    try {
      var varMatch = String(content).match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
      var detectedVar = varMatch ? varMatch[1] : null;
      var code = content + '\n;try{\n' +
        'if (typeof customBadgeBank !== "undefined" && Array.isArray(customBadgeBank)) return customBadgeBank;\n' +
        'if (typeof badges !== "undefined" && Array.isArray(badges)) return badges;\n' +
        (detectedVar ? 'if (typeof ' + detectedVar + ' !== "undefined" && Array.isArray(' + detectedVar + ')) return ' + detectedVar + ';\n' : '') +
        'return null;\n}catch(e){return null;}';
      var fn = new Function(code);
      var res = fn();
      if (Array.isArray(res)) return res;
    } catch (_) {}
    return [];
  }

  var setCache = new Map(); // id -> defs[]

  var BadgeSets = {
    DEFAULT_ID: DEFAULT_ID,
    BUILTIN_BADGES: BUILTIN_BADGES,
    DEFAULT_BADGE_DEFINITIONS: DEFAULT_BADGE_DEFINITIONS,

    normalizeScope: normalizeScope,
    normalizeDefs: normalizeDefs,
    injectBuiltins: injectBuiltins,
    parseFileContent: parseFileContent,

    getDefaultDefs: function (excludeBuiltins) {
      if (excludeBuiltins) {
        return DEFAULT_BADGE_DEFINITIONS.filter(function (d) { return !d.isBuiltin; }).map(function (d) { return Object.assign({}, d); });
      }
      return DEFAULT_BADGE_DEFINITIONS.map(function (d) { return Object.assign({}, d); });
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
          var res = await window.Desktop.listFiles('customBadges', { extensions: ['.js', '.json'] });
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
          console.warn('[BadgeSets] Failed to list customBadges files:', e);
        }
      }
      setCache.forEach(function (_, cachedId) {
        if (cachedId && cachedId !== DEFAULT_ID && !sets.some(function (s) { return s.id === cachedId; })) {
          sets.push({ id: cachedId, filename: cachedId + '.js', name: cachedId, isDefault: false });
        }
      });
      return sets;
    },

    loadSet: async function (setId, fallbackConfigDefs, plusMinusCoeff) {
      if (!setId || setId === DEFAULT_ID) {
        var base = (Array.isArray(fallbackConfigDefs) && fallbackConfigDefs.length)
          ? fallbackConfigDefs
          : DEFAULT_BADGE_DEFINITIONS;
        var norm = normalizeDefs(base);
        var res = injectBuiltins(norm, plusMinusCoeff);
        setCache.set(DEFAULT_ID, res);
        return res;
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
            var readRes = await window.Desktop.readText('customBadges', filenames[i]);
            var content = (typeof readRes === 'string') ? readRes : (readRes && readRes.content ? readRes.content : null);
            if (content) {
              var raw = parseFileContent(content);
              var normalized = normalizeDefs(raw);
              var withBuiltins = injectBuiltins(normalized, plusMinusCoeff);
              setCache.set(cleanId, withBuiltins);
              if (cleanId !== setId) setCache.set(setId, withBuiltins);
              return withBuiltins;
            }
          } catch (_) {}
        }
      }

      // If file not found or non-Electron fallback
      return null;
    },

    resolveForClass: function (classId, badgeSetSettings) {
      var s = badgeSetSettings || {};
      var classSets = s.classSets || {};
      if (classId && classSets[classId]) {
        return classSets[classId];
      }
      return s.defaultSetId || DEFAULT_ID;
    },

    findBadgeDef: function (icon, label, activeDefs) {
      var normIcon = String(icon || '').trim();
      var normLabel = String(label || '').trim();
      if (!normIcon && !normLabel) return null;

      // 1. Check active definitions
      if (Array.isArray(activeDefs)) {
        var match = activeDefs.find(function (d) {
          if (normIcon && normLabel) return d.icon === normIcon && d.label === normLabel;
          if (normIcon) return d.icon === normIcon;
          return d.label === normLabel;
        });
        if (match) return match;
      }

      // 2. Check all other cached sets (union fallback for history preservation)
      for (var entry of setCache.entries()) {
        var defs = entry[1];
        if (!Array.isArray(defs) || defs === activeDefs) continue;
        var m = defs.find(function (d) {
          if (normIcon && normLabel) return d.icon === normIcon && d.label === normLabel;
          if (normIcon) return d.icon === normIcon;
          return d.label === normLabel;
        });
        if (m) return m;
      }

      // 3. Fallback to default builtins
      return DEFAULT_BADGE_DEFINITIONS.find(function (d) {
        if (normIcon && normLabel) return d.icon === normIcon && d.label === normLabel;
        if (normIcon) return d.icon === normIcon;
        return d.label === normLabel;
      }) || null;
    }
  };

  global.BadgeSets = BadgeSets;
})(typeof window !== 'undefined' ? window : globalThis);
