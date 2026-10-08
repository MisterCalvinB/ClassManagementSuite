/**
 * js/media-converter-service.js
 * Unified Media Conversion & Processing Service for Class Management Tools.
 * Bridges Board (pages/board.html), Media Converter (pages/media-converter.html),
 * and Board Video Recorder with Hybrid Native FFmpeg and Web Audio fallback capabilities.
 */

(function (global) {
  'use strict';

  var MediaConverterService = {};
  var _cachedEngine = null;

  /**
   * Checks availability of the Native FFmpeg engine.
   * @returns {Promise<{hasNative: boolean, enginePath: string, isUserTools: boolean}>}
   */
  MediaConverterService.checkEngine = async function () {
    if (window.Desktop && typeof window.Desktop.mediaCheckEngine === 'function') {
      try {
        var res = await window.Desktop.mediaCheckEngine();
        if (res && res.ok) {
          _cachedEngine = res;
          return res;
        }
      } catch (_) {}
    }
    _cachedEngine = { hasNative: false, enginePath: '', isUserTools: false };
    return _cachedEngine;
  };

  /**
   * Returns cached engine status or probes if unknown.
   */
  MediaConverterService.getEngineStatus = function () {
    return _cachedEngine || { hasNative: false, enginePath: '', isUserTools: false };
  };

  /**
   * Inspects a media file for duration, resolution, codecs, and streams.
   * @param {string} inputPath - Absolute path to file (Desktop mode)
   * @returns {Promise<Object>}
   */
  MediaConverterService.probe = async function (inputPath) {
    if (window.Desktop && typeof window.Desktop.mediaProbe === 'function' && inputPath) {
      try {
        return await window.Desktop.mediaProbe({ inputPath: inputPath });
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    return { ok: false, error: 'Probe requires Desktop environment' };
  };

  /**
   * Converts a media file using Native FFmpeg or Web Audio API fallback.
   * @param {Object} options
   * @param {string} [options.inputPath]
   * @param {string} [options.outputPath]
   * @param {Blob|File} [options.inputFile]
   * @param {string} [options.format='mp4'] - 'mp4', 'mp3', 'wav', 'webm', 'webp'
   * @param {string} [options.resolution] - 'original', '1080p', '720p', '480p'
   * @param {string} [options.videoQuality='medium']
   * @param {string} [options.audioBitrate='192k']
   * @param {boolean} [options.normalize=false]
   * @param {number} [options.speed=1.0]
   * @param {number} [options.channels=0]
   * @param {number} [options.trimStart]
   * @param {number} [options.trimEnd]
   * @param {Function} [onProgress] - (data) => void
   * @returns {Promise<Object>}
   */
  MediaConverterService.convert = async function (options, onProgress) {
    options = options || {};
    var hasNative = (await MediaConverterService.checkEngine()).hasNative;

    // Desktop Native FFmpeg Path
    if (hasNative && window.Desktop && typeof window.Desktop.mediaConvert === 'function' && options.inputPath && options.outputPath) {
      var unregProgress = null;
      var jobId = 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (typeof onProgress === 'function' && typeof window.Desktop.onMediaProgress === 'function') {
        unregProgress = window.Desktop.onMediaProgress(function (data) {
          if (!data || data.jobId === jobId) {
            onProgress(data);
          }
        });
      }

      try {
        var req = Object.assign({}, options, { jobId: jobId });
        var result = await window.Desktop.mediaConvert(req);
        if (unregProgress) unregProgress();
        return result;
      } catch (err) {
        if (unregProgress) unregProgress();
        throw err;
      }
    }

    // Client-side Web Audio API / LameJS / Canvas Fallback
    return await MediaConverterService._convertClientSide(options, onProgress);
  };

  /**
   * Internal pure JavaScript & Web Audio API conversion fallback.
   */
  MediaConverterService._convertClientSide = async function (options, onProgress) {
    var format = (options.format || 'mp3').toLowerCase();
    var fileOrBlob = options.inputFile || null;

    if (!fileOrBlob && options.inputPath && window.Desktop && typeof window.Desktop.readByPath === 'function') {
      try {
        var bytes = await window.Desktop.readByPath(options.inputPath);
        if (bytes) {
          fileOrBlob = new Blob([bytes]);
        }
      } catch (_) {}
    }

    if (!fileOrBlob) {
      throw new Error('No input file or blob provided for client conversion.');
    }

    if (typeof onProgress === 'function') {
      onProgress({ percent: 10, message: 'Decoding audio buffer...' });
    }

    // Web Audio conversion (MP3 / WAV / WebM Audio)
    if (['mp3', 'wav', 'webm', 'ogg'].includes(format)) {
      var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) throw new Error('Web Audio API not supported in this environment.');
      var audioCtx = new AudioCtxClass();
      
      try {
        var arrayBuf = await fileOrBlob.arrayBuffer();
        var decodedBuffer = await audioCtx.decodeAudioData(arrayBuf);

        if (typeof onProgress === 'function') {
          onProgress({ percent: 40, message: 'Processing audio filters...' });
        }

        // Apply trimming if requested
        if (typeof options.trimStart === 'number' && typeof options.trimEnd === 'number' && options.trimEnd > options.trimStart) {
          if (global.MediaAudioEncoder && typeof global.MediaAudioEncoder.sliceBuffer === 'function') {
            decodedBuffer = global.MediaAudioEncoder.sliceBuffer(audioCtx, decodedBuffer, options.trimStart, options.trimEnd);
          }
        }

        // Apply speed adjustment
        if (options.speed && options.speed !== 1.0) {
          if (global.MediaAudioEncoder && typeof global.MediaAudioEncoder.changeSpeed === 'function') {
            decodedBuffer = await global.MediaAudioEncoder.changeSpeed(decodedBuffer, options.speed);
          }
        }

        // Apply loudness normalization
        if (options.normalize) {
          if (global.MediaAudioEncoder && typeof global.MediaAudioEncoder.normalizeBuffer === 'function') {
            decodedBuffer = global.MediaAudioEncoder.normalizeBuffer(decodedBuffer, 0.95);
          }
        }

        if (typeof onProgress === 'function') {
          onProgress({ percent: 70, message: 'Encoding output format (' + format.toUpperCase() + ')...' });
        }

        var outBlob = null;
        if (format === 'wav' && global.MediaAudioEncoder) {
          outBlob = global.MediaAudioEncoder.encodeWav(decodedBuffer, {
            channels: options.channels === 1 ? 1 : decodedBuffer.numberOfChannels
          });
        } else if (format === 'mp3' && global.MediaAudioEncoder && typeof global.MediaAudioEncoder.encodeMp3 === 'function') {
          outBlob = await global.MediaAudioEncoder.encodeMp3(decodedBuffer, {
            bitrate: parseInt(options.audioBitrate, 10) || 128,
            channels: options.channels === 1 ? 1 : decodedBuffer.numberOfChannels
          });
        } else {
          // Fallback to WAV
          outBlob = global.MediaAudioEncoder ? global.MediaAudioEncoder.encodeWav(decodedBuffer) : new Blob([arrayBuf], { type: 'audio/wav' });
        }

        if (typeof onProgress === 'function') {
          onProgress({ percent: 100, message: 'Completed' });
        }

        await audioCtx.close();
        return {
          ok: true,
          blob: outBlob,
          mimeType: outBlob.type,
          sizeBytes: outBlob.size
        };
      } catch (err) {
        try { await audioCtx.close(); } catch (_) {}
        throw err;
      }
    }

    // Video to Animated WebP fallback
    if (format === 'webp') {
      return await MediaConverterService.videoToAnimatedWebp(fileOrBlob, options, onProgress);
    }

    throw new Error('Format ' + format.toUpperCase() + ' requires Desktop Native Engine.');
  };

  /**
   * Converts a video file into an animated looping WebP or frames.
   */
  MediaConverterService.videoToAnimatedWebp = function (videoFileOrBlob, options, onProgress) {
    return new Promise(function (resolve, reject) {
      options = options || {};
      var video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      var url = URL.createObjectURL(videoFileOrBlob);
      video.src = url;

      video.onloadedmetadata = async function () {
        var dur = Math.min(10, video.duration || 3);
        var targetFps = options.fps || 12;
        var totalFrames = Math.floor(dur * targetFps);
        var interval = 1 / targetFps;

        var canvas = document.createElement('canvas');
        var maxDim = options.resolution === '720p' ? 720 : 480;
        var scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(64, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(64, Math.round(video.videoHeight * scale));
        var ctx = canvas.getContext('2d');

        var frames = [];
        for (var f = 0; f < totalFrames; f++) {
          video.currentTime = f * interval;
          await new Promise(function (res) { video.onseeked = res; });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          var frameBlob = await new Promise(function (res) {
            canvas.toBlob(res, 'image/webp', 0.8);
          });
          frames.push(frameBlob);

          if (typeof onProgress === 'function') {
            onProgress({ percent: Math.round((f / totalFrames) * 90), message: 'Extracting frames (' + (f + 1) + '/' + totalFrames + ')...' });
          }
        }

        URL.revokeObjectURL(url);
        if (typeof onProgress === 'function') onProgress({ percent: 100, message: 'Done' });

        // Return primary looping image blob
        resolve({
          ok: true,
          blob: frames[0] || videoFileOrBlob,
          frames: frames,
          mimeType: 'image/webp',
          sizeBytes: frames[0] ? frames[0].size : 0
        });
      };

      video.onerror = function (err) {
        URL.revokeObjectURL(url);
        reject(new Error('Video decoding failed: ' + (err.message || 'Unknown error')));
      };
    });
  };

  /**
   * Helper: Extracts audio track from a video/audio file or node.
   */
  MediaConverterService.extractAudio = async function (input, targetFormat, onProgress) {
    targetFormat = targetFormat || 'mp3';
    return await MediaConverterService.convert({
      inputPath: typeof input === 'string' ? input : undefined,
      inputFile: typeof input === 'object' ? input : undefined,
      format: targetFormat,
      audioBitrate: '192k',
      normalize: false
    }, onProgress);
  };

  /**
   * Helper: Generates a pedagogical slow-listening audio track (0.85x speed).
   */
  MediaConverterService.slowDownForListening = async function (input, speedRatio, onProgress) {
    speedRatio = speedRatio || 0.85;
    return await MediaConverterService.convert({
      inputPath: typeof input === 'string' ? input : undefined,
      inputFile: typeof input === 'object' ? input : undefined,
      format: 'mp3',
      speed: speedRatio,
      normalize: true,
      audioBitrate: '128k'
    }, onProgress);
  };

  /**
   * Helper: Normalizes and boosts speech volume.
   */
  MediaConverterService.normalizeVoice = async function (input, onProgress) {
    return await MediaConverterService.convert({
      inputPath: typeof input === 'string' ? input : undefined,
      inputFile: typeof input === 'object' ? input : undefined,
      format: 'mp3',
      normalize: true,
      channels: 1,
      audioBitrate: '192k'
    }, onProgress);
  };

  /**
   * Launches the Media Converter tool window with optional preselected file.
   */
  MediaConverterService.openMediaConverter = function (filePath) {
    var cleanPath = (typeof filePath === 'string') ? filePath.trim() : '';
    if (window.Desktop && typeof window.Desktop.openTool === 'function') {
      window.Desktop.openTool('media-converter.html', cleanPath ? { query: { input: cleanPath } } : {});
    } else {
      var url = 'media-converter.html';
      if (cleanPath) {
        url += '?input=' + encodeURIComponent(cleanPath);
      }
      window.open(url, '_blank');
    }
  };

  global.MediaConverterService = MediaConverterService;

})(typeof window !== 'undefined' ? window : this);
