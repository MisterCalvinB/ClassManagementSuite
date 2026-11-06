/**
 * js/mdb-ai-service.js
 * Universal Schema-Driven AI Autofill Service for Manage Database
 * Powered by local offline Small Language Models via window.SlmService (transformers.js).
 * Strictly follows Light Neobrutalist styling, electron-best-practices, and i18n-key-manager.
 */

(function (global) {
  'use strict';

  var _batchCancelRequested = false;
  var _isBatchRunning = false;

  function _t(key, fallback) {
    if (global.i18n && typeof global.i18n.t === 'function') {
      var val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Identify primary identifier field for any database type
   */
  function mdbGetPrimaryFieldKey(typeKey) {
    if (typeKey === 'wordbanks') return 'word';
    if (typeKey === 'quotebanks') return 'quote';
    if (typeKey === 'dictations') return 'title';
    if (typeKey === 'grammarbanks') return 'rule';
    if (typeKey === 'gapfillbanks') return 'sentence';
    if (typeKey === 'errorbanks') return 'sentence';
    if (typeKey === 'sentencebanks') return 'sentence';
    if (typeKey === 'storybanks') return 'title';
    if (typeKey === 'quizzes') return 'title';
    if (typeKey === 'testbanks') return 'title';
    if (typeKey === 'competences' || typeKey === 'descriptors') return 'title';
    if (typeKey === 'criteria') return 'name';
    if (typeKey === 'phases') return 'name';
    if (typeKey === 'chips') return 'label';
    if (typeKey === 'badgebanks') return 'name';
    return 'title';
  }

  /**
   * Universal Schema-Driven Prompt Builder
   * Combines populated fields + target empty fields + schema rules into a strict few-shot JSON prompt
   */
  function mdbBuildPrompt(rec, typeKey, requestedFieldKeys, schema) {
    schema = schema || [];
    var primaryKey = mdbGetPrimaryFieldKey(typeKey);
    var primaryVal = rec[primaryKey] || rec.word || rec.title || rec.english || rec.name || rec.sentence || '';

    // Collect already filled non-empty fields
    var filledEntries = [];
    Object.keys(rec || {}).forEach(function (k) {
      if (k.startsWith('_')) return;
      var v = rec[k];
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v) && v.length === 0) return;
      filledEntries.push(k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : String(v)));
    });

    // Describe requested empty target fields
    var fieldInstructions = [];
    var exampleObj = {};

    requestedFieldKeys.forEach(function (key) {
      var fieldDef = schema.find(function (f) { return f && f.key === key; }) || { key: key, type: 'string' };
      var typeDesc = fieldDef.type || 'string';
      var extra = '';
      if (Array.isArray(fieldDef.uniqueVals) && fieldDef.uniqueVals.length > 0) {
        extra = ' (Allowed choices: ' + fieldDef.uniqueVals.slice(0, 8).join(', ') + ')';
      }

      if (key === 'level' || key === 'cefr') {
        fieldInstructions.push('"' + key + '": CEFR level (one of A1, A2, B1, B2, C1, C2)');
        exampleObj[key] = 'B1';
      } else if (key === 'partOfSpeech' || key === 'pos') {
        fieldInstructions.push('"' + key + '": lowercase part of speech (noun, verb, adjective, adverb, preposition, conjunction, phrase)');
        exampleObj[key] = 'noun';
      } else if (key === 'ipa') {
        fieldInstructions.push('"' + key + '": standard IPA phonetic transcription');
        exampleObj[key] = '/.../';
      } else if (key === 'definition') {
        fieldInstructions.push('"' + key + '": concise 1-sentence pedagogical definition (array of strings if array, or string)');
        exampleObj[key] = fieldDef.type === 'array' ? ['Clear definition.'] : 'Clear definition.';
      } else if (key === 'exampleSentence') {
        fieldInstructions.push('"' + key + '": natural illustrative sentence using the word in context');
        exampleObj[key] = fieldDef.type === 'array' ? ['An example sentence.'] : 'An example sentence.';
      } else if (typeDesc === 'array') {
        fieldInstructions.push('"' + key + '": JSON array of strings' + extra);
        exampleObj[key] = ['item1', 'item2'];
      } else if (typeDesc === 'boolean') {
        fieldInstructions.push('"' + key + '": boolean (true/false)');
        exampleObj[key] = true;
      } else if (typeDesc === 'number') {
        fieldInstructions.push('"' + key + '": number');
        exampleObj[key] = 1;
      } else {
        fieldInstructions.push('"' + key + '": string' + extra);
        exampleObj[key] = 'value';
      }
    });

    var systemPrompt = [
      'You are an expert curriculum and language education AI assistant autofilling educational database records.',
      'Respond ONLY with a valid JSON object containing the requested target fields.',
      'Do not include markdown prose, conversational preamble, or explanations.',
      'Example response structure:',
      JSON.stringify(exampleObj, null, 2)
    ].join('\n');

    var userPrompt = [
      'Database Type: ' + typeKey,
      'Primary Item: ' + primaryVal,
      filledEntries.length > 0 ? ('Known Record Data:\n- ' + filledEntries.join('\n- ')) : '',
      'Target Fields to Generate (Output ONLY a JSON object with these keys):\n- ' + fieldInstructions.join('\n- '),
      '\nReturn ONLY the JSON object:'
    ].filter(Boolean).join('\n\n');

    return {
      systemPrompt: systemPrompt,
      userPrompt: userPrompt
    };
  }

  /**
   * Generate AI predictions for missing fields in a single record
   */
  async function mdbGenerateAiFields(rec, typeKey, requestedFieldKeys, schema) {
    if (!window.SlmService) {
      throw new Error('AI Service is unavailable.');
    }

    var promptData = mdbBuildPrompt(rec, typeKey, requestedFieldKeys, schema);

    var res = await window.SlmService.generateJson({
      systemPrompt: promptData.systemPrompt,
      userPrompt: promptData.userPrompt,
      temperature: 0.25,
      maxNewTokens: 480,
      promptDownloadIfMissing: true
    });

    if (res && res.aborted) {
      return { ok: false, aborted: true };
    }
    if (!res || !res.ok || !res.data) {
      throw new Error((res && res.error) || 'Could not parse AI response');
    }

    var data = res.data;
    // Normalize if array was returned instead of object
    if (Array.isArray(data)) {
      data = data[0] || {};
    }

    // Clean keys and align types
    var cleanedResult = {};
    requestedFieldKeys.forEach(function (k) {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
        var fieldDef = (schema || []).find(function (f) { return f && f.key === k; });
        var val = data[k];
        if (fieldDef && fieldDef.type === 'array' && !Array.isArray(val)) {
          val = String(val).split(/,\s*|\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        } else if (fieldDef && fieldDef.type === 'string' && Array.isArray(val)) {
          val = val.join(', ');
        }
        cleanedResult[k] = val;
      }
    });

    return {
      ok: true,
      data: cleanedResult,
      rawText: res.rawText
    };
  }

  /**
   * Single-Record Autofill Trigger from Form (#edit-bg)
   * 1. Finds local database hits (from _gsc and S.files)
   * 2. Uses SLM to synthesize remaining missing fields
   * 3. Renders suggestions into #autofill-bg with [Local DB] and [✨ AI] source badges
   */
  async function mdbTriggerFormAiAutofill() {
    var primaryKey = mdbGetPrimaryFieldKey(window.S ? window.S.typeKey : 'wordbanks');
    var primaryEl = document.getElementById('ff-' + primaryKey)
      || document.getElementById('ff-word')
      || document.getElementById('ff-title')
      || document.getElementById('ff-name')
      || document.getElementById('ff-sentence')
      || document.querySelector('#edit-body input[type="text"]');

    var primaryVal = (primaryEl ? primaryEl.value : '').trim();
    if (!primaryVal) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiSeedRequired', 'Please enter a word, title, or seed term first.'), true);
      }
      if (primaryEl) primaryEl.focus();
      return;
    }

    // Collect current values from form inputs
    var formRec = {};
    var activeSchema = window._activeFormSchema || (window.S && window.S.schema) || [];
    var missingKeys = [];

    activeSchema.forEach(function (f) {
      if (!f || !f.key || f.key.startsWith('_')) return;
      var el = document.getElementById('ff-' + f.key);
      if (el) {
        if (el.type === 'checkbox') {
          formRec[f.key] = !!el.checked;
        } else {
          var val = el.value.trim();
          formRec[f.key] = val;
          if (!val) missingKeys.push(f.key);
        }
      } else {
        missingKeys.push(f.key);
      }
    });

    if (missingKeys.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiAllFieldsFilled', 'All form fields are already filled!'));
      }
      return;
    }

    var btn = document.getElementById('mdb-ai-autofill-btn');
    var originalBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<img src="../assets/icons/sparkles.svg" class="btn-icon btn-icon-xs" style="animation:spin 1s linear infinite;" alt="" /> ' + _t('mdbAiGenerating', 'Generating…');
    }

    try {
      // Step 1: Local DB search
      var localHits = (typeof window.findAutofillHits === 'function') ? window.findAutofillHits(primaryVal) : [];
      var fieldSuggestions = {};
      var sources = new Set();

      localHits.forEach(function (hit) {
        sources.add(hit.filename);
        var r = hit.rec;
        Object.keys(r || {}).forEach(function (k) {
          if (k.startsWith('_') || k === primaryKey) return;
          var v = r[k];
          if (v === undefined || v === null || v === '') return;
          if (Array.isArray(v) && v.length === 0) return;
          if (!fieldSuggestions[k]) fieldSuggestions[k] = [];
          var vStr = JSON.stringify(v);
          if (!fieldSuggestions[k].some(function (ex) { return JSON.stringify(ex.val) === vStr; })) {
            fieldSuggestions[k].push({ val: v, filename: hit.filename, isAi: false });
          }
        });
      });

      // Step 2: Determine which requested fields still lack suggestions
      var stillNeeded = missingKeys.filter(function (k) { return !fieldSuggestions[k] || fieldSuggestions[k].length === 0; });

      // Step 3: Run SLM for remaining missing fields
      if (stillNeeded.length > 0) {
        var aiRes = await mdbGenerateAiFields(formRec, window.S ? window.S.typeKey : 'wordbanks', stillNeeded, activeSchema);
        if (aiRes && aiRes.ok && aiRes.data) {
          sources.add('✨ Offline AI (SLM)');
          Object.keys(aiRes.data).forEach(function (k) {
            var v = aiRes.data[k];
            if (v !== undefined && v !== null && v !== '') {
              if (!fieldSuggestions[k]) fieldSuggestions[k] = [];
              fieldSuggestions[k].push({ val: v, filename: '✨ AI Model', isAi: true });
            }
          });
        }
      }

      if (Object.keys(fieldSuggestions).length === 0) {
        if (typeof window.showToast === 'function') {
          window.showToast(_t('mdbAutofillNoMatches', 'No matches found.'), true);
        }
        return;
      }

      window._autofillPendingSuggestions = fieldSuggestions;
      window._autofillContext = { mode: 'form' };

      // Render custom modal UI with badges
      mdbRenderAutofillModalUi(localHits, sources, fieldSuggestions, null);
    } catch (err) {
      console.warn('[MdbAiService] Autofill error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('AI Autofill: ' + (err && err.message ? err.message : String(err)), true);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  }

  /**
   * Render the Suggestions Modal (#autofill-bg) with clear [Local DB] and [✨ AI] provenance badges
   */
  function mdbRenderAutofillModalUi(hits, sources, fieldSuggestions, rec) {
    var body = document.getElementById('autofill-body');
    if (!body) return;

    var sourcesArr = Array.from(sources);
    var html = [
      '<div style="font-size:0.83rem;color:#555;margin-bottom:12px;">',
      '  <div style="font-weight:700;color:#222;">' + (sourcesArr.length > 0 ? ('Sources: ' + _escapeHtml(sourcesArr.join(', '))) : '') + '</div>',
      '</div>',
      '<div style="font-size:0.82rem;font-weight:700;margin-bottom:8px;">' + _t('mdbAutofillSelectFields', 'Select fields to apply:') + '</div>',
      '<div style="display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto;padding-right:4px;">'
    ];

    Object.keys(fieldSuggestions).forEach(function (fieldKey) {
      var candidateList = fieldSuggestions[fieldKey];
      var primaryCand = candidateList[0];
      var isAi = Boolean(primaryCand && primaryCand.isAi);

      var displayVal = '';
      if (Array.isArray(primaryCand.val)) {
        displayVal = primaryCand.val.join(', ');
      } else if (typeof primaryCand.val === 'object' && primaryCand.val !== null) {
        displayVal = JSON.stringify(primaryCand.val);
      } else {
        displayVal = String(primaryCand.val);
      }

      var badgeHtml = isAi
        ? '<span style="display:inline-flex;align-items:center;gap:3px;background:#8b7cc2;color:#ffffff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #333333;margin-left:6px;"><img src="../assets/icons/sparkles.svg" style="width:10px;height:10px;" alt="" /> AI</span>'
        : '<span style="display:inline-flex;align-items:center;gap:3px;background:#6abf8e;color:#ffffff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #333333;margin-left:6px;">DB (' + _escapeHtml(primaryCand.filename || 'local') + ')</span>';

      html.push([
        '<div style="border:1.5px solid #333333;border-radius:6px;padding:8px 10px;background:#ffffff;box-shadow:2px 2px 0 #555555;">',
        '  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;margin-bottom:4px;">',
        '    <span style="font-weight:800;font-size:0.82rem;color:#1e1e1e;display:flex;align-items:center;">',
        '      <input type="checkbox" class="af-field-cb" data-field="' + _escapeHtml(fieldKey) + '" checked style="margin-right:8px;accent-color:#1e1e1e;" />',
        '      ' + _escapeHtml(fieldKey),
        '      ' + badgeHtml,
        '    </span>',
        '  </label>',
        '  <div style="font-size:0.78rem;color:#444444;background:#f5f5f0;padding:6px 8px;border-radius:4px;border:1px solid #ddd;word-break:break-word;font-family:inherit;">',
        '    ' + _escapeHtml(displayVal),
        '  </div>',
        '</div>'
      ].join('\n'));
    });

    html.push('</div>');
    body.innerHTML = html.join('\n');

    var modalBg = document.getElementById('autofill-bg');
    if (modalBg) modalBg.classList.remove('hidden');
  }

  /**
   * Execute Batch Autofill across selected records with queue, live progress, and cancel support
   */
  async function mdbRunBatchAutofill(targetItems, requestedFields, engineMode, options) {
    if (_isBatchRunning) return;
    _isBatchRunning = true;
    _batchCancelRequested = false;

    options = options || {};
    var onProgress = options.onProgress || function () {};
    var schema = (window.S && window.S.schema) || [];
    var typeKey = (window.S && window.S.typeKey) || 'wordbanks';

    var total = targetItems.length;
    var updatedRecordCount = 0;
    var filesToSave = new Set();

    for (var i = 0; i < total; i++) {
      if (_batchCancelRequested) break;

      var item = targetItems[i];
      var rec = item.rec;
      var file = item.file;
      var fi = item.fi;

      onProgress({
        current: i + 1,
        total: total,
        percent: Math.round(((i + 1) / total) * 100),
        status: 'Processing record ' + (i + 1) + ' of ' + total + '…'
      });

      // Identify missing fields for this record
      var missing = requestedFields.filter(function (fKey) {
        var v = rec[fKey];
        return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      });

      if (missing.length === 0) continue;

      var fieldValuesToApply = {};

      // 1. Try local DB if allowed
      if (engineMode === 'local' || engineMode === 'hybrid') {
        var primaryKey = mdbGetPrimaryFieldKey(typeKey);
        var primaryVal = rec[primaryKey] || rec.word || rec.title || rec.english || '';
        if (primaryVal && typeof window.findAutofillHits === 'function') {
          var hits = window.findAutofillHits(primaryVal).filter(function (h) {
            return !(h.filename === file.name && h.rec === rec);
          });
          if (hits.length > 0) {
            var bestHit = hits[0].rec;
            missing.forEach(function (fKey) {
              if (bestHit[fKey] !== undefined && bestHit[fKey] !== null && bestHit[fKey] !== '') {
                fieldValuesToApply[fKey] = bestHit[fKey];
              }
            });
          }
        }
      }

      // 2. Try AI for remaining missing fields if allowed
      var remainingMissing = missing.filter(function (k) { return fieldValuesToApply[k] === undefined; });
      if ((engineMode === 'hybrid' || engineMode === 'ai_only') && remainingMissing.length > 0) {
        try {
          var aiRes = await mdbGenerateAiFields(rec, typeKey, remainingMissing, schema);
          if (aiRes && aiRes.ok && aiRes.data) {
            Object.keys(aiRes.data).forEach(function (k) {
              fieldValuesToApply[k] = aiRes.data[k];
            });
          }
        } catch (aiErr) {
          console.warn('[MdbAiBatch] Record AI generation skipped:', aiErr);
        }
      }

      // Apply values
      var didUpdate = false;
      Object.keys(fieldValuesToApply).forEach(function (fKey) {
        var val = fieldValuesToApply[fKey];
        rec[fKey] = Array.isArray(val) ? val.slice() : (typeof val === 'object' && val !== null ? JSON.parse(JSON.stringify(val)) : val);
        didUpdate = true;
      });

      if (didUpdate) {
        updatedRecordCount++;
        filesToSave.add(fi);
      }
    }

    // Save modified files
    for (var fiIdx of filesToSave) {
      if (typeof window.saveFile === 'function') {
        await window.saveFile(fiIdx);
      }
    }

    _isBatchRunning = false;
    return {
      updatedCount: updatedRecordCount,
      cancelled: _batchCancelRequested
    };
  }

  function mdbCancelBatchAutofill() {
    _batchCancelRequested = true;
  }

  global.MdbAi = {
    getPrimaryFieldKey: mdbGetPrimaryFieldKey,
    buildPrompt: mdbBuildPrompt,
    generateAiFields: mdbGenerateAiFields,
    triggerFormAiAutofill: mdbTriggerFormAiAutofill,
    runBatchAutofill: mdbRunBatchAutofill,
    cancelBatchAutofill: mdbCancelBatchAutofill,
    isBatchRunning: function () { return _isBatchRunning; }
  };

  global.mdbTriggerFormAiAutofill = mdbTriggerFormAiAutofill;
})(typeof window !== 'undefined' ? window : this);
