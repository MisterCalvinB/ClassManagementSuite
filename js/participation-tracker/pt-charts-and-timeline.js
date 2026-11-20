// Participation Tracker — Main Chart, Planner Slot Resolution & Interactive Session Timeline
function renderChart(sessions) {
    const canvas = document.getElementById('participationChart');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const metrics = aggregateMetrics(sessions);
    if (metrics.length === 0) {
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

    // Find max values
    const maxPicks = Math.max(...metrics.map(m => m.picks), 1);
    const maxPluses = Math.max(...metrics.map(m => m.pluses), 1);
    const maxMinuses = Math.max(...metrics.map(m => m.minuses), 1);
    const maxValue = Math.max(maxPicks, maxPluses, maxMinuses);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Draw lines
    const colors = { picks: '#1f77b4', pluses: '#2ca02c', minuses: '#d62728' };
    const keys = ['picks', 'pluses', 'minuses'];

    keys.forEach(key => {
        ctx.strokeStyle = colors[key];
        ctx.lineWidth = 2;
        ctx.beginPath();

        metrics.forEach((m, i) => {
            const x = padding + (chartWidth / (metrics.length - 1 || 1)) * i;
            const y = canvas.height - padding - (m[key] / maxValue) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    });

    // Draw points
    keys.forEach(key => {
        ctx.fillStyle = colors[key];
        metrics.forEach((m, i) => {
            const x = padding + (chartWidth / (metrics.length - 1 || 1)) * i;
            const y = canvas.height - padding - (m[key] / maxValue) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    });

    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = Math.round((maxValue / 4) * i);
        const y = canvas.height - padding - (chartHeight / 4) * i;
        ctx.fillText(value, padding - 10, y + 3);
    }

    // X-axis labels (sample every nth date to avoid clutter)
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(metrics.length / 8));
    metrics.forEach((m, i) => {
        if (i % labelStep === 0) {
            const x = padding + (chartWidth / (metrics.length - 1 || 1)) * i;
            const date = new Date(m.date);
            ctx.fillText(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, canvas.height - padding + 15);
        }
    });
}

// ================================================================
// SESSION TIMELINE & INTERACTION FLOW ENGINE
// ================================================================

let _timelineState = {
    session: null,
    sessionId: null,
    slotDuration: 'slot',
    timeDisplay: 'elapsed',
    activeFilters: new Set(['points', 'picks', 'timers', 'teams', 'badges', 'attendance']),
    selectedStudentId: '',
    selectedStudentName: '',
    connectedSlot: null,
    events: [],
    rawEvents: [],
    timeBounds: { startMs: 0, endMs: 0, durationMs: 0 },
    timerIntervals: [],
    modeIntervals: [],
    teamIntervals: [],
    hoverTarget: null,
    hoverX: null,
    isModalOpen: false
};

const _timelineIcons = {};
const _timelineIconDefs = {
    plus: '../assets/icons/plus.svg',
    minus: '../assets/icons/close.svg',
    pick: '../assets/icons/dice.svg',
    timer: '../assets/icons/clock.svg',
    team: '../assets/icons/groups.svg',
    badge: '../assets/icons/award.svg',
    comment: '../assets/icons/comments.svg',
    attendance: '../assets/icons/user-check.svg',
    exam: '../assets/icons/test-creator.svg'
};
let _timelineIconsLoaded = false;

function preloadTimelineIcons() {
    if (_timelineIconsLoaded) return;
    _timelineIconsLoaded = true;
    Object.keys(_timelineIconDefs).forEach(key => {
        const img = new Image();
        img.onload = () => {
            requestAnimationFrame(() => {
                redrawActiveTimeline();
            });
        };
        img.src = _timelineIconDefs[key];
        _timelineIcons[key] = img;
    });
}

function isTimelineEventActive(ev, activeFilters) {
    if (!ev || !activeFilters) return false;
    if (activeFilters.has(ev.category)) return true;
    // Built-in badges (+ / -) can be viewed under either 'points' or 'badges'
    if ((ev.badgeIcon === '+' || ev.badgeIcon === '-' || ev.badgeIcon === '−') && (activeFilters.has('points') || activeFilters.has('badges'))) {
        return true;
    }
    // Team points can be viewed under 'points' or 'teams'
    if ((ev.type === 'team-plus' || ev.type === 'team-minus') && (activeFilters.has('points') || activeFilters.has('teams'))) {
        return true;
    }
    return false;
}

function eventMatchesTimelineStudent(ev, targetStudentClean) {
    if (!targetStudentClean) return true;
    const sName = String(ev.studentName || '').trim().toLowerCase();
    if (sName === targetStudentClean) return true;
    if (Array.isArray(ev.teamStudentNames) && ev.teamStudentNames.some(n => String(n).trim().toLowerCase() === targetStudentClean)) {
        return true;
    }
    return false;
}

function normalizeTimelineEvents(rawHistory, session) {
    const baseDate = getSessionLocalDateStr(session);

    const activeGid = (currentGroupId && session?.groups && session.groups[currentGroupId])
        ? currentGroupId
        : (session?.activeGroup || (session?.groups && Object.keys(session.groups)[0]) || currentGroupId || '');
    const activeTitle = (session?.activeGroupTitle || groupDisplayName(activeGid) || '').trim().toLowerCase();
    const groupStudents = (session && session.groups && activeGid && Array.isArray(session.groups[activeGid]))
        ? session.groups[activeGid]
        : [];

    const activeStudents = new Set();
    const studentByName = new Map();
    const studentById = new Map();
    const teamMembersMap = new Map(); // teamId -> Array of student names

    groupStudents.forEach(s => {
        if (!s) return;
        const clean = String(s.name || '').trim().toLowerCase();
        if (clean) {
            activeStudents.add(clean);
            studentByName.set(clean, s);
        }
        if (s.id != null) studentById.set(s.id, s);
        if (s.uuid != null) studentById.set(s.uuid, s);
        if (s.teamId != null) {
            if (!teamMembersMap.has(s.teamId)) teamMembersMap.set(s.teamId, []);
            teamMembersMap.get(s.teamId).push(s.name);
        }
    });

    const slot = (typeof resolveSessionPlannerSlot === 'function') ? resolveSessionPlannerSlot(session, activeGid) : (session?.plannerSlot || null);
    const fallbackStartMs = (function() {
        if (slot && slot.time) {
            const dt = _parseTimeToDate(slot.time, baseDate);
            if (dt && !Number.isNaN(dt.getTime())) return dt.getTime();
        }
        if (session) {
            if (session.time) {
                const dt = _parseTimeToDate(String(session.time), baseDate);
                if (dt && !Number.isNaN(dt.getTime())) return dt.getTime();
            }
            if (session.id) {
                const dt = new Date(session.id);
                if (!Number.isNaN(dt.getTime())) return dt.getTime();
            }
        }
        return Date.now();
    })();

    function parseIsoOrLocalTime(timestamp, timeStr, baseDateStr, fallbackMs, index) {
        // If explicit time string (e.g. "08:15:30") is present, anchor it directly to baseDateStr!
        // This protects against badges/events created in past sessions where timestamp was stamped with today's date.
        if (typeof timeStr === 'string' && timeStr.trim()) {
            const parts = timeStr.trim().split(':');
            if (parts.length >= 2) {
                const h = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const s = (parts[2] || '00').padStart(2, '0').slice(0, 2);
                const parsed = Date.parse(`${baseDateStr}T${h}:${m}:${s}`);
                if (!Number.isNaN(parsed)) return parsed;
            }
        }
        if (typeof timestamp === 'string' && timestamp.trim()) {
            const str = timestamp.trim();
            // If timestamp date matches baseDateStr, parse directly
            if (str.startsWith(baseDateStr)) {
                const parsed = Date.parse(str);
                if (!Number.isNaN(parsed)) return parsed;
            } else {
                // Extract time portion from ISO string and anchor to baseDateStr
                const tMatch = str.match(/T(\d{2}:\d{2}(?::\d{2})?)/);
                if (tMatch) {
                    const parsed = Date.parse(`${baseDateStr}T${tMatch[1]}`);
                    if (!Number.isNaN(parsed)) return parsed;
                }
                const parsed = Date.parse(str);
                if (!Number.isNaN(parsed)) return parsed;
            }
        }
        if (typeof timestamp === 'number' && !Number.isNaN(timestamp) && timestamp > 0) {
            const d = new Date(timestamp);
            const tDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (tDate === baseDateStr) return timestamp;
            // Timestamp on different day — extract time-of-day in local and anchor to baseDateStr
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            const s = String(d.getSeconds()).padStart(2, '0');
            const reanchored = Date.parse(`${baseDateStr}T${h}:${m}:${s}`);
            if (!Number.isNaN(reanchored)) return reanchored;
            return timestamp;
        }
        return fallbackMs + (index * 15000);
    }

    // Reference session bounds for sanity-checking unassigned/system events
    let maxHorizonBeforeMs = 30 * 60 * 1000; // 30 min before
    let maxHorizonAfterMs = 150 * 60 * 1000; // 2.5 hours after start
    let sessionRefStartMs = fallbackStartMs;
    let sessionRefEndMs = fallbackStartMs + (55 * 60 * 1000);

    if (slot && slot.time) {
        const sDt = _parseTimeToDate(slot.time, baseDate);
        if (sDt && !Number.isNaN(sDt.getTime())) sessionRefStartMs = sDt.getTime();
        if (slot.timeEnd) {
            const eDt = _parseTimeToDate(slot.timeEnd, baseDate);
            if (eDt && !Number.isNaN(eDt.getTime())) sessionRefEndMs = eDt.getTime();
        } else {
            sessionRefEndMs = sessionRefStartMs + (55 * 60 * 1000);
        }
        maxHorizonBeforeMs = 30 * 60 * 1000;
        maxHorizonAfterMs = (sessionRefEndMs - sessionRefStartMs) + 45 * 60 * 1000;
    }

    // 1. Gather filtered raw events
    const rawEvents = Array.isArray(rawHistory) ? rawHistory.slice() : [];
    const filteredHistory = rawEvents.filter((item, itemIdx) => {
        if (!item) return false;
        const type = String(item.type || '').toLowerCase();
        const isSessionWide = type.startsWith('timer-') || type.startsWith('mode-') || type === 'exam-toggle';

        // Check group ownership
        let groupMatches = false;
        if (item.group) {
            const grp = String(item.group).trim().toLowerCase();
            if (grp === activeGid.toLowerCase() || grp === activeTitle || grp.includes(activeTitle) || activeTitle.includes(grp)) {
                groupMatches = true;
            } else {
                // Belongs to another class explicitly -> exclude!
                return false;
            }
        }

        // Student ownership
        let studentMatches = false;
        if (item.studentName) {
            const sName = String(item.studentName).trim().toLowerCase();
            if (activeStudents.size > 0 && activeStudents.has(sName)) studentMatches = true;
            if (sName.startsWith('team ') || sName.startsWith('équipe ')) studentMatches = true;
        }
        if (item.meta?.studentId && studentById.has(item.meta.studentId)) studentMatches = true;
        if (item.meta?.targetId != null && teamMembersMap.has(item.meta.targetId)) studentMatches = true;
        if (item.meta?.teamId != null && teamMembersMap.has(item.meta.teamId)) studentMatches = true;

        // Time check for session-wide events or unassigned events
        const itemMs = parseIsoOrLocalTime(item.timestamp, item.time, baseDate, fallbackStartMs, itemIdx);
        const isOutOfSessionHorizon = (itemMs < sessionRefStartMs - maxHorizonBeforeMs) || (itemMs > sessionRefStartMs + maxHorizonAfterMs);

        if (isSessionWide) {
            // If session-wide event has no group or group matches, it MUST fall within reasonable session horizon
            // This prevents ghost timer/mode events (e.g. at 21:00 or 22:44) from leaking into a morning class!
            if (isOutOfSessionHorizon) return false;
            return groupMatches || !item.group;
        }

        if (studentMatches) {
            // Student belongs to this class
            return true;
        }

        if (groupMatches) return true;

        // Unassigned event without group: only keep if within session horizon
        if (!item.group && !isOutOfSessionHorizon) return true;

        return false;
    });

    // 2. Synthesize badges from student.badges if not already in filteredHistory
    groupStudents.forEach(student => {
        const sBadges = Array.isArray(student.badges) ? student.badges : [];
        sBadges.forEach(b => {
            const resolved = (typeof resolveBadgeData === 'function') ? resolveBadgeData(b) : {};
            const bIcon = resolved.icon || (typeof b === 'object' ? b.icon : '') || '';
            const bLabel = resolved.label || (typeof b === 'object' ? b.label : (typeof b === 'string' ? b : 'Badge')) || 'Badge';
            const bTone = resolved.tone || (typeof b === 'object' ? b.tone : 'positive');
            const bMeaning = resolved.meaning || (typeof b === 'object' ? b.meaning : '');
            const bTime = (typeof b === 'object' && b.time) ? b.time : '';
            const bTimestamp = (typeof b === 'object' && b.timestamp) ? b.timestamp : '';

            const exists = filteredHistory.some(existing => {
                if (!existing) return false;
                const exType = String(existing.type || '').toLowerCase();
                if (exType !== 'badge' && exType !== 'plus' && exType !== 'minus') return false;
                const exStudent = String(existing.studentName || '').trim().toLowerCase();
                const isDirectStudentMatch = exStudent === String(student.name).trim().toLowerCase();
                const isTeamBadgeMatch = exType === 'badge' && (
                    existing.meta?.targetType === 'team' ||
                    (existing.meta?.targetId != null && student.teamId != null && existing.meta.targetId === student.teamId)
                );
                if (!isDirectStudentMatch && !isTeamBadgeMatch) return false;
                const exIcon = existing.meta?.badgeIcon || (typeof existing.detail === 'string' ? existing.detail.split(/\s+/)[0] : '');
                const exLabel = existing.meta?.badgeLabel || existing.detail || '';
                if (bIcon && exIcon === bIcon) {
                    if (bTime && existing.time) return bTime === existing.time;
                    return true;
                }
                if (bLabel && exLabel && String(exLabel).toLowerCase().includes(String(bLabel).toLowerCase())) {
                    if (bTime && existing.time) return bTime === existing.time;
                    return true;
                }
                return false;
            });

            if (!exists) {
                filteredHistory.push({
                    type: (bIcon === '+' ? 'plus' : (bIcon === '-' || bIcon === '−' ? 'minus' : 'badge')),
                    studentName: student.name,
                    detail: (bIcon && !bLabel.includes(bIcon)) ? `${bIcon} ${bLabel}` : bLabel,
                    time: bTime,
                    timestamp: bTimestamp,
                    group: activeGid,
                    meta: {
                        badgeIcon: bIcon,
                        badgeLabel: bLabel,
                        tone: bTone,
                        meaning: bMeaning,
                        fromStudentData: true
                    }
                });
            }
        });
    });

    // 3. Reconcile per-student plus/minus totals with the logged events.
    // Legacy, imported or restored sessions may carry pluses/minuses counters
    // without (or with only partial) matching history events, so synthesize the missing ones.
    const hadNoHistory = filteredHistory.length === 0;
    if (groupStudents.length > 0) {
        const loggedNet = new Map(); // lowercase student name -> { p, m }
        filteredHistory.forEach(h => {
            if (!h || h.meta?.fromStudentData) return;
            const t = String(h.type || '').toLowerCase();
            const key = String(h.studentName || '').trim().toLowerCase();
            if (!key) return;
            const acc = loggedNet.get(key) || { p: 0, m: 0 };
            if (t === 'plus') acc.p += 1;
            else if (t === 'minus') acc.m += 1;
            else if (t === 'remove' && typeof h.detail === 'string') {
                if (/corrected\s*\+1/i.test(h.detail) && !/team/i.test(h.detail)) acc.p -= 1;
                else if (/corrected\s*-1/i.test(h.detail) && !/team/i.test(h.detail)) acc.m -= 1;
            }
            loggedNet.set(key, acc);
        });

        groupStudents.forEach((student, sIdx) => {
            const logged = loggedNet.get(String(student.name || '').trim().toLowerCase()) || { p: 0, m: 0 };
            const pCount = Math.max(0, (student.pluses || 0) - Math.max(0, logged.p));
            const mCount = Math.max(0, (student.minuses || 0) - Math.max(0, logged.m));
            const isP = hadNoHistory && !!student.isPicked;

            const pH = Array.isArray(student.plusHistory) ? student.plusHistory : [];
            for (let pi = 0; pi < pCount; pi++) {
                const hItem = pH[logged.p + pi] || pH[pi];
                const itemTime = hItem?.time || '';
                const itemTs = hItem?.timestamp || '';
                filteredHistory.push({
                    type: 'plus',
                    studentName: student.name,
                    detail: '+1 point',
                    time: itemTime,
                    timestamp: itemTs,
                    group: activeGid,
                    meta: { studentId: student.id, value: 1, synthesized: !itemTime && !itemTs }
                });
            }
            const mH = Array.isArray(student.minusHistory) ? student.minusHistory : [];
            for (let mi = 0; mi < mCount; mi++) {
                const hItem = mH[logged.m + mi] || mH[mi];
                const itemTime = hItem?.time || '';
                const itemTs = hItem?.timestamp || '';
                filteredHistory.push({
                    type: 'minus',
                    studentName: student.name,
                    detail: '-1 point',
                    time: itemTime,
                    timestamp: itemTs,
                    group: activeGid,
                    meta: { studentId: student.id, value: -1, synthesized: !itemTime && !itemTs }
                });
            }
            if (isP) {
                filteredHistory.push({
                    type: 'pick',
                    studentName: student.name,
                    detail: 'Picked in session',
                    time: '',
                    group: activeGid,
                    meta: { studentId: student.id, synthesized: true }
                });
            }
        });
    }

    // Synthesized events (no real time) are spread evenly across the real event span,
    // or a default 45-minute lesson window, so they never fall outside the lesson.
    const realTimes = filteredHistory.filter(h => !h.meta?.synthesized).map(h => parseIsoOrLocalTime(h.timestamp, h.time, baseDate, NaN, 0)).filter(Number.isFinite);
    let synthStart = fallbackStartMs;
    let synthSpan = 45 * 60000;
    if (realTimes.length > 0) {
        const rMin = Math.min(...realTimes);
        const rMax = Math.max(...realTimes);
        synthStart = rMin;
        if (rMax - rMin >= 2 * 60000) synthSpan = rMax - rMin;
    }
    const synthTotal = filteredHistory.filter(h => h.meta?.synthesized).length;
    let synthSeq = 0;

    return filteredHistory.map((item, idx) => {
        const ts = item.meta?.synthesized
            ? synthStart + ((++synthSeq) / (synthTotal + 1)) * synthSpan
            : parseIsoOrLocalTime(item.timestamp, item.time, baseDate, fallbackStartMs, idx);
        const type = String(item.type || '').toLowerCase();
        let category = 'points';
        let iconKey = 'plus';
        let badgeColor = '#6abf8e';
        let badgeIcon = '';
        let badgeLabel = '';
        let badgeTone = 'positive';

        // Team students resolution
        let teamStudentNames = [];
        const targetTeamId = item.meta?.targetId ?? item.meta?.teamId;
        if (targetTeamId != null && teamMembersMap.has(targetTeamId)) {
            teamStudentNames = teamMembersMap.get(targetTeamId);
        } else if (item.studentName) {
            const m = String(item.studentName).match(/(?:team|équipe)\s*(\d+)/i);
            if (m && teamMembersMap.has(parseInt(m[1], 10))) {
                teamStudentNames = teamMembersMap.get(parseInt(m[1], 10));
            }
        }

        if (type === 'plus') {
            category = 'points';
            iconKey = 'plus';
            badgeIcon = '+';
            badgeLabel = item.meta?.badgeLabel || 'Plus';
            badgeTone = 'positive';
            badgeColor = '#6abf8e';
        } else if (type === 'minus') {
            category = 'points';
            iconKey = 'minus';
            badgeIcon = '−';
            badgeLabel = item.meta?.badgeLabel || 'Minus';
            badgeTone = 'negative';
            badgeColor = '#c96b6b';
        } else if (type === 'team-plus') {
            category = 'points';
            iconKey = 'team';
            badgeIcon = '+';
            badgeLabel = item.meta?.badgeLabel || 'Team Plus';
            badgeTone = 'positive';
            badgeColor = '#5b8fcc';
        } else if (type === 'team-minus') {
            category = 'points';
            iconKey = 'minus';
            badgeIcon = '−';
            badgeLabel = item.meta?.badgeLabel || 'Team Minus';
            badgeTone = 'negative';
            badgeColor = '#c96b6b';
        } else if (type === 'pick') {
            category = 'picks';
            iconKey = 'pick';
            badgeIcon = '🎲';
            badgeLabel = 'Pick';
            badgeTone = 'neutral';
            badgeColor = '#8b7cc2';
        } else if (type === 'team-pick') {
            category = 'picks';
            iconKey = 'pick';
            badgeIcon = '🎲';
            badgeLabel = 'Team Pick';
            badgeTone = 'neutral';
            badgeColor = '#8b7cc2';
        } else if (type.startsWith('timer-')) {
            category = 'timers';
            iconKey = 'timer';
            badgeIcon = '⏱️';
            badgeColor = '#e2c96e';
        } else if (type.startsWith('mode-')) {
            category = 'timers';
            iconKey = 'timer';
            badgeIcon = '👥';
            badgeColor = '#b8a6e8';
        } else if (type === 'teams' || type === 'role' || type === 'rank' || type === 'role-change') {
            category = 'teams';
            iconKey = 'team';
            badgeIcon = '👥';
            badgeLabel = item.detail || 'Team Change';
            badgeColor = '#5b8fcc';
        } else if (type === 'badge') {
            category = 'badges';
            const rawIcon = item.meta?.badgeIcon || (typeof item.detail === 'string' ? item.detail.split(/\s+/)[0] : '') || '';
            const rawLabel = item.meta?.badgeLabel || (typeof item.detail === 'string' ? item.detail.split(/\s+/).slice(1).join(' ') : '') || item.detail || 'Badge';
            const res = (typeof resolveBadgeData === 'function') ? resolveBadgeData({ icon: rawIcon, label: rawLabel, tone: item.meta?.tone }) : {};

            badgeIcon = res.icon || rawIcon || '🏅';
            badgeLabel = res.label || rawLabel || 'Badge';
            badgeTone = res.tone || item.meta?.tone || (String(item.detail || '').includes('-') ? 'negative' : 'positive');

            if (badgeIcon === '+') {
                badgeColor = '#6abf8e';
                iconKey = 'plus';
            } else if (badgeIcon === '-' || badgeIcon === '−') {
                badgeColor = '#c96b6b';
                iconKey = 'minus';
            } else if (badgeTone === 'negative') {
                badgeColor = '#c96b6b';
                iconKey = 'badge';
            } else if (badgeTone === 'positive') {
                badgeColor = '#e2c96e';
                iconKey = 'badge';
            } else {
                badgeColor = '#5b8fcc';
                iconKey = 'badge';
            }
        } else if (type === 'comment' || type === 'note') {
            category = 'badges';
            iconKey = 'comment';
            badgeIcon = '💬';
            badgeLabel = 'Note';
            badgeTone = 'neutral';
            badgeColor = '#e59a5a';
        } else if (type === 'attendance') {
            category = 'attendance';
            iconKey = 'attendance';
            const isAbsent = item.meta?.isAbsent ?? String(item.detail || '').toLowerCase().includes('absent');
            badgeIcon = isAbsent ? '✗' : '✓';
            badgeLabel = isAbsent ? 'Absent' : 'Present';
            badgeTone = isAbsent ? 'negative' : 'positive';
            badgeColor = isAbsent ? '#c96b6b' : '#6abf8e';
        } else if (type === 'exam-toggle') {
            category = 'timers';
            iconKey = 'exam';
            badgeColor = '#475569';
        } else if (type === 'remove') {
            category = 'points';
            iconKey = 'minus';
            badgeIcon = '−';
            badgeLabel = item.detail || 'Correction';
            badgeTone = 'negative';
            badgeColor = '#c96b6b';
        } else {
            if (type.includes('minus') || type.includes('neg') || type.includes('penalty')) {
                category = 'points';
                iconKey = 'minus';
                badgeIcon = '−';
                badgeTone = 'negative';
                badgeColor = '#c96b6b';
            } else if (type.includes('pick')) {
                category = 'picks';
                iconKey = 'pick';
                badgeIcon = '🎲';
                badgeColor = '#8b7cc2';
            } else if (type.includes('team')) {
                category = 'teams';
                iconKey = 'team';
                badgeIcon = '👥';
                badgeColor = '#5b8fcc';
            } else {
                category = 'points';
                iconKey = 'plus';
                badgeIcon = '+';
                badgeTone = 'positive';
                badgeColor = '#6abf8e';
            }
        }

        return {
            type,
            studentName: item.studentName || 'Student',
            detail: item.detail || '',
            time: item.time || '',
            timestamp: item.timestamp || '',
            timestampMs: ts,
            group: item.group || '',
            meta: item.meta || {},
            category,
            iconKey,
            badgeColor,
            badgeIcon,
            badgeLabel,
            badgeTone,
            teamStudentNames,
            rawIndex: idx
        };
    }).sort((a, b) => a.timestampMs - b.timestampMs || a.rawIndex - b.rawIndex);
}

async function reloadPlannerConfig() {
    if (window.Desktop && typeof Desktop.readText === 'function') {
        try {
            const pr = await Desktop.readText('user', 'planner-config.js');
            if (pr?.ok && pr.content) {
                const fn = new Function('window', pr.content + '; return window.PLANNER_CONFIG || null;');
                const pcfg = fn({});
                if (pcfg) window.PLANNER_CONFIG = pcfg;
            }
        } catch (e) { /* ignore */ }
    }
    if (_timelineState.session) {
        renderSessionTimeline(_timelineState.session, { openModal: _timelineState.isModalOpen });
    }
    const dateRange = getDateRange();
    const sessions = filterSessionsByDateAndGroup(currentGroupId, dateRange.from, dateRange.to);
    updateHistoryTable(sessions);
}

function getPlannerClassSchedule(groupId) {
    const pcfg = (typeof PLANNER_CONFIG !== 'undefined' && PLANNER_CONFIG) ? PLANNER_CONFIG : {};
    const classes = pcfg.classes || {};
    if (!groupId) return [];
    if (classes[groupId] && Array.isArray(classes[groupId].schedule)) {
        return classes[groupId].schedule;
    }
    const dName = groupDisplayName(groupId);
    if (dName && classes[dName] && Array.isArray(classes[dName].schedule)) {
        return classes[dName].schedule;
    }
    const cleanGid = String(groupId).trim().toLowerCase();
    const cleanDname = dName ? String(dName).trim().toLowerCase() : '';
    for (const [k, v] of Object.entries(classes)) {
        const cleanK = String(k).trim().toLowerCase();
        if (cleanK === cleanGid || (cleanDname && cleanK === cleanDname)) {
            if (v && Array.isArray(v.schedule)) return v.schedule;
        }
    }
    return [];
}

function getPlannerEntriesForClassAndDate(groupId, dateStr) {
    if (!groupId || !dateStr) return [];
    const results = [];
    const dName = groupDisplayName(groupId);
    const cleanGid = String(groupId).trim().toLowerCase();
    const cleanDname = dName ? String(dName).trim().toLowerCase() : '';

    if (window.PLANNER_ENTRIES_BY_CLASS) {
        const list = window.PLANNER_ENTRIES_BY_CLASS[groupId] || (dName && window.PLANNER_ENTRIES_BY_CLASS[dName]) || [];
        list.forEach(e => {
            if (e && e.date === dateStr) results.push(e);
        });
    }

    if (typeof PLANNER_CONFIG !== 'undefined' && PLANNER_CONFIG && Array.isArray(PLANNER_CONFIG.entries)) {
        PLANNER_CONFIG.entries.forEach(e => {
            if (!e || e.date !== dateStr) return;
            const cIds = Array.isArray(e.classIds) ? e.classIds : (e.classId ? [e.classId] : []);
            const matched = cIds.some(cid => {
                const cleanC = String(cid).trim().toLowerCase();
                return cleanC === cleanGid || (cleanDname && cleanC === cleanDname);
            });
            if (matched && !results.some(r => r.id === e.id)) {
                results.push(e);
            }
        });
    }
    return results;
}

function _timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return NaN;
    const trimmed = timeStr.trim();
    if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        return (!Number.isNaN(h) && !Number.isNaN(m)) ? (h * 60 + m) : NaN;
    }
    const hMatch = trimmed.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
    if (hMatch) {
        const h = parseInt(hMatch[1], 10);
        const m = parseInt(hMatch[2] || '0', 10);
        return (!Number.isNaN(h) && !Number.isNaN(m)) ? (h * 60 + m) : NaN;
    }
    const num = parseInt(trimmed, 10);
    return !Number.isNaN(num) ? (num * 60) : NaN;
}

function _parseTimeToDate(timeStr, baseDate) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const trimmed = timeStr.trim();
    if (!trimmed) return null;
    if (trimmed.includes('T')) {
        const d = new Date(trimmed);
        if (!Number.isNaN(d.getTime())) return d;
    }
    if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
            const h = (parts[0] || '0').padStart(2, '0');
            const m = (parts[1] || '0').padStart(2, '0');
            const s = (parts[2] || '00').padStart(2, '0').slice(0, 2);
            const d = new Date(`${baseDate}T${h}:${m}:${s}`);
            if (!Number.isNaN(d.getTime())) return d;
        }
    }
    const hMatch = trimmed.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
    if (hMatch) {
        const h = hMatch[1].padStart(2, '0');
        const m = (hMatch[2] || '00').padStart(2, '0');
        const d = new Date(`${baseDate}T${h}:${m}:00`);
        if (!Number.isNaN(d.getTime())) return d;
    }
    if (/^\d{1,2}$/.test(trimmed)) {
        const h = trimmed.padStart(2, '0');
        const d = new Date(`${baseDate}T${h}:00:00`);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

function _calcTimeEnd(timeStr, durationMins = 55) {
    if (!timeStr) return '';
    const mins = _timeToMinutes(timeStr);
    if (Number.isNaN(mins)) return '';
    const total = (mins + durationMins) % (24 * 60);
    const eh = String(Math.floor(total / 60)).padStart(2, '0');
    const em = String(total % 60).padStart(2, '0');
    return `${eh}:${em}`;
}

function _findClosestTimeItem(items, targetTimeStr) {
    if (!items || !items.length || !targetTimeStr) return (items && items[0]) || null;
    const targetMins = _timeToMinutes(targetTimeStr);
    if (Number.isNaN(targetMins)) return (items && items[0]) || null;
    let closest = null;
    let minDiff = Infinity;
    items.forEach(item => {
        if (!item || !item.time) return;
        const itemMins = _timeToMinutes(item.time);
        if (Number.isNaN(itemMins)) return;
        const diff = Math.abs(targetMins - itemMins);
        if (diff < minDiff) {
            minDiff = diff;
            closest = item;
        }
    });
    return closest || (items && items[0]) || null;
}

function resolveSessionPlannerSlot(session, groupId) {
    if (!session) return null;
    if (session.plannerSlotUnlinked) return null;
    const targetGroupId = groupId || currentGroupId || (session.groups && Object.keys(session.groups)[0]) || session.activeGroup || '';

    // 1. Explicit plannerSlot on session
    if (session.plannerSlot && session.plannerSlot.time) {
        const ps = session.plannerSlot;
        let time = String(ps.time || '').trim();
        let timeEnd = String(ps.timeEnd || '').trim();
        let halfGroup = String(ps.halfGroup || '').trim();

        // Auto-repair corrupted plannerSlot from legacy colon-splitting bug
        if (/^\d{1,2}$/.test(time) && /^\d{1,2}$/.test(timeEnd)) {
            time = `${time.padStart(2, '0')}:${timeEnd.padStart(2, '0')}`;
            timeEnd = '';
        } else if (/^\d{1,2}$/.test(time)) {
            time = `${time.padStart(2, '0')}:00`;
        }
        if (/^\d{1,2}$/.test(halfGroup)) {
            halfGroup = '';
        }

        // Check against class schedule to get the authoritative slot (with true timeEnd & halfGroup)
        const schedule = getPlannerClassSchedule(targetGroupId);
        const sessionDate = getSessionLocalDateStr(session);
        let dow = null;
        if (sessionDate) {
            const dt = new Date(sessionDate + 'T12:00:00');
            if (!Number.isNaN(dt.getTime())) dow = dt.getDay();
        }
        const targetDay = (ps.day != null) ? parseInt(ps.day, 10) : dow;

        const tt = time.slice(0, 5);
        const matchedSlot = schedule.find(s => {
            if (targetDay != null && parseInt(s.day, 10) !== targetDay) return false;
            if (halfGroup && s.halfGroup && String(s.halfGroup) !== halfGroup) return false;
            const st = String(s.time || '').trim().slice(0, 5);
            if (st === tt) return true;
            if (!timeEnd && st.slice(0, 2) === tt.slice(0, 2)) return true;
            return false;
        });

        if (matchedSlot) {
            time = String(matchedSlot.time || '').trim().slice(0, 5);
            timeEnd = String(matchedSlot.timeEnd || '').trim().slice(0, 5) || _calcTimeEnd(time, 55);
            if (!halfGroup && matchedSlot.halfGroup) halfGroup = matchedSlot.halfGroup;
        } else if (!timeEnd || timeEnd === time) {
            timeEnd = _calcTimeEnd(time, 55);
        }

        const label = `${time} – ${timeEnd}${halfGroup ? ' ½' + halfGroup : ''}`;
        ps.day = (targetDay != null) ? targetDay : ps.day;
        ps.time = time;
        ps.timeEnd = timeEnd;
        ps.halfGroup = halfGroup;
        ps.label = label;

        return {
            day: ps.day,
            time,
            timeEnd,
            halfGroup,
            label,
            isExplicit: true,
            entryId: session.plannerEntryId || ps.entryId || ''
        };
    }

    // 2. Linked plannerEntryId
    if (session.plannerEntryId) {
        const sessionDate = getSessionLocalDateStr(session);
        const entries = getPlannerEntriesForClassAndDate(targetGroupId, sessionDate);
        const matchedEntry = entries.find(e => e.id === session.plannerEntryId) ||
            (typeof PLANNER_CONFIG !== 'undefined' && Array.isArray(PLANNER_CONFIG.entries) && PLANNER_CONFIG.entries.find(e => e.id === session.plannerEntryId));
        if (matchedEntry && matchedEntry.time) {
            const timeEnd = matchedEntry.timeEnd || _calcTimeEnd(matchedEntry.time, 55);
            return {
                time: matchedEntry.time.slice(0, 5),
                timeEnd: timeEnd.slice(0, 5),
                label: `${matchedEntry.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${matchedEntry.topic ? ' (' + matchedEntry.topic + ')' : ''}`,
                entryId: matchedEntry.id,
                topic: matchedEntry.topic || '',
                isEntry: true,
                isExplicit: true
            };
        }
    }

    // 3. Auto-detection from class weekly schedule & planner entries on that day
    const sessionDate = getSessionLocalDateStr(session);
    if (!sessionDate) return null;
    const dt = new Date(sessionDate + 'T12:00:00');
    if (Number.isNaN(dt.getTime())) return null;
    const dow = dt.getDay(); // 0 = Sun, 1 = Mon ...

    const schedule = getPlannerClassSchedule(targetGroupId);
    const daySlots = schedule.filter(s => s && parseInt(s.day, 10) === dow);
    const entries = getPlannerEntriesForClassAndDate(targetGroupId, sessionDate);

    // Extract session's approximate start time from events or session.time
    let sessionTimeStr = '';
    if (Array.isArray(session.sessionHistory) && session.sessionHistory.length > 0) {
        const firstTs = session.sessionHistory[0].timestamp || session.sessionHistory[0].time;
        if (firstTs && firstTs.includes('T')) {
            const d = new Date(firstTs);
            if (!Number.isNaN(d.getTime())) sessionTimeStr = d.toTimeString().slice(0, 5);
        } else if (firstTs && firstTs.includes(':')) {
            sessionTimeStr = firstTs.slice(0, 5);
        }
    }
    if (!sessionTimeStr && session.time && session.time.includes(':')) {
        sessionTimeStr = session.time.slice(0, 5);
    }

    // A. If entries exist for this date and time matches, or 1 entry exists
    if (entries.length > 0) {
        let bestEntry = null;
        if (entries.length === 1 && entries[0].time) {
            bestEntry = entries[0];
        } else if (sessionTimeStr) {
            bestEntry = _findClosestTimeItem(entries, sessionTimeStr);
        }
        if (bestEntry && bestEntry.time) {
            const timeEnd = bestEntry.timeEnd || _calcTimeEnd(bestEntry.time, 55);
            return {
                time: bestEntry.time.slice(0, 5),
                timeEnd: timeEnd.slice(0, 5),
                label: `${bestEntry.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${bestEntry.topic ? ' (' + bestEntry.topic + ')' : ''}`,
                entryId: bestEntry.id,
                topic: bestEntry.topic || '',
                isEntry: true,
                isAutoMatched: true
            };
        }
    }

    // B. Match from daySlots
    if (daySlots.length === 1 && daySlots[0].time) {
        const s = daySlots[0];
        const timeEnd = s.timeEnd || _calcTimeEnd(s.time, 55);
        return {
            day: s.day,
            time: s.time.slice(0, 5),
            timeEnd: timeEnd.slice(0, 5),
            halfGroup: s.halfGroup || '',
            label: `${s.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${s.halfGroup ? ' ½' + s.halfGroup : ''}`,
            isAutoMatched: true
        };
    }

    if (daySlots.length > 1 && sessionTimeStr) {
        const closestSlot = _findClosestTimeItem(daySlots, sessionTimeStr);
        if (closestSlot && closestSlot.time) {
            const timeEnd = closestSlot.timeEnd || _calcTimeEnd(closestSlot.time, 55);
            return {
                day: closestSlot.day,
                time: closestSlot.time.slice(0, 5),
                timeEnd: timeEnd.slice(0, 5),
                halfGroup: closestSlot.halfGroup || '',
                label: `${closestSlot.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${closestSlot.halfGroup ? ' ½' + closestSlot.halfGroup : ''}`,
                isAutoMatched: true
            };
        }
    } else if (daySlots.length > 1) {
        const s = daySlots[0];
        const timeEnd = s.timeEnd || _calcTimeEnd(s.time, 55);
        return {
            day: s.day,
            time: s.time.slice(0, 5),
            timeEnd: timeEnd.slice(0, 5),
            halfGroup: s.halfGroup || '',
            label: `${s.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${s.halfGroup ? ' ½' + s.halfGroup : ''}`,
            isAutoMatched: true
        };
    }

    return null;
}

function getSessionTimeBounds(session, slotDuration, events) {
    const defaultDurationMinutes = 55;
    const targetGroupId = currentGroupId || (session && session.activeGroup) || '';
    const slot = _timelineState.connectedSlot || resolveSessionPlannerSlot(session, targetGroupId);

    const baseDate = getSessionLocalDateStr(session);

    // If slotDuration is 'slot' (the default when a planner slot is connected), limit x-axis strictly by planner slot
    const useSlot = (slotDuration === 'slot' || (!slotDuration && slot)) && slot && slot.time;
    if (useSlot) {
        const startDt = _parseTimeToDate(slot.time, baseDate);
        if (startDt && !Number.isNaN(startDt.getTime())) {
            let startMs = startDt.getTime();
            let endMs = NaN;
            if (slot.timeEnd) {
                const endDt = _parseTimeToDate(slot.timeEnd, baseDate);
                if (endDt && !Number.isNaN(endDt.getTime())) {
                    endMs = endDt.getTime();
                }
            }
            if (Number.isNaN(endMs) || endMs <= startMs) {
                endMs = startMs + (defaultDurationMinutes * 60 * 1000);
            }
            const durationMs = endMs - startMs;
            return { startMs, endMs, durationMs, isPlannerSlot: true, slot };
        }
    }

    // Fallback / Auto / Numeric durations
    let startMs = NaN;
    if (slot && slot.time) {
        const startDt = _parseTimeToDate(slot.time, baseDate);
        if (startDt && !Number.isNaN(startDt.getTime())) startMs = startDt.getTime();
    }

    if (Number.isNaN(startMs) && session) {
        if (session.time) {
            const dt = _parseTimeToDate(String(session.time), baseDate);
            if (dt && !Number.isNaN(dt.getTime())) startMs = dt.getTime();
        }
        if (Number.isNaN(startMs) && session.id) {
            const dt = new Date(session.id);
            if (!Number.isNaN(dt.getTime())) startMs = dt.getTime();
        }
    }

    if (events && events.length > 0) {
        const firstEventMs = events[0].timestampMs;
        const lastEventMs = events[events.length - 1].timestampMs;

        if (Number.isNaN(startMs) || Math.abs(startMs - firstEventMs) > 12 * 3600 * 1000) {
            startMs = firstEventMs - 60000;
        } else if (firstEventMs < startMs) {
            startMs = firstEventMs - 60000;
        } else if (firstEventMs - startMs < 60000 && !slot) {
            startMs = firstEventMs - 60000;
        }

        if (slotDuration && slotDuration !== 'auto' && slotDuration !== 'slot') {
            const mins = Math.max(5, parseInt(slotDuration, 10) || defaultDurationMinutes);
            const requestedDurationMs = mins * 60 * 1000;
            return { startMs, endMs: startMs + requestedDurationMs, durationMs: requestedDurationMs, slot };
        }

        // Auto fit: span of events + 3 min padding, strictly capped at a maximum 180 minutes (3 hours)
        const inSessionEvents = events.filter(e => e.timestampMs >= startMs - 60000 && e.timestampMs <= startMs + (180 * 60 * 1000));
        const effectiveLastMs = (inSessionEvents.length > 0)
            ? inSessionEvents[inSessionEvents.length - 1].timestampMs
            : Math.min(lastEventMs, startMs + (defaultDurationMinutes * 60 * 1000));
        const rawSpan = Math.max(10 * 60 * 1000, (effectiveLastMs - startMs) + 3 * 60 * 1000);
        const span = Math.min(180 * 60 * 1000, rawSpan);
        return { startMs, endMs: startMs + span, durationMs: span, slot };
    }

    if (Number.isNaN(startMs)) {
        startMs = Date.now();
    }

    const durationMs = defaultDurationMinutes * 60 * 1000;
    return { startMs, endMs: startMs + durationMs, durationMs, slot };
}

function computeTimelineIntervals(events, bounds) {
    const timerIntervals = [];
    const modeIntervals = [];
    const teamIntervals = [];

    let activeTimer = null;
    let activeMode = null;
    let activeTeam = null;

    events.forEach(ev => {
        if (ev.type === 'timer-start') {
            if (activeTimer) {
                timerIntervals.push({ ...activeTimer, endMs: Math.max(activeTimer.startMs + 5000, ev.timestampMs) });
            }
            const explicitSec = ev.meta?.durationSec ? ev.meta.durationSec * 1000 : null;
            activeTimer = {
                startMs: ev.timestampMs,
                title: ev.studentName || 'Timer',
                detail: ev.detail || 'Timer running',
                explicitEndMs: explicitSec ? ev.timestampMs + explicitSec : null
            };
        } else if (ev.type === 'timer-stop' || ev.type === 'timer-end') {
            if (activeTimer) {
                timerIntervals.push({ ...activeTimer, endMs: Math.max(activeTimer.startMs + 5000, ev.timestampMs) });
                activeTimer = null;
            }
        } else if (ev.type === 'mode-start') {
            if (activeMode) {
                modeIntervals.push({ ...activeMode, endMs: Math.max(activeMode.startMs + 5000, ev.timestampMs) });
            }
            activeMode = {
                startMs: ev.timestampMs,
                title: ev.studentName || 'Working Mode',
                detail: ev.detail || 'Working Mode'
            };
        } else if (ev.type === 'mode-end') {
            if (activeMode) {
                modeIntervals.push({ ...activeMode, endMs: Math.max(activeMode.startMs + 5000, ev.timestampMs) });
                activeMode = null;
            }
        } else if (ev.type === 'teams' && ((ev.detail || '').toLowerCase().includes('created') || (ev.detail || '').toLowerCase().includes('loaded') || (ev.detail || '').toLowerCase().includes('assigned'))) {
            if (!activeTeam) {
                activeTeam = {
                    startMs: ev.timestampMs,
                    title: 'Teams Active',
                    detail: ev.detail
                };
            }
        } else if (ev.type === 'teams' && (ev.detail || '').toLowerCase().includes('cleared')) {
            if (activeTeam) {
                teamIntervals.push({ ...activeTeam, endMs: Math.max(activeTeam.startMs + 5000, ev.timestampMs) });
                activeTeam = null;
            }
        }
    });

    if (activeTimer) {
        const endMs = activeTimer.explicitEndMs && activeTimer.explicitEndMs <= bounds.endMs
            ? activeTimer.explicitEndMs
            : bounds.endMs;
        timerIntervals.push({ ...activeTimer, endMs: Math.max(activeTimer.startMs + 5000, endMs) });
    }
    if (activeMode) {
        modeIntervals.push({ ...activeMode, endMs: bounds.endMs });
    }
    if (activeTeam) {
        teamIntervals.push({ ...activeTeam, endMs: bounds.endMs });
    }

    return { timerIntervals, modeIntervals, teamIntervals };
}

function formatTimelineTimeLabel(ms, startMs, mode) {
    if (mode === 'clock') {
        const d = new Date(ms);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    const diffMs = ms - startMs;
    const isNegative = diffMs < 0;
    const elapsedSec = Math.floor(Math.abs(diffMs) / 1000);
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const prefix = isNegative ? '-' : '+';
    return `${prefix}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTimelineDuration(ms) {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
}

function updateTimelineKpiBar(prefix, events, bounds, intervals, session) {
    const totalEvents = events.length;
    const durationMinutes = Math.max(1, bounds.durationMs / 60000);
    const pace = (totalEvents / durationMinutes).toFixed(2);

    let timerTotalMs = 0;
    intervals.timerIntervals.forEach(ti => {
        timerTotalMs += Math.max(0, ti.endMs - ti.startMs);
    });
    const timerPct = Math.min(100, Math.round((timerTotalMs / bounds.durationMs) * 100));

    let groupWorkMs = 0;
    intervals.modeIntervals.forEach(mi => {
        groupWorkMs += Math.max(0, mi.endMs - mi.startMs);
    });
    intervals.teamIntervals.forEach(ti => {
        groupWorkMs = Math.max(groupWorkMs, ti.endMs - ti.startMs);
    });

    // Calculate uncalled students in active group
    let uncalledCount = 0;
    const activeGid = (currentGroupId && session?.groups && session.groups[currentGroupId])
        ? currentGroupId
        : (session?.activeGroup || (session?.groups && Object.keys(session.groups)[0]) || '');
    if (session && session.groups && activeGid && Array.isArray(session.groups[activeGid])) {
        const groupStudents = session.groups[activeGid];
        const activeNames = new Set();
        events.forEach(e => {
            if (e.studentName) activeNames.add(String(e.studentName).trim().toLowerCase());
            if (Array.isArray(e.teamStudentNames)) {
                e.teamStudentNames.forEach(tn => {
                    if (tn) activeNames.add(String(tn).trim().toLowerCase());
                });
            }
        });
        const uncalled = groupStudents.filter(s => {
            const name = String(s.name || '').trim().toLowerCase();
            const hasPoints = (s.pluses || 0) + (s.minuses || 0) + (s.teamPluses || 0) + (s.teamMinuses || 0) + (s.picks || 0) + ((s.badges && s.badges.length) || 0) > 0;
            return !activeNames.has(name) && !hasPoints && !s.isAbsent;
        });
        uncalledCount = uncalled.length;
    }

    const totalEl = document.getElementById(prefix + 'TotalEvents');
    const paceEl = document.getElementById(prefix + 'Pace');
    const timersEl = document.getElementById(prefix + 'ActiveTimers');
    const groupEl = document.getElementById(prefix + 'GroupWork');
    const uncalledEl = document.getElementById(prefix + 'Uncalled');

    if (totalEl) totalEl.textContent = totalEvents;
    if (paceEl) paceEl.textContent = `${pace}/min`;
    if (timersEl) timersEl.textContent = `${formatTimelineDuration(timerTotalMs)} (${timerPct}%)`;
    if (groupEl) groupEl.textContent = formatTimelineDuration(groupWorkMs);
    if (uncalledEl) uncalledEl.textContent = uncalledCount;
}

function drawSessionTimeline(canvas, isModal) {
    if (!canvas) return;
    preloadTimelineIcons();

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || canvas.offsetWidth || 900;
    const height = rect.height || canvas.offsetHeight || 420;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Clear canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const session = _timelineState.session;
    const bounds = _timelineState.timeBounds;
    const emptyStateEl = document.getElementById(isModal ? 'modalTimelineEmptyState' : 'ptTimelineEmptyState');

    if (!session || !_timelineState.events || _timelineState.events.length === 0) {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        return;
    }
    if (emptyStateEl) emptyStateEl.classList.add('hidden');

    const filteredEvents = _timelineState.events.filter(e => isTimelineEventActive(e, _timelineState.activeFilters));

    // Layout dimensions
    const padLeft = 60;
    const padRight = 30;
    const padTop = 22;
    const padBottom = 34;
    const plotW = Math.max(100, width - padLeft - padRight);

    // Track vertical splits
    const track1Top = padTop;
    const track1Height = 85;
    const track2Top = track1Top + track1Height + 10;
    const track2Height = 110;
    const track3Top = track2Top + track2Height + 10;
    const track3Bottom = height - padBottom;
    const stemBaselineY = track3Bottom - 26;

    function getX(timeMs) {
        if (bounds.durationMs <= 0) return padLeft;
        const ratio = Math.max(0, Math.min(1, (timeMs - bounds.startMs) / bounds.durationMs));
        return padLeft + ratio * plotW;
    }

    // ── Background track bands ──
    ctx.fillStyle = '#fafaf7';
    ctx.fillRect(padLeft, track1Top, plotW, track1Height);
    ctx.strokeStyle = '#e8e8e2';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, track1Top, plotW, track1Height);

    // Track 1 label
    ctx.fillStyle = '#888888';
    ctx.font = '700 9px Lexend, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('INTERVALS & MODES', padLeft + 6, track1Top + 13);

    // Track 2 label
    ctx.fillStyle = '#888888';
    ctx.font = '700 9px Lexend, sans-serif';
    ctx.fillText('INTERACTIVE PACING (CUMULATIVE)', padLeft + 6, track2Top + 13);

    // ── TRACK 1: Duration & State Bands ──
    const { timerIntervals, modeIntervals, teamIntervals } = _timelineState;

    function drawNeoBand(x1, x2, y, h, fill, border, label, iconKey) {
        const bandW = Math.max(18, x2 - x1);
        const r = 5;
        ctx.save();
        ctx.fillStyle = '#555555';
        ctx.fillRect(x1 + 2, y + 2, bandW, h); // shadow
        ctx.fillStyle = fill;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x1, y, bandW, h, r) : ctx.rect(x1, y, bandW, h);
        ctx.fill();
        ctx.stroke();

        // Icon & Label
        const icon = _timelineIcons[iconKey];
        let textStartX = x1 + 6;
        if (icon && icon.complete && icon.naturalWidth > 0 && bandW > 28) {
            ctx.drawImage(icon, x1 + 4, y + Math.floor((h - 12) / 2), 12, 12);
            textStartX = x1 + 19;
        }
        if (bandW > 35) {
            ctx.fillStyle = '#222222';
            ctx.font = '700 10px Lexend, sans-serif';
            ctx.textAlign = 'left';
            const maxTextW = bandW - (textStartX - x1) - 4;
            let displayTxt = label;
            if (ctx.measureText(displayTxt).width > maxTextW) {
                while (displayTxt.length > 3 && ctx.measureText(displayTxt + '…').width > maxTextW) {
                    displayTxt = displayTxt.slice(0, -1);
                }
                displayTxt += '…';
            }
            ctx.fillText(displayTxt, textStartX, y + Math.floor(h / 2) + 3.5);
        }
        ctx.restore();
    }

    // Timers & Modes (respects 'timers' filter chip)
    if (_timelineState.activeFilters.has('timers')) {
        timerIntervals.forEach(ti => {
            if (ti.endMs < bounds.startMs || ti.startMs > bounds.endMs) return;
            const x1 = getX(ti.startMs);
            const x2 = getX(ti.endMs);
            drawNeoBand(x1, x2, track1Top + 20, 18, '#fef3c7', '#333333', `${ti.title} (${formatTimelineDuration(ti.endMs - ti.startMs)})`, 'timer');
        });

        modeIntervals.forEach(mi => {
            if (mi.endMs < bounds.startMs || mi.startMs > bounds.endMs) return;
            const x1 = getX(mi.startMs);
            const x2 = getX(mi.endMs);
            drawNeoBand(x1, x2, track1Top + 42, 18, '#ede9fe', '#333333', `${mi.title} (${formatTimelineDuration(mi.endMs - mi.startMs)})`, 'team');
        });
    }

    // Teams (respects 'teams' filter chip)
    if (_timelineState.activeFilters.has('teams')) {
        teamIntervals.forEach(ti => {
            if (ti.endMs < bounds.startMs || ti.startMs > bounds.endMs) return;
            const x1 = getX(ti.startMs);
            const x2 = getX(ti.endMs);
            drawNeoBand(x1, x2, track1Top + 64, 16, '#dbeafe', '#333333', `${ti.title}`, 'team');
        });
    }

    // ── TRACK 2: Cumulative Engagement Area & Stepped Curve ──
    const targetStudentClean = (_timelineState.selectedStudentName || '').trim().toLowerCase();
    const curveEvents = filteredEvents.filter(e => {
        const type = e.type || '';
        // Exclude system intervals from cumulative student interactions curve
        if (type.startsWith('timer-') || type.startsWith('mode-') || type === 'exam-toggle') return false;
        if (!targetStudentClean) return true;
        return eventMatchesTimelineStudent(e, targetStudentClean);
    });

    // Grid lines for Track 2
    ctx.save();
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
        const gy = track2Top + (track2Height / 3) * g;
        ctx.beginPath();
        ctx.moveTo(padLeft, gy);
        ctx.lineTo(padLeft + plotW, gy);
        ctx.stroke();
    }

    let cumulative = 0;
    const points = [{ x: padLeft, y: track2Top + track2Height, count: 0 }];
    curveEvents.forEach(e => {
        cumulative += 1;
        const ex = getX(e.timestampMs);
        points.push({ x: ex, count: cumulative });
    });
    points.push({ x: padLeft + plotW, count: cumulative });

    const maxCount = Math.max(1, cumulative);
    points.forEach(p => {
        p.y = (track2Top + track2Height) - ((p.count / maxCount) * (track2Height - 16));
    });

    // Draw clean stepped area & line
    if (points.length > 1) {
        // Stepped filled area
        ctx.beginPath();
        ctx.moveTo(points[0].x, track2Top + track2Height);
        ctx.lineTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) {
            ctx.lineTo(points[p].x, points[p - 1].y);
            ctx.lineTo(points[p].x, points[p].y);
        }
        ctx.lineTo(padLeft + plotW, track2Top + track2Height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(106, 191, 142, 0.22)';
        ctx.fill();

        // Stepped curve line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) {
            ctx.lineTo(points[p].x, points[p - 1].y);
            ctx.lineTo(points[p].x, points[p].y);
        }
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Y-axis ticks for Track 2
    ctx.fillStyle = '#666666';
    ctx.font = '600 9px Lexend, sans-serif';
    ctx.textAlign = 'right';
    if (cumulative > 0) {
        ctx.fillText(String(maxCount), padLeft - 6, track2Top + 14);
        ctx.fillText(String(Math.round(maxCount / 2)), padLeft - 6, track2Top + (track2Height / 2) + 3);
    } else {
        ctx.fillText('0', padLeft - 6, track2Top + 14);
    }
    ctx.fillText('0', padLeft - 6, track2Top + track2Height + 2);
    ctx.restore();

    // ── TRACK 3: Event Stems & Node Scatter ──
    ctx.save();
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, stemBaselineY);
    ctx.lineTo(padLeft + plotW, stemBaselineY);
    ctx.stroke();

    const nodeRadius = 11;
    const hitTargets = [];

    // Multi-tier vertical staggering algorithm
    const assignedTiers = [];
    filteredEvents.forEach((ev, idx) => {
        const ex = getX(ev.timestampMs);
        const usedTiers = new Set();
        let clusterCount = 0;

        for (let j = Math.max(0, idx - 12); j < idx; j++) {
            const prevX = getX(filteredEvents[j].timestampMs);
            if (Math.abs(ex - prevX) < 22) {
                usedTiers.add(assignedTiers[j]);
                clusterCount++;
            }
        }

        let tier = 0;
        while (usedTiers.has(tier) && tier < 6) {
            tier++;
        }
        assignedTiers[idx] = tier;

        // Micro jitter if more than 6 events share this cluster
        const jitterX = clusterCount >= 6 ? ((idx % 3) - 1) * 3 : 0;
        const nodeCenterX = ex + jitterX;
        const nodeCenterY = stemBaselineY - 16 - (tier * 20);

        const isTargetStudent = eventMatchesTimelineStudent(ev, targetStudentClean);
        const nodeAlpha = isTargetStudent ? 1.0 : 0.18;

        ctx.save();
        ctx.globalAlpha = nodeAlpha;

        // Vertical stem line from baseline to node
        ctx.strokeStyle = isTargetStudent && targetStudentClean ? '#111111' : '#666666';
        ctx.lineWidth = isTargetStudent && targetStudentClean ? 1.8 : 1.0;
        ctx.beginPath();
        ctx.moveTo(nodeCenterX, stemBaselineY);
        ctx.lineTo(nodeCenterX, nodeCenterY + nodeRadius);
        ctx.stroke();

        // Drop shadow
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(nodeCenterX + 1.5, nodeCenterY + 1.5, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Circle node
        ctx.fillStyle = ev.badgeColor || '#6abf8e';
        ctx.beginPath();
        ctx.arc(nodeCenterX, nodeCenterY, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isTargetStudent && targetStudentClean ? '#111111' : '#333333';
        ctx.lineWidth = isTargetStudent && targetStudentClean ? 2.5 : 1.5;
        ctx.stroke();

        // Centered icon / badge symbol
        const bIcon = ev.badgeIcon;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (bIcon === '+' || ev.type === 'plus' || ev.type === 'team-plus') {
            ctx.fillStyle = '#111111';
            ctx.font = '800 13px Lexend, sans-serif';
            ctx.fillText('+', nodeCenterX, nodeCenterY + 0.5);
        } else if (bIcon === '−' || bIcon === '-' || ev.type === 'minus' || ev.type === 'team-minus') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 14px Lexend, sans-serif';
            ctx.fillText('−', nodeCenterX, nodeCenterY);
        } else if (bIcon && /\p{Extended_Pictographic}/u.test(bIcon)) {
            // Emoji badge: 💎, 👍, 👏, ⭐, 1️⃣, etc.
            ctx.font = '11px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
            ctx.fillText(bIcon, nodeCenterX, nodeCenterY + 1);
        } else if (bIcon && !/\p{Extended_Pictographic}/u.test(bIcon)) {
            // Single- or multi-character text/symbol badge (e.g. RV, DNF, OM, AT, ✓, ✗, A, ★)
            ctx.fillStyle = (ev.badgeTone === 'negative' || ev.badgeColor === '#c96b6b' || ev.badgeColor === '#5b8fcc' || ev.badgeColor === '#475569') ? '#ffffff' : '#111111';
            ctx.font = bIcon.length > 2 ? '800 7.5px Lexend, sans-serif' : (bIcon.length > 1 ? '800 8.5px Lexend, sans-serif' : '800 11px Lexend, sans-serif');
            ctx.fillText(bIcon, nodeCenterX, nodeCenterY + 0.5);
        } else if (ev.iconKey && _timelineIcons[ev.iconKey] && _timelineIcons[ev.iconKey].complete && _timelineIcons[ev.iconKey].naturalWidth > 0) {
            ctx.drawImage(_timelineIcons[ev.iconKey], nodeCenterX - 6, nodeCenterY - 6, 12, 12);
        } else {
            ctx.fillStyle = '#111111';
            ctx.font = '700 9px Lexend, sans-serif';
            const sym = ev.type === 'pick' ? '🎲' : (ev.type === 'comment' ? '💬' : '★');
            ctx.fillText(sym, nodeCenterX, nodeCenterY);
        }
        ctx.restore();

        ctx.restore();

        hitTargets.push({
            event: ev,
            x: nodeCenterX,
            y: nodeCenterY,
            radius: nodeRadius + 3
        });
    });

    // Student labels below baseline without overlapping collisions
    let lastLabelX = -999;
    filteredEvents.forEach((ev, idx) => {
        const ex = getX(ev.timestampMs);
        const isTargetStudent = eventMatchesTimelineStudent(ev, targetStudentClean);

        const shouldDraw = isTargetStudent && (targetStudentClean || Math.abs(ex - lastLabelX) >= 42);
        if (shouldDraw) {
            lastLabelX = ex;
            ctx.save();
            ctx.fillStyle = isTargetStudent && targetStudentClean ? '#111111' : '#444444';
            ctx.font = isTargetStudent && targetStudentClean ? '700 9px Lexend, sans-serif' : '600 8.5px Lexend, sans-serif';
            ctx.textAlign = 'center';
            let shortName = ev.studentName || '';
            if (shortName.length > 11) shortName = shortName.slice(0, 10) + '…';
            ctx.fillText(shortName, ex, stemBaselineY + 12);
            ctx.restore();
        }
    });
    ctx.restore();

    // ── X-AXIS: Bottom Time Scale ──
    ctx.save();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, stemBaselineY + 18);
    ctx.lineTo(padLeft + plotW, stemBaselineY + 18);
    ctx.stroke();

    const durationMins = bounds.durationMs / 60000;
    const tickMins = durationMins > 65 ? 10 : (durationMins > 30 ? 5 : 2);
    const totalTicks = Math.floor(durationMins / tickMins);

    ctx.fillStyle = '#444444';
    ctx.font = '700 9.5px Lexend, sans-serif';
    ctx.textAlign = 'center';

    let lastDrawnTickMs = bounds.startMs;
    for (let ti = 0; ti <= totalTicks; ti++) {
        const tickMs = bounds.startMs + (ti * tickMins * 60 * 1000);
        if (tickMs > bounds.endMs) break;
        lastDrawnTickMs = tickMs;
        const tx = getX(tickMs);

        // Tick mark
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, stemBaselineY + 18);
        ctx.lineTo(tx, stemBaselineY + 23);
        ctx.stroke();

        // Vertical grid guideline
        ctx.strokeStyle = '#eaeae4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, track1Top);
        ctx.lineTo(tx, stemBaselineY + 18);
        ctx.stroke();

        // Time label
        const label = formatTimelineTimeLabel(tickMs, bounds.startMs, _timelineState.timeDisplay);
        ctx.fillText(label, tx, stemBaselineY + 33);
    }

    // Always render final boundary tick if gap is significant
    if (bounds.endMs - lastDrawnTickMs >= 2 * 60 * 1000) {
        const endTx = getX(bounds.endMs);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(endTx, stemBaselineY + 18);
        ctx.lineTo(endTx, stemBaselineY + 23);
        ctx.stroke();

        ctx.strokeStyle = '#eaeae4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(endTx, track1Top);
        ctx.lineTo(endTx, stemBaselineY + 18);
        ctx.stroke();

        const label = formatTimelineTimeLabel(bounds.endMs, bounds.startMs, _timelineState.timeDisplay);
        ctx.fillText(label, endTx, stemBaselineY + 33);
    }
    ctx.restore();

    // ── Hover Guide & Active Hit Inspection ──
    if (_timelineState.hoverX !== null && _timelineState.hoverX >= padLeft && _timelineState.hoverX <= padLeft + plotW) {
        const hx = _timelineState.hoverX;

        ctx.save();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hx, track1Top);
        ctx.lineTo(hx, stemBaselineY + 18);
        ctx.stroke();
        ctx.restore();

        const hoverMs = bounds.startMs + ((hx - padLeft) / plotW) * bounds.durationMs;
        const hoverLabel = formatTimelineTimeLabel(hoverMs, bounds.startMs, _timelineState.timeDisplay);
        ctx.save();
        ctx.fillStyle = '#333333';
        ctx.fillRect(hx - 24, stemBaselineY + 19, 48, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 9px Lexend, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hoverLabel, hx, stemBaselineY + 29.5);
        ctx.restore();
    }

    canvas._timelineHitTargets = hitTargets;
}

function redrawActiveTimeline() {
    const inlineCanvas = document.getElementById('ptTimelineCanvas');
    if (inlineCanvas && !document.getElementById('sessionTimelineSection').classList.contains('hidden')) {
        drawSessionTimeline(inlineCanvas, false);
    }
    const modalCanvas = document.getElementById('modalTimelineCanvas');
    if (modalCanvas && document.getElementById('sessionTimelineModal').classList.contains('active')) {
        drawSessionTimeline(modalCanvas, true);
    }
}

function initTimelineCanvasEvents(canvasId, isModal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvas._hasTimelineEvents) return;
    canvas._hasTimelineEvents = true;

    const tooltip = document.getElementById(isModal ? 'modalTimelineTooltip' : 'ptTimelineTooltip');

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        _timelineState.hoverX = mouseX;

        // Hit test for Track 3 nodes
        const targets = canvas._timelineHitTargets || [];
        let closest = null;
        let minDist = 18;
        const nearbyTargets = [];

        for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            const dist = Math.hypot(t.x - mouseX, t.y - mouseY);
            if (dist < minDist) {
                minDist = dist;
                closest = t.event;
            }
            if (dist < 22) {
                nearbyTargets.push(t.event);
            }
        }

        // Row-specific hit test for Track 1 intervals
        let hoveredInterval = null;
        if (!closest && mouseY >= 22 && mouseY <= 108) {
            const padLeft = 60;
            const plotW = Math.max(100, rect.width - 90);
            const hoverMs = _timelineState.timeBounds.startMs + ((mouseX - padLeft) / plotW) * _timelineState.timeBounds.durationMs;

            if (mouseY >= 42 && mouseY <= 64 && _timelineState.activeFilters.has('timers')) {
                hoveredInterval = _timelineState.timerIntervals.find(ti => hoverMs >= ti.startMs && hoverMs <= ti.endMs);
            } else if (mouseY >= 64 && mouseY <= 86 && _timelineState.activeFilters.has('timers')) {
                hoveredInterval = _timelineState.modeIntervals.find(mi => hoverMs >= mi.startMs && hoverMs <= mi.endMs);
            } else if (mouseY >= 86 && mouseY <= 106 && _timelineState.activeFilters.has('teams')) {
                hoveredInterval = _timelineState.teamIntervals.find(ti => hoverMs >= ti.startMs && hoverMs <= ti.endMs);
            }
        }

        if (closest) {
            const timeClock = new Date(closest.timestampMs).toLocaleTimeString('en-GB');
            const timeElapsed = formatTimelineTimeLabel(closest.timestampMs, _timelineState.timeBounds.startMs, 'elapsed');

            const bIcon = closest.badgeIcon || (closest.type === 'plus' ? '+' : (closest.type === 'minus' ? '−' : '🏅'));
            const bLabel = closest.badgeLabel || closest.detail || closest.type;
            const toneColor = closest.badgeTone === 'negative' ? '#fee2e2' : (closest.badgeTone === 'positive' ? '#dcfce7' : '#f1f5f9');
            const toneBorder = closest.badgeTone === 'negative' ? '#b91c1c' : (closest.badgeTone === 'positive' ? '#15803d' : '#475569');
            const toneText = closest.badgeTone === 'negative' ? '#991b1b' : (closest.badgeTone === 'positive' ? '#166534' : '#1e293b');

            let teamExtra = '';
            if (closest.teamStudentNames && closest.teamStudentNames.length) {
                teamExtra = `<div style="font-size:9.5px; color:#475569; margin-top:4px;"><strong>Team:</strong> ${escapeHtml(closest.teamStudentNames.join(', '))}</div>`;
            }

            let extraHtml = '';
            if (nearbyTargets.length > 1) {
                const others = nearbyTargets.filter(ev => ev !== closest);
                if (others.length > 0) {
                    const clusterText = t('ptTimelineNearbyEvents') || 'events in this cluster';
                    extraHtml = `<div style="margin-top:6px; padding-top:4px; border-top:1px dashed #666; font-size:10px; color:#555;"><strong>${others.length + 1}</strong> ${escapeHtml(clusterText)}:</div>`;
                    others.slice(0, 3).forEach(o => {
                        const oIcon = o.badgeIcon || (o.type === 'plus' ? '+' : (o.type === 'minus' ? '−' : '•'));
                        extraHtml += `<div style="font-size:9.5px; margin-top:2px; color:#444;">• ${escapeHtml(o.studentName)}: ${escapeHtml(oIcon)} ${escapeHtml(o.badgeLabel || o.detail || o.type)}</div>`;
                    });
                    if (others.length > 3) {
                        extraHtml += `<div style="font-size:9px; color:#888;">+ ${others.length - 3} more...</div>`;
                    }
                }
            }

            tooltip.innerHTML = `
                <div class="pt-tooltip-time">
                    <span>${timeElapsed}</span>
                    <span>${timeClock}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin:4px 0;">
                    <span class="pt-tooltip-badge" style="background:${toneColor}; color:${toneText}; border:1.5px solid ${toneBorder}; font-weight:800; font-size:11px; padding:2px 7px; border-radius:4px;">
                        ${escapeHtml(bIcon)} ${escapeHtml(bLabel)}
                    </span>
                    <span style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase;">${escapeHtml(closest.category)}</span>
                </div>
                <div class="pt-tooltip-title">${escapeHtml(closest.studentName)}</div>
                ${closest.detail && closest.detail !== bLabel ? `<div class="pt-tooltip-detail">${escapeHtml(closest.detail)}</div>` : ''}
                ${closest.meta?.meaning ? `<div style="font-size:9.5px; color:#64748b; font-style:italic; margin-top:2px;">${escapeHtml(closest.meta.meaning)}</div>` : ''}
                ${teamExtra}
                ${extraHtml}
            `;
            tooltip.style.display = 'block';
            const tipX = Math.min(rect.width - 240, Math.max(10, mouseX + 14));
            const tipY = Math.min(rect.height - 130, Math.max(10, mouseY - 40));
            tooltip.style.left = tipX + 'px';
            tooltip.style.top = tipY + 'px';
        } else if (hoveredInterval) {
            const durStr = formatTimelineDuration(hoveredInterval.endMs - hoveredInterval.startMs);
            tooltip.innerHTML = `
                <div class="pt-tooltip-time">
                    <span>${escapeHtml(hoveredInterval.title)}</span>
                    <span>${durStr}</span>
                </div>
                <div class="pt-tooltip-detail">${escapeHtml(hoveredInterval.detail || '')}</div>
            `;
            tooltip.style.display = 'block';
            const tipX = Math.min(rect.width - 220, Math.max(10, mouseX + 14));
            const tipY = Math.min(rect.height - 80, Math.max(10, mouseY - 30));
            tooltip.style.left = tipX + 'px';
            tooltip.style.top = tipY + 'px';
        } else {
            tooltip.style.display = 'none';
        }

        if (!_timelineState._rafPending) {
            _timelineState._rafPending = true;
            requestAnimationFrame(() => {
                _timelineState._rafPending = false;
                drawSessionTimeline(canvas, isModal);
            });
        }
    }

    function handleMouseLeave() {
        _timelineState.hoverX = null;
        if (tooltip) tooltip.style.display = 'none';
        drawSessionTimeline(canvas, isModal);
    }

    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const targets = canvas._timelineHitTargets || [];
        let closest = null;
        let minDist = 18;
        for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            const dist = Math.hypot(t.x - mouseX, t.y - mouseY);
            if (dist < minDist) {
                minDist = dist;
                closest = t.event;
            }
        }
        if (closest && closest.studentName) {
            const currentClean = (_timelineState.selectedStudentName || '').trim().toLowerCase();
            const clickedClean = String(closest.studentName).trim().toLowerCase();
            const newStudent = currentClean === clickedClean ? '' : closest.studentName;
            onTimelineStudentFilterChange(newStudent, isModal);
        }
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
}

function populateTimelineStudentSelect(selectId, session) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentVal = _timelineState.selectedStudentName || select.value;
    select.innerHTML = `<option value="">${t('ptTimelineAllStudents') || 'All Students'}</option>`;

    const studentNames = new Set();
    const activeGid = (currentGroupId && session?.groups && session.groups[currentGroupId])
        ? currentGroupId
        : (session?.activeGroup || (session?.groups && Object.keys(session.groups)[0]) || '');

    if (session && session.groups && activeGid && Array.isArray(session.groups[activeGid])) {
        session.groups[activeGid].forEach(st => {
            if (st && st.name) studentNames.add(st.name);
        });
    } else if (session && session.groups) {
        Object.values(session.groups).forEach(grp => {
            if (Array.isArray(grp)) grp.forEach(st => { if (st && st.name) studentNames.add(st.name); });
        });
    }

    Array.from(studentNames).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (currentVal && String(name).trim().toLowerCase() === String(currentVal).trim().toLowerCase()) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });

    if (currentVal && Array.from(studentNames).some(n => String(n).trim().toLowerCase() === String(currentVal).trim().toLowerCase())) {
        select.value = currentVal;
    } else {
        select.value = '';
        _timelineState.selectedStudentName = '';
    }
}

function renderSessionTimeline(sessionOrId, options = {}) {
    let session = null;
    if (typeof sessionOrId === 'object' && sessionOrId !== null) {
        session = sessionOrId;
    } else if (typeof sessionOrId === 'string') {
        session = DB_EXPORT.find(s => s && (s.id === sessionOrId || s.date === sessionOrId));
    }

    if (!session) {
        closeSessionTimelinePanel();
        return;
    }

    preloadTimelineIcons();
    _timelineState.session = session;
    _timelineState.sessionId = session.id || session.date;

    if (options.selectedStudent) {
        _timelineState.selectedStudentName = options.selectedStudent;
    } else if (!_timelineState.selectedStudentName && currentStudentName) {
        _timelineState.selectedStudentName = currentStudentName;
    }

    const rawGroupId = (currentGroupId && session.groups && session.groups[currentGroupId])
        ? currentGroupId
        : (session.activeGroup || (session.groups && Object.keys(session.groups)[0]) || currentGroupId || '');
    const groupName = session.activeGroupTitle || groupDisplayName(rawGroupId) || rawGroupId;
    const sessionDate = getSessionLocalDateStr(session);

    // Resolve planner slot connection
    const connectedSlot = resolveSessionPlannerSlot(session, rawGroupId);
    _timelineState.connectedSlot = connectedSlot;

    // Default to 'slot' if a slot is available
    if (connectedSlot && (!_timelineState.slotDuration || _timelineState.slotDuration === '55')) {
        _timelineState.slotDuration = 'slot';
    } else if (!connectedSlot && _timelineState.slotDuration === 'slot') {
        _timelineState.slotDuration = 'auto';
    }

    // Populate planner slot select controls
    populateTimelineSlotSelect('ptPlannerSlotSelect', session, rawGroupId);
    populateTimelineSlotSelect('modalPlannerSlotSelect', session, rawGroupId);
    syncSlotDurationInputs(_timelineState.slotDuration);

    const slotLabel = connectedSlot ? ` • ${connectedSlot.time}${connectedSlot.timeEnd ? ' – ' + connectedSlot.timeEnd : ''}` : '';
    const subtitleText = `${groupName ? groupName + ' — ' : ''}${sessionDate}${slotLabel || (session.time ? ' ' + session.time : '')}`;

    const subEl = document.getElementById('sessionTimelineSubtitle');
    if (subEl) subEl.textContent = subtitleText;
    const modalSubEl = document.getElementById('modalTimelineSubtitle');
    if (modalSubEl) modalSubEl.textContent = subtitleText;

    // Normalize raw events
    _timelineState.rawEvents = Array.isArray(session.sessionHistory) ? session.sessionHistory : [];
    _timelineState.events = normalizeTimelineEvents(_timelineState.rawEvents, session);
    _timelineState.timeBounds = getSessionTimeBounds(session, _timelineState.slotDuration, _timelineState.events);

    let outOfBoundsCount = 0;
    if (_timelineState.timeBounds.isPlannerSlot && _timelineState.events.length > 0) {
        _timelineState.events.forEach(ev => {
            if (ev.timestampMs < _timelineState.timeBounds.startMs || ev.timestampMs > _timelineState.timeBounds.endMs) {
                outOfBoundsCount++;
            }
        });
    }
    const outOfBoundsHint = outOfBoundsCount > 0 ? ` <span class="pt-timeline-out-of-bounds-hint" title="${(t('ptTimelineOutOfBoundsHint') || '{0} event(s) outside slot').replace('{0}', outOfBoundsCount)}">${outOfBoundsCount} ${t('ptTimelineOutOfBoundsShort') || 'outside slot'}</span>` : '';
    if (subEl) subEl.innerHTML = `${escapeHtml(subtitleText)}${outOfBoundsHint}`;
    if (modalSubEl) modalSubEl.innerHTML = `${escapeHtml(subtitleText)}${outOfBoundsHint}`;

    const intervals = computeTimelineIntervals(_timelineState.events, _timelineState.timeBounds);
    _timelineState.timerIntervals = intervals.timerIntervals;
    _timelineState.modeIntervals = intervals.modeIntervals;
    _timelineState.teamIntervals = intervals.teamIntervals;

    // Populate student filter dropdowns
    populateTimelineStudentSelect('ptStudentFilterSelect', session);
    populateTimelineStudentSelect('modalStudentFilterSelect', session);

    // Update KPIs
    updateTimelineKpiBar('ptKpi', _timelineState.events, _timelineState.timeBounds, intervals, session);
    updateTimelineKpiBar('modalKpi', _timelineState.events, _timelineState.timeBounds, intervals, session);

    // If empty legacy session, populate empty state details
    if (_timelineState.events.length === 0) {
        let statsSummary = '';
        if (session.groups && rawGroupId && Array.isArray(session.groups[rawGroupId])) {
            const stList = session.groups[rawGroupId];
            const plusSum = stList.reduce((acc, s) => acc + (s.pluses || 0), 0);
            const minusSum = stList.reduce((acc, s) => acc + (s.minuses || 0), 0);
            const pickSum = stList.reduce((acc, s) => acc + (s.picks || 0), 0);
            statsSummary = `Aggregate session totals: ${plusSum} pluses, ${minusSum} minuses, ${pickSum} picks across ${stList.length} students.`;
        }
        const ptStatsEl = document.getElementById('ptTimelineEmptyStats');
        if (ptStatsEl) ptStatsEl.textContent = statsSummary;
        const modalStatsEl = document.getElementById('modalTimelineEmptyStats');
        if (modalStatsEl) modalStatsEl.textContent = statsSummary;
    }

    // Show panel
    const panel = document.getElementById('sessionTimelineSection');
    if (panel) {
        panel.classList.remove('hidden');
        initTimelineCanvasEvents('ptTimelineCanvas', false);
    }

    if (options.openModal) {
        openSessionTimelineModal();
    } else {
        requestAnimationFrame(() => {
            const canvas = document.getElementById('ptTimelineCanvas');
            if (canvas) drawSessionTimeline(canvas, false);
        });
    }
}

function openSessionTimeline(sessionOrId, options = {}) {
    renderSessionTimeline(sessionOrId, options);
}

function openSessionTimelineModal() {
    const modal = document.getElementById('sessionTimelineModal');
    if (!modal) return;
    modal.classList.add('active');
    _timelineState.isModalOpen = true;

    // Sync controls into modal toolbar
    populateTimelineSlotSelect('modalPlannerSlotSelect', _timelineState.session, currentGroupId);
    syncSlotDurationInputs(_timelineState.slotDuration);
    const timeSel = document.getElementById('modalTimeDisplaySelect');
    if (timeSel) timeSel.value = _timelineState.timeDisplay;
    const studSel = document.getElementById('modalStudentFilterSelect');
    if (studSel) studSel.value = _timelineState.selectedStudentName;

    document.querySelectorAll('#sessionTimelineModal button.pt-filter-chip').forEach(btn => {
        btn.classList.toggle('active', _timelineState.activeFilters.has(btn.dataset.filter));
    });

    initTimelineCanvasEvents('modalTimelineCanvas', true);
    requestAnimationFrame(() => {
        const canvas = document.getElementById('modalTimelineCanvas');
        if (canvas) drawSessionTimeline(canvas, true);
        setTimeout(() => {
            if (canvas && _timelineState.isModalOpen) drawSessionTimeline(canvas, true);
        }, 80);
    });
}

function closeSessionTimelineModal() {
    const modal = document.getElementById('sessionTimelineModal');
    if (modal) modal.classList.remove('active');
    _timelineState.isModalOpen = false;
}

function closeSessionTimelinePanel() {
    const panel = document.getElementById('sessionTimelineSection');
    if (panel) panel.classList.add('hidden');
}

function toggleTimelineFilter(filterKey, buttonEl, isModal) {
    if (_timelineState.activeFilters.has(filterKey)) {
        if (_timelineState.activeFilters.size > 1) {
            _timelineState.activeFilters.delete(filterKey);
        }
    } else {
        _timelineState.activeFilters.add(filterKey);
    }

    // Sync all filter buttons with this data-filter across inline & modal toolbars
    document.querySelectorAll(`button.pt-filter-chip[data-filter="${filterKey}"]`).forEach(btn => {
        btn.classList.toggle('active', _timelineState.activeFilters.has(filterKey));
    });

    redrawActiveTimeline();
}

function onTimelineSlotDurationChange(durationVal, isModal) {
    if (durationVal === 'slot') {
        _timelineState.slotDuration = 'slot';
        syncSlotDurationInputs('slot');
        refreshTimelineBoundsAndRedraw();
        return;
    }

    if (durationVal === 'custom') {
        const promptFn = typeof showPrompt === 'function' ? showPrompt : prompt;
        const res = promptFn('Enter slot duration in minutes (e.g. 75):', '75');
        Promise.resolve(res).then(val => {
            const parsed = parseInt(val, 10);
            if (parsed && parsed >= 5 && parsed <= 360) {
                _timelineState.slotDuration = String(parsed);
            } else {
                _timelineState.slotDuration = '55';
            }
            syncSlotDurationInputs(_timelineState.slotDuration);
            refreshTimelineBoundsAndRedraw();
        });
        return;
    }

    _timelineState.slotDuration = durationVal;
    syncSlotDurationInputs(durationVal);
    refreshTimelineBoundsAndRedraw();
}

function syncSlotDurationInputs(val) {
    const el1 = document.getElementById('ptSlotDurationSelect');
    const el2 = document.getElementById('modalSlotDurationSelect');
    const slotOpt1 = document.getElementById('ptSlotOptionDuration');
    const slotOpt2 = document.getElementById('modalSlotOptionDuration');
    if (_timelineState.connectedSlot && _timelineState.connectedSlot.time) {
        const s = _timelineState.connectedSlot;
        const slotLabel = `${t('ptTimelineSlotOption') || 'Planner Slot'} (${s.time}${s.timeEnd ? ' – ' + s.timeEnd : ''})`;
        if (slotOpt1) { slotOpt1.textContent = slotLabel; slotOpt1.style.display = ''; }
        if (slotOpt2) { slotOpt2.textContent = slotLabel; slotOpt2.style.display = ''; }
    } else {
        if (slotOpt1) slotOpt1.style.display = 'none';
        if (slotOpt2) slotOpt2.style.display = 'none';
    }
    if (el1) el1.value = val;
    if (el2) el2.value = val;
}

function populateTimelineSlotSelect(selectId, session, groupId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const targetGroupId = groupId || currentGroupId || (session && session.activeGroup) || '';
    const schedule = getPlannerClassSchedule(targetGroupId);
    const sessionDate = getSessionLocalDateStr(session);
    let dow = null;
    if (sessionDate) {
        const dt = new Date(sessionDate + 'T12:00:00');
        if (!Number.isNaN(dt.getTime())) dow = dt.getDay();
    }

    const entries = sessionDate ? getPlannerEntriesForClassAndDate(targetGroupId, sessionDate) : [];
    const connectedSlot = resolveSessionPlannerSlot(session, targetGroupId);

    select.innerHTML = '';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dowName = dow !== null ? dayNames[dow] : '';

    // Group 1: Matching Day Slots & Entries
    const daySlots = (dow !== null) ? schedule.filter(s => parseInt(s.day, 10) === dow) : [];

    if (daySlots.length > 0 || entries.length > 0) {
        const optGroup = document.createElement('optgroup');
        optGroup.label = dowName ? `${dowName} Schedule` : 'Scheduled Slots';

        entries.forEach(e => {
            const opt = document.createElement('option');
            opt.value = `entry:${e.id}`;
            const timeEnd = e.timeEnd || _calcTimeEnd(e.time, 55);
            const topicStr = e.topic ? ` (${e.topic})` : '';
            opt.textContent = `📅 ${e.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${topicStr}`;
            if (connectedSlot && (connectedSlot.entryId === e.id || (connectedSlot.time === e.time.slice(0, 5) && connectedSlot.isEntry))) {
                opt.selected = true;
            }
            optGroup.appendChild(opt);
        });

        daySlots.forEach(s => {
            const opt = document.createElement('option');
            opt.value = `slot|${s.day}|${s.time.slice(0, 5)}|${(s.timeEnd || '').slice(0, 5)}|${s.halfGroup || ''}`;
            const timeEnd = s.timeEnd || _calcTimeEnd(s.time, 55);
            const halfStr = s.halfGroup ? ` ½${s.halfGroup}` : '';
            opt.textContent = `⏱️ ${s.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${halfStr}`;
            if (connectedSlot && !connectedSlot.isEntry && connectedSlot.time === s.time.slice(0, 5)) {
                opt.selected = true;
            }
            optGroup.appendChild(opt);
        });

        select.appendChild(optGroup);
    }

    // Group 2: All Other Schedule Slots (if any)
    const otherSlots = (dow !== null) ? schedule.filter(s => parseInt(s.day, 10) !== dow) : schedule;
    if (otherSlots.length > 0) {
        const optGroupOther = document.createElement('optgroup');
        optGroupOther.label = 'Other Weekday Slots';
        otherSlots.forEach(s => {
            const opt = document.createElement('option');
            opt.value = `slot|${s.day}|${s.time.slice(0, 5)}|${(s.timeEnd || '').slice(0, 5)}|${s.halfGroup || ''}`;
            const timeEnd = s.timeEnd || _calcTimeEnd(s.time, 55);
            const dayLabel = dayNames[s.day] ? dayNames[s.day].slice(0, 3) + ' ' : '';
            const halfStr = s.halfGroup ? ` ½${s.halfGroup}` : '';
            opt.textContent = `${dayLabel}${s.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${halfStr}`;
            if (connectedSlot && !connectedSlot.isEntry && parseInt(connectedSlot.day, 10) === parseInt(s.day, 10) && connectedSlot.time === s.time.slice(0, 5)) {
                opt.selected = true;
            }
            optGroupOther.appendChild(opt);
        });
        select.appendChild(optGroupOther);
    }

    // Custom slot option
    const optCustom = document.createElement('option');
    optCustom.value = 'custom_slot';
    optCustom.textContent = t('ptTimelineCustomSlot') || 'Custom Lesson Slot...';
    select.appendChild(optCustom);

    // None option
    const optNone = document.createElement('option');
    optNone.value = 'none';
    optNone.textContent = t('ptTimelineNoSlot') || 'No Planner Slot (Manual / Event Span)';
    if (!connectedSlot) {
        optNone.selected = true;
    }
    select.appendChild(optNone);
}

async function onTimelinePlannerSlotChange(val, isModal) {
    if (!_timelineState.session) return;
    const session = _timelineState.session;
    const targetGroupId = currentGroupId || session.activeGroup || (session.groups && Object.keys(session.groups)[0]) || '';

    if (val === 'none') {
        session.plannerSlot = null;
        session.plannerEntryId = '';
        session.plannerSlotUnlinked = true;
        _timelineState.connectedSlot = null;
        _timelineState.slotDuration = 'auto';
        syncSlotDurationInputs('auto');
        syncPlannerSlotInputs('none');
        await persistEditedGroupSessionsToDisk(targetGroupId);
        showMessage(t('ptMsgSlotUnlinked') || 'Planner slot unlinked from session.', 'info');
        refreshTimelineBoundsAndRedraw();
        updateHistoryTableSlotCells();
        return;
    }

    if (val === 'custom_slot') {
        const promptFn = typeof showPrompt === 'function' ? showPrompt : prompt;
        const promptMsg = t('ptTimelinePromptSlot') || 'Enter slot start and end times (HH:MM - HH:MM, e.g. 08:30 - 09:25):';
        const defaultVal = _timelineState.connectedSlot ? `${_timelineState.connectedSlot.time} - ${_timelineState.connectedSlot.timeEnd}` : '08:30 - 09:25';
        const res = await Promise.resolve(promptFn(promptMsg, defaultVal));
        if (!res) {
            syncPlannerSlotInputs(_timelineState.connectedSlot ? `slot|${_timelineState.connectedSlot.day}|${_timelineState.connectedSlot.time}|${_timelineState.connectedSlot.timeEnd}|` : 'none');
            return;
        }
        const m = String(res).match(/(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})/i);
        if (m) {
            const time = m[1].padStart(5, '0');
            const timeEnd = m[2].padStart(5, '0');
            session.plannerSlot = {
                time,
                timeEnd,
                label: `${time} – ${timeEnd}`
            };
            session.plannerEntryId = '';
            delete session.plannerSlotUnlinked;
            _timelineState.connectedSlot = session.plannerSlot;
            _timelineState.slotDuration = 'slot';
            syncSlotDurationInputs('slot');
            await persistEditedGroupSessionsToDisk(targetGroupId);
            const msg = (t('ptMsgSlotConnected') || 'Session connected to planner slot: {0}').replace('{0}', `${time} – ${timeEnd}`);
            showMessage(msg, 'success');
            populateTimelineSlotSelect('ptPlannerSlotSelect', session, targetGroupId);
            populateTimelineSlotSelect('modalPlannerSlotSelect', session, targetGroupId);
            refreshTimelineBoundsAndRedraw();
            updateHistoryTableSlotCells();
            return;
        } else {
            showMessage('Invalid time format. Please use HH:MM - HH:MM (e.g. 08:30 - 09:25)', 'error');
            return;
        }
    }

    if (val.startsWith('entry:')) {
        const entryId = val.slice(6);
        const sessionDate = getSessionLocalDateStr(session);
        const entries = getPlannerEntriesForClassAndDate(targetGroupId, sessionDate);
        const matchedEntry = entries.find(e => e.id === entryId) ||
            (typeof PLANNER_CONFIG !== 'undefined' && Array.isArray(PLANNER_CONFIG.entries) && PLANNER_CONFIG.entries.find(e => e.id === entryId));
        if (matchedEntry) {
            const timeEnd = matchedEntry.timeEnd || _calcTimeEnd(matchedEntry.time, 55);
            session.plannerEntryId = matchedEntry.id;
            delete session.plannerSlotUnlinked;
            session.plannerSlot = {
                time: matchedEntry.time.slice(0, 5),
                timeEnd: timeEnd.slice(0, 5),
                label: `${matchedEntry.time.slice(0, 5)} – ${timeEnd.slice(0, 5)}${matchedEntry.topic ? ' (' + matchedEntry.topic + ')' : ''}`,
                entryId: matchedEntry.id,
                topic: matchedEntry.topic || ''
            };
            _timelineState.connectedSlot = session.plannerSlot;
            _timelineState.slotDuration = 'slot';
            syncSlotDurationInputs('slot');
            syncPlannerSlotInputs(val);
            await persistEditedGroupSessionsToDisk(targetGroupId);
            const msg = (t('ptMsgSlotConnected') || 'Session connected to planner slot: {0}').replace('{0}', session.plannerSlot.label);
            showMessage(msg, 'success');
            refreshTimelineBoundsAndRedraw();
            updateHistoryTableSlotCells();
            return;
        }
    }

    if (val.startsWith('slot|') || val.startsWith('slot:')) {
        let day = 0, time = '', timeEnd = '', halfGroup = '';
        if (val.startsWith('slot|')) {
            const parts = val.split('|');
            day = parseInt(parts[1], 10);
            time = parts[2] || '';
            timeEnd = parts[3] || _calcTimeEnd(time, 55);
            halfGroup = parts[4] || '';
        } else {
            const parts = val.split(':');
            day = parseInt(parts[1], 10);
            if (parts.length >= 6) {
                time = `${parts[2]}:${parts[3]}`;
                timeEnd = `${parts[4]}:${parts[5]}`;
                halfGroup = parts[6] || '';
            } else {
                time = parts[2] || '';
                timeEnd = parts[3] || _calcTimeEnd(time, 55);
                halfGroup = parts[4] || '';
            }
        }
        session.plannerSlot = {
            day,
            time,
            timeEnd,
            halfGroup,
            label: `${time} – ${timeEnd}${halfGroup ? ' ½' + halfGroup : ''}`
        };
        session.plannerEntryId = '';
        delete session.plannerSlotUnlinked;
        _timelineState.connectedSlot = session.plannerSlot;
        _timelineState.slotDuration = 'slot';
        syncSlotDurationInputs('slot');
        syncPlannerSlotInputs(val);
        await persistEditedGroupSessionsToDisk(targetGroupId);
        const msg = (t('ptMsgSlotConnected') || 'Session connected to planner slot: {0}').replace('{0}', session.plannerSlot.label);
        showMessage(msg, 'success');
        refreshTimelineBoundsAndRedraw();
        updateHistoryTableSlotCells();
    }
}

function syncPlannerSlotInputs(val) {
    const el1 = document.getElementById('ptPlannerSlotSelect');
    const el2 = document.getElementById('modalPlannerSlotSelect');
    if (el1) el1.value = val;
    if (el2) el2.value = val;
}

function updateHistoryTableSlotCells() {
    const rows = document.querySelectorAll('#historyTableBody tr.expandable-row');
    rows.forEach(row => {
        const timeCell = row.querySelector('td[data-col="time"]');
        if (!timeCell) return;
        const btn = row.querySelector('.btn-timeline-row');
        const sessionId = btn ? btn.getAttribute('data-session-id') : null;
        if (!sessionId) return;
        const session = DB_EXPORT.find(s => s && (s.id === sessionId || s.date === sessionId));
        if (!session) return;
        const slot = resolveSessionPlannerSlot(session, currentGroupId);
        if (slot && slot.time) {
            const isExplicit = !!session.plannerSlot || !!session.plannerEntryId;
            const pillClass = isExplicit ? 'pt-slot-explicit' : 'pt-slot-auto';
            const pillTitle = isExplicit
                ? (t('ptSlotExplicitTitle') || 'Explicitly linked planner slot')
                : (t('ptSlotAutoTitle') || 'Auto-matched planner slot');
            const rawTime = session.time || '';
            timeCell.innerHTML = `
                <div class="pt-slot-cell" onclick="event.stopPropagation(); openSessionTimeline('${escapeHtml(session.id)}', { openModal: false });" title="${escapeHtml(pillTitle)}: ${escapeHtml(slot.time)} – ${escapeHtml(slot.timeEnd)}">
                    <span class="pt-slot-pill ${pillClass}">
                        <img src="../assets/icons/planner.svg" class="btn-icon" style="width:11px;height:11px;vertical-align:-1px;" alt="" />
                        <span>${escapeHtml(slot.time)}–${escapeHtml(slot.timeEnd)}</span>
                    </span>
                    ${rawTime && rawTime.slice(0, 5) !== slot.time ? `<span class="pt-slot-raw-time" title="Session logged at ${escapeHtml(rawTime)}">${escapeHtml(rawTime)}</span>` : ''}
                </div>
            `;
        }
    });
}

function onTimelineTimeDisplayChange(displayVal, isModal) {
    _timelineState.timeDisplay = displayVal;
    const el1 = document.getElementById('ptTimeDisplaySelect');
    const el2 = document.getElementById('modalTimeDisplaySelect');
    if (el1) el1.value = displayVal;
    if (el2) el2.value = displayVal;
    redrawActiveTimeline();
}

function onTimelineStudentFilterChange(studentVal, isModal) {
    _timelineState.selectedStudentName = studentVal;
    const el1 = document.getElementById('ptStudentFilterSelect');
    const el2 = document.getElementById('modalStudentFilterSelect');
    if (el1) el1.value = studentVal;
    if (el2) el2.value = studentVal;
    redrawActiveTimeline();
}

function refreshTimelineBoundsAndRedraw() {
    if (!_timelineState.session) return;
    _timelineState.timeBounds = getSessionTimeBounds(_timelineState.session, _timelineState.slotDuration, _timelineState.events);
    const intervals = computeTimelineIntervals(_timelineState.events, _timelineState.timeBounds);
    _timelineState.timerIntervals = intervals.timerIntervals;
    _timelineState.modeIntervals = intervals.modeIntervals;
    _timelineState.teamIntervals = intervals.teamIntervals;
    updateTimelineKpiBar('ptKpi', _timelineState.events, _timelineState.timeBounds, intervals, _timelineState.session);
    updateTimelineKpiBar('modalKpi', _timelineState.events, _timelineState.timeBounds, intervals, _timelineState.session);
    redrawActiveTimeline();
}

async function saveTimelineFile(filename, data, format) {
    const rawGid = currentGroupId || (_timelineState.session?.groups && Object.keys(_timelineState.session.groups)[0]) || '';
    const groupName = _timelineState.session?.activeGroupTitle || groupDisplayName(rawGid) || 'Class';
    const dateStr = _timelineState.session ? getSessionLocalDateStr(_timelineState.session) : 'session';
    const safeName = filename || `Session_Timeline_${groupName}_${dateStr}.${format}`;

    if (window.Desktop && Desktop.isElectron()) {
        try {
            let res;
            if (format === 'svg') {
                res = await Desktop.saveText('toPrint', safeName, data);
            } else {
                res = await Desktop.saveBlob('toPrint', safeName, data);
            }
            if (res && res.ok && res.path) {
                if (window.showExportSuccessPopup) {
                    showExportSuccessPopup(res.path, res.name || safeName);
                } else {
                    showMessage('Timeline exported: ' + (res.name || safeName), 'success');
                }
                return;
            }
        } catch (err) {
            console.warn('Desktop timeline export failed, falling back:', err);
        }
    }

    // Web browser fallback
    const blob = format === 'svg' ? new Blob([data], { type: 'image/svg+xml;charset=utf-8' }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Timeline exported: ' + safeName, 'success');
}

function exportTimelinePng() {
    const activeCanvas = _timelineState.isModalOpen
        ? document.getElementById('modalTimelineCanvas')
        : document.getElementById('ptTimelineCanvas');

    if (!activeCanvas) return;

    activeCanvas.toBlob(blob => {
        if (!blob) return;
        const rawGid = currentGroupId || (_timelineState.session?.groups && Object.keys(_timelineState.session.groups)[0]) || '';
        const groupName = _timelineState.session?.activeGroupTitle || groupDisplayName(rawGid) || 'Class';
        const dateStr = _timelineState.session ? getSessionLocalDateStr(_timelineState.session) : 'session';
        const filename = `Session_Timeline_${groupName}_${dateStr}.png`;
        saveTimelineFile(filename, blob, 'png');
    }, 'image/png');
}

function exportTimelineSvg() {
    const session = _timelineState.session;
    if (!session) return;

    const rawGid = currentGroupId || (session.groups && Object.keys(session.groups)[0]) || '';
    const groupName = session.activeGroupTitle || groupDisplayName(rawGid) || 'Class';
    const dateStr = getSessionLocalDateStr(session);
    const filename = `Session_Timeline_${groupName}_${dateStr}.svg`;

    const bounds = _timelineState.timeBounds;
    const filteredEvents = _timelineState.events.filter(e => isTimelineEventActive(e, _timelineState.activeFilters));
    const width = 1100;
    const height = 480;
    const padLeft = 65;
    const padRight = 35;
    const padTop = 30;
    const padBottom = 40;
    const plotW = width - padLeft - padRight;

    function getSvgX(timeMs) {
        if (bounds.durationMs <= 0) return padLeft;
        const ratio = Math.max(0, Math.min(1, (timeMs - bounds.startMs) / bounds.durationMs));
        return padLeft + ratio * plotW;
    }

    const track1Top = padTop;
    const track1Height = 85;
    const track2Top = track1Top + track1Height + 12;
    const track2Height = 120;
    const stemBaselineY = height - padBottom - 26;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `<style>
        text { font-family: 'Lexend', system-ui, -apple-system, sans-serif; }
        .track-title { font-weight: 800; font-size: 10px; fill: #666666; }
        .stem-line { stroke: #444444; stroke-width: 1.2; }
        .axis-line { stroke: #333333; stroke-width: 2; }
        .grid-line { stroke: #eaeae4; stroke-width: 1; }
        .tick-label { font-weight: 700; font-size: 10px; fill: #444444; text-anchor: middle; }
        .student-label { font-weight: 600; font-size: 9px; fill: #333333; text-anchor: middle; }
        .band-rect { stroke: #333333; stroke-width: 1.5; rx: 5; ry: 5; }
        .band-text { font-weight: 700; font-size: 10px; fill: #222222; }
    </style>\n`;

    // Canvas Background
    svg += `<rect width="100%" height="100%" fill="#ffffff" stroke="#333333" stroke-width="2" rx="8" />\n`;

    // Track 1 background
    svg += `<rect x="${padLeft}" y="${track1Top}" width="${plotW}" height="${track1Height}" fill="#fafaf7" stroke="#e8e8e2" stroke-width="1" />\n`;
    svg += `<text x="${padLeft + 8}" y="${track1Top + 14}" class="track-title">INTERVALS &amp; MODES</text>\n`;

    // Track 1 bands
    if (_timelineState.activeFilters.has('timers')) {
        _timelineState.timerIntervals.forEach(ti => {
            if (ti.endMs < bounds.startMs || ti.startMs > bounds.endMs) return;
            const x1 = getSvgX(ti.startMs);
            const x2 = getSvgX(ti.endMs);
            const bw = Math.max(20, x2 - x1);
            svg += `<rect x="${x1 + 2}" y="${track1Top + 22}" width="${bw}" height="18" fill="#555555" rx="5" />\n`;
            svg += `<rect x="${x1}" y="${track1Top + 20}" width="${bw}" height="18" fill="#fef3c7" class="band-rect" />\n`;
            if (bw > 35) svg += `<text x="${x1 + 6}" y="${track1Top + 33}" class="band-text">${escapeHtml(ti.title)} (${formatTimelineDuration(ti.endMs - ti.startMs)})</text>\n`;
        });

        _timelineState.modeIntervals.forEach(mi => {
            if (mi.endMs < bounds.startMs || mi.startMs > bounds.endMs) return;
            const x1 = getSvgX(mi.startMs);
            const x2 = getSvgX(mi.endMs);
            const bw = Math.max(20, x2 - x1);
            svg += `<rect x="${x1 + 2}" y="${track1Top + 44}" width="${bw}" height="18" fill="#555555" rx="5" />\n`;
            svg += `<rect x="${x1}" y="${track1Top + 42}" width="${bw}" height="18" fill="#ede9fe" class="band-rect" />\n`;
            if (bw > 35) svg += `<text x="${x1 + 6}" y="${track1Top + 55}" class="band-text">${escapeHtml(mi.title)}</text>\n`;
        });
    }

    if (_timelineState.activeFilters.has('teams')) {
        _timelineState.teamIntervals.forEach(ti => {
            if (ti.endMs < bounds.startMs || ti.startMs > bounds.endMs) return;
            const x1 = getSvgX(ti.startMs);
            const x2 = getSvgX(ti.endMs);
            const bw = Math.max(20, x2 - x1);
            svg += `<rect x="${x1 + 2}" y="${track1Top + 66}" width="${bw}" height="16" fill="#555555" rx="5" />\n`;
            svg += `<rect x="${x1}" y="${track1Top + 64}" width="${bw}" height="16" fill="#dbeafe" class="band-rect" />\n`;
            if (bw > 35) svg += `<text x="${x1 + 6}" y="${track1Top + 76}" class="band-text">${escapeHtml(ti.title)}</text>\n`;
        });
    }

    // Track 2: Cumulative stepped curve
    svg += `<text x="${padLeft + 8}" y="${track2Top + 14}" class="track-title">INTERACTIVE PACING (CUMULATIVE)</text>\n`;
    const targetStudentCleanSvg = (_timelineState.selectedStudentName || '').trim().toLowerCase();
    const curveEventsSvg = filteredEvents.filter(e => {
        const type = e.type || '';
        if (type.startsWith('timer-') || type.startsWith('mode-') || type === 'exam-toggle') return false;
        if (!targetStudentCleanSvg) return true;
        return eventMatchesTimelineStudent(e, targetStudentCleanSvg);
    });

    let cum = 0;
    const pts = [{ x: padLeft, y: track2Top + track2Height, count: 0 }];
    curveEventsSvg.forEach(e => {
        cum += 1;
        pts.push({ x: getSvgX(e.timestampMs), count: cum });
    });
    pts.push({ x: padLeft + plotW, count: cum });

    const maxC = Math.max(1, cum);
    pts.forEach(p => {
        p.y = (track2Top + track2Height) - ((p.count / maxC) * (track2Height - 16));
    });

    if (pts.length > 1) {
        let areaD = `M ${pts[0].x} ${track2Top + track2Height} L ${pts[0].x} ${pts[0].y.toFixed(1)}`;
        for (let p = 1; p < pts.length; p++) {
            areaD += ` L ${pts[p].x.toFixed(1)} ${pts[p - 1].y.toFixed(1)} L ${pts[p].x.toFixed(1)} ${pts[p].y.toFixed(1)}`;
        }
        areaD += ` L ${padLeft + plotW} ${track2Top + track2Height} Z`;
        svg += `<path d="${areaD}" fill="#6abf8e" fill-opacity="0.22" />\n`;

        let lineD = `M ${pts[0].x} ${pts[0].y.toFixed(1)}`;
        for (let p = 1; p < pts.length; p++) {
            lineD += ` L ${pts[p].x.toFixed(1)} ${pts[p - 1].y.toFixed(1)} L ${pts[p].x.toFixed(1)} ${pts[p].y.toFixed(1)}`;
        }
        svg += `<path d="${lineD}" fill="none" stroke="#2e7d32" stroke-width="2" />\n`;
    }

    // Track 3: Event Stems & Scatter Nodes
    svg += `<line x1="${padLeft}" y1="${stemBaselineY}" x2="${padLeft + plotW}" y2="${stemBaselineY}" stroke="#dddddd" stroke-width="1" />\n`;

    const svgAssignedTiers = [];
    filteredEvents.forEach((ev, idx) => {
        const ex = getSvgX(ev.timestampMs);
        const usedTiers = new Set();
        let clusterCount = 0;

        for (let j = Math.max(0, idx - 12); j < idx; j++) {
            const prevX = getSvgX(filteredEvents[j].timestampMs);
            if (Math.abs(ex - prevX) < 22) {
                usedTiers.add(svgAssignedTiers[j]);
                clusterCount++;
            }
        }

        let tier = 0;
        while (usedTiers.has(tier) && tier < 6) {
            tier++;
        }
        svgAssignedTiers[idx] = tier;

        const jitterX = clusterCount >= 6 ? ((idx % 3) - 1) * 3 : 0;
        const nodeCenterX = ex + jitterX;
        const nodeCenterY = stemBaselineY - 16 - (tier * 20);

        const isTargetSvg = eventMatchesTimelineStudent(ev, targetStudentCleanSvg);
        const nodeAlpha = isTargetSvg ? '1.0' : '0.18';
        const strokeW = isTargetSvg && targetStudentCleanSvg ? '2.5' : '1.5';
        const strokeCol = isTargetSvg && targetStudentCleanSvg ? '#111111' : '#333333';

        svg += `<g opacity="${nodeAlpha}">\n`;
        svg += `<line x1="${nodeCenterX.toFixed(1)}" y1="${stemBaselineY}" x2="${nodeCenterX.toFixed(1)}" y2="${(nodeCenterY + 11).toFixed(1)}" stroke="${isTargetSvg && targetStudentCleanSvg ? '#111111' : '#666666'}" stroke-width="${isTargetSvg && targetStudentCleanSvg ? '1.8' : '1.0'}" />\n`;
        svg += `<circle cx="${(nodeCenterX + 1.5).toFixed(1)}" cy="${(nodeCenterY + 1.5).toFixed(1)}" r="11" fill="#555555" />\n`;
        svg += `<circle cx="${nodeCenterX.toFixed(1)}" cy="${nodeCenterY.toFixed(1)}" r="11" fill="${ev.badgeColor || '#6abf8e'}" stroke="${strokeCol}" stroke-width="${strokeW}" />\n`;

        const bIcon = ev.badgeIcon;
        let sym = bIcon || (ev.type === 'plus' ? '+' : (ev.type === 'minus' ? '−' : (ev.type === 'pick' ? '🎲' : '🏅')));
        let fSize = 11;
        let fill = '#111111';
        let fWeight = '800';

        if (bIcon === '+' || ev.type === 'plus' || ev.type === 'team-plus') {
            sym = '+';
            fSize = 13;
            fill = '#111111';
        } else if (bIcon === '−' || bIcon === '-' || ev.type === 'minus' || ev.type === 'team-minus') {
            sym = '−';
            fSize = 14;
            fill = '#ffffff';
        } else if (bIcon && /\p{Extended_Pictographic}/u.test(bIcon)) {
            sym = bIcon;
            fSize = 11;
        } else if (bIcon && !/\p{Extended_Pictographic}/u.test(bIcon)) {
            sym = bIcon;
            fSize = bIcon.length > 2 ? 7.5 : (bIcon.length > 1 ? 8.5 : 11);
            fill = (ev.badgeTone === 'negative' || ev.badgeColor === '#c96b6b' || ev.badgeColor === '#5b8fcc' || ev.badgeColor === '#475569') ? '#ffffff' : '#111111';
        }

        svg += `<text x="${nodeCenterX.toFixed(1)}" y="${(nodeCenterY + 3.5).toFixed(1)}" font-weight="${fWeight}" font-size="${fSize}" fill="${fill}" text-anchor="middle">${escapeHtml(sym)}</text>\n`;
        svg += `</g>\n`;
    });

    // Student labels below baseline without overlapping collisions
    let lastSvgLabelX = -999;
    filteredEvents.forEach(ev => {
        const ex = getSvgX(ev.timestampMs);
        const isTargetStudent = eventMatchesTimelineStudent(ev, targetStudentCleanSvg);

        if (isTargetStudent && (targetStudentCleanSvg || Math.abs(ex - lastSvgLabelX) >= 42)) {
            lastSvgLabelX = ex;
            let sName = ev.studentName || '';
            if (sName.length > 11) sName = sName.slice(0, 10) + '…';
            svg += `<text x="${ex.toFixed(1)}" y="${stemBaselineY + 12}" class="student-label">${escapeHtml(sName)}</text>\n`;
        }
    });

    // Bottom Axis
    svg += `<line x1="${padLeft}" y1="${stemBaselineY + 18}" x2="${padLeft + plotW}" y2="${stemBaselineY + 18}" class="axis-line" />\n`;
    const durationM = bounds.durationMs / 60000;
    const tickM = durationM > 65 ? 10 : (durationM > 30 ? 5 : 2);
    const totalT = Math.floor(durationM / tickM);

    let lastSvgTickMs = bounds.startMs;
    for (let ti = 0; ti <= totalT; ti++) {
        const tickMs = bounds.startMs + (ti * tickM * 60 * 1000);
        if (tickMs > bounds.endMs) break;
        lastSvgTickMs = tickMs;
        const tx = getSvgX(tickMs);
        svg += `<line x1="${tx.toFixed(1)}" y1="${stemBaselineY + 18}" x2="${tx.toFixed(1)}" y2="${stemBaselineY + 23}" stroke="#333333" stroke-width="1.5" />\n`;
        svg += `<line x1="${tx.toFixed(1)}" y1="${track1Top}" x2="${tx.toFixed(1)}" y2="${stemBaselineY + 18}" class="grid-line" stroke-dasharray="3,3" />\n`;
        const lbl = formatTimelineTimeLabel(tickMs, bounds.startMs, _timelineState.timeDisplay);
        svg += `<text x="${tx.toFixed(1)}" y="${stemBaselineY + 34}" class="tick-label">${lbl}</text>\n`;
    }

    if (bounds.endMs - lastSvgTickMs >= 2 * 60 * 1000) {
        const endTx = getSvgX(bounds.endMs);
        svg += `<line x1="${endTx.toFixed(1)}" y1="${stemBaselineY + 18}" x2="${endTx.toFixed(1)}" y2="${stemBaselineY + 23}" stroke="#333333" stroke-width="1.5" />\n`;
        svg += `<line x1="${endTx.toFixed(1)}" y1="${track1Top}" x2="${endTx.toFixed(1)}" y2="${stemBaselineY + 18}" class="grid-line" stroke-dasharray="3,3" />\n`;
        const lbl = formatTimelineTimeLabel(bounds.endMs, bounds.startMs, _timelineState.timeDisplay);
        svg += `<text x="${endTx.toFixed(1)}" y="${stemBaselineY + 34}" class="tick-label">${lbl}</text>\n`;
    }

    svg += `</svg>`;
    saveTimelineFile(filename, svg, 'svg');
}

window.addEventListener('resize', () => {
    if (_timelineState.session) {
        redrawActiveTimeline();
    }
});

if (typeof ResizeObserver !== 'undefined') {
    const _ptTimelineResizeObserver = new ResizeObserver(() => {
        if (_timelineState.session) {
            redrawActiveTimeline();
        }
    });
    const wrapInline = document.getElementById('ptTimelineCanvasWrap');
    if (wrapInline) _ptTimelineResizeObserver.observe(wrapInline);
    const wrapModal = document.getElementById('modalTimelineCanvasWrap');
    if (wrapModal) _ptTimelineResizeObserver.observe(wrapModal);
}

