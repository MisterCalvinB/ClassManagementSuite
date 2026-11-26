    let _gsPdfExportModalCallback = null;
    function closeGsPdfExportModal(choice = null) {
      const overlay = document.getElementById("gs-pdf-export-overlay");
      if (overlay) overlay.classList.add("hidden");
      const fitEl = document.getElementById("gs-pdf-export-fit-page");
      if (fitEl) setReportFitToOnePage(fitEl.checked);
      const cb = _gsPdfExportModalCallback;
      _gsPdfExportModalCallback = null;
      if (cb) cb(choice);
    }

    function openGsPdfExportModal() {
      const titleEl = document.getElementById("gs-pdf-export-title");
      const textEl = document.getElementById("gs-pdf-export-text");
      const toPrintBtn = document.getElementById("gs-btn-pdf-export-to-print");
      const pickerBtn = document.getElementById("gs-btn-pdf-export-picker");
      const fitEl = document.getElementById("gs-pdf-export-fit-page");
      if (titleEl) titleEl.textContent = t('deExportPdfDestinationTitle') || 'Export PDF';
      if (textEl) textEl.textContent = t('deExportPdfDestinationPrompt') || 'Where do you want to save the PDF?';
      if (toPrintBtn) toPrintBtn.textContent = t('deExportPdfToPrintFolder') || 'Export to Print folder';
      if (pickerBtn) pickerBtn.textContent = t('deExportPdfFilePicker') || 'Choose with file picker';
      if (fitEl) fitEl.checked = getReportFitToOnePage();

      if (_gsPdfExportModalCallback) _gsPdfExportModalCallback(null);

      const customRootsContainer = document.getElementById("gs-pdf-export-custom-roots");
      if (customRootsContainer && typeof window.cmtBindExportRootsInModal === 'function') {
        window.cmtBindExportRootsInModal(customRootsContainer, function (dest) {
          closeGsPdfExportModal(dest);
        }, { compact: true, buttonClass: 'btn', newBtnClass: 'btn' });
      }

      return new Promise(resolve => {
        _gsPdfExportModalCallback = resolve;
        const overlay = document.getElementById("gs-pdf-export-overlay");
        if (overlay) overlay.classList.remove("hidden");
        setTimeout(() => {
          if (toPrintBtn) toPrintBtn.focus();
        }, 0);
      });
    }

    function calcTestExerciseClassStats(classObj, sem, testIndex, config) {
      const criteriaStats = {};
      const studentTotalScoredList = [];

      (config.criteria || []).forEach(cr => {
        const scoredList = [];
        (classObj.students || []).forEach(s => {
          const entry = s.criteriaResults && s.criteriaResults[sem] && s.criteriaResults[sem][testIndex] && s.criteriaResults[sem][testIndex][cr.id];
          if (entry && entry.points != null && !isNaN(Number(entry.points))) {
            scoredList.push(Number(entry.points));
          }
        });
        const avgPts = scoredList.length ? (scoredList.reduce((a, b) => a + b, 0) / scoredList.length) : null;
        criteriaStats[cr.id] = {
          avgPts,
          count: scoredList.length,
          maxPts: cr.maxPoints
        };
      });

      (classObj.students || []).forEach(s => {
        const cMap = (s.criteriaResults && s.criteriaResults[sem] && s.criteriaResults[sem][testIndex]) || {};
        const t = calcCriteriaTotals(config, cMap);
        if ((t.totalScored != null && !isNaN(t.totalScored)) || (t.totalBonusScored != null && !isNaN(t.totalBonusScored))) {
          const scored = (t.totalScored || 0) + (t.totalBonusScored || 0);
          studentTotalScoredList.push(scored);
        }
      });

      const classMeanTotalScored = studentTotalScoredList.length
        ? (studentTotalScoredList.reduce((a, b) => a + b, 0) / studentTotalScoredList.length)
        : null;

      return { criteriaStats, classMeanTotalScored };
    }

    async function printTestResults() {
      const esc = escapeHtml;
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      const sem = appState.activeTest.semester;
      const testIndex = appState.activeTest.testIndex;
      const testNo = testIndex + 1;
      const config = getTestConfig(classObj, sem, testIndex);
      const defaultTotals = calcCriteriaTotals(config, {});
      const incMeans = getReportIncludeExerciseMeans();
      const { criteriaStats, classMeanTotalScored } = calcTestExerciseClassStats(classObj, sem, testIndex, config);

      let destination = null;
      if (window.Desktop && Desktop.isElectron()) {
        destination = await openGsPdfExportModal();
        if (!destination) return;
      }

      const pdfSettings = getPdfExportSettings();
      const pageSize = pdfSettings.pageSize || 'A4';
      const isLandscape = pdfSettings.isLandscape;
      const orientation = isLandscape ? 'landscape' : 'portrait';
      const margin = pdfSettings.margin || '18mm 18mm 15mm 18mm';
      const fitToOnePage = getReportFitToOnePage();

      const pageCSS = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Lexend', Arial, Helvetica, sans-serif; font-size: ${fitToOnePage ? '10px' : '13px'}; color: #111; background: #fff; line-height: ${fitToOnePage ? '1.25' : '1.4'}; }
        .student-page {
          width: ${isLandscape ? '297mm' : '210mm'};
          min-height: ${isLandscape ? '210mm' : '297mm'};
          ${fitToOnePage ? `max-height: ${isLandscape ? '210mm' : '297mm'}; overflow: hidden;` : ''}
          padding: ${fitToOnePage ? '6mm 9mm 5mm 9mm' : margin};
          page-break-after: always;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          gap: ${fitToOnePage ? '6px' : '14px'};
        }
        @page { size: ${pageSize} ${orientation}; margin: ${fitToOnePage ? '6mm 9mm 5mm 9mm' : margin}; }
        @media print {
          body { background: #fff; margin: 0; padding: 0; }
          .student-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 5px 6px 0 !important;
            margin: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box !important;
          }
        }
        .page-header {
          border-bottom: 2.5px solid #111;
          padding-bottom: ${fitToOnePage ? '4px' : '8px'};
          margin-bottom: ${fitToOnePage ? '2px' : '4px'};
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .student-name { font-size: ${fitToOnePage ? '15px' : '18px'}; font-weight: 800; color: #111; }
        .test-label { font-size: ${fitToOnePage ? '11px' : '13px'}; color: #111; font-weight: 600; }
        .test-meta { font-size: ${fitToOnePage ? '9.5px' : '11px'}; color: #555; margin-top: 1px; }
        .grade-badge {
          font-size: ${fitToOnePage ? '18px' : '24px'};
          font-weight: 800;
          color: #111;
          border: 2.5px solid #111;
          border-radius: 6px;
          padding: ${fitToOnePage ? '2px 10px' : '4px 14px'};
          white-space: nowrap;
          background: #f0f0f0;
          box-shadow: ${fitToOnePage ? '2px 2px 0 #111' : '3px 3px 0 #111'};
        }
        .section-title {
          font-size: ${fitToOnePage ? '10px' : '12px'};
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #111;
          border-bottom: 2px solid #111;
          padding-bottom: 2px;
          margin-bottom: ${fitToOnePage ? '3px' : '6px'};
        }
        table { width: 100%; border-collapse: collapse; font-size: ${fitToOnePage ? '9.5px' : '12px'}; border: 2px solid #111; }
        th {
          background: #f0f0f0;
          font-weight: 800;
          text-align: left;
          padding: ${fitToOnePage ? '3px 6px' : '6px 8px'};
          border: 1.5px solid #111;
          color: #111;
        }
        td { padding: ${fitToOnePage ? '3px 6px' : '6px 8px'}; border: 1.5px solid #111; vertical-align: top; color: #111; }
        .pts-cell { text-align: right; white-space: nowrap; font-weight: 700; }
        .total-row td { font-weight: 800; background: #f0f0f0; border-top: 2px solid #111; font-size: ${fitToOnePage ? '9px' : '11px'}; }
        .obs-section { margin-bottom: ${fitToOnePage ? '4px' : '8px'}; }
        .obs-label {
          font-size: ${fitToOnePage ? '10px' : '11.5px'};
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #111;
          margin-bottom: 1px;
        }
        .obs-category-span {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px;
          margin: 0 4px 0 0;
          vertical-align: middle;
        }
        .obs-category-tag {
          font-size: ${fitToOnePage ? '8px' : '10px'};
          font-weight: 800;
          text-transform: none;
          letter-spacing: 0.02em;
          color: #333333;
          margin-right: 2px;
          white-space: nowrap;
        }
        .obs-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          margin-top: 1px;
          margin-bottom: 2px;
        }
        .obs-pill,
        .obs-feedback .obs-pill,
        .obs-section .obs-pill {
          display: inline-block;
          padding: ${fitToOnePage ? '0.5px 3.5px' : '1px 4px'};
          border-radius: 4px;
          font-size: ${fitToOnePage ? '8px' : '9px'};
          font-weight: 700;
          line-height: 1.15;
          margin: 1px 3px 1px 0;
          background: transparent !important;
          box-shadow: none !important;
        }
        .obs-pill-good {
          color: #166534;
          border: 0.5px dotted #16a34a;
        }
        .obs-pill-remedy {
          color: #991b1b;
          border: 0.5px dotted #dc2626;
        }
        .obs-pill-custom {
          color: #0369a1;
          border: 0.5px dotted #0284c7;
        }
        .obs-pill-multiplier {
          font-size: 0.68em;
          font-weight: 800;
          line-height: 0;
          vertical-align: super;
          margin-left: 2px;
          margin-right: 3px;
          display: inline-block;
          white-space: nowrap;
        }
        .obs-pill-num {
          font-weight: 800;
          margin-right: 2px;
          opacity: 0.95;
        }
        .obs-feedback {
          display: inline;
          padding: 0;
          background: transparent;
          border: none;
          font-size: ${fitToOnePage ? '8.5px' : '9.5px'};
          line-height: ${fitToOnePage ? '1.2' : '1.35'};
          color: #1e293b;
        }
        .obs-feedback-body {
          display: inline;
          white-space: normal;
        }
        .obs-feedback-body p {
          display: inline;
          margin: 0;
        }
        .obs-feedback-body p:last-child {
          margin-bottom: 0;
        }
        .obs-text { font-size: ${fitToOnePage ? '10.5px' : '13px'}; line-height: 1.4; white-space: normal; color: #111; }
        .no-data { color: #888; font-size: ${fitToOnePage ? '9.5px' : '12px'}; }
        .scale-wrap { margin-top: ${fitToOnePage ? '1px' : '2px'}; }
        .scale-table { font-size: ${fitToOnePage ? '8.5px' : '10px'}; border-collapse: collapse; width: 100%; border: 1.5px solid #111; }
        .scale-table th, .scale-table td { padding: ${fitToOnePage ? '2px 4px' : '3px 5px'}; border: 1.5px solid #111; text-align: center; white-space: nowrap; color: #111; }
        .scale-table thead th { background: #f0f0f0; font-weight: 800; }
        .scale-table .row-label { background: #f0f0f0; font-weight: 800; text-align: left; }
        .scale-grade-pass { font-weight: 800; color: #111; }
        @media print {
          body { margin: 0; }
          .student-page { page-break-after: always; }
        }
      `;

      // Build grading scale section (shared across all pages)
      const scaleModel = (typeof getScaleModel === "function" && config.grading && config.grading.modelKey) ? getScaleModel(config.grading.modelKey) : null;
      const thresholds = getThresholds(config);
      const scaleGradeHeaders = thresholds.map(t => {
        const color = (scaleModel && scaleModel.colors && scaleModel.colors[String(t.grade)]) || getScaleGradeColor(t.grade);
        const textColor = getHighContrastTextColor(color);
        const passMark = t.grade === 4 ? `*` : ``;
        return `<th><span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${color}20;color:${textColor};border:1px solid ${color};font-weight:800;">${t.grade}${passMark}</span></th>`;
      }).join("");
      const scalePctCells = thresholds.map(t =>
        `<td>${Math.round(t.ratio * 100)}%</td>`
      ).join("");
      const scalePtsRow = defaultTotals.totalPossible > 0
        ? `<tr><td class="row-label">${t('gsReportMinPts') || 'Min pts'} (/${fmtN(defaultTotals.totalPossible)})</td>${thresholds.map(t => `<td>${fmtN(t.ratio * defaultTotals.totalPossible)}</td>`).join("")}</tr>`
        : "";
      const scaleHtml = `<div class="scale-wrap">
        <div class="section-title">${t('gsReportSectionGradingScale') || 'Grading Scale'}</div>
        <table class="scale-table">
          <thead><tr><th></th>${scaleGradeHeaders}</tr></thead>
          <tbody>
            <tr><td class="row-label">${t('gsReportMinPct') || 'Min %'}</td>${scalePctCells}</tr>
            ${scalePtsRow}
          </tbody>
        </table>
      </div>`;

      const pages = classObj.students.filter(student => {
        if (config.criteria.length === 0) return true;
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        return config.criteria.every(cr => {
          const entry = criteriaMap[cr.id];
          return entry != null && entry.points != null;
        });
      }).map(student => {
        const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
        const grade = sourceArray[testIndex];
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        const totals = calcCriteriaTotals(config, criteriaMap);
        const noteArray = student.testNotes[sem];
        const notes = Array.isArray(noteArray[testIndex]) ? noteArray[testIndex] : [];

        // Criteria table
        let criteriaHtml = "";
        if (config.criteria.length > 0) {
          const rows = config.criteria.map(cr => {
            const entry = criteriaMap[cr.id] || { points: null, comment: "" };
            const pts = entry.points;
            const ptsStr = pts != null ? `${fmtN(pts)} / ${fmtN(cr.maxPoints)}` : `— / ${fmtN(cr.maxPoints)}`;
            const comment = entry.comment ? esc(entry.comment) : `<span class="no-data">—</span>`;
            const { key, color: critColor } = resolveCriterionPointsColor(cr, pts, config, classObj);
            const cTextColor = getHighContrastTextColor(critColor);
            const gradeBadge = (pts != null && key != null && critColor)
              ? `<span style="display:inline-block;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px;margin-right:6px;background:${critColor}20;color:${cTextColor};border:1px solid ${critColor};">${esc(key)}</span>`
              : "";
            let ptsDisplay = "";
            if (pts != null) {
              const scoredSpan = critColor
                ? `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${critColor}18;color:${cTextColor};font-weight:800;">${esc(fmtN(pts))}</span>`
                : `<span style="font-weight:800;color:#111;">${esc(fmtN(pts))}</span>`;
              ptsDisplay = `${scoredSpan} <span style="color:#111;font-weight:600;">/ ${esc(fmtN(cr.maxPoints))}</span>`;
            } else {
              ptsDisplay = `<span style="color:#888;">—</span> <span style="color:#111;font-weight:600;">/ ${esc(fmtN(cr.maxPoints))}</span>`;
            }
            let compBadges = "";
            const effCompIds = getCriterionEffectiveCompetenceIds(cr, classObj, config);
            if (getReportIncludeCompetences() && effCompIds.length > 0) {
              compBadges = '<div style="margin-top:2px;">' + effCompIds.map(cid => {
                const c = findLessonCompetence(cid);
                const label = c ? (c.code || c.title || cid) : cid;
                return `<span style="display:inline-block;background:#0284c7;color:#fff;border-radius:3px;padding:0px 4px;font-size:9px;font-weight:700;margin-right:3px;">${esc(label)}</span>`;
              }).join('') + '</div>';
            }
            const stat = criteriaStats[cr.id];
            const meanPts = (stat && stat.avgPts != null) ? fmtN(stat.avgPts) : null;
            const meanPtsStr = meanPts != null ? `${meanPts} / ${fmtN(cr.maxPoints)}` : `— / ${fmtN(cr.maxPoints)}`;
            if (incMeans) {
              return `<tr>
                <td>${esc(cr.name)}${compBadges}</td>
                <td class="pts-cell">${ptsDisplay}</td>
                <td class="pts-cell" style="font-weight:700;color:#475569;">${esc(meanPtsStr)}</td>
                <td>${comment}</td>
              </tr>`;
            }
            return `<tr>
              <td>${esc(cr.name)}${compBadges}</td>
              <td class="pts-cell">${ptsDisplay}</td>
              <td>${comment}</td>
            </tr>`;
          }).join("");
          const bonusText = (totals.totalBonusScored && totals.totalBonusScored > 0) ? ` (+${fmtN(totals.totalBonusScored)} bonus)` : "";
          const displayedScored = fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0));
          const totalPtsStr = totals.totalPossible > 0
            ? `${displayedScored} / ${fmtN(totals.totalPossible)}${bonusText}`
            : "—";
          const displayedMeanTotal = classMeanTotalScored != null ? fmtN(classMeanTotalScored) : "—";
          const totalMeanStr = defaultTotals.totalPossible > 0 ? `${displayedMeanTotal} / ${fmtN(defaultTotals.totalPossible)}` : "—";

          if (incMeans) {
            criteriaHtml = `
              <div>
                <div class="section-title">${t('gsReportSectionCriteria') || 'Criteria'}</div>
                <table>
                  <thead><tr><th style="width:22%">${t('gsCriteriaLabelName') || 'Criterion'}</th><th class="pts-cell" style="width:12%">${t('gsGradingManualPts') || 'Points'}</th><th class="pts-cell" style="width:12%">${t('gsReportClassMeanHeader') || 'Class Mean'}</th><th>${t('gsColComments') || 'Comment'}</th></tr></thead>
                  <tbody>
                    ${rows}
                    <tr class="total-row">
                      <td>${t('gsTotal') || 'Total'}</td>
                      <td class="pts-cell">${esc(totalPtsStr)}</td>
                      <td class="pts-cell" style="color:#475569;">${esc(totalMeanStr)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>`;
          } else {
            criteriaHtml = `
              <div>
                <div class="section-title">${t('gsReportSectionCriteria') || 'Criteria'}</div>
                <table>
                  <thead><tr><th style="width:24%">${t('gsCriteriaLabelName') || 'Criterion'}</th><th class="pts-cell" style="width:14%">${t('gsGradingManualPts') || 'Points'}</th><th>${t('gsColComments') || 'Comment'}</th></tr></thead>
                  <tbody>
                    ${rows}
                    <tr class="total-row">
                      <td>${t('gsTotal') || 'Total'}</td>
                      <td class="pts-cell">${esc(totalPtsStr)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>`;
          }
        }

        // Observations
        let obsHtml = "";
        if (notes.length > 0 && notes.some(s => sectionHasContent(s))) {
          const remarkAllocator = createRemarkNumberAllocator(notes);
          const blocks = notes.filter(s => sectionHasContent(s)).map(s => renderObservationSectionHtml(s, (config && config.chipBank) || (classObj && classObj.chipBank), remarkAllocator)).join("");
          obsHtml = `<div><div class="section-title">${t('gsReportObservationsFeedback') || t('gsColObservations') || 'Observations & Teacher Feedback'}</div>${blocks}</div>`;
        }

        const gradeDisplay = grade != null ? String(grade) : "—";
        const gradeColorVal = grade != null ? ((scaleModel && scaleModel.colors && scaleModel.colors[String(grade)]) || getScaleGradeColor(grade)) : '#111';
        const gradeTextColor = getHighContrastTextColor(gradeColorVal);
        const gradeBadgeStyle = grade != null
          ? `style="border-color:${gradeColorVal}; color:${gradeTextColor}; background:${gradeColorVal}18; box-shadow: 3px 3px 0 ${gradeColorVal};"`
          : "";
        const fullName = esc(window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function' ? StudentNameUtils.formatStudentName(student, getGsNameDisplayMode()) : (student.firstName + " " + student.lastName).trim());
        const testLabel = esc(`${classObj.name} — ${sem.toUpperCase()} — Test T${testNo}`);
        const metaParts = [];
        if (config.testDate) metaParts.push(esc(config.testDate));
        if (config.scope) metaParts.push(esc(config.scope));
        if (config.type) metaParts.push(esc(config.type));
        const metaHtml = metaParts.length ? `<div class="test-meta">${metaParts.join(" &nbsp;·&nbsp; ")}</div>` : "";

        return `<div class="student-page">
          <div class="page-header">
            <div>
              <div class="student-name">${fullName}</div>
              <div class="test-label">${testLabel}</div>
              ${metaHtml}
            </div>
            <div class="grade-badge" ${gradeBadgeStyle}>${t('gsColGrade') || 'Grade'}: ${esc(gradeDisplay)}</div>
          </div>
          ${criteriaHtml}
          ${obsHtml}
          ${scaleHtml}
          <div class="student-page-footer exp-footer" style="margin-top:16px;padding-top:6px;border-top:1px solid #333333;display:flex;align-items:center;justify-content:space-between;font-size:8pt;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;page-break-inside:avoid;break-inside:avoid;">
            <span class="exp-footer-left">${testLabel}</span>
            ${(typeof window.getAppTeacherName === 'function' && window.getAppTeacherName()) ? `<span class="exp-footer-center" style="font-weight:700;color:#222;">${esc(window.getAppTeacherName())}</span>` : ''}
            <span class="exp-footer-right">${new Date().toLocaleDateString()}</span>
          </div>
        </div>`;
      }).join("");

      if (!pages) { await showAlert(t('gsAlertNoStudentsCriteria')); return; }

      const autoScaleScript = (typeof getReportAutoScaleScript === 'function') ? getReportAutoScaleScript(isLandscape, fitToOnePage) : '';
      let htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('gsReportTestResultsTitle') || 'Results'} — ${esc(classObj.name)} ${esc(sem.toUpperCase())} T${testNo}</title><style>${pageCSS}</style></head><body>${pages}${autoScaleScript}</body></html>`;
      if (window.ExportStylesService) {
        const sId = ExportStylesService.getSelectedStyle('gradeSheet');
        htmlDoc = await ExportStylesService.injectStyleIntoHtml(htmlDoc, sId, 'gradeSheet');
      }
      if (window.Desktop && Desktop.isElectron()) {
        try {
          let defaultName = `${slugifyForPath(classObj.name || "class")}-${sem}-t${testNo}-${new Date().toISOString().slice(0, 10)}.pdf`;
          const gsTarget = window.cmtResolveExportTarget ? window.cmtResolveExportTarget(destination) : (destination === 'to-print' ? 'toPrint' : null);
          if (gsTarget && window.resolveExportFilenameConflict) {
            const conflictRes = await window.resolveExportFilenameConflict({ filename: defaultName, target: gsTarget });
            if (!conflictRes || conflictRes.canceled) return;
            defaultName = conflictRes.filename || defaultName;
          }
          const pdfReq = {
            html: htmlDoc,
            landscape: isLandscape,
            pdfOptions: {
              pageSize: pageSize,
              landscape: isLandscape,
              margins: parseCssMarginToInches(fitToOnePage ? '6mm 9mm 5mm 9mm' : margin)
            }
          };
          if (gsTarget) {
            pdfReq.target = gsTarget;
            pdfReq.filename = defaultName;
          } else {
            pdfReq.defaultName = defaultName;
          }
          const res = await Desktop.printPdf(pdfReq);
          if (res && res.ok) {
            showToast(
              destination === 'to-print'
                ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (res.name || defaultName))
                : (t('deExportPdfSuccess') || 'PDF exported')
            );
            if (window.showExportSuccessPopup && res.path) {
              showExportSuccessPopup(res.path, res.name || defaultName);
            }
            return;
          } else if (res && !res.ok && !res.canceled) {
            await showAlert(t('gsAlertPrintFailed') + (res && (res.failureReason || res.error) ? (res.failureReason || res.error) : 'unknown'));
          }
          return;
        } catch (e) {
          console.error('Electron print failed', e);
          await showAlert(t('gsAlertPrintFailed') + (e && e.message ? e.message : String(e)));
          return;
        }
      }

      const win = window.open("", "_blank");
      if (!win) { await showAlert(t('gsAlertPopupBlocked')); return; }
      win.document.write(htmlDoc);
      win.document.close();
      win.focus();
      win.print();
    }

    function buildSemesterReportData(classObj, sem) {
      ensureClassStructures(classObj);
      const semLabel = sem === "sem1" ? t('gsSem1') : t('gsSem2');
      const n = classObj.testCounts[sem];

      function stats(values) {
        const v = values.filter(x => x != null);
        if (!v.length) return { avg: null, min: null, max: null, median: null };
        v.sort((a, b) => a - b);
        const avg = v.reduce((a, b) => a + b, 0) / v.length;
        const mid = Math.floor(v.length / 2);
        const median = v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid];
        return { avg, min: v[0], max: v[v.length - 1], median };
      }

      const rows = classObj.students.map(student => {
        const grades = Array.from({ length: n }, (_, i) => getTestDisplayGrade(student, classObj, sem, i));
        const c = computeStudent(student, classObj);
        const semAvg = sem === "sem1" ? c.sem1Avg : c.sem2Avg;
        return { student, grades, semAvg };
      });

      const testStats = Array.from({ length: n }, (_, i) => stats(rows.map(r => r.grades[i])));
      const semAvgStats = stats(rows.map(r => r.semAvg));
      const testNames = Array.from({ length: n }, (_, i) => {
        const cfg = classObj.testConfigs[sem][i];
        return cfg.testName ? String(cfg.testName) : `T${i + 1}`;
      });

      return {
        className: classObj.name || "",
        sem,
        semLabel,
        rows,
        testNames,
        testStats,
        semAvgStats,
        topObservationChips: getTopObservationChips(classObj, { semester: sem, limit: 10 }),
        testConfigs: (classObj.testConfigs && classObj.testConfigs[sem]) ? classObj.testConfigs[sem].slice(0, n) : [],
        printedDate: new Date().toLocaleDateString()
      };
    }

    function gradeClass(g) {
      return "";
    }

    function gradeColor(g, config = null) {
      if (g == null || g === "" || g === "—" || g === "-") return "";
      const num = toNumber(g);
      if (num == null) return "";
      const color = getScaleGradeColor(num, null, config);
      if (!color) return "";
      const textColor = getNotchContrastTextColor(color);
      return `background:${color} !important;color:${textColor} !important;`;
    }

    function buildColumnResizeScript(tableId) {
      return `(function(){
        const table = document.getElementById(${JSON.stringify(tableId)});
        if (!table) return;
        const minW = 48;
        let active = null;
        let startX = 0;
        let startW = 0;

        function onMove(e) {
          if (!active) return;
          const w = Math.max(minW, startW + (e.clientX - startX));
          active.col.style.width = w + 'px';
        }

        function onUp() {
          if (!active) return;
          active = null;
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        }

        table.querySelectorAll('.col-resizer').forEach(handle => {
          handle.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            const idx = handle.getAttribute('data-col');
            const col = table.querySelector('col[data-col="' + idx + '"]');
            if (!col) return;
            active = { col };
            startX = e.clientX;
            startW = col.getBoundingClientRect().width;
            document.body.style.cursor = 'col-resize';
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          });
        });
      })();`;
    }

    function parseCssMarginToInches(marginStr) {
      const toInches = (tok) => {
        const m = String(tok || '').trim().match(/^(-?[\d.]+)\s*(mm|cm|in|px|pt)?$/i);
        if (!m) return 0.55;
        const val = parseFloat(m[1]);
        if (isNaN(val)) return 0.55;
        const unit = (m[2] || 'mm').toLowerCase();
        if (unit === 'in') return val;
        if (unit === 'cm') return val / 2.54;
        if (unit === 'px') return val / 96;
        if (unit === 'pt') return val / 72;
        return val / 25.4;
      };
      const parts = String(marginStr || '16mm 14mm').trim().split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        const v = toInches(parts[0]);
        return { top: v, right: v, bottom: v, left: v };
      }
      if (parts.length === 2) {
        const tb = toInches(parts[0]);
        const lr = toInches(parts[1]);
        return { top: tb, right: lr, bottom: tb, left: lr };
      }
      if (parts.length === 3) {
        const t = toInches(parts[0]);
        const lr = toInches(parts[1]);
        const b = toInches(parts[2]);
        return { top: t, right: lr, bottom: b, left: lr };
      }
      return {
        top: toInches(parts[0]),
        right: toInches(parts[1]),
        bottom: toInches(parts[2]),
        left: toInches(parts[3])
      };
    }

    function getPdfExportSettings() {
      const cfg = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG)
        ? CLASS_MANAGEMENT_CONFIG
        : (window.CLASS_MANAGEMENT_CONFIG || {});
      const exp = cfg.export || {};
      
      let margin = '16mm 14mm';
      if (exp.pdfMargin) {
        if (typeof exp.pdfMargin === 'string') margin = exp.pdfMargin;
        else if (typeof exp.pdfMargin === 'number') margin = exp.pdfMargin + 'mm';
        else if (typeof exp.pdfMargin === 'object') {
          const t = exp.pdfMargin.top || '16mm';
          const r = exp.pdfMargin.right || '14mm';
          const b = exp.pdfMargin.bottom || '16mm';
          const l = exp.pdfMargin.left || '14mm';
          margin = `${t} ${r} ${b} ${l}`;
        }
      } else if (exp.margin) {
        if (typeof exp.margin === 'string') margin = exp.margin;
        else if (typeof exp.margin === 'number') margin = exp.margin + 'mm';
      }

      let orientation = (exp.orientation || exp.pdfOrientation || 'portrait').toLowerCase();
      if (orientation !== 'landscape' && orientation !== 'portrait') orientation = 'portrait';

      const pageSize = (exp.pageSize || exp.size || 'A4').trim();

      return {
        margin: margin,
        orientation: orientation,
        isLandscape: orientation === 'landscape',
        pageSize: pageSize
      };
    }

    function buildSemesterReportHtml(report) {
      const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");
      const pdfSettings = getPdfExportSettings();
      const columns = ["#", t('gsColStudentName') || "Name", ...report.testNames, t('gsHeaderSemAvg') || "Sem. Avg"];
      const colGroup = columns.map((_, i) => {
        const w = i === 0 ? "60px" : (i === 1 ? "220px" : "96px");
        return `<col data-col="${i}" style="width:${w}">`;
      }).join("");
      const css = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Lexend', system-ui, -apple-system, sans-serif; font-size: 13px; color: #1e293b; background: #fff; margin: 0; padding: 0; }
        h1 { font-size: 18px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #333333; padding-bottom: 6px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #64748b; margin-bottom: 14px; }
        table { width: 100%; max-width: 100%; border-collapse: var(--exp-table-border-collapse, collapse); table-layout: fixed; border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); background: var(--exp-bg-surface, #ffffff); page-break-inside: auto; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        th, td { border: var(--exp-table-cell-border, var(--exp-border-width, 1.5px) solid var(--exp-border-color, #333333)); padding: 6px 8px; text-align: center; white-space: nowrap; font-size: 11px; overflow: hidden; text-overflow: ellipsis; color: var(--exp-text-color, #1e293b); }
        th { background: var(--exp-table-th-bg, #f0f0eb); font-weight: 800; color: var(--exp-text-color, #1e293b); }
        th.left, td.left { text-align: left; }
        .stats-row td { background: var(--exp-table-th-bg, #f0f0eb); font-weight: 800; font-size: 10px; border-top: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); color: var(--exp-text-color, #1e293b); }
        .stats-label { font-weight: 800; color: var(--exp-text-color, #1e293b); }
        tr:nth-child(even) td:not(.stats-row td) { background: var(--exp-table-row-even, #fafafa); }
        .th-wrap { position: relative; display: block; padding-right: 8px; }
        .col-resizer { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; user-select: none; }
        .col-resizer::after { content: ''; position: absolute; right: 3px; top: 18%; bottom: 18%; width: 1px; background: #333333; }
        [contenteditable="true"]:focus {
          outline: 2px solid #333333;
          background: #fafafa;
        }
        .grade-band-6 { background: #2ecc40 !important; color: #fff !important; }
        .grade-band-5 { background: #a5d6a7 !important; color: #1a3a1a !important; }
        .grade-band-4 { background: #ffb74d !important; color: #3a1800 !important; }
        .grade-band-3 { background: #ef9a9a !important; color: #3a0000 !important; }
        .grade-band-low { background: #e53935 !important; color: #fff !important; }
        @page { size: ${pdfSettings.pageSize} ${pdfSettings.orientation}; margin: ${pdfSettings.margin}; }
        @media print {
          body { margin: 0; padding: 0; }
          table { width: 100% !important; max-width: 100% !important; }
        }
      `;

      const headerCells = columns.map((name, i) => {
        const cls = i < 2 ? " class=\"left\"" : "";
        return `<th${cls}><span class="th-wrap">${esc(name)}<span class="col-resizer" data-col="${i}"></span></span></th>`;
      }).join("");
      const studentRows = report.rows.map(({ student, grades, semAvg }) => {
        const gradeCells = grades.map((g, ti) => {
          const cfg = (report.testConfigs && report.testConfigs[ti]) || null;
          const s = gradeColor(g, cfg);
          return `<td class="center" style="${s}">${g != null ? fmtN(g) : "-"}</td>`;
        }).join("");
        const avgStyle = gradeColor(semAvg);
        return `<tr>
          <td class="left">${esc(String(student.index))}</td>
          <td class="left">${esc((student.firstName + " " + student.lastName).trim())}</td>
          ${gradeCells}
          <td class="center" style="font-weight:700;${avgStyle}">${semAvg != null ? fmtAvg(semAvg) : "-"}</td>
        </tr>`;
      }).join("");

      function statRow(label, fn) {
        const cells = report.testStats.map(s => `<td>${s[fn] != null ? fmtN(s[fn]) : "-"}</td>`).join("");
        const sv = report.semAvgStats[fn];
        return `<tr class="stats-row">
          <td colspan="2" class="left stats-label">${label}</td>
          ${cells}
          <td>${sv != null ? fmtAvg(sv) : "-"}</td>
        </tr>`;
      }

      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(report.className)} - ${esc(report.semLabel)}</title>
        <style>${css}</style></head><body>
        <h1>${esc(report.className)} - ${esc(report.semLabel)}</h1>
        <div class="subtitle">${t('gsReportPrintedOn') || 'Printed'} ${esc(report.printedDate)}</div>
        <table id="semester-report-table">
          <colgroup>${colGroup}</colgroup>
          <thead><tr>
            ${headerCells}
          </tr></thead>
          <tbody>
            ${studentRows}
            ${statRow(t('gsStatAvg') || "Avg", "avg")}
            ${statRow(t('gsStatMax') || "Max", "max")}
            ${statRow(t('gsStatMin') || "Min", "min")}
            ${statRow(t('gsStatMedian') || "Median", "median")}
          </tbody>
        </table>
        ${(report.topObservationChips && report.topObservationChips.length > 0) ? `
          <div style="margin-top:20px;">
            <div style="font-size:14px;font-weight:800;border-bottom:2px solid #333333;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">
              ${t('gsTopChipsClassTitle') || 'Top 10 Most Frequent Observation Chips'}
            </div>
            ${renderTopChipsReportSection(report.topObservationChips, report.rows.length)}
          </div>
        ` : ''}
        ${'<script>' + buildColumnResizeScript("semester-report-table") + '; (function(){ document.querySelectorAll("body *").forEach(function(el){ if(!el.classList.contains("col-resizer")) el.contentEditable = "true"; }); })();' + '</' + 'script>'}
      </body></html>`;
    }

    function buildTestReportData(classObj, sem, testIndex) {
      ensureClassStructures(classObj);
      const config = getTestConfig(classObj, sem, testIndex);
      const testNo = testIndex + 1;
      const testLabel = config.testName ? String(config.testName) : `T${testNo}`;
      const defaultTotals = calcCriteriaTotals(config, {});
      const thresholds = getThresholds(config);

      const allValidGrades = classObj.students.map(s => {
        const sourceArray = sem === "sem1" ? s.sem1Tests : s.sem2Tests;
        return sourceArray ? sourceArray[testIndex] : null;
      }).filter(v => v != null && !isNaN(v));
      const classMean = allValidGrades.length ? allValidGrades.reduce((a, b) => a + b, 0) / allValidGrades.length : null;
      const { criteriaStats, classMeanTotalScored } = calcTestExerciseClassStats(classObj, sem, testIndex, config);

      const students = classObj.students.filter(student => {
        if (config.criteria.length === 0) return true;
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        return config.criteria.every(cr => {
          const entry = criteriaMap[cr.id];
          return entry != null && entry.points != null;
        });
      }).map(student => {
        const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
        const grade = sourceArray[testIndex];
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        const totals = calcCriteriaTotals(config, criteriaMap);
        const noteArray = student.testNotes[sem];
        const notes = Array.isArray(noteArray[testIndex]) ? noteArray[testIndex] : [];
        const delta = (grade != null && classMean != null) ? (grade - classMean) : null;

        return {
          fullName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
          grade,
          classMean,
          delta,
          criteriaRows: config.criteria.map(cr => {
            const entry = criteriaMap[cr.id] || { points: null, comment: "" };
            const pts = entry.points;
            const { key, color: critColor } = resolveCriterionPointsColor(cr, pts, config, classObj);
            const stat = criteriaStats[cr.id];
            const meanPts = (stat && stat.avgPts != null) ? fmtN(stat.avgPts) : null;
            return {
              criterionName: cr.name,
              gradeKey: key,
              color: critColor,
              scoredPts: pts,
              meanPts: (stat && stat.avgPts != null) ? stat.avgPts : null,
              meanPtsText: meanPts != null ? `${meanPts} / ${fmtN(cr.maxPoints)}` : `— / ${fmtN(cr.maxPoints)}`,
              maxPts: cr.maxPoints,
              commentHtml: entry.comment ? renderMd(entry.comment) : '<span class="no-data">—</span>'
            };
          }),
          totalPtsText: totals.totalPossible > 0
            ? `${fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0))} / ${fmtN(totals.totalPossible)}${(totals.totalBonusScored && totals.totalBonusScored > 0) ? ` (+${fmtN(totals.totalBonusScored)} bonus)` : ""}`
            : "—",
          observations: (() => {
            const remarkAllocator = createRemarkNumberAllocator(notes);
            return notes.filter(s => sectionHasContent(s)).map(s => ({
              label: s.label || "",
              kind: s.kind || "",
              checklist: sectionChecklistSummary(s),
              text: s.text || "",
              html: renderObservationSectionHtml(s, (config && config.chipBank) || (classObj && classObj.chipBank), remarkAllocator)
            }));
          })()
        };
      });

      return {
        className: classObj.name || "",
        sem,
        semLabel: sem === "sem1" ? t('gsSem1') : t('gsSem2'),
        testNo,
        testLabel,
        testDate: config.testDate || "",
        scope: config.scope || "",
        type: config.type || "",
        scaleModelKey: config.grading && config.grading.modelKey,
        config,
        printedDate: new Date().toLocaleDateString(),
        totalPossible: defaultTotals.totalPossible,
        thresholds,
        classMean,
        classMeanTotalScored,
        criteriaStats,
        students
      };
    }

    function buildAllTablesResizeScript() {
      return `(function(){
        const minW = 48;
        let active = null;
        let startX = 0;
        let startW = 0;

        function onMove(e) {
          if (!active) return;
          const w = Math.max(minW, startW + (e.clientX - startX));
          active.col.style.width = w + 'px';
        }

        function onUp() {
          if (!active) return;
          active = null;
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        }

        document.querySelectorAll('table.resizable-table').forEach(table => {
          table.querySelectorAll('.col-resizer').forEach(handle => {
            handle.addEventListener('mousedown', e => {
              e.preventDefault();
              e.stopPropagation();
              const idx = handle.getAttribute('data-col');
              const col = table.querySelector('col[data-col="' + idx + '"]');
              if (!col) return;
              active = { col };
              startX = e.clientX;
              startW = col.getBoundingClientRect().width;
              document.body.style.cursor = 'col-resize';
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            });
          });
        });
      })();`;
    }

    function buildTestReportHtml(report) {
      const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");

      const css = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Lexend', system-ui, -apple-system, sans-serif; font-size: 13px; color: #1e293b; background: #fff; }
        .student-page {
          width: 210mm;
          min-height: 297mm;
          padding: 18mm 18mm 15mm 18mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .page-header {
          border-bottom: 2px solid #333333;
          padding-bottom: 8px;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .student-name { font-size: 18px; font-weight: 800; color: #1e293b; }
        .test-label { font-size: 13px; color: #1e293b; font-weight: 600; }
        .test-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
        .grade-badge {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
          border: 2px solid #333333;
          border-radius: 6px;
          padding: 4px 14px;
          white-space: nowrap;
          background: #ffffff;
          box-shadow: 3px 3px 0 #555555;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #1e293b;
          border-bottom: 2px solid #333333;
          padding-bottom: 3px;
          margin-bottom: 6px;
        }
        table { width: 100%; border-collapse: collapse !important; font-size: 12px; table-layout: fixed; border: 1px solid #000000 !important; background: var(--exp-bg-surface, #ffffff); }
        th {
          background: var(--exp-table-th-bg, #f0f0eb);
          font-weight: 800;
          text-align: left;
          padding: 5px 7px;
          border: 1px solid #000000 !important;
          border-bottom: 2px solid #000000 !important;
          color: var(--exp-text-color, #1e293b);
        }
        td { padding: 5px 7px; border: 1px solid #000000 !important; vertical-align: top; overflow: hidden; text-overflow: ellipsis; color: var(--exp-text-color, #1e293b); }
        .pts-cell { text-align: right; white-space: nowrap; font-weight: 700; }
        .total-row td { font-weight: 800; background: var(--exp-table-th-bg, #f0f0eb); border-top: 2px solid #000000 !important; color: var(--exp-text-color, #1e293b); }
        .obs-section { margin-bottom: 8px; }
        .obs-label {
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #1e293b;
          margin-bottom: 2px;
        }
        .obs-categories-wrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          margin-bottom: 3px;
        }
        .obs-category-span {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 3px;
          border: none;
          padding: 0;
          margin: 0 4px 0 0;
          vertical-align: middle;
          page-break-inside: avoid;
        }
        .obs-category-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: none;
          letter-spacing: 0.02em;
          color: #333333;
          margin-right: 2px;
          white-space: nowrap;
        }
        .obs-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 2px;
          margin-bottom: 4px;
        }
        .obs-pill,
        .obs-feedback .obs-pill,
        .obs-section .obs-pill {
          display: inline-block;
          padding: 1px 4px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.15;
          margin: 1px 3px 1px 0;
          background: transparent !important;
          box-shadow: none !important;
        }
        .obs-pill-good {
          color: #166534;
          border: 0.5px dotted #16a34a;
        }
        .obs-pill-remedy {
          color: #991b1b;
          border: 0.5px dotted #dc2626;
        }
        .obs-pill-custom {
          color: #0369a1;
          border: 0.5px dotted #0284c7;
        }
        .obs-pill-multiplier {
          font-size: 0.68em;
          font-weight: 800;
          line-height: 0;
          vertical-align: super;
          margin-left: 2px;
          margin-right: 3px;
          display: inline-block;
          white-space: nowrap;
        }
        .obs-pill-num {
          font-weight: 800;
          margin-right: 2px;
          opacity: 0.95;
        }
        .obs-feedback {
          display: inline;
          padding: 0;
          background: transparent;
          border: none;
          font-size: 9.5px;
          line-height: 1.35;
          color: #1e293b;
        }
        .obs-feedback-body {
          display: inline;
          white-space: normal;
        }
        .obs-feedback-body p {
          display: inline;
          margin: 0;
        }
        .obs-feedback-body p:last-child {
          margin-bottom: 0;
        }
        .obs-text { font-size: 13px; line-height: 1.5; white-space: normal; color: #1e293b; }
        .crit-comment-cell, td.crit-comment-cell {
          font-size: 9.5px !important;
          line-height: 1.35 !important;
          vertical-align: top;
          padding-left: 5px !important;
          padding-right: 5px !important;
        }
        .crit-comment-cell p, td.crit-comment-cell p,
        .crit-comment-cell ul, td.crit-comment-cell ul,
        .crit-comment-cell ol, td.crit-comment-cell ol {
          margin: 0 0 2px 0 !important;
          padding-left: 0 !important;
          margin-left: 0 !important;
          font-size: 9.5px !important;
          line-height: 1.35 !important;
        }
        .crit-comment-cell p:last-child, td.crit-comment-cell p:last-child {
          margin-bottom: 0 !important;
        }
        .no-data { color: #888; font-size: 12px; }
        .scale-wrap { margin-top: 2px; }
        .scale-table { font-size: 10px; border-collapse: collapse !important; width: 100%; table-layout: fixed; border: 1px solid #000000 !important; }
        .scale-table th, .scale-table td { padding: 3px 5px; border: 1px solid #000000 !important; text-align: center; white-space: nowrap; color: #1e293b; }
        .scale-table thead th { background: #f0f0eb; font-weight: 800; }
        .scale-table .row-label { background: #f0f0eb; font-weight: 800; text-align: left; }
        .scale-grade-pass { font-weight: 800; color: #1e293b; }
        .th-wrap { position: relative; display: block; padding-right: 8px; }
        .col-resizer { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; user-select: none; }
        .col-resizer::after { content: ''; position: absolute; right: 3px; top: 18%; bottom: 18%; width: 1px; background: #333333; }
        [contenteditable="true"]:focus {
          outline: 2px solid #333333;
          background: #fafafa;
        }
        @media print {
          body { margin: 0; }
          .student-page { page-break-after: always; }
        }
      `;

      const totalMeanStr = (report.classMeanTotalScored != null && report.totalPossible > 0)
        ? `${fmtN(report.classMeanTotalScored)} / ${fmtN(report.totalPossible)}`
        : "—";

      const pagesHtml = report.students.map((student, idx) => {
        const criteriaTableId = `test-report-criteria-${idx}`;
        const scaleTableId = `test-report-scale-${idx}`;

        let criteriaHtml = "";
        if (student.criteriaRows.length > 0) {
          const criteriaRows = student.criteriaRows.map(r => {
            const cTextColor = getHighContrastTextColor(r.color);
            const gradeBadge = (r.gradeKey != null && r.color)
              ? `<span style="display:inline-block;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px;margin-right:6px;background:${r.color}20;color:${cTextColor};border:1px solid ${r.color};">${esc(r.gradeKey)}</span>`
              : "";
            let ptsDisplay = "";
            if (r.scoredPts != null) {
              const scoredSpan = r.color
                ? `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${r.color}18;color:${cTextColor};font-weight:800;">${esc(fmtN(r.scoredPts))}</span>`
                : `<span style="font-weight:800;color:#111;">${esc(fmtN(r.scoredPts))}</span>`;
              ptsDisplay = `${scoredSpan} <span style="color:#111;font-weight:600;">/ ${esc(fmtN(r.maxPts))}</span>`;
            } else {
              ptsDisplay = `<span style="color:#888;">—</span> <span style="color:#111;font-weight:600;">/ ${esc(fmtN(r.maxPts))}</span>`;
            }
            return `<tr>
              <td>${esc(r.criterionName)}</td>
              <td class="pts-cell">${ptsDisplay}</td>
              <td class="pts-cell" style="font-weight:700;color:#475569;">${esc(r.meanPtsText || '—')}</td>
              <td class="crit-comment-cell">${r.commentHtml}</td>
            </tr>`;
          }).join("");

          criteriaHtml = `
            <div>
              <div class="section-title">${t('gsReportSectionCriteria') || 'Criteria'}</div>
              <table class="resizable-table" id="${criteriaTableId}">
                <colgroup>
                  <col data-col="0" style="width:34%">
                  <col data-col="1" style="width:16%">
                  <col data-col="2" style="width:16%">
                  <col data-col="3" style="width:34%">
                </colgroup>
                <thead>
                  <tr>
                    <th><span class="th-wrap">${t('gsCriteriaLabelName') || 'Criterion'}<span class="col-resizer" data-col="0"></span></span></th>
                    <th class="pts-cell"><span class="th-wrap">${t('gsGradingManualPts') || 'Points'}<span class="col-resizer" data-col="1"></span></span></th>
                    <th class="pts-cell"><span class="th-wrap">${t('gsReportClassMeanHeader') || 'Class Mean'}<span class="col-resizer" data-col="2"></span></span></th>
                    <th><span class="th-wrap">${t('gsColComments') || 'Comment'}<span class="col-resizer" data-col="3"></span></span></th>
                  </tr>
                </thead>
                <tbody>
                  ${criteriaRows}
                  <tr class="total-row">
                    <td>${t('gsTotal') || 'Total'}</td>
                    <td class="pts-cell">${esc(student.totalPtsText)}</td>
                    <td class="pts-cell" style="color:#475569;">${esc(totalMeanStr)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        const obsHtml = student.observations.length > 0
          ? `<div><div class="section-title">${t('gsReportObservationsFeedback') || t('gsColObservations') || 'Observations & Teacher Feedback'}</div>${student.observations.map(o => o.html || renderObservationSectionHtml(o)).join("")}</div>`
          : "";

        const scaleModel = (typeof getScaleModel === "function" && report.scaleModelKey) ? getScaleModel(report.scaleModelKey) : null;
        const scaleColGroup = ['<col data-col="0" style="width:20%">']
          .concat(report.thresholds.map((_, i2) => `<col data-col="${i2 + 1}" style="width:${(80 / Math.max(1, report.thresholds.length)).toFixed(4)}%">`))
          .join('');
        const scaleHeaderResized = report.thresholds.map((t, i2) => {
          const color = (scaleModel && scaleModel.colors && scaleModel.colors[String(t.grade)]) || getScaleGradeColor(t.grade, report.scaleModelKey, report.config);
          const textColor = getHighContrastTextColor(color);
          const passMark = t.grade === 4 ? `*` : ``;
          return `<th><span class="th-wrap"><span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${color}20;color:${textColor};border:1px solid ${color};font-weight:800;">${t.grade}${passMark}</span><span class="col-resizer" data-col="${i2 + 1}"></span></span></th>`;
        }).join("");
        const scalePctCells = report.thresholds.map(t => `<td>${Math.round(t.ratio * 100)}%</td>`).join("");
        const scalePtsCells = report.thresholds.map(t => `<td>${report.totalPossible > 0 ? fmtN(t.ratio * report.totalPossible) : "-"}</td>`).join("");
        const scaleHtml = `<div class="scale-wrap">
          <div class="section-title">${t('gsReportSectionGradingScale') || 'Grading Scale'}</div>
          <table class="scale-table resizable-table" id="${scaleTableId}">
            <colgroup>${scaleColGroup}</colgroup>
            <thead><tr><th><span class="th-wrap">${t('gsColGrade') || 'Grade'}<span class="col-resizer" data-col="0"></span></span></th>${scaleHeaderResized}</tr></thead>
            <tbody>
              <tr><td class="row-label">${t('gsReportMinPct') || 'Min %'}</td>${scalePctCells}</tr>
              <tr><td class="row-label">${t('gsReportMinPts') || 'Min pts'} (/ ${fmtN(report.totalPossible)})</td>${scalePtsCells}</tr>
            </tbody>
          </table>
        </div>`;

        const metaParts = [];
        if (report.testDate) metaParts.push(esc(report.testDate));
        if (report.scope) metaParts.push(esc(report.scope));
        if (report.type) metaParts.push(esc(report.type));
        const metaHtml = metaParts.length ? `<div class="test-meta">${metaParts.join(" &nbsp;·&nbsp; ")}</div>` : "";

        const gradeColorVal = student.grade != null ? ((scaleModel && scaleModel.colors && scaleModel.colors[String(student.grade)]) || getScaleGradeColor(student.grade, report.scaleModelKey, report.config)) : '#111';
        const gradeTextColor = getHighContrastTextColor(gradeColorVal);
        const gradeBadgeStyle = student.grade != null
          ? `style="border-color:${gradeColorVal}; color:${gradeTextColor}; background:${gradeColorVal}18; box-shadow: 3px 3px 0 ${gradeColorVal};"`
          : "";

        const benchmarkPillHtml = student.classMean != null
          ? `<div style="font-size:10px; font-weight:800; border:1.5px solid #111; box-shadow:2px 2px 0 #111; border-radius:4px; padding:2px 8px; background:#fff; white-space:nowrap; display:flex; gap:6px; margin-top:4px;">
               <span>${t('gsReportClassMean') || 'Class Mean:'} <strong>${student.classMean.toFixed(2)}</strong></span>
               ${student.delta != null ? `<span>| ${t('gsColDelta') || 'Delta:'} <strong style="color:${student.delta >= 0 ? '#2e7d32' : '#c62828'}">${student.delta >= 0 ? '+' : ''}${student.delta.toFixed(2)}</strong></span>` : ''}
             </div>`
          : "";

        const gaugeHtml = student.classMean != null
          ? `<div style="margin-top:2px; margin-bottom:2px;">
               ${renderNeobrutalistSvgBenchmarkGauge({
                 studentVal: student.grade,
                 classAvg: student.classMean,
                 label: t('gsReportStudentVsClassGauge') || "Student Score vs. Class Mean Benchmark"
               })}
             </div>`
          : "";

        return `<div class="student-page">
          <div class="page-header">
            <div>
              <div class="student-name">${esc(student.fullName)}</div>
              <div class="test-label">${esc(`${report.className} — ${report.sem.toUpperCase()} — Test T${report.testNo}`)}</div>
              ${metaHtml}
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
              <div class="grade-badge" ${gradeBadgeStyle}>${t('gsColGrade') || 'Grade'}: ${student.grade != null ? esc(String(student.grade)) : '—'}</div>
              ${benchmarkPillHtml}
            </div>
          </div>
          ${gaugeHtml}
          ${criteriaHtml}
          ${obsHtml}
          ${scaleHtml}
        </div>`;
      }).join("");

      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${t('gsReportTestResultsTitle') || 'Results'} - ${esc(report.className)} ${esc(report.sem.toUpperCase())} T${report.testNo}</title>
        <style>${css}</style></head><body>
        ${pagesHtml}
        ${'<script>' + buildAllTablesResizeScript() + '; (function(){ document.querySelectorAll("body *").forEach(function(el){ if(!el.classList.contains("col-resizer")) el.contentEditable = "true"; }); })();' + '</' + 'script>'}
      </body></html>`;
    }

    function buildSemesterReportMarkdown(report) {
      const mdEsc = value => String(value == null ? "" : value).replace(/\|/g, "\\|").replace(/\n/g, " ");
      const header = ["#", t('gsColStudentName') || "Name", ...report.testNames, t('gsHeaderSemAvg') || "Sem. Avg"];
      const lines = [
        `# ${report.className} - ${report.semLabel}`,
        "",
        `${t('gsReportPrintedOn') || 'Printed'} ${report.printedDate}`,
        "",
        `| ${header.map(mdEsc).join(" | ")} |`,
        `| ${header.map(() => "---").join(" | ")} |`
      ];

      report.rows.forEach(({ student, grades, semAvg }) => {
        const row = [
          String(student.index == null ? "" : student.index),
          (student.firstName + " " + student.lastName).trim(),
          ...grades.map(g => g != null ? fmtN(g) : "-"),
          semAvg != null ? fmtAvg(semAvg) : "-"
        ];
        lines.push(`| ${row.map(mdEsc).join(" | ")} |`);
      });

      function statsRow(label, fn) {
        const values = report.testStats.map(s => s[fn] != null ? fmtN(s[fn]) : "-");
        const semValue = report.semAvgStats[fn] != null ? fmtAvg(report.semAvgStats[fn]) : "-";
        return [label, "", ...values, semValue];
      }

      [
        statsRow(t('gsStatAvg') || "Avg", "avg"),
        statsRow(t('gsStatMax') || "Max", "max"),
        statsRow(t('gsStatMin') || "Min", "min"),
        statsRow(t('gsStatMedian') || "Median", "median")
      ].forEach(row => lines.push(`| ${row.map(mdEsc).join(" | ")} |`));

      return lines.join("\n");
    }

    async function pickSemesterForReport() {
      const semStr = await showPrompt(t('gsPromptPrintSem'), "1");
      if (!semStr) return null;
      return semStr.trim() === "2" ? "sem2" : "sem1";
    }

    async function exportSemesterDocx(classObj, sem) {
      if (!window.Desktop || !Desktop.isElectron()) {
        await showAlert(t('gsAlertDocxDesktopOnly'));
        return;
      }
      const slug = slugifyForPath(classObj.name || "class");
      const baseName = `${slug}-${sem}-grades-${new Date().toISOString().slice(0, 10)}`;
      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename: `${baseName}.docx`,
          toolKey: 'gradeSheet',
          buildDocxRequest: () => {
            const report = buildSemesterReportData(classObj, sem);
            const markdown = buildSemesterReportMarkdown(report);
            return {
              markdown,
              defaultName: baseName,
              fontFamily: 'Segoe UI',
              fontSize: '10pt',
              lineHeight: '1.2',
              margins: { top: 18, right: 16, bottom: 18, left: 16 },
              size: 'A4',
              orientation: 'portrait'
            };
          }
        });
      }
      const report = buildSemesterReportData(classObj, sem);
      const markdown = buildSemesterReportMarkdown(report);
      const result = await Desktop.exportDocx({
        markdown,
        defaultName: baseName,
        fontFamily: 'Segoe UI',
        fontSize: '10pt',
        lineHeight: '1.2',
        margins: { top: 18, right: 16, bottom: 18, left: 16 },
        size: 'A4',
        orientation: 'portrait'
      });
      if (result && result.ok) {
        if (window.showExportSuccessPopup && result.path) {
          showExportSuccessPopup(result.path, result.name || `${baseName}.docx`);
        }
        return;
      }
      if (result && !result.canceled) {
        await showAlert(t('gsAlertDocxExportFailed'));
      }
    }

    async function exportSemesterHtml(classObj, sem) {
      const slug = slugifyForPath(classObj.name || "class");
      const filename = `${slug}-${sem}-grades-${new Date().toISOString().slice(0, 10)}.html`;
      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename,
          toolKey: 'gradeSheet',
          mimeType: 'text/html;charset=utf-8',
          allowDocEditor: true,
          filters: [{ name: 'HTML Files', extensions: ['html'] }, { name: 'All Files', extensions: ['*'] }],
          buildContent: async () => {
            const report = buildSemesterReportData(classObj, sem);
            let html = buildSemesterReportHtml(report);
            if (window.ExportStylesService) {
              const sId = ExportStylesService.getSelectedStyle('gradeSheet');
              html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
            }
            return html;
          }
        });
      }
      const report = buildSemesterReportData(classObj, sem);
      let html = buildSemesterReportHtml(report);
      if (window.ExportStylesService) {
        const sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
      }
      downloadTextFile(html, filename, "text/html;charset=utf-8");
    }

    async function downloadBinaryFile(buffer, filename, mimeType) {
      const ext = (filename.split('.').pop() || '').toLowerCase();
      let filterName = 'File';
      if (ext === 'xlsx') filterName = 'Excel Spreadsheet';
      else if (ext === 'pdf') filterName = 'PDF Document';

      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename: filename,
          content: buffer,
          mimeType: mimeType || 'application/octet-stream',
          filters: [{ name: filterName, extensions: [ext] }, { name: 'All Files', extensions: ['*'] }],
          title: typeof t === 'function' ? (t('deSaveFileTitle') || 'Save File') : 'Save File'
        });
      }
      const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    async function exportSemesterGradesXlsx(classObj, sem, format = 'xlsx') {
      if (typeof XLSX === "undefined") {
        await showAlert(t('gsAlertXlsxNotLoaded') || "XLSX library not loaded");
        return;
      }
      if (!classObj) classObj = getActiveClass();
      if (!classObj) return;
      if (!sem) {
        sem = await pickSemesterForReport();
        if (!sem) return;
      }
      const report = buildSemesterReportData(classObj, sem);
      const header = ["#", t('gsEditStudentFirstName') || "First Name", t('gsEditStudentLastName') || "Last Name", ...report.testNames, t('gsHeaderSemAvg') || "Semester Avg"];
      const aoa = [header];
      const nameMode = getGsNameDisplayMode();
      report.rows.forEach(({ student, grades, semAvg }) => {
        let fn = student.firstName || "";
        let ln = student.lastName || "";
        if (nameMode === 'custom') {
          if (student.customName) {
            fn = student.customName;
            ln = "";
          } else {
            fn = student.firstName || "";
            ln = student.lastName ? (student.lastName.trim().charAt(0).toUpperCase() + '.') : "";
          }
        } else if (nameMode === 'first') {
          ln = "";
        } else if (nameMode === 'last') {
          fn = student.lastName || "";
          ln = "";
        }
        aoa.push([
          student.index != null ? student.index : "",
          fn,
          ln,
          ...grades.map(g => (g != null ? g : "")),
          semAvg != null ? semAvg : ""
        ]);
      });
      function statRow(label, fn) {
        return [
          label,
          "",
          "",
          ...report.testStats.map(s => (s[fn] != null ? Math.round(s[fn] * 100) / 100 : "")),
          report.semAvgStats[fn] != null ? Math.round(report.semAvgStats[fn] * 100) / 100 : ""
        ];
      }
      aoa.push(statRow(t('gsStatAvg') || "Avg", "avg"));
      aoa.push(statRow(t('gsStatMax') || "Max", "max"));
      aoa.push(statRow(t('gsStatMin') || "Min", "min"));
      aoa.push(statRow(t('gsStatMedian') || "Median", "median"));

      const topChips = getTopObservationChips(classObj, { semester: sem, limit: 10 });
      aoa.push([]);
      aoa.push([t('gsTopChipsClassTitle') || "Top 10 Most Frequent Observation Chips"]);
      aoa.push([
        "#",
        t('gsColObservations') || "Observation Chip",
        t('gsTopChipsCategory') || "Category",
        t('gsStatCount') || "Uses",
        t('gsReportTotalStudents') || "Students",
        t('gsTopChipsPercentage') || "% of Class"
      ]);
      if (topChips && topChips.length > 0) {
        topChips.forEach((chip, i) => {
          aoa.push([
            i + 1,
            chip.name,
            chip.category || "",
            chip.occurrences,
            chip.studentCount,
            `${chip.percentage}%`
          ]);
        });
      } else {
        aoa.push(["-", t('gsTopChipsEmpty') || "No observation chips recorded", "", "", "", ""]);
      }

      if (Array.isArray(topChips.sections) && topChips.sections.length > 0) {
        topChips.sections.forEach(sec => {
          const sChips = sec.topChips || [];
          if (!sChips.length) return;
          aoa.push([]);
          aoa.push([`${sec.name} (Top 5)`]);
          aoa.push([
            "#",
            t('gsColObservations') || "Observation Chip",
            t('gsTopChipsCategory') || "Category",
            t('gsStatCount') || "Uses",
            t('gsReportTotalStudents') || "Students",
            t('gsTopChipsPercentage') || "% of Class"
          ]);
          sChips.forEach((chip, i) => {
            aoa.push([
              i + 1,
              chip.name,
              chip.category || "",
              chip.occurrences,
              chip.studentCount,
              `${chip.percentage}%`
            ]);
          });
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, report.semLabel || sem);

      try {
        const isOds = format === 'ods';
        const wbout = XLSX.write(wb, { bookType: isOds ? 'ods' : 'xlsx', type: 'array' });
        const slug = slugifyForPath(classObj.name || "class");
        const ext = isOds ? 'ods' : 'xlsx';
        const mime = isOds ? 'application/vnd.oasis.opendocument.spreadsheet' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const filename = `${slug}-${sem}-grades-${new Date().toISOString().slice(0, 10)}.${ext}`;
        downloadBinaryFile(wbout, filename, mime);
      } catch (err) {
        await showAlert('<img src="../assets/icons/error.svg" class="btn-icon" alt="" /> ' + (t('gsAlertXlsxSaveFailed') || 'Could not save spreadsheet:') + ' ' + (err && err.message ? err.message : String(err)));
      }
    }

    async function exportSemesterGradesOds(classObj, sem) {
      return exportSemesterGradesXlsx(classObj, sem, 'ods');
    }

    async function exportTestHtml(classObj, sem, testIndex) {
      if (!classObj || sem == null || testIndex == null) return;
      const report = buildTestReportData(classObj, sem, testIndex);
      if (!report.students || report.students.length === 0) {
        await showAlert(t('gsAlertNoStudentsCriteria'));
        return;
      }
      let html = buildTestReportHtml(report);
      if (window.ExportStylesService) {
        var sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId);
      }
      const slug = slugifyForPath(classObj.name || "class");
      const filename = `${slug}-${sem}-t${testIndex + 1}-${new Date().toISOString().slice(0, 10)}.html`;
      downloadTextFile(html, filename, "text/html;charset=utf-8");
    }

    async function exportActiveTestHtml() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      return exportTestHtml(classObj, appState.activeTest.semester, appState.activeTest.testIndex);
    }

    function buildTestResultsDocxMarkdown(classObj, sem, testIndex) {
      const config = getTestConfig(classObj, sem, testIndex);
      const testNo = testIndex + 1;
      const defaultTotals = calcCriteriaTotals(config, {});
      const thresholds = getThresholds(config);
      const mdEsc = value => String(value == null ? "" : value).replace(/\|/g, "\\|").replace(/\n/g, " ");

      const allValidGrades = classObj.students.map(s => {
        const sourceArray = sem === "sem1" ? s.sem1Tests : s.sem2Tests;
        return sourceArray ? sourceArray[testIndex] : null;
      }).filter(v => v != null && !isNaN(v));
      const classMean = allValidGrades.length ? allValidGrades.reduce((a, b) => a + b, 0) / allValidGrades.length : null;

      const sections = [];
      sections.push(`# ${classObj.name} - ${sem.toUpperCase()} - T${testNo}`);
      if (classMean != null) {
        sections.push(`**${t('gsReportClassMean') || 'Class Average:'}** ${classMean.toFixed(2)}`);
      }
      sections.push("");
      sections.push(`${t('gsReportPrintedOn') || 'Printed'} ${new Date().toLocaleDateString()}`);
      sections.push("");

      classObj.students.filter(student => {
        if (config.criteria.length === 0) return true;
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        return config.criteria.every(cr => {
          const entry = criteriaMap[cr.id];
          return entry != null && entry.points != null;
        });
      }).forEach(student => {
        const sourceArray = sem === "sem1" ? student.sem1Tests : student.sem2Tests;
        const grade = sourceArray[testIndex];
        const criteriaMap = student.criteriaResults[sem][testIndex] || {};
        const totals = calcCriteriaTotals(config, criteriaMap);
        const noteArray = student.testNotes[sem];
        const notes = Array.isArray(noteArray[testIndex]) ? noteArray[testIndex] : [];
        const delta = (grade != null && classMean != null) ? (grade - classMean) : null;
        const deltaStr = delta != null ? ` (${delta >= 0 ? '+' : ''}${delta.toFixed(2)} vs ${t('gsKpiClassAvg') || 'Class Mean'})` : '';

        const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
          ? StudentNameUtils.formatStudentName(student, getGsNameDisplayMode())
          : `${student.firstName || ""} ${student.lastName || ""}`.trim();
        sections.push(`## ${fullName} - ${t('gsColGrade') || 'Grade'}: ${grade != null ? grade : "-"}${deltaStr}`);
        if (classMean != null) {
          sections.push(`*${t('gsStatScore') || 'Score'}:* **${grade != null ? fmtN(grade) : '-'}** | *${t('gsReportClassMean') || 'Class Mean:'}* **${classMean.toFixed(2)}**${delta != null ? ` | *${t('gsColDelta') || 'Delta:'}* **${delta >= 0 ? '+' : ''}${delta.toFixed(2)}**` : ''}`);
        }
        if (config.testDate || config.scope || config.type) {
          const metaParts = [];
          if (config.testDate) metaParts.push(config.testDate);
          if (config.scope) metaParts.push(config.scope);
          if (config.type) metaParts.push(config.type);
          sections.push(metaParts.join(" · "));
        }
        sections.push("");

        if (config.criteria.length > 0) {
          const { criteriaStats, classMeanTotalScored } = calcTestExerciseClassStats(classObj, sem, testIndex, config);
          sections.push(`### ${t('gsReportSectionCriteria') || 'Criteria'}`);
          sections.push(`| ${t('gsCriteriaLabelName') || 'Criterion'} | ${t('gsGradingManualPts') || 'Points'} | ${t('gsReportClassMeanHeader') || 'Class Mean'} | ${t('gsColComments') || 'Comment'} |`);
          sections.push(`| --- | --- | --- | --- |`);
          config.criteria.forEach(cr => {
            const entry = criteriaMap[cr.id] || { points: null, comment: "" };
            const pts = entry.points;
            const ptsStr = pts != null ? `${fmtN(pts)} / ${fmtN(cr.maxPoints)}` : `- / ${fmtN(cr.maxPoints)}`;
            const stat = criteriaStats[cr.id];
            const meanPts = (stat && stat.avgPts != null) ? fmtN(stat.avgPts) : null;
            const meanPtsStr = meanPts != null ? `${meanPts} / ${fmtN(cr.maxPoints)}` : `- / ${fmtN(cr.maxPoints)}`;
            const comment = entry.comment ? entry.comment : "-";
            sections.push(`| ${mdEsc(cr.name)} | ${mdEsc(ptsStr)} | ${mdEsc(meanPtsStr)} | ${mdEsc(comment)} |`);
          });
          const bonusText = (totals.totalBonusScored && totals.totalBonusScored > 0) ? ` (+${fmtN(totals.totalBonusScored)} bonus)` : "";
          const displayedScored = fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0));
          const totalPtsStr = totals.totalPossible > 0
            ? `${displayedScored} / ${fmtN(totals.totalPossible)}${bonusText}`
            : "-";
          const displayedMeanTotal = classMeanTotalScored != null ? fmtN(classMeanTotalScored) : "-";
          const totalMeanStr = defaultTotals.totalPossible > 0 ? `${displayedMeanTotal} / ${fmtN(defaultTotals.totalPossible)}` : "-";
          sections.push(`| **${t('gsTotal') || 'Total'}** | **${mdEsc(totalPtsStr)}** | **${mdEsc(totalMeanStr)}** | |`);
          sections.push("");
        }

        if (notes.length > 0 && notes.some(s => sectionHasContent(s))) {
          const remarkAllocator = createRemarkNumberAllocator(notes);
          sections.push(`### ${t('gsReportObservationsFeedback') || t('gsColObservations') || 'Observations & Teacher Feedback'}`);
          notes.filter(s => sectionHasContent(s)).forEach(s => {
            const label = s.label ? `**${s.label}**` : "";
            const checklist = sectionChecklistSummary(s);
            const catGroups = groupObservationChipsByCategory(checklist, s.label, (config && config.chipBank) || (classObj && classObj.chipBank) || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null), s.kind);
            const textStr = String(s.text || "").trim();

            if (label) sections.push(`#### ${label}`);

            if (catGroups.length > 0) {
              catGroups.forEach(cg => {
                const chipsStr = cg.chips.map(c => {
                  const p = (c && typeof c === 'object') ? c : parseObservationChipItem(c);
                  const rems = Array.isArray(p.remarks) ? p.remarks : parseChipRemarksString(p.comment || '');
                  const thickness = getChipUnderlineThickness(p.count);
                  const numOnlyRems = rems.filter(r => (!r.text || !r.text.trim()) && r.num && r.num.trim());
                  const textRems = rems.filter(r => r.text && r.text.trim());
                  const numOnlyStr = numOnlyRems.length > 0
                    ? numOnlyRems.map(r => `<sup>[${remarkAllocator.next(r)}]</sup>`).join('')
                    : '';
                  const remsStr = textRems.length > 0
                    ? `: ${textRems.map(r => {
                        const rawNum = r && r.num ? String(r.num).trim() : '';
                        const displayNum = rawNum ? remarkAllocator.next(r) : '';
                        return displayNum ? `${r.text}<sup>[${displayNum}]</sup>` : r.text;
                      }).join(', ')}`
                    : '';
                  return thickness !== '0px'
                    ? `<span style="text-decoration:underline;text-decoration-thickness:${thickness};text-underline-offset:2px;">\`${p.name}\`</span>${numOnlyStr}${remsStr}`
                    : `\`${p.name}\`${numOnlyStr}${remsStr}`;
                }).join("; ");
                sections.push(`- *${cg.category}:* ${chipsStr}`);
              });
            }
            if (textStr) {
              sections.push(`> ${textStr}`);
            }
            sections.push("");
          });
        }

        sections.push(`### ${t('gsReportSectionGradingScale') || 'Grading Scale'}`);
        sections.push(`| ${t('gsColGrade') || 'Grade'} | ${t('gsReportMinPct') || 'Min %'} | ${t('gsReportMinPts') || 'Min pts'} |`);
        sections.push(`| --- | --- | --- |`);
        thresholds.forEach(t => {
          const pct = `${Math.round(t.ratio * 100)}%`;
          const pts = defaultTotals.totalPossible > 0 ? fmtN(t.ratio * defaultTotals.totalPossible) : "-";
          sections.push(`| ${mdEsc(t.grade)} | ${mdEsc(pct)} | ${mdEsc(pts)} |`);
        });
        sections.push("");
      });

      return sections.join("\n");
    }

    async function exportTestDocx(classObj, sem, testIndex) {
      if (!window.Desktop || !Desktop.isElectron()) {
        await showAlert(t('gsAlertDocxDesktopOnly'));
        return;
      }
      if (!classObj || sem == null || testIndex == null) return;
      const markdown = buildTestResultsDocxMarkdown(classObj, sem, testIndex);
      const slug = slugifyForPath(classObj.name || "class");
      const baseName = `${slug}-${sem}-t${testIndex + 1}-${new Date().toISOString().slice(0, 10)}`;
      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename: `${baseName}.docx`,
          docxRequest: {
            markdown,
            defaultName: baseName,
            fontFamily: 'Segoe UI',
            fontSize: '10pt',
            lineHeight: '1.2',
            margins: { top: 18, right: 16, bottom: 18, left: 16 },
            size: 'A4',
            orientation: 'portrait'
          }
        });
      }
      const result = await Desktop.exportDocx({
        markdown,
        defaultName: baseName,
        fontFamily: 'Segoe UI',
        fontSize: '10pt',
        lineHeight: '1.2',
        margins: { top: 18, right: 16, bottom: 18, left: 16 },
        size: 'A4',
        orientation: 'portrait'
      });
      if (result && result.ok) {
        if (window.showExportSuccessPopup && result.path) {
          showExportSuccessPopup(result.path, result.name || `${baseName}.docx`);
        }
        return;
      }
      if (result && !result.canceled) {
        await showAlert(t('gsAlertDocxExportFailed'));
      }
    }

    async function exportActiveTestDocx() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      return exportTestDocx(classObj, appState.activeTest.semester, appState.activeTest.testIndex);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── COMPREHENSIVE REPORT ENGINE (Whole Class & Student: Year / Sem / Test) ──
    // ═══════════════════════════════════════════════════════════════════════════


    let _currentActiveReport = null; // { html, title, defaultFilename, isLandscape, markdown }

    function calcComprehensiveStats(values) {
      const nums = (values || []).filter(v => v != null && !isNaN(Number(v))).map(Number);
      if (!nums.length) {
        return {
          count: 0, mean: null, median: null, mode: null, stdDev: null,
          min: null, max: null, q1: null, q3: null, iqr: null,
          passCount: 0, passRate: 0, distinctionCount: 0, distinctionRate: 0,
          failCount: 0, failRate: 0
        };
      }
      const sorted = [...nums].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const mean = sum / count;

      const mid = Math.floor(count / 2);
      const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

      const q1Idx = Math.floor(count * 0.25);
      const q3Idx = Math.floor(count * 0.75);
      const q1 = sorted[q1Idx];
      const q3 = sorted[q3Idx];
      const iqr = q3 - q1;

      const variance = count > 1
        ? sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1)
        : 0;
      const stdDev = Math.sqrt(variance);

      const min = sorted[0];
      const max = sorted[count - 1];

      // Mode calculation
      const countsMap = {};
      let maxFreq = 0;
      let mode = null;
      sorted.forEach(v => {
        const key = Math.round(v * 10) / 10;
        countsMap[key] = (countsMap[key] || 0) + 1;
        if (countsMap[key] > maxFreq) {
          maxFreq = countsMap[key];
          mode = key;
        }
      });

      const passCount = sorted.filter(v => v >= 4.0).length;
      const passRate = (passCount / count) * 100;
      const distinctionCount = sorted.filter(v => v >= 5.5).length;
      const distinctionRate = (distinctionCount / count) * 100;
      const failCount = count - passCount;
      const failRate = (failCount / count) * 100;

      return {
        count, mean, median, mode, stdDev, min, max, q1, q3, iqr,
        passCount, passRate, distinctionCount, distinctionRate, failCount, failRate
      };
    }

    function calcGradeBuckets(grades) {
      const buckets = [
        { label: "< 3.0", min: 0, max: 2.99, color: "#e53935", count: 0, percentage: 0 },
        { label: "3.0–3.9", min: 3.0, max: 3.99, color: "#ffb74d", count: 0, percentage: 0 },
        { label: "4.0–4.4", min: 4.0, max: 4.49, color: "#dce775", count: 0, percentage: 0 },
        { label: "4.5–4.9", min: 4.5, max: 4.99, color: "#a5d6a7", count: 0, percentage: 0 },
        { label: "5.0–5.4", min: 5.0, max: 5.49, color: "#66bb6a", count: 0, percentage: 0 },
        { label: "5.5–6.0", min: 5.5, max: 6.01, color: "#2ecc40", count: 0, percentage: 0 }
      ];
      const valid = (grades || []).filter(g => g != null && !isNaN(Number(g))).map(Number);
      const total = valid.length;
      if (total === 0) return buckets;

      valid.forEach(g => {
        for (let i = 0; i < buckets.length; i++) {
          const b = buckets[i];
          if (g >= b.min && g <= b.max) {
            b.count++;
            break;
          }
        }
      });

      buckets.forEach(b => {
        b.percentage = total > 0 ? (b.count / total) * 100 : 0;
      });

      return buckets;
    }

    function calcPointsBuckets(pointsArray, maxPoints, binCount = 5) {
      const valid = (pointsArray || []).filter(p => p != null && !isNaN(Number(p))).map(Number);
      const total = valid.length;
      const effectiveMax = maxPoints > 0 ? maxPoints : (valid.length ? Math.max(...valid) : 100);
      const step = effectiveMax / binCount;
      const buckets = [];

      for (let i = 0; i < binCount; i++) {
        const bMin = Math.round(i * step * 10) / 10;
        const bMax = Math.round((i + 1) * step * 10) / 10;
        buckets.push({
          label: `${bMin}–${bMax}`,
          min: bMin,
          max: bMax,
          count: 0,
          percentage: 0,
          color: "#90caf9"
        });
      }

      valid.forEach(p => {
        let placed = false;
        for (let i = 0; i < buckets.length; i++) {
          const b = buckets[i];
          if (p >= b.min && (i === buckets.length - 1 ? p <= b.max : p < b.max)) {
            b.count++;
            placed = true;
            break;
          }
        }
        if (!placed && buckets.length > 0) {
          buckets[buckets.length - 1].count++;
        }
      });

      buckets.forEach(b => {
        b.percentage = total > 0 ? (b.count / total) * 100 : 0;
      });

      return buckets;
    }

    function getNeobrutalistReportCss(isLandscape = false, fitToOnePage = getReportFitToOnePage()) {
      const pdfSettings = getPdfExportSettings();
      const orientation = isLandscape ? 'landscape' : 'portrait';
      const size = `${pdfSettings.pageSize || 'A4'} ${orientation}`;
      const pageMargin = fitToOnePage ? '6mm 8mm 6mm 8mm' : (pdfSettings.margin || '12mm');
      return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--exp-font-family, 'Lexend', system-ui, -apple-system, sans-serif); font-size: ${fitToOnePage ? '10px' : '11px'}; color: var(--exp-text-color, #1e293b); background: var(--exp-bg-page, #fff); line-height: ${fitToOnePage ? '1.25' : '1.35'}; }
        .report-page {
          width: ${isLandscape ? '297mm' : '210mm'};
          min-height: ${isLandscape ? '210mm' : '297mm'};
          ${fitToOnePage ? `max-height: ${isLandscape ? '210mm' : '297mm'}; overflow: hidden;` : ''}
          padding: ${fitToOnePage ? '6mm 8mm 5mm 8mm' : '12mm 14mm 10mm 14mm'};
          margin: 0 auto;
          page-break-after: always;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          gap: ${fitToOnePage ? '5px' : '10px'};
          background: var(--exp-bg-surface, #fff);
        }
        .report-header {
          border-bottom: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333);
          padding-bottom: ${fitToOnePage ? '4px' : '6px'};
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: ${fitToOnePage ? '1px' : '2px'};
        }
        .report-title { font-size: ${fitToOnePage ? '13.5px' : '16px'}; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; color: var(--exp-text-color, #1e293b); }
        .report-subtitle { font-size: ${fitToOnePage ? '9.5px' : '11px'}; font-weight: 600; color: var(--exp-text-muted, #64748b); margin-top: 1px; }
        .report-meta { font-size: ${fitToOnePage ? '9px' : '10px'}; font-weight: 700; color: var(--exp-text-muted, #4b5563); text-align: right; }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: ${fitToOnePage ? '5px' : '8px'};
        }
        .kpi-card {
          border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333);
          box-shadow: var(--exp-shadow, ${fitToOnePage ? '2px 2px 0 #555555' : '3px 3px 0 #555555'});
          border-radius: var(--exp-border-radius, 6px);
          padding: ${fitToOnePage ? '4px 7px' : '6px 10px'};
          background: var(--exp-bg-surface, #ffffff);
        }
        .kpi-label { font-size: ${fitToOnePage ? '8px' : '9px'}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--exp-text-muted, #64748b); margin-bottom: 1px; }
        .kpi-value { font-size: ${fitToOnePage ? '14px' : '17px'}; font-weight: 800; color: var(--exp-text-color, #1e293b); }
        .kpi-sub { font-size: ${fitToOnePage ? '8px' : '9px'}; font-weight: 600; color: var(--exp-text-muted, #64748b); margin-top: 1px; }
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${fitToOnePage ? '6px' : '10px'};
        }
        .section-heading {
          font-size: ${fitToOnePage ? '9.5px' : '12px'};
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333);
          padding-bottom: 1px;
          margin-top: ${fitToOnePage ? '2px' : '4px'};
          margin-bottom: ${fitToOnePage ? '2px' : '4px'};
          color: var(--exp-text-color, #1e293b);
        }
        table, table.report-table, .scale-table {
          width: 100%;
          border-collapse: collapse !important;
          border: 1px solid #000000 !important;
          font-size: ${fitToOnePage ? '9px' : '10.5px'};
          background: var(--exp-bg-surface, #ffffff);
          box-shadow: none !important;
        }
        th, td, table.report-table th, table.report-table td, .scale-table th, .scale-table td {
          border: 1px solid #000000 !important;
          padding: ${fitToOnePage ? '2.5px 5px' : '4px 6px'};
          text-align: left;
          color: var(--exp-text-color, #1e293b);
        }
        table.report-table { table-layout: auto; }
        table.report-table th, table.report-table td {
          padding: ${fitToOnePage ? '2px 4px' : '3px 5px'};
        }
        table.report-table th:first-child, table.report-table td:first-child { white-space: nowrap; }
        th, thead th, table.report-table th, .scale-table thead th { background: var(--exp-table-th-bg, #f0f0eb); font-weight: 800; color: var(--exp-text-color, #1e293b); border-bottom: 2px solid #000000 !important; }
        table.report-table td.center, table.report-table th.center { text-align: center; padding: ${fitToOnePage ? '2px 3px' : '3px 3px'}; white-space: nowrap; }
        table.report-table td.right, table.report-table th.right { text-align: right; padding: ${fitToOnePage ? '2px 3px' : '3px 3px'}; white-space: nowrap; }
        table.report-table tr.stats-row td, tr.stats-row td, .total-row td { background: var(--exp-table-th-bg, #f0f0eb); font-weight: 800; font-size: ${fitToOnePage ? '8.5px' : '9.5px'}; border-top: 2px solid #000000 !important; }
        table.report-table tr:nth-child(even) td:not(.stats-row td), tbody tr:nth-child(even) td:not(.stats-row td) { background: var(--exp-table-row-even, #fafafa); }
        .crit-pts-scored {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 800;
          color: var(--crit-fg, #111111);
          background: var(--crit-bg, transparent);
          border: 1px solid var(--crit-border, transparent);
        }
        .crit-pts-max { color: #111111; font-weight: 600; }
        .crit-pts-empty { color: #888888; }
        .grade-pill {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 800;
          border: var(--exp-border-width, 1.5px) solid var(--exp-border-color, #333333);
          font-size: ${fitToOnePage ? '9.5px' : '10.5px'};
        }
        .badge {
          display: inline-block;
          padding: ${fitToOnePage ? '1px 6px' : '2px 8px'};
          border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333);
          box-shadow: var(--exp-shadow, 2px 2px 0 #555555);
          border-radius: var(--exp-border-radius, 4px);
          font-weight: 800;
          font-size: ${fitToOnePage ? '10.5px' : '12px'};
          background: var(--exp-bg-surface, #fdfdfa);
          color: var(--exp-text-color, #1e293b);
        }
        .grade-band-6 { background: #2ecc40 !important; color: #fff !important; }
        .grade-band-5 { background: #a5d6a7 !important; color: #1a3a1a !important; }
        .grade-band-4 { background: #ffb74d !important; color: #3a1800 !important; }
        .grade-band-3 { background: #ef9a9a !important; color: #3a0000 !important; }
        .grade-band-low { background: #e53935 !important; color: #fff !important; }
        .delta-pos { color: #2e7d32 !important; font-weight: 800; }
        .delta-neg { color: #c62828 !important; font-weight: 800; }
        .cell-sem1-avg { background: #e3f2fd !important; }
        .cell-sem2-avg { background: #e8f5e9 !important; }
        .cell-year-avg { background: #fff9c4 !important; }
        .obs-section { margin-bottom: ${fitToOnePage ? '4px' : '8px'}; }
        .obs-label { font-size: ${fitToOnePage ? '10px' : '11.5px'}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: #1e293b; margin-bottom: 1px; }
        .obs-category-span {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px;
          margin: 0 4px 0 0;
          vertical-align: middle;
        }
        .obs-category-tag {
          font-size: ${fitToOnePage ? '8px' : '10px'};
          font-weight: 800;
          text-transform: none;
          letter-spacing: 0.02em;
          color: #333333;
          margin-right: 2px;
          white-space: nowrap;
        }
        .obs-pills-row { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 1px; margin-bottom: 2px; }
        .obs-pill,
        .obs-feedback .obs-pill,
        .obs-section .obs-pill {
          display: inline-block;
          padding: ${fitToOnePage ? '0.5px 3.5px' : '1px 4px'};
          border-radius: 4px;
          font-size: ${fitToOnePage ? '8px' : '9px'};
          font-weight: 700;
          line-height: 1.15;
          margin: 1px 3px 1px 0;
          background: transparent !important;
          box-shadow: none !important;
        }
        .obs-pill-good { color: #166534; border: 0.5px dotted #16a34a; }
        .obs-pill-remedy { color: #991b1b; border: 0.5px dotted #dc2626; }
        .obs-pill-custom { color: #0369a1; border: 0.5px dotted #0284c7; }
        .obs-pill-multiplier { font-size: 0.68em; font-weight: 800; line-height: 0; vertical-align: super; margin-left: 2px; margin-right: 3px; display: inline-block; white-space: nowrap; }
        .obs-feedback {
          display: block;
          padding: 0;
          background: transparent;
          border: none;
          font-size: ${fitToOnePage ? '8.5px' : '9.5px'};
          line-height: ${fitToOnePage ? '1.2' : '1.35'};
          color: #1e293b;
        }
        .obs-feedback-body { display: block; white-space: normal; }
        .obs-feedback-body p { margin: 0; }
        .obs-feedback-body p:last-child { margin-bottom: 0; }
        .obs-inline-row { margin-bottom: 2px; }
        .obs-inline-text { display: block; font-size: ${fitToOnePage ? '8.5px' : '9.5px'}; color: #1e293b; }
        .crit-comment-cell, td.crit-comment-cell, table.report-table td.crit-comment-cell {
          font-size: ${fitToOnePage ? '8.5px' : '9.5px'} !important;
          line-height: 1.3 !important;
          vertical-align: top;
          padding-left: 5px !important;
          padding-right: 5px !important;
        }
        .crit-comment-cell p, td.crit-comment-cell p, table.report-table td.crit-comment-cell p,
        .crit-comment-cell ul, td.crit-comment-cell ul, table.report-table td.crit-comment-cell ul,
        .crit-comment-cell ol, td.crit-comment-cell ol, table.report-table td.crit-comment-cell ol {
          margin: 0 0 2px 0 !important;
          padding-left: 0 !important;
          margin-left: 0 !important;
          font-size: ${fitToOnePage ? '8.5px' : '9.5px'} !important;
          line-height: 1.3 !important;
        }
        .crit-comment-cell p:last-child, td.crit-comment-cell p:last-child, table.report-table td.crit-comment-cell p:last-child {
          margin-bottom: 0 !important;
        }
        @page { size: ${size}; margin: ${pageMargin}; }
        @media print {
          *, *:before, *:after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { background: #fff; margin: 0; padding: 0; }
          .report-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 5px 6px 0 !important;
            margin: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box !important;
          }
          table, table.report-table, .scale-table {
            border: 1px solid #000000 !important;
            border-collapse: collapse !important;
            box-shadow: none !important;
          }
          th, td, table.report-table th, table.report-table td, .scale-table th, .scale-table td {
            border: 1px solid #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .kpi-card, .badge, .grade-pill {
            border: 1.5px solid #333333 !important;
            box-shadow: none !important;
          }
          .report-header, .section-heading {
            border-bottom: 2px solid #333333 !important;
          }
        }
      `;
    }

    function getReportAutoScaleScript(isLandscape = false, fitToOnePage = getReportFitToOnePage()) {
      if (!fitToOnePage) return '';
      const targetH = isLandscape ? 740 : 1050;
      return `<script>
        (function() {
          function autoScale() {
            var pages = document.querySelectorAll('.report-page, .student-page');
            var target = ${targetH};
            pages.forEach(function(p) {
              p.style.transform = '';
              p.style.transformOrigin = 'top left';
              p.style.width = '';
              var h = p.scrollHeight;
              if (h > target) {
                var scale = Math.max(0.55, Math.min(1, (target - 6) / h));
                p.style.transform = 'scale(' + scale + ')';
                p.style.width = (100 / scale) + '%';
              }
            });
          }
          if (document.readyState === 'complete') autoScale();
          else { window.addEventListener('load', autoScale); setTimeout(autoScale, 60); }
          window.addEventListener('resize', autoScale);
        })();
      <\\/script>`;
    }

    function renderNeobrutalistSvgHistogram({ buckets, title, xLabel = "Grades", yLabel = "Students" }) {
      const w = 500;
      const h = 200;
      const padL = 40;
      const padR = 16;
      const padT = 32;
      const padB = 36;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      const maxCount = Math.max(1, ...buckets.map(b => b.count));
      const yTicksCount = Math.min(4, maxCount);
      const yStep = Math.ceil(maxCount / yTicksCount);
      const yMax = yStep * yTicksCount;

      let gridLines = '';
      for (let i = 0; i <= yTicksCount; i++) {
        const val = i * yStep;
        const yPos = padT + plotH - (val / yMax) * plotH;
        gridLines += `<line x1="${padL}" y1="${yPos}" x2="${w - padR}" y2="${yPos}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>`;
        gridLines += `<text x="${padL - 6}" y="${yPos + 3}" font-size="9" font-weight="700" fill="#64748b" text-anchor="end">${val}</text>`;
      }

      const barWidth = Math.max(14, Math.floor((plotW / buckets.length) * 0.72));
      const slotWidth = plotW / buckets.length;

      let bars = '';
      buckets.forEach((b, i) => {
        const barH = (b.count / yMax) * plotH;
        const x = padL + i * slotWidth + (slotWidth - barWidth) / 2;
        const y = padT + plotH - barH;
        const countText = b.count > 0 ? `${b.count} (${Math.round(b.percentage)}%)` : '0';

        bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${b.color || '#4caf50'}" stroke="#333333" stroke-width="2" rx="3" />`;
        bars += `<text x="${x + barWidth / 2}" y="${y - 5}" font-size="9.5" font-weight="800" fill="#1e293b" text-anchor="middle">${countText}</text>`;
        bars += `<text x="${x + barWidth / 2}" y="${h - 10}" font-size="9.5" font-weight="700" fill="#1e293b" text-anchor="middle">${b.label}</text>`;
      });

      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;box-shadow:3px 3px 0 #555555;border-radius:6px;overflow:visible;">
        <text x="12" y="18" font-size="10.5" font-weight="800" fill="#1e293b" text-transform="uppercase" letter-spacing="0.04em">${title || 'Grade Distribution'}</text>
        ${gridLines}
        <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#333333" stroke-width="2"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#333333" stroke-width="2"/>
        ${bars}
      </svg>`;
    }

    function renderNeobrutalistSvgTimeline({ series, categories, title, yMin = 1, yMax = 6 }) {
      const w = 500;
      const needsAngled = categories.length > 3 || categories.some(c => String(c).length > 6);
      const padB = needsAngled ? 62 : 30;
      const h = needsAngled ? 225 : 190;
      const padL = 36;
      const padR = 16;
      const padT = 34;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      const yRange = yMax - yMin;
      const getY = val => padT + plotH - ((val - yMin) / yRange) * plotH;
      const getX = idx => categories.length <= 1 ? padL + plotW / 2 : padL + (idx / (categories.length - 1)) * plotW;

      const passY = getY(4.0);
      const passLine = (passY >= padT && passY <= padT + plotH)
        ? `<line x1="${padL}" y1="${passY}" x2="${w - padR}" y2="${passY}" stroke="#e53935" stroke-width="1.5" stroke-dasharray="4,4" />
           <text x="${w - padR}" y="${passY - 4}" font-size="8.5" font-weight="800" fill="#e53935" text-anchor="end">Pass (4.0)</text>`
        : '';

      let yTicks = '';
      for (let y = yMin; y <= yMax; y += 1) {
        const yPos = getY(y);
        yTicks += `<line x1="${padL}" y1="${yPos}" x2="${w - padR}" y2="${yPos}" stroke="#eee" stroke-width="1"/>`;
        yTicks += `<text x="${padL - 6}" y="${yPos + 3}" font-size="9" font-weight="700" fill="#64748b" text-anchor="end">${y.toFixed(1)}</text>`;
      }

      let xLabels = '';
      categories.forEach((rawCat, i) => {
        const xPos = getX(i);
        const catStr = String(rawCat || '');
        const maxLen = categories.length > 6 ? 16 : 22;
        const displayCat = catStr.length > maxLen ? catStr.slice(0, maxLen - 1) + '…' : catStr;
        const escCat = escapeHtml(catStr);
        const escDisplay = escapeHtml(displayCat);
        const yBase = padT + plotH + 11;

        if (needsAngled) {
          xLabels += `<text x="${xPos}" y="${yBase}" font-size="8.5" font-weight="700" fill="#1e293b" text-anchor="end" transform="rotate(-35, ${xPos}, ${yBase})"><title>${escCat}</title>${escDisplay}</text>`;
        } else {
          xLabels += `<text x="${xPos}" y="${yBase + 3}" font-size="9.5" font-weight="700" fill="#1e293b" text-anchor="middle"><title>${escCat}</title>${escDisplay}</text>`;
        }
      });

      let seriesSvg = '';
      (series || []).forEach(s => {
        const pts = [];
        s.data.forEach((val, i) => {
          if (val != null && !isNaN(val)) {
            pts.push({ x: getX(i), y: getY(val), val });
          }
        });
        if (pts.length > 1) {
          const pathD = pts.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
          seriesSvg += `<path d="${pathD}" fill="none" stroke="${s.color || '#333333'}" stroke-width="${s.strokeWidth || 2.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        pts.forEach(p => {
          seriesSvg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${s.color || '#333333'}" stroke="#333333" stroke-width="1.5"/>`;
          seriesSvg += `<text x="${p.x}" y="${p.y - 6}" font-size="9" font-weight="800" fill="#1e293b" text-anchor="middle">${p.val.toFixed(2)}</text>`;
        });
      });

      let legend = '';
      let legX = w - padR;
      (series || []).slice().reverse().forEach(s => {
        legend += `<rect x="${legX - 10}" y="10" width="8" height="8" fill="${s.color || '#333333'}" stroke="#333333" stroke-width="1.2" rx="1.5"/>`;
        legend += `<text x="${legX - 14}" y="17" font-size="9" font-weight="800" fill="#1e293b" text-anchor="end">${s.name}</text>`;
        legX -= (s.name.length * 6 + 28);
      });

      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;box-shadow:3px 3px 0 #555555;border-radius:6px;overflow:visible;">
        <text x="12" y="18" font-size="10.5" font-weight="800" fill="#1e293b" text-transform="uppercase" letter-spacing="0.04em">${title || 'Progression'}</text>
        ${legend}
        ${yTicks}
        ${passLine}
        <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#333333" stroke-width="2"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#333333" stroke-width="2"/>
        ${seriesSvg}
        ${xLabels}
      </svg>`;
    }

    function renderNeobrutalistSvgGroupedBars({ categories, series, title, yMin = 0, yMax = null }) {
      const w = 500;
      const needsAngled = categories.length > 5 || categories.some(c => String(c).length > 8);
      const padB = needsAngled ? 56 : 30;
      const h = needsAngled ? 225 : 190;
      const padL = 40;
      const padR = 16;
      const padT = 34;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      const allVals = series.flatMap(s => s.data.filter(v => v != null && !isNaN(v)));
      const effMax = yMax != null ? yMax : (allVals.length ? Math.max(6, Math.ceil(Math.max(...allVals))) : 6);
      const effMin = yMin;
      const yRange = effMax - effMin;

      let yTicks = '';
      const step = effMax > 6 ? Math.ceil(effMax / 4) : 1;
      for (let y = effMin; y <= effMax; y += step) {
        const yPos = padT + plotH - ((y - effMin) / yRange) * plotH;
        yTicks += `<line x1="${padL}" y1="${yPos}" x2="${w - padR}" y2="${yPos}" stroke="#eee" stroke-width="1"/>`;
        yTicks += `<text x="${padL - 6}" y="${yPos + 3}" font-size="9" font-weight="700" fill="#64748b" text-anchor="end">${y}</text>`;
      }

      const numCats = categories.length;
      const slotW = plotW / Math.max(1, numCats);
      const numSeries = series.length;
      const barW = Math.max(8, Math.floor((slotW * 0.74) / numSeries));

      let bars = '';
      categories.forEach((rawCat, ci) => {
        const catStr = String(rawCat || '');
        const maxLen = categories.length > 6 ? 14 : 20;
        const displayCat = catStr.length > maxLen ? catStr.slice(0, maxLen - 1) + '…' : catStr;
        const escCat = escapeHtml(catStr);
        const escDisplay = escapeHtml(displayCat);

        const groupStart = padL + ci * slotW + (slotW - (barW * numSeries + (numSeries - 1) * 2)) / 2;
        series.forEach((s, si) => {
          const val = s.data[ci];
          if (val != null && !isNaN(val)) {
            const barH = ((val - effMin) / yRange) * plotH;
            const x = groupStart + si * (barW + 2);
            const y = padT + plotH - barH;
            bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${s.color || '#42a5f5'}" stroke="#333333" stroke-width="2" rx="2"/>`;
            bars += `<text x="${x + barW / 2}" y="${y - 4}" font-size="8.5" font-weight="800" fill="#1e293b" text-anchor="middle">${val.toFixed(1)}</text>`;
          }
        });
        const catX = padL + ci * slotW + slotW / 2;
        const yBase = padT + plotH + 11;
        if (needsAngled) {
          bars += `<text x="${catX}" y="${yBase}" font-size="8.5" font-weight="700" fill="#1e293b" text-anchor="end" transform="rotate(-35, ${catX}, ${yBase})"><title>${escCat}</title>${escDisplay}</text>`;
        } else {
          bars += `<text x="${catX}" y="${yBase + 3}" font-size="9.5" font-weight="700" fill="#1e293b" text-anchor="middle"><title>${escCat}</title>${escDisplay}</text>`;
        }
      });

      let legend = '';
      let legX = w - padR;
      series.slice().reverse().forEach(s => {
        legend += `<rect x="${legX - 10}" y="10" width="8" height="8" fill="${s.color || '#333333'}" stroke="#333333" stroke-width="1.2" rx="1.5"/>`;
        legend += `<text x="${legX - 14}" y="17" font-size="9" font-weight="800" fill="#1e293b" text-anchor="end">${s.name}</text>`;
        legX -= (s.name.length * 6 + 28);
      });

      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;box-shadow:3px 3px 0 #555555;border-radius:6px;overflow:visible;">
        <text x="12" y="18" font-size="10.5" font-weight="800" fill="#1e293b" text-transform="uppercase" letter-spacing="0.04em">${title || 'Comparison'}</text>
        ${legend}
        ${yTicks}
        <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#333333" stroke-width="2"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#333333" stroke-width="2"/>
        ${bars}
      </svg>`;
    }

    function renderNeobrutalistSvgQuartileBox({ min, q1, median, q3, max, studentVal = null, title = "Class Distribution (Quartiles & Extremes)" }) {
      const w = 500;
      const h = 100;
      const padL = 36;
      const padR = 36;
      const padT = 32;
      const plotW = w - padL - padR;

      if (min == null || max == null || min === max) {
        return `<svg viewBox="0 0 ${w} 50" width="100%" height="50" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;border-radius:6px;"><text x="20" y="30" font-size="10" font-weight="700" fill="#64748b">Insufficient data for distribution box</text></svg>`;
      }

      const scaleMin = 1.0;
      const scaleMax = 6.0;
      const getX = val => padL + ((Math.max(scaleMin, Math.min(scaleMax, val)) - scaleMin) / (scaleMax - scaleMin)) * plotW;

      const xMin = getX(min);
      const xQ1 = getX(q1 != null ? q1 : min);
      const xMed = getX(median != null ? median : (min + max) / 2);
      const xQ3 = getX(q3 != null ? q3 : max);
      const xMax = getX(max);

      const boxY = padT + 8;
      const boxH = 22;

      const whisker = `<line x1="${xMin}" y1="${boxY + boxH / 2}" x2="${xMax}" y2="${boxY + boxH / 2}" stroke="#333333" stroke-width="2"/>
        <line x1="${xMin}" y1="${boxY + 3}" x2="${xMin}" y2="${boxY + boxH - 3}" stroke="#333333" stroke-width="2"/>
        <line x1="${xMax}" y1="${boxY + 3}" x2="${xMax}" y2="${boxY + boxH - 3}" stroke="#333333" stroke-width="2"/>`;

      const box = `<rect x="${xQ1}" y="${boxY}" width="${Math.max(2, xQ3 - xQ1)}" height="${boxH}" fill="#e0f2fe" stroke="#333333" stroke-width="2" rx="2"/>
        <line x1="${xMed}" y1="${boxY}" x2="${xMed}" y2="${boxY + boxH}" stroke="#333333" stroke-width="3"/>`;

      const labels = `
        <text x="${xMin}" y="${boxY + boxH + 14}" font-size="8.5" font-weight="800" fill="#1e293b" text-anchor="middle">Min: ${min.toFixed(1)}</text>
        <text x="${xMed}" y="${boxY - 4}" font-size="8.5" font-weight="800" fill="#1e293b" text-anchor="middle">Median: ${median.toFixed(2)}</text>
        <text x="${xMax}" y="${boxY + boxH + 14}" font-size="8.5" font-weight="800" fill="#1e293b" text-anchor="middle">Max: ${max.toFixed(1)}</text>
      `;

      let studentMarker = '';
      if (studentVal != null && !isNaN(studentVal)) {
        const stuX = getX(studentVal);
        studentMarker = `
          <polygon points="${stuX},${boxY - 8} ${stuX - 5},${boxY - 16} ${stuX + 5},${boxY - 16}" fill="#e53935" stroke="#333333" stroke-width="1.2" />
          <text x="${stuX}" y="${boxY - 19}" font-size="9" font-weight="800" fill="#e53935" text-anchor="middle">Student (${studentVal.toFixed(2)})</text>
        `;
      }

      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;box-shadow:3px 3px 0 #555555;border-radius:6px;overflow:visible;">
        <text x="12" y="18" font-size="10.5" font-weight="800" fill="#1e293b" text-transform="uppercase" letter-spacing="0.04em">${title}</text>
        ${whisker}
        ${box}
        ${labels}
        ${studentMarker}
      </svg>`;
    }

    function renderNeobrutalistSvgBenchmarkGauge({ studentVal, classAvg, maxVal = 6, minVal = 1, label = "Grade Benchmark" }) {
      const w = 480;
      const h = 76;
      const padL = 32;
      const padR = 32;
      const padT = 28;
      const plotW = w - padL - padR;

      const getX = v => padL + ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / (maxVal - minVal)) * plotW;
      const barH = 14;
      const barY = padT + 4;

      const passX = getX(4.0);
      const redW = passX - padL;
      const greenW = (padL + plotW) - passX;

      const stuX = getX(studentVal != null ? studentVal : minVal);
      const avgX = getX(classAvg != null ? classAvg : minVal);

      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;box-shadow:3px 3px 0 #555555;border-radius:6px;overflow:visible;box-sizing:border-box;min-height:${h}px;">
        <text x="12" y="16" font-size="10" font-weight="800" fill="#1e293b" text-transform="uppercase" letter-spacing="0.04em">${label}</text>
        <rect x="${padL}" y="${barY}" width="${redW}" height="${barH}" fill="#ffcdd2" stroke="#333333" stroke-width="2"/>
        <rect x="${passX}" y="${barY}" width="${greenW}" height="${barH}" fill="#c8e6c9" stroke="#333333" stroke-width="2"/>
        
        <line x1="${avgX}" y1="${barY - 3}" x2="${avgX}" y2="${barY + barH + 3}" stroke="#1976d2" stroke-width="2.5"/>
        <text x="${avgX}" y="${barY + barH + 15}" font-size="8.5" font-weight="800" fill="#1976d2" text-anchor="middle">Class Mean: ${classAvg != null ? classAvg.toFixed(2) : '-'}</text>

        <polygon points="${stuX},${barY} ${stuX - 5},${barY - 8} ${stuX + 5},${barY - 8}" fill="#333333" stroke="#333333" stroke-width="1"/>
        <text x="${stuX}" y="${barY - 11}" font-size="9" font-weight="800" fill="#1e293b" text-anchor="middle">Score: ${studentVal != null ? studentVal.toFixed(2) : '-'}</text>
      </svg>`;
    }

    function renderNeobrutalistSvgCriteriaBars({ criteriaItems, title = "Criteria Performance (% Average)" }) {
      const w = 500;
      const rowH = 26;
      const padT = 32;
      const padB = 14;
      const padL = 140;
      const padR = 60;
      const plotW = w - padL - padR;
      const h = padT + padB + Math.max(1, criteriaItems.length) * rowH;

      if (!criteriaItems.length) {
        return `<svg viewBox="0 0 ${w} 50" width="100%" height="50" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;border-radius:6px;"><text x="14" y="30" font-size="10" font-weight="700" fill="#64748b">No criteria configured</text></svg>`;
      }

      let rows = '';
      criteriaItems.forEach((cr, i) => {
        const y = padT + i * rowH;
        const pct = Math.max(0, Math.min(100, cr.pct != null ? cr.pct : 0));
        const barW = (pct / 100) * plotW;
        const color = pct >= 80 ? '#66bb6a' : (pct >= 60 ? '#a5d6a7' : (pct >= 40 ? '#ffb74d' : '#ef5350'));

        rows += `
          <text x="${padL - 10}" y="${y + 13}" font-size="9" font-weight="700" fill="#1e293b" text-anchor="end">${escapeHtml(cr.name)}</text>
          <rect x="${padL}" y="${y + 2}" width="${plotW}" height="14" fill="#f0f0eb" stroke="#333333" stroke-width="1.5" rx="2"/>
          <rect x="${padL}" y="${y + 2}" width="${barW}" height="14" fill="${color}" stroke="#333333" stroke-width="1.5" rx="2"/>
          <text x="${padL + plotW + 8}" y="${y + 13}" font-size="9" font-weight="800" fill="#1e293b">${Math.round(pct)}% (${cr.avgPts != null ? cr.avgPts.toFixed(1) : '-'}/${cr.maxPts})</text>
        `;
      });

      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:2px solid #333333;box-shadow:3px 3px 0 #555555;border-radius:6px;overflow:visible;">
        <text x="12" y="18" font-size="10.5" font-weight="800" fill="#1e293b" text-transform="uppercase" letter-spacing="0.04em">${title}</text>
        ${rows}
      </svg>`;
    }

    // ── Class Report HTML Builders ──

    function buildClassYearReportHtml(classObj, fitToOnePage = getReportFitToOnePage(), options = {}) {
      ensureClassStructures(classObj);
      const opts = (typeof options === 'object' && options !== null) ? options : {};
      const incChips = opts.includeObservationChips !== undefined
        ? !!opts.includeObservationChips
        : (opts.includeObservations !== undefined ? !!opts.includeObservations : getReportIncludeObservationChips());
      const n1 = classObj.testCounts.sem1;
      const n2 = classObj.testCounts.sem2;

      const studentRows = classObj.students.map(student => {
        const c = computeStudent(student, classObj);
        const s1Grades = Array.from({ length: n1 }, (_, i) => getTestDisplayGrade(student, classObj, "sem1", i));
        const s2Grades = Array.from({ length: n2 }, (_, i) => getTestDisplayGrade(student, classObj, "sem2", i));
        return {
          student,
          s1Grades,
          s2Grades,
          sem1Avg: c.sem1Avg,
          sem2Avg: c.sem2Avg,
          yearAvg: c.yearAvg,
          roundedFinal: c.roundedFinal,
          rank: c.rank
        };
      });

      const allYearAvgs = studentRows.map(r => r.yearAvg).filter(v => v != null);
      const allS1Avgs = studentRows.map(r => r.sem1Avg).filter(v => v != null);
      const allS2Avgs = studentRows.map(r => r.sem2Avg).filter(v => v != null);

      const yearStats = calcComprehensiveStats(allYearAvgs);
      const s1Stats = calcComprehensiveStats(allS1Avgs);
      const s2Stats = calcComprehensiveStats(allS2Avgs);

      const yearBuckets = calcGradeBuckets(allYearAvgs);
      const s1Buckets = calcGradeBuckets(allS1Avgs);
      const s2Buckets = calcGradeBuckets(allS2Avgs);

      const s1TestNames = Array.from({ length: n1 }, (_, i) => {
        const cfg = classObj.testConfigs.sem1[i];
        return cfg.testName ? String(cfg.testName) : `S1-T${i + 1}`;
      });
      const s2TestNames = Array.from({ length: n2 }, (_, i) => {
        const cfg = classObj.testConfigs.sem2[i];
        return cfg.testName ? String(cfg.testName) : `S2-T${i + 1}`;
      });
      const allTestCategories = [...s1TestNames, ...s2TestNames];

      const classTimelineData = [
        ...Array.from({ length: n1 }, (_, i) => {
          const vals = studentRows.map(r => r.s1Grades[i]).filter(v => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }),
        ...Array.from({ length: n2 }, (_, i) => {
          const vals = studentRows.map(r => r.s2Grades[i]).filter(v => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        })
      ];

      const histSvg = renderNeobrutalistSvgHistogram({
        buckets: yearBuckets,
        title: t('gsChartAnnualGradeDist') || "Annual Grade Distribution"
      });

      const compBarsSvg = renderNeobrutalistSvgGroupedBars({
        categories: yearBuckets.map(b => b.label),
        series: [
          { name: t('gsSem1') || "Sem 1", data: s1Buckets.map(b => b.count), color: "#42a5f5" },
          { name: t('gsSem2') || "Sem 2", data: s2Buckets.map(b => b.count), color: "#66bb6a" }
        ],
        title: t('gsChartS1S2Dist') || "S1 vs S2 Grade Distribution"
      });

      const timelineSvg = renderNeobrutalistSvgTimeline({
        series: [{ name: t('gsKpiClassAvg') || "Class Mean", data: classTimelineData, color: "#111", strokeWidth: 3 }],
        categories: allTestCategories.length ? allTestCategories : [t('gsCardNoTests') || "No tests"],
        title: t('gsChartAnnualProgression') || "Annual Test Progression Timeline"
      });

      const quartileSvg = renderNeobrutalistSvgQuartileBox({
        min: yearStats.min,
        q1: yearStats.q1,
        median: yearStats.median,
        q3: yearStats.q3,
        max: yearStats.max,
        title: t('gsChartAnnualQuartiles') || "Annual Distribution Quartiles & Extremes"
      });

      // Build Table
      const sortedStudents = [...studentRows].sort((a, b) => (b.yearAvg || 0) - (a.yearAvg || 0));
      const trs = sortedStudents.map((r, idx) => {
        const nameMode = getGsNameDisplayMode();
        const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
          ? StudentNameUtils.formatStudentName(r.student, nameMode)
          : `${r.student.firstName || ''} ${r.student.lastName || ''}`.trim();
        const s1Cells = r.s1Grades.map((g, ti) => {
          const cfg = classObj.testConfigs && classObj.testConfigs.sem1 ? classObj.testConfigs.sem1[ti] : null;
          return `<td class="center" style="${gradeColor(g, cfg)}">${g != null ? fmtN(g) : '-'}</td>`;
        }).join('');
        const s2Cells = r.s2Grades.map((g, ti) => {
          const cfg = classObj.testConfigs && classObj.testConfigs.sem2 ? classObj.testConfigs.sem2[ti] : null;
          return `<td class="center" style="${gradeColor(g, cfg)}">${g != null ? fmtN(g) : '-'}</td>`;
        }).join('');
        return `<tr>
          <td class="center" style="font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700;">${escapeHtml(fullName)}</td>
          ${s1Cells}
          <td class="center" style="font-weight:700;${gradeColor(r.sem1Avg)}">${r.sem1Avg != null ? fmtAvg(r.sem1Avg) : '-'}</td>
          ${s2Cells}
          <td class="center" style="font-weight:700;${gradeColor(r.sem2Avg)}">${r.sem2Avg != null ? fmtAvg(r.sem2Avg) : '-'}</td>
          <td class="center" style="font-weight:800;${gradeColor(r.yearAvg)}">${r.yearAvg != null ? fmtAvg(r.yearAvg) : '-'}</td>
        </tr>`;
      }).join('');

      const esc = escapeHtml;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(classObj.name)} - ${t('gsReportWholeClassYear') || 'Annual Class Report'}</title>
        <style>${getNeobrutalistReportCss(true, fitToOnePage)}</style></head><body>
        <div class="report-page landscape ${fitToOnePage ? 'fit-one-page' : ''}">
          <div class="report-header">
            <div>
              <div class="report-title">${esc(classObj.name)} — ${t('gsReportWholeClassYear') || 'Whole Class Full Year Report'}</div>
              <div class="report-subtitle">${t('gsReportSchoolYear') || 'School Year'} ${esc(classObj.year || '')} &nbsp;·&nbsp; ${t('gsReportTotalStudents') || 'Total Students'}: ${classObj.students.length} &nbsp;·&nbsp; ${t('gsReportTestsCount') || 'Tests'}: S1 (${n1}), S2 (${n2})</div>
            </div>
            <div class="report-meta">${t('gsReportGenerated') || 'Generated:'} ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiAnnualClassMean') || 'Annual Class Mean'}</div>
              <div class="kpi-value">${yearStats.mean != null ? yearStats.mean.toFixed(2) : '-'}</div>
              <div class="kpi-sub">S1: ${s1Stats.mean != null ? s1Stats.mean.toFixed(2) : '-'} | S2: ${s2Stats.mean != null ? s2Stats.mean.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiMedianGrade') || 'Median Grade'}</div>
              <div class="kpi-value">${yearStats.median != null ? yearStats.median.toFixed(2) : '-'}</div>
              <div class="kpi-sub">Mode: ${yearStats.mode != null ? yearStats.mode.toFixed(1) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiPassRate4') || 'Pass Rate (≥ 4.0)'}</div>
              <div class="kpi-value" style="color:${yearStats.passRate >= 75 ? '#2ecc40' : (yearStats.passRate >= 50 ? '#f57c00' : '#d32f2f')};">${Math.round(yearStats.passRate)}%</div>
              <div class="kpi-sub">${(t('gsOfPassed') || '{count} of {total} passed').replace('{count}', yearStats.passCount).replace('{total}', yearStats.count)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiDistinction') || 'Distinction (≥ 5.5)'}</div>
              <div class="kpi-value">${Math.round(yearStats.distinctionRate)}%</div>
              <div class="kpi-sub">${(t('gsStudentsCount') || '{count} students').replace('{count}', yearStats.distinctionCount)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiStdDev') || 'Std Deviation'}</div>
              <div class="kpi-value">${yearStats.stdDev != null ? yearStats.stdDev.toFixed(2) : '-'}</div>
              <div class="kpi-sub">IQR: ${yearStats.iqr != null ? yearStats.iqr.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiExtremes') || 'Extremes (Min / Max)'}</div>
              <div class="kpi-value">${yearStats.min != null ? yearStats.min.toFixed(1) : '-'} / ${yearStats.max != null ? yearStats.max.toFixed(1) : '-'}</div>
              <div class="kpi-sub">Range: ${yearStats.min != null && yearStats.max != null ? (yearStats.max - yearStats.min).toFixed(1) : '-'} pts</div>
            </div>
          </div>

          <div class="charts-row">
            <div>${histSvg}</div>
            <div>${compBarsSvg}</div>
          </div>

          <div class="charts-row" style="margin-top:2px;">
            <div>${timelineSvg}</div>
            <div>${quartileSvg}</div>
          </div>

          <div class="section-heading" style="margin-top:6px;">${t('gsReportMatrixTitle') || 'Annual Student Roster & Performance Matrix'}</div>
          <table class="report-table">
            <thead>
              <tr>
                <th class="center" style="width:36px;">#</th>
                <th style="width:180px;">${t('gsColStudentName') || 'Student Name'}</th>
                ${s1TestNames.map(t => `<th class="center">${esc(t)}</th>`).join('')}
                <th class="center cell-sem1-avg">${t('gsColS1Avg') || 'S1 Avg'}</th>
                ${s2TestNames.map(t => `<th class="center">${esc(t)}</th>`).join('')}
                <th class="center cell-sem2-avg">${t('gsColS2Avg') || 'S2 Avg'}</th>
                <th class="center cell-year-avg">${t('gsColYearAvg') || 'Year Avg'}</th>
              </tr>
            </thead>
            <tbody>
              ${trs}
            </tbody>
          </table>
          ${(() => {
            if (!incChips) return '';
            const topChips = getTopObservationChips(classObj, { semester: 'all', limit: 10 });
            if (!topChips.length) return '';
            return `
              <div class="section-heading" style="margin-top:10px;">${t('gsTopChipsClassTitle') || 'Top 10 Most Frequent Observation Chips'}</div>
              ${renderTopChipsReportSection(topChips, classObj.students.length)}
            `;
          })()}
        </div>
        ${getReportAutoScaleScript(true, fitToOnePage)}
      </body></html>`;
    }

    function buildClassSemesterReportHtml(classObj, sem, fitToOnePage = getReportFitToOnePage(), options = {}) {
      ensureClassStructures(classObj);
      const opts = (typeof options === 'object' && options !== null) ? options : {};
      const incChips = opts.includeObservationChips !== undefined
        ? !!opts.includeObservationChips
        : (opts.includeObservations !== undefined ? !!opts.includeObservations : getReportIncludeObservationChips());
      const semLabel = sem === "sem2" ? t('gsSem2') : t('gsSem1');
      const n = classObj.testCounts[sem];

      const studentRows = classObj.students.map(student => {
        const c = computeStudent(student, classObj);
        const grades = Array.from({ length: n }, (_, i) => getTestDisplayGrade(student, classObj, sem, i));
        const semAvg = sem === "sem1" ? c.sem1Avg : c.sem2Avg;
        return { student, grades, semAvg, rank: c.rank };
      });

      const allSemAvgs = studentRows.map(r => r.semAvg).filter(v => v != null);
      const semStats = calcComprehensiveStats(allSemAvgs);
      const semBuckets = calcGradeBuckets(allSemAvgs);

      const testNames = Array.from({ length: n }, (_, i) => {
        const cfg = classObj.testConfigs[sem][i];
        return cfg.testName ? String(cfg.testName) : `T${i + 1}`;
      });

      const testMeans = Array.from({ length: n }, (_, i) => {
        const vals = studentRows.map(r => r.grades[i]).filter(v => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });

      const histSvg = renderNeobrutalistSvgHistogram({
        buckets: semBuckets,
        title: `${semLabel} — ${t('gsChartGradeDist') || 'Grade Distribution'}`
      });

      const timelineSvg = renderNeobrutalistSvgTimeline({
        series: [{ name: t('gsKpiClassAvg') || "Class Mean", data: testMeans, color: "#111", strokeWidth: 3 }],
        categories: testNames.length ? testNames : [t('gsCardNoTests') || "No tests"],
        title: t('gsChartDifficultyProgression') || "Test Difficulty & Mean Progression"
      });

      const quartileSvg = renderNeobrutalistSvgQuartileBox({
        min: semStats.min,
        q1: semStats.q1,
        median: semStats.median,
        q3: semStats.q3,
        max: semStats.max,
        title: `${semLabel} — ${t('gsChartQuartilesExtremes') || 'Quartiles & Extremes'}`
      });

      const sortedStudents = [...studentRows].sort((a, b) => (b.semAvg || 0) - (a.semAvg || 0));
      const trs = sortedStudents.map((r, idx) => {
        const nameMode = getGsNameDisplayMode();
        const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
          ? StudentNameUtils.formatStudentName(r.student, nameMode)
          : `${r.student.firstName || ''} ${r.student.lastName || ''}`.trim();
        const testCells = r.grades.map((g, ti) => {
          const cfg = (classObj.testConfigs && classObj.testConfigs[sem]) ? classObj.testConfigs[sem][ti] : null;
          return `<td class="center" style="${gradeColor(g, cfg)}">${g != null ? fmtN(g) : '-'}</td>`;
        }).join('');
        return `<tr>
          <td class="center" style="font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700;">${escapeHtml(fullName)}</td>
          ${testCells}
          <td class="center" style="font-weight:800;${gradeColor(r.semAvg)}">${r.semAvg != null ? fmtAvg(r.semAvg) : '-'}</td>
        </tr>`;
      }).join('');

      const esc = escapeHtml;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(classObj.name)} - ${esc(semLabel)} ${t('gsReportClassReport') || 'Class Report'}</title>
        <style>${getNeobrutalistReportCss(false, fitToOnePage)}</style></head><body>
        <div class="report-page ${fitToOnePage ? 'fit-one-page' : ''}">
          <div class="report-header">
            <div>
              <div class="report-title">${esc(classObj.name)} — ${esc(semLabel)} ${t('gsReportClassReport') || 'Class Report'}</div>
              <div class="report-subtitle">${t('gsReportSchoolYear') || 'School Year'} ${esc(classObj.year || '')} &nbsp;·&nbsp; ${t('gsReportTotalStudents') || 'Students'}: ${classObj.students.length} &nbsp;·&nbsp; ${t('gsReportTestsCount') || 'Tests'}: ${n}</div>
            </div>
            <div class="report-meta">${t('gsReportGenerated') || 'Generated:'} ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiSemesterMean') || 'Semester Mean'}</div>
              <div class="kpi-value">${semStats.mean != null ? semStats.mean.toFixed(2) : '-'}</div>
              <div class="kpi-sub">Median: ${semStats.median != null ? semStats.median.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiPassRate4') || 'Pass Rate (≥ 4.0)'}</div>
              <div class="kpi-value" style="color:${semStats.passRate >= 75 ? '#2ecc40' : (semStats.passRate >= 50 ? '#f57c00' : '#d32f2f')};">${Math.round(semStats.passRate)}%</div>
              <div class="kpi-sub">${(t('gsOfPassed') || '{count} of {total} passed').replace('{count}', semStats.passCount).replace('{total}', semStats.count)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiStdDev') || 'Std Deviation'}</div>
              <div class="kpi-value">${semStats.stdDev != null ? semStats.stdDev.toFixed(2) : '-'}</div>
              <div class="kpi-sub">IQR: ${semStats.iqr != null ? semStats.iqr.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiExtremes') || 'Extremes (Min/Max)'}</div>
              <div class="kpi-value">${semStats.min != null ? semStats.min.toFixed(1) : '-'} / ${semStats.max != null ? semStats.max.toFixed(1) : '-'}</div>
              <div class="kpi-sub">Range: ${semStats.min != null && semStats.max != null ? (semStats.max - semStats.min).toFixed(1) : '-'} pts</div>
            </div>
          </div>

          <div class="charts-row">
            <div>${histSvg}</div>
            <div>${timelineSvg}</div>
          </div>

          <div style="margin-top:2px;">${quartileSvg}</div>

          <div class="section-heading" style="margin-top:6px;">${t('gsReportSemesterRoster') || 'Semester Student Roster & Grades'}</div>
          <table class="report-table">
            <thead>
              <tr>
                <th class="center" style="width:36px;">#</th>
                <th style="width:200px;">${t('gsColStudentName') || 'Student Name'}</th>
                ${testNames.map(t => `<th class="center">${esc(t)}</th>`).join('')}
                <th class="center" style="background:#fff9c4;width:80px;">${t('gsHeaderSemAvg') || 'Sem Avg'}</th>
              </tr>
            </thead>
            <tbody>
              ${trs}
            </tbody>
          </table>
          ${(() => {
            if (!incChips) return '';
            const topChips = getTopObservationChips(classObj, { semester: sem, limit: 10 });
            if (!topChips.length) return '';
            return `
              <div class="section-heading" style="margin-top:10px;">${t('gsTopChipsClassTitle') || 'Top 10 Most Frequent Observation Chips'}</div>
              ${renderTopChipsReportSection(topChips, classObj.students.length)}
            `;
          })()}
        </div>
        ${getReportAutoScaleScript(false, fitToOnePage)}
      </body></html>`;
    }

    function buildClassTestReportHtml(classObj, sem, testIndex, includeCompetences = getReportIncludeCompetences(), fitToOnePage = getReportFitToOnePage(), options = {}) {
      ensureClassStructures(classObj);
      const opts = (typeof options === 'object' && options !== null) ? options : {};
      const incKpi = opts.includeKpi !== undefined ? !!opts.includeKpi : getReportIncludeKpi();
      const incCharts = opts.includeCharts !== undefined ? !!opts.includeCharts : getReportIncludeCharts();
      const incCriteria = opts.includeCriteria !== undefined ? !!opts.includeCriteria : getReportIncludeCriteria();
      const incComp = opts.includeCompetences !== undefined ? !!opts.includeCompetences : includeCompetences;
      const incChips = opts.includeObservationChips !== undefined
        ? !!opts.includeObservationChips
        : (opts.includeObservations !== undefined ? !!opts.includeObservations : getReportIncludeObservationChips());
      const fitPage = opts.fitToOnePage !== undefined ? !!opts.fitToOnePage : fitToOnePage;

      const config = getTestConfig(classObj, sem, testIndex);
      const testNo = testIndex + 1;
      const testLabel = config.testName ? String(config.testName) : `T${testNo}`;
      const semLabel = sem === "sem2" ? t('gsSem2') : t('gsSem1');
      const defaultTotals = calcCriteriaTotals(config, {});

      const studentResults = classObj.students.map(student => {
        const grade = getTestDisplayGrade(student, classObj, sem, testIndex);
        const criteriaMap = (student.criteriaResults[sem] && student.criteriaResults[sem][testIndex]) || {};
        const totals = calcCriteriaTotals(config, criteriaMap);
        const scoredTotal = (totals.totalScored || 0) + (totals.totalBonusScored || 0);
        return {
          student,
          grade,
          scoredTotal,
          possibleTotal: totals.totalPossible || defaultTotals.totalPossible,
          criteriaMap
        };
      });

      const validGrades = studentResults.map(r => r.grade).filter(v => v != null);
      const validPoints = studentResults.map(r => r.scoredTotal).filter(v => v != null);

      const gradeStats = calcComprehensiveStats(validGrades);
      const pointsStats = calcComprehensiveStats(validPoints);

      const gradeBuckets = calcGradeBuckets(validGrades);
      const pointsBuckets = calcPointsBuckets(validPoints, defaultTotals.totalPossible || 100);

      const histGradeSvg = renderNeobrutalistSvgHistogram({
        buckets: gradeBuckets,
        title: t('gsChartTestGradeDist') || "Test Grade Distribution"
      });

      const histPointsSvg = renderNeobrutalistSvgHistogram({
        buckets: pointsBuckets,
        title: `${t('gsChartPointsDist') || 'Raw Points Distribution'} (/${fmtN(defaultTotals.totalPossible)})`
      });

      // Criteria Performance Breakdown
      const criteriaItems = (config.criteria || []).map(cr => {
        const scoredList = studentResults.map(r => {
          const entry = r.criteriaMap[cr.id];
          return (entry && entry.points != null) ? entry.points : null;
        }).filter(v => v != null);
        const avgPts = scoredList.length ? scoredList.reduce((a, b) => a + b, 0) / scoredList.length : null;
        const pct = (avgPts != null && cr.maxPoints > 0) ? (avgPts / cr.maxPoints) * 100 : 0;
        return {
          name: cr.name,
          maxPts: cr.maxPoints,
          avgPts,
          pct
        };
      });

      const critBarsSvg = renderNeobrutalistSvgCriteriaBars({
        criteriaItems,
        title: t('gsChartCritAvgPerf') || "Class Average Performance per Criterion"
      });

      const sorted = [...studentResults].sort((a, b) => (b.grade || 0) - (a.grade || 0));
      const trs = sorted.map((r, idx) => {
        const nameMode = getGsNameDisplayMode();
        const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
          ? StudentNameUtils.formatStudentName(r.student, nameMode)
          : `${r.student.firstName || ''} ${r.student.lastName || ''}`.trim();
        const critCells = (config.criteria || []).map(cr => {
          const entry = r.criteriaMap[cr.id];
          const pts = (entry && entry.points != null) ? fmtN(entry.points) : '-';
          return `<td class="center">${pts}</td>`;
        }).join('');
        const ptsStr = defaultTotals.totalPossible > 0 ? `${fmtN(r.scoredTotal)} / ${fmtN(defaultTotals.totalPossible)}` : '-';
        return `<tr>
          <td class="center" style="font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700;">${escapeHtml(fullName)}</td>
          <td class="center" style="font-weight:800;${gradeColor(r.grade, config)}">${r.grade != null ? fmtN(r.grade) : '-'}</td>
          <td class="center" style="font-weight:700;">${ptsStr}</td>
          ${critCells}
        </tr>`;
      }).join('');

      const esc = escapeHtml;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(classObj.name)} - ${esc(sem.toUpperCase())} ${esc(testLabel)} Test Report</title>
        <style>${getNeobrutalistReportCss(false, fitPage)}</style></head><body>
        <div class="report-page ${fitPage ? 'fit-one-page' : ''}">
          <div class="report-header">
            <div>
              <div class="report-title">${esc(classObj.name)} — Test Report: ${esc(testLabel)} (${esc(semLabel)})</div>
              <div class="report-subtitle">Date: ${esc(config.testDate || 'N/A')} &nbsp;·&nbsp; Scope: ${esc(config.scope || 'N/A')} &nbsp;·&nbsp; Type: ${esc(config.type || 'N/A')}</div>
            </div>
            <div class="report-meta">${t('gsReportGenerated') || 'Generated:'} ${new Date().toLocaleDateString()}</div>
          </div>

          ${incKpi ? `
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiTestGradeMean') || 'Test Grade Mean'}</div>
              <div class="kpi-value">${gradeStats.mean != null ? gradeStats.mean.toFixed(2) : '-'}</div>
              <div class="kpi-sub">Median: ${gradeStats.median != null ? gradeStats.median.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiPointsAvg') || 'Points Average'}</div>
              <div class="kpi-value">${pointsStats.mean != null ? fmtN(pointsStats.mean) : '-'} <span style="font-size:11px;font-weight:600;">/ ${fmtN(defaultTotals.totalPossible)}</span></div>
              <div class="kpi-sub">Median: ${pointsStats.median != null ? fmtN(pointsStats.median) : '-'} pts</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiPassRate4') || 'Pass Rate (≥ 4.0)'}</div>
              <div class="kpi-value" style="color:${gradeStats.passRate >= 75 ? '#2ecc40' : (gradeStats.passRate >= 50 ? '#f57c00' : '#d32f2f')};">${Math.round(gradeStats.passRate)}%</div>
              <div class="kpi-sub">${(t('gsOfPassed') || '{count} of {total} passed').replace('{count}', gradeStats.passCount).replace('{total}', gradeStats.count)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">${t('gsKpiStdDev') || 'Std Deviation'}</div>
              <div class="kpi-value">${gradeStats.stdDev != null ? gradeStats.stdDev.toFixed(2) : '-'}</div>
              <div class="kpi-sub">${t('gsKpiExtremes') || 'Extremes'}: ${gradeStats.min != null ? gradeStats.min.toFixed(1) : '-'} / ${gradeStats.max != null ? gradeStats.max.toFixed(1) : '-'}</div>
            </div>
          </div>` : ''}

          ${incCharts ? `
          <div class="charts-row">
            <div>${histGradeSvg}</div>
            <div>${histPointsSvg}</div>
          </div>
          <div style="margin-top:2px;">${critBarsSvg}</div>` : ''}

          ${incCriteria ? `
          <div class="section-heading" style="margin-top:6px;">${t('gsReportStudentResultsCritBreakdown') || 'Student Results & Criteria Breakdown'}</div>
          <table class="report-table">
            <thead>
              <tr>
                <th class="center" style="width:36px;">#</th>
                <th style="width:180px;">Student Name</th>
                <th class="center" style="width:65px;background:#fff9c4;">Grade</th>
                <th class="center" style="width:90px;">Total Points</th>
                ${(config.criteria || []).map(cr => {
                  let compBadges = '';
                  const effCompIds = getCriterionEffectiveCompetenceIds(cr, classObj, config);
                  if (incComp && effCompIds.length > 0) {
                    compBadges = '<div style="margin-top:2px;">' + effCompIds.map(cid => {
                      const c = findLessonCompetence(cid);
                      const label = c ? (c.code || c.title || cid) : cid;
                      return `<span style="display:inline-block;background:#0284c7;color:#fff;border-radius:3px;padding:0px 4px;font-size:9px;font-weight:700;margin:1px;">${esc(label)}</span>`;
                    }).join('') + '</div>';
                  }
                  return `<th class="center">${esc(cr.name)} (/${fmtN(cr.maxPoints)})${compBadges}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${trs}
            </tbody>
          </table>` : ''}

          ${(() => {
            if (!incComp) return '';
            const compMap = new Map();
            (config.criteria || []).forEach(cr => {
              const effCompIds = getCriterionEffectiveCompetenceIds(cr, classObj, config);
              if (effCompIds.length > 0) {
                effCompIds.forEach(cid => {
                  if (!compMap.has(cid)) {
                    compMap.set(cid, { competence: findLessonCompetence(cid) || { id: cid, code: cid, title: cid }, criteria: [] });
                  }
                  compMap.get(cid).criteria.push(cr);
                });
              }
            });
            if (compMap.size === 0) return '';
            const rows = Array.from(compMap.entries()).map(([cid, data]) => {
              const comp = data.competence;
              const critList = data.criteria;
              const critNames = critList.map(c => esc(c.name)).join(', ');
              const maxPtsTotal = critList.reduce((acc, c) => acc + (c.maxPoints || 0), 0);
              
              let totalScoredAcrossClass = 0;
              let studentCount = 0;
              studentResults.forEach(r => {
                let sSum = 0;
                let hasAny = false;
                critList.forEach(c => {
                  const entry = r.criteriaMap[c.id];
                  if (entry && entry.points != null) {
                    sSum += entry.points;
                    hasAny = true;
                  }
                });
                if (hasAny) {
                  totalScoredAcrossClass += sSum;
                  studentCount++;
                }
              });
              const avgScored = studentCount > 0 ? (totalScoredAcrossClass / studentCount) : null;
              const avgPct = (avgScored != null && maxPtsTotal > 0) ? Math.round((avgScored / maxPtsTotal) * 100) : null;
              const avgStr = avgScored != null ? `${fmtN(avgScored)} / ${fmtN(maxPtsTotal)} (${avgPct}%)` : '—';
              const avgColor = avgPct != null ? (avgPct >= 60 ? '#2e7d32' : (avgPct >= 40 ? '#f57c00' : '#c62828')) : '#111';

              return `<tr>
                <td style="font-weight:800;color:#0284c7;">${esc(comp.code || comp.id || '')}</td>
                <td><strong>${esc(comp.title || '')}</strong>${comp.description ? `<div style="font-size:10px;color:#555;margin-top:2px;">${esc(comp.description)}</div>` : ''}</td>
                <td class="center"><span style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600;">${esc(comp.level || comp.category || '—')}</span></td>
                <td>${critNames}</td>
                <td class="center" style="font-weight:800;color:${avgColor};">${avgStr}</td>
              </tr>`;
            }).join('');

            return `
              <div class="section-heading" style="margin-top:10px;">Curriculum Competences Coverage & Performance</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th style="width:90px;">Code</th>
                    <th>Competence Title & Description</th>
                    <th class="center" style="width:80px;">Level/Domain</th>
                    <th style="width:160px;">Linked Criteria</th>
                    <th class="center" style="width:120px;">Class Average</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            `;
          })()}

          ${(() => {
            if (!incChips) return '';
            const topChips = getTopObservationChips(classObj, { semester: sem, testIndex: testIndex, limit: 10 });
            if (!topChips.length) return '';
            return `
              <div class="section-heading" style="margin-top:10px;">${t('gsTopChipsTestTitle') || 'Top 10 Observation Chips for this Test'}</div>
              ${renderTopChipsReportSection(topChips, classObj.students.length)}
            `;
          })()}
        </div>
        ${getReportAutoScaleScript(false, fitPage)}
      </body></html>`;
    }

    // ── Student Report HTML Builders ──

    function buildStudentYearReportHtml(classObj, student, fitToOnePage = getReportFitToOnePage()) {
      ensureClassStructures(classObj);
      const n1 = classObj.testCounts.sem1;
      const n2 = classObj.testCounts.sem2;

      const s1TestNames = Array.from({ length: n1 }, (_, i) => {
        const cfg = classObj.testConfigs.sem1[i];
        return cfg.testName ? String(cfg.testName) : `S1-T${i + 1}`;
      });
      const s2TestNames = Array.from({ length: n2 }, (_, i) => {
        const cfg = classObj.testConfigs.sem2[i];
        return cfg.testName ? String(cfg.testName) : `S2-T${i + 1}`;
      });
      const allTestCategories = [...s1TestNames, ...s2TestNames];

      const studentS1Grades = Array.from({ length: n1 }, (_, i) => getTestDisplayGrade(student, classObj, "sem1", i));
      const studentS2Grades = Array.from({ length: n2 }, (_, i) => getTestDisplayGrade(student, classObj, "sem2", i));
      const studentTimeline = [...studentS1Grades, ...studentS2Grades];

      const classTimelineData = [
        ...Array.from({ length: n1 }, (_, i) => {
          const vals = classObj.students.map(s => getTestDisplayGrade(s, classObj, "sem1", i)).filter(v => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }),
        ...Array.from({ length: n2 }, (_, i) => {
          const vals = classObj.students.map(s => getTestDisplayGrade(s, classObj, "sem2", i)).filter(v => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        })
      ];

      const c = computeStudent(student, classObj);
      const allClassYearAvgs = classObj.students.map(s => computeStudent(s, classObj).yearAvg).filter(v => v != null);
      const classYearStats = calcComprehensiveStats(allClassYearAvgs);

      const timelineSvg = renderNeobrutalistSvgTimeline({
        series: [
          { name: "Student Score", data: studentTimeline, color: "#e53935", strokeWidth: 3 },
          { name: "Class Mean", data: classTimelineData, color: "#1976d2", strokeWidth: 2 }
        ],
        categories: allTestCategories.length ? allTestCategories : ["No tests"],
        title: "Student vs. Class Mean Progression"
      });

      const quartileSvg = renderNeobrutalistSvgQuartileBox({
        min: classYearStats.min,
        q1: classYearStats.q1,
        median: classYearStats.median,
        q3: classYearStats.q3,
        max: classYearStats.max,
        studentVal: c.yearAvg,
        title: "Student Position within Class Distribution"
      });

      const nameMode = getGsNameDisplayMode();
      const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
        ? StudentNameUtils.formatStudentName(student, nameMode)
        : `${student.firstName || ''} ${student.lastName || ''}`.trim();

      // Test History Rows
      const testRows = [];
      ["sem1", "sem2"].forEach(sem => {
        const cnt = classObj.testCounts[sem];
        for (let ti = 0; ti < cnt; ti++) {
          const cfg = getTestConfig(classObj, sem, ti);
          const tName = cfg.testName || `T${ti + 1}`;
          const g = getTestDisplayGrade(student, classObj, sem, ti);
          const cVals = classObj.students.map(s => getTestDisplayGrade(s, classObj, sem, ti)).filter(v => v != null);
          const cMean = cVals.length ? cVals.reduce((a, b) => a + b, 0) / cVals.length : null;
          const delta = (g != null && cMean != null) ? (g - cMean) : null;
          const deltaStr = delta != null ? (delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)) : '-';
          const deltaColor = delta != null ? (delta >= 0 ? '#2e7d32' : '#c62828') : '#111';

          const noteArr = student.testNotes[sem];
          const secNotes = Array.isArray(noteArr[ti]) ? noteArr[ti] : [];
          const remarkAllocator = createRemarkNumberAllocator(secNotes);
          const notesHtml = secNotes.filter(s => sectionHasContent(s)).map(s => renderObservationInlineHtml(s, (cfg && cfg.chipBank) || (classObj && classObj.chipBank), remarkAllocator)).join("");

          testRows.push(`<tr>
            <td class="center" style="font-weight:700;">${sem.toUpperCase()}</td>
            <td style="font-weight:700;">${escapeHtml(tName)}</td>
            <td class="center">${escapeHtml(cfg.testDate || '-')}</td>
            <td class="center" style="font-weight:800;${gradeColor(g, cfg)}">${g != null ? fmtN(g) : '-'}</td>
            <td class="center">${cMean != null ? cMean.toFixed(2) : '-'}</td>
            <td class="center ${delta != null ? (delta >= 0 ? 'delta-pos' : 'delta-neg') : ''}" style="font-weight:800;">${deltaStr}</td>
            <td style="font-size:9.5px;color:#333;">${notesHtml || '—'}</td>
          </tr>`);
        }
      });

      const esc = escapeHtml;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(fullName)} - Annual Student Report</title>
        <style>${getNeobrutalistReportCss(false, fitToOnePage)}</style></head><body>
        <div class="report-page ${fitToOnePage ? 'fit-one-page' : ''}">
          <div class="report-header">
            <div>
              <div class="report-title">${esc(fullName)} — Annual Student Report</div>
              <div class="report-subtitle">Class: ${esc(classObj.name)} &nbsp;·&nbsp; Year: ${esc(classObj.year || '')} &nbsp;·&nbsp; Rank: #${c.rank || '-'} of ${classObj.students.length}</div>
            </div>
            <div class="report-meta">Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Annual Grade Avg</div>
              <div class="kpi-value" style="${gradeColor(c.yearAvg)}">${c.yearAvg != null ? fmtAvg(c.yearAvg) : '-'}</div>
              <div class="kpi-sub">Class Mean: ${classYearStats.mean != null ? classYearStats.mean.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Semester 1 Avg</div>
              <div class="kpi-value">${c.sem1Avg != null ? fmtAvg(c.sem1Avg) : '-'}</div>
              <div class="kpi-sub">Rank: #${c.rank || '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Semester 2 Avg</div>
              <div class="kpi-value">${c.sem2Avg != null ? fmtAvg(c.sem2Avg) : '-'}</div>
              <div class="kpi-sub">Rounded Final: ${c.roundedFinal != null ? fmtAvg(c.roundedFinal) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Progression (S1 → S2)</div>
              <div class="kpi-value" style="color:${(c.sem2Avg && c.sem1Avg && c.sem2Avg >= c.sem1Avg) ? '#2e7d32' : '#c62828'};">
                ${(c.sem2Avg != null && c.sem1Avg != null) ? ((c.sem2Avg - c.sem1Avg >= 0 ? '+' : '') + (c.sem2Avg - c.sem1Avg).toFixed(1)) : '—'}
              </div>
              <div class="kpi-sub">${(c.sem2Avg && c.sem1Avg && c.sem2Avg >= c.sem1Avg) ? 'Improved ▲' : 'Declined ▼'}</div>
            </div>
          </div>

          <div>${timelineSvg}</div>
          <div style="margin-top:2px;">${quartileSvg}</div>

          <div class="section-heading" style="margin-top:6px;">Complete Annual Assessment History</div>
          <table class="report-table">
            <thead>
              <tr>
                <th class="center" style="width:40px;">Sem</th>
                <th style="width:130px;">Test Name</th>
                <th class="center" style="width:75px;">Date</th>
                <th class="center" style="width:65px;background:#fff9c4;">Grade</th>
                <th class="center" style="width:75px;">Class Mean</th>
                <th class="center" style="width:65px;">Delta</th>
                <th>Observations & Notes</th>
              </tr>
            </thead>
            <tbody>
              ${testRows.join('')}
            </tbody>
          </table>
        </div>
        ${getReportAutoScaleScript(false, fitToOnePage)}
      </body></html>`;
    }

    function buildStudentSemesterReportHtml(classObj, student, sem, fitToOnePage = getReportFitToOnePage()) {
      ensureClassStructures(classObj);
      const semLabel = sem === "sem2" ? t('gsSem2') : t('gsSem1');
      const n = classObj.testCounts[sem];

      const testNames = Array.from({ length: n }, (_, i) => {
        const cfg = classObj.testConfigs[sem][i];
        return cfg.testName ? String(cfg.testName) : `T${i + 1}`;
      });

      const studentGrades = Array.from({ length: n }, (_, i) => getTestDisplayGrade(student, classObj, sem, i));
      const classMeans = Array.from({ length: n }, (_, i) => {
        const vals = classObj.students.map(s => getTestDisplayGrade(s, classObj, sem, i)).filter(v => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });

      const c = computeStudent(student, classObj);
      const studentAvg = sem === "sem1" ? c.sem1Avg : c.sem2Avg;
      const allClassSemAvgs = classObj.students.map(s => sem === "sem1" ? computeStudent(s, classObj).sem1Avg : computeStudent(s, classObj).sem2Avg).filter(v => v != null);
      const classSemStats = calcComprehensiveStats(allClassSemAvgs);

      const timelineSvg = renderNeobrutalistSvgTimeline({
        series: [
          { name: "Student Score", data: studentGrades, color: "#e53935", strokeWidth: 3 },
          { name: "Class Mean", data: classMeans, color: "#1976d2", strokeWidth: 2 }
        ],
        categories: testNames.length ? testNames : ["No tests"],
        title: `Student vs. Class Mean (${semLabel})`
      });

      const gaugeSvg = renderNeobrutalistSvgBenchmarkGauge({
        studentVal: studentAvg,
        classAvg: classSemStats.mean,
        label: `${semLabel} Performance Benchmark`
      });

      const nameMode = getGsNameDisplayMode();
      const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
        ? StudentNameUtils.formatStudentName(student, nameMode)
        : `${student.firstName || ''} ${student.lastName || ''}`.trim();

      const testRows = [];
      for (let ti = 0; ti < n; ti++) {
        const cfg = getTestConfig(classObj, sem, ti);
        const tName = cfg.testName || `T${ti + 1}`;
        const g = studentGrades[ti];
        const cMean = classMeans[ti];
        const delta = (g != null && cMean != null) ? (g - cMean) : null;
        const deltaStr = delta != null ? (delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)) : '-';
        const deltaColor = delta != null ? (delta >= 0 ? '#2e7d32' : '#c62828') : '#111';

        const noteArr = student.testNotes[sem];
        const secNotes = Array.isArray(noteArr[ti]) ? noteArr[ti] : [];
        const remarkAllocator = createRemarkNumberAllocator(secNotes);
        const notesHtml = secNotes.filter(s => sectionHasContent(s)).map(s => renderObservationInlineHtml(s, (cfg && cfg.chipBank) || (classObj && classObj.chipBank), remarkAllocator)).join("");

        testRows.push(`<tr>
          <td class="center" style="font-weight:700;">T${ti + 1}</td>
          <td style="font-weight:700;">${escapeHtml(tName)}</td>
          <td class="center">${escapeHtml(cfg.testDate || '-')}</td>
          <td class="center" style="font-weight:800;${gradeColor(g, cfg)}">${g != null ? fmtN(g) : '-'}</td>
          <td class="center">${cMean != null ? cMean.toFixed(2) : '-'}</td>
          <td class="center ${delta != null ? (delta >= 0 ? 'delta-pos' : 'delta-neg') : ''}" style="font-weight:800;">${deltaStr}</td>
          <td style="font-size:9.5px;color:#333;">${notesHtml || '—'}</td>
        </tr>`);
      }

      const esc = escapeHtml;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(fullName)} - ${esc(semLabel)} Student Report</title>
        <style>${getNeobrutalistReportCss(false, fitToOnePage)}</style></head><body>
        <div class="report-page ${fitToOnePage ? 'fit-one-page' : ''}">
          <div class="report-header">
            <div>
              <div class="report-title">${esc(fullName)} — ${esc(semLabel)} Report</div>
              <div class="report-subtitle">Class: ${esc(classObj.name)} &nbsp;·&nbsp; Year: ${esc(classObj.year || '')} &nbsp;·&nbsp; Rank: #${c.rank || '-'} of ${classObj.students.length}</div>
            </div>
            <div class="report-meta">Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">${semLabel} Avg</div>
              <div class="kpi-value" style="${gradeColor(studentAvg)}">${studentAvg != null ? fmtAvg(studentAvg) : '-'}</div>
              <div class="kpi-sub">Class Mean: ${classSemStats.mean != null ? classSemStats.mean.toFixed(2) : '-'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Class Rank</div>
              <div class="kpi-value">#${c.rank || '-'}</div>
              <div class="kpi-sub">of ${classObj.students.length} students</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Tests Passed</div>
              <div class="kpi-value">${studentGrades.filter(g => g != null && g >= 4.0).length} / ${studentGrades.filter(g => g != null).length}</div>
              <div class="kpi-sub">${studentGrades.filter(g => g != null && g < 4.0).length ? 'Needs attention' : 'All tests passed'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Performance Status</div>
              <div class="kpi-value" style="color:${(studentAvg && studentAvg >= 4.0) ? '#2e7d32' : '#c62828'};">
                ${(studentAvg && studentAvg >= 4.0) ? 'Sufficient' : 'Insufficient'}
              </div>
              <div class="kpi-sub">Pass threshold: 4.0</div>
            </div>
          </div>

          <div>${timelineSvg}</div>
          <div style="margin-top:2px;">${gaugeSvg}</div>

          <div class="section-heading" style="margin-top:6px;">Semester Assessment Breakdown</div>
          <table class="report-table">
            <thead>
              <tr>
                <th class="center" style="width:40px;">#</th>
                <th style="width:140px;">Test Name</th>
                <th class="center" style="width:80px;">Date</th>
                <th class="center" style="width:65px;background:#fff9c4;">Grade</th>
                <th class="center" style="width:75px;">Class Mean</th>
                <th class="center" style="width:65px;">Delta</th>
                <th>Observations & Notes</th>
              </tr>
            </thead>
            <tbody>
              ${testRows.join('')}
            </tbody>
          </table>
        </div>
        ${getReportAutoScaleScript(false, fitToOnePage)}
      </body></html>`;
    }

    function buildStudentTestReportHtml(classObj, student, sem, testIndex, includeCompetences = getReportIncludeCompetences(), includeExerciseMeans = getReportIncludeExerciseMeans(), fitToOnePage = getReportFitToOnePage(), options = {}) {
      ensureClassStructures(classObj);
      const opts = (typeof options === 'object' && options !== null) ? options : {};
      const incKpi = opts.includeKpi !== undefined ? !!opts.includeKpi : getReportIncludeKpi();
      const incCharts = opts.includeCharts !== undefined ? !!opts.includeCharts : getReportIncludeCharts();
      const incCriteria = opts.includeCriteria !== undefined ? !!opts.includeCriteria : getReportIncludeCriteria();
      const incComments = opts.includeComments !== undefined ? !!opts.includeComments : getReportIncludeComments();
      const incObs = opts.includeObservations !== undefined ? !!opts.includeObservations : getReportIncludeObservations();
      const incScale = opts.includeScale !== undefined ? !!opts.includeScale : getReportIncludeScale();
      const incComp = opts.includeCompetences !== undefined ? !!opts.includeCompetences : includeCompetences;
      const incMeans = opts.includeExerciseMeans !== undefined ? !!opts.includeExerciseMeans : includeExerciseMeans;
      const fitPage = opts.fitToOnePage !== undefined ? !!opts.fitToOnePage : fitToOnePage;

      const config = getTestConfig(classObj, sem, testIndex);
      const testNo = testIndex + 1;
      const testLabel = config.testName ? String(config.testName) : `T${testNo}`;
      const semLabel = sem === "sem2" ? t('gsSem2') : t('gsSem1');
      const defaultTotals = calcCriteriaTotals(config, {});
      const thresholds = getThresholds(config);

      const grade = getTestDisplayGrade(student, classObj, sem, testIndex);
      const criteriaMap = (student.criteriaResults[sem] && student.criteriaResults[sem][testIndex]) || {};
      const totals = calcCriteriaTotals(config, criteriaMap);
      const noteArray = student.testNotes[sem];
      const notes = Array.isArray(noteArray[testIndex]) ? noteArray[testIndex] : [];

      const allTestGrades = classObj.students.map(s => getTestDisplayGrade(s, classObj, sem, testIndex)).filter(v => v != null);
      const classTestStats = calcComprehensiveStats(allTestGrades);
      const { criteriaStats, classMeanTotalScored } = calcTestExerciseClassStats(classObj, sem, testIndex, config);

      const nameMode = getGsNameDisplayMode();
      const fullName = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
        ? StudentNameUtils.formatStudentName(student, nameMode)
        : `${student.firstName || ''} ${student.lastName || ''}`.trim();

      const gaugeSvg = renderNeobrutalistSvgBenchmarkGauge({
        studentVal: grade,
        classAvg: classTestStats.mean,
        label: "Student Score vs. Class Mean"
      });

      // Criteria Table Rows
      let criteriaRows = '';
      if (config.criteria.length > 0) {
        criteriaRows = config.criteria.map(cr => {
          const entry = criteriaMap[cr.id] || { points: null, comment: "" };
          const pts = entry.points;
          const { color: critColor } = resolveCriterionPointsColor(cr, pts, config, classObj);
          let ptsStr;
          if (pts != null) {
            const critVars = critColor
              ? ` style="--crit-fg:${getHighContrastTextColor(critColor)};--crit-bg:${critColor}20;--crit-border:${critColor};"`
              : '';
            ptsStr = `<span class="crit-pts-scored"${critVars}>${escapeHtml(fmtN(pts))}</span> <span class="crit-pts-max">/ ${escapeHtml(fmtN(cr.maxPoints))}</span>`;
          } else {
            ptsStr = `<span class="crit-pts-empty">—</span> <span class="crit-pts-max">/ ${escapeHtml(fmtN(cr.maxPoints))}</span>`;
          }
          const stat = criteriaStats[cr.id];
          const meanPts = (stat && stat.avgPts != null) ? fmtN(stat.avgPts) : null;
          const meanPtsStr = meanPts != null ? `${meanPts} / ${fmtN(cr.maxPoints)}` : `— / ${fmtN(cr.maxPoints)}`;
          const comment = entry.comment ? renderMd(entry.comment) : `—`;
          let compBadges = '';
          const effCompIds = getCriterionEffectiveCompetenceIds(cr, classObj, config);
          if (incComp && effCompIds.length > 0) {
            compBadges = '<div style="margin-top:2px;">' + effCompIds.map(cid => {
              const c = findLessonCompetence(cid);
              const label = c ? (c.code || c.title || cid) : cid;
              return `<span style="display:inline-block;background:#0284c7;color:#fff;border-radius:3px;padding:0px 4px;font-size:9px;font-weight:700;margin:1px;">${escapeHtml(label)}</span>`;
            }).join('') + '</div>';
          }
          if (incMeans) {
            return `<tr>
              <td style="font-weight:700;">${escapeHtml(cr.name)}${compBadges}</td>
              <td class="center" style="font-weight:800;">${ptsStr}</td>
              <td class="center" style="font-weight:700;color:#475569;">${meanPtsStr}</td>
              ${incComments ? `<td class="crit-comment-cell">${comment}</td>` : ''}
            </tr>`;
          }
          return `<tr>
            <td style="font-weight:700;">${escapeHtml(cr.name)}${compBadges}</td>
            <td class="center" style="font-weight:800;">${ptsStr}</td>
            ${incComments ? `<td class="crit-comment-cell">${comment}</td>` : ''}
          </tr>`;
        }).join('');
      }

      // Observations
      let obsHtml = '';
      if (notes.length > 0 && notes.some(s => sectionHasContent(s))) {
        const remarkAllocator = createRemarkNumberAllocator(notes);
        const blocks = notes.filter(s => sectionHasContent(s)).map(s => renderObservationSectionHtml(s, (config && config.chipBank) || (classObj && classObj.chipBank), remarkAllocator)).join('');
        obsHtml = `<div class="obs-feedback" style="padding:6px 0;background:transparent;margin-top:6px;">
          <div class="section-heading" style="margin-top:0;">${t('gsReportObservationsFeedback') || 'Observations & Teacher Feedback'}</div>
          ${blocks}
        </div>`;
      }

      // Scale Table
      const scaleHeaders = thresholds.map(t => `<th class="center">${escapeHtml(String(t.grade))}</th>`).join('');
      const scalePcts = thresholds.map(t => `<td class="center">${Math.round(t.ratio * 100)}%</td>`).join('');
      const scalePts = defaultTotals.totalPossible > 0
        ? `<tr><td style="font-weight:700;">Min Points (/${fmtN(defaultTotals.totalPossible)})</td>${thresholds.map(t => `<td class="center">${fmtN(t.ratio * defaultTotals.totalPossible)}</td>`).join('')}</tr>`
        : '';

      const scaleTableHtml = `<table class="report-table" style="font-size:9.5px;margin-top:4px;">
        <thead><tr><th style="font-weight:700;">Grade Scale</th>${scaleHeaders}</tr></thead>
        <tbody>
          <tr><td style="font-weight:700;">Min %</td>${scalePcts}</tr>
          ${scalePts}
        </tbody>
      </table>`;

      const esc = escapeHtml;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(fullName)} - ${esc(testLabel)} Test Report</title>
        <style>${getNeobrutalistReportCss(false, fitPage)}</style></head><body>
        <div class="report-page ${fitPage ? 'fit-one-page' : ''}">
          <div class="report-header">
            <div>
              <div class="report-title">${esc(fullName)} — Test Feedback: ${esc(testLabel)}</div>
              <div class="report-subtitle">Class: ${esc(classObj.name)} &nbsp;·&nbsp; ${esc(semLabel)} &nbsp;·&nbsp; Date: ${esc(config.testDate || 'N/A')}</div>
            </div>
            <div class="report-meta">
              <div class="badge" style="font-size:16px;${gradeColor(grade, config)}">Grade: ${grade != null ? fmtN(grade) : '—'}</div>
            </div>
          </div>

          ${(incKpi || incCharts) ? `
          <div class="test-feedback-kpi-row" style="display:flex;gap:${fitPage ? '6px' : '10px'};align-items:stretch;margin-bottom:${fitPage ? '3px' : '6px'};">
            ${incKpi ? `
            <div class="kpi-grid" style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:${fitPage ? '5px' : '8px'};">
              <div class="kpi-card" style="display:flex;flex-direction:column;justify-content:center;">
                <div class="kpi-label">Points Scored</div>
                <div class="kpi-value">${fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0))} <span style="font-size:11px;font-weight:600;">/ ${fmtN(defaultTotals.totalPossible)}</span></div>
                <div class="kpi-sub">${defaultTotals.totalPossible > 0 ? Math.round((((totals.totalScored || 0) + (totals.totalBonusScored || 0)) / defaultTotals.totalPossible) * 100) + '%' : '-'}</div>
              </div>
              <div class="kpi-card" style="display:flex;flex-direction:column;justify-content:center;">
                <div class="kpi-label">Class Benchmark</div>
                <div class="kpi-value" style="color:${(grade && grade >= (classTestStats.mean || 4.0)) ? '#2e7d32' : '#c62828'};">
                  ${(grade != null && classTestStats.mean != null) ? ((grade - classTestStats.mean >= 0 ? '+' : '') + (grade - classTestStats.mean).toFixed(2)) : '—'}
                </div>
                <div class="kpi-sub">${(grade && grade >= (classTestStats.mean || 4.0)) ? 'Above average ▲' : 'Below average ▼'}</div>
              </div>
            </div>` : ''}
            ${incCharts ? `
            <div style="flex:1;display:flex;align-items:stretch;">
              ${gaugeSvg}
            </div>` : ''}
          </div>` : ''}

          ${(incCriteria && config.criteria.length > 0) ? (incMeans ? `
          <div class="section-heading" style="margin-top:6px;">${t('gsReportCriteriaEvalComments') || 'Criteria Evaluation & Detailed Comments'}</div>
          <table class="report-table">
            <thead>
              <tr>
                <th style="${incComments ? 'width:22%;' : 'width:50%;'}">${t('gsCriteriaLabelName') || 'Criterion'}</th>
                <th class="center" style="${incComments ? 'width:12%;' : 'width:25%;'}">${t('gsGradingManualPts') || 'Points Scored'}</th>
                <th class="center" style="${incComments ? 'width:12%;' : 'width:25%;'}">${t('gsReportClassMeanHeader') || 'Class Mean'}</th>
                ${incComments ? `<th style="width:54%;">${t('gsColComments') || 'Comments & Feedback'}</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${criteriaRows}
              <tr class="stats-row">
                <td style="font-weight:800;">${t('gsTotal') || 'Total Score'}</td>
                <td class="center" style="font-weight:800;">${fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0))} / ${fmtN(defaultTotals.totalPossible)}</td>
                <td class="center" style="font-weight:800;color:#475569;">${classMeanTotalScored != null ? `${fmtN(classMeanTotalScored)} / ${fmtN(defaultTotals.totalPossible)}` : '—'}</td>
                ${incComments ? `<td></td>` : ''}
              </tr>
            </tbody>
          </table>` : `
          <div class="section-heading" style="margin-top:6px;">${t('gsReportCriteriaEvalComments') || 'Criteria Evaluation & Detailed Comments'}</div>
          <table class="report-table">
            <thead>
              <tr>
                <th style="${incComments ? 'width:24%;' : 'width:65%;'}">${t('gsCriteriaLabelName') || 'Criterion'}</th>
                <th class="center" style="${incComments ? 'width:14%;' : 'width:35%;'}">${t('gsGradingManualPts') || 'Points Scored'}</th>
                ${incComments ? `<th style="width:62%;">${t('gsColComments') || 'Comments & Feedback'}</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${criteriaRows}
              <tr class="stats-row">
                <td style="font-weight:800;">${t('gsTotal') || 'Total Score'}</td>
                <td class="center" style="font-weight:800;">${fmtN((totals.totalScored || 0) + (totals.totalBonusScored || 0))} / ${fmtN(defaultTotals.totalPossible)}</td>
                ${incComments ? `<td></td>` : ''}
              </tr>
            </tbody>
          </table>`) : ''}

          ${(() => {
            if (!incComp) return '';
            const compMap = new Map();
            (config.criteria || []).forEach(cr => {
              const effCompIds = getCriterionEffectiveCompetenceIds(cr, classObj, config);
              if (effCompIds.length > 0) {
                effCompIds.forEach(cid => {
                  if (!compMap.has(cid)) {
                    compMap.set(cid, { competence: findLessonCompetence(cid) || { id: cid, code: cid, title: cid }, criteria: [] });
                  }
                  compMap.get(cid).criteria.push(cr);
                });
              }
            });
            if (compMap.size === 0) return '';
            const rows = Array.from(compMap.entries()).map(([cid, data]) => {
              const comp = data.competence;
              const critList = data.criteria;
              const critNames = critList.map(c => esc(c.name)).join(', ');
              const maxPtsTotal = critList.reduce((acc, c) => acc + (c.maxPoints || 0), 0);
              
              let studentScoredSum = 0;
              let hasScoredAny = false;
              critList.forEach(c => {
                const entry = criteriaMap[c.id];
                if (entry && entry.points != null) {
                  studentScoredSum += entry.points;
                  hasScoredAny = true;
                }
              });
              const pct = (hasScoredAny && maxPtsTotal > 0) ? Math.round((studentScoredSum / maxPtsTotal) * 100) : null;
              const scoreStr = hasScoredAny ? `${fmtN(studentScoredSum)} / ${fmtN(maxPtsTotal)} (${pct}%)` : '—';
              const scoreColor = pct != null ? (pct >= 60 ? '#2e7d32' : (pct >= 40 ? '#f57c00' : '#c62828')) : '#111';

              return `<tr>
                <td style="font-weight:800;color:#0284c7;">${esc(comp.code || comp.id || '')}</td>
                <td><strong>${esc(comp.title || '')}</strong>${comp.description ? `<div style="font-size:10px;color:#555;margin-top:2px;">${esc(comp.description)}</div>` : ''}</td>
                <td class="center"><span style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600;">${esc(comp.level || comp.category || '—')}</span></td>
                <td>${critNames}</td>
                <td class="center" style="font-weight:800;color:${scoreColor};">${scoreStr}</td>
              </tr>`;
            }).join('');

            return `
              <div class="section-heading" style="margin-top:8px;">Curriculum Competences Performance</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th style="width:90px;">Code</th>
                    <th>Competence Title & Description</th>
                    <th class="center" style="width:80px;">Level/Domain</th>
                    <th style="width:160px;">Linked Criteria</th>
                    <th class="center" style="width:120px;">Student Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            `;
          })()}

          ${incObs ? obsHtml : ''}

          ${incScale ? `
          <div class="section-heading" style="margin-top:6px;">Grading Scale Reference</div>
          ${scaleTableHtml}` : ''}
        </div>
        ${getReportAutoScaleScript(false, fitPage)}
      </body></html>`;
    }

    // ── Interactive Report Modal Handlers ──

    var _saveReportOptionsTimer = null;
    function saveReportOptionsConfigFile() {
      const opts = {
        version: 1,
        includeCompetences: getReportIncludeCompetences(),
        includeExerciseMeans: getReportIncludeExerciseMeans(),
        includeKpi: getReportIncludeKpi(),
        includeCharts: getReportIncludeCharts(),
        includeCriteria: getReportIncludeCriteria(),
        includeComments: getReportIncludeComments(),
        includeObservations: getReportIncludeObservations(),
        includeObservationChips: getReportIncludeObservationChips(),
        includeScale: getReportIncludeScale(),
        fitToOnePage: getReportFitToOnePage()
      };
      window.GRADE_SHEET_REPORT_OPTIONS = opts;
      window.REPORT_OPTIONS = opts;

      clearTimeout(_saveReportOptionsTimer);
      _saveReportOptionsTimer = setTimeout(async function() {
        if (window.Desktop && Desktop.isElectron() && typeof Desktop.saveText === 'function') {
          try {
            const content = '// Grade Sheet Report Options Configuration\n// Automatically updated\nwindow.GRADE_SHEET_REPORT_OPTIONS = ' + JSON.stringify(opts, null, 2) + ';\n';
            await Desktop.saveText('user', 'report-options.js', content);
          } catch (e) {
            console.warn('grade-sheet: Failed to save user/report-options.js:', e);
          }
        }
      }, 250);
    }

    async function loadReportOptionsConfigFile() {
      // 1. If already set via user script bootstrap
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS === 'object') {
        applyReportOptions(window.GRADE_SHEET_REPORT_OPTIONS);
        return true;
      }
      // 2. Read from Desktop if in Electron
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
        try {
          const r = await Desktop.readText('user', 'report-options.js');
          if (r && r.ok && r.content) {
            const match = r.content.match(/window\.GRADE_SHEET_REPORT_OPTIONS\s*=\s*(\{[\s\S]*?\});/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              if (parsed && typeof parsed === 'object') {
                window.GRADE_SHEET_REPORT_OPTIONS = parsed;
                window.REPORT_OPTIONS = parsed;
                applyReportOptions(parsed);
                return true;
              }
            }
          } else {
            // File doesn't exist yet: initialize with current options and persist
            saveReportOptionsConfigFile();
          }
        } catch (e) {
          console.warn('grade-sheet: could not load user/report-options.js:', e);
        }
      }
      return false;
    }

    function applyReportOptions(opts) {
      if (!opts || typeof opts !== 'object') return;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      Object.assign(window.GRADE_SHEET_REPORT_OPTIONS, opts);
      window.REPORT_OPTIONS = window.GRADE_SHEET_REPORT_OPTIONS;

      if (typeof opts.includeCompetences === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-competences', opts.includeCompetences ? 'true' : 'false');
      }
      if (typeof opts.includeExerciseMeans === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-exercise-means', opts.includeExerciseMeans ? 'true' : 'false');
      }
      if (typeof opts.includeKpi === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-kpi', opts.includeKpi ? 'true' : 'false');
      }
      if (typeof opts.includeCharts === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-charts', opts.includeCharts ? 'true' : 'false');
      }
      if (typeof opts.includeCriteria === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-criteria', opts.includeCriteria ? 'true' : 'false');
      }
      if (typeof opts.includeComments === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-comments', opts.includeComments ? 'true' : 'false');
      }
      if (typeof opts.includeObservations === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-observations', opts.includeObservations ? 'true' : 'false');
      }
      if (typeof opts.includeObservationChips === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-observation-chips', opts.includeObservationChips ? 'true' : 'false');
      }
      if (typeof opts.includeScale === 'boolean') {
        localStorage.setItem('cmt-gs-report-include-scale', opts.includeScale ? 'true' : 'false');
      }
      if (typeof opts.fitToOnePage === 'boolean') {
        localStorage.setItem('cmt-gs-report-fit-one-page', opts.fitToOnePage ? 'true' : 'false');
      }
      syncReportOptionControls();
    }

    function getReportFitToOnePage() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.fitToOnePage === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.fitToOnePage;
      }
      const cached = localStorage.getItem('cmt-gs-report-fit-one-page');
      if (cached !== null) return cached === 'true';
      const el = document.getElementById('gs-report-toggle-fit-page') || document.getElementById('gs-pdf-export-fit-page');
      return el ? !!el.checked : false;
    }

    function setReportFitToOnePage(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.fitToOnePage = boolVal;
      localStorage.setItem('cmt-gs-report-fit-one-page', boolVal ? 'true' : 'false');
      const el1 = document.getElementById('gs-report-toggle-fit-page');
      if (el1) el1.checked = boolVal;
      const el2 = document.getElementById('gs-pdf-export-fit-page');
      if (el2) el2.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeCompetences() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeCompetences === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeCompetences;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-competences');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-competences');
      return el ? !!el.checked : true;
    }

    function setReportIncludeCompetences(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeCompetences = boolVal;
      localStorage.setItem('cmt-gs-report-include-competences', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-competences');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeExerciseMeans() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeExerciseMeans === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeExerciseMeans;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-exercise-means');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-exercise-means');
      return el ? !!el.checked : true;
    }

    function setReportIncludeExerciseMeans(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeExerciseMeans = boolVal;
      localStorage.setItem('cmt-gs-report-include-exercise-means', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-exercise-means');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeKpi() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeKpi === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeKpi;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-kpi');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-kpi');
      return el ? !!el.checked : true;
    }

    function setReportIncludeKpi(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeKpi = boolVal;
      localStorage.setItem('cmt-gs-report-include-kpi', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-kpi');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeCharts() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeCharts === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeCharts;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-charts');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-charts');
      return el ? !!el.checked : true;
    }

    function setReportIncludeCharts(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeCharts = boolVal;
      localStorage.setItem('cmt-gs-report-include-charts', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-charts');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeCriteria() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeCriteria === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeCriteria;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-criteria');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-criteria');
      return el ? !!el.checked : true;
    }

    function setReportIncludeCriteria(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeCriteria = boolVal;
      localStorage.setItem('cmt-gs-report-include-criteria', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-criteria');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeComments() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeComments === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeComments;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-comments');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-comments');
      return el ? !!el.checked : true;
    }

    function setReportIncludeComments(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeComments = boolVal;
      localStorage.setItem('cmt-gs-report-include-comments', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-comments');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeObservations() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeObservations === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeObservations;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-observations');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-observations');
      return el ? !!el.checked : true;
    }

    function setReportIncludeObservations(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeObservations = boolVal;
      localStorage.setItem('cmt-gs-report-include-observations', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-observations');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeObservationChips() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeObservationChips === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeObservationChips;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-observation-chips');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-observation-chips');
      return el ? !!el.checked : true;
    }

    function setReportIncludeObservationChips(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeObservationChips = boolVal;
      localStorage.setItem('cmt-gs-report-include-observation-chips', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-observation-chips');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportIncludeScale() {
      if (window.GRADE_SHEET_REPORT_OPTIONS && typeof window.GRADE_SHEET_REPORT_OPTIONS.includeScale === 'boolean') {
        return window.GRADE_SHEET_REPORT_OPTIONS.includeScale;
      }
      const cached = localStorage.getItem('cmt-gs-report-include-scale');
      if (cached !== null) return cached !== 'false';
      const el = document.getElementById('gs-report-toggle-scale');
      return el ? !!el.checked : true;
    }

    function setReportIncludeScale(val) {
      const boolVal = !!val;
      if (!window.GRADE_SHEET_REPORT_OPTIONS) window.GRADE_SHEET_REPORT_OPTIONS = {};
      window.GRADE_SHEET_REPORT_OPTIONS.includeScale = boolVal;
      localStorage.setItem('cmt-gs-report-include-scale', boolVal ? 'true' : 'false');
      const el = document.getElementById('gs-report-toggle-scale');
      if (el) el.checked = boolVal;
      saveReportOptionsConfigFile();
    }

    function getReportOptions() {
      return {
        includeKpi: getReportIncludeKpi(),
        includeCharts: getReportIncludeCharts(),
        includeCriteria: getReportIncludeCriteria(),
        includeComments: getReportIncludeComments(),
        includeObservations: getReportIncludeObservations(),
        includeObservationChips: getReportIncludeObservationChips(),
        includeScale: getReportIncludeScale(),
        includeCompetences: getReportIncludeCompetences(),
        includeExerciseMeans: getReportIncludeExerciseMeans(),
        fitToOnePage: getReportFitToOnePage()
      };
    }

    function syncReportOptionControls() {
      const opts = getReportOptions();
      const elKpi = document.getElementById('gs-report-toggle-kpi');
      if (elKpi) elKpi.checked = opts.includeKpi;
      const elCharts = document.getElementById('gs-report-toggle-charts');
      if (elCharts) elCharts.checked = opts.includeCharts;
      const elCriteria = document.getElementById('gs-report-toggle-criteria');
      if (elCriteria) elCriteria.checked = opts.includeCriteria;
      const elComments = document.getElementById('gs-report-toggle-comments');
      if (elComments) elComments.checked = opts.includeComments;
      const elObs = document.getElementById('gs-report-toggle-observations');
      if (elObs) elObs.checked = opts.includeObservations;
      const elChips = document.getElementById('gs-report-toggle-observation-chips');
      if (elChips) elChips.checked = opts.includeObservationChips;
      const elScale = document.getElementById('gs-report-toggle-scale');
      if (elScale) elScale.checked = opts.includeScale;
      const elComp = document.getElementById('gs-report-toggle-competences');
      if (elComp) elComp.checked = opts.includeCompetences;
      const elMeans = document.getElementById('gs-report-toggle-exercise-means');
      if (elMeans) elMeans.checked = opts.includeExerciseMeans;
      const elFit = document.getElementById('gs-report-toggle-fit-page');
      if (elFit) elFit.checked = opts.fitToOnePage;
    }

    function toggleReportOptionsMenu(forceState) {
      const menu = document.getElementById('gs-report-options-menu');
      if (!menu) return;
      const shouldOpen = typeof forceState === 'boolean' ? forceState : menu.classList.contains('hidden');
      if (shouldOpen) {
        syncReportOptionControls();
        menu.classList.remove('hidden');
      } else {
        menu.classList.add('hidden');
      }
    }

    function openReportOptionsModal() {
      toggleReportOptionsMenu(true);
    }

    function closeReportOptionsModal() {
      toggleReportOptionsMenu(false);
    }

    function closeReportOptionsMenu() {
      toggleReportOptionsMenu(false);
    }

    function refreshActiveReportPreview() {
      if (!_currentActiveReport || typeof _currentActiveReport.rebuild !== 'function') return;
      const opts = getReportOptions();
      const newHtml = _currentActiveReport.rebuild(opts);
      _currentActiveReport.html = newHtml;
      const frame = document.getElementById('gs-report-preview-frame');
      if (frame) {
        frame.srcdoc = newHtml;
        frame.onload = function () {
          if (window.ExportStylesService) {
            var sId = ExportStylesService.getSelectedStyle('gradeSheet');
            ExportStylesService.applyStyleToIframe(frame, sId);
          }
        };
      }
    }

    function openReportModal(reportHtml, title, defaultFilename, options = {}) {
      const esc = escapeHtml;
      syncReportOptionControls();

      const teacherName = (typeof window.getAppTeacherName === 'function') ? window.getAppTeacherName() : '';
      const footerHtml = `<footer class="exp-footer report-footer" style="margin-top:24px;padding-top:8px;border-top:1.5px solid #333333;display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;break-inside:avoid;page-break-inside:avoid;">
        <span class="exp-footer-left">${esc(title || 'Grade Report')} | Class Management Tools</span>
        ${teacherName ? `<span class="exp-footer-center" style="font-weight:700;color:#222;">${esc(teacherName)}</span>` : ''}
        <span class="exp-footer-right">Exported: ${new Date().toLocaleDateString()}</span>
      </footer>`;

      let finalReportHtml = reportHtml || '';
      if (finalReportHtml && finalReportHtml.indexOf('exp-footer') === -1) {
        if (finalReportHtml.indexOf('</body>') !== -1) {
          finalReportHtml = finalReportHtml.replace('</body>', footerHtml + '</body>');
        } else {
          finalReportHtml += footerHtml;
        }
      }

      _currentActiveReport = {
        html: finalReportHtml,
        title: title || t('gsReportModalTitle') || 'Report Preview',
        defaultFilename: defaultFilename || 'grade-report',
        isLandscape: !!options.isLandscape,
        markdown: options.markdown || null,
        reportType: options.reportType || null,
        rebuild: typeof options.rebuild === 'function' ? options.rebuild : null
      };

      const fitToggle = document.getElementById('gs-report-toggle-fit-page');
      if (fitToggle) {
        fitToggle.checked = getReportFitToOnePage();
        const lbl = document.getElementById('gs-report-toggle-fit-page-wrap') || fitToggle.closest('label') || fitToggle.parentElement;
        if (lbl) lbl.style.display = _currentActiveReport.rebuild ? 'inline-flex' : 'none';
      }

      const titleEl = document.getElementById('gs-report-modal-title');
      if (titleEl) titleEl.textContent = _currentActiveReport.title;

      const frame = document.getElementById('gs-report-preview-frame');
      if (frame) {
        frame.srcdoc = finalReportHtml;
        frame.onload = function () {
          if (window.ExportStylesService) {
            var sId = ExportStylesService.getSelectedStyle('gradeSheet');
            ExportStylesService.applyStyleToIframe(frame, sId);
          }
        };
      }

      if (window.ExportStylesService) {
        ExportStylesService.renderStyleSelector(document.getElementById('gs-report-style-selector-wrap'), {
          toolKey: 'gradeSheet',
          onChange: function (styleId) {
            var f = document.getElementById('gs-report-preview-frame');
            if (f) ExportStylesService.applyStyleToIframe(f, styleId);
          }
        });
      }
      if (window.ExportLangService) {
        ExportLangService.renderLangSelector(document.getElementById('gs-report-lang-selector-wrap'), {
          toolKey: 'gradeSheet',
          onChange: async function () {
            if (!_currentActiveReport || typeof _currentActiveReport.rebuild !== 'function') return;
            const rebuilt = await ExportLangService.withExportLang('gradeSheet', () => _currentActiveReport.rebuild());
            if (rebuilt) {
              _currentActiveReport.html = rebuilt;
              var f = document.getElementById('gs-report-preview-frame');
              if (f) f.srcdoc = rebuilt;
            }
          }
        });
      }

      document.getElementById('gs-report-modal-overlay').classList.remove('hidden');
    }

    function closeReportModal() {
      closeReportOptionsMenu();
      document.getElementById('gs-report-modal-overlay').classList.add('hidden');
      const frame = document.getElementById('gs-report-preview-frame');
      if (frame) frame.srcdoc = '';
      _currentActiveReport = null;
    }

    async function printCurrentReport() {
      if (!_currentActiveReport) return;
      const frame = document.getElementById('gs-report-preview-frame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      }
    }

    async function exportCurrentReportPdf() {
      const esc = escapeHtml;
      if (!_currentActiveReport) return;
      const report = _currentActiveReport;
      const { html, defaultFilename, isLandscape, rebuild } = report;
      if (window.Desktop && Desktop.isElectron()) {
        try {
          const destination = await openGsPdfExportModal();
          if (!destination) return;
          const pdfSettings = getPdfExportSettings();
          let fname = `${defaultFilename || 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`;

          let finalHtml = html;
          if (rebuild && typeof rebuild === 'function') {
            finalHtml = rebuild(getReportOptions());
            const teacherName = (typeof window.getAppTeacherName === 'function') ? window.getAppTeacherName() : '';
            const footerHtml = `<footer class="exp-footer report-footer" style="margin-top:24px;padding-top:8px;border-top:1.5px solid #333333;display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;break-inside:avoid;page-break-inside:avoid;">
              <span class="exp-footer-left">${esc(report.title || 'Grade Report')} | Class Management Tools</span>
              ${teacherName ? `<span class="exp-footer-center" style="font-weight:700;color:#222;">${esc(teacherName)}</span>` : ''}
              <span class="exp-footer-right">Exported: ${new Date().toLocaleDateString()}</span>
            </footer>`;
            if (finalHtml && finalHtml.indexOf('exp-footer') === -1) {
              if (finalHtml.indexOf('</body>') !== -1) {
                finalHtml = finalHtml.replace('</body>', footerHtml + '</body>');
              } else {
                finalHtml += footerHtml;
              }
            }
          }
          if (window.ExportStylesService) {
            var sId = ExportStylesService.getSelectedStyle('gradeSheet');
            finalHtml = await ExportStylesService.injectStyleIntoHtml(finalHtml, sId);
          }

          const gsTarget = window.cmtResolveExportTarget ? window.cmtResolveExportTarget(destination) : (destination === 'to-print' ? 'toPrint' : null);
          if (gsTarget && window.resolveExportFilenameConflict) {
            const conflictRes = await window.resolveExportFilenameConflict({ filename: fname, target: gsTarget });
            if (!conflictRes || conflictRes.canceled) return;
            fname = conflictRes.filename || fname;
          }

          const pdfReq = {
            html: finalHtml,
            landscape: isLandscape != null ? isLandscape : pdfSettings.isLandscape,
            pdfOptions: {
              pageSize: pdfSettings.pageSize || 'A4',
              landscape: isLandscape != null ? isLandscape : pdfSettings.isLandscape,
              margins: parseCssMarginToInches(getReportFitToOnePage() ? '6mm 9mm 5mm 9mm' : (pdfSettings.margin || '16mm 14mm'))
            }
          };
          if (gsTarget) {
            pdfReq.target = gsTarget;
            pdfReq.filename = fname;
          } else {
            pdfReq.defaultName = fname;
          }
          const res = await Desktop.printPdf(pdfReq);
          if (res && res.ok) {
            showToast(
              destination === 'to-print'
                ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (res.name || fname))
                : (t('deExportPdfSuccess') || 'PDF exported')
            );
            if (window.showExportSuccessPopup && res.path) {
              showExportSuccessPopup(res.path, res.name || fname);
            }
          }
        } catch (e) {
          console.error(e);
          await showAlert((t('gsAlertPdfExportFailed') || 'PDF export failed:') + ' ' + (e && e.message ? e.message : String(e)));
        }
        return;
      }
      printCurrentReport();
    }

    async function exportCurrentReportHtml() {
      if (!_currentActiveReport) return;
      let { html, defaultFilename, rebuild } = _currentActiveReport;
      if (rebuild && typeof rebuild === 'function') {
        html = rebuild(getReportOptions());
      }
      if (window.ExportStylesService) {
        var sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId);
      }
      const fname = `${defaultFilename}-${new Date().toISOString().slice(0, 10)}.html`;
      downloadTextFile(html, fname, "text/html;charset=utf-8");
    }

    async function exportCurrentReportDocx() {
      if (!_currentActiveReport) return;
      const { markdown, defaultFilename, isLandscape } = _currentActiveReport;
      if (!window.Desktop || !Desktop.isElectron()) {
        await showAlert(t('gsAlertDocxDesktopOnly'));
        return;
      }
      const fname = `${defaultFilename}-${new Date().toISOString().slice(0, 10)}`;
      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename: `${fname}.docx`,
          docxRequest: {
            markdown: markdown || "# Report\n\nReport details.",
            defaultName: fname,
            fontFamily: 'Segoe UI',
            fontSize: '10pt',
            lineHeight: '1.2',
            margins: { top: 18, right: 16, bottom: 18, left: 16 },
            size: 'A4',
            orientation: isLandscape ? 'landscape' : 'portrait'
          }
        });
      }
      const result = await Desktop.exportDocx({
        markdown: markdown || "# Report\n\nReport details.",
        defaultName: fname,
        fontFamily: 'Segoe UI',
        fontSize: '10pt',
        lineHeight: '1.2',
        margins: { top: 18, right: 16, bottom: 18, left: 16 },
        size: 'A4',
        orientation: isLandscape ? 'landscape' : 'portrait'
      });
      if (result && result.ok) {
        if (window.showExportSuccessPopup && result.path) {
          showExportSuccessPopup(result.path, result.name || (fname + '.docx'));
        }
        return;
      }
      if (result && !result.canceled) {
        await showAlert(t('gsAlertDocxExportFailed'));
      }
    }

    // ── Trigger Actions ──

    function openClassYearReport(classObj) {
      if (!classObj) return;
      const opts = getReportOptions();
      const html = buildClassYearReportHtml(classObj, opts.fitToOnePage);
      const slug = slugifyForPath(classObj.name || "class");
      openReportModal(html, `${classObj.name} — Annual Class Report`, `${slug}-year-report`, {
        isLandscape: true,
        reportType: 'class-year',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildClassYearReportHtml(classObj, o.fitToOnePage, o);
        }
      });
    }

    function openClassSemesterReport(classObj, sem) {
      if (!classObj) return;
      const opts = getReportOptions();
      const html = buildClassSemesterReportHtml(classObj, sem, opts.fitToOnePage, opts);
      const slug = slugifyForPath(classObj.name || "class");
      openReportModal(html, `${classObj.name} — ${sem.toUpperCase()} Class Report`, `${slug}-${sem}-report`, {
        isLandscape: false,
        reportType: 'class-semester',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildClassSemesterReportHtml(classObj, sem, o.fitToOnePage, o);
        }
      });
    }

    function openClassTestReport(classObj, sem, testIndex) {
      if (!classObj) return;
      const opts = getReportOptions();
      const html = buildClassTestReportHtml(classObj, sem, testIndex, opts.includeCompetences, opts.fitToOnePage, opts);
      const slug = slugifyForPath(classObj.name || "class");
      openReportModal(html, `${classObj.name} — ${sem.toUpperCase()} T${testIndex + 1} Test Report`, `${slug}-${sem}-t${testIndex + 1}-report`, {
        isLandscape: false,
        reportType: 'class-test',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildClassTestReportHtml(classObj, sem, testIndex, o.includeCompetences, o.fitToOnePage, o);
        }
      });
    }

    function openStudentYearReport(classObj, student) {
      if (!classObj || !student) return;
      const opts = getReportOptions();
      const html = buildStudentYearReportHtml(classObj, student, opts.fitToOnePage);
      const slug = slugifyForPath(classObj.name || "class");
      const stuSlug = slugifyForPath(student.lastName || student.firstName || "student");
      openReportModal(html, `${student.firstName} ${student.lastName} — Annual Student Report`, `${slug}-${stuSlug}-year-report`, {
        isLandscape: false,
        reportType: 'student-year',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildStudentYearReportHtml(classObj, student, o.fitToOnePage);
        }
      });
    }

    function openStudentSemesterReport(classObj, student, sem) {
      if (!classObj || !student) return;
      const opts = getReportOptions();
      const html = buildStudentSemesterReportHtml(classObj, student, sem, opts.fitToOnePage);
      const slug = slugifyForPath(classObj.name || "class");
      const stuSlug = slugifyForPath(student.lastName || student.firstName || "student");
      openReportModal(html, `${student.firstName} ${student.lastName} — ${sem.toUpperCase()} Student Report`, `${slug}-${stuSlug}-${sem}-report`, {
        isLandscape: false,
        reportType: 'student-semester',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildStudentSemesterReportHtml(classObj, student, sem, o.fitToOnePage);
        }
      });
    }

    function openStudentTestReport(classObj, student, sem, testIndex) {
      if (!classObj || !student) return;
      const opts = getReportOptions();
      const html = buildStudentTestReportHtml(classObj, student, sem, testIndex, opts.includeCompetences, opts.includeExerciseMeans, opts.fitToOnePage, opts);
      const slug = slugifyForPath(classObj.name || "class");
      const stuSlug = slugifyForPath(student.lastName || student.firstName || "student");
      openReportModal(html, `${student.firstName} ${student.lastName} — ${sem.toUpperCase()} T${testIndex + 1} Report`, `${slug}-${stuSlug}-${sem}-t${testIndex + 1}-report`, {
        isLandscape: false,
        reportType: 'student-test',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildStudentTestReportHtml(classObj, student, sem, testIndex, o.includeCompetences, o.includeExerciseMeans, o.fitToOnePage, o);
        }
      });
    }

    function extractReportPages(fullHtml) {
      if (!fullHtml) return '';
      const startIdx = fullHtml.indexOf('<div class="report-page');
      const endIdx = fullHtml.lastIndexOf('</div>');
      if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        return fullHtml.slice(startIdx, endIdx + 6);
      }
      return fullHtml;
    }

    function buildBatchStudentTestReportHtml(classObj, sem, testIndex, includeCompetences = getReportIncludeCompetences(), includeExerciseMeans = getReportIncludeExerciseMeans(), fitToOnePage = getReportFitToOnePage(), options = {}) {
      ensureClassStructures(classObj);
      const opts = (typeof options === 'object' && options !== null) ? options : {
        includeCompetences,
        includeExerciseMeans,
        fitToOnePage
      };
      const esc = escapeHtml;
      const config = getTestConfig(classObj, sem, testIndex);
      const testNo = testIndex + 1;
      const testLabel = config.testName ? String(config.testName) : `T${testNo}`;
      const pages = (classObj.students || []).map(s => {
        const singleHtml = buildStudentTestReportHtml(classObj, s, sem, testIndex, opts.includeCompetences, opts.includeExerciseMeans, opts.fitToOnePage, opts);
        return extractReportPages(singleHtml);
      }).join('\n');

      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(classObj.name)} - ${esc(testLabel)} All Student Test Reports</title>
        <style>${getNeobrutalistReportCss(false, opts.fitToOnePage)}</style></head><body>
        ${pages}
        ${getReportAutoScaleScript(false, opts.fitToOnePage)}
      </body></html>`;
    }

    function buildBatchStudentYearReportHtml(classObj, fitToOnePage = getReportFitToOnePage()) {
      ensureClassStructures(classObj);
      const esc = escapeHtml;
      const pages = (classObj.students || []).map(s => {
        const singleHtml = buildStudentYearReportHtml(classObj, s, fitToOnePage);
        return extractReportPages(singleHtml);
      }).join('\n');

      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(classObj.name)} - Annual Student Reports</title>
        <style>${getNeobrutalistReportCss(false, fitToOnePage)}</style></head><body>
        ${pages}
        ${getReportAutoScaleScript(false, fitToOnePage)}
      </body></html>`;
    }

    function buildBatchStudentSemesterReportHtml(classObj, sem, fitToOnePage = getReportFitToOnePage()) {
      ensureClassStructures(classObj);
      const esc = escapeHtml;
      const pages = (classObj.students || []).map(s => {
        const singleHtml = buildStudentSemesterReportHtml(classObj, s, sem, fitToOnePage);
        return extractReportPages(singleHtml);
      }).join('\n');

      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${esc(classObj.name)} - ${sem.toUpperCase()} Student Reports</title>
        <style>${getNeobrutalistReportCss(false, fitToOnePage)}</style></head><body>
        ${pages}
        ${getReportAutoScaleScript(false, fitToOnePage)}
      </body></html>`;
    }

    function openBatchStudentTestReport(classObj, sem, testIndex) {
      if (!classObj) return;
      const opts = getReportOptions();
      const html = buildBatchStudentTestReportHtml(classObj, sem, testIndex, opts.includeCompetences, opts.includeExerciseMeans, opts.fitToOnePage, opts);
      const slug = slugifyForPath(classObj.name || "class");
      openReportModal(html, `${classObj.name} — All Students: ${sem.toUpperCase()} T${testIndex + 1} Reports`, `${slug}-all-students-${sem}-t${testIndex + 1}-report`, {
        isLandscape: false,
        reportType: 'student-test',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildBatchStudentTestReportHtml(classObj, sem, testIndex, o.includeCompetences, o.includeExerciseMeans, o.fitToOnePage, o);
        }
      });
    }

    function openBatchStudentYearReport(classObj) {
      if (!classObj) return;
      const opts = getReportOptions();
      const html = buildBatchStudentYearReportHtml(classObj, opts.fitToOnePage);
      const slug = slugifyForPath(classObj.name || "class");
      openReportModal(html, `${classObj.name} — All Students: Annual Reports`, `${slug}-all-students-year-reports`, {
        isLandscape: false,
        reportType: 'student-year',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildBatchStudentYearReportHtml(classObj, o.fitToOnePage);
        }
      });
    }

    function openBatchStudentSemesterReport(classObj, sem) {
      if (!classObj) return;
      const opts = getReportOptions();
      const html = buildBatchStudentSemesterReportHtml(classObj, sem, opts.fitToOnePage);
      const slug = slugifyForPath(classObj.name || "class");
      openReportModal(html, `${classObj.name} — All Students: ${sem.toUpperCase()} Reports`, `${slug}-all-students-${sem}-reports`, {
        isLandscape: false,
        reportType: 'student-semester',
        rebuild: (options) => {
          const o = (typeof options === 'object' && options !== null) ? options : getReportOptions();
          return buildBatchStudentSemesterReportHtml(classObj, sem, o.fitToOnePage);
        }
      });
    }

    let _studentSelectModalCtx = null;
    function openStudentSelectModal(classObj, defaultScope = "year", sem = "sem1", testIndex = 0) {
      if (!classObj) return;
      _studentSelectModalCtx = { classObj, sem, testIndex };
      const sel = document.getElementById('gs-student-select-input');
      const scopeSel = document.getElementById('gs-student-report-type-input');
      if (sel) {
        sel.innerHTML = '';
        
        const allOpt = document.createElement('option');
        allOpt.value = '__all__';
        allOpt.textContent = t('gsReportWholeClassOption') || '★ Whole Class (All Students)';
        sel.appendChild(allOpt);

        const nameMode = getGsNameDisplayMode();
        (classObj.students || []).forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function')
            ? StudentNameUtils.formatStudentName(s, nameMode)
            : `${s.firstName || ''} ${s.lastName || ''}`.trim();
          sel.appendChild(opt);
        });
      }
      if (scopeSel) {
        scopeSel.value = defaultScope || "year";
      }
      document.getElementById('gs-student-select-overlay').classList.remove('hidden');
    }

    function closeStudentSelectModal() {
      document.getElementById('gs-student-select-overlay').classList.add('hidden');
      _studentSelectModalCtx = null;
    }

    function confirmStudentSelectReport() {
      if (!_studentSelectModalCtx) return;
      const { classObj, sem, testIndex } = _studentSelectModalCtx;
      const sel = document.getElementById('gs-student-select-input');
      const scopeSel = document.getElementById('gs-student-report-type-input');
      const studentId = sel ? sel.value : null;
      const scope = scopeSel ? scopeSel.value : 'year';
      closeStudentSelectModal();

      if (studentId === '__all__') {
        if (scope === 'year') openBatchStudentYearReport(classObj);
        else if (scope === 'sem1') openBatchStudentSemesterReport(classObj, 'sem1');
        else if (scope === 'sem2') openBatchStudentSemesterReport(classObj, 'sem2');
        else if (scope === 'test') openBatchStudentTestReport(classObj, sem || 'sem1', testIndex || 0);
        return;
      }

      const student = (classObj.students || []).find(s => s.id === studentId);
      if (!student) return;

      if (scope === 'year') openStudentYearReport(classObj, student);
      else if (scope === 'sem1') openStudentSemesterReport(classObj, student, 'sem1');
      else if (scope === 'sem2') openStudentSemesterReport(classObj, student, 'sem2');
      else if (scope === 'test') openStudentTestReport(classObj, student, sem || 'sem1', testIndex || 0);
    }



    function exportJson() {
      const payload = {
        exportedAt: new Date().toISOString(),
        classes: appState.classes
      };
      downloadTextFile(JSON.stringify(payload, null, 2), "grade-sheet-data.json", "application/json");
    }

    function csvCell(value) {
      const v = value == null ? "" : String(value);
      return `"${v.replaceAll('"', '""')}"`;
    }

    async function downloadTextFile(text, filename, mimeType) {
      const ext = (filename.split('.').pop() || '').toLowerCase();
      let filterName = 'File';
      if (ext === 'html') filterName = 'HTML Document';
      else if (ext === 'md') filterName = 'Markdown Document';
      else if (ext === 'csv') filterName = 'CSV Spreadsheet';
      else if (ext === 'xlsx') filterName = 'Excel Spreadsheet';
      else if (ext === 'json') filterName = 'JSON Document';

      if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
          filename: filename,
          content: text,
          encoding: 'utf8',
          mimeType: mimeType || 'text/plain;charset=utf-8',
          filters: [{ name: filterName, extensions: [ext] }, { name: 'All Files', extensions: ['*'] }],
          title: typeof t === 'function' ? (t('deSaveFileTitle') || 'Save File') : 'Save File'
        });
      }

      const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function buildSemesterGradesCsvRows(classObj) {
      const rows = [];
      const exportedAt = new Date().toISOString();
      ["sem1", "sem2"].forEach(sem => {
        const testCount = Math.max(
          Number(classObj && classObj.testCounts && classObj.testCounts[sem]) || 0,
          detectTestCount(classObj, sem)
        );

        for (let ti = 0; ti < testCount; ti++) {
          classObj.students.forEach(student => {
            const grade = getTestDisplayGrade(student, classObj, sem, ti);
            if (grade == null) return;
            const override = isGradeOverrideEnabled(student, sem, ti);
            rows.push([
              exportedAt,
              classObj.name || "",
              classObj.year || "",
              sem.toUpperCase(),
              `T${ti + 1}`,
              student.index,
              student.firstName || "",
              student.lastName || "",
              grade,
              override ? "yes" : "no"
            ]);
          });
        }
      });
      return rows;
    }

    function buildSemesterOnlyGradesCsvRows(classObj, sem) {
      const rows = [];
      const exportedAt = new Date().toISOString();
      const testCount = Math.max(
        Number(classObj && classObj.testCounts && classObj.testCounts[sem]) || 0,
        detectTestCount(classObj, sem)
      );
      for (let ti = 0; ti < testCount; ti++) {
        classObj.students.forEach(student => {
          const grade = getTestDisplayGrade(student, classObj, sem, ti);
          if (grade == null) return;
          const override = isGradeOverrideEnabled(student, sem, ti);
          rows.push([
            exportedAt,
            classObj.name || "",
            classObj.year || "",
            sem.toUpperCase(),
            `T${ti + 1}`,
            student.index,
            student.firstName || "",
            student.lastName || "",
            grade,
            override ? "yes" : "no"
          ]);
        });
      }
      return rows;
    }

    function buildSingleTestGradesCsvRows(classObj, sem, testIndex) {
      const rows = [];
      const exportedAt = new Date().toISOString();
      classObj.students.forEach(student => {
        const grade = getTestDisplayGrade(student, classObj, sem, testIndex);
        if (grade == null) return;
        const override = isGradeOverrideEnabled(student, sem, testIndex);
        rows.push([
          exportedAt,
          classObj.name || "",
          classObj.year || "",
          sem.toUpperCase(),
          `T${testIndex + 1}`,
          student.index,
          student.firstName || "",
          student.lastName || "",
          grade,
          override ? "yes" : "no"
        ]);
      });
      return rows;
    }

    function refreshCsvExportPopupState() {
      const scopeEl = document.getElementById("csv-export-scope");
      const semWrap = document.getElementById("csv-export-sem-wrap");
      const testWrap = document.getElementById("csv-export-test-wrap");
      const semEl = document.getElementById("csv-export-semester");
      const testEl = document.getElementById("csv-export-test");
      const classObj = getActiveClass();

      if (!scopeEl || !semWrap || !testWrap || !semEl || !testEl || !classObj) return;

      const scope = scopeEl.value;
      const needsSem = scope === "semester" || scope === "test";
      const needsTest = scope === "test";
      semWrap.classList.toggle("hidden", !needsSem);
      testWrap.classList.toggle("hidden", !needsTest);

      if (!needsTest) return;
      const sem = semEl.value;
      const count = Math.max(
        Number(classObj && classObj.testCounts && classObj.testCounts[sem]) || 0,
        detectTestCount(classObj, sem)
      );
      testEl.innerHTML = "";
      const total = Math.max(1, count);
      for (let i = 0; i < total; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `T${i + 1}`;
        testEl.appendChild(opt);
      }
    }

    async function openCsvExportPopup() {
      const classObj = getActiveClass();
      if (!classObj) {
        await showAlert(t('gsAlertOpenClassFirst'));
        return;
      }
      const scopeEl = document.getElementById("csv-export-scope");
      const semEl = document.getElementById("csv-export-semester");
      if (scopeEl) scopeEl.value = "all";
      if (semEl) semEl.value = "sem1";
      refreshCsvExportPopupState();
      document.getElementById("csv-export-popup-overlay").classList.remove("hidden");
    }

    function closeCsvExportPopup() {
      document.getElementById("csv-export-popup-overlay").classList.add("hidden");
    }

    async function exportSemesterGradesCsv() {
      const classObj = getActiveClass();
      if (!classObj) {
        await showAlert(t('gsAlertOpenClassFirst'));
        return;
      }

      const header = [
        t('gsCsvColExportedAt') || "Exported At",
        t('gsDupLabelClass') || "Class",
        t('gsDupLabelYear') || "Year",
        t('gsDupLabelSem') || "Semester",
        t('gsDupLabelTest') || "Test",
        t('gsCsvColStudentIndex') || "Student Index",
        t('gsEditStudentFirstName') || "First Name",
        t('gsEditStudentLastName') || "Last Name",
        t('gsColGrade') || "Grade",
        t('gsCsvColOverride') || "Override"
      ];

      const scope = (document.getElementById("csv-export-scope") && document.getElementById("csv-export-scope").value) || "all";
      const sem = (document.getElementById("csv-export-semester") && document.getElementById("csv-export-semester").value) || "sem1";
      const testIndex = Number((document.getElementById("csv-export-test") && document.getElementById("csv-export-test").value) || "0");

      let rows = [];
      if (scope === "all") rows = buildSemesterGradesCsvRows(classObj);
      else if (scope === "semester") rows = buildSemesterOnlyGradesCsvRows(classObj, sem);
      else rows = buildSingleTestGradesCsvRows(classObj, sem, Math.max(0, testIndex));

      if (rows.length === 0) {
        await showAlert(t('gsAlertNoGrades'));
        return;
      }

      const csvText = [header, ...rows].map(cols => cols.map(csvCell).join(",")).join("\n");
      const slug = slugifyForPath(classObj.name || "class");
      const today = new Date().toISOString().slice(0, 10);
      const suffix = scope === "all"
        ? "all"
        : (scope === "semester" ? sem : `${sem}-t${Math.max(0, testIndex) + 1}`);
      downloadTextFile(csvText, `${slug}-grades-${suffix}-${today}.csv`, "text/csv;charset=utf-8");
      closeCsvExportPopup();
    }


    function resolveCriterionRefRows(c, xlsm) {
      if (xlsm) {
        return {
          isPersonalised: false,
          grades: normalizeCriterionGrades(xlsm.grades)
        };
      }
      const maxPts = (c && c.maxPoints != null && !isNaN(Number(c.maxPoints))) ? Number(c.maxPoints) : null;
      const minPts = (c && c.minPoints != null && !isNaN(Number(c.minPoints))) ? Number(c.minPoints) : 0;
      if (maxPts != null && maxPts >= minPts) {
        const step = (c && c.interval != null && Number(c.interval) > 0) ? Number(c.interval) : 1;
        const grades = [];
        for (let p = minPts; p <= maxPts + 0.0001; p += step) {
          grades.push(String(Number(p.toFixed(2))));
        }
        return {
          isPersonalised: true,
          grades: grades.length ? grades : ["0"]
        };
      }
      if (c && Array.isArray(c.grades) && c.grades.length > 0) {
        return {
          isPersonalised: true,
          grades: c.grades.map(String)
        };
      }
      return {
        isPersonalised: true,
        grades: ["0"]
      };
    }

    // ── Criteria reference & export ───────────────────────────────
    function buildCriteriaRefHtml(config, classObj, sem, testIndex) {
      // Resolve the active criteria bank for this test, then fall back to the default XLSM_CRITERIA
      const activeBank = (typeof getTestCriteriaBank === 'function') ? getTestCriteriaBank(classObj, config) : null;
      const bankCriteria = (activeBank && Array.isArray(activeBank.criteria)) ? activeBank.criteria : [];
      const fallbackCriteria = (typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : [];
      function findXlsm(name) {
        const key = String(name || '').trim().toLowerCase();
        return bankCriteria.find(x => x.name.trim().toLowerCase() === key)
          || fallbackCriteria.find(x => x.name.trim().toLowerCase() === key)
          || null;
      }
      const usedCriteria = (config.criteria || []).map(c => {
        const xlsm = findXlsm(c.name);
        const resolved = resolveCriterionRefRows(c, xlsm);
        return {
          configName: c.name,
          minPoints: c.minPoints,
          maxPoints: c.maxPoints,
          pointCoefficient: c.pointCoefficient,
          isBonus: c.isBonus,
          grades: resolved.grades,
          isPersonalised: resolved.isPersonalised,
          xlsm,
          criterion: c
        };
      });

      const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const blocks = usedCriteria.length > 0 ? usedCriteria.map(({ configName, maxPoints, pointCoefficient, isBonus, grades, xlsm, isPersonalised, minPoints, criterion }) => {
        const rows = grades.map((k, kIdx) => {
          const text = (xlsm && xlsm.comments && xlsm.comments[k])
            || (criterion && criterion.comments && criterion.comments[k])
            || "\u2014";

          let color;
          if (isPersonalised) {
            const maxPts = (maxPoints != null && !isNaN(Number(maxPoints))) ? Number(maxPoints) : null;
            const minPts = (minPoints != null && !isNaN(Number(minPoints))) ? Number(minPoints) : 0;
            if (maxPts != null && maxPts > minPts) {
              const ratio = (Number(k) - minPts) / (maxPts - minPts);
              if (ratio >= 0.85) color = "#16a34a";
              else if (ratio >= 0.65) color = "#65a30d";
              else if (ratio >= 0.5) color = "#d97706";
              else if (ratio >= 0.25) color = "#ea580c";
              else color = "#dc2626";
            } else {
              color = "#16a34a";
            }
          } else {
            color = (xlsm && xlsm.colors && xlsm.colors[k]) || getDefaultGradeColor(k, kIdx, grades.length);
          }
          const textColor = getHighContrastTextColor(color);
          return `
            <tr>
              <th class="grade-col" style="background:${color}18; color:${textColor}; border-right: 2px solid #111; font-weight:800;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;border:1.5px solid ${color};">${esc(k)}</span></th>
              <td class="desc-col">${esc(text)}</td>
            </tr>`;
        }).join("");

        const badges = [];
        if (maxPoints != null) badges.push(`<span class="crit-badge">${t('gsCritMax') || 'Max'}: ${fmtN(maxPoints)} pts</span>`);
        if (pointCoefficient && pointCoefficient !== 1) badges.push(`<span class="crit-badge">${t('gsCoeff') || 'Coeff'}: ${fmtN(pointCoefficient)}×</span>`);
        if (isBonus) badges.push(`<span class="crit-badge bonus-badge">${t('gsCritBonusBadge') || 'Bonus'}</span>`);

        return `
          <section class="crit-card">
            <div class="crit-card-header">
              <div class="crit-name">${esc(configName)}</div>
              <div class="crit-badges">${badges.join(" ")}</div>
            </div>
            <table class="crit-table">
              <tbody>${rows}</tbody>
            </table>
          </section>`;
      }).join("") : `<div class="empty-notice">${t('gsAlertNoCriteriaToExport') || 'No criteria configured for this test.'}</div>`;

      const pdfSettings = getPdfExportSettings();
      const testTitle = `${classObj ? classObj.name + " — " : ""}${sem ? sem.toUpperCase() + " — " : ""}${config.name || ("Test T" + ((testIndex || 0) + 1))}`;
      const slug = slugifyForPath(classObj ? classObj.name : "class");
      const defaultName = `${slug}-${sem}-t${testIndex + 1}-criteria-reference-${new Date().toISOString().slice(0, 10)}.pdf`;
      const baseHref = (document && document.baseURI) ? document.baseURI : (window.location && window.location.href ? window.location.href : '');

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<base href="${esc(baseHref)}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t('gsCriteriaRefTitle') || 'Criteria Reference'} — ${esc(testTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: 'Lexend', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #1e293b;
    background: #f5f5f0;
    line-height: 1.5;
  }
  .no-print {
    margin-bottom: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .btn-print, .btn-export {
    font-family: inherit;
    font-size: 13px;
    font-weight: 800;
    color: #1e293b;
    background: #ffffff;
    border: 2px solid #333333;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    box-shadow: 3px 3px 0 #555555;
    transition: transform 0.1s, box-shadow 0.1s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-print:hover, .btn-export:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 #555555;
    background: #f0f0eb;
  }
  .btn-print:active, .btn-export:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #555555;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 16px;
  }
  .modal-overlay.hidden {
    display: none !important;
  }
  .modal-card {
    background: #ffffff;
    border: 2px solid #333333;
    border-radius: 10px;
    box-shadow: 4px 4px 0 #555555;
    max-width: 420px;
    width: min(96vw, 420px);
    padding: 20px 22px;
    color: #1e293b;
    box-sizing: border-box;
  }
  .modal-title {
    font-size: 1.15rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
    color: #1e293b;
  }
  .modal-prompt {
    margin: 0 0 16px 0;
    font-size: 0.92rem;
    line-height: 1.4;
    color: #4b5563;
  }
  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .modal-btn {
    font-family: inherit;
    font-size: 13px;
    font-weight: 800;
    color: #1e293b;
    background: #ffffff;
    border: 2px solid #333333;
    border-radius: 6px;
    padding: 10px 14px;
    cursor: pointer;
    box-shadow: 3px 3px 0 #555555;
    transition: transform 0.1s, box-shadow 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
  }
  .modal-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 #555555;
    background: #fdfdfa;
  }
  .modal-btn:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #555555;
  }
  .modal-btn-primary {
    background: #e2c96e;
  }
  .modal-btn-primary:hover {
    background: #d8be5e;
  }
  .modal-footer {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
  .toast-banner {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #333333;
    color: #ffffff;
    border: 2px solid #333333;
    border-radius: 6px;
    box-shadow: 3px 3px 0 #555555;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
    z-index: 100000;
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
  }
  .toast-banner.is-error {
    background: #c96b6b;
    color: #ffffff;
  }
  .toast-banner.hidden {
    display: none !important;
  }
  .header-card {
    background: #ffffff;
    border: 2px solid #333333;
    border-radius: 10px;
    box-shadow: 4px 4px 0 #555555;
    padding: 18px 24px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .header-title-group h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1e293b;
  }
  .header-subtitle {
    margin-top: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
  }
  .header-badge {
    background: #e2c96e;
    border: 2px solid #333333;
    border-radius: 6px;
    padding: 6px 14px;
    font-weight: 800;
    font-size: 0.85rem;
    box-shadow: 2px 2px 0 #555555;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #1e293b;
  }
  .crit-card {
    background: #ffffff;
    border: 2px solid #333333;
    border-radius: 10px;
    box-shadow: 4px 4px 0 #555555;
    margin-bottom: 22px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .crit-card-header {
    background: #f0f0eb;
    border-bottom: 2px solid #333333;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .crit-name {
    font-size: 1.05rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1e293b;
  }
  .crit-badges {
    display: flex;
    gap: 8px;
  }
  .crit-badge {
    background: #ffffff;
    border: 1.5px solid #333333;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 0.78rem;
    font-weight: 800;
    box-shadow: 2px 2px 0 #555555;
    color: #1e293b;
  }
  .crit-badge.bonus-badge {
    background: #6abf8e;
  }
  .crit-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .crit-table th, .crit-table td {
    border: 1.5px solid #333333;
    padding: 10px 14px;
    vertical-align: top;
    text-align: left;
    color: #1e293b;
  }
  .crit-table th.grade-col {
    width: 110px;
    background: #f8fafc;
    font-weight: 800;
    font-size: 1rem;
    text-align: center;
    white-space: nowrap;
  }
  .crit-table td.desc-col {
    white-space: pre-wrap;
    line-height: 1.4;
    font-size: 0.82rem;
  }
  .crit-table tr:nth-child(even) td.desc-col {
    background: #fcfbf9;
  }
  .empty-notice {
    background: #ffffff;
    border: 2px solid #333333;
    border-radius: 10px;
    box-shadow: 3px 3px 0 #555555;
    padding: 24px;
    text-align: center;
    font-weight: 700;
    color: #64748b;
  }
  @page { size: ${pdfSettings.pageSize || 'A4'} ${pdfSettings.orientation || 'portrait'}; margin: ${pdfSettings.margin || '16mm 14mm'}; }
  @media print {
    body {
      background: #ffffff;
      padding: 0;
      font-size: 11pt;
    }
    .no-print {
      display: none !important;
    }
    .header-card, .crit-card {
      box-shadow: none !important;
      border-width: 1.5px !important;
    }
    .crit-badge {
      box-shadow: none !important;
    }
  }
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-export" id="btn-export-pdf" type="button" onclick="openExportModal()" title="${esc(t('deExportPdfDestinationTitle') || 'Export PDF')}">
    <img src="../assets/icons/export.svg" class="btn-icon" alt="" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;" /> ${esc(t('gsBtnExportCriteriaPdf') || 'Export')}
  </button>
</div>
<div class="header-card">
  <div class="header-title-group">
    <h1>${t('gsCriteriaRefTitle') || 'Correction Criteria Reference'}</h1>
    <div class="header-subtitle">${esc(testTitle)}</div>
  </div>
  <div class="header-badge">${t('gsCriteriaRefBadge') || 'Criteria Guide'}</div>
</div>
${blocks}

<div id="pdf-export-overlay" class="modal-overlay hidden no-print" onclick="if(event.target===this)closeExportModal()">
  <div class="modal-card" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
    <div class="modal-title">${esc(t('deExportPdfDestinationTitle') || 'Export PDF')}</div>
    <p class="modal-prompt">${esc(t('deExportPdfDestinationPrompt') || 'Where do you want to save the PDF?')}</p>
    <div class="modal-actions">
      <button class="modal-btn modal-btn-primary" id="btn-export-to-print" type="button" onclick="doExportPdf('to-print')">
        <img src="../assets/icons/printer.svg" alt="" style="width:16px;height:16px;vertical-align:middle;" /> ${esc(t('deExportPdfToPrintFolder') || 'Export to Print folder')}
      </button>
      <button class="modal-btn" id="btn-export-picker" type="button" onclick="doExportPdf('picker')">
        <img src="../assets/icons/folder.svg" alt="" style="width:16px;height:16px;vertical-align:middle;" /> ${esc(t('deExportPdfFilePicker') || 'Choose with file picker')}
      </button>
    </div>
    <div class="modal-footer">
      <button class="modal-btn" type="button" onclick="closeExportModal()">${esc(t('btnCancel') || 'Cancel')}</button>
    </div>
  </div>
</div>
<div id="toast-banner" class="toast-banner hidden no-print"></div>

<script>
  (function() {
    const defaultFilename = ${JSON.stringify(defaultName)};
    const txtToPrintSuccess = ${JSON.stringify(t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ')};
    const txtExportSuccess = ${JSON.stringify(t('deExportPdfSuccess') || 'PDF exported')};
    const txtExportFailed = ${JSON.stringify(t('deExportPdfFailed') || 'PDF export failed: ')};

    window.openExportModal = function() {
      const overlay = document.getElementById('pdf-export-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        const btn = document.getElementById('btn-export-to-print');
        if (btn) btn.focus();
      }
    };

    window.closeExportModal = function() {
      const overlay = document.getElementById('pdf-export-overlay');
      if (overlay) overlay.classList.add('hidden');
    };

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('pdf-export-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          window.closeExportModal();
        }
      }
    });

    let toastTimer = null;
    function showToast(msg, isError) {
      const el = document.getElementById('toast-banner');
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('is-error', !!isError);
      el.classList.remove('hidden');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function() {
        el.classList.add('hidden');
      }, 4000);
    }

    window.doExportPdf = async function(dest) {
      window.closeExportModal();
      const isElectron = !!(window.electronApi && window.electronApi.isElectron);
      if (!isElectron) {
        window.print();
        return;
      }

      try {
        let exportHtml = document.documentElement.outerHTML;
        if (window.ExportStylesService) {
          var sId = ExportStylesService.getSelectedStyle('gradeSheet');
          exportHtml = await ExportStylesService.injectStyleIntoHtml(exportHtml, sId);
        }
        const pdfReq = {
          html: exportHtml,
          landscape: ${JSON.stringify(pdfSettings.isLandscape)},
          pdfOptions: { pageSize: ${JSON.stringify(pdfSettings.pageSize || 'A4')}, landscape: ${JSON.stringify(pdfSettings.isLandscape)}, margins: ${JSON.stringify(parseCssMarginToInches(pdfSettings.margin))} }
        };
        if (dest === 'to-print') {
          pdfReq.target = 'toPrint';
          pdfReq.filename = defaultFilename;
        } else {
          pdfReq.defaultName = defaultFilename;
        }
        const res = await window.electronApi.printPdf(pdfReq);
        if (res && res.ok) {
          showToast(dest === 'to-print' ? (txtToPrintSuccess + (res.name || defaultFilename)) : txtExportSuccess, false);
        } else if (res && !res.ok && !res.canceled) {
          showToast(txtExportFailed + (res.failureReason || res.error || 'Unknown error'), true);
        }
      } catch (err) {
        showToast(txtExportFailed + (err && err.message ? err.message : String(err)), true);
      }
    };
  })();
<\/script>
</body>
</html>`;
    }

    async function openCriteriaRef() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      const { semester, testIndex } = appState.activeTest;
      const config = classObj.testConfigs[semester][testIndex];
      // Ensure criteria banks are loaded so getTestCriteriaBank() works for custom banks
      await loadAvailableCriteriaBanks().catch(() => {});
      const html = buildCriteriaRefHtml(config, classObj, semester, testIndex);

      if (window.Desktop && Desktop.isElectron()) {
        try {
          await Desktop.openHtml({ html, width: 1200, height: 700 });
        } catch (e) {
          console.error('Electron openHtml failed', e);
        }
      } else {
        const win = window.open("", "_blank", "width=1200,height=700");
        if (win) {
          win.document.open();
          win.document.write(html);
          win.document.close();
        }
      }
    }

    function buildCriteriaRefMarkdown(config, classObj, sem, testIndex) {
      const testTitle = `${classObj ? classObj.name + " — " : ""}${sem ? sem.toUpperCase() + " — " : ""}${config.name || ("Test T" + ((testIndex || 0) + 1))}`;
      const lines = [];
      lines.push(`# ${t('gsCriteriaRefTitle') || 'Correction Criteria Reference'} — ${testTitle}`);
      lines.push("");
      lines.push(`_${t('gsExportedOn') || 'Exported on'} ${new Date().toLocaleDateString()}_`);
      lines.push("");
      lines.push("---");
      lines.push("");

      // Resolve the active criteria bank for this test, then fall back to the default XLSM_CRITERIA
      const activeBank = (typeof getTestCriteriaBank === 'function') ? getTestCriteriaBank(classObj, config) : null;
      const bankCriteria = (activeBank && Array.isArray(activeBank.criteria)) ? activeBank.criteria : [];
      const fallbackCriteria = (typeof XLSM_CRITERIA !== 'undefined' && Array.isArray(XLSM_CRITERIA)) ? XLSM_CRITERIA : [];
      function findXlsm(name) {
        const key = String(name || '').trim().toLowerCase();
        return bankCriteria.find(x => x.name.trim().toLowerCase() === key)
          || fallbackCriteria.find(x => x.name.trim().toLowerCase() === key)
          || null;
      }
      const usedCriteria = (config.criteria || []).map(c => {
        const xlsm = findXlsm(c.name);
        const resolved = resolveCriterionRefRows(c, xlsm);
        return {
          configName: c.name,
          minPoints: c.minPoints,
          maxPoints: c.maxPoints,
          pointCoefficient: c.pointCoefficient,
          isBonus: c.isBonus,
          grades: resolved.grades,
          isPersonalised: resolved.isPersonalised,
          xlsm,
          criterion: c
        };
      });

      if (usedCriteria.length === 0) {
        lines.push(`_${t('gsAlertNoCriteriaToExport') || 'No criteria configured for this test.'}_`);
        return lines.join("\n");
      }

      usedCriteria.forEach((crit, idx) => {
        lines.push(`## ${idx + 1}. ${crit.configName}`);
        const meta = [];
        if (crit.maxPoints != null) meta.push(`**${t('gsCritMax') || 'Max'}:** ${fmtN(crit.maxPoints)} pts`);
        if (crit.pointCoefficient && crit.pointCoefficient !== 1) meta.push(`**${t('gsCoeff') || 'Coeff'}:** ${fmtN(crit.pointCoefficient)}×`);
        if (crit.isBonus) meta.push(`**${t('gsCritBonusBadge') || 'Bonus'}:** ${t('btnYes') || 'Yes'}`);
        if (meta.length) {
          lines.push(meta.join(" · "));
          lines.push("");
        }

        lines.push(`| ${t('gsCritTableGradeLevel') || 'Grade / Level'} | ${t('gsCritTableDescriptor') || 'Descriptor'} |`);
        lines.push("| :--- | :--- |");
        crit.grades.forEach(k => {
          const text = (crit.xlsm && crit.xlsm.comments && crit.xlsm.comments[k])
            || (crit.criterion && crit.criterion.comments && crit.criterion.comments[k])
            || "—";
          const cleanText = text.replace(/\|/g, "\\|").replace(/\n/g, " ");
          lines.push(`| **${k}** | ${cleanText} |`);
        });
        lines.push("");
        lines.push("---");
        lines.push("");
      });

      return lines.join("\n");
    }

    async function exportCriteriaRefPdf() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      const { semester, testIndex } = appState.activeTest;
      const config = classObj.testConfigs[semester][testIndex];
      if (!config || !Array.isArray(config.criteria) || config.criteria.length === 0) {
        await showAlert(t('gsAlertNoCriteriaToExport') || 'No criteria configured for this test.');
        return;
      }
      // Ensure criteria banks are loaded so getTestCriteriaBank() works for custom banks
      await loadAvailableCriteriaBanks().catch(() => {});
      let html = buildCriteriaRefHtml(config, classObj, semester, testIndex);
      if (window.ExportStylesService) {
        const sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
      }
      const slug = slugifyForPath(classObj.name || "class");
      let defaultName = `${slug}-${semester}-t${testIndex + 1}-criteria-reference-${new Date().toISOString().slice(0, 10)}.pdf`;

      if (window.Desktop && Desktop.isElectron()) {
        try {
          const destination = await openGsPdfExportModal();
          if (!destination) return;
          const gsTarget = window.cmtResolveExportTarget ? window.cmtResolveExportTarget(destination) : (destination === 'to-print' ? 'toPrint' : null);
          if (gsTarget && window.resolveExportFilenameConflict) {
            const conflictRes = await window.resolveExportFilenameConflict({ filename: defaultName, target: gsTarget });
            if (!conflictRes || conflictRes.canceled) return;
            defaultName = conflictRes.filename || defaultName;
          }

          const pdfSettings = getPdfExportSettings();
          const pdfReq = {
            html,
            landscape: pdfSettings.isLandscape,
            pdfOptions: { pageSize: pdfSettings.pageSize || 'A4', landscape: pdfSettings.isLandscape, margins: parseCssMarginToInches(pdfSettings.margin) }
          };
          if (gsTarget) {
            pdfReq.target = gsTarget;
            pdfReq.filename = defaultName;
          } else {
            pdfReq.defaultName = defaultName;
          }
          const res = await Desktop.printPdf(pdfReq);
          if (res && res.ok) {
            showToast(
              destination === 'to-print'
                ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (res.name || defaultName))
                : (t('deExportPdfSuccess') || 'PDF exported')
            );
            if (window.showExportSuccessPopup && res.path) {
              showExportSuccessPopup(res.path, res.name || defaultName);
            }
            return;
          } else if (res && !res.ok && !res.canceled) {
            await showAlert(t('gsAlertPrintFailed') + (res && (res.failureReason || res.error) ? (res.failureReason || res.error) : 'unknown'));
          }
          return;
        } catch (e) {
          await showAlert(t('gsAlertPrintFailed') + (e && e.message ? e.message : String(e)));
          return;
        }
      }

      const printScript = `<script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        });
      <\/script>`;
      html = html.replace('</body>', `${printScript}</body>`);

      const win = window.open("", "_blank", "width=1200,height=800");
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      } else {
        await showAlert(t('gsAlertPopupBlocked') || 'Pop-up blocked. Please allow pop-ups for this page.');
      }
    }

    async function exportCriteriaRefMd() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      const { semester, testIndex } = appState.activeTest;
      const config = classObj.testConfigs[semester][testIndex];
      if (!config || !Array.isArray(config.criteria) || config.criteria.length === 0) {
        await showAlert(t('gsAlertNoCriteriaToExport') || 'No criteria configured for this test.');
        return;
      }
      // Ensure criteria banks are loaded so getTestCriteriaBank() works for custom banks
      await loadAvailableCriteriaBanks().catch(() => {});
      const md = buildCriteriaRefMarkdown(config, classObj, semester, testIndex);
      const slug = slugifyForPath(classObj.name || "class");
      const filename = `${slug}-${semester}-t${testIndex + 1}-criteria-reference-${new Date().toISOString().slice(0, 10)}.md`;
      downloadTextFile(md, filename, "text/markdown;charset=utf-8");
    }

    async function exportCriteriaRefHtml() {
      const classObj = getActiveClass();
      if (!classObj || !appState.activeTest) return;
      const { semester, testIndex } = appState.activeTest;
      const config = classObj.testConfigs[semester][testIndex];
      if (!config || !Array.isArray(config.criteria) || config.criteria.length === 0) {
        await showAlert(t('gsAlertNoCriteriaToExport') || 'No criteria configured for this test.');
        return;
      }
      // Ensure criteria banks are loaded so getTestCriteriaBank() works for custom banks
      await loadAvailableCriteriaBanks().catch(() => {});
      let html = buildCriteriaRefHtml(config, classObj, semester, testIndex);
      if (window.ExportStylesService) {
        const sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
      }
      const slug = slugifyForPath(classObj.name || "class");
      const filename = `${slug}-${semester}-t${testIndex + 1}-criteria-reference-${new Date().toISOString().slice(0, 10)}.html`;
      downloadTextFile(html, filename, "text/html;charset=utf-8");
    }


    // ── Print semester grades ─────────────────────────────────────
    async function printSemesterGrades(classObj, sem) {
      ensureClassStructures(classObj);
      const report = buildSemesterReportData(classObj, sem);
      let html = buildSemesterReportHtml(report);
      if (window.ExportStylesService) {
        const sId = ExportStylesService.getSelectedStyle('gradeSheet');
        html = await ExportStylesService.injectStyleIntoHtml(html, sId, 'gradeSheet');
      }

      if (window.Desktop && Desktop.isElectron()) {
        try {
          const destination = await openGsPdfExportModal();
          if (!destination) return;

          const pdfSettings = getPdfExportSettings();
          const slug = slugifyForPath(classObj.name || "class");
          let defaultName = `${slug}-${sem}-grades-${new Date().toISOString().slice(0, 10)}.pdf`;
          const gsTarget = window.cmtResolveExportTarget ? window.cmtResolveExportTarget(destination) : (destination === 'to-print' ? 'toPrint' : null);
          if (gsTarget && window.resolveExportFilenameConflict) {
            const conflictRes = await window.resolveExportFilenameConflict({ filename: defaultName, target: gsTarget });
            if (!conflictRes || conflictRes.canceled) return;
            defaultName = conflictRes.filename || defaultName;
          }
          const pdfReq = {
            html,
            landscape: pdfSettings.isLandscape,
            pdfOptions: { pageSize: pdfSettings.pageSize, landscape: pdfSettings.isLandscape, margins: parseCssMarginToInches(pdfSettings.margin) }
          };
          if (gsTarget) {
            pdfReq.target = gsTarget;
            pdfReq.filename = defaultName;
          } else {
            pdfReq.defaultName = defaultName;
          }
          const res = await Desktop.printPdf(pdfReq);
          if (res && res.ok) {
            showToast(
              destination === 'to-print'
                ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (res.name || defaultName))
                : (t('deExportPdfSuccess') || 'PDF exported')
            );
            if (window.showExportSuccessPopup && res.path) {
              showExportSuccessPopup(res.path, res.name || defaultName);
            }
            return;
          } else if (res && !res.ok && !res.canceled) {
            await showAlert(t('gsAlertPrintFailed') + (res && (res.failureReason || res.error) ? (res.failureReason || res.error) : 'unknown'));
          }
          return;
        } catch (e) {
          await showAlert(t('gsAlertPrintFailed') + (e && e.message ? e.message : String(e)));
          return;
        }
      }

      const win = window.open("", "_blank");
      if (!win) { await showAlert(t('gsAlertPopupBlocked')); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }

