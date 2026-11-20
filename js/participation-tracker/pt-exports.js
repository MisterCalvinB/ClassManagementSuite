// Participation Tracker — Neobrutalist Export Modal, SVG Charts & Report Generators
// ─── NEOBRUTALIST EXPORT MODAL SYSTEM ──────────────────────────
function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function downloadFile(filename, content, mimeType) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    let filterName = 'File';
    if (ext === 'html') filterName = 'HTML Document';
    else if (ext === 'md') filterName = 'Markdown Document';
    else if (ext === 'csv') filterName = 'CSV Spreadsheet';
    else if (ext === 'xlsx') filterName = 'Excel Spreadsheet';
    else if (ext === 'ods') filterName = 'LibreOffice Calc Spreadsheet';
    else if (ext === 'docx' || ext === 'doc') filterName = 'Word Document';
    else if (ext === 'json') filterName = 'JSON Document';

    if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
            filename: filename,
            content: content,
            mimeType: mimeType || 'application/octet-stream',
            filters: [{ name: filterName, extensions: [ext] }, { name: 'All Files', extensions: ['*'] }],
            title: typeof t === 'function' ? (t('deSaveFileTitle') || 'Save File') : 'Save File'
        });
    }

    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return { ok: true };
}

let ptPdfExportModalCallback = null;
function closePtPdfExportModal(choice = null) {
    const modal = document.getElementById('ptPdfExportModal');
    if (modal) modal.classList.remove('active');
    const cb = ptPdfExportModalCallback;
    ptPdfExportModalCallback = null;
    if (cb) cb(choice);
}

function openPtPdfExportModal() {
    const titleEl = document.getElementById('pt-pdf-export-title');
    const textEl = document.getElementById('pt-pdf-export-text');
    const toPrintBtn = document.getElementById('btn-pt-pdf-export-to-print');
    const pickerBtn = document.getElementById('btn-pt-pdf-export-picker');
    if (titleEl) titleEl.innerHTML = '<img src="../assets/icons/printer.svg" class="btn-icon" alt="" /> ' + (typeof t === 'function' ? (t('deExportPdfDestinationTitle') || 'Export PDF') : 'Export PDF');
    if (textEl) textEl.textContent = (typeof t === 'function' ? t('deExportPdfDestinationPrompt') : null) || 'Where do you want to save the PDF?';
    if (toPrintBtn) toPrintBtn.textContent = (typeof t === 'function' ? t('deExportPdfToPrintFolder') : null) || 'Export to Print folder';
    if (pickerBtn) pickerBtn.textContent = (typeof t === 'function' ? t('deExportPdfFilePicker') : null) || 'Choose with file picker';

    if (ptPdfExportModalCallback) ptPdfExportModalCallback(null);

    return new Promise(resolve => {
        ptPdfExportModalCallback = resolve;
        const modal = document.getElementById('ptPdfExportModal');
        if (modal) modal.classList.add('active');
        setTimeout(() => {
            if (toPrintBtn) toPrintBtn.focus();
        }, 0);
    });
}

function openPtExportModal() {
    const modal = document.getElementById('ptExportModal');
    if (modal) modal.classList.add('active');
    const nameEl = document.getElementById('ptExportActiveStudentName');
    if (nameEl) nameEl.textContent = currentStudentName || 'All Students';
    const repNameEl = document.getElementById('ptReportActiveStudentName');
    if (repNameEl) repNameEl.textContent = currentStudentName || 'Active Student';
    if (typeof togglePtReportSubOptions === 'function') togglePtReportSubOptions();

    if (window.ExportStylesService) {
        ExportStylesService.renderStyleSelector(document.getElementById('pt-export-style-selector-wrap'), {
            toolKey: 'participationTracker',
            onChange: function (styleId) {
                const ifr = document.getElementById('ptExportPreviewIframe');
                if (ifr && document.getElementById('ptExportPreviewModal')?.classList.contains('active')) {
                    ExportStylesService.applyStyleToIframe(ifr, styleId);
                }
            }
        });
    }
}

function closePtExportModal() {
    const modal = document.getElementById('ptExportModal');
    if (modal) modal.classList.remove('active');
}

function updatePtExportHint() {
    const selectedFormat = document.querySelector('input[name="ptExportFormat"]:checked')?.value || 'html';
    const hintEl = document.getElementById('ptExportFormatHint');
    if (!hintEl) return;

    const hints = {
        html: '<img src="../assets/icons/file-text.svg" class="btn-icon" alt="" /> <strong>HTML (Editable):</strong> Creates an interactive HTML report with <code>contenteditable="true"</code> on all table cells, column sorting, search filter, and save-edited feature.',
        pdf: '<img src="../assets/icons/printer.svg" class="btn-icon" alt="" /> <strong>PDF:</strong> Generates clean print-ready layout formatted for desktop printing or PDF export via Electron / system dialog.',
        docx: '<img src="../assets/icons/document-editor.svg" class="btn-icon" alt="" /> <strong>DOCX:</strong> Editable Word document report compatible with Microsoft Word and desktop editors.',
        xlsx: '<img src="../assets/icons/table.svg" class="btn-icon" alt="" /> <strong>XLSX:</strong> Native Excel workbook spreadsheet file containing structured columns and headers.',
        ods: '<img src="../assets/icons/table.svg" class="btn-icon" alt="" /> <strong>ODS:</strong> Standard LibreOffice Calc spreadsheet file containing structured columns and headers.',
        csv: '<img src="../assets/icons/download.svg" class="btn-icon" alt="" /> <strong>CSV:</strong> Standard comma-separated values spreadsheet file for raw data analysis.'
    };
    hintEl.innerHTML = hints[selectedFormat] || hints.html;
}

function formatTimeWithSeconds(val) {
    if (!val) return '';
    if (val instanceof Date) return val.toLocaleTimeString();
    if (typeof val === 'number') return new Date(val).toLocaleTimeString();
    const str = String(val).trim();
    if (!isNaN(Date.parse(str))) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toLocaleTimeString();
    }
    if (/^\d{1,2}:\d{2}$/.test(str)) {
        return str + ':00';
    }
    return str;
}

function formatBadgeWithTime(b, session) {
    const data = resolveBadgeData(b);
    const label = data.label || b.icon || (typeof b === 'string' ? b : 'Badge');
    const rawTime = (typeof b === 'object' && b ? (b.time || b.timestamp || b.date || b.createdAt) : null) || data.time || data.timestamp || (session ? (session.time || session.id) : null);
    const formattedTime = formatTimeWithSeconds(rawTime);
    return formattedTime ? `${label} (${formattedTime})` : label;
}

function formatTeamRoleEventsWithTime(events, session) {
    if (!events || events.length === 0) return '(none)';
    return events.map(e => {
        const rawTime = e.time || e.timestamp || e.date || e.createdAt || (session ? (session.time || session.id) : null);
        const formattedTime = formatTimeWithSeconds(rawTime);
        const detail = e.detail || e.type || 'Event';
        return formattedTime ? `[${formattedTime}] ${detail}` : detail;
    }).join('; ');
}





function aggregateMetricsForGroup(groupId, fromDate, toDate) {
    const sessions = filterSessionsByDateAndGroup(groupId, fromDate, toDate).filter(s => !isExamSession(s, groupId));
    const sessionCount = sessions.length;
    
    const studentSet = new Set();
    let totalPicks = 0;
    let totalPositive = 0;
    let totalNegative = 0;
    let totalBadgePositive = 0;
    let totalBadgeNegative = 0;
    let totalBadges = 0;

    sessions.forEach(session => {
        const students = (session.groups && session.groups[groupId]) ? session.groups[groupId] : [];
        students.forEach(student => {
            studentSet.add(student.name);
            if (student.isPicked) totalPicks++;
            if (!student.isAbsent) {
                totalPositive += (student.pluses || 0) + (student.teamPluses || 0);
                totalNegative += (student.minuses || 0) + (student.teamMinuses || 0);
            }
            const badges = student.badges || [];
            totalBadges += badges.length;
            const sentiment = countBadgeSentiment(badges);
            totalBadgePositive += sentiment.positive;
            totalBadgeNegative += sentiment.negative;
        });
    });

    const studentCount = studentSet.size;
    const picksPerSession = sessionCount > 0 ? totalPicks / sessionCount : 0;
    const posPerSession = sessionCount > 0 ? (totalPositive + totalBadgePositive) / sessionCount : 0;
    const posPerSessionStudent = (sessionCount > 0 && studentCount > 0) ? (totalPositive + totalBadgePositive) / (sessionCount * studentCount) : 0;
    
    const negPerSession = sessionCount > 0 ? (totalNegative + totalBadgeNegative) / sessionCount : 0;
    const negPerSessionStudent = (sessionCount > 0 && studentCount > 0) ? (totalNegative + totalBadgeNegative) / (sessionCount * studentCount) : 0;
    
    const badgesPerSessionStudent = (sessionCount > 0 && studentCount > 0) ? totalBadges / (sessionCount * studentCount) : 0;

    const totalNet = (totalPositive + totalBadgePositive) - (totalNegative + totalBadgeNegative);
    const netPerSession = sessionCount > 0 ? totalNet / sessionCount : 0;
    const netPerSessionStudent = (sessionCount > 0 && studentCount > 0) ? totalNet / (sessionCount * studentCount) : 0;

    return {
        sessionCount,
        studentCount,
        totalPicks,
        picksPerSession,
        totalPositive: totalPositive + totalBadgePositive,
        posPerSession,
        posPerSessionStudent,
        totalNegative: totalNegative + totalBadgeNegative,
        negPerSession,
        negPerSessionStudent,
        totalBadgePositive,
        totalBadgeNegative,
        totalBadges,
        badgesPerSessionStudent,
        totalNet,
        netPerSession,
        netPerSessionStudent
    };
}

function getExportDataForCategory(category) {
    const dateRange = getDateRange();
    const rawGroupName = (typeof groupDisplayName === 'function')
        ? groupDisplayName(currentGroupId)
        : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[currentGroupId]) ? CLASS_GROUPS_META[currentGroupId].name : (currentGroupId || 'Class'));
    const groupName = rawGroupName || 'Class';
    const safeGroupTag = groupName.trim().replace(/[\s\/\\:\*\?"<>\|]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'Class';

    const dateStrLabel = (dateRange.from && dateRange.to) ? `${dateRange.from} to ${dateRange.to}` : (dateRange.from ? `From ${dateRange.from}` : 'All Data');
    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
    ].join('-');
    const timeStamp = `${datePart}_${timePart}`;

    let headers = [];
    let rows = [];
    let title = '';
    let description = '';
    let filenameBase = '';

    if (category === 'classOverview') {
        title = `Class Overview & Student Stats — ${groupName}`;
        description = `Aggregated student performance statistics for group ${groupName} (${dateStrLabel}).`;
        filenameBase = `student_stats_${safeGroupTag}_${timeStamp}`;

        headers = [
            'Student', 'Sessions (Attended/Total)', 'Picks', 'Absences',
            'Pluses (+)', 'Minuses (-)', 'Team Pluses (T+)', 'Team Minuses (T-)',
            'Badge Positive', 'Badge Negative', 'Badges Awarded', 'Team/Role Events',
            'Notes', 'Provisional Grade', 'Net Score', '+/Session', '-/Session',
            'Net/Session', 'Good/Bad Ratio', 'Trend'
        ];

        const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);
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
                        teamEvents: [],
                        notes: [],
                        sessionNets: []
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

                const studentBadges = (student.badges || []).map(b => ({ badge: b, session }));
                const badgeSentiment = countBadgeSentiment(student.badges || []);
                s.badges = s.badges.concat(studentBadges);
                s.badgePositive += badgeSentiment.positive;
                s.badgeNegative += badgeSentiment.negative;

                const studentEvents = getSessionTeamRoleEvents(session, currentGroupId, student.name);
                if (studentEvents.length) {
                    s.teamEvents = (s.teamEvents || []).concat(studentEvents.map(e => ({ event: e, session })));
                }

                const noteText = getStudentNotesText(student);
                if (noteText) s.notes.push(noteText);

                s.sessionNets.push(getStudentSessionNet(student));
            });
        });

        const students = Object.values(studentMap);
        students.sort((a, b) => a.name.localeCompare(b.name));

        const config = (window.CMS_PARTICIPATION_RULES && window.CMS_PARTICIPATION_RULES[currentGroupId]) ? window.CMS_PARTICIPATION_RULES[currentGroupId] : null;

        rows = students.map(s => {
            const net = (s.pluses + s.teamPluses + s.badgePositive) - (s.minuses + s.teamMinuses + s.badgeNegative);
            const attended = s.attendedSessions;
            const posRatio = attended ? (s.pluses + s.teamPluses + s.badgePositive) / attended : 0;
            const negRatio = attended ? (s.minuses + s.teamMinuses + s.badgeNegative) / attended : 0;
            const netRatio = attended ? net / attended : 0;
            const totalGood = s.pluses + s.teamPluses + s.badgePositive;
            const totalBad = s.minuses + s.teamMinuses + s.badgeNegative;
            const ratioVal = totalBad > 0 ? (totalGood / totalBad) : (totalGood > 0 ? 999 : 0);
            const ratioText = ratioVal === 999 ? '∞' : ratioVal.toFixed(2);

            const trendCode = (s.sessionNets && typeof computeTrend !== 'undefined') ? computeTrend(s.sessionNets) : 'flat';
            const trendLabel = trendCode === 'up' ? '↗ Improving' : (trendCode === 'down' ? '↘ Declining' : '→ Stable');

            let provGrade = '-';
            if (config) {
                const gradeVal = calculateStudentProvisionalGrade({
                    picks: s.picks,
                    attendedSessions: s.attendedSessions,
                    pluses: s.pluses,
                    minuses: s.minuses,
                    teamPluses: s.teamPluses,
                    teamMinuses: s.teamMinuses,
                    badgePositive: s.badgePositive,
                    badgeNegative: s.badgeNegative,
                    badges: s.badges.map(item => item.badge),
                    sessions: s.sessions,
                    absent: s.absent,
                    sessionNets: s.sessionNets
                });
                if (gradeVal !== null) {
                    const rounded = Math.round(gradeVal * 2) / 2;
                    provGrade = config.scaleToMax ? `${rounded} / ${config.maxGrade}` : `${rounded}`;
                }
            }

            const badgesSummary = s.badges.length > 0
                ? s.badges.map(item => formatBadgeWithTime(item.badge, item.session)).join(', ')
                : '(none)';

            const teamEventsSummary = s.teamEvents && s.teamEvents.length > 0
                ? s.teamEvents.map(item => {
                    const rawTime = item.event.time || item.event.timestamp || item.event.date || item.event.createdAt || item.session.time || item.session.id;
                    const formattedTime = formatTimeWithSeconds(rawTime);
                    const detail = item.event.detail || item.event.type || 'Event';
                    return formattedTime ? `[${formattedTime}] ${detail}` : detail;
                }).join('; ')
                : '(none)';

            return [
                s.name,
                `${s.attendedSessions} / ${s.sessions}`,
                s.picks,
                s.absent,
                s.pluses,
                s.minuses,
                s.teamPluses,
                s.teamMinuses,
                s.badgePositive,
                s.badgeNegative,
                badgesSummary,
                teamEventsSummary,
                s.notes.join(' | ') || '(none)',
                provGrade,
                net >= 0 ? `+${net}` : `${net}`,
                posRatio.toFixed(2),
                negRatio.toFixed(2),
                netRatio.toFixed(2),
                ratioText,
                trendLabel
            ];
        });

    } else if (category === 'history') {
        title = `Session History — ${groupName}`;
        description = `Complete session log for group ${groupName} (${dateStrLabel}).`;
        filenameBase = `session_history_${safeGroupTag}_${timeStamp}`;

        headers = [
            'Date', 'Time', 'Picks', 'Pluses', 'Minuses', 'Team Pluses (T+)',
            'Team Minuses (T-)', 'Badge Positive', 'Badge Negative',
            'Team/Role Events', 'Students Present', 'Badges', 'Objectives', 'Notes'
        ];

        const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);
        const metrics = aggregateMetrics(sessions);

        rows = metrics.map(m => {
            const date = new Date(m.date);
            const dateStr = date.toLocaleDateString();
            const session = sessions.find(s => s.id === m.date);
            const notes = getGroupSessionNotes(session) || '(no notes)';
            const objectives = getSessionObjectives(session) || '(none)';
            const teamRoleEventsList = getSessionTeamRoleEvents(session, currentGroupId);
            const teamRoleEventsSummary = formatTeamRoleEventsWithTime(teamRoleEventsList, session);
            const sessionTimeStr = formatTimeWithSeconds(m.time || session?.time || session?.id) || m.time || '-';

            return [
                dateStr,
                sessionTimeStr,
                m.picks,
                m.pluses,
                m.minuses,
                m.teamPluses || 0,
                m.teamMinuses || 0,
                m.badgePositive || 0,
                m.badgeNegative || 0,
                teamRoleEventsSummary,
                m.students,
                m.badges || 0,
                objectives,
                notes
            ];
        });

    } else if (category === 'studentDetail') {
        const targetStudent = currentStudentName;
        const safeStudentTag = targetStudent ? targetStudent.trim().replace(/[\s\/\\:\*\?"<>\|]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') : '';
        title = targetStudent ? `Student History — ${targetStudent} (${groupName})` : `Individual Student Activity — ${groupName}`;
        description = `Detailed session activity for ${targetStudent ? targetStudent : 'all students'} in group ${groupName} (${dateStrLabel}).`;
        filenameBase = targetStudent ? `student_${safeStudentTag}_${safeGroupTag}_${timeStamp}` : `all_students_detail_${safeGroupTag}_${timeStamp}`;

        headers = [
            'Student Name', 'Group', 'Date', 'Time', 'Picked', 'Absent',
            'Pluses (+)', 'Minuses (-)', 'Team Pluses (T+)', 'Team Minuses (T-)',
            'Badges', 'Team/Role Events', 'Notes'
        ];

        const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);
        sessions.forEach(session => {
            const students = session.groups[currentGroupId] || [];
            const filteredStudents = targetStudent ? students.filter(s => s.name === targetStudent) : students;

            filteredStudents.forEach(student => {
                const date = new Date(session.id).toLocaleDateString();
                const sessionTimeStr = formatTimeWithSeconds(session.time || session.id) || session.time || '-';
                const studentBadges = (student.badges || []).map(b => formatBadgeWithTime(b, session)).join(', ') || '(none)';
                const studentEvents = formatTeamRoleEventsWithTime(getSessionTeamRoleEvents(session, currentGroupId, student.name), session);
                const studentNote = getStudentNotesText(student) || '(none)';

                rows.push([
                    student.name,
                    groupName,
                    date,
                    sessionTimeStr,
                    student.isPicked ? 'Yes' : 'No',
                    student.isAbsent ? 'Yes' : 'No',
                    student.isAbsent ? 0 : (student.pluses || 0),
                    student.isAbsent ? 0 : (student.minuses || 0),
                    student.isAbsent ? 0 : (student.teamPluses || 0),
                    student.isAbsent ? 0 : (student.teamMinuses || 0),
                    studentBadges,
                    studentEvents,
                    studentNote
                ]);
            });
        });

    } else if (category === 'groupComparison') {
        title = `Group Comparison Summary`;
        description = `Comparative performance metrics across class groups (${dateStrLabel}).`;
        filenameBase = `group_comparison_${timeStamp}`;

        headers = [
            'Group', 'Sessions', 'Students', 'Picks', 'Pick/s',
            'Positive Points', 'Pos/s', 'Pos/s/student',
            'Negative Points', 'Neg/s', 'Neg/s/student',
            'Badge Positive', 'Badge Negative', 'Total Badges', 'Badges/s/student',
            'Net Score', 'Net/s', 'Net/s/student'
        ];

        const targetGroups = (compareGroupIds && compareGroupIds.length > 0) ? compareGroupIds : extractGroupsFromData();
        targetGroups.forEach(groupId => {
            const gName = groupDisplayName(groupId);
            const metrics = aggregateMetricsForGroup(groupId, dateRange.from, dateRange.to);

            rows.push([
                gName,
                metrics.sessionCount,
                metrics.studentCount,
                metrics.totalPicks,
                metrics.picksPerSession.toFixed(2),
                metrics.totalPositive,
                metrics.posPerSession.toFixed(2),
                metrics.posPerSessionStudent.toFixed(2),
                metrics.totalNegative,
                metrics.negPerSession.toFixed(2),
                metrics.negPerSessionStudent.toFixed(2),
                metrics.totalBadgePositive,
                metrics.totalBadgeNegative,
                metrics.totalBadges,
                metrics.badgesPerSessionStudent.toFixed(2),
                metrics.totalNet >= 0 ? `+${metrics.totalNet}` : `${metrics.totalNet}`,
                metrics.netPerSession >= 0 ? `+${metrics.netPerSession.toFixed(2)}` : metrics.netPerSession.toFixed(2),
                metrics.netPerSessionStudent >= 0 ? `+${metrics.netPerSessionStudent.toFixed(2)}` : metrics.netPerSessionStudent.toFixed(2)
            ]);
        });

    } else if (category === 'provisionalGrades') {
        title = `Provisional Grades & Objectives Report — ${groupName}`;
        description = `Calculated objective scores and final provisional grades for group ${groupName} (${dateStrLabel}).`;
        filenameBase = `provisional_grades_${safeGroupTag}_${timeStamp}`;

        const config = (window.CMS_PARTICIPATION_RULES && window.CMS_PARTICIPATION_RULES[currentGroupId]) || { rules: [], maxGrade: 20, scaleToMax: false };
        const ruleHeaders = config.rules.map((r, i) => getRuleLabel(r, i));

        headers = ['Student', 'Final Grade', ...ruleHeaders, 'Net Score', 'Picks', 'Attendance %'];

        const dateRangeVal = getDateRange();
        const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRangeVal.from, dateRangeVal.to);
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
        students.sort((a, b) => a.name.localeCompare(b.name));

        rows = students.map(s => {
            const details = calculateStudentProvisionalGradeDetails(s, config);
            const roundedGrade = details ? (Math.round(details.grade * 2) / 2) : '-';
            const ruleScores = config.rules.map((r, idx) => {
                const rd = details ? details.rules.find(item => item.ruleIndex === idx) : null;
                return rd ? `${Math.round(rd.points * 2) / 2} pts` : '0 pts';
            });

            const net = (s.pluses + s.teamPluses + s.badgePositive) - (s.minuses + s.teamMinuses + s.badgeNegative);
            const attRate = s.sessions > 0 ? ((s.attendedSessions / s.sessions) * 100).toFixed(0) + '%' : '0%';

            return [
                s.name,
                config.scaleToMax ? `${roundedGrade} / ${config.maxGrade}` : roundedGrade,
                ...ruleScores,
                net >= 0 ? `+${net}` : net,
                s.picks,
                attRate
            ];
        });
    }

    return { title, description, groupName, dateStrLabel, headers, rows, filenameBase };
}

function togglePtReportSubOptions() {
    const category = document.querySelector('input[name="ptExportCategory"]:checked')?.value;
    const subContainer = document.getElementById('ptReportSubOptions');
    if (subContainer) {
        if (category === 'exhaustiveReport') {
            subContainer.classList.remove('hidden');
        } else {
            subContainer.classList.add('hidden');
        }
    }
}

function buildNeobrutalistSvgBarChart(title, items, options = {}) {
    if (!items || items.length === 0) return '';
    const width = options.width || 640;
    const height = options.height || 310;
    const padding = { top: 40, right: 25, bottom: 85, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(1, ...items.map(i => Math.abs(i.value || 0)));
    const barWidth = Math.max(10, Math.min(40, (chartW / items.length) - 10));
    const step = chartW / items.length;

    let barsHtml = '';
    items.forEach((item, idx) => {
        const val = item.value || 0;
        const barH = (Math.abs(val) / maxVal) * (chartH - 20);
        const x = padding.left + (idx * step) + (step - barWidth) / 2;
        const y = padding.top + (chartH - barH);
        const color = item.color || '#5b8fcc';
        const label = item.label ? escHtml(String(item.label).substring(0, 18)) : `Item ${idx+1}`;
        const labelX = x + barWidth / 2;
        const labelY = padding.top + chartH + 16;

        barsHtml += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" stroke="#333333" stroke-width="1.5" rx="3" />
            <text x="${labelX}" y="${y - 6}" font-family="'Lexend', system-ui, sans-serif" font-size="10" font-weight="800" fill="#222222" text-anchor="middle">${val}</text>
            <text x="${labelX}" y="${labelY}" transform="rotate(-40 ${labelX} ${labelY})" font-family="'Lexend', system-ui, sans-serif" font-size="10" font-weight="700" fill="#333333" text-anchor="end">${label}</text>
        `;
    });

    return `
        <div style="background:#ffffff; border:2px solid #333333; box-shadow:3px 3px 0 #555555; border-radius:8px; padding:14px; margin-bottom:20px;">
            <h3 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#222222; margin-bottom:12px;">${escHtml(title)}</h3>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;">
                <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#333333" stroke-width="2" />
                <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#333333" stroke-width="2" />
                ${barsHtml}
            </svg>
        </div>
    `;
}

function buildNeobrutalistSvgLineChart(title, points, options = {}) {
    if (!points || points.length === 0) return '';
    const width = options.width || 640;
    const height = options.height || 260;
    const padding = { top: 35, right: 30, bottom: 65, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(1, ...points.map(p => Math.abs(p.value || 0)));
    const step = points.length > 1 ? chartW / (points.length - 1) : chartW;

    const coords = points.map((p, idx) => {
        const val = p.value || 0;
        const x = padding.left + (points.length > 1 ? idx * step : chartW / 2);
        const y = padding.top + chartH - ((val / maxVal) * (chartH - 20));
        return { x, y, val, label: p.label || '' };
    });

    const pathD = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');

    let dotsHtml = coords.map(c => {
        const labelY = padding.top + chartH + 14;
        return `
            <circle cx="${c.x}" cy="${c.y}" r="5.5" fill="#e2c96e" stroke="#333333" stroke-width="2" />
            <text x="${c.x}" y="${c.y - 9}" font-family="'Lexend', system-ui, sans-serif" font-size="10" font-weight="800" fill="#222222" text-anchor="middle">${c.val}</text>
            <text x="${c.x}" y="${labelY}" transform="rotate(-35 ${c.x} ${labelY})" font-family="'Lexend', system-ui, sans-serif" font-size="9" font-weight="700" fill="#475569" text-anchor="end">${escHtml(c.label)}</text>
        `;
    }).join('');

    return `
        <div style="background:#ffffff; border:2px solid #333333; box-shadow:3px 3px 0 #555555; border-radius:8px; padding:14px; margin-bottom:20px;">
            <h3 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#222222; margin-bottom:12px;">${escHtml(title)}</h3>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;">
                <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#333333" stroke-width="2" />
                <path d="${pathD}" fill="none" stroke="#5b8fcc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                ${dotsHtml}
            </svg>
        </div>
    `;
}

function buildClassExhaustiveReportHtml(groupName, dateStrLabel) {
    const overviewData = getExportDataForCategory('classOverview');
    const historyData = getExportDataForCategory('history');

    const totalStudents = overviewData.rows ? overviewData.rows.length : 0;
    const totalSessions = historyData.rows ? historyData.rows.length : 0;

    let totalPicks = 0, totalPos = 0, totalNeg = 0, totalBadges = 0, totalNet = 0;
    const studentBarItems = [];

    if (overviewData.rows) {
        overviewData.rows.forEach(r => {
            const name = r[0];
            const picks = Number(r[2]) || 0;
            const pos = (Number(r[4]) || 0) + (Number(r[6]) || 0) + (Number(r[8]) || 0);
            const neg = (Number(r[5]) || 0) + (Number(r[7]) || 0) + (Number(r[9]) || 0);
            const badges = Number(r[10]) || 0;
            const net = (Number(r[14]) || 0);

            totalPicks += picks;
            totalPos += pos;
            totalNeg += neg;
            totalBadges += badges;
            totalNet += net;

            studentBarItems.push({
                label: name,
                value: net,
                color: net >= 0 ? '#6abf8e' : '#c96b6b'
            });
        });
    }

    const pointsComparisonItems = [
        { label: 'Positive (+)', value: totalPos, color: '#6abf8e' },
        { label: 'Negative (-)', value: totalNeg, color: '#c96b6b' },
        { label: 'Total Picks', value: totalPicks, color: '#5b8fcc' },
        { label: 'Badges Awarded', value: totalBadges, color: '#e2c96e' }
    ];

    const barChartHtml = buildNeobrutalistSvgBarChart('Student Net Scores Across Class', studentBarItems.slice(0, 18), { height: 250 });
    const metricsChartHtml = buildNeobrutalistSvgBarChart('Point & Action Breakdown Overview', pointsComparisonItems, { height: 230 });

    const rosterHeaders = overviewData.headers.map(h => `<th>${escHtml(h)}</th>`).join('');
    const rosterRows = overviewData.rows.map(r => `<tr>${r.map(c => `<td>${escHtml(String(c))}</td>`).join('')}</tr>`).join('');

    return `
        <div class="report-header">
            <div>
                <h1>Class Participation Report — ${escHtml(groupName)}</h1>
                <div class="report-meta">
                    <span>Date Range: <strong>${escHtml(dateStrLabel)}</strong></span> | 
                    <span>Exported: <strong>${new Date().toLocaleString()}</strong></span>
                </div>
            </div>
        </div>

        <div class="stat-grid">
            <div class="stat-box" style="background:#5b8fcc; color:#fff;">
                <div class="stat-box-title" style="color:#fff;">Total Students</div>
                <div class="stat-box-num" style="color:#fff;">${totalStudents}</div>
            </div>
            <div class="stat-box" style="background:#6abf8e; color:#111;">
                <div class="stat-box-title">Total Sessions</div>
                <div class="stat-box-num">${totalSessions}</div>
            </div>
            <div class="stat-box" style="background:#e2c96e; color:#111;">
                <div class="stat-box-title">Total Picks</div>
                <div class="stat-box-num">${totalPicks}</div>
            </div>
            <div class="stat-box" style="background:#fafaf7; color:#222;">
                <div class="stat-box-title">Class Net Score</div>
                <div class="stat-box-num">${totalNet >= 0 ? '+' + totalNet : totalNet}</div>
            </div>
        </div>

        <div class="charts-grid">
            ${barChartHtml}
            ${metricsChartHtml}
        </div>

        <h2 style="font-size:16px; font-weight:900; text-transform:uppercase; margin-bottom:12px; border-bottom:2px solid #333333; padding-bottom:6px; color:#222222;">Student Performance Roster</h2>
        <div class="table-wrap">
            <table>
                <thead><tr>${rosterHeaders}</tr></thead>
                <tbody>${rosterRows}</tbody>
            </table>
        </div>
    `;
}

function buildStudentExhaustiveReportHtml(studentName, groupName, dateStrLabel) {
    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);

    const timelinePoints = [];
    let stPicks = 0, stPluses = 0, stMinuses = 0, stTeamPluses = 0, stTeamMinuses = 0, stBadges = 0, stAttended = 0;

    sessions.forEach(sess => {
        const students = sess.groups[currentGroupId] || [];
        const st = students.find(s => s.name === studentName);
        if (st) {
            if (!st.isAbsent) stAttended++;
            if (st.isPicked) stPicks++;
            stPluses += st.pluses || 0;
            stMinuses += st.minuses || 0;
            stTeamPluses += st.teamPluses || 0;
            stTeamMinuses += st.teamMinuses || 0;
            stBadges += (st.badges || []).length;

            const dateStr = new Date(sess.id).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const net = getStudentSessionNet(st);
            timelinePoints.push({ label: dateStr, value: net });
        }
    });

    const netScore = (stPluses + stTeamPluses) - (stMinuses + stTeamMinuses);
    const lineChartHtml = buildNeobrutalistSvgLineChart(`Participation Timeline Net Score — ${escHtml(studentName)}`, timelinePoints, { height: 230 });

    const categoryItems = [
        { label: 'Pluses (+)', value: stPluses, color: '#6abf8e' },
        { label: 'Minuses (-)', value: stMinuses, color: '#c96b6b' },
        { label: 'Team (+)', value: stTeamPluses, color: '#5b8fcc' },
        { label: 'Team (-)', value: stTeamMinuses, color: '#d97fa8' },
        { label: 'Badges', value: stBadges, color: '#e2c96e' }
    ];
    const barChartHtml = buildNeobrutalistSvgBarChart('Activity Category Breakdown', categoryItems, { height: 230 });

    return `
        <div class="report-header">
            <div>
                <h1>Individual Student Scorecard — ${escHtml(studentName)}</h1>
                <div class="report-meta">
                    <span>Class: <strong>${escHtml(groupName)}</strong></span> | 
                    <span>Date Range: <strong>${escHtml(dateStrLabel)}</strong></span>
                </div>
            </div>
        </div>

        <div class="stat-grid">
            <div class="stat-box" style="background:#5b8fcc; color:#fff;">
                <div class="stat-box-title" style="color:#fff;">Sessions Attended</div>
                <div class="stat-box-num" style="color:#fff;">${stAttended} / ${sessions.length}</div>
            </div>
            <div class="stat-box" style="background:#6abf8e; color:#111;">
                <div class="stat-box-title">Picks Count</div>
                <div class="stat-box-num">${stPicks}</div>
            </div>
            <div class="stat-box" style="background:#e2c96e; color:#111;">
                <div class="stat-box-title">Badges Earned</div>
                <div class="stat-box-num">${stBadges}</div>
            </div>
            <div class="stat-box" style="background:#fafaf7; color:#222;">
                <div class="stat-box-title">Net Score</div>
                <div class="stat-box-num">${netScore >= 0 ? '+' + netScore : netScore}</div>
            </div>
        </div>

        <div class="charts-grid">
            ${lineChartHtml}
            ${barChartHtml}
        </div>
    `;
}

function buildMultiClassExhaustiveReportHtml(dateStrLabel) {
    const data = getExportDataForCategory('groupComparison');

    const barItems = data.rows.map(r => ({
        label: String(r[0]).substring(0, 10),
        value: parseFloat(r[17]) || 0,
        color: (parseFloat(r[17]) || 0) >= 0 ? '#6abf8e' : '#c96b6b'
    }));

    const chartHtml = buildNeobrutalistSvgBarChart('Cross-Group Average Net Score per Student', barItems, { height: 260 });

    const headersHtml = data.headers.map(h => `<th>${escHtml(h)}</th>`).join('');
    const rowsHtml = data.rows.map(r => `<tr>${r.map(c => `<td>${escHtml(String(c))}</td>`).join('')}</tr>`).join('');

    const targetGroups = (compareGroupIds && compareGroupIds.length > 0) ? compareGroupIds : extractGroupsFromData();
    const dateRange = getDateRange();
    const summaries = targetGroups.map(groupId => getGroupSummary(groupId, dateRange.from, dateRange.to));
    const numGroups = summaries.length || 1;
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
        sessions: 0, students: 0, picks: 0, positive: 0, negative: 0,
        badgePositive: 0, badgeNegative: 0, badges: 0, net: 0
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

    const tfootHtml = `
        <tfoot>
            <tr style="font-weight:bold; background:#f4f7ff;">
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
            <tr style="font-weight:bold; background:#e9effd;">
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
        </tfoot>
    `;

    return `
        <div class="report-header">
            <div>
                <h1>Multi-Class Participation Comparison Report</h1>
                <div class="report-meta">
                    <span>Date Range: <strong>${escHtml(dateStrLabel)}</strong></span> | 
                    <span>Total Groups: <strong>${data.rows.length}</strong></span>
                </div>
            </div>
        </div>

        <div class="charts-grid" style="grid-template-columns: 1fr;">
            ${chartHtml}
        </div>

        <h2 style="font-size:16px; font-weight:900; text-transform:uppercase; margin-bottom:12px; border-bottom:2px solid #333333; padding-bottom:6px; color:#222222;">Comparative Metrics Table</h2>
        <div class="table-wrap">
            <table>
                <thead><tr>${headersHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody>
                ${tfootHtml}
            </table>
        </div>
    `;
}

function generateExhaustiveReportDocument(reportType) {
    const dateRange = getDateRange();
    const dateStrLabel = (dateRange.from && dateRange.to) ? `${dateRange.from} to ${dateRange.to}` : (dateRange.from ? `From ${dateRange.from}` : 'All Data');
    const rawGroupName = (typeof groupDisplayName === 'function')
        ? groupDisplayName(currentGroupId)
        : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[currentGroupId]) ? CLASS_GROUPS_META[currentGroupId].name : (currentGroupId || 'Class'));
    const groupName = rawGroupName || 'Class';

    let title = '';
    let bodyHtml = '';
    let filenameBase = '';

    if (reportType === 'class') {
        title = `Exhaustive Class Participation Report — ${groupName}`;
        filenameBase = `class_report_${groupName}_${Date.now()}`;
        bodyHtml = buildClassExhaustiveReportHtml(groupName, dateStrLabel);
    } else if (reportType === 'student') {
        const studentName = currentStudentName || 'Active Student';
        title = `Exhaustive Student Scorecard & Activity Report — ${studentName} (${groupName})`;
        filenameBase = `student_report_${studentName}_${groupName}_${Date.now()}`;
        bodyHtml = buildStudentExhaustiveReportHtml(studentName, groupName, dateStrLabel);
    } else if (reportType === 'multiClass') {
        title = `Multi-Class Participation Comparison Report`;
        filenameBase = `multiclass_report_${Date.now()}`;
        bodyHtml = buildMultiClassExhaustiveReportHtml(dateStrLabel);
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(title)}</title>
    <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Lexend', system-ui, -apple-system, sans-serif; background: #f5f5f0; color: #222222; padding: 20px; line-height: 1.4; }
.report-card { max-width: 1200px; margin: 0 auto; background: #ffffff; border: 2px solid #333333; box-shadow: 4px 4px 0 #555555; border-radius: 10px; padding: 24px; }
.report-header { border-bottom: 2px solid #333333; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.report-header h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #222222; }
.report-meta { font-size: 12px; font-weight: 600; color: #475569; display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-box { background: #fafaf7; border: 2px solid #333333; box-shadow: 3px 3px 0 #555555; border-radius: 8px; padding: 14px; text-align: center; }
.stat-box-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
.stat-box-num { font-size: 26px; font-weight: 900; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 24px; }
.table-wrap { border: 2px solid #333333; box-shadow: 3px 3px 0 #555555; border-radius: 8px; overflow-x: auto; margin-bottom: 24px; background: #ffffff; }
table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; font-weight: 600; }
th { background: #222222; color: #ffffff; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; padding: 10px 8px; border-bottom: 2px solid #333333; border-right: 1px solid #444444; text-align: center; }
td { padding: 8px 10px; border-bottom: 1.5px solid #333333; border-right: 1.5px solid #333333; text-align: center; color: #222222; vertical-align: middle; }
tr:nth-child(even) td { background: #fafaf7; }
tfoot td { font-weight: 900; background: #f5f5f0; border-top: 2px solid #333333; }
.toolbar { display: flex; gap: 10px; margin-bottom: 18px; justify-content: flex-end; }
.btn { padding: 8px 16px; border: 2px solid #333333; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; box-shadow: 3px 3px 0 #555555; background: #ffffff; color: #222222; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease; }
.btn:hover { background: #e2c96e; transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #555555; }
.btn-primary { background: #222222; color: #ffffff; }
.btn-primary:hover { background: #333333; }
.btn-icon { width: 14px; height: 14px; display: inline-block; vertical-align: middle; }
@media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none !important; }
    .report-card { border: none; box-shadow: none; padding: 0; }
    .stat-box, .charts-grid > div, .table-wrap { box-shadow: none !important; page-break-inside: avoid; }
}
    </style>
</head>
<body>
    <div class="toolbar">
<button class="btn btn-primary" onclick="window.print()"><img src="../assets/icons/printer.svg" class="btn-icon" alt="" /> Print / Save as PDF</button>
<button class="btn" onclick="downloadHtmlReport()"><img src="../assets/icons/save.svg" class="btn-icon" alt="" /> Save Report HTML</button>
    </div>
    <div class="report-card">
${bodyHtml}
<footer class="exp-footer pt-report-footer" style="margin-top:20px;padding-top:8px;border-top:1.5px solid #333333;display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;break-inside:avoid;page-break-inside:avoid;">
    <span class="exp-footer-left">${escHtml(title)} | Class Management Tools</span>
    ${(typeof window.getAppTeacherName === 'function' && window.getAppTeacherName()) ? `<span class="exp-footer-center" style="font-weight:700;color:#222;">${escHtml(window.getAppTeacherName())}</span>` : ''}
    <span class="exp-footer-right">Exported: ${new Date().toLocaleDateString()}</span>
</footer>
    </div>
    <script>
function downloadHtmlReport() {
    var blob = new Blob(['<!DOCTYPE html>\\n' + document.documentElement.outerHTML], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '${filenameBase}.html';
    a.click();
}
    <\/script>
</body>
</html>`;

    return { title, filenameBase, fullHtml };
}

let activePreviewExportType = 'ptExport';

function previewPtExport() {
    activePreviewExportType = 'ptExport';
    const category = document.querySelector('input[name="ptExportCategory"]:checked')?.value || 'classOverview';
    let previewHtml = '';
    let title = 'Report & Export Live Preview';

    if (category === 'exhaustiveReport') {
        const reportType = document.querySelector('input[name="ptReportType"]:checked')?.value || 'class';
        const doc = generateExhaustiveReportDocument(reportType);
        previewHtml = doc.fullHtml;
        title = doc.title;
    } else {
        const data = getExportDataForCategory(category);
        if (!data || !data.rows || data.rows.length === 0) {
            showMessage('No records found to preview.', 'error');
            return;
        }
        title = data.title;
        previewHtml = generatePrintableHtmlReport(data);
    }

    showExportPreviewModal(title, previewHtml);
}

function previewExportRules() {
    activePreviewExportType = 'rulesExport';
    const format = document.querySelector('input[name="ptRulesExportFormat"]:checked')?.value || 'html';
    const rulesData = getRulesExportData();

    if (!rulesData || !rulesData.rules || rulesData.rules.length === 0) {
        showMessage(typeof t === 'function' ? (t('ptRulesExportNoRules') || 'No rules configured to export.') : 'No rules configured to export.', 'error');
        return;
    }

    let previewHtml = '';
    if (format === 'md') {
        const mdText = generateRulesMarkdown(rulesData);
        previewHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:monospace;padding:20px;background:#f8f9fa;color:#111;white-space:pre-wrap;line-height:1.5;}</style></head><body>${escHtml(mdText)}</body></html>`;
    } else {
        previewHtml = generateRulesPrintableHtml(rulesData);
    }

    showExportPreviewModal(rulesData.title, previewHtml);
}

function showExportPreviewModal(title, htmlContent) {
    const modal = document.getElementById('ptExportPreviewModal');
    const titleEl = document.getElementById('ptExportPreviewTitle');
    const iframe = document.getElementById('ptExportPreviewIframe');

    if (titleEl) titleEl.textContent = title || 'Live Export & Report Preview';
    if (iframe) {
        iframe.srcdoc = htmlContent;
        if (window.ExportStylesService) {
            var sId = ExportStylesService.getSelectedStyle('participationTracker');
            iframe.onload = function () {
                ExportStylesService.applyStyleToIframe(iframe, sId);
            };
        }
    }

    if (window.ExportStylesService) {
        var sId = ExportStylesService.getSelectedStyle('participationTracker');
        ExportStylesService.renderStyleSelector(document.getElementById('pt-preview-style-selector-wrap'), {
            toolKey: 'participationTracker',
            currentStyleId: sId,
            onChange: function (styleId) {
                if (iframe) ExportStylesService.applyStyleToIframe(iframe, styleId);
            }
        });
    }

    if (modal) modal.classList.add('active');
}

function closePtExportPreviewModal() {
    const modal = document.getElementById('ptExportPreviewModal');
    if (modal) modal.classList.remove('active');
}

function confirmExportFromPreview() {
    closePtExportPreviewModal();
    if (activePreviewExportType === 'rulesExport') {
        executeExportRules();
    } else {
        executePtExport();
    }
}

async function executeExhaustiveReport(reportType, format) {
    const doc = generateExhaustiveReportDocument(reportType);
    let fullHtml = doc.fullHtml;
    const filenameBase = doc.filenameBase;

    if (window.ExportStylesService) {
        fullHtml = await ExportStylesService.injectStyleIntoHtml(fullHtml, ExportStylesService.getSelectedStyle('participationTracker'));
    }

    if (format === 'pdf') {
        const pdfSettings = getPdfExportSettings();
        const defaultName = `${filenameBase}.pdf`;

        if (window.Desktop && Desktop.isElectron() && typeof Desktop.printPdf === 'function') {
            try {
                const destination = await openPtPdfExportModal();
                if (!destination) return;

                const pdfReq = {
                    html: fullHtml,
                    landscape: pdfSettings.isLandscape,
                    pdfOptions: { pageSize: pdfSettings.pageSize, landscape: pdfSettings.isLandscape }
                };
                if (destination === 'to-print') {
                    pdfReq.target = 'toPrint';
                    pdfReq.filename = defaultName;
                } else {
                    pdfReq.defaultName = defaultName;
                }
                const result = await Desktop.printPdf(pdfReq);
                if (result && result.ok) {
                    const msg = destination === 'to-print'
                        ? ('PDF saved to Print folder: ' + (result.name || defaultName))
                        : 'PDF report exported successfully!';
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
            const win = window.open('', '_blank');
            if (win && win.document) {
                win.document.write(fullHtml);
                win.document.close();
                win.focus();
                setTimeout(() => win.print(), 500);
            } else {
                downloadFile(`${filenameBase}.html`, fullHtml, 'text/html');
                showMessage('Exhaustive report exported as HTML!', 'success');
            }
        }
    } else {
        await downloadFile(`${filenameBase}.html`, fullHtml, 'text/html;charset=utf-8');
        showMessage('Exhaustive report exported as HTML!', 'success');
    }
}

async function executePtExport() {
    const category = document.querySelector('input[name="ptExportCategory"]:checked')?.value || 'classOverview';
    const format = document.querySelector('input[name="ptExportFormat"]:checked')?.value || 'html';

    if (category === 'exhaustiveReport') {
        const reportType = document.querySelector('input[name="ptReportType"]:checked')?.value || 'class';
        closePtExportModal();
        executeExhaustiveReport(reportType, format);
        return;
    }

    const data = getExportDataForCategory(category);
    if (!data || !data.rows || data.rows.length === 0) {
        showMessage('No records found for the selected export options.', 'error');
        return;
    }

    closePtExportModal();

    if (format === 'html') {
        await exportCategoryAsHtml(category, data);
    } else if (format === 'pdf') {
        await exportCategoryAsPdf(category, data);
    } else if (format === 'docx') {
        await exportCategoryAsDocx(category, data);
    } else if (format === 'xlsx' || format === 'ods') {
        exportCategoryAsXlsx(category, data, format);
    } else if (format === 'csv') {
        exportCategoryAsCsv(category, data);
    }
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

function generatePrintableHtmlReport(data) {
    let tableHeadersHtml = data.headers.map(h => `<th>${escHtml(h)}</th>`).join('');
    let tableRowsHtml = data.rows.map(row => {
        const cells = row.map(cell => `<td>${escHtml(String(cell))}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('\n');
    const pdfSettings = getPdfExportSettings();
    const colCount = data.headers ? data.headers.length : 4;
    const thFontSize = colCount > 10 ? '9px' : (colCount > 6 ? '10px' : '11px');
    const tdFontSize = colCount > 10 ? '9px' : (colCount > 6 ? '10px' : '11px');
    const cellPadding = colCount > 10 ? '4px 6px' : (colCount > 6 ? '6px 8px' : '8px 10px');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escHtml(data.title)}</title>
    <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; }
body { font-family: var(--exp-font-family, 'Lexend', system-ui, -apple-system, sans-serif); font-size: 12px; color: var(--exp-text-color, #222222); background: var(--exp-bg-page, #ffffff); margin: 0; padding: 0; line-height: 1.4; }
h1 { font-size: 18px; font-weight: 900; color: var(--exp-text-color, #222222); border-bottom: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.meta-box { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 11px; color: var(--exp-text-color, #222222); background: var(--exp-bg-surface, #fafaf7); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); border-radius: var(--exp-border-radius, 6px); padding: 8px 12px; margin-bottom: 14px; box-shadow: var(--exp-shadow, 3px 3px 0 #555555); }
.meta-item { display: flex; gap: 6px; align-items: center; }
.meta-label { font-weight: 800; color: var(--exp-text-muted, #222222); text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
.meta-val { font-weight: 600; color: var(--exp-text-color, #222222); }
table { width: 100%; max-width: 100%; border-collapse: var(--exp-table-border-collapse, collapse); border: var(--exp-border-width, 2px) solid var(--exp-border-color, #333333); margin-top: 4px; background: var(--exp-bg-surface, #ffffff); page-break-inside: auto; table-layout: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
th, td { border: var(--exp-table-cell-border, 1.5px solid #333333); padding: ${cellPadding}; vertical-align: middle; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
th { background: var(--exp-table-th-bg, #f5f5f0); font-weight: 800; color: var(--exp-text-color, #222222); text-align: left; text-transform: uppercase; font-size: ${thFontSize}; letter-spacing: 0.03em; }
td { font-size: ${tdFontSize}; color: var(--exp-text-color, #222222); }
tr:nth-child(even) td { background: var(--exp-table-row-even, #fafaf7); }
@page { size: ${pdfSettings.pageSize} ${pdfSettings.orientation}; margin: ${pdfSettings.margin}; }
@media print {
    body { margin: 0; padding: 0; }
    .meta-box { box-shadow: none !important; }
    table { max-width: 100% !important; width: 100% !important; }
}
    </style>
</head>
<body>
    <h1>${escHtml(data.title)}</h1>
    <div class="meta-box">
<div class="meta-item"><span class="meta-label">Description:</span> <span class="meta-val">${escHtml(data.description)}</span></div>
<div class="meta-item"><span class="meta-label">Generated:</span> <span class="meta-val">${new Date().toLocaleString()}</span></div>
    </div>
    <table>
<thead><tr>${tableHeadersHtml}</tr></thead>
<tbody>
    ${tableRowsHtml}
</tbody>
    </table>
    <footer class="exp-footer pt-report-footer" style="margin-top:20px;padding-top:8px;border-top:1.5px solid #333333;display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;break-inside:avoid;page-break-inside:avoid;">
<span class="exp-footer-left">${escHtml(data.title)} | Class Management Tools</span>
${(typeof window.getAppTeacherName === 'function' && window.getAppTeacherName()) ? `<span class="exp-footer-center" style="font-weight:700;color:#222;">${escHtml(window.getAppTeacherName())}</span>` : ''}
<span class="exp-footer-right">Exported: ${new Date().toLocaleDateString()}</span>
    </footer>
</body>
</html>`;
}

async function exportCategoryAsHtml(category, data) {
    const editableAttr = ' contenteditable="true"';
    let tableHeadersHtml = data.headers.map(h => `
        <th onclick="onThClick(event, this)">
            <div class="th-content">
                <span class="th-label" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()">${escHtml(h)}</span>
                <span class="th-actions">
                    <button type="button" class="col-btn col-sort-btn" title="Sort Column" onclick="event.stopPropagation(); sortTableColumn(this)">
                        <span class="sort-icon">↕</span>
                    </button>
                    <button type="button" class="col-btn col-remove-btn" title="Remove Column" onclick="event.stopPropagation(); removeTableColumn(this)">
                        ✕
                    </button>
                </span>
            </div>
        </th>
    `).join('');

    let tableRowsHtml = data.rows.map(row => {
        const cells = row.map(cell => `<td ${editableAttr}>${escHtml(String(cell))}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('\n');

    const scriptContent = `
window._initialTableMarkup = document.getElementById('reportTable').outerHTML;

function filterTable() {
    var input = document.getElementById('tableFilterInput');
    var filter = input.value.toLowerCase();
    var rows = document.querySelectorAll('#reportTable tbody tr');
    rows.forEach(function(row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.indexOf(filter) > -1 ? '' : 'none';
    });
}

function onThClick(e, th) {
    if (e.target.closest('.col-remove-btn')) return;
    if (e.target.classList.contains('th-label') && document.activeElement === e.target) return;
    sortTableColumn(th);
}

function sortTableColumn(target) {
    var th = target.closest ? target.closest('th') : target;
    if (!th) return;
    var table = document.getElementById('reportTable');
    var colIdx = Array.from(th.parentNode.children).indexOf(th);
    if (colIdx === -1) return;
    var tbody = table.querySelector('tbody');
    var rows = Array.from(tbody.querySelectorAll('tr'));

    var currentDir = th.dataset.sortDir;
    var newDir = currentDir === 'asc' ? 'desc' : 'asc';

    table.querySelectorAll('th').forEach(function(header) {
        delete header.dataset.sortDir;
        header.classList.remove('sorted-asc', 'sorted-desc');
        var icon = header.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
    });

    th.dataset.sortDir = newDir;
    th.classList.add(newDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    var currentIcon = th.querySelector('.sort-icon');
    if (currentIcon) currentIcon.textContent = newDir === 'asc' ? '▲' : '▼';

    rows.sort(function(a, b) {
        var aCell = a.children[colIdx];
        var bCell = b.children[colIdx];
        var aText = aCell ? aCell.textContent.trim() : '';
        var bText = bCell ? bCell.textContent.trim() : '';

        var cleanA = aText.replace(/[\\$,%]/g, '').replace(/,/g, '').trim();
        var cleanB = bText.replace(/[\\$,%]/g, '').replace(/,/g, '').trim();

        var aNum = Number(cleanA);
        var bNum = Number(cleanB);

        if (cleanA !== '' && cleanB !== '' && !isNaN(aNum) && !isNaN(bNum)) {
            return newDir === 'asc' ? aNum - bNum : bNum - aNum;
        }

        return newDir === 'asc'
            ? aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' })
            : bText.localeCompare(aText, undefined, { numeric: true, sensitivity: 'base' });
    });

    rows.forEach(function(r) { tbody.appendChild(r); });
}

function removeTableColumn(btn) {
    var th = btn.closest('th');
    if (!th) return;
    var table = th.closest('table');
    var colIdx = Array.from(th.parentNode.children).indexOf(th);
    if (colIdx === -1) return;

    th.remove();

    table.querySelectorAll('tbody tr').forEach(function(row) {
        if (row.children[colIdx]) {
            row.children[colIdx].remove();
        }
    });

    var resetBtn = document.getElementById('resetColsBtn');
    if (resetBtn) resetBtn.style.display = 'inline-flex';
}

function restoreColumns() {
    if (window._initialTableMarkup) {
        var wrap = document.querySelector('.table-wrap');
        if (wrap) {
            wrap.innerHTML = window._initialTableMarkup;
        }
        var resetBtn = document.getElementById('resetColsBtn');
        if (resetBtn) resetBtn.style.display = 'none';
        filterTable();
    }
}

function exportEditedHtml() {
    var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    var blob = new Blob([html], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '${data.filenameBase}_edited.html';
    a.click();
}

function exportTableToCsv() {
    var rows = document.querySelectorAll('#reportTable tr');
    var csv = [];
    rows.forEach(function(row) {
        if (row.style.display === 'none') return;
        var cols = row.querySelectorAll('th, td');
        var rowData = [];
        cols.forEach(function(col) {
            var labelEl = col.querySelector('.th-label');
            var val = labelEl ? labelEl.textContent.trim() : col.textContent.trim();
            val = val.replace(/"/g, '""');
            rowData.push('"' + val + '"');
        });
        if (rowData.length > 0) csv.push(rowData.join(','));
    });
    var blob = new Blob([csv.join('\\n')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '${data.filenameBase}.csv';
    a.click();
}
`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(data.title)}</title>
    <style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Lexend', system-ui, -apple-system, sans-serif; background: #ffffff; color: #222222; padding: 16mm 14mm; line-height: 1.4; }
h1 { font-size: 20px; font-weight: 900; color: #222222; border-bottom: 2px solid #333333; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.meta-box { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 12px; color: #222222; background: #fafaf7; border: 2px solid #333333; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; box-shadow: 3px 3px 0 #555555; }
.meta-item { display: flex; gap: 6px; align-items: center; }
.meta-label { font-weight: 800; color: #222222; text-transform: uppercase; font-size: 11px; letter-spacing: 0.03em; }
.meta-val { font-weight: 600; color: #222222; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.btn { font-family: inherit; font-weight: 700; font-size: 12px; padding: 7px 14px; border: 2px solid #333333; border-radius: 6px; background: #ffffff; color: #222222; cursor: pointer; box-shadow: 3px 3px 0 #555555; text-transform: uppercase; transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease; }
.btn:hover { background: #fdfdfd; transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #555555; }
.btn-primary { background: #222222; color: #ffffff; }
.btn-primary:hover { background: #333333; }
.search-box { padding: 7px 12px; border: 2px solid #333333; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 600; width: 260px; box-shadow: 2px 2px 0 #888888; outline: none; }
.search-box:focus { background: #ffffff; border-color: #222222; box-shadow: 0 0 0 2px #e2c96e; }
.table-wrap { overflow-x: auto; border: 2px solid #333333; border-radius: 6px; background: #ffffff; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
th { background: #f5f5f0; color: #222222; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; border: 1.5px solid #333333; cursor: pointer; user-select: none; position: sticky; top: 0; white-space: nowrap; }
th:hover { background: #ecece6; }
th.sorted-asc, th.sorted-desc { background: #e2c96e; color: #111111; }
.th-content { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; }
.th-label { flex: 1; outline: none; border-radius: 3px; cursor: text; }
.th-label:focus { background: #fffbe6; outline: 2px solid #333333; }
.th-actions { display: inline-flex; align-items: center; gap: 4px; opacity: 0.7; transition: opacity 0.15s ease; }
th:hover .th-actions { opacity: 1; }
.col-btn { background: #ffffff; border: 1.5px solid #333333; border-radius: 4px; color: #222222; cursor: pointer; font-size: 11px; padding: 1px 5px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 1px 1px 0 #555555; transition: all 0.1s; }
.col-btn:hover { background: #f0f0f0; }
.col-remove-btn:hover { background: #fee2e2; color: #c96b6b; border-color: #c96b6b; }
.sort-icon { font-weight: bold; font-size: 11px; }
td { padding: 8px 10px; border: 1.5px solid #333333; font-size: 11px; color: #222222; vertical-align: middle; }
tr:nth-child(even) td { background: #fafaf7; }
[contenteditable="true"]:focus { outline: 2px solid #333333; background: #fffbe6 !important; }
.editable-badge { display: inline-block; font-size: 10px; font-weight: 800; background: #e2c96e; color: #111111; border: 1.5px solid #333333; padding: 2px 6px; border-radius: 4px; box-shadow: 2px 2px 0 #555555; text-transform: uppercase; margin-left: 8px; }
@media print { .toolbar, .search-box, .th-actions, #resetColsBtn { display: none !important; } .meta-box, .btn, .search-box { box-shadow: none !important; } }
    </style>
</head>
<body>
    <h1>${escHtml(data.title)} <span class="editable-badge">Editable HTML</span></h1>
    <div class="meta-box">
<div class="meta-item"><span class="meta-label">Description:</span> <span class="meta-val">${escHtml(data.description)}</span></div>
<div class="meta-item"><span class="meta-label">Generated:</span> <span class="meta-val">${new Date().toLocaleString()}</span></div>
    </div>

    <div class="toolbar">
<input type="text" class="search-box" id="tableFilterInput" placeholder="Search records..." onkeyup="filterTable()">
<button class="btn btn-primary" onclick="window.print()"><img src="../assets/icons/printer.svg" style="width:13px;height:13px;vertical-align:middle;" alt="" /> Print Report</button>
<button class="btn" onclick="exportEditedHtml()"><img src="../assets/icons/save.svg" style="width:13px;height:13px;vertical-align:middle;" alt="" /> Save HTML Copy</button>
<button class="btn" onclick="exportTableToCsv()"><img src="../assets/icons/download.svg" style="width:13px;height:13px;vertical-align:middle;" alt="" /> Export CSV</button>
<button class="btn" id="resetColsBtn" style="display: none;" onclick="restoreColumns()">Restore Columns</button>
    </div>

    <div class="table-wrap">
<table id="reportTable">
    <thead>
        <tr>${tableHeadersHtml}</tr>
    </thead>
    <tbody>
        ${tableRowsHtml}
    </tbody>
</table>
    </div>

    ${'<script>' + scriptContent + '</' + 'script>'}
</body>
</html>`;

    if (window.ExportStylesService) {
        htmlContent = await ExportStylesService.injectStyleIntoHtml(htmlContent, ExportStylesService.getSelectedStyle('participationTracker'));
    }
    downloadFile(`${data.filenameBase}.html`, htmlContent, 'text/html');
    showMessage('Editable HTML report exported successfully!', 'success');
}

async function exportCategoryAsPdf(category, data) {
    let html = generatePrintableHtmlReport(data);
    if (window.ExportStylesService) {
        html = await ExportStylesService.injectStyleIntoHtml(html, ExportStylesService.getSelectedStyle('participationTracker'));
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
            if (destination === 'to-print') {
                pdfReq.target = 'toPrint';
                pdfReq.filename = defaultName;
            } else {
                pdfReq.defaultName = defaultName;
            }
            const result = await Desktop.printPdf(pdfReq);
            if (result && result.ok) {
                const msg = destination === 'to-print'
                    ? ((typeof t === 'function' ? t('deExportPdfToPrintSuccess') : 'PDF saved to Print folder: ') + (result.name || defaultName))
                    : ((typeof t === 'function' ? t('deExportPdfSuccess') : 'PDF exported') || 'PDF report exported successfully!');
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

async function exportCategoryAsDocx(category, data) {
    const htmlReport = generatePrintableHtmlReport(data);
    if (window.saveExportWithDestination) {
        return await window.saveExportWithDestination({
            filename: `${data.filenameBase}.docx`,
            docxRequest: {
                html: htmlReport,
                title: data.title,
                defaultName: `${data.filenameBase}.docx`
            }
        });
    }
    if (window.Desktop && Desktop.isElectron() && typeof Desktop.exportDocx === 'function') {
        const result = await Desktop.exportDocx({
            html: htmlReport,
            title: data.title,
            defaultPath: `${data.filenameBase}.docx`
        });
        if (result && result.ok) {
            if (window.showExportSuccessPopup && result.path) {
                showExportSuccessPopup(result.path, result.name || `${data.filenameBase}.docx`);
            } else {
                showMessage('DOCX report exported successfully!', 'success');
            }
        } else if (!result || !result.canceled) {
            showMessage('DOCX export error: ' + (result?.error || 'failed'), 'error');
        }
    } else {
        const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${escHtml(data.title)}</title></head>
<body>${htmlReport}</body></html>`;
        await downloadFile(`${data.filenameBase}.doc`, docHtml, 'application/msword');
        showMessage('Word document exported successfully!', 'success');
    }
}

async function exportCategoryAsXlsx(category, data, format = 'xlsx') {
    if (typeof XLSX === 'undefined') {
        showMessage('XLSX library not loaded. Exporting as CSV instead.', 'error');
        exportCategoryAsCsv(category, data);
        return;
    }

    const aoa = [
        [data.title],
        [data.description],
        [],
        data.headers,
        ...data.rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (data.groupName || 'Stats').slice(0, 31));

    const isOds = format === 'ods';
    const wbout = XLSX.write(wb, { bookType: isOds ? 'ods' : 'xlsx', type: 'array' });
    const mime = isOds ? 'application/vnd.oasis.opendocument.spreadsheet' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    await downloadFile(`${data.filenameBase}.${isOds ? 'ods' : 'xlsx'}`, wbout, mime);
    showMessage(isOds ? 'LibreOffice Calc (.ods) spreadsheet exported successfully!' : 'XLSX spreadsheet exported successfully!', 'success');
}

function exportCategoryAsCsv(category, data) {
    let csv = data.headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

    data.rows.forEach(row => {
        const line = row.map(cell => {
            const val = String(cell ?? '').replace(/"/g, '""').replace(/\n/g, ' ');
            return `"${val}"`;
        }).join(',');
        csv += line + '\n';
    });

    downloadFile(`${data.filenameBase}.csv`, csv, 'text/csv');
    showMessage('CSV file exported successfully!', 'success');
}

