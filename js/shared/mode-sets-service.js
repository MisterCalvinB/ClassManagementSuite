/**
 * mode-sets-service.js — Shared service for managing custom working mode databases & per-class mode sets
 *
 * Responsibilities:
 *  - Provides standard default mode definitions (Quiet, Conversation, Group)
 *  - Normalization of mode definition records (flat fields + nested text, picture, sound objects)
 *  - Loading mode sets from Desktop target 'customModes' (user/custom-data/modes/)
 *  - Resolution of active mode set per class with fallback to defaultSetId or 'default'
 *  - Memory cache for loaded mode sets
 */

(function (global) {
  'use strict';

  var DEFAULT_ID = 'default';

  var DEFAULT_CLASS_MODES = [
    {
      id: 'quiet',
      name: 'Quiet',
      icon: '🤫',
      shortcutKey: '1',
      title: 'Quiet Work',
      subtitle: '',
      textColor: '#222222',
      textSize: 'large',
      pictureType: 'emoji',
      pictureSrc: '🤫',
      pictureAnim: 'shush',
      pictureFit: 'fit',
      soundType: 'none',
      soundFile: '',
      soundVol: 20,
      soundChime: false,
      text: { title: 'Quiet Work', subtitle: '', size: 'large', color: '#222222' },
      picture: { type: 'emoji', src: '🤫', animation: 'shush', fit: 'fit' },
      sound: { type: 'none', file: '', volume: 20, chime: false },
      isBuiltIn: true
    },
    {
      id: 'conversation',
      name: 'Talk',
      icon: '💬',
      shortcutKey: '2',
      title: 'Conversation',
      subtitle: '',
      textColor: '#222222',
      textSize: 'large',
      pictureType: 'speech_bubbles',
      pictureSrc: '',
      pictureAnim: 'bubbles',
      pictureFit: 'fit',
      soundType: 'none',
      soundFile: '',
      soundVol: 20,
      soundChime: false,
      text: { title: 'Conversation', subtitle: '', size: 'large', color: '#222222' },
      picture: { type: 'speech_bubbles', src: '', animation: 'bubbles', fit: 'fit' },
      sound: { type: 'none', file: '', volume: 20, chime: false },
      isBuiltIn: true
    },
    {
      id: 'group',
      name: 'Group',
      icon: '👥',
      shortcutKey: '3',
      title: 'Group Work',
      subtitle: 'Work together with your team',
      textColor: '#222222',
      textSize: 'large',
      pictureType: 'group_icons',
      pictureSrc: '',
      pictureAnim: 'bounce',
      pictureFit: 'fit',
      soundType: 'none',
      soundFile: '',
      soundVol: 20,
      soundChime: false,
      text: { title: 'Group Work', subtitle: 'Work together with your team', size: 'large', color: '#222222' },
      picture: { type: 'group_icons', src: '', animation: 'bounce', fit: 'fit' },
      sound: { type: 'none', file: '', volume: 20, chime: false },
      isBuiltIn: true
    }
  ];

  function normalizeMode(raw, index) {
    if (!raw || typeof raw !== 'object') return null;

    var name = String(raw.name || raw.label || raw.title || 'Custom Mode').trim();
    var id = String(raw.id || ('mode_' + Date.now() + '_' + (index != null ? index : Math.random().toString(36).substr(2, 5)))).trim();
    var icon = String(raw.icon || raw.emoji || '🎭').trim();
    var shortcutKey = String(raw.shortcutKey || (index != null && index < 9 ? String(index + 1) : '')).trim();

    // Nested or flat text (prefer nested object when present so stale flat fields cannot overwrite it)
    var textObj = (raw.text && typeof raw.text === 'object') ? raw.text : {};
    var title = String(textObj.title != null ? textObj.title : (raw.title != null ? raw.title : name)).trim();
    var subtitle = String(textObj.subtitle != null ? textObj.subtitle : (raw.subtitle != null ? raw.subtitle : '')).trim();
    var textColor = String(textObj.color || raw.textColor || '#222222').trim();
    var textSize = String(textObj.size || raw.textSize || 'large').trim().toLowerCase();
    if (['normal', 'medium', 'large', 'xlarge'].indexOf(textSize) === -1) textSize = 'large';

    // Nested or flat picture (prefer nested object when present)
    var picObj = (raw.picture && typeof raw.picture === 'object') ? raw.picture : {};
    var pictureType = String(picObj.type || raw.pictureType || 'emoji').trim().toLowerCase();
    var validPicTypes = ['emoji', 'speech_bubbles', 'group_icons', 'custom_url', 'custom_file'];
    if (validPicTypes.indexOf(pictureType) === -1) pictureType = 'emoji';

    var pictureSrc = String(picObj.src != null ? picObj.src : (raw.pictureSrc != null ? raw.pictureSrc : icon)).trim();
    var pictureAnim = String(picObj.animation || raw.pictureAnim || 'none').trim().toLowerCase();
    var validAnims = [
      'none', 'pulse', 'float', 'bounce', 'rotate', 'shush', 'bubbles',
      'gradient-shift', 'shimmer-dots', 'aurora-waves', 'floating-shapes',
      'breathing-halo', 'ripple-rings', 'starfield-twinkle', 'lava-blobs',
      'confetti-drift', 'horizon-glow'
    ];
    if (validAnims.indexOf(pictureAnim) === -1) pictureAnim = 'none';

    var pictureFit = String(picObj.fit || raw.pictureFit || 'fit').trim().toLowerCase();
    if (['fit', 'stretch', 'clip', 'cover', 'contain'].indexOf(pictureFit) === -1) pictureFit = 'fit';

    // Nested or flat sound (prefer nested object when present)
    var soundObj = (raw.sound && typeof raw.sound === 'object') ? raw.sound : {};
    var soundType = String(soundObj.type || raw.soundType || 'none').trim().toLowerCase();
    var validSoundTypes = ['none', 'white', 'pink', 'brown', 'file', 'whitenoise', 'binaural', 'custom_audio'];
    if (validSoundTypes.indexOf(soundType) === -1) soundType = 'none';

    var soundFile = String(soundObj.file != null ? soundObj.file : (raw.soundFile != null ? raw.soundFile : '')).trim();
    var rawVol = soundObj.volume != null ? soundObj.volume : raw.soundVol;
    var soundVol = Number.isFinite(Number(rawVol)) ? Math.max(0, Math.min(100, Math.round(Number(rawVol)))) : 20;
    var soundChime = !!(soundObj.chime != null ? soundObj.chime : raw.soundChime);

    var isBuiltIn = !!(raw.isBuiltIn === true);

    return {
      id: id,
      name: name,
      icon: icon,
      shortcutKey: shortcutKey,
      // Flat properties for manage-database schema, tables & forms
      title: title,
      subtitle: subtitle,
      textColor: textColor,
      textSize: textSize,
      pictureType: pictureType,
      pictureSrc: pictureSrc,
      pictureAnim: pictureAnim,
      pictureFit: pictureFit,
      soundType: soundType,
      soundFile: soundFile,
      soundVol: soundVol,
      soundChime: soundChime,
      // Standard nested objects for 100% full compatibility with class-management.html runtime
      text: { title: title, subtitle: subtitle, color: textColor, size: textSize },
      picture: { type: pictureType, src: pictureSrc, animation: pictureAnim, fit: pictureFit },
      sound: { type: soundType, file: soundFile, volume: soundVol, chime: soundChime },
      isBuiltIn: isBuiltIn
    };
  }

  function normalizeDefs(definitions) {
    var source = Array.isArray(definitions) ? definitions : [];
    var seen = new Set();
    var result = [];

    source.forEach(function (raw, idx) {
      var mode = normalizeMode(raw, idx);
      if (!mode || !mode.name) return;
      var dedupeKey = mode.name.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      result.push(mode);
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

    // 2. JSON Object with modes/classModes/customModeBank property
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        var obj = JSON.parse(trimmed);
        if (Array.isArray(obj.modes)) return obj.modes;
        if (Array.isArray(obj.classModes)) return obj.classModes;
        if (Array.isArray(obj.customModeBank)) return obj.customModeBank;
      } catch (_) {}
    }

    // 3. Executable JS assignment (e.g. const customModeBank = [...];)
    try {
      var varMatch = String(content).match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
      var detectedVar = varMatch ? varMatch[1] : null;
      var code = content + '\n;try{\n' +
        'if (typeof customModeBank !== "undefined" && Array.isArray(customModeBank)) return customModeBank;\n' +
        'if (typeof customModes !== "undefined" && Array.isArray(customModes)) return customModes;\n' +
        'if (typeof classModes !== "undefined" && Array.isArray(classModes)) return classModes;\n' +
        'if (typeof modes !== "undefined" && Array.isArray(modes)) return modes;\n' +
        (detectedVar ? 'if (typeof ' + detectedVar + ' !== "undefined" && Array.isArray(' + detectedVar + ')) return ' + detectedVar + ';\n' : '') +
        'return null;\n}catch(e){return null;}';
      var fn = new Function(code);
      var res = fn();
      if (Array.isArray(res)) return res;
    } catch (_) {}

    return [];
  }

  var setCache = new Map(); // setId -> modes[]

  var ModeSets = {
    DEFAULT_ID: DEFAULT_ID,
    DEFAULT_CLASS_MODES: DEFAULT_CLASS_MODES,

    normalizeMode: normalizeMode,
    normalizeDefs: normalizeDefs,
    parseFileContent: parseFileContent,

    getDefaultDefs: function () {
      return DEFAULT_CLASS_MODES.map(function (m) {
        return normalizeMode(m);
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
          var res = await window.Desktop.listFiles('customModes', { extensions: ['.js', '.json'] });
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
          console.warn('[ModeSets] Failed to list customModes files:', e);
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
        var base = (Array.isArray(fallbackConfigDefs) && fallbackConfigDefs.length)
          ? fallbackConfigDefs
          : DEFAULT_CLASS_MODES;
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
            var readRes = await window.Desktop.readText('customModes', filenames[i]);
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

    resolveForClass: function (classId, modeSetSettings) {
      var s = modeSetSettings || {};
      var classSets = s.classSets || {};
      if (classId && classSets[classId]) {
        return classSets[classId];
      }
      return s.defaultSetId || DEFAULT_ID;
    }
  };

  global.ModeSets = ModeSets;
})(typeof window !== 'undefined' ? window : globalThis);
