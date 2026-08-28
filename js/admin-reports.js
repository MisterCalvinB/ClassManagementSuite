/**
 * js/admin-reports.js
 * Comprehensive Report Exporter, Statistical Analytics & SVG Chart Engine
 * for Administrative Group Management.
 * 
 * Features:
 * - Statistical computations (Mean, Median, Mode, Std Dev, Min/Max, IQR, Quartiles, Deltas).
 * - Standalone Vanilla SVG Charts (Bar, Trend Line, Stacked Bar, Donut, Benchmark Comparison).
 * - Multi-Scope Reports (Whole Class Cohort, Individual Student Dossier, Multi-Student Matrix, Category Roster).
 * - Period & Cross-Period Comparisons (Single, Multiple Periods with Deltas, All-Year Cumulative).
 * - CSS Neobrutalist styling & print-optimized layouts.
 * - Multi-format exports: HTML, PDF, XLSX (Multi-Sheet), CSV, DOCX.
 */

(function () {
  'use strict';

  var AdminReports = {};

  // ── Helper: Internationalization & Localization ──
  function tr(key, fallback) {
    if (typeof t === 'function') {
      var res = t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

  function isFrench() {
    try {
      return typeof getLang === 'function' && getLang() === 'fr';
    } catch (e) {
      return false;
    }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function roundNum(num, decimals) {
    if (num == null || isNaN(num)) return 0;
    var factor = Math.pow(10, decimals != null ? decimals : 1);
    return Math.round(num * factor) / factor;
  }

  // ── 1. Statistical Calculations Engine ──
  AdminReports.calculateStats = function (arr) {
    var valid = (arr || []).map(function (v) { return parseFloat(v); }).filter(function (v) { return !isNaN(v); });
    if (!valid.length) {
      return {
        count: 0, sum: 0, mean: 0, median: 0, mode: 0,
        min: 0, max: 0, variance: 0, stdDev: 0,
        q1: 0, q3: 0, iqr: 0
      };
    }

    valid.sort(function (a, b) { return a - b; });
    var count = valid.length;
    var sum = valid.reduce(function (acc, val) { return acc + val; }, 0);
    var mean = sum / count;

    // Median
    var median = 0;
    var mid = Math.floor(count / 2);
    if (count % 2 === 0) {
      median = (valid[mid - 1] + valid[mid]) / 2;
    } else {
      median = valid[mid];
    }

    // Quartiles
    var getQuartile = function (qList) {
      var l = qList.length;
      if (!l) return 0;
      var m = Math.floor(l / 2);
      return l % 2 === 0 ? (qList[m - 1] + qList[m]) / 2 : qList[m];
    };
    var lowerHalf = valid.slice(0, Math.floor(count / 2));
    var upperHalf = count % 2 === 0 ? valid.slice(mid) : valid.slice(mid + 1);
    var q1 = getQuartile(lowerHalf);
    var q3 = getQuartile(upperHalf);
    var iqr = q3 - q1;

    // Standard Deviation
    var variance = valid.reduce(function (acc, val) {
      return acc + Math.pow(val - mean, 2);
    }, 0) / count;
    var stdDev = Math.sqrt(variance);

    // Mode
    var freqMap = {};
    var maxFreq = 0;
    var mode = valid[0];
    valid.forEach(function (v) {
      freqMap[v] = (freqMap[v] || 0) + 1;
      if (freqMap[v] > maxFreq) {
        maxFreq = freqMap[v];
        mode = v;
      }
    });

    return {
      count: count,
      sum: roundNum(sum, 1),
      mean: roundNum(mean, 2),
      median: roundNum(median, 2),
      mode: roundNum(mode, 1),
      min: valid[0],
      max: valid[count - 1],
      variance: roundNum(variance, 2),
      stdDev: roundNum(stdDev, 2),
      q1: roundNum(q1, 2),
      q3: roundNum(q3, 2),
      iqr: roundNum(iqr, 2)
    };
  };

  // ── 2. Cohort Analytics & Period Comparisons ──
  AdminReports.computeCohortAnalytics = function (students, periods, config) {
    students = students || [];
    periods = periods || [];
    config = config || {};
    var infractionsList = config.infractions || [];
    var sanctionTiers = config.sanctionTiers || [];

    var totalStudents = students.length;
    var senCount = students.filter(function (s) { return s.sen; }).length;
    var maleCount = students.filter(function (s) { return s.gender === 'M'; }).length;
    var femaleCount = students.filter(function (s) { return s.gender === 'F'; }).length;

    var regimeCounts = { DP: 0, EXT: 0, INT: 0, Other: 0 };
    students.forEach(function (s) {
      var r = (s.regime || 'DP').toUpperCase();
      if (regimeCounts[r] != null) regimeCounts[r]++;
      else regimeCounts.Other++;
    });

    // Infraction category statistics
    var categoryStats = {};
    infractionsList.forEach(function (inf) {
      var values = students.map(function (s) {
        return (s.infractions && s.infractions[inf.key]) || 0;
      });
      categoryStats[inf.key] = {
        meta: inf,
        stats: AdminReports.calculateStats(values)
      };
    });

    // Total points statistics
    var pointValues = students.map(function (s) { return s.points || 0; });
    var pointStats = AdminReports.calculateStats(pointValues);

    // Sanction tier distribution
    var tierCounts = {};
    sanctionTiers.forEach(function (t) { tierCounts[t.id] = { meta: t, count: 0, students: [] }; });
    tierCounts['none'] = {
      meta: { id: 'none', name: 'Good Standing (0 pts)', nameFr: 'Situation normale (0 pt)', badgeClass: 'badge-success' },
      count: 0,
      students: []
    };

    students.forEach(function (s) {
      if (!s.points || s.points <= 0) {
        tierCounts['none'].count++;
        tierCounts['none'].students.push(s);
      } else if (s.sanction && tierCounts[s.sanction.id]) {
        tierCounts[s.sanction.id].count++;
        tierCounts[s.sanction.id].students.push(s);
      } else {
        tierCounts['none'].count++;
        tierCounts['none'].students.push(s);
      }
    });

    // Period-specific cohort stats
    var periodStats = {};
    periods.forEach(function (p) {
      var pPoints = students.map(function (s) {
        var pInf = (s.periods && s.periods[p.id] && s.periods[p.id].infractions) || {};
        var sum = 0;
        infractionsList.forEach(function (inf) {
          sum += (parseInt(pInf[inf.key], 10) || 0) * (inf.weight != null ? inf.weight : 1);
        });
        return sum;
      });
      periodStats[p.id] = {
        period: p,
        stats: AdminReports.calculateStats(pPoints)
      };
    });

    return {
      totalStudents: totalStudents,
      senCount: senCount,
      senPercent: totalStudents ? roundNum((senCount / totalStudents) * 100, 1) : 0,
      maleCount: maleCount,
      femaleCount: femaleCount,
      regimeCounts: regimeCounts,
      pointStats: pointStats,
      categoryStats: categoryStats,
      tierCounts: tierCounts,
      periodStats: periodStats
    };
  };

  // ── 3. Student Individual Analytics & Trajectory ──
  AdminReports.computeStudentAnalytics = function (student, cohortStats, periods, config, allActions) {
    if (!student) return null;
    periods = periods || [];
    config = config || {};
    var infractionsList = config.infractions || [];

    var sPoints = student.points || 0;
    var classMean = cohortStats.pointStats.mean;
    var classMedian = cohortStats.pointStats.median;
    var pointDeviationMean = roundNum(sPoints - classMean, 2);
    var pointDeviationMedian = roundNum(sPoints - classMedian, 2);

    // Period-by-period progression
    var periodHistory = periods.map(function (p) {
      var pInf = (student.periods && student.periods[p.id] && student.periods[p.id].infractions) || {};
      var pTotalPoints = 0;
      var catBreakdown = {};
      infractionsList.forEach(function (inf) {
        var count = parseInt(pInf[inf.key], 10) || 0;
        var weight = inf.weight != null ? inf.weight : 1;
        catBreakdown[inf.key] = count;
        pTotalPoints += count * weight;
      });
      var pClassMean = (cohortStats.periodStats[p.id] && cohortStats.periodStats[p.id].stats.mean) || 0;
      var pClassMedian = (cohortStats.periodStats[p.id] && cohortStats.periodStats[p.id].stats.median) || 0;

      return {
        periodId: p.id,
        periodName: isFrench() ? (p.nameFr || p.name) : p.name,
        points: pTotalPoints,
        classMean: pClassMean,
        classMedian: pClassMedian,
        infractions: catBreakdown
      };
    });

    // Trajectory calculation (Improvement vs Escalation)
    var trajectory = 'stable';
    var trajectoryDelta = 0;
    if (periodHistory.length >= 2) {
      var last = periodHistory[periodHistory.length - 1].points;
      var prev = periodHistory[periodHistory.length - 2].points;
      trajectoryDelta = last - prev;
      if (trajectoryDelta > 0) trajectory = 'worsening';
      else if (trajectoryDelta < 0) trajectory = 'improving';
      else trajectory = 'stable';
    }

    // Student follow-up actions
    var studentActions = (allActions || []).filter(function (a) { return a.studentId === student.uuid; });
    studentActions.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

    return {
      student: student,
      points: sPoints,
      pointDeviationMean: pointDeviationMean,
      pointDeviationMedian: pointDeviationMedian,
      periodHistory: periodHistory,
      trajectory: trajectory,
      trajectoryDelta: trajectoryDelta,
      actions: studentActions
    };
  };

  // ── 4. Pure Vanilla SVG Charts Generator ──
  AdminReports.svg = {
    // 4.1 Horizontal / Vertical Bar Chart
    barChart: function (items, options) {
      options = options || {};
      var width = options.width || 560;
      var barHeight = options.barHeight || 28;
      var paddingLeft = options.paddingLeft || 170;
      var paddingRight = options.paddingRight || 60;
      var paddingTop = options.paddingTop || 25;
      var paddingBottom = options.paddingBottom || 20;
      var gap = options.gap || 12;

      var n = items.length;
      var height = paddingTop + paddingBottom + n * (barHeight + gap);
      var maxVal = Math.max.apply(null, items.map(function (it) { return it.value || 0; }).concat([1]));
      var chartAreaWidth = width - paddingLeft - paddingRight;

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" class="ag-svg-chart" style="width:100%; height:auto; display:block; font-family:inherit;">';

      // Background grid / axis
      svg += '<line x1="' + paddingLeft + '" y1="' + paddingTop + '" x2="' + paddingLeft + '" y2="' + (height - paddingBottom) + '" stroke="#000000" stroke-width="2" />';

      items.forEach(function (it, idx) {
        var y = paddingTop + idx * (barHeight + gap);
        var barW = Math.max(2, (it.value / maxVal) * chartAreaWidth);
        var color = it.color || '#e0f2fe';
        var label = escapeHtml(it.label || '');
        var valLabel = it.valueFormatted != null ? it.valueFormatted : String(it.value);

        // Label
        svg += '<text x="' + (paddingLeft - 10) + '" y="' + (y + barHeight / 2 + 5) + '" text-anchor="end" font-size="12" font-weight="800" fill="#000000">' + label + '</text>';

        // Bar (Neobrutalist solid border + hard shadow)
        svg += '<rect x="' + (paddingLeft + 2) + '" y="' + (y + 2) + '" width="' + barW + '" height="' + barHeight + '" fill="#000000" rx="3" />';
        svg += '<rect x="' + paddingLeft + '" y="' + y + '" width="' + barW + '" height="' + barHeight + '" fill="' + color + '" stroke="#000000" stroke-width="2" rx="3" />';

        // Value text
        svg += '<text x="' + (paddingLeft + barW + 8) + '" y="' + (y + barHeight / 2 + 5) + '" font-size="12" font-weight="900" fill="#000000">' + escapeHtml(valLabel) + '</text>';
      });

      svg += '</svg>';
      return svg;
    },

    // 4.2 Multi-Series Period Trend Chart (Lines + Points + Areas)
    trendChart: function (seriesList, labels, options) {
      options = options || {};
      var width = options.width || 600;
      var padB = options.paddingBottom || 100;
      var height = options.height || (220 + padB);
      var padL = 50;
      var padR = 40;
      var padT = 30;

      var chartW = width - padL - padR;
      var chartH = height - padT - padB;

      var allVals = [];
      seriesList.forEach(function (s) {
        (s.values || []).forEach(function (v) { if (v != null) allVals.push(v); });
      });
      var maxVal = Math.max.apply(null, allVals.concat([5]));
      var minVal = 0;
      var valRange = maxVal - minVal || 1;

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" class="ag-svg-chart" style="width:100%; height:auto; display:block; font-family:inherit;">';

      // Grid Lines
      var gridSteps = 4;
      for (var i = 0; i <= gridSteps; i++) {
        var yVal = minVal + (valRange / gridSteps) * (gridSteps - i);
        var yPos = padT + (i / gridSteps) * chartH;
        svg += '<line x1="' + padL + '" y1="' + yPos + '" x2="' + (width - padR) + '" y2="' + yPos + '" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,3" />';
        svg += '<text x="' + (padL - 8) + '" y="' + (yPos + 4) + '" text-anchor="end" font-size="11" font-weight="700" fill="#64748b">' + roundNum(yVal, 1) + '</text>';
      }

      // X-Axis
      svg += '<line x1="' + padL + '" y1="' + (height - padB) + '" x2="' + (width - padR) + '" y2="' + (height - padB) + '" stroke="#000000" stroke-width="2" />';

      var xStep = labels.length > 1 ? chartW / (labels.length - 1) : chartW / 2;

      // X-Labels (Vertical / Angled downwards to prevent overlapping)
      labels.forEach(function (lbl, idx) {
        var xPos = labels.length > 1 ? (padL + idx * xStep) : (padL + chartW / 2);
        svg += '<line x1="' + xPos + '" y1="' + (height - padB) + '" x2="' + xPos + '" y2="' + (height - padB + 6) + '" stroke="#000000" stroke-width="2" />';
        svg += '<g transform="translate(' + xPos + ', ' + (height - padB + 14) + ') rotate(-60)">' +
          '<text x="0" y="0" text-anchor="end" font-size="11" font-weight="900" fill="#000000">' + escapeHtml(lbl) + '</text>' +
          '</g>';
      });

      // Series rendering
      seriesList.forEach(function (s) {
        var strokeColor = s.color || '#000000';
        var isDashed = s.dashed === true;
        var points = [];

        s.values.forEach(function (val, idx) {
          if (val == null) return;
          var x = labels.length > 1 ? (padL + idx * xStep) : (padL + chartW / 2);
          var y = padT + chartH - ((val - minVal) / valRange) * chartH;
          points.push({ x: x, y: y, val: val });
        });

        if (points.length > 1) {
          var pathD = 'M ' + points.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
          svg += '<path d="' + pathD + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + (s.width || 3) + '" ' + (isDashed ? 'stroke-dasharray="6,4"' : '') + ' />';
        }

        // Draw points with neobrutalist dots
        points.forEach(function (p) {
          svg += '<circle cx="' + (p.x + 1.5) + '" cy="' + (p.y + 1.5) + '" r="5.5" fill="#000000" />';
          svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="' + (s.pointColor || strokeColor) + '" stroke="#000000" stroke-width="2" />';
          svg += '<text x="' + p.x + '" y="' + (p.y - 10) + '" text-anchor="middle" font-size="11" font-weight="900" fill="#000000">' + roundNum(p.val, 1) + '</text>';
        });
      });

      svg += '</svg>';
      return svg;
    },

    // 4.3 Donut Chart
    donutChart: function (slices, options) {
      options = options || {};
      var size = options.size || 220;
      var cx = size / 2;
      var cy = size / 2;
      var r = options.radius || (size / 2 - 20);
      var innerR = options.innerRadius || (r * 0.55);

      var total = slices.reduce(function (sum, s) { return sum + (s.value || 0); }, 0);
      if (total <= 0) {
        return '<div style="text-align:center; padding:20px; font-weight:700; color:#94a3b8;">No data</div>';
      }

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" class="ag-svg-chart" style="width:' + size + 'px; height:' + size + 'px; display:block; margin:0 auto;">';

      var curAngle = -Math.PI / 2;
      slices.forEach(function (s) {
        if (!s.value) return;
        var sliceAngle = (s.value / total) * (Math.PI * 2);
        var endAngle = curAngle + sliceAngle;

        var x1 = cx + r * Math.cos(curAngle);
        var y1 = cy + r * Math.sin(curAngle);
        var x2 = cx + r * Math.cos(endAngle);
        var y2 = cy + r * Math.sin(endAngle);

        var ix1 = cx + innerR * Math.cos(curAngle);
        var iy1 = cy + innerR * Math.sin(curAngle);
        var ix2 = cx + innerR * Math.cos(endAngle);
        var iy2 = cy + innerR * Math.sin(endAngle);

        var largeArc = sliceAngle > Math.PI ? 1 : 0;

        var pathD = [
          'M', ix1, iy1,
          'L', x1, y1,
          'A', r, r, 0, largeArc, 1, x2, y2,
          'L', ix2, iy2,
          'A', innerR, innerR, 0, largeArc, 0, ix1, iy1,
          'Z'
        ].join(' ');

        svg += '<path d="' + pathD + '" fill="' + (s.color || '#e0f2fe') + '" stroke="#000000" stroke-width="2" />';

        curAngle = endAngle;
      });

      // Center summary badge
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (innerR - 4) + '" fill="#ffffff" stroke="#000000" stroke-width="2" />';
      svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="14" font-weight="900" fill="#000000">' + total + '</text>';
      svg += '<text x="' + cx + '" y="' + (cy + 13) + '" text-anchor="middle" font-size="9" font-weight="800" text-transform="uppercase" fill="#64748b">' + escapeHtml(options.centerLabel || 'Total') + '</text>';

      svg += '</svg>';
      return svg;
    },

    // 4.4 Stacked Category Breakdown Chart
    stackedBarChart: function (categories, items, options) {
      options = options || {};
      var width = options.width || 600;
      var barHeight = options.barHeight || 32;
      var padL = options.paddingLeft || 140;
      var padR = options.paddingRight || 40;
      var padT = 25;
      var padB = 20;
      var gap = 16;

      var height = padT + padB + items.length * (barHeight + gap);
      var chartAreaW = width - padL - padR;

      var maxRowTotal = Math.max.apply(null, items.map(function (it) {
        return categories.reduce(function (sum, c) { return sum + (it.values[c.key] || 0); }, 0);
      }).concat([1]));

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" class="ag-svg-chart" style="width:100%; height:auto; display:block; font-family:inherit;">';

      svg += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (height - padB) + '" stroke="#000000" stroke-width="2" />';

      items.forEach(function (it, rIdx) {
        var y = padT + rIdx * (barHeight + gap);
        var label = escapeHtml(it.label || '');
        var curX = padL;
        var rowSum = categories.reduce(function (sum, c) { return sum + (it.values[c.key] || 0); }, 0);

        svg += '<text x="' + (padL - 10) + '" y="' + (y + barHeight / 2 + 5) + '" text-anchor="end" font-size="12" font-weight="800" fill="#000000">' + label + '</text>';

        categories.forEach(function (cat) {
          var val = it.values[cat.key] || 0;
          if (val <= 0) return;
          var segW = (val / maxRowTotal) * chartAreaW;

          svg += '<rect x="' + curX + '" y="' + y + '" width="' + segW + '" height="' + barHeight + '" fill="' + (cat.color || '#fed7aa') + '" stroke="#000000" stroke-width="2" />';
          if (segW > 24) {
            svg += '<text x="' + (curX + segW / 2) + '" y="' + (y + barHeight / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="900" fill="#000000">' + val + '</text>';
          }
          curX += segW;
        });

        svg += '<text x="' + (curX + 8) + '" y="' + (y + barHeight / 2 + 5) + '" font-size="12" font-weight="900" fill="#000000">' + rowSum + '</text>';
      });

      svg += '</svg>';
      return svg;
    }
  };

  // ── 5. HTML Document & Report Builders (Neobrutalist Style) ──

  // Palette generator for categories & charts
  var NE表现_PALETTE = ['#fef08a', '#fed7aa', '#fca5a5', '#f87171', '#dcfce7', '#e0f2fe', '#e9d5ff', '#cbd5e1', '#fbcfe8'];

  AdminReports.buildWholeClassReport = function (students, cohortStats, selectedPeriods, options) {
    options = options || {};
    var isFr = isFrench();
    var groupTitle = options.groupName || 'All Students';
    var periodLabel = options.periodLabel || (isFr ? 'Toute l\'année (Cumulatif)' : 'All Year (Cumulative)');
    var timestamp = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var html = '';

    // 5.1 Hero Header Card
    html += '<div class="ag-report-header">';
    html += '  <div class="ag-report-brand-wrap">';
    html += '    <div class="ag-report-badge">ADMINISTRATIVE REPORT</div>';
    html += '    <h1 class="ag-report-title">' + escapeHtml(groupTitle) + '</h1>';
    html += '    <div class="ag-report-subtitle">' + escapeHtml(periodLabel) + ' &bull; ' + escapeHtml(timestamp) + '</div>';
    html += '  </div>';
    html += '  <div class="ag-report-header-meta">';
    html += '    <div class="ag-kpi-pill"><span class="ag-kpi-num">' + cohortStats.totalStudents + '</span> <span class="ag-kpi-lbl">' + tr('agRptTotalStudents', 'Students') + '</span></div>';
    html += '    <div class="ag-kpi-pill"><span class="ag-kpi-num">' + cohortStats.pointStats.mean + '</span> <span class="ag-kpi-lbl">' + tr('agRptMeanPoints', 'Mean Pts') + '</span></div>';
    html += '    <div class="ag-kpi-pill"><span class="ag-kpi-num">' + cohortStats.pointStats.median + '</span> <span class="ag-kpi-lbl">' + tr('agRptMedianPoints', 'Median Pts') + '</span></div>';
    html += '  </div>';
    html += '</div>';

    // 5.2 KPI Overview Grid
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptKpiOverview', '1. Cohort Performance & Statistical Summary') + '</h2>';
    html += '  <div class="ag-kpi-grid">';
    
    html += '    <div class="ag-kpi-card">';
    html += '      <div class="ag-kpi-top">' + tr('agRptMeanPoints', 'Class Mean Points') + '</div>';
    html += '      <div class="ag-kpi-val">' + cohortStats.pointStats.mean + '</div>';
    html += '      <div class="ag-kpi-sub">' + tr('agRptStdDev', 'Std Dev') + ': &plusmn;' + cohortStats.pointStats.stdDev + '</div>';
    html += '    </div>';

    html += '    <div class="ag-kpi-card">';
    html += '      <div class="ag-kpi-top">' + tr('agRptMedianPoints', 'Class Median Points') + '</div>';
    html += '      <div class="ag-kpi-val">' + cohortStats.pointStats.median + '</div>';
    html += '      <div class="ag-kpi-sub">' + tr('agRptIqr', 'IQR (Q1-Q3)') + ': ' + cohortStats.pointStats.q1 + ' &rarr; ' + cohortStats.pointStats.q3 + '</div>';
    html += '    </div>';

    html += '    <div class="ag-kpi-card">';
    html += '      <div class="ag-kpi-top">' + tr('agRptRangeMinMax', 'Points Range (Min/Max)') + '</div>';
    html += '      <div class="ag-kpi-val">' + cohortStats.pointStats.min + ' &ndash; ' + cohortStats.pointStats.max + '</div>';
    html += '      <div class="ag-kpi-sub">' + tr('agRptTotalCohortPoints', 'Total cohort points') + ': ' + cohortStats.pointStats.sum + '</div>';
    html += '    </div>';

    html += '    <div class="ag-kpi-card">';
    html += '      <div class="ag-kpi-top">' + tr('agRptSenRate', 'SEN / PAP Accommodations') + '</div>';
    html += '      <div class="ag-kpi-val">' + cohortStats.senCount + ' <span style="font-size:1.1rem; color:#64748b;">(' + cohortStats.senPercent + '%)</span></div>';
    html += '      <div class="ag-kpi-sub">' + tr('agRptDemographicsRegimen', 'Regimen') + ': DP ' + cohortStats.regimeCounts.DP + ', EXT ' + cohortStats.regimeCounts.EXT + ', INT ' + cohortStats.regimeCounts.INT + '</div>';
    html += '    </div>';

    html += '  </div>';
    html += '</div>';

    // 5.3 Infraction Category Breakdown & Charts
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptCategoryBreakdown', '2. Infraction Categories & Sanction Distribution') + '</h2>';
    html += '  <div class="ag-report-two-col">';

    // Left: Infraction Bar Chart
    var categoryChartItems = Object.keys(cohortStats.categoryStats).map(function (k, idx) {
      var cs = cohortStats.categoryStats[k];
      var name = isFr ? (cs.meta.nameFr || cs.meta.name) : cs.meta.name;
      return {
        label: name,
        value: cs.stats.sum,
        valueFormatted: cs.stats.sum + ' (Avg: ' + cs.stats.mean + ')',
        color: NE表现_PALETTE[idx % NE表现_PALETTE.length]
      };
    });

    html += '    <div class="ag-chart-box">';
    html += '      <div class="ag-chart-title">' + tr('agRptTotalInfractionsByCategory', 'Total Infractions by Category') + '</div>';
    html += AdminReports.svg.barChart(categoryChartItems, { width: 520 });
    html += '    </div>';

    // Right: Sanction Tier Donut Chart
    var tierSlices = Object.keys(cohortStats.tierCounts).map(function (tId, idx) {
      var tc = cohortStats.tierCounts[tId];
      var name = isFr ? (tc.meta.nameFr || tc.meta.name) : tc.meta.name;
      var color = tId === 'none' ? '#dcfce7' : (idx === 1 ? '#fef08a' : idx === 2 ? '#fed7aa' : idx === 3 ? '#fca5a5' : '#f87171');
      return {
        label: name,
        value: tc.count,
        color: color
      };
    });

    html += '    <div class="ag-chart-box" style="display:flex; flex-direction:column; align-items:center;">';
    html += '      <div class="ag-chart-title" style="align-self:flex-start;">' + tr('agRptSanctionTierDistribution', 'Sanction Tier & Risk Distribution') + '</div>';
    html += AdminReports.svg.donutChart(tierSlices, { size: 210, centerLabel: tr('agRptStudentsShort', 'Students') });
    
    // Tier Legend
    html += '      <div class="ag-chart-legend" style="margin-top:14px; width:100%;">';
    tierSlices.forEach(function (s) {
      html += '<div class="ag-legend-row"><span class="ag-legend-dot" style="background:' + s.color + ';"></span> <span class="ag-legend-text">' + escapeHtml(s.label) + ': <strong>' + s.value + '</strong></span></div>';
    });
    html += '      </div>';
    html += '    </div>';

    html += '  </div>';
    html += '</div>';

    // 5.4 Period Comparisons (if multiple periods present)
    var periodKeys = Object.keys(cohortStats.periodStats);
    if (periodKeys.length > 1) {
      html += '<div class="ag-report-section">';
      html += '  <h2 class="ag-section-title">' + tr('agRptPeriodProgression', '3. Period-by-Period Cohort Evolution') + '</h2>';
      
      var periodLabels = periodKeys.map(function (pid) {
        var p = cohortStats.periodStats[pid].period;
        return isFr ? (p.nameFr || p.name) : p.name;
      });
      var meanSeries = {
        name: tr('agRptClassMean', 'Class Mean Points'),
        color: '#000000',
        values: periodKeys.map(function (pid) { return cohortStats.periodStats[pid].stats.mean; })
      };
      var medianSeries = {
        name: tr('agRptClassMedian', 'Class Median Points'),
        color: '#0284c7',
        dashed: true,
        values: periodKeys.map(function (pid) { return cohortStats.periodStats[pid].stats.median; })
      };

      html += '  <div class="ag-chart-box">';
      html += '    <div class="ag-chart-title">' + tr('agRptEvolutionMeansMedians', 'Cohort Point Progression across Periods') + '</div>';
      html += AdminReports.svg.trendChart([meanSeries, medianSeries], periodLabels, { width: 700, paddingBottom: 100 });
      html += '  </div>';
      html += '</div>';
    }

    // 5.5 Full Cohort Roster Table with Individual Metrics
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptStudentRosterDetails', '4. Complete Student Administrative & Discipline Roster') + '</h2>';
    html += '  <div class="ag-report-table-wrap">';
    html += '    <table class="ag-report-table">';
    html += '      <thead>';
    html += '        <tr>';
    html += '          <th>' + tr('agColStudent', 'Student Name') + '</th>';
    html += '          <th>' + tr('agColClass', 'Class') + '</th>';
    html += '          <th>' + tr('agColRegime', 'Regimen') + '</th>';
    html += '          <th>' + tr('agColSen', 'Accommodations (SEN)') + '</th>';
    html += '          <th style="text-align:center;">' + tr('agColPoints', 'Discipline Pts') + '</th>';
    html += '          <th style="text-align:center;">' + tr('agRptDevMedian', 'Dev. vs Median') + '</th>';
    html += '          <th>' + tr('agColSanction', 'Sanction Tier') + '</th>';
    html += '          <th>' + tr('agColGuardianPhone', 'Guardian Phone') + '</th>';
    html += '        </tr>';
    html += '      </thead>';
    html += '      <tbody>';

    students.forEach(function (s) {
      var dev = roundNum((s.points || 0) - cohortStats.pointStats.median, 1);
      var devBadge = dev > 0
        ? '<span class="badge badge-tier3">+' + dev + '</span>'
        : (dev < 0 ? '<span class="badge badge-success">' + dev + '</span>' : '<span class="badge" style="background:#f1f5f9; color:#475569;">0</span>');
      var sancName = s.sanction ? (isFr ? (s.sanction.nameFr || s.sanction.name) : s.sanction.name) : (isFr ? 'RAS' : 'Good Standing');
      var sancBadgeClass = s.sanction ? (s.sanction.badgeClass || 'badge-tier1') : 'badge-success';

      html += '<tr>';
      html += '  <td><strong>' + escapeHtml(s.lastName.toUpperCase()) + '</strong> ' + escapeHtml(s.firstName) + '</td>';
      html += '  <td>' + escapeHtml(s.adminClass) + '</td>';
      html += '  <td>' + escapeHtml(s.regime || 'DP') + '</td>';
      html += '  <td>' + (s.sen ? ('<span class="badge badge-sen">' + escapeHtml(s.senDetails || 'SEN') + '</span>') : '&mdash;') + '</td>';
      html += '  <td style="text-align:center; font-weight:900; font-size:1.05rem;">' + (s.points || 0) + '</td>';
      html += '  <td style="text-align:center;">' + devBadge + '</td>';
      html += '  <td><span class="badge ' + sancBadgeClass + '">' + escapeHtml(sancName) + '</span></td>';
      html += '  <td>' + escapeHtml(s.guardian1Phone || '') + '</td>';
      html += '</tr>';
    });

    html += '      </tbody>';
    html += '    </table>';
    html += '  </div>';
    html += '</div>';

    return html;
  };

  // 5.6 Individual Student Dossier Report Builder
  AdminReports.buildStudentDossierReport = function (student, cohortStats, selectedPeriods, options, allActions, config) {
    options = options || {};
    config = config || {};
    var isFr = isFrench();
    var stAnalytics = AdminReports.computeStudentAnalytics(student, cohortStats, selectedPeriods, config, allActions);
    var timestamp = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var html = '';

    // Header Card
    html += '<div class="ag-report-header">';
    html += '  <div class="ag-report-brand-wrap">';
    html += '    <div class="ag-report-badge">INDIVIDUAL STUDENT DOSSIER</div>';
    html += '    <h1 class="ag-report-title">' + escapeHtml(student.lastName.toUpperCase()) + ' ' + escapeHtml(student.firstName) + '</h1>';
    html += '    <div class="ag-report-subtitle">' + escapeHtml(student.adminClass) + ' &bull; ' + tr('agColDob', 'DOB') + ': ' + escapeHtml(student.dob || 'N/A') + ' (' + escapeHtml(student.age || '') + ' ' + tr('agAgeYears', 'yrs') + ') &bull; ' + escapeHtml(timestamp) + '</div>';
    html += '  </div>';
    
    // Status Badge & Sanction Pill
    var sancName = student.sanction ? (isFr ? (student.sanction.nameFr || student.sanction.name) : student.sanction.name) : (isFr ? 'Situation normale (RAS)' : 'Good Standing');
    var sancBadge = student.sanction ? (student.sanction.badgeClass || 'badge-tier1') : 'badge-success';

    html += '  <div class="ag-report-header-meta">';
    html += '    <div class="ag-kpi-pill"><span class="ag-kpi-num">' + (student.points || 0) + '</span> <span class="ag-kpi-lbl">' + tr('agColPoints', 'Points') + '</span></div>';
    html += '    <div class="ag-kpi-pill"><span class="badge ' + sancBadge + '" style="font-size:0.9rem; padding:6px 12px;">' + escapeHtml(sancName) + '</span></div>';
    html += '  </div>';
    html += '</div>';

    // Demographics & Medical / Contact Summary Card
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptDemographicsContact', '1. Demographics, Health & Emergency Contacts') + '</h2>';
    html += '  <div class="ag-info-grid">';

    html += '    <div class="ag-info-block">';
    html += '      <div class="ag-info-label">' + tr('agColGuardian1', 'Primary Guardian') + '</div>';
    html += '      <div class="ag-info-val">' + escapeHtml(student.guardian1Name || 'N/A') + '</div>';
    html += '      <div class="ag-info-sub">' + escapeHtml(student.guardian1Phone || 'No phone') + ' &bull; ' + escapeHtml(student.guardian1Email || 'No email') + '</div>';
    html += '    </div>';

    html += '    <div class="ag-info-block">';
    html += '      <div class="ag-info-label">' + tr('agColRegime', 'Regimen & Exit Authorization') + '</div>';
    html += '      <div class="ag-info-val">' + escapeHtml(student.regime || 'DP') + ' / ' + escapeHtml(student.exitPermission || 'AUT') + '</div>';
    html += '      <div class="ag-info-sub">' + (student.address ? escapeHtml(student.address) : 'No address specified') + '</div>';
    html += '    </div>';

    html += '    <div class="ag-info-block">';
    html += '      <div class="ag-info-label">' + tr('agColSen', 'Accommodations (PAP, PPRE, PPS, 1/3 T)') + '</div>';
    html += '      <div class="ag-info-val">' + (student.sen ? ('<span class="badge badge-sen">' + escapeHtml(student.senDetails || 'Active Support') + '</span>') : '<span class="badge" style="background:#f1f5f9;">None</span>') + '</div>';
    html += '      <div class="ag-info-sub">' + (student.medicalNotes ? ('<strong>' + tr('agColMedical', 'Medical') + ':</strong> ' + escapeHtml(student.medicalNotes)) : 'No medical protocol on file') + '</div>';
    html += '    </div>';

    html += '    <div class="ag-info-block">';
    html += '      <div class="ag-info-label">' + tr('agRptTrajectory', 'Discipline Trajectory') + '</div>';
    var trajBadge = stAnalytics.trajectory === 'improving'
      ? '<span class="badge badge-success">&darr; ' + tr('agRptImproving', 'Improving (-' + Math.abs(stAnalytics.trajectoryDelta) + ' pts)') + '</span>'
      : (stAnalytics.trajectory === 'worsening'
        ? '<span class="badge badge-tier4">&uarr; ' + tr('agRptEscalating', 'Escalating (+' + stAnalytics.trajectoryDelta + ' pts)') + '</span>'
        : '<span class="badge" style="background:#f1f5f9; color:#475569;">' + tr('agRptStable', 'Stable') + '</span>');
    html += '      <div class="ag-info-val">' + trajBadge + '</div>';
    html += '      <div class="ag-info-sub">' + tr('agRptDevMedian', 'Dev. vs Class Median') + ': ' + (stAnalytics.pointDeviationMedian > 0 ? ('+' + stAnalytics.pointDeviationMedian) : stAnalytics.pointDeviationMedian) + ' pts</div>';
    html += '    </div>';

    html += '  </div>';
    html += '</div>';

    // Infraction Breakdown & Period Comparison Charts
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptInfractionEvolution', '2. Behavioral Infraction Breakdown & Benchmark Comparison') + '</h2>';
    html += '  <div class="ag-report-two-col">';

    // Left: Infraction categories for this student
    var infList = (config.infractions || []);
    var stInfItems = infList.map(function (inf, idx) {
      var count = (student.infractions && student.infractions[inf.key]) || 0;
      var name = isFr ? (inf.nameFr || inf.name) : inf.name;
      return {
        label: name,
        value: count,
        valueFormatted: count + ' (' + (count * (inf.weight || 1)) + ' pts)',
        color: NE表现_PALETTE[idx % NE表现_PALETTE.length]
      };
    });

    html += '    <div class="ag-chart-box">';
    html += '      <div class="ag-chart-title">' + tr('agRptStudentInfractionsTally', 'Student Infractions Count') + '</div>';
    html += AdminReports.svg.barChart(stInfItems, { width: 520 });
    html += '    </div>';

    // Right: Student vs Class Progression Chart
    if (stAnalytics.periodHistory.length > 0) {
      var pLabels = stAnalytics.periodHistory.map(function (ph) { return ph.periodName; });
      var stPointsSeries = {
        name: student.firstName + ' ' + student.lastName,
        color: '#dc2626',
        values: stAnalytics.periodHistory.map(function (ph) { return ph.points; })
      };
      var clMedianSeries = {
        name: tr('agRptClassMedian', 'Class Median'),
        color: '#0284c7',
        dashed: true,
        values: stAnalytics.periodHistory.map(function (ph) { return ph.classMedian; })
      };

      html += '    <div class="ag-chart-box">';
      html += '      <div class="ag-chart-title">' + tr('agRptStudentVsClassTrajectory', 'Student Progression vs Class Median') + '</div>';
      html += AdminReports.svg.trendChart([stPointsSeries, clMedianSeries], pLabels, { width: 520, paddingBottom: 95 });
      html += '    </div>';
    }

    html += '  </div>';
    html += '</div>';

    // Follow-up Action & Meeting Log Timeline
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agTimelineTitle', '3. Follow-up Actions & Meeting History') + ' (' + stAnalytics.actions.length + ')</h2>';

    if (!stAnalytics.actions.length) {
      html += '  <div class="ag-empty-state">' + tr('agRptNoActionsLogged', 'No disciplinary actions, parent meetings, or 1-on-1 talks recorded for this student.') + '</div>';
    } else {
      html += '  <div class="ag-report-timeline">';
      stAnalytics.actions.forEach(function (act) {
        var typeMeta = (config.actionTypes || []).find(function (at) { return at.id === act.type; }) || {};
        var typeLabel = isFr ? (typeMeta.nameFr || typeMeta.name || act.type) : (typeMeta.name || act.type);

        html += '    <div class="ag-report-timeline-item">';
        html += '      <div class="ag-timeline-date">' + escapeHtml(act.date || '') + '</div>';
        html += '      <div class="ag-timeline-card">';
        html += '        <div class="ag-timeline-head">';
        html += '          <span class="badge badge-tier2">' + escapeHtml(typeLabel) + '</span>';
        html += '          <strong style="margin-left:8px; font-size:0.95rem;">' + escapeHtml(act.title || '') + '</strong>';
        html += '        </div>';
        if (act.summary) {
          html += '        <div class="ag-timeline-summary">' + escapeHtml(act.summary) + '</div>';
        }
        html += '      </div>';
        html += '    </div>';
      });
      html += '  </div>';
    }
    html += '</div>';

    return html;
  };

  // 5.7 Multi-Student Comparative Matrix Builder
  AdminReports.buildMultiStudentComparisonReport = function (students, cohortStats, selectedPeriods, options, config) {
    options = options || {};
    config = config || {};
    var isFr = isFrench();
    var infList = config.infractions || [];
    var timestamp = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var html = '';

    html += '<div class="ag-report-header">';
    html += '  <div class="ag-report-brand-wrap">';
    html += '    <div class="ag-report-badge">COMPARATIVE ANALYSIS</div>';
    html += '    <h1 class="ag-report-title">' + tr('agRptMultiStudentComparison', 'Multi-Student Side-by-Side Comparison') + '</h1>';
    html += '    <div class="ag-report-subtitle">' + students.length + ' ' + tr('agRptStudentsSelected', 'students compared against class benchmarks') + ' &bull; ' + escapeHtml(timestamp) + '</div>';
    html += '  </div>';
    html += '</div>';

    // Comparative Bar Chart
    var compItems = students.map(function (s, idx) {
      return {
        label: s.lastName.toUpperCase() + ' ' + s.firstName.slice(0, 1) + '.',
        value: s.points || 0,
        valueFormatted: (s.points || 0) + ' pts (' + (s.adminClass || '') + ')',
        color: NE表现_PALETTE[idx % NE表现_PALETTE.length]
      };
    });

    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptDisciplinePointComparison', '1. Discipline Points Comparison') + '</h2>';
    html += '  <div class="ag-chart-box">';
    html += '    <div class="ag-chart-title">' + tr('agRptPointsComparisonBenchmark', 'Student Total Discipline Points (Class Median: ' + cohortStats.pointStats.median + ')') + '</div>';
    html += AdminReports.svg.barChart(compItems, { width: 700 });
    html += '  </div>';
    html += '</div>';

    // Stacked Infraction Types Comparison
    var stackedItems = students.map(function (s) {
      return {
        label: s.lastName.toUpperCase() + ' ' + s.firstName.slice(0, 1) + '.',
        values: s.infractions || {}
      };
    });
    var catMetaList = infList.map(function (inf, idx) {
      return {
        key: inf.key,
        name: isFr ? (inf.nameFr || inf.name) : inf.name,
        color: NE表现_PALETTE[idx % NE表现_PALETTE.length]
      };
    });

    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptInfractionProfileComparison', '2. Category Profiles Breakdown') + '</h2>';
    html += '  <div class="ag-chart-box">';
    html += '    <div class="ag-chart-title">' + tr('agRptInfractionComposition', 'Infraction Composition by Student') + '</div>';
    html += AdminReports.svg.stackedBarChart(catMetaList, stackedItems, { width: 700 });
    
    // Legend
    html += '    <div class="ag-chart-legend" style="margin-top:14px; display:flex; gap:12px; flex-wrap:wrap;">';
    catMetaList.forEach(function (c) {
      html += '<div class="ag-legend-row"><span class="ag-legend-dot" style="background:' + c.color + ';"></span> <span class="ag-legend-text">' + escapeHtml(c.name) + '</span></div>';
    });
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    // Comparative Data Matrix Table
    html += '<div class="ag-report-section">';
    html += '  <h2 class="ag-section-title">' + tr('agRptComparisonMatrix', '3. Detailed Comparative Matrix') + '</h2>';
    html += '  <div class="ag-report-table-wrap">';
    html += '    <table class="ag-report-table">';
    html += '      <thead>';
    html += '        <tr>';
    html += '          <th>' + tr('agColStudent', 'Student') + '</th>';
    html += '          <th>' + tr('agColClass', 'Class') + '</th>';
    html += '          <th>' + tr('agColSen', 'SEN') + '</th>';
    infList.forEach(function (inf) {
      html += '        <th style="text-align:center;">' + escapeHtml(isFr ? (inf.nameFr || inf.name) : inf.name) + '</th>';
    });
    html += '          <th style="text-align:center;">' + tr('agColPoints', 'Total Pts') + '</th>';
    html += '          <th>' + tr('agColSanction', 'Sanction Tier') + '</th>';
    html += '        </tr>';
    html += '      </thead>';
    html += '      <tbody>';

    students.forEach(function (s) {
      var sancName = s.sanction ? (isFr ? (s.sanction.nameFr || s.sanction.name) : s.sanction.name) : (isFr ? 'RAS' : 'None');
      var sancBadge = s.sanction ? (s.sanction.badgeClass || 'badge-tier1') : 'badge-success';

      html += '<tr>';
      html += '  <td><strong>' + escapeHtml(s.lastName.toUpperCase()) + '</strong> ' + escapeHtml(s.firstName) + '</td>';
      html += '  <td>' + escapeHtml(s.adminClass) + '</td>';
      html += '  <td>' + (s.sen ? '<span class="badge badge-sen">SEN</span>' : '&mdash;') + '</td>';
      infList.forEach(function (inf) {
        var cnt = (s.infractions && s.infractions[inf.key]) || 0;
        html += '<td style="text-align:center;' + (cnt > 0 ? ' font-weight:800;' : ' color:#94a3b8;') + '">' + cnt + '</td>';
      });
      html += '  <td style="text-align:center; font-weight:900; font-size:1.1rem;">' + (s.points || 0) + '</td>';
      html += '  <td><span class="badge ' + sancBadge + '">' + escapeHtml(sancName) + '</span></td>';
      html += '</tr>';
    });

    html += '      </tbody>';
    html += '    </table>';
    html += '  </div>';
    html += '</div>';

    return html;
  };

  // 5.8 Standalone Full HTML Document Wrapper
  AdminReports.buildFullStandaloneHtmlReport = function (title, bodyContent) {
    return '<!DOCTYPE html>\n<html lang="' + (isFrench() ? 'fr' : 'en') + '">\n<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>' + escapeHtml(title) + '</title>\n' +
      '  <style>\n' +
      AdminReports.getEmbeddedCss() +
      '\n  </style>\n' +
      '</head>\n<body>\n' +
      '  <div class="ag-report-wrap">\n' +
      bodyContent +
      '\n  </div>\n' +
      '</body>\n</html>';
  };

  // ── 6. Embedded CSS for Standalone Reports & Print ──
  AdminReports.getEmbeddedCss = function () {
    return [
      '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #000000; padding: 24px; line-height: 1.5; }',
      '.ag-report-wrap { max-width: 960px; margin: 0 auto; }',
      
      /* Neobrutalist Headers & Cards */
      '.ag-report-header { background: #ffffff; border: 2.5px solid #000000; box-shadow: 4px 4px 0 #000000; padding: 20px 24px; border-radius: 6px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }',
      '.ag-report-badge { display: inline-block; background: #000000; color: #ffffff; font-size: 0.72rem; font-weight: 900; letter-spacing: 1px; padding: 3px 8px; border-radius: 3px; margin-bottom: 6px; text-transform: uppercase; }',
      '.ag-report-title { font-size: 1.85rem; font-weight: 900; letter-spacing: -0.5px; }',
      '.ag-report-subtitle { font-size: 0.88rem; color: #475569; font-weight: 700; margin-top: 4px; }',
      '.ag-report-header-meta { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }',
      '.ag-kpi-pill { background: #f8fafc; border: 2px solid #000000; box-shadow: 2px 2px 0 #000000; padding: 6px 12px; border-radius: 4px; display: flex; align-items: baseline; gap: 6px; }',
      '.ag-kpi-num { font-size: 1.3rem; font-weight: 900; }',
      '.ag-kpi-lbl { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #475569; }',
      
      /* Section */
      '.ag-report-section { background: #ffffff; border: 2.5px solid #000000; box-shadow: 4px 4px 0 #000000; border-radius: 6px; padding: 20px 24px; margin-bottom: 24px; break-inside: avoid; page-break-inside: avoid; }',
      '.ag-section-title { font-size: 1.15rem; font-weight: 900; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.4px; }',
      
      /* KPI Grid */
      '.ag-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }',
      '.ag-kpi-card { background: #f8fafc; border: 2px solid #000000; box-shadow: 3px 3px 0 #000000; border-radius: 4px; padding: 12px 14px; }',
      '.ag-kpi-top { font-size: 0.75rem; font-weight: 900; text-transform: uppercase; color: #475569; margin-bottom: 4px; }',
      '.ag-kpi-val { font-size: 1.7rem; font-weight: 900; color: #000000; }',
      '.ag-kpi-sub { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-top: 2px; }',
      
      /* Two Col */
      '.ag-report-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }',
      '@media (max-width: 768px) { .ag-report-two-col { grid-template-columns: 1fr; } }',
      
      /* Charts */
      '.ag-chart-box { background: #f8fafc; border: 2px solid #000000; box-shadow: 3px 3px 0 #000000; border-radius: 4px; padding: 14px; }',
      '.ag-chart-title { font-size: 0.85rem; font-weight: 900; text-transform: uppercase; margin-bottom: 12px; }',
      '.ag-chart-legend { display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; font-weight: 700; }',
      '.ag-legend-row { display: flex; align-items: center; gap: 8px; }',
      '.ag-legend-dot { width: 12px; height: 12px; border: 1.5px solid #000000; border-radius: 2px; display: inline-block; }',

      /* Info Grid (Student Dossier) */
      '.ag-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }',
      '.ag-info-block { background: #f8fafc; border: 2px solid #000000; box-shadow: 2px 2px 0 #000000; border-radius: 4px; padding: 12px 14px; }',
      '.ag-info-label { font-size: 0.72rem; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }',
      '.ag-info-val { font-size: 1.05rem; font-weight: 900; }',
      '.ag-info-sub { font-size: 0.78rem; font-weight: 700; color: #475569; margin-top: 4px; }',

      /* Table */
      '.ag-report-table-wrap { overflow-x: auto; border: 2px solid #000000; box-shadow: 3px 3px 0 #000000; border-radius: 4px; }',
      '.ag-report-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; background: #ffffff; }',
      '.ag-report-table th, .ag-report-table td { padding: 8px 12px; border-bottom: 1px solid #000000; border-right: 1px solid #000000; }',
      '.ag-report-table th { background: #f1f5f9; font-weight: 900; text-transform: uppercase; font-size: 0.75rem; border-bottom: 2px solid #000000; }',
      '.ag-report-table tr:last-child td { border-bottom: none; }',
      '.ag-report-table tr:hover { background: #f8fafc; }',

      /* Badges */
      '.badge { display: inline-block; padding: 2px 7px; font-size: 0.75rem; font-weight: 800; border-radius: 3px; border: 1.5px solid #000000; text-transform: uppercase; }',
      '.badge-tier1 { background: #fef08a; color: #000000; }',
      '.badge-tier2 { background: #fed7aa; color: #000000; }',
      '.badge-tier3 { background: #fca5a5; color: #000000; }',
      '.badge-tier4 { background: #f87171; color: #000000; }',
      '.badge-success { background: #dcfce7; color: #000000; }',
      '.badge-sen { background: #e9d5ff; color: #000000; }',

      /* Timeline */
      '.ag-report-timeline { display: flex; flex-direction: column; gap: 12px; }',
      '.ag-report-timeline-item { display: flex; gap: 14px; }',
      '.ag-timeline-date { font-size: 0.8rem; font-weight: 900; width: 95px; flex-shrink: 0; padding-top: 6px; }',
      '.ag-timeline-card { flex-grow: 1; background: #f8fafc; border: 2px solid #000000; box-shadow: 2px 2px 0 #000000; border-radius: 4px; padding: 10px 14px; }',
      '.ag-timeline-head { display: flex; align-items: center; }',
      '.ag-timeline-summary { font-size: 0.82rem; color: #334155; margin-top: 6px; font-weight: 600; line-height: 1.4; }',
      '.ag-empty-state { padding: 18px; text-align: center; font-weight: 700; color: #94a3b8; background: #f8fafc; border: 2px dashed #000000; border-radius: 4px; }',

      /* Print Optimizations */
      '@media print {',
      '  body { padding: 0; background: #ffffff !important; color: #000000 !important; font-size: 11pt; }',
      '  .ag-report-wrap { max-width: 100%; width: 100%; margin: 0; }',
      '  .ag-report-section { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; border-width: 1.5px !important; margin-bottom: 16px !important; }',
      '  .ag-report-header { box-shadow: none !important; border-width: 1.5px !important; margin-bottom: 16px !important; }',
      '  .ag-chart-box, .ag-kpi-card, .ag-info-block, .ag-report-table-wrap { box-shadow: none !important; }',
      '  .badge { border-width: 1px !important; }',
      '}'
    ].join('\n');
  };

  // ── 7. Multi-Sheet XLSX Workbook Exporter (SheetJS) ──
  AdminReports.exportToXlsxWorkbook = function (students, cohortStats, selectedPeriods, options, config, filename) {
    if (typeof XLSX === 'undefined') {
      if (window.showToast) window.showToast('XLSX library not loaded.', true); else alert('XLSX library not loaded.');
      return;
    }
    options = options || {};
    config = config || {};
    var isFr = isFrench();
    var infList = config.infractions || [];
    var wb = XLSX.utils.book_new();

    // Sheet 1: KPIs & Summary
    var kpiRows = [
      ['ADMINISTRATIVE GROUP REPORT SUMMARY', ''],
      ['Report Scope', options.groupName || 'All Students'],
      ['Period Scope', options.periodLabel || 'Cumulative'],
      ['Export Date', new Date().toISOString().split('T')[0]],
      ['', ''],
      ['COHORT METRICS', 'VALUE'],
      ['Total Students', cohortStats.totalStudents],
      ['Mean Discipline Points', cohortStats.pointStats.mean],
      ['Median Discipline Points', cohortStats.pointStats.median],
      ['Standard Deviation', cohortStats.pointStats.stdDev],
      ['Min Points', cohortStats.pointStats.min],
      ['Max Points', cohortStats.pointStats.max],
      ['Q1 (25th Percentile)', cohortStats.pointStats.q1],
      ['Q3 (75th Percentile)', cohortStats.pointStats.q3],
      ['Interquartile Range (IQR)', cohortStats.pointStats.iqr],
      ['SEN / Accommodations Count', cohortStats.senCount + ' (' + cohortStats.senPercent + '%)'],
      ['', ''],
      ['INFRACTION CATEGORY TOTALS', 'TOTAL COUNT', 'AVG PER STUDENT']
    ];

    Object.keys(cohortStats.categoryStats).forEach(function (k) {
      var cs = cohortStats.categoryStats[k];
      var name = isFr ? (cs.meta.nameFr || cs.meta.name) : cs.meta.name;
      kpiRows.push([name, cs.stats.sum, cs.stats.mean]);
    });

    var wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Summary KPIs');

    // Sheet 2: Master Student Roster
    var rosterRows = students.map(function (s) {
      var sancName = s.sanction ? (isFr ? (s.sanction.nameFr || s.sanction.name) : s.sanction.name) : (isFr ? 'RAS' : 'Good Standing');
      var item = {
        'Last Name': s.lastName.toUpperCase(),
        'First Name': s.firstName,
        'Class': s.adminClass,
        'DOB': s.dob,
        'Age': s.age,
        'Gender': s.gender || '',
        'Regimen': s.regime || 'DP',
        'SEN Accommodations': s.sen ? (s.senDetails || 'YES') : 'NO',
        'Discipline Points': s.points || 0,
        'Sanction Tier': sancName,
        'Guardian 1': s.guardian1Name || '',
        'Phone': s.guardian1Phone || '',
        'Email': s.guardian1Email || '',
        'Medical Notes': s.medicalNotes || ''
      };
      infList.forEach(function (inf) {
        var hName = isFr ? (inf.nameFr || inf.name) : inf.name;
        item[hName] = (s.infractions && s.infractions[inf.key]) || 0;
      });
      return item;
    });
    var wsRoster = XLSX.utils.json_to_sheet(rosterRows);
    XLSX.utils.book_append_sheet(wb, wsRoster, 'Student Roster');

    // Sheet 3: Period Breakdown (if periods exist)
    var periods = config.periods || [];
    if (periods.length > 0) {
      var periodRows = [];
      students.forEach(function (s) {
        periods.forEach(function (p) {
          var pInf = (s.periods && s.periods[p.id] && s.periods[p.id].infractions) || {};
          var pSum = 0;
          infList.forEach(function (inf) {
            pSum += (parseInt(pInf[inf.key], 10) || 0) * (inf.weight != null ? inf.weight : 1);
          });
          var pRow = {
            'Student': s.lastName.toUpperCase() + ' ' + s.firstName,
            'Class': s.adminClass,
            'Period ID': p.id,
            'Period Name': isFr ? (p.nameFr || p.name) : p.name,
            'Period Points': pSum
          };
          infList.forEach(function (inf) {
            var hName = isFr ? (inf.nameFr || inf.name) : inf.name;
            pRow[hName] = pInf[inf.key] || 0;
          });
          periodRows.push(pRow);
        });
      });
      var wsPeriod = XLSX.utils.json_to_sheet(periodRows);
      XLSX.utils.book_append_sheet(wb, wsPeriod, 'Period Breakdown');
    }

    XLSX.writeFile(wb, (filename || 'administrative_report') + '.xlsx');
  };

  // Expose module globally
  window.AdminReports = AdminReports;
})();
