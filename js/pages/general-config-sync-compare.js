// Side-by-side Compare & Interactive Merge modal for Sync Conflicts
(function () {
  'use strict';

  function tr(key, fallback) {
    if (typeof window.t === 'function') {
      var val = window.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function trFmt(key, vars, fallback) {
    if (typeof window.tFmt === 'function') {
      var val = window.tFmt(key, vars);
      if (val && val !== key) return val;
    }
    var out = fallback || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return out;
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtSize(bytes) {
    if (bytes == null) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function fmtDate(ms) {
    if (!ms) return '-';
    return new Date(ms).toLocaleString();
  }

  // Detect pure JSON or `window.VAR = <JSON>;` data files
  function parseStructuredPayload(text) {
    if (typeof text !== 'string') return { isStructured: false, raw: '' };
    var trimmed = text.trim();
    if (!trimmed) return { isStructured: false, raw: text };

    // 1. Pure JSON
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      try {
        var parsedJson = JSON.parse(trimmed);
        return {
          isStructured: true,
          kind: 'json',
          prefix: '',
          suffix: '',
          prettyText: JSON.stringify(parsedJson, null, 2)
        };
      } catch (_) { /* not valid JSON */ }
    }

    // 2. window.VAR = <JSON>; (with optional leading comments)
    var m = text.match(/^(\s*(?:\/\/[^\n]*\n\s*)*(?:window|globalThis)\.[A-Za-z_$][\w$]*\s*=\s*)([\s\S]*?)(;?\s*)$/);
    if (m) {
      var body = m[2].trim();
      if (body && (body[0] === '{' || body[0] === '[')) {
        try {
          var parsedJs = JSON.parse(body);
          return {
            isStructured: true,
            kind: 'js-wrapper',
            prefix: m[1],
            suffix: m[3] && m[3].indexOf(';') !== -1 ? ';' : '',
            prettyText: JSON.stringify(parsedJs, null, 2)
          };
        } catch (_) { /* not valid JSON body */ }
      }
    }

    return { isStructured: false, raw: text };
  }

  function validateStructuredOutput(text, structMeta) {
    if (!structMeta || !structMeta.isStructured) return { ok: true, finalText: text };
    var trimmed = text.trim();
    if (structMeta.kind === 'json') {
      try {
        JSON.parse(trimmed);
        return { ok: true, finalText: text };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : 'Invalid JSON' };
      }
    }
    // js-wrapper: validate either full `window.VAR = ...;` or raw JSON body
    var m = text.match(/^(\s*(?:\/\/[^\n]*\n\s*)*(?:window|globalThis)\.[A-Za-z_$][\w$]*\s*=\s*)([\s\S]*?)(;?\s*)$/);
    if (m) {
      try {
        JSON.parse(m[2].trim());
        return { ok: true, finalText: text };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : 'Invalid JSON inside JS wrapper' };
      }
    }
    try {
      JSON.parse(trimmed);
      return { ok: true, finalText: structMeta.prefix + trimmed + structMeta.suffix };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : 'Invalid JSON' };
    }
  }

  // Compute line-by-line diff hunks using trimmed prefix/suffix + LCS
  function computeDiffHunks(srcText, destText, defaultChoice) {
    var a = String(srcText || '').replace(/\r\n/g, '\n').split('\n');
    var b = String(destText || '').replace(/\r\n/g, '\n').split('\n');

    var start = 0;
    while (start < a.length && start < b.length && a[start] === b[start]) {
      start++;
    }
    var endA = a.length - 1;
    var endB = b.length - 1;
    while (endA >= start && endB >= start && a[endA] === b[endB]) {
      endA--;
      endB--;
    }

    var hunks = [];
    if (start > 0) {
      hunks.push({ id: hunks.length, type: 'equal', srcLines: a.slice(0, start), destLines: b.slice(0, start), choice: 'src' });
    }

    var midA = a.slice(start, endA + 1);
    var midB = b.slice(start, endB + 1);

    if (midA.length > 0 || midB.length > 0) {
      // Guard DP size to keep UI snappy on huge files
      if (midA.length * midB.length > 2500000) {
        hunks.push({
          id: hunks.length,
          type: 'diff',
          srcLines: midA,
          destLines: midB,
          choice: defaultChoice || 'src'
        });
      } else {
        var m = midA.length;
        var n = midB.length;
        var dp = new Array(m + 1);
        for (var i = 0; i <= m; i++) {
          dp[i] = new Int32Array(n + 1);
        }
        for (var r = m - 1; r >= 0; r--) {
          for (var c = n - 1; c >= 0; c--) {
            if (midA[r] === midB[c]) {
              dp[r][c] = dp[r + 1][c + 1] + 1;
            } else {
              dp[r][c] = dp[r + 1][c] >= dp[r][c + 1] ? dp[r + 1][c] : dp[r][c + 1];
            }
          }
        }

        var eqSrc = [];
        var diffSrc = [];
        var diffDest = [];
        var flushEq = function () {
          if (eqSrc.length > 0) {
            hunks.push({ id: hunks.length, type: 'equal', srcLines: eqSrc, destLines: eqSrc.slice(), choice: 'src' });
            eqSrc = [];
          }
        };
        var flushDiff = function () {
          if (diffSrc.length > 0 || diffDest.length > 0) {
            hunks.push({
              id: hunks.length,
              type: 'diff',
              srcLines: diffSrc,
              destLines: diffDest,
              choice: defaultChoice || 'src'
            });
            diffSrc = [];
            diffDest = [];
          }
        };

        var ia = 0;
        var ib = 0;
        while (ia < m && ib < n) {
          if (midA[ia] === midB[ib]) {
            flushDiff();
            eqSrc.push(midA[ia]);
            ia++;
            ib++;
          } else if (dp[ia + 1][ib] >= dp[ia][ib + 1]) {
            flushEq();
            diffSrc.push(midA[ia]);
            ia++;
          } else {
            flushEq();
            diffDest.push(midB[ib]);
            ib++;
          }
        }
        while (ia < m) { flushEq(); diffSrc.push(midA[ia++]); }
        while (ib < n) { flushEq(); diffDest.push(midB[ib++]); }
        flushEq();
        flushDiff();
      }
    }

    if (endA + 1 < a.length) {
      hunks.push({
        id: hunks.length,
        type: 'equal',
        srcLines: a.slice(endA + 1),
        destLines: b.slice(endB + 1),
        choice: 'src'
      });
    }

    return hunks;
  }

  function assembleMergedText(hunks, structMeta, useFormatted) {
    var out = [];
    for (var i = 0; i < hunks.length; i++) {
      var h = hunks[i];
      if (h.type === 'equal') {
        for (var e = 0; e < h.srcLines.length; e++) out.push(h.srcLines[e]);
      } else if (h.choice === 'dest') {
        for (var d = 0; d < h.destLines.length; d++) out.push(h.destLines[d]);
      } else if (h.choice === 'both') {
        for (var s1 = 0; s1 < h.srcLines.length; s1++) out.push(h.srcLines[s1]);
        for (var d1 = 0; d1 < h.destLines.length; d1++) out.push(h.destLines[d1]);
      } else {
        for (var s = 0; s < h.srcLines.length; s++) out.push(h.srcLines[s]);
      }
    }
    var joined = out.join('\n');
    if (useFormatted && structMeta && structMeta.isStructured && structMeta.kind === 'js-wrapper') {
      return structMeta.prefix + joined + structMeta.suffix;
    }
    return joined;
  }

  // Modal state
  var overlay = document.getElementById('syncCompareOverlay');
  var titleEl = document.getElementById('syncCompareTitle');
  var pathEl = document.getElementById('syncComparePath');
  var metaBar = document.getElementById('syncCompareMetaBar');
  var formatChk = document.getElementById('syncCompareFormatChk');
  var formatLbl = document.getElementById('syncCompareFormatLbl');
  var showUnchangedChk = document.getElementById('syncCompareUnchangedChk');
  var allAppBtn = document.getElementById('syncCompareAllAppBtn');
  var allSyncBtn = document.getElementById('syncCompareAllSyncBtn');
  var prevDiffBtn = document.getElementById('syncComparePrevDiffBtn');
  var nextDiffBtn = document.getElementById('syncCompareNextDiffBtn');
  var diffCountEl = document.getElementById('syncCompareDiffCount');
  var diffContainer = document.getElementById('syncCompareDiffBody');
  var mergeSection = document.getElementById('syncCompareMergeSection');
  var mergedTextarea = document.getElementById('syncCompareMergedText');
  var mergeStatusEl = document.getElementById('syncCompareMergeStatus');
  var backupChk = document.getElementById('syncCompareBackupChk');
  var closeBtn = document.getElementById('syncCompareCloseBtn');
  var cancelBtn = document.getElementById('syncCompareCancelBtn');
  var keepAppBtn = document.getElementById('syncCompareKeepAppBtn');
  var keepSyncBtn = document.getElementById('syncCompareKeepSyncBtn');
  var saveMergeBtn = document.getElementById('syncCompareSaveMergeBtn');

  var _state = {
    relativePath: '',
    pair: null,
    srcStruct: null,
    destStruct: null,
    hunks: [],
    diffHunkIndices: [],
    activeDiffCursor: -1,
    manualEdited: false,
    callbacks: null
  };

  function closeModal() {
    if (overlay) overlay.classList.remove('open');
  }

  function updateMergeStatus(msg, isErr) {
    if (!mergeStatusEl) return;
    mergeStatusEl.textContent = msg || '';
    mergeStatusEl.className = 'sync-compare-merge-status' + (isErr ? ' is-error' : '');
  }

  function rebuildHunks() {
    var pair = _state.pair;
    if (!pair || pair.isBinary || pair.tooLarge) return;

    var useFormatted = formatChk && formatChk.checked && _state.srcStruct.isStructured && _state.destStruct.isStructured;
    var srcText = useFormatted ? _state.srcStruct.prettyText : (pair.src.text || '');
    var destText = useFormatted ? _state.destStruct.prettyText : (pair.dest.text || '');
    var defaultChoice = (pair.src.mtimeMs || 0) >= (pair.dest.mtimeMs || 0) ? 'src' : 'dest';

    _state.hunks = computeDiffHunks(srcText, destText, defaultChoice);
    _state.diffHunkIndices = [];
    for (var i = 0; i < _state.hunks.length; i++) {
      if (_state.hunks[i].type === 'diff') _state.diffHunkIndices.push(i);
    }
    _state.activeDiffCursor = _state.diffHunkIndices.length > 0 ? 0 : -1;
    _state.manualEdited = false;

    renderDiffBody();
    syncTextareaFromHunks();
  }

  function syncTextareaFromHunks() {
    if (!mergedTextarea || _state.manualEdited) return;
    var useFormatted = formatChk && formatChk.checked && _state.srcStruct.isStructured && _state.destStruct.isStructured;
    var activeStruct = (useFormatted && _state.srcStruct.isStructured) ? _state.srcStruct : null;
    mergedTextarea.value = assembleMergedText(_state.hunks, activeStruct, useFormatted);
    updateMergeStatus('', false);
  }

  function renderDiffBody() {
    if (!diffContainer) return;
    var pair = _state.pair;
    if (!pair) return;

    if (pair.isBinary) {
      diffContainer.innerHTML = '<div class="sync-compare-notice">' +
        escHtml(tr('gcSyncBinaryCannotDiff', 'Binary file — text comparison and merging are not available. Compare file size, modified date, and SHA-256 hash above.')) +
        '</div>';
      if (diffCountEl) diffCountEl.textContent = '';
      return;
    }

    if (pair.tooLarge) {
      diffContainer.innerHTML = '<div class="sync-compare-notice">' +
        escHtml(tr('gcSyncTooLargeDiff', 'File exceeds 5 MB text comparison limit.')) +
        '</div>';
      if (diffCountEl) diffCountEl.textContent = '';
      return;
    }

    var diffTotal = _state.diffHunkIndices.length;
    if (diffCountEl) {
      diffCountEl.textContent = diffTotal === 0
        ? tr('gcSyncNoTextDiffs', '0 text differences')
        : trFmt('gcSyncDiffCount', { n: diffTotal }, diffTotal + ' difference(s)');
    }

    var showAllUnchanged = showUnchangedChk && showUnchangedChk.checked;
    var html = '';
    var srcLineNo = 1;
    var destLineNo = 1;

    for (var i = 0; i < _state.hunks.length; i++) {
      var h = _state.hunks[i];
      if (h.type === 'equal') {
        var lines = h.srcLines;
        if (showAllUnchanged || lines.length <= 6) {
          for (var e = 0; e < lines.length; e++) {
            html += '<div class="sync-diff-row is-equal">' +
              '<div class="sync-diff-cell"><span class="sync-ln">' + (srcLineNo++) + '</span><code>' + escHtml(lines[e]) + '</code></div>' +
              '<div class="sync-diff-cell"><span class="sync-ln">' + (destLineNo++) + '</span><code>' + escHtml(lines[e]) + '</code></div>' +
              '</div>';
          }
        } else {
          for (var t1 = 0; t1 < 2; t1++) {
            html += '<div class="sync-diff-row is-equal">' +
              '<div class="sync-diff-cell"><span class="sync-ln">' + (srcLineNo++) + '</span><code>' + escHtml(lines[t1]) + '</code></div>' +
              '<div class="sync-diff-cell"><span class="sync-ln">' + (destLineNo++) + '</span><code>' + escHtml(lines[t1]) + '</code></div>' +
              '</div>';
          }
          var skipped = lines.length - 4;
          srcLineNo += skipped;
          destLineNo += skipped;
          html += '<div class="sync-diff-collapsed">' +
            escHtml(trFmt('gcSyncUnchangedCollapsed', { n: skipped }, skipped + ' unchanged lines hidden')) +
            '</div>';
          for (var b1 = lines.length - 2; b1 < lines.length; b1++) {
            html += '<div class="sync-diff-row is-equal">' +
              '<div class="sync-diff-cell"><span class="sync-ln">' + (srcLineNo++) + '</span><code>' + escHtml(lines[b1]) + '</code></div>' +
              '<div class="sync-diff-cell"><span class="sync-ln">' + (destLineNo++) + '</span><code>' + escHtml(lines[b1]) + '</code></div>' +
              '</div>';
          }
        }
      } else {
        var isActive = (_state.activeDiffCursor >= 0 && _state.diffHunkIndices[_state.activeDiffCursor] === i);
        html += '<div class="sync-diff-hunk' + (isActive ? ' is-active' : '') + '" data-hunk-id="' + h.id + '">';
        html += '<div class="sync-diff-hunk-bar">' +
          '<span class="sync-diff-hunk-label">' + escHtml(tr('gcSyncDifference', 'Difference')) + '</span>' +
          '<div class="sync-diff-hunk-actions">' +
          '<button type="button" class="sync-hunk-btn' + (h.choice === 'src' ? ' active' : '') + '" data-hunk-id="' + h.id + '" data-choice="src">' + escHtml(tr('gcSyncUseApp', 'Use App')) + '</button>' +
          '<button type="button" class="sync-hunk-btn' + (h.choice === 'dest' ? ' active' : '') + '" data-hunk-id="' + h.id + '" data-choice="dest">' + escHtml(tr('gcSyncUseSync', 'Use Sync')) + '</button>' +
          '<button type="button" class="sync-hunk-btn' + (h.choice === 'both' ? ' active' : '') + '" data-hunk-id="' + h.id + '" data-choice="both">' + escHtml(tr('gcSyncUseBoth', 'Use Both')) + '</button>' +
          '</div></div>';

        var maxRows = Math.max(h.srcLines.length, h.destLines.length);
        for (var r = 0; r < maxRows; r++) {
          var hasS = r < h.srcLines.length;
          var hasD = r < h.destLines.length;
          var sCls = hasS ? ' is-src-diff' : ' is-empty-diff';
          var dCls = hasD ? ' is-dest-diff' : ' is-empty-diff';
          if (h.choice === 'src' || h.choice === 'both') sCls += ' is-chosen';
          if (h.choice === 'dest' || h.choice === 'both') dCls += ' is-chosen';

          html += '<div class="sync-diff-row">' +
            '<div class="sync-diff-cell' + sCls + '"><span class="sync-ln">' + (hasS ? (srcLineNo++) : '') + '</span><code>' + (hasS ? escHtml(h.srcLines[r]) : '') + '</code></div>' +
            '<div class="sync-diff-cell' + dCls + '"><span class="sync-ln">' + (hasD ? (destLineNo++) : '') + '</span><code>' + (hasD ? escHtml(h.destLines[r]) : '') + '</code></div>' +
            '</div>';
        }
        html += '</div>';
      }
    }

    diffContainer.innerHTML = html;
  }

  function jumpToDiff(delta) {
    if (_state.diffHunkIndices.length === 0) return;
    _state.activeDiffCursor = (_state.activeDiffCursor + delta + _state.diffHunkIndices.length) % _state.diffHunkIndices.length;
    renderDiffBody();
    var targetId = _state.diffHunkIndices[_state.activeDiffCursor];
    var el = diffContainer && diffContainer.querySelector('.sync-diff-hunk[data-hunk-id="' + targetId + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setAllHunkChoices(choice) {
    for (var i = 0; i < _state.hunks.length; i++) {
      if (_state.hunks[i].type === 'diff') _state.hunks[i].choice = choice;
    }
    _state.manualEdited = false;
    renderDiffBody();
    syncTextareaFromHunks();
  }

  async function openCompareModal(relativePath, callbacks) {
    if (!overlay || !window.electronApi || typeof window.electronApi.readSyncPair !== 'function') return;

    _state.relativePath = relativePath;
    _state.callbacks = callbacks || {};
    _state.manualEdited = false;

    if (titleEl) titleEl.textContent = tr('gcSyncCompareTitle', 'Compare & Merge');
    if (pathEl) pathEl.textContent = relativePath;
    if (diffContainer) diffContainer.innerHTML = '<div class="sync-compare-notice">' + escHtml(tr('gcLoading', 'Loading...')) + '</div>';
    if (metaBar) metaBar.innerHTML = '';
    if (mergeSection) mergeSection.style.display = 'none';
    if (saveMergeBtn) saveMergeBtn.disabled = true;
    if (backupChk) backupChk.checked = false;
    updateMergeStatus('', false);

    overlay.classList.add('open');

    var res = await window.electronApi.readSyncPair({ relativePath: relativePath });
    if (!res || !res.ok) {
      if (diffContainer) diffContainer.innerHTML = '<div class="sync-compare-notice is-error">' + escHtml((res && res.error) || tr('gcSyncReadFailed', 'Failed to read files for comparison.')) + '</div>';
      return;
    }

    _state.pair = res;
    _state.srcStruct = res.isBinary || res.tooLarge ? { isStructured: false } : parseStructuredPayload(res.src.text || '');
    _state.destStruct = res.isBinary || res.tooLarge ? { isStructured: false } : parseStructuredPayload(res.dest.text || '');

    var canFormat = Boolean(_state.srcStruct.isStructured && _state.destStruct.isStructured);
    if (formatLbl) formatLbl.style.display = canFormat ? 'inline-flex' : 'none';
    if (formatChk) formatChk.checked = canFormat;

    var srcHash = res.src.sha256 ? res.src.sha256.slice(0, 10) : '-';
    var destHash = res.dest.sha256 ? res.dest.sha256.slice(0, 10) : '-';
    if (metaBar) {
      metaBar.innerHTML =
        '<div class="sync-compare-meta-card">' +
        '<strong>' + escHtml(tr('gcSyncCurrentApp', 'Current (App)')) + '</strong>' +
        '<span>' + escHtml(fmtSize(res.src.size)) + ' &middot; ' + escHtml(fmtDate(res.src.mtimeMs)) + ' &middot; #' + escHtml(srcHash) + '</span>' +
        '</div>' +
        '<div class="sync-compare-meta-card">' +
        '<strong>' + escHtml(tr('gcSyncFolderCol', 'Sync Folder')) + '</strong>' +
        '<span>' + escHtml(fmtSize(res.dest.size)) + ' &middot; ' + escHtml(fmtDate(res.dest.mtimeMs)) + ' &middot; #' + escHtml(destHash) + '</span>' +
        '</div>' +
        (res.sameContent ? '<div class="sync-compare-same-badge">' + escHtml(tr('gcSyncIdenticalContent', 'Identical content (timestamps differ)')) + '</div>' : '');
    }

    var canMerge = !res.isBinary && !res.tooLarge;
    if (mergeSection) mergeSection.style.display = canMerge ? 'block' : 'none';
    if (saveMergeBtn) saveMergeBtn.disabled = !canMerge;
    if (allAppBtn) allAppBtn.disabled = !canMerge;
    if (allSyncBtn) allSyncBtn.disabled = !canMerge;
    if (prevDiffBtn) prevDiffBtn.disabled = !canMerge;
    if (nextDiffBtn) nextDiffBtn.disabled = !canMerge;

    if (canMerge) {
      rebuildHunks();
    } else {
      renderDiffBody();
    }
  }

  // Event listeners
  if (diffContainer) {
    diffContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.sync-hunk-btn');
      if (!btn) return;
      var hunkId = parseInt(btn.dataset.hunkId, 10);
      var choice = btn.dataset.choice;
      for (var i = 0; i < _state.hunks.length; i++) {
        if (_state.hunks[i].id === hunkId) {
          _state.hunks[i].choice = choice;
          break;
        }
      }
      _state.manualEdited = false;
      renderDiffBody();
      syncTextareaFromHunks();
    });
  }

  if (formatChk) formatChk.addEventListener('change', rebuildHunks);
  if (showUnchangedChk) showUnchangedChk.addEventListener('change', renderDiffBody);
  if (allAppBtn) allAppBtn.addEventListener('click', function () { setAllHunkChoices('src'); });
  if (allSyncBtn) allSyncBtn.addEventListener('click', function () { setAllHunkChoices('dest'); });
  if (prevDiffBtn) prevDiffBtn.addEventListener('click', function () { jumpToDiff(-1); });
  if (nextDiffBtn) nextDiffBtn.addEventListener('click', function () { jumpToDiff(1); });

  if (mergedTextarea) {
    mergedTextarea.addEventListener('input', function () {
      _state.manualEdited = true;
      updateMergeStatus(tr('gcSyncManualEdited', 'Manual edit active'), false);
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  if (keepAppBtn) {
    keepAppBtn.addEventListener('click', function () {
      if (_state.callbacks && typeof _state.callbacks.onChooseAction === 'function') {
        _state.callbacks.onChooseAction(_state.relativePath, 'keep-source');
      }
      closeModal();
    });
  }

  if (keepSyncBtn) {
    keepSyncBtn.addEventListener('click', function () {
      if (_state.callbacks && typeof _state.callbacks.onChooseAction === 'function') {
        _state.callbacks.onChooseAction(_state.relativePath, 'keep-target');
      }
      closeModal();
    });
  }

  if (saveMergeBtn) {
    saveMergeBtn.addEventListener('click', function () {
      if (!mergedTextarea) return;
      var raw = mergedTextarea.value;
      var activeStruct = (_state.srcStruct && _state.srcStruct.isStructured) ? _state.srcStruct : _state.destStruct;
      var check = validateStructuredOutput(raw, activeStruct);
      if (!check.ok) {
        updateMergeStatus(tr('gcSyncInvalidJson', 'Invalid JSON/JS syntax: ') + check.error, true);
        return;
      }
      if (_state.callbacks && typeof _state.callbacks.onSaveMerge === 'function') {
        _state.callbacks.onSaveMerge({
          relativePath: _state.relativePath,
          mergedContent: check.finalText,
          backupBeforeMerge: Boolean(backupChk && backupChk.checked)
        });
      }
      closeModal();
    });
  }

  window.SyncCompareModal = {
    open: openCompareModal
  };
})();
