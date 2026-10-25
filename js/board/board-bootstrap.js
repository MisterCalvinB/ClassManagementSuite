/**
 * Class Management Tools — Board Bootstrap & Data Loader
 * Manages asynchronous user data bootstrapping (class groups, students, planner entries,
 * config files), word database lazy-loading, and CMS timer presentation mirror synchronization.
 *
 * Exposes methods on window.Board.bootstrap while maintaining backward-compatible
 * globals on window (__boardUserBootstrapPromise, ensureWordDbLoaded, boardInitCmsTimerMirror).
 */
(function (global) {
  'use strict';

  var Board = global.Board = global.Board || {};

  // =========================================================================
  // 1. CMS TIMER MIRROR SUBSYSTEM (Live sync from Class Management tool)
  // =========================================================================
  var boardCmsTimerChannel = null;
  var boardCmsTimerUiState = {
    timerActive: false,
    collapsed: false,
    hidden: false,
    x: 10,
    y: 10,
    fontPx: 28
  };

  function boardApplyCmsTimerUiFromRemote() { }
  function boardApplyCmsTimerData() { }
  function boardRenderCmsTimerUi() { }
  function boardBroadcastCmsTimerUi() { }

  function boardInitCmsTimerMirror() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      boardCmsTimerChannel = new BroadcastChannel('cms-presentation');
      global.boardCmsTimerChannel = boardCmsTimerChannel;
    } catch (_) {
      return;
    }

    boardCmsTimerChannel.addEventListener('message', function (event) {
      var data = event && event.data;
      if (!data) return;
      if (data.type === 'timer-tick' || data.type === 'state') {
        if (typeof global.conSyncCmsTimerDataToNodes === 'function') {
          global.conSyncCmsTimerDataToNodes(data);
        }
      }
    });

    global.addEventListener('beforeunload', function () {
      try { if (boardCmsTimerChannel) boardCmsTimerChannel.close(); } catch (_) { }
      try { if (global._conTimerIntervalId) clearInterval(global._conTimerIntervalId); } catch (_) { }
    }, { once: true });
  }

  // =========================================================================
  // 2. USER SCRIPT & DATA LOADER (class-groups, config, planner files)
  // =========================================================================
  function injectClassicScript(source, name) {
    var s = document.createElement('script');
    s.text = String(source || '') + '\n//# sourceURL=' + name;
    document.head.appendChild(s);
    if (s.parentNode) s.parentNode.removeChild(s);
  }

  function loadScriptBySrc(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function loadUserScript(relPath) {
    if (global.Desktop && global.Desktop.isElectron() && typeof global.Desktop.readText === 'function') {
      var result = await global.Desktop.readText('user', relPath);
      if (!result || !result.ok) {
        throw new Error((result && result.error) || ('Missing user/' + relPath));
      }
      injectClassicScript(result.content || '', 'user/' + relPath);
      return;
    }
    await loadScriptBySrc('user/' + relPath);
  }

  var bootstrapPromise = (async function () {
    try {
      await loadUserScript('class-groups.js');
      try {
        if (typeof CLASS_GROUPS_META !== 'undefined') global.CLASS_GROUPS_META = CLASS_GROUPS_META;
      } catch (_) {}
      try {
        if (typeof CLASS_GROUPS !== 'undefined') global.CLASS_GROUPS = CLASS_GROUPS;
      } catch (_) {}
      try {
        if (typeof CLASS_GROUPS_DATA !== 'undefined') global.CLASS_GROUPS_DATA = CLASS_GROUPS_DATA;
      } catch (_) {}
      if (global.Desktop && typeof global.Desktop.readText === 'function') {
        try {
          var _cgr = await global.Desktop.readText('user', 'class-groups.js');
          if (_cgr && _cgr.ok && _cgr.content) {
            try {
              var _cgFn = new Function('window', _cgr.content + '\nif (typeof CLASS_GROUPS !== "undefined") window.CLASS_GROUPS = CLASS_GROUPS;\nif (typeof CLASS_GROUPS_META !== "undefined") window.CLASS_GROUPS_META = CLASS_GROUPS_META;\nif (typeof CLASS_GROUPS_DATA !== "undefined") window.CLASS_GROUPS_DATA = CLASS_GROUPS_DATA;');
              _cgFn(global);
            } catch (_pe) {}
          }
        } catch (_e) {}
      }
    } catch (e) {
      console.warn('Failed to load user/class-groups.js:', e);
    }

    try { await loadUserScript('config.js'); }
    catch (e) { console.warn('Failed to load user/config.js:', e); }

    try { await loadUserScript('students.js'); }
    catch (e) { /* students.js may not exist yet */ }

    try { await loadUserScript('board-config.js'); }
    catch (e) { console.warn('Failed to load user/board-config.js:', e); }

    // Load planner config + entries for timeslot picker
    global.PLANNER_ENTRIES_BY_CLASS = global.PLANNER_ENTRIES_BY_CLASS || {};
    try {
      if (global.Desktop && global.Desktop.isElectron()) {
        try { await loadUserScript('planner-config.js'); } catch (_pe) { }
        var _plr = await global.Desktop.listByPath('user', 'planner', { recursive: false, extensions: ['.js'] });
        if (_plr && _plr.ok && Array.isArray(_plr.files)) {
          for (var _pi = 0; _pi < _plr.files.length; _pi++) {
            try {
              var _pc = await global.Desktop.readByPath('user', _plr.files[_pi].relativePath);
              if (_pc && _pc.ok) injectClassicScript(_pc.content || '', 'user/' + _plr.files[_pi].relativePath);
            } catch (_pe) { }
          }
        }
      }
    } catch (_pe) { }

    return true;
  })();

  global.__boardUserBootstrapPromise = bootstrapPromise;

  // =========================================================================
  // 3. WORD DATABASE LAZY LOADER
  // =========================================================================
  var _wordDbLoadPromise = null;

  async function ensureWordDbLoaded() {
    if (_wordDbLoadPromise) return _wordDbLoadPromise;

    _wordDbLoadPromise = (async function () {
      try {
        var source = '';

        if (global.Desktop && global.Desktop.isElectron() && typeof global.Desktop.readText === 'function') {
          // Prefer the current writable custom-data location, but allow legacy fallback.
          var candidates = [
            ['customWordbanks', 'wordDb.js'],
            ['customData', 'wordbanks/wordDb.js'],
            ['data', 'wordDb.js']
          ];
          var lastErr = 'File not found';
          for (var i = 0; i < candidates.length; i++) {
            var base = candidates[i][0];
            var rel = candidates[i][1];
            var r = await global.Desktop.readText(base, rel);
            if (r && r.ok) {
              source = String(r.content || '');
              break;
            }
            lastErr = (r && r.error) || lastErr;
          }
          if (!source) throw new Error(lastErr + ' while loading wordDb.js');
        } else {
          var webCandidates = [
            'user/custom-data/wordbanks/wordDb.js',
            'data/wordDb.js'
          ];
          var lastHttp = 'not attempted';
          for (var j = 0; j < webCandidates.length; j++) {
            var url = webCandidates[j];
            var res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
              source = await res.text();
              break;
            }
            lastHttp = 'HTTP ' + res.status + ' for ' + url;
          }
          if (!source) throw new Error(lastHttp);
        }

        var loaded = (new Function(source + '\n; return (typeof vocabBank !== "undefined" ? vocabBank : []);'))();
        if (Array.isArray(loaded)) {
          global.vocabBank = loaded;
        } else {
          console.warn('wordDb.js did not expose an array vocabBank; using empty fallback.');
          global.vocabBank = [];
        }
      } catch (err) {
        console.error('Failed to lazy-load wordDb.js:', err);
        global.vocabBank = [];
      }

      return global.vocabBank;
    })();

    return _wordDbLoadPromise;
  }

  // =========================================================================
  // 4. MODULE EXPORTS & BACKWARD COMPATIBILITY
  // =========================================================================
  Board.bootstrap = {
    ensureWordDbLoaded: ensureWordDbLoaded,
    loadUserScript: loadUserScript,
    initCmsTimerMirror: boardInitCmsTimerMirror,
    whenReady: function (callback) {
      if (typeof callback !== 'function') return Promise.resolve();
      return bootstrapPromise.catch(function () {}).then(function () {
        if (document.readyState === 'loading') {
          return new Promise(function (resolve) {
            document.addEventListener('DOMContentLoaded', function () {
              resolve(callback());
            }, { once: true });
          });
        }
        return callback();
      });
    }
  };

  // Shared string and timestamp formatting helpers
  function boardEscapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeSearchHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function conMakeTimestampTitle() {
    var d = new Date();
    return d.getFullYear()
      + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0')
      + ' ' + String(d.getHours()).padStart(2, '0')
      + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  global.boardEscapeHtml = window.boardEscapeHtml = boardEscapeHtml;
  global.escapeHtml = window.escapeHtml = window.escapeHtml || boardEscapeHtml;
  global.escapeSearchHtml = window.escapeSearchHtml = escapeSearchHtml;
  global.conEscapeSearchHtml = window.conEscapeSearchHtml = escapeSearchHtml;
  global.conMakeTimestampTitle = window.conMakeTimestampTitle = conMakeTimestampTitle;

  // Vocabulary Themes Indexing & Lookup Helpers
  function _buildThemeIndex() {
    var idx = {};
    if (typeof vocabThemes === 'undefined' || !Array.isArray(vocabThemes)) return idx;
    for (var i = 0; i < vocabThemes.length; i++) {
      var entry = vocabThemes[i];
      if (!entry || typeof entry !== 'object') continue;
      var keys = Object.keys(entry);
      for (var k = 0; k < keys.length; k++) {
        var theme = keys[k];
        var words = entry[theme];
        if (!Array.isArray(words)) continue;
        for (var w = 0; w < words.length; w++) {
          var word = words[w];
          if (!word) continue;
          var key = String(word).trim().toLowerCase();
          if (!idx[key]) idx[key] = [];
          if (!idx[key].includes(theme)) idx[key].push(theme);
        }
      }
    }
    return idx;
  }

  var _themeIndex = null;
  function getThemeIndex() {
    if (!_themeIndex) _themeIndex = _buildThemeIndex();
    return _themeIndex;
  }
  function invalidateThemeIndex() { _themeIndex = null; }

  function getItemThemes(item) {
    if (typeof window !== 'undefined' && typeof window.getItemThemes === 'function' && window.getItemThemes !== getItemThemes) {
      return window.getItemThemes(item);
    }
    if (!item || !item.word) return [];
    if (typeof vocabThemes !== 'undefined' && Array.isArray(vocabThemes) && vocabThemes.length) {
      return getThemeIndex()[String(item.word).trim().toLowerCase()] || [];
    }
    var t = item.theme;
    if (!t) return [];
    return Array.isArray(t) ? t : String(t).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  global._buildThemeIndex = window._buildThemeIndex = _buildThemeIndex;
  global.getThemeIndex = window.getThemeIndex = getThemeIndex;
  global.invalidateThemeIndex = window.invalidateThemeIndex = invalidateThemeIndex;
  global.getItemThemes = window.getItemThemes = getItemThemes;

  // Legacy Global Aliases
  global.boardCmsTimerChannel = boardCmsTimerChannel;
  global.boardCmsTimerUiState = boardCmsTimerUiState;
  global.boardApplyCmsTimerUiFromRemote = boardApplyCmsTimerUiFromRemote;
  global.boardApplyCmsTimerData = boardApplyCmsTimerData;
  global.boardRenderCmsTimerUi = boardRenderCmsTimerUi;
  global.boardBroadcastCmsTimerUi = boardBroadcastCmsTimerUi;
  global.boardInitCmsTimerMirror = boardInitCmsTimerMirror;
  global.ensureWordDbLoaded = ensureWordDbLoaded;

})(typeof window !== 'undefined' ? window : this);
