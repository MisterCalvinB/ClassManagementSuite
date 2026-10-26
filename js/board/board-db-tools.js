/**
 * Class Management Tools — Board Database & Vocabulary Tools
 * Word DB management, custom words, theme merging, timeslot planner picker, timer system.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var AW_STORAGE_KEY = global.AW_STORAGE_KEY = global.AW_STORAGE_KEY || 'custom_words';
  var AW_QUOTES_KEY = global.AW_QUOTES_KEY = global.AW_QUOTES_KEY || 'custom_quotes';
  var AW_GAP_KEY = global.AW_GAP_KEY = global.AW_GAP_KEY || 'custom_gaps';
  var AW_ERROR_KEY = global.AW_ERROR_KEY = global.AW_ERROR_KEY || 'custom_errors';
  var MDB_DELETED_KEY = global.MDB_DELETED_KEY = global.MDB_DELETED_KEY || 'deleted_words';
  var BOARD_SAVED_SESSIONS_KEY = global.BOARD_SAVED_SESSIONS_KEY || 'board_saved_sessions_v1';
  // Active session file and folder names are bound globally in board-state.js

    // Ensure edge context menu global functions exist early to avoid ReferenceError
    var conEdgeCtxApplyLive = window.conEdgeCtxApplyLive = window.conEdgeCtxApplyLive || function () {};
      var conEdgeCtxSetAutoColor = window.conEdgeCtxSetAutoColor = window.conEdgeCtxSetAutoColor || function () {};
    var conEdgeCtxSetStroke = window.conEdgeCtxSetStroke = window.conEdgeCtxSetStroke || function () {};
    var conEdgeCtxSetRouting = window.conEdgeCtxSetRouting = window.conEdgeCtxSetRouting || function () {};
    var conEdgeCtxSetDir = window.conEdgeCtxSetDir = window.conEdgeCtxSetDir || function () {};
    var conEdgeCtxSetPreset = window.conEdgeCtxSetPreset = window.conEdgeCtxSetPreset || function () {};
    var conEdgeCtxClose = window.conEdgeCtxClose = window.conEdgeCtxClose || function () {};
    var conEdgeCtxDelete = window.conEdgeCtxDelete = window.conEdgeCtxDelete || function () {};
    var conEdgeCtxSave = window.conEdgeCtxSave = window.conEdgeCtxSave || function () {};
    var conEdgeCtxOpen = window.conEdgeCtxOpen = window.conEdgeCtxOpen || function () {};
    var _conSyncDrawOverlaySize = window._conSyncDrawOverlaySize = window._conSyncDrawOverlaySize || function () {};
    var boardBuildPersistedSessionData = function (...args) {
      if (typeof window !== 'undefined' && typeof window.boardBuildPersistedSessionData === 'function') {
        return window.boardBuildPersistedSessionData(...args);
      }
      return args[1] || {};
    };
    var boardPersistLocalSession = function (...args) {
      if (typeof window !== 'undefined' && typeof window.boardPersistLocalSession === 'function') {
        return window.boardPersistLocalSession(...args);
      }
    };
    var boardSetAutosaveFingerprint = function (...args) {
      if (typeof window !== 'undefined' && typeof window.boardSetAutosaveFingerprint === 'function') {
        return window.boardSetAutosaveFingerprint(...args);
      }
    };

    let activeSection = 'main-menu';
    let currentGameWord = null; // The vocab word object currently active in any game
    let _wordDbLoadPromise = null;

    // Ensure `vocabBank` exists immediately so early UI code can run safely
    // while the large database file is still loading in the background.
    if (!Array.isArray(window.vocabBank)) window.vocabBank = [];

    async function ensureWordDbLoaded() {
      if (_wordDbLoadPromise) return _wordDbLoadPromise;

      _wordDbLoadPromise = (async () => {
        try {
          let source = '';

          if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
            // Prefer the current writable custom-data location, but allow legacy fallback.
            const candidates = [
              ['customWordbanks', 'wordDb.js'],
              ['customData', 'wordbanks/wordDb.js'],
              ['data', 'wordDb.js']
            ];
            let lastErr = 'File not found';
            for (const [base, rel] of candidates) {
              const r = await Desktop.readText(base, rel);
              if (r && r.ok) {
                source = String(r.content || '');
                break;
              }
              lastErr = (r && r.error) || lastErr;
            }
            if (!source) throw new Error(lastErr + ' while loading wordDb.js');
          } else {
            const candidates = [
              'user/custom-data/wordbanks/wordDb.js',
              'data/wordDb.js'
            ];
            let lastHttp = 'not attempted';
            for (const url of candidates) {
              const res = await fetch(url, { cache: 'no-store' });
              if (res.ok) {
                source = await res.text();
                break;
              }
              lastHttp = 'HTTP ' + res.status + ' for ' + url;
            }
            if (!source) throw new Error(lastHttp);
          }

          const loaded = (new Function(source + '\n; return (typeof vocabBank !== "undefined" ? vocabBank : []);'))();
          if (Array.isArray(loaded)) {
            window.vocabBank = loaded;
          } else {
            console.warn('wordDb.js did not expose an array vocabBank; using empty fallback.');
            window.vocabBank = [];
          }
        } catch (err) {
          console.error('Failed to lazy-load wordDb.js:', err);
          window.vocabBank = [];
        }

        return window.vocabBank;
      })();

      return _wordDbLoadPromise;
    }

    // Board mode does not load these banks; keep empty fallbacks so legacy utility
    // code paths do not throw if they are referenced.
    if (!Array.isArray(window.quoteBank)) window.quoteBank = [];
    if (!Array.isArray(window.gapFillBank)) window.gapFillBank = [];
    if (!Array.isArray(window.errorBank)) window.errorBank = [];

    function showCurrentWordDetail() {
      if (!currentGameWord) return;

      // Grab whichever callback is pending (success or failure) before clearing overlays
      const pendingCb = successNextCallback || failureNextCallback;
      successNextCallback = null;
      failureNextCallback = null;
      // Cancel the failure auto-hide so it doesn't fire while word detail is open
      if (failureAutoHideId) { clearTimeout(failureAutoHideId); failureAutoHideId = null; }

      document.getElementById('success-overlay').classList.remove('active');
      document.getElementById('failure-overlay').classList.remove('active');

      // Show the word detail; when it closes, fire the pending callback (team rotation + next game)
      showWordDetail(currentGameWord.word, pendingCb);
    }

    function setCurrentGameWord(wordObj) {
      currentGameWord = wordObj || null;
      const hasWord = !!currentGameWord;
      const se = document.getElementById('success-explain-btn');
      const fe = document.getElementById('failure-explain-btn');
      if (se) se.style.display = hasWord ? '' : 'none';
      if (fe) fe.style.display = hasWord ? '' : 'none';
    }

    // --- Audio & Overlay ---
    const usedWords = new Set();

    let _wordDetailOnClose = null;

    /* --- Modal Controls --- */
    let _detCurrentWordKey = null;
    let _detWordList = [];    // ordered list for next/prev navigation
    let _detWordHistory = []; // history stack for back button

    function _detPopulateSynAnt(item) {
      function _synAntSpan(s, baseStyle) {
        const inDb = vocabBank.some(i => stripParens(i.word).toLowerCase() === stripParens(s).toLowerCase());
        if (inDb) return `<span data-word="${s.replace(/"/g, '&quot;')}" onclick="showWordDetail(this.dataset.word)" style="${baseStyle}cursor:pointer;text-decoration:underline dotted;" title="View word card">${s}</span>`;
        return `<span style="${baseStyle}">${s}</span>`;
      }
      const synRaw = item.synonyms || item.synonym || '';
      const syns = Array.isArray(synRaw) ? synRaw : String(synRaw).split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
      const synRow = document.getElementById('det-syn-row');
      const synEl = document.getElementById('det-syn');
      if (syns.length) {
        synEl.innerHTML = syns.map(s => _synAntSpan(s, 'background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:4px;padding:3px 10px;font-size:0.85rem;font-weight:600;color:#fff;')).join('');
        synRow.style.display = '';
      } else { synRow.style.display = 'none'; }
      document.getElementById('det-edit-syn').value = syns.join(', ');

      const antRaw = item.antonyms || item.antonym || '';
      const ants = Array.isArray(antRaw) ? antRaw : String(antRaw).split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
      const antRow = document.getElementById('det-ant-row');
      const antEl = document.getElementById('det-ant');
      if (ants.length) {
        antEl.innerHTML = ants.map(s => _synAntSpan(s, 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:4px;padding:3px 10px;font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.75);')).join('');
        antRow.style.display = '';
      } else { antRow.style.display = 'none'; }
      document.getElementById('det-edit-ant').value = ants.join(', ');
    }

    // --- Array-aware helpers for definition / exampleSentence ---
    function _firstVal(v) { if (!Array.isArray(v)) return v || ''; if (!v.length) return ''; return v[Math.floor(Math.random() * v.length)]; }
    function _allVals(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
    function _editableStr(v) { return Array.isArray(v) ? v.join('\n') : (v || ''); }
    function _parseLines(s) { const lines = s.split('\n').map(x => x.trim()).filter(Boolean); return lines.length ? lines : []; }
    function _splitFrenchTranslations(value) {
      const parts = Array.isArray(value) ? value : [value || ''];
      return parts
        .flatMap(v => String(v).split(/[,;]+/))
        .map(s => s.trim())
        .filter(Boolean);
    }
    function _detSetAllTranslations(el, item) {
      el.innerHTML = '';
      const parts = [];
      const fr = _splitFrenchTranslations(item.french).join(', ');
      const de = item.german || '';
      const it = item.italian || '';
      if (fr) parts.push('<span style="color:#aaa;font-size:0.75rem;">FR</span> ' + fr);
      if (de) parts.push('<span style="color:#aaa;font-size:0.75rem;">DE</span> ' + de);
      if (it) parts.push('<span style="color:#aaa;font-size:0.75rem;">IT</span> ' + it);
      if (!parts.length) return;
      el.innerHTML = parts.join('<span style="color:#555;margin:0 6px;">|</span>');
    }
    function _detSetFrenchField(el, value) {
      const all = _splitFrenchTranslations(value);
      el.innerHTML = '';
      if (!all.length) return;

      const preview = all.slice(0, 3);
      const hidden = all.slice(3);
      const mainSpan = document.createElement('span');
      mainSpan.textContent = preview.join(', ');
      el.appendChild(mainSpan);

      if (hidden.length) {
        const btn = document.createElement('button');
        btn.className = 'det-def-expand-btn';
        btn.textContent = '+';
        let expanded = false;
        btn.onclick = function (e) {
          e.stopPropagation();
          const existing = el.querySelector('.det-def-extra');
          if (existing) existing.remove();
          if (!expanded) {
            const extra = document.createElement('span');
            extra.className = 'det-def-extra';
            extra.textContent = `, ${hidden.join(', ')}`;
            el.insertBefore(extra, btn);
            btn.textContent = '−';
          } else {
            btn.textContent = '+';
          }
          expanded = !expanded;
        };
        el.appendChild(btn);
      }
    }
    function _detSetField(el, value, wrapQuotes, emptyText) {
      const all = _allVals(value);
      if (!all.length) { el.innerHTML = ''; if (emptyText) el.textContent = emptyText; return; }
      const first = all[0];
      el.innerHTML = '';
      const mainSpan = document.createElement('span');
      mainSpan.textContent = wrapQuotes ? `"${first}"` : first;
      el.appendChild(mainSpan);
      if (all.length > 1) {
        const btn = document.createElement('button');
        btn.className = 'det-def-expand-btn';
        btn.textContent = '[+]';
        let expanded = false;
        btn.onclick = function (e) {
          e.stopPropagation();
          el.querySelectorAll('.det-def-extra').forEach(n => n.remove());
          if (!expanded) {
            all.slice(1).forEach(d => {
              const s = document.createElement('span');
              s.className = 'det-def-extra';
              s.textContent = wrapQuotes ? ` · "${d}"` : ` · ${d}`;
              el.insertBefore(s, btn);
            });
            btn.textContent = '[−]';
          } else { btn.textContent = '[+]'; }
          expanded = !expanded;
        };
        el.appendChild(btn);
      }
    }

    // Strip parenthetical content (e.g. "(adj)", "(n)") for loose matching
    function stripParens(s) {
      return String(s || '').replace(/\s*\([^)]*\)/g, '').trim();
    }
    window.stripParens = stripParens;

    function conNormalizeWordForLookup(s) {
      if (!s) return '';
      let text = stripParens(String(s).trim());
      // Strip outer quotation marks, periods, commas, colons, semicolons, exclamation and question marks
      text = text.replace(/^["'«»“„\s]+|["'«»”\s,.;:!?]+$/g, '').trim();
      return text.toLowerCase();
    }
    window.conNormalizeWordForLookup = conNormalizeWordForLookup;

    function conFindDbEntry(wordOrText) {
      if (!wordOrText || typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return null;
      const raw = conNormalizeWordForLookup(wordOrText);
      if (!raw) return null;
      // 1. Direct word match
      const direct = vocabBank.find(v => v && v.word && conNormalizeWordForLookup(v.word) === raw);
      if (direct) return direct;
      // 2. otherForms / otherTerms match (inflections, plurals, irregular forms)
      const matchForms = (forms) => {
        if (!forms) return false;
        if (Array.isArray(forms)) {
          return forms.some(f => {
            if (!f) return false;
            const s = typeof f === 'string' ? f : (f.word || f.form || f.term || '');
            return conNormalizeWordForLookup(s) === raw;
          });
        }
        if (typeof forms === 'string' && forms.trim()) {
          return forms.split(/[,;/]+/).some(s => conNormalizeWordForLookup(s) === raw);
        }
        return false;
      };
      return vocabBank.find(v => {
        if (!v) return false;
        return matchForms(v.otherForms) || matchForms(v.otherTerms);
      }) || null;
    }
    window.conFindDbEntry = conFindDbEntry;

    function conFindAllDbEntries(wordOrText) {
      if (!wordOrText || typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return [];
      const raw = conNormalizeWordForLookup(wordOrText);
      if (!raw) return [];

      const matchForms = (forms) => {
        if (!forms) return false;
        if (Array.isArray(forms)) {
          return forms.some(f => {
            if (!f) return false;
            const s = typeof f === 'string' ? f : (f.word || f.form || f.term || '');
            return conNormalizeWordForLookup(s) === raw;
          });
        }
        if (typeof forms === 'string' && forms.trim()) {
          return forms.split(/[,;/]+/).some(s => conNormalizeWordForLookup(s) === raw);
        }
        return false;
      };

      const directMatches = [];
      const formMatches = [];
      const seenEntries = new Set();

      for (let i = 0; i < vocabBank.length; i++) {
        const v = vocabBank[i];
        if (!v || !v.word || seenEntries.has(v)) continue;
        const normLemma = conNormalizeWordForLookup(v.word);
        if (normLemma === raw) {
          seenEntries.add(v);
          directMatches.push({ entry: v, matchType: 'direct', matchedWord: v.word });
        } else if (matchForms(v.otherForms) || matchForms(v.otherTerms)) {
          seenEntries.add(v);
          formMatches.push({ entry: v, matchType: 'inflection', matchedWord: v.word });
        }
      }

      return directMatches.concat(formMatches);
    }
    window.conFindAllDbEntries = conFindAllDbEntries;

    function conGetNodeDbEntries(node) {
      if (!node) return [];
      if (typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return [];
      const results = [];
      const seen = new Set();

      if (node.dbWord) {
        const overrideMatches = conFindAllDbEntries(node.dbWord);
        overrideMatches.forEach(m => {
          if (m && m.entry && !seen.has(m.entry)) {
            seen.add(m.entry);
            results.push(m);
          }
        });
      }

      const text = node.baseWord || (node.el ? (node.el.dataset.baseWord || node.el.textContent.trim()) : '');
      if (text) {
        const textMatches = conFindAllDbEntries(text);
        textMatches.forEach(m => {
          if (m && m.entry && !seen.has(m.entry)) {
            seen.add(m.entry);
            results.push(m);
          }
        });
      }

      return results;
    }
    window.conGetNodeDbEntries = conGetNodeDbEntries;

    function conGetNodeDbEntry(node) {
      if (!node) return null;
      if (typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) return null;
      if (node.dbWord) {
        const byKey = vocabBank.find(w => w && w.word && conNormalizeWordForLookup(w.word) === conNormalizeWordForLookup(node.dbWord));
        if (byKey) return byKey;
      }
      const text = node.baseWord || (node.el ? (node.el.dataset.baseWord || node.el.textContent.trim()) : '');
      return conFindDbEntry(text);
    }
    window.conGetNodeDbEntry = conGetNodeDbEntry;

    function showWordDetail(wordKey, onClose) {
      const item = conFindDbEntry(wordKey) || (typeof vocabBank !== 'undefined' ? vocabBank.find(i => i.word === wordKey) : null);
      if (!item) return;
      _wordDetailOnClose = onClose || null;
      _detCurrentWordKey = item.word;

      // Ensure edit mode is off when opening
      document.getElementById('word-detail-overlay').classList.remove('det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';
      document.getElementById('det-save-feedback').style.display = 'none';

      // View fields
      document.getElementById('det-word').textContent = item.word;
      document.getElementById('det-ipa').textContent = item.ipa ? `/ ${item.ipa} /` : '';
      _detSetAllTranslations(document.getElementById('det-french'), item);
      document.getElementById('det-type').textContent = Array.isArray(item.partOfSpeech) ? item.partOfSpeech.join(', ') : (item.partOfSpeech || '');
      document.getElementById('det-theme').innerHTML = getItemThemes(item).map(t => `<span class="meta-badge">${t}</span>`).join(' ') || '<span class="meta-badge">—</span>';
      document.getElementById('det-level').textContent = (item.level || 'B2').toUpperCase();
      const _detSrcEl = document.getElementById('det-source');
      if (_detSrcEl) {
        const _srcs = Array.isArray(item._sources) && item._sources.length ? item._sources : [item._source || 'worddb'];
        _detSrcEl.innerHTML = _srcs.map(s => { const l = (s === 'worddb' || s === 'wordDb') ? 'wordDb' : s === 'custom' ? 'Custom' : s; return `<span class="meta-badge det-source-badge">${l}</span>`; }).join(' ');
      }
      _detSetField(document.getElementById('det-def'), item.definition, false);
      _detSetField(document.getElementById('det-ex'), item.exampleSentence, true, t('noExample'));

      // Pre-fill edit fields
      document.getElementById('det-edit-word').value = item.word || '';
      document.getElementById('det-edit-ipa').value = item.ipa || '';
      document.getElementById('det-edit-french').value = item.french || '';
      const _detEn = document.getElementById('det-edit-english'); if (_detEn) _detEn.value = item.english || '';
      const _detDe = document.getElementById('det-edit-german'); if (_detDe) _detDe.value = item.german || '';
      const _detIt = document.getElementById('det-edit-italian'); if (_detIt) _detIt.value = item.italian || '';
      document.getElementById('det-edit-pos').value = Array.isArray(item.partOfSpeech) ? item.partOfSpeech.join(', ') : (item.partOfSpeech || '');
      document.getElementById('det-edit-level').value = (item.level || 'B2').toUpperCase();
      document.getElementById('det-edit-theme').value = getItemThemes(item).join(', ');
      document.getElementById('det-edit-def').value = _editableStr(item.definition);
      document.getElementById('det-edit-ex').value = _editableStr(item.exampleSentence);

      _detPopulateSynAnt(item);

      if (!_detWordList.length) _detWordList = vocabBank.map(i => i.word);
      _detUpdateNavButtons();

      document.getElementById('word-detail-overlay').classList.add('active');
    }

    function _detUpdateNavButtons() {
      const idx = _detWordList.indexOf(_detCurrentWordKey);
      const prevBtn = document.getElementById('det-nav-prev');
      const nextBtn = document.getElementById('det-nav-next');
      const backBtn = document.getElementById('det-nav-back');
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx === -1 || idx >= _detWordList.length - 1;
      if (backBtn) backBtn.disabled = !_detWordHistory.length;
    }

    function detNavNext() {
      const idx = _detWordList.indexOf(_detCurrentWordKey);
      if (idx === -1 || idx >= _detWordList.length - 1) return;
      _detWordHistory.push(_detCurrentWordKey);
      showWordDetail(_detWordList[idx + 1], _wordDetailOnClose);
    }

    function detNavPrev() {
      const idx = _detWordList.indexOf(_detCurrentWordKey);
      if (idx <= 0) return;
      _detWordHistory.push(_detCurrentWordKey);
      showWordDetail(_detWordList[idx - 1], _wordDetailOnClose);
    }

    function detNavBack() {
      if (!_detWordHistory.length) return;
      const prev = _detWordHistory.pop();
      showWordDetail(prev, _wordDetailOnClose);
    }

    function detToggleEdit() {
      const overlay = document.getElementById('word-detail-overlay');
      const isEditing = overlay.classList.toggle('det-editing');
      document.getElementById('det-edit-btn').textContent = isEditing ? '👁' : '✏️';
      document.getElementById('det-save-feedback').style.display = 'none';
      if (isEditing) {
        const isElec = !!(window.Desktop && Desktop.isElectron());
        const memBtn = document.getElementById('det-save-memory-btn');
        if (memBtn) memBtn.style.display = isElec ? 'none' : '';
        const mainBtn = document.getElementById('det-save-main-btn');
        if (mainBtn) mainBtn.style.display = isElec ? '' : 'none';
        const customBtn = document.getElementById('det-save-custom-btn');
        if (customBtn) customBtn.style.display = isElec ? '' : 'none';
      }
    }

    let _detZoomLevel = 1;
    function detZoom(dir) {
      if (dir > 0) {
        _detZoomLevel = 2;
      } else {
        _detZoomLevel = 1;
      }
      const inner = document.querySelector('#word-detail-overlay .det-inner');
      inner.style.transform = _detZoomLevel === 1 ? '' : `scale(${_detZoomLevel})`;
      inner.style.transformOrigin = 'top center';
    }

    function detCancelEdit() {
      const overlay = document.getElementById('word-detail-overlay');
      overlay.classList.remove('det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';
      document.getElementById('det-save-feedback').style.display = 'none';
      // Re-populate from live vocabBank (discard edits)
      if (_detCurrentWordKey) showWordDetail(_detCurrentWordKey, _wordDetailOnClose);
    }

    async function detSaveEdit(target) {
      if (!_detCurrentWordKey) return;
      const wordKey = _detCurrentWordKey.toLowerCase();

      const newWord = document.getElementById('det-edit-word').value.trim();
      const newIpa = document.getElementById('det-edit-ipa').value.trim();
      const newFrench = document.getElementById('det-edit-french').value.trim();
      const newEnglish = (document.getElementById('det-edit-english')?.value || '').trim() || newWord;
      const newGerman = (document.getElementById('det-edit-german')?.value || '').trim();
      const newItalian = (document.getElementById('det-edit-italian')?.value || '').trim();
      const newPos = document.getElementById('det-edit-pos').value.trim();
      const newLevel = document.getElementById('det-edit-level').value.trim();
      const newTheme = document.getElementById('det-edit-theme').value.trim();
      const newDef = (function () { const v = document.getElementById('det-edit-def').value.trim(); const lines = v.split('\n').map(s => s.trim()).filter(Boolean); return lines.length > 1 ? lines : (lines[0] || ''); })();
      const newEx = (function () { const v = document.getElementById('det-edit-ex').value.trim(); const lines = v.split('\n').map(s => s.trim()).filter(Boolean); return lines.length > 1 ? lines : (lines[0] || ''); })();
      const newSyns = document.getElementById('det-edit-syn').value.split(',').map(s => s.trim()).filter(Boolean);
      const newAnts = document.getElementById('det-edit-ant').value.split(',').map(s => s.trim()).filter(Boolean);

      if (!newWord) {
        const fb = document.getElementById('det-save-feedback');
        fb.textContent = '⚠ Word is required.';
        fb.style.color = '#ff6b6b'; fb.style.display = 'inline';
        return;
      }

      const newThemes = newTheme.split(',').map(s => s.trim()).filter(Boolean);

      const update = {
        word: newWord, ipa: newIpa, french: newFrench, english: newEnglish, german: newGerman, italian: newItalian,
        partOfSpeech: newPos, level: newLevel,
        definition: newDef, exampleSentence: newEx,
        synonyms: newSyns, antonyms: newAnts
      };

      // Update themes in vocabThemes (remove word from all themes, then add to new ones)
      if (typeof vocabThemes !== 'undefined') {
        const wLower = newWord.toLowerCase();
        vocabThemes.forEach(entry => {
          for (const [theme, words] of Object.entries(entry)) {
            entry[theme] = words.filter(w => w.trim().toLowerCase() !== wLower);
          }
        });
        newThemes.forEach(theme => {
          let found = false;
          vocabThemes.forEach(entry => { if (entry[theme]) { if (!entry[theme].map(w => w.toLowerCase()).includes(newWord.toLowerCase())) entry[theme].push(newWord); found = true; } });
          if (!found) vocabThemes.push({ [theme]: [newWord] });
        });
        invalidateThemeIndex();
      }

      // Update live vocabBank
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordKey);
      if (vi !== -1) Object.assign(vocabBank[vi], update);

      // Update custom localStorage
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === wordKey);
        if (ci !== -1) { Object.assign(cw[ci], update); localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw)); }
      } catch (e) { }

      // Update key if word was renamed
      _detCurrentWordKey = newWord;

      // Refresh view fields
      document.getElementById('det-word').textContent = newWord;
      document.getElementById('det-ipa').textContent = newIpa ? `/ ${newIpa} /` : '';
      _detSetAllTranslations(document.getElementById('det-french'), { french: newFrench, german: newGerman, italian: newItalian });
      document.getElementById('det-type').textContent = newPos;
      document.getElementById('det-level').textContent = newLevel.toUpperCase();
      document.getElementById('det-theme').innerHTML = newThemes.map(th => `<span class="meta-badge">${th}</span>`).join(' ') || '<span class="meta-badge">—</span>';
      _detSetField(document.getElementById('det-def'), newDef, false);
      _detSetField(document.getElementById('det-ex'), newEx, true, t('noExample'));
      _detPopulateSynAnt(update);

      // Exit edit mode
      document.getElementById('word-detail-overlay').classList.remove('det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';

      const fb = document.getElementById('det-save-feedback');
      fb.style.color = '#4cff82'; fb.style.display = 'inline';

      if (target === 'main' && typeof awDownloadDB === 'function') {
        fb.textContent = '⏳ Saving to Main DB…';
        await awDownloadDB();
        fb.textContent = '✓ Saved to Main DB!';
        setTimeout(() => { fb.style.display = 'none'; }, 2200);
      } else if (target === 'custom' && window.Desktop && Desktop.isElectron()) {
        fb.textContent = '⏳ Saving to Custom DB…';
        const existing2 = vocabBank.find(v => v.word && v.word.toLowerCase() === newWord.toLowerCase());
        const entryForCustom = {
          word: newWord, ipa: newIpa, partOfSpeech: newPos, level: newLevel,
          theme: newThemes, definition: newDef, french: newFrench,
          exampleSentence: newEx, synonyms: newSyns, antonyms: newAnts,
          otherForms: (existing2 && existing2.otherForms) || []
        };
        const filename = await window.pickCustomDbFile();
        if (!filename) { fb.style.display = 'none'; return; }
        let entries = [];
        try {
          const result = await Desktop.readText('customData', filename);
          if (result && result.ok && result.content) {
            const s = result.content.indexOf('['), e = result.content.lastIndexOf(']');
            if (s !== -1 && e > s) { try { entries = JSON.parse(result.content.slice(s, e + 1)); } catch { } }
          }
        } catch (e3) { }
        try {
          const ci2 = entries.findIndex(w => w.word.toLowerCase() === newWord.toLowerCase());
          if (ci2 !== -1) { entries[ci2] = entryForCustom; } else { entries.push(entryForCustom); }
          const lines = entries.map(w => '  ' + JSON.stringify(w));
          const content = `// ${filename}\nconst customVocabBank = [\n${lines.join(',\n')}\n];\n`;
          await Desktop.saveText('customData', filename, content);
          fb.textContent = `✓ Saved to ${filename}!`;
        } catch (e3) {
          fb.textContent = '⚠ Failed to save to custom DB.';
          fb.style.color = '#ff6b6b';
        }
        setTimeout(() => { fb.style.display = 'none'; }, 2200);
      } else {
        fb.textContent = '✓ Saved!';
        setTimeout(() => { fb.style.display = 'none'; }, 2200);
      }
    }

    async function detDeleteEdit() {
      if (!_detCurrentWordKey) return;
      const wordKey = _detCurrentWordKey.toLowerCase();
      const item = vocabBank.find(w => w.word && w.word.toLowerCase() === wordKey);
      const label = item && item.word ? item.word : _detCurrentWordKey;
      if (!await showConfirm(`Permanently delete "${label}"?`)) return;

      // Remove from live vocabBank
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordKey);
      if (vi !== -1) vocabBank.splice(vi, 1);

      // Remove from custom localStorage list if present
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === wordKey);
        if (ci !== -1) {
          cw.splice(ci, 1);
          localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw));
        }
      } catch (e) { }

      // Remove word from theme index entries
      if (typeof vocabThemes !== 'undefined') {
        vocabThemes.forEach(entry => {
          for (const [theme, words] of Object.entries(entry)) {
            entry[theme] = words.filter(w => w.trim().toLowerCase() !== wordKey);
          }
        });
        if (typeof invalidateThemeIndex === 'function') invalidateThemeIndex();
      }
      if (typeof populateAllThemeMenus === 'function') populateAllThemeMenus();

      const fb = document.getElementById('det-save-feedback');
      fb.textContent = '✓ Deleted!';
      fb.style.color = '#4cff82';
      fb.style.display = 'inline';

      _detCurrentWordKey = null;
      setTimeout(() => {
        fb.style.display = 'none';
        hideWordDetail();
      }, 500);
    }

    function hideWordDetail() {
      timerResume();
      document.getElementById('word-detail-overlay').classList.remove('active', 'det-editing');
      document.getElementById('det-edit-btn').textContent = '✏️';
      _detZoomLevel = 1;
      const inner = document.querySelector('#word-detail-overlay .det-inner');
      if (inner) inner.style.transform = '';
      _detWordList = [];
      _detWordHistory = [];
      const cb = _wordDetailOnClose;
      _wordDetailOnClose = null;
      if (typeof cb === 'function') cb();
    }

    function showExplanationBtn(wordObj, containerId) {
      if (!wordObj) return;
      const container = document.getElementById(containerId);
      if (!container) return;
      // Remove any existing explanation btn
      const existing = container.querySelector('.btn-explain');
      if (existing) existing.remove();
      const btn = document.createElement('button');
      btn.className = 'action-btn btn-explain';
      btn.textContent = '📖 Explanation';
      btn.onclick = () => showWordDetail(wordObj.word);
      container.appendChild(btn);
    }

    // --- Updated Overlay Logic ---
    let successNextCallback = null;
    function showSuccess(nextFn) {
      timerPause();
      successNextCallback = nextFn || null;
      const overlay = document.getElementById('success-overlay');
      const btn = document.getElementById('success-next-btn');
      if (teams && teams.length > 1) {
        const nextIdx = (currentTeamIdx + 1) % teams.length;
        btn.textContent = t('passTo') + ' ' + teams[nextIdx].name;
      } else {
        btn.textContent = t('btnNextWord');
      }
      overlay.classList.add('active');
    }

    function hideSuccess() {
      timerResume();
      document.getElementById('success-overlay').classList.remove('active');
      const cb = successNextCallback;
      successNextCallback = null;
      if (typeof cb === 'function') cb();
    }

    let failureNextCallback = null;
    let failureAutoHideId = null;

    function showFailure(customMsg = "Better luck next time", nextFn) {
      timerPause();
      failureNextCallback = nextFn || null;
      if (failureAutoHideId) { clearTimeout(failureAutoHideId); failureAutoHideId = null; }
      const overlay = document.getElementById('failure-overlay');
      document.getElementById('failure-msg').textContent = customMsg;
      overlay.classList.add('active');
      // Auto-hide after 2 seconds then fire callback
      failureAutoHideId = setTimeout(hideFailure, 2000);
    }

    function hideFailure() {
      timerResume();
      if (failureAutoHideId) { clearTimeout(failureAutoHideId); failureAutoHideId = null; }
      document.getElementById('failure-overlay').classList.remove('active');
      const cb = failureNextCallback;
      failureNextCallback = null;
      if (typeof cb === 'function') cb();
    }

    // Prevent global outside-click dismiss handlers from firing after a text-selection
    // drag that starts inside an editable field and ends outside it.
    (function () {
      function isEditableTarget(el) {
        if (!el || el.nodeType !== 1) return false;
        if (el.closest('[contenteditable="true"]')) return true;
        const ctrl = el.closest('input, textarea, select');
        if (!ctrl) return false;
        if (ctrl.tagName === 'INPUT') {
          const t = String(ctrl.type || 'text').toLowerCase();
          return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(t);
        }
        return true;
      }

      function hasEditableSelection() {
        const ae = document.activeElement;
        if (!ae) return false;
        if (ae.matches && ae.matches('input, textarea')) {
          try {
            return Number(ae.selectionStart) !== Number(ae.selectionEnd);
          } catch (_) {
            return false;
          }
        }
        if (ae.isContentEditable || (ae.closest && ae.closest('[contenteditable="true"]'))) {
          const sel = window.getSelection ? window.getSelection() : null;
          return !!(sel && sel.rangeCount && !sel.isCollapsed);
        }
        return false;
      }

      let downInEditable = false;
      let startX = 0;
      let startY = 0;
      let dragged = false;
      let suppressNextOutsideClick = false;

      document.addEventListener('mousedown', function (e) {
        downInEditable = isEditableTarget(e.target);
        startX = e.clientX;
        startY = e.clientY;
        dragged = false;
      }, true);

      document.addEventListener('mousemove', function (e) {
        if (!downInEditable || dragged) return;
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 3 || dy > 3) dragged = true;
      }, true);

      document.addEventListener('mouseup', function () {
        if (!downInEditable) return;
        if (dragged || hasEditableSelection()) suppressNextOutsideClick = true;
        downInEditable = false;
        dragged = false;
      }, true);

      document.addEventListener('click', function (e) {
        if (!suppressNextOutsideClick) return;
        suppressNextOutsideClick = false;
        if (isEditableTarget(e.target)) return;
        if (e.target.closest && e.target.closest('#wn-style-popup, #wn-style-overlay, #wn-link-dialog, #wn-link-dialog-overlay')) return;
        e.stopImmediatePropagation();
        e.stopPropagation();
      }, true);
      window._wnClearOutsideClickSuppression = function () { suppressNextOutsideClick = false; };
    })();

    // --- Core Routing & Filters ---

    // ---- Multi-Theme Picker helpers ----
    function themePickerToggle(btn) {
      const wrap = btn.closest('.theme-picker-wrap');
      const isOpen = wrap.classList.contains('open');
      // close all others first
      document.querySelectorAll('.theme-picker-wrap.open').forEach(w => w.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    }

    // Close pickers when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.theme-picker-wrap')) {
        document.querySelectorAll('.theme-picker-wrap.open').forEach(w => w.classList.remove('open'));
      }
    });

    function themePickerGetSelected(wrap) {
      const checked = wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:checked');
      const vals = [...checked].map(c => c.value).filter(v => v !== 'all');
      return vals.length === 0 ? ['all'] : vals;
    }

    function themePickerSetSelected(wrap, values) {
      wrap.querySelectorAll('.theme-picker-option input[type=checkbox]').forEach(cb => {
        if (cb.value === 'all') {
          cb.checked = (values.includes('all') || values.length === 0);
        } else {
          cb.checked = values.includes(cb.value);
        }
      });
      themePickerUpdateBtn(wrap);
    }

    function themePickerGetAllLabel(wrap) {
      const allOpt = wrap.querySelector('.theme-picker-option.all-option span');
      return allOpt ? allOpt.textContent : 'All';
    }

    function themePickerGetItemLabel(wrap, value) {
      const opt = wrap.querySelector(`.theme-picker-option input[value="${CSS.escape(value)}"]`);
      return opt ? (opt.nextElementSibling?.textContent || value) : value;
    }

    function themePickerUpdateBtn(wrap, allLabel) {
      const btn = wrap.querySelector('.theme-picker-btn');
      const checked = [...wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:checked')]
        .map(c => c.value).filter(v => v !== 'all');
      const label = allLabel || themePickerGetAllLabel(wrap) || 'All';
      if (checked.length === 0) {
        btn.innerHTML = '';
        btn.appendChild(Object.assign(document.createElement('span'), { textContent: label }));
      } else {
        btn.innerHTML = '';
        checked.forEach(v => {
          const displayLabel = themePickerGetItemLabel(wrap, v);
          const tag = document.createElement('span');
          tag.className = 'theme-tag';
          tag.innerHTML = `${displayLabel}<span class="theme-tag-remove" data-val="${v}" onclick="themeTagRemove(event,this)">✕</span>`;
          btn.appendChild(tag);
        });
      }
    }

    function themeTagRemove(e, span) {
      e.stopPropagation();
      const wrap = span.closest('.theme-picker-wrap');
      const val = span.dataset.val;
      const cb = wrap.querySelector(`.theme-picker-option input[value="${CSS.escape(val)}"]`);
      if (cb) cb.checked = false;
      // sync all-option
      const anyCB = wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:not([value=all])');
      const anyChecked = [...anyCB].some(c => c.checked);
      const allCB = wrap.querySelector('.theme-picker-option input[value=all]');
      if (allCB) allCB.checked = !anyChecked;
      themePickerUpdateBtn(wrap);
      syncAndRefresh();
    }

    function buildThemePickerDropdown(wrap, themes, currentSelected, labelMap, allLabel) {
      // labelMap: optional array of {value, label} for display names
      // allLabel: optional string for the "All" option label
      const dd = wrap.querySelector('.theme-picker-dropdown');
      dd.innerHTML = '';
      // Apply 2-column layout only for theme pickers (not level or pos)
      const isThemePicker = !wrap.classList.contains('level-picker-wrap') && !wrap.classList.contains('pos-picker-wrap') && !wrap.classList.contains('letter-picker-wrap') && !wrap.classList.contains('length-picker-wrap') && !wrap.classList.contains('source-picker-wrap');
      dd.classList.toggle('theme-dropdown-cols', isThemePicker);
      const getLabel = v => {
        if (!labelMap) return v;
        const found = labelMap.find(o => o.value === v);
        return found ? found.label : v;
      };

      // "All" option
      const allDiv = document.createElement('div');
      allDiv.className = 'theme-picker-option all-option';
      const allCB = document.createElement('input');
      allCB.type = 'checkbox'; allCB.value = 'all';
      allCB.checked = (currentSelected.includes('all') || currentSelected.length === 0);
      allCB.addEventListener('change', function () {
        if (this.checked) {
          wrap.querySelectorAll('.theme-picker-option input[type=checkbox]').forEach(c => c.checked = false);
          this.checked = true;
        }
        themePickerUpdateBtn(wrap, allLabel); syncAndRefresh();
      });
      allDiv.appendChild(allCB);
      allDiv.appendChild(Object.assign(document.createElement('span'), { textContent: allLabel || 'All' }));
      dd.appendChild(allDiv);

      themes.forEach(t => {
        const div = document.createElement('div');
        div.className = 'theme-picker-option';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = t;
        cb.checked = currentSelected.includes(t);
        cb.addEventListener('change', function () {
          const allCb = wrap.querySelector('.theme-picker-option input[value=all]');
          const anyChecked = [...wrap.querySelectorAll('.theme-picker-option input[type=checkbox]:not([value=all])')].some(c => c.checked);
          if (allCb) allCb.checked = !anyChecked;
          themePickerUpdateBtn(wrap, allLabel); syncAndRefresh();
        });
        div.appendChild(cb);
        div.appendChild(Object.assign(document.createElement('span'), { textContent: getLabel(t) }));
        dd.appendChild(div);
      });

      themePickerUpdateBtn(wrap, allLabel);
    }

    // Build a reverse lookup: word → [theme, …] from vocabThemes
    // vocabThemes format: [{ "Theme Name": ["word1", "word2", …] }, …]
    function _buildThemeIndex() {
      const idx = {};
      if (typeof vocabThemes === 'undefined') return idx;
      for (const entry of vocabThemes) {
        for (const [theme, words] of Object.entries(entry)) {
          for (const w of words) {
            const key = w.trim().toLowerCase();
            if (!idx[key]) idx[key] = [];
            if (!idx[key].includes(theme)) idx[key].push(theme);
          }
        }
      }
      return idx;
    }
    let _themeIndex = null;
    function getThemeIndex() {
      if (!_themeIndex) _themeIndex = _buildThemeIndex();
      return _themeIndex;
    }
    function invalidateThemeIndex() { _themeIndex = null; }

    // Returns the themes for a vocab item: from vocabThemes index if available, else item.theme field
    function getItemThemes(item) {
      if (!item || !item.word) return [];
      if (typeof vocabThemes !== 'undefined' && vocabThemes.length) {
        return getThemeIndex()[item.word.trim().toLowerCase()] || [];
      }
      const t = item.theme;
      if (!t) return [];
      return Array.isArray(t) ? t : String(t).split(',').map(s => s.trim()).filter(Boolean);
    }

    const LEVEL_OPTIONS = [
      { value: 'a1', label: 'A1' }, { value: 'a2', label: 'A2' },
      { value: 'b1', label: 'B1' }, { value: 'b2', label: 'B2' }, { value: 'c1', label: 'C1' }
    ];
    const POS_OPTIONS = [
      { value: 'noun', label: 'Noun' }, { value: 'verb', label: 'Verb' },
      { value: 'adjective', label: 'Adjective' }, { value: 'adverb', label: 'Adverb' }
    ];

    function populateStaticPicker(wrap, options, allLabel) {
      const dd = wrap.querySelector('.theme-picker-dropdown');
      if (!dd || dd.children.length > 0) return; // already built
      const current = themePickerGetSelected(wrap);
      buildThemePickerDropdown(wrap, options.map(o => o.value), current, options, allLabel);
    }

    function populateAllLevelMenus() {
      document.querySelectorAll('.level-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, LEVEL_OPTIONS.map(o => o.value), current, LEVEL_OPTIONS, 'All Levels');
      });
    }

    function populateAllPosMenus() {
      const types = [...new Set(vocabBank.flatMap(item => item.partOfSpeech ? (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]) : []).filter(Boolean))].sort();
      document.querySelectorAll('.pos-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, types, current, null, t('allTypes'));
      });
    }

    function populateAllLetterMenus() {
      const letters = [...new Set(vocabBank.map(item => item.word ? item.word[0].toUpperCase() : '').filter(Boolean))].sort();
      document.querySelectorAll('.letter-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, letters, current, null, 'All Letters');
      });
    }

    function populateAllLengthMenus() {
      const lengths = [...new Set(vocabBank.map(item => item.word ? String(item.word.length) : '').filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      const labelMap = lengths.map(l => ({ value: l, label: l + (l === '1' ? ' letter' : ' letters') }));
      document.querySelectorAll('.length-picker-wrap').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, lengths, current, labelMap, 'All Lengths');
      });
    }

    function populateAllThemeMenus() {
      // Theme list: prefer vocabThemes keys; fall back to theme fields in vocabBank
      let themes;
      if (typeof vocabThemes !== 'undefined' && vocabThemes.length) {
        themes = [...new Set(vocabThemes.flatMap(entry => Object.keys(entry)))].sort((a, b) => a.localeCompare(b));
      } else if (typeof vocabBank !== 'undefined' && vocabBank.length) {
        themes = [...new Set(vocabBank.flatMap(w => {
          const t = w.theme;
          if (!t) return [];
          return Array.isArray(t) ? t : String(t).split(',').map(s => s.trim()).filter(Boolean);
        }))].sort((a, b) => a.localeCompare(b));
      } else {
        themes = [];
      }
      document.querySelectorAll('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)').forEach(wrap => {
        const dd = wrap.querySelector('.theme-picker-dropdown');
        if (!dd) return;
        const current = themePickerGetSelected(wrap);
        buildThemePickerDropdown(wrap, themes, current, null, 'All Themes');
      });
      populateAllLevelMenus();
      populateAllPosMenus();
      populateAllLetterMenus();
      populateAllLengthMenus();
    }

    const SIMPLE_WORD_SECTIONS = new Set([
      'hangman-game-section', 'scramble-game-section', 'clue-game-section',
      'ipa-game-section', 'synonym-game-section', 'wordsearch-game-section'
    ]);

    function isSimpleWord(item) {
      const w = item.word || '';
      if (/[()]/.test(w)) return false;        // exclude parentheses
      if (w.trim().includes(' ')) return false; // exclude multi-word
      return true;
    }

    function getFilteredBank() {
      const current = document.getElementById(activeSection);
      const lvls = current.querySelector('.level-picker-wrap') ? themePickerGetSelected(current.querySelector('.level-picker-wrap')) : ['all'];
      const thms = current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)') ? themePickerGetSelected(current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)')) : ['all'];
      const poss = current.querySelector('.pos-picker-wrap') ? themePickerGetSelected(current.querySelector('.pos-picker-wrap')) : ['all'];
      const letts = current.querySelector('.letter-picker-wrap') ? themePickerGetSelected(current.querySelector('.letter-picker-wrap')) : ['all'];
      const lens = current.querySelector('.length-picker-wrap') ? themePickerGetSelected(current.querySelector('.length-picker-wrap')) : ['all'];
      const simple = SIMPLE_WORD_SECTIONS.has(activeSection);
      return vocabBank.filter(item => {
        const lvlM = (lvls.includes('all') || (item.level && lvls.includes(item.level.toLowerCase())));
        const thmM = (thms.includes('all') || getItemThemes(item).some(t => thms.includes(t)));
        const posM = (poss.includes('all') || (item.partOfSpeech && (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]).some(p => poss.includes(p.toLowerCase()))));
        const letM = (letts.includes('all') || (item.word && letts.includes(item.word[0].toUpperCase())));
        const lenM = (lens.includes('all') || (item.word && lens.includes(String(item.word.length))));
        return lvlM && thmM && posM && letM && lenM && (!simple || isSimpleWord(item));
      });
    }

    function syncAndRefresh() {
      usedWords.clear();
      const current = document.getElementById(activeSection);
      const lvls = current.querySelector('.level-picker-wrap') ? themePickerGetSelected(current.querySelector('.level-picker-wrap')) : ['all'];
      const thms = current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)') ? themePickerGetSelected(current.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)')) : ['all'];
      const poss = current.querySelector('.pos-picker-wrap') ? themePickerGetSelected(current.querySelector('.pos-picker-wrap')) : ['all'];
      const letts = current.querySelector('.letter-picker-wrap') ? themePickerGetSelected(current.querySelector('.letter-picker-wrap')) : ['all'];
      const lens = current.querySelector('.length-picker-wrap') ? themePickerGetSelected(current.querySelector('.length-picker-wrap')) : ['all'];

      document.querySelectorAll('.level-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, lvls));
      document.querySelectorAll('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)').forEach(wrap => themePickerSetSelected(wrap, thms));
      document.querySelectorAll('.pos-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, poss));
      document.querySelectorAll('.letter-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, letts));
      document.querySelectorAll('.length-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, lens));

      if (activeSection !== 'main-menu') refreshCurrentGame();
    }

    function navTo(sectionId) {
      const oldSection = document.getElementById(activeSection);
      if (oldSection) {
        const lvls = oldSection.querySelector('.level-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.level-picker-wrap')) : ['all'];
        const thms = oldSection.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)') ? themePickerGetSelected(oldSection.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)')) : ['all'];
        const poss = oldSection.querySelector('.pos-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.pos-picker-wrap')) : ['all'];
        const letts = oldSection.querySelector('.letter-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.letter-picker-wrap')) : ['all'];
        const lens = oldSection.querySelector('.length-picker-wrap') ? themePickerGetSelected(oldSection.querySelector('.length-picker-wrap')) : ['all'];

        // Autosave when leaving a board content section (only if changes were made)
        const _boardSaveSections = { 'constellation-section': 'constellation' };
        if (_boardSaveSections[activeSection] && activeSection !== sectionId && typeof boardAutosaveSection === 'function') {
          if (_boardIsDirty) {
            boardAutosaveSection(_boardSaveSections[activeSection], { force: false });
            // Save a real PNG snapshot of the current constellation page when navigating away (deferred to idle)
            if (activeSection === 'constellation-section' && typeof conQueueCurrentPageSnapshotPng === 'function') {
              conQueueCurrentPageSnapshotPng(conCurrentPageIndex);
            }
          }
        }

        // Clear team background from the section we're leaving
        oldSection.style.background = '';
        oldSection.style.borderColor = '';
        oldSection.style.boxShadow = '';
      }

      activeSection = sectionId;
      if (typeof wfaClose === 'function') wfaClose();
      usedWords.clear();
      document.querySelectorAll('.game').forEach(s => s.classList.add('hidden'));

      const target = document.getElementById(sectionId);
      if (target) target.classList.remove('hidden');

      if (sectionId !== 'main-menu' && target) {
        const mount = target.querySelector('.filter-mount');
        if (mount && !mount.innerHTML) {
          mount.appendChild(document.getElementById('filter-template').content.cloneNode(true));
        }

        if (sectionId === 'gap-game-section') {
          if (typeof populateGrammarMenu === 'function') populateGrammarMenu();
        }

        populateAllThemeMenus();
        if (target.querySelector('.level-picker-wrap')) themePickerSetSelected(target.querySelector('.level-picker-wrap'), lvls);
        if (target.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)')) themePickerSetSelected(target.querySelector('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)'), thms);
        if (target.querySelector('.letter-picker-wrap')) themePickerSetSelected(target.querySelector('.letter-picker-wrap'), letts);
        if (target.querySelector('.length-picker-wrap')) themePickerSetSelected(target.querySelector('.length-picker-wrap'), lens);
        if (target.querySelector('.pos-picker-wrap')) themePickerSetSelected(target.querySelector('.pos-picker-wrap'), poss);

        refreshCurrentGame();
        renderGameTeamUI();
        if (sectionId === 'history-section' || sectionId === 'main-menu') {
          if (!historyHasLoaded && typeof historyRefreshList === 'function') {
            historyRefreshList();
          } else if (typeof historyRenderList === 'function') {
            _historyNeedsRender = false;
            historyRenderList();
          }
        }
        if (sectionId === 'constellation-section') {
          if (typeof conRenderHeaderCompetenceBar === 'function') conRenderHeaderCompetenceBar();
          if (typeof window.conScheduleLayoutRefresh === 'function') {
            window.conScheduleLayoutRefresh();
          } else {
            if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
            if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
          }
        }
      } else {
        populateAllThemeMenus();
      }
    }
    window.navTo = navTo;

    function openHelp() {
      document.getElementById('help-overlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeHelp() {
      document.getElementById('help-overlay').classList.remove('active');
      document.body.style.overflow = '';
    }

    function resetAllFilters() {
      usedWords.clear();
      document.querySelectorAll('.theme-picker-wrap').forEach(wrap => themePickerSetSelected(wrap, ['all']));
      if (activeSection !== 'main-menu') refreshCurrentGame();
    }

    function refreshCurrentGame() {
      // Board file: constellation + textual analysis
      // textanalysis needs no refresh
    }


    function getRandomSet(count) {
      const filtered = getFilteredBank();
      let available = filtered.filter(item => !usedWords.has(item.word));
      if (available.length < count) {
        usedWords.clear();
        available = filtered;
      }
      const picked = [...available].sort(() => Math.random() - 0.5).slice(0, Math.min(count, available.length));
      picked.forEach(item => usedWords.add(item.word));
      return picked;
    }

    // --- SESSION DEDUPLICATION ---

    function pickUnused(pool) {
      // Filter out already-used words
      let available = pool.filter(item => !usedWords.has(item.word));
      // If all used, reset and start fresh
      if (available.length === 0) {
        usedWords.clear();
        available = pool;
      }
      const item = available[Math.floor(Math.random() * available.length)];
      usedWords.add(item.word);
      return item;
    }

    // --- SCROLL TO TOP ---
    window.addEventListener('scroll', function () {
      const btn = document.getElementById('scroll-top-btn');
      if (btn) btn.classList.toggle('visible', window.scrollY > 300);
    });

    // --- AUDIO PREWARM on first mousemove ---
    let audioPrewarmed = false;
    document.addEventListener('mousemove', function prewarmAudio() {
      if (audioPrewarmed) return;
      audioPrewarmed = true;
      try {
        const ctx = getAudioContext();
        // Create a silent buffer to unlock the AudioContext
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        ctx.resume().catch(() => { });
      } catch (e) { }
      document.removeEventListener('mousemove', prewarmAudio);
    }, { passive: true });

    // =============================================
    // TEAM MODE — disabled in this file
    // =============================================
    const TEAM_COLORS = [];
    let teams = [];
    let currentTeamIdx = 0;
    const POINTS_WIN = 20;
    const POINTS_LOSE = -10;
    const POINTS_CLUE_PENALTY = -5;
    const POINTS_WRONG_PENALTY = -2;
    const POINTS_WS_WORD = 5;
    const GAME_TEAM_UI_MAP = {};
    function addTeam() { }
    function clearAllTeams() { }
    function resetTeams() { }
    function renderTeamSetup() { }
    function removeTeam() { }
    function renderMainScoreboard() { }
    function applyTeamBackground() { }
    function renderGameTeamUI() { }
    function awardPoints() { }
    function manualAwardPoints() { }
    function nextTeamTurn() { }
    function wsNextTeamTurn() { }
    function switchToTeam() { }
    function showPointsToast() { }
    // --- CONSTELLATION FULLSCREEN ---
    let conIsFullscreen = false;
    function conToggleFullscreen() {
      const section = document.getElementById('constellation-section');
      const board = document.getElementById('constellation-board');
      const btn = document.getElementById('con-fullscreen-btn');
      conIsFullscreen = !conIsFullscreen;
      if (conIsFullscreen) {
        if (board) {
          board.style.width = '';
          board.style.maxWidth = '';
          board.style.height = '';
          board.style.marginLeft = '';
          board.style.marginRight = '';
        }
        section.classList.add('con-fullscreen');
        btn.textContent = '⛶ Exit Fullscreen';
        document.body.style.overflow = 'hidden';
      } else {
        section.classList.remove('con-fullscreen');
        if (typeof window.conApplyDefaultBoardLayout === 'function') {
          window.conApplyDefaultBoardLayout();
        }
        btn.textContent = '⛶ Fullscreen';
        document.body.style.overflow = '';
      }
    }

    // ================================================================
    // CLASS GROUP SELECTOR + FILENAME PREFIX
    // ================================================================
    const CLASS_GROUP_STORAGE_KEY = 'active_class_group';
    let activeClassGroup = '';
    let activePlannerEntryId = '';
    let _conPendingDuplicateRelinkRename = false;

    function sanitizeFilenamePart(raw) {
      return String(raw || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '_');
    }



    function getClassGroupLabel(groupName) {
      const label = String(groupName || '').trim();
      if (!label) return 'No class prefix';
      return _cgDisplayName(label) || label;
    }

    function updateGroupSelectorTitle() { }

    function _cgDisplayName(key) {
      if (!key) return '';
      try {
        const meta = (typeof window.CLASS_GROUPS_META !== 'undefined' && window.CLASS_GROUPS_META)
          ? window.CLASS_GROUPS_META
          : (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
            ? CLASS_GROUPS_META
            : (typeof window.CLASS_GROUPS_DATA !== 'undefined' && window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta)
              ? window.CLASS_GROUPS_DATA.classGroupsMeta
              : (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta)
                ? CLASS_GROUPS_DATA.classGroupsMeta
                : null;
        const m = meta ? meta[key] : null;
        if (m && (m.name || m.title)) return String(m.name || m.title);
      } catch { }
      try {
        const cfg = window.PLANNER_CONFIG;
        const cls = cfg && cfg.classes && cfg.classes[key];
        if (cls && cls.name) return String(cls.name);
      } catch { }
      return key;
    }
    window._cgDisplayName = _cgDisplayName;

    function setActiveClassGroup(groupName, options = {}) {
      const preserveBoardState = !!options.preserveBoardState;
      const prevGroup = activeClassGroup;
      const meta = (typeof window.CLASS_GROUPS_META !== 'undefined' && window.CLASS_GROUPS_META)
        ? window.CLASS_GROUPS_META
        : (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
          ? CLASS_GROUPS_META
          : (typeof window.CLASS_GROUPS_DATA !== 'undefined' && window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta)
            ? window.CLASS_GROUPS_DATA.classGroupsMeta
            : (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta)
              ? CLASS_GROUPS_DATA.classGroupsMeta
              : null;
      let nextGroup = String(groupName || '').trim();
      if (nextGroup) {
        if (meta && meta[nextGroup]) {
          // Exactly matches a key in meta (e.g. UUID)
        } else if (meta) {
          // Check if groupName matches by displayName / name
          const matchKey = Object.keys(meta).find(k => meta[k] && (meta[k].name === nextGroup || _cgDisplayName(k) === nextGroup));
          if (matchKey) nextGroup = matchKey;
        }
      }
      if (prevGroup !== nextGroup && !preserveBoardState && typeof boardAutosaveAllNow === 'function') {
        if (_boardIsDirty) {
          boardAutosaveAllNow({ classGroup: prevGroup, force: false });
        }
      }
      activeClassGroup = nextGroup;
      conUpdateClassDropdownButton();
      const pillsEl = document.getElementById('con-class-pills');
      if (pillsEl) {
        pillsEl.querySelectorAll('.con-class-pill').forEach(p => {
          p.classList.toggle('active', (p.dataset.group || '') === activeClassGroup);
        });
      }
      try {
        if (activeClassGroup) sessionStorage.setItem(CLASS_GROUP_STORAGE_KEY, activeClassGroup);
        else sessionStorage.removeItem(CLASS_GROUP_STORAGE_KEY);
      } catch (e) { }
      if (prevGroup !== activeClassGroup) {
        if (typeof sessionLoadHandleClassGroupChange === 'function') {
          sessionLoadHandleClassGroupChange();
        }
      }
    }

    function conUpdateClassDropdownButton() {
      const btn = document.getElementById('con-class-dropdown-btn');
      if (!btn) return;
      const defaultAllText = typeof t === 'function' ? t('conClassAllClasses', 'All classes') : 'All classes';
      const label = activeClassGroup ? _cgDisplayName(activeClassGroup) : defaultAllText;
      btn.textContent = label + ' ▾';
      const groupPrefix = typeof t === 'function' ? t('conClassGroupTitle', 'Class group: ') : 'Class group: ';
      const chooseGroupText = typeof t === 'function' ? t('conClassChooseGroup', 'Choose class group') : 'Choose class group';
      btn.title = activeClassGroup ? (groupPrefix + label) : chooseGroupText;
      btn.setAttribute('aria-expanded', document.getElementById('con-class-dropdown')?.classList.contains('open') ? 'true' : 'false');
    }

    function conCloseClassDropdownOnEscape(ev) {
      if (ev.key === 'Escape') {
        conCloseClassDropdown();
      }
    }

    function conCloseClassDropdown() {
      const wrap = document.getElementById('con-class-dropdown');
      const btn = document.getElementById('con-class-dropdown-btn');
      if (!wrap) return;
      wrap.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', conCloseClassDropdownOnOutsideClick, true);
      document.removeEventListener('keydown', conCloseClassDropdownOnEscape, true);
    }

    function conToggleClassDropdown(forceOpen) {
      const wrap = document.getElementById('con-class-dropdown');
      if (!wrap) return;
      const pillsEl = document.getElementById('con-class-pills');
      if (pillsEl && pillsEl.children.length === 0) {
        initClassGroupSelector();
      }
      if (typeof bpClose === 'function') bpClose();
      if (typeof closeSaveSyncMenu === 'function') closeSaveSyncMenu();
      const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !wrap.classList.contains('open');
      if (shouldOpen) {
        wrap.classList.add('open');
        conUpdateClassDropdownButton();
        document.addEventListener('click', conCloseClassDropdownOnOutsideClick, true);
        document.addEventListener('keydown', conCloseClassDropdownOnEscape, true);
      } else {
        conCloseClassDropdown();
        document.removeEventListener('click', conCloseClassDropdownOnOutsideClick, true);
        document.removeEventListener('keydown', conCloseClassDropdownOnEscape, true);
      }
    }

    function conCloseClassDropdownOnOutsideClick(ev) {
      const wrap = document.getElementById('con-class-dropdown');
      if (!wrap || wrap.contains(ev.target)) return;
      conCloseClassDropdown();
      document.removeEventListener('click', conCloseClassDropdownOnOutsideClick, true);
      document.removeEventListener('keydown', conCloseClassDropdownOnEscape, true);
    }

    async function initClassGroupSelector() {
      const pillsEl = document.getElementById('con-class-pills');
      if (!pillsEl) return;

      let meta = (typeof window.CLASS_GROUPS_META !== 'undefined' && window.CLASS_GROUPS_META)
        ? window.CLASS_GROUPS_META
        : (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
          ? CLASS_GROUPS_META
          : (typeof window.CLASS_GROUPS_DATA !== 'undefined' && window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta)
            ? window.CLASS_GROUPS_DATA.classGroupsMeta
            : (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta)
              ? CLASS_GROUPS_DATA.classGroupsMeta
              : null;

      let rawGroups = (typeof window.CLASS_GROUPS !== 'undefined' && window.CLASS_GROUPS)
        ? window.CLASS_GROUPS
        : (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS)
          ? CLASS_GROUPS
          : (typeof window.CLASS_GROUPS_DATA !== 'undefined' && window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroups)
            ? window.CLASS_GROUPS_DATA.classGroups
            : null;

      if ((!meta || Object.keys(meta).length === 0) && (!rawGroups || Object.keys(rawGroups).length === 0)) {
        if (window.Desktop && typeof Desktop.readText === 'function') {
          try {
            const res = await Desktop.readText('user', 'class-groups.js');
            if (res && res.ok && res.content) {
              try {
                const fn = new Function('window', res.content + '\nif (typeof CLASS_GROUPS !== "undefined") window.CLASS_GROUPS = CLASS_GROUPS;\nif (typeof CLASS_GROUPS_META !== "undefined") window.CLASS_GROUPS_META = CLASS_GROUPS_META;\nif (typeof CLASS_GROUPS_DATA !== "undefined") window.CLASS_GROUPS_DATA = CLASS_GROUPS_DATA;');
                fn(window);
                if (window.CLASS_GROUPS_META) meta = window.CLASS_GROUPS_META;
                if (window.CLASS_GROUPS) rawGroups = window.CLASS_GROUPS;
              } catch (_) {}
            }
          } catch (_) {}
        }
      }

      pillsEl.innerHTML = '';

      let groupKeys = meta
        ? Object.keys(meta).filter(key => !(meta[key] && meta[key].archived))
        : [];
      if (groupKeys.length === 0 && rawGroups) {
        groupKeys = Object.keys(rawGroups).filter(key => !(rawGroups[key] && rawGroups[key].archived));
      }
      groupKeys.sort((a, b) => _cgDisplayName(a).localeCompare(_cgDisplayName(b)));

      const nonePill = document.createElement('li');
      nonePill.className = 'con-class-pill none-pill';
      nonePill.textContent = '–';
      nonePill.title = typeof t === 'function' ? t('conClassNoFilter', 'All classes (no filter)') : 'All classes (no filter)';
      nonePill.dataset.group = '';
      nonePill.addEventListener('click', () => { setActiveClassGroup(''); conCloseClassDropdown(); });
      pillsEl.appendChild(nonePill);

      groupKeys.forEach(key => {
        const pill = document.createElement('li');
        pill.className = 'con-class-pill';
        const displayName = _cgDisplayName(key);
        let count = 0;
        if (meta && meta[key] && Array.isArray(meta[key].students)) {
          count = meta[key].students.length;
        } else if (rawGroups && Array.isArray(rawGroups[key])) {
          count = rawGroups[key].length;
        }
        pill.textContent = displayName;
        pill.title = displayName + (count ? ' (' + count + ' students)' : '');
        pill.dataset.group = key;
        pill.addEventListener('click', () => { setActiveClassGroup(key); conCloseClassDropdown(); });
        pillsEl.appendChild(pill);
      });

      let saved = '';
      try { saved = sessionStorage.getItem(CLASS_GROUP_STORAGE_KEY) || ''; } catch (e) { }
      setActiveClassGroup(saved, { preserveBoardState: true });
      conUpdateClassDropdownButton();
    }

    // ================================================================
    // PLANNER TIMESLOT PICKER  (bp = board-planner)
    // ================================================================

    function bpGetAllEntries() {
      const seen = new Set(); // 'date|classId' keys — avoids duplicates between entries and schedule slots
      const items = [];

      // 1. Real planner entries
      const byClass = window.PLANNER_ENTRIES_BY_CLASS || {};
      Object.keys(byClass).forEach(cid => {
        const arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
        arr.forEach(e => {
          if (e && e.id && e.date) {
            items.push(e);
            seen.add(e.date + '|' + (e.classId || '') + '|' + (e.time || ''));
          }
        });
      });

      // 2. Schedule-derived slots from PLANNER_CONFIG
      const cfg = window.PLANNER_CONFIG;
      if (cfg && cfg.classes) {
        // Collect all holiday dates across semesters
        const holDates = new Set();
        (cfg.semesters || []).forEach(sem => {
          (sem.holidays || []).forEach(h => {
            if (!h.date) return;
            let hd = new Date(h.date + 'T12:00:00');
            const he = h.dateTo ? new Date(h.dateTo + 'T12:00:00') : new Date(hd);
            while (hd <= he) { holDates.add(hd.toISOString().slice(0, 10)); hd.setDate(hd.getDate() + 1); }
          });
        });

        // Pick a date range: current or nearest semester, fallback ±90 days
        const today = new Date().toISOString().slice(0, 10);
        let rangeStart = null, rangeEnd = null;
        if (cfg.semesters && cfg.semesters.length) {
          let bestDist = Infinity;
          cfg.semesters.forEach(sem => {
            if (!sem.semesterStart || !sem.semesterEnd) return;
            if (today >= sem.semesterStart && today <= sem.semesterEnd) {
              rangeStart = sem.semesterStart; rangeEnd = sem.semesterEnd; bestDist = 0;
            } else if (bestDist > 0) {
              const dist = Math.min(
                Math.abs(new Date(sem.semesterStart + 'T12:00:00') - new Date(today + 'T12:00:00')),
                Math.abs(new Date(sem.semesterEnd + 'T12:00:00') - new Date(today + 'T12:00:00'))
              );
              if (dist < bestDist) { bestDist = dist; rangeStart = sem.semesterStart; rangeEnd = sem.semesterEnd; }
            }
          });
        }
        if (!rangeStart) {
          const d0 = new Date(today + 'T12:00:00'); d0.setDate(d0.getDate() - 90);
          const d1 = new Date(today + 'T12:00:00'); d1.setDate(d1.getDate() + 90);
          rangeStart = d0.toISOString().slice(0, 10);
          rangeEnd = d1.toISOString().slice(0, 10);
        }

        // Walk the range day-by-day and emit one slot per matching schedule entry
        Object.keys(cfg.classes).forEach(classId => {
          const schedule = (cfg.classes[classId] && Array.isArray(cfg.classes[classId].schedule))
            ? cfg.classes[classId].schedule : [];
          if (!schedule.length) return;
          let d = new Date(rangeStart + 'T12:00:00');
          const end = new Date(rangeEnd + 'T12:00:00');
          while (d <= end) {
            const ds = d.toISOString().slice(0, 10);
            const dow = d.getDay();
            if (!holDates.has(ds)) {
              schedule.forEach(s => {
                if (parseInt(s.day) !== dow) return;
                const key = ds + '|' + classId + '|' + (s.time || '');
                if (!seen.has(key)) {
                  items.push({
                    id: 'sched:' + classId + ':' + ds + ':' + (s.time || ''),
                    classId,
                    date: ds,
                    time: s.time || '',
                    timeEnd: s.timeEnd || '',
                    _isScheduleSlot: true
                  });
                  seen.add(key);
                }
              });
            }
            d.setDate(d.getDate() + 1);
          }
        });
      }

      items.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? 1 : -1;
        return (a.time || '') > (b.time || '') ? 1 : -1;
      });
      return items;
    }

    function bpGetLocalDateStr() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function bpGetNearEntries(all) {
      const todayStr = bpGetLocalDateStr();
      const todayTs = new Date(todayStr + 'T12:00:00').getTime();
      const limit = 30 * 86400000;
      const near = all.filter(e => Math.abs(new Date(e.date + 'T12:00:00').getTime() - todayTs) <= limit);
      return near;
    }

    function bpFmtDate(dateStr) {
      try {
        const loc = typeof getLocale === 'function' ? getLocale() : ((typeof getLang === 'function' && { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' }[getLang()]) || 'fr-FR');
        return new Date(dateStr + 'T12:00:00').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
      }
      catch (e) { return dateStr; }
    }

    function bpClassDisplayName(classId) {
      const id = String(classId || '').trim();
      if (!id) return '—';
      try {
        const fromGroups = _cgDisplayName(id);
        if (fromGroups && fromGroups !== id) return fromGroups;
      } catch (e) { }
      try {
        const cfg = window.PLANNER_CONFIG;
        const cls = cfg && cfg.classes && cfg.classes[id];
        if (cls && cls.name) return String(cls.name);
      } catch (e) { }
      return id;
    }

    function bpBuildLabel(e) {
      const cls = bpClassDisplayName(e.classId);
      const dt = bpFmtDate(e.date);
      const time = e.time ? ' ' + e.time + (e.timeEnd ? '–' + e.timeEnd : '') : '';
      const topic = e.topic ? ' · ' + e.topic : '';
      return cls + ' · ' + dt + time + topic;
    }

    function conPlannerSlotBaseName(e) {
      if (!e) return 'planner-entry';
      const bits = [];
      if (e.date) bits.push(String(e.date));
      if (e.classId) bits.push(bpClassDisplayName(e.classId));
      if (e.time) bits.push(String(e.time).replace(/:/g, '-'));
      if (e.topic) bits.push(String(e.topic).trim());
      const base = bits
        .filter(Boolean)
        .join(' - ')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return base || 'planner-entry';
    }

    async function conRenameCurrentBundleToPlannerSlot(e) {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameByPath === 'function')) return false;
      if (!_conCurrentFileName) return false;

      const oldFilename = _conCurrentFileName;
      const extMatch = String(oldFilename).match(/\.(cstz|js|json|zip)$/i);
      const ext = extMatch ? extMatch[0] : '.cstz';
      const cleanBase = conPlannerSlotBaseName(e);
      let nextFilename = cleanBase + ext;
      if (nextFilename === oldFilename) return true;

      const hasFolder = !!_conCurrentFolderName;
      let targetFolder = cleanBase;

      if (typeof Desktop.statByPath === 'function') {
        try {
          const checkTarget = hasFolder ? targetFolder : nextFilename;
          const stat = await Desktop.statByPath('mindmaps', checkTarget);
          if (stat && stat.ok && stat.exists) {
            let i = 2;
            while (i < 1000) {
              const testBase = `${cleanBase} (${i})`;
              const testFilename = testBase + ext;
              const testTarget = hasFolder ? testBase : testFilename;
              const s = await Desktop.statByPath('mindmaps', testTarget);
              if (!s || !s.ok || !s.exists) {
                targetFolder = testBase;
                nextFilename = testFilename;
                break;
              }
              i++;
            }
          }
        } catch (_) { }
      }

      if (nextFilename === oldFilename) return true;

      const oldFolder = _conCurrentFolderName || boardStripJsonExt(oldFilename);
      const newFolder = targetFolder;

      try {
        if (hasFolder) {
          if (oldFolder && oldFolder !== newFolder) {
            const rFolder = await Desktop.renameByPath('mindmaps', oldFolder, newFolder);
            if (rFolder && rFolder.ok === false) {
              throw new Error(rFolder.error || 'Could not rename folder');
            }
          }
          if (oldFilename !== nextFilename) {
            const innerFrom = (newFolder || oldFolder) + '/' + oldFilename;
            const innerTo = (newFolder || oldFolder) + '/' + nextFilename;
            await Desktop.renameByPath('mindmaps', innerFrom, innerTo).catch(() => { });
          }

          if (typeof Desktop.listByPath === 'function') {
            const oldBase = boardStripJsonExt(oldFilename);
            const newBase = targetFolder;
            if (oldBase !== newBase) {
              const histPath = newFolder + '/history';
              try {
                const listed = await Desktop.listByPath('mindmaps', histPath, { extensions: ['.js', '.json', '.cstz', '.zip'], recursive: false });
                const vFiles = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
                for (const vf of vFiles) {
                  const vfname = (vf.relativePath || '').split('/').pop() || vf.filename || '';
                  if (vfname.startsWith(oldBase + '.v')) {
                    const suffix = vfname.slice(oldBase.length);
                    await Desktop.renameByPath('mindmaps', histPath + '/' + vfname, histPath + '/' + newBase + suffix).catch(() => { });
                  }
                }
              } catch (e) { }
            }
          }
          _conCurrentFolderName = newFolder;
        } else {
          const res = await Desktop.renameByPath('mindmaps', oldFilename, nextFilename);
          if (res && res.ok === false) {
            throw new Error(res.error || 'Could not rename file');
          }
          _conCurrentFolderName = null;
        }

        const oldFileValue = _conCurrentFileName;
        _conCurrentFileName = global._conCurrentFileName = nextFilename;

        try {
          const store = boardReadStore();
          const list = store['constellation'] || [];
          list.forEach(item => {
            if (item.name === oldFileValue) {
              item.name = nextFilename;
            }
          });
          boardWriteStoreWithFallback(store);
        } catch (e) { }

        // Save the updated session data with the new planner link and class group into the new file
        try {
          const currentData = conBuildSessionData();
          const persistedData = boardBuildPersistedSessionData('constellation', currentData);
          persistedData._plannerEntryId = activePlannerEntryId;
          persistedData._classGroup = activeClassGroup;
          await conSaveSessionFolderBundle(nextFilename, persistedData);
          boardPersistLocalSession('constellation', persistedData, { source: 'manual-save', name: nextFilename, classGroup: activeClassGroup });
          boardSetAutosaveFingerprint('constellation', persistedData);
        } catch (e) {
          console.warn('Post-rename session save error:', e);
        }

        if (window.conSetTitle) window.conSetTitle(newFolder);
        const titleEl = document.getElementById('con-title-input');
        if (titleEl) titleEl.value = newFolder;
        if (typeof historyUpdateRenamedEntry === 'function') {
          historyUpdateRenamedEntry('mindmaps', oldFileValue, nextFilename, newFolder ? (newFolder + '/' + nextFilename) : nextFilename);
        } else if (typeof historyRenderList === 'function') {
          historyRenderList();
        }
        conUpdateRenameButtonVisibility();
        mdbToast('✅ Renamed to slot: ' + nextFilename);
        return true;
      } catch (error) {
        console.error('conRenameCurrentBundleToPlannerSlot error:', error);
        mdbToast('⚠️ Linked, but could not rename file to slot name.');
        return false;
      }
    }

    function conUpdateRenameButtonVisibility() {
      const btn = document.getElementById('con-rename-file-btn');
      if (!btn) return;
      if (!(window.Desktop && Desktop.isElectron() && _conCurrentFileName)) {
        btn.style.display = 'none';
        return;
      }
      const input = document.getElementById('con-title-input');
      if (!input) return;
      const currentTitle = (input.value || '').trim();
      const currentFileBase = boardStripJsonExt(_conCurrentFileName);

      const cleanTitle = currentTitle.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
      const cleanFileBase = currentFileBase.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();

      if (cleanTitle && cleanTitle !== cleanFileBase) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    }

    async function conRenameCurrentFileFromInput() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.renameByPath === 'function')) {
        mdbToast('⚠️ Rename file is only supported in the Electron desktop app.');
        return;
      }
      if (!_conCurrentFileName) {
        mdbToast('⚠️ No saved file to rename.');
        return;
      }
      const input = document.getElementById('con-title-input');
      if (!input) return;
      const rawName = String(input.value || '').trim();
      if (!rawName) {
        mdbToast('⚠️ Title cannot be empty.');
        input.focus();
        return;
      }

      const cleanBase = rawName
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleanBase) {
        mdbToast('⚠️ Invalid characters in title.');
        return;
      }

      const oldFilename = _conCurrentFileName;
      const extMatch = String(oldFilename).match(/\.(cstz|js|json|zip)$/i);
      const ext = extMatch ? extMatch[0] : '.cstz';
      const nextFilename = cleanBase + ext;
      if (nextFilename === oldFilename) {
        conUpdateRenameButtonVisibility();
        return;
      }

      const hasFolder = !!_conCurrentFolderName;
      const oldFolder = _conCurrentFolderName || boardStripJsonExt(oldFilename);
      const newFolder = cleanBase;

      try {
        if (hasFolder) {
          if (oldFolder && oldFolder !== newFolder) {
            const rFolder = await Desktop.renameByPath('mindmaps', oldFolder, newFolder);
            if (rFolder && rFolder.ok === false) {
              throw new Error(rFolder.error || 'Could not rename folder');
            }
          }
          if (oldFilename !== nextFilename) {
            const innerFrom = (newFolder || oldFolder) + '/' + oldFilename;
            const innerTo = (newFolder || oldFolder) + '/' + nextFilename;
            await Desktop.renameByPath('mindmaps', innerFrom, innerTo).catch(() => { });
          }

          if (typeof Desktop.listByPath === 'function') {
            const oldBase = boardStripJsonExt(oldFilename);
            const newBase = cleanBase;
            if (oldBase !== newBase) {
              const histPath = newFolder + '/history';
              try {
                const listed = await Desktop.listByPath('mindmaps', histPath, { extensions: ['.js', '.json', '.cstz', '.zip'], recursive: false });
                const vFiles = (listed && listed.ok && Array.isArray(listed.files)) ? listed.files : [];
                for (const vf of vFiles) {
                  const vfname = (vf.relativePath || '').split('/').pop() || vf.filename || '';
                  if (vfname.startsWith(oldBase + '.v')) {
                    const suffix = vfname.slice(oldBase.length);
                    await Desktop.renameByPath('mindmaps', histPath + '/' + vfname, histPath + '/' + newBase + suffix).catch(() => { });
                  }
                }
              } catch (e) { }
            }
          }
          _conCurrentFolderName = newFolder;
        } else {
          const res = await Desktop.renameByPath('mindmaps', oldFilename, nextFilename);
          if (res && res.ok === false) {
            throw new Error(res.error || 'Could not rename file');
          }
          _conCurrentFolderName = null;
        }

        const oldFileValue = _conCurrentFileName;
        _conCurrentFileName = global._conCurrentFileName = nextFilename;

        try {
          const store = boardReadStore();
          const list = store['constellation'] || [];
          list.forEach(e => {
            if (e.name === oldFileValue) {
              e.name = nextFilename;
            }
          });
          boardWriteStoreWithFallback(store);
        } catch (e) { }

        if (window.conSetTitle) window.conSetTitle(newFolder);
        if (input) input.value = newFolder;
        if (typeof historyUpdateRenamedEntry === 'function') {
          historyUpdateRenamedEntry('mindmaps', oldFileValue, nextFilename, newFolder ? (newFolder + '/' + nextFilename) : nextFilename);
        } else if (typeof historyRenderList === 'function') {
          historyRenderList();
        }
        conUpdateRenameButtonVisibility();
        mdbToast('✅ File renamed to: ' + cleanBase);
      } catch (error) {
        console.error('Rename failed:', error);
        mdbToast('⚠️ Could not rename file: ' + (error && error.message ? error.message : String(error)));
      }
    }

    function bpOpen() {
      const pop = document.getElementById('con-bp-popover');
      if (!pop) return;
      if (typeof conCloseClassDropdown === 'function') conCloseClassDropdown();
      if (pop.style.display !== 'none') { bpClose(); return; }

      const all = bpGetAllEntries();
      const near = bpGetNearEntries(all);
      const todayStr = bpGetLocalDateStr();

      const upcoming = near.filter(e => e.date >= todayStr);
      upcoming.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? 1 : -1;
        return (a.time || '') > (b.time || '') ? 1 : -1;
      });

      const past = near.filter(e => e.date < todayStr);
      past.sort((a, b) => {
        if (a.date !== b.date) return b.date > a.date ? 1 : -1;
        return (b.time || '') > (a.time || '') ? 1 : -1;
      });

      const listEl = document.getElementById('con-bp-pop-list');
      const titleEl = document.getElementById('con-bp-pop-title');
      const showAllBtn = document.getElementById('con-bp-show-all-btn');
      const clearBtn = document.getElementById('con-bp-clear-btn');
      if (titleEl) titleEl.textContent = t('bpPopTitle');
      if (showAllBtn) showAllBtn.textContent = t('bpShowAll');
      if (clearBtn) clearBtn.textContent = t('bpClear');

      listEl.innerHTML = '';
      if (!upcoming.length && !past.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:0.75rem;color:#888;padding:4px 0;';
        empty.textContent = t('bpNoNear');
        listEl.appendChild(empty);
      } else {
        upcoming.slice(0, 10).forEach(e => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'action-btn btn-grey';
          btn.style.cssText = 'font-size:0.72rem;text-align:left;white-space:normal;line-height:1.35;padding:4px 8px;width:100%;margin-bottom:3px;'
            + (e.id === activePlannerEntryId ? 'border-color:#111;font-weight:900;' : '');
          btn.textContent = bpBuildLabel(e);
          btn.addEventListener('click', () => { bpClose(); bpSelect(e); });
          listEl.appendChild(btn);
        });

        if (past.length > 0) {
          const pastWrap = document.createElement('div');
          pastWrap.style.cssText = 'border-top:1px dashed #ccc;margin-top:5px;padding-top:4px;';

          const pastToggle = document.createElement('button');
          pastToggle.type = 'button';
          pastToggle.className = 'action-btn btn-grey';
          pastToggle.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;font-size:0.7rem;font-weight:700;color:#666;padding:4px 6px;margin-bottom:3px;';

          const pastLabel = document.createElement('span');
          pastLabel.style.cssText = 'display:flex;align-items:center;gap:5px;';
          const pastChevron = document.createElement('span');
          pastChevron.style.cssText = 'display:inline-block;width:10px;text-align:center;font-size:0.65rem;';
          pastLabel.appendChild(pastChevron);
          pastLabel.appendChild(document.createTextNode((t('bpPastSlots') || 'Past slots') + ' (' + past.length + ')'));
          pastToggle.appendChild(pastLabel);

          const pastList = document.createElement('div');
          pastList.style.cssText = 'display:none;padding-top:2px;';

          past.slice(0, 15).forEach(e => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'action-btn btn-grey';
            btn.style.cssText = 'font-size:0.72rem;text-align:left;white-space:normal;line-height:1.35;padding:4px 8px;width:100%;margin-bottom:3px;'
              + (e.id === activePlannerEntryId ? 'border-color:#111;font-weight:900;' : '');
            btn.textContent = bpBuildLabel(e);
            btn.addEventListener('click', () => { bpClose(); bpSelect(e); });
            pastList.appendChild(btn);
          });

          const activeInPast = past.some(e => e.id === activePlannerEntryId);
          const setPastOpen = (open) => {
            pastList.style.display = open ? 'block' : 'none';
            pastChevron.textContent = open ? '▾' : '▸';
            pastToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          };
          setPastOpen(activeInPast);
          pastToggle.addEventListener('click', () => {
            const isOpen = pastList.style.display !== 'none';
            setPastOpen(!isOpen);
          });

          pastWrap.appendChild(pastToggle);
          pastWrap.appendChild(pastList);
          listEl.appendChild(pastWrap);
        }
      }

      // Show "browse all" when there are more entries outside ±30 days, or active entry not in near list
      const activeNotInNear = activePlannerEntryId && !near.find(e => e.id === activePlannerEntryId);
      if (showAllBtn) showAllBtn.style.display = (all.length > near.length || activeNotInNear) ? '' : 'none';

      pop.style.display = '';
      setTimeout(() => document.addEventListener('click', _bpOutsideClick, { once: true, capture: true }), 0);
    }

    function _bpOutsideClick(ev) {
      const wrap = document.getElementById('con-bp-wrap');
      if (wrap && wrap.contains(ev.target)) {
        const pop = document.getElementById('con-bp-popover');
        if (pop && pop.style.display !== 'none')
          setTimeout(() => document.addEventListener('click', _bpOutsideClick, { once: true, capture: true }), 0);
      } else {
        bpClose();
      }
    }

    function bpClose() {
      const pop = document.getElementById('con-bp-popover');
      if (pop) pop.style.display = 'none';
      document.removeEventListener('click', _bpOutsideClick, true);
    }

    async function bpSelect(e) {
      activePlannerEntryId = e.id || '';
      if (e.classId) setActiveClassGroup(e.classId);
      bpUpdateBtn();

      // Format title using planner naming convention: yyyy-mm-dd - Class - HH-MM - Topic
      const slotTitle = conPlannerSlotBaseName(e);

      // Auto-fill title when empty, default timestamp, or previous auto title
      const titleInput = document.getElementById('con-title-input');
      const curTitle = titleInput ? (titleInput.value || '').trim() : '';
      const isAutoTitle = !curTitle
        || /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(curTitle)
        || curTitle.toLowerCase() === 'constellation'
        || curTitle.includes('·');

      if (titleInput && isAutoTitle) {
        titleInput.value = slotTitle;
        if (window.conSetTitle) conSetTitle(slotTitle);
      }

      const curFileName = _conCurrentFileName || '';
      const isAutoFile = !curFileName
        || /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?(\.(cstz|js|json|zip))?$/i.test(curFileName)
        || /^(constellation)(\.(cstz|js|json|zip))?$/i.test(curFileName);

      if (_conPendingDuplicateRelinkRename || (isAutoFile && curFileName)) {
        const ok = await conRenameCurrentBundleToPlannerSlot(e);
        if (ok) _conPendingDuplicateRelinkRename = false;
      }

      // Automatic regressive links via LinksService
      if (window.LinksService && typeof window.LinksService.addLink === 'function') {
        const activeFile = _conCurrentFileName || curFileName || '';
        if (activeFile) {
          const bUrn = window.LinksService.makeUrn('board', activeFile);
          const sUrn = window.LinksService.makeUrn('planner', e.id);
          const sLabel = bpBuildLabel(e);
          const bTitle = (titleInput ? titleInput.value : '') || boardStripJsonExt(activeFile);
          window.LinksService.addLink(bUrn, sUrn, {
            relation: 'planner_slot',
            sourceMeta: { title: bTitle, filename: activeFile, target: 'mindmaps' },
            targetMeta: { title: sLabel, classId: e.classId || '', date: e.date || '', topic: e.topic || '' }
          }).catch(() => {});
          if (e.classId) {
            window.LinksService.addLink(bUrn, window.LinksService.makeUrn('class', e.classId), {
              relation: 'class_session',
              sourceMeta: { title: bTitle, filename: activeFile, target: 'mindmaps' }
            }).catch(() => {});
          }
        }
      }

      // Persist timeslot linking even when board content itself is unchanged.
      if (typeof boardAutosaveAllNow === 'function') {
        boardAutosaveAllNow({ force: true });
      }
    }

    function bpClear() {
      bpClose();
      activePlannerEntryId = '';
      bpUpdateBtn();

      // Persist unlink so planner badges do not remain stale.
      if (typeof boardAutosaveAllNow === 'function') {
        boardAutosaveAllNow({ force: true });
      }
    }

    function bpUpdateBtn() {
      const btn = document.getElementById('con-bp-btn');
      if (!btn) return;
      const iconHtml = '<img src="../assets/icons/planner.svg" class="btn-icon" alt="" />';
      if (!activePlannerEntryId) {
        btn.innerHTML = iconHtml + ' ' + t('bpBtn');
        btn.title = t('bpPopTitle');
        btn.style.fontWeight = '';
        btn.style.borderColor = '';
        return;
      }
      const entry = bpGetAllEntries().find(e => e.id === activePlannerEntryId);
      if (!entry) {
        btn.innerHTML = iconHtml + ' ' + t('bpBtn') + ' ✓';
        btn.style.fontWeight = '900';
        btn.style.borderColor = '#111';
        return;
      }
      const label = bpBuildLabel(entry);
      btn.innerHTML = iconHtml + ' ' + (label.length > 48 ? label.slice(0, 47) + '…' : label);
      btn.title = t('bpPopTitle') + ': ' + label;
      btn.style.fontWeight = '900';
      btn.style.borderColor = '#111';
    }

    function bpSetFromEntryId(entryId) {
      activePlannerEntryId = entryId || '';
      bpUpdateBtn();
      if (entryId && window.LinksService && typeof window.LinksService.addLink === 'function') {
        const curFile = _conCurrentFileName || '';
        if (curFile) {
          const bUrn = window.LinksService.makeUrn('board', curFile);
          const sUrn = window.LinksService.makeUrn('planner', entryId);
          window.LinksService.addLink(bUrn, sUrn, {
            relation: 'planner_slot'
          }).catch(() => {});
        }
      }
    }

    function bpShowAll() {
      bpClose();
      const all = bpGetAllEntries();
      const todayStr = bpGetLocalDateStr();
      const overlay = document.getElementById('con-bp-all-overlay');
      const listEl = document.getElementById('con-bp-all-list');
      if (!overlay || !listEl) return;
      document.getElementById('con-bp-all-title').textContent = t('bpAllTitle');
      document.getElementById('con-bp-all-close-btn').textContent = t('btnClose');
      listEl.innerHTML = '';

      if (!all.length) {
        listEl.innerHTML = '<div style="color:#888;font-size:0.8rem;padding:8px 0;">' + boardEscapeHtml(t('bpNoNear')) + '</div>';
      } else {
        const byClass = {};
        all.forEach(e => {
          const cid = e.classId || '—';
          if (!byClass[cid]) byClass[cid] = [];
          byClass[cid].push(e);
        });
        const sortedCids = Object.keys(byClass).sort((a, b) => bpClassDisplayName(a).localeCompare(bpClassDisplayName(b)));
        const activeEntry = activePlannerEntryId ? all.find(e => e.id === activePlannerEntryId) : null;
        const activeCid = activeEntry ? (activeEntry.classId || '—') : '';
        sortedCids.forEach((cid, idx) => {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'border-top:1px solid #eee;margin-top:4px;padding-top:4px;';

          const head = document.createElement('button');
          head.type = 'button';
          head.className = 'action-btn btn-grey';
          head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;font-weight:900;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;color:#555;padding:6px 8px;';

          const label = document.createElement('span');
          label.textContent = bpClassDisplayName(cid);
          const count = document.createElement('span');
          count.style.cssText = 'font-size:0.66rem;font-weight:700;color:#888;letter-spacing:0;text-transform:none;';
          count.textContent = '(' + byClass[cid].length + ')';

          const left = document.createElement('span');
          left.style.cssText = 'display:flex;align-items:center;gap:7px;min-width:0;';
          const chevron = document.createElement('span');
          chevron.style.cssText = 'display:inline-block;width:10px;text-align:center;font-size:0.7rem;';
          left.appendChild(chevron);
          left.appendChild(label);

          head.appendChild(left);
          head.appendChild(count);

          const group = document.createElement('div');
          group.style.cssText = 'padding:4px 0 2px 0;';

          const upcoming = byClass[cid].filter(e => e.date >= todayStr);
          upcoming.sort((a, b) => {
            if (a.date !== b.date) return a.date > b.date ? 1 : -1;
            return (a.time || '') > (b.time || '') ? 1 : -1;
          });

          const past = byClass[cid].filter(e => e.date < todayStr);
          past.sort((a, b) => {
            if (a.date !== b.date) return b.date > a.date ? 1 : -1;
            return (b.time || '') > (a.time || '') ? 1 : -1;
          });

          upcoming.forEach(e => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'action-btn btn-grey';
            btn.style.cssText = 'font-size:0.72rem;text-align:left;white-space:normal;line-height:1.35;padding:4px 8px;width:100%;margin-bottom:3px;'
              + (e.id === activePlannerEntryId ? 'border-color:#111;font-weight:900;' : '');
            const dt = bpFmtDate(e.date);
            const time = e.time ? ' ' + e.time + (e.timeEnd ? '–' + e.timeEnd : '') : '';
            const topic = e.topic ? ' · ' + e.topic : '';
            btn.textContent = dt + time + topic;
            btn.addEventListener('click', () => { bpSelect(e); bpAllClose(); });
            group.appendChild(btn);
          });

          let activeInPast = false;
          if (past.length > 0) {
            const pastWrap = document.createElement('div');
            pastWrap.style.cssText = 'border-top:1px dashed #ccc;margin-top:4px;padding-top:4px;';

            const pastToggle = document.createElement('button');
            pastToggle.type = 'button';
            pastToggle.className = 'action-btn btn-grey';
            pastToggle.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;font-size:0.68rem;font-weight:700;color:#666;padding:3px 6px;margin-bottom:3px;';

            const pastLabel = document.createElement('span');
            pastLabel.style.cssText = 'display:flex;align-items:center;gap:5px;';
            const pastChevron = document.createElement('span');
            pastChevron.style.cssText = 'display:inline-block;width:10px;text-align:center;font-size:0.65rem;';
            pastLabel.appendChild(pastChevron);
            pastLabel.appendChild(document.createTextNode((t('bpPastSlots') || 'Past slots') + ' (' + past.length + ')'));
            pastToggle.appendChild(pastLabel);

            const pastList = document.createElement('div');
            pastList.style.cssText = 'display:none;padding-top:2px;';

            past.forEach(e => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'action-btn btn-grey';
              btn.style.cssText = 'font-size:0.72rem;text-align:left;white-space:normal;line-height:1.35;padding:4px 8px;width:100%;margin-bottom:3px;'
                + (e.id === activePlannerEntryId ? 'border-color:#111;font-weight:900;' : '');
              const dt = bpFmtDate(e.date);
              const time = e.time ? ' ' + e.time + (e.timeEnd ? '–' + e.timeEnd : '') : '';
              const topic = e.topic ? ' · ' + e.topic : '';
              btn.textContent = dt + time + topic;
              btn.addEventListener('click', () => { bpSelect(e); bpAllClose(); });
              pastList.appendChild(btn);
            });

            activeInPast = past.some(e => e.id === activePlannerEntryId);
            const setPastOpen = (open) => {
              pastList.style.display = open ? 'block' : 'none';
              pastChevron.textContent = open ? '▾' : '▸';
              pastToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            };
            setPastOpen(activeInPast);
            pastToggle.addEventListener('click', () => {
              const isOpen = pastList.style.display !== 'none';
              setPastOpen(!isOpen);
            });

            pastWrap.appendChild(pastToggle);
            pastWrap.appendChild(pastList);
            group.appendChild(pastWrap);
          }

          const shouldOpen = (cid === activeCid);
          const setOpen = (open) => {
            group.style.display = open ? '' : 'none';
            chevron.textContent = open ? '▾' : '▸';
            head.setAttribute('aria-expanded', open ? 'true' : 'false');
          };
          setOpen(shouldOpen);
          head.addEventListener('click', () => {
            const isOpen = group.style.display !== 'none';
            setOpen(!isOpen);
          });

          wrap.appendChild(head);
          wrap.appendChild(group);
          listEl.appendChild(wrap);
        });
      }
      overlay.style.display = 'flex';
    }

    function bpAllClose() {
      const overlay = document.getElementById('con-bp-all-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    // ================================================================
    // EXPORT — WORD LIST (CSV + JSON)
    // ================================================================

    function exportTimestamp() {
      const d = new Date();
      return d.getFullYear()
        + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0');
    }

    function conMakeTimestampTitle() {
      const d = new Date();
      return d.getFullYear()
        + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0')
        + ' ' + String(d.getHours()).padStart(2, '0')
        + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    global.conMakeTimestampTitle = window.conMakeTimestampTitle = conMakeTimestampTitle;

    function exportWordListCSV() {
      const words = getFilteredBank().sort((a, b) => a.word.localeCompare(b.word));
      const rows = [['Word', 'IPA', 'Part of Speech', 'Level', 'Theme', 'French', 'Definition', 'Example Sentence']];
      words.forEach(w => {
        rows.push([
          w.word, w.ipa || '', w.partOfSpeech || '', w.level || '', getItemThemes(w).join(', '),
          w.french || '', _allVals(w.definition).join(' / ').replace(/"/g, '""'), _allVals(w.exampleSentence).join(' / ').replace(/"/g, '""')
        ]);
      });
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      downloadFile(`vocabulary_list_${exportTimestamp()}.csv`, csv, 'text/csv');
    }

    function exportWordListTXT() {
      const words = getFilteredBank().sort((a, b) => a.word.localeCompare(b.word));
      const payload = words.map(w => ({
        word: w.word,
        ipa: w.ipa || '',
        partOfSpeech: w.partOfSpeech || '',
        level: w.level || '',
        theme: getItemThemes(w),
        french: w.french || '',
        definition: _allVals(w.definition),
        exampleSentence: _allVals(w.exampleSentence),
        synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
        antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
        otherForms: Array.isArray(w.otherForms) ? w.otherForms : []
      }));
      const ts = exportTimestamp();
      downloadFile(`vocabulary_list_${ts}.json`, JSON.stringify(payload, null, 2), 'application/json');
    }

    function downloadFile(filename, content, mimeType) {
      if (window.Desktop && Desktop.isElectron()) {
        const ext = filename.split('.').pop();
        const filterName = ext.toUpperCase() + ' Files';
        Desktop.saveToDisk({
          title: 'Save File',
          defaultPath: filename,
          filters: [{ name: filterName, extensions: [ext] }],
          content: content,
          encoding: 'utf8'
        }).then(result => {
          if (result && result.ok) {
            if (window.showExportSuccessPopup) showExportSuccessPopup(result.path, filename);
          } else if (result && !result.ok && !result.canceled) {
            if (typeof mdbToast === 'function') mdbToast('⚠️ Save failed: ' + (result.error || 'unknown'));
            else showToast('Save failed: ' + (result.error || 'unknown'), true);
          }
        });
      } else {
        const bom = mimeType.includes("csv") ? new Uint8Array([0xEF, 0xBB, 0xBF]) : new Uint8Array();
        const blob = new Blob([bom, content], { type: mimeType + ";charset=utf-8" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    }

    // ================================================================
    // END SYNONYMS & ANTONYMS GAME
    // ================================================================

    // ================================================================
    // TIMER SYSTEM
    // ================================================================
    const timerCfg = { grace: 60, points: 3, interval: 30 };
    let timerState = {
      running: false,
      paused: false,
      elapsed: 0,       // seconds since timer started
      tickId: null,     // setInterval id for the 1s tick
      deductId: null,   // setInterval id for point deductions
      graceId: null,    // setTimeout id for the grace period
    };

    function timerOpenSettings() {
      // Pre-fill with current config
      document.getElementById('timer-grace').value = timerCfg.grace;
      document.getElementById('timer-points').value = timerCfg.points;
      document.getElementById('timer-interval').value = timerCfg.interval;
      document.getElementById('timer-settings-overlay').classList.add('active');
    }

    function timerCloseSettings() {
      document.getElementById('timer-settings-overlay').classList.remove('active');
    }

    function timerSaveAndStart() {
      const grace = parseInt(document.getElementById('timer-grace').value) || 60;
      const points = parseInt(document.getElementById('timer-points').value) || 3;
      const interval = parseInt(document.getElementById('timer-interval').value) || 30;
      timerCfg.grace = Math.max(0, grace);
      timerCfg.points = Math.max(1, points);
      timerCfg.interval = Math.max(5, interval);
      timerCloseSettings();
      timerStop();   // stop any existing timer
      timerStart();
    }

    function timerStart() {
      timerState.running = true;
      timerState.paused = false;
      timerState.elapsed = 0;
      timerUpdateUI();

      // Show UI elements
      document.getElementById('timer-bar-container').classList.add('visible');
      document.getElementById('timer-display').classList.add('visible');

      // 1-second tick for display updates
      timerState.tickId = setInterval(() => {
        timerState.elapsed++;
        timerUpdateUI();
      }, 1000);

      // Point deduction: starts after grace period
      if (timerCfg.grace > 0) {
        timerState.graceId = setTimeout(() => {
          timerState.graceId = null;
          if (!timerState.running) return;
          timerStartDeductions();
        }, timerCfg.grace * 1000);
      } else {
        timerStartDeductions();
      }

      timerUpdateButtons();
    }

    function timerStartDeductions() {
      timerState.deductId = setInterval(() => {
        if (!timerState.running) return;
        if (teams.length > 0) {
          awardPoints(-timerCfg.points);
        } else {
          // No teams — just show a toast-like notification
          timerShowPenaltyToast();
        }
      }, timerCfg.interval * 1000);
    }

    function timerShowPenaltyToast() {
      const toast = document.createElement('div');
      toast.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:12px 22px;border-radius:10px;font-size:1.2rem;font-weight:bold;color:white;background:#c85a00;box-shadow:0 4px 15px rgba(0,0,0,0.3);animation:fadeIn 0.3s;`;
      toast.textContent = `⏱ -${timerCfg.points} pts (time!)`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }

    function timerStop() {
      timerState.running = false;
      clearInterval(timerState.tickId);
      clearInterval(timerState.deductId);
      clearTimeout(timerState.graceId);
      timerState.tickId = null;
      timerState.deductId = null;
      timerState.graceId = null;
      timerState.paused = false;
      document.getElementById('timer-bar-container').classList.remove('visible');
      const disp = document.getElementById('timer-display');
      disp.classList.remove('visible', 'warning', 'danger');
      timerUpdateButtons();
    }

    function timerReset() {
      if (!timerState.running) return;
      // Cancel all pending timers
      clearInterval(timerState.tickId);
      clearInterval(timerState.deductId);
      clearTimeout(timerState.graceId);
      timerState.deductId = null;
      timerState.graceId = null;
      // Restart elapsed and ticking
      timerState.elapsed = 0;
      timerUpdateUI();
      timerState.tickId = setInterval(() => {
        timerState.elapsed++;
        timerUpdateUI();
      }, 1000);
      // Restart deductions after grace period
      if (timerCfg.grace > 0) {
        timerState.graceId = setTimeout(() => {
          timerState.graceId = null;
          if (!timerState.running) return;
          timerStartDeductions();
        }, timerCfg.grace * 1000);
      } else {
        timerStartDeductions();
      }
    }

    function timerPause() {
      if (!timerState.running || timerState.paused) return;
      timerState.paused = true;
      clearInterval(timerState.tickId);
      clearInterval(timerState.deductId);
      clearTimeout(timerState.graceId);
      timerState.tickId = null;
      timerState.deductId = null;
      timerState.graceId = null;
      // Freeze the bar visually: snap to current rendered width, no transition
      const bar = document.getElementById('timer-bar');
      if (bar) {
        const currentWidth = bar.getBoundingClientRect().width;
        const containerWidth = bar.parentElement ? bar.parentElement.getBoundingClientRect().width : 0;
        const frozenPct = containerWidth > 0 ? (currentWidth / containerWidth) * 100 : parseFloat(bar.style.width) || 100;
        bar.style.transition = 'none';
        bar.style.width = frozenPct + '%';
      }
    }

    function timerResume() {
      if (!timerState.running || !timerState.paused) return;
      timerState.paused = false;
      // Restore smooth transition
      const bar = document.getElementById('timer-bar');
      if (bar) bar.style.transition = '';
      timerState.tickId = setInterval(() => {
        timerState.elapsed++;
        timerUpdateUI();
      }, 1000);
      const remainingGrace = timerCfg.grace - timerState.elapsed;
      if (remainingGrace > 0) {
        timerState.graceId = setTimeout(() => {
          timerState.graceId = null;
          if (!timerState.running || timerState.paused) return;
          timerStartDeductions();
        }, remainingGrace * 1000);
      } else {
        timerStartDeductions();
      }
    }

    function timerUpdateUI() {
      const elapsed = timerState.elapsed;
      const grace = timerCfg.grace;
      const interval = timerCfg.interval;
      const inGrace = elapsed < grace;

      // --- Progress bar ---
      // During grace: bar depletes from 100% → 0% over grace seconds
      // After grace: bar cycles from 100% → 0% every interval seconds
      let pct;
      if (grace > 0 && inGrace) {
        pct = ((grace - elapsed) / grace) * 100;
      } else if (interval > 0) {
        const afterGrace = elapsed - grace;
        pct = 100 - ((afterGrace % interval) / interval) * 100;
      } else {
        pct = 100;
      }

      const bar = document.getElementById('timer-bar');
      bar.style.width = pct + '%';
      const isWarning = pct < 40;
      const isDanger = pct < 20;
      bar.classList.toggle('warning', isWarning && !isDanger);
      bar.classList.toggle('danger', isDanger);

      // --- Floating timer display ---
      const disp = document.getElementById('timer-display');
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      disp.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      disp.classList.toggle('warning', isWarning && !isDanger);
      disp.classList.toggle('danger', isDanger);

      // Update all visible timer buttons
      timerUpdateButtons();
    }

    function timerUpdateButtons() {
      document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.classList.remove('timer-running', 'timer-warning');
        if (timerState.running) {
          const elapsed = timerState.elapsed;
          const grace = timerCfg.grace;
          const interval = timerCfg.interval;
          const inGrace = elapsed < grace;
          let pct;
          if (grace > 0 && inGrace) {
            pct = ((grace - elapsed) / grace) * 100;
          } else if (interval > 0) {
            const afterGrace = elapsed - grace;
            pct = 100 - ((afterGrace % interval) / interval) * 100;
          } else { pct = 100; }
          btn.classList.add(pct < 30 ? 'timer-warning' : 'timer-running');
          btn.textContent = `⏱ ${Math.floor(timerState.elapsed / 60)}:${(timerState.elapsed % 60).toString().padStart(2, '0')}`;
        } else {
          btn.textContent = '⏱ Timer';
        }
      });
    }

    // Stop timer when navigating back to main menu
    const _navToOrig = navTo;
    navTo = function (sectionId) {
      if (sectionId === 'main-menu' && timerState.running) {
        timerStop();
      }
      _navToOrig(sectionId);
    };
    window.navTo = navTo;

    // ================================================================
    // END TIMER SYSTEM
    // ================================================================

    // ================================================================
    // ADD WORDS TO DATABASE
    // ================================================================

    AW_STORAGE_KEY = global.AW_STORAGE_KEY || 'custom_words';
    AW_QUOTES_KEY = global.AW_QUOTES_KEY || 'custom_quotes';
    AW_GAP_KEY = global.AW_GAP_KEY || 'custom_gaps';
    AW_ERROR_KEY = global.AW_ERROR_KEY || 'custom_errors';

    function awGetCustomWords() { try { return JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || []; } catch { return []; } }
    function awGetCustomQuotes() { try { return JSON.parse(localStorage.getItem(AW_QUOTES_KEY)) || []; } catch { return []; } }
    function awGetCustomGaps() { try { return JSON.parse(localStorage.getItem(AW_GAP_KEY)) || []; } catch { return []; } }
    function awGetCustomErrors() { try { return JSON.parse(localStorage.getItem(AW_ERROR_KEY)) || []; } catch { return []; } }

    let _awFileSaveTimer = null;
    function _awScheduleFileSave() {
      if (!window.Desktop || !Desktop.isElectron()) return;
      clearTimeout(_awFileSaveTimer);
      _awFileSaveTimer = setTimeout(async () => {
        try {
          await Desktop.saveJson('customWordbanks', 'custom-words-backup.json', awGetCustomWords());
        } catch (e) { }
      }, 400);
    }
    function awSaveCustomWords(w) { localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(w)); _awScheduleFileSave(); }
    function awSaveCustomQuotes(q) { localStorage.setItem(AW_QUOTES_KEY, JSON.stringify(q)); }
    function awSaveCustomGaps(g) { localStorage.setItem(AW_GAP_KEY, JSON.stringify(g)); }
    function awSaveCustomErrors(e) { localStorage.setItem(AW_ERROR_KEY, JSON.stringify(e)); }

    function _conMergeFormsList(existingForms, newForms) {
      const set = new Set();
      const add = (f) => {
        if (!f) return;
        if (Array.isArray(f)) { f.forEach(add); return; }
        if (typeof f === 'string') {
          f.split(/[,;/]+/).map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
        } else if (f.word || f.form || f.term) {
          const s = String(f.word || f.form || f.term).trim();
          if (s) set.add(s);
        }
      };
      add(existingForms);
      add(newForms);
      return Array.from(set);
    }

    function awLoadCustomWords() {
      const custom = awGetCustomWords(); if (!custom.length) return;
      custom.forEach(w => {
        w._source = 'custom';
        if (!Array.isArray(w._sources)) w._sources = ['custom'];
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === w.word.toLowerCase());
        if (bi !== -1) {
          const existing = vocabBank[bi];
          if (!Array.isArray(existing._sources)) existing._sources = [existing._source || 'worddb'];
          if (!existing._sources.includes('custom')) existing._sources.push('custom');
          existing.otherForms = _conMergeFormsList(existing.otherForms, w.otherForms);
          if (w.synonyms) existing.synonyms = _conMergeFormsList(existing.synonyms, w.synonyms);
          if (w.antonyms) existing.antonyms = _conMergeFormsList(existing.antonyms, w.antonyms);
          if (w.ipa && !existing.ipa) existing.ipa = w.ipa;
          if (w.level && !existing.level) existing.level = w.level;
          if (w.translation && !existing.translation) existing.translation = w.translation;
          if (w.french && !existing.french) existing.french = w.french;
        } else {
          vocabBank.push(w);
        }
      });
    }
    let _customDbSources = [];
    let _customDbInitPromise = null;

    async function initCustomDatabases() {
      const wordIndex = new Map();
      vocabBank.forEach((w, idx) => {
        if (!w._source) w._source = 'worddb';
        if (!Array.isArray(w._sources)) w._sources = [w._source];
        if (w && w.word) wordIndex.set(String(w.word).toLowerCase(), idx);
      });
      if (!window.Desktop || !Desktop.isElectron()) return;
      try {
        const result = await Desktop.listByPath('customWordbanks', '', { extensions: ['.js'] });
        if (!result || !result.ok || !result.files || !result.files.length) return;
        for (const file of result.files) {
          const sourceIdRaw = file.filename.replace(/\.js$/i, '');
          const sourceId = /^worddb$/i.test(sourceIdRaw) ? 'worddb' : sourceIdRaw;
          if (!_customDbSources.includes(sourceId)) _customDbSources.push(sourceId);
          const content = await Desktop.readByPath('customWordbanks', file.relativePath);
          if (!content || !content.ok || !content.content) continue;
          try {
            const varMatch = content.content.match(/\b(?:const|let|var)\s+(\w+)\s*=\s*\[/);
            if (!varMatch) continue;
            const exportVar = varMatch[1];
            let words = null;
            // Attempt fast JSON.parse first
            const s = content.content.indexOf('['), e2 = content.content.lastIndexOf(']');
            if (s !== -1 && e2 > s) {
              try { words = JSON.parse(content.content.slice(s, e2 + 1)); } catch (_) {}
            }
            if (!words) {
              try {
                const fn = new Function(content.content + `\n; try { return ${exportVar}; } catch(e) { return []; }`);
                words = fn() || [];
              } catch (evalErr) {
                // If new Function blocked, fallback to script tag evaluation
                try {
                  const tempKey = '__cmt_custom_db_' + Date.now() + '_' + Math.random().toString(36).slice(2);
                  const script = document.createElement('script');
                  script.textContent = `(function(){\n${content.content}\n; try { window['${tempKey}'] = ${exportVar}; } catch(e) { window['${tempKey}'] = []; }\n})();`;
                  document.head.appendChild(script);
                  words = window[tempKey] || [];
                  delete window[tempKey];
                  script.remove();
                } catch (_) {}
              }
            }
            if (!Array.isArray(words) || !words.length) continue;
            const CHUNK_SIZE = 250;
            for (let i = 0; i < words.length; i++) {
              const w = words[i];
              if (!w || !w.word) continue;
              w._source = sourceId;
              const key = String(w.word).toLowerCase();
              const bi = wordIndex.has(key) ? wordIndex.get(key) : -1;
              if (bi !== -1) {
                const existing = vocabBank[bi];
                if (!Array.isArray(existing._sources)) existing._sources = [existing._source || 'worddb'];
                if (!existing._sources.includes(sourceId)) existing._sources.push(sourceId);

                // Union inflected forms so no forms from either database are lost
                existing.otherForms = _conMergeFormsList(existing.otherForms, w.otherForms);
                if (w.otherTerms) existing.otherTerms = _conMergeFormsList(existing.otherTerms, w.otherTerms);

                // Union synonyms and antonyms
                if (w.synonyms) existing.synonyms = _conMergeFormsList(existing.synonyms, w.synonyms);
                if (w.antonyms) existing.antonyms = _conMergeFormsList(existing.antonyms, w.antonyms);

                // Fill in missing metadata fields
                if (w.ipa && !existing.ipa) existing.ipa = w.ipa;
                if (w.level && !existing.level) existing.level = w.level;
                if (w.audio && !existing.audio) existing.audio = w.audio;
                if (w.theme && !existing.theme) existing.theme = w.theme;
                if (w.translation && !existing.translation) existing.translation = w.translation;
                if (w.french && !existing.french) existing.french = w.french;

                // Check if w has distinct definitions or distinct POS
                const getPosStr = (x) => Array.isArray(x.partOfSpeech || x.pos) ? (x.partOfSpeech || x.pos).join(',') : String(x.partOfSpeech || x.pos || '');
                const samePos = !w.partOfSpeech && !w.pos || getPosStr(w) === getPosStr(existing);

                const getDefs = (x) => {
                  const d = x.definition != null ? x.definition : x.def;
                  return Array.isArray(d) ? d.map(String) : (d ? [String(d)] : []);
                };
                const existingDefs = getDefs(existing);
                const newDefs = getDefs(w);

                // If POS differs or definitions are distinct from another database, keep w as distinct entry
                const hasDistinctDefs = newDefs.length > 0 && newDefs.some(nd => !existingDefs.some(ed => ed.trim().toLowerCase() === nd.trim().toLowerCase()));

                if (!samePos || (hasDistinctDefs && existing._source !== sourceId)) {
                  w._sources = [sourceId];
                  w.otherForms = existing.otherForms; // share unioned forms
                  vocabBank.push(w);
                } else if (hasDistinctDefs) {
                  // Append new distinct definitions to existing
                  if (!Array.isArray(existing.definition)) {
                    existing.definition = existingDefs;
                  }
                  newDefs.forEach(nd => {
                    if (!existing.definition.some(ed => String(ed).trim().toLowerCase() === nd.trim().toLowerCase())) {
                      existing.definition.push(nd);
                    }
                  });
                }
              } else {
                w._sources = [sourceId];
                vocabBank.push(w);
                wordIndex.set(key, vocabBank.length - 1);
              }

              // Yield periodically so large custom-data imports do not block startup.
              if ((i + 1) % CHUNK_SIZE === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
          } catch (e) { console.warn('Failed to load custom DB:', file.filename, e); }
        }
      } catch (e) { console.warn('Failed to list custom-data files:', e); }
    }

    function scheduleCustomDatabasesInit() {
      if (_customDbInitPromise) return _customDbInitPromise;
      _customDbInitPromise = (async () => {
        await initCustomDatabases();
        if (typeof populateAllThemeMenus === 'function') populateAllThemeMenus();
        if (typeof dictPopulateThemeFilter === 'function') dictPopulateThemeFilter();
        if (typeof conImportPopulateThemes === 'function') conImportPopulateThemes();
        if (typeof conImportPopulateSources === 'function') conImportPopulateSources();
      })();
      return _customDbInitPromise;
    }
    function awLoadCustomQuotes() {
      const custom = awGetCustomQuotes(); if (!custom.length) return;
      const origKeys = new Set(quoteBank.map(q => q.quote.toLowerCase()));
      custom.forEach(q => { if (!origKeys.has(q.quote.toLowerCase())) { quoteBank.push(q); origKeys.add(q.quote.toLowerCase()); } });
    }
    function awLoadCustomGaps() {
      const custom = awGetCustomGaps(); if (!custom.length) return;
      const origKeys = new Set(gapFillBank.map(g => g.sentence.toLowerCase()));
      custom.forEach(g => { if (!origKeys.has(g.sentence.toLowerCase())) { gapFillBank.push(g); origKeys.add(g.sentence.toLowerCase()); } });
    }
    function awLoadCustomErrors() {
      const custom = awGetCustomErrors(); if (!custom.length) return;
      const origKeys = new Set(errorBank.map(e => e.correct.toLowerCase()));
      custom.forEach(e => { if (!origKeys.has(e.correct.toLowerCase())) { errorBank.push(e); origKeys.add(e.correct.toLowerCase()); } });
    }

    function awSetTab(tab) {
      ['form', 'quote', 'gap', 'error', 'bulk'].forEach(t => {
        const tabEl = document.getElementById('aw-tab-' + t);
        const panelEl = document.getElementById('aw-panel-' + t);
        if (tabEl) tabEl.classList.toggle('active', t === tab);
        if (panelEl) panelEl.classList.toggle('hidden', t !== tab);
      });
      if (tab === 'form') awPopulateThemeDatalist();
      if (tab === 'gap') awPopulateGapGrammarDatalist();
      if (tab === 'quote') awPopulateQuoteThemeDatalist();
    }

    function awSetManageTab(sub) {
      ['words', 'quotes', 'gaps', 'errors'].forEach(s => {
        document.getElementById('aw-mt-' + s).classList.toggle('active', s === sub);
        document.getElementById('aw-manage-' + s + '-panel').style.display = s === sub ? '' : 'none';
      });
      if (sub === 'words') awRenderManageWords();
      if (sub === 'quotes') awRenderManageQuotes();
      if (sub === 'gaps') awRenderManageGaps();
      if (sub === 'errors') awRenderManageErrors();
    }

    function awPopulateThemeDatalist() {
      const dl = document.getElementById('aw-theme-list'); if (!dl) return;
      const themes = typeof vocabThemes !== 'undefined' && vocabThemes.length
        ? [...new Set(vocabThemes.flatMap(entry => Object.keys(entry)))].sort()
        : typeof vocabBank !== 'undefined'
          ? [...new Set(vocabBank.flatMap(w => { const t = w.theme; if (!t) return []; return Array.isArray(t) ? t : String(t).split(',').map(s => s.trim()).filter(Boolean); }))].sort()
          : [];
      dl.innerHTML = themes.map(t => `<option value="${t}">`).join('');
    }
    function awPopulateQuoteThemeDatalist() {
      const dl = document.getElementById('aw-quote-theme-list'); if (!dl) return;
      const themes = [...new Set(quoteBank.map(q => q.theme).filter(Boolean))].sort();
      dl.innerHTML = themes.map(t => `<option value="${t}">`).join('');
    }
    function awPopulateGapGrammarDatalist() {
      const dl = document.getElementById('aw-gap-grammar-list'); if (!dl) return;
      const types = [...new Set(gapFillBank.map(g => g.grammarType).filter(Boolean))].sort();
      dl.innerHTML = types.map(t => `<option value="${t}">`).join('');
    }

    function awSetFeedback(id, msg, type) {
      const el = document.getElementById(id); el.textContent = msg; el.className = 'aw-feedback ' + type;
      if (type === 'ok') setTimeout(() => { el.textContent = ''; el.className = 'aw-feedback'; }, 3000);
    }

    function awParseCSV(str) { return str.split(',').map(s => s.trim()).filter(Boolean); }

    // ---- WORDS ----
    function awClearForm() {
      ['aw-word', 'aw-ipa', 'aw-french', 'aw-pos', 'aw-level', 'aw-theme', 'aw-definition', 'aw-example', 'aw-synonyms', 'aw-antonyms']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-form-feedback').textContent = '';
    }

    function awFillForm(w) {
      document.getElementById('aw-word').value = w.word || '';
      document.getElementById('aw-ipa').value = w.ipa || '';
      document.getElementById('aw-french').value = w.french || '';
      document.getElementById('aw-pos').value = w.partOfSpeech || '';
      document.getElementById('aw-level').value = w.level || '';
      document.getElementById('aw-theme').value = getItemThemes(w).join(', ');
      document.getElementById('aw-definition').value = _editableStr(w.definition);
      document.getElementById('aw-example').value = _editableStr(w.exampleSentence);
      document.getElementById('aw-synonyms').value = (w.synonyms || []).join(', ');
      document.getElementById('aw-antonyms').value = (w.antonyms || []).join(', ');
    }

    let awEditIdx = -1;

    function awEditWord(idx) {
      const custom = awGetCustomWords(); const w = custom[idx]; if (!w) return;
      awEditIdx = idx; awFillForm(w);
      document.getElementById('aw-word').disabled = true;
      document.getElementById('aw-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-edit-banner').style.display = '';
      document.getElementById('aw-edit-word-name').textContent = w.word;
      document.getElementById('aw-form-feedback').textContent = '';
      awSetTab('form');
      document.getElementById('aw-word').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEdit() {
      awEditIdx = -1;
      document.getElementById('aw-word').disabled = false;
      document.getElementById('aw-submit-btn').textContent = t('addWordBtn');
      document.getElementById('aw-edit-banner').style.display = 'none';
      awClearForm();
    }

    function awSubmitForm() {
      const word = document.getElementById('aw-word').value.trim();
      const french = document.getElementById('aw-french').value.trim();
      const definition = _parseLines(document.getElementById('aw-definition').value);
      const exampleSentence = _parseLines(document.getElementById('aw-example').value);
      if (!word) { awSetFeedback('aw-form-feedback', '⚠ Word is required.', 'err'); return; }
      const themeRaw = document.getElementById('aw-theme').value.trim();
      const themeVal = themeRaw.includes(',') ? themeRaw.split(',').map(s => s.trim()).filter(Boolean) : (themeRaw || '');
      const entry = { word, ipa: document.getElementById('aw-ipa').value.trim() || '', partOfSpeech: document.getElementById('aw-pos').value || '', level: document.getElementById('aw-level').value || '', theme: themeVal, french, definition, exampleSentence, synonyms: awParseCSV(document.getElementById('aw-synonyms').value), antonyms: awParseCSV(document.getElementById('aw-antonyms').value), _custom: true };

      // Register themes in vocabThemes
      const newThemeArr = Array.isArray(themeVal) ? themeVal : (themeVal ? [themeVal] : []);
      if (typeof vocabThemes !== 'undefined' && newThemeArr.length) {
        vocabThemes.forEach(e => { for (const k of Object.keys(e)) { e[k] = e[k].filter(w => w.toLowerCase() !== word.toLowerCase()); } });
        newThemeArr.forEach(theme => {
          let found = false;
          vocabThemes.forEach(e => { if (e[theme]) { if (!e[theme].map(w => w.toLowerCase()).includes(word.toLowerCase())) e[theme].push(word); found = true; } });
          if (!found) vocabThemes.push({ [theme]: [word] });
        });
        invalidateThemeIndex();
      }

      if (awEditIdx >= 0) {
        const custom = awGetCustomWords(); const old = custom[awEditIdx];
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === old.word.toLowerCase() && v._custom);
        if (bi !== -1) vocabBank[bi] = entry; custom[awEditIdx] = entry; awSaveCustomWords(custom);
        awSetFeedback('aw-form-feedback', `✓ "${word}" updated!`, 'ok'); awCancelEdit();
      } else {
        if (vocabBank.find(v => v.word.toLowerCase() === word.toLowerCase())) { awSetFeedback('aw-form-feedback', `⚠ "${word}" already exists.`, 'err'); return; }
        vocabBank.push(entry); const custom = awGetCustomWords(); custom.push(entry); awSaveCustomWords(custom);
        awSetFeedback('aw-form-feedback', `✓ "${word}" added!`, 'ok'); awClearForm();
      }
      populateAllThemeMenus();
    }

    // ---- QUOTES ----
    let awEditQuoteIdx = -1;

    function awEditQuote(idx) {
      const custom = awGetCustomQuotes(); const q = custom[idx]; if (!q) return;
      awEditQuoteIdx = idx;
      document.getElementById('aw-quote-text').value = q.quote || '';
      document.getElementById('aw-quote-author').value = q.author || '';
      document.getElementById('aw-quote-theme').value = q.theme || '';
      document.getElementById('aw-quote-explanation').value = q.explanation || '';
      document.getElementById('aw-quote-keywords').value = (q.keywords || []).join(', ');
      document.getElementById('aw-quote-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-quote-edit-banner').style.display = '';
      document.getElementById('aw-quote-edit-author').textContent = q.author || 'quote';
      document.getElementById('aw-quote-feedback').textContent = '';
      awSetTab('quote');
      document.getElementById('aw-quote-text').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEditQuote() {
      awEditQuoteIdx = -1;
      document.getElementById('aw-quote-submit-btn').textContent = t('addQuoteBtn');
      document.getElementById('aw-quote-edit-banner').style.display = 'none';
      awClearQuote();
    }

    function awClearQuote() {
      ['aw-quote-text', 'aw-quote-author', 'aw-quote-theme', 'aw-quote-explanation', 'aw-quote-keywords']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-quote-feedback').textContent = '';
    }

    function awSubmitQuote() {
      const quote = document.getElementById('aw-quote-text').value.trim();
      const author = document.getElementById('aw-quote-author').value.trim();
      if (!quote) { awSetFeedback('aw-quote-feedback', '⚠ Quote text is required.', 'err'); return; }
      if (!author) { awSetFeedback('aw-quote-feedback', '⚠ Author is required.', 'err'); return; }
      const entry = { quote, author, theme: document.getElementById('aw-quote-theme').value.trim() || '', explanation: document.getElementById('aw-quote-explanation').value.trim() || '', keywords: awParseCSV(document.getElementById('aw-quote-keywords').value), _custom: true };
      if (awEditQuoteIdx >= 0) {
        const custom = awGetCustomQuotes(); const old = custom[awEditQuoteIdx];
        const bi = quoteBank.findIndex(v => v.quote.toLowerCase() === old.quote.toLowerCase() && v._custom);
        if (bi !== -1) quoteBank[bi] = entry;
        custom[awEditQuoteIdx] = entry; awSaveCustomQuotes(custom);
        awSetFeedback('aw-quote-feedback', `✓ Quote updated!`, 'ok'); awCancelEditQuote();
      } else {
        if (quoteBank.find(q => q.quote.toLowerCase() === quote.toLowerCase())) { awSetFeedback('aw-quote-feedback', '⚠ This quote already exists.', 'err'); return; }
        quoteBank.push(entry); const custom = awGetCustomQuotes(); custom.push(entry); awSaveCustomQuotes(custom);
        awSetFeedback('aw-quote-feedback', `✓ Quote by ${author} added!`, 'ok'); awClearQuote();
      }
    }

    // ---- GAP FILL ----
    let awEditGapIdx = -1;

    function awEditGap(idx) {
      const custom = awGetCustomGaps(); const g = custom[idx]; if (!g) return;
      awEditGapIdx = idx;
      document.getElementById('aw-gap-sentence').value = g.sentence || '';
      document.getElementById('aw-gap-removed').value = g.removedWord || '';
      document.getElementById('aw-gap-infinitive').value = g.infinitive || '';
      document.getElementById('aw-gap-grammar').value = g.grammarType || '';
      document.getElementById('aw-gap-level').value = g.level || '';
      document.getElementById('aw-gap-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-gap-edit-banner').style.display = '';
      document.getElementById('aw-gap-feedback').textContent = '';
      awSetTab('gap');
      document.getElementById('aw-gap-sentence').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEditGap() {
      awEditGapIdx = -1;
      document.getElementById('aw-gap-submit-btn').textContent = t('addGapBtn');
      document.getElementById('aw-gap-edit-banner').style.display = 'none';
      awClearGap();
    }

    function awClearGap() {
      ['aw-gap-sentence', 'aw-gap-removed', 'aw-gap-infinitive', 'aw-gap-grammar', 'aw-gap-level']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-gap-feedback').textContent = '';
    }

    function awSubmitGap() {
      const sentence = document.getElementById('aw-gap-sentence').value.trim();
      const removed = document.getElementById('aw-gap-removed').value.trim();
      if (!sentence) { awSetFeedback('aw-gap-feedback', '⚠ Sentence is required.', 'err'); return; }
      if (!removed) { awSetFeedback('aw-gap-feedback', '⚠ Removed word(s) required.', 'err'); return; }
      if (!sentence.toLowerCase().includes(removed.toLowerCase())) { awSetFeedback('aw-gap-feedback', `⚠ "${removed}" not found in the sentence.`, 'err'); return; }
      const entry = { sentence, removedWord: removed, infinitive: document.getElementById('aw-gap-infinitive').value.trim() || '', grammarType: document.getElementById('aw-gap-grammar').value.trim() || '', level: document.getElementById('aw-gap-level').value || '', _custom: true };
      if (awEditGapIdx >= 0) {
        const custom = awGetCustomGaps(); const old = custom[awEditGapIdx];
        const bi = gapFillBank.findIndex(v => v.sentence.toLowerCase() === old.sentence.toLowerCase() && v._custom);
        if (bi !== -1) gapFillBank[bi] = entry;
        custom[awEditGapIdx] = entry; awSaveCustomGaps(custom);
        awSetFeedback('aw-gap-feedback', '✓ Gap fill updated!', 'ok'); awCancelEditGap();
      } else {
        if (gapFillBank.find(g => g.sentence.toLowerCase() === sentence.toLowerCase())) { awSetFeedback('aw-gap-feedback', '⚠ This sentence already exists.', 'err'); return; }
        gapFillBank.push(entry); const custom = awGetCustomGaps(); custom.push(entry); awSaveCustomGaps(custom);
        awSetFeedback('aw-gap-feedback', '✓ Gap fill sentence added!', 'ok'); awClearGap();
      }
    }

    // ---- FIND THE ERROR ----
    let awEditErrorIdx = -1;

    function awEditError(idx) {
      const custom = awGetCustomErrors(); const e = custom[idx]; if (!e) return;
      awEditErrorIdx = idx;
      document.getElementById('aw-error-correct').value = e.correct || '';
      document.getElementById('aw-error-erroneous').value = e.erroneous || '';
      document.getElementById('aw-error-explanation').value = e.explanation || '';
      document.getElementById('aw-error-submit-btn').textContent = t('saveChanges');
      document.getElementById('aw-error-edit-banner').style.display = '';
      document.getElementById('aw-error-feedback').textContent = '';
      awSetTab('error');
      document.getElementById('aw-error-correct').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function awCancelEditError() {
      awEditErrorIdx = -1;
      document.getElementById('aw-error-submit-btn').textContent = t('addErrorBtn');
      document.getElementById('aw-error-edit-banner').style.display = 'none';
      awClearError();
    }

    function awClearError() {
      ['aw-error-correct', 'aw-error-erroneous', 'aw-error-explanation']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('aw-error-feedback').textContent = '';
    }

    function awSubmitError() {
      const correct = document.getElementById('aw-error-correct').value.trim();
      const erroneous = document.getElementById('aw-error-erroneous').value.trim();
      const explanation = document.getElementById('aw-error-explanation').value.trim();
      if (!correct) { awSetFeedback('aw-error-feedback', '⚠ Correct sentence is required.', 'err'); return; }
      if (!erroneous) { awSetFeedback('aw-error-feedback', '⚠ Erroneous sentence is required.', 'err'); return; }
      if (!explanation) { awSetFeedback('aw-error-feedback', '⚠ Explanation is required.', 'err'); return; }
      const entry = { correct, erroneous, explanation, _custom: true };
      if (awEditErrorIdx >= 0) {
        const custom = awGetCustomErrors(); const old = custom[awEditErrorIdx];
        const bi = errorBank.findIndex(v => v.correct.toLowerCase() === old.correct.toLowerCase() && v._custom);
        if (bi !== -1) errorBank[bi] = entry;
        custom[awEditErrorIdx] = entry; awSaveCustomErrors(custom);
        awSetFeedback('aw-error-feedback', '✓ Error pair updated!', 'ok'); awCancelEditError();
      } else {
        if (errorBank.find(e => e.correct.toLowerCase() === correct.toLowerCase())) { awSetFeedback('aw-error-feedback', '⚠ This correct sentence already exists.', 'err'); return; }
        errorBank.push(entry); const custom = awGetCustomErrors(); custom.push(entry); awSaveCustomErrors(custom);
        awSetFeedback('aw-error-feedback', '✓ Error pair added!', 'ok'); awClearError();
      }
    }

    // ---- BULK JSON (words only) ----
    // --- Bulk import state ---
    let _awMergeQueue = [];      // [{incoming, existing}]
    let _awMergeAdded = 0;
    let _awMergeMerged = 0;
    let _awMergeReplaced = 0;
    let _awMergeSkipped = 0;
    let _awMergeInvalid = 0;
    let _awMergeFilled = 0;

    function awSubmitBulk() {
      const raw = document.getElementById('aw-bulk-json').value.trim();
      if (!raw) { awSetFeedback('aw-bulk-feedback', '⚠ Paste some JSON first.', 'err'); return; }
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { awSetFeedback('aw-bulk-feedback', '⚠ Invalid JSON: ' + e.message, 'err'); return; }
      if (!Array.isArray(parsed)) { awSetFeedback('aw-bulk-feedback', '⚠ JSON must be an array [ ... ]', 'err'); return; }

      _awMergeQueue = []; _awMergeAdded = 0; _awMergeMerged = 0; _awMergeReplaced = 0; _awMergeSkipped = 0; _awMergeInvalid = 0; _awMergeFilled = 0;
      const custom = awGetCustomWords();

      const vbSize = typeof vocabBank !== 'undefined' ? vocabBank.length : -1;
      console.log('[Import] vocabBank size:', vbSize, '| parsed:', parsed.length, 'words');

      parsed.forEach(rawObj => {
        if (!rawObj.word || typeof rawObj.word !== 'string' || !rawObj.word.trim()) { _awMergeInvalid++; return; }
        // Fill missing fields with empty defaults — only "word" is required
        let obj = Object.assign({
          french: '', definition: '', ipa: '', partOfSpeech: '',
          level: '', theme: '', exampleSentence: '', synonyms: [], antonyms: []
        }, rawObj, { word: rawObj.word.trim() });
        const existing = vocabBank.find(v => v.word.toLowerCase() === obj.word.toLowerCase());
        console.log('[Import]', obj.word, '->', existing ? 'DUPLICATE' : 'new');
        if (existing) {
          _awMergeQueue.push({ incoming: obj, existing });
        } else {
          const entry = { ...obj, _custom: true }; vocabBank.push(entry); custom.push(entry); _awMergeAdded++;
        }
      });

      awSaveCustomWords(custom); populateAllThemeMenus();

      console.log('[Import] queue length:', _awMergeQueue.length, '| added:', _awMergeAdded);

      // Show diagnostic in UI so we can see what happened without DevTools
      const diagMsg = 'DB size: ' + vbSize + ' | parsed: ' + parsed.length + ' | duplicates found: ' + _awMergeQueue.length + ' | new: ' + _awMergeAdded;
      awSetFeedback('aw-bulk-feedback', '🔍 ' + diagMsg, _awMergeQueue.length > 0 ? 'ok' : 'err');

      if (_awMergeQueue.length > 0) {
        awMergeShowNext();
      } else {
        awBulkFinishFeedback();
        if (_awMergeAdded > 0) document.getElementById('aw-bulk-json').value = '';
      }
    }

    function awMergeShowNext() {
      if (_awMergeQueue.length === 0) { awMergeClose(); awBulkFinishFeedback(); return; }
      const { incoming, existing } = _awMergeQueue[0];
      const total = _awMergeQueue.length;
      const overlayEl = document.getElementById('aw-merge-overlay');
      console.log('[Merge] showing conflict for:', incoming.word, '| overlay found:', !!overlayEl, '| current display:', overlayEl ? overlayEl.style.display : 'N/A');
      document.getElementById('aw-merge-subtitle').textContent =
        `${total} conflict${total !== 1 ? 's' : ''} remaining — choose what to do with each duplicate.`;

      const inThemes = getItemThemes(incoming);
      const exThemes = getItemThemes(existing);
      const merged = [...new Set([...exThemes, ...inThemes])];

      // New syn/ant entries that incoming adds on top of existing
      const exSyn = existing.synonyms || [];
      const inSyn = incoming.synonyms || [];
      const newSyn = inSyn.filter(s => !exSyn.map(x => x.toLowerCase()).includes(s.toLowerCase()));

      const exAnt = existing.antonyms || [];
      const inAnt = incoming.antonyms || [];
      const newAnt = inAnt.filter(a => !exAnt.map(x => x.toLowerCase()).includes(a.toLowerCase()));

      // Determine which scalar fields would be filled by fill-empty
      const fillableScalar = ['ipa', 'partOfSpeech', 'level', 'french'].filter(
        k => !existing[k] && incoming[k]
      );
      const fillableArrays = ['definition', 'exampleSentence'].filter(
        k => !_allVals(existing[k]).length && _allVals(incoming[k]).length
      );
      const hasFillable = fillableScalar.length > 0 || fillableArrays.length > 0 || newSyn.length > 0 || newAnt.length > 0;

      // Show/hide Fill Empty button based on whether there's anything to fill
      const fillBtn = document.getElementById('aw-merge-fill-btn');
      if (fillBtn) fillBtn.style.display = hasFillable ? '' : 'none';

      const row = (label, exVal, inVal, fieldKey) => {
        const diff = exVal !== inVal;
        const willFill = fieldKey && !existing[fieldKey] && incoming[fieldKey];
        const inStyle = willFill
          ? 'color:#1a7a1a;font-weight:700;'
          : (diff && exVal ? 'color:#c85a00;font-weight:700;' : '');
        return `<tr style="border-top:1px solid #eee;${willFill ? 'background:#f0faf0;' : ''}">
          <td style="padding:7px 12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;white-space:nowrap;">${label}</td>
          <td style="padding:7px 12px;font-size:0.88rem;color:#111;">${exVal || '<em style="color:#bbb">—</em>'}</td>
          <td style="padding:7px 12px;font-size:0.88rem;${inStyle}">${inVal || '<em style="color:#bbb">—</em>'}${willFill ? ' <span style="font-size:0.7rem;background:#1a7a1a;color:#fff;border-radius:3px;padding:1px 5px;vertical-align:middle;">will fill</span>' : ''}</td>
        </tr>`;
      };

      // Array row: shows existing items, and highlights new items from incoming in green
      const arrayRow = (label, exArr, inArr, newItems) => {
        const hasNew = newItems.length > 0;
        const exDisplay = exArr.length ? exArr.join(', ') : '<em style="color:#bbb">—</em>';
        const inParts = inArr.map(s => {
          const isNew = newItems.map(x => x.toLowerCase()).includes(s.toLowerCase());
          return isNew
            ? `<span style="color:#1a7a1a;font-weight:700;">${s} <span style="font-size:0.65rem;background:#1a7a1a;color:#fff;border-radius:3px;padding:1px 4px;">+new</span></span>`
            : `<span style="color:#999;">${s}</span>`;
        });
        const inDisplay = inArr.length ? inParts.join(', ') : '<em style="color:#bbb">—</em>';
        return `<tr style="border-top:1px solid #eee;${hasNew ? 'background:#f0faf0;' : ''}">
          <td style="padding:7px 12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;white-space:nowrap;">${label}</td>
          <td style="padding:7px 12px;font-size:0.88rem;color:#111;">${exDisplay}</td>
          <td style="padding:7px 12px;font-size:0.88rem;">${inDisplay}</td>
        </tr>`;
      };

      // Build fill summary
      const fillParts = [...fillableScalar, ...fillableArrays];
      if (newSyn.length) fillParts.push(`synonyms (+${newSyn.length})`);
      if (newAnt.length) fillParts.push(`antonyms (+${newAnt.length})`);

      document.getElementById('aw-merge-card').innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#111;color:#fff;">
              <th style="padding:8px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;width:110px;">Field</th>
              <th style="padding:8px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Existing</th>
              <th style="padding:8px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Incoming</th>
            </tr>
          </thead>
          <tbody>
            ${row('Word', existing.word, incoming.word, null)}
            ${row('French', existing.french, incoming.french, 'french')}
            ${row('IPA', existing.ipa, incoming.ipa, 'ipa')}
            ${row('Level', existing.level, incoming.level, 'level')}
            ${row('Part of Speech', existing.partOfSpeech, incoming.partOfSpeech, 'partOfSpeech')}
            ${row('Themes', exThemes.join(', ') || '—', inThemes.join(', ') || '—', null)}
            <tr style="border-top:1px solid #eee;background:#f9f9f9;">
              <td style="padding:7px 12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#888;">Merge →</td>
              <td colspan="2" style="padding:7px 12px;font-size:0.88rem;color:#111;font-weight:700;">${merged.join(', ') || '—'}</td>
            </tr>
            ${arrayRow('Synonyms', exSyn, inSyn, newSyn)}
            ${arrayRow('Antonyms', exAnt, inAnt, newAnt)}
            ${(function () { const ex = _allVals(existing.definition).join(' / '), inc = _allVals(incoming.definition).join(' / '); return row('Definition', ex.substring(0, 80) + (ex.length > 80 ? '…' : ''), inc.substring(0, 80) + (inc.length > 80 ? '…' : ''), 'definition'); })()}
            ${(function () { const ex = _allVals(existing.exampleSentence).join(' / '), inc = _allVals(incoming.exampleSentence).join(' / '); return row('Example', ex.substring(0, 80) + (ex.length > 80 ? '…' : ''), inc.substring(0, 80) + (inc.length > 80 ? '…' : ''), 'exampleSentence'); })()}
          </tbody>
        </table>${hasFillable ? `<div style="padding:8px 14px;background:#f0faf0;border-top:1px solid #c3e6c3;font-size:0.78rem;color:#1a7a1a;font-weight:700;">🪄 "Fill Empty Fields" will add: ${fillParts.join(', ')}</div>` : ''}`;

      document.getElementById('aw-merge-overlay').style.display = 'flex';
    }

    function awMergeDecide(action) {
      if (!_awMergeQueue.length) return;
      const { incoming, existing } = _awMergeQueue.shift();
      _awApplyMergeAction(action, incoming, existing);
      awMergeShowNext();
    }

    function awMergeApplyAll(action) {
      while (_awMergeQueue.length) {
        const { incoming, existing } = _awMergeQueue.shift();
        _awApplyMergeAction(action, incoming, existing);
      }
      awMergeClose(); awBulkFinishFeedback();
    }

    function _awApplyMergeAction(action, incoming, existing) {
      if (action === 'skip') { _awMergeSkipped++; return; }

      const custom = awGetCustomWords();
      if (action === 'fill-empty') {
        // Copy scalar fields only if empty on existing
        const scalarFields = ['ipa', 'partOfSpeech', 'level', 'french'];
        let filled = false;
        scalarFields.forEach(k => { if (!existing[k] && incoming[k]) { existing[k] = incoming[k]; filled = true; } });
        ['definition', 'exampleSentence'].forEach(k => { if (!_allVals(existing[k]).length && _allVals(incoming[k]).length) { existing[k] = incoming[k]; filled = true; } });
        // Always union-merge synonyms/antonyms — add any new entries from incoming
        if (incoming.synonyms && incoming.synonyms.length) {
          const before = (existing.synonyms || []).length;
          existing.synonyms = [...new Set([...(existing.synonyms || []), ...incoming.synonyms])];
          if (existing.synonyms.length > before) filled = true;
        }
        if (incoming.antonyms && incoming.antonyms.length) {
          const before = (existing.antonyms || []).length;
          existing.antonyms = [...new Set([...(existing.antonyms || []), ...incoming.antonyms])];
          if (existing.antonyms.length > before) filled = true;
        }
        if (filled) {
          existing._custom = true;
          const ci = custom.findIndex(w => w.word.toLowerCase() === existing.word.toLowerCase());
          if (ci !== -1) { custom[ci] = existing; } else { custom.push(existing); }
          awSaveCustomWords(custom);
          _awMergeFilled++;
        } else {
          _awMergeSkipped++;
        }
      } else if (action === 'merge') {
        const exThemes = getItemThemes(existing);
        const inThemes = getItemThemes(incoming);
        const merged = [...new Set([...exThemes, ...inThemes])];
        existing.theme = merged.length === 1 ? merged[0] : merged;
        // Also merge synonyms/antonyms arrays if present
        if (incoming.synonyms) existing.synonyms = [...new Set([...(existing.synonyms || []), ...incoming.synonyms])];
        if (incoming.antonyms) existing.antonyms = [...new Set([...(existing.antonyms || []), ...incoming.antonyms])];
        // Fill in missing fields from incoming
        ['ipa', 'partOfSpeech', 'level'].forEach(k => { if (!existing[k] && incoming[k]) existing[k] = incoming[k]; });
        ['definition', 'exampleSentence'].forEach(k => { if (!_allVals(existing[k]).length && _allVals(incoming[k]).length) existing[k] = incoming[k]; });
        existing._custom = true;
        // Upsert into custom storage (covers both original DB words and already-custom words)
        const ci = custom.findIndex(w => w.word.toLowerCase() === existing.word.toLowerCase());
        if (ci !== -1) { custom[ci] = existing; } else { custom.push(existing); }
        awSaveCustomWords(custom);
        _awMergeMerged++;
      } else if (action === 'replace') {
        const entry = { ...incoming, _custom: true };
        const bi = vocabBank.findIndex(v => v.word.toLowerCase() === incoming.word.toLowerCase());
        if (bi !== -1) vocabBank[bi] = entry; else vocabBank.push(entry);
        const ci = custom.findIndex(w => w.word.toLowerCase() === incoming.word.toLowerCase());
        if (ci !== -1) { custom[ci] = entry; } else { custom.push(entry); }
        awSaveCustomWords(custom);
        _awMergeReplaced++;
      }
      populateAllThemeMenus();
    }

    function awMergeClose() {
      document.getElementById('aw-merge-overlay').style.display = 'none';
    }

    function awBulkFinishFeedback() {
      const parts = [];
      if (_awMergeAdded) parts.push(`${_awMergeAdded} added`);
      if (_awMergeMerged) parts.push(`${_awMergeMerged} merged`);
      if (_awMergeFilled) parts.push(`${_awMergeFilled} filled`);
      if (_awMergeReplaced) parts.push(`${_awMergeReplaced} replaced`);
      if (_awMergeSkipped) parts.push(`${_awMergeSkipped} skipped`);
      if (_awMergeInvalid) parts.push(`${_awMergeInvalid} invalid`);
      const total = _awMergeAdded + _awMergeMerged + _awMergeFilled + _awMergeReplaced;
      awSetFeedback('aw-bulk-feedback', `✓ ${parts.join(', ') || 'nothing to import'}`, total > 0 ? 'ok' : 'err');
      if (total > 0) document.getElementById('aw-bulk-json').value = '';
    }

    // ---- MANAGE ----
    function awRenderManage() {
      const total = awGetCustomWords().length + awGetCustomQuotes().length + awGetCustomGaps().length + awGetCustomErrors().length;
      document.getElementById('aw-manage-count').textContent = `${total} ${total !== 1 ? t("customItemsPlural") : t("customItems")} ${t("inBrowser")}`;
    }

    function awRenderManageWords() {
      const custom = awGetCustomWords(); const tbody = document.getElementById('aw-manage-body'); const empty = document.getElementById('aw-manage-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((w, i) => `<tr>
        <td><strong>${w.word}</strong></td><td>${w.french || ''}</td><td>${w.partOfSpeech || ''}</td><td>${w.level || ''}</td><td>${getItemThemes(w).join(', ') || ''}</td>
        <td style="max-width:220px;color:#555;">${(w.definition || '').substring(0, 70)}${(w.definition || '').length > 70 ? '…' : ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditWord(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteWord(${i})">✕</button></td>
      </tr>`).join('');
    }
    function awRenderManageQuotes() {
      const custom = awGetCustomQuotes(); const tbody = document.getElementById('aw-manage-quotes-body'); const empty = document.getElementById('aw-manage-quotes-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((q, i) => `<tr>
        <td style="max-width:260px;font-style:italic;">"${q.quote.substring(0, 80)}${q.quote.length > 80 ? '…' : ''}"</td>
        <td>${q.author || ''}</td><td>${q.theme || ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditQuote(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteQuote(${i})">✕</button></td>
      </tr>`).join('');
    }
    function awRenderManageGaps() {
      const custom = awGetCustomGaps(); const tbody = document.getElementById('aw-manage-gaps-body'); const empty = document.getElementById('aw-manage-gaps-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((g, i) => `<tr>
        <td style="max-width:220px;">${g.sentence.substring(0, 80)}${g.sentence.length > 80 ? '…' : ''}</td>
        <td><strong>${g.removedWord || ''}</strong></td><td>${g.grammarType || ''}</td><td>${g.level || ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditGap(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteGap(${i})">✕</button></td>
      </tr>`).join('');
    }
    function awRenderManageErrors() {
      const custom = awGetCustomErrors(); const tbody = document.getElementById('aw-manage-errors-body'); const empty = document.getElementById('aw-manage-errors-empty');
      empty.style.display = custom.length ? 'none' : 'block';
      tbody.innerHTML = custom.map((e, i) => `<tr>
        <td style="max-width:180px;color:#1a7a3a;">${e.correct.substring(0, 60)}${e.correct.length > 60 ? '…' : ''}</td>
        <td style="max-width:180px;color:#b91c1c;">${e.erroneous.substring(0, 60)}${e.erroneous.length > 60 ? '…' : ''}</td>
        <td style="max-width:200px;color:#555;">${(e.explanation || '').substring(0, 60)}${(e.explanation || '').length > 60 ? '…' : ''}</td>
        <td style="display:flex;gap:6px;"><button class="aw-edit-btn" onclick="awEditError(${i})">✏️</button><button class="aw-delete-btn" onclick="awDeleteError(${i})">✕</button></td>
      </tr>`).join('');
    }

    async function awDeleteWord(idx) {
      const custom = awGetCustomWords(); const word = custom[idx]; if (!word) return;
      if (!await showConfirm(`Remove "${word.word}"?`)) return;
      const bi = vocabBank.findIndex(w => w.word.toLowerCase() === word.word.toLowerCase() && w._custom); if (bi !== -1) vocabBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomWords(custom); populateAllThemeMenus(); awRenderManageWords(); awRenderManage();
    }
    async function awDeleteQuote(idx) {
      const custom = awGetCustomQuotes(); const q = custom[idx]; if (!q) return;
      if (!await showConfirm(`Remove this quote by ${q.author}?`)) return;
      const bi = quoteBank.findIndex(v => v.quote.toLowerCase() === q.quote.toLowerCase() && v._custom); if (bi !== -1) quoteBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomQuotes(custom); awRenderManageQuotes(); awRenderManage();
    }
    async function awDeleteGap(idx) {
      const custom = awGetCustomGaps(); const g = custom[idx]; if (!g) return;
      if (!await showConfirm('Remove this gap fill sentence?')) return;
      const bi = gapFillBank.findIndex(v => v.sentence.toLowerCase() === g.sentence.toLowerCase() && v._custom); if (bi !== -1) gapFillBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomGaps(custom); awRenderManageGaps(); awRenderManage();
    }
    async function awDeleteError(idx) {
      const custom = awGetCustomErrors(); const e = custom[idx]; if (!e) return;
      if (!await showConfirm('Remove this error pair?')) return;
      const bi = errorBank.findIndex(v => v.correct.toLowerCase() === e.correct.toLowerCase() && v._custom); if (bi !== -1) errorBank.splice(bi, 1);
      custom.splice(idx, 1); awSaveCustomErrors(custom); awRenderManageErrors(); awRenderManage();
    }

    async function awDeleteAll() {
      const total = awGetCustomWords().length + awGetCustomQuotes().length + awGetCustomGaps().length + awGetCustomErrors().length;
      if (!total) return;
      if (!await showConfirm(`Delete all ${total} custom items? This cannot be undone.`)) return;
      awGetCustomWords().forEach(w => { const bi = vocabBank.findIndex(v => v.word.toLowerCase() === w.word.toLowerCase() && v._custom); if (bi !== -1) vocabBank.splice(bi, 1); });
      awGetCustomQuotes().forEach(q => { const bi = quoteBank.findIndex(v => v.quote.toLowerCase() === q.quote.toLowerCase() && v._custom); if (bi !== -1) quoteBank.splice(bi, 1); });
      awGetCustomGaps().forEach(g => { const bi = gapFillBank.findIndex(v => v.sentence.toLowerCase() === g.sentence.toLowerCase() && v._custom); if (bi !== -1) gapFillBank.splice(bi, 1); });
      awGetCustomErrors().forEach(e => { const bi = errorBank.findIndex(v => v.correct.toLowerCase() === e.correct.toLowerCase() && v._custom); if (bi !== -1) errorBank.splice(bi, 1); });
      [AW_STORAGE_KEY, AW_QUOTES_KEY, AW_GAP_KEY, AW_ERROR_KEY].forEach(k => localStorage.removeItem(k));
      populateAllThemeMenus(); awRenderManage(); awSetManageTab('words');
    }

    function awBuildDatabaseFiles() {
      const strip = ({ _custom, ...rest }) => rest;
      const wordLines = vocabBank.map(strip).map(w => {
        const themes = getItemThemes(w);
        const themeVal = themes.length > 1 ? themes : (themes[0] || '');
        const starredPart = w.starred ? `, starred: true` : '';
        return `  { word: ${JSON.stringify(w.word)}, ipa: ${JSON.stringify(w.ipa || '')}, partOfSpeech: ${JSON.stringify(w.partOfSpeech || '')}, level: ${JSON.stringify(w.level || '')}, theme: ${JSON.stringify(themeVal)}, definition: ${JSON.stringify(_allVals(w.definition))}, french: ${JSON.stringify(w.french || '')}, exampleSentence: ${JSON.stringify(_allVals(w.exampleSentence))}, synonyms: ${JSON.stringify(w.synonyms || [])}, antonyms: ${JSON.stringify(w.antonyms || [])}, otherForms: ${JSON.stringify(w.otherForms || [])}${starredPart} }`;
      });

      return {
        wordDb: `// wordDb.js\nconst vocabBank = [\n${wordLines.join(',\n')}\n];\n`
      };
    }

    async function awDownloadDB() {
      const files = awBuildDatabaseFiles();

      if (window.Desktop && Desktop.isElectron()) {
        await Desktop.saveText('customWordbanks', 'wordDb.js', files.wordDb);
        mdbToast('✅ Database files saved.');
        return;
      }

      downloadFile('wordDb.js', files.wordDb, 'application/javascript');
    }

    // ================================================================
    // END ADD WORDS TO DATABASE
    // ================================================================


    // ================================================================
    // i18n — delegates to shared i18n.js (window.t / window.getLang)
    // ================================================================
    // Migrate legacy app_lang key to cmt-lang-board on first load
    (function () {
      try {
        var old = localStorage.getItem('app_lang');
        if (old) { localStorage.setItem('cmt-lang-board', old); localStorage.removeItem('app_lang'); }
      } catch (e) { }
    })();
    let currentLang = (typeof getLang === 'function') ? getLang() : ((typeof window !== 'undefined' && typeof window.getLang === 'function') ? window.getLang() : 'en');

    function showDevFeaturesEnabled() {
      try {
        const cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
        return cfg.showDevFeatures === true;
      } catch (_) {
        return false;
      }
    }

    function applyDevFeatureVisibility() {
      const studentNoteItem = document.getElementById('con-ctx-student-note-dev');
      if (studentNoteItem) studentNoteItem.style.display = showDevFeaturesEnabled() ? 'block' : 'none';
    }
    applyDevFeatureVisibility();

    function getTranslation(w, lang) {
      const l = lang || currentLang;
      if (l === 'en') return w.english || w.word || '';
      return w[l] || w.french || w.translation || '';
    }

    function boardT(key) {
      return t(key);
    }

    // --- Font size control ---
    const FS_DEFAULT = 16;
    const FS_MIN = 10;
    const FS_MAX = 26;
    let currentFontSize = (() => { try { return parseInt(localStorage.getItem('app_font_size')) || FS_DEFAULT; } catch (e) { return FS_DEFAULT; } })();
    let _fontSizeSaveTimer = null;
    function applyFontSize(size, persist = false) {
      currentFontSize = Math.min(FS_MAX, Math.max(FS_MIN, size));
      document.documentElement.style.fontSize = currentFontSize + 'px';
      if (persist) {
        try { localStorage.setItem('app_font_size', currentFontSize); } catch (e) { }
        if (window.Desktop && Desktop.isElectron()) {
          clearTimeout(_fontSizeSaveTimer);
          _fontSizeSaveTimer = setTimeout(() => {
            Desktop.saveJson('user', 'ui-prefs.json', { fontSize: currentFontSize }).catch(() => { });
          }, 400);
        }
      }
    }
    function adjustFontSize(delta) {
      if (delta === 0) applyFontSize(FS_DEFAULT, true);
      else applyFontSize(currentFontSize + delta, true);
    }
    // Apply on load (do not write to disk)
    applyFontSize(currentFontSize, false);

    function setLang(lang) {
      if (lang === null || lang === 'auto') {
        try { localStorage.removeItem('cmt-lang-board'); } catch (e) { }
      } else {
        try { localStorage.setItem('cmt-lang-board', lang); } catch (e) { }
      }
      currentLang = getLang();
      _updateAllLangBtns();
      applyLang();
    }

    function _updateAllLangBtns() {
      const override = localStorage.getItem('cmt-lang-board');
      document.querySelectorAll('.lang-btn').forEach(b => {
        const dl = b.getAttribute('data-lang');
        b.classList.toggle('active', dl === 'auto' ? !override : dl === currentLang && !!override);
      });
      updateLangButtons();
    }

    function applyLang() {
      // Site title
      const st = document.getElementById('site-title');
      if (st) st.textContent = t('siteTitle');

      // All data-i18n elements
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        const v = t(k);
        var iconPath = el.getAttribute('data-icon');
        var img = el.querySelector('img');
        // Use innerHTML for keys that contain HTML tags
        const htmlKeys = ['whichCorrect', 'helpTipFilters1', 'helpTipFilters2', 'helpTipFilters3', 'helpCardHangmanDesc', 'helpCardScrambleDesc', 'helpCardFindErrorDesc', 'helpTipTeam1', 'helpTipTeam2', 'helpTipTimer'];
        if (img || iconPath) {
          if (!iconPath && img) {
            iconPath = img.getAttribute('src');
            if (iconPath) el.setAttribute('data-icon', iconPath);
          }
          if (!img && iconPath) {
            img = document.createElement('img');
            img.src = iconPath;
            img.className = 'btn-icon';
            img.alt = '';
          }
          el.innerHTML = '';
          if (img) el.appendChild(img);
          el.appendChild(document.createTextNode(' ' + v));
        } else if (htmlKeys.includes(k)) {
          el.innerHTML = v;
        } else {
          el.textContent = v;
        }
      });

      // Quote boxes (data-i18n-prefix: value stored dynamically)
      const qtb = document.getElementById('quote-theme-box');
      if (qtb) { const txt = qtb.textContent; if (!txt.includes(':') || txt.endsWith('????')) qtb.textContent = t('themeLabel') + ' ????'; }
      const qkb = document.getElementById('quote-keywords-box');
      if (qkb) { const txt = qkb.textContent; if (!txt.includes(':') || txt.endsWith('????')) qkb.textContent = t('keywordsLabel') + ' ????'; }

      // Picker "All" button labels — rebuild dropdowns
      document.querySelectorAll('.level-picker-wrap').forEach(w => {
        const sel = themePickerGetSelected(w);
        buildThemePickerDropdown(w, LEVEL_OPTIONS.map(o => o.value), sel, LEVEL_OPTIONS, t('allLevels'));
        themePickerSetSelected(w, sel);
      });
      document.querySelectorAll('.theme-picker-wrap:not(.level-picker-wrap):not(.pos-picker-wrap):not(.letter-picker-wrap):not(.length-picker-wrap)').forEach(w => {
        const sel = themePickerGetSelected(w);
        const themes = [...new Set(vocabBank.flatMap(item => getItemThemes(item)))].sort((a, b) => a.localeCompare(b));
        buildThemePickerDropdown(w, themes, sel, null, t('allThemes'));
        themePickerSetSelected(w, sel);
      });
      document.querySelectorAll('.pos-picker-wrap').forEach(w => {
        const sel = themePickerGetSelected(w);
        const types = [...new Set(vocabBank.flatMap(item => item.partOfSpeech ? (Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [item.partOfSpeech]) : []).filter(Boolean))].sort();
        buildThemePickerDropdown(w, types, sel, null, t('allTypes'));
        themePickerSetSelected(w, sel);
      });

      if (typeof bpUpdateBtn === 'function') bpUpdateBtn();
      if (typeof historyRenderList === 'function' && document.getElementById('history-overlay') && document.getElementById('history-overlay').style.display !== 'none') {
        historyRenderList();
      }
    }

    // Initialise language on page load
    document.addEventListener('DOMContentLoaded', () => {
      _updateAllLangBtns();
      // Small delay to let vocabBank and pickers initialise first
      setTimeout(applyLang, 150);
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'cmt-general-config' || e.key === 'cmt-lang-board') {
        currentLang = getLang();
        _updateAllLangBtns();
        applyLang();
      }
    });

    // ================================================================
    // MANAGE DATABASE OVERLAY
    // ================================================================

    MDB_DELETED_KEY = global.MDB_DELETED_KEY || 'deleted_words';

    // Track which words have been soft-deleted (by index in original vocabBank)
    // We store the word strings so they survive page reload
    function mdbGetDeleted() {
      try { return new Set(JSON.parse(localStorage.getItem(MDB_DELETED_KEY)) || []); } catch { return new Set(); }
    }
    function mdbSaveDeleted(set) {
      try { localStorage.setItem(MDB_DELETED_KEY, JSON.stringify([...set])); } catch { }
      if (window.Desktop && Desktop.isElectron()) {
        Desktop.saveJson('customWordbanks', 'deleted-words-backup.json', [...set]).catch(() => { });
      }
    }

    let mdbSelectedWords = new Set(); // Set of word strings currently checked
    let mdbPendingDelete = [];         // Words pending confirmation
    let mdbCurrentTab = 'delete';
    let mdbFilteredWords = [];         // full filtered word list
    let mdbWordsShownCount = 200;       // how many rows are currently rendered

    function mdbOpen() {
      // Populate theme filter
      const tf = document.getElementById('managedb-theme-filter');
      const themes = [...new Set(vocabBank.flatMap(item => getItemThemes(item)))].sort((a, b) => a.localeCompare(b));
      tf.innerHTML = '<option value="">All Themes</option>' + themes.map(t => `<option value="${t}">${t}</option>`).join('');

      mdbSelectedWords.clear();
      mdbUpdateSelBar();
      mdbShowTab('manage');
      mdbRenderWords();
      document.getElementById('managedb-overlay').classList.add('active');
    }

    function mdbClose() {
      document.getElementById('managedb-overlay').classList.remove('active');
      mdbCancelDelete();
    }

    function mdbShowTab(tab) {
      mdbCurrentTab = tab;
      document.getElementById('mdb-tab-delete').classList.toggle('active', tab === 'delete');
      document.getElementById('mdb-tab-dupes').classList.toggle('active', tab === 'dupes');
      document.getElementById('mdb-tab-themes').classList.toggle('active', tab === 'themes');
      document.getElementById('mdb-tab-add').classList.toggle('active', tab === 'add');
      document.getElementById('mdb-tab-manage').classList.toggle('active', tab === 'manage');
      document.getElementById('mdb-panel-delete').style.display = tab === 'delete' ? '' : 'none';
      document.getElementById('mdb-panel-dupes').style.display = tab === 'dupes' ? '' : 'none';
      document.getElementById('mdb-panel-themes').style.display = tab === 'themes' ? '' : 'none';
      document.getElementById('mdb-panel-add').style.display = tab === 'add' ? '' : 'none';
      document.getElementById('mdb-panel-manage').style.display = tab === 'manage' ? '' : 'none';
      document.getElementById('mdb-confirm-bar').classList.remove('active');
      if (tab === 'delete') mdbRenderWords();
      if (tab === 'dupes') mdbScanDuplicates();
      if (tab === 'themes') mdbRenderThemesTab();
      if (tab === 'add') { awSetTab('form'); awPopulateThemeDatalist(); }
      if (tab === 'manage') { awPopulateThemeDatalist(); awRenderManage(); }
    }

    // ================================================================
    // THEME MANAGEMENT (rename & merge)
    // ================================================================

    function mdbGetAllThemes() {
      if (typeof vocabThemes === 'undefined' || !vocabThemes.length) return [];
      return [...new Set(vocabThemes.flatMap(entry => Object.keys(entry)))].sort((a, b) => a.localeCompare(b));
    }

    function mdbRenderThemesTab() {
      const themes = mdbGetAllThemes();

      // Populate rename-from select
      const fromSel = document.getElementById('mdb-rename-from');
      const fromVal = fromSel.value;
      fromSel.innerHTML = '<option value="">— choose theme —</option>' +
        themes.map(t => `<option value="${t}"${t === fromVal ? ' selected' : ''}>${t}</option>`).join('');

      // Populate merge source checklist
      const list = document.getElementById('mdb-merge-source-list');
      const checked = [...list.querySelectorAll('.mdb-theme-check-item.checked')].map(el => el.dataset.theme);
      list.innerHTML = themes.map(t => `
        <div class="mdb-theme-check-item${checked.includes(t) ? ' checked' : ''}" data-theme="${t}"
          onclick="this.classList.toggle('checked');mdbUpdateMergePreview();">
          ${t}
        </div>`).join('');

      // Populate merge target datalist
      const dl = document.getElementById('mdb-merge-target-list');
      dl.innerHTML = themes.map(t => `<option value="${t}">`).join('');

      mdbUpdateRenameCount();
      mdbUpdateMergePreview();

      // Clear feedbacks
      document.getElementById('mdb-rename-feedback').textContent = '';
      document.getElementById('mdb-merge-feedback').textContent = '';
    }

    function mdbUpdateRenameCount() {
      const from = document.getElementById('mdb-rename-from').value;
      const to = document.getElementById('mdb-rename-to').value.trim();
      const prev = document.getElementById('mdb-rename-preview');
      if (!from) { prev.textContent = ''; return; }
      const count = vocabBank.filter(w => getItemThemes(w).includes(from)).length;
      prev.textContent = `${count} word${count !== 1 ? 's' : ''} use "${from}"` +
        (to ? ` → will be renamed to "${to}"` : '');
    }

    function mdbUpdateMergePreview() {
      const selected = [...document.querySelectorAll('#mdb-merge-source-list .mdb-theme-check-item.checked')]
        .map(el => el.dataset.theme);
      const target = document.getElementById('mdb-merge-target').value.trim();
      const prev = document.getElementById('mdb-merge-preview');
      if (!selected.length) { prev.textContent = ''; return; }
      const affected = new Set(
        vocabBank.filter(w => getItemThemes(w).some(t => selected.includes(t))).map(w => w.word)
      );
      prev.textContent = `${affected.size} word${affected.size !== 1 ? 's' : ''} affected` +
        (target ? ` → merged into "${target}"` : '');
    }

    // Apply a theme rename/merge directly in vocabThemes entries
    function mdbApplyThemeRename(oldName, newName) {
      if (typeof vocabThemes === 'undefined') return 0;
      let count = 0;
      vocabThemes.forEach(entry => {
        if (Object.prototype.hasOwnProperty.call(entry, oldName)) {
          const words = entry[oldName];
          delete entry[oldName];
          if (!entry[newName]) entry[newName] = [];
          // merge word lists, deduplicate
          entry[newName] = [...new Set([...entry[newName], ...words])];
          count++;
        }
      });
      invalidateThemeIndex();
      return count;
    }

    function mdbApplyThemeMerge(sources, target) {
      if (typeof vocabThemes === 'undefined') return 0;
      let count = 0;
      vocabThemes.forEach(entry => {
        const wordsToMerge = [];
        sources.forEach(src => {
          if (Object.prototype.hasOwnProperty.call(entry, src)) {
            wordsToMerge.push(...entry[src]);
            delete entry[src];
            count++;
          }
        });
        if (wordsToMerge.length) {
          if (!entry[target]) entry[target] = [];
          entry[target] = [...new Set([...entry[target], ...wordsToMerge])];
        }
      });
      invalidateThemeIndex();
      return count;
    }

    function mdbRenameTheme() {
      const from = document.getElementById('mdb-rename-from').value.trim();
      const to = document.getElementById('mdb-rename-to').value.trim();
      const fb = document.getElementById('mdb-rename-feedback');

      if (!from) { fb.textContent = '⚠ Please select a theme to rename.'; fb.className = 'mdb-themes-feedback err'; return; }
      if (!to) { fb.textContent = '⚠ Please enter a new name.'; fb.className = 'mdb-themes-feedback err'; return; }
      if (from === to) { fb.textContent = '⚠ New name is the same as the current name.'; fb.className = 'mdb-themes-feedback err'; return; }

      const count = vocabBank.filter(w => getItemThemes(w).includes(from)).length;
      mdbApplyThemeRename(from, to);
      populateAllThemeMenus();

      const tf = document.getElementById('managedb-theme-filter');
      const allThemes = mdbGetAllThemes();
      tf.innerHTML = '<option value="">All Themes</option>' + allThemes.map(t => `<option value="${t}">${t}</option>`).join('');

      fb.textContent = `✓ Renamed "${from}" → "${to}" (${count} word${count !== 1 ? 's' : ''} affected).`;
      fb.className = 'mdb-themes-feedback ok';
      document.getElementById('mdb-rename-to').value = '';
      mdbRenderThemesTab();
    }

    function mdbMergeThemes() {
      const selected = [...document.querySelectorAll('#mdb-merge-source-list .mdb-theme-check-item.checked')]
        .map(el => el.dataset.theme);
      const target = document.getElementById('mdb-merge-target').value.trim();
      const fb = document.getElementById('mdb-merge-feedback');

      if (selected.length < 2) { fb.textContent = '⚠ Select at least 2 themes to merge.'; fb.className = 'mdb-themes-feedback err'; return; }
      if (!target) { fb.textContent = '⚠ Enter a target theme name.'; fb.className = 'mdb-themes-feedback err'; return; }

      const affected = new Set(vocabBank.filter(w => getItemThemes(w).some(t => selected.includes(t))).map(w => w.word));
      mdbApplyThemeMerge(selected, target);
      populateAllThemeMenus();

      const tf = document.getElementById('managedb-theme-filter');
      const allThemes = mdbGetAllThemes();
      tf.innerHTML = '<option value="">All Themes</option>' + allThemes.map(t => `<option value="${t}">${t}</option>`).join('');

      fb.textContent = `✓ Merged ${selected.length} themes into "${target}" (${affected.size} word${affected.size !== 1 ? 's' : ''} affected).`;
      fb.className = 'mdb-themes-feedback ok';
      document.getElementById('mdb-merge-target').value = '';
      mdbRenderThemesTab();
    }

    // ================================================================
    // END THEME MANAGEMENT
    // ================================================================

    function mdbIsCustomWord(word) {
      const custom = (() => { try { return JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || []; } catch { return []; } })();
      return custom.some(c => c.word && c.word.toLowerCase() === word.toLowerCase());
    }

    function mdbRenderWords() {
      const search = (document.getElementById('managedb-search').value || '').toLowerCase().trim();
      const theme = document.getElementById('managedb-theme-filter').value;
      const source = document.getElementById('managedb-source-filter').value;
      const deleted = mdbGetDeleted();

      mdbFilteredWords = vocabBank.filter(w => {
        if (!w.word) return false;
        if (deleted.has(w.word.toLowerCase())) return false;
        if (search && !w.word.toLowerCase().includes(search) && !(w.translation || '').toLowerCase().includes(search)) return false;
        if (theme && !getItemThemes(w).includes(theme)) return false;
        if (source === 'custom' && !mdbIsCustomWord(w.word)) return false;
        if (source === 'builtin' && mdbIsCustomWord(w.word)) return false;
        return true;
      });

      const list = document.getElementById('managedb-word-list');
      if (!mdbFilteredWords.length) {
        list.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;font-style:italic;">No words match your filters.</div>';
        return;
      }

      mdbWordsShownCount = 200;
      list.innerHTML = '';
      mdbRenderWordRows(list, 0, Math.min(mdbWordsShownCount, mdbFilteredWords.length));
      mdbAppendShowMore(list);
      mdbUpdateSelBar();
    }

    function mdbRenderWordRows(list, start, end) {
      const toRender = mdbFilteredWords.slice(start, end);
      toRender.forEach(w => {
        const isCustom = mdbIsCustomWord(w.word);
        const isChecked = mdbSelectedWords.has(w.word.toLowerCase());
        const themes = getItemThemes(w).join(', ') || '—';
        const row = document.createElement('div');
        row.className = 'mdb-word-row' + (isCustom ? ' mdb-custom' : '') + (isChecked ? ' mdb-selected' : '');
        row.onclick = function (e) {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          const cb = row.querySelector('input[type=checkbox]');
          cb.checked = !cb.checked;
          mdbToggleWord(w.word.toLowerCase(), cb.checked);
        };
        row.innerHTML = `
          <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();mdbToggleWord('${w.word.toLowerCase().replace(/'/g, "\\'")}', this.checked)">
          <div>
            <div class="mdb-word-name">${w.word}${w.translation ? ` <span style="color:#999;font-weight:400;font-size:0.85rem;">— ${w.translation}</span>` : ''}</div>
            <div class="mdb-word-meta">
              ${w.level ? `<span class="mdb-badge">${w.level.toUpperCase()}</span>` : ''}
              ${w.partOfSpeech ? `<span class="mdb-badge">${w.partOfSpeech}</span>` : ''}
              ${isCustom ? `<span class="mdb-badge mdb-badge-custom">Custom</span>` : ''}
              <span style="color:#bbb;">${themes}</span>
            </div>
          </div>
          <div style="font-size:0.8rem;color:#bbb;font-style:italic;">${(d => d.substring(0, 80) + (d.length > 80 ? '…' : ''))(_firstVal(w.definition))}</div>
          <button class="mdb-word-del-btn" onclick="event.stopPropagation();mdbDeleteOne('${w.word.toLowerCase().replace(/'/g, "\\'")}')">🗑</button>
          <button class="mdb-word-edit-btn" onclick="event.stopPropagation();mdbOpenEditWord('${w.word.toLowerCase().replace(/'/g, "\\'")}')">✏️</button>
        `;
        list.appendChild(row);
      });
    }

    function mdbAppendShowMore(list) {
      const remaining = mdbFilteredWords.length - mdbWordsShownCount;
      if (remaining <= 0) return;
      const wrap = document.createElement('div');
      wrap.id = 'mdb-show-more-btn';
      wrap.style.cssText = 'text-align:center;padding:14px 0 6px;';
      wrap.innerHTML = `<button class="mdb-action-btn" onclick="mdbShowMoreWords()">Show ${Math.min(200, remaining)} more <span style="opacity:0.55;font-weight:400;">(${remaining} remaining)</span></button>`;
      list.appendChild(wrap);
    }

    function mdbShowMoreWords() {
      const btn = document.getElementById('mdb-show-more-btn');
      if (btn) btn.remove();
      const list = document.getElementById('managedb-word-list');
      const start = mdbWordsShownCount;
      mdbWordsShownCount = Math.min(mdbWordsShownCount + 200, mdbFilteredWords.length);
      mdbRenderWordRows(list, start, mdbWordsShownCount);
      mdbAppendShowMore(list);
    }

    function mdbToggleWord(wordLower, checked) {
      if (checked) { mdbSelectedWords.add(wordLower); }
      else { mdbSelectedWords.delete(wordLower); }
      // update row highlight
      document.querySelectorAll('.mdb-word-row').forEach(row => {
        const cb = row.querySelector('input[type=checkbox]');
        if (cb) row.classList.toggle('mdb-selected', cb.checked);
      });
      mdbUpdateSelBar();
    }

    function mdbUpdateSelBar() {
      const n = mdbSelectedWords.size;
      document.getElementById('managedb-sel-count').textContent = n + ' word' + (n === 1 ? '' : 's') + ' selected';
      const btn = document.getElementById('mdb-delete-sel-btn');
      if (btn) btn.disabled = (n === 0);
    }

    function mdbSelectAll() {
      mdbFilteredWords.forEach(w => mdbSelectedWords.add(w.word.toLowerCase()));
      document.querySelectorAll('#managedb-word-list input[type=checkbox]').forEach(cb => { cb.checked = true; cb.closest('.mdb-word-row').classList.add('mdb-selected'); });
      mdbUpdateSelBar();
    }

    function mdbClearSel() {
      mdbSelectedWords.clear();
      document.querySelectorAll('#managedb-word-list input[type=checkbox]').forEach(cb => { cb.checked = false; cb.closest('.mdb-word-row').classList.remove('mdb-selected'); });
      mdbUpdateSelBar();
    }

    function mdbDeleteOne(wordLower) {
      mdbPendingDelete = [wordLower];
      const bar = document.getElementById('mdb-confirm-bar');
      document.getElementById('mdb-confirm-msg').textContent = `Permanently delete "${wordLower}"?`;
      bar.classList.add('active');
    }

    function mdbRequestDeleteSelected() {
      if (!mdbSelectedWords.size) return;
      mdbPendingDelete = [...mdbSelectedWords];
      const bar = document.getElementById('mdb-confirm-bar');
      document.getElementById('mdb-confirm-msg').textContent = `Permanently delete ${mdbPendingDelete.length} word${mdbPendingDelete.length === 1 ? '' : 's'}?`;
      bar.classList.add('active');
    }

    function mdbConfirmDelete() {
      const deleted = mdbGetDeleted();
      const customWords = (() => { try { return JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || []; } catch { return []; } })();

      mdbPendingDelete.forEach(wordLower => {
        deleted.add(wordLower);
        // If it's a custom word, also remove from custom storage
        const idx = customWords.findIndex(c => c.word && c.word.toLowerCase() === wordLower);
        if (idx !== -1) customWords.splice(idx, 1);
        // Remove from live vocabBank
        const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordLower);
        if (vi !== -1) vocabBank.splice(vi, 1);
        mdbSelectedWords.delete(wordLower);
      });

      mdbSaveDeleted(deleted);
      try { localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(customWords)); } catch { }

      mdbPendingDelete = [];
      document.getElementById('mdb-confirm-bar').classList.remove('active');
      mdbRenderWords();
      mdbUpdateSelBar();
      // Show brief toast
      mdbToast('✅ Words deleted from database');
    }

    function mdbCancelDelete() {
      mdbPendingDelete = [];
      document.getElementById('mdb-confirm-bar').classList.remove('active');
    }

    function mdbToast(msg) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:11px 26px;border-radius:8px;font-size:0.95rem;font-weight:700;color:#fff;background:#111;box-shadow:0 4px 18px rgba(0,0,0,0.25);white-space:nowrap;pointer-events:none;';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }

    // ---- INLINE EDIT WORD MODAL (Manage Database) ----
    let _mdbEditWordKey = null; // lowercase word being edited

    function mdbOpenEditWord(wordLower) {
      const w = vocabBank.find(v => v.word && v.word.toLowerCase() === wordLower);
      if (!w) return;
      _mdbEditWordKey = wordLower;
      document.getElementById('mdb-edit-modal-title').textContent = '✏️ Edit: ' + w.word;
      document.getElementById('mdb-edit-word').value = w.word;
      document.getElementById('mdb-edit-french').value = w.french || '';
      document.getElementById('mdb-edit-ipa').value = w.ipa || '';
      const posEl = document.getElementById('mdb-edit-pos');
      const posVal = (Array.isArray(w.partOfSpeech) ? w.partOfSpeech[0] : (w.partOfSpeech || '')).toLowerCase();
      posEl.value = posVal;
      document.getElementById('mdb-edit-level').value = (w.level || '').toLowerCase();
      document.getElementById('mdb-edit-theme').value = getItemThemes(w).join(', ');
      document.getElementById('mdb-edit-definition').value = _editableStr(w.definition);
      document.getElementById('mdb-edit-example').value = _editableStr(w.exampleSentence);
      document.getElementById('mdb-edit-synonyms').value = (w.synonyms || []).join(', ');
      document.getElementById('mdb-edit-antonyms').value = (w.antonyms || []).join(', ');
      document.getElementById('mdb-edit-feedback').textContent = '';
      document.getElementById('mdb-edit-feedback').className = '';
      document.getElementById('mdb-edit-modal-overlay').classList.add('active');
    }

    function mdbCloseEditWord() {
      _mdbEditWordKey = null;
      document.getElementById('mdb-edit-modal-overlay').classList.remove('active');
    }

    function mdbSaveEditWord() {
      if (!_mdbEditWordKey) return;
      const french = document.getElementById('mdb-edit-french').value.trim();
      const definition = _parseLines(document.getElementById('mdb-edit-definition').value);
      const exampleSentence = _parseLines(document.getElementById('mdb-edit-example').value);
      if (!french) { mdbEditFeedback('⚠ French translation is required.', 'err'); return; }
      if (!definition.length) { mdbEditFeedback('⚠ Definition is required.', 'err'); return; }

      const themeRaw = document.getElementById('mdb-edit-theme').value.trim();
      const themeVal = themeRaw.includes(',') ? themeRaw.split(',').map(s => s.trim()).filter(Boolean) : (themeRaw || '');

      // Register themes in vocabThemes
      const newThemeArr = Array.isArray(themeVal) ? themeVal : (themeVal ? [themeVal] : []);
      if (typeof vocabThemes !== 'undefined') {
        vocabThemes.forEach(e => { for (const k of Object.keys(e)) { e[k] = e[k].filter(w => w.toLowerCase() !== _mdbEditWordKey); } });
        newThemeArr.forEach(theme => {
          let found = false;
          vocabThemes.forEach(e => { if (e[theme]) { if (!e[theme].map(w => w.toLowerCase()).includes(_mdbEditWordKey)) e[theme].push(_mdbEditWordKey); found = true; } });
          if (!found) vocabThemes.push({ [theme]: [_mdbEditWordKey] });
        });
        invalidateThemeIndex();
      }

      const update = {
        ipa: document.getElementById('mdb-edit-ipa').value.trim(),
        french,
        partOfSpeech: document.getElementById('mdb-edit-pos').value || '',
        level: document.getElementById('mdb-edit-level').value || '',
        theme: themeVal,
        definition,
        exampleSentence,
        synonyms: document.getElementById('mdb-edit-synonyms').value.split(',').map(s => s.trim()).filter(Boolean),
        antonyms: document.getElementById('mdb-edit-antonyms').value.split(',').map(s => s.trim()).filter(Boolean),
      };

      // Update live vocabBank
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === _mdbEditWordKey);
      if (vi !== -1) Object.assign(vocabBank[vi], update);

      // Update custom localStorage if it's a custom word
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === _mdbEditWordKey);
        if (ci !== -1) { Object.assign(cw[ci], update); localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw)); }
      } catch { }

      populateAllThemeMenus();
      mdbRenderWords();
      mdbEditFeedback('✓ Saved!', 'ok');
      setTimeout(() => mdbCloseEditWord(), 800);
    }

    function mdbEditFeedback(msg, type) {
      const el = document.getElementById('mdb-edit-feedback');
      el.textContent = msg; el.className = type;
    }

    // ---- DUPLICATES ----

    function mdbScanDuplicates() {
      const deleted = mdbGetDeleted();
      const active = vocabBank.filter(w => w.word && !deleted.has(w.word.toLowerCase()));

      // Group 1: same word (case-insensitive) AND same partOfSpeech type
      const byWord = {};
      active.forEach(w => {
        const key = w.word.toLowerCase().trim();
        if (!byWord[key]) byWord[key] = [];
        byWord[key].push(w);
      });

      // Group 2: same theme (only flag if theme is very specific — skip generic themes)
      const byTheme = {};
      active.forEach(w => {
        getItemThemes(w).forEach(th => {
          if (!byTheme[th]) byTheme[th] = [];
          byTheme[th].push(w);
        });
      });

      // Only flag as duplicates if entries share both spelling AND the same partOfSpeech
      const wordDupGroups = Object.values(byWord).filter(g => {
        if (g.length < 2) return false;
        // Group entries by their normalized POS
        const normPos = w => {
          const p = w.partOfSpeech;
          if (!p) return '';
          return (Array.isArray(p) ? p.join(',') : p).toLowerCase().trim();
        };
        const posGroups = {};
        g.forEach(w => {
          const key = normPos(w);
          if (!posGroups[key]) posGroups[key] = [];
          posGroups[key].push(w);
        });
        // At least one POS bucket has 2+ entries (true duplicates)
        return Object.values(posGroups).some(pg => pg.length > 1);
      }).map(g => {
        // Flatten: only return entries where the POS appears more than once
        const normPos = w => {
          const p = w.partOfSpeech;
          if (!p) return '';
          return (Array.isArray(p) ? p.join(',') : p).toLowerCase().trim();
        };
        const posCount = {};
        g.forEach(w => { const k = normPos(w); posCount[k] = (posCount[k] || 0) + 1; });
        return g.filter(w => posCount[normPos(w)] > 1);
      });
      const themeDupGroups = Object.entries(byTheme)
        .filter(([, g]) => g.length >= 2 && g.length <= 20) // skip themes that are just huge vocab categories
        .map(([theme, words]) => ({ theme, words }));

      const content = document.getElementById('mdb-dup-content');
      content.innerHTML = '';

      if (!wordDupGroups.length && !themeDupGroups.length) {
        content.innerHTML = `<div class="mdb-no-dups"><span class="mdb-big-icon">✅</span>No duplicates found! Your database looks clean.</div>`;
        return;
      }

      // Render exact word duplicates
      if (wordDupGroups.length) {
        const h = document.createElement('div');
        h.innerHTML = `<div style="font-size:0.72rem;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #eee;">⚠️ Exact spelling duplicates (${wordDupGroups.length} group${wordDupGroups.length === 1 ? '' : 's'})</div>`;
        content.appendChild(h);
        wordDupGroups.forEach(group => {
          content.appendChild(mdbMakeDupGroup(group));
        });
      }

      // Render theme duplicates
      if (themeDupGroups.length) {
        const h = document.createElement('div');
        h.innerHTML = `<div style="font-size:0.72rem;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#999;margin:20px 0 12px;padding-bottom:6px;border-bottom:1px solid #eee;">🏷️ Shared-theme groups — ${themeDupGroups.length} theme${themeDupGroups.length === 1 ? '' : 's'}</div>
          <p style="font-size:0.82rem;color:#999;margin:0 0 14px;font-style:italic;">These words share a theme. If any are redundant synonyms or accidental entries, you can remove duplicates here.</p>`;
        content.appendChild(h);
        themeDupGroups.forEach(({ theme, words }) => {
          content.appendChild(mdbMakeThemeGroup(theme, words));
        });
      }
    }

    // Collect every unique theme across all entries in a group
    // ---- collect unique values across group ----
    function mdbCollectAllThemes(group) {
      const seen = new Set(), out = [];
      group.forEach(w => getItemThemes(w).forEach(th => {
        if (!seen.has(th.toLowerCase())) { seen.add(th.toLowerCase()); out.push(th); }
      }));
      return out;
    }

    function mdbCollectAllPOS(group) {
      const seen = new Set(), out = [];
      group.forEach(w => {
        const pos = w.partOfSpeech;
        if (!pos) return;
        // partOfSpeech may already be an array (future-proofed) or a comma string
        const vals = Array.isArray(pos) ? pos : pos.split(',').map(s => s.trim()).filter(Boolean);
        vals.forEach(v => { if (!seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } });
      });
      return out;
    }

    // ---- apply merges to vocabBank + localStorage ----
    function mdbApplyMerged(wordLower, mergedThemes, mergedPOS) {
      const vi = vocabBank.findIndex(v => v.word && v.word.toLowerCase() === wordLower);
      if (vi !== -1) {
        if (mergedThemes) vocabBank[vi].theme = mergedThemes;
        if (mergedPOS) vocabBank[vi].partOfSpeech = mergedPOS.length === 1 ? mergedPOS[0] : mergedPOS;
      }
      try {
        const cw = JSON.parse(localStorage.getItem(AW_STORAGE_KEY)) || [];
        const ci = cw.findIndex(c => c.word && c.word.toLowerCase() === wordLower);
        if (ci !== -1) {
          if (mergedThemes) cw[ci].theme = mergedThemes;
          if (mergedPOS) cw[ci].partOfSpeech = mergedPOS.length === 1 ? mergedPOS[0] : mergedPOS;
          localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(cw));
        }
      } catch { }
    }

    // ---- build a collapsible merge bar (shared for themes & POS) ----
    function mdbMakeMergeBar({ label, tagDataAttr, items, addPlaceholder, countSuffix, btnClass }) {
      const bar = document.createElement('div');
      bar.className = 'mdb-theme-merge-bar';
      bar.style.cssText = 'display:none;padding:10px 16px 12px;background:#f8f8f8;border-bottom:1px solid #e0e0e0;';

      const tagsHtml = items.map(v => `
        <span class="mdb-theme-merge-tag" data-${tagDataAttr}="${v.replace(/"/g, '&quot;')}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#111;color:#fff;border-radius:4px;font-size:0.8rem;font-weight:700;">
          ${v}
          <span style="cursor:pointer;opacity:0.6;font-size:0.75rem;margin-left:2px;"
            onclick="this.closest('.mdb-theme-merge-tag').remove();mdbUpdateBarCount(this.closest('.mdb-theme-merge-bar'),'${tagDataAttr}','${countSuffix}');">✕</span>
        </span>`).join('');

      bar.innerHTML = `
        <div style="font-size:0.72rem;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:8px;">${label}</div>
        <div class="mdb-theme-tag-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${tagsHtml}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input class="mdb-theme-add-input" placeholder="${addPlaceholder}"
            style="padding:5px 10px;border:1.5px solid #aaa;border-radius:4px;font-family:inherit;font-size:0.85rem;flex:1;min-width:140px;max-width:240px;"
            onkeydown="if(event.key==='Enter'){mdbAddMergeTag(this,'${tagDataAttr}','${countSuffix}');}" />
          <button class="mdb-action-btn mdb-btn-grey" style="font-size:0.8rem;padding:5px 12px;"
            onclick="mdbAddMergeTag(this.previousElementSibling,'${tagDataAttr}','${countSuffix}');">＋ Add</button>
          <span class="mdb-merge-tag-count" style="font-size:0.8rem;color:#888;margin-left:4px;">${items.length} ${countSuffix}${items.length === 1 ? '' : 's'}</span>
        </div>
        <p style="margin:8px 0 0;font-size:0.75rem;color:#aaa;font-style:italic;">Click ✕ on a tag to exclude it. Changes are applied when you confirm keeping an entry.</p>
      `;
      return bar;
    }

    function mdbUpdateBarCount(bar, attr, suffix) {
      const n = bar.querySelectorAll(`.mdb-theme-merge-tag[data-${attr}]`).length;
      const el = bar.querySelector('.mdb-merge-tag-count');
      if (el) el.textContent = `${n} ${suffix}${n === 1 ? '' : 's'}`;
    }

    function mdbAddMergeTag(input, attr, suffix) {
      const val = input.value.trim(); if (!val) return;
      const bar = input.closest('.mdb-theme-merge-bar');
      const row = bar.querySelector('.mdb-theme-tag-row');
      const existing = [...row.querySelectorAll('.mdb-theme-merge-tag')].map(t => (t.dataset[attr] || '').toLowerCase());
      if (existing.includes(val.toLowerCase())) { input.value = ''; return; }
      const tag = document.createElement('span');
      tag.className = 'mdb-theme-merge-tag';
      tag.dataset[attr] = val;
      tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#111;color:#fff;border-radius:4px;font-size:0.8rem;font-weight:700;';
      tag.innerHTML = `${val}<span style="cursor:pointer;opacity:0.6;font-size:0.75rem;margin-left:2px;" onclick="this.closest('.mdb-theme-merge-tag').remove();mdbUpdateBarCount(this.closest('.mdb-theme-merge-bar'),'${attr}','${suffix}');">✕</span>`;
      row.appendChild(tag);
      input.value = '';
      mdbUpdateBarCount(bar, attr, suffix);
    }

    function mdbReadBar(bar, attr) {
      if (!bar || bar.style.display === 'none') return null;
      return [...bar.querySelectorAll(`.mdb-theme-merge-tag[data-${attr}]`)].map(t => t.dataset[attr]).filter(Boolean);
    }

    // ---- wire toggle button for a bar ----
    function mdbWireToggle(btn, bar) {
      btn.onclick = function () {
        const open = bar.style.display !== 'none';
        bar.style.display = open ? 'none' : '';
        btn.style.background = open ? '#fff' : '#111';
        btn.style.color = open ? '#111' : '#fff';
      };
    }

    function mdbMakeDupGroup(group) {
      const allThemes = mdbCollectAllThemes(group);
      const allPOS = mdbCollectAllPOS(group);

      const div = document.createElement('div');
      div.className = 'mdb-dup-group';

      // --- header ---
      const header = document.createElement('div');
      header.className = 'mdb-dup-group-header';
      header.innerHTML = `
        <div>
          <div class="mdb-dup-group-label">"${group[0].word}"</div>
          <div class="mdb-dup-group-sub">${group.length} entries with identical spelling</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="mdb-dup-merge-btn mdb-btn-merge-themes" style="background:#fff;color:#111;border:2px solid #111;" title="Merge all themes into an array">🏷️ Merge Themes</button>
          <button class="mdb-dup-merge-btn mdb-btn-merge-pos"    style="background:#fff;color:#111;border:2px solid #111;" title="Merge all word types into an array">📝 Merge Types</button>
          <button class="mdb-dup-merge-btn" title="Keep the richest entry and auto-merge themes &amp; types">⚡ Keep Best Entry</button>
        </div>
      `;
      div.appendChild(header);

      // --- theme merge bar ---
      const themeBar = mdbMakeMergeBar({
        label: 'Combined theme array — will be applied to the kept entry:',
        tagDataAttr: 'theme', items: allThemes,
        addPlaceholder: 'Add a theme…', countSuffix: 'theme',
      });
      div.appendChild(themeBar);

      // --- POS merge bar ---
      const posBar = mdbMakeMergeBar({
        label: 'Combined word-type (partOfSpeech) array — will be applied to the kept entry:',
        tagDataAttr: 'pos', items: allPOS,
        addPlaceholder: 'Add a type… (e.g. noun)', countSuffix: 'type',
      });
      posBar.style.borderTop = allThemes.length ? '1px solid #e8e8e8' : '';
      div.appendChild(posBar);

      // wire toggles
      mdbWireToggle(header.querySelector('.mdb-btn-merge-themes'), themeBar);
      mdbWireToggle(header.querySelector('.mdb-btn-merge-pos'), posBar);

      // wire Keep Best Entry
      const bestBtn = header.querySelectorAll('.mdb-dup-merge-btn')[2];
      bestBtn.onclick = function () { mdbAutoMergeWordGroup(bestBtn, group[0].word.toLowerCase(), themeBar, posBar); };

      // --- items ---
      const container = document.createElement('div');
      container.className = 'mdb-dup-items-container';
      group.forEach((w, i) => {
        const item = document.createElement('div');
        item.className = 'mdb-dup-item';
        const themes = getItemThemes(w).join(', ') || '—';
        const posVal = Array.isArray(w.partOfSpeech) ? w.partOfSpeech.join(', ') : (w.partOfSpeech || '—');
        const isCustom = mdbIsCustomWord(w.word);
        item.innerHTML = `
          <div>
            <div class="mdb-dup-item-word">${w.word} ${isCustom ? '<span class="mdb-badge mdb-badge-custom" style="font-size:0.65rem;">custom</span>' : ''}</div>
            <div class="mdb-dup-item-details">
              ${w.level ? `<strong>${w.level.toUpperCase()}</strong> · ` : ''}<span style="color:#555;">Type: ${posVal}</span><br>
              <span style="color:#bbb;font-size:0.78rem;">Themes: ${themes}</span><br>
              ${_firstVal(w.definition) ? _firstVal(w.definition).substring(0, 100) + (_firstVal(w.definition).length > 100 ? '…' : '') : '<em style="color:#ccc;">No definition</em>'}
            </div>
          </div>
          <button class="mdb-dup-keep-btn">Keep this</button>
        `;
        const btn = item.querySelector('.mdb-dup-keep-btn');
        btn.onclick = function () { mdbKeepThisEntry(btn, group, i, themeBar, posBar); };
        container.appendChild(item);
      });
      div.appendChild(container);
      return div;
    }

    // kept for backward-compat (theme-only helper, now unused but safe)
    function mdbUpdateMergeTagCount(bar) { mdbUpdateBarCount(bar, 'theme', 'theme'); }
    function mdbAddMergeTheme(input) { mdbAddMergeTag(input, 'theme', 'theme'); }
    function mdbReadMergeBarThemes(bar) { return mdbReadBar(bar, 'theme'); }

    function mdbMakeThemeGroup(theme, words) {
      const div = document.createElement('div');
      div.className = 'mdb-dup-group';
      div.innerHTML = `
        <div class="mdb-dup-group-header">
          <div>
            <div class="mdb-dup-group-label">Theme: "${theme}"</div>
            <div class="mdb-dup-group-sub">${words.length} words share this theme</div>
          </div>
        </div>
        <div style="padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;">
          ${words.map(w => `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid #ddd;border-radius:4px;font-size:0.88rem;font-weight:600;background:#fff;">
            ${w.word}
            <button onclick="mdbDeleteOne('${w.word.toLowerCase().replace(/'/g, "\\'")}'); this.closest('.mdb-dup-group').style.opacity='0.5';" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:0.9rem;padding:0 2px;" title="Delete this word">🗑</button>
          </span>`).join('')}
        </div>
      `;
      return div;
    }

    function mdbKeepThisEntry(btn, group, keepIdx, themeBar, posBar) {
      const container = btn.closest('.mdb-dup-items-container');
      container.querySelectorAll('.mdb-dup-keep-btn').forEach(b => {
        b.classList.remove('mdb-kept'); b.textContent = 'Keep this'; b.disabled = false;
      });
      btn.classList.add('mdb-kept'); btn.textContent = '✓ Keeping'; btn.disabled = true;

      const mergedThemes = mdbReadBar(themeBar, 'theme');
      const mergedPOS = mdbReadBar(posBar, 'pos');

      if (mergedThemes || mergedPOS) {
        mdbApplyMerged(group[keepIdx].word.toLowerCase(), mergedThemes, mergedPOS);
        if (mergedThemes) group[keepIdx].theme = mergedThemes;
        if (mergedPOS) group[keepIdx].partOfSpeech = mergedPOS.length === 1 ? mergedPOS[0] : mergedPOS;
      }

      const toDelete = group.filter((_, i) => i !== keepIdx).map(w => w.word.toLowerCase());
      if (!toDelete.length) return;

      const parts = [];
      if (mergedThemes && mergedThemes.length) parts.push(`themes [${mergedThemes.join(', ')}]`);
      if (mergedPOS && mergedPOS.length) parts.push(`types [${mergedPOS.join(', ')}]`);
      const confirmMsg = parts.length
        ? `Merge ${parts.join(' and ')} into "${group[keepIdx].word}" and delete ${toDelete.length} duplicate${toDelete.length === 1 ? '' : 's'}?`
        : `Delete ${toDelete.length} duplicate entr${toDelete.length === 1 ? 'y' : 'ies'}?`;

      mdbPendingDelete = toDelete;
      document.getElementById('mdb-confirm-msg').textContent = confirmMsg;
      document.getElementById('mdb-confirm-bar').classList.add('active');
    }

    function mdbAutoMergeWordGroup(btn, wordLower, themeBar, posBar) {
      const group = vocabBank.filter(w => w.word && w.word.toLowerCase() === wordLower);
      if (group.length < 2) return;
      const scored = group.map(w => ({
        w, score: (w.definition ? 1 : 0) + (w.example ? 1 : 0) + (w.ipa ? 1 : 0) + (w.translation ? 1 : 0) + (w.synonyms?.length || 0)
      }));
      scored.sort((a, b) => b.score - a.score);
      const keepIdx = group.indexOf(scored[0].w);
      const container = btn.closest('.mdb-dup-group').querySelector('.mdb-dup-items-container');
      const keepBtns = container.querySelectorAll('.mdb-dup-keep-btn');
      // Auto-open both bars
      [{ bar: themeBar, btnClass: '.mdb-btn-merge-themes' }, { bar: posBar, btnClass: '.mdb-btn-merge-pos' }].forEach(({ bar, btnClass }) => {
        if (bar && bar.style.display === 'none') {
          bar.style.display = '';
          const tb = btn.closest('.mdb-dup-group').querySelector(btnClass);
          if (tb) { tb.style.background = '#111'; tb.style.color = '#fff'; }
        }
      });
      if (keepBtns[keepIdx]) mdbKeepThisEntry(keepBtns[keepIdx], group, keepIdx, themeBar, posBar);
    }


  Board.db = Board.db || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.awLoadCustomWords = global.awLoadCustomWords = awLoadCustomWords;
  window.awGetCustomWords = global.awGetCustomWords = awGetCustomWords;
  window.awSaveCustomWords = global.awSaveCustomWords = awSaveCustomWords;
  window.detNavNext = global.detNavNext = detNavNext;
  window.detNavPrev = global.detNavPrev = detNavPrev;
  window.detNavBack = global.detNavBack = detNavBack;
  window.detToggleEdit = global.detToggleEdit = detToggleEdit;
  window.detZoom = global.detZoom = detZoom;
  window.detCancelEdit = global.detCancelEdit = detCancelEdit;
  window.detSaveEdit = global.detSaveEdit = detSaveEdit;
  window.detDeleteEdit = global.detDeleteEdit = detDeleteEdit;
  window.hideWordDetail = global.hideWordDetail = hideWordDetail;
  window.showWordDetail = global.showWordDetail = showWordDetail;
  window.showCurrentWordDetail = global.showCurrentWordDetail = showCurrentWordDetail;
  window.conToggleClassDropdown = global.conToggleClassDropdown = conToggleClassDropdown;
  window.conCloseClassDropdown = global.conCloseClassDropdown = conCloseClassDropdown;
  window.conUpdateClassDropdownButton = global.conUpdateClassDropdownButton = conUpdateClassDropdownButton;
  window.initClassGroupSelector = global.initClassGroupSelector = initClassGroupSelector;
  window.conUpdateRenameButtonVisibility = global.conUpdateRenameButtonVisibility = conUpdateRenameButtonVisibility;
  window.conRenameCurrentFileFromInput = global.conRenameCurrentFileFromInput = conRenameCurrentFileFromInput;
  window.bpOpen = global.bpOpen = bpOpen;
  window.bpClose = global.bpClose = bpClose;
  window.bpClear = global.bpClear = bpClear;
  window.bpShowAll = global.bpShowAll = bpShowAll;
  window.bpAllClose = global.bpAllClose = bpAllClose;
  window.populateAllThemeMenus = global.populateAllThemeMenus = populateAllThemeMenus;
  window.renderTeamSetup = global.renderTeamSetup = renderTeamSetup;
  window.renderMainScoreboard = global.renderMainScoreboard = renderMainScoreboard;
  window.scheduleCustomDatabasesInit = global.scheduleCustomDatabasesInit = scheduleCustomDatabasesInit;
  window.getItemThemes = global.getItemThemes = getItemThemes;
  window.getThemeIndex = global.getThemeIndex = getThemeIndex;
  window.invalidateThemeIndex = global.invalidateThemeIndex = invalidateThemeIndex;

  window.boardT = global.boardT = boardT;
  window.initCustomDatabases = global.initCustomDatabases = initCustomDatabases;
  window._customDbInitPromise = global._customDbInitPromise = _customDbInitPromise;
  window.awDownloadDB = global.awDownloadDB = awDownloadDB;
  window.applyFontSize = global.applyFontSize = applyFontSize;
  window._customDbSources = global._customDbSources = _customDbSources;
  window.getTranslation = global.getTranslation = getTranslation;
  window._allVals = global._allVals = _allVals;
  window._splitFrenchTranslations = global._splitFrenchTranslations = _splitFrenchTranslations;
  window.setActiveClassGroup = global.setActiveClassGroup = setActiveClassGroup;
  window.bpSetFromEntryId = global.bpSetFromEntryId = bpSetFromEntryId;
  window.bpGetAllEntries = global.bpGetAllEntries = bpGetAllEntries;
  window.bpBuildLabel = global.bpBuildLabel = bpBuildLabel;
  window.bpUpdateBtn = global.bpUpdateBtn = bpUpdateBtn;

  window.themeTagRemove = global.themeTagRemove = themeTagRemove;
  window.awEditWord = global.awEditWord = awEditWord;
  window.awDeleteWord = global.awDeleteWord = awDeleteWord;
  window.awSubmitForm = global.awSubmitForm = awSubmitForm;
  window.awCancelEdit = global.awCancelEdit = awCancelEdit;
  window.awEditQuote = global.awEditQuote = awEditQuote;
  window.awDeleteQuote = global.awDeleteQuote = awDeleteQuote;
  window.awSubmitQuote = global.awSubmitQuote = awSubmitQuote;
  window.awCancelEditQuote = global.awCancelEditQuote = awCancelEditQuote;
  window.awEditGap = global.awEditGap = awEditGap;
  window.awDeleteGap = global.awDeleteGap = awDeleteGap;
  window.awSubmitGap = global.awSubmitGap = awSubmitGap;
  window.awCancelEditGap = global.awCancelEditGap = awCancelEditGap;
  window.awEditError = global.awEditError = awEditError;
  window.awDeleteError = global.awDeleteError = awDeleteError;
  window.awSubmitError = global.awSubmitError = awSubmitError;
  window.awCancelEditError = global.awCancelEditError = awCancelEditError;
  window.mdbUpdateMergePreview = global.mdbUpdateMergePreview = mdbUpdateMergePreview;
  window.mdbToggleWord = global.mdbToggleWord = mdbToggleWord;
  window.mdbDeleteOne = global.mdbDeleteOne = mdbDeleteOne;
  window.mdbOpenEditWord = global.mdbOpenEditWord = mdbOpenEditWord;
  window.mdbShowMoreWords = global.mdbShowMoreWords = mdbShowMoreWords;
  window.mdbUpdateBarCount = global.mdbUpdateBarCount = mdbUpdateBarCount;
  window.mdbAddMergeTag = global.mdbAddMergeTag = mdbAddMergeTag;

  try {
    Object.defineProperty(window, 'activeClassGroup', {
      get: function() { return activeClassGroup; },
      set: function(v) { activeClassGroup = v; },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, 'activePlannerEntryId', {
      get: function() { return activePlannerEntryId; },
      set: function(v) { activePlannerEntryId = v; },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, '_conPendingDuplicateRelinkRename', {
      get: function() { return _conPendingDuplicateRelinkRename; },
      set: function(v) { _conPendingDuplicateRelinkRename = v; },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, 'teams', {
      get: function() { return teams; },
      set: function(v) { teams = v; },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, 'currentTeamIdx', {
      get: function() { return currentTeamIdx; },
      set: function(v) { currentTeamIdx = v; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    window.activeClassGroup = activeClassGroup;
    window.activePlannerEntryId = activePlannerEntryId;
    window._conPendingDuplicateRelinkRename = _conPendingDuplicateRelinkRename;
    window.teams = teams;
    window.currentTeamIdx = currentTeamIdx;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initClassGroupSelector();
      });
    } else {
      initClassGroupSelector();
    }
  }
  if (global.__boardUserBootstrapPromise) {
    Promise.resolve(global.__boardUserBootstrapPromise).then(function () {
      initClassGroupSelector();
    }).catch(function () {});
  }

})(typeof window !== "undefined" ? window : this);