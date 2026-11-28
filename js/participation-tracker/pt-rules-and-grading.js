// Participation Tracker — Objectives, Grading Rules, Provisional Grades & Student Chart
// ─── Objectives & Grading Rules and Student Performance Chart Logic ───
let rulesModalActiveGroup = null;

function populateRulesModalGroupSelect() {
    const select = document.getElementById('rulesModalGroupSelect');
    if (!select) return;
    select.innerHTML = '';
    
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = t('ptAllGroups') || 'Default (All Groups)';
    select.appendChild(defOpt);

    const groups = (typeof extractGroupsFromData === 'function') ? extractGroupsFromData() : [];
    const knownGroups = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
    
    const allGroupIds = new Set(groups);
    Object.keys(knownGroups).forEach(gId => allGroupIds.add(gId));
    
    allGroupIds.forEach(groupId => {
        if (typeof isGroupArchived === 'function' && isGroupArchived(groupId)) {
            return;
        }
        const opt = document.createElement('option');
        opt.value = groupId;
        opt.textContent = (typeof groupDisplayName === 'function') ? groupDisplayName(groupId) : groupId;
        select.appendChild(opt);
    });
    
    select.value = rulesModalActiveGroup || '';
}

function onRulesModalGroupChange(groupId) {
    rulesModalActiveGroup = groupId || null;
    
    // Update modal title
    const titleEl = document.getElementById('rulesModalTitle');
    if (titleEl) {
        if (groupId) {
            const gName = (typeof groupDisplayName === 'function') ? groupDisplayName(groupId) : groupId;
            titleEl.textContent = `${t('ptRulesModalTitle')} - ${gName}`;
        } else {
            titleEl.textContent = t('ptRulesModalTitle');
        }
    }
    
    loadRulesForActiveGroup();
}

function loadRulesForActiveGroup() {
    const targetGroup = rulesModalActiveGroup;
    const config = (targetGroup && window.CMS_PARTICIPATION_RULES && window.CMS_PARTICIPATION_RULES[targetGroup]) 
        || (window.CMS_PARTICIPATION_RULES && window.CMS_PARTICIPATION_RULES['_default']) 
        || {
            rules: [],
            maxGrade: 20,
            scaleToMax: false
        };

    document.getElementById('rulesMaxGrade').value = config.maxGrade || 20;
    document.getElementById('rulesScaleToMax').checked = !!config.scaleToMax;

    // Clear and render rules rows
    const tbody = document.getElementById('rulesTableBody');
    tbody.innerHTML = '';
    
    if (config.rules && config.rules.length > 0) {
        config.rules.forEach(rule => {
            let minV = rule.minVal, minP = rule.minPts, passV = rule.passVal, passP = rule.passPts, maxV = rule.maxVal, maxP = rule.maxPts, formV = rule.formulaVal || '';
            if (minV === undefined) {
                // Legacy rule conversion
                if (rule.metric === 'formula') {
                    formV = rule.value;
                    minV = 0; minP = 0; passV = 0; passP = 0; maxV = 0; maxP = rule.points;
                } else if (rule.operator === '<=') {
                    minV = rule.value; minP = rule.points;
                    passV = 0; passP = rule.points;
                    maxV = 0; maxP = rule.points;
                } else {
                    minV = rule.value; minP = rule.points;
                    passV = rule.value; passP = rule.points;
                    maxV = rule.value; maxP = rule.points;
                }
            }
            addRuleRow(rule.metric, minV, minP, passV, passP, maxV, maxP, formV);
        });
    } else {
        // Add an empty default row
        addRuleRow('netPoints', 0, 1, 5, 3, 10, 5, '');
    }

    updateProvisionalGradesPreview();
}

function openRulesWizard(targetGroupId = null) {
    if (!window.CmtWizard) {
        openRulesModal(targetGroupId);
        return;
    }
    const tr = (k, fb) => {
        try { if (window.i18n && i18n.t) { const v = i18n.t(k); if (v && v !== k) return v; } } catch (_) {}
        return fb;
    };

    const groups = (typeof extractGroupsFromData === 'function') ? extractGroupsFromData() : [];
    const knownGroups = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
    const allGroupIds = Array.from(new Set([...groups, ...Object.keys(knownGroups)]))
        .filter(gId => !(typeof isGroupArchived === 'function' && isGroupArchived(gId)));

    const initialGroup = targetGroupId || (typeof currentGroupId !== 'undefined' ? currentGroupId : '') || '';
    const existingCfg = (initialGroup && window.CMS_PARTICIPATION_RULES && window.CMS_PARTICIPATION_RULES[initialGroup])
        || (window.CMS_PARTICIPATION_RULES && window.CMS_PARTICIPATION_RULES['_default'])
        || { maxGrade: 20, scaleToMax: false };

    CmtWizard.open({
        id: 'pt-rules-wizard',
        title: tr('ptRulesWizTitle', 'Auto-Grade Builder'),
        icon: 'grade-sheet.svg',
        width: '700px',
        initialState: {
            groupId: initialGroup,
            style: 'balanced',
            maxGrade: existingCfg.maxGrade || 20,
            scaleToMax: !!existingCfg.scaleToMax
        },
        quickModeToggle: {
            label: tr('wizQuickFormula', 'Advanced Formula Editor'),
            icon: 'settings.svg',
            onClick: function (w) {
                w.close();
                openRulesModal(w.state.groupId || null);
            }
        },
        steps: [
            {
                id: 'class',
                label: tr('ptWizStep1', '1. Class'),
                render: function (container, st, ctx) {
                    container.innerHTML =
                        '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('ptWizClassHeading', 'Which class are these grading rules for?')) + '</h3>' +
                        '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('ptWizClassSub', 'You can set one default rule for all classes, or customize per class.')) + '</p>';
                    const sec = document.createElement('div');
                    sec.className = 'cmt-wiz-section';
                    sec.innerHTML = '<label class="cmt-wiz-label">' + ctx.escHtml(tr('ptSelectGroup', 'Class / Group')) + '</label>';
                    const sel = document.createElement('select');
                    sel.className = 'cmt-wiz-select';
                    const defOpt = document.createElement('option');
                    defOpt.value = '';
                    defOpt.textContent = tr('ptAllGroups', 'Default (All Groups)');
                    sel.appendChild(defOpt);
                    allGroupIds.forEach(gId => {
                        const opt = document.createElement('option');
                        opt.value = gId;
                        opt.textContent = (typeof groupDisplayName === 'function') ? groupDisplayName(gId) : gId;
                        if (gId === st.groupId) opt.selected = true;
                        sel.appendChild(opt);
                    });
                    sel.addEventListener('change', () => { st.groupId = sel.value; });
                    sec.appendChild(sel);
                    container.appendChild(sec);
                }
            },
            {
                id: 'style',
                label: tr('ptWizStep2', '2. Grading Style'),
                render: function (container, st, ctx) {
                    container.innerHTML =
                        '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('ptWizStyleHeading', 'How should participation be graded?')) + '</h3>' +
                        '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('ptWizStyleSub', 'Pick a teacher-friendly preset—no formulas required.')) + '</p>';
                    const presets = [
                        { id: 'balanced', icon: 'award.svg', badge: tr('wizRecommended', 'Recommended'), title: tr('ptWizStyleBalanced', 'Points + Attendance'), desc: tr('ptWizStyleBalancedDesc', 'Rewards both net participation points and regular class attendance.') },
                        { id: 'effort', icon: 'sparkles.svg', badge: 'Points', title: tr('ptWizStyleEffort', 'Participation Points Only'), desc: tr('ptWizStyleEffortDesc', 'Grades purely on positive vs. negative participation points earned.') },
                        { id: 'attendance', icon: 'check-circle.svg', badge: 'Presence', title: tr('ptWizStyleAttend', 'Attendance Focused'), desc: tr('ptWizStyleAttendDesc', 'Weights attendance rate heavily with a small bonus for active participation.') }
                    ];
                    ctx.renderCards(container, presets, st.style, function (item) { st.style = item.id; });

                    const scaleSec = document.createElement('div');
                    scaleSec.className = 'cmt-wiz-section';
                    scaleSec.style.marginTop = '12px';
                    scaleSec.innerHTML =
                        '<label class="cmt-wiz-label">' + ctx.escHtml(tr('ptWizMaxGradeLabel', 'Maximum Grade (e.g. 20, 10, 100)')) + '</label>' +
                        '<input type="number" class="cmt-wiz-input" id="pt-wiz-max-grade" min="1" max="1000" value="' + ctx.escHtml(st.maxGrade) + '" style="max-width:160px;margin-bottom:8px;">' +
                        '<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;font-weight:600;cursor:pointer;">' +
                          '<input type="checkbox" id="pt-wiz-scale-chk" ' + (st.scaleToMax ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:#222;">' +
                          '<span>' + ctx.escHtml(tr('ptWizScaleLabel', 'Automatically scale totals to fit Maximum Grade')) + '</span>' +
                        '</label>';
                    scaleSec.querySelector('#pt-wiz-max-grade').addEventListener('input', function () {
                        st.maxGrade = parseFloat(this.value) || 20;
                    });
                    scaleSec.querySelector('#pt-wiz-scale-chk').addEventListener('change', function () {
                        st.scaleToMax = this.checked;
                    });
                    container.appendChild(scaleSec);
                }
            },
            {
                id: 'apply',
                label: tr('ptWizStep3', '3. Save & Apply'),
                render: function (container, st, ctx) {
                    const gName = st.groupId ? ((typeof groupDisplayName === 'function') ? groupDisplayName(st.groupId) : st.groupId) : tr('ptAllGroups', 'Default (All Groups)');
                    container.innerHTML =
                        '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('ptWizConfirmHeading', 'Ready to save grading rules')) + '</h3>' +
                        '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('ptWizConfirmSub', 'Click Save Rules to apply this setup and calculate provisional grades.')) + '</p>' +
                        '<div class="cmt-wiz-summary-box">' +
                          '<div><strong>' + ctx.escHtml(tr('ptSelectGroup', 'Class:')) + '</strong> ' + ctx.escHtml(gName) + '</div>' +
                          '<div><strong>' + ctx.escHtml(tr('ptWizStyleLabel', 'Grading Style:')) + '</strong> ' + ctx.escHtml(st.style.toUpperCase()) + '</div>' +
                          '<div><strong>' + ctx.escHtml(tr('ptWizMaxGradeLabel', 'Maximum Grade:')) + '</strong> ' + ctx.escHtml(st.maxGrade) + '</div>' +
                        '</div>';
                }
            }
        ],
        finishLabel: tr('ptWizSaveBtn', 'Save Rules'),
        finishIcon: 'save.svg',
        onFinish: function (st) {
            rulesModalActiveGroup = st.groupId || null;
            populateRulesModalGroupSelect();
            const groupSel = document.getElementById('rulesModalGroupSelect');
            if (groupSel) groupSel.value = st.groupId || '';
            const maxEl = document.getElementById('rulesMaxGrade');
            if (maxEl) maxEl.value = st.maxGrade;
            const scaleEl = document.getElementById('rulesScaleToMax');
            if (scaleEl) scaleEl.checked = !!st.scaleToMax;

            const tbody = document.getElementById('rulesTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                const half = Math.round((st.maxGrade / 2) * 10) / 10;
                const quarter = Math.round((st.maxGrade / 4) * 10) / 10;
                if (st.style === 'balanced') {
                    addRuleRow('netPoints', 0, 1, 5, quarter, 12, half, '');
                    addRuleRow('attendanceRate', 50, 1, 75, quarter, 95, half, '');
                } else if (st.style === 'effort') {
                    addRuleRow('netPoints', 0, 2, 6, half, 15, st.maxGrade, '');
                } else {
                    addRuleRow('attendanceRate', 50, quarter, 80, half, 98, Math.round(st.maxGrade * 0.8 * 10) / 10, '');
                    addRuleRow('netPoints', 1, 0, 4, Math.round(st.maxGrade * 0.1 * 10) / 10, 10, Math.round(st.maxGrade * 0.2 * 10) / 10, '');
                }
            }
            if (typeof saveRulesConfig === 'function') saveRulesConfig();
            if (typeof updateProvisionalGradesPreview === 'function') updateProvisionalGradesPreview();
        }
    });
}

function openRulesModal(targetGroupId = null) {
    rulesModalActiveGroup = targetGroupId || currentGroupId || null;
    
    // Populate group select dropdown inside modal
    populateRulesModalGroupSelect();

    // Set modal title
    const titleEl = document.getElementById('rulesModalTitle');
    if (titleEl) {
        if (rulesModalActiveGroup) {
            const groupName = groupDisplayName(rulesModalActiveGroup);
            titleEl.textContent = `${t('ptRulesModalTitle')} - ${groupName}`;
        } else {
            titleEl.textContent = t('ptRulesModalTitle');
        }
    }

    // Load active group rules
    loadRulesForActiveGroup();

    // Sync dates to modal pickers
    const mainFrom = document.getElementById('dateFrom');
    const mainTo = document.getElementById('dateTo');
    document.getElementById('modalDateFrom').value = mainFrom ? mainFrom.value || '' : '';
    document.getElementById('modalDateTo').value = mainTo ? mainTo.value || '' : '';
    const mainActivePresetBtn = document.querySelector('.date-controls .date-preset-btn.active');
    const presetVal = mainActivePresetBtn ? mainActivePresetBtn.dataset.preset : 'all';
    updateModalPresetButtonClasses(presetVal);

    // Show modal
    document.getElementById('rulesModal').classList.add('active');
    updateProvisionalGradesPreview();
}

function closeRulesModal() {
    document.getElementById('rulesModal').classList.remove('active');
    rulesModalActiveGroup = null;
}

function onModalDateChange() {
    const fromVal = document.getElementById('modalDateFrom').value;
    const toVal = document.getElementById('modalDateTo').value;
    
    document.getElementById('dateFrom').value = fromVal;
    document.getElementById('dateTo').value = toVal;
    
    // Remove active classes on main presets
    document.querySelectorAll('.date-controls .date-preset-btn').forEach(btn => btn.classList.remove('active'));
    // Remove active classes on modal presets
    updateModalPresetButtonClasses(null);
    
    // Re-render main dashboard content so it matches
    if (currentGroupId && typeof updateDashboard === 'function') {
        updateDashboard();
    }
    
    updateProvisionalGradesPreview();
}

function setModalDatePreset(preset) {
    // If preset is semester and button not yet wired on main view, apply directly
    const mainBtn = document.querySelector(`.date-preset-btn[data-preset="${preset}"]`);
    if (mainBtn) {
        mainBtn.click();
    } else {
        applyDatePreset(preset);
        if (currentGroupId && typeof updateDashboard === 'function') {
            updateDashboard();
        }
    }
    
    // Copy the updated date values to the modal's date pickers
    document.getElementById('modalDateFrom').value = document.getElementById('dateFrom').value || '';
    document.getElementById('modalDateTo').value = document.getElementById('dateTo').value || '';
    
    // Update active classes on modal presets
    updateModalPresetButtonClasses(preset);
    
    // Refresh modal preview
    updateProvisionalGradesPreview();
}

function updateModalPresetButtonClasses(preset) {
    document.querySelectorAll('.btn-preset-modal-all, .btn-preset-modal-30, .btn-preset-modal-7, .btn-preset-modal-semester').forEach(btn => {
        btn.style.background = '#fff';
        btn.style.color = '#333';
        btn.style.borderColor = '#ccc';
    });
    if (preset === 'all') {
        const btn = document.querySelector('.btn-preset-modal-all');
        if (btn) { btn.style.background = '#111'; btn.style.color = '#fff'; btn.style.borderColor = '#111'; }
    } else if (preset === '30days') {
        const btn = document.querySelector('.btn-preset-modal-30');
        if (btn) { btn.style.background = '#111'; btn.style.color = '#fff'; btn.style.borderColor = '#111'; }
    } else if (preset === '7days') {
        const btn = document.querySelector('.btn-preset-modal-7');
        if (btn) { btn.style.background = '#111'; btn.style.color = '#fff'; btn.style.borderColor = '#111'; }
    } else if (preset === 'semester') {
        const btn = document.querySelector('.btn-preset-modal-semester');
        if (btn) { btn.style.background = '#111'; btn.style.color = '#fff'; btn.style.borderColor = '#111'; }
    }
}

function onRuleMetricChange(selectEl) {
    const row = selectEl.closest('tr');
    const metric = selectEl.value;
    const minCell = row.querySelector('.min-cell');
    const passCell = row.querySelector('.pass-cell');
    const maxCell = row.querySelector('.max-cell');
    const maxInputWrap = row.querySelector('.max-input-wrap');
    const formulaInputWrap = row.querySelector('.formula-input-wrap');
    const formulaInput = row.querySelector('.rule-formula-val');
    
    if (metric === 'formula') {
        minCell.style.display = 'none';
        passCell.style.display = 'none';
        maxCell.setAttribute('colspan', '3');
        maxInputWrap.classList.add('hidden');
        formulaInputWrap.classList.remove('hidden');
        formulaInput.focus();
    } else {
        minCell.style.display = '';
        passCell.style.display = '';
        maxCell.removeAttribute('colspan');
        maxInputWrap.classList.remove('hidden');
        formulaInputWrap.classList.add('hidden');
    }
    updateProvisionalGradesPreview();
}

function addRuleRow(metric = 'netPoints', minVal = 0, minPts = 1, passVal = 5, passPts = 3, maxVal = 10, maxPts = 5, formulaVal = '') {
    const tbody = document.getElementById('rulesTableBody');
    const row = document.createElement('tr');
    
    // Get all badge definitions to populate in dropdown
    const badgeDefs = getConfiguredBadgeDefinitions();
    const badgeOptions = badgeDefs.flatMap(b => {
        const optValTotal = `badge_icon:${b.icon}`;
        const optValSess = `badge_icon_session:${b.icon}`;
        const selTotal = (metric === optValTotal) ? 'selected' : '';
        const selSess = (metric === optValSess) ? 'selected' : '';
        const sign = b.tone === 'positive' ? '+' : b.tone === 'negative' ? '-' : '';
        const valText = `${b.tone}, ${sign}${b.coefficient}`;
        return [
            `<option value="${optValTotal}" ${selTotal}>${b.icon} ${b.label} (Total)</option>`,
            `<option value="${optValSess}" ${selSess}>${b.icon} ${b.label} / session</option>`
        ];
    }).join('');

    row.innerHTML = `
        <td>
            <select class="rule-metric" onchange="onRuleMetricChange(this)">
                <option value="netPoints" ${metric === 'netPoints' ? 'selected' : ''}>${t('ptStatsNetPoints')}</option>
                <option value="picks" ${metric === 'picks' ? 'selected' : ''}>${t('ptStatsTimesPicked')}</option>
                <option value="attendanceRate" ${metric === 'attendanceRate' ? 'selected' : ''}>${t('ptStatsSessionsRecorded')} (%)</option>
                <option value="positivePoints" ${metric === 'positivePoints' ? 'selected' : ''}>${t('ptStatPluses')}</option>
                <option value="badgePositive" ${metric === 'badgePositive' ? 'selected' : ''}>${t('ptStatsPosBadges')} (Total)</option>
                <option value="badgePositiveSession" ${metric === 'badgePositiveSession' ? 'selected' : ''}>${t('ptStatsPosBadges')} / session</option>
                <optgroup label="Other Columns">
                    <option value="sessions" ${metric === 'sessions' ? 'selected' : ''}>${t('ptColSess') || 'Sessions'}</option>
                    <option value="absent" ${metric === 'absent' ? 'selected' : ''}>${t('ptColAbs') || 'Absent'}</option>
                    <option value="pluses" ${metric === 'pluses' ? 'selected' : ''}>${t('ptColPluses') || 'Pluses'}</option>
                    <option value="minuses" ${metric === 'minuses' ? 'selected' : ''}>${t('ptColMinuses') || 'Minuses'}</option>
                    <option value="teamPluses" ${metric === 'teamPluses' ? 'selected' : ''}>${t('ptColT') || 'T+'}</option>
                    <option value="teamMinuses" ${metric === 'teamMinuses' ? 'selected' : ''}>${t('ptColTm') || 'T-'}</option>
                    <option value="badgeNegative" ${metric === 'badgeNegative' ? 'selected' : ''}>${t('ptColBadgeMinus') || 'Badge -'} (Total)</option>
                    <option value="badgeNegativeSession" ${metric === 'badgeNegativeSession' ? 'selected' : ''}>${t('ptColBadgeMinus') || 'Badge -'} / session</option>
                    <option value="teamRoleEvents" ${metric === 'teamRoleEvents' ? 'selected' : ''}>${t('ptColTeamRole') || 'Team/Role Events'}</option>
                    <option value="posRatio" ${metric === 'posRatio' ? 'selected' : ''}>${t('ptColPosRatio') || '+/s'}</option>
                    <option value="negRatio" ${metric === 'negRatio' ? 'selected' : ''}>${t('ptColNegRatio') || '-/s'}</option>
                    <option value="netRatio" ${metric === 'netRatio' ? 'selected' : ''}>${t('ptColNetRatio') || 'Net/s'}</option>
                    <option value="ratio" ${metric === 'ratio' ? 'selected' : ''}>${t('ptColGoodBad') || 'Good/Bad'}</option>
                    <option value="trend" ${metric === 'trend' ? 'selected' : ''}>${t('ptColTrend') || 'Trend'}</option>
                </optgroup>
                <optgroup label="Badges (Total & Per Session)">
                    ${badgeOptions}
                </optgroup>
                <option value="formula" ${metric === 'formula' ? 'selected' : ''}>Formula / Condition</option>
            </select>
        </td>
        <td class="min-cell">
            <div style="display:flex; gap:4px; align-items:center;">
                <input type="number" class="rule-min-val" value="${minVal}" oninput="updateProvisionalGradesPreview()" style="width: 45px;" placeholder="Val">
                <span>&rarr;</span>
                <input type="number" class="rule-min-pts" value="${minPts}" oninput="updateProvisionalGradesPreview()" style="width: 40px;" placeholder="Pts">
            </div>
        </td>
        <td class="pass-cell">
            <div style="display:flex; gap:4px; align-items:center;">
                <input type="number" class="rule-pass-val" value="${passVal}" oninput="updateProvisionalGradesPreview()" style="width: 45px;" placeholder="Val">
                <span>&rarr;</span>
                <input type="number" class="rule-pass-pts" value="${passPts}" oninput="updateProvisionalGradesPreview()" style="width: 40px;" placeholder="Pts">
            </div>
        </td>
        <td class="max-cell" colspan="1">
            <div style="display:flex; gap:4px; align-items:center;" class="max-input-wrap">
                <input type="number" class="rule-max-val" value="${maxVal}" oninput="updateProvisionalGradesPreview()" style="width: 45px;" placeholder="Val">
                <span>&rarr;</span>
                <input type="number" class="rule-max-pts" value="${maxPts}" oninput="updateProvisionalGradesPreview()" style="width: 40px;" placeholder="Pts">
            </div>
            <div class="formula-input-wrap hidden" style="display:flex; gap:4px; align-items:center; width:100%;">
                <input type="text" class="rule-formula-val" value="${formulaVal}" oninput="updateProvisionalGradesPreview()" style="flex:1;" placeholder="e.g. 💎 >= 2 and 👍 >= 5">
                <span>&rarr;</span>
                <input type="number" class="rule-formula-pts" value="${maxPts}" oninput="updateProvisionalGradesPreview()" style="width: 40px;" placeholder="Pts">
            </div>
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn-rules-delete" onclick="this.closest('tr').remove(); updateProvisionalGradesPreview();" title="Delete rule" aria-label="Delete rule"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button>
        </td>
    `;
    tbody.appendChild(row);
    
    // Adjust visual state if formula
    if (metric === 'formula') {
        row.querySelector('.min-cell').style.display = 'none';
        row.querySelector('.pass-cell').style.display = 'none';
        row.querySelector('.max-cell').setAttribute('colspan', '3');
        row.querySelector('.max-input-wrap').classList.add('hidden');
        row.querySelector('.formula-input-wrap').classList.remove('hidden');
    }
    
    updateProvisionalGradesPreview();
}

function getRulesFromModal() {
    const rules = [];
    const rows = document.querySelectorAll('#rulesTableBody tr');
    rows.forEach(row => {
        const metric = row.querySelector('.rule-metric').value;
        if (metric === 'formula') {
            const formulaVal = row.querySelector('.rule-formula-val').value;
            const maxPts = parseFloat(row.querySelector('.rule-formula-pts').value) || 0;
            rules.push({
                metric,
                formulaVal,
                minVal: 0, minPts: 0,
                passVal: 0, passPts: 0,
                maxVal: 0, maxPts,
                value: formulaVal,
                points: maxPts
            });
        } else {
            const minVal = parseFloat(row.querySelector('.rule-min-val').value) || 0;
            const minPts = parseFloat(row.querySelector('.rule-min-pts').value) || 0;
            const passVal = parseFloat(row.querySelector('.rule-pass-val').value) || 0;
            const passPts = parseFloat(row.querySelector('.rule-pass-pts').value) || 0;
            const maxVal = parseFloat(row.querySelector('.rule-max-val').value) || 0;
            const maxPts = parseFloat(row.querySelector('.rule-max-pts').value) || 0;
            rules.push({
                metric,
                minVal, minPts,
                passVal, passPts,
                maxVal, maxPts,
                value: maxVal,
                points: maxPts
            });
        }
    });
    return rules;
}

async function saveRulesConfig() {
    const rules = getRulesFromModal();
    const maxGrade = parseFloat(document.getElementById('rulesMaxGrade').value) || 20;
    const scaleToMax = document.getElementById('rulesScaleToMax').checked;

    window.CMS_PARTICIPATION_RULES = window.CMS_PARTICIPATION_RULES || {};
    
    const targetGroupId = rulesModalActiveGroup || currentGroupId;
    if (targetGroupId) {
        window.CMS_PARTICIPATION_RULES[targetGroupId] = {
            rules,
            maxGrade,
            scaleToMax
        };
    } else {
        window.CMS_PARTICIPATION_RULES['_default'] = {
            rules,
            maxGrade,
            scaleToMax
        };
    }

    if (ELECTRON_AVAILABLE && window.Desktop) {
        try {
            await Desktop.saveText('groupParticipation', 'pt-rules.js', 
                `window.CMS_PARTICIPATION_RULES = ${JSON.stringify(window.CMS_PARTICIPATION_RULES, null, 2)};\n`);
            showMessage(t('ptRulesSaved'), 'success');
        } catch (error) {
            showMessage('Error saving rules: ' + error.message, 'error');
        }
    } else {
        showMessage(t('ptRulesSaved') + ' (in-memory)', 'success');
    }

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const ptCh = new BroadcastChannel('cmt-participation');
            ptCh.postMessage({
                action: 'participation-rules-updated',
                groupId: targetGroupId || '_default',
                timestamp: Date.now()
            });
            ptCh.close();
        } catch (_) {}
    }

    closeRulesModal();
    if (currentGroupId && typeof updateDashboard === 'function') {
        updateDashboard(); // Redraw UI and table with new grades
    }
}

// ─── Save / Load Rules Presets Logic ───
window._ptSavedPresetsCache = {};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSavedRulesPresets() {
    // Primary source: in-memory array populated from pt-presets.js at boot
    if (Array.isArray(window.CMS_PARTICIPATION_PRESETS)) {
        return window.CMS_PARTICIPATION_PRESETS;
    }
    // Fallback: localStorage (browser mode or first boot before file loaded)
    try {
        const stored = localStorage.getItem('CMS_PARTICIPATION_RULES_PRESETS');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Error loading saved rules presets:', e);
    }
    return [];
}

async function saveRulesPresetsToStorage(presets) {
    // Keep in-memory cache in sync
    window.CMS_PARTICIPATION_PRESETS = presets;
    // Persist to file (Electron) or localStorage (browser fallback)
    if (ELECTRON_AVAILABLE && window.Desktop) {
        try {
            await Desktop.saveText('groupParticipation', 'pt-presets.js',
                `window.CMS_PARTICIPATION_PRESETS = ${JSON.stringify(presets, null, 2)};\n`);
        } catch (e) {
            console.error('Error saving rules presets to file:', e);
            // Fallback to localStorage on file error
            try { localStorage.setItem('CMS_PARTICIPATION_RULES_PRESETS', JSON.stringify(presets)); } catch (_) {}
        }
    } else {
        try {
            localStorage.setItem('CMS_PARTICIPATION_RULES_PRESETS', JSON.stringify(presets));
        } catch (e) {
            console.error('Error saving rules presets to localStorage:', e);
        }
    }
}

function confirmNewRules() {
    const modal = document.getElementById('confirmNewRulesModal');
    if (modal) modal.classList.add('active');
}

function closeConfirmNewRulesModal() {
    const modal = document.getElementById('confirmNewRulesModal');
    if (modal) modal.classList.remove('active');
}

function clearAndStartNewRules() {
    const tbody = document.getElementById('rulesTableBody');
    if (tbody) tbody.innerHTML = '';
    
    document.getElementById('rulesMaxGrade').value = 20;
    document.getElementById('rulesScaleToMax').checked = false;

    addRuleRow('netPoints', 0, 1, 5, 3, 10, 5, '');
    updateProvisionalGradesPreview();
    closeConfirmNewRulesModal();
    showMessage(t('ptRulesClearedMsg') || 'Rules cleared! You can now start afresh.', 'info');
}

function loadRulesConfig() {
    renderSavedRulesList();
    const modal = document.getElementById('savedRulesModal');
    if (modal) modal.classList.add('active');
}

function closeSavedRulesModal() {
    const modal = document.getElementById('savedRulesModal');
    if (modal) modal.classList.remove('active');
}

async function saveCurrentRulesAsPreset() {
    const nameInput = document.getElementById('presetNameInput');
    const name = (nameInput ? nameInput.value.trim() : '') || `Preset ${new Date().toLocaleDateString()}`;
    
    const rules = getRulesFromModal();
    const maxGrade = parseFloat(document.getElementById('rulesMaxGrade').value) || 20;
    const scaleToMax = document.getElementById('rulesScaleToMax').checked;

    if (!rules || rules.length === 0) {
        showMessage(t('ptNoRulesToSave') || 'No rules defined to save in preset', 'error');
        return;
    }

    const presets = getSavedRulesPresets();
    const newPreset = {
        id: 'preset_' + Date.now(),
        name: name,
        date: new Date().toISOString(),
        maxGrade: maxGrade,
        scaleToMax: scaleToMax,
        rules: rules
    };

    presets.push(newPreset);
    await saveRulesPresetsToStorage(presets);

    if (nameInput) nameInput.value = '';
    showMessage((t('ptPresetSavedMsg') || 'Saved preset:') + ' ' + name, 'success');
    renderSavedRulesList();
}

function applyRulesPreset(preset) {
    if (!preset || !preset.rules) return;

    document.getElementById('rulesMaxGrade').value = preset.maxGrade || 20;
    document.getElementById('rulesScaleToMax').checked = !!preset.scaleToMax;

    const tbody = document.getElementById('rulesTableBody');
    tbody.innerHTML = '';

    if (preset.rules.length > 0) {
        preset.rules.forEach(rule => {
            let minV = rule.minVal, minP = rule.minPts, passV = rule.passVal, passP = rule.passPts, maxV = rule.maxVal, maxP = rule.maxPts, formV = rule.formulaVal || '';
            if (minV === undefined) {
                if (rule.metric === 'formula') {
                    formV = rule.value;
                    minV = 0; minP = 0; passV = 0; passP = 0; maxV = 0; maxP = rule.points;
                } else if (rule.operator === '<=') {
                    minV = rule.value; minP = rule.points;
                    passV = 0; passP = rule.points;
                    maxV = 0; maxP = rule.points;
                } else {
                    minV = rule.value; minP = rule.points;
                    passV = rule.value; passP = rule.points;
                    maxV = rule.value; maxP = rule.points;
                }
            }
            addRuleRow(rule.metric, minV, minP, passV, passP, maxV, maxP, formV);
        });
    } else {
        addRuleRow('netPoints', 0, 1, 5, 3, 10, 5, '');
    }

    updateProvisionalGradesPreview();
    closeSavedRulesModal();
    showMessage((t('ptPresetLoadedMsg') || 'Loaded preset:') + ' ' + preset.name, 'success');
}

function applyRulesPresetById(id) {
    const preset = window._ptSavedPresetsCache[id];
    if (preset) {
        applyRulesPreset(preset);
    }
}

async function deleteRulesPreset(presetId) {
    let presets = getSavedRulesPresets();
    presets = presets.filter(p => p.id !== presetId);
    await saveRulesPresetsToStorage(presets);
    renderSavedRulesList();
    showMessage(t('ptPresetDeletedMsg') || 'Preset deleted', 'info');
}

async function deleteGroupRulesConfig(groupId) {
    if (!window.CMS_PARTICIPATION_RULES || !window.CMS_PARTICIPATION_RULES[groupId]) return;
    delete window.CMS_PARTICIPATION_RULES[groupId];
    if (ELECTRON_AVAILABLE && window.Desktop) {
        try {
            await Desktop.saveText('groupParticipation', 'pt-rules.js',
                `window.CMS_PARTICIPATION_RULES = ${JSON.stringify(window.CMS_PARTICIPATION_RULES, null, 2)};\n`);
        } catch (e) {
            console.error('Error saving rules after deletion:', e);
        }
    }
    renderSavedRulesList();
    showMessage(t('ptRulesClearedMsg') || 'Group rules deleted', 'info');
}

function renderSavedRulesList() {
    const listEl = document.getElementById('savedRulesList');
    if (!listEl) return;

    window._ptSavedPresetsCache = {};
    const presets = getSavedRulesPresets();
    
    // Also gather rules configured for other groups
    const groupConfigs = [];
    if (window.CMS_PARTICIPATION_RULES) {
        Object.keys(window.CMS_PARTICIPATION_RULES).forEach(gId => {
            const cfg = window.CMS_PARTICIPATION_RULES[gId];
            if (cfg && cfg.rules && cfg.rules.length > 0) {
                const gName = (typeof groupDisplayName === 'function') ? groupDisplayName(gId) : gId;
                groupConfigs.push({
                    id: 'group_' + gId,
                    isGroup: true,
                    groupId: gId,
                    name: `Group: ${gName}`,
                    maxGrade: cfg.maxGrade,
                    scaleToMax: cfg.scaleToMax,
                    rules: cfg.rules
                });
            }
        });
    }

    if (presets.length === 0 && groupConfigs.length === 0) {
        listEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #888; font-size: 0.85rem;" data-i18n="ptNoPresets">No saved presets or group rules found. Type a name above to save the current rules as a preset.</div>`;
        return;
    }

    let html = '';

    // User-created presets
    if (presets.length > 0) {
        html += `<div style="padding: 6px 12px; background: #f0f4ff; border-bottom: 1px solid #d0e0fc; font-weight: 700; font-size: 0.75rem; color: #1b4f9c; text-transform: uppercase; letter-spacing: 0.5px;" data-i18n="ptCustomPresetsHeader">Custom Presets</div>`;
        presets.forEach(p => {
            window._ptSavedPresetsCache[p.id] = p;
            const ruleCount = (p.rules || []).length;
            const dateStr = p.date ? new Date(p.date).toLocaleDateString() : '';
            const ruleSummary = (p.rules || []).map(r => r.metric).join(', ');

            html += `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #eee; transition:background 0.1s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='#fff'">
                    <div style="flex:1; min-width:0; padding-right:10px;">
                        <div style="font-weight:700; font-size:0.88rem; color:#111; display:flex; align-items:center; gap:6px;">
                            <span>${escapeHtml(p.name)}</span>
                            <span style="font-size:0.7rem; font-weight:600; background:#e2e8f0; color:#475569; padding:1px 6px; border-radius:3px;">${ruleCount} rules</span>
                            <span style="font-size:0.7rem; font-weight:600; background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:3px;">Max ${p.maxGrade || 20}</span>
                        </div>
                        <div style="font-size:0.75rem; color:#666; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${dateStr ? `<span style="color:#888;">${dateStr} &bull; </span>` : ''}Metrics: ${escapeHtml(ruleSummary)}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" onclick="applyRulesPresetById('${p.id}')" style="background:#111; color:#fff; border:1px solid #111; border-radius:4px; padding:4px 10px; font-size:0.75rem; font-weight:700; cursor:pointer;" data-i18n="ptBtnApply">Apply</button>
                        <button type="button" class="btn-rules-delete" onclick="deleteRulesPreset('${p.id}')" title="Delete preset" aria-label="Delete preset"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button>
                    </div>
                </div>
            `;
        });
    }

    // Configured group rules
    if (groupConfigs.length > 0) {
        html += `<div style="padding: 6px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; font-weight: 700; font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;" data-i18n="ptGroupRulesHeader">Existing Group Rules</div>`;
        groupConfigs.forEach(g => {
            window._ptSavedPresetsCache[g.id] = g;
            const ruleCount = (g.rules || []).length;
            const ruleSummary = (g.rules || []).map(r => r.metric).join(', ');

            html += `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #eee; transition:background 0.1s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='#fff'">
                    <div style="flex:1; min-width:0; padding-right:10px;">
                        <div style="font-weight:700; font-size:0.88rem; color:#111; display:flex; align-items:center; gap:6px;">
                            <span>${escapeHtml(g.name)}</span>
                            <span style="font-size:0.7rem; font-weight:600; background:#e2e8f0; color:#475569; padding:1px 6px; border-radius:3px;">${ruleCount} rules</span>
                            <span style="font-size:0.7rem; font-weight:600; background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:3px;">Max ${g.maxGrade || 20}</span>
                        </div>
                        <div style="font-size:0.75rem; color:#666; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            Metrics: ${escapeHtml(ruleSummary)}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" onclick="applyRulesPresetById('${g.id}')" style="background:#111; color:#fff; border:1px solid #111; border-radius:4px; padding:4px 10px; font-size:0.75rem; font-weight:700; cursor:pointer;" data-i18n="ptBtnApply">Apply</button>
                        <button type="button" class="btn-rules-delete" onclick="deleteGroupRulesConfig('${g.groupId}')" title="Delete group rules" aria-label="Delete group rules"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button>
                    </div>
                </div>
            `;
        });
    }

    listEl.innerHTML = html;
}

// ─── NEOBRUTALIST RULES EXPORT SYSTEM ───────────────────────────
function openExportRulesModal() {
    const rules = getRulesFromModal();
    if (!rules || rules.length === 0) {
        showMessage(t('ptRulesExportNoRules') || 'No rules configured to export. Please add at least one rule first.', 'error');
        return;
    }

    const maxGrade = parseFloat(document.getElementById('rulesMaxGrade')?.value) || 20;
    const scaleToMax = !!document.getElementById('rulesScaleToMax')?.checked;
    const targetGroup = rulesModalActiveGroup || currentGroupId;
    const rawGroupName = targetGroup
        ? ((typeof groupDisplayName === 'function') ? groupDisplayName(targetGroup) : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[targetGroup]) ? CLASS_GROUPS_META[targetGroup].name : targetGroup))
        : (t('ptAllGroups') || 'Default (All Groups)');

    const groupNameEl = document.getElementById('exportRulesGroupName');
    const maxGradeEl = document.getElementById('exportRulesMaxGrade');
    const scaleEl = document.getElementById('exportRulesScaleToMax');
    const countEl = document.getElementById('exportRulesCount');

    if (groupNameEl) groupNameEl.textContent = rawGroupName || 'Default (All Groups)';
    if (maxGradeEl) maxGradeEl.textContent = maxGrade;
    if (scaleEl) scaleEl.textContent = scaleToMax ? 'Yes' : 'No';
    if (countEl) countEl.textContent = `${rules.length} rule${rules.length === 1 ? '' : 's'}`;

    if (window.ExportStylesService) {
        const wrap = document.getElementById('pt-rules-style-selector-wrap');
        if (wrap) {
            ExportStylesService.renderSelector(wrap, {
                toolKey: 'participationTracker',
                className: 'pt-rules-export-style-select'
            });
        }
    }

    updateRulesExportHint();

    const modal = document.getElementById('rulesExportModal');
    if (modal) modal.classList.add('active');
}

function closeExportRulesModal() {
    const modal = document.getElementById('rulesExportModal');
    if (modal) modal.classList.remove('active');
}

function updateRulesExportHint() {
    const selectedFormat = document.querySelector('input[name="ptRulesExportFormat"]:checked')?.value || 'html';
    const hintEl = document.getElementById('rulesExportFormatHint');
    if (!hintEl) return;

    const hints = {
        html: '<img src="../assets/icons/file-text.svg" class="btn-icon" alt="" /> <strong>HTML (Interactive & Editable):</strong> Formatted standalone Neobrutalist HTML page with interactive table, editable fields, variables reference, and instant print / copy buttons.',
        pdf: '<img src="../assets/icons/printer.svg" class="btn-icon" alt="" /> <strong>PDF (Print Ready):</strong> Neobrutalist print-formatted document formatted for desktop printing or PDF export via Electron / system dialog.',
        md: '<img src="../assets/icons/document-editor.svg" class="btn-icon" alt="" /> <strong>Markdown (.md):</strong> Clean markdown file with structured tables and formula code blocks, ready for documentation, notes, or Document Editor.'
    };
    hintEl.innerHTML = hints[selectedFormat] || hints.html;
}

function getRuleMetricHumanLabel(metric) {
    const metricLabels = {
        netPoints: t('ptStatsNetPoints') || 'Net Points',
        picks: t('ptStatsTimesPicked') || 'Times Picked',
        attendanceRate: (t('ptStatsSessionsRecorded') || 'Attendance') + ' (%)',
        positivePoints: t('ptStatPluses') || 'Positive Points (+)',
        badgePositive: (t('ptStatsPosBadges') || 'Positive Badges') + ' (Total)',
        badgePositiveSession: (t('ptStatsPosBadges') || 'Positive Badges') + ' / session',
        sessions: t('ptColSess') || 'Sessions Recorded',
        absent: t('ptColAbs') || 'Absences',
        pluses: t('ptColPluses') || 'Pluses (+)',
        minuses: t('ptColMinuses') || 'Minuses (-)',
        teamPluses: t('ptColT') || 'Team Pluses (T+)',
        teamMinuses: t('ptColTm') || 'Team Minuses (T-)',
        badgeNegative: (t('ptColBadgeMinus') || 'Negative Badges') + ' (Total)',
        badgeNegativeSession: (t('ptColBadgeMinus') || 'Negative Badges') + ' / session',
        teamRoleEvents: t('ptColTeamRole') || 'Team/Role Events',
        posRatio: t('ptColPosRatio') || '+ / Session',
        negRatio: t('ptColNegRatio') || '- / Session',
        netRatio: t('ptColNetRatio') || 'Net / Session',
        ratio: t('ptColGoodBad') || 'Good / Bad Ratio',
        trend: t('ptColTrend') || 'Participation Trend',
        formula: 'Formula / Condition'
    };

    if (metricLabels[metric]) return metricLabels[metric];

    if (typeof metric === 'string') {
        if (metric.startsWith('badge_icon_session:')) {
            const icon = metric.replace('badge_icon_session:', '');
            const def = resolveBadgeDefinition(icon);
            return `${icon} ${def ? def.label : ''} / session`.trim();
        }
        if (metric.startsWith('badge_icon:')) {
            const icon = metric.replace('badge_icon:', '');
            const def = resolveBadgeDefinition(icon);
            return `${icon} ${def ? def.label : ''} (Total)`.trim();
        }
        if (metric.startsWith('badge_label_session:')) {
            const label = metric.replace('badge_label_session:', '');
            return `Badge ${label} / session`;
        }
        if (metric.startsWith('badge_label:')) {
            const label = metric.replace('badge_label:', '');
            return `Badge ${label} (Total)`;
        }
    }

    return String(metric || '');
}

function getRulesExportData() {
    const rules = getRulesFromModal();
    const maxGrade = parseFloat(document.getElementById('rulesMaxGrade')?.value) || 20;
    const scaleToMax = !!document.getElementById('rulesScaleToMax')?.checked;
    const targetGroup = rulesModalActiveGroup || currentGroupId;
    const rawGroupName = targetGroup
        ? ((typeof groupDisplayName === 'function') ? groupDisplayName(targetGroup) : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[targetGroup]) ? CLASS_GROUPS_META[targetGroup].name : targetGroup))
        : (t('ptAllGroups') || 'Default (All Groups)');
    const groupName = rawGroupName || 'Class';
    const safeGroupTag = groupName.trim().replace(/[\s\/\\:\*\?"<>\|]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'Rules';

    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
    ].join('-');
    const timeStamp = `${datePart}_${timePart}`;
    const filenameBase = `participation_rules_${safeGroupTag}_${timeStamp}`;
    const title = `Participation & Grading Rules — ${groupName}`;

    const formattedRules = rules.map((r, i) => {
        const index = i + 1;
        const metricName = getRuleMetricHumanLabel(r.metric);
        let minText = '—';
        let passText = '—';
        let maxText = '—';
        let points = 0;

        if (r.metric === 'formula') {
            minText = '—';
            passText = '—';
            maxText = r.formulaVal || r.value || '';
            points = r.maxPts || r.points || 0;
        } else {
            minText = `${r.minVal} → ${r.minPts} pts`;
            passText = `${r.passVal} → ${r.passPts} pts`;
            maxText = `${r.maxVal} → ${r.maxPts} pts`;
            points = Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
        }

        return {
            index,
            metric: r.metric,
            name: metricName,
            minText,
            passText,
            maxText,
            points,
            raw: r
        };
    });

    const totalPossiblePoints = formattedRules.reduce((sum, r) => sum + Number(r.points || 0), 0);

    return {
        title,
        groupName,
        targetGroup,
        maxGrade,
        scaleToMax,
        rules: formattedRules,
        totalPossiblePoints,
        dateGenerated: now.toLocaleString(),
        filenameBase
    };
}

async function executeExportRules() {
    const format = document.querySelector('input[name="ptRulesExportFormat"]:checked')?.value || 'html';
    const rulesData = getRulesExportData();

    if (!rulesData || !rulesData.rules || rulesData.rules.length === 0) {
        showMessage(typeof t === 'function' ? (t('ptRulesExportNoRules') || 'No rules configured to export.') : 'No rules configured to export.', 'error');
        return;
    }

    closeExportRulesModal();

    if (format === 'html') {
        await exportRulesAsHtml(rulesData);
    } else if (format === 'pdf') {
        await exportRulesAsPdf(rulesData);
    } else if (format === 'md') {
        exportRulesAsMd(rulesData);
    }
}

function generateRulesPrintableHtml(data) {
    const pdfSettings = getPdfExportSettings();

    const rulesRowsHtml = data.rules.map(r => {
        const isFormula = r.metric === 'formula';
        const conditionDisplay = isFormula
            ? `<code style="background:#f0f0eb; border:1px solid #d0d0c8; border-radius:4px; padding:2px 6px; font-weight:700; color:#222222;">${escHtml(r.maxText)}</code> &rarr; <strong>${escHtml(String(r.points))} pts</strong>`
            : escHtml(r.maxText);

        return `<tr>
            <td style="font-weight:800; text-align:center;">${r.index}</td>
            <td style="font-weight:700;">${escHtml(r.name)}</td>
            <td>${escHtml(r.minText)}</td>
            <td>${escHtml(r.passText)}</td>
            <td>${conditionDisplay}</td>
            <td style="font-weight:800; text-align:center; background:#fafaf7;">${escHtml(String(r.points))} pts</td>
        </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escHtml(data.title)}</title>
    <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; }
body { font-family: var(--exp-font-family, 'Lexend', system-ui, -apple-system, sans-serif); font-size: var(--exp-font-size-base, 12px); color: var(--exp-text-color, #222222); background: var(--exp-bg-page, #ffffff); line-height: var(--exp-line-height, 1.4); }
h1 { font-size: 18px; font-weight: 900; color: var(--exp-text-color, #222222); border-bottom: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.meta-box { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 11px; color: var(--exp-text-color, #222222); background: var(--exp-bg-surface, #fafaf7); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: var(--exp-radius-card, 6px); padding: 10px 14px; margin-bottom: 14px; box-shadow: var(--exp-shadow, 3px 3px 0 #555555); }
.meta-item { display: flex; gap: 6px; align-items: center; }
.meta-label { font-weight: 800; color: var(--exp-text-color, #222222); text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
.meta-val { font-weight: 700; color: var(--exp-text-color, #222222); background: var(--exp-bg-page, #ffffff); border: 1.5px solid var(--exp-border-color, #333333); padding: 1px 6px; border-radius: 4px; }
table { width: 100%; max-width: 100%; border-collapse: collapse; border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); margin-top: 6px; background: var(--exp-bg-page, #ffffff); page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
th, td { border: 1.5px solid var(--exp-border-color, #333333); padding: 7px 10px; vertical-align: middle; word-break: break-word; }
th { background: var(--exp-table-th-bg, #f5f5f0); font-weight: 900; color: var(--exp-text-color, #222222); text-align: left; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.03em; }
td { font-size: 11px; color: var(--exp-text-color, #222222); }
tr:nth-child(even) td { background: var(--exp-table-row-even, #fafaf7); }
.notes-card { background: var(--exp-bg-surface, #fafaf7); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: var(--exp-radius-card, 6px); padding: 12px 14px; margin-top: 16px; box-shadow: var(--exp-shadow, 3px 3px 0 #555555); font-size: 11px; line-height: 1.5; color: var(--exp-text-color, #222222); }
.notes-card h3 { font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; color: var(--exp-text-color, #222222); border-bottom: 1.5px solid var(--exp-border-color, #333333); padding-bottom: 3px; }
@page { size: ${pdfSettings.pageSize} ${pdfSettings.orientation}; margin: ${pdfSettings.margin}; }
@media print {
    body { margin: 0; padding: 0; }
    .meta-box, .notes-card { box-shadow: none !important; }
    table { max-width: 100% !important; width: 100% !important; }
}
    </style>
</head>
<body>
    <h1>${escHtml(data.title)}</h1>
    <div class="meta-box">
<div class="meta-item"><span class="meta-label">Class / Group:</span> <span class="meta-val">${escHtml(data.groupName)}</span></div>
<div class="meta-item"><span class="meta-label">Max Grade:</span> <span class="meta-val">${escHtml(String(data.maxGrade))}</span></div>
<div class="meta-item"><span class="meta-label">Scale to Max:</span> <span class="meta-val">${data.scaleToMax ? 'Yes' : 'No'}</span></div>
<div class="meta-item"><span class="meta-label">Total Possible Points:</span> <span class="meta-val">${escHtml(String(data.totalPossiblePoints))} pts</span></div>
<div class="meta-item"><span class="meta-label">Generated:</span> <span class="meta-val">${escHtml(data.dateGenerated)}</span></div>
    </div>

    <table>
<thead>
    <tr>
        <th style="width:36px; text-align:center;">#</th>
        <th>Objective / Metric</th>
        <th>Min Threshold</th>
        <th>Pass Threshold</th>
        <th>Max / Formula Condition</th>
        <th style="width:80px; text-align:center;">Max Pts</th>
    </tr>
</thead>
<tbody>
    ${rulesRowsHtml}
</tbody>
    </table>

    <div class="notes-card">
<h3>Grading Calculation & Rules Reference</h3>
<p><strong>Provisional Grade Formula:</strong> ${data.scaleToMax ? `<code>Final Grade = (Sum of Rule Points / ${data.totalPossiblePoints}) × ${data.maxGrade}</code> (scaled to max grade)` : `<code>Final Grade = Sum of Rule Points</code>`}</p>
<p style="margin-top:4px;"><strong>Formula Variables:</strong> <code>netPoints</code>, <code>picks</code>, <code>attendanceRate</code>, <code>posRatio</code>, <code>negRatio</code>, <code>netRatio</code>, <code>trend</code>, badge icons, logical operators (<code>and</code>, <code>or</code>, <code>not</code>), and functions (<code>if(cond, trueVal, falseVal)</code>).</p>
    </div>
</body>
</html>`;
}

function generateRulesMarkdown(data) {
    let md = `# ${data.title}\n\n`;
    md += `> **Class / Group:** ${data.groupName}  \n`;
    md += `> **Max Grade:** ${data.maxGrade}  \n`;
    md += `> **Scale to Max:** ${data.scaleToMax ? 'Yes' : 'No'}  \n`;
    md += `> **Total Possible Rule Points:** ${data.totalPossiblePoints} pts  \n`;
    md += `> **Generated:** ${data.dateGenerated}  \n\n`;
    md += `---\n\n`;
    md += `## Configured Rules & Objectives\n\n`;
    md += `| # | Objective / Metric | Min (Val → Pts) | Pass (Val → Pts) | Max / Formula (Val → Pts) | Max Pts |\n`;
    md += `|---|---|---|---|---|---|\n`;

    data.rules.forEach(r => {
        const isFormula = r.metric === 'formula';
        const condText = isFormula ? `\`${r.maxText}\` → ${r.points} pts` : r.maxText;
        md += `| ${r.index} | ${r.name} | ${r.minText} | ${r.passText} | ${condText} | ${r.points} pts |\n`;
    });

    md += `\n---\n\n`;
    md += `## Grading Calculation Notes\n\n`;
    if (data.scaleToMax) {
        md += `- **Scale to Max Grade:** Yes\n`;
        md += `- **Formula:** \`Final Grade = (Sum of Rule Points / ${data.totalPossiblePoints}) * ${data.maxGrade}\`\n\n`;
    } else {
        md += `- **Scale to Max Grade:** No\n`;
        md += `- **Formula:** \`Final Grade = Sum of Rule Points\`\n\n`;
    }

    md += `### Formula Variables Reference\n`;
    md += `- \`netPoints\`: Total net points ((Pluses + T+ + Badges+) - (Minuses + T- + Badges-))\n`;
    md += `- \`picks\`: Total times picked / called upon\n`;
    md += `- \`attendanceRate\`: Percentage of sessions attended (0 - 100)\n`;
    md += `- \`posRatio\`, \`negRatio\`, \`netRatio\`: Rates per attended session\n`;
    md += `- \`trend\`: +1 (improving), -1 (declining), 0 (stable)\n`;
    md += `- Badge counts by icon or name (e.g. \`💎 >= 2\`, \`👍 >= 3\`, \`[Good Job] >= 1\`)\n`;
    md += `- Functions & logic: \`if(condition, trueVal, falseVal)\`, \`and\`, \`or\`, \`not\`\n`;

    return md;
}

async function exportRulesAsHtml(data) {
    const rulesRowsHtml = data.rules.map(r => {
        const isFormula = r.metric === 'formula';
        const conditionDisplay = isFormula
            ? `<code style="background:#f0f0eb; border:1px solid #d0d0c8; border-radius:4px; padding:2px 6px; font-weight:700; color:#222222;" contenteditable="true">${escHtml(r.maxText)}</code> &rarr; <span contenteditable="true" style="font-weight:700;">${escHtml(String(r.points))} pts</span>`
            : `<span contenteditable="true">${escHtml(r.maxText)}</span>`;

        return `<tr>
            <td contenteditable="true" style="font-weight:800; text-align:center;">${r.index}</td>
            <td contenteditable="true" style="font-weight:700;">${escHtml(r.name)}</td>
            <td contenteditable="true">${escHtml(r.minText)}</td>
            <td contenteditable="true">${escHtml(r.passText)}</td>
            <td>${conditionDisplay}</td>
            <td contenteditable="true" style="font-weight:800; text-align:center; background:var(--exp-table-row-even, #fafaf7);">${escHtml(String(r.points))} pts</td>
        </tr>`;
    }).join('\n');

    const mdString = generateRulesMarkdown(data);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(data.title)}</title>
    <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--exp-font-family, 'Lexend', system-ui, -apple-system, sans-serif); font-size: var(--exp-font-size-base, 13px); color: var(--exp-text-color, #222222); background: var(--exp-bg-page, #f5f5f0); padding: 24px; line-height: var(--exp-line-height, 1.5); }
.report-card { max-width: 960px; margin: 0 auto; background: var(--exp-bg-surface, #ffffff); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: var(--exp-radius-card, 10px); box-shadow: var(--exp-shadow, 4px 4px 0 #555555); padding: 24px 28px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-bottom: 20px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-family: inherit; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: 6px; cursor: pointer; background: var(--exp-bg-surface, #ffffff); color: var(--exp-text-color, #222222); box-shadow: var(--exp-shadow, 3px 3px 0 #555555); transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease; }
.btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #555555; background: #fdfdfd; }
.btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #888888; }
.btn-primary { background: var(--exp-text-color, #222222); color: var(--exp-bg-surface, #ffffff); }
.btn-primary:hover { background: #333333; color: #ffffff; }
h1 { font-size: 22px; font-weight: 900; color: var(--exp-text-color, #222222); border-bottom: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
.meta-box { display: flex; flex-wrap: wrap; gap: 10px 20px; font-size: 12px; color: var(--exp-text-color, #222222); background: var(--exp-bg-surface, #fafaf7); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; box-shadow: var(--exp-shadow, 3px 3px 0 #555555); align-items: center; }
.meta-item { display: flex; gap: 6px; align-items: center; }
.meta-label { font-weight: 800; color: var(--exp-text-color, #222222); text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.04em; }
.meta-val { font-weight: 700; color: var(--exp-text-color, #222222); background: var(--exp-bg-surface, #ffffff); border: 1.5px solid var(--exp-border-color, #333333); padding: 2px 8px; border-radius: 4px; }
.table-wrap { overflow-x: auto; border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: 6px; margin-bottom: 20px; box-shadow: var(--exp-shadow, 3px 3px 0 #555555); background: var(--exp-bg-surface, #ffffff); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { border: 1.5px solid var(--exp-border-color, #333333); padding: 10px 12px; vertical-align: middle; }
th { background: var(--exp-table-th-bg, #f5f5f0); font-weight: 900; color: var(--exp-text-color, #222222); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
td { font-size: 12px; color: var(--exp-text-color, #222222); }
tr:nth-child(even) td { background: var(--exp-table-row-even, #fafaf7); }
td[contenteditable="true"]:hover { background: #fffbe6 !important; outline: 1.5px dashed #e2c96e; }
td[contenteditable="true"]:focus { background: #fffbe6 !important; outline: 2px solid var(--exp-border-color, #333333); }
.guide-card { background: var(--exp-bg-surface, #fafaf7); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: 6px; padding: 16px; box-shadow: var(--exp-shadow, 3px 3px 0 #555555); margin-top: 10px; font-size: 12px; color: var(--exp-text-color, #222222); }
.guide-card h3 { font-size: 13px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; color: var(--exp-text-color, #222222); border-bottom: 1.5px solid var(--exp-border-color, #333333); padding-bottom: 4px; }
.guide-card p { margin-bottom: 6px; line-height: 1.5; color: var(--exp-text-color, #222222); }
code { background: #f0f0eb; border: 1px solid #d0d0c8; border-radius: 4px; padding: 2px 6px; font-family: monospace; font-size: 11.5px; color: #222222; }
.btn-icon { width: 14px; height: 14px; display: inline-block; vertical-align: middle; }
@media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none !important; }
    .report-card { border: none !important; box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
    .meta-box, .table-wrap, .guide-card { box-shadow: none !important; }
}
    </style>
</head>
<body>
    <div class="report-card">
<div class="toolbar">
    <button class="btn btn-primary" onclick="window.print()"><img src="../assets/icons/printer.svg" class="btn-icon" alt="" /> Print / PDF</button>
    <button class="btn" onclick="saveEditedHtml()"><img src="../assets/icons/save.svg" class="btn-icon" alt="" /> Save HTML Copy</button>
    <button class="btn" onclick="copyMarkdown()"><img src="../assets/icons/copy.svg" class="btn-icon" alt="" /> Copy Markdown</button>
</div>

<h1>${escHtml(data.title)}</h1>

<div class="meta-box">
    <div class="meta-item"><span class="meta-label">Class / Group:</span> <span class="meta-val" contenteditable="true">${escHtml(data.groupName)}</span></div>
    <div class="meta-item"><span class="meta-label">Max Grade:</span> <span class="meta-val" contenteditable="true">${escHtml(String(data.maxGrade))}</span></div>
    <div class="meta-item"><span class="meta-label">Scale to Max:</span> <span class="meta-val" contenteditable="true">${data.scaleToMax ? 'Yes' : 'No'}</span></div>
    <div class="meta-item"><span class="meta-label">Total Possible Points:</span> <span class="meta-val">${escHtml(String(data.totalPossiblePoints))} pts</span></div>
    <div class="meta-item"><span class="meta-label">Generated:</span> <span class="meta-val">${escHtml(data.dateGenerated)}</span></div>
</div>

<div class="table-wrap">
    <table id="rulesReportTable">
        <thead>
            <tr>
                <th style="width:40px; text-align:center;">#</th>
                <th>Objective / Metric</th>
                <th>Min Threshold</th>
                <th>Pass Threshold</th>
                <th>Max / Formula Condition</th>
                <th style="width:90px; text-align:center;">Max Pts</th>
            </tr>
        </thead>
        <tbody>
            ${rulesRowsHtml}
        </tbody>
    </table>
</div>

<div class="guide-card">
    <h3>Grading Calculation & Cheatsheet Reference</h3>
    <p><strong>Grading Calculation:</strong> ${data.scaleToMax ? `<code>Final Grade = (Sum of Achieved Rule Points / ${data.totalPossiblePoints}) × ${data.maxGrade}</code>` : `<code>Final Grade = Sum of Achieved Rule Points</code>`}</p>
    <p><strong>Formula Variables Reference:</strong> <code>netPoints</code>, <code>picks</code>, <code>attendanceRate</code>, <code>posRatio</code>, <code>negRatio</code>, <code>netRatio</code>, <code>trend</code>, badge icons, logical connectors (<code>and</code>, <code>or</code>, <code>not</code>), and functions (<code>if(condition, trueVal, falseVal)</code>).</p>
</div>
    </div>

    ${'<script>'}
function saveEditedHtml() {
    var docType = '<!DOCTYPE html>\\n';
    var html = docType + document.documentElement.outerHTML;
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '${data.filenameBase}_edited.html';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function copyMarkdown() {
    var md = ${JSON.stringify(mdString)};
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).then(function() {
            if (typeof showToast === 'function') {
                showToast('Markdown copied to clipboard!');
            } else {
                alert('Markdown copied to clipboard!');
            }
        });
    } else {
        alert('Copying not supported by browser.');
    }
}
    ${'</' + 'script>'}
</body>
</html>`;

    let finalHtml = htmlContent;
    if (window.ExportStylesService) {
        const styleId = ExportStylesService.getSelectedStyle('participationTracker');
        finalHtml = await ExportStylesService.injectStyleIntoHtml(htmlContent, styleId, 'participationTracker');
    }
    downloadFile(`${data.filenameBase}.html`, finalHtml, 'text/html');
    showMessage(t('ptRulesExportSuccessHtml') || 'HTML rules document exported successfully!', 'success');
}

async function exportRulesAsPdf(data) {
    let html = generateRulesPrintableHtml(data);
    if (window.ExportStylesService) {
        const styleId = ExportStylesService.getSelectedStyle('participationTracker');
        html = await ExportStylesService.injectStyleIntoHtml(html, styleId, 'participationTracker');
    }
    const pdfSettings = getPdfExportSettings();
    const defaultName = `${data.filenameBase}.pdf`;

    if (window.Desktop && Desktop.isElectron() && typeof Desktop.printPdf === 'function') {
        try {
            const destination = await openPtPdfExportModal();
            if (!destination) return;

            const pdfReq = {
                html: html,
                landscape: pdfSettings.isLandscape,
                pdfOptions: { pageSize: pdfSettings.pageSize, landscape: pdfSettings.isLandscape }
            };
            const resolvedTarget = typeof window.cmtResolveExportTarget === 'function'
                ? window.cmtResolveExportTarget(destination)
                : (destination === 'to-print' ? 'toPrint' : null);
            if (resolvedTarget) {
                pdfReq.target = resolvedTarget;
                pdfReq.filename = defaultName;
            } else {
                pdfReq.defaultName = defaultName;
            }
            const result = await Desktop.printPdf(pdfReq);
            if (result && result.ok) {
                const msg = destination === 'to-print'
                    ? ((typeof t === 'function' ? t('deExportPdfToPrintSuccess') : 'PDF saved to Print folder: ') + (result.name || defaultName))
                    : ((typeof t === 'function' ? t('ptRulesExportSuccessPdf') : 'PDF rules document exported successfully!') || 'PDF rules document exported successfully!');
                if (window.showExportSuccessPopup && result.path) {
                    showExportSuccessPopup(result.path, result.name || defaultName);
                } else {
                    showMessage(msg, 'success');
                }
            } else if (result && !result.ok && !result.canceled) {
                showMessage('PDF export error: ' + (result?.error || 'failed'), 'error');
            }
        } catch (err) {
            showMessage('PDF export error: ' + (err?.message || String(err)), 'error');
        }
    } else {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => iframe.remove(), 1000);
        }, 300);
    }
}

function exportRulesAsMd(data) {
    const md = generateRulesMarkdown(data);
    downloadFile(`${data.filenameBase}.md`, md, 'text/markdown');
    showMessage(t('ptRulesExportSuccessMd') || 'Markdown rules document exported successfully!', 'success');
}

function getStudentBadgeCounts(badges) {
    const counts = {};
    (badges || []).forEach(badge => {
        const resolved = resolveBadgeData(badge);
        if (resolved.icon) {
            counts[resolved.icon] = (counts[resolved.icon] || 0) + 1;
        }
        if (resolved.label) {
            const normalized = resolved.label.toLowerCase().replace(/[^a-z0-9]/g, '');
            counts[normalized] = (counts[normalized] || 0) + 1;
        }
    });
    return counts;
}

function tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
        const char = str[i];
        if (/\s/.test(char)) {
            i++;
            continue;
        }
        
        // Brackets [...] for variables/badges
        if (char === '[') {
            let start = i + 1;
            let end = str.indexOf(']', start);
            if (end === -1) throw new Error('Unterminated bracket in formula');
            tokens.push({ type: 'IDENTIFIER', value: str.substring(start, end) });
            i = end + 1;
            continue;
        }
        
        // Quoted strings
        if (char === '"' || char === "'") {
            let quote = char;
            let start = i + 1;
            let end = str.indexOf(quote, start);
            if (end === -1) throw new Error('Unterminated string literal');
            tokens.push({ type: 'STRING', value: str.substring(start, end) });
            i = end + 1;
            continue;
        }
        
        // Numbers
        if (/\d/.test(char) || (char === '.' && /\d/.test(str[i+1]))) {
            let numStr = '';
            while (i < str.length && (/\d/.test(str[i]) || str[i] === '.')) {
                numStr += str[i];
                i++;
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
            continue;
        }
        
        // Two-character operators
        if (i + 1 < str.length) {
            const two = str.substr(i, 2);
            if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
                tokens.push({ type: 'OPERATOR', value: two });
                i += 2;
                continue;
            }
        }
        
        // One-character operators & punctuation
        if ('+-*/(),><=!'.includes(char)) {
            tokens.push({ type: 'OPERATOR', value: char });
            i++;
            continue;
        }
        
        // Identifiers (including emojis like 💎, 👍 etc.)
        let identStr = '';
        while (i < str.length && (!/\s/.test(str[i]) && !'+-*/(),><=![]"\''.includes(str[i]))) {
            identStr += str[i];
            i++;
        }
        
        if (identStr) {
            const upper = identStr.toUpperCase();
            if (upper === 'AND') {
                tokens.push({ type: 'OPERATOR', value: '&&' });
            } else if (upper === 'OR') {
                tokens.push({ type: 'OPERATOR', value: '||' });
            } else if (upper === 'NOT') {
                tokens.push({ type: 'OPERATOR', value: '!' });
            } else if (upper === 'IF') {
                tokens.push({ type: 'KEYWORD', value: 'IF' });
            } else {
                tokens.push({ type: 'IDENTIFIER', value: identStr });
            }
            continue;
        }
        
        throw new Error(`Unexpected character: ${char}`);
    }
    return tokens;
}

function evaluateExpression(exprStr, context) {
    let tokens;
    try {
        tokens = tokenize(exprStr);
    } catch (e) {
        throw new Error(`Syntax Error: ${e.message}`);
    }
    
    let position = 0;
    
    function peek() {
        return tokens[position];
    }
    
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
        
        if (token.type === 'NUMBER') {
            consume();
            return token.value;
        }
        
        if (token.type === 'STRING') {
            consume();
            return token.value;
        }
        
        if (token.type === 'KEYWORD' && token.value === 'IF') {
            consume(); // IF
            consume('(');
            const cond = parseExpression();
            consume(',');
            const trueVal = parseExpression();
            consume(',');
            const falseVal = parseExpression();
            consume(')');
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
                if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName) {
                    return v;
                }
            }
            return 0; // Default to 0 if not found (e.g. badge that student doesn't have)
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
                val = token.value === '*' ? val * right : val / right;
            } else {
                break;
            }
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
                val = token.value === '+' ? val + right : val - right;
            } else {
                break;
            }
        }
        return val;
    }
    
    function parseComparison() {
        let val = parseAdditive();
        while (true) {
            const token = peek();
            if (token && token.type === 'OPERATOR' && (token.value === '>' || token.value === '<' || token.value === '>=' || token.value === '<=')) {
                consume();
                const right = parseAdditive();
                if (token.value === '>') val = val > right;
                else if (token.value === '<') val = val < right;
                else if (token.value === '>=') val = val >= right;
                else if (token.value === '<=') val = val <= right;
            } else {
                break;
            }
        }
        return val;
    }
    
    function parseEquality() {
        let val = parseComparison();
        while (true) {
            const token = peek();
            if (token && token.type === 'OPERATOR' && (token.value === '==' || token.value === '!=' || token.value === '=')) {
                consume();
                const right = parseComparison();
                if (token.value === '!=' || token.value === '!==') val = val != right;
                else val = val == right;
            } else {
                break;
            }
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
            } else {
                break;
            }
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
            } else {
                break;
            }
        }
        return val;
    }
    
    function parseExpression() {
        return parseLogicalOr();
    }
    
    const result = parseExpression();
    if (position < tokens.length) {
        throw new Error(`Extra characters at end of formula: ${tokens[position].value}`);
    }
    return result;
}

function calculateCriterionPoints(studentValue, rule) {
    const minVal = Number(rule.minVal) ?? 0;
    const minPts = Number(rule.minPts) ?? 0;
    const passVal = Number(rule.passVal) ?? 0;
    const passPts = Number(rule.passPts) ?? 0;
    const maxVal = Number(rule.maxVal) ?? 0;
    const maxPts = Number(rule.maxPts) ?? 0;

    const isInverse = minVal > maxVal;

    if (isInverse) {
        if (studentValue >= minVal) return minPts;
        if (studentValue <= maxVal) return maxPts;
        if (studentValue >= passVal) {
            if (minVal === passVal) return minPts;
            const ratio = (minVal - studentValue) / (minVal - passVal);
            return minPts + ratio * (passPts - minPts);
        } else {
            if (passVal === maxVal) return passPts;
            const ratio = (passVal - studentValue) / (passVal - maxVal);
            return passPts + ratio * (maxPts - passPts);
        }
    } else {
        if (studentValue <= minVal) return minPts;
        if (studentValue >= maxVal) return maxPts;
        if (studentValue <= passVal) {
            if (minVal === passVal) return minPts;
            const ratio = (studentValue - minVal) / (passVal - minVal);
            return minPts + ratio * (passPts - minPts);
        } else {
            if (passVal === maxVal) return passPts;
            const ratio = (studentValue - passVal) / (maxVal - passVal);
            return passPts + ratio * (maxPts - passPts);
        }
    }
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

function calculateStudentProvisionalGradeDetails(studentData, customRulesConfig = null) {
    const dataToUse = (studentData && studentData.overall) ? studentData.overall : studentData;
    if (!dataToUse) return null;
    const groupRulesConfig = customRulesConfig
        || (window.CMS_PARTICIPATION_RULES && (window.CMS_PARTICIPATION_RULES[currentGroupId] || window.CMS_PARTICIPATION_RULES['_default']))
        || null;
    if (!groupRulesConfig || !groupRulesConfig.rules || groupRulesConfig.rules.length === 0) {
        return null;
    }

    const dateRange = getDateRange();
    const totalSessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to).filter(s => !isExamSession(s, currentGroupId)).length;
    const sessionDenom = Math.max(1, totalSessions || dataToUse.sessions || 1);
    
    const picks = dataToUse.picks;
    const net = getClassOverviewNet(dataToUse);
    const attendanceRate = totalSessions > 0 ? (dataToUse.attendedSessions / totalSessions) * 100 : 0;
    const badgePositive = dataToUse.badgePositive;
    const positivePoints = dataToUse.pluses + dataToUse.teamPluses;
    const badgeCounts = getStudentBadgeCounts(dataToUse.badges);

    const badgeSessionCounts = {};
    Object.keys(badgeCounts).forEach(k => {
        const val = parseFloat((badgeCounts[k] / sessionDenom).toFixed(2));
        badgeSessionCounts[k + '_session'] = val;
        badgeSessionCounts[k + '_per_session'] = val;
    });

    const attendedSessions = dataToUse.attendedSessions || 0;
    const posRatio = attendedSessions ? (dataToUse.pluses + dataToUse.teamPluses + dataToUse.badgePositive) / attendedSessions : 0;
    const negRatio = attendedSessions ? (dataToUse.minuses + dataToUse.teamMinuses + dataToUse.badgeNegative) / attendedSessions : 0;
    const netRatio = attendedSessions ? net / attendedSessions : 0;
    const totalGood = dataToUse.pluses + dataToUse.teamPluses + dataToUse.badgePositive;
    const totalBad = dataToUse.minuses + dataToUse.teamMinuses + dataToUse.badgeNegative;
    const ratio = totalBad > 0 ? totalGood / totalBad : (totalGood > 0 ? 999 : 0);
    const trend = (dataToUse.sessionNets && typeof computeTrend !== 'undefined') ? (computeTrend(dataToUse.sessionNets) === 'up' ? 1 : computeTrend(dataToUse.sessionNets) === 'down' ? -1 : 0) : 0;

    let achievedPoints = 0;
    let totalPossiblePoints = 0;
    const ruleDetails = [];

    groupRulesConfig.rules.forEach((rule, idx) => {
        let studentValue = 0;
        let rulePoints = 0;
        let minPts = Number(rule.minPts) ?? 0;
        let passPts = Number(rule.passPts) ?? 0;
        let maxPts = Number(rule.maxPts) ?? 0;
        let effectiveMaxPts = rule.metric === 'formula' ? maxPts : Math.max(minPts, passPts, maxPts);
        let met = false;

        if (rule.metric === 'formula') {
            const context = {
                netPoints: net, net: net, picks: picks, attendanceRate: attendanceRate, attendance: attendanceRate,
                positivePoints: positivePoints, positive: positivePoints, pluses: dataToUse.pluses,
                minuses: dataToUse.minuses, teamPluses: dataToUse.teamPluses, teamMinuses: dataToUse.teamMinuses,
                badgePositive: badgePositive, badgeNegative: dataToUse.badgeNegative,
                badgePositiveSession: parseFloat((badgePositive / sessionDenom).toFixed(2)),
                badgeNegativeSession: parseFloat((dataToUse.badgeNegative / sessionDenom).toFixed(2)),
                sessions: dataToUse.sessions,
                absent: dataToUse.absent, posRatio: posRatio, negRatio: negRatio, netRatio: netRatio, ratio: ratio,
                trend: trend, teamRoleEvents: dataToUse.teamRoleEvents, ...badgeCounts, ...badgeSessionCounts
            };
            try {
                const formulaResult = evaluateExpression(rule.value || rule.formulaVal, context);
                if (typeof formulaResult === 'boolean') {
                    met = formulaResult;
                    rulePoints = met ? maxPts : 0;
                } else if (typeof formulaResult === 'number') {
                    met = formulaResult > 0;
                    rulePoints = formulaResult;
                } else {
                    met = !!formulaResult;
                    rulePoints = met ? maxPts : 0;
                }
            } catch (e) {
                met = false;
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
            else if (rule.metric === 'badgeNegative') studentValue = dataToUse.badgeNegative;
            else if (rule.metric === 'badgeNegativeSession') studentValue = parseFloat((dataToUse.badgeNegative / sessionDenom).toFixed(2));
            else if (rule.metric === 'pluses') studentValue = dataToUse.pluses;
            else if (rule.metric === 'minuses') studentValue = dataToUse.minuses;
            else if (rule.metric === 'teamPluses') studentValue = dataToUse.teamPluses;
            else if (rule.metric === 'teamMinuses') studentValue = dataToUse.teamMinuses;
            else if (rule.metric === 'absent') studentValue = dataToUse.absent;
            else if (rule.metric === 'sessions') studentValue = dataToUse.sessions;
            else if (rule.metric === 'posRatio') studentValue = posRatio;
            else if (rule.metric === 'negRatio') studentValue = negRatio;
            else if (rule.metric === 'netRatio') studentValue = netRatio;
            else if (rule.metric === 'ratio') studentValue = ratio;
            else if (rule.metric === 'trend') studentValue = trend;
            else if (rule.metric === 'teamRoleEvents') studentValue = dataToUse.teamRoleEvents;
            else if (rule.metric.startsWith('badge_icon_session:')) {
                const icon = rule.metric.replace('badge_icon_session:', '');
                studentValue = parseFloat(((badgeCounts[icon] || 0) / sessionDenom).toFixed(2));
            } else if (rule.metric.startsWith('badge_label_session:')) {
                const labelKey = rule.metric.replace('badge_label_session:', '').toLowerCase().replace(/[^a-z0-9]/g, '');
                studentValue = parseFloat(((badgeCounts[labelKey] || 0) / sessionDenom).toFixed(2));
            } else if (rule.metric.startsWith('badge_icon:')) {
                const icon = rule.metric.replace('badge_icon:', '');
                studentValue = badgeCounts[icon] || 0;
            } else if (rule.metric.startsWith('badge_label:')) {
                const labelKey = rule.metric.replace('badge_label:', '').toLowerCase().replace(/[^a-z0-9]/g, '');
                studentValue = badgeCounts[labelKey] || 0;
            }

            rulePoints = calculateCriterionPoints(studentValue, rule);
            achievedPoints += rulePoints;
            totalPossiblePoints += effectiveMaxPts;
        }

        let valueLabel = '';
        if (rule.metric === 'formula') {
            valueLabel = `Formula: ${rule.value || rule.formulaVal || ''}`;
        } else if (rule.metric === 'attendanceRate') {
            valueLabel = `${t('ptStatsSessionsRecorded') || 'Attendance'}: ${studentValue.toFixed(0)}%`;
        } else if (rule.metric === 'netPoints') {
            valueLabel = `${t('ptStatsNetPoints') || 'Net Points'}: ${studentValue}`;
        } else if (rule.metric === 'picks') {
            valueLabel = `${t('ptStatsTimesPicked') || 'Times Picked'}: ${studentValue}`;
        } else if (rule.metric === 'trend') {
            valueLabel = `${t('ptColTrend') || 'Trend'}: ${studentValue === 1 ? 'Up' : studentValue === -1 ? 'Down' : 'Flat'}`;
        } else if (rule.metric === 'posRatio') {
            valueLabel = `${t('ptColPosRatio') || '+/s'}: +${studentValue.toFixed(2)}`;
        } else if (rule.metric === 'negRatio') {
            valueLabel = `${t('ptColNegRatio') || '-/s'}: -${studentValue.toFixed(2)}`;
        } else if (rule.metric === 'netRatio') {
            valueLabel = `${t('ptColNetRatio') || 'Net/s'}: ${studentValue >= 0 ? '+' : ''}${studentValue.toFixed(2)}`;
        } else if (rule.metric === 'ratio') {
            valueLabel = `${t('ptColGoodBad') || 'Good/Bad'}: ${studentValue === 999 ? '∞' : studentValue.toFixed(2)}`;
        } else if (rule.metric === 'badgePositive') {
            valueLabel = `${t('ptStatsPosBadges') || 'Positive Badges'}: ${studentValue}`;
        } else if (rule.metric === 'badgeNegative') {
            valueLabel = `${t('ptColBadgeMinus') || 'Negative Badges'}: ${studentValue}`;
        } else if (rule.metric === 'badgePositiveSession') {
            valueLabel = `${t('ptStatsPosBadges') || 'Pos Badges'}/s: ${studentValue}`;
        } else if (rule.metric === 'badgeNegativeSession') {
            valueLabel = `${t('ptColBadgeMinus') || 'Neg Badges'}/s: ${studentValue}`;
        } else if (rule.metric === 'teamRoleEvents') {
            valueLabel = `${t('ptColTeamRole') || 'Team/Role Events'}: ${studentValue}`;
        } else {
            valueLabel = `${rule.metric}: ${studentValue}`;
        }

        ruleDetails.push({
            ruleIndex: idx,
            metric: rule.metric,
            name: getRuleLabel(rule, idx),
            studentValue: studentValue,
            valueLabel: valueLabel,
            minPts: minPts,
            passPts: passPts,
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

function calculateStudentProvisionalGrade(studentData, customRulesConfig = null) {
    const details = calculateStudentProvisionalGradeDetails(studentData, customRulesConfig);
    return details ? details.grade : null;
}

function updateProvisionalGradesPreview() {
    const rules = getRulesFromModal();
    const maxGrade = parseFloat(document.getElementById('rulesMaxGrade').value) || 20;
    const scaleToMax = document.getElementById('rulesScaleToMax').checked;

    const previewSection = document.getElementById('provisionalGradesPreviewSection');
    const textarea = document.getElementById('provisionalGradesTextarea');
    const tableHeader = document.getElementById('provisionalGradesTableHeader');
    const tableBody = document.getElementById('provisionalGradesTableBody');

    if (rules.length === 0) {
        if (previewSection) previewSection.classList.add('hidden');
        return;
    }

    const targetGroupId = rulesModalActiveGroup || currentGroupId;
    if (!targetGroupId || typeof filterSessionsByDateAndGroup !== 'function') {
        if (previewSection) previewSection.classList.add('hidden');
        return;
    }

    // Calculate grades for all students in active group
    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(targetGroupId, dateRange.from, dateRange.to);
    
    // Re-aggregate student map for calculation
    const studentMap = {};
    sessions.forEach(session => {
        (session.groups[targetGroupId] || []).filter(s => isStudentInCurrentHalfGroup(s.name)).forEach(student => {
            if (!studentMap[student.name]) {
                studentMap[student.name] = {
                    name: student.name,
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
                    badgeNegative: 0
                };
            }
            const s = studentMap[student.name];
            s.sessions++;
            if (!student.isAbsent) s.attendedSessions++;
            if (student.isPicked) s.picks++;
            if (student.isAbsent) s.absent++;
            s.pluses += student.pluses || 0;
            s.minuses += student.minuses || 0;
            s.teamPluses += student.teamPluses || 0;
            s.teamMinuses += student.teamMinuses || 0;
            const studentBadges = student.badges || [];
            const badgeSentiment = countBadgeSentiment(studentBadges);
            s.badges = s.badges.concat(studentBadges);
            s.badgePositive += badgeSentiment.positive;
            s.badgeNegative += badgeSentiment.negative;
        });
    });

    const students = Object.values(studentMap).sort((a, b) => a.name.localeCompare(b.name));
    
    if (students.length === 0) {
        previewSection.classList.add('hidden');
        return;
    }

    const groupRulesConfig = { rules, maxGrade, scaleToMax };
    const totalPossible = rules.reduce((sum, r) => {
        const effMax = r.metric === 'formula' ? Number(r.maxPts || 0) : Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
        return sum + effMax;
    }, 0);

    // Construct header info
    const ruleHeaders = rules.map((r, i) => {
        const label = getRuleLabel(r, i);
        const effMax = r.metric === 'formula' ? Number(r.maxPts || 0) : Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
        const maxP = scaleToMax && totalPossible > 0
            ? parseFloat(((effMax / totalPossible) * maxGrade).toFixed(2))
            : effMax;
        return { label, maxP };
    });

    const totalHeaderLabel = scaleToMax ? 'Total Grade' : 'Total Points';

    // Populate Table Header HTML
    let thHtml = `<th style="padding: 6px 10px; border: 1px solid #ccc; font-weight: 700; color: #111;">Student</th>`;
    thHtml += `<th style="padding: 6px 10px; border: 1px solid #ccc; font-weight: 700; color: #1b4f9c; background: #e0ecff;">${escapeHtml(totalHeaderLabel)}</th>`;
    ruleHeaders.forEach(rh => {
        thHtml += `<th style="padding: 6px 10px; border: 1px solid #ccc; font-weight: 600; color: #333;">${escapeHtml(rh.label)} <span style="font-size: 0.72rem; color: #666; font-weight: normal;">(max ${rh.maxP})</span></th>`;
    });
    if (tableHeader) tableHeader.innerHTML = thHtml;

    // Populate Table Body HTML & TSV Textarea content
    let trHtml = '';
    const tsvHeader = `Student\t${totalHeaderLabel}\t${ruleHeaders.map(rh => `${rh.label} [max ${rh.maxP}]`).join('\t')}`;
    const tsvLines = [];

    students.forEach((s, idx) => {
        const details = calculateStudentProvisionalGradeDetails(s, groupRulesConfig);
        const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        if (!details) {
            trHtml += `<tr style="background:${bg};"><td style="padding:5px 10px; border:1px solid #eee; font-weight:600;">${escapeHtml(s.name)}</td><td style="padding:5px 10px; border:1px solid #eee; font-weight:700; color:#111;">0</td>`;
            ruleHeaders.forEach(() => { trHtml += `<td style="padding:5px 10px; border:1px solid #eee; color:#888;">0</td>`; });
            trHtml += `</tr>`;
            tsvLines.push(`${s.name}\t0\t${ruleHeaders.map(() => '0').join('\t')}`);
        } else {
            const totalVal = scaleToMax ? details.grade : (details.totalPoints ?? details.grade);
            const gradeStr = formatSummaryNumber(totalVal);
            trHtml += `<tr style="background:${bg};"><td style="padding:5px 10px; border:1px solid #eee; font-weight:600;">${escapeHtml(s.name)}</td><td style="padding:5px 10px; border:1px solid #eee; font-weight:700; color:#1b4f9c; background:#f0f4ff;">${gradeStr}</td>`;
            
            const rulePts = details.rules.map(rd => {
                const ptsStr = formatSummaryNumber(rd.points);
                trHtml += `<td style="padding:5px 10px; border:1px solid #eee; color:#333;">${ptsStr}</td>`;
                return ptsStr;
            });
            trHtml += `</tr>`;
            tsvLines.push(`${s.name}\t${gradeStr}\t${rulePts.join('\t')}`);
        }
    });

    if (tableBody) tableBody.innerHTML = trHtml;
    if (textarea) textarea.value = [tsvHeader, ...tsvLines].join('\n');

    previewSection.classList.remove('hidden');
}

function copyProvisionalGrades() {
    const textarea = document.getElementById('provisionalGradesTextarea');
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(textarea.value);
    showMessage(t('ptGradesCopied'), 'success');
}

async function exportGradesToGradeSheet(autoLink = false) {
    const rules = getRulesFromModal();
    if (rules.length === 0) {
        showMessage('No rules configured to calculate grades.', 'error');
        return;
    }

    const targetGroupId = rulesModalActiveGroup || currentGroupId;
    if (!targetGroupId) {
        showMessage(t('ptMsgSelectGroup') || 'Please select a group first', 'error');
        return;
    }

    const maxGrade = parseFloat(document.getElementById('rulesMaxGrade').value) || 20;
    const scaleToMax = document.getElementById('rulesScaleToMax').checked;
    const groupRulesConfig = { rules, maxGrade, scaleToMax };

    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(targetGroupId, dateRange.from, dateRange.to);

    // Re-aggregate student map for calculation
    const studentMap = {};
    sessions.forEach(session => {
        (session.groups[targetGroupId] || []).filter(s => isStudentInCurrentHalfGroup(s.name)).forEach(student => {
            if (!studentMap[student.name]) {
                studentMap[student.name] = {
                    name: student.name,
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
                    badgeNegative: 0
                };
            }
            const s = studentMap[student.name];
            s.sessions++;
            if (!student.isAbsent) s.attendedSessions++;
            if (student.isPicked) s.picks++;
            if (student.isAbsent) s.absent++;
            s.pluses += student.pluses || 0;
            s.minuses += student.minuses || 0;
            s.teamPluses += student.teamPluses || 0;
            s.teamMinuses += student.teamMinuses || 0;
            const studentBadges = student.badges || [];
            const badgeSentiment = countBadgeSentiment(studentBadges);
            s.badges = s.badges.concat(studentBadges);
            s.badgePositive += badgeSentiment.positive;
            s.badgeNegative += badgeSentiment.negative;
        });
    });

    const students = Object.values(studentMap);
    if (students.length === 0) {
        showMessage('No student records found to export.', 'error');
        return;
    }

    // Build criteria definition array: [{ id, name, minPoints, maxPoints, bonus, pointCoefficient }]
    const totalPossible = rules.reduce((sum, r) => {
        const effMax = r.metric === 'formula' ? Number(r.maxPts || 0) : Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
        return sum + effMax;
    }, 0);
    const criteria = rules.map((r, i) => {
        const name = getRuleLabel(r, i);
        const effMax = r.metric === 'formula' ? Number(r.maxPts || 0) : Math.max(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
        const effMin = r.metric === 'formula' ? 0 : Math.min(Number(r.minPts || 0), Number(r.passPts || 0), Number(r.maxPts || 0));
        const maxPointsRaw = scaleToMax && totalPossible > 0
            ? ((effMax / totalPossible) * maxGrade)
            : effMax;
        const minPointsRaw = scaleToMax && totalPossible > 0
            ? ((effMin / totalPossible) * maxGrade)
            : effMin;
        const rawMax = Math.round(maxPointsRaw * 2) / 2;
        const rawMin = Math.round(minPointsRaw * 2) / 2;
        const minPoints = Math.min(rawMin, rawMax);
        const maxPoints = Math.max(rawMin, rawMax);
        return {
            id: `rule_crit_${i + 1}`,
            name: name,
            minPoints: minPoints,
            maxPoints: maxPoints,
            pointCoefficient: 1,
            bonus: false
        };
    });

    // Generate grades dictionary and per-student criteria scores
    const grades = {};
    const studentCriteriaScores = {};

    students.forEach(s => {
        const details = calculateStudentProvisionalGradeDetails(s, groupRulesConfig);
        if (details) {
            // Round grade to nearest 0.5
            const roundedGrade = Math.round(details.grade * 2) / 2;
            grades[s.name] = roundedGrade;
            studentCriteriaScores[s.name] = {};
            details.rules.forEach(rd => {
                const critId = `rule_crit_${rd.ruleIndex + 1}`;
                // Round per-criterion points to nearest 0.5
                const roundedPts = Math.round(rd.points * 2) / 2;
                studentCriteriaScores[s.name][critId] = {
                    points: roundedPts,
                    comment: ''
                };
            });
        }
    });

    const groupMeta = window.CLASS_GROUPS_META && window.CLASS_GROUPS_META[targetGroupId];
    const groupName = groupMeta ? groupMeta.name : targetGroupId;

    const _cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : {};
    const semNum = _cgd.activeSemester ? String(_cgd.activeSemester) : '1';
    const semester = (semNum === '2' || semNum === 'sem2') ? 'sem2' : 'sem1';

    const totalCritPts = criteria.reduce((sum, c) => sum + (!c.bonus && !c.isBonus ? (Number(c.maxPoints) || 0) : 0), 0);
    const ptManualThresholds = {};
    const ptManualPoints = {};
    for (let g = 0; g <= maxGrade + 0.0001; g = Math.round((g + 0.5) * 100) / 100) {
        const key = String(g);
        const ratio = maxGrade > 0 ? Math.max(0, Math.min(1, g / maxGrade)) : 0;
        ptManualThresholds[key] = Math.round(ratio * 1000) / 10;
        ptManualPoints[key] = Math.round(ratio * totalCritPts * 100) / 100;
    }

    const testConfig = {
        testName: (typeof t === 'function' ? t('ptParticipationTestName') : '') || 'Participation',
        testDate: dateRange.to || new Date().toISOString().split('T')[0],
        type: 'participation',
        source: 'participation-tracker',
        criteria: criteria,
        grading: {
            mode: 'manual',
            manualInputMode: 'points',
            maxGrade: maxGrade,
            minGrade: 0,
            interval: 0.5,
            manualThresholds: ptManualThresholds,
            manualPoints: ptManualPoints
        }
    };

    const dateFilterEl = document.getElementById('dateFilterMode');
    const ptDateMode = dateFilterEl ? dateFilterEl.value : 'semester';
    const resolvedDateMode = (ptDateMode === 'all') ? 'all' : ((ptDateMode === 'custom' || ptDateMode === 'last7' || ptDateMode === 'last30') ? 'custom' : 'semester');

    const importData = {
        class: groupName,
        className: groupName,
        groupId: targetGroupId,
        classGroupId: targetGroupId,
        classId: targetGroupId,
        semester: semester,
        test: 'next',
        testIndex: 'next',
        testConfig: testConfig,
        grades: grades,
        criteria: criteria,
        studentCriteriaScores: studentCriteriaScores,
        maxGrade: maxGrade,
        scaleToMax: scaleToMax,
        dateRange: dateRange.from && dateRange.to ? `${dateRange.from} to ${dateRange.to}` : (dateRange.from || dateRange.to || ''),
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        dateMode: resolvedDateMode,
        linkParticipation: !!autoLink,
        rulesConfig: groupRulesConfig
    };

    localStorage.setItem('CMS_PENDING_GRADE_IMPORT', JSON.stringify(importData));

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const gradesCh = new BroadcastChannel('cmt-grades');
            gradesCh.postMessage({
                action: 'pending-import-available'
            });
        } catch (e) {}
    }

    const navParams = {
        classId: targetGroupId,
        groupId: targetGroupId,
        className: groupName,
        semester: semester,
        test: 'next'
    };

    showMessage((typeof t === 'function' ? t('ptGradesPreparedNotice') : '') || 'Grades & rule criteria prepared! Opening Grade Sheet tool...', 'success');
    setTimeout(() => {
        openGradeSheetTool(navParams);
    }, 1000);
}

function openGradeSheetTool(navParams = null) {
    if (navParams) {
        try {
            localStorage.setItem('cmt-grade-sheet-nav', JSON.stringify(navParams));
            if (typeof BroadcastChannel !== 'undefined') {
                const navCh = new BroadcastChannel('cmt-gradesheet-nav');
                navCh.postMessage(navParams);
            }
        } catch (e) {}
    }
    if (window.Desktop && typeof Desktop.openTool === 'function') {
        Desktop.openTool('grade-sheet.html');
    } else {
        window.location.href = 'grade-sheet.html';
    }
}

let studentChartType = 'points';

function setStudentChartType(type) {
    studentChartType = type;
    document.getElementById('btnStudentTrendPoints').classList.toggle('active', type === 'points');
    document.getElementById('btnStudentTrendCumulative').classList.toggle('active', type === 'cumulative');
    
    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to).filter(s => !isExamSession(s, currentGroupId));
    renderStudentChart(sessions, currentStudentName);
}

function renderStudentChart(sessions, studentName) {
    const canvas = document.getElementById('studentTrendChart');
    if (!canvas || !studentName) return;
    if (!Array.isArray(sessions)) sessions = [];

    const ctx = canvas.getContext('2d');

    // Set canvas size dynamically
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Collect student metrics
    const studentMetrics = [];
    let cumulativeNet = 0;

    sessions.forEach(session => {
        const students = session.groups[currentGroupId] || [];
        const student = students.find(s => s.name === studentName);
        if (student) {
            const badgeSentiment = countBadgeSentiment(student.badges || []);
            const isAbsent = !!student.isAbsent;
            const pluses = isAbsent ? 0 : (student.pluses || 0);
            const minuses = isAbsent ? 0 : (student.minuses || 0);
            const teamPluses = isAbsent ? 0 : (student.teamPluses || 0);
            const teamMinuses = isAbsent ? 0 : (student.teamMinuses || 0);
            const badgePos = isAbsent ? 0 : badgeSentiment.positive;
            const badgeNeg = isAbsent ? 0 : badgeSentiment.negative;

            const picks = student.isPicked ? 1 : 0;
            const net = (pluses + teamPluses + badgePos) - (minuses + teamMinuses + badgeNeg);
            cumulativeNet += net;

            studentMetrics.push({
                date: session.id,
                picks: picks,
                posPoints: pluses + teamPluses + badgePos,
                negPoints: minuses + teamMinuses + badgeNeg,
                net: net,
                cumulativeNet: cumulativeNet,
                isAbsent: isAbsent
            });
        }
    });

    studentMetrics.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (studentMetrics.length === 0) {
        ctx.fillStyle = '#ccc';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data for selected period', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Chart dimensions
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    let maxValue, minValue, valRange;

    if (studentChartType === 'points') {
        maxValue = Math.max(...studentMetrics.map(m => Math.max(m.picks, m.posPoints, m.negPoints)), 1);
        minValue = 0;
        valRange = maxValue;
    } else {
        maxValue = Math.max(...studentMetrics.map(m => m.cumulativeNet), 0);
        minValue = Math.min(...studentMetrics.map(m => m.cumulativeNet), 0);
        valRange = Math.max(1, maxValue - minValue);
    }

    // Draw grid lines
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }

    // Draw zero line if negative values exist
    if (minValue < 0 && maxValue > 0) {
        const zeroY = canvas.height - padding - ((0 - minValue) / valRange) * chartHeight;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padding, zeroY);
        ctx.lineTo(canvas.width - padding, zeroY);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Draw data series
    if (studentChartType === 'points') {
        const colors = { picks: '#1f77b4', posPoints: '#2ca02c', negPoints: '#d62728' };
        const keys = ['picks', 'posPoints', 'negPoints'];

        keys.forEach(key => {
            ctx.strokeStyle = colors[key];
            ctx.lineWidth = 2;
            ctx.beginPath();

            studentMetrics.forEach((m, i) => {
                const x = padding + (chartWidth / (studentMetrics.length - 1 || 1)) * i;
                const y = canvas.height - padding - ((m[key] - minValue) / valRange) * chartHeight;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw dots
            ctx.fillStyle = colors[key];
            studentMetrics.forEach((m, i) => {
                const x = padding + (chartWidth / (studentMetrics.length - 1 || 1)) * i;
                const y = canvas.height - padding - ((m[key] - minValue) / valRange) * chartHeight;
                ctx.beginPath();
                ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
    } else {
        // Cumulative Net Score
        ctx.strokeStyle = '#6366f1'; // Indigo
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        studentMetrics.forEach((m, i) => {
            const x = padding + (chartWidth / (studentMetrics.length - 1 || 1)) * i;
            const y = canvas.height - padding - ((m.cumulativeNet - minValue) / valRange) * chartHeight;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw dots
        ctx.fillStyle = '#6366f1';
        studentMetrics.forEach((m, i) => {
            const x = padding + (chartWidth / (studentMetrics.length - 1 || 1)) * i;
            const y = canvas.height - padding - ((m.cumulativeNet - minValue) / valRange) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const val = minValue + (valRange / 4) * i;
        const y = canvas.height - padding - (chartHeight / 4) * i;
        ctx.fillText(formatSummaryNumber(val), padding - 8, y + 3);
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(studentMetrics.length / 8));
    studentMetrics.forEach((m, i) => {
        if (i % labelStep === 0) {
            const x = padding + (chartWidth / (studentMetrics.length - 1 || 1)) * i;
            const date = new Date(m.date);
            ctx.fillText(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, canvas.height - padding + 15);
        }
    });
}

// Close rules modal and export modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const rulesModal = document.getElementById('rulesModal');
    if (rulesModal) {
        rulesModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeRulesModal();
            }
        });
    }
    const rulesExportModal = document.getElementById('rulesExportModal');
    if (rulesExportModal) {
        rulesExportModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeExportRulesModal();
            }
        });
    }
    const ptPdfExportModal = document.getElementById('ptPdfExportModal');
    if (ptPdfExportModal) {
        ptPdfExportModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePtPdfExportModal(null);
            }
        });
    }
});

