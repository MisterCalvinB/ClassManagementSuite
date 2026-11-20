// Participation Tracker — Global Search, Group/Date Filters, Comparison & Class Overview
// ─── Global Student Search ───────────────────────────────────────────
let currentSearchHighlightIndex = -1;

function isGroupArchived(groupId) {
    const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[groupId] : null;
    return !!(meta && meta.archived);
}

function getAllGlobalStudents() {
    const studentMap = {};

    // 1. Collect students from DB_EXPORT sessions
    DB_EXPORT.forEach(session => {
        if (!session.groups) return;
        Object.keys(session.groups).forEach(groupId => {
            const groupStudents = session.groups[groupId] || [];
            const isArchived = isGroupArchived(groupId);
            groupStudents.forEach(student => {
                if (!student || !student.name) return;
                const key = `${student.name.toUpperCase()}|${groupId}`;
                if (!studentMap[key]) {
                    studentMap[key] = {
                        name: student.name,
                        groupId: groupId,
                        groupName: groupDisplayName(groupId),
                        isArchived: isArchived,
                        picks: 0,
                        pluses: 0,
                        minuses: 0,
                        teamPluses: 0,
                        teamMinuses: 0,
                        badgePositive: 0,
                        badgeNegative: 0,
                        sessionsCount: 0
                    };
                }
                const s = studentMap[key];
                s.sessionsCount++;
                if (student.isPicked) s.picks++;
                s.pluses += student.pluses || 0;
                s.minuses += student.minuses || 0;
                s.teamPluses += student.teamPluses || 0;
                s.teamMinuses += student.teamMinuses || 0;
                const badgeSentiment = countBadgeSentiment(student.badges || []);
                s.badgePositive += badgeSentiment.positive;
                s.badgeNegative += badgeSentiment.negative;
            });
        });
    });

    // 2. Roster fallback from STUDENTS_ROSTER
    if (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER)) {
        STUDENTS_ROSTER.forEach(s => {
            if (!s || (!s.firstName && !s.lastName)) return;
            const fullName = ((s.firstName || '') + ' ' + (s.lastName || '')).trim();
            const sEnrollments = Array.isArray(s.enrollments) ? s.enrollments : [];
            
            if (sEnrollments.length > 0) {
                sEnrollments.forEach(e => {
                    const gid = e.groupUuid || 'unassigned';
                    const isArchived = isGroupArchived(gid);
                    const key = `${fullName.toUpperCase()}|${gid}`;
                    if (!studentMap[key]) {
                        studentMap[key] = {
                            uuid: s.uuid,
                            name: fullName,
                            customName: s.customName || '',
                            groupId: gid,
                            groupName: e.groupName || groupDisplayName(gid),
                            isArchived: isArchived,
                            enrollments: sEnrollments,
                            picks: 0,
                            pluses: 0,
                            minuses: 0,
                            teamPluses: 0,
                            teamMinuses: 0,
                            badgePositive: 0,
                            badgeNegative: 0,
                            sessionsCount: 0
                        };
                    } else {
                        studentMap[key].uuid = s.uuid;
                        studentMap[key].customName = s.customName || '';
                        studentMap[key].enrollments = sEnrollments;
                    }
                });
            } else {
                const groupId = s.groupId || 'unassigned';
                const isArchived = isGroupArchived(groupId);
                const key = `${fullName.toUpperCase()}|${groupId}`;
                if (!studentMap[key]) {
                    studentMap[key] = {
                        uuid: s.uuid,
                        name: fullName,
                        customName: s.customName || '',
                        groupId: groupId,
                        groupName: groupDisplayName(groupId),
                        isArchived: isArchived,
                        enrollments: [],
                        picks: 0,
                        pluses: 0,
                        minuses: 0,
                        teamPluses: 0,
                        teamMinuses: 0,
                        badgePositive: 0,
                        badgeNegative: 0,
                        sessionsCount: 0
                    };
                } else {
                    studentMap[key].uuid = s.uuid;
                    studentMap[key].customName = s.customName || '';
                }
            }
        });
    }

    return Object.values(studentMap).map(s => {
        const net = getClassOverviewNet(s);
        return { ...s, net };
    });
}

function performStudentSearch(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    const all = getAllGlobalStudents();
    const filtered = all.filter(s => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const customMatch = s.customName ? s.customName.toLowerCase().includes(q) : false;
        const groupMatch = s.groupName.toLowerCase().includes(q);
        return nameMatch || customMatch || groupMatch;
    });

    filtered.sort((a, b) => {
        const aStart = a.name.toLowerCase().startsWith(q) || (a.customName && a.customName.toLowerCase().startsWith(q));
        const bStart = b.name.toLowerCase().startsWith(q) || (b.customName && b.customName.toLowerCase().startsWith(q));
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.name.localeCompare(b.name);
    });

    return filtered.slice(0, 25);
}

function renderSearchResultsDropdown(results) {
    const dropdown = document.getElementById('ptSearchResultsDropdown');
    if (!dropdown) return;

    currentSearchHighlightIndex = -1;

    if (results.length === 0) {
        dropdown.innerHTML = `<div class="pt-search-no-results">${escapeHtml(t('ptNoStudentsFound'))}</div>`;
        dropdown.classList.remove('hidden');
        return;
    }

    let html = `<div class="pt-search-header">${escapeHtml(t('ptSearchResultsHeader'))} (${results.length})</div>`;
    results.forEach((item, idx) => {
        const netColor = item.net >= 0 ? '#2ca02c' : '#d62728';
        const netSign = item.net >= 0 ? '+' : '';
        const groupBadge = item.isArchived
            ? `<span class="pt-search-item-group archived" style="background:#fff0f0; color:#c0392b; border:1px solid #ecc; opacity:0.9; font-weight:600;">📂 ${escapeHtml(item.groupName)} (${escapeHtml(t('rfArchivedLabel'))})</span>`
            : `<span class="pt-search-item-group">${escapeHtml(item.groupName)}</span>`;

        const enrollmentList = (item.enrollments && item.enrollments.length > 1)
            ? item.enrollments.map(e => `${e.groupName || e.groupUuid}`).join(', ')
            : '';
        const multiGroupBadge = enrollmentList
            ? `<div style="font-size:11px; color:#1e40af; margin-top:2px; font-weight:600;">📚 ${escapeHtml(enrollmentList)}</div>`
            : '';

        const formattedName = getPtStudentDisplayName(item.name);
        const customSubtitle = (item.customName && getPtNameDisplayMode() !== 'custom')
            ? ` <span style="font-size:11px;color:#666;font-weight:normal;">(${escapeHtml(item.customName)})</span>`
            : '';

        html += `
            <div class="pt-search-item" data-index="${idx}" data-student-name="${escapeHtml(item.name)}" data-group-id="${escapeHtml(item.groupId)}">
                <div class="pt-search-item-info">
                    <span class="pt-search-item-name">${escapeHtml(formattedName)}${customSubtitle}</span>
                    ${groupBadge}
                    ${multiGroupBadge}
                </div>
                <div class="pt-search-item-stats">
                    <span class="pt-search-item-stat" title="Picks">🎯 ${item.picks}</span>
                    <span class="pt-search-item-stat" style="color:${netColor}; font-weight:700;" title="Net Score">${netSign}${item.net}</span>
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');

    dropdown.querySelectorAll('.pt-search-item').forEach(el => {
        el.addEventListener('click', () => {
            const studentName = el.dataset.studentName;
            const groupId = el.dataset.groupId;
            selectStudentFromSearch(studentName, groupId);
        });
    });
}

function selectStudentFromSearch(studentName, groupId) {
    const dropdown = document.getElementById('ptSearchResultsDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (!groupId || groupId === 'unassigned') {
        showMessage(t('ptNoGroupForStudent') || (`Student "${studentName}" is not assigned to an active class group.`), 'info');
        return;
    }

    // If selected student belongs to an archived group and archived groups are hidden, reveal them first
    if (isGroupArchived(groupId) && !showArchivedGroups) {
        showArchivedGroups = true;
        const btn = document.getElementById('toggleArchivedBtn');
        if (btn) {
            btn.textContent = t('ptHideArchived');
            btn.style.color = '#c0392b';
        }
        populateGroups();
    }

    if (currentGroupId !== groupId) {
        selectGroup(groupId);
    }

    currentStudentName = studentName;

    document.querySelectorAll('#classOverviewTableBody tr').forEach(r => {
        if (r.dataset.studentName === studentName) {
            r.classList.add('selected-student');
        } else {
            r.classList.remove('selected-student');
        }
    });

    const studentDetailTitle = document.getElementById('studentDetailTitle');
    const studentDetailsArea = document.getElementById('studentDetailsArea');
    if (studentDetailTitle) studentDetailTitle.classList.remove('hidden');
    if (studentDetailsArea) studentDetailsArea.classList.remove('hidden');

    updateStudentDetails();

    if (studentDetailsArea) {
        studentDetailsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function setupStudentSearchListeners() {
    const input = document.getElementById('ptStudentSearchInput');
    const clearBtn = document.getElementById('ptStudentSearchClearBtn');
    const dropdown = document.getElementById('ptSearchResultsDropdown');
    if (!input) return;

    input.addEventListener('input', () => {
        const val = input.value;
        if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
        if (!val.trim()) {
            if (dropdown) dropdown.classList.add('hidden');
            return;
        }
        const results = performStudentSearch(val);
        renderSearchResultsDropdown(results);
    });

    input.addEventListener('focus', () => {
        if (input.value.trim()) {
            const results = performStudentSearch(input.value);
            renderSearchResultsDropdown(results);
        }
    });

    input.addEventListener('keydown', (e) => {
        if (!dropdown || dropdown.classList.contains('hidden')) return;
        const items = dropdown.querySelectorAll('.pt-search-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSearchHighlightIndex = Math.min(currentSearchHighlightIndex + 1, items.length - 1);
            updateSearchHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSearchHighlightIndex = Math.max(currentSearchHighlightIndex - 1, 0);
            updateSearchHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSearchHighlightIndex >= 0 && items[currentSearchHighlightIndex]) {
                items[currentSearchHighlightIndex].click();
            } else if (items.length > 0) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
            input.blur();
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            if (dropdown) dropdown.classList.add('hidden');
            input.focus();
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#ptStudentSearchInput') && !e.target.closest('#ptSearchResultsDropdown')) {
            if (dropdown) dropdown.classList.add('hidden');
        }
    });
}

function updateSearchHighlight(items) {
    items.forEach((item, idx) => {
        if (idx === currentSearchHighlightIndex) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}


let showArchivedGroups = false;

function toggleShowArchived() {
    showArchivedGroups = !showArchivedGroups;
    const btn = document.getElementById('toggleArchivedBtn');
    if (btn) {
        btn.textContent = showArchivedGroups ? t('ptHideArchived') : t('ptShowArchived');
        btn.style.color = showArchivedGroups ? '#c0392b' : '#666';
    }
    populateGroups();
}

function groupDisplayName(groupId) {
    if (!groupId) return '';
    const cgdMeta = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta)
        ? CLASS_GROUPS_DATA.classGroupsMeta[groupId] : null;
    if (cgdMeta && cgdMeta.name) return cgdMeta.name;

    const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
        ? CLASS_GROUPS_META[groupId] : null;
    if (meta && meta.name) return meta.name;

    if (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && Array.isArray(CLASS_GROUPS_DATA.classes)) {
        const found = CLASS_GROUPS_DATA.classes.find(c => c && (c.id === groupId || c.uuid === groupId));
        if (found && found.name) return found.name;
    }

    if (typeof CLASS_GROUPS !== 'undefined') {
        if (Array.isArray(CLASS_GROUPS)) {
            const found = CLASS_GROUPS.find(g => g && (g.id === groupId || g.uuid === groupId));
            if (found && found.name) return found.name;
        } else if (typeof CLASS_GROUPS === 'object' && CLASS_GROUPS && CLASS_GROUPS[groupId]) {
            return groupId;
        }
    }
    return groupId;
}

function populateGroups() {
    const groups = extractGroupsFromData();
    const container = document.getElementById('groupButtons');
    container.innerHTML = '';
    const knownGroups = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};

    groups.forEach(group => {
        const btn = document.createElement('button');
        const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[group] : null;
        const isOrphaned = !knownGroups[group];
        const displayName = (meta && meta.name) ? meta.name : group;
        btn.className = 'group-btn';
        btn.dataset.group = group;
        btn.textContent = displayName;
        if (meta && meta.archived) btn.style.opacity = '0.55';
        if (isOrphaned) {
            btn.style.borderColor = '#e67e22';
            btn.title = 'This class no longer exists in your class list';
        }
        btn.addEventListener('click', function() {
            selectGroup(group);
        });
        container.appendChild(btn);

        if (isOrphaned) {
            const delBtn = document.createElement('button');
            delBtn.className = 'group-btn';
            delBtn.style.cssText = 'padding:5px 8px;border-color:#e67e22;color:#e67e22;margin-left:2px;';
            delBtn.title = 'Delete all data for "' + displayName + '"';
            delBtn.innerHTML = '<img src="../assets/icons/delete.svg" class="btn-icon" alt="" />';
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                openResetModal('group', group);
            });
            container.appendChild(delBtn);
        }
    });
}

function extractGroupsFromData() {
    const groups = new Set();
    if (typeof DB_EXPORT !== 'undefined' && Array.isArray(DB_EXPORT)) {
        DB_EXPORT.forEach(session => {
            Object.keys(session.groups || {}).forEach(groupId => {
                const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[groupId] : null;
                if (!meta || !meta.archived || showArchivedGroups) {
                    groups.add(groupId);
                }
            });
        });
    }
    if (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) {
        Object.keys(CLASS_GROUPS_META).forEach(groupId => {
            const meta = CLASS_GROUPS_META[groupId];
            if (!meta || !meta.archived || showArchivedGroups) {
                groups.add(groupId);
            }
        });
    }
    return Array.from(groups).sort((a, b) => groupDisplayName(a).localeCompare(groupDisplayName(b)));
}

function selectFirstGroup() {
    const groups = extractGroupsFromData();
    if (groups.length > 0) {
        selectGroup(groups[0]);
    }
}

function selectGroup(groupId) {
    currentGroupId = groupId;
    currentHalfGroup = null;
    currentStudentName = null;
    selectedHistorySessionId = null;
    setClassOverviewTitle(null);
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.group === groupId);
    });
    // Show year/semester/level metadata + half group buttons
    const metaEl = document.getElementById('groupMetaInfo');
    if (metaEl) {
        const m = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META[groupId]) ? CLASS_GROUPS_META[groupId] : null;
        const chips = [];
        if (m && m.year)     chips.push(`<span class="group-meta-chip">${m.year}</span>`);
        if (m && m.semester) chips.push(`<span class="group-meta-chip">${t('ptSemesterPrefix')}${m.semester}</span>`);
        if (m && m.level)    chips.push(`<span class="group-meta-chip">${t('ptLevelPrefix')}${m.level}</span>`);
        const halfGroups = getGroupHalfGroups(groupId);
        if (halfGroups) {
            const halves = Object.keys(halfGroups).sort();
            chips.push('<span style="margin-left:6px;font-weight:700;color:#666;">½:</span>');
            const allActive = !currentHalfGroup ? 'active' : '';
            chips.push(`<button class="half-group-btn group-btn ${allActive}" data-half="" onclick="selectHalfGroup(null)" style="padding:2px 10px;font-size:12px;">${t('ptHalfAll')}</button>`);
            halves.forEach(h => {
                chips.push(`<button class="half-group-btn group-btn" data-half="${h}" onclick="selectHalfGroup('${h}')" style="padding:2px 10px;font-size:12px;">${h}</button>`);
            });
        }
        metaEl.innerHTML = chips.join('');
    }
    document.getElementById('studentDetailsArea').classList.add('hidden');
    document.getElementById('studentDetailTitle').classList.add('hidden');
    updateDashboard();
}

function extractStudentsForGroup(groupId) {
    const students = new Set();
    DB_EXPORT.forEach(session => {
        if (session.groups && session.groups[groupId]) {
            session.groups[groupId].forEach(student => {
                students.add(student.name);
            });
        }
    });
    return Array.from(students).sort();
}

function applyDatePreset(preset) {
    const today = new Date();
    let startDate = new Date();

    switch(preset) {
        case 'all':
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            break;
        case '7days':
            startDate.setDate(today.getDate() - 7);
            document.getElementById('dateFrom').value = startDate.toISOString().split('T')[0];
            document.getElementById('dateTo').value = today.toISOString().split('T')[0];
            break;
        case '30days':
            startDate.setDate(today.getDate() - 30);
            document.getElementById('dateFrom').value = startDate.toISOString().split('T')[0];
            document.getElementById('dateTo').value = today.toISOString().split('T')[0];
            break;
        case 'semester': {
            const semDates = getActiveSemesterDates();
            document.getElementById('dateFrom').value = semDates.start || '';
            document.getElementById('dateTo').value = semDates.end || '';
            break;
        }
    }
}

function getDateRange() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;
    return { from, to };
}

function filterSessionsByDateAndGroup(groupId, dateFrom, dateTo) {
    return DB_EXPORT.filter(session => {
        if (!session.groups || !session.groups[groupId]) return false;

        const sessionDate = session.id.split('T')[0];
        if (dateFrom && sessionDate < dateFrom) return false;
        if (dateTo && sessionDate > dateTo) return false;

        return true;
    });
}

function isExamSession(session, groupId) {
    if (!session) return false;
    if (session.isExam === true || session.examSession === true) return true;
    if (groupId && session.groups && session.groups[groupId]) {
        const grp = session.groups[groupId];
        return grp.length > 0 && grp.every(s => s.inExam === true);
    }
    if (session.groups) {
        const anyGrp = Object.values(session.groups).find(g => Array.isArray(g) && g.length > 0);
        if (anyGrp && anyGrp.every(s => s.inExam === true)) return true;
    }
    return false;
}

function getFilteredSessions() {
    if (!currentGroupId) return [];
    const dateRange = getDateRange();
    return filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);
}

function updateDashboard() {
    if (!currentGroupId) return;

    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);

    if (sessions.length === 0) {
        showMessage(t('ptMsgNoDataRange'), 'info');
    }

    // Exclude exam sessions from general participation stats and overview
    const participationSessions = sessions.filter(s => !isExamSession(s, currentGroupId));

    // Update chart (participation sessions)
    renderChart(participationSessions);

    // Update stats (participation sessions)
    updateStats(participationSessions);
    // Update multi-group comparison summary (uses active date range)
    renderCompareGroupsSummary();

    // Update history table (ALL sessions, so exam sessions appear with badge)
    updateHistoryTable(sessions);

    // Update class overview table (full range or selected history session)
    const selectedSession = selectedHistorySessionId
        ? sessions.find(s => s.id === selectedHistorySessionId)
        : null;

    if (selectedHistorySessionId && !selectedSession) {
        selectedHistorySessionId = null;
    }

    updateClassOverviewTable(selectedSession ? [selectedSession] : participationSessions);
    setClassOverviewTitle(selectedSession || null);

    if (currentStudentName && typeof updateStudentDetails === 'function') {
        updateStudentDetails();
    }
}
function getGroupSummary(groupId, dateFrom, dateTo) {
    const allSessions = filterSessionsByDateAndGroup(groupId, dateFrom, dateTo);
    const sessions = allSessions.filter(s => !isExamSession(s, groupId));
    const students = new Set();
    const totals = {
        sessions: sessions.length,
        picks: 0,
        pluses: 0,
        minuses: 0,
        teamPluses: 0,
        teamMinuses: 0,
        badges: 0,
        badgePositive: 0,
        badgeNegative: 0
    };

    sessions.forEach(session => {
        (session.groups[groupId] || []).forEach(student => {
            students.add(student.name);
            totals.picks += student.isPicked ? 1 : 0;
            totals.pluses += student.pluses || 0;
            totals.minuses += student.minuses || 0;
            totals.teamPluses += student.teamPluses || 0;
            totals.teamMinuses += student.teamMinuses || 0;
            const studentBadges = student.badges || [];
            const badgeSentiment = countBadgeSentiment(studentBadges);
            totals.badges += studentBadges.length;
            totals.badgePositive += badgeSentiment.positive;
            totals.badgeNegative += badgeSentiment.negative;
        });
    });

    const positive = totals.pluses + totals.teamPluses;
    const negative = totals.minuses + totals.teamMinuses;
    const net = positive + totals.badgePositive - negative - totals.badgeNegative;

    return {
        groupId,
        sessions: totals.sessions,
        students: students.size,
        picks: totals.picks,
        positive,
        negative,
        badgePositive: totals.badgePositive,
        badgeNegative: totals.badgeNegative,
        badges: totals.badges,
        net
    };
}

function openCompareGroupsModal() {
    const modal = document.getElementById('compareGroupsModal');
    const listEl = document.getElementById('compareGroupsList');
    const groups = extractGroupsFromData();

    if (!groups.length) {
        showMessage(t('ptMsgNoGroupsCompare'), 'error');
        return;
    }

    if (!compareGroupIds.length && currentGroupId) {
        compareGroupIds = [currentGroupId];
    }

    listEl.innerHTML = groups.map(groupId => {
        const checked = compareGroupIds.includes(groupId) ? 'checked' : '';
        return `
            <label class="compare-group-item">
                <input type="checkbox" class="compare-group-checkbox" value="${groupId}" ${checked}>
                <span>${groupDisplayName(groupId)}</span>
            </label>
        `;
    }).join('');

    modal.classList.add('active');
}

function closeCompareGroupsModal() {
    document.getElementById('compareGroupsModal').classList.remove('active');
}

function setCompareGroupsSelection(selectAll) {
    const checkboxes = document.querySelectorAll('.compare-group-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = !!selectAll;
    });
}

function applyCompareGroupsSelection() {
    const selected = Array.from(document.querySelectorAll('.compare-group-checkbox:checked')).map(cb => cb.value);
    compareGroupIds = selected;
    closeCompareGroupsModal();
    renderCompareGroupsSummary();

    if (!selected.length) {
        showMessage(t('ptMsgCompareCleared'), 'info');
        return;
    }

    showMessage(tFmt('ptMsgComparing', { n: selected.length }), 'success');
}

function renderCompareGroupsSummary() {
    const section = document.getElementById('compareSummarySection');
    const body = document.getElementById('compareSummaryBody');
    const foot = document.getElementById('compareSummaryFoot');
    const meta = document.getElementById('compareSummaryMeta');

    if (!section || !body || !foot || !meta) return;

    const available = new Set(extractGroupsFromData());
    compareGroupIds = compareGroupIds.filter(groupId => available.has(groupId));

    if (!compareGroupIds.length) {
        section.classList.add('hidden');
        body.innerHTML = '';
        foot.innerHTML = '';
        meta.textContent = '';
        return;
    }

    const dateRange = getDateRange();
    const summaries = compareGroupIds.map(groupId => getGroupSummary(groupId, dateRange.from, dateRange.to));
    const totals = summaries.reduce((acc, row) => {
        acc.sessions += row.sessions;
        acc.students += row.students;
        acc.picks += row.picks;
        acc.positive += row.positive;
        acc.negative += row.negative;
        acc.badgePositive += row.badgePositive;
        acc.badgeNegative += row.badgeNegative;
        acc.badges += row.badges;
        acc.net += row.net;
        return acc;
    }, {
        sessions: 0,
        students: 0,
        picks: 0,
        positive: 0,
        negative: 0,
        badgePositive: 0,
        badgeNegative: 0,
        badges: 0,
        net: 0
    });

    const totalSessionDivisor = totals.sessions || 1;
    const totalSessionStudentDivisor = summaries.reduce((acc, row) => acc + ((row.sessions || 0) * (row.students || 0)), 0) || 1;
    const totalPickPerSession = totals.picks / totalSessionDivisor;
    const totalPosPerSession = totals.positive / totalSessionDivisor;
    const totalPosPerSessionPerStudent = totals.positive / totalSessionStudentDivisor;
    const totalNegPerSession = totals.negative / totalSessionDivisor;
    const totalNegPerSessionPerStudent = totals.negative / totalSessionStudentDivisor;
    const totalBadgesPerSessionPerStudent = totals.badges / totalSessionStudentDivisor;
    const totalNetPerSession = totals.net / totalSessionDivisor;
    const totalNetPerSessionPerStudent = totals.net / totalSessionStudentDivisor;

    const numGroups = summaries.length || 1;
    const meanSessions = totals.sessions / numGroups;
    const meanStudents = totals.students / numGroups;
    const meanPicks = totals.picks / numGroups;
    const meanPicksPerSession = summaries.reduce((acc, row) => acc + (row.picks / (row.sessions || 1)), 0) / numGroups;
    const meanPositive = totals.positive / numGroups;
    const meanPosPerSession = summaries.reduce((acc, row) => acc + (row.positive / (row.sessions || 1)), 0) / numGroups;
    const meanPosPerSessionPerStudent = summaries.reduce((acc, row) => acc + (row.positive / ((row.sessions || 0) * (row.students || 0) || 1)), 0) / numGroups;
    const meanNegative = totals.negative / numGroups;
    const meanNegPerSession = summaries.reduce((acc, row) => acc + (row.negative / (row.sessions || 1)), 0) / numGroups;
    const meanNegPerSessionPerStudent = summaries.reduce((acc, row) => acc + (row.negative / ((row.sessions || 0) * (row.students || 0) || 1)), 0) / numGroups;
    const meanBadgePositive = totals.badgePositive / numGroups;
    const meanBadgeNegative = totals.badgeNegative / numGroups;
    const meanBadges = totals.badges / numGroups;
    const meanBadgesPerSessionPerStudent = summaries.reduce((acc, row) => acc + (row.badges / ((row.sessions || 0) * (row.students || 0) || 1)), 0) / numGroups;
    const meanNet = totals.net / numGroups;
    const meanNetPerSession = summaries.reduce((acc, row) => acc + (row.net / (row.sessions || 1)), 0) / numGroups;
    const meanNetPerSessionPerStudent = summaries.reduce((acc, row) => acc + (row.net / ((row.sessions || 0) * (row.students || 0) || 1)), 0) / numGroups;

    body.innerHTML = summaries.map(row => `
        ${(() => {
            const sessionDivisor = row.sessions || 1;
            const sessionStudentDivisor = (row.sessions || 0) * (row.students || 0) || 1;
            const picksPerSession = row.picks / sessionDivisor;
            const posPerSession = row.positive / sessionDivisor;
            const posPerSessionPerStudent = row.positive / sessionStudentDivisor;
            const negPerSession = row.negative / sessionDivisor;
            const negPerSessionPerStudent = row.negative / sessionStudentDivisor;
            const badgesPerSessionPerStudent = row.badges / sessionStudentDivisor;
            const netPerSession = row.net / sessionDivisor;
            const netPerSessionPerStudent = row.net / sessionStudentDivisor;
            return `
        <tr>
            <td>${groupDisplayName(row.groupId)}</td>
            <td>${row.sessions}</td>
            <td>${row.students}</td>
            <td>${row.picks}</td>
            <td>${picksPerSession.toFixed(2)}</td>
            <td style="color:#2ca02c; font-weight:600;">${row.positive}</td>
            <td style="color:#2ca02c; font-weight:600;">${posPerSession.toFixed(2)}</td>
            <td style="color:#2ca02c; font-weight:600;">${posPerSessionPerStudent.toFixed(2)}</td>
            <td style="color:#d62728; font-weight:600;">${row.negative}</td>
            <td style="color:#d62728; font-weight:600;">${negPerSession.toFixed(2)}</td>
            <td style="color:#d62728; font-weight:600;">${negPerSessionPerStudent.toFixed(2)}</td>
            <td style="color:#2ca02c; font-weight:600;">${formatSummaryNumber(row.badgePositive)}</td>
            <td style="color:#d62728; font-weight:600;">${formatSummaryNumber(row.badgeNegative)}</td>
            <td>${row.badges}</td>
            <td>${badgesPerSessionPerStudent.toFixed(2)}</td>
            <td style="color:${row.net >= 0 ? '#2ca02c' : '#d62728'}; font-weight:700;">${row.net >= 0 ? '+' : ''}${formatSummaryNumber(row.net)}</td>
            <td style="color:${netPerSession >= 0 ? '#2ca02c' : '#d62728'}; font-weight:700;">${netPerSession >= 0 ? '+' : ''}${netPerSession.toFixed(2)}</td>
            <td style="color:${netPerSessionPerStudent >= 0 ? '#2ca02c' : '#d62728'}; font-weight:700;">${netPerSessionPerStudent >= 0 ? '+' : ''}${netPerSessionPerStudent.toFixed(2)}</td>
        </tr>
            `;
        })()}
    `).join('');

    foot.innerHTML = `
        <tr class="compare-totals-row">
            <td><strong>${t('ptCmpSumTotals')}</strong></td>
            <td>${totals.sessions}</td>
            <td>${totals.students}</td>
            <td>${totals.picks}</td>
            <td>—</td>
            <td style="color:#2ca02c;">${totals.positive}</td>
            <td>—</td>
            <td>—</td>
            <td style="color:#d62728;">${totals.negative}</td>
            <td>—</td>
            <td>—</td>
            <td style="color:#2ca02c;">${formatSummaryNumber(totals.badgePositive)}</td>
            <td style="color:#d62728;">${formatSummaryNumber(totals.badgeNegative)}</td>
            <td>${totals.badges}</td>
            <td>—</td>
            <td style="color:${totals.net >= 0 ? '#2ca02c' : '#d62728'};">${totals.net >= 0 ? '+' : ''}${formatSummaryNumber(totals.net)}</td>
            <td>—</td>
            <td>—</td>
        </tr>
        <tr class="compare-mean-row">
            <td><strong>${t('ptCmpOverallMean')}</strong></td>
            <td>${meanSessions.toFixed(2)}</td>
            <td>${meanStudents.toFixed(2)}</td>
            <td>${meanPicks.toFixed(2)}</td>
            <td>${meanPicksPerSession.toFixed(2)}</td>
            <td style="color:#2ca02c;">${meanPositive.toFixed(2)}</td>
            <td style="color:#2ca02c;">${meanPosPerSession.toFixed(2)}</td>
            <td style="color:#2ca02c;">${meanPosPerSessionPerStudent.toFixed(2)}</td>
            <td style="color:#d62728;">${meanNegative.toFixed(2)}</td>
            <td style="color:#d62728;">${meanNegPerSession.toFixed(2)}</td>
            <td style="color:#d62728;">${meanNegPerSessionPerStudent.toFixed(2)}</td>
            <td style="color:#2ca02c;">${meanBadgePositive.toFixed(2)}</td>
            <td style="color:#d62728;">${meanBadgeNegative.toFixed(2)}</td>
            <td>${meanBadges.toFixed(2)}</td>
            <td>${meanBadgesPerSessionPerStudent.toFixed(2)}</td>
            <td style="color:${meanNet >= 0 ? '#2ca02c' : '#d62728'};">${meanNet >= 0 ? '+' : ''}${meanNet.toFixed(2)}</td>
            <td style="color:${meanNetPerSession >= 0 ? '#2ca02c' : '#d62728'};">${meanNetPerSession >= 0 ? '+' : ''}${meanNetPerSession.toFixed(2)}</td>
            <td style="color:${meanNetPerSessionPerStudent >= 0 ? '#2ca02c' : '#d62728'};">${meanNetPerSessionPerStudent >= 0 ? '+' : ''}${meanNetPerSessionPerStudent.toFixed(2)}</td>
        </tr>
    `;

    const fromText = dateRange.from || 'start';
    const toText = dateRange.to || 'today';
    meta.textContent = `Showing ${summaries.length} group(s) from ${fromText} to ${toText}.`;
    section.classList.remove('hidden');
}

function setClassOverviewTitle(session) {
    const titleEl = document.getElementById('classOverviewTitle');
    const clearBtn = document.getElementById('clearSessionFilterBtn');
    const examBtn = document.getElementById('sessionExamToggleBtn');
    const examText = document.getElementById('sessionExamToggleBtnText');
    if (!titleEl) return;

    if (!session) {
        titleEl.textContent = t('ptClassOverviewTitle');
        if (clearBtn) clearBtn.classList.add('hidden');
        if (examBtn) examBtn.classList.add('hidden');
        return;
    }

    const date = new Date(session.id);
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const timeStr = session.time ? ` ${session.time}` : '';
    titleEl.textContent = `${t('ptClassOverviewTitle')} - ${dateStr}${timeStr}`;
    if (clearBtn) clearBtn.classList.remove('hidden');

    if (examBtn && examText) {
        const isExam = isExamSession(session, currentGroupId);
        examBtn.classList.remove('hidden');
        examText.textContent = isExam ? t('ptActionExitExam') : t('ptActionMakeExam');
        examBtn.title = isExam ? t('ptActionExitExamTitle') : t('ptActionMakeExamTitle');
        if (isExam) {
            examBtn.classList.add('active-exam');
        } else {
            examBtn.classList.remove('active-exam');
        }
    }
}

let classOverviewData = [];
let classOverviewSortCol = 'name';
let classOverviewSortDir = 1;

function updateClassOverviewTable(sessions) {
    const tbody = document.getElementById('classOverviewTableBody');
    tbody.innerHTML = '';

    // Compute overall student data across the active date range sessions
    // so provisional grades remain overall and are not collapsed to a single selected session
    const allRangeSessions = getFilteredSessions().filter(s => !isExamSession(s, currentGroupId));
    const overallStudentMap = {};
    allRangeSessions.forEach(session => {
        (session.groups[currentGroupId] || []).filter(s => isStudentInCurrentHalfGroup(s.name)).forEach(student => {
            if (!overallStudentMap[student.name]) {
                overallStudentMap[student.name] = {
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
                    badgeNegative: 0,
                    teamRoleEvents: 0,
                    teamRolePreview: '',
                    notes: '',
                    notesCount: 0,
                    sessionNets: []
                };
            }
            const os = overallStudentMap[student.name];
            os.sessions++;
            if (!student.isAbsent) os.attendedSessions++;
            if (student.isPicked) os.picks++;
            if (student.isAbsent) os.absent++;
            os.pluses += student.pluses || 0;
            os.minuses += student.minuses || 0;
            os.teamPluses += student.teamPluses || 0;
            os.teamMinuses += student.teamMinuses || 0;
            const studentBadges = student.badges || [];
            const badgeSentiment = countBadgeSentiment(studentBadges);
            os.badges = os.badges.concat(studentBadges);
            os.badgePositive += badgeSentiment.positive;
            os.badgeNegative += badgeSentiment.negative;

            const studentEvents = getSessionTeamRoleEvents(session, currentGroupId, student.name);
            os.teamRoleEvents += studentEvents.length;

            const studentNotes = getStudentNotesText(student);
            if (studentNotes) {
                os.notesCount++;
            }
            if (!student.isAbsent) {
                os.sessionNets.push(getStudentSessionNet(student));
            }
        });
    });

    window._ptLastOverallStudentMap = overallStudentMap;

    const studentMap = {};
    sessions.forEach(session => {
        (session.groups[currentGroupId] || []).filter(s => isStudentInCurrentHalfGroup(s.name)).forEach(student => {
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
                    badgeNegative: 0,
                    teamRoleEvents: 0,
                    teamRolePreview: '',
                    notes: '',
                    notesCount: 0,
                    sessionNets: [],
                    overall: overallStudentMap[student.name] || null
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

            const studentEvents = getSessionTeamRoleEvents(session, currentGroupId, student.name);
            s.teamRoleEvents += studentEvents.length;
            if (studentEvents.length) {
                const eventsPreview = formatTeamRoleEventsPreview(studentEvents, 80);
                s.teamRolePreview = s.teamRolePreview ? `${s.teamRolePreview} | ${eventsPreview}` : eventsPreview;
            }

            const studentNotes = getStudentNotesText(student);
            if (studentNotes) {
                s.notesCount++;
                s.notes = s.notes ? `${s.notes} | ${studentNotes}` : studentNotes;
            }
            if (!student.isAbsent) {
                s.sessionNets.push(getStudentSessionNet(student));
            }
            if (!s.overall && overallStudentMap[student.name]) {
                s.overall = overallStudentMap[student.name];
            }
        });
    });

    classOverviewData = Object.values(studentMap);
    renderClassOverviewRows();
}

let historySortCol = 'date';
let historySortDir = -1;

function sortHistoryTable(col) {
    if (historySortCol === col) {
        historySortDir *= -1;
    } else {
        historySortCol = col;
        historySortDir = (col === 'date' || col === 'time') ? -1 : 1;
    }
    const filteredSessions = getFilteredSessions();
    updateHistoryTable(filteredSessions);
}

let studentTableSortCol = 'date';
let studentTableSortDir = -1;

function sortStudentTable(col) {
    if (studentTableSortCol === col) {
        studentTableSortDir *= -1;
    } else {
        studentTableSortCol = col;
        studentTableSortDir = (col === 'date' || col === 'time') ? -1 : 1;
    }
    if (currentStudentName) {
        const filteredSessions = getFilteredSessions();
        renderStudentDetails(filteredSessions, currentStudentName);
    }
}

function sortClassOverviewTable(col) {
    if (classOverviewSortCol === col) {
        classOverviewSortDir *= -1;
    } else {
        classOverviewSortCol = col;
        classOverviewSortDir = (col === 'name') ? 1 : -1;
    }
    document.querySelectorAll('#classOverviewTable thead th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const c = th.dataset.col || th.dataset.sort;
        if (c === col) th.classList.add(classOverviewSortDir === 1 ? 'sort-asc' : 'sort-desc');
    });
    renderClassOverviewRows();
}

function getStudentSessionNet(student) {
    const defs = getConfiguredBadgeDefinitions();
    const plusDef = defs.find(d => d.isBuiltin && d.icon === '+');
    const minusDef = defs.find(d => d.isBuiltin && d.icon === '-');
    const fallbackCoeff = getConfiguredParticipationSettings().plusMinusCoefficient;
    const plusCoeff = plusDef ? plusDef.coefficient : fallbackCoeff;
    const minusCoeff = minusDef ? minusDef.coefficient : fallbackCoeff;
    const badgeSentiment = countBadgeSentiment(student.badges || []);
    const raw = ((student.pluses || 0) + (student.teamPluses || 0)) * plusCoeff
        - ((student.minuses || 0) + (student.teamMinuses || 0)) * minusCoeff
        + badgeSentiment.positive - badgeSentiment.negative;
    return parseFloat(raw.toFixed(2));
}

function computeTrend(sessionNets) {
    const n = sessionNets.length;
    if (n < 2) return 'flat';
    const mid = Math.ceil(n / 2);
    const firstHalf = sessionNets.slice(0, mid);
    const secondHalf = sessionNets.slice(n - mid);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (diff > 0.1) return 'up';
    if (diff < -0.1) return 'down';
    return 'flat';
}

function getConfiguredParticipationSettings() {
    try {
        const config = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG) ? CLASS_MANAGEMENT_CONFIG : null;
        const ps = config?.participationSettings;
        if (ps && typeof ps === 'object') {
            const pmCoeff = Number(ps.plusMinusCoefficient);
            return { plusMinusCoefficient: Number.isFinite(pmCoeff) ? pmCoeff : 1 };
        }
    } catch (e) { /* ignore */ }
    return { plusMinusCoefficient: 1 };
}

function getClassOverviewNet(data) {
    const defs = getConfiguredBadgeDefinitions();
    const plusDef = defs.find(d => d.isBuiltin && d.icon === '+');
    const minusDef = defs.find(d => d.isBuiltin && d.icon === '-');
    // Fall back to participationSettings.plusMinusCoefficient for old configs without builtin entries
    const fallbackCoeff = getConfiguredParticipationSettings().plusMinusCoefficient;
    const plusCoeff = plusDef ? plusDef.coefficient : fallbackCoeff;
    const minusCoeff = minusDef ? minusDef.coefficient : fallbackCoeff;
    const raw = (data.pluses + data.teamPluses) * plusCoeff
        - (data.minuses + data.teamMinuses) * minusCoeff
        + data.badgePositive - data.badgeNegative;
    return parseFloat(raw.toFixed(2));
}

function formatSummaryNumber(value, decimals = 2) {
    const num = Number(value) || 0;
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(decimals).replace(/\.00$/, '');
}

function getClassOverviewSummary() {
    const totals = classOverviewData.reduce((acc, data) => {
        acc.students += 1;
        acc.sessions += data.sessions;
        acc.attendedSessions += data.attendedSessions;
        acc.picks += data.picks;
        acc.absent += data.absent;
        acc.pluses += data.pluses;
        acc.minuses += data.minuses;
        acc.teamPluses += data.teamPluses;
        acc.teamMinuses += data.teamMinuses;
        acc.badgePositive += data.badgePositive;
        acc.badgeNegative += data.badgeNegative;
        acc.badges += data.badges.length;
        acc.teamRoleEvents += data.teamRoleEvents;
        acc.notesCount += data.notesCount;
        acc.net += getClassOverviewNet(data);
        return acc;
    }, {
        students: 0,
        sessions: 0,
        attendedSessions: 0,
        picks: 0,
        absent: 0,
        pluses: 0,
        minuses: 0,
        teamPluses: 0,
        teamMinuses: 0,
        badgePositive: 0,
        badgeNegative: 0,
        badges: 0,
        teamRoleEvents: 0,
        notesCount: 0,
        net: 0
    });

    const totalGood = totals.pluses + totals.teamPluses + totals.badgePositive;
    const totalBad = totals.minuses + totals.teamMinuses + totals.badgeNegative;
    const safeStudentDivisor = totals.students || 1;
    const safeAttendanceDivisor = totals.attendedSessions || 1;
    const ratioValue = totalBad > 0 ? totalGood / totalBad : (totalGood > 0 ? Infinity : 0);

    // Compute class average provisional grade
    const totalWithGrades = classOverviewData.filter(d => calculateStudentProvisionalGrade(d) !== null).length;
    const sumGrades = classOverviewData.reduce((acc, d) => acc + (calculateStudentProvisionalGrade(d) || 0), 0);
    const avgProvisionalGrade = totalWithGrades > 0 ? sumGrades / totalWithGrades : 0;

    return {
        totals,
        averages: {
            sessions: totals.sessions / safeStudentDivisor,
            picks: totals.picks / safeStudentDivisor,
            absent: totals.absent / safeStudentDivisor,
            pluses: totals.pluses / safeStudentDivisor,
            minuses: totals.minuses / safeStudentDivisor,
            teamPluses: totals.teamPluses / safeStudentDivisor,
            teamMinuses: totals.teamMinuses / safeStudentDivisor,
            badgePositive: totals.badgePositive / safeStudentDivisor,
            badgeNegative: totals.badgeNegative / safeStudentDivisor,
            badges: totals.badges / safeStudentDivisor,
            teamRoleEvents: totals.teamRoleEvents / safeStudentDivisor,
            notesCount: totals.notesCount / safeStudentDivisor,
            net: totals.net / safeStudentDivisor,
            posRatio: totalGood / safeAttendanceDivisor,
            negRatio: totalBad / safeAttendanceDivisor,
            netRatio: totals.net / safeAttendanceDivisor,
            ratio: ratioValue,
            provisionalGrade: avgProvisionalGrade
        },
        ratios: {
            posRatio: totalGood / safeAttendanceDivisor,
            negRatio: totalBad / safeAttendanceDivisor,
            netRatio: totals.net / safeAttendanceDivisor,
            ratio: ratioValue
        }
    };
}

function buildClassOverviewSummaryRows() {
    const tfoot = document.getElementById('classOverviewTableFoot');
    if (!tfoot) return;

    if (!classOverviewData.length) {
        tfoot.innerHTML = '';
        return;
    }

    const summary = getClassOverviewSummary();
    const totalRatioText = summary.ratios.ratio === Infinity ? '∞' : (summary.ratios.ratio === 0 ? '—' : summary.ratios.ratio.toFixed(2));
    const avgRatioText = summary.averages.ratio === Infinity ? '∞' : (summary.averages.ratio === 0 ? '—' : summary.averages.ratio.toFixed(2));
    const totalNetColor = summary.totals.net >= 0 ? '#2ca02c' : '#d62728';
    const avgNetColor = summary.averages.net >= 0 ? '#2ca02c' : '#d62728';
    const totalNetRatioColor = summary.ratios.netRatio >= 0 ? '#2ca02c' : '#d62728';
    const avgNetRatioColor = summary.averages.netRatio >= 0 ? '#2ca02c' : '#d62728';

    const totalWithGrades = classOverviewData.filter(d => calculateStudentProvisionalGrade(d) !== null).length;

    const colOrder = getColOrder('classOverviewTable');
    const hidden = getHiddenColsSet('classOverviewTable');

    const totalCells = {
        name: `<td><strong>${t('ptClassTotal')}</strong></td>`,
        sessions: `<td>${formatSummaryNumber(summary.totals.sessions)}</td>`,
        picks: `<td>${formatSummaryNumber(summary.totals.picks)}</td>`,
        absent: `<td>${formatSummaryNumber(summary.totals.absent)}</td>`,
        pluses: `<td>${formatSummaryNumber(summary.totals.pluses)}</td>`,
        minuses: `<td>${formatSummaryNumber(summary.totals.minuses)}</td>`,
        teamPluses: `<td style="color: #1f5a2b;">${formatSummaryNumber(summary.totals.teamPluses)}</td>`,
        teamMinuses: `<td style="color: #8a1e1e;">${formatSummaryNumber(summary.totals.teamMinuses)}</td>`,
        badgePositive: `<td style="color: #2ca02c;">${formatSummaryNumber(summary.totals.badgePositive)}</td>`,
        badgeNegative: `<td style="color: #d62728;">${formatSummaryNumber(summary.totals.badgeNegative)}</td>`,
        badges: `<td>${formatSummaryNumber(summary.totals.badges)}</td>`,
        teamRoleEvents: `<td>${formatSummaryNumber(summary.totals.teamRoleEvents)}</td>`,
        notes: `<td>${formatSummaryNumber(summary.totals.notesCount)}</td>`,
        provisionalGrade: `<td>—</td>`,
        net: `<td style="color: ${totalNetColor};">${summary.totals.net >= 0 ? '+' : ''}${formatSummaryNumber(summary.totals.net)}</td>`,
        posRatio: `<td style="color: #2ca02c;">+${summary.ratios.posRatio.toFixed(2)}</td>`,
        negRatio: `<td style="color: #d62728;">-${summary.ratios.negRatio.toFixed(2)}</td>`,
        netRatio: `<td style="color: ${totalNetRatioColor};">${summary.ratios.netRatio >= 0 ? '+' : ''}${summary.ratios.netRatio.toFixed(2)}</td>`,
        ratio: `<td>${totalRatioText}</td>`,
        trend: `<td>—</td>`
    };

    const avgCells = {
        name: `<td><strong>${t('ptClassAvg')}</strong></td>`,
        sessions: `<td>${summary.averages.sessions.toFixed(2)}</td>`,
        picks: `<td>${summary.averages.picks.toFixed(2)}</td>`,
        absent: `<td>${summary.averages.absent.toFixed(2)}</td>`,
        pluses: `<td>${summary.averages.pluses.toFixed(2)}</td>`,
        minuses: `<td>${summary.averages.minuses.toFixed(2)}</td>`,
        teamPluses: `<td style="color: #1f5a2b;">${summary.averages.teamPluses.toFixed(2)}</td>`,
        teamMinuses: `<td style="color: #8a1e1e;">${summary.averages.teamMinuses.toFixed(2)}</td>`,
        badgePositive: `<td style="color: #2ca02c;">${summary.averages.badgePositive.toFixed(2)}</td>`,
        badgeNegative: `<td style="color: #d62728;">${summary.averages.badgeNegative.toFixed(2)}</td>`,
        badges: `<td>${summary.averages.badges.toFixed(2)}</td>`,
        teamRoleEvents: `<td>${summary.averages.teamRoleEvents.toFixed(2)}</td>`,
        notes: `<td>${summary.averages.notesCount.toFixed(2)}</td>`,
        provisionalGrade: `<td>${totalWithGrades > 0 ? summary.averages.provisionalGrade.toFixed(2) : '—'}</td>`,
        net: `<td style="color: ${avgNetColor};">${summary.averages.net >= 0 ? '+' : ''}${summary.averages.net.toFixed(2)}</td>`,
        posRatio: `<td style="color: #2ca02c;">+${summary.averages.posRatio.toFixed(2)}</td>`,
        negRatio: `<td style="color: #d62728;">-${summary.averages.negRatio.toFixed(2)}</td>`,
        netRatio: `<td style="color: ${avgNetRatioColor};">${summary.averages.netRatio >= 0 ? '+' : ''}${summary.averages.netRatio.toFixed(2)}</td>`,
        ratio: `<td>${avgRatioText}</td>`,
        trend: `<td>—</td>`
    };

    const trTotalHtml = colOrder.map(colId => {
        const cell = totalCells[colId] || `<td>—</td>`;
        const isHidden = hidden.has(colId);
        return cell.replace('<td', `<td data-col="${colId}" class="${isHidden ? 'col-hidden' : ''}"${isHidden ? ' style="display:none;"' : ''}`);
    }).join('');

    const trAvgHtml = colOrder.map(colId => {
        const cell = avgCells[colId] || `<td>—</td>`;
        const isHidden = hidden.has(colId);
        return cell.replace('<td', `<td data-col="${colId}" class="${isHidden ? 'col-hidden' : ''}"${isHidden ? ' style="display:none;"' : ''}`);
    }).join('');

    tfoot.innerHTML = `<tr>${trTotalHtml}</tr><tr>${trAvgHtml}</tr>`;
}

function renderClassOverviewRows() {
    const tbody = document.getElementById('classOverviewTableBody');
    if (!tbody) return;

    const colOrder = getColOrder('classOverviewTable');
    const hidden = getHiddenColsSet('classOverviewTable');

    const sorted = [...classOverviewData].sort((a, b) => {
        const col = classOverviewSortCol;
        const av = col === 'net' ? getClassOverviewNet(a)
            : col === 'badges' ? a.badges.length
            : col === 'notes' ? a.notesCount
            : col === 'provisionalGrade' ? (calculateStudentProvisionalGrade(a) ?? -1)
            : col === 'posRatio' ? (a.attendedSessions ? (a.pluses + a.teamPluses + a.badgePositive) / a.attendedSessions : 0)
            : col === 'negRatio' ? (a.attendedSessions ? (a.minuses + a.teamMinuses + a.badgeNegative) / a.attendedSessions : 0)
            : col === 'netRatio' ? (a.attendedSessions ? getClassOverviewNet(a) / a.attendedSessions : 0)
            : col === 'ratio' ? (() => { const g = a.pluses + a.teamPluses + a.badgePositive; const bd = a.minuses + a.teamMinuses + a.badgeNegative; return bd > 0 ? g / bd : (g > 0 ? 999 : 0); })()
            : col === 'trend' ? (computeTrend(a.sessionNets) === 'up' ? 1 : computeTrend(a.sessionNets) === 'down' ? -1 : 0)
            : a[col];
        const bv = col === 'net' ? getClassOverviewNet(b)
            : col === 'badges' ? b.badges.length
            : col === 'notes' ? b.notesCount
            : col === 'provisionalGrade' ? (calculateStudentProvisionalGrade(b) ?? -1)
            : col === 'posRatio' ? (b.attendedSessions ? (b.pluses + b.teamPluses + b.badgePositive) / b.attendedSessions : 0)
            : col === 'negRatio' ? (b.attendedSessions ? (b.minuses + b.teamMinuses + b.badgeNegative) / b.attendedSessions : 0)
            : col === 'netRatio' ? (b.attendedSessions ? getClassOverviewNet(b) / b.attendedSessions : 0)
            : col === 'ratio' ? (() => { const g = b.pluses + b.teamPluses + b.badgePositive; const bd = b.minuses + b.teamMinuses + b.badgeNegative; return bd > 0 ? g / bd : (g > 0 ? 999 : 0); })()
            : col === 'trend' ? (computeTrend(b.sessionNets) === 'up' ? 1 : computeTrend(b.sessionNets) === 'down' ? -1 : 0)
            : b[col];
        if (typeof av === 'string') return av.localeCompare(bv) * classOverviewSortDir;
        return (av - bv) * classOverviewSortDir;
    });

    const hiddenKey = Array.from(hidden).sort().join(',');
    const orderKey = colOrder.join(',');

    const createOverviewRow = () => {
        const row = document.createElement('tr');
        row.className = 'expandable-row';
        row.addEventListener('click', () => {
            const name = row.dataset.studentName;
            if (!name) return;
            currentStudentName = name;
            document.querySelectorAll('#classOverviewTableBody tr').forEach(r => r.classList.remove('selected-student'));
            row.classList.add('selected-student');
            document.getElementById('studentDetailTitle').classList.remove('hidden');
            updateStudentDetails();
            document.getElementById('studentDetailsArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        row.oncontextmenu = function(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (row.dataset.studentName) openStudentEditModal(row.dataset.studentName);
            return false;
        };
        return row;
    };

    const updateOverviewRow = (row, data) => {
        const net = getClassOverviewNet(data);
        const posRatio = data.attendedSessions ? parseFloat(((data.pluses + data.teamPluses + data.badgePositive) / data.attendedSessions).toFixed(2)) : 0;
        const negRatio = data.attendedSessions ? parseFloat(((data.minuses + data.teamMinuses + data.badgeNegative) / data.attendedSessions).toFixed(2)) : 0;
        const netRatio = data.attendedSessions ? parseFloat((net / data.attendedSessions).toFixed(2)) : 0;
        const teamRoleText = data.teamRolePreview || '(none)';
        const teamRolePreview = teamRoleText.length > 80 ? `${teamRoleText.substring(0, 80)}...` : teamRoleText;
        const notesText = data.notes || '(none)';
        const notesPreview = notesText.length > 80 ? `${notesText.substring(0, 80)}...` : notesText;

        const pGrade = calculateStudentProvisionalGrade(data);
        const displayGrade = pGrade !== null ? formatSummaryNumber(pGrade) : '—';
        const isSingleSession = !!selectedHistorySessionId;
        const pGradeTitle = isSingleSession
            ? `${t('ptProvisionalGradeTitle')} (${t('af_all_sessions') || 'Period'})`
            : t('ptProvisionalGradeTitle');

        const displayName = getPtStudentDisplayName(data.name);
        const sObj = resolvePtStudent(data.name);
        const customBadge = (sObj && sObj.customName && getPtNameDisplayMode() !== 'custom')
            ? ` <span style="font-size:0.72rem;font-weight:normal;color:#666;">(${escapeHtml(sObj.customName)})</span>`
            : '';

        const ratioVal = (() => {
            const g = data.pluses + data.teamPluses + data.badgePositive;
            const bd = data.minuses + data.teamMinuses + data.badgeNegative;
            return (g === 0 && bd === 0) ? '—' : (bd === 0 ? '∞' : (g / bd).toFixed(2));
        })();
        const ratioColor = (() => {
            const g = data.pluses + data.teamPluses + data.badgePositive;
            const bd = data.minuses + data.teamMinuses + data.badgeNegative;
            return (g === 0 && bd === 0) ? '#888' : (bd === 0 ? '#2ca02c' : (g / bd >= 1 ? '#2ca02c' : '#d62728'));
        })();

        const trendVal = computeTrend(data.sessionNets);
        const trendSymbol = trendVal === 'up' ? '↑' : trendVal === 'down' ? '↓' : '→';
        const trendColor = trendVal === 'up' ? '#2ca02c' : trendVal === 'down' ? '#d62728' : '#888';
        const trendTitle = trendVal === 'up' ? t('ptTrendImproving') : trendVal === 'down' ? t('ptTrendDeclining') : t('ptTrendStable');

        row.dataset.studentName = data.name;
        row.title = sObj?.customName ? `${data.name} (Custom: ${sObj.customName}) — ${t('ptRightClickHint')}` : t('ptRightClickHint');
        if (window.DomSync) {
            DomSync.setClass(row, 'selected-student', data.name === currentStudentName);
        } else {
            row.className = 'expandable-row' + (data.name === currentStudentName ? ' selected-student' : '');
        }

        const sig = `${orderKey}|${hiddenKey}|${displayName}|${sObj?.customName || ''}|${data.sessions}|${data.picks}|${data.absent}|${data.pluses}|${data.minuses}|${data.teamPluses}|${data.teamMinuses}|${data.badgePositive}|${data.badgeNegative}|${data.badges.length}|${data.teamRoleEvents}|${notesPreview}|${displayGrade}|${net}|${trendVal}`;
        if (row.dataset.syncSig === sig) return;
        row.dataset.syncSig = sig;

        const cells = {
            name: `<td><strong>${escapeHtml(displayName)}</strong>${customBadge}</td>`,
            sessions: `<td>${data.sessions}</td>`,
            picks: `<td>${data.picks}</td>`,
            absent: `<td>${data.absent}</td>`,
            pluses: `<td>${data.pluses}</td>`,
            minuses: `<td>${data.minuses}</td>`,
            teamPluses: `<td style="color: #1f5a2b; font-weight: 600;">${data.teamPluses}</td>`,
            teamMinuses: `<td style="color: #8a1e1e; font-weight: 600;">${data.teamMinuses}</td>`,
            badgePositive: `<td style="color: #2ca02c; font-weight: 600;">${data.badgePositive}</td>`,
            badgeNegative: `<td style="color: #d62728; font-weight: 600;">${data.badgeNegative}</td>`,
            badges: `<td>${formatBadges(data.badges)}</td>`,
            teamRoleEvents: `<td><span title="${escapeHtml(teamRoleText)}" class="notes-preview ${data.teamRoleEvents ? '' : 'empty'}">${data.teamRoleEvents ? `${data.teamRoleEvents} · ${escapeHtml(teamRolePreview)}` : t('ptNone')}</span></td>`,
            notes: `<td><span title="${escapeHtml(notesText)}" class="notes-preview ${data.notes ? '' : 'empty'}">${escapeHtml(notesPreview)}</span></td>`,
            provisionalGrade: `<td title="${escapeHtml(pGradeTitle)}">${displayGrade}</td>`,
            net: `<td style="color: ${net >= 0 ? '#2ca02c' : '#d62728'}; font-weight: 600;">${net >= 0 ? '+' : ''}${net}</td>`,
            posRatio: `<td style="color: #2ca02c; font-weight: 600;">+${posRatio.toFixed(2)}</td>`,
            negRatio: `<td style="color: #d62728; font-weight: 600;">-${negRatio.toFixed(2)}</td>`,
            netRatio: `<td style="color: ${netRatio >= 0 ? '#2ca02c' : '#d62728'}; font-weight: 600;">${netRatio >= 0 ? '+' : ''}${netRatio.toFixed(2)}</td>`,
            ratio: `<td style="font-weight: 600; color: ${ratioColor};">${ratioVal}</td>`,
            trend: `<td style="font-size: 1.2em; font-weight: 700; text-align: center; color: ${trendColor};" title="${trendTitle}">${trendSymbol}</td>`
        };

        row.innerHTML = colOrder.map(colId => {
            const rawCell = cells[colId] || `<td></td>`;
            const isHidden = hidden.has(colId);
            return rawCell.replace('<td', `<td data-col="${colId}" class="${isHidden ? 'col-hidden' : ''}"${isHidden ? ' style="display:none;"' : ''}`);
        }).join('');
    };

    if (window.DomSync && typeof DomSync.renderWindowedRows === 'function') {
        DomSync.renderWindowedRows(tbody, sorted, d => d.name, createOverviewRow, updateOverviewRow, {
            threshold: 60,
            rowHeight: 44,
            overscan: 12,
            colSpan: colOrder.length
        });
    } else {
        tbody.innerHTML = '';
        sorted.forEach(d => {
            const r = createOverviewRow();
            updateOverviewRow(r, d);
            tbody.appendChild(r);
        });
    }
    buildClassOverviewSummaryRows();
    applyHiddenCols('classOverviewTable');
}

function aggregateMetrics(sessions) {
    const metrics = {};

    sessions.forEach(session => {
        const allStudents = session.groups[currentGroupId] || [];
        const students = allStudents.filter(s => isStudentInCurrentHalfGroup(s.name));
        const dateStr = session.id.split('T')[0];

        if (!metrics[dateStr]) {
            metrics[dateStr] = {
                date: session.id,
                time: session.time,
                picks: 0,
                pluses: 0,
                minuses: 0,
                teamPluses: 0,
                teamMinuses: 0,
                badges: 0,
                badgePositive: 0,
                badgeNegative: 0,
                teamRoleEvents: 0,
                students: new Set()
            };
        }

        metrics[dateStr].teamRoleEvents += getSessionTeamRoleEvents(session, currentGroupId).filter(e => {
            if (!currentHalfGroup) return true;
            const target = e.target ? String(e.target).toUpperCase() : '';
            return !target || isStudentInCurrentHalfGroup(target);
        }).length;

        students.forEach(student => {
            metrics[dateStr].picks += student.isPicked ? 1 : 0;
            metrics[dateStr].pluses += student.pluses || 0;
            metrics[dateStr].minuses += student.minuses || 0;
            metrics[dateStr].teamPluses += student.teamPluses || 0;
            metrics[dateStr].teamMinuses += student.teamMinuses || 0;
            const studentBadges = student.badges || [];
            const badgeSentiment = countBadgeSentiment(studentBadges);
            metrics[dateStr].badges += studentBadges.length;
            metrics[dateStr].badgePositive += badgeSentiment.positive;
            metrics[dateStr].badgeNegative += badgeSentiment.negative;
            metrics[dateStr].students.add(student.name);
        });
    });

    return Object.values(metrics).map(m => ({
        ...m,
        students: m.students.size
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function formatBadges(badges) {
    if (!badges || badges.length === 0) return '-';
    const map = {};
    badges.forEach(badge => {
        const resolvedBadge = resolveBadgeData(badge);
        const key = `${resolvedBadge.icon}|${resolvedBadge.label}` || JSON.stringify(badge);
        if (!map[key]) {
            map[key] = {
                icon: resolvedBadge.icon || '🏅',
                label: resolvedBadge.label || 'Badge',
                count: 0,
                sentiment: resolvedBadge.tone,
                meaning: resolvedBadge.meaning
            };
        }
        map[key].count++;
    });
    return Object.values(map).map(badge => {
        const color = badge.sentiment === 'positive' ? '#2ca02c' : (badge.sentiment === 'negative' ? '#d62728' : 'inherit');
        const tooltip = [badge.label, badge.meaning, badge.sentiment].filter(Boolean).join(' — ');
        return `<span title="${tooltip}" style="font-size:1.1em; color:${color};">${badge.icon}${badge.count > 1 ? `<sup style="font-size:0.65em;">${badge.count}</sup>` : ''}</span>`;
    }).join(' ');
}

function getBadgeSentiment(badge) {
    return resolveBadgeData(badge).tone;
}

function countBadgeSentiment(badges) {
    return (badges || []).reduce((acc, badge) => {
        const data = resolveBadgeData(badge);
        const weight = data.coefficient;
        if (data.tone === 'positive') acc.positive += weight;
        if (data.tone === 'negative') acc.negative += weight;
        return acc;
    }, { positive: 0, negative: 0 });
}

function getSessionTeamRoleEvents(session, groupId, studentName) {
    if (!session || !Array.isArray(session.sessionHistory)) return [];
    const target = studentName ? String(studentName).toUpperCase() : null;

    return session.sessionHistory.filter(entry => {
        const type = String(entry.type || '').toLowerCase();
        const isTeamRoleType = type === 'teams' || type === 'role' || type === 'rank' || type === 'role-change' || type === 'team-plus' || type === 'team-minus';
        if (!isTeamRoleType) return false;
        if (entry.group && entry.group !== groupId) return false;
        if (target && String(entry.studentName || '').toUpperCase() !== target) return false;
        return true;
    });
}

function formatTeamRoleEventsPreview(events, maxLen) {
    if (!events || events.length === 0) return '(none)';
    const summary = events.map(e => `${e.time || ''} ${e.detail || ''}`.trim()).join(' | ');
    return summary.length > maxLen ? summary.substring(0, maxLen) + '...' : summary;
}

