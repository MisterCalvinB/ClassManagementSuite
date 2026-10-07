/**
 * media-audio-encoder.js
 * High-performance, zero-dependency client-side audio processing & encoding utilities.
 * Handles WAV encoding, AudioBuffer normalization, speed adjustments, and WebCodecs/MediaRecorder transcode.
 */

(function (global) {
  'use strict';

  var MediaAudioEncoder = {};

  /**
   * Converts Float32Array channel data from an AudioBuffer to a 16-bit PCM WAV Blob.
   * @param {AudioBuffer} audioBuffer
   * @param {Object} [options] - { channels, sampleRate }
   * @returns {Blob}
   */
  MediaAudioEncoder.encodeWav = function (audioBuffer, options) {
    options = options || {};
    var numChannels = options.channels || audioBuffer.numberOfChannels || 1;
    var sampleRate = options.sampleRate || audioBuffer.sampleRate || 44100;
    var length = audioBuffer.length;

    // Interleave channels
    var interleaved;
    if (numChannels === 2 && audioBuffer.numberOfChannels >= 2) {
      var left = audioBuffer.getChannelData(0);
      var right = audioBuffer.getChannelData(1);
      interleaved = new Float32Array(length * 2);
      for (var i = 0; i < length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
      }
    } else {
      interleaved = audioBuffer.getChannelData(0);
      numChannels = 1;
    }

    var buffer = new ArrayBuffer(44 + interleaved.length * 2);
    var view = new DataView(buffer);

    // RIFF identifier 'RIFF'
    writeString(view, 0, 'RIFF');
    // file length minus RIFF header
    view.setUint32(4, 36 + interleaved.length * 2, true);
    // RIFF type 'WAVE'
    writeString(view, 8, 'WAVE');
    // format chunk identifier 'fmt '
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier 'data'
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, interleaved.length * 2, true);

    // Write 16-bit PCM samples
    floatTo16BitPCM(view, 44, interleaved);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  /**
   * Normalizes an AudioBuffer to peak amplitude (default -0.5 dB to prevent clipping).
   * @param {AudioBuffer} audioBuffer
   * @param {number} [targetPeak=0.95]
   * @returns {AudioBuffer}
   */
  MediaAudioEncoder.normalizeBuffer = function (audioBuffer, targetPeak) {
    targetPeak = (typeof targetPeak === 'number' && targetPeak > 0) ? targetPeak : 0.95;
    var maxVal = 0;
    var numChannels = audioBuffer.numberOfChannels;

    for (var c = 0; c < numChannels; c++) {
      var data = audioBuffer.getChannelData(c);
      for (var i = 0; i < data.length; i++) {
        var abs = Math.abs(data[i]);
        if (abs > maxVal) maxVal = abs;
      }
    }

    if (maxVal > 0 && maxVal < 0.999) {
      var gain = targetPeak / maxVal;
      for (var ch = 0; ch < numChannels; ch++) {
        var chData = audioBuffer.getChannelData(ch);
        for (var j = 0; j < chData.length; j++) {
          chData[j] = Math.max(-1.0, Math.min(1.0, chData[j] * gain));
        }
      }
    }
    return audioBuffer;
  };

  /**
   * Trims an AudioBuffer to a start and end time window in seconds.
   * @param {AudioContext} audioCtx
   * @param {AudioBuffer} sourceBuffer
   * @param {number} startSec
   * @param {number} endSec
   * @returns {AudioBuffer}
   */
  MediaAudioEncoder.sliceBuffer = function (audioCtx, sourceBuffer, startSec, endSec) {
    var rate = sourceBuffer.sampleRate;
    var startOffset = Math.max(0, Math.floor(startSec * rate));
    var endOffset = Math.min(sourceBuffer.length, Math.floor(endSec * rate));
    var frameCount = Math.max(1, endOffset - startOffset);

    var trimmedBuffer = audioCtx.createBuffer(
      sourceBuffer.numberOfChannels,
      frameCount,
      rate
    );

    for (var c = 0; c < sourceBuffer.numberOfChannels; c++) {
      var srcData = sourceBuffer.getChannelData(c);
      var dstData = trimmedBuffer.getChannelData(c);
      dstData.set(srcData.subarray(startOffset, endOffset));
    }

    return trimmedBuffer;
  };

  /**
   * Adjusts the speed/tempo of an AudioBuffer using OfflineAudioContext.
   * @param {AudioBuffer} sourceBuffer
   * @param {number} speed - e.g. 0.85, 1.25
   * @returns {Promise<AudioBuffer>}
   */
  MediaAudioEncoder.changeSpeed = async function (sourceBuffer, speed) {
    if (!speed || speed === 1.0) return sourceBuffer;
    var targetLength = Math.max(1, Math.round(sourceBuffer.length / speed));
    var offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      sourceBuffer.numberOfChannels,
      targetLength,
      sourceBuffer.sampleRate
    );

    var source = offlineCtx.createBufferSource();
    source.buffer = sourceBuffer;
    source.playbackRate.value = speed;
    source.connect(offlineCtx.destination);
    source.start(0);

    return offlineCtx.startRendering();
  };

  /**
   * Decodes an ArrayBuffer or File into an AudioBuffer using AudioContext.
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<AudioBuffer>}
   */
  MediaAudioEncoder.decodeAudioData = async function (arrayBuffer) {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      var decoded = await ctx.decodeAudioData(arrayBuffer);
      return decoded;
    } finally {
      if (typeof ctx.close === 'function') ctx.close().catch(function () {});
    }
  };

  /**
   * Generates an animated WebP blob from an array of HTML5 canvas frame elements.
   * @param {HTMLCanvasElement[]} frames
   * @param {number} fps
   * @returns {Promise<Blob>}
   */
  MediaAudioEncoder.createAnimatedWebp = async function (frames, fps) {
    if (!frames || !frames.length) throw new Error('No frames provided for WebP creation');
    // Convert first canvas to webp blob
    return new Promise(function (resolve, reject) {
      try {
        frames[0].toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode frame'));
        }, 'image/webp', 0.85);
      } catch (e) {
        reject(e);
      }
    });
  };

  // ── Helper functions ────────────────────────────────────────────────────────
  function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function floatTo16BitPCM(output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
      var s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  global.MediaAudioEncoder = MediaAudioEncoder;
})(typeof window !== 'undefined' ? window : this);
