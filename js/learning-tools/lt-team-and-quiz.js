    // =============================================
    // TEAM MODE
    // =============================================
    const TEAM_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
    const TEAM_NAMES_DEFAULT = ['Team Red', 'Team Blue', 'Team Green', 'Team Orange'];
    let teams = []; // { name, color, score }
    let currentTeamIdx = 0;
    let turnsPerTeam = 5;
    let teamTurnsUsed = {}; // teamIdx -> turns used so far
    let teamPickedStudent = '';
    let _teamCalledStudents = new Set();

    const POINTS_WIN = 20;
    const POINTS_LOSE = -10;
    const POINTS_CLUE_PENALTY = -5;  // Penalty for using a hint
    const POINTS_WRONG_PENALTY = -2; // Penalty for a wrong guess
    const POINTS_WS_WORD = 5;        // Points per word found in Word Search

    // Game section -> team UI element id mapping
    const GAME_TEAM_UI_MAP = {
      'match-game-section': 'match-team-ui',
      'flip-game-section': 'flip-team-ui',
      'hangman-game-section': 'hangman-team-ui',
      'scramble-game-section': 'scramble-team-ui',
      'clue-game-section': 'clue-team-ui',
      'sentence-game-section': 'sentence-team-ui',
      'quote-game-section': 'quote-team-ui',
      'gap-game-section': 'gap-team-ui',
      'error-game-section': 'error-team-ui',
      'ipa-game-section': 'ipa-team-ui',
      'synonym-game-section': 'synonym-team-ui',
      'wordsearch-game-section': 'wordsearch-team-ui',
      'dictation-section': 'dictation-team-ui',
      'order-sentences-section': 'order-team-ui',
      'quiz-section': 'quiz-team-ui',
    };

    function _getActiveClassStudentList() {
      if (!activeClassGroup || typeof CLASS_GROUPS === 'undefined' || !CLASS_GROUPS) return [];
      const raw = CLASS_GROUPS[activeClassGroup];
      if (!Array.isArray(raw) || !raw.length) return [];
      return _ltHalfFilter(activeClassGroup, raw);
    }

    function teamPickRandomStudent() {
      const list = _getActiveClassStudentList();
      if (!list.length) return;
      let pool = list.filter(s => !_teamCalledStudents.has(s));
      if (!pool.length) {
        _teamCalledStudents.clear();
        pool = list;
      }
      teamPickedStudent = pool[Math.floor(Math.random() * pool.length)];
      _teamCalledStudents.add(teamPickedStudent);
      renderGameTeamUI();
    }

    function addTeam() {
      if (teams.length >= 4) return;
      const idx = teams.length;
      teams.push({ name: TEAM_NAMES_DEFAULT[idx], color: TEAM_COLORS[idx], score: 0 });
      renderTeamSetup();
      renderMainScoreboard();
    }

    function clearAllTeams() {
      teams = [];
      currentTeamIdx = 0;
      renderTeamSetup();
      renderMainScoreboard();
    }

    function resetTeams() {
      teams.forEach(t => t.score = 0);
      renderMainScoreboard();
      renderGameTeamUI();
    }

    function renderTeamSetup() {
      const container = document.getElementById('team-inputs-container');
      container.innerHTML = '';
      teams.forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'team-input-row';
        row.innerHTML = `
          <span class="team-color-dot" style="background:${t.color}"></span>
          <input type="text" value="${t.name}" oninput="teams[${i}].name=this.value; renderMainScoreboard(); renderGameTeamUI();" />
          <button class="action-btn btn-grey" style="padding:5px 10px; font-size:0.8rem;" onclick="removeTeam(${i})">✕</button>
        `;
        container.appendChild(row);
      });
    }

    function removeTeam(idx) {
      teams.splice(idx, 1);
      if (currentTeamIdx >= teams.length) currentTeamIdx = 0;
      renderTeamSetup();
      renderMainScoreboard();
    }

    function renderMainScoreboard() {
      const sb = document.getElementById('team-scoreboard');
      if (!sb) return;
      sb.innerHTML = '';
      teams.forEach((t, i) => {
        const chip = document.createElement('div');
        chip.className = 'team-score-chip' + (i === currentTeamIdx ? ' active-team' : '');
        chip.innerHTML = `<span class="team-color-dot" style="background:${t.color}"></span><span>${t.name}</span><strong>${t.score} pts</strong>`;
        sb.appendChild(chip);
      });
    }

    function applyTeamBackground() {
      const el = document.getElementById(activeSection);
      if (!el) return;
      if (teams.length === 0 || activeSection === 'main-menu') {
        el.style.background = '';
        el.style.borderColor = '';
        el.style.boxShadow = '';
        return;
      }
      const color = teams[currentTeamIdx].color;
      el.style.background = hexToRgba(color, 0.08);
      el.style.borderColor = hexToRgba(color, 0.7);
      el.style.boxShadow = `3px 3px 0 ${hexToRgba(color, 0.25)}`;
    }

    function hexToRgba(hex, alpha) {
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function renderGameTeamUI() {
      const uiId = GAME_TEAM_UI_MAP[activeSection];
      if (!uiId) return;
      const el = document.getElementById(uiId);
      if (!el) return;
      if (teams.length === 0) { el.classList.add('hidden'); el.innerHTML = ''; return; }
      el.classList.remove('hidden');
      const t = teams[currentTeamIdx];
      let scoreHtml = teams.map((tm, i) => {
        const isActive = i === currentTeamIdx;
        return `<span class="team-score-chip clickable${isActive ? ' active-team' : ''}"
          style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:16px;background:white;border:2px solid ${tm.color};margin:4px;opacity:${isActive ? '1' : '0.6'};"
          title="${isActive ? 'Current turn' : 'Switch to ' + tm.name}"
          onclick="switchToTeam(${i})">
          <span class="team-color-dot" style="background:${tm.color}"></span>
          <span style="margin:0 2px;">${tm.name}: <strong>${tm.score}</strong></span>
          <button class="team-manual-btn team-manual-minus" onclick="event.stopPropagation();manualAwardPoints(${i},-1)" title="-1 pt to ${tm.name}">−</button>
          <button class="team-manual-btn team-manual-plus"  onclick="event.stopPropagation();manualAwardPoints(${i},+1)" title="+1 pt to ${tm.name}">+</button>
        </span>`;
      }).join('');
      const turnsLeft = turnsPerTeam - (teamTurnsUsed[currentTeamIdx] || 0);
      const turnsTag = teams.length >= 2
        ? `<span style="font-size:0.62em;opacity:0.85;font-weight:600;"> — ${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''} left</span>`
        : '';
      const classStudents = _getActiveClassStudentList();
      const studentPickerHtml = classStudents.length > 0
        ? `<span style="margin-left:10px;display:inline-flex;align-items:center;gap:6px;vertical-align:middle;">
             <button type="button" onclick="event.stopPropagation(); teamPickRandomStudent();" style="padding:3px 9px;font-size:0.65rem;font-weight:800;border:2px solid #222;border-radius:6px;background:#f5f5f0;color:#222;cursor:pointer;box-shadow:2px 2px 0 #222;">${window.t ? window.t('teamPickStudentBtn') : 'Pick Student'}</button>
             ${teamPickedStudent ? `<span style="padding:2px 8px;font-size:0.7rem;font-weight:800;background:#ffffff;color:#222;border:2px solid #222;border-radius:6px;">${teamPickedStudent}</span>` : ''}
           </span>`
        : '';
      el.innerHTML = `
        <div id="turn-banner" style="background:${t.color}">${t.name}'s Turn!${turnsTag}${studentPickerHtml}</div>
        <div style="text-align:center;margin-bottom:4px;">${scoreHtml}</div>
        ${teams.length > 1 ? '<div class="team-switch-hint">Click a team to switch turns · Use +/− to adjust points manually</div>' : ''}
      `;
      applyTeamBackground();
    }

    /* ── Sound Engine ─────────────────────────────────────────── */
    let soundMuted = false;

    function getAudioCtx() {
      return getAudioContext();
    }

    function toggleMute() {
      soundMuted = !soundMuted;
      if (soundMuted && typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) { }
      }
      const btn = document.getElementById('mute-btn');
      if (btn) {
        const iconSrc = soundMuted ? '../assets/icons/mute.svg' : '../assets/icons/volume.svg';
        btn.innerHTML = `<img src="${iconSrc}" class="btn-icon" style="filter:invert(1);" alt="" />`;
      }
    }

    function playJingle() {
      if (soundMuted) return;
      try {
        const ctx = getAudioCtx();
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          const t = ctx.currentTime + i * 0.12;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.start(t);
          osc.stop(t + 0.23);
        });
      } catch (e) { }
    }

    function playBuzzer() {
      if (soundMuted) return;
      try {
        const ctx = getAudioCtx();
        const notes = [220, 155];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
          osc.frequency.linearRampToValueAtTime(freq * 0.8, ctx.currentTime + i * 0.13 + 0.18);
          const t = ctx.currentTime + i * 0.13;
          gain.gain.setValueAtTime(0.09, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.21);
        });
      } catch (e) { }
    }
    /* ─────────────────────────────────────────────────────────── */

    function awardPoints(pts) {
      if (teams.length === 0) return;
      teams[currentTeamIdx].score += pts;
      const msg = (pts >= 0 ? `+${pts}` : `${pts}`) + ' pts';
      if (pts > 0) playJingle(); else if (pts < 0) playBuzzer();
      showPointsToast(pts, msg);
    }

    function manualAwardPoints(teamIdx, pts) {
      if (teamIdx < 0 || teamIdx >= teams.length) return;
      teams[teamIdx].score += pts;
      const msg = (pts >= 0 ? `+${pts}` : `${pts}`) + ' → ' + teams[teamIdx].name;
      showPointsToast(pts, msg);
    }

    function nextTeamTurn() {
      if (teams.length === 0) return;
      teamPickedStudent = '';
      if (teams.length >= 2) {
        teamTurnsUsed[currentTeamIdx] = (teamTurnsUsed[currentTeamIdx] || 0) + 1;
        if (teams.every((_, i) => (teamTurnsUsed[i] || 0) >= turnsPerTeam)) {
          timerStop();
          endgameShow();
          return;
        }
        let next = (currentTeamIdx + 1) % teams.length;
        let tries = 0;
        while ((teamTurnsUsed[next] || 0) >= turnsPerTeam && tries < teams.length) {
          next = (next + 1) % teams.length;
          tries++;
        }
        currentTeamIdx = next;
      } else {
        currentTeamIdx = (currentTeamIdx + 1) % teams.length;
      }
      timerReset();
      renderMainScoreboard();
      if (activeSection !== 'main-menu') {
        refreshCurrentGame();
        renderGameTeamUI();
      }
    }

    // Like nextTeamTurn but skips refreshCurrentGame — used in Word Search & Match
    function wsNextTeamTurn() {
      if (teams.length === 0) return;
      teamPickedStudent = '';
      if (teams.length >= 2) {
        teamTurnsUsed[currentTeamIdx] = (teamTurnsUsed[currentTeamIdx] || 0) + 1;
        if (teams.every((_, i) => (teamTurnsUsed[i] || 0) >= turnsPerTeam)) {
          timerStop();
          endgameShow();
          return;
        }
        let next = (currentTeamIdx + 1) % teams.length;
        let tries = 0;
        while ((teamTurnsUsed[next] || 0) >= turnsPerTeam && tries < teams.length) {
          next = (next + 1) % teams.length;
          tries++;
        }
        currentTeamIdx = next;
      } else {
        currentTeamIdx = (currentTeamIdx + 1) % teams.length;
      }
      timerReset();
      renderMainScoreboard();
      renderGameTeamUI();
    }

    // =============================================
    // KAHOOT-STYLE QUIZ (CUSTOM BANK)
    // =============================================
    let quizCurrent = null;
    let quizAnswered = false;
    let quizUsed = new Set();
    let quizScore = 0;
    let quizStreak = 0;
    let quizSeen = 0;
    let quizMp = {
      ws: null,
      connected: false,
      answers: { answered: 0, total: 0 },
      players: [],
      leaderboard: []
    };
    let _quizMpHostSecret = null;
    let quizDevFeaturesEnabled = false;

    function readDevFeaturesSetting() {
      try {
        const cfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
        return cfg.showDevFeatures === true;
      } catch (_) {
        return false;
      }
    }

    function quizApplyDevFeatureVisibility() {
      quizDevFeaturesEnabled = readDevFeaturesSetting();
      const mpOption = document.getElementById('quiz-mode-mp-host-option');
      if (mpOption) mpOption.hidden = !quizDevFeaturesEnabled;

      const devControls = document.getElementById('quiz-mp-dev-controls');
      if (devControls) devControls.style.display = quizDevFeaturesEnabled ? 'flex' : 'none';

      const connectBtn = document.getElementById('quiz-mp-connect-btn');
      if (connectBtn) connectBtn.style.display = quizDevFeaturesEnabled ? '' : 'none';
      const disconnectBtn = document.getElementById('quiz-mp-disconnect-btn');
      if (disconnectBtn) disconnectBtn.style.display = quizDevFeaturesEnabled ? '' : 'none';
      const endBtn = document.getElementById('quiz-mp-end-btn');
      if (endBtn) endBtn.style.display = quizDevFeaturesEnabled ? '' : 'none';

      const modeEl = document.getElementById('quiz-play-mode');
      if (!quizDevFeaturesEnabled && modeEl && modeEl.value === 'multiplayer-host') {
        modeEl.value = 'single';
      }
    }

    function quizIsMpHostMode() {
      const modeEl = document.getElementById('quiz-play-mode');
      return quizDevFeaturesEnabled && !!modeEl && modeEl.value === 'multiplayer-host';
    }

    function quizMpSetStatus(text, isError) {
      const el = document.getElementById('quiz-mp-status');
      if (!el) return;
      el.textContent = String(text || '');
      el.style.color = isError ? '#b91c1c' : '#475569';
    }

    function quizMpRenderPresence() {
      const listEl = document.getElementById('quiz-mp-presence');
      const answersEl = document.getElementById('quiz-mp-answers');
      if (answersEl) {
        answersEl.textContent = 'Answered: ' + Number(quizMp.answers.answered || 0) + '/' + Number(quizMp.answers.total || 0);
      }
      if (!listEl) return;
      const players = Array.isArray(quizMp.players) ? quizMp.players : [];
      if (!players.length) {
        listEl.textContent = 'Players connected: 0';
        return;
      }
      listEl.textContent = 'Players (' + players.length + '): ' + players.map(function (p) {
        const name = String((p && p.name) || 'Player');
        const score = Number((p && p.score) || 0);
        return name + ' (' + score + ')';
      }).join(', ');
    }

    function quizMpFormatTimeMs(ms) {
      const n = Number(ms);
      if (!isFinite(n) || n < 0) return '--';
      if (n < 10000) return (n / 1000).toFixed(2) + 's';
      return (n / 1000).toFixed(1) + 's';
    }

    function quizMpRenderLeaderboard() {
      const el = document.getElementById('quiz-mp-leaderboard');
      if (!el) return;
      const rows = Array.isArray(quizMp.leaderboard) ? quizMp.leaderboard : [];
      if (!rows.length) {
        el.textContent = 'Leaderboard: waiting for answers.';
        return;
      }
      const top = rows.slice(0, 8).map(function (item, idx) {
        const name = String(item.name || 'Player');
        const score = Number(item.score || 0);
        const hasRoundData = Number.isFinite(Number(item.scoreDelta)) || Number.isFinite(Number(item.elapsedMs)) || Number.isFinite(Number(item.speedRank));
        if (!hasRoundData) {
          return (idx + 1) + '. ' + name + ' - ' + score;
        }
        const delta = Number(item.scoreDelta || 0);
        const deltaText = (delta > 0 ? '+' : '') + delta;
        const timeText = quizMpFormatTimeMs(item.elapsedMs);
        const rankText = item.speedRank ? ('#' + Number(item.speedRank)) : '--';
        return (idx + 1) + '. ' + name + ' - ' + score + ' (' + deltaText + ' pts, ' + timeText + ', speed ' + rankText + ')';
      }).join(' | ');
      el.textContent = 'Leaderboard: ' + top;
    }

    async function quizMpEnsureServerForElectron() {
      if (!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron())) {
        return null;
      }
      if (!(window.Desktop && typeof Desktop.quizServerStart === 'function')) {
        return null;
      }
      let res = null;
      try {
        res = await Desktop.quizServerStart(8787);
      } catch (_) {
        return null;
      }
      if (!res || res.ok === false) {
        return null;
      }
      return res;
    }

    function quizMpBuildWsUrl() {
      const inputEl = document.getElementById('quiz-mp-server');
      const isElectron = !!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron());
      let base = '';
      if (_quizMpCurrentMode === 'local') {
        base = isElectron ? String((inputEl && inputEl.value) || '').trim() : location.origin;
      } else {
        base = String((inputEl && inputEl.value) || '').trim();
      }
      if (!base) base = location.origin;
      if (!/^https?:\/\//i.test(base) && !/^wss?:\/\//i.test(base)) {
        base = 'http://' + base;
      }
      if (/^wss?:\/\//i.test(base)) {
        const clean = base.replace(/\/+$/, '');
        return /\/quiz-ws$/i.test(clean) ? clean : (clean + '/quiz-ws');
      }
      const u = new URL(base);
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return proto + '//' + u.host + '/quiz-ws';
    }

    function quizMpGetSelectedClassGroup() {
      const classEl = document.getElementById('quiz-mp-class-select');
      return classEl ? String(classEl.value || '').trim() : '';
    }

    function quizMpRefreshClassPicker() {
      const classEl = document.getElementById('quiz-mp-class-select');
      if (!classEl) return;
      const selected = quizMpGetSelectedClassGroup() || activeClassGroup || '';
      const groupKeys = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
        ? Object.keys(CLASS_GROUPS_META)
          .filter(key => !(CLASS_GROUPS_META[key] && CLASS_GROUPS_META[key].archived))
          .sort(function (a, b) {
            return _ltGroupName(a).localeCompare(_ltGroupName(b));
          })
        : [];

      classEl.innerHTML = '';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = t('groupSelectorNone');
      classEl.appendChild(noneOpt);

      groupKeys.forEach(function (key) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = _ltGroupName(key);
        classEl.appendChild(opt);
      });

      if (selected && groupKeys.includes(selected)) {
        classEl.value = selected;
      } else if (activeClassGroup && groupKeys.includes(activeClassGroup)) {
        classEl.value = activeClassGroup;
      } else {
        classEl.value = '';
      }
    }

    function quizMpSelectClass(classGroup) {
      const clean = String(classGroup || '').trim();
      if (typeof setActiveClassGroup === 'function') setActiveClassGroup(clean);
      quizMpSendClassPayload();
      quizMpUpdateJoinDisplay();
    }

    function quizMpJoinUrlForDisplay() {
      const inputEl = document.getElementById('quiz-mp-server');
      const isElectron = !!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron());
      let base = '';
      if (_quizMpCurrentMode === 'local') {
        base = isElectron ? String((inputEl && inputEl.value) || '').trim() : location.origin;
      } else {
        base = String((inputEl && inputEl.value) || '').trim();
      }
      if (!base) base = location.origin;
      if (!/^https?:\/\//i.test(base)) {
        if (/^wss?:\/\//i.test(base)) {
          base = base.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
        } else {
          base = 'http://' + base;
        }
      }
      const u = new URL(base);
      const url = new URL(u.origin.replace(/\/+$/, '') + '/quiz-player.html');
      const halfEl = document.getElementById('quiz-mp-half');
      const half = halfEl ? String(halfEl.value || '') : '';
      const classGroup = quizMpGetSelectedClassGroup();
      if (half) url.searchParams.set('half', half);
      if (classGroup) {
        const classLabel = typeof _ltGroupName === 'function' ? _ltGroupName(classGroup) : String(classGroup);
        url.searchParams.set('class', classLabel);
      }
      return url.toString();
    }

    function quizMpUpdateJoinDisplay() {
      const joinEl = document.getElementById('quiz-mp-join-url');
      if (joinEl) {
        try { joinEl.textContent = quizMpJoinUrlForDisplay(); }
        catch (_) { joinEl.textContent = 'http://localhost:8787/quiz-player.html'; }
      }
      quizMpUpdateQrCode();
    }

    function quizMpUpdateQrCode() {
      const qrEl = document.getElementById('quiz-mp-qr-img');
      if (!qrEl) return;
      let fallbackEl = document.getElementById('quiz-mp-qr-fallback');
      if (!quizIsMpHostMode()) {
        qrEl.style.display = 'none';
        qrEl.removeAttribute('src');
        if (fallbackEl) fallbackEl.style.display = 'none';
        return;
      }
      let joinUrl = '';
      try {
        joinUrl = quizMpJoinUrlForDisplay();
      } catch (_) {
        qrEl.style.display = 'none';
        qrEl.removeAttribute('src');
        if (fallbackEl) fallbackEl.style.display = 'none';
        return;
      }
      if (fallbackEl) fallbackEl.style.display = 'none';
      qrEl.onerror = function () {
        qrEl.style.display = 'none';
        if (!fallbackEl && qrEl.parentElement) {
          fallbackEl = document.createElement('div');
          fallbackEl.id = 'quiz-mp-qr-fallback';
          fallbackEl.style.cssText = 'padding:10px 14px;background:#f5f5f0;border:2px solid #333333;border-radius:8px;box-shadow:2px 2px 0 #555555;font-size:0.78rem;font-weight:700;color:#222;text-align:center;max-width:180px;word-break:break-all;';
          qrEl.parentElement.appendChild(fallbackEl);
        }
        if (fallbackEl) {
          fallbackEl.innerHTML = `<div style="text-transform:uppercase;font-size:0.68rem;color:#555;margin-bottom:4px;">Offline LAN Join URL</div><div>${joinUrl}</div>`;
          fallbackEl.style.display = 'inline-block';
        }
      };
      qrEl.style.display = 'inline-block';
      qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=128x128&margin=6&data=' + encodeURIComponent(joinUrl);
    }

    function quizMpSend(payload) {
      if (!quizMp.ws || !quizMp.connected) return false;
      try {
        quizMp.ws.send(JSON.stringify(payload));
        return true;
      } catch (_) {
        return false;
      }
    }

    function quizMpBuildHostClassPayload() {
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
      const cgData = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
      const classGroupsMeta = {};
      Object.keys(meta).forEach(function (key) {
        if (meta[key] && meta[key].archived) return;
        classGroupsMeta[key] = meta[key];
      });
      return {
        selectedClassGroup: quizMpGetSelectedClassGroup(),
        classGroupsData: {
          activeYear: cgData && cgData.activeYear ? String(cgData.activeYear) : '',
          activeSemester: cgData && Object.prototype.hasOwnProperty.call(cgData, 'activeSemester') ? cgData.activeSemester : null,
          activeSemesterStart: cgData && cgData.activeSemesterStart ? String(cgData.activeSemesterStart) : '',
          activeSemesterEnd: cgData && cgData.activeSemesterEnd ? String(cgData.activeSemesterEnd) : '',
          classGroupsMeta: classGroupsMeta
        }
      };
    }

    function quizMpSendClassPayload() {
      if (!quizMp.ws || !quizMp.connected) return false;
      return quizMpSend({ type: 'host_class_groups', payload: quizMpBuildHostClassPayload() });
    }

    function quizMpApplyReveal(correctIndex) {
      if (!quizCurrent) return;
      quizAnswered = true;
      const buttons = Array.from(document.querySelectorAll('#quiz-choice-grid .action-btn'));
      buttons.forEach(function (btn, idx) {
        btn.disabled = true;
        btn.style.outline = (idx === correctIndex) ? '4px solid #22c55e' : 'none';
        btn.style.outlineOffset = '0';
        btn.style.filter = (idx === correctIndex) ? 'brightness(1.05)' : 'brightness(0.8)';
      });
      const correctOpt = quizCurrent.displayAnswers[correctIndex];
      const correctText = correctOpt ? String(correctOpt.text || '') : '';
      quizShowMessage('📖 <strong>Answer:</strong> <em>' + correctText + '</em>', false);
    }

    function quizMpPushCurrentQuestion() {
      if (!quizIsMpHostMode() || !quizMp.connected || !quizCurrent) return;
      quizMp.answers = { answered: 0, total: quizMp.answers.total || 0 };
      quizMpRenderPresence();
      quizMpSend({
        type: 'host_next_question',
        payload: {
          question: quizCurrent.question,
          answers: quizCurrent.displayAnswers.map(function (opt) { return opt.text; }),
          correctIndex: quizCurrent.displayAnswers.findIndex(function (opt) {
            return opt.originalIndex === quizCurrent.correctIndex;
          })
        }
      });
      quizMpSetStatus('Question sent to players.', false);
    }

    function quizMpEndGame() {
      if (!quizIsMpHostMode()) {
        quizMpSetStatus('Switch to Multiplayer Host mode first.', true);
        return;
      }
      if (!quizMp.connected) {
        quizMpSetStatus('Connect to the multiplayer server first.', true);
        return;
      }
      quizMpSend({ type: 'host_end_game' });
      quizMpSetStatus('Ending game and requesting final results...', false);
    }

    function quizMpHandleMessage(msg) {
      if (!msg || typeof msg.type !== 'string') return;
      if (msg.type === 'welcome') {
        quizMpSetStatus('Connected as host.', false);
      } else if (msg.type === 'presence') {
        quizMp.players = Array.isArray(msg.players) ? msg.players : [];
        if (Array.isArray(msg.leaderboard)) quizMp.leaderboard = msg.leaderboard;
        quizMpRenderPresence();
        quizMpRenderLeaderboard();
      } else if (msg.type === 'answers') {
        const data = msg.payload || {};
        quizMp.answers = {
          answered: Number(data.answered || 0),
          total: Number(data.total || 0)
        };
        quizMpRenderPresence();
      } else if (msg.type === 'reveal') {
        const payload = msg.payload || {};
        if (typeof payload.correctIndex === 'number') {
          quizMpApplyReveal(payload.correctIndex);
        }
        if (Array.isArray(payload.leaderboard)) {
          quizMp.leaderboard = payload.leaderboard;
          quizMpRenderLeaderboard();
        }
        quizMpSetStatus('Answer revealed to all players.', false);
      } else if (msg.type === 'final_results') {
        const payload = msg.payload || {};
        if (Array.isArray(payload.leaderboard)) {
          quizMp.leaderboard = payload.leaderboard;
          quizMpRenderLeaderboard();
        }
        const winner = payload.winner && payload.winner.name
          ? (String(payload.winner.name) + ' (' + Number(payload.winner.score || 0) + ')')
          : 'No winner yet';
        const qEl = document.getElementById('quiz-question');
        const grid = document.getElementById('quiz-choice-grid');
        if (qEl) qEl.textContent = '🏁 Game finished. Final results are in.';
        if (grid) grid.innerHTML = '';
        quizCurrent = null;
        quizAnswered = true;
        quizShowMessage('🏆 <strong>Winner:</strong> ' + winner, false);
        quizMpSetStatus('Game ended. Final results published to players.', false);
        // Persist results locally (works in both local and external server mode)
        if (window.Desktop && typeof Desktop.quizSaveResult === 'function') {
          Desktop.quizSaveResult(payload).catch(function () { });
        }
      } else if (msg.type === 'error') {
        quizMpSetStatus(String(msg.message || 'Server error'), true);
      }
    }

    function quizMpDisconnect() {
      if (quizMp.ws) {
        try { quizMp.ws.close(); } catch (_) { }
      }
      quizMp.ws = null;
      quizMp.connected = false;
      quizMp.answers = { answered: 0, total: 0 };
      if (quizIsMpHostMode()) {
        quizMpSetStatus('Disconnected. Multiplayer host is offline.', true);
      }
      quizMpRenderPresence();
      quizMpRenderLeaderboard();
      quizRenderChoices();
      if (window.Desktop && typeof Desktop.quizServerStop === 'function') {
        Desktop.quizServerStop().catch(function () { });
      }
    }

    async function quizMpConnect() {
      if (!quizIsMpHostMode()) {
        quizMpSetStatus('Switch to Multiplayer Host mode first.', true);
        return;
      }
      const serverInput = document.getElementById('quiz-mp-server');
      const isElectron = !!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron());
      if (isElectron && _quizMpCurrentMode !== 'external') {
        quizMpSetStatus('Starting local multiplayer server...', false);
        const serverInfo = await quizMpEnsureServerForElectron();
        if (!serverInfo) {
          quizMpSetStatus('Could not start local server in Electron.', true);
          return;
        }
        if (serverInput && serverInfo.playerUrl) {
          const base = String(serverInfo.playerUrl).replace(/\/quiz-player\.html$/i, '');
          serverInput.value = base;
        }
        quizMpUpdateQrCode();
      } else if (_quizMpCurrentMode === 'external') {
        if (!serverInput || !String(serverInput.value || '').trim()) {
          quizMpSetStatus('Enter the external server URL first.', true);
          return;
        }
      }
      let wsUrl;
      try {
        wsUrl = quizMpBuildWsUrl();
      } catch (_) {
        quizMpSetStatus('Invalid server URL.', true);
        return;
      }
      if (_quizMpCurrentMode === 'external' && window.Desktop && typeof Desktop.remoteConfigRead === 'function' && typeof Desktop.remoteConfigSave === 'function') {
        try {
          const r = await Desktop.remoteConfigRead();
          const cfg = (r && r.ok && r.config) ? Object.assign({}, r.config) : {};
          const typedUrl = String(serverInput.value || '').trim();
          const savedUrl = String(cfg.quizServerUrl || cfg.serverUrl || '').trim();
          if (typedUrl && typedUrl !== savedUrl) {
            const msg = 'Do you want to save this new server URL for future connections?';
            const shouldSave = (typeof showConfirm === 'function') ? await showConfirm(msg) : confirm(msg);
            if (shouldSave) {
              cfg.quizMode = 'external';
              cfg.quizServerUrl = typedUrl;
              await Desktop.remoteConfigSave(cfg);
            }
          }
        } catch (_) {}
      }
      quizMpDisconnect();
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (_) {
        quizMpSetStatus('Cannot open websocket connection.', true);
        return;
      }
      quizMp.ws = ws;
      quizMpSetStatus('Connecting to ' + wsUrl + ' ...', false);

      ws.onopen = function () {
        quizMp.connected = true;
        quizMpSetStatus('Connected. Waiting for players.', false);
        if (!_quizMpHostSecret) {
          _quizMpHostSecret = 'qhs-' + Math.random().toString(36).slice(2, 10);
        }
        quizMpSend({ type: 'hello', role: 'host', name: 'Teacher', hostSecret: _quizMpHostSecret, payload: quizMpBuildHostClassPayload() });
        quizMpSendClassPayload();
        if (quizCurrent) quizMpPushCurrentQuestion();
        quizRenderChoices();
      };

      ws.onmessage = function (event) {
        let msg = null;
        try { msg = JSON.parse(event.data); } catch (_) { return; }
        quizMpHandleMessage(msg);
      };

      ws.onerror = function () {
        quizMpSetStatus('Websocket error. Check server status.', true);
      };

      ws.onclose = function () {
        quizMp.connected = false;
        quizMpSetStatus('Connection closed.', true);
        quizRenderChoices();
      };
    }

    function quizOpenHostWizard() {
      if (!window.CmtWizard) return;
      var tr = function (k, fb) {
        try { if (window.i18n && i18n.t) { var v = i18n.t(k); if (v && v !== k) return v; } } catch (_) {}
        return fb;
      };
      var srvSel = document.getElementById('quiz-mp-server');
      var sortSel = document.getElementById('quiz-sort-mode');
      CmtWizard.open({
        id: 'lt-host-wizard',
        title: tr('ltHostWizTitle', 'Host Live Quiz'),
        icon: 'play.svg',
        width: '680px',
        initialState: {
          server: (srvSel && srvSel.value) || 'local',
          sort: (sortSel && sortSel.value) || 'random'
        },
        steps: [
          {
            id: 'network',
            label: tr('ltHostWizStep1', '1. Connection'),
            render: function (container, st, ctx) {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('ltHostWizNetHeading', 'How will students join?')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('ltHostWizNetSub', 'Use Classroom Wi-Fi when everyone is in the same room.')) + '</p>';
              ctx.renderCards(container, [
                { id: 'local', icon: 'wifi.svg', badge: tr('wizRecommended', 'Recommended'), title: tr('ltHostOptLocal', 'Classroom Wi-Fi (Local)'), desc: tr('ltHostOptLocalDesc', 'Students scan a QR code on the same Wi-Fi network.') },
                { id: 'external', icon: 'globe.svg', badge: 'Web', title: tr('ltHostOptExt', 'External Web Server'), desc: tr('ltHostOptExtDesc', 'For remote classes or restricted school Wi-Fi.') }
              ], st.server, function (item) { st.server = item.id; });
            }
          },
          {
            id: 'order',
            label: tr('ltHostWizStep2', '2. Questions'),
            render: function (container, st, ctx) {
              container.innerHTML =
                '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('ltHostWizOrderHeading', 'Question order')) + '</h3>' +
                '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('ltHostWizOrderSub', 'Choose whether questions are shuffled or shown in order.')) + '</p>';
              ctx.renderCards(container, [
                { id: 'random', icon: 'dice.svg', badge: tr('wizRecommended', 'Recommended'), title: tr('ltHostOptRandom', 'Shuffled Order'), desc: tr('ltHostOptRandomDesc', 'Picks questions in a random order.') },
                { id: 'sequential', icon: 'arrow-right.svg', badge: '1, 2, 3', title: tr('ltHostOptSeq', 'In Order'), desc: tr('ltHostOptSeqDesc', 'Follows the list from top to bottom.') }
              ], st.sort, function (item) { st.sort = item.id; });
            }
          }
        ],
        finishLabel: tr('ltHostWizStartBtn', 'Start Lobby & Connect'),
        finishIcon: 'play.svg',
        onFinish: function (st) {
          if (srvSel) { srvSel.value = st.server; srvSel.dispatchEvent(new Event('change')); }
          if (sortSel) { sortSel.value = st.sort; sortSel.dispatchEvent(new Event('change')); }
          var connBtn = document.getElementById('quiz-mp-connect-btn');
          if (connBtn) connBtn.click();
        }
      });
    }

    (function () {
      var wb = document.getElementById('quiz-mp-wizard-btn');
      if (wb) wb.addEventListener('click', quizOpenHostWizard);
    })();

    function quizApplyModeUi() {
      quizApplyDevFeatureVisibility();
      const hostPanel = document.getElementById('quiz-mp-host-panel');
      const showHost = quizIsMpHostMode();
      if (hostPanel) hostPanel.classList.toggle('hidden', !showHost);
      quizMpUpdateJoinDisplay();
      if (!showHost) {
        quizMpDisconnect();
        quizMpSetStatus('Single player is active.', false);
      } else if (!quizMp.connected) {
        quizMpSetStatus('Multiplayer host mode selected. Connect to the local server.', false);
      }
      quizRenderChoices();
    }

    function quizGetSortMode() {
      const el = document.getElementById('quiz-sort-mode');
      return el ? String(el.value || 'random') : 'random';
    }

    function quizSortModeChanged() {
      quizUsed = new Set();
    }

    function quizGetFilterField() {
      const el = document.getElementById('quiz-filter-field');
      return el ? String(el.value || 'none') : 'none';
    }

    function quizGetFilterValue() {
      const el = document.getElementById('quiz-filter-value');
      return el ? String(el.value || '').trim() : '';
    }

    function quizRefreshFilterOptions(preserveValue) {
      const fieldEl = document.getElementById('quiz-filter-field');
      const valueEl = document.getElementById('quiz-filter-value');
      if (!fieldEl || !valueEl) return;

      const field = quizGetFilterField();
      const previous = preserveValue ? quizGetFilterValue().toLowerCase() : '';
      const bank = Array.isArray(window.quizBank) ? window.quizBank : [];

      valueEl.innerHTML = '';

      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'All';
      valueEl.appendChild(allOpt);

      if (field === 'none') {
        valueEl.disabled = true;
        valueEl.value = '';
        return;
      }

      const uniqueValues = new Set();
      bank.forEach(function (item) {
        const raw = String((item && item[field]) || '').trim();
        if (!raw) return;
        uniqueValues.add(raw);
      });

      const sortedValues = Array.from(uniqueValues).sort(function (a, b) {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });

      sortedValues.forEach(function (val) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        valueEl.appendChild(opt);
      });

      valueEl.disabled = sortedValues.length === 0;
      if (valueEl.disabled) {
        valueEl.value = '';
        return;
      }

      if (previous) {
        const match = sortedValues.find(function (v) {
          return String(v).toLowerCase() === previous;
        });
        valueEl.value = match || '';
      } else {
        valueEl.value = '';
      }
    }

    function quizFilterFieldChanged() {
      quizRefreshFilterOptions(true);
      quizFilterChanged();
    }

    function quizFilterChanged() {
      quizUsed = new Set();
    }

    function quizItemMatchesFilter(item) {
      const field = quizGetFilterField();
      const value = quizGetFilterValue();
      if (field === 'none' || !value) return true;
      const raw = String((item && item[field]) || '').trim();
      return raw.toLowerCase() === value.toLowerCase();
    }

    function quizCompareByMeta(a, b, field, descending) {
      const aValRaw = String((a && a[field]) || '').trim();
      const bValRaw = String((b && b[field]) || '').trim();
      const aMissing = !aValRaw;
      const bMissing = !bValRaw;

      if (aMissing && bMissing) {
        return String((a && a.question) || '').localeCompare(String((b && b.question) || ''), undefined, { sensitivity: 'base' });
      }
      if (aMissing) return 1;
      if (bMissing) return -1;

      const cmp = aValRaw.localeCompare(bValRaw, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return descending ? -cmp : cmp;
      return String((a && a.question) || '').localeCompare(String((b && b.question) || ''), undefined, { sensitivity: 'base' });
    }

    function quizUpdateStats() {
      const scoreEl = document.getElementById('quiz-score');
      const streakEl = document.getElementById('quiz-streak');
      const seenEl = document.getElementById('quiz-seen');
      if (scoreEl) scoreEl.textContent = String(quizScore);
      if (streakEl) streakEl.textContent = String(quizStreak);
      if (seenEl) seenEl.textContent = String(quizSeen);
    }

    function quizShowMessage(msg, isWrong) {
      const exp = document.getElementById('quiz-explanation');
      if (!exp) return;
      exp.className = 'gp-quiz-explanation visible' + (isWrong ? ' wrong-exp' : '');
      exp.innerHTML = msg;
    }

    function quizGetAnswerPalette(idx) {
      const palette = [
        { bg: '#2563eb', border: '#1d4ed8' },
        { bg: '#dc2626', border: '#b91c1c' },
        { bg: '#16a34a', border: '#15803d' },
        { bg: '#eab308', border: '#ca8a04' }
      ];
      return palette[idx % palette.length];
    }

    function quizApplyAnswerPalette(btn, idx) {
      const p = quizGetAnswerPalette(idx);
      if (!btn || !p) return;
      btn.style.background = p.bg;
      btn.style.borderColor = p.border;
      btn.style.color = (idx % 4 === 3) ? '#111111' : '#ffffff';
    }

    function quizRenderChoices() {
      const grid = document.getElementById('quiz-choice-grid');
      if (!grid || !quizCurrent) return;
      grid.innerHTML = '';
      const hostLocked = quizIsMpHostMode();
      quizCurrent.displayAnswers.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.style.width = '100%';
        btn.style.minHeight = '56px';
        btn.style.fontSize = '2rem';
        btn.style.fontWeight = '700';
        btn.style.whiteSpace = 'normal';
        btn.style.lineHeight = '1.25';
        btn.textContent = opt.text;
        quizApplyAnswerPalette(btn, idx);
        if (hostLocked) {
          btn.disabled = true;
          btn.style.opacity = '0.86';
          btn.style.cursor = 'not-allowed';
        } else {
          btn.onclick = function () { quizSelectAnswer(idx); };
        }
        grid.appendChild(btn);
      });
    }

    function quizLoadQuestion(item) {
      const displayAnswers = item.answers.map((text, originalIndex) => ({ text, originalIndex }));
      displayAnswers.sort(() => Math.random() - 0.5);
      quizCurrent = {
        question: item.question,
        answers: item.answers,
        correctIndex: item.correctIndex,
        theme: item.theme || '',
        keyword: item.keyword || '',
        displayAnswers
      };
      quizAnswered = false;
      quizSeen++;

      document.getElementById('quiz-question').textContent = item.question;
      const metaEl = document.getElementById('quiz-meta');
      if (metaEl) {
        const tags = [];
        if (quizCurrent.theme) tags.push('Theme: ' + quizCurrent.theme);
        if (quizCurrent.keyword) tags.push('Keyword: ' + quizCurrent.keyword);
        if (tags.length) {
          metaEl.textContent = tags.join(' | ');
          metaEl.style.display = 'block';
        } else {
          metaEl.textContent = '';
          metaEl.style.display = 'none';
        }
      }
      quizRenderChoices();
      const exp = document.getElementById('quiz-explanation');
      if (exp) {
        exp.className = 'gp-quiz-explanation';
        exp.innerHTML = '';
      }
      quizUpdateStats();
      if (quizIsMpHostMode()) {
        quizShowMessage('🌐 Multiplayer host mode: students answer on their own devices.', false);
        quizMpPushCurrentQuestion();
      }
    }

    function quizNextQuestion() {
      const bank = Array.isArray(window.quizBank) ? window.quizBank : [];
      const questionEl = document.getElementById('quiz-question');
      const grid = document.getElementById('quiz-choice-grid');
      const metaEl = document.getElementById('quiz-meta');
      if (!questionEl || !grid) return;

      if (!bank.length) {
        quizCurrent = null;
        questionEl.textContent = 'No quiz questions found. Add user/custom-data/quizzes/quiz.js.';
        grid.innerHTML = '';
        if (metaEl) {
          metaEl.textContent = '';
          metaEl.style.display = 'none';
        }
        quizShowMessage('Expected keys: question, answer 1, answer 2, answer 3, answer 4, correctAnswer. Optional: theme, keyword.', true);
        return;
      }

      const filteredBank = bank.filter(function (item) {
        return quizItemMatchesFilter(item);
      });

      if (!filteredBank.length) {
        quizCurrent = null;
        questionEl.textContent = 'No quiz questions match the current filter.';
        grid.innerHTML = '';
        if (metaEl) {
          metaEl.textContent = '';
          metaEl.style.display = 'none';
        }
        quizShowMessage('Change or clear the filter to continue.', true);
        return;
      }

      let candidates = bank
        .map((item, idx) => ({ item, idx }))
        .filter(entry => !quizUsed.has(entry.idx) && quizItemMatchesFilter(entry.item));

      if (!candidates.length) {
        quizUsed = new Set();
        candidates = bank
          .map((item, idx) => ({ item, idx }))
          .filter(entry => quizItemMatchesFilter(entry.item));
      }

      const sortMode = quizGetSortMode();
      if (sortMode === 'theme-az') {
        candidates.sort((a, b) => quizCompareByMeta(a.item, b.item, 'theme', false));
      } else if (sortMode === 'theme-za') {
        candidates.sort((a, b) => quizCompareByMeta(a.item, b.item, 'theme', true));
      } else if (sortMode === 'keyword-az') {
        candidates.sort((a, b) => quizCompareByMeta(a.item, b.item, 'keyword', false));
      } else if (sortMode === 'keyword-za') {
        candidates.sort((a, b) => quizCompareByMeta(a.item, b.item, 'keyword', true));
      }

      const pickedEntry = sortMode === 'random'
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : candidates[0];

      if (!pickedEntry || !pickedEntry.item) return;
      quizUsed.add(pickedEntry.idx);
      quizLoadQuestion(pickedEntry.item);
    }

    function quizSelectAnswer(displayIdx) {
      if (quizIsMpHostMode()) return;
      if (!quizCurrent || quizAnswered) return;
      quizAnswered = true;

      const selected = quizCurrent.displayAnswers[displayIdx];
      const isCorrect = !!selected && selected.originalIndex === quizCurrent.correctIndex;
      const buttons = Array.from(document.querySelectorAll('#quiz-choice-grid .action-btn'));
      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        const answer = quizCurrent.displayAnswers[idx];
        if (!answer) return;
        const isCorrectOption = answer.originalIndex === quizCurrent.correctIndex;
        const isWrongSelection = idx === displayIdx && !isCorrectOption;
        btn.style.outline = isCorrectOption ? '4px solid #22c55e' : (isWrongSelection ? '4px solid #f87171' : 'none');
        btn.style.outlineOffset = '0';
        btn.style.filter = isCorrectOption ? 'brightness(1.05)' : (isWrongSelection ? 'brightness(0.92)' : 'brightness(0.76)');
      });

      const correctText = quizCurrent.answers[quizCurrent.correctIndex] || '';
      if (isCorrect) {
        quizScore += POINTS_WIN;
        quizStreak++;
        awardPoints(POINTS_WIN);
        quizShowMessage('✅ <strong>Correct!</strong> <em>' + correctText + '</em>', false);
        quizUpdateStats();
        showSuccess(function () { nextTeamTurn(); quizNextQuestion(); });
      } else {
        quizStreak = 0;
        awardPoints(POINTS_WRONG_PENALTY);
        quizShowMessage('❌ <strong>Wrong.</strong><br>✅ <strong>Correct answer:</strong> <em>' + correctText + '</em>', true);
        quizUpdateStats();
        showFailure('Correct answer: ' + correctText, function () { nextTeamTurn(); quizNextQuestion(); });
      }
    }

    function quizRevealAnswer() {
      if (!quizCurrent || quizAnswered) return;
      if (quizIsMpHostMode() && quizMp.connected) {
        quizMpSend({ type: 'host_reveal' });
        return;
      }
      quizAnswered = true;
      quizStreak = 0;
      awardPoints(POINTS_LOSE);
      const correctText = quizCurrent.answers[quizCurrent.correctIndex] || '';
      const buttons = Array.from(document.querySelectorAll('#quiz-choice-grid .action-btn'));
      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        const answer = quizCurrent.displayAnswers[idx];
        const isCorrectOption = answer && answer.originalIndex === quizCurrent.correctIndex;
        btn.style.outline = isCorrectOption ? '4px solid #22c55e' : 'none';
        btn.style.outlineOffset = '0';
        btn.style.filter = isCorrectOption ? 'brightness(1.05)' : 'brightness(0.76)';
      });
      quizShowMessage('📖 <strong>Answer:</strong> <em>' + correctText + '</em>', false);
      quizUpdateStats();
      showFailure('Answer: ' + correctText, function () { nextTeamTurn(); quizNextQuestion(); });
    }

    let _quizMpCurrentMode = 'local';

    function _quizMpSetMode(mode, prefillUrl) {
      _quizMpCurrentMode = (mode === 'external') ? 'external' : 'local';
      const isLocal = _quizMpCurrentMode === 'local';
      const localBtn = document.getElementById('quiz-mp-mode-local-btn');
      const extBtn = document.getElementById('quiz-mp-mode-external-btn');
      const serverInput = document.getElementById('quiz-mp-server');
      if (localBtn) { localBtn.style.background = isLocal ? '#2563eb' : '#f1f5f9'; localBtn.style.color = isLocal ? '#fff' : '#334155'; localBtn.style.borderColor = isLocal ? '#2563eb' : '#d1d5db'; }
      if (extBtn) { extBtn.style.background = !isLocal ? '#2563eb' : '#f1f5f9'; extBtn.style.color = !isLocal ? '#fff' : '#334155'; extBtn.style.borderColor = !isLocal ? '#2563eb' : '#d1d5db'; }
      if (serverInput) {
        serverInput.style.display = isLocal ? 'none' : '';
        if (!isLocal && prefillUrl && !String(serverInput.value || '').trim()) serverInput.value = prefillUrl;
      }
      if (typeof quizMpUpdateQrCode === 'function') quizMpUpdateQrCode();
      // Save to remote-config when user clicks (not during init)
      if (prefillUrl === undefined && window.Desktop && typeof Desktop.remoteConfigRead === 'function' && typeof Desktop.remoteConfigSave === 'function') {
        Desktop.remoteConfigRead().then(function (r) {
          const existing = (r && r.ok && r.config && typeof r.config === 'object') ? r.config : {};
          const nextCfg = Object.assign({}, existing, { quizMode: _quizMpCurrentMode });
          if (!isLocal && serverInput) {
            const val = String(serverInput.value || '').trim();
            const isLocalAddress = !val || /127\.0\.0\.1|localhost/i.test(val);
            if (isLocalAddress && (existing.quizServerUrl || existing.serverUrl)) {
              serverInput.value = existing.quizServerUrl || existing.serverUrl;
              if (typeof quizMpUpdateQrCode === 'function') quizMpUpdateQrCode();
            }
            nextCfg.quizServerUrl = String(serverInput.value || '').trim();
          } else {
            if (existing.quizServerUrl) {
              nextCfg.quizServerUrl = existing.quizServerUrl;
            }
          }
          Desktop.remoteConfigSave(nextCfg).catch(function () { });
        }).catch(function () {
          Desktop.remoteConfigSave({ quizMode: _quizMpCurrentMode }).catch(function () { });
        });
      }
    }

    async function quizInit() {
      await ensureCustomQuizLoaded();
      quizApplyDevFeatureVisibility();
      quizRefreshFilterOptions(false);
      const serverInput = document.getElementById('quiz-mp-server');
      const classSelect = document.getElementById('quiz-mp-class-select');
      if (serverInput) {
        serverInput.addEventListener('input', quizMpUpdateQrCode);
        serverInput.addEventListener('change', quizMpUpdateQrCode);
      }
      if (classSelect) {
        classSelect.addEventListener('change', function () {
          quizMpSelectClass(this.value);
        });
      }
      quizMpRefreshClassPicker();
      quizApplyModeUi();
      quizUpdateStats();
      if (!quizCurrent) quizNextQuestion();
      // Apply local/external toggle from saved config
      if (window.Desktop && typeof Desktop.remoteConfigRead === 'function') {
        Desktop.remoteConfigRead().then(function (r) {
          const cfg = (r && r.ok && r.config) ? r.config : {};
          const quizMode = cfg.quizMode === 'external' ? 'external' : 'local';
          const quizServerUrl = cfg.quizServerUrl || cfg.serverUrl || '';
          _quizMpSetMode(quizMode, quizServerUrl);
        }).catch(function () { });
      }
    }

    // =============================================
    // PRESENTATION MODE (REUSABLE, NEW WINDOW)
    // =============================================
    const __ltPresentationParams = new URLSearchParams(location.search);
    const WW_PRESENTATION_QUERY = __ltPresentationParams.get('wwPresentation') === '1';
    const WW_PRESENTATION_CHANNEL_QUERY = String(__ltPresentationParams.get('wwChannel') || '').trim();
    const LT_PRESENTATION_QUERY = __ltPresentationParams.get('ltPresentation') === '1';
    const LT_PRESENTATION_CHANNEL_QUERY = String(__ltPresentationParams.get('ltChannel') || '').trim();
    const LT_PRESENTATION_SECTION_QUERY = String(__ltPresentationParams.get('ltSection') || '').trim();

    let presentationState = {
      active: false,
      mode: '',
      sectionId: '',
      channelName: '',
      channel: null,
      popupRef: null,
      peerOnline: false,
      frozen: false,
      observer: null,
      pendingBroadcastTimer: 0
    };

    function ltIsPresenterPreviewActive(sectionId) {
      return presentationState.active
        && presentationState.mode === 'generic'
        && presentationState.sectionId === sectionId;
    }

    function ltRefreshPresenterPreviews() {
      hangmanRenderPresenterPreview();
      scrambleRenderPresenterPreview();
      clueRenderPresenterPreview();
      quoteRenderPresenterPreview();
      gapRenderPresenterPreview();
      dictRenderPresenterPreview();
      errorRewriteRenderPresenterPreview();
    }

    function wwIsProjectionWindow() {
      return WW_PRESENTATION_QUERY || LT_PRESENTATION_QUERY;
    }

    function presentationSyncButtons() {
      const wwBtn = document.getElementById('ww-present-btn');
      if (wwBtn) wwBtn.innerHTML = presentationState.active && presentationState.sectionId === 'werewolf-section'
        ? '<img src="../assets/icons/stop.svg" class="btn-icon" alt="" /> Close Presentation'
        : '<img src="../assets/icons/monitor.svg" class="btn-icon" alt="" /> Presentation';

      document.querySelectorAll('.lt-present-btn[data-section-id]').forEach(btn => {
        const sid = String(btn.getAttribute('data-section-id') || '');
        btn.innerHTML = (presentationState.active && presentationState.sectionId === sid)
          ? '<img src="../assets/icons/stop.svg" class="btn-icon" alt="" /> Close Presentation'
          : '<img src="../assets/icons/monitor.svg" class="btn-icon" alt="" /> Presentation';
      });
    }

    function presentationSetFrozen(on) {
      presentationState.frozen = !!on;
      ltSetProjectionMenuFrozen(presentationState.frozen);
      if (presentationState.channel) {
        try {
          presentationState.channel.postMessage({ type: 'presentation-frozen-state', on: presentationState.frozen });
        } catch (e) { }
      }
      if (!presentationState.frozen) {
        if (presentationState.mode === 'werewolf') wwBroadcastPresentation();
        else ltBroadcastPresentation();
      }
    }

    async function presentationToggleFreeze() {
      presentationSetFrozen(!presentationState.frozen);
      return true;
    }

    function presentationResizeWindow() {
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.learningToolsPresentationCommand === 'function') {
        return Desktop.learningToolsPresentationCommand('resize-window');
      }
      if (presentationState.popupRef && !presentationState.popupRef.closed) {
        const width = Math.max(420, Math.round(window.outerWidth || 1360));
        const height = Math.max(300, Math.round(window.outerHeight || 820));
        presentationState.popupRef.resizeTo(width, height);
      }
      return Promise.resolve(true);
    }

    function presentationDockWindow(edge) {
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.learningToolsPresentationCommand === 'function') {
        return Desktop.learningToolsPresentationCommand(edge === 'left' ? 'dock-left' : 'dock-right');
      }
      if (presentationState.popupRef && !presentationState.popupRef.closed) {
        const availWidth = (window.screen && window.screen.availWidth) ? window.screen.availWidth : 1360;
        const width = Math.max(260, Math.round(availWidth * 0.2));
        const height = Math.max(300, Math.round(window.outerHeight || 820));
        const x = edge === 'left' ? 0 : Math.max(0, availWidth - width);
        presentationState.popupRef.resizeTo(width, height);
        presentationState.popupRef.moveTo(x, 0);
      }
      return Promise.resolve(true);
    }

    function presentationCloseWindow() {
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.learningToolsPresentationCommand === 'function') {
        return Desktop.learningToolsPresentationCommand('close');
      }
      if (presentationState.popupRef && !presentationState.popupRef.closed) {
        presentationState.popupRef.close();
      }
      return Promise.resolve(true);
    }

    let ltProjectionControlMenuEl = null;

    function ltSetProjectionMenuFrozen(on) {
      if (!ltProjectionControlMenuEl) return;
      const freezeBtn = ltProjectionControlMenuEl.querySelector('[data-pres-action="freeze"]');
      if (freezeBtn) {
        const label = on ? (t('pres_unfreeze_title') || t('presUnfreeze')) : (t('pres_freeze_title') || t('presFreeze'));
        freezeBtn.title = label;
        freezeBtn.setAttribute('data-tooltip', label);
        freezeBtn.setAttribute('aria-label', label);
        freezeBtn.classList.toggle('is-frozen', !!on);
      }
    }

    function ltInstallProjectionControlMenu(channel, rootId, opts) {
      const options = opts || {};
      const root = rootId ? document.getElementById(rootId) : document.body;
      if (!root || ltProjectionControlMenuEl) return;
      const menu = document.createElement('div');
      menu.id = 'lt-pres-menu';
      menu.className = 'pres-control-menu tooltip-bottom';
      menu.style.cssText = 'position:fixed;top:8px;right:8px;z-index:100000;pointer-events:auto;';
      menu.innerHTML = ''
        + '<div class="pres-drag-handle" title="Drag to move">⋮⋮</div>'
        + `<button type="button" class="pres-btn" data-pres-action="close" data-tooltip="${t('pres_stop_title') || t('presStop')}" title="${t('pres_stop_title') || t('presStop')}" aria-label="${t('pres_stop_title') || t('presStop')}"><img src="../assets/icons/stop.svg" alt="" /></button>`
        + `<button type="button" class="pres-btn" data-pres-action="freeze" data-tooltip="${t('pres_freeze_title') || t('presFreeze')}" title="${t('pres_freeze_title') || t('presFreeze')}" aria-label="${t('pres_freeze_title') || t('presFreeze')}"><img src="../assets/icons/pause.svg" alt="" /></button>`
        + `<button type="button" class="pres-btn" data-pres-action="resize" data-tooltip="${t('pres_resize_title') || t('presResize')}" title="${t('pres_resize_title') || t('presResize')}" aria-label="${t('pres_resize_title') || t('presResize')}"><img src="../assets/icons/compact.svg" alt="" /></button>`
        + `<button type="button" class="pres-btn" data-pres-action="left" data-tooltip="${t('pres_left_title') || t('presLeft')}" title="${t('pres_left_title') || t('presLeft')}" aria-label="${t('pres_left_title') || t('presLeft')}"><img src="../assets/icons/triangle-left.svg" alt="" /></button>`
        + `<button type="button" class="pres-btn" data-pres-action="right" data-tooltip="${t('pres_right_title') || t('presRight')}" title="${t('pres_right_title') || t('presRight')}" aria-label="${t('pres_right_title') || t('presRight')}"><img src="../assets/icons/triangle-right.svg" alt="" /></button>`;
      menu.addEventListener('click', function (event) {
        const btn = event.target && event.target.closest ? event.target.closest('[data-pres-action]') : null;
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        const cmd = btn.getAttribute('data-pres-action');
        if (typeof options.onAction === 'function') {
          options.onAction(cmd);
          return;
        }
        if (!channel) return;
        try { channel.postMessage({ type: 'presentation-control', command: cmd }); } catch (e) { }
      });
      root.appendChild(menu);
      ltProjectionControlMenuEl = menu;
      ltSetProjectionMenuFrozen(presentationState.frozen);
    }

    function ltRemoveProjectionControlMenu() {
      if (!ltProjectionControlMenuEl) return;
      try {
        if (ltProjectionControlMenuEl.parentNode) {
          ltProjectionControlMenuEl.parentNode.removeChild(ltProjectionControlMenuEl);
        }
      } catch (e) { }
      ltProjectionControlMenuEl = null;
    }

    function ltGetSectionTitle(sectionId) {
      const section = document.getElementById(sectionId);
      if (!section) return 'Learning Tools';
      const heading = section.querySelector('h2, h3');
      return (heading && heading.textContent ? heading.textContent.trim() : '') || 'Learning Tools';
    }

    function ltBuildPresentationHtml(sectionId) {
      const section = document.getElementById(sectionId);
      if (!section) return '';

      const clone = section.cloneNode(true);
      clone.classList.remove('hidden');
      clone.removeAttribute('aria-hidden');

      const stripSelectors = [
        '.lt-present-btn',
        '.btn-back',
        '.timer-btn',
        '.filter-mount',
        '#error-filter-mount',
        '#os-filter-mount',
        '#pregame-overlay',
        '#endgame-overlay'
      ];
      clone.querySelectorAll(stripSelectors.join(',')).forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      if (sectionId === 'gap-game-section') {
        const grammarFilterBar = clone.querySelector('#gap-grammar-filter-bar');
        if (grammarFilterBar && grammarFilterBar.parentNode) grammarFilterBar.parentNode.removeChild(grammarFilterBar);
        clone.querySelectorAll('.gap-presenter-answer').forEach(el => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      }

      if (sectionId === 'dictation-section') {
        clone.classList.remove('dict-presenter-preview');
        clone.querySelectorAll('.dict-word-hidden').forEach(el => {
          el.classList.remove('dict-presenter-answer');
        });
        clone.querySelectorAll('.dict-word-hidden .dict-ghost').forEach(el => {
          el.textContent = '';
        });
        clone.querySelectorAll('.dict-input').forEach(el => {
          el.value = '';
          el.removeAttribute('value');
          el.disabled = false;
          el.classList.remove('dict-correct', 'dict-wrong', 'dict-revealed');
        });
      }

      clone.querySelectorAll('[onclick*="navTo(\'main-menu\')"]').forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      clone.querySelectorAll('.team-manual-btn, .team-switch-hint').forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      // Student-safe projection: do not expose teacher clues/answers on presenter screen.
      clone.querySelectorAll('[onclick*="reveal"], [onclick*="Reveal"], [onclick*="clue"], [onclick*="Clue"], [onclick*="hint"], [onclick*="Hint"], [onclick*="unlockClue"], [onclick*="wsRevealAll"]').forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      const sensitiveIds = [
        'hangman-feedback',
        'scramble-definition',
        'scramble-feedback',
        'clue-1',
        'clue-2',
        'clue-3',
        'clue-4',
        'clue-feedback',
        'sentence-hint-display',
        'sentence-feedback',
        'quote-theme-box',
        'quote-keywords-box',
        'quote-explanation-box',
        'gap-feedback',
        'grammar-tag',
        'error-explanation',
        'error-rewrite-explanation',
        'ipa-pos-hint',
        'ipa-result',
        'syn-result'
      ];

      sensitiveIds.forEach(id => {
        const el = clone.querySelector('#' + id);
        if (!el) return;

        if (sectionId === 'hangman-game-section' && id === 'hangman-feedback') {
          if (hangmanProjectionRevealAll) {
            el.classList.remove('hidden');
            el.classList.remove('lt-presenter-grey');
            el.style.removeProperty('display');
          } else {
            el.classList.remove('status-correct');
            el.classList.remove('status-wrong');
            el.classList.add('hidden');
            el.style.setProperty('display', 'none', 'important');
          }
          return;
        }

        if (sectionId === 'scramble-game-section' && id === 'scramble-definition') {
          if (scrambleProjectionRevealCount > 0) {
            if (scrambleProjectionRevealCount >= 2 && sWordObj && sWordObj.ipa) {
              const ipaLine = `<br><span style="font-family:'Courier New',monospace;font-size:0.92rem;color:#888;">🔉 Pronunciation: / ${sWordObj.ipa} /</span>`;
              el.innerHTML = `${t('defLabel')} ${_firstVal(sWordObj.definition)}${ipaLine}`;
            } else if (sWordObj) {
              el.innerHTML = `${t('defLabel')} ${_firstVal(sWordObj.definition)}`;
            }
            el.classList.remove('hidden');
            el.classList.remove('lt-presenter-grey');
            el.style.display = '';
          } else {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
          return;
        }

        if (sectionId === 'clue-game-section' && (id === 'clue-1' || id === 'clue-2' || id === 'clue-3' || id === 'clue-4')) {
          const clueNum = Number(String(id).split('-')[1] || 0);
          if (clueNum > 0 && clueNum <= clueProjectionRevealCount) {
            el.classList.remove('hidden');
            el.style.display = '';
          } else {
            if (id === 'clue-1') el.textContent = 'Clue 1: ?????';
            else if (id === 'clue-2') el.textContent = 'Clue 2: ?????';
            else if (id === 'clue-3') el.textContent = 'Clue 3: ?????';
            else if (id === 'clue-4') el.textContent = 'Clue 4: ?????';
            el.className = 'clue-box';
            el.classList.remove('hidden');
            el.style.display = '';
          }
          return;
        }

        if (sectionId === 'quote-game-section' && (id === 'quote-theme-box' || id === 'quote-keywords-box')) {
          const canShow = (id === 'quote-theme-box' && quoteProjectionRevealCount >= 1)
            || (id === 'quote-keywords-box' && quoteProjectionRevealCount >= 2);
          if (canShow) {
            el.classList.remove('hidden');
            el.classList.remove('lt-presenter-grey');
            el.style.display = '';
          } else {
            if (id === 'quote-theme-box') el.textContent = 'Theme: ????';
            else el.textContent = 'Keywords: ????';
            el.classList.remove('clue-active');
            el.classList.remove('lt-presenter-grey');
            el.classList.remove('hidden');
            el.style.display = '';
          }
          return;
        }

        if (sectionId === 'gap-game-section' && id === 'grammar-tag') {
          el.querySelectorAll('.gap-presenter-answer').forEach(node => {
            if (node && node.parentNode) node.parentNode.removeChild(node);
          });
          if (gapProjectionRevealAll) {
            el.classList.remove('hidden');
            el.classList.remove('lt-presenter-grey');
            el.style.display = '';
          } else {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
          return;
        }

        if (sectionId === 'error-game-section' && id === 'error-rewrite-explanation') {
          if (errorProjectionRevealAll) {
            el.classList.remove('hidden');
            el.classList.remove('lt-presenter-grey');
            el.style.display = '';
          } else {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
          return;
        }

        if (id === 'clue-1') el.textContent = 'Clue 1: ?????';
        else if (id === 'clue-2') el.textContent = 'Clue 2: ?????';
        else if (id === 'clue-3') el.textContent = 'Clue 3: ?????';
        else if (id === 'clue-4') el.textContent = 'Clue 4: ?????';
        else if (id === 'quote-theme-box') el.textContent = 'Theme: ????';
        else if (id === 'quote-keywords-box') el.textContent = 'Keywords: ????';
        else el.textContent = '';

        el.classList.add('hidden');
        el.style.display = 'none';
      });

      return clone.outerHTML;
    }

    function ltBuildGlobalPresentationHtml() {
      const ids = [
        'success-overlay',
        'failure-overlay',
        'word-detail-overlay',
        'timer-bar-container',
        'timer-display',
        'countdown-overlay'
      ];

      const chunks = [];
      ids.forEach(id => {
        const src = document.getElementById(id);
        if (!src) return;
        const clone = src.cloneNode(true);

        if (id === 'success-overlay' || id === 'failure-overlay') {
          clone.querySelectorAll('#success-explain-btn, #failure-explain-btn').forEach(btn => {
            if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
          });

          clone.querySelectorAll('.action-btn').forEach(btn => {
            if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
          });
        }

        if (id === 'word-detail-overlay') {
          clone.querySelectorAll('button, .action-btn, #det-zoom-controls, #det-edit-btn, #det-save-row, #det-nav-controls').forEach(el => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
          });
        }

        chunks.push(clone.outerHTML);
      });

      return chunks.join('');
    }

    function ltBuildPresentationPayload(sectionId) {
      const section = document.getElementById(sectionId);
      if (!section) return null;
      return {
        sectionId,
        title: ltGetSectionTitle(sectionId),
        html: ltBuildPresentationHtml(sectionId) + ltBuildGlobalPresentationHtml(),
        updatedAt: Date.now()
      };
    }

    function ltRenderProjectionState(state) {
      let root = document.getElementById('lt-projector-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'lt-projector-root';
        root.innerHTML = '<div class="lt-proj-content" id="lt-proj-content"></div>';
        document.body.appendChild(root);
      }

      const safeState = state || {};
      const contentEl = document.getElementById('lt-proj-content');

      if (contentEl) {
        contentEl.innerHTML = String(safeState.html || '<p style="opacity:.8;">Waiting for content...</p>');
      }
    }

    function ltBootProjectionReceiverIfNeeded() {
      if (!LT_PRESENTATION_QUERY) return;
      document.body.classList.add('lt-project-mode');

      const channelName = LT_PRESENTATION_CHANNEL_QUERY || 'lt-generic-projection';
      const channel = new BroadcastChannel(channelName);
      const clientId = 'lt-mirror-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

      function sendPresence(online) {
        try { channel.postMessage({ type: 'lt-presence', online: !!online, id: clientId }); } catch (e) { }
      }

      ltRenderProjectionState({
        title: LT_PRESENTATION_SECTION_QUERY ? ltGetSectionTitle(LT_PRESENTATION_SECTION_QUERY) : 'Learning Tools',
        updatedAt: Date.now(),
        html: '<p style="opacity:.8;">Waiting for presenter...</p>'
      });

      sendPresence(true);
      try { channel.postMessage({ type: 'lt-request-state', sectionId: LT_PRESENTATION_SECTION_QUERY }); } catch (e) { }

      channel.onmessage = function (event) {
        const d = event && event.data;
        if (!d) return;
        if (d.type === 'lt-state') {
          ltRenderProjectionState(d.state || {});
          return;
        }
        if (d.type === 'lt-timer-tick') {
          const disp = document.querySelector('#lt-proj-content #timer-display');
          if (disp && typeof d.displayHtml === 'string') {
            disp.innerHTML = d.displayHtml;
            disp.className = d.displayClass || 'timer-display';
          }
          const bar = document.querySelector('#lt-proj-content #timer-bar');
          if (bar && typeof d.barWidth === 'string') {
            bar.style.width = d.barWidth;
            if (d.barBg) bar.style.background = d.barBg;
          }
          return;
        }
        if (d.type === 'presentation-frozen-state') {
          ltSetProjectionMenuFrozen(!!d.on);
          return;
        }
        if (d.type === 'lt-close') {
          window.close();
        }
      };

      window.addEventListener('beforeunload', function () {
        sendPresence(false);
        try { channel.close(); } catch (e) { }
      });
    }

    function ltBroadcastPresentation() {
      if (!presentationState.active || presentationState.mode !== 'generic' || !presentationState.channel || presentationState.frozen) return;
      const payload = ltBuildPresentationPayload(presentationState.sectionId);
      if (!payload) return;
      try {
        presentationState.channel.postMessage({ type: 'lt-state', state: payload });
      } catch (e) { }
    }

    function ltBroadcastTimerTick() {
      if (!presentationState.active || presentationState.mode !== 'generic' || !presentationState.channel || presentationState.frozen) return;
      const disp = document.getElementById('timer-display');
      const bar = document.getElementById('timer-bar');
      try {
        presentationState.channel.postMessage({
          type: 'lt-timer-tick',
          displayHtml: disp ? disp.innerHTML : '',
          displayClass: disp ? disp.className : '',
          barWidth: bar ? bar.style.width : '',
          barBg: bar ? bar.style.background : ''
        });
      } catch (e) { }
    }

    function ltSchedulePresentationBroadcast() {
      if (!presentationState.active || presentationState.mode !== 'generic' || presentationState.frozen) return;
      if (presentationState.pendingBroadcastTimer) return;
      presentationState.pendingBroadcastTimer = requestAnimationFrame(function () {
        presentationState.pendingBroadcastTimer = 0;
        ltBroadcastPresentation();
      });
    }

    function ltStopPresentationObserver() {
      if (presentationState.observer) {
        try { presentationState.observer.disconnect(); } catch (e) { }
      }
      if (presentationState.timerObserver) {
        try { presentationState.timerObserver.disconnect(); } catch (e) { }
      }
      presentationState.observer = null;
      presentationState.timerObserver = null;
      if (presentationState.pendingBroadcastTimer) {
        cancelAnimationFrame(presentationState.pendingBroadcastTimer);
      }
      presentationState.pendingBroadcastTimer = 0;
    }

    function ltStartPresentationObserver(sectionId) {
      ltStopPresentationObserver();
      const roots = [];

      const section = document.getElementById(sectionId);
      if (section) roots.push(section);

      ['success-overlay', 'failure-overlay', 'countdown-overlay', 'word-detail-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) roots.push(el);
      });

      if (roots.length) {
        const observer = new MutationObserver(function () {
          ltSchedulePresentationBroadcast();
        });
        roots.forEach(root => {
          observer.observe(root, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true
          });
        });
        presentationState.observer = observer;
      }

      // Observe timer elements separately via lightweight in-place micro-messages (no full DOM clone)
      const timerRoots = ['timer-bar-container', 'timer-display'].map(id => document.getElementById(id)).filter(Boolean);
      if (timerRoots.length) {
        let timerRaf = 0;
        const timerObs = new MutationObserver(function () {
          if (timerRaf) return;
          timerRaf = requestAnimationFrame(function () {
            timerRaf = 0;
            ltBroadcastTimerTick();
          });
        });
        timerRoots.forEach(tr => {
          timerObs.observe(tr, { subtree: true, childList: true, attributes: true, characterData: true });
        });
        presentationState.timerObserver = timerObs;
      }
    }

    function installPresentationButtons() {
      document.querySelectorAll('.game[id]').forEach(section => {
        const sectionId = String(section.id || '');
        const isGameSection = sectionId.endsWith('-game-section')
          || sectionId === 'story-section'
          || sectionId === 'dictation-section'
          || sectionId === 'order-sentences-section'
          || sectionId === 'quiz-section';
        if (!sectionId || !isGameSection || sectionId === 'werewolf-section') return;
        if (section.querySelector('.lt-present-btn[data-section-id]')) return;

        const host = section.querySelector('.center-container') || section;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'action-btn btn-purple lt-present-btn';
        btn.setAttribute('data-section-id', sectionId);
        btn.innerHTML = '<img src="../assets/icons/monitor.svg" class="btn-icon" alt="" /> Presentation';
        btn.addEventListener('click', function () {
          presentationToggle(sectionId);
        });

        host.appendChild(btn);
      });
      presentationSyncButtons();
    }

    function wwRenderProjectionState(state) {
      let root = document.getElementById('ww-projector-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'ww-projector-root';
        root.innerHTML = ''
          + '<div class="ww-proj-topline">'
          + '  <span id="ww-proj-class">Class</span>'
          + '  <span id="ww-proj-turn">Turn</span>'
          + '</div>'
          + '<div>'
          + '  <div class="ww-proj-title" id="ww-proj-title">Werewolf</div>'
          + '  <div class="ww-proj-message" id="ww-proj-message">Waiting for moderator...</div>'
          + '</div>'
          + '<div class="ww-proj-columns">'
          + '  <div class="ww-proj-panel">'
          + '    <h4>Alive</h4>'
          + '    <div class="ww-proj-list" id="ww-proj-alive"></div>'
          + '  </div>'
          + '  <div class="ww-proj-panel">'
          + '    <h4>Eliminated</h4>'
          + '    <div class="ww-proj-list" id="ww-proj-dead"></div>'
          + '  </div>'
          + '</div>'
          + '<div class="ww-proj-progress" id="ww-proj-progress"></div>';
        document.body.appendChild(root);
      }

      const safeState = state || {};
      const alive = Array.isArray(safeState.alive) ? safeState.alive : [];
      const dead = Array.isArray(safeState.dead) ? safeState.dead : [];
      const steps = Array.isArray(safeState.steps) ? safeState.steps : [];

      const classEl = document.getElementById('ww-proj-class');
      const turnEl = document.getElementById('ww-proj-turn');
      const titleEl = document.getElementById('ww-proj-title');
      const msgEl = document.getElementById('ww-proj-message');
      const aliveEl = document.getElementById('ww-proj-alive');
      const deadEl = document.getElementById('ww-proj-dead');
      const progressEl = document.getElementById('ww-proj-progress');

      if (classEl) classEl.textContent = safeState.classLabel || 'No class selected';
      if (turnEl) turnEl.textContent = safeState.turnLabel || 'Ready';
      if (titleEl) titleEl.textContent = safeState.title || 'Werewolf';
      if (msgEl) msgEl.textContent = safeState.message || 'Waiting for moderator...';

      if (aliveEl) {
        aliveEl.innerHTML = alive.length
          ? alive.map(name => '<span class="ww-proj-chip">' + String(name) + '</span>').join('')
          : '<span class="ww-proj-empty">No students listed</span>';
      }
      if (deadEl) {
        deadEl.innerHTML = dead.length
          ? dead.map(name => '<span class="ww-proj-chip dead">' + String(name) + '</span>').join('')
          : '<span class="ww-proj-empty">None eliminated</span>';
      }
      if (progressEl) {
        progressEl.innerHTML = steps.map(step => {
          const cls = step.status === 'active' ? 'ww-proj-step active' : step.status === 'done' ? 'ww-proj-step done' : 'ww-proj-step';
          return '<span class="' + cls + '">' + String(step.title || '') + '</span>';
        }).join('');
      }
    }

    function wwBootProjectionReceiverIfNeeded() {
      if (!WW_PRESENTATION_QUERY) return;
      document.body.classList.add('ww-project-mode');

      const channelName = WW_PRESENTATION_CHANNEL_QUERY || 'lt-werewolf-projection';
      const channel = new BroadcastChannel(channelName);
      const clientId = 'ww-mirror-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

      function sendPresence(online) {
        try { channel.postMessage({ type: 'ww-presence', online: !!online, id: clientId }); } catch (e) { }
      }

      wwRenderProjectionState({ title: 'Werewolf', message: 'Waiting for moderator...', turnLabel: 'Connecting...', classLabel: 'Projection', alive: [], dead: [], steps: [] });
      sendPresence(true);
      try { channel.postMessage({ type: 'ww-request-state' }); } catch (e) { }

      channel.onmessage = function (event) {
        const d = event && event.data;
        if (!d) return;
        if (d.type === 'ww-state') {
          wwRenderProjectionState(d.state || {});
          return;
        }
        if (d.type === 'presentation-frozen-state') {
          ltSetProjectionMenuFrozen(!!d.on);
          return;
        }
        if (d.type === 'ww-close') {
          window.close();
        }
      };

      window.addEventListener('beforeunload', function () {
        sendPresence(false);
        try { channel.close(); } catch (e) { }
      });
    }

    function wwBuildPresentationPayload() {
      let title = 'Moderator';
      let message = 'Click Start Night to begin the sequence.';
      let turnLabel = 'Ready';

      if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) {
        const step = wwSteps[wwCurrentStep];
        title = step.title;
        message = step.text;
        turnLabel = wwGetTurnCounterText();
      } else if (wwCurrentStep >= wwSteps.length && wwSteps.length) {
        title = 'Round Complete';
        message = 'Click Start Night to run another cycle, or edit instructions first.';
        turnLabel = 'Round complete';
      }

      const students = wwGetActiveRoster();
      const deadMap = wwDeadByGroup[wwCurrentGroup] || {};
      const alive = [];
      const dead = [];
      students.forEach(name => {
        if (deadMap[name]) {
          const role = wwGetPlayerRole(name);
          dead.push(role ? (name + ' (' + role + ')') : name);
        }
        else alive.push(name);
      });

      const steps = wwSteps.map((step, idx) => ({
        title: step.title,
        status: idx < wwCurrentStep ? 'done' : (idx === wwCurrentStep ? 'active' : 'pending')
      }));

      return {
        title,
        message,
        turnLabel,
        classLabel: wwCurrentGroup || 'No class selected',
        alive,
        dead,
        steps,
        updatedAt: Date.now()
      };
    }

    function wwBroadcastPresentation() {
      if (!presentationState.active || !presentationState.channel || presentationState.frozen) return;
      try {
        presentationState.channel.postMessage({ type: 'ww-state', state: wwBuildPresentationPayload() });
      } catch (e) { }
    }

    async function presentationEnter(sectionId) {
      if (presentationState.active && presentationState.sectionId === sectionId) {
        if (sectionId === 'werewolf-section') wwBroadcastPresentation();
        else ltBroadcastPresentation();
        ltRefreshPresenterPreviews();
        return true;
      }

      const isWerewolf = sectionId === 'werewolf-section';
      const channelName = (isWerewolf ? 'lt-werewolf-projection-' : 'lt-generic-projection-')
        + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      const channel = new BroadcastChannel(channelName);
      let popupRef = null;

      channel.onmessage = function (event) {
        const d = event && event.data;
        if (!d) return;
        if (d.type === 'ww-request-state' && isWerewolf) {
          wwBroadcastPresentation();
          return;
        }
        if (d.type === 'lt-request-state' && !isWerewolf) {
          ltBroadcastPresentation();
          return;
        }
        if (d.type === 'presentation-control') {
          if (d.command === 'close') presentationExit();
          else if (d.command === 'freeze') presentationToggleFreeze();
          else if (d.command === 'resize') presentationResizeWindow();
          else if (d.command === 'right') presentationDockWindow('right');
          else if (d.command === 'left') presentationDockWindow('left');
          return;
        }
        if (d.type === 'presentation-frozen-state') {
          presentationState.frozen = !!d.on;
          ltSetProjectionMenuFrozen(presentationState.frozen);
          return;
        }
        if (d.type === 'ww-presence' || d.type === 'lt-presence') {
          presentationState.peerOnline = !!d.online;
        }
      };

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.openTool === 'function') {
        if (isWerewolf) {
          await Desktop.openTool('learning-tools.html', { query: { wwPresentation: '1', wwChannel: channelName } });
        } else {
          await Desktop.openTool('learning-tools.html', { query: { ltPresentation: '1', ltChannel: channelName, ltSection: sectionId } });
        }
      } else {
        const url = isWerewolf
          ? (location.pathname + '?wwPresentation=1&wwChannel=' + encodeURIComponent(channelName))
          : (location.pathname + '?ltPresentation=1&ltSection=' + encodeURIComponent(sectionId) + '&ltChannel=' + encodeURIComponent(channelName));
        popupRef = window.open(url, '_blank', 'width=1360,height=820,menubar=no,toolbar=no,location=no');
      }

      presentationState = {
        active: true,
        mode: isWerewolf ? 'werewolf' : 'generic',
        sectionId,
        channelName,
        channel,
        popupRef,
        peerOnline: false,
        frozen: false,
        observer: null,
        pendingBroadcastTimer: 0
      };
      ltInstallProjectionControlMenu(null, '', {
        onAction: function (action) {
          if (action === 'close') presentationExit();
          else if (action === 'freeze') presentationToggleFreeze();
          else if (action === 'resize') presentationResizeWindow();
          else if (action === 'right') presentationDockWindow('right');
          else if (action === 'left') presentationDockWindow('left');
        }
      });
      presentationSyncButtons();
      ltRefreshPresenterPreviews();

      if (isWerewolf) {
        wwBroadcastPresentation();
        setTimeout(wwBroadcastPresentation, 400);
      } else {
        ltStartPresentationObserver(sectionId);
        ltBroadcastPresentation();
        setTimeout(ltBroadcastPresentation, 400);
      }
      return true;
    }

    async function presentationExit() {
      if (!presentationState.active) return true;

      try {
        if (presentationState.channel) {
          presentationState.channel.postMessage({ type: presentationState.mode === 'werewolf' ? 'ww-close' : 'lt-close' });
        }
      } catch (e) { }

      try {
        if (presentationState.popupRef && !presentationState.popupRef.closed) {
          presentationState.popupRef.close();
        }
      } catch (e) { }

      try {
        if (presentationState.channel) presentationState.channel.close();
      } catch (e) { }

      ltStopPresentationObserver();

      presentationState = {
        active: false,
        mode: '',
        sectionId: '',
        channelName: '',
        channel: null,
        popupRef: null,
        peerOnline: false,
        frozen: false,
        observer: null,
        pendingBroadcastTimer: 0
      };
      ltRemoveProjectionControlMenu();
      presentationSyncButtons();
      ltRefreshPresenterPreviews();
      return true;
    }

    async function presentationToggle(sectionId) {
      if (presentationState.active && presentationState.sectionId === sectionId) return presentationExit();
      return presentationEnter(sectionId);
    }

    (function initLtSecondScreenPrompt() {
      if (location.search.includes('ltPresentation=1') || location.search.includes('wwPresentation=1')) return;
      function showSecondScreenBanner(onStartPresentation) {
        if (document.getElementById('second-screen-prompt-banner')) return;
        const promptMsg = typeof window.t === 'function' ? window.t('secondDisplayPrompt') : 'Second display detected! Would you like to launch Presentation Mode on monitor 2?';
        const startBtnTxt = typeof window.t === 'function' ? window.t('btnStartPresentation') : 'Start Presentation Mode';
        const dismissBtnTxt = typeof window.t === 'function' ? window.t('btnDismissPrompt') : 'Dismiss';
        const banner = document.createElement('div');
        banner.id = 'second-screen-prompt-banner';
        banner.style.cssText = 'position:fixed;top:16px;right:20px;z-index:99999;display:flex;align-items:center;gap:12px;padding:10px 16px;border:2px solid #333333;border-radius:10px;background:#ffffff;box-shadow:4px 4px 0 #555555;color:#222222;font-family:inherit;font-size:0.86rem;line-height:1.3;animation:slideDownPrompt 0.2s ease-out;';
        if (!document.getElementById('second-screen-banner-styles')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'second-screen-banner-styles';
          styleEl.textContent = '@keyframes slideDownPrompt { from { transform: translateY(-20px); opacity:0; } to { transform: translateY(0); opacity:1; } }';
          document.head.appendChild(styleEl);
        }
        banner.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><img src="../assets/icons/monitor.svg" class="btn-icon" style="margin:0;" alt="" /><span>' + promptMsg + '</span></div>'
          + '<div style="display:flex;align-items:center;gap:8px;margin-left:8px;">'
          + '<button type="button" id="btn-start-second-pres" style="padding:6px 12px;border:2px solid #333333;border-radius:6px;background:#6abf8e;color:#222222;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:2px 2px 0 #555555;transition:transform 0.12s ease;">' + startBtnTxt + '</button>'
          + '<button type="button" id="btn-dismiss-second-pres" style="padding:6px 10px;border:2px solid #333333;border-radius:6px;background:#f5f5f0;color:#222222;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:2px 2px 0 #888888;transition:transform 0.12s ease;">' + dismissBtnTxt + '</button>'
          + '</div>';
        document.body.appendChild(banner);
        banner.querySelector('#btn-start-second-pres').onclick = function() {
          banner.remove();
          onStartPresentation();
        };
        banner.querySelector('#btn-dismiss-second-pres').onclick = function() {
          sessionStorage.setItem('dismissed_second_screen_prompt', '1');
          banner.remove();
        };
      }

      function getActiveSectionId() {
        if (typeof activeSection === 'string' && activeSection && activeSection !== 'main-menu') {
          const activeEl = document.getElementById(activeSection);
          if (activeEl && !activeEl.classList.contains('hidden')) return activeSection;
        }
        const sections = [
          'werewolf-section',
          'clue-game-section',
          'hangman-game-section',
          'scramble-game-section',
          'match-game-section',
          'flip-game-section',
          'sentence-game-section',
          'quote-game-section',
          'gap-game-section',
          'dictation-section',
          'error-game-section',
          'ipa-game-section',
          'synonym-game-section',
          'wordsearch-game-section',
          'order-sentences-section',
          'story-section',
          'quiz-section'
        ];
        for (let i = 0; i < sections.length; i++) {
          const el = document.getElementById(sections[i]);
          if (el && !el.classList.contains('hidden') && el.offsetParent !== null && !el.hasAttribute('hidden') && el.style.display !== 'none') {
            return sections[i];
          }
        }
        return 'clue-game-section';
      }

      async function checkAndPrompt() {
        if (presentationState && presentationState.active) return;
        if (sessionStorage.getItem('dismissed_second_screen_prompt')) return;
        let hasSecond = false;
        if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.hasSecondDisplay === 'function') {
          hasSecond = await window.Desktop.hasSecondDisplay();
        } else if ('isExtended' in window.screen) {
          hasSecond = !!window.screen.isExtended;
        }
        if (hasSecond) {
          showSecondScreenBanner(function() {
            const sid = getActiveSectionId();
            if (typeof presentationEnter === 'function') presentationEnter(sid);
          });
        }
      }

      setTimeout(checkAndPrompt, 1500);
      if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.onDisplayChanged === 'function') {
        window.Desktop.onDisplayChanged(function(data) {
          if (data && data.hasSecond) {
            checkAndPrompt();
          } else {
            const existing = document.getElementById('second-screen-prompt-banner');
            if (existing) existing.remove();
          }
        });
      }
    })();

