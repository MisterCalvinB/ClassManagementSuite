/**
 * media-converter.js
 * Controller logic for the Video & Sound Converter tool.
 * Handles drag-and-drop, presets, WaveSurfer visual trimmer,
 * hybrid engine dispatch (Native FFmpeg vs Built-in Web Audio API),
 * live progress streaming, and batch conversion queue.
 */

(function () {
  'use strict';

  var _queue = [];
  var _activeJobId = null;
  var _waveSurfer = null;
  var _regionsPlugin = null;
  var _activeRegion = null;
  var _activeFile = null;
  var _nativeEngine = { hasNative: false, path: '', isUserTools: false };
  var _outputDirectory = '';

  var PRESETS = {
    'classroom-video': {
      format: 'mp4',
      resolution: '720p',
      videoQuality: 'medium',
      audioBitrate: '192k',
      normalize: false,
      speed: 1.0,
      channels: 0
    },
    'oral-exam': {
      format: 'mp3',
      audioBitrate: '128k',
      normalize: true,
      speed: 1.0,
      channels: 1
    },
    'extract-audio': {
      format: 'wav',
      audioBitrate: '192k',
      normalize: false,
      speed: 1.0,
      channels: 0
    },
    'lms-small': {
      format: 'mp4',
      resolution: '480p',
      videoQuality: 'low',
      audioBitrate: '96k',
      normalize: false,
      speed: 1.0,
      channels: 0
    },
    'slow-listening': {
      format: 'mp3',
      audioBitrate: '128k',
      normalize: true,
      speed: 0.85,
      channels: 0
    },
    'voice-boost': {
      format: 'mp3',
      audioBitrate: '192k',
      normalize: true,
      speed: 1.0,
      channels: 1
    },
    'animated-webp': {
      format: 'webp',
      resolution: '480p',
      videoQuality: 'medium',
      audioBitrate: '0',
      normalize: false,
      speed: 1.0,
      channels: 0
    }
  };

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      var res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

  // ── Initialization ──────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async function () {
    if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
      window.i18n.applyTranslations();
    }
    await checkEngine();
    setupDropzone();
    setupFormControls();
    setupWaveSurfer();
    setupProgressEvents();
    setupEngineModal();
    setupBroadcastListener();
    setupTimelineStudio();
    renderQueue();
    await checkUrlInputParam();
  });

  function setupBroadcastListener() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        var bc = new BroadcastChannel('cmt-media-converter');
        bc.onmessage = function (ev) {
          if (ev && ev.data && ev.data.type === 'OPEN_FILE' && ev.data.path) {
            loadFileFromPath(ev.data.path);
          }
        };
      }
    } catch (_) {}
  }

  async function loadFileFromPath(inputPath) {
    if (!inputPath) return;
    inputPath = decodeURIComponent(String(inputPath)).trim();
    if (!inputPath) return;

    var fullPath = inputPath;
    if (fullPath.startsWith('file://')) {
      fullPath = decodeURIComponent(fullPath.replace(/^file:\/\//, ''));
      if (fullPath.startsWith('/') && fullPath.charAt(2) === ':') {
        fullPath = fullPath.slice(1);
      }
    }

    var size = 0;
    if (window.Desktop) {
      var isRelative = !fullPath.includes(':') && !fullPath.startsWith('/') && !fullPath.startsWith('\\');
      if (isRelative && typeof window.Desktop.resolvePath === 'function') {
        try {
          var resolved = await window.Desktop.resolvePath('user', fullPath);
          var resolvedStr = (typeof resolved === 'string') ? resolved : (resolved && resolved.path ? resolved.path : '');
          if (resolvedStr) {
            fullPath = resolvedStr.replace(/^file:\/\//, '');
            if (fullPath.startsWith('/') && fullPath.charAt(2) === ':') fullPath = fullPath.slice(1);
          }
        } catch (_) {}
      }
    }

    var parts = fullPath.replace(/\\/g, '/').split('/');
    var fileName = parts.pop() || 'media_file';
    var ext = (fileName.split('.').pop() || '').toLowerCase();

    // Avoid duplicate item in queue
    var existing = _queue.find(function (i) {
      return (i.path && i.path.toLowerCase() === fullPath.toLowerCase()) ||
             (i.name && i.name.toLowerCase() === fileName.toLowerCase() && !i.path);
    });
    if (existing) {
      selectFileForPreview(existing);
      return;
    }

    addFilesToQueue([{
      name: fileName,
      path: fullPath,
      file: null,
      size: size,
      ext: ext
    }]);
  }

  async function checkUrlInputParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var inputPath = params.get('input') || params.get('file') || params.get('path');
      if (!inputPath) return;
      await loadFileFromPath(inputPath);
    } catch (err) {
      console.warn('[MediaConverter] Error loading file from query param:', err);
    }
  }

  function toFileUrl(filePath) {
    if (!filePath) return '';
    if (filePath.startsWith('file://') || filePath.startsWith('data:') || filePath.startsWith('blob:') || filePath.startsWith('http')) {
      return filePath;
    }
    var norm = filePath.replace(/\\/g, '/');
    if (!norm.startsWith('/')) norm = '/' + norm;
    return 'file://' + encodeURI(norm).replace(/#/g, '%23').replace(/\?/g, '%3F');
  }

  async function checkEngine() {
    var badge = document.getElementById('engineBadge');
    var badgeText = document.getElementById('engineBadgeText');
    if (!badge || !badgeText) return;

    if (window.Desktop && typeof window.Desktop.mediaCheckEngine === 'function') {
      var res = await window.Desktop.mediaCheckEngine();
      if (res && res.ok && res.hasNative) {
        _nativeEngine = res;
        badge.className = 'engine-badge native';
        badgeText.textContent = t('engineNativeFast', 'Native Fast Engine (GPU)');
        badge.title = res.enginePath || '';
        return;
      }
    }
    _nativeEngine = { hasNative: false, path: '', isUserTools: false };
    badge.className = 'engine-badge builtin';
    badgeText.textContent = t('engineBuiltinWeb', 'Built-in Web Engine');
    badge.title = t('engineDownloadPrompt', 'Click to install Fast Video Engine (FFmpeg)');
  }

  function setupEngineModal() {
    var modal = document.getElementById('engineModal');
    var badge = document.getElementById('engineBadge');
    var closeBtn = document.getElementById('closeEngineModalBtn');
    var cancelBtn = document.getElementById('cancelEngineModalBtn');
    var startBtn = document.getElementById('startDownloadEngineBtn');

    if (badge) {
      badge.addEventListener('click', function () {
        if (!_nativeEngine.hasNative && modal) {
          showDownloadEngineModal();
        }
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', function () { modal.style.display = 'none'; });
    }
    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', function () { modal.style.display = 'none'; });
    }

    if (startBtn) {
      startBtn.addEventListener('click', async function () {
        if (!window.Desktop || typeof window.Desktop.mediaDownloadEngine !== 'function') {
          if (typeof window.showToast === 'function') {
            window.showToast(t('engineDownloadError', 'Engine download is only available in the desktop app.'), true);
          }
          return;
        }

        var progArea = document.getElementById('engineDownloadProgressArea');
        var progBar = document.getElementById('engineProgressBar');
        var progStatus = document.getElementById('engineProgressStatus');
        var progPercent = document.getElementById('engineProgressPercent');

        if (progArea) progArea.style.display = 'block';
        startBtn.disabled = true;
        if (progStatus) progStatus.textContent = t('engineDownloading', 'Downloading Video Engine (~35MB)...');

        var unsub = null;
        if (typeof window.Desktop.onMediaEngineDownloadProgress === 'function') {
          unsub = window.Desktop.onMediaEngineDownloadProgress(function (data) {
            if (!data) return;
            var pct = Math.round(data.percent || 0);
            if (progBar) progBar.style.width = pct + '%';
            if (progPercent) progPercent.textContent = pct + '%';
            if (pct >= 99 && progStatus) {
              progStatus.textContent = t('engineInstalling', 'Extracting and activating FFmpeg...');
            }
          });
        }

        try {
          var res = await window.Desktop.mediaDownloadEngine();
          if (unsub) unsub();

          if (res && res.ok && res.hasNative) {
            _nativeEngine = res;
            await checkEngine();
            if (modal) modal.style.display = 'none';
            if (typeof window.showToast === 'function') {
              window.showToast(t('engineDownloadSuccess', 'Video Engine installed and ready!'), false);
            }
            // Resume pending conversions if any
            var pending = _queue.filter(function (i) { return i.status === 'queued'; });
            if (pending.length > 0) {
              convertAll();
            }
          } else {
            if (progStatus) progStatus.textContent = (res && res.error) ? res.error : t('engineDownloadError', 'Download failed.');
            startBtn.disabled = false;
          }
        } catch (err) {
          if (unsub) unsub();
          if (progStatus) progStatus.textContent = err.message || String(err);
          startBtn.disabled = false;
        }
      });
    }
  }

  function showDownloadEngineModal(item) {
    var modal = document.getElementById('engineModal');
    var startBtn = document.getElementById('startDownloadEngineBtn');
    var progArea = document.getElementById('engineDownloadProgressArea');
    var progBar = document.getElementById('engineProgressBar');
    var progPercent = document.getElementById('engineProgressPercent');
    var progStatus = document.getElementById('engineProgressStatus');

    if (progArea) progArea.style.display = 'none';
    if (progBar) progBar.style.width = '0%';
    if (progPercent) progPercent.textContent = '0%';
    if (progStatus) progStatus.textContent = t('engineDownloading', 'Downloading Video Engine...');
    if (startBtn) startBtn.disabled = false;

    if (modal) modal.style.display = 'flex';
  }

  function setupProgressEvents() {
    if (window.Desktop && typeof window.Desktop.onMediaProgress === 'function') {
      window.Desktop.onMediaProgress(function (data) {
        if (!data || !data.jobId) return;
        updateItemProgress(data.jobId, data.percent, data.speed);
      });
    }
  }

  function resolveFilePath(file) {
    if (!file) return '';
    if (window.Desktop && typeof window.Desktop.getPathForFile === 'function') {
      try {
        var p = window.Desktop.getPathForFile(file);
        if (p) return p;
      } catch (_) {}
    }
    return file.path || '';
  }

  // ── Drag & Drop / File Input ────────────────────────────────────────────────
  function setupDropzone() {
    var dropzone = document.getElementById('dropzone');
    var fileInput = document.getElementById('fileInput');
    var browseBtn = document.getElementById('browseFilesBtn');

    if (browseBtn) {
      browseBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        if (window.Desktop && typeof window.Desktop.mediaSelectInputFiles === 'function') {
          var res = await window.Desktop.mediaSelectInputFiles();
          if (res && res.ok && res.files && res.files.length) {
            addFilesToQueue(res.files);
          }
        } else if (fileInput) {
          fileInput.click();
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('click', function () {
        if (browseBtn) browseBtn.click();
      });

      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');

        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          var files = Array.from(e.dataTransfer.files).map(function (f) {
            return {
              file: f,
              path: resolveFilePath(f),
              name: f.name,
              size: f.size,
              ext: (f.name.split('.').pop() || '').toLowerCase()
            };
          });
          addFilesToQueue(files);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length) {
          var files = Array.from(fileInput.files).map(function (f) {
            return {
              file: f,
              path: resolveFilePath(f),
              name: f.name,
              size: f.size,
              ext: (f.name.split('.').pop() || '').toLowerCase()
            };
          });
          addFilesToQueue(files);
          fileInput.value = '';
        }
      });
    }
  }

  function addFilesToQueue(files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var item = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: f.name,
        path: f.path || '',
        fileObj: f.file || null,
        size: f.size || 0,
        ext: f.ext || '',
        status: 'queued', // queued, converting, completed, error
        progress: 0,
        speed: '',
        error: '',
        outputPath: '',
        settings: getCurrentSettings()
      };
      _queue.push(item);
    }
    renderQueue();
    // Auto-select first item for preview if none active
    if (!_activeFile && _queue.length > 0) {
      selectFileForPreview(_queue[_queue.length - files.length]);
    }
  }

  // ── Form Controls & Presets ────────────────────────────────────────────────
  function setupFormControls() {
    var presetChips = document.querySelectorAll('.preset-chip');
    presetChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        presetChips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var presetKey = chip.getAttribute('data-preset');
        if (PRESETS[presetKey]) {
          applyPreset(PRESETS[presetKey]);
        }
      });
    });

    var formatSelect = document.getElementById('targetFormat');
    if (formatSelect) {
      formatSelect.addEventListener('change', function () {
        syncFormatOptions();
      });
    }

    var convertAllBtn = document.getElementById('convertAllBtn');
    if (convertAllBtn) {
      convertAllBtn.addEventListener('click', convertAll);
    }

    var clearQueueBtn = document.getElementById('clearQueueBtn');
    if (clearQueueBtn) {
      clearQueueBtn.addEventListener('click', function () {
        _queue = _queue.filter(function (item) { return item.status === 'converting'; });
        renderQueue();
      });
    }
  }

  function applyPreset(preset) {
    var formatSelect = document.getElementById('targetFormat');
    var resSelect = document.getElementById('videoResolution');
    var qualSelect = document.getElementById('videoQuality');
    var bitrateSelect = document.getElementById('audioBitrate');
    var normCheck = document.getElementById('audioNormalize');
    var speedSelect = document.getElementById('audioSpeed');
    var chanSelect = document.getElementById('audioChannels');

    if (formatSelect && preset.format) formatSelect.value = preset.format;
    if (resSelect && preset.resolution) resSelect.value = preset.resolution;
    if (qualSelect && preset.videoQuality) qualSelect.value = preset.videoQuality;
    if (bitrateSelect && preset.audioBitrate) bitrateSelect.value = preset.audioBitrate;
    if (normCheck) normCheck.checked = !!preset.normalize;
    if (speedSelect && preset.speed) speedSelect.value = String(preset.speed);
    if (chanSelect && typeof preset.channels === 'number') chanSelect.value = String(preset.channels);

    syncFormatOptions();
  }

  function syncFormatOptions() {
    var fmt = (document.getElementById('targetFormat').value || 'mp4').toLowerCase();
    var isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(fmt);
    var isWebp = fmt === 'webp';

    var videoResGroup = document.getElementById('videoResGroup');
    var videoQualGroup = document.getElementById('videoQualGroup');
    var audioBitrateGroup = document.getElementById('audioBitrateGroup');

    if (videoResGroup) videoResGroup.style.display = isAudio ? 'none' : 'flex';
    if (videoQualGroup) videoQualGroup.style.display = (isAudio || isWebp) ? 'none' : 'flex';
    if (audioBitrateGroup) audioBitrateGroup.style.display = isWebp ? 'none' : 'flex';
  }

  function getCurrentSettings() {
    return {
      targetFormat: document.getElementById('targetFormat').value || 'mp4',
      resolution: document.getElementById('videoResolution').value || 'original',
      videoQuality: document.getElementById('videoQuality').value || 'medium',
      audioBitrate: document.getElementById('audioBitrate').value || '192k',
      normalize: document.getElementById('audioNormalize').checked,
      speed: parseFloat(document.getElementById('audioSpeed').value) || 1.0,
      channels: parseInt(document.getElementById('audioChannels').value, 10) || 0,
      trimStart: _activeRegion ? _activeRegion.start : 0,
      trimEnd: _activeRegion ? _activeRegion.end : 0,
      losslessCut: document.getElementById('losslessTrimCheck') ? document.getElementById('losslessTrimCheck').checked : false
    };
  }

  // ── WaveSurfer & Trimmer ───────────────────────────────────────────────────
  var _isSyncingFromWS = false;
  var _isSyncingFromVideo = false;

  function setupWaveSurfer() {
    var container = document.getElementById('waveformContainer');
    var videoEl = document.getElementById('videoPlayer');
    if (!container || !window.WaveSurfer) return;

    try {
      _regionsPlugin = window.WaveSurfer.Regions ? window.WaveSurfer.Regions.create() : null;
      var plugins = _regionsPlugin ? [_regionsPlugin] : [];

      _waveSurfer = window.WaveSurfer.create({
        container: container,
        waveColor: '#8b7cc2',
        progressColor: '#5b8fcc',
        cursorColor: '#333333',
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        height: 80,
        normalize: true,
        plugins: plugins
      });

      if (_regionsPlugin && typeof _regionsPlugin.enableDragSelection === 'function') {
        _regionsPlugin.enableDragSelection({
          color: 'rgba(106, 191, 142, 0.35)'
        });
      }

      _waveSurfer.on('ready', function () {
        var duration = _waveSurfer.getDuration();
        if (_regionsPlugin) {
          _regionsPlugin.clearRegions();
          _activeRegion = _regionsPlugin.addRegion({
            start: 0,
            end: duration,
            color: 'rgba(106, 191, 142, 0.35)',
            drag: true,
            resize: true
          });
          updateTrimTimeDisplay(0, duration);
        }
        if (videoEl && videoEl.src) {
          try { videoEl.currentTime = 0; } catch (e) {}
        }
      });

      // ── WaveSurfer -> Video Synchronization ──
      function syncVideoFromWS(targetTime) {
        if (!videoEl || _isSyncingFromVideo || !videoEl.src) return;
        _isSyncingFromWS = true;
        try {
          if (isFinite(targetTime) && targetTime >= 0) {
            videoEl.currentTime = targetTime;
          }
        } catch (e) {}
        setTimeout(function () { _isSyncingFromWS = false; }, 40);
      }

      _waveSurfer.on('seek', function (progress) {
        if (_isSyncingFromVideo) return;
        var dur = (videoEl && isFinite(videoEl.duration) && videoEl.duration > 0)
          ? videoEl.duration
          : _waveSurfer.getDuration();
        if (dur && isFinite(dur)) {
          syncVideoFromWS(progress * dur);
        }
      });

      _waveSurfer.on('interaction', function () {
        if (_isSyncingFromVideo) return;
        var curr = _waveSurfer.getCurrentTime();
        syncVideoFromWS(curr);
      });

      _waveSurfer.on('audioprocess', function (currTime) {
        if (_isSyncingFromVideo) return;
        if (_activeRegion && currTime >= _activeRegion.end) {
          _waveSurfer.pause();
          if (videoEl && !videoEl.paused) videoEl.pause();
          return;
        }
        // Correct drift during playback if > 200ms
        if (videoEl && !videoEl.paused && isFinite(videoEl.currentTime)) {
          if (Math.abs(videoEl.currentTime - currTime) > 0.2) {
            syncVideoFromWS(currTime);
          }
        }
      });

      _waveSurfer.on('play', function () {
        if (_isSyncingFromVideo) return;
        _isSyncingFromWS = true;
        if (videoEl && videoEl.src && videoEl.paused) {
          var videoBox = document.getElementById('videoPreviewBox');
          if (videoBox && videoBox.style.display !== 'none') {
            if (_activeRegion && (videoEl.currentTime < _activeRegion.start || videoEl.currentTime >= _activeRegion.end)) {
              videoEl.currentTime = _activeRegion.start;
            }
            videoEl.muted = true; // Avoid dual-audio echo
            videoEl.play().catch(function () {});
          }
        }
        setTimeout(function () { _isSyncingFromWS = false; }, 40);
      });

      _waveSurfer.on('pause', function () {
        if (_isSyncingFromVideo) return;
        _isSyncingFromWS = true;
        if (videoEl && !videoEl.paused) {
          videoEl.pause();
        }
        setTimeout(function () { _isSyncingFromWS = false; }, 40);
      });

      if (_regionsPlugin) {
        _regionsPlugin.on('region-updated', function (region) {
          _activeRegion = region;
          updateTrimTimeDisplay(region.start, region.end);
          if (videoEl && videoEl.paused) {
            syncVideoFromWS(region.start);
          }
        });
        _regionsPlugin.on('region-created', function (region) {
          _activeRegion = region;
          updateTrimTimeDisplay(region.start, region.end);
        });
        _regionsPlugin.on('region-out', function () {
          if (videoEl && !videoEl.paused) {
            videoEl.pause();
          }
        });
      }

      // ── Video -> WaveSurfer Synchronization ──
      if (videoEl) {
        function syncWSFromVideo() {
          if (!_waveSurfer || _isSyncingFromWS) return;
          _isSyncingFromVideo = true;
          try {
            var dur = _waveSurfer.getDuration() || videoEl.duration;
            if (dur && isFinite(dur) && dur > 0) {
              var frac = Math.max(0, Math.min(1, videoEl.currentTime / dur));
              _waveSurfer.seekTo(frac);
            }
          } catch (e) {}
          setTimeout(function () { _isSyncingFromVideo = false; }, 40);
        }

        videoEl.addEventListener('seeking', function () {
          syncWSFromVideo();
        });

        videoEl.addEventListener('timeupdate', function () {
          if (_isSyncingFromWS) return;
          if (videoEl.paused) {
            // User scrubbing video timeline
            syncWSFromVideo();
          } else {
            // Region boundary check
            if (_activeRegion && videoEl.currentTime >= _activeRegion.end) {
              videoEl.pause();
              if (_waveSurfer && _waveSurfer.isPlaying()) _waveSurfer.pause();
            }
          }
        });

        videoEl.addEventListener('play', function () {
          if (_isSyncingFromWS || !_waveSurfer) return;
          _isSyncingFromVideo = true;
          videoEl.muted = true; // Ensure clean single audio source through WaveSurfer
          if (!_waveSurfer.isPlaying()) {
            if (_activeRegion && (videoEl.currentTime < _activeRegion.start || videoEl.currentTime >= _activeRegion.end)) {
              videoEl.currentTime = _activeRegion.start;
              _waveSurfer.play(_activeRegion.start, _activeRegion.end);
            } else {
              var dur = _waveSurfer.getDuration() || videoEl.duration;
              if (dur > 0) {
                _waveSurfer.seekTo(videoEl.currentTime / dur);
              }
              if (_activeRegion) {
                _waveSurfer.play(videoEl.currentTime, _activeRegion.end);
              } else {
                _waveSurfer.play();
              }
            }
          }
          setTimeout(function () { _isSyncingFromVideo = false; }, 40);
        });

        videoEl.addEventListener('pause', function () {
          if (_isSyncingFromWS || !_waveSurfer) return;
          _isSyncingFromVideo = true;
          if (_waveSurfer.isPlaying()) {
            _waveSurfer.pause();
          }
          setTimeout(function () { _isSyncingFromVideo = false; }, 40);
        });
      }

      // ── Trim Player Controls ──
      var playBtn = document.getElementById('trimPlayBtn');
      var pauseBtn = document.getElementById('trimPauseBtn');
      var resetBtn = document.getElementById('trimResetBtn');

      if (playBtn) {
        playBtn.addEventListener('click', function () {
          if (_waveSurfer) {
            if (videoEl && videoEl.src) {
              var videoBox = document.getElementById('videoPreviewBox');
              if (videoBox && videoBox.style.display !== 'none') {
                videoEl.muted = true;
                if (_activeRegion) {
                  videoEl.currentTime = _activeRegion.start;
                }
                videoEl.play().catch(function () {});
              }
            }
            if (_activeRegion) _waveSurfer.play(_activeRegion.start, _activeRegion.end);
            else _waveSurfer.play();
          }
        });
      }

      if (pauseBtn) {
        pauseBtn.addEventListener('click', function () {
          if (_waveSurfer) _waveSurfer.pause();
          if (videoEl && !videoEl.paused) videoEl.pause();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          if (_waveSurfer && _regionsPlugin) {
            var dur = _waveSurfer.getDuration();
            _regionsPlugin.clearRegions();
            _activeRegion = _regionsPlugin.addRegion({
              start: 0,
              end: dur,
              color: 'rgba(106, 191, 142, 0.35)',
              drag: true,
              resize: true
            });
            updateTrimTimeDisplay(0, dur);
            _waveSurfer.seekTo(0);
            if (videoEl && videoEl.src) {
              videoEl.currentTime = 0;
            }
          }
        });
      }
    } catch (e) {
      console.warn('WaveSurfer initialization error:', e);
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    var hrs = Math.floor(seconds / 3600);
    var mins = Math.floor((seconds % 3600) / 60);
    var secs = (seconds % 60).toFixed(2);
    return (hrs > 0 ? String(hrs).padStart(2, '0') + ':' : '') +
      String(mins).padStart(2, '0') + ':' +
      (parseFloat(secs) < 10 ? '0' : '') + secs;
  }

  function updateTrimTimeDisplay(start, end) {
    var startEl = document.getElementById('trimStartDisplay');
    var endEl = document.getElementById('trimEndDisplay');
    var durEl = document.getElementById('trimDurDisplay');

    if (startEl) startEl.textContent = formatTime(start);
    if (endEl) endEl.textContent = formatTime(end);
    if (durEl) durEl.textContent = formatTime(Math.max(0, end - start));
  }

  function selectFileForPreview(item) {
    _activeFile = item;
    var previewPanel = document.getElementById('trimmerPanel');
    var videoBox = document.getElementById('videoPreviewBox');
    var videoEl = document.getElementById('videoPlayer');

    if (previewPanel) previewPanel.style.display = 'block';

    var isVideo = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv'].includes((item.ext || '').toLowerCase());

    if (videoBox && videoEl) {
      if (isVideo) {
        videoBox.style.display = 'flex';
        var src = item.path ? toFileUrl(item.path) : (item.fileObj ? URL.createObjectURL(item.fileObj) : '');
        videoEl.src = src;
        videoEl.currentTime = 0;
        videoEl.muted = true;
      } else {
        videoBox.style.display = 'none';
        videoEl.src = '';
      }
    }

    if (_waveSurfer) {
      if (item.path) {
        _waveSurfer.load(toFileUrl(item.path));
      } else if (item.fileObj) {
        _waveSurfer.loadBlob(item.fileObj);
      }
    }
  }

  // ── Conversion Execution & Queue ──────────────────────────────────────────
  async function promptItemDestination(item, currentSettings) {
    if (item.customOutputDir && item.customOutputName) {
      return { dir: item.customOutputDir, filename: item.customOutputName };
    }

    var outExt = currentSettings.targetFormat.toLowerCase();
    var outBaseName = item.name.replace(/\.[^/.]+$/, '');
    var defaultFileName = outBaseName + '_converted.' + outExt;

    var inputDir = '';
    if (item.path) {
      var parts = item.path.replace(/\\/g, '/').split('/');
      parts.pop();
      inputDir = parts.join('/');
    }

    if (typeof window.promptExportDestination === 'function' && window.Desktop && window.Desktop.isElectron()) {
      var destRes = await window.promptExportDestination({
        filename: defaultFileName,
        allowSameFolder: !!inputDir,
        sameFolderPath: inputDir,
        allowDocEditor: false,
        title: t('mediaExportDestTitle', 'Choose Media Output Location'),
        prompt: t('mediaExportDestPrompt', 'Where would you like to save the converted media file?')
      });

      if (!destRes) return null; // User cancelled

      var outName = destRes.filename || defaultFileName;
      var outDir = '';

      if (destRes.destination === 'same-folder') {
        outDir = inputDir;
      } else if (destRes.destination === 'to-print') {
        var toPrintResolved = '';
        if (typeof window.Desktop.resolvePath === 'function') {
          var resP = await window.Desktop.resolvePath('toPrint', '');
          if (resP && typeof resP === 'string') toPrintResolved = resP;
          else if (resP && resP.path) toPrintResolved = resP.path;
        }
        outDir = toPrintResolved || 'user/to-print';
      } else if (destRes.destination === 'custom') {
        if (typeof window.Desktop.mediaSelectOutputFolder === 'function') {
          var pickRes = await window.Desktop.mediaSelectOutputFolder();
          if (pickRes && pickRes.ok && pickRes.folderPath) {
            outDir = pickRes.folderPath;
          } else {
            return null; // User cancelled folder picker
          }
        } else if (typeof window.Desktop.pickFolder === 'function') {
          var pickRes2 = await window.Desktop.pickFolder();
          if (pickRes2 && pickRes2.ok && pickRes2.path) {
            outDir = pickRes2.path;
          } else {
            return null;
          }
        }
      }

      return { dir: outDir, filename: outName };
    }

    return { dir: inputDir || _outputDirectory, filename: defaultFileName };
  }

  async function convertAll() {
    var pending = _queue.filter(function (i) { return i.status === 'queued'; });
    if (!pending.length) return;

    // If multiple items in batch, prompt destination once for all files
    if (pending.length > 1 && window.Desktop && window.Desktop.isElectron() && typeof window.promptExportDestination === 'function') {
      var firstInput = pending[0].path ? pending[0].path.replace(/\\/g, '/').split('/').slice(0, -1).join('/') : '';
      var batchDest = await window.promptExportDestination({
        filename: 'batch_converted',
        allowSameFolder: !!firstInput,
        sameFolderPath: firstInput,
        allowDocEditor: false,
        title: t('mediaBatchDestTitle', 'Choose Batch Output Location'),
        prompt: t('mediaBatchDestPrompt', 'Where would you like to save all converted files?')
      });

      if (!batchDest) return; // Cancelled

      var batchDir = '';
      if (batchDest.destination === 'same-folder') {
        batchDir = 'same-folder';
      } else if (batchDest.destination === 'to-print') {
        var toPrintResolved = '';
        if (typeof window.Desktop.resolvePath === 'function') {
          var resP = await window.Desktop.resolvePath('toPrint', '');
          if (resP && typeof resP === 'string') toPrintResolved = resP;
          else if (resP && resP.path) toPrintResolved = resP.path;
        }
        batchDir = toPrintResolved || 'user/to-print';
      } else if (batchDest.destination === 'custom') {
        if (typeof window.Desktop.mediaSelectOutputFolder === 'function') {
          var pickRes = await window.Desktop.mediaSelectOutputFolder();
          if (pickRes && pickRes.ok && pickRes.folderPath) {
            batchDir = pickRes.folderPath;
          } else {
            return;
          }
        }
      }

      var currentSettings = getCurrentSettings();
      var outExt = currentSettings.targetFormat.toLowerCase();
      for (var b = 0; b < pending.length; b++) {
        var pItem = pending[b];
        var pItemBaseName = pItem.name.replace(/\.[^/.]+$/, '');
        var pItemOutName = pItemBaseName + '_converted.' + outExt;
        pItem.customOutputName = pItemOutName;

        if (batchDir === 'same-folder') {
          var pItemDir = pItem.path ? pItem.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/') : '';
          pItem.customOutputDir = pItemDir;
        } else if (batchDir) {
          pItem.customOutputDir = batchDir;
        }
      }
    }

    for (var i = 0; i < pending.length; i++) {
      await convertItem(pending[i]);
    }
  }

  async function convertItem(item) {
    if (item.status === 'converting') return;

    // Dynamically resolve path from fileObj if needed
    if (!item.path && item.fileObj) {
      item.path = resolveFilePath(item.fileObj);
    }

    // Refresh native engine detection if not yet active
    if (!_nativeEngine.hasNative && window.Desktop && typeof window.Desktop.mediaCheckEngine === 'function') {
      await checkEngine();
    }

    var currentSettings = getCurrentSettings();
    var outExt = currentSettings.targetFormat.toLowerCase();

    // Ask destination dialog
    var destInfo = await promptItemDestination(item, currentSettings);
    if (!destInfo) {
      item.status = 'queued';
      renderQueue();
      return;
    }

    item.status = 'converting';
    item.progress = 0;
    item.speed = '';
    item.error = '';
    renderQueue();

    var targetOutDir = destInfo.dir;
    var outFileName = destInfo.filename;
    var fullOutputPath = (targetOutDir ? targetOutDir.replace(/\\/g, '/') + '/' : '') + outFileName;

    // Tier 2: Native FFmpeg (Full Video & Audio Acceleration)
    if (_nativeEngine.hasNative && window.Desktop && typeof window.Desktop.mediaConvert === 'function' && item.path) {
      try {
        var req = {
          jobId: item.id,
          inputPath: item.path,
          outputPath: fullOutputPath,
          targetFormat: currentSettings.targetFormat,
          resolution: currentSettings.resolution,
          videoQuality: currentSettings.videoQuality,
          audioBitrate: currentSettings.audioBitrate,
          audioChannels: currentSettings.channels,
          normalize: currentSettings.normalize,
          speed: currentSettings.speed,
          trimStart: currentSettings.trimStart,
          trimEnd: currentSettings.trimEnd,
          losslessCut: currentSettings.losslessCut
        };

        var res = await window.Desktop.mediaConvert(req);
        if (res && res.ok) {
          item.status = 'completed';
          item.progress = 100;
          item.outputPath = res.outputPath || fullOutputPath;
          renderQueue();
          showExportSuccess(item.outputPath);
          return;
        } else {
          item.status = 'error';
          item.error = res ? res.error : 'Conversion failed';
          renderQueue();
          return;
        }
      } catch (err) {
        item.status = 'error';
        item.error = err.message || String(err);
        renderQueue();
        return;
      }
    }

    var videoFormats = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'wmv', 'flv'];
    var isVideoTarget = videoFormats.includes(outExt);

    // If target is video but native engine is absent, NEVER silently fallback to wav!
    if (isVideoTarget && !_nativeEngine.hasNative) {
      if (window.Desktop && typeof window.Desktop.mediaDownloadEngine === 'function') {
        item.status = 'queued';
        renderQueue();
        showDownloadEngineModal(item);
        return;
      } else {
        item.status = 'error';
        item.error = t('videoConversionRequiresNative', 'Converting video to MP4 requires the native video engine.');
        renderQueue();
        return;
      }
    }

    // Tier 1: Client-Side Audio Web Fallback (Only for pure audio targets)
    var audioFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    var isAudioTarget = audioFormats.includes(outExt);

    if (isAudioTarget && window.MediaAudioEncoder && (item.fileObj || item.path)) {
      try {
        var arrayBuf = null;
        if (item.fileObj) {
          arrayBuf = await item.fileObj.arrayBuffer();
        } else if (item.path && window.Desktop && typeof window.Desktop.readByPath === 'function') {
          var fileBlob = await fetch('file://' + item.path.replace(/\\/g, '/')).then(function (r) { return r.arrayBuffer(); });
          arrayBuf = fileBlob;
        }

        if (!arrayBuf) {
          throw new Error('Could not read file data for audio conversion');
        }

        var audioBuf = await MediaAudioEncoder.decodeAudioData(arrayBuf);

        // Trim if specified
        if (currentSettings.trimStart > 0 || (currentSettings.trimEnd > 0 && currentSettings.trimEnd > currentSettings.trimStart)) {
          var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioBuf = MediaAudioEncoder.sliceBuffer(audioCtx, audioBuf, currentSettings.trimStart, currentSettings.trimEnd || audioBuf.duration);
          if (typeof audioCtx.close === 'function') audioCtx.close().catch(function () {});
        }

        // Normalize if requested
        if (currentSettings.normalize) {
          audioBuf = MediaAudioEncoder.normalizeBuffer(audioBuf, 0.95);
        }

        // Speed adjustment
        if (currentSettings.speed && currentSettings.speed !== 1.0) {
          audioBuf = await MediaAudioEncoder.changeSpeed(audioBuf, currentSettings.speed);
        }

        // Encode to WAV Blob
        var wavBlob = MediaAudioEncoder.encodeWav(audioBuf, {
          channels: currentSettings.channels || audioBuf.numberOfChannels,
          sampleRate: audioBuf.sampleRate
        });

        var downloadExt = (outExt === 'wav' || outExt === 'mp3') ? outExt : 'wav';
        var actualFileName = outBaseName + '_converted.' + downloadExt;

        // Trigger browser download or desktop save
        var url = URL.createObjectURL(wavBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = actualFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        item.status = 'completed';
        item.progress = 100;
        item.outputPath = actualFileName;
        renderQueue();
        showExportSuccess(actualFileName);
        return;
      } catch (clientErr) {
        item.status = 'error';
        item.error = clientErr.message || 'Client audio conversion failed';
        renderQueue();
        return;
      }
    }

    item.status = 'error';
    item.error = t('noEngineAvailable', 'No suitable conversion engine available for this format.');
    renderQueue();
  }

  function updateItemProgress(jobId, percent, speed) {
    var item = _queue.find(function (i) { return i.id === jobId; });
    if (!item) return;
    item.progress = percent;
    item.speed = speed;

    var el = document.getElementById('progress_' + jobId);
    var labelEl = document.getElementById('progress_label_' + jobId);
    if (el) el.style.width = percent + '%';
    if (labelEl) labelEl.textContent = Math.round(percent) + '%' + (speed ? ' (' + speed + ')' : '');
  }

  function renderQueue() {
    var container = document.getElementById('queueList');
    var countBadge = document.getElementById('queueCountBadge');
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = _queue.length ? '(' + _queue.length + ')' : '';
    }

    if (!_queue.length) {
      container.innerHTML = '<div class="queue-empty-state" data-i18n="queueEmptyState">' +
        t('queueEmptyState', 'No media files queued. Drag and drop files above to start converting.') +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < _queue.length; i++) {
      var it = _queue[i];
      var isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(it.ext.toLowerCase());
      var iconSrc = isAudio ? '../assets/icons/music.svg' : '../assets/icons/media.svg';

      var statusText = it.status === 'completed' ? t('statusCompleted', 'Completed') :
        it.status === 'converting' ? t('statusConverting', 'Converting...') :
        it.status === 'error' ? t('statusError', 'Error') : t('statusQueued', 'Queued');

      var sizeMb = (it.size / (1024 * 1024)).toFixed(1);

      html += '<div class="queue-item" data-id="' + it.id + '">' +
        '<div class="queue-file-info">' +
          '<img src="' + iconSrc + '" class="queue-icon" alt="" />' +
          '<div>' +
            '<div class="queue-file-name">' + escapeHtml(it.name) + '</div>' +
            '<div class="queue-file-meta">' + it.ext.toUpperCase() + ' · ' + sizeMb + ' MB</div>' +
          '</div>' +
        '</div>' +
        '<div class="queue-progress-box">' +
          '<div class="progress-track">' +
            '<div class="progress-bar" id="progress_' + it.id + '" style="width: ' + it.progress + '%;"></div>' +
          '</div>' +
          '<div class="progress-label">' +
            '<span>' + statusText + (it.error ? ' — ' + escapeHtml(it.error) : '') + '</span>' +
            '<span id="progress_label_' + it.id + '">' + (it.progress > 0 ? Math.round(it.progress) + '%' : '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="queue-actions">' +
          (it.status === 'queued' ? '<button class="btn btn-sm btn-primary" onclick="window.mediaConverter.convertSingle(\'' + it.id + '\')"><img src="../assets/icons/play.svg" alt="" /> ' + t('convertBtn', 'Convert') + '</button>' : '') +
          (it.status === 'converting' ? '<button class="btn btn-sm btn-danger" onclick="window.mediaConverter.cancelSingle(\'' + it.id + '\')"><img src="../assets/icons/close.svg" alt="" /> ' + t('cancel', 'Cancel') + '</button>' : '') +
          '<button class="btn btn-sm" onclick="window.mediaConverter.previewSingle(\'' + it.id + '\')" title="' + t('trimPreviewTooltip', 'Trim & Preview') + '"><img src="../assets/icons/music.svg" alt="" /></button>' +
          '<button class="btn btn-sm btn-danger" onclick="window.mediaConverter.removeSingle(\'' + it.id + '\')" title="' + t('removeTooltip', 'Remove') + '"><img src="../assets/icons/delete.svg" alt="" /></button>' +
        '</div>' +
      '</div>';
    }

    container.innerHTML = html;
  }

  function showExportSuccess(filePath) {
    if (typeof window.showToast === 'function') {
      window.showToast(t('conversionSuccessToast', 'Conversion completed successfully!'), false);
    }
    if (typeof window.showExportSuccessPopup === 'function') {
      window.showExportSuccessPopup(filePath);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Timeline Studio Controller (Simple Movie Maker Style) ─────────────────
  var _timelineClips = [];
  var _timelineActiveClipId = null;
  var _timelineWaveSurfer = null;
  var _timelineRegionsPlugin = null;
  var _timelineActiveRegion = null;
  var _timelineIsSyncingWS = false;
  var _timelineIsSyncingVideo = false;

  // Save Movie Modal State
  var _saveModalScope = 'all'; // 'all' or 'selected'
  var _saveModalPreset = 'classroom'; // 'classroom', 'fullhd', 'small', 'audio', 'lossless'
  var _saveModalClipId = null;
  var _saveModalCustomDest = '';

  function setupTimelineStudio() {
    var tabConverter = document.getElementById('tabConverterMode');
    var tabEditor = document.getElementById('tabEditorMode');
    var timelinePanel = document.getElementById('timelineEditorPanel');
    var dropzonePanel = document.getElementById('dropzonePanel');
    var presetsPanel = document.getElementById('presetsPanel');
    var settingsGrid = document.querySelector('.settings-grid');
    var queuePanel = document.getElementById('queuePanel');
    var trimmerPanel = document.getElementById('trimmerPanel');

    function setMode(mode) {
      if (mode === 'editor') {
        if (tabEditor) tabEditor.classList.add('active');
        if (tabConverter) tabConverter.classList.remove('active');
        if (timelinePanel) timelinePanel.style.display = 'flex';
        if (dropzonePanel) dropzonePanel.style.display = 'none';
        if (presetsPanel) presetsPanel.style.display = 'none';
        if (settingsGrid) settingsGrid.style.display = 'none';
        if (queuePanel) queuePanel.style.display = 'none';
        if (trimmerPanel) trimmerPanel.style.display = 'none';

        setupTimelineWaveSurfer();

        // Convenience: auto-import active file from converter if editor is empty
        if (_activeFile && _timelineClips.length === 0) {
          addClipToTimeline(_activeFile.path || _activeFile.fileObj || _activeFile);
        } else {
          renderTimelineClips();
        }
      } else {
        if (tabConverter) tabConverter.classList.add('active');
        if (tabEditor) tabEditor.classList.remove('active');
        if (timelinePanel) timelinePanel.style.display = 'none';
        if (dropzonePanel) dropzonePanel.style.display = 'block';
        if (presetsPanel) presetsPanel.style.display = 'block';
        if (settingsGrid) settingsGrid.style.display = 'grid';
        if (queuePanel) queuePanel.style.display = 'block';
        if (_activeFile && trimmerPanel) trimmerPanel.style.display = 'block';
      }
    }

    if (tabConverter) {
      tabConverter.addEventListener('click', function () { setMode('converter'); });
    }
    if (tabEditor) {
      tabEditor.addEventListener('click', function () { setMode('editor'); });
    }

    // Add clip button & file input
    var addClipBtn = document.getElementById('timelineAddClipBtn');
    var timelineFileInput = document.getElementById('timelineFileInput');

    if (addClipBtn) {
      addClipBtn.addEventListener('click', async function () {
        if (window.Desktop && typeof window.Desktop.mediaSelectInputFiles === 'function') {
          var res = await window.Desktop.mediaSelectInputFiles();
          if (res && res.ok && res.files && res.files.length) {
            for (var i = 0; i < res.files.length; i++) {
              await addClipToTimeline(res.files[i]);
            }
          }
        } else if (timelineFileInput) {
          timelineFileInput.click();
        }
      });
    }

    if (timelineFileInput) {
      timelineFileInput.addEventListener('change', async function () {
        if (timelineFileInput.files && timelineFileInput.files.length) {
          for (var i = 0; i < timelineFileInput.files.length; i++) {
            await addClipToTimeline(timelineFileInput.files[i]);
          }
          timelineFileInput.value = '';
        }
      });
    }

    // Split buttons ("Split Here")
    var splitBtn = document.getElementById('timelineSplitBtn');
    if (splitBtn) {
      splitBtn.addEventListener('click', function () {
        splitClipAtPlayhead();
      });
    }

    var monitorSplitBtn = document.getElementById('timelineSplitHereMonitorBtn');
    if (monitorSplitBtn) {
      monitorSplitBtn.addEventListener('click', function () {
        splitClipAtPlayhead();
      });
    }

    // Set Start & Set End buttons
    var setStartBtn = document.getElementById('timelineSetStartBtn');
    if (setStartBtn) {
      setStartBtn.addEventListener('click', function () {
        setStartPoint();
      });
    }

    var setEndBtn = document.getElementById('timelineSetEndBtn');
    if (setEndBtn) {
      setEndBtn.addEventListener('click', function () {
        setEndPoint();
      });
    }

    // Delete Clip button
    var deleteClipBtn = document.getElementById('timelineDeleteClipBtn');
    if (deleteClipBtn) {
      deleteClipBtn.addEventListener('click', function () {
        if (_timelineActiveClipId) {
          removeTimelineClip(_timelineActiveClipId);
        } else {
          if (typeof window.showToast === 'function') {
            window.showToast(t('noClipsToMergeError', 'No clip selected to delete.'), true);
          }
        }
      });
    }

    // Ribbon Transitions & Adjustments
    var ribbonFadeIn = document.getElementById('ribbonFadeIn');
    var ribbonFadeOut = document.getElementById('ribbonFadeOut');
    var ribbonSpeed = document.getElementById('ribbonSpeed');

    if (ribbonFadeIn) {
      ribbonFadeIn.addEventListener('change', function () {
        var activeClip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
        if (activeClip) {
          activeClip.fadeIn = parseFloat(ribbonFadeIn.value) || 0;
          renderTimelineClips();
        }
      });
    }

    if (ribbonFadeOut) {
      ribbonFadeOut.addEventListener('change', function () {
        var activeClip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
        if (activeClip) {
          activeClip.fadeOut = parseFloat(ribbonFadeOut.value) || 0;
          renderTimelineClips();
        }
      });
    }

    if (ribbonSpeed) {
      ribbonSpeed.addEventListener('change', function () {
        var activeClip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
        if (activeClip) {
          activeClip.speed = parseFloat(ribbonSpeed.value) || 1.0;
        }
      });
    }

    // Save Movie / Save Edited File Buttons
    var saveMovieBtn = document.getElementById('timelineSaveMovieBtn');
    if (saveMovieBtn) {
      saveMovieBtn.addEventListener('click', function () {
        openSaveMovieModal('all');
      });
    }

    var saveCurrentClipBtn = document.getElementById('timelineSaveCurrentClipBtn');
    if (saveCurrentClipBtn) {
      saveCurrentClipBtn.addEventListener('click', function () {
        openSaveMovieModal('selected', _timelineActiveClipId);
      });
    }

    // Monitor transport playback buttons
    var playPauseBtn = document.getElementById('timelinePlayPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', toggleTimelinePlayPause);
    }

    var stepBack1sBtn = document.getElementById('timelineStepBack1sBtn');
    if (stepBack1sBtn) {
      stepBack1sBtn.addEventListener('click', function () { stepPlayback(-1.0); });
    }

    var stepBackFrameBtn = document.getElementById('timelineStepBackFrameBtn');
    if (stepBackFrameBtn) {
      stepBackFrameBtn.addEventListener('click', function () { stepPlayback(-0.1); });
    }

    var stepForwardFrameBtn = document.getElementById('timelineStepForwardFrameBtn');
    if (stepForwardFrameBtn) {
      stepForwardFrameBtn.addEventListener('click', function () { stepPlayback(0.1); });
    }

    var stepForward1sBtn = document.getElementById('timelineStepForward1sBtn');
    if (stepForward1sBtn) {
      stepForward1sBtn.addEventListener('click', function () { stepPlayback(1.0); });
    }

    var resetBtn = document.getElementById('timelineResetBtn');
    var videoEl = document.getElementById('timelineVideoPlayer');

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (_timelineWaveSurfer && _timelineRegionsPlugin) {
          var dur = _timelineWaveSurfer.getDuration();
          _timelineRegionsPlugin.clearRegions();
          _timelineActiveRegion = _timelineRegionsPlugin.addRegion({
            start: 0,
            end: dur,
            color: 'rgba(91, 143, 204, 0.3)',
            drag: true,
            resize: true
          });
          var activeClip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
          if (activeClip) {
            activeClip.trimStart = 0;
            activeClip.trimEnd = dur;
            activeClip.duration = dur;
            var card = document.querySelector('.timeline-clip-card[data-clip-id="' + activeClip.id + '"]');
            if (card) {
              var badge = card.querySelector('.clip-duration-badge');
              if (badge) badge.textContent = 'Duration: ' + dur.toFixed(1) + 's';
            }
          }
          updateTimelineRuler(0, dur, dur);
          _timelineWaveSurfer.seekTo(0);
          if (videoEl && videoEl.src) {
            videoEl.currentTime = 0;
          }
        }
      });
    }

    // Format change listener for resolution and quality toggling
    var targetFmtSelect = document.getElementById('timelineTargetFormat');
    if (targetFmtSelect) {
      targetFmtSelect.addEventListener('change', function () {
        var isAudio = ['mp3', 'wav', 'm4a'].includes(targetFmtSelect.value);
        var resG = document.getElementById('timelineResGroup');
        var qualG = document.getElementById('timelineQualityGroup');
        if (resG) resG.style.display = isAudio ? 'none' : 'flex';
        if (qualG) qualG.style.display = isAudio ? 'none' : 'flex';
      });
    }

    // Drag and drop onto timelinePanel
    if (timelinePanel) {
      timelinePanel.addEventListener('dragover', function (e) {
        e.preventDefault();
      });
      timelinePanel.addEventListener('drop', async function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          e.preventDefault();
          e.stopPropagation();
          for (var i = 0; i < e.dataTransfer.files.length; i++) {
            await addClipToTimeline(e.dataTransfer.files[i]);
          }
        }
      });
    }

    // Setup Save Movie Modal handlers
    setupSaveMovieModal();

    // Setup Global Movie Maker Keyboard Shortcuts
    setupMovieMakerShortcuts();
  }

  function setupMovieMakerShortcuts() {
    window.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) {
        return;
      }
      var timelinePanel = document.getElementById('timelineEditorPanel');
      if (!timelinePanel || timelinePanel.style.display === 'none') {
        return;
      }

      // Space: Play/Pause
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleTimelinePlayPause();
        return;
      }

      // S / s: Split or Ctrl+S: Save
      if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          openSaveMovieModal('all');
        } else {
          e.preventDefault();
          splitClipAtPlayhead();
        }
        return;
      }

      // I / i: Set Start Point
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setStartPoint();
        return;
      }

      // O / o: Set End Point
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setEndPoint();
        return;
      }

      // Delete: Remove active clip
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (_timelineActiveClipId) {
          e.preventDefault();
          removeTimelineClip(_timelineActiveClipId);
        }
        return;
      }

      // Arrow Left / Right: Frame/Second stepping
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepPlayback(e.shiftKey ? -0.1 : -1.0);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepPlayback(e.shiftKey ? 0.1 : 1.0);
        return;
      }
    });
  }

  function toggleTimelinePlayPause() {
    var videoEl = document.getElementById('timelineVideoPlayer');
    var playPauseText = document.getElementById('timelinePlayPauseText');
    var playPauseIcon = document.getElementById('timelinePlayPauseIcon');

    var isPlaying = false;
    if (_timelineWaveSurfer && _timelineWaveSurfer.isPlaying()) isPlaying = true;
    if (videoEl && !videoEl.paused) isPlaying = true;

    if (isPlaying) {
      if (_timelineWaveSurfer) _timelineWaveSurfer.pause();
      if (videoEl && !videoEl.paused) videoEl.pause();
      if (playPauseText) playPauseText.textContent = t('playSelection', 'Play Selection');
      if (playPauseIcon) playPauseIcon.src = '../assets/icons/play.svg';
    } else {
      if (_timelineWaveSurfer) {
        if (videoEl && videoEl.src) {
          var videoBox = document.getElementById('timelineVideoBox');
          if (videoBox && videoBox.style.display !== 'none') {
            videoEl.muted = true;
            if (_timelineActiveRegion) {
              videoEl.currentTime = _timelineActiveRegion.start;
            }
            videoEl.play().catch(function () {});
          }
        }
        if (_timelineActiveRegion) _timelineWaveSurfer.play(_timelineActiveRegion.start, _timelineActiveRegion.end);
        else _timelineWaveSurfer.play();
      }
      if (playPauseText) playPauseText.textContent = t('pause', 'Pause');
      if (playPauseIcon) playPauseIcon.src = '../assets/icons/pause.svg';
    }
  }

  function stepPlayback(deltaSec) {
    var videoEl = document.getElementById('timelineVideoPlayer');
    var currTime = 0;
    var totalDur = 10;

    var clip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
    if (clip && clip.mediaType === 'video' && videoEl && isFinite(videoEl.currentTime)) {
      currTime = videoEl.currentTime;
      totalDur = isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : (clip.originalDuration || 10);
    } else if (_timelineWaveSurfer) {
      currTime = _timelineWaveSurfer.getCurrentTime();
      totalDur = _timelineWaveSurfer.getDuration() || 10;
    }

    var targetTime = Math.max(0, Math.min(totalDur, currTime + deltaSec));

    if (videoEl && videoEl.src) {
      try { videoEl.currentTime = targetTime; } catch (_) {}
    }
    if (_timelineWaveSurfer && totalDur > 0) {
      _timelineWaveSurfer.seekTo(targetTime / totalDur);
    }
    updateTimelineRulerCurrent(targetTime);
  }

  function setStartPoint() {
    if (!_timelineClips || _timelineClips.length === 0) return;
    var clip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; }) || _timelineClips[0];
    var videoEl = document.getElementById('timelineVideoPlayer');

    var playheadTime = 0;
    if (clip.mediaType === 'video' && videoEl && isFinite(videoEl.currentTime)) {
      playheadTime = videoEl.currentTime;
    } else if (_timelineWaveSurfer) {
      playheadTime = _timelineWaveSurfer.getCurrentTime();
    }

    var end = (clip.trimEnd && clip.trimEnd > 0) ? clip.trimEnd : (clip.originalDuration || 10);
    if (playheadTime >= end - 0.2) {
      if (typeof window.showToast === 'function') {
        window.showToast(t('splitMarginErrorToast', 'Cannot set start point after clip end.'), true);
      }
      return;
    }

    clip.trimStart = playheadTime;
    clip.duration = Math.max(0.1, end - playheadTime);

    if (_timelineRegionsPlugin && _timelineActiveRegion) {
      _timelineActiveRegion.update({ start: playheadTime, end: end });
    }
    updateTimelineRuler(playheadTime, end, clip.originalDuration || end);
    renderTimelineClips();

    if (typeof window.showToast === 'function') {
      window.showToast(t('clipSetStartSuccess', 'Start point set to current playhead') + ' (' + formatTime(playheadTime) + ')');
    }
  }

  function setEndPoint() {
    if (!_timelineClips || _timelineClips.length === 0) return;
    var clip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; }) || _timelineClips[0];
    var videoEl = document.getElementById('timelineVideoPlayer');

    var playheadTime = 0;
    if (clip.mediaType === 'video' && videoEl && isFinite(videoEl.currentTime)) {
      playheadTime = videoEl.currentTime;
    } else if (_timelineWaveSurfer) {
      playheadTime = _timelineWaveSurfer.getCurrentTime();
    }

    var start = clip.trimStart || 0;
    if (playheadTime <= start + 0.2) {
      if (typeof window.showToast === 'function') {
        window.showToast(t('splitMarginErrorToast', 'Cannot set end point before clip start.'), true);
      }
      return;
    }

    clip.trimEnd = playheadTime;
    clip.duration = Math.max(0.1, playheadTime - start);

    if (_timelineRegionsPlugin && _timelineActiveRegion) {
      _timelineActiveRegion.update({ start: start, end: playheadTime });
    }
    updateTimelineRuler(start, playheadTime, clip.originalDuration || playheadTime);
    renderTimelineClips();

    if (typeof window.showToast === 'function') {
      window.showToast(t('clipSetEndSuccess', 'End point set to current playhead') + ' (' + formatTime(playheadTime) + ')');
    }
  }

  function setupTimelineWaveSurfer() {
    var container = document.getElementById('timelineWaveformContainer');
    var videoEl = document.getElementById('timelineVideoPlayer');
    if (!container || !window.WaveSurfer || _timelineWaveSurfer) return;

    try {
      _timelineRegionsPlugin = window.WaveSurfer.Regions ? window.WaveSurfer.Regions.create() : null;
      var plugins = _timelineRegionsPlugin ? [_timelineRegionsPlugin] : [];

      _timelineWaveSurfer = window.WaveSurfer.create({
        container: container,
        waveColor: '#5b8fcc',
        progressColor: '#e2c96e',
        cursorColor: '#333333',
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        height: 70,
        normalize: true,
        plugins: plugins
      });

      _timelineWaveSurfer.on('ready', function () {
        var duration = _timelineWaveSurfer.getDuration();
        var activeClip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
        var start = (activeClip && typeof activeClip.trimStart === 'number') ? activeClip.trimStart : 0;
        var end = (activeClip && typeof activeClip.trimEnd === 'number' && activeClip.trimEnd > start) ? activeClip.trimEnd : duration;

        if (_timelineRegionsPlugin) {
          _timelineRegionsPlugin.clearRegions();
          _timelineActiveRegion = _timelineRegionsPlugin.addRegion({
            start: start,
            end: end,
            color: 'rgba(91, 143, 204, 0.3)',
            drag: true,
            resize: true
          });
        }
        updateTimelineRuler(start, end, duration);
        if (videoEl && videoEl.src) {
          try { videoEl.currentTime = start; } catch (_) {}
        }
      });

      function syncTimelineVideo(targetTime) {
        if (!videoEl || _timelineIsSyncingVideo || !videoEl.src) return;
        _timelineIsSyncingWS = true;
        try {
          if (isFinite(targetTime) && targetTime >= 0) {
            videoEl.currentTime = targetTime;
          }
        } catch (_) {}
        setTimeout(function () { _timelineIsSyncingWS = false; }, 40);
      }

      _timelineWaveSurfer.on('seek', function (progress) {
        if (_timelineIsSyncingVideo) return;
        var dur = (videoEl && isFinite(videoEl.duration) && videoEl.duration > 0)
          ? videoEl.duration
          : _timelineWaveSurfer.getDuration();
        if (dur && isFinite(dur)) {
          syncTimelineVideo(progress * dur);
          updateTimelineRulerCurrent(progress * dur);
        }
      });

      _timelineWaveSurfer.on('audioprocess', function (currTime) {
        if (_timelineIsSyncingVideo) return;
        updateTimelineRulerCurrent(currTime);
        if (_timelineActiveRegion && currTime >= _timelineActiveRegion.end) {
          _timelineWaveSurfer.pause();
          if (videoEl && !videoEl.paused) videoEl.pause();
          return;
        }
        if (videoEl && !videoEl.paused && isFinite(videoEl.currentTime)) {
          if (Math.abs(videoEl.currentTime - currTime) > 0.2) {
            syncTimelineVideo(currTime);
          }
        }
      });

      _timelineWaveSurfer.on('play', function () {
        if (_timelineIsSyncingVideo) return;
        _timelineIsSyncingWS = true;
        if (videoEl && videoEl.src && videoEl.paused) {
          var videoBox = document.getElementById('timelineVideoBox');
          if (videoBox && videoBox.style.display !== 'none') {
            if (_timelineActiveRegion && (videoEl.currentTime < _timelineActiveRegion.start || videoEl.currentTime >= _timelineActiveRegion.end)) {
              videoEl.currentTime = _timelineActiveRegion.start;
            }
            videoEl.muted = true;
            videoEl.play().catch(function () {});
          }
        }
        setTimeout(function () { _timelineIsSyncingWS = false; }, 40);
      });

      _timelineWaveSurfer.on('pause', function () {
        if (_timelineIsSyncingVideo) return;
        _timelineIsSyncingWS = true;
        if (videoEl && !videoEl.paused) {
          videoEl.pause();
        }
        setTimeout(function () { _timelineIsSyncingWS = false; }, 40);
      });

      if (_timelineRegionsPlugin) {
        _timelineRegionsPlugin.on('region-updated', function (region) {
          _timelineActiveRegion = region;
          var activeClip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
          if (activeClip) {
            activeClip.trimStart = region.start;
            activeClip.trimEnd = region.end;
            activeClip.duration = Math.max(0.1, region.end - region.start);
            // Update duration badge in-place (smooth-dom-sync)
            var card = document.querySelector('.timeline-clip-card[data-clip-id="' + activeClip.id + '"]');
            if (card) {
              var badge = card.querySelector('.clip-duration-badge');
              if (badge) badge.textContent = 'Duration: ' + activeClip.duration.toFixed(1) + 's';
            }
          }
          updateTimelineRuler(region.start, region.end, _timelineWaveSurfer.getDuration());
          if (videoEl && videoEl.paused) {
            syncTimelineVideo(region.start);
          }
        });
      }

      if (videoEl) {
        videoEl.addEventListener('timeupdate', function () {
          if (_timelineIsSyncingWS) return;
          if (videoEl.paused) {
            var dur = _timelineWaveSurfer.getDuration() || videoEl.duration;
            if (dur > 0) {
              _timelineIsSyncingVideo = true;
              _timelineWaveSurfer.seekTo(videoEl.currentTime / dur);
              updateTimelineRulerCurrent(videoEl.currentTime);
              setTimeout(function () { _timelineIsSyncingVideo = false; }, 40);
            }
          } else {
            updateTimelineRulerCurrent(videoEl.currentTime);
            if (_timelineActiveRegion && videoEl.currentTime >= _timelineActiveRegion.end) {
              videoEl.pause();
              if (_timelineWaveSurfer.isPlaying()) _timelineWaveSurfer.pause();
            }
          }
        });
      }
    } catch (e) {
      console.warn('Timeline WaveSurfer init error:', e);
    }
  }

  function updateTimelineRulerCurrent(currTime) {
    var curEl = document.getElementById('timelineCurrentTime');
    if (curEl) curEl.textContent = formatTime(currTime);
  }

  function updateTimelineRuler(start, end, totalDuration) {
    var curEl = document.getElementById('timelineCurrentTime');
    var totEl = document.getElementById('timelineTotalDuration');
    if (curEl) curEl.textContent = formatTime(start);
    if (totEl) totEl.textContent = '/ ' + formatTime(totalDuration);
  }

  async function addClipToTimeline(fileOrPath) {
    var sourcePath = '';
    var fileObj = null;
    var fileName = '';
    var ext = '';

    if (typeof fileOrPath === 'string') {
      sourcePath = fileOrPath;
      var parts = sourcePath.replace(/\\/g, '/').split('/');
      fileName = parts.pop() || 'media_file';
      ext = (fileName.split('.').pop() || '').toLowerCase();
    } else if (fileOrPath && typeof fileOrPath === 'object') {
      fileObj = fileOrPath;
      sourcePath = resolveFilePath(fileOrPath);
      fileName = fileOrPath.name || 'media_file';
      ext = (fileName.split('.').pop() || '').toLowerCase();
    }

    if (!fileName) return;

    var isVideo = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv'].includes(ext);
    var duration = 0;

    // Probe duration
    if (sourcePath && window.MediaConverterService && typeof window.MediaConverterService.probe === 'function') {
      try {
        var probeRes = await window.MediaConverterService.probe(sourcePath);
        if (probeRes && probeRes.ok && probeRes.meta) {
          duration = probeRes.meta.duration || 0;
          if (typeof probeRes.meta.hasVideo === 'boolean') {
            isVideo = probeRes.meta.hasVideo;
          }
        }
      } catch (_) {}
    }

    if (!duration || duration <= 0) {
      // Fallback via HTML5 Audio / Video tag
      duration = await new Promise(function (resolve) {
        var el = document.createElement(isVideo ? 'video' : 'audio');
        el.preload = 'metadata';
        var url = sourcePath ? toFileUrl(sourcePath) : (fileObj ? URL.createObjectURL(fileObj) : '');
        el.src = url;
        el.onloadedmetadata = function () {
          var d = el.duration;
          if (fileObj) URL.revokeObjectURL(url);
          resolve(isFinite(d) && d > 0 ? d : 10);
        };
        el.onerror = function () {
          if (fileObj) URL.revokeObjectURL(url);
          resolve(10);
        };
      });
    }

    var clip = {
      id: 'clip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      sourcePath: sourcePath,
      fileObj: fileObj,
      name: fileName,
      mediaType: isVideo ? 'video' : 'audio',
      extension: ext,
      originalDuration: duration,
      trimStart: 0,
      trimEnd: duration,
      duration: duration,
      fadeIn: 0,
      fadeOut: 0,
      volume: 1.0,
      speed: 1.0,
      order: _timelineClips.length
    };

    _timelineClips.push(clip);
    renderTimelineClips();
    selectTimelineClip(clip.id);
  }

  function selectTimelineClip(clipId) {
    var clip = _timelineClips.find(function (c) { return c.id === clipId; });
    if (!clip) return;
    _timelineActiveClipId = clipId;

    // Update active class on cards
    var strip = document.getElementById('timelineClipsStrip');
    if (strip) {
      var cards = strip.querySelectorAll('.timeline-clip-card');
      cards.forEach(function (card) {
        if (card.dataset.clipId === clipId) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }

    // Sync Ribbon controls with selected clip
    var ribbonFadeIn = document.getElementById('ribbonFadeIn');
    var ribbonFadeOut = document.getElementById('ribbonFadeOut');
    var ribbonSpeed = document.getElementById('ribbonSpeed');
    if (ribbonFadeIn) ribbonFadeIn.value = String(clip.fadeIn || 0);
    if (ribbonFadeOut) ribbonFadeOut.value = String(clip.fadeOut || 0);
    if (ribbonSpeed) ribbonSpeed.value = String(clip.speed || 1.0);

    var videoBox = document.getElementById('timelineVideoBox');
    var videoEl = document.getElementById('timelineVideoPlayer');

    if (videoBox && videoEl) {
      if (clip.mediaType === 'video') {
        videoBox.style.display = 'flex';
        var src = clip.sourcePath ? toFileUrl(clip.sourcePath) : (clip.fileObj ? URL.createObjectURL(clip.fileObj) : '');
        videoEl.src = src;
        videoEl.currentTime = clip.trimStart || 0;
        videoEl.muted = true;
      } else {
        videoBox.style.display = 'none';
        videoEl.src = '';
      }
    }

    if (_timelineWaveSurfer) {
      if (clip.sourcePath) {
        _timelineWaveSurfer.load(toFileUrl(clip.sourcePath));
      } else if (clip.fileObj) {
        _timelineWaveSurfer.loadBlob(clip.fileObj);
      }
    }
  }

  function renderTimelineClips() {
    var strip = document.getElementById('timelineClipsStrip');
    var countEl = document.getElementById('timelineClipCount');
    var totalTimeEl = document.getElementById('timelineTotalSeqTime');

    var totalDuration = _timelineClips.reduce(function (sum, c) {
      return sum + (c.duration || 0);
    }, 0);

    if (countEl) {
      countEl.textContent = _timelineClips.length + (_timelineClips.length === 1 ? ' clip' : ' clips');
    }
    if (totalTimeEl) {
      totalTimeEl.textContent = 'Total: ' + formatTime(totalDuration);
    }
    if (!strip) return;

    if (_timelineClips.length === 0) {
      strip.innerHTML = '<div class="empty-clips-placeholder">' +
        '<img src="../assets/icons/media.svg" style="width:36px;height:36px;opacity:0.6;" alt=""/>' +
        '<span>' + t('noClipsToMergeError', 'No clips added yet. Click "Add Clip" or drag media files here.') + '</span>' +
        '</div>';
      return;
    }

    strip.innerHTML = '';
    _timelineClips.forEach(function (clip, idx) {
      var isActive = clip.id === _timelineActiveClipId;
      var card = document.createElement('div');
      card.className = 'timeline-clip-card' + (isActive ? ' active' : '');
      card.dataset.clipId = clip.id;
      card.draggable = true;

      var trimStartFormatted = formatTime(clip.trimStart || 0);
      var trimEndFormatted = formatTime(clip.trimEnd || clip.originalDuration || 0);
      var durationSec = (clip.duration || clip.originalDuration || 0).toFixed(1);

      card.innerHTML =
        '<div class="clip-filmstrip-bar">' +
          '<span class="filmstrip-sprocket"></span>' +
          '<span class="filmstrip-sprocket"></span>' +
          '<span class="filmstrip-sprocket"></span>' +
          '<span class="filmstrip-sprocket"></span>' +
          '<span class="filmstrip-sprocket"></span>' +
        '</div>' +
        '<div class="clip-card-header">' +
          '<div class="clip-drag-handle" title="Drag to reorder">⋮⋮</div>' +
          '<span class="clip-card-index">#' + (idx + 1) + '</span>' +
          '<span class="clip-card-name" title="' + escapeHtml(clip.name) + '">' + escapeHtml(clip.name) + '</span>' +
          '<button class="clip-remove-btn" title="Remove Clip" data-action="remove">✕</button>' +
        '</div>' +
        '<div class="clip-card-body">' +
          '<div class="clip-duration-badge" title="Active cut range">' +
            '<span>' + trimStartFormatted + ' → ' + trimEndFormatted + '</span>' +
            '<strong>(' + durationSec + 's)</strong>' +
          '</div>' +
          '<div class="clip-card-quick-actions">' +
            '<button type="button" class="btn btn-xs btn-split-primary" data-action="split-here" title="Split this clip right here at playhead">' +
              '<img src="../assets/icons/scissors.svg" style="width:12px;height:12px;" alt="" /> ' + t('btnSplitHere', 'Split Here') +
            '</button>' +
            '<button type="button" class="btn btn-xs btn-success" data-action="save-clip" title="Save this clip individually">' +
              '<img src="../assets/icons/save.svg" style="width:12px;height:12px;" alt="" /> ' + t('btnSaveClip', 'Save Clip') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="clip-card-footer">' +
          '<button class="btn btn-xs" data-action="move-left" ' + (idx === 0 ? 'disabled' : '') + ' title="Move Earlier">◀</button>' +
          '<button class="btn btn-xs btn-primary" data-action="preview" title="Select and preview clip">Preview</button>' +
          '<button class="btn btn-xs" data-action="move-right" ' + (idx === _timelineClips.length - 1 ? 'disabled' : '') + ' title="Move Later">▶</button>' +
        '</div>';

      // Event listeners on card
      card.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          var action = actionBtn.dataset.action;
          if (action === 'remove') {
            e.stopPropagation();
            removeTimelineClip(clip.id);
            return;
          } else if (action === 'move-left') {
            e.stopPropagation();
            moveTimelineClip(idx, idx - 1);
            return;
          } else if (action === 'move-right') {
            e.stopPropagation();
            moveTimelineClip(idx, idx + 1);
            return;
          } else if (action === 'preview') {
            e.stopPropagation();
            selectTimelineClip(clip.id);
            return;
          } else if (action === 'split-here') {
            e.stopPropagation();
            selectTimelineClip(clip.id);
            splitClipAtPlayhead();
            return;
          } else if (action === 'save-clip') {
            e.stopPropagation();
            openSaveMovieModal('selected', clip.id);
            return;
          }
        }
        selectTimelineClip(clip.id);
      });

      // Drag and drop reordering
      card.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', String(idx));
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
      });

      card.addEventListener('dragover', function (e) {
        e.preventDefault();
      });

      card.addEventListener('drop', function (e) {
        e.preventDefault();
        var fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(fromIdx) && fromIdx !== idx) {
          moveTimelineClip(fromIdx, idx);
        }
      });

      strip.appendChild(card);

      // Transition slot between adjacent clips (Movie Maker style)
      if (idx < _timelineClips.length - 1) {
        var transSlot = document.createElement('div');
        transSlot.className = 'storyboard-transition-slot';
        transSlot.dataset.slotIdx = String(idx);
        var transSec = clip.fadeOut || 0;
        transSlot.title = 'Click to cycle transition crossfade: ' + (transSec > 0 ? transSec + 's' : 'Cut');
        transSlot.innerHTML =
          '<img src="../assets/icons/merge.svg" alt="" />' +
          '<span>' + (transSec > 0 ? transSec + 's' : 'Cut') + '</span>';

        transSlot.addEventListener('click', function (e) {
          e.stopPropagation();
          // Cycle: 0 -> 0.5 -> 1.0 -> 2.0 -> 0
          var cur = clip.fadeOut || 0;
          var next = (cur === 0) ? 0.5 : (cur === 0.5 ? 1.0 : (cur === 1.0 ? 2.0 : 0));
          clip.fadeOut = next;
          renderTimelineClips();
          if (typeof window.showToast === 'function') {
            window.showToast('Transition between #' + (idx + 1) + ' and #' + (idx + 2) + ': ' + (next > 0 ? (next + 's Crossfade') : 'Direct Cut'));
          }
        });

        strip.appendChild(transSlot);
      }
    });
  }

  function moveTimelineClip(fromIdx, toIdx) {
    if (fromIdx < 0 || fromIdx >= _timelineClips.length || toIdx < 0 || toIdx >= _timelineClips.length) return;
    var moved = _timelineClips.splice(fromIdx, 1)[0];
    _timelineClips.splice(toIdx, 0, moved);
    _timelineClips.forEach(function (c, i) { c.order = i; });
    renderTimelineClips();
  }

  function removeTimelineClip(clipId) {
    _timelineClips = _timelineClips.filter(function (c) { return c.id !== clipId; });
    _timelineClips.forEach(function (c, i) { c.order = i; });
    if (_timelineActiveClipId === clipId) {
      _timelineActiveClipId = _timelineClips.length ? _timelineClips[0].id : null;
      if (_timelineActiveClipId) selectTimelineClip(_timelineActiveClipId);
      else {
        var videoBox = document.getElementById('timelineVideoBox');
        var videoEl = document.getElementById('timelineVideoPlayer');
        if (videoBox) videoBox.style.display = 'none';
        if (videoEl) videoEl.src = '';
        if (_timelineWaveSurfer && _timelineRegionsPlugin) {
          _timelineRegionsPlugin.clearRegions();
          _timelineWaveSurfer.empty();
        }
      }
    }
    renderTimelineClips();
  }

  function splitClipAtPlayhead() {
    if (!_timelineClips || _timelineClips.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast(t('noClipsToMergeError', 'Please add at least one clip first.'), true);
      }
      return;
    }

    var clip = _timelineClips.find(function (c) { return c.id === _timelineActiveClipId; });
    if (!clip) {
      clip = _timelineClips[0];
      _timelineActiveClipId = clip.id;
    }

    var videoEl = document.getElementById('timelineVideoPlayer');
    var playheadTime = 0;
    if (clip.mediaType === 'video' && videoEl && isFinite(videoEl.currentTime) && videoEl.currentTime > 0) {
      playheadTime = videoEl.currentTime;
    } else if (_timelineWaveSurfer) {
      playheadTime = _timelineWaveSurfer.getCurrentTime();
    }

    var minMargin = 0.2;
    var start = clip.trimStart || 0;
    var end = (clip.trimEnd && clip.trimEnd > start) ? clip.trimEnd : (clip.originalDuration || 10);

    if (playheadTime <= start + minMargin || playheadTime >= end - minMargin) {
      if (typeof window.showToast === 'function') {
        window.showToast(t('splitMarginErrorToast', 'Cannot split too close to the start or end of a clip'), true);
      }
      return;
    }

    var oldTrimEnd = end;
    var oldFadeOut = clip.fadeOut || 0;

    clip.trimEnd = playheadTime;
    clip.duration = Math.max(0.1, playheadTime - start);
    clip.fadeOut = 0; // Cut boundary has 0s fade

    // Generate intelligent part name
    var baseName = clip.name.replace(/ \(Part \d+\)$/, '');
    var currentPartMatch = clip.name.match(/ \(Part (\d+)\)$/);
    var nextPartNum = currentPartMatch ? (parseInt(currentPartMatch[1], 10) + 1) : 2;
    if (!currentPartMatch) {
      clip.name = baseName + ' (Part 1)';
    }

    var newClip = {
      id: 'clip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      sourcePath: clip.sourcePath,
      fileObj: clip.fileObj,
      name: baseName + ' (Part ' + nextPartNum + ')',
      mediaType: clip.mediaType,
      extension: clip.extension,
      originalDuration: clip.originalDuration,
      trimStart: playheadTime,
      trimEnd: oldTrimEnd,
      duration: Math.max(0.1, oldTrimEnd - playheadTime),
      fadeIn: 0,
      fadeOut: oldFadeOut,
      volume: clip.volume || 1.0,
      speed: clip.speed || 1.0,
      order: clip.order + 1
    };

    var clipIdx = _timelineClips.indexOf(clip);
    _timelineClips.splice(clipIdx + 1, 0, newClip);
    _timelineClips.forEach(function (c, idx) { c.order = idx; });

    renderTimelineClips();
    selectTimelineClip(newClip.id);

    if (typeof window.showToast === 'function') {
      window.showToast(t('splitSuccessToast', 'Clip split successfully') + ' (' + formatTime(playheadTime) + ')');
    }
  }

  // ── Save Movie Modal Controller (Movie Maker Style) ────────────────────────
  function setupSaveMovieModal() {
    var modal = document.getElementById('saveMovieModal');
    var closeBtn = document.getElementById('closeSaveMovieModalBtn');
    var cancelBtn = document.getElementById('btnCancelSaveMovie');
    var confirmBtn = document.getElementById('btnSaveMovieConfirm');
    var scopeRadios = document.querySelectorAll('input[name="saveScopeRadio"]');
    var destRadios = document.querySelectorAll('input[name="saveDestRadio"]');
    var presetCards = document.querySelectorAll('.save-preset-card');

    if (closeBtn) closeBtn.addEventListener('click', closeSaveMovieModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeSaveMovieModal);

    if (scopeRadios) {
      scopeRadios.forEach(function (r) {
        r.addEventListener('change', function () {
          _saveModalScope = r.value;
          updateSaveModalUI();
        });
      });
    }

    if (destRadios) {
      destRadios.forEach(function (r) {
        r.addEventListener('change', async function () {
          if (r.value === 'custom') {
            if (window.Desktop && typeof window.Desktop.mediaSelectOutputFolder === 'function') {
              var pick = await window.Desktop.mediaSelectOutputFolder();
              if (pick && pick.ok && pick.folderPath) {
                _saveModalCustomDest = pick.folderPath;
              } else {
                // Revert to same if cancelled
                var sameRadio = document.querySelector('input[name="saveDestRadio"][value="same"]');
                if (sameRadio) sameRadio.checked = true;
              }
            } else if (window.Desktop && typeof window.Desktop.pickFolder === 'function') {
              var pick2 = await window.Desktop.pickFolder();
              if (pick2 && pick2.ok && pick2.path) {
                _saveModalCustomDest = pick2.path;
              } else {
                var sameRadio2 = document.querySelector('input[name="saveDestRadio"][value="same"]');
                if (sameRadio2) sameRadio2.checked = true;
              }
            }
          }
          updateSaveModalDestPreview();
        });
      });
    }

    if (presetCards) {
      presetCards.forEach(function (card) {
        card.addEventListener('click', function () {
          presetCards.forEach(function (c) { c.classList.remove('active'); });
          card.classList.add('active');
          _saveModalPreset = card.dataset.preset || 'classroom';
          updateSaveModalFileNameExt();
        });
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', executeSaveMovie);
    }
  }

  function openSaveMovieModal(scope, clipId) {
    if (!_timelineClips || _timelineClips.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast(t('noClipsToMergeError', 'Please add at least one clip first.'), true);
      }
      return;
    }

    _saveModalScope = scope || 'all';
    _saveModalClipId = clipId || _timelineActiveClipId || (_timelineClips[0] ? _timelineClips[0].id : null);

    var modal = document.getElementById('saveMovieModal');
    var progArea = document.getElementById('saveMovieProgressArea');
    if (progArea) progArea.style.display = 'none';

    var confirmBtn = document.getElementById('btnSaveMovieConfirm');
    if (confirmBtn) confirmBtn.disabled = false;

    // Set radio check
    var scopeRadio = document.querySelector('input[name="saveScopeRadio"][value="' + _saveModalScope + '"]');
    if (scopeRadio) scopeRadio.checked = true;

    var sameRadio = document.querySelector('input[name="saveDestRadio"][value="same"]');
    if (sameRadio) sameRadio.checked = true;

    updateSaveModalUI();

    if (modal) modal.style.display = 'flex';
  }

  function closeSaveMovieModal() {
    var modal = document.getElementById('saveMovieModal');
    if (modal) modal.style.display = 'none';
  }

  function updateSaveModalUI() {
    var scopeAllLabel = document.getElementById('saveScopeAllLabel');
    var scopeSelLabel = document.getElementById('saveScopeSelectedLabel');
    var allSubtext = document.getElementById('saveScopeAllSubtext');
    var selSubtext = document.getElementById('saveScopeSelectedSubtext');
    var losslessCard = document.getElementById('savePresetLosslessCard');

    if (scopeAllLabel) {
      if (_saveModalScope === 'all') scopeAllLabel.classList.add('active');
      else scopeAllLabel.classList.remove('active');
    }
    if (scopeSelLabel) {
      if (_saveModalScope === 'selected') scopeSelLabel.classList.add('active');
      else scopeSelLabel.classList.remove('active');
    }

    var totalDur = _timelineClips.reduce(function (sum, c) { return sum + (c.duration || 0); }, 0);
    if (allSubtext) {
      allSubtext.textContent = _timelineClips.length + ' clips • ' + formatTime(totalDur);
    }

    var selClip = _timelineClips.find(function (c) { return c.id === _saveModalClipId; }) || _timelineClips[0];
    if (selSubtext && selClip) {
      selSubtext.textContent = selClip.name + ' (' + (selClip.duration || selClip.originalDuration || 0).toFixed(1) + 's)';
    }

    // Lossless is only available for single clip export without re-encoding
    if (losslessCard) {
      if (_saveModalScope === 'selected') {
        losslessCard.style.display = 'flex';
      } else {
        losslessCard.style.display = 'none';
        if (_saveModalPreset === 'lossless') {
          _saveModalPreset = 'classroom';
          var crCard = document.querySelector('.save-preset-card[data-preset="classroom"]');
          if (crCard) {
            document.querySelectorAll('.save-preset-card').forEach(function (c) { c.classList.remove('active'); });
            crCard.classList.add('active');
          }
        }
      }
    }

    updateSaveModalDefaultFileName();
    updateSaveModalDestPreview();
  }

  function updateSaveModalDefaultFileName() {
    var fileNameInput = document.getElementById('saveOutputFileName');
    if (!fileNameInput) return;

    var ext = _saveModalPreset === 'audio' ? 'mp3' : 'mp4';

    if (_saveModalScope === 'all') {
      var firstClip = _timelineClips[0];
      var base = (firstClip && firstClip.name) ? firstClip.name.replace(/\.[^/.]+$/, '') : 'my_movie';
      base = base.replace(/ \(Part \d+\)$/i, '').replace(/_edited$/i, '').replace(/_cut$/i, '');
      fileNameInput.value = base + '_edited.' + ext;
    } else {
      var selClip = _timelineClips.find(function (c) { return c.id === _saveModalClipId; }) || _timelineClips[0];
      var base2 = (selClip && selClip.name) ? selClip.name.replace(/\.[^/.]+$/, '') : 'clip';
      fileNameInput.value = base2 + '.' + ext;
    }
  }

  function updateSaveModalFileNameExt() {
    var fileNameInput = document.getElementById('saveOutputFileName');
    if (!fileNameInput || !fileNameInput.value) return;
    var ext = _saveModalPreset === 'audio' ? 'mp3' : 'mp4';
    var cur = fileNameInput.value.trim();
    var base = cur.replace(/\.[^/.]+$/, '');
    fileNameInput.value = base + '.' + ext;
  }

  function updateSaveModalDestPreview() {
    var destPreview = document.getElementById('saveDestPathPreview');
    if (!destPreview) return;

    var destRadio = document.querySelector('input[name="saveDestRadio"]:checked');
    var isSame = (!destRadio || destRadio.value === 'same');

    var dir = '';
    if (isSame) {
      var firstClip = _timelineClips[0];
      if (firstClip && firstClip.sourcePath) {
        var parts = firstClip.sourcePath.replace(/\\/g, '/').split('/');
        parts.pop();
        dir = parts.join('/');
      }
      if (!dir) dir = 'Same folder as original file';
    } else {
      dir = _saveModalCustomDest || 'Please select a destination folder...';
    }

    destPreview.textContent = dir;
    destPreview.title = dir;
  }

  async function executeSaveMovie() {
    if (!_timelineClips || _timelineClips.length === 0) return;

    var fileNameInput = document.getElementById('saveOutputFileName');
    var fileName = fileNameInput ? fileNameInput.value.trim() : '';
    if (!fileName) fileName = 'edited_media_' + Date.now() + '.mp4';

    var destRadio = document.querySelector('input[name="saveDestRadio"]:checked');
    var isSame = (!destRadio || destRadio.value === 'same');

    var outDir = '';
    var firstClip = _timelineClips[0];
    if (isSame && firstClip && firstClip.sourcePath) {
      var parts = firstClip.sourcePath.replace(/\\/g, '/').split('/');
      parts.pop();
      outDir = parts.join('/');
    } else if (!isSame && _saveModalCustomDest) {
      outDir = _saveModalCustomDest;
    }

    if (!outDir && window.Desktop && typeof window.Desktop.resolvePath === 'function') {
      try {
        var resP = await window.Desktop.resolvePath('user', 'to-print');
        outDir = (typeof resP === 'string') ? resP : (resP && resP.path ? resP.path : '');
      } catch (_) {}
    }

    var fullOutputPath = outDir ? (outDir.replace(/\\/g, '/').replace(/\/$/, '') + '/' + fileName) : fileName;

    // Preset configurations (Movie Maker style)
    var targetFormat = 'mp4';
    var resolution = '720p';
    var videoQuality = 'medium';
    var audioBitrate = '192k';
    var isLossless = false;

    if (_saveModalPreset === 'classroom') {
      targetFormat = 'mp4';
      resolution = '720p';
      videoQuality = 'medium';
      audioBitrate = '192k';
    } else if (_saveModalPreset === 'fullhd') {
      targetFormat = 'mp4';
      resolution = '1080p';
      videoQuality = 'high';
      audioBitrate = '192k';
    } else if (_saveModalPreset === 'small') {
      targetFormat = 'mp4';
      resolution = '480p';
      videoQuality = 'low';
      audioBitrate = '96k';
    } else if (_saveModalPreset === 'audio') {
      targetFormat = 'mp3';
      resolution = 'original';
      videoQuality = 'medium';
      audioBitrate = '192k';
    } else if (_saveModalPreset === 'lossless') {
      targetFormat = (firstClip && firstClip.extension) ? firstClip.extension : 'mp4';
      isLossless = true;
    }

    var progArea = document.getElementById('saveMovieProgressArea');
    var progBar = document.getElementById('saveMovieProgressBar');
    var progPercent = document.getElementById('saveMovieProgressPercent');
    var progStatus = document.getElementById('saveMovieProgressStatus');
    var confirmBtn = document.getElementById('btnSaveMovieConfirm');

    if (progArea) progArea.style.display = 'block';
    if (progBar) progBar.style.width = '0%';
    if (progPercent) progPercent.textContent = '0%';
    if (progStatus) progStatus.textContent = 'Rendering edited media...';
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      var res;
      if (_saveModalScope === 'all') {
        var renderOptions = {
          clips: _timelineClips,
          outputPath: fullOutputPath,
          targetFormat: targetFormat,
          resolution: resolution,
          videoQuality: videoQuality,
          audioBitrate: audioBitrate
        };

        if (window.MediaConverterService && typeof window.MediaConverterService.renderTimeline === 'function') {
          res = await window.MediaConverterService.renderTimeline(renderOptions, function (prog) {
            if (prog && typeof prog.percent === 'number') {
              var pct = Math.round(prog.percent);
              if (progBar) progBar.style.width = pct + '%';
              if (progPercent) progPercent.textContent = pct + '%';
            }
          });
        } else if (window.Desktop && typeof window.Desktop.mediaEditorRender === 'function') {
          res = await window.Desktop.mediaEditorRender(renderOptions);
        } else {
          res = { ok: false, error: 'Rendering engine unavailable' };
        }
      } else {
        // Single Clip Export
        var selClip = _timelineClips.find(function (c) { return c.id === _saveModalClipId; }) || _timelineClips[0];
        if (!selClip) throw new Error('Selected clip not found');

        if (window.Desktop && typeof window.Desktop.mediaConvert === 'function' && selClip.sourcePath) {
          res = await window.Desktop.mediaConvert({
            inputPath: selClip.sourcePath,
            outputPath: fullOutputPath,
            targetFormat: targetFormat,
            resolution: resolution,
            videoQuality: videoQuality,
            audioBitrate: audioBitrate,
            trimStart: selClip.trimStart || 0,
            trimEnd: selClip.trimEnd || 0,
            losslessCut: isLossless
          });
        } else if (window.MediaConverterService && typeof window.MediaConverterService.convert === 'function') {
          res = await window.MediaConverterService.convert({
            inputPath: selClip.sourcePath,
            inputFile: selClip.fileObj,
            outputPath: fullOutputPath,
            format: targetFormat,
            trimStart: selClip.trimStart || 0,
            trimEnd: selClip.trimEnd || 0
          }, function (prog) {
            if (prog && typeof prog.percent === 'number') {
              var pct = Math.round(prog.percent);
              if (progBar) progBar.style.width = pct + '%';
              if (progPercent) progPercent.textContent = pct + '%';
            }
          });
        } else {
          res = { ok: false, error: 'Conversion engine unavailable' };
        }
      }

      if (res && res.ok) {
        closeSaveMovieModal();
        if (typeof window.showToast === 'function') {
          window.showToast(t('singleClipExportSuccess', 'Media saved successfully!'));
        }
        if (typeof window.showExportSuccessPopup === 'function' && fullOutputPath) {
          window.showExportSuccessPopup(fullOutputPath);
        }
      } else {
        var err = (res && res.error) ? res.error : 'Rendering failed';
        if (progStatus) progStatus.textContent = err;
        if (typeof window.showToast === 'function') {
          window.showToast('Save error: ' + err, true);
        }
        if (confirmBtn) confirmBtn.disabled = false;
      }
    } catch (ex) {
      if (progStatus) progStatus.textContent = ex.message;
      if (typeof window.showToast === 'function') {
        window.showToast('Save error: ' + ex.message, true);
      }
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  // ── Global Interface ────────────────────────────────────────────────────────
  window.mediaConverter = {
    convertSingle: function (id) {
      var item = _queue.find(function (i) { return i.id === id; });
      if (item) convertItem(item);
    },
    cancelSingle: async function (id) {
      var item = _queue.find(function (i) { return i.id === id; });
      if (item && item.status === 'converting') {
        if (window.Desktop && typeof window.Desktop.mediaCancel === 'function') {
          await window.Desktop.mediaCancel({ jobId: item.id });
        }
        item.status = 'error';
        item.error = t('conversionCancelledByUser', 'Cancelled by user');
        renderQueue();
      }
    },
    removeSingle: function (id) {
      _queue = _queue.filter(function (i) { return i.id !== id; });
      renderQueue();
    },
    previewSingle: function (id) {
      var item = _queue.find(function (i) { return i.id === id; });
      if (item) selectFileForPreview(item);
    },
    addTimelineClip: function (fileOrPath) {
      return addClipToTimeline(fileOrPath);
    },
    splitTimelineClip: function () {
      return splitClipAtPlayhead();
    },
    openSaveMovie: function (scope, clipId) {
      openSaveMovieModal(scope, clipId);
    },
    exportTimeline: function () {
      return openSaveMovieModal('all');
    }
  };

  // ── Tour Helper ─────────────────────────────────────────────────────────────
  window.startMediaConverterTour = function () {
    if (!window.Tutorial || typeof window.Tutorial.start !== 'function') return;

    var isEditorMode = document.getElementById('timelineEditorPanel') &&
      document.getElementById('timelineEditorPanel').style.display !== 'none';

    var steps = [];

    if (isEditorMode) {
      steps = [
        {
          selector: '.movie-maker-ribbon',
          title: t('tourEditorRibbonTitle', 'Movie Maker Ribbon'),
          text: t('tourEditorRibbonDesc', 'Access all core video editing tools: Add clips, Split Here (S), Set Start/End points, Delete, and Save Movie.')
        },
        {
          selector: '#splitInstructionTip',
          title: t('tourEditorSplitTipTitle', 'Split Media with Precision'),
          text: t('tourEditorSplitTipDesc', 'Scrub the video or use frame-step buttons (-0.1s / +0.1s) to reach the exact frame, then click "Split Here" or press key S.')
        },
        {
          selector: '#timelineSplitHereMonitorBtn',
          title: t('tourEditorMonitorSplitTitle', 'Split Here Button'),
          text: t('tourEditorMonitorSplitDesc', 'Instant 1-click cutting right below the video monitor. Cuts your clip into two separate parts.')
        },
        {
          selector: '.timeline-track-container',
          title: t('tourEditorStoryboardTitle', 'Storyboard Sequence'),
          text: t('tourEditorStoryboardDesc', 'Reorder your clips, preview trim ranges, and click the transition box between clips to add smooth crossfades.')
        },
        {
          selector: '#timelineSaveMovieBtn',
          title: t('tourEditorSaveTitle', 'Save Movie / Edited File'),
          text: t('tourEditorSaveDesc', 'Conveniently export your full merged sequence or just a single cut clip using 1-click presets for classroom (720p), Full HD (1080p), LMS, or audio MP3.')
        }
      ];
    } else {
      steps = [
        {
          selector: '.view-mode-tabs',
          title: t('modeTimelineEditor', 'Video & Sound Editor (Movie Maker)'),
          text: t('tourMediaTimelineModeDesc', 'Switch between Batch Converter and Timeline Studio to split, merge, and apply fade transitions across clips.')
        },
        {
          selector: '#dropzonePanel',
          title: t('tourMediaDropTitle', 'Drag & Drop Media Files'),
          text: t('tourMediaDropDesc', 'Drop any video or audio file here or click Browse. Supports MP4, WebM, WebP, MP3, WAV, M4A, FLAC, AVI, MOV, and MKV.')
        },
        {
          selector: '#presetsPanel',
          title: t('tourMediaPresetsTitle', 'Teacher Quick Presets'),
          text: t('tourMediaPresetsDesc', 'One-click configurations tailored for classroom needs: 720p Video, Oral Exam MP3, Audio Extraction, LMS compressed files, and slow listening speed.')
        },
        {
          selector: '#formatSettingsPanel',
          title: t('tourMediaFormatTitle', 'Target Format & Quality'),
          text: t('tourMediaFormatDesc', 'Select your target container format, video resolution (from 1080p down to 360p), and audio bitrate.')
        },
        {
          selector: '#audioEnhancementPanel',
          title: t('tourMediaFiltersTitle', 'Audio Filters & Speech Enhancements'),
          text: t('tourMediaFiltersDesc', 'Normalize volume to boost quiet student recordings, adjust listening speed for language learners, and select mono or stereo channels.')
        },
        {
          selector: '#queuePanel',
          title: t('tourMediaQueueTitle', 'Conversion Queue & Progress'),
          text: t('tourMediaQueueDesc', 'Monitor live conversion progress, speed, and cancel or preview files. Click Convert All to process your batch.')
        }
      ];
    }

    steps = steps.filter(function (s) {
      return document.querySelector(s.selector) !== null;
    });

    window.Tutorial.start(steps, {
      next: t('tourNext', 'Next →'),
      prev: t('tourPrev', '← Back'),
      skip: t('tourSkip', 'Skip'),
      done: t('tourDone', 'Done ✓')
    });
  };

})();
