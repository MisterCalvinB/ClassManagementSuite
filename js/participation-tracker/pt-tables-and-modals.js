// Participation Tracker — KPI Stats, History Table, Student Details & Edit Modal
function updateStats(sessions) {
    const metrics = aggregateMetrics(sessions);
    const sessionCount = metrics.length;
    const totals = metrics.reduce((sum, m) => ({
        picks: sum.picks + m.picks,
        pluses: sum.pluses + m.pluses,
        minuses: sum.minuses + m.minuses,
        teamPluses: sum.teamPluses + m.teamPluses,
        teamMinuses: sum.teamMinuses + m.teamMinuses,
        badges: sum.badges + m.badges,
        badgePositive: sum.badgePositive + m.badgePositive,
        badgeNegative: sum.badgeNegative + m.badgeNegative
    }), { picks: 0, pluses: 0, minuses: 0, teamPluses: 0, teamMinuses: 0, badges: 0, badgePositive: 0, badgeNegative: 0 });

    const totalPositive = totals.pluses + totals.teamPluses;
    const totalNegative = totals.minuses + totals.teamMinuses;
    const totalNet = totalPositive + totals.badgePositive - totalNegative - totals.badgeNegative;
    const perSession = sessionCount > 0
        ? {
            positive: totalPositive / sessionCount,
            negative: totalNegative / sessionCount,
            badges: totals.badges / sessionCount,
            net: totalNet / sessionCount
        }
        : { positive: 0, negative: 0, badges: 0, net: 0 };

    document.getElementById('statPicks').textContent = totals.picks;
    document.getElementById('statPluses').textContent = `${totalPositive} (T+${totals.teamPluses})`;
    document.getElementById('statPlusesPerSession').textContent = `${perSession.positive.toFixed(2)}${t('ptPerSession')}`;
    document.getElementById('statMinuses').textContent = `${totalNegative} (T-${totals.teamMinuses})`;
    document.getElementById('statMinusesPerSession').textContent = `${perSession.negative.toFixed(2)}${t('ptPerSession')}`;
    document.getElementById('statBadges').textContent = `${totals.badges} (+${totals.badgePositive} / -${totals.badgeNegative})`;
    document.getElementById('statBadgesPerSession').textContent = `${perSession.badges.toFixed(2)}${t('ptPerSession')}`;
    document.getElementById('statNet').textContent = `${totalNet >= 0 ? '+' : ''}${formatSummaryNumber(totalNet)}`;
    document.getElementById('statNet').style.color = totalNet >= 0 ? '#2ca02c' : '#d62728';
    document.getElementById('statNetPerSession').textContent = `${perSession.net >= 0 ? '+' : ''}${perSession.net.toFixed(2)}${t('ptPerSession')}`;
    document.getElementById('statNetPerSession').style.color = perSession.net >= 0 ? '#2ca02c' : '#d62728';
}

function updateHistoryTable(sessions) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const metrics = aggregateMetrics(sessions);

    metrics.sort((a, b) => {
        const col = historySortCol;
        let av, bv;
        if (col === 'date') {
            av = new Date(a.date).getTime() || 0;
            bv = new Date(b.date).getTime() || 0;
        } else if (col === 'time') {
            av = a.time || '';
            bv = b.time || '';
        } else if (col === 'teamRoleEvents') {
            const sessionA = sessions.find(s => s.id === a.date);
            const sessionB = sessions.find(s => s.id === b.date);
            av = sessionA ? getSessionTeamRoleEvents(sessionA, currentGroupId).length : 0;
            bv = sessionB ? getSessionTeamRoleEvents(sessionB, currentGroupId).length : 0;
        } else {
            av = a[col] ?? 0;
            bv = b[col] ?? 0;
        }

        if (typeof av === 'string') {
            return av.localeCompare(bv) * historySortDir;
        }
        return (av - bv) * historySortDir;
    });

    document.querySelectorAll('#historyTable thead th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const c = th.dataset.sort || th.dataset.col;
        if (c === historySortCol) th.classList.add(historySortDir === 1 ? 'sort-asc' : 'sort-desc');
    });

    const colOrder = getColOrder('historyTable');
    const hidden = getHiddenColsSet('historyTable');
    const orderKey = colOrder.join(',');
    const hiddenKey = Array.from(hidden).sort().join(',');

    const createHistoryRow = () => {
        const row = document.createElement('tr');
        row.className = 'expandable-row';
        row.addEventListener('click', () => {
            const metricDate = row.dataset.metricDate;
            if (!metricDate) return;
            const session = sessions.find(s => s.id === metricDate);
            if (!session) return;

            selectedHistorySessionId = selectedHistorySessionId === metricDate ? null : metricDate;
            currentStudentName = null;
            document.getElementById('studentDetailsArea').classList.add('hidden');
            document.getElementById('studentDetailTitle').classList.add('hidden');

            const selectedOnlySession = selectedHistorySessionId ? [session] : sessions;
            updateClassOverviewTable(selectedOnlySession);
            setClassOverviewTitle(selectedHistorySessionId ? session : null);
            updateHistoryTable(sessions);

            if (selectedHistorySessionId) {
                renderSessionTimeline(session, { openModal: false });
            } else {
                closeSessionTimelinePanel();
            }
        });
        return row;
    };

    const updateHistoryRow = (row, metric) => {
        row.dataset.metricDate = metric.date;
        if (window.DomSync) {
            DomSync.setClass(row, 'selected-session-row', metric.date === selectedHistorySessionId);
        } else {
            row.className = `expandable-row${metric.date === selectedHistorySessionId ? ' selected-session-row' : ''}`;
        }

        const session = sessions.find(s => s.id === metric.date);
        const isExam = isExamSession(session, currentGroupId);
        const notes = getGroupSessionNotes(session);
        const objectives = getSessionObjectives(session);
        const sessionEvents = getSessionTeamRoleEvents(session, currentGroupId);
        const slot = resolveSessionPlannerSlot(session, currentGroupId);

        const sig = `${orderKey}|${hiddenKey}|${metric.time || ''}|${metric.picks}|${metric.pluses}|${metric.minuses}|${metric.teamPluses || 0}|${metric.teamMinuses || 0}|${metric.badgePositive || 0}|${metric.badgeNegative || 0}|${sessionEvents.length}|${metric.students}|${metric.badges || ''}|${isExam ? 1 : 0}|${notes || ''}|${objectives || ''}|${slot ? slot.time + '-' + slot.timeEnd : ''}`;
        if (row.dataset.syncSig === sig) return;
        row.dataset.syncSig = sig;

        const date = new Date(metric.date);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const examBadge = isExam ? ` <span class="pt-exam-pill" title="${t('ptActionExitExamTitle') || t('ptBadgeExam')}" onclick="event.stopPropagation(); toggleSessionExam('${session ? session.id : metric.date}')">${t('ptBadgeExam')}</span>` : '';
        const notesPreview = notes ? notes.substring(0, 50) : '';
        const objectivesPreview = objectives ? objectives.replace(/\s+/g, ' ').substring(0, 60) : '';

        let timeCellContent = escapeHtml(metric.time || '-');
        if (slot && slot.time) {
            const isExplicit = !!(session && (session.plannerSlot || session.plannerEntryId));
            const pillClass = isExplicit ? 'pt-slot-explicit' : 'pt-slot-auto';
            const pillTitle = isExplicit
                ? (t('ptSlotExplicitTitle') || 'Explicitly linked planner slot')
                : (t('ptSlotAutoTitle') || 'Auto-matched planner slot');
            timeCellContent = `
                <div class="pt-slot-cell" onclick="event.stopPropagation(); openSessionTimeline('${escapeHtml(session ? session.id : metric.date)}', { openModal: false });" title="${escapeHtml(pillTitle)}: ${escapeHtml(slot.time)} – ${escapeHtml(slot.timeEnd)}">
                    <span class="pt-slot-pill ${pillClass}">
                        <img src="../assets/icons/planner.svg" class="btn-icon" style="width:11px;height:11px;vertical-align:-1px;" alt="" />
                        <span>${escapeHtml(slot.time)}–${escapeHtml(slot.timeEnd)}</span>
                    </span>
                    ${metric.time && metric.time.slice(0, 5) !== slot.time ? `<span class="pt-slot-raw-time" title="Session logged at ${escapeHtml(metric.time)}">${escapeHtml(metric.time)}</span>` : ''}
                </div>
            `;
        }

        const cells = {
            date: `<td>${dateStr}${examBadge}</td>`,
            time: `<td>${timeCellContent}</td>`,
            picks: `<td>${metric.picks}</td>`,
            pluses: `<td>${metric.pluses}</td>`,
            minuses: `<td>${metric.minuses}</td>`,
            teamPluses: `<td style="color: #1f5a2b; font-weight: 600;">${metric.teamPluses || 0}</td>`,
            teamMinuses: `<td style="color: #8a1e1e; font-weight: 600;">${metric.teamMinuses || 0}</td>`,
            badgePositive: `<td style="color: #2ca02c; font-weight: 600;">${metric.badgePositive || 0}</td>`,
            badgeNegative: `<td style="color: #d62728; font-weight: 600;">${metric.badgeNegative || 0}</td>`,
            teamRoleEvents: `<td>${sessionEvents.length}</td>`,
            students: `<td>${metric.students}</td>`,
            badges: `<td>${metric.badges || '-'}</td>`,
            objectives: `<td><span class="notes-preview ${objectives ? '' : 'empty'}">${objectives ? escapeHtml(objectivesPreview) + (objectivesPreview.length < objectives.replace(/\s+/g, ' ').length ? '...' : '') : '(none)'}</span></td>`,
            notes: `<td><span class="notes-preview ${notes ? '' : 'empty'}">${notes ? escapeHtml(notesPreview) + (notesPreview.length < notes.length ? '...' : '') : '(no notes)'}</span></td>`,
            actions: `<td></td>`
        };

        row.innerHTML = colOrder.map(colId => {
            const cell = cells[colId] || `<td></td>`;
            const isHidden = hidden.has(colId);
            return cell.replace('<td', `<td data-col="${colId}" class="${isHidden ? 'col-hidden' : ''}"${isHidden ? ' style="display:none;"' : ''}`);
        }).join('');

        const actionsCell = row.querySelector('td[data-col="actions"]') || row.cells[row.cells.length - 1];
        if (actionsCell) {
            actionsCell.innerHTML = '';
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'history-row-actions';

            const timelineBtn = document.createElement('button');
            timelineBtn.type = 'button';
            timelineBtn.className = 'btn-timeline-row';
            timelineBtn.setAttribute('data-session-id', session ? session.id : metric.date);
            timelineBtn.title = t('ptTimelineBtnTitle') || 'View detailed interaction timeline for this session';
            timelineBtn.innerHTML = `<img src="../assets/icons/clock.svg" class="btn-icon" alt="" /> <span>${t('ptTimelineBtn') || 'Timeline'}</span>`;
            timelineBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openSessionTimeline(session || metric.date, { openModal: true });
            });
            actionsWrap.appendChild(timelineBtn);

            const examBtn = document.createElement('button');
            examBtn.type = 'button';
            examBtn.className = isExam ? 'btn-exam-row active' : 'btn-exam-row';
            examBtn.title = isExam ? t('ptActionExitExamTitle') : t('ptActionMakeExamTitle');
            examBtn.innerHTML = `<img src="../assets/icons/test-creator.svg" class="btn-icon" alt="" /> <span>${isExam ? t('ptActionExitExam') : t('ptActionMakeExam')}</span>`;
            examBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSessionExam(session ? session.id : metric.date);
            });
            actionsWrap.appendChild(examBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-reset-row';
            deleteBtn.innerHTML = '<img src="../assets/icons/delete.svg" class="btn-icon" alt="" /> <span>Delete</span>';
            deleteBtn.title = 'Delete this session';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openResetModal('session', metric.date);
            });
            actionsWrap.appendChild(deleteBtn);

            actionsCell.appendChild(actionsWrap);
        }
    };

    if (window.DomSync && typeof DomSync.renderWindowedRows === 'function') {
        DomSync.renderWindowedRows(tbody, metrics, m => m.date, createHistoryRow, updateHistoryRow, {
            threshold: 60,
            rowHeight: 46,
            overscan: 12,
            colSpan: colOrder.length
        });
    } else {
        tbody.innerHTML = '';
        metrics.forEach(m => {
            const r = createHistoryRow();
            updateHistoryRow(r, m);
            tbody.appendChild(r);
        });
    }
    applyHiddenCols('historyTable');
}

function toggleSelectedSessionExam() {
    if (!selectedHistorySessionId) return;
    toggleSessionExam(selectedHistorySessionId);
}

async function toggleSessionExam(sessionId) {
    if (!sessionId) return;
    const session = DB_EXPORT.find(s => s && (s.id === sessionId || s.date === sessionId));
    if (!session) return;

    const currentExam = isExamSession(session, currentGroupId);
    const newExam = !currentExam;

    session.isExam = newExam;
    session.examSession = newExam;

    if (session.groups && typeof session.groups === 'object') {
        const targetGroups = (currentGroupId && session.groups[currentGroupId])
            ? [session.groups[currentGroupId]]
            : Object.values(session.groups);
        targetGroups.forEach(grp => {
            if (Array.isArray(grp)) {
                grp.forEach(st => {
                    st.inExam = newExam;
                });
            }
        });
    }

    // Sync to localStorage 'cms-db' if present
    try {
        const raw = localStorage.getItem('cms-db');
        if (raw) {
            const localSessions = JSON.parse(raw);
            const lsIdx = localSessions.findIndex(s => s && (s.id === session.id || s.date === session.date));
            if (lsIdx !== -1) {
                localSessions[lsIdx].isExam = newExam;
                localSessions[lsIdx].examSession = newExam;
                if (localSessions[lsIdx].groups && typeof localSessions[lsIdx].groups === 'object') {
                    Object.values(localSessions[lsIdx].groups).forEach(grp => {
                        if (Array.isArray(grp)) {
                            grp.forEach(st => { st.inExam = newExam; });
                        }
                    });
                }
                localStorage.setItem('cms-db', JSON.stringify(localSessions));
            }
        }
    } catch (_) {}

    syncGlobalDbExport();

    if (currentGroupId) {
        await persistEditedGroupSessionsToDisk(currentGroupId);
    }

    const msg = newExam 
        ? (t('ptMsgSessionMarkedExam') || 'Session marked as exam retroactively.')
        : (t('ptMsgSessionUnmarkedExam') || 'Exam status removed from session.');
    showMessage(msg, 'success');

    updateDashboard();

    if (currentStudentName) {
        updateStudentDetails();
    }
}

function getStudentNotesText(student) {
    const parts = [];
    if (student.notes) parts.push(student.notes);
    if (student.comments && student.comments.length > 0) {
        parts.push(student.comments.map(c => c.text).join('; '));
    }
    return parts.join(' | ');
}

function getSessionObjectives(session) {
    return String((session && (session.lessonObjectives ?? session.objectives)) || '').trim();
}

function getGroupSessionNotes(session) {
    if (!session || !session.groups || !session.groups[currentGroupId]) return '';
    const students = session.groups[currentGroupId];
    const notes = students.map(s => getStudentNotesText(s)).filter(n => n).join(' | ');
    return notes;
}

function updateStudentDetails() {
    if (!currentStudentName || !currentGroupId) return;

    const studentDetailTitle = document.getElementById('studentDetailTitle');
    if (studentDetailTitle) {
        const formattedName = getPtStudentDisplayName(currentStudentName);
        studentDetailTitle.textContent = `${t('ptStudentDetailTitle') || 'Individual Student Analysis'} — ${formattedName}`;
    }

    const dateRange = getDateRange();
    const allSessionsInRange = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);
    const participationSessions = allSessionsInRange.filter(s => !isExamSession(s, currentGroupId));

    // Retrieve student record from classOverviewData or cached overall map or compute overall data identically
    let stOverview = (Array.isArray(classOverviewData) ? classOverviewData.find(d => d.name === currentStudentName) : null);
    let overallData = (stOverview && stOverview.overall)
        ? stOverview.overall
        : ((window._ptLastOverallStudentMap && window._ptLastOverallStudentMap[currentStudentName]) || (stOverview && !stOverview.overall ? stOverview : null));

    if (!overallData) {
        const os = {
            name: currentStudentName,
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
        participationSessions.forEach(session => {
            const st = (session.groups[currentGroupId] || []).find(s => s.name === currentStudentName);
            if (st) {
                os.sessions++;
                if (!st.isAbsent) os.attendedSessions++;
                if (st.isPicked) os.picks++;
                if (st.isAbsent) os.absent++;
                os.pluses += st.pluses || 0;
                os.minuses += st.minuses || 0;
                os.teamPluses += st.teamPluses || 0;
                os.teamMinuses += st.teamMinuses || 0;
                const studentBadges = st.badges || [];
                const badgeSentiment = countBadgeSentiment(studentBadges);
                os.badges = os.badges.concat(studentBadges);
                os.badgePositive += badgeSentiment.positive;
                os.badgeNegative += badgeSentiment.negative;
                const studentEvents = getSessionTeamRoleEvents ? getSessionTeamRoleEvents(session, currentGroupId, currentStudentName) : [];
                os.teamRoleEvents += studentEvents.length;
                if (!st.isAbsent) {
                    os.sessionNets.push(getStudentSessionNet(st));
                }
            }
        });
        overallData = os;
    }

    const total = overallData.sessions || 0;
    const absent = overallData.absent || 0;
    const picks = overallData.picks || 0;
    const pluses = overallData.pluses || 0;
    const minuses = overallData.minuses || 0;
    const teamPluses = overallData.teamPluses || 0;
    const teamMinuses = overallData.teamMinuses || 0;
    const badges = (overallData.badges || []).length;
    const badgePositive = overallData.badgePositive || 0;
    const badgeNegative = overallData.badgeNegative || 0;
    const net = getClassOverviewNet(overallData);

    // Calculate provisional grade using the exact same function and data as overview table
    const gradeDetails = calculateStudentProvisionalGradeDetails(stOverview || overallData);
    const provGrade = gradeDetails ? gradeDetails.grade : null;
    
    let provGradeHtml = '';
    const rulesConfig = (window.CMS_PARTICIPATION_RULES && (window.CMS_PARTICIPATION_RULES[currentGroupId] || window.CMS_PARTICIPATION_RULES['_default'])) || null;
    if (provGrade !== null && rulesConfig && gradeDetails && Array.isArray(gradeDetails.rules)) {
        const maxText = rulesConfig.scaleToMax ? ` / ${rulesConfig.maxGrade}` : '';
        
        const achievedRuleLabels = gradeDetails.rules.map(rd => {
            const isMet = rd.rawPoints > (Number(rd.minPts) || 0);
            const ptsDisplay = `${formatSummaryNumber(rd.points)} / ${formatSummaryNumber(rd.maxPoints)} pts`;
            const labelText = rd.valueLabel ? `${rd.name} [${rd.valueLabel}]` : rd.name;
            if (isMet) {
                return `<span style="color:#15803d; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/check.svg" class="btn-icon" alt="" style="width:13px; height:13px; vertical-align:-1px; filter: brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(467%) hue-rotate(86deg) brightness(97%) contrast(90%);" /> ${escapeHtml(labelText)} (${ptsDisplay})</span>`;
            } else {
                return `<span style="color:#64748b; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:13px; height:13px; vertical-align:-1px; opacity:0.6;" /> ${escapeHtml(labelText)} (${ptsDisplay})</span>`;
            }
        });

        provGradeHtml = `
            <div class="detail-stat" style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; border-left-color: #22c55e; background: #f0fdf4;">
                <div>
                    <div class="detail-stat-label" style="color: #15803d; font-weight:800;">${t('ptProvisionalGradeTitle')}</div>
                    <div class="detail-stat-value" style="color: #15803d;">${formatSummaryNumber(provGrade)}${maxText}</div>
                </div>
                <div style="font-size:11px; text-align:left; border-left: 2px solid #bbf7d0; padding-left: 15px; margin-left: 15px; flex: 1;">
                    <strong style="color:#1e293b;">${t('ptAchievedRulesTitle')}</strong><br>
                    ${achievedRuleLabels.join('<br>')}
                </div>
            </div>
        `;
    }

    // Check for student enrollment history across multiple groups
    let crossGroupHtml = '';
    const roster = _ptRoster();
    const rosterStudent = Object.values(roster).find(s => {
        if (!s) return false;
        const fn = (s.firstName || '').trim().toUpperCase();
        const ln = (s.lastName || '').trim().toUpperCase();
        return (fn + ' ' + ln).trim() === currentStudentName.toUpperCase();
    });

    if (rosterStudent && Array.isArray(rosterStudent.enrollments) && rosterStudent.enrollments.length > 0) {
        const enrs = rosterStudent.enrollments;
        // Calculate cross-group totals across all DB_EXPORT sessions
        let cgPicks = 0, cgPluses = 0, cgMinuses = 0, cgBadges = 0, cgSessions = 0;
        DB_EXPORT.forEach(sess => {
            if (!sess.groups) return;
            Object.keys(sess.groups).forEach(gid => {
                (sess.groups[gid] || []).forEach(st => {
                    if (st && st.name && st.name.toUpperCase() === currentStudentName.toUpperCase()) {
                        cgSessions++;
                        if (st.isPicked) cgPicks++;
                        cgPluses += (st.pluses || 0) + (st.teamPluses || 0);
                        cgMinuses += (st.minuses || 0) + (st.teamMinuses || 0);
                        cgBadges += (st.badges || []).length;
                    }
                });
            });
        });

        const pillsHtml = enrs.map(e => {
            const isCurrent = e.groupUuid === currentGroupId;
            const pillStyle = isCurrent
                ? 'background:#1e40af; color:#fff; font-weight:800; border:2px solid #111;'
                : 'background:#fff; color:#334155; border:2px solid #111;';
            const yrSem = [e.year, e.semester ? 'S' + e.semester : '', e.level ? 'Lvl ' + e.level : ''].filter(Boolean).join(' ');
            return `<span style="font-size:0.75rem; padding:3px 8px; border-radius:4px; ${pillStyle}">${escapeHtml(e.groupName || e.groupUuid)}${yrSem ? ' (' + escapeHtml(yrSem) + ')' : ''}</span>`;
        }).join(' ');

        crossGroupHtml = `
            <div class="detail-stat" style="grid-column: 1 / -1; background:#f0f7ff; border:2.5px solid #111; box-shadow:3.5px 3.5px 0 #111; border-radius:8px; padding:14px 16px; margin-top:8px; text-align:left;">
                <div style="font-size:0.78rem; font-weight:900; text-transform:uppercase; letter-spacing:0.5px; color:#1e40af; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                    <span style="display:inline-flex; align-items:center; gap:6px;"><img src="../assets/icons/history.svg" class="btn-icon" alt="" style="width:16px; height:16px; vertical-align:-2px;" /> ${escapeHtml(t('ptEnrollmentHistory') || 'Enrollment History')} (${enrs.length} ${enrs.length === 1 ? 'group' : 'groups'})</span>
                    <span style="font-size:0.7rem; font-family:monospace; color:#1e40af; background:#fff; padding:2px 6px; border-radius:4px; border:2px solid #111;">${escapeHtml(rosterStudent.uuid)}</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
                    ${pillsHtml}
                </div>
                <div style="font-size:0.78rem; color:#1e293b; background:#fff; padding:8px 12px; border-radius:6px; border:2px solid #111; box-shadow:2px 2px 0 #111; display:flex; gap:16px; flex-wrap:wrap; align-items:center;">
                    <span><strong>${escapeHtml(t('ptAggregatedStats') || 'All-Groups Total')}:</strong></span>
                    <span style="display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/class-management.svg" class="btn-icon" alt="" style="width:15px; height:15px; vertical-align:-2px;" /> <strong>${cgPicks}</strong> picks (${cgSessions} sessions)</span>
                    <span style="color:#15803d; font-weight:800;">+<strong>${cgPluses}</strong></span>
                    <span style="color:#dc2626; font-weight:800;">-<strong>${cgMinuses}</strong></span>
                    <span style="color:#b45309; font-weight:800; display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/award.svg" class="btn-icon" alt="" style="width:15px; height:15px; vertical-align:-2px;" /> <strong>${cgBadges}</strong> badges</span>
                </div>
            </div>
        `;
    }

    // Update detail stats
    const detailStats = document.getElementById('studentDetailStats');
    detailStats.innerHTML = `
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsSessionsRecorded')}</div>
            <div class="detail-stat-value">${total}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsTimesPicked')}</div>
            <div class="detail-stat-value">${picks}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsAbsent')}</div>
            <div class="detail-stat-value">${absent}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsNetPoints')}</div>
            <div class="detail-stat-value" style="color: ${net >= 0 ? '#2ca02c' : '#d62728'}">${net >= 0 ? '+' : ''}${net}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsTeamPts')}</div>
            <div class="detail-stat-value" style="color: #444">${teamPluses} / ${teamMinuses}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsBadgesEarned')}</div>
            <div class="detail-stat-value" style="color: #7a5a00">${badges}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsPosBadges')}</div>
            <div class="detail-stat-value" style="color: #2ca02c">${badgePositive}</div>
        </div>
        <div class="detail-stat">
            <div class="detail-stat-label">${t('ptStatsNegBadges')}</div>
            <div class="detail-stat-value" style="color: #d62728">${badgeNegative}</div>
        </div>
        ${provGradeHtml}
        ${crossGroupHtml}
    `;

    // Filter student sessions and sort them
    const studentSessions = [];
    allSessionsInRange.forEach(session => {
        const students = session.groups[currentGroupId] || [];
        const student = students.find(s => s.name === currentStudentName);
        if (student) {
            studentSessions.push({
                session: session,
                student: student,
                dateMs: new Date(session.id).getTime() || 0,
                time: session.time || '',
                picked: student.isPicked ? 1 : 0,
                absent: student.isAbsent ? 1 : 0,
                pluses: student.pluses || 0,
                minuses: student.minuses || 0,
                teamPluses: student.teamPluses || 0,
                teamMinuses: student.teamMinuses || 0,
                badges: (student.badges || []).length,
                teamRoleEvents: getSessionTeamRoleEvents(session, currentGroupId, currentStudentName).length,
                notes: (getStudentNotesText(student) || '').length
            });
        }
    });

    studentSessions.sort((a, b) => {
        const col = studentTableSortCol;
        let av = a[col] ?? 0;
        let bv = b[col] ?? 0;
        if (col === 'date') { av = a.dateMs; bv = b.dateMs; }
        if (typeof av === 'string') return av.localeCompare(bv) * studentTableSortDir;
        return (av - bv) * studentTableSortDir;
    });

    document.querySelectorAll('#studentTable thead th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const c = th.dataset.sort || th.dataset.col;
        if (c === studentTableSortCol) th.classList.add(studentTableSortDir === 1 ? 'sort-asc' : 'sort-desc');
    });

    // Update student table
    const studentTbody = document.getElementById('studentTableBody');
    studentTbody.innerHTML = '';

    studentSessions.forEach(item => {
        const session = item.session;
        const student = item.student;
        const date = new Date(session.id);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

        const row = document.createElement('tr');
        row.className = 'expandable-row';
        const notesText = getStudentNotesText(student);
        const notesPreview = notesText ? notesText.substring(0, 50) : '';
        const teamRoleEvents = getSessionTeamRoleEvents(session, currentGroupId, currentStudentName);
        const teamRolePreview = formatTeamRoleEventsPreview(teamRoleEvents, 70);

        const isExam = isExamSession(session, currentGroupId);
        const examBadge = isExam ? ` <span class="pt-exam-pill" title="${t('ptBadgeExam')}">${t('ptBadgeExam')}</span>` : '';

        const cells = {
            date: `<td>${dateStr}${examBadge}</td>`,
            time: `<td>${session.time || '-'}</td>`,
            picked: `<td>${student.isPicked ? '✓' : '-'}</td>`,
            absent: `<td>${student.isAbsent ? '✓' : '-'}</td>`,
            pluses: `<td>${student.pluses || 0}</td>`,
            minuses: `<td>${student.minuses || 0}</td>`,
            teamPluses: `<td style="color: #1f5a2b; font-weight: 600;">${student.teamPluses || 0}</td>`,
            teamMinuses: `<td style="color: #8a1e1e; font-weight: 600;">${student.teamMinuses || 0}</td>`,
            badges: `<td>${formatBadges(student.badges)}</td>`,
            teamRoleEvents: `<td><span class="notes-preview ${teamRoleEvents.length ? '' : 'empty'}">${escapeHtml(teamRolePreview)}</span></td>`,
            notes: `<td><span class="notes-preview ${notesText ? '' : 'empty'}">${notesText ? escapeHtml(notesPreview) + (notesPreview.length < notesText.length ? '...' : '') : '(no notes)'}</span></td>`
        };

        const colOrder = getColOrder('studentTable');
        const hidden = getHiddenColsSet('studentTable');

        row.innerHTML = colOrder.map(colId => {
            const cell = cells[colId] || `<td></td>`;
            const isHidden = hidden.has(colId);
            return cell.replace('<td', `<td data-col="${colId}" class="${isHidden ? 'col-hidden' : ''}"${isHidden ? ' style="display:none;"' : ''}`);
        }).join('');

            row.addEventListener('click', () => {
                currentSessionId = session.id;
                editingStudentId = student.id;
                showStudentDetailModal(student, session);
            });

            studentTbody.appendChild(row);
    });

    document.getElementById('studentDetailsArea').classList.remove('hidden');
    applyHiddenCols('studentTable');
    renderStudentChart(participationSessions, currentStudentName);
}

function showDetailModal(metric, session) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('detailModalTitle');
    const body = document.getElementById('detailModalBody');

    title.textContent = `Session Notes - ${new Date(metric.date).toLocaleDateString()}`;

    const students = session.groups[currentGroupId] || [];
    let notes = students.map(s => `${s.name}: ${s.notes || '(no notes)'}`).join('\n\n');

    document.getElementById('notesTextarea').value = notes;
    document.getElementById('notesTextarea').disabled = true;

    const objectives = getSessionObjectives(session);

    body.innerHTML = `
        <p><strong>Total Picks:</strong> ${metric.picks}</p>
        <p><strong>Total Pluses:</strong> ${metric.pluses}</p>
        <p><strong>Total Minuses:</strong> ${metric.minuses}</p>
        <p><strong>Total Team Pluses (T+):</strong> ${metric.teamPluses || 0}</p>
        <p><strong>Total Team Minuses (T-):</strong> ${metric.teamMinuses || 0}</p>
        <p><strong>Team/Role Events:</strong> ${getSessionTeamRoleEvents(session, currentGroupId).length}</p>
        <p><strong>Students Present:</strong> ${metric.students}</p>
        <p><strong>Lesson Objectives:</strong><br>${objectives ? objectives.replace(/\n/g, '<br>') : '(none recorded)'}</p>
    `;

    modal.classList.add('active');
}

function getStudentPointTimestamps(session, groupId, student, typeName) {
    if (!student) return [];
    if (session && Array.isArray(session.sessionHistory)) {
        const targetStudent = String(student.name || '').trim().toUpperCase();
        const teamId = student.teamId;

        const matches = session.sessionHistory.filter(entry => {
            if (!entry) return false;
            if (entry.group && entry.group !== groupId) return false;
            const entryType = String(entry.type || '').toLowerCase();
            if (entryType !== typeName.toLowerCase()) return false;

            const entryStudent = String(entry.studentName || '').trim().toUpperCase();
            if (entryStudent === targetStudent) return true;

            if (typeName === 'team-plus' || typeName === 'team-minus') {
                if (teamId != null) {
                    if (entryStudent.includes(`TEAM ${teamId}`) || entryStudent.startsWith(`${teamId}.`)) return true;
                    if (entry.detail && String(entry.detail).toLowerCase().includes(`team ${teamId}`)) return true;
                }
            }
            return false;
        });

        if (matches.length > 0) {
            return matches.map(e => formatTimeWithSeconds(e.time || e.timestamp || session.time || session.id)).filter(Boolean);
        }
    }

    // Fallback to student point history on the student object if sessionHistory is missing
    if (typeName === 'plus' && Array.isArray(student.plusHistory) && student.plusHistory.length) {
        return student.plusHistory.map(h => formatTimeWithSeconds(h.time || h.timestamp)).filter(Boolean);
    }
    if (typeName === 'minus' && Array.isArray(student.minusHistory) && student.minusHistory.length) {
        return student.minusHistory.map(h => formatTimeWithSeconds(h.time || h.timestamp)).filter(Boolean);
    }
    if (typeName === 'team-plus' && Array.isArray(student.teamPlusHistory) && student.teamPlusHistory.length) {
        return student.teamPlusHistory.map(h => formatTimeWithSeconds(h.time || h.timestamp)).filter(Boolean);
    }
    if (typeName === 'team-minus' && Array.isArray(student.teamMinusHistory) && student.teamMinusHistory.length) {
        return student.teamMinusHistory.map(h => formatTimeWithSeconds(h.time || h.timestamp)).filter(Boolean);
    }

    return [];
}

function openStudentEditModal(studentName) {
    showStudentDetailModal(studentName, null);
}

function showStudentDetailModal(studentOrName, session) {
    const studentName = (typeof studentOrName === 'string') ? studentOrName : (studentOrName && studentOrName.name ? studentOrName.name : currentStudentName);
    if (!studentName) return;

    if (!currentGroupId) {
        const activeBtn = document.querySelector('#groupButtons .group-btn.active, #groupButtons button.active');
        if (activeBtn) currentGroupId = activeBtn.dataset.groupId || activeBtn.dataset.group || activeBtn.textContent.trim();
    }
    if (!currentGroupId && typeof DB_EXPORT !== 'undefined' && DB_EXPORT.length > 0) {
        for (const s of DB_EXPORT) {
            if (s.groups && Object.keys(s.groups).length > 0) {
                currentGroupId = Object.keys(s.groups)[0];
                break;
            }
        }
    }
    if (!currentGroupId) return;

    const allGroupSessions = DB_EXPORT.filter(s => s.groups && s.groups[currentGroupId]);
    const studentSessions = [];

    allGroupSessions.forEach(sess => {
        const students = sess.groups[currentGroupId] || [];
        const st = students.find(s => s.name === studentName);
        if (st) {
            studentSessions.push({
                sessionId: sess.id,
                time: sess.time || '',
                studentData: JSON.parse(JSON.stringify(st))
            });
        }
    });

    let targetSession = session;
    if (!targetSession && studentSessions.length > 0) {
        targetSession = DB_EXPORT.find(s => s.id === studentSessions[0].sessionId);
    }

    let targetStudent = (targetSession && targetSession.groups && targetSession.groups[currentGroupId])
        ? targetSession.groups[currentGroupId].find(s => s.name === studentName)
        : null;

    if (!targetStudent && typeof studentOrName === 'object') {
        targetStudent = studentOrName;
    }

    if (!targetStudent) {
        targetStudent = {
            name: studentName,
            pluses: 0,
            minuses: 0,
            teamPluses: 0,
            teamMinuses: 0,
            isPicked: false,
            isAbsent: false,
            badges: [],
            notes: ''
        };
    }

    currentSessionId = targetSession ? targetSession.id : (studentSessions.length > 0 ? studentSessions[0].sessionId : null);
    editingStudentId = targetStudent ? targetStudent.id : null;

    editingStudentModalData = {
        name: studentName,
        groupId: currentGroupId,
        currentSessionId: currentSessionId,
        targetStudent: targetStudent,
        studentSessions: studentSessions
    };

    const modal = document.getElementById('detailModal');
    const title = document.getElementById('detailModalTitle');
    const groupName = (typeof groupDisplayName === 'function') ? groupDisplayName(currentGroupId) : currentGroupId;

    title.innerHTML = `<img src="../assets/icons/group-editor.svg" class="btn-icon" alt="" /> ${escapeHtml(studentName)} (${escapeHtml(groupName)})`;

    const notesInput = document.getElementById('notesTextarea');
    if (notesInput) {
        notesInput.disabled = false;
        notesInput.value = targetStudent.notes || '';
    }

    const dossierBtn = document.getElementById('pt-btn-student-dossier');
    if (dossierBtn) {
        dossierBtn.onclick = () => {
            const stId = editingStudentId || (targetStudent && (targetStudent.id || targetStudent.uuid)) || studentName;
            if (typeof TagLinkModal !== 'undefined') {
                TagLinkModal.openStudentDossier(stId, { title: studentName });
            }
        };
    }
    renderStudentDetailBodyContent();
    modal.classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
    currentSessionId = null;
    editingStudentId = null;
    editingStudentModalData = null;
}

function renderStudentDetailBodyContent() {
    if (!editingStudentModalData) return;

    const { name, targetStudent, studentSessions } = editingStudentModalData;
    const body = document.getElementById('detailModalBody');
    if (!body) return;

    let totalPicks = 0, totalAbsences = 0, totalPluses = 0, totalMinuses = 0, totalTeamPluses = 0, totalTeamMinuses = 0;

    studentSessions.forEach(item => {
        const st = item.studentData;
        if (st.isPicked) totalPicks++;
        if (st.isAbsent) totalAbsences++;
        totalPluses += Number(st.pluses) || 0;
        totalMinuses += Number(st.minuses) || 0;
        totalTeamPluses += Number(st.teamPluses) || 0;
        totalTeamMinuses += Number(st.teamMinuses) || 0;
    });

    const net = (totalPluses + totalTeamPluses) - (totalMinuses + totalTeamMinuses);

    let currentSessionFormHtml = '';
    if (targetStudent) {
        currentSessionFormHtml = `
            <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:16px;">
                <div style="font-size:0.82rem; font-weight:800; color:#0f172a; margin-bottom:8px;"><img src="../assets/icons/zap.svg" class="btn-icon" alt="" /> Current / Active Session Controls</div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:10px;">
                    <div>
                        <label style="font-size:0.72rem; font-weight:700; color:#2ca02c;">Pluses (+)</label>
                        <input type="number" id="editDetailPluses" class="past-input-num" value="${targetStudent.pluses || 0}" min="0" style="width:100%;" onchange="updateStudentEditField('${currentSessionId}', 'pluses', parseInt(this.value)||0)" oninput="updateStudentEditField('${currentSessionId}', 'pluses', parseInt(this.value)||0)">
                    </div>
                    <div>
                        <label style="font-size:0.72rem; font-weight:700; color:#d62728;">Minuses (-)</label>
                        <input type="number" id="editDetailMinuses" class="past-input-num" value="${targetStudent.minuses || 0}" min="0" style="width:100%;" onchange="updateStudentEditField('${currentSessionId}', 'minuses', parseInt(this.value)||0)" oninput="updateStudentEditField('${currentSessionId}', 'minuses', parseInt(this.value)||0)">
                    </div>
                    <div>
                        <label style="font-size:0.72rem; font-weight:700; color:#1f5a2b;">Team +</label>
                        <input type="number" id="editDetailTeamPluses" class="past-input-num" value="${targetStudent.teamPluses || 0}" min="0" style="width:100%;" onchange="updateStudentEditField('${currentSessionId}', 'teamPluses', parseInt(this.value)||0)" oninput="updateStudentEditField('${currentSessionId}', 'teamPluses', parseInt(this.value)||0)">
                    </div>
                    <div>
                        <label style="font-size:0.72rem; font-weight:700; color:#8a1e1e;">Team -</label>
                        <input type="number" id="editDetailTeamMinuses" class="past-input-num" value="${targetStudent.teamMinuses || 0}" min="0" style="width:100%;" onchange="updateStudentEditField('${currentSessionId}', 'teamMinuses', parseInt(this.value)||0)" oninput="updateStudentEditField('${currentSessionId}', 'teamMinuses', parseInt(this.value)||0)">
                    </div>
                    <div style="text-align:center;">
                        <label style="font-size:0.72rem; font-weight:700; color:#475569;">Picked</label>
                        <input type="checkbox" id="editDetailPicked" ${targetStudent.isPicked ? 'checked' : ''} style="display:block; margin:6px auto 0;" onchange="updateStudentEditField('${currentSessionId}', 'isPicked', this.checked)">
                    </div>
                    <div style="text-align:center;">
                        <label style="font-size:0.72rem; font-weight:700; color:#475569;">Absent</label>
                        <input type="checkbox" id="editDetailAbsent" ${targetStudent.isAbsent ? 'checked' : ''} style="display:block; margin:6px auto 0;" onchange="updateStudentEditField('${currentSessionId}', 'isAbsent', this.checked)">
                    </div>
                </div>
            </div>
        `;
    }


    body.innerHTML = `
        ${currentSessionFormHtml}

        <div class="student-edit-stats-summary" style="margin-bottom:16px;">
            <div class="student-edit-stat-card">
                <div class="label">${t('ptStatsSessionsRecorded')}</div>
                <div class="val">${studentSessions.length}</div>
            </div>
            <div class="student-edit-stat-card">
                <div class="label" style="color:#2ca02c;">${t('ptStatPluses')}</div>
                <div class="val" style="color:#2ca02c;">${totalPluses}</div>
            </div>
            <div class="student-edit-stat-card">
                <div class="label" style="color:#d62728;">${t('ptStatMinuses')}</div>
                <div class="val" style="color:#d62728;">${totalMinuses}</div>
            </div>
            <div class="student-edit-stat-card">
                <div class="label" style="color:#1f5a2b;">T+ / T-</div>
                <div class="val" style="color:#1f5a2b;">${totalTeamPluses} / ${totalTeamMinuses}</div>
            </div>
            <div class="student-edit-stat-card">
                <div class="label">${t('ptStatPicks')} / ${t('ptColAbs')}</div>
                <div class="val">${totalPicks} / ${totalAbsences}</div>
            </div>
            <div class="student-edit-stat-card">
                <div class="label">${t('ptStatNet')}</div>
                <div class="val" style="color:${net >= 0 ? '#2ca02c' : '#d62728'};">${net >= 0 ? '+' : ''}${net}</div>
            </div>
        </div>

        <div class="student-edit-section-title">
            <span data-i18n="ptModalPastInteractions">Past Session Interactions</span>
            <button type="button" class="btn-primary" style="font-size:11px; padding:4px 10px;" onclick="toggleAddPastInteractionForm()" data-i18n="ptModalAddInteraction">+ Add Past Interaction</button>
        </div>

        <div id="addPastInteractionBox" class="add-past-interaction-box hidden">
            <strong style="font-size: 0.82rem; color: #0f172a;">Log New Session Interaction Entry</strong>
            <div class="add-past-interaction-grid">
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#475569;">Date</label>
                    <input type="date" id="newInteractionDate" class="past-input-text" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#475569;">Time</label>
                    <input type="time" id="newInteractionTime" class="past-input-text" value="10:00">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#2ca02c;">Pluses (+)</label>
                    <input type="number" id="newInteractionPluses" class="past-input-num" value="0" min="0">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#d62728;">Minuses (-)</label>
                    <input type="number" id="newInteractionMinuses" class="past-input-num" value="0" min="0">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#1f5a2b;">Team +</label>
                    <input type="number" id="newInteractionTeamPluses" class="past-input-num" value="0" min="0">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#8a1e1e;">Team -</label>
                    <input type="number" id="newInteractionTeamMinuses" class="past-input-num" value="0" min="0">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#475569;">Picked?</label>
                    <input type="checkbox" id="newInteractionPicked" style="display:block; margin-top:6px;">
                </div>
                <div>
                    <label style="font-size: 0.7rem; font-weight:700; color:#475569;">Absent?</label>
                    <input type="checkbox" id="newInteractionAbsent" style="display:block; margin-top:6px;">
                </div>
            </div>
            <div style="margin-top: 8px;">
                <label style="font-size: 0.7rem; font-weight:700; color:#475569;">Notes / Comment</label>
                <input type="text" id="newInteractionNotes" class="past-input-text" placeholder="e.g. Active participation, good answer">
            </div>
            <div style="margin-top: 10px; display:flex; justify-content:flex-end; gap:8px;">
                <button type="button" class="btn-secondary" style="font-size:11px; padding:4px 10px;" onclick="toggleAddPastInteractionForm()" data-i18n="ptBtnCancel">Cancel</button>
                <button type="button" class="btn-success" style="font-size:11px; padding:4px 10px;" onclick="submitNewPastInteraction()">Add Entry</button>
            </div>
        </div>

        <div class="student-past-table-container">
            <table class="student-past-table">
                <thead>
                    <tr>
                        <th data-i18n="ptColDate">Date</th>
                        <th data-i18n="ptColTime">Time</th>
                        <th style="color:#2ca02c;">+</th>
                        <th style="color:#d62728;">-</th>
                        <th style="color:#86efac;">T+</th>
                        <th style="color:#fca5a5;">T-</th>
                        <th data-i18n="ptColPick">Pick</th>
                        <th data-i18n="ptColAbs">Abs</th>
                        <th data-i18n="ptColBadges">Badges</th>
                        <th data-i18n="ptColNotes">Notes</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="studentPastTableBody"></tbody>
            </table>
        </div>
    `;

    renderStudentPastTableRows();
}

function formatIsoDate(rawDate) {
    if (!rawDate) return new Date().toISOString().split('T')[0];
    const str = String(rawDate).trim().replace(' ', 'T');
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return new Date().toISOString().split('T')[0];
}

function renderStudentPastTableRows() {
    if (!editingStudentModalData) return;
    const tbody = document.getElementById('studentPastTableBody');
    if (!tbody) return;

    const { studentSessions } = editingStudentModalData;
    tbody.innerHTML = '';

    if (studentSessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#888; padding:16px;">${t('ptMsgNoDataRange')}</td></tr>`;
        return;
    }

    const sorted = [...studentSessions].sort((a, b) => new Date(b.sessionId) - new Date(a.sessionId));

    sorted.forEach(item => {
        const sessionId = item.sessionId;
        const st = item.studentData;
        const dateStr = formatIsoDate(sessionId);
        const timeStr = item.time || (sessionId.includes('T') ? sessionId.split('T')[1].substring(0, 5) : '10:00');


        const row = document.createElement('tr');
        row.dataset.sessionId = sessionId;
        row.innerHTML = `
            <td><input type="date" class="past-input-text past-date-in" value="${dateStr}" style="width:115px;" onchange="updateStudentEditSessionDate('${sessionId}', this.value)"></td>
            <td><input type="time" class="past-input-text past-time-in" value="${timeStr}" style="width:75px;" onchange="updateStudentEditSessionTime('${sessionId}', this.value)"></td>
            <td><input type="number" class="past-input-num past-plus-in" value="${st.pluses || 0}" min="0" onchange="updateStudentEditField('${sessionId}', 'pluses', parseInt(this.value)||0)"></td>
            <td><input type="number" class="past-input-num past-minus-in" value="${st.minuses || 0}" min="0" onchange="updateStudentEditField('${sessionId}', 'minuses', parseInt(this.value)||0)"></td>
            <td><input type="number" class="past-input-num past-tplus-in" value="${st.teamPluses || 0}" min="0" onchange="updateStudentEditField('${sessionId}', 'teamPluses', parseInt(this.value)||0)"></td>
            <td><input type="number" class="past-input-num past-tminus-in" value="${st.teamMinuses || 0}" min="0" onchange="updateStudentEditField('${sessionId}', 'teamMinuses', parseInt(this.value)||0)"></td>
            <td style="text-align:center;"><input type="checkbox" class="past-pick-in" ${st.isPicked ? 'checked' : ''} onchange="updateStudentEditField('${sessionId}', 'isPicked', this.checked)"></td>
            <td style="text-align:center;"><input type="checkbox" class="past-abs-in" ${st.isAbsent ? 'checked' : ''} onchange="updateStudentEditField('${sessionId}', 'isAbsent', this.checked)"></td>
            <td>${formatBadgesEditable(sessionId, st.badges || [])}</td>
            <td><input type="text" class="past-input-text past-note-in" value="${escHtml(st.notes || '')}" placeholder="Notes..." onchange="updateStudentEditField('${sessionId}', 'notes', this.value)"></td>
            <td>
                <div style="display:flex; gap:4px; align-items:center;">
                    <button type="button" class="btn-mini" onclick="openStudentSessionTimelineFromModal('${sessionId}')" title="View Session Timeline"><img src="../assets/icons/clock.svg" class="btn-icon" alt="" /></button>
                    <button type="button" class="btn-mini-danger" onclick="deleteStudentPastEntry('${sessionId}')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openStudentSessionTimelineFromModal(sessionId) {
    if (!editingStudentModalData) return;
    const targetSessionId = sessionId || editingStudentModalData.currentSessionId || (editingStudentModalData.studentSessions[0]?.sessionId);
    const studentName = editingStudentModalData.name;
    if (!targetSessionId) return;
    closeDetailModal();
    openSessionTimeline(targetSessionId, { openModal: true, selectedStudent: studentName });
}

function formatBadgesEditable(sessionId, badges) {
    if (!Array.isArray(badges)) badges = [];
    const chips = badges.map((b, idx) => {
        const data = (typeof resolveBadgeData === 'function') ? resolveBadgeData(b) : {};
        const label = data.label || (typeof b === 'string' ? b : (b.label || b.icon || 'Badge'));
        const icon = data.icon || (typeof b === 'object' && b.icon ? b.icon : '');
        const displayStr = (icon && !label.includes(icon)) ? `${icon} ${label}` : label;
        const toneColor = data.tone === 'positive' ? '#0369a1' : (data.tone === 'negative' ? '#b91c1c' : '#334155');
        const toneBg = data.tone === 'positive' ? '#e0f2fe' : (data.tone === 'negative' ? '#fee2e2' : '#f1f5f9');
        const toneBorder = data.tone === 'positive' ? '#7dd3fc' : (data.tone === 'negative' ? '#fca5a5' : '#cbd5e1');

        return `
            <span class="badge-edit-chip" style="color:${toneColor}; background:${toneBg}; border-color:${toneBorder};">
                <span>${escHtml(displayStr)}</span>
                <button type="button" class="badge-chip-remove" style="color:${toneColor};" onclick="removeBadgeFromStudentSession('${sessionId}', ${idx})" title="Remove Badge">&times;</button>
            </span>
        `;
    }).join('');

    const configuredDefs = (typeof getConfiguredBadgeDefinitions === 'function') ? getConfiguredBadgeDefinitions() : [];
    const filteredDefs = configuredDefs.filter(d => !d.isBuiltin || (d.icon !== '+' && d.icon !== '-'));

    const optionsHtml = filteredDefs.map((def, idx) => {
        const label = def.label || def.icon || 'Badge';
        const toneSymbol = def.tone === 'positive' ? ' (+)' : (def.tone === 'negative' ? ' (-)' : '');
        return `<option value="${idx}">${escHtml(label + toneSymbol)}</option>`;
    }).join('');

    return `
        <div class="badge-edit-container">
            ${chips}
            <select class="badge-add-select" onchange="handleAddBadgeSelect('${sessionId}', this)">
                <option value="">+ Badge...</option>
                ${optionsHtml}
                <option value="__custom__">✏️ Custom...</option>
            </select>
        </div>
    `;
}


async function handleAddBadgeSelect(sessionId, selectEl) {
    if (!selectEl || !editingStudentModalData) return;
    const val = selectEl.value;
    selectEl.value = '';
    if (val === '' || val === null || val === undefined) return;

    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === sessionId);
    if (!item) return;

    let newBadge = null;
    if (val === '__custom__') {
        const msg = 'Enter custom badge name or label:';
        const input = (typeof showPrompt === 'function') ? (await showPrompt(msg, '')) : null;
        if (!input || !input.trim()) return;
        const txt = input.trim();
        const parts = txt.split(/\s+/);
        if (parts.length > 1 && (parts[0].length <= 4 || /\p{Extended_Pictographic}/u.test(parts[0]))) {
            newBadge = { icon: parts[0], label: parts.slice(1).join(' '), tone: 'positive' };
        } else {
            newBadge = { icon: '🏅', label: txt, tone: 'positive' };
        }
    } else {
        const configuredDefs = (typeof getConfiguredBadgeDefinitions === 'function') ? getConfiguredBadgeDefinitions() : [];
        const filteredDefs = configuredDefs.filter(d => !d.isBuiltin || (d.icon !== '+' && d.icon !== '-'));
        const defIndex = parseInt(val);
        if (!isNaN(defIndex) && filteredDefs[defIndex]) {
            const selDef = filteredDefs[defIndex];
            newBadge = {
                icon: selDef.icon,
                label: selDef.label,
                tone: selDef.tone
            };
        }
    }

    if (!newBadge) return;

    const targetSessionDate = (item && item.sessionId && String(item.sessionId).slice(0, 10)) ||
                              (item && item.session && item.session.id && String(item.session.id).slice(0, 10)) ||
                              (item && item.session && item.session.date && String(item.session.date).slice(0, 10)) ||
                              new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    newBadge.time = timeStr;
    newBadge.timestamp = `${targetSessionDate}T${timeStr}.000Z`;

    if (!Array.isArray(item.studentData.badges)) {
        item.studentData.badges = [];
    }
    item.studentData.badges.push(newBadge);
    renderStudentDetailBodyContent();
}


async function promptAddBadgeToSession(sessionId) {
    if (!editingStudentModalData) return;
    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === sessionId);
    if (!item) return;

    const msg = 'Enter custom badge name or label:';
    const input = (typeof showPrompt === 'function') ? (await showPrompt(msg, '⭐ Star')) : null;

    if (!input) return;
    let val = String(input).trim();
    if (!val) return;

    const targetSessionDate = (item && item.sessionId && String(item.sessionId).slice(0, 10)) ||
                              (item && item.session && item.session.id && String(item.session.id).slice(0, 10)) ||
                              (item && item.session && item.session.date && String(item.session.date).slice(0, 10)) ||
                              new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tsStr = `${targetSessionDate}T${timeStr}.000Z`;

    let badgeObj;
    const parts = val.split(/\s+/);
    if (parts.length > 1 && (parts[0].length <= 4 || /\p{Extended_Pictographic}/u.test(parts[0]))) {
        badgeObj = { icon: parts[0], label: parts.slice(1).join(' '), tone: 'positive', time: timeStr, timestamp: tsStr };
    } else {
        badgeObj = { icon: '⭐', label: val, tone: 'positive', time: timeStr, timestamp: tsStr };
    }

    if (!Array.isArray(item.studentData.badges)) {
        item.studentData.badges = [];
    }
    item.studentData.badges.push(badgeObj);
    renderStudentDetailBodyContent();
}


async function removeBadgeFromStudentSession(sessionId, badgeIndex) {
    if (!editingStudentModalData) return;
    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === sessionId);
    if (item && Array.isArray(item.studentData.badges)) {
        const badge = item.studentData.badges[badgeIndex];
        const label = (typeof badge === 'string') ? badge : (badge?.label || badge?.icon || 'badge');
        const msg = `Are you sure you want to remove the badge "${label}"?`;

        const confirmed = (typeof showConfirm === 'function') ? (await showConfirm(msg)) : window.confirm(msg);
        if (!confirmed) return;

        item.studentData.badges.splice(badgeIndex, 1);
        renderStudentDetailBodyContent();
    }
}


function updateModalSummaryTotals() {
    if (!editingStudentModalData) return;
    const summaryContainer = document.querySelector('.student-edit-stats-summary');
    if (!summaryContainer) return;

    let totalPicks = 0, totalAbsences = 0, totalPluses = 0, totalMinuses = 0, totalTeamPluses = 0, totalTeamMinuses = 0;

    editingStudentModalData.studentSessions.forEach(item => {
        const st = item.studentData || {};
        if (st.isPicked) totalPicks++;
        if (st.isAbsent) totalAbsences++;
        totalPluses += Number(st.pluses) || 0;
        totalMinuses += Number(st.minuses) || 0;
        totalTeamPluses += Number(st.teamPluses) || 0;
        totalTeamMinuses += Number(st.teamMinuses) || 0;
    });

    const net = (totalPluses + totalTeamPluses) - (totalMinuses + totalTeamMinuses);

    summaryContainer.innerHTML = `
        <div class="student-edit-stat-card">
            <div class="label">${t('ptStatsSessionsRecorded')}</div>
            <div class="val">${editingStudentModalData.studentSessions.length}</div>
        </div>
        <div class="student-edit-stat-card">
            <div class="label" style="color:#2ca02c;">${t('ptStatPluses')}</div>
            <div class="val" style="color:#2ca02c;">${totalPluses}</div>
        </div>
        <div class="student-edit-stat-card">
            <div class="label" style="color:#d62728;">${t('ptStatMinuses')}</div>
            <div class="val" style="color:#d62728;">${totalMinuses}</div>
        </div>
        <div class="student-edit-stat-card">
            <div class="label" style="color:#1f5a2b;">T+ / T-</div>
            <div class="val" style="color:#1f5a2b;">${totalTeamPluses} / ${totalTeamMinuses}</div>
        </div>
        <div class="student-edit-stat-card">
            <div class="label">${t('ptStatPicks')} / ${t('ptColAbs')}</div>
            <div class="val">${totalPicks} / ${totalAbsences}</div>
        </div>
        <div class="student-edit-stat-card">
            <div class="label">${t('ptStatNet')}</div>
            <div class="val" style="color:${net >= 0 ? '#2ca02c' : '#d62728'};">${net >= 0 ? '+' : ''}${net}</div>
        </div>
    `;
}

function updateStudentEditField(sessionId, field, value) {

    if (!editingStudentModalData) return;
    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === sessionId);
    if (!item) return;

    item.studentData[field] = value;

    if (editingStudentModalData.currentSessionId === sessionId) {
        if (field === 'pluses') {
            const el = document.getElementById('editDetailPluses');
            if (el && el.value != value) el.value = value;
        } else if (field === 'minuses') {
            const el = document.getElementById('editDetailMinuses');
            if (el && el.value != value) el.value = value;
        } else if (field === 'teamPluses') {
            const el = document.getElementById('editDetailTeamPluses');
            if (el && el.value != value) el.value = value;
        } else if (field === 'teamMinuses') {
            const el = document.getElementById('editDetailTeamMinuses');
            if (el && el.value != value) el.value = value;
        } else if (field === 'isPicked') {
            const el = document.getElementById('editDetailPicked');
            if (el) el.checked = !!value;
        } else if (field === 'isAbsent') {
            const el = document.getElementById('editDetailAbsent');
            if (el) el.checked = !!value;
        }
    }

    const tbody = document.getElementById('studentPastTableBody');
    if (tbody) {
        const tr = tbody.querySelector(`tr[data-session-id="${CSS.escape ? CSS.escape(sessionId) : sessionId}"]`);
        if (tr) {
            if (field === 'pluses') {
                const el = tr.querySelector('.past-plus-in');
                if (el && el.value != value) el.value = value;
            } else if (field === 'minuses') {
                const el = tr.querySelector('.past-minus-in');
                if (el && el.value != value) el.value = value;
            } else if (field === 'teamPluses') {
                const el = tr.querySelector('.past-tplus-in');
                if (el && el.value != value) el.value = value;
            } else if (field === 'teamMinuses') {
                const el = tr.querySelector('.past-tminus-in');
                if (el && el.value != value) el.value = value;
            } else if (field === 'isPicked') {
                const el = tr.querySelector('.past-pick-in');
                if (el) el.checked = !!value;
            } else if (field === 'isAbsent') {
                const el = tr.querySelector('.past-abs-in');
                if (el) el.checked = !!value;
            } else if (field === 'notes') {
                const el = tr.querySelector('.past-note-in');
                if (el && el.value != value) el.value = value;
            }
        }
    }

    updateModalSummaryTotals();
}

function updateStudentEditSessionDate(oldSessionId, newDateStr) {
    if (!editingStudentModalData || !newDateStr) return;
    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === oldSessionId);
    if (item) {
        const cleanTime = String(item.time || '10:00').trim();
        const timeParts = cleanTime.split(':');
        const hh = (timeParts[0] || '10').padStart(2, '0');
        const mm = (timeParts[1] || '00').padStart(2, '0');
        item.newSessionId = `${newDateStr}T${hh}:${mm}:00`;
    }
}

function updateStudentEditSessionTime(sessionId, newTimeStr) {
    if (!editingStudentModalData) return;
    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === sessionId);
    if (item) {
        item.time = newTimeStr;
    }
}

async function deleteStudentPastEntry(sessionId) {
    if (!editingStudentModalData) return;
    const item = editingStudentModalData.studentSessions.find(s => s.sessionId === sessionId);
    const dateObj = item ? new Date(item.sessionId) : null;
    const dateStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : (item?.sessionId || '');
    const defaultMsg = `Are you sure you want to delete this interaction entry (${dateStr})?`;
    const msg = (typeof t === 'function' && t('ptConfirmDeleteEntry')) ? `${t('ptConfirmDeleteEntry')}\n(${dateStr})` : defaultMsg;

    const confirmed = (typeof showConfirm === 'function') ? (await showConfirm(msg)) : window.confirm(msg);
    if (!confirmed) return;

    editingStudentModalData.studentSessions = editingStudentModalData.studentSessions.filter(s => s.sessionId !== sessionId);
    renderStudentDetailBodyContent();
}


function toggleAddPastInteractionForm() {
    const box = document.getElementById('addPastInteractionBox');
    if (box) box.classList.toggle('hidden');
}

function submitNewPastInteraction() {
    if (!editingStudentModalData) return;

    const dateVal = document.getElementById('newInteractionDate').value;
    let rawTime = String(document.getElementById('newInteractionTime').value || '10:00').trim();
    if (!dateVal) {
        showMessage(t('ptMsgSelectGroup') || 'Please select a valid date', 'error');
        return;
    }

    const timeParts = rawTime.split(':');
    const hh = (timeParts[0] || '10').padStart(2, '0');
    const mm = (timeParts[1] || '00').padStart(2, '0');
    const formattedTime = `${hh}:${mm}`;
    const newSessionId = `${dateVal}T${hh}:${mm}:00`;

    const pluses = parseInt(document.getElementById('newInteractionPluses').value) || 0;
    const minuses = parseInt(document.getElementById('newInteractionMinuses').value) || 0;
    const teamPluses = parseInt(document.getElementById('newInteractionTeamPluses').value) || 0;
    const teamMinuses = parseInt(document.getElementById('newInteractionTeamMinuses').value) || 0;
    const isPicked = document.getElementById('newInteractionPicked').checked;
    const isAbsent = document.getElementById('newInteractionAbsent').checked;
    const notes = (document.getElementById('newInteractionNotes').value || '').trim();

    const newStudentData = {
        name: editingStudentModalData.name,
        isPicked,
        isAbsent,
        pluses,
        minuses,
        teamPluses,
        teamMinuses,
        badges: [],
        notes
    };

    editingStudentModalData.studentSessions.push({
        sessionId: newSessionId,
        time: formattedTime,
        studentData: newStudentData,
        isNewEntry: true
    });

    toggleAddPastInteractionForm();
    renderStudentDetailBodyContent();
}

function collectModalFormData() {
    if (!editingStudentModalData) return;
    const { studentSessions } = editingStudentModalData;

    const tbody = document.getElementById('studentPastTableBody');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr[data-session-id]');
        rows.forEach(tr => {
            const sid = tr.dataset.sessionId;
            if (!sid) return;
            const item = studentSessions.find(s => s.sessionId === sid);
            if (!item) return;

            const dateIn = tr.querySelector('.past-date-in');
            const timeIn = tr.querySelector('.past-time-in');
            const plusIn = tr.querySelector('.past-plus-in');
            const minusIn = tr.querySelector('.past-minus-in');
            const tPlusIn = tr.querySelector('.past-tplus-in');
            const tMinusIn = tr.querySelector('.past-tminus-in');
            const pickIn = tr.querySelector('.past-pick-in');
            const absIn = tr.querySelector('.past-abs-in');
            const noteIn = tr.querySelector('.past-note-in');

            const origDateStr = formatIsoDate(item.sessionId);
            const origTimeStr = item.time || (item.sessionId && item.sessionId.includes('T') ? item.sessionId.split('T')[1].substring(0, 5) : '10:00');
            if (dateIn && dateIn.value && (dateIn.value !== origDateStr || (timeIn && timeIn.value && timeIn.value !== origTimeStr))) {
                const rawTime = String(timeIn && timeIn.value ? timeIn.value : item.time || '10:00').trim();
                const timeParts = rawTime.split(':');
                const hh = (timeParts[0] || '10').padStart(2, '0');
                const mm = (timeParts[1] || '00').padStart(2, '0');
                item.newSessionId = `${dateIn.value}T${hh}:${mm}:00`;
                item.time = `${hh}:${mm}`;
            }
            if (plusIn) item.studentData.pluses = parseInt(plusIn.value) || 0;
            if (minusIn) item.studentData.minuses = parseInt(minusIn.value) || 0;
            if (tPlusIn) item.studentData.teamPluses = parseInt(tPlusIn.value) || 0;
            if (tMinusIn) item.studentData.teamMinuses = parseInt(tMinusIn.value) || 0;
            if (pickIn) item.studentData.isPicked = pickIn.checked;
            if (absIn) item.studentData.isAbsent = absIn.checked;
            if (noteIn) item.studentData.notes = noteIn.value;
        });
    }
}

async function saveNotes() {
    if (!editingStudentModalData) {
        closeDetailModal();
        return;
    }

    collectModalFormData();

    const { name, groupId, studentSessions } = editingStudentModalData;

    const originalSessionIds = new Set();
    DB_EXPORT.forEach(s => {
        if (s.groups && s.groups[groupId]) {
            const st = s.groups[groupId].find(st => st.name === name);
            if (st) originalSessionIds.add(s.id);
        }
    });

    const currentSessionIds = new Set(studentSessions.map(s => s.newSessionId || s.sessionId));

    originalSessionIds.forEach(oldId => {
        if (!currentSessionIds.has(oldId)) {
            const session = DB_EXPORT.find(s => s.id === oldId);
            if (session && session.groups && session.groups[groupId]) {
                session.groups[groupId] = session.groups[groupId].filter(s => s.name !== name);
            }
        }
    });

    studentSessions.forEach(item => {
        let targetSessionId = item.newSessionId || item.sessionId;
        targetSessionId = String(targetSessionId).trim().replace(/\s+/g, 'T').replace(/(T\d{2}:\d{2}:\d{2})(:\d{2})+$/, '$1');

        if (!targetSessionId.includes('T')) {
            targetSessionId = `${targetSessionId}T10:00:00`;
        } else {
            const parts = targetSessionId.split('T');
            const datePart = parts[0];
            const timePart = parts[1] || '10:00:00';
            const tParts = timePart.split(':');
            const hh = (tParts[0] || '10').padStart(2, '0');
            const mm = (tParts[1] || '00').padStart(2, '0');
            const ss = (tParts[2] || '00').padStart(2, '0');
            targetSessionId = `${datePart}T${hh}:${mm}:${ss}`;
        }

        item.sessionId = targetSessionId;
        delete item.newSessionId;

        let session = DB_EXPORT.find(s => s.id === targetSessionId);

        // If not found by exact session ID, look for an existing session for this group on the same date
        if (!session) {
            const targetDate = targetSessionId.split('T')[0];
            if (targetDate) {
                session = DB_EXPORT.find(s => s.groups && s.groups[groupId] && s.id && s.id.startsWith(targetDate));
            }
        }

        if (!session) {
            session = {
                id: targetSessionId,
                time: item.time || '10:00',
                groups: {
                    [groupId]: []
                }
            };
            DB_EXPORT.push(session);
        } else if (!session.groups) {
            session.groups = {};
        }

        if (!session.groups[groupId]) {
            session.groups[groupId] = [];
        }

        const existingStudentIdx = session.groups[groupId].findIndex(s => s.name === name);
        if (existingStudentIdx !== -1) {
            session.groups[groupId][existingStudentIdx] = {
                ...session.groups[groupId][existingStudentIdx],
                ...item.studentData
            };
        } else {
            session.groups[groupId].push({
                ...item.studentData
            });
        }

        // Sync newly added badges to session.sessionHistory
        if (Array.isArray(item.studentData.badges)) {
            if (!Array.isArray(session.sessionHistory)) {
                session.sessionHistory = [];
            }
            item.studentData.badges.forEach(b => {
                const bIcon = (typeof b === 'object' ? b.icon : (typeof b === 'string' ? b.split(/\s+/)[0] : '')) || '';
                const bLabel = (typeof b === 'object' ? b.label : (typeof b === 'string' ? b.split(/\s+/).slice(1).join(' ') : '')) || 'Badge';
                const bTime = (typeof b === 'object' && b.time) ? b.time : (session.time || '');
                const sessionDate = (session.id && String(session.id).slice(0, 10)) ||
                                    (session.date && String(session.date).slice(0, 10)) ||
                                    new Date().toISOString().slice(0, 10);
                let bTs = (typeof b === 'object' && b.timestamp) ? b.timestamp : '';
                if (!bTs || !bTs.startsWith(sessionDate)) {
                    bTs = `${sessionDate}T${bTime || '10:00:00'}.000Z`;
                }
                const bTone = (typeof b === 'object' ? b.tone : 'positive');
                const existsInHistory = session.sessionHistory.some(h => {
                    if (!h || (h.type !== 'badge' && h.type !== 'plus' && h.type !== 'minus')) return false;
                    if (String(h.studentName || '').trim().toLowerCase() !== String(name).trim().toLowerCase()) return false;
                    const hIcon = h.meta?.badgeIcon || (typeof h.detail === 'string' ? h.detail.split(/\s+/)[0] : '');
                    return bIcon && hIcon === bIcon;
                });
                if (!existsInHistory) {
                    session.sessionHistory.push({
                        type: (bIcon === '+' ? 'plus' : (bIcon === '-' || bIcon === '−' ? 'minus' : 'badge')),
                        studentName: name,
                        detail: (bIcon && !bLabel.includes(bIcon)) ? `${bIcon} ${bLabel}` : bLabel,
                        time: bTime,
                        timestamp: bTs,
                        group: groupId,
                        meta: {
                            badgeIcon: bIcon,
                            badgeLabel: bLabel,
                            tone: bTone
                        }
                    });
                }
            });
        }
    });

    DB_EXPORT.forEach(s => {
        if (s.id && (s.id.includes('Invalid') || s.id.includes('NaN'))) {
            s.id = new Date().toISOString().split('T')[0] + 'T10:00:00';
        }
    });


    syncGlobalDbExport();
    await persistEditedGroupSessionsToDisk(groupId);

    if (_timelineState.session && _timelineState.sessionId) {
        const refreshed = DB_EXPORT.find(s => s && (s.id === _timelineState.sessionId || s.date === _timelineState.sessionId));
        if (refreshed) renderSessionTimeline(refreshed, { openModal: _timelineState.isModalOpen });
    }

    closeDetailModal();

    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(groupId, dateRange.from, dateRange.to);
    updateDashboard();
    updateClassOverviewTable(sessions);
    if (currentStudentName === name) {
        updateStudentDetails();
    }

    showMessage(t('ptMsgStudentSaved'), 'success');
}

async function persistEditedGroupSessionsToDisk(groupId) {
    if (!ELECTRON_AVAILABLE || !window.Desktop) return;

    try {
        const rawMeta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
        const displayName = (rawMeta[groupId] && rawMeta[groupId].name) ? rawMeta[groupId].name : groupId;
        const safeGroup = displayName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/^\.+/, '')
            .trim() || '_class';

        const byDate = {};
        DB_EXPORT.forEach(s => {
            if (s.groups && s.groups[groupId]) {
                const dateKey = s.id.split('T')[0];
                if (!byDate[dateKey]) byDate[dateKey] = [];
                byDate[dateKey].push(s);
            }
        });

        for (const [dateStr, classSessions] of Object.entries(byDate)) {
            const filename = `${dateStr}_${safeGroup}.js`;

            // Pre-flight safeguard: Ensure no duplicate session.id and no duplicate student IDs
            const seenBatchSessionIds = new Set();
            const sanitizedClassSessions = (classSessions || []).map(sess => {
                const sCopy = JSON.parse(JSON.stringify(sess));
                if (sCopy.groups && typeof sCopy.groups === 'object') {
                    Object.keys(sCopy.groups).forEach(gName => {
                        const grp = sCopy.groups[gName];
                        if (Array.isArray(grp)) {
                            const stSeen = new Set();
                            grp.forEach(st => {
                                if (st.id == null || stSeen.has(st.id)) {
                                    let nid = Date.now() + Math.random();
                                    while (stSeen.has(nid)) nid = Date.now() + Math.random();
                                    st.id = nid;
                                }
                                stSeen.add(st.id);
                            });
                        }
                    });
                }
                if (!sCopy.id || seenBatchSessionIds.has(sCopy.id)) {
                    let ms = new Date(sCopy.id || Date.now()).getTime();
                    if (Number.isNaN(ms)) ms = Date.now();
                    let cand = new Date(ms).toISOString();
                    while (seenBatchSessionIds.has(cand)) {
                        ms += 1;
                        cand = new Date(ms).toISOString();
                    }
                    sCopy.id = cand;
                }
                seenBatchSessionIds.add(sCopy.id);
                return sCopy;
            });

            const content = `window.CMS_DB_EXPORT = ${JSON.stringify(sanitizedClassSessions, null, 2)};\nwindow.DB_EXPORT = window.CMS_DB_EXPORT;\n`;
            await Desktop.saveText('groupParticipation', filename, content, safeGroup);
        }
    } catch (err) {
        console.warn('Failed persisting group sessions to disk:', err);
    }
}

function buildDbJsContent() {
    return `window.CMS_DB_EXPORT = ${JSON.stringify(DB_EXPORT, null, 2)};\nwindow.DB_EXPORT = window.CMS_DB_EXPORT;\n`;
}

async function persistNotesToFile() {
    if (!ELECTRON_AVAILABLE) {
        showMessage(t('ptMsgNotesSavedMemory'), 'success');
        updateStudentDetails();
        closeDetailModal();
        return;
    }

    // Build notes patch: { sessionId: { studentName: noteText } }
    const patch = {};
    DB_EXPORT.forEach(session => {
        Object.values(session.groups || {}).forEach(students => {
            students.forEach(student => {
                if (student.notes) {
                    if (!patch[session.id]) patch[session.id] = {};
                    patch[session.id][student.name] = student.notes;
                }
            });
        });
    });

    try {
        await Desktop.saveText('groupParticipation', 'pt-notes.js', `window.CMS_NOTES_PATCH = ${JSON.stringify(patch, null, 2)};\n`);
        showMessage(t('ptMsgNotesSaved'), 'success');
        updateStudentDetails();
        closeDetailModal();
    } catch (error) {
        showMessage(t('ptMsgErrSavingNotes') + error.message, 'error');
    }
}

function confirmSaveNotes() {
    saveNotes();
}


function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

function confirmAndSaveNotes() {
    closeConfirmModal();
    saveNotes();
}

function sortTable(header, tableId) {
    const column = header.dataset.sort || header.dataset.col;
    if (!column) return;
    if (tableId === 'historyTable') {
        sortHistoryTable(column);
    } else if (tableId === 'classOverviewTable') {
        sortClassOverviewTable(column);
    } else if (tableId === 'studentTable') {
        sortStudentTable(column);
    }
}

