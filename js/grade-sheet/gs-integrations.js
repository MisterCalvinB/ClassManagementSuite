    function _positionMenu(menuEl, x, y) {
      menuEl.classList.remove("hidden");
      menuEl.style.left = `${x}px`;
      menuEl.style.top = `${y}px`;
      requestAnimationFrame(() => {
        const rect = menuEl.getBoundingClientRect();
        menuEl.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
        menuEl.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
      });
    }

    function closeAllContextMenus() {
      ["test-row-menu", "class-card-menu", "test-header-menu", "summary-student-row-menu", "all-test-item-menu"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });
      _testRowMenuCtx = null;
      _classCardMenuCtx = null;
      _testHeaderMenuCtx = null;
      _summaryStudentMenuCtx = null;
      _allTestItemMenuCtx = null;
    }

    function openSummaryStudentRowMenu(x, y, student, classObj) {
      closeAllContextMenus();
      const menu = document.getElementById("summary-student-row-menu");
      if (!menu) return;
      _summaryStudentMenuCtx = { student, classObj };
      _positionMenu(menu, x, y);
    }

    function closeTestRowMenu() {
      const menu = document.getElementById("test-row-menu");
      if (!menu) return;
      menu.classList.add("hidden");
      _testRowMenuCtx = null;
    }

    function isStudentAbsentForTest(studentId, config) {
      if (!config || studentId == null || studentId === '') return false;
      if (!Array.isArray(config.absentStudentIds)) return false;
      const sid = String(studentId);
      return config.absentStudentIds.some(id => id != null && String(id) === sid);
    }

    function setStudentAbsentForTest(studentId, isAbsent, classObj, sem, testIndex, config, skipBroadcast = false) {
      if (!classObj || sem == null || testIndex == null || studentId == null || studentId === '') return false;
      if (!config) config = getTestConfig(classObj, sem, testIndex);
      if (!Array.isArray(config.absentStudentIds)) config.absentStudentIds = [];
      const sid = String(studentId);
      const idx = config.absentStudentIds.findIndex(id => id != null && String(id) === sid);
      const isCurrentlyAbsent = idx !== -1;
      if (!!isAbsent === isCurrentlyAbsent) return false;

      if (isAbsent) {
        config.absentStudentIds.push(sid);
      } else {
        config.absentStudentIds.splice(idx, 1);
      }
      saveState(classObj.id, sem, testIndex);

      if (appState.currentScreen === "test" && appState.activeClassId === classObj.id && appState.activeTest && appState.activeTest.semester === sem && appState.activeTest.testIndex === testIndex) {
        renderTestSheet();
      }

      if (!skipBroadcast && typeof BroadcastChannel !== 'undefined') {
        try {
          new BroadcastChannel('cmt-grades').postMessage({
            action: 'grade-absence-changed',
            classId: classObj.id,
            groupId: classObj.groupId,
            className: classObj.name,
            semester: sem,
            testIndex: testIndex,
            testDate: config.testDate,
            studentId: studentId,
            isAbsent: !!isAbsent,
            absentStudentIds: config.absentStudentIds
          });
        } catch (_) {}
      }
      return true;
    }

    function toggleStudentAbsentForTest(studentId, classObj, sem, testIndex, config) {
      if (!classObj || sem == null || testIndex == null) return;
      if (!config) config = getTestConfig(classObj, sem, testIndex);
      if (!Array.isArray(config.absentStudentIds)) config.absentStudentIds = [];
      const isNowAbsent = !config.absentStudentIds.includes(studentId);
      setStudentAbsentForTest(studentId, isNowAbsent, classObj, sem, testIndex, config, false);

      const student = (classObj.students || []).find(s => s.id === studentId);
      const studentName = student
        ? ((window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
            ? StudentNameUtils.formatStudentName(student, getGsNameDisplayMode())
            : `${student.firstName} ${student.lastName}`.trim())
        : '';
      const msg = isNowAbsent
        ? tFmt('gsToastMarkedAbsent', { name: studentName })
        : tFmt('gsToastMarkedPresent', { name: studentName });
      if (typeof showToast === 'function') showToast(msg);
    }

    function toggleTestMarkingCompleted(classObj, sem, testIndex) {
      if (!classObj || sem == null || testIndex == null) return;
      ensureClassStructures(classObj);
      const cfg = getTestConfig(classObj, sem, testIndex);
      cfg.markingCompleted = !cfg.markingCompleted;
      saveState(classObj.id, sem, testIndex);
      if (typeof renderAllTests === 'function') {
        renderAllTests();
      }
      if (appState.currentScreen === "summary" && appState.activeClassId === classObj.id) {
        renderSummary();
      }
      if (appState.currentScreen === "test" && appState.activeClassId === classObj.id && appState.activeTest && appState.activeTest.semester === sem && appState.activeTest.testIndex === testIndex) {
        renderTestSheet();
      }
      const testName = cfg.testName || `T${testIndex + 1}`;
      const msg = cfg.markingCompleted
        ? tFmt('gsToastMarkingCompleted', { test: testName })
        : tFmt('gsToastMarkingIncomplete', { test: testName });
      if (typeof showToast === 'function') showToast(msg);
    }

    function openTestRowMenu(x, y, student, classObj, sem, testIndex, config) {
      closeAllContextMenus();
      const menu = document.getElementById("test-row-menu");
      if (!menu) return;
      _testRowMenuCtx = { student, classObj, sem, testIndex, config };
      const cfg = config || getTestConfig(classObj, sem, testIndex);
      const isAbsent = isStudentAbsentForTest(student.id, cfg);
      const absentBtn = document.getElementById("test-row-menu-absent");
      const absentText = document.getElementById("test-row-menu-absent-text");
      if (absentBtn && absentText) {
        absentText.textContent = isAbsent ? t('gsMenuMarkPresent') : t('gsMenuMarkAbsent');
        const icon = absentBtn.querySelector('.btn-icon');
        if (icon) {
          icon.src = isAbsent ? '../assets/icons/user-check.svg' : '../assets/icons/clear.svg';
        }
      }
      _positionMenu(menu, x, y);
    }

    function openAllTestItemMenu(x, y, classObj, sem, testIndex) {
      closeAllContextMenus();
      const menu = document.getElementById("all-test-item-menu");
      if (!menu) return;
      _allTestItemMenuCtx = { classObj, sem, testIndex };
      const cfg = getTestConfig(classObj, sem, testIndex);
      const isCompleted = !!(cfg && cfg.markingCompleted);
      const compBtn = document.getElementById("all-test-menu-toggle-completed");
      const compText = document.getElementById("all-test-menu-completed-text");
      if (compBtn && compText) {
        compText.textContent = isCompleted ? t('gsMenuMarkingIncomplete') : t('gsMenuMarkingCompleted');
        const icon = compBtn.querySelector('.btn-icon');
        if (icon) {
          icon.src = isCompleted ? '../assets/icons/refresh.svg' : '../assets/icons/check.svg';
        }
      }
      _positionMenu(menu, x, y);
    }

    async function renameTest(classObj, sem, ti) {
      if (!classObj || sem == null || ti == null) return;
      ensureClassStructures(classObj);
      const cfg = getTestConfig(classObj, sem, ti);
      const currentName = cfg.testName || `Test ${ti + 1}`;
      const newName = await showPrompt(t('gsPromptRenameTest', 'Enter new test name:'), currentName);
      if (newName == null) return;
      cfg.testName = newName.trim() || `Test ${ti + 1}`;
      saveState();
      renderSummary();
      if (appState.currentScreen === "test" && appState.activeClassId === classObj.id && appState.activeTest && appState.activeTest.semester === sem && appState.activeTest.testIndex === ti) {
        renderTestSheet();
      }
    }

    async function revealTestInFolder(classObj, sem, ti) {
      if (!classObj || sem == null || ti == null) return;
      if (!window.Desktop || !Desktop.isElectron || !Desktop.isElectron()) {
        if (typeof showToast === 'function') {
          showToast(t('mediaNodeFolderWebNotice', 'Folder location is only available in the desktop application.'), true);
        }
        return;
      }

      ensureClassStructures(classObj);
      const testLabel = `${sem}-test-${String(ti + 1).padStart(2, '0')}`;
      const testFileName = `${testLabel}.js`;
      const primaryRelPath = `${classObj.id}/${testFileName}`;

      try {
        let targetRelPath = primaryRelPath;
        const checkRes = await Desktop.readByPath('grades', primaryRelPath);
        if (!checkRes || !checkRes.ok || checkRes.content == null) {
          // Check fallback slug path
          const slugPath = `${slugifyForPath(classObj.name)}/${testFileName}`;
          const slugRes = await Desktop.readByPath('grades', slugPath);
          if (slugRes && slugRes.ok && slugRes.content != null) {
            targetRelPath = slugPath;
          } else {
            // Ensure test has a default name and save to disk so file exists
            const cfg = getTestConfig(classObj, sem, ti);
            if (cfg && !cfg.testName) {
              cfg.testName = `Test ${ti + 1}`;
            }
            if (typeof saveGradesStructured === 'function') {
              await saveGradesStructured(classObj.id, sem, ti);
            }
            targetRelPath = primaryRelPath;
          }
        }

        const res = await Desktop.showInFolder('grades', targetRelPath);
        if (res && res.error) {
          console.warn('showInFolder error:', res.error);
          await Desktop.showInFolder('grades', classObj.id).catch(() => Desktop.showInFolder('grades', ''));
        }
      } catch (err) {
        console.error('revealTestInFolder error:', err);
        if (typeof showToast === 'function') {
          showToast(t('gsToastRevealFolderFailed', 'Could not reveal file in folder.'), true);
        }
      }
    }

    function isGroupEditorClass(classObj) {
      if (!classObj) return false;
      if (classObj.groupId) return true;
      const cgData = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
      const cgMeta = cgData ? (cgData.classGroupsMeta || {}) : (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {});
      const cgGroupsLegacy = cgData ? cgData.classGroups : (typeof CLASS_GROUPS === 'object' && CLASS_GROUPS ? CLASS_GROUPS : null);
      if (cgMeta[classObj.id] || (cgGroupsLegacy && cgGroupsLegacy[classObj.id])) return true;
      if (classObj.name && Object.values(cgMeta).some(m => m && m.name === classObj.name)) return true;
      return false;
    }

    function openClassCardMenu(x, y, classObj) {
      closeAllContextMenus();
      const menu = document.getElementById("class-card-menu");
      if (!menu) return;
      _classCardMenuCtx = { classObj };
      const fromGroupEditor = isGroupEditorClass(classObj);
      const renameBtn = document.getElementById("class-card-menu-rename");
      if (renameBtn) {
        renameBtn.style.display = fromGroupEditor ? "none" : "";
      }
      const deleteBtn = document.getElementById("class-card-menu-delete");
      if (deleteBtn) {
        deleteBtn.style.display = fromGroupEditor ? "none" : "";
      }
      const sep = menu.querySelector(".menu-sep");
      if (sep) {
        sep.style.display = fromGroupEditor ? "none" : "";
      }
      _positionMenu(menu, x, y);
    }

    function openTestHeaderMenu(x, y, classObj, sem, testIndex) {
      closeAllContextMenus();
      const menu = document.getElementById("test-header-menu");
      if (!menu) return;
      _testHeaderMenuCtx = { classObj, sem, testIndex };
      const semLabel = sem === "sem2" ? t('gsSem2') : t('gsSem1');
      document.getElementById("test-header-menu-print-sem").innerHTML = `<img src="../assets/icons/printer.svg" class="btn-icon" alt="" /> ${tFmt('gsMenuPrintSemGradesLabel', { sem: semLabel })}`;
      const cfg = getTestConfig(classObj, sem, testIndex);
      const isCompleted = !!(cfg && cfg.markingCompleted);
      const compBtn = document.getElementById("test-header-menu-toggle-completed");
      const compText = document.getElementById("test-header-menu-completed-text");
      if (compBtn && compText) {
        compText.textContent = isCompleted ? t('gsMenuMarkingIncomplete') : t('gsMenuMarkingCompleted');
        const icon = compBtn.querySelector('.btn-icon');
        if (icon) {
          icon.src = isCompleted ? '../assets/icons/refresh.svg' : '../assets/icons/check.svg';
        }
      }
      _positionMenu(menu, x, y);
    }

    // ── Cross-App Tagging & Linking Integration Helpers ─────────
    async function updateGsLinksBadges() {
      if (typeof LinksService === 'undefined') return;
      try {
        const classObj = getActiveClass();
        const classBtn = document.getElementById("btn-gs-class-links");
        const iconHtml = '<img src="../assets/icons/links.svg" class="btn-icon" alt="" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" />';
        if (classBtn) {
          if (classObj) {
            const classUrn = 'cmt:class:' + classObj.id;
            const links = await LinksService.getLinksFor(classUrn);
            const tags = await LinksService.getTagsFor(classUrn);
            const tagPart = tags.length ? ` | TAGS: ${tags.length}` : '';
            classBtn.innerHTML = `${iconHtml}[${links.length}${tagPart}]`;
            classBtn.style.display = "";
          } else {
            classBtn.style.display = "none";
          }
        }

        const testBtn = document.getElementById("btn-gs-test-links");
        const toptBtn = document.getElementById("btn-topt-links");
        if (testBtn || toptBtn) {
          if (classObj && appState.activeTest) {
            const sem = appState.activeTest.semester;
            const testIndex = appState.activeTest.testIndex;
            const testUrn = `cmt:eval:${classObj.id}:${sem}:${testIndex}`;
            const links = await LinksService.getLinksFor(testUrn);
            const tags = await LinksService.getTagsFor(testUrn);
            const tagPart = tags.length ? ` | TAGS: ${tags.length}` : '';
            const btnHtml = `${iconHtml}[${links.length}${tagPart}]`;
            if (testBtn) {
              testBtn.innerHTML = btnHtml;
              testBtn.style.display = "";
            }
            if (toptBtn) {
              toptBtn.innerHTML = btnHtml;
              toptBtn.style.display = "";
            }
          } else {
            if (testBtn) testBtn.style.display = "none";
            if (toptBtn) toptBtn.style.display = "none";
          }
        }
      } catch (err) {
        console.warn('updateGsLinksBadges error:', err);
      }
    }
    window.updateGsLinksBadges = updateGsLinksBadges;

    /**
     * Automatically synchronizes universal graph links for an evaluation from the
     * data configured in the Test Options Criteria and Grading Scale tabs:
     * - Grading Scale model (data-tab="grading")
     * - Criteria Bank / Template (data-tab="criteria")
     * - Attached Curriculum Competences (data-tab="criteria")
     * - Class default criteria bank
     */

    // ── Test Creator Assessment Import Engine ─────────────────────
    let _activeTcImportTarget = null;
    let _cachedSavedTests = [];

    async function gsTriggerImportFromTestCreator() {
      const classObj = getActiveClass();
      if (!classObj) return;
      let sem = (typeof appState !== 'undefined' && appState.activeTest && appState.activeTest.semester) || 'sem1';
      let testIndex = (typeof appState !== 'undefined' && appState.activeTest && appState.activeTest.testIndex) != null
        ? appState.activeTest.testIndex
        : (classObj.testCounts[sem] > 0 ? 0 : 0);
      const config = getTestConfig(classObj, sem, testIndex);
      openTestCreatorImportModal(config, classObj, sem, testIndex);
    }
    window.gsTriggerImportFromTestCreator = gsTriggerImportFromTestCreator;

    async function openTestCreatorImportModal(config, classObj, sem, testIndex) {
      _activeTcImportTarget = { config, classObj, sem, testIndex };
      const overlay = document.getElementById('gs-tc-import-overlay');
      const listEl = document.getElementById('gs-tc-import-list');
      const searchEl = document.getElementById('gs-tc-import-search');
      if (!overlay || !listEl) return;

      overlay.classList.remove('hidden');
      if (searchEl) { searchEl.value = ''; searchEl.focus(); }
      listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-weight:700;"><img src="../assets/icons/links.svg" class="btn-icon" style="animation:spin 1s linear infinite;" alt="" /> Loading saved tests from Test Creator...</div>';

      await loadSavedTestsForImport();
      renderSavedTestsForImport();
    }
    window.openTestCreatorImportModal = openTestCreatorImportModal;

    async function loadSavedTestsForImport() {
      _cachedSavedTests = [];
      const testMap = new Map();

      // 1. Scan user/tests directory via Electron bridge
      if (window.Desktop && typeof Desktop.listFiles === 'function') {
        try {
          const res = await Desktop.listFiles('tests', { extensions: ['.json', '.js'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (let i = 0; i < flist.length; i++) {
            const fn = typeof flist[i] === 'string' ? flist[i] : flist[i].filename;
            if (!fn) continue;
            try {
              const readRes = await Desktop.readJson('tests', fn);
              if (readRes && readRes.ok && readRes.data) {
                const tObj = readRes.data;
                tObj._filename = fn;
                tObj._source = 'disk';
                testMap.set(tObj.id || fn, tObj);
              }
            } catch (_) {}
          }
        } catch (e) {
          console.warn('Error reading tests directory:', e);
        }
      }

      // 2. Scan localStorage fallback
      try {
        const raw = localStorage.getItem('cmt_tests');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach(t => {
              if (t && (t.id || t.title) && !testMap.has(t.id || t._filename)) {
                t._source = 'local';
                testMap.set(t.id || ('local_' + Math.random()), t);
              }
            });
          }
        }
      } catch (_) {}

      _cachedSavedTests = Array.from(testMap.values()).sort((a, b) => {
        const da = a.updatedAt || a.date || '';
        const db = b.updatedAt || b.date || '';
        return db.localeCompare(da);
      });
    }

    function renderSavedTestsForImport(query = '') {
      const listEl = document.getElementById('gs-tc-import-list');
      if (!listEl) return;
      const q = String(query || '').trim().toLowerCase();

      const filtered = _cachedSavedTests.filter(t => {
        if (!q) return true;
        const text = [t.title, t.name, t.subject, t.scope, t.date, t._filename].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      });

      if (filtered.length === 0) {
        if (window.DomSync && typeof DomSync.renderWindowedRows === 'function') {
          DomSync.renderWindowedRows(listEl, [], t => t._filename || t.title, () => document.createElement('div'));
        }
        listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-weight:700;">' + (i18n.t('gsImportNoSavedTests') || 'No saved tests found in Test Creator.') + '</div>';
        return;
      }

      const createImportCard = () => {
        const card = document.createElement('div');
        card.style.cssText = 'background:#fff;border:2px solid #000;box-shadow:2px 2px 0px #000;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;';

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm primary';
        btn.style.cssText = 'font-weight:900;border:2px solid #000;box-shadow:2px 2px 0px #000;padding:6px 14px;white-space:nowrap;';
        btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> Import';

        card.appendChild(info);
        card.appendChild(btn);
        return card;
      };

      const updateImportCard = (card, testObj) => {
        const title = testObj.title || testObj.name || testObj._filename || 'Untitled Test';
        const date = testObj.date ? ' • ' + testObj.date : '';
        const subject = testObj.subject || '';
        const scope = testObj.scope ? ' • ' + testObj.scope : '';
        const exerciseCount = Array.isArray(testObj.exercises) ? testObj.exercises.length : 0;
        let totalPts = 0;
        if (Array.isArray(testObj.exercises)) {
          totalPts = testObj.exercises.reduce((sum, ex) => sum + (Number(ex.points) || 1), 0);
        }

        const btn = card.lastElementChild;
        if (btn) {
          btn.onclick = () => {
            applyTestCreatorImport(testObj, testObj._filename || (testObj.title + '.json'));
          };
        }

        const sig = `${title}|${subject}|${date}|${scope}|${exerciseCount}|${totalPts}|${testObj.scaleModelId || ''}`;
        if (card.dataset.syncSig === sig) return;
        card.dataset.syncSig = sig;

        const info = card.firstElementChild;
        if (info) {
          info.innerHTML = `
            <div style="font-weight:900;font-size:0.92rem;text-transform:uppercase;color:#000;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(title)}</div>
            <div style="font-size:0.78rem;color:var(--muted);margin-bottom:4px;">${escapeHtml(subject)}${escapeHtml(date)}${escapeHtml(scope)}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:0.7rem;font-weight:800;border:1px solid #000;background:#e0e7ff;color:#1e1b4b;padding:1px 5px;">${exerciseCount} EXERCISES</span>
              <span style="font-size:0.7rem;font-weight:800;border:1px solid #000;background:#dcfce7;color:#14532d;padding:1px 5px;">${totalPts} PTS TOTAL</span>
              ${testObj.scaleModelId ? `<span style="font-size:0.7rem;font-weight:800;border:1px solid #000;background:#fef08a;color:#713f12;padding:1px 5px;">SCALE: ${escapeHtml(testObj.scaleModelId)}</span>` : ''}
            </div>
          `;
        }
      };

      if (window.DomSync && typeof DomSync.renderWindowedRows === 'function') {
        DomSync.renderWindowedRows(listEl, filtered, t => t._filename || t.id || t.title || 'untitled', createImportCard, updateImportCard, {
          threshold: 40,
          rowHeight: 74,
          overscan: 8
        });
      } else {
        listEl.innerHTML = '';
        filtered.forEach(testObj => {
          const card = createImportCard();
          updateImportCard(card, testObj);
          listEl.appendChild(card);
        });
      }
    }

    async function applyTestCreatorImport(testObj, filename) {
      if (!_activeTcImportTarget) return;
      const { config, classObj, sem, testIndex } = _activeTcImportTarget;

      // 1. Populate metadata
      config.testName = testObj.title || testObj.name || (filename ? filename.replace(/\.json$/i, '') : 'Imported Test');
      if (testObj.date) {
        config.testDate = testObj.date;
        if (!config.correctionDeadline && config.correctionDeadlineAuto !== false) {
          const days = (typeof config.correctionDeadlineDaysAfter === 'number') ? config.correctionDeadlineDaysAfter : 13;
          const d = new Date(testObj.date + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + days);
            config.correctionDeadline = d.toISOString().slice(0, 10);
          }
        }
      }
      if (testObj.scope) config.scope = testObj.scope;
      if (testObj.subject) config.type = testObj.subject;

      // 2. Map exercises into sub-criteria
      if (Array.isArray(testObj.exercises) && testObj.exercises.length > 0) {
        config.criteria = testObj.exercises.map((ex, idx) => {
          const exTitle = ex.title || ('Exercise ' + (idx + 1) + (ex.type ? ' (' + ex.type + ')' : ''));
          const maxPts = Number(ex.points) || 1;
          const compIds = Array.isArray(ex.linkedCompetenceIds) ? ex.linkedCompetenceIds : (Array.isArray(ex.competenceIds) ? ex.competenceIds : []);
          return makeCriterion(exTitle, maxPts, 1, false, 0, null, compIds);
        });
      }

      // 3. Scale Model
      if (testObj.scaleModelId && testObj.scaleModelId !== 'custom') {
        config.grading = config.grading || {};
        config.grading.modelKey = testObj.scaleModelId;
        config.grading.pendingModelKey = testObj.scaleModelId;
        if (testObj.scaleBank) config.grading.scaleBank = testObj.scaleBank;
      }

      // 4. Record linkage
      config.linkedTestFile = filename;
      config.linkedTestId = testObj.id || null;

      // 5. Establish graph link via LinksService
      if (typeof LinksService !== 'undefined') {
        const testUrn = `cmt:eval:${classObj.id}:${sem}:${testIndex}`;
        const tcUrn = `cmt:test:${filename}`;
        await LinksService.addLink(testUrn, tcUrn, {
          relation: 'test',
          targetMeta: {
            type: 'test',
            title: testObj.title || filename,
            subtitle: (testObj.subject ? testObj.subject + ' • ' : '') + `${testObj.exercises ? testObj.exercises.length : 0} exercises`
          },
          sourceMeta: {
            type: 'evaluation',
            title: `${config.testName} (${classObj.name})`,
            subtitle: (sem === 'sem1' ? 'Semester 1' : 'Semester 2') + (config.testDate ? ' • ' + config.testDate : '')
          }
        });
      }

      // 6. Update Test Options Form if open
      const nameInput = document.getElementById("topt-info-name");
      const dateInput = document.getElementById("topt-info-date");
      const scopeInput = document.getElementById("topt-info-scope");
      const typeInput = document.getElementById("topt-info-type");
      if (nameInput) nameInput.value = config.testName;
      if (dateInput) dateInput.value = config.testDate || '';
      if (scopeInput) scopeInput.value = config.scope || '';
      if (typeInput) typeInput.value = config.type || '';

      // Rebuild criteria list inside modal if helper exists
      const critList = document.getElementById("topt-criteria-list");
      if (critList && typeof rebuildCriteriaList === 'function') {
        rebuildCriteriaList();
      }

      // Close import overlay
      const overlay = document.getElementById('gs-tc-import-overlay');
      if (overlay) overlay.classList.add('hidden');

      // Auto-sync links and save
      saveState();
      syncTestAutoLinks(classObj, sem, testIndex);
      updateGsLinksBadges();
      if (appState.activeScreen === 'test') renderTestSheet();
      else if (appState.activeScreen === 'summary') renderSummary();

      if (window.showToast) {
        showToast(i18n.t('gsImportTestSuccess') || 'Test imported successfully from Test Creator!');
      }
    }

    // Attach search and close listeners for import modal
    document.addEventListener('DOMContentLoaded', () => {
      const searchInput = document.getElementById('gs-tc-import-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          renderSavedTestsForImport(e.target.value);
        });
      }
      const closeBtn = document.getElementById('gs-tc-import-close-x');
      if (closeBtn) {
        closeBtn.onclick = () => {
          document.getElementById('gs-tc-import-overlay')?.classList.add('hidden');
        };
      }
      const cancelBtn = document.getElementById('gs-tc-import-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          document.getElementById('gs-tc-import-overlay')?.classList.add('hidden');
        };
      }
      const browseBtn = document.getElementById('gs-tc-import-browse-file');
      const fileInput = document.getElementById('gs-tc-import-file-input');
      if (browseBtn && fileInput) {
        browseBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target.result);
              applyTestCreatorImport(parsed, file.name);
            } catch (err) {
              showAlert('Invalid JSON test file: ' + err.message);
            }
          };
          reader.readAsText(file);
          fileInput.value = '';
        };
      }
      const toptImportBtn = document.getElementById('topt-import-test-creator-btn');
      if (toptImportBtn) {
        toptImportBtn.onclick = () => gsTriggerImportFromTestCreator();
      }
    });

    async function syncTestAutoLinks(classObj, sem, testIndex) {
      if (typeof LinksService === 'undefined' || !classObj || !classObj.id || sem == null || testIndex == null) return;
      try {
        const config = getTestConfig(classObj, sem, testIndex);
        if (!config) return;

        const testUrn = `cmt:eval:${classObj.id}:${sem}:${testIndex}`;
        const testName = config.testName || ('T' + (Number(testIndex) + 1));
        const testTitle = `${testName} (${classObj.name})`;
        const testSubtitle = (sem === 'sem1' ? 'Semester 1' : 'Semester 2') + (config.testDate ? ' • ' + config.testDate : '');

        // 1. Fetch current links for this test
        const currentLinks = await LinksService.getLinksFor(testUrn);

        // ── A. Grading Scale Model (from data-tab="grading") ──
        const targetModelKey = config.grading && (config.grading.modelKey || config.grading.pendingModelKey);
        let desiredScaleUrn = null;
        if (targetModelKey && targetModelKey !== 'custom' && targetModelKey !== 'none') {
          desiredScaleUrn = LinksService.makeUrn('scale', targetModelKey);
          const modelObj = typeof getScaleModel === 'function' ? getScaleModel(targetModelKey) : null;
          const scaleLabel = modelObj ? (modelObj.label || modelObj.key || targetModelKey) : targetModelKey;
          await LinksService.addLink(testUrn, desiredScaleUrn, {
            relation: 'scale',
            meta: {
              category: 'scale',
              auto: true,
              modelKey: targetModelKey,
              label: scaleLabel
            },
            targetMeta: {
              type: 'scale',
              title: scaleLabel,
              subtitle: 'Grading Scale Model • ' + (modelObj ? `${modelObj.minGrade || 1}–${modelObj.maxGrade || 6}` : targetModelKey)
            },
            sourceMeta: {
              type: 'evaluation',
              title: testTitle,
              subtitle: testSubtitle
            }
          });
        }

        // Clean up previous auto-linked scale models if changed or removed
        for (const link of currentLinks) {
          if (link.meta && link.meta.auto && link.meta.category === 'scale') {
            if (link.otherUrn !== desiredScaleUrn) {
              await LinksService.removeLink(testUrn, link.otherUrn);
            }
          }
        }

        // ── B. Criteria Bank / Template (from data-tab="criteria") ──
        const targetBankFn = config.criteriaBank || (classObj.criteriaBanks && classObj.criteriaBanks[0]) || classObj.criteriaBank || 'correction-criteria.js';
        let desiredBankUrn = null;
        if (targetBankFn) {
          desiredBankUrn = LinksService.makeUrn('criteria', targetBankFn);
          const matchedBank = Array.isArray(_availableCriteriaBanks) ? _availableCriteriaBanks.find(b => b.filename === targetBankFn) : null;
          const bankName = matchedBank ? (matchedBank.name || targetBankFn) : targetBankFn;
          await LinksService.addLink(testUrn, desiredBankUrn, {
            relation: 'criteria',
            meta: {
              category: 'criteria',
              auto: true,
              bank: targetBankFn,
              label: bankName
            },
            targetMeta: {
              type: 'criteria',
              title: bankName,
              subtitle: 'Criteria Rubric Bank • ' + targetBankFn
            },
            sourceMeta: {
              type: 'evaluation',
              title: testTitle,
              subtitle: testSubtitle
            }
          });
        }

        // Clean up previous auto-linked criteria banks if changed
        for (const link of currentLinks) {
          if (link.meta && link.meta.auto && link.meta.category === 'criteria') {
            if (link.otherUrn !== desiredBankUrn) {
              await LinksService.removeLink(testUrn, link.otherUrn);
            }
          }
        }

        // ── C. Attached Curriculum Competences (from data-tab="criteria") ──
        const desiredCompUrns = new Set();
        if (Array.isArray(config.criteria)) {
          for (const crit of config.criteria) {
            if (crit && Array.isArray(crit.competenceIds)) {
              for (const cid of crit.competenceIds) {
                const cleanCid = String(cid || '').trim();
                if (!cleanCid) continue;
                const compUrn = LinksService.makeUrn('competence', cleanCid);
                desiredCompUrns.add(compUrn);
                const compInfo = typeof findLessonCompetence === 'function' ? findLessonCompetence(cleanCid) : null;
                const compTitle = compInfo ? (compInfo.code || compInfo.title || cleanCid) : cleanCid;
                await LinksService.addLink(testUrn, compUrn, {
                  relation: 'competence',
                  meta: {
                    category: 'competence',
                    auto: true,
                    code: cleanCid,
                    criterionName: crit.name || ''
                  },
                  targetMeta: {
                    type: 'competence',
                    title: compTitle,
                    subtitle: compInfo && compInfo.title ? compInfo.title : 'Curriculum Competence'
                  },
                  sourceMeta: {
                    type: 'evaluation',
                    title: testTitle,
                    subtitle: testSubtitle
                  }
                });
              }
            }
          }
        }

        // Clean up previous auto-linked competences that were unassigned
        for (const link of currentLinks) {
          if (link.meta && link.meta.auto && link.meta.category === 'competence') {
            if (!desiredCompUrns.has(link.otherUrn)) {
              await LinksService.removeLink(testUrn, link.otherUrn);
            }
          }
        }

        // ── D. Class Group Default Criteria Bank Auto-Link ──
        if (classObj.id && classObj.criteriaBank) {
          const classUrn = 'cmt:class:' + classObj.id;
          const classBankUrn = LinksService.makeUrn('criteria', classObj.criteriaBank);
          const matchedClassBank = Array.isArray(_availableCriteriaBanks) ? _availableCriteriaBanks.find(b => b.filename === classObj.criteriaBank) : null;
          const classBankName = matchedClassBank ? (matchedClassBank.name || classObj.criteriaBank) : classObj.criteriaBank;
          await LinksService.addLink(classUrn, classBankUrn, {
            relation: 'criteria',
            meta: {
              category: 'criteria',
              auto: true,
              bank: classObj.criteriaBank,
              label: classBankName
            },
            targetMeta: {
              type: 'criteria',
              title: classBankName,
              subtitle: 'Default Class Criteria • ' + classObj.criteriaBank
            },
            sourceMeta: {
              type: 'class',
              title: classObj.name,
              subtitle: 'Class Group'
            }
          });
        }

        // ── E. Refresh Badges ──
        await updateGsLinksBadges();
      } catch (err) {
        console.warn('syncTestAutoLinks error:', err);
      }
    }
    window.syncTestAutoLinks = syncTestAutoLinks;
    window.appState = appState;
    window.GRADE_SHEET_CLASSES = function () { return appState.classes; };

    function gsOpenClassLinksModal() {
      const classObj = getActiveClass();
      if (!classObj || typeof TagLinkModal === 'undefined') return;
      TagLinkModal.open({
        urn: 'cmt:class:' + classObj.id,
        title: classObj.name,
        label: classObj.name,
        subtitle: 'Class Group • ' + ((classObj.students && classObj.students.length) || 0) + ' students' + (classObj.year ? ' • ' + classObj.year : ''),
        type: 'class',
        classId: classObj.id
      });
    }
    window.gsOpenClassLinksModal = gsOpenClassLinksModal;

    function gsOpenTestLinksModal() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest || typeof TagLinkModal === 'undefined') return;
      const sem = appState.activeTest.semester;
      const testIndex = appState.activeTest.testIndex;
      const cfg = getTestConfig(classObj, sem, testIndex);
      const testName = cfg.testName || ('T' + (testIndex + 1));
      TagLinkModal.open({
        urn: `cmt:eval:${classObj.id}:${sem}:${testIndex}`,
        title: testName + ' (' + classObj.name + ')',
        label: testName + ' (' + classObj.name + ')',
        subtitle: (sem === 'sem1' ? 'Semester 1' : 'Semester 2') + (cfg.testDate ? ' • ' + cfg.testDate : ''),
        type: 'evaluation',
        classId: classObj.id,
        evalId: `${sem}_test_${testIndex}`
      });
    }
    window.gsOpenTestLinksModal = gsOpenTestLinksModal;

    function gsOpenStudentDossierModal(student, classObj) {
      if (!student || typeof TagLinkModal === 'undefined') return;
      var studentId = typeof student === 'string' ? student : (student.id || student.uuid);
      if (!studentId) return;
      var title = typeof student === 'object' ? (((student.firstName || '') + ' ' + (student.lastName || '')).trim() || student.name || studentId) : studentId;
      var currentClass = classObj || (typeof appState !== 'undefined' ? appState.currentClass : null);
      var classId = currentClass ? currentClass.id : null;
      var className = currentClass ? currentClass.name : null;
      var level = currentClass ? (currentClass.level || currentClass.grade || '') : '';
      if (typeof TagLinkModal.openStudentDossier === 'function') {
        TagLinkModal.openStudentDossier(studentId, {
          title: title,
          classId: classId,
          className: className,
          level: level
        });
      } else {
        TagLinkModal.open({
          urn: 'cmt:student:' + studentId,
          title: title,
          type: 'student',
          classId: classId
        });
      }
    }
    window.gsOpenStudentDossierModal = gsOpenStudentDossierModal;

    function gsOpenStudentWorkModal(student, classObj, sem, testIndex) {
      if (!student || !classObj || typeof TagLinkModal === 'undefined') return;
      const cfg = getTestConfig(classObj, sem, testIndex);
      const testName = cfg.testName || ('T' + (testIndex + 1));
      const studentName = ((student.firstName || '') + ' ' + (student.lastName || '')).trim() || ('Student #' + student.index);
      const urn = `cmt:eval:${classObj.id}:${sem}:${testIndex}:student:${student.id}`;
      TagLinkModal.open({
        urn: urn,
        title: `${studentName} — ${testName} (${classObj.name})`,
        label: `${studentName} — ${testName} (${classObj.name})`,
        subtitle: 'Student Submission • ' + classObj.name + ' • ' + (sem === 'sem1' ? 'Semester 1' : 'Semester 2'),
        type: 'submission',
        classId: classObj.id,
        evalId: `${sem}_test_${testIndex}`,
        studentId: student.id
      });
    }
    window.gsOpenStudentWorkModal = gsOpenStudentWorkModal;

    // Listen for links/tags changes to update badges in real-time
    if (typeof window !== 'undefined') {
      window.addEventListener('cmt-links-changed', () => {
        updateGsLinksBadges();
      });
    }



    async function openAddClassModal() {
      const _cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : {};
      document.getElementById("add-class-name").value = "";
      document.getElementById("add-class-year").value = _cgd.activeYear || "";
      document.getElementById("add-class-semester").value = _cgd.activeSemester ? String(_cgd.activeSemester) : "";
      document.getElementById("add-class-level").value = "";
      await loadAvailableCriteriaBanks();
      populateCriteriaBankDropdowns();
      const bankSel = document.getElementById("add-class-criteria-bank");
      if (bankSel && !bankSel.value && _availableCriteriaBanks.length > 0) {
        bankSel.value = _availableCriteriaBanks[0].filename;
      }
      document.getElementById("add-class-overlay").classList.remove("hidden");
      document.getElementById("add-class-name").focus();
    }

    function closeAddClassModal() {
      document.getElementById("add-class-overlay").classList.add("hidden");
    }

    async function addClassFromInput() {
      const nameInput = document.getElementById("add-class-name");
      const yearInput = document.getElementById("add-class-year");
      const semesterSelect = document.getElementById("add-class-semester");
      const levelSelect = document.getElementById("add-class-level");
      const bankSelect = document.getElementById("add-class-criteria-bank");
      const name = nameInput.value.trim();
      if (!name) return;

      const year = yearInput.value.trim();
      if (!year || !/^20\d{2}-20\d{2}$/.test(year)) {
        await showAlert(t('gsAlertYearInvalid'));
        return;
      }

      const semester = semesterSelect.value;
      const level = levelSelect.value;
      const criteriaBank = bankSelect ? bankSelect.value : "";

      const exists = appState.classes.some(c => c.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        await showAlert(t('gsAlertClassExists'));
        return;
      }

      const newClass = makeClass(name, [], year, semester, level);
      if (criteriaBank) {
        newClass.criteriaBank = criteriaBank;
        newClass.criteriaBanks = [criteriaBank];
      }
      appState.classes.push(newClass);
      closeAddClassModal();
      saveState();
      renderClasses();
      openGsAddStudentsModal(newClass);
    }

    let _gsAddStudentsClassId = null;

    function openGsAddStudentsModal(classObj) {
      _gsAddStudentsClassId = classObj.id;
      document.getElementById('gs-add-students-subtitle').textContent = t('gsAddStudentsClassPrefix') + classObj.name;
      document.getElementById('gs-add-students-new').value = '';

      const matchedContainer = document.getElementById('gs-add-students-matched');
      matchedContainer.innerHTML = '';
      const othersContainer = document.getElementById('gs-add-students-others');
      othersContainer.innerHTML = '';
      const othersWrap = document.getElementById('gs-add-students-others-wrap');

      const _cgMeta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
      const _cgLegacy = (typeof CLASS_GROUPS === 'object' && CLASS_GROUPS) ? CLASS_GROUPS : {};
      const _isArchived = k => _cgMeta[k] && _cgMeta[k].archived;

      function _gsResolveGroupStudents(uuid) {
        const m = _cgMeta[uuid] || {};
        if (Array.isArray(m.students) && m.students.length) return _gsResolveStudentNames(m.students);
        const name = m.name || uuid;
        if (Array.isArray(_cgLegacy[uuid])) return _cgLegacy[uuid].map(String).filter(Boolean);
        if (Array.isArray(_cgLegacy[name])) return _cgLegacy[name].map(String).filter(Boolean);
        return [];
      }

      // Students from group matching this class (by UUID link first, then by name)
      const matchedUuid = classObj.groupId || Object.keys(_cgMeta).find(k => (_cgMeta[k].name || k) === classObj.name);
      const groupStudents = (matchedUuid && !_isArchived(matchedUuid)) ? _gsResolveGroupStudents(matchedUuid) : [];

      // Other groups — skip archived, Teachers, and the matched group
      const allUuids = Object.keys(_cgMeta).length ? Object.keys(_cgMeta) : Object.keys(_cgLegacy);
      const otherGroups = allUuids
        .filter(k => k !== matchedUuid && (_cgMeta[k] ? _cgMeta[k].name : k) !== 'Teachers' && !_isArchived(k))
        .map(k => [(_cgMeta[k] && _cgMeta[k].name) || k, _gsResolveGroupStudents(k)])
        .filter(([, v]) => v.length > 0);

      function setChipSelected(chip, selected) {
        chip.dataset.selected = selected ? 'true' : 'false';
        chip.style.background  = selected ? '#111' : '#f8f8f8';
        chip.style.color       = selected ? '#fff' : '#333';
        chip.style.borderColor = selected ? '#111' : '#ccc';
      }

      function buildChipSection(container, label, names, autoSelect) {
        if (!names.length) return;

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

        const lbl = document.createElement('label');
        lbl.style.cssText = 'font-size:0.8rem;color:#888;text-transform:uppercase;letter-spacing:1px;';
        lbl.textContent = label;
        header.appendChild(lbl);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.style.cssText = 'font-size:0.75rem;padding:2px 8px;border:1px solid #ccc;border-radius:10px;background:#f0f0f0;color:#555;cursor:pointer;white-space:nowrap;';
        toggleBtn.textContent = autoSelect ? 'Deselect all' : 'Select all';
        header.appendChild(toggleBtn);
        container.appendChild(header);

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';

        const chips = [];
        names.forEach(student => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.textContent = student;
          chip.style.cssText = 'padding:4px 10px;border:1.5px solid #ccc;border-radius:16px;font-size:0.8rem;cursor:pointer;background:#f8f8f8;color:#333;transition:all 0.1s;';
          setChipSelected(chip, autoSelect);
          chip.onclick = () => {
            const sel = chip.dataset.selected === 'true';
            setChipSelected(chip, !sel);
            const allSel = chips.every(c => c.dataset.selected === 'true');
            toggleBtn.textContent = allSel ? 'Deselect all' : 'Select all';
          };
          chips.push(chip);
          wrap.appendChild(chip);
        });

        toggleBtn.onclick = () => {
          const anyUnsel = chips.some(c => c.dataset.selected !== 'true');
          chips.forEach(c => setChipSelected(c, anyUnsel));
          toggleBtn.textContent = anyUnsel ? 'Deselect all' : 'Select all';
        };

        container.appendChild(wrap);
      }

      if (groupStudents.length) {
        buildChipSection(matchedContainer, tFmt('gsAddStudentsInClass', { name: classObj.name }), groupStudents, true);
      }
      if (otherGroups.length) {
        othersWrap.style.display = '';
        otherGroups.forEach(([groupName, names]) => buildChipSection(othersContainer, groupName, names, false));
      } else {
        othersWrap.style.display = 'none';
      }
      if (!groupStudents.length && !otherGroups.length) {
        const hint = document.createElement('p');
        hint.style.cssText = 'color:#aaa;font-size:0.82rem;margin:0 0 10px;';
        hint.textContent = t('gsAddStudentsNoExisting');
        matchedContainer.appendChild(hint);
      }

      document.getElementById('gs-add-students-overlay').classList.remove('hidden');
      setTimeout(() => document.getElementById('gs-add-students-new').focus(), 80);
    }

    function closeGsAddStudentsModal() {
      document.getElementById('gs-add-students-overlay').classList.add('hidden');
      _gsAddStudentsClassId = null;
    }

    function confirmGsAddStudents() {
      const classObj = appState.classes.find(c => c.id === _gsAddStudentsClassId);
      if (!classObj) { closeGsAddStudentsModal(); return; }

      const selectedChips = Array.from(
        document.querySelectorAll('#gs-add-students-matched button[data-selected="true"], #gs-add-students-others button[data-selected="true"]')
      ).map(btn => btn.textContent.trim());

      const typedNames = document.getElementById('gs-add-students-new').value
        .split(',').map(s => s.trim()).filter(Boolean);

      const allNames = [...new Set([...selectedChips, ...typedNames])];
      if (allNames.length > 0) {
        const startIdx = classObj.students.length + 1;
        allNames.forEach((n, i) => classObj.students.push(defaultStudent(startIdx + i, n)));
        saveState();
        renderClasses();
      }
      closeGsAddStudentsModal();
    }

    function openDuplicateTestPopup(prefill) {
      const classObj = getActiveClass() || (prefill && prefill.srcClassId && appState.classes.find(c => c.id === prefill.srcClassId)) || appState.classes[0];
      if (!classObj && (!prefill || !prefill.srcClassId)) return;

      const overlay = document.getElementById("dup-test-popup-overlay");
      const classSel = document.getElementById("dup-test-class-select");
      const semSel = document.getElementById("dup-test-sem-select");
      const testSel = document.getElementById("dup-test-test-select");
      const destClassSel = document.getElementById("dup-dest-class-select");
      const destSemSel = document.getElementById("dup-dest-sem-select");
      const destTestSel = document.getElementById("dup-dest-test-select");
      const elemChips = document.querySelectorAll("#dup-test-popup-overlay .chip-group .chip[data-elem]");

      // Reset all element chips to active by default
      elemChips.forEach(chip => {
        chip.classList.add("active");
        chip.onclick = () => chip.classList.toggle("active");
      });

      const selectAllBtn = document.getElementById("dup-test-select-all");
      if (selectAllBtn) {
        selectAllBtn.onclick = () => elemChips.forEach(chip => chip.classList.add("active"));
      }
      const deselectAllBtn = document.getElementById("dup-test-deselect-all");
      if (deselectAllBtn) {
        deselectAllBtn.onclick = () => elemChips.forEach(chip => chip.classList.remove("active"));
      }

      // Populate source class dropdown (sorted alphabetically)
      const sortedClasses = appState.classes.slice().sort((a, b) => a.name.localeCompare(b.name));
      const classOptionsHtml = sortedClasses
        .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        .join("");

      classSel.innerHTML = classOptionsHtml;
      destClassSel.innerHTML = classOptionsHtml;

      // Pre-select source and destination classes
      const defaultSrcClassId = (prefill && prefill.srcClassId) || (classObj && classObj.id) || (sortedClasses[0] && sortedClasses[0].id);
      const defaultDestClassId = (prefill && prefill.destClassId) || defaultSrcClassId;

      classSel.value = defaultSrcClassId;
      destClassSel.value = defaultDestClassId;

      if (prefill && prefill.srcSem) {
        semSel.value = prefill.srcSem;
      } else if (appState.activeTest) {
        semSel.value = appState.activeTest.semester;
      }

      if (prefill && prefill.destSem) {
        destSemSel.value = prefill.destSem;
      } else if (appState.activeTest) {
        destSemSel.value = appState.activeTest.semester;
      }

      function updateDupContextHint() {
        const srcClass = appState.classes.find(c => c.id === classSel.value);
        const destClass = appState.classes.find(c => c.id === destClassSel.value);
        const note = document.getElementById("dup-test-context-note");
        const confirmBtn = document.getElementById("dup-test-confirm");
        if (!srcClass || !destClass) return;

        const isSameClass = srcClass.id === destClass.id;
        if (note) {
          note.textContent = isSameClass
            ? tFmt('gsDupContextSameClass', { name: srcClass.name })
            : tFmt('gsDupContextCrossClass', { src: srcClass.name, dest: destClass.name });
        }
        if (confirmBtn) {
          confirmBtn.textContent = isSameClass
            ? t('gsDupActionDuplicate')
            : t('gsDupActionImport');
        }
      }

      function refreshSourceTestOptions() {
        const srcClass = appState.classes.find(c => c.id === classSel.value);
        const sem = semSel.value;
        const count = srcClass && srcClass.testCounts ? (srcClass.testCounts[sem] || 0) : 0;
        testSel.innerHTML = count === 0
          ? `<option value="">${t('gsNoTestsInSem')}</option>`
          : Array.from({ length: count }, (_, i) => {
              const cfg = (srcClass.testConfigs && srcClass.testConfigs[sem] && srcClass.testConfigs[sem][i]) || null;
              const namePart = (cfg && cfg.testName) ? ` (${escapeHtml(cfg.testName)})` : '';
              return `<option value="${i}">T${i + 1}${namePart}</option>`;
            }).join("");
        updateDupContextHint();
      }

      function refreshDestTestOptions() {
        const destClass = appState.classes.find(c => c.id === destClassSel.value) || classObj;
        const destSem = destSemSel.value;
        const currentCount = destClass.testCounts ? (destClass.testCounts[destSem] || 0) : 0;
        const preselect = (prefill && prefill.destTestIndex != null && destClass.id === prefill.destClassId && destSem === prefill.destSem)
          ? prefill.destTestIndex
          : (appState.activeTest && destClass.id === (classObj && classObj.id) && appState.activeTest.semester === destSem
              ? appState.activeTest.testIndex : null);
        // Show existing slots + one new slot (to create)
        const maxSlot = Math.min(currentCount + 1, TEST_COUNT_PER_SEM);
        destTestSel.innerHTML = Array.from({ length: maxSlot }, (_, i) => {
          const cfg = (destClass.testConfigs && destClass.testConfigs[destSem] && destClass.testConfigs[destSem][i]) || null;
          const namePart = (cfg && cfg.testName) ? ` (${escapeHtml(cfg.testName)})` : '';
          const label = i < currentCount ? `T${i + 1}${namePart}` : `T${i + 1}${t('gsTestSlotNew')}`;
          const sel = preselect !== null ? i === preselect : i === currentCount;
          return `<option value="${i}"${sel ? " selected" : ""}>${label}</option>`;
        }).join("");
        updateDupContextHint();
      }

      classSel.onchange = () => { refreshSourceTestOptions(); };
      semSel.onchange = () => { refreshSourceTestOptions(); };
      destClassSel.onchange = () => { refreshDestTestOptions(); };
      destSemSel.onchange = () => { refreshDestTestOptions(); };

      refreshSourceTestOptions();
      if (prefill && prefill.srcTestIndex != null && testSel.querySelector(`option[value="${prefill.srcTestIndex}"]`)) {
        testSel.value = String(prefill.srcTestIndex);
      }
      refreshDestTestOptions();
      if (prefill && prefill.destTestIndex != null && destTestSel.querySelector(`option[value="${prefill.destTestIndex}"]`)) {
        destTestSel.value = String(prefill.destTestIndex);
      }
      updateDupContextHint();

      overlay.classList.remove("hidden");

      document.getElementById("dup-test-confirm").onclick = () => {
        const srcClass = appState.classes.find(c => c.id === classSel.value);
        const destClass = appState.classes.find(c => c.id === destClassSel.value);
        const srcSem = semSel.value;
        const srcTestIdx = Number(testSel.value);
        if (!srcClass || !destClass || testSel.value === "") return;

        const isSelected = elem => !!document.querySelector(`#dup-test-popup-overlay button[data-elem="${elem}"].active`);
        const anySelected = Array.from(elemChips).some(btn => btn.classList.contains("active"));

        if (!anySelected) {
          if (typeof showToast === 'function') showToast(t('gsDupErrNoElements') || 'Please select at least one element to copy.', true);
          return;
        }

        const destSem = destSemSel.value;
        const destTestIdx = Number(destTestSel.value);

        ensureClassStructures(srcClass);
        ensureClassStructures(destClass);
        const srcConfig = srcClass.testConfigs[srcSem][srcTestIdx];

        let destConfig = destClass.testConfigs[destSem][destTestIdx];
        if (!destConfig) {
          destConfig = createDefaultTestConfig();
        } else {
          destConfig = JSON.parse(JSON.stringify(destConfig));
        }

        if (isSelected("testName")) destConfig.testName = srcConfig.testName || "";
        if (isSelected("testDate")) {
          destConfig.testDate = srcConfig.testDate || "";
          destConfig.correctionDeadline = srcConfig.correctionDeadline || "";
          destConfig.correctionDeadlineTime = srcConfig.correctionDeadlineTime || "";
          destConfig.correctionDeadlineDaysAfter = (typeof srcConfig.correctionDeadlineDaysAfter === 'number') ? srcConfig.correctionDeadlineDaysAfter : 13;
          destConfig.correctionDeadlineAuto = srcConfig.correctionDeadlineAuto !== false;
          if (srcConfig.deadlineReminders) {
            destConfig.deadlineReminders = JSON.parse(JSON.stringify(srcConfig.deadlineReminders));
          }
        }
        if (isSelected("scope")) destConfig.scope = srcConfig.scope || "";
        if (isSelected("type")) destConfig.type = srcConfig.type || "";
        if (isSelected("observationSections")) {
          destConfig.observationSections = JSON.parse(JSON.stringify(srcConfig.observationSections || []));
          if (srcConfig.chipBank) destConfig.chipBank = srcConfig.chipBank;
        }

        if (isSelected("coefficient")) destConfig.coefficient = srcConfig.coefficient != null ? srcConfig.coefficient : 1;
        if (isSelected("fixedWeight")) destConfig.fixedWeight = srcConfig.fixedWeight != null ? srcConfig.fixedWeight : null;

        if (isSelected("grading")) destConfig.grading = JSON.parse(JSON.stringify(srcConfig.grading || {}));
        if (isSelected("nextGradeHighlightPoints")) destConfig.nextGradeHighlightPoints = srcConfig.nextGradeHighlightPoints != null ? srcConfig.nextGradeHighlightPoints : 0;

        if (isSelected("criteria")) destConfig.criteria = JSON.parse(JSON.stringify(srcConfig.criteria || []));

        if (isSelected("markingDecisions")) {
          const bankFn = getTestCriteriaBankFilename(destClass, destConfig);
          const srcDec = getScoringDecisionsForTest(srcClass.name, srcConfig.testName, bankFn);
          if (srcDec && srcDec.criteriaDecisions) {
            const destDec = ensureScoringDecisionsForTest(destClass.name, destConfig.testName, bankFn, {
              year: destClass.year || '',
              semester: destSem || '',
              testDate: destConfig.testDate || ''
            });
            destDec.criteriaDecisions = JSON.parse(JSON.stringify(srcDec.criteriaDecisions));
            saveScoringDecisionsToBank(bankFn);
          }
        }

        destClass.testConfigs[destSem][destTestIdx] = destConfig;

        // Auto-create the test slot if it doesn't exist yet
        if (destTestIdx >= (destClass.testCounts[destSem] || 0)) {
          destClass.testCounts[destSem] = destTestIdx + 1;
        }

        saveState();
        const successMsg = srcClass.id === destClass.id
          ? (t('gsToastTestConfigCopied') || 'Test configuration duplicated.')
          : (t('gsToastTestConfigCopied') || 'Test configuration imported.');
        if (typeof showToast === 'function') showToast(successMsg);

        // Navigate to the destination class and test
        appState.activeClassId = destClass.id;
        appState.activeTest = { semester: destSem, testIndex: destTestIdx };
        renderClasses();
        renderSummary();
        renderTestSheet();
        showScreen("test");
        overlay.classList.add("hidden");
      };

      document.getElementById("dup-test-cancel").onclick = () => overlay.classList.add("hidden");
      overlay.onclick = e => { if (e.target === overlay) overlay.classList.add("hidden"); };
    }

    async function addTest() {
      const classObj = getActiveClass();
      if (!classObj) return;
      await addTestForClass(classObj);
    }

    async function addTestForClass(classObj) {
      if (!classObj) return;
      ensureClassStructures(classObj);

      const sem = classObj.testCounts.sem1 < TEST_COUNT_PER_SEM ? "sem1" : "sem2";

      if (classObj.testCounts[sem] >= TEST_COUNT_PER_SEM) {
        await showAlert(tFmt('gsAlertMaxTests', { n: TEST_COUNT_PER_SEM }));
        return;
      }

      appState.activeClassId = classObj.id;
      const newTestIndex = classObj.testCounts[sem];
      classObj.testCounts[sem]++;
      saveState();
      renderSummary();
      appState.activeTest = { semester: sem, testIndex: newTestIndex };
      renderTestSheet();
      showScreen("test");
      openTestOptionsModal(getTestConfig(classObj, sem, newTestIndex), classObj, sem, newTestIndex, "info");
    }

    function openAddTestFromOverviewModal() {
      if (appState.classes.length === 0) return;
      if (appState.classes.length === 1) {
        addTestForClass(appState.classes[0]);
        return;
      }
      const sel = document.getElementById("add-test-overview-class-select");
      sel.innerHTML = appState.classes
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.year ? ' · ' + escapeHtml(c.year) : ''}</option>`)
        .join('');
      document.getElementById("add-test-overview-overlay").classList.remove("hidden");
    }

    function closeAddTestFromOverviewModal() {
      document.getElementById("add-test-overview-overlay").classList.add("hidden");
    }

    async function syncTestToPlanner(classObj, sem, testIndex) {
      if (!window.Desktop || !Desktop.isElectron()) return;
      const config = getTestConfig(classObj, sem, testIndex);
      if (!config.testDate) return;

      // Planner keys files and entries by the Group Editor ge-* UUID.
      // Fall back to the grade-sheet's own id-* for manually-created classes with no groupId.
      const plannerClassId = classObj.groupId || classObj.id;
      if (!plannerClassId) return;

      try {
        // Read existing planner file for this class
        let allByClass = {};
        const fileRes = await Desktop.readByPath('user', 'planner/' + plannerClassId + '.js');
        if (fileRes && fileRes.content) {
          try {
            const fake = {};
            new Function('window', fileRes.content)(fake);
            allByClass = fake.PLANNER_ENTRIES_BY_CLASS || {};
          } catch (e) {}
        }

        const list = (allByClass[plannerClassId] || []).slice();

        const classSlug = slugifyForPath(classObj.name);
        const gsLink = { classId: classObj.id, classSlug: classSlug, semester: sem, testIndex: testIndex };

        // 1. Entry already linked to this exact test slot
        const linkIdx = list.findIndex(e =>
          e.gsLink && e.gsLink.semester === sem && e.gsLink.testIndex === testIndex
        );
        // 2. Entry for the same class on the same date (no link yet)
        const dateIdx = linkIdx < 0
          ? list.findIndex(e => e.classId === plannerClassId && e.date === config.testDate && !(e.gsLink && e.gsLink.semester === sem && e.gsLink.testIndex === testIndex))
          : -1;

        let created = false;
        if (linkIdx >= 0) {
          list[linkIdx].date = config.testDate;
          if (config.testName) list[linkIdx].topic = config.testName;
          if (config.scope) list[linkIdx].objective = config.scope;
          list[linkIdx].gsLink = gsLink;
        } else if (dateIdx >= 0) {
          // Merge into the existing same-date entry
          list[dateIdx].type = 'test';
          list[dateIdx].gsLink = gsLink;
          if (config.testName) list[dateIdx].topic = config.testName;
          if (config.scope && !list[dateIdx].objective) list[dateIdx].objective = config.scope;
        } else {
          created = true;
          list.push({
            id: 'gs-' + plannerClassId + '-' + sem + '-' + testIndex + '-' + Date.now(),
            classId: plannerClassId,
            date: config.testDate,
            time: '', timeEnd: '',
            type: 'test',
            topic: config.testName || ('T' + (testIndex + 1)),
            objective: config.scope || '',
            readings: '', activities: '', homework: '', notes: '',
            reminder: null,
            gsLink: gsLink
          });
        }

        allByClass[plannerClassId] = list;
        const content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
          'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(plannerClassId) + '] = ' +
          JSON.stringify(list, null, 2) + ';\n';
        await Desktop.saveText('user', (plannerClassId || '__unassigned') + '.js', content, 'planner');
        showToast(created ? t('gsPlWriteOk') : t('gsPlUpdated'));
      } catch (e) {
        console.warn('syncTestToPlanner error:', e);
      }
    }

    async function syncTestsFromPlanner() {
      if (!window.Desktop || !Desktop.isElectron() || !Array.isArray(appState.classes) || !appState.classes.length) return false;
      try {
        const listResult = await Desktop.listByPath('user', 'planner', { extensions: ['.js'] });
        if (!listResult || !listResult.ok || !Array.isArray(listResult.files) || !listResult.files.length) return false;

        let changed = false;

        for (const file of listResult.files) {
          try {
            const res = await Desktop.readByPath('user', 'planner/' + file.filename);
            if (!res || !res.content) continue;
            const fake = {};
            new Function('window', res.content)(fake);
            const allByClass = fake.PLANNER_ENTRIES_BY_CLASS || {};
            const cids = Object.keys(allByClass);

            for (const cid of cids) {
              const pEntries = allByClass[cid];
              if (!Array.isArray(pEntries) || !pEntries.length) continue;

              const classObj = appState.classes.find(c => c.groupId === cid || c.id === cid ||
                (c.name && (c.name.toLowerCase() === cid.toLowerCase() || slugifyForPath(c.name).toLowerCase() === cid.toLowerCase())));

              if (!classObj) continue;
              ensureClassStructures(classObj);

              const testEntries = pEntries.filter(e => e && e.type === 'test');
              for (const te of testEntries) {
                if (!te.date) continue;
                const sem = (te.gsLink && (te.gsLink.semester === 'sem1' || te.gsLink.semester === 'sem2'))
                  ? te.gsLink.semester
                  : (classObj.semester === '2' ? 'sem2' : 'sem1');

                const configs = classObj.testConfigs[sem] || [];
                const currentCount = classObj.testCounts[sem] || 0;

                // Match existing test by date and topic first
                const sameDateIdx = configs.findIndex((cfg, idx) =>
                  idx < currentCount && cfg && cfg.testDate === te.date
                );

                let testIdx = -1;
                if (sameDateIdx >= 0 && (!configs[sameDateIdx].testName || !te.topic || configs[sameDateIdx].testName === te.topic)) {
                  // Prefer existing test slot on same date/topic to prevent duplicate tests
                  testIdx = sameDateIdx;
                  if (te.gsLink && typeof te.gsLink === 'object') te.gsLink.testIndex = testIdx;
                } else if (te.gsLink && typeof te.gsLink.testIndex === 'number' && te.gsLink.testIndex >= 0 && te.gsLink.testIndex < currentCount) {
                  testIdx = te.gsLink.testIndex;
                } else if (sameDateIdx >= 0) {
                  testIdx = sameDateIdx;
                  if (te.gsLink && typeof te.gsLink === 'object') te.gsLink.testIndex = testIdx;
                } else if (te.gsLink && typeof te.gsLink.testIndex === 'number' && te.gsLink.testIndex >= 0 && te.gsLink.testIndex < TEST_COUNT_PER_SEM) {
                  testIdx = te.gsLink.testIndex;
                } else {
                  for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
                    const cfg = configs[i];
                    const isOccupied = cfg && (cfg.testDate || cfg.testName || (Array.isArray(cfg.criteria) && cfg.criteria.length));
                    const hasScore = classObj.students.some(s => {
                      const tests = sem === 'sem1' ? s.sem1Tests : s.sem2Tests;
                      return Array.isArray(tests) && tests[i] != null;
                    });
                    if (!isOccupied && !hasScore) {
                      testIdx = i;
                      break;
                    }
                  }
                }

                if (testIdx >= 0 && testIdx < TEST_COUNT_PER_SEM) {
                  const cfg = configs[testIdx] || createDefaultTestConfig();
                  if (!cfg.testDate || cfg.testDate !== te.date) { cfg.testDate = te.date; changed = true; }
                  if (!cfg.testName && te.topic) { cfg.testName = te.topic; changed = true; }
                  if (!cfg.scope && te.objective) { cfg.scope = te.objective; changed = true; }
                  configs[testIdx] = cfg;
                  classObj.testConfigs[sem] = configs;
                  if ((classObj.testCounts[sem] || 0) <= testIdx) {
                    classObj.testCounts[sem] = testIdx + 1;
                    changed = true;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('syncTestsFromPlanner: error reading planner file', file.filename, e);
          }
        }

        if (changed) {
          saveState();
        }
        return changed;
      } catch (e) {
        console.warn('syncTestsFromPlanner error:', e);
        return false;
      }
    }

    async function addStudent() {
      const classObj = getActiveClass();
      if (!classObj) return;

      const full = await showPrompt(t('gsPromptAddStudents'));
      if (!full) return;
      const names = full.split(",").map(s => s.trim()).filter(s => s.length > 0);
      if (!names.length) return;
      names.forEach(name => {
        classObj.students.push(defaultStudent(classObj.students.length + 1, name));
      });
      classObj.students.forEach((s, i) => {
        s.index = i + 1;
      });

      saveState();
      renderSummary();
    }

    function openRenameModal() {
      const classObj = getActiveClass();
      if (!classObj) return;
      const diff = getRenameDiff(classObj);
      if (!diff) return;

      const container = document.getElementById('gs-rename-rows');
      container.innerHTML = '';

      diff.orphaned.forEach(student => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'flex:1;font-weight:600;color:var(--muted);';
        nameSpan.textContent = (student.firstName + (student.lastName ? ' ' + student.lastName : '')).trim();

        const arrow = document.createElement('span');
        arrow.innerHTML = '<img src="../assets/icons/arrow-right.svg" class="btn-icon" alt="" />';
        arrow.style.color = '#aaa';

        const sel = document.createElement('select');
        sel.className = 'input';
        sel.style.flex = '1.5';
        sel.dataset.orphanId = student.id;

        const noChange = document.createElement('option');
        noChange.value = '';
        noChange.textContent = t('gsRenamesKeepAsIs');
        sel.appendChild(noChange);

        diff.candidates.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = (c.firstName + (c.lastName ? ' ' + c.lastName : '')).trim();
          sel.appendChild(opt);
        });

        row.appendChild(nameSpan);
        row.appendChild(arrow);
        row.appendChild(sel);
        container.appendChild(row);
      });

      document.getElementById('gs-rename-overlay').classList.remove('hidden');
    }

    function applyRenames() {
      const classObj = getActiveClass();
      if (!classObj) return;

      const selects = document.querySelectorAll('#gs-rename-rows select');
      const toRemoveIds = new Set();
      let changed = false;

      selects.forEach(sel => {
        const candidateId = sel.value;
        if (!candidateId || toRemoveIds.has(candidateId)) return;
        const orphan = classObj.students.find(s => s.id === sel.dataset.orphanId);
        const candidate = classObj.students.find(s => s.id === candidateId);
        if (!orphan || !candidate) return;
        orphan.firstName = candidate.firstName;
        orphan.lastName = candidate.lastName;
        toRemoveIds.add(candidateId);
        changed = true;
      });

      if (changed) {
        classObj.students = classObj.students.filter(s => !toRemoveIds.has(s.id));
        classObj.students.forEach((s, i) => { s.index = i + 1; });
        saveState();
        renderSummary();
      }

      document.getElementById('gs-rename-overlay').classList.add('hidden');
    }

    async function openEditClassPopup() {
      const classObj = getActiveClass();
      if (!classObj) return;
      await loadAvailableCriteriaBanks();
      const overlay = document.getElementById("edit-class-overlay");
      const nameInput = document.getElementById("edit-class-name");
      const fromGroupEditor = isGroupEditorClass(classObj);
      nameInput.value = classObj.name || "";
      nameInput.disabled = fromGroupEditor;
      nameInput.title = fromGroupEditor ? "Class name is managed in Group Editor" : "";
      document.getElementById("edit-class-year").value = classObj.year || "";
      document.getElementById("edit-class-semester").value = classObj.semester || "";
      document.getElementById("edit-class-level").value = classObj.level || "";
      const checklist = document.getElementById("edit-class-criteria-banks-checklist");
      if (checklist) {
        checklist.innerHTML = "";
        const currentBanks = Array.isArray(classObj.criteriaBanks) && classObj.criteriaBanks.length
          ? classObj.criteriaBanks
          : [classObj.criteriaBank || 'correction-criteria.js'];
        _availableCriteriaBanks.forEach(bank => {
          const lbl = document.createElement("label");
          lbl.style.display = "flex";
          lbl.style.alignItems = "center";
          lbl.style.gap = "8px";
          lbl.style.fontSize = "0.82rem";
          lbl.style.cursor = "pointer";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = bank.filename;
          cb.checked = currentBanks.includes(bank.filename);

          const span = document.createElement("span");
          span.textContent = `${bank.name} (${Array.isArray(bank.criteria) ? bank.criteria.length : 0} criteria)`;

          lbl.append(cb, span);
          checklist.appendChild(lbl);
        });
      }
      overlay.classList.remove("hidden");
      (fromGroupEditor ? document.getElementById("edit-class-year") : nameInput).focus();
    }

    async function saveEditClass() {
      const classObj = getActiveClass();
      if (!classObj) return;
      const overlay = document.getElementById("edit-class-overlay");
      const fromGroupEditor = isGroupEditorClass(classObj);
      const name = fromGroupEditor ? classObj.name : document.getElementById("edit-class-name").value.trim();
      const year = document.getElementById("edit-class-year").value.trim();
      const semester = document.getElementById("edit-class-semester").value;
      const level = document.getElementById("edit-class-level").value;
      if (!name) {
        await showAlert(t('gsAlertClassNameEmpty'));
        return;
      }
      if (!year || !/^20\d{2}-20\d{2}$/.test(year)) {
        await showAlert(t('gsAlertYearInvalid'));
        return;
      }
      const duplicate = appState.classes.some(c => c.id !== classObj.id && c.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        await showAlert(t('gsAlertClassNameExists'));
        return;
      }
      classObj.name = name;
      classObj.year = year;
      classObj.semester = semester;
      classObj.level = level;

      const checklist = document.getElementById("edit-class-criteria-banks-checklist");
      if (checklist) {
        const checked = Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        if (checked.length > 0) {
          classObj.criteriaBanks = checked;
          classObj.criteriaBank = checked[0];
        }
      }
      saveState();
      overlay.classList.add("hidden");
      document.getElementById("summary-title").textContent = classObj.name + " - " + t('gsClassSummaryLabel');
      renderClasses();
    }

    async function deleteActiveClass() {
      const classObj = getActiveClass();
      if (!classObj) return;

      if (isGroupEditorClass(classObj)) {
        await showAlert(t('gsAlertCannotDeleteGroupEditorClass') || "Classes managed by Group Editor cannot be deleted from Grade Sheet. Please manage classes in Group Editor.");
        return;
      }

      const ok = await showConfirm(tFmt('gsConfirmDeleteClass', { name: classObj.name }));
      if (!ok) return;

      // Persist the deletion blocklist BEFORE modifying appState so it survives
      // even if the file-based structured load runs before saveState completes.
      markClassDeleted(classObj.id);

      appState.classes = appState.classes.filter(c => c.id !== classObj.id);
      appState.activeClassId = null;
      appState.activeTest = null;
      saveState();

      // Best-effort removal of grade files (not the primary guard — blocklist is).
      if (window.Desktop && Desktop.isElectron()) {
        const slug = slugifyForPath(classObj.name);
        Desktop.deleteByPath('grades', slug, { recursive: true, force: true })
          .catch(err => console.warn('deleteActiveClass: could not remove grade folder', slug, err));
        // Also clean up old sem1/{slug} / sem2/{slug} layout if present
        for (const sem of ['sem1', 'sem2']) {
          Desktop.deleteByPath('grades', `${sem}/${slug}`, { recursive: true, force: true })
            .catch(() => {});
        }
      }

      renderClasses();
      showScreen("classes");
    }

    async function unlinkTestFromPlanner(classObj, sem, ti) {
      if (!classObj || !window.Desktop || !Desktop.isElectron || !Desktop.isElectron() || typeof Desktop.readByPath !== 'function') return;
      try {
        const plannerClassId = classObj.groupId || classObj.id;
        const candidates = [plannerClassId, classObj.id, slugifyForPath(classObj.name), '__unassigned'].filter(Boolean);
        const checkedFiles = new Set();

        for (const cid of candidates) {
          const fn = cid + '.js';
          if (checkedFiles.has(fn)) continue;
          checkedFiles.add(fn);

          const res = await Desktop.readByPath('user', 'planner/' + fn);
          if (!res || !res.content) continue;

          let list = null;
          let allByClass = null;
          try {
            const fake = {};
            new Function('window', res.content)(fake);
            allByClass = fake.PLANNER_ENTRIES_BY_CLASS || {};
            list = (allByClass[cid] || []).slice();
          } catch (_) { continue; }

          if (!Array.isArray(list) || !list.length) continue;

          let changed = false;
          const newList = [];

          for (const e of list) {
            if (!e) continue;

            // 1. Correction deadline entries
            if (e.isCorrectionDeadline && e._gradeRef &&
                (e._gradeRef.classId === classObj.id || e._gradeRef.classId === classObj.groupId) &&
                e._gradeRef.semester === sem) {
              if (e._gradeRef.testIndex === ti) {
                changed = true;
                continue; // drop this deadline entry
              } else if (e._gradeRef.testIndex > ti) {
                e._gradeRef.testIndex--;
                changed = true;
              }
            }

            // 2. Test entries linked to Grade Sheet
            if (e.gsLink &&
                (e.gsLink.classId === classObj.id || e.gsLink.classId === classObj.groupId || e.gsLink.classSlug === slugifyForPath(classObj.name)) &&
                e.gsLink.semester === sem) {
              if (e.gsLink.testIndex === ti) {
                changed = true;
                if (e.id && String(e.id).startsWith('gs-')) {
                  continue; // drop GS-created entry
                } else {
                  e.gsLink = null; // unlink user-created planner entry
                }
              } else if (e.gsLink.testIndex > ti) {
                e.gsLink.testIndex--;
                changed = true;
              }
            }

            newList.push(e);
          }

          if (changed) {
            allByClass[cid] = newList;
            const content = 'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
              'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(cid) + '] = ' +
              JSON.stringify(newList, null, 2) + ';\n';
            await Desktop.saveText('user', fn, content, 'planner');
          }
        }
      } catch (err) {
        console.warn('unlinkTestFromPlanner error:', err);
      }
    }

    async function deleteTest(classObj, sem, ti) {
      if (!classObj || !sem || ti == null) return false;
      ensureClassStructures(classObj);
      if (!(await showConfirm(tFmt('gsConfirmDeleteTest', { n: ti + 1, sem: sem.toUpperCase() })))) return false;

      // 1. Unlink & shift linked entries in planner
      await unlinkTestFromPlanner(classObj, sem, ti);

      // 2. Shift testConfigs left from ti
      classObj.testConfigs[sem].splice(ti, 1);
      classObj.testConfigs[sem].push(createDefaultTestConfig());

      // 3. Shift student arrays left from ti
      classObj.students.forEach(student => {
        const arr = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
        arr.splice(ti, 1);
        arr.push(null);

        if (Array.isArray(student.testNotes[sem])) {
          student.testNotes[sem].splice(ti, 1);
          student.testNotes[sem].push([]);
        }
        if (Array.isArray(student.criteriaResults[sem])) {
          student.criteriaResults[sem].splice(ti, 1);
          student.criteriaResults[sem].push({});
        }
        if (student.gradeOverrides && Array.isArray(student.gradeOverrides[sem])) {
          student.gradeOverrides[sem].splice(ti, 1);
          student.gradeOverrides[sem].push(false);
        }
        if (student.correctionTime && Array.isArray(student.correctionTime[sem])) {
          student.correctionTime[sem].splice(ti, 1);
          student.correctionTime[sem].push(null);
        }
        if (student.correctedAt && Array.isArray(student.correctedAt[sem])) {
          student.correctedAt[sem].splice(ti, 1);
          student.correctedAt[sem].push(null);
        }
      });

      const oldTestCount = classObj.testCounts[sem] || 0;
      classObj.testCounts[sem] = Math.max(0, oldTestCount - 1);
      if (appState.activeTest && appState.activeClassId === classObj.id && appState.activeTest.semester === sem && appState.activeTest.testIndex === ti) {
        appState.activeTest = null;
      }

      // 4. Delete the shifted-off / excess test file from disk immediately
      if (window.Desktop && Desktop.isElectron && Desktop.isElectron() && typeof Desktop.deleteByPath === 'function') {
        for (let k = classObj.testCounts[sem]; k < TEST_COUNT_PER_SEM; k++) {
          const deadLabel = `${sem}-test-${String(k + 1).padStart(2, '0')}.js`;
          Desktop.deleteByPath('grades', `${classObj.id}/${deadLabel}`).catch(() => {});
          Desktop.deleteByPath('grades', `${slugifyForPath(classObj.name)}/${deadLabel}`).catch(() => {});
          _lastSavedTestDataJson.delete(`${classObj.id}/${sem}-test-${String(k + 1).padStart(2, '0')}`);
          _lastSavedTestDataJson.delete(`${slugifyForPath(classObj.name)}/${sem}-test-${String(k + 1).padStart(2, '0')}`);
        }
      }

      // 5. Persist the updated class and shifted tests
      saveState(classObj.id, sem);

      // 6. Refresh all views immediately
      renderClasses();
      renderAllTests();
      renderSummary();
      if (appState.currentScreen === "test") {
        if (appState.activeTest == null) {
          showScreen("summary");
        } else {
          renderTestSheet();
        }
      }

      if (typeof showToast === 'function') {
        showToast(t('gsToastTestDeleted') || 'Test deleted successfully.');
      }
      return true;
    }

    async function deleteActiveTest() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      return deleteTest(classObj, appState.activeTest.semester, appState.activeTest.testIndex);
    }

    async function clearActiveTest() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;

      const ok = await showConfirm(t('gsConfirmClearTest'));
      if (!ok) return;

      const sem = appState.activeTest.semester;
      const ti = appState.activeTest.testIndex;
      classObj.students.forEach(student => {
        if (sem === "sem1") {
          student.sem1Tests[ti] = null;
        } else {
          student.sem2Tests[ti] = null;
        }
        student.testNotes[sem][ti] = [];
        student.criteriaResults[sem][ti] = {};
        if (student.gradeOverrides && Array.isArray(student.gradeOverrides[sem])) {
          student.gradeOverrides[sem][ti] = false;
        }
        if (student.correctionTime && Array.isArray(student.correctionTime[sem])) {
          student.correctionTime[sem][ti] = null;
        }
        if (student.correctedAt && Array.isArray(student.correctedAt[sem])) {
          student.correctedAt[sem][ti] = null;
        }
      });

      saveState();
      renderTestSheet();
      renderSummary();
    }


    function normalizeStudentName(s) {
      return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    }

    function findStudentByName(classObj, name) {
      if (!classObj || !Array.isArray(classObj.students) || !name) return null;
      const norm = normalizeStudentName(name);
      if (!norm) return null;

      // 1. Direct comparisons
      for (const s of classObj.students) {
        const fn = normalizeStudentName(s.firstName || "");
        const ln = normalizeStudentName(s.lastName || "");
        const custom = normalizeStudentName(s.customName || "");
        const full1 = (fn + " " + ln).trim();
        const full2 = (ln + " " + fn).trim();
        if (full1 === norm || full2 === norm || custom === norm || fn === norm || ln === norm) return s;
      }

      // 2. Token set comparison
      const normTokens = norm.split(/\s+/).filter(Boolean);
      for (const s of classObj.students) {
        const fn = normalizeStudentName(s.firstName || "");
        const ln = normalizeStudentName(s.lastName || "");
        const custom = normalizeStudentName(s.customName || "");
        const studentTokens = `${fn} ${ln} ${custom}`.split(/\s+/).filter(Boolean);
        const sSet = new Set(studentTokens);
        const matches = normTokens.filter(t => sSet.has(t));
        if (matches.length >= 2 && matches.length >= Math.min(normTokens.length, studentTokens.length)) {
          return s;
        }
        if (normTokens.length === 1 && studentTokens.includes(normTokens[0])) {
          return s;
        }
      }

      // 3. Substring inclusion
      for (const s of classObj.students) {
        const fn = normalizeStudentName(s.firstName || "");
        const ln = normalizeStudentName(s.lastName || "");
        const full1 = (fn + " " + ln).trim();
        const full2 = (ln + " " + fn).trim();
        if ((full1 && (norm.includes(full1) || full1.includes(norm))) ||
            (full2 && (norm.includes(full2) || full2.includes(norm)))) {
          return s;
        }
      }

      return null;
    }

    function importGradesFromJson(file) {
      const reader = new FileReader();
      reader.onload = async () => {
        let parsed;
        try {
          parsed = JSON.parse(String(reader.result || "{}"));
        } catch (err) {
          await showAlert(t('gsAlertImportFailedJson'));
          return;
        }
        openImportGradesModal(parsed);
      };
      reader.readAsText(file);
    }

    function openImportGradesModal(parsed) {
      // Supported JSON formats:
      // { "class":"3A", "semester":"sem1", "test":1, "students":[{"name":"Alice","grade":4.5}], "criteria":[...], "studentCriteriaScores":{"Alice":{"crit1":4}} }
      // { "grades": { "Alice": 4.5 } }
      let hintClass = parsed.classId || parsed.groupId || parsed.classGroupId || parsed.class || parsed.className || null;
      let hintSem = parsed.semester || null;
      let hintTest = (parsed.test != null && parsed.test !== 'next') ? Number(parsed.test) : ((parsed.testIndex != null && parsed.testIndex !== 'next') ? Number(parsed.testIndex) + 1 : null); // 1-based

      if (hintSem) {
        const s = String(hintSem).trim().toLowerCase();
        hintSem = (s === "1" || s === "sem1") ? "sem1" : (s === "2" || s === "sem2") ? "sem2" : null;
      }

      let entries = [];
      if (Array.isArray(parsed.students)) {
        entries = parsed.students.map(s => ({
          studentId: s.studentId || s.id || null,
          name: s.name || s.firstName || "",
          grade: s.grade != null ? Number(s.grade) : null,
          criteriaResults: s.criteriaResults || null
        }));
      } else if (Array.isArray(parsed.results)) {
        entries = parsed.results.map(r => ({
          studentId: r.studentId || null,
          name: r.name || "",
          grade: r.score != null ? Number(r.score) : null,
          criteriaResults: r.criteriaResults || null
        }));
      } else if (Array.isArray(parsed.grades)) {
        entries = parsed.grades.map(s => ({ name: s.name || "", grade: s.grade != null ? Number(s.grade) : null }));
      } else if (parsed.grades && typeof parsed.grades === "object") {
        entries = Object.entries(parsed.grades).map(([name, grade]) => ({ name, grade: grade != null ? Number(grade) : null }));
      }

      if (!entries.length) {
        showAlert(t('gsAlertNoGradeEntries'));
        return;
      }

      const overlay = document.getElementById("import-grades-overlay");
      const classSelect = document.getElementById("ig-class-select");
      const semSelect = document.getElementById("ig-sem-select");
      const testSelect = document.getElementById("ig-test-select");
      const previewBody = document.getElementById("ig-preview-body");
      const previewStats = document.getElementById("ig-preview-stats");
      const applyBtn = document.getElementById("ig-apply-btn");
      const newTestBtn = document.getElementById("ig-new-test-btn");

      const linkBox = document.getElementById("ig-participation-link-box");
      const linkCb = document.getElementById("ig-link-participation");
      const linkScopeRow = document.getElementById("ig-link-scope-row");
      const linkDateMode = document.getElementById("ig-link-date-mode");
      const linkCustomDates = document.getElementById("ig-link-custom-dates");
      const linkDateFrom = document.getElementById("ig-link-date-from");
      const linkDateTo = document.getElementById("ig-link-date-to");

      const isPtSource = !!(parsed && (parsed.source === 'participation-tracker' || (parsed.testConfig && parsed.testConfig.source === 'participation-tracker') || parsed.linkParticipation != null));
      if (linkBox && linkCb) {
        linkBox.classList.toggle("hidden", !isPtSource);
        linkCb.checked = !!(parsed && parsed.linkParticipation);
        if (linkDateMode) linkDateMode.value = (parsed && parsed.dateMode) ? parsed.dateMode : 'semester';
        if (linkDateFrom) linkDateFrom.value = (parsed && parsed.dateFrom) ? parsed.dateFrom : '';
        if (linkDateTo) linkDateTo.value = (parsed && parsed.dateTo) ? parsed.dateTo : '';
        const updateLinkScopeUi = () => {
          if (linkScopeRow) linkScopeRow.classList.toggle("hidden", !linkCb.checked);
          if (linkCustomDates && linkDateMode) linkCustomDates.classList.toggle("hidden", linkDateMode.value !== 'custom');
        };
        linkCb.onchange = updateLinkScopeUi;
        if (linkDateMode) linkDateMode.onchange = updateLinkScopeUi;
        updateLinkScopeUi();
      }

      if (newTestBtn) {
        newTestBtn.onclick = async () => {
          const classObj = appState.classes.find(c => c.id === classSelect.value);
          if (!classObj) return;
          const sem = semSelect.value;
          if (classObj.testCounts[sem] >= TEST_COUNT_PER_SEM) {
            await showAlert(tFmt('gsAlertMaxTests', { n: TEST_COUNT_PER_SEM }));
            return;
          }
          classObj.testCounts[sem] = Math.min(TEST_COUNT_PER_SEM, (classObj.testCounts[sem] || 0) + 1);
          refreshTestOptions();
          testSelect.value = String(classObj.testCounts[sem] - 1);
          refreshPreview();
        };
      }

      // Populate class options
      classSelect.innerHTML = appState.classes.map(c =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name || 'Unnamed')}</option>`
      ).join("");

      if (hintClass) {
        const found = appState.classes.find(c =>
          c.id === hintClass || c.groupId === hintClass || c.name.toLowerCase() === String(hintClass).toLowerCase()
        );
        if (found) classSelect.value = found.id;
      } else if (appState.activeClassId) {
        classSelect.value = appState.activeClassId;
      }

      if (hintSem) semSelect.value = hintSem;
      else if (appState.activeTest) semSelect.value = appState.activeTest.semester;

      function refreshTestOptions() {
        const classObj = appState.classes.find(c => c.id === classSelect.value);
        if (!classObj) return;
        ensureClassStructures(classObj);
        const sem = semSelect.value;
        const count = classObj.testCounts[sem] || 0;
        const configs = (classObj.testConfigs && classObj.testConfigs[sem]) || [];

        let html = "";
        for (let i = 0; i < count; i++) {
          const cfg = configs[i];
          const label = cfg && cfg.testName ? `T${i + 1}: ${cfg.testName}` : `T${i + 1}`;
          html += `<option value="${i}">${escapeHtml(label)}</option>`;
        }
        testSelect.innerHTML = html;

        const reqNext = parsed && (parsed.test === 'next' || parsed.testIndex === 'next');
        if (reqNext) {
          let emptySlot = -1;
          for (let i = 0; i < count; i++) {
            const hasGrades = (classObj.students || []).some(s => {
              const arr = sem === 'sem1' ? s.sem1Tests : s.sem2Tests;
              return arr && arr[i] != null;
            });
            const cfg = configs[i];
            const hasCfg = cfg && (cfg.testName || cfg.testDate || (Array.isArray(cfg.criteria) && cfg.criteria.length > 0));
            if (!hasGrades && !hasCfg) {
              emptySlot = i;
              break;
            }
          }
          if (emptySlot >= 0) {
            testSelect.value = String(emptySlot);
          } else if (count < TEST_COUNT_PER_SEM) {
            classObj.testCounts[sem] = count + 1;
            refreshTestOptions();
            testSelect.value = String(count);
          } else if (count > 0) {
            testSelect.value = String(count - 1);
          }
        } else if (hintTest != null && hintTest >= 1 && hintTest <= count) {
          testSelect.value = String(hintTest - 1);
        } else if (appState.activeTest && appState.activeTest.semester === sem && appState.activeTest.testIndex < count) {
          testSelect.value = String(appState.activeTest.testIndex);
        } else if (count > 0) {
          testSelect.value = "0";
        }
      }

      function refreshPreview() {
        const classObj = appState.classes.find(c => c.id === classSelect.value);
        if (!classObj || testSelect.value === "") {
          previewBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">${t('gsImportGradesNoTestSelected')}</td></tr>`;
          previewStats.textContent = "";
          applyBtn.disabled = true;
          return;
        }
        const sem = semSelect.value;
        const ti = Number(testSelect.value);
        let matched = 0, changed = 0, notFound = 0;
        previewBody.innerHTML = "";

        entries.forEach(entry => {
          const student = (entry.studentId && classObj.students.find(s => s.id === entry.studentId)) ||
                          findStudentByName(classObj, entry.name);
          const tr = document.createElement("tr");
          if (!student) {
            notFound++;
            tr.style.background = "#fff5f5";
            tr.innerHTML = `<td style="color:var(--warn);font-style:italic;padding:5px 10px;">${escapeHtml(entry.name)}</td><td colspan="4" style="color:var(--warn);font-style:italic;padding:5px 10px;">Not found in class</td>`;
          } else {
            matched++;
            const arr = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
            const current = arr[ti];
            let newGrade = entry.grade != null && !isNaN(entry.grade) ? Math.round(entry.grade * 2) / 2 : null;

            if (newGrade == null && parsed && Array.isArray(parsed.criteria) && parsed.criteria.length > 0 &&
                parsed.studentCriteriaScores && (parsed.studentCriteriaScores[entry.name] || (entry.studentId && parsed.studentCriteriaScores[entry.studentId]))) {
              const testCfg = classObj.testConfigs[sem][ti] || createDefaultTestConfig();
              const mergedCfg = Object.assign({}, testCfg, {
                criteria: parsed.criteria.map(c => ({
                  id: c.id,
                  name: c.name,
                  minPoints: c.minPoints != null && !isNaN(Number(c.minPoints)) ? Number(c.minPoints) : 0,
                  maxPoints: c.maxPoints != null && !isNaN(Number(c.maxPoints)) ? Math.max(c.minPoints != null ? Number(c.minPoints) : 0, Number(c.maxPoints)) : 1,
                  pointCoefficient: c.pointCoefficient != null && !isNaN(Number(c.pointCoefficient)) ? Math.max(0, Number(c.pointCoefficient)) : 1,
                  interval: c.interval != null && !isNaN(Number(c.interval)) && Number(c.interval) > 0 ? Number(c.interval) : 0.5,
                  isBonus: !!c.bonus
                }))
              });
              const criteriaMap = parsed.studentCriteriaScores[entry.name] || (entry.studentId && parsed.studentCriteriaScores[entry.studentId]);
              const totals = calcCriteriaTotals(mergedCfg, criteriaMap);
              if (totals.totalPossible > 0) {
                const scored = (totals.totalScored || 0) + (totals.totalBonusScored || 0);
                const ratio = totals.totalPossible > 0 ? Math.max(0, Math.min(1, scored / totals.totalPossible)) : 0;
                if (mergedCfg.grading && mergedCfg.grading.mode === "equation") {
                  const passPercent = mergedCfg.grading.passPercentGrade4 || 66.67;
                  const passPts = totals.totalPossible * (passPercent / 100);
                  const res = evaluateGradingEquation(mergedCfg.grading.equationFormula, {
                    pts: scored,
                    totalPts: totals.totalPossible,
                    minPts: 0,
                    passPts,
                    maxGrade: mergedCfg.grading.maxGrade != null ? mergedCfg.grading.maxGrade : 6,
                    minGrade: mergedCfg.grading.minGrade != null ? mergedCfg.grading.minGrade : 1.5,
                    passGrade: 4,
                    rounding: mergedCfg.grading.equationRounding || "0.5"
                  });
                  newGrade = (res && res.ok && res.grade != null) ? res.grade : gradeFromRatio(ratio, mergedCfg);
                } else {
                  newGrade = gradeFromRatio(ratio, mergedCfg);
                }
              }
            }
            const willChange = newGrade !== current && newGrade != null;
            if (willChange) changed++;
            const currentStr = current != null ? fmtN(current) : "—";
            const newStr = newGrade != null ? fmtN(newGrade) : "—";
            let changeHtml, rowBg;
            if (!willChange) {
              changeHtml = `<span style="color:var(--muted);">${t('gsImportGradesNoChange')}</span>`;
              rowBg = "";
            } else if (current == null || newGrade > current) {
              changeHtml = `<span style="color:var(--ok);font-weight:700;">${escapeHtml(currentStr)} → ${escapeHtml(newStr)}</span>`;
              rowBg = "#f0faf3";
            } else {
              changeHtml = `<span style="color:var(--warn);font-weight:700;">${escapeHtml(currentStr)} → ${escapeHtml(newStr)}</span>`;
              rowBg = "#fff8f0";
            }
            const matchedName = escapeHtml((student.firstName + " " + student.lastName).trim());
            tr.style.background = rowBg;
            tr.innerHTML = `
              <td style="padding:5px 10px;">${escapeHtml(entry.name || matchedName)}</td>
              <td style="text-align:center;padding:5px 10px;">${escapeHtml(currentStr)}</td>
              <td style="text-align:center;padding:5px 10px;">${escapeHtml(newStr)}</td>
              <td style="text-align:center;padding:5px 10px;">${changeHtml}</td>
              <td style="padding:5px 10px;font-size:0.8em;color:var(--muted);">${matchedName}</td>
            `;
          }
          previewBody.appendChild(tr);
        });

        previewStats.textContent = tFmt('gsImportGradesSummary', { matched, changed, notFound });
        applyBtn.disabled = (changed === 0);
      }

      classSelect.onchange = () => { refreshTestOptions(); refreshPreview(); };
      semSelect.onchange = () => { refreshTestOptions(); refreshPreview(); };
      testSelect.onchange = () => refreshPreview();

      refreshTestOptions();
      refreshPreview();

      document.getElementById("ig-cancel-btn").onclick = () => overlay.classList.add("hidden");
      overlay.onclick = e => { if (e.target === overlay) overlay.classList.add("hidden"); };

      applyBtn.onclick = () => {
        const classObj = appState.classes.find(c => c.id === classSelect.value);
        if (!classObj || testSelect.value === "") return;
        const sem = semSelect.value;
        const ti = Number(testSelect.value);
        let applied = 0;

        ensureClassStructures(classObj);

        // If criteria (rule questions) are present in the import payload, set them on the test
        if (parsed && Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
          const cfg = classObj.testConfigs[sem][ti] || createDefaultTestConfig();
          cfg.criteria = parsed.criteria.map(c => ({
            id: c.id,
            name: c.name,
            minPoints: c.minPoints != null && !isNaN(Number(c.minPoints)) ? Number(c.minPoints) : 0,
            maxPoints: c.maxPoints != null && !isNaN(Number(c.maxPoints)) ? Math.max(c.minPoints != null ? Number(c.minPoints) : 0, Number(c.maxPoints)) : 1,
            pointCoefficient: c.pointCoefficient != null && !isNaN(Number(c.pointCoefficient)) ? Math.max(0, Number(c.pointCoefficient)) : 1,
            interval: c.interval != null && !isNaN(Number(c.interval)) && Number(c.interval) > 0 ? Number(c.interval) : 0.5,
            isBonus: !!c.bonus
          }));
          if (parsed.testConfig && parsed.testConfig.testName) {
            cfg.testName = parsed.testConfig.testName;
          }
          if (parsed.testConfig && parsed.testConfig.testDate) {
            cfg.testDate = parsed.testConfig.testDate;
          }
          if (parsed.testConfig && parsed.testConfig.type) {
            cfg.type = parsed.testConfig.type;
          }
          if (parsed.testConfig && parsed.testConfig.source) {
            cfg.source = parsed.testConfig.source;
          }
          if (parsed.testConfig && parsed.testConfig.grading) {
            cfg.grading = Object.assign({}, cfg.grading, parsed.testConfig.grading);
          }
          if (isParticipationTestConfig(cfg)) {
            syncParticipationGradingScale(cfg, parsed.maxGrade || (parsed.testConfig && parsed.testConfig.grading && parsed.testConfig.grading.maxGrade));
          }
          classObj.testConfigs[sem][ti] = cfg;
        } else if (parsed && parsed.testConfig) {
          const cfg = classObj.testConfigs[sem][ti] || createDefaultTestConfig();
          if (parsed.testConfig.testName) cfg.testName = parsed.testConfig.testName;
          if (parsed.testConfig.testDate) cfg.testDate = parsed.testConfig.testDate;
          if (parsed.testConfig.type) cfg.type = parsed.testConfig.type;
          if (parsed.testConfig.source) cfg.source = parsed.testConfig.source;
          if (parsed.testConfig.grading) cfg.grading = Object.assign({}, cfg.grading, parsed.testConfig.grading);
          if (isParticipationTestConfig(cfg)) {
            syncParticipationGradingScale(cfg, parsed.maxGrade || (parsed.testConfig && parsed.testConfig.grading && parsed.testConfig.grading.maxGrade));
          }
          classObj.testConfigs[sem][ti] = cfg;
        }

        entries.forEach(entry => {
          const student = (entry.studentId && classObj.students.find(s => s.id === entry.studentId)) ||
                          findStudentByName(classObj, entry.name);
          if (!student) return;
          const rawGrade = entry.grade != null && !isNaN(entry.grade) ? entry.grade : null;
          const newGrade = rawGrade != null ? Math.round(rawGrade * 2) / 2 : null;
          if (newGrade != null) {
            const arr = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
            if (newGrade !== arr[ti]) {
              arr[ti] = newGrade;
              applied++;
            }
          }

          // Apply per-criterion points if present
          const critScores = entry.criteriaResults || (parsed && parsed.studentCriteriaScores && (parsed.studentCriteriaScores[entry.name] || (entry.studentId && parsed.studentCriteriaScores[entry.studentId])));
          if (critScores && typeof critScores === 'object') {
            if (!student.criteriaResults) {
              student.criteriaResults = {
                sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({})),
                sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}))
              };
            }
            if (!student.criteriaResults[sem]) {
              student.criteriaResults[sem] = Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}));
            }
            student.criteriaResults[sem][ti] = Object.assign({}, critScores);
          }
        });

        const hasExplicitGrades = entries.some(e => e.grade != null && !isNaN(e.grade));
        if (!hasExplicitGrades && parsed && Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
          recalcAllStudentGradesForTest(classObj, sem, ti);
        }

        const importedCfg = classObj.testConfigs[sem][ti];
        entries.forEach(entry => {
          const student = (entry.studentId && classObj.students.find(s => s.id === entry.studentId)) ||
                          findStudentByName(classObj, entry.name);
          if (student && isStudentScoredForTest(student, sem, ti, importedCfg)) {
            recordStudentCorrectionTimestamp(student, classObj, sem, ti, importedCfg);
          }
        });

        if (isPtSource && linkCb && linkCb.checked) {
          const cfg = classObj.testConfigs[sem][ti] || createDefaultTestConfig();
          cfg.source = 'participation-tracker';
          cfg.type = cfg.type || 'participation';
          cfg.participationLink = {
            enabled: true,
            groupId: classObj.groupId || (parsed && (parsed.groupId || parsed.classGroupId || parsed.classId)) || classObj.id,
            dateMode: linkDateMode ? linkDateMode.value : 'semester',
            dateFrom: (linkDateMode && linkDateMode.value === 'custom' && linkDateFrom) ? linkDateFrom.value : '',
            dateTo: (linkDateMode && linkDateMode.value === 'custom' && linkDateTo) ? linkDateTo.value : '',
            useGroupRules: true,
            rulesSnapshot: (parsed && parsed.rulesConfig) ? parsed.rulesConfig : null,
            lastSyncedAt: new Date().toISOString(),
            lastDigest: ''
          };
          classObj.testConfigs[sem][ti] = cfg;
        }

        saveState();
        appState.activeClassId = classObj.id;
        appState.activeTest = { semester: sem, testIndex: ti };
        renderSummary();
        renderTestSheet();
        showScreen("test");
        overlay.classList.add("hidden");
        showAlert(tFmt('gsAlertGradesUpdated', { n: applied, s: applied !== 1 ? 's' : '' }));
      };

      overlay.classList.remove("hidden");
    }


    function updateParticipationLinkBadge(classObj, sem, testIndex) {
      const badge = document.getElementById("test-participation-badge");
      if (!badge) return;
      const cfg = classObj && classObj.testConfigs && classObj.testConfigs[sem] && classObj.testConfigs[sem][testIndex];
      const link = cfg && cfg.participationLink;
      if (link && link.enabled) {
        badge.classList.remove("hidden");
        const scopeLabel = link.dateMode === "custom"
          ? `${link.dateFrom || "..."} -> ${link.dateTo || "..."}`
          : (link.dateMode === "all" ? (t('gsPlScopeAll') || 'All Sessions') : (t('gsPlScopeSemester') || 'Current Term'));
        const syncedStr = link.lastSyncedAt ? new Date(link.lastSyncedAt).toLocaleString() : '—';
        badge.title = `${scopeLabel} | Last synced: ${syncedStr}`;
      } else {
        badge.classList.add("hidden");
      }
    }

    function applyParticipationPayloadToTest(classObj, sem, ti, payload) {
      if (!classObj || !payload) return false;
      ensureClassStructures(classObj);
      const cfg = classObj.testConfigs[sem][ti] || createDefaultTestConfig();
      const link = cfg.participationLink || {};

      if (link.lastDigest && link.lastDigest === payload.digest) {
        return false;
      }

      let changed = false;
      cfg.source = 'participation-tracker';
      cfg.type = cfg.type || 'participation';
      if (!cfg.testName) {
        cfg.testName = t('ptParticipationTestName') || 'Participation';
      }

      const prevCriteriaById = new Map();
      (cfg.criteria || []).forEach(c => {
        if (c && c.id) prevCriteriaById.set(c.id, c);
      });

      cfg.criteria = payload.criteria.map(c => {
        const prev = prevCriteriaById.get(c.id);
        const hasCustomMax = prev && prev._ptBaseMaxPoints != null && prev.maxPoints !== prev._ptBaseMaxPoints;
        const hasCustomMin = prev && prev._ptBaseMinPoints != null && prev.minPoints !== prev._ptBaseMinPoints;
        return {
          id: c.id,
          name: (prev && prev.name && prev._ptBaseName && prev.name !== prev._ptBaseName) ? prev.name : c.name,
          _ptBaseName: c.name,
          minPoints: hasCustomMin ? prev.minPoints : c.minPoints,
          _ptBaseMinPoints: c.minPoints,
          maxPoints: hasCustomMax ? prev.maxPoints : c.maxPoints,
          _ptBaseMaxPoints: c.maxPoints,
          pointCoefficient: (prev && prev.pointCoefficient != null) ? prev.pointCoefficient : (c.pointCoefficient != null ? c.pointCoefficient : 1),
          interval: (prev && prev.interval != null) ? prev.interval : (c.interval != null ? c.interval : 0.5),
          isBonus: prev ? !!prev.isBonus : !!c.isBonus,
          showComment: prev && prev.showComment !== undefined ? prev.showComment : true,
          competenceIds: (prev && Array.isArray(prev.competenceIds)) ? prev.competenceIds : []
        };
      });

      if (!cfg.grading || !cfg.grading.customManualScale) {
        cfg.grading = Object.assign({}, cfg.grading, {
          mode: 'manual',
          manualInputMode: 'points',
          maxGrade: payload.maxGrade,
          minGrade: 0,
          interval: 0.5
        });
        syncParticipationGradingScale(cfg, payload.maxGrade);
      } else {
        syncGradingPointsForCriteriaChange(cfg);
      }

      const hasCustomCriterionWeights = (cfg.criteria || []).some((c, idx) => {
        const src = payload.criteria[idx];
        if (!src) return true;
        return (c.pointCoefficient != null && c.pointCoefficient !== 1) ||
               !!c.isBonus !== !!src.isBonus ||
               c.maxPoints !== src.maxPoints ||
               c.minPoints !== src.minPoints;
      }) || !!(cfg.grading && cfg.grading.customManualScale);

      (classObj.students || []).forEach(student => {
        const sUuid = student.id || student.uuid;
        let newGrade = null;
        let critScores = null;

        if (sUuid && payload.gradesByUuid && payload.gradesByUuid[sUuid] != null) {
          newGrade = payload.gradesByUuid[sUuid];
          critScores = payload.studentCriteriaScoresByUuid && payload.studentCriteriaScoresByUuid[sUuid];
        } else {
          const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
          const revName = `${student.lastName || ''} ${student.firstName || ''}`.trim();
          const candidates = [student.customName, fullName, revName, student.firstName].filter(Boolean);
          for (const cand of candidates) {
            if (payload.grades && payload.grades[cand] != null) {
              newGrade = payload.grades[cand];
              critScores = payload.studentCriteriaScores && payload.studentCriteriaScores[cand];
              break;
            }
          }
          if (newGrade == null && payload.grades) {
            const lowerEntries = Object.keys(payload.grades);
            for (const key of lowerEntries) {
              if (findStudentByName(classObj, key) === student) {
                newGrade = payload.grades[key];
                critScores = payload.studentCriteriaScores && payload.studentCriteriaScores[key];
                break;
              }
            }
          }
        }

        if (critScores && typeof critScores === 'object') {
          if (!student.criteriaResults) {
            student.criteriaResults = {
              sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({})),
              sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}))
            };
          }
          if (!student.criteriaResults[sem]) {
            student.criteriaResults[sem] = Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}));
          }
          const prevStr = JSON.stringify(student.criteriaResults[sem][ti] || {});
          const nextStr = JSON.stringify(critScores);
          if (prevStr !== nextStr) {
            student.criteriaResults[sem][ti] = Object.assign({}, critScores);
            changed = true;
          }
        }

        if (hasCustomCriterionWeights && critScores && typeof critScores === 'object') {
          if (!isGradeOverrideEnabled(student, sem, ti)) {
            const arr = sem === 'sem1' ? student.sem1Tests : student.sem2Tests;
            const prevG = arr[ti];
            recalcStudentGradeFromCriteria(student, sem, ti, cfg);
            if (arr[ti] !== prevG) changed = true;
          }
        } else if (newGrade != null && !isNaN(newGrade)) {
          if (!isGradeOverrideEnabled(student, sem, ti)) {
            const arr = sem === 'sem1' ? student.sem1Tests : student.sem2Tests;
            const rounded = Math.round(newGrade * 2) / 2;
            if (arr[ti] !== rounded) {
              arr[ti] = rounded;
              changed = true;
            }
          }
        }
      });

      link.lastDigest = payload.digest;
      link.lastSyncedAt = new Date().toISOString();
      if (payload.rulesConfig) link.rulesSnapshot = payload.rulesConfig;
      cfg.participationLink = link;
      classObj.testConfigs[sem][ti] = cfg;
      return changed || true;
    }

    let _ptSyncInFlight = false;
    async function syncLinkedParticipationGrades(options = {}) {
      if (_ptSyncInFlight) return 0;
      if (!window.ParticipationGrading || typeof ParticipationGrading.computeLinkedTestPayload !== 'function') return 0;
      if (!Array.isArray(appState.classes) || appState.classes.length === 0) return 0;

      const linkedSlots = [];
      for (const cls of appState.classes) {
        if (!cls || !cls.testConfigs) continue;
        if (options.groupId && cls.groupId !== options.groupId && cls.id !== options.groupId && cls.name !== options.groupId) {
          continue;
        }
        for (const sem of ['sem1', 'sem2']) {
          const count = (cls.testCounts && cls.testCounts[sem]) || 0;
          const cfgs = cls.testConfigs[sem] || [];
          for (let ti = 0; ti < count; ti++) {
            const cfg = cfgs[ti];
            if (cfg && cfg.participationLink && cfg.participationLink.enabled) {
              linkedSlots.push({ cls, sem, ti, cfg });
            }
          }
        }
      }
      if (linkedSlots.length === 0) return 0;

      _ptSyncInFlight = true;
      let updatedCount = 0;
      try {
        const cachedSessions = await ParticipationGrading.loadAllParticipationSessions();
        const cachedRules = await ParticipationGrading.loadRulesFromDisk();

        for (const { cls, sem, ti, cfg } of linkedSlots) {
          const link = cfg.participationLink;
          const payload = await ParticipationGrading.computeLinkedTestPayload({
            groupId: link.groupId || cls.groupId || cls.id,
            className: cls.name,
            dateMode: link.dateMode || 'semester',
            dateFrom: link.dateFrom || '',
            dateTo: link.dateTo || '',
            semester: sem,
            useGroupRules: link.useGroupRules !== false,
            rulesSnapshot: link.rulesSnapshot || null,
            interval: (cfg.grading && cfg.grading.interval) || 0.5,
            cachedSessions,
            cachedRules
          });
          if (!payload) continue;
          if (!options.force && link.lastDigest === payload.digest) continue;

          const didChange = applyParticipationPayloadToTest(cls, sem, ti, payload);
          if (didChange) {
            saveState(cls.id, sem, ti);
            updatedCount++;
          }
        }

        if (updatedCount > 0) {
          if (appState.currentScreen === 'classes') renderClasses();
          if (appState.activeClassId) {
            renderSummary();
            if (appState.currentScreen === 'test' && appState.activeTest) {
              renderTestSheet();
            }
          }
          if (!options.silent && typeof showToast === 'function') {
            showToast(tFmt('gsToastParticipationSynced', { n: updatedCount }) || `Updated ${updatedCount} linked participation test(s).`);
          }
        }
      } catch (e) {
        console.warn('syncLinkedParticipationGrades error:', e);
      } finally {
        _ptSyncInFlight = false;
      }
      return updatedCount;
    }

    function openParticipationLinkModal() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      const sem = appState.activeTest.semester;
      const ti = appState.activeTest.testIndex;
      const cfg = getTestConfig(classObj, sem, ti);
      const link = (cfg && cfg.participationLink) || {};

      const overlay = document.getElementById("participation-link-overlay");
      const statusText = document.getElementById("pl-status-text");
      const lastSynced = document.getElementById("pl-last-synced");
      const dateModeEl = document.getElementById("pl-date-mode");
      const customDatesEl = document.getElementById("pl-custom-dates");
      const dateFromEl = document.getElementById("pl-date-from");
      const dateToEl = document.getElementById("pl-date-to");
      const unlinkBtn = document.getElementById("pl-unlink-btn");
      const cancelBtn = document.getElementById("pl-cancel-btn");
      const saveBtn = document.getElementById("pl-save-btn");
      if (!overlay) return;

      const isLinked = !!(link && link.enabled);
      statusText.textContent = isLinked
        ? (t('gsPlStatusLinked') || 'Status: Linked (auto-updates enabled)')
        : (t('gsPlStatusUnlinked') || 'Status: Not linked');
      lastSynced.textContent = (isLinked && link.lastSyncedAt)
        ? ((t('gsPlLastSynced') || 'Last synced: ') + new Date(link.lastSyncedAt).toLocaleString())
        : '';

      dateModeEl.value = link.dateMode || 'semester';
      dateFromEl.value = link.dateFrom || '';
      dateToEl.value = link.dateTo || '';
      const toggleCustom = () => customDatesEl.classList.toggle("hidden", dateModeEl.value !== 'custom');
      dateModeEl.onchange = toggleCustom;
      toggleCustom();

      unlinkBtn.classList.toggle("hidden", !isLinked);
      unlinkBtn.onclick = () => {
        if (cfg.participationLink) {
          cfg.participationLink.enabled = false;
        }
        saveState(classObj.id, sem, ti);
        updateParticipationLinkBadge(classObj, sem, ti);
        overlay.classList.add("hidden");
        if (typeof showToast === 'function') showToast(t('gsPlToastUnlinked') || 'Participation link removed.');
      };

      cancelBtn.onclick = () => overlay.classList.add("hidden");
      overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.add("hidden"); };

      saveBtn.onclick = async () => {
        cfg.participationLink = {
          enabled: true,
          groupId: classObj.groupId || classObj.id,
          dateMode: dateModeEl.value,
          dateFrom: dateModeEl.value === 'custom' ? dateFromEl.value : '',
          dateTo: dateModeEl.value === 'custom' ? dateToEl.value : '',
          useGroupRules: true,
          rulesSnapshot: link.rulesSnapshot || null,
          lastSyncedAt: '',
          lastDigest: ''
        };
        classObj.testConfigs[sem][ti] = cfg;
        saveState(classObj.id, sem, ti);
        overlay.classList.add("hidden");
        const count = await syncLinkedParticipationGrades({ force: true, groupId: classObj.groupId || classObj.id });
        updateParticipationLinkBadge(classObj, sem, ti);
        if (count === 0 && typeof showToast === 'function') {
          showToast(t('gsPlToastLinkedNoRules') || 'Linked! Configure rules in Participation Tracker if grades are empty.');
        }
      };

      overlay.classList.remove("hidden");
    }

    function checkForPendingImport() {
      const raw = localStorage.getItem('CMS_PENDING_GRADE_IMPORT');
      if (!raw) return;
      
      try {
        const parsed = JSON.parse(raw);
        if (parsed && ((parsed.grades && Object.keys(parsed.grades).length > 0) ||
                       (Array.isArray(parsed.students) && parsed.students.length > 0) ||
                       (Array.isArray(parsed.results) && parsed.results.length > 0) ||
                       (parsed.testConfig && Array.isArray(parsed.results)))) {
          localStorage.removeItem('CMS_PENDING_GRADE_IMPORT');
          openImportGradesModal(parsed);
        }
      } catch (e) {
        console.error('Failed to parse pending grade import:', e);
        localStorage.removeItem('CMS_PENDING_GRADE_IMPORT');
      }
    }

