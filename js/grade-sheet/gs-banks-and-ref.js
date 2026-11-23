    let _allLessonCompetences = [];
    let _availableCriteriaBanks = [];

    function findLessonCompetence(idOrCode) {
      if (!idOrCode) return null;
      const q = String(idOrCode).trim().toLowerCase();
      return _allLessonCompetences.find(c =>
        (c.id && String(c.id).toLowerCase() === q) ||
        (c.code && String(c.code).toLowerCase() === q)
      ) || null;
    }

    async function loadLessonCompetences() {
      const compMap = new Map();
      function addOrUpdateComp(item) {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || item.code || item.title || '').trim();
        if (!id) return;
        const year = String(item.yearLevel || item.year || item.grade || '').trim();
        const category = String(item.category || item.domain || item.competence || item.subject || '').trim();
        const level = String(item.level || '').trim();
        const subject = String(item.subjectId || item.subject || '').trim();
        compMap.set(id, {
          id: id,
          code: item.code || '',
          title: item.title || item.name || '',
          description: item.description || '',
          level: level,
          year: year,
          category: category,
          subject: subject
        });
      }

      // 1. LocalStorage
      try {
        const stored = localStorage.getItem('cmt-lesson-competences') || localStorage.getItem('cmt-lesson-descriptors');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) parsed.forEach(addOrUpdateComp);
        }
      } catch (_) {}

      // 2. User root files: lesson-competences.json / lesson-descriptors.json
      if (window.Desktop && typeof Desktop.readText === 'function') {
        try {
          let res = await Desktop.readText('user', 'lesson-competences.json');
          if (!res || !res.ok) res = await Desktop.readText('user', 'lesson-descriptors.json');
          if (res && res.ok && res.content) {
            const parsed = JSON.parse(res.content);
            const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.competences || parsed.descriptors) ? (parsed.competences || parsed.descriptors) : []);
            list.forEach(addOrUpdateComp);
          }
        } catch (_) {}

        // 3. Custom competence files in user/custom-data/competences/
        try {
          if (typeof Desktop.listFiles === 'function') {
            let filesRes = await Desktop.listFiles('customCompetences', { extensions: ['.js', '.json'] });
            let flist = Array.isArray(filesRes) ? filesRes : (filesRes && Array.isArray(filesRes.files) ? filesRes.files : []);
            if (!flist.length) {
              let legacyRes = await Desktop.listFiles('customDescriptors', { extensions: ['.js', '.json'] });
              flist = Array.isArray(legacyRes) ? legacyRes : (legacyRes && Array.isArray(legacyRes.files) ? legacyRes.files : []);
            }
            for (let i = 0; i < flist.length; i++) {
              const fn = typeof flist[i] === 'string' ? flist[i] : flist[i].filename;
              if (!fn) continue;
              let raw = await Desktop.readText('customCompetences', fn);
              if (!raw || !raw.ok) raw = await Desktop.readText('customDescriptors', fn);
              if (raw && raw.ok && raw.content) {
                try {
                  const arr = parseCriteriaFileContent(raw.content);
                  if (Array.isArray(arr)) {
                    arr.forEach(addOrUpdateComp);
                  } else {
                    const sandbox = {};
                    const func = new Function('window', raw.content);
                    func(sandbox);
                    const arr2 = sandbox.LESSON_COMPETENCES || sandbox.LESSON_DESCRIPTORS || sandbox.COMPETENCES || JSON.parse(raw.content);
                    if (Array.isArray(arr2)) arr2.forEach(addOrUpdateComp);
                  }
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }

      _allLessonCompetences = Array.from(compMap.values());
      if (typeof populateCompetencePickerFilters === 'function') {
        populateCompetencePickerFilters();
      }
    }

    function parseCriteriaFileContent(content) {
      if (!content || typeof content !== 'string') return null;
      const trimmed = content.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const obj = JSON.parse(trimmed);
          if (Array.isArray(obj.criteria)) return obj.criteria;
          if (Array.isArray(obj.records)) return obj.records;
          if (Array.isArray(obj.XLSM_CRITERIA)) return obj.XLSM_CRITERIA;
        } catch (_) {}
      }
      const varMatch = content.match(/(?:(?:const|let|var)\s+(\w+)\s*=|window\.([A-Za-z0-9_$]+)\s*=)\s*\[/);
      if (varMatch) {
        const varName = varMatch[1] || varMatch[2];
        try {
          const fn = new Function(content + `\n;try{return ${varName};}catch(e){return [];}`);
          const data = fn();
          if (Array.isArray(data)) return data;
        } catch (_) {}
      }
      try {
        const firstBracket = trimmed.indexOf('[');
        const lastBracket = trimmed.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          const slice = trimmed.slice(firstBracket, lastBracket + 1);
          const fn2 = new Function('return ' + slice + ';');
          const res2 = fn2();
          if (Array.isArray(res2)) return res2;
        }
      } catch (_) {}
      return null;
    }

    function syncCriteriaRecordScoringDecisions(critArray, decList) {
      if (!Array.isArray(critArray) || !Array.isArray(decList)) return;
      for (const crit of critArray) {
        if (!crit || !crit.name) continue;
        const critDecs = [];
        for (const testEntry of decList) {
          if (!testEntry || !testEntry.criteriaDecisions) continue;
          const rules = testEntry.criteriaDecisions[crit.name];
          if (Array.isArray(rules)) {
            const activeRules = rules.filter(r => String(r || '').trim().length > 0);
            if (activeRules.length > 0) {
              critDecs.push({
                classTitle: testEntry.classTitle || '',
                testName: testEntry.testName || '',
                year: testEntry.year || '',
                semester: testEntry.semester || '',
                testDate: testEntry.testDate || '',
                rules: activeRules
              });
            }
          }
        }
        crit.scoringDecisions = critDecs;
      }
    }

    function parseScoringDecisionsFileContent(content) {
      if (!content || typeof content !== 'string') return [];
      try {
        const fn = new Function(content + '\n;try{return (typeof SCORING_DECISIONS !== "undefined" && Array.isArray(SCORING_DECISIONS)) ? SCORING_DECISIONS : ((typeof window !== "undefined" && Array.isArray(window.SCORING_DECISIONS)) ? window.SCORING_DECISIONS : []); }catch(e){return [];}');
        const res = fn();
        if (Array.isArray(res) && res.length) return res;
      } catch (_) {}
      try {
        const obj = JSON.parse(content);
        if (obj && Array.isArray(obj.scoringDecisions)) return obj.scoringDecisions;
        if (obj && Array.isArray(obj.SCORING_DECISIONS)) return obj.SCORING_DECISIONS;
      } catch (_) {}
      // Fallback: reconstruct from criteria records if they contain scoringDecisions
      try {
        const critList = parseCriteriaFileContent(content);
        if (Array.isArray(critList)) {
          const synthesized = [];
          for (const crit of critList) {
            if (crit && crit.name && Array.isArray(crit.scoringDecisions)) {
              for (const dec of crit.scoringDecisions) {
                let entry = synthesized.find(e =>
                  String(e.classTitle || '').trim().toLowerCase() === String(dec.classTitle || '').trim().toLowerCase() &&
                  String(e.testName || '').trim().toLowerCase() === String(dec.testName || '').trim().toLowerCase()
                );
                if (!entry) {
                  entry = {
                    classTitle: dec.classTitle || '',
                    testName: dec.testName || '',
                    year: dec.year || '',
                    semester: dec.semester || '',
                    testDate: dec.testDate || '',
                    criteriaDecisions: {}
                  };
                  synthesized.push(entry);
                }
                if (Array.isArray(dec.rules)) {
                  entry.criteriaDecisions[crit.name] = [...dec.rules];
                }
              }
            }
          }
          if (synthesized.length > 0) return synthesized;
        }
      } catch (_) {}
      return [];
    }

    let _saveScoringDecisionsTimer = null;

    function getTestCriteriaBankFilename(classObj, config) {
      if (config && config.criteriaBank) return config.criteriaBank;
      if (classObj && classObj.criteriaBank) return classObj.criteriaBank;
      if (classObj && Array.isArray(classObj.criteriaBanks) && classObj.criteriaBanks.length && classObj.criteriaBanks[0]) {
        return classObj.criteriaBanks[0];
      }
      return 'correction-criteria.js';
    }

    function getScoringDecisionsBank(bankFilename) {
      const fn = bankFilename || 'correction-criteria.js';
      const bank = (_availableCriteriaBanks || []).find(b => b.filename === fn);
      if (bank) {
        if (!Array.isArray(bank.scoringDecisions)) bank.scoringDecisions = [];
        return { bank, filename: fn, list: bank.scoringDecisions };
      }
      if (!Array.isArray(window.SCORING_DECISIONS)) window.SCORING_DECISIONS = [];
      return { bank: null, filename: fn || 'correction-criteria.js', list: window.SCORING_DECISIONS };
    }

    function findScoringDecisionsEntry({ classTitle, testName, criterionName, year, semester, testDate, bankFilename }) {
      const { list } = getScoringDecisionsBank(bankFilename);
      const cleanClass = String(classTitle || '').trim().toLowerCase();
      const cleanTest = String(testName || '').trim().toLowerCase();
      const cleanCrit = String(criterionName || '').trim();

      // 1. Exact match on (classTitle, testName)
      const exactMatch = list.find(entry =>
        String(entry.classTitle || '').trim().toLowerCase() === cleanClass &&
        String(entry.testName || '').trim().toLowerCase() === cleanTest
      );

      if (exactMatch && (!exactMatch.criteriaDecisions || typeof exactMatch.criteriaDecisions !== 'object')) {
        exactMatch.criteriaDecisions = {};
      }

      if (exactMatch && cleanCrit) {
        const rules = exactMatch.criteriaDecisions[cleanCrit];
        if (Array.isArray(rules) && rules.some(r => String(r || '').trim().length > 0)) {
          return {
            entry: exactMatch,
            rules: rules.filter(r => String(r || '').trim().length > 0),
            rawRules: rules,
            isCohort: false,
            matchedClass: exactMatch.classTitle
          };
        }
      }

      // 2. Cohort match: parallel classes taking the same test in same year, semester, and date +/- 10 days
      if (cleanTest) {
        const targetYear = String(year || '').trim();
        const targetSem = String(semester || '').trim().toLowerCase();
        let targetDate = null;
        if (testDate) {
          const d = new Date(testDate);
          if (!isNaN(d.getTime())) targetDate = d;
        }

        for (const entry of list) {
          if (String(entry.classTitle || '').trim().toLowerCase() === cleanClass) continue;
          if (String(entry.testName || '').trim().toLowerCase() !== cleanTest) continue;

          // Check Year
          if (targetYear && entry.year && String(entry.year).trim() !== targetYear) continue;

          // Check Semester
          if (targetSem && entry.semester && String(entry.semester).trim().toLowerCase() !== targetSem) continue;

          // Check Date within 10 days if both have dates
          if (targetDate && entry.testDate) {
            const ed = new Date(entry.testDate);
            if (!isNaN(ed.getTime())) {
              const diffDays = Math.abs(targetDate.getTime() - ed.getTime()) / (1000 * 60 * 60 * 24);
              if (diffDays > 10) continue;
            }
          }

          if (cleanCrit) {
            const rules = (entry.criteriaDecisions && entry.criteriaDecisions[cleanCrit]) || [];
            const activeRules = rules.filter(r => String(r || '').trim().length > 0);
            if (activeRules.length > 0) {
              return {
                entry,
                rules: activeRules,
                rawRules: rules,
                isCohort: true,
                matchedClass: entry.classTitle
              };
            }
          }
        }
      }

      return {
        entry: exactMatch || null,
        rules: [],
        rawRules: exactMatch && cleanCrit ? (exactMatch.criteriaDecisions[cleanCrit] || []) : [],
        isCohort: false,
        matchedClass: classTitle
      };
    }

    function getScoringDecisionsForTest(classTitle, testName, bankFilename, opts = {}) {
      const res = findScoringDecisionsEntry({
        classTitle,
        testName,
        criterionName: opts.criterionName,
        year: opts.year,
        semester: opts.semester,
        testDate: opts.testDate,
        bankFilename
      });
      return res.entry;
    }

    function ensureScoringDecisionsForTest(classTitle, testName, bankFilename, opts = {}) {
      const { list, filename } = getScoringDecisionsBank(bankFilename);
      const cleanClass = String(classTitle || '').trim().toLowerCase();
      const cleanTest = String(testName || '').trim().toLowerCase();
      let match = list.find(entry => 
        String(entry.classTitle || '').trim().toLowerCase() === cleanClass &&
        String(entry.testName || '').trim().toLowerCase() === cleanTest
      );
      if (!match) {
        match = {
          classTitle: String(classTitle || '').trim(),
          testName: String(testName || '').trim(),
          year: opts.year || '',
          semester: opts.semester || '',
          testDate: opts.testDate || '',
          criteriaDecisions: {}
        };
        list.push(match);
      } else {
        if (!match.criteriaDecisions || typeof match.criteriaDecisions !== 'object') match.criteriaDecisions = {};
        if (opts.year && !match.year) match.year = opts.year;
        if (opts.semester && !match.semester) match.semester = opts.semester;
        if (opts.testDate && !match.testDate) match.testDate = opts.testDate;
      }
      return match;
    }

    async function saveScoringDecisionsToBank(bankFilename) {
      const targetFn = bankFilename || 'correction-criteria.js';
      const { bank, list } = getScoringDecisionsBank(targetFn);

      // Sync into in-memory criteria structures
      if (typeof window.XLSM_CRITERIA !== 'undefined' && Array.isArray(window.XLSM_CRITERIA)) {
        syncCriteriaRecordScoringDecisions(window.XLSM_CRITERIA, list);
      }
      if (bank && Array.isArray(bank.criteria)) {
        syncCriteriaRecordScoringDecisions(bank.criteria, list);
      }

      try {
        if (targetFn === 'correction-criteria.js') {
          window.SCORING_DECISIONS = list;
          localStorage.setItem('gradeSheetReferenceScoringDecisions.v1', JSON.stringify(list));
          if (typeof window.XLSM_CRITERIA !== 'undefined' && Array.isArray(window.XLSM_CRITERIA)) {
            localStorage.setItem('gradeSheetReferenceCriteria.v1', JSON.stringify(window.XLSM_CRITERIA));
          }
        } else {
          localStorage.setItem('cmt-decisions-' + targetFn.replace(/\.(js|json)$/i, ''), JSON.stringify(list));
          if (bank && Array.isArray(bank.criteria)) {
            localStorage.setItem('cmt-criteria-' + targetFn.replace(/\.(js|json)$/i, ''), JSON.stringify(bank.criteria));
          }
        }
      } catch (_) {}

      if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
        clearTimeout(_saveScoringDecisionsTimer);
        _saveScoringDecisionsTimer = setTimeout(async () => {
          try {
            if (targetFn === 'correction-criteria.js') {
              let existingCrit = (typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : [];
              let existingChips = (typeof OBSERVATION_CHECKLIST_GROUPS !== 'undefined' && Array.isArray(OBSERVATION_CHECKLIST_GROUPS)) ? OBSERVATION_CHECKLIST_GROUPS : [];
              try {
                const rootRes = await Desktop.readText('user', 'correction-criteria.js');
                if (rootRes && rootRes.ok && rootRes.content) {
                  const parsedCrit = parseCriteriaFileContent(rootRes.content);
                  if (Array.isArray(parsedCrit) && parsedCrit.length) existingCrit = parsedCrit;
                  const chipFn = new Function(rootRes.content + '\n;try{return (typeof OBSERVATION_CHECKLIST_GROUPS !== "undefined") ? OBSERVATION_CHECKLIST_GROUPS : [];}catch(e){return [];}');
                  const parsedChips = chipFn();
                  if (Array.isArray(parsedChips) && parsedChips.length) existingChips = parsedChips;
                }
              } catch (_) {}
              syncCriteriaRecordScoringDecisions(existingCrit, list);
              const fileContent = `const XLSM_CRITERIA = ${JSON.stringify(existingCrit, null, 2)};\n` +
                `const OBSERVATION_CHECKLIST_GROUPS = ${JSON.stringify(existingChips, null, 2)};\n` +
                `const SCORING_DECISIONS = ${JSON.stringify(list, null, 2)};\n`;
              await Desktop.saveText('user', 'correction-criteria.js', fileContent);
            } else {
              const isJson = targetFn.endsWith('.json');
              if (isJson) {
                let obj = {};
                try {
                  const res = await Desktop.readText('customCriteria', targetFn);
                  if (res && res.content) obj = JSON.parse(res.content);
                } catch (_) {}
                if (Array.isArray(obj.criteria)) {
                  syncCriteriaRecordScoringDecisions(obj.criteria, list);
                }
                obj.scoringDecisions = list;
                await Desktop.saveText('customCriteria', targetFn, JSON.stringify(obj, null, 2));
              } else {
                let existingCrit = [];
                try {
                  const res = await Desktop.readText('customCriteria', targetFn);
                  if (res && res.content) {
                    const parsed = parseCriteriaFileContent(res.content);
                    if (Array.isArray(parsed)) existingCrit = parsed;
                  }
                } catch (_) {}
                syncCriteriaRecordScoringDecisions(existingCrit, list);
                const fileContent = `// Criteria Bank: ${targetFn}\n` +
                  `const XLSM_CRITERIA = ${JSON.stringify(existingCrit, null, 2)};\n` +
                  `const SCORING_DECISIONS = ${JSON.stringify(list, null, 2)};\n`;
                await Desktop.saveText('customCriteria', targetFn, fileContent);
              }
            }
          } catch (err) {
            console.warn('saveScoringDecisionsToBank error:', err);
          }
        }, 300);
      }
    }

    let _activeCriterionPopover = null;

    function closeCriterionDecisionsPopover() {
      const popover = document.getElementById("smod-criterion-decisions-popover");
      if (popover) {
        popover.style.display = "none";
        popover.dataset.activeCriterion = "";
      }
      if (_activeCriterionPopover) {
        if (_activeCriterionPopover.rulesRef) {
          const rList = _activeCriterionPopover.rulesRef;
          for (let i = rList.length - 1; i >= 0; i--) {
            if (String(rList[i] || '').trim() === '') {
              rList.splice(i, 1);
            }
          }
          if (_activeCriterionPopover.cohortSourceEntry && _activeCriterionPopover.critName) {
            const srcEntry = _activeCriterionPopover.cohortSourceEntry;
            if (!srcEntry.criteriaDecisions) srcEntry.criteriaDecisions = {};
            srcEntry.criteriaDecisions[_activeCriterionPopover.critName] = JSON.parse(JSON.stringify(rList));
          }
          if (typeof _activeCriterionPopover.onUpdate === 'function') {
            _activeCriterionPopover.onUpdate();
          }
          if (typeof _activeCriterionPopover.bankFn === 'string') {
            saveScoringDecisionsToBank(_activeCriterionPopover.bankFn);
          }
        }
        if (_activeCriterionPopover.cleanup) {
          _activeCriterionPopover.cleanup();
        }
      }
      _activeCriterionPopover = null;
    }

    function openCriterionDecisionsPopover({ buttonEl, criterion, classObj, config, commentTextarea, onUpdate }) {
      let popover = document.getElementById("smod-criterion-decisions-popover");
      if (!popover) {
        popover = document.createElement("div");
        popover.id = "smod-criterion-decisions-popover";
        popover.className = "smod-crit-popover";
        document.body.appendChild(popover);
      }

      if (popover.dataset.activeCriterion === criterion.name && popover.style.display !== 'none') {
        closeCriterionDecisionsPopover();
        return;
      }
      closeCriterionDecisionsPopover();

      popover.dataset.activeCriterion = criterion.name;
      popover.style.display = "flex";

      const classTitle = classObj ? classObj.name : '';
      const testName = (config && config.testName) ? config.testName : '';
      const curYear = classObj?.year || (typeof CLASS_GROUPS !== 'undefined' ? CLASS_GROUPS.activeYear : '') || '';
      const curSem = (typeof appState !== 'undefined' && appState.activeSemester) || (classObj && classObj.semester) || '';
      const curDate = config?.testDate || '';
      const criteriaBankFn = getTestCriteriaBankFilename(classObj, config);

      const decInfo = findScoringDecisionsEntry({
        classTitle,
        testName,
        criterionName: criterion.name,
        year: curYear,
        semester: curSem,
        testDate: curDate,
        bankFilename: criteriaBankFn
      });

      const localRecord = ensureScoringDecisionsForTest(classTitle, testName, criteriaBankFn, {
        year: curYear,
        semester: curSem,
        testDate: curDate
      });

      if (!localRecord.criteriaDecisions || typeof localRecord.criteriaDecisions !== 'object') {
        localRecord.criteriaDecisions = {};
      }
      if (!Array.isArray(localRecord.criteriaDecisions[criterion.name])) {
        localRecord.criteriaDecisions[criterion.name] = [];
      }

      // If local record has no rules but cohort match does, seed from cohort
      let cohortSourceEntry = null;
      if (decInfo.isCohort && decInfo.rules.length > 0) {
        cohortSourceEntry = decInfo.entry;
        if (localRecord.criteriaDecisions[criterion.name].length === 0 || localRecord.criteriaDecisions[criterion.name].every(r => !String(r || '').trim())) {
          localRecord.criteriaDecisions[criterion.name] = JSON.parse(JSON.stringify(decInfo.rules));
        }
      }

      const rules = localRecord.criteriaDecisions[criterion.name];
      if (rules.length === 0) {
        rules.push("");
      }

      function renderPopoverContent() {
        popover.innerHTML = "";

        // Header
        const header = document.createElement("div");
        header.className = "smod-crit-popover-header";

        const titleWrap = document.createElement("div");
        titleWrap.className = "smod-crit-popover-title-wrap";

        const titleEl = document.createElement("div");
        titleEl.className = "smod-crit-popover-title";
        const titleText = (typeof tFmt === 'function' ? tFmt('gsCritMarkingDecisionsTitle', { criterion: criterion.name }) : null) || `Marking Decisions: ${criterion.name}`;
        titleEl.innerHTML = `<span>⚖</span> <span>${escapeHtml(titleText)}</span>`;

        const subEl = document.createElement("div");
        subEl.className = "smod-crit-popover-sub";
        const displayTestName = testName || (t('gsDupLabelTest') + ' ' + ((config && config.testIndex != null ? config.testIndex + 1 : 1)));
        const subText = (typeof tFmt === 'function' ? tFmt('gsCritMarkingDecisionsSub', { class: classTitle || 'Class', test: displayTestName }) : null) || `Class: ${classTitle || 'Class'} • Test: ${displayTestName}`;
        subEl.textContent = subText;

        titleWrap.appendChild(titleEl);
        titleWrap.appendChild(subEl);

        if (decInfo.isCohort && decInfo.matchedClass) {
          const cohortBadge = document.createElement("div");
          cohortBadge.className = "smod-popover-cohort-badge";
          const syncLabel = (typeof tFmt === 'function' ? tFmt('gsCohortSyncWith', { class: decInfo.matchedClass }) : null) || `Cohort synced with ${decInfo.matchedClass}`;
          cohortBadge.textContent = `🔗 ${syncLabel}`;
          cohortBadge.title = t('gsCohortSyncDesc', 'Decisions automatically synchronized across parallel classes within 10 days');
          titleWrap.appendChild(cohortBadge);
        }

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "smod-crit-popover-close";
        closeBtn.textContent = "✕";
        closeBtn.onclick = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          closeCriterionDecisionsPopover();
        };

        header.appendChild(titleWrap);
        header.appendChild(closeBtn);
        popover.appendChild(header);

        // Body
        const bodyEl = document.createElement("div");
        bodyEl.className = "smod-crit-popover-body";

        const list = document.createElement("ol");
        list.className = "smod-decision-list";

        rules.forEach((ruleText, idx) => {
          const item = document.createElement("li");
          item.className = "smod-decision-item";

          const numSpan = document.createElement("span");
          numSpan.className = "smod-decision-num";
          numSpan.textContent = `${idx + 1}.`;

          const input = document.createElement("input");
          input.type = "text";
          input.className = "smod-decision-input";
          input.value = ruleText;
          input.placeholder = t('gsPlaceholderDecision', 'Describe scoring rule or decision...');
          input.addEventListener("input", () => {
            rules[idx] = input.value;
            if (cohortSourceEntry) {
              if (!cohortSourceEntry.criteriaDecisions) cohortSourceEntry.criteriaDecisions = {};
              cohortSourceEntry.criteriaDecisions[criterion.name] = [...rules];
            }
            saveScoringDecisionsToBank(criteriaBankFn);
            if (typeof onUpdate === 'function') onUpdate();
          });
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addBtn.click();
            }
          });

          const actionsWrap = document.createElement("div");
          actionsWrap.className = "smod-decision-actions";

          // Up button
          const upBtn = document.createElement("button");
          upBtn.type = "button";
          upBtn.className = "smod-decision-btn";
          upBtn.textContent = "▲";
          upBtn.title = "Move Up";
          upBtn.disabled = (idx === 0);
          upBtn.onclick = (e) => {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            if (idx > 0) {
              const tmp = rules[idx];
              rules[idx] = rules[idx - 1];
              rules[idx - 1] = tmp;
              if (cohortSourceEntry) {
                if (!cohortSourceEntry.criteriaDecisions) cohortSourceEntry.criteriaDecisions = {};
                cohortSourceEntry.criteriaDecisions[criterion.name] = [...rules];
              }
              saveScoringDecisionsToBank(criteriaBankFn);
              if (typeof onUpdate === 'function') onUpdate();
              renderPopoverContent();
            }
          };

          // Down button
          const downBtn = document.createElement("button");
          downBtn.type = "button";
          downBtn.className = "smod-decision-btn";
          downBtn.textContent = "▼";
          downBtn.title = "Move Down";
          downBtn.disabled = (idx === rules.length - 1);
          downBtn.onclick = (e) => {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            if (idx < rules.length - 1) {
              const tmp = rules[idx];
              rules[idx] = rules[idx + 1];
              rules[idx + 1] = tmp;
              if (cohortSourceEntry) {
                if (!cohortSourceEntry.criteriaDecisions) cohortSourceEntry.criteriaDecisions = {};
                cohortSourceEntry.criteriaDecisions[criterion.name] = [...rules];
              }
              saveScoringDecisionsToBank(criteriaBankFn);
              if (typeof onUpdate === 'function') onUpdate();
              renderPopoverContent();
            }
          };

          // Insert into comment button
          const insertBtn = document.createElement("button");
          insertBtn.type = "button";
          insertBtn.className = "smod-decision-btn smod-decision-btn-comment";
          insertBtn.textContent = t('gsBtnInsertComment', '➔ Comment');
          insertBtn.title = t('gsBtnInsertCommentTitle', "Insert this decision into the student's comment");
          insertBtn.onclick = (e) => {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            const ruleVal = String(rules[idx] || '').trim();
            if (ruleVal && commentTextarea) {
              const cur = commentTextarea.value.trim();
              commentTextarea.value = cur ? `${cur}\n• ${ruleVal}` : `• ${ruleVal}`;
              commentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
              if (typeof showToast === 'function') {
                showToast(t('gsDecisionInserted', 'Inserted into comment'));
              }
            }
          };

          // Delete button
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "smod-decision-btn smod-decision-btn-del";
          delBtn.textContent = "✕";
          delBtn.title = "Delete";
          delBtn.onclick = (e) => {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            rules.splice(idx, 1);
            if (rules.length === 0) {
              rules.push("");
            }
            if (cohortSourceEntry) {
              if (!cohortSourceEntry.criteriaDecisions) cohortSourceEntry.criteriaDecisions = {};
              cohortSourceEntry.criteriaDecisions[criterion.name] = [...rules];
            }
            saveScoringDecisionsToBank(criteriaBankFn);
            if (typeof onUpdate === 'function') onUpdate();
            renderPopoverContent();
          };

          actionsWrap.append(upBtn, downBtn, insertBtn, delBtn);
          item.append(numSpan, input, actionsWrap);
          list.appendChild(item);
        });

        bodyEl.appendChild(list);
        popover.appendChild(bodyEl);

        // Footer
        const footer = document.createElement("div");
        footer.className = "smod-crit-popover-footer";

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "smod-crit-popover-add-btn";
        addBtn.textContent = t('gsBtnAddDecision', '+ Add decision');
        addBtn.onclick = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          rules.push("");
          if (cohortSourceEntry) {
            if (!cohortSourceEntry.criteriaDecisions) cohortSourceEntry.criteriaDecisions = {};
            cohortSourceEntry.criteriaDecisions[criterion.name] = [...rules];
          }
          saveScoringDecisionsToBank(criteriaBankFn);
          if (typeof onUpdate === 'function') onUpdate();
          renderPopoverContent();
          const inputs = popover.querySelectorAll(".smod-decision-input");
          if (inputs.length) {
            const last = inputs[inputs.length - 1];
            last.focus();
            if (typeof last.scrollIntoView === 'function') {
              last.scrollIntoView({ block: 'nearest' });
            }
          }
        };

        footer.appendChild(addBtn);
        popover.appendChild(footer);

        // Position popover relative to buttonEl
        const rect = buttonEl.getBoundingClientRect();
        const popWidth = 380;
        let left = rect.left;
        if (left + popWidth > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - popWidth - 12);
        }
        let top = rect.bottom + 6;
        const popHeight = 280;
        if (top + popHeight > window.innerHeight - 12) {
          top = Math.max(12, rect.top - popHeight - 6);
        }
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
      }

      renderPopoverContent();

      const firstInput = popover.querySelector(".smod-decision-input");
      if (firstInput && !firstInput.value) {
        setTimeout(() => firstInput.focus(), 30);
      }

      let critDecUnreg = null;
      function onDocClick(e) {
        if (e.composedPath && (e.composedPath().includes(popover) || (buttonEl && e.composedPath().includes(buttonEl)))) {
          return;
        }
        if (popover.contains(e.target) || (buttonEl && buttonEl.contains(e.target))) {
          return;
        }
        closeCriterionDecisionsPopover();
      }
      function onPopoverClick(e) {
        e.stopPropagation();
      }
      function onDocKeydown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          closeCriterionDecisionsPopover();
        }
      }

      popover.addEventListener("click", onPopoverClick);

      if (window.cmtPushEscapeHandler) {
        critDecUnreg = window.cmtPushEscapeHandler({ el: popover, close: closeCriterionDecisionsPopover });
      }

      setTimeout(() => {
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onDocKeydown);
      }, 10);

      _activeCriterionPopover = {
        rulesRef: rules,
        critName: criterion.name,
        cohortSourceEntry,
        onUpdate,
        bankFn: criteriaBankFn,
        cleanup() {
          if (critDecUnreg) { critDecUnreg(); critDecUnreg = null; }
          popover.removeEventListener("click", onPopoverClick);
          document.removeEventListener("click", onDocClick);
          document.removeEventListener("keydown", onDocKeydown);
        }
      };
    }

    async function loadAvailableCriteriaBanks() {
      const banks = [];

      // 1. Default bank from correction-criteria.js (XLSM_CRITERIA & SCORING_DECISIONS)
      let defaultCriteria = (typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : [];
      let defaultDecisions = (typeof SCORING_DECISIONS !== 'undefined' && Array.isArray(SCORING_DECISIONS)) ? SCORING_DECISIONS : [];
      if (window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const rootRes = await Desktop.readText('user', 'correction-criteria.js');
          if (rootRes && rootRes.ok && rootRes.content) {
            const parsed = parseCriteriaFileContent(rootRes.content);
            if (Array.isArray(parsed) && parsed.length) defaultCriteria = parsed;
            const parsedDec = parseScoringDecisionsFileContent(rootRes.content);
            if (Array.isArray(parsedDec) && parsedDec.length) defaultDecisions = parsedDec;
          }
        } catch (_) {}
      }
      if (!defaultCriteria.length) {
        try {
          const ls = localStorage.getItem('gradeSheetReferenceCriteria.v1');
          if (ls) {
            const parsed = JSON.parse(ls);
            if (Array.isArray(parsed) && parsed.length) defaultCriteria = parsed;
          }
        } catch (_) {}
      }
      if (!defaultDecisions.length) {
        try {
          const lsDec = localStorage.getItem('gradeSheetReferenceScoringDecisions.v1');
          if (lsDec) {
            const parsedDec = JSON.parse(lsDec);
            if (Array.isArray(parsedDec) && parsedDec.length) defaultDecisions = parsedDec;
          }
        } catch (_) {}
      }

      window.SCORING_DECISIONS = defaultDecisions;

      banks.push({
        id: 'default',
        filename: 'correction-criteria.js',
        name: t('gsCriteriaBankDefault', 'Default (correction-criteria.js)'),
        criteria: defaultCriteria,
        scoringDecisions: defaultDecisions
      });

      // 2. Custom criteria banks in customCriteria (user/custom-data/criteria)
      if (window.Desktop && typeof Desktop.listFiles === 'function') {
        try {
          const res = await Desktop.listFiles('customCriteria', { extensions: ['.js', '.json'] });
          const list = Array.isArray(res) ? res : (res && Array.isArray(res.files) ? res.files : []);
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const fn = typeof item === 'string' ? item : (item.filename || item.name);
            if (!fn || fn === 'correction-criteria.js') continue;
            try {
              const fileRes = await Desktop.readText('customCriteria', fn);
              const content = fileRes?.content || (typeof fileRes === 'string' ? fileRes : null);
              if (content) {
                const critArr = parseCriteriaFileContent(content);
                const decArr = parseScoringDecisionsFileContent(content);
                if (Array.isArray(critArr)) {
                  if (!banks.some(b => b.filename === fn)) {
                    banks.push({
                      id: fn,
                      filename: fn,
                      name: fn.replace(/\.(js|json)$/i, ''),
                      criteria: critArr,
                      scoringDecisions: decArr
                    });
                  }
                }
              }
            } catch (err) {
              console.warn('Error reading custom criteria file:', fn, err);
            }
          }
        } catch (e) {
          console.warn('Error listing customCriteria:', e);
        }
      }

      // 3. Fallback / browser localStorage criteria banks
      try {
        for (let k = 0; k < localStorage.length; k++) {
          const key = localStorage.key(k);
          if (key && (key.startsWith('cmt-criteria-') || key.startsWith('custom-criteria-'))) {
            try {
              const val = JSON.parse(localStorage.getItem(key));
              const decKey = 'cmt-decisions-' + key.replace(/^(cmt|custom)-criteria-/, '');
              let decArr = [];
              try {
                const decLs = localStorage.getItem(decKey);
                if (decLs) decArr = JSON.parse(decLs);
              } catch (_) {}
              if (Array.isArray(val)) {
                const fname = key.replace(/^(cmt|custom)-criteria-/, '') + '.js';
                if (!banks.some(b => b.filename === fname)) {
                  banks.push({
                    id: fname,
                    filename: fname,
                    name: fname.replace(/\.(js|json)$/i, ''),
                    criteria: val,
                    scoringDecisions: decArr
                  });
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}

      _availableCriteriaBanks = banks;
      populateCriteriaBankDropdowns();
      return banks;
    }

    function populateCriteriaBankSelectElement(selectEl, selectedVal) {
      if (!selectEl) return;
      const current = selectedVal || selectEl.value || 'correction-criteria.js';
      selectEl.innerHTML = '';
      (_availableCriteriaBanks || []).forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.filename;
        const count = Array.isArray(b.criteria) ? b.criteria.length : 0;
        opt.textContent = `${b.name} (${count} criteria)`;
        selectEl.appendChild(opt);
      });
      if (Array.from(selectEl.options).some(o => o.value === current)) {
        selectEl.value = current;
      } else if (selectEl.options.length > 0) {
        selectEl.selectedIndex = 0;
      }
    }

    function populateCriteriaBankDropdowns() {
      const addSelect = document.getElementById('add-class-criteria-bank');
      if (addSelect) {
        const currentVal = addSelect.value;
        addSelect.innerHTML = '';
        _availableCriteriaBanks.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.filename;
          const critCount = Array.isArray(b.criteria) ? b.criteria.length : 0;
          opt.textContent = `${b.name} (${critCount} criteria)`;
          addSelect.appendChild(opt);
        });
        if (currentVal && Array.from(addSelect.options).some(o => o.value === currentVal)) {
          addSelect.value = currentVal;
        }
      }
      populateCriteriaBankSelectElement(document.getElementById('ref-criteria-bank-select'), _refEditorActiveCriteriaBank);
    }

    let _availableScaleBanks = [];
    let _activeScaleBankFilename = 'grade-scale-models.js';
    let _refEditorActiveScaleBank = 'grade-scale-models.js';

    let _availableChipBanks = [];
    let _activeChipBankFilename = 'correction-criteria.js';
    let _refEditorActiveChipBank = 'correction-criteria.js';

    let _refEditorActiveCriteriaBank = 'correction-criteria.js';

    function parseScaleModelsFileContent(content) {
      if (!content || typeof content !== 'string') return null;
      const trimmed = content.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const obj = JSON.parse(trimmed);
          if (Array.isArray(obj.scales)) return obj.scales;
          if (Array.isArray(obj.records)) return obj.records;
          if (Array.isArray(obj.XLSM_SCALE_MODELS)) return obj.XLSM_SCALE_MODELS;
        } catch (_) {}
      }
      try {
        const fn = new Function(content + '\n;try{return typeof XLSM_SCALE_MODELS !== "undefined" ? XLSM_SCALE_MODELS : (typeof customScaleModels !== "undefined" ? customScaleModels : null);}catch(e){return null;}');
        const data = fn();
        if (Array.isArray(data)) return data;
      } catch (_) {}
      try {
        const firstBracket = trimmed.indexOf('[');
        const lastBracket = trimmed.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          const slice = trimmed.slice(firstBracket, lastBracket + 1);
          const fn2 = new Function('return ' + slice + ';');
          const res2 = fn2();
          if (Array.isArray(res2)) return res2;
        }
      } catch (_) {}
      return null;
    }

    async function loadAvailableScaleBanks() {
      const banks = [];

      // 1. Default bank from grade-scale-models.js (XLSM_SCALE_MODELS)
      let defaultScales = (typeof XLSM_SCALE_MODELS !== 'undefined' && Array.isArray(XLSM_SCALE_MODELS)) ? XLSM_SCALE_MODELS : [];
      if (!defaultScales.length && window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const rootRes = await Desktop.readText('user', 'grade-scale-models.js');
          if (rootRes && rootRes.ok && rootRes.content) {
            const parsed = parseScaleModelsFileContent(rootRes.content);
            if (Array.isArray(parsed) && parsed.length) defaultScales = parsed;
          }
        } catch (_) {}
      }
      if (!defaultScales.length) {
        try {
          const ls = localStorage.getItem(REFERENCE_SCALE_MODELS_STORAGE_KEY);
          if (ls) {
            const parsed = JSON.parse(ls);
            if (Array.isArray(parsed) && parsed.length) defaultScales = parsed;
          }
        } catch (_) {}
      }

      banks.push({
        id: 'default',
        filename: 'grade-scale-models.js',
        name: t('gsScaleBankDefault', 'Default (grade-scale-models.js)'),
        scales: defaultScales
      });

      // 2. Custom scale banks in customScales (user/custom-data/scales)
      if (window.Desktop && typeof Desktop.listFiles === 'function') {
        try {
          const res = await Desktop.listFiles('customScales', { extensions: ['.js', '.json'] });
          const list = Array.isArray(res) ? res : (res && Array.isArray(res.files) ? res.files : []);
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const fn = typeof item === 'string' ? item : (item.filename || item.name);
            if (!fn || fn === 'grade-scale-models.js') continue;
            try {
              const fileRes = await Desktop.readText('customScales', fn);
              const content = fileRes?.content || (typeof fileRes === 'string' ? fileRes : null);
              if (content) {
                const arr = parseScaleModelsFileContent(content);
                if (Array.isArray(arr)) {
                  if (!banks.some(b => b.filename === fn)) {
                    banks.push({
                      id: fn,
                      filename: fn,
                      name: fn.replace(/\.(js|json)$/i, ''),
                      scales: arr
                    });
                  }
                }
              }
            } catch (err) {
              console.warn('Error reading custom scales file:', fn, err);
            }
          }
        } catch (e) {
          console.warn('Error listing customScales:', e);
        }
      }

      // 3. Fallback / browser localStorage scale banks
      try {
        for (let k = 0; k < localStorage.length; k++) {
          const key = localStorage.key(k);
          if (key && (key.startsWith('cmt-scales-') || key.startsWith('custom-scales-'))) {
            try {
              const val = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(val)) {
                const fname = key.replace(/^(cmt|custom)-scales-/, '') + '.js';
                if (!banks.some(b => b.filename === fname)) {
                  banks.push({
                    id: fname,
                    filename: fname,
                    name: fname.replace(/\.(js|json)$/i, ''),
                    scales: val
                  });
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}

      _availableScaleBanks = banks;
      populateScaleBankDropdowns();
      return banks;
    }

    function populateScaleBankSelectElement(selectEl, selectedVal) {
      if (!selectEl) return;
      const current = selectedVal || selectEl.value || 'grade-scale-models.js';
      selectEl.innerHTML = '';
      (_availableScaleBanks || []).forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.filename;
        const count = Array.isArray(b.scales) ? b.scales.length : 0;
        opt.textContent = `${b.name} (${count} models)`;
        selectEl.appendChild(opt);
      });
      if (Array.from(selectEl.options).some(o => o.value === current)) {
        selectEl.value = current;
      } else if (selectEl.options.length > 0) {
        selectEl.selectedIndex = 0;
      }
    }

    function populateScaleBankDropdowns() {
      populateScaleBankSelectElement(document.getElementById('ref-scale-bank-select'), _refEditorActiveScaleBank);
      populateScaleBankSelectElement(document.getElementById('grading-popup-scale-bank'));
      populateScaleBankSelectElement(document.getElementById('topt-grading-scale-bank'));
    }

    function getScaleModelsList(bankFilename = null) {
      const fn = bankFilename || _activeScaleBankFilename || 'grade-scale-models.js';
      if (fn && Array.isArray(_availableScaleBanks)) {
        const b = _availableScaleBanks.find(x => x.filename === fn);
        if (b && Array.isArray(b.scales)) return b.scales;
      }
      if (typeof XLSM_SCALE_MODELS !== 'undefined' && Array.isArray(XLSM_SCALE_MODELS) && XLSM_SCALE_MODELS.length) {
        return XLSM_SCALE_MODELS;
      }
      if (Array.isArray(_availableScaleBanks) && _availableScaleBanks.length > 0 && _availableScaleBanks[0].scales) {
        return _availableScaleBanks[0].scales;
      }
      return [];
    }

    function parseChipGroupsFileContent(content) {
      if (!content || typeof content !== 'string') return null;
      const trimmed = content.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const obj = JSON.parse(trimmed);
          if (Array.isArray(obj.chips)) return obj.chips;
          if (Array.isArray(obj.records)) return obj.records;
          if (Array.isArray(obj.OBSERVATION_CHECKLIST_GROUPS)) return obj.OBSERVATION_CHECKLIST_GROUPS;
          if (Array.isArray(obj.groups)) return obj.groups;
          if (Array.isArray(obj.sections)) return obj.sections;
          if (Array.isArray(obj.personalisedChips)) return obj.personalisedChips;
          if (Array.isArray(obj.observationChips)) return obj.observationChips;
        } catch (_) {}
      }
      try {
        const fn = new Function(content + '\n;try{return typeof OBSERVATION_CHECKLIST_GROUPS !== "undefined" ? OBSERVATION_CHECKLIST_GROUPS : (typeof customChips !== "undefined" ? customChips : null);}catch(e){return null;}');
        const data = fn();
        if (Array.isArray(data)) return data;
      } catch (_) {}
      try {
        const firstBracket = trimmed.indexOf('[');
        const lastBracket = trimmed.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          const slice = trimmed.slice(firstBracket, lastBracket + 1);
          const fn2 = new Function('return ' + slice + ';');
          const res2 = fn2();
          if (Array.isArray(res2)) return res2;
        }
      } catch (_) {}
      return null;
    }

    async function loadAvailableChipBanks() {
      const banks = [];

      // 1. Default bank from correction-criteria.js (OBSERVATION_CHECKLIST_GROUPS)
      let defaultChips = (typeof OBSERVATION_CHECKLIST_GROUPS !== 'undefined' && Array.isArray(OBSERVATION_CHECKLIST_GROUPS)) ? OBSERVATION_CHECKLIST_GROUPS : [];
      if (!defaultChips.length && window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const rootRes = await Desktop.readText('user', 'correction-criteria.js');
          if (rootRes && rootRes.ok && rootRes.content) {
            const parsed = parseChipGroupsFileContent(rootRes.content);
            if (Array.isArray(parsed) && parsed.length) defaultChips = parsed;
          }
        } catch (_) {}
      }
      if (!defaultChips.length) {
        try {
          const ls = localStorage.getItem(REFERENCE_PERSONALISED_CHIPS_STORAGE_KEY);
          if (ls) {
            const parsed = JSON.parse(ls);
            if (Array.isArray(parsed) && parsed.length) defaultChips = parsed;
          }
        } catch (_) {}
      }

      banks.push({
        id: 'default',
        filename: 'correction-criteria.js',
        name: t('gsChipsBankDefault', 'Default (correction-criteria.js)'),
        chips: defaultChips
      });

      // 2. Custom chip banks in customChips (user/custom-data/chips)
      if (window.Desktop && typeof Desktop.listFiles === 'function') {
        try {
          const res = await Desktop.listFiles('customChips', { extensions: ['.js', '.json'] });
          const list = Array.isArray(res) ? res : (res && Array.isArray(res.files) ? res.files : []);
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const fn = typeof item === 'string' ? item : (item.filename || item.name);
            if (!fn || fn === 'correction-criteria.js') continue;
            try {
              const fileRes = await Desktop.readText('customChips', fn);
              const content = fileRes?.content || (typeof fileRes === 'string' ? fileRes : null);
              if (content) {
                const arr = parseChipGroupsFileContent(content);
                if (Array.isArray(arr)) {
                  if (!banks.some(b => b.filename === fn)) {
                    banks.push({
                      id: fn,
                      filename: fn,
                      name: fn.replace(/\.(js|json)$/i, ''),
                      chips: arr
                    });
                  }
                }
              }
            } catch (err) {
              console.warn('Error reading custom chips file:', fn, err);
            }
          }
        } catch (e) {
          console.warn('Error listing customChips:', e);
        }
      }

      // 3. Fallback / browser localStorage chip banks
      try {
        for (let k = 0; k < localStorage.length; k++) {
          const key = localStorage.key(k);
          if (key && (key.startsWith('cmt-chips-') || key.startsWith('custom-chips-'))) {
            try {
              const val = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(val)) {
                const fname = key.replace(/^(cmt|custom)-chips-/, '') + '.js';
                if (!banks.some(b => b.filename === fname)) {
                  banks.push({
                    id: fname,
                    filename: fname,
                    name: fname.replace(/\.(js|json)$/i, ''),
                    chips: val
                  });
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}

      _availableChipBanks = banks;
      populateChipBankDropdowns();
      return banks;
    }

    function populateChipBankSelectElement(selectEl, selectedVal) {
      if (!selectEl) return;
      const current = selectedVal || selectEl.value || 'correction-criteria.js';
      selectEl.innerHTML = '';
      (_availableChipBanks || []).forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.filename;
        const count = Array.isArray(b.chips) ? b.chips.length : 0;
        opt.textContent = `${b.name} (${count} categories)`;
        selectEl.appendChild(opt);
      });
      if (Array.from(selectEl.options).some(o => o.value === current)) {
        selectEl.value = current;
      } else if (selectEl.options.length > 0) {
        selectEl.selectedIndex = 0;
      }
    }

    function populateChipBankDropdowns() {
      populateChipBankSelectElement(document.getElementById('ref-chips-bank-select'), _refEditorActiveChipBank);
    }

    function sortSectionChecklistByBank(checklist, bankFilename) {
      if (!Array.isArray(checklist) || checklist.length <= 1) return checklist;
      const groups = typeof getObservationChecklistGroups === 'function' ? getObservationChecklistGroups(bankFilename) : [];
      const allBankItems = [];
      groups.forEach(g => {
        if (Array.isArray(g.items)) {
          g.items.forEach(it => {
            const k = String(it || '').trim().toLowerCase();
            if (k && !allBankItems.includes(k)) allBankItems.push(k);
          });
        }
      });
      const indexMap = new Map();
      allBankItems.forEach((name, i) => indexMap.set(name, i));

      return [...checklist].sort((a, b) => {
        const parsedA = (typeof parseObservationChipItem === 'function') ? parseObservationChipItem(a) : { name: String(a || '') };
        const parsedB = (typeof parseObservationChipItem === 'function') ? parseObservationChipItem(b) : { name: String(b || '') };
        const nameA = String(parsedA.name || '').trim().toLowerCase();
        const nameB = String(parsedB.name || '').trim().toLowerCase();
        const idxA = indexMap.has(nameA) ? indexMap.get(nameA) : 999999;
        const idxB = indexMap.has(nameB) ? indexMap.get(nameB) : 999999;
        return idxA - idxB;
      });
    }

    async function saveNewObservationChip(bankFilename, chipText, categoryName, sectionName, sectionColor) {
      const cleanChip = String(chipText || '').trim();
      const cleanCat = String(categoryName || 'General').trim();
      const cleanSec = String(sectionName || t('gsSectionGeneral', 'General Observations')).trim() || t('gsSectionGeneral', 'General Observations');
      const cleanCol = String(sectionColor || '').trim();
      if (!cleanChip || !cleanCat) return false;

      const targetFn = bankFilename || _activeChipBankFilename || 'correction-criteria.js';
      if (!Array.isArray(_availableChipBanks) || !_availableChipBanks.length) {
        await loadAvailableChipBanks();
      }

      let bank = _availableChipBanks.find(b =>
        b.filename === targetFn ||
        b.id === targetFn ||
        b.name === targetFn ||
        (b.filename && String(b.filename).replace(/\.(js|json)$/i, '') === String(targetFn).replace(/\.(js|json)$/i, ''))
      );
      if (!bank) {
        bank = { filename: targetFn, name: targetFn.replace(/\.(js|json)$/i, ''), chips: [] };
        _availableChipBanks.push(bank);
      }

      if (!Array.isArray(bank.chips)) bank.chips = [];

      let chipGroups = bank.chips.map(g => {
        const secVal = String((g && (g.section || g.sectionName)) || '').trim();
        return {
          section: secVal || cleanSec || t('gsSectionGeneral', 'General Observations'),
          color: String((g && g.color) || '').trim(),
          type: String((g && (g.type || g.label || g.name || g.category)) || 'Criteria').trim() || 'Criteria',
          items: Array.isArray(g && g.items) ? [...g.items] : []
        };
      });

      function normSec(s) {
        const str = String(s || '').trim().toLowerCase();
        if (str === 'good points' || str === 'points forts') return 'good';
        if (str === 'to remedy' || str === 'to improve' || str === 'a améliorer') return 'remedy';
        return str;
      }

      let group = chipGroups.find(g =>
        (normSec(g.section) === normSec(cleanSec) || (g.section || '').trim().toLowerCase() === cleanSec.toLowerCase()) &&
        (g.type || '').trim().toLowerCase() === cleanCat.toLowerCase()
      );
      if (!group) {
        group = chipGroups.find(g => (g.type || '').trim().toLowerCase() === cleanCat.toLowerCase());
      }
      if (!group) {
        group = { section: cleanSec, color: cleanCol, type: cleanCat, items: [] };
        chipGroups.push(group);
      } else {
        if (!group.section) group.section = cleanSec;
        if (cleanCol && !group.color) group.color = cleanCol;
      }

      if (group.items.some(it => String(it).trim().toLowerCase() === cleanChip.toLowerCase())) {
        showToast(t('gsAddChipDuplicateError', 'This chip already exists in the selected category.'), true);
        return false;
      }

      group.items.push(cleanChip);
      bank.chips = chipGroups;

      const ok = await saveChipBankGroups(targetFn, chipGroups);
      if (ok) {
        showToast(t('gsToastChipAdded', 'Observation chip added to active bank'));
      }
      return ok;
    }

    async function saveChipBankGroups(bankFilename, updatedChipGroups) {
      const targetFn = bankFilename || _activeChipBankFilename || 'correction-criteria.js';
      if (!Array.isArray(_availableChipBanks) || !_availableChipBanks.length) {
        await loadAvailableChipBanks();
      }

      let bank = _availableChipBanks.find(b =>
        b.filename === targetFn ||
        b.id === targetFn ||
        b.name === targetFn ||
        (b.filename && String(b.filename).replace(/\.(js|json)$/i, '') === String(targetFn).replace(/\.(js|json)$/i, ''))
      );
      if (bank) {
        bank.chips = updatedChipGroups;
      }

      const isDefault = targetFn === 'correction-criteria.js' || targetFn === 'default';
      if (isDefault) {
        window.OBSERVATION_CHECKLIST_GROUPS = updatedChipGroups;
        try {
          localStorage.setItem(REFERENCE_PERSONALISED_CHIPS_STORAGE_KEY, JSON.stringify(updatedChipGroups));
        } catch (_) {}

        if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
          try {
            let existingCriteria = [];
            try {
              const rootRes = await Desktop.readText('user', 'correction-criteria.js');
              if (rootRes && rootRes.ok && rootRes.content) {
                const critFn = new Function(rootRes.content + '\n;try{return typeof XLSM_CRITERIA !== "undefined" ? XLSM_CRITERIA : null;}catch(e){return null;}');
                const cRes = critFn();
                if (Array.isArray(cRes) && cRes.length) existingCriteria = cRes;
              }
            } catch (_) {}
            if (!existingCriteria.length && typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) {
              existingCriteria = XLSM_CRITERIA;
            }
            const decToSave = (typeof window.SCORING_DECISIONS !== 'undefined' && Array.isArray(window.SCORING_DECISIONS)) ? window.SCORING_DECISIONS : [];
            syncCriteriaRecordScoringDecisions(existingCriteria, decToSave);
            const content = `const XLSM_CRITERIA = ${JSON.stringify(existingCriteria, null, 2)};\n` +
              `const OBSERVATION_CHECKLIST_GROUPS = ${JSON.stringify(updatedChipGroups, null, 2)};\n` +
              `const SCORING_DECISIONS = ${JSON.stringify(decToSave, null, 2)};\n`;
            await Desktop.saveText('user', 'correction-criteria.js', content);
          } catch (e) {
            console.warn('Error saving observation chips to correction-criteria.js:', e);
          }
        }
      } else {
        try {
          const lsKey = 'cmt-chips-' + targetFn.replace(/\.(js|json)$/i, '');
          localStorage.setItem(lsKey, JSON.stringify(updatedChipGroups));
        } catch (_) {}

        if (window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron()) {
          try {
            const isJson = targetFn.endsWith('.json');
            const customChipsText = isJson
              ? JSON.stringify(updatedChipGroups, null, 2)
              : `// OBSERVATION_CHECKLIST_GROUPS\nconst OBSERVATION_CHECKLIST_GROUPS = ${JSON.stringify(updatedChipGroups, null, 2)};\n`;
            await Desktop.saveText('customChips', targetFn, customChipsText);
          } catch (e) {
            console.warn('Error saving custom observation chip bank:', e);
          }
        }
      }

      // Keep Reference Data Editor draft in sync if open
      if (typeof _refEditorDraft !== 'undefined' && _refEditorDraft && isDefault) {
        _refEditorDraft.personalisedChips = updatedChipGroups;
        const refPopup = document.querySelector('.ref-data-editor');
        if (refPopup && !refPopup.closest('.hidden') && typeof renderReferenceDataEditor === 'function') {
          try { renderReferenceDataEditor(); } catch (_) {}
        }
      }

      // Refresh Test Options chip preview if that modal is active
      if (typeof renderToptChipsPreview === 'function') {
        try { renderToptChipsPreview(); } catch (_) {}
      }

      // Broadcast changes across windows
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          new BroadcastChannel('cmt-chips').postMessage({ filename: targetFn });
        } catch (_) {}
      }

      return true;
    }

    async function reorderObservationChip(bankFilename, sourceCategory, chipName, targetCategory, targetIndex, sourceSection = null, targetSection = null) {
      const targetFn = bankFilename || _activeChipBankFilename || 'correction-criteria.js';
      if (!Array.isArray(_availableChipBanks) || !_availableChipBanks.length) {
        await loadAvailableChipBanks();
      }

      let bank = _availableChipBanks.find(b =>
        b.filename === targetFn ||
        b.id === targetFn ||
        b.name === targetFn ||
        (b.filename && String(b.filename).replace(/\.(js|json)$/i, '') === String(targetFn).replace(/\.(js|json)$/i, ''))
      );
      if (!bank || !Array.isArray(bank.chips)) return false;

      let chipGroups = bank.chips.map(g => {
        const secVal = String((g && (g.section || g.sectionName)) || '').trim();
        return {
          section: secVal || t('gsSectionGeneral', 'General Observations'),
          color: String((g && g.color) || '').trim(),
          type: String((g && (g.type || g.label || g.name || g.category)) || 'Criteria').trim() || 'Criteria',
          items: Array.isArray(g && g.items) ? [...g.items] : []
        };
      });

      function normSec(s) {
        const str = String(s || '').trim().toLowerCase();
        if (str === 'good points' || str === 'points forts') return 'good';
        if (str === 'to remedy' || str === 'to improve' || str === 'a améliorer') return 'remedy';
        return str;
      }

      let srcGroup = chipGroups.find(g => {
        const catMatch = (g.type || '').trim().toLowerCase() === String(sourceCategory || '').trim().toLowerCase();
        const secMatch = sourceSection ? (normSec(g.section) === normSec(sourceSection) || (g.section || '').trim().toLowerCase() === sourceSection.trim().toLowerCase()) : true;
        const hasItem = Array.isArray(g.items) && g.items.some(it => String(it).trim().toLowerCase() === String(chipName || '').trim().toLowerCase());
        return catMatch && secMatch && hasItem;
      });

      if (!srcGroup) {
        srcGroup = chipGroups.find(g =>
          (g.type || '').trim().toLowerCase() === String(sourceCategory || '').trim().toLowerCase() &&
          Array.isArray(g.items) && g.items.some(it => String(it).trim().toLowerCase() === String(chipName || '').trim().toLowerCase())
        );
      }

      if (!srcGroup) return false;

      const srcIdx = srcGroup.items.findIndex(it => String(it).trim().toLowerCase() === String(chipName || '').trim().toLowerCase());
      if (srcIdx === -1) return false;

      const [removed] = srcGroup.items.splice(srcIdx, 1);

      const effTgtSec = targetSection || sourceSection || srcGroup.section || t('gsSectionGeneral', 'General Observations');
      let tgtGroup = chipGroups.find(g => {
        const catMatch = (g.type || '').trim().toLowerCase() === String(targetCategory || '').trim().toLowerCase();
        const secMatch = normSec(g.section) === normSec(effTgtSec) || (g.section || '').trim().toLowerCase() === effTgtSec.trim().toLowerCase();
        return catMatch && secMatch;
      });

      if (!tgtGroup) {
        tgtGroup = chipGroups.find(g => (g.type || '').trim().toLowerCase() === String(targetCategory || '').trim().toLowerCase());
      }

      if (!tgtGroup) {
        tgtGroup = { section: effTgtSec, color: srcGroup.color || '', type: targetCategory, items: [] };
        chipGroups.push(tgtGroup);
      }

      if (targetIndex != null && targetIndex >= 0 && targetIndex <= tgtGroup.items.length) {
        tgtGroup.items.splice(targetIndex, 0, removed);
      } else {
        tgtGroup.items.push(removed);
      }

      return await saveChipBankGroups(targetFn, chipGroups);
    }

    async function openAddObservationChipModal(activeBankFilename, onSavedCallback) {
      const targetFn = activeBankFilename || _activeChipBankFilename || 'correction-criteria.js';
      if (!Array.isArray(_availableChipBanks) || !_availableChipBanks.length) {
        await loadAvailableChipBanks();
      }

      const bank = _availableChipBanks.find(b => b.filename === targetFn);
      const bankDisplayName = bank ? bank.name : targetFn.replace(/\.(js|json)$/i, '');
      const bankSections = getObservationSectionsWithGroups(targetFn);

      let overlay = document.getElementById('gs-add-chip-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gs-add-chip-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        overlay.innerHTML = `
          <div class="gs-add-chip-modal" style="background:var(--surface,#fff);border:3px solid #000;box-shadow:6px 6px 0px #000;border-radius:6px;width:460px;max-width:94vw;display:flex;flex-direction:column;gap:14px;padding:20px;box-sizing:border-box;">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;">
              <div style="font-size:1.1rem;font-weight:900;letter-spacing:-0.5px;display:flex;align-items:center;gap:8px;">
                <img src="../assets/icons/speech-bubbles.svg" style="width:20px;height:20px;" alt="" />
                <span id="gs-add-chip-title">${t('gsAddChipModalTitle', 'Add Observation Chip')}</span>
              </div>
              <button type="button" id="gs-add-chip-close-btn" class="btn btn-sm" style="padding:2px 6px;line-height:1;border:2px solid #000;box-shadow:2px 2px 0px #000;">✕</button>
            </div>
            <div style="font-size:0.8rem;font-weight:700;color:var(--muted,#555);display:flex;align-items:center;gap:6px;">
              <span>${t('gsAddChipTargetBank', 'Active Bank:')}</span>
              <span id="gs-add-chip-bank-name" style="color:var(--text,#111);font-weight:900;background:var(--bg-card,#f0f0f0);border:1px solid #000;padding:2px 8px;border-radius:3px;"></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:0.8rem;font-weight:800;letter-spacing:0.3px;">${t('gsAddChipSectionLabel', 'Section')}</label>
              <select id="gs-add-chip-section-select" class="input" style="border:2px solid #000;padding:6px 10px;font-weight:700;"></select>
              <div id="gs-add-chip-custom-section-wrap" class="hidden" style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                <input type="text" id="gs-add-chip-custom-section" class="input" style="border:2px solid #000;padding:6px 10px;font-weight:600;" placeholder="${t('gsAddChipNewSectionPlaceholder', 'Enter section name...')}" />
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:0.75rem;font-weight:700;">Color:</span>
                  <input type="color" id="gs-add-chip-color" value="#16a34a" style="width:30px;height:24px;border:1.5px solid #000;border-radius:4px;cursor:pointer;">
                </div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:0.8rem;font-weight:800;letter-spacing:0.3px;">${t('gsAddChipCategoryLabel', 'Category / Criteria')}</label>
              <select id="gs-add-chip-category-select" class="input" style="border:2px solid #000;padding:6px 10px;font-weight:700;"></select>
              <input type="text" id="gs-add-chip-custom-category" class="input hidden" style="border:2px solid #000;padding:6px 10px;font-weight:600;margin-top:4px;" placeholder="${t('gsAddChipNewCategoryPlaceholder', 'Enter category name...')}" />
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:0.8rem;font-weight:800;letter-spacing:0.3px;">${t('gsAddChipNameLabel', 'Chip Text')}</label>
              <input type="text" id="gs-add-chip-input-text" class="input" style="border:2px solid #000;padding:6px 10px;font-weight:600;" placeholder="${t('gsPlaceholderObservation', 'e.g. Good intonation, Needs clearer examples...')}" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:10px;border-top:1px solid #ddd;">
              <button type="button" id="gs-add-chip-cancel-btn" class="btn" style="border:2px solid #000;font-weight:700;">${t('gsAddChipBtnCancel', 'Cancel')}</button>
              <button type="button" id="gs-add-chip-submit-btn" class="btn btn-primary" style="border:2px solid #000;box-shadow:3px 3px 0px #000;font-weight:900;display:inline-flex;align-items:center;gap:6px;">
                <img src="../assets/icons/plus.svg" class="btn-icon" style="width:14px;height:14px;" alt="" />
                <span>${t('gsAddChipBtnSubmit', 'Add Chip')}</span>
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
      }

      const bankNameEl = document.getElementById('gs-add-chip-bank-name');
      const textInput = document.getElementById('gs-add-chip-input-text');
      const secSelect = document.getElementById('gs-add-chip-section-select');
      const customSecWrap = document.getElementById('gs-add-chip-custom-section-wrap');
      const customSecInput = document.getElementById('gs-add-chip-custom-section');
      const secColorInput = document.getElementById('gs-add-chip-color');
      const catSelect = document.getElementById('gs-add-chip-category-select');
      const customCatInput = document.getElementById('gs-add-chip-custom-category');
      const submitBtn = document.getElementById('gs-add-chip-submit-btn');
      const cancelBtn = document.getElementById('gs-add-chip-cancel-btn');
      const closeBtn = document.getElementById('gs-add-chip-close-btn');

      if (bankNameEl) bankNameEl.textContent = bankDisplayName;
      if (textInput) textInput.value = '';
      if (customSecInput) customSecInput.value = '';
      if (customSecWrap) customSecWrap.classList.add('hidden');
      if (customCatInput) {
        customCatInput.value = '';
        customCatInput.classList.add('hidden');
      }

      function updateCategoriesForSelectedSection() {
        if (!catSelect) return;
        catSelect.innerHTML = '';
        const selectedSecName = secSelect ? secSelect.value : '';
        const currentSec = bankSections.find(s => s.name === selectedSecName);
        const groups = currentSec ? currentSec.groups : [];

        groups.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.type;
          opt.textContent = g.type;
          catSelect.appendChild(opt);
        });
        const newOpt = document.createElement('option');
        newOpt.value = '__new__';
        newOpt.textContent = t('gsAddChipNewCategoryOpt', '+ New Category...');
        catSelect.appendChild(newOpt);

        if (groups.length === 0 || selectedSecName === '__new__') {
          catSelect.value = '__new__';
          if (customCatInput) customCatInput.classList.remove('hidden');
        } else {
          catSelect.selectedIndex = 0;
          if (customCatInput) customCatInput.classList.add('hidden');
        }
      }

      // Populate sections
      if (secSelect) {
        secSelect.innerHTML = '';
        bankSections.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.name;
          opt.textContent = s.name;
          secSelect.appendChild(opt);
        });
        const newSecOpt = document.createElement('option');
        newSecOpt.value = '__new__';
        newSecOpt.textContent = t('gsAddChipNewSectionOpt', '+ New Section...');
        secSelect.appendChild(newSecOpt);

        if (bankSections.length === 0) {
          secSelect.value = '__new__';
          if (customSecWrap) customSecWrap.classList.remove('hidden');
        } else {
          secSelect.selectedIndex = 0;
        }

        secSelect.onchange = () => {
          if (secSelect.value === '__new__') {
            if (customSecWrap) customSecWrap.classList.remove('hidden');
            if (customSecInput) customSecInput.focus();
          } else {
            if (customSecWrap) customSecWrap.classList.add('hidden');
          }
          updateCategoriesForSelectedSection();
        };

        updateCategoriesForSelectedSection();
      }

      if (catSelect) {
        catSelect.onchange = () => {
          if (catSelect.value === '__new__') {
            if (customCatInput) customCatInput.classList.remove('hidden');
            if (customCatInput) customCatInput.focus();
          } else {
            if (customCatInput) customCatInput.classList.add('hidden');
          }
        };
      }

      let unreg = null;
      function closeModal() {
        if (unreg) { unreg(); unreg = null; }
        overlay.classList.add('hidden');
        document.removeEventListener('keydown', handleKey, true);
      }

      async function doSubmit() {
        const chipText = textInput ? textInput.value.trim() : '';
        let sectionName = secSelect ? secSelect.value : '';
        if (sectionName === '__new__') {
          sectionName = customSecInput ? customSecInput.value.trim() : '';
        }
        let categoryName = catSelect ? catSelect.value : '';
        if (categoryName === '__new__') {
          categoryName = customCatInput ? customCatInput.value.trim() : '';
        }
        const sectionColor = secColorInput ? secColorInput.value : '';

        if (!chipText || !categoryName || !sectionName) {
          showToast(t('gsAddChipEmptyError', 'Please enter a chip text, section, and category.'), true);
          return;
        }
        submitBtn.disabled = true;
        try {
          const ok = await saveNewObservationChip(targetFn, chipText, categoryName, sectionName, sectionColor);
          if (ok) {
            closeModal();
            if (typeof onSavedCallback === 'function') {
              onSavedCallback();
            }
          }
        } finally {
          submitBtn.disabled = false;
        }
      }

      function handleKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          closeModal();
        } else if (e.key === 'Enter' && (document.activeElement === textInput || document.activeElement === customCatInput || document.activeElement === customSecInput)) {
          e.preventDefault();
          doSubmit();
        }
      }

      overlay.classList.remove('hidden');
      if (window.cmtPushEscapeHandler) {
        unreg = window.cmtPushEscapeHandler({ el: overlay, close: closeModal });
      }
      document.addEventListener('keydown', handleKey, true);

      cancelBtn.onclick = closeModal;
      closeBtn.onclick = closeModal;
      submitBtn.onclick = doSubmit;

      setTimeout(() => {
        if (textInput) textInput.focus();
      }, 50);
    }

    function getClassLoadedCriteriaBanks(classObj) {
      if (!classObj) return _availableCriteriaBanks.slice(0, 1);
      const names = Array.isArray(classObj.criteriaBanks) && classObj.criteriaBanks.length
        ? classObj.criteriaBanks
        : (classObj.criteriaBank ? [classObj.criteriaBank] : ['correction-criteria.js']);
      const matched = _availableCriteriaBanks.filter(b => names.includes(b.filename));
      if (!matched.length && _availableCriteriaBanks.length) {
        matched.push(_availableCriteriaBanks[0]);
      }
      return matched;
    }

    function getTestCriteriaBank(classObj, config) {
      const bankName = (config && config.criteriaBank)
        || (classObj && classObj.criteriaBank)
        || ((classObj && Array.isArray(classObj.criteriaBanks) && classObj.criteriaBanks[0]))
        || 'correction-criteria.js';
      return _availableCriteriaBanks.find(b => b.filename === bankName) || _availableCriteriaBanks[0] || null;
    }

    function getClassLoadedChipBanks(classObj) {
      if (!classObj) return _availableChipBanks.slice(0, 1);
      const names = Array.isArray(classObj.chipBanks) && classObj.chipBanks.length
        ? classObj.chipBanks
        : (classObj.chipBank ? [classObj.chipBank] : ['correction-criteria.js']);
      const matched = _availableChipBanks.filter(b => names.includes(b.filename));
      if (!matched.length && _availableChipBanks.length) {
        matched.push(_availableChipBanks[0]);
      }
      return matched;
    }

    function getTestChipBank(classObj, config) {
      const bankName = (config && config.chipBank)
        || (classObj && classObj.chipBank)
        || ((classObj && Array.isArray(classObj.chipBanks) && classObj.chipBanks[0]))
        || _activeChipBankFilename
        || 'correction-criteria.js';
      return _availableChipBanks.find(b => b.filename === bankName) || _availableChipBanks[0] || null;
    }

    function getCriterionEffectiveCompetenceIds(criterion, classObj, testConfig) {
      if (!criterion) return [];
      if (Array.isArray(criterion.competenceIds) && criterion.competenceIds.length > 0) {
        return criterion.competenceIds;
      }
      const cleanName = String(criterion.name || '').trim().toLowerCase();
      if (!cleanName) return [];

      // 1. Check active criteria bank for this test/class
      let activeBank = null;
      if (typeof getTestCriteriaBank === 'function' && classObj && testConfig) {
        activeBank = getTestCriteriaBank(classObj, testConfig);
      }
      if (activeBank && Array.isArray(activeBank.criteria)) {
        const match = activeBank.criteria.find(c => c && String(c.name || '').trim().toLowerCase() === cleanName);
        if (match && Array.isArray(match.competenceIds) && match.competenceIds.length > 0) {
          return match.competenceIds;
        }
      }

      // 2. Check XLSM_CRITERIA (user/correction-criteria.js)
      if (typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) {
        const match = XLSM_CRITERIA.find(c => c && String(c.name || '').trim().toLowerCase() === cleanName);
        if (match && Array.isArray(match.competenceIds) && match.competenceIds.length > 0) {
          return match.competenceIds;
        }
      }

      // 3. Check any loaded criteria banks
      if (Array.isArray(_availableCriteriaBanks)) {
        for (const b of _availableCriteriaBanks) {
          if (b && Array.isArray(b.criteria)) {
            const match = b.criteria.find(c => c && String(c.name || '').trim().toLowerCase() === cleanName);
            if (match && Array.isArray(match.competenceIds) && match.competenceIds.length > 0) {
              return match.competenceIds;
            }
          }
        }
      }

      return [];
    }

    async function openClassTemplatesModal(classObj) {
      if (!classObj) classObj = getActiveClass();
      if (!classObj) return;

      await loadAvailableCriteriaBanks();

      const overlay = document.getElementById("class-criteria-templates-overlay");
      const list = document.getElementById("class-templates-checklist");
      if (!overlay || !list) return;
      list.innerHTML = "";

      const currentBanks = Array.isArray(classObj.criteriaBanks) && classObj.criteriaBanks.length
        ? classObj.criteriaBanks
        : [classObj.criteriaBank || 'correction-criteria.js'];

      _availableCriteriaBanks.forEach(bank => {
        const item = document.createElement("label");
        item.style.display = "flex";
        item.style.alignItems = "flex-start";
        item.style.gap = "10px";
        item.style.padding = "8px 10px";
        item.style.borderRadius = "6px";
        item.style.background = "#f8fafc";
        item.style.border = "1px solid #e2e8f0";
        item.style.cursor = "pointer";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = bank.filename;
        cb.checked = currentBanks.includes(bank.filename);
        cb.style.marginTop = "3px";

        const infoWrap = document.createElement("div");
        infoWrap.style.flex = "1";

        const titleRow = document.createElement("div");
        titleRow.style.fontWeight = "600";
        titleRow.style.fontSize = "0.86rem";
        titleRow.textContent = bank.name;

        const subRow = document.createElement("div");
        subRow.style.fontSize = "0.75rem";
        subRow.style.color = "var(--muted)";
        const critCount = Array.isArray(bank.criteria) ? bank.criteria.length : 0;
        const previewNames = (Array.isArray(bank.criteria) ? bank.criteria.slice(0, 4).map(c => c.name) : []).join(", ");
        subRow.textContent = `${critCount} criteria${previewNames ? ` (${previewNames}…)` : ''} · ${bank.filename}`;

        infoWrap.append(titleRow, subRow);
        item.append(cb, infoWrap);
        list.appendChild(item);
      });

      const closeBtn = document.getElementById("class-templates-modal-close-x");
      const cancelBtn = document.getElementById("class-templates-modal-cancel");
      const saveBtn = document.getElementById("class-templates-modal-save");

      const closeFn = () => overlay.classList.add("hidden");
      if (closeBtn) closeBtn.onclick = closeFn;
      if (cancelBtn) cancelBtn.onclick = closeFn;

      if (saveBtn) {
        saveBtn.onclick = () => {
          const checked = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
          if (!checked.length && _availableCriteriaBanks.length) {
            checked.push(_availableCriteriaBanks[0].filename);
          }
          classObj.criteriaBanks = checked;
          if (!classObj.criteriaBank || !checked.includes(classObj.criteriaBank)) {
            classObj.criteriaBank = checked[0];
          }
          saveState();
          closeFn();
          if (typeof showToast === 'function') showToast(t('gsCriteriaTemplates') + ' updated');
          renderSummary();
        };
      }
      overlay.onclick = (e) => {
        if (e.target === overlay) closeFn();
      };
      overlay.classList.remove("hidden");
    }


    function switchRefTab(tabName) {
      const tabs = ["summary-settings", "grading-defaults", "criteria", "scales", "chips"];
      tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const sec = document.getElementById(`ref-section-${t}`);
        if (btn) btn.classList.toggle("active", t === tabName);
        if (sec) sec.classList.toggle("hidden", t !== tabName);
      });
      if (typeof appState !== "undefined" && appState) {
        appState.activeRefTab = tabName;
      }
      if (tabName === "summary-settings") {
        renderSummarySettingsTab();
      } else if (tabName === "grading-defaults") {
        if (!_summarySettingsDraft) initSummarySettingsDraft();
        if (typeof window.renderExtendedGradeSheetSettings === "function") {
          window.renderExtendedGradeSheetSettings(_summarySettingsDraft);
        }
      }
    }

    function normalizeReferenceCriterion(entry, index) {
      const source = entry && typeof entry === "object" ? entry : {};
      const name = typeof source.name === "string" && source.name.trim() ? source.name.trim() : `Criterion ${index + 1}`;
      const grades = normalizeCriterionGrades(source.grades);
      const comments = {};
      const colors = {};
      grades.forEach((key, idx) => {
        comments[key] = typeof source.comments?.[key] === "string" ? source.comments[key] : "";
        colors[key] = typeof source.colors?.[key] === "string" && source.colors[key].trim()
          ? source.colors[key].trim()
          : getDefaultGradeColor(key, idx, grades.length);
      });
      const rawMin = toNumber(source.minPoints);
      const minPoints = rawMin != null ? rawMin : null;
      const rawMax = toNumber(source.maxPoints);
      const maxPoints = rawMax != null && rawMax >= 0 ? rawMax : null;
      const rawInterval = toNumber(source.interval);
      const interval = rawInterval != null && rawInterval > 0 ? rawInterval : null;
      const competenceIds = Array.isArray(source.competenceIds)
        ? [...source.competenceIds]
        : (typeof source.competenceIds === 'string' ? source.competenceIds.split(',').map(s => s.trim()).filter(Boolean) : []);
      const pointCoefficient = toNumber(source.pointCoefficient) ?? 1;
      return { name, grades, comments, colors, minPoints, maxPoints, interval, competenceIds, pointCoefficient };
    }

    function normalizeReferenceScaleModel(entry, index, existingKeys = new Set()) {
      const source = entry && typeof entry === "object" ? entry : {};
      const fallbackKey = `custom${index + 1}`;
      const fallbackLabel = `Custom ${index + 1}`;
      const sanitizeKey = value => String(value || "").trim().replace(/\s+/g, "").replace(/[^A-Za-z0-9_-]/g, "");
      let key = sanitizeKey(source.key) || fallbackKey;
      let suffix = 2;
      while (existingKeys.has(key)) {
        key = `${sanitizeKey(source.key) || fallbackKey}-${suffix}`;
        suffix += 1;
      }
      existingKeys.add(key);

      const label = typeof source.label === "string" && source.label.trim() ? source.label.trim() : fallbackLabel;
      const minGrade = toNumber(source.minGrade) != null ? toNumber(source.minGrade) : 1;
      const maxGrade = toNumber(source.maxGrade) != null ? toNumber(source.maxGrade) : 6;
      const interval = toNumber(source.interval) != null && toNumber(source.interval) > 0 ? toNumber(source.interval) : 0.5;

      const steps = computeScaleGradeSteps(maxGrade, minGrade, interval);
      const thresholds = {};
      const colors = {};
      const stepCount = steps.length;
      steps.forEach((grade, gIdx) => {
        const gradeKey = String(grade);
        const fallbackPct = stepCount > 1 ? Number((((stepCount - 1 - gIdx) / (stepCount - 1)) * 100).toFixed(2)) : 0;
        thresholds[gradeKey] = Math.max(0, Math.min(100, toNumber(source.thresholds?.[gradeKey]) ?? fallbackPct));
        colors[gradeKey] = typeof source.colors?.[gradeKey] === "string" && source.colors[gradeKey].trim()
          ? source.colors[gradeKey].trim()
          : getDefaultGradeColor(gradeKey, gIdx, stepCount);
      });
      return { key, label, minGrade, maxGrade, interval, thresholds, colors };
    }

    function cloneReferenceDrafts() {
      // Criteria: use the currently active criteria bank in the ref editor, fall back to global XLSM_CRITERIA
      const activeCriteriaBank = (_availableCriteriaBanks || []).find(b => b.filename === (_refEditorActiveCriteriaBank || 'correction-criteria.js')) || (_availableCriteriaBanks || [])[0] || null;
      const rawCriteria = (activeCriteriaBank && Array.isArray(activeCriteriaBank.criteria))
        ? activeCriteriaBank.criteria
        : (Array.isArray(XLSM_CRITERIA) ? XLSM_CRITERIA : []);
      const criteria = rawCriteria.map((entry, index) => normalizeReferenceCriterion(entry, index));

      // Scale models: use the currently active scale bank in the ref editor, fall back to global XLSM_SCALE_MODELS
      const activeScaleBank = (_availableScaleBanks || []).find(b => b.filename === (_refEditorActiveScaleBank || 'grade-scale-models.js')) || (_availableScaleBanks || [])[0] || null;
      const rawScales = (activeScaleBank && Array.isArray(activeScaleBank.scales))
        ? activeScaleBank.scales
        : (Array.isArray(XLSM_SCALE_MODELS) ? XLSM_SCALE_MODELS : []);
      const existingKeys = new Set();
      const scaleModels = rawScales.map((entry, index) => normalizeReferenceScaleModel(entry, index, existingKeys));

      // Chips: use the currently active chip bank in the ref editor, fall back to getObservationChecklistGroups
      const activeChipBank = (_availableChipBanks || []).find(b => b.filename === (_refEditorActiveChipBank || 'correction-criteria.js')) || (_availableChipBanks || [])[0] || null;
      const rawGroups = (activeChipBank && Array.isArray(activeChipBank.chips))
        ? activeChipBank.chips
        : getObservationChecklistGroups();
      const personalisedChips = rawGroups.map(g => ({
        type: String(g.type || "").trim(),
        items: Array.isArray(g.items) ? g.items.slice() : []
      }));
      return { criteria, scaleModels, personalisedChips };
    }

    function makeBlankCriterion(index) {
      const comments = {};
      const colors = {};
      DEFAULT_CRITERION_GRADES.forEach((key, idx) => {
        comments[key] = "";
        colors[key] = getDefaultGradeColor(key, idx, DEFAULT_CRITERION_GRADES.length);
      });
      return { name: `Criterion ${index + 1}`, grades: DEFAULT_CRITERION_GRADES.slice(), comments, colors, minPoints: null, maxPoints: null };
    }

    function makeBlankScaleModel(index) {
      const minGrade = 1;
      const maxGrade = 6;
      const interval = 0.5;
      const steps = computeScaleGradeSteps(maxGrade, minGrade, interval);
      const thresholds = {};
      const colors = {};
      const stepCount = steps.length;
      steps.forEach((grade, gIdx) => {
        const gradeKey = String(grade);
        thresholds[gradeKey] = Number((((stepCount - 1 - gIdx) / (stepCount - 1)) * 100).toFixed(2));
        colors[gradeKey] = getDefaultGradeColor(gradeKey, gIdx, stepCount);
      });
      return { key: `custom${index + 1}`, label: `Custom ${index + 1}`, minGrade, maxGrade, interval, thresholds, colors };
    }

    function makeBlankPersonalisedChipsGroup(index) {
      return { type: `Category ${index + 1}`, items: [] };
    }

    function duplicateCriterion(entry, index) {
      const copy = normalizeReferenceCriterion(entry, index);
      copy.name = `${copy.name} (Copy)`;
      return copy;
    }

    function duplicateScaleModel(entry, index) {
      const copy = normalizeReferenceScaleModel(entry, index, new Set());
      copy.key = `${copy.key}-copy`;
      copy.label = `${copy.label} (Copy)`;
      return copy;
    }

    function duplicatePersonalisedChipsGroup(entry, index) {
      return {
        type: `${entry.type || 'Category'} copy`,
        items: Array.isArray(entry.items) ? entry.items.slice() : []
      };
    }

    function refreshCriteriaPresetDropdown(bankFilename) {
      const sel = document.getElementById("crit-popup-preset");
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Select preset --</option>';

      let criteria = [];
      if (bankFilename && _availableCriteriaBanks.length) {
        const bank = _availableCriteriaBanks.find(b => b.filename === bankFilename);
        if (bank && Array.isArray(bank.criteria)) criteria = bank.criteria;
      }
      if (!criteria.length) {
        const activeClass = getActiveClass();
        const activeTest = (activeClass && appState.activeTest && activeClass.testConfigs)
          ? (activeClass.testConfigs[appState.activeTest.semester]?.[appState.activeTest.testIndex])
          : null;
        const bank = getTestCriteriaBank(activeClass, activeTest);
        if (bank && Array.isArray(bank.criteria)) criteria = bank.criteria;
      }
      if (!criteria.length) {
        criteria = (typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : [];
      }

      criteria.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.name;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }

    function getReferenceCriterionHeading(criterion, index) {
      const name = criterion && typeof criterion.name === "string" ? criterion.name.trim() : "";
      return name || `Criterion ${index + 1}`;
    }

    function getReferenceScaleHeading(model, index) {
      const label = model && typeof model.label === "string" ? model.label.trim() : "";
      const key = model && typeof model.key === "string" ? model.key.trim() : "";
      return label || key || `Model ${index + 1}`;
    }

    function getReferenceScaleNote(model, index) {
      const key = model && typeof model.key === "string" ? model.key.trim() : "";
      const identifier = key || `model-${index + 1}`;
      return tFmt('gsRefScaleNote', { identifier });
    }

    function updateReferenceCardHeading(card, kind, item, index) {
      if (!card) return;
      const headingEl = card.querySelector(".ref-item-index");
      const noteEl = card.querySelector(".ref-inline-note");
      if (!headingEl) return;
      if (kind === "criterion") {
        headingEl.textContent = getReferenceCriterionHeading(item, index);
        if (noteEl) noteEl.textContent = tFmt('gsRefCritBlankName', { n: index + 1 });
        return;
      }
      if (kind === "scale") {
        headingEl.textContent = getReferenceScaleHeading(item, index);
        if (noteEl) noteEl.textContent = getReferenceScaleNote(item, index);
        return;
      }
      if (kind === "chips") {
        headingEl.textContent = (item && item.type && item.type.trim()) || `Category ${index + 1}`;
        if (noteEl) noteEl.textContent = tFmt('gsRefChipsBlankName', { n: index + 1 });
      }
    }

    function attachReferenceCardCollapseHandlers(container, selector) {
      container.querySelectorAll(selector).forEach(head => {
        head.addEventListener("click", evt => {
          if (evt.target.closest("button, input, textarea, select, label")) return;
          const card = head.closest(".ref-item-card");
          if (!card) return;
          const expanded = !card.classList.contains("collapsed");
          card.classList.toggle("collapsed", expanded);
          head.setAttribute("aria-expanded", String(!expanded));
        });
        head.addEventListener("keydown", evt => {
          if (evt.key !== "Enter" && evt.key !== " ") return;
          evt.preventDefault();
          head.click();
        });
      });
    }

    let _referenceDataEditorDraft = null;

    function switchRefEditorScaleBank(bankFn) {
      _refEditorActiveScaleBank = bankFn;
      if (!_referenceDataEditorDraft) return;
      const bank = (_availableScaleBanks || []).find(b => b.filename === bankFn);
      const rawScales = (bank && Array.isArray(bank.scales)) ? bank.scales : (bankFn === 'grade-scale-models.js' && Array.isArray(XLSM_SCALE_MODELS) ? XLSM_SCALE_MODELS : []);
      const existingKeys = new Set();
      _referenceDataEditorDraft.scaleModels = rawScales.map((entry, index) => normalizeReferenceScaleModel(entry, index, existingKeys));
      renderReferenceDataEditor({ initial: true });
    }

    function switchRefEditorChipBank(bankFn) {
      _refEditorActiveChipBank = bankFn;
      if (!_referenceDataEditorDraft) return;
      const bank = (_availableChipBanks || []).find(b => b.filename === bankFn);
      const rawChips = (bank && Array.isArray(bank.chips)) ? bank.chips : (bankFn === 'correction-criteria.js' ? getObservationChecklistGroups('correction-criteria.js') : []);
      _referenceDataEditorDraft.personalisedChips = rawChips.map(g => ({
        type: String(g.type || "").trim(),
        items: Array.isArray(g.items) ? g.items.slice() : []
      }));
      renderReferenceDataEditor({ initial: true });
    }

    function switchRefEditorCriteriaBank(bankFn) {
      _refEditorActiveCriteriaBank = bankFn;
      if (!_referenceDataEditorDraft) return;
      const bank = (_availableCriteriaBanks || []).find(b => b.filename === bankFn);
      const rawCriteria = (bank && Array.isArray(bank.criteria)) ? bank.criteria
        : (bankFn === 'correction-criteria.js' && typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA) ? XLSM_CRITERIA : []);
      _referenceDataEditorDraft.criteria = rawCriteria.map((entry, index) => normalizeReferenceCriterion(entry, index));
      renderReferenceDataEditor({ initial: true });
    }

    function renderReferenceDataEditor(options = {}) {
      const draft = _referenceDataEditorDraft;
      if (!draft) return;

      const criteriaList = document.getElementById("ref-criteria-list");
      const scaleList = document.getElementById("ref-scale-list");
      const chipsList = document.getElementById("ref-chips-list");
      if (!criteriaList || !scaleList || !chipsList) return;

      const criteriaBankSel = document.getElementById("ref-criteria-bank-select");
      if (criteriaBankSel) {
        populateCriteriaBankSelectElement(criteriaBankSel, _refEditorActiveCriteriaBank || 'correction-criteria.js');
        criteriaBankSel.onchange = () => {
          switchRefEditorCriteriaBank(criteriaBankSel.value);
        };
      }
      const scaleBankSel = document.getElementById("ref-scale-bank-select");
      if (scaleBankSel) {
        populateScaleBankSelectElement(scaleBankSel, _refEditorActiveScaleBank || 'grade-scale-models.js');
        scaleBankSel.onchange = () => {
          switchRefEditorScaleBank(scaleBankSel.value);
        };
      }
      const chipsBankSel = document.getElementById("ref-chips-bank-select");
      if (chipsBankSel) {
        populateChipBankSelectElement(chipsBankSel, _refEditorActiveChipBank || 'correction-criteria.js');
        chipsBankSel.onchange = () => {
          switchRefEditorChipBank(chipsBankSel.value);
        };
      }

      // Capture currently expanded cards before rebuilding DOM
      const expandedCriteria = new Set();
      const expandedScales = new Set();
      const expandedChips = new Set();

      if (!options.initial) {
        criteriaList.querySelectorAll(".ref-item-card:not(.collapsed)").forEach(card => {
          const idx = card.getAttribute("data-index");
          if (idx != null) expandedCriteria.add(Number(idx));
        });
        scaleList.querySelectorAll(".ref-item-card:not(.collapsed)").forEach(card => {
          const idx = card.getAttribute("data-index");
          if (idx != null) expandedScales.add(Number(idx));
        });
        chipsList.querySelectorAll(".ref-item-card:not(.collapsed)").forEach(card => {
          const idx = card.getAttribute("data-index");
          if (idx != null) expandedChips.add(Number(idx));
        });
      }

      if (options.expandCriterionIndex != null) expandedCriteria.add(options.expandCriterionIndex);
      if (options.expandScaleIndex != null) expandedScales.add(options.expandScaleIndex);
      if (options.expandChipsIndex != null) expandedChips.add(options.expandChipsIndex);

      // Capture active element focus info to restore after re-render
      const activeEl = document.activeElement;
      let focusInfo = null;
      if (activeEl && activeEl.matches && activeEl.matches("#reference-data-popup-overlay [data-field]")) {
        focusInfo = {
          kind: activeEl.getAttribute("data-kind"),
          index: Number(activeEl.getAttribute("data-index")),
          field: activeEl.getAttribute("data-field"),
          selectionStart: typeof activeEl.selectionStart === "number" ? activeEl.selectionStart : null,
          selectionEnd: typeof activeEl.selectionEnd === "number" ? activeEl.selectionEnd : null
        };
      }

      criteriaList.innerHTML = draft.criteria.map((criterion, index) => {
        const isExpanded = expandedCriteria.has(index);
        const gradeList = normalizeCriterionGrades(criterion.grades);
        const heading = getReferenceCriterionHeading(criterion, index);
        const commentFields = gradeList.map((grade, gIdx) => {
          const value = escapeHtml(criterion.comments[grade] || "");
          const color = (criterion.colors && criterion.colors[grade]) || getDefaultGradeColor(grade, gIdx, gradeList.length);
          const textColor = getHighContrastTextColor(color);
          return `
            <label class="ref-field">
              <div class="ref-field-header">
                <span class="ref-grade-badge" style="background:${color}18; color:${textColor}; border-color:${color};">${escapeHtml(grade)}</span>
                <button type="button" class="ref-color-btn" data-action="pick-grade-color" data-index="${index}" data-grade="${escapeHtml(grade)}" style="background-color:${color};" title="Choose color (50 colors)"></button>
              </div>
              <textarea data-kind="criterion" data-index="${index}" data-field="comment-${escapeHtml(grade)}">${value}</textarea>
            </label>`;
        }).join("");
        return `
          <div class="ref-item-card criteria-card ${isExpanded ? '' : 'collapsed'}" data-kind="criterion" data-index="${index}">
            <div class="ref-item-head" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" data-label-expand="${t('gsRefClickToExpand')}" data-label-collapse="${t('gsRefClickToCollapse')}">
              <div>
                <div class="ref-item-index">${escapeHtml(heading)}</div>
                <div class="ref-inline-note">${escapeHtml(tFmt('gsRefCritBlankName', { n: index + 1 }))}</div>
              </div>
              <div class="ref-actions">
                <button type="button" class="btn" data-action="criterion-duplicate" data-index="${index}">${t('gsBtnDuplicateItem')}</button>
                <button type="button" class="btn" data-action="criterion-delete" data-index="${index}" style="color:var(--warn);">${t('gsBtnDelete')}</button>
              </div>
            </div>
            <div class="ref-item-body ref-item-grid ref-criteria-grid">
              <label class="ref-field" style="grid-column:1/-1;">
                <span>${t('gsCritName')}</span>
                <input class="input" type="text" data-kind="criterion" data-index="${index}" data-field="name" value="${escapeHtml(criterion.name)}" />
              </label>
              <label class="ref-field">
                <span>${t('gsRefCritLabelMinPts')}</span>
                <input class="input" type="number" step="0.1" data-kind="criterion" data-index="${index}" data-field="minPoints" value="${criterion.minPoints != null ? escapeHtml(fmtN(criterion.minPoints)) : ''}" placeholder="optional" />
              </label>
              <label class="ref-field">
                <span>${t('gsRefCritLabelMaxPts')}</span>
                <input class="input" type="number" step="0.1" data-kind="criterion" data-index="${index}" data-field="maxPoints" value="${criterion.maxPoints != null ? escapeHtml(fmtN(criterion.maxPoints)) : ''}" placeholder="optional" />
              </label>
              <label class="ref-field">
                <span>${t('gsRefCritLabelInterval')}</span>
                <input class="input" type="number" step="0.05" min="0.01" data-kind="criterion" data-index="${index}" data-field="interval" value="${criterion.interval != null ? escapeHtml(fmtN(criterion.interval)) : ''}" placeholder="0.5" />
              </label>
              <label class="ref-field" style="grid-column:span 2;">
                <span>${t('gsRefGradesShown')}</span>
                <input class="input" type="text" data-kind="criterion" data-index="${index}" data-field="grades" value="${escapeHtml(gradeList.join(", "))}" placeholder="e.g. 6, 5, 4, 3" />
              </label>
              ${commentFields}
            </div>
          </div>`;
      }).join("");

      scaleList.innerHTML = draft.scaleModels.map((model, index) => {
        const isExpanded = expandedScales.has(index);
        const heading = getReferenceScaleHeading(model, index);
        const note = getReferenceScaleNote(model, index);
        const steps = getScaleModelGradeSteps(model);
        const thresholdFields = steps.map((grade, gIdx) => {
          const gradeKey = String(grade);
          const value = model.thresholds[gradeKey] ?? 0;
          const color = (model.colors && model.colors[gradeKey]) || getDefaultGradeColor(gradeKey, gIdx, steps.length);
          const textColor = getHighContrastTextColor(color);
          return `
            <label class="ref-field">
              <div class="ref-field-header">
                <span class="ref-grade-badge" style="background:${color}18; color:${textColor}; border-color:${color};">${grade}</span>
                <button type="button" class="ref-color-btn" data-action="pick-scale-color" data-index="${index}" data-grade="${gradeKey}" style="background-color:${color};" title="Choose color for grade ${gradeKey} (50 colors)"></button>
              </div>
              <input class="input" type="number" min="0" max="100" step="0.1" data-kind="scale" data-index="${index}" data-field="threshold-${gradeKey}" value="${escapeHtml(fmtN(value))}" />
            </label>`;
        }).join("");
        return `
          <div class="ref-item-card scale-card ${isExpanded ? '' : 'collapsed'}" data-kind="scale" data-index="${index}">
            <div class="ref-item-head" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" data-label-expand="${t('gsRefClickToExpand')}" data-label-collapse="${t('gsRefClickToCollapse')}">
              <div>
                <div class="ref-item-index">${escapeHtml(heading)}</div>
                <div class="ref-inline-note">${escapeHtml(note)}</div>
              </div>
              <div class="ref-actions">
                <button type="button" class="btn" data-action="scale-duplicate" data-index="${index}">${t('gsBtnDuplicateItem')}</button>
                <button type="button" class="btn" data-action="scale-delete" data-index="${index}" style="color:var(--warn);">${t('gsBtnDelete')}</button>
              </div>
            </div>
            <div class="ref-item-body ref-item-grid ref-scale-grid">
              <label class="ref-field">
                <span>${t('gsRefScaleKey')}</span>
                <input class="input" type="text" data-kind="scale" data-index="${index}" data-field="key" value="${escapeHtml(model.key)}" />
              </label>
              <label class="ref-field" style="grid-column:span 2;">
                <span>${t('gsRefScaleLabel')}</span>
                <input class="input" type="text" data-kind="scale" data-index="${index}" data-field="label" value="${escapeHtml(model.label)}" />
              </label>
              <label class="ref-field">
                <span>Min Grade</span>
                <input class="input" type="number" step="0.1" data-kind="scale" data-index="${index}" data-field="minGrade" value="${escapeHtml(fmtN(model.minGrade != null ? model.minGrade : 1))}" />
              </label>
              <label class="ref-field">
                <span>Max Grade</span>
                <input class="input" type="number" step="0.1" data-kind="scale" data-index="${index}" data-field="maxGrade" value="${escapeHtml(fmtN(model.maxGrade != null ? model.maxGrade : 6))}" />
              </label>
              <label class="ref-field">
                <span>Interval</span>
                <input class="input" type="number" step="0.05" min="0.01" data-kind="scale" data-index="${index}" data-field="interval" value="${escapeHtml(fmtN(model.interval != null ? model.interval : 0.5))}" />
              </label>
              ${thresholdFields}
            </div>
          </div>`;
      }).join("");

      criteriaList.querySelectorAll("[data-field]").forEach(field => {
        const handleCriteriaInputOrChange = (evt, isChange) => {
          const index = Number(evt.target.getAttribute("data-index"));
          const item = draft.criteria[index];
          if (!item) return;
          const fieldName = evt.target.getAttribute("data-field");
          if (fieldName === "name") {
            item.name = evt.target.value;
            updateReferenceCardHeading(evt.target.closest(".ref-item-card"), "criterion", item, index);
            return;
          }
          if (fieldName === "minPoints") {
            const v = toNumber(evt.target.value);
            item.minPoints = v != null ? v : null;
            return;
          }
          if (fieldName === "maxPoints") {
            const v = toNumber(evt.target.value);
            item.maxPoints = v != null && v >= 0 ? v : null;
            return;
          }
          if (fieldName === "interval") {
            const v = toNumber(evt.target.value);
            item.interval = v != null && v > 0 ? v : null;
            return;
          }
          if (fieldName === "grades") {
            if (isChange) {
              const grades = normalizeCriterionGrades(evt.target.value);
              const nextComments = {};
              const nextColors = {};
              grades.forEach((grade, gIdx) => {
                nextComments[grade] = item.comments && typeof item.comments[grade] === "string" ? item.comments[grade] : "";
                nextColors[grade] = item.colors && item.colors[grade] ? item.colors[grade] : getDefaultGradeColor(grade, gIdx, grades.length);
              });
              item.grades = grades;
              item.comments = nextComments;
              item.colors = nextColors;
              renderReferenceDataEditor();
            }
            return;
          }
          const grade = fieldName.replace("comment-", "");
          if (!item.comments) item.comments = {};
          item.comments[grade] = evt.target.value;
        };

        field.addEventListener("input", evt => handleCriteriaInputOrChange(evt, false));
        field.addEventListener("change", evt => handleCriteriaInputOrChange(evt, true));
      });

      criteriaList.querySelectorAll("[data-action='pick-grade-color']").forEach(btn => {
        btn.addEventListener("click", evt => {
          evt.stopPropagation();
          const index = Number(btn.getAttribute("data-index"));
          const grade = btn.getAttribute("data-grade");
          const item = draft.criteria[index];
          if (!item) return;
          const currentColor = (item.colors && item.colors[grade]) || getDefaultGradeColor(grade);
          openRefColorPicker(btn, currentColor, (newColor) => {
            if (!item.colors) item.colors = {};
            item.colors[grade] = newColor;
            btn.style.backgroundColor = newColor;
            const fieldEl = btn.closest(".ref-field");
            if (fieldEl) {
              const badge = fieldEl.querySelector(".ref-grade-badge");
              if (badge) {
                const textCol = getHighContrastTextColor(newColor);
                badge.style.color = textCol;
                badge.style.borderColor = newColor;
                badge.style.backgroundColor = `${newColor}18`;
              }
            }
          });
        });
      });

      attachReferenceCardCollapseHandlers(criteriaList, ".criteria-card .ref-item-head");

      scaleList.querySelectorAll("[data-field]").forEach(field => {
        const handleScaleInputOrChange = (evt, isChange) => {
          const index = Number(evt.target.getAttribute("data-index"));
          const item = draft.scaleModels[index];
          if (!item) return;
          const fieldName = evt.target.getAttribute("data-field");
          if (fieldName === "key") {
            item.key = evt.target.value;
            updateReferenceCardHeading(evt.target.closest(".ref-item-card"), "scale", item, index);
            return;
          }
          if (fieldName === "label") {
            item.label = evt.target.value;
            updateReferenceCardHeading(evt.target.closest(".ref-item-card"), "scale", item, index);
            return;
          }
          if (fieldName === "minGrade" || fieldName === "maxGrade" || fieldName === "interval") {
            const rawVal = toNumber(evt.target.value);
            if (rawVal != null) {
              item[fieldName] = rawVal;
              if (isChange) {
                const steps = computeScaleGradeSteps(item.maxGrade, item.minGrade, item.interval);
                const nextThresholds = {};
                const nextColors = {};
                const stepCount = steps.length;
                steps.forEach((g, gIdx) => {
                  const k = String(g);
                  const fallbackPct = stepCount > 1 ? Number((((stepCount - 1 - gIdx) / (stepCount - 1)) * 100).toFixed(2)) : 0;
                  nextThresholds[k] = item.thresholds && item.thresholds[k] != null ? item.thresholds[k] : fallbackPct;
                  nextColors[k] = item.colors && item.colors[k] ? item.colors[k] : getDefaultGradeColor(k, gIdx, stepCount);
                });
                item.thresholds = nextThresholds;
                item.colors = nextColors;
                renderReferenceDataEditor();
              }
            }
            return;
          }
          const grade = fieldName.replace("threshold-", "");
          if (!item.thresholds) item.thresholds = {};
          item.thresholds[grade] = toNumber(evt.target.value) ?? 0;
        };

        field.addEventListener("input", evt => handleScaleInputOrChange(evt, false));
        field.addEventListener("change", evt => handleScaleInputOrChange(evt, true));
      });

      scaleList.querySelectorAll("[data-action='pick-scale-color']").forEach(btn => {
        btn.addEventListener("click", evt => {
          evt.stopPropagation();
          const index = Number(btn.getAttribute("data-index"));
          const grade = btn.getAttribute("data-grade");
          const item = draft.scaleModels[index];
          if (!item) return;
          const currentColor = (item.colors && item.colors[grade]) || getDefaultGradeColor(grade);
          openRefColorPicker(btn, currentColor, (newColor) => {
            if (!item.colors) item.colors = {};
            item.colors[grade] = newColor;
            btn.style.backgroundColor = newColor;
            const fieldEl = btn.closest(".ref-field");
            if (fieldEl) {
              const badge = fieldEl.querySelector(".ref-grade-badge");
              if (badge) {
                const textCol = getHighContrastTextColor(newColor);
                badge.style.color = textCol;
                badge.style.borderColor = newColor;
                badge.style.backgroundColor = `${newColor}18`;
              }
            }
          });
        });
      });

      attachReferenceCardCollapseHandlers(scaleList, ".scale-card .ref-item-head");

      criteriaList.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", async evt => {
          evt.stopPropagation();
          const index = Number(evt.target.getAttribute("data-index"));
          const action = evt.target.getAttribute("data-action");
          if (action === "criterion-duplicate") {
            draft.criteria.splice(index + 1, 0, duplicateCriterion(draft.criteria[index], index + 1));
            renderReferenceDataEditor({ expandCriterionIndex: index + 1 });
          } else if (action === "criterion-delete") {
            if (await showConfirm(t('gsConfirmDeleteCriterion'))) {
              draft.criteria.splice(index, 1);
              renderReferenceDataEditor();
            }
          }
        });
      });

      scaleList.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", async evt => {
          const index = Number(evt.target.getAttribute("data-index"));
          const action = evt.target.getAttribute("data-action");
          if (action === "scale-duplicate") {
            draft.scaleModels.splice(index + 1, 0, duplicateScaleModel(draft.scaleModels[index], index + 1));
            renderReferenceDataEditor({ expandScaleIndex: index + 1 });
          } else if (action === "scale-delete") {
            if (await showConfirm(t('gsConfirmDeleteScale'))) {
              draft.scaleModels.splice(index, 1);
              renderReferenceDataEditor();
            }
          }
        });
      });

      chipsList.innerHTML = draft.personalisedChips.map((group, index) => {
        const isExpanded = expandedChips.has(index);
        const heading = group.type || `Category ${index + 1}`;
        const itemsVal = Array.isArray(group.items) ? group.items.join(", ") : "";
        return `
          <div class="ref-item-card chips-card ${isExpanded ? '' : 'collapsed'}" data-kind="chips" data-index="${index}">
            <div class="ref-item-head" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" data-label-expand="${t('gsRefClickToExpand')}" data-label-collapse="${t('gsRefClickToCollapse')}">
              <div>
                <div class="ref-item-index">${escapeHtml(heading)}</div>
                <div class="ref-inline-note">${escapeHtml(tFmt('gsRefChipsBlankName', { n: index + 1 }))}</div>
              </div>
              <div class="ref-actions">
                <button type="button" class="btn" data-action="chips-duplicate" data-index="${index}">${t('gsBtnDuplicateItem')}</button>
                <button type="button" class="btn" data-action="chips-delete" data-index="${index}" style="color:var(--warn);">${t('gsBtnDelete')}</button>
              </div>
            </div>
            <div class="ref-item-body ref-item-grid ref-chips-grid">
              <label class="ref-field" style="grid-column: 1 / -1;">
                <span>${t('gsRefCategoryName')}</span>
                <input class="input" type="text" data-kind="chips" data-index="${index}" data-field="type" value="${escapeHtml(group.type)}" />
              </label>
              <label class="ref-field" style="grid-column: 1 / -1;">
                <span>${t('gsRefChipsListLabel')}</span>
                <textarea class="input" data-kind="chips" data-index="${index}" data-field="items" placeholder="e.g. Speaks clearly, Needs support, Clear explanation">${escapeHtml(itemsVal)}</textarea>
              </label>
            </div>
          </div>`;
      }).join("");

      chipsList.querySelectorAll("[data-field]").forEach(field => {
        field.addEventListener("input", evt => {
          const index = Number(evt.target.getAttribute("data-index"));
          const item = draft.personalisedChips[index];
          if (!item) return;
          const fieldName = evt.target.getAttribute("data-field");
          if (fieldName === "type") {
            item.type = evt.target.value;
            updateReferenceCardHeading(evt.target.closest(".ref-item-card"), "chips", item, index);
            return;
          }
          if (fieldName === "items") {
            item.items = evt.target.value
              .split(/[,\n]/)
              .map(v => v.trim())
              .filter(Boolean);
          }
        });
      });

      attachReferenceCardCollapseHandlers(chipsList, ".chips-card .ref-item-head");

      chipsList.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", async evt => {
          evt.stopPropagation();
          const index = Number(evt.target.getAttribute("data-index"));
          const action = evt.target.getAttribute("data-action");
          if (action === "chips-duplicate") {
            draft.personalisedChips.splice(index + 1, 0, duplicatePersonalisedChipsGroup(draft.personalisedChips[index], index + 1));
            renderReferenceDataEditor({ expandChipsIndex: index + 1 });
          } else if (action === "chips-delete") {
            if (await showConfirm(t('gsConfirmDeleteChipCategory'))) {
              draft.personalisedChips.splice(index, 1);
              renderReferenceDataEditor();
            }
          }
        });
      });

      // Restore focus & text selection if a field was previously focused
      if (focusInfo) {
        const container = focusInfo.kind === "criterion" ? criteriaList :
                          (focusInfo.kind === "scale" ? scaleList : chipsList);
        const targetInput = container.querySelector(
          `[data-kind="${focusInfo.kind}"][data-index="${focusInfo.index}"][data-field="${focusInfo.field}"]`
        );
        if (targetInput) {
          targetInput.focus();
          if (focusInfo.selectionStart != null && focusInfo.selectionEnd != null && typeof targetInput.setSelectionRange === "function") {
            try {
              targetInput.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
            } catch (e) {}
          }
        }
      }
    }

    async function saveReferenceDataEditor() {
      if (!_referenceDataEditorDraft) return;

      const existingKeys = new Set();
      const criteria = _referenceDataEditorDraft.criteria.map((criterion, index) => {
        const normalized = normalizeReferenceCriterion(criterion, index);
        normalized.name = normalized.name.trim() || `Criterion ${index + 1}`;
        normalized.grades = normalizeCriterionGrades(normalized.grades);
        return normalized;
      });

      const scaleModels = _referenceDataEditorDraft.scaleModels.map((model, index) => {
        const normalized = normalizeReferenceScaleModel(model, index, existingKeys);
        normalized.label = normalized.label.trim() || `Custom ${index + 1}`;
        return normalized;
      });

      const personalisedChips = _referenceDataEditorDraft.personalisedChips.map((group, index) => {
        const type = group.type.trim() || `Category ${index + 1}`;
        const items = Array.isArray(group.items)
          ? group.items.map(v => String(v || "").trim()).filter(Boolean)
          : [];
        return { type, items };
      });

      // 1. Save criteria (to active criteria bank)
      const activeCriteriaFn = _refEditorActiveCriteriaBank || 'correction-criteria.js';
      const criteriaBankEntry = (_availableCriteriaBanks || []).find(b => b.filename === activeCriteriaFn);
      if (criteriaBankEntry) criteriaBankEntry.criteria = criteria;

      if (activeCriteriaFn === 'correction-criteria.js') {
        XLSM_CRITERIA.splice(0, XLSM_CRITERIA.length, ...criteria);
        localStorage.setItem(REFERENCE_CRITERIA_STORAGE_KEY, JSON.stringify(criteria));
      } else {
        try {
          const lsKey = 'cmt-criteria-' + activeCriteriaFn.replace(/\.(js|json)$/i, '');
          localStorage.setItem(lsKey, JSON.stringify(criteria));
        } catch (_) {}
      }

      // 2. Save scale models (to active scale bank)
      const activeScaleFn = _refEditorActiveScaleBank || 'grade-scale-models.js';
      const scaleBankEntry = (_availableScaleBanks || []).find(b => b.filename === activeScaleFn);
      if (scaleBankEntry) scaleBankEntry.scales = scaleModels;

      if (activeScaleFn === 'grade-scale-models.js') {
        XLSM_SCALE_MODELS.splice(0, XLSM_SCALE_MODELS.length, ...scaleModels);
        localStorage.setItem(REFERENCE_SCALE_MODELS_STORAGE_KEY, JSON.stringify(scaleModels));
      } else {
        try {
          const lsKey = 'cmt-scales-' + activeScaleFn.replace(/\.(js|json)$/i, '');
          localStorage.setItem(lsKey, JSON.stringify(scaleModels));
        } catch (_) {}
      }

      // 3. Save observation chips (to active chip bank)
      const activeChipFn = _refEditorActiveChipBank || 'correction-criteria.js';
      const chipBankEntry = (_availableChipBanks || []).find(b => b.filename === activeChipFn);
      if (chipBankEntry) chipBankEntry.chips = personalisedChips;

      if (activeChipFn === 'correction-criteria.js') {
        window.OBSERVATION_CHECKLIST_GROUPS = personalisedChips;
        localStorage.setItem(REFERENCE_PERSONALISED_CHIPS_STORAGE_KEY, JSON.stringify(personalisedChips));
      } else {
        try {
          const lsKey = 'cmt-chips-' + activeChipFn.replace(/\.(js|json)$/i, '');
          localStorage.setItem(lsKey, JSON.stringify(personalisedChips));
        } catch (_) {}
      }

      // File I/O for Electron
      if (window.Desktop && Desktop.isElectron()) {
        const savePromises = [];

        // Save correction-criteria.js (default criteria + default chips if default, or only chips if editing a different criteria bank)
        const decToSave = (typeof window.SCORING_DECISIONS !== 'undefined' && Array.isArray(window.SCORING_DECISIONS)) ? window.SCORING_DECISIONS : [];
        syncCriteriaRecordScoringDecisions(criteria, decToSave);
        if (activeCriteriaFn === 'correction-criteria.js') {
          const chipsToSaveInCriteriaFile = (activeChipFn === 'correction-criteria.js')
            ? personalisedChips
            : (typeof OBSERVATION_CHECKLIST_GROUPS !== 'undefined' ? OBSERVATION_CHECKLIST_GROUPS : []);
          const criteriaText = `const XLSM_CRITERIA = ${JSON.stringify(criteria, null, 2)};\n` +
            `const OBSERVATION_CHECKLIST_GROUPS = ${JSON.stringify(chipsToSaveInCriteriaFile, null, 2)};\n` +
            `const SCORING_DECISIONS = ${JSON.stringify(decToSave, null, 2)};\n`;
          savePromises.push(Desktop.saveText("user", "correction-criteria.js", criteriaText));
        } else {
          // Save to custom criteria file
          const customDecToSave = criteriaBankEntry?.scoringDecisions || [];
          syncCriteriaRecordScoringDecisions(criteria, customDecToSave);
          const isJson = activeCriteriaFn.endsWith('.json');
          const customCriteriaText = isJson
            ? JSON.stringify({ criteria, scoringDecisions: customDecToSave }, null, 2)
            : `// XLSM_CRITERIA\nconst XLSM_CRITERIA = ${JSON.stringify(criteria, null, 2)};\n` +
              `const SCORING_DECISIONS = ${JSON.stringify(customDecToSave, null, 2)};\n`;
          savePromises.push(Desktop.saveText("customCriteria", activeCriteriaFn, customCriteriaText));
          // Also make sure correction-criteria.js is preserved (chips may still live there)
          if (activeChipFn === 'correction-criteria.js') {
            const existingCriteria = (typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : [];
            syncCriteriaRecordScoringDecisions(existingCriteria, decToSave);
            const defaultCriteriaText = `const XLSM_CRITERIA = ${JSON.stringify(existingCriteria, null, 2)};\n` +
              `const OBSERVATION_CHECKLIST_GROUPS = ${JSON.stringify(personalisedChips, null, 2)};\n` +
              `const SCORING_DECISIONS = ${JSON.stringify(decToSave, null, 2)};\n`;
            savePromises.push(Desktop.saveText("user", "correction-criteria.js", defaultCriteriaText));
          }
        }

        // Save scale models
        if (activeScaleFn === 'grade-scale-models.js') {
          const scaleModelsText = `const XLSM_SCALE_MODELS = ${JSON.stringify(scaleModels, null, 2)};\n`;
          savePromises.push(Desktop.saveText("user", "grade-scale-models.js", scaleModelsText));
        } else {
          const isJson = activeScaleFn.endsWith('.json');
          const customScalesText = isJson
            ? JSON.stringify(scaleModels, null, 2)
            : `// XLSM_SCALE_MODELS\nconst XLSM_SCALE_MODELS = ${JSON.stringify(scaleModels, null, 2)};\n`;
          savePromises.push(Desktop.saveText("customScales", activeScaleFn, customScalesText));
        }

        // Save custom chips if custom
        if (activeChipFn !== 'correction-criteria.js') {
          const isJson = activeChipFn.endsWith('.json');
          const customChipsText = isJson
            ? JSON.stringify(personalisedChips, null, 2)
            : `// OBSERVATION_CHECKLIST_GROUPS\nconst OBSERVATION_CHECKLIST_GROUPS = ${JSON.stringify(personalisedChips, null, 2)};\n`;
          savePromises.push(Desktop.saveText("customChips", activeChipFn, customChipsText));
        }

        // Save summary display settings
        if (_summarySettingsDraft) {
          const mergedDraft = {
            ...DEFAULT_SUMMARY_DISPLAY_SETTINGS,
            ..._summarySettingsDraft,
            anchors: [...(_summarySettingsDraft.anchors || ["6", "4", "1"])],
            gradeColors: { ..._summarySettingsDraft.gradeColors }
          };
          if (_summarySettingsScope === 'class') {
            const actClass = typeof getActiveClass === 'function' ? getActiveClass() : null;
            if (actClass) {
              actClass.summarySettings = {
                ...mergedDraft,
                custom: true
              };
              if (typeof saveGradesStructured === 'function') {
                savePromises.push(saveGradesStructured().catch(err => console.error("Could not save class summary settings:", err)));
              }
            }
          } else {
            window.SUMMARY_DISPLAY_SETTINGS = {
              ...mergedDraft,
              version: 2
            };
            try {
              localStorage.setItem('cmt-summary-display-settings', JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS));
            } catch (_) {}
            if (window.Desktop && Desktop.isElectron()) {
              const summarySettingsText = `// Class Summary Display Settings\n// Automatically updated\nwindow.SUMMARY_DISPLAY_SETTINGS = ${JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS, null, 2)};\n`;
              savePromises.push(Desktop.saveText("user", "summary-display-settings.js", summarySettingsText));
            }
            if (typeof BroadcastChannel !== 'undefined') {
              try {
                new BroadcastChannel('cmt-summary-settings').postMessage({ updated: true });
              } catch (_) {}
            }
          }
          if (mergedDraft.defaultNameFormat && typeof setGsNameDisplayMode === 'function') {
            localStorage.setItem('cmt-gs-name-display', mergedDraft.defaultNameFormat);
            const nameSel = document.getElementById('gs-name-display-select');
            if (nameSel) nameSel.value = mergedDraft.defaultNameFormat;
          }
        }

        await Promise.all(savePromises);
      } else {
        // Browser fallback mode for summary settings
        if (_summarySettingsDraft) {
          const mergedDraft = {
            ...DEFAULT_SUMMARY_DISPLAY_SETTINGS,
            ..._summarySettingsDraft,
            anchors: [...(_summarySettingsDraft.anchors || ["6", "4", "1"])],
            gradeColors: { ..._summarySettingsDraft.gradeColors }
          };
          if (_summarySettingsScope === 'class') {
            const actClass = typeof getActiveClass === 'function' ? getActiveClass() : null;
            if (actClass) {
              actClass.summarySettings = {
                ...mergedDraft,
                custom: true
              };
              if (typeof saveGradesStructured === 'function') {
                saveGradesStructured().catch(err => console.error("Could not save class summary settings:", err));
              }
            }
          } else {
            window.SUMMARY_DISPLAY_SETTINGS = {
              ...mergedDraft,
              version: 2
            };
            try {
              localStorage.setItem('cmt-summary-display-settings', JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS));
            } catch (_) {}
            if (typeof BroadcastChannel !== 'undefined') {
              try {
                new BroadcastChannel('cmt-summary-settings').postMessage({ updated: true });
              } catch (_) {}
            }
          }
          if (mergedDraft.defaultNameFormat && typeof setGsNameDisplayMode === 'function') {
            localStorage.setItem('cmt-gs-name-display', mergedDraft.defaultNameFormat);
            const nameSel = document.getElementById('gs-name-display-select');
            if (nameSel) nameSel.value = mergedDraft.defaultNameFormat;
          }
        }
      }

      // Broadcast changes across windows
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          new BroadcastChannel('cmt-scales').postMessage({ filename: activeScaleFn });
          new BroadcastChannel('cmt-chips').postMessage({ filename: activeChipFn });
        } catch (_) {}
      }

      applySummaryDisplaySettingsToDOM();
      refreshCriteriaPresetDropdown();
      populateScaleBankDropdowns();
      populateChipBankDropdowns();
      renderTestSheet();
      renderSummary();
      document.getElementById("reference-data-popup-overlay").classList.add("hidden");
      _referenceDataEditorDraft = null;
      _summarySettingsDraft = null;
      await showAlert(t('gsAlertRefSaved'));
    }

    let _summarySettingsDraft = null;
    let _summarySettingsScope = 'global';

    function initSummarySettingsDraft() {
      const activeClass = typeof getActiveClass === 'function' ? getActiveClass() : null;
      if (activeClass && activeClass.summarySettings && activeClass.summarySettings.custom) {
        _summarySettingsScope = 'class';
        _summarySettingsDraft = JSON.parse(JSON.stringify(activeClass.summarySettings));
      } else {
        _summarySettingsScope = 'global';
        _summarySettingsDraft = JSON.parse(JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS || DEFAULT_SUMMARY_DISPLAY_SETTINGS));
      }
      if (!_summarySettingsDraft.gradeColors) {
        _summarySettingsDraft.gradeColors = { ...DEFAULT_GRADE_COLORS };
      }
      if (!Array.isArray(_summarySettingsDraft.anchors)) {
        _summarySettingsDraft.anchors = ["6", "4", "1"];
      }
    }

    function renderSummarySettingsTab() {
      if (!_summarySettingsDraft) {
        initSummarySettingsDraft();
      }
      const activeClass = typeof getActiveClass === 'function' ? getActiveClass() : null;
      const scopeClassLabel = document.getElementById("gs-scope-class-label");
      const scopeClassText = document.getElementById("gs-scope-class-text");
      const scopeBadge = document.getElementById("gs-summary-scope-badge");
      const rGlobal = document.getElementById("gs-scope-global");
      const rClass = document.getElementById("gs-scope-class");

      if (activeClass) {
        if (scopeClassLabel) scopeClassLabel.style.display = "inline-flex";
        if (scopeClassText) scopeClassText.textContent = `${t('gsSummaryScopeClass')} (${activeClass.name})`;
        if (_summarySettingsScope === 'class') {
          if (rClass) rClass.checked = true;
          if (scopeBadge) {
            scopeBadge.textContent = `${activeClass.name}`;
            scopeBadge.style.background = "#dbeafe";
            scopeBadge.style.color = "#1e40af";
          }
        } else {
          if (rGlobal) rGlobal.checked = true;
          if (scopeBadge) {
            scopeBadge.textContent = "Global";
            scopeBadge.style.background = "#e2e8f0";
            scopeBadge.style.color = "#1e293b";
          }
        }
      } else {
        if (scopeClassLabel) scopeClassLabel.style.display = "none";
        _summarySettingsScope = 'global';
        if (rGlobal) rGlobal.checked = true;
        if (scopeBadge) {
          scopeBadge.textContent = "Global";
          scopeBadge.style.background = "#e2e8f0";
          scopeBadge.style.color = "#1e293b";
        }
      }

      // Scope radio change handlers
      if (rGlobal) {
        rGlobal.onchange = () => {
          if (rGlobal.checked) {
            _summarySettingsScope = 'global';
            _summarySettingsDraft = JSON.parse(JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS || DEFAULT_SUMMARY_DISPLAY_SETTINGS));
            renderSummarySettingsTab();
          }
        };
      }
      if (rClass && activeClass) {
        rClass.onchange = () => {
          if (rClass.checked) {
            _summarySettingsScope = 'class';
            if (activeClass.summarySettings && activeClass.summarySettings.custom) {
              _summarySettingsDraft = JSON.parse(JSON.stringify(activeClass.summarySettings));
            } else {
              _summarySettingsDraft = JSON.parse(JSON.stringify(window.SUMMARY_DISPLAY_SETTINGS || DEFAULT_SUMMARY_DISPLAY_SETTINGS));
              _summarySettingsDraft.custom = true;
            }
            renderSummarySettingsTab();
          }
        };
      }

      // Visual options
      const chkCompact = document.getElementById("gs-set-compact");
      if (chkCompact) {
        chkCompact.checked = !!_summarySettingsDraft.compactMode;
        chkCompact.onchange = () => {
          _summarySettingsDraft.compactMode = chkCompact.checked;
          renderSummaryPreview();
        };
      }

      const chkZebra = document.getElementById("gs-set-zebra");
      if (chkZebra) {
        chkZebra.checked = !!_summarySettingsDraft.zebraStriping;
        chkZebra.onchange = () => {
          _summarySettingsDraft.zebraStriping = chkZebra.checked;
          renderSummaryPreview();
        };
      }

      const selCellStyle = document.getElementById("gs-set-cell-style");
      if (selCellStyle) {
        selCellStyle.value = _summarySettingsDraft.cellStyleMode || 'cell';
        selCellStyle.onchange = () => {
          _summarySettingsDraft.cellStyleMode = selCellStyle.value;
          renderSummaryPreview();
        };
      }

      // Presets
      document.querySelectorAll(".gs-preset-btn").forEach(btn => {
        btn.onclick = () => {
          const preset = btn.getAttribute("data-preset");
          applySummaryPreset(preset);
        };
      });

      populateCopyFromScaleDropdown();

      // Interpolate Gradient button
      const btnInterpolate = document.getElementById("btn-interpolate-gradient");
      if (btnInterpolate) {
        btnInterpolate.onclick = () => {
          interpolateGradeGradients();
        };
      }

      // Grid of grades
      const activeSteps = (Array.isArray(_summarySettingsDraft.gradeSteps) && _summarySettingsDraft.gradeSteps.length >= 2)
        ? _summarySettingsDraft.gradeSteps
        : SUMMARY_GRADE_STEPS;
      const grid = document.getElementById("gs-grade-colors-grid");
      if (grid) {
        grid.innerHTML = "";
        activeSteps.forEach(step => {
          const color = _summarySettingsDraft.gradeColors[step] || DEFAULT_GRADE_COLORS[step] || "#d97706";
          const isAnchor = (_summarySettingsDraft.anchors || []).includes(step);

          const card = document.createElement("div");
          card.className = `gs-grade-color-item ${isAnchor ? 'is-anchor' : ''}`;
          card.id = `gs-grade-item-${step.replace('.', '_')}`;

          // Anchor checkbox
          const chkAnchor = document.createElement("input");
          chkAnchor.type = "checkbox";
          chkAnchor.className = "gs-anchor-chk";
          chkAnchor.checked = isAnchor;
          chkAnchor.title = t("gsGradeAnchorCheckbox");
          chkAnchor.addEventListener("click", (e) => e.stopPropagation());
          chkAnchor.addEventListener("change", () => {
            const curAnchors = new Set(_summarySettingsDraft.anchors || []);
            if (chkAnchor.checked) curAnchors.add(step);
            else curAnchors.delete(step);
            _summarySettingsDraft.anchors = Array.from(curAnchors);
            card.classList.toggle("is-anchor", chkAnchor.checked);
          });

          // Label
          const lbl = document.createElement("span");
          lbl.className = "grade-label";
          lbl.textContent = fmtN(step);

          // Swatch button opening rich color popover
          const swatchBtn = document.createElement("button");
          swatchBtn.type = "button";
          swatchBtn.className = "ref-color-btn gs-grade-swatch-btn";
          swatchBtn.style.backgroundColor = color;
          swatchBtn.title = t("gsPickColor") || "Pick color";

          // Hex input
          const hexInput = document.createElement("input");
          hexInput.type = "text";
          hexInput.className = "gs-grade-hex-input";
          hexInput.value = color;
          hexInput.maxLength = 7;
          hexInput.addEventListener("click", (e) => e.stopPropagation());

          const updateGradeColor = (newVal) => {
            swatchBtn.style.backgroundColor = newVal;
            hexInput.value = newVal;
            _summarySettingsDraft.gradeColors[step] = newVal;
            renderSummaryPreview();
          };

          swatchBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openRefColorPicker(swatchBtn, _summarySettingsDraft.gradeColors[step] || color, updateGradeColor);
          });

          card.addEventListener("click", () => {
            openRefColorPicker(swatchBtn, _summarySettingsDraft.gradeColors[step] || color, updateGradeColor);
          });

          hexInput.addEventListener("input", () => {
            let val = hexInput.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              swatchBtn.style.backgroundColor = val;
              _summarySettingsDraft.gradeColors[step] = val;
              renderSummaryPreview();
            }
          });

          card.appendChild(chkAnchor);
          card.appendChild(lbl);
          card.appendChild(swatchBtn);
          card.appendChild(hexInput);
          grid.appendChild(card);
        });
      }

      if (typeof window.renderExtendedGradeSheetSettings === "function") {
        window.renderExtendedGradeSheetSettings(_summarySettingsDraft);
      }
      renderSummaryPreview();
    }

    function renderSummaryPreview() {
      const prevBox = document.getElementById("gs-summary-colors-preview");
      if (!prevBox || !_summarySettingsDraft) return;
      prevBox.innerHTML = "";
      const isBadge = _summarySettingsDraft.cellStyleMode === "badge";
      const activeSteps = (Array.isArray(_summarySettingsDraft.gradeSteps) && _summarySettingsDraft.gradeSteps.length >= 2)
        ? _summarySettingsDraft.gradeSteps
        : SUMMARY_GRADE_STEPS;
      activeSteps.forEach(step => {
        const color = _summarySettingsDraft.gradeColors[step] || DEFAULT_GRADE_COLORS[step] || "#d97706";
        const contrast = getNotchContrastTextColor(color);
        const item = document.createElement("div");
        if (isBadge) {
          item.innerHTML = `<span class="gs-grade-badge" style="background:${color};color:${contrast};">${fmtN(step)}</span>`;
        } else {
          item.style.cssText = `padding: 4px 8px; background: ${color}; color: ${contrast}; font-weight: 700; border: 1.5px solid #333; border-radius: 4px; box-shadow: 2px 2px 0 #555; font-size: 0.85rem;`;
          item.textContent = fmtN(step);
        }
        prevBox.appendChild(item);
      });
    }

    function interpolateGradeGradients() {
      if (!_summarySettingsDraft) return;
      const anchors = (_summarySettingsDraft.anchors || [])
        .map(s => ({ step: s, val: Number(s) }))
        .filter(a => !isNaN(a.val))
        .sort((a, b) => b.val - a.val);

      if (anchors.length < 2) {
        showAlert("Please select at least 2 anchor grades (e.g., 6.0, 4.0, 1.0) to interpolate a gradient.");
        return;
      }

      for (let i = 0; i < anchors.length - 1; i++) {
        const top = anchors[i];
        const bot = anchors[i + 1];
        const topColor = _summarySettingsDraft.gradeColors[top.step] || DEFAULT_GRADE_COLORS[top.step] || "#16a34a";
        const botColor = _summarySettingsDraft.gradeColors[bot.step] || DEFAULT_GRADE_COLORS[bot.step] || "#7f1d1d";
        const span = top.val - bot.val;

        const activeSteps = (Array.isArray(_summarySettingsDraft.gradeSteps) && _summarySettingsDraft.gradeSteps.length >= 2)
          ? _summarySettingsDraft.gradeSteps
          : SUMMARY_GRADE_STEPS;
        activeSteps.forEach(stepStr => {
          const stepVal = Number(stepStr);
          if (stepVal < top.val && stepVal > bot.val && span > 0) {
            const t = (top.val - stepVal) / span;
            const interp = interpolateHexColor(topColor, botColor, t);
            _summarySettingsDraft.gradeColors[stepStr] = interp;
          }
        });
      }

      renderSummarySettingsTab();
    }

    function applySummaryPreset(presetKey) {
      if (!_summarySettingsDraft) return;
      if (presetKey === "traffic") {
        _summarySettingsDraft.anchors = ["6", "4", "1"];
        _summarySettingsDraft.gradeColors = { ...DEFAULT_GRADE_COLORS };
      } else if (presetKey === "pastel") {
        _summarySettingsDraft.anchors = ["6", "4", "1"];
        _summarySettingsDraft.gradeColors["6"] = "#86efac";
        _summarySettingsDraft.gradeColors["4"] = "#fde047";
        _summarySettingsDraft.gradeColors["1"] = "#fca5a5";
        interpolateGradeGradients();
        return;
      } else if (presetKey === "blue-amber") {
        _summarySettingsDraft.anchors = ["6", "4", "1"];
        _summarySettingsDraft.gradeColors["6"] = "#2563eb";
        _summarySettingsDraft.gradeColors["4"] = "#f59e0b";
        _summarySettingsDraft.gradeColors["1"] = "#dc2626";
        interpolateGradeGradients();
        return;
      } else if (presetKey === "cool-emerald") {
        _summarySettingsDraft.anchors = ["6", "4", "1"];
        _summarySettingsDraft.gradeColors["6"] = "#059669";
        _summarySettingsDraft.gradeColors["4"] = "#0284c7";
        _summarySettingsDraft.gradeColors["1"] = "#475569";
        interpolateGradeGradients();
        return;
      } else if (presetKey === "reset") {
        _summarySettingsDraft.compactMode = false;
        _summarySettingsDraft.zebraStriping = false;
        _summarySettingsDraft.cellStyleMode = "cell";
        _summarySettingsDraft.anchors = ["6", "4", "1"];
        _summarySettingsDraft.gradeColors = { ...DEFAULT_GRADE_COLORS };
      }
      renderSummarySettingsTab();
    }

    function populateCopyFromScaleDropdown() {
      const sel = document.getElementById("gs-select-copy-scale");
      if (!sel) return;

      const promptText = (typeof i18n !== 'undefined' ? i18n.t('gsSelectScalePrompt') : null) || 'Select scale…';
      sel.innerHTML = `<option value="" disabled selected>${promptText}</option>`;

      const scales = (_referenceDataEditorDraft && Array.isArray(_referenceDataEditorDraft.scaleModels) && _referenceDataEditorDraft.scaleModels.length > 0)
        ? _referenceDataEditorDraft.scaleModels
        : (typeof getScaleModelsList === 'function' ? getScaleModelsList() : []);

      scales.forEach((scale, idx) => {
        const opt = document.createElement("option");
        opt.value = scale.key || `scale-${idx}`;
        opt.textContent = scale.label || scale.key || `Scale ${idx + 1}`;
        sel.appendChild(opt);
      });

      sel.onchange = () => {
        const chosenKey = sel.value;
        if (!chosenKey) return;
        const foundScale = scales.find((s, idx) => (s.key || `scale-${idx}`) === chosenKey);
        if (foundScale) {
          applyColorsFromScale(foundScale);
          if (typeof showToast === 'function') {
            const toastMsg = (typeof i18n !== 'undefined' ? i18n.t('gsCopiedFromScaleToast') : null) || 'Copied grade colors from {name}';
            showToast(toastMsg.replace('{name}', foundScale.label || foundScale.key));
          }
        }
        sel.value = "";
      };
    }

    function applyColorsFromScale(scale) {
      if (!scale || !scale.colors || !_summarySettingsDraft) return;
      if (!_summarySettingsDraft.gradeColors) _summarySettingsDraft.gradeColors = {};

      const scaleColors = scale.colors;

      function getScaleColor(step) {
        const sStr = String(step);
        if (scaleColors[sStr]) return scaleColors[sStr];
        const sNum = Number(step);
        if (scaleColors[sNum]) return scaleColors[sNum];
        if (sNum === Math.round(sNum)) {
          const sInt = String(Math.round(sNum));
          if (scaleColors[sInt]) return scaleColors[sInt];
        }
        const sFixed = sNum.toFixed(1);
        if (scaleColors[sFixed]) return scaleColors[sFixed];
        return null;
      }

      // Check direct matches
      const directMatches = {};
      SUMMARY_GRADE_STEPS.forEach(step => {
        const c = getScaleColor(step);
        if (c) directMatches[step] = c;
      });

      const matchCount = Object.keys(directMatches).length;

      if (matchCount >= 2) {
        SUMMARY_GRADE_STEPS.forEach(step => {
          if (directMatches[step]) {
            _summarySettingsDraft.gradeColors[step] = directMatches[step];
          } else {
            const num = Number(step);
            let higherStep = null, lowerStep = null;
            SUMMARY_GRADE_STEPS.forEach(s => {
              const sN = Number(s);
              if (directMatches[s]) {
                if (sN > num && (higherStep === null || sN < Number(higherStep))) higherStep = s;
                if (sN < num && (lowerStep === null || sN > Number(lowerStep))) lowerStep = s;
              }
            });
            if (higherStep && lowerStep) {
              const highVal = Number(higherStep);
              const lowVal = Number(lowerStep);
              const t = (highVal - num) / (highVal - lowVal);
              _summarySettingsDraft.gradeColors[step] = interpolateHexColor(directMatches[higherStep], directMatches[lowerStep], t);
            } else if (higherStep) {
              _summarySettingsDraft.gradeColors[step] = directMatches[higherStep];
            } else if (lowerStep) {
              _summarySettingsDraft.gradeColors[step] = directMatches[lowerStep];
            }
          }
        });
      } else {
        const scaleKeys = Object.keys(scaleColors)
          .map(k => ({ key: k, val: Number(k), color: scaleColors[k] }))
          .filter(item => !isNaN(item.val))
          .sort((a, b) => b.val - a.val);

        if (scaleKeys.length >= 2) {
          const topColor = scaleKeys[0].color;
          const botColor = scaleKeys[scaleKeys.length - 1].color;
          SUMMARY_GRADE_STEPS.forEach((step, idx) => {
            const t = idx / (SUMMARY_GRADE_STEPS.length - 1);
            _summarySettingsDraft.gradeColors[step] = interpolateHexColor(topColor, botColor, t);
          });
        }
      }

      renderSummarySettingsTab();
    }

    async function openReferenceDataEditor(initialTab = null) {
      // Ensure all bank lists are loaded before building the draft
      await Promise.all([
        loadAvailableCriteriaBanks(),
        loadAvailableScaleBanks(),
        loadAvailableChipBanks()
      ]).catch(() => {});
      _referenceDataEditorDraft = cloneReferenceDrafts();
      initSummarySettingsDraft();
      document.getElementById("reference-data-popup-overlay").classList.remove("hidden");
      renderReferenceDataEditor({ initial: true });
      const targetTab = initialTab || (appState.activeScreen === 'summary' ? 'summary-settings' : ((typeof appState !== "undefined" && appState && appState.activeRefTab) || "summary-settings"));
      switchRefTab(targetTab);
    }

    async function initializeReferenceData() {
      await Promise.resolve(window.__gsUserBootstrapPromise).catch(function () {});
      loadReferenceDataOverrides();
      loadSummaryDisplaySettings();
      refreshCriteriaPresetDropdown();
      applySummaryDisplaySettingsToDOM();
    }

