/**
 * js/board-recorder.js
 * Independent Live Screen/Board Video + Microphone Recording Module
 * For Class Management Tools (Board tool)
 */
(function (global) {
  'use strict';

  var state = 'idle'; // 'idle' | 'recording' | 'paused'
  var mediaRecorder = null;
  var combinedStream = null;
  var videoStream = null;
  var micStream = null;
  var recordedChunks = [];
  var startTime = 0;
  var pausedTime = 0;
  var totalPausedDuration = 0;
  var timerInterval = null;
  var currentBlob = null;
  var currentBlobUrl = null;

  // Web Audio for VU Meter
  var audioCtx = null;
  var analyserNode = null;
  var micLevelRaf = null;

  // Standalone mic testing (for setup dialog)
  var testMicStream = null;
  var testAudioCtx = null;
  var testAnalyser = null;
  var testRaf = null;

  // Callbacks
  var callbacks = {
    onTick: null,
    onMicLevel: null,
    onStateChange: null,
    onError: null
  };

  /**
   * Helper: Format milliseconds to mm:ss or hh:mm:ss
   */
  function formatDuration(ms) {
    var totalSec = Math.floor(Math.max(0, ms) / 1000);
    var hrs = Math.floor(totalSec / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    var sStr = String(secs).padStart(2, '0');
    var mStr = String(mins).padStart(2, '0');
    if (hrs > 0) {
      return hrs + ':' + mStr + ':' + sStr;
    }
    return mStr + ':' + sStr;
  }

  /**
   * Helper: Pick best supported MIME type
   */
  function getPreferredMimeType() {
    var types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];
    for (var i = 0; i < types.length; i++) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(types[i])) {
        return types[i];
      }
    }
    return 'video/webm';
  }

  /**
   * Enumerate connected audio input devices
   */
  async function getAudioDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      // Request initial permission prompt if needed to get labels
      try {
        var tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(function (t) { t.stop(); });
      } catch (_) { }

      var devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(function (d) { return d.kind === 'audioinput'; }).map(function (d, idx) {
        return {
          deviceId: d.deviceId,
          label: d.label || ('Microphone ' + (idx + 1)),
          groupId: d.groupId
        };
      });
    } catch (e) {
      console.warn('[BoardRecorder] getAudioDevices error:', e);
      return [];
    }
  }

  /**
   * Test microphone volume in pre-flight setup modal
   */
  async function startMicrophoneTest(deviceId, onLevel) {
    stopMicrophoneTest();
    try {
      var constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      testMicStream = await navigator.mediaDevices.getUserMedia(constraints);
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      testAudioCtx = new AudioContextClass();
      testAnalyser = testAudioCtx.createAnalyser();
      testAnalyser.fftSize = 256;
      testAnalyser.smoothingTimeConstant = 0.4;

      var src = testAudioCtx.createMediaStreamSource(testMicStream);
      src.connect(testAnalyser);

      var dataArr = new Uint8Array(testAnalyser.frequencyBinCount);
      function loop() {
        if (!testAnalyser) return;
        testAnalyser.getByteFrequencyData(dataArr);
        var sum = 0;
        for (var i = 0; i < dataArr.length; i++) sum += dataArr[i];
        var avg = sum / dataArr.length;
        var pct = Math.min(100, Math.round((avg / 128) * 150));
        if (typeof onLevel === 'function') onLevel(pct);
        testRaf = requestAnimationFrame(loop);
      }
      loop();
    } catch (err) {
      console.warn('[BoardRecorder] startMicrophoneTest failed:', err);
      if (typeof onLevel === 'function') onLevel(0);
    }
  }

  function stopMicrophoneTest() {
    if (testRaf) { cancelAnimationFrame(testRaf); testRaf = null; }
    if (testMicStream) {
      testMicStream.getTracks().forEach(function (t) { t.stop(); });
      testMicStream = null;
    }
    if (testAudioCtx) {
      try { testAudioCtx.close(); } catch (_) { }
      testAudioCtx = null;
    }
    testAnalyser = null;
  }

  /**
   * Start Live Recording of Board + Voice
   * @param {Object} options
   *   options.micDeviceId {string|null} - deviceId of chosen microphone or 'none' / null
   *   options.videoSourceId {string|null} - Electron window/screen sourceId (optional)
   *   options.onTick {function(elapsedMs, formattedStr)}
   *   options.onMicLevel {function(pct)}
   *   options.onStateChange {function(state)}
   *   options.onError {function(error)}
   */
  async function startRecording(options) {
    if (state !== 'idle') {
      throw new Error('Recorder is already ' + state);
    }
    options = options || {};
    callbacks.onTick = options.onTick || null;
    callbacks.onMicLevel = options.onMicLevel || null;
    callbacks.onStateChange = options.onStateChange || null;
    callbacks.onError = options.onError || null;

    stopMicrophoneTest(); // Ensure pre-flight test stream is released

    recordedChunks = [];
    currentBlob = null;
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch (_) { }
      currentBlobUrl = null;
    }

    try {
      var targetFps = Math.max(1, Math.min(60, parseInt(options.fps, 10) || 30));

      // 1. Acquire Video Stream
      if (options.videoSourceId && navigator.mediaDevices.getUserMedia) {
        // Direct desktopCapturer source in Electron
        videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: options.videoSourceId,
              maxFrameRate: targetFps
            }
          }
        });
      } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // Universal DisplayMedia
        videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'window',
            frameRate: { ideal: targetFps, max: targetFps }
          },
          audio: false
        });
      } else {
        throw new Error('Screen capture is not supported in this environment.');
      }

      // Handle user cancelling screen capture via browser banner
      var videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = function () {
          if (state === 'recording' || state === 'paused') {
            stopRecording();
          }
        };
      }

      // 2. Acquire Audio Stream (Microphone)
      var audioTracks = [];
      if (options.micDeviceId && options.micDeviceId !== 'none') {
        try {
          var audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          };
          if (options.micDeviceId !== 'default') {
            audioConstraints.deviceId = { exact: options.micDeviceId };
          }
          micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
          audioTracks = micStream.getAudioTracks();

          // Setup AudioContext for real-time VU Meter
          var AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 256;
            analyserNode.smoothingTimeConstant = 0.3;
            var micSource = audioCtx.createMediaStreamSource(micStream);
            micSource.connect(analyserNode);

            var dataArr = new Uint8Array(analyserNode.frequencyBinCount);
            var updateMicMeter = function () {
              if (state !== 'recording' && state !== 'paused') return;
              if (state === 'paused') {
                if (callbacks.onMicLevel) callbacks.onMicLevel(0);
              } else if (analyserNode) {
                analyserNode.getByteFrequencyData(dataArr);
                var sum = 0;
                for (var i = 0; i < dataArr.length; i++) sum += dataArr[i];
                var avg = sum / dataArr.length;
                var pct = Math.min(100, Math.round((avg / 128) * 150));
                if (callbacks.onMicLevel) callbacks.onMicLevel(pct);
              }
              micLevelRaf = requestAnimationFrame(updateMicMeter);
            };
            updateMicMeter();
          }
        } catch (micErr) {
          console.warn('[BoardRecorder] Microphone capture failed, continuing video only:', micErr);
          if (callbacks.onError) callbacks.onError('Microphone unavailable: ' + (micErr.message || micErr));
        }
      }

      // 3. Assemble Combined MediaStream
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioTracks
      ]);

      // 4. Initialize MediaRecorder with dynamic bitrate proportional to FPS
      var mimeType = getPreferredMimeType();
      var videoBits = Math.max(400000, Math.min(4000000, Math.round(targetFps * 80000)));
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBits
      });

      mediaRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onerror = function (e) {
        console.error('[BoardRecorder] MediaRecorder error:', e);
        if (callbacks.onError) callbacks.onError(e.error ? e.error.message : 'MediaRecorder error');
      };

      // 5. Start Recording
      mediaRecorder.start(1000); // 1-second chunks for safety

      state = 'recording';
      startTime = Date.now();
      pausedTime = 0;
      totalPausedDuration = 0;

      if (callbacks.onStateChange) callbacks.onStateChange(state);

      // Start elapsed timer loop
      clearInterval(timerInterval);
      timerInterval = setInterval(function () {
        if (state === 'recording') {
          var now = Date.now();
          var elapsed = (now - startTime) - totalPausedDuration;
          if (callbacks.onTick) callbacks.onTick(elapsed, formatDuration(elapsed));
        }
      }, 200);

      return { ok: true, mimeType: mimeType };
    } catch (err) {
      _cleanupStreams();
      state = 'idle';
      if (callbacks.onStateChange) callbacks.onStateChange(state);
      throw err;
    }
  }

  /**
   * Pause active recording
   */
  function pauseRecording() {
    if (state !== 'recording' || !mediaRecorder) return;
    try {
      mediaRecorder.pause();
      state = 'paused';
      pausedTime = Date.now();
      if (callbacks.onStateChange) callbacks.onStateChange(state);
    } catch (e) {
      console.warn('[BoardRecorder] pauseRecording failed:', e);
    }
  }

  /**
   * Resume paused recording
   */
  function resumeRecording() {
    if (state !== 'paused' || !mediaRecorder) return;
    try {
      mediaRecorder.resume();
      if (pausedTime > 0) {
        totalPausedDuration += (Date.now() - pausedTime);
        pausedTime = 0;
      }
      state = 'recording';
      if (callbacks.onStateChange) callbacks.onStateChange(state);
    } catch (e) {
      console.warn('[BoardRecorder] resumeRecording failed:', e);
    }
  }

  /**
   * Stop recording & assemble video result
   */
  function stopRecording() {
    return new Promise(function (resolve, reject) {
      if (state === 'idle' || !mediaRecorder) {
        return resolve(null);
      }

      var finalDuration = (Date.now() - startTime) - totalPausedDuration;
      clearInterval(timerInterval);
      timerInterval = null;

      if (micLevelRaf) { cancelAnimationFrame(micLevelRaf); micLevelRaf = null; }

      mediaRecorder.onstop = function () {
        try {
          var mimeType = mediaRecorder.mimeType || getPreferredMimeType();
          currentBlob = new Blob(recordedChunks, { type: mimeType });
          currentBlobUrl = URL.createObjectURL(currentBlob);

          _cleanupStreams();
          state = 'idle';
          if (callbacks.onStateChange) callbacks.onStateChange(state);
          if (callbacks.onMicLevel) callbacks.onMicLevel(0);

          resolve({
            ok: true,
            blob: currentBlob,
            url: currentBlobUrl,
            durationMs: Math.max(0, finalDuration),
            durationFormatted: formatDuration(finalDuration),
            sizeBytes: currentBlob.size,
            mimeType: mimeType
          });
        } catch (err) {
          _cleanupStreams();
          state = 'idle';
          if (callbacks.onStateChange) callbacks.onStateChange(state);
          reject(err);
        }
      };

      try {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        } else {
          mediaRecorder.onstop();
        }
      } catch (err) {
        _cleanupStreams();
        state = 'idle';
        if (callbacks.onStateChange) callbacks.onStateChange(state);
        reject(err);
      }
    });
  }

  /**
   * Clean up all media tracks and audio contexts
   */
  function _cleanupStreams() {
    if (combinedStream) {
      combinedStream.getTracks().forEach(function (t) { try { t.stop(); } catch (_) { } });
      combinedStream = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(function (t) { try { t.stop(); } catch (_) { } });
      videoStream = null;
    }
    if (micStream) {
      micStream.getTracks().forEach(function (t) { try { t.stop(); } catch (_) { } });
      micStream = null;
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (_) { }
      audioCtx = null;
    }
    analyserNode = null;
  }

  /**
   * Discard the current recording and revoke Object URLs
   */
  function discardRecording() {
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch (_) { }
      currentBlobUrl = null;
    }
    currentBlob = null;
    recordedChunks = [];
  }

  /**
   * Helper: Human-readable file size
   */
  function formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // =========================================================================
  // UI Bridge & Modal Controllers
  // =========================================================================
  var currentRecordingResult = null;

  function notify(msg, isError) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, !!isError);
    } else if (typeof window.mdbToast === 'function') {
      window.mdbToast(msg);
    }
  }

  async function askConfirm(msg) {
    if (typeof window.showConfirm === 'function') {
      return await window.showConfirm(msg);
    }
    return window.confirm(msg);
  }

  global.boardVideoOpenSetup = async function () {
    var overlay = document.getElementById('board-rec-setup-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    var micSelect = document.getElementById('board-rec-mic-select');
    if (micSelect) {
      micSelect.innerHTML = '<option value="default">Default Microphone</option><option value="none">No Microphone (Video only)</option>';
      try {
        var devs = await getAudioDevices();
        if (devs && devs.length > 0) {
          micSelect.innerHTML = '';
          devs.forEach(function (d) {
            var opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || 'Microphone';
            micSelect.appendChild(opt);
          });
          var noneOpt = document.createElement('option');
          noneOpt.value = 'none';
          noneOpt.textContent = 'No Microphone (Video only)';
          micSelect.appendChild(noneOpt);
        }
      } catch (_) {}
    }

    boardVideoOnMicSelectChange();

    // Restore saved FPS setting
    var fpsSelect = document.getElementById('board-rec-fps-select');
    var fpsCustomWrap = document.getElementById('board-rec-fps-custom-wrap');
    var fpsCustomInput = document.getElementById('board-rec-fps-custom-input');
    if (fpsSelect) {
      try {
        var savedFps = localStorage.getItem('board_rec_fps');
        if (savedFps) {
          if (savedFps.startsWith('custom:')) {
            fpsSelect.value = 'custom';
            if (fpsCustomInput) fpsCustomInput.value = savedFps.replace('custom:', '') || '24';
          } else if (['10', '15', '20', '30', '60'].includes(savedFps)) {
            fpsSelect.value = savedFps;
          }
        }
      } catch (_) {}
      boardVideoOnFpsSelectChange();
    }
  };

  global.boardVideoCloseSetup = function () {
    stopMicrophoneTest();
    var overlay = document.getElementById('board-rec-setup-overlay');
    if (overlay) overlay.style.display = 'none';
    var testMeter = document.getElementById('board-rec-test-meter');
    if (testMeter) testMeter.style.width = '0%';
  };

  global.boardVideoOnFpsSelectChange = function () {
    var fpsSelect = document.getElementById('board-rec-fps-select');
    var fpsCustomWrap = document.getElementById('board-rec-fps-custom-wrap');
    if (!fpsSelect || !fpsCustomWrap) return;
    fpsCustomWrap.style.display = (fpsSelect.value === 'custom') ? 'inline-flex' : 'none';
  };

  global.boardVideoOnMicSelectChange = function () {
    var micSelect = document.getElementById('board-rec-mic-select');
    var testWrap = document.getElementById('board-rec-mic-test-wrap');
    var testMeter = document.getElementById('board-rec-test-meter');
    if (!micSelect) return;
    var devId = micSelect.value;
    if (devId === 'none') {
      stopMicrophoneTest();
      if (testWrap) testWrap.style.display = 'none';
      if (testMeter) testMeter.style.width = '0%';
    } else {
      if (testWrap) testWrap.style.display = 'flex';
      startMicrophoneTest(devId === 'default' ? null : devId, function (pct) {
        if (testMeter) testMeter.style.width = pct + '%';
      });
    }
  };

  global.boardVideoConfirmStart = async function () {
    var micSelect = document.getElementById('board-rec-mic-select');
    var micDevId = micSelect ? micSelect.value : 'default';

    var targetSelect = document.getElementById('board-rec-target-select');
    var targetMode = targetSelect ? targetSelect.value : 'main';

    var fpsSelect = document.getElementById('board-rec-fps-select');
    var fpsCustomInput = document.getElementById('board-rec-fps-custom-input');
    var chosenFps = 30;
    if (fpsSelect) {
      if (fpsSelect.value === 'custom') {
        chosenFps = fpsCustomInput ? Math.max(1, Math.min(60, parseInt(fpsCustomInput.value, 10) || 24)) : 24;
        try { localStorage.setItem('board_rec_fps', 'custom:' + chosenFps); } catch (_) {}
      } else {
        chosenFps = Math.max(1, Math.min(60, parseInt(fpsSelect.value, 10) || 30));
        try { localStorage.setItem('board_rec_fps', String(chosenFps)); } catch (_) {}
      }
    }

    boardVideoCloseSetup();

    var liveBar = document.getElementById('board-rec-live-bar');
    var timerEl = document.getElementById('board-rec-timer');
    var micFill = document.getElementById('board-rec-meter-fill');
    var pauseBtn = document.getElementById('board-rec-pause-btn');
    var pauseLabel = document.getElementById('board-rec-pause-label');
    var badgeText = document.getElementById('board-rec-badge-text');

    if (liveBar) liveBar.style.display = 'flex';
    if (timerEl) timerEl.textContent = '00:00';
    if (micFill) micFill.style.width = '0%';
    if (pauseLabel) pauseLabel.textContent = 'Pause';
    if (badgeText) badgeText.textContent = 'REC';

    try {
      var chosenSourceId = null;

      if (targetMode === 'presentation') {
        var isMirrorAlreadyOpen = (typeof _mirrorPeers !== 'undefined' && _mirrorPeers && _mirrorPeers.size > 0)
          || (typeof _mirrorPopupRef !== 'undefined' && _mirrorPopupRef && !_mirrorPopupRef.closed);

        if (!isMirrorAlreadyOpen && typeof window.conOpenMirrorWindow === 'function') {
          window.conOpenMirrorWindow();
          // Give the mirror/presentation window time to spawn and paint
          await new Promise(function (resolve) { setTimeout(resolve, 800); });
        }
      }

      if (window.Desktop && typeof window.Desktop.getScreenSources === 'function') {
        try {
          var res = await window.Desktop.getScreenSources(['window', 'screen']);
          if (res && res.sources && res.sources.length > 0) {
            if (targetMode === 'presentation') {
              var presSource = res.sources.find(function (s) {
                var n = (s.name || '').toLowerCase();
                return n.includes('presentation') || n.includes('présentation') || n.includes('mirror') || n.includes('miroir');
              });
              if (!presSource) {
                presSource = res.sources.find(function (s) {
                  var n = (s.name || '').toLowerCase();
                  return n.includes('board') && s.id !== res.sources[0].id;
                }) || res.sources[1] || res.sources[0];
              }
              if (presSource) chosenSourceId = presSource.id;
            } else {
              var mainSource = res.sources.find(function (s) {
                var n = (s.name || '').toLowerCase();
                return (n.includes('board') || n.includes('tableau')) && !n.includes('presentation') && !n.includes('présentation');
              }) || res.sources[0];
              if (mainSource) chosenSourceId = mainSource.id;
            }
          }
        } catch (srcErr) {
          console.warn('[BoardRecorder] Error resolving desktopCapturer source:', srcErr);
        }
      }

      await startRecording({
        videoSourceId: chosenSourceId,
        micDeviceId: micDevId,
        fps: chosenFps,
        onTick: function (elapsedMs, formatted) {
          if (timerEl) timerEl.textContent = formatted;
        },
        onMicLevel: function (pct) {
          if (micFill) micFill.style.width = pct + '%';
        },
        onStateChange: function (s) {
          if (s === 'paused') {
            if (pauseLabel) pauseLabel.textContent = 'Resume';
            if (badgeText) badgeText.textContent = 'PAUSED';
            if (liveBar) liveBar.classList.add('paused');
          } else if (s === 'recording') {
            if (pauseLabel) pauseLabel.textContent = 'Pause';
            if (badgeText) badgeText.textContent = 'REC';
            if (liveBar) liveBar.classList.remove('paused');
          } else if (s === 'idle') {
            if (liveBar) liveBar.style.display = 'none';
          }
        },
        onError: function (err) {
          notify(String(err || 'Recording error'), true);
        }
      });
    } catch (err) {
      if (liveBar) liveBar.style.display = 'none';
      notify('Recording cancelled or unavailable: ' + (err.message || err), true);
    }
  };

  global.boardVideoTogglePause = function () {
    if (state === 'recording') {
      pauseRecording();
    } else if (state === 'paused') {
      resumeRecording();
    }
  };

  global.boardVideoStop = async function () {
    try {
      var res = await stopRecording();
      var liveBar = document.getElementById('board-rec-live-bar');
      if (liveBar) liveBar.style.display = 'none';

      if (!res || !res.blob || res.sizeBytes < 1000) {
        notify('Recording was empty or cancelled.', true);
        return;
      }

      currentRecordingResult = res;

      // Open Preview Modal
      var prevOverlay = document.getElementById('board-rec-preview-overlay');
      var videoPrev = document.getElementById('board-rec-video-preview');
      var durEl = document.getElementById('board-rec-preview-duration');
      var sizeEl = document.getElementById('board-rec-preview-size');
      var fnInput = document.getElementById('board-rec-filename-input');

      if (durEl) durEl.textContent = res.durationFormatted || '00:00';
      if (sizeEl) sizeEl.textContent = formatBytes(res.sizeBytes);

      var defaultName = 'board-recording-' + (new Date()).toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if (fnInput) fnInput.value = defaultName;

      if (videoPrev) {
        videoPrev.src = res.url;
        videoPrev.play().catch(function () {});
      }

      if (prevOverlay) prevOverlay.style.display = 'flex';
    } catch (err) {
      console.error('[BoardRecorder] Stop error:', err);
    }
  };

  global.boardVideoPromptClosePreview = async function () {
    if (currentRecordingResult && currentRecordingResult.blob) {
      var confirmMsg = (typeof t === 'function' ? t('recDiscardConfirm') : null) || 'Are you sure you want to discard this recording?';
      var ok = await askConfirm(confirmMsg);
      if (!ok) return;
    }
    var prevOverlay = document.getElementById('board-rec-preview-overlay');
    var videoPrev = document.getElementById('board-rec-video-preview');
    if (videoPrev) {
      try { videoPrev.pause(); videoPrev.src = ''; } catch (_) {}
    }
    if (prevOverlay) prevOverlay.style.display = 'none';
    discardRecording();
    currentRecordingResult = null;
  };

  global.boardVideoExportFile = function () {
    if (!currentRecordingResult || !currentRecordingResult.blob) return;
    var fnInput = document.getElementById('board-rec-filename-input');
    var baseName = (fnInput && fnInput.value.trim()) || 'board-recording';
    if (!/\.webm$/i.test(baseName) && !/\.mp4$/i.test(baseName)) {
      baseName += '.webm';
    }

    var a = document.createElement('a');
    a.href = currentRecordingResult.url;
    a.download = baseName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    var successMsg = (typeof t === 'function' ? t('recSavedSuccess') : null) || ('Exported: ' + baseName);
    notify(successMsg, false);
  };

  global.boardVideoSaveAndAttach = async function () {
    if (!currentRecordingResult || !currentRecordingResult.blob) return;
    var fnInput = document.getElementById('board-rec-filename-input');
    var baseName = (fnInput && fnInput.value.trim()) || 'board-recording';
    if (!/\.webm$/i.test(baseName) && !/\.mp4$/i.test(baseName)) {
      baseName += '.webm';
    }

    var blob = currentRecordingResult.blob;
    var mime = currentRecordingResult.mimeType || 'video/webm';
    var size = currentRecordingResult.sizeBytes || blob.size;

    if (typeof conAttachments !== 'undefined' && Array.isArray(conAttachments)) {
      var currentFolder = (typeof window.conGetCurrentFolderName === 'function')
        ? window.conGetCurrentFolderName()
        : (typeof _conCurrentFolderName !== 'undefined' ? _conCurrentFolderName : '');

      if (currentFolder && window.Desktop && Desktop.isElectron() && typeof Desktop.saveBlob === 'function') {
        try {
          await Desktop.saveBlob('mindmaps', baseName, blob, currentFolder + '/videos');
        } catch (_) { }
      }

      if (typeof _conAttachmentCounter === 'undefined') window._conAttachmentCounter = conAttachments.length;
      _conAttachmentCounter += 1;
      var newAtt = {
        id: 'att_' + _conAttachmentCounter,
        name: baseName,
        mime: mime,
        kind: 'videos',
        size: size,
        file: blob,
        base64: '',
        _cachedObjectUrl: currentRecordingResult.url,
        relativePath: currentFolder ? (currentFolder + '/videos/' + baseName) : ''
      };
      conAttachments.push(newAtt);
      if (typeof conRenderAttachmentSummary === 'function') {
        conRenderAttachmentSummary();
      }
      if (typeof window.conInsertAttachmentById === 'function') {
        await window.conInsertAttachmentById(newAtt.id);
      }
      var successMsg = (typeof t === 'function' ? t('recSavedSuccess') : null) || ('Attached and inserted: ' + baseName);
      notify(successMsg, false);
    } else {
      global.boardVideoExportFile();
    }

    var prevOverlay = document.getElementById('board-rec-preview-overlay');
    var videoPrev = document.getElementById('board-rec-video-preview');
    if (videoPrev) {
      try { videoPrev.pause(); videoPrev.src = ''; } catch (_) {}
    }
    if (prevOverlay) prevOverlay.style.display = 'none';
  };

  // Export module globally
  global.BoardVideoRecorder = {
    getAudioDevices: getAudioDevices,
    startMicrophoneTest: startMicrophoneTest,
    stopMicrophoneTest: stopMicrophoneTest,
    startRecording: startRecording,
    pauseRecording: pauseRecording,
    resumeRecording: resumeRecording,
    stopRecording: stopRecording,
    discardRecording: discardRecording,
    formatDuration: formatDuration,
    formatBytes: formatBytes,
    getState: function () { return state; }
  };

})(window);
