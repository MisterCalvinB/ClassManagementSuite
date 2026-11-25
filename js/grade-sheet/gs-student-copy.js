    // ── Copy / Move & Clear Student Test Entry ─────────────────────────────

    let _copyStudentModalCtx = null;

    function _ensureStudentTestArrays(student, sem) {
      if (!student || !sem) return;
      if (!Array.isArray(student.sem1Tests)) student.sem1Tests = Array(TEST_COUNT_PER_SEM).fill(null);
      if (!Array.isArray(student.sem2Tests)) student.sem2Tests = Array(TEST_COUNT_PER_SEM).fill(null);
      if (!student.gradeOverrides) {
        student.gradeOverrides = { sem1: Array(TEST_COUNT_PER_SEM).fill(false), sem2: Array(TEST_COUNT_PER_SEM).fill(false) };
      }
      if (!Array.isArray(student.gradeOverrides[sem])) {
        student.gradeOverrides[sem] = Array(TEST_COUNT_PER_SEM).fill(false);
      }
      if (!student.criteriaResults) {
        student.criteriaResults = {
          sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({})),
          sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}))
        };
      }
      if (!Array.isArray(student.criteriaResults[sem])) {
        student.criteriaResults[sem] = Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}));
      }
      if (!student.testNotes) {
        student.testNotes = {
          sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => []),
          sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => [])
        };
      }
      if (!Array.isArray(student.testNotes[sem])) {
        student.testNotes[sem] = Array(TEST_COUNT_PER_SEM).fill(null).map(() => []);
      }
      if (!student.correctionTime) {
        student.correctionTime = { sem1: Array(TEST_COUNT_PER_SEM).fill(null), sem2: Array(TEST_COUNT_PER_SEM).fill(null) };
      }
      if (!Array.isArray(student.correctionTime[sem])) {
        student.correctionTime[sem] = Array(TEST_COUNT_PER_SEM).fill(null);
      }
      if (!student.correctedAt) {
        student.correctedAt = { sem1: Array(TEST_COUNT_PER_SEM).fill(null), sem2: Array(TEST_COUNT_PER_SEM).fill(null) };
      }
      if (!Array.isArray(student.correctedAt[sem])) {
        student.correctedAt[sem] = Array(TEST_COUNT_PER_SEM).fill(null);
      }
    }

    function _formatStudentDisplayName(student) {
      if (!student) return "";
      if (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === "function") {
        return StudentNameUtils.formatStudentName(student, getGsNameDisplayMode());
      }
      return `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.name || "";
    }

    function _cloneCriteriaResultsMap(rawMap) {
      const cloned = {};
      if (!rawMap || typeof rawMap !== "object") return cloned;
      Object.keys(rawMap).forEach(cid => {
        const entry = rawMap[cid];
        if (entry && typeof entry === "object") {
          cloned[cid] = {
            points: entry.points != null ? entry.points : null,
            comment: entry.comment != null ? String(entry.comment) : ""
          };
        }
      });
      return cloned;
    }

    function _cloneTestNotesArray(rawNotes) {
      if (!Array.isArray(rawNotes)) return [];
      return rawNotes.map(sec => {
        if (typeof cloneObservationSection === "function") {
          return cloneObservationSection(sec);
        }
        return JSON.parse(JSON.stringify(sec));
      });
    }

    function hasStudentTestEntryData(student, sem, testIndex, config) {
      if (!student || !sem || testIndex == null) {
        return { hasData: false, grade: null, criteriaCount: 0, notesCount: 0, isAbsent: false };
      }
      const gradesArr = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
      const grade = Array.isArray(gradesArr) ? gradesArr[testIndex] : null;
      const hasGrade = grade != null && grade !== "";
      const hasOverride = !!(student.gradeOverrides && Array.isArray(student.gradeOverrides[sem]) && student.gradeOverrides[sem][testIndex]);

      let criteriaCount = 0;
      const cMap = student.criteriaResults && Array.isArray(student.criteriaResults[sem]) ? student.criteriaResults[sem][testIndex] : null;
      if (cMap && typeof cMap === "object") {
        Object.values(cMap).forEach(entry => {
          if (entry && (entry.points != null || (entry.comment && String(entry.comment).trim() !== ""))) {
            criteriaCount++;
          }
        });
      }

      let notesCount = 0;
      const notes = student.testNotes && Array.isArray(student.testNotes[sem]) ? student.testNotes[sem][testIndex] : null;
      if (Array.isArray(notes)) {
        notes.forEach(sec => {
          if (!sec || typeof sec !== "object") return;
          const hasText = !!(sec.text && String(sec.text).trim() !== "");
          const hasChecklist = Array.isArray(sec.checklist) && sec.checklist.length > 0;
          if (hasText || hasChecklist) notesCount++;
        });
      }

      const corrTime = student.correctionTime && Array.isArray(student.correctionTime[sem]) ? student.correctionTime[sem][testIndex] : null;
      const isAbsent = typeof isStudentAbsentForTest === "function" ? isStudentAbsentForTest(student.id, config) : false;

      const hasData = hasGrade || hasOverride || criteriaCount > 0 || notesCount > 0 || corrTime != null || isAbsent;
      return { hasData, grade: hasGrade ? grade : null, criteriaCount, notesCount, isAbsent };
    }

    function clearStudentTestEntry(student, classObj, sem, testIndex, config, options = {}) {
      if (!student || !sem || testIndex == null) return false;
      _ensureStudentTestArrays(student, sem);

      if (sem === "sem1") {
        student.sem1Tests[testIndex] = null;
      } else {
        student.sem2Tests[testIndex] = null;
      }
      student.gradeOverrides[sem][testIndex] = false;
      student.criteriaResults[sem][testIndex] = {};
      student.testNotes[sem][testIndex] = [];
      if (student.testRemarkMax && Array.isArray(student.testRemarkMax[sem])) {
        student.testRemarkMax[sem][testIndex] = 0;
      }
      student.correctionTime[sem][testIndex] = null;
      student.correctedAt[sem][testIndex] = null;

      if (config && Array.isArray(config.absentStudentIds)) {
        const sid = String(student.id);
        const idx = config.absentStudentIds.findIndex(id => id != null && String(id) === sid);
        if (idx !== -1) config.absentStudentIds.splice(idx, 1);
      }

      if (!options.skipSave) {
        saveState(classObj ? classObj.id : null, sem, testIndex);
      }
      if (!options.skipRender) {
        renderTestSheet();
        renderSummary();
        if (classObj && typeof renderTestTopChips === "function") {
          renderTestTopChips(classObj, sem, testIndex);
        }
      }
      return true;
    }

    function copyStudentTestEntry(sourceStudent, targetStudent, classObj, sem, testIndex, config, options = {}) {
      if (!sourceStudent || !targetStudent || !sem || testIndex == null) return false;
      if (sourceStudent.id === targetStudent.id) return false;

      _ensureStudentTestArrays(sourceStudent, sem);
      _ensureStudentTestArrays(targetStudent, sem);

      const srcGrade = sem === "sem1" ? sourceStudent.sem1Tests[testIndex] : sourceStudent.sem2Tests[testIndex];
      if (sem === "sem1") {
        targetStudent.sem1Tests[testIndex] = srcGrade != null ? srcGrade : null;
      } else {
        targetStudent.sem2Tests[testIndex] = srcGrade != null ? srcGrade : null;
      }

      targetStudent.gradeOverrides[sem][testIndex] = !!sourceStudent.gradeOverrides[sem][testIndex];
      targetStudent.criteriaResults[sem][testIndex] = _cloneCriteriaResultsMap(sourceStudent.criteriaResults[sem][testIndex]);
      targetStudent.testNotes[sem][testIndex] = _cloneTestNotesArray(sourceStudent.testNotes[sem][testIndex]);

      if (sourceStudent.testRemarkMax && Array.isArray(sourceStudent.testRemarkMax[sem])) {
        if (!targetStudent.testRemarkMax) {
          targetStudent.testRemarkMax = { sem1: Array(TEST_COUNT_PER_SEM).fill(0), sem2: Array(TEST_COUNT_PER_SEM).fill(0) };
        }
        if (!Array.isArray(targetStudent.testRemarkMax[sem])) {
          targetStudent.testRemarkMax[sem] = Array(TEST_COUNT_PER_SEM).fill(0);
        }
        targetStudent.testRemarkMax[sem][testIndex] = Number(sourceStudent.testRemarkMax[sem][testIndex]) || 0;
      }

      targetStudent.correctionTime[sem][testIndex] = sourceStudent.correctionTime[sem][testIndex] != null
        ? sourceStudent.correctionTime[sem][testIndex]
        : null;
      targetStudent.correctedAt[sem][testIndex] = sourceStudent.correctedAt[sem][testIndex] != null
        ? sourceStudent.correctedAt[sem][testIndex]
        : null;

      if (config) {
        if (!Array.isArray(config.absentStudentIds)) config.absentStudentIds = [];
        const srcAbsent = typeof isStudentAbsentForTest === "function" && isStudentAbsentForTest(sourceStudent.id, config);
        const tgtSid = String(targetStudent.id);
        const tgtIdx = config.absentStudentIds.findIndex(id => id != null && String(id) === tgtSid);
        if (srcAbsent && tgtIdx === -1) {
          config.absentStudentIds.push(tgtSid);
        } else if (!srcAbsent && tgtIdx !== -1) {
          config.absentStudentIds.splice(tgtIdx, 1);
        }
      }

      if (options.clearSource) {
        clearStudentTestEntry(sourceStudent, classObj, sem, testIndex, config, { skipSave: true, skipRender: true });
      }

      if (!options.skipSave) {
        saveState(classObj ? classObj.id : null, sem, testIndex);
      }
      if (!options.skipRender) {
        renderTestSheet();
        renderSummary();
        if (classObj && typeof renderTestTopChips === "function") {
          renderTestTopChips(classObj, sem, testIndex);
        }
      }
      return true;
    }

    function _updateCopyStudentModalWarningAndBtn() {
      if (!_copyStudentModalCtx) return;
      const { classObj, sem, testIndex, config } = _copyStudentModalCtx;
      const sel = document.getElementById("gs-copy-student-target");
      const warnEl = document.getElementById("gs-copy-student-warning");
      const clearCb = document.getElementById("gs-copy-student-clear-source");
      const confirmBtn = document.getElementById("gs-copy-student-confirm");
      if (!sel || !warnEl || !clearCb || !confirmBtn) return;

      const targetId = sel.value;
      const targetStudent = (classObj.students || []).find(s => s && String(s.id) === String(targetId));
      const info = targetStudent ? hasStudentTestEntryData(targetStudent, sem, testIndex, config) : { hasData: false };

      warnEl.classList.toggle("hidden", !info.hasData);
      confirmBtn.disabled = !targetStudent;
      confirmBtn.textContent = clearCb.checked
        ? t("gsCopyStudentBtnCopyAndClear", "Copy & Clear Source")
        : t("gsCopyStudentBtnCopyOnly", "Copy");
    }

    function openCopyStudentModal(sourceStudent, classObj, sem, testIndex, config) {
      if (!sourceStudent || !classObj || !sem || testIndex == null) return;
      if (!config) config = getTestConfig(classObj, sem, testIndex);

      // If the student modal is currently open for this student, flush unsaved edits first
      const studentModalOpen = !!(
        typeof _studentModalDraft === "object" &&
        _studentModalDraft &&
        _studentModalDraft.student &&
        _studentModalDraft.student.id === sourceStudent.id &&
        _studentModalDraft.sem === sem &&
        _studentModalDraft.testIndex === testIndex
      );
      if (studentModalOpen) {
        if (typeof flushStudentModalAutoSave === "function") flushStudentModalAutoSave();
        if (typeof persistStudentModalDraft === "function") persistStudentModalDraft(false);
      }

      const overlay = document.getElementById("gs-copy-student-overlay");
      const sourceNameEl = document.getElementById("gs-copy-student-source-name");
      const sourceSummaryEl = document.getElementById("gs-copy-student-source-summary");
      const targetSelect = document.getElementById("gs-copy-student-target");
      const clearCb = document.getElementById("gs-copy-student-clear-source");
      if (!overlay || !sourceNameEl || !sourceSummaryEl || !targetSelect || !clearCb) return;

      _copyStudentModalCtx = { sourceStudent, classObj, sem, testIndex, config, fromStudentModal: studentModalOpen };

      const srcName = _formatStudentDisplayName(sourceStudent);
      sourceNameEl.textContent = srcName;

      const srcInfo = hasStudentTestEntryData(sourceStudent, sem, testIndex, config);
      const summaryParts = [];
      if (srcInfo.grade != null) summaryParts.push(`${t("gsColGrade", "Grade")}: ${fmt(srcInfo.grade)}`);
      if (srcInfo.criteriaCount > 0) summaryParts.push(tFmt("gsCopyStudentSummaryCriteria", { n: srcInfo.criteriaCount }));
      if (srcInfo.notesCount > 0) summaryParts.push(tFmt("gsCopyStudentSummaryNotes", { n: srcInfo.notesCount }));
      if (srcInfo.isAbsent) summaryParts.push(t("gsBadgeAbsent", "Absent"));
      sourceSummaryEl.textContent = summaryParts.length > 0
        ? summaryParts.join(" · ")
        : t("gsCopyStudentSummaryEmpty", "No scores or notes recorded yet.");

      targetSelect.innerHTML = "";
      const others = (classObj.students || []).filter(s => s && String(s.id) !== String(sourceStudent.id));
      others.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        const name = _formatStudentDisplayName(s);
        const info = hasStudentTestEntryData(s, sem, testIndex, config);
        if (info.hasData) {
          const badge = info.grade != null ? fmt(info.grade) : t("gsCopyStudentHasDataTag", "has data");
          opt.textContent = `${name} (${badge})`;
        } else {
          opt.textContent = name;
        }
        targetSelect.appendChild(opt);
      });

      clearCb.checked = true;
      _updateCopyStudentModalWarningAndBtn();
      overlay.classList.remove("hidden");
      targetSelect.focus();
    }

    function closeCopyStudentModal() {
      const overlay = document.getElementById("gs-copy-student-overlay");
      if (overlay) overlay.classList.add("hidden");
      _copyStudentModalCtx = null;
    }

    function confirmCopyStudentModal() {
      if (!_copyStudentModalCtx) return;
      const { sourceStudent, classObj, sem, testIndex, config, fromStudentModal } = _copyStudentModalCtx;
      const targetSelect = document.getElementById("gs-copy-student-target");
      const clearCb = document.getElementById("gs-copy-student-clear-source");
      if (!targetSelect || !clearCb) return;

      const targetStudent = (classObj.students || []).find(s => s && String(s.id) === String(targetSelect.value));
      if (!targetStudent) return;

      const clearSource = !!clearCb.checked;
      copyStudentTestEntry(sourceStudent, targetStudent, classObj, sem, testIndex, config, { clearSource });

      const srcName = _formatStudentDisplayName(sourceStudent);
      const tgtName = _formatStudentDisplayName(targetStudent);
      closeCopyStudentModal();

      if (fromStudentModal && typeof closeStudentModal === "function") {
        closeStudentModal();
      }

      const msg = clearSource
        ? tFmt("gsToastStudentCopiedAndCleared", { from: srcName, to: tgtName })
        : tFmt("gsToastStudentCopied", { from: srcName, to: tgtName });
      if (typeof showToast === "function") showToast(msg);
    }

    async function confirmAndClearStudentTestEntry(student, classObj, sem, testIndex, config) {
      if (!student || !classObj || !sem || testIndex == null) return false;
      if (!config) config = getTestConfig(classObj, sem, testIndex);
      const name = _formatStudentDisplayName(student);
      const ok = await showConfirm(tFmt("gsConfirmClearStudentEntry", { name }));
      if (!ok) return false;

      const studentModalOpen = !!(
        typeof _studentModalDraft === "object" &&
        _studentModalDraft &&
        _studentModalDraft.student &&
        _studentModalDraft.student.id === student.id &&
        _studentModalDraft.sem === sem &&
        _studentModalDraft.testIndex === testIndex
      );

      clearStudentTestEntry(student, classObj, sem, testIndex, config);

      if (studentModalOpen && typeof closeStudentModal === "function") {
        closeStudentModal();
      }

      if (typeof showToast === "function") {
        showToast(tFmt("gsToastStudentCleared", { name }));
      }
      return true;
    }
