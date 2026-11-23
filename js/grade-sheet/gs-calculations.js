    function makeCriterion(name = "Criterion", maxPoints = null, pointCoefficient = 1, isBonus = false, minPoints = null, interval = null, competenceIds = []) {
      const crit = {
        id: uid(),
        name,
        minPoints: minPoints != null && !isNaN(Number(minPoints)) ? Number(minPoints) : null,
        maxPoints: maxPoints != null && !isNaN(Number(maxPoints)) ? Number(maxPoints) : null,
        pointCoefficient: Number.isFinite(Number(pointCoefficient)) ? Number(pointCoefficient) : 1,
        showComment: true,
        isBonus: !!isBonus,
        competenceIds: Array.isArray(competenceIds) ? [...competenceIds] : []
      };
      if (interval != null && Number(interval) > 0) crit.interval = Number(interval);
      return crit;
    }

    function createDefaultTestConfig() {
      const { minGrade, maxGrade } = getCriteriaMinMaxGrades();
      const interval = 0.5;
      const manualThresholds = defaultManualThresholdPercentMap(minGrade, maxGrade, interval);
      const steps = computeScaleGradeSteps(maxGrade, minGrade, interval);
      const ext = (typeof getActiveSummaryDisplaySettings === "function") ? getActiveSummaryDisplaySettings() : null;
      const defWeight = (ext && Number.isFinite(Number(ext.defaultTestWeight))) ? Number(ext.defaultTestWeight) : 1;
      const defMode = (ext && ext.defaultGradingMode === "equation") ? "equation" : "manual";
      const defRound = (ext && ext.defaultPointsRounding) ? String(ext.defaultPointsRounding) : "0.5";
      const defCritBank = (ext && ext.defaultCriteriaBank) ? String(ext.defaultCriteriaBank) : "correction-criteria.js";
      const defScaleBank = (ext && ext.defaultScaleBank) ? String(ext.defaultScaleBank) : "grade-scale-models.js";
      const defModelKey = (ext && ext.defaultScaleModelKey) ? String(ext.defaultScaleModelKey) : "custom";
      const cfg = {
        coefficient: defWeight,
        fixedWeight: null,
        testName: "",
        testDate: "",
        scope: "",
        type: "",
        chipBank: defCritBank,
        nextGradeHighlightPoints: 0,
        criteria: [],
        observationSections: [],
        correctionDeadline: "",
        correctionDeadlineTime: "",
        correctionDeadlineDaysAfter: 13,
        correctionDeadlineAuto: true,
        deadlineReminders: {
          enabled: true,
          offsetsDays: [3, 1, 0]
        },
        correctionDeadlineDoneAt: null,
        excludedStudentIds: [],
        absentStudentIds: [],
        markingCompleted: false,
        grading: {
          mode: defMode,
          manualInputMode: "percent",
          passPercentGrade4: 66.67,
          minGrade,
          maxGrade,
          interval,
          modelKey: defModelKey || "custom",
          pendingModelKey: defModelKey || "custom",
          scaleBank: defScaleBank,
          manualThresholds,
          manualPoints: buildManualPointsFromPercents(manualThresholds, 0, steps),
          equationFormula: "minGrade + 2 * (passGrade - minGrade) * pts / totalPts",
          equationRounding: defRound,
          pointsRounding: defRound
        }
      };
      if (defModelKey && defModelKey !== "custom" && typeof applyScaleModelToConfig === "function") {
        try { applyScaleModelToConfig(cfg, defModelKey, defScaleBank); } catch (_) {}
      }
      return cfg;
    }

    function detectTestCount(classObj, sem) {
      const testArrays = (classObj.students || []).map(s => sem === "sem1" ? s.sem1Tests : s.sem2Tests);
      const configs = classObj.testConfigs && classObj.testConfigs[sem];
      let count = 0;
      for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
        const hasGrade = testArrays.some(t => Array.isArray(t) && t[i] != null);
        const cfg = configs && configs[i];
        const hasConfig = cfg && (cfg.testName || cfg.testDate || cfg.scope || cfg.type || (Array.isArray(cfg.criteria) && cfg.criteria.length > 0));
        if (hasGrade || hasConfig) count = i + 1;
      }
      return count;
    }

    function createDefaultTestConfigs() {
      return {
        sem1: Array.from({ length: TEST_COUNT_PER_SEM }, () => createDefaultTestConfig()),
        sem2: Array.from({ length: TEST_COUNT_PER_SEM }, () => createDefaultTestConfig())
      };
    }

    function isParticipationTestConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return false;
      return cfg.source === "participation-tracker" ||
        cfg.type === "participation" ||
        !!(cfg.participationLink && cfg.participationLink.enabled);
    }

    function syncParticipationGradingScale(cfg, maxGradeHint = null) {
      if (!cfg || typeof cfg !== "object") return;
      if (!cfg.grading || typeof cfg.grading !== "object") {
        cfg.grading = {};
      }
      const minGrade = cfg.grading.minGrade != null && !isNaN(Number(cfg.grading.minGrade))
        ? Number(cfg.grading.minGrade)
        : 0;
      const maxGrade = maxGradeHint != null && !isNaN(Number(maxGradeHint)) && Number(maxGradeHint) > 0
        ? Number(maxGradeHint)
        : (cfg.grading.maxGrade != null && !isNaN(Number(cfg.grading.maxGrade)) && Number(cfg.grading.maxGrade) > 0
          ? Number(cfg.grading.maxGrade)
          : 6);
      const interval = cfg.grading.interval != null && !isNaN(Number(cfg.grading.interval)) && Number(cfg.grading.interval) > 0
        ? Number(cfg.grading.interval)
        : 0.5;
      const steps = computeScaleGradeSteps(maxGrade, minGrade, interval);
      const totals = Array.isArray(cfg.criteria) ? calcCriteriaTotals(cfg, {}) : { totalPossible: 0 };
      const effTotal = totals.totalPossible > 0 ? totals.totalPossible : maxGrade;

      const manualThresholds = {};
      const manualPoints = {};
      steps.forEach(g => {
        const k = String(g);
        const exactRatio = maxGrade > minGrade ? (g - minGrade) / (maxGrade - minGrade) : 0;
        manualThresholds[k] = Math.round(exactRatio * 10000) / 100;
        manualPoints[k] = Math.round(exactRatio * effTotal * 100) / 100;
      });

      cfg.grading.mode = cfg.grading.mode || "manual";
      cfg.grading.manualInputMode = cfg.grading.manualInputMode || "points";
      cfg.grading.minGrade = minGrade;
      cfg.grading.maxGrade = maxGrade;
      cfg.grading.interval = interval;
      cfg.grading.manualThresholds = manualThresholds;
      cfg.grading.manualPoints = manualPoints;
    }

    function syncGradingPointsForCriteriaChange(config) {
      if (!config || !config.grading || typeof config.grading !== "object") return;
      if (isParticipationTestConfig(config) && !config.grading.customManualScale) {
        syncParticipationGradingScale(config);
        return;
      }
      const totals = Array.isArray(config.criteria) ? calcCriteriaTotals(config, {}) : { totalPossible: 0 };
      const steps = getTestGradeSteps(config);
      if (config.grading.manualThresholds && typeof config.grading.manualThresholds === "object") {
        config.grading.manualPoints = buildManualPointsFromPercents(
          config.grading.manualThresholds,
          totals.totalPossible,
          steps
        );
      }
    }

    function ensureClassStructures(classObj) {
      if (!classObj.testConfigs) {
        classObj.testConfigs = createDefaultTestConfigs();
      }

      if (!Array.isArray(classObj.criteriaBanks) || !classObj.criteriaBanks.length) {
        classObj.criteriaBanks = classObj.criteriaBank ? [classObj.criteriaBank] : ['correction-criteria.js'];
      }
      if (!classObj.criteriaBank || !classObj.criteriaBanks.includes(classObj.criteriaBank)) {
        classObj.criteriaBank = classObj.criteriaBanks[0] || 'correction-criteria.js';
      }

      if (!Array.isArray(classObj.chipBanks) || !classObj.chipBanks.length) {
        classObj.chipBanks = classObj.chipBank ? [classObj.chipBank] : ['correction-criteria.js'];
      }
      if (!classObj.chipBank || !classObj.chipBanks.includes(classObj.chipBank)) {
        classObj.chipBank = classObj.chipBanks[0] || 'correction-criteria.js';
      }

      const repairedPtSlots = [];

      ["sem1", "sem2"].forEach(sem => {
        if (!Array.isArray(classObj.testConfigs[sem])) classObj.testConfigs[sem] = [];
        if (classObj.testConfigs[sem].length > TEST_COUNT_PER_SEM) {
          classObj.testConfigs[sem].length = TEST_COUNT_PER_SEM;
        }

        for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
          const cfg = classObj.testConfigs[sem][i];
          if (cfg && typeof cfg === "object") {
            if (typeof cfg.testName !== "string") cfg.testName = "";
            if (typeof cfg.testDate !== "string") cfg.testDate = "";
            if (typeof cfg.scope !== "string") cfg.scope = "";
            if (typeof cfg.type !== "string") cfg.type = "";
            if (typeof cfg.correctionDeadline !== "string") cfg.correctionDeadline = "";
            if (typeof cfg.correctionDeadlineTime !== "string") cfg.correctionDeadlineTime = "";
            if (typeof cfg.correctionDeadlineDaysAfter !== "number" || isNaN(cfg.correctionDeadlineDaysAfter)) {
              cfg.correctionDeadlineDaysAfter = 13;
            }
            if (typeof cfg.correctionDeadlineAuto !== "boolean") {
              cfg.correctionDeadlineAuto = true;
            }
            if (!cfg.deadlineReminders || typeof cfg.deadlineReminders !== "object") {
              cfg.deadlineReminders = { enabled: true, offsetsDays: [3, 1, 0] };
            }
            if (cfg.correctionDeadlineDoneAt !== undefined && typeof cfg.correctionDeadlineDoneAt !== "string" && cfg.correctionDeadlineDoneAt !== null) {
              cfg.correctionDeadlineDoneAt = null;
            }
            if (!Array.isArray(cfg.excludedStudentIds)) {
              cfg.excludedStudentIds = [];
            }
            if (!Array.isArray(cfg.absentStudentIds)) {
              cfg.absentStudentIds = [];
            }
            if (typeof cfg.markingCompleted !== "boolean") {
              cfg.markingCompleted = false;
            }
            if (!cfg.criteriaBank) {
              cfg.criteriaBank = classObj.criteriaBank || (classObj.criteriaBanks && classObj.criteriaBanks[0]) || 'correction-criteria.js';
            }
            if (!cfg.chipBank) {
              cfg.chipBank = classObj.chipBank || (classObj.chipBanks && classObj.chipBanks[0]) || 'correction-criteria.js';
            }
            if (toNumber(cfg.nextGradeHighlightPoints) == null) cfg.nextGradeHighlightPoints = 0;

            if (Array.isArray(cfg.criteria)) {
              cfg.criteria.forEach(crit => {
                if (crit && typeof crit === "object") {
                  crit.minPoints = (crit.minPoints != null && !isNaN(Number(crit.minPoints))) ? Number(crit.minPoints) : null;
                  crit.maxPoints = (crit.maxPoints != null && !isNaN(Number(crit.maxPoints))) ? Number(crit.maxPoints) : null;
                  crit.pointCoefficient = (crit.pointCoefficient != null && !isNaN(Number(crit.pointCoefficient))) ? Math.max(0, Number(crit.pointCoefficient)) : 1;
                  crit.interval = (crit.interval != null && !isNaN(Number(crit.interval)) && Number(crit.interval) > 0) ? Number(crit.interval) : null;
                  crit.isBonus = !!crit.isBonus;
                  if (!Array.isArray(crit.competenceIds)) crit.competenceIds = [];
                }
              });
            }

            if (cfg.grading && typeof cfg.grading === "object") {
              if (cfg.grading.minGrade == null) cfg.grading.minGrade = isParticipationTestConfig(cfg) ? 0 : 1.5;
              if (cfg.grading.maxGrade == null) cfg.grading.maxGrade = 6;
              if (cfg.grading.interval == null) cfg.grading.interval = 0.5;
              if (typeof cfg.grading.equationFormula !== "string" || !cfg.grading.equationFormula) {
                cfg.grading.equationFormula = "minGrade + 2 * (passGrade - minGrade) * (pts - minPts) / (totalPts - minPts)";
              }
              if (!cfg.grading.equationRounding) {
                cfg.grading.equationRounding = "0.5";
              }
              if (cfg.grading.pointsRounding == null || cfg.grading.pointsRounding === "") {
                const isSlotUsed = !!(cfg.testName || cfg.testDate || cfg.scope || cfg.type || (Array.isArray(cfg.criteria) && cfg.criteria.length > 0) ||
                  (Array.isArray(classObj.students) && classObj.students.some(s => {
                    const arr = sem === "sem1" ? s.sem1Tests : s.sem2Tests;
                    return Array.isArray(arr) && arr[i] != null;
                  })));
                cfg.grading.pointsRounding = isSlotUsed ? "none" : "0.5";
              }
              if (isParticipationTestConfig(cfg)) {
                const maxGKey = String(cfg.grading.maxGrade != null ? cfg.grading.maxGrade : 6);
                const hasValidPtThresholds =
                  cfg.grading.manualThresholds &&
                  typeof cfg.grading.manualThresholds === "object" &&
                  Number(cfg.grading.manualThresholds[maxGKey]) > 0 &&
                  cfg.grading.manualPoints &&
                  typeof cfg.grading.manualPoints === "object" &&
                  Number(cfg.grading.manualPoints[maxGKey]) > 0;
                if (!hasValidPtThresholds) {
                  syncParticipationGradingScale(cfg);
                  if (cfg.participationLink && cfg.participationLink.enabled) {
                    cfg.participationLink.lastDigest = "";
                  }
                  repairedPtSlots.push({ sem, testIndex: i, cfg });
                }
              } else {
                if (!cfg.grading.manualThresholds || typeof cfg.grading.manualThresholds !== "object") {
                  cfg.grading.manualThresholds = defaultManualThresholdPercentMap();
                }
                const totals = calcCriteriaTotals(cfg, {});
                const steps = getTestGradeSteps(cfg);
                const hasAnyPoints = cfg.grading.manualPoints && typeof cfg.grading.manualPoints === "object" &&
                  Object.values(cfg.grading.manualPoints).some(v => Number(v) > 0);
                const hasAnyThresholds = Object.values(cfg.grading.manualThresholds).some(v => Number(v) > 0);
                if (!cfg.grading.manualPoints || typeof cfg.grading.manualPoints !== "object" || (!hasAnyPoints && hasAnyThresholds && totals.totalPossible > 0)) {
                  cfg.grading.manualPoints = buildManualPointsFromPercents(
                    cfg.grading.manualThresholds,
                    totals.totalPossible,
                    steps
                  );
                }
              }
            }
          }
        }
      });

      if (!classObj.testCounts || typeof classObj.testCounts !== "object") {
        classObj.testCounts = { sem1: 0, sem2: 0 };
      }
      classObj.testCounts.sem1 = Math.max(classObj.testCounts.sem1 || 0, detectTestCount(classObj, "sem1"));
      classObj.testCounts.sem2 = Math.max(classObj.testCounts.sem2 || 0, detectTestCount(classObj, "sem2"));
      classObj.testCounts.sem1 = Math.max(0, Math.min(TEST_COUNT_PER_SEM, classObj.testCounts.sem1));
      classObj.testCounts.sem2 = Math.max(0, Math.min(TEST_COUNT_PER_SEM, classObj.testCounts.sem2));

      classObj.students.forEach(student => {
        if (!student.correctionTime) {
          student.correctionTime = {
            sem1: Array(TEST_COUNT_PER_SEM).fill(null),
            sem2: Array(TEST_COUNT_PER_SEM).fill(null)
          };
        }
        if (!student.correctedAt) {
          student.correctedAt = {
            sem1: Array(TEST_COUNT_PER_SEM).fill(null),
            sem2: Array(TEST_COUNT_PER_SEM).fill(null)
          };
        }
        if (!student.gradeOverrides) {
          student.gradeOverrides = {
            sem1: Array(TEST_COUNT_PER_SEM).fill(false),
            sem2: Array(TEST_COUNT_PER_SEM).fill(false)
          };
        }
        ["sem1", "sem2"].forEach(sem => {
          if (!Array.isArray(student.correctionTime[sem])) student.correctionTime[sem] = [];
          while (student.correctionTime[sem].length < TEST_COUNT_PER_SEM) student.correctionTime[sem].push(null);

          if (!Array.isArray(student.correctedAt[sem])) student.correctedAt[sem] = [];
          if (student.correctedAt[sem].length > TEST_COUNT_PER_SEM) {
            student.correctedAt[sem].length = TEST_COUNT_PER_SEM;
          }
          while (student.correctedAt[sem].length < TEST_COUNT_PER_SEM) student.correctedAt[sem].push(null);

          if (!Array.isArray(student.gradeOverrides[sem])) student.gradeOverrides[sem] = [];
          if (student.gradeOverrides[sem].length > TEST_COUNT_PER_SEM) {
            student.gradeOverrides[sem].length = TEST_COUNT_PER_SEM;
          }
          while (student.gradeOverrides[sem].length < TEST_COUNT_PER_SEM) student.gradeOverrides[sem].push(false);
          for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
            student.gradeOverrides[sem][i] = !!student.gradeOverrides[sem][i];
          }
        });
        if (!student.criteriaResults) {
          student.criteriaResults = {
            sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({})),
            sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}))
          };
        }
        ["sem1", "sem2"].forEach(sem => {
          if (!Array.isArray(student.criteriaResults[sem])) student.criteriaResults[sem] = [];
          if (student.criteriaResults[sem].length > TEST_COUNT_PER_SEM) {
            student.criteriaResults[sem].length = TEST_COUNT_PER_SEM;
          }
          while (student.criteriaResults[sem].length < TEST_COUNT_PER_SEM) {
            student.criteriaResults[sem].push({});
          }
          for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
            if (!(student.criteriaResults[sem][i] && typeof student.criteriaResults[sem][i] === "object")) {
              student.criteriaResults[sem][i] = {};
            }
          }

          // Clean up phantom grades on ungraded tests with criteria
          const arr = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
          if (Array.isArray(arr)) {
            const count = (classObj.testCounts && typeof classObj.testCounts[sem] === "number") ? classObj.testCounts[sem] : TEST_COUNT_PER_SEM;
            for (let i = 0; i < count; i++) {
              if (student.gradeOverrides && student.gradeOverrides[sem] && student.gradeOverrides[sem][i]) continue;
              const cfg = classObj.testConfigs && classObj.testConfigs[sem] && classObj.testConfigs[sem][i];
              if (cfg && Array.isArray(cfg.criteria) && cfg.criteria.length > 0) {
                const cMap = student.criteriaResults[sem][i] || {};
                const allFilled = cfg.criteria.every(cr => cMap[cr.id] && cMap[cr.id].points != null);
                if (!allFilled && arr[i] != null) {
                  arr[i] = null;
                }
              }
            }
          }
        });
      });

      if (repairedPtSlots.length > 0) {
        repairedPtSlots.forEach(({ sem, testIndex, cfg }) => {
          classObj.students.forEach(student => {
            recalcStudentGradeFromCriteria(student, sem, testIndex, cfg);
          });
        });
      }
    }

    function getTestConfig(classObj, semester, testIndex) {
      ensureClassStructures(classObj);
      return classObj.testConfigs[semester][testIndex];
    }

    function calcCriteriaTotals(config, criteriaResultMap) {
      let totalPossible = 0;
      let totalScored = 0;
      let totalMin = 0;
      let totalBonusPossible = 0;
      let totalBonusScored = 0;
      let totalBonusMin = 0;

      config.criteria.forEach(criterion => {
        const resolved = resolveCriterionProps(criterion);
        const minPts = resolved.minPoints;
        const maxPts = resolved.maxPoints;
        const pointCoeff = resolved.pointCoefficient;
        const weightedMax = maxPts * pointCoeff;
        const weightedMin = minPts * pointCoeff;

        const result = criteriaResultMap[criterion.id] || {};
        const points = toNumber(result.points);

        if (resolved.isBonus) {
          totalBonusPossible += weightedMax;
          totalBonusMin += weightedMin;
          if (points != null) {
            const bounded = Math.max(minPts, Math.min(maxPts, points));
            totalBonusScored += bounded * pointCoeff;
          }
        } else {
          totalPossible += weightedMax;
          totalMin += weightedMin;
          if (points != null) {
            const bounded = Math.max(minPts, Math.min(maxPts, points));
            totalScored += bounded * pointCoeff;
          }
        }
      });

      return { totalPossible, totalScored, totalMin, totalBonusPossible, totalBonusScored, totalBonusMin };
    }

    function evaluateGradingEquation(formulaStr, vars = {}) {
      if (!formulaStr || typeof formulaStr !== "string" || !formulaStr.trim()) {
        return { ok: false, error: "Empty formula", grade: null };
      }
      const clean = formulaStr.trim();
      const forbidden = /\b(window|document|eval|Function|constructor|localStorage|sessionStorage|import|require|fetch|XMLHttpRequest|process|global|globalThis|setTimeout|setInterval|alert|prompt|confirm|console)\b/i;
      if (forbidden.test(clean)) {
        return { ok: false, error: "Disallowed token in formula", grade: null };
      }

      const minG = Number(vars.minGrade != null ? vars.minGrade : 1);
      const maxG = Number(vars.maxGrade != null ? vars.maxGrade : 6);
      const passG = Number(vars.passGrade != null ? vars.passGrade : 4);
      const totalP = Number(vars.totalPts != null ? vars.totalPts : 100);
      const minP = Number(vars.minPts != null ? vars.minPts : 0);
      const passP = Number(vars.passPts != null ? vars.passPts : (minP + (totalP - minP) * 0.6667));
      const pts = Number(vars.pts != null ? vars.pts : 0);

      const expr = clean.replace(/\^/g, "**");

      const mathScope = {
        min: Math.min,
        max: Math.max,
        round: (x, step) => {
          const s = Number(step);
          if (s > 0) return Math.round(x / s) * s;
          return Math.round(x);
        },
        floor: Math.floor,
        ceil: Math.ceil,
        abs: Math.abs,
        sqrt: Math.sqrt,
        pow: Math.pow,
        log: Math.log,
        pts, points: pts, point: pts, p: pts, score: pts, scored: pts,
        totalPts: totalP, maxPts: totalP, totalPoints: totalP, total: totalP,
        minPts: minP, minPoints: minP,
        passPts: passP, passPoints: passP,
        maxGrade: maxG,
        minGrade: minG,
        passGrade: passG
      };

      try {
        const keys = Object.keys(mathScope);
        const values = Object.values(mathScope);
        const fn = new Function(...keys, `"use strict"; return (${expr});`);
        const raw = fn(...values);
        if (typeof raw !== "number" || isNaN(raw) || !isFinite(raw)) {
          return { ok: false, error: "Result is not a finite number", grade: null };
        }
        let grade = Math.max(minG, Math.min(maxG, raw));
        const rMode = String(vars.rounding || "0.5");
        if (rMode === "0.5") {
          grade = Math.round(grade * 2) / 2;
        } else if (rMode === "0.25") {
          grade = Math.round(grade * 4) / 4;
        } else if (rMode === "0.1") {
          grade = Math.round(grade * 10) / 10;
        } else if (rMode === "0.01") {
          grade = Math.round(grade * 100) / 100;
        } else if (rMode !== "none" && !isNaN(Number(rMode)) && Number(rMode) > 0) {
          const step = Number(rMode);
          grade = Math.round(grade / step) * step;
        }
        return { ok: true, grade, raw };
      } catch (err) {
        return { ok: false, error: err.message || "Syntax error", grade: null };
      }
    }

    function evaluatePass4Formula(inputStr, defaultVal = 66.67) {
      if (inputStr == null) return defaultVal;
      const str = String(inputStr).trim().replace(/%/g, "");
      if (!str) return defaultVal;
      const num = Number(str);
      if (!isNaN(num)) {
        if (num > 0 && num <= 1) return Math.max(0, Math.min(100, Math.round(num * 10000) / 100));
        return Math.max(0, Math.min(100, num));
      }
      try {
        if (!/^[0-9\.\s\+\-\*\/\(\)]+$/.test(str)) return defaultVal;
        const res = new Function(`return (${str});`)();
        if (typeof res === "number" && isFinite(res)) {
          if (res > 0 && res <= 1) return Math.max(0, Math.min(100, Math.round(res * 10000) / 100));
          return Math.max(0, Math.min(100, Math.round(res * 100) / 100));
        }
      } catch (e) {}
      return defaultVal;
    }



    function applyPointsRoundingToThresholds(thresholds, config) {
      const grading = config && config.grading;
      const pr = grading && grading.pointsRounding;
      if (!pr || pr === "none") return thresholds;
      const step = Number(pr);
      if (!Number.isFinite(step) || step <= 0) return thresholds;
      const totals = Array.isArray(config && config.criteria) ? calcCriteriaTotals(config, {}) : { totalPossible: 0 };
      const totalPossible = Math.max(0, totals.totalPossible);
      if (totalPossible <= 0) return thresholds;
      return thresholds.map(item => {
        const rawPts = Math.max(0, Math.min(1, item.ratio || 0)) * totalPossible;
        const roundedPts = Math.max(0, Math.min(totalPossible, Math.round(rawPts / step) * step));
        const cleanPts = Math.round(roundedPts * 10000) / 10000;
        return {
          grade: item.grade,
          ratio: Math.max(0, Math.min(1, cleanPts / totalPossible))
        };
      });
    }

    function getThresholds(config) {
      const steps = getTestGradeSteps(config);
      const minG = config && config.grading && config.grading.minGrade != null ? Number(config.grading.minGrade) : 1.5;
      const maxG = config && config.grading && config.grading.maxGrade != null ? Number(config.grading.maxGrade) : 6;
      const interval = config && config.grading && config.grading.interval != null ? Number(config.grading.interval) : 0.5;
      const grading = (config && config.grading) || { mode: "manual", manualInputMode: "percent", passPercentGrade4: 66.67 };

      if (grading.mode === "manual") {
        const totals = Array.isArray(config && config.criteria) ? calcCriteriaTotals(config, {}) : { totalPossible: 0 };
        const totalPossible = Math.max(0, totals.totalPossible);
        const usePoints = grading.manualInputMode === "points";
        const manualList = steps.map(grade => {
          const key = String(grade);
          let ratio;
          if (usePoints) {
            if (totalPossible > 0) {
              const pts = toNumber(grading.manualPoints && grading.manualPoints[key]) ?? 0;
              ratio = Math.max(0, Math.min(1, pts / totalPossible));
            } else {
              ratio = 0;
            }
          } else {
            const pct = toNumber(grading.manualThresholds && grading.manualThresholds[key]) ?? 0;
            ratio = Math.max(0, Math.min(1, pct / 100));
          }
          return { grade, ratio };
        }).sort((a, b) => b.grade - a.grade);
        return usePoints ? manualList : applyPointsRoundingToThresholds(manualList, config);
      }

      if (grading.mode === "equation") {
        const totals = Array.isArray(config && config.criteria) ? calcCriteriaTotals(config, {}) : { totalPossible: 0 };
        const totalPossible = Math.max(0, totals.totalPossible);
        const totalPts = totalPossible > 0 ? totalPossible : 100;
        const passPercent = grading.passPercentGrade4 || 66.67;
        const passPts = totalPts * (passPercent / 100);
        const passGrade = 4;
        const formula = grading.equationFormula || "minGrade + 2 * (passGrade - minGrade) * pts / totalPts";

        return steps.map(grade => {
          let lowestRatio = 1.0;
          const numSamples = 1000;
          for (let i = 0; i <= numSamples; i++) {
            const r = i / numSamples;
            const pts = r * totalPts;
            const res = evaluateGradingEquation(formula, {
              pts,
              totalPts,
              minPts: 0,
              passPts,
              maxGrade: maxG,
              minGrade: minG,
              passGrade,
              rounding: "none"
            });
            const g = (res && res.ok && res.grade != null) ? res.grade : (minG + (maxG - minG) * r);
            if (g + 1e-4 >= grade) {
              lowestRatio = r;
              break;
            }
          }
          return { grade, ratio: lowestRatio };
        }).sort((a, b) => b.grade - a.grade);
      }

      if (grading.mode === "linear") {
        const spanGrade = maxG - minG;
        const linearList = steps.map(grade => {
          const ratio = spanGrade > 0 ? Math.max(0, Math.min(1, (grade - minG) / spanGrade)) : 0;
          return { grade, ratio };
        }).sort((a, b) => b.grade - a.grade);
        return applyPointsRoundingToThresholds(linearList, config);
      }

      const formulaList = steps.map(grade => ({
        grade,
        ratio: formulaThresholdForGrade(grade, grading.passPercentGrade4, minG, maxG, 4, interval)
      })).sort((a, b) => b.grade - a.grade);
      return applyPointsRoundingToThresholds(formulaList, config);
    }

    function getScaleModel(key, bankFilename = null) {
      if (!key) return null;
      if (bankFilename && typeof _availableScaleBanks !== 'undefined' && Array.isArray(_availableScaleBanks)) {
        const b = _availableScaleBanks.find(x => x.filename === bankFilename);
        if (b && Array.isArray(b.scales)) {
          const found = b.scales.find(m => m.key === key);
          if (found) return found;
        }
      }
      if (typeof _activeScaleBankFilename !== 'undefined' && _activeScaleBankFilename && typeof _availableScaleBanks !== 'undefined' && Array.isArray(_availableScaleBanks)) {
        const b = _availableScaleBanks.find(x => x.filename === _activeScaleBankFilename);
        if (b && Array.isArray(b.scales)) {
          const found = b.scales.find(m => m.key === key);
          if (found) return found;
        }
      }
      if (typeof XLSM_SCALE_MODELS !== "undefined" && Array.isArray(XLSM_SCALE_MODELS)) {
        const found = XLSM_SCALE_MODELS.find(m => m.key === key);
        if (found) return found;
      }
      if (typeof _availableScaleBanks !== 'undefined' && Array.isArray(_availableScaleBanks)) {
        for (const b of _availableScaleBanks) {
          if (b && Array.isArray(b.scales)) {
            const found = b.scales.find(m => m.key === key);
            if (found) return found;
          }
        }
      }
      return null;
    }

    function detectScaleModelKey(thresholds, bankFilename = null) {
      const modelsList = typeof getScaleModelsList === 'function'
        ? getScaleModelsList(bankFilename)
        : ((typeof XLSM_SCALE_MODELS !== "undefined" && Array.isArray(XLSM_SCALE_MODELS)) ? XLSM_SCALE_MODELS : []);

      if (Array.isArray(modelsList)) {
        for (const model of modelsList) {
          const steps = getScaleModelGradeSteps(model);
          let ok = true;
          for (const grade of steps) {
            const k = String(grade);
            const a = toNumber(thresholds[k]) ?? 0;
            const b = toNumber(model.thresholds[k]) ?? 0;
            if (Math.abs(a - b) > 0.05) {
              ok = false;
              break;
            }
          }
          if (ok) return model.key;
        }
      }
      return "custom";
    }

    function applyScaleModelToConfig(config, modelKey, bankFilename = null) {
      const bank = bankFilename || (config && config.grading && config.grading.scaleBank) || null;
      const model = getScaleModel(modelKey, bank);
      if (!model) return;
      const totals = Array.isArray(config.criteria) ? calcCriteriaTotals(config, {}) : { totalPossible: 0 };
      const totalPossible = Math.max(0, totals.totalPossible);
      const steps = getScaleModelGradeSteps(model);
      config.grading.manualThresholds = {};
      config.grading.minGrade = model.minGrade != null ? model.minGrade : 1.5;
      config.grading.maxGrade = model.maxGrade != null ? model.maxGrade : 6;
      config.grading.interval = model.interval != null ? model.interval : 0.5;
      if (model.colors && typeof model.colors === "object") {
        config.grading.colors = { ...model.colors };
      }
      steps.forEach(g => {
        const k = String(g);
        config.grading.manualThresholds[k] = toNumber(model.thresholds[k]) ?? 0;
      });
      config.grading.manualPoints = buildManualPointsFromPercents(
        config.grading.manualThresholds,
        totalPossible,
        steps
      );
      config.grading.mode = "manual";
      config.grading.modelKey = model.key;
      config.grading.pendingModelKey = model.key;
    }

    function gradeFromRatio(ratio, config) {
      const safeRatio = Math.max(0, Math.min(1, ratio || 0));
      const thresholds = getThresholds(config);
      const minG = config.grading && config.grading.minGrade != null ? config.grading.minGrade : 1.5;
      const found = thresholds.find(t => safeRatio + 1e-4 >= t.ratio);
      return found ? found.grade : minG;
    }

    function getNextGradeDelta(scoredPoints, totalPossible, config, currentGradeHint) {
      const safeTotal = Math.max(0, toNumber(totalPossible) ?? 0);
      if (safeTotal <= 0) return null;
      const safeScored = Math.max(0, toNumber(scoredPoints) ?? 0);

      let currentGrade = asGrade(currentGradeHint);
      if (currentGrade == null) {
        const ratio = safeTotal > 0 ? safeScored / safeTotal : 0;
        currentGrade = gradeFromRatio(ratio, config);
      }

      const steps = getTestGradeSteps(config);
      const nextGrade = [...steps]
        .sort((a, b) => a - b)
        .find(g => g > currentGrade + 1e-9);
      if (nextGrade == null) return null;

      const thresholds = getThresholds(config);
      const nextThreshold = thresholds.find(t => Math.abs(t.grade - nextGrade) < 1e-9);
      if (!nextThreshold) return null;

      const targetPoints = nextThreshold.ratio * safeTotal;
      return {
        nextGrade,
        targetPoints,
        delta: safeScored - targetPoints
      };
    }

    function isTdGradeDisplayEmpty(tdDelta, currentGradeHint) {
      if (tdDelta) {
        const row = tdDelta.closest ? tdDelta.closest("tr") : tdDelta.parentElement;
        const gradeEl = row ? (row.querySelector(".td-grade-display") || (row.cells && row.cells[3])) : null;
        if (gradeEl) {
          const txt = gradeEl.textContent.trim();
          if (txt === "" || txt === "—" || txt === "-") return true;
          if (asGrade(txt) != null) return false;
        }
      }
      return currentGradeHint == null || currentGradeHint === "" || asGrade(currentGradeHint) == null;
    }

    function updateNextGradeDeltaCell(tdDelta, config, totals, currentGradeHint) {
      tdDelta.textContent = "—";
      tdDelta.style.backgroundColor = "";
      tdDelta.style.color = "";
      tdDelta.title = "";

      if (!config || totals.totalPossible <= 0) return;
      if (isTdGradeDisplayEmpty(tdDelta, currentGradeHint)) return;

      const scored = (totals.totalScored || 0) + (totals.totalBonusScored || 0);
      const deltaInfo = getNextGradeDelta(scored, totals.totalPossible, config, currentGradeHint);
      if (!deltaInfo) return;

      const titleText = tFmt('gsNextGradeDeltaTitle', {
        grade: fmt(deltaInfo.nextGrade),
        target: fmtN(deltaInfo.targetPoints),
        delta: fmtN(Math.abs(deltaInfo.delta))
      });

      const below = deltaInfo.delta < -1e-9 ? Math.abs(deltaInfo.delta) : null;
      const above = deltaInfo.delta >= 1e-9 ? deltaInfo.delta : null;

      if (below != null) {
        tdDelta.textContent = `-${fmtN(below)}`;
      }
      if (above != null) {
        tdDelta.textContent = `+${fmtN(above)}`;
      }
      tdDelta.title = titleText;

      const highlightThreshold = Math.max(0, toNumber(config && config.nextGradeHighlightPoints) ?? 0);
      if (highlightThreshold <= 0) return;

      if (below != null && below <= highlightThreshold + 1e-9) {
        tdDelta.style.backgroundColor = "#fee2e2";
        tdDelta.style.color = "#7f1d1d";
      }
      if (above != null && above <= highlightThreshold + 1e-9) {
        tdDelta.style.backgroundColor = "#dcfce7";
        tdDelta.style.color = "#14532d";
      }
    }

    function recalcStudentGradeFromCriteria(student, sem, testIndex, config) {
      if (isGradeOverrideEnabled(student, sem, testIndex)) return;
      if (!config) return;
      const criteriaMap = (student.criteriaResults && student.criteriaResults[sem] && student.criteriaResults[sem][testIndex]) || {};
      if (config.criteria && Array.isArray(config.criteria) && config.criteria.length > 0) {
        const allFilled = config.criteria.every(cr => {
          const r = criteriaMap[cr.id];
          return r && r.points != null;
        });
        if (!allFilled) {
          if (sem === "sem1") {
            student.sem1Tests[testIndex] = null;
          } else {
            student.sem2Tests[testIndex] = null;
          }
          return;
        }
      }
      const totals = calcCriteriaTotals(config, criteriaMap);
      if (totals.totalPossible <= 0) return;
      const scored = (totals.totalScored || 0) + (totals.totalBonusScored || 0);
      const extSettings = typeof getActiveSummaryDisplaySettings === "function" ? getActiveSummaryDisplaySettings() : null;
      const capAtMax = !extSettings || extSettings.capGradeAtMax !== false;
      const rawRatio = totals.totalPossible > 0 ? scored / totals.totalPossible : 0;
      const ratio = totals.totalPossible > 0 ? Math.max(0, capAtMax ? Math.min(1, rawRatio) : rawRatio) : 0;

      let grade;
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
        grade = (res && res.ok && res.grade != null) ? res.grade : gradeFromRatio(ratio, config);
      } else if (isParticipationTestConfig(config) && (!config.grading || !config.grading.customManualScale) && (!config.grading || config.grading.mode === "manual" || config.grading.mode === "linear")) {
        const minG = config.grading && config.grading.minGrade != null ? Number(config.grading.minGrade) : 0;
        const maxG = config.grading && config.grading.maxGrade != null ? Number(config.grading.maxGrade) : 6;
        const step = (config.grading && Number(config.grading.interval) > 0) ? Number(config.grading.interval) : 0.5;
        const rawGrade = minG + ratio * (maxG - minG);
        const rounded = Math.round(rawGrade / step) * step;
        grade = parseFloat(Math.max(minG, Math.min(maxG, rounded)).toFixed(2));
      } else {
        grade = gradeFromRatio(ratio, config);
      }

      if (sem === "sem1") {
        student.sem1Tests[testIndex] = grade;
      } else {
        student.sem2Tests[testIndex] = grade;
      }
    }

    function recalcAllStudentGradesForTest(classObj, sem, testIndex) {
      const config = getTestConfig(classObj, sem, testIndex);
      if (config) {
        syncGradingPointsForCriteriaChange(config);
      }
      classObj.students.forEach(student => {
        recalcStudentGradeFromCriteria(student, sem, testIndex, config);
      });
    }

    async function resetStudentTestPoints(student, classObj, sem, testIndex, config) {
      const ok = await showConfirm(t('gsConfirmResetStudentPoints'));
      if (!ok) return;
      const map = student.criteriaResults[sem][testIndex] || {};
      config.criteria.forEach(cr => {
        if (map[cr.id]) {
          map[cr.id].points = null;
          map[cr.id].comment = '';
        }
      });
      if (student.correctionTime && Array.isArray(student.correctionTime[sem])) {
        student.correctionTime[sem][testIndex] = null;
      }
      if (student.correctedAt && Array.isArray(student.correctedAt[sem])) {
        student.correctedAt[sem][testIndex] = null;
      }
      if (student.testNotes && Array.isArray(student.testNotes[sem]) && Array.isArray(student.testNotes[sem][testIndex])) {
        student.testNotes[sem][testIndex].forEach(s => {
          if (s && typeof s === 'object') {
            s.checklist = [];
          }
        });
      }
      if (_studentModalDraft && _studentModalDraft.student && _studentModalDraft.student.id === student.id && _studentModalDraft.sem === sem && _studentModalDraft.testIndex === testIndex) {
        if (Array.isArray(_studentModalDraft.draftSections)) {
          _studentModalDraft.draftSections.forEach(s => {
            if (s && typeof s === 'object') {
              s.checklist = [];
            }
          });
        }
        const modalClChips = document.querySelectorAll("#student-modal .note-checklist-chip");
        modalClChips.forEach(chip => {
          chip.classList.remove("selected", "has-comment");
          chip.setAttribute("aria-pressed", "false");
          const chipName = chip.dataset.chipName || chip.textContent.replace(/x\d+$/, '').trim();
          chip.innerHTML = escapeHtml(chipName);
          chip.title = `${chip.dataset.category || ''} • ${t('gsDragToReorder', 'Drag to reorder')}`;
        });
      }
      recalcStudentGradeFromCriteria(student, sem, testIndex, config);
      saveState();
      renderTestSheet();
      renderSummary();
    }


    function isGradeOverrideEnabled(student, sem, testIndex) {
      return !!(student && student.gradeOverrides && Array.isArray(student.gradeOverrides[sem]) && student.gradeOverrides[sem][testIndex]);
    }

    function getTestDisplayGrade(student, classObj, sem, testIndex) {
      if (!classObj) {
        if (typeof appState === 'object' && appState && Array.isArray(appState.classes)) {
          classObj = appState.classes.find(c => Array.isArray(c.students) && c.students.some(s => s.id === student.id)) || getActiveClass();
        } else {
          classObj = getActiveClass();
        }
      }
      if (classObj && classObj.testCounts && typeof classObj.testCounts[sem] === "number" && testIndex >= classObj.testCounts[sem]) {
        return null;
      }
      const arr = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
      if (!arr) return null;
      const grade = arr[testIndex];
      if (grade == null) return null;
      if (isGradeOverrideEnabled(student, sem, testIndex)) return grade;
      if (!classObj) return grade;
      const config = getTestConfig(classObj, sem, testIndex);
      if (!config || !config.criteria || config.criteria.length === 0) return grade;
      const criteriaMap = (student.criteriaResults && student.criteriaResults[sem] && student.criteriaResults[sem][testIndex]) || {};
      const allFilled = config.criteria.every(cr => {
        const r = criteriaMap[cr.id];
        return r && r.points != null;
      });
      return allFilled ? grade : null;
    }

    function computeStudent(student, classObj = null) {
      if (!classObj) {
        if (typeof appState === 'object' && appState && Array.isArray(appState.classes)) {
          classObj = appState.classes.find(c => Array.isArray(c.students) && c.students.some(s => s.id === student.id)) || getActiveClass();
        } else {
          classObj = getActiveClass();
        }
      }

      const settings = typeof getActiveSummaryDisplaySettings === "function" ? getActiveSummaryDisplaySettings(classObj) : null;
      const missingPolicy = (settings && settings.missingPolicy) || "exclude";
      const avgRounding = (settings && settings.avgRounding) || "0.1";

      function roundAvgByPolicy(val) {
        if (val == null || Number.isNaN(val)) return null;
        if (avgRounding === "exact") return val;
        if (avgRounding === "0.25") return Math.round(val * 4) / 4;
        if (avgRounding === "0.5") return Math.round(val * 2) / 2;
        return roundToOneDecimal(val);
      }

      function calcSemAvg(tests, sem) {
        if (!Array.isArray(tests)) return null;
        let fixedSum = 0, fixedPct = 0;
        let normalSum = 0, normalWeight = 0;
        const maxCount = (classObj && classObj.testCounts && typeof classObj.testCounts[sem] === "number")
          ? classObj.testCounts[sem]
          : tests.length;
        for (let i = 0; i < maxCount; i++) {
          const grade = tests[i];
          let displayGrade = classObj ? getTestDisplayGrade(student, classObj, sem, i) : grade;
          if (displayGrade == null) {
            if (missingPolicy === "zero") displayGrade = 0;
            else if (missingPolicy === "min-grade") displayGrade = 1;
            else continue;
          }
          const cfg = classObj ? classObj.testConfigs[sem][i] : null;
          const fw = cfg && typeof cfg.fixedWeight === "number" ? cfg.fixedWeight : null;
          if (fw != null) {
            fixedSum += displayGrade * fw / 100;
            fixedPct += fw / 100;
          } else {
            const coeff = Math.max(0, toNumber(cfg && cfg.coefficient) ?? 1);
            normalSum += displayGrade * coeff;
            normalWeight += coeff;
          }
        }
        if (fixedPct === 0 && normalWeight === 0) return null;
        const normalProportion = Math.max(0, 1 - fixedPct);
        const normalAvg = normalWeight > 0 ? normalSum / normalWeight : null;
        return fixedSum + (normalAvg != null ? normalProportion * normalAvg : 0);
      }

      const rawSem1Avg = calcSemAvg(student.sem1Tests, "sem1");
      const rawSem2Avg = calcSemAvg(student.sem2Tests, "sem2");
      const sem1Avg = rawSem1Avg == null ? null : roundAvgByPolicy(rawSem1Avg);
      const sem2Avg = rawSem2Avg == null ? null : roundAvgByPolicy(rawSem2Avg);
      let rawYearAvg = null;
      if (sem1Avg != null && sem2Avg != null) {
        const w1 = settings && Number.isFinite(Number(settings.term1Weight)) ? Math.max(0, Number(settings.term1Weight)) : 50;
        const w2 = settings && Number.isFinite(Number(settings.term2Weight)) ? Math.max(0, Number(settings.term2Weight)) : 50;
        rawYearAvg = (w1 + w2 > 0) ? ((sem1Avg * w1 + sem2Avg * w2) / (w1 + w2)) : ((sem1Avg + sem2Avg) / 2);
      } else {
        rawYearAvg = sem1Avg != null ? sem1Avg : sem2Avg;
      }
      const yearAvg = rawYearAvg == null ? null : roundAvgByPolicy(rawYearAvg);
      const roundedFinal = yearAvg;
      return { sem1Avg, sem2Avg, yearAvg, roundedFinal };
    }

    function rankStudents(classObj) {
      const entries = classObj.students.map(s => {
        const c = computeStudent(s, classObj);
        const score = c.yearAvg != null ? c.yearAvg : (c.roundedFinal != null ? c.roundedFinal : -Infinity);
        return { id: s.id, score: score == null ? -Infinity : score };
      });

      entries.sort((a, b) => b.score - a.score);
      const rankById = new Map();

      let rank = 0;
      let previousScore = null;
      entries.forEach((e, idx) => {
        if (e.score !== previousScore) {
          rank = idx + 1;
          previousScore = e.score;
        }
        rankById.set(e.id, e.score === -Infinity ? null : rank);
      });

      return rankById;
    }

    function defaultStudent(index, firstNameOrFull, maybeLastName, maybeId) {
      let firstName = "";
      let lastName = "";
      let id = maybeId || uid();

      let customName = "";
      if (typeof maybeLastName === "string") {
        firstName = (firstNameOrFull || "").trim();
        lastName = (maybeLastName || "").trim();
      } else if (typeof firstNameOrFull === "object" && firstNameOrFull !== null) {
        firstName = (firstNameOrFull.firstName || "").trim();
        lastName = (firstNameOrFull.lastName || "").trim();
        customName = (firstNameOrFull.customName || "").trim();
        if (firstNameOrFull.uuid || firstNameOrFull.id) id = firstNameOrFull.uuid || firstNameOrFull.id;
      } else {
        const raw = (firstNameOrFull || "").trim();
        const roster = _gsRoster();
        if (roster[raw]) {
          const rs = roster[raw];
          firstName = rs.firstName || "";
          lastName = rs.lastName || "";
          customName = rs.customName || "";
          id = rs.uuid || id;
        } else {
          const upper = raw.toUpperCase();
          const match = Object.values(roster).find(rs => {
            const fn = (rs.firstName || "").trim().toUpperCase();
            const ln = (rs.lastName || "").trim().toUpperCase();
            const full = (fn + (ln ? " " + ln : "")).trim();
            const fullRev = (ln + (fn ? " " + fn : "")).trim();
            return full === upper || fullRev === upper;
          });
          if (match) {
            firstName = match.firstName || "";
            lastName = match.lastName || "";
            customName = match.customName || "";
            id = match.uuid || id;
          } else {
            const spaceIdx = raw.indexOf(' ');
            firstName = spaceIdx > 0 ? raw.slice(0, spaceIdx) : raw;
            lastName = spaceIdx > 0 ? raw.slice(spaceIdx + 1) : "";
          }
        }
      }

      return {
        id,
        index,
        firstName,
        lastName,
        customName,
        sem1Tests: Array(TEST_COUNT_PER_SEM).fill(null),
        sem2Tests: Array(TEST_COUNT_PER_SEM).fill(null),
        comments: "",
        gradeOverrides: {
          sem1: Array(TEST_COUNT_PER_SEM).fill(false),
          sem2: Array(TEST_COUNT_PER_SEM).fill(false)
        },
        testNotes: {
          sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => []),
          sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => [])
        },
        correctionTime: {
          sem1: Array(TEST_COUNT_PER_SEM).fill(null),
          sem2: Array(TEST_COUNT_PER_SEM).fill(null)
        },
        correctedAt: {
          sem1: Array(TEST_COUNT_PER_SEM).fill(null),
          sem2: Array(TEST_COUNT_PER_SEM).fill(null)
        },
        criteriaResults: {
          sem1: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({})),
          sem2: Array(TEST_COUNT_PER_SEM).fill(null).map(() => ({}))
        }
      };
    }

    function makeClass(name, studentNames = [], year = "", semester = "", level = "", criteriaBank = "correction-criteria.js", criteriaBanks = null) {
      const banks = Array.isArray(criteriaBanks) && criteriaBanks.length ? criteriaBanks : (criteriaBank ? [criteriaBank] : ["correction-criteria.js"]);
      return {
        id: uid(),
        name,
        year,
        semester,
        level,
        criteriaBank: banks[0],
        criteriaBanks: banks,
        createdAt: new Date().toISOString(),
        students: studentNames.map((n, i) => defaultStudent(i + 1, n)),
        testConfigs: createDefaultTestConfigs()
      };
    }

    function getActiveClass() {
      return appState.classes.find(c => c.id === appState.activeClassId) || null;
    }

    function slugifyForPath(name) {
      return String(name || '').trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+/, '_') || '_unnamed';
    }

    function parseGradeFile(content) {
      try {
        const sandbox = {};
        const fn = new Function('window', content);
        fn(sandbox);
        return sandbox.GRADE_TEST_DATA || sandbox.GRADE_CLASS || null;
      } catch (err) {
        console.warn('parseGradeFile error:', err);
        return null;
      }
    }

    const _lastSavedClassMetaJson = new Map();
    const _lastSavedTestDataJson = new Map();

    function _serializeClassMetaCore(cls) {
      return JSON.stringify({
        classId: cls.id,
        groupId: cls.groupId || undefined,
        className: cls.name,
        classYear: cls.year,
        classSemester: cls.semester,
        classLevel: cls.level,
        classCreatedAt: cls.createdAt,
        criteriaBank: cls.criteriaBank || (Array.isArray(cls.criteriaBanks) && cls.criteriaBanks.length ? cls.criteriaBanks[0] : 'correction-criteria.js'),
        criteriaBanks: Array.isArray(cls.criteriaBanks) && cls.criteriaBanks.length ? cls.criteriaBanks : (cls.criteriaBank ? [cls.criteriaBank] : ['correction-criteria.js']),
        testCounts: cls.testCounts || { sem1: 0, sem2: 0 },
        students: (cls.students || []).map(s => ({
          id: s.id,
          index: s.index,
          firstName: s.firstName,
          lastName: s.lastName,
          customName: s.customName || '',
          comments: s.comments
        }))
      });
    }

    function _serializeTestDataCore(cls, sem, i, cfg, results) {
      return JSON.stringify({
        classId: cls.id,
        className: cls.name || '',
        semester: sem,
        testIndex: i,
        testConfig: cfg || createDefaultTestConfig(),
        results: results
      });
    }

    async function saveGradesStructured(targetClassId = null, targetSem = null, targetTestIndex = null) {
      const now = Date.now();
      const classesToSave = targetClassId
        ? appState.classes.filter(c => c.id === targetClassId)
        : appState.classes;

      for (const cls of classesToSave) {
        const subdir = cls.id;
        const classSlug = slugifyForPath(cls.name);

        const currentMetaJson = _serializeClassMetaCore(cls);
        if (_lastSavedClassMetaJson.get(cls.id) !== currentMetaJson) {
          _lastSavedClassMetaJson.set(cls.id, currentMetaJson);
          cls._savedAt = now;
          const classMeta = {
            _savedAt: now,
            ...JSON.parse(currentMetaJson)
          };
          await Desktop.saveText('grades', '_class.js',
            `// _savedAt: ${now}\nwindow.GRADE_CLASS = ${JSON.stringify(classMeta, null, 2)};`,
            subdir);
        }

        const semsToSave = targetSem ? [targetSem] : ['sem1', 'sem2'];
        for (const sem of semsToSave) {
          const configs = (cls.testConfigs && cls.testConfigs[sem]) || [];
          const indicesToSave = (targetTestIndex != null && targetSem === sem)
            ? [targetTestIndex]
            : Array.from({ length: TEST_COUNT_PER_SEM }, (_, k) => k);

          for (const i of indicesToSave) {
            const cfg = configs[i];
            const testLabel = `${sem}-test-${String(i + 1).padStart(2, '0')}`;
            const testKey = `${subdir}/${testLabel}`;
            const hasScore = cls.students.some(s => {
              const tests = sem === 'sem1' ? s.sem1Tests : s.sem2Tests;
              return Array.isArray(tests) && tests[i] != null;
            });
            const hasCfg = cfg && (cfg.testName || cfg.testDate || cfg.type || cfg.scope ||
              (Array.isArray(cfg.criteria) && cfg.criteria.length > 0));
            if (!hasScore && !hasCfg) {
              if (_lastSavedTestDataJson.has(testKey)) {
                _lastSavedTestDataJson.delete(testKey);
                Desktop.deleteByPath('grades', `${subdir}/${testLabel}.js`).catch(() => {});
              }
              continue;
            }

            const results = cls.students.map(s => {
              const tests = sem === 'sem1' ? s.sem1Tests : s.sem2Tests;
              const notes = s.testNotes ? (sem === 'sem1' ? s.testNotes.sem1 : s.testNotes.sem2) : [];
              const criteria = s.criteriaResults ? (sem === 'sem1' ? s.criteriaResults.sem1 : s.criteriaResults.sem2) : [];
              const corrTimes = s.correctionTime ? (sem === 'sem1' ? s.correctionTime.sem1 : s.correctionTime.sem2) : [];
              const corrAts = s.correctedAt ? (sem === 'sem1' ? s.correctedAt.sem1 : s.correctedAt.sem2) : [];
              const overrides = s.gradeOverrides ? (sem === 'sem1' ? s.gradeOverrides.sem1 : s.gradeOverrides.sem2) : [];
              return {
                studentId: s.id,
                score: (Array.isArray(tests) ? tests[i] : null) ?? null,
                testNotes: (Array.isArray(notes) ? notes[i] : null) || [],
                criteriaResults: (Array.isArray(criteria) ? criteria[i] : null) || {},
                correctionTime: (Array.isArray(corrTimes) ? corrTimes[i] : null) ?? null,
                correctedAt: (Array.isArray(corrAts) ? corrAts[i] : null) ?? null,
                gradeOverride: !!((Array.isArray(overrides) ? overrides[i] : null) ?? false)
              };
            });

            const currentTestJson = _serializeTestDataCore(cls, sem, i, cfg, results);
            if (_lastSavedTestDataJson.get(testKey) !== currentTestJson) {
              _lastSavedTestDataJson.set(testKey, currentTestJson);
              const testData = {
                _savedAt: now,
                ...JSON.parse(currentTestJson)
              };
              await Desktop.saveText('grades', `${testLabel}.js`,
                `// _savedAt: ${now}\nwindow.GRADE_TEST_DATA = ${JSON.stringify(testData, null, 2)};`,
                subdir);
            }
          }
        }

        // Migrate: remove old sem1/{slug} and sem2/{slug} folders if present (only when full save)
        if (!targetClassId) {
          for (const sem of ['sem1', 'sem2']) {
            Desktop.deleteByPath('grades', `${sem}/${classSlug}`, { recursive: true, force: true })
              .catch(() => {});
          }
        }
      }
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          new BroadcastChannel('cmt-grades').postMessage({
            action: 'grades-saved',
            targetClassId: targetClassId,
            targetSem: targetSem,
            targetTestIndex: targetTestIndex
          });
        } catch (e) {}
      }
    }

    async function loadGradesStructured() {
      const listResult = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
      if (!listResult || !listResult.ok || !Array.isArray(listResult.files) || !listResult.files.length) {
        return null;
      }

      const classFiles = listResult.files.filter(f => f.filename === '_class.js');
      if (!classFiles.length) return null;

      _lastSavedClassMetaJson.clear();
      _lastSavedTestDataJson.clear();

      const classMap = new Map(); // classId -> class structure
      const foundMaxTestIndex = new Map(); // classId -> { sem1: -1, sem2: -1 }

      for (const cf of classFiles) {
        try {
          const res = await Desktop.readByPath('grades', cf.relativePath);
          if (!res || !res.content) continue;
          const meta = parseGradeFile(res.content);
          if (!meta || !meta.classId) continue;
          const existing = classMap.get(meta.classId);
          if (existing && (existing._savedAt || 0) >= (meta._savedAt || 0)) continue;
          const cls = {
            id: meta.classId,
            groupId: meta.groupId || undefined,
            name: meta.className || 'Unnamed',
            _savedAt: meta._savedAt || 0,
            year: meta.classYear || '',
            semester: meta.classSemester || '',
            level: meta.classLevel || '',
            createdAt: meta.classCreatedAt || new Date().toISOString(),
            criteriaBank: meta.criteriaBank || (Array.isArray(meta.criteriaBanks) && meta.criteriaBanks.length ? meta.criteriaBanks[0] : 'correction-criteria.js'),
            criteriaBanks: Array.isArray(meta.criteriaBanks) && meta.criteriaBanks.length ? meta.criteriaBanks : (meta.criteriaBank ? [meta.criteriaBank] : ['correction-criteria.js']),
            testCounts: { sem1: 0, sem2: 0 },
            students: (meta.students || []).map((s, idx) => ({
              id: s.id || uid(),
              index: s.index || idx + 1,
              firstName: s.firstName || '',
              lastName: s.lastName || '',
              customName: s.customName || '',
              comments: s.comments || '',
              sem1Tests: Array(TEST_COUNT_PER_SEM).fill(null),
              sem2Tests: Array(TEST_COUNT_PER_SEM).fill(null),
              gradeOverrides: {
                sem1: Array(TEST_COUNT_PER_SEM).fill(false),
                sem2: Array(TEST_COUNT_PER_SEM).fill(false)
              },
              testNotes: {
                sem1: Array.from({ length: TEST_COUNT_PER_SEM }, () => []),
                sem2: Array.from({ length: TEST_COUNT_PER_SEM }, () => [])
              },
              criteriaResults: {
                sem1: Array.from({ length: TEST_COUNT_PER_SEM }, () => ({})),
                sem2: Array.from({ length: TEST_COUNT_PER_SEM }, () => ({}))
              },
              correctionTime: {
                sem1: Array(TEST_COUNT_PER_SEM).fill(null),
                sem2: Array(TEST_COUNT_PER_SEM).fill(null)
              },
              correctedAt: {
                sem1: Array(TEST_COUNT_PER_SEM).fill(null),
                sem2: Array(TEST_COUNT_PER_SEM).fill(null)
              }
            })),
            testConfigs: createDefaultTestConfigs()
          };
          classMap.set(meta.classId, cls);
          foundMaxTestIndex.set(meta.classId, { sem1: -1, sem2: -1 });
        } catch (err) {
          console.warn('loadGradesStructured: failed to read _class.js', cf.relativePath, err);
        }
      }

      if (!classMap.size) return null;

      const testFiles = listResult.files.filter(f => f.filename !== '_class.js');
      for (const tf of testFiles) {
        try {
          const res = await Desktop.readByPath('grades', tf.relativePath);
          if (!res || !res.content) continue;
          const testData = parseGradeFile(res.content);
          if (!testData) continue;

          const folderName = tf.relativePath.split('/')[0];
          let cls = (testData.classId && classMap.get(testData.classId)) ||
                    (testData.classId && [...classMap.values()].find(c => c.groupId === testData.classId || c.id === testData.classId || (c.name && c.name.toLowerCase() === testData.classId.toLowerCase()))) ||
                    [...classMap.values()].find(c => c.id === folderName || (c.name && (c.name === folderName || slugifyForPath(c.name) === folderName)) || c.groupId === folderName);

          if (!cls) continue;
          const sem = testData.semester;
          const idx = testData.testIndex;
          if (sem !== 'sem1' && sem !== 'sem2') continue;
          if (typeof idx !== 'number' || idx < 0 || idx >= TEST_COUNT_PER_SEM) continue;

          const maxIdxObj = foundMaxTestIndex.get(cls.id);
          if (maxIdxObj) {
            maxIdxObj[sem] = Math.max(maxIdxObj[sem], idx);
          }

          if (testData.testConfig) {
            cls.testConfigs[sem][idx] = testData.testConfig;
          }
          const studentById = new Map(cls.students.map(s => [s.id, s]));
          for (const result of (testData.results || [])) {
            let student = studentById.get(result.studentId);
            if (!student && result.name) {
              student = findStudentByName(cls, result.name);
            }
            if (!student) continue;
            const tests = sem === 'sem1' ? student.sem1Tests : student.sem2Tests;
            const notes = sem === 'sem1' ? student.testNotes.sem1 : student.testNotes.sem2;
            const criteria = sem === 'sem1' ? student.criteriaResults.sem1 : student.criteriaResults.sem2;
            const corrTimes = sem === 'sem1' ? student.correctionTime.sem1 : student.correctionTime.sem2;
            const corrAts = sem === 'sem1' ? student.correctedAt.sem1 : student.correctedAt.sem2;
            const overrides = sem === 'sem1' ? student.gradeOverrides.sem1 : student.gradeOverrides.sem2;
            tests[idx] = result.score ?? null;
            notes[idx] = result.testNotes || [];
            criteria[idx] = result.criteriaResults || {};
            corrTimes[idx] = result.correctionTime ?? null;
            corrAts[idx] = result.correctedAt ?? null;
            overrides[idx] = !!result.gradeOverride;
          }
        } catch (err) {
          console.warn('loadGradesStructured: failed to read test file', tf.relativePath, err);
        }
      }

      // Finalize testCounts and initialize snapshot caches based on actual files read from disk
      for (const cls of classMap.values()) {
        const maxIdxObj = foundMaxTestIndex.get(cls.id);
        cls.testCounts = {
          sem1: maxIdxObj && maxIdxObj.sem1 >= 0 ? maxIdxObj.sem1 + 1 : 0,
          sem2: maxIdxObj && maxIdxObj.sem2 >= 0 ? maxIdxObj.sem2 + 1 : 0
        };

        _lastSavedClassMetaJson.set(cls.id, _serializeClassMetaCore(cls));

        for (const sem of ['sem1', 'sem2']) {
          const cnt = cls.testCounts[sem] || 0;
          for (let i = 0; i < cnt; i++) {
            const cfg = (cls.testConfigs && cls.testConfigs[sem]) ? cls.testConfigs[sem][i] : null;
            const testLabel = `${sem}-test-${String(i + 1).padStart(2, '0')}`;
            const testKey = `${cls.id}/${testLabel}`;
            const results = cls.students.map(s => {
              const tests = sem === 'sem1' ? s.sem1Tests : s.sem2Tests;
              const notes = s.testNotes ? (sem === 'sem1' ? s.testNotes.sem1 : s.testNotes.sem2) : [];
              const criteria = s.criteriaResults ? (sem === 'sem1' ? s.criteriaResults.sem1 : s.criteriaResults.sem2) : [];
              const corrTimes = s.correctionTime ? (sem === 'sem1' ? s.correctionTime.sem1 : s.correctionTime.sem2) : [];
              const corrAts = s.correctedAt ? (sem === 'sem1' ? s.correctedAt.sem1 : s.correctedAt.sem2) : [];
              const overrides = s.gradeOverrides ? (sem === 'sem1' ? s.gradeOverrides.sem1 : s.gradeOverrides.sem2) : [];
              return {
                studentId: s.id,
                score: (Array.isArray(tests) ? tests[i] : null) ?? null,
                testNotes: (Array.isArray(notes) ? notes[i] : null) || [],
                criteriaResults: (Array.isArray(criteria) ? criteria[i] : null) || {},
                correctionTime: (Array.isArray(corrTimes) ? corrTimes[i] : null) ?? null,
                correctedAt: (Array.isArray(corrAts) ? corrAts[i] : null) ?? null,
                gradeOverride: !!((Array.isArray(overrides) ? overrides[i] : null) ?? false)
              };
            });
            _lastSavedTestDataJson.set(testKey, _serializeTestDataCore(cls, sem, i, cfg, results));
          }
        }
      }

      const classes = deduplicateClasses([...classMap.values()]);
      classes.forEach(ensureClassStructures);
      return { classes };
    }

    function getDeletedClassIds() {
      try { return new Set(JSON.parse(localStorage.getItem(DELETED_CLASS_IDS_KEY) || '[]')); }
      catch { return new Set(); }
    }

    function markClassDeleted(classId) {
      const ids = getDeletedClassIds();
      ids.add(classId);
      localStorage.setItem(DELETED_CLASS_IDS_KEY, JSON.stringify([...ids]));
      if (window.Desktop && Desktop.isElectron()) {
        Desktop.saveJson('gradeSheet', 'deleted-class-ids-backup.json', [...ids]).catch(() => {});
      }
    }

    function filterDeletedClasses(classes) {
      const ids = getDeletedClassIds();
      return ids.size > 0 ? classes.filter(c => !ids.has(c.id)) : classes;
    }

    function deduplicateClasses(classes) {
      if (!Array.isArray(classes)) return [];
      const cgData = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
      const cgMeta = cgData ? (cgData.classGroupsMeta || {}) : (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {});

      const result = [];
      const seenGroupIds = new Map(); // groupId -> classObj
      const seenNames = new Map();    // normalized name -> classObj

      for (const cls of classes) {
        if (!cls) continue;
        const normName = (cls.name || '').trim().toLowerCase();
        let target = null;

        if (cls.groupId && seenGroupIds.has(cls.groupId)) {
          target = seenGroupIds.get(cls.groupId);
        } else if (normName && seenNames.has(normName)) {
          target = seenNames.get(normName);
        }

        if (!target) {
          if (cls.groupId) seenGroupIds.set(cls.groupId, cls);
          if (normName) seenNames.set(normName, cls);

          // Populate missing metadata from master classGroupsMeta
          const gMeta = (cls.groupId && cgMeta[cls.groupId]) ? cgMeta[cls.groupId] :
                        (normName && Object.values(cgMeta).find(m => (m.name || '').trim().toLowerCase() === normName));
          if (gMeta) {
            if (!cls.groupId && gMeta.uuid) cls.groupId = gMeta.uuid;
            if (!cls.year && gMeta.year) cls.year = String(gMeta.year);
            if ((cls.semester === undefined || cls.semester === '') && gMeta.semester !== undefined && gMeta.semester !== '') cls.semester = String(gMeta.semester);
            if (!cls.level && gMeta.level) cls.level = String(gMeta.level);
          }
          if (!cls.year && cgData && cgData.activeYear) cls.year = String(cgData.activeYear);
          if ((cls.semester === undefined || cls.semester === '') && cgData && cgData.activeSemester !== undefined && cgData.activeSemester !== '') cls.semester = String(cgData.activeSemester);

          result.push(cls);
        } else {
          if (!target.groupId && cls.groupId) {
            target.groupId = cls.groupId;
            seenGroupIds.set(target.groupId, target);
          }
          if (cls.year && (!target.year || target.year === '')) target.year = cls.year;
          if ((cls.semester !== undefined && cls.semester !== '') && (target.semester === undefined || target.semester === '')) target.semester = cls.semester;
          if (cls.level && (!target.level || target.level === '')) target.level = cls.level;

          const gMeta = (target.groupId && cgMeta[target.groupId]) ? cgMeta[target.groupId] :
                        (normName && Object.values(cgMeta).find(m => (m.name || '').trim().toLowerCase() === normName));
          if (gMeta) {
            if (!target.year && gMeta.year) target.year = String(gMeta.year);
            if ((target.semester === undefined || target.semester === '') && gMeta.semester !== undefined && gMeta.semester !== '') target.semester = String(gMeta.semester);
            if (!target.level && gMeta.level) target.level = String(gMeta.level);
          }
          if (!target.year && cgData && cgData.activeYear) target.year = String(cgData.activeYear);
          if ((target.semester === undefined || target.semester === '') && cgData && cgData.activeSemester !== undefined && cgData.activeSemester !== '') target.semester = String(cgData.activeSemester);

          // Merge student data & tests
          if (Array.isArray(cls.students) && cls.students.length) {
            cls.students.forEach(s => {
              let existingStudent = (s.id && target.students.find(ts => ts.id === s.id)) ||
                findStudentByName(target, ((s.firstName || '') + ' ' + (s.lastName || '')).trim());
              if (!existingStudent) {
                target.students.push(s);
              } else {
                ['sem1Tests', 'sem2Tests'].forEach(semKey => {
                  const targetArr = existingStudent[semKey] || [];
                  const srcArr = s[semKey] || [];
                  for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
                    if (targetArr[i] == null && srcArr[i] != null) {
                      targetArr[i] = srcArr[i];
                    }
                  }
                });
                if (!existingStudent.comments && s.comments) existingStudent.comments = s.comments;
              }
            });
          }

          // Merge test counts and test configs
          ['sem1', 'sem2'].forEach(sem => {
            if (!target.testCounts) target.testCounts = { sem1: 0, sem2: 0 };
            target.testCounts[sem] = Math.max(target.testCounts[sem] || 0, (cls.testCounts && cls.testCounts[sem]) || 0);

            if (cls.testConfigs && cls.testConfigs[sem] && target.testConfigs && target.testConfigs[sem]) {
              for (let i = 0; i < TEST_COUNT_PER_SEM; i++) {
                const srcCfg = cls.testConfigs[sem][i];
                const tgtCfg = target.testConfigs[sem][i];
                const srcHasData = srcCfg && (srcCfg.testName || srcCfg.testDate || srcCfg.scope || srcCfg.type || (Array.isArray(srcCfg.criteria) && srcCfg.criteria.length));
                const tgtHasData = tgtCfg && (tgtCfg.testName || tgtCfg.testDate || tgtCfg.scope || tgtCfg.type || (Array.isArray(tgtCfg.criteria) && tgtCfg.criteria.length));
                if (srcHasData && !tgtHasData) {
                  target.testConfigs[sem][i] = srcCfg;
                  target.testCounts[sem] = Math.max(target.testCounts[sem] || 0, i + 1);
                }
              }
            }
          });

          // Mark the duplicate class ID as deleted so it does not reload from disk
          if (cls.id && cls.id !== target.id) {
            markClassDeleted(cls.id);
            if (window.Desktop && Desktop.isElectron() && typeof Desktop.deleteByPath === 'function') {
              Desktop.deleteByPath('grades', cls.id, { recursive: true, force: true }).catch(() => {});
            }
          }
        }
      }

      result.forEach(c => {
        if (Array.isArray(c.students)) {
          c.students.forEach((st, sIdx) => { st.index = sIdx + 1; });
        }
      });
      return result;
    }

    function saveState(targetClassId = null, targetSem = null, targetTestIndex = null) {
      const payload = JSON.stringify({ classes: appState.classes });
      localStorage.setItem(STORAGE_KEY, payload);
      if (window.Desktop && Desktop.isElectron()) {
        saveGradesStructured(targetClassId, targetSem, targetTestIndex).catch(err => {
          console.error('Electron save failed:', err);
        });
      }
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          new BroadcastChannel('cmt-grades').postMessage({
            action: 'grades-saved',
            targetClassId,
            targetSem,
            targetTestIndex
          });
        } catch (e) {}
      }
    }

    function normalizeLoadedState(raw) {
      if (!raw || !Array.isArray(raw.classes)) return null;
      const classes = deduplicateClasses(raw.classes.map(c => {
        const students = Array.isArray(c.students) ? c.students.map((s, idx) => {
          const sem1 = Array.isArray(s.sem1Tests) ? s.sem1Tests.slice(0, TEST_COUNT_PER_SEM) : [];
          const sem2 = Array.isArray(s.sem2Tests) ? s.sem2Tests.slice(0, TEST_COUNT_PER_SEM) : [];
          while (sem1.length < TEST_COUNT_PER_SEM) sem1.push(null);
          while (sem2.length < TEST_COUNT_PER_SEM) sem2.push(null);

          const notes = s.testNotes || {};
          const n1 = Array.isArray(notes.sem1) ? notes.sem1.slice(0, TEST_COUNT_PER_SEM) : [];
          const n2 = Array.isArray(notes.sem2) ? notes.sem2.slice(0, TEST_COUNT_PER_SEM) : [];
          while (n1.length < TEST_COUNT_PER_SEM) n1.push([]);
          while (n2.length < TEST_COUNT_PER_SEM) n2.push([]);
          const normalizeNote = v => {
            if (Array.isArray(v)) return v;
            if (typeof v === "string") return v.trim() ? [{ label: "", text: v }] : [];
            return [];
          };
          n1.forEach((v, i) => { n1[i] = normalizeNote(v); });
          n2.forEach((v, i) => { n2[i] = normalizeNote(v); });

          const crit = s.criteriaResults || {};
          const c1 = Array.isArray(crit.sem1) ? crit.sem1.slice(0, TEST_COUNT_PER_SEM) : [];
          const c2 = Array.isArray(crit.sem2) ? crit.sem2.slice(0, TEST_COUNT_PER_SEM) : [];
          while (c1.length < TEST_COUNT_PER_SEM) c1.push({});
          while (c2.length < TEST_COUNT_PER_SEM) c2.push({});

          const overrides = s.gradeOverrides || {};
          const o1 = Array.isArray(overrides.sem1) ? overrides.sem1.slice(0, TEST_COUNT_PER_SEM) : [];
          const o2 = Array.isArray(overrides.sem2) ? overrides.sem2.slice(0, TEST_COUNT_PER_SEM) : [];
          while (o1.length < TEST_COUNT_PER_SEM) o1.push(false);
          while (o2.length < TEST_COUNT_PER_SEM) o2.push(false);

          const ct = s.correctionTime || {};
          const ct1 = Array.isArray(ct.sem1) ? ct.sem1.slice(0, TEST_COUNT_PER_SEM) : [];
          const ct2 = Array.isArray(ct.sem2) ? ct.sem2.slice(0, TEST_COUNT_PER_SEM) : [];
          while (ct1.length < TEST_COUNT_PER_SEM) ct1.push(null);
          while (ct2.length < TEST_COUNT_PER_SEM) ct2.push(null);

          const ca = s.correctedAt || {};
          const ca1 = Array.isArray(ca.sem1) ? ca.sem1.slice(0, TEST_COUNT_PER_SEM) : [];
          const ca2 = Array.isArray(ca.sem2) ? ca.sem2.slice(0, TEST_COUNT_PER_SEM) : [];
          while (ca1.length < TEST_COUNT_PER_SEM) ca1.push(null);
          while (ca2.length < TEST_COUNT_PER_SEM) ca2.push(null);

          return {
            id: s.id || uid(),
            index: idx + 1,
            firstName: s.firstName || "",
            lastName: s.lastName || "",
            customName: s.customName || "",
            sem1Tests: sem1.map(asGrade),
            sem2Tests: sem2.map(asGrade),
            comments: s.comments || "",
            gradeOverrides: { sem1: o1.map(v => !!v), sem2: o2.map(v => !!v) },
            testNotes: { sem1: n1, sem2: n2 },
            correctionTime: { sem1: ct1, sem2: ct2 },
            correctedAt: { sem1: ca1, sem2: ca2 },
            criteriaResults: {
              sem1: c1.map(v => (v && typeof v === "object") ? v : {}),
              sem2: c2.map(v => (v && typeof v === "object") ? v : {})
            }
          };
        }) : [];

        students.forEach((st, i) => {
          st.index = i + 1;
        });

        return {
          id: c.id || uid(),
          groupId: c.groupId || undefined,
          name: c.name || "Unnamed Class",
          year: c.year || "",
          semester: c.semester || "",
          level: c.level || "",
          createdAt: c.createdAt || new Date().toISOString(),
          criteriaBank: c.criteriaBank || (Array.isArray(c.criteriaBanks) && c.criteriaBanks.length ? c.criteriaBanks[0] : 'correction-criteria.js'),
          criteriaBanks: Array.isArray(c.criteriaBanks) && c.criteriaBanks.length ? c.criteriaBanks : (c.criteriaBank ? [c.criteriaBank] : ['correction-criteria.js']),
          students,
          testConfigs: c.testConfigs || createDefaultTestConfigs()
        };
      }));
      classes.forEach(ensureClassStructures);
      return { classes };
    }

    async function loadState() {
      // Try Electron persistence first
      if (window.Desktop && Desktop.isElectron()) {
        try {
          const structured = await loadGradesStructured();
          if (structured) {
            appState.classes = deduplicateClasses(filterDeletedClasses(structured.classes));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ classes: appState.classes }));
            return;
          }
        } catch (err) {
          console.error('Structured load failed, falling back:', err);
        }
        // Fall back to legacy grade-sheet-data.json
        try {
          const result = await Desktop.readText('gradeSheet', 'grade-sheet-data.json');
          if (result && result.ok && result.content) {
            const loaded = normalizeLoadedState(JSON.parse(result.content));
            if (loaded) {
              appState.classes = deduplicateClasses(filterDeletedClasses(loaded.classes));
              localStorage.setItem(STORAGE_KEY, result.content);
              return;
            }
          }
        } catch (err) {
          console.error('Legacy Electron load failed, falling back to localStorage:', err);
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const loaded = normalizeLoadedState(JSON.parse(raw));
          if (loaded) {
            appState.classes = deduplicateClasses(filterDeletedClasses(loaded.classes));
            return;
          }
        } catch (err) {
          console.error("Could not parse saved state", err);
        }
      }

      const seeded = [];
      const _cgSeed = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
      const _cgSeedGroups = _cgSeed ? _cgSeed.classGroups : (typeof CLASS_GROUPS === 'object' ? CLASS_GROUPS : null);
      const _cgSeedMeta = _cgSeed ? (_cgSeed.classGroupsMeta || {}) : (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {});
      const seedUuids = Object.keys(_cgSeedMeta).length ? Object.keys(_cgSeedMeta) : (_cgSeedGroups ? Object.keys(_cgSeedGroups) : []);
      seedUuids
        .filter(uuid => {
          const n = (_cgSeedMeta[uuid] && _cgSeedMeta[uuid].name) || uuid;
          return n !== 'Teachers' && !(_cgSeedMeta[uuid] && _cgSeedMeta[uuid].archived);
        })
        .forEach(uuid => {
          const meta = _cgSeedMeta[uuid] || {};
          const name = meta.name || uuid;
          const rawStudents = Array.isArray(meta.students) && meta.students.length
            ? meta.students
            : (_cgSeedGroups && Array.isArray(_cgSeedGroups[uuid]) ? _cgSeedGroups[uuid] : []);
          const studentNames = _gsResolveStudentNames(rawStudents);
          const cls = makeClass(name, studentNames, String(meta.year || _cgSeed?.activeYear || ''), String((meta.semester !== undefined && meta.semester !== '') ? meta.semester : (_cgSeed?.activeSemester || '')), String(meta.level || ''));
          cls.groupId = uuid;
          seeded.push(cls);
        });

      if (!seeded.length) {
        seeded.push(makeClass("Class A", []));
      }

      appState.classes = deduplicateClasses(seeded);
      saveState();
    }

    // Sync appState.classes from CLASS_GROUPS on every boot.
    // Creates any grade-sheet class not yet present for a non-archived group,
    // and adds any students in CLASS_GROUPS that are not yet in the matching class.
    // Also updates cls.name when the group has been renamed in group-editor.
    // Only adds — never removes — so existing grade data is never touched.
    function _gsRoster() {
      const src = (typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER))
        ? window.STUDENTS_ROSTER
        : (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER) ? STUDENTS_ROSTER : []);
      const map = {};
      src.forEach(s => { if (s && (s.uuid || s.id)) map[s.uuid || s.id] = s; });
      return map;
    }

    function _gsResolveStudentDescriptors(studentsArr) {
      if (!Array.isArray(studentsArr) || studentsArr.length === 0) return [];
      const roster = _gsRoster();
      return studentsArr.map(entry => {
        if (!entry) return null;
        if (typeof entry === 'object') {
          return {
            id: entry.uuid || entry.id || null,
            firstName: entry.firstName || '',
            lastName: entry.lastName || '',
            customName: entry.customName || ''
          };
        }
        if (typeof entry === 'string') {
          if (roster[entry]) {
            const rs = roster[entry];
            return { id: rs.uuid || entry, firstName: rs.firstName || '', lastName: rs.lastName || '', customName: rs.customName || '' };
          }
          const upper = entry.trim().toUpperCase();
          const match = Object.values(roster).find(rs => {
            const fn = (rs.firstName || '').trim().toUpperCase();
            const ln = (rs.lastName || '').trim().toUpperCase();
            const cn = (rs.customName || '').trim().toUpperCase();
            const full = (fn + (ln ? ' ' + ln : '')).trim();
            const fullRev = (ln + (fn ? ' ' + fn : '')).trim();
            return full === upper || fullRev === upper || (cn && cn === upper);
          });
          if (match) {
            return { id: match.uuid, firstName: match.firstName || '', lastName: match.lastName || '', customName: match.customName || '' };
          }
          const spaceIdx = entry.indexOf(' ');
          return {
            id: null,
            firstName: spaceIdx > 0 ? entry.slice(0, spaceIdx) : entry,
            lastName: spaceIdx > 0 ? entry.slice(spaceIdx + 1) : '',
            customName: ''
          };
        }
        return null;
      }).filter(Boolean);
    }

    function _gsResolveStudentNames(studentsArr) {
      return _gsResolveStudentDescriptors(studentsArr).map(d =>
        ((d.firstName || '') + (d.lastName ? ' ' + d.lastName : '')).trim().toUpperCase()
      ).filter(Boolean);
    }

    function syncFromClassGroups() {
      const cgData = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : null;
      const cgMeta = cgData ? (cgData.classGroupsMeta || {}) : (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {});
      const cgGroupsLegacy = cgData ? cgData.classGroups : (typeof CLASS_GROUPS === 'object' ? CLASS_GROUPS : null);
      const groupUuids = Object.keys(cgMeta).length ? Object.keys(cgMeta) : (cgGroupsLegacy ? Object.keys(cgGroupsLegacy) : []);
      if (!groupUuids.length) return false;
      let changed = false;
      const roster = _gsRoster();

      for (const groupUuid of groupUuids) {
        const meta = cgMeta[groupUuid] || {};
        const groupName = meta.name || groupUuid;
        if (groupName === 'Teachers') continue;
        if (meta.archived) continue;

        // Resolve students: UUID array from meta.students, or legacy classGroups string array
        const rawStudents = Array.isArray(meta.students) && meta.students.length
          ? meta.students
          : (cgGroupsLegacy && Array.isArray(cgGroupsLegacy[groupUuid]) ? cgGroupsLegacy[groupUuid] : []);
        const studentDescriptors = _gsResolveStudentDescriptors(rawStudents);

        const normGroupName = groupName.trim().toLowerCase();
        // Match by groupId (UUID link) first, then by normalized name (even if old groupId was present)
        let classObj = appState.classes.find(c => c.groupId === groupUuid) ||
                       appState.classes.find(c => (c.name || '').trim().toLowerCase() === normGroupName);

        const groupYear = String(meta.year || cgData?.activeYear || '');
        const groupSem = String((meta.semester !== undefined && meta.semester !== '') ? meta.semester : (cgData?.activeSemester !== undefined && cgData?.activeSemester !== '' ? cgData.activeSemester : ''));
        const groupLevel = String(meta.level || '');

        if (!classObj) {
          classObj = makeClass(groupName, [], groupYear, groupSem, groupLevel);
          classObj.groupId = groupUuid;
          appState.classes.push(classObj);
          changed = true;
        } else {
          if (!classObj.groupId || classObj.groupId !== groupUuid) { classObj.groupId = groupUuid; changed = true; }
          if (classObj.name !== groupName) { classObj.name = groupName; changed = true; }
          if (meta.year && classObj.year !== String(meta.year)) { classObj.year = String(meta.year); changed = true; }
          else if (!classObj.year && groupYear) { classObj.year = groupYear; changed = true; }
          if (meta.semester !== undefined && meta.semester !== '' && classObj.semester !== String(meta.semester)) { classObj.semester = String(meta.semester); changed = true; }
          else if ((classObj.semester === undefined || classObj.semester === '') && groupSem) { classObj.semester = groupSem; changed = true; }
          if (meta.level && classObj.level !== String(meta.level)) { classObj.level = String(meta.level); changed = true; }
          else if (!classObj.level && groupLevel) { classObj.level = groupLevel; changed = true; }
        }

        // First, sync existing students in class with roster (update firstName/lastName if present in group-editor)
        classObj.students.forEach(s => {
          let rStudent = s.id ? roster[s.id] : null;
          if (!rStudent) {
            const sFirst = (s.firstName || '').trim().toUpperCase();
            const sLast = (s.lastName || '').trim().toUpperCase();
            const sFull = (sFirst + (sLast ? ' ' + sLast : '')).trim();
            rStudent = Object.values(roster).find(rs => {
              const fn = (rs.firstName || '').trim().toUpperCase();
              const ln = (rs.lastName || '').trim().toUpperCase();
              const full = (fn + (ln ? ' ' + ln : '')).trim();
              const fullRev = (ln + (fn ? ' ' + fn : '')).trim();
              return full === sFull || fullRev === sFull;
            });
          }
          if (rStudent) {
            const trueFirst = rStudent.firstName || '';
            const trueLast = rStudent.lastName || '';
            if (s.firstName !== trueFirst || s.lastName !== trueLast) {
              s.firstName = trueFirst;
              s.lastName = trueLast;
              changed = true;
            }
            if (rStudent.uuid && s.id !== rStudent.uuid) {
              s.id = rStudent.uuid;
              changed = true;
            }
          }
        });

        // Add any missing students from the group, or update their names
        for (const desc of studentDescriptors) {
          const descFirst = (desc.firstName || '').trim().toUpperCase();
          const descLast = (desc.lastName || '').trim().toUpperCase();
          const descFull = (descFirst + (descLast ? ' ' + descLast : '')).trim();

          const existingStudent = classObj.students.find(s => {
            if (desc.id && s.id === desc.id) return true;
            const first = (s.firstName || '').trim().toUpperCase();
            const last = (s.lastName || '').trim().toUpperCase();
            const full = (first + (last ? ' ' + last : '')).trim();
            const fullRev = (last + (first ? ' ' + first : '')).trim();
            return full === descFull || fullRev === descFull;
          });

          if (!existingStudent) {
            const newSt = defaultStudent(classObj.students.length + 1, desc.firstName, desc.lastName, desc.id);
            if (desc.customName) newSt.customName = desc.customName;
            classObj.students.push(newSt);
            changed = true;
          } else {
            if (desc.firstName && (existingStudent.firstName !== desc.firstName || existingStudent.lastName !== desc.lastName)) {
              existingStudent.firstName = desc.firstName;
              existingStudent.lastName = desc.lastName;
              changed = true;
            }
            if (desc.customName && existingStudent.customName !== desc.customName) {
              existingStudent.customName = desc.customName;
              changed = true;
            }
            if (desc.id && existingStudent.id !== desc.id) {
              existingStudent.id = desc.id;
              changed = true;
            }
          }
        }
      }

      // Deduplicate classes if any duplicate was loaded or created
      const deduplicated = deduplicateClasses(appState.classes);
      if (deduplicated.length !== appState.classes.length) {
        appState.classes = deduplicated;
        changed = true;
      }

      // Propagate group-editor archive/delete to linked grade classes.
      // Runs after the main sync so cgMeta is confirmed non-empty (early return above guards empty case).
      const allGroupKeys = new Set(Object.keys(cgMeta));
      if (allGroupKeys.size > 0) {
        // Grade classes whose group was archived: remove from active appState so they don't appear
        // in the UI. Files are kept on disk — if the group is later unarchived, files reload on boot.
        const archivedLinked = appState.classes.filter(c => c.groupId && cgMeta[c.groupId]?.archived);
        if (archivedLinked.length) {
          const hiddenIds = new Set(archivedLinked.map(c => c.id));
          appState.classes = appState.classes.filter(c => !hiddenIds.has(c.id));
          changed = true;
        }

        // Grade classes whose group no longer exists (deleted): mark in blocklist + delete files.
        const deletedLinked = appState.classes.filter(c => c.groupId && !allGroupKeys.has(c.groupId));
        for (const cls of deletedLinked) {
          markClassDeleted(cls.id);
          if (window.Desktop && Desktop.isElectron()) {
            Desktop.deleteByPath('grades', cls.id, { recursive: true, force: true }).catch(() => {});
          }
          changed = true;
        }
        if (deletedLinked.length) appState.classes = filterDeletedClasses(appState.classes);
      }

      return changed;
    }

    function studentHasAnyGrade(student) {
      const hasGrade = arr => Array.isArray(arr) && arr.some(g => g != null);
      return hasGrade(student.sem1Tests) || hasGrade(student.sem2Tests);
    }

    // Returns { orphaned, candidates } when a rename is detectable, otherwise null.
    function getRenameDiff(classObj) {
      const cgStudents = _getClassGroupStudents(classObj);
      if (!cgStudents) return null;
      const orphaned = classObj.students.filter(s => !studentPresentInClassGroups(classObj, s));
      if (!orphaned.length) return null;
      const candidates = classObj.students.filter(s =>
        studentPresentInClassGroups(classObj, s) && !studentHasAnyGrade(s)
      );
      if (!candidates.length) return null;
      return { orphaned, candidates };
    }


    function parseJsOrJson(text) {
      // Try plain JSON first.
      try { return JSON.parse(text); } catch (_) {}
      // Try evaluating as a JS file that assigns to a known variable or returns an object.
      try {
        const sandbox = {};
        const fn = new Function('window', text + '; return (typeof GRADE_SHEET_DATA !== "undefined" ? GRADE_SHEET_DATA : undefined);');
        const result = fn(sandbox);
        if (result && typeof result === 'object') return result;
      } catch (_) {}
      // Fallback: extract the first top-level JSON object literal.
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      } catch (_) {}
      return null;
    }

    function importJson(file) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = parseJsOrJson(String(reader.result || "{}"));
          if (!parsed) throw new Error("Could not parse file");
          const normalized = normalizeLoadedState(parsed);
          if (!normalized) throw new Error("Invalid data structure");
          appState.classes = normalized.classes;
          appState.activeClassId = null;
          appState.activeTest = null;
          saveState();
          renderClasses();
          showScreen("classes");
        } catch (err) {
          await showAlert(t('gsAlertImportFailed'));
          console.error(err);
        }
      };
      reader.readAsText(file);
    }

