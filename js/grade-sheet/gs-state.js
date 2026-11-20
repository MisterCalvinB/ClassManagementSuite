    const STORAGE_KEY = "gradeSheetHtmlState.v1";
    const DELETED_CLASS_IDS_KEY = "gradeSheetHtmlDeletedIds.v1";
    const REFERENCE_CRITERIA_STORAGE_KEY = "gradeSheetReferenceCriteria.v1";
    const REFERENCE_SCALE_MODELS_STORAGE_KEY = "gradeSheetScaleModels.v1";
    const REFERENCE_PERSONALISED_CHIPS_STORAGE_KEY = "gradeSheetPersonalisedChips.v1";
    const TEST_COUNT_PER_SEM = 8;
    const GRADE_STEPS = [6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

    // Name display mode helpers
    function getGsNameDisplayMode() {
      const saved = localStorage.getItem('cmt-gs-name-display');
      if (saved && ['full', 'first', 'last', 'custom'].includes(saved)) return saved;
      try {
        if (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG?.nameDisplayMode) {
          return CLASS_MANAGEMENT_CONFIG.nameDisplayMode;
        }
      } catch (_) {}
      return 'full';
    }

    function setGsNameDisplayMode(mode) {
      if (!['full', 'first', 'last', 'custom'].includes(mode)) mode = 'full';
      localStorage.setItem('cmt-gs-name-display', mode);
      const sel = document.getElementById('gs-name-display-select');
      if (sel && sel.value !== mode) sel.value = mode;
      renderSummary();
      const screenTest = document.getElementById('screen-test');
      if (screenTest && !screenTest.classList.contains('hidden')) {
        renderTestSheet();
      }
    }



    const appState = {
      classes: [],
      activeClassId: null,
      activeTest: null
    };

    const screens = {
      classes: document.getElementById("screen-classes"),
      summary: document.getElementById("screen-summary"),
      test: document.getElementById("screen-test"),
      compare: document.getElementById("screen-compare")
    };

    let _testRowMenuCtx = null;
    let _classCardMenuCtx = null;
    let _testHeaderMenuCtx = null;
    let _summaryStudentMenuCtx = null;
    let _allTestItemMenuCtx = null;
    let _toptRebuildCriteriaList = null;
    let _toptUpdateLiveGradePreview = null;

    function updateLiveGradePreview() {
      if (typeof _toptUpdateLiveGradePreview === 'function') {
        try {
          _toptUpdateLiveGradePreview();
        } catch (e) {
          console.warn('[GradeSheet] updateLiveGradePreview error:', e);
        }
      }
    }
    window.updateLiveGradePreview = updateLiveGradePreview;

    function uid() {
      return "id-" + Math.random().toString(36).slice(2, 11);
    }

    function roundToOneDecimal(num) {
      if (num == null || Number.isNaN(Number(num))) return null;
      return Math.round(Number(num) * 10) / 10;
    }

    function roundToHalf(num) {
      return roundToOneDecimal(num);
    }

    function asGrade(value) {
      if (value == null || value === "") return null;
      const n = Number(value);
      if (Number.isNaN(n)) return null;
      return Math.min(6, Math.max(1, n));
    }

    function applyGradeColor(el, grade, config = null, opts = {}) {
      if (!el) return;
      if (grade == null || grade === "" || grade === "—" || grade === "-") {
        el.style.backgroundColor = "";
        el.style.color = "";
        return;
      }
      const num = toNumber(grade);
      if (num == null) return;

      const isSummary = !!(opts && opts.isSummary);
      const classObj = (opts && opts.classObj) || (typeof getActiveClass === "function" ? getActiveClass() : null);
      const summarySettings = isSummary ? getActiveSummaryDisplaySettings(classObj) : null;

      let color = null;
      if (isSummary) {
        if (config && config.grading && (config.grading.colors || config.grading.pendingModelKey || config.grading.modelKey)) {
          color = getScaleGradeColor(num, null, config);
        }
        if (!color) {
          color = getSummaryGradeColor(num, classObj);
        }
      } else {
        color = getScaleGradeColor(num, null, config);
      }

      if (color) {
        const textColor = getNotchContrastTextColor(color);
        if (isSummary && summarySettings && summarySettings.cellStyleMode === "badge") {
          el.style.backgroundColor = "";
          el.style.color = "";
          const textVal = el.textContent || (typeof fmt === "function" ? fmt(num) : String(num));
          el.innerHTML = `<span class="gs-grade-badge" style="background:${color};color:${textColor};">${textVal}</span>`;
        } else {
          el.style.backgroundColor = color;
          el.style.color = textColor;
        }
      }
    }

    function fmt(value) {
      if (value == null || Number.isNaN(value)) return "-";
      return Number(value).toFixed(2);
    }



    // Like fmt but drops trailing zeros: 4.00 → "4", 4.50 → "4.5"
    function fmtN(value) {
      if (value == null || Number.isNaN(value)) return "-";
      return String(parseFloat(Number(value).toFixed(2)));
    }

    // Formats averages rounded to 1 decimal place (e.g. 4.7, 5.0)
    function fmtAvg(value) {
      if (value == null || Number.isNaN(Number(value))) return "-";
      return Number(value).toFixed(1);
    }

    function formatCorrectionTime(value) {
      if (value == null || value === "") return "—";
      let totalSec = null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed === "—" || trimmed === "-") return "—";
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
          const parts = trimmed.split(':').map(Number);
          totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (/^\d+h/i.test(trimmed) || /^\d+m/i.test(trimmed) || /^\d+s/i.test(trimmed)) {
          return trimmed;
        }
      }
      if (totalSec == null) {
        const n = toNumber(value);
        if (n == null || Number.isNaN(n) || n < 0) return "—";
        totalSec = Math.round(n * 60);
      }
      if (totalSec === 0) return "0s";
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0) parts.push(`${seconds}s`);
      return parts.length > 0 ? parts.join("") : "0s";
    }

    function toNumber(value) {
      if (value == null || value === "") return null;
      const normalized = String(value).trim().replace(",", ".");
      if (normalized === "") return null;
      const n = Number(normalized);
      return Number.isNaN(n) ? null : n;
    }

    function formulaThresholdForGrade(grade, passPercentGrade4, minGrade = 1.5, maxGrade = 6, passGrade = 4, interval = 0.5) {
      const minG = Number(minGrade != null ? minGrade : 1.5);
      const maxG = Number(maxGrade != null ? maxGrade : 6);
      const passG = Number(passGrade != null ? passGrade : 4);
      const step = Number(interval != null && interval > 0 ? interval : 0.5);
      const passVal = evaluatePass4Formula(passPercentGrade4, 66.67);
      const passRatio = Math.max(0, Math.min(1, (passVal || 0) / 100));

      if (grade <= minG) return 0;
      if (grade > maxG) return 1;

      if (grade <= passG) {
        const halfStepsBelow = (passG - minG) / step;
        if (halfStepsBelow <= 0) return 0;
        const currentHalfSteps = (grade - minG) / step;
        const ratio = (currentHalfSteps / halfStepsBelow) * passRatio;
        return Math.max(0, Math.min(1, ratio));
      } else {
        const halfStepsAboveTotal = Math.max(1, (maxG - passG + step) / step);
        const currentHalfStepsAbove = (grade - passG) / step;
        const ratioAbove = passRatio + (currentHalfStepsAbove / halfStepsAboveTotal) * (1 - passRatio);
        return Math.max(0, Math.min(1, ratioAbove));
      }
    }

    function getCriteriaMinMaxGrades(criteria = []) {
      const allGrades = [];
      if (Array.isArray(criteria) && criteria.length > 0) {
        criteria.forEach(c => {
          if (!c) return;
          const grades = normalizeCriterionGrades(c.grades);
          grades.forEach(g => {
            const num = toNumber(g);
            if (num != null) allGrades.push(num);
          });
        });
      }
      if (allGrades.length === 0 && typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) {
        XLSM_CRITERIA.forEach(c => {
          if (!c) return;
          const grades = normalizeCriterionGrades(c.grades);
          grades.forEach(g => {
            const num = toNumber(g);
            if (num != null) allGrades.push(num);
          });
        });
      }
      const minG = allGrades.length > 0 ? Math.min(...allGrades) : 1.5;
      const maxG = allGrades.length > 0 ? Math.max(...allGrades) : 6;
      return { minGrade: minG, maxGrade: maxG };
    }

    function defaultManualThresholdPercentMap(minGrade = 1.5, maxGrade = 6, interval = 0.5) {
      const minG = Number(minGrade != null ? minGrade : 1.5);
      const maxG = Number(maxGrade != null ? maxGrade : 6);
      const step = Number(interval != null && interval > 0 ? interval : 0.5);
      const steps = computeScaleGradeSteps(maxG, minG, step);
      const thresholds = {};
      steps.forEach(g => {
        const key = String(g);
        const ratio = formulaThresholdForGrade(g, 66.67, minG, maxG, 4, step);
        thresholds[key] = Math.round(ratio * 10000) / 100;
      });
      return thresholds;
    }

    function computeScaleGradeSteps(maxGrade = 6, minGrade = 1, interval = 0.5) {
      let maxG = toNumber(maxGrade);
      let minG = toNumber(minGrade);
      let step = toNumber(interval);
      if (maxG == null || Number.isNaN(maxG)) maxG = 6;
      if (minG == null || Number.isNaN(minG)) minG = 1;
      if (step == null || Number.isNaN(step) || step <= 0) step = 0.5;

      if (minG > maxG) {
        const tmp = minG;
        minG = maxG;
        maxG = tmp;
      }
      if (minG === maxG) {
        return [maxG];
      }

      const steps = [];
      const precision = step < 0.01 ? 4 : (step < 0.1 ? 3 : (step < 1 ? 2 : 1));
      let current = maxG;
      let maxIterations = 200;
      while (current >= minG - 1e-6 && maxIterations > 0) {
        steps.push(Number(current.toFixed(precision)));
        current -= step;
        maxIterations--;
      }
      if (steps.length && Math.abs(steps[steps.length - 1] - minG) > 1e-4) {
        steps.push(Number(minG.toFixed(precision)));
      }
      return steps;
    }

    function getScaleModelGradeSteps(model) {
      if (!model || typeof model !== "object") return GRADE_STEPS.slice();
      if (model.maxGrade != null && model.minGrade != null && model.interval != null) {
        return computeScaleGradeSteps(model.maxGrade, model.minGrade, model.interval);
      }
      if (model.thresholds && typeof model.thresholds === "object") {
        const keys = Object.keys(model.thresholds)
          .map(k => toNumber(k))
          .filter(v => v != null);
        if (keys.length > 1) {
          keys.sort((a, b) => b - a);
          return keys;
        }
      }
      return GRADE_STEPS.slice();
    }

    function getTestGradeSteps(config) {
      if (!config || !config.grading) return GRADE_STEPS.slice();
      const minG = config.grading.minGrade != null ? Number(config.grading.minGrade) : 1.5;
      const maxG = config.grading.maxGrade != null ? Number(config.grading.maxGrade) : 6;
      const interval = config.grading.interval != null ? Number(config.grading.interval) : 0.5;

      let steps = null;
      if (config.grading.mode === "manual" && config.grading.modelKey && config.grading.modelKey !== "custom") {
        const model = getScaleModel(config.grading.modelKey);
        if (model) steps = getScaleModelGradeSteps(model);
      }
      if (!steps) {
        steps = computeScaleGradeSteps(maxG, minG, interval);
      }
      return steps.filter(g => g >= minG - 1e-4 && g <= maxG + 1e-4).sort((a, b) => b - a);
    }

    function buildManualPointsFromPercents(percentThresholds, totalPossible, gradeSteps = null) {
      const safeTotal = Math.max(0, toNumber(totalPossible) ?? 0);
      let steps = Array.isArray(gradeSteps) && gradeSteps.length ? gradeSteps : null;
      if (!steps) {
        const extraKeys = percentThresholds && typeof percentThresholds === "object"
          ? Object.keys(percentThresholds).map(k => toNumber(k)).filter(v => v != null)
          : [];
        steps = extraKeys.length ? Array.from(new Set([...GRADE_STEPS, ...extraKeys])).sort((a, b) => b - a) : GRADE_STEPS;
      }
      const points = {};
      steps.forEach(grade => {
        const key = String(grade);
        const pct = Math.max(0, Math.min(100, toNumber(percentThresholds && percentThresholds[key]) ?? 0));
        points[key] = safeTotal > 0 ? Math.round(((pct / 100) * safeTotal) * 100) / 100 : 0;
      });
      return points;
    }

    function buildManualPercentsFromPoints(pointsThresholds, totalPossible, fallbackPercents, gradeSteps = null) {
      const safeTotal = Math.max(0, toNumber(totalPossible) ?? 0);
      let steps = Array.isArray(gradeSteps) && gradeSteps.length ? gradeSteps : null;
      if (!steps) {
        const extraKeys = [
          ...Object.keys((pointsThresholds && typeof pointsThresholds === "object") ? pointsThresholds : {}),
          ...Object.keys((fallbackPercents && typeof fallbackPercents === "object") ? fallbackPercents : {})
        ].map(k => toNumber(k)).filter(v => v != null);
        steps = extraKeys.length ? Array.from(new Set([...GRADE_STEPS, ...extraKeys])).sort((a, b) => b - a) : GRADE_STEPS;
      }
      const percents = {};
      steps.forEach(grade => {
        const key = String(grade);
        const fallback = Math.max(0, Math.min(100, toNumber(fallbackPercents && fallbackPercents[key]) ?? 0));
        const pts = toNumber(pointsThresholds && pointsThresholds[key]);
        if (pts == null || safeTotal <= 0) {
          percents[key] = fallback;
        } else {
          percents[key] = Math.max(0, Math.min(100, Math.round(((pts / safeTotal) * 100) * 100) / 100));
        }
      });
      return percents;
    }

    function testKey(semester, testIndex) {
      return `${semester}-${testIndex}`;
    }

    const DEFAULT_CRITERION_GRADES = ["6", "5", "4", "3", "2", "1.5"];

    const DEFAULT_GRADE_COLORS = {
      "6": "#16a34a",
      "5.5": "#4d7c0f",
      "5": "#65a30d",
      "4.5": "#ca8a04",
      "4": "#d97706",
      "3.5": "#f97316",
      "3": "#ea580c",
      "2.5": "#e11d48",
      "2": "#dc2626",
      "1.5": "#991b1b",
      "1": "#7f1d1d"
    };

    const SUMMARY_GRADE_STEPS = ["6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1"];

    const DEFAULT_SUMMARY_DISPLAY_SETTINGS = {
      version: 1,
      compactMode: false,
      zebraStriping: false,
      cellStyleMode: "cell",
      anchors: ["6", "4", "1"],
      gradeColors: { ...DEFAULT_GRADE_COLORS }
    };

    function loadSummaryDisplaySettings() {
      if (!window.SUMMARY_DISPLAY_SETTINGS) {
        try {
          const raw = localStorage.getItem("cmt-summary-display-settings");
          if (raw) {
            window.SUMMARY_DISPLAY_SETTINGS = JSON.parse(raw);
          }
        } catch (_) {}
      }
      if (!window.SUMMARY_DISPLAY_SETTINGS) {
        window.SUMMARY_DISPLAY_SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SUMMARY_DISPLAY_SETTINGS));
      }
      if (!window.SUMMARY_DISPLAY_SETTINGS.gradeColors) {
        window.SUMMARY_DISPLAY_SETTINGS.gradeColors = { ...DEFAULT_GRADE_COLORS };
      }
      if (!Array.isArray(window.SUMMARY_DISPLAY_SETTINGS.anchors)) {
        window.SUMMARY_DISPLAY_SETTINGS.anchors = ["6", "4", "1"];
      }
    }

    function getActiveSummaryDisplaySettings(classObj = null) {
      const targetClass = classObj || (typeof getActiveClass === "function" ? getActiveClass() : null);
      if (targetClass && targetClass.summarySettings && targetClass.summarySettings.custom) {
        return targetClass.summarySettings;
      }
      if (!window.SUMMARY_DISPLAY_SETTINGS) {
        loadSummaryDisplaySettings();
      }
      return window.SUMMARY_DISPLAY_SETTINGS || DEFAULT_SUMMARY_DISPLAY_SETTINGS;
    }

    function getSummaryGradeColor(gradeVal, classObj = null) {
      if (gradeVal == null || gradeVal === "" || gradeVal === "—" || gradeVal === "-") return null;
      const num = toNumber(gradeVal);
      if (num == null) return null;
      const settings = getActiveSummaryDisplaySettings(classObj);
      const colors = (settings && settings.gradeColors) || DEFAULT_GRADE_COLORS;

      const k = fmtN(num);
      if (colors[k]) return colors[k];
      const sNum = String(num);
      if (colors[sNum]) return colors[sNum];

      for (let i = 0; i < SUMMARY_GRADE_STEPS.length; i++) {
        const stepVal = Number(SUMMARY_GRADE_STEPS[i]);
        if (num >= stepVal - 1e-4) {
          const stepKey = SUMMARY_GRADE_STEPS[i];
          if (colors[stepKey]) return colors[stepKey];
        }
      }
      return colors["1"] || "#7f1d1d";
    }

    function hexToRgb(hex) {
      if (!hex || typeof hex !== "string") return null;
      let clean = hex.trim().replace(/^#/, "");
      if (clean.length === 3) {
        clean = clean.split("").map(c => c + c).join("");
      }
      if (clean.length !== 6) return null;
      const num = parseInt(clean, 16);
      if (isNaN(num)) return null;
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    function rgbToHex(r, g, b) {
      const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
      const toHex = n => clamp(n).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function interpolateHexColor(color1, color2, t) {
      const c1 = hexToRgb(color1) || { r: 100, g: 100, b: 100 };
      const c2 = hexToRgb(color2) || { r: 100, g: 100, b: 100 };
      const factor = Math.max(0, Math.min(1, t));
      const r = c1.r + factor * (c2.r - c1.r);
      const g = c1.g + factor * (c2.g - c1.g);
      const b = c1.b + factor * (c2.b - c1.b);
      return rgbToHex(r, g, b);
    }

    function applySummaryDisplaySettingsToDOM() {
      const classObj = typeof getActiveClass === "function" ? getActiveClass() : null;
      const settings = getActiveSummaryDisplaySettings(classObj);
      const table = document.getElementById("summary-table");
      if (table) {
        table.classList.toggle("gs-compact", !!settings.compactMode);
        table.classList.toggle("gs-zebra", !!settings.zebraStriping);
      }
    }

    const REF_GRADE_PALETTE_50 = [
      // Row 1: Deep & Rich tones (Reds, Roses, Oranges, Ambers, Limes, Greens, Teals, Blues, Violets, Fuchsias)
      "#991b1b", "#881337", "#9a3412", "#b45309", "#4d7c0f", "#14532d", "#115e59", "#1e3a8a", "#4c1d95", "#701a75",
      // Row 2: Vivid & Bold standard
      "#dc2626", "#be123c", "#ea580c", "#d97706", "#65a30d", "#16a34a", "#0d9488", "#1d4ed8", "#6d28d9", "#a21caf",
      // Row 3: Bright & High-contrast
      "#ef4444", "#f43f5e", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#2563eb", "#7c3aed", "#c026d3",
      // Row 4: Flashy / Electric / Neon
      "#ff1744", "#ff007f", "#ff6d00", "#ffd600", "#76ff03", "#00e676", "#00e5ff", "#2979ff", "#651fff", "#d500f9",
      // Row 5: Luminous & Saturated Accents
      "#ff4d6d", "#fb7185", "#ff9e00", "#ffea00", "#a3e635", "#2dd4bf", "#38bdf8", "#00b0ff", "#a855f7", "#f472b6"
    ];

    let _refColorPickerCleanup = null;
    function openRefColorPicker(anchorEl, currentColor, onSelect) {
      closeRefColorPicker();
      let popover = document.getElementById("ref-color-picker-popover");
      if (!popover) {
        popover = document.createElement("div");
        popover.id = "ref-color-picker-popover";
        popover.className = "ref-color-popover hidden";
        document.body.appendChild(popover);
      }

      popover.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "ref-color-popover-grid";

      REF_GRADE_PALETTE_50.forEach(col => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ref-color-popover-swatch" + (col.toLowerCase() === (currentColor || "").toLowerCase() ? " active" : "");
        btn.style.backgroundColor = col;
        btn.title = col;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(col);
          closeRefColorPicker();
        });
        grid.appendChild(btn);
      });
      popover.appendChild(grid);

      // Custom color row with native picker + hex input
      const customRow = document.createElement("div");
      customRow.className = "ref-color-popover-custom-row";
      customRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;";

      const customNative = document.createElement("input");
      customNative.type = "color";
      customNative.className = "ref-color-custom-native";
      customNative.value = (currentColor && currentColor.startsWith("#")) ? currentColor : "#10b981";
      customNative.style.cssText = "-webkit-appearance:none;appearance:none;width:24px;height:24px;border:1.5px solid #333;border-radius:4px;cursor:pointer;padding:0;background:none;flex-shrink:0;";

      const customLbl = document.createElement("span");
      customLbl.style.cssText = "font-size:0.75rem;font-weight:700;color:#475569;flex:1;";
      customLbl.textContent = (typeof i18n !== 'undefined' ? i18n.t('gsCustomColor') : null) || "Custom…";

      const customHex = document.createElement("input");
      customHex.type = "text";
      customHex.className = "ref-color-custom-hex";
      customHex.value = (currentColor && currentColor.startsWith("#")) ? currentColor : "#10b981";
      customHex.maxLength = 7;
      customHex.style.cssText = "width:64px;font-family:monospace;font-size:0.78rem;padding:2px 4px;border:1.5px solid #333;border-radius:4px;text-align:center;";

      customNative.addEventListener("input", (e) => {
        const val = e.target.value;
        customHex.value = val;
        onSelect(val);
      });

      customHex.addEventListener("input", (e) => {
        let val = customHex.value.trim();
        if (!val.startsWith("#")) val = "#" + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          customNative.value = val;
          onSelect(val);
        }
      });

      customRow.appendChild(customNative);
      customRow.appendChild(customLbl);
      customRow.appendChild(customHex);
      popover.appendChild(customRow);

      popover.classList.remove("hidden");
      const rect = anchorEl.getBoundingClientRect();
      const popW = 296;
      const popH = 200;
      let left = rect.left;
      if (left + popW > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popW - 12);
      }
      if (left < 12) left = 12;

      let top = rect.bottom + 6;
      if (top + popH > window.innerHeight - 12) {
        top = Math.max(12, rect.top - popH - 6);
      }
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;

      const onDocClick = (e) => {
        if (!popover.contains(e.target) && e.target !== anchorEl) {
          closeRefColorPicker();
        }
      };
      let colorPickerUnreg = null;
      const onDocKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          closeRefColorPicker();
        }
      };
      if (window.cmtPushEscapeHandler) {
        colorPickerUnreg = window.cmtPushEscapeHandler({ el: popover, close: closeRefColorPicker });
      }
      _refColorPickerCleanup = () => {
        if (colorPickerUnreg) { colorPickerUnreg(); colorPickerUnreg = null; }
        document.removeEventListener("pointerdown", onDocClick, true);
        document.removeEventListener("keydown", onDocKey, true);
      };
      setTimeout(() => {
        document.addEventListener("pointerdown", onDocClick, true);
        document.addEventListener("keydown", onDocKey, true);
      }, 10);
    }

    function closeRefColorPicker() {
      const popover = document.getElementById("ref-color-picker-popover");
      if (popover) popover.classList.add("hidden");
      if (_refColorPickerCleanup) {
        _refColorPickerCleanup();
        _refColorPickerCleanup = null;
      }
    }

    function getHexRgb(hex) {
      if (!hex || typeof hex !== "string") return [0, 0, 0];
      let clean = hex.replace("#", "").trim();
      if (clean.length === 3) clean = clean.split("").map(c => c + c).join("");
      if (clean.length < 6) return [0, 0, 0];
      return [
        parseInt(clean.substring(0, 2), 16) || 0,
        parseInt(clean.substring(2, 4), 16) || 0,
        parseInt(clean.substring(4, 6), 16) || 0
      ];
    }

    function getColorLuminance(hex) {
      const [r, g, b] = getHexRgb(hex).map(v => v / 255);
      const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getHighContrastTextColor(hex) {
      if (!hex || typeof hex !== "string") return "#111827";
      const lum = getColorLuminance(hex);
      if (lum > 0.35) {
        const [r, g, b] = getHexRgb(hex);
        const factor = lum > 0.65 ? 0.42 : (lum > 0.48 ? 0.55 : 0.68);
        const dr = Math.round(r * factor);
        const dg = Math.round(g * factor);
        const db = Math.round(b * factor);
        const toHex = v => v.toString(16).padStart(2, "0");
        return `#${toHex(dr)}${toHex(dg)}${toHex(db)}`;
      }
      return hex;
    }

    function getNotchContrastTextColor(hex) {
      if (!hex || typeof hex !== "string") return "#ffffff";
      try {
        const lum = getColorLuminance(hex);
        return lum > 0.48 ? "#0f172a" : "#ffffff";
      } catch (e) {
        return "#ffffff";
      }
    }

    function getDefaultGradeColor(key, index, total) {
      if (key != null && DEFAULT_GRADE_COLORS[String(key)]) {
        return DEFAULT_GRADE_COLORS[String(key)];
      }
      const num = toNumber(key);
      if (num != null) {
        if (num >= 6) return "#16a34a";
        if (num >= 5.5) return "#4d7c0f";
        if (num >= 5) return "#65a30d";
        if (num >= 4.5) return "#ca8a04";
        if (num >= 4) return "#d97706";
        if (num >= 3.5) return "#f97316";
        if (num >= 3) return "#ea580c";
        if (num >= 2.5) return "#e11d48";
        if (num >= 2) return "#dc2626";
        if (num >= 1.5) return "#991b1b";
        return "#7f1d1d";
      }
      if (total && total > 1 && index != null) {
        const ratio = index / (total - 1);
        const palette = ["#16a34a", "#65a30d", "#d97706", "#ea580c", "#dc2626", "#991b1b"];
        const pIdx = Math.min(palette.length - 1, Math.floor(ratio * palette.length));
        return palette[pIdx];
      }
      return "#d97706";
    }

    function getScaleGradeColor(gradeKey, modelKey = null, config = null) {
      if (gradeKey == null || gradeKey === "" || gradeKey === "—" || gradeKey === "-") return null;
      const k = String(gradeKey).trim();
      const num = toNumber(gradeKey);

      function findInColorsAndSteps(colors, steps) {
        if (!colors || typeof colors !== "object") return null;
        if (colors[k] && typeof colors[k] === "string") return colors[k].trim();
        if (num != null) {
          const numStr = String(num);
          if (colors[numStr] && typeof colors[numStr] === "string") return colors[numStr].trim();
          const fmtStr = fmtN(num);
          if (colors[fmtStr] && typeof colors[fmtStr] === "string") return colors[fmtStr].trim();
          if (Array.isArray(steps) && steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
              const stepVal = toNumber(steps[i]);
              if (stepVal != null && num >= stepVal - 1e-4) {
                const sKey = String(steps[i]);
                if (colors[sKey]) return colors[sKey];
                const sFmt = fmtN(stepVal);
                if (colors[sFmt]) return colors[sFmt];
              }
            }
            const lowest = String(steps[steps.length - 1]);
            if (colors[lowest]) return colors[lowest];
          }
        }
        return null;
      }

      // 1. Check passed config
      if (config && config.grading) {
        if (config.grading.colors) {
          const steps = typeof getTestGradeSteps === "function" ? getTestGradeSteps(config) : null;
          const c = findInColorsAndSteps(config.grading.colors, steps);
          if (c) return c;
        }
        const mKey = config.grading.pendingModelKey || config.grading.modelKey;
        if (mKey && typeof getScaleModel === "function") {
          const model = getScaleModel(mKey, config.grading.scaleBank);
          if (model && model.colors) {
            const steps = typeof getScaleModelGradeSteps === "function" ? getScaleModelGradeSteps(model) : null;
            const c = findInColorsAndSteps(model.colors, steps);
            if (c) return c;
          }
        }
      }

      // 2. Check explicitly passed modelKey
      if (modelKey && typeof getScaleModel === "function") {
        const model = getScaleModel(modelKey);
        if (model && model.colors) {
          const steps = typeof getScaleModelGradeSteps === "function" ? getScaleModelGradeSteps(model) : null;
          const c = findInColorsAndSteps(model.colors, steps);
          if (c) return c;
        }
      }

      // 3. Check active test config from appState
      if (typeof appState !== "undefined" && appState && appState.activeTest && typeof getActiveClass === "function" && typeof getTestConfig === "function" && typeof getScaleModel === "function") {
        const classObj = getActiveClass();
        if (classObj) {
          const cfg = getTestConfig(classObj, appState.activeTest.semester, appState.activeTest.testIndex);
          if (cfg && cfg.grading) {
            if (cfg.grading.colors) {
              const steps = typeof getTestGradeSteps === "function" ? getTestGradeSteps(cfg) : null;
              const c = findInColorsAndSteps(cfg.grading.colors, steps);
              if (c) return c;
            }
            const mKey = cfg.grading.pendingModelKey || cfg.grading.modelKey;
            if (mKey) {
              const model = getScaleModel(mKey, cfg.grading.scaleBank);
              if (model && model.colors) {
                const steps = typeof getScaleModelGradeSteps === "function" ? getScaleModelGradeSteps(model) : null;
                const c = findInColorsAndSteps(model.colors, steps);
                if (c) return c;
              }
            }
          }
        }
      }

      // 4. Check available scale models / XLSM_SCALE_MODELS
      if (typeof XLSM_SCALE_MODELS !== "undefined" && Array.isArray(XLSM_SCALE_MODELS)) {
        for (const m of XLSM_SCALE_MODELS) {
          if (m && m.colors) {
            const steps = typeof getScaleModelGradeSteps === "function" ? getScaleModelGradeSteps(m) : null;
            const c = findInColorsAndSteps(m.colors, steps);
            if (c) return c;
          }
        }
      }

      return getDefaultGradeColor(k);
    }

    function lookupColorInMap(colorMap, key) {
      if (!colorMap || typeof colorMap !== "object" || key == null) return null;
      const k = String(key).trim();
      if (colorMap[k] && typeof colorMap[k] === "string") return colorMap[k].trim();
      const num = toNumber(k);
      if (num != null) {
        if (colorMap[num] && typeof colorMap[num] === "string") return colorMap[num].trim();
        const numStr = String(num);
        if (colorMap[numStr] && typeof colorMap[numStr] === "string") return colorMap[numStr].trim();
        const intStr = String(Math.round(num));
        if (num === Math.round(num) && colorMap[intStr] && typeof colorMap[intStr] === "string") return colorMap[intStr].trim();
      }
      return null;
    }

    function findMatchingReferenceCriterion(criterionName, bankFilename = null) {
      if (!criterionName) return null;
      const cleanName = String(criterionName).trim().toLowerCase();

      // 1. Search in _availableCriteriaBanks (prioritize bankFilename if supplied)
      if (typeof _availableCriteriaBanks !== "undefined" && Array.isArray(_availableCriteriaBanks) && _availableCriteriaBanks.length > 0) {
        if (bankFilename) {
          const targetBank = _availableCriteriaBanks.find(b => b.filename === bankFilename);
          if (targetBank && Array.isArray(targetBank.criteria)) {
            const match = targetBank.criteria.find(c => c && c.name && String(c.name).trim().toLowerCase() === cleanName);
            if (match) return match;
          }
        }
        for (const bank of _availableCriteriaBanks) {
          if (Array.isArray(bank.criteria)) {
            const match = bank.criteria.find(c => c && c.name && String(c.name).trim().toLowerCase() === cleanName);
            if (match) return match;
          }
        }
      }

      // 2. Fallback to XLSM_CRITERIA (user/correction-criteria.js)
      if (typeof XLSM_CRITERIA !== "undefined" && Array.isArray(XLSM_CRITERIA)) {
        const match = XLSM_CRITERIA.find(c => c && c.name && String(c.name).trim().toLowerCase() === cleanName);
        if (match) return match;
      }
      return null;
    }

    function resolveCriterionProps(criterion, testConfig = null, classObj = null) {
      const name = criterion && criterion.name ? criterion.name.trim() : "Criterion";
      const bankFilename = (testConfig && testConfig.criteriaBank) ||
                           (classObj && classObj.criteriaBank) ||
                           (criterion && criterion.criteriaBank) || null;
      const xlsm = findMatchingReferenceCriterion(name, bankFilename);

      // minPoints: crit-item-detail takes precedence if set, otherwise falls back to ref-field (or 0)
      const minPts = (criterion && criterion.minPoints != null && !isNaN(Number(criterion.minPoints)))
        ? Number(criterion.minPoints)
        : ((xlsm && xlsm.minPoints != null && !isNaN(Number(xlsm.minPoints))) ? Number(xlsm.minPoints) : 0);

      // maxPoints: crit-item-detail takes precedence if set, otherwise falls back to ref-field (or 1)
      const maxPtsRaw = (criterion && criterion.maxPoints != null && !isNaN(Number(criterion.maxPoints)))
        ? Number(criterion.maxPoints)
        : ((xlsm && xlsm.maxPoints != null && !isNaN(Number(xlsm.maxPoints))) ? Number(xlsm.maxPoints) : Math.max(minPts, 1));
      const maxPts = Math.max(minPts, maxPtsRaw);

      // interval: crit-item-detail takes precedence if set (>0), otherwise falls back to ref-field (or 0.5)
      const interval = (criterion && criterion.interval != null && !isNaN(Number(criterion.interval)) && Number(criterion.interval) > 0)
        ? Number(criterion.interval)
        : ((xlsm && xlsm.interval != null && !isNaN(Number(xlsm.interval)) && Number(xlsm.interval) > 0) ? Number(xlsm.interval) : 0.5);

      // coefficient: test criterion takes precedence (default 1)
      const coeff = (criterion && criterion.pointCoefficient != null && !isNaN(Number(criterion.pointCoefficient)))
        ? Math.max(0, Number(criterion.pointCoefficient))
        : 1;

      // grades, comments, colors: prioritize reference bank and merge cleanly
      const grades = normalizeCriterionGrades((criterion && Array.isArray(criterion.grades) && criterion.grades.length) ? criterion.grades : (xlsm && xlsm.grades));
      const comments = Object.assign({}, (xlsm && xlsm.comments) || {}, (criterion && criterion.comments) || {});
      const colors = Object.assign({}, (xlsm && xlsm.colors) || {}, (criterion && criterion.colors) || {});

      return {
        name,
        xlsm,
        minPoints: minPts,
        maxPoints: maxPts,
        interval,
        pointCoefficient: coeff,
        isBonus: !!(criterion && criterion.isBonus),
        showComment: criterion ? criterion.showComment !== false : true,
        grades,
        comments,
        colors
      };
    }

    /**
     * Resolve the grade key + colour for a criterion score, using the same chain as the
     * in-app criterion slider: custom criteria bank (test/class bank first) → criterion
     * colours → grading-scale colours → defaults. Returns { key, color } (color is a
     * normalised 6-digit hex when possible, so hex-alpha suffixes stay valid).
     */
    function resolveCriterionPointsColor(criterion, points, testConfig = null, classObj = null) {
      const resolved = resolveCriterionProps(criterion, testConfig, classObj);
      const minPts = (criterion && criterion.minPoints != null && !isNaN(Number(criterion.minPoints))) ? Number(criterion.minPoints) : resolved.minPoints;
      const maxPts = (criterion && criterion.maxPoints != null && !isNaN(Number(criterion.maxPoints))) ? Number(criterion.maxPoints) : resolved.maxPoints;
      const key = nearestCriterionGradeKey(resolved, null, points, minPts, maxPts);
      if (key == null) return { key: null, color: null };
      let color = lookupColorInMap(resolved.colors, key) ||
                  (resolved.xlsm && lookupColorInMap(resolved.xlsm.colors, key)) ||
                  lookupColorInMap(criterion && criterion.colors, key) ||
                  getScaleGradeColor(key, null, testConfig) ||
                  getDefaultGradeColor(key);
      if (typeof color === "string") {
        color = color.trim();
        const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
        if (m3) color = `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`;
      }
      return { key, color: color || null };
    }

    function getCriterionGradeStops(criterion, minPts, maxPts, testConfig = null, classObj = null) {
      const resolved = resolveCriterionProps(criterion, testConfig, classObj);
      const safeMin = minPts != null ? minPts : resolved.minPoints;
      const safeMax = maxPts != null ? maxPts : resolved.maxPoints;
      const ptsSpan = Math.max(0, safeMax - safeMin);
      const critInterval = resolved.interval;

      function getStopColorForPts(currentPts, ratio) {
        const key = nearestCriterionGradeKey(resolved, null, currentPts, safeMin, safeMax);
        if (key) {
          const col = lookupColorInMap(resolved.colors, key) ||
                      (resolved.xlsm && lookupColorInMap(resolved.xlsm.colors, key)) ||
                      lookupColorInMap(criterion && criterion.colors, key) ||
                      getScaleGradeColor(key);
          if (col) return col;
        }
        if (ratio <= 0.15) return "#ef4444";
        if (ratio <= 0.35) return "#f97316";
        if (ratio <= 0.55) return "#eab308";
        if (ratio <= 0.75) return "#84cc16";
        return "#10b981";
      }

      const stops = [];
      const numSteps = ptsSpan > 0 ? Math.round(ptsSpan / critInterval) : 0;
      
      let stepJump = critInterval;
      if (numSteps > 20) stepJump = critInterval * Math.ceil(numSteps / 6);
      else if (numSteps > 10) stepJump = critInterval * 2;

      for (let pts = safeMin; pts <= safeMax + 1e-4; pts += stepJump) {
        const currentPts = Math.min(safeMax, Number(pts.toFixed(2)));
        const ratio = ptsSpan > 0 ? (currentPts - safeMin) / ptsSpan : 0;
        const color = getStopColorForPts(currentPts, ratio);
        const key = nearestCriterionGradeKey(resolved, null, currentPts, safeMin, safeMax);
        stops.push({
          key: fmtN(currentPts),
          label: fmtN(currentPts),
          gradeKey: key,
          value: currentPts,
          color,
          ratio: Math.max(0, Math.min(1, ratio)),
          ptsValue: currentPts
        });
        if (currentPts >= safeMax) break;
      }
      if (stops.length === 0 || stops[stops.length - 1].ptsValue < safeMax) {
        const color = getStopColorForPts(safeMax, 1.0);
        const key = nearestCriterionGradeKey(resolved, null, safeMax, safeMin, safeMax);
        stops.push({
          key: fmtN(safeMax),
          label: fmtN(safeMax),
          gradeKey: key,
          value: safeMax,
          color,
          ratio: 1.0,
          ptsValue: safeMax
        });
      }
      return stops;
    }

    function buildCriterionSliderGradient(criterion, minPts, maxPts, testConfig = null, classObj = null) {
      const stops = getCriterionGradeStops(criterion, minPts, maxPts, testConfig, classObj);
      if (!stops.length) return "linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)";
      if (stops.length === 1) return stops[0].color;

      const gradientStops = stops.map(s => `${s.color} ${(s.ratio * 100).toFixed(1)}%`);
      return `linear-gradient(to right, ${gradientStops.join(", ")})`;
    }

    function parseCriterionGrades(value) {
      if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(Boolean);
      }
      return String(value || "")
        .split(/[;,\n]/)
        .map(v => v.trim())
        .filter(Boolean);
    }

    function normalizeCriterionGrades(value) {
      const grades = parseCriterionGrades(value);
      return grades.length ? grades : DEFAULT_CRITERION_GRADES.slice();
    }

    function nearestCriterionGradeKey(criterionOrGrades, grade, points, minPts, maxPts) {
      let rawGrades = null;
      let refMinPts = minPts;
      let refMaxPts = maxPts;
      if (Array.isArray(criterionOrGrades)) {
        rawGrades = criterionOrGrades;
      } else if (criterionOrGrades && typeof criterionOrGrades === "object") {
        rawGrades = (Array.isArray(criterionOrGrades.grades) && criterionOrGrades.grades.length)
          ? criterionOrGrades.grades
          : (criterionOrGrades.xlsm && Array.isArray(criterionOrGrades.xlsm.grades) && criterionOrGrades.xlsm.grades.length ? criterionOrGrades.xlsm.grades : null);
        if (refMinPts == null && criterionOrGrades.minPoints != null) refMinPts = criterionOrGrades.minPoints;
        if (refMaxPts == null && criterionOrGrades.maxPoints != null) refMaxPts = criterionOrGrades.maxPoints;
        if (!rawGrades && criterionOrGrades.name) {
          const ref = findMatchingReferenceCriterion(criterionOrGrades.name);
          if (ref && Array.isArray(ref.grades) && ref.grades.length) rawGrades = ref.grades;
        }
      }
      const available = normalizeCriterionGrades(rawGrades);
      if (!available.length) return null;

      const numeric = available
        .map(key => ({ key, value: toNumber(key) }))
        .filter(entry => entry.value != null)
        .sort((a, b) => b.value - a.value);

      if (!numeric.length) {
        if (points != null && refMinPts != null && refMaxPts != null) {
          const p = Number(points);
          const span = Math.max(0, refMaxPts - refMinPts);
          const ratio = span > 0 ? Math.max(0, Math.min(1, (p - refMinPts) / span)) : 0;
          const idx = Math.min(available.length - 1, Math.max(0, Math.floor((1 - ratio) * available.length)));
          return available[idx];
        }
        return available[0] || null;
      }

      const maxKey = numeric[0].value;
      const minKey = numeric[numeric.length - 1].value;
      const keySpan = Math.max(0, maxKey - minKey);

      const safeMinPts = refMinPts != null ? Number(refMinPts) : minKey;
      const safeMaxPts = refMaxPts != null ? Number(refMaxPts) : maxKey;
      const ptsSpan = Math.max(0, safeMaxPts - safeMinPts);

      if (points != null) {
        const p = Number(points);
        // Direct match if point scale aligns with criterion levels (e.g. 1.5 - 6 or 0 - 6):
        if (Math.abs(safeMaxPts - maxKey) < 1e-4 && (Math.abs(safeMinPts - minKey) < 1e-4 || safeMinPts <= minKey)) {
          for (const entry of numeric) {
            if (p >= entry.value - 1e-4) return entry.key;
          }
          return numeric[numeric.length - 1].key;
        }
        // Proportional threshold mapping across [safeMinPts, safeMaxPts]:
        for (let i = 0; i < numeric.length; i++) {
          const entry = numeric[i];
          const levelRatio = keySpan > 0 ? (entry.value - minKey) / keySpan : ((numeric.length - 1 - i) / (numeric.length - 1));
          const levelPts = safeMinPts + levelRatio * ptsSpan;
          if (p >= levelPts - 1e-4) return entry.key;
        }
        return numeric[numeric.length - 1].key;
      }

      if (grade != null) {
        const g = Number(grade);
        for (const entry of numeric) {
          if (g >= entry.value - 1e-4) return entry.key;
        }
        return numeric[numeric.length - 1].key;
      }

      return available[available.length - 1] || null;
    }

    function loadReferenceDataOverrides() {
      const isElectron = window.Desktop && typeof Desktop.isElectron === "function" && Desktop.isElectron();

      // In Electron, files loaded from disk (user/correction-criteria.js, user/grade-scale-models.js)
      // are the source of truth. localStorage is only used as a fallback for browser mode or when files are empty.
      if (!isElectron || typeof XLSM_CRITERIA === "undefined" || !Array.isArray(XLSM_CRITERIA) || XLSM_CRITERIA.length === 0) {
        try {
          const critRaw = localStorage.getItem(REFERENCE_CRITERIA_STORAGE_KEY);
          if (critRaw) {
            const parsed = JSON.parse(critRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (typeof XLSM_CRITERIA === "undefined" || !Array.isArray(XLSM_CRITERIA)) {
                window.XLSM_CRITERIA = [];
              }
              XLSM_CRITERIA.splice(0, XLSM_CRITERIA.length, ...parsed);
            }
          }
        } catch (err) {
          console.warn("Could not load saved correction criteria", err);
        }
      }

      if (!isElectron || typeof XLSM_SCALE_MODELS === "undefined" || !Array.isArray(XLSM_SCALE_MODELS) || XLSM_SCALE_MODELS.length === 0) {
        try {
          const scaleRaw = localStorage.getItem(REFERENCE_SCALE_MODELS_STORAGE_KEY);
          if (scaleRaw) {
            const parsed = JSON.parse(scaleRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (typeof XLSM_SCALE_MODELS === "undefined" || !Array.isArray(XLSM_SCALE_MODELS)) {
                window.XLSM_SCALE_MODELS = [];
              }
              XLSM_SCALE_MODELS.splice(0, XLSM_SCALE_MODELS.length, ...parsed);
            }
          }
        } catch (err) {
          console.warn("Could not load saved scale models", err);
        }
      }

      if (!isElectron || typeof OBSERVATION_CHECKLIST_GROUPS === "undefined" || !Array.isArray(OBSERVATION_CHECKLIST_GROUPS) || OBSERVATION_CHECKLIST_GROUPS.length === 0) {
        try {
          const chipsRaw = localStorage.getItem(REFERENCE_PERSONALISED_CHIPS_STORAGE_KEY);
          if (chipsRaw) {
            const parsed = JSON.parse(chipsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              window.OBSERVATION_CHECKLIST_GROUPS = parsed;
            }
          }
        } catch (err) {
          console.warn("Could not load saved personalised chips", err);
        }
      }
    }


    // ── Student modal ─────────────────────────────────────────────
    let _studentModalDraft = null;


    function esc(value) {
      return escapeHtml(value);
    }

    function escapeHtml(value) {
      if (value == null) return '';
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    // ── Markdown helpers ──────────────────────────────────────────────────────
    function renderMd(text) {
      if (!text || !window.marked || typeof marked.parse !== 'function') return escapeHtml(String(text || ''));
      return marked.parse(String(text)).replace(new RegExp('<script[^>]*>[\\s\\S]*?<\\/script>', 'gi'), '');
    }

    function buildMdEditorWidget(id, value, placeholder, rows) {
      rows = rows || 3;
      const wrap = document.createElement('div');
      wrap.className = 'md-field-wrap';
      const toggleRow = document.createElement('div');
      toggleRow.className = 'md-toggle-row';
      const writeBtn = document.createElement('button');
      writeBtn.type = 'button';
      writeBtn.className = 'md-toggle-btn active';
      writeBtn.textContent = t('mdbMdWrite', 'Write');
      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'md-toggle-btn';
      previewBtn.textContent = t('mdbMdPreview', 'Preview');
      toggleRow.appendChild(writeBtn);
      toggleRow.appendChild(previewBtn);
      const ta = document.createElement('textarea');
      ta.id = id || '';
      ta.className = 'md-textarea';
      ta.value = value || '';
      ta.rows = rows;
      if (placeholder) ta.placeholder = placeholder;
      const preview = document.createElement('div');
      preview.className = 'md-preview-pane hidden';
      writeBtn.addEventListener('click', function() {
        writeBtn.classList.add('active'); previewBtn.classList.remove('active');
        ta.classList.remove('hidden'); preview.classList.add('hidden'); ta.focus();
      });
      previewBtn.addEventListener('click', function() {
        previewBtn.classList.add('active'); writeBtn.classList.remove('active');
        preview.innerHTML = renderMd(ta.value || '');
        ta.classList.add('hidden'); preview.classList.remove('hidden');
      });
      wrap.appendChild(toggleRow); wrap.appendChild(ta); wrap.appendChild(preview);
      return wrap;
    }


    // ── Custom modal helpers (replace native alert/confirm/prompt) ──────────
    function showAlert(message) {
      return new Promise(resolve => {
        const overlay = document.getElementById('gs-alert-overlay');
        document.getElementById('gs-alert-message').textContent = message;
        overlay.classList.remove('hidden');
        const ok = document.getElementById('gs-alert-ok');
        let unreg = null;
        function done() {
          if (unreg) { unreg(); unreg = null; }
          overlay.classList.add('hidden');
          ok.removeEventListener('click', done);
          document.removeEventListener('keydown', onKey, true);
          resolve();
        }
        function onKey(e) {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            done();
          }
        }
        if (window.cmtPushEscapeHandler) {
          unreg = window.cmtPushEscapeHandler(done);
        }
        ok.addEventListener('click', done);
        document.addEventListener('keydown', onKey, true);
        ok.focus();
      });
    }

    function showConfirm(message) {
      return new Promise(resolve => {
        const overlay = document.getElementById('gs-confirm-overlay');
        document.getElementById('gs-confirm-message').textContent = message;
        overlay.classList.remove('hidden');
        const okBtn = document.getElementById('gs-confirm-ok');
        const cancelBtn = document.getElementById('gs-confirm-cancel');
        let unreg = null;
        function done(result) {
          if (unreg) { unreg(); unreg = null; }
          overlay.classList.add('hidden');
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          overlay.removeEventListener('click', onOverlay);
          document.removeEventListener('keydown', onKey, true);
          resolve(result);
        }
        function onOk() { done(true); }
        function onCancel() { done(false); }
        function onOverlay(e) { if (e.target === overlay) done(false); }
        function onKey(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            done(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            done(false);
          }
        }
        if (window.cmtPushEscapeHandler) {
          unreg = window.cmtPushEscapeHandler(() => done(false));
        }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onKey, true);
        cancelBtn.focus();
      });
    }

    function showPrompt(message, defaultValue = '') {
      return new Promise(resolve => {
        const overlay = document.getElementById('gs-prompt-overlay');
        document.getElementById('gs-prompt-message').textContent = message;
        const input = document.getElementById('gs-prompt-input');
        input.value = defaultValue;
        overlay.classList.remove('hidden');
        const okBtn = document.getElementById('gs-prompt-ok');
        const cancelBtn = document.getElementById('gs-prompt-cancel');
        let unreg = null;
        function done(result) {
          if (unreg) { unreg(); unreg = null; }
          overlay.classList.add('hidden');
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          overlay.removeEventListener('click', onOverlay);
          input.removeEventListener('keydown', onKey);
          document.removeEventListener('keydown', onDocKey, true);
          resolve(result);
        }
        function onOk() { done(input.value); }
        function onCancel() { done(null); }
        function onOverlay(e) { if (e.target === overlay) done(null); }
        function onKey(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            done(input.value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            done(null);
          }
        }
        function onDocKey(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            done(null);
          }
        }
        if (window.cmtPushEscapeHandler) {
          unreg = window.cmtPushEscapeHandler(() => done(null));
        }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlay);
        input.addEventListener('keydown', onKey);
        document.addEventListener('keydown', onDocKey, true);
        setTimeout(() => { input.focus(); input.select(); }, 30);
      });
    }

    // ── Import grades from JSON ────────────────────────────────────
