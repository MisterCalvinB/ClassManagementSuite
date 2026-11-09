/**
 * js/workers/slm-worker.js
 * Standalone Web Worker for Offline Small Language Model (SLM) Text Generation
 * Uses Transformers.js with local quantized ONNX models for Board & Manage Database.
 */

/* global self, postMessage */

(function () {
  'use strict';

  var generator = null;
  var pipelinePromise = null;
  var isModelLoading = false;
  var currentModelId = '';
  var currentBasePath = '';
  var abortedRequests = new Set();
  var idleTimer = null;
  var IDLE_DISPOSE_MS = 10 * 60 * 1000; // 10 minutes

  function getSttBasePath() {
    try {
      var href = self.location.href;
      var idx = href.indexOf('/js/workers/');
      if (idx !== -1) {
        return href.substring(0, idx) + '/modules/stt/';
      }
    } catch (_) {}
    return '../../modules/stt/';
  }

  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    idleTimer = setTimeout(function () {
      disposeCurrentGenerator().then(function () {
        postMessage({ type: 'worker-log', message: 'SLM session disposed after idle timeout to free RAM.' });
      });
    }, IDLE_DISPOSE_MS);
  }

  async function disposeCurrentGenerator() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (generator) {
      try {
        if (typeof generator.dispose === 'function') {
          await generator.dispose();
        } else if (generator.model && typeof generator.model.dispose === 'function') {
          await generator.model.dispose();
        }
      } catch (e) {
        console.warn('[SlmWorker] Memory cleanup notice:', e);
      }
      generator = null;
    }
  }

  async function loadModel(modelId, customBasePath) {
    modelId = modelId || currentModelId || 'slm-fast';
    if (generator && currentModelId === modelId && (!customBasePath || customBasePath === currentBasePath)) {
      resetIdleTimer();
      return generator;
    }

    if (pipelinePromise) {
      try { await pipelinePromise; } catch (_) {}
    }

    pipelinePromise = (async function () {
      isModelLoading = true;
      var wasmBasePath = getSttBasePath();
      var modelBasePath = customBasePath || (wasmBasePath + '../../user/models/slm/');

      if (/^[a-zA-Z]:[\\\/]/.test(modelBasePath)) {
        modelBasePath = 'file:///' + modelBasePath.replace(/\\/g, '/');
      }

      if (!modelBasePath.endsWith('/') && !modelBasePath.endsWith('\\')) {
        modelBasePath += '/';
      }

      postMessage({
        type: 'model-loading',
        modelId: modelId,
        message: 'Loading offline SLM [' + modelId + ']...'
      });

      try {
        await disposeCurrentGenerator();

        var tf = self.transformers;
        if (!tf) {
          var scriptUrl = wasmBasePath + 'transformers.min.js';
          try {
            tf = await import(scriptUrl);
            self.transformers = tf;
          } catch (e1) {
            try {
              tf = await import('../../modules/stt/transformers.min.js');
              self.transformers = tf;
            } catch (e2) {
              throw new Error('Failed to import transformers.min.js: ' + (e2 && e2.message));
            }
          }
        }

        var env = tf.env;
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.useBrowserCache = false;
        env.localModelPath = modelBasePath;
        if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
          env.backends.onnx.wasm.wasmPaths = wasmBasePath;
          // Multi-threaded WASM needs SharedArrayBuffer. Test support dynamically.
          var canThread = false;
          try {
            if (typeof SharedArrayBuffer !== 'undefined') {
              var _sabTest = new SharedArrayBuffer(16);
              if (_sabTest.byteLength === 16) canThread = true;
            }
          } catch (_) {
            canThread = false;
          }
          var cores = (self.navigator && self.navigator.hardwareConcurrency) || 4;
          var numThreads = canThread ? Math.max(1, Math.min(6, cores - 1 || 2)) : 1;
          env.backends.onnx.wasm.numThreads = numThreads;
          env.backends.onnx.wasm.simd = true;
          env.backends.onnx.wasm.proxy = false;

          postMessage({
            type: 'worker-log',
            message: 'ONNX WebAssembly engine configured: ' + (canThread ? (numThreads + ' threads (multi-threaded active)') : '1 thread (single-thread fallback)') + ' across ' + cores + ' CPU cores.'
          });
        }

        generator = await tf.pipeline('text-generation', modelId, {
          quantized: true,
          local_files_only: true,
          progress_callback: function (prog) {
            if (prog && prog.status === 'progress') {
              postMessage({
                type: 'model-load-progress',
                modelId: modelId,
                file: prog.file || '',
                progress: prog.progress || 0
              });
            }
          }
        });

        currentModelId = modelId;
        currentBasePath = modelBasePath;
        isModelLoading = false;
        pipelinePromise = null;
        resetIdleTimer();

        postMessage({ type: 'model-ready', modelId: modelId });
        postMessage({ type: 'worker-log', message: 'SLM model [' + modelId + '] loaded and ready.' });
        return generator;
      } catch (err) {
        console.error('[SlmWorker] loadModel error:', err);
        var errStr = String(err && (err.message || err));
        var isOom = /out of memory|wasm-out-of-bounds|maximum call stack|allocation failed|std::bad_alloc/i.test(errStr);
        isModelLoading = false;
        pipelinePromise = null;
        postMessage({
          type: 'model-error',
          modelId: modelId,
          error: errStr,
          oom: isOom
        });
        throw err;
      }
    })();

    return pipelinePromise;
  }

  function buildFallbackChatPrompt(messages) {
    if (typeof messages === 'string') return messages;
    if (!Array.isArray(messages)) return String(messages || '');
    var parts = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (!m || !m.content) continue;
      var role = m.role || 'user';
      parts.push('<|im_start|>' + role + '\n' + String(m.content).trim() + '<|im_end|>');
    }
    parts.push('<|im_start|>assistant\n');
    return parts.join('\n');
  }

  async function handleGenerate(data) {
    var requestId = data.requestId || ('req-' + Date.now());
    var modelId = data.modelId || currentModelId || 'slm-fast';
    var basePath = data.basePath || currentBasePath;

    try {
      var pipe = await loadModel(modelId, basePath);
      if (!pipe) {
        throw new Error('SLM pipeline could not be initialized.');
      }

      if (abortedRequests.has(requestId)) {
        abortedRequests.delete(requestId);
        postMessage({ type: 'generate-aborted', requestId: requestId });
        return;
      }

      var messages = data.messages;
      if (!messages) {
        messages = [];
        if (data.systemPrompt) {
          messages.push({ role: 'system', content: String(data.systemPrompt) });
        }
        messages.push({ role: 'user', content: String(data.userPrompt || data.prompt || '') });
      }

      // If messages is a structured Chat, format it into ChatML text prompt with optional assistant prefix
      var assistantPrefix = String(data.assistantPrefix || '');
      var inputForPipe = messages;
      if (Array.isArray(inputForPipe)) {
        var templated;
        try {
          templated = pipe.tokenizer.apply_chat_template(inputForPipe, { tokenize: false, add_generation_prompt: true });
        } catch (_) {
          templated = buildFallbackChatPrompt(inputForPipe);
        }
        inputForPipe = templated + assistantPrefix;
      } else if (!inputForPipe) {
        inputForPipe = String(data.userPrompt || data.prompt || '');
        if (assistantPrefix) {
          inputForPipe += assistantPrefix;
        }
      }

      var lastPartialText = '';
      var maxNewTokens = Number(data.maxNewTokens) || 384;
      var temperature = typeof data.temperature === 'number' ? data.temperature : 0.35;
      var doSample = data.doSample !== undefined ? Boolean(data.doSample) : (temperature > 0.05);
      var topK = Number(data.topK) || 40;
      var repetitionPenalty = Number(data.repetitionPenalty) || 1.1;
      var stopOnJsonComplete = Boolean(data.stopOnJsonComplete || (assistantPrefix && (assistantPrefix.indexOf('[') !== -1 || assistantPrefix.indexOf('{') !== -1)));
      var stopSequences = Array.isArray(data.stopSequences) ? data.stopSequences : [];
      var genStartTime = performance.now();
      var firstTokenTime = 0;
      var totalTokensGenerated = 0;

      var genOptions = {
        max_new_tokens: maxNewTokens,
        temperature: temperature,
        do_sample: doSample,
        top_k: topK,
        repetition_penalty: repetitionPenalty,
        return_full_text: false,
        callback_function: function (beams) {
          if (abortedRequests.has(requestId)) {
            if (Array.isArray(beams)) {
              for (var b = 0; b < beams.length; b++) {
                beams[b].done = true;
              }
            }
            return;
          }
          if (!Array.isArray(beams) || !beams[0] || !beams[0].output_token_ids) return;
          try {
            var beam = beams[0];
            var promptLen = (beam.input && beam.input.dims && beam.input.dims.length)
              ? beam.input.dims[beam.input.dims.length - 1]
              : 0;
            var generatedIds = promptLen > 0
              ? beam.output_token_ids.slice(promptLen)
              : beam.output_token_ids;

            totalTokensGenerated = generatedIds.length;
            if (!firstTokenTime && totalTokensGenerated > 0) {
              firstTokenTime = performance.now();
            }

            var decoded = assistantPrefix + pipe.tokenizer.decode(generatedIds, { skip_special_tokens: true });

            var shouldStop = false;
            // 1. Intelligent Early-Stopping on complete JSON array or object
            if (stopOnJsonComplete && decoded.length > 8) {
              var trimmed = decoded.trim();
              if (trimmed.startsWith('[')) {
                var arrDepth = 0;
                var inArrStr = false;
                var arrEsc = false;
                var hasOpenedArr = false;
                for (var ai = 0; ai < trimmed.length; ai++) {
                  var ach = trimmed[ai];
                  if (arrEsc) { arrEsc = false; continue; }
                  if (ach === '\\') { arrEsc = true; continue; }
                  if (ach === '"') { inArrStr = !inArrStr; continue; }
                  if (!inArrStr) {
                    if (ach === '[') { arrDepth++; hasOpenedArr = true; }
                    else if (ach === ']') {
                      arrDepth--;
                      if (hasOpenedArr && arrDepth === 0) {
                        decoded = trimmed.slice(0, ai + 1);
                        shouldStop = true;
                        break;
                      }
                    }
                  }
                }
              } else if (trimmed.startsWith('{')) {
                var depth = 0;
                var inStr = false;
                var esc = false;
                var hasBrace = false;
                for (var ci = 0; ci < trimmed.length; ci++) {
                  var ch = trimmed[ci];
                  if (esc) { esc = false; continue; }
                  if (ch === '\\') { esc = true; continue; }
                  if (ch === '"') { inStr = !inStr; continue; }
                  if (!inStr) {
                    if (ch === '{') { depth++; hasBrace = true; }
                    else if (ch === '}') {
                      depth--;
                      if (hasBrace && depth === 0) {
                        decoded = trimmed.slice(0, ci + 1);
                        shouldStop = true;
                        break;
                      }
                    }
                  }
                }
              }
            }

            // 2. Early-Stopping on explicit stop sequences
            if (!shouldStop && stopSequences.length > 0) {
              for (var s = 0; s < stopSequences.length; s++) {
                var seq = stopSequences[s];
                if (seq && decoded.indexOf(seq) !== -1) {
                  decoded = decoded.slice(0, decoded.indexOf(seq));
                  shouldStop = true;
                  break;
                }
              }
            }

            if (decoded && decoded.length > lastPartialText.length) {
              var delta = decoded.slice(lastPartialText.length);
              lastPartialText = decoded;
              var curSpeed = firstTokenTime ? (totalTokensGenerated / Math.max(0.05, (performance.now() - firstTokenTime) / 1000)) : 0;
              postMessage({
                type: 'generate-token',
                requestId: requestId,
                token: delta,
                partialText: decoded,
                tokenCount: totalTokensGenerated,
                tokensPerSec: Math.round(curSpeed * 10) / 10
              });
            }

            if (shouldStop && Array.isArray(beams)) {
              for (var sb = 0; sb < beams.length; sb++) {
                beams[sb].done = true;
              }
            }
          } catch (_) {}
        }
      };

      var result = await pipe(inputForPipe, genOptions);
      resetIdleTimer();

      if (abortedRequests.has(requestId)) {
        abortedRequests.delete(requestId);
        postMessage({
          type: 'generate-aborted',
          requestId: requestId,
          partialText: lastPartialText
        });
        return;
      }

      var finalText = lastPartialText;
      if (result) {
        var firstItem = Array.isArray(result) ? result[0] : result;
        if (firstItem && typeof firstItem.generated_text === 'string') {
          finalText = firstItem.generated_text;
        } else if (firstItem && Array.isArray(firstItem.generated_text)) {
          var lastMsg = firstItem.generated_text[firstItem.generated_text.length - 1];
          if (lastMsg && typeof lastMsg.content === 'string') {
            finalText = lastMsg.content;
          }
        }
      }

      finalText = String(finalText || '').trim();
      // generated_text excludes the prompt (and the prefill), so restore the prefill;
      // lastPartialText fallback already includes it.
      if (assistantPrefix && finalText.indexOf(assistantPrefix) !== 0) {
        finalText = assistantPrefix + finalText;
      }

      var durationMs = Math.round(performance.now() - genStartTime);
      var streamTimeSec = firstTokenTime ? Math.max(0.05, (performance.now() - firstTokenTime) / 1000) : Math.max(0.05, durationMs / 1000);
      var finalSpeed = totalTokensGenerated > 0 ? (totalTokensGenerated / streamTimeSec) : 0;

      postMessage({
        type: 'generate-result',
        requestId: requestId,
        text: finalText,
        modelId: currentModelId,
        tokenCount: totalTokensGenerated,
        tokensPerSec: Math.round(finalSpeed * 10) / 10,
        durationMs: durationMs
      });
    } catch (err) {
      var errMsg = String(err && (err.message || err));
      var isOomErr = /out of memory|wasm-out-of-bounds|allocation failed|std::bad_alloc/i.test(errMsg);
      postMessage({
        type: 'generate-error',
        requestId: requestId,
        error: errMsg,
        oom: isOomErr
      });
    } finally {
      abortedRequests.delete(requestId);
    }
  }

  self.onmessage = function (e) {
    var data = e.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'init':
      case 'switch-model':
        loadModel(data.modelId, data.basePath).catch(function () {});
        break;

      case 'generate':
        handleGenerate(data);
        break;

      case 'abort':
        if (data.requestId) {
          abortedRequests.add(data.requestId);
        }
        break;

      case 'dispose':
        disposeCurrentGenerator().then(function () {
          postMessage({ type: 'disposed' });
        });
        break;
    }
  };
})();
