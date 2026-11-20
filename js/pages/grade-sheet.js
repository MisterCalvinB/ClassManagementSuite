    function wireEvents() {
      document.getElementById("btn-add-class").addEventListener("click", openAddClassModal);
      document.getElementById("add-class-confirm").addEventListener("click", addClassFromInput);
      document.getElementById("add-class-cancel").addEventListener("click", closeAddClassModal);
      document.getElementById("add-class-overlay").addEventListener("click", e => { if (e.target === document.getElementById("add-class-overlay")) closeAddClassModal(); });
      document.getElementById("add-class-name").addEventListener("keydown", e => { if (e.key === "Enter") addClassFromInput(); if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); closeAddClassModal(); } });
      document.getElementById("add-class-year").addEventListener("keydown", e => { if (e.key === "Enter") addClassFromInput(); if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); closeAddClassModal(); } });

      document.getElementById("btn-add-test-overview").addEventListener("click", openAddTestFromOverviewModal);
      document.getElementById("add-test-overview-confirm").addEventListener("click", () => {
        const sel = document.getElementById("add-test-overview-class-select");
        const classId = sel.value;
        const classObj = appState.classes.find(c => c.id === classId);
        closeAddTestFromOverviewModal();
        if (classObj) addTestForClass(classObj);
      });
      document.getElementById("add-test-overview-cancel").addEventListener("click", closeAddTestFromOverviewModal);
      document.getElementById("add-test-overview-overlay").addEventListener("click", e => { if (e.target === document.getElementById("add-test-overview-overlay")) closeAddTestFromOverviewModal(); });

      document.getElementById("btn-back-classes").addEventListener("click", () => {
        appState.activeClassId = null;
        appState.activeTest = null;
        showScreen("classes");
        renderClasses();
      });

      document.getElementById("btn-back-summary").addEventListener("click", () => {
        appState.activeTest = null;
        showScreen("summary");
        renderSummary();
      });

      document.getElementById("btn-export-semester-csv").addEventListener("click", openCsvExportPopup);
      document.getElementById("csv-export-cancel").addEventListener("click", closeCsvExportPopup);
      document.getElementById("csv-export-confirm").addEventListener("click", exportSemesterGradesCsv);
      document.getElementById("csv-export-scope").addEventListener("change", refreshCsvExportPopupState);
      document.getElementById("csv-export-semester").addEventListener("change", refreshCsvExportPopupState);
      document.getElementById("csv-export-popup-overlay").addEventListener("click", evt => {
        if (evt.target === document.getElementById("csv-export-popup-overlay")) closeCsvExportPopup();
      });

      document.getElementById("btn-add-student").addEventListener("click", () => {
        const classObj = getActiveClass();
        if (classObj) openGsAddStudentsModal(classObj);
      });
      const gsNameDisplaySel = document.getElementById("gs-name-display-select");
      if (gsNameDisplaySel) {
        gsNameDisplaySel.value = getGsNameDisplayMode();
        gsNameDisplaySel.addEventListener("change", () => {
          setGsNameDisplayMode(gsNameDisplaySel.value);
        });
      }
      document.getElementById("btn-add-test").addEventListener("click", addTest);
      document.getElementById("btn-import-test").addEventListener("click", openDuplicateTestPopup);
      document.getElementById("btn-delete-class").addEventListener("click", deleteActiveClass);
      document.getElementById("btn-edit-class").addEventListener("click", openEditClassPopup);
      const btnClassTemplates = document.getElementById("btn-class-templates");
      if (btnClassTemplates) {
        btnClassTemplates.addEventListener("click", () => openClassTemplatesModal());
      }
      document.querySelectorAll(".btn-edit-reference-data, #btn-edit-reference-data").forEach(btn => {
        btn.addEventListener("click", () => {
          const tab = (btn.id === 'btn-summary-settings' || appState.activeScreen === 'summary') ? 'summary-settings' : null;
          openReferenceDataEditor(tab);
        });
      });
      const btnManageSummary = document.getElementById("btn-manage-summary-settings");
      if (btnManageSummary) {
        btnManageSummary.addEventListener("click", () => openReferenceDataEditor('summary-settings'));
      }
      document.getElementById("edit-class-save").addEventListener("click", saveEditClass);
      document.getElementById("edit-class-cancel").addEventListener("click", () => document.getElementById("edit-class-overlay").classList.add("hidden"));
      document.getElementById("edit-class-overlay").addEventListener("click", e => { if (e.target === document.getElementById("edit-class-overlay")) document.getElementById("edit-class-overlay").classList.add("hidden"); });
      document.getElementById("edit-class-name").addEventListener("keydown", e => { if (e.key === "Enter") saveEditClass(); if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); document.getElementById("edit-class-overlay").classList.add("hidden"); } });
      document.getElementById("btn-duplicate-test").addEventListener("click", openDuplicateTestPopup);
      const btnPartLink = document.getElementById("btn-participation-link");
      if (btnPartLink) btnPartLink.addEventListener("click", () => openParticipationLinkModal());
      document.getElementById("btn-test-options").addEventListener("click", () => {
        const classObj = getActiveClass();
        if (!classObj || !appState.activeTest) return;
        const { semester: sem, testIndex } = appState.activeTest;
        openTestOptionsModal(getTestConfig(classObj, sem, testIndex), classObj, sem, testIndex);
      });
      document.getElementById("btn-delete-test").addEventListener("click", deleteActiveTest);
      document.getElementById("btn-reset-test").addEventListener("click", clearActiveTest);
      document.getElementById("btn-criteria-ref").addEventListener("click", openCriteriaRef);
      document.getElementById("btn-export-criteria-pdf").addEventListener("click", exportCriteriaRefPdf);
      document.getElementById("btn-export-criteria-md").addEventListener("click", exportCriteriaRefMd);
      document.getElementById("btn-export-criteria-html").addEventListener("click", exportCriteriaRefHtml);
      document.getElementById("btn-print-results").addEventListener("click", printTestResults);
      document.getElementById("btn-export-test-docx").addEventListener("click", exportActiveTestDocx);
      document.getElementById("btn-export-test-html").addEventListener("click", exportActiveTestHtml);

      // Test & Summary export dropdown toggles with hover grace delay
      const setupExportDropdown = (triggerId, menuId, dropdownId) => {
        const trigger = document.getElementById(triggerId);
        const menu = document.getElementById(menuId);
        const dropdown = document.getElementById(dropdownId);
        if (!trigger || !menu || !dropdown) return;

        let closeTimer = null;
        const openMenu = () => {
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
          menu.classList.remove("hidden");
        };
        const closeMenuWithDelay = () => {
          if (closeTimer) clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            menu.classList.add("hidden");
          }, 300);
        };
        const closeMenuImmediate = () => {
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
          menu.classList.add("hidden");
        };

        dropdown.addEventListener("mouseenter", openMenu);
        dropdown.addEventListener("mouseleave", closeMenuWithDelay);

        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          if (menu.classList.contains("hidden")) {
            openMenu();
          } else {
            closeMenuImmediate();
          }
        });

        menu.querySelectorAll(".dropdown-item").forEach(item => {
          item.addEventListener("click", () => {
            closeMenuImmediate();
          });
        });

        document.addEventListener("click", (e) => {
          if (!e.target.closest(`#${dropdownId}`)) {
            closeMenuImmediate();
          }
        });
      };
      setupExportDropdown("btn-overview-backup-trigger", "overview-backup-menu", "overview-backup-dropdown");
      setupExportDropdown("btn-summary-export-trigger", "summary-export-menu", "summary-export-dropdown");
      setupExportDropdown("btn-summary-manage-trigger", "summary-manage-menu", "summary-manage-class-dropdown");
      setupExportDropdown("btn-test-export-trigger", "test-export-menu", "test-export-dropdown");
      setupExportDropdown("btn-test-actions-trigger", "test-actions-menu", "test-actions-dropdown");
      setupExportDropdown("btn-cmp-export-trigger", "cmp-export-menu", "cmp-export-dropdown");

      // ── Compare Classes Controls & Exports ──
      document.getElementById("btn-compare-classes")?.addEventListener("click", () => {
        if (typeof openCompareClassesScreen === 'function') openCompareClassesScreen();
        else if (window.openCompareClassesScreen) window.openCompareClassesScreen();
      });
      document.getElementById("gs-tab-compare")?.addEventListener("click", () => {
        if (typeof openCompareClassesScreen === 'function') openCompareClassesScreen();
        else if (window.openCompareClassesScreen) window.openCompareClassesScreen();
      });
      document.getElementById("btn-cmp-back")?.addEventListener("click", () => {
        showScreen("classes");
      });

      document.getElementById("cmp-top-chips-header")?.addEventListener("click", () => {
        if (typeof toggleCompareTopChips === 'function') toggleCompareTopChips();
      });
      document.getElementById("cmp-top-chips-header")?.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (typeof toggleCompareTopChips === 'function') toggleCompareTopChips();
        }
      });

      document.getElementById("btn-cmp-export-pdf")?.addEventListener("click", () => {
        if (typeof exportComparePdf === 'function') exportComparePdf();
      });
      document.getElementById("btn-cmp-export-xlsx")?.addEventListener("click", () => {
        if (typeof exportCompareXlsx === 'function') exportCompareXlsx();
      });
      document.getElementById("btn-cmp-export-ods")?.addEventListener("click", () => {
        if (typeof exportCompareOds === 'function') exportCompareOds();
      });
      document.getElementById("btn-cmp-export-html")?.addEventListener("click", () => {
        if (typeof exportCompareHtml === 'function') exportCompareHtml();
      });

      document.getElementById("btn-cmp-select-all")?.addEventListener("click", () => {
        if (typeof getCompareFilteredClasses === 'function') {
          _cmpState.selectedClassIds = getCompareFilteredClasses().map(c => c.id);
          renderCompareClasses();
        }
      });
      document.getElementById("btn-cmp-clear-all")?.addEventListener("click", () => {
        _cmpState.selectedClassIds = [];
        renderCompareClasses();
      });
      document.getElementById("cmp-level-filter")?.addEventListener("change", e => {
        _cmpState.levelFilter = e.target.value;
        renderCompareClasses();
      });
      document.getElementById("cmp-year-filter")?.addEventListener("change", e => {
        _cmpState.yearFilter = e.target.value;
        renderCompareClasses();
      });
      document.querySelectorAll("#cmp-scope-nav .cmp-scope-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          _cmpState.scope = btn.dataset.scope;
          renderCompareClasses();
        });
      });
      document.getElementById("cmp-test-select")?.addEventListener("change", e => {
        _cmpState.testIndex = e.target.value === 'timeline' ? 'timeline' : Number(e.target.value);
        renderCompareClasses();
      });
      document.getElementById("cmp-test-match-mode")?.addEventListener("change", e => {
        _cmpState.testMatchMode = e.target.value;
        renderCompareClasses();
      });

      // ── Summary Report Menu Buttons ──
      document.getElementById("btn-report-class-year").addEventListener("click", () => {
        openClassYearReport(getActiveClass());
      });
      document.getElementById("btn-report-class-sem1").addEventListener("click", () => {
        openClassSemesterReport(getActiveClass(), "sem1");
      });
      document.getElementById("btn-report-class-sem2").addEventListener("click", () => {
        openClassSemesterReport(getActiveClass(), "sem2");
      });
      document.getElementById("btn-report-select-student").addEventListener("click", () => {
        openStudentSelectModal(getActiveClass(), "year");
      });

      // ── Test Report Menu Buttons ──
      document.getElementById("btn-report-test-class").addEventListener("click", () => {
        const classObj = getActiveClass();
        if (!classObj || !appState.activeTest) return;
        openClassTestReport(classObj, appState.activeTest.semester, appState.activeTest.testIndex);
      });
      document.getElementById("btn-report-test-student").addEventListener("click", () => {
        const classObj = getActiveClass();
        if (!classObj || !appState.activeTest) return;
        openStudentSelectModal(classObj, "test", appState.activeTest.semester, appState.activeTest.testIndex);
      });

      // ── Report Modal Buttons ──
      document.getElementById("gs-report-btn-print").addEventListener("click", printCurrentReport);
      document.getElementById("gs-report-btn-pdf").addEventListener("click", exportCurrentReportPdf);
      document.getElementById("gs-report-btn-html").addEventListener("click", exportCurrentReportHtml);
      document.getElementById("gs-report-btn-docx").addEventListener("click", exportCurrentReportDocx);
      document.getElementById("gs-report-modal-close").addEventListener("click", closeReportModal);
      document.getElementById("gs-report-modal-overlay").addEventListener("click", e => {
        if (e.target === document.getElementById("gs-report-modal-overlay")) closeReportModal();
      });

      // ── Report Options Dropdown & Toggles ──
      const btnReportOptions = document.getElementById("gs-report-btn-options");
      if (btnReportOptions) {
        btnReportOptions.addEventListener("click", e => {
          e.stopPropagation();
          toggleReportOptionsMenu();
        });
      }
      const btnReportOptionsClose = document.getElementById("gs-report-options-menu-close");
      if (btnReportOptionsClose) {
        btnReportOptionsClose.addEventListener("click", e => {
          e.stopPropagation();
          closeReportOptionsMenu();
        });
      }


      const bindReportToggle = (id, setter) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("change", () => {
            setter(el.checked);
            refreshActiveReportPreview();
          });
        }
      };

      bindReportToggle("gs-report-toggle-competences", setReportIncludeCompetences);
      bindReportToggle("gs-report-toggle-exercise-means", setReportIncludeExerciseMeans);
      bindReportToggle("gs-report-toggle-kpi", setReportIncludeKpi);
      bindReportToggle("gs-report-toggle-charts", setReportIncludeCharts);
      bindReportToggle("gs-report-toggle-criteria", setReportIncludeCriteria);
      bindReportToggle("gs-report-toggle-comments", setReportIncludeComments);
      bindReportToggle("gs-report-toggle-observations", setReportIncludeObservations);
      bindReportToggle("gs-report-toggle-observation-chips", setReportIncludeObservationChips);
      bindReportToggle("gs-report-toggle-scale", setReportIncludeScale);
      bindReportToggle("gs-report-toggle-fit-page", setReportFitToOnePage);

      // ── Student Selector Modal ──
      document.getElementById("gs-student-select-cancel").addEventListener("click", closeStudentSelectModal);
      document.getElementById("gs-student-select-confirm").addEventListener("click", confirmStudentSelectReport);
      document.getElementById("gs-student-select-overlay").addEventListener("click", e => {
        if (e.target === document.getElementById("gs-student-select-overlay")) closeStudentSelectModal();
      });

      // Student modal buttons
      document.getElementById("student-modal-save").addEventListener("click", commitStudentModal);
      document.getElementById("student-modal-cancel").addEventListener("click", closeStudentModal);
      document.getElementById("student-modal-close").addEventListener("click", closeStudentModal);
      document.getElementById("student-modal-overlay").addEventListener("click", e => {
        if (e.target === document.getElementById("student-modal-overlay")) closeStudentModal();
      });

      // ── test-row-menu ────────────────────────────────────────────
      document.getElementById("test-row-menu-open").addEventListener("click", () => {
        const ctx = _testRowMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openStudentModal(ctx.student, ctx.classObj, ctx.sem, ctx.testIndex,
          document.querySelector(`#test-table tbody tr[data-student-id="${ctx.student.id}"]`), ctx.config);
      });
      document.getElementById("test-row-menu-absent")?.addEventListener("click", () => {
        const ctx = _testRowMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.student || !ctx.classObj) return;
        toggleStudentAbsentForTest(ctx.student.id, ctx.classObj, ctx.sem, ctx.testIndex, ctx.config);
      });
      document.getElementById("test-row-menu-report-student").addEventListener("click", () => {
        const ctx = _testRowMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openStudentTestReport(ctx.classObj, ctx.student, ctx.sem, ctx.testIndex);
      });
      document.getElementById("test-row-menu-reset").addEventListener("click", async () => {
        const ctx = _testRowMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        await resetStudentTestPoints(ctx.student, ctx.classObj, ctx.sem, ctx.testIndex, ctx.config);
      });
      document.getElementById("test-row-menu-dossier")?.addEventListener("click", () => {
        const ctx = _testRowMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        gsOpenStudentDossierModal(ctx.student, ctx.classObj);
      });
      document.getElementById("test-row-menu-attach-work")?.addEventListener("click", () => {
        const ctx = _testRowMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        gsOpenStudentWorkModal(ctx.student, ctx.classObj, ctx.sem, ctx.testIndex);
      });

      // ── class-card-menu ──────────────────────────────────────────
      document.getElementById("class-card-menu-open").addEventListener("click", () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        appState.activeClassId = ctx.classObj.id;
        renderSummary();
        showScreen("summary");
      });
      document.getElementById("class-card-menu-links")?.addEventListener("click", () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        if (typeof TagLinkModal !== 'undefined') {
          TagLinkModal.open({
            urn: 'cmt:class:' + ctx.classObj.id,
            title: ctx.classObj.name,
            label: ctx.classObj.name,
            subtitle: 'Class Group • ' + ((ctx.classObj.students && ctx.classObj.students.length) || 0) + ' students' + (ctx.classObj.year ? ' • ' + ctx.classObj.year : ''),
            type: 'class',
            classId: ctx.classObj.id
          });
        }
      });
      document.getElementById("class-card-menu-rename").addEventListener("click", async () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        const newName = await showPrompt(t('gsPromptRenameClass'), ctx.classObj.name);
        if (newName && newName.trim() && newName.trim() !== ctx.classObj.name) {
          ctx.classObj.name = newName.trim();
          saveState();
          renderClasses();
        }
      });
      document.getElementById("class-card-menu-report-year").addEventListener("click", () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openClassYearReport(ctx.classObj);
      });
      document.getElementById("class-card-menu-report-sem1").addEventListener("click", () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openClassSemesterReport(ctx.classObj, "sem1");
      });
      document.getElementById("class-card-menu-report-sem2").addEventListener("click", () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openClassSemesterReport(ctx.classObj, "sem2");
      });
      document.getElementById("class-card-menu-delete").addEventListener("click", async () => {
        const ctx = _classCardMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        appState.activeClassId = ctx.classObj.id;
        await deleteActiveClass();
      });

      // ── test-header-menu ─────────────────────────────────────────
      document.getElementById("test-header-menu-open").addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        renderTestSheet();
        showScreen("test");
      });
      document.getElementById("test-header-menu-links")?.addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        const cfg = getTestConfig(ctx.classObj, ctx.sem, ctx.testIndex);
        const testName = cfg.testName || ('T' + (ctx.testIndex + 1));
        if (typeof TagLinkModal !== 'undefined') {
          TagLinkModal.open({
            urn: 'cmt:eval:' + ctx.classObj.id + ':' + ctx.sem + ':' + ctx.testIndex,
            title: testName + ' (' + ctx.classObj.name + ')',
            label: testName + ' (' + ctx.classObj.name + ')',
            subtitle: (ctx.sem === 'sem1' ? 'Semester 1' : 'Semester 2') + (cfg.testDate ? ' • ' + cfg.testDate : ''),
            type: 'evaluation',
            classId: ctx.classObj.id,
            evalId: `${ctx.sem}_test_${ctx.testIndex}`
          });
        }
      });
      document.getElementById("test-header-menu-settings").addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        renderTestSheet();
        showScreen("test");
        openTestOptionsModal(getTestConfig(ctx.classObj, ctx.sem, ctx.testIndex), ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("test-header-menu-toggle-completed")?.addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        toggleTestMarkingCompleted(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("test-header-menu-report-test").addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openClassTestReport(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("test-header-menu-batch-reports").addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        renderTestSheet();
        printTestResults();
      });
      document.getElementById("test-header-menu-print-test").addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        renderTestSheet();
        printTestResults();
      });
      document.getElementById("test-header-menu-print-sem").addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        printSemesterGrades(ctx.classObj, ctx.sem);
      });
      document.getElementById("test-header-menu-delete")?.addEventListener("click", () => {
        const ctx = _testHeaderMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        deleteTest(ctx.classObj, ctx.sem, ctx.testIndex);
      });

      // ── all-test-item-menu ────────────────────────────────────────
      document.getElementById("all-test-menu-open")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        appState.activeClassId = ctx.classObj.id;
        ensureClassStructures(ctx.classObj);
        renderSummary();
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        renderTestSheet();
        showScreen("test");
      });
      document.getElementById("all-test-menu-rename")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        renameTest(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-settings")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        openTestOptionsModal(getTestConfig(ctx.classObj, ctx.sem, ctx.testIndex), ctx.classObj, ctx.sem, ctx.testIndex, "info");
      });
      document.getElementById("all-test-menu-toggle-completed")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        toggleTestMarkingCompleted(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-duplicate")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        openDuplicateTestPopup({
          srcClassId: ctx.classObj.id,
          srcSem: ctx.sem,
          srcTestIndex: ctx.testIndex,
          destClassId: ctx.classObj.id,
          destSem: ctx.sem,
          destTestIndex: ctx.testIndex
        });
      });
      document.getElementById("all-test-menu-links")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        appState.activeClassId = ctx.classObj.id;
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        gsOpenTestLinksModal();
      });
      document.getElementById("all-test-menu-reveal")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        revealTestInFolder(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-report-test")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        openClassTestReport(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-report-student")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        appState.activeClassId = ctx.classObj.id;
        appState.activeTest = { semester: ctx.sem, testIndex: ctx.testIndex };
        openStudentSelectModal(ctx.classObj, "test", ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-export-html")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        exportTestHtml(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-export-docx")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        exportTestDocx(ctx.classObj, ctx.sem, ctx.testIndex);
      });
      document.getElementById("all-test-menu-delete")?.addEventListener("click", () => {
        const ctx = _allTestItemMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.classObj) return;
        deleteTest(ctx.classObj, ctx.sem, ctx.testIndex);
      });

      // ── summary-student-row-menu ──────────────────────────────────
      document.getElementById("summary-student-menu-dossier")?.addEventListener("click", () => {
        const ctx = _summaryStudentMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.student) return;
        gsOpenStudentDossierModal(ctx.student, ctx.classObj);
      });
      document.getElementById("summary-student-menu-work")?.addEventListener("click", () => {
        const ctx = _summaryStudentMenuCtx;
        closeAllContextMenus();
        if (!ctx || !ctx.student || typeof TagLinkModal === 'undefined') return;
        var studentId = typeof ctx.student === 'string' ? ctx.student : (ctx.student.id || ctx.student.uuid);
        var studentName = typeof ctx.student === 'object' ? (((ctx.student.firstName || '') + ' ' + (ctx.student.lastName || '')).trim() || ctx.student.name || ('Student #' + ctx.student.index)) : studentId;
        TagLinkModal.open({
          urn: 'cmt:student:' + studentId,
          title: studentName + (ctx.classObj ? ' (' + ctx.classObj.name + ')' : ''),
          label: studentName,
          subtitle: (typeof t === 'function' && t('gsMenuStudentWork') ? t('gsMenuStudentWork') : 'Student Work & Attachments') + (ctx.classObj ? ' • ' + ctx.classObj.name : ''),
          type: 'student',
          classId: ctx.classObj ? ctx.classObj.id : null,
          studentId: studentId
        });
      });
      document.getElementById("summary-student-menu-report-year").addEventListener("click", () => {
        const ctx = _summaryStudentMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openStudentYearReport(ctx.classObj, ctx.student);
      });
      document.getElementById("summary-student-menu-report-sem1").addEventListener("click", () => {
        const ctx = _summaryStudentMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openStudentSemesterReport(ctx.classObj, ctx.student, "sem1");
      });
      document.getElementById("summary-student-menu-report-sem2").addEventListener("click", () => {
        const ctx = _summaryStudentMenuCtx;
        closeAllContextMenus();
        if (!ctx) return;
        openStudentSemesterReport(ctx.classObj, ctx.student, "sem2");
      });

      // ── gs-rename-modal ──────────────────────────────────────────
      document.getElementById('gs-rename-review-btn').addEventListener('click', openRenameModal);
      document.getElementById('gs-rename-apply').addEventListener('click', applyRenames);
      document.getElementById('gs-rename-cancel').addEventListener('click', () => {
        document.getElementById('gs-rename-overlay').classList.add('hidden');
      });
      document.getElementById('gs-rename-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('gs-rename-overlay'))
          document.getElementById('gs-rename-overlay').classList.add('hidden');
      });

      // ── close menus on outside click / scroll / resize / Escape ──
      document.addEventListener("click", e => {
        const remPop = document.getElementById("gs-remaining-students-popover");
        if (remPop && !remPop.classList.contains("hidden")) {
          if (!remPop.contains(e.target) && !e.target.closest("#smod-btn-view-remaining") && !e.target.closest("#chip-scoring-progress")) {
            remPop.classList.add("hidden");
          }
        }

        const menus = ["test-row-menu", "class-card-menu", "test-header-menu", "summary-student-row-menu", "all-test-item-menu"]
          .map(id => document.getElementById(id)).filter(Boolean);
        const anyVisible = menus.some(m => !m.classList.contains("hidden"));
        if (!anyVisible) return;
        if (menus.some(m => m.contains(e.target))) return;
        closeAllContextMenus();
      });
      document.addEventListener("scroll", closeAllContextMenus, true);
      window.addEventListener("resize", closeAllContextMenus);
      document.addEventListener("keydown", e => {
        if (e.key !== "Escape" || e.defaultPrevented) return;

        // 0. Remaining students popover
        const remPop = document.getElementById("gs-remaining-students-popover");
        if (remPop && !remPop.classList.contains("hidden")) {
          e.preventDefault();
          remPop.classList.add("hidden");
          return;
        }

        // 1. Color picker
        const refPop = document.getElementById("ref-color-picker-popover");
        if (refPop && !refPop.classList.contains("hidden")) {
          e.preventDefault();
          closeRefColorPicker();
          return;
        }

        // 2. Context menus
        const menus = ["test-row-menu", "class-card-menu", "test-header-menu", "summary-student-row-menu", "all-test-item-menu"]
          .map(id => document.getElementById(id)).filter(Boolean);
        if (menus.some(m => !m.classList.contains("hidden"))) {
          e.preventDefault();
          closeAllContextMenus();
          return;
        }

        // 3. Child/topmost observation chip popups
        const chipComment = document.getElementById("gs-chip-comment-modal-overlay");
        if (chipComment && !chipComment.classList.contains("hidden") && chipComment.style.display !== "none") {
          e.preventDefault();
          chipComment.style.display = "none";
          chipComment.classList.add("hidden");
          return;
        }

        const quickChip = document.getElementById("gs-quick-add-chip-overlay");
        if (quickChip && !quickChip.classList.contains("hidden") && quickChip.style.display !== "none") {
          e.preventDefault();
          quickChip.style.display = "none";
          quickChip.classList.add("hidden");
          return;
        }

        const addChip = document.getElementById("gs-add-chip-overlay");
        if (addChip && !addChip.classList.contains("hidden") && addChip.style.display !== "none") {
          e.preventDefault();
          addChip.classList.add("hidden");
          return;
        }

        if (typeof _activeCriterionPopover !== "undefined" && _activeCriterionPopover) {
          e.preventDefault();
          closeCriterionDecisionsPopover();
          return;
        }

        if (typeof _critPopupCtx !== "undefined" && _critPopupCtx) {
          e.preventDefault();
          criterionPopupClose();
          return;
        }

        const pdfExp = document.getElementById("pdf-export-overlay");
        if (pdfExp && !pdfExp.classList.contains("hidden")) {
          e.preventDefault();
          pdfExp.classList.add("hidden");
          return;
        }

        // 4. In-page alert/confirm/prompt
        const alertEl = document.getElementById("gs-alert-overlay");
        if (alertEl && !alertEl.classList.contains("hidden")) {
          e.preventDefault();
          alertEl.classList.add("hidden");
          return;
        }
        const confirmEl = document.getElementById("gs-confirm-overlay");
        if (confirmEl && !confirmEl.classList.contains("hidden")) {
          e.preventDefault();
          confirmEl.classList.add("hidden");
          return;
        }
        const promptEl = document.getElementById("gs-prompt-overlay");
        if (promptEl && !promptEl.classList.contains("hidden")) {
          e.preventDefault();
          promptEl.classList.add("hidden");
          return;
        }

        // 5. Main overlay IDs (close only the topmost open one)
        const overlayIds = [
          "gs-pdf-export-overlay",
          "gs-tc-import-overlay",
          "gs-competence-picker-overlay",
          "class-criteria-templates-overlay",
          "gs-student-select-overlay",
          "gs-report-modal-overlay",
          "student-modal-overlay",
          "test-options-overlay",
          "coeff-popup-overlay",
          "grading-popup-overlay",
          "criteria-mgmt-popup-overlay",
          "reference-data-popup-overlay",
          "test-info-popup-overlay",
          "csv-export-popup-overlay",
          "criterion-popup-overlay",
          "import-grades-overlay",
          "add-class-overlay",
          "edit-class-overlay",
          "gs-rename-overlay",
          "gs-add-students-overlay"
        ];
        for (const id of overlayIds) {
          const el = document.getElementById(id);
          if (el && !el.classList.contains("hidden")) {
            e.preventDefault();
            if (id === "gs-pdf-export-overlay") {
              closeGsPdfExportModal(null);
            } else if (id === "gs-report-modal-overlay") {
              closeReportModal();
            } else if (id === "gs-student-select-overlay") {
              closeStudentSelectModal();
            } else if (id === "student-modal-overlay") {
              closeStudentModal();
            } else {
              el.classList.add("hidden");
            }
            break;
          }
        }
      });

      document.getElementById("btn-import-grades").addEventListener("click", () => {
        document.getElementById("import-grades-file").click();
      });
      document.getElementById("import-grades-file").addEventListener("change", evt => {
        const file = evt.target.files && evt.target.files[0];
        if (file) importGradesFromJson(file);
        evt.target.value = "";
      });

      document.getElementById("btn-print-semester").addEventListener("click", async () => {
        const classObj = getActiveClass();
        if (!classObj) return;
        const sem = await pickSemesterForReport();
        if (!sem) return;
        printSemesterGrades(classObj, sem);
      });

      document.getElementById("btn-export-semester-docx").addEventListener("click", async () => {
        const classObj = getActiveClass();
        if (!classObj) return;
        const sem = await pickSemesterForReport();
        if (!sem) return;
        exportSemesterDocx(classObj, sem);
      });

      document.getElementById("btn-export-semester-html").addEventListener("click", async () => {
        const classObj = getActiveClass();
        if (!classObj) return;
        const sem = await pickSemesterForReport();
        if (!sem) return;
        exportSemesterHtml(classObj, sem);
      });

      document.getElementById("btn-export-semester-xlsx").addEventListener("click", async () => {
        const classObj = getActiveClass();
        if (!classObj) return;
        const sem = await pickSemesterForReport();
        if (!sem) return;
        exportSemesterGradesXlsx(classObj, sem);
      });

      document.getElementById("btn-export-semester-ods")?.addEventListener("click", async () => {
        const classObj = getActiveClass();
        if (!classObj) return;
        const sem = await pickSemesterForReport();
        if (!sem) return;
        exportSemesterGradesOds(classObj, sem);
      });

      document.getElementById("btn-export").addEventListener("click", exportJson);
      document.getElementById("btn-import").addEventListener("click", () => {
        document.getElementById("import-file").click();
      });
      document.getElementById("import-file").addEventListener("change", evt => {
        const file = evt.target.files && evt.target.files[0];
        if (file) importJson(file);
        evt.target.value = "";
      });
    }


    document.getElementById("criterion-popup-overlay").addEventListener("click", evt => {
      if (evt.target === document.getElementById("criterion-popup-overlay")) criterionPopupClose();
    });

    document.getElementById("crit-popup-cancel").addEventListener("click", criterionPopupClose);

    document.getElementById("crit-popup-link-competence-btn").addEventListener("click", () => {
      openCompetencePicker(_critPopupCompetenceDraft, (newIds) => {
        _critPopupCompetenceDraft = newIds;
        renderCritPopupChips();
      });
    });

    document.getElementById("crit-popup-save").addEventListener("click", () => {
      if (!_critPopupCtx) return;
      const { criterion, classObj, sem, testIndex } = _critPopupCtx;
      const config = classObj?.testConfigs?.[sem]?.[testIndex];
      const name = document.getElementById("crit-popup-name").value.trim();
      const minPts = parseFloat(document.getElementById("crit-popup-min").value) || 0;
      const maxPts = Math.max(minPts, parseFloat(document.getElementById("crit-popup-max").value) || 0);
      const coeff = Math.max(0, parseFloat(document.getElementById("crit-popup-coeff").value) || 0);
      const showComment = document.getElementById("crit-popup-comment-yes").checked;
      const isBonus = document.getElementById("crit-popup-bonus").checked;
      const scoringChanged = (
        (criterion.minPoints != null ? criterion.minPoints : 0) !== minPts ||
        criterion.maxPoints !== maxPts ||
        criterion.pointCoefficient !== coeff ||
        !!criterion.isBonus !== !!isBonus
      );
      if (name) criterion.name = name;
      criterion.minPoints = minPts;
      criterion.maxPoints = maxPts;
      criterion.pointCoefficient = coeff;
      criterion.isBonus = !!isBonus;
      criterion.showComment = showComment;
      criterion.competenceIds = [..._critPopupCompetenceDraft];
      if (scoringChanged) {
        if (config) syncGradingPointsForCriteriaChange(config);
        recalcAllStudentGradesForTest(classObj, sem, testIndex);
      }
      saveState();
      renderTestSheet();
      renderSummary();
      if (_toptRebuildCriteriaList) _toptRebuildCriteriaList();
      if (_toptUpdateLiveGradePreview) _toptUpdateLiveGradePreview();
      criterionPopupClose();
      showCriterionSavedToast();
    });

    document.getElementById("crit-popup-del").addEventListener("click", () => {
      if (!_critPopupCtx) return;
      const { criterion, classObj, sem, testIndex } = _critPopupCtx;
      const config = classObj.testConfigs[sem][testIndex];
      const idx = config.criteria.findIndex(c => c.id === criterion.id);
      if (idx !== -1) {
        config.criteria.splice(idx, 1);
        classObj.students.forEach(st => {
          const map = (st.criteriaResults?.[sem]?.[testIndex] && typeof st.criteriaResults[sem][testIndex] === "object")
            ? st.criteriaResults[sem][testIndex] : {};
          delete map[criterion.id];
          if (st.criteriaResults?.[sem]) st.criteriaResults[sem][testIndex] = map;
        });
      }
      syncGradingPointsForCriteriaChange(config);
      recalcAllStudentGradesForTest(classObj, sem, testIndex);
      saveState();
      renderTestSheet();
      renderSummary();
      if (_toptRebuildCriteriaList) _toptRebuildCriteriaList();
      criterionPopupClose();
    });

    document.addEventListener("keydown", evt => {
      if (evt.key === "Escape" && _critPopupCtx) {
        evt.preventDefault();
        evt.stopPropagation();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
        criterionPopupClose();
      }
    }, true);

    // Populate criterion popup preset dropdown
    (function wirePopupPreset() {
      const sel = document.getElementById("crit-popup-preset");
      refreshCriteriaPresetDropdown();
      sel.addEventListener("change", () => {
        if (sel.value) {
          document.getElementById("crit-popup-name").value = sel.value;
          const testConfig = _critPopupCtx?.classObj?.testConfigs?.[_critPopupCtx.sem]?.[_critPopupCtx.testIndex];
          const activeBank = getTestCriteriaBank(_critPopupCtx?.classObj, testConfig);
          const presetList = (activeBank && Array.isArray(activeBank.criteria)) ? activeBank.criteria : ((typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : []);
          const entry = presetList.find(c => c && c.name === sel.value);
          if (entry && Array.isArray(entry.competenceIds) && entry.competenceIds.length > 0) {
            _critPopupCompetenceDraft = [...entry.competenceIds];
            renderCritPopupChips();
          }
          sel.value = "";
        }
      });
    })();

    document.getElementById("reference-data-popup-overlay").addEventListener("click", evt => {
      if (evt.target === document.getElementById("reference-data-popup-overlay")) {
        document.getElementById("reference-data-popup-overlay").classList.add("hidden");
        _referenceDataEditorDraft = null;
      }
    });

    document.getElementById("reference-data-cancel").addEventListener("click", () => {
      document.getElementById("reference-data-popup-overlay").classList.add("hidden");
      _referenceDataEditorDraft = null;
    });

    document.getElementById("reference-data-save").addEventListener("click", () => {
      saveReferenceDataEditor().catch(err => {
        console.error("Saving reference data failed", err);
        showAlert(t('gsAlertRefSaveFailed'));
      });
    });

    document.getElementById("ref-criteria-add").addEventListener("click", () => {
      if (!_referenceDataEditorDraft) return;
      const newIdx = _referenceDataEditorDraft.criteria.length;
      _referenceDataEditorDraft.criteria.push(makeBlankCriterion(newIdx));
      renderReferenceDataEditor({ expandCriterionIndex: newIdx });
    });

    document.getElementById("ref-scale-add").addEventListener("click", () => {
      if (!_referenceDataEditorDraft) return;
      const newIdx = _referenceDataEditorDraft.scaleModels.length;
      _referenceDataEditorDraft.scaleModels.push(makeBlankScaleModel(newIdx));
      renderReferenceDataEditor({ expandScaleIndex: newIdx });
    });

    document.getElementById("ref-chips-add").addEventListener("click", () => {
      if (!_referenceDataEditorDraft) return;
      const newIdx = _referenceDataEditorDraft.personalisedChips.length;
      _referenceDataEditorDraft.personalisedChips.push(makeBlankPersonalisedChipsGroup(newIdx));
      renderReferenceDataEditor({ expandChipsIndex: newIdx });
    });


    // ── Boot ─────────────────────────────────────────────────────
    async function boot() {
      initHamburger();
      if (window.applyTranslations) applyTranslations();
      await initializeReferenceData();
      await loadReportOptionsConfigFile();
      if (window.Desktop && Desktop.isElectron() && !localStorage.getItem(DELETED_CLASS_IDS_KEY)) {
        try {
          const r = await Desktop.readJson('gradeSheet', 'deleted-class-ids-backup.json');
          if (r && r.ok && Array.isArray(r.data) && r.data.length)
            localStorage.setItem(DELETED_CLASS_IDS_KEY, JSON.stringify(r.data));
        } catch (e) {}
      }
      await loadState();
      if (syncFromClassGroups()) saveState();
      await syncTestsFromPlanner();
      await syncLinkedParticipationGrades({ silent: true });
      await loadAvailableCriteriaBanks();
      await loadAvailableScaleBanks();
      await loadAvailableChipBanks();
      await loadLessonCompetences();
      wireEvents();
      renderClasses();
      showScreen("classes");

      function navigateToTarget(params) {
        if (!params || typeof params !== 'object' || !Array.isArray(appState.classes) || !appState.classes.length) return false;

        const targetClassParam = params.class || params.classId || params.group || params.groupId || params.classSlug || params.className;
        const targetStudentParam = params.student || params.studentId || params.studentName;
        const targetSemParam = params.sem || params.semester;
        const targetTestParam = (params.testIndex != null && params.testIndex !== '') ? params.testIndex : ((params.testIdx != null && params.testIdx !== '') ? params.testIdx : params.test);
        const targetDateParam = params.date;
        const targetTestNameParam = params.testName || params.topic;

        let targetClass = null;

        if (targetClassParam) {
          const rawTarget = String(targetClassParam).trim();
          const normTarget = rawTarget.toLowerCase();

          // 1. Match by c.id or c.groupId exact match
          targetClass = appState.classes.find(c => c.id === rawTarget || c.groupId === rawTarget);

          // 2. Match by name
          if (!targetClass) {
            targetClass = appState.classes.find(c => (c.name || '').trim().toLowerCase() === normTarget);
          }

          // 3. Match by slugified name
          if (!targetClass && typeof slugifyForPath === 'function') {
            targetClass = appState.classes.find(c => slugifyForPath(c.name || '').toLowerCase() === normTarget);
          }

          // 4. Match by slugified target against slugified class name
          if (!targetClass && typeof slugifyForPath === 'function') {
            const slugTarget = slugifyForPath(rawTarget).toLowerCase();
            targetClass = appState.classes.find(c => slugifyForPath(c.name || '').toLowerCase() === slugTarget);
          }
        }

        // 5. Fallback: match by date or test name across all classes
        if (!targetClass && (targetDateParam || targetTestNameParam)) {
          for (const cls of appState.classes) {
            if (!cls.testConfigs) continue;
            for (const semKey of ['sem1', 'sem2']) {
              const cfgs = cls.testConfigs[semKey] || [];
              const match = cfgs.some(cfg => {
                if (!cfg) return false;
                if (targetDateParam && cfg.testDate === targetDateParam) return true;
                if (targetTestNameParam && (cfg.testName || '').trim().toLowerCase() === String(targetTestNameParam).trim().toLowerCase()) return true;
                return false;
              });
              if (match) {
                targetClass = cls;
                break;
              }
            }
            if (targetClass) break;
          }
        }

        if (!targetClass) return false;

        ensureClassStructures(targetClass);

        let targetSem = null;
        if (targetSemParam) {
          const sNorm = String(targetSemParam).trim().toLowerCase();
          if (sNorm === 'sem1' || sNorm === '1' || sNorm === 's1') targetSem = 'sem1';
          else if (sNorm === 'sem2' || sNorm === '2' || sNorm === 's2') targetSem = 'sem2';
        }
        if (!targetSem) {
          targetSem = targetClass.semester === '2' ? 'sem2' : 'sem1';
        }

        let resolvedTestIndex = -1;
        if (targetTestParam != null && targetTestParam !== '') {
          const parsedIdx = parseInt(targetTestParam, 10);
          if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < TEST_COUNT_PER_SEM) {
            resolvedTestIndex = parsedIdx;
          } else {
            const m = String(targetTestParam).match(/(\d+)/);
            if (m) {
              const n = parseInt(m[1], 10);
              if (!isNaN(n) && n >= 1 && n <= TEST_COUNT_PER_SEM) {
                resolvedTestIndex = n - 1;
              }
            }
          }
        }

        if (resolvedTestIndex < 0 && (targetDateParam || targetTestNameParam)) {
          const semsToSearch = targetSemParam ? [targetSem] : ['sem1', 'sem2'];
          for (const semKey of semsToSearch) {
            const configs = targetClass.testConfigs[semKey] || [];
            const matchIdx = configs.findIndex(cfg => {
              if (!cfg) return false;
              if (targetDateParam && cfg.testDate === targetDateParam) return true;
              if (targetTestNameParam && (cfg.testName || '').trim().toLowerCase() === String(targetTestNameParam).trim().toLowerCase()) return true;
              return false;
            });
            if (matchIdx >= 0) {
              targetSem = semKey;
              resolvedTestIndex = matchIdx;
              break;
            }
          }
        }

        if (resolvedTestIndex >= 0 && resolvedTestIndex < TEST_COUNT_PER_SEM) {
          if ((targetClass.testCounts[targetSem] || 0) <= resolvedTestIndex) {
            targetClass.testCounts[targetSem] = resolvedTestIndex + 1;
          }
          appState.activeClassId = targetClass.id;
          appState.activeTest = { semester: targetSem, testIndex: resolvedTestIndex };
          renderTestSheet();
          showScreen("test");

          if (targetStudentParam && Array.isArray(targetClass.students)) {
            const normStudent = String(targetStudentParam).trim().toUpperCase();
            const sMatch = targetClass.students.find(s =>
              String(s.id).toUpperCase() === normStudent ||
              ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() === normStudent ||
              ((s.lastName || '') + ' ' + (s.firstName || '')).trim().toUpperCase() === normStudent ||
              (s.firstName && s.firstName.trim().toUpperCase() === normStudent) ||
              (s.customName && s.customName.trim().toUpperCase() === normStudent)
            );
            if (sMatch) {
              requestAnimationFrame(() => {
                const testTr = document.querySelector(`#test-table tbody tr[data-student-id="${sMatch.id}"]`);
                if (testTr) {
                  testTr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  testTr.classList.add('selected-student-row');
                  setTimeout(() => testTr.classList.remove('selected-student-row'), 4000);
                }
              });
            }
          }
          return true;
        } else {
          appState.activeClassId = targetClass.id;
          renderSummary();
          showScreen("summary");
          if (targetStudentParam && Array.isArray(targetClass.students)) {
            const normStudent = String(targetStudentParam).trim().toUpperCase();
            const sMatch = targetClass.students.find(s =>
              String(s.id).toUpperCase() === normStudent ||
              ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() === normStudent ||
              ((s.lastName || '') + ' ' + (s.firstName || '')).trim().toUpperCase() === normStudent ||
              (s.firstName && s.firstName.trim().toUpperCase() === normStudent) ||
              (s.customName && s.customName.trim().toUpperCase() === normStudent)
            );
            if (sMatch) {
              requestAnimationFrame(() => {
                const tr = document.querySelector(`#summary-table tbody tr[data-summary-student-id="${sMatch.id}"]`);
                if (tr) {
                  tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  tr.classList.add('selected-student-row');
                  setTimeout(() => tr.classList.remove('selected-student-row'), 4000);
                }
              });
            }
          }
          return true;
        }
      }

      window.gsNavigateToTarget = navigateToTarget;

      const urlParams = new URLSearchParams(window.location.search);
      const initialParams = {};
      for (const [k, v] of urlParams.entries()) {
        initialParams[k] = v;
      }
      navigateToTarget(initialParams);

      try {
        const storedNav = localStorage.getItem('cmt-grade-sheet-nav');
        if (storedNav) {
          localStorage.removeItem('cmt-grade-sheet-nav');
          navigateToTarget(JSON.parse(storedNav));
        }
      } catch (e) {}

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const navCh = new BroadcastChannel('cmt-gradesheet-nav');
          navCh.onmessage = function (ev) {
            if (ev && ev.data) {
              navigateToTarget(ev.data);
            }
          };
          const compCh = new BroadcastChannel('cmt-competences');
          compCh.onmessage = function () {
            loadLessonCompetences();
          };
          const critCh = new BroadcastChannel('cmt-criteria');
          critCh.onmessage = async function () {
            await loadAvailableCriteriaBanks();
            loadReferenceDataOverrides();
            if (typeof refreshCriteriaPresetDropdown === 'function') refreshCriteriaPresetDropdown();
            renderTestSheet();
            renderSummary();
            updateLiveGradePreview();
          };
          const scalesCh = new BroadcastChannel('cmt-scales');
          scalesCh.onmessage = async function () {
            await loadAvailableScaleBanks();
            loadReferenceDataOverrides();
            renderTestSheet();
            renderSummary();
            updateLiveGradePreview();
          };
          const chipsCh = new BroadcastChannel('cmt-chips');
          chipsCh.onmessage = async function () {
            await loadAvailableChipBanks();
            loadReferenceDataOverrides();
          };

          const gradesCh = new BroadcastChannel('cmt-grades');
          gradesCh.onmessage = function (ev) {
            if (!ev || !ev.data || typeof ev.data !== 'object') return;
            const msg = ev.data;

            if (msg.action === 'set-student-absent') {
              const targetClass = appState.classes.find(c =>
                c.groupId === msg.classId || c.groupId === msg.groupId ||
                c.id === msg.classId || c.id === msg.groupId ||
                (c.name && msg.className && c.name.toLowerCase() === msg.className.toLowerCase()) ||
                (c.name && msg.groupId && c.name.toLowerCase() === msg.groupId.toLowerCase()) ||
                (c.name && msg.classId && c.name.toLowerCase() === msg.classId.toLowerCase())
              );
              if (!targetClass) return;
              const sem = msg.semester;
              const testIndex = msg.testIndex;
              if (sem !== 'sem1' && sem !== 'sem2') return;
              if (typeof testIndex !== 'number' || testIndex < 0 || testIndex >= TEST_COUNT_PER_SEM) return;

              let student = targetClass.students.find(s =>
                (msg.studentUuid && (s.id === msg.studentUuid || s.uuid === msg.studentUuid)) ||
                (msg.studentId && (s.id === msg.studentId || s.uuid === msg.studentId))
              );
              if (!student && msg.studentName) {
                student = findStudentByName(targetClass, msg.studentName);
              }
              if (!student) return;

              const changed = setStudentAbsentForTest(student.id, !!msg.isAbsent, targetClass, sem, testIndex, null, true);
              if (changed) {
                const sName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
                  ? StudentNameUtils.formatStudentName(student, getGsNameDisplayMode())
                  : `${student.firstName} ${student.lastName}`.trim();
                const note = msg.isAbsent
                  ? tFmt('gsToastMarkedAbsent', { name: sName })
                  : tFmt('gsToastMarkedPresent', { name: sName });
                if (typeof showToast === 'function') showToast(note + ' (Class Management)');
              }
            } else if (msg.action === 'query-active-test') {
              const targetClass = appState.classes.find(c =>
                (msg.groupUuid && (c.groupId === msg.groupUuid || c.id === msg.groupUuid)) ||
                (msg.groupName && (c.groupId === msg.groupName || c.id === msg.groupName || (c.name && c.name.toLowerCase() === msg.groupName.toLowerCase()))) ||
                (msg.classId && (c.id === msg.classId || c.groupId === msg.classId))
              );
              if (!targetClass) return;
              let matchedSem = null;
              let matchedIdx = -1;
              let matchedCfg = null;

              for (const sem of ['sem1', 'sem2']) {
                const cfgs = (targetClass.testConfigs && targetClass.testConfigs[sem]) || [];
                for (let i = 0; i < cfgs.length; i++) {
                  const cfg = cfgs[i];
                  if (cfg && cfg.testDate && cfg.testDate === msg.date) {
                    matchedSem = sem;
                    matchedIdx = i;
                    matchedCfg = cfg;
                    break;
                  }
                }
                if (matchedCfg) break;
              }

              if (matchedCfg) {
                try {
                  gradesCh.postMessage({
                    action: 'active-test-response',
                    queryId: msg.queryId,
                    groupName: msg.groupName,
                    classId: targetClass.id,
                    groupId: targetClass.groupId,
                    classSlug: slugifyForPath(targetClass.name),
                    semester: matchedSem,
                    testIndex: matchedIdx,
                    testConfig: matchedCfg,
                    absentStudentIds: matchedCfg.absentStudentIds || []
                  });
                } catch (_) {}
              }
            } else if (msg.action === 'sync-all-absences') {
              const targetClass = appState.classes.find(c =>
                c.groupId === msg.classId || c.groupId === msg.groupId ||
                c.id === msg.classId || c.id === msg.groupId ||
                (c.name && msg.groupId && c.name.toLowerCase() === msg.groupId.toLowerCase())
              );
              if (!targetClass) return;
              const sem = msg.semester;
              const testIndex = msg.testIndex;
              if (sem !== 'sem1' && sem !== 'sem2') return;
              if (typeof testIndex !== 'number' || testIndex < 0 || testIndex >= TEST_COUNT_PER_SEM) return;
              const cfg = getTestConfig(targetClass, sem, testIndex);
              if (Array.isArray(msg.absentStudentIds)) {
                cfg.absentStudentIds = [...msg.absentStudentIds];
                saveState(targetClass.id, sem, testIndex);
                if (appState.currentScreen === "test" && appState.activeClassId === targetClass.id && appState.activeTest && appState.activeTest.semester === sem && appState.activeTest.testIndex === testIndex) {
                  renderTestSheet();
                }
              }
            } else if (msg.action === 'grades-updated') {
              if (window.Desktop && Desktop.isElectron()) {
                loadGradesStructured().then(structured => {
                  if (structured) {
                    appState.classes = deduplicateClasses(filterDeletedClasses(structured.classes));
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ classes: appState.classes }));
                    renderClasses();
                    if (appState.activeClassId) {
                      const cur = appState.classes.find(c => c.id === appState.activeClassId);
                      if (cur) {
                        renderSummary();
                        if (appState.activeTest) renderTestSheet();
                      }
                    }
                    if (typeof showToast === 'function') {
                      showToast(t('gsToastGradesUpdatedExternal') || 'Grades updated from external session.');
                    }
                  }
                }).catch(() => {});
              }
            } else if (msg.action === 'pending-import-available') {
              checkForPendingImport();
            }
          };

          const ptCh = new BroadcastChannel('cmt-participation');
          ptCh.onmessage = function (ev) {
            if (!ev || !ev.data || typeof ev.data !== 'object') return;
            const msg = ev.data;
            if (msg.action === 'participation-updated' || msg.action === 'participation-rules-updated') {
              syncLinkedParticipationGrades({ groupId: msg.groupId || null });
            }
          };
        } catch (_) {}
      }

      checkForPendingImport();
      let _lastPtFocusSync = 0;
      window.addEventListener('focus', () => {
        checkForPendingImport();
        const now = Date.now();
        if (now - _lastPtFocusSync > 3000) {
          _lastPtFocusSync = now;
          syncLinkedParticipationGrades({ silent: false });
        }
      });
      window.addEventListener('storage', (e) => {
        if (e && e.key === 'CMS_PENDING_GRADE_IMPORT' && e.newValue) {
          checkForPendingImport();
        }
      });
    }

    // ════════════════════════════════════════════════════════════════
    // 📊 COMPARE CLASSES MODULE (Comprehensive Cross-Class Analysis)

    boot();

