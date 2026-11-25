    const GS_CHIP_CLAMP_MODE_KEY = 'gs_chip_clamp_mode';
    const GS_CHIP_CLAMP_CUSTOM_KEY = 'gs_chip_clamp_custom_px';
    const GS_CHIP_SHOW_ABBR_KEY = 'gs_chip_show_abbr';

    function isChipAbbrEnabled() {
      try {
        return localStorage.getItem(GS_CHIP_SHOW_ABBR_KEY) !== 'false';
      } catch (_) {
        return true;
      }
    }

    function setChipAbbrEnabled(enabled) {
      const val = Boolean(enabled);
      try {
        localStorage.setItem(GS_CHIP_SHOW_ABBR_KEY, val ? 'true' : 'false');
      } catch (_) {}
      return val;
    }

    function resolveChipDisplayLabel(fullName, bankFilename) {
      if (isChipAbbrEnabled() && typeof getObservationChipAbbreviation === 'function') {
        const abbr = getObservationChipAbbreviation(fullName, bankFilename);
        if (abbr) return abbr;
      }
      return fullName;
    }

    function createChipAbbrToggleControl(targetContainer) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gs-chip-abbr-toggle';
      btn.dataset.hoverHelp = t('gsChipAbbrTooltip', 'Show chip abbreviations instead of full names (exports always use full names)');

      const syncBtn = () => {
        const on = isChipAbbrEnabled();
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = t('gsChipAbbrToggle', 'Abbr');
      };

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setChipAbbrEnabled(!isChipAbbrEnabled());
        syncBtn();
        if (targetContainer) {
          targetContainer.querySelectorAll('.note-checklist-chip').forEach(chipEl => {
            if (typeof chipEl._updateDisplayLabel === 'function') {
              chipEl._updateDisplayLabel();
            }
          });
        }
      });

      syncBtn();
      return btn;
    }

    function sanitizeChipClampPx(val, fallback = 120) {
      const n = parseInt(val, 10);
      if (isNaN(n)) return fallback;
      return Math.max(40, Math.min(400, n));
    }

    function getChipClampState() {
      let mode = 'none';
      let customPx = 120;
      try {
        const storedMode = localStorage.getItem(GS_CHIP_CLAMP_MODE_KEY);
        if (storedMode === 'none' || storedMode === 'compact' || storedMode === 'tight' || storedMode === 'custom') {
          mode = storedMode;
        }
        customPx = sanitizeChipClampPx(localStorage.getItem(GS_CHIP_CLAMP_CUSTOM_KEY), 120);
      } catch (_) {}
      return { mode, customPx };
    }

    function setChipClampState(mode, customPx) {
      const safePx = sanitizeChipClampPx(customPx, 120);
      try {
        localStorage.setItem(GS_CHIP_CLAMP_MODE_KEY, mode);
        localStorage.setItem(GS_CHIP_CLAMP_CUSTOM_KEY, String(safePx));
      } catch (_) {}
      return { mode, customPx: safePx };
    }

    function resolveChipClampMaxWidth(mode, customPx) {
      if (mode === 'compact') return '140px';
      if (mode === 'tight') return '95px';
      if (mode === 'custom') return `${sanitizeChipClampPx(customPx, 120)}px`;
      return 'none';
    }

    function applyChipClampToContainer(container, state) {
      if (!container) return;
      const st = state || getChipClampState();
      container.style.setProperty('--gs-chip-max-width', resolveChipClampMaxWidth(st.mode, st.customPx));
    }

    /**
     * Build the Light Neobrutalist button + popover for clamping observation chip width.
     * Mutates `--gs-chip-max-width` in-place on `targetContainer` without rebuilding the DOM.
     */
    function createChipClampControl(targetContainer) {
      const wrap = document.createElement('div');
      wrap.className = 'gs-chip-clamp-wrap';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gs-chip-clamp-btn';
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.dataset.hoverHelp = t('gsChipClampTooltip', 'Clamp observation chip width for a cleaner layout');
      btn.innerHTML = `<img src="../assets/icons/fit-text.svg" class="btn-icon" alt="" /> <span class="gs-chip-clamp-btn-label"></span>`;

      const popover = document.createElement('div');
      popover.className = 'gs-chip-clamp-popover hidden';
      popover.setAttribute('role', 'menu');

      const presets = [
        { mode: 'none', labelKey: 'gsChipClampFull', fallback: 'Full (Unclamped)', badge: '' },
        { mode: 'compact', labelKey: 'gsChipClampCompact', fallback: 'Compact (140px)', badge: '140px' },
        { mode: 'tight', labelKey: 'gsChipClampTight', fallback: 'Tight (95px)', badge: '95px' }
      ];

      const optionBtns = new Map();
      presets.forEach(p => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'gs-chip-clamp-option';
        opt.setAttribute('role', 'menuitemradio');
        opt.textContent = t(p.labelKey, p.fallback);
        opt.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const cur = getChipClampState();
          const next = setChipClampState(p.mode, cur.customPx);
          applyChipClampToContainer(targetContainer, next);
          syncUI();
          closePopover();
        });
        optionBtns.set(p.mode, opt);
        popover.appendChild(opt);
      });

      const customRow = document.createElement('div');
      customRow.className = 'gs-chip-clamp-custom-row';
      const customLbl = document.createElement('span');
      customLbl.className = 'gs-chip-clamp-custom-label';
      customLbl.textContent = t('gsChipClampCustom', 'Custom');
      const customInput = document.createElement('input');
      customInput.type = 'number';
      customInput.min = '40';
      customInput.max = '400';
      customInput.step = '5';
      customInput.className = 'gs-chip-clamp-custom-input';
      const customUnit = document.createElement('span');
      customUnit.className = 'gs-chip-clamp-custom-unit';
      customUnit.textContent = 'px';
      const customApply = document.createElement('button');
      customApply.type = 'button';
      customApply.className = 'gs-chip-clamp-custom-apply';
      customApply.textContent = t('gsChipClampApply', 'Apply');

      const applyCustom = () => {
        const next = setChipClampState('custom', customInput.value);
        customInput.value = String(next.customPx);
        applyChipClampToContainer(targetContainer, next);
        syncUI();
        closePopover();
      };
      customApply.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyCustom();
      });
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          applyCustom();
        }
      });

      customRow.append(customLbl, customInput, customUnit, customApply);
      popover.appendChild(customRow);

      let unregEsc = null;
      function onDocPointerDown(e) {
        if (!wrap.contains(e.target)) {
          closePopover();
        }
      }
      function onDocKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closePopover();
        }
      }

      function openPopover() {
        syncUI();
        popover.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        if (window.cmtPushEscapeHandler) {
          unregEsc = window.cmtPushEscapeHandler({ el: popover, close: closePopover });
        }
        setTimeout(() => {
          document.addEventListener('pointerdown', onDocPointerDown, true);
        }, 0);
        document.addEventListener('keydown', onDocKeyDown, true);
      }

      function closePopover() {
        if (popover.classList.contains('hidden')) return;
        popover.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        if (unregEsc) { unregEsc(); unregEsc = null; }
        document.removeEventListener('pointerdown', onDocPointerDown, true);
        document.removeEventListener('keydown', onDocKeyDown, true);
      }

      function syncUI() {
        const st = getChipClampState();
        const isClamped = st.mode !== 'none';
        btn.classList.toggle('active', isClamped);
        const lblEl = btn.querySelector('.gs-chip-clamp-btn-label');
        if (lblEl) {
          const base = t('gsChipClampBtn', 'Chip Width');
          lblEl.textContent = isClamped ? `${base}: ${resolveChipClampMaxWidth(st.mode, st.customPx)}` : base;
        }
        optionBtns.forEach((opt, m) => {
          const active = st.mode === m;
          opt.classList.toggle('active', active);
          opt.setAttribute('aria-checked', active ? 'true' : 'false');
        });
        customInput.value = String(st.customPx);
        customRow.classList.toggle('active', st.mode === 'custom');
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (popover.classList.contains('hidden')) {
          openPopover();
        } else {
          closePopover();
        }
      });

      syncUI();
      wrap.append(btn, popover);
      return wrap;
    }

    function openStudentModal(student, classObj, sem, testIndex, tr, config) {
      // Deep-clone working copies
      const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;

      // Resolve active chip bank for this test/class first so section presets match
      const resolvedTestChipBank = (config && config.chipBank)
        || (classObj && classObj.chipBank)
        || ((classObj && Array.isArray(classObj.chipBanks) && classObj.chipBanks[0]))
        || _activeChipBankFilename
        || 'correction-criteria.js';
      _activeChipBankFilename = resolvedTestChipBank;

      // Normalise note sections
      const noteArray = student.testNotes[sem];
      if (!Array.isArray(noteArray[testIndex])) {
        const v = noteArray[testIndex];
        noteArray[testIndex] = (typeof v === "string" && v.trim()) ? [{ label: "", text: v }] : [];
      }

      // Work on drafts so Cancel truly cancels
      // Pre-populate obs sections from config presets if student has none yet
      const presets = Array.isArray(config.observationSections) ? config.observationSections : [];
      const baseSections = noteArray[testIndex].length > 0
        ? noteArray[testIndex].map(s => cloneObservationSection(s))
        : presets.map(label => ({ label, text: "" }));
      const draftSections = ensureObservationChecklistSections(baseSections, _activeChipBankFilename);
      let draftGrade = sourceArray[testIndex];
      let draftOverrideEnabled = isGradeOverrideEnabled(student, sem, testIndex);
      if (!student.correctionTime) student.correctionTime = { sem1: Array(TEST_COUNT_PER_SEM).fill(null), sem2: Array(TEST_COUNT_PER_SEM).fill(null) };
      const prevCorrTime = student.correctionTime[sem][testIndex];
      const criteriaMap = student.criteriaResults[sem][testIndex] || {};
      student.criteriaResults[sem][testIndex] = criteriaMap;
      const draftCriteria = {};
      config.criteria.forEach(c => {
        if (!criteriaMap[c.id]) criteriaMap[c.id] = { points: null, comment: "" };
        draftCriteria[c.id] = { points: criteriaMap[c.id].points, comment: criteriaMap[c.id].comment };
      });

      const storedMaxRemark = (student.testRemarkMax && student.testRemarkMax[sem] && Number(student.testRemarkMax[sem][testIndex])) || 0;
      _studentModalDraft = { student, classObj, sem, testIndex, tr, config, draftSections, draftCriteria, draftOverrideEnabled, criteriaPointsChanged: false, modalOpenedAt: Date.now(), maxRemarkNum: storedMaxRemark };
      const initialNextRemark = getNextObservationRemarkNumber(draftSections);
      _studentModalDraft.maxRemarkNum = Math.max(storedMaxRemark, initialNextRemark - 1);

      const heading = document.getElementById("student-modal-heading");
      const studentFormattedName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
        ? StudentNameUtils.formatStudentName(student, getGsNameDisplayMode())
        : `${student.firstName} ${student.lastName}`.trim();
      heading.textContent = studentFormattedName;
      if (student.customName && getGsNameDisplayMode() !== 'custom') {
        heading.title = `Custom name: ${student.customName}`;
      }

      const body = document.getElementById("student-modal-body");
      body.innerHTML = "";

      // ── Scoring Progress Strip (Option A) ──
      renderScoringProgressStrip(body, classObj, sem, testIndex, config);
      _gsTrackRemainingTransition(classObj, sem, testIndex, config, true);

      if (!config._absentPromptChecked) {
        config._absentPromptChecked = true;
        const absentCount = (classObj.students || []).filter(s => {
          if (!s) return false;
          const sId = s.id != null ? String(s.id) : null;
          const sUuid = s.uuid != null ? String(s.uuid) : null;
          const isAbs = isStudentAbsentForTest(s.id, config) || (sUuid && isStudentAbsentForTest(sUuid, config));
          const isExcl = (sId && (config.excludedStudentIds || []).map(String).includes(sId)) ||
                         (sUuid && (config.excludedStudentIds || []).map(String).includes(sUuid));
          return isAbs && !isExcl;
        }).length;
        if (absentCount > 0 && typeof showToast === "function") {
          showToast(tFmt('gsProgressAbsentSuggested', { n: absentCount }));
        }
      }

      // — Grade —
      const gradeSection = document.createElement("div");
      gradeSection.className = "smod-section smod-grade-sticky";
      const gradeTitle = document.createElement("div");
      gradeTitle.className = "smod-section-title";
      gradeTitle.textContent = t('gsStudentGradeTitle');
      const gradeRow = document.createElement("div");
      gradeRow.className = "smod-grade-row";
      const gradeLabel = document.createElement("label");
      gradeLabel.textContent = t('gsStudentGradeLabel');
      const gradeInput = document.createElement("input");
      gradeInput.type = "number";
      gradeInput.className = "smod-grade-input";
      gradeInput.min = "1"; gradeInput.max = "6"; gradeInput.step = "0.1";
      gradeInput.value = draftGrade == null ? "" : String(draftGrade);
      gradeInput.addEventListener("input", () => {
        draftGrade = asGrade(gradeInput.value);
        if (sanctionCheck.checked && draftGrade != null) {
          sanctionGradeInput.value = String(draftGrade);
        }
        updateSmodGradeIndicators();
        autoSaveStudentModal(true);
      });
      gradeInput.addEventListener("blur", flushStudentModalAutoSave);

      const nextDeltaPill = document.createElement("span");
      nextDeltaPill.className = "smod-next-delta-pill";
      nextDeltaPill.textContent = "—";
      nextDeltaPill.title = t('gsColNextGradeDelta');

      const overrideBtn = document.createElement("button");
      overrideBtn.type = "button";
      overrideBtn.className = "btn smod-override-btn";
      overrideBtn.textContent = t('gsStudentOverrideGrade');

      const sanctionWrap = document.createElement("label");
      sanctionWrap.className = "smod-sanction-wrap";

      const sanctionCheck = document.createElement("input");
      sanctionCheck.type = "checkbox";
      sanctionCheck.className = "smod-sanction-check";
      sanctionCheck.style.cssText = "width:16px;height:16px;cursor:pointer;";

      const sanctionLabelText = document.createElement("span");
      sanctionLabelText.textContent = t('gsStudentSanctionGrade');
      sanctionWrap.appendChild(sanctionCheck);
      sanctionWrap.appendChild(sanctionLabelText);

      const sanctionGradeInput = document.createElement("input");
      sanctionGradeInput.type = "number";
      sanctionGradeInput.className = "input smod-sanction-input";
      sanctionGradeInput.min = "1"; sanctionGradeInput.max = "6"; sanctionGradeInput.step = "0.1";
      sanctionGradeInput.value = (draftOverrideEnabled && draftGrade != null) ? String(draftGrade) : "1";
      sanctionGradeInput.title = t('gsStudentSanctionGrade');

      const isInitialSanction = draftOverrideEnabled && (draftGrade === 1);
      sanctionCheck.checked = !!isInitialSanction;
      sanctionGradeInput.disabled = !sanctionCheck.checked;
      sanctionGradeInput.style.opacity = sanctionCheck.checked ? "1" : "0.5";

      const computeDraftAutoGrade = () => {
        const draftMap = {};
        let hasAnyScored = false;
        config.criteria.forEach(c => {
          if (draftCriteria[c.id]) {
            draftMap[c.id] = draftCriteria[c.id];
            if (draftCriteria[c.id].points !== null && draftCriteria[c.id].points !== undefined && draftCriteria[c.id].points !== "" && !Number.isNaN(Number(draftCriteria[c.id].points))) {
              hasAnyScored = true;
            }
          }
        });
        if (!hasAnyScored) return null;
        const totals = calcCriteriaTotals(config, draftMap);
        if (totals.totalPossible <= 0) return null;
        const scored = (totals.totalScored || 0) + (totals.totalBonusScored || 0);
        const ratio = totals.totalPossible > 0 ? Math.max(0, Math.min(1, scored / totals.totalPossible)) : 0;
        if (config.grading && config.grading.mode === "equation") {
          const passPercent = config.grading.passPercentGrade4 || 66.67;
          const passPts = totals.totalPossible * (passPercent / 100);
          const res = evaluateGradingEquation(config.grading.equationFormula, {
            pts: scored,
            totalPts: totals.totalPossible,
            minPts: 0,
            passPts,
            maxGrade: config.grading.maxGrade != null ? config.grading.maxGrade : 6,
            minGrade: config.grading.minGrade != null ? config.grading.minGrade : 1.5,
            passGrade: 4,
            rounding: config.grading.equationRounding || "0.5"
          });
            return (res && res.ok && res.grade != null) ? res.grade : gradeFromRatio(ratio, config);
          }
          if (isParticipationTestConfig(config) && (!config.grading || (!config.grading.customManualScale && config.grading.mode === "manual"))) {
            const maxG = (config.grading && config.grading.maxGrade != null) ? Number(config.grading.maxGrade) : 6;
            const minG = (config.grading && config.grading.minGrade != null) ? Number(config.grading.minGrade) : 0;
            const step = (config.grading && config.grading.interval != null && Number(config.grading.interval) > 0) ? Number(config.grading.interval) : 0.5;
            const rawGrade = minG + ratio * (maxG - minG);
            return Math.round(rawGrade / step) * step;
          }
          return gradeFromRatio(ratio, config);
        };

      const syncGradeEditability = (recalc = false) => {
        overrideBtn.classList.toggle("active", draftOverrideEnabled);
        overrideBtn.setAttribute("aria-pressed", draftOverrideEnabled ? "true" : "false");
        gradeInput.disabled = !draftOverrideEnabled;
        gradeInput.classList.toggle("locked", !draftOverrideEnabled);
        if (!draftOverrideEnabled) {
          sanctionCheck.checked = false;
          sanctionGradeInput.disabled = true;
          sanctionGradeInput.style.opacity = "0.5";
          if (recalc || draftGrade == null) {
            const autoGrade = computeDraftAutoGrade();
            draftGrade = autoGrade;
            gradeInput.value = autoGrade == null ? "" : String(autoGrade);
          }
        }
        updateSmodGradeIndicators();
      };

      sanctionCheck.addEventListener("change", () => {
        if (sanctionCheck.checked) {
          draftOverrideEnabled = true;
          if (_studentModalDraft) _studentModalDraft.draftOverrideEnabled = true;
          sanctionGradeInput.disabled = false;
          sanctionGradeInput.style.opacity = "1";
          const sVal = asGrade(sanctionGradeInput.value) ?? 1;
          draftGrade = sVal;
          gradeInput.value = String(sVal);
          syncGradeEditability(false);
        } else {
          sanctionGradeInput.disabled = true;
          sanctionGradeInput.style.opacity = "0.5";
          draftOverrideEnabled = false;
          if (_studentModalDraft) {
            _studentModalDraft.draftOverrideEnabled = false;
            _studentModalDraft.criteriaPointsChanged = true;
          }
          syncGradeEditability(true);
        }
        autoSaveStudentModal(false);
      });

      sanctionGradeInput.addEventListener("input", () => {
        if (sanctionCheck.checked) {
          const sVal = asGrade(sanctionGradeInput.value) ?? 1;
          draftGrade = sVal;
          gradeInput.value = String(sVal);
          draftOverrideEnabled = true;
          if (_studentModalDraft) _studentModalDraft.draftOverrideEnabled = true;
          syncGradeEditability(false);
          autoSaveStudentModal(true);
        }
      });
      sanctionGradeInput.addEventListener("blur", flushStudentModalAutoSave);

      overrideBtn.addEventListener("click", () => {
        draftOverrideEnabled = !draftOverrideEnabled;
        if (!draftOverrideEnabled) {
          sanctionCheck.checked = false;
          sanctionGradeInput.disabled = true;
          sanctionGradeInput.style.opacity = "0.5";
          if (_studentModalDraft) _studentModalDraft.criteriaPointsChanged = true;
        }
        if (_studentModalDraft) _studentModalDraft.draftOverrideEnabled = draftOverrideEnabled;
        syncGradeEditability(!draftOverrideEnabled);
        autoSaveStudentModal(false);
      });

      gradeRow.appendChild(gradeLabel);
      gradeRow.appendChild(gradeInput);
      gradeRow.appendChild(nextDeltaPill);
      gradeRow.appendChild(overrideBtn);
      gradeRow.appendChild(sanctionWrap);
      gradeRow.appendChild(sanctionGradeInput);

      const scaleStrip = document.createElement("div");
      scaleStrip.className = "smod-scale-strip";
      const scaleLabel = document.createElement("span");
      scaleLabel.className = "smod-scale-label";
      scaleLabel.textContent = t('gsGradingTitle');
      scaleStrip.appendChild(scaleLabel);

      const scaleDefaultTotal = calcCriteriaTotals(config, {});
      const scaleTotalPossible = scaleDefaultTotal.totalPossible;
      const scaleThresholds = getThresholds(config);
      const scaleChips = [];
      scaleThresholds.forEach(th => {
        const chip = document.createElement("span");
        chip.className = "smod-scale-chip";
        const pctStr = fmtN(th.ratio * 100);
        const gradeSpan = document.createElement("span");
        gradeSpan.className = "smod-scale-chip-grade";
        gradeSpan.textContent = `${fmtN(th.grade)}:`;
        const valSpan = document.createElement("span");
        if (scaleTotalPossible > 0) {
          const ptsStr = fmtN(th.ratio * scaleTotalPossible);
          valSpan.textContent = `${ptsStr}`;
          chip.title = `${fmtN(th.grade)} = ${pctStr}% (${ptsStr} pts)`;
        } else {
          valSpan.textContent = `${pctStr}%`;
          chip.title = `${fmtN(th.grade)} = ${pctStr}%`;
        }
        chip.appendChild(gradeSpan);
        chip.appendChild(valSpan);
        scaleStrip.appendChild(chip);
        scaleChips.push({ grade: th.grade, el: chip });
      });

      const updateSmodGradeIndicators = () => {
        const currentGrade = asGrade(draftGrade);
        scaleChips.forEach(sc => {
          sc.el.classList.toggle("active", currentGrade != null && Math.abs(sc.grade - currentGrade) < 1e-9);
        });

        nextDeltaPill.classList.remove("is-close-below", "is-close-above", "is-max");
        nextDeltaPill.textContent = "—";
        nextDeltaPill.title = t('gsColNextGradeDelta');

        const draftMap = {};
        let hasAnyScored = false;
        (config.criteria || []).forEach(c => {
          if (draftCriteria[c.id]) {
            draftMap[c.id] = draftCriteria[c.id];
            if (draftCriteria[c.id].points !== null && draftCriteria[c.id].points !== undefined && draftCriteria[c.id].points !== "" && !Number.isNaN(Number(draftCriteria[c.id].points))) {
              hasAnyScored = true;
            }
          }
        });
        const totals = calcCriteriaTotals(config, draftMap);
        if (!config || totals.totalPossible <= 0 || (!hasAnyScored && currentGrade == null)) return;

        const scored = (totals.totalScored || 0) + (totals.totalBonusScored || 0);
        const deltaInfo = getNextGradeDelta(scored, totals.totalPossible, config, currentGrade);
        if (!deltaInfo) {
          if (currentGrade != null) {
            nextDeltaPill.textContent = t('gsSmodNextGradeMax');
            nextDeltaPill.classList.add("is-max");
          }
          return;
        }

        const below = deltaInfo.delta < -1e-9 ? Math.abs(deltaInfo.delta) : null;
        const above = deltaInfo.delta >= 1e-9 ? deltaInfo.delta : null;
        const signedDelta = below != null ? `-${fmtN(below)}` : (above != null ? `+${fmtN(above)}` : "0");

        nextDeltaPill.textContent = tFmt('gsSmodNextGradeDelta', {
          grade: fmtN(deltaInfo.nextGrade),
          delta: signedDelta
        });
        nextDeltaPill.title = tFmt('gsNextGradeDeltaTitle', {
          grade: fmtN(deltaInfo.nextGrade),
          target: fmtN(deltaInfo.targetPoints),
          delta: fmtN(Math.abs(deltaInfo.delta))
        });

        const highlightThreshold = Math.max(0, toNumber(config && config.nextGradeHighlightPoints) ?? 0);
        if (highlightThreshold > 0) {
          if (below != null && below <= highlightThreshold + 1e-9) {
            nextDeltaPill.classList.add("is-close-below");
          } else if (above != null && above <= highlightThreshold + 1e-9) {
            nextDeltaPill.classList.add("is-close-above");
          }
        }
      };

      gradeRow.appendChild(scaleStrip);

      gradeSection.appendChild(gradeTitle);
      gradeSection.appendChild(gradeRow);
      body.appendChild(gradeSection);

      // — Overview 2-column grid (Observations + Criteria) —
      const overviewGrid = document.createElement("div");
      overviewGrid.className = config.criteria.length > 0
        ? "smod-overview-grid has-criteria"
        : "smod-overview-grid no-criteria";

      // — Teacher observations —
      const noteSection = document.createElement("div");
      noteSection.className = "smod-section smod-pane smod-pane-notes";

      const noteHeadRow = document.createElement("div");
      noteHeadRow.className = "smod-note-head-row";
      const noteTitle = document.createElement("div");
      noteTitle.className = "smod-section-title";
      noteTitle.style.margin = "0";
      noteTitle.textContent = t('gsStudentObsTitle');
      noteHeadRow.appendChild(noteTitle);

      const noteBankWrap = document.createElement("div");
      noteBankWrap.className = "smod-note-head-actions";
      const noteBankLbl = document.createElement("span");
      noteBankLbl.style.cssText = "font-size:0.75rem;font-weight:600;color:var(--muted);";
      noteBankLbl.textContent = t('gsChipsBank', 'Observation Chips Bank:') + ' ';
      const noteBankSel = document.createElement("select");
      noteBankSel.className = "input input-sm";
      noteBankSel.style.cssText = "padding:2px 6px;font-size:0.75rem;max-width:200px;";
      populateChipBankSelectElement(noteBankSel, _activeChipBankFilename);
      noteBankSel.addEventListener("change", () => {
        _activeChipBankFilename = noteBankSel.value;
        if (config) config.chipBank = noteBankSel.value;
        if (classObj) {
          if (!Array.isArray(classObj.chipBanks)) classObj.chipBanks = [];
          if (!classObj.chipBanks.includes(noteBankSel.value)) classObj.chipBanks.push(noteBankSel.value);
          classObj.chipBank = noteBankSel.value;
        }
        saveState(classObj ? classObj.id : null, sem, testIndex);
        const updated = ensureObservationChecklistSections(draftSections, _activeChipBankFilename);
        draftSections.length = 0;
        updated.forEach(s => draftSections.push(s));
        renderNoteSections();
        autoSaveStudentModal(false);
      });

      noteBankWrap.append(noteBankLbl, noteBankSel);
      noteHeadRow.appendChild(noteBankWrap);
      noteSection.appendChild(noteHeadRow);

      const noteSectionsWrap = document.createElement("div");
      noteSectionsWrap.className = "note-sections-container";
      applyChipClampToContainer(noteSectionsWrap);
      noteBankWrap.appendChild(createChipAbbrToggleControl(noteSectionsWrap));
      noteBankWrap.appendChild(createChipClampControl(noteSectionsWrap));

      function getGroupsForSection(sectionLabel) {
        const bankSections = getObservationSectionsWithGroups(_activeChipBankFilename);
        const norm = String(sectionLabel || '').trim().toLowerCase();
        const found = bankSections.find(bs => bs.name.toLowerCase() === norm);
        if (found) return { color: found.color, groups: found.groups };

        if (norm === 'good points' || norm === 'points forts') {
          const m = bankSections.find(bs => bs.name.toLowerCase().includes('good') || bs.name.toLowerCase().includes('fort'));
          if (m) return { color: m.color, groups: m.groups };
        } else if (norm === 'to remedy' || norm === 'to improve' || norm === 'a améliorer') {
          const m = bankSections.find(bs => bs.name.toLowerCase().includes('remedy') || bs.name.toLowerCase().includes('improv') || bs.name.toLowerCase().includes('faible'));
          if (m) return { color: m.color, groups: m.groups };
        }
        return { color: '', groups: [] };
      }

      function openQuickAddChipPopup({ section, categoryName, block, secColor }) {
        const targetBankFn = _activeChipBankFilename || 'correction-criteria.js';
        const sectionLabel = section ? section.label : '';
        const normSec = String(sectionLabel || '').trim();
        const effectiveColor = secColor || '#16a34a';

        let overlay = document.getElementById('gs-quick-add-chip-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'gs-quick-add-chip-overlay';
          overlay.className = 'gs-quick-add-chip-overlay';
          document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';

        overlay.innerHTML = `
          <div class="gs-quick-add-chip-card" role="dialog" aria-modal="true">
            <div class="gs-quick-add-chip-header">
              <div class="gs-quick-add-chip-title">
                <img src="../assets/icons/speech-bubbles.svg" style="width:18px;height:18px;" alt="" />
                <span>${t('gsPopupNoteTitle', 'Add Observation Note')}</span>
              </div>
              <button type="button" id="gs-quick-chip-close" class="btn btn-xs gs-quick-add-chip-close">✕</button>
            </div>
            <div class="gs-quick-add-chip-meta">
              <span class="gs-quick-add-chip-sec-badge" style="border-left: 3px solid ${effectiveColor};">
                ${escapeHtml(normSec || t('gsSectionGeneral', 'General Observations'))}
              </span>
              ${categoryName ? `
                <span class="note-checklist-section-tag" style="pointer-events: none; ${effectiveColor ? `--note-accent:${effectiveColor};` : ''}">
                  ${escapeHtml(categoryName)}
                </span>
              ` : `
                <input type="text" id="gs-quick-chip-cat-input" class="input input-sm" style="padding:2px 8px;font-size:0.75rem;max-width:140px;font-weight:700;" placeholder="${t('gsAddChipCategoryLabel', 'Category')}..." value="${t('gsCategoryGeneral', 'General')}" />
              `}
            </div>
            <div class="gs-quick-add-chip-body">
              <label class="gs-quick-add-chip-label" for="gs-quick-chip-text-input">${t('gsAddChipNameLabel', 'Chip Text')}</label>
              <input type="text" id="gs-quick-chip-text-input" class="input gs-quick-add-chip-input" placeholder="${t('gsPlaceholderObservation', 'e.g. Good intonation, Needs clearer examples...')}" autocomplete="off" />
            </div>
            <div class="gs-quick-add-chip-actions">
              <button type="button" id="gs-quick-chip-cancel" class="btn">${t('gsAddChipBtnCancel', 'Cancel')}</button>
              <button type="button" id="gs-quick-chip-submit" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;">
                <img src="../assets/icons/plus.svg" class="btn-icon" style="width:13px;height:13px;" alt="" />
                <span>${t('gsAddChipBtnSubmit', 'Add Chip')}</span>
              </button>
            </div>
          </div>
        `;

        const textInput = document.getElementById('gs-quick-chip-text-input');
        const catInput = document.getElementById('gs-quick-chip-cat-input');
        const closeBtn = document.getElementById('gs-quick-chip-close');
        const cancelBtn = document.getElementById('gs-quick-chip-cancel');
        const submitBtn = document.getElementById('gs-quick-chip-submit');

        let unreg = null;
        function closePopup() {
          if (unreg) { unreg(); unreg = null; }
          overlay.style.display = 'none';
          overlay.classList.add('hidden');
          document.removeEventListener('keydown', onKeyDown, true);
        }

        async function submitChip() {
          const chipText = textInput ? textInput.value.trim() : '';
          const cat = categoryName || (catInput ? catInput.value.trim() : '') || t('gsCategoryGeneral', 'General');
          const sec = normSec || t('gsSectionGeneral', 'General Observations');

          if (!chipText) {
            if (textInput) textInput.focus();
            return;
          }

          submitBtn.disabled = true;
          try {
            const saved = await saveNewObservationChip(targetBankFn, chipText, cat, sec, effectiveColor);
            if (!saved) {
              return;
            }

            if (!Array.isArray(section.checklist)) section.checklist = [];
            const exists = section.checklist.some(it => {
              const p = parseObservationChipItem(it);
              return p.name.toLowerCase() === chipText.toLowerCase();
            });
            if (!exists) {
              section.checklist.push(formatObservationChipItem(chipText, 1));
            }
            if (typeof sortSectionChecklistByBank === 'function') {
              section.checklist = sortSectionChecklistByBank(section.checklist, _activeChipBankFilename);
            }

            closePopup();

            // If section label was empty, assign section name to it so it matches the bank
            if (!section.label) {
              section.label = sec;
              if (block) {
                const lblInput = block.querySelector('.note-section-label');
                if (lblInput) lblInput.value = sec;
              }
            }

            // Always refresh all observation checklist sections in the student scoring modal
            refreshObservationChecklists();

            // Refresh Test Options preview if that modal is active
            if (typeof renderToptChipsPreview === 'function') {
              try { renderToptChipsPreview(); } catch (_) {}
            }

            // Refresh Reference Data Editor chips if open
            if (typeof renderReferenceDataEditor === 'function') {
              const refPopup = document.querySelector('.ref-data-editor');
              if (refPopup && !refPopup.closest('.hidden')) {
                try { renderReferenceDataEditor(); } catch (_) {}
              }
            }

            autoSaveStudentModal(false);
          } finally {
            submitBtn.disabled = false;
          }
        }

        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (cancelBtn) cancelBtn.addEventListener('click', closePopup);
        if (submitBtn) submitBtn.addEventListener('click', submitChip);

        function onKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closePopup();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            submitChip();
          }
        }

        if (window.cmtPushEscapeHandler) {
          unreg = window.cmtPushEscapeHandler({ el: overlay, close: closePopup });
        }
        document.addEventListener('keydown', onKeyDown, true);

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            closePopup();
          }
        });

        setTimeout(() => {
          if (textInput) {
            textInput.focus();
            textInput.select();
          }
        }, 50);
      }

      function openChipCommentPopup(opts) {
        const { chipName, category, section, currentCount, currentComment, currentRemarks, focusIndex, secColor, onSave } = opts;
        let overlay = document.getElementById('gs-chip-comment-modal-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'gs-chip-comment-modal-overlay';
          overlay.className = 'gs-chip-comment-overlay';
          document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';

        const titleText = (t('gsChipCommentPopupTitle', 'Note on Chip: {chip}')).replace('{chip}', chipName);
        const secLabel = section && section.label ? section.label : '';
        const effectiveColor = secColor || '#0284c7';

        let remarksList = Array.isArray(currentRemarks) && currentRemarks.length
          ? currentRemarks.map(r => ({ num: String(r.num || ''), text: String(r.text || '') }))
          : parseChipRemarksString(currentComment || '').map(r => ({ num: String(r.num || ''), text: String(r.text || '') }));
        const hasInitialRemarks = remarksList.some(r => r.text.trim() || r.num.trim());
        if (remarksList.length === 0) {
          remarksList.push({ num: '', text: '' });
        }

        overlay.innerHTML = `
          <div class="gs-chip-comment-card" role="dialog" aria-modal="true">
            <div class="gs-chip-comment-header">
              <div class="gs-chip-comment-title">
                <img src="../assets/icons/speech-bubbles.svg" style="width:18px;height:18px;" alt="" />
                <span>${escapeHtml(titleText)}</span>
              </div>
              <button type="button" id="gs-chip-comment-close" class="btn btn-xs gs-chip-comment-close">
                <img src="../assets/icons/close.svg" style="width:12px;height:12px;display:block;" alt="" />
              </button>
            </div>
            <div class="gs-chip-comment-meta">
              ${secLabel ? `<span class="gs-chip-comment-sec-badge" style="border-left:3px solid ${effectiveColor};">${escapeHtml(secLabel)}</span>` : ''}
              ${category ? `<span class="note-checklist-section-tag" style="pointer-events:none;${effectiveColor ? `--note-accent:${effectiveColor};` : ''}">${escapeHtml(category)}</span>` : ''}
              <span class="gs-chip-comment-chip-name">${escapeHtml(chipName)}</span>
            </div>
            <div class="gs-chip-comment-body">
              <label class="gs-chip-comment-label">${t('gsChipCommentLabel', 'Secondary Note / Comment')}</label>
              <p class="gs-chip-comment-hint">${t('gsChipCommentRemarksHint', "Ref # is optional (to match a number on the student's paper). Enter saves; Ctrl+Enter adds a remark.")}</p>
              <ol id="gs-chip-remark-list" class="gs-chip-remark-list"></ol>
              <button type="button" id="gs-chip-remark-add-btn" class="gs-chip-remark-add-btn">
                <img src="../assets/icons/plus.svg" style="width:12px;height:12px;" alt="" />
                <span>${t('gsChipCommentAddRemark', 'Add Remark')}</span>
              </button>
            </div>
            <div class="gs-chip-comment-actions">
              <div>
                ${hasInitialRemarks ? `<button type="button" id="gs-chip-comment-clear" class="btn btn-danger-outline">${t('gsChipCommentClearAll', 'Remove All')}</button>` : ''}
              </div>
              <div class="gs-chip-comment-actions-right">
                <button type="button" id="gs-chip-comment-cancel" class="btn">${t('gsAddChipBtnCancel', 'Cancel')}</button>
                <button type="button" id="gs-chip-comment-save" class="btn btn-primary">
                  ${t('gsChipCommentSave', 'Save Note')}
                </button>
              </div>
            </div>
          </div>
        `;

        const listEl = document.getElementById('gs-chip-remark-list');
        const addBtn = document.getElementById('gs-chip-remark-add-btn');
        const closeBtn = document.getElementById('gs-chip-comment-close');
        const cancelBtn = document.getElementById('gs-chip-comment-cancel');
        const saveBtn = document.getElementById('gs-chip-comment-save');
        const clearBtn = document.getElementById('gs-chip-comment-clear');

        let unreg = null;
        function closePopup() {
          if (unreg) { unreg(); unreg = null; }
          overlay.style.display = 'none';
          overlay.classList.add('hidden');
          document.removeEventListener('keydown', onKeyDown, true);
        }

        function submitRemarks(nextRemarks) {
          const cleaned = (nextRemarks || [])
            .map(r => ({ num: String(r.num || '').trim(), text: String(r.text || '').trim() }))
            .filter(r => r.text || r.num);
          if (typeof _studentModalDraft !== 'undefined' && _studentModalDraft) {
            cleaned.forEach(r => {
              const n = parseInt(r.num, 10);
              if (!isNaN(n) && n > (_studentModalDraft.maxRemarkNum || 0)) {
                _studentModalDraft.maxRemarkNum = n;
              }
            });
          }
          closePopup();
          if (typeof onSave === 'function') {
            onSave(formatChipRemarksString(cleaned), cleaned);
          }
        }

        function renderRemarkRows(focusIdx = -1) {
          if (!listEl) return;
          listEl.innerHTML = '';
          remarksList.forEach((row, idx) => {
            const li = document.createElement('li');
            li.className = 'gs-chip-remark-item';

            const numInput = document.createElement('input');
            numInput.type = 'text';
            numInput.className = 'gs-chip-remark-num-input';
            numInput.maxLength = 6;
            numInput.placeholder = t('gsChipCommentRefPlaceholder', '#');
            numInput.title = t('gsChipCommentRefTitle', 'Optional paper reference number');
            numInput.autocomplete = 'off';
            numInput.value = row.num || '';
            numInput.addEventListener('input', () => {
              remarksList[idx].num = numInput.value;
            });
            numInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                remarksList.splice(idx + 1, 0, { num: '', text: '' });
                renderRemarkRows(idx + 1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                submitRemarks(remarksList);
              }
            });

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'gs-chip-remark-text-input';
            textInput.placeholder = t('gsChipCommentPlaceholder', 'e.g. Needs clearer examples, very expressive, etc.');
            textInput.autocomplete = 'off';
            textInput.value = row.text || '';
            textInput.addEventListener('input', () => {
              remarksList[idx].text = textInput.value;
            });
            textInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                remarksList.splice(idx + 1, 0, { num: '', text: '' });
                renderRemarkRows(idx + 1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                submitRemarks(remarksList);
              }
            });

            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'gs-chip-remark-actions';

            const upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'gs-chip-remark-btn';
            upBtn.title = t('gsChipCommentMoveUp', 'Move Up');
            upBtn.disabled = (idx === 0);
            upBtn.innerHTML = '<img src="../assets/icons/arrow-up.svg" style="width:11px;height:11px;display:block;" alt="" />';
            upBtn.addEventListener('click', () => {
              if (idx > 0) {
                const tmp = remarksList[idx];
                remarksList[idx] = remarksList[idx - 1];
                remarksList[idx - 1] = tmp;
                renderRemarkRows(idx - 1);
              }
            });

            const downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'gs-chip-remark-btn';
            downBtn.title = t('gsChipCommentMoveDown', 'Move Down');
            downBtn.disabled = (idx === remarksList.length - 1);
            downBtn.innerHTML = '<img src="../assets/icons/arrow-down.svg" style="width:11px;height:11px;display:block;" alt="" />';
            downBtn.addEventListener('click', () => {
              if (idx < remarksList.length - 1) {
                const tmp = remarksList[idx];
                remarksList[idx] = remarksList[idx + 1];
                remarksList[idx + 1] = tmp;
                renderRemarkRows(idx + 1);
              }
            });

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'gs-chip-remark-btn gs-chip-remark-btn-del';
            delBtn.title = t('gsChipCommentDeleteRemark', 'Delete Remark');
            delBtn.innerHTML = '<img src="../assets/icons/trash.svg" style="width:11px;height:11px;display:block;" alt="" />';
            delBtn.addEventListener('click', () => {
              if (remarksList.length === 1) {
                remarksList[0] = { num: '', text: '' };
                renderRemarkRows(0);
              } else {
                remarksList.splice(idx, 1);
                renderRemarkRows(Math.min(idx, remarksList.length - 1));
              }
            });

            const numOnlyBtn = document.createElement('button');
            numOnlyBtn.type = 'button';
            numOnlyBtn.className = 'gs-chip-remark-btn gs-chip-remark-btn-num-only';
            numOnlyBtn.title = t('gsChipCommentSaveNumOnly', 'Assign number & save');
            numOnlyBtn.setAttribute('aria-label', t('gsChipCommentSaveNumOnly', 'Assign number & save'));
            numOnlyBtn.innerHTML = '<img src="../assets/icons/number-badge.svg" style="width:12px;height:12px;display:block;" alt="" />';
            numOnlyBtn.addEventListener('click', () => {
              let numVal = String(numInput.value || '').trim();
              if (!numVal) {
                numVal = String(getNextObservationRemarkNumber(_studentModalDraft?.draftSections || (section ? [section] : []), remarksList));
              }
              remarksList[idx].num = numVal;
              remarksList[idx].text = String(textInput.value || '');
              submitRemarks(remarksList);
            });

            actionsWrap.appendChild(numOnlyBtn);
            actionsWrap.appendChild(upBtn);
            actionsWrap.appendChild(downBtn);
            actionsWrap.appendChild(delBtn);

            li.appendChild(numInput);
            li.appendChild(textInput);
            li.appendChild(actionsWrap);
            listEl.appendChild(li);

            if (idx === focusIdx) {
              setTimeout(() => {
                textInput.focus();
                if (textInput.value) textInput.select();
              }, 20);
            }
          });
        }

        const initialFocus = (typeof focusIndex === 'number' && focusIndex >= 0 && focusIndex < remarksList.length)
          ? focusIndex
          : (remarksList.length - 1);
        renderRemarkRows(initialFocus);

        if (addBtn) {
          addBtn.addEventListener('click', () => {
            remarksList.push({ num: '', text: '' });
            renderRemarkRows(remarksList.length - 1);
          });
        }
        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (cancelBtn) cancelBtn.addEventListener('click', closePopup);
        if (saveBtn) saveBtn.addEventListener('click', () => submitRemarks(remarksList));
        if (clearBtn) clearBtn.addEventListener('click', () => submitRemarks([]));

        function onKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closePopup();
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            remarksList.push({ num: '', text: '' });
            renderRemarkRows(remarksList.length - 1);
          } else if (e.key === 'Enter' && (!e.target || e.target.tagName !== 'BUTTON')) {
            e.preventDefault();
            submitRemarks(remarksList);
          }
        }

        if (window.cmtPushEscapeHandler) {
          unreg = window.cmtPushEscapeHandler({ el: overlay, close: closePopup });
        }
        document.addEventListener('keydown', onKeyDown, true);

        overlay.onclick = (e) => {
          if (e.target === overlay) {
            closePopup();
          }
        };
      }

      function closeChipContextMenu() {
        const existing = document.getElementById('gs-chip-context-menu');
        if (existing) {
          if (typeof existing._cleanup === 'function') existing._cleanup();
          existing.remove();
        }
      }

      function openChipContextMenu({ x, y, chipName, currentCount, hasRemarks, onEditNotes, onAddAutoNumber, onAddOne, onRemoveOne, onClearChip }) {
        closeChipContextMenu();

        const menu = document.createElement('div');
        menu.id = 'gs-chip-context-menu';
        menu.className = 'gs-chip-context-menu';
        menu.setAttribute('role', 'menu');

        const header = document.createElement('div');
        header.className = 'gs-chip-context-header';
        header.textContent = currentCount > 1 ? `${chipName} (x${currentCount})` : chipName;
        menu.appendChild(header);

        function addMenuItem(iconFile, labelText, isDanger, handler) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'gs-chip-context-item' + (isDanger ? ' is-danger' : '');
          btn.setAttribute('role', 'menuitem');
          btn.innerHTML = `<img src="../assets/icons/${iconFile}" style="width:13px;height:13px;flex-shrink:0;" alt="" /><span>${escapeHtml(labelText)}</span>`;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeChipContextMenu();
            if (typeof handler === 'function') handler();
          });
          menu.appendChild(btn);
        }

        addMenuItem(
          'speech-bubbles.svg',
          hasRemarks ? t('gsChipCtxOpenNotes', 'Edit Remarks / Notes') : t('gsChipCtxAddNotes', 'Add Remark / Note'),
          false,
          onEditNotes
        );
        if (typeof onAddAutoNumber === 'function') {
          addMenuItem(
            'number-badge.svg',
            t('gsChipCtxAddAutoNumber', 'Add automatic number'),
            false,
            onAddAutoNumber
          );
        }
        if (currentCount < 4) {
          addMenuItem('plus.svg', t('gsChipCtxAddOne', 'Add (+1)'), false, onAddOne);
        }

        if (currentCount > 0) {
          addMenuItem('clear.svg', t('gsChipCtxRemoveOne', 'Remove One (-1)'), true, onRemoveOne);
        }
        if (currentCount > 1 || hasRemarks) {
          addMenuItem('trash.svg', t('gsChipCtxClearChip', 'Clear Chip'), true, onClearChip);
        }

        document.body.appendChild(menu);

        const rect = menu.getBoundingClientRect();
        const pad = 8;
        const left = Math.min(x, window.innerWidth - rect.width - pad);
        const top = Math.min(y, window.innerHeight - rect.height - pad);
        menu.style.left = `${Math.max(pad, left)}px`;
        menu.style.top = `${Math.max(pad, top)}px`;

        let unregEsc = null;
        function onDocPointerDown(e) {
          if (!menu.contains(e.target)) {
            closeChipContextMenu();
          }
        }
        function onDocKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeChipContextMenu();
          }
        }

        if (window.cmtPushEscapeHandler) {
          unregEsc = window.cmtPushEscapeHandler({ el: menu, close: closeChipContextMenu });
        }
        setTimeout(() => {
          document.addEventListener('pointerdown', onDocPointerDown, true);
        }, 0);
        document.addEventListener('keydown', onDocKeyDown, true);

        menu._cleanup = () => {
          if (unregEsc) { unregEsc(); unregEsc = null; }
          document.removeEventListener('pointerdown', onDocPointerDown, true);
          document.removeEventListener('keydown', onDocKeyDown, true);
        };
      }

      function buildChecklistElement(section, block) {
        const { color: secColor, groups } = getGroupsForSection(section.label);
        if (!groups || groups.length === 0) {
          const emptyChecklist = document.createElement("div");
          emptyChecklist.className = "note-checklist note-checklist-empty";
          emptyChecklist.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 0;";

          const addFirstTag = document.createElement("button");
          addFirstTag.type = "button";
          addFirstTag.className = "note-checklist-section-tag";
          if (secColor) addFirstTag.style.setProperty("--note-accent", secColor);
          addFirstTag.title = t('gsAddChipToSection', 'Add chip to this section');
          addFirstTag.innerHTML = `<img src="../assets/icons/plus.svg" class="btn-icon" alt="" style="width:10px;height:10px;vertical-align:-1px;margin-right:3px;" /> ${t('gsBtnAddChip', 'Add Chip')}`;
          addFirstTag.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openQuickAddChipPopup({
              section,
              categoryName: '',
              block: block || emptyChecklist.closest('.note-section'),
              secColor
            });
          });
          emptyChecklist.appendChild(addFirstTag);
          return emptyChecklist;
        }

        const items = groups.flatMap(g => g.items);
        const chipMap = new Map();
        sectionChecklistSummary(section).forEach(item => {
          const p = parseObservationChipItem(item);
          if (p.name) chipMap.set(p.name.toLowerCase(), p);
        });

        const checklist = document.createElement("div");
        checklist.className = "note-checklist";

        groups.forEach(group => {
          const inlineGroup = document.createElement("div");
          inlineGroup.className = "note-checklist-inline-group";
          inlineGroup.dataset.category = group.type;

          const sectionTag = document.createElement("button");
          sectionTag.type = "button";
          sectionTag.className = "note-checklist-section-tag";
          if (secColor) sectionTag.style.setProperty("--note-accent", secColor);
          sectionTag.title = (t('gsAddChipToCategoryHint', 'Click to add an observation chip to {cat}')).replace('{cat}', group.type);
          sectionTag.innerHTML = `${escapeHtml(group.type)} <img src="../assets/icons/plus.svg" class="btn-icon" alt="" style="width:10px;height:10px;vertical-align:-1px;margin-left:3px;opacity:0.85;" />`;
          inlineGroup.appendChild(sectionTag);

          sectionTag.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openQuickAddChipPopup({
              section,
              categoryName: group.type,
              block: block || checklist.closest('.note-section'),
              secColor
            });
          });

          inlineGroup.addEventListener("dragover", e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          });

          inlineGroup.addEventListener("drop", async e => {
            e.preventDefault();
            const rawData = e.dataTransfer.getData("text/plain");
            if (!rawData) return;
            try {
              const data = JSON.parse(rawData);
              if (data && data.chipName && data.category) {
                if (e.target === inlineGroup || e.target === sectionTag || sectionTag.contains(e.target)) {
                  const targetIndex = group.items.length;
                  await reorderObservationChip(
                    _activeChipBankFilename,
                    data.category,
                    data.chipName,
                    group.type,
                    targetIndex,
                    data.section || section.label,
                    section.label
                  );
                  if (typeof sortSectionChecklistByBank === 'function') {
                    section.checklist = sortSectionChecklistByBank(section.checklist, _activeChipBankFilename);
                  }
                  refreshObservationChecklists();
                  autoSaveStudentModal(false);
                }
              }
            } catch (_) {}
          });

          group.items.forEach((name, chipIdx) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "note-checklist-chip";
            chip.draggable = true;
            chip.dataset.category = group.type;
            chip.dataset.chipName = name;
            chip.dataset.chipIndex = String(chipIdx);

            const initialParsed = chipMap.get(name.toLowerCase());
            let currentCount = initialParsed ? initialParsed.count : 0;
            let currentRemarks = (initialParsed && Array.isArray(initialParsed.remarks)) ? initialParsed.remarks.map(r => ({ ...r })) : [];
            let currentComment = (initialParsed && initialParsed.comment) ? initialParsed.comment : formatChipRemarksString(currentRemarks);

            const saveChipState = (count, comment, remarks) => {
              const currentMap = new Map();
              sectionChecklistSummary(section).forEach(item => {
                const p = parseObservationChipItem(item);
                if (p.name) currentMap.set(p.name.toLowerCase(), p);
              });
              const formattedComment = Array.isArray(remarks)
                ? formatChipRemarksString(remarks)
                : String(comment || '').trim();
              if (count <= 0) {
                currentMap.delete(name.toLowerCase());
              } else {
                currentMap.set(name.toLowerCase(), { name, count, comment: formattedComment });
              }
              const formattedList = Array.from(currentMap.values()).map(v => formatObservationChipItem(v.name, v.count, v.comment));
              section.checklist = typeof sortSectionChecklistByBank === 'function'
                ? sortSectionChecklistByBank(formattedList, _activeChipBankFilename)
                : formattedList;
            };

            const updateChipVisual = (count, comment, remarks) => {
              const isSelected = count > 0;
              const resolvedRemarks = Array.isArray(remarks) ? remarks : parseChipRemarksString(comment || '');
              const resolvedComment = formatChipRemarksString(resolvedRemarks);
              const hasTextComment = isSelected && resolvedRemarks.some(r => (r.text && r.text.trim()) || (r.num && r.num.trim()));

              chip.classList.toggle("selected", isSelected);
              chip.classList.toggle("has-comment", hasTextComment);
              chip.setAttribute("aria-pressed", isSelected ? "true" : "false");

              const thickness = getChipUnderlineThickness(count);
              const displayLabel = resolveChipDisplayLabel(name, _activeChipBankFilename);
              const nameSpan = (isSelected && thickness !== '0px')
                ? `<span class="chip-label-text" style="text-decoration:underline;text-decoration-thickness:${thickness};text-underline-offset:2px;">${escapeHtml(displayLabel)}</span>`
                : `<span class="chip-label-text">${escapeHtml(displayLabel)}</span>`;
              const hasAnyText = isSelected && resolvedRemarks.some(r => r.text && r.text.trim());
              const numsOnly = isSelected && !hasAnyText
                ? resolvedRemarks.map(r => (r.num || '').trim()).filter(Boolean)
                : [];
              let commentBadge = '';
              if (numsOnly.length > 0) {
                const numsText = numsOnly.map(n => `[${n}]`).join(' ');
                commentBadge = `<span class="chip-comment-badge">${escapeHtml(numsText)}</span>`;
              } else if (hasTextComment) {
                commentBadge = `<span class="chip-comment-badge"><img src="../assets/icons/comments.svg" class="chip-comment-icon" alt="" style="width:8px;height:8px;vertical-align:middle;display:inline-block;" /></span>`;
              }

              chip.innerHTML = `${nameSpan}${commentBadge}`;

              const countPart = count > 1 ? ` {purple:(×${count})}` : '';
              const hintKey = hasTextComment ? 'gsChipClickHintWithComment' : 'gsChipClickHintWithoutComment';
              const defaultHint = hasTextComment
                ? '{green:**Left-click:**} + · {red:**Right-click:**} -\n{blue:**Shift-click:**} *edit note*'
                : '{green:**Left-click:**} + · {red:**Right-click:**} -\n{blue:**Shift-click:**} *add note*';
              const hintText = t(hintKey, defaultHint);
              const metaLine = isSelected
                ? `{muted:*${group.type}*}`
                : `{muted:*${group.type}* · *${t('gsDragToReorder', 'Drag to reorder')}*}`;
              const commentLine = hasTextComment ? `\n{amber:**Note:** *${resolvedComment}*}` : '';
              const accent = /pos|strength|good|pro|plus/i.test(group.type)
                ? 'green'
                : (/neg|weak|issue|err|cons|minus/i.test(group.type) ? 'red' : (isSelected ? 'blue' : 'amber'));

              chip.removeAttribute('title');
              chip.setAttribute('data-hover-help-title', `${name}${countPart}`);
              chip.setAttribute('data-hover-help', `${metaLine}${commentLine}\n${hintText}`);
              chip.setAttribute('data-hover-help-accent', accent);
            };

            chip._updateDisplayLabel = () => {
              const lblEl = chip.querySelector('.chip-label-text');
              if (lblEl) {
                lblEl.textContent = resolveChipDisplayLabel(name, _activeChipBankFilename);
              }
            };

            const handleCommentEdit = (focusIndex = -1) => {
              if (currentCount === 0) {
                currentCount = 1;
                saveChipState(currentCount, currentComment, currentRemarks);
                updateChipVisual(currentCount, currentComment, currentRemarks);
              }
              openChipCommentPopup({
                chipName: name,
                category: group.type,
                section,
                currentCount,
                currentComment,
                currentRemarks,
                focusIndex,
                secColor,
                onSave: (newComment, newRemarks) => {
                  currentRemarks = Array.isArray(newRemarks) ? newRemarks : parseChipRemarksString(newComment);
                  currentComment = formatChipRemarksString(currentRemarks);
                  saveChipState(currentCount, currentComment, currentRemarks);
                  updateChipVisual(currentCount, currentComment, currentRemarks);
                  autoSaveStudentModal(false);
                }
              });
            };

            updateChipVisual(currentCount, currentComment, currentRemarks);

            let isDragging = false;

            chip.addEventListener("dragstart", e => {
              isDragging = true;
              chip.classList.add("dragging");
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", JSON.stringify({
                section: section.label || '',
                category: group.type,
                chipName: name,
                index: chipIdx
              }));
            });

            chip.addEventListener("dragend", () => {
              chip.classList.remove("dragging");
              document.querySelectorAll(".note-checklist-chip.drag-over-left, .note-checklist-chip.drag-over-right").forEach(el => {
                el.classList.remove("drag-over-left", "drag-over-right");
              });
              setTimeout(() => { isDragging = false; }, 60);
            });

            chip.addEventListener("dragover", e => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              const rect = chip.getBoundingClientRect();
              const midX = rect.left + rect.width / 2;
              if (e.clientX < midX) {
                chip.classList.add("drag-over-left");
                chip.classList.remove("drag-over-right");
              } else {
                chip.classList.add("drag-over-right");
                chip.classList.remove("drag-over-left");
              }
            });

            chip.addEventListener("dragleave", e => {
              if (!chip.contains(e.relatedTarget)) {
                chip.classList.remove("drag-over-left", "drag-over-right");
              }
            });

            chip.addEventListener("drop", async e => {
              e.preventDefault();
              e.stopPropagation();
              chip.classList.remove("drag-over-left", "drag-over-right");
              const rawData = e.dataTransfer.getData("text/plain");
              if (!rawData) return;
              try {
                const data = JSON.parse(rawData);
                if (data && data.chipName && data.category) {
                  const rect = chip.getBoundingClientRect();
                  const midX = rect.left + rect.width / 2;
                  let targetIdx = chipIdx;
                  if (e.clientX >= midX) targetIdx = chipIdx + 1;
                  const isSameCategoryAndSection = (data.category === group.type) && (!data.section || !section.label || data.section.toLowerCase() === section.label.toLowerCase());
                  if (isSameCategoryAndSection && data.index < targetIdx) targetIdx--;
                  if (isSameCategoryAndSection && data.index === targetIdx) return;
                  await reorderObservationChip(
                    _activeChipBankFilename,
                    data.category,
                    data.chipName,
                    group.type,
                    targetIdx,
                    data.section || section.label,
                    section.label
                  );
                  if (typeof sortSectionChecklistByBank === 'function') {
                    section.checklist = sortSectionChecklistByBank(section.checklist, _activeChipBankFilename);
                  }
                  refreshObservationChecklists();
                  autoSaveStudentModal(false);
                }
              } catch (_) {}
            });

            chip.addEventListener("click", (e) => {
              if (isDragging) return;
              if (e.shiftKey || (e.target && e.target.closest && e.target.closest('.chip-comment-badge'))) {
                e.preventDefault();
                e.stopPropagation();
                handleCommentEdit();
                return;
              }
              currentCount = currentCount === 0 ? 1 : Math.min(4, currentCount + 1);
              saveChipState(currentCount, currentComment, currentRemarks);
              updateChipVisual(currentCount, currentComment, currentRemarks);
              autoSaveStudentModal(false);
            });

            chip.addEventListener("contextmenu", e => {
              e.preventDefault();
              e.stopPropagation();
              if (isDragging) return;
              const hasRemarks = currentRemarks.some(r => (r.text && r.text.trim()) || (r.num && r.num.trim()));
              openChipContextMenu({
                x: e.clientX,
                y: e.clientY,
                chipName: name,
                currentCount,
                hasRemarks,
                onEditNotes: () => handleCommentEdit(),
                onAddAutoNumber: () => {
                  if (currentCount === 0) {
                    currentCount = 1;
                  }
                  const nextNum = String(getNextObservationRemarkNumber(
                    (typeof _studentModalDraft !== 'undefined' && _studentModalDraft && _studentModalDraft.draftSections) || (section ? [section] : []),
                    currentRemarks
                  ));
                  currentRemarks.push({ num: nextNum, text: '' });
                  currentComment = formatChipRemarksString(currentRemarks);
                  if (typeof _studentModalDraft !== 'undefined' && _studentModalDraft) {
                    const n = parseInt(nextNum, 10);
                    if (!isNaN(n) && n > (_studentModalDraft.maxRemarkNum || 0)) {
                      _studentModalDraft.maxRemarkNum = n;
                    }
                  }
                  saveChipState(currentCount, currentComment, currentRemarks);
                  updateChipVisual(currentCount, currentComment, currentRemarks);
                  autoSaveStudentModal(false);
                },
                onAddOne: () => {
                  currentCount = currentCount === 0 ? 1 : Math.min(4, currentCount + 1);
                  saveChipState(currentCount, currentComment, currentRemarks);
                  updateChipVisual(currentCount, currentComment, currentRemarks);
                  autoSaveStudentModal(false);
                },
                onRemoveOne: () => {
                  if (currentCount <= 0) return;
                  currentCount -= 1;
                  if (currentCount <= 0) {
                    currentCount = 0;
                    currentComment = '';
                    currentRemarks = [];
                  }
                  saveChipState(currentCount, currentComment, currentRemarks);
                  updateChipVisual(currentCount, currentComment, currentRemarks);
                  autoSaveStudentModal(false);
                },
                onClearChip: () => {
                  currentCount = 0;
                  currentComment = '';
                  currentRemarks = [];
                  saveChipState(currentCount, currentComment, currentRemarks);
                  updateChipVisual(currentCount, currentComment, currentRemarks);
                  autoSaveStudentModal(false);
                }
              });
            });

            inlineGroup.appendChild(chip);
          });
          checklist.appendChild(inlineGroup);
        });
        return checklist;
      }

      function updateSectionAppearance(block, section) {
        const { color: secColor, groups } = getGroupsForSection(section.label);
        const secLower = String(section.label || '').toLowerCase();
        let borderLeftColor = secColor;
        block.classList.remove("kind-good-points", "kind-to-remedy");
        if (!borderLeftColor) {
          if (secLower.includes("good") || secLower.includes("fort")) {
            block.classList.add("kind-good-points");
            borderLeftColor = "#16a34a";
          } else if (secLower.includes("remedy") || secLower.includes("improv") || secLower.includes("faible")) {
            block.classList.add("kind-to-remedy");
            borderLeftColor = "#dc2626";
          } else if (secLower.includes("action") || secLower.includes("plan")) {
            borderLeftColor = "#d97706";
          } else {
            borderLeftColor = "#0284c7";
          }
        }
        if (borderLeftColor) {
          block.style.borderLeft = `4px solid ${borderLeftColor}`;
        }

        const existingCl = block.querySelector(".note-checklist");
        if (existingCl) existingCl.remove();
        const cl = buildChecklistElement(section, block);
        const mdWrap = block.querySelector(".note-section-md-wrap") || block.querySelector(".note-section-body");
        if (cl) {
          if (mdWrap && mdWrap.parentElement === block) {
            block.insertBefore(cl, mdWrap);
          } else if (mdWrap && mdWrap.parentElement) {
            mdWrap.parentElement.insertBefore(cl, mdWrap);
          } else {
            block.appendChild(cl);
          }
        }
        const ta = block.querySelector(".note-section-body");
        if (ta) {
          ta.placeholder = cl ? t('gsPlaceholderAddNotes') : t('gsPlaceholderObservation');
        }
      }

      function refreshObservationChecklists() {
        const blocks = noteSectionsWrap.querySelectorAll(".note-section");
        draftSections.forEach((s, idx) => {
          const block = blocks[idx];
          if (block) {
            updateSectionAppearance(block, s);
          }
        });
      }

      const addBtn = document.createElement("button");
      addBtn.innerHTML = '<img src="../assets/icons/plus.svg" class="btn-icon" alt="" /> ' + t('gsBtnAddSection');
      addBtn.className = "btn note-add-btn";
      noteBankWrap.appendChild(addBtn);

      function addNoteBlock(section) {
        const block = document.createElement("div");
        block.className = "note-section";
        const { color: secColor, groups } = getGroupsForSection(section.label);
        const secLower = String(section.label || '').toLowerCase();
        let borderLeftColor = secColor;
        if (!borderLeftColor) {
          if (secLower.includes("good") || secLower.includes("fort")) {
            block.classList.add("kind-good-points");
            borderLeftColor = "#16a34a";
          } else if (secLower.includes("remedy") || secLower.includes("improv") || secLower.includes("faible")) {
            block.classList.add("kind-to-remedy");
            borderLeftColor = "#dc2626";
          } else if (secLower.includes("action") || secLower.includes("plan")) {
            borderLeftColor = "#d97706";
          } else {
            borderLeftColor = "#0284c7";
          }
        }
        if (borderLeftColor) {
          block.style.borderLeft = `4px solid ${borderLeftColor}`;
        }

        const header = document.createElement("div");
        header.className = "note-section-header";
        const labelInput = document.createElement("input");
        labelInput.type = "text";
        labelInput.className = "note-section-label";
        labelInput.value = section.label;
        labelInput.placeholder = t('gsPlaceholderSection');
        labelInput.addEventListener("input", () => {
          section.label = labelInput.value;
          updateSectionAppearance(block, section);
          autoSaveStudentModal(true);
        });
        labelInput.addEventListener("blur", flushStudentModalAutoSave);

        const delBtn = document.createElement("button");
        delBtn.innerHTML = '<img src="../assets/icons/close.svg" class="btn-icon" alt="" />';
        delBtn.className = "note-section-del";
        delBtn.addEventListener("click", () => {
          const idx = draftSections.indexOf(section);
          if (idx !== -1) draftSections.splice(idx, 1);
          block.remove();
          autoSaveStudentModal(false);
        });

        header.appendChild(labelInput);
        header.appendChild(delBtn);
        block.appendChild(header);

        const checklist = buildChecklistElement(section, block);
        if (checklist) {
          block.appendChild(checklist);
        }

        // Build markdown editor widget for the note textarea
        const mdNoteWrap = document.createElement('div');
        mdNoteWrap.className = 'md-field-wrap note-section-md-wrap';
        const mdNoteToggleRow = document.createElement('div');
        mdNoteToggleRow.className = 'md-toggle-row';
        const mdNoteWriteBtn = document.createElement('button');
        mdNoteWriteBtn.type = 'button'; mdNoteWriteBtn.className = 'md-toggle-btn active';
        mdNoteWriteBtn.textContent = t('mdbMdWrite', 'Write');
        const mdNotePreviewBtn = document.createElement('button');
        mdNotePreviewBtn.type = 'button'; mdNotePreviewBtn.className = 'md-toggle-btn';
        mdNotePreviewBtn.textContent = t('mdbMdPreview', 'Preview');
        mdNoteToggleRow.append(mdNoteWriteBtn, mdNotePreviewBtn);
        const ta = document.createElement("textarea");
        ta.className = "note-section-body md-textarea";
        ta.value = section.text || "";
        ta.placeholder = checklist ? t('gsPlaceholderAddNotes') : t('gsPlaceholderObservation');
        ta.addEventListener("input", () => { section.text = ta.value; autoResizeTextarea(ta); autoSaveStudentModal(true); });
        ta.addEventListener("blur", flushStudentModalAutoSave);
        const mdNotePreview = document.createElement('div');
        mdNotePreview.className = 'md-preview-pane hidden';
        mdNoteWriteBtn.addEventListener('click', function() {
          mdNoteWriteBtn.classList.add('active'); mdNotePreviewBtn.classList.remove('active');
          ta.classList.remove('hidden'); mdNotePreview.classList.add('hidden'); ta.focus();
        });
        mdNotePreviewBtn.addEventListener('click', function() {
          mdNotePreviewBtn.classList.add('active'); mdNoteWriteBtn.classList.remove('active');
          mdNotePreview.innerHTML = renderMd(ta.value || '');
          ta.classList.add('hidden'); mdNotePreview.classList.remove('hidden');
        });
        mdNoteWrap.append(mdNoteToggleRow, ta, mdNotePreview);
        block.appendChild(mdNoteWrap);
        noteSectionsWrap.appendChild(block);
        autoResizeTextarea(ta);
      }

      function renderNoteSections() {
        noteSectionsWrap.querySelectorAll(".note-section").forEach(b => b.remove());
        draftSections.forEach(s => addNoteBlock(s));
      }

      addBtn.addEventListener("click", () => {
        const s = { label: "", text: "", checklist: [] };
        draftSections.push(s);
        addNoteBlock(s);
        autoSaveStudentModal(false);
      });

      renderNoteSections();
      noteSection.appendChild(noteSectionsWrap);
      overviewGrid.appendChild(noteSection);

      // — Criteria —
      if (config.criteria.length > 0) {
        const critSection = document.createElement("div");
        critSection.className = "smod-section smod-pane smod-pane-criteria";
        const critTitle = document.createElement("div");
        critTitle.className = "smod-section-title";
        critTitle.textContent = t('gsStudentCriteriaTitle');
        critSection.appendChild(critTitle);

        const table = document.createElement("table");
        table.className = "smod-criteria-table";
        const thead = document.createElement("thead");
        const hr = document.createElement("tr");
        ["Criterion", "Points", "Comment"].forEach(h => {
          const th = document.createElement("th");
          th.textContent = h;
          hr.appendChild(th);
        });
        thead.appendChild(hr);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const commentEls = {};
        const sentencePickerEls = {};
        config.criteria.forEach(criterion => {
          const dr = draftCriteria[criterion.id];
          const tr2 = document.createElement("tr");

          const tdName = document.createElement("td");
          tdName.className = "smod-crit-name-cell";
          const nameWrap = document.createElement("div");
          nameWrap.className = "smod-crit-name-wrap";

          const nameSpan = document.createElement("span");
          nameSpan.className = "smod-crit-name-text";
          nameSpan.textContent = criterion.name;
          nameWrap.appendChild(nameSpan);

          const decBtn = document.createElement("button");
          decBtn.type = "button";
          decBtn.className = "smod-crit-decisions-btn";
          decBtn.title = t('gsCritMarkingDecisions', 'Marking Decisions');

          const inlineDecsWrap = document.createElement("div");
          inlineDecsWrap.className = "smod-crit-inline-decisions";

          function updateCritDecisions() {
            const curYear = classObj?.year || (typeof CLASS_GROUPS !== 'undefined' ? CLASS_GROUPS.activeYear : '') || '';
            const curSem = sem || (typeof appState !== 'undefined' && appState.activeSemester) || (classObj && classObj.semester) || '';
            const critBankFn = getTestCriteriaBankFilename(classObj, config);
            const decInfo = findScoringDecisionsEntry({
              classTitle: classObj ? classObj.name : '',
              testName: config ? config.testName : '',
              criterionName: criterion.name,
              year: curYear,
              semester: curSem,
              testDate: config ? config.testDate : '',
              bankFilename: critBankFn
            });
            const critRules = (decInfo.rules || []).filter(r => r && String(r).trim().length > 0);
            if (critRules.length > 0) {
              decBtn.classList.add("has-decisions");
              if (decInfo.isCohort) {
                decBtn.classList.add("is-cohort");
                const syncMsg = (typeof tFmt === 'function' ? tFmt('gsCohortSyncWith', { class: decInfo.matchedClass }) : null) || `Cohort synced with ${decInfo.matchedClass}`;
                decBtn.title = `${t('gsCritMarkingDecisions', 'Marking Decisions')} (${syncMsg})`;
              } else {
                decBtn.classList.remove("is-cohort");
                decBtn.title = t('gsCritMarkingDecisions', 'Marking Decisions');
              }
              decBtn.textContent = `? ${critRules.length}`;
            } else {
              decBtn.classList.remove("has-decisions", "is-cohort");
              decBtn.title = t('gsCritMarkingDecisions', 'Marking Decisions');
              decBtn.textContent = "+";
            }

            inlineDecsWrap.innerHTML = "";
            if (critRules.length > 0) {
              inlineDecsWrap.style.display = "flex";
              if (decInfo.isCohort) {
                inlineDecsWrap.classList.add("is-cohort");
              } else {
                inlineDecsWrap.classList.remove("is-cohort");
              }

              critRules.forEach((ruleText, idx) => {
                const item = document.createElement("div");
                item.className = "smod-crit-inline-decision-item";
                item.title = t('gsInlineDecisionClickToComment', "Click to insert into comment (or click button above to edit)");

                const num = document.createElement("span");
                num.className = "smod-crit-inline-decision-num";
                num.textContent = `${idx + 1}.`;

                const text = document.createElement("span");
                text.className = "smod-crit-inline-decision-text";
                text.textContent = ruleText;

                item.appendChild(num);
                item.appendChild(text);

                item.addEventListener("click", (e) => {
                  e.stopPropagation();
                  const commentTa = commentEls[criterion.id];
                  if (commentTa) {
                    const cur = commentTa.value.trim();
                    const trimmedRule = String(ruleText || '').trim();
                    if (trimmedRule) {
                      commentTa.value = cur ? `${cur}\n• ${trimmedRule}` : `• ${trimmedRule}`;
                      commentTa.dispatchEvent(new Event("input", { bubbles: true }));
                      if (typeof showToast === 'function') {
                        showToast(t('gsDecisionInserted', 'Inserted into comment'));
                      }
                    }
                  }
                });

                inlineDecsWrap.appendChild(item);
              });
            } else {
              inlineDecsWrap.style.display = "none";
            }
          }
          updateCritDecisions();

          decBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openCriterionDecisionsPopover({
              buttonEl: decBtn,
              criterion,
              classObj,
              config,
              commentTextarea: commentEls[criterion.id],
              onUpdate: updateCritDecisions
            });
          });

          nameWrap.appendChild(decBtn);
          tdName.appendChild(nameWrap);
          tdName.appendChild(inlineDecsWrap);

          const tdPts = document.createElement("td");
          const ptsCellWrap = document.createElement("div");
          ptsCellWrap.className = "smod-pts-cell";

          const resolved = resolveCriterionProps(criterion);
          const minPts = resolved.minPoints;
          const maxPts = resolved.maxPoints;
          const critInterval = resolved.interval;

          const ptsInput = document.createElement("input");
          ptsInput.type = "number";
          ptsInput.step = String(critInterval); ptsInput.min = String(minPts);
          ptsInput.max = String(maxPts);
          ptsInput.placeholder = tFmt('gsPtsPlaceholder', { min: fmtN(minPts), max: fmtN(maxPts) });
          ptsInput.value = dr.points == null ? "" : String(dr.points);

          const ptsSlider = document.createElement("input");
          ptsSlider.type = "range";
          ptsSlider.step = String(critInterval); ptsSlider.min = String(minPts);
          ptsSlider.max = String(maxPts);
          ptsSlider.value = dr.points == null ? String(minPts) : String(dr.points);

          const datalistId = `smod-pts-datalist-${criterion.id}-${Math.random().toString(36).substring(2, 7)}`;
          const datalist = document.createElement("datalist");
          datalist.id = datalistId;

          const range = Math.max(0, maxPts - minPts);
          let tickStep = 1;
          if (range > 30) tickStep = 5;
          else if (range > 15) tickStep = 2;
          else if (range > 8) tickStep = 1;
          else tickStep = 0.5;

          for (let v = minPts; v <= maxPts; v += tickStep) {
            const opt = document.createElement("option");
            opt.value = String(v);
            datalist.appendChild(opt);
          }
          if (maxPts > minPts && (maxPts - minPts) % tickStep !== 0) {
            const opt = document.createElement("option");
            opt.value = String(maxPts);
            datalist.appendChild(opt);
          }

          const sliderGradient = buildCriterionSliderGradient(criterion, minPts, maxPts, config, classObj);
          ptsSlider.style.setProperty("background", sliderGradient, "important");
          ptsSlider.style.setProperty("background-image", sliderGradient, "important");

          const sliderWrap = document.createElement("div");
          sliderWrap.className = "smod-pts-slider-wrap";

          const gradeStops = getCriterionGradeStops(criterion, minPts, maxPts, config, classObj);
          const notchesTrack = document.createElement("div");
          notchesTrack.className = "smod-pts-notches-track";
          const notchEls = [];

          gradeStops.forEach(stop => {
            const notch = document.createElement("div");
            notch.className = "smod-pts-notch";
            notch.style.left = `calc(9px + (100% - 18px) * ${stop.ratio})`;
            notch.style.setProperty("--notch-color", stop.color);
            const textColor = getNotchContrastTextColor(stop.color);
            notch.style.setProperty("--notch-text-color", textColor);
            notch.title = (stop.key !== fmtN(stop.ptsValue)) ? `${stop.key} (${fmtN(stop.ptsValue)} pts)` : `${fmtN(stop.ptsValue)} pts`;

            const pip = document.createElement("span");
            pip.className = "smod-pts-notch-pip";

            const label = document.createElement("span");
            label.className = "smod-pts-notch-label";
            label.textContent = stop.key;

            notch.appendChild(pip);
            notch.appendChild(label);

            notch.addEventListener("click", (e) => {
              e.stopPropagation();
              ptsSlider.value = String(stop.ptsValue);
              ptsInput.value = String(stop.ptsValue);
              applyPtsValue(stop.ptsValue);
              autoSaveStudentModal(false);
            });

            notchesTrack.appendChild(notch);
            notchEls.push({ stop, el: notch });
          });

          sliderWrap.appendChild(ptsSlider);
          sliderWrap.appendChild(notchesTrack);

          const tdComment = document.createElement("td");
          const sentencePicker = document.createElement("div");
          sentencePicker.className = "smod-sentence-picker";
          sentencePickerEls[criterion.id] = sentencePicker;
          // Markdown editor widget for criterion comment
          const mdCommentWrap = buildMdEditorWidget(
            '', dr.comment || '', t('gsPlaceholderComment'), 2
          );
          mdCommentWrap.style.cssText = 'width:100%;';
          const commentTa = mdCommentWrap.querySelector('textarea');
          commentTa.addEventListener("input", () => {
            dr.comment = commentTa.value;
            autoSaveStudentModal(true);
          });
          commentTa.addEventListener("blur", flushStudentModalAutoSave);
          commentEls[criterion.id] = commentTa;
          tdComment.appendChild(sentencePicker);
          tdComment.appendChild(mdCommentWrap);

          function applyPtsValue(val, isInitial = false) {
            const raw = toNumber(String(val));
            dr.points = raw == null ? null : Math.max(minPts, Math.min(maxPts, raw));

            // Dynamically update thumb accent, border, and input highlight to match selected grade band
            const resolvedCrit = resolveCriterionProps(criterion, config, classObj);
            const key = nearestCriterionGradeKey(resolvedCrit, null, dr.points, minPts, maxPts);
            const activeColor = lookupColorInMap(resolvedCrit.colors, key) ||
                                (resolvedCrit.xlsm && lookupColorInMap(resolvedCrit.xlsm.colors, key)) ||
                                lookupColorInMap(criterion && criterion.colors, key) ||
                                getScaleGradeColor(key) ||
                                getDefaultGradeColor(key);
            if (activeColor) {
              ptsSlider.style.color = activeColor;
              ptsSlider.style.accentColor = activeColor;
              ptsInput.style.borderColor = activeColor;
              ptsInput.style.boxShadow = `0 0 0 1px ${activeColor}40`;
              ptsInput.style.backgroundColor = `${activeColor}0d`;
            } else {
              ptsSlider.style.color = "";
              ptsSlider.style.accentColor = "";
              ptsInput.style.borderColor = "";
              ptsInput.style.boxShadow = "";
              ptsInput.style.backgroundColor = "";
            }

            notchEls.forEach(({ stop, el }) => {
              el.classList.toggle("active", stop.key === key);
            });

            // Auto-fill comment as selectable sentence chips matching slider point value
            if (dr.points != null && maxPts >= minPts) {
              const auto = (resolvedCrit.comments && resolvedCrit.comments[key]) ||
                           (criterion.comments && criterion.comments[key]) ||
                           (resolvedCrit.xlsm && resolvedCrit.xlsm.comments && resolvedCrit.xlsm.comments[key]) ||
                           xlsmCommentForGrade(criterion.name, null, dr.points, minPts, maxPts) || "";

              if (auto && sentencePickerEls[criterion.id]) {
                const ta = commentEls[criterion.id];
                const picker = sentencePickerEls[criterion.id];
                picker.innerHTML = "";
                const sentences = splitIntoSentences(auto);

                const currentComment = dr.comment || ta.value || "";
                let selected = new Set(sentences.filter(s => currentComment.includes(s)));

                function addSentenceToText(currentText, sentenceToAdd) {
                  const s = String(sentenceToAdd || "").trim();
                  if (!s) return currentText || "";
                  let txt = String(currentText || "").trim();
                  if (!txt) return s;
                  if (txt.includes(s)) return txt;
                  return `${txt} ${s}`;
                }

                function removeSentenceFromText(currentText, sentenceToRemove) {
                  const s = String(sentenceToRemove || "").trim();
                  if (!s) return currentText || "";
                  let txt = String(currentText || "");
                  if (!txt.includes(s)) return txt.trim();
                  txt = txt.replace(s, "");
                  return txt.replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+|[ \t]+$/g, "").trim();
                }

                function syncPickerFromText() {
                  const cur = ta.value || "";
                  selected.clear();
                  sentences.forEach(s => {
                    if (cur.includes(s)) selected.add(s);
                  });
                  sentenceBtns.forEach(({ sentence, btn }) => {
                    updateChipVisual(btn, selected.has(sentence));
                  });
                  refreshAllChip();
                }

                function refreshAllChip() {
                  const allOn = sentences.length > 0 && selected.size === sentences.length;
                  const anyOn = selected.size > 0;
                  allChip.classList.toggle("selected", allOn);
                  allChip.classList.toggle("partial", anyOn && !allOn);
                  allChip.setAttribute("aria-pressed", allOn ? "true" : "false");
                  if (allOn && activeColor) {
                    allChip.style.background = activeColor;
                    allChip.style.borderColor = activeColor;
                    allChip.style.color = getNotchContrastTextColor(activeColor);
                  } else {
                    allChip.style.background = "";
                    allChip.style.borderColor = "";
                    allChip.style.color = "";
                  }
                }

                function updateChipVisual(chip, on) {
                  chip.classList.toggle("selected", on);
                  chip.setAttribute("aria-pressed", on ? "true" : "false");
                  if (on && activeColor) {
                    chip.style.background = activeColor;
                    chip.style.borderColor = activeColor;
                    chip.style.color = getNotchContrastTextColor(activeColor);
                  } else {
                    chip.style.background = "";
                    chip.style.borderColor = "";
                    chip.style.color = "";
                  }
                }

                const allChip = document.createElement("button");
                allChip.type = "button";
                allChip.className = "smod-sentence-chip smod-sentence-chip-all";
                allChip.textContent = t('gsStudentAllChip');
                allChip.addEventListener("click", () => {
                  const shouldSelectAll = selected.size !== sentences.length;
                  let cur = ta.value || "";
                  if (shouldSelectAll) {
                    sentences.forEach(s => {
                      if (!selected.has(s)) {
                        cur = addSentenceToText(cur, s);
                        selected.add(s);
                      }
                    });
                  } else {
                    sentences.forEach(s => {
                      if (selected.has(s)) {
                        cur = removeSentenceFromText(cur, s);
                        selected.delete(s);
                      }
                    });
                  }
                  ta.value = cur;
                  dr.comment = cur;
                  sentenceBtns.forEach(({ sentence, btn }) => {
                    updateChipVisual(btn, selected.has(sentence));
                  });
                  refreshAllChip();
                  autoSaveStudentModal(false);
                });
                picker.appendChild(allChip);

                const sentenceBtns = [];

                sentences.forEach(sentence => {
                  const chip = document.createElement("button");
                  chip.type = "button";
                  chip.className = "smod-sentence-chip";
                  chip.textContent = sentence;
                  chip.title = sentence;
                  const on = selected.has(sentence);
                  updateChipVisual(chip, on);
                  chip.addEventListener("click", () => {
                    let cur = ta.value || "";
                    if (selected.has(sentence)) {
                      selected.delete(sentence);
                      cur = removeSentenceFromText(cur, sentence);
                    } else {
                      selected.add(sentence);
                      cur = addSentenceToText(cur, sentence);
                    }
                    ta.value = cur;
                    dr.comment = cur;
                    updateChipVisual(chip, selected.has(sentence));
                    refreshAllChip();
                    autoSaveStudentModal(false);
                  });
                  sentenceBtns.push({ sentence, btn: chip });
                  picker.appendChild(chip);
                });

                ta.addEventListener("input", syncPickerFromText);
                refreshAllChip();
              } else if (sentencePickerEls[criterion.id]) {
                sentencePickerEls[criterion.id].innerHTML = "";
              }
            }

            if (!isInitial) {
              if (_studentModalDraft) _studentModalDraft.criteriaPointsChanged = true;
              if (!draftOverrideEnabled) {
                const autoGrade = computeDraftAutoGrade();
                draftGrade = autoGrade;
                gradeInput.value = autoGrade == null ? "" : String(autoGrade);
              }
              updateSmodGradeIndicators();
            }
          }

          ptsInput.addEventListener("input", () => {
            applyPtsValue(ptsInput.value);
            if (ptsInput.value !== "") ptsSlider.value = ptsInput.value;
            autoSaveStudentModal(true);
          });
          ptsInput.addEventListener("blur", flushStudentModalAutoSave);

          ptsSlider.addEventListener("input", () => {
            ptsInput.value = ptsSlider.value;
            applyPtsValue(ptsSlider.value);
            autoSaveStudentModal(true);
          });
          ptsSlider.addEventListener("change", () => {
            autoSaveStudentModal(false);
          });

          if (dr.points != null) {
            applyPtsValue(dr.points, true);
          }

          ptsCellWrap.appendChild(ptsInput);
          ptsCellWrap.appendChild(sliderWrap);
          ptsCellWrap.appendChild(datalist);
          tdPts.appendChild(ptsCellWrap);

          [tdName, tdPts, tdComment].forEach(td => tr2.appendChild(td));
          tbody.appendChild(tr2);
        });
        table.appendChild(tbody);
        critSection.appendChild(table);
        overviewGrid.appendChild(critSection);
      }

      body.appendChild(overviewGrid);

      // — Time spent correcting (auto, compact pill in footer) —
      const corrTimePill = document.getElementById("student-modal-corr-time");
      if (corrTimePill) {
        if (prevCorrTime != null) {
          corrTimePill.textContent = t('gsStudentCorrTimeTitle') + ': ' + tFmt('gsStudentCorrTimePrev', { n: formatCorrectionTime(prevCorrTime) });
          corrTimePill.classList.remove("hidden");
        } else {
          corrTimePill.textContent = "";
          corrTimePill.classList.add("hidden");
        }
      }

      document.getElementById("student-modal-overlay").classList.remove("hidden");
      if (window.cmtPushEscapeHandler) {
        if (_studentModalUnregEscape) _studentModalUnregEscape();
        _studentModalUnregEscape = window.cmtPushEscapeHandler({
          el: document.getElementById("student-modal-overlay"),
          close: closeStudentModal
        });
      }
      syncGradeEditability();
      if (gradeInput) gradeInput.focus();
    }

    let _studentModalAutoSaveTimer = null;

    function flushStudentModalAutoSave() {
      if (_studentModalAutoSaveTimer) {
        clearTimeout(_studentModalAutoSaveTimer);
        _studentModalAutoSaveTimer = null;
        persistStudentModalDraft(false);
      }
    }

    function autoSaveStudentModal(debounce = false) {
      if (!_studentModalDraft) return;
      if (_studentModalAutoSaveTimer) {
        clearTimeout(_studentModalAutoSaveTimer);
        _studentModalAutoSaveTimer = null;
      }
      if (debounce) {
        _studentModalAutoSaveTimer = setTimeout(() => {
          _studentModalAutoSaveTimer = null;
          persistStudentModalDraft(false);
        }, 200);
      } else {
        persistStudentModalDraft(false);
      }
    }

    function persistStudentModalDraft(updateCorrectionTime = false) {
      if (!_studentModalDraft) return;
      const { student, classObj, sem, testIndex, tr, config, draftSections, draftCriteria, draftOverrideEnabled, modalOpenedAt } = _studentModalDraft;

      // Write grade
      const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
      const gradeEl = document.querySelector("#student-modal-body .smod-grade-input");
      if (!student.gradeOverrides) student.gradeOverrides = { sem1: Array(TEST_COUNT_PER_SEM).fill(false), sem2: Array(TEST_COUNT_PER_SEM).fill(false) };
      if (!Array.isArray(student.gradeOverrides[sem])) student.gradeOverrides[sem] = Array(TEST_COUNT_PER_SEM).fill(false);
      student.gradeOverrides[sem][testIndex] = !!draftOverrideEnabled;
      if (student.gradeOverrides[sem][testIndex]) {
        if (gradeEl && gradeEl.value !== "") sourceArray[testIndex] = asGrade(gradeEl.value);
      } else if (!config.criteria || config.criteria.length === 0) {
        if (gradeEl && gradeEl.value !== "") sourceArray[testIndex] = asGrade(gradeEl.value);
      }

      // Write criteria
      const criteriaMap = student.criteriaResults[sem][testIndex] || {};
      if (config.criteria && Array.isArray(config.criteria)) {
        config.criteria.forEach(c => {
          const dr = draftCriteria[c.id];
          if (dr) {
            criteriaMap[c.id] = { points: dr.points, comment: dr.comment };
          }
        });
      }
      student.criteriaResults[sem][testIndex] = criteriaMap;
      if (!student.gradeOverrides[sem][testIndex] && config.criteria && config.criteria.length > 0 && (_studentModalDraft.criteriaPointsChanged || sourceArray[testIndex] == null)) {
        recalcStudentGradeFromCriteria(student, sem, testIndex, config);
      }

      // Write note sections
      student.testNotes[sem][testIndex] = draftSections.map(s => ({
        label: s.label,
        text: s.text,
        kind: normalizeObservationKind(s.kind),
        checklist: sectionChecklistSummary(s)
      }));
      if (_studentModalDraft.maxRemarkNum > 0) {
        if (!student.testRemarkMax) student.testRemarkMax = { sem1: Array(TEST_COUNT_PER_SEM).fill(0), sem2: Array(TEST_COUNT_PER_SEM).fill(0) };
        if (!Array.isArray(student.testRemarkMax[sem])) student.testRemarkMax[sem] = Array(TEST_COUNT_PER_SEM).fill(0);
        student.testRemarkMax[sem][testIndex] = Math.max(Number(student.testRemarkMax[sem][testIndex]) || 0, _studentModalDraft.maxRemarkNum);
      }

      if (config && _activeChipBankFilename) {
        config.chipBank = _activeChipBankFilename;
      }
      if (classObj && _activeChipBankFilename) {
        if (!Array.isArray(classObj.chipBanks)) classObj.chipBanks = [];
        if (!classObj.chipBanks.includes(_activeChipBankFilename)) classObj.chipBanks.push(_activeChipBankFilename);
        if (!classObj.chipBank) classObj.chipBank = _activeChipBankFilename;
      }

      // Write correction time (auto-measured)
      if (updateCorrectionTime) {
        if (!student.correctionTime) student.correctionTime = { sem1: Array(TEST_COUNT_PER_SEM).fill(null), sem2: Array(TEST_COUNT_PER_SEM).fill(null) };
        const elapsedMin = parseFloat(((Date.now() - modalOpenedAt) / 60000).toFixed(2));
        const prev = student.correctionTime[sem][testIndex];
        student.correctionTime[sem][testIndex] = prev != null ? parseFloat((prev + elapsedMin).toFixed(2)) : elapsedMin;
      }

      // Record/update correction timestamp to latest edit when scored
      recordStudentCorrectionTimestamp(student, classObj, sem, testIndex, config);

      saveState(classObj ? classObj.id : null, sem, testIndex);

      // Update scoring progress strip in-place
      const modalBody = document.getElementById("student-modal-body");
      if (modalBody) {
        const strip = modalBody.querySelector("#smod-scoring-progress-strip");
        if (strip) {
          const prog = computeScoringProgress(classObj, sem, testIndex, config);
          updateScoringProgressStrip(strip, prog, classObj, sem, testIndex, config);
          if (config && prog.remainingCount === 0 && prog.totalCount > 0 && !config.correctionDeadlineDoneAt) {
            config.correctionDeadlineDoneAt = new Date().toISOString();
            saveState(classObj ? classObj.id : null, sem, testIndex);
          }
        }
      }

      // Update test top chip scoring progress
      updateTopChipScoringProgress(classObj, sem, testIndex, config);

      const _gsTransition = _gsTrackRemainingTransition(classObj, sem, testIndex, config, false);
      if (_gsTransition && !(_gsPendingCelebration && _gsPendingCelebration.mode === 'done' && _gsTransition === 'scored')) {
        // Deferred: shown when the modal closes so it never interrupts marking.
        _gsPendingCelebration = { mode: _gsTransition, classObj, sem, testIndex, config };
      }

      renderSummary();
      if (classObj && sem && testIndex != null && typeof renderTestTopChips === 'function') {
        renderTestTopChips(classObj, sem, testIndex);
      }

      // Refresh the row in-place
      const targetTr = tr || document.querySelector(`#test-table tbody tr[data-student-id="${student.id}"]`);
      if (targetTr) {
        updateStudentRow(targetTr, student, sem, testIndex, config, classObj);

        // Refresh statistics rows
        const tbody = targetTr.closest("tbody");
        if (tbody) {
          const perCritVals = (config.criteria || []).map(criterion =>
            classObj.students.map(s => {
              const cMap = s.criteriaResults[sem][testIndex] || {};
              return cMap[criterion.id] ? toNumber(cMap[criterion.id].points) : null;
            }).filter(v => v != null)
          );
          renderTestSheetStats(tbody, classObj, sem, testIndex, config, perCritVals.map(calcStats));
        }
      }
    }

    function commitStudentModal() {
      if (!_studentModalDraft) return;
      flushStudentModalAutoSave();
      persistStudentModalDraft(true);
      closeStudentModal();
    }

    let _studentModalUnregEscape = null;
    function closeStudentModal() {
      if (_studentModalUnregEscape) {
        _studentModalUnregEscape();
        _studentModalUnregEscape = null;
      }
      if (_studentModalDraft) {
        const { classObj, sem, testIndex } = _studentModalDraft;
        flushStudentModalAutoSave();
        document.getElementById("student-modal-overlay").classList.add("hidden");
        _studentModalDraft = null;
        updateTopChipScoringProgress(classObj, sem, testIndex);
        flushPendingCelebration();
        if (classObj && sem && testIndex != null && typeof renderTestTopChips === 'function') {
          renderTestTopChips(classObj, sem, testIndex);
        }
      } else {
        document.getElementById("student-modal-overlay").classList.add("hidden");
        updateTopChipScoringProgress();
      }
    }

