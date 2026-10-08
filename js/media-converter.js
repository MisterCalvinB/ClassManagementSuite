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
    renderQueue();
    await checkUrlInputParam();
  });

  async function checkUrlInputParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var inputPath = params.get('input') || params.get('file') || params.get('path');
      if (!inputPath) return;
      inputPath = decodeURIComponent(inputPath).trim();
      if (!inputPath) return;

      var fullPath = inputPath;
      var size = 0;
      var parts = inputPath.replace(/\\/g, '/').split('/');
      var fileName = parts.pop() || 'media_file';
      var ext = (fileName.split('.').pop() || '').toLowerCase();

      if (window.Desktop) {
        if (typeof window.Desktop.resolvePath === 'function' && !inputPath.includes(':') && !inputPath.startsWith('/') && !inputPath.startsWith('\\')) {
          var resolved = await window.Desktop.resolvePath('user', inputPath);
          if (resolved) {
            fullPath = resolved.replace(/^file:\/\//, '');
            if (fullPath.startsWith('/') && fullPath.charAt(2) === ':') fullPath = fullPath.slice(1);
          }
        }
        if (typeof window.Desktop.statByPath === 'function') {
          var statRes = await window.Desktop.statByPath(fullPath);
          if (statRes && statRes.ok && statRes.stat) {
            size = statRes.stat.size || 0;
          }
        }
      }

      addFilesToQueue([{
        name: fileName,
        path: fullPath,
        file: null,
        size: size,
        ext: ext
      }]);
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
    }
  };

  // ── Tour Helper ─────────────────────────────────────────────────────────────
  window.startMediaConverterTour = function () {
    if (!window.Tutorial || typeof window.Tutorial.start !== 'function') return;
    var steps = [
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
    ].filter(function (s) {
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
