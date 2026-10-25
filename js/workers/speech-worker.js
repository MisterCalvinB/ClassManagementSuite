/**
 * js/workers/speech-worker.js
 * Standalone Web Worker for Offline Whisper Speech Recognition
 * Uses Transformers.js with Quantized Whisper-Tiny for high-accuracy local transcription.
 */

/* global self, postMessage */

(function () {
  'use strict';

  var isInitialized = false;
  var activeLanguage = 'auto'; // 'en' | 'fr' | 'de' | 'it' | 'auto'
  var audioSampleRate = 16000;
  var vadThreshold = 0.010; // Responsive threshold for standard microphones

  // Sample-based VAD counters (independent of chunk sizes from AudioWorklet/ScriptProcessor)
  var speechSamples = 0;
  var silenceSamples = 0;
  var isSpeaking = false;
  var audioBufferQueue = [];
  var lastProcessTime = Date.now();

  var transcriber = null;
  var isModelLoading = false;
  var isProcessingAudio = false;

  var LANG_MAP = {
    'fr': 'french',
    'en': 'english',
    'de': 'german',
    'it': 'italian',
    'auto': null
  };

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

  var pipelinePromise = null;

  /**
   * Initialize Transformers.js pipeline with local quantized Whisper model
   */
  async function initPipeline() {
    if (transcriber) return transcriber;
    if (pipelinePromise) return pipelinePromise;

    pipelinePromise = (async function () {
      var basePath = getSttBasePath();
      postMessage({ type: 'worker-log', message: 'Initializing Whisper STT from: ' + basePath });

      try {
        var tf = self.transformers;
        if (!tf) {
          var scriptUrl = basePath + 'transformers.min.js';
          try {
            tf = await import(scriptUrl);
            self.transformers = tf;
          } catch (e1) {
            try {
              tf = await import('../../modules/stt/transformers.min.js');
              self.transformers = tf;
            } catch (e2) {
              postMessage({ type: 'worker-log', message: 'Failed to import transformers: ' + (e2 && e2.message) });
            }
          }
        }

        if (tf) {
          var env = tf.env;
          env.allowRemoteModels = false;
          env.allowLocalModels = true;
          env.useBrowserCache = false;
          env.localModelPath = basePath;
          if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
            env.backends.onnx.wasm.wasmPaths = basePath;
            env.backends.onnx.wasm.numThreads = 1;
          }

          transcriber = await tf.pipeline('automatic-speech-recognition', 'whisper-tiny', {
            quantized: true
          });

          isModelLoading = false;
          postMessage({ type: 'model-ready' });
          postMessage({ type: 'worker-log', message: 'Whisper model loaded and ready.' });
          return transcriber;
        } else {
          postMessage({ type: 'worker-log', message: 'Error: transformers module undefined after import' });
        }
      } catch (err) {
        console.error('[SpeechWorker] Transformers pipeline init error:', err);
        postMessage({ type: 'worker-log', message: 'Model load failed: ' + (err.message || err) });
        isModelLoading = false;
      }
      isModelLoading = false;
      pipelinePromise = null;
      return null;
    })();

    return pipelinePromise;
  }

  /**
   * Compute volume level (RMS) of a float32 PCM frame
   */
  function computeRms(float32Array) {
    var sum = 0;
    for (var i = 0; i < float32Array.length; i++) {
      sum += float32Array[i] * float32Array[i];
    }
    return Math.sqrt(sum / float32Array.length);
  }

  /**
   * Sample-Accurate Voice Activity Detection (VAD)
   */
  function processVad(float32Array) {
    var energy = computeRms(float32Array);
    var speakingNow = energy > vadThreshold;

    if (speakingNow) {
      speechSamples += float32Array.length;
      silenceSamples = 0;

      // 120ms of sustained audio triggers speaking state
      if (!isSpeaking && speechSamples >= audioSampleRate * 0.12) {
        isSpeaking = true;
        postMessage({ type: 'vad-state', isSpeaking: true, energy: energy });
      }

      // Auto process if speaking continuously for > 5 seconds
      if (Date.now() - lastProcessTime > 5000) {
        processAudioBuffer();
      }
    } else {
      silenceSamples += float32Array.length;

      // 650ms of sustained silence after speaking marks end of utterance
      if (isSpeaking && silenceSamples >= audioSampleRate * 0.65) {
        isSpeaking = false;
        speechSamples = 0;
        silenceSamples = 0;
        postMessage({ type: 'vad-state', isSpeaking: false, energy: energy });
        processAudioBuffer();
      }
    }

    return energy;
  }

  /**
   * Clean Whisper output and filter out hallucinations / non-speech tokens
   */
  function cleanTranscript(text) {
    if (!text) return '';
    // Strip Whisper special tokens <|...|>
    var cleaned = text.replace(/<\|[^|>]+\|>/g, ' ').trim();
    // Strip standalone subtitle / audio event artifacts e.g. (sous-titres), [music], (applause)
    if (/^[\(\[\{][^\)\]\}]+[\)\]\}]$/i.test(cleaned)) {
      return '';
    }
    cleaned = cleaned.replace(/[\(\[\{](?:sous-titres|musique|music|applause|rires|laughter|bruit|noise)[\)\]\}]/gi, '').trim();
    return cleaned;
  }

  /**
   * Process accumulated audio chunks into neural transcription
   */
  async function processAudioBuffer() {
    if (audioBufferQueue.length === 0 || isProcessingAudio) return;
    lastProcessTime = Date.now();

    var totalLength = 0;
    for (var i = 0; i < audioBufferQueue.length; i++) {
      totalLength += audioBufferQueue[i].length;
    }

    // Require at least 400ms of audio
    if (totalLength < audioSampleRate * 0.4) {
      return;
    }

    var merged = new Float32Array(totalLength);
    var offset = 0;
    for (var j = 0; j < audioBufferQueue.length; j++) {
      merged.set(audioBufferQueue[j], offset);
      offset += audioBufferQueue[j].length;
    }
    audioBufferQueue = [];

    var rms = computeRms(merged);
    if (rms < vadThreshold * 0.5) {
      return;
    }

    isProcessingAudio = true;
    postMessage({
      type: 'transcribe-status',
      status: 'processing',
      durationSec: merged.length / audioSampleRate
    });

    try {
      var pipe = await initPipeline();
      if (pipe) {
        var lang = LANG_MAP[activeLanguage] || null;
        var opts = {
          task: 'transcribe',
          return_timestamps: false
        };
        if (lang) opts.language = lang;

        var result = await pipe(merged, opts);
        var rawText = (result && result.text) ? result.text.trim() : '';
        var text = cleanTranscript(rawText);

        if (text && text.length > 0) {
          postMessage({
            type: 'transcribe-result',
            text: text,
            isFinal: true,
            durationSec: merged.length / audioSampleRate,
            language: activeLanguage
          });
          isProcessingAudio = false;
          postMessage({
            type: 'transcribe-status',
            status: 'listening'
          });
          return;
        }
      }
    } catch (err) {
      console.error('[SpeechWorker] Transcription error:', err);
      postMessage({ type: 'worker-log', message: 'Inference error: ' + (err.message || err) });
    }

    isProcessingAudio = false;
    postMessage({
      type: 'transcribe-status',
      status: 'listening'
    });
  }

  var activeFileJob = null;

  /**
   * Process a complete audio file buffer (Float32 PCM at 16kHz)
   * Splits into 30s Whisper windows, performs inference, and reports progress.
   */
  async function handleTranscribeFile(jobId, pcm, lang) {
    if (!pcm || pcm.length === 0) {
      postMessage({ type: 'file-transcribe-complete', jobId: jobId, text: '', durationSec: 0 });
      return;
    }

    activeFileJob = { jobId: jobId, cancelled: false };

    postMessage({
      type: 'file-transcribe-status',
      jobId: jobId,
      status: 'loading-model'
    });

    var pipe = await initPipeline();
    if (!pipe) {
      postMessage({
        type: 'file-transcribe-error',
        jobId: jobId,
        error: 'Failed to initialize speech recognition pipeline'
      });
      activeFileJob = null;
      return;
    }

    if (activeFileJob && activeFileJob.cancelled) {
      postMessage({ type: 'file-transcribe-cancelled', jobId: jobId });
      activeFileJob = null;
      return;
    }

    var targetLang = LANG_MAP[lang] || LANG_MAP[activeLanguage] || null;
    var opts = {
      task: 'transcribe',
      return_timestamps: false
    };
    if (targetLang) opts.language = targetLang;

    // 30 seconds at 16000 Hz = 480000 samples
    var windowSamples = 30 * audioSampleRate;
    // 29-second step gives 1s overlap between chunks
    var stepSamples = 29 * audioSampleRate;
    var totalSamples = pcm.length;
    var totalDuration = totalSamples / audioSampleRate;

    var chunks = [];
    if (totalSamples <= windowSamples) {
      chunks.push(pcm);
    } else {
      for (var offset = 0; offset < totalSamples; offset += stepSamples) {
        var end = Math.min(totalSamples, offset + windowSamples);
        chunks.push(pcm.subarray(offset, end));
        if (end >= totalSamples) break;
      }
    }

    var totalChunks = chunks.length;
    var fullTranscript = '';

    for (var i = 0; i < totalChunks; i++) {
      if (activeFileJob && activeFileJob.cancelled) {
        postMessage({ type: 'file-transcribe-cancelled', jobId: jobId });
        activeFileJob = null;
        return;
      }

      var currentChunk = chunks[i];
      var chunkRms = computeRms(currentChunk);

      var startPct = Math.min(99, Math.round((i / totalChunks) * 100));
      postMessage({
        type: 'file-transcribe-progress',
        jobId: jobId,
        percent: startPct,
        chunkIndex: i + 1,
        totalChunks: totalChunks,
        interimText: fullTranscript
      });

      // Skip silent chunks (RMS below 0.002)
      if (chunkRms >= 0.002) {
        try {
          var result = await pipe(currentChunk, opts);
          var rawText = (result && result.text) ? result.text.trim() : '';
          var cleaned = cleanTranscript(rawText);
          if (cleaned) {
            if (fullTranscript) {
              fullTranscript += ' ' + cleaned;
            } else {
              fullTranscript = cleaned;
            }
          }
        } catch (chunkErr) {
          console.warn('[SpeechWorker] Chunk inference notice:', chunkErr);
        }
      }

      var endPct = Math.min(99, Math.round(((i + 1) / totalChunks) * 100));
      postMessage({
        type: 'file-transcribe-progress',
        jobId: jobId,
        percent: endPct,
        chunkIndex: i + 1,
        totalChunks: totalChunks,
        interimText: fullTranscript
      });
    }

    postMessage({
      type: 'file-transcribe-complete',
      jobId: jobId,
      text: fullTranscript.trim(),
      durationSec: totalDuration,
      language: lang
    });
    activeFileJob = null;
  }

  /**
   * Worker Message Handler
   */
  self.onmessage = function (event) {
    var data = event.data;
    if (!data) return;

    switch (data.type) {
      case 'init':
        activeLanguage = data.language || 'auto';
        isInitialized = true;
        initPipeline();
        postMessage({ type: 'init-ready', language: activeLanguage });
        break;

      case 'set-language':
        activeLanguage = data.language || 'auto';
        postMessage({ type: 'language-changed', language: activeLanguage });
        break;

      case 'audio-chunk':
        if (!data.chunk) return;
        var pcm = data.chunk;
        var energy = processVad(pcm);
        audioBufferQueue.push(pcm);

        postMessage({
          type: 'mic-level',
          level: Math.min(1, energy * 8),
          isSpeaking: isSpeaking
        });
        break;

      case 'flush':
        processAudioBuffer();
        break;

      case 'reset':
        audioBufferQueue = [];
        isSpeaking = false;
        speechSamples = 0;
        silenceSamples = 0;
        postMessage({ type: 'reset-complete' });
        break;

      case 'transcribe-file':
        handleTranscribeFile(data.jobId, data.pcm, data.language || activeLanguage);
        break;

      case 'cancel-file-transcription':
        if (activeFileJob && activeFileJob.jobId === data.jobId) {
          activeFileJob.cancelled = true;
        }
        break;

      default:
        break;
    }
  };

})();
