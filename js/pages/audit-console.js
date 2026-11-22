// Live Audit Console Renderer Controller
(function () {
  'use strict';

  const MAX_BUFFER = 5000;
  const MAX_DOM_ROWS = 1200;

  let _entries = [];
  let _filtered = [];
  let _spikes = [];
  let _activeLevel = 'all';
  let _activeSource = 'all';
  let _searchQuery = '';
  let _useRegex = false;
  let _paused = false;
  let _autoScroll = true;
  let _pinned = false;
  let _spikesOpen = false;
  let _knownSources = new Set();
  let _statsTimer = null;

  const els = {};

  function _t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const val = window.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _formatTime(ts) {
    const d = new Date(ts || Date.now());
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  function _compileMatcher() {
    const q = _searchQuery.trim();
    if (!q) return null;
    if (_useRegex) {
      try {
        const re = new RegExp(q, 'i');
        if (els.searchBox) els.searchBox.classList.remove('regex-invalid');
        return (entry) => re.test(entry.message) || re.test(entry.source) || re.test(entry.level);
      } catch (_) {
        if (els.searchBox) els.searchBox.classList.add('regex-invalid');
        return null;
      }
    }
    if (els.searchBox) els.searchBox.classList.remove('regex-invalid');
    const lower = q.toLowerCase();
    return (entry) =>
      entry.message.toLowerCase().includes(lower) ||
      entry.source.toLowerCase().includes(lower) ||
      entry.level.toLowerCase().includes(lower);
  }

  function _matchesFilter(entry, matcher) {
    if (_activeLevel !== 'all' && entry.level !== _activeLevel) return false;
    if (_activeSource !== 'all' && entry.source !== _activeSource) return false;
    if (matcher && !matcher(entry)) return false;
    return true;
  }

  function _registerSource(source) {
    if (!source || _knownSources.has(source)) return;
    _knownSources.add(source);
    if (!els.sourceSelect) return;
    const opt = document.createElement('option');
    opt.value = source;
    opt.textContent = source;
    els.sourceSelect.appendChild(opt);
  }

  function _createRowEl(entry) {
    const row = document.createElement('div');
    const hasPayload = entry.payload !== undefined && entry.payload !== null;
    row.className = `audit-row lvl-${entry.level}${hasPayload ? ' has-payload' : ''}`;
    row.dataset.id = String(entry.id || '');

    const head = document.createElement('div');
    head.className = 'audit-row-head';

    const tsEl = document.createElement('span');
    tsEl.className = 'audit-ts';
    tsEl.textContent = _formatTime(entry.ts);

    const badge = document.createElement('span');
    badge.className = `audit-badge lvl-${entry.level}`;
    badge.textContent = entry.level;

    const srcEl = document.createElement('span');
    srcEl.className = 'audit-source';
    srcEl.title = entry.source;
    srcEl.textContent = entry.source;

    const msgEl = document.createElement('span');
    msgEl.className = 'audit-msg';
    msgEl.textContent = entry.message;

    head.appendChild(tsEl);
    head.appendChild(badge);
    head.appendChild(srcEl);
    head.appendChild(msgEl);

    if (hasPayload) {
      const tag = document.createElement('span');
      tag.className = 'audit-payload-tag';
      tag.textContent = '{...}';
      head.appendChild(tag);

      const pre = document.createElement('pre');
      pre.className = 'audit-payload';
      try {
        pre.textContent = typeof entry.payload === 'string'
          ? entry.payload
          : JSON.stringify(entry.payload, null, 2);
      } catch (_) {
        pre.textContent = String(entry.payload);
      }

      head.addEventListener('click', () => {
        row.classList.toggle('expanded');
      });

      row.appendChild(head);
      row.appendChild(pre);
    } else {
      row.appendChild(head);
    }

    return row;
  }

  function _updateCounts() {
    if (els.statBuffer) els.statBuffer.textContent = `${_entries.length} / ${MAX_BUFFER}`;
    if (els.statShowing) els.statShowing.textContent = String(_filtered.length);
    if (els.emptyState) {
      els.emptyState.style.display = _filtered.length === 0 ? 'block' : 'none';
    }
  }

  function _scrollToBottom() {
    if (!_autoScroll || !els.streamWrap) return;
    els.streamWrap.scrollTop = els.streamWrap.scrollHeight;
  }

  function _rebuildVisibleList() {
    if (!els.list) return;
    const matcher = _compileMatcher();
    _filtered = _entries.filter((e) => _matchesFilter(e, matcher));

    const start = Math.max(0, _filtered.length - MAX_DOM_ROWS);
    const slice = _filtered.slice(start);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < slice.length; i++) {
      frag.appendChild(_createRowEl(slice[i]));
    }
    els.list.replaceChildren(frag);
    _updateCounts();
    _scrollToBottom();
  }

  function _appendBatch(batch) {
    if (!Array.isArray(batch) || !batch.length) return;
    const matcher = _compileMatcher();
    const frag = document.createDocumentFragment();
    let appendedCount = 0;

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      if (!entry) continue;
      _entries.push(entry);
      _registerSource(entry.source);
      if (!_paused && _matchesFilter(entry, matcher)) {
        _filtered.push(entry);
        frag.appendChild(_createRowEl(entry));
        appendedCount++;
      }
    }

    if (_entries.length > MAX_BUFFER) {
      _entries.splice(0, _entries.length - MAX_BUFFER);
    }
    if (_filtered.length > MAX_BUFFER) {
      _filtered.splice(0, _filtered.length - MAX_BUFFER);
    }

    if (!_paused && appendedCount > 0 && els.list) {
      els.list.appendChild(frag);
      while (els.list.childElementCount > MAX_DOM_ROWS) {
        els.list.removeChild(els.list.firstElementChild);
      }
      _scrollToBottom();
    }

    _updateCounts();
  }

  function _jumpToLogId(logId) {
    if (!logId || !els.list) return;
    let row = els.list.querySelector(`.audit-row[data-id="${logId}"]`);
    if (!row) {
      // Reset filters if the correlated event is currently filtered out
      _activeLevel = 'all';
      _activeSource = 'all';
      _searchQuery = '';
      if (els.sourceSelect) els.sourceSelect.value = 'all';
      if (els.searchInput) els.searchInput.value = '';
      if (els.levelChips) {
        els.levelChips.querySelectorAll('.level-chip').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-level') === 'all');
        });
      }
      _rebuildVisibleList();
      row = els.list.querySelector(`.audit-row[data-id="${logId}"]`);
    }
    if (row) {
      els.list.querySelectorAll('.audit-row.highlighted').forEach((el) => el.classList.remove('highlighted'));
      row.classList.add('highlighted');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { row.classList.remove('highlighted'); }, 2600);
    }
  }

  async function _analyzeSpikeWithAi(spike, btn, resultEl) {
    if (!window.SlmService || typeof window.SlmService.generateText !== 'function') {
      resultEl.hidden = false;
      resultEl.textContent = _t('auditAiUnavailable', 'Local AI (SLM) is not available or no model is downloaded. Configure one in General Config → Storage & Sync.');
      return;
    }
    btn.disabled = true;
    const origText = btn.querySelector('span');
    if (origText) origText.textContent = _t('auditAiAnalyzing', 'Analyzing...');
    resultEl.hidden = false;
    resultEl.textContent = '';

    const eventsText = (spike.correlatedEvents || [])
      .map((e) => `- [${e.level}] ${e.source}: ${e.message}`)
      .join('\n') || 'None';
    const prompt = [
      `Spike: ${spike.summary}`,
      `Metrics: CPU ${spike.metrics?.cpuPct ?? 0}%, RAM ${spike.metrics?.workingSetMB ?? 0}MB, Lag ${spike.metrics?.eventLoopLagMs ?? 0}ms, Process ${spike.metrics?.topProcess || 'main'}`,
      `Correlated events:\n${eventsText}`,
      `Give a 2-3 sentence root-cause diagnosis and concrete code/runtime fix for this Electron app.`
    ].join('\n\n');

    try {
      const res = await window.SlmService.generateText({
        systemPrompt: 'You are a concise Electron performance diagnostic assistant.',
        prompt,
        maxNewTokens: 180,
        promptDownloadIfMissing: false,
        onToken: (_tok, full) => {
          if (full) resultEl.textContent = full;
        }
      });
      if (!res || !res.ok) {
        resultEl.textContent = (res && res.error) || _t('auditAiUnavailable', 'Local AI (SLM) is not available or no model is downloaded. Configure one in General Config → Storage & Sync.');
      } else if (res.text) {
        resultEl.textContent = res.text.trim();
      }
    } catch (err) {
      resultEl.textContent = err && err.message ? err.message : _t('auditAiUnavailable', 'Local AI (SLM) is not available or no model is downloaded.');
    } finally {
      btn.disabled = false;
      if (origText) origText.textContent = _t('auditAiAnalyze', 'AI Analyze');
    }
  }

  function _createSpikeCardEl(spike) {
    const card = document.createElement('div');
    card.className = `spike-card sev-${spike.severity || 'warn'}`;

    const head = document.createElement('div');
    head.className = 'spike-card-head';

    const tsEl = document.createElement('span');
    tsEl.className = 'audit-ts';
    tsEl.textContent = _formatTime(spike.ts);

    const kindEl = document.createElement('span');
    kindEl.className = 'spike-kind';
    kindEl.textContent = spike.kind || 'perf';

    const sumEl = document.createElement('span');
    sumEl.className = 'spike-summary';
    sumEl.textContent = spike.summary || '';

    const aiBtn = document.createElement('button');
    aiBtn.type = 'button';
    aiBtn.className = 'spike-ai-btn';
    const aiIcon = document.createElement('img');
    aiIcon.src = '../assets/icons/brain.svg';
    aiIcon.alt = '';
    const aiSpan = document.createElement('span');
    aiSpan.textContent = _t('auditAiAnalyze', 'AI Analyze');
    aiBtn.appendChild(aiIcon);
    aiBtn.appendChild(aiSpan);

    const aiResult = document.createElement('div');
    aiResult.className = 'spike-ai-result';
    aiResult.hidden = true;
    aiBtn.addEventListener('click', () => _analyzeSpikeWithAi(spike, aiBtn, aiResult));

    head.appendChild(tsEl);
    head.appendChild(kindEl);
    head.appendChild(sumEl);
    head.appendChild(aiBtn);
    card.appendChild(head);

    if (spike.remedyHint) {
      const remEl = document.createElement('div');
      remEl.className = 'spike-remedy';
      remEl.textContent = spike.remedyHint;
      card.appendChild(remEl);
    }

    if (Array.isArray(spike.correlatedEvents) && spike.correlatedEvents.length) {
      const corrRow = document.createElement('div');
      corrRow.className = 'spike-corr-row';

      const lbl = document.createElement('span');
      lbl.className = 'stat-label';
      lbl.textContent = _t('auditCorrelatedLabel', 'Trigger events:');
      corrRow.appendChild(lbl);

      const slice = spike.correlatedEvents.slice(-5);
      for (let i = 0; i < slice.length; i++) {
        const ev = slice[i];
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'spike-corr-chip';
        chip.title = `[${ev.level}] ${ev.source}: ${ev.message}`;
        chip.textContent = `[${ev.source}] ${ev.message}`;
        chip.addEventListener('click', () => _jumpToLogId(ev.id));
        corrRow.appendChild(chip);
      }
      card.appendChild(corrRow);
    }

    card.appendChild(aiResult);
    return card;
  }

  function _renderSpikesPanel() {
    if (!els.spikesList) return;
    if (els.statSpikes) els.statSpikes.textContent = String(_spikes.length);
    if (els.statSpikesBtn) els.statSpikesBtn.classList.toggle('has-spikes', _spikes.length > 0);

    if (!_spikes.length) {
      const empty = document.createElement('div');
      empty.className = 'spikes-empty';
      empty.textContent = _t('auditSpikesEmpty', 'No CPU, memory, event-loop, or slow-IPC spikes detected yet.');
      els.spikesList.replaceChildren(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    for (let i = _spikes.length - 1; i >= 0; i--) {
      frag.appendChild(_createSpikeCardEl(_spikes[i]));
    }
    els.spikesList.replaceChildren(frag);
  }

  function _applyStats(stats) {
    if (!stats) return;
    if (els.statWindows) els.statWindows.textContent = String(stats.windowCount || 0);
    if (els.statServer && stats.server) {
      els.statServer.textContent = stats.server.running
        ? `:${stats.server.port || 8787}`
        : _t('auditServerOff', 'Off');
    }
    const perf = stats.perf;
    if (perf && perf.current && perf.peaks) {
      const cur = perf.current;
      const pk = perf.peaks;
      if (els.statCpu) {
        els.statCpu.textContent = `${cur.cpuPct || 0}% (Peak ${pk.cpuPct || 0}%)`;
      }
      if (els.statMemory) {
        const curRam = cur.workingSetMB || cur.rssMB || 0;
        const pkRam = pk.workingSetMB || pk.rssMB || 0;
        els.statMemory.textContent = `${curRam} MB (Peak ${pkRam} MB)`;
      }
      if (els.statLag) {
        els.statLag.textContent = `${cur.eventLoopLagMs || 0}ms (Peak ${pk.eventLoopLagMs || 0}ms)`;
      }
      if (els.spikesPeaksSummary) {
        els.spikesPeaksSummary.textContent =
          `Peak CPU: ${pk.cpuPct || 0}% (${pk.cpuProcess || 'main'}) | Peak RAM: ${pk.workingSetMB || 0} MB (${pk.workingSetProcess || 'main'}) | Main Heap Peak: ${pk.heapUsedMB || 0} MB`;
      }
      if (Array.isArray(perf.spikes) && perf.spikes.length !== _spikes.length) {
        _spikes = perf.spikes;
        _renderSpikesPanel();
      }
    } else if (els.statMemory && stats.memory) {
      els.statMemory.textContent = `${stats.memory.heapUsedMB || 0} / ${stats.memory.rssMB || 0} MB`;
    }
  }

  async function _refreshStats() {
    if (!window.Desktop || typeof window.Desktop.auditGetStats !== 'function') return;
    try {
      const res = await window.Desktop.auditGetStats();
      if (res && res.ok && res.stats) _applyStats(res.stats);
    } catch (_) {}
  }

  function _formatExportText() {
    return _filtered.map((e) => {
      const base = `[${_formatTime(e.ts)}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}`;
      if (e.payload !== undefined && e.payload !== null) {
        try {
          return `${base}\n  ${JSON.stringify(e.payload)}`;
        } catch (_) {
          return `${base}\n  ${String(e.payload)}`;
        }
      }
      return base;
    }).join('\n');
  }

  async function _exportLogs(ext) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `audit-logs-${stamp}.${ext}`;
    const content = ext === 'json'
      ? JSON.stringify(_filtered, null, 2)
      : _formatExportText();

    if (window.Desktop && typeof window.Desktop.saveFile === 'function') {
      try {
        const res = await window.Desktop.saveFile({
          target: 'user',
          subdir: 'logs',
          filename,
          content,
          encoding: 'utf8'
        });
        if (res && res.ok) {
          if (typeof window.showExportSuccessPopup === 'function') {
            window.showExportSuccessPopup(res.path, res.name || filename);
          } else if (typeof window.showToast === 'function') {
            window.showToast(_t('auditExportSuccess', 'Logs exported.'));
          }
          return;
        }
      } catch (_) {}
    }

    // Web fallback download
    const blob = new Blob([content], { type: ext === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function _startTour() {
    if (typeof window.Tutorial === 'undefined') return;
    const steps = [
      { selector: '#auditStatsBar', title: _t('tutAudit1Title', 'Live System Stats'), text: _t('tutAudit1Text', 'Monitor open windows, Main process memory usage, Classroom Server status, and log buffer capacity.') },
      { selector: '#auditLevelChips', title: _t('tutAudit2Title', 'Filter by Stream & Level'), text: _t('tutAudit2Text', 'Isolate errors, warnings, IPC calls, cross-window sync, file I/O, or server logs with one click.') },
      { selector: '#auditStreamWrap', title: _t('tutAudit3Title', 'Inspect Payloads'), text: _t('tutAudit3Text', 'Click any log entry with a {...} badge to expand and inspect its full JSON payload or stack trace.') }
    ].filter((s) => s && s.selector && document.querySelector(s.selector));
    if (!steps.length) return;
    window.Tutorial.start(steps, {
      next: _t('tutNext', 'Next'),
      prev: _t('tutPrev', 'Back'),
      skip: _t('tutSkip', 'Skip'),
      done: _t('tutDone', 'Done')
    });
  }

  function _wireEvents() {
    if (els.levelChips) {
      els.levelChips.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.level-chip[data-level]');
        if (!btn) return;
        els.levelChips.querySelectorAll('.level-chip').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        _activeLevel = btn.getAttribute('data-level') || 'all';
        _rebuildVisibleList();
      });
    }

    if (els.sourceSelect) {
      els.sourceSelect.addEventListener('change', () => {
        _activeSource = els.sourceSelect.value || 'all';
        _rebuildVisibleList();
      });
    }

    if (els.searchInput) {
      let searchTimer = null;
      els.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          _searchQuery = els.searchInput.value || '';
          _rebuildVisibleList();
        }, 120);
      });
    }

    if (els.regexBtn) {
      els.regexBtn.addEventListener('click', () => {
        _useRegex = !_useRegex;
        els.regexBtn.classList.toggle('active', _useRegex);
        _rebuildVisibleList();
      });
    }

    if (els.pauseBtn) {
      els.pauseBtn.addEventListener('click', () => {
        _paused = !_paused;
        els.pauseBtn.classList.toggle('active-toggle', _paused);
        if (els.pauseIcon) {
          els.pauseIcon.src = _paused ? '../assets/icons/play.svg' : '../assets/icons/pause.svg';
        }
        if (els.pauseLabel) {
          els.pauseLabel.textContent = _paused ? _t('auditResume', 'Resume') : _t('auditPause', 'Pause');
        }
        if (!_paused) _rebuildVisibleList();
      });
    }

    if (els.autoScrollBtn) {
      els.autoScrollBtn.addEventListener('click', () => {
        _autoScroll = !_autoScroll;
        els.autoScrollBtn.classList.toggle('active-toggle', _autoScroll);
        if (_autoScroll) _scrollToBottom();
      });
    }

    if (els.pinBtn) {
      els.pinBtn.addEventListener('click', async () => {
        _pinned = !_pinned;
        if (window.Desktop && typeof window.Desktop.auditSetAlwaysOnTop === 'function') {
          const res = await window.Desktop.auditSetAlwaysOnTop(_pinned);
          if (res && typeof res.isAlwaysOnTop === 'boolean') _pinned = res.isAlwaysOnTop;
        }
        els.pinBtn.classList.toggle('active-toggle', _pinned);
      });
    }

    if (els.copyBtn) {
      els.copyBtn.addEventListener('click', async () => {
        const txt = _formatExportText();
        try {
          await navigator.clipboard.writeText(txt);
          if (typeof window.showToast === 'function') {
            window.showToast(_t('auditCopied', 'Visible logs copied to clipboard.'));
          }
        } catch (_) {}
      });
    }

    if (els.exportTxtBtn) {
      els.exportTxtBtn.addEventListener('click', () => _exportLogs('txt'));
    }

    if (els.exportJsonBtn) {
      els.exportJsonBtn.addEventListener('click', () => _exportLogs('json'));
    }

    if (els.clearBtn) {
      els.clearBtn.addEventListener('click', async () => {
        _entries = [];
        _filtered = [];
        if (els.list) els.list.replaceChildren();
        _updateCounts();
        if (window.Desktop && typeof window.Desktop.auditClear === 'function') {
          await window.Desktop.auditClear();
        }
      });
    }

    if (els.tourBtn) {
      els.tourBtn.addEventListener('click', _startTour);
    }

    const _toggleSpikesPanel = (forceState) => {
      _spikesOpen = typeof forceState === 'boolean' ? forceState : !_spikesOpen;
      if (els.spikesPanel) els.spikesPanel.hidden = !_spikesOpen;
      if (els.statSpikesBtn) els.statSpikesBtn.classList.toggle('active-toggle', _spikesOpen);
    };

    if (els.statSpikesBtn) {
      els.statSpikesBtn.addEventListener('click', () => _toggleSpikesPanel());
    }
    if (els.closeSpikesBtn) {
      els.closeSpikesBtn.addEventListener('click', () => _toggleSpikesPanel(false));
    }
    if (els.resetPeaksBtn) {
      els.resetPeaksBtn.addEventListener('click', async () => {
        _spikes = [];
        _renderSpikesPanel();
        if (window.Desktop && typeof window.Desktop.auditResetPeaks === 'function') {
          const res = await window.Desktop.auditResetPeaks();
          if (res && res.ok && res.perf) {
            _applyStats({ windowCount: Number(els.statWindows?.textContent || 0), perf: res.perf });
          }
        }
      });
    }
  }

  async function _init() {
    els.levelChips = document.getElementById('auditLevelChips');
    els.sourceSelect = document.getElementById('auditSourceSelect');
    els.searchInput = document.getElementById('auditSearchInput');
    els.searchBox = els.searchInput ? els.searchInput.closest('.search-box') : null;
    els.regexBtn = document.getElementById('auditRegexBtn');
    els.pauseBtn = document.getElementById('auditPauseBtn');
    els.pauseIcon = document.getElementById('auditPauseIcon');
    els.pauseLabel = document.getElementById('auditPauseLabel');
    els.autoScrollBtn = document.getElementById('auditAutoScrollBtn');
    els.pinBtn = document.getElementById('auditPinBtn');
    els.copyBtn = document.getElementById('auditCopyBtn');
    els.exportTxtBtn = document.getElementById('auditExportTxtBtn');
    els.exportJsonBtn = document.getElementById('auditExportJsonBtn');
    els.clearBtn = document.getElementById('auditClearBtn');
    els.tourBtn = document.getElementById('auditTourBtn');
    els.statWindows = document.getElementById('statWindows');
    els.statCpu = document.getElementById('statCpu');
    els.statMemory = document.getElementById('statMemory');
    els.statLag = document.getElementById('statLag');
    els.statServer = document.getElementById('statServer');
    els.statAi = document.getElementById('statAi');
    els.statSpikesBtn = document.getElementById('statSpikesBtn');
    els.statSpikes = document.getElementById('statSpikes');
    els.statBuffer = document.getElementById('statBuffer');
    els.statShowing = document.getElementById('statShowing');
    els.spikesPanel = document.getElementById('auditSpikesPanel');
    els.spikesList = document.getElementById('auditSpikesList');
    els.spikesPeaksSummary = document.getElementById('spikesPeaksSummary');
    els.resetPeaksBtn = document.getElementById('auditResetPeaksBtn');
    els.closeSpikesBtn = document.getElementById('auditCloseSpikesBtn');
    els.streamWrap = document.getElementById('auditStreamWrap');
    els.emptyState = document.getElementById('auditEmptyState');
    els.list = document.getElementById('auditList');

    if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
      window.i18n.applyTranslations();
    }

    _wireEvents();

    if (window.Desktop && typeof window.Desktop.auditGetSnapshot === 'function') {
      try {
        const snap = await window.Desktop.auditGetSnapshot();
        if (snap && snap.ok) {
          if (Array.isArray(snap.logs)) {
            _entries = snap.logs;
            _entries.forEach((e) => _registerSource(e.source));
            _rebuildVisibleList();
          }
          if (snap.stats) {
            if (snap.stats.perf && Array.isArray(snap.stats.perf.spikes)) {
              _spikes = snap.stats.perf.spikes;
              _renderSpikesPanel();
            }
            _applyStats(snap.stats);
          }
        }
      } catch (_) {}
    }

    if (window.Desktop && typeof window.Desktop.onAuditLogBatch === 'function') {
      window.Desktop.onAuditLogBatch((batch) => _appendBatch(batch));
    }

    if (window.Desktop && typeof window.Desktop.onAuditSpike === 'function') {
      window.Desktop.onAuditSpike((spike) => {
        if (!spike) return;
        _spikes.push(spike);
        if (_spikes.length > 200) _spikes.splice(0, _spikes.length - 200);
        _renderSpikesPanel();
      });
    }

    _statsTimer = setInterval(_refreshStats, 2500);
    _refreshAiStatus();
    window.addEventListener('beforeunload', () => {
      if (_statsTimer) clearInterval(_statsTimer);
    });
  }

  async function _refreshAiStatus() {
    if (!els.statAi || !window.electronApi) return;
    const parts = [];
    try {
      if (typeof window.electronApi.slmGetConfig === 'function') {
        const slm = await window.electronApi.slmGetConfig();
        if (slm && slm.activeModelId) parts.push(`SLM:${slm.activeModelId}`);
      }
    } catch (_) {}
    try {
      if (typeof window.electronApi.whisperGetConfig === 'function') {
        const wh = await window.electronApi.whisperGetConfig();
        if (wh && wh.activeModelId) parts.push(`Whisper:${wh.activeModelId}`);
      }
    } catch (_) {}
    els.statAi.textContent = parts.length ? parts.join(' | ') : _t('auditAiIdle', 'Idle');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
