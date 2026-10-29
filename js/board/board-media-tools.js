/**
 * Class Management Tools — Board Media Tools Engine
 * Voice recording, WaveSurfer audio trim, media popups, image cropping, and PDF to image conversion.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

    // ================================================================
    // VOICE RECORDING
    // ================================================================

    var _conCurrentFolderName = global._conCurrentFolderName;
    function conGetAttachmentDataUrl(att) {
      if (typeof global.conGetAttachmentDataUrl === 'function') {
        return global.conGetAttachmentDataUrl(att);
      }
      return Promise.resolve('');
    }

    // Expose folder name getter for code outside this closure
    window.conGetCurrentFolderName = function () { return global._conCurrentFolderName; };

    // Expose conGetAttachmentDataUrl for the trim popup
    window.conGetAttachmentDataUrlPublic = conGetAttachmentDataUrl;

    // WAV encoder — converts an AudioBuffer to a WAV ArrayBuffer (16-bit PCM)
    function audioBufferToWav(buffer) {
      var numCh = buffer.numberOfChannels;
      var sr = buffer.sampleRate;
      var bps = 16;
      var block = numCh * (bps / 8);
      var data = buffer.length * block;
      var ab = new ArrayBuffer(44 + data);
      var v = new DataView(ab);
      function str(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
      str(0, 'RIFF'); v.setUint32(4, 36 + data, true);
      str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); // PCM
      v.setUint16(22, numCh, true);
      v.setUint32(24, sr, true);
      v.setUint32(28, sr * block, true);
      v.setUint16(32, block, true);
      v.setUint16(34, bps, true);
      str(36, 'data'); v.setUint32(40, data, true);
      var off = 44;
      for (var i = 0; i < buffer.length; i++) {
        for (var ch = 0; ch < numCh; ch++) {
          var s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
          v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          off += 2;
        }
      }
      return ab;
    }

    var _recMediaStream = null;
    var _recMediaRecorder = null;
    var _recChunks = [];
    var _recBlob = null;
    var _recMimeType = 'audio/webm';
    var _recAnalyser = null;
    var _recAudioCtx = null;
    var _recLevelRAF = null;
    var _recTimerInterval = null;
    var _recSeconds = 0;
    var _recIsRecording = false;
    var _recSaveCheckInterval = null;
    var _recPlaceX = null, _recPlaceY = null;

    function conOpenRecordPopup(placeX, placeY) {
      _recPlaceX = (placeX !== undefined && placeX !== null) ? placeX : null;
      _recPlaceY = (placeY !== undefined && placeY !== null) ? placeY : null;
      var popup = document.getElementById('con-record-popup');
      if (!popup) return;

      _recBlob = null; _recChunks = []; _recSeconds = 0; _recIsRecording = false;
      clearInterval(_recSaveCheckInterval); _recSaveCheckInterval = null;

      var preview = document.getElementById('con-record-preview');
      if (preview) { preview.src = ''; preview.style.display = 'none'; }

      var saveBtn = document.getElementById('con-record-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.4'; }

      var mainBtn = document.getElementById('con-record-main-btn');
      if (mainBtn) mainBtn.textContent = '⏺';

      var timer = document.getElementById('con-record-timer');
      if (timer) timer.textContent = '0:00';

      var level = document.getElementById('con-record-level');
      if (level) level.style.width = '0%';

      var noConst = document.getElementById('con-record-no-const');
      if (noConst) noConst.style.display = 'none';

      popup.style.display = 'block';
      requestAnimationFrame(function () {
        popup.style.left = Math.max(10, (window.innerWidth - popup.offsetWidth) / 2) + 'px';
        popup.style.top = Math.max(10, (window.innerHeight - popup.offsetHeight) / 3) + 'px';
      });

      setTimeout(function () {
        document.addEventListener('mousedown', _recOutsideClick, { capture: true });
      }, 0);
    }

    function _recOutsideClick(e) {
      var popup = document.getElementById('con-record-popup');
      if (popup && !popup.contains(e.target) && !_recIsRecording) {
        conRecordClose();
        document.removeEventListener('mousedown', _recOutsideClick, { capture: true });
      }
    }

    window.conRecordToggle = function () {
      if (_recIsRecording) { conStopRecording(); } else { conStartRecording(); }
    };

    function conStartRecording() {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (stream) {
        _recMediaStream = stream;
        _recChunks = []; _recBlob = null; _recIsRecording = true; _recSeconds = 0;

        var mainBtn = document.getElementById('con-record-main-btn');
        if (mainBtn) mainBtn.textContent = '⏹';
        var saveBtn = document.getElementById('con-record-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.4'; }
        var preview = document.getElementById('con-record-preview');
        if (preview) { preview.src = ''; preview.style.display = 'none'; }

        _recTimerInterval = setInterval(function () {
          _recSeconds++;
          var m = Math.floor(_recSeconds / 60);
          var s = String(_recSeconds % 60).padStart(2, '0');
          var timerEl = document.getElementById('con-record-timer');
          if (timerEl) timerEl.textContent = m + ':' + s;
        }, 1000);

        _recAudioCtx = new AudioContext();
        _recAnalyser = _recAudioCtx.createAnalyser();
        _recAnalyser.fftSize = 256;
        _recAudioCtx.createMediaStreamSource(stream).connect(_recAnalyser);
        var dataArr = new Uint8Array(_recAnalyser.frequencyBinCount);
        function updateLevel() {
          if (!_recIsRecording) return;
          _recAnalyser.getByteFrequencyData(dataArr);
          var avg = 0; for (var i = 0; i < dataArr.length; i++) avg += dataArr[i];
          avg /= dataArr.length;
          var pct = Math.min(100, (avg / 128) * 200);
          var lv = document.getElementById('con-record-level');
          if (lv) lv.style.width = pct + '%';
          _recLevelRAF = requestAnimationFrame(updateLevel);
        }
        updateLevel();

        _recMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm';
        _recMediaRecorder = new MediaRecorder(stream, { mimeType: _recMimeType });
        _recMediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) _recChunks.push(e.data);
        };
        _recMediaRecorder.onstop = async function () {
          var rawBlob = new Blob(_recChunks, { type: _recMimeType });
          try {
            var arrayBuf = await rawBlob.arrayBuffer();
            var audioCtx = new AudioContext();
            var decoded = await audioCtx.decodeAudioData(arrayBuf);
            var wavAb = audioBufferToWav(decoded);
            await audioCtx.close();
            _recBlob = new Blob([wavAb], { type: 'audio/wav' });
          } catch (e) {
            console.warn('Could not transcode recording to WAV, using raw recording:', e);
            _recBlob = rawBlob;
          }
          var preview = document.getElementById('con-record-preview');
          if (preview) { preview.src = URL.createObjectURL(_recBlob); preview.style.display = 'block'; }
          var saveBtn = document.getElementById('con-record-save-btn');
          if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }
        };
        _recMediaRecorder.start(250);
      }).catch(function (e) {
        mdbToast('⚠️ Microphone access denied: ' + (e && e.message ? e.message : String(e)));
      });
    }

    function conStopRecording() {
      _recIsRecording = false;
      clearInterval(_recTimerInterval);
      if (_recLevelRAF) { cancelAnimationFrame(_recLevelRAF); _recLevelRAF = null; }
      try { if (_recAnalyser) _recAnalyser.disconnect(); } catch (e) { }
      try { if (_recAudioCtx) _recAudioCtx.close(); } catch (e) { }
      _recAudioCtx = null; _recAnalyser = null;
      var lv = document.getElementById('con-record-level');
      if (lv) lv.style.width = '0%';
      var mainBtn = document.getElementById('con-record-main-btn');
      if (mainBtn) mainBtn.textContent = '⏺';
      if (_recMediaRecorder && _recMediaRecorder.state !== 'inactive') _recMediaRecorder.stop();
      if (_recMediaStream) { _recMediaStream.getTracks().forEach(function (t) { t.stop(); }); _recMediaStream = null; }
    }

    window.conRecordClose = function () {
      if (_recIsRecording) conStopRecording();
      clearInterval(_recSaveCheckInterval); _recSaveCheckInterval = null;
      document.removeEventListener('mousedown', _recOutsideClick, { capture: true });
      var popup = document.getElementById('con-record-popup');
      if (popup) popup.style.display = 'none';
      var preview = document.getElementById('con-record-preview');
      if (preview && preview.src && preview.src.startsWith('blob:')) { URL.revokeObjectURL(preview.src); preview.src = ''; }
    };

    window.conRecordSave = async function () {
      if (!_recBlob) { mdbToast('⚠️ No recording to save.'); return; }

      var ts = Date.now();
      var isWav = _recBlob.type === 'audio/wav';
      var filename = isWav ? ('rec-' + ts + '.wav') : ('rec-' + ts + '.webm');
      var mimeType = _recBlob.type || (isWav ? 'audio/wav' : 'audio/webm');
      var cachedUrl = URL.createObjectURL(_recBlob);

      if (_conCurrentFolderName && window.Desktop && Desktop.isElectron() && typeof Desktop.saveBlob === 'function') {
        try {
          await Desktop.saveBlob('mindmaps', filename, _recBlob, _conCurrentFolderName + '/sounds');
        } catch (_) { }
      }

      var newAtt = {
        id: 'rec-' + ts,
        name: filename,
        mime: mimeType,
        kind: 'sounds',
        size: _recBlob.size,
        file: _recBlob,
        _cachedObjectUrl: cachedUrl,
        relativePath: _conCurrentFolderName ? (_conCurrentFolderName + '/sounds/' + filename) : ''
      };
      conAttachments.push(newAtt);
      conRenderAttachmentSummary();

      var _recPlaceOpts = (_recPlaceX !== null) ? { x: _recPlaceX, y: _recPlaceY, silent: true } : { silent: true };
      await window.conInsertAttachmentById(newAtt.id, _recPlaceOpts);
      mdbToast(t ? t('recSavedOnBoard') : '✅ Recording saved and placed on board.');
      window.conRecordClose();
    };

    window.conRecordSaveAndProceed = function () {
      var saveBtn = document.getElementById('con-record-save-btn');
      if (saveBtn && _recBlob) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }
      var noConst = document.getElementById('con-record-no-const');
      if (noConst) noConst.style.display = 'none';
    };

    // ================================================================
    // AUDIO TRIM
    // ================================================================

    var _trimWaveSurfer = null;
    var _trimRegion = null;
    var _trimItem = null;

    window.conOpenTrimPopup = function (item) {
      if (!item || item.kind !== 'sounds') return;
      _trimItem = item;
      _trimRegion = null;

      var popup = document.getElementById('con-trim-popup');
      if (!popup) return;

      var fnEl = document.getElementById('con-trim-filename');
      if (fnEl) fnEl.textContent = item.name || '';

      popup.style.display = 'block';
      requestAnimationFrame(function () {
        popup.style.left = Math.max(10, (window.innerWidth - popup.offsetWidth) / 2) + 'px';
        popup.style.top = Math.max(10, (window.innerHeight - popup.offsetHeight) / 3) + 'px';
      });

      if (_trimWaveSurfer) { try { _trimWaveSurfer.destroy(); } catch (e) { } _trimWaveSurfer = null; }
      var wfEl = document.getElementById('con-trim-waveform');
      if (wfEl) wfEl.innerHTML = '';

      conGetAttachmentDataUrl(item).then(function (url) {
        if (!url) { mdbToast('⚠️ Could not load audio file.'); window.conTrimClose(); return; }

        var regPlugin = window.WaveSurfer && window.WaveSurfer.Regions ? window.WaveSurfer.Regions.create() : null;
        var plugins = regPlugin ? [regPlugin] : [];

        _trimWaveSurfer = window.WaveSurfer.create({
          container: '#con-trim-waveform',
          waveColor: '#555',
          progressColor: '#111',
          height: 80,
          url: url,
          plugins: plugins
        });

        _trimWaveSurfer.on('ready', function () {
          var dur = _trimWaveSurfer.getDuration();
          if (regPlugin) {
            _trimRegion = regPlugin.addRegion({
              start: dur * 0.05,
              end: dur * 0.95,
              color: 'rgba(0,120,215,0.15)',
              drag: true,
              resize: true
            });
            regPlugin.on('region-updated', _updateTrimInfo);
            _updateTrimInfo();
          }
          var durEl = document.getElementById('con-trim-dur');
          if (durEl && !_trimRegion) durEl.textContent = dur.toFixed(2) + 's';
        });
      });
    };

    function _updateTrimInfo() {
      if (!_trimRegion) return;
      var s = _trimRegion.start, e = _trimRegion.end;
      var el1 = document.getElementById('con-trim-start');
      var el2 = document.getElementById('con-trim-end');
      var el3 = document.getElementById('con-trim-dur');
      if (el1) el1.textContent = s.toFixed(2) + 's';
      if (el2) el2.textContent = e.toFixed(2) + 's';
      if (el3) el3.textContent = (e - s).toFixed(2) + 's';
    }

    window.conTrimPlayAll = function () { if (_trimWaveSurfer) { try { const p = _trimWaveSurfer.play(); if (p && typeof p.catch === 'function') p.catch(function () { }); } catch (e) { } } };
    window.conTrimPlaySelection = function () { if (_trimRegion) { try { const p = _trimRegion.play(); if (p && typeof p.catch === 'function') p.catch(function () { }); } catch (e) { } } };
    window.conTrimStop = function () { if (_trimWaveSurfer) _trimWaveSurfer.pause(); };

    window.conTrimClose = function () {
      if (_trimWaveSurfer) { try { _trimWaveSurfer.destroy(); } catch (e) { } _trimWaveSurfer = null; }
      _trimRegion = null; _trimItem = null;
      var popup = document.getElementById('con-trim-popup');
      if (popup) popup.style.display = 'none';
    };

    window.conTrimSave = async function () {
      if (!_trimItem || !_trimRegion || !_trimWaveSurfer) return;
      var start = _trimRegion.start, end = _trimRegion.end;
      if (end <= start) { mdbToast('⚠️ Selection is empty.'); return; }

      var btn = document.getElementById('con-trim-save-btn');
      if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }

      try {
        var url = await conGetAttachmentDataUrl(_trimItem);
        if (!url) throw new Error('Could not resolve audio file.');

        var resp = await fetch(url);
        var arrayBuf = await resp.arrayBuffer();

        var audioCtx = new AudioContext();
        var decoded = await audioCtx.decodeAudioData(arrayBuf);

        var sr = decoded.sampleRate;
        var startSample = Math.floor(start * sr);
        var endSample = Math.min(Math.ceil(end * sr), decoded.length);
        var length = endSample - startSample;
        var numCh = decoded.numberOfChannels;

        var trimmedBuf = audioCtx.createBuffer(numCh, length, sr);
        for (var ch = 0; ch < numCh; ch++) {
          trimmedBuf.copyToChannel(decoded.getChannelData(ch).slice(startSample, endSample), ch);
        }
        await audioCtx.close();

        var wavAb = audioBufferToWav(trimmedBuf);

        var baseName = (_trimItem.name || 'recording').replace(/\.(webm|wav|mp3|ogg)$/i, '');
        var trimFile = baseName + '-trimmed.wav';
        var wavBlob = new Blob([wavAb], { type: 'audio/wav' });

        if (_conCurrentFolderName && window.Desktop && Desktop.isElectron() && typeof Desktop.saveBlob === 'function') {
          try {
            await Desktop.saveBlob('mindmaps', trimFile, wavBlob, _conCurrentFolderName + '/sounds');
          } catch (_) { }
        }

        var newAtt = {
          id: 'trim-' + Date.now(),
          name: trimFile,
          mime: 'audio/wav',
          kind: 'sounds',
          size: wavAb.byteLength,
          file: wavBlob,
          _cachedObjectUrl: URL.createObjectURL(wavBlob),
          relativePath: _conCurrentFolderName ? (_conCurrentFolderName + '/sounds/' + trimFile) : ''
        };
        conAttachments.push(newAtt);
        conRenderAttachmentSummary();

        await window.conInsertAttachmentById(newAtt.id, { silent: true });
        mdbToast(t ? t('recTrimSaved') : '✅ Trimmed recording saved and placed on board.');
        window.conTrimClose();
      } catch (e) {
        mdbToast('⚠️ Trim failed: ' + (e && e.message ? e.message : String(e)));
        if (btn) { btn.disabled = false; btn.textContent = t ? t('saveTrimmed') : 'Save trimmed'; }
      }
    };



    // ============================================================
    // MEDIA STYLE POPUPS — image, PDF, sound
    // ============================================================
    var _conCtxItem = window._conCtxItem || null;
    try {
      Object.defineProperty(window, '_conCtxItem', {
        configurable: true,
        enumerable: true,
        get: function () { return _conCtxItem; },
        set: function (val) { _conCtxItem = val; }
      });
    } catch (_) {}

    // ── shared helpers ──────────────────────────────────────────
    function _conMediaGetWrap(item) {
      var id = item && item.id;
      if (!id) return null;
      return document.querySelector('.con-media-item[data-id="' + id + '"]');
    }

    function _conApplyMediaStyles(item, wrap) {
      if (!item || !wrap) return;
      var bw = Number(item.borderWidth) || 0;
      if (bw > 0) {
        wrap.style.border = bw + 'px ' + (item.borderStyle || 'solid') + ' ' + (item.borderColor || '#111111');
      } else {
        wrap.style.border = '';
      }
      wrap.style.opacity = (item.opacity != null && Number.isFinite(Number(item.opacity))) ? String(item.opacity) : '';
      var contentEl = wrap.querySelector('.con-media-content');
      if (contentEl && item.kind === 'pics') {
        if (item._fullscreen) {
          _conFsApplyTransform(item, wrap);
        } else {
          contentEl.style.transform = item.rotation ? 'rotate(' + item.rotation + 'deg)' : '';
        }
      }
      wrap.classList.toggle('con-media-blink', !!item.blink);
      wrap.classList.toggle('con-media-locked', !!item.locked);
      wrap.classList.toggle('con-media-hidden', !!item.hidden);
      if (item.hidden) {
        wrap.title = 'Hidden media (double-click or press Ctrl+H to reveal)';
      } else {
        wrap.title = '';
      }
      var miniBlink = wrap.querySelector('.con-media-mini-btn[data-action="blink"]');
      if (miniBlink) miniBlink.classList.toggle('active', !!item.blink);
      var miniLock = wrap.querySelector('.con-media-mini-btn[data-action="lock"]');
      if (miniLock) {
        miniLock.innerHTML = '<img src="../assets/icons/' + (item.locked ? 'unlock' : 'lock') + '.svg" class="btn-icon" alt="" />';
        miniLock.classList.toggle('active', !!item.locked);
      }
      var miniHide = wrap.querySelector('.con-media-mini-btn[data-action="hide"]');
      if (miniHide) {
        miniHide.innerHTML = '<img src="../assets/icons/' + (item.hidden ? 'eye' : 'mask') + '.svg" class="btn-icon" alt="" />';
        miniHide.title = item.hidden ? 'Reveal (Ctrl+H)' : 'Hide (Ctrl+H)';
        miniHide.classList.toggle('active', !!item.hidden);
      }
      var miniFs = wrap.querySelector('.con-media-mini-btn[data-action="fullscreen"]');
      if (miniFs) miniFs.classList.toggle('active', !!item._fullscreen);
    }

    function _conMediaDeleteItem(item) {
      if (item) {
        if (item._pdfViewPoll) {
          clearInterval(item._pdfViewPoll);
          item._pdfViewPoll = null;
        }
        if (item._pdfDoc && typeof item._pdfDoc.destroy === 'function') {
          try { item._pdfDoc.destroy(); } catch (_) { }
          item._pdfDoc = null;
        }
      }
      var wrap = _conMediaGetWrap(item);
      if (wrap) {
        wrap.querySelectorAll('audio, video').forEach(function (m) {
          try { m.pause(); m.src = ''; m.load(); } catch (_) { }
        });
        wrap.querySelectorAll('canvas').forEach(function (c) {
          c.width = 0; c.height = 0;
        });
        wrap.remove();
      }
      if (typeof conMediaItems !== 'undefined') {
        conMediaItems = conMediaItems.filter(function (m) { return m.id !== item.id; });
      }
    }

    function _conMediaDuplicate(item) {
      var newItem = JSON.parse(JSON.stringify(item));
      newItem.id = 'cm' + Date.now();
      newItem.x = (Number(item.x) || 0) + 24;
      newItem.y = (Number(item.y) || 0) + 24;
      newItem.emojiStickers = [];
      newItem.blink = false;
      if (typeof conMediaItems !== 'undefined') conMediaItems.push(newItem);
      if (typeof conBuildMediaWidget === 'function') conBuildMediaWidget(newItem);
    }

    function _positionPopup(popup, e) {
      if (!popup) return;
      popup.style.maxHeight = Math.max(160, window.innerHeight - 16) + 'px';
      popup.style.maxWidth = Math.max(200, window.innerWidth - 16) + 'px';
      popup.style.overflowY = 'auto';
      popup.style.overflowX = 'hidden';
      var pw = popup.offsetWidth || 260;
      var ph = popup.offsetHeight || 300;
      var mx = e.clientX + 10, my = e.clientY + 8;
      if (mx + pw > window.innerWidth - 12) mx = e.clientX - pw - 10;
      if (my + ph > window.innerHeight - 12) my = window.innerHeight - ph - 12;
      mx = Math.max(8, Math.min(window.innerWidth - pw - 8, mx));
      my = Math.max(8, Math.min(window.innerHeight - ph - 8, my));
      popup.style.left = Math.round(mx) + 'px';
      popup.style.top = Math.round(my) + 'px';
      popup.style.maxHeight = Math.max(160, window.innerHeight - my - 8) + 'px';
    }

    var _conFsTransformRaf = null;
    var _conFsPendingTransformItem = null;

    function _conFsSendTransform(item) {
      if (!item || !window._conMirrorSend) return;
      window._conMirrorSend({
        type: 'media-fs-transform',
        id: item.id,
        fsZoom: item._fsZoom || 1,
        fsPanX: item._fsPanX || 0,
        fsPanY: item._fsPanY || 0
      });
    }

    function _conFsSendTransformThrottled(item) {
      if (!item || !window._conMirrorSend) return;
      _conFsPendingTransformItem = item;
      if (!_conFsTransformRaf) {
        _conFsTransformRaf = requestAnimationFrame(function () {
          _conFsTransformRaf = null;
          if (_conFsPendingTransformItem && window._conMirrorSend) {
            _conFsSendTransform(_conFsPendingTransformItem);
            _conFsPendingTransformItem = null;
          }
        });
      }
    }

    function _conFsApplyTransform(item, wrap) {
      var contentEl = wrap.querySelector('.con-media-content');
      if (!contentEl) return;
      var zoom = item._fsZoom || 1;
      var px = item._fsPanX || 0;
      var py = item._fsPanY || 0;
      var rot = (item.kind === 'pics' ? (item.rotation || 0) : 0);
      contentEl.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + zoom + ')' + (rot ? ' rotate(' + rot + 'deg)' : '');
    }
    window._conFsApplyTransform = _conFsApplyTransform;

    function _conFsMkBar(miniActions, wrap, item) {
      if (!miniActions) return;
      // For images/PDFs, add zoom controls only if not already added
      if (miniActions.querySelector('.con-fs-zoom-sep')) return;
      var sep = document.createElement('span');
      sep.className = 'con-fs-zoom-sep';
      sep.style.cssText = 'color:#bbb;padding:0 2px;font-size:11px;line-height:24px;pointer-events:none;';
      sep.textContent = '|';
      var mkB = function (label, title, fn) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'con-media-mini-btn con-fs-zoom-btn';
        b.textContent = label; b.title = title;
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
        b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
        return b;
      };
      miniActions.appendChild(sep);
      miniActions.appendChild(mkB('−', 'Zoom out', function () {
        item._fsZoom = Math.max(0.1, (item._fsZoom || 1) * 0.8);
        _conFsApplyTransform(item, wrap);
        _conFsSendTransform(item);
      }));
      miniActions.appendChild(mkB('+', 'Zoom in', function () {
        item._fsZoom = Math.min(12, (item._fsZoom || 1) * 1.25);
        _conFsApplyTransform(item, wrap);
        _conFsSendTransform(item);
      }));
      miniActions.appendChild(mkB('1:1', 'Reset zoom', function () {
        item._fsZoom = 1; item._fsPanX = 0; item._fsPanY = 0;
        _conFsApplyTransform(item, wrap);
        _conFsSendTransform(item);
      }));
    }

    // ── Emoji stickers for media ─────────────────────────────────
    window.conMediaAddEmojiSticker = function (item, emoji) {
      if (!item || !emoji) return;
      var board = document.getElementById('constellation-board');
      if (!board) return;
      if (!window._conBoardStickers) window._conBoardStickers = [];
      var sd = {
        id: 'bms' + Date.now(),
        emoji: emoji,
        // position just outside the top-right corner of the widget
        x: (Number(item.x) || 0) + (Number(item.w) || 0) - 10,
        y: (Number(item.y) || 0) - 10,
        size: 40
      };
      window._conBoardStickers.push(sd);
      // reuse conNoteBuildSticker — pass the board as parent so the sticker is
      // a direct child of the board div (board-absolute coords) and fully draggable
      if (typeof conNoteBuildSticker === 'function') {
        conNoteBuildSticker(sd, { emojiStickers: window._conBoardStickers }, board);
      }
    };

    window.conMediaRebuildStickers = function () {
      // Board-level stickers are rebuilt via _conRestoreBoardStickers on session load
    };

    // ── Route right-click to kind-specific popup ─────────────────
    window.conMediaCtxOpen = function (e, item) {
      e.preventDefault();
      e.stopPropagation();
      _conCtxItem = item;
      if (item.kind === 'pics') {
        window.conImgStyleOpen(e, item);
      } else if (item.kind === 'pdf') {
        window.conPdfStyleOpen(e, item);
      } else if (item.kind === 'sounds') {
        window.conSoundStyleOpen(e, item);
      }
    };

    window.conMediaCtxClose = function () {
      window.conImgStyleDismiss();
      window.conPdfStyleDismiss();
      window.conSoundStyleDismiss();
      _conCtxItem = null;
    };

    // ── IMAGE style popup ─────────────────────────────────────────
    var _conImgOverlayOpenTime = 0;

    window.conImgStyleOpen = function (e, item) {
      _conCtxItem = item;
      var overlay = document.getElementById('con-img-style-overlay');
      var popup = document.getElementById('con-img-style-popup');
      if (!overlay) return;
      _conImgOverlayOpenTime = Date.now();
      var bwSlider = document.getElementById('con-img-sp-border-width');
      var bwVal = document.getElementById('con-img-sp-border-width-val');
      var bcPicker = document.getElementById('con-img-sp-border-color');
      if (bwSlider) bwSlider.value = String(item.borderWidth || 0);
      if (bwVal) bwVal.textContent = (item.borderWidth || 0) + 'px';
      if (bcPicker) bcPicker.value = item.borderColor || '#111111';
      ['solid', 'dashed', 'dotted', 'double'].forEach(function (s) {
        var btn = document.getElementById('con-img-sp-bs-' + s);
        if (btn) btn.classList.toggle('active', (item.borderStyle || 'solid') === s);
      });
      [0, 90, 180, 270].forEach(function (d) {
        var btn = document.getElementById('con-img-sp-rot-' + d);
        if (btn) btn.classList.toggle('active', (item.rotation || 0) === d);
      });
      var opSlider = document.getElementById('con-img-sp-opacity');
      var opVal = document.getElementById('con-img-sp-opacity-val');
      var op = (item.opacity != null && Number.isFinite(Number(item.opacity))) ? Number(item.opacity) : 1;
      if (opSlider) opSlider.value = String(op);
      if (opVal) opVal.textContent = Math.round(op * 100) + '%';
      var blinkBtn = document.getElementById('con-img-sp-blink-btn');
      if (blinkBtn) blinkBtn.classList.toggle('active', !!item.blink);
      var lockBtn = document.getElementById('con-img-sp-lock-btn');
      if (lockBtn) lockBtn.innerHTML = item.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
      var hideBtn = document.getElementById('con-img-sp-hide-btn');
      if (hideBtn) hideBtn.innerHTML = item.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
      var fullBtn = document.getElementById('con-img-sp-fullscreen-btn');
      if (fullBtn) fullBtn.classList.toggle('active', !!item._fullscreen);
      var isElectron = item.relativePath && window.Desktop && Desktop.isElectron();
      var openFileBtn = document.getElementById('con-img-sp-openfile-btn');
      var openFolderBtn = document.getElementById('con-img-sp-openfolder-btn');
      if (openFileBtn) openFileBtn.style.display = isElectron ? '' : 'none';
      if (openFolderBtn) openFolderBtn.style.display = isElectron ? '' : 'none';
      overlay.classList.add('active');
      _positionPopup(popup, e);
    };
    window.conImgStyleClose = function (e) {
      if (Date.now() - _conImgOverlayOpenTime < 200) return;
      if (e && e.target !== document.getElementById('con-img-style-overlay')) return;
      window.conImgStyleDismiss();
    };
    window.conImgStyleDismiss = function () {
      var overlay = document.getElementById('con-img-style-overlay');
      if (overlay) overlay.classList.remove('active');
      _conCtxItem = null;
      window._conCtxItem = null;
    };
    window.conImgSpSetBorderWidth = function (v) {
      if (!_conCtxItem) return;
      _conCtxItem.borderWidth = v;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
    };
    window.conImgSpSetBorderStyle = function (style) {
      if (!_conCtxItem) return;
      _conCtxItem.borderStyle = style;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      ['solid', 'dashed', 'dotted', 'double'].forEach(function (s) {
        var btn = document.getElementById('con-img-sp-bs-' + s);
        if (btn) btn.classList.toggle('active', s === style);
      });
    };
    window.conImgSpSetBorderColor = function (color) {
      if (!_conCtxItem) return;
      _conCtxItem.borderColor = color;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
    };
    window.conImgSpSetRotation = function (deg) {
      if (!_conCtxItem) return;
      _conCtxItem.rotation = deg;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      [0, 90, 180, 270].forEach(function (d) {
        var btn = document.getElementById('con-img-sp-rot-' + d);
        if (btn) btn.classList.toggle('active', d === deg);
      });
    };
    window.conImgSpSetOpacity = function (v) {
      if (!_conCtxItem) return;
      _conCtxItem.opacity = v;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
    };
    window.conImgSpToggleBlink = function () {
      if (!_conCtxItem) return;
      _conCtxItem.blink = !_conCtxItem.blink;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      var btn = document.getElementById('con-img-sp-blink-btn');
      if (btn) btn.classList.toggle('active', !!_conCtxItem.blink);
    };
    window.conImgSpToggleFullscreen = function (targetItem) {
      var item = targetItem || _conCtxItem || window._conCtxItem;
      if (!item) return;
      _conCtxItem = item;
      window._conCtxItem = item;
      var wrap = _conMediaGetWrap(item);
      if (!wrap) return;
      window._conSuppressMirrorObserver = true;
      item._fullscreen = !item._fullscreen;
      wrap.classList.toggle('con-media-fullscreen', !!item._fullscreen);
      var miniActions = wrap.querySelector('.con-media-mini-actions');

      if (item._fullscreen) {
        item._fsZoom = 1; item._fsPanX = 0; item._fsPanY = 0;
        _conFsApplyTransform(item, wrap);
        if (miniActions) miniActions.classList.add('con-media-mini-visible', 'con-fs-mini-pinned');
        _conFsMkBar(miniActions, wrap, item);

        if (!wrap.querySelector('.con-media-fullscreen-exit-btn')) {
          var exitBtn = document.createElement('button');
          exitBtn.className = 'con-media-fullscreen-exit-btn';
          exitBtn.textContent = 'Exit';
          exitBtn.onclick = function (ev) { ev.stopPropagation(); window._conCtxItem = item; window.conImgSpToggleFullscreen(item); };
          wrap.appendChild(exitBtn);
        }

        item._fsWheelHandler = function (ev) {
          if (!item._fullscreen) return;
          ev.preventDefault(); ev.stopPropagation();
          var delta = ev.deltaY > 0 ? 0.9 : 1.1;
          item._fsZoom = Math.max(0.1, Math.min(12, (item._fsZoom || 1) * delta));
          _conFsApplyTransform(item, wrap);
          _conFsSendTransformThrottled(item);
        };
        wrap.addEventListener('wheel', item._fsWheelHandler, { passive: false });

        item._fsDragState = null;
        item._fsMousedownHandler = function (ev) {
          if (ev.button !== 0) return;
          if (ev.target.closest('.con-media-fullscreen-exit-btn,.con-media-remove-btn,.con-media-mini-btn,.con-media-mini-actions,.con-media-resizer')) return;
          window._conMirrorDragging = true;
          item._fsDragState = { x: ev.clientX, y: ev.clientY, px: item._fsPanX || 0, py: item._fsPanY || 0 };
          ev.preventDefault(); ev.stopImmediatePropagation();
        };
        item._fsMousemoveHandler = function (ev) {
          if (!item._fsDragState) return;
          item._fsPanX = item._fsDragState.px + (ev.clientX - item._fsDragState.x);
          item._fsPanY = item._fsDragState.py + (ev.clientY - item._fsDragState.y);
          _conFsApplyTransform(item, wrap);
          _conFsSendTransformThrottled(item);
        };
        item._fsMouseupHandler = function () {
          if (_conFsTransformRaf) { cancelAnimationFrame(_conFsTransformRaf); _conFsTransformRaf = null; }
          _conFsSendTransform(item);
          item._fsDragState = null;
          setTimeout(function () { window._conMirrorDragging = false; }, 60);
        };
        wrap.addEventListener('mousedown', item._fsMousedownHandler, true);
        document.addEventListener('mousemove', item._fsMousemoveHandler);
        document.addEventListener('mouseup', item._fsMouseupHandler);

      } else {
        if (_conFsTransformRaf) { cancelAnimationFrame(_conFsTransformRaf); _conFsTransformRaf = null; }
        if (item._fsWheelHandler) { wrap.removeEventListener('wheel', item._fsWheelHandler); delete item._fsWheelHandler; }
        if (item._fsMousedownHandler) { wrap.removeEventListener('mousedown', item._fsMousedownHandler, true); delete item._fsMousedownHandler; }
        if (item._fsMousemoveHandler) { document.removeEventListener('mousemove', item._fsMousemoveHandler); delete item._fsMousemoveHandler; }
        if (item._fsMouseupHandler) { document.removeEventListener('mouseup', item._fsMouseupHandler); delete item._fsMouseupHandler; }
        item._fsDragState = null;
        window._conMirrorDragging = false;

        if (miniActions) {
          miniActions.querySelectorAll('.con-fs-zoom-btn,.con-fs-zoom-sep').forEach(function (el) { el.remove(); });
          miniActions.classList.remove('con-media-mini-visible', 'con-fs-mini-pinned');
        }
        var contentEl = wrap.querySelector('.con-media-content');
        if (contentEl) contentEl.style.transform = item.rotation ? 'rotate(' + item.rotation + 'deg)' : '';
        item._fsZoom = 1; item._fsPanX = 0; item._fsPanY = 0;

        var exitBtn = wrap.querySelector('.con-media-fullscreen-exit-btn');
        if (exitBtn) exitBtn.remove();
      }

      var fsBtn = document.getElementById('con-img-sp-fullscreen-btn');
      if (fsBtn) fsBtn.classList.toggle('active', !!item._fullscreen);
      var miniFsBtn = wrap.querySelector('.con-media-mini-btn[data-action="fullscreen"]');
      if (miniFsBtn) miniFsBtn.classList.toggle('active', !!item._fullscreen);

      if (window._conMirrorSend) {
        window._conMirrorSend({
          type: 'media-fullscreen',
          id: item.id,
          fullscreen: !!item._fullscreen,
          fsZoom: item._fsZoom || 1,
          fsPanX: item._fsPanX || 0,
          fsPanY: item._fsPanY || 0
        });
      }
      setTimeout(function () { window._conSuppressMirrorObserver = false; }, 60);
    };
    window.conImgSpToggleLock = function () {
      if (!_conCtxItem) return;
      _conCtxItem.locked = !_conCtxItem.locked;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      var btn = document.getElementById('con-img-sp-lock-btn');
      if (btn) btn.innerHTML = _conCtxItem.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
    };
    window.conImgSpToggleHide = function () {
      if (!_conCtxItem) return;
      _conCtxItem.hidden = !_conCtxItem.hidden;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      var btn = document.getElementById('con-img-sp-hide-btn');
      if (btn) btn.innerHTML = _conCtxItem.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
      if (window._conMirrorSend) window._conMirrorSend({ type: 'media-hide', id: _conCtxItem.id, hidden: !!_conCtxItem.hidden });
    };
    window.conImgSpAddEmoji = function () {
      if (!_conCtxItem) return;
      window._pickerOpenForMedia(_conCtxItem);
    };
    window.conImgSpDuplicate = function () {
      if (!_conCtxItem) return;
      _conMediaDuplicate(_conCtxItem);
      window.conImgStyleDismiss();
    };
    window.conImgSpCrop = function () {
      var item = _conCtxItem;
      window.conImgStyleDismiss();
      if (item && typeof conOpenCropOverlay === 'function') conOpenCropOverlay(item);
    };
    window.conImgSpOpenFile = function () {
      var item = _conCtxItem;
      window.conImgStyleDismiss();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.openNative('mindmaps', item.relativePath);
    };
    window.conImgSpOpenFolder = function () {
      var item = _conCtxItem;
      window.conImgStyleDismiss();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.showInFolder('mindmaps', item.relativePath);
    };
    window.conImgSpDelete = function () {
      var item = _conCtxItem;
      window.conImgStyleDismiss();
      if (item) { _conCtxItem = null; _conMediaDeleteItem(item); }
    };

    // ── PDF style popup ───────────────────────────────────────────
    var _conPdfOverlayOpenTime = 0;

    window.conPdfStyleOpen = function (e, item) {
      _conCtxItem = item;
      var overlay = document.getElementById('con-pdf-style-overlay');
      var popup = document.getElementById('con-pdf-style-popup');
      if (!overlay) return;
      _conPdfOverlayOpenTime = Date.now();
      var bwSlider = document.getElementById('con-pdf-sp-border-width');
      var bwVal = document.getElementById('con-pdf-sp-border-width-val');
      var bcPicker = document.getElementById('con-pdf-sp-border-color');
      if (bwSlider) bwSlider.value = String(item.borderWidth || 0);
      if (bwVal) bwVal.textContent = (item.borderWidth || 0) + 'px';
      if (bcPicker) bcPicker.value = item.borderColor || '#111111';
      ['solid', 'dashed', 'dotted', 'double'].forEach(function (s) {
        var btn = document.getElementById('con-pdf-sp-bs-' + s);
        if (btn) btn.classList.toggle('active', (item.borderStyle || 'solid') === s);
      });
      var rot = ((Number(item.pdfRotation) || 0) % 360 + 360) % 360;
      [0, 90, 180, 270].forEach(function (d) {
        var btn = document.getElementById('con-pdf-sp-rot-' + d);
        if (btn) btn.classList.toggle('active', rot === d);
      });
      var opSlider = document.getElementById('con-pdf-sp-opacity');
      var opVal = document.getElementById('con-pdf-sp-opacity-val');
      var op = (item.opacity != null && Number.isFinite(Number(item.opacity))) ? Number(item.opacity) : 1;
      if (opSlider) opSlider.value = String(op);
      if (opVal) opVal.textContent = Math.round(op * 100) + '%';
      var blinkBtn = document.getElementById('con-pdf-sp-blink-btn');
      if (blinkBtn) blinkBtn.classList.toggle('active', !!item.blink);
      var lockBtn = document.getElementById('con-pdf-sp-lock-btn');
      if (lockBtn) lockBtn.innerHTML = item.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
      var hideBtn = document.getElementById('con-pdf-sp-hide-btn');
      if (hideBtn) hideBtn.innerHTML = item.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
      var lockFitBtn = document.getElementById('con-pdf-sp-lockfit-btn');
      if (lockFitBtn) lockFitBtn.classList.toggle('active', !!item.pdfLockSize);
      var fullBtn = document.getElementById('con-pdf-sp-fullscreen-btn');
      if (fullBtn) fullBtn.classList.toggle('active', !!item._fullscreen);
      var isElectron = item.relativePath && window.Desktop && Desktop.isElectron();
      var openFileBtn = document.getElementById('con-pdf-sp-openfile-btn');
      var openFolderBtn = document.getElementById('con-pdf-sp-openfolder-btn');
      if (openFileBtn) openFileBtn.style.display = isElectron ? '' : 'none';
      if (openFolderBtn) openFolderBtn.style.display = isElectron ? '' : 'none';
      overlay.classList.add('active');
      _positionPopup(popup, e);
    };
    window.conPdfStyleClose = function (e) {
      if (Date.now() - _conPdfOverlayOpenTime < 200) return;
      if (e && e.target !== document.getElementById('con-pdf-style-overlay')) return;
      window.conPdfStyleDismiss();
    };
    window.conPdfStyleDismiss = function () {
      var overlay = document.getElementById('con-pdf-style-overlay');
      if (overlay) overlay.classList.remove('active');
      _conCtxItem = null;
      window._conCtxItem = null;
    };
    window.conPdfSpSetBorderWidth = function (v) {
      if (!_conCtxItem) return;
      _conCtxItem.borderWidth = v;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
    };
    window.conPdfSpSetBorderStyle = function (style) {
      if (!_conCtxItem) return;
      _conCtxItem.borderStyle = style;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      ['solid', 'dashed', 'dotted', 'double'].forEach(function (s) {
        var btn = document.getElementById('con-pdf-sp-bs-' + s);
        if (btn) btn.classList.toggle('active', s === style);
      });
    };
    window.conPdfSpSetBorderColor = function (color) {
      if (!_conCtxItem) return;
      _conCtxItem.borderColor = color;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
    };
    window.conPdfSpSetRotation = function (deg) {
      if (!_conCtxItem) return;
      _conCtxItem.pdfRotation = deg;
      _conCtxItem.pdfScrollX = 0; _conCtxItem.pdfScrollY = 0;
      var wrap = _conMediaGetWrap(_conCtxItem);
      if (wrap) {
        var canvas = wrap.querySelector('canvas.con-media-pdf-canvas');
        var scrollDiv = wrap.querySelector('.con-media-pdf-scroll');
        var contentEl = wrap.querySelector('.con-media-content');
        if (canvas && typeof conRenderPdfForItem === 'function') conRenderPdfForItem(_conCtxItem, canvas, scrollDiv, contentEl);
        if (window._conMirrorSend) window._conMirrorSend({ type: 'pdf-view-state', itemId: String(_conCtxItem.id), pdfZoom: _conCtxItem.pdfZoom || 1, pdfRotation: deg, pdfScrollX: 0, pdfScrollY: 0, pdfLockSize: !!_conCtxItem.pdfLockSize });
      }
      [0, 90, 180, 270].forEach(function (d) {
        var btn = document.getElementById('con-pdf-sp-rot-' + d);
        if (btn) btn.classList.toggle('active', d === deg);
      });
    };
    window.conPdfSpSetOpacity = function (v) {
      if (!_conCtxItem) return;
      _conCtxItem.opacity = v;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
    };
    window.conPdfSpToggleBlink = function () {
      if (!_conCtxItem) return;
      _conCtxItem.blink = !_conCtxItem.blink;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      var btn = document.getElementById('con-pdf-sp-blink-btn');
      if (btn) btn.classList.toggle('active', !!_conCtxItem.blink);
    };
    window.conPdfSpToggleFullscreen = function (targetItem) {
      var item = targetItem || _conCtxItem || window._conCtxItem;
      if (!item) return;
      _conCtxItem = item;
      window._conCtxItem = item;
      var wrap = _conMediaGetWrap(item);
      if (!wrap) return;
      window._conSuppressMirrorObserver = true;
      item._fullscreen = !item._fullscreen;
      wrap.classList.toggle('con-media-fullscreen', !!item._fullscreen);
      var miniActions = wrap.querySelector('.con-media-mini-actions');

      if (item._fullscreen) {
        item._fsZoom = 1; item._fsPanX = 0; item._fsPanY = 0;
        _conFsApplyTransform(item, wrap);
        if (miniActions) miniActions.classList.add('con-media-mini-visible', 'con-fs-mini-pinned');
        _conFsMkBar(miniActions, wrap, item);

        if (!wrap.querySelector('.con-media-fullscreen-exit-btn')) {
          var exitBtn = document.createElement('button');
          exitBtn.className = 'con-media-fullscreen-exit-btn';
          exitBtn.textContent = 'Exit';
          exitBtn.onclick = function (ev) { ev.stopPropagation(); window._conCtxItem = item; window.conPdfSpToggleFullscreen(item); };
          wrap.appendChild(exitBtn);
        }

        var c = wrap.querySelector('canvas.con-media-pdf-canvas');
        var s = wrap.querySelector('.con-media-pdf-scroll');
        var x = wrap.querySelector('.con-media-content');
        if (c && typeof conRenderPdfForItem === 'function') {
          conRenderPdfForItem(item, c, s, x);
        }

        item._fsWheelHandler = function (ev) {
          if (!item._fullscreen) return;
          ev.preventDefault(); ev.stopPropagation();
          var delta = ev.deltaY > 0 ? 0.9 : 1.1;
          item._fsZoom = Math.max(0.1, Math.min(12, (item._fsZoom || 1) * delta));
          _conFsApplyTransform(item, wrap);
          _conFsSendTransformThrottled(item);
        };
        wrap.addEventListener('wheel', item._fsWheelHandler, { passive: false });

        item._fsDragState = null;
        item._fsMousedownHandler = function (ev) {
          if (ev.button !== 0) return;
          if (ev.target.closest('.con-media-fullscreen-exit-btn,.con-media-remove-btn,.con-media-mini-btn,.con-media-mini-actions,.con-media-resizer')) return;
          window._conMirrorDragging = true;
          item._fsDragState = { x: ev.clientX, y: ev.clientY, px: item._fsPanX || 0, py: item._fsPanY || 0 };
          ev.preventDefault(); ev.stopImmediatePropagation();
        };
        item._fsMousemoveHandler = function (ev) {
          if (!item._fsDragState) return;
          item._fsPanX = item._fsDragState.px + (ev.clientX - item._fsDragState.x);
          item._fsPanY = item._fsDragState.py + (ev.clientY - item._fsDragState.y);
          _conFsApplyTransform(item, wrap);
          _conFsSendTransformThrottled(item);
        };
        item._fsMouseupHandler = function () {
          if (_conFsTransformRaf) { cancelAnimationFrame(_conFsTransformRaf); _conFsTransformRaf = null; }
          _conFsSendTransform(item);
          item._fsDragState = null;
          setTimeout(function () { window._conMirrorDragging = false; }, 60);
        };
        wrap.addEventListener('mousedown', item._fsMousedownHandler, true);
        document.addEventListener('mousemove', item._fsMousemoveHandler);
        document.addEventListener('mouseup', item._fsMouseupHandler);

      } else {
        if (_conFsTransformRaf) { cancelAnimationFrame(_conFsTransformRaf); _conFsTransformRaf = null; }
        if (item._fsWheelHandler) { wrap.removeEventListener('wheel', item._fsWheelHandler); delete item._fsWheelHandler; }
        if (item._fsMousedownHandler) { wrap.removeEventListener('mousedown', item._fsMousedownHandler, true); delete item._fsMousedownHandler; }
        if (item._fsMousemoveHandler) { document.removeEventListener('mousemove', item._fsMousemoveHandler); delete item._fsMousemoveHandler; }
        if (item._fsMouseupHandler) { document.removeEventListener('mouseup', item._fsMouseupHandler); delete item._fsMouseupHandler; }
        item._fsDragState = null;
        window._conMirrorDragging = false;

        if (miniActions) {
          miniActions.querySelectorAll('.con-fs-zoom-btn,.con-fs-zoom-sep').forEach(function (el) { el.remove(); });
          miniActions.classList.remove('con-media-mini-visible', 'con-fs-mini-pinned');
        }
        var contentEl = wrap.querySelector('.con-media-content');
        if (contentEl) contentEl.style.transform = '';
        item._fsZoom = 1; item._fsPanX = 0; item._fsPanY = 0;

        var exitBtn = wrap.querySelector('.con-media-fullscreen-exit-btn');
        if (exitBtn) exitBtn.remove();

        var c = wrap.querySelector('canvas.con-media-pdf-canvas');
        var s = wrap.querySelector('.con-media-pdf-scroll');
        if (c && typeof conRenderPdfForItem === 'function') {
          conRenderPdfForItem(item, c, s, contentEl);
        }
      }

      var fsBtn = document.getElementById('con-pdf-sp-fullscreen-btn');
      if (fsBtn) fsBtn.classList.toggle('active', !!item._fullscreen);
      var miniFsBtn = wrap.querySelector('.con-media-mini-btn[data-action="fullscreen"]');
      if (miniFsBtn) miniFsBtn.classList.toggle('active', !!item._fullscreen);

      if (window._conMirrorSend) {
        window._conMirrorSend({
          type: 'media-fullscreen',
          id: item.id,
          fullscreen: !!item._fullscreen,
          fsZoom: item._fsZoom || 1,
          fsPanX: item._fsPanX || 0,
          fsPanY: item._fsPanY || 0
        });
      }
      setTimeout(function () { window._conSuppressMirrorObserver = false; }, 60);
    };
    window.conPdfSpToggleLock = function () {
      if (!_conCtxItem) return;
      _conCtxItem.locked = !_conCtxItem.locked;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      var btn = document.getElementById('con-pdf-sp-lock-btn');
      if (btn) btn.innerHTML = _conCtxItem.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
    };
    window.conPdfSpToggleHide = function () {
      if (!_conCtxItem) return;
      _conCtxItem.hidden = !_conCtxItem.hidden;
      _conApplyMediaStyles(_conCtxItem, _conMediaGetWrap(_conCtxItem));
      var btn = document.getElementById('con-pdf-sp-hide-btn');
      if (btn) btn.innerHTML = _conCtxItem.hidden ? '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Reveal' : '<img src="../assets/icons/mask.svg" class="btn-icon" alt="" /> Hide';
      if (window._conMirrorSend) window._conMirrorSend({ type: 'media-hide', id: _conCtxItem.id, hidden: !!_conCtxItem.hidden });
    };
    window.conPdfSpToggleLockFit = function () {
      if (!_conCtxItem) return;
      _conCtxItem.pdfLockSize = !_conCtxItem.pdfLockSize;
      var btn = document.getElementById('con-pdf-sp-lockfit-btn');
      if (btn) btn.classList.toggle('active', !!_conCtxItem.pdfLockSize);
      var wrap = _conMediaGetWrap(_conCtxItem);
      if (wrap) {
        var canvas = wrap.querySelector('canvas.con-media-pdf-canvas');
        var scrollDiv = wrap.querySelector('.con-media-pdf-scroll');
        var contentEl = wrap.querySelector('.con-media-content');
        var miniBtn = wrap.querySelector('.con-media-mini-btn[data-action="lockfit"]');
        if (miniBtn) miniBtn.classList.toggle('active', !!_conCtxItem.pdfLockSize);

        if (canvas && typeof conRenderPdfForItem === 'function') {
          conRenderPdfForItem(_conCtxItem, canvas, scrollDiv, contentEl).then(function () {
            if (window._conMirrorBroadcast) window._conMirrorBroadcast();
            if (window._conMirrorSend) window._conMirrorSend({
              type: 'pdf-view-state', itemId: String(_conCtxItem.id),
              pdfZoom: _conCtxItem.pdfZoom || 1, pdfRotation: _conCtxItem.pdfRotation || 0,
              pdfScrollX: _conCtxItem.pdfScrollX || 0, pdfScrollY: _conCtxItem.pdfScrollY || 0,
              pdfLockSize: !!_conCtxItem.pdfLockSize
            });
          });
        }
      }
    };
    window.conPdfSpAddEmoji = function () {
      if (!_conCtxItem) return;
      window._pickerOpenForMedia(_conCtxItem);
    };
    window.conPdfSpDuplicate = function () {
      if (!_conCtxItem) return;
      _conMediaDuplicate(_conCtxItem);
      window.conPdfStyleDismiss();
    };
    window.conPdfSpOpenFile = function () {
      var item = _conCtxItem;
      window.conPdfStyleDismiss();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.openNative('mindmaps', item.relativePath);
    };
    window.conPdfSpOpenFolder = function () {
      var item = _conCtxItem;
      window.conPdfStyleDismiss();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.showInFolder('mindmaps', item.relativePath);
    };
    window.conPdfSpDelete = function () {
      var item = _conCtxItem;
      window.conPdfStyleDismiss();
      if (item) { _conCtxItem = null; _conMediaDeleteItem(item); }
    };

    // ── SOUND style popup ─────────────────────────────────────────
    var _conSoundOverlayOpenTime = 0;

    window.conSoundStyleOpen = function (e, item) {
      _conCtxItem = item;
      var overlay = document.getElementById('con-sound-style-overlay');
      var popup = document.getElementById('con-sound-style-popup');
      if (!overlay) return;
      _conSoundOverlayOpenTime = Date.now();
      var lockBtn = document.getElementById('con-sound-sp-lock-btn');
      if (lockBtn) lockBtn.innerHTML = item.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
      var isElectron = item.relativePath && window.Desktop && Desktop.isElectron();
      var openFileBtn = document.getElementById('con-sound-sp-openfile-btn');
      var openFolderBtn = document.getElementById('con-sound-sp-openfolder-btn');
      if (openFileBtn) openFileBtn.style.display = isElectron ? '' : 'none';
      if (openFolderBtn) openFolderBtn.style.display = isElectron ? '' : 'none';
      overlay.classList.add('active');
      _positionPopup(popup, e);
    };
    window.conSoundStyleClose = function (e) {
      if (Date.now() - _conSoundOverlayOpenTime < 200) return;
      if (e && e.target !== document.getElementById('con-sound-style-overlay')) return;
      window.conSoundStyleDismiss();
    };
    window.conSoundStyleDismiss = function () {
      var overlay = document.getElementById('con-sound-style-overlay');
      if (overlay) overlay.classList.remove('active');
      _conCtxItem = null;
      window._conCtxItem = null;
    };
    window.conSoundSpTrim = function () {
      var item = _conCtxItem;
      window.conSoundStyleDismiss();
      if (item && typeof window.conOpenTrimPopup === 'function') window.conOpenTrimPopup(item);
    };
    window.conSoundSpToggleLock = function () {
      if (!_conCtxItem) return;
      _conCtxItem.locked = !_conCtxItem.locked;
      var wrap = _conMediaGetWrap(_conCtxItem);
      if (wrap) wrap.classList.toggle('con-media-locked', !!_conCtxItem.locked);
      var btn = document.getElementById('con-sound-sp-lock-btn');
      if (btn) btn.innerHTML = _conCtxItem.locked ? '<img src="../assets/icons/unlock.svg" class="btn-icon" alt="" /> Unlock' : '<img src="../assets/icons/lock.svg" class="btn-icon" alt="" /> Lock';
    };
    window.conSoundSpOpenFile = function () {
      var item = _conCtxItem;
      window.conSoundStyleDismiss();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.openNative('mindmaps', item.relativePath);
    };
    window.conSoundSpOpenFolder = function () {
      var item = _conCtxItem;
      window.conSoundStyleDismiss();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.showInFolder('mindmaps', item.relativePath);
    };
    window.conSoundSpDelete = function () {
      var item = _conCtxItem;
      window.conSoundStyleDismiss();
      if (item) { _conCtxItem = null; _conMediaDeleteItem(item); }
    };

    // ============================================================
    // AUDIO TRANSCRIPT STUDIO
    // ============================================================
    var _transcriptActiveItem = null;
    var _transcriptActiveAttachment = null;
    var _transcriptActiveFile = null;
    var _transcriptCurrentJobId = null;
    var _transcriptImportPillTimer = null;
    var _transcriptPendingImport = null;

    window.conSoundSpTranscribe = function () {
      var item = _conCtxItem;
      window.conSoundStyleDismiss();
      if (item) {
        window.conOpenAudioTranscript(item);
      }
    };

    window.conAudioImportPillTranscribe = function () {
      var pending = _transcriptPendingImport;
      window.conDismissAudioImportPill();
      if (pending) {
        window.conOpenAudioTranscript(pending);
      }
    };

    window.conDismissAudioImportPill = function () {
      if (_transcriptImportPillTimer) {
        clearTimeout(_transcriptImportPillTimer);
        _transcriptImportPillTimer = null;
      }
      var pill = document.getElementById('con-audio-import-pill');
      if (pill) pill.style.display = 'none';
      _transcriptPendingImport = null;
    };

    window.conShowAudioImportPill = function (info) {
      if (!info) return;
      _transcriptPendingImport = info;
      var pill = document.getElementById('con-audio-import-pill');
      var msgEl = document.getElementById('con-audio-import-msg-text');
      if (!pill) return;

      var name = info.name || (info.file && info.file.name) || 'Audio';
      if (msgEl) {
        var fmt = (window.i18n && typeof i18n.t === 'function')
          ? i18n.t('conAudioImportedTranscribePrompt', { name: name })
          : ('Audio imported: ' + name);
        msgEl.textContent = fmt;
      }

      pill.style.display = 'flex';

      if (_transcriptImportPillTimer) clearTimeout(_transcriptImportPillTimer);
      _transcriptImportPillTimer = setTimeout(function () {
        window.conDismissAudioImportPill();
      }, 10000);
    };

    window.conTranscriptOverlayClick = function (e) {
      if (e.target === document.getElementById('con-transcript-overlay')) {
        window.conCloseTranscriptModal();
      }
    };

    window.conCloseTranscriptModal = function () {
      if (_transcriptCurrentJobId && window.SpeechTranscriber) {
        window.SpeechTranscriber.cancelFileTranscription(_transcriptCurrentJobId);
        _transcriptCurrentJobId = null;
      }
      var overlay = document.getElementById('con-transcript-overlay');
      if (overlay) overlay.style.display = 'none';
      _transcriptActiveItem = null;
      _transcriptActiveAttachment = null;
      _transcriptActiveFile = null;
    };

    window.conCancelTranscript = function () {
      if (_transcriptCurrentJobId && window.SpeechTranscriber) {
        window.SpeechTranscriber.cancelFileTranscription(_transcriptCurrentJobId);
        _transcriptCurrentJobId = null;
      }
      var pBox = document.getElementById('con-transcript-progress-box');
      var eBox = document.getElementById('con-transcript-editor-box');
      var reBtn = document.getElementById('con-transcript-retranscribe-btn');
      if (pBox) pBox.style.display = 'none';
      if (eBox) eBox.style.display = 'flex';
      if (reBtn) reBtn.style.display = 'inline-flex';
    };

    window.conTranscriptUpdateWordCount = function () {
      var textarea = document.getElementById('con-transcript-textarea');
      var countEl = document.getElementById('con-transcript-word-count');
      if (!textarea || !countEl) return;
      var val = textarea.value.trim();
      var words = val ? val.split(/\s+/).length : 0;
      countEl.textContent = words + (words === 1 ? ' word' : ' words');
    };

    window.conTranscriptChangeLanguage = function (lang) {
      if (window.SpeechTranscriber && typeof window.SpeechTranscriber.setLanguage === 'function') {
        window.SpeechTranscriber.setLanguage(lang);
      }
    };

    window.conOpenAudioTranscript = async function (target, options) {
      options = options || {};
      _transcriptActiveItem = null;
      _transcriptActiveAttachment = null;
      _transcriptActiveFile = null;

      if (!target) return;

      var name = '';
      var existingTranscript = '';

      if (target.kind === 'sounds' || target.attachmentId) {
        _transcriptActiveItem = target;
        name = target.name || '';
        existingTranscript = target.transcript || '';
        var linkedAtt = (typeof conFindAttachmentById === 'function') ? conFindAttachmentById(target.attachmentId) : null;
        if (linkedAtt) {
          _transcriptActiveAttachment = linkedAtt;
          if (!existingTranscript && linkedAtt.transcript) existingTranscript = linkedAtt.transcript;
          if (!name && linkedAtt.name) name = linkedAtt.name;
        }
      } else if (target.kind === 'sounds' || (target.mime && target.mime.startsWith('audio/'))) {
        _transcriptActiveAttachment = target;
        name = target.name || '';
        existingTranscript = target.transcript || '';
      } else if (target instanceof File || (target.file instanceof File)) {
        var f = target instanceof File ? target : target.file;
        _transcriptActiveFile = f;
        name = f.name || 'audio';
      }

      var overlay = document.getElementById('con-transcript-overlay');
      var metaEl = document.getElementById('con-transcript-meta');
      var textarea = document.getElementById('con-transcript-textarea');
      var pBox = document.getElementById('con-transcript-progress-box');
      var eBox = document.getElementById('con-transcript-editor-box');
      var reBtn = document.getElementById('con-transcript-retranscribe-btn');
      var langSelect = document.getElementById('con-transcript-lang');

      if (!overlay) return;

      if (metaEl) {
        metaEl.textContent = name;
        metaEl.title = name;
      }

      if (langSelect) {
        var curLang = 'auto';
        try {
          if (window.i18n && typeof window.i18n.getLanguage === 'function') {
            curLang = window.i18n.getLanguage();
          }
        } catch (_) {}
        langSelect.value = curLang || 'auto';
      }

      var modelSelect = document.getElementById('con-transcript-model');
      if (modelSelect && window.SpeechTranscriber) {
        modelSelect.value = window.SpeechTranscriber.getActiveModel() || 'whisper-tiny';
      }

      overlay.style.display = 'flex';

      if (existingTranscript && !options.force) {
        if (textarea) textarea.value = existingTranscript;
        if (pBox) pBox.style.display = 'none';
        if (eBox) eBox.style.display = 'flex';
        if (reBtn) reBtn.style.display = 'inline-flex';
        window.conTranscriptUpdateWordCount();
      } else {
        if (textarea) textarea.value = '';
        window.conRunAudioTranscription(target);
      }
    };

    window.conTranscriptChangeModel = async function (modelId) {
      if (!window.SpeechTranscriber) return;
      try {
        var avail = await window.SpeechTranscriber.listAvailableModels();
        var found = (avail && avail.models && avail.models.find(function (m) { return m.id === modelId; }));
        if (found && !found.isInstalled) {
          if (typeof window.openWhisperModelManager === 'function') {
            window.openWhisperModelManager({
              highlightModelId: modelId,
              onModelChanged: function (newId) {
                var sel = document.getElementById('con-transcript-model');
                if (sel) sel.value = newId;
              }
            });
          }
          var curActive = window.SpeechTranscriber.getActiveModel();
          var sel = document.getElementById('con-transcript-model');
          if (sel) sel.value = curActive;
          return;
        }

        await window.SpeechTranscriber.setActiveModel(modelId);
        if (typeof showToast === 'function') {
          showToast((window.i18n && typeof i18n.t === 'function') ? i18n.t('whisperModelReady') : 'Speech model ready!');
        }
      } catch (err) {
        console.error('[TranscriptStudio] Change model error:', err);
      }
    };

    window.conRerunTranscript = function () {
      var target = _transcriptActiveItem || _transcriptActiveAttachment || _transcriptActiveFile;
      if (target) {
        window.conRunAudioTranscription(target);
      }
    };

    window.conRunAudioTranscription = async function (target) {
      var pBox = document.getElementById('con-transcript-progress-box');
      var eBox = document.getElementById('con-transcript-editor-box');
      var reBtn = document.getElementById('con-transcript-retranscribe-btn');
      var pStatus = document.getElementById('con-transcript-progress-status');
      var pPct = document.getElementById('con-transcript-progress-pct');
      var pFill = document.getElementById('con-transcript-progress-fill');
      var pPreview = document.getElementById('con-transcript-live-preview');
      var textarea = document.getElementById('con-transcript-textarea');
      var langSelect = document.getElementById('con-transcript-lang');

      if (pBox) pBox.style.display = 'flex';
      if (eBox) eBox.style.display = 'none';
      if (reBtn) reBtn.style.display = 'none';
      if (pPct) pPct.textContent = '0%';
      if (pFill) pFill.style.width = '0%';
      if (pPreview) pPreview.textContent = '';
      if (pStatus) {
        pStatus.textContent = (window.i18n && typeof i18n.t === 'function')
          ? i18n.t('conTranscriptDecoding')
          : 'Decoding and preparing audio...';
      }

      if (!window.SpeechTranscriber) {
        if (typeof showToast === 'function') {
          showToast('Speech transcriber module not loaded', true);
        }
        window.conCancelTranscript();
        return;
      }

      try {
        var audioSource = null;
        if (_transcriptActiveFile) {
          audioSource = _transcriptActiveFile;
        } else if (_transcriptActiveItem || _transcriptActiveAttachment) {
          var targetObj = _transcriptActiveItem || _transcriptActiveAttachment;
          var masterAtt = (typeof conFindAttachmentById === 'function' && targetObj)
            ? (conFindAttachmentById(targetObj.attachmentId || targetObj.id) || targetObj)
            : targetObj;

          if (targetObj && (targetObj.file instanceof Blob || (typeof File !== 'undefined' && targetObj.file instanceof File))) {
            audioSource = targetObj.file;
          } else if (masterAtt && (masterAtt.file instanceof Blob || (typeof File !== 'undefined' && masterAtt.file instanceof File))) {
            audioSource = masterAtt.file;
          } else if (targetObj && targetObj.blob instanceof Blob) {
            audioSource = targetObj.blob;
          } else if (masterAtt && masterAtt.blob instanceof Blob) {
            audioSource = masterAtt.blob;
          } else if (targetObj && targetObj.dataUrl) {
            audioSource = targetObj.dataUrl;
          } else if (masterAtt && masterAtt.dataUrl) {
            audioSource = masterAtt.dataUrl;
          } else if (targetObj && targetObj._cachedDataUrl) {
            audioSource = targetObj._cachedDataUrl;
          } else if (typeof conGetAttachmentDataUrl === 'function') {
            audioSource = await conGetAttachmentDataUrl(targetObj);
          } else if (targetObj && targetObj._cachedObjectUrl) {
            audioSource = targetObj._cachedObjectUrl;
          }
        }

        if (!audioSource) {
          throw new Error('Unable to resolve audio source file');
        }

        var selectedLang = langSelect ? langSelect.value : 'auto';

        var result = await window.SpeechTranscriber.transcribeAudio(audioSource, {
          language: selectedLang,
          onStatus: function (st) {
            if (pStatus) {
              if (st === 'loading-model') {
                pStatus.textContent = (window.i18n && typeof i18n.t === 'function')
                  ? i18n.t('conTranscriptLoadingModel')
                  : 'Loading Whisper model...';
              } else if (st === 'decoding') {
                pStatus.textContent = (window.i18n && typeof i18n.t === 'function')
                  ? i18n.t('conTranscriptDecoding')
                  : 'Decoding and preparing audio...';
              }
            }
          },
          onProgress: function (pData) {
            if (pStatus) {
              pStatus.textContent = (window.i18n && typeof i18n.t === 'function')
                ? (i18n.t('conTranscriptProcessing') + ' (' + pData.chunkIndex + '/' + pData.totalChunks + ')')
                : ('Transcribing (' + pData.chunkIndex + '/' + pData.totalChunks + ')...');
            }
            if (pPct) pPct.textContent = pData.percent + '%';
            if (pFill) pFill.style.width = pData.percent + '%';
            if (pPreview && pData.interimText) {
              pPreview.textContent = pData.interimText;
              pPreview.scrollTop = pPreview.scrollHeight;
            }
          }
        });

        var text = (result && result.text) ? result.text.trim() : '';

        // Save onto active item / attachment
        if (_transcriptActiveItem) {
          _transcriptActiveItem.transcript = text;
          var el = (typeof _conMediaGetWrap === 'function')
            ? _conMediaGetWrap(_transcriptActiveItem)
            : document.querySelector('.con-media-item[data-id="' + _transcriptActiveItem.id + '"]');
          if (el) {
            var tBtn = el.querySelector('.con-media-transcript-btn');
            if (tBtn) tBtn.classList.toggle('con-media-has-transcript', !!text);
          }
        }
        if (_transcriptActiveAttachment) {
          _transcriptActiveAttachment.transcript = text;
        }

        if (textarea) textarea.value = text;
        window.conTranscriptUpdateWordCount();

        if (pBox) pBox.style.display = 'none';
        if (eBox) eBox.style.display = 'flex';
        if (reBtn) reBtn.style.display = 'inline-flex';

        if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
      } catch (err) {
        console.error('[TranscriptStudio] Error:', err);
        if (pBox) pBox.style.display = 'none';
        if (eBox) eBox.style.display = 'flex';
        if (reBtn) reBtn.style.display = 'inline-flex';
        if (typeof showToast === 'function' && err.message !== 'Transcription cancelled') {
          showToast('Transcription failed: ' + (err.message || err), true);
        }
      }
    };

    window.conTranscriptCopy = function () {
      var textarea = document.getElementById('con-transcript-textarea');
      var text = textarea ? textarea.value.trim() : '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(function () {
        if (typeof showToast === 'function') {
          showToast((window.i18n && typeof i18n.t === 'function') ? i18n.t('conTranscriptCopied') : 'Transcript copied to clipboard!');
        }
      });
    };

    window.conTranscriptSaveToItem = function () {
      var textarea = document.getElementById('con-transcript-textarea');
      var text = textarea ? textarea.value.trim() : '';
      if (_transcriptActiveItem) {
        _transcriptActiveItem.transcript = text;
        var el = (typeof _conMediaGetWrap === 'function')
          ? _conMediaGetWrap(_transcriptActiveItem)
          : document.querySelector('.con-media-item[data-id="' + _transcriptActiveItem.id + '"]');
        if (el) {
          var tBtn = el.querySelector('.con-media-transcript-btn');
          if (tBtn) tBtn.classList.toggle('con-media-has-transcript', !!text);
        }
      }
      if (_transcriptActiveAttachment) {
        _transcriptActiveAttachment.transcript = text;
      }
      if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
      if (typeof showToast === 'function') {
        showToast((window.i18n && typeof i18n.t === 'function') ? i18n.t('conTranscriptSaved') : 'Transcript saved to audio item.');
      }
      window.conCloseTranscriptModal();
    };

    window.conTranscriptInsertAsNote = function () {
      var textarea = document.getElementById('con-transcript-textarea');
      var text = textarea ? textarea.value.trim() : '';
      if (!text) {
        if (typeof showToast === 'function') showToast('No transcript text to insert', true);
        return;
      }

      var posX = 100, posY = 100;
      if (_transcriptActiveItem && Number.isFinite(_transcriptActiveItem.x) && Number.isFinite(_transcriptActiveItem.y)) {
        posX = _transcriptActiveItem.x + (_transcriptActiveItem.w || 220) + 30;
        posY = _transcriptActiveItem.y;
      } else {
        var brd = document.getElementById('board') || document.getElementById('constellation-board');
        if (brd) {
          posX = (brd.scrollLeft || 0) + Math.round(brd.clientWidth / 2) - 120;
          posY = (brd.scrollTop || 0) + Math.round(brd.clientHeight / 2) - 80;
        }
      }

      if (typeof window.conNoteAdd === 'function') {
        window.conNoteAdd(Math.max(20, posX), Math.max(20, posY), text);
      } else if (typeof window.conAddWordAt === 'function') {
        window.conAddWordAt(text, Math.max(20, posX), Math.max(20, posY));
      }

      if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
      if (typeof showToast === 'function') {
        showToast((window.i18n && typeof i18n.t === 'function') ? i18n.t('conTranscriptNoteCreated') : 'Transcript added as sticky note.');
      }
      window.conCloseTranscriptModal();
    };

    window.conTranscriptInsertAsNodes = function () {
      var textarea = document.getElementById('con-transcript-textarea');
      var text = textarea ? textarea.value.trim() : '';
      if (!text) {
        if (typeof showToast === 'function') showToast('No transcript text to insert', true);
        return;
      }

      var rawSentences = text.split(/(?<=[.?!;:\n])\s+/);
      var sentences = rawSentences.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
      if (sentences.length === 0) sentences = [text];

      var startX = 120, startY = 120;
      if (_transcriptActiveItem && Number.isFinite(_transcriptActiveItem.x) && Number.isFinite(_transcriptActiveItem.y)) {
        startX = _transcriptActiveItem.x + (_transcriptActiveItem.w || 220) + 40;
        startY = _transcriptActiveItem.y;
      } else {
        var brd = document.getElementById('board') || document.getElementById('constellation-board');
        if (brd) {
          startX = (brd.scrollLeft || 0) + 100;
          startY = (brd.scrollTop || 0) + 100;
        }
      }

      var placed = 0;
      sentences.forEach(function (sentence, idx) {
        var x = startX + (Math.floor(idx % 3) * 220);
        var y = startY + (Math.floor(idx / 3) * 90);
        if (typeof window.conAddWordAt === 'function') {
          window.conAddWordAt(sentence, x, y);
          placed++;
        }
      });

      if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
      if (typeof showToast === 'function') {
        showToast((window.i18n && typeof i18n.t === 'function') ? i18n.t('conTranscriptNodesCreated') : ('Added ' + placed + ' concept nodes.'));
      }
      window.conCloseTranscriptModal();
    };

    window.conTranscriptExport = async function () {
      var textarea = document.getElementById('con-transcript-textarea');
      var text = textarea ? textarea.value.trim() : '';
      if (!text) return;

      var name = 'Transcript';
      if (_transcriptActiveItem && _transcriptActiveItem.name) {
        name = _transcriptActiveItem.name.replace(/\.[a-z0-9]+$/i, '');
      } else if (_transcriptActiveAttachment && _transcriptActiveAttachment.name) {
        name = _transcriptActiveAttachment.name.replace(/\.[a-z0-9]+$/i, '');
      }

      var defaultFilename = 'Transcript_' + (name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'audio') + '.md';

      var mdContent = '# Audio Transcript: ' + name + '\n\n' +
        '- **Generated:** ' + new Date().toLocaleString() + '\n' +
        '- **Source:** Class Management Tools Board\n\n' +
        '---\n\n' +
        '## Transcript Text\n\n' +
        text + '\n';

      if (typeof window.saveExportWithDestination === 'function') {
        await window.saveExportWithDestination({
          content: mdContent,
          filename: defaultFilename,
          filters: [
            { name: 'Markdown (*.md)', extensions: ['md'] },
            { name: 'Text Document (*.txt)', extensions: ['txt'] }
          ],
          title: 'Export Audio Transcript'
        });
      } else {
        var blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = defaultFilename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    };

    // ── Emoji picker adapter for media ───────────────────────────
    window._pickerOpenForMedia = function (item) {
      if (!item) return;
      window._conMediaEmojiPendingItem = item;
      var picker = document.getElementById('con-emoji-picker');
      if (!picker) {
        if (typeof showPrompt === 'function') {
          showPrompt('Enter emoji:').then(function (emoji) {
            if (emoji) window.conMediaAddEmojiSticker(item, emoji.trim());
          });
        } else {
          var emoji = window.prompt('Enter emoji:');
          if (emoji) window.conMediaAddEmojiSticker(item, emoji.trim());
        }
        return;
      }
      picker.querySelectorAll('button').forEach(function (btn) {
        if (btn._mediaOverride) btn.removeEventListener('click', btn._mediaOverride, true);
        var handler = function (ev) {
          ev.stopPropagation();
          var pendingItem = window._conMediaEmojiPendingItem;
          if (pendingItem) window.conMediaAddEmojiSticker(pendingItem, btn.textContent);
          window._conMediaEmojiPendingItem = null;
          picker.classList.remove('active');
          picker.querySelectorAll('button').forEach(function (b) {
            if (b._mediaOverride) { b.removeEventListener('click', b._mediaOverride, true); delete b._mediaOverride; }
          });
        };
        btn._mediaOverride = handler;
        btn.addEventListener('click', handler, true);
      });
      picker.classList.add('active');
    };

    // ── Legacy helpers kept for backward compat ───────────────────
    window.conMediaCtxToggleLock = function () {
      if (!_conCtxItem) return;
      _conCtxItem.locked = !_conCtxItem.locked;
      var wrap = _conMediaGetWrap(_conCtxItem);
      if (wrap) wrap.classList.toggle('con-media-locked', !!_conCtxItem.locked);
      window.conMediaCtxClose();
    };
    window.conMediaCtxCrop = function () {
      var item = _conCtxItem;
      window.conMediaCtxClose();
      if (item && typeof conOpenCropOverlay === 'function') conOpenCropOverlay(item);
    };
    window.conMediaCtxTrim = function () {
      var item = _conCtxItem;
      window.conMediaCtxClose();
      if (item && item.kind === 'sounds' && typeof window.conOpenTrimPopup === 'function') window.conOpenTrimPopup(item);
    };
    window.conMediaCtxOpenFile = function () {
      var item = _conCtxItem;
      window.conMediaCtxClose();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.openNative('mindmaps', item.relativePath);
    };
    window.conMediaCtxOpenFolder = function () {
      var item = _conCtxItem;
      window.conMediaCtxClose();
      if (item && item.relativePath && window.Desktop && Desktop.isElectron()) Desktop.showInFolder('mindmaps', item.relativePath);
    };

    document.addEventListener('click', function (e) {
      var imgOv = document.getElementById('con-img-style-overlay');
      if (imgOv && imgOv.classList.contains('active') && !imgOv.contains(e.target)) window.conImgStyleDismiss();
      var pdfOv = document.getElementById('con-pdf-style-overlay');
      if (pdfOv && pdfOv.classList.contains('active') && !pdfOv.contains(e.target)) window.conPdfStyleDismiss();
      var sndOv = document.getElementById('con-sound-style-overlay');
      if (sndOv && sndOv.classList.contains('active') && !sndOv.contains(e.target)) window.conSoundStyleDismiss();
    });

    // ============================================================
    // IMAGE CROP OVERLAY
    // ============================================================
    var _conCropItem = null;
    var _conCropNatW = 0, _conCropNatH = 0;
    var _conCropDispW = 0, _conCropDispH = 0;
    var _conCropRect = { x: 0, y: 0, w: 100, h: 100 };
    var _conCropDrag = null;

    function _conCropGetImgOffset() {
      var imgEl = document.getElementById('con-crop-img');
      var container = document.getElementById('con-crop-container');
      if (!imgEl || !container) return { x: 0, y: 0 };
      var ir = imgEl.getBoundingClientRect();
      var cr = container.getBoundingClientRect();
      return { x: ir.left - cr.left, y: ir.top - cr.top };
    }

    function _conCropUpdateRectEl() {
      var rectEl = document.getElementById('con-crop-rect');
      var container = document.getElementById('con-crop-container');
      if (!rectEl || !container) return;
      var offset = _conCropGetImgOffset();
      var rx = offset.x + _conCropRect.x;
      var ry = offset.y + _conCropRect.y;
      var rw = _conCropRect.w;
      var rh = _conCropRect.h;
      rectEl.style.left = rx + 'px';
      rectEl.style.top = ry + 'px';
      rectEl.style.width = rw + 'px';
      rectEl.style.height = rh + 'px';
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      var mt = document.getElementById('con-crop-mask-t');
      var mb = document.getElementById('con-crop-mask-b');
      var ml = document.getElementById('con-crop-mask-l');
      var mr = document.getElementById('con-crop-mask-r');
      if (mt) { mt.style.cssText = 'left:0;top:0;width:100%;height:' + ry + 'px;'; }
      if (mb) { mb.style.cssText = 'left:0;top:' + (ry + rh) + 'px;width:100%;height:' + Math.max(0, ch - ry - rh) + 'px;'; }
      if (ml) { ml.style.cssText = 'left:0;top:' + ry + 'px;width:' + rx + 'px;height:' + rh + 'px;'; }
      if (mr) { mr.style.cssText = 'left:' + (rx + rw) + 'px;top:' + ry + 'px;width:' + Math.max(0, cw - rx - rw) + 'px;height:' + rh + 'px;'; }
    }

    async function conOpenCropOverlay(item) {
      if (!item || item.kind !== 'pics') return;
      var att = conFindAttachmentById(item.attachmentId);
      if (!att) return;
      var overlay = document.getElementById('con-crop-overlay');
      var imgEl = document.getElementById('con-crop-img');
      if (!overlay || !imgEl) return;
      _conCropItem = item;
      _conCropDispW = 0;
      _conCropDispH = 0;
      imgEl.src = '';
      var dataUrl = await conGetAttachmentDataUrl(att);
      if (!dataUrl) return;
      overlay.classList.add('active');
      imgEl.onload = function () {
        _conCropNatW = imgEl.naturalWidth;
        _conCropNatH = imgEl.naturalHeight;
        requestAnimationFrame(function () {
          var r = imgEl.getBoundingClientRect();
          _conCropDispW = (r.width > 0 ? r.width : imgEl.clientWidth) || 1;
          _conCropDispH = (r.height > 0 ? r.height : imgEl.clientHeight) || 1;
          _conCropRect = { x: 0, y: 0, w: _conCropDispW, h: _conCropDispH };
          _conCropUpdateRectEl();
        });
      };
      imgEl.src = dataUrl;
    }

    window.conCloseCropOverlay = function () {
      var overlay = document.getElementById('con-crop-overlay');
      if (overlay) overlay.classList.remove('active');
      _conCropItem = null;
      _conCropDrag = null;
      _conCropDispW = 0;
      _conCropDispH = 0;
    };

    window.conConfirmCrop = async function () {
      var item = _conCropItem;
      if (!item) return;
      var imgEl = document.getElementById('con-crop-img');
      if (!imgEl) return;
      var dispW = _conCropDispW || imgEl.getBoundingClientRect().width || imgEl.clientWidth || 1;
      var dispH = _conCropDispH || imgEl.getBoundingClientRect().height || imgEl.clientHeight || 1;
      if (!dispW || !dispH || !_conCropNatW || !_conCropNatH) return;
      var scaleX = _conCropNatW / dispW;
      var scaleY = _conCropNatH / dispH;
      var sx = Math.max(0, Math.round(_conCropRect.x * scaleX));
      var sy = Math.max(0, Math.round(_conCropRect.y * scaleY));
      var sw = Math.min(_conCropNatW - sx, Math.round(_conCropRect.w * scaleX));
      var sh = Math.min(_conCropNatH - sy, Math.round(_conCropRect.h * scaleY));
      if (sw < 2 || sh < 2) return;
      var canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      var ctx = canvas.getContext('2d');
      var tmpImg = new Image();
      await new Promise(function (resolve) {
        tmpImg.onload = resolve;
        tmpImg.src = imgEl.src;
        if (tmpImg.complete && tmpImg.naturalWidth) resolve();
      });
      ctx.drawImage(tmpImg, sx, sy, sw, sh, 0, 0, sw, sh);
      var pngBlob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
      if (!pngBlob) return;
      var att = conFindAttachmentById(item.attachmentId);
      var baseName = (att && att.name ? att.name : (item.name || 'image')).replace(/\.[^.]+$/, '');
      var pngName = conSanitizeAttachmentName(baseName + '-crop.png');
      var pngFile = new File([pngBlob], pngName, { type: 'image/png' });
      _conAttachmentCounter += 1;
      var newAttId = 'att_' + _conAttachmentCounter;
      conAttachments.push({ id: newAttId, name: pngName, mime: 'image/png', kind: 'pics', size: pngBlob.size, file: pngFile, relativePath: '' });
      item.attachmentId = newAttId;
      item.name = pngName;
      item.mime = 'image/png';
      item.file = pngFile;
      delete item._cachedObjectUrl;
      delete item._cachedDataUrl;
      var oldWrap = document.querySelector('.con-media-item[data-id="' + item.id + '"]');
      if (oldWrap) { oldWrap.remove(); conBuildMediaWidget(item); }
      if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
      window.conCloseCropOverlay();
      if (typeof mdbToast === 'function') mdbToast('\u2702\uFE0F Image cropped.');
    };

    (function () {
      function initCropDrag() {
        var rectEl = document.getElementById('con-crop-rect');
        if (!rectEl) { setTimeout(initCropDrag, 300); return; }
        rectEl.addEventListener('mousedown', function (e) {
          var handleEl = e.target.closest('.con-crop-handle');
          var type = handleEl ? handleEl.dataset.handle : 'move';
          _conCropDrag = { type: type, startX: e.clientX, startY: e.clientY, startRect: { x: _conCropRect.x, y: _conCropRect.y, w: _conCropRect.w, h: _conCropRect.h } };
          e.preventDefault();
          e.stopPropagation();
        });
      }
      document.addEventListener('mousemove', function (e) {
        if (!_conCropDrag) return;
        var imgW = _conCropDispW || (document.getElementById('con-crop-img') ? document.getElementById('con-crop-img').clientWidth : 100);
        var imgH = _conCropDispH || (document.getElementById('con-crop-img') ? document.getElementById('con-crop-img').clientHeight : 100);
        var MIN = 20;
        var dx = e.clientX - _conCropDrag.startX;
        var dy = e.clientY - _conCropDrag.startY;
        var sr = _conCropDrag.startRect;
        var type = _conCropDrag.type;
        var x = sr.x, y = sr.y, w = sr.w, h = sr.h;
        if (type === 'move') {
          x = Math.max(0, Math.min(imgW - w, sr.x + dx));
          y = Math.max(0, Math.min(imgH - h, sr.y + dy));
        } else {
          if (type.indexOf('e') >= 0) { w = Math.max(MIN, Math.min(imgW - sr.x, sr.w + dx)); }
          if (type.indexOf('s') >= 0) { h = Math.max(MIN, Math.min(imgH - sr.y, sr.h + dy)); }
          if (type.indexOf('w') >= 0) {
            var nx = Math.max(0, Math.min(sr.x + sr.w - MIN, sr.x + dx));
            w = sr.x + sr.w - nx; x = nx;
          }
          if (type.indexOf('n') >= 0) {
            var ny = Math.max(0, Math.min(sr.y + sr.h - MIN, sr.y + dy));
            h = sr.y + sr.h - ny; y = ny;
          }
        }
        _conCropRect = { x: x, y: y, w: w, h: h };
        _conCropUpdateRectEl();
      });
      document.addEventListener('mouseup', function () { _conCropDrag = null; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var overlay = document.getElementById('con-crop-overlay');
          if (overlay && overlay.classList.contains('active')) window.conCloseCropOverlay();
        }
      });
      setTimeout(initCropDrag, 0);
    })();

    // ============================================================
    // PDF -> PNG CONVERSION
    // ============================================================
    async function conConvertPdfMediaItemToPng(item) {
      if (!item || item.kind !== 'pdf') return;
      var att = conFindAttachmentById(item.attachmentId);
      if (!att) return;
      try {
        var pdfjsLib = await conEnsurePdfjsLib();
        var buf = await conGetAttachmentArrayBuffer(att);
        if (!buf) return;
        var pdfDoc = await pdfjsLib.getDocument(conPdfGetDocumentParams({ data: new Uint8Array(buf) })).promise;
        var pageNum = Math.max(1, Number(item.pageNumber) || 1);
        var page = await pdfDoc.getPage(pageNum);
        var scale = 2;
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        var ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        var pngBlob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
        if (!pngBlob) return;
        var baseName = (att.name || 'pdf').replace(/\.[^.]+$/, '');
        var pngName = conSanitizeAttachmentName(baseName + '-p' + pageNum + '.png');
        var pngFile = new File([pngBlob], pngName, { type: 'image/png' });
        _conAttachmentCounter += 1;
        var newAttId = 'att_' + _conAttachmentCounter;
        conAttachments.push({ id: newAttId, name: pngName, mime: 'image/png', kind: 'pics', size: pngBlob.size, file: pngFile, relativePath: '' });
        item.kind = 'pics';
        item.attachmentId = newAttId;
        item.name = pngName;
        item.mime = 'image/png';
        item.file = pngFile;
        delete item.pageNumber;
        delete item.pdfFit;
        delete item.pdfZoom;
        delete item.pdfLockSize;
        var oldWrap = document.querySelector('.con-media-item[data-id="' + item.id + '"]');
        if (oldWrap) { oldWrap.remove(); conBuildMediaWidget(item); }
        if (typeof conRenderAttachmentSummary === 'function') conRenderAttachmentSummary();
      } catch (e) {
        console.error('[PDF\u2192PNG] conversion failed:', e);
      }
    }

  window.conOpenRecordPopup = global.conOpenRecordPopup = conOpenRecordPopup;
  window._conApplyMediaStyles = global._conApplyMediaStyles = _conApplyMediaStyles;
  window._conMediaGetWrap = global._conMediaGetWrap = _conMediaGetWrap;

  try {
    Object.defineProperty(window, '_recIsRecording', {
      get: function() { return _recIsRecording; },
      set: function(v) { _recIsRecording = v; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    window._recIsRecording = _recIsRecording;
  }

  Board.media = Board.media || {};
})(typeof window !== "undefined" ? window : this);