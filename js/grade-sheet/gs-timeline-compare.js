    const _gsCorrState = {
      range: '14d',       // 'today' | 'week' | 'month' | 'year' | '7d' | '14d' | '30d' | 'all'
      classId: '',        // '' = all classes
      viewMode: 'daily',  // 'daily' | 'hourly'
      selectedDay: null,  // 'YYYY-MM-DD'
      showCumulative: true,
      showPaceLine: true,
      hiddenClasses: new Set(),
      collapsed: false,
      hitTargets: [],
      lastStats: null
    };
    let _gsCorrResizeObserver = null;
    let _gsCorrRafId = null;

    const _GS_CORR_PALETTE = ['#5b8fcc', '#6abf8e', '#e2c96e', '#8b7cc2', '#c96b6b', '#e59a5a', '#4ea8a6'];

    function _gsToLocalYmd(dateInput) {
      const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function _gsAddDaysYmd(ymd, deltaDays) {
      const [y, m, d] = ymd.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + deltaDays);
      return _gsToLocalYmd(dt);
    }

    function _gsGetPeriodStarts(now = new Date()) {
      const todayStr = _gsToLocalYmd(now);
      const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0 .. Sun=6
      const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStartDate = new Date(now.getFullYear(), 0, 1);
      return {
        todayStr,
        weekStartStr: _gsToLocalYmd(weekStartDate),
        monthStartStr: _gsToLocalYmd(monthStartDate),
        yearStartStr: _gsToLocalYmd(yearStartDate)
      };
    }

    function computeAllTestsCorrectionStats(classIdFilter = '') {
      const now = new Date();
      const { todayStr, weekStartStr, monthStartStr, yearStartStr } = _gsGetPeriodStarts(now);

      const classes = (appState.classes || []).filter(c => !classIdFilter || c.id === classIdFilter);
      const classColorMap = new Map();
      (appState.classes || []).forEach((c, idx) => {
        classColorMap.set(c.id, _GS_CORR_PALETTE[idx % _GS_CORR_PALETTE.length]);
      });

      let totalEligible = 0;
      let totalScored = 0;
      let totalRemaining = 0;
      let totalEstRemainingMin = 0;
      let overdueTestsCount = 0;
      const pendingTests = [];

      const events = [];
      const dailyMap = new Map(); // ymd -> { dateStr, count, timeMin, byClass: Map<classId, count>, events: [] }

      const makePeriodAcc = () => ({
        count: 0,
        timeMin: 0,
        timedCount: 0,
        testsSet: new Set(),
        completedTestsSet: new Set()
      });
      const periods = {
        day: makePeriodAcc(),
        week: makePeriodAcc(),
        month: makePeriodAcc(),
        year: makePeriodAcc()
      };

      classes.forEach(c => {
        ensureClassStructures(c);
        const testCounts = c.testCounts || { sem1: 0, sem2: 0 };
        const classSem = c.semester ? Number(c.semester) : 0;
        const sems = [];
        if (classSem !== 2) sems.push('sem1');
        if (classSem !== 1) sems.push('sem2');
        const multiSem = sems.length > 1;

        sems.forEach(sem => {
          const cnt = testCounts[sem] || 0;
          for (let i = 0; i < cnt; i++) {
            const cfg = getTestConfig(c, sem, i);
            const testName = (cfg && cfg.testName) ? cfg.testName : `Test ${i + 1}`;
            const badge = multiSem ? (sem === 'sem1' ? `S1·T${i + 1}` : `S2·T${i + 1}`) : `T${i + 1}`;
            const date = (cfg && cfg.testDate) ? cfg.testDate : '';
            const prog = computeScoringProgress(c, sem, i, cfg);
            const isTaken = !!(date && date <= todayStr);
            const testKey = `${c.id}:${sem}:${i}`;
            const isTestCompleted = !!(cfg && cfg.markingCompleted) || (prog.totalCount > 0 && prog.remainingCount === 0);

            if (isTaken) {
              totalEligible += prog.totalCount;
              totalScored += prog.scoredCount;
              totalRemaining += prog.remainingCount;
              if (prog.remainingCount > 0 && !(cfg && cfg.markingCompleted)) {
                const estMin = (prog.hasEta && prog.avgMin > 0)
                  ? Math.round(prog.remainingCount * prog.avgMin)
                  : (prog.remainingCount * 15);
                totalEstRemainingMin += estMin;

                let dlDate = (cfg && cfg.correctionDeadline) ? cfg.correctionDeadline : '';
                if (!dlDate && cfg && cfg.correctionDeadlineDaysAfter && date) {
                  try {
                    const d = new Date(date + 'T00:00:00');
                    d.setDate(d.getDate() + Number(cfg.correctionDeadlineDaysAfter));
                    dlDate = _gsToLocalYmd(d);
                  } catch (_) {}
                }
                const isOverdue = !!(dlDate && dlDate < todayStr);
                const isDueToday = !!(dlDate && dlDate === todayStr);
                if (isOverdue) overdueTestsCount++;
                pendingTests.push({
                  classObj: c,
                  sem,
                  testIndex: i,
                  testName,
                  badge,
                  remainingCount: prog.remainingCount,
                  estMinutes: estMin,
                  dlDate,
                  isOverdue,
                  isDueToday
                });
              }
            }

            // Collect per-student correction timestamps
            (c.students || []).forEach(st => {
              const ts = st && st.correctedAt && Array.isArray(st.correctedAt[sem]) ? st.correctedAt[sem][i] : null;
              if (!ts) return;
              const dt = new Date(ts);
              if (isNaN(dt.getTime())) return;
              const ymd = _gsToLocalYmd(dt);
              if (!ymd) return;
              const rawCt = st.correctionTime && Array.isArray(st.correctionTime[sem]) ? Number(st.correctionTime[sem][i]) : 0;
              const corrMin = (!isNaN(rawCt) && rawCt > 0) ? rawCt : 0;
              const grade = getTestDisplayGrade(st, c, sem, i);
              const studentName = `${st.firstName || ''} ${st.lastName || ''}`.trim() || st.customName || `#${st.index}`;

              const ev = {
                ts,
                timeMs: dt.getTime(),
                localYmd: ymd,
                classId: c.id,
                className: c.name,
                color: classColorMap.get(c.id) || '#5b8fcc',
                sem,
                testIndex: i,
                testName,
                badge,
                studentId: st.id,
                studentName,
                grade,
                corrMin
              };
              events.push(ev);

              if (!dailyMap.has(ymd)) {
                dailyMap.set(ymd, { dateStr: ymd, count: 0, timeMin: 0, byClass: new Map(), events: [] });
              }
              const dayObj = dailyMap.get(ymd);
              dayObj.count++;
              dayObj.timeMin += corrMin;
              dayObj.byClass.set(c.id, (dayObj.byClass.get(c.id) || 0) + 1);
              dayObj.events.push(ev);

              const addToPeriod = (p) => {
                p.count++;
                if (corrMin > 0) {
                  p.timeMin += corrMin;
                  p.timedCount++;
                }
                p.testsSet.add(testKey);
                if (isTestCompleted) p.completedTestsSet.add(testKey);
              };
              if (ymd === todayStr) addToPeriod(periods.day);
              if (ymd >= weekStartStr && ymd <= todayStr) addToPeriod(periods.week);
              if (ymd >= monthStartStr && ymd <= todayStr) addToPeriod(periods.month);
              if (ymd >= yearStartStr && ymd <= todayStr) addToPeriod(periods.year);
            });
          }
        });
      });

      pendingTests.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1;
        return (a.dlDate || '9999-99-99').localeCompare(b.dlDate || '9999-99-99');
      });

      let peakDay = null;
      let totalTimedEvents = 0;
      dailyMap.forEach(d => {
        if (!peakDay || d.count > peakDay.count || (d.count === peakDay.count && d.dateStr > peakDay.dateStr)) {
          peakDay = { dateStr: d.dateStr, count: d.count };
        }
        totalTimedEvents += d.count;
      });
      const activeDays = dailyMap.size;
      const avgPace = activeDays > 0 ? Math.round((totalTimedEvents / activeDays) * 10) / 10 : 0;
      const completionPct = totalEligible > 0 ? Math.round((totalScored / totalEligible) * 100) : 0;

      return {
        todayStr,
        weekStartStr,
        monthStartStr,
        yearStartStr,
        totalEligible,
        totalScored,
        totalRemaining,
        totalEstRemainingMin,
        overdueTestsCount,
        pendingTests,
        completionPct,
        periods,
        events,
        dailyMap,
        peakDay,
        avgPace,
        activeDays,
        classColorMap
      };
    }

    function _gsGetTimelineDayList(stats) {
      const todayStr = stats.todayStr;
      let startYmd = todayStr;
      if (_gsCorrState.range === 'today') {
        startYmd = todayStr;
      } else if (_gsCorrState.range === 'week') {
        startYmd = stats.weekStartStr;
      } else if (_gsCorrState.range === 'month') {
        startYmd = stats.monthStartStr;
      } else if (_gsCorrState.range === 'year') {
        startYmd = stats.yearStartStr;
      } else if (_gsCorrState.range === '7d') {
        startYmd = _gsAddDaysYmd(todayStr, -6);
      } else if (_gsCorrState.range === '14d') {
        startYmd = _gsAddDaysYmd(todayStr, -13);
      } else if (_gsCorrState.range === '30d') {
        startYmd = _gsAddDaysYmd(todayStr, -29);
      } else if (_gsCorrState.range === 'all') {
        const keys = [...stats.dailyMap.keys()].sort();
        startYmd = keys.length ? keys[0] : _gsAddDaysYmd(todayStr, -13);
      }

      const days = [];
      let cur = startYmd;
      let guard = 0;
      while (cur <= todayStr && guard < 400) {
        days.push(cur);
        cur = _gsAddDaysYmd(cur, 1);
        guard++;
      }
      return days;
    }

    function renderAllTestsStats() {
      const panel = document.getElementById("all-tests-stats-panel");
      if (!panel) return;
      const hasAnyTests = (appState.classes || []).some(c => {
        const tc = c.testCounts || { sem1: 0, sem2: 0 };
        return (tc.sem1 || 0) + (tc.sem2 || 0) > 0;
      });
      if (!hasAnyTests) {
        panel.classList.add("hidden");
        return;
      }
      panel.classList.remove("hidden");

      const stats = computeAllTestsCorrectionStats(_gsCorrState.classId);
      _gsCorrState.lastStats = stats;
      if (!_gsCorrState.selectedDay) _gsCorrState.selectedDay = stats.todayStr;

      const dayP = stats.periods.day;
      const weekP = stats.periods.week;
      const monthP = stats.periods.month;
      const yearP = stats.periods.year;

      const fmtPeriodAvg = (p) => p.timedCount > 0 ? formatCorrectionTime(Math.round((p.timeMin / p.timedCount) * 10) / 10) : '—';
      const fmtPeriodTime = (p) => p.timeMin > 0 ? formatCorrectionTime(Math.round(p.timeMin * 10) / 10) : '—';

      const pendingChipsHtml = stats.pendingTests.length > 0 ? `
        <div class="gs-corr-pending-strip">
          <span class="gs-corr-pending-label">${escapeHtml(t('gsCorrPendingTestsLabel') || 'Unmarked Tests')}:</span>
          ${stats.pendingTests.map(pt => {
            const dlHint = pt.dlDate ? (pt.isOverdue ? ` · ${tFmt('gsAllTestsOverdue', { date: pt.dlDate })}` : (pt.isDueToday ? ` · ${t('gsAllTestsDueToday')}` : ` · ${pt.dlDate}`)) : '';
            return `<button type="button" class="gs-corr-pending-chip ${pt.isOverdue ? 'is-overdue' : ''}" data-class-id="${escapeHtml(pt.classObj.id)}" data-sem="${escapeHtml(pt.sem)}" data-test-idx="${pt.testIndex}" title="${escapeHtml(pt.classObj.name + ' · ' + pt.testName)}">
              <strong>${escapeHtml(pt.classObj.name)}</strong> · ${escapeHtml(pt.badge)} (${pt.remainingCount} · ~${escapeHtml(formatCorrectionTime(pt.estMinutes))}${escapeHtml(dlHint)})
            </button>`;
          }).join('')}
        </div>
      ` : '';

      const classOptionsHtml = `<option value="">${escapeHtml(t('gsCorrAllClasses') || 'All Classes')}</option>` +
        (appState.classes || []).map(c => `<option value="${escapeHtml(c.id)}" ${_gsCorrState.classId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');

      const classChipsHtml = (appState.classes || []).map(c => {
        const col = stats.classColorMap.get(c.id) || '#5b8fcc';
        const isActive = !_gsCorrState.hiddenClasses.has(c.id);
        return `<button type="button" class="gs-corr-filter-chip ${isActive ? 'active' : ''}" data-filter-class="${escapeHtml(c.id)}">
          <span class="gs-corr-chip-dot" style="background:${col};"></span>
          <span>${escapeHtml(c.name)}</span>
        </button>`;
      }).join('');

      const periodCardHtml = (key, rangeVal, titleText, p) => `
        <button type="button" class="gs-corr-period-card ${_gsCorrState.range === rangeVal ? 'active' : ''}" data-period-range="${rangeVal}">
          <div class="gs-corr-period-head">
            <span class="gs-corr-period-title">${escapeHtml(titleText)}</span>
          </div>
          <div class="gs-corr-period-count">${p.count} <span style="font-size:0.78rem;font-weight:600;color:#555555;">${escapeHtml(p.count === 1 ? (t('gsCorrStudentSingular') || 'student') : (t('gsCorrStudentsPlural') || 'students'))}</span></div>
          <div class="gs-corr-period-meta">
            <span>${escapeHtml(t('gsCorrTimeSpent') || 'Time')}: <strong>${escapeHtml(fmtPeriodTime(p))}</strong></span>
            <span>${escapeHtml(t('gsCorrAvgPerStudent') || 'Avg')}: <strong>${escapeHtml(fmtPeriodAvg(p))}</strong></span>
            <span><strong>${p.testsSet.size}</strong> ${escapeHtml(t('gsCorrTestsTouched') || 'tests')} (${p.completedTestsSet.size} ${escapeHtml(t('gsCorrDoneShort') || 'done')})</span>
          </div>
        </button>
      `;

      const peakText = stats.peakDay
        ? `${stats.peakDay.count} (${stats.peakDay.dateStr})`
        : '—';

      panel.innerHTML = `
        <div class="gs-corr-header">
          <div class="gs-corr-title-wrap">
            <img src="../assets/icons/clock.svg" class="btn-icon" alt="" />
            <h3 class="gs-corr-title">${escapeHtml(t('gsCorrStatsTitle') || 'Correction Activity & Statistics')}</h3>
            <span class="gs-corr-subtitle">${escapeHtml(t('gsCorrStatsSubtitle') || 'Track daily marking pace, time spent, and remaining unmarked exams')}</span>
          </div>
          <div class="gs-corr-header-actions">
            <button type="button" class="btn" id="gsCorrToggleCollapseBtn" title="${escapeHtml(t('gsCorrToggleCollapse') || 'Collapse / Expand')}">
              <img src="../assets/icons/chevron-down.svg" class="btn-icon" alt="" style="transform:${_gsCorrState.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};transition:transform 0.15s ease;" />
            </button>
          </div>
        </div>
        <div id="gsCorrBody" class="${_gsCorrState.collapsed ? 'hidden' : ''}">
          <div class="gs-corr-kpi-bar">
            <div class="gs-corr-kpi-pill is-accent-sage">
              <span class="gs-corr-kpi-label">${escapeHtml(t('gsCorrKpiToday') || 'Corrected Today')}</span>
              <span class="gs-corr-kpi-value">${dayP.count}</span>
              <span class="gs-corr-kpi-sub">${escapeHtml(dayP.timeMin > 0 ? `${fmtPeriodTime(dayP)} ${t('gsCorrLogged') || 'logged'}` : (t('gsCorrNoTimeLogged') || 'No time logged yet'))}</span>
            </div>
            <div class="gs-corr-kpi-pill ${stats.overdueTestsCount > 0 ? 'is-accent-rose' : (stats.totalRemaining > 0 ? 'is-accent-amber' : 'is-accent-sage')}">
              <span class="gs-corr-kpi-label">${escapeHtml(t('gsCorrKpiUnmarked') || 'Unmarked Exams')}</span>
              <span class="gs-corr-kpi-value">${stats.totalRemaining}</span>
              <span class="gs-corr-kpi-sub">${escapeHtml(tFmt('gsCorrUnmarkedSub', { tests: stats.pendingTests.length, overdue: stats.overdueTestsCount }) || `${stats.pendingTests.length} tests · ${stats.overdueTestsCount} overdue`)}</span>
            </div>
            <div class="gs-corr-kpi-pill">
              <span class="gs-corr-kpi-label">${escapeHtml(t('gsCorrKpiEta') || 'Est. Time Left')}</span>
              <span class="gs-corr-kpi-value">${stats.totalRemaining > 0 ? escapeHtml(formatCorrectionTime(stats.totalEstRemainingMin)) : '0m'}</span>
              <span class="gs-corr-kpi-sub">${escapeHtml(stats.totalRemaining > 0 ? (t('gsCorrEtaSub') || 'Across pending taken tests') : (t('gsCorrAllMarked') || 'All taken tests marked'))}</span>
            </div>
            <div class="gs-corr-kpi-pill">
              <span class="gs-corr-kpi-label">${escapeHtml(t('gsCorrKpiCompletion') || 'Marking Progress')}</span>
              <span class="gs-corr-kpi-value">${stats.totalScored} / ${stats.totalEligible} (${stats.completionPct}%)</span>
              <div class="gs-corr-progress-track"><div class="gs-corr-progress-fill" style="width:${stats.completionPct}%;"></div></div>
            </div>
            <div class="gs-corr-kpi-pill">
              <span class="gs-corr-kpi-label">${escapeHtml(t('gsCorrKpiPacePeak') || 'Daily Pace & Peak')}</span>
              <span class="gs-corr-kpi-value">${stats.avgPace} / ${escapeHtml(t('gsCorrDayUnit') || 'day')}</span>
              <span class="gs-corr-kpi-sub">${escapeHtml(t('gsCorrPeakLabel') || 'Peak')}: ${escapeHtml(peakText)}</span>
            </div>
          </div>

          <div class="gs-corr-period-grid">
            ${periodCardHtml('day', 'today', t('gsCorrThisDay') || 'Corrected this Day', dayP)}
            ${periodCardHtml('week', 'week', t('gsCorrThisWeek') || 'Corrected this Week', weekP)}
            ${periodCardHtml('month', 'month', t('gsCorrThisMonth') || 'Corrected this Month', monthP)}
            ${periodCardHtml('year', 'year', t('gsCorrThisYear') || 'Corrected this Year', yearP)}
          </div>

          ${pendingChipsHtml}

          <div class="gs-corr-timeline-toolbar">
            <div class="gs-corr-controls-left">
              <div class="gs-corr-control-group">
                <label for="gsCorrRangeSelect">${escapeHtml(t('gsCorrRangeLabel') || 'Range')}</label>
                <select id="gsCorrRangeSelect" class="gs-corr-select">
                  <option value="today" ${_gsCorrState.range === 'today' ? 'selected' : ''}>${escapeHtml(t('gsCorrRangeToday') || 'Today')}</option>
                  <option value="week" ${_gsCorrState.range === 'week' ? 'selected' : ''}>${escapeHtml(t('gsCorrRangeWeek') || 'This Week')}</option>
                  <option value="month" ${_gsCorrState.range === 'month' ? 'selected' : ''}>${escapeHtml(t('gsCorrRangeMonth') || 'This Month')}</option>
                  <option value="year" ${_gsCorrState.range === 'year' ? 'selected' : ''}>${escapeHtml(t('gsCorrRangeYear') || 'This Year')}</option>
                  <option value="7d" ${_gsCorrState.range === '7d' ? 'selected' : ''}>${escapeHtml(t('gsCorrRange7d') || 'Last 7 days')}</option>
                  <option value="14d" ${_gsCorrState.range === '14d' ? 'selected' : ''}>${escapeHtml(t('gsCorrRange14d') || 'Last 14 days')}</option>
                  <option value="30d" ${_gsCorrState.range === '30d' ? 'selected' : ''}>${escapeHtml(t('gsCorrRange30d') || 'Last 30 days')}</option>
                  <option value="all" ${_gsCorrState.range === 'all' ? 'selected' : ''}>${escapeHtml(t('gsCorrRangeAll') || 'All recorded days')}</option>
                </select>
              </div>
              <div class="gs-corr-control-group">
                <label for="gsCorrClassSelect">${escapeHtml(t('gsCorrClassLabel') || 'Class')}</label>
                <select id="gsCorrClassSelect" class="gs-corr-select">${classOptionsHtml}</select>
              </div>
              <div class="gs-corr-control-group">
                <label for="gsCorrViewSelect">${escapeHtml(t('gsCorrViewLabel') || 'View')}</label>
                <select id="gsCorrViewSelect" class="gs-corr-select">
                  <option value="daily" ${_gsCorrState.viewMode === 'daily' ? 'selected' : ''}>${escapeHtml(t('gsCorrViewDaily') || 'Daily Bars + Cumulative')}</option>
                  <option value="hourly" ${_gsCorrState.viewMode === 'hourly' ? 'selected' : ''}>${escapeHtml(t('gsCorrViewHourly') || 'Intra-day Hourly')}</option>
                </select>
              </div>
            </div>
            <div class="gs-corr-controls-right">
              <button type="button" class="btn" id="gsCorrExportPngBtn" title="${escapeHtml(t('gsCorrExportPng') || 'Export Timeline (PNG)')}">
                <img src="../assets/icons/download.svg" class="btn-icon" alt="" /> <span>PNG</span>
              </button>
              <button type="button" class="btn" id="gsCorrExportSvgBtn" title="${escapeHtml(t('gsCorrExportSvg') || 'Export Timeline (SVG)')}">
                <img src="../assets/icons/export.svg" class="btn-icon" alt="" /> <span>SVG</span>
              </button>
            </div>
          </div>

          <div class="gs-corr-filter-chips">
            <button type="button" class="gs-corr-filter-chip ${_gsCorrState.showCumulative ? 'active' : ''}" id="gsCorrToggleCumBtn">
              <span class="gs-corr-chip-dot" style="background:#333333;"></span>
              <span>${escapeHtml(t('gsCorrFilterCumulative') || 'Cumulative')}</span>
            </button>
            <button type="button" class="gs-corr-filter-chip ${_gsCorrState.showPaceLine ? 'active' : ''}" id="gsCorrTogglePaceBtn">
              <span class="gs-corr-chip-dot" style="background:#e2c96e;"></span>
              <span>${escapeHtml(t('gsCorrFilterPace') || 'Avg Pace')}</span>
            </button>
            ${classChipsHtml}
          </div>

          <div class="gs-corr-canvas-wrap" id="gsCorrCanvasWrap">
            <canvas id="gsCorrCanvas" class="gs-corr-canvas" height="240"></canvas>
            <div id="gsCorrTooltip" class="gs-corr-tooltip"></div>
            <div id="gsCorrEmptyState" class="gs-corr-empty-state hidden">
              <img src="../assets/icons/clock.svg" class="btn-icon" style="width:28px;height:28px;opacity:0.6;" alt="" />
              <h4>${escapeHtml(t('gsCorrEmptyTitle') || 'No correction timestamps recorded in this range yet.')}</h4>
              <p>${escapeHtml(t('gsCorrEmptyDesc') || 'Correction dates are recorded automatically whenever you grade or update a student in a test sheet.')}</p>
            </div>
          </div>

          <div id="gsCorrDayDetail" class="gs-corr-day-detail hidden"></div>
        </div>
      `;

      // Bind panel events
      document.getElementById("gsCorrToggleCollapseBtn")?.addEventListener("click", () => {
        _gsCorrState.collapsed = !_gsCorrState.collapsed;
        renderAllTestsStats();
      });

      panel.querySelectorAll(".gs-corr-period-card").forEach(btn => {
        btn.addEventListener("click", () => {
          const r = btn.dataset.periodRange;
          if (r) {
            _gsCorrState.range = r;
            if (r === 'today') {
              _gsCorrState.selectedDay = stats.todayStr;
            }
            renderAllTestsStats();
          }
        });
      });

      panel.querySelectorAll(".gs-corr-pending-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const cid = chip.dataset.classId;
          const sem = chip.dataset.sem;
          const ti = Number(chip.dataset.testIdx);
          const targetClass = (appState.classes || []).find(cl => cl.id === cid);
          if (!targetClass) return;
          appState.activeClassId = targetClass.id;
          ensureClassStructures(targetClass);
          renderSummary();
          appState.activeTest = { semester: sem, testIndex: ti };
          renderTestSheet();
          showScreen("test");
        });
      });

      document.getElementById("gsCorrRangeSelect")?.addEventListener("change", (e) => {
        _gsCorrState.range = e.target.value;
        renderAllTestsStats();
      });
      document.getElementById("gsCorrClassSelect")?.addEventListener("change", (e) => {
        _gsCorrState.classId = e.target.value;
        renderAllTestsStats();
      });
      document.getElementById("gsCorrViewSelect")?.addEventListener("change", (e) => {
        _gsCorrState.viewMode = e.target.value;
        if (_gsCorrState.viewMode === 'hourly' && !_gsCorrState.selectedDay) {
          _gsCorrState.selectedDay = stats.todayStr;
        }
        _scheduleDrawCorrectionTimeline();
        _renderCorrectionDayDetail();
      });

      document.getElementById("gsCorrToggleCumBtn")?.addEventListener("click", () => {
        _gsCorrState.showCumulative = !_gsCorrState.showCumulative;
        renderAllTestsStats();
      });
      document.getElementById("gsCorrTogglePaceBtn")?.addEventListener("click", () => {
        _gsCorrState.showPaceLine = !_gsCorrState.showPaceLine;
        renderAllTestsStats();
      });

      panel.querySelectorAll("[data-filter-class]").forEach(btn => {
        btn.addEventListener("click", () => {
          const cid = btn.dataset.filterClass;
          if (_gsCorrState.hiddenClasses.has(cid)) {
            _gsCorrState.hiddenClasses.delete(cid);
          } else {
            _gsCorrState.hiddenClasses.add(cid);
          }
          renderAllTestsStats();
        });
      });

      document.getElementById("gsCorrExportPngBtn")?.addEventListener("click", exportCorrectionTimelinePng);
      document.getElementById("gsCorrExportSvgBtn")?.addEventListener("click", exportCorrectionTimelineSvg);

      if (!_gsCorrState.collapsed) {
        _initCorrectionCanvasEvents();
        _setupCorrectionResizeObserver();
        _scheduleDrawCorrectionTimeline();
        _renderCorrectionDayDetail();
      }
    }

    function _setupCorrectionResizeObserver() {
      const wrap = document.getElementById("gsCorrCanvasWrap");
      if (!wrap || typeof ResizeObserver === 'undefined') return;
      if (_gsCorrResizeObserver) {
        _gsCorrResizeObserver.disconnect();
      }
      _gsCorrResizeObserver = new ResizeObserver(() => {
        if (!_gsCorrState.collapsed) {
          _scheduleDrawCorrectionTimeline();
        }
      });
      _gsCorrResizeObserver.observe(wrap);
    }

    function _scheduleDrawCorrectionTimeline() {
      if (_gsCorrRafId) cancelAnimationFrame(_gsCorrRafId);
      _gsCorrRafId = requestAnimationFrame(() => {
        _gsCorrRafId = null;
        const canvas = document.getElementById("gsCorrCanvas");
        if (canvas) drawCorrectionTimeline(canvas);
      });
    }

    function drawCorrectionTimeline(canvas) {
      if (!canvas) return;
      const stats = _gsCorrState.lastStats;
      if (!stats) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || canvas.offsetWidth || 860;
      const height = rect.height || canvas.offsetHeight || 240;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const emptyEl = document.getElementById("gsCorrEmptyState");
      _gsCorrState.hitTargets = [];

      const visibleEvents = stats.events.filter(ev => !_gsCorrState.hiddenClasses.has(ev.classId));

      if (_gsCorrState.viewMode === 'hourly') {
        const targetDay = _gsCorrState.selectedDay || stats.todayStr;
        const dayEvents = visibleEvents
          .filter(ev => ev.localYmd === targetDay)
          .sort((a, b) => a.timeMs - b.timeMs);

        if (dayEvents.length === 0) {
          if (emptyEl) emptyEl.classList.remove("hidden");
          return;
        }
        if (emptyEl) emptyEl.classList.add("hidden");

        const padLeft = 48;
        const padRight = 24;
        const padTop = 26;
        const padBottom = 34;
        const plotW = Math.max(100, width - padLeft - padRight);
        const plotH = Math.max(80, height - padTop - padBottom);
        const baseY = padTop + plotH;

        const [y, m, d] = targetDay.split('-').map(Number);
        const dayStartMs = new Date(y, m - 1, d, 0, 0, 0).getTime();
        const dayEndMs = new Date(y, m - 1, d, 23, 59, 59).getTime();
        const spanMs = dayEndMs - dayStartMs;

        // Grid lines every 3 hours
        ctx.strokeStyle = '#ecece5';
        ctx.lineWidth = 1;
        ctx.font = '600 10px Lexend, sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        for (let hr = 0; hr <= 24; hr += 3) {
          const x = padLeft + (hr / 24) * plotW;
          ctx.beginPath();
          ctx.moveTo(x, padTop);
          ctx.lineTo(x, baseY);
          ctx.stroke();
          ctx.fillText(`${String(hr).padStart(2, '0')}:00`, x, baseY + 16);
        }

        // Baseline
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, baseY);
        ctx.lineTo(padLeft + plotW, baseY);
        ctx.stroke();

        // Title label
        ctx.fillStyle = '#333333';
        ctx.font = '800 11px Lexend, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${targetDay} · ${dayEvents.length} ${dayEvents.length === 1 ? 'student' : 'students'}`, padLeft, 16);

        // Stems & dots (staggered vertically if close in time)
        const placedXs = [];
        dayEvents.forEach((ev) => {
          const ratio = Math.max(0, Math.min(1, (ev.timeMs - dayStartMs) / spanMs));
          const x = padLeft + ratio * plotW;
          let tier = 0;
          for (let px of placedXs) {
            if (Math.abs(px.x - x) < 16 && px.tier === tier) tier++;
          }
          placedXs.push({ x, tier });
          const dotY = Math.max(padTop + 12, baseY - 26 - (tier % 5) * 24);

          ctx.strokeStyle = '#555555';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, baseY);
          ctx.lineTo(x, dotY);
          ctx.stroke();

          ctx.fillStyle = '#555555';
          ctx.beginPath();
          ctx.arc(x + 1.5, dotY + 1.5, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = ev.color;
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, dotY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          _gsCorrState.hitTargets.push({
            type: 'event',
            x: x - 9,
            y: dotY - 9,
            w: 18,
            h: 18,
            ev
          });
        });
        return;
      }

      // Daily Bars + Cumulative View
      const days = _gsGetTimelineDayList(stats);
      const dayBuckets = days.map(ymd => {
        const dayEvs = visibleEvents.filter(ev => ev.localYmd === ymd);
        const byClass = new Map();
        let timeMin = 0;
        dayEvs.forEach(ev => {
          byClass.set(ev.classId, (byClass.get(ev.classId) || 0) + 1);
          timeMin += ev.corrMin || 0;
        });
        return { dateStr: ymd, count: dayEvs.length, timeMin, byClass, events: dayEvs };
      });

      const hasAnyVisible = dayBuckets.some(b => b.count > 0);
      if (!hasAnyVisible) {
        if (emptyEl) emptyEl.classList.remove("hidden");
        return;
      }
      if (emptyEl) emptyEl.classList.add("hidden");

      const padLeft = 44;
      const padRight = _gsCorrState.showCumulative ? 44 : 20;
      const padTop = 24;
      const padBottom = 34;
      const plotW = Math.max(100, width - padLeft - padRight);
      const plotH = Math.max(80, height - padTop - padBottom);
      const baseY = padTop + plotH;

      const maxDayCount = Math.max(1, ...dayBuckets.map(b => b.count));
      const yMax = Math.max(2, Math.ceil(maxDayCount * 1.18));
      const cumTotal = dayBuckets.reduce((acc, b) => acc + b.count, 0);

      // Horizontal grid lines
      ctx.strokeStyle = '#ecece5';
      ctx.lineWidth = 1;
      ctx.font = '600 10px Lexend, sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'right';
      const gridSteps = Math.min(5, yMax);
      for (let g = 0; g <= gridSteps; g++) {
        const val = Math.round((g / gridSteps) * yMax);
        const y = baseY - (val / yMax) * plotH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
        ctx.fillText(String(val), padLeft - 6, y + 3);
      }

      // Baseline
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, baseY);
      ctx.lineTo(padLeft + plotW, baseY);
      ctx.stroke();

      const slotW = plotW / Math.max(1, dayBuckets.length);
      const barW = Math.max(6, Math.min(36, slotW * 0.66));
      const labelStep = Math.max(1, Math.ceil(dayBuckets.length / 10));

      dayBuckets.forEach((b, idx) => {
        const cx = padLeft + idx * slotW + slotW / 2;
        const bx = cx - barW / 2;
        const isToday = b.dateStr === stats.todayStr;
        const isSelected = b.dateStr === _gsCorrState.selectedDay;

        if (isToday || isSelected) {
          ctx.fillStyle = isToday ? 'rgba(226, 201, 110, 0.16)' : 'rgba(91, 143, 204, 0.12)';
          ctx.fillRect(bx - 3, padTop, barW + 6, plotH);
        }

        if (b.count > 0) {
          const totalBarH = (b.count / yMax) * plotH;
          const topY = baseY - totalBarH;

          // Offset shadow
          ctx.fillStyle = '#555555';
          ctx.fillRect(bx + 2, topY + 2, barW, totalBarH);

          // Stacked class segments
          let curBottom = baseY;
          const entries = [...b.byClass.entries()];
          entries.forEach(([cid, cnt]) => {
            const segH = (cnt / yMax) * plotH;
            const segTop = curBottom - segH;
            ctx.fillStyle = stats.classColorMap.get(cid) || '#5b8fcc';
            ctx.fillRect(bx, segTop, barW, segH);
            curBottom = segTop;
          });

          // Border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = isToday ? 2 : 1.5;
          ctx.strokeRect(bx, topY, barW, totalBarH);

          // Count label above bar
          ctx.fillStyle = '#222222';
          ctx.font = '800 10px Lexend, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(b.count), cx, Math.max(padTop - 4, topY - 5));
        }

        // X-axis date label
        if (idx % labelStep === 0 || idx === dayBuckets.length - 1 || isToday) {
          ctx.fillStyle = isToday ? '#222222' : '#666666';
          ctx.font = isToday ? '800 10px Lexend, sans-serif' : '600 10px Lexend, sans-serif';
          ctx.textAlign = 'center';
          const shortLbl = b.dateStr.slice(5); // MM-DD
          ctx.fillText(shortLbl, cx, baseY + 16);
        }

        _gsCorrState.hitTargets.push({
          type: 'day',
          x: bx - 4,
          y: padTop,
          w: barW + 8,
          h: plotH,
          dayData: b
        });
      });

      // Average Pace Dashed Line
      if (_gsCorrState.showPaceLine && stats.avgPace > 0 && stats.avgPace <= yMax) {
        const paceY = baseY - (stats.avgPace / yMax) * plotH;
        ctx.save();
        ctx.strokeStyle = '#c89b19';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, paceY);
        ctx.lineTo(padLeft + plotW, paceY);
        ctx.stroke();
        ctx.restore();
      }

      // Cumulative Line
      if (_gsCorrState.showCumulative && cumTotal > 0) {
        let running = 0;
        ctx.save();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        dayBuckets.forEach((b, idx) => {
          running += b.count;
          const cx = padLeft + idx * slotW + slotW / 2;
          const cy = baseY - (running / cumTotal) * plotH;
          if (idx === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.stroke();

        // Cumulative right-axis label
        ctx.fillStyle = '#333333';
        ctx.font = '700 10px Lexend, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(cumTotal), padLeft + plotW + 6, padTop + 4);
        ctx.restore();
      }
    }

    function _initCorrectionCanvasEvents() {
      const canvas = document.getElementById("gsCorrCanvas");
      const tooltip = document.getElementById("gsCorrTooltip");
      if (!canvas || !tooltip) return;

      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = _gsCorrState.hitTargets.find(t => mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h);
        if (!hit) {
          tooltip.style.display = 'none';
          return;
        }
        if (hit.type === 'day') {
          const b = hit.dayData;
          const timeStr = b.timeMin > 0 ? ` · ${formatCorrectionTime(Math.round(b.timeMin * 10) / 10)}` : '';
          const classLines = [...b.byClass.entries()].map(([cid, cnt]) => {
            const cls = (appState.classes || []).find(c => c.id === cid);
            return `<div>${escapeHtml(cls ? cls.name : cid)}: <strong>${cnt}</strong></div>`;
          }).join('');
          tooltip.innerHTML = `<div style="font-weight:800;margin-bottom:3px;">${escapeHtml(b.dateStr)}</div>
            <div><strong>${b.count}</strong> ${escapeHtml(b.count === 1 ? 'student' : 'students')}${escapeHtml(timeStr)}</div>
            ${classLines}`;
        } else if (hit.type === 'event') {
          const ev = hit.ev;
          const dt = new Date(ev.timeMs);
          const hhmm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
          const gradeStr = ev.grade != null ? ` · Grade ${fmtN(ev.grade)}` : '';
          tooltip.innerHTML = `<div style="font-weight:800;">${escapeHtml(ev.studentName)}</div>
            <div>${escapeHtml(ev.className)} · ${escapeHtml(ev.badge)} (${escapeHtml(ev.testName)})</div>
            <div>${escapeHtml(hhmm)}${escapeHtml(gradeStr)}</div>`;
        }
        tooltip.style.display = 'block';
        const left = Math.min(rect.width - 210, Math.max(8, mx + 12));
        const top = Math.max(8, my - 28);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      };

      canvas.onmouseleave = () => {
        tooltip.style.display = 'none';
      };

      canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = _gsCorrState.hitTargets.find(t => mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h);
        if (hit && hit.type === 'day') {
          _gsCorrState.selectedDay = hit.dayData.dateStr;
          _scheduleDrawCorrectionTimeline();
          _renderCorrectionDayDetail();
        }
      };
    }

    function _renderCorrectionDayDetail() {
      const box = document.getElementById("gsCorrDayDetail");
      const stats = _gsCorrState.lastStats;
      if (!box || !stats || !_gsCorrState.selectedDay) {
        if (box) box.classList.add("hidden");
        return;
      }
      const dayEvs = stats.events
        .filter(ev => ev.localYmd === _gsCorrState.selectedDay && !_gsCorrState.hiddenClasses.has(ev.classId))
        .sort((a, b) => b.timeMs - a.timeMs);

      if (dayEvs.length === 0) {
        box.classList.add("hidden");
        return;
      }
      box.classList.remove("hidden");
      const totalMin = dayEvs.reduce((acc, ev) => acc + (ev.corrMin || 0), 0);
      const timeBadge = totalMin > 0 ? ` · ${formatCorrectionTime(Math.round(totalMin * 10) / 10)}` : '';
      box.innerHTML = `
        <div class="gs-corr-day-detail-head">
          <span>${escapeHtml(_gsCorrState.selectedDay)} — ${dayEvs.length} ${escapeHtml(dayEvs.length === 1 ? (t('gsCorrStudentSingular') || 'student') : (t('gsCorrStudentsPlural') || 'students'))}${escapeHtml(timeBadge)}</span>
          <button type="button" class="btn btn-xs" id="gsCorrCloseDayDetailBtn">${escapeHtml(t('gsBtnClose') || 'Close')}</button>
        </div>
        <div class="gs-corr-day-detail-list">
          ${dayEvs.slice(0, 40).map(ev => {
            const dt = new Date(ev.timeMs);
            const hhmm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            const gradeStr = ev.grade != null ? ` (${fmtN(ev.grade)})` : '';
            return `<span class="gs-corr-day-detail-item"><span class="gs-corr-chip-dot" style="background:${ev.color};margin-right:4px;"></span><strong>${escapeHtml(ev.studentName)}</strong> · ${escapeHtml(ev.className)} ${escapeHtml(ev.badge)}${escapeHtml(gradeStr)} · ${escapeHtml(hhmm)}</span>`;
          }).join('')}
        </div>
      `;
      document.getElementById("gsCorrCloseDayDetailBtn")?.addEventListener("click", () => {
        _gsCorrState.selectedDay = null;
        box.classList.add("hidden");
        _scheduleDrawCorrectionTimeline();
      });
    }

    async function _saveCorrectionTimelineFile(filename, data, format) {
      if (window.Desktop && Desktop.isElectron()) {
        try {
          let targetName = filename;
          if (window.resolveExportFilenameConflict) {
            const conflictRes = await window.resolveExportFilenameConflict({ filename: targetName, target: 'toPrint' });
            if (!conflictRes || conflictRes.canceled) return;
            targetName = conflictRes.filename || targetName;
          }
          const res = (format === 'svg')
            ? await Desktop.saveText('toPrint', targetName, data)
            : await Desktop.saveBlob('toPrint', targetName, data);
          if (res && res.ok && res.path) {
            if (window.showExportSuccessPopup) {
              showExportSuccessPopup(res.path, res.name || targetName);
            } else if (typeof showToast === 'function') {
              showToast(t('gsToastExportSuccess') || 'Exported successfully');
            }
            return;
          }
        } catch (err) {
          console.error('Correction timeline export failed:', err);
        }
      }
      const blob = (data instanceof Blob) ? data : new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportCorrectionTimelinePng() {
      const canvas = document.getElementById("gsCorrCanvas");
      if (!canvas) return;
      const dateStr = (_gsCorrState.lastStats && _gsCorrState.lastStats.todayStr) || _gsToLocalYmd(new Date());
      canvas.toBlob(blob => {
        if (blob) _saveCorrectionTimelineFile(`Correction_Timeline_${dateStr}.png`, blob, 'png');
      }, 'image/png');
    }

    function exportCorrectionTimelineSvg() {
      const stats = _gsCorrState.lastStats;
      if (!stats) return;
      const days = _gsGetTimelineDayList(stats);
      const visibleEvents = stats.events.filter(ev => !_gsCorrState.hiddenClasses.has(ev.classId));
      const dayBuckets = days.map(ymd => {
        const dayEvs = visibleEvents.filter(ev => ev.localYmd === ymd);
        return { dateStr: ymd, count: dayEvs.length };
      });
      const w = 900, h = 260, padL = 44, padR = 24, padT = 26, padB = 34;
      const plotW = w - padL - padR, plotH = h - padT - padB, baseY = padT + plotH;
      const yMax = Math.max(2, Math.ceil(Math.max(1, ...dayBuckets.map(b => b.count)) * 1.18));
      const slotW = plotW / Math.max(1, dayBuckets.length);
      const barW = Math.max(6, Math.min(36, slotW * 0.66));
      const barsSvg = dayBuckets.map((b, idx) => {
        const cx = padL + idx * slotW + slotW / 2;
        const bx = cx - barW / 2;
        let rect = '';
        if (b.count > 0) {
          const bh = (b.count / yMax) * plotH;
          const by = baseY - bh;
          rect = `<rect x="${bx + 2}" y="${by + 2}" width="${barW}" height="${bh}" fill="#555555"/>` +
                 `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" fill="#5b8fcc" stroke="#333333" stroke-width="1.5"/>` +
                 `<text x="${cx}" y="${Math.max(14, by - 5)}" font-family="Lexend, sans-serif" font-size="10" font-weight="800" fill="#222222" text-anchor="middle">${b.count}</text>`;
        }
        const lbl = (idx % Math.max(1, Math.ceil(dayBuckets.length / 10)) === 0 || idx === dayBuckets.length - 1)
          ? `<text x="${cx}" y="${baseY + 16}" font-family="Lexend, sans-serif" font-size="10" fill="#666666" text-anchor="middle">${b.dateStr.slice(5)}</text>`
          : '';
        return rect + lbl;
      }).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect width="${w}" height="${h}" fill="#ffffff"/>
        <line x1="${padL}" y1="${baseY}" x2="${padL + plotW}" y2="${baseY}" stroke="#333333" stroke-width="1.5"/>
        ${barsSvg}
      </svg>`;
      _saveCorrectionTimelineFile(`Correction_Timeline_${stats.todayStr}.svg`, svg, 'svg');
    }


    // ════════════════════════════════════════════════════════════════

    let _cmpState = {
      selectedClassIds: [],
      scope: 'year',
      levelFilter: 'all',
      yearFilter: 'all',
      testIndex: 0,
      testMatchMode: 'index'
    };

    function renderNeobrutalistSvgPassFailBars({ items, title }) {
      const w = 500;
      const rowH = 28;
      const padT = 36;
      const padB = 16;
      const padL = 110;
      const padR = 75;
      const plotW = w - padL - padR;
      const h = padT + padB + Math.max(1, items.length) * rowH;

      if (!items || !items.length) {
        return `<svg viewBox="0 0 ${w} 50" width="100%" height="50" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;border-radius:6px;"><text x="14" y="30" font-size="11" font-weight="700" fill="#64748b">No data</text></svg>`;
      }

      let rows = '';
      items.forEach((it, idx) => {
        const y = padT + idx * rowH;
        const passW = Math.max(0, (it.passRate / 100) * plotW);
        const failW = Math.max(0, (it.failRate / 100) * plotW);
        const nameEsc = escapeHtml(it.name || '');

        rows += `
          <g>
            <text x="${padL - 8}" y="${y + 14}" font-size="11" font-weight="800" fill="#111" text-anchor="end">${nameEsc}</text>
            <!-- Pass Segment (Sage Green) -->
            ${passW > 0 ? `
              <rect x="${padL}" y="${y + 2}" width="${passW}" height="18" fill="#6abf8e" stroke="#333333" stroke-width="1.5" rx="2" />
              ${passW > 35 ? `<text x="${padL + passW / 2}" y="${y + 14}" font-size="9" font-weight="800" fill="#111" text-anchor="middle">${fmtN(it.passRate)}%</text>` : ''}
            ` : ''}
            <!-- Fail Segment (Rose Red) -->
            ${failW > 0 ? `
              <rect x="${padL + passW}" y="${y + 2}" width="${failW}" height="18" fill="#c96b6b" stroke="#333333" stroke-width="1.5" rx="2" />
              ${failW > 35 ? `<text x="${padL + passW + failW / 2}" y="${y + 14}" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle">${fmtN(it.failRate)}%</text>` : ''}
            ` : ''}
            <text x="${padL + plotW + 8}" y="${y + 14}" font-size="10" font-weight="700" fill="#64748b">${it.failCount} fail</text>
          </g>
        `;
      });

      return `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;border:2px solid #333333;border-radius:8px;box-shadow:2px 2px 0 #555555;font-family:'Lexend',system-ui,sans-serif;">
          <text x="${padL}" y="20" font-size="12" font-weight="900" fill="#111">${escapeHtml(title || 'Pass vs Below Passing Rate (%)')}</text>
          <g transform="translate(${w - 190}, 10)">
            <rect x="0" y="2" width="10" height="10" fill="#6abf8e" stroke="#333" stroke-width="1"/>
            <text x="14" y="11" font-size="9" font-weight="700" fill="#111">Pass (≥ 4.0)</text>
            <rect x="85" y="2" width="10" height="10" fill="#c96b6b" stroke="#333" stroke-width="1"/>
            <text x="99" y="11" font-size="9" font-weight="700" fill="#111">Fail (< 4.0)</text>
          </g>
          ${rows}
        </svg>
      `;
    }

    function openCompareClassesScreen() {
      if (!screens.compare) {
        screens.compare = document.getElementById("screen-compare");
      }
      if (!Array.isArray(appState.classes) || !appState.classes.length) {
        showToast((typeof t === 'function' ? t('gsCmpNeedMoreClasses') : null) || 'No classes available to compare.', true);
        return;
      }
      appState.classes.forEach(ensureClassStructures);

      // Populate filter dropdowns
      const levels = Array.from(new Set(appState.classes.map(c => c.level).filter(Boolean))).sort();
      const years = Array.from(new Set(appState.classes.map(c => c.year).filter(Boolean))).sort();

      const lvlSelect = document.getElementById("cmp-level-filter");
      if (lvlSelect) {
        lvlSelect.innerHTML = `<option value="all">${t('gsCmpFilterAllLevels') || 'All Levels'}</option>` +
          levels.map(l => `<option value="${escapeHtml(String(l))}">Level ${escapeHtml(String(l))}</option>`).join('');
        lvlSelect.value = _cmpState.levelFilter;
      }

      const yrSelect = document.getElementById("cmp-year-filter");
      if (yrSelect) {
        yrSelect.innerHTML = `<option value="all">${t('gsCmpFilterAllYears') || 'All Years'}</option>` +
          years.map(y => `<option value="${escapeHtml(String(y))}">${escapeHtml(String(y))}</option>`).join('');
        yrSelect.value = _cmpState.yearFilter;
      }

      // Initialize selection if empty
      if (!_cmpState.selectedClassIds || !_cmpState.selectedClassIds.length) {
        _cmpState.selectedClassIds = appState.classes.map(c => c.id);
      } else {
        const validIds = new Set(appState.classes.map(c => c.id));
        _cmpState.selectedClassIds = _cmpState.selectedClassIds.filter(id => validIds.has(id));
        if (!_cmpState.selectedClassIds.length) {
          _cmpState.selectedClassIds = appState.classes.map(c => c.id);
        }
      }

      renderCompareClasses();
      showScreen("compare");
    }

    function getCompareFilteredClasses() {
      return appState.classes.filter(c => {
        if (_cmpState.levelFilter !== 'all' && String(c.level) !== String(_cmpState.levelFilter)) return false;
        if (_cmpState.yearFilter !== 'all' && String(c.year) !== String(_cmpState.yearFilter)) return false;
        return true;
      });
    }

    function renderCompareClasses() {
      const filtered = getCompareFilteredClasses();
      const chipsEl = document.getElementById("cmp-class-chips");
      if (chipsEl) {
        chipsEl.innerHTML = "";
        filtered.forEach(c => {
          const isSel = _cmpState.selectedClassIds.includes(c.id);
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = `cmp-class-chip ${isSel ? 'active' : ''}`;
          chip.innerHTML = `
            <span>${escapeHtml(c.name)}</span>
            <span class="cmp-badge-count">${c.students ? c.students.length : 0}</span>
          `;
          chip.addEventListener("click", () => {
            if (_cmpState.selectedClassIds.includes(c.id)) {
              _cmpState.selectedClassIds = _cmpState.selectedClassIds.filter(id => id !== c.id);
            } else {
              _cmpState.selectedClassIds.push(c.id);
            }
            renderCompareClasses();
          });
          chipsEl.appendChild(chip);
        });
      }

      // Update scope navigation buttons
      document.querySelectorAll("#cmp-scope-nav .cmp-scope-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.scope === _cmpState.scope);
      });

      // Handle test alignment controls
      const testAlignWrap = document.getElementById("cmp-test-alignment-wrap");
      if (testAlignWrap) {
        testAlignWrap.classList.toggle("hidden", _cmpState.scope !== 'tests');
      }

      const selectedClasses = appState.classes.filter(c => _cmpState.selectedClassIds.includes(c.id));
      const kpiContainer = document.getElementById("cmp-kpi-container");
      const matrixContainer = document.getElementById("cmp-matrix-container");
      const chartsContainer = document.getElementById("cmp-charts-container");

      if (!selectedClasses.length) {
        if (kpiContainer) {
          kpiContainer.innerHTML = `<div class="cmp-empty-notice">${t('gsCmpNoClassesSelected') || 'Please select at least one class to compare.'}</div>`;
        }
        const topChipsCard = document.getElementById("cmp-top-chips-card");
        if (topChipsCard) topChipsCard.classList.add("hidden");
        if (matrixContainer) matrixContainer.innerHTML = "";
        if (chartsContainer) chartsContainer.innerHTML = "";
        return;
      }

      // Populate test selector if in tests scope
      if (_cmpState.scope === 'tests') {
        const testSelect = document.getElementById("cmp-test-select");
        if (testSelect) {
          const maxTests = Math.max(1, ...selectedClasses.map(c => ((c.testCounts && c.testCounts.sem1) || 0) + ((c.testCounts && c.testCounts.sem2) || 0)));
          testSelect.innerHTML = `<option value="timeline">${t('gsCmpAllTestsTimeline') || 'All Tests Timeline'}</option>` +
            Array.from({ length: maxTests }, (_, i) => `<option value="${i}">Test ${i + 1}</option>`).join('');
          testSelect.value = String(_cmpState.testIndex);
        }
      }

      // Compute data per class
      const classDataList = selectedClasses.map(classObj => {
        ensureClassStructures(classObj);
        let validScores = [];
        let s1Scores = [];
        let s2Scores = [];

        classObj.students.forEach(st => {
          const comp = computeStudent(st, classObj);
          if (comp.sem1Avg != null) s1Scores.push(comp.sem1Avg);
          if (comp.sem2Avg != null) s2Scores.push(comp.sem2Avg);

          if (_cmpState.scope === 'year') {
            if (comp.yearAvg != null) validScores.push(comp.yearAvg);
          } else if (_cmpState.scope === 'sem1') {
            if (comp.sem1Avg != null) validScores.push(comp.sem1Avg);
          } else if (_cmpState.scope === 'sem2') {
            if (comp.sem2Avg != null) validScores.push(comp.sem2Avg);
          } else if (_cmpState.scope === 'dist') {
            if (comp.yearAvg != null) validScores.push(comp.yearAvg);
            else if (comp.sem1Avg != null) validScores.push(comp.sem1Avg);
          } else if (_cmpState.scope === 'tests') {
            if (_cmpState.testIndex === 'timeline') {
              if (comp.yearAvg != null) validScores.push(comp.yearAvg);
            } else {
              const tIdx = Number(_cmpState.testIndex) || 0;
              const n1 = (classObj.testCounts && classObj.testCounts.sem1) || 0;
              const n2 = (classObj.testCounts && classObj.testCounts.sem2) || 0;
              if (tIdx < (n1 + n2)) {
                const sem = tIdx < n1 ? 'sem1' : 'sem2';
                const localIdx = tIdx < n1 ? tIdx : tIdx - n1;
                const grade = getTestDisplayGrade(st, classObj, sem, localIdx);
                if (grade != null) validScores.push(grade);
              }
            }
          }
        });

        const stats = calcComprehensiveStats(validScores);
        const s1Mean = s1Scores.length ? (s1Scores.reduce((a, b) => a + b, 0) / s1Scores.length) : null;
        const s2Mean = s2Scores.length ? (s2Scores.reduce((a, b) => a + b, 0) / s2Scores.length) : null;
        const deltaSem = (s1Mean != null && s2Mean != null) ? (s2Mean - s1Mean) : null;

        return {
          classObj,
          scores: validScores,
          stats,
          s1Mean,
          s2Mean,
          deltaSem
        };
      });

      // Pooled cohort stats
      const allCohortScores = classDataList.flatMap(cd => cd.scores);
      const cohortStats = calcComprehensiveStats(allCohortScores);

      // Render Section 1: KPI Cards
      renderCompareKpiCards(classDataList, cohortStats, kpiContainer);

      // Render Top 10 Observation Chips Card
      renderCompareTopChips(selectedClasses);

      // Render Section 2: Matrix Table
      renderCompareMatrixTable(classDataList, cohortStats, matrixContainer);

      // Render Section 3: Visual Analytics
      renderCompareChartsView(classDataList, cohortStats, chartsContainer);
    }

    function renderCompareKpiCards(classDataList, cohortStats, container) {
      if (!container) return;
      container.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "cmp-kpi-grid";

      // 1. Cohort Benchmark Card
      const cohortCard = document.createElement("div");
      cohortCard.className = "cmp-kpi-card cohort-card";
      const cohortColor = cohortStats.mean != null ? getScaleGradeColor(cohortStats.mean) : '#f1f5f9';
      cohortCard.innerHTML = `
        <div class="cmp-kpi-header">
          <div>
            <h3 class="cmp-kpi-title">${t('gsCmpCohortAverage') || 'Cohort Benchmark (Combined)'}</h3>
            <div class="cmp-kpi-meta">${cohortStats.count} students · ${classDataList.length} classes</div>
          </div>
          <span class="cmp-kpi-delta neutral">Benchmark</span>
        </div>
        <div class="cmp-kpi-main-stat">
          <span class="cmp-kpi-mean-label">${t('gsCmpMean') || 'Cohort Mean'}:</span>
          <span class="cmp-kpi-mean-val" style="background:${cohortColor || '#f1f5f9'};color:${getNotchContrastTextColor(cohortColor)};">${fmt(cohortStats.mean)}</span>
        </div>
        <div class="cmp-kpi-metrics-row">
          <div class="cmp-kpi-sub-metric">
            <span class="cmp-kpi-sub-label">${t('gsCmpMedian') || 'Median'}</span>
            <span class="cmp-kpi-sub-val">${fmt(cohortStats.median)}</span>
          </div>
          <div class="cmp-kpi-sub-metric fail-box">
            <span class="cmp-kpi-sub-label">${t('gsCmpBelowPassing') || 'Below 4.0'}</span>
            <span class="cmp-kpi-sub-val">${cohortStats.failCount} (${fmtN(cohortStats.failRate)}%)</span>
          </div>
          <div class="cmp-kpi-sub-metric pass-box">
            <span class="cmp-kpi-sub-label">${t('gsCmpPassingRate') || 'Pass (≥ 4.0)'}</span>
            <span class="cmp-kpi-sub-val">${cohortStats.passCount} (${fmtN(cohortStats.passRate)}%)</span>
          </div>
          <div class="cmp-kpi-sub-metric">
            <span class="cmp-kpi-sub-label">${t('gsCmpDistinction') || 'Distinction'}</span>
            <span class="cmp-kpi-sub-val">${cohortStats.distinctionCount} (${fmtN(cohortStats.distinctionRate)}%)</span>
          </div>
        </div>
        <div style="font-size:0.75rem;color:#64748b;font-weight:700;display:flex;justify-content:space-between;padding-top:4px;border-top:1px dashed #ccc;">
          <span>σ = ${fmt(cohortStats.stdDev)}</span>
          <span>Range: ${fmt(cohortStats.min)} – ${fmt(cohortStats.max)}</span>
        </div>
      `;
      grid.appendChild(cohortCard);

      // 2. Individual Class Cards
      classDataList.forEach(cd => {
        const card = document.createElement("div");
        card.className = "cmp-kpi-card";
        const cMean = cd.stats.mean;
        const delta = (cMean != null && cohortStats.mean != null) ? (cMean - cohortStats.mean) : null;
        const deltaSign = delta != null ? (delta > 0 ? `+${fmt(delta)}` : fmt(delta)) : "—";
        const deltaClass = delta == null ? "neutral" : (delta >= 0.05 ? "pos" : (delta <= -0.05 ? "neg" : "neutral"));
        const meanColor = cMean != null ? getScaleGradeColor(cMean) : '#f1f5f9';

        let progHtml = '';
        if (_cmpState.scope === 'year' && cd.deltaSem != null) {
          const progSign = cd.deltaSem > 0 ? `+${fmt(cd.deltaSem)}` : fmt(cd.deltaSem);
          const progClass = cd.deltaSem >= 0 ? 'pos' : 'neg';
          progHtml = `<span class="cmp-kpi-delta ${progClass}" title="S1 → S2 progression">Δ ${progSign}</span>`;
        }

        card.innerHTML = `
          <div class="cmp-kpi-header">
            <div>
              <h3 class="cmp-kpi-title">${escapeHtml(cd.classObj.name)}</h3>
              <div class="cmp-kpi-meta">${cd.stats.count} students${cd.classObj.year ? ` · ${escapeHtml(cd.classObj.year)}` : ''}${cd.classObj.level ? ` · Lvl ${escapeHtml(String(cd.classObj.level))}` : ''}</div>
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${progHtml}
              <span class="cmp-kpi-delta ${deltaClass}" title="Delta vs cohort mean">${deltaSign}</span>
            </div>
          </div>
          <div class="cmp-kpi-main-stat">
            <span class="cmp-kpi-mean-label">${t('gsCmpMean') || 'Class Mean'}:</span>
            <span class="cmp-kpi-mean-val" style="background:${meanColor || '#f1f5f9'};color:${getNotchContrastTextColor(meanColor)};">${fmt(cMean)}</span>
          </div>
          <div class="cmp-kpi-metrics-row">
            <div class="cmp-kpi-sub-metric">
              <span class="cmp-kpi-sub-label">${t('gsCmpMedian') || 'Median'}</span>
              <span class="cmp-kpi-sub-val">${fmt(cd.stats.median)}</span>
            </div>
            <div class="cmp-kpi-sub-metric fail-box">
              <span class="cmp-kpi-sub-label">${t('gsCmpBelowPassing') || 'Below 4.0'}</span>
              <span class="cmp-kpi-sub-val">${cd.stats.failCount} (${fmtN(cd.stats.failRate)}%)</span>
            </div>
            <div class="cmp-kpi-sub-metric pass-box">
              <span class="cmp-kpi-sub-label">${t('gsCmpPassingRate') || 'Pass (≥ 4.0)'}</span>
              <span class="cmp-kpi-sub-val">${cd.stats.passCount} (${fmtN(cd.stats.passRate)}%)</span>
            </div>
            <div class="cmp-kpi-sub-metric">
              <span class="cmp-kpi-sub-label">${t('gsCmpDistinction') || 'Distinction'}</span>
              <span class="cmp-kpi-sub-val">${cd.stats.distinctionCount} (${fmtN(cd.stats.distinctionRate)}%)</span>
            </div>
          </div>
          <div style="font-size:0.75rem;color:#64748b;font-weight:700;display:flex;justify-content:space-between;padding-top:4px;border-top:1px dashed #ccc;">
            <span>σ = ${fmt(cd.stats.stdDev)}</span>
            <span>Range: ${fmt(cd.stats.min)} – ${fmt(cd.stats.max)}</span>
          </div>
        `;
        grid.appendChild(card);
      });

      container.appendChild(grid);
    }

    function renderCompareMatrixTable(classDataList, cohortStats, container) {
      if (!container) return;
      container.innerHTML = "";

      const card = document.createElement("div");
      card.className = "cmp-matrix-card";

      const title = document.createElement("div");
      title.className = "cmp-matrix-head";
      title.innerHTML = `<h3 class="cmp-matrix-title">Side-by-Side Performance Matrix (${_cmpState.scope.toUpperCase()})</h3>`;
      card.appendChild(title);

      const tableWrap = document.createElement("div");
      tableWrap.className = "cmp-table-wrap";

      const table = document.createElement("table");
      table.className = "cmp-table";

      // Headers: Metric, Cohort Benchmark, Class 1, Class 2...
      const thead = document.createElement("thead");
      const hRow = document.createElement("tr");
      hRow.innerHTML = `<th>Metric</th><th>${t('gsCmpCohortAverage') || 'Cohort Benchmark'}</th>` +
        classDataList.map(cd => `<th>${escapeHtml(cd.classObj.name)}</th>`).join('');
      thead.appendChild(hRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      const rowsDef = [
        { label: "Students Evaluated", fn: cd => cd.stats.count, cohortVal: cohortStats.count },
        { label: "Class Mean", fn: cd => cd.stats.mean != null ? `<span style="background:${getScaleGradeColor(cd.stats.mean)};color:${getNotchContrastTextColor(getScaleGradeColor(cd.stats.mean))};padding:2px 6px;border-radius:4px;font-weight:800;">${fmt(cd.stats.mean)}</span>` : "—", cohortVal: cohortStats.mean != null ? `<span style="background:${getScaleGradeColor(cohortStats.mean)};color:${getNotchContrastTextColor(getScaleGradeColor(cohortStats.mean))};padding:2px 6px;border-radius:4px;font-weight:800;">${fmt(cohortStats.mean)}</span>` : "—" },
        { label: "Median Grade", fn: cd => fmt(cd.stats.median), cohortVal: fmt(cohortStats.median) },
        { label: "Below Passing (< 4.0)", fn: cd => `<span class="cmp-badge-fail">${cd.stats.failCount} (${fmtN(cd.stats.failRate)}%)</span>`, cohortVal: `<span class="cmp-badge-fail">${cohortStats.failCount} (${fmtN(cohortStats.failRate)}%)</span>` },
        { label: "Passing Rate (≥ 4.0)", fn: cd => `<span class="cmp-badge-pass">${cd.stats.passCount} (${fmtN(cd.stats.passRate)}%)</span>`, cohortVal: `<span class="cmp-badge-pass">${cohortStats.passCount} (${fmtN(cohortStats.passRate)}%)</span>` },
        { label: "Distinction (≥ 5.5)", fn: cd => `${cd.stats.distinctionCount} (${fmtN(cd.stats.distinctionRate)}%)`, cohortVal: `${cohortStats.distinctionCount} (${fmtN(cohortStats.distinctionRate)}%)` },
        { label: "Minimum Grade", fn: cd => fmt(cd.stats.min), cohortVal: fmt(cohortStats.min) },
        { label: "Maximum Grade", fn: cd => fmt(cd.stats.max), cohortVal: fmt(cohortStats.max) },
        { label: "Standard Deviation (σ)", fn: cd => fmt(cd.stats.stdDev), cohortVal: fmt(cohortStats.stdDev) },
        { label: "Interquartile Range (IQR)", fn: cd => fmt(cd.stats.iqr), cohortVal: fmt(cohortStats.iqr) }
      ];

      if (_cmpState.scope === 'year') {
        rowsDef.push(
          { label: "Semester 1 Mean", fn: cd => fmt(cd.s1Mean), cohortVal: "—" },
          { label: "Semester 2 Mean", fn: cd => fmt(cd.s2Mean), cohortVal: "—" },
          { label: "S1 → S2 Progression (Δ)", fn: cd => cd.deltaSem != null ? (cd.deltaSem >= 0 ? `+${fmt(cd.deltaSem)}` : fmt(cd.deltaSem)) : "—", cohortVal: "—" }
        );
      }

      rowsDef.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td style="font-weight:800;background:#fafaf7;">${r.label}</td><td>${r.cohortVal}</td>` +
          classDataList.map(cd => `<td>${r.fn(cd)}</td>`).join('');
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
      card.appendChild(tableWrap);
      container.appendChild(card);
    }

    function renderCompareChartsView(classDataList, cohortStats, container) {
      if (!container) return;
      container.innerHTML = "";

      const chartsGrid = document.createElement("div");
      chartsGrid.className = "cmp-charts-grid";

      // 1. Pass vs Below Passing Stacked Bar Chart
      const passFailCard = document.createElement("div");
      passFailCard.className = "cmp-chart-box";
      const passFailItems = [
        { name: "COHORT", passRate: cohortStats.passRate, failRate: cohortStats.failRate, failCount: cohortStats.failCount },
        ...classDataList.map(cd => ({
          name: cd.classObj.name,
          passRate: cd.stats.passRate,
          failRate: cd.stats.failRate,
          failCount: cd.stats.failCount
        }))
      ];
      passFailCard.innerHTML = renderNeobrutalistSvgPassFailBars({
        items: passFailItems,
        title: t('gsCmpChartPassFailTitle') || 'Pass vs Below Passing Distribution (%)'
      });
      chartsGrid.appendChild(passFailCard);

      // 2. Grade Distribution Histogram
      const histCard = document.createElement("div");
      histCard.className = "cmp-chart-box";
      const allScores = classDataList.flatMap(cd => cd.scores);
      const buckets = calcGradeBuckets(allScores);
      histCard.innerHTML = renderNeobrutalistSvgHistogram({
        buckets,
        title: `Grade Distribution (Combined Cohort)`
      });
      chartsGrid.appendChild(histCard);

      // 3. Multi-Class Progression Timeline (if 2+ classes or tests)
      const timelineCard = document.createElement("div");
      timelineCard.className = "cmp-chart-box";

      // Construct test categories and series
      const maxTests = Math.max(1, ...classDataList.map(cd => ((cd.classObj.testCounts && cd.classObj.testCounts.sem1) || 0) + ((cd.classObj.testCounts && cd.classObj.testCounts.sem2) || 0)));
      const categories = Array.from({ length: maxTests }, (_, i) => `T${i + 1}`);
      const colors = ["#222222", "#5b8fcc", "#e2c96e", "#6abf8e", "#8b7cc2", "#d97fa8", "#d4895a"];

      const series = classDataList.map((cd, idx) => {
        const testMeans = [];
        const n1 = (cd.classObj.testCounts && cd.classObj.testCounts.sem1) || 0;
        const n2 = (cd.classObj.testCounts && cd.classObj.testCounts.sem2) || 0;
        for (let i = 0; i < maxTests; i++) {
          if (i >= (n1 + n2)) {
            testMeans.push(null);
            continue;
          }
          const sem = i < n1 ? 'sem1' : 'sem2';
          const localIdx = i < n1 ? i : i - n1;
          const grades = cd.classObj.students.map(st => getTestDisplayGrade(st, cd.classObj, sem, localIdx)).filter(v => v != null);
          testMeans.push(grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null);
        }
        return {
          name: cd.classObj.name,
          data: testMeans,
          color: colors[idx % colors.length],
          strokeWidth: 3
        };
      });

      timelineCard.innerHTML = renderNeobrutalistSvgTimeline({
        series,
        categories: categories.length ? categories : ["No Tests"],
        title: t('gsCmpChartTimelineTitle') || 'Class Mean Progression Timeline'
      });
      chartsGrid.appendChild(timelineCard);

      // 4. Quartile Box Plot for Cohort
      const quartileCard = document.createElement("div");
      quartileCard.className = "cmp-chart-box";
      quartileCard.innerHTML = renderNeobrutalistSvgQuartileBox({
        min: cohortStats.min,
        q1: cohortStats.q1,
        median: cohortStats.median,
        q3: cohortStats.q3,
        max: cohortStats.max,
        title: `Quartiles & Extremes (Combined Cohort)`
      });
      chartsGrid.appendChild(quartileCard);

      container.appendChild(chartsGrid);
    }

    function buildCompareClassesReportHtml() {
      const selectedClasses = appState.classes.filter(c => _cmpState.selectedClassIds.includes(c.id));
      if (!selectedClasses.length) return `<p>${t('gsCmpNoClassesSelected')}</p>`;

      const kpiClone = document.getElementById("cmp-kpi-container") ? document.getElementById("cmp-kpi-container").innerHTML : '';
      const matrixClone = document.getElementById("cmp-matrix-container") ? document.getElementById("cmp-matrix-container").innerHTML : '';
      const chartsClone = document.getElementById("cmp-charts-container") ? document.getElementById("cmp-charts-container").innerHTML : '';

      const cohortTopChips = getCohortTopObservationChips(selectedClasses, { limit: 10 });
      const totalCohortStudents = selectedClasses.reduce((acc, c) => acc + (Array.isArray(c.students) ? c.students.length : 0), 0);
      const topChipsHtml = renderCompareTopChipsReportSection(cohortTopChips, totalCohortStudents, selectedClasses);

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Class Comparison Report</title>
  <style>
    body { font-family: 'Lexend', system-ui, sans-serif; margin: 20px; color: #111; background: #fff; }
    h1 { font-size: 1.5rem; font-weight: 900; margin-bottom: 4px; }
    .report-sub { font-size: 0.85rem; color: #64748b; margin-bottom: 16px; }
    .cmp-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .cmp-kpi-card { border: 2px solid #333; border-radius: 8px; padding: 12px; background: #fff; }
    .cmp-kpi-card.cohort-card { background: #fafaf7; border-style: dashed; }
    .cmp-kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .cmp-kpi-title { font-size: 0.95rem; font-weight: 800; margin: 0; }
    .cmp-kpi-delta { font-size: 0.72rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #333; }
    .cmp-kpi-delta.pos { background: #d4edda; color: #155724; }
    .cmp-kpi-delta.neg { background: #ffd1d1; color: #721c24; }
    .cmp-kpi-delta.neutral { background: #e2e8f0; color: #334155; }
    .cmp-kpi-main-stat { display: flex; justify-content: space-between; align-items: baseline; padding: 6px; background: #f8fafc; border: 1px solid #333; border-radius: 4px; margin-bottom: 8px; }
    .cmp-kpi-mean-val { font-size: 1.3rem; font-weight: 900; padding: 1px 6px; border-radius: 4px; border: 1px solid #333; }
    .cmp-kpi-metrics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .cmp-kpi-sub-metric { padding: 4px 6px; border: 1px solid #333; border-radius: 4px; font-size: 0.75rem; }
    .cmp-kpi-sub-metric.fail-box { background: #fff5f5; border-color: #c96b6b; color: #b91c1c; }
    .cmp-kpi-sub-metric.pass-box { background: #f0fdf4; border-color: #6abf8e; color: #166534; }
    .cmp-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 14px; }
    .cmp-table th, .cmp-table td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
    .cmp-table th { background: #111; color: #fff; font-weight: 800; }
    .cmp-badge-fail { background: #ffd1d1; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-weight: 800; }
    .cmp-badge-pass { background: #d4edda; color: #166534; padding: 1px 4px; border-radius: 3px; font-weight: 800; }
    .cmp-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; page-break-inside: avoid; }
    .cmp-chart-box { border: 1.5px solid #333; border-radius: 6px; padding: 10px; }
    .cmp-report-chips-section { border: 2px solid #333; border-radius: 8px; padding: 12px; background: #fff; margin-top: 14px; margin-bottom: 14px; }
  </style>
</head>
<body>
  <h1>Class Comparison Report</h1>
  <div class="report-sub">Scope: ${_cmpState.scope.toUpperCase()} · Generated: ${new Date().toLocaleDateString()}</div>
  ${kpiClone}
  ${topChipsHtml}
  ${matrixClone}
  ${chartsClone}
</body>
</html>`;
    }

    function exportComparePdf() {
      const html = buildCompareClassesReportHtml();
      openReportModal(html, "Class Comparison Report", `class-comparison-${_cmpState.scope}`, {
        isLandscape: true,
        reportType: 'class-comparison',
        rebuild: () => buildCompareClassesReportHtml()
      });
    }

    async function exportCompareHtml() {
      const filename = `class-comparison-${_cmpState.scope}-${new Date().toISOString().slice(0, 10)}.html`;
      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename,
          toolKey: 'gradeSheet',
          mimeType: 'text/html;charset=utf-8',
          allowDocEditor: true,
          filters: [{ name: 'HTML Files', extensions: ['html'] }, { name: 'All Files', extensions: ['*'] }],
          buildContent: async () => {
            let html = buildCompareClassesReportHtml();
            if (window.ExportStylesService) {
              const sId = ExportStylesService.getSelectedStyle('gradeSheet');
              html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
            }
            return html;
          }
        });
      }
      let html = buildCompareClassesReportHtml();
      if (window.ExportStylesService) {
        const sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
      }
      downloadTextFile(html, filename, "text/html;charset=utf-8");
    }

    function exportCompareXlsx() {
      if (typeof XLSX === 'undefined') {
        showToast('XLSX export library unavailable', true);
        return;
      }
      const selectedClasses = appState.classes.filter(c => _cmpState.selectedClassIds.includes(c.id));
      if (!selectedClasses.length) return;

      const wb = XLSX.utils.book_new();

      // Sheet 1: Side by Side Matrix
      const matrixRows = [
        ["Class Comparison Matrix", `Scope: ${_cmpState.scope.toUpperCase()}`],
        ["Metric", ...selectedClasses.map(c => c.name)]
      ];

      function getCompareScopeStudentScore(st, c) {
        if (_cmpState.scope === 'tests') {
          if (_cmpState.testIndex === 'timeline') {
            return computeStudent(st, c).yearAvg;
          }
          const tIdx = Number(_cmpState.testIndex) || 0;
          const n1 = (c.testCounts && c.testCounts.sem1) || 0;
          const n2 = (c.testCounts && c.testCounts.sem2) || 0;
          if (tIdx >= (n1 + n2)) return null;
          const sem = tIdx < n1 ? 'sem1' : 'sem2';
          const localIdx = tIdx < n1 ? tIdx : tIdx - n1;
          return getTestDisplayGrade(st, c, sem, localIdx);
        }
        const comp = computeStudent(st, c);
        if (_cmpState.scope === 'sem1') return comp.sem1Avg;
        if (_cmpState.scope === 'sem2') return comp.sem2Avg;
        return comp.yearAvg;
      }

      const metricsList = [
        { label: "Students Count", fn: c => c.students ? c.students.length : 0 },
        { label: "Class Mean", fn: c => {
          const scores = c.students.map(st => getCompareScopeStudentScore(st, c)).filter(v => v != null);
          return scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : "-";
        }},
        { label: "Median Grade", fn: c => {
          const scores = c.students.map(st => getCompareScopeStudentScore(st, c)).filter(v => v != null);
          return scores.length ? Number(calcComprehensiveStats(scores).median.toFixed(2)) : "-";
        }},
        { label: "Below Passing Rate (< 4.0 %)", fn: c => {
          const scores = c.students.map(st => getCompareScopeStudentScore(st, c)).filter(v => v != null);
          return scores.length ? Number(calcComprehensiveStats(scores).failRate.toFixed(1)) : "-";
        }},
        { label: "Passing Rate (≥ 4.0 %)", fn: c => {
          const scores = c.students.map(st => getCompareScopeStudentScore(st, c)).filter(v => v != null);
          return scores.length ? Number(calcComprehensiveStats(scores).passRate.toFixed(1)) : "-";
        }},
        { label: "Distinction Rate (≥ 5.5 %)", fn: c => {
          const scores = c.students.map(st => getCompareScopeStudentScore(st, c)).filter(v => v != null);
          return scores.length ? Number(calcComprehensiveStats(scores).distinctionRate.toFixed(1)) : "-";
        }},
        { label: "Standard Deviation (σ)", fn: c => {
          const scores = c.students.map(st => getCompareScopeStudentScore(st, c)).filter(v => v != null);
          return scores.length ? Number(calcComprehensiveStats(scores).stdDev.toFixed(2)) : "-";
        }}
      ];

      metricsList.forEach(m => {
        matrixRows.push([m.label, ...selectedClasses.map(c => m.fn(c))]);
      });

      // Append Top 10 Most Frequent Observation Chips (Cohort) to Overview Matrix
      const cohortTopChips = getCohortTopObservationChips(selectedClasses, { limit: 10 });
      const totalCohortStudents = selectedClasses.reduce((acc, c) => acc + (Array.isArray(c.students) ? c.students.length : 0), 0);

      matrixRows.push([]);
      matrixRows.push([]);
      matrixRows.push([
        "TOP 10 MOST FREQUENT OBSERVATION CHIPS (COHORT)",
        `Scope: ${_cmpState.scope.toUpperCase()}`,
        `Total Cohort Students: ${totalCohortStudents}`
      ]);
      matrixRows.push([
        "Rank",
        "Observation Chip",
        "Category",
        "Total Uses",
        "Cohort Students",
        "% of Cohort",
        ...selectedClasses.map(c => `${c.name} Uses`)
      ]);

      if (cohortTopChips.length === 0) {
        matrixRows.push(["-", "No observation chips recorded", "-", "-", "-", "-", ...selectedClasses.map(() => "-")]);
      } else {
        cohortTopChips.forEach((chip, idx) => {
          const classCounts = selectedClasses.map(c => {
            const matched = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
            return (matched && matched.occurrences > 0) ? matched.occurrences : 0;
          });
          matrixRows.push([
            idx + 1,
            chip.name,
            chip.category || "-",
            chip.occurrences,
            chip.studentCount,
            `${chip.percentage}%`,
            ...classCounts
          ]);
        });
      }

      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
      XLSX.utils.book_append_sheet(wb, wsMatrix, "Overview Matrix");

      // Sheet 2: Dedicated Observation Chips Sheet with Uses and Students breakdown
      const chipRows = [
        ["Top 10 Most Frequent Observation Chips (Cohort Comparison)"],
        [`Scope: ${_cmpState.scope.toUpperCase()}`, `Total Cohort Students: ${totalCohortStudents}`],
        [],
        [
          "Rank",
          "Observation Chip",
          "Category",
          "Total Uses",
          "Cohort Students",
          "% of Cohort",
          ...selectedClasses.map(c => `${c.name} Uses`),
          ...selectedClasses.map(c => `${c.name} Students`)
        ]
      ];
      if (cohortTopChips.length === 0) {
        chipRows.push(["-", "No observation chips recorded", "-", "-", "-", "-", ...selectedClasses.map(() => "-"), ...selectedClasses.map(() => "-")]);
      } else {
        cohortTopChips.forEach((chip, idx) => {
          const classUses = selectedClasses.map(c => {
            const m = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
            return (m && m.occurrences > 0) ? m.occurrences : 0;
          });
          const classSt = selectedClasses.map(c => {
            const m = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
            return (m && m.studentCount > 0) ? m.studentCount : 0;
          });
          chipRows.push([
            idx + 1,
            chip.name,
            chip.category || "-",
            chip.occurrences,
            chip.studentCount,
            `${chip.percentage}%`,
            ...classUses,
            ...classSt
          ]);
        });
      }
      if (Array.isArray(cohortTopChips.sections) && cohortTopChips.sections.length > 0) {
        cohortTopChips.sections.forEach(sec => {
          const sChips = sec.topChips || [];
          if (!sChips.length) return;
          chipRows.push([]);
          chipRows.push([`${sec.name} (Top 5)`]);
          chipRows.push([
            "Rank",
            "Observation Chip",
            "Category",
            "Total Uses",
            "Cohort Students",
            "% of Cohort",
            ...selectedClasses.map(c => `${c.name} Uses`),
            ...selectedClasses.map(c => `${c.name} Students`)
          ]);
          sChips.forEach((chip, idx) => {
            const classUses = selectedClasses.map(c => {
              const m = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
              return (m && m.occurrences > 0) ? m.occurrences : 0;
            });
            const classSt = selectedClasses.map(c => {
              const m = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
              return (m && m.studentCount > 0) ? m.studentCount : 0;
            });
            chipRows.push([
              idx + 1,
              chip.name,
              chip.category || "-",
              chip.occurrences,
              chip.studentCount,
              `${chip.percentage}%`,
              ...classUses,
              ...classSt
            ]);
          });
        });
      }
      const wsChips = XLSX.utils.aoa_to_sheet(chipRows);
      XLSX.utils.book_append_sheet(wb, wsChips, "Observation Chips");

      // Sheet 2: Student Level Scores
      selectedClasses.forEach(c => {
        const sRows = [
          [`Class: ${c.name}`, `Level: ${c.level || '-'}`, `Year: ${c.year || '-'}`],
          ["Index", "First Name", "Last Name", "Sem 1 Avg", "Sem 2 Avg", "Year Avg", "Rounded Final"]
        ];
        c.students.forEach(st => {
          const comp = computeStudent(st, c);
          sRows.push([
            st.index || "-",
            st.firstName || "",
            st.lastName || "",
            comp.sem1Avg != null ? Number(comp.sem1Avg.toFixed(1)) : "-",
            comp.sem2Avg != null ? Number(comp.sem2Avg.toFixed(1)) : "-",
            comp.yearAvg != null ? Number(comp.yearAvg.toFixed(1)) : "-",
            comp.roundedFinal != null ? Number(comp.roundedFinal.toFixed(1)) : "-"
          ]);
        });
        const wsClass = XLSX.utils.aoa_to_sheet(sRows);
        const sheetName = slugifyForPath(c.name).slice(0, 28) || "Class";
        XLSX.utils.book_append_sheet(wb, wsClass, sheetName);
      });

      try {
        const isOds = format === 'ods';
        const wbout = XLSX.write(wb, { bookType: isOds ? 'ods' : 'xlsx', type: 'array' });
        const ext = isOds ? 'ods' : 'xlsx';
        const mime = isOds ? 'application/vnd.oasis.opendocument.spreadsheet' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const fname = `class-comparison-${_cmpState.scope}-${new Date().toISOString().slice(0, 10)}.${ext}`;
        downloadBinaryFile(wbout, fname, mime);
      } catch (err) {
        showToast('Failed to generate spreadsheet: ' + err.message, true);
      }
    }

    function exportCompareOds() {
      return exportCompareXlsx('ods');
    }

    window.openCompareClassesScreen = openCompareClassesScreen;

