/**
 * js/slm-service.js
 * Unified Offline Small Language Model (SLM) Renderer Service
 * Manages the Web Worker lifecycle, model switching, token streaming,
 * cancellation, and resilient JSON extraction for Board and Manage Database.
 */

(function (global) {
  'use strict';

  var worker = null;
  var activeModelId = '';
  var activeModelBasePath = '';
  var isModelReady = false;
  var pendingRequests = {};
  var modelSwitchResolvers = [];
  var statusListeners = [];

  try {
    var storedModel = localStorage.getItem('cmt-active-slm-model');
    if (storedModel) activeModelId = storedModel;
  } catch (_) {}

  function _t(key, fallback) {
    if (global.i18n && typeof global.i18n.t === 'function') {
      var val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _notifyStatus(statusObj) {
    for (var i = 0; i < statusListeners.length; i++) {
      try {
        statusListeners[i](statusObj);
      } catch (_) {}
    }
  }

  function _resolveWorkerUrl() {
    var workerUrl = '../js/workers/slm-worker.js';
    try {
      var pathName = global.location && global.location.pathname ? global.location.pathname : '';
      if (pathName.indexOf('/pages/') === -1 && pathName.indexOf('\\pages\\') === -1) {
        workerUrl = 'js/workers/slm-worker.js';
      }
    } catch (_) {}
    return workerUrl;
  }

  function initWorker() {
    if (worker) return worker;
    try {
      worker = new Worker(_resolveWorkerUrl());
      worker.onmessage = function (e) {
        var data = e.data;
        if (!data || !data.type) return;

        if (data.type === 'worker-log') {
          console.log('[SlmWorker]', data.message);
        } else if (data.type === 'model-loading') {
          isModelReady = false;
          _notifyStatus({ state: 'loading', modelId: data.modelId, message: data.message });
        } else if (data.type === 'model-load-progress') {
          _notifyStatus({
            state: 'loading',
            modelId: data.modelId,
            file: data.file,
            progress: data.progress
          });
        } else if (data.type === 'model-ready') {
          activeModelId = data.modelId || activeModelId;
          isModelReady = true;
          _notifyStatus({ state: 'ready', modelId: activeModelId });
          var resolvers = modelSwitchResolvers.slice(0);
          modelSwitchResolvers = [];
          for (var r = 0; r < resolvers.length; r++) {
            resolvers[r].resolve({ ok: true, modelId: activeModelId });
          }
        } else if (data.type === 'model-error') {
          isModelReady = false;
          _notifyStatus({ state: 'error', modelId: data.modelId, error: data.error, oom: data.oom });
          if (data.oom && typeof global.showToast === 'function') {
            global.showToast(_t('slmOomError', 'SLM ran out of memory. Try switching to the Fast (0.5B) model tier.'), true);
          }
          var errResolvers = modelSwitchResolvers.slice(0);
          modelSwitchResolvers = [];
          for (var er = 0; er < errResolvers.length; er++) {
            errResolvers[er].reject(new Error(data.error || 'Failed to load SLM model'));
          }
        } else if (data.type === 'generate-token') {
          var req = pendingRequests[data.requestId];
          if (req && typeof req.onToken === 'function') {
            try {
              req.onToken(data.token, data.partialText, {
                tokenCount: data.tokenCount || 0,
                tokensPerSec: data.tokensPerSec || 0
              });
            } catch (_) {}
          }
          _notifyStatus({
            state: 'generating',
            modelId: activeModelId,
            requestId: data.requestId,
            tokenCount: data.tokenCount,
            tokensPerSec: data.tokensPerSec
          });
        } else if (data.type === 'generate-result') {
          var doneReq = pendingRequests[data.requestId];
          if (doneReq) {
            delete pendingRequests[data.requestId];
            doneReq.resolve({
              ok: true,
              text: data.text || '',
              modelId: data.modelId || activeModelId,
              aborted: false,
              tokenCount: data.tokenCount || 0,
              tokensPerSec: data.tokensPerSec || 0,
              durationMs: data.durationMs || 0
            });
          }
          _notifyStatus({ state: 'ready', modelId: activeModelId });
        } else if (data.type === 'generate-aborted') {
          var abortReq = pendingRequests[data.requestId];
          if (abortReq) {
            delete pendingRequests[data.requestId];
            abortReq.resolve({
              ok: false,
              text: data.partialText || '',
              aborted: true
            });
          }
          _notifyStatus({ state: 'ready', modelId: activeModelId });
        } else if (data.type === 'generate-error') {
          var failReq = pendingRequests[data.requestId];
          if (failReq) {
            delete pendingRequests[data.requestId];
            failReq.reject(new Error(data.error || 'SLM generation error'));
          }
          _notifyStatus({ state: 'error', error: data.error, oom: data.oom });
        } else if (data.type === 'disposed') {
          isModelReady = false;
          _notifyStatus({ state: 'idle', modelId: activeModelId });
        }
      };

      worker.onerror = function (err) {
        console.error('[SlmService] Worker error:', err);
      };
    } catch (err) {
      console.error('[SlmService] Failed to create SLM Web Worker:', err);
    }
    return worker;
  }

  async function listAvailableModels() {
    if (global.Desktop && typeof global.Desktop.slmListModels === 'function') {
      try {
        var res = await global.Desktop.slmListModels();
        if (res && res.ok) {
          if (res.activeModel) {
            activeModelId = res.activeModel;
            try { localStorage.setItem('cmt-active-slm-model', activeModelId); } catch (_) {}
          }
          if (res.userModelsDir) {
            activeModelBasePath = res.userModelsDir;
          }
          return res;
        }
      } catch (err) {
        console.warn('[SlmService] slmListModels error:', err);
      }
    }
    return {
      ok: true,
      activeModel: activeModelId,
      models: []
    };
  }

  async function setActiveModel(modelId) {
    if (!modelId) return { ok: false, error: 'Missing modelId' };

    var basePath = activeModelBasePath;
    if (global.Desktop && typeof global.Desktop.slmSetActiveModel === 'function') {
      var res = await global.Desktop.slmSetActiveModel(modelId);
      if (!res || !res.ok) {
        throw new Error((res && res.error) || 'Could not activate SLM model');
      }
      if (res.basePath) basePath = res.basePath;
    }

    activeModelId = modelId;
    activeModelBasePath = basePath || activeModelBasePath;
    try {
      localStorage.setItem('cmt-active-slm-model', modelId);
    } catch (_) {}

    if (worker) {
      return new Promise(function (resolve, reject) {
        modelSwitchResolvers.push({ resolve: resolve, reject: reject });
        worker.postMessage({
          type: 'switch-model',
          modelId: modelId,
          basePath: activeModelBasePath
        });
      });
    }

    return { ok: true, modelId: modelId };
  }

  async function downloadModel(modelId, onProgress) {
    if (!global.Desktop || typeof global.Desktop.slmDownloadModel !== 'function') {
      throw new Error('SLM downloads require the Electron desktop app.');
    }

    var unsub = null;
    if (typeof onProgress === 'function' && typeof global.Desktop.onSlmDownloadProgress === 'function') {
      unsub = global.Desktop.onSlmDownloadProgress(function (prog) {
        if (prog && prog.modelId === modelId) {
          onProgress(prog);
        }
      });
    }

    try {
      var res = await global.Desktop.slmDownloadModel(modelId);
      if (!res || !res.ok) {
        throw new Error((res && res.error) || 'Download failed');
      }
      if (res.basePath) activeModelBasePath = res.basePath;
      activeModelId = modelId;
      try { localStorage.setItem('cmt-active-slm-model', modelId); } catch (_) {}
      return res;
    } finally {
      if (typeof unsub === 'function') unsub();
    }
  }

  async function deleteModel(modelId) {
    if (!global.Desktop || typeof global.Desktop.slmDeleteModel !== 'function') {
      throw new Error('Delete unavailable in web mode.');
    }
    var res = await global.Desktop.slmDeleteModel(modelId);
    if (!res || !res.ok) {
      throw new Error((res && res.error) || 'Failed to delete model');
    }
    if (activeModelId === modelId) {
      activeModelId = res.activeModel || '';
      try { localStorage.setItem('cmt-active-slm-model', activeModelId); } catch (_) {}
      if (worker) {
        worker.postMessage({ type: 'dispose' });
      }
    }
    return res;
  }

  /**
   * Ensure an SLM model is installed and ready.
   * If no model is installed, opens the SLM Model Manager Modal so the teacher can 1-click download one.
   */
  async function ensureReady(options) {
    options = options || {};
    var listRes = await listAvailableModels();
    var models = (listRes && listRes.models) || [];
    var installed = models.filter(function (m) { return m.isInstalled; });

    if (installed.length === 0) {
      if (options.promptDownloadIfMissing !== false && typeof global.openSlmModelManager === 'function') {
        if (typeof global.showToast === 'function') {
          global.showToast(_t('slmDownloadRequiredToast', 'Please download an offline AI model to use this feature.'));
        }
        return new Promise(function (resolve) {
          global.openSlmModelManager({
            highlightModelId: 'slm-fast',
            onModelChanged: function (newModelId) {
              if (typeof global.closeSlmModelManager === 'function') {
                global.closeSlmModelManager();
              }
              resolve({
                ok: Boolean(newModelId),
                modelId: newModelId || activeModelId,
                basePath: activeModelBasePath
              });
            },
            onClose: function () {
              resolve({ ok: false, cancelled: true });
            }
          });
        });
      }
      return { ok: false, error: 'no-model-installed' };
    }

    var activeObj = installed.find(function (m) { return m.id === activeModelId; }) || installed[0];
    activeModelId = activeObj.id;
    activeModelBasePath = activeObj.basePath || listRes.userModelsDir || activeModelBasePath;

    return {
      ok: true,
      modelId: activeModelId,
      basePath: activeModelBasePath
    };
  }

  /**
   * Stream or generate text with the active SLM.
   * Returns a Promise augmented with `.requestId` and `.abort()`.
   */
  function generateText(options) {
    options = options || {};
    var requestId = 'slm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    var promise = (async function () {
      var ready = await ensureReady({
        promptDownloadIfMissing: options.promptDownloadIfMissing !== false
      });
      if (!ready || !ready.ok) {
        return {
          ok: false,
          aborted: Boolean(ready && ready.cancelled),
          error: (ready && ready.error) || 'SLM model not ready'
        };
      }

      var w = initWorker();
      if (!w) {
        throw new Error('Could not initialize SLM Web Worker');
      }

      _notifyStatus({ state: 'generating', modelId: activeModelId, requestId: requestId });

      return new Promise(function (resolve, reject) {
        pendingRequests[requestId] = {
          resolve: resolve,
          reject: reject,
          onToken: options.onToken || null
        };

        if (options.signal && typeof options.signal.addEventListener === 'function') {
          if (options.signal.aborted) {
            abort(requestId);
          } else {
            options.signal.addEventListener('abort', function () {
              abort(requestId);
            }, { once: true });
          }
        }

        w.postMessage({
          type: 'generate',
          requestId: requestId,
          modelId: options.modelId || activeModelId,
          basePath: activeModelBasePath,
          messages: options.messages || null,
          systemPrompt: options.systemPrompt || '',
          userPrompt: options.userPrompt || options.prompt || '',
          maxNewTokens: options.maxNewTokens || 384,
          temperature: typeof options.temperature === 'number' ? options.temperature : 0.35,
          doSample: options.doSample,
          topK: options.topK || 40,
          repetitionPenalty: options.repetitionPenalty || 1.1,
          assistantPrefix: options.assistantPrefix || '',
          stopOnJsonComplete: Boolean(options.stopOnJsonComplete),
          stopSequences: Array.isArray(options.stopSequences) ? options.stopSequences : null
        });
      });
    })();

    promise.requestId = requestId;
    promise.abort = function () {
      abort(requestId);
    };
    return promise;
  }

  /**
   * Extract and repair JSON object or array from raw SLM output text
   */
  function extractJsonFromText(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    var cleaned = rawText.trim();

    // 1. Try direct parse first
    try {
      return JSON.parse(cleaned);
    } catch (_) {}

    // 2. Check for markdown code fences anywhere in the string
    var fenceMatch = cleaned.match(/```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch (_) {
        cleaned = fenceMatch[1].trim();
      }
    } else {
      // Strip leading/trailing partial fences
      cleaned = cleaned.replace(/^[\s\S]*?```(?:json|javascript|js)?\s*/i, '').replace(/\s*```[\s\S]*$/i, '').trim();
    }

    // Try again after fence stripping
    try {
      return JSON.parse(cleaned);
    } catch (_) {}

    // 3. Locate first '{' or '[' and matching closing bracket
    var firstBrace = cleaned.indexOf('{');
    var firstBracket = cleaned.indexOf('[');
    var startIdx = -1;
    var isObj = true;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      isObj = true;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      isObj = false;
    }

    if (startIdx !== -1) {
      var lastIdx = isObj ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
      var candidate = lastIdx > startIdx ? cleaned.slice(startIdx, lastIdx + 1) : cleaned.slice(startIdx);

      // Repair trailing commas before } or ]
      var repaired = candidate.replace(/,\s*([}\]])/g, '$1');

      try {
        return JSON.parse(repaired);
      } catch (_) {}

      // Repair unquoted keys: e.g. { word: "..." } -> { "word": "..." }
      var quotedKeys = repaired.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      try {
        return JSON.parse(quotedKeys);
      } catch (_) {}

      // Repair single quotes: e.g. {'word': 'concept'} -> {"word": "concept"}
      var doubleQuoted = quotedKeys.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      try {
        return JSON.parse(doubleQuoted);
      } catch (_) {}

      // Attempt auto-closing truncated JSON brackets
      var openBraces = 0;
      var openBrackets = 0;
      var inString = false;
      var escaped = false;
      for (var i = 0; i < doubleQuoted.length; i++) {
        var ch = doubleQuoted[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') openBraces++;
          else if (ch === '}') openBraces = Math.max(0, openBraces - 1);
          else if (ch === '[') openBrackets++;
          else if (ch === ']') openBrackets = Math.max(0, openBrackets - 1);
        }
      }

      var closed = doubleQuoted.replace(/,\s*$/, '');
      if (inString) closed += '"';
      while (openBrackets > 0) { closed += ']'; openBrackets--; }
      while (openBraces > 0) { closed += '}'; openBraces--; }
      closed = closed.replace(/,\s*([}\]])/g, '$1');

      try {
        return JSON.parse(closed);
      } catch (_) {}
    }

    // 3b. Robust Item-by-Item JSON Object Extraction from Array
    var recoveredList = [];
    var seenKeys = new Set();
    var objMatches = cleaned.match(/\{[^{}]*\}/g);
    var METADATA_KEYS = new Set([
      'width', 'height', 'style', 'title', 'version', 'viewbox', 'database', 'system', 'status',
      'english', 'german', 'french', 'italian', 'spanish', 'portuguese', 'russian', 'chinese', 'japanese', 'latin',
      'examplesentence', 'sentence', 'sentences', 'translation', 'translations', 'equivalent',
      'topic', 'theme', 'concept', 'concepts', 'definition', 'definitions', 'meaning',
      'synonym', 'synonyms', 'antonym', 'antonyms', 'hypernym', 'hyponym', 'partofspeech'
    ]);

    if (objMatches && objMatches.length > 0) {
      for (var om = 0; om < objMatches.length; om++) {
        var objStr = objMatches[om];
        objStr = objStr.replace(/,\s*\}/g, '}');
        objStr = objStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        objStr = objStr.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
        try {
          var parsedObj = JSON.parse(objStr);
          if (parsedObj && typeof parsedObj === 'object') {
            var keys = Object.keys(parsedObj).filter(function (k) { return !k.startsWith('_'); });
            if (keys.length === 0) continue;

            // Reject metadata-only objects like { "width": 800, "height": 600 }
            var isMetaOnly = keys.every(function (k) { return METADATA_KEYS.has(k.toLowerCase()); });
            if (isMetaOnly) continue;

            // Reject hallucinated metadata words like word: "title" with def: "educational database" or instruction phrases
            var rawWord = String(parsedObj.word || parsedObj.term || parsedObj.concept || parsedObj.label || parsedObj.name || '').trim().toLowerCase();
            if (METADATA_KEYS.has(rawWord) || rawWord.length > 35 || rawWord.split(/\s+/).length > 4 || /example\s*sentence|illustrat|translation|equivalent/i.test(rawWord)) {
              continue;
            }

            var primaryVal = String(parsedObj.word || parsedObj.term || parsedObj.concept || parsedObj.label || parsedObj.name || parsedObj.id || parsedObj.code || parsedObj.quote || parsedObj.sentence || parsedObj.rule || JSON.stringify(parsedObj)).trim();
            var primaryLower = primaryVal.toLowerCase();
            if (primaryVal && !seenKeys.has(primaryLower)) {
              seenKeys.add(primaryLower);
              recoveredList.push(parsedObj);
            } else if (!primaryVal) {
              recoveredList.push(parsedObj);
            }
          }
        } catch (_) {}
      }
    }
    if (recoveredList.length > 0) {
      return recoveredList;
    }

    // 3c. Direct Regex scan for word keys and array lists in malformed JSON
    var wordRegex = /"(?:word|words|substitute|substitutes|term|concept|label|name)"\s*:\s*(?:\[([^\]]+)\]|"([^"]+)")/gi;
    var wMatch;
    while ((wMatch = wordRegex.exec(cleaned)) !== null) {
      if (wMatch[2]) {
        var foundWord = wMatch[2].trim();
        var lowerWord = foundWord.toLowerCase();
        if (foundWord.length >= 2 && foundWord.length <= 35 && foundWord.split(/\s+/).length <= 4 && !seenKeys.has(lowerWord) && !METADATA_KEYS.has(lowerWord)) {
          if (!/example\s*sentence|illustrat|translation|equivalent/i.test(foundWord)) {
            seenKeys.add(lowerWord);
            recoveredList.push({
              word: foundWord,
              relation: 'related',
              pos: 'noun',
              def: ''
            });
          }
        }
      } else if (wMatch[1]) {
        var innerArr = wMatch[1];
        var innerRegex = /"([^"]+)"/g;
        var inMatch;
        while ((inMatch = innerRegex.exec(innerArr)) !== null) {
          var strItem = inMatch[1].trim();
          var lowerItem = strItem.toLowerCase();
          if (strItem.length >= 2 && strItem.length <= 35 && strItem.split(/\s+/).length <= 4 && !seenKeys.has(lowerItem) && !METADATA_KEYS.has(lowerItem)) {
            if (!/example\s*sentence|illustrat|translation|equivalent/i.test(strItem)) {
              seenKeys.add(lowerItem);
              recoveredList.push({
                word: strItem,
                relation: 'related',
                pos: 'noun',
                def: ''
              });
            }
          }
        }
      }
    }
    if (recoveredList.length > 0) {
      return recoveredList;
    }

    // 4. Line-based / bullet-point fallback parsing if model output prose list instead of JSON
    var lines = rawText.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var fallbackItems = [];
    var currentItem = null;
    var BLACKLIST_KEYS = new Set([
      'title', 'width', 'height', 'style', 'border', 'color', 'background',
      'margin', 'padding', 'font', 'type', 'version', 'task', 'database',
      'system', 'user', 'assistant', 'role', 'status', 'error', 'warning',
      'note', 'notes', 'instruction', 'instructions', 'rule', 'rules',
      'schema', 'format', 'code', 'class', 'id', 'count', 'level', 'model',
      'table', 'column', 'columns', 'row', 'rows', 'property', 'properties',
      'key', 'keys', 'value', 'values', 'target', 'view', 'size',
      'english', 'german', 'french', 'italian', 'spanish', 'portuguese', 'russian', 'chinese', 'japanese', 'latin',
      'examplesentence', 'sentence', 'sentences', 'translation', 'translations', 'equivalent',
      'topic', 'theme', 'concept', 'concepts', 'definition', 'definitions', 'meaning',
      'synonym', 'synonyms', 'antonym', 'antonyms', 'hypernym', 'hyponym', 'partofspeech'
    ]);

    lines.forEach(function (line) {
      // Matches "1. Word: Concept" or "- word: Concept" or "Word: Concept"
      var kvMatch = line.match(/^(?:[-*•\d.]+\s*)?([a-zA-Z_]+)\s*[:=-]\s*(.+)$/);
      if (kvMatch) {
        var k = kvMatch[1].toLowerCase().trim();
        var v = kvMatch[2].replace(/^["']|["']$/g, '').trim();
        if (k === 'word' || k === 'term' || k === 'label') {
          var vLower = v.toLowerCase();
          if (v.length >= 2 && v.length <= 35 && v.split(/\s+/).length <= 4 && !BLACKLIST_KEYS.has(vLower) && !/example\s*sentence|illustrat|translation|equivalent/i.test(v)) {
            if (currentItem && currentItem.word) fallbackItems.push(currentItem);
            currentItem = { word: v, relation: 'related', pos: 'noun', def: '' };
          }
        } else if (k === 'relation' || k === 'link' || k === 'type') {
          if (currentItem) currentItem.relation = v;
        } else if (k === 'pos' || k === 'partofspeech') {
          if (currentItem) currentItem.pos = v;
        } else if (k === 'def' || k === 'definition') {
          if (currentItem) currentItem.def = v;
        } else if (!BLACKLIST_KEYS.has(k) && /^[A-Za-z\s'-]{2,35}$/.test(kvMatch[1].trim()) && v.length > 2) {
          // The key itself is the word! (e.g. "Metaphor: A figure of speech")
          var candidateWord = kvMatch[1].trim();
          var candLower = candidateWord.toLowerCase();
          if (!BLACKLIST_KEYS.has(candLower) && candidateWord.split(/\s+/).length <= 4 && !/example\s*sentence|illustrat|translation|equivalent/i.test(candidateWord)) {
            if (currentItem && currentItem.word) fallbackItems.push(currentItem);
            currentItem = { word: candidateWord, relation: 'related', pos: 'noun', def: v };
          }
        }
      } else {
        // Matches "1. Concept (noun): Definition"
        var bulletMatch = line.match(/^(?:[-*•\d.]+\s*)?([A-Za-z\s'-]{2,30})(?:\s*\(([^)]+)\))?\s*[:–-]\s*(.+)$/);
        if (bulletMatch) {
          var candWord = bulletMatch[1].trim();
          var candLower = candWord.toLowerCase();
          if (!BLACKLIST_KEYS.has(candLower) && candWord.split(/\s+/).length <= 4 && !/example\s*sentence|illustrat|translation|equivalent/i.test(candWord)) {
            if (currentItem && currentItem.word) fallbackItems.push(currentItem);
            currentItem = {
              word: candWord,
              relation: 'related',
              pos: (bulletMatch[2] || 'noun').trim(),
              def: (bulletMatch[3] || '').trim()
            };
          }
        }
      }
    });
    if (currentItem && currentItem.word) fallbackItems.push(currentItem);
    if (fallbackItems.length > 0) {
      return fallbackItems;
    }

    console.warn('[SlmService] Failed to extract JSON from raw SLM output:\n', rawText);
    return null;
  }

  /**
   * Generate structured JSON from the SLM with automatic parsing and repair
   */
  async function generateJson(options) {
    options = options || {};
    var sys = (options.systemPrompt || 'You are a helpful educational AI assistant.') +
      '\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown explanations or prose outside the JSON.';

    var prefix = options.assistantPrefix !== undefined
      ? options.assistantPrefix
      : (options.expectObject ? '{' : '[');

    var res = await generateText({
      modelId: options.modelId,
      systemPrompt: sys,
      userPrompt: options.userPrompt || options.prompt || '',
      messages: options.messages || null,
      maxNewTokens: options.maxNewTokens || 512,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.2,
      doSample: options.doSample !== undefined ? options.doSample : false,
      stopOnJsonComplete: options.stopOnJsonComplete !== false,
      stopSequences: options.stopSequences || null,
      onToken: options.onToken,
      signal: options.signal,
      assistantPrefix: prefix,
      promptDownloadIfMissing: options.promptDownloadIfMissing
    });

    if (!res || !res.ok) {
      return {
        ok: false,
        aborted: Boolean(res && res.aborted),
        rawText: (res && res.text) || '',
        error: (res && res.error) || 'Generation failed'
      };
    }

    var parsed = extractJsonFromText(res.text);
    if (!parsed) {
      return {
        ok: false,
        rawText: res.text,
        error: 'Failed to parse JSON from SLM response'
      };
    }

    return {
      ok: true,
      data: parsed,
      rawText: res.text,
      modelId: res.modelId
    };
  }

  function abort(requestId) {
    if (!worker) return;
    if (requestId) {
      worker.postMessage({ type: 'abort', requestId: requestId });
    } else {
      Object.keys(pendingRequests).forEach(function (id) {
        worker.postMessage({ type: 'abort', requestId: id });
      });
    }
  }

  function dispose() {
    if (worker) {
      worker.postMessage({ type: 'dispose' });
    }
  }

  function onStatusChange(listener) {
    if (typeof listener !== 'function') return function () {};
    statusListeners.push(listener);
    return function () {
      var idx = statusListeners.indexOf(listener);
      if (idx !== -1) statusListeners.splice(idx, 1);
    };
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('beforeunload', function () {
      if (worker) {
        try {
          worker.terminate();
        } catch (_) {}
        worker = null;
      }
    });
  }

  async function getStatus() {
    var info = await listAvailableModels();
    var activeId = (info && (info.activeModel || info.activeModelId)) || activeModelId;
    var models = ((info && info.models) || []).map(function (m) {
      var inst = Boolean(m.isInstalled || m.installed);
      return Object.assign({}, m, {
        isInstalled: inst,
        installed: inst
      });
    });
    return {
      ok: Boolean(info && info.ok !== false),
      activeModel: activeId,
      activeModelId: activeId,
      isReady: isModelReady,
      models: models
    };
  }

  global.SlmService = {
    listAvailableModels: listAvailableModels,
    getStatus: getStatus,
    getActiveModel: function () { return activeModelId; },
    isReady: function () { return isModelReady; },
    setActiveModel: setActiveModel,
    downloadModel: downloadModel,
    deleteModel: deleteModel,
    ensureReady: ensureReady,
    generateText: generateText,
    generateStream: generateText,
    generateJson: generateJson,
    extractJsonFromText: extractJsonFromText,
    abort: abort,
    dispose: dispose,
    onStatusChange: onStatusChange,
    onProgress: onStatusChange
  };

})(typeof window !== 'undefined' ? window : this);
