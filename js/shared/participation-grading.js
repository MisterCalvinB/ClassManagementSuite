/**
 * Shared Participation Grading Engine
 * Used by both pages/participation-tracker.html and pages/grade-sheet.html
 * so provisional participation grades & criteria points stay 100% consistent.
 */
(function (global) {
  'use strict';

  const DEFAULT_BADGE_DEFINITIONS = [
    { icon: '+', label: 'Plus', meaning: 'Positive participation point', tone: 'positive', coefficient: 1, isBuiltin: true },
    { icon: '-', label: 'Minus', meaning: 'Negative participation point', tone: 'negative', coefficient: 1, isBuiltin: true },
    { icon: '💎', label: 'Gem', meaning: 'Outstanding contribution', tone: 'positive', coefficient: 1 },
    { icon: '⭐', label: 'Star', meaning: 'Great effort', tone: 'positive', coefficient: 1 },
    { icon: '👍', label: 'Good', meaning: 'Good participation', tone: 'positive', coefficient: 1 },
    { icon: '💡', label: 'Idea', meaning: 'Insightful idea', tone: 'positive', coefficient: 1 },
    { icon: '🔥', label: 'Streak', meaning: 'Consistent focus', tone: 'positive', coefficient: 1 },
    { icon: '💬', label: 'Speaking', meaning: 'Active oral participation', tone: 'positive', coefficient: 1 },
    { icon: '😴', label: 'Off-Task', meaning: 'Distracted or sleepy', tone: 'negative', coefficient: 1 },
    { icon: '⚠️', label: 'Warning', meaning: 'Behavior warning', tone: 'negative', coefficient: 1 }
  ];

  function normalizeBadgeLabel(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function normalizeBadgeTone(tone) {
    const t = String(tone || '').trim().toLowerCase();
    if (t === 'positive' || t === 'negative' || t === 'neutral') return t;
    return '';
  }

  function getConfiguredBadgeDefinitions() {
    try {
      const cfg = (typeof global.CLASS_MANAGEMENT_CONFIG !== 'undefined' && global.CLASS_MANAGEMENT_CONFIG)
        ? global.CLASS_MANAGEMENT_CONFIG
        : null;
      if (cfg && Array.isArray(cfg.badgeDefinitions) && cfg.badgeDefinitions.length > 0) {
        return cfg.badgeDefinitions.map(b => ({
          icon: String(b.icon || '').trim(),
          label: String(b.label || '').trim(),
          meaning: String(b.meaning || '').trim(),
          tone: normalizeBadgeTone(b.tone) || 'neutral',
          coefficient: Number.isFinite(Number(b.coefficient)) ? Number(b.coefficient) : 1,
          isBuiltin: !!b.isBuiltin
        }));
      }
    } catch (_) {}
    return DEFAULT_BADGE_DEFINITIONS.map(b => ({ ...b }));
  }

  function getConfiguredPlusMinusCoefficient() {
    try {
      const cfg = (typeof global.CLASS_MANAGEMENT_CONFIG !== 'undefined' && global.CLASS_MANAGEMENT_CONFIG)
        ? global.CLASS_MANAGEMENT_CONFIG
        : null;
      const pm = Number(cfg && cfg.participationSettings && cfg.participationSettings.plusMinusCoefficient);
      if (Number.isFinite(pm)) return pm;
    } catch (_) {}
    return 1;
  }

  function resolveBadgeDefinition(badge, definitions) {
    if (!badge) return null;
    let icon = '';
    let label = '';
    if (typeof badge === 'object') {
      icon = normalizeBadgeLabel(badge.icon);
      label = normalizeBadgeLabel(badge.label);
    } else if (typeof badge === 'string') {
      label = normalizeBadgeLabel(badge);
    }
    const defs = definitions || getConfiguredBadgeDefinitions();
    if (icon && label) {
      const exact = defs.find(d => normalizeBadgeLabel(d.icon) === icon && normalizeBadgeLabel(d.label) === label);
      if (exact) return exact;
    }
    if (icon) {
      const byIcon = defs.find(d => normalizeBadgeLabel(d.icon) === icon);
      if (byIcon) return byIcon;
    }
    if (label) {
      const byLabel = defs.find(d => normalizeBadgeLabel(d.label) === label);
      if (byLabel) return byLabel;
      const byCombo = defs.find(d => normalizeBadgeLabel(`${d.icon} ${d.label}`) === label);
      if (byCombo) return byCombo;
    }
    return null;
  }

  function resolveBadgeData(badge, definitions) {
    const configured = resolveBadgeDefinition(badge, definitions);
    const rawCoeff = configured && configured.coefficient !== undefined
      ? configured.coefficient
      : (typeof badge === 'object' ? badge && badge.coefficient : 1);
    const coefficient = Number.isFinite(Number(rawCoeff)) ? Number(rawCoeff) : 1;

    let icon = String((configured && configured.icon) || (typeof badge === 'object' && badge ? badge.icon : '') || '').trim();
    let label = String((configured && configured.label) || (typeof badge === 'object' && badge ? badge.label : (typeof badge === 'string' ? badge : 'Badge')) || '').trim();

    if (!icon && typeof badge === 'string') {
      const parts = badge.trim().split(/\s+/);
      if (parts.length > 1 && (parts[0].length <= 4 || /\p{Extended_Pictographic}/u.test(parts[0]))) {
        icon = parts[0];
        label = parts.slice(1).join(' ');
      }
    }

    return {
      icon,
      label,
      meaning: String((configured && configured.meaning) || (typeof badge === 'object' && badge ? badge.meaning : '') || '').trim(),
      tone: normalizeBadgeTone((configured && configured.tone) || (typeof badge === 'object' && badge ? badge.tone : '')) || 'neutral',
      coefficient
    };
  }

  function countBadgeSentiment(badges, definitions) {
    const defs = definitions || getConfiguredBadgeDefinitions();
    return (badges || []).reduce((acc, badge) => {
      const data = resolveBadgeData(badge, defs);
      if (data.tone === 'positive') acc.positive += data.coefficient;
      if (data.tone === 'negative') acc.negative += data.coefficient;
      return acc;
    }, { positive: 0, negative: 0 });
  }

  function getStudentBadgeCounts(badges, definitions) {
    const defs = definitions || getConfiguredBadgeDefinitions();
    const counts = {};
    (badges || []).forEach(badge => {
      const resolved = resolveBadgeData(badge, defs);
      if (resolved.icon) counts[resolved.icon] = (counts[resolved.icon] || 0) + 1;
      if (resolved.label) {
        const normalized = resolved.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    });
    return counts;
  }

  function computeTrend(nets) {
    if (!Array.isArray(nets) || nets.length < 3) return 'flat';
    const mid = Math.floor(nets.length / 2);
    const first = nets.slice(0, mid);
    const second = nets.slice(mid);
    const avg1 = first.reduce((a, b) => a + b, 0) / first.length;
    const avg2 = second.reduce((a, b) => a + b, 0) / second.length;
    const diff = avg2 - avg1;
    if (diff > 0.35) return 'up';
    if (diff < -0.35) return 'down';
    return 'flat';
  }

  function getOverviewNet(data, definitions) {
    const defs = definitions || getConfiguredBadgeDefinitions();
    const plusDef = defs.find(d => d.isBuiltin && d.icon === '+');
    const minusDef = defs.find(d => d.isBuiltin && d.icon === '-');
    const fallbackCoeff = getConfiguredPlusMinusCoefficient();
    const plusCoeff = plusDef ? plusDef.coefficient : fallbackCoeff;
    const minusCoeff = minusDef ? minusDef.coefficient : fallbackCoeff;
    const raw = ((data.pluses || 0) + (data.teamPluses || 0)) * plusCoeff
      - ((data.minuses || 0) + (data.teamMinuses || 0)) * minusCoeff
      + (data.badgePositive || 0) - (data.badgeNegative || 0);
    return parseFloat(raw.toFixed(2));
  }

  function tokenizeFormula(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      const char = str[i];
      if (/\s/.test(char)) { i++; continue; }
      if (char === '[') {
        const start = i + 1;
        const end = str.indexOf(']', start);
        if (end === -1) throw new Error('Unterminated bracket in formula');
        tokens.push({ type: 'IDENTIFIER', value: str.substring(start, end) });
        i = end + 1;
        continue;
      }
      if (char === '"' || char === "'") {
        const start = i + 1;
        const end = str.indexOf(char, start);
        if (end === -1) throw new Error('Unterminated string literal');
        tokens.push({ type: 'STRING', value: str.substring(start, end) });
        i = end + 1;
        continue;
      }
      if (/\d/.test(char) || (char === '.' && /\d/.test(str[i + 1]))) {
        let numStr = '';
        while (i < str.length && (/\d/.test(str[i]) || str[i] === '.')) {
          numStr += str[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }
      if (i + 1 < str.length) {
        const two = str.substr(i, 2);
        if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
          tokens.push({ type: 'OPERATOR', value: two });
          i += 2;
          continue;
        }
      }
      if ('+-*/(),><=!'.includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }
      let identStr = '';
      while (i < str.length && (!/\s/.test(str[i]) && !'+-*/(),><=![]"\''.includes(str[i]))) {
        identStr += str[i];
        i++;
      }
      if (identStr) {
        const upper = identStr.toUpperCase();
        if (upper === 'AND') tokens.push({ type: 'OPERATOR', value: '&&' });
        else if (upper === 'OR') tokens.push({ type: 'OPERATOR', value: '||' });
        else if (upper === 'NOT') tokens.push({ type: 'OPERATOR', value: '!' });
        else if (upper === 'IF') tokens.push({ type: 'KEYWORD', value: 'IF' });
        else tokens.push({ type: 'IDENTIFIER', value: identStr });
        continue;
      }
      throw new Error(`Unexpected character: ${char}`);
    }
    return tokens;
  }

  function evaluateExpression(exprStr, context) {
    const tokens = tokenizeFormula(String(exprStr || ''));
    let position = 0;
    function peek() { return tokens[position]; }
    function consume(expectedValue) {
      const token = peek();
      if (!token) throw new Error('Unexpected end of formula');
      if (expectedValue !== undefined && token.value !== expectedValue) {
        throw new Error(`Expected '${expectedValue}' but found '${token.value}'`);
      }
      position++;
      return token;
    }
    function parsePrimary() {
      const token = peek();
      if (!token) throw new Error('Unexpected end of formula');
      if (token.type === 'NUMBER' || token.type === 'STRING') { consume(); return token.value; }
      if (token.type === 'KEYWORD' && token.value === 'IF') {
        consume(); consume('(');
        const cond = parseExpression(); consume(',');
        const trueVal = parseExpression(); consume(',');
        const falseVal = parseExpression(); consume(')');
        return cond ? trueVal : falseVal;
      }
      if (token.type === 'IDENTIFIER') {
        consume();
        const name = token.value.trim();
        const lowerName = name.toLowerCase();
        const normalizedName = lowerName.replace(/[^a-z0-9]/g, '');
        if (name in context) return context[name];
        if (lowerName in context) return context[lowerName];
        if (normalizedName in context) return context[normalizedName];
        for (const [k, v] of Object.entries(context)) {
          if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName) return v;
        }
        return 0;
      }
      if (token.type === 'OPERATOR' && token.value === '(') {
        consume('(');
        const val = parseExpression();
        consume(')');
        return val;
      }
      throw new Error(`Unexpected token: ${token.value}`);
    }
    function parseUnary() {
      const token = peek();
      if (token && token.type === 'OPERATOR' && (token.value === '!' || token.value === '-')) {
        consume();
        const val = parseUnary();
        return token.value === '!' ? !val : -val;
      }
      return parsePrimary();
    }
    function parseMultiplicative() {
      let val = parseUnary();
      while (true) {
        const token = peek();
        if (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
          consume();
          const right = parseUnary();
          val = token.value === '*' ? (val * right) : (right === 0 ? 0 : val / right);
        } else break;
      }
      return val;
    }
    function parseAdditive() {
      let val = parseMultiplicative();
      while (true) {
        const token = peek();
        if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
          consume();
          const right = parseMultiplicative();
          val = token.value === '+' ? (val + right) : (val - right);
        } else break;
      }
      return val;
    }
    function parseRelational() {
      let val = parseAdditive();
      while (true) {
        const token = peek();
        if (token && token.type === 'OPERATOR' && ['>', '<', '>=', '<='].includes(token.value)) {
          consume();
          const right = parseAdditive();
          if (token.value === '>') val = val > right;
          else if (token.value === '<') val = val < right;
          else if (token.value === '>=') val = val >= right;
          else val = val <= right;
        } else break;
      }
      return val;
    }
    function parseEquality() {
      let val = parseRelational();
      while (true) {
        const token = peek();
        if (token && token.type === 'OPERATOR' && (token.value === '==' || token.value === '!=' || token.value === '=')) {
          consume();
          const right = parseRelational();
          val = (token.value === '!=') ? (val != right) : (val == right); // eslint-disable-line eqeqeq
        } else break;
      }
      return val;
    }
    function parseLogicalAnd() {
      let val = parseEquality();
      while (true) {
        const token = peek();
        if (token && token.type === 'OPERATOR' && token.value === '&&') {
          consume();
          const right = parseEquality();
          val = val && right;
        } else break;
      }
      return val;
    }
    function parseLogicalOr() {
      let val = parseLogicalAnd();
      while (true) {
        const token = peek();
        if (token && token.type === 'OPERATOR' && token.value === '||') {
          consume();
          const right = parseLogicalAnd();
          val = val || right;
        } else break;
      }
      return val;
    }
    function parseExpression() { return parseLogicalOr(); }
    const result = parseExpression();
    if (position < tokens.length) {
      throw new Error(`Extra characters at end of formula: ${tokens[position].value}`);
    }
    return result;
  }

  function calculateCriterionPoints(studentValue, rule) {
    const minVal = Number(rule.minVal) || 0;
    const minPts = Number(rule.minPts) || 0;
    const passVal = Number(rule.passVal) || 0;
    const passPts = Number(rule.passPts) || 0;
    const maxVal = Number(rule.maxVal) || 0;
    const maxPts = Number(rule.maxPts) || 0;

    if (minVal > maxVal) {
      if (studentValue >= minVal) return minPts;
      if (studentValue <= maxVal) return maxPts;
      if (studentValue >= passVal) {
        if (minVal === passVal) return minPts;
        return minPts + ((minVal - studentValue) / (minVal - passVal)) * (passPts - minPts);
      }
      if (passVal === maxVal) return passPts;
      return passPts + ((passVal - studentValue) / (passVal - maxVal)) * (maxPts - passPts);
    }

    if (studentValue <= minVal) return minPts;
    if (studentValue >= maxVal) return maxPts;
    if (studentValue <= passVal) {
      if (minVal === passVal) return minPts;
      return minPts + ((studentValue - minVal) / (passVal - minVal)) * (passPts - minPts);
    }
    if (passVal === maxVal) return passPts;
    return passPts + ((studentValue - passVal) / (maxVal - passVal)) * (maxPts - passPts);
  }

  function getRuleLabel(rule, idx) {
    const ruleNum = idx + 1;
    if (rule.metric === 'formula') {
      return `Rule ${ruleNum} (Formula: ${rule.value || rule.formulaVal || 'Custom'})`;
    }
    const metricLabels = {
      netPoints: 'Net Points',
      picks: 'Times Picked',
      attendanceRate: 'Attendance Rate',
      positivePoints: 'Positive Points',
      badgePositive: 'Positive Badges (Total)',
      badgePositiveSession: 'Positive Badges / Session',
      badgeNegative: 'Negative Badges (Total)',
      badgeNegativeSession: 'Negative Badges / Session',
      pluses: 'Pluses',
      minuses: 'Minuses',
      teamPluses: 'Team Pluses',
      teamMinuses: 'Team Minuses',
      absent: 'Absent',
      sessions: 'Sessions',
      posRatio: '+/Session',
      negRatio: '-/Session',
      netRatio: 'Net/Session',
      ratio: 'Good/Bad Ratio',
      trend: 'Trend',
      teamRoleEvents: 'Team/Role Events'
    };
    let label = metricLabels[rule.metric];
    if (!label) {
      if (rule.metric.startsWith('badge_icon_session:')) label = `Badge ${rule.metric.replace('badge_icon_session:', '')} / session`;
      else if (rule.metric.startsWith('badge_icon:')) label = `Badge ${rule.metric.replace('badge_icon:', '')} (Total)`;
      else if (rule.metric.startsWith('badge_label_session:')) label = `Badge ${rule.metric.replace('badge_label_session:', '')} / session`;
      else if (rule.metric.startsWith('badge_label:')) label = `Badge ${rule.metric.replace('badge_label:', '')} (Total)`;
      else label = rule.metric;
    }
    return `Rule ${ruleNum} (${label})`;
  }

  function calculateProvisionalGradeDetails(studentData, groupRulesConfig, options = {}) {
    const dataToUse = (studentData && studentData.overall) ? studentData.overall : studentData;
    if (!dataToUse || !groupRulesConfig || !Array.isArray(groupRulesConfig.rules) || groupRulesConfig.rules.length === 0) {
      return null;
    }

    const definitions = options.badgeDefinitions || getConfiguredBadgeDefinitions();
    const totalSessions = Number.isFinite(Number(options.totalSessions))
      ? Number(options.totalSessions)
      : (dataToUse.sessions || 0);
    const sessionDenom = Math.max(1, totalSessions || dataToUse.sessions || 1);
    const tFn = typeof options.t === 'function' ? options.t : (typeof global.t === 'function' ? global.t : (() => ''));

    const picks = dataToUse.picks || 0;
    const net = getOverviewNet(dataToUse, definitions);
    const attendanceRate = totalSessions > 0 ? ((dataToUse.attendedSessions || 0) / totalSessions) * 100 : 0;
    const badgePositive = dataToUse.badgePositive || 0;
    const positivePoints = (dataToUse.pluses || 0) + (dataToUse.teamPluses || 0);
    const badgeCounts = getStudentBadgeCounts(dataToUse.badges, definitions);

    const badgeSessionCounts = {};
    Object.keys(badgeCounts).forEach(k => {
      const val = parseFloat((badgeCounts[k] / sessionDenom).toFixed(2));
      badgeSessionCounts[k + '_session'] = val;
      badgeSessionCounts[k + '_per_session'] = val;
    });

    const attendedSessions = dataToUse.attendedSessions || 0;
    const posRatio = attendedSessions ? ((dataToUse.pluses || 0) + (dataToUse.teamPluses || 0) + (dataToUse.badgePositive || 0)) / attendedSessions : 0;
    const negRatio = attendedSessions ? ((dataToUse.minuses || 0) + (dataToUse.teamMinuses || 0) + (dataToUse.badgeNegative || 0)) / attendedSessions : 0;
    const netRatio = attendedSessions ? net / attendedSessions : 0;
    const totalGood = (dataToUse.pluses || 0) + (dataToUse.teamPluses || 0) + (dataToUse.badgePositive || 0);
    const totalBad = (dataToUse.minuses || 0) + (dataToUse.teamMinuses || 0) + (dataToUse.badgeNegative || 0);
    const ratio = totalBad > 0 ? totalGood / totalBad : (totalGood > 0 ? 999 : 0);
    const trendStr = dataToUse.sessionNets ? computeTrend(dataToUse.sessionNets) : 'flat';
    const trend = trendStr === 'up' ? 1 : (trendStr === 'down' ? -1 : 0);

    let achievedPoints = 0;
    let totalPossiblePoints = 0;
    const ruleDetails = [];

    groupRulesConfig.rules.forEach((rule, idx) => {
      let studentValue = 0;
      let rulePoints = 0;
      const minPts = Number(rule.minPts) || 0;
      const passPts = Number(rule.passPts) || 0;
      const maxPts = Number(rule.maxPts) || 0;
      const effectiveMaxPts = rule.metric === 'formula' ? maxPts : Math.max(minPts, passPts, maxPts);

      if (rule.metric === 'formula') {
        const context = {
          netPoints: net, net, picks, attendanceRate, attendance: attendanceRate,
          positivePoints, positive: positivePoints, pluses: dataToUse.pluses || 0,
          minuses: dataToUse.minuses || 0, teamPluses: dataToUse.teamPluses || 0, teamMinuses: dataToUse.teamMinuses || 0,
          badgePositive, badgeNegative: dataToUse.badgeNegative || 0,
          badgePositiveSession: parseFloat((badgePositive / sessionDenom).toFixed(2)),
          badgeNegativeSession: parseFloat(((dataToUse.badgeNegative || 0) / sessionDenom).toFixed(2)),
          sessions: dataToUse.sessions || 0,
          absent: dataToUse.absent || 0, posRatio, negRatio, netRatio, ratio,
          trend, teamRoleEvents: dataToUse.teamRoleEvents || 0, ...badgeCounts, ...badgeSessionCounts
        };
        try {
          const formulaResult = evaluateExpression(rule.value || rule.formulaVal, context);
          if (typeof formulaResult === 'boolean') rulePoints = formulaResult ? maxPts : 0;
          else if (typeof formulaResult === 'number') rulePoints = formulaResult;
          else rulePoints = formulaResult ? maxPts : 0;
        } catch (_) {
          rulePoints = 0;
        }
        achievedPoints += rulePoints;
        totalPossiblePoints += maxPts;
      } else {
        if (rule.metric === 'netPoints') studentValue = net;
        else if (rule.metric === 'picks') studentValue = picks;
        else if (rule.metric === 'attendanceRate') studentValue = attendanceRate;
        else if (rule.metric === 'positivePoints') studentValue = positivePoints;
        else if (rule.metric === 'badgePositive') studentValue = badgePositive;
        else if (rule.metric === 'badgePositiveSession') studentValue = parseFloat((badgePositive / sessionDenom).toFixed(2));
        else if (rule.metric === 'badgeNegative') studentValue = dataToUse.badgeNegative || 0;
        else if (rule.metric === 'badgeNegativeSession') studentValue = parseFloat(((dataToUse.badgeNegative || 0) / sessionDenom).toFixed(2));
        else if (rule.metric === 'pluses') studentValue = dataToUse.pluses || 0;
        else if (rule.metric === 'minuses') studentValue = dataToUse.minuses || 0;
        else if (rule.metric === 'teamPluses') studentValue = dataToUse.teamPluses || 0;
        else if (rule.metric === 'teamMinuses') studentValue = dataToUse.teamMinuses || 0;
        else if (rule.metric === 'absent') studentValue = dataToUse.absent || 0;
        else if (rule.metric === 'sessions') studentValue = dataToUse.sessions || 0;
        else if (rule.metric === 'posRatio') studentValue = posRatio;
        else if (rule.metric === 'negRatio') studentValue = negRatio;
        else if (rule.metric === 'netRatio') studentValue = netRatio;
        else if (rule.metric === 'ratio') studentValue = ratio;
        else if (rule.metric === 'trend') studentValue = trend;
        else if (rule.metric === 'teamRoleEvents') studentValue = dataToUse.teamRoleEvents || 0;
        else if (rule.metric && rule.metric.startsWith('badge_icon_session:')) {
          const icon = rule.metric.replace('badge_icon_session:', '');
          studentValue = parseFloat(((badgeCounts[icon] || 0) / sessionDenom).toFixed(2));
        } else if (rule.metric && rule.metric.startsWith('badge_label_session:')) {
          const labelKey = rule.metric.replace('badge_label_session:', '').toLowerCase().replace(/[^a-z0-9]/g, '');
          studentValue = parseFloat(((badgeCounts[labelKey] || 0) / sessionDenom).toFixed(2));
        } else if (rule.metric && rule.metric.startsWith('badge_icon:')) {
          const icon = rule.metric.replace('badge_icon:', '');
          studentValue = badgeCounts[icon] || 0;
        } else if (rule.metric && rule.metric.startsWith('badge_label:')) {
          const labelKey = rule.metric.replace('badge_label:', '').toLowerCase().replace(/[^a-z0-9]/g, '');
          studentValue = badgeCounts[labelKey] || 0;
        }

        rulePoints = calculateCriterionPoints(studentValue, rule);
        achievedPoints += rulePoints;
        totalPossiblePoints += effectiveMaxPts;
      }

      let valueLabel = `${rule.metric}: ${studentValue}`;
      if (rule.metric === 'formula') valueLabel = `Formula: ${rule.value || rule.formulaVal || ''}`;
      else if (rule.metric === 'attendanceRate') valueLabel = `${tFn('ptStatsSessionsRecorded') || 'Attendance'}: ${studentValue.toFixed(0)}%`;
      else if (rule.metric === 'netPoints') valueLabel = `${tFn('ptStatsNetPoints') || 'Net Points'}: ${studentValue}`;
      else if (rule.metric === 'picks') valueLabel = `${tFn('ptStatsTimesPicked') || 'Times Picked'}: ${studentValue}`;

      ruleDetails.push({
        ruleIndex: idx,
        metric: rule.metric,
        name: getRuleLabel(rule, idx),
        studentValue,
        valueLabel,
        minPts,
        passPts,
        rawPoints: parseFloat(rulePoints.toFixed(2)),
        maxPts: effectiveMaxPts
      });
    });

    let finalGrade = 0;
    const maxGrade = Number(groupRulesConfig.maxGrade) || 20;
    if (groupRulesConfig.scaleToMax) {
      if (totalPossiblePoints > 0) {
        finalGrade = parseFloat(((achievedPoints / totalPossiblePoints) * maxGrade).toFixed(2));
        ruleDetails.forEach(rd => {
          rd.points = parseFloat(((rd.rawPoints / totalPossiblePoints) * maxGrade).toFixed(2));
          rd.maxPoints = parseFloat(((rd.maxPts / totalPossiblePoints) * maxGrade).toFixed(2));
        });
      } else {
        finalGrade = 0;
        ruleDetails.forEach(rd => { rd.points = 0; rd.maxPoints = 0; });
      }
    } else {
      finalGrade = parseFloat(achievedPoints.toFixed(2));
      ruleDetails.forEach(rd => {
        rd.points = rd.rawPoints;
        rd.maxPoints = rd.maxPts;
      });
    }

    return {
      grade: finalGrade,
      totalPoints: achievedPoints,
      totalPossible: totalPossiblePoints,
      rules: ruleDetails
    };
  }

  function extractSessionsFromContent(content) {
    const text = String(content || '').trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    const match = text.match(/(?:const|let|var)?\s*(?:window\.)?(?:CMS_)?DB_EXPORT\s*=\s*(\[[\s\S]*\]);?/);
    if (!match) return [];
    try {
      return JSON.parse(match[1]);
    } catch (_) {
      return [];
    }
  }

  function isExamSession(session, groupKey) {
    if (!session) return false;
    if (session.isExam === true || session.examSession === true) return true;
    if (groupKey && session.groups && session.groups[groupKey]) {
      const grp = session.groups[groupKey];
      return grp.length > 0 && grp.every(s => s.inExam === true);
    }
    return false;
  }

  function resolveSemesterDateBounds(semesterHint) {
    const cgd = (typeof global.CLASS_GROUPS_DATA !== 'undefined' && global.CLASS_GROUPS_DATA) ? global.CLASS_GROUPS_DATA : {};
    const pcfg = (typeof global.PLANNER_CONFIG !== 'undefined' && global.PLANNER_CONFIG) ? global.PLANNER_CONFIG : {};
    const semesters = Array.isArray(pcfg.semesters) ? pcfg.semesters : [];

    const wantSemNum = (semesterHint === 'sem2' || semesterHint === '2') ? '2' : (semesterHint === 'sem1' || semesterHint === '1') ? '1' : null;
    if (wantSemNum && semesters.length > 0) {
      const matched = semesters.find(s => String(s.semester || '').trim() === wantSemNum || String(s.id || '').toLowerCase().includes('s' + wantSemNum));
      if (matched && matched.semesterStart && matched.semesterEnd) {
        return { from: matched.semesterStart, to: matched.semesterEnd };
      }
    }
    if (cgd.activeSemesterStart && cgd.activeSemesterEnd) {
      if (!wantSemNum || String(cgd.activeSemester || '') === wantSemNum) {
        return { from: cgd.activeSemesterStart, to: cgd.activeSemesterEnd };
      }
    }
    if (pcfg.activeSemesterId && semesters.length > 0) {
      const activeSem = semesters.find(s => s.id === pcfg.activeSemesterId);
      if (activeSem && activeSem.semesterStart && activeSem.semesterEnd) {
        return { from: activeSem.semesterStart, to: activeSem.semesterEnd };
      }
    }
    return { from: '', to: '' };
  }

  function resolveGroupKeyInSession(session, candidateKeys) {
    if (!session || !session.groups) return null;
    for (const k of candidateKeys) {
      if (k && Array.isArray(session.groups[k])) return k;
    }
    const lowerMap = {};
    Object.keys(session.groups).forEach(gk => { lowerMap[gk.toLowerCase()] = gk; });
    for (const k of candidateKeys) {
      if (k && lowerMap[String(k).toLowerCase()]) return lowerMap[String(k).toLowerCase()];
    }
    return null;
  }

  async function loadRulesFromDisk() {
    if (!global.Desktop || !global.Desktop.isElectron()) {
      return global.CMS_PARTICIPATION_RULES || {};
    }
    try {
      const rp = await global.Desktop.readText('groupParticipation', 'pt-rules.js');
      if (rp && rp.ok && rp.content) {
        const m = rp.content.match(/window\.CMS_PARTICIPATION_RULES\s*=\s*(\{[\s\S]*\});?\s*$/);
        if (m) return JSON.parse(m[1]);
      }
    } catch (_) {}
    return global.CMS_PARTICIPATION_RULES || {};
  }

  async function loadAllParticipationSessions() {
    if (!global.Desktop || !global.Desktop.isElectron()) {
      return Array.isArray(global.DB_EXPORT) ? global.DB_EXPORT : [];
    }
    let sessions = [];
    const seenIds = new Set();
    try {
      const listResult = await global.Desktop.listByPath('groupParticipation', '.', { extensions: ['.js'] });
      const subFiles = ((listResult && listResult.files) || []).filter(f => f.relativePath && f.relativePath.includes('/'));
      for (const fileInfo of subFiles) {
        try {
          const res = await global.Desktop.readByPath('groupParticipation', fileInfo.relativePath);
          if (res && res.ok && res.content) {
            const parsed = extractSessionsFromContent(res.content);
            for (const s of parsed) {
              if (!s || !s.id || seenIds.has(s.id)) continue;
              seenIds.add(s.id);
              sessions.push(s);
            }
          }
        } catch (_) {}
      }
      if (sessions.length === 0) {
        for (const filename of ['cms-db.js', 'cms-db.json', 'cms-db.txt']) {
          try {
            const res = await global.Desktop.readText('groupParticipation', filename);
            if (res && res.ok && res.content) {
              sessions = extractSessionsFromContent(res.content);
              if (sessions.length > 0) break;
            }
          } catch (_) {}
        }
      }
      try {
        const tomb = await global.Desktop.readText('groupParticipation', 'pt-deleted.js');
        if (tomb && tomb.ok && tomb.content) {
          const m = tomb.content.match(/window\.CMS_DELETED_SESSIONS\s*=\s*(\[[\s\S]*?\]);?/);
          if (m) {
            const deletedIds = new Set(JSON.parse(m[1]));
            if (deletedIds.size > 0) sessions = sessions.filter(s => !deletedIds.has(s.id));
          }
        }
      } catch (_) {}
    } catch (_) {}
    return sessions;
  }

  /**
   * Compute live participation grades & criteria for a linked Grade Sheet test.
   * Returns null if no rules are configured, or an object with criteria, grades, studentCriteriaScores, and digest.
   */
  async function computeLinkedTestPayload(options = {}) {
    const {
      groupId,
      className,
      dateMode = 'semester',
      dateFrom = '',
      dateTo = '',
      semester = 'sem1',
      useGroupRules = true,
      rulesSnapshot = null,
      interval = 0.5,
      cachedSessions = null,
      cachedRules = null
    } = options;

    const allRules = cachedRules || await loadRulesFromDisk();
    const candidateKeys = [groupId, className].filter(Boolean);
    let groupRulesConfig = null;
    if (useGroupRules) {
      for (const k of candidateKeys) {
        if (allRules[k] && Array.isArray(allRules[k].rules) && allRules[k].rules.length > 0) {
          groupRulesConfig = allRules[k];
          break;
        }
      }
      if (!groupRulesConfig && allRules._default && Array.isArray(allRules._default.rules) && allRules._default.rules.length > 0) {
        groupRulesConfig = allRules._default;
      }
    }
    if (!groupRulesConfig && rulesSnapshot && Array.isArray(rulesSnapshot.rules) && rulesSnapshot.rules.length > 0) {
      groupRulesConfig = rulesSnapshot;
    }
    if (!groupRulesConfig || !Array.isArray(groupRulesConfig.rules) || groupRulesConfig.rules.length === 0) {
      return null;
    }

    let effFrom = '';
    let effTo = '';
    if (dateMode === 'semester') {
      const bounds = resolveSemesterDateBounds(semester);
      effFrom = bounds.from;
      effTo = bounds.to;
    } else if (dateMode === 'custom') {
      effFrom = dateFrom || '';
      effTo = dateTo || '';
    }

    const sessions = cachedSessions || await loadAllParticipationSessions();
    const definitions = getConfiguredBadgeDefinitions();

    const filteredSessions = sessions.filter(session => {
      if (!session || !session.id) return false;
      const gKey = resolveGroupKeyInSession(session, candidateKeys);
      if (!gKey) return false;
      if (isExamSession(session, gKey)) return false;
      const sDate = String(session.id).split('T')[0];
      if (effFrom && sDate < effFrom) return false;
      if (effTo && sDate > effTo) return false;
      return true;
    });

    const studentMap = {};
    filteredSessions.forEach(session => {
      const gKey = resolveGroupKeyInSession(session, candidateKeys);
      if (!gKey) return;
      (session.groups[gKey] || []).forEach(st => {
        if (!st || !st.name) return;
        const mapKey = st.uuid || st.studentUuid || st.name;
        if (!studentMap[mapKey]) {
          studentMap[mapKey] = {
            uuid: st.uuid || st.studentUuid || null,
            name: st.name,
            sessions: 0,
            attendedSessions: 0,
            picks: 0,
            absent: 0,
            pluses: 0,
            minuses: 0,
            teamPluses: 0,
            teamMinuses: 0,
            badges: [],
            badgePositive: 0,
            badgeNegative: 0,
            teamRoleEvents: 0,
            sessionNets: []
          };
        }
        const rec = studentMap[mapKey];
        rec.sessions++;
        if (!st.isAbsent) rec.attendedSessions++;
        if (st.isPicked) rec.picks++;
        if (st.isAbsent) rec.absent++;
        rec.pluses += st.pluses || 0;
        rec.minuses += st.minuses || 0;
        rec.teamPluses += st.teamPluses || 0;
        rec.teamMinuses += st.teamMinuses || 0;
        const stBadges = Array.isArray(st.badges) ? st.badges : [];
        const sent = countBadgeSentiment(stBadges, definitions);
        rec.badges = rec.badges.concat(stBadges);
        rec.badgePositive += sent.positive;
        rec.badgeNegative += sent.negative;

        const sessNet = (st.pluses || 0) + (st.teamPluses || 0) - (st.minuses || 0) - (st.teamMinuses || 0) + sent.positive - sent.negative;
        rec.sessionNets.push(sessNet);
      });
    });

    const rules = groupRulesConfig.rules;
    const maxGrade = Number(groupRulesConfig.maxGrade) || 20;
    const scaleToMax = !!groupRulesConfig.scaleToMax;
    const roundStep = (Number(interval) > 0) ? Number(interval) : 0.5;
    const roundToStep = (val) => Math.round(val / roundStep) * roundStep;

    const totalPossible = rules.reduce((sum, r) => {
      const effMax = r.metric === 'formula'
        ? Number(r.maxPts || 0)
        : Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
      return sum + effMax;
    }, 0);

    const criteria = rules.map((r, i) => {
      const effMax = r.metric === 'formula'
        ? Number(r.maxPts || 0)
        : Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
      const effMin = r.metric === 'formula'
        ? 0
        : Math.min(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
      const maxPointsRaw = (scaleToMax && totalPossible > 0) ? ((effMax / totalPossible) * maxGrade) : effMax;
      const minPointsRaw = (scaleToMax && totalPossible > 0) ? ((effMin / totalPossible) * maxGrade) : effMin;
      const rMax = roundToStep(maxPointsRaw);
      const rMin = roundToStep(minPointsRaw);
      return {
        id: `rule_crit_${i + 1}`,
        name: getRuleLabel(r, i),
        minPoints: Math.min(rMin, rMax),
        maxPoints: Math.max(rMin, rMax),
        pointCoefficient: 1,
        interval: roundStep,
        isBonus: false
      };
    });

    const grades = {};
    const gradesByUuid = {};
    const studentCriteriaScores = {};
    const studentCriteriaScoresByUuid = {};

    Object.values(studentMap).forEach(st => {
      const details = calculateProvisionalGradeDetails(st, groupRulesConfig, {
        totalSessions: filteredSessions.length,
        badgeDefinitions: definitions
      });
      if (!details) return;
      const roundedGrade = parseFloat(roundToStep(details.grade).toFixed(2));
      grades[st.name] = roundedGrade;
      if (st.uuid) gradesByUuid[st.uuid] = roundedGrade;

      const critObj = {};
      details.rules.forEach(rd => {
        const critId = `rule_crit_${rd.ruleIndex + 1}`;
        critObj[critId] = {
          points: parseFloat(roundToStep(rd.points).toFixed(2)),
          comment: ''
        };
      });
      studentCriteriaScores[st.name] = critObj;
      if (st.uuid) studentCriteriaScoresByUuid[st.uuid] = critObj;
    });

    const digestObj = {
      maxGrade,
      scaleToMax,
      criteria: criteria.map(c => ({ id: c.id, name: c.name, min: c.minPoints, max: c.maxPoints })),
      grades,
      studentCriteriaScores
    };

    return {
      criteria,
      grades,
      gradesByUuid,
      studentCriteriaScores,
      studentCriteriaScoresByUuid,
      maxGrade,
      scaleToMax,
      matchedSessionCount: filteredSessions.length,
      effectiveDateFrom: effFrom,
      effectiveDateTo: effTo,
      rulesConfig: groupRulesConfig,
      digest: JSON.stringify(digestObj)
    };
  }

  global.ParticipationGrading = {
    getConfiguredBadgeDefinitions,
    resolveBadgeData,
    countBadgeSentiment,
    getStudentBadgeCounts,
    getOverviewNet,
    evaluateExpression,
    calculateCriterionPoints,
    getRuleLabel,
    calculateProvisionalGradeDetails,
    extractSessionsFromContent,
    isExamSession,
    resolveSemesterDateBounds,
    loadRulesFromDisk,
    loadAllParticipationSessions,
    computeLinkedTestPayload
  };
})(window);
