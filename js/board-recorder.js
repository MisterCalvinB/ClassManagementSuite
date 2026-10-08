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

  // High-performance canvas frame pump to guarantee continuous video frames at target FPS
  // even during static board moments or minor CSS/DOM node state toggles.
  var keepaliveCanvas = null;
  var keepaliveRaf = null;

  function _startKeepaliveTicker(targetFps) {
    _stopKeepaliveTicker();
    if (!keepaliveCanvas) {
      keepaliveCanvas = document.createElement('canvas');
      keepaliveCanvas.id = 'board-rec-keepalive-canvas';
      keepaliveCanvas.width = 2;
      keepaliveCanvas.height = 2;
      keepaliveCanvas.style.cssText = 'position:fixed;bottom:0;right:0;width:2px;height:2px;pointer-events:none;z-index:2147483647;opacity:0.01;';
      document.body.appendChild(keepaliveCanvas);
    }
    var ctx = keepaliveCanvas.getContext('2d');
    var flip = false;
    var fpsInterval = 1000 / (targetFps || 30);
    var lastTick = 0;

    function loop(now) {
      if (state !== 'recording') return;
      if (now - lastTick >= fpsInterval) {
        lastTick = now;
        flip = !flip;
        if (ctx) {
          ctx.clearRect(0, 0, 2, 2);
          ctx.fillStyle = flip ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
          ctx.fillRect(0, 0, 1, 1);
        }
      }
      keepaliveRaf = requestAnimationFrame(loop);
    }
    keepaliveRaf = requestAnimationFrame(loop);

    // Also notify presentation mirror window if active
    if (typeof window._conMirrorSend === 'function') {
      try {
        window._conMirrorSend({ type: 'recorder-keepalive', active: true, fps: targetFps || 30 });
      } catch (_) {}
    }
  }

  function _stopKeepaliveTicker() {
    if (keepaliveRaf) {
      cancelAnimationFrame(keepaliveRaf);
      keepaliveRaf = null;
    }
    if (keepaliveCanvas && keepaliveCanvas.parentNode) {
      keepaliveCanvas.remove();
      keepaliveCanvas = null;
    }
    // Also stop in presentation mirror window
    if (typeof window._conMirrorSend === 'function') {
      try {
        window._conMirrorSend({ type: 'recorder-keepalive', active: false });
      } catch (_) {}
    }
  }

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
   * Complete EBML parser, Duration patcher, and Cues seek index generator for WebM files.
   * MediaRecorder outputs streaming WebM files with unknown cluster sizes and missing Cues/SeekHead,
   * which causes VLC and external media players to freeze or fail to seek.
   *
   * This parser reconstructs the EBML container by:
   *  1. Parsing EBML Header (0x1A45DFA3) and Segment (0x18538067)
   *  2. Parsing Level 1 elements (Info, Tracks) and extracting video track number & TimecodeScale
   *  3. Parsing individual Clusters, converting unknown sizes to exact byte sizes
   *  4. Indexing keyframe SimpleBlocks and calculating byte offsets relative to Segment data
   *  5. Generating the Cues table (0x1C53BB6B) with CuePoint timestamps and cluster byte positions
   *  6. Injecting Duration (0x4489, 64-bit IEEE float) into Info (0x1549A966)
   *  7. Building a SeekHead (0x114D9B74) pointing to Info, Tracks, and Cues
   *
   * @param {Blob} blob - raw WebM blob from MediaRecorder
   * @param {number} durationMs - elapsed recording time in milliseconds
   * @returns {Promise<Blob>}
   */
  async function fixWebmDurationAndCues(blob, durationMs) {
    if (!blob || blob.size < 40) return blob;
    try {
      var arrayBuf = await blob.arrayBuffer();
      var bytes = new Uint8Array(arrayBuf);

      function readId(buf, offset) {
        if (offset >= buf.length) return null;
        var first = buf[offset];
        var len = 1, mask = 0x80;
        while (len <= 4 && !(first & mask)) { mask >>= 1; len++; }
        if (len > 4 || offset + len > buf.length) return null;
        var id = 0;
        for (var i = 0; i < len; i++) id = (id * 256) + buf[offset + i];
        return { length: len, id: id };
      }

      function readVint(buf, offset) {
        if (offset >= buf.length) return null;
        var first = buf[offset];
        var len = 1, mask = 0x80;
        while (len <= 8 && !(first & mask)) { mask >>= 1; len++; }
        if (len > 8 || offset + len > buf.length) return null;
        var val = first & (mask - 1);
        var isUnknown = (val === (mask - 1));
        for (var i = 1; i < len; i++) {
          if (buf[offset + i] !== 0xFF) isUnknown = false;
          val = (val * 256) + buf[offset + i];
        }
        return { length: len, value: isUnknown ? -1 : val, isUnknown: isUnknown };
      }

      function encodeVint(val) {
        if (val < 0x7F) {
          return new Uint8Array([0x80 | val]);
        } else if (val < 0x3FFF) {
          return new Uint8Array([0x40 | (val >> 8), val & 0xFF]);
        } else if (val < 0x1FFFFF) {
          return new Uint8Array([0x20 | (val >> 16), (val >> 8) & 0xFF, val & 0xFF]);
        } else if (val < 0x0FFFFFFF) {
          return new Uint8Array([
            0x10 | ((val >>> 24) & 0x0F),
            (val >>> 16) & 0xFF,
            (val >>> 8) & 0xFF,
            val & 0xFF
          ]);
        } else {
          var buf = new Uint8Array(9);
          buf[0] = 0x01;
          var v = BigInt(val);
          for (var i = 8; i >= 1; i--) {
            buf[i] = Number(v & 0xFFn);
            v >>= 8n;
          }
          return buf;
        }
      }

      function encodeId(idNum) {
        var parts = [];
        var temp = idNum;
        while (temp > 0) {
          parts.unshift(temp & 0xFF);
          temp = Math.floor(temp / 256);
        }
        return new Uint8Array(parts);
      }

      function makeElement(idNum, payloadBytes) {
        var idBytes = encodeId(idNum);
        var sizeVint = encodeVint(payloadBytes.length);
        var out = new Uint8Array(idBytes.length + sizeVint.length + payloadBytes.length);
        out.set(idBytes, 0);
        out.set(sizeVint, idBytes.length);
        out.set(payloadBytes, idBytes.length + sizeVint.length);
        return out;
      }

      function makeUintElement(idNum, val) {
        var valBytes = [];
        var temp = val;
        if (temp === 0) {
          valBytes.push(0);
        } else {
          while (temp > 0) {
            valBytes.unshift(temp & 0xFF);
            temp = Math.floor(temp / 256);
          }
        }
        return makeElement(idNum, new Uint8Array(valBytes));
      }

      function makeFloat64Element(idNum, val) {
        var valBytes = new Uint8Array(8);
        var dv = new DataView(valBytes.buffer, 0, 8);
        dv.setFloat64(0, val, false);
        return makeElement(idNum, valBytes);
      }

      function makeMasterElement(idNum, children) {
        var totalChildLen = 0;
        for (var i = 0; i < children.length; i++) totalChildLen += children[i].length;
        var combined = new Uint8Array(totalChildLen);
        var cur = 0;
        for (var i = 0; i < children.length; i++) {
          combined.set(children[i], cur);
          cur += children[i].length;
        }
        return makeElement(idNum, combined);
      }

      // 1. EBML Header (0x1A45DFA3)
      var pos = 0;
      var headerId = readId(bytes, pos);
      if (!headerId || headerId.id !== 0x1A45DFA3) {
        console.warn('[BoardRecorder] Not an EBML header, skipping duration fix.');
        return blob;
      }
      var headerSize = readVint(bytes, pos + headerId.length);
      if (!headerSize || headerSize.value < 0) return blob;
      var headerEnd = pos + headerId.length + headerSize.length + headerSize.value;
      if (headerEnd > bytes.length) return blob;
      var ebmlHeaderBytes = bytes.subarray(0, headerEnd);

      // 2. Segment (0x18538067)
      pos = headerEnd;
      var segId = readId(bytes, pos);
      if (!segId || segId.id !== 0x18538067) {
        console.warn('[BoardRecorder] Segment element not found, skipping duration fix.');
        return blob;
      }
      var segSize = readVint(bytes, pos + segId.length);
      if (!segSize) return blob;
      var segDataStart = pos + segId.length + segSize.length;

      // 3. Scan Segment elements: Info, Tracks, and Clusters
      var timecodeScale = 1000000;
      var videoTrackNum = 1;
      var tracksBytes = null;
      var infoChildren = [];
      var rawClusters = [];
      var keyframes = [];
      var maxTimestamp = 0;

      pos = segDataStart;
      while (pos < bytes.length) {
        var elemId = readId(bytes, pos);
        if (!elemId) break;
        var elemSize = readVint(bytes, pos + elemId.length);
        if (!elemSize) break;
        var elemDataStart = pos + elemId.length + elemSize.length;

        if (elemId.id === 0x1549A966) { // Info
          var infoDataEnd = (elemSize.value >= 0) ? (elemDataStart + elemSize.value) : bytes.length;
          var ipos = elemDataStart;
          while (ipos < infoDataEnd && ipos < bytes.length) {
            var cid = readId(bytes, ipos);
            if (!cid) break;
            var csz = readVint(bytes, ipos + cid.length);
            if (!csz || csz.value < 0) break;
            var cdataStart = ipos + cid.length + csz.length;
            var cdataEnd = cdataStart + csz.value;
            if (cdataEnd > bytes.length) break;
            var childBytes = bytes.subarray(ipos, cdataEnd);

            if (cid.id === 0x2AD7B1) { // TimecodeScale
              var scale = 0;
              for (var b = 0; b < csz.value; b++) scale = (scale * 256) + bytes[cdataStart + b];
              if (scale > 0) timecodeScale = scale;
              infoChildren.push({ id: cid.id, bytes: childBytes, isDuration: false });
            } else if (cid.id === 0x4489) { // Duration
              infoChildren.push({ id: cid.id, bytes: null, isDuration: true });
            } else {
              infoChildren.push({ id: cid.id, bytes: childBytes, isDuration: false });
            }
            ipos = cdataEnd;
          }
          pos = (elemSize.value >= 0) ? (elemDataStart + elemSize.value) : ipos;
        } else if (elemId.id === 0x1654AE6B) { // Tracks
          var tracksDataEnd = (elemSize.value >= 0) ? (elemDataStart + elemSize.value) : bytes.length;
          tracksBytes = bytes.subarray(pos, tracksDataEnd);
          var tpos = elemDataStart;
          while (tpos < tracksDataEnd && tpos < bytes.length) {
            var tid = readId(bytes, tpos);
            if (!tid) break;
            var tsz = readVint(bytes, tpos + tid.length);
            if (!tsz || tsz.value < 0) break;
            var tdataStart = tpos + tid.length + tsz.length;
            var tdataEnd = tdataStart + tsz.value;
            if (tid.id === 0xAE) { // TrackEntry
              var entryPos = tdataStart;
              var tNum = 1, tType = 1;
              while (entryPos < tdataEnd && entryPos < bytes.length) {
                var eid = readId(bytes, entryPos);
                if (!eid) break;
                var esz = readVint(bytes, entryPos + eid.length);
                if (!esz || esz.value < 0) break;
                var edataStart = entryPos + eid.length + esz.length;
                if (eid.id === 0xD7) { // TrackNumber
                  var nv = 0;
                  for (var b = 0; b < esz.value; b++) nv = (nv * 256) + bytes[edataStart + b];
                  tNum = nv;
                } else if (eid.id === 0x83) { // TrackType
                  var tv = 0;
                  for (var b = 0; b < esz.value; b++) tv = (tv * 256) + bytes[edataStart + b];
                  tType = tv;
                }
                entryPos = edataStart + esz.value;
              }
              if (tType === 1) videoTrackNum = tNum;
            }
            tpos = tdataEnd;
          }
          pos = tracksDataEnd;
        } else if (elemId.id === 0x1F43B675) { // Cluster
          var clusterStart = pos;
          var cpos = elemDataStart;
          var clusterTimecode = 0;
          var keyframeFoundInCluster = false;
          var clusterPayloadStart = elemDataStart;
          var clusterPayloadEnd = elemDataStart;

          while (cpos < bytes.length) {
            var checkId = readId(bytes, cpos);
            if (!checkId) break;
            if (cpos > clusterStart && (checkId.id === 0x1F43B675 || checkId.id === 0x1C53BB6B || checkId.id === 0x114D9B74 || checkId.id === 0x1254C367)) {
              break;
            }
            var checkSize = readVint(bytes, cpos + checkId.length);
            if (!checkSize || checkSize.value < 0) {
              cpos += checkId.length;
              break;
            }
            var childDataStart = cpos + checkId.length + checkSize.length;
            var childDataEnd = childDataStart + checkSize.value;
            if (childDataEnd > bytes.length) childDataEnd = bytes.length;

            if (checkId.id === 0xE7) { // Timecode
              var tc = 0;
              for (var b = 0; b < checkSize.value; b++) tc = (tc * 256) + bytes[childDataStart + b];
              clusterTimecode = tc;
              if (clusterTimecode > maxTimestamp) maxTimestamp = clusterTimecode;
            } else if (checkId.id === 0xA3) { // SimpleBlock
              var trkVint = readVint(bytes, childDataStart);
              if (trkVint && childDataStart + trkVint.length + 3 <= bytes.length) {
                var blockTrack = trkVint.value;
                var relTimeOffset = childDataStart + trkVint.length;
                var dv = new DataView(bytes.buffer, bytes.byteOffset + relTimeOffset, 2);
                var relTime = dv.getInt16(0, false);
                var flags = bytes[relTimeOffset + 2];
                var isKeyframe = (flags & 0x80) !== 0;
                var blockTime = Math.max(0, clusterTimecode + relTime);
                if (blockTime > maxTimestamp) maxTimestamp = blockTime;

                if (blockTrack === videoTrackNum && isKeyframe && !keyframeFoundInCluster) {
                  keyframeFoundInCluster = true;
                  keyframes.push({
                    timecode: blockTime,
                    clusterIndex: rawClusters.length
                  });
                }
              }
            }
            cpos = childDataEnd;
            clusterPayloadEnd = childDataEnd;
          }

          var clusterPayloadBytes = bytes.subarray(clusterPayloadStart, clusterPayloadEnd);
          var exactClusterElem = makeElement(0x1F43B675, clusterPayloadBytes);
          rawClusters.push(exactClusterElem);

          pos = clusterPayloadEnd;
        } else {
          var otherEnd = (elemSize.value >= 0) ? (elemDataStart + elemSize.value) : bytes.length;
          pos = otherEnd;
        }
      }

      if (rawClusters.length === 0) return blob;

      // 4. Calculate Duration
      var calcDurationMs = (durationMs > 0) ? durationMs : (maxTimestamp * timecodeScale / 1000000);
      var durationTicks = (calcDurationMs * 1000000) / timecodeScale;
      var durElem = makeFloat64Element(0x4489, durationTicks);

      // 5. Build Info Element
      var newInfoParts = [];
      var timecodeScaleAdded = false;
      var durationAdded = false;

      for (var i = 0; i < infoChildren.length; i++) {
        if (infoChildren[i].isDuration) {
          newInfoParts.push(durElem);
          durationAdded = true;
        } else {
          if (infoChildren[i].id === 0x2AD7B1) timecodeScaleAdded = true;
          newInfoParts.push(infoChildren[i].bytes);
        }
      }
      if (!timecodeScaleAdded) {
        newInfoParts.unshift(makeUintElement(0x2AD7B1, timecodeScale));
      }
      if (!durationAdded) {
        newInfoParts.splice(1, 0, durElem);
      }

      var newInfoElem = makeMasterElement(0x1549A966, newInfoParts);
      if (!tracksBytes) tracksBytes = new Uint8Array(0);

      // 6. Calculate Cluster byte offsets and build Cues (0x1C53BB6B)
      function buildCues(clustersByteOffsets) {
        var cuePoints = [];
        for (var i = 0; i < keyframes.length; i++) {
          var kf = keyframes[i];
          var clusterOffsetInSeg = clustersByteOffsets[kf.clusterIndex];
          var cueTrackPositions = makeMasterElement(0xB7, [
            makeUintElement(0xF7, videoTrackNum),
            makeUintElement(0xF1, clusterOffsetInSeg)
          ]);
          cuePoints.push(makeMasterElement(0xBB, [
            makeUintElement(0xB3, kf.timecode),
            cueTrackPositions
          ]));
        }
        return (cuePoints.length > 0) ? makeMasterElement(0x1C53BB6B, cuePoints) : new Uint8Array(0);
      }

      // 7. Build SeekHead (0x114D9B74) pointing to Info, Tracks, and Cues
      function buildSeekHead(seekHeadLen, infoLen, tracksLen, totalClustersLen, cuesLen) {
        var infoOffset = seekHeadLen;
        var tracksOffset = infoOffset + infoLen;
        var cuesOffset = tracksOffset + tracksLen + totalClustersLen;

        var seeks = [
          makeMasterElement(0x4DBB, [
            makeElement(0x53AB, encodeId(0x1549A966)),
            makeUintElement(0x53AC, infoOffset)
          ]),
          makeMasterElement(0x4DBB, [
            makeElement(0x53AB, encodeId(0x1654AE6B)),
            makeUintElement(0x53AC, tracksOffset)
          ])
        ];

        if (cuesLen > 0) {
          seeks.push(makeMasterElement(0x4DBB, [
            makeElement(0x53AB, encodeId(0x1C53BB6B)),
            makeUintElement(0x53AC, cuesOffset)
          ]));
        }

        return makeMasterElement(0x114D9B74, seeks);
      }

      var totalClustersBytesLen = 0;
      for (var i = 0; i < rawClusters.length; i++) totalClustersBytesLen += rawClusters[i].length;

      var estSeekHeadSize = 65;
      function computeOffsets(seekHeadSize) {
        var offsets = [];
        var cur = seekHeadSize + newInfoElem.length + tracksBytes.length;
        for (var i = 0; i < rawClusters.length; i++) {
          offsets.push(cur);
          cur += rawClusters[i].length;
        }
        return offsets;
      }

      var clusterOffsets = computeOffsets(estSeekHeadSize);
      var cuesBytes = buildCues(clusterOffsets);
      var seekHeadBytes = buildSeekHead(
        estSeekHeadSize,
        newInfoElem.length,
        tracksBytes.length,
        totalClustersBytesLen,
        cuesBytes.length
      );

      if (seekHeadBytes.length !== estSeekHeadSize) {
        var exactSeekHeadSize = seekHeadBytes.length;
        clusterOffsets = computeOffsets(exactSeekHeadSize);
        cuesBytes = buildCues(clusterOffsets);
        seekHeadBytes = buildSeekHead(
          exactSeekHeadSize,
          newInfoElem.length,
          tracksBytes.length,
          totalClustersBytesLen,
          cuesBytes.length
        );
      }

      // 8. Assemble full WebM container
      var totalSegDataLen = seekHeadBytes.length + newInfoElem.length + tracksBytes.length + totalClustersBytesLen + cuesBytes.length;
      var segIdBytes = encodeId(0x18538067);
      var segSizeVint = encodeVint(totalSegDataLen);

      var totalFileLen = ebmlHeaderBytes.length + segIdBytes.length + segSizeVint.length + totalSegDataLen;
      var finalBuffer = new Uint8Array(totalFileLen);

      var w = 0;
      finalBuffer.set(ebmlHeaderBytes, w); w += ebmlHeaderBytes.length;
      finalBuffer.set(segIdBytes, w); w += segIdBytes.length;
      finalBuffer.set(segSizeVint, w); w += segSizeVint.length;
      finalBuffer.set(seekHeadBytes, w); w += seekHeadBytes.length;
      finalBuffer.set(newInfoElem, w); w += newInfoElem.length;
      finalBuffer.set(tracksBytes, w); w += tracksBytes.length;

      for (var i = 0; i < rawClusters.length; i++) {
        finalBuffer.set(rawClusters[i], w);
        w += rawClusters[i].length;
      }

      if (cuesBytes.length > 0) {
        finalBuffer.set(cuesBytes, w);
        w += cuesBytes.length;
      }

      return new Blob([finalBuffer], { type: blob.type || 'video/webm' });
    } catch (err) {
      console.warn('[BoardRecorder] fixWebmDurationAndCues failed, falling back to raw blob:', err);
      return blob;
    }
  }

  /**
   * Helper: Pick best supported MIME type based on desired format ('mp4' or 'webm')
   */
  function getPreferredMimeType(preferredFormat) {
    if (preferredFormat === 'mp4') {
      var mp4Types = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264,aac',
        'video/mp4'
      ];
      for (var i = 0; i < mp4Types.length; i++) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mp4Types[i])) {
          return mp4Types[i];
        }
      }
    }
    var webmTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm'
    ];
    for (var j = 0; j < webmTypes.length; j++) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(webmTypes[j])) {
        return webmTypes[j];
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

    async function _tryAcquire(useExact) {
      var constraints = {
        audio: (deviceId && useExact) ? { deviceId: { exact: deviceId } } : (deviceId ? { deviceId: deviceId } : true)
      };
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    try {
      try {
        testMicStream = await _tryAcquire(true);
      } catch (firstErr) {
        if (firstErr.name === 'NotReadableError' || firstErr.name === 'NotFoundError' || firstErr.name === 'OverconstrainedError') {
          await new Promise(function (r) { setTimeout(r, 350); });
          testMicStream = await _tryAcquire(false);
        } else {
          throw firstErr;
        }
      }

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
   *   options.format {string} - 'mp4' | 'webm'
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

    stopMicrophoneTest();

    recordedChunks = [];
    currentBlob = null;
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch (_) { }
      currentBlobUrl = null;
    }

    try {
      var targetFps = Math.max(1, Math.min(60, parseInt(options.fps, 10) || 30));
      var desiredFormat = options.format || 'mp4';

      // 1. Acquire Video Stream
      if (options.captureTarget && window.Desktop && typeof window.Desktop.setDisplayCaptureTarget === 'function'
          && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          var targetRes = await window.Desktop.setDisplayCaptureTarget(options.captureTarget);
          if (targetRes && targetRes.ok) {
            videoStream = await navigator.mediaDevices.getDisplayMedia({
              video: { frameRate: { ideal: targetFps, max: targetFps } },
              audio: false
            });
          }
        } catch (tabErr) {
          console.warn('[BoardRecorder] WebContents capture failed, falling back to window capture:', tabErr);
          videoStream = null;
        } finally {
          try { await window.Desktop.setDisplayCaptureTarget(''); } catch (_) { }
        }
      }

      if (videoStream) {
        // already acquired
      } else if (options.videoSourceId && navigator.mediaDevices.getUserMedia) {
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

      // 4. Initialize MediaRecorder with chosen format and dynamic bitrate
      var mimeType = getPreferredMimeType(desiredFormat);
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

      // 5. Start Recording and keepalive frame ticker
      mediaRecorder.start(1000);
      _startKeepaliveTicker(targetFps);

      state = 'recording';
      startTime = Date.now();
      pausedTime = 0;
      totalPausedDuration = 0;

      if (callbacks.onStateChange) callbacks.onStateChange(state);

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
      _stopKeepaliveTicker();
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
      _stopKeepaliveTicker();

      if (micLevelRaf) { cancelAnimationFrame(micLevelRaf); micLevelRaf = null; }

      mediaRecorder.onstop = async function () {
        try {
          var mimeType = mediaRecorder.mimeType || getPreferredMimeType('mp4');
          var rawBlob = new Blob(recordedChunks, { type: mimeType });

          // If recording is WebM, reconstruct EBML header with Cues index and Duration
          // so VLC and external video players can seek smoothly without freezing.
          if (mimeType.toLowerCase().includes('webm')) {
            currentBlob = await fixWebmDurationAndCues(rawBlob, Math.max(0, finalDuration));
          } else {
            currentBlob = rawBlob;
          }
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
    _stopKeepaliveTicker();
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

    setTimeout(function () { boardVideoOnMicSelectChange(); }, 250);

    // Format selection
    var formatSelect = document.getElementById('board-rec-format-select');
    if (formatSelect) {
      var isMp4Supported = typeof MediaRecorder !== 'undefined' && (
        MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2') ||
        MediaRecorder.isTypeSupported('video/mp4')
      );
      try {
        var savedFormat = localStorage.getItem('board_rec_format');
        if (savedFormat && (savedFormat === 'mp4' || savedFormat === 'webm')) {
          formatSelect.value = (savedFormat === 'mp4' && !isMp4Supported) ? 'webm' : savedFormat;
        } else {
          formatSelect.value = isMp4Supported ? 'mp4' : 'webm';
        }
      } catch (_) {
        formatSelect.value = isMp4Supported ? 'mp4' : 'webm';
      }
    }

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

    var formatSelect = document.getElementById('board-rec-format-select');
    var chosenFormat = formatSelect ? formatSelect.value : 'mp4';
    try { localStorage.setItem('board_rec_format', chosenFormat); } catch (_) {}

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
          await new Promise(function (resolve) { setTimeout(resolve, 800); });
        } else if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.mirrorWindowCommand === 'function') {
          try {
            await window.Desktop.mirrorWindowCommand('ensure-visible');
          } catch (_) {}
        }
      }

      if (window.Desktop && typeof window.Desktop.getScreenSources === 'function') {
        try {
          var res = await window.Desktop.getScreenSources(['window', 'screen']);
          if (res && res.sources && res.sources.length > 0) {
            if (targetMode === 'presentation') {
              var presSource = null;
              if (res.mirrorMediaId) {
                presSource = res.sources.find(function (s) { return s.id === res.mirrorMediaId; });
              }
              if (!presSource) {
                presSource = res.sources.find(function (s) { return s.isMirror; });
              }
              if (!presSource) {
                presSource = res.sources.find(function (s) {
                  var n = (s.name || '').toLowerCase();
                  return n.includes('presentation') || n.includes('présentation') || n.includes('mirror') || n.includes('miroir');
                });
              }
              if (!presSource) {
                presSource = res.sources.find(function (s) {
                  var n = (s.name || '').toLowerCase();
                  return n.includes('board') && s.id !== (res.senderMediaId || res.sources[0].id);
                }) || res.sources[1] || res.sources[0];
              }
              if (presSource) chosenSourceId = presSource.id;
            } else {
              var mainSource = null;
              if (res.senderMediaId) {
                mainSource = res.sources.find(function (s) { return s.id === res.senderMediaId; });
              }
              if (!mainSource) {
                mainSource = res.sources.find(function (s) { return s.isSender; });
              }
              if (!mainSource) {
                mainSource = res.sources.find(function (s) {
                  var n = (s.name || '').toLowerCase();
                  return (n.includes('board') || n.includes('tableau')) && !n.includes('presentation') && !n.includes('présentation');
                }) || res.sources[0];
              }
              if (mainSource) chosenSourceId = mainSource.id;
            }
          }
        } catch (srcErr) {
          console.warn('[BoardRecorder] Error resolving desktopCapturer source:', srcErr);
        }
      }

      await startRecording({
        format: chosenFormat,
        captureTarget: (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron())
          ? (targetMode === 'presentation' ? 'mirror' : 'self')
          : null,
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

      var isMp4 = (res.mimeType && res.mimeType.toLowerCase().includes('mp4'));
      var ext = isMp4 ? '.mp4' : '.webm';

      // Open Preview Modal
      var prevOverlay = document.getElementById('board-rec-preview-overlay');
      var videoPrev = document.getElementById('board-rec-video-preview');
      var durEl = document.getElementById('board-rec-preview-duration');
      var sizeEl = document.getElementById('board-rec-preview-size');
      var fnInput = document.getElementById('board-rec-filename-input');
      var exportLabel = document.getElementById('board-rec-export-label');

      if (durEl) durEl.textContent = res.durationFormatted || '00:00';
      if (sizeEl) sizeEl.textContent = formatBytes(res.sizeBytes);

      var defaultName = 'board-recording-' + (new Date()).toISOString().slice(0, 19).replace(/[:T]/g, '-') + ext;
      if (fnInput) fnInput.value = defaultName;

      if (exportLabel) {
        var baseText = (typeof t === 'function' ? t('recExportVideoBtn') : 'Export Video') || 'Export Video';
        exportLabel.textContent = baseText + ' (' + ext + ')';
      }

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
    var isMp4 = (currentRecordingResult.mimeType && currentRecordingResult.mimeType.toLowerCase().includes('mp4'));
    var defaultExt = isMp4 ? '.mp4' : '.webm';

    if (!/\.webm$/i.test(baseName) && !/\.mp4$/i.test(baseName)) {
      baseName += defaultExt;
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
    var isMp4 = (currentRecordingResult.mimeType && currentRecordingResult.mimeType.toLowerCase().includes('mp4'));
    var defaultExt = isMp4 ? '.mp4' : '.webm';

    if (!/\.webm$/i.test(baseName) && !/\.mp4$/i.test(baseName)) {
      baseName += defaultExt;
    }

    var blob = currentRecordingResult.blob;
    var mime = currentRecordingResult.mimeType || (isMp4 ? 'video/mp4' : 'video/webm');
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

  global.boardVideoExportMp3 = async function () {
    if (!currentRecordingResult || !currentRecordingResult.blob) return;
    var fnInput = document.getElementById('board-rec-filename-input');
    var rawName = (fnInput && fnInput.value.trim()) || 'board-recording';
    var baseName = rawName.replace(/\.(webm|mp4|mp3|wav)$/i, '') + '.mp3';

    notify(t('recConvertingMp3', 'Converting recording to MP3 audio...'), false);
    try {
      if (global.MediaConverterService && typeof global.MediaConverterService.extractAudio === 'function') {
        var res = await global.MediaConverterService.extractAudio(currentRecordingResult.blob, 'mp3');
        if (res && res.blob) {
          var url = URL.createObjectURL(res.blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = baseName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
          notify((t('recExportedMp3Success', 'Exported MP3 audio: ') || 'Exported MP3: ') + baseName, false);
          return;
        }
      }
    } catch (e) {
      console.error('[BoardRecorder] MP3 export error:', e);
      notify('MP3 export failed: ' + (e.message || ''), true);
    }
  };

  global.boardVideoOpenInConverter = async function () {
    if (!currentRecordingResult || !currentRecordingResult.blob) return;
    var targetPath = currentRecordingResult.filePath || '';
    if (!targetPath && window.Desktop && typeof window.Desktop.saveFile === 'function') {
      try {
        var buf = await currentRecordingResult.blob.arrayBuffer();
        var uint8 = new Uint8Array(buf);
        var binary = '';
        for (var i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        var base64 = btoa(binary);
        var recName = (currentRecordingResult.filename || ('recording_' + Date.now() + '.webm')).replace(/[^\w.-]/g, '_');
        var res = await window.Desktop.saveFile({
          target: 'user',
          subdir: 'temp_media',
          filename: recName,
          content: base64,
          encoding: 'base64'
        });
        if (res && res.file) targetPath = res.file;
      } catch (err) {
        console.warn('[BoardRecorder] Could not save temp recording for converter:', err);
      }
    }
    if (global.MediaConverterService && typeof global.MediaConverterService.openMediaConverter === 'function') {
      global.MediaConverterService.openMediaConverter(targetPath);
    }
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
    fixWebmDurationAndCues: fixWebmDurationAndCues,
    getState: function () { return state; }
  };

})(window);
