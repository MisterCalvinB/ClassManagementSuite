    let _currentActiveScreen = "classes";

    function updateNavTabs(activeScreen) {
      if (activeScreen) _currentActiveScreen = activeScreen;
      const current = _currentActiveScreen || "classes";

      const tabClasses = document.getElementById("gs-tab-classes");
      const tabSummary = document.getElementById("gs-tab-summary");
      const tabTest = document.getElementById("gs-tab-test");
      const labelSummary = document.getElementById("gs-tab-summary-label");
      const labelTest = document.getElementById("gs-tab-test-label");

      if (!tabClasses || !tabSummary || !tabTest) return;

      const activeClass = typeof getActiveClass === 'function' ? getActiveClass() : null;

      // Tab 1: Overview
      tabClasses.classList.toggle("active", current === "classes");
      tabClasses.classList.remove("disabled");

      // Tab 2: Class Summary
      const hasSummary = !!(appState && appState.activeClassId && activeClass);
      tabSummary.classList.toggle("disabled", !hasSummary);
      tabSummary.classList.toggle("active", current === "summary");
      if (labelSummary) {
        const baseSummary = typeof t === 'function' ? (t('gsNavTabSummary') || 'Class Summary') : 'Class Summary';
        labelSummary.textContent = hasSummary && activeClass ? `${baseSummary} (${activeClass.name})` : baseSummary;
      }

      // Tab 3: Test Sheet
      const hasTest = !!(hasSummary && appState && appState.activeTest && appState.activeTest.semester);
      let testName = "";
      if (hasTest && activeClass) {
        const { semester, testIndex } = appState.activeTest;
        const cfg = typeof getTestConfig === 'function' ? getTestConfig(activeClass, semester, testIndex) : null;
        testName = (cfg && cfg.testName) ? cfg.testName : `Test ${testIndex + 1}`;
      }
      tabTest.classList.toggle("disabled", !hasTest);
      tabTest.classList.toggle("active", current === "test");
      if (labelTest) {
        const baseTest = typeof t === 'function' ? (t('gsNavTabTest') || 'Test Sheet') : 'Test Sheet';
        labelTest.textContent = hasTest && testName ? `${baseTest} (${testName})` : baseTest;
      }

      // Tab 4: Compare Classes
      const tabCompare = document.getElementById("gs-tab-compare");
      if (tabCompare) {
        tabCompare.classList.toggle("active", current === "compare");
        const hasEnough = appState && Array.isArray(appState.classes) && appState.classes.length > 0;
        tabCompare.classList.toggle("disabled", !hasEnough);
      }
    }

    function showScreen(name) {
      if (!screens[name]) screens[name] = document.getElementById("screen-" + name);
      Object.values(screens).forEach(el => el && el.classList.add("hidden"));
      if (screens[name]) screens[name].classList.remove("hidden");
      updateNavTabs(name);
      if (name === "classes" && typeof renderAllTestsStats === "function") {
        renderAllTestsStats();
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("gs-tab-classes")?.addEventListener("click", () => {
        appState.activeClassId = null;
        appState.activeTest = null;
        if (typeof renderClasses === 'function') renderClasses();
        showScreen("classes");
      });
      document.getElementById("gs-tab-summary")?.addEventListener("click", () => {
        if (appState && appState.activeClassId && typeof getActiveClass === 'function' && getActiveClass()) {
          appState.activeTest = null;
          if (typeof renderSummary === 'function') renderSummary();
          showScreen("summary");
        }
      });
      document.getElementById("gs-tab-test")?.addEventListener("click", () => {
        if (appState && appState.activeClassId && appState.activeTest && typeof getActiveClass === 'function' && getActiveClass()) {
          if (typeof renderTestSheet === 'function') renderTestSheet();
          showScreen("test");
        }
      });
      document.getElementById("gs-tab-compare")?.addEventListener("click", () => {
        if (typeof openCompareClassesScreen === 'function') openCompareClassesScreen();
        else if (window.openCompareClassesScreen) window.openCompareClassesScreen();
      });
      document.getElementById("btn-compare-classes")?.addEventListener("click", () => {
        if (typeof openCompareClassesScreen === 'function') openCompareClassesScreen();
        else if (window.openCompareClassesScreen) window.openCompareClassesScreen();
      });
      document.getElementById("btn-cmp-back")?.addEventListener("click", () => {
        showScreen("classes");
      });
    });

    function _getClassGroupStudents(classObj) {
      try {
        const cgData = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
        const cgMeta = cgData ? (cgData.classGroupsMeta || {}) : (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {});
        const cgGroupsLegacy = cgData ? cgData.classGroups : (typeof CLASS_GROUPS === 'object' ? CLASS_GROUPS : null);
        const metaEntry = (classObj.groupId && cgMeta[classObj.groupId]) || null;
        if (metaEntry && Array.isArray(metaEntry.students) && metaEntry.students.length) {
          return _gsResolveStudentNames(metaEntry.students);
        }
        if (cgGroupsLegacy) {
          if (classObj.groupId && cgGroupsLegacy[classObj.groupId]) return cgGroupsLegacy[classObj.groupId];
          return cgGroupsLegacy[classObj.name] || null;
        }
        return null;
      } catch { return null; }
    }

    // Determine whether a student exists in the current CLASS_GROUPS entry for this class.
    function studentPresentInClassGroups(classObj, student) {
      try {
        const cgData = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
        const cgMeta = cgData ? (cgData.classGroupsMeta || {}) : (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {});
        const metaEntry = (classObj.groupId && cgMeta[classObj.groupId]) || null;
        if (metaEntry && Array.isArray(metaEntry.students)) {
          if (student.id && metaEntry.students.includes(student.id)) return true;
        }
        const group = _getClassGroupStudents(classObj);
        if (!Array.isArray(group)) return true;
        const first = (student.firstName || "").trim().toUpperCase();
        const last = (student.lastName || "").trim().toUpperCase();
        const full = (first + (last ? " " + last : "")).trim();
        const variants = new Set([full, first, last]);
        full.split(/\s+/).forEach(t => { if (t) variants.add(t); });
        for (const v of variants) {
          if (!v) continue;
          if (group.includes(v)) return true;
        }
        return false;
      } catch (e) {
        return true;
      }
    }

    let _gsDraggedTestInfo = null;
    let _gsIsDraggingTest = false;

    function reorderClassTests(classObj, fromSem, fromIdx, toSem, toIdx) {
      if (!classObj) return;
      ensureClassStructures(classObj);

      const fromCount = (classObj.testCounts && classObj.testCounts[fromSem]) || 0;
      if (fromIdx < 0 || fromIdx >= fromCount) return;

      if (fromSem === toSem) {
        const toCount = fromCount;
        toIdx = Math.max(0, Math.min(toCount - 1, toIdx));
        if (fromIdx === toIdx) return;

        // Reorder testConfigs
        const [movedConfig] = classObj.testConfigs[fromSem].splice(fromIdx, 1);
        classObj.testConfigs[fromSem].splice(toIdx, 0, movedConfig);

        // Reorder student test data
        classObj.students.forEach(student => {
          const tests = fromSem === "sem1" ? student.sem1Tests : student.sem2Tests;
          const [movedScore] = tests.splice(fromIdx, 1);
          tests.splice(toIdx, 0, movedScore);

          if (student.testNotes && Array.isArray(student.testNotes[fromSem])) {
            const [movedNotes] = student.testNotes[fromSem].splice(fromIdx, 1);
            student.testNotes[fromSem].splice(toIdx, 0, movedNotes);
          }
          if (student.criteriaResults && Array.isArray(student.criteriaResults[fromSem])) {
            const [movedCrit] = student.criteriaResults[fromSem].splice(fromIdx, 1);
            student.criteriaResults[fromSem].splice(toIdx, 0, movedCrit);
          }
          if (student.gradeOverrides && Array.isArray(student.gradeOverrides[fromSem])) {
            const [movedOverride] = student.gradeOverrides[fromSem].splice(fromIdx, 1);
            student.gradeOverrides[fromSem].splice(toIdx, 0, movedOverride);
          }
          if (student.correctionTime && Array.isArray(student.correctionTime[fromSem])) {
            const [movedTime] = student.correctionTime[fromSem].splice(fromIdx, 1);
            student.correctionTime[fromSem].splice(toIdx, 0, movedTime);
          }
          if (student.correctedAt && Array.isArray(student.correctedAt[fromSem])) {
            const [movedAt] = student.correctedAt[fromSem].splice(fromIdx, 1);
            student.correctedAt[fromSem].splice(toIdx, 0, movedAt);
          }
        });
      } else {
        // Cross-semester reorder in same class
        if ((classObj.testCounts[toSem] || 0) >= TEST_COUNT_PER_SEM) {
          if (typeof showToast === 'function') showToast(t('gsErrMaxTestsReached') || 'Maximum tests reached for this semester', true);
          return;
        }
        toIdx = Math.max(0, Math.min(classObj.testCounts[toSem] || 0, toIdx));

        const [movedConfig] = classObj.testConfigs[fromSem].splice(fromIdx, 1);
        classObj.testConfigs[fromSem].push(createDefaultTestConfig());
        classObj.testConfigs[toSem].splice(toIdx, 0, movedConfig);
        classObj.testConfigs[toSem].pop();

        classObj.students.forEach(student => {
          const fromTests = fromSem === "sem1" ? student.sem1Tests : student.sem2Tests;
          const toTests = toSem === "sem1" ? student.sem1Tests : student.sem2Tests;
          const [movedScore] = fromTests.splice(fromIdx, 1);
          fromTests.push(null);
          toTests.splice(toIdx, 0, movedScore);
          toTests.pop();

          if (student.testNotes) {
            const [movedNotes] = (student.testNotes[fromSem] || []).splice(fromIdx, 1);
            student.testNotes[fromSem].push([]);
            (student.testNotes[toSem] || []).splice(toIdx, 0, movedNotes || []);
            student.testNotes[toSem].pop();
          }
          if (student.criteriaResults) {
            const [movedCrit] = (student.criteriaResults[fromSem] || []).splice(fromIdx, 1);
            student.criteriaResults[fromSem].push({});
            (student.criteriaResults[toSem] || []).splice(toIdx, 0, movedCrit || {});
            student.criteriaResults[toSem].pop();
          }
          if (student.gradeOverrides) {
            const [movedOverride] = (student.gradeOverrides[fromSem] || []).splice(fromIdx, 1);
            student.gradeOverrides[fromSem].push(false);
            (student.gradeOverrides[toSem] || []).splice(toIdx, 0, movedOverride || false);
            student.gradeOverrides[toSem].pop();
          }
          if (student.correctionTime) {
            const [movedTime] = (student.correctionTime[fromSem] || []).splice(fromIdx, 1);
            student.correctionTime[fromSem].push(null);
            (student.correctionTime[toSem] || []).splice(toIdx, 0, movedTime ?? null);
            student.correctionTime[toSem].pop();
          }
          if (student.correctedAt) {
            const [movedAt] = (student.correctedAt[fromSem] || []).splice(fromIdx, 1);
            student.correctedAt[fromSem].push(null);
            (student.correctedAt[toSem] || []).splice(toIdx, 0, movedAt ?? null);
            student.correctedAt[toSem].pop();
          }
        });

        classObj.testCounts[fromSem] = Math.max(0, classObj.testCounts[fromSem] - 1);
        classObj.testCounts[toSem] = (classObj.testCounts[toSem] || 0) + 1;
      }

      saveState();
      renderClasses();
      if (typeof showToast === 'function') {
        showToast(t('gsToastTestReordered'));
      }
    }

    function copyTestToClass(srcClassId, srcSem, srcTestIdx, destClassId, destSem) {
      const srcClass = appState.classes.find(c => c.id === srcClassId);
      const destClass = appState.classes.find(c => c.id === destClassId);
      if (!srcClass || !destClass) return;

      ensureClassStructures(srcClass);
      ensureClassStructures(destClass);

      const srcConfig = srcClass.testConfigs && srcClass.testConfigs[srcSem] && srcClass.testConfigs[srcSem][srcTestIdx];
      if (!srcConfig) return;

      if (!destSem) {
        if (destClass.semester === '2') destSem = 'sem2';
        else if (destClass.semester === '1') destSem = 'sem1';
        else destSem = srcSem || 'sem1';
      }

      if ((destClass.testCounts[destSem] || 0) >= TEST_COUNT_PER_SEM) {
        if (typeof showToast === 'function') {
          showToast(t('gsErrMaxTestsReached') || 'Maximum tests reached for this semester', true);
        }
        return;
      }

      const destTestIdx = destClass.testCounts[destSem] || 0;
      const newConfig = JSON.parse(JSON.stringify(srcConfig));

      if (!destClass.testConfigs[destSem]) destClass.testConfigs[destSem] = [];
      destClass.testConfigs[destSem][destTestIdx] = newConfig;
      destClass.testCounts[destSem] = destTestIdx + 1;

      (destClass.students || []).forEach(student => {
        const tests = destSem === "sem1" ? student.sem1Tests : student.sem2Tests;
        while (tests.length <= destTestIdx) tests.push(null);

        if (student.testNotes) {
          if (!student.testNotes[destSem]) student.testNotes[destSem] = [];
          while (student.testNotes[destSem].length <= destTestIdx) student.testNotes[destSem].push([]);
        }
        if (student.criteriaResults) {
          if (!student.criteriaResults[destSem]) student.criteriaResults[destSem] = [];
          while (student.criteriaResults[destSem].length <= destTestIdx) student.criteriaResults[destSem].push({});
        }
        if (student.gradeOverrides) {
          if (!student.gradeOverrides[destSem]) student.gradeOverrides[destSem] = [];
          while (student.gradeOverrides[destSem].length <= destTestIdx) student.gradeOverrides[destSem].push(false);
        }
        if (student.correctionTime) {
          if (!student.correctionTime[destSem]) student.correctionTime[destSem] = [];
          while (student.correctionTime[destSem].length <= destTestIdx) student.correctionTime[destSem].push(null);
        }
        if (student.correctedAt) {
          if (!student.correctedAt[destSem]) student.correctedAt[destSem] = [];
          while (student.correctedAt[destSem].length <= destTestIdx) student.correctedAt[destSem].push(null);
        }
      });

      saveState();
      renderClasses();

      const msg = tFmt('gsToastTestCopiedToClass', { name: destClass.name }) || `Test copied to ${destClass.name}`;
      if (typeof showToast === 'function') showToast(msg);
    }

    function renderAllTests() {
      const panel = document.getElementById("all-tests-panel");
      if (!panel) return;
      panel.innerHTML = "";

      const hasAnyTests = appState.classes.some(c => {
        const tc = c.testCounts || { sem1: 0, sem2: 0 };
        return (tc.sem1 || 0) + (tc.sem2 || 0) > 0;
      });

      if (!hasAnyTests) {
        panel.classList.add("hidden");
        const statsPanel = document.getElementById("all-tests-stats-panel");
        if (statsPanel) statsPanel.classList.add("hidden");
        return;
      }
      panel.classList.remove("hidden");

      const header = document.createElement("div");
      header.className = "all-tests-panel-header";

      const title = document.createElement("div");
      title.className = "all-tests-panel-title";
      title.setAttribute("data-i18n", "gsAllTestsTitle");
      title.textContent = t('gsAllTestsTitle');
      header.appendChild(title);

      const hint = document.createElement("span");
      hint.className = "all-tests-panel-hint";
      hint.setAttribute("data-i18n", "gsAllTestsHint");
      hint.textContent = t('gsAllTestsHint');
      header.appendChild(hint);

      panel.appendChild(header);

      appState.classes.forEach(c => {
        const testCounts = c.testCounts || { sem1: 0, sem2: 0 };
        const testConfigs = c.testConfigs || { sem1: [], sem2: [] };
        const classSem = c.semester ? Number(c.semester) : 0;
        const showSem1 = classSem !== 2;
        const showSem2 = classSem !== 1;
        const multiSem = showSem1 && showSem2;

        const group = document.createElement("div");
        group.className = "all-tests-class-group";

        const label = document.createElement("div");
        label.className = "all-tests-class-label";
        label.textContent = c.name + (c.year ? ' · ' + c.year : '') + (c.semester ? ' · S' + c.semester : '');
        group.appendChild(label);

        const rows = document.createElement("div");
        rows.className = "all-tests-rows";

        rows.addEventListener("dragover", (e) => {
          if (!_gsDraggedTestInfo) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = (_gsDraggedTestInfo.classId === c.id) ? "move" : "copy";
          rows.classList.add("drag-over");
        });

        rows.addEventListener("dragleave", (e) => {
          if (!rows.contains(e.relatedTarget)) {
            rows.classList.remove("drag-over");
          }
        });

        rows.addEventListener("drop", (e) => {
          rows.classList.remove("drag-over");
          if (!_gsDraggedTestInfo) return;
          if (e.target === rows) {
            e.preventDefault();
            e.stopPropagation();
            const fromClassId = _gsDraggedTestInfo.classId;
            const fromSem = _gsDraggedTestInfo.sem;
            const fromIdx = _gsDraggedTestInfo.testIndex;
            _gsDraggedTestInfo = null;

            if (fromClassId === c.id) {
              const targetSem = fromSem;
              const targetIdx = Math.max(0, (c.testCounts[targetSem] || 1) - 1);
              if (fromIdx !== targetIdx) {
                reorderClassTests(c, fromSem, fromIdx, targetSem, targetIdx);
              }
            } else {
              const targetSem = (c.semester === '2') ? 'sem2' : (fromSem === 'sem2' && showSem2 ? 'sem2' : 'sem1');
              copyTestToClass(fromClassId, fromSem, fromIdx, c.id, targetSem);
            }
          }
        });

        const addTestChip = (sem, i) => {
          const cfg = (testConfigs[sem] || [])[i];
          const name = (cfg && cfg.testName) ? cfg.testName : `Test ${i + 1}`;
          const date = (cfg && cfg.testDate) ? cfg.testDate : '';
          const badge = multiSem ? (sem === 'sem1' ? `S1·T${i + 1}` : `S2·T${i + 1}`) : `T${i + 1}`;

          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "all-test-item";
          chip.draggable = true;

          // Check if test was already taken and has unscored students, or if all non-absent students are marked
          const todayStr = new Date().toISOString().slice(0, 10);
          let remClusterHtml = '';
          let chipTooltip = t('gsDragToReorder');
          const progress = computeScoringProgress(c, sem, i, cfg);
          const isAutoCompleted = !!(progress && progress.totalCount > 0 && progress.remainingCount === 0);

          if ((cfg && cfg.markingCompleted) || isAutoCompleted) {
            chip.classList.add("test-marking-completed");
            chipTooltip = `${name} · ${t('gsMarkingCompletedTooltip')}`;
          } else if (date && date <= todayStr) {
            if (progress && progress.remainingCount > 0) {
              const estMinutes = (progress.hasEta && progress.avgMin > 0)
                ? Math.round(progress.remainingCount * progress.avgMin)
                : (progress.remainingCount * 15);
              const estTimeStr = formatCorrectionTime(estMinutes);

              let dlDate = (cfg && cfg.correctionDeadline) ? cfg.correctionDeadline : '';
              if (!dlDate && cfg && cfg.correctionDeadlineDaysAfter && date) {
                try {
                  const d = new Date(date + 'T00:00:00');
                  d.setDate(d.getDate() + Number(cfg.correctionDeadlineDaysAfter));
                  dlDate = d.toISOString().slice(0, 10);
                } catch (_) {}
              }

              const isOverdue = !!(dlDate && dlDate < todayStr);
              const isDueToday = !!(dlDate && dlDate === todayStr);
              chip.classList.add(isOverdue ? "test-taken-overdue" : "test-taken-pending");

              const remCountText = tFmt('gsAllTestsRemaining', { n: progress.remainingCount });
              const etaText = tFmt('gsAllTestsEta', { time: estTimeStr });
              let dlText = '';
              if (dlDate) {
                if (isOverdue) {
                  dlText = tFmt('gsAllTestsOverdue', { date: dlDate });
                } else if (isDueToday) {
                  dlText = t('gsAllTestsDueToday');
                } else {
                  dlText = tFmt('gsAllTestsDeadline', { date: dlDate });
                }
              }

              remClusterHtml = `
                <span class="all-test-rem-cluster">
                  <span class="all-test-rem-pill all-test-rem-count" title="${escapeHtml(remCountText)}">
                    <img src="../assets/icons/group.svg" class="all-test-mini-icon" alt="" />
                    ${escapeHtml(remCountText)}
                  </span>
                  <span class="all-test-rem-pill all-test-rem-eta" title="${escapeHtml(etaText)}">
                    <img src="../assets/icons/stopwatch.svg" class="all-test-mini-icon" alt="" />
                    ${escapeHtml(etaText)}
                  </span>
                  ${dlText ? `
                    <span class="all-test-rem-pill all-test-rem-dl ${isOverdue ? 'overdue' : ''}" title="${escapeHtml(dlText)}">
                      <img src="../assets/icons/calendar.svg" class="all-test-mini-icon" alt="" />
                      ${escapeHtml(dlText)}
                    </span>
                  ` : ''}
                </span>
              `;

              const baseDlDesc = dlText || (dlDate || '—');
              chipTooltip = tFmt('gsAllTestsTakenPendingTooltip', {
                testDate: date,
                n: progress.remainingCount,
                time: estTimeStr,
                dl: baseDlDesc
              });

              if (window.ScoringMotivators && ScoringMotivators.isEnabled()) {
                const motiv = ScoringMotivators.pick({
                  deadlineStatus: progress.deadlineStatus || (isOverdue ? 'overdue' : (isDueToday ? 'behind' : 'on-track')),
                  remaining: progress.remainingCount,
                  total: progress.totalCount,
                  pct: progress.pct,
                  scored: progress.scoredCount
                });
                if (motiv && motiv.text) {
                  chipTooltip += ` · ✨ ${motiv.text}`;
                }
              }
            }
          }

          chip.setAttribute("title", chipTooltip);
          chip.innerHTML = `<span class="all-test-badge">${escapeHtml(badge)}</span><span class="all-test-name">${escapeHtml(name)}</span>${date ? `<span class="all-test-date">${escapeHtml(date)}</span>` : ''}${remClusterHtml}`;

          chip.addEventListener("dragstart", (e) => {
            _gsDraggedTestInfo = { classId: c.id, sem: sem, testIndex: i };
            _gsIsDraggingTest = true;
            e.dataTransfer.effectAllowed = "copyMove";
            e.dataTransfer.setData("text/plain", JSON.stringify(_gsDraggedTestInfo));
            chip.classList.add("dragging");
          });

          chip.addEventListener("dragend", () => {
            chip.classList.remove("dragging");
            panel.querySelectorAll(".all-test-item").forEach(el => {
              el.classList.remove("drag-over-left", "drag-over-right", "drag-over-center", "drag-over");
              el.removeAttribute("data-drop-tooltip");
            });
            panel.querySelectorAll(".all-test-empty-slot").forEach(s => {
              s.classList.remove("drag-over-slot");
              s.removeAttribute("data-drop-tooltip");
            });
            panel.querySelectorAll(".all-tests-rows").forEach(r => r.classList.remove("drag-over"));
            _gsDraggedTestInfo = null;
            setTimeout(() => { _gsIsDraggingTest = false; }, 60);
          });

          chip.addEventListener("dragover", (e) => {
            if (!_gsDraggedTestInfo) return;
            e.preventDefault();
            e.stopPropagation();

            const isSameClass = _gsDraggedTestInfo.classId === c.id;
            const rect = chip.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const ratio = rect.width > 0 ? (relX / rect.width) : 0.5;

            chip.classList.remove("drag-over-left", "drag-over-right", "drag-over-center");

            if (isSameClass) {
              if (ratio < 0.25) {
                chip.classList.add("drag-over-left");
                chip.removeAttribute("data-drop-tooltip");
                e.dataTransfer.dropEffect = "move";
              } else if (ratio > 0.75) {
                chip.classList.add("drag-over-right");
                chip.removeAttribute("data-drop-tooltip");
                e.dataTransfer.dropEffect = "move";
              } else {
                chip.classList.add("drag-over-center");
                chip.setAttribute("data-drop-tooltip", t('gsDropDuplicateElements') || 'Duplicate Elements');
                e.dataTransfer.dropEffect = "copy";
              }
            } else {
              chip.classList.add("drag-over-center");
              chip.setAttribute("data-drop-tooltip", t('gsDropDuplicateElements') || 'Duplicate Elements');
              e.dataTransfer.dropEffect = "copy";
            }
          });

          chip.addEventListener("dragleave", () => {
            chip.classList.remove("drag-over-left", "drag-over-right", "drag-over-center");
            chip.removeAttribute("data-drop-tooltip");
          });

          chip.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isCenterDrop = chip.classList.contains("drag-over-center");
            const isRightDrop = chip.classList.contains("drag-over-right");
            const isLeftDrop = chip.classList.contains("drag-over-left");

            chip.classList.remove("drag-over-left", "drag-over-right", "drag-over-center");
            chip.removeAttribute("data-drop-tooltip");
            rows.classList.remove("drag-over");

            if (!_gsDraggedTestInfo) return;
            const fromClassId = _gsDraggedTestInfo.classId;
            const fromSem = _gsDraggedTestInfo.sem;
            const fromIdx = _gsDraggedTestInfo.testIndex;
            _gsDraggedTestInfo = null;

            if (fromClassId === c.id) {
              if (isCenterDrop) {
                openDuplicateTestPopup({
                  srcClassId: c.id,
                  srcSem: fromSem,
                  srcTestIndex: fromIdx,
                  destClassId: c.id,
                  destSem: sem,
                  destTestIndex: i
                });
              } else if (isLeftDrop || isRightDrop) {
                const toSem = sem;
                let targetIdx = i;
                if (fromSem === toSem) {
                  if (isRightDrop && targetIdx < fromIdx) targetIdx++;
                  else if (isLeftDrop && targetIdx > fromIdx) targetIdx--;
                  if (fromIdx === targetIdx) return;
                } else {
                  if (isRightDrop) targetIdx++;
                }
                reorderClassTests(c, fromSem, fromIdx, toSem, targetIdx);
              }
            } else {
              openDuplicateTestPopup({
                srcClassId: fromClassId,
                srcSem: fromSem,
                srcTestIndex: fromIdx,
                destClassId: c.id,
                destSem: sem,
                destTestIndex: i
              });
            }
          });

          chip.addEventListener("click", () => {
            if (_gsIsDraggingTest) return;
            appState.activeClassId = c.id;
            ensureClassStructures(c);
            renderSummary();
            appState.activeTest = { semester: sem, testIndex: i };
            renderTestSheet();
            showScreen("test");
          });

          chip.addEventListener("contextmenu", (e) => {
            if (_gsIsDraggingTest) return;
            e.preventDefault();
            e.stopPropagation();
            openAllTestItemMenu(e.clientX, e.clientY, c, sem, i);
          });
          rows.appendChild(chip);
        };

        const addEmptySlotChip = (sem) => {
          if ((testCounts[sem] || 0) >= TEST_COUNT_PER_SEM) return;
          const emptyChip = document.createElement("div");
          emptyChip.className = "all-test-empty-slot";
          emptyChip.setAttribute("role", "button");
          emptyChip.setAttribute("tabindex", "0");
          emptyChip.setAttribute("title", t('gsAllTestsDropToCopyHint') || 'Drop a test here to copy, or click to add a new test');
          const prefix = multiSem ? (sem === 'sem1' ? 'S1 · ' : 'S2 · ') : '';
          emptyChip.innerHTML = `<span class="all-test-empty-icon">+</span><span class="all-test-empty-text">${escapeHtml(prefix)}${t('gsNewTestSlot')}</span>`;

          emptyChip.addEventListener("dragover", (e) => {
            if (!_gsDraggedTestInfo) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
            emptyChip.classList.add("drag-over-slot");
            emptyChip.setAttribute("data-drop-tooltip", t('gsDropCopyToNewSlot') || 'Copy to New Slot');
          });

          emptyChip.addEventListener("dragleave", () => {
            emptyChip.classList.remove("drag-over-slot");
            emptyChip.removeAttribute("data-drop-tooltip");
          });

          emptyChip.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            emptyChip.classList.remove("drag-over-slot");
            emptyChip.removeAttribute("data-drop-tooltip");
            rows.classList.remove("drag-over");

            if (!_gsDraggedTestInfo) return;
            const fromClassId = _gsDraggedTestInfo.classId;
            const fromSem = _gsDraggedTestInfo.sem;
            const fromIdx = _gsDraggedTestInfo.testIndex;
            _gsDraggedTestInfo = null;

            copyTestToClass(fromClassId, fromSem, fromIdx, c.id, sem);
          });

          emptyChip.addEventListener("click", () => {
            if (_gsIsDraggingTest) return;
            appState.activeClassId = c.id;
            ensureClassStructures(c);
            const newTestIndex = c.testCounts[sem] || 0;
            c.testCounts[sem] = newTestIndex + 1;
            saveState();
            renderSummary();
            appState.activeTest = { semester: sem, testIndex: newTestIndex };
            renderTestSheet();
            showScreen("test");
            openTestOptionsModal(getTestConfig(c, sem, newTestIndex), c, sem, newTestIndex, "info");
          });

          rows.appendChild(emptyChip);
        };

        if (showSem1) {
          for (let i = 0; i < testCounts.sem1; i++) addTestChip('sem1', i);
        }
        if (showSem2) {
          for (let i = 0; i < testCounts.sem2; i++) addTestChip('sem2', i);
        }

        if (showSem1) addEmptySlotChip('sem1');
        if (showSem2 && (multiSem || !showSem1)) addEmptySlotChip('sem2');

        group.appendChild(rows);
        panel.appendChild(group);
      });

      renderAllTestsStats();
    }

    // ── All Tests: Correction Statistics & Interactive Timeline ──

    function renderClasses() {
      const grid = document.getElementById("classes-grid");
      if (!grid) return;
      grid.innerHTML = "";
      const _cgdGS = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : {};
      const _activeYearGS = _cgdGS.activeYear || '';
      const _activeSemGS = _cgdGS.activeSemester ? String(_cgdGS.activeSemester) : '';
      appState.classes
        .slice()
        .sort((a, b) => {
          const aMatch = (_activeYearGS && a.year === _activeYearGS ? 0 : 1) + (_activeSemGS && (String(a.semester) === _activeSemGS || a.semester === 'all' || a.semester === 'both') ? 0 : 1);
          const bMatch = (_activeYearGS && b.year === _activeYearGS ? 0 : 1) + (_activeSemGS && (String(b.semester) === _activeSemGS || b.semester === 'all' || b.semester === 'both') ? 0 : 1);
          if (aMatch !== bMatch) return aMatch - bMatch;
          return a.name.localeCompare(b.name);
        })
        .forEach(c => {
          const fromGroupEditor = isGroupEditorClass(c);
          const editBtnHtml = fromGroupEditor ? '' : `<button type="button" class="btn-edit-class" data-id="${c.id}" data-i18n="gsMenuEditName">${t('gsMenuEditName')}</button>`;
          const card = document.createElement("button");
          card.type = "button";
          card.className = "class-card";
          const isAllSem = c.semester === 'all' || c.semester === 'both';
          const semText = isAllSem ? '' : (c.semester ? ` · S${escapeHtml(String(c.semester))}` : '');
          card.innerHTML = `
            <div class="class-name">${escapeHtml(c.name)}</div>
            <div class="class-meta">${c.students.length} students${c.year ? ` · ${escapeHtml(c.year)}` : ''}${semText}${c.level ? ` · Lvl ${escapeHtml(String(c.level))}` : ''}</div>
            <div class="class-card-footer">
              ${editBtnHtml}
              <button type="button" class="btn-add-test-card" data-id="${c.id}" data-i18n="gsBtnAddTest">${t('gsBtnAddTest')}</button>
            </div>
          `;
          card.addEventListener("click", () => {
            appState.activeClassId = c.id;
            renderSummary();
            showScreen("summary");
          });
          const editBtn = card.querySelector(".btn-edit-class");
          if (editBtn) {
            editBtn.addEventListener("click", async evt => {
              evt.stopPropagation();
              const newName = await showPrompt(t('gsPromptRenameClass'), c.name);
              if (newName && newName.trim() && newName.trim() !== c.name) {
                c.name = newName.trim();
                saveState();
                renderClasses();
              }
            });
          }
          card.querySelector(".btn-add-test-card").addEventListener("click", evt => {
            evt.stopPropagation();
            addTestForClass(c);
          });
          card.addEventListener("contextmenu", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            openClassCardMenu(ev.clientX, ev.clientY, c);
          });
          grid.appendChild(card);
        });
      renderAllTests();
    }



    function renderSummary() {
      const classObj = getActiveClass();
      if (!classObj) return;

      const fromGroupEditor = isGroupEditorClass(classObj);
      const editClassBtn = document.getElementById("btn-edit-class");
      const deleteClassBtn = document.getElementById("btn-delete-class");
      if (editClassBtn) editClassBtn.style.display = fromGroupEditor ? "none" : "";
      if (deleteClassBtn) deleteClassBtn.style.display = fromGroupEditor ? "none" : "";

      document.getElementById("summary-title").textContent = classObj.name + " - " + t('gsClassSummaryLabel');
      ensureClassStructures(classObj);
      updateGsLinksBadges();
      applySummaryDisplaySettingsToDOM();

      // Determine which semesters to show based on the class's semester property
      const isAll = !classObj.semester || classObj.semester === 'all' || classObj.semester === 'both';
      const showSem1 = isAll || String(classObj.semester) === '1';
      const showSem2 = isAll || String(classObj.semester) === '2';

      const chips = document.getElementById("summary-chips");
      const validGrades = classObj.students
        .flatMap(s => [
          ...(showSem1 ? s.sem1Tests : []),
          ...(showSem2 ? s.sem2Tests : [])
        ])
        .filter(v => v != null);
      const globalAvg = validGrades.length
        ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
        : null;

      chips.innerHTML = "";
      [
        tFmt('gsStudentsCount', { n: classObj.students.length }),
        ...(showSem1 ? [tFmt('gsSem1TestsCount', { n: classObj.testCounts.sem1 })] : []),
        ...(showSem2 ? [tFmt('gsSem2TestsCount', { n: classObj.testCounts.sem2 })] : []),
        tFmt('gsAverageLabel', { avg: fmtAvg(globalAvg) })
      ].forEach(label => {
        const el = document.createElement("span");
        el.className = "chip";
        el.textContent = label;
        chips.appendChild(el);
      });

      const summarySem = (showSem1 && !showSem2) ? 'sem1' : ((showSem2 && !showSem1) ? 'sem2' : 'all');
      renderSummaryTopChips(classObj, summarySem);

      const thead = document.querySelector("#summary-table thead");
      const tbody = document.querySelector("#summary-table tbody");
      thead.innerHTML = "";
      tbody.innerHTML = "";

      const n1 = showSem1 ? classObj.testCounts.sem1 : 0;
      const n2 = showSem2 ? classObj.testCounts.sem2 : 0;

      // Computed column indices
      const sem1AvgColIdx = showSem1 ? 3 + n1 : -1;
      const sem2TestStart = 3 + n1 + (showSem1 ? 1 : 0);
      const sem2AvgColIdx = showSem2 ? sem2TestStart + n2 : -1;
      const roundedFinalColIdx = sem2TestStart + n2 + (showSem2 ? 1 : 0) + (showSem1 && showSem2 ? 1 : 0);

      const headerRow = document.createElement("tr");
      const headers = [
        t('gsColIndex'), t('gsEditStudentFirstName'), t('gsEditStudentLastName'),
        ...Array.from({ length: n1 }, (_, i) => `Sem1 T${i + 1}`),
        ...(showSem1 ? [t('gsColSem1Avg')] : []),
        ...Array.from({ length: n2 }, (_, i) => `Sem2 T${i + 1}`),
        ...(showSem2 ? [t('gsColSem2Avg')] : []),
        ...(showSem1 && showSem2 ? [t('gsColYearAvg')] : []),
        t('gsColRoundedFinal'),
        t('gsColRank'),
        t('gsColComments')
      ];

      headers.forEach((h, idx) => {
        const th = document.createElement("th");
        const label = document.createElement("div");
        label.className = "th-label";
        if (h.startsWith("Sem1 T")) {
          const testIdx = Number(h.replace("Sem1 T", "")) - 1;
          const cfg1 = classObj.testConfigs.sem1[testIdx];
          const badge1 = typeof cfg1.fixedWeight === "number" ? `fixed ${fmtN(cfg1.fixedWeight)}%` : `${fmtN(cfg1.coefficient)}`;
          const dispName1 = cfg1.testName ? escapeHtml(cfg1.testName) : h;
          label.innerHTML = `<span class="test-link" data-sem="sem1" data-test="${testIdx}">${dispName1}</span><span class="score-badge">${badge1}</span>`;
        } else if (h.startsWith("Sem2 T")) {
          const testIdx = Number(h.replace("Sem2 T", "")) - 1;
          const cfg2 = classObj.testConfigs.sem2[testIdx];
          const badge2 = typeof cfg2.fixedWeight === "number" ? `fixed ${fmtN(cfg2.fixedWeight)}%` : `${fmtN(cfg2.coefficient)}`;
          const dispName2 = cfg2.testName ? escapeHtml(cfg2.testName) : h;
          label.innerHTML = `<span class="test-link" data-sem="sem2" data-test="${testIdx}">${dispName2}</span><span class="score-badge">${badge2}</span>`;
        } else {
          label.textContent = h;
        }
        th.appendChild(label);
        if (idx >= 3) th.classList.add("num");
        if (h === "Rank") th.style.textAlign = "center";
        if (idx <= 2) th.classList.add("col-shrink");
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      const rankMap = rankStudents(classObj);
      const nameMode = getGsNameDisplayMode();

      classObj.students.forEach(student => {
        const c = computeStudent(student, classObj);
        const tr = document.createElement("tr");
        tr.dataset.summaryStudentId = String(student.id);
        try {
          if (!studentPresentInClassGroups(classObj, student)) {
            tr.classList.add('missing-student');
            tr.title = 'Student not found in current class-groups.js — grades retained.';
          }
        } catch (e) { }

        let fnDisplay = student.firstName || "";
        let lnDisplay = student.lastName || "";
        if (nameMode === 'custom') {
          if (student.customName) {
            fnDisplay = student.customName;
            lnDisplay = "";
          } else {
            fnDisplay = student.firstName || "";
            lnDisplay = student.lastName ? (student.lastName.trim().charAt(0).toUpperCase() + '.') : "";
          }
        } else if (nameMode === 'first') {
          lnDisplay = "";
        } else if (nameMode === 'last') {
          fnDisplay = student.lastName || "";
          lnDisplay = "";
        }

        const row = [
          student.index,
          fnDisplay,
          lnDisplay,
          ...Array.from({ length: n1 }, (_, i) => fmtN(getTestDisplayGrade(student, classObj, "sem1", i))),
          ...(showSem1 ? [fmtAvg(c.sem1Avg)] : []),
          ...Array.from({ length: n2 }, (_, i) => fmtN(getTestDisplayGrade(student, classObj, "sem2", i))),
          ...(showSem2 ? [fmtAvg(c.sem2Avg)] : []),
          ...(showSem1 && showSem2 ? [fmtAvg(c.yearAvg)] : []),
          fmtAvg(c.roundedFinal),
          rankMap.get(student.id) ?? "-",
          student.comments || ""
        ];
        const rowNums = [
          null, null, null,
          ...Array.from({ length: n1 }, (_, i) => getTestDisplayGrade(student, classObj, "sem1", i)),
          ...(showSem1 ? [c.sem1Avg] : []),
          ...Array.from({ length: n2 }, (_, i) => getTestDisplayGrade(student, classObj, "sem2", i)),
          ...(showSem2 ? [c.sem2Avg] : []),
          ...(showSem1 && showSem2 ? [c.yearAvg] : []),
          c.roundedFinal,
          null, null
        ];

        row.forEach((value, idx) => {
          const td = document.createElement("td");
          td.textContent = String(value);
          if (idx <= 2) td.classList.add("col-shrink");
          if (idx >= 3 && idx <= roundedFinalColIdx) td.classList.add("num");
          if (idx >= 3 && idx <= roundedFinalColIdx) {
            let testCfg = null;
            if (idx >= 3 && idx < 3 + n1) {
              testCfg = getTestConfig(classObj, "sem1", idx - 3);
            } else if (idx >= sem2TestStart && idx < sem2TestStart + n2) {
              testCfg = getTestConfig(classObj, "sem2", idx - sem2TestStart);
            }
            applyGradeColor(td, rowNums[idx], testCfg, { classObj, isSummary: true });
          }
          if (idx === roundedFinalColIdx + 1) td.style.textAlign = "center";
          if (idx === sem1AvgColIdx || idx === sem2AvgColIdx) td.style.fontWeight = "700";
          if (idx === roundedFinalColIdx) {
            td.classList.toggle("good", c.roundedFinal != null && c.roundedFinal >= 4);
            td.classList.toggle("bad", c.roundedFinal != null && c.roundedFinal < 4);
          }
          // Sem1 test grade cells
          if (idx >= 3 && idx < 3 + n1) {
            const testIdx = idx - 3;
            td.style.cursor = "pointer";
            td.addEventListener("click", () => {
              appState.activeTest = { semester: "sem1", testIndex: testIdx };
              renderTestSheet();
              showScreen("test");
              const config = getTestConfig(classObj, "sem1", testIdx);
              const testTr = document.querySelector(`#test-table tbody tr[data-student-id="${student.id}"]`);
              openStudentModal(student, classObj, "sem1", testIdx, testTr, config);
            });
          }
          // Sem2 test grade cells
          if (idx >= sem2TestStart && idx < sem2TestStart + n2) {
            const testIdx = idx - sem2TestStart;
            td.style.cursor = "pointer";
            td.addEventListener("click", () => {
              appState.activeTest = { semester: "sem2", testIndex: testIdx };
              renderTestSheet();
              showScreen("test");
              const config = getTestConfig(classObj, "sem2", testIdx);
              const testTr = document.querySelector(`#test-table tbody tr[data-student-id="${student.id}"]`);
              openStudentModal(student, classObj, "sem2", testIdx, testTr, config);
            });
          }
          tr.appendChild(td);
        });
        tr.addEventListener("contextmenu", ev => {
          if (ev.target.closest("button,input,textarea,select,a,label")) return;
          ev.preventDefault();
          ev.stopPropagation();
          openSummaryStudentRowMenu(ev.clientX, ev.clientY, student, classObj);
        });
        tbody.appendChild(tr);
      });

      // — Statistics rows —
      const statCols = [
        ...(showSem1 ? Array.from({ length: n1 }, (_, i) =>
          classObj.students.map(s => getTestDisplayGrade(s, classObj, "sem1", i)).filter(v => v != null)
        ) : []),
        ...(showSem1 ? [classObj.students.map(s => computeStudent(s, classObj).sem1Avg).filter(v => v != null)] : []),
        ...(showSem2 ? Array.from({ length: n2 }, (_, i) =>
          classObj.students.map(s => getTestDisplayGrade(s, classObj, "sem2", i)).filter(v => v != null)
        ) : []),
        ...(showSem2 ? [classObj.students.map(s => computeStudent(s, classObj).sem2Avg).filter(v => v != null)] : []),
        ...(showSem1 && showSem2 ? [classObj.students.map(s => computeStudent(s, classObj).yearAvg).filter(v => v != null)] : []),
        classObj.students.map(s => computeStudent(s, classObj).roundedFinal).filter(v => v != null)
      ];
      // statCols maps to columns starting at index 3, ending before Rank and Comments
      const hasStats = statCols.some(arr => arr.length > 0);
      if (hasStats) {
        const sepTr = document.createElement("tr");
        const sepTd = document.createElement("td");
        sepTd.colSpan = roundedFinalColIdx + 3;
        sepTd.style.cssText = "padding:0;background:var(--line);height:2px;";
        sepTr.appendChild(sepTd);
        tbody.appendChild(sepTr);

        const statLabels = [t('gsStatMean'), t('gsStatMedian'), t('gsStatMin'), t('gsStatMax')];
        const statKeys = ["mean", "median", "min", "max"];

        statKeys.forEach((key, si) => {
          const str = document.createElement("tr");
          str.style.cssText = "background:#f0f7f4;font-size:0.85rem;";

          // Index cell used as label
          const labelTd = document.createElement("td");
          labelTd.colSpan = 3;
          labelTd.style.cssText = "font-weight:700;color:var(--accent);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;padding:5px 10px;";
          labelTd.textContent = statLabels[si];
          str.appendChild(labelTd);

          statCols.forEach((vals, ci) => {
            const s = calcStats(vals);
            const td = document.createElement("td");
            td.classList.add("num");
            const v = s ? s[key] : null;
            // colour test-grade columns (not averages)
            const sem1TestRange = showSem1 ? [0, n1] : [0, 0];
            const sem2StatStart = showSem1 ? n1 + 1 : 0;
            const sem2TestRange = showSem2 ? [sem2StatStart, sem2StatStart + n2] : [sem2StatStart, sem2StatStart];
            const isTestCol = (ci >= sem1TestRange[0] && ci < sem1TestRange[1]) ||
                              (ci >= sem2TestRange[0] && ci < sem2TestRange[1]);
            td.textContent = v != null ? (isTestCol ? fmt(v) : fmtAvg(v)) : "—";
            if (v != null && isTestCol) {
              let testCfg = null;
              if (ci >= sem1TestRange[0] && ci < sem1TestRange[1]) {
                testCfg = getTestConfig(classObj, "sem1", ci - sem1TestRange[0]);
              } else if (ci >= sem2TestRange[0] && ci < sem2TestRange[1]) {
                testCfg = getTestConfig(classObj, "sem2", ci - sem2TestRange[0]);
              }
              applyGradeColor(td, v, testCfg, { classObj, isSummary: true });
            }
            str.appendChild(td);
          });

          // Rank and Comments — empty
          ["Rank", "Comments"].forEach(() => {
            str.appendChild(document.createElement("td"));
          });

          tbody.appendChild(str);
        });
      }

      thead.querySelectorAll(".test-link").forEach(link => {
        link.addEventListener("click", () => {
          appState.activeTest = {
            semester: link.getAttribute("data-sem"),
            testIndex: Number(link.getAttribute("data-test"))
          };
          renderTestSheet();
          showScreen("test");
        });
        link.addEventListener("contextmenu", ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const sem = link.getAttribute("data-sem");
          const testIndex = Number(link.getAttribute("data-test"));
          openTestHeaderMenu(ev.clientX, ev.clientY, classObj, sem, testIndex);
        });
      });

      const _renameDiff = getRenameDiff(classObj);
      const _renameBanner = document.getElementById('gs-rename-banner');
      if (_renameDiff) {
        document.getElementById('gs-rename-banner-text').textContent =
          tFmt('gsRenamesBannerText', { n: _renameDiff.orphaned.length });
        _renameBanner.classList.remove('hidden');
      } else {
        _renameBanner.classList.add('hidden');
      }

      updateNavTabs();
    }

    function calcStats(values) {
      const nums = values.filter(v => v != null && !Number.isNaN(v));
      if (!nums.length) return null;
      const sorted = [...nums].sort((a, b) => a - b);
      const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return { mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
    }

    function renderTestSheet() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;

      const sem = appState.activeTest.semester;
      const testIndex = appState.activeTest.testIndex;
      const testNo = testIndex + 1;
      const config = getTestConfig(classObj, sem, testIndex);

      const testLabel = config.testName ? config.testName : `T${testNo}`;
      document.getElementById("test-title").textContent = `${classObj.name} - ${sem.toUpperCase()} - ${testLabel}`;
      document.getElementById("test-meta").textContent = t('gsTestMetaDesc');
      if (typeof updateParticipationLinkBadge === 'function') {
        updateParticipationLinkBadge(classObj, sem, testIndex);
      }
      updateGsLinksBadges();
      syncTestAutoLinks(classObj, sem, testIndex);

      const configWrap = document.getElementById("test-config");
      const defaultTotal = calcCriteriaTotals(config, {});
      const totalPossible = defaultTotal.totalPossible;
      const thresholds = getThresholds(config);
      const thresholdText = thresholds.map(t => {
        const pct = fmt(t.ratio * 100);
        if (totalPossible > 0) {
          const pts = fmtN(t.ratio * totalPossible);
          return `${t.grade}=${pct}% (${pts} pts)`;
        }
        return `${t.grade}=${pct}%`;
      }).join(" | ");
      if (!config.grading.modelKey) {
        config.grading.modelKey = detectScaleModelKey(config.grading.manualThresholds);
      }
      if (!config.grading.pendingModelKey) {
        config.grading.pendingModelKey = config.grading.modelKey;
      }

      // — Config bar: clickable chips —
      configWrap.innerHTML = "";

      // Coefficient chip
      const coeffChip = document.createElement("div");
      coeffChip.className = "config-chip";
      const coeffDisplay = typeof config.fixedWeight === "number"
        ? tFmt('gsCoeffFixedDisplay', { val: fmtN(config.fixedWeight) })
        : String(config.coefficient);
      const coeffLabel = typeof config.fixedWeight === "number" ? t('gsCoeffLabelFixed') : t('gsCoeffLabelCoeff');
      coeffChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/gear.svg" class="btn-icon" alt="" /></span><span class="chip-label">${coeffLabel}</span><span class="chip-value">${coeffDisplay}</span>`;
      coeffChip.addEventListener("click", () => openTestOptionsModal(config, classObj, sem, testIndex, "coeff"));
      configWrap.appendChild(coeffChip);

      // Grading scale chip
      const gradingChip = document.createElement("div");
      gradingChip.className = "config-chip";
      const scaleDesc = config.grading.mode === "equation"
        ? (t('gsToptModeEquation') || "Equation")
        : (config.grading.mode === "manual"
          ? (config.grading.manualInputMode === "points" ? t('gsGradingModeManualPts') : t('gsGradingModeManual'))
          : `${fmt(config.grading.passPercentGrade4)}% → 4`);
      gradingChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/grade-sheet.svg" class="btn-icon" alt="" /></span><span class="chip-label">${t('gsGradingTitle')}</span><span class="chip-value">${scaleDesc}</span>`;
      gradingChip.addEventListener("click", () => openTestOptionsModal(config, classObj, sem, testIndex, "grading"));
      configWrap.appendChild(gradingChip);

      // Criteria chip
      const critChip = document.createElement("div");
      critChip.className = "config-chip";
      const critNames = config.criteria.map(c => c.name).join(", ") || t('gsCriteriaNone');
      critChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/edit-word.svg" class="btn-icon" alt="" /></span><span class="chip-label">${tFmt('gsCriteriaCountLabel', { n: config.criteria.length })}</span><span class="chip-value" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${critNames}</span>`;
      critChip.addEventListener("click", () => openTestOptionsModal(config, classObj, sem, testIndex, "criteria"));
      configWrap.appendChild(critChip);

      // Observation chips bank chip
      const chipsChip = document.createElement("div");
      chipsChip.className = "config-chip";
      const chipBankName = (config.chipBank || classObj.chipBank || 'correction-criteria.js').replace(/\.(js|json)$/i, '');
      chipsChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/speech-bubbles.svg" class="btn-icon" alt="" /></span><span class="chip-label">${t('gsChipsBankTitle', 'Observation Chips')}</span><span class="chip-value" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(chipBankName)}</span>`;
      chipsChip.addEventListener("click", () => openTestOptionsModal(config, classObj, sem, testIndex, "chips"));
      configWrap.appendChild(chipsChip);

      // Test info chip (date, scope, type)
      const testInfoChip = document.createElement("div");
      testInfoChip.className = "config-chip";
      const dateDisplay = config.testDate || "—";
      const scopeDisplay = config.scope || "—";
      const typeDisplay = config.type || "—";
      const nameDisplay = config.testName || "—";
      const nextGradeHighlightDisplay = Math.max(0, toNumber(config.nextGradeHighlightPoints) ?? 0);
      testInfoChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/planner.svg" class="btn-icon" alt="" /></span><span class="chip-label">${t('gsTestInfoTitle')}</span><span class="chip-value" style="max-width:360px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(nameDisplay)} · ${escapeHtml(dateDisplay)} · ${escapeHtml(scopeDisplay)} · ${escapeHtml(typeDisplay)} · next ${fmtN(nextGradeHighlightDisplay)}pts</span>`;
      testInfoChip.addEventListener("click", () => openTestOptionsModal(config, classObj, sem, testIndex, "info"));
      configWrap.appendChild(testInfoChip);

      // Scoring Progress & Deadline chip (Option D)
      const progress = computeScoringProgress(classObj, sem, testIndex, config);
      const progressChip = document.createElement("div");
      progressChip.className = "config-chip chip-scoring-progress" + (progress.remainingCount === 0 && progress.totalCount > 0 ? " all-done" : "");
      progressChip.id = "chip-scoring-progress";
      const etaStr = progress.hasEta ? ` · ≈ ${formatCorrectionTime(progress.etaMin)}` : "";
      const dlBadge = progress.deadlineStatus ? ` [${progress.daysLeft < 0 ? tFmt('gsToptDeadlineOverdue', { n: Math.abs(progress.daysLeft) }) : (progress.daysLeft === 0 ? t('gsToptDeadlineDueToday') : tFmt('gsToptDeadlineDaysLeft', { n: progress.daysLeft }))}]` : "";
      progressChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/stopwatch.svg" class="btn-icon" alt="" /></span><span class="chip-label">${t('gsScoringProgressTitle')}</span><span class="chip-value">${progress.remainingCount === 0 && progress.totalCount > 0 ? t('gsProgressAllDone') : tFmt('gsProgressRemaining', { n: progress.remainingCount }) + etaStr}${dlBadge}</span>`;
      progressChip.addEventListener("click", () => {
        openRemainingStudentsPopover(progressChip, classObj, sem, testIndex, config);
      });
      configWrap.appendChild(progressChip);

      // Info span
      const infoSpan = document.createElement("span");
      infoSpan.className = "small";
      const totalPts = defaultTotal.totalPossible;
      const scaleStr = thresholds.map(t => {
        const pts = t.ratio * totalPts;
        return `${fmtN(t.grade)}≥${fmtN(parseFloat(pts.toFixed(2)))}pts`;
      }).join(" · ");
      const bonusAvail = defaultTotal.totalBonusPossible && defaultTotal.totalBonusPossible > 0 ? ` <span style="color:var(--muted);font-size:0.9em;margin-left:0.5rem;">${tFmt('gsBonusAvailableLabel', { pts: fmtN(defaultTotal.totalBonusPossible) })}</span>` : "";
      infoSpan.innerHTML = `${tFmt('gsTotalPointsLabel', { pts: fmtN(totalPts) })} <span style="color:var(--muted);font-size:0.8em;margin-left:0.5em;">${scaleStr}</span>${bonusAvail}`;
      configWrap.appendChild(infoSpan);

      renderTestTopChips(classObj, sem, testIndex);

      const thead = document.querySelector("#test-table thead");
      const tbody = document.querySelector("#test-table tbody");
      thead.innerHTML = "";
      tbody.innerHTML = "";

      const hr = document.createElement("tr");
      [t('gsColIndex'), t('gsEditStudentFirstName'), t('gsEditStudentLastName'), t('gsStudentGradeTitle'), t('gsColNextGradeDelta'), t('gsColObservations'), t('gsColPoints'), t('gsColTime')].forEach(h => {
        const th = document.createElement("th");
        const label = document.createElement("div");
        label.className = "th-label";
        label.textContent = h;
        if ([t('gsStudentGradeTitle'), t('gsColNextGradeDelta'), t('gsColPoints'), t('gsColTime')].includes(h)) th.classList.add("td-pts");
        if ([t('gsColIndex'), t('gsEditStudentFirstName'), t('gsEditStudentLastName')].includes(h)) th.classList.add("col-shrink");
        th.appendChild(label);
        hr.appendChild(th);
      });

      config.criteria.forEach((criterion) => {
        const thPts = document.createElement("th");
        thPts.classList.add("td-pts", "th-criterion");

        const label = document.createElement("div");
        label.className = "th-label";
        label.style.cursor = "pointer";
        label.title = `${criterion.name} (${t('gsClickEditCriterion')})`;
        const minBadge = criterion.minPoints != null && criterion.minPoints !== 0 ? `min ${criterion.minPoints}, ` : '';
        const effCompIds = getCriterionEffectiveCompetenceIds(criterion, classObj, config);
        const compBadge = effCompIds.length > 0
          ? `<span class="score-badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-weight:700;margin-left:2px;" title="${effCompIds.map(cid => { const c = findLessonCompetence(cid); return (c ? (c.code || c.id) + ': ' + c.title : cid); }).join('\n')}"><img src="../assets/icons/award.svg" style="width:11px;height:11px;vertical-align:-1px;margin-right:2px;" alt="" />${effCompIds.length}</span>`
          : '';
        label.innerHTML = `<strong>${criterion.name}</strong><span class="score-badge">${criterion.isBonus ? 'bonus · ' : ''}${minBadge}max ${criterion.maxPoints}, ${criterion.pointCoefficient}</span>${compBadge}`;
        label.addEventListener("click", () => criterionPopupOpen(criterion, classObj, sem, testIndex));
        thPts.appendChild(label);

        hr.appendChild(thPts);
      });

      thead.appendChild(hr);

      // Pre-calculate per-criterion averages for below-average highlighting
      const perCritVals = config.criteria.map(criterion =>
        classObj.students.map(student => {
          const cMap = student.criteriaResults[sem][testIndex] || {};
          return cMap[criterion.id] ? toNumber(cMap[criterion.id].points) : null;
        }).filter(v => v != null)
      );
      const perCritStats = perCritVals.map(calcStats);

      classObj.students.forEach(student => {
        const tr = document.createElement("tr");
        tr.dataset.studentId = student.id;
        const isAbsent = isStudentAbsentForTest(student.id, config);
        if (isAbsent) {
          tr.classList.add("student-row-absent");
        }
        // If the student no longer appears in the external class-groups.js,
        // mark the row as "missing" (greyed out) but keep their grades.
        try {
          if (!studentPresentInClassGroups(classObj, student)) {
            tr.classList.add('missing-student');
            tr.title = 'Student not found in current class-groups.js — grades retained.';
          }
        } catch (e) {
          // ignore and render normally
        }

        const tdIdx = document.createElement("td");
        tdIdx.textContent = String(student.index);
        tdIdx.classList.add("col-shrink");

        const nameMode = getGsNameDisplayMode();
        const tdFirst = document.createElement("td");
        tdFirst.classList.add("col-shrink");
        const tdLast = document.createElement("td");
        tdLast.classList.add("col-shrink");
        const firstNameSpan = document.createElement("span");
        firstNameSpan.className = "student-name-link student-name-static";
        
        let fnText = student.firstName || "";
        let lnText = student.lastName || "";
        if (nameMode === 'custom') {
          if (student.customName) {
            fnText = student.customName;
            lnText = "";
          } else {
            fnText = student.firstName || "";
            lnText = student.lastName ? (student.lastName.trim().charAt(0).toUpperCase() + '.') : "";
          }
        } else if (nameMode === 'first') {
          lnText = "";
        } else if (nameMode === 'last') {
          fnText = student.lastName || "";
          lnText = "";
        }
        
        firstNameSpan.textContent = fnText;
        if (student.customName) {
          firstNameSpan.title = `${student.firstName} ${student.lastName} (Custom: ${student.customName})`;
        }
        tdFirst.appendChild(firstNameSpan);

        if (isAbsent) {
          const absentBadge = document.createElement("span");
          absentBadge.className = "gs-absent-badge";
          absentBadge.textContent = t('gsAbsentBadgeLabel');
          absentBadge.title = t('gsAbsentBadgeTitle');
          tdFirst.appendChild(absentBadge);
        }

        if (typeof LinksService !== 'undefined') {
          const studentEvalUrn = `cmt:eval:${classObj.id}:${sem}:${testIndex}:student:${student.id}`;
          const subLinks = LinksService.getLinksForSync(studentEvalUrn);
          const subTags = LinksService.getTagsForSync(studentEvalUrn);
          if (subLinks.length > 0 || subTags.length > 0) {
            const badge = document.createElement("span");
            badge.className = "gs-submission-badge";
            badge.style.cssText = "display:inline-block;margin-left:6px;font-size:0.68rem;padding:1px 5px;font-weight:900;border:1.5px solid #000;background:#fef08a;color:#000;cursor:pointer;line-height:1.2;vertical-align:middle;box-shadow:1.5px 1.5px 0px #000;";
            const tagStr = subTags.length ? ` #${subTags.join(' #')}` : '';
            badge.textContent = `[${subLinks.length > 0 ? 'WORK' : 'TAG'}${subLinks.length > 1 ? ': ' + subLinks.length : ''}${tagStr}]`;
            badge.title = t('gsStudentWorkAttached', 'Student work attached / tags. Click to open.');
            badge.addEventListener("click", (e) => {
              e.stopPropagation();
              gsOpenStudentWorkModal(student, classObj, sem, testIndex);
            });
            tdFirst.appendChild(badge);
          }
        }

        const lastNameSpan = document.createElement("span");
        lastNameSpan.className = "student-name-link student-name-static";
        lastNameSpan.textContent = lnText;
        tdLast.appendChild(lastNameSpan);

        const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        student.criteriaResults[sem][testIndex] = criteriaMap;

        const tdGrade = document.createElement("td");
        tdGrade.className = "td-grade-display";
        const displayGrade = getTestDisplayGrade(student, classObj, sem, testIndex);
        tdGrade.textContent = displayGrade == null ? "—" : String(displayGrade);
        tdGrade.style.cursor = "pointer";
        tdGrade.title = t('gsClickEditGrade');
        tdGrade.addEventListener("click", () => openStudentModal(student, classObj, sem, testIndex, tr, config));
        applyGradeColor(tdGrade, displayGrade, config);

        const tdNote = document.createElement("td");
        const noteArray = student.testNotes[sem];
        if (!Array.isArray(noteArray[testIndex])) {
          const v = noteArray[testIndex];
          noteArray[testIndex] = (typeof v === "string" && v.trim()) ? [{ label: "", text: v }] : [];
        }
        const _stripMd = str => str.replace(/[*_#`~>\[\]!]/g, '').replace(/\s+/g, ' ').trim();
        tdNote.textContent = noteArray[testIndex].map(s => {
          const value = _stripMd(sectionDisplayText(s));
          return value ? (s.label ? s.label + ": " : "") + value : "";
        }).filter(Boolean).join(" / ") || "—";
        tdNote.style.cssText = "width:80px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:0.82rem;";
        applyObsCellTooltip(tdNote, noteArray[testIndex]);

        const totals = calcCriteriaTotals(config, criteriaMap);
        const tdNextDelta = document.createElement("td");
        tdNextDelta.className = "td-criteria-display";
        updateNextGradeDeltaCell(tdNextDelta, config, totals, displayGrade);

        const tdCriteriaScore = document.createElement("td");
        tdCriteriaScore.className = "td-criteria-display";
        if (totals.totalPossible > 0) {
          const displayedScored = fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0));
          tdCriteriaScore.textContent = `${displayedScored} / ${fmtN(totals.totalPossible)}`;
        } else {
          tdCriteriaScore.textContent = "—";
        }

        if (!student.correctionTime) student.correctionTime = { sem1: Array(TEST_COUNT_PER_SEM).fill(null), sem2: Array(TEST_COUNT_PER_SEM).fill(null) };
        const tdCorrTime = document.createElement("td");
        tdCorrTime.className = "td-criteria-display";
        const ctVal = student.correctionTime[sem][testIndex];
        tdCorrTime.textContent = formatCorrectionTime(ctVal);

        [tdIdx, tdFirst, tdLast, tdGrade, tdNextDelta, tdNote, tdCriteriaScore, tdCorrTime].forEach(td => tr.appendChild(td));

        tr.addEventListener("contextmenu", ev => {
          if (ev.target.closest("button,input,textarea,select,a,label")) return;
          ev.preventDefault();
          openTestRowMenu(ev.clientX, ev.clientY, student, classObj, sem, testIndex, config);
        });

        // Per-criterion score cells (index 7+)
        config.criteria.forEach((criterion, ci) => {
          if (!criteriaMap[criterion.id]) criteriaMap[criterion.id] = { points: null, comment: "" };
          const td = document.createElement("td");
          td.className = "td-criteria-display";
          const pts = criteriaMap[criterion.id].points;
          const ptsNum = toNumber(pts);
          td.textContent = ptsNum != null ? `${fmtN(ptsNum)} / ${fmtN(criterion.maxPoints)}` : "—";
          const critMean = perCritStats[ci] ? perCritStats[ci].mean : null;
          if (ptsNum != null && critMean != null && ptsNum < critMean) {
            td.style.backgroundColor = "#fde8e8";
          }
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      // — Statistics rows —
      renderTestSheetStats(tbody, classObj, sem, testIndex, config, perCritStats);

    }

    function renderTestSheetStats(tbody, classObj, sem, testIndex, config, perCritStats) {
      // Remove any existing stats rows
      tbody.querySelectorAll("tr[data-stats-row]").forEach(r => r.remove());

      const gradeVals = classObj.students
        .map(student => getTestDisplayGrade(student, classObj, sem, testIndex))
        .filter(v => v != null);
      const critScoreVals = classObj.students.map(student => {
        const cMap = student.criteriaResults[sem][testIndex] || {};
        const tot = calcCriteriaTotals(config, cMap);
        return tot.totalPossible > 0 ? (tot.totalScored + (tot.totalBonusScored || 0)) : null;
      }).filter(v => v != null);

      const gradeStats = calcStats(gradeVals);
      const critScoreStats = calcStats(critScoreVals);
      const corrTimeVals = classObj.students.map(student => {
        const t = student.correctionTime && student.correctionTime[sem] ? student.correctionTime[sem][testIndex] : null;
        return (t != null && !isNaN(t) && t !== '') ? Number(t) : null;
      }).filter(v => v != null);
      const corrTimeStats = calcStats(corrTimeVals);
      const totalCorrTime = corrTimeVals.length > 0 ? corrTimeVals.reduce((a, b) => a + b, 0) : null;

      if (gradeStats || critScoreStats || perCritStats.some(s => s != null) || corrTimeVals.length > 0) {
        const sepTr = document.createElement("tr");
        sepTr.dataset.statsRow = "1";
        const sepTd = document.createElement("td");
        sepTd.colSpan = 8 + config.criteria.length;
        sepTd.style.cssText = "padding:0;background:var(--line);height:2px;";
        sepTr.appendChild(sepTd);
        tbody.appendChild(sepTr);

        const statLabels = ["Mean", "Median", "Min", "Max"];
        const statKeys = ["mean", "median", "min", "max"];
        const defaultTotals = calcCriteriaTotals(config, {});
        const totalPoss = defaultTotals.totalPossible;

        statKeys.forEach((key, si) => {
          const str = document.createElement("tr");
          str.dataset.statsRow = "1";
          str.style.cssText = "background:#f0f7f4;font-size:0.85rem;";

          const labelTd = document.createElement("td");
          labelTd.colSpan = 3;
          labelTd.style.cssText = "font-weight:700;color:var(--accent);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;padding:5px 10px;";
          labelTd.textContent = statLabels[si];
          str.appendChild(labelTd);

          const gradeTd = document.createElement("td");
          gradeTd.className = "td-grade-display";
          const gv = gradeStats ? gradeStats[key] : null;
          gradeTd.textContent = gv != null ? fmt(gv) : "—";
          if (gv != null) applyGradeColor(gradeTd, gv, config);
          str.appendChild(gradeTd);

          const nextDeltaStatTd = document.createElement("td");
          str.appendChild(nextDeltaStatTd);

          const obsStatTd = document.createElement("td");
          str.appendChild(obsStatTd);

          const critScoreTd = document.createElement("td");
          critScoreTd.className = "td-criteria-display";
          const csv = critScoreStats ? critScoreStats[key] : null;
          critScoreTd.textContent = (csv != null && totalPoss > 0) ? `${fmt(csv)} / ${fmtN(totalPoss)}` : "—";
          str.appendChild(critScoreTd);

          const corrTimeStatTd = document.createElement("td");
          corrTimeStatTd.className = "td-criteria-display";
          const ctv = corrTimeStats ? corrTimeStats[key] : null;
          corrTimeStatTd.textContent = ctv != null ? formatCorrectionTime(ctv) : "—";
          str.appendChild(corrTimeStatTd);

          config.criteria.forEach((criterion, ci) => {
            const td = document.createElement("td");
            td.className = "td-criteria-display";
            const s = perCritStats[ci];
            const v = s ? s[key] : null;
            td.textContent = v != null ? `${fmt(v)} / ${fmtN(criterion.maxPoints)}${criterion.isBonus ? ' (bonus)' : ''}` : "—";
            str.appendChild(td);
          });

          tbody.appendChild(str);
        });

        // Total Row (Total Time & Aggregate)
        const totTr = document.createElement("tr");
        totTr.dataset.statsRow = "1";
        totTr.style.cssText = "background:#f0f7f4;font-size:0.85rem;border-top:1px dashed var(--line);";

        const totLabelTd = document.createElement("td");
        totLabelTd.colSpan = 3;
        totLabelTd.style.cssText = "font-weight:800;color:var(--accent);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;padding:5px 10px;";
        totLabelTd.textContent = t('gsStatTotalTime', 'Total Time');
        totTr.appendChild(totLabelTd);

        const totGradeTd = document.createElement("td");
        totGradeTd.className = "td-grade-display";
        totGradeTd.textContent = "—";
        totTr.appendChild(totGradeTd);

        const totNextDeltaTd = document.createElement("td");
        totTr.appendChild(totNextDeltaTd);

        const totObsTd = document.createElement("td");
        totTr.appendChild(totObsTd);

        const totCritScoreTd = document.createElement("td");
        totCritScoreTd.className = "td-criteria-display";
        totCritScoreTd.textContent = "—";
        totTr.appendChild(totCritScoreTd);

        const totCorrTimeTd = document.createElement("td");
        totCorrTimeTd.className = "td-criteria-display";
        totCorrTimeTd.style.fontWeight = "800";
        totCorrTimeTd.textContent = totalCorrTime != null ? formatCorrectionTime(totalCorrTime) : "—";
        totTr.appendChild(totCorrTimeTd);

        config.criteria.forEach(() => {
          const td = document.createElement("td");
          td.className = "td-criteria-display";
          td.textContent = "—";
          totTr.appendChild(td);
        });

        tbody.appendChild(totTr);
      }
      updateNavTabs();
    }

    // ── Config popups ─────────────────────────────────────────────

    function openCoeffPopup(config) {
      const isFixed = typeof config.fixedWeight === "number";
      document.getElementById("coeff-popup-mode-coeff").checked = !isFixed;
      document.getElementById("coeff-popup-mode-fixed").checked = isFixed;
      document.getElementById("coeff-popup-input").value = String(config.coefficient);
      document.getElementById("coeff-popup-fixed-input").value = isFixed ? String(config.fixedWeight) : "";
      document.getElementById("coeff-popup-coeff-wrap").classList.toggle("hidden", isFixed);
      document.getElementById("coeff-popup-fixed-wrap").classList.toggle("hidden", !isFixed);

      const overlay = document.getElementById("coeff-popup-overlay");
      overlay.classList.remove("hidden");
      (isFixed ? document.getElementById("coeff-popup-fixed-input") : document.getElementById("coeff-popup-input")).focus();

      document.querySelectorAll("input[name='coeff-popup-mode']").forEach(radio => {
        radio.onchange = () => {
          const fixed = document.getElementById("coeff-popup-mode-fixed").checked;
          document.getElementById("coeff-popup-coeff-wrap").classList.toggle("hidden", fixed);
          document.getElementById("coeff-popup-fixed-wrap").classList.toggle("hidden", !fixed);
        };
      });

      document.getElementById("coeff-popup-save").onclick = () => {
        const fixed = document.getElementById("coeff-popup-mode-fixed").checked;
        if (fixed) {
          config.fixedWeight = Math.max(0, Math.min(100, toNumber(document.getElementById("coeff-popup-fixed-input").value) ?? 0));
        } else {
          config.fixedWeight = null;
          config.coefficient = Math.max(0, toNumber(document.getElementById("coeff-popup-input").value) ?? 1);
        }
        saveState();
        renderTestSheet();
        renderSummary();
        overlay.classList.add("hidden");
      };
      document.getElementById("coeff-popup-cancel").onclick = () => overlay.classList.add("hidden");
      overlay.onclick = e => { if (e.target === overlay) overlay.classList.add("hidden"); };
    }

    function openGradingPopup(config, classObj, sem, testIndex) {
      if (isParticipationTestConfig(config) && (!config.grading || !config.grading.customManualScale)) {
        syncParticipationGradingScale(config);
      }
      // Draft copy of grading
      const popTotals = calcCriteriaTotals(config, {});
      const totalPossible = Math.max(0, popTotals.totalPossible);
      const initSteps = getTestGradeSteps(config);
      const hasValidManualPoints = config.grading.manualInputMode === "points" &&
        config.grading.manualPoints &&
        typeof config.grading.manualPoints === "object" &&
        Object.values(config.grading.manualPoints).some(v => Number(v) > 0);
      const draft = {
        mode: config.grading.mode,
        passPercentGrade4: config.grading.passPercentGrade4,
        minGrade: config.grading.minGrade,
        maxGrade: config.grading.maxGrade,
        interval: config.grading.interval,
        customManualScale: !!config.grading.customManualScale,
        modelKey: config.grading.modelKey,
        pendingModelKey: config.grading.pendingModelKey,
        scaleBank: config.grading.scaleBank || _activeScaleBankFilename || 'grade-scale-models.js',
        manualInputMode: config.grading.manualInputMode === "points" ? "points" : "percent",
        manualThresholds: Object.assign({}, config.grading.manualThresholds),
        manualPoints: Object.assign(
          buildManualPointsFromPercents(config.grading.manualThresholds, totalPossible, initSteps),
          hasValidManualPoints ? config.grading.manualPoints : {}
        )
      };

      const modeEl = document.getElementById("grading-popup-mode");
      function syncModeSelectFromDraft() {
        if (draft.mode === "manual" && draft.manualInputMode === "points") {
          modeEl.value = "manual-points";
          return;
        }
        modeEl.value = draft.mode;
      }
      syncModeSelectFromDraft();

      const pass4El = document.getElementById("grading-popup-pass4");
      pass4El.value = fmt(draft.passPercentGrade4);

      const modelSel = document.getElementById("grading-popup-model");
      const scaleBankSel = document.getElementById("grading-popup-scale-bank");

      function refreshPopupModelOptions(bankFn) {
        const models = getScaleModelsList(bankFn);
        modelSel.innerHTML = `<option value="custom" ${draft.pendingModelKey === "custom" ? "selected" : ""}>Custom</option>` +
          models.map(m => `<option value="${m.key}" ${draft.pendingModelKey === m.key ? "selected" : ""}>${m.label}</option>`).join("");
      }

      if (scaleBankSel) {
        populateScaleBankSelectElement(scaleBankSel, draft.scaleBank);
        scaleBankSel.onchange = () => {
          draft.scaleBank = scaleBankSel.value;
          refreshPopupModelOptions(draft.scaleBank);
        };
      }
      refreshPopupModelOptions(draft.scaleBank);

      const manualUnitEl = document.getElementById("grading-popup-manual-unit");
      const manualNoteEl = document.getElementById("grading-popup-manual-note");
      manualUnitEl.value = draft.manualInputMode;

      function refreshManualVis() {
        const manualWrap = document.getElementById("grading-popup-manual-wrap");
        const formulaWrap = document.getElementById("grading-popup-formula-wrap");
        if (draft.mode === "manual") {
          manualWrap.classList.remove("hidden");
          formulaWrap.classList.add("hidden");
        } else {
          manualWrap.classList.add("hidden");
          formulaWrap.classList.remove("hidden");
        }
      }

      // Build threshold inputs
      const threshWrap = document.getElementById("grading-popup-thresholds");
      function refreshManualNote() {
        if (draft.manualInputMode === "points") {
          if (totalPossible > 0) {
            manualNoteEl.textContent = tFmt('gsGradingManualTotalPts', { total: fmtN(totalPossible) });
          } else {
            manualNoteEl.textContent = t('gsGradingManualNeedCrit');
          }
          return;
        }
        manualNoteEl.textContent = t('gsGradingManualSetPct');
      }

      function rebuildManualInputs() {
        const usePoints = draft.manualInputMode === "points";
        threshWrap.innerHTML = "";
        const steps = getTestGradeSteps({ ...config, grading: draft });
        const scaleModel = (draft.pendingModelKey && draft.pendingModelKey !== "custom")
          ? getScaleModel(draft.pendingModelKey)
          : (draft.modelKey ? getScaleModel(draft.modelKey) : null);

        steps.forEach((g, gIdx) => {
          const key = String(g);
          const color = (scaleModel && scaleModel.colors && scaleModel.colors[key]) || getScaleGradeColor(key, draft.pendingModelKey || draft.modelKey) || getDefaultGradeColor(key, gIdx, steps.length);
          const textColor = getHighContrastTextColor(color);
          const label = document.createElement("label");
          label.style.cssText = `display:flex;align-items:center;gap:6px;font-size:0.82rem;border:1px solid var(--line);border-left:4px solid ${color};border-radius:8px;padding:4px 8px;background:#fff;`;
          
          const badge = document.createElement("span");
          badge.textContent = String(g);
          badge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;min-width:28px;padding:2px 6px;border-radius:5px;background:${color}18;color:${textColor};border:1px solid ${color};font-weight:700;font-size:0.82rem;`;

          const inp = document.createElement("input");
          inp.type = "number";
          inp.min = "0";
          inp.max = usePoints ? "" : "100";
          inp.step = "0.1";
          inp.value = fmt(usePoints ? draft.manualPoints[key] : draft.manualThresholds[key]);
          inp.style.cssText = "width:72px;border:1px solid var(--line);border-radius:6px;padding:3px 5px;font:inherit;";
          inp.dataset.grade = key;
          inp.addEventListener("input", () => {
            draft.customManualScale = true;
            if (usePoints) {
              draft.manualPoints[key] = Math.max(0, toNumber(inp.value) ?? 0);
            } else {
              draft.manualThresholds[key] = Math.max(0, Math.min(100, toNumber(inp.value) ?? 0));
            }
          });
          label.append(
            badge,
            inp,
            document.createTextNode(usePoints ? " pts" : " %")
          );
          threshWrap.appendChild(label);
        });
        refreshManualNote();
      }

      rebuildManualInputs();

      refreshManualVis();

      modeEl.onchange = () => {
        const selected = modeEl.value;
        if (selected === "manual-points") {
          draft.mode = "manual";
          draft.manualInputMode = "points";
          manualUnitEl.value = "points";
          if (!draft.manualPoints || typeof draft.manualPoints !== "object") {
            draft.manualPoints = buildManualPointsFromPercents(draft.manualThresholds, totalPossible);
          }
          rebuildManualInputs();
          refreshManualVis();
          return;
        }
        draft.mode = selected;
        if (selected === "manual" && draft.manualInputMode !== "percent" && draft.manualInputMode !== "points") {
          draft.manualInputMode = "percent";
          manualUnitEl.value = "percent";
          rebuildManualInputs();
        }
        refreshManualVis();
      };

      manualUnitEl.onchange = () => {
        const nextMode = manualUnitEl.value === "points" ? "points" : "percent";
        if (nextMode === draft.manualInputMode) return;
        if (nextMode === "points") {
          draft.manualPoints = buildManualPointsFromPercents(draft.manualThresholds, totalPossible);
        } else {
          draft.manualThresholds = buildManualPercentsFromPoints(draft.manualPoints, totalPossible, draft.manualThresholds);
        }
        draft.manualInputMode = nextMode;
        rebuildManualInputs();
      };

      modelSel.onchange = () => { draft.pendingModelKey = modelSel.value; };

      document.getElementById("grading-popup-apply-model").onclick = () => {
        const key = draft.pendingModelKey;
        if (key === "custom") {
          draft.mode = "manual";
          syncModeSelectFromDraft();
        } else {
          // Apply model thresholds temporarily to draft
          const tmpConfig = { grading: { mode: draft.mode, passPercentGrade4: draft.passPercentGrade4, modelKey: draft.pendingModelKey, pendingModelKey: draft.pendingModelKey, scaleBank: draft.scaleBank, manualThresholds: Object.assign({}, draft.manualThresholds) } };
          applyScaleModelToConfig(tmpConfig, key, draft.scaleBank);
          Object.assign(draft, tmpConfig.grading);
          draft.mode = tmpConfig.grading.mode;
          modeEl.value = draft.mode;
          draft.manualPoints = buildManualPointsFromPercents(draft.manualThresholds, totalPossible);
          if (draft.manualInputMode === "points") {
            draft.manualThresholds = buildManualPercentsFromPoints(draft.manualPoints, totalPossible, draft.manualThresholds);
          }
        }
        syncModeSelectFromDraft();
        rebuildManualInputs();
        refreshManualVis();
      };

      pass4El.oninput = () => { draft.passPercentGrade4 = evaluatePass4Formula(pass4El.value, draft.passPercentGrade4 || 66.67); };

      const overlay = document.getElementById("grading-popup-overlay");
      overlay.classList.remove("hidden");

      document.getElementById("grading-popup-save").onclick = () => {
        const steps = getTestGradeSteps({ ...config, grading: draft });
        if (draft.manualInputMode === "points") {
          draft.manualThresholds = buildManualPercentsFromPoints(draft.manualPoints, totalPossible, draft.manualThresholds, steps);
        } else {
          draft.manualPoints = buildManualPointsFromPercents(draft.manualThresholds, totalPossible, steps);
        }
        Object.assign(config.grading, draft);
        recalcAllStudentGradesForTest(classObj, sem, testIndex);
        saveState();
        renderTestSheet();
        renderSummary();
        overlay.classList.add("hidden");
      };
      document.getElementById("grading-popup-cancel").onclick = () => overlay.classList.add("hidden");
      overlay.onclick = e => { if (e.target === overlay) overlay.classList.add("hidden"); };
    }

    function openCriteriaMgmtPopup(config, classObj, sem, testIndex) {
      const overlay = document.getElementById("criteria-mgmt-popup-overlay");

      function rebuildList() {
        const list = document.getElementById("criteria-mgmt-list");
        list.innerHTML = "";
        if (config.criteria.length === 0) {
          const empty = document.createElement("div");
          empty.className = "small";
          empty.style.padding = "8px";
          empty.textContent = t('gsNoCriteriaYet');
          list.appendChild(empty);
          return;
        }
        config.criteria.forEach(criterion => {
          const row = document.createElement("div");
          row.className = "criteria-mgmt-row";
          const minMeta = criterion.minPoints != null && criterion.minPoints !== 0 ? `min ${criterion.minPoints}, ` : '';
          row.innerHTML = `<span class="crit-row-name">${escapeHtml(criterion.name)}</span><span class="crit-row-meta">${minMeta}max ${criterion.maxPoints}, c=${criterion.pointCoefficient}${criterion.isBonus ? ', bonus' : ''}</span>`;
          row.addEventListener("click", () => {
            criterionPopupOpen(criterion, classObj, sem, testIndex);
          });
          list.appendChild(row);
        });
      }

      rebuildList();

      // Populate preset selector
      let _critMgmtPresetCompetenceIds = [];
      const presetSel = document.getElementById("criteria-mgmt-preset");
      const activeBank = getTestCriteriaBank(classObj, config);
      const presetCriteriaList = (activeBank && Array.isArray(activeBank.criteria))
        ? activeBank.criteria
        : ((typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : []);
      presetSel.innerHTML = '<option value="">Preset…</option>' +
        presetCriteriaList.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
      presetSel.onchange = () => {
        if (presetSel.value) {
          const entry = presetCriteriaList.find(c => c.name === presetSel.value);
          document.getElementById("criteria-mgmt-name").value = presetSel.value;
          if (entry && entry.minPoints != null) document.getElementById("criteria-mgmt-min").value = String(entry.minPoints);
          else document.getElementById("criteria-mgmt-min").value = "0";
          if (entry && entry.maxPoints != null) document.getElementById("criteria-mgmt-max").value = String(entry.maxPoints);
          if (entry && entry.pointCoefficient != null) document.getElementById("criteria-mgmt-coeff").value = String(entry.pointCoefficient);
          _critMgmtPresetCompetenceIds = (entry && Array.isArray(entry.competenceIds)) ? [...entry.competenceIds] : [];
          presetSel.value = "";
        }
      };

      document.getElementById("criteria-mgmt-add").onclick = () => {
        const nameEl = document.getElementById("criteria-mgmt-name");
        const minEl = document.getElementById("criteria-mgmt-min");
        const maxEl = document.getElementById("criteria-mgmt-max");
        const coeffEl = document.getElementById("criteria-mgmt-coeff");
        const bonusEl = document.getElementById("criteria-mgmt-bonus");
        const countEl = document.getElementById("criteria-mgmt-count");
        const name = nameEl.value.trim();
        if (!name) { nameEl.focus(); return; }
        const minPoints = toNumber(minEl.value) ?? 0;
        const maxPoints = Math.max(minPoints, toNumber(maxEl.value) ?? 1);
        const pointCoeff = Math.max(0, toNumber(coeffEl.value) ?? 1);
        const isBonus = !!(bonusEl && bonusEl.checked);
        const count = Math.max(1, Math.floor(toNumber(countEl.value) ?? 1));
        const startIndex = config.criteria.length + 1;
        let compIdsToAdd = _critMgmtPresetCompetenceIds ? [..._critMgmtPresetCompetenceIds] : [];
        if (!compIdsToAdd.length) {
          const matched = presetCriteriaList.find(c => c && c.name && c.name.toLowerCase() === name.toLowerCase());
          if (matched && Array.isArray(matched.competenceIds)) compIdsToAdd = [...matched.competenceIds];
        }
        if (count === 1) {
          config.criteria.push(makeCriterion(name, maxPoints, pointCoeff, isBonus, minPoints, null, compIdsToAdd));
        } else {
          for (let i = 0; i < count; i++) {
            config.criteria.push(makeCriterion(`${name} ${startIndex + i}`, maxPoints, pointCoeff, isBonus, minPoints, null, compIdsToAdd));
          }
        }
        _critMgmtPresetCompetenceIds = [];
        nameEl.value = "";
        minEl.value = "0";
        maxEl.value = "1";
        coeffEl.value = "1";
        countEl.value = "1";
        saveState();
        rebuildList();
        renderTestSheet();
        renderSummary();
      };

      document.getElementById("criteria-mgmt-close").onclick = () => {
        overlay.classList.add("hidden");
      };
      overlay.onclick = e => { if (e.target === overlay) overlay.classList.add("hidden"); };
      overlay.classList.remove("hidden");
    }

    function openTestInfoPopup(config) {
      document.getElementById("test-info-name").value = config.testName || "";
      document.getElementById("test-info-date").value = config.testDate || "";
      document.getElementById("test-info-scope").value = config.scope || "";
      document.getElementById("test-info-type").value = config.type || "";
      document.getElementById("test-info-next-grade-highlight").value = fmtN(Math.max(0, toNumber(config.nextGradeHighlightPoints) ?? 0));
      const overlay = document.getElementById("test-info-popup-overlay");
      overlay.classList.remove("hidden");
      document.getElementById("test-info-name").focus();
      document.getElementById("test-info-popup-save").onclick = () => {
        config.testName = document.getElementById("test-info-name").value.trim();
        config.testDate = document.getElementById("test-info-date").value;
        config.scope = document.getElementById("test-info-scope").value.trim();
        config.type = document.getElementById("test-info-type").value.trim();
        config.nextGradeHighlightPoints = Math.max(0, toNumber(document.getElementById("test-info-next-grade-highlight").value) ?? 0);
        saveState();
        renderTestSheet();
        renderSummary();
        overlay.classList.add("hidden");
      };
      document.getElementById("test-info-popup-cancel").onclick = () => overlay.classList.add("hidden");
      overlay.onclick = e => { if (e.target === overlay) overlay.classList.add("hidden"); };
    }


    // ── Move a test between terms ─────────────────────────────────
    function moveTestBetweenSems(classObj, fromSem, fromIdx, toSem) {
      const toIdx = classObj.testCounts[toSem];
      if (toIdx >= TEST_COUNT_PER_SEM) return null;

      classObj.testConfigs[toSem][toIdx] = classObj.testConfigs[fromSem][fromIdx];

      classObj.students.forEach(student => {
        const fromGrades = fromSem === "sem1" ? student.sem1Tests : student.sem2Tests;
        const toGrades   = toSem   === "sem1" ? student.sem1Tests : student.sem2Tests;
        toGrades[toIdx] = fromGrades[fromIdx];
        student.criteriaResults[toSem][toIdx] = Object.assign({}, student.criteriaResults[fromSem]?.[fromIdx] || {});
        if (student.correctionTime && Array.isArray(student.correctionTime[toSem]) && Array.isArray(student.correctionTime[fromSem])) {
          student.correctionTime[toSem][toIdx] = student.correctionTime[fromSem][fromIdx] ?? null;
        }
      });

      // Shift subsequent tests in fromSem left to close the gap
      for (let i = fromIdx; i < classObj.testCounts[fromSem] - 1; i++) {
        classObj.testConfigs[fromSem][i] = classObj.testConfigs[fromSem][i + 1];
        classObj.students.forEach(student => {
          const grades = fromSem === "sem1" ? student.sem1Tests : student.sem2Tests;
          grades[i] = grades[i + 1];
          student.criteriaResults[fromSem][i] = Object.assign({}, student.criteriaResults[fromSem]?.[i + 1] || {});
          if (student.correctionTime && Array.isArray(student.correctionTime[fromSem])) {
            student.correctionTime[fromSem][i] = student.correctionTime[fromSem][i + 1] ?? null;
          }
        });
      }

      const lastIdx = classObj.testCounts[fromSem] - 1;
      classObj.testConfigs[fromSem][lastIdx] = null;
      classObj.students.forEach(student => {
        const grades = fromSem === "sem1" ? student.sem1Tests : student.sem2Tests;
        grades[lastIdx] = null;
        student.criteriaResults[fromSem][lastIdx] = {};
        if (student.correctionTime && Array.isArray(student.correctionTime[fromSem])) {
          student.correctionTime[fromSem][lastIdx] = null;
        }
      });

      classObj.testCounts[fromSem]--;
      classObj.testCounts[toSem]++;
      return { sem: toSem, testIndex: toIdx };
    }

    // ── Unified Test Options modal ────────────────────────────────
    async function openTestOptionsModal(config, classObj, sem, testIndex, openSection) {
      const overlay = document.getElementById("test-options-overlay");
      let activeSem = sem;
      let activeTestIndex = testIndex;
      await loadAvailableCriteriaBanks();
      await loadAvailableChipBanks();

      // Header context badge
      const badge = document.getElementById("topt-context-badge");
      if (badge) {
        badge.textContent = tFmt('gsToptHeaderContext', { name: classObj.name, sem: sem === "sem1" ? t('gsSem1') : t('gsSem2'), n: activeTestIndex + 1 });
      }

      // Tab switching controller
      function switchToptTab(tabKey) {
        const targetTab = tabKey || "info";
        overlay.querySelectorAll(".topt-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === targetTab));
        overlay.querySelectorAll(".topt-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.tab === targetTab));
        if (targetTab === "grading") updateLiveGradePreview();
      }
      window._toptSwitchTab = switchToptTab;

      overlay.querySelectorAll(".topt-tab-btn").forEach(btn => {
        btn.onclick = () => switchToptTab(btn.dataset.tab);
      });

      // ── Test Info ──────────────────────────────────────────────
      document.getElementById("topt-info-name").value = config.testName || "";
      document.getElementById("topt-info-date").value = config.testDate || "";
      document.getElementById("topt-info-scope").value = config.scope || "";
      document.getElementById("topt-info-type").value = config.type || "";
      document.getElementById("topt-info-next-grade").value = fmtN(Math.max(0, toNumber(config.nextGradeHighlightPoints) ?? 0));

      const dlInput = document.getElementById("topt-info-deadline");
      const dlTimeInput = document.getElementById("topt-info-deadline-time");
      const dlRemindersInput = document.getElementById("topt-info-deadline-reminders");
      const dlDaysAfterInput = document.getElementById("topt-info-deadline-days-after");
      const dlAutoInput = document.getElementById("topt-info-deadline-auto");
      const btnApplyOffset = document.getElementById("topt-deadline-apply-offset");
      const toptDateInput = document.getElementById("topt-info-date");
      const dlStatusEl = document.getElementById("topt-deadline-live-status");

      if (dlInput) {
        const calculateDeadlineFromTestDate = (dateStr, offsetDays) => {
          if (!dateStr) return '';
          const d = new Date(dateStr + 'T00:00:00');
          if (isNaN(d.getTime())) return '';
          d.setDate(d.getDate() + (parseInt(offsetDays, 10) || 13));
          return d.toISOString().slice(0, 10);
        };

        const daysAfter = (typeof config.correctionDeadlineDaysAfter === 'number' && !isNaN(config.correctionDeadlineDaysAfter))
          ? config.correctionDeadlineDaysAfter
          : 13;
        if (dlDaysAfterInput) dlDaysAfterInput.value = daysAfter;
        if (dlAutoInput) dlAutoInput.checked = (config.correctionDeadlineAuto !== false);

        // Auto-fill deadline if auto-set is checked, deadline is empty, and testDate exists
        if (dlAutoInput && dlAutoInput.checked && !config.correctionDeadline && toptDateInput && toptDateInput.value) {
          const autoComputed = calculateDeadlineFromTestDate(toptDateInput.value, daysAfter);
          if (autoComputed) {
            dlInput.value = autoComputed;
            config.correctionDeadline = autoComputed;
          } else {
            dlInput.value = "";
          }
        } else {
          dlInput.value = config.correctionDeadline || "";
        }
        if (dlTimeInput) dlTimeInput.value = config.correctionDeadlineTime || "";
        if (dlRemindersInput) dlRemindersInput.checked = (config.deadlineReminders && config.deadlineReminders.enabled !== false);

        const updateDlLiveStatus = () => {
          if (!dlStatusEl) return;
          const val = dlInput.value;
          if (!val) {
            dlStatusEl.textContent = "";
            return;
          }
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dlD = new Date(val + 'T00:00:00');
          const diffDays = Math.ceil((dlD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const prog = computeScoringProgress(classObj, activeSem, activeTestIndex, config);
          const rem = prog.remainingCount;

          let daysText = diffDays < 0
            ? tFmt('gsToptDeadlineOverdue', { n: Math.abs(diffDays) })
            : (diffDays === 0 ? t('gsToptDeadlineDueToday') : tFmt('gsToptDeadlineDaysLeft', { n: diffDays }));
          let paceText = "";
          if (diffDays > 0 && rem > 0) {
            const pace = Math.round((rem / diffDays) * 10) / 10;
            paceText = ` · ${tFmt('gsToptDeadlinePaceHint', { pace })}`;
          }
          dlStatusEl.textContent = `${daysText} · ${tFmt('gsProgressRemaining', { n: rem })}${paceText}`;
          dlStatusEl.style.color = diffDays < 0 ? "#c96b6b" : (diffDays <= 1 ? "#d4895a" : "#2e7d32");
        };

        const applyOffsetToDeadline = (silent) => {
          const tDate = toptDateInput ? toptDateInput.value : (config.testDate || '');
          const days = dlDaysAfterInput ? (parseInt(dlDaysAfterInput.value, 10) || 13) : 13;
          if (!tDate) {
            if (!silent && typeof showToast === 'function') {
              showToast(typeof t === 'function' ? t('gsToptDeadlineNoTestDate') : 'Please set a test date first.', false);
            }
            return false;
          }
          const computed = calculateDeadlineFromTestDate(tDate, days);
          if (computed) {
            dlInput.value = computed;
            if (dlAutoInput) dlAutoInput.checked = true;
            updateDlLiveStatus();
            return true;
          }
          return false;
        };

        dlInput.oninput = () => {
          const tDate = toptDateInput ? toptDateInput.value : (config.testDate || '');
          const days = dlDaysAfterInput ? (parseInt(dlDaysAfterInput.value, 10) || 13) : 13;
          const expected = calculateDeadlineFromTestDate(tDate, days);
          if (dlAutoInput && dlInput.value !== expected) {
            dlAutoInput.checked = false;
          }
          updateDlLiveStatus();
        };

        if (btnApplyOffset) {
          btnApplyOffset.onclick = () => applyOffsetToDeadline(false);
        }

        if (dlDaysAfterInput) {
          dlDaysAfterInput.oninput = () => {
            if (dlAutoInput && dlAutoInput.checked && toptDateInput && toptDateInput.value) {
              applyOffsetToDeadline(true);
            }
          };
        }

        if (toptDateInput) {
          const prevDateInput = toptDateInput.oninput;
          toptDateInput.oninput = (e) => {
            if (prevDateInput) prevDateInput(e);
            if (dlAutoInput && dlAutoInput.checked && toptDateInput.value) {
              applyOffsetToDeadline(true);
            }
          };
        }

        if (dlAutoInput) {
          dlAutoInput.onchange = () => {
            if (dlAutoInput.checked && toptDateInput && toptDateInput.value) {
              applyOffsetToDeadline(true);
            }
          };
        }

        updateDlLiveStatus();

        const btn3d = document.getElementById("topt-deadline-quick-3d");
        if (btn3d) {
          btn3d.onclick = () => {
            const baseDate = (toptDateInput && toptDateInput.value) ? new Date(toptDateInput.value + 'T00:00:00') : (config.testDate ? new Date(config.testDate + 'T00:00:00') : new Date());
            baseDate.setDate(baseDate.getDate() + 3);
            dlInput.value = baseDate.toISOString().slice(0, 10);
            if (dlAutoInput) dlAutoInput.checked = false;
            updateDlLiveStatus();
          };
        }
        const btn1w = document.getElementById("topt-deadline-quick-1w");
        if (btn1w) {
          btn1w.onclick = () => {
            const baseDate = (toptDateInput && toptDateInput.value) ? new Date(toptDateInput.value + 'T00:00:00') : (config.testDate ? new Date(config.testDate + 'T00:00:00') : new Date());
            baseDate.setDate(baseDate.getDate() + 7);
            dlInput.value = baseDate.toISOString().slice(0, 10);
            if (dlAutoInput) dlAutoInput.checked = false;
            updateDlLiveStatus();
          };
        }
        const btnClr = document.getElementById("topt-deadline-clear");
        if (btnClr) {
          btnClr.onclick = () => {
            dlInput.value = "";
            if (dlTimeInput) dlTimeInput.value = "";
            if (dlAutoInput) dlAutoInput.checked = false;
            updateDlLiveStatus();
          };
        }
      }

      const toptChipBankSel = document.getElementById("topt-info-chips-bank");
      if (toptChipBankSel) {
        populateChipBankSelectElement(toptChipBankSel, config.chipBank || classObj.chipBank || _activeChipBankFilename || 'correction-criteria.js');
        toptChipBankSel.onchange = () => {
          config.chipBank = toptChipBankSel.value;
          _activeChipBankFilename = toptChipBankSel.value;
          if (classObj) {
            if (!Array.isArray(classObj.chipBanks)) classObj.chipBanks = [];
            if (!classObj.chipBanks.includes(toptChipBankSel.value)) classObj.chipBanks.push(toptChipBankSel.value);
            if (!classObj.chipBank) classObj.chipBank = toptChipBankSel.value;
          }
          saveState();
        };
      }

      const termChipGroup = document.getElementById("topt-info-term");
      termChipGroup.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === activeSem));
      termChipGroup.onclick = e => {
        const chip = e.target.closest(".chip[data-value]");
        if (!chip) return;
        activeSem = chip.dataset.value;
        termChipGroup.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === activeSem));
        if (badge) badge.textContent = tFmt('gsToptHeaderContext', { name: classObj.name, sem: activeSem === "sem1" ? t('gsSem1') : t('gsSem2'), n: activeTestIndex + 1 });
      };

      const infoSum = document.getElementById("topt-info-summary");
      if (infoSum) {
        infoSum.textContent = [config.testName, config.testDate, config.scope, config.type].filter(Boolean).join(" · ") || "—";
      }

      // ── Coefficient ────────────────────────────────────────────
      const isFixed = typeof config.fixedWeight === "number";
      document.getElementById("topt-coeff-mode-coeff").checked = !isFixed;
      document.getElementById("topt-coeff-mode-fixed").checked = isFixed;
      document.getElementById("topt-coeff-input").value = String(config.coefficient);
      document.getElementById("topt-coeff-fixed-input").value = isFixed ? String(config.fixedWeight) : "";
      document.getElementById("topt-coeff-coeff-wrap").classList.toggle("hidden", isFixed);
      document.getElementById("topt-coeff-fixed-wrap").classList.toggle("hidden", !isFixed);
      document.getElementById("topt-coeff-summary").textContent = isFixed
        ? tFmt('gsCoeffFixedDisplay', { val: fmtN(config.fixedWeight) })
        : tFmt('gsCoeffTimesDisplay', { val: fmtN(config.coefficient) });

      document.querySelectorAll("input[name='topt-coeff-mode']").forEach(radio => {
        radio.onchange = () => {
          const fixed = document.getElementById("topt-coeff-mode-fixed").checked;
          document.getElementById("topt-coeff-coeff-wrap").classList.toggle("hidden", fixed);
          document.getElementById("topt-coeff-fixed-wrap").classList.toggle("hidden", !fixed);
        };
      });

      // ── Grading Scale ──────────────────────────────────────────
      if (isParticipationTestConfig(config) && (!config.grading || !config.grading.customManualScale)) {
        syncParticipationGradingScale(config);
      }
      const getCurrentTotalPossible = () => Math.max(0, calcCriteriaTotals(config, {}).totalPossible);
      let totalPossible = getCurrentTotalPossible();
      let _toptGradingChanged = false;
      const initSteps = getTestGradeSteps(config);
      const hasValidManualPoints = config.grading.manualInputMode === "points" &&
        config.grading.manualPoints &&
        typeof config.grading.manualPoints === "object" &&
        Object.values(config.grading.manualPoints).some(v => Number(v) > 0);
      const gradingDraft = {
        mode: config.grading.mode,
        passPercentGrade4: evaluatePass4Formula(config.grading.passPercentGrade4Formula || config.grading.passPercentGrade4, 66.67),
        passPercentGrade4Formula: config.grading.passPercentGrade4Formula || (config.grading.passPercentGrade4 != null ? String(config.grading.passPercentGrade4) : "66.67"),
        minGrade: config.grading.minGrade != null ? config.grading.minGrade : 1.5,
        maxGrade: config.grading.maxGrade != null ? config.grading.maxGrade : 6,
        interval: config.grading.interval != null ? config.grading.interval : 0.5,
        customManualScale: !!config.grading.customManualScale,
        modelKey: config.grading.modelKey,
        pendingModelKey: config.grading.pendingModelKey,
        scaleBank: config.grading.scaleBank || _activeScaleBankFilename || 'grade-scale-models.js',
        manualInputMode: config.grading.manualInputMode === "points" ? "points" : "percent",
        manualThresholds: Object.assign({}, config.grading.manualThresholds),
        manualPoints: Object.assign(
          buildManualPointsFromPercents(config.grading.manualThresholds, totalPossible, initSteps),
          hasValidManualPoints ? config.grading.manualPoints : {}
        ),
        equationFormula: config.grading.equationFormula || "minGrade + 2 * (passGrade - minGrade) * pts / totalPts",
        equationRounding: config.grading.equationRounding || "0.5",
        pointsRounding: config.grading.pointsRounding || "0.5"
      };

      const gradingModeEl = document.getElementById("topt-grading-mode");
      const gradingPass4El = document.getElementById("topt-grading-pass4");
      const gradingMinGradeEl = document.getElementById("topt-grading-min-grade");
      const gradingMaxGradeEl = document.getElementById("topt-grading-max-grade");
      const gradingIntervalEl = document.getElementById("topt-grading-interval");
      const gradingPointsRoundEl = document.getElementById("topt-grading-points-round");
      const gradingPointsRoundWrap = document.getElementById("topt-grading-points-round-wrap");
      const gradingModelChips = document.getElementById("topt-grading-model");
      const gradingThreshWrap = document.getElementById("topt-grading-thresholds");
      const gradingEqWrap = document.getElementById("topt-grading-equation-wrap");
      const gradingEqInput = document.getElementById("topt-grading-equation-input");
      const gradingEqRound = document.getElementById("topt-grading-equation-round");
      const gradingEqStatus = document.getElementById("topt-eq-status");
      const gradingEqSamples = document.getElementById("topt-eq-samples");

      // ── Live Grade Simulation Preview ─────────────────────────
      function updateLiveGradePreview() {
        const container = document.getElementById("topt-preview-content");
        if (!container) return;
        const currentCriteria = config.criteria || [];
        const currentTotals = calcCriteriaTotals({ criteria: currentCriteria }, {});
        const rawTotPossible = Math.max(0, currentTotals.totalPossible);
        const totPossible = rawTotPossible > 0 ? rawTotPossible : 100;

        const tmpConfig = { criteria: currentCriteria, grading: Object.assign({}, gradingDraft) };
        const rawThresholds = getThresholds(tmpConfig);
        const stepsAsc = [...rawThresholds].sort((a, b) => a.grade - b.grade);

        if (stepsAsc.length === 0) {
          container.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:0.88rem;">${t('gsNoCriteriaYet')}</div>`;
          return;
        }

        const scaleModel = (gradingDraft.pendingModelKey && gradingDraft.pendingModelKey !== "custom")
          ? getScaleModel(gradingDraft.pendingModelKey)
          : (gradingDraft.modelKey ? getScaleModel(gradingDraft.modelKey) : null);

        let segmentsHtml = "";
        let markersHtml = "";
        let cardsHtml = "";

        function getBadgeContrastTextColor(hex) {
          if (!hex || typeof hex !== "string") return "#ffffff";
          try {
            const lum = getColorLuminance(hex);
            return lum > 0.52 ? "#0f172a" : "#ffffff";
          } catch (e) {
            return "#ffffff";
          }
        }

        const maxG = tmpConfig.grading && tmpConfig.grading.maxGrade != null ? tmpConfig.grading.maxGrade : 6;

        stepsAsc.forEach((step, idx) => {
          const grade = step.grade;
          const key = String(grade);
          const ratioStart = Math.max(0, Math.min(1, step.ratio || 0));
          const nextStep = idx < stepsAsc.length - 1 ? stepsAsc[idx + 1] : null;
          const ratioEnd = nextStep ? Math.max(ratioStart, Math.min(1, nextStep.ratio || 0)) : 1.0;
          const segWidth = Math.max(0, (ratioEnd - ratioStart) * 100);

          const ptsStart = ratioStart * totPossible;
          const ptsEnd = ratioEnd * totPossible;
          const pctStart = Math.round(ratioStart * 1000) / 10;
          const pctEnd = Math.round(ratioEnd * 1000) / 10;

          const color = (scaleModel && scaleModel.colors && scaleModel.colors[key]) || getScaleGradeColor(key, gradingDraft.pendingModelKey || gradingDraft.modelKey) || getDefaultGradeColor(key, idx, stepsAsc.length);
          const textColor = getBadgeContrastTextColor(color);

          // 1. Color Bar Segment
          if (segWidth > 0.01) {
            segmentsHtml += `<div class="topt-scale-segment" style="width:${segWidth}%;background:${color};color:${textColor};">${fmt(grade)}</div>`;
          }

          // 2. Spatial Marker below the bar: pip -> pts -> pct -> grade badge
          const markerLeft = ratioStart * 100;
          const isStaggered = (idx % 2 === 1) && stepsAsc.length > 7;
          const markerTopStyle = isStaggered ? "top:20px;" : "top:0px;";
          markersHtml += `
            <div class="topt-scale-marker" style="left:${markerLeft}%;${markerTopStyle}">
              <div class="topt-scale-pip" style="background:${color};"></div>
              <div class="topt-scale-pts">${fmtN(ptsStart)}p</div>
              <div class="topt-scale-pct">${fmtN(pctStart)}%</div>
              <div class="topt-scale-badge" style="background:${color};color:${textColor};">${fmt(grade)}</div>
            </div>
          `;

          // 3. Breakdown card
          cardsHtml += `
            <div class="topt-scale-step-card" style="border-left:5px solid ${color};">
              <div class="topt-scale-step-header">
                <span class="topt-scale-badge" style="background:${color};color:${textColor};margin:0;">${fmt(grade)}</span>
                <span class="topt-scale-step-pct">${fmtN(pctStart)}% – ${fmtN(pctEnd)}%</span>
              </div>
              <div class="topt-scale-step-range">${fmtN(ptsStart)} – ${fmtN(ptsEnd)} pts</div>
            </div>
          `;
        });

        // Add 100% end marker with max grade
        markersHtml += `
          <div class="topt-scale-marker" style="left:100%;">
            <div class="topt-scale-pip" style="background:#111;"></div>
            <div class="topt-scale-pts">${fmtN(totPossible)}p</div>
            <div class="topt-scale-pct">100%</div>
            <div class="topt-scale-badge" style="background:#111;color:#fff;">${fmt(maxG)}</div>
          </div>
        `;

        // Helper to evaluate grade for any points value
        function calcGradeForPts(ptsVal) {
          const safeP = Math.max(0, Math.min(totPossible, ptsVal));
          const r = totPossible > 0 ? safeP / totPossible : 0;
          if (tmpConfig.grading && tmpConfig.grading.mode === "equation") {
            const passPercent = tmpConfig.grading.passPercentGrade4 || 66.67;
            const passPts = totPossible * (passPercent / 100);
            const res = evaluateGradingEquation(tmpConfig.grading.equationFormula, {
              pts: safeP,
              totalPts: totPossible,
              minPts: 0,
              passPts,
              maxGrade: tmpConfig.grading.maxGrade != null ? tmpConfig.grading.maxGrade : 6,
              minGrade: tmpConfig.grading.minGrade != null ? tmpConfig.grading.minGrade : 1.5,
              passGrade: 4,
              rounding: tmpConfig.grading.equationRounding || "0.5"
            });
            return (res && res.ok && res.grade != null) ? res.grade : gradeFromRatio(r, tmpConfig);
          }
          if (isParticipationTestConfig(config) && (!tmpConfig.grading || (!tmpConfig.grading.customManualScale && tmpConfig.grading.mode === "manual"))) {
            const maxG = (tmpConfig.grading && tmpConfig.grading.maxGrade != null) ? Number(tmpConfig.grading.maxGrade) : 6;
            const minG = (tmpConfig.grading && tmpConfig.grading.minGrade != null) ? Number(tmpConfig.grading.minGrade) : 0;
            const step = (tmpConfig.grading && tmpConfig.grading.interval != null && Number(tmpConfig.grading.interval) > 0) ? Number(tmpConfig.grading.interval) : 0.5;
            const rawGrade = minG + r * (maxG - minG);
            return Math.round(rawGrade / step) * step;
          }
          return gradeFromRatio(r, tmpConfig);
        }

        // Default test points at passing threshold or 60% of total
        const defaultTestPassPercent = tmpConfig.grading.passPercentGrade4 || 66.67;
        const initialTestPts = Math.round((totPossible * (defaultTestPassPercent / 100)) * 10) / 10;
        const initialTestGrade = calcGradeForPts(initialTestPts);
        const initialGradeColor = (scaleModel && scaleModel.colors && scaleModel.colors[String(initialTestGrade)]) || getScaleGradeColor(String(initialTestGrade), gradingDraft.pendingModelKey || gradingDraft.modelKey) || "#2563eb";
        const initialGradeTextColor = getBadgeContrastTextColor(initialGradeColor);
        const initialRatio = totPossible > 0 ? initialTestPts / totPossible : 0;

        let html = `
          <div class="topt-scale-preview-wrap">
            <!-- 1. Live Test Score & Actual Grade Display Bar -->
            <div class="topt-scale-tester-bar">
              <div class="topt-scale-tester-inputs">
                <label style="font-weight:700;font-size:0.85rem;color:#1e293b;display:flex;align-items:center;gap:6px;">
                  <span>${t('gsToptPreviewProbeTitle') || 'Test Score'}:</span>
                  <input type="number" id="topt-scale-test-pts" class="input" min="0" max="${totPossible}" step="0.5" value="${initialTestPts}" style="width:78px;font-weight:800;padding:4px 8px;border:2px solid #111;border-radius:6px;" />
                  <span style="color:var(--muted);font-size:0.82rem;">/ ${fmtN(totPossible)} pts</span>
                </label>
                <input type="range" id="topt-scale-test-slider" min="0" max="${totPossible}" step="0.1" value="${initialTestPts}" style="width:160px;cursor:pointer;accent-color:#2563eb;" />
              </div>
              <div class="topt-scale-result-pill">
                <span class="topt-scale-result-label">${t('gsToptPreviewGrade') || 'Grade'}:</span>
                <span id="topt-scale-test-grade-badge" class="topt-scale-badge" style="background:${initialGradeColor};color:${initialGradeTextColor};font-size:1.35rem;padding:4px 14px;border:2px solid #111;box-shadow:2px 2px 0 #111;margin:0;">
                  ${fmt(initialTestGrade)}
                </span>
              </div>
            </div>

            <!-- 2. Horizontal Scale Continuum Bar -->
            <div class="topt-scale-track-container" id="topt-scale-interactive-zone">
              <!-- Pin indicator for current test score -->
              <div id="topt-scale-pin" class="topt-scale-pin-indicator" style="left:${initialRatio * 100}%;">
                <div id="topt-scale-pin-head" class="topt-scale-pin-head" style="background:${initialGradeColor};color:${initialGradeTextColor};">
                  ${fmt(initialTestGrade)}
                </div>
                <div class="topt-scale-pin-line"></div>
              </div>

              <!-- Live Hover Probe Line & Floating Tooltip -->
              <div class="topt-scale-probe-line" id="topt-scale-probe">
                <div class="topt-scale-probe-tooltip" id="topt-scale-probe-tip">0 pts</div>
              </div>

              <div class="topt-scale-bar" id="topt-scale-bar-track">
                ${segmentsHtml}
              </div>
              <div class="topt-scale-markers-layer">
                ${markersHtml}
              </div>
            </div>

            <!-- 3. Grade Intervals Breakdown -->
            <div style="margin-top:14px;">
              <div style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:var(--muted);margin-bottom:8px;">
                ${t('gsToptPreviewInterval') || 'Grade Step Intervals'}
              </div>
              <div class="topt-scale-summary-grid">
                ${cardsHtml}
              </div>
            </div>
          </div>
        `;

        container.innerHTML = html;

        // Wire interactive score tester and scale pin
        const testPtsInput = document.getElementById("topt-scale-test-pts");
        const testSlider = document.getElementById("topt-scale-test-slider");
        const testGradeBadge = document.getElementById("topt-scale-test-grade-badge");
        const testPin = document.getElementById("topt-scale-pin");
        const testPinHead = document.getElementById("topt-scale-pin-head");

        function updateTesterScore(newPts) {
          const safeP = Math.max(0, Math.min(totPossible, toNumber(newPts) ?? 0));
          const gr = calcGradeForPts(safeP);
          const grColor = (scaleModel && scaleModel.colors && scaleModel.colors[String(gr)]) || getScaleGradeColor(String(gr), gradingDraft.pendingModelKey || gradingDraft.modelKey) || "#2563eb";
          const grText = getBadgeContrastTextColor(grColor);
          const r = totPossible > 0 ? safeP / totPossible : 0;

          if (testPtsInput && testPtsInput.value !== String(safeP)) testPtsInput.value = fmtN(safeP);
          if (testSlider && testSlider.value !== String(safeP)) testSlider.value = String(safeP);
          if (testGradeBadge) {
            testGradeBadge.textContent = fmt(gr);
            testGradeBadge.style.background = grColor;
            testGradeBadge.style.color = grText;
          }
          if (testPin && testPinHead) {
            testPin.style.left = `${r * 100}%`;
            testPinHead.textContent = fmt(gr);
            testPinHead.style.background = grColor;
            testPinHead.style.color = grText;
          }
        }

        if (testPtsInput) {
          testPtsInput.addEventListener("input", () => updateTesterScore(testPtsInput.value));
        }
        if (testSlider) {
          testSlider.addEventListener("input", () => updateTesterScore(testSlider.value));
        }

        // Wire interactive probe and click on scale bar
        const barTrack = document.getElementById("topt-scale-bar-track");
        const probeLine = document.getElementById("topt-scale-probe");
        const probeTip = document.getElementById("topt-scale-probe-tip");

        if (barTrack && probeLine && probeTip) {
          barTrack.addEventListener("mousemove", e => {
            const rect = barTrack.getBoundingClientRect();
            if (rect.width <= 0) return;
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const r = x / rect.width;
            const probePts = r * totPossible;
            const probeGrade = calcGradeForPts(probePts);

            probeLine.style.display = "block";
            probeLine.style.left = `${x}px`;
            probeTip.textContent = `${fmtN(probePts)} / ${fmtN(totPossible)} pts (${Math.round(r * 100)}%) → ${t('gsToptPreviewGrade') || 'Grade'} ${fmt(probeGrade)}`;
          });

          barTrack.addEventListener("click", e => {
            const rect = barTrack.getBoundingClientRect();
            if (rect.width <= 0) return;
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const r = x / rect.width;
            const clickedPts = r * totPossible;
            updateTesterScore(Math.round(clickedPts * 10) / 10);
          });

          barTrack.addEventListener("mouseleave", () => {
            probeLine.style.display = "none";
          });
        }
      }

      function updateEquationValidation() {
        if (!gradingEqInput || !gradingEqStatus || !gradingEqSamples) return;
        const formula = gradingEqInput.value.trim();
        gradingDraft.equationFormula = formula;
        const rounding = gradingEqRound ? gradingEqRound.value : "0.5";
        gradingDraft.equationRounding = rounding;

        const minG = gradingDraft.minGrade != null ? gradingDraft.minGrade : (config.grading.minGrade != null ? config.grading.minGrade : 1.5);
        const maxG = gradingDraft.maxGrade != null ? gradingDraft.maxGrade : (config.grading.maxGrade != null ? config.grading.maxGrade : 6);
        const passG = 4;
        const totP = totalPossible > 0 ? totalPossible : 100;
        const passP = totP * ((gradingDraft.passPercentGrade4 || 66.67) / 100);

        const testVars = {
          pts: passP,
          totalPts: totP,
          minPts: 0,
          passPts: passP,
          maxGrade: maxG,
          minGrade: minG,
          passGrade: passG,
          rounding
        };

        const testRes = evaluateGradingEquation(formula, testVars);
        if (testRes.ok) {
          gradingEqStatus.className = "eq-status-badge valid";
          gradingEqStatus.textContent = t('gsGradingEqValid') || "Valid formula";
          
          const pts0 = 0;
          const ptsPass = passP;
          const ptsMax = totP;
          const res0 = evaluateGradingEquation(formula, { ...testVars, pts: pts0 });
          const resPass = evaluateGradingEquation(formula, { ...testVars, pts: ptsPass });
          const resMax = evaluateGradingEquation(formula, { ...testVars, pts: ptsMax });

          gradingEqSamples.innerHTML = `
            <span class="eq-sample-pill">Min (${fmtN(pts0)}p): <strong>${res0.ok ? fmt(res0.grade) : '—'}</strong></span>
            <span class="eq-sample-pill">Pass (${fmtN(ptsPass)}p): <strong>${resPass.ok ? fmt(resPass.grade) : '—'}</strong></span>
            <span class="eq-sample-pill">Max (${fmtN(ptsMax)}p): <strong>${resMax.ok ? fmt(resMax.grade) : '—'}</strong></span>
          `;
        } else {
          gradingEqStatus.className = "eq-status-badge invalid";
          gradingEqStatus.textContent = (t('gsGradingEqInvalid') || "Syntax error") + (testRes.error ? `: ${testRes.error}` : "");
          gradingEqSamples.innerHTML = "";
        }
        updateLiveGradePreview();
      }

      function insertTextAtCursor(inputEl, textToInsert) {
        if (!inputEl) return;
        const start = inputEl.selectionStart ?? inputEl.value.length;
        const end = inputEl.selectionEnd ?? inputEl.value.length;
        const before = inputEl.value.substring(0, start);
        const after = inputEl.value.substring(end);
        inputEl.value = before + textToInsert + after;
        const nextPos = start + textToInsert.length;
        inputEl.focus();
        inputEl.setSelectionRange(nextPos, nextPos);
        updateEquationValidation();
      }

      if (gradingEqWrap) {
        gradingEqWrap.querySelectorAll(".eq-chip[data-insert]").forEach(chip => {
          chip.onclick = () => {
            _toptGradingChanged = true;
            insertTextAtCursor(gradingEqInput, chip.dataset.insert);
          };
        });
        gradingEqWrap.querySelectorAll(".eq-chip[data-preset]").forEach(chip => {
          chip.onclick = () => {
            _toptGradingChanged = true;
            const preset = chip.dataset.preset;
            if (preset === "swiss") {
              gradingEqInput.value = "pts >= passPts ? min(maxGrade, passGrade + 2.5 * (pts - passPts) / (totalPts - passPts)) : (minGrade + (passGrade - minGrade) * (pts - minPts) / (passPts - minPts))";
            } else if (preset === "linear") {
              gradingEqInput.value = "minGrade + (maxGrade - minGrade) * (pts - minPts) / (totalPts - minPts)";
            } else if (preset === "linearBuffer") {
              gradingEqInput.value = "minGrade + 2 * (passGrade - minGrade) * (pts - minPts) / (totalPts - minPts)";
            }
            updateEquationValidation();
          };
        });
        if (gradingEqInput) {
          gradingEqInput.value = gradingDraft.equationFormula;
          gradingEqInput.oninput = () => {
            _toptGradingChanged = true;
            updateEquationValidation();
          };
        }
        if (gradingEqRound) {
          gradingEqRound.value = gradingDraft.equationRounding || "0.5";
          gradingEqRound.onchange = () => {
            _toptGradingChanged = true;
            updateEquationValidation();
          };
        }
        updateEquationValidation();
      }

      function syncGradingModeSelect() {
        const val = (gradingDraft.mode === "manual" && gradingDraft.manualInputMode === "points")
          ? "manual-points" : gradingDraft.mode;
        gradingModeEl.querySelectorAll(".chip[data-value]").forEach(c => c.classList.toggle("active", c.dataset.value === val));
      }

      const toptScaleBankSel = document.getElementById("topt-grading-scale-bank");
      if (toptScaleBankSel) {
        populateScaleBankSelectElement(toptScaleBankSel, gradingDraft.scaleBank || 'grade-scale-models.js');
        toptScaleBankSel.onchange = () => {
          _toptGradingChanged = true;
          gradingDraft.scaleBank = toptScaleBankSel.value;
          rebuildModelChips();
        };
      }

      function rebuildModelChips() {
        const bankFn = gradingDraft.scaleBank || (toptScaleBankSel ? toptScaleBankSel.value : 'grade-scale-models.js');
        const models = getScaleModelsList(bankFn);
        gradingModelChips.innerHTML =
          `<button type="button" class="chip${gradingDraft.pendingModelKey === "custom" ? " active" : ""}" data-value="custom">Custom</button>` +
          models.map(m => `<button type="button" class="chip${gradingDraft.pendingModelKey === m.key ? " active" : ""}" data-value="${m.key}">${m.label}</button>`).join("");
      }

      const pass4EvalEl = document.getElementById("topt-grading-pass4-eval");
      function updatePass4Display() {
        totalPossible = getCurrentTotalPossible();
        const raw = (gradingPass4El.value || "").trim();
        const evaluated = evaluatePass4Formula(raw, gradingDraft.passPercentGrade4 || 66.67);
        gradingDraft.passPercentGrade4 = evaluated;
        gradingDraft.passPercentGrade4Formula = raw;
        if (pass4EvalEl) {
          const reqPts = totalPossible > 0 ? Math.round((totalPossible * (evaluated / 100)) * 100) / 100 : null;
          if (reqPts != null) {
            pass4EvalEl.textContent = `= ${fmt(evaluated)}% → ${fmtN(reqPts)} / ${fmtN(totalPossible)} pts`;
          } else {
            const isExpr = /[\/\*\+\-\(\)]/.test(raw) || (Number(raw) > 0 && Number(raw) <= 1);
            pass4EvalEl.textContent = isExpr ? `= ${fmt(evaluated)}%` : "";
          }
        }
      }

      syncGradingModeSelect();
      gradingPass4El.value = gradingDraft.passPercentGrade4Formula || fmt(gradingDraft.passPercentGrade4);
      updatePass4Display();

      if (gradingMinGradeEl) {
        gradingMinGradeEl.value = fmt(gradingDraft.minGrade != null ? gradingDraft.minGrade : 1.5);
        gradingMinGradeEl.oninput = () => {
          _toptGradingChanged = true;
          gradingDraft.minGrade = toNumber(gradingMinGradeEl.value) ?? 1.5;
          rebuildGradingManualInputs();
          updateEquationValidation();
          updateLiveGradePreview();
        };
      }
      if (gradingMaxGradeEl) {
        gradingMaxGradeEl.value = fmt(gradingDraft.maxGrade != null ? gradingDraft.maxGrade : 6);
        gradingMaxGradeEl.oninput = () => {
          _toptGradingChanged = true;
          gradingDraft.maxGrade = toNumber(gradingMaxGradeEl.value) ?? 6;
          rebuildGradingManualInputs();
          updateEquationValidation();
          updateLiveGradePreview();
        };
      }
      if (gradingIntervalEl) {
        gradingIntervalEl.value = String(gradingDraft.interval != null ? gradingDraft.interval : 0.5);
        gradingIntervalEl.onchange = () => {
          _toptGradingChanged = true;
          gradingDraft.interval = toNumber(gradingIntervalEl.value) ?? 0.5;
          rebuildGradingManualInputs();
          updateEquationValidation();
          updateLiveGradePreview();
        };
      }
      if (gradingPointsRoundEl) {
        gradingPointsRoundEl.value = gradingDraft.pointsRounding || "0.5";
        gradingPointsRoundEl.onchange = () => {
          _toptGradingChanged = true;
          gradingDraft.pointsRounding = gradingPointsRoundEl.value || "0.5";
          updateLiveGradePreview();
        };
      }

      rebuildModelChips();
      const gradSum = document.getElementById("topt-grading-summary");
      if (gradSum) {
        const reqPts = totalPossible > 0 ? Math.round((totalPossible * (gradingDraft.passPercentGrade4 / 100)) * 100) / 100 : null;
        gradSum.textContent = config.grading.mode === "equation"
          ? (t('gsToptModeEquation') || "Equation")
          : (config.grading.mode === "linear"
            ? (t('gsGradingModeLinear') || "Linear")
            : (config.grading.mode === "manual"
              ? (config.grading.manualInputMode === "points" ? "Manual pts" : "Manual %")
              : (reqPts != null ? `${fmt(config.grading.passPercentGrade4)}% (${fmtN(reqPts)}p) → 4` : `${fmt(config.grading.passPercentGrade4)}% → 4`)));
      }

      function refreshGradingVis() {
        const isManual = gradingDraft.mode === "manual";
        const isFormula = gradingDraft.mode === "formula";
        const isLinear = gradingDraft.mode === "linear";
        const isEquation = gradingDraft.mode === "equation";
        const isManualPercent = isManual && gradingDraft.manualInputMode !== "points";

        document.getElementById("topt-grading-manual-wrap").classList.toggle("hidden", !isManual);
        document.getElementById("topt-grading-formula-wrap").classList.toggle("hidden", !isFormula);
        if (gradingEqWrap) gradingEqWrap.classList.toggle("hidden", !isEquation);
        document.getElementById("topt-grading-model-wrap").classList.toggle("hidden", !isManualPercent);
        const pointsRoundApplies = isFormula || isLinear || isManualPercent;
        if (gradingPointsRoundEl) gradingPointsRoundEl.disabled = !pointsRoundApplies;
        if (gradingPointsRoundWrap) gradingPointsRoundWrap.style.opacity = pointsRoundApplies ? "" : "0.5";
        updateLiveGradePreview();
      }

      function refreshGradingManualNote() {
        totalPossible = getCurrentTotalPossible();
        const noteEl = document.getElementById("topt-grading-manual-note");
        noteEl.textContent = gradingDraft.manualInputMode === "points"
          ? (totalPossible > 0 ? `Total available points: ${fmtN(totalPossible)}.` : "Points mode needs criteria total points.")
          : "Set minimum percentages for each grade.";
      }

      function rebuildGradingManualInputs() {
        totalPossible = getCurrentTotalPossible();
        const usePoints = gradingDraft.manualInputMode === "points";
        gradingThreshWrap.innerHTML = "";
        const steps = getTestGradeSteps({ ...config, grading: gradingDraft });
        const scaleModel = (gradingDraft.pendingModelKey && gradingDraft.pendingModelKey !== "custom")
          ? getScaleModel(gradingDraft.pendingModelKey)
          : (gradingDraft.modelKey ? getScaleModel(gradingDraft.modelKey) : null);

        steps.forEach((g, gIdx) => {
          const key = String(g);
          const color = (scaleModel && scaleModel.colors && scaleModel.colors[key]) || getScaleGradeColor(key, gradingDraft.pendingModelKey || gradingDraft.modelKey) || getDefaultGradeColor(key, gIdx, steps.length);
          const textColor = getHighContrastTextColor(color);
          const lbl = document.createElement("label");
          lbl.style.cssText = `display:flex;align-items:center;gap:6px;font-size:0.82rem;border:1px solid var(--line);border-left:4px solid ${color};border-radius:8px;padding:4px 8px;background:#fff;`;
          
          const badge = document.createElement("span");
          badge.textContent = String(g);
          badge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;min-width:28px;padding:2px 6px;border-radius:5px;background:${color}18;color:${textColor};border:1px solid ${color};font-weight:700;font-size:0.82rem;`;

          const inp = document.createElement("input");
          inp.type = "number"; inp.min = "0"; inp.max = usePoints ? "" : "100"; inp.step = "0.1";
          inp.value = fmt(usePoints ? gradingDraft.manualPoints[key] : gradingDraft.manualThresholds[key]);
          inp.style.cssText = "width:72px;border:1px solid var(--line);border-radius:6px;padding:3px 5px;font:inherit;";
          inp.dataset.grade = key;
          inp.addEventListener("input", () => {
            _toptGradingChanged = true;
            gradingDraft.customManualScale = true;
            if (usePoints) gradingDraft.manualPoints[key] = Math.max(0, toNumber(inp.value) ?? 0);
            else gradingDraft.manualThresholds[key] = Math.max(0, Math.min(100, toNumber(inp.value) ?? 0));
            updateLiveGradePreview();
          });
          lbl.append(badge, inp, document.createTextNode(usePoints ? " pts" : " %"));
          gradingThreshWrap.appendChild(lbl);
        });
        refreshGradingManualNote();
      }

      rebuildGradingManualInputs();
      refreshGradingVis();

      gradingModeEl.addEventListener("click", e => {
        const chip = e.target.closest(".chip[data-value]");
        if (!chip) return;
        _toptGradingChanged = true;
        totalPossible = getCurrentTotalPossible();
        const steps = getTestGradeSteps({ ...config, grading: gradingDraft });
        const sel = chip.dataset.value;
        if (sel === "manual-points") {
          gradingDraft.mode = "manual"; gradingDraft.manualInputMode = "points";
          if (!gradingDraft.manualPoints) gradingDraft.manualPoints = buildManualPointsFromPercents(gradingDraft.manualThresholds, totalPossible, steps);
          syncGradingModeSelect(); rebuildGradingManualInputs(); refreshGradingVis(); return;
        }
        gradingDraft.mode = sel;
        if (sel === "manual") {
          if (gradingDraft.manualInputMode === "points")
            gradingDraft.manualThresholds = buildManualPercentsFromPoints(gradingDraft.manualPoints, totalPossible, gradingDraft.manualThresholds, steps);
          gradingDraft.manualInputMode = "percent";
          rebuildGradingManualInputs();
        }
        if (sel === "equation") {
          updateEquationValidation();
        }
        syncGradingModeSelect(); refreshGradingVis();
      });

      gradingModelChips.addEventListener("click", e => {
        const chip = e.target.closest(".chip[data-value]");
        if (!chip) return;
        _toptGradingChanged = true;
        totalPossible = getCurrentTotalPossible();
        const key = chip.dataset.value;
        gradingDraft.pendingModelKey = key;
        if (key === "custom") {
          gradingDraft.mode = "manual"; gradingDraft.manualInputMode = "percent";
          syncGradingModeSelect();
        } else {
          const tmpConfig = { grading: { mode: gradingDraft.mode, passPercentGrade4: gradingDraft.passPercentGrade4, modelKey: key, pendingModelKey: key, scaleBank: gradingDraft.scaleBank, manualThresholds: Object.assign({}, gradingDraft.manualThresholds) } };
          applyScaleModelToConfig(tmpConfig, key, gradingDraft.scaleBank);
          Object.assign(gradingDraft, tmpConfig.grading);
          gradingDraft.mode = tmpConfig.grading.mode;
          gradingDraft.minGrade = tmpConfig.grading.minGrade;
          gradingDraft.maxGrade = tmpConfig.grading.maxGrade;
          gradingDraft.interval = tmpConfig.grading.interval;
          if (gradingMinGradeEl) gradingMinGradeEl.value = fmt(gradingDraft.minGrade);
          if (gradingMaxGradeEl) gradingMaxGradeEl.value = fmt(gradingDraft.maxGrade);
          if (gradingIntervalEl) gradingIntervalEl.value = String(gradingDraft.interval);
          const steps = getTestGradeSteps({ ...config, grading: gradingDraft });
          gradingDraft.manualPoints = buildManualPointsFromPercents(gradingDraft.manualThresholds, totalPossible, steps);
          if (gradingDraft.manualInputMode === "points") gradingDraft.manualThresholds = buildManualPercentsFromPoints(gradingDraft.manualPoints, totalPossible, gradingDraft.manualThresholds, steps);
          syncGradingModeSelect();
        }
        rebuildModelChips(); rebuildGradingManualInputs(); refreshGradingVis();
      });

      gradingPass4El.oninput = () => {
        _toptGradingChanged = true;
        updatePass4Display();
        updateLiveGradePreview();
      };

      // ── Criteria ───────────────────────────────────────────────
      let _openCritId = null;
      let _toptDragSrcIdx = null;
      let _toptIsDraggingCrit = false;
      let _lastCritToastTime = 0;

      function rebuildToptCriteriaList() {
        const list = document.getElementById("topt-criteria-list");
        list.innerHTML = "";
        if (config.criteria.length === 0) {
          const empty = document.createElement("div");
          empty.className = "small"; empty.style.padding = "8px";
          empty.textContent = t('gsNoCriteriaYet');
          list.appendChild(empty);
        } else {
          config.criteria.forEach((crit, idx) => {
            const isOpen = _openCritId === crit.id;
            const item = document.createElement("div");
            item.className = "crit-item" + (isOpen ? " open" : "");
            item.draggable = true;
            item.dataset.idx = String(idx);

            const header = document.createElement("div");
            header.className = "criteria-mgmt-row";
            const minMeta = crit.minPoints != null && crit.minPoints !== 0 ? `min ${crit.minPoints}, ` : '';
            header.innerHTML = `<span class="crit-drag-handle" title="${escapeHtml(t('gsDragToReorder'))}"><img src="../assets/icons/order.svg" class="btn-icon" alt="" /></span><span class="crit-expand-chevron"><img src="../assets/icons/arrow-right.svg" class="btn-icon" alt="" /></span><span class="crit-row-name">${escapeHtml(crit.name)}</span><span class="crit-row-meta">${minMeta}max ${crit.maxPoints}, c=${crit.pointCoefficient}${crit.isBonus ? ', bonus' : ''}</span>`;
            header.addEventListener("click", (e) => {
              if (_toptIsDraggingCrit) return;
              if (e.target.closest && e.target.closest(".crit-drag-handle")) return;
              _openCritId = isOpen ? null : crit.id;
              rebuildToptCriteriaList();
            });

            // Drag and drop events for reordering
            item.addEventListener("dragstart", (e) => {
              if (e.target.closest && (e.target.closest("input") || e.target.closest("button") || e.target.closest("select") || e.target.closest(".crit-item-detail"))) {
                e.preventDefault();
                return;
              }
              _toptDragSrcIdx = idx;
              _toptIsDraggingCrit = true;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(idx));
              setTimeout(() => { item.classList.add("dragging"); }, 0);
            });

            item.addEventListener("dragend", () => {
              item.classList.remove("dragging");
              list.querySelectorAll(".crit-item").forEach(r => r.classList.remove("dragging", "drag-over", "drag-over-top", "drag-over-bottom"));
              _toptDragSrcIdx = null;
              setTimeout(() => { _toptIsDraggingCrit = false; }, 60);
            });

            item.addEventListener("dragover", (e) => {
              if (_toptDragSrcIdx === null) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              if (_toptDragSrcIdx === idx) {
                item.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
                return;
              }
              list.querySelectorAll(".crit-item").forEach(r => {
                if (r !== item) r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
              });
              const rect = item.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              const isBelow = relY > rect.height / 2;
              item.classList.add("drag-over");
              item.classList.toggle("drag-over-bottom", isBelow);
              item.classList.toggle("drag-over-top", !isBelow);
            });

            item.addEventListener("dragleave", (e) => {
              if (item.contains(e.relatedTarget)) return;
              item.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
            });

            item.addEventListener("drop", (e) => {
              e.preventDefault();
              e.stopPropagation();
              list.querySelectorAll(".crit-item").forEach(r => r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom"));
              const from = _toptDragSrcIdx !== null ? _toptDragSrcIdx : parseInt(e.dataTransfer.getData("text/plain"), 10);
              if (isNaN(from) || from === idx) return;

              const rect = item.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              const isBelow = relY > rect.height / 2;
              let to = idx;
              if (from < to && !isBelow) {
                to = to - 1;
              } else if (from > to && isBelow) {
                to = to + 1;
              }
              to = Math.max(0, Math.min(config.criteria.length - 1, to));
              if (from === to) return;

              const [moved] = config.criteria.splice(from, 1);
              config.criteria.splice(to, 0, moved);

              _toptDragSrcIdx = null;
              saveState();
              renderTestSheet();
              renderSummary();
              rebuildToptCriteriaList();
            });

            const detail = document.createElement("div");
            detail.className = "crit-item-detail" + (isOpen ? "" : " hidden");

            const nameWrap = document.createElement("label");
            nameWrap.style.cssText = "display:flex;flex-direction:column;gap:3px;font-size:0.82rem;color:var(--muted);";
            nameWrap.textContent = t('gsRefCritLabelName');
            const nameInput = document.createElement("input");
            nameInput.type = "text"; nameInput.className = "input"; nameInput.value = crit.name;
            nameWrap.appendChild(nameInput);

            const numRow = document.createElement("div");
            numRow.style.cssText = "display:flex;gap:8px;";

            const xlsm = findMatchingReferenceCriterion(crit.name, config.criteriaBank);
            const fallbackMin = xlsm && xlsm.minPoints != null ? xlsm.minPoints : 0;
            const fallbackMax = xlsm && xlsm.maxPoints != null ? xlsm.maxPoints : 1;
            const fallbackInt = xlsm && xlsm.interval != null ? xlsm.interval : 0.5;

            const minWrap = document.createElement("label");
            minWrap.style.cssText = "display:flex;flex-direction:column;gap:3px;font-size:0.82rem;color:var(--muted);flex:1;";
            minWrap.textContent = t('gsRefCritLabelMinPts');
            const minInput = document.createElement("input");
            minInput.type = "number"; minInput.step = "0.1"; minInput.className = "input";
            minInput.placeholder = String(fallbackMin);
            minInput.value = crit.minPoints != null ? String(crit.minPoints) : "";
            minWrap.appendChild(minInput);

            const maxWrap = document.createElement("label");
            maxWrap.style.cssText = "display:flex;flex-direction:column;gap:3px;font-size:0.82rem;color:var(--muted);flex:1;";
            maxWrap.textContent = t('gsRefCritLabelMaxPts');
            const maxInput = document.createElement("input");
            maxInput.type = "number"; maxInput.step = "0.1"; maxInput.className = "input";
            maxInput.placeholder = String(fallbackMax);
            maxInput.value = crit.maxPoints != null ? String(crit.maxPoints) : "";
            maxWrap.appendChild(maxInput);

            const coeffWrap = document.createElement("label");
            coeffWrap.style.cssText = "display:flex;flex-direction:column;gap:3px;font-size:0.82rem;color:var(--muted);flex:1;";
            coeffWrap.textContent = t('gsRefCritLabelCoeff');
            const coeffInput = document.createElement("input");
            coeffInput.type = "number"; coeffInput.min = "0"; coeffInput.step = "0.1"; coeffInput.className = "input";
            coeffInput.value = String(crit.pointCoefficient != null ? crit.pointCoefficient : 1);
            coeffWrap.appendChild(coeffInput);

            const intWrap = document.createElement("label");
            intWrap.style.cssText = "display:flex;flex-direction:column;gap:3px;font-size:0.82rem;color:var(--muted);flex:1;";
            intWrap.textContent = t('gsRefCritLabelInterval');
            const intInput = document.createElement("input");
            intInput.type = "number"; intInput.step = "0.05"; intInput.min = "0.01"; intInput.className = "input";
            intInput.placeholder = String(fallbackInt);
            intInput.value = crit.interval != null ? String(crit.interval) : "";
            intWrap.appendChild(intInput);

            numRow.append(minWrap, maxWrap, coeffWrap, intWrap);

            const flagRow = document.createElement("div");
            flagRow.style.cssText = "display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:0.83rem;";
            const bonusLbl = document.createElement("label");
            bonusLbl.style.cssText = "display:flex;align-items:center;gap:5px;cursor:pointer;";
            const bonusCheck = document.createElement("input");
            bonusCheck.type = "checkbox"; bonusCheck.checked = !!crit.isBonus;
            bonusLbl.append(bonusCheck, document.createTextNode(" " + t('gsCriteriaLabelBonus')));
            const commentYesLbl = document.createElement("label");
            commentYesLbl.style.cssText = "display:flex;align-items:center;gap:5px;cursor:pointer;";
            const commentYes = document.createElement("input");
            commentYes.type = "radio"; commentYes.name = `crit-comment-${crit.id}`; commentYes.checked = crit.showComment !== false;
            commentYesLbl.append(commentYes, document.createTextNode(" " + t('gsCritCommentYes')));
            const commentNoLbl = document.createElement("label");
            commentNoLbl.style.cssText = "display:flex;align-items:center;gap:5px;cursor:pointer;";
            const commentNo = document.createElement("input");
            commentNo.type = "radio"; commentNo.name = `crit-comment-${crit.id}`; commentNo.checked = crit.showComment === false;
            commentNoLbl.append(commentNo, document.createTextNode(" " + t('gsCritCommentNo')));
            flagRow.append(bonusLbl, commentYesLbl, commentNoLbl);

            const btnRow = document.createElement("div");
            btnRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
            const delBtn = document.createElement("button");
            delBtn.type = "button"; delBtn.className = "btn"; delBtn.textContent = t('gsBtnDelete'); delBtn.style.color = "var(--warn)";
            const saveBtn = document.createElement("button");
            saveBtn.type = "button"; saveBtn.className = "btn primary"; saveBtn.textContent = t('gsBtnSave');
            btnRow.append(delBtn, saveBtn);

            function showCriterionSavedToast() {
              const now = Date.now();
              if (now - _lastCritToastTime < 400) return;
              _lastCritToastTime = now;
              if (typeof showToast === 'function') {
                showToast(t('gsCriterionSaved', 'Criterion saved'));
              }
            }

            function applyAndSaveCriterion(showToastMsg = false) {
              const name = nameInput.value.trim();
              if (name) crit.name = name;
              const rawMin = minInput.value.trim();
              const nextMin = rawMin !== "" && !isNaN(Number(rawMin)) ? Number(rawMin) : null;
              const rawMax = maxInput.value.trim();
              const nextMax = rawMax !== "" && !isNaN(Number(rawMax)) ? Number(rawMax) : null;
              const nextCoeff = Math.max(0, parseFloat(coeffInput.value) || 1);
              const rawInt = intInput.value.trim();
              const nextInt = rawInt !== "" && !isNaN(Number(rawInt)) && Number(rawInt) > 0 ? Number(rawInt) : null;
              const nextBonus = !!bonusCheck.checked;
              const nextComment = commentYes.checked;

              const scoringChanged = (
                crit.minPoints !== nextMin ||
                crit.maxPoints !== nextMax ||
                crit.pointCoefficient !== nextCoeff ||
                !!crit.isBonus !== nextBonus
              );

              crit.minPoints = nextMin;
              crit.maxPoints = nextMax;
              crit.pointCoefficient = nextCoeff;
              crit.interval = nextInt;
              crit.isBonus = nextBonus;
              crit.showComment = nextComment;

              const minMeta = crit.minPoints != null && crit.minPoints !== 0 ? `min ${crit.minPoints}, ` : '';
              const rowName = header.querySelector(".crit-row-name");
              const rowMeta = header.querySelector(".crit-row-meta");
              if (rowName) rowName.textContent = crit.name;
              if (rowMeta) rowMeta.textContent = `${minMeta}max ${crit.maxPoints}, c=${crit.pointCoefficient}${crit.isBonus ? ', bonus' : ''}`;

              if (scoringChanged) {
                syncGradingPointsForCriteriaChange(config);
                totalPossible = getCurrentTotalPossible();
                if (!_toptGradingChanged && config.grading) {
                  gradingDraft.manualThresholds = Object.assign({}, config.grading.manualThresholds);
                  gradingDraft.manualPoints = Object.assign({}, config.grading.manualPoints);
                } else {
                  const steps = getTestGradeSteps({ ...config, grading: gradingDraft });
                  gradingDraft.manualPoints = buildManualPointsFromPercents(gradingDraft.manualThresholds, totalPossible, steps);
                }
                rebuildGradingManualInputs();
                recalcAllStudentGradesForTest(classObj, sem, testIndex);
              }
              saveState();
              renderTestSheet();
              renderSummary();
              updateLiveGradePreview();

              if (showToastMsg) {
                showCriterionSavedToast();
              }
            }

            nameInput.addEventListener("input", () => applyAndSaveCriterion(false));
            minInput.addEventListener("input", () => applyAndSaveCriterion(false));
            maxInput.addEventListener("input", () => applyAndSaveCriterion(false));
            coeffInput.addEventListener("input", () => applyAndSaveCriterion(false));
            intInput.addEventListener("input", () => applyAndSaveCriterion(false));

            detail.addEventListener("change", () => applyAndSaveCriterion(true));

            saveBtn.addEventListener("click", () => {
              applyAndSaveCriterion(true);
              _openCritId = null;
              rebuildToptCriteriaList();
            });

            delBtn.addEventListener("click", () => {
              const idx = config.criteria.findIndex(c => c.id === crit.id);
              if (idx !== -1) {
                config.criteria.splice(idx, 1);
                classObj.students.forEach(st => {
                  const map = (st.criteriaResults?.[sem]?.[testIndex] && typeof st.criteriaResults[sem][testIndex] === "object")
                    ? st.criteriaResults[sem][testIndex] : {};
                  delete map[crit.id];
                  if (st.criteriaResults?.[sem]) st.criteriaResults[sem][testIndex] = map;
                });
              }
              syncGradingPointsForCriteriaChange(config);
              totalPossible = getCurrentTotalPossible();
              if (!_toptGradingChanged && config.grading) {
                gradingDraft.manualThresholds = Object.assign({}, config.grading.manualThresholds);
                gradingDraft.manualPoints = Object.assign({}, config.grading.manualPoints);
              }
              rebuildGradingManualInputs();
              recalcAllStudentGradesForTest(classObj, sem, testIndex);
              saveState(); renderTestSheet(); renderSummary();
              _openCritId = null; rebuildToptCriteriaList();
            });

            // Linked Competences section
            const compWrap = document.createElement("div");
            compWrap.style.cssText = "background:#f8fafc;border:1px solid var(--line, #e2e8f0);border-radius:6px;padding:8px 10px;margin-top:6px;";
            const compHeader = document.createElement("div");
            compHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;";
            compHeader.innerHTML = `<span style="font-size:0.8rem;font-weight:700;color:var(--ink);">${escapeHtml(t('gsCriteriaLinkedCompetences'))}</span>`;
            const linkCompBtn = document.createElement("button");
            linkCompBtn.type = "button";
            linkCompBtn.className = "btn btn-sm";
            linkCompBtn.style.cssText = "font-size:0.75rem;padding:2px 8px;";
            linkCompBtn.textContent = t('gsLinkCompetence');
            compHeader.appendChild(linkCompBtn);

            const compChipsContainer = document.createElement("div");
            compChipsContainer.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;min-height:22px;align-items:center;";

            function renderCompChips() {
              compChipsContainer.innerHTML = "";
              const ids = Array.isArray(crit.competenceIds) ? crit.competenceIds : [];
              if (ids.length === 0) {
                const emptyChip = document.createElement("span");
                emptyChip.style.cssText = "font-size:0.78rem;color:var(--muted);";
                emptyChip.textContent = t('gsNoCompetencesLinked');
                compChipsContainer.appendChild(emptyChip);
                return;
              }
              ids.forEach(cid => {
                const comp = findLessonCompetence(cid);
                const chip = document.createElement("span");
                chip.style.cssText = "display:inline-flex;align-items:center;gap:5px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:12px;padding:2px 8px;font-size:0.75rem;font-weight:600;";
                const label = comp ? (comp.code || comp.title || cid) : cid;
                chip.textContent = label;
                chip.title = comp ? `${comp.code ? comp.code + ': ' : ''}${comp.title || ''}${comp.description ? ' - ' + comp.description : ''}` : cid;

                const removeX = document.createElement("span");
                removeX.style.cssText = "cursor:pointer;margin-left:3px;font-weight:bold;color:#0284c7;";
                removeX.textContent = "×";
                removeX.onclick = (ev) => {
                  ev.stopPropagation();
                  crit.competenceIds = crit.competenceIds.filter(id => id !== cid);
                  renderCompChips();
                  saveState();
                };
                chip.appendChild(removeX);
                compChipsContainer.appendChild(chip);
              });
            }

            linkCompBtn.addEventListener("click", () => {
              openCompetencePicker(crit.competenceIds || [], (newIds) => {
                crit.competenceIds = newIds;
                renderCompChips();
                saveState();
              });
            });

            renderCompChips();
            compWrap.append(compHeader, compChipsContainer);

            detail.append(nameWrap, numRow, flagRow, compWrap, btnRow);
            item.append(header, detail);
            list.appendChild(item);
          });
        }
        const critSum = document.getElementById("topt-criteria-summary");
        if (critSum) {
          critSum.textContent = config.criteria.length > 0 ? tFmt('gsCriteriaCountLabel', { n: config.criteria.length }) : t('gsCriteriaNone');
        }
        updateLiveGradePreview();
      }

      let _toptPresetCompetenceIds = [];
      const toptPresetSel = document.getElementById("topt-criteria-preset");
      const toptBankSel = document.getElementById("topt-criteria-bank-select");
      const toptApplyAllBtn = document.getElementById("topt-apply-all-template-criteria-btn");

      function updateToptPresetsForBank(bankFilename) {
        const bank = _availableCriteriaBanks.find(b => b.filename === bankFilename)
          || _availableCriteriaBanks[0]
          || null;
        const presetCriteriaSource = (bank && Array.isArray(bank.criteria) && bank.criteria.length > 0)
          ? bank.criteria
          : ((typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : []);
        toptPresetSel.innerHTML = '<option value="">Preset…</option>' +
          presetCriteriaSource.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
      }

      if (toptBankSel) {
        toptBankSel.innerHTML = "";
        const loadedBanks = getClassLoadedCriteriaBanks(classObj);
        const allOtherBanks = _availableCriteriaBanks.filter(b => !loadedBanks.some(lb => lb.filename === b.filename));

        if (loadedBanks.length) {
          const optGroup = document.createElement("optgroup");
          optGroup.label = t('gsCriteriaTemplates', 'Class Loaded Templates');
          loadedBanks.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.filename;
            opt.textContent = `${b.name} (${Array.isArray(b.criteria) ? b.criteria.length : 0})`;
            optGroup.appendChild(opt);
          });
          toptBankSel.appendChild(optGroup);
        }

        if (allOtherBanks.length) {
          const optGroupOther = document.createElement("optgroup");
          optGroupOther.label = t('gsOtherTemplates', 'Other Templates');
          allOtherBanks.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.filename;
            opt.textContent = `${b.name} (${Array.isArray(b.criteria) ? b.criteria.length : 0})`;
            optGroupOther.appendChild(opt);
          });
          toptBankSel.appendChild(optGroupOther);
        }

        const activeBankForTest = getTestCriteriaBank(classObj, config);
        const selectedFilename = activeBankForTest ? activeBankForTest.filename : (loadedBanks[0]?.filename || 'correction-criteria.js');
        toptBankSel.value = selectedFilename;

        updateToptPresetsForBank(selectedFilename);

        if (typeof LinksService !== 'undefined') {
          LinksService.resolveContext({ type: 'eval', id: `${classObj.id}:${sem}:${testIndex}`, classId: classObj.id }).then(inheritedCtx => {
            if (!inheritedCtx) return;
            if (inheritedCtx.criteriaPreset && !config.criteriaBank) {
              const matchedBank = _availableCriteriaBanks.find(b => b.filename === inheritedCtx.criteriaPreset || b.name === inheritedCtx.criteriaPreset);
              if (matchedBank) {
                toptBankSel.value = matchedBank.filename;
                updateToptPresetsForBank(matchedBank.filename);
              }
            }
            if (inheritedCtx.gradingScale && (!config.grading || !config.grading.modelKey || config.grading.modelKey === 'custom') && !_toptGradingChanged) {
              const scaleKey = String(inheritedCtx.gradingScale).trim();
              const scaleBanks = (typeof _availableScaleBanks !== 'undefined' && Array.isArray(_availableScaleBanks))
                ? _availableScaleBanks.map(b => b.filename)
                : ['grade-scale-models.js'];
              let matchedBankFn = null;
              let matchedModelKey = null;
              for (const bankFn of scaleBanks) {
                const models = typeof getScaleModelsList === 'function' ? getScaleModelsList(bankFn) : [];
                const hit = models.find(m =>
                  m.key === scaleKey ||
                  (m.label && m.label.toLowerCase() === scaleKey.toLowerCase())
                );
                if (hit) {
                  matchedBankFn = bankFn;
                  matchedModelKey = hit.key;
                  break;
                }
                if (bankFn === scaleKey && models.length > 0) {
                  matchedBankFn = bankFn;
                  matchedModelKey = models[0].key;
                  break;
                }
              }
              if (matchedModelKey) {
                if (matchedBankFn) {
                  gradingDraft.scaleBank = matchedBankFn;
                  const scaleBankEl = document.getElementById('topt-grading-scale-bank');
                  if (scaleBankEl) scaleBankEl.value = matchedBankFn;
                }
                gradingDraft.pendingModelKey = matchedModelKey;
                gradingDraft.modelKey = matchedModelKey;
                if (typeof rebuildModelChips === 'function') rebuildModelChips();
                if (typeof updateLiveGradePreview === 'function') updateLiveGradePreview();
              }
            }
            const inheritBadge = document.getElementById("topt-criteria-inherited-badge");
            if (inheritBadge) {
              if (inheritedCtx.inheritedFrom || inheritedCtx.criteriaPreset || inheritedCtx.gradingScale) {
                const label = inheritedCtx.inheritedFrom ? `[INHERITED: ${inheritedCtx.inheritedFrom}]` : `[LINKED: ${inheritedCtx.criteriaPreset || inheritedCtx.gradingScale}]`;
                inheritBadge.textContent = label;
                inheritBadge.style.display = "inline-block";
              } else {
                inheritBadge.style.display = "none";
              }
            }
          }).catch(() => {});
        }

        toptBankSel.onchange = () => {
          config.criteriaBank = toptBankSel.value;
          if (Array.isArray(classObj.criteriaBanks) && !classObj.criteriaBanks.includes(config.criteriaBank)) {
            classObj.criteriaBanks.push(config.criteriaBank);
          }
          updateToptPresetsForBank(config.criteriaBank);
          saveState();
        };
      } else {
        const activeBankForTest = getTestCriteriaBank(classObj, config);
        updateToptPresetsForBank(activeBankForTest ? activeBankForTest.filename : null);
      }

      if (toptApplyAllBtn) {
        toptApplyAllBtn.onclick = async () => {
          const activeBank = getTestCriteriaBank(classObj, config);
          if (!activeBank || !Array.isArray(activeBank.criteria) || !activeBank.criteria.length) {
            showToast(t('gsAlertNoCriteriaInTemplate') || "No criteria found in this template", true);
            return;
          }
          if (config.criteria.length > 0) {
            const ok = await showConfirm(tFmt('gsApplyTemplateConfirm', { template: activeBank.name }));
            if (!ok) return;
          }
          activeBank.criteria.forEach(c => {
            const compIds = Array.isArray(c.competenceIds) ? [...c.competenceIds] : [];
            config.criteria.push(makeCriterion(
              c.name || "Criterion",
              c.maxPoints != null ? c.maxPoints : 1,
              c.pointCoefficient != null ? c.pointCoefficient : 1,
              false,
              c.minPoints != null ? c.minPoints : 0,
              null,
              compIds
            ));
          });
          syncGradingPointsForCriteriaChange(config);
          totalPossible = getCurrentTotalPossible();
          if (!_toptGradingChanged && config.grading) {
            gradingDraft.manualThresholds = Object.assign({}, config.grading.manualThresholds);
            gradingDraft.manualPoints = Object.assign({}, config.grading.manualPoints);
          }
          rebuildGradingManualInputs();
          saveState();
          rebuildToptCriteriaList();
          renderTestSheet();
          renderSummary();
          syncTestAutoLinks(classObj, sem, testIndex);
          showToast(tFmt('gsCriteriaCountLabel', { n: activeBank.criteria.length }) + ' applied from ' + activeBank.name);
        };
      }

      toptPresetSel.onchange = () => {
        if (toptPresetSel.value) {
          const activeBank = getTestCriteriaBank(classObj, config);
          const presetList = (activeBank && Array.isArray(activeBank.criteria)) ? activeBank.criteria : ((typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : []);
          const entry = presetList.find(c => c.name === toptPresetSel.value);
          document.getElementById("topt-criteria-name").value = toptPresetSel.value;
          if (entry && entry.minPoints != null) document.getElementById("topt-criteria-min").value = String(entry.minPoints);
          else document.getElementById("topt-criteria-min").value = "0";
          if (entry && entry.maxPoints != null) document.getElementById("topt-criteria-max").value = String(entry.maxPoints);
          if (entry && entry.pointCoefficient != null) document.getElementById("topt-criteria-coeff").value = String(entry.pointCoefficient);
          _toptPresetCompetenceIds = (entry && Array.isArray(entry.competenceIds)) ? [...entry.competenceIds] : [];
          toptPresetSel.value = "";
        }
      };
      rebuildToptCriteriaList();

      document.getElementById("topt-criteria-add").onclick = () => {
        const nameEl = document.getElementById("topt-criteria-name");
        const minEl  = document.getElementById("topt-criteria-min");
        const maxEl  = document.getElementById("topt-criteria-max");
        const cEl    = document.getElementById("topt-criteria-coeff");
        const bonEl  = document.getElementById("topt-criteria-bonus");
        const cntEl  = document.getElementById("topt-criteria-count");
        const name = nameEl.value.trim(); if (!name) { nameEl.focus(); return; }
        const minPoints = toNumber(minEl.value) ?? 0;
        const maxPoints = Math.max(minPoints, toNumber(maxEl.value) ?? 1);
        const pointCoeff = Math.max(0, toNumber(cEl.value) ?? 1);
        const isBonus = !!(bonEl && bonEl.checked);
        const count = Math.max(1, Math.floor(toNumber(cntEl.value) ?? 1));
        const start = config.criteria.length + 1;
        let compIdsToAdd = _toptPresetCompetenceIds ? [..._toptPresetCompetenceIds] : [];
        if (!compIdsToAdd.length) {
          const activeBank = getTestCriteriaBank(classObj, config);
          const presetList = (activeBank && Array.isArray(activeBank.criteria)) ? activeBank.criteria : ((typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : []);
          const matchEntry = presetList.find(c => c && c.name && c.name.trim().toLowerCase() === name.toLowerCase());
          if (matchEntry && Array.isArray(matchEntry.competenceIds)) {
            compIdsToAdd = [...matchEntry.competenceIds];
          }
        }
        if (count === 1) { config.criteria.push(makeCriterion(name, maxPoints, pointCoeff, isBonus, minPoints, null, compIdsToAdd)); }
        else { for (let i = 0; i < count; i++) config.criteria.push(makeCriterion(`${name} ${start + i}`, maxPoints, pointCoeff, isBonus, minPoints, null, compIdsToAdd)); }
        _toptPresetCompetenceIds = [];
        nameEl.value = ""; minEl.value = "0"; maxEl.value = "1"; cEl.value = "1"; cntEl.value = "1";
        syncGradingPointsForCriteriaChange(config);
        totalPossible = getCurrentTotalPossible();
        if (!_toptGradingChanged && config.grading) {
          gradingDraft.manualThresholds = Object.assign({}, config.grading.manualThresholds);
          gradingDraft.manualPoints = Object.assign({}, config.grading.manualPoints);
        }
        rebuildGradingManualInputs();
        saveState(); rebuildToptCriteriaList(); renderTestSheet(); renderSummary();
      };

      // ── Observation Chips tab controller ────────────────────────
      const toptChipsTabBankSel = document.getElementById("topt-chips-bank-select");
      const toptChipsAddBtn = document.getElementById("topt-chips-add-chip-btn");
      const toptChipsPreviewList = document.getElementById("topt-chips-preview-list");
      const toptChipsSummary = document.getElementById("topt-chips-summary");

      let _toptDragSrcSecIdx = null;
      let _toptDragSrcCat = null; // { secIdx, catIdx }

      function renderToptChipsPreview() {
        if (!toptChipsPreviewList) return;
        toptChipsPreviewList.innerHTML = "";
        const targetBankFn = (toptChipsTabBankSel && toptChipsTabBankSel.value) || config.chipBank || classObj.chipBank || _activeChipBankFilename || 'correction-criteria.js';
        const sectionTrees = getObservationSectionsWithGroups(targetBankFn);
        let totalChips = 0;
        let totalCategories = 0;

        if (sectionTrees.length === 0) {
          const empty = document.createElement("div");
          empty.style.cssText = "font-size:0.8rem;color:var(--muted);padding:12px;text-align:center;";
          empty.textContent = t('gsNoChipsForSection', 'No preset chips defined in this bank.');
          toptChipsPreviewList.appendChild(empty);
        } else {
          sectionTrees.forEach((sec, secIdx) => {
            const secWrap = document.createElement("div");
            secWrap.className = "topt-card topt-chip-sec-card";
            secWrap.style.cssText = `margin-bottom:10px;padding:10px 12px;background:#fff;border:1.5px solid var(--border,#333333);border-left:4px solid ${sec.color || '#333333'};border-radius:8px;box-shadow:2px 2px 0 rgba(0,0,0,0.06);transition:transform 120ms ease, opacity 120ms ease;position:relative;`;
            secWrap.draggable = true;
            secWrap.dataset.secIdx = String(secIdx);

            const secHeader = document.createElement("div");
            secHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:4px;border-bottom:1px dashed var(--line,#e2e8f0);gap:6px;";
            
            const secTitleWrap = document.createElement("div");
            secTitleWrap.style.cssText = "display:flex;align-items:center;gap:6px;flex:1;min-width:0;";

            const secDragHandle = document.createElement("span");
            secDragHandle.className = "crit-drag-handle";
            secDragHandle.title = t('gsDragToReorder', 'Drag to reorder');
            secDragHandle.innerHTML = '<img src="../assets/icons/order.svg" class="btn-icon" alt="" style="width:13px;height:13px;" />';

            const secDot = document.createElement("span");
            secDot.style.cssText = `width:9px;height:9px;border-radius:50%;background:${sec.color || '#333333'};display:inline-block;flex-shrink:0;`;
            const secTitle = document.createElement("span");
            secTitle.style.cssText = "font-weight:800;font-size:0.85rem;color:var(--ink,#111827);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
            secTitle.textContent = sec.name;
            secTitleWrap.append(secDragHandle, secDot, secTitle);

            let secChipCount = 0;
            sec.groups.forEach(g => { secChipCount += (g.items || []).length; });
            totalCategories += sec.groups.length;
            totalChips += secChipCount;

            const secActionsWrap = document.createElement("div");
            secActionsWrap.style.cssText = "display:flex;align-items:center;gap:4px;flex-shrink:0;";

            const secBadge = document.createElement("span");
            secBadge.style.cssText = `font-size:0.75rem;font-weight:700;color:${sec.color || '#555'};padding:1px 7px;border-radius:10px;background:${sec.color ? sec.color + '15' : '#f1f5f9'};border:1px solid ${sec.color ? sec.color + '33' : '#e2e8f0'};`;
            secBadge.textContent = `${sec.groups.length} ${t('gsCategoriesLabel', 'categories')} · ${secChipCount} ${t('gsChipsLabel', 'chips')}`;

            const secUpBtn = document.createElement("button");
            secUpBtn.type = "button";
            secUpBtn.className = "btn btn-xs";
            secUpBtn.title = t('gsMoveUp', 'Move up');
            secUpBtn.style.cssText = "padding:2px 5px;" + (secIdx === 0 ? "opacity:0.4;cursor:not-allowed;" : "");
            secUpBtn.disabled = secIdx === 0;
            secUpBtn.innerHTML = '<img src="../assets/icons/arrow-up.svg" class="btn-icon btn-icon-xs" alt="" style="width:11px;height:11px;" />';
            secUpBtn.onclick = async (e) => {
              e.stopPropagation();
              if (secIdx > 0) {
                const moved = sectionTrees.splice(secIdx, 1)[0];
                sectionTrees.splice(secIdx - 1, 0, moved);
                const flatGroups = sectionTrees.flatMap(s => s.groups.map(g => ({ section: s.name, color: s.color || g.color, type: g.type, items: Array.isArray(g.items) ? [...g.items] : [] })));
                await saveChipBankGroups(targetBankFn, flatGroups);
                renderToptChipsPreview();
                showToast(t('gsToastChipBankReordered', 'Observation chip bank reordered'));
              }
            };

            const secDownBtn = document.createElement("button");
            secDownBtn.type = "button";
            secDownBtn.className = "btn btn-xs";
            secDownBtn.title = t('gsMoveDown', 'Move down');
            secDownBtn.style.cssText = "padding:2px 5px;" + (secIdx === sectionTrees.length - 1 ? "opacity:0.4;cursor:not-allowed;" : "");
            secDownBtn.disabled = secIdx === sectionTrees.length - 1;
            secDownBtn.innerHTML = '<img src="../assets/icons/arrow-down.svg" class="btn-icon btn-icon-xs" alt="" style="width:11px;height:11px;" />';
            secDownBtn.onclick = async (e) => {
              e.stopPropagation();
              if (secIdx < sectionTrees.length - 1) {
                const moved = sectionTrees.splice(secIdx, 1)[0];
                sectionTrees.splice(secIdx + 1, 0, moved);
                const flatGroups = sectionTrees.flatMap(s => s.groups.map(g => ({ section: s.name, color: s.color || g.color, type: g.type, items: Array.isArray(g.items) ? [...g.items] : [] })));
                await saveChipBankGroups(targetBankFn, flatGroups);
                renderToptChipsPreview();
                showToast(t('gsToastChipBankReordered', 'Observation chip bank reordered'));
              }
            };

            secActionsWrap.append(secBadge, secUpBtn, secDownBtn);
            secHeader.append(secTitleWrap, secActionsWrap);
            secWrap.appendChild(secHeader);

            // Drag and drop for whole section card
            secWrap.addEventListener("dragstart", (e) => {
              if (e.target.closest && (e.target.closest(".topt-chip-cat-box") || e.target.closest("button") || e.target.closest("input") || e.target.closest("select"))) {
                return;
              }
              _toptDragSrcSecIdx = secIdx;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", `sec:${secIdx}`);
              setTimeout(() => { secWrap.classList.add("dragging"); }, 0);
            });

            secWrap.addEventListener("dragend", () => {
              secWrap.classList.remove("dragging");
              toptChipsPreviewList.querySelectorAll(".topt-chip-sec-card").forEach(r => r.classList.remove("dragging", "drag-over", "drag-over-top", "drag-over-bottom"));
              _toptDragSrcSecIdx = null;
            });

            secWrap.addEventListener("dragover", (e) => {
              if (_toptDragSrcSecIdx === null) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              if (_toptDragSrcSecIdx === secIdx) {
                secWrap.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
                return;
              }
              toptChipsPreviewList.querySelectorAll(".topt-chip-sec-card").forEach(r => {
                if (r !== secWrap) r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
              });
              const rect = secWrap.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              const isBelow = relY > rect.height / 2;
              secWrap.classList.add("drag-over");
              secWrap.classList.toggle("drag-over-bottom", isBelow);
              secWrap.classList.toggle("drag-over-top", !isBelow);
            });

            secWrap.addEventListener("dragleave", (e) => {
              if (secWrap.contains(e.relatedTarget)) return;
              secWrap.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
            });

            secWrap.addEventListener("drop", async (e) => {
              if (_toptDragSrcSecIdx === null) return;
              e.preventDefault();
              e.stopPropagation();
              toptChipsPreviewList.querySelectorAll(".topt-chip-sec-card").forEach(r => r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom"));
              const from = _toptDragSrcSecIdx;
              if (from === null || from === secIdx) return;
              const rect = secWrap.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              const isBelow = relY > rect.height / 2;
              let to = secIdx;
              if (from < to && !isBelow) to = to - 1;
              else if (from > to && isBelow) to = to + 1;
              to = Math.max(0, Math.min(sectionTrees.length - 1, to));
              if (from === to) return;

              const moved = sectionTrees.splice(from, 1)[0];
              sectionTrees.splice(to, 0, moved);
              const flatGroups = sectionTrees.flatMap(s => s.groups.map(g => ({ section: s.name, color: s.color || g.color, type: g.type, items: Array.isArray(g.items) ? [...g.items] : [] })));
              _toptDragSrcSecIdx = null;
              await saveChipBankGroups(targetBankFn, flatGroups);
              renderToptChipsPreview();
              showToast(t('gsToastChipBankReordered', 'Observation chip bank reordered'));
            });

            const groupsContainer = document.createElement("div");
            groupsContainer.style.cssText = "display:flex;flex-direction:column;gap:6px;";

            sec.groups.forEach((g, catIdx) => {
              const catBox = document.createElement("div");
              catBox.className = "topt-chip-cat-box";
              catBox.style.cssText = "padding:6px 8px;background:var(--bg-subtle,#f8fafc);border:1px solid var(--line,#e2e8f0);border-radius:6px;position:relative;transition:transform 120ms ease, opacity 120ms ease;";
              catBox.draggable = true;
              catBox.dataset.secIdx = String(secIdx);
              catBox.dataset.catIdx = String(catIdx);

              const catHeader = document.createElement("div");
              catHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:6px;";

              const catTitleWrap = document.createElement("div");
              catTitleWrap.style.cssText = "display:flex;align-items:center;gap:5px;flex:1;min-width:0;";

              const catDragHandle = document.createElement("span");
              catDragHandle.className = "crit-drag-handle";
              catDragHandle.title = t('gsDragToReorder', 'Drag to reorder');
              catDragHandle.innerHTML = '<img src="../assets/icons/order.svg" class="btn-icon" alt="" style="width:11px;height:11px;" />';

              const catName = document.createElement("span");
              catName.style.cssText = "font-weight:700;font-size:0.78rem;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
              catName.textContent = `${g.type} (${(g.items || []).length})`;
              catTitleWrap.append(catDragHandle, catName);

              const catActionsWrap = document.createElement("div");
              catActionsWrap.style.cssText = "display:flex;align-items:center;gap:3px;flex-shrink:0;";

              const catUpBtn = document.createElement("button");
              catUpBtn.type = "button";
              catUpBtn.className = "btn btn-xs";
              catUpBtn.title = t('gsMoveUp', 'Move up');
              catUpBtn.style.cssText = "padding:1px 4px;font-size:0.7rem;" + (catIdx === 0 ? "opacity:0.4;cursor:not-allowed;" : "");
              catUpBtn.disabled = catIdx === 0;
              catUpBtn.innerHTML = '<img src="../assets/icons/arrow-up.svg" class="btn-icon btn-icon-xs" alt="" style="width:10px;height:10px;" />';
              catUpBtn.onclick = async (e) => {
                e.stopPropagation();
                if (catIdx > 0) {
                  const moved = sec.groups.splice(catIdx, 1)[0];
                  sec.groups.splice(catIdx - 1, 0, moved);
                  const flatGroups = sectionTrees.flatMap(s => s.groups.map(grp => ({ section: s.name, color: s.color || grp.color, type: grp.type, items: Array.isArray(grp.items) ? [...grp.items] : [] })));
                  await saveChipBankGroups(targetBankFn, flatGroups);
                  renderToptChipsPreview();
                  showToast(t('gsToastChipBankReordered', 'Observation chip bank reordered'));
                }
              };

              const catDownBtn = document.createElement("button");
              catDownBtn.type = "button";
              catDownBtn.className = "btn btn-xs";
              catDownBtn.title = t('gsMoveDown', 'Move down');
              catDownBtn.style.cssText = "padding:1px 4px;font-size:0.7rem;" + (catIdx === sec.groups.length - 1 ? "opacity:0.4;cursor:not-allowed;" : "");
              catDownBtn.disabled = catIdx === sec.groups.length - 1;
              catDownBtn.innerHTML = '<img src="../assets/icons/arrow-down.svg" class="btn-icon btn-icon-xs" alt="" style="width:10px;height:10px;" />';
              catDownBtn.onclick = async (e) => {
                e.stopPropagation();
                if (catIdx < sec.groups.length - 1) {
                  const moved = sec.groups.splice(catIdx, 1)[0];
                  sec.groups.splice(catIdx + 1, 0, moved);
                  const flatGroups = sectionTrees.flatMap(s => s.groups.map(grp => ({ section: s.name, color: s.color || grp.color, type: grp.type, items: Array.isArray(grp.items) ? [...grp.items] : [] })));
                  await saveChipBankGroups(targetBankFn, flatGroups);
                  renderToptChipsPreview();
                  showToast(t('gsToastChipBankReordered', 'Observation chip bank reordered'));
                }
              };

              catActionsWrap.append(catUpBtn, catDownBtn);
              catHeader.append(catTitleWrap, catActionsWrap);
              catBox.appendChild(catHeader);

              // Drag and drop for categories
              catBox.addEventListener("dragstart", (e) => {
                e.stopPropagation();
                _toptDragSrcCat = { secIdx, catIdx };
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", `cat:${secIdx}:${catIdx}`);
                setTimeout(() => { catBox.classList.add("dragging"); }, 0);
              });

              catBox.addEventListener("dragend", (e) => {
                e.stopPropagation();
                catBox.classList.remove("dragging");
                groupsContainer.querySelectorAll(".topt-chip-cat-box").forEach(r => r.classList.remove("dragging", "drag-over", "drag-over-top", "drag-over-bottom"));
                _toptDragSrcCat = null;
              });

              catBox.addEventListener("dragover", (e) => {
                if (!_toptDragSrcCat || _toptDragSrcCat.secIdx !== secIdx) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                if (_toptDragSrcCat.catIdx === catIdx) {
                  catBox.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
                  return;
                }
                groupsContainer.querySelectorAll(".topt-chip-cat-box").forEach(r => {
                  if (r !== catBox) r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
                });
                const rect = catBox.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                const isBelow = relY > rect.height / 2;
                catBox.classList.add("drag-over");
                catBox.classList.toggle("drag-over-bottom", isBelow);
                catBox.classList.toggle("drag-over-top", !isBelow);
              });

              catBox.addEventListener("dragleave", (e) => {
                e.stopPropagation();
                if (catBox.contains(e.relatedTarget)) return;
                catBox.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
              });

              catBox.addEventListener("drop", async (e) => {
                if (!_toptDragSrcCat || _toptDragSrcCat.secIdx !== secIdx) return;
                e.preventDefault();
                e.stopPropagation();
                groupsContainer.querySelectorAll(".topt-chip-cat-box").forEach(r => r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom"));
                const from = _toptDragSrcCat.catIdx;
                if (from === null || from === catIdx) return;
                const rect = catBox.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                const isBelow = relY > rect.height / 2;
                let to = catIdx;
                if (from < to && !isBelow) to = to - 1;
                else if (from > to && isBelow) to = to + 1;
                to = Math.max(0, Math.min(sec.groups.length - 1, to));
                if (from === to) return;

                const moved = sec.groups.splice(from, 1)[0];
                sec.groups.splice(to, 0, moved);
                const flatGroups = sectionTrees.flatMap(s => s.groups.map(grp => ({ section: s.name, color: s.color || grp.color, type: grp.type, items: Array.isArray(grp.items) ? [...grp.items] : [] })));
                _toptDragSrcCat = null;
                await saveChipBankGroups(targetBankFn, flatGroups);
                renderToptChipsPreview();
                showToast(t('gsToastChipBankReordered', 'Observation chip bank reordered'));
              });

              const chipsWrap = document.createElement("div");
              chipsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
              (g.items || []).forEach(chipText => {
                const chipBadge = document.createElement("span");
                chipBadge.style.cssText = `display:inline-block;padding:2px 8px;font-size:0.75rem;font-weight:600;border:1px solid ${sec.color ? sec.color + '40' : 'var(--line)'};border-radius:12px;background:#fff;color:var(--ink);`;
                chipBadge.textContent = chipText;
                chipsWrap.appendChild(chipBadge);
              });
              catBox.appendChild(chipsWrap);
              groupsContainer.appendChild(catBox);
            });

            secWrap.appendChild(groupsContainer);
            toptChipsPreviewList.appendChild(secWrap);
          });
        }

        if (toptChipsSummary) {
          toptChipsSummary.textContent = `${sectionTrees.length} ${t('mdbColSection', 'sections')} · ${totalCategories} ${t('gsCategoriesLabel', 'categories')} · ${totalChips} ${t('gsChipsLabel', 'chips')}`;
        }
      }

      function syncDraftSectionsWithBank(bankFn) {
        const secTrees = getObservationSectionsWithGroups(bankFn);
        if (secTrees && secTrees.length > 0) {
          obsSectionsDraft = secTrees.map(s => s.name);
          renderToptObsSections();
          if (typeof showToast === 'function') {
            showToast(t('gsToastSectionsSynced', 'Observation sections synced with active chip bank'));
          }
        }
      }

      if (toptChipsTabBankSel) {
        populateChipBankSelectElement(toptChipsTabBankSel, config.chipBank || classObj.chipBank || _activeChipBankFilename || 'correction-criteria.js');
        toptChipsTabBankSel.onchange = () => {
          config.chipBank = toptChipsTabBankSel.value;
          _activeChipBankFilename = toptChipsTabBankSel.value;
          if (toptChipBankSel) toptChipBankSel.value = toptChipsTabBankSel.value;
          if (classObj) {
            if (!Array.isArray(classObj.chipBanks)) classObj.chipBanks = [];
            if (!classObj.chipBanks.includes(toptChipsTabBankSel.value)) classObj.chipBanks.push(toptChipsTabBankSel.value);
            if (!classObj.chipBank) classObj.chipBank = toptChipsTabBankSel.value;
          }
          renderToptChipsPreview();
          syncDraftSectionsWithBank(toptChipsTabBankSel.value);
          saveState();
        };
      }

      if (toptChipsAddBtn) {
        toptChipsAddBtn.onclick = () => {
          const currentBank = (toptChipsTabBankSel && toptChipsTabBankSel.value) || _activeChipBankFilename || 'correction-criteria.js';
          openAddObservationChipModal(currentBank, () => {
            if (toptChipsTabBankSel) populateChipBankSelectElement(toptChipsTabBankSel, _activeChipBankFilename);
            if (toptChipBankSel) populateChipBankSelectElement(toptChipBankSel, _activeChipBankFilename);
            renderToptChipsPreview();
          });
        };
      }

      // Default Observation Sections List in topt-card
      const toptObsSectionsList = document.getElementById("topt-obs-sections-list");
      const toptNewSectionInput = document.getElementById("topt-new-section-label");
      const toptAddSectionBtn = document.getElementById("topt-add-section-btn");
      const toptSyncSectionsBtn = document.getElementById("topt-sync-sections-btn");

      let obsSectionsDraft = Array.isArray(config.observationSections)
        ? [...config.observationSections]
        : [];

      let _toptDragSrcObsSecIdx = null;

      function renderToptObsSections() {
        if (!toptObsSectionsList) return;
        toptObsSectionsList.innerHTML = "";
        if (!obsSectionsDraft.length) {
          const empty = document.createElement("div");
          empty.style.cssText = "font-size:0.8rem;color:var(--muted);";
          empty.textContent = t('gsNoObsSectionsConfigured', 'No custom observation section presets. Default sections will be generated.');
          toptObsSectionsList.appendChild(empty);
          return;
        }
        obsSectionsDraft.forEach((secName, idx) => {
          const row = document.createElement("div");
          row.className = "topt-obs-sec-row";
          row.draggable = true;
          row.dataset.idx = String(idx);
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border:1.5px solid var(--border,#333333);border-radius:6px;background:#fff;box-shadow:2px 2px 0 rgba(0,0,0,0.06);gap:8px;transition:transform 120ms ease, opacity 120ms ease;position:relative;";

          const leftWrap = document.createElement("div");
          leftWrap.style.cssText = "display:flex;align-items:center;gap:6px;flex:1;min-width:0;";

          const dragHandle = document.createElement("span");
          dragHandle.className = "crit-drag-handle";
          dragHandle.title = t('gsDragToReorder', 'Drag to reorder');
          dragHandle.innerHTML = '<img src="../assets/icons/order.svg" class="btn-icon" alt="" style="width:13px;height:13px;" />';

          const nameSpan = document.createElement("span");
          nameSpan.style.cssText = "font-size:0.82rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink,#111827);";
          nameSpan.textContent = secName;

          leftWrap.append(dragHandle, nameSpan);

          const actionsWrap = document.createElement("div");
          actionsWrap.style.cssText = "display:flex;align-items:center;gap:3px;flex-shrink:0;";

          const upBtn = document.createElement("button");
          upBtn.type = "button";
          upBtn.className = "btn btn-xs";
          upBtn.title = t('gsMoveUp', 'Move up');
          upBtn.style.cssText = "padding:2px 5px;" + (idx === 0 ? "opacity:0.4;cursor:not-allowed;" : "");
          upBtn.disabled = idx === 0;
          upBtn.innerHTML = '<img src="../assets/icons/arrow-up.svg" class="btn-icon btn-icon-xs" alt="" style="width:11px;height:11px;" />';
          upBtn.onclick = (e) => {
            e.stopPropagation();
            if (idx > 0) {
              const moved = obsSectionsDraft.splice(idx, 1)[0];
              obsSectionsDraft.splice(idx - 1, 0, moved);
              renderToptObsSections();
              showToast(t('gsToastSectionsReordered', 'Observation sections reordered'));
            }
          };

          const downBtn = document.createElement("button");
          downBtn.type = "button";
          downBtn.className = "btn btn-xs";
          downBtn.title = t('gsMoveDown', 'Move down');
          downBtn.style.cssText = "padding:2px 5px;" + (idx === obsSectionsDraft.length - 1 ? "opacity:0.4;cursor:not-allowed;" : "");
          downBtn.disabled = idx === obsSectionsDraft.length - 1;
          downBtn.innerHTML = '<img src="../assets/icons/arrow-down.svg" class="btn-icon btn-icon-xs" alt="" style="width:11px;height:11px;" />';
          downBtn.onclick = (e) => {
            e.stopPropagation();
            if (idx < obsSectionsDraft.length - 1) {
              const moved = obsSectionsDraft.splice(idx, 1)[0];
              obsSectionsDraft.splice(idx + 1, 0, moved);
              renderToptObsSections();
              showToast(t('gsToastSectionsReordered', 'Observation sections reordered'));
            }
          };

          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "btn btn-xs";
          delBtn.style.cssText = "padding:1px 6px;color:var(--warn,#ef4444);font-weight:bold;";
          delBtn.textContent = "×";
          delBtn.title = t('gsDeleteSection', 'Remove Section');
          delBtn.onclick = (e) => {
            e.stopPropagation();
            obsSectionsDraft.splice(idx, 1);
            renderToptObsSections();
          };

          actionsWrap.append(upBtn, downBtn, delBtn);
          row.append(leftWrap, actionsWrap);

          // Drag and drop events for reordering obsSectionsDraft
          row.addEventListener("dragstart", (e) => {
            if (e.target.closest && (e.target.closest("button") || e.target.closest("input"))) {
              e.preventDefault();
              return;
            }
            _toptDragSrcObsSecIdx = idx;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(idx));
            setTimeout(() => { row.classList.add("dragging"); }, 0);
          });

          row.addEventListener("dragend", () => {
            row.classList.remove("dragging");
            toptObsSectionsList.querySelectorAll(".topt-obs-sec-row").forEach(r => r.classList.remove("dragging", "drag-over", "drag-over-top", "drag-over-bottom"));
            _toptDragSrcObsSecIdx = null;
          });

          row.addEventListener("dragover", (e) => {
            if (_toptDragSrcObsSecIdx === null) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            if (_toptDragSrcObsSecIdx === idx) {
              row.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
              return;
            }
            toptObsSectionsList.querySelectorAll(".topt-obs-sec-row").forEach(r => {
              if (r !== row) r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
            });
            const rect = row.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const isBelow = relY > rect.height / 2;
            row.classList.add("drag-over");
            row.classList.toggle("drag-over-bottom", isBelow);
            row.classList.toggle("drag-over-top", !isBelow);
          });

          row.addEventListener("dragleave", (e) => {
            if (row.contains(e.relatedTarget)) return;
            row.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
          });

          row.addEventListener("drop", (e) => {
            if (_toptDragSrcObsSecIdx === null) return;
            e.preventDefault();
            e.stopPropagation();
            toptObsSectionsList.querySelectorAll(".topt-obs-sec-row").forEach(r => r.classList.remove("drag-over", "drag-over-top", "drag-over-bottom"));
            const from = _toptDragSrcObsSecIdx;
            if (from === null || from === idx) return;

            const rect = row.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const isBelow = relY > rect.height / 2;
            let to = idx;
            if (from < to && !isBelow) to = to - 1;
            else if (from > to && isBelow) to = to + 1;
            to = Math.max(0, Math.min(obsSectionsDraft.length - 1, to));
            if (from === to) return;

            const moved = obsSectionsDraft.splice(from, 1)[0];
            obsSectionsDraft.splice(to, 0, moved);
            _toptDragSrcObsSecIdx = null;
            renderToptObsSections();
            showToast(t('gsToastSectionsReordered', 'Observation sections reordered'));
          });

          toptObsSectionsList.appendChild(row);
        });
      }

      if (toptSyncSectionsBtn) {
        toptSyncSectionsBtn.onclick = () => {
          const currentBank = (toptChipsTabBankSel && toptChipsTabBankSel.value) || config.chipBank || classObj.chipBank || _activeChipBankFilename || 'correction-criteria.js';
          syncDraftSectionsWithBank(currentBank);
        };
      }

      if (toptAddSectionBtn && toptNewSectionInput) {
        toptAddSectionBtn.onclick = () => {
          const val = toptNewSectionInput.value.trim();
          if (!val) { toptNewSectionInput.focus(); return; }
          if (!obsSectionsDraft.includes(val)) {
            obsSectionsDraft.push(val);
          }
          toptNewSectionInput.value = "";
          renderToptObsSections();
        };
        toptNewSectionInput.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            toptAddSectionBtn.click();
          }
        };
      }

      renderToptChipsPreview();
      renderToptObsSections();

      _toptRebuildCriteriaList = rebuildToptCriteriaList;
      _toptUpdateLiveGradePreview = updateLiveGradePreview;

      // Default active tab
      switchToptTab(openSection || "info");
      updateLiveGradePreview();

      // ── Save ───────────────────────────────────────────────────
      document.getElementById("topt-save").onclick = () => {
        config.testName = document.getElementById("topt-info-name").value.trim();
        config.testDate = document.getElementById("topt-info-date").value;
        config.scope    = document.getElementById("topt-info-scope").value.trim();
        config.type     = document.getElementById("topt-info-type").value.trim();
        config.nextGradeHighlightPoints = Math.max(0, toNumber(document.getElementById("topt-info-next-grade").value) ?? 0);
        config.observationSections = [...obsSectionsDraft];
        const toptChipsBankEl = document.getElementById("topt-info-chips-bank");
        const toptSelectedChipBank = (toptChipsTabBankSel && toptChipsTabBankSel.value) || (toptChipsBankEl && toptChipsBankEl.value) || config.chipBank;
        if (toptSelectedChipBank) {
          config.chipBank = toptSelectedChipBank;
          _activeChipBankFilename = toptSelectedChipBank;
          if (classObj) {
            if (!Array.isArray(classObj.chipBanks)) classObj.chipBanks = [];
            if (!classObj.chipBanks.includes(toptSelectedChipBank)) classObj.chipBanks.push(toptSelectedChipBank);
            if (!classObj.chipBank) classObj.chipBank = toptSelectedChipBank;
          }
        }

        const fixed = document.getElementById("topt-coeff-mode-fixed").checked;
        if (fixed) config.fixedWeight = Math.max(0, Math.min(100, toNumber(document.getElementById("topt-coeff-fixed-input").value) ?? 0));
        else { config.fixedWeight = null; config.coefficient = Math.max(0, toNumber(document.getElementById("topt-coeff-input").value) ?? 1); }

        if (_toptGradingChanged) {
          const curTotals = calcCriteriaTotals(config, {});
          const curTotalPossible = Math.max(0, curTotals.totalPossible);
          const curSteps = getTestGradeSteps({ ...config, grading: gradingDraft });
          if (gradingDraft.manualInputMode === "points")
            gradingDraft.manualThresholds = buildManualPercentsFromPoints(gradingDraft.manualPoints, curTotalPossible, gradingDraft.manualThresholds, curSteps);
          else
            gradingDraft.manualPoints = buildManualPointsFromPercents(gradingDraft.manualThresholds, curTotalPossible, curSteps);
          if (gradingEqInput) {
            gradingDraft.equationFormula = gradingEqInput.value.trim() || gradingDraft.equationFormula;
          }
          if (gradingEqRound) {
            gradingDraft.equationRounding = gradingEqRound.value || gradingDraft.equationRounding || "0.5";
          }
          if (gradingPointsRoundEl) {
            gradingDraft.pointsRounding = gradingPointsRoundEl.value || gradingDraft.pointsRounding || "0.5";
          }
          Object.assign(config.grading, gradingDraft);
        }

        if (activeSem !== sem) {
          const moved = moveTestBetweenSems(classObj, sem, testIndex, activeSem);
          if (moved) {
            activeTestIndex = moved.testIndex;
            appState.activeTest = moved;
          } else {
            activeSem = sem;
            activeTestIndex = testIndex;
          }
        }

        // Apply new observation sections order to existing student test notes
        if (Array.isArray(config.observationSections) && config.observationSections.length > 0 && Array.isArray(classObj.students)) {
          const orderMap = new Map(config.observationSections.map((name, i) => [String(name || '').trim().toLowerCase(), i]));
          classObj.students.forEach(st => {
            const notes = st.testNotes?.[activeSem]?.[activeTestIndex];
            if (Array.isArray(notes) && notes.length > 1) {
              notes.sort((a, b) => {
                const aKey = String((a && a.label) || '').trim().toLowerCase();
                const bKey = String((b && b.label) || '').trim().toLowerCase();
                const aIdx = orderMap.has(aKey) ? orderMap.get(aKey) : 9999;
                const bIdx = orderMap.has(bKey) ? orderMap.get(bKey) : 9999;
                return aIdx - bIdx;
              });
            }
          });
        }

        const toptDeadlineEl = document.getElementById("topt-info-deadline");
        const toptDeadlineTimeEl = document.getElementById("topt-info-deadline-time");
        const toptDeadlineRemindersEl = document.getElementById("topt-info-deadline-reminders");
        const toptDeadlineDaysAfterEl = document.getElementById("topt-info-deadline-days-after");
        const toptDeadlineAutoEl = document.getElementById("topt-info-deadline-auto");
        if (toptDeadlineEl) {
          config.correctionDeadline = toptDeadlineEl.value || "";
          config.correctionDeadlineTime = (toptDeadlineTimeEl && toptDeadlineTimeEl.value) || "";
          config.correctionDeadlineDaysAfter = toptDeadlineDaysAfterEl ? (parseInt(toptDeadlineDaysAfterEl.value, 10) || 13) : 13;
          config.correctionDeadlineAuto = toptDeadlineAutoEl ? toptDeadlineAutoEl.checked : true;
          config.deadlineReminders = {
            enabled: toptDeadlineRemindersEl ? toptDeadlineRemindersEl.checked : true,
            offsetsDays: [3, 1, 0]
          };
        }

        if (_toptGradingChanged) {
          recalcAllStudentGradesForTest(classObj, activeSem, activeTestIndex);
        }
        saveState(); renderTestSheet(); renderSummary();
        overlay.classList.add("hidden");
        syncTestToPlanner(classObj, activeSem, activeTestIndex); // async, non-blocking
        syncCorrectionDeadlineToPlanner(classObj, activeSem, activeTestIndex, config); // async, non-blocking
        syncTestAutoLinks(classObj, activeSem, activeTestIndex); // async auto-link sync from criteria & scale tabs
      };

      const closeTestOptions = () => { overlay.classList.add("hidden"); _toptRebuildCriteriaList = null; _toptUpdateLiveGradePreview = null; window._toptSwitchTab = null; };
      document.getElementById("topt-cancel").onclick = closeTestOptions;
      const topCloseBtn = document.getElementById("topt-close-top");
      if (topCloseBtn) topCloseBtn.onclick = closeTestOptions;
      overlay.onclick = e => { if (e.target === overlay) closeTestOptions(); };
      overlay.classList.remove("hidden");
    }


    // ── Scoring Progress & Deadlines Controller ──────────────────────
    function isStudentScoredForTest(student, sem, testIndex, config) {
      if (!student) return false;
      const tests = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
      const score = Array.isArray(tests) ? tests[testIndex] : null;
      const critResults = student.criteriaResults?.[sem]?.[testIndex];
      const hasValidScore = score !== null && score !== undefined && score !== "" && !Number.isNaN(Number(score));

      let hasAllCriteriaScored = false;
      if (config && Array.isArray(config.criteria) && config.criteria.length > 0) {
        hasAllCriteriaScored = config.criteria.every(cr => {
          const c = critResults && critResults[cr.id];
          return c && c.points !== null && c.points !== undefined && c.points !== "" && !Number.isNaN(Number(c.points));
        });
      }
      return hasValidScore || hasAllCriteriaScored;
    }

    function recordStudentCorrectionTimestamp(student, classObj, sem, testIndex, config) {
      if (!student || !sem || testIndex == null) return;
      if (!student.correctedAt) {
        student.correctedAt = { sem1: Array(TEST_COUNT_PER_SEM).fill(null), sem2: Array(TEST_COUNT_PER_SEM).fill(null) };
      }
      if (!Array.isArray(student.correctedAt[sem])) {
        student.correctedAt[sem] = Array(TEST_COUNT_PER_SEM).fill(null);
      }
      while (student.correctedAt[sem].length < TEST_COUNT_PER_SEM) {
        student.correctedAt[sem].push(null);
      }
      const cfg = config || (classObj ? getTestConfig(classObj, sem, testIndex) : null);
      if (isStudentScoredForTest(student, sem, testIndex, cfg)) {
        student.correctedAt[sem][testIndex] = new Date().toISOString();
      } else {
        student.correctedAt[sem][testIndex] = null;
      }
    }

    function computeScoringProgress(classObj, sem, testIndex, config) {
      if (!classObj || !Array.isArray(classObj.students)) {
        return {
          totalCount: 0,
          scoredCount: 0,
          remainingCount: 0,
          remainingStudents: [],
          excludedStudents: [],
          avgMin: 0,
          etaMin: 0,
          hasEta: false,
          sampleSize: 0,
          pct: 0,
          deadlineStatus: null,
          daysLeft: null
        };
      }

      config = config || getTestConfig(classObj, sem, testIndex);
      const excludedSet = new Set(
        (Array.isArray(config.excludedStudentIds) ? config.excludedStudentIds : [])
          .filter(id => id != null && id !== '')
          .map(String)
      );
      const absentSet = new Set(
        (Array.isArray(config.absentStudentIds) ? config.absentStudentIds : [])
          .filter(id => id != null && id !== '')
          .map(String)
      );

      const eligibleStudents = [];
      const excludedStudents = [];

      classObj.students.forEach(st => {
        if (!st) return;
        const sId = st.id != null ? String(st.id) : null;
        const sUuid = st.uuid != null ? String(st.uuid) : null;
        const isExcluded = (sId != null && excludedSet.has(sId)) || (sUuid != null && excludedSet.has(sUuid));
        const isAbsent = isStudentAbsentForTest(st.id, config) ||
          (sUuid != null && isStudentAbsentForTest(sUuid, config)) ||
          (sId != null && absentSet.has(sId)) ||
          (sUuid != null && absentSet.has(sUuid));

        if (isExcluded || isAbsent) {
          excludedStudents.push(st);
        } else {
          eligibleStudents.push(st);
        }
      });

      const totalCount = eligibleStudents.length;
      const remainingStudents = [];
      const validCorrectionTimes = [];

      eligibleStudents.forEach(st => {
        const tests = sem === "sem1" ? st.sem1Tests : st.sem2Tests;
        const score = Array.isArray(tests) ? tests[testIndex] : null;
        const critResults = st.criteriaResults?.[sem]?.[testIndex];
        const hasValidScore = score !== null && score !== undefined && score !== "" && !Number.isNaN(Number(score));

        let hasAllCriteriaScored = false;
        if (Array.isArray(config.criteria) && config.criteria.length > 0) {
          hasAllCriteriaScored = config.criteria.every(cr => {
            const c = critResults && critResults[cr.id];
            return c && c.points !== null && c.points !== undefined && c.points !== "" && !Number.isNaN(Number(c.points));
          });
        }

        const isScored = hasValidScore || hasAllCriteriaScored;

        if (isScored) {
          const ct = st.correctionTime?.[sem]?.[testIndex];
          if (typeof ct === "number" && ct > 0.25) {
            validCorrectionTimes.push(ct);
          }
        } else {
          remainingStudents.push(st);
        }
      });

      let scoredCount = totalCount - remainingStudents.length;
      let remainingCount = remainingStudents.length;
      let pct = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;

      if (config.markingCompleted) {
        remainingCount = 0;
        scoredCount = totalCount;
        pct = 100;
        remainingStudents.length = 0;
      }

      let avgMin = 0;
      let sampleSize = validCorrectionTimes.length;
      let hasEta = false;
      let etaMin = 0;

      if (sampleSize >= 2) {
        const sorted = [...validCorrectionTimes].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const maxThreshold = Math.max(15, median * 3);

        const filtered = validCorrectionTimes.map(v => Math.min(v, maxThreshold));
        const sum = filtered.reduce((acc, v) => acc + v, 0);
        avgMin = sum / filtered.length;
        etaMin = Math.round(remainingCount * avgMin * 10) / 10;
        hasEta = true;
      }

      let deadlineStatus = null;
      let daysLeft = null;
      if (config.correctionDeadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dlDate = new Date(config.correctionDeadline + 'T00:00:00');
        const diffMs = dlDate.getTime() - today.getTime();
        daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (remainingCount === 0) {
          deadlineStatus = 'completed';
        } else if (daysLeft < 0) {
          deadlineStatus = 'overdue';
        } else if (daysLeft <= 1) {
          deadlineStatus = 'behind';
        } else {
          deadlineStatus = 'on-track';
        }
      }

      return {
        totalCount,
        scoredCount,
        remainingCount,
        remainingStudents,
        excludedStudents,
        avgMin,
        etaMin,
        hasEta,
        sampleSize,
        pct,
        deadlineStatus,
        daysLeft
      };
    }

    function renderScoringProgressStrip(container, classObj, sem, testIndex, config) {
      let strip = container.querySelector("#smod-scoring-progress-strip");
      if (!strip) {
        strip = document.createElement("div");
        strip.id = "smod-scoring-progress-strip";
        strip.className = "smod-progress-strip";
        strip.innerHTML = `
          <div class="smod-progress-top-row">
            <div class="smod-progress-metrics">
              <span class="smod-badge smod-badge-scored" id="smod-badge-scored" title="${t('gsProgressScored')}">
                <img src="../assets/icons/check.svg" class="smod-badge-icon" alt="" />
                <span id="smod-text-scored">0 / 0</span>
              </span>
              <span class="smod-badge smod-badge-remaining" id="smod-badge-remaining" title="${t('gsProgressRemaining')}">
                <img src="../assets/icons/stopwatch.svg" class="smod-badge-icon" alt="" />
                <span id="smod-text-remaining">0 left</span>
              </span>
              <span class="smod-badge smod-badge-eta" id="smod-badge-eta" title="${t('gsProgressEta')}">
                <img src="../assets/icons/clock.svg" class="smod-badge-icon" alt="" />
                <span id="smod-text-eta">—</span>
              </span>
              <span class="smod-badge smod-badge-deadline hidden" id="smod-badge-deadline">
                <img src="../assets/icons/calendar.svg" class="smod-badge-icon" alt="" />
                <span id="smod-text-deadline"></span>
              </span>
            </div>
            <button type="button" class="smod-progress-btn-rem" id="smod-btn-view-remaining">
              <span>${t('gsProgressRemainingListTitle')}</span>
              <img src="../assets/icons/chevron-down.svg" class="smod-badge-icon" alt="" />
            </button>
          </div>
          <div class="smod-progress-track">
            <div class="smod-progress-fill" id="smod-progress-fill"></div>
          </div>
          <div class="smod-motivator-row" id="smod-motivator-row">
            <span class="smod-motivator-icon"><img src="../assets/icons/sparkles.svg" style="width:14px;height:14px;" alt="" /></span>
            <span class="smod-motivator-text" id="smod-motivator-text"></span>
          </div>
        `;
        container.prepend(strip);

        const btnViewRem = strip.querySelector("#smod-btn-view-remaining");
        if (btnViewRem) {
          btnViewRem.onclick = (e) => {
            e.stopPropagation();
            openRemainingStudentsPopover(btnViewRem, classObj, sem, testIndex, config);
          };
        }
      }

      const progress = computeScoringProgress(classObj, sem, testIndex, config);
      updateScoringProgressStrip(strip, progress, classObj, sem, testIndex, config, true);
    }

    function updateScoringProgressStrip(strip, progress, classObj, sem, testIndex, config, updateMotivator = false) {
      if (!strip || !progress) return;

      const textScored = strip.querySelector("#smod-text-scored");
      const textRemaining = strip.querySelector("#smod-text-remaining");
      const textEta = strip.querySelector("#smod-text-eta");
      const fill = strip.querySelector("#smod-progress-fill");
      const badgeDeadline = strip.querySelector("#smod-badge-deadline");
      const textDeadline = strip.querySelector("#smod-text-deadline");
      const textMotivator = strip.querySelector("#smod-motivator-text");
      const rowMotivator = strip.querySelector("#smod-motivator-row");

      if (textScored) {
        textScored.textContent = tFmt('gsProgressScored', { n: progress.scoredCount, total: progress.totalCount });
      }
      if (textRemaining) {
        textRemaining.textContent = progress.remainingCount === 0 && progress.totalCount > 0
          ? t('gsProgressAllDone')
          : tFmt('gsProgressRemaining', { n: progress.remainingCount });
      }
      if (textEta) {
        textEta.textContent = progress.remainingCount === 0 && progress.totalCount > 0
          ? "✓"
          : (progress.hasEta ? `≈ ${formatCorrectionTime(progress.etaMin)}` : t('gsProgressEtaPending'));
      }

      if (fill) {
        const ratio = progress.totalCount > 0 ? (progress.scoredCount / progress.totalCount) : 0;
        fill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
        fill.classList.toggle("completed", progress.remainingCount === 0 && progress.totalCount > 0);
        fill.classList.toggle("warning", progress.deadlineStatus === "behind");
        fill.classList.toggle("overdue", progress.deadlineStatus === "overdue");
      }

      if (badgeDeadline && textDeadline) {
        if (progress.deadlineStatus) {
          badgeDeadline.classList.remove("hidden");
          badgeDeadline.className = `smod-badge smod-badge-deadline ${progress.deadlineStatus}`;
          const dlText = progress.daysLeft < 0
            ? tFmt('gsToptDeadlineOverdue', { n: Math.abs(progress.daysLeft) })
            : (progress.daysLeft === 0 ? t('gsToptDeadlineDueToday') : tFmt('gsToptDeadlineDaysLeft', { n: progress.daysLeft }));
          textDeadline.textContent = dlText;
        } else {
          badgeDeadline.classList.add("hidden");
        }
      }

      if (rowMotivator && textMotivator) {
        if (window.ScoringMotivators && ScoringMotivators.isEnabled()) {
          if (updateMotivator) {
            const motiv = ScoringMotivators.pick({
              scored: progress.scoredCount,
              total: progress.totalCount,
              remaining: progress.remainingCount,
              pct: progress.pct,
              deadlineStatus: progress.deadlineStatus
            });
            if (motiv && motiv.text) {
              rowMotivator.style.display = "flex";
              textMotivator.textContent = motiv.text;
            } else {
              rowMotivator.style.display = "none";
              textMotivator.textContent = "";
            }
          }
        } else {
          rowMotivator.style.display = "none";
          textMotivator.textContent = "";
        }
      }
    }

    const _gsLastRemainingMap = {};
    // Celebration waiting for the student modal to close: { mode, classObj, sem, testIndex, config }
    let _gsPendingCelebration = null;

    function flushPendingCelebration() {
      const p = _gsPendingCelebration;
      _gsPendingCelebration = null;
      if (p) showCorrectionCompleteCelebration(p.classObj, p.sem, p.testIndex, p.config, p.mode);
    }

    // Returns 'done' when remaining just hit 0, 'scored' when it just decreased, otherwise null.
    function _gsTrackRemainingTransition(classObj, sem, testIndex, config, initOnly) {
      if (!classObj) return null;
      const key = `${classObj.id}|${sem}|${testIndex}`;
      const prog = computeScoringProgress(classObj, sem, testIndex, config);
      const prev = _gsLastRemainingMap[key];
      _gsLastRemainingMap[key] = prog.remainingCount;
      if (initOnly || prev == null || prog.totalCount <= 0) return null;
      if (prog.remainingCount > prev) _gsPendingCelebration = null; // un-scored again: drop stale celebration
      if (prev > 0 && prog.remainingCount === 0) return 'done';
      if (prog.remainingCount < prev) return 'scored';
      return null;
    }

    function showCorrectionCompleteCelebration(classObj, sem, testIndex, config, mode) {
      if (!window.ScoringMotivators || !ScoringMotivators.isEnabled()) return;
      const isDone = mode !== 'scored';
      const prog = computeScoringProgress(classObj, sem, testIndex, config);
      const motiv = ScoringMotivators.pick({
        scored: prog.scoredCount, total: prog.totalCount, remaining: prog.remainingCount,
        pct: prog.pct, deadlineStatus: prog.deadlineStatus
      });
      const msg = (motiv && motiv.text) || t(isDone ? 'gsDoneCelebrationFallback' : 'gsScoredCelebrationFallback');

      const old = document.getElementById("gs-celebration-popup");
      if (old) old.remove();

      const testLabel = config.testName || `T${testIndex + 1}`;
      const title = isDone ? t('gsDoneCelebrationTitle') : t('gsScoredCelebrationTitle');
      const sub = isDone
        ? `${classObj.name} \u00b7 ${testLabel}`
        : `${tFmt('gsProgressRemaining', { n: prog.remainingCount })} \u00b7 ${testLabel}`;
      const popup = document.createElement("div");
      popup.id = "gs-celebration-popup";
      popup.className = "gs-celebration-popup" + (isDone ? "" : " mini");
      popup.setAttribute("role", "status");
      popup.innerHTML = `
        <img class="gs-celebration-icon" src="../assets/icons/${isDone ? 'award' : 'check'}.svg" alt="" />
        <div class="gs-celebration-body">
          <div class="gs-celebration-title">${escapeHtml(title)}</div>
          <div class="gs-celebration-sub">${escapeHtml(sub)}</div>
          <div class="gs-celebration-msg">${escapeHtml(msg)}</div>
        </div>
        <button type="button" class="gs-celebration-close" title="${escapeHtml(t('gsDoneCelebrationClose'))}"><img src="../assets/icons/close.svg" alt="" /></button>`;
      document.body.appendChild(popup);

      let timer = null;
      const dismiss = () => {
        if (timer) clearTimeout(timer);
        popup.classList.remove("show");
        setTimeout(() => popup.remove(), 220);
      };
      popup.querySelector(".gs-celebration-close").addEventListener("click", dismiss);
      requestAnimationFrame(() => popup.classList.add("show"));
      timer = setTimeout(dismiss, isDone ? 6000 : 3500);
    }

    function updateTopChipScoringProgress(classObj, sem, testIndex, config) {
      const progressChip = document.getElementById("chip-scoring-progress");
      if (!progressChip) return;
      if (!classObj) classObj = getActiveClass();
      if (!classObj) return;
      if (!sem && appState && appState.activeTest) sem = appState.activeTest.semester;
      if (testIndex == null && appState && appState.activeTest) testIndex = appState.activeTest.testIndex;
      if (sem == null || testIndex == null) return;
      if (!config) config = getTestConfig(classObj, sem, testIndex);

      const progress = computeScoringProgress(classObj, sem, testIndex, config);
      progressChip.className = "config-chip chip-scoring-progress" + (progress.remainingCount === 0 && progress.totalCount > 0 ? " all-done" : "");
      const etaStr = progress.hasEta ? ` · ≈ ${formatCorrectionTime(progress.etaMin)}` : "";
      const dlBadge = progress.deadlineStatus ? ` [${progress.daysLeft < 0 ? tFmt('gsToptDeadlineOverdue', { n: Math.abs(progress.daysLeft) }) : (progress.daysLeft === 0 ? t('gsToptDeadlineDueToday') : tFmt('gsToptDeadlineDaysLeft', { n: progress.daysLeft }))}]` : "";
      progressChip.innerHTML = `<span class="chip-icon"><img src="../assets/icons/stopwatch.svg" class="btn-icon" alt="" /></span><span class="chip-label">${t('gsScoringProgressTitle')}</span><span class="chip-value">${progress.remainingCount === 0 && progress.totalCount > 0 ? t('gsProgressAllDone') : tFmt('gsProgressRemaining', { n: progress.remainingCount }) + etaStr}${dlBadge}</span>`;
    }

    function openRemainingStudentsPopover(anchorEl, classObj, sem, testIndex, config) {
      const popover = document.getElementById("gs-remaining-students-popover");
      if (!popover) return;

      const progress = computeScoringProgress(classObj, sem, testIndex, config);
      const summaryEl = document.getElementById("gs-rem-popover-summary");
      const listEl = document.getElementById("gs-rem-popover-list");
      const excludedEl = document.getElementById("gs-rem-popover-excluded");

      if (summaryEl) {
        const avgText = progress.hasEta ? tFmt('gsProgressAvg', { time: formatCorrectionTime(progress.avgMin) }) : t('gsProgressEtaPending');
        summaryEl.textContent = `${tFmt('gsProgressRemaining', { n: progress.remainingCount })} · ${avgText}`;
      }

      if (listEl) {
        listEl.innerHTML = "";
        if (progress.remainingStudents.length === 0) {
          listEl.innerHTML = `<div style="text-align:center;padding:16px;color:#1a6438;font-weight:700;">${t('gsProgressAllDone')}</div>`;
        } else {
          progress.remainingStudents.forEach(st => {
            const row = document.createElement("div");
            row.className = "gs-rem-row";
            const stName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
              ? StudentNameUtils.formatStudentName(st, getGsNameDisplayMode())
              : `${st.firstName} ${st.lastName}`.trim();

            row.innerHTML = `
              <div class="gs-rem-student-info">
                <span class="gs-rem-student-idx">#${st.index || ''}</span>
                <span class="gs-rem-student-name" title="${escapeHtml(stName)}">${escapeHtml(stName)}</span>
              </div>
              <div class="gs-rem-actions">
                <button type="button" class="gs-rem-btn-score" title="${t('gsProgressGoTo')}">${t('gsProgressGoTo')}</button>
                <button type="button" class="gs-rem-btn-exclude" title="${t('gsProgressExcludeFromCount')}">✕</button>
              </div>
            `;

            row.querySelector(".gs-rem-btn-score").onclick = () => {
              jumpToStudentFromPopover(st, classObj, sem, testIndex, config);
            };

            row.querySelector(".gs-rem-btn-exclude").onclick = () => {
              const targetId = st.id != null ? st.id : st.uuid;
              toggleStudentExclusion(targetId, classObj, sem, testIndex, config, true);
              if (st.uuid && st.uuid !== targetId) {
                toggleStudentExclusion(st.uuid, classObj, sem, testIndex, config, true);
              }
              openRemainingStudentsPopover(anchorEl, classObj, sem, testIndex, config);
            };

            listEl.appendChild(row);
          });
        }
      }

      if (excludedEl) {
        if (progress.excludedStudents.length > 0) {
          excludedEl.style.display = "block";
          excludedEl.innerHTML = `<div class="gs-rem-popover-excluded-title">${t('gsProgressExcludedStudents')} (${progress.excludedStudents.length})</div>`;
          progress.excludedStudents.forEach(st => {
            const row = document.createElement("div");
            row.className = "gs-rem-row excluded";
            const stName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
              ? StudentNameUtils.formatStudentName(st, getGsNameDisplayMode())
              : `${st.firstName} ${st.lastName}`.trim();
            const sId = st.id != null ? String(st.id) : null;
            const sUuid = st.uuid != null ? String(st.uuid) : null;
            const isStAbsent = isStudentAbsentForTest(st.id, config) || (sUuid && isStudentAbsentForTest(sUuid, config));
            const absBadgeHtml = isStAbsent ? `<span class="gs-absent-badge" style="margin-left:4px;">${escapeHtml(t('gsAbsentBadgeLabel', 'ABSENT'))}</span>` : '';

            row.innerHTML = `
              <div class="gs-rem-student-info">
                <span class="gs-rem-student-name" title="${escapeHtml(stName)}">${escapeHtml(stName)}</span>${absBadgeHtml}
              </div>
              <div class="gs-rem-actions">
                <button type="button" class="gs-rem-btn-exclude" style="color:#1a6438;font-weight:800;" title="${t('gsProgressIncludeInCount')}">+</button>
              </div>
            `;

            row.querySelector(".gs-rem-btn-exclude").onclick = () => {
              const targetId = st.id != null ? st.id : st.uuid;
              if (isStAbsent) {
                toggleStudentAbsentForTest(targetId, classObj, sem, testIndex, config);
                if (st.uuid && st.uuid !== targetId) {
                  toggleStudentAbsentForTest(st.uuid, classObj, sem, testIndex, config);
                }
              } else {
                toggleStudentExclusion(targetId, classObj, sem, testIndex, config, false);
                if (st.uuid && st.uuid !== targetId) {
                  toggleStudentExclusion(st.uuid, classObj, sem, testIndex, config, false);
                }
              }
              openRemainingStudentsPopover(anchorEl, classObj, sem, testIndex, config);
            };

            excludedEl.appendChild(row);
          });
        } else {
          excludedEl.style.display = "none";
        }
      }

      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        let top = rect.bottom + 8;
        let left = Math.min(window.innerWidth - 376, Math.max(16, rect.right - 360));
        if (top + 420 > window.innerHeight) {
          top = Math.max(16, rect.top - 430);
        }
        popover.style.top = `${Math.round(top)}px`;
        popover.style.left = `${Math.round(left)}px`;
      } else {
        popover.style.top = "100px";
        popover.style.left = "calc(50vw - 180px)";
      }

      popover.classList.remove("hidden");

      const closeBtn = document.getElementById("gs-rem-popover-close");
      if (closeBtn) closeBtn.onclick = () => popover.classList.add("hidden");
    }

    function jumpToStudentFromPopover(targetStudent, classObj, sem, testIndex, config) {
      const popover = document.getElementById("gs-remaining-students-popover");
      if (popover) popover.classList.add("hidden");

      if (_studentModalDraft) {
        persistStudentModalDraft(true);
      }
      flushPendingCelebration();

      const sId = targetStudent.id != null ? String(targetStudent.id) : null;
      const sUuid = targetStudent.uuid != null ? String(targetStudent.uuid) : null;
      const targetTr = (sId ? document.querySelector(`#test-table tbody tr[data-student-id="${sId}"]`) : null)
        || (sUuid ? document.querySelector(`#test-table tbody tr[data-student-id="${sUuid}"]`) : null);
      openStudentModal(targetStudent, classObj, sem, testIndex, targetTr, config);
    }

    function toggleStudentExclusion(studentId, classObj, sem, testIndex, config, exclude) {
      if (!config) config = getTestConfig(classObj, sem, testIndex);
      if (!Array.isArray(config.excludedStudentIds)) config.excludedStudentIds = [];
      const sid = studentId != null ? String(studentId).trim() : '';
      if (!sid) return;

      if (exclude) {
        if (!config.excludedStudentIds.some(id => id != null && String(id) === sid)) {
          config.excludedStudentIds.push(sid);
        }
      } else {
        config.excludedStudentIds = config.excludedStudentIds.filter(id => id != null && String(id) !== sid);
      }

      saveState(classObj.id, sem, testIndex);

      const modalBody = document.getElementById("student-modal-body");
      if (modalBody) {
        const strip = modalBody.querySelector("#smod-scoring-progress-strip");
        if (strip) {
          const progress = computeScoringProgress(classObj, sem, testIndex, config);
          updateScoringProgressStrip(strip, progress, classObj, sem, testIndex, config);
        }
      }

      updateTopChipScoringProgress(classObj, sem, testIndex, config);
    }

    async function syncCorrectionDeadlineToPlanner(classObj, sem, testIndex, config) {
      if (!window.Desktop || !Desktop.isElectron()) return;
      config = config || getTestConfig(classObj, sem, testIndex);

      const plannerClassId = classObj.groupId || classObj.id;
      if (!plannerClassId) return;

      try {
        let allByClass = {};
        const fileRes = await Desktop.readByPath('user', 'planner/' + plannerClassId + '.js');
        if (fileRes && fileRes.content) {
          try {
            const fake = {};
            new Function('window', fileRes.content)(fake);
            allByClass = fake.PLANNER_ENTRIES_BY_CLASS || {};
          } catch (e) {}
        }

        let list = (allByClass[plannerClassId] || []).slice();

        const deadlineEntryIdx = list.findIndex(e =>
          e._gradeRef && e._gradeRef.classId === classObj.id && e._gradeRef.semester === sem && e._gradeRef.testIndex === testIndex
        );

        if (!config.correctionDeadline) {
          if (deadlineEntryIdx >= 0) {
            list.splice(deadlineEntryIdx, 1);
            allByClass[plannerClassId] = list;
            const content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
              'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(plannerClassId) + '] = ' +
              JSON.stringify(list, null, 2) + ';\n';
            await Desktop.saveText('user', (plannerClassId || '__unassigned') + '.js', content, 'planner');
          }
          return;
        }

        const testLabel = config.testName || `T${testIndex + 1}`;
        const topic = (typeof t === 'function' ? t('gsCorrectionDeadlineTitle') : 'Finish correcting: ') + testLabel;
        const objective = (typeof t === 'function' ? t('gsCorrectionDeadlineFor') : 'Correction deadline for ') + classObj.name;

        if (deadlineEntryIdx >= 0) {
          list[deadlineEntryIdx].date = config.correctionDeadline;
          list[deadlineEntryIdx].time = config.correctionDeadlineTime || '';
          list[deadlineEntryIdx].topic = topic;
          list[deadlineEntryIdx].objective = objective;
        } else {
          list.push({
            id: 'gs-dl-' + plannerClassId + '-' + sem + '-' + testIndex + '-' + Date.now(),
            classId: plannerClassId,
            date: config.correctionDeadline,
            time: config.correctionDeadlineTime || '',
            timeEnd: '',
            type: 'assignment',
            topic: topic,
            objective: objective,
            readings: '', activities: '', homework: '', notes: '',
            reminder: null,
            isCorrectionDeadline: true,
            _gradeRef: { classId: classObj.id, semester: sem, testIndex: testIndex }
          });
        }

        allByClass[plannerClassId] = list;
        const content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
          'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(plannerClassId) + '] = ' +
          JSON.stringify(list, null, 2) + ';\n';
        await Desktop.saveText('user', (plannerClassId || '__unassigned') + '.js', content, 'planner');
      } catch (e) {
        console.warn('syncCorrectionDeadlineToPlanner error:', e);
      }
    }


    function updateStudentRow(tr, student, sem, testIndex, config, classObj) {
      const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
      const criteriaMap = student.criteriaResults[sem][testIndex] || {};
      const totals = calcCriteriaTotals(config, criteriaMap);
      const noteArray = student.testNotes[sem][testIndex] || [];

      // Grade cell = td index 3
      tr.cells[3].textContent = sourceArray[testIndex] == null ? "\u2014" : String(sourceArray[testIndex]);
      applyGradeColor(tr.cells[3], sourceArray[testIndex], config);

      // Next-grade proximity cell = index 4
      updateNextGradeDeltaCell(tr.cells[4], config, totals, sourceArray[testIndex]);

      const noteText = noteArray.map(s => {
        const value = sectionDisplayText(s);
        return value ? (s.label ? s.label + ": " : "") + value : "";
      }).filter(Boolean).join(" / ") || "\u2014";
      tr.cells[5].textContent = noteText;
      applyObsCellTooltip(tr.cells[5], noteArray);

      // Criteria score = td index 6
      if (totals.totalPossible > 0) {
        const displayedScored = fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0));
        tr.cells[6].textContent = `${displayedScored} / ${fmtN(totals.totalPossible)}`;
      } else {
        tr.cells[6].textContent = "\u2014";
      }

      // Correction time cell = index 7
      if (tr.cells[7]) {
        const ct = student.correctionTime ? student.correctionTime[sem][testIndex] : null;
        tr.cells[7].textContent = formatCorrectionTime(ct);
      }

      // Per-criterion cells start at index 8
      const perCritMeans = config.criteria.map(criterion => {
        const vals = classObj.students.map(s => {
          const cMap = s.criteriaResults[sem][testIndex] || {};
          return cMap[criterion.id] ? toNumber(cMap[criterion.id].points) : null;
        }).filter(v => v != null);
        const stats = calcStats(vals);
        return stats ? stats.mean : null;
      });
      config.criteria.forEach((criterion, i) => {
        const cell = tr.cells[8 + i];
        if (!cell) return;
        const pts = criteriaMap[criterion.id] ? criteriaMap[criterion.id].points : null;
        const ptsNum = toNumber(pts);
        cell.textContent = ptsNum != null ? `${fmtN(ptsNum)} / ${fmtN(criterion.maxPoints)}` : "\u2014";
        const critMean = perCritMeans[i];
        cell.style.backgroundColor = (ptsNum != null && critMean != null && ptsNum < critMean) ? "#fde8e8" : "";
      });
    }

    function autoResizeTextarea(el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }

    function renderNoteCell(tdNote, noteArray, testIndex) {
      // Ensure sections format (migrate legacy strings)
      if (!Array.isArray(noteArray[testIndex])) {
        const v = noteArray[testIndex];
        noteArray[testIndex] = (typeof v === "string" && v.trim()) ? [{ label: "", text: v }] : [];
      }
      const sections = noteArray[testIndex];

      const container = document.createElement("div");
      container.className = "note-sections-container";

      const addBtn = document.createElement("button");
      addBtn.innerHTML = '<img src="../assets/icons/plus.svg" class="btn-icon" alt="" />';
      addBtn.className = "btn note-add-btn";
      addBtn.title = t('gsBtnAddSection');
      container.appendChild(addBtn);

      function addSectionBlock(section) {
        const block = document.createElement("div");
        block.className = "note-section";

        const header = document.createElement("div");
        header.className = "note-section-header";

        const labelInput = document.createElement("input");
        labelInput.type = "text";
        labelInput.className = "note-section-label";
        labelInput.value = section.label;
        labelInput.placeholder = t('gsPlaceholderSection');
        labelInput.addEventListener("input", () => {
          section.label = labelInput.value;
          saveState();
        });

        const delBtn = document.createElement("button");
        delBtn.innerHTML = '<img src="../assets/icons/close.svg" class="btn-icon" alt="" />';
        delBtn.className = "note-section-del";
        delBtn.title = t('gsTitleRemoveSection');
        delBtn.addEventListener("click", () => {
          const idx = sections.indexOf(section);
          if (idx !== -1) sections.splice(idx, 1);
          saveState();
          block.remove();
        });

        header.appendChild(labelInput);
        header.appendChild(delBtn);

        const ta = document.createElement("textarea");
        ta.className = "note-section-body";
        ta.value = section.text;
        ta.placeholder = t('gsPlaceholderObservation');
        ta.addEventListener("input", () => {
          autoResizeTextarea(ta);
          section.text = ta.value;
          saveState();
        });

        block.appendChild(header);
        block.appendChild(ta);
        container.insertBefore(block, addBtn);
        autoResizeTextarea(ta);
      }

      addBtn.addEventListener("click", () => {
        const section = { label: "", text: "" };
        sections.push(section);
        saveState();
        addSectionBlock(section);
      });

      sections.forEach(s => addSectionBlock(s));
      tdNote.appendChild(container);
    }


    // ── Criterion edit popup ─────────────────────────────────────
    let _critPopupCtx = null;
    let _critPopupCompetenceDraft = [];

    function renderCritPopupChips() {
      const chipsEl = document.getElementById("crit-popup-competence-chips");
      if (!chipsEl) return;
      chipsEl.innerHTML = "";
      if (!_critPopupCompetenceDraft || _critPopupCompetenceDraft.length === 0) {
        const empty = document.createElement("span");
        empty.style.cssText = "font-size:0.78rem;color:var(--muted);";
        empty.textContent = t('gsNoCompetencesLinked');
        chipsEl.appendChild(empty);
        return;
      }
      _critPopupCompetenceDraft.forEach(cid => {
        const comp = findLessonCompetence(cid);
        const chip = document.createElement("span");
        chip.style.cssText = "display:inline-flex;align-items:center;gap:5px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:12px;padding:2px 8px;font-size:0.75rem;font-weight:600;";
        const label = comp ? (comp.code || comp.title || cid) : cid;
        chip.textContent = label;
        chip.title = comp ? `${comp.code ? comp.code + ': ' : ''}${comp.title || ''}${comp.description ? ' - ' + comp.description : ''}` : cid;

        const removeX = document.createElement("span");
        removeX.style.cssText = "cursor:pointer;margin-left:3px;font-weight:bold;color:#0284c7;";
        removeX.textContent = "×";
        removeX.onclick = (ev) => {
          ev.stopPropagation();
          _critPopupCompetenceDraft = _critPopupCompetenceDraft.filter(id => id !== cid);
          renderCritPopupChips();
        };
        chip.appendChild(removeX);
        chipsEl.appendChild(chip);
      });
    }
    let _critPopupUnregEscape = null;
    function criterionPopupOpen(criterion, classObj, sem, testIndex) {
      _critPopupCtx = { criterion, classObj, sem, testIndex };
      const testConfig = classObj?.testConfigs?.[sem]?.[testIndex];
      const effCompIds = getCriterionEffectiveCompetenceIds(criterion, classObj, testConfig);
      _critPopupCompetenceDraft = Array.isArray(criterion.competenceIds) && criterion.competenceIds.length > 0
        ? [...criterion.competenceIds]
        : [...effCompIds];
      const bank = getTestCriteriaBank(classObj, testConfig);
      refreshCriteriaPresetDropdown(bank ? bank.filename : null);
      document.getElementById("crit-popup-preset").value = "";
      document.getElementById("crit-popup-name").value = criterion.name;
      document.getElementById("crit-popup-min").value = String(criterion.minPoints != null ? criterion.minPoints : 0);
      document.getElementById("crit-popup-max").value = String(criterion.maxPoints);
      document.getElementById("crit-popup-coeff").value = String(criterion.pointCoefficient);
      document.getElementById(criterion.showComment !== false ? "crit-popup-comment-yes" : "crit-popup-comment-no").checked = true;
      document.getElementById("crit-popup-bonus").checked = !!criterion.isBonus;
      renderCritPopupChips();
      document.getElementById("criterion-popup-overlay").classList.remove("hidden");
      document.getElementById("crit-popup-name").focus();
      if (window.cmtPushEscapeHandler) {
        _critPopupUnregEscape = window.cmtPushEscapeHandler(() => criterionPopupClose());
      }
    }

    function criterionPopupClose() {
      if (_critPopupUnregEscape) {
        _critPopupUnregEscape();
        _critPopupUnregEscape = null;
      }
      document.getElementById("criterion-popup-overlay").classList.add("hidden");
      _critPopupCtx = null;
      _critPopupCompetenceDraft = [];
    }

