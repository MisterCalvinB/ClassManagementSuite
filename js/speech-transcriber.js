/**
 * js/speech-transcriber.js
 * Offline & Hybrid Speech-to-Text (Voice Recognition) Service
 * For Class Management Tools (Board & Visual Tools)
 */

(function (global) {
  'use strict';

  var state = 'idle'; // 'idle' | 'listening' | 'processing' | 'error'
  var audioStream = null;
  var audioCtx = null;
  var sourceNode = null;
  var processorNode = null;
  var worker = null;
  var recognition = null;
  var activeLanguage = 'auto'; // 'en' | 'fr' | 'de' | 'it' | 'auto'
  var isSpeechRecognitionActive = false;
  var currentTranscript = '';
  var interimTranscript = '';
  var silenceTimer = null;
  var fileTranscriptionCallbacks = {};

  var callbacks = {
    onStateChange: null,
    onInterimResult: null,
    onFinalResult: null,
    onMicLevel: null,
    onError: null
  };

  /**
   * Map short language codes to BCP 47 tags for Speech Recognition
   */
  var LANG_MAP = {
    'en': 'en-US',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'auto': ''
  };

  /**
   * Resolve best BCP-47 language tag based on active app language or override
   */
  function resolveLanguageTag(lang) {
    if (lang && LANG_MAP[lang]) return LANG_MAP[lang];
    if (lang && lang.length > 2) return lang;
    
    // Auto-detect from app i18n
    var appLang = 'fr';
    try {
      if (global.i18n && typeof global.i18n.getLanguage === 'function') {
        appLang = global.i18n.getLanguage();
      } else if (localStorage.getItem('cmt-lang-board')) {
        appLang = localStorage.getItem('cmt-lang-board');
      } else {
        var cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
        if (cfg.language) appLang = cfg.language;
      }
    } catch (_) {}

    return LANG_MAP[appLang] || 'fr-FR';
  }

  /**
   * Update internal state and fire callback
   */
  function setState(newState) {
    if (state === newState) return;
    state = newState;
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(state);
    }
  }

  /**
   * Initialize Web Worker for audio processing
   */
  function initWorker() {
    if (worker) return;
    try {
      try {
        worker = new Worker('../js/workers/speech-worker.js', { type: 'module' });
      } catch (_) {
        worker = new Worker('../js/workers/speech-worker.js');
      }

      worker.onmessage = function (e) {
        var data = e.data;
        if (!data) return;

        if (data.type === 'mic-level' && typeof callbacks.onMicLevel === 'function') {
          callbacks.onMicLevel(data.level);
        } else if (data.type === 'vad-state') {
          // Voice activity state updated
        } else if (data.type === 'transcribe-status') {
          if (data.status === 'processing') {
            setState('processing');
          } else if (data.status === 'listening') {
            if (state === 'processing') {
              setState('listening');
            }
          }
        } else if (data.type === 'worker-log') {
          console.log('[SpeechWorker]', data.message);
        } else if (data.type === 'model-ready') {
          console.log('[SpeechTranscriber] Whisper offline model ready');
        } else if (data.type === 'transcribe-result') {
          if (data.text) {
            if (currentTranscript) {
              currentTranscript += ' ' + data.text;
            } else {
              currentTranscript = data.text;
            }
            if (typeof callbacks.onFinalResult === 'function') {
              callbacks.onFinalResult(currentTranscript.trim(), data.text);
            }
            if (typeof callbacks.onInterimResult === 'function') {
              callbacks.onInterimResult(currentTranscript.trim(), data.text);
            }
          }
          if (state === 'processing') setState('listening');
        } else if (data.type === 'file-transcribe-progress') {
          var pCb = fileTranscriptionCallbacks[data.jobId];
          if (pCb && typeof pCb.onProgress === 'function') {
            pCb.onProgress({
              percent: data.percent,
              chunkIndex: data.chunkIndex,
              totalChunks: data.totalChunks,
              interimText: data.interimText
            });
          }
        } else if (data.type === 'file-transcribe-status') {
          var sCb = fileTranscriptionCallbacks[data.jobId];
          if (sCb && typeof sCb.onStatus === 'function') {
            sCb.onStatus(data.status);
          }
        } else if (data.type === 'file-transcribe-complete') {
          var cCb = fileTranscriptionCallbacks[data.jobId];
          if (cCb) {
            cCb.resolve({
              text: data.text,
              durationSec: data.durationSec || cCb.durationSec,
              language: data.language
            });
            delete fileTranscriptionCallbacks[data.jobId];
          }
        } else if (data.type === 'file-transcribe-error') {
          var eCb = fileTranscriptionCallbacks[data.jobId];
          if (eCb) {
            eCb.reject(new Error(data.error || 'Audio transcription failed'));
            delete fileTranscriptionCallbacks[data.jobId];
          }
        } else if (data.type === 'file-transcribe-cancelled') {
          var xCb = fileTranscriptionCallbacks[data.jobId];
          if (xCb) {
            xCb.reject(new Error('Audio transcription cancelled'));
            delete fileTranscriptionCallbacks[data.jobId];
          }
        }
      };

      worker.postMessage({ type: 'init', language: activeLanguage });
    } catch (err) {
      console.warn('[SpeechTranscriber] Web Worker initialization notice:', err);
    }
  }

  /**
   * Setup Web Speech Recognition API if available (browser online mode only)
   */
  function setupSpeechRecognition() {
    var isElectron = typeof window !== 'undefined' && (!!window.electronApi || navigator.userAgent.includes('Electron'));
    if (isElectron) {
      // In Electron desktop, always use 100% offline Web Worker and models
      return null;
    }

    var SpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      var sr = new SpeechRecognition();
      sr.continuous = true;
      sr.interimResults = true;
      sr.maxAlternatives = 1;
      sr.lang = resolveLanguageTag(activeLanguage);

      sr.onstart = function () {
        isSpeechRecognitionActive = true;
        setState('listening');
      };

      sr.onresult = function (event) {
        var interim = '';
        var finalChunk = '';

        for (var i = event.resultIndex; i < event.results.length; ++i) {
          var res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        if (finalChunk.trim()) {
          currentTranscript += finalChunk;
          if (typeof callbacks.onFinalResult === 'function') {
            callbacks.onFinalResult(currentTranscript.trim(), finalChunk.trim());
          }
        }

        interimTranscript = interim;
        if (typeof callbacks.onInterimResult === 'function') {
          var preview = (currentTranscript + ' ' + interim).trim();
          callbacks.onInterimResult(preview, interim);
        }
      };

      sr.onerror = function (event) {
        if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          // Cloud recognition unavailable: silently disable to let offline worker handle audio
          try { sr.stop(); } catch (_) {}
          isSpeechRecognitionActive = false;
          recognition = null;
          return;
        }
      };

      sr.onend = function () {
        isSpeechRecognitionActive = false;
      };

      return sr;
    } catch (err) {
      return null;
    }
  }

  /**
   * Start live microphone capture and speech recognition
   */
  async function start(options) {
    if (state === 'listening' || state === 'processing') return true;

    options = options || {};
    if (options.language) activeLanguage = options.language;
    currentTranscript = '';
    interimTranscript = '';

    initWorker();

    try {
      // 1. Request microphone stream
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // 2. Setup Web Audio API with AudioWorklet (or fallback to ScriptProcessor)
      var AudioContextClass = global.AudioContext || global.webkitAudioContext;
      audioCtx = new AudioContextClass();
      sourceNode = audioCtx.createMediaStreamSource(audioStream);

      function handleRawAudio(inputData) {
        if (state !== 'listening' && state !== 'processing') return;

        // Linear resampling to 16,000 Hz if necessary
        var sourceSampleRate = audioCtx.sampleRate;
        var targetSampleRate = 16000;
        var resampled;

        if (sourceSampleRate === targetSampleRate) {
          resampled = new Float32Array(inputData);
        } else {
          var ratio = sourceSampleRate / targetSampleRate;
          var newLength = Math.round(inputData.length / ratio);
          resampled = new Float32Array(newLength);
          for (var i = 0; i < newLength; i++) {
            var originIdx = Math.floor(i * ratio);
            resampled[i] = inputData[originIdx] || 0;
          }
        }

        // Calculate RMS for live meter
        var sum = 0;
        for (var j = 0; j < inputData.length; j += 4) {
          sum += inputData[j] * inputData[j];
        }
        var rms = Math.sqrt(sum / (inputData.length / 4));
        var level = Math.min(1, rms * 6);
        if (typeof callbacks.onMicLevel === 'function') {
          callbacks.onMicLevel(level);
        }

        // Send PCM chunk to worker
        if (worker) {
          worker.postMessage({ type: 'audio-chunk', chunk: resampled }, [resampled.buffer]);
        }
      }

      var workletLoaded = false;
      if (audioCtx.audioWorklet && typeof audioCtx.audioWorklet.addModule === 'function') {
        try {
          var workletCode = "class SpeechAudioProcessor extends AudioWorkletProcessor { process(inputs) { const input = inputs[0]; if (input && input[0]) { this.port.postMessage(input[0]); } return true; } } registerProcessor('speech-audio-processor', SpeechAudioProcessor);";
          var blob = new Blob([workletCode], { type: 'application/javascript' });
          var workletUrl = URL.createObjectURL(blob);
          await audioCtx.audioWorklet.addModule(workletUrl);
          processorNode = new AudioWorkletNode(audioCtx, 'speech-audio-processor');
          processorNode.port.onmessage = function (e) {
            handleRawAudio(e.data);
          };
          sourceNode.connect(processorNode);
          processorNode.connect(audioCtx.destination);
          workletLoaded = true;
          URL.revokeObjectURL(workletUrl);
        } catch (_) {
          workletLoaded = false;
        }
      }

      if (!workletLoaded) {
        processorNode = audioCtx.createScriptProcessor(4096, 1, 1);
        processorNode.onaudioprocess = function (e) {
          handleRawAudio(e.inputBuffer.getChannelData(0));
        };
        sourceNode.connect(processorNode);
        processorNode.connect(audioCtx.destination);
      }

      // 3. Start speech recognition engine
      recognition = setupSpeechRecognition();
      if (recognition) {
        try {
          recognition.start();
        } catch (srErr) {
          console.warn('[SpeechTranscriber] SR start notice:', srErr);
          setState('listening');
        }
      } else {
        setState('listening');
      }

      return true;
    } catch (err) {
      console.error('[SpeechTranscriber] Failed to start microphone:', err);
      setState('error');
      if (typeof callbacks.onError === 'function') {
        callbacks.onError(err.message || 'Microphone access failed');
      }
      stop();
      return false;
    }
  }

  /**
   * Stop speech recognition and release microphone resources
   */
  function stop() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }

    if (recognition) {
      try {
        recognition.stop();
      } catch (_) {}
      recognition = null;
    }

    if (processorNode) {
      try {
        processorNode.disconnect();
      } catch (_) {}
      processorNode = null;
    }

    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch (_) {}
      sourceNode = null;
    }

    if (audioCtx) {
      try {
        audioCtx.close();
      } catch (_) {}
      audioCtx = null;
    }

    if (audioStream) {
      try {
        audioStream.getTracks().forEach(function (track) { track.stop(); });
      } catch (_) {}
      audioStream = null;
    }

    if (worker) {
      worker.postMessage({ type: 'flush' });
    }

    if (typeof callbacks.onMicLevel === 'function') {
      callbacks.onMicLevel(0);
    }

    setState('idle');
    return currentTranscript.trim();
  }

  /**
   * Set speech recognition language
   */
  function setLanguage(lang) {
    activeLanguage = lang || 'auto';
    if (worker) {
      worker.postMessage({ type: 'set-language', language: activeLanguage });
    }
    if (recognition && state === 'listening') {
      recognition.lang = resolveLanguageTag(activeLanguage);
    }
  }

  /**
   * Register event callbacks
   */
  function on(eventName, fn) {
    if (callbacks.hasOwnProperty(eventName)) {
      callbacks[eventName] = fn;
    }
  }

  function reset() {
    currentTranscript = '';
    interimTranscript = '';
    if (worker) {
      worker.postMessage({ type: 'reset' });
    }
  }

  /**
   * Decode an Audio ArrayBuffer and resample to 16,000 Hz mono PCM Float32Array
   */
  async function decodeAudioToArrayBuffer(arrayBuffer) {
    var AudioCtxClass = global.AudioContext || global.webkitAudioContext;
    var OfflineCtxClass = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    if (!AudioCtxClass || !OfflineCtxClass) {
      throw new Error('Web Audio API is not supported in this environment');
    }

    var tempCtx = new AudioCtxClass();
    var decoded;
    try {
      decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      try { tempCtx.close(); } catch (_) {}
    }

    var targetSampleRate = 16000;
    var targetLength = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
    var offlineCtx = new OfflineCtxClass(1, targetLength, targetSampleRate);

    var source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    var rendered = await offlineCtx.startRendering();
    return {
      pcm: rendered.getChannelData(0),
      durationSec: decoded.duration
    };
  }

  /**
   * Transcribe an audio source (ArrayBuffer, Blob, File, or URL) offline via Whisper Web Worker
   */
  async function transcribeAudio(source, options) {
    initWorker();
    options = options || {};
    var jobId = 'stt_job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    var arrayBuffer;
    if (source instanceof ArrayBuffer) {
      arrayBuffer = source;
    } else if (source instanceof Blob) {
      arrayBuffer = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      if (source.indexOf('data:') === 0) {
        var base64Idx = source.indexOf(';base64,');
        if (base64Idx !== -1) {
          var b64Data = source.substring(base64Idx + 8);
          var binaryStr = atob(b64Data);
          var len = binaryStr.length;
          var bytes = new Uint8Array(len);
          for (var i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          var resp = await fetch(source);
          arrayBuffer = await resp.arrayBuffer();
        }
      } else {
        try {
          var resp = await fetch(source);
          arrayBuffer = await resp.arrayBuffer();
        } catch (fetchErr) {
          arrayBuffer = await new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', source, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
              if (xhr.status === 200 || (xhr.status === 0 && xhr.response)) {
                resolve(xhr.response);
              } else {
                reject(fetchErr || new Error('Failed to load audio from source'));
              }
            };
            xhr.onerror = function () {
              reject(fetchErr || new Error('Network error loading audio source'));
            };
            xhr.send();
          });
        }
      }
    } else if (source && typeof source.arrayBuffer === 'function') {
      arrayBuffer = await source.arrayBuffer();
    } else {
      throw new Error('Unsupported audio source format');
    }

    if (typeof options.onStatus === 'function') {
      options.onStatus('decoding');
    }

    var decoded = await decodeAudioToArrayBuffer(arrayBuffer);
    var pcm = decoded.pcm;

    return new Promise(function (resolve, reject) {
      fileTranscriptionCallbacks[jobId] = {
        resolve: resolve,
        reject: reject,
        onProgress: options.onProgress,
        onStatus: options.onStatus,
        durationSec: decoded.durationSec
      };

      if (!worker) {
        delete fileTranscriptionCallbacks[jobId];
        return reject(new Error('Speech recognition worker unavailable'));
      }

      worker.postMessage({
        type: 'transcribe-file',
        jobId: jobId,
        pcm: pcm,
        language: options.language || activeLanguage || 'auto'
      }, [pcm.buffer]);
    });
  }

  /**
   * Cancel an in-progress file transcription job
   */
  function cancelFileTranscription(jobId) {
    if (worker && jobId) {
      worker.postMessage({
        type: 'cancel-file-transcription',
        jobId: jobId
      });
    }
    if (fileTranscriptionCallbacks[jobId]) {
      fileTranscriptionCallbacks[jobId].reject(new Error('Transcription cancelled'));
      delete fileTranscriptionCallbacks[jobId];
    }
  }

  /**
   * Public API
   */
  global.SpeechTranscriber = {
    start: start,
    stop: stop,
    reset: reset,
    setLanguage: setLanguage,
    on: on,
    getState: function () { return state; },
    getTranscript: function () { return currentTranscript.trim(); },
    isSupported: function () {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    transcribeAudio: transcribeAudio,
    cancelFileTranscription: cancelFileTranscription,
    decodeAudioToArrayBuffer: decodeAudioToArrayBuffer
  };

})(typeof window !== 'undefined' ? window : this);
