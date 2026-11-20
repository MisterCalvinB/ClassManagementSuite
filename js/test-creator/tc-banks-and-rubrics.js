'use strict';

// Test Creator — Drawer Banks, Criteria/Rubrics, Competences & Grading Scales
var _cachedTestExercises = [];
var _allCriteriaBanks = [];
var _cachedCriteria = [];
var _cachedCompetences = [];
var _currentRenderedCompetences = [];
var _currentRenderedCriteria = [];
var _cachedLearningItems = [];
var _targetAttachExId = '__exam__';


async function tcLoadDrawerContent() {
  if (!window.Desktop || !window.Desktop.isElectron) return;
  try {
    if (activeDrawerTab === 'testbank') {
      var res = await window.Desktop.readJson('customExercises', 'custom-test-exercises.json');
      _cachedTestExercises = (res && res.ok && Array.isArray(res.data)) ? res.data : [];
      tcRenderTestBankList(_cachedTestExercises);
    } else if (activeDrawerTab === 'learningdb') {
      await tcLoadLearningDbSource();
    } else if (activeDrawerTab === 'criteriadb') {
      await tcLoadAvailableCriteriaBanks();
    } else if (activeDrawerTab === 'competences') {
      if (window.CompetenceAggregatorService) {
        _cachedCompetences = await window.CompetenceAggregatorService.loadAllCompetences();
        tcPopulateCompFilterDropdownOptions();
        tcFilterCompetences();
      }
    } else if (activeDrawerTab === 'scales') {
      await tcLoadAvailableScaleBanks();
    }
    tcLoadAllAvailableSubjects();
  } catch (e) {
    console.warn('Error loading drawer data:', e);
  }
}

// ── Drawer Tab 1: Test Bank ───────────────────────────────────────────
function tcRenderTestBankList(list) {
  var el = document.getElementById('testBankList');
  if (!list || !list.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#888;font-size:0.8rem;">' + escapeHtml(i18n.t('tcNoSavedExercises')) + '</div>';
    return;
  }
  el.innerHTML = list.map(function (item) {
    var typeMeta = (TestCreatorService.EXERCISE_TYPES || []).find(function (t) { return t.id === item.type; });
    var typeLbl = typeMeta ? typeMeta.name : (item.type || 'task');
    return '<div class="drawer-item-card" onclick="tcInsertDbExercise(\'' + item.id + '\')">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">' +
      '    <span style="font-weight:800;font-size:0.85rem;">' + escapeHtml(item.title || typeLbl) + '</span>' +
      '    <span style="font-size:0.75rem;background:#111;color:#fff;padding:1px 5px;border-radius:3px;white-space:nowrap;">' + escapeHtml(typeLbl) + '</span>' +
      '  </div>' +
      '  <div style="font-size:0.75rem;color:#64748b;font-style:italic;">' + escapeHtml(item.instructions || 'Click to insert into exam') + '</div>' +
      '</div>';
  }).join('');
}

window.tcInsertDbExercise = function (exId) {
  var item = _cachedTestExercises.find(function (e) { return e.id === exId; });
  if (!item) return;
  if (item.type === 'section_header') {
    var hdrData = item.content || {};
    if (hdrData.headerConfig) {
      currentTest.headerConfig = JSON.parse(JSON.stringify(hdrData.headerConfig));
    }
    if (Array.isArray(hdrData.materialsAllowed)) {
      currentTest.materialsAllowed = hdrData.materialsAllowed.slice();
    }
    if (typeof tcSyncHeaderBlockFromState === 'function') tcSyncHeaderBlockFromState();
    tcOnDirty();
    tcScheduleLivePreviewUpdate();
    if (window.showToast) showToast(i18n.tFmt('tcInsertedIntoTest', { title: item.title || 'Header' }));
    return;
  }
  var clone = JSON.parse(JSON.stringify(item));
  clone.id = TestCreatorService.createEmptyExercise('cloze').id;
  currentTest.exercises.push(clone);
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
  if (window.showToast) showToast(i18n.tFmt('tcInsertedIntoTest', { title: clone.title || i18n.t('tcExercise') }));
};

window.tcFilterTestBank = function () {
  var q = (document.getElementById('drawerTestBankSearch').value || '').trim().toLowerCase();
  if (!q) {
    tcRenderTestBankList(_cachedTestExercises);
    return;
  }
  var filtered = _cachedTestExercises.filter(function (e) {
    var t = (e.title || '').toLowerCase();
    var p = (e.prompt || '').toLowerCase();
    var ty = (e.type || '').toLowerCase();
    return t.indexOf(q) !== -1 || p.indexOf(q) !== -1 || ty.indexOf(q) !== -1;
  });
  tcRenderTestBankList(filtered);
};

// ── Drawer Tab 2: Learning Database ───────────────────────────────────
function getWordThemes(item) {
  if (!item) return [];
  var raw = item.theme || item.themes || [];
  if (Array.isArray(raw)) return raw.map(function (t) { return String(t).trim(); }).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
  return [];
}

function getWordKeywords(item) {
  if (!item) return [];
  var raw = item.keywords || item.keyword || [];
  if (Array.isArray(raw)) return raw.map(function (k) { return String(k).trim(); }).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(function (k) { return k.trim(); }).filter(Boolean);
  return [];
}

window.tcLoadLearningDbSource = async function () {
  var sel = document.getElementById('learningDbSource');
  var type = sel ? sel.value : 'gapfillbanks';
  var listEl = document.getElementById('learningDbList');
  var wbFilterBar = document.getElementById('wordbankFilterBar');

  if (wbFilterBar) {
    wbFilterBar.style.display = (type === 'wordbanks') ? 'flex' : 'none';
  }

  if (listEl) {
    listEl.innerHTML = '<div style="font-size:0.8rem;color:#888;text-align:center;padding:20px;">Loading ' + type + '…</div>';
  }

  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);
  if (!isElec) {
    _cachedLearningItems = [];
    tcRenderLearningDbList(_cachedLearningItems, type);
    return;
  }

  var targetMap = {
    gapfillbanks: { target: 'customGapfillbanks', defaultFile: 'gapFillBank.js' },
    quizzes: { target: 'customQuizzes', defaultFile: 'quiz.js' },
    grammarbanks: { target: 'customGrammarbanks', defaultFile: 'grammar.js' },
    wordbanks: { target: 'customWordbanks', defaultFile: 'wordDb.js' },
    dictations: { target: 'customDictations', defaultFile: 'dictation.js' },
    errorbanks: { target: 'customErrorbanks', defaultFile: 'errorBank.js' }
  };

  var cfg = targetMap[type] || targetMap.gapfillbanks;
  var items = [];

  try {
    var fileList = await window.Desktop.listFiles(cfg.target, { extensions: ['.js', '.json'] });
    var files = Array.isArray(fileList) ? fileList : ((fileList && Array.isArray(fileList.files)) ? fileList.files : []);
    
    var candidateFiles = files.map(function (f) {
      return typeof f === 'string' ? f : (f.filename || f.name);
    }).filter(function (fn) {
      return fn && !fn.endsWith('.bak') && fn !== 'simple-wiktionary-core.zip' && fn !== 'barrasDb.js';
    });

    if (type === 'wordbanks') {
      ['wordDb.js', 'simple-wiktionary-core.js', 'phrasalVerbs.js', 'simple-wiktionary.js'].forEach(function (wbf) {
        if (candidateFiles.indexOf(wbf) !== -1) {
          candidateFiles = [wbf].concat(candidateFiles.filter(function (f) { return f !== wbf; }));
        }
      });
    } else if (candidateFiles.indexOf(cfg.defaultFile) !== -1) {
      candidateFiles = [cfg.defaultFile].concat(candidateFiles.filter(function (f) { return f !== cfg.defaultFile; }));
    } else if (candidateFiles.length === 0 && cfg.defaultFile) {
      candidateFiles = [cfg.defaultFile];
    }

    for (var i = 0; i < Math.min(candidateFiles.length, 10); i++) {
      var fn = candidateFiles[i];
      try {
        var r = await window.Desktop.readText(cfg.target, fn);
        if (r && r.ok && r.content) {
          var parsed = parseGenericBankContent(r.content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(function (it) {
              if (it && typeof it === 'object') {
                it._sourceFile = fn;
                items.push(it);
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error loading bank file:', fn, err);
      }
    }

    // Fallback check for wordDb.js in customData or data if items empty for wordbanks
    if (type === 'wordbanks' && items.length === 0) {
      try {
        var altRes = await window.Desktop.readByPath('customData', 'wordbanks/wordDb.js');
        if (altRes && altRes.ok && altRes.content) {
          var parsedAlt = parseGenericBankContent(altRes.content);
          if (Array.isArray(parsedAlt)) {
            parsedAlt.forEach(function (it) {
              if (it && typeof it === 'object') {
                it._sourceFile = 'wordDb.js';
                items.push(it);
              }
            });
          }
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn('Error reading learning DB source:', e);
  }

  _cachedLearningItems = items;

  if (type === 'wordbanks') {
    tcPopulateWordbankFilterDropdowns(items);
  }

  tcFilterLearningDb();
};

function tcPopulateWordbankFilterDropdowns(items) {
  var themesSet = new Set();
  var keywordsSet = new Set();
  var sourcesSet = new Set();
  var lettersSet = new Set();
  var posSet = new Set();

  (items || []).forEach(function (it) {
    getWordThemes(it).forEach(function (t) { if (t) themesSet.add(t); });
    getWordKeywords(it).forEach(function (k) { if (k) keywordsSet.add(k); });
    if (it._sourceFile) sourcesSet.add(it._sourceFile);
    if (it.word && it.word[0]) lettersSet.add(it.word[0].toUpperCase());
    var pos = it.partOfSpeech || it.pos || it.type;
    if (pos) {
      if (Array.isArray(pos)) pos.forEach(function (p) { if (p) posSet.add(String(p).trim()); });
      else posSet.add(String(pos).trim());
    }
  });

  function populateSelect(id, allLabel, setVals) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var cur = sel.value || 'all';
    var opts = ['<option value="all">' + escapeHtml(allLabel) + '</option>'];
    Array.from(setVals).sort().forEach(function (v) {
      opts.push('<option value="' + escapeAttr(v) + '"' + (v === cur ? ' selected' : '') + '>' + escapeHtml(v) + '</option>');
    });
    sel.innerHTML = opts.join('');
  }

  populateSelect('wbThemeFilter', 'All Themes (' + themesSet.size + ')', themesSet);
  populateSelect('wbKeywordFilter', 'All Keywords (' + keywordsSet.size + ')', keywordsSet);
  populateSelect('wbSourceFilter', 'All Sources (' + sourcesSet.size + ')', sourcesSet);
  populateSelect('wbLetterFilter', 'All Letters (A-Z)', lettersSet);
  populateSelect('wbPosFilter', 'All Types / POS', posSet);
}

function parseGenericBankContent(content) {
  if (!content || typeof content !== 'string') return [];
  var trimmed = content.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      var p = JSON.parse(trimmed);
      if (Array.isArray(p)) return p;
    } catch (_) {}
  }
  var match = content.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\[|\{)/);
  if (match) {
    try {
      var fn = new Function(content + '\n;try{return ' + match[1] + ';}catch(e){return [];}');
      var res = fn();
      if (Array.isArray(res)) return res;
      if (res && typeof res === 'object') {
        if (Array.isArray(res.records)) return res.records;
        if (Array.isArray(res.items)) return res.items;
        return Object.values(res);
      }
    } catch (_) {}
  }
  return [];
}

function tcRenderLearningDbList(list, type) {
  var el = document.getElementById('learningDbList');
  if (!list || !list.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#888;font-size:0.8rem;">' + escapeHtml(i18n.t('tcNoLearningDbRecords')) + '</div>';
    return;
  }
  el.innerHTML = list.slice(0, 150).map(function (item, idx) {
    if (type === 'wordbanks') {
      var themes = getWordThemes(item);
      var pos = item.partOfSpeech || item.pos || item.type || '';
      var lvl = item.level || '';
      var src = item._sourceFile || '';
      var ipa = item.ipa ? ' /' + item.ipa.replace(/^\/|\/$/g, '') + '/' : '';
      var tr = item.french || item.translation || '';
      var def = Array.isArray(item.definition) ? item.definition.join('; ') : (item.definition || '');

      var badgeHtml = '<div class="wb-card-badges">';
      if (pos) badgeHtml += '<span class="wb-badge wb-badge-pos">' + escapeHtml(String(pos)) + '</span>';
      if (lvl) badgeHtml += '<span class="wb-badge wb-badge-level">' + escapeHtml(String(lvl)) + '</span>';
      if (themes.length) badgeHtml += '<span class="wb-badge wb-badge-theme">' + escapeHtml(themes.slice(0, 2).join(', ')) + '</span>';
      if (src) badgeHtml += '<span class="wb-badge wb-badge-source">' + escapeHtml(String(src)) + '</span>';
      badgeHtml += '</div>';

      var origIdx = _cachedLearningItems.indexOf(item);
      if (origIdx === -1) origIdx = idx;

      return '<div class="drawer-item-card" onclick="tcOpenDrawerItemModal(' + origIdx + ')">' +
        '  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">' +
        '    <div>' +
        '      <span style="font-weight:800;font-size:0.86rem;line-height:1.2;">' + escapeHtml(item.word || 'Word') + '</span>' +
        (ipa ? ' <span style="font-size:0.75rem;color:#64748b;font-family:monospace;">' + escapeHtml(ipa) + '</span>' : '') +
        '    </div>' +
        '    <button type="button" class="neo-btn sm" style="padding:1px 6px;font-size:0.75rem;flex-shrink:0;" onclick="event.stopPropagation(); tcInsertLearningDbItem(' + origIdx + ')" title="Quick Add Exercise">+ Add</button>' +
        '  </div>' +
        badgeHtml +
        (tr ? '  <div style="font-size:0.76rem;font-weight:700;color:#1e40af;margin-top:3px;">' + escapeHtml(tr) + '</div>' : '') +
        (def ? '  <div style="font-size:0.74rem;color:#475569;margin-top:2px;line-height:1.3;">' + escapeHtml(def.slice(0, 90) + (def.length > 90 ? '…' : '')) + '</div>' : '') +
        '</div>';
    }

    var title = '';
    var subtitle = '';
    if (type === 'gapfillbanks') {
      title = item.sentence || 'Gap Fill';
      subtitle = 'Gap: [' + (item.removedWord || '...') + ']';
    } else if (type === 'quizzes') {
      title = item.question || 'Quiz Question';
      subtitle = 'Answer: ' + (item.answer || item['answer ' + (item.solution || '1')] || 'Option ' + (item.solution || '1'));
    } else if (type === 'errorbanks') {
      title = item.erroneous || 'Error Item';
      subtitle = 'Correct: ' + (item.correct || '...');
    } else if (type === 'dictations') {
      title = item.title || item.id || 'Dictation';
      subtitle = (item.text ? item.text.slice(0, 80) + '…' : (item.level ? 'Level: ' + item.level : ''));
    } else {
      title = item.topic || item.title || item.name || 'Item ' + (idx + 1);
      subtitle = item.category || item.rule || item.description || '';
    }

    var oIdx = _cachedLearningItems.indexOf(item);
    if (oIdx === -1) oIdx = idx;

    return '<div class="drawer-item-card" onclick="tcOpenDrawerItemModal(' + oIdx + ')">' +
      '  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">' +
      '    <span style="font-weight:800;font-size:0.83rem;line-height:1.2;">' + escapeHtml(title) + '</span>' +
      '    <button type="button" class="neo-btn sm" style="padding:1px 6px;font-size:0.75rem;flex-shrink:0;" onclick="event.stopPropagation(); tcInsertLearningDbItem(' + oIdx + ')" title="Quick Add Exercise">+ Add</button>' +
      '  </div>' +
      '  <div style="font-size:0.75rem;color:#64748b;margin-top:3px;">' + escapeHtml(subtitle) + '</div>' +
      '</div>';
  }).join('');
}

var _currentDrawerItemIdx = null;

window.tcOpenDrawerItemModal = function (idx) {
  var item = _cachedLearningItems[idx];
  if (!item) return;
  _currentDrawerItemIdx = idx;

  var modal = document.getElementById('drawerItemModal');
  var content = document.getElementById('drawerModalContent');
  if (!modal || !content) return;

  var word = item.word || item.title || item.name || '';
  var ipa = item.ipa ? item.ipa.replace(/^\/|\/$/g, '') : '';
  var tr = item.french || item.translation || '';
  var def = Array.isArray(item.definition) ? item.definition.join('; ') : (item.definition || '');
  var exSent = item.example || (Array.isArray(item.examples) ? item.examples.join('\n') : '') || item.sentence || '';
  var pos = item.partOfSpeech || item.pos || item.type || '';
  var lvl = item.level || '';
  var themes = typeof getWordThemes === 'function' ? getWordThemes(item) : [];

  var exs = currentTest.exercises || [];
  var targetOptsHtml = '';
  if (exs.length > 0) {
    targetOptsHtml = exs.map(function (e, eIdx) {
      var isSel = (window._lastActiveExerciseId && window._lastActiveExerciseId === e.id) || (!window._lastActiveExerciseId && eIdx === 0);
      return '<option value="' + e.id + '"' + (isSel ? ' selected' : '') + '>' +
        'Ex ' + (eIdx + 1) + ': ' + escapeHtml(e.title || 'Untitled') + ' (' + escapeHtml(e.type || 'exercise') + ')' +
        '</option>';
    }).join('');
  } else {
    targetOptsHtml = '<option value="">(No exercises created yet)</option>';
  }

  var html = [];

  // Header info card
  html.push('<div class="drawer-modal-header-info">');
  html.push('  <div class="drawer-modal-word-title">');
  html.push('    <span>' + escapeHtml(word || 'Item Details') + '</span>');
  if (ipa) {
    html.push('    <span class="drawer-modal-ipa">/' + escapeHtml(ipa) + '/</span>');
  }
  html.push('  </div>');
  html.push('  <div class="wb-card-badges">');
  if (pos) html.push('    <span class="wb-badge wb-badge-pos">' + escapeHtml(String(pos)) + '</span>');
  if (lvl) html.push('    <span class="wb-badge wb-badge-level">' + escapeHtml(String(lvl)) + '</span>');
  if (themes.length) html.push('    <span class="wb-badge wb-badge-theme">' + escapeHtml(themes.slice(0, 3).join(', ')) + '</span>');
  if (item._sourceFile) html.push('    <span class="wb-badge wb-badge-source">' + escapeHtml(String(item._sourceFile)) + '</span>');
  html.push('  </div>');
  html.push('</div>');

  // Individual copyable elements list
  html.push('<div class="drawer-elements-list">');

  // Word
  if (word) {
    html.push('  <div class="drawer-element-row">');
    html.push('    <div style="flex:1;">');
    html.push('      <div class="drawer-element-label">' + (t('tcWord') || 'Word / Term') + '</div>');
    html.push('      <div class="drawer-element-val" style="font-weight:800;">' + escapeHtml(word) + '</div>');
    html.push('    </div>');
    html.push('    <div style="display:flex;gap:4px;flex-shrink:0;">');
    html.push('      <button type="button" class="neo-btn sm" onclick="tcCopyTextToClipboard(\'' + escapeAttr(word) + '\')">📋 ' + (t('tcCopyWord') || 'Copy Word') + '</button>');
    html.push('      <button type="button" class="neo-btn sm primary" onclick="tcInsertElementIntoExercise(\'word\')">↳ ' + (t('tcInsert') || 'Insert') + '</button>');
    html.push('    </div>');
    html.push('  </div>');
  }

  // IPA
  if (ipa) {
    var ipaFull = '/' + ipa + '/';
    html.push('  <div class="drawer-element-row">');
    html.push('    <div style="flex:1;">');
    html.push('      <div class="drawer-element-label">' + (t('tcIPA') || 'IPA Phonetic Pronunciation') + '</div>');
    html.push('      <div class="drawer-element-val" style="font-family:monospace;">' + escapeHtml(ipaFull) + '</div>');
    html.push('    </div>');
    html.push('    <div style="display:flex;gap:4px;flex-shrink:0;">');
    html.push('      <button type="button" class="neo-btn sm" onclick="tcCopyTextToClipboard(\'' + escapeAttr(ipaFull) + '\')">📋 ' + (t('tcCopyIpa') || 'Copy IPA') + '</button>');
    html.push('      <button type="button" class="neo-btn sm primary" onclick="tcInsertElementIntoExercise(\'ipa\')">↳ ' + (t('tcInsert') || 'Insert') + '</button>');
    html.push('    </div>');
    html.push('  </div>');
  }

  // Definition
  if (def) {
    html.push('  <div class="drawer-element-row">');
    html.push('    <div style="flex:1;">');
    html.push('      <div class="drawer-element-label">' + (t('tcDefinition') || 'Definition') + '</div>');
    html.push('      <div class="drawer-element-val">' + escapeHtml(def) + '</div>');
    html.push('    </div>');
    html.push('    <div style="display:flex;gap:4px;flex-shrink:0;">');
    html.push('      <button type="button" class="neo-btn sm" onclick="tcCopyTextToClipboard(\'' + escapeAttr(def) + '\')">📋 ' + (t('tcCopyDef') || 'Copy Definition') + '</button>');
    html.push('      <button type="button" class="neo-btn sm primary" onclick="tcInsertElementIntoExercise(\'def\')">↳ ' + (t('tcInsert') || 'Insert') + '</button>');
    html.push('    </div>');
    html.push('  </div>');
  }

  // Translation
  if (tr) {
    html.push('  <div class="drawer-element-row">');
    html.push('    <div style="flex:1;">');
    html.push('      <div class="drawer-element-label">' + (t('tcTranslation') || 'Translation') + '</div>');
    html.push('      <div class="drawer-element-val" style="color:#1e40af;font-weight:700;">' + escapeHtml(tr) + '</div>');
    html.push('    </div>');
    html.push('    <div style="display:flex;gap:4px;flex-shrink:0;">');
    html.push('      <button type="button" class="neo-btn sm" onclick="tcCopyTextToClipboard(\'' + escapeAttr(tr) + '\')">📋 ' + (t('tcCopyTr') || 'Copy Translation') + '</button>');
    html.push('      <button type="button" class="neo-btn sm primary" onclick="tcInsertElementIntoExercise(\'translation\')">↳ ' + (t('tcInsert') || 'Insert') + '</button>');
    html.push('    </div>');
    html.push('  </div>');
  }

  // Example sentence
  if (exSent) {
    html.push('  <div class="drawer-element-row">');
    html.push('    <div style="flex:1;">');
    html.push('      <div class="drawer-element-label">' + (t('tcExample') || 'Example Sentence') + '</div>');
    html.push('      <div class="drawer-element-val" style="font-style:italic;">' + escapeHtml(exSent) + '</div>');
    html.push('    </div>');
    html.push('    <div style="display:flex;gap:4px;flex-shrink:0;">');
    html.push('      <button type="button" class="neo-btn sm" onclick="tcCopyTextToClipboard(\'' + escapeAttr(exSent) + '\')">📋 ' + (t('tcCopy') || 'Copy') + '</button>');
    html.push('      <button type="button" class="neo-btn sm primary" onclick="tcInsertElementIntoExercise(\'example\')">↳ ' + (t('tcInsert') || 'Insert') + '</button>');
    html.push('    </div>');
    html.push('  </div>');
  }

  html.push('</div>');

  // Copy all / combined
  var combinedText = word + (ipa ? ' /' + ipa + '/' : '') + (tr ? ' — ' + tr : '') + (def ? '\nDef: ' + def : '') + (exSent ? '\nEx: ' + exSent : '');
  html.push('<div style="display:flex;justify-content:flex-end;margin-top:6px;">');
  html.push('  <button type="button" class="neo-btn sm" onclick="tcCopyTextToClipboard(\'' + escapeAttr(combinedText) + '\')">📋 ' + (t('tcCopyAll') || 'Copy All (Formatted)') + '</button>');
  html.push('</div>');

  // Section: Insert Straight into Exercise Card
  html.push('<div class="drawer-insert-section">');
  html.push('  <div style="display:flex;flex-direction:column;gap:4px;">');
  html.push('    <span class="field-label" style="font-weight:800;">' + (t('tcTargetExercise') || 'Target Exercise Card:') + '</span>');
  html.push('    <div style="display:flex;gap:6px;align-items:center;">');
  html.push('      <select id="drawerTargetExerciseSelect" class="meta-input" style="flex:1;">' + targetOptsHtml + '</select>');
  html.push('      <button type="button" class="neo-btn sm primary" onclick="tcAddDrawerItemAsExerciseSubItem()">' + (t('tcAddAsNewItem') || '+ Add as Exercise Item') + '</button>');
  html.push('    </div>');
  html.push('  </div>');

  // If an active field was focused, give button to paste straight into cursor position
  if (window._lastFocusedInput && document.body.contains(window._lastFocusedInput)) {
    html.push('  <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">');
    html.push('    <span style="font-size:0.75rem;font-weight:700;color:#64748b;">' + (t('tcInsertActiveField') || 'Active Field:') + '</span>');
    html.push('    <button type="button" class="neo-btn sm" onclick="tcInsertIntoActiveInput(\'' + escapeAttr(word) + '\')">Word</button>');
    if (ipa) html.push('    <button type="button" class="neo-btn sm" onclick="tcInsertIntoActiveInput(\'/' + escapeAttr(ipa) + '/\')">IPA</button>');
    if (def) html.push('    <button type="button" class="neo-btn sm" onclick="tcInsertIntoActiveInput(\'' + escapeAttr(def) + '\')">Definition</button>');
    if (tr) html.push('    <button type="button" class="neo-btn sm" onclick="tcInsertIntoActiveInput(\'' + escapeAttr(tr) + '\')">Translation</button>');
    html.push('  </div>');
  }
  html.push('</div>');

  content.innerHTML = html.join('');
  modal.style.display = 'flex';
};

window.tcCloseDrawerItemModal = function () {
  var modal = document.getElementById('drawerItemModal');
  if (modal) modal.style.display = 'none';
};

window.tcCopyTextToClipboard = function (text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      if (window.showToast) showToast(i18n.tFmt('tcCopiedText', { text: text.slice(0, 35) + (text.length > 35 ? '…' : '') }));
    }).catch(function () {
      tcFallbackCopy(text);
    });
  } else {
    tcFallbackCopy(text);
  }
};

function tcFallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (window.showToast) showToast(i18n.tFmt('tcCopiedText', { text: text.slice(0, 35) + (text.length > 35 ? '…' : '') }));
  } catch (_) {}
  document.body.removeChild(ta);
}

window.tcInsertElementIntoExercise = function (fieldKey) {
  if (_currentDrawerItemIdx === null) return;
  var item = _cachedLearningItems[_currentDrawerItemIdx];
  if (!item) return;
  var val = '';
  if (fieldKey === 'word') val = item.word || item.title || item.name || '';
  else if (fieldKey === 'ipa') val = item.ipa ? '/' + item.ipa.replace(/^\/|\/$/g, '') + '/' : '';
  else if (fieldKey === 'def') val = Array.isArray(item.definition) ? item.definition.join('; ') : (item.definition || '');
  else if (fieldKey === 'translation') val = item.french || item.translation || '';
  else if (fieldKey === 'example') val = item.example || (Array.isArray(item.examples) ? item.examples.join('\n') : '') || item.sentence || '';

  var targetSel = document.getElementById('drawerTargetExerciseSelect');
  var targetExId = targetSel ? targetSel.value : window._lastActiveExerciseId;
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === targetExId; });
  if (!ex) {
    if (window.showToast) showToast(i18n.t('tcSelectTargetExerciseFirst', 'Please select a target exercise card first'), true);
    return;
  }

  // If an input in this exercise was active, paste directly into it
  if (window._lastFocusedInput && document.body.contains(window._lastFocusedInput) && window._lastFocusedInput.closest('#card-' + ex.id)) {
    tcInsertIntoActiveInput(val);
    return;
  }

  // Otherwise, append to appropriate field of the exercise
  if (ex.type === 'matching') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.pairs)) ex.content.pairs = [];
    if (fieldKey === 'word') {
      ex.content.pairs.push({ left: val, right: '' });
    } else {
      if (ex.content.pairs.length > 0 && !ex.content.pairs[ex.content.pairs.length - 1].right) {
        ex.content.pairs[ex.content.pairs.length - 1].right = val;
      } else {
        ex.content.pairs.push({ left: '', right: val });
      }
    }
  } else if (ex.type === 'translation') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.items)) ex.content.items = [];
    if (fieldKey === 'word') {
      ex.content.items.push({ original: val, solution: '' });
    } else {
      if (ex.content.items.length > 0 && !ex.content.items[ex.content.items.length - 1].solution) {
        ex.content.items[ex.content.items.length - 1].solution = val;
      } else {
        ex.content.items.push({ original: '', solution: val });
      }
    }
  } else if (ex.type === 'open_question') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.questions)) ex.content.questions = [];
    if (fieldKey === 'word') {
      ex.content.questions.push({ prompt: 'Explain: ' + val, sampleAnswer: '' });
    } else if (fieldKey === 'def' || fieldKey === 'translation') {
      if (ex.content.questions.length > 0 && !ex.content.questions[ex.content.questions.length - 1].sampleAnswer) {
        ex.content.questions[ex.content.questions.length - 1].sampleAnswer = val;
      } else {
        ex.content.questions.push({ prompt: '', sampleAnswer: val });
      }
    } else {
      ex.prompt = (ex.prompt ? ex.prompt + ' ' : '') + val;
    }
  } else {
    ex.prompt = (ex.prompt ? ex.prompt + ' ' : '') + val;
  }

  renderExerciseCards();
  tcOnDirty();
  tcCloseDrawerItemModal();
  if (window.showToast) showToast(i18n.tFmt('tcInsertedIntoExercise', { title: ex.title || i18n.t('tcExercise') }));
};

window.tcAddDrawerItemAsExerciseSubItem = function () {
  if (_currentDrawerItemIdx === null) return;
  var item = _cachedLearningItems[_currentDrawerItemIdx];
  if (!item) return;

  var targetSel = document.getElementById('drawerTargetExerciseSelect');
  var targetExId = targetSel ? targetSel.value : window._lastActiveExerciseId;
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === targetExId; });
  if (!ex) {
    if (window.showToast) showToast(i18n.t('tcSelectTargetExerciseFirst'), true);
    return;
  }

  var word = item.word || item.title || item.name || '';
  var ipa = item.ipa ? ' /' + item.ipa.replace(/^\/|\/$/g, '') + '/' : '';
  var def = Array.isArray(item.definition) ? item.definition.join('; ') : (item.definition || '');
  var tr = item.french || item.translation || '';
  var targetDefOrTr = tr || def || '';

  if (ex.type === 'matching') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.pairs)) ex.content.pairs = [];
    ex.content.pairs.push({ left: word + (ipa ? ' ' + ipa : ''), right: targetDefOrTr });
  } else if (ex.type === 'translation') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.items)) ex.content.items = [];
    ex.content.items.push({ original: word + (ipa ? ' ' + ipa : ''), solution: targetDefOrTr });
  } else if (ex.type === 'open_question') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.questions)) ex.content.questions = [];
    ex.content.questions.push({
      prompt: 'Define / translate the term "' + word + '"' + (ipa ? ' ' + ipa : '') + ':',
      sampleAnswer: targetDefOrTr
    });
  } else if (ex.type === 'cloze') {
    var clozeSent = item.sentence || ('The [' + word + '] is ' + targetDefOrTr + '.');
    if (ex.content && Array.isArray(ex.content.items)) {
      ex.content.items.push({ text: clozeSent });
    } else if (ex.content) {
      ex.content.text = (ex.content.text ? ex.content.text + '\n' : '') + clozeSent;
    }
  } else if (ex.type === 'composition') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.items)) ex.content.items = [];
    ex.content.items.push({
      label: word,
      prompt: 'Discuss the concept of "' + word + '" (' + targetDefOrTr + ').',
      targetWordCount: 150
    });
  } else if (ex.type === 'mcq') {
    if (!ex.content) ex.content = {};
    if (!Array.isArray(ex.content.questions)) ex.content.questions = [];
    ex.content.questions.push({
      question: 'What is the correct meaning of "' + word + '"?',
      options: [
        { text: targetDefOrTr, isCorrect: true },
        { text: 'Unrelated distractor definition', isCorrect: false },
        { text: 'Opposite meaning', isCorrect: false }
      ],
      points: 1
    });
  } else {
    ex.prompt = (ex.prompt ? ex.prompt + '\n' : '') + word + (ipa ? ' ' + ipa : '') + ': ' + targetDefOrTr;
  }

  renderExerciseCards();
  tcOnDirty();
  tcCloseDrawerItemModal();
  if (window.showToast) showToast(i18n.tFmt('tcAddedItemIntoExercise', { title: ex.title || i18n.t('tcExercise') }));
};

window.tcInsertIntoActiveInput = function (val) {
  var input = window._lastFocusedInput;
  if (!input || !document.body.contains(input)) {
    if (window.showToast) showToast(i18n.t('tcNoActiveFieldFocused', 'No active field currently focused'), true);
    return;
  }
  var start = input.selectionStart || 0;
  var end = input.selectionEnd || 0;
  var curVal = input.value || '';
  input.value = curVal.slice(0, start) + val + curVal.slice(end);
  input.selectionStart = input.selectionEnd = start + val.length;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  tcCloseDrawerItemModal();
  if (window.showToast) showToast(i18n.tFmt('tcInsertedIntoField', { field: val.slice(0, 30) }));
};

window.tcModalCreateNewEx = function () {
  if (_currentDrawerItemIdx === null) return;
  tcCloseDrawerItemModal();
  tcInsertLearningDbItem(_currentDrawerItemIdx);
};

window.tcInsertLearningDbItem = function (idx) {
  var item = _cachedLearningItems[idx];
  if (!item) return;
  var sel = document.getElementById('learningDbSource');
  var type = sel ? sel.value : 'gapfillbanks';

  if (type === 'gapfillbanks') {
    var sent = item.sentence || '';
    var rw = item.removedWord || '';
    var clozeText = sent;
    if (rw && sent.toLowerCase().indexOf(rw.toLowerCase()) !== -1) {
      var re = new RegExp('\\b' + rw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      clozeText = sent.replace(re, '[' + rw + ']');
    } else if (rw) {
      clozeText = sent + ' [' + rw + ']';
    }
    var ex = TestCreatorService.createEmptyExercise('cloze');
    ex.title = 'Gap-Fill: ' + (rw || 'Vocabulary');
    ex.prompt = 'Fill in the blanks with the correct words:';
    ex.content.text = clozeText;
    ex.points = 1;
    currentTest.exercises.push(ex);
  } else if (type === 'quizzes') {
    var ex = TestCreatorService.createEmptyExercise('mcq');
    ex.title = item.theme || 'Multiple Choice Question';
    ex.prompt = item.question || 'Choose the correct answer:';
    var opts = [];
    var sol = String(item.solution || '1').trim();
    for (var k = 1; k <= 6; k++) {
      if (item['answer ' + k]) {
        opts.push({
          text: String(item['answer ' + k]),
          isCorrect: sol === String(k) || sol === String(item['answer ' + k])
        });
      }
    }
    if (opts.length === 0 && Array.isArray(item.options)) {
      opts = item.options.map(function (opt, oIdx) {
        return {
          text: typeof opt === 'string' ? opt : (opt.text || ''),
          isCorrect: opt.isCorrect || sol === String(oIdx + 1)
        };
      });
    }
    if (opts.length > 0) ex.content.options = opts;
    ex.points = 1;
    currentTest.exercises.push(ex);
  } else if (type === 'errorbanks') {
    var ex = TestCreatorService.createEmptyExercise('sentence_transformation');
    ex.title = 'Error Correction';
    ex.prompt = 'Identify and correct the error in the following sentence:';
    ex.content.leadIn = item.erroneous || '';
    ex.content.keyword = 'CORRECT';
    ex.content.startOfSentence = 'Correction:';
    ex.expectedAnswer = item.correct || '';
    ex.points = 1;
    currentTest.exercises.push(ex);
  } else if (type === 'dictations') {
    var ex = TestCreatorService.createEmptyExercise('open_question');
    ex.title = 'Dictation: ' + (item.title || 'Audio Passage');
    ex.prompt = 'Listen carefully to the recording and transcribe the passage:';
    ex.content.linesCount = 8;
    ex.expectedAnswer = item.text || '';
    ex.points = 5;
    currentTest.exercises.push(ex);
  } else if (type === 'wordbanks') {
    var ex = TestCreatorService.createEmptyExercise('open_question');
    ex.title = 'Vocabulary: ' + (item.word || 'Definition');
    var defStr = Array.isArray(item.definition) ? item.definition.join('; ') : (item.definition || item.translation || '');
    ex.prompt = 'Explain or translate the term "' + (item.word || '') + '":';
    ex.content.linesCount = 3;
    ex.expectedAnswer = defStr;
    ex.points = 1;
    currentTest.exercises.push(ex);
  } else {
    var ex = TestCreatorService.createEmptyExercise('open_question');
    ex.title = item.title || item.topic || 'Exercise';
    ex.prompt = item.description || item.rule || item.question || 'Answer the question:';
    ex.points = 2;
    currentTest.exercises.push(ex);
  }

  renderExerciseCards();
  updatePointsBadge();

  // Automatically establish link in LinksService
  if (typeof LinksService !== 'undefined' && typeof LinksService.addLink === 'function') {
    var testUrn = 'cmt:test:' + currentTest.id;
    var itemTitle = item.word || item.title || item.name || item.rule || item.question || 'Item';
    var itemKey = item.word || item.removedWord || item.title || item.name || 'item';
    var itemUrn = 'cmt:' + type + ':' + (item._sourceFile || 'db') + '#' + encodeURIComponent(itemKey);
    if (typeof LinksService.registerEntity === 'function') {
      LinksService.registerEntity(itemUrn, {
        title: itemTitle,
        type: type,
        file: item._sourceFile || ''
      });
    }
    LinksService.addLink(testUrn, itemUrn, {
      relation: 'includes-material',
      meta: { label: itemTitle, title: itemTitle }
    });
    if (ex && ex.id) {
      LinksService.addLink(testUrn + '#' + ex.id, itemUrn, {
        relation: 'includes-material',
        meta: { label: itemTitle, exerciseTitle: ex.title || '' }
      });
    }
    if (typeof tcUpdateTestLinksBadge === 'function') tcUpdateTestLinksBadge();
  }

  if (window.showToast) showToast(i18n.t('tcAddedDbExerciseExam', 'Added database exercise into exam!'));
};

window.tcFilterLearningDb = function () {
  var q = (document.getElementById('drawerLearningDbSearch').value || '').trim().toLowerCase();
  var sel = document.getElementById('learningDbSource');
  var type = sel ? sel.value : 'gapfillbanks';

  if (type === 'wordbanks') {
    var themeVal = (document.getElementById('wbThemeFilter') && document.getElementById('wbThemeFilter').value) || 'all';
    var kwVal = (document.getElementById('wbKeywordFilter') && document.getElementById('wbKeywordFilter').value) || 'all';
    var lvlVal = (document.getElementById('wbLevelFilter') && document.getElementById('wbLevelFilter').value) || 'all';
    var srcVal = (document.getElementById('wbSourceFilter') && document.getElementById('wbSourceFilter').value) || 'all';
    var letterVal = (document.getElementById('wbLetterFilter') && document.getElementById('wbLetterFilter').value) || 'all';
    var posVal = (document.getElementById('wbPosFilter') && document.getElementById('wbPosFilter').value) || 'all';

    var filteredWords = _cachedLearningItems.filter(function (it) {
      if (q) {
        var s = (it.word || '') + ' ' + (it.french || it.translation || '') + ' ' + (Array.isArray(it.definition) ? it.definition.join(' ') : (it.definition || '')) + ' ' + getWordThemes(it).join(' ') + ' ' + getWordKeywords(it).join(' ');
        if (s.toLowerCase().indexOf(q) === -1) return false;
      }
      if (themeVal !== 'all') {
        var ths = getWordThemes(it);
        if (ths.indexOf(themeVal) === -1) return false;
      }
      if (kwVal !== 'all') {
        var kws = getWordKeywords(it);
        if (kws.indexOf(kwVal) === -1) return false;
      }
      if (lvlVal !== 'all') {
        var itLvl = String(it.level || '').trim().toUpperCase();
        if (itLvl !== lvlVal) return false;
      }
      if (srcVal !== 'all') {
        if (it._sourceFile !== srcVal) return false;
      }
      if (letterVal !== 'all') {
        if (!it.word || it.word[0].toUpperCase() !== letterVal) return false;
      }
      if (posVal !== 'all') {
        var itPos = String(it.partOfSpeech || it.pos || it.type || '').toLowerCase();
        if (itPos.indexOf(posVal.toLowerCase()) === -1) return false;
      }
      return true;
    });

    var badge = document.getElementById('wbFilterCountBadge');
    if (badge) {
      badge.textContent = filteredWords.length + ' / ' + _cachedLearningItems.length + ' words';
    }
    tcRenderLearningDbList(filteredWords, type);
    return;
  }

  if (!q) {
    tcRenderLearningDbList(_cachedLearningItems, type);
    return;
  }
  var filtered = _cachedLearningItems.filter(function (it) {
    var s = JSON.stringify(it).toLowerCase();
    return s.indexOf(q) !== -1;
  });
  tcRenderLearningDbList(filtered, type);
};

window.tcResetWordbankFilters = function () {
  ['wbThemeFilter', 'wbKeywordFilter', 'wbLevelFilter', 'wbSourceFilter', 'wbLetterFilter', 'wbPosFilter'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  var searchInput = document.getElementById('drawerLearningDbSearch');
  if (searchInput) searchInput.value = '';
  tcFilterLearningDb();
};

window.tcOpenAutoGeneratorModal = async function () {
  if (!_cachedLearningItems.length) {
    if (window.showToast) showToast(i18n.t('tcNoItemsLoadedCategory', 'No items loaded in this category yet'), true);
    return;
  }
  var countStr = window.prompt ? window.prompt(i18n.t('tcPromptAutoGenCount'), '3') : '3';
  var num = parseInt(countStr, 10);
  if (isNaN(num) || num <= 0) return;
  num = Math.min(num, _cachedLearningItems.length, 20);

  var shuffled = _cachedLearningItems.slice().sort(function () { return 0.5 - Math.random(); });
  var chosen = shuffled.slice(0, num);
  chosen.forEach(function (item) {
    var origIdx = _cachedLearningItems.indexOf(item);
    if (origIdx !== -1) tcInsertLearningDbItem(origIdx);
  });
  if (window.showToast) showToast(i18n.tFmt('tcGeneratedExercisesCount', { count: num }));
};

// ── Drawer Tab 3: Criteria Database ───────────────────────────────────
function parseCriteriaFileContent(content) {
  if (!content || typeof content !== 'string') return [];
  var trimmed = content.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      var p = JSON.parse(trimmed);
      if (Array.isArray(p)) return p;
    } catch (_) {}
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      var o = JSON.parse(trimmed);
      if (Array.isArray(o.criteria)) return o.criteria;
      if (Array.isArray(o.XLSM_CRITERIA)) return o.XLSM_CRITERIA;
      if (Array.isArray(o.records)) return o.records;
    } catch (_) {}
  }
  try {
    var fn = new Function(content + '\n;try{return typeof XLSM_CRITERIA !== "undefined" ? XLSM_CRITERIA : (typeof customCriteria !== "undefined" ? customCriteria : (typeof criteria !== "undefined" ? criteria : [])); }catch(e){return [];}');
    var res = fn();
    if (Array.isArray(res) && res.length > 0) return res;
  } catch (_) {}
  return [];
}

async function tcLoadAvailableCriteriaBanks() {
  _allCriteriaBanks = [];
  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (isElec && typeof Desktop.listFiles === 'function') {
    // 1. Scan customCriteria (user/custom-data/criteria)
    try {
      var res = await window.Desktop.listFiles('customCriteria', { extensions: ['.js', '.json'] });
      var list = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
      for (var i = 0; i < list.length; i++) {
        var fn = typeof list[i] === 'string' ? list[i] : (list[i].filename || list[i].name);
        if (!fn) continue;
        try {
          var fRes = await window.Desktop.readText('customCriteria', fn);
          if (fRes && fRes.ok && fRes.content) {
            var crits = parseCriteriaFileContent(fRes.content);
            _allCriteriaBanks.push({
              id: 'custom_' + fn,
              filename: fn,
              name: fn.replace(/\.(js|json)$/i, ''),
              target: 'customCriteria',
              criteria: crits
            });
          }
        } catch (err) {
          console.warn('Error reading custom criteria file:', fn, err);
        }
      }
    } catch (e) {
      console.warn('Error listing customCriteria:', e);
    }

    // 2. Default user/correction-criteria.js
    try {
      var defRes = await window.Desktop.readText('user', 'correction-criteria.js');
      if (defRes && defRes.ok && defRes.content) {
        var defCrits = parseCriteriaFileContent(defRes.content);
        _allCriteriaBanks.push({
          id: 'default_correction_criteria',
          filename: 'correction-criteria.js',
          name: 'Default (correction-criteria.js)',
          target: 'user',
          criteria: defCrits
        });
      }
    } catch (_) {}
  }

  // Fallback if no criteria banks found
  if (!_allCriteriaBanks.length && typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) {
    _allCriteriaBanks.push({
      id: 'global_xlsm',
      filename: 'correction-criteria.js',
      name: 'Default (correction-criteria.js)',
      criteria: XLSM_CRITERIA
    });
  }

  var sel = document.getElementById('criteriaBankSource');
  if (sel) {
    if (_allCriteriaBanks.length === 0) {
      sel.innerHTML = '<option value="">No criteria banks available</option>';
    } else {
      sel.innerHTML = _allCriteriaBanks.map(function (b) {
        return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + (b.criteria ? b.criteria.length : 0) + ' criteria)</option>';
      }).join('');
    }
  }

  // Preselect the first bank with criteria, or the first one
  var activeBank = _allCriteriaBanks.find(function (b) { return b.criteria && b.criteria.length > 0; }) || _allCriteriaBanks[0];
  if (activeBank) {
    if (sel) sel.value = activeBank.id;
    _cachedCriteria = activeBank.criteria || [];
  } else {
    _cachedCriteria = [];
  }
  tcRenderCriteriaList(_cachedCriteria);
}

window.tcLoadCriteriaBankSource = function () {
  var sel = document.getElementById('criteriaBankSource');
  var val = sel ? sel.value : '';
  var bank = _allCriteriaBanks.find(function (b) { return b.id === val; });
  _cachedCriteria = (bank && bank.criteria) ? bank.criteria : [];
  tcRenderCriteriaList(_cachedCriteria);
};

function tcRenderCriteriaList(list) {
  var el = document.getElementById('criteriaDbList');
  if (!el) return;
  updateCriteriaTargetDropdown();
  if (!list || !list.length) {
    _currentRenderedCriteria = [];
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#888;font-size:0.8rem;">' + escapeHtml(i18n.t('tcNoCriteriaFound')) + '</div>';
    return;
  }

  _currentRenderedCriteria = list;

  var targetEx = (_targetAttachExId && _targetAttachExId !== '__exam__') ? currentTest.exercises.find(function (e) { return e.id === _targetAttachExId; }) : null;
  var targetLabel = targetEx
    ? ((targetEx.type === 'section_criteria' ? 'Block: "' : 'Exercise "') + (targetEx.title || 'Section') + '"')
    : (typeof i18n !== 'undefined' && i18n.t ? (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)') : 'Entire Exam (Test-wide Header)');

  var headerNote = '<div style="background:#d1fae5;border:1.5px solid #059669;color:#065f46;padding:6px 10px;border-radius:4px;font-size:0.78rem;font-weight:800;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
    '<span>Tagging to: ' + escapeHtml(targetLabel) + '</span>' +
    '<span style="font-size:0.7rem;color:#059669;font-weight:600;">Click card or + Target</span>' +
    '</div>';

  var itemsHtml = list.map(function (c, idx) {
    var title = c.title || c.name || 'Criterion';
    var maxPts = c.maxPoints || (Array.isArray(c.grades) && c.grades[0] ? Number(c.grades[0]) : 6) || 3;
    var desc = c.description || c.domain || c.category || (Array.isArray(c.grades) ? 'Scale: ' + c.grades.join(', ') : 'Criteria');
    var levelCount = (c.comments && typeof c.comments === 'object') ? Object.keys(c.comments).length : (Array.isArray(c.grades) ? c.grades.length : 0);
    var targetBtnText = targetEx ? '+ ' + (targetEx.type === 'section_criteria' ? 'Block' : 'Exercise') : '+ Target';
    return '<div class="drawer-item-card" style="cursor:pointer;" draggable="true" data-index="' + idx + '" onclick="tcOnCriteriaCardClick(' + idx + ')">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:0.85rem;">' +
      '    <span>' + escapeHtml(title) + '</span>' +
      '    <div style="display:flex;gap:4px;align-items:center;">' +
      (levelCount > 0 ? '      <span style="color:#047857;background:#d1fae5;padding:1px 5px;border-radius:3px;font-size:0.68rem;font-weight:700;border:1px solid #10b981;">' + levelCount + ' levels</span>' : '') +
      '      <span style="color:#059669;background:#d1fae5;padding:1px 6px;border-radius:3px;border:1px solid #10b981;">/' + maxPts + ' pts</span>' +
      '    </div>' +
      '  </div>' +
      '  <div style="font-size:0.75rem;color:#475569;margin-top:3px;line-height:1.35;">' + escapeHtml(desc) + '</div>' +
      '  <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">' +
      '    <button type="button" class="neo-btn sm primary" style="padding:2px 8px;font-size:0.72rem;" onclick="event.stopPropagation(); tcAttachCriteriaByIndex(' + idx + ', \'__exam__\')">+ Exam</button>' +
      '    <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.72rem;" onclick="event.stopPropagation(); tcAttachCriteriaByIndex(' + idx + ', \'active_target\')">' + escapeHtml(targetBtnText) + '</button>' +
      '  </div>' +
      '</div>';
  }).join('');

  el.innerHTML = headerNote + itemsHtml;

  var cards = el.querySelectorAll('.drawer-item-card[draggable="true"]');
  cards.forEach(function (cEl) {
    cEl.addEventListener('dragstart', function (e) {
      var cIdx = parseInt(cEl.dataset.index, 10);
      var item = (_currentRenderedCriteria && _currentRenderedCriteria[cIdx]) || list[cIdx] || _cachedCriteria[cIdx];
      if (!item) return;
      var maxPts = item.maxPoints || (Array.isArray(item.grades) && item.grades[0] ? Number(item.grades[0]) : 6) || 3;
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'criterion',
        critId: item.id || item.name || item.title,
        title: item.title || item.name || 'Criterion',
        maxPoints: maxPts,
        description: item.description || item.domain || item.category || '',
        grades: item.grades || null,
        comments: item.comments || null,
        colors: item.colors || null,
        minPoints: item.minPoints != null ? item.minPoints : null,
        weight: Number(item.pointCoefficient || item.weight) || 1,
        domain: item.domain || ''
      }));
      e.dataTransfer.setData('text/plain', item.title || item.name || '');
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
}

window.tcOnCriteriaCardClick = function (idx) {
  var sel = document.getElementById('criteriaTargetExSelect');
  var targetVal = sel ? sel.value : (_targetAttachExId || '__exam__');
  tcAttachCriteriaByIndex(idx, targetVal);
};

window.tcAttachCriteriaByIndex = function (idx, targetMode) {
  var crit = (_currentRenderedCriteria && _currentRenderedCriteria[idx]) || _cachedCriteria[idx];
  if (!crit) return;
  var sel = document.getElementById('criteriaTargetExSelect');
  var mode = targetMode;
  if (!mode || mode === 'active_target' || mode === 'active_ex') {
    mode = (sel && sel.value) ? sel.value : (_targetAttachExId || '__exam__');
  }
  if (mode === '__exam__') {
    tcAttachCriteriaToTest(crit);
  } else {
    _targetAttachExId = mode;
    tcPullCriteriaToActiveEx(crit.id || crit.name || crit.title, crit, mode);
  }
};

window.tcFilterCriteriaDb = function () {
  var q = (document.getElementById('drawerCriteriaSearch').value || '').trim().toLowerCase();
  if (!q) {
    tcRenderCriteriaList(_cachedCriteria);
    return;
  }
  var filtered = _cachedCriteria.filter(function (c) {
    var t = (c.title || c.name || '').toLowerCase();
    var d = (c.description || c.domain || c.category || '').toLowerCase();
    return t.indexOf(q) !== -1 || d.indexOf(q) !== -1;
  });
  tcRenderCriteriaList(filtered);
};

function updateCriteriaTargetDropdown() {
  var sel = document.getElementById('criteriaTargetExSelect');
  if (!sel || !currentTest) return;
  var exs = currentTest.exercises || [];
  var exCounter = 0;
  var opts = '<option value="__exam__">' + (typeof i18n !== 'undefined' && i18n.t ? (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)') : 'Entire Exam (Test-wide Header)') + '</option>' +
    exs.map(function (e) {
      var label = '';
      if (e.type === 'section_criteria') {
        label = '📋 ' + (i18n.t('tcBlockCriteriaSection') || 'Section Block: ') + (e.title || 'Criteria & Rubrics');
      } else if (e.type === 'section_competences') {
        label = '📋 ' + (i18n.t('tcBlockCompetencesSection') || 'Section Block: ') + (e.title || 'Competences & Objectives');
      } else if (e.type === 'section_grading_scale') {
        label = '📋 ' + (i18n.t('tcBlockScaleSection') || 'Section Block: ') + (e.title || 'Grading Scale');
      } else if (e.type === 'section_custom' || e.type === 'custom_block') {
        label = '📋 ' + (i18n.t('tcBlockCustomSection') || 'Section Block: ') + (e.title || 'Custom Block');
      } else {
        exCounter++;
        label = 'Ex ' + exCounter + ': ' + (e.title || 'Exercise');
      }
      return '<option value="' + e.id + '">' + escapeHtml(label) + '</option>';
    }).join('');
  sel.innerHTML = opts;
  if (_targetAttachExId && exs.some(function (e) { return e.id === _targetAttachExId; })) {
    sel.value = _targetAttachExId;
  } else if (_targetAttachExId === '__exam__') {
    sel.value = '__exam__';
  } else {
    sel.value = '__exam__';
  }
}

window.updateCriteriaTargetDropdown = updateCriteriaTargetDropdown;
window.tcRenderCriteriaList = tcRenderCriteriaList;

window.tcOnCriteriaTargetChange = function () {
  var sel = document.getElementById('criteriaTargetExSelect');
  var val = sel ? sel.value : '__exam__';
  _targetAttachExId = val === '__exam__' ? '__exam__' : val;
  tcRenderCriteriaList(_cachedCriteria);
};

window.tcAttachCriteriaToEx = function (exId) {
  _targetAttachExId = exId;
  var ex = currentTest.exercises.find(function (e) { return e.id === exId; });
  if (!ex) return;

  var drawer = document.getElementById('testDrawer');
  if (drawer) drawer.style.display = 'flex';
  tcSwitchDrawerTab('criteriadb');
  updateCriteriaTargetDropdown();
  if (typeof tcRenderCriteriaList === 'function' && Array.isArray(_cachedCriteria)) {
    tcRenderCriteriaList(_cachedCriteria);
  }
  if (window.showToast) {
    showToast(i18n.tFmt('tcSelectCriterionDrawerPrompt', { title: ex.title || i18n.t('tcExercise') }));
  }
};

window.tcPullCriteriaToActiveEx = function (cId, critObj, targetExId) {
  var crit = critObj || _cachedCriteria.find(function (c) { return (c.id || c.name || c.title) === cId; });
  if (!crit) return;
  var reqId = targetExId || _targetAttachExId;
  var targetEx = (reqId && reqId !== '__exam__') ? currentTest.exercises.find(function (e) { return e.id === reqId; }) : null;
  if (!targetEx) {
    targetEx = currentTest.exercises.find(function (e) { return e.type === 'section_criteria' || e.type === 'composition' || e.type === 'open_question'; }) || currentTest.exercises[0];
  }
  if (!targetEx) {
    if (window.showToast) showToast(i18n.t('tcAddExerciseFirstForCriteria', 'Add an exercise or criteria block first to attach criteria rubrics'), true);
    return;
  }
  var maxPts = crit.maxPoints || (Array.isArray(crit.grades) && crit.grades[0] ? Number(crit.grades[0]) : 6) || 3;
  var critObjToStore = {
    id: crit.id || crit.name || ('crit_' + Date.now()),
    title: crit.title || crit.name || 'Assessment Criterion',
    description: crit.description || crit.desc || crit.domain || '',
    maxPoints: maxPts,
    weight: Number(crit.pointCoefficient || crit.weight) || 1,
    grades: Array.isArray(crit.grades) ? crit.grades.slice() : null,
    comments: (crit.comments && typeof crit.comments === 'object') ? JSON.parse(JSON.stringify(crit.comments)) : null,
    colors: (crit.colors && typeof crit.colors === 'object') ? JSON.parse(JSON.stringify(crit.colors)) : null,
    minPoints: crit.minPoints != null ? crit.minPoints : null,
    domain: crit.domain || ''
  };

  if (targetEx.type === 'section_criteria') {
    if (!Array.isArray(targetEx.criteria)) targetEx.criteria = [];
    if (!Array.isArray(targetEx.markingRubric)) targetEx.markingRubric = [];
    var isDup = targetEx.criteria.some(function (c) {
      return (c.id && critObjToStore.id && c.id === critObjToStore.id) || (c.title && critObjToStore.title && c.title === critObjToStore.title);
    });
    if (isDup) {
      if (window.showToast) showToast(i18n.t('tcCritAlreadyInBlock') || 'Criterion already added to this block', true);
      return;
    }
    targetEx.criteria.push(critObjToStore);
    targetEx.markingRubric.push(critObjToStore);
    TestCreatorService.calculateExercisePoints(targetEx, currentTest);
    renderExerciseCards();
    updatePointsBadge();
    tcOnDirty();
    if (window.showToast) showToast(i18n.tFmt('tcAttachedCriterionToEx', { name: critObjToStore.title, title: targetEx.title || 'Criteria Block' }));
    return;
  }

  if (!Array.isArray(targetEx.markingRubric)) targetEx.markingRubric = [];
  if (!Array.isArray(targetEx.criteria)) targetEx.criteria = [];
  var isRubricDup = targetEx.markingRubric.some(function (r) {
    return (r.id && critObjToStore.id && r.id === critObjToStore.id) || (r.title && critObjToStore.title && r.title === critObjToStore.title);
  });
  if (isRubricDup) {
    if (window.showToast) showToast(i18n.t('tcCritAlreadyInBlock') || 'Criterion already in exercise rubric', true);
    return;
  }
  targetEx.markingRubric.push(critObjToStore);
  targetEx.criteria.push(critObjToStore);
  TestCreatorService.calculateExercisePoints(targetEx, currentTest);
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
  if (window.showToast) showToast(i18n.tFmt('tcAttachedCriterionToEx', { name: crit.title || crit.name, title: targetEx.title || i18n.t('tcExercise') }));
};

window.tcRemoveCriterionFromSection = function (exId, cIdx) {
  var ex = (currentTest && currentTest.exercises) ? currentTest.exercises.find(function (e) { return e.id === exId; }) : null;
  if (!ex) return;
  if (Array.isArray(ex.criteria) && ex.criteria[cIdx]) {
    ex.criteria.splice(cIdx, 1);
  }
  if (Array.isArray(ex.markingRubric) && ex.markingRubric[cIdx]) {
    ex.markingRubric.splice(cIdx, 1);
  }
  TestCreatorService.calculateExercisePoints(ex, currentTest);
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
  if (window.showToast) showToast(i18n.t('tcCriteriaRemovedToast') || 'Criterion removed from block');
};

window.tcRemoveRubricFromEx = function (exId, rIdx) {
  var ex = currentTest.exercises.find(function (e) { return e.id === exId; });
  if (ex) {
    if (Array.isArray(ex.markingRubric) && ex.markingRubric[rIdx]) {
      ex.markingRubric.splice(rIdx, 1);
    }
    if (Array.isArray(ex.criteria) && ex.criteria[rIdx]) {
      ex.criteria.splice(rIdx, 1);
    }
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
    tcOnDirty();
  }
};

// ── Drawer Tab 4: Competence Bank & Criteria Bars ─────────────────────
function renderTestCompetenceBadges() {
  var bar = document.getElementById('testCompetencesBar');
  var list = document.getElementById('testCompetencesList');
  var countBadge = document.getElementById('testCompetencesCountBadge');
  var printChk = document.getElementById('testCompetencesPrintChk');
  var descChk = document.getElementById('testCompetencesDescPrintChk');
  if (!bar || !list || !currentTest) return;

  var rawComps = (Array.isArray(currentTest.linkedCompetences) && currentTest.linkedCompetences.length)
    ? currentTest.linkedCompetences
    : (Array.isArray(currentTest.linkedCompetenceIds) ? currentTest.linkedCompetenceIds : []);

  if (rawComps.length === 0) {
    bar.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  bar.style.display = 'block';
  if (countBadge) countBadge.textContent = rawComps.length + (rawComps.length === 1 ? ' objective' : ' objectives');

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (printChk) printChk.checked = hc.showCompetences !== false;
  if (descChk) descChk.checked = hc.showCompetenceDescriptions !== false;

  list.innerHTML = rawComps.map(function (c, idx) {
    var title = (c && c.title) || (c && c.code) || c;
    var desc = (c && (c.description || c.descriptors)) || '';
    return '<span style="background:#eff6ff;border:2px solid #2563eb;color:#1e40af;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:900;display:inline-flex;align-items:center;gap:6px;box-shadow:1px 1px 0 #2563eb;" title="' + escapeHtml(desc) + '">' +
      '<span' + tcDetailTriggerAttr(c, '__exam__', idx) + '>' + escapeHtml(title) + '</span>' +
      (desc ? ' <span style="font-size:0.68rem;font-weight:700;color:#3b82f6;">[+desc]</span>' : '') +
      ' <button type="button" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveTestComp(' + idx + ')" title="Remove test competence">&times;</button>' +
      '</span>';
  }).join('');
}

window.tcToggleCompetencesPrintOnTest = function (checked) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCompetences = !!checked;
  tcUpdateCompetencesBarPrintChk();
  tcOnDirty();
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcToggleCompetenceDescriptionsPrint = function (checked) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCompetenceDescriptions = !!checked;
  tcOnDirty();
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcUpdateCompetencesBarPrintChk = function () {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var printChk = document.getElementById('testCompetencesPrintChk');
  if (printChk) printChk.checked = hc.showCompetences !== false;
  var descChk = document.getElementById('testCompetencesDescPrintChk');
  if (descChk) descChk.checked = hc.showCompetenceDescriptions !== false;
  var hdrChk = document.getElementById('hdrChk_showCompetences');
  if (hdrChk) hdrChk.checked = hc.showCompetences !== false;
};

window.tcRemoveAllTestCompetences = function () {
  if (!currentTest) return;
  currentTest.linkedCompetences = [];
  currentTest.linkedCompetenceIds = [];
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCompetences = false;
  renderTestCompetenceBadges();
  tcOnDirty();
  if (window.showToast) showToast(i18n.t('tcRemovedTestCompetence', 'Removed test competences'));
};

window.tcRemoveTestComp = function (cIdx) {
  if (Array.isArray(currentTest.linkedCompetences)) {
    currentTest.linkedCompetences.splice(cIdx, 1);
  }
  if (Array.isArray(currentTest.linkedCompetenceIds)) {
    currentTest.linkedCompetenceIds.splice(cIdx, 1);
  }
  renderTestCompetenceBadges();
  tcOnDirty();
  if (window.showToast) showToast(i18n.t('tcRemovedTestCompetence', 'Removed test competence'));
};

// ── Test-wide Criteria Bar Functions ─────────────────────────────────
window.tcRenderTestCriteriaBar = function () {
  var bar = document.getElementById('testCriteriaBar');
  var list = document.getElementById('testCriteriaItemsList');
  var countBadge = document.getElementById('testCriteriaCountBadge');
  var printChk = document.getElementById('testCriteriaPrintChk');
  var descChk = document.getElementById('testCriteriaDescPrintChk');
  if (!bar || !list || !currentTest) return;

  var rawCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
    ? currentTest.criteria
    : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);

  if (rawCrits.length === 0) {
    bar.style.display = 'none';
    list.innerHTML = '';
    var bCountBadge = document.getElementById('blockCritCountBadge');
    if (bCountBadge) bCountBadge.textContent = '0 active';
    return;
  }
  bar.style.display = 'block';
  var totalCritPts = 0;
  rawCrits.forEach(function (c) {
    var w = Number(c.weight || c.pointCoefficient) || 1;
    var cp = (c.maxPoints != null && c.maxPoints !== '')
      ? Number(c.maxPoints)
      : ((Array.isArray(c.grades) && c.grades.length && !isNaN(Number(c.grades[0])))
        ? Number(c.grades[0])
        : ((c.points != null && c.points !== '') ? Number(c.points) : 0));
    if (isNaN(cp)) cp = 0;
    totalCritPts += (cp * w);
  });
  totalCritPts = Math.round(totalCritPts * 10) / 10;
  if (countBadge) countBadge.textContent = rawCrits.length + (rawCrits.length === 1 ? ' rubric' : ' rubrics') + ' • ' + totalCritPts + ' pts';
  var bCountBadge = document.getElementById('blockCritCountBadge');
  if (bCountBadge) bCountBadge.textContent = rawCrits.length + ' active' + (totalCritPts > 0 ? ' (' + totalCritPts + ' pts)' : '');

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (printChk) printChk.checked = hc.showCriteria !== false;
  if (descChk) descChk.checked = hc.showCriteriaDescriptions !== false;

  list.innerHTML = rawCrits.map(function (crit, idx) {
    var title = crit.title || crit.name || 'Criterion';
    var maxPts = crit.maxPoints || 6;
    var desc = crit.description || crit.desc || crit.domain || '';
    var levelCount = (crit.comments && typeof crit.comments === 'object') ? Object.keys(crit.comments).length : (Array.isArray(crit.grades) ? crit.grades.length : 0);
    var levelBadge = levelCount > 0 ? ' <span style="font-size:0.68rem;font-weight:700;color:#047857;background:#d1fae5;padding:1px 4px;border-radius:3px;">[' + levelCount + ' lvls]</span>' : '';
    return '<span style="background:#fff;border:1.5px solid #059669;color:#065f46;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:900;display:inline-flex;align-items:center;gap:6px;box-shadow:1px 1px 0 #059669;" title="' + escapeHtml(desc) + '">' +
      '<span>' + escapeHtml(title) + '</span>' +
      '<span style="color:#059669;font-weight:800;font-size:0.7rem;">(/' + maxPts + ' pts)</span>' +
      levelBadge +
      (desc ? ' <span style="font-size:0.68rem;font-weight:700;color:#10b981;">[+desc]</span>' : '') +
      ' <button type="button" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveTestCriterion(' + idx + ')" title="Remove criterion">&times;</button>' +
      '</span>';
  }).join('');
};

window.tcToggleCriteriaPrintOnTest = function (checked) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCriteria = !!checked;
  tcUpdateCriteriaBarPrintChk();
  tcOnDirty();
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcToggleCriteriaDescPrint = function (checked) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCriteriaDescriptions = !!checked;
  tcOnDirty();
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcUpdateCriteriaBarPrintChk = function () {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var printChk = document.getElementById('testCriteriaPrintChk');
  if (printChk) printChk.checked = hc.showCriteria !== false;
  var descChk = document.getElementById('testCriteriaDescPrintChk');
  if (descChk) descChk.checked = hc.showCriteriaDescriptions !== false;
  var hdrChk = document.getElementById('hdrChk_showCriteria');
  if (hdrChk) hdrChk.checked = hc.showCriteria !== false;
};

window.tcRemoveAllTestCriteria = function () {
  if (!currentTest) return;
  currentTest.criteria = [];
  currentTest.linkedCriteria = [];
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCriteria = false;
  tcRenderTestCriteriaBar();
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
  if (window.showToast) showToast(i18n.t('tcCriteriaRemovedToast', 'Assessment criteria removed from test.'));
};

window.tcRemoveTestCriterion = function (cIdx) {
  if (!currentTest) return;
  var list = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
    ? currentTest.criteria
    : (Array.isArray(currentTest.linkedCriteria) ? currentTest.linkedCriteria : null);
  if (list && list[cIdx]) {
    list.splice(cIdx, 1);
    tcRenderTestCriteriaBar();
    renderExerciseCards();
    updatePointsBadge();
    tcOnDirty();
    if (window.showToast) showToast(i18n.t('tcCriteriaRemovedToast', 'Criterion removed'));
  }
};

window.tcAttachCriteriaToTest = function (crit) {
  if (!currentTest || !crit) return;
  if (!Array.isArray(currentTest.criteria)) currentTest.criteria = [];
  var maxPts = crit.maxPoints || (Array.isArray(crit.grades) && crit.grades[0] ? Number(crit.grades[0]) : 6) || 3;
  var newCrit = {
    id: crit.id || crit.name || ('crit_' + Date.now()),
    title: crit.title || crit.name || 'Criterion',
    description: crit.description || crit.desc || crit.domain || '',
    maxPoints: maxPts,
    weight: Number(crit.pointCoefficient || crit.weight) || 1,
    grades: Array.isArray(crit.grades) ? crit.grades.slice() : null,
    comments: (crit.comments && typeof crit.comments === 'object') ? JSON.parse(JSON.stringify(crit.comments)) : null,
    colors: (crit.colors && typeof crit.colors === 'object') ? JSON.parse(JSON.stringify(crit.colors)) : null,
    minPoints: crit.minPoints != null ? crit.minPoints : null,
    domain: crit.domain || ''
  };
  currentTest.criteria.push(newCrit);
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showCriteria = true;
  tcRenderTestCriteriaBar();
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
  if (window.showToast) {
    showToast((i18n.t('tcCriteriaAttachedToast') || 'Assessment criteria attached to test: ') + newCrit.title);
  }
};

window.tcOpenRubricMatrixModal = function (targetId) {
  if (!currentTest) return;
  var modal = document.getElementById('tcRubricMatrixModal');
  var body = document.getElementById('tcRubricModalBody') || document.getElementById('tcRubricMatrixModalBody');
  var titleEl = document.getElementById('tcRubricModalTitleText') || document.getElementById('tcRubricMatrixModalTitle');
  var subEl = document.getElementById('tcRubricMatrixModalSub') || document.getElementById('tcRubricModalItemCount');
  if (!modal || !body) return;

  var html = '';
  var modalTitle = i18n.t('tcRubricModalTitle') || 'Assessment Criteria Rubric Matrix';
  var modalSub = i18n.t('tcRubricModalSub') || 'Full grade-by-grade level descriptor matrix';

  if (targetId && targetId !== '__exam__' && targetId !== '__all__') {
    var targetEx = (currentTest.exercises || []).find(function (e) { return e.id === targetId; });
    if (targetEx) {
      var crits = (Array.isArray(targetEx.criteria) && targetEx.criteria.length)
        ? targetEx.criteria
        : ((Array.isArray(targetEx.markingRubric) && targetEx.markingRubric.length)
          ? targetEx.markingRubric
          : (Array.isArray(targetEx.linkedCriteria) ? targetEx.linkedCriteria : []));
      var exOpts = TestCreatorService.ensureExerciseOptions(targetEx);
      modalTitle = (targetEx.title || i18n.t('tcExercise') || 'Exercise') + ' — ' + (i18n.t('tcRubricModalTitle') || 'Rubric Matrix');
      modalSub = (i18n.t('tcCriteriaBlockSingleEx') || 'Showing criteria attached to this exercise/block');
      if (targetEx.type === 'section_criteria' && crits.length === 0) {
        var fallbackCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
          ? currentTest.criteria
          : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
        html = TestCreatorService.renderCriteriaHtml({ criteria: fallbackCrits, exercises: currentTest.exercises || [] }, {
          displayMode: exOpts.displayMode || exOpts.rubricDisplayMode || 'matrix',
          showDescriptions: exOpts.showDescriptions !== undefined ? exOpts.showDescriptions : (exOpts.showRubricDescriptions !== false),
          background: exOpts.background || exOpts.rubricBg || 'default',
          padding: exOpts.padding || exOpts.rubricPadding || 'standard',
          border: exOpts.border || exOpts.rubricBorder || 'solid',
          title: exOpts.rubricTitle || targetEx.title || 'Rubric Matrix',
          levelSubs: exOpts.levelSubs || exOpts.rubricLevelSubs
        });
      } else {
        html = TestCreatorService.renderCriteriaHtml({ criteria: crits, exercises: [] }, {
          displayMode: 'matrix',
          showDescriptions: true,
          background: exOpts.background || exOpts.rubricBg || 'default',
          padding: exOpts.padding || exOpts.rubricPadding || 'standard',
          border: exOpts.border || exOpts.rubricBorder || 'solid',
          title: exOpts.rubricTitle || targetEx.title || 'Rubric Matrix',
          levelSubs: exOpts.levelSubs || exOpts.rubricLevelSubs,
          includeExerciseCriteria: false
        });
      }
    }
  } else {
    var allCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
      ? currentTest.criteria
      : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
    modalTitle = (currentTest.title || 'Exam') + ' — ' + (i18n.t('tcRubricModalTitle') || 'Assessment Criteria Rubric Matrix');
    modalSub = i18n.t('tcCriteriaBlockUnifiedSub') || 'Unified rubric matrix aggregated across all test exercises and criteria';
    html = TestCreatorService.renderCriteriaHtml({ criteria: allCrits, exercises: currentTest.exercises || [] }, {
      displayMode: 'matrix',
      showDescriptions: true,
      title: i18n.t('tcCriteriaBlockTitle') || 'Assessment Criteria & Rubric Matrix',
      levelSubs: (currentTest.headerConfig && currentTest.headerConfig.criteriaStyle && currentTest.headerConfig.criteriaStyle.levelSubs) || {},
      exercises: currentTest.exercises || []
    });
  }

  if (titleEl) titleEl.textContent = modalTitle;
  if (subEl) subEl.textContent = modalSub;
  body.innerHTML = html || '<div style="padding:24px;text-align:center;color:#64748b;font-style:italic;">No rubric criteria found to display</div>';
  modal.classList.add('open');
  modal.style.display = 'flex';
};

window.tcCloseRubricMatrixModal = function () {
  var modal = document.getElementById('tcRubricMatrixModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
};

// ── Rubric Layout & Appearance Modal & In-place Handlers ─────────────────
window._currentEditingRubricExId = null;

window.tcUpdateRubricOption = function (exId, key, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  syncRubricOptionKeys(o, key, value, ex);
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  if (window._currentEditingRubricExId === exId && typeof tcRenderRubricLayoutPreview === 'function') {
    tcRenderRubricLayoutPreview(ex);
  }
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcOpenRubricLayoutModal = function (exId) {
  if (!currentTest) return;
  var isExamLevel = (!exId || exId === '__exam__' || exId === '__all__');
  var ex = isExamLevel ? null : (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!isExamLevel && !ex) return;
  window._currentEditingRubricExId = isExamLevel ? '__exam__' : exId;

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var crSt = hc.criteriaStyle || {};
  var o = isExamLevel ? crSt : TestCreatorService.ensureExerciseOptions(ex);

  var modal = document.getElementById('tcRubricLayoutModal');
  if (!modal) return;

  var subEl = document.getElementById('tcRubricLayoutModalSub');
  if (subEl) {
    subEl.textContent = isExamLevel
      ? ((currentTest.title || 'Exam') + ' — ' + (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)'))
      : ((ex.title || i18n.t('tcExercise') || 'Exercise') + ' — ' + (i18n.t('tcRubricCustomiseDisplayHelp') || 'Customise the display of rubrics'));
  }

  var titleInp = document.getElementById('tcModalRubricTitle');
  if (titleInp) titleInp.value = isExamLevel ? (hc.criteriaLabel || '') : (o.rubricTitle || '');

  var modeSel = document.getElementById('tcModalRubricDisplayMode');
  if (modeSel) modeSel.value = isExamLevel ? (crSt.displayMode || 'matrix') : (o.rubricDisplayMode || o.displayMode || 'matrix');

  var bgSel = document.getElementById('tcModalRubricBg');
  if (bgSel) bgSel.value = isExamLevel ? (crSt.background || 'default') : (o.rubricBg || o.background || 'default');

  var padSel = document.getElementById('tcModalRubricPadding');
  if (padSel) padSel.value = isExamLevel ? (crSt.padding || 'standard') : (o.rubricPadding || o.padding || 'standard');

  var borderSel = document.getElementById('tcModalRubricBorder');
  if (borderSel) borderSel.value = isExamLevel ? (crSt.border || 'solid') : (o.rubricBorder || o.border || 'solid');

  var orientSel = document.getElementById('tcModalRubricOrientation');
  if (orientSel) orientSel.value = isExamLevel ? (crSt.pageOrientation || 'portrait') : (o.pageOrientation || o.rubricPageOrientation || 'portrait');

  var colCritChk = document.getElementById('tcModalRubricColCriterion');
  if (colCritChk) colCritChk.checked = o.showCriterionCol !== false;

  var colLvlChk = document.getElementById('tcModalRubricColLevels');
  if (colLvlChk) colLvlChk.checked = o.showLevelsCol !== false;

  var descChk = document.getElementById('tcModalRubricShowDesc');
  if (descChk) {
    descChk.checked = isExamLevel
      ? (crSt.showDescriptions !== undefined ? crSt.showDescriptions : (hc.showCriteriaDescriptions !== false))
      : (o.showRubricDescriptions !== undefined ? o.showRubricDescriptions : (o.showDescriptions !== false));
  }

  var colMaxChk = document.getElementById('tcModalRubricColMax');
  if (colMaxChk) colMaxChk.checked = o.showMaxCol !== false;

  var colScoreChk = document.getElementById('tcModalRubricColScore');
  if (colScoreChk) colScoreChk.checked = o.showScoreCol !== false;

  var colCmtChk = document.getElementById('tcModalRubricColComments');
  if (colCmtChk) colCmtChk.checked = o.showCommentsCol !== false;

  var sepChk = document.getElementById('tcModalRubricSeparatePage');
  if (sepChk) {
    sepChk.checked = isExamLevel
      ? !!(crSt.separatePage || crSt.pageOrientation === 'landscape')
      : !!(ex.forcePageBreak || o.separatePage || o.rubricSeparatePage || (o.pageOrientation || o.rubricPageOrientation) === 'landscape');
  }

  var printChk = document.getElementById('tcModalRubricShowRubric');
  if (printChk) {
    printChk.checked = isExamLevel ? !!hc.showCriteria : (o.showRubric !== false);
  }

  var lvlSec = document.getElementById('tcModalRubricLevelSubsSection');
  if (lvlSec) lvlSec.style.display = (o.showLevelsCol !== false) ? 'block' : 'none';

  var rawCrits = [];
  if (isExamLevel) {
    rawCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
      ? currentTest.criteria
      : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
    (currentTest.exercises || []).forEach(function (e) {
      var ec = (Array.isArray(e.criteria) && e.criteria.length) ? e.criteria : (Array.isArray(e.markingRubric) ? e.markingRubric : []);
      ec.forEach(function (c) { if (c) rawCrits.push(c); });
    });
  } else {
    rawCrits = (Array.isArray(ex.criteria) && ex.criteria.length)
      ? ex.criteria
      : ((Array.isArray(ex.markingRubric) && ex.markingRubric.length) ? ex.markingRubric : (Array.isArray(ex.linkedCriteria) ? ex.linkedCriteria : []));
    if (rawCrits.length === 0 && ex.type === 'section_criteria' && currentTest) {
      rawCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
        ? currentTest.criteria
        : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
    }
  }
  var levels = TestCreatorService.getCriteriaLevels(rawCrits);
  var levelSubs = isExamLevel ? (crSt.levelSubs || {}) : (o.levelSubs || o.rubricLevelSubs || {});
  tcRenderRubricLevelSubsUI(levels, levelSubs);

  tcRenderRubricLayoutPreview(isExamLevel ? '__exam__' : ex);
  modal.classList.add('open');
  modal.style.display = 'flex';
};

window.tcRenderRubricLevelSubsUI = function (levels, levelSubs) {
  var container = document.getElementById('tcRubricLevelSubsContainer');
  if (!container) return;
  levelSubs = levelSubs || {};
  var allLevels = Array.isArray(levels) ? levels.slice() : [];
  Object.keys(levelSubs).forEach(function (k) {
    var kNum = parseFloat(k);
    var exists = allLevels.some(function (l) { return String(l) === String(k) || (kNum === l && !isNaN(kNum)); });
    if (!exists) {
      allLevels.push(isNaN(kNum) ? k : kNum);
    }
  });
  allLevels.sort(function (a, b) {
    var aNum = parseFloat(a);
    var bNum = parseFloat(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
    return String(b).localeCompare(String(a));
  });

  if (allLevels.length === 0) {
    allLevels = [6, 5, 4, 3, 2, 1];
  }

  var ph = i18n.t('tcCritSubPlaceholder') || 'Sub-label...';
  var html = allLevels.map(function (lvl) {
    var val = levelSubs[String(lvl)] !== undefined ? String(levelSubs[String(lvl)]) : '';
    return '<div class="tc-level-sub-item" style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1.5px solid #059669;border-radius:6px;padding:3px 8px;box-shadow:1px 1px 0 #059669;">' +
      '<span style="font-size:0.75rem;font-weight:800;color:#065f46;min-width:22px;text-align:center;">' + escapeHtml(String(lvl)) + '</span>' +
      '<input type="text" class="meta-input tc-level-sub-input" data-level="' + escapeHtml(String(lvl)) + '" style="font-size:0.75rem;padding:2px 6px;width:105px;border:1.5px solid #059669;border-radius:4px;background:#fff;" placeholder="' + escapeHtml(ph) + '" value="' + escapeHtml(val) + '" oninput="tcUpdateModalRubricLevelSub(\'' + escapeHtml(String(lvl)) + '\', this.value)">' +
      '</div>';
  }).join('');

  container.innerHTML = html;
};

window.tcUpdateModalRubricLevelSub = function (lvl, value) {
  if (!window._currentEditingRubricExId) return;
  var isExamLevel = (window._currentEditingRubricExId === '__exam__');
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var crSt = hc.criteriaStyle || (hc.criteriaStyle = {});
  var ex = isExamLevel ? null : (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingRubricExId; });
  var o = isExamLevel ? crSt : (ex ? TestCreatorService.ensureExerciseOptions(ex) : null);
  if (!o) return;

  if (!o.levelSubs || typeof o.levelSubs !== 'object') o.levelSubs = {};
  if (value && value.trim()) {
    o.levelSubs[String(lvl)] = value.trim();
  } else {
    delete o.levelSubs[String(lvl)];
  }

  if (!isExamLevel && ex) {
    syncRubricOptionKeys(o, 'levelSubs', o.levelSubs, ex);
    if (ex.autoSaveToDb) {
      TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    }
  }

  tcOnDirty();
  tcRenderRubricLayoutPreview(isExamLevel ? '__exam__' : ex);
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcClearRubricLevelSubs = function () {
  if (!window._currentEditingRubricExId) return;
  var isExamLevel = (window._currentEditingRubricExId === '__exam__');
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var crSt = hc.criteriaStyle || (hc.criteriaStyle = {});
  var ex = isExamLevel ? null : (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingRubricExId; });
  var o = isExamLevel ? crSt : (ex ? TestCreatorService.ensureExerciseOptions(ex) : null);
  if (!o) return;

  o.levelSubs = {};
  if (!isExamLevel && ex) {
    syncRubricOptionKeys(o, 'levelSubs', {}, ex);
    if (ex.autoSaveToDb) {
      TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    }
  }

  var inputs = document.querySelectorAll('#tcRubricLevelSubsContainer .tc-level-sub-input');
  inputs.forEach(function (inp) { inp.value = ''; });

  tcOnDirty();
  tcRenderRubricLayoutPreview(isExamLevel ? '__exam__' : ex);
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcAddCustomRubricLevelSub = function () {
  if (!window._currentEditingRubricExId) return;
  var promptMsg = i18n.t('tcPromptAddLevelSub') || 'Enter level value to add a subtitle for (e.g. 5.5, 4, 3, etc.):';
  var promptFn = window.showPrompt || window.prompt;
  var res = promptFn(promptMsg, '');
  if (res && typeof res.then === 'function') {
    res.then(function (val) {
      if (val && String(val).trim()) {
        tcDoAddCustomRubricLevelSub(String(val).trim());
      }
    });
  } else if (res && String(res).trim()) {
    tcDoAddCustomRubricLevelSub(String(res).trim());
  }
};

function tcDoAddCustomRubricLevelSub(val) {
  var isExamLevel = (window._currentEditingRubricExId === '__exam__');
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var crSt = hc.criteriaStyle || (hc.criteriaStyle = {});
  var ex = isExamLevel ? null : (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingRubricExId; });
  var o = isExamLevel ? crSt : (ex ? TestCreatorService.ensureExerciseOptions(ex) : null);
  if (!o) return;

  if (!o.levelSubs || typeof o.levelSubs !== 'object') o.levelSubs = {};
  if (o.levelSubs[val] === undefined) {
    o.levelSubs[val] = '';
  }

  var rawCrits = [];
  if (isExamLevel) {
    rawCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
      ? currentTest.criteria
      : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
  } else if (ex) {
    rawCrits = (Array.isArray(ex.criteria) && ex.criteria.length) ? ex.criteria : (Array.isArray(ex.markingRubric) ? ex.markingRubric : []);
  }
  var levels = TestCreatorService.getCriteriaLevels(rawCrits);
  tcRenderRubricLevelSubsUI(levels, o.levelSubs);

  var newInp = document.querySelector('#tcRubricLevelSubsContainer .tc-level-sub-input[data-level="' + val + '"]');
  if (newInp) newInp.focus();
}

window.tcCloseRubricLayoutModal = function () {
  var modal = document.getElementById('tcRubricLayoutModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  window._currentEditingRubricExId = null;
};

window.tcUpdateModalRubricOption = function (key, value) {
  if (!window._currentEditingRubricExId) return;
  if (key === 'showLevelsCol') {
    var lvlSec = document.getElementById('tcModalRubricLevelSubsSection');
    if (lvlSec) lvlSec.style.display = value ? 'block' : 'none';
  }
  if (window._currentEditingRubricExId === '__exam__') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    var crSt = hc.criteriaStyle || (hc.criteriaStyle = {});
    if (key === 'rubricTitle' || key === 'title') {
      hc.criteriaLabel = value;
    } else if (key === 'rubricDisplayMode' || key === 'displayMode') {
      crSt.displayMode = value;
    } else if (key === 'rubricBg' || key === 'background') {
      crSt.background = value;
    } else if (key === 'rubricPadding' || key === 'padding') {
      crSt.padding = value;
    } else if (key === 'rubricBorder' || key === 'border') {
      crSt.border = value;
    } else if (key === 'showRubricDescriptions' || key === 'showDescriptions') {
      crSt.showDescriptions = !!value;
      hc.showCriteriaDescriptions = !!value;
      var barDescChk = document.getElementById('testCriteriaDescPrintChk');
      if (barDescChk) barDescChk.checked = !!value;
    } else if (key === 'showRubric') {
      hc.showCriteria = !!value;
      var barPrintChk = document.getElementById('testCriteriaPrintChk');
      if (barPrintChk) barPrintChk.checked = !!value;
    } else if (key === 'pageOrientation' || key === 'rubricPageOrientation') {
      crSt.pageOrientation = value;
      if (value === 'landscape') {
        crSt.separatePage = true;
        var sepChk = document.getElementById('tcModalRubricSeparatePage');
        if (sepChk) sepChk.checked = true;
      }
    } else if (key === 'separatePage' || key === 'rubricSeparatePage') {
      crSt.separatePage = !!value;
    } else {
      crSt[key] = value;
    }
    tcOnDirty();
    tcRenderRubricLayoutPreview('__exam__');
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
    return;
  }

  var ex = (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingRubricExId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  syncRubricOptionKeys(o, key, value, ex);
  if (key === 'pageOrientation' && value === 'landscape') {
    var sepChk2 = document.getElementById('tcModalRubricSeparatePage');
    if (sepChk2) sepChk2.checked = true;
  }
  renderExerciseCards();
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRenderRubricLayoutPreview(ex);
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcRenderRubricLayoutPreview = function (exOrTarget) {
  var previewBox = document.getElementById('tcRubricLayoutPreviewBox');
  if (!previewBox || !exOrTarget) return;
  var isExamLevel = (exOrTarget === '__exam__');
  var ex = isExamLevel ? null : exOrTarget;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var crSt = hc.criteriaStyle || {};
  var o = isExamLevel ? crSt : TestCreatorService.ensureExerciseOptions(ex);

  var rawCrits = [];
  var includeExCrits = false;
  var previewExercises = [];

  if (isExamLevel) {
    rawCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
      ? currentTest.criteria
      : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
    previewExercises = currentTest.exercises || [];
    includeExCrits = true;
  } else {
    rawCrits = (Array.isArray(ex.criteria) && ex.criteria.length)
      ? ex.criteria
      : ((Array.isArray(ex.markingRubric) && ex.markingRubric.length)
        ? ex.markingRubric
        : ((Array.isArray(ex.linkedCriteria) && ex.linkedCriteria.length) ? ex.linkedCriteria : []));
    if (rawCrits.length === 0 && ex.type === 'section_criteria' && currentTest) {
      var testLevelCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
        ? currentTest.criteria
        : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
      if (testLevelCrits.length > 0) {
        rawCrits = testLevelCrits;
      }
      if (Array.isArray(currentTest.exercises) && currentTest.exercises.length) {
        previewExercises = currentTest.exercises;
        includeExCrits = true;
      }
    }
  }

  if (rawCrits.length === 0 && !includeExCrits) {
    rawCrits = [
      {
        id: 'preview_crit_1',
        title: 'Structure & Cohesion',
        maxPoints: 4,
        grades: [4, 3, 2, 1],
        comments: {
          '4': 'Clear structure with well-linked paragraphs and varied connectors.',
          '3': 'Logical flow with minor cohesion gaps.',
          '2': 'Basic sequencing; repetitive connectors.',
          '1': 'Disjointed or unstructured ideas.'
        }
      },
      {
        id: 'preview_crit_2',
        title: 'Vocabulary & Grammar',
        maxPoints: 4,
        grades: [4, 3, 2, 1],
        comments: {
          '4': 'Precise vocabulary and complex accurate grammatical structures.',
          '3': 'Adequate range of vocabulary with occasional minor inaccuracies.',
          '2': 'Limited vocabulary range; several noticeable grammatical errors.',
          '1': 'Pervasive grammatical errors obstructing meaning.'
        }
      }
    ];
  }

  var defaultPreviewTitle = isExamLevel
    ? (hc.criteriaLabel || (i18n.t('tcDefaultRubricTitle') || 'Assessment Criteria & Evaluation Rubric'))
    : ((ex.type === 'section_criteria')
      ? (ex.title || (i18n.t('tcDefaultRubricTitle') || 'Assessment Criteria & Evaluation Rubric'))
      : (ex.title ? (ex.title + ' — Rubric') : (i18n.t('tcCompRubric') || 'Assessment Rubric')));

  var isSep = isExamLevel
    ? !!(crSt.separatePage || crSt.pageOrientation === 'landscape')
    : !!(ex.forcePageBreak || o.separatePage || o.rubricSeparatePage || (o.pageOrientation || o.rubricPageOrientation) === 'landscape');
  var orient = isExamLevel ? (crSt.pageOrientation || 'portrait') : (o.pageOrientation || o.rubricPageOrientation || 'portrait');
  var pageBadge = isSep
    ? '<div style="margin-bottom:6px;display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;border:1.5px solid #059669;color:#065f46;font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:4px;">📄 Separate Page (' + (orient === 'landscape' ? 'Landscape A4' : 'Portrait A4') + ')</div>'
    : '';

  var html = TestCreatorService.renderCriteriaHtml({ criteria: rawCrits, exercises: previewExercises }, {
    title: isExamLevel ? defaultPreviewTitle : (o.rubricTitle || defaultPreviewTitle),
    displayMode: isExamLevel ? (crSt.displayMode || 'matrix') : (o.rubricDisplayMode || o.displayMode || 'matrix'),
    showCriterionCol: o.showCriterionCol !== false,
    showLevelsCol: o.showLevelsCol !== false,
    showDescriptions: isExamLevel
      ? (crSt.showDescriptions !== undefined ? crSt.showDescriptions : (hc.showCriteriaDescriptions !== false))
      : (o.showRubricDescriptions !== undefined ? o.showRubricDescriptions : (o.showDescriptions !== false)),
    showMaxCol: o.showMaxCol !== false,
    showScoreCol: o.showScoreCol !== false,
    showCommentsCol: o.showCommentsCol !== false,
    levelSubs: isExamLevel ? (crSt.levelSubs || {}) : (o.levelSubs || o.rubricLevelSubs || {}),
    background: isExamLevel ? (crSt.background || 'default') : (o.rubricBg || o.background || 'default'),
    padding: isExamLevel ? (crSt.padding || 'standard') : (o.rubricPadding || o.padding || 'standard'),
    border: isExamLevel ? (crSt.border || 'solid') : (o.rubricBorder || o.border || 'solid'),
    separatePage: false,
    applyPageLayout: false,
    includeExerciseCriteria: false
  });

  previewBox.innerHTML = pageBadge + (html || '<div style="color:#64748b;font-style:italic;">No rubric criteria to preview</div>');
};

window.tcResetRubricLayoutOptions = function () {
  if (!window._currentEditingRubricExId) return;
  if (window._currentEditingRubricExId === '__exam__') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    hc.criteriaLabel = 'Assessment Criteria & Evaluation Rubric:';
    hc.showCriteriaDescriptions = true;
    hc.criteriaStyle = Object.assign({}, TestCreatorService.DEFAULT_HEADER_CONFIG.criteriaStyle, { levelSubs: {} });
    tcOpenRubricLayoutModal('__exam__');
    tcOnDirty();
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
    if (window.showToast) showToast(i18n.t('tcRubricResetToast') || 'Rubric layout reset to defaults');
    return;
  }
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingRubricExId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  o.rubricDisplayMode = 'matrix';
  o.displayMode = 'matrix';
  o.rubricBg = 'default';
  o.background = 'default';
  o.rubricPadding = 'standard';
  o.padding = 'standard';
  o.rubricBorder = 'solid';
  o.border = 'solid';
  o.showCriterionCol = true;
  o.showLevelsCol = true;
  o.showRubricDescriptions = true;
  o.showDescriptions = true;
  o.showMaxCol = true;
  o.showScoreCol = true;
  o.showCommentsCol = true;
  o.levelSubs = {};
  o.rubricLevelSubs = {};
  o.separatePage = false;
  o.rubricSeparatePage = false;
  o.pageOrientation = 'portrait';
  o.rubricPageOrientation = 'portrait';
  if (ex.type === 'section_criteria') ex.forcePageBreak = false;
  o.showRubric = true;
  o.rubricTitle = '';

  renderExerciseCards();
  tcOpenRubricLayoutModal(ex.id);
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
  if (window.showToast) {
    showToast(i18n.t('tcRubricResetToast') || 'Rubric layout reset to defaults');
  }
};

// ── Competence Layout & Appearance Modal Handlers ──────────────────────
window._currentEditingCompExId = null;

window.tcOpenCompetenceLayoutModal = function (exId) {
  if (!currentTest) return;
  var isExamLevel = (!exId || exId === '__exam__' || exId === '__all__');
  var ex = isExamLevel ? null : (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!isExamLevel && !ex) return;
  window._currentEditingCompExId = isExamLevel ? '__exam__' : exId;

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var cSt = hc.competencesStyle || {};
  var o = isExamLevel ? cSt : TestCreatorService.ensureExerciseOptions(ex);

  var modal = document.getElementById('tcCompLayoutModal');
  if (!modal) return;

  var subEl = document.getElementById('tcCompLayoutModalSub');
  if (subEl) {
    subEl.textContent = isExamLevel
      ? ((currentTest.title || 'Exam') + ' — ' + (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)'))
      : ((ex.title || i18n.t('tcTypeSectionCompetences') || 'Competences Block') + ' — ' + (i18n.t('tcCompCustomiseDisplayHelp') || 'Customise competence columns, orientation, and appearance'));
  }

  var titleInp = document.getElementById('tcModalCompTitle');
  if (titleInp) titleInp.value = isExamLevel ? (hc.competencesLabel || '') : (o.compTitle || '');

  var modeSel = document.getElementById('tcModalCompDisplayMode');
  if (modeSel) modeSel.value = o.displayMode || 'table';

  var bgSel = document.getElementById('tcModalCompBg');
  if (bgSel) bgSel.value = o.background || 'default';

  var padSel = document.getElementById('tcModalCompPadding');
  if (padSel) padSel.value = o.padding || 'standard';

  var borderSel = document.getElementById('tcModalCompBorder');
  if (borderSel) borderSel.value = o.border || 'solid';

  var orientSel = document.getElementById('tcModalCompOrientation');
  if (orientSel) orientSel.value = o.pageOrientation || 'portrait';

  var colCodeChk = document.getElementById('tcModalCompColCode');
  if (colCodeChk) colCodeChk.checked = o.showCodeCol !== false;

  var colTitleChk = document.getElementById('tcModalCompColTitle');
  if (colTitleChk) colTitleChk.checked = o.showTitleCol !== false;

  var descChk = document.getElementById('tcModalCompShowDesc');
  if (descChk) {
    descChk.checked = isExamLevel
      ? (cSt.showDescriptions !== undefined ? cSt.showDescriptions : (hc.showCompetenceDescriptions !== false))
      : (o.showDescriptions !== false);
  }

  var colLvlChk = document.getElementById('tcModalCompColLevel');
  if (colLvlChk) colLvlChk.checked = o.showLevelCol !== false;

  var colScoreChk = document.getElementById('tcModalCompColScore');
  if (colScoreChk) colScoreChk.checked = !!o.showScoreCol;

  var colCmtChk = document.getElementById('tcModalCompColComments');
  if (colCmtChk) colCmtChk.checked = !!o.showCommentsCol;

  var sepChk = document.getElementById('tcModalCompSeparatePage');
  if (sepChk) {
    sepChk.checked = isExamLevel
      ? !!(cSt.separatePage || cSt.pageOrientation === 'landscape')
      : !!(ex.forcePageBreak || o.separatePage || o.pageOrientation === 'landscape');
  }

  tcRenderCompLayoutPreview(isExamLevel ? '__exam__' : ex);
  modal.classList.add('open');
  modal.style.display = 'flex';
};

window.tcCloseCompetenceLayoutModal = function () {
  var modal = document.getElementById('tcCompLayoutModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  window._currentEditingCompExId = null;
};

window.tcUpdateModalCompOption = function (key, value) {
  if (!window._currentEditingCompExId) return;
  if (window._currentEditingCompExId === '__exam__') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    var cSt = hc.competencesStyle || (hc.competencesStyle = {});
    if (key === 'compTitle' || key === 'title') {
      hc.competencesLabel = value;
    } else if (key === 'showDescriptions') {
      cSt.showDescriptions = !!value;
      hc.showCompetenceDescriptions = !!value;
      var barDescChk = document.getElementById('testCompetencesDescPrintChk');
      if (barDescChk) barDescChk.checked = !!value;
    } else if (key === 'pageOrientation') {
      cSt.pageOrientation = value;
      if (value === 'landscape') {
        cSt.separatePage = true;
        var sepChk = document.getElementById('tcModalCompSeparatePage');
        if (sepChk) sepChk.checked = true;
      }
    } else if (key === 'separatePage') {
      cSt.separatePage = !!value;
    } else {
      cSt[key] = value;
    }
    tcOnDirty();
    tcRenderCompLayoutPreview('__exam__');
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
    return;
  }

  var ex = (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingCompExId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  syncRubricOptionKeys(o, key, value, ex);
  if (key === 'pageOrientation' && value === 'landscape') {
    var sepChk2 = document.getElementById('tcModalCompSeparatePage');
    if (sepChk2) sepChk2.checked = true;
  }
  renderExerciseCards();
  tcOnDirty();
  tcRenderCompLayoutPreview(ex);
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcRenderCompLayoutPreview = function (exOrTarget) {
  var previewBox = document.getElementById('tcCompLayoutPreviewBox');
  if (!previewBox || !exOrTarget) return;
  var isExamLevel = (exOrTarget === '__exam__');
  var ex = isExamLevel ? null : exOrTarget;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var cSt = hc.competencesStyle || {};
  var o = isExamLevel ? cSt : TestCreatorService.ensureExerciseOptions(ex);

  var rawComps = [];
  if (isExamLevel) {
    rawComps = (Array.isArray(currentTest.linkedCompetences) && currentTest.linkedCompetences.length)
      ? currentTest.linkedCompetences
      : (Array.isArray(currentTest.linkedCompetenceIds) ? currentTest.linkedCompetenceIds : []);
  } else {
    rawComps = (Array.isArray(ex.linkedCompetences) && ex.linkedCompetences.length)
      ? ex.linkedCompetences
      : (Array.isArray(ex.linkedCompetenceIds) && ex.linkedCompetenceIds.length
        ? ex.linkedCompetenceIds
        : ((currentTest && Array.isArray(currentTest.linkedCompetences)) ? currentTest.linkedCompetences : []));
  }

  if (rawComps.length === 0) {
    rawComps = [
      {
        code: 'L2.1',
        title: 'Written Comprehension & Interpretation',
        description: 'Understand main ideas and specific details in authentic written texts.',
        level: 'B1 / 10e',
        domain: 'Reading'
      },
      {
        code: 'L2.2',
        title: 'Written Expression & Argumentation',
        description: 'Produce clear, coherent text on familiar or curriculum topics.',
        level: 'B1 / 10e',
        domain: 'Writing'
      }
    ];
  }

  var defaultPreviewTitle = isExamLevel
    ? (hc.competencesLabel || 'Competences & Curriculum Objectives:')
    : (o.compTitle || ex.title || 'Competences & Curriculum Objectives');

  var isSep = isExamLevel
    ? !!(cSt.separatePage || cSt.pageOrientation === 'landscape')
    : !!(ex.forcePageBreak || o.separatePage || o.pageOrientation === 'landscape');
  var orient = o.pageOrientation || 'portrait';
  var pageBadge = isSep
    ? '<div style="margin-bottom:6px;display:inline-flex;align-items:center;gap:6px;background:#eff6ff;border:1.5px solid #2563eb;color:#1e40af;font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:4px;">📄 Separate Page (' + (orient === 'landscape' ? 'Landscape A4' : 'Portrait A4') + ')</div>'
    : '';

  var html = TestCreatorService.renderCompetencesHtml({ linkedCompetences: rawComps, exercises: [] }, {
    title: defaultPreviewTitle,
    displayMode: o.displayMode || 'table',
    showCodeCol: o.showCodeCol !== false,
    showTitleCol: o.showTitleCol !== false,
    showDescriptions: isExamLevel
      ? (cSt.showDescriptions !== undefined ? cSt.showDescriptions : (hc.showCompetenceDescriptions !== false))
      : (o.showDescriptions !== false),
    showLevelCol: o.showLevelCol !== false,
    showScoreCol: !!o.showScoreCol,
    showCommentsCol: !!o.showCommentsCol,
    background: o.background || 'default',
    padding: o.padding || 'standard',
    border: o.border || 'solid',
    applyPageLayout: false
  });

  previewBox.innerHTML = pageBadge + (html || '<div style="color:#64748b;font-style:italic;">No competences to preview</div>');
};

window.tcResetCompLayoutOptions = function () {
  if (!window._currentEditingCompExId) return;
  if (window._currentEditingCompExId === '__exam__') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    hc.competencesLabel = 'Competences & Curriculum Objectives:';
    hc.showCompetenceDescriptions = true;
    hc.competencesStyle = Object.assign({}, TestCreatorService.DEFAULT_HEADER_CONFIG.competencesStyle);
    tcOpenCompetenceLayoutModal('__exam__');
    tcOnDirty();
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
    if (window.showToast) showToast(i18n.t('tcCompResetToast') || 'Competence layout reset to defaults');
    return;
  }
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingCompExId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  o.displayMode = 'table';
  o.background = 'default';
  o.padding = 'standard';
  o.border = 'solid';
  o.showCodeCol = true;
  o.showTitleCol = true;
  o.showDescriptions = true;
  o.showLevelCol = true;
  o.showScoreCol = false;
  o.showCommentsCol = false;
  o.separatePage = false;
  o.pageOrientation = 'portrait';
  ex.forcePageBreak = false;
  o.compTitle = '';

  renderExerciseCards();
  tcOpenCompetenceLayoutModal(ex.id);
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
  if (window.showToast) {
    showToast(i18n.t('tcCompResetToast') || 'Competence layout reset to defaults');
  }
};

// ── Grading Scale Layout & Appearance Modal Handlers ───────────────────
window._currentEditingScaleExId = null;

window.tcOpenScaleLayoutModal = function (exId) {
  if (!currentTest) return;
  var isExamLevel = (!exId || exId === '__exam__' || exId === '__all__');
  var ex = isExamLevel ? null : (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!isExamLevel && !ex) return;
  window._currentEditingScaleExId = isExamLevel ? '__exam__' : exId;

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var sSt = hc.gradingScaleStyle || {};
  var o = isExamLevel ? sSt : TestCreatorService.ensureExerciseOptions(ex);

  var modal = document.getElementById('tcScaleLayoutModal');
  if (!modal) return;

  var subEl = document.getElementById('tcScaleLayoutModalSub');
  if (subEl) {
    subEl.textContent = isExamLevel
      ? ((currentTest.title || 'Exam') + ' — ' + (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)'))
      : ((ex.title || i18n.t('tcTypeSectionGradingScale') || 'Grading Scale Block') + ' — ' + (i18n.t('tcScaleCustomiseDisplayHelp') || 'Customise grading scale columns, display mode, orientation, and appearance'));
  }

  var titleInp = document.getElementById('tcModalScaleTitle');
  if (titleInp) titleInp.value = isExamLevel ? (hc.gradingScaleLabel || '') : (o.scaleTitle || ex.title || '');

  var modeSel = document.getElementById('tcModalScaleDisplayMode');
  if (modeSel) modeSel.value = o.displayMode || 'table';

  var bgSel = document.getElementById('tcModalScaleBg');
  if (bgSel) bgSel.value = o.background || 'default';

  var padSel = document.getElementById('tcModalScalePadding');
  if (padSel) padSel.value = o.padding || 'standard';

  var borderSel = document.getElementById('tcModalScaleBorder');
  if (borderSel) borderSel.value = o.border || 'solid';

  var orientSel = document.getElementById('tcModalScaleOrientation');
  if (orientSel) orientSel.value = o.pageOrientation || 'portrait';

  var colGradeChk = document.getElementById('tcModalScaleColGrade');
  if (colGradeChk) colGradeChk.checked = o.showGradeCol !== false;

  var colThresholdChk = document.getElementById('tcModalScaleColThreshold');
  if (colThresholdChk) colThresholdChk.checked = o.showThresholdCol !== false;

  var colPointsChk = document.getElementById('tcModalScaleColPoints');
  if (colPointsChk) colPointsChk.checked = o.showPointsCol !== false;

  var colNotesChk = document.getElementById('tcModalScaleColNotes');
  if (colNotesChk) colNotesChk.checked = o.showNotesCol !== false;

  var sepChk = document.getElementById('tcModalScaleSeparatePage');
  if (sepChk) {
    sepChk.checked = isExamLevel
      ? !!(sSt.separatePage || sSt.pageOrientation === 'landscape')
      : !!(ex.forcePageBreak || o.separatePage || o.pageOrientation === 'landscape');
  }

  tcRenderScaleLayoutPreview(isExamLevel ? '__exam__' : ex);
  modal.classList.add('open');
  modal.style.display = 'flex';
};

window.tcCloseScaleLayoutModal = function () {
  var modal = document.getElementById('tcScaleLayoutModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  window._currentEditingScaleExId = null;
};

window.tcUpdateModalScaleOption = function (key, value) {
  if (!window._currentEditingScaleExId) return;
  if (window._currentEditingScaleExId === '__exam__') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    var sSt = hc.gradingScaleStyle || (hc.gradingScaleStyle = {});
    if (key === 'scaleTitle' || key === 'title') {
      hc.gradingScaleLabel = value;
    } else if (key === 'pageOrientation') {
      sSt.pageOrientation = value;
      if (value === 'landscape') {
        sSt.separatePage = true;
        var sepChk = document.getElementById('tcModalScaleSeparatePage');
        if (sepChk) sepChk.checked = true;
      }
    } else if (key === 'separatePage') {
      sSt.separatePage = !!value;
    } else {
      sSt[key] = value;
    }
    tcOnDirty();
    tcRenderScaleLayoutPreview('__exam__');
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
    return;
  }

  var ex = (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingScaleExId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  syncRubricOptionKeys(o, key, value, ex);
  if (key === 'scaleTitle') ex.title = value;
  if (key === 'pageOrientation' && value === 'landscape') {
    var sepChk2 = document.getElementById('tcModalScaleSeparatePage');
    if (sepChk2) sepChk2.checked = true;
  }
  renderExerciseCards();
  tcOnDirty();
  tcRenderScaleLayoutPreview(ex);
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcRenderScaleLayoutPreview = function (exOrTarget) {
  var previewBox = document.getElementById('tcScaleLayoutPreviewBox');
  if (!previewBox || !currentTest) return;

  var isExamLevel = (exOrTarget === '__exam__');
  var ex = isExamLevel ? null : exOrTarget;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var sSt = hc.gradingScaleStyle || {};
  var o = isExamLevel ? sSt : (ex ? TestCreatorService.ensureExerciseOptions(ex) : sSt);

  var totalPts = TestCreatorService.calculateTotalTestPoints(currentTest);
  var scaleHtml = TestCreatorService.renderGradingScaleHtml(currentTest, {
    title: isExamLevel ? (hc.gradingScaleLabel || 'Grading Scale & Score Conversion:') : (o.scaleTitle || (ex && ex.title) || 'Grading Scale & Score Conversion'),
    displayMode: o.displayMode || 'table',
    totalPoints: totalPts,
    background: o.background || 'default',
    border: o.border || 'solid',
    padding: o.padding || 'standard',
    showGradeCol: o.showGradeCol !== false,
    showThresholdCol: o.showThresholdCol !== false,
    showPointsCol: o.showPointsCol !== false,
    showNotesCol: o.showNotesCol !== false,
    separatePage: false,
    applyPageLayout: false
  });

  previewBox.innerHTML = scaleHtml || '<div style="font-size:0.8rem;color:#64748b;font-style:italic;">No grading scale active.</div>';
};

window.tcResetScaleLayoutOptions = function () {
  if (!window._currentEditingScaleExId) return;
  if (window._currentEditingScaleExId === '__exam__') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    hc.gradingScaleLabel = 'Grading Scale & Score Conversion:';
    hc.gradingScaleStyle = {
      bold: true,
      italic: false,
      displayMode: 'table',
      background: 'default',
      padding: 'standard',
      border: 'solid',
      showGradeCol: true,
      showThresholdCol: true,
      showPointsCol: true,
      showNotesCol: true,
      separatePage: false,
      pageOrientation: 'portrait'
    };
    tcOpenScaleLayoutModal('__exam__');
    tcOnDirty();
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
    return;
  }

  var ex = (currentTest.exercises || []).find(function (e) { return e.id === window._currentEditingScaleExId; });
  if (!ex) return;
  ex.options = {
    displayMode: 'table',
    background: 'default',
    border: 'solid',
    padding: 'standard',
    showGradeCol: true,
    showThresholdCol: true,
    showPointsCol: true,
    showNotesCol: true,
    separatePage: false,
    pageOrientation: 'portrait'
  };
  ex.title = 'Grading Scale & Score Conversion';
  renderExerciseCards();
  tcOpenScaleLayoutModal(ex.id);
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

function updateCompetenceTargetDropdown() {
  var sel = document.getElementById('competenceTargetExSelect');
  if (!sel || !currentTest) return;
  var exs = currentTest.exercises || [];
  var exCounter = 0;
  var opts = '<option value="__exam__">' + (typeof i18n !== 'undefined' && i18n.t ? (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)') : 'Entire Exam (Test-wide Header)') + '</option>' +
    exs.map(function (e) {
      var label = '';
      if (e.type === 'section_competences') {
        label = '📋 ' + (i18n.t('tcBlockCompetencesSection') || 'Section Block: ') + (e.title || 'Competences & Objectives');
      } else if (e.type === 'section_criteria') {
        label = '📋 ' + (i18n.t('tcBlockCriteriaSection') || 'Section Block: ') + (e.title || 'Criteria & Rubrics');
      } else if (e.type === 'section_grading_scale') {
        label = '📋 ' + (i18n.t('tcBlockScaleSection') || 'Section Block: ') + (e.title || 'Grading Scale');
      } else if (e.type === 'section_custom' || e.type === 'custom_block') {
        label = '📋 ' + (i18n.t('tcBlockCustomSection') || 'Section Block: ') + (e.title || 'Custom Block');
      } else {
        exCounter++;
        label = 'Ex ' + exCounter + ': ' + (e.title || 'Exercise');
      }
      return '<option value="' + e.id + '">' + escapeHtml(label) + '</option>';
    }).join('');
  sel.innerHTML = opts;
  if (_targetAttachExId && _targetAttachExId !== '__exam__' && exs.some(function (e) { return e.id === _targetAttachExId; })) {
    sel.value = _targetAttachExId;
  } else {
    sel.value = '__exam__';
    if (!_targetAttachExId || !exs.some(function (e) { return e.id === _targetAttachExId; })) {
      _targetAttachExId = '__exam__';
    }
  }
}

window.updateCompetenceTargetDropdown = updateCompetenceTargetDropdown;

window.tcOnCompetenceTargetChange = function () {
  var sel = document.getElementById('competenceTargetExSelect');
  var val = sel ? sel.value : '__exam__';
  _targetAttachExId = (val === '__exam__') ? '__exam__' : val;
  tcFilterCompetences();
};

function isSubjectMatch(sub1, sub2) {
  if (!sub1 || !sub2) return true;
  var s1 = String(sub1).trim().toLowerCase();
  var s2 = String(sub2).trim().toLowerCase();
  if (s1 === 'all' || s2 === 'all') return true;
  if (s1 === s2) return true;

  var aliases = [
    ['english', 'anglais', 'engl', 'angl'],
    ['french', 'français', 'francais'],
    ['german', 'allemand', 'deutsch'],
    ['spanish', 'espagnol', 'español'],
    ['italian', 'italien', 'italiano'],
    ['science', 'sciences', 'stem', 'svt', 'physique', 'chimie', 'biology', 'biologie'],
    ['math', 'mathematics', 'maths', 'mathématiques', 'mathematiques'],
    ['history', 'histoire'],
    ['geography', 'géographie', 'geographie']
  ];

  for (var i = 0; i < aliases.length; i++) {
    var grp = aliases[i];
    var m1 = grp.some(function (a) { return s1 === a || s1.indexOf(a) !== -1; });
    var m2 = grp.some(function (a) { return s2 === a || s2.indexOf(a) !== -1; });
    if (m1 && m2) return true;
  }

  return false;
}

function tcHighlightMatchText(text, rawQuery) {
  if (!text) return '';
  var str = String(text);
  if (!rawQuery) return escapeHtml(str);
  var q = rawQuery.trim();
  if (!q) return escapeHtml(str);
  var escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var regex = new RegExp('(' + escapedQuery + ')', 'gi');
  var parts = str.split(regex);
  return parts.map(function (part) {
    if (part.toLowerCase() === q.toLowerCase()) {
      return '<mark class="search-highlight">' + escapeHtml(part) + '</mark>';
    }
    return escapeHtml(part);
  }).join('');
}

function tcPopulateCompFilterDropdownOptions() {
  var subSelect = document.getElementById('drawerCompFilterSubject');
  var yrSelect = document.getElementById('drawerCompFilterYear');
  if (!subSelect && !yrSelect) return;

  var currentSub = subSelect ? subSelect.value : 'all';
  var currentYr = yrSelect ? yrSelect.value : 'all';

  var subjects = new Set(['English', 'French', 'Science', 'Mathematics', 'History', 'Geography', 'Art', 'Music', 'Spanish', 'German']);
  var yearLevels = new Set();

  (activeClassGroups || []).forEach(function (g) {
    if (g.subject && g.subject.trim()) subjects.add(g.subject.trim());
    if (g.level) yearLevels.add(String(g.level).trim());
  });

  (_cachedCompetences || []).forEach(function (c) {
    if (c) {
      var s = c.subjectId || c.subject;
      if (s && s !== 'all') subjects.add(String(s).trim());
      var y = c.yearLevel || c.year;
      if (y && y !== 'all') yearLevels.add(String(y).trim());
    }
  });

  if (currentTest && currentTest.subject) {
    subjects.add(currentTest.subject.trim());
  }

  if (subSelect) {
    subSelect.innerHTML = '<option value="all" data-i18n="lcAllSubjects">' + (i18n.t('lcAllSubjects') || 'All Subjects') + '</option>';
    Array.from(subjects).filter(Boolean).sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    }).forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      subSelect.appendChild(opt);
    });
    if (currentSub && (subjects.has(currentSub) || currentSub === 'all')) {
      subSelect.value = currentSub;
    }
  }

  if (yrSelect) {
    yrSelect.innerHTML = '<option value="all" data-i18n="lcAllYears">' + (i18n.t('lcAllYears') || 'All Year Levels') + '</option>';
    Array.from(yearLevels).filter(Boolean).sort().forEach(function (y) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yrSelect.appendChild(opt);
    });
    if (currentYr && (yearLevels.has(currentYr) || currentYr === 'all')) {
      yrSelect.value = currentYr;
    }
  }
}

function tcPopulateCompCategoryDropdown(subId) {
  var catSelect = document.getElementById('drawerCompFilterCategory');
  if (!catSelect) return;
  var currentVal = catSelect.value;
  var subIdLower = String(subId || 'all').toLowerCase();
  var categories = new Set();
  (_cachedCompetences || []).forEach(function (d) {
    var dSub = String(d.subjectId || d.subject || '').toLowerCase();
    if (subIdLower === 'all' || isSubjectMatch(dSub, subIdLower)) {
      if (d.category) categories.add(d.category);
    }
  });

  catSelect.innerHTML = '<option value="all" data-i18n="lcAllCategories">' + (i18n.t('lcAllCategories') || 'All Categories') + '</option>';
  Array.from(categories).sort().forEach(function (cat) {
    var opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });
  if (categories.has(currentVal)) {
    catSelect.value = currentVal;
  }
}

window.tcOnCompCategoryChange = function () {
  var cat = document.getElementById('drawerCompFilterCategory').value;
  var subCatSelect = document.getElementById('drawerCompFilterSubCategory');
  var subCats = new Set();
  (_cachedCompetences || []).forEach(function (d) {
    if (cat === 'all' || d.category === cat) {
      if (d.subCategory) subCats.add(d.subCategory);
    }
  });
  if (subCatSelect) {
    subCatSelect.innerHTML = '<option value="all" data-i18n="lcAllSubCategories">' + (i18n.t('lcAllSubCategories') || 'All Subcategories') + '</option>';
    subCats.forEach(function (sub) {
      var opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      subCatSelect.appendChild(opt);
    });
  }
  tcFilterCompetences();
};

function tcUpdateCompInfoBars(filteredCount, totalCount, rawQuery, subId, yrId, catId, subCatId) {
  var countEl = document.getElementById('drawerCompMatchCount');
  if (countEl) {
    countEl.textContent = 'Showing ' + filteredCount + ' of ' + totalCount + ' competences';
  }

  var filterBar = document.getElementById('drawerCompActiveFilters');
  if (!filterBar) return;
  filterBar.innerHTML = '';

  var activePills = [];
  if (rawQuery) {
    activePills.push('<span class="drawer-filter-pill">Search: "' + escapeHtml(rawQuery) + '" <span class="drawer-filter-pill-remove" onclick="tcClearActiveCompetenceFilter(\'search\')">&times;</span></span>');
  }
  if (subId && subId !== 'all') {
    activePills.push('<span class="drawer-filter-pill">Subject: ' + escapeHtml(subId) + ' <span class="drawer-filter-pill-remove" onclick="tcClearActiveCompetenceFilter(\'subject\')">&times;</span></span>');
  }
  if (yrId && yrId !== 'all') {
    activePills.push('<span class="drawer-filter-pill">Year: ' + escapeHtml(yrId) + ' <span class="drawer-filter-pill-remove" onclick="tcClearActiveCompetenceFilter(\'year\')">&times;</span></span>');
  }
  if (catId && catId !== 'all') {
    activePills.push('<span class="drawer-filter-pill">Cat: ' + escapeHtml(catId) + ' <span class="drawer-filter-pill-remove" onclick="tcClearActiveCompetenceFilter(\'category\')">&times;</span></span>');
  }
  if (subCatId && subCatId !== 'all') {
    activePills.push('<span class="drawer-filter-pill">Subcat: ' + escapeHtml(subCatId) + ' <span class="drawer-filter-pill-remove" onclick="tcClearActiveCompetenceFilter(\'subcategory\')">&times;</span></span>');
  }

  if (activePills.length > 0) {
    activePills.push('<button type="button" class="neo-btn danger" style="padding:1px 6px;font-size:0.7rem;" onclick="tcResetAllCompetenceFilters()">Clear All</button>');
  }

  filterBar.innerHTML = activePills.join('');
}

window.tcResetAllCompetenceFilters = function () {
  var sInp = document.getElementById('drawerCompetenceSearch');
  if (sInp) sInp.value = '';
  var fSub = document.getElementById('drawerCompFilterSubject');
  if (fSub) fSub.value = 'all';
  var fYr = document.getElementById('drawerCompFilterYear');
  if (fYr) fYr.value = 'all';
  var fCat = document.getElementById('drawerCompFilterCategory');
  if (fCat) fCat.value = 'all';
  var fSubCat = document.getElementById('drawerCompFilterSubCategory');
  if (fSubCat) fSubCat.value = 'all';
  tcFilterCompetences();
};

window.tcClearActiveCompetenceFilter = function (filterKey) {
  if (filterKey === 'search') {
    var sInp = document.getElementById('drawerCompetenceSearch');
    if (sInp) sInp.value = '';
  }
  if (filterKey === 'subject') {
    var fSub = document.getElementById('drawerCompFilterSubject');
    if (fSub) fSub.value = 'all';
  }
  if (filterKey === 'year') {
    var fYr = document.getElementById('drawerCompFilterYear');
    if (fYr) fYr.value = 'all';
  }
  if (filterKey === 'category') {
    var fCat = document.getElementById('drawerCompFilterCategory');
    if (fCat) fCat.value = 'all';
  }
  if (filterKey === 'subcategory') {
    var fSubCat = document.getElementById('drawerCompFilterSubCategory');
    if (fSubCat) fSubCat.value = 'all';
  }
  tcFilterCompetences();
};

window.tcFilterCompetences = function () {
  var sInp = document.getElementById('drawerCompetenceSearch');
  var rawQuery = (sInp ? sInp.value : '').trim();
  var query = rawQuery.toLowerCase();

  var subSelect = document.getElementById('drawerCompFilterSubject');
  var yrSelect = document.getElementById('drawerCompFilterYear');
  var catSelect = document.getElementById('drawerCompFilterCategory');
  var subCatSelect = document.getElementById('drawerCompFilterSubCategory');
  var sortSelect = document.getElementById('drawerCompSort');

  var subId = (subSelect ? subSelect.value : 'all').toLowerCase();
  var yrId = (yrSelect ? yrSelect.value : 'all').toLowerCase();
  var catId = (catSelect ? catSelect.value : 'all').toLowerCase();
  var subCatId = (subCatSelect ? subCatSelect.value : 'all').toLowerCase();
  var sortMode = sortSelect ? sortSelect.value : 'code';

  tcPopulateCompCategoryDropdown(subId);

  var filtered = (_cachedCompetences || []).filter(function (d) {
    var dSub = String(d.subjectId || d.subject || '').toLowerCase();
    var dYr = String(d.yearLevel || d.year || '').toLowerCase();
    var dCat = String(d.category || '').toLowerCase();
    var dSubCat = String(d.subCategory || '').toLowerCase();

    if (subId !== 'all' && !isSubjectMatch(dSub, subId)) return false;
    if (yrId !== 'all' && dYr && dYr !== 'all' && dYr !== yrId) return false;
    if (catId !== 'all' && dCat && dCat !== 'all' && dCat !== catId) return false;
    if (subCatId !== 'all' && dSubCat && dSubCat !== 'all' && dSubCat !== subCatId) return false;

    if (query) {
      var tagsStr = Array.isArray(d.tags) ? d.tags.join(' ') : String(d.tags || '');
      var fullText = [
        d.code || '',
        d.title || '',
        d.description || '',
        d.category || '',
        d.subCategory || '',
        d.subjectId || '',
        d.yearLevel || '',
        d.level || '',
        tagsStr,
        d.comments || '',
        d.sampleTasks || ''
      ].join(' ').toLowerCase();

      if (fullText.indexOf(query) === -1) return false;
    }
    return true;
  });

  // Sort
  filtered.sort(function (a, b) {
    if (sortMode === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
    if (sortMode === 'level') return String(a.level || '').localeCompare(String(b.level || ''));
    return String(a.code || '').localeCompare(String(b.code || ''));
  });

  tcUpdateCompInfoBars(filtered.length, (_cachedCompetences || []).length, rawQuery, subId, yrId, catId, subCatId);
  tcRenderCompetenceList(filtered, rawQuery);
};

function tcRenderCompetenceList(list, rawQuery) {
  var el = document.getElementById('competenceDbList');
  if (!el) return;

  updateCompetenceTargetDropdown();

  if (!list || !list.length) {
    _currentRenderedCompetences = [];
    el.innerHTML = '<div style="text-align:center;padding:25px;color:#888;font-size:0.85rem;font-weight:700;">' + escapeHtml(i18n.t('tcNoCompetencesMatch')) + '</div>';
    return;
  }

  var targetEx = (_targetAttachExId && _targetAttachExId !== '__exam__') ? currentTest.exercises.find(function (e) { return e.id === _targetAttachExId; }) : null;
  var targetLabel = targetEx
    ? ((targetEx.type === 'section_competences' ? 'Block: "' : 'Exercise "') + (targetEx.title || 'Section') + '"')
    : (typeof i18n !== 'undefined' && i18n.t ? (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide Header)') : 'Entire Exam (Test-wide Header)');

  var headerNote = '<div style="background:#dbeafe;border:1.5px solid #2563eb;color:#1e40af;padding:6px 10px;border-radius:4px;font-size:0.78rem;font-weight:800;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
    '<span>Tagging to: ' + escapeHtml(targetLabel) + '</span>' +
    '<span style="font-size:0.7rem;color:#2563eb;font-weight:600;">Click + Tag or card to attach</span>' +
    '</div>';

  var cfg = competenceDisplayConfig || DEFAULT_COMPETENCE_CONFIG;
  var fragment = document.createDocumentFragment();

  var noteDiv = document.createElement('div');
  noteDiv.innerHTML = headerNote;
  fragment.appendChild(noteDiv.firstElementChild);

  _currentRenderedCompetences = list.slice(0, 200);

  _currentRenderedCompetences.forEach(function (d, idx) {
    var card = document.createElement('div');
    var rawSub = String(d.subjectId || d.subject || 'general').toLowerCase();
    var subClass = 'subject-' + rawSub.replace(/[^a-z0-9_]/g, '_');

    card.className = 'drawer-desc-card ' + subClass;
    if (cfg.preset === 'compact') {
      card.classList.add('compact-mode');
    }
    card.draggable = true;
    card.dataset.id = d.id;

    card.addEventListener('dragstart', function (e) {
      card.classList.add('dragging');
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'descriptor',
        descriptorId: d.id,
        code: d.code || d.id,
        title: d.title || ''
      }));
      e.dataTransfer.setData('text/plain', d.id);
      e.dataTransfer.effectAllowed = 'copy';
    });

    card.addEventListener('dragend', function () {
      card.classList.remove('dragging');
    });

    card.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('button, input, select, label')) return;
      tcAttachCompetenceByObject(d);
    });

    var htmlParts = [];

    // Header: Code & Level
    var codeHtml = cfg.showCode ? ('<span class="drawer-desc-code">' + tcHighlightMatchText(d.code || d.id || '', rawQuery) + '</span>') : '';
    var levelHtml = (cfg.showLevel && d.level) ? ('<span class="drawer-desc-level">' + tcHighlightMatchText(d.level, rawQuery) + '</span>') : '';
    if (codeHtml || levelHtml) {
      htmlParts.push('<div class="drawer-desc-header">' + codeHtml + levelHtml + '</div>');
    }

    // Title
    if (cfg.showTitle) {
      htmlParts.push('<div class="drawer-desc-title">' + tcHighlightMatchText(d.title || 'Untitled Descriptor', rawQuery) + '</div>');
    }

    // Description
    if (cfg.showDescription && d.description && cfg.preset !== 'minimal') {
      htmlParts.push('<div class="drawer-desc-text">' + tcHighlightMatchText(d.description, rawQuery) + '</div>');
    }

    // Tags
    // Detailed description: one toggle per line
    if (cfg.showDetailedDescription !== false && cfg.preset !== 'minimal' && window.CompetenceAggregatorService) {
      var dLines = window.CompetenceAggregatorService.getDetailedLines(d);
      if (dLines.length) {
        var hiddenLines = (cfg.hiddenDetailLines && cfg.hiddenDetailLines[d.id]) || [];
        htmlParts.push('<div class="drawer-detail-list">' + dLines.map(function (line) {
          var on = hiddenLines.indexOf(line) === -1;
          return '<label class="drawer-detail-row' + (on ? '' : ' is-off') + '" onclick="event.stopPropagation();"><span class="neo-switch"><input type="checkbox" ' + (on ? 'checked ' : '') + 'data-comp-id="' + escapeHtml(String(d.id)) + '" data-line="' + escapeHtml(line) + '" onchange="tcToggleDetailLine(this)"><span class="neo-switch-slider"></span></span><span class="drawer-detail-text">' + tcHighlightMatchText(line, rawQuery) + '</span></label>';
        }).join('') + '</div>');
      }
    }
    if (cfg.showTags && cfg.preset !== 'minimal') {
      var tagsArr = Array.isArray(d.tags) ? d.tags : (d.tags ? [d.tags] : []);
      if (tagsArr.length > 0) {
        htmlParts.push('<div class="drawer-tag-container" style="font-size:0.7rem;color:#2563eb;margin-top:2px;">' + tcHighlightMatchText(tagsArr.join(', '), rawQuery) + '</div>');
      }
    }

    // Comments / Notes
    if (cfg.showComments && (d.comments || d.sampleTasks) && cfg.preset !== 'minimal') {
      var cText = d.comments || d.sampleTasks;
      htmlParts.push('<div class="drawer-desc-comment">' + tcHighlightMatchText(cText, rawQuery) + '</div>');
    }

    // Footer: Category & Actions
    var catLabel = cfg.showCategory ? (d.subCategory || d.category || d.subjectId || d.subject || '') : '';
    var catHtml = catLabel ? ('<span style="font-size:0.72rem;font-weight:800;color:#666;">' + tcHighlightMatchText(catLabel, rawQuery) + '</span>') : '<span></span>';
    var btnHtml = cfg.showActions ? ('<button type="button" class="neo-btn primary sm tc-comp-tag-btn" style="padding:2px 8px;font-size:0.72rem;" data-comp-idx="' + idx + '" onclick="event.stopPropagation(); tcAttachCompetenceByIndex(' + idx + ')">' + escapeHtml(i18n.t('lcTagPlaceholder') || '+ Tag') + '</button>') : '';

    if (cfg.showCategory || cfg.showActions) {
      htmlParts.push('<div class="drawer-desc-actions">' + catHtml + btnHtml + '</div>');
    }

    // Compact Expand Toggle
    if (cfg.preset === 'compact') {
      htmlParts.push('<button type="button" class="card-expand-toggle" onclick="event.stopPropagation(); this.parentElement.classList.toggle(\'expanded\'); this.textContent = this.parentElement.classList.contains(\'expanded\') ? \'Details ▲\' : \'Details ▾\';">Details ▾</button>');
    }

    card.innerHTML = htmlParts.join('');

    var tagBtn = card.querySelector('.tc-comp-tag-btn');
    if (tagBtn) {
      tagBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        tcAttachCompetenceByObject(d);
      });
    }

    fragment.appendChild(card);
  });

  el.innerHTML = '';
  el.appendChild(fragment);
}

window.tcAttachCompetenceToEx = function (exId) {
  _targetAttachExId = exId;
  var ex = currentTest.exercises.find(function (e) { return e.id === exId; });
  if (!ex) return;

  var drawer = document.getElementById('testDrawer');
  if (drawer) drawer.style.display = 'flex';
  tcSwitchDrawerTab('competences');
  updateCompetenceTargetDropdown();
  tcFilterCompetences();
  if (window.showToast) {
    showToast(i18n.tFmt('tcSelectCompetenceDrawerPrompt', { title: ex.title || i18n.t('tcExercise') }));
  }
};

window.tcAttachCompetenceByObject = function (comp, targetId) {
  if (!comp || !currentTest) return;
  var codeDisplay = comp.code ? comp.code : (comp.id || 'Comp');
  var label = codeDisplay;
  if (comp.title && comp.title !== codeDisplay) {
    label += ' - ' + comp.title;
  }
  if (comp.level && label.indexOf(comp.level) === -1) {
    label = '[' + comp.level + '] ' + label;
  }

  var targetSel = document.getElementById('competenceTargetExSelect');
  var targetVal = targetId || (targetSel ? targetSel.value : (_targetAttachExId || '__exam__'));
  if (targetId) {
    _targetAttachExId = targetId;
    if (targetSel) targetSel.value = targetId;
  }

  var compObj = {
    id: comp.id || comp.code || ('comp_' + Date.now()),
    code: comp.code || comp.id || '',
    title: comp.title || comp.name || codeDisplay,
    description: tcDescText({ id: comp.id || comp.code, description: comp.description || comp.descriptors || comp.desc || '', detailedDescription: comp.detailedDescription }),
    baseDescription: comp.description || comp.descriptors || comp.desc || '',
    detailedDescription: (window.CompetenceAggregatorService ? window.CompetenceAggregatorService.getDetailedLines(comp) : []),
    hiddenDetailLines: ((competenceDisplayConfig && competenceDisplayConfig.hiddenDetailLines && competenceDisplayConfig.hiddenDetailLines[comp.id || comp.code]) || []).slice(),
    level: comp.level || comp.yearLevel || '',
    domain: comp.domain || comp.category || ''
  };

  if (targetVal && targetVal !== '__exam__') {
    var targetEx = currentTest.exercises.find(function (e) { return e.id === targetVal; });
    if (targetEx) {
      if (!Array.isArray(targetEx.linkedCompetences)) targetEx.linkedCompetences = [];
      var isDup = targetEx.linkedCompetences.some(function (c) {
        return (c.code && compObj.code && c.code === compObj.code) ||
               (c.id && compObj.id && c.id === compObj.id) ||
               (c.title && compObj.title && c.title === compObj.title);
      });
      if (isDup) {
        if (window.showToast) showToast(i18n.t('tcCompAlreadyInTarget') || 'Objective already attached to this block/exercise.', true);
        return;
      }
      targetEx.linkedCompetences.push(compObj);
      if (!Array.isArray(targetEx.linkedCompetenceIds)) targetEx.linkedCompetenceIds = [];
      if (targetEx.linkedCompetenceIds.indexOf(label) === -1) {
        targetEx.linkedCompetenceIds.push(label);
      }
      renderExerciseCards();
      if (window.showToast) {
        showToast(i18n.tFmt('tcTaggedToTarget', { label: (compObj.title || label).slice(0, 30) + '…', target: targetEx.title || (targetEx.type === 'section_competences' ? 'Competences Block' : 'Exercise') }));
      }
    }
  } else {
    // Entire exam / Test-wide header
    if (!Array.isArray(currentTest.linkedCompetences)) currentTest.linkedCompetences = [];
    var isExamDup = currentTest.linkedCompetences.some(function (c) {
      return (c.code && compObj.code && c.code === compObj.code) ||
             (c.id && compObj.id && c.id === compObj.id) ||
             (c.title && compObj.title && c.title === compObj.title);
    });
    if (isExamDup) {
      if (window.showToast) showToast(i18n.t('tcCompAlreadyInTarget') || 'Objective already attached to this test.', true);
      return;
    }
    currentTest.linkedCompetences.push(compObj);
    if (!Array.isArray(currentTest.linkedCompetenceIds)) currentTest.linkedCompetenceIds = [];
    if (currentTest.linkedCompetenceIds.indexOf(label) === -1) {
      currentTest.linkedCompetenceIds.push(label);
    }
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    hc.showCompetences = true;
    renderTestCompetenceBadges();
    if (window.showToast) {
      showToast(i18n.tFmt('tcTaggedToTarget', { label: (compObj.title || label).slice(0, 30) + '…', target: 'entire exam' }));
    }
  }

  if (typeof LinksService !== 'undefined') {
    var tUrn = tcGetActiveTestUrn();
    var cCode = (comp.code || comp.id || '').trim();
    if (tUrn && cCode) {
      var sUrn = (targetVal && targetVal !== '__exam__') ? (tUrn + '#' + targetVal) : tUrn;
      LinksService.addLink(sUrn, 'cmt:competence:' + cCode, {
        relation: 'assesses',
        meta: {
          testTitle: currentTest.title || 'Exam',
          exerciseTitle: (targetVal && targetVal !== '__exam__') ? 'Exercise' : 'Exam-wide',
          points: null
        }
      }).catch(function () {});
      tcUpdateTestLinksBadge();
    }
  }

  tcOnDirty();
};

window.tcAttachCompetenceByIndex = function (idx) {
  var comp = (_currentRenderedCompetences && _currentRenderedCompetences[idx]) || _cachedCompetences[idx];
  if (comp) {
    tcAttachCompetenceByObject(comp);
  }
};

window.tcAttachCompetenceById = function (cId) {
  var comp = (_currentRenderedCompetences || []).find(function (c) {
    return c.id === cId || c.code === cId || (c.code || c.id) === cId;
  }) || (_cachedCompetences || []).find(function (c) {
    return c.id === cId || c.code === cId || (c.code || c.id) === cId;
  });
  if (comp) {
    tcAttachCompetenceByObject(comp);
  }
};

window.tcAttachCompetenceToTest = function (cId) {
  var comp = (_currentRenderedCompetences || []).find(function (c) {
    return c.id === cId || c.code === cId || (c.code || c.id) === cId;
  }) || (_cachedCompetences || []).find(function (c) {
    return c.id === cId || c.code === cId || (c.code || c.id) === cId;
  });
  if (comp) {
    tcAttachCompetenceByObject(comp);
  } else {
    var label = cId;
    var targetSel = document.getElementById('competenceTargetExSelect');
    var targetVal = targetSel ? targetSel.value : (_targetAttachExId || '__exam__');
    var targetEx = (targetVal && targetVal !== '__exam__') ? currentTest.exercises.find(function (e) { return e.id === targetVal; }) : null;
    if (targetEx) {
      if (!Array.isArray(targetEx.linkedCompetenceIds)) targetEx.linkedCompetenceIds = [];
      if (targetEx.linkedCompetenceIds.indexOf(label) === -1) targetEx.linkedCompetenceIds.push(label);
      if (!Array.isArray(targetEx.linkedCompetences)) targetEx.linkedCompetences = [];
      if (!targetEx.linkedCompetences.some(function (c) { return (c.code || c.id || c.title) === label; })) {
        targetEx.linkedCompetences.push({ id: label, code: label, title: label, description: '', level: '', domain: '' });
      }
      renderExerciseCards();
    } else {
      if (!Array.isArray(currentTest.linkedCompetenceIds)) currentTest.linkedCompetenceIds = [];
      if (currentTest.linkedCompetenceIds.indexOf(label) === -1) currentTest.linkedCompetenceIds.push(label);
      var hc = TestCreatorService.ensureHeaderConfig(currentTest);
      hc.showCompetences = true;
      renderTestCompetenceBadges();
    }
    tcOnDirty();
  }
};

window.tcDetailTriggerAttr = function (c, scopeId, idx) {
  if (!c || typeof c !== 'object' || !Array.isArray(c.detailedDescription) || !c.detailedDescription.length) return '';
  return ' class="comp-detail-trigger" title="' + escapeAttr(i18n.t('lcDetailPopoverTitle')) + '" onclick="tcOpenDetailPopover(event, \'' + scopeId + '\', ' + idx + ')"';
};

window.tcOpenDetailPopover = function (ev, scopeId, cIdx) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  if (!currentTest || !window.CompetenceAggregatorService) return;
  var list;
  if (scopeId === '__exam__') {
    list = currentTest.linkedCompetences;
  } else {
    var ex = (currentTest.exercises || []).find(function (e) { return e.id === scopeId; });
    list = ex && ex.linkedCompetences;
  }
  var c = Array.isArray(list) ? list[cIdx] : null;
  if (!c || typeof c !== 'object') return;
  var lines = window.CompetenceAggregatorService.getDetailedLines(c);
  if (!lines.length) return;
  var hidden = (c.hiddenDetailLines || []).slice();
  window.CompetenceAggregatorService.openDetailPopover(
    ev.currentTarget,
    (c.code || c.title || '') + ' - ' + i18n.t('lcDetailPopoverTitle'),
    lines,
    hidden,
    function (line, on) {
      var i = hidden.indexOf(line);
      if (on) { if (i > -1) hidden.splice(i, 1); }
      else if (i === -1) hidden.push(line);
      c.hiddenDetailLines = hidden.slice();
      var map = {};
      map[c.id || c.code] = c.hiddenDetailLines;
      var baseText = (c.baseDescription !== undefined) ? c.baseDescription : (c.description || '');
      c.description = window.CompetenceAggregatorService.composeDescription({ id: c.id || c.code, detailedDescription: c.detailedDescription }, baseText, map);
      tcOnDirty();
      if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
        tcUpdatePrintPreview();
      }
    }
  );
};
window.tcRemoveCompFromSection = function (exId, cIdx) {
  var ex = (currentTest && currentTest.exercises) ? currentTest.exercises.find(function (e) { return e.id === exId; }) : null;
  if (!ex) return;
  var removed = null;
  if (Array.isArray(ex.linkedCompetences) && ex.linkedCompetences[cIdx]) {
    removed = ex.linkedCompetences.splice(cIdx, 1)[0];
  }
  if (Array.isArray(ex.linkedCompetenceIds) && ex.linkedCompetenceIds[cIdx]) {
    ex.linkedCompetenceIds.splice(cIdx, 1);
  }
  if (removed && typeof LinksService !== 'undefined') {
    var compCode = (removed.code || removed.id || '').trim();
    var testUrn = tcGetActiveTestUrn();
    if (testUrn && compCode) {
      LinksService.removeLink(testUrn + '#' + ex.id, 'cmt:competence:' + compCode).catch(function () {});
      tcUpdateTestLinksBadge();
    }
  }
  renderExerciseCards();
  tcOnDirty();
  if (window.showToast) showToast(i18n.t('tcRemovedTestCompetence') || 'Objective removed from block');
};

window.tcRemoveCompFromEx = function (exId, cIdx) {
  var ex = currentTest.exercises.find(function (e) { return e.id === exId; });
  if (!ex) return;
  var removedCode = null;
  if (Array.isArray(ex.linkedCompetenceIds) && ex.linkedCompetenceIds[cIdx]) {
    var removed = ex.linkedCompetenceIds.splice(cIdx, 1);
    if (removed && removed[0]) {
      removedCode = removed[0].replace(/^\[[^\]]+\]\s*/, '').split(' - ')[0].trim();
    }
  }
  if (Array.isArray(ex.linkedCompetences) && ex.linkedCompetences[cIdx]) {
    ex.linkedCompetences.splice(cIdx, 1);
  }
  if (removedCode && typeof LinksService !== 'undefined') {
    var testUrn = tcGetActiveTestUrn();
    if (testUrn) {
      LinksService.removeLink(testUrn + '#' + ex.id, 'cmt:competence:' + removedCode).catch(function () {});
      tcUpdateTestLinksBadge();
    }
  }
  renderExerciseCards();
  tcOnDirty();
};

window.tcToggleDetailLine = function (inp) {
  var id = inp.getAttribute('data-comp-id');
  var line = inp.getAttribute('data-line');
  var map = Object.assign({}, competenceDisplayConfig.hiddenDetailLines || {});
  var arr = (map[id] || []).slice();
  var i = arr.indexOf(line);
  if (inp.checked) { if (i > -1) arr.splice(i, 1); }
  else if (i === -1) arr.push(line);
  if (arr.length) map[id] = arr; else delete map[id];
  competenceDisplayConfig.hiddenDetailLines = map;
  var row = inp.closest('.drawer-detail-row');
  if (row) row.classList.toggle('is-off', !inp.checked);
  saveCompetenceDisplayConfigToDisk();
};

window.tcDescText = function (d) {
  if (!d) return '';
  var base = d.description || d.statement || '';
  if (!window.CompetenceAggregatorService || !window.CompetenceAggregatorService.composeDescription) return base;
  return window.CompetenceAggregatorService.composeDescription(d, base, competenceDisplayConfig && competenceDisplayConfig.hiddenDetailLines);
};
window.tcOpenCompetenceCustomizeModal = function () {
  var cfg = competenceDisplayConfig || DEFAULT_COMPETENCE_CONFIG;
  var radios = document.getElementsByName('compPresetMode');
  radios.forEach(function (r) {
    r.checked = (r.value === (cfg.preset || 'detailed'));
  });

  document.getElementById('cfgShowCode').checked = !!cfg.showCode;
  document.getElementById('cfgShowTitle').checked = !!cfg.showTitle;
  document.getElementById('cfgShowDescription').checked = !!cfg.showDescription;
  document.getElementById('cfgShowLevel').checked = !!cfg.showLevel;
  document.getElementById('cfgShowCategory').checked = !!cfg.showCategory;
  document.getElementById('cfgShowTags').checked = !!cfg.showTags;
  document.getElementById('cfgShowComments').checked = !!cfg.showComments;
  document.getElementById('cfgShowDetailed').checked = cfg.showDetailedDescription !== false;
  document.getElementById('cfgShowActions').checked = !!cfg.showActions;

  var m = document.getElementById('competenceCustomizeModal');
  if (m) m.style.display = 'flex';
};

window.tcCloseCompetenceCustomizeModal = function () {
  var m = document.getElementById('competenceCustomizeModal');
  if (m) m.style.display = 'none';
};

window.tcOnCompPresetChange = function (presetMode) {
  if (presetMode === 'detailed' || presetMode === 'compact') {
    document.getElementById('cfgShowCode').checked = true;
    document.getElementById('cfgShowTitle').checked = true;
    document.getElementById('cfgShowDescription').checked = true;
    document.getElementById('cfgShowLevel').checked = true;
    document.getElementById('cfgShowCategory').checked = true;
    document.getElementById('cfgShowTags').checked = true;
    document.getElementById('cfgShowComments').checked = true;
    document.getElementById('cfgShowDetailed').checked = true;
    document.getElementById('cfgShowActions').checked = true;
  } else if (presetMode === 'minimal') {
    document.getElementById('cfgShowCode').checked = true;
    document.getElementById('cfgShowTitle').checked = true;
    document.getElementById('cfgShowDescription').checked = false;
    document.getElementById('cfgShowLevel').checked = true;
    document.getElementById('cfgShowCategory').checked = true;
    document.getElementById('cfgShowTags').checked = false;
    document.getElementById('cfgShowComments').checked = false;
    document.getElementById('cfgShowDetailed').checked = false;
    document.getElementById('cfgShowActions').checked = true;
  }
};

window.tcSaveCompetenceConfig = async function () {
  var selectedPreset = 'detailed';
  var radios = document.getElementsByName('compPresetMode');
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      selectedPreset = radios[i].value;
      break;
    }
  }

  competenceDisplayConfig = {
    preset: selectedPreset,
    showCode: document.getElementById('cfgShowCode').checked,
    showTitle: document.getElementById('cfgShowTitle').checked,
    showDescription: document.getElementById('cfgShowDescription').checked,
    showLevel: document.getElementById('cfgShowLevel').checked,
    showCategory: document.getElementById('cfgShowCategory').checked,
    showTags: document.getElementById('cfgShowTags').checked,
    showComments: document.getElementById('cfgShowComments').checked,
    showDetailedDescription: document.getElementById('cfgShowDetailed').checked,
    hiddenDetailLines: (competenceDisplayConfig && competenceDisplayConfig.hiddenDetailLines) || {},
    showActions: document.getElementById('cfgShowActions').checked
  };

  await saveCompetenceDisplayConfigToDisk();
  tcCloseCompetenceCustomizeModal();
  tcFilterCompetences();
  if (typeof showToast === 'function') showToast(i18n.t("tcCompetenceCustomSaved"));
};

window.tcResetCompetenceConfig = async function () {
  competenceDisplayConfig = Object.assign({}, DEFAULT_COMPETENCE_CONFIG);
  await saveCompetenceDisplayConfigToDisk();
  tcOpenCompetenceCustomizeModal();
  tcFilterCompetences();
  if (typeof showToast === 'function') showToast(i18n.t("tcCompetenceCustomReset"));
};

window.tcOpenCompetenceDb = function () {
  if (window.Desktop && typeof Desktop.openTool === 'function') {
    Desktop.openTool('manage-database.html', { query: { tab: 'descriptors' } });
  } else {
    window.open('manage-database.html?tab=descriptors', '_blank');
  }
};

window.tcOpenCompetenceImporter = function () {
  if (window.Desktop && typeof Desktop.openTool === 'function') {
    Desktop.openTool('import-tool.html', { query: { type: 'descriptors' } });
  } else {
    window.open('import-tool.html?type=descriptors', '_blank');
  }
};

// ── Drawer Tab 5: Grading Scales ─────────────────────────────────────
var _allScaleBanks = [];
var _cachedScales = [];
var _targetAttachScaleExId = null;

async function tcLoadAvailableScaleBanks() {
  _allScaleBanks = [];
  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (isElec && typeof Desktop.listFiles === 'function') {
    // 1. Scan customScales (user/custom-data/scales)
    try {
      var res = await window.Desktop.listFiles('customScales', { extensions: ['.js', '.json'] });
      var list = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
      for (var i = 0; i < list.length; i++) {
        var fn = typeof list[i] === 'string' ? list[i] : (list[i].filename || list[i].name);
        if (!fn) continue;
        try {
          var fRes = await window.Desktop.readText('customScales', fn);
          if (fRes && fRes.ok && fRes.content) {
            var scales = TestCreatorService.parseScaleModelsFileContent(fRes.content);
            if (Array.isArray(scales) && scales.length > 0) {
              _allScaleBanks.push({
                id: 'custom_' + fn,
                filename: fn,
                name: fn.replace(/\.(js|json)$/i, ''),
                target: 'customScales',
                scales: scales
              });
            }
          }
        } catch (err) {
          console.warn('Error reading custom scales file:', fn, err);
        }
      }
    } catch (e) {
      console.warn('Error listing customScales:', e);
    }

    // 2. Default user/grade-scale-models.js
    try {
      var defRes = await window.Desktop.readText('user', 'grade-scale-models.js');
      if (defRes && defRes.ok && defRes.content) {
        var defScales = TestCreatorService.parseScaleModelsFileContent(defRes.content);
        if (Array.isArray(defScales) && defScales.length > 0) {
          _allScaleBanks.push({
            id: 'default_grade_scales',
            filename: 'grade-scale-models.js',
            name: 'User Grade Models (grade-scale-models.js)',
            target: 'user',
            scales: defScales
          });
        }
      }
    } catch (_) {}
  }

  // 3. Fallback / Global window models
  if (!_allScaleBanks.length && typeof XLSM_SCALE_MODELS !== 'undefined' && Array.isArray(XLSM_SCALE_MODELS) && XLSM_SCALE_MODELS.length > 0) {
    _allScaleBanks.push({
      id: 'global_xlsm_scales',
      filename: 'grade-scale-models.js',
      name: 'Default Models (XLSM_SCALE_MODELS)',
      scales: XLSM_SCALE_MODELS
    });
  }

  // Always ensure built-in models from TestCreatorService.DEFAULT_SCALES are available
  var builtinScales = TestCreatorService.DEFAULT_SCALES || [];
  _allScaleBanks.push({
    id: 'builtin_scales',
    filename: 'builtin',
    name: 'Built-in Grading Scales',
    scales: builtinScales
  });

  // Populate scaleBankSource dropdown in Drawer
  var sel = document.getElementById('scaleBankSource');
  if (sel) {
    if (_allScaleBanks.length === 0) {
      sel.innerHTML = '<option value="">No scale banks available</option>';
    } else {
      sel.innerHTML = _allScaleBanks.map(function (b) {
        return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + (b.scales ? b.scales.length : 0) + ' scales)</option>';
      }).join('');
    }
  }

  // Preselect active bank
  var activeBank = _allScaleBanks.find(function (b) { return b.scales && b.scales.length > 0; }) || _allScaleBanks[0];
  if (activeBank) {
    if (sel) sel.value = activeBank.id;
    _cachedScales = activeBank.scales || [];
  } else {
    _cachedScales = [];
  }

  tcRenderScalesList(_cachedScales);
  tcPopulateScaleSelect();
}

window.tcLoadScaleBankSource = function () {
  var sel = document.getElementById('scaleBankSource');
  var val = sel ? sel.value : '';
  var bank = _allScaleBanks.find(function (b) { return b.id === val; });
  _cachedScales = (bank && bank.scales) ? bank.scales : [];
  tcRenderScalesList(_cachedScales);
};

function updateScaleTargetDropdown() {
  var sel = document.getElementById('scaleTargetExSelect');
  if (!sel) return;
  var exs = (currentTest && currentTest.exercises) || [];
  var exCounter = 0;
  var opts = '<option value="__exam__">' + (typeof i18n !== 'undefined' && i18n.t ? (i18n.t('tcTargetEntireExam') || 'Entire Exam (Test-wide)') : 'Entire Exam (Test-wide)') + '</option>' +
    exs.map(function (e) {
      var label = '';
      if (e.type === 'section_criteria') {
        label = '📋 ' + (i18n.t('tcBlockCriteriaSection') || 'Section Block: ') + (e.title || 'Criteria & Rubrics');
      } else if (e.type === 'section_competences') {
        label = '📋 ' + (i18n.t('tcBlockCompetencesSection') || 'Section Block: ') + (e.title || 'Competences & Objectives');
      } else if (e.type === 'section_grading_scale') {
        label = '📋 ' + (i18n.t('tcBlockScaleSection') || 'Section Block: ') + (e.title || 'Grading Scale');
      } else if (e.type === 'section_custom' || e.type === 'custom_block') {
        label = '📋 ' + (i18n.t('tcBlockCustomSection') || 'Section Block: ') + (e.title || 'Custom Block');
      } else {
        exCounter++;
        label = 'Ex ' + exCounter + ': ' + (e.title || 'Exercise');
      }
      return '<option value="' + e.id + '">' + escapeHtml(label) + '</option>';
    }).join('');
  sel.innerHTML = opts;
  if (_targetAttachScaleExId && exs.some(function (e) { return e.id === _targetAttachScaleExId; })) {
    sel.value = _targetAttachScaleExId;
  } else if (_targetAttachScaleExId === '__exam__') {
    sel.value = '__exam__';
  } else if (exs.length > 0) {
    sel.value = exs[0].id;
    _targetAttachScaleExId = exs[0].id;
  } else {
    sel.value = '__exam__';
    _targetAttachScaleExId = null;
  }
}

window.updateScaleTargetDropdown = updateScaleTargetDropdown;
window.tcRenderScalesList = tcRenderScalesList;

window.tcOnScaleTargetChange = function () {
  var sel = document.getElementById('scaleTargetExSelect');
  var val = sel ? sel.value : '__exam__';
  _targetAttachScaleExId = val === '__exam__' ? null : val;
  tcRenderScalesList(_cachedScales);
};

function tcRenderScalesList(list) {
  var el = document.getElementById('scalesDbList');
  if (!el) return;
  if (!list || !list.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#888;font-size:0.8rem;" data-i18n="tcNoScalesFound">No grading scales found in this bank.</div>';
    return;
  }

  updateScaleTargetDropdown();

  var targetEx = _targetAttachScaleExId ? (currentTest && currentTest.exercises && currentTest.exercises.find(function (e) { return e.id === _targetAttachScaleExId; })) : null;
  var targetLabel = targetEx ? ('Exercise "' + (targetEx.title || 'Exercise') + '"') : 'Entire Exam (Test-wide)';

  var headerNote = '<div style="background:#fef3c7;border:1.5px solid #d97706;color:#92400e;padding:6px 10px;border-radius:4px;font-size:0.78rem;font-weight:800;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
    '<span>Target: ' + escapeHtml(targetLabel) + '</span>' +
    '<span style="font-size:0.7rem;color:#b45309;font-weight:600;">Choose scale</span>' +
    '</div>';

  var bankSel = document.getElementById('scaleBankSource');
  var activeBankId = bankSel ? bankSel.value : '';

  el.innerHTML = headerNote + list.map(function (sc, idx) {
    var scId = sc.key || sc.id || sc.name || ('scale_' + idx);
    var scName = sc.label || sc.name || sc.title || sc.key || sc.id || ('Grading Scale ' + (idx + 1));
    var scSys = sc.system || sc.type || (sc.maxScore ? ('Max ' + sc.maxScore) : (sc.maxGrade ? ('Max ' + sc.maxGrade) : ''));
    var thresholds = sc.thresholds;

    var thSummary = '';
    if (Array.isArray(thresholds) && thresholds.length > 0) {
      thSummary = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">' +
        thresholds.slice(0, 6).map(function (th) {
          var g = th.grade || th.key || th.label || '';
          var p = th.pct != null ? (th.pct + '%') : (th.minPoints != null ? (th.minPoints + 'p') : '');
          return '<span style="background:#fff;border:1px solid #d97706;color:#92400e;font-size:0.68rem;padding:1px 5px;border-radius:3px;font-weight:700;">' +
            escapeHtml(g) + (p ? (' (' + p + ')') : '') + '</span>';
        }).join('') + (thresholds.length > 6 ? '<span style="font-size:0.68rem;color:#92400e;font-weight:700;">' + escapeHtml(i18n.tFmt ? i18n.tFmt('tcMoreItems', { count: thresholds.length - 6 }) : ('+ ' + (thresholds.length - 6) + ' more')) + '</span>' : '') +
        '</div>';
    } else if (thresholds && typeof thresholds === 'object') {
      var tKeys = Object.keys(thresholds);
      if (tKeys.length > 0) {
        thSummary = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">' +
          tKeys.slice(0, 6).map(function (k) {
            var p = thresholds[k] != null ? (thresholds[k] + '%') : '';
            return '<span style="background:#fff;border:1px solid #d97706;color:#92400e;font-size:0.68rem;padding:1px 5px;border-radius:3px;font-weight:700;">' +
              escapeHtml(k) + (p ? (' (' + p + ')') : '') + '</span>';
          }).join('') + (tKeys.length > 6 ? '<span style="font-size:0.68rem;color:#92400e;font-weight:700;">' + escapeHtml(i18n.tFmt ? i18n.tFmt('tcMoreItems', { count: tKeys.length - 6 }) : ('+ ' + (tKeys.length - 6) + ' more')) + '</span>' : '') +
          '</div>';
      }
    }

    var isCurrentTestScale = currentTest && (
      currentTest.scaleModelId === scId ||
      (currentTest.scaleModel && (currentTest.scaleModel.key === scId || currentTest.scaleModel.id === scId || currentTest.scaleModel.label === scName))
    );

    return '<div class="drawer-item-card" style="border-left:4px solid ' + (isCurrentTestScale ? '#16a34a' : '#d97706') + ';">' +
      '  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">' +
      '    <div>' +
      '      <span style="font-weight:900;font-size:0.85rem;color:#92400e;">' + escapeHtml(scName) + '</span>' +
      (scSys ? (' <span style="background:#fef3c7;border:1px solid #d97706;color:#92400e;font-size:0.7rem;padding:1px 5px;border-radius:3px;font-weight:800;">' + escapeHtml(scSys) + '</span>') : '') +
      '    </div>' +
      (isCurrentTestScale ? '<span style="background:#dcfce7;color:#15803d;border:1px solid #16a34a;font-size:0.68rem;padding:1px 5px;border-radius:3px;font-weight:800;">' + escapeHtml(i18n.t('tcActiveTestScale')) + '</span>' : '') +
      '  </div>' +
      thSummary +
      '  <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;">' +
      (targetEx ? ('<button type="button" class="neo-btn sm" onclick="tcAttachScaleToTarget(\'' + escapeAttr(scId) + '\', \'' + escapeAttr(activeBankId) + '\')">+ Attach to Ex</button>') : '') +
      '    <button type="button" class="neo-btn sm yellow" onclick="tcSetTestScale(\'' + escapeAttr(scId) + '\', \'' + escapeAttr(activeBankId) + '\')">' + (i18n.t('tcSetAsTestScale') || 'Set as Test Scale') + '</button>' +
      '  </div>' +
      '</div>';
  }).join('');
}

window.tcFilterScalesDb = function () {
  var q = (document.getElementById('drawerScaleSearch').value || '').trim().toLowerCase();
  if (!q) {
    tcRenderScalesList(_cachedScales);
    return;
  }
  var filtered = _cachedScales.filter(function (s) {
    var n = (s.label || s.name || s.title || s.key || s.id || '').toLowerCase();
    var sys = (s.system || s.type || '').toLowerCase();
    var k = (s.key || s.id || '').toLowerCase();
    return n.indexOf(q) !== -1 || sys.indexOf(q) !== -1 || k.indexOf(q) !== -1;
  });
  tcRenderScalesList(filtered);
};

function tcFindScaleModel(scaleId, bankId) {
  if (!scaleId || scaleId === 'none') return null;
  function matches(s) {
    return s && (s.key === scaleId || s.id === scaleId || s.label === scaleId || s.name === scaleId);
  }
  // Check current bank if provided
  if (bankId) {
    var b = _allScaleBanks.find(function (bk) { return bk.id === bankId; });
    if (b && Array.isArray(b.scales)) {
      var found = b.scales.find(matches);
      if (found) return { model: found, bankName: b.name };
    }
  }
  // Check all loaded banks
  for (var i = 0; i < _allScaleBanks.length; i++) {
    var bank = _allScaleBanks[i];
    if (Array.isArray(bank.scales)) {
      var m = bank.scales.find(matches);
      if (m) return { model: m, bankName: bank.name };
    }
  }
  // Check TestCreatorService.DEFAULT_SCALES
  var ds = (TestCreatorService.DEFAULT_SCALES || []).find(matches);
  if (ds) return { model: ds, bankName: 'Default Scales' };
  return null;
}

window.tcPopulateScaleSelect = function () {
  var scaleSel = document.getElementById('testScale');
  if (!scaleSel) return;
  var currentVal = currentTest ? (currentTest.scaleModelId || 'none') : 'none';

  var html = '<option value="none">No grading scale (points only)</option>';

  if (_allScaleBanks.length > 0) {
    _allScaleBanks.forEach(function (b) {
      if (Array.isArray(b.scales) && b.scales.length > 0) {
        html += '<optgroup label="' + escapeAttr(b.name) + '">';
        b.scales.forEach(function (sc) {
          var scId = sc.key || sc.id || sc.name;
          var scName = sc.label || sc.name || sc.title || sc.key || sc.id;
          html += '<option value="' + escapeAttr(scId) + '">' + escapeHtml(scName) + '</option>';
        });
        html += '</optgroup>';
      }
    });
  } else {
    html += '<optgroup label="Default Grade Scales">';
    (TestCreatorService.DEFAULT_SCALES || []).forEach(function (sc) {
      var scId = sc.key || sc.id;
      var scName = sc.label || sc.name || sc.id;
      html += '<option value="' + escapeAttr(scId) + '">' + escapeHtml(scName) + '</option>';
    });
    html += '</optgroup>';
  }

  scaleSel.innerHTML = html;
  scaleSel.value = currentVal;
};

function tcResolveAndSetScaleModel(scaleId) {
  if (!currentTest) return;
  if (!scaleId || scaleId === 'none') {
    currentTest.scaleModelId = 'none';
    currentTest.scaleModel = null;
    currentTest.scaleBank = null;
  } else {
    var resolved = tcFindScaleModel(scaleId);
    currentTest.scaleModelId = scaleId;
    if (resolved) {
      currentTest.scaleModel = resolved.model;
      currentTest.scaleBank = resolved.bankName;
    }
  }
  tcRenderTestGradingScaleBar();
}

window.tcSetTestScale = function (scaleId, bankId) {
  if (!currentTest) return;
  var resolved = tcFindScaleModel(scaleId, bankId);
  currentTest.scaleModelId = scaleId;
  if (resolved) {
    currentTest.scaleModel = resolved.model;
    currentTest.scaleBank = resolved.bankName;
  }

  var scaleSel = document.getElementById('testScale');
  if (scaleSel) scaleSel.value = scaleId;

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  if (hc.showGradingScale === undefined) {
    hc.showGradingScale = true;
  }

  tcRenderTestGradingScaleBar();
  tcRenderScalesList(_cachedScales);
  tcOnDirty();
  if (window.showToast) {
    var mTitle = (resolved && resolved.model && (resolved.model.label || resolved.model.name || resolved.model.title || resolved.model.key)) || scaleId;
    showToast((i18n.t('tcScaleAttachedToast') || 'Grading scale attached to test: ') + mTitle);
  }
};

window.tcRemoveTestScale = function () {
  if (!currentTest) return;
  currentTest.scaleModelId = 'none';
  currentTest.scaleModel = null;
  currentTest.scaleBank = null;

  var scaleSel = document.getElementById('testScale');
  if (scaleSel) scaleSel.value = 'none';

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showGradingScale = false;

  tcRenderTestGradingScaleBar();
  tcRenderScalesList(_cachedScales);
  tcOnDirty();
  if (window.showToast) {
    showToast(i18n.t('tcScaleRemovedToast') || 'Grading scale removed from test');
  }
};

window.tcRenderTestGradingScaleBar = function () {
  var bar = document.getElementById('testGradingScaleBar');
  if (!bar || !currentTest) return;

  var scaleId = currentTest.scaleModelId;
  if (!scaleId || scaleId === 'none') {
    bar.style.display = 'none';
    return;
  }

  var model = currentTest.scaleModel;
  if (!model) {
    var resolved = tcFindScaleModel(scaleId);
    if (resolved) {
      currentTest.scaleModel = resolved.model;
      currentTest.scaleBank = resolved.bankName;
      model = resolved.model;
    }
  }

  if (!model) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'block';

  var badge = document.getElementById('testGradingScaleNameBadge');
  if (badge) {
    var bText = model.label || model.name || model.title || model.key || model.id || 'Scale';
    if (model.system) bText += ' (' + model.system + ')';
    badge.textContent = bText;
  }

  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var printChk = document.getElementById('testGradingScalePrintChk');
  if (printChk) {
    printChk.checked = hc.showGradingScale !== false;
  }

  var totalPoints = TestCreatorService.calculateTotalTestPoints(currentTest);
  var convTable = TestCreatorService.calculateGradeConversionTable(model, totalPoints);
  var stepsList = document.getElementById('testGradingScaleStepsList');
  if (stepsList) {
    if (convTable && convTable.intervals && convTable.intervals.length > 0) {
      stepsList.innerHTML = convTable.intervals.map(function (it) {
        return '<span style="background:#fff;border:1.5px solid #d97706;color:#92400e;font-size:0.75rem;padding:2px 7px;border-radius:4px;font-weight:800;display:inline-flex;align-items:center;gap:4px;">' +
          '<strong>' + escapeHtml(it.grade) + '</strong>: ' + it.minPoints + '–' + it.maxPoints + ' pts ' +
          '<span style="font-size:0.68rem;color:#b45309;font-weight:700;">(≥' + it.pct + '%)</span>' +
          '</span>';
      }).join('');
    } else {
      stepsList.innerHTML = '<span style="font-size:0.75rem;color:#92400e;font-weight:700;">Scale active (no conversion steps defined)</span>';
    }
  }
};

window.tcToggleScalePrintOnTest = function (checked) {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  hc.showGradingScale = !!checked;
  tcUpdateScaleBarPrintChk();
  tcOnDirty();
  if (document.getElementById('printPreviewModal') && document.getElementById('printPreviewModal').classList.contains('open')) {
    tcUpdatePrintPreview();
  }
};

window.tcUpdateScaleBarPrintChk = function () {
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);
  var printChk = document.getElementById('testGradingScalePrintChk');
  if (printChk) printChk.checked = hc.showGradingScale !== false;
  var hdrChk = document.getElementById('hdrChk_showGradingScale');
  if (hdrChk) hdrChk.checked = hc.showGradingScale !== false;
};

window.tcAttachScaleToEx = function (exId) {
  _targetAttachScaleExId = exId;
  var ex = currentTest.exercises.find(function (e) { return e.id === exId; });
  if (!ex) return;

  var drawer = document.getElementById('testDrawer');
  if (drawer) drawer.style.display = 'flex';
  tcSwitchDrawerTab('scales');
  updateScaleTargetDropdown();
  tcRenderScalesList(_cachedScales);
  if (window.showToast) {
    showToast(i18n.tFmt('tcSelectScaleDrawerPrompt', { title: ex.title || i18n.t('tcExercise') }));
  }
};

window.tcRemoveScaleFromEx = function (exId) {
  var ex = currentTest.exercises.find(function (e) { return e.id === exId; });
  if (ex) {
    delete ex.scaleModelId;
    delete ex.scaleModel;
    delete ex.scaleBank;
    renderExerciseCards();
    if (window.showToast) {
      showToast(i18n.t('tcScaleRemovedToast') || 'Grading scale removed from exercise');
    }
  }
};

window.tcAttachScaleToTarget = function (scaleId, bankId) {
  var resolved = tcFindScaleModel(scaleId, bankId);
  var model = resolved ? resolved.model : null;
  var bankName = resolved ? resolved.bankName : '';

  var targetSel = document.getElementById('scaleTargetExSelect');
  var targetVal = targetSel ? targetSel.value : (_targetAttachScaleExId || '__exam__');

  if (targetVal === '__exam__') {
    tcSetTestScale(scaleId, bankId);
    return;
  }

  var targetEx = currentTest.exercises.find(function (e) { return e.id === targetVal; });
  if (targetEx) {
    targetEx.scaleModelId = scaleId;
    targetEx.scaleModel = model;
    targetEx.scaleBank = bankName;
    renderExerciseCards();
    if (window.showToast) {
      showToast((i18n.t('tcScaleAttachedExToast') || 'Attached scale to exercise: ') + (targetEx.title || 'Exercise'));
    }
  }
};

