        function updateDbAutosaveStatusLabel() {
            const label = document.getElementById('db-autosave-status-label');
            if (!label) return;

            if (isViewingPastSession) {
                label.textContent = 'Autosave paused in Time Machine view';
                label.classList.add('paused');
                updateDbInteractiveGroupsLabel();
                return;
            }

            if (!selectedGroupName) {
                label.textContent = 'Autosave waiting for class selection';
                label.classList.add('paused');
                updateDbInteractiveGroupsLabel();
                return;
            }

            if (dbAutosaveLastSavedAt) {
                label.textContent = `Last autosave: ${dbAutosaveLastSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
            } else {
                label.textContent = `Autosave active every ${Math.round(DB_AUTOSAVE_INTERVAL_MS / 1000)}s`;
            }

            label.classList.remove('paused');
            updateDbInteractiveGroupsLabel();
        }

        function updateDbInteractiveGroupsLabel() {
            const label = document.getElementById('db-interactive-groups-label');
            if (!label) return;

            const totalGroups = Object.keys(studentGroups || {}).length;
            const interactiveGroups = Object.keys(buildInteractionSnapshot(studentGroups)).length;
            label.textContent = `Interactive classes: ${interactiveGroups}/${totalGroups}`;
        }

        function studentHasInteraction(student) {
            if (!student) return false;
            return (
                student.inExam === true ||
                student.pluses > 0 ||
                student.minuses > 0 ||
                student.isPicked ||
                student.teamId != null ||
                !!student.role ||
                (student.badges && student.badges.length > 0) ||
                (student.comments && student.comments.length > 0)
            );
        }

        function buildInteractionSnapshot(sourceGroups = studentGroups) {
            const snapshot = {};
            Object.keys(sourceGroups || {}).forEach(gName => {
                const groupStudents = sourceGroups[gName] || [];
                if (groupStudents.some(studentHasInteraction) || isExamSessionActive(gName)) {
                    snapshot[gName] = _ensureUniqueStudentSessionIds(JSON.parse(JSON.stringify(groupStudents)));
                }
            });
            return snapshot;
        }

        function sanitizeSessionForInteractionExport(session) {
            if (!session || !session.groups || typeof session.groups !== 'object') return null;

            const filteredGroups = buildInteractionSnapshot(session.groups);
            const activeGroup = session.activeGroup;
            if (!activeGroup || !filteredGroups[activeGroup]) return null;

            const sanitized = JSON.parse(JSON.stringify(session));
            sanitized.groups = filteredGroups;
            return sanitized;
        }

        function _generateUniqueSessionId(existingSessions, baseDate = new Date()) {
            const sessions = Array.isArray(existingSessions) ? existingSessions : (typeof getDb === 'function' ? getDb() : []);
            const seenIds = new Set(sessions.map(s => s && s.id).filter(Boolean));
            let ms = baseDate instanceof Date ? baseDate.getTime() : new Date(baseDate).getTime();
            if (Number.isNaN(ms)) ms = Date.now();
            let candidate = new Date(ms).toISOString();
            while (seenIds.has(candidate)) {
                ms += 1;
                candidate = new Date(ms).toISOString();
            }
            return candidate;
        }

        function buildLiveSessionSnapshot(now = new Date()) {
            if (!selectedGroupName || isViewingPastSession) return null;

            const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isoKey = _generateUniqueSessionId(getDb(), now);

            const snapshot = buildInteractionSnapshot(studentGroups);
            if (!snapshot[selectedGroupName]) return null;

            const activeGroupSnapshot = {
                [selectedGroupName]: JSON.parse(JSON.stringify(snapshot[selectedGroupName]))
            };

            const activeGroupHistory = Array.isArray(sessionHistory)
                ? sessionHistory
                    .filter(entry => entry && entry.group === selectedGroupName)
                    .map(entry => JSON.parse(JSON.stringify(entry)))
                : [];

            const activeGroupTitle = (rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name)
                ? rawMeta[selectedGroupName].name
                : selectedGroupName;

            return {
                id: isoKey,
                date: dateStr,
                time: timeStr,
                activeGroup: selectedGroupName,
                activeGroupTitle: activeGroupTitle,
                isExam: isExamSessionActive(selectedGroupName),
                groups: activeGroupSnapshot,
                lessonObjectives: currentObjectives,
                sessionHistory: activeGroupHistory,
                teamCustomNames: getSessionTeamCustomNames(),
                plannerEntryId: currentPlannerEntryId || '',
                plannerSlot: selectedPlannerSlot ? JSON.parse(JSON.stringify(selectedPlannerSlot)) : null,
                lessonPlanId: (window.CmsLessonRunner && CmsLessonRunner.activePlan) ? CmsLessonRunner.activePlan.id : ''
            };
        }

        function _buildSessionDayKey(session) {
            if (!session || !session.id) return null;
            const dt = new Date(session.id);
            if (Number.isNaN(dt.getTime())) return null;
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function _buildSessionClassDayKey(session) {
            if (!session || !session.activeGroup) return null;
            const dayKey = _buildSessionDayKey(session);
            if (!dayKey) return null;
            return `${String(session.activeGroup)}|${dayKey}`;
        }

        function _dedupeSessionsByClassDay(sessions) {
            const input = Array.isArray(sessions) ? sessions : [];
            const ordered = _sortSessionsNewestFirst(input);
            const seen = new Set();
            const deduped = [];

            ordered.forEach(session => {
                const classDayKey = _buildSessionClassDayKey(session);
                if (classDayKey && seen.has(classDayKey)) return;
                if (classDayKey) seen.add(classDayKey);
                deduped.push(session);
            });

            return deduped;
        }

        function computeDbAutosaveFingerprint() {
            if (!selectedGroupName || isViewingPastSession) return null;
            try {
                return JSON.stringify({
                    activeGroup: selectedGroupName,
                    isExam: isExamSessionActive(selectedGroupName),
                    groups: studentGroups,
                    sessionHistory: typeof sessionHistory !== 'undefined' ? sessionHistory : [],
                    lessonObjectives: currentObjectives,
                    teamCustomNames: getSessionTeamCustomNames(),
                    plannerEntryId: currentPlannerEntryId || '',
                    plannerSlot: selectedPlannerSlot || null
                });
            } catch (e) {
                return null;
            }
        }

        function syncDbAutosaveBaseline() {
            dbAutosaveLastFingerprint = computeDbAutosaveFingerprint() || '';
        }

        let dbAutosaveDebounceTimer = null;
        function queueDbAutosave(trigger = 'change', delayMs = 300) {
            if (dbAutosaveDebounceTimer) clearTimeout(dbAutosaveDebounceTimer);
            dbAutosaveDebounceTimer = setTimeout(() => {
                dbAutosaveDebounceTimer = null;
                autosaveToDb(trigger);
            }, delayMs);
        }

        function autosaveToDb(trigger = 'interval') {
            if (dbAutosaveDebounceTimer) {
                clearTimeout(dbAutosaveDebounceTimer);
                dbAutosaveDebounceTimer = null;
            }
            const fingerprint = computeDbAutosaveFingerprint();
            if (!fingerprint) {
                updateDbAutosaveStatusLabel();
                return false;
            }

            if (fingerprint === dbAutosaveLastFingerprint) return false;

            const now = new Date();
            const sessions = getDb();
            const todayStr = now.toDateString();
            const existingIdx = sessions.findIndex(s => {
                const sDate = new Date(s.id);
                return sDate.toDateString() === todayStr && s.activeGroup === selectedGroupName;
            });

            const hasInteractions = groupHasInteraction(selectedGroupName) || isExamSessionActive(selectedGroupName);

            if (!hasInteractions) {
                if (existingIdx !== -1) {
                    sessions.splice(existingIdx, 1);
                    saveDb(sessions);
                    updateDbSessionCountLabel();
                    dbAutosaveLastFingerprint = fingerprint;
                    dbAutosaveLastSavedAt = now;
                    updateDbAutosaveStatusLabel();
                    if (trigger !== 'interval') {
                        console.info(`[DB autosave] Cleared today's session on ${trigger} (no interactions remaining)`);
                    }
                    return true;
                }
                updateDbAutosaveStatusLabel();
                return false;
            }

            const session = buildLiveSessionSnapshot(now);
            if (!session) return false;

            if (existingIdx !== -1) {
                if (sessions[existingIdx].id) session.id = sessions[existingIdx].id;
                sessions[existingIdx] = session;
            } else {
                sessions.unshift(session);
            }

            saveDb(sessions);
            updateDbSessionCountLabel();
            dbAutosaveLastFingerprint = fingerprint;
            dbAutosaveLastSavedAt = now;
            updateDbAutosaveStatusLabel();

            if (trigger !== 'interval') {
                console.info(`[DB autosave] Saved on ${trigger}`);
            }

            return true;
        }

        function forceSaveCurrentSessionToDb(trigger = 'manual') {
            if (!selectedGroupName || isViewingPastSession) return false;
            if (dbAutosaveDebounceTimer) {
                clearTimeout(dbAutosaveDebounceTimer);
                dbAutosaveDebounceTimer = null;
            }
            const now = new Date();
            const sessions = getDb();
            const todayStr = now.toDateString();
            const existingIdx = sessions.findIndex(s => {
                const sDate = new Date(s.id);
                return sDate.toDateString() === todayStr && s.activeGroup === selectedGroupName;
            });

            const hasInteractions = groupHasInteraction(selectedGroupName) || isExamSessionActive(selectedGroupName);
            if (!hasInteractions) {
                if (existingIdx !== -1) {
                    sessions.splice(existingIdx, 1);
                    saveDb(sessions);
                    updateDbSessionCountLabel();
                    syncDbAutosaveBaseline();
                    updateDbAutosaveStatusLabel();
                    return true;
                }
                updateDbAutosaveStatusLabel();
                return false;
            }

            const session = buildLiveSessionSnapshot(now);
            if (!session) return false;

            if (existingIdx !== -1) {
                if (sessions[existingIdx].id) session.id = sessions[existingIdx].id;
                sessions[existingIdx] = session;
            } else {
                sessions.unshift(session);
            }

            saveDb(sessions);
            updateDbSessionCountLabel();
            syncDbAutosaveBaseline();
            updateDbAutosaveStatusLabel();
            console.info(`[DB forceSave] Saved on ${trigger}`);
            return true;
        }

        function initDbAutosave() {
            if (dbAutosaveInitialized) return;
            dbAutosaveInitialized = true;

            syncDbAutosaveBaseline();
            updateDbAutosaveStatusLabel();

            dbAutosaveIntervalId = window.setInterval(() => {
                autosaveToDb('interval');
            }, DB_AUTOSAVE_INTERVAL_MS);

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) autosaveToDb('visibilitychange');
            });

            window.addEventListener('pagehide', () => {
                saveAllActiveGroupsSilent();
            });

            window.addEventListener('beforeunload', () => {
                saveAllActiveGroupsSilent();
                if (_cmsGradesChannel && typeof _cmsGradesChannel.close === 'function') {
                    try { _cmsGradesChannel.close(); } catch (_) {}
                }
            });
        }

        function getDb() {
            try {
                const raw = localStorage.getItem(DB_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                const sessions = Array.isArray(parsed) ? parsed : [];
                const deduped = _dedupeSessionsByClassDay(sessions);
                if (deduped.length !== sessions.length) {
                    localStorage.setItem(DB_KEY, JSON.stringify(deduped));
                }
                return deduped;
            } catch (e) { return []; }
        }

        function saveDb(sessions) {
            try {
                const deduped = _dedupeSessionsByClassDay(sessions);
                localStorage.setItem(DB_KEY, JSON.stringify(deduped));
                persistDbToDisk(deduped).catch(error => {
                    console.warn('Could not persist DB to disk:', error);
                });
            } catch (e) {
                showToast('Could not save to database: ' + e.message, true);
            }
        }

        function clearDbLocalStorage() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) return;
            showConfirm('Clear all local DB sessions (cms-db) from this browser/app instance?\n\nThis does not delete your config.js file.', function () {
                try {
                    localStorage.removeItem(DB_KEY);
                    dbAutosaveLastSavedAt = null;
                    updateDbSessionCountLabel();
                    updateDbAutosaveStatusLabel();
                    showToast('Local DB cleared.');
                } catch (e) {
                    showToast('Could not clear local DB: ' + e.message, true);
                }
            });
        }

        function buildDbFileContent(sessions) {
            const exportData = Array.isArray(sessions) ? sessions : [];
            const json = JSON.stringify(exportData, null, 2);
            return `window.CMS_DB_EXPORT = ${json};\nwindow.DB_EXPORT = window.CMS_DB_EXPORT;\n`;
        }

        async function persistDbToDisk(sessions) {
            if (!(window.Desktop && Desktop.isElectron())) {
                return null;
            }

            // Group sessions by activeGroup and save each class to its own folder.
            // Folder name = sanitized class name; filename = YYYY-MM-DD_ClassName.js
            // Only include today's sessions — the filename already carries the date prefix.
            const todayStr = new Date().toDateString();
            const byClass = {};
            for (const s of sessions) {
                const group = s.activeGroup;
                if (!group) continue;
                const sDate = new Date(s.id);
                if (Number.isNaN(sDate.getTime()) || sDate.toDateString() !== todayStr) continue;
                if (!byClass[group]) byClass[group] = [];
                byClass[group].push(s);
            }

            const datePrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            const savePromises = Object.entries(byClass).map(([group, classSessions]) => {
                const displayName = (rawMeta[group] && rawMeta[group].name) ? rawMeta[group].name : group;
                const safeGroup = displayName
                    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
                    .replace(/\s+/g, '_')
                    .replace(/^\.+/, '')
                    .trim() || '_class';
                const filename = `${datePrefix}_${safeGroup}.js`;

                // Pre-flight safeguard: Ensure no duplicate session.id and no duplicate student IDs in any class
                const seenBatchSessionIds = new Set();
                const sanitizedClassSessions = (classSessions || []).map(sess => {
                    const sCopy = JSON.parse(JSON.stringify(sess));
                    if (sCopy.groups && typeof sCopy.groups === 'object') {
                        Object.keys(sCopy.groups).forEach(gName => {
                            sCopy.groups[gName] = _ensureUniqueStudentSessionIds(sCopy.groups[gName]);
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

                return Desktop.saveText('groupParticipation', filename, buildDbFileContent(sanitizedClassSessions), safeGroup)
                    .catch(err => console.warn(`Could not save DB for class "${group}":`, err));
            });

            // Clean up any class folders where today's session was cleared/deleted
            const allKnownGroups = new Set([
                ...Object.keys(studentGroups || {}),
                ...Object.keys(rawMeta || {})
            ]);

            allKnownGroups.forEach(group => {
                if (!byClass[group]) {
                    const displayName = (rawMeta[group] && rawMeta[group].name) ? rawMeta[group].name : group;
                    const safeGroup = displayName
                        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
                        .replace(/\s+/g, '_')
                        .replace(/^\.+/, '')
                        .trim() || '_class';
                    const filename = `${datePrefix}_${safeGroup}.js`;
                    const relPath = `${safeGroup}/${filename}`;
                    if (typeof Desktop.deleteByPath === 'function') {
                        savePromises.push(
                            Desktop.deleteByPath('groupParticipation', relPath, { force: true })
                                .catch(() => {})
                        );
                    }
                }
            });

            return Promise.all(savePromises).then(results => {
                if (typeof BroadcastChannel !== 'undefined') {
                    try {
                        const ptCh = new BroadcastChannel('cmt-participation');
                        ptCh.postMessage({
                            action: 'participation-updated',
                            groups: Object.keys(byClass),
                            timestamp: Date.now()
                        });
                        ptCh.close();
                    } catch (_) {}
                }
                return results;
            });
        }

        function hydrateLiveStateFromLatestTodaySession() {
            if (isViewingPastSession) return false;

            const groupNames = Object.keys(studentGroups || {});
            if (groupNames.length === 0) return false;

            const todayStr = new Date().toDateString();
            const todaySessions = getDb()
                .filter(s => {
                    if (!s || !s.id || !s.groups) return false;
                    const sDate = new Date(s.id);
                    return !Number.isNaN(sDate.getTime()) && sDate.toDateString() === todayStr;
                })
                .sort((a, b) => new Date(b.id) - new Date(a.id));

            if (todaySessions.length === 0) return false;

            let restoredGroups = 0;
            groupNames.forEach(groupName => {
                const source = todaySessions.find(s => s.groups && Array.isArray(s.groups[groupName]));
                if (!source) return;
                studentGroups[groupName] = JSON.parse(JSON.stringify(source.groups[groupName]));
                if (source.isExam || studentGroups[groupName].every(s => s.inExam === true)) {
                    groupExamModes[groupName] = true;
                }
                restoredGroups++;
            });

            if (typeof sessionHistory !== 'undefined') {
                const mergedHistory = [];
                const seenGroups = new Set();
                todaySessions.forEach(s => {
                    if (!s || !Array.isArray(s.sessionHistory)) return;
                    const gKey = s.activeGroup || '';
                    if (gKey && seenGroups.has(gKey)) return;
                    if (gKey) seenGroups.add(gKey);
                    s.sessionHistory.forEach(entry => {
                        if (entry) mergedHistory.push(JSON.parse(JSON.stringify(entry)));
                    });
                });
                if (mergedHistory.length > 0) {
                    sessionHistory = mergedHistory;
                    if (typeof renderHistoryList === 'function') renderHistoryList();
                }
            }

            const activeTodaySession = todaySessions.find(s => s && s.activeGroup === selectedGroupName);
            if (activeTodaySession) {
                if (activeTodaySession.plannerEntryId && !currentPlannerEntryId) {
                    currentPlannerEntryId = activeTodaySession.plannerEntryId;
                }
                if (activeTodaySession.plannerSlot && !selectedPlannerSlot) {
                    selectedPlannerSlot = JSON.parse(JSON.stringify(activeTodaySession.plannerSlot));
                }
            }

            const latestObjectivesSession = todaySessions.find(s => typeof (s && (s.lessonObjectives ?? s.objectives)) === 'string');
            if (latestObjectivesSession) {
                restoreObjectivesFromSession(latestObjectivesSession);
            }

            const latestTeamNamesSession = todaySessions.find(s => s && s.teamCustomNames);
            if (latestTeamNamesSession && latestTeamNamesSession.teamCustomNames) {
                applySessionTeamCustomNames(latestTeamNamesSession.teamCustomNames);
            }

            if (restoredGroups === 0) return false;

            if (selectedGroupName && studentGroups[selectedGroupName]) {
                currentTeamsActive = studentGroups[selectedGroupName].some(s => s.teamId != null);
                updateUtilityButtons();
                updateExamSessionBanner();
                renderRoster();
                renderRanking();
            }

            console.info(`[DB] Restored today's live data for ${restoredGroups} group(s).`);
            return true;
        }

        function saveToDb() {
            if (!selectedGroupName) {
                showToast('Please select a group first before saving.');
                return;
            }

            if (!groupHasInteraction(selectedGroupName) && !isExamSessionActive(selectedGroupName)) {
                showToast('This class has no interactions yet, so it was not saved.');
                return;
            }

            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Save only groups with interactions
            const snapshot = buildInteractionSnapshot(studentGroups);
            if (!snapshot[selectedGroupName]) {
                showToast('This class has no interactions yet, so it was not saved.');
                return;
            }

            const sessions = getDb();
            // Check if same group was already saved today (same calendar day)
            const todayStr = now.toDateString();
            const existingIdx = sessions.findIndex(s => {
                const sDate = new Date(s.id);
                return sDate.toDateString() === todayStr && s.activeGroup === selectedGroupName;
            });
            const isoKey = _generateUniqueSessionId(sessions, now);

            const existingSession = existingIdx !== -1 ? sessions[existingIdx] : null;
            const targetHistory = (Array.isArray(sessionHistory) && selectedGroupName)
                ? sessionHistory.filter(e => e && e.group === selectedGroupName).map(e => JSON.parse(JSON.stringify(e)))
                : [];

            const session = {
                id: isoKey,
                date: dateStr,
                time: (existingSession && existingSession.time) ? existingSession.time : timeStr,
                activeGroup: selectedGroupName,
                isExam: isExamSessionActive(selectedGroupName),
                groups: snapshot,
                lessonObjectives: currentObjectives,
                sessionHistory: targetHistory,
                teamCustomNames: getSessionTeamCustomNames(),
                plannerEntryId: currentPlannerEntryId || (existingSession ? existingSession.plannerEntryId || '' : ''),
                plannerSlot: selectedPlannerSlot ? JSON.parse(JSON.stringify(selectedPlannerSlot)) : (existingSession ? existingSession.plannerSlot || null : null),
                lessonPlanId: (window.CmsLessonRunner && CmsLessonRunner.activePlan) ? CmsLessonRunner.activePlan.id : (existingSession ? existingSession.lessonPlanId || '' : '')
            };

            if (existingIdx !== -1) {
                sessions[existingIdx] = session;
            } else {
                sessions.unshift(session);
            }

            saveDb(sessions);

            // Visual feedback on button
            const btn = document.querySelector('.db-popup-btn-save');
            if (btn) {
                const strong = btn.querySelector('strong');
                const small = btn.querySelector('small');
                const origText = strong ? strong.textContent : '';
                btn.classList.add('just-saved');
                if (strong) strong.textContent = '✓ Saved!';
                if (small) small.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setTimeout(() => {
                    btn.classList.remove('just-saved');
                    if (strong) strong.textContent = origText;
                    if (small) small.textContent = 'Snapshot today\'s class state';
                }, 2500);
            }
            updateDbSessionCountLabel();
            syncDbAutosaveBaseline();
        }

        function groupHasInteraction(gName) {
            if (isExamSessionActive(gName)) return true;
            const students = studentGroups[gName] || [];
            return students.some(studentHasInteraction);
        }

        function saveAllToDb() {
            const allGroups = Object.keys(studentGroups);
            if (allGroups.length === 0) {
                showToast('No groups found to save.');
                return;
            }

            const snapshot = buildInteractionSnapshot(studentGroups);
            const groupsToSave = Object.keys(snapshot);
            const skippedCount = allGroups.length - groupsToSave.length;

            if (groupsToSave.length === 0) {
                showToast('No classes have any interactions to save yet.');
                return;
            }

            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const todayStr = now.toDateString();

            // Shared filtered snapshot: only groups with interactions

            const sessions = getDb();
            let savedCount = 0;
            let overwrittenCount = 0;

            groupsToSave.forEach((gName, i) => {
                // Stagger ISO key and de-collide against all sessions
                const targetDate = new Date(now.getTime() + i);
                const isoKey = _generateUniqueSessionId(sessions, targetDate);

                const existingIdx = sessions.findIndex(s => {
                    const sDate = new Date(s.id);
                    return sDate.toDateString() === todayStr && s.activeGroup === gName;
                });

                const existingSession = existingIdx !== -1 ? sessions[existingIdx] : null;
                const groupHistory = (Array.isArray(sessionHistory) && gName)
                    ? sessionHistory.filter(e => e && e.group === gName).map(e => JSON.parse(JSON.stringify(e)))
                    : [];

                const session = {
                    id: isoKey,
                    date: dateStr,
                    time: (existingSession && existingSession.time) ? existingSession.time : timeStr,
                    activeGroup: gName,
                    isExam: isExamSessionActive(gName),
                    groups: snapshot,
                    lessonObjectives: currentObjectives,
                    sessionHistory: groupHistory,
                    teamCustomNames: getSessionTeamCustomNames(),
                    plannerEntryId: gName === selectedGroupName ? (currentPlannerEntryId || '') : (existingSession ? existingSession.plannerEntryId || '' : ''),
                    plannerSlot: gName === selectedGroupName ? (selectedPlannerSlot ? JSON.parse(JSON.stringify(selectedPlannerSlot)) : null) : (existingSession ? existingSession.plannerSlot || null : null),
                    lessonPlanId: gName === selectedGroupName ? ((window.CmsLessonRunner && CmsLessonRunner.activePlan) ? CmsLessonRunner.activePlan.id : '') : (existingSession ? existingSession.lessonPlanId || '' : '')
                };

                if (existingIdx !== -1) {
                    sessions[existingIdx] = session;
                    overwrittenCount++;
                } else {
                    sessions.unshift(session);
                    savedCount++;
                }
            });

            saveDb(sessions);

            // Visual feedback
            const btn = document.querySelector('.db-popup-btn-save-all');
            const label = document.getElementById('save-all-classes-label');
            if (btn) {
                const strong = btn.querySelector('strong');
                btn.classList.add('just-saved');
                const skippedNote = skippedCount > 0 ? ` (${skippedCount} skipped)` : '';
                if (strong) strong.textContent = `✓ ${groupsToSave.length} classes saved!`;
                if (label) label.textContent = `${savedCount} new · ${overwrittenCount} updated${skippedNote}`;
                setTimeout(() => {
                    btn.classList.remove('just-saved');
                    if (strong) strong.textContent = 'Save Active Classes';
                    if (label) label.textContent = 'Snapshot only groups with interactions';
                }, 3000);
            }
            updateDbSessionCountLabel();
            syncDbAutosaveBaseline();
        }

        // Silently save every group that has interactions — used on beforeunload/pagehide
        // so all active classes are snapshotted, not just the currently selected one.
        function saveAllActiveGroupsSilent() {
            if (!studentGroups) return;
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const todayStr = now.toDateString();
            const sessions = getDb();
            let changed = false;

            Object.keys(studentGroups).forEach((gName, i) => {
                const groupStudents = studentGroups[gName] || [];
                const hasInteractions = groupStudents.some(studentHasInteraction) || isExamSessionActive(gName);

                const existingIdx = sessions.findIndex(s => {
                    const sDate = new Date(s.id);
                    return sDate.toDateString() === todayStr && s.activeGroup === gName;
                });

                if (!hasInteractions) {
                    if (existingIdx !== -1) {
                        sessions.splice(existingIdx, 1);
                        changed = true;
                    }
                    return;
                }

                const existingSession = existingIdx !== -1 ? sessions[existingIdx] : null;
                const targetDate = new Date(now.getTime() + i);
                const isoKey = _generateUniqueSessionId(sessions, targetDate);
                const groupHistory = (Array.isArray(sessionHistory) && gName)
                    ? sessionHistory.filter(e => e && e.group === gName).map(e => JSON.parse(JSON.stringify(e)))
                    : [];

                const existingObjectives = existingIdx !== -1 ? (sessions[existingIdx].lessonObjectives || '') : '';
                const existingTeamNames = existingIdx !== -1 ? sessions[existingIdx].teamCustomNames : null;
                const activeTeamNames = getSessionTeamCustomNames();
                const sessionTeamNames = gName === selectedGroupName ? activeTeamNames : (existingTeamNames || activeTeamNames);

                const session = {
                    id: existingIdx !== -1 ? sessions[existingIdx].id : isoKey,
                    date: dateStr,
                    time: (existingSession && existingSession.time) ? existingSession.time : timeStr,
                    activeGroup: gName,
                    isExam: isExamSessionActive(gName),
                    groups: { [gName]: _ensureUniqueStudentSessionIds(JSON.parse(JSON.stringify(groupStudents))) },
                    lessonObjectives: gName === selectedGroupName ? currentObjectives : existingObjectives,
                    sessionHistory: groupHistory,
                    ...(sessionTeamNames ? { teamCustomNames: sessionTeamNames } : {}),
                    plannerEntryId: gName === selectedGroupName ? (currentPlannerEntryId || '') : (existingIdx !== -1 ? sessions[existingIdx].plannerEntryId || '' : ''),
                    plannerSlot: gName === selectedGroupName ? (selectedPlannerSlot ? JSON.parse(JSON.stringify(selectedPlannerSlot)) : null) : (existingIdx !== -1 ? sessions[existingIdx].plannerSlot || null : null),
                    lessonPlanId: gName === selectedGroupName ? ((window.CmsLessonRunner && CmsLessonRunner.activePlan) ? CmsLessonRunner.activePlan.id : '') : (existingIdx !== -1 ? sessions[existingIdx].lessonPlanId || '' : '')
                };

                if (existingIdx !== -1) {
                    sessions[existingIdx] = session;
                } else {
                    sessions.unshift(session);
                }
                changed = true;
            });

            if (changed) saveDb(sessions);
        }

        async function _loadLogDbSessions() {
            if (!(window.Desktop && Desktop.isElectron())) {
                return [];
            }

            try {
                const listed = await Desktop.listByPath('groupParticipation', '.', {
                    extensions: ['.js', '.json', '.txt'],
                    recursive: true
                });

                const files = Array.isArray(listed && listed.files) ? listed.files : [];
                const out = [];

                for (const file of files) {
                    const relativePath = String(file && file.relativePath ? file.relativePath : '').trim();
                    if (!relativePath) continue;
                    if (relativePath.includes('pt-deleted') || relativePath.includes('pt-rules') || relativePath.includes('pt-notes') || relativePath.includes('pt-presets')) continue;

                    try {
                        const readResult = await Desktop.readByPath('groupParticipation', relativePath, { encoding: 'utf8' });
                        const text = String(readResult && readResult.content ? readResult.content : '');
                        const parsed = _parseDbText(text);
                        if (!Array.isArray(parsed)) continue;

                        parsed.forEach(session => {
                            out.push({
                                ...session,
                                _tmSource: 'log',
                                _tmSourcePath: relativePath
                            });
                        });
                    } catch (_) {
                        // Ignore non-session files in the log tree.
                    }
                }

                return out;
            } catch (error) {
                console.warn('Could not load log sessions for Time Machine:', error);
                return [];
            }
        }

        async function getTimeMachineSessions({ forceRefresh = false, includeArchived = false } = {}) {
            const localSessions = getDb().map(session => ({ ...session, _tmSource: 'local' }));
            let results = [];

            if (!(window.Desktop && Desktop.isElectron())) {
                timeMachineSessionsCache = _dedupeSessionsByClassDay(_sortSessionsNewestFirst(localSessions));
                results = timeMachineSessionsCache;
            } else if (!forceRefresh && timeMachineSessionsCache.length > 0) {
                results = timeMachineSessionsCache;
            } else {
                const logSessions = await _loadLogDbSessions();
                // logSessions go first so they win dedup and keep the 'log' tag.
                // Sessions only in localStorage (not yet on disk) appear second and keep 'local'.
                let merged = _mergeSessionsById(logSessions, localSessions);

                try {
                    const tomb = await Desktop.readText('groupParticipation', 'pt-deleted.js');
                    if (tomb?.ok && tomb.content) {
                        const m = tomb.content.match(/window\.CMS_DELETED_SESSIONS\s*=\s*(\[[\s\S]*?\]);?/);
                        if (m) {
                            const deletedIds = new Set(JSON.parse(m[1]));
                            if (deletedIds.size > 0) {
                                merged = merged.filter(s => !s || !s.id || !deletedIds.has(s.id));
                            }
                        }
                    }
                } catch (e) {}

                timeMachineSessionsCache = merged;
                results = merged;
            }

            if (!includeArchived) {
                results = results.filter(s => !s || !s.activeGroup || !(rawMeta[s.activeGroup] && rawMeta[s.activeGroup].archived));
            }

            return results;
        }

        async function openTimeMachine() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) return;
            const modal = document.getElementById('time-machine-modal');
            if (!modal) return;
            await renderTimeMachineSessions();
            modal.style.display = 'flex';
        }

        function closeTimeMachine() {
            const modal = document.getElementById('time-machine-modal');
            if (modal) modal.style.display = 'none';
        }

        async function renderTimeMachineSessions() {
            const container = document.getElementById('tm-sessions-container');
            container.innerHTML = '<div class="tm-empty">Loading sessions…</div>';

            const sessions = await getTimeMachineSessions({ forceRefresh: true });

            if (sessions.length === 0) {
                container.innerHTML = '<div class="tm-empty">No saved sessions yet.<br>Use Save to DB to record a session.</div>';
                return;
            }

            // Update viewing banner
            const banner = document.getElementById('tm-viewing-banner');
            if (isViewingPastSession) {
                banner.style.display = 'flex';
            } else {
                banner.style.display = 'none';
            }

            let html = '<ul class="tm-sessions-list">';
            sessions.forEach((s, i) => {
                const groupRows = s && s.groups && s.activeGroup && Array.isArray(s.groups[s.activeGroup])
                    ? s.groups[s.activeGroup]
                    : [];
                const studentCount = groupRows.length;
                const scoredCount = groupRows.filter(st => st.pluses > 0 || st.minuses > 0).length;
                const isActive = isViewingPastSession && liveStudentGroups && sessions[i].id === (liveStudentGroups._viewingId || '');
                const sourceLabel = s._tmSource === 'log' ? 'Log' : 'Local DB';
                const canDelete = s._tmSource === 'local';
                const groupTitle = (rawMeta[s.activeGroup] && rawMeta[s.activeGroup].name)
                    ? rawMeta[s.activeGroup].name
                    : (s.activeGroupTitle || s.groupTitle || s.name || s.activeGroup);

                html += `
            <li class="tm-session-item ${isActive ? 'active' : ''}">
                <div style="flex:1;min-width:0;">
                    <div class="tm-session-date">${s.date} — ${s.time}</div>
                    <div class="tm-session-meta">
                        Group: <strong>${groupTitle}</strong> &nbsp;|&nbsp;
                        ${studentCount} students &nbsp;|&nbsp;
                        ${scoredCount} scored &nbsp;|&nbsp;
                        Source: <strong>${sourceLabel}</strong>
                        ${s.plannerEntryId ? ` &nbsp;|&nbsp; Event: <strong>${escapeHtml(s.plannerEntryId)}</strong>` : ''}
                    </div>
                </div>
                <div class="tm-session-actions">
                    <button class="tm-btn-load" onclick="loadTimeMachineSession(${i})">👁 View</button>
                    <button class="tm-btn-apply" onclick="applyTimeMachineToNow(${i}, event)">✔ Apply to Now</button>
                    <button class="tm-btn-delete" onclick="deleteTimeMachineSession(${i}, event)" ${canDelete ? '' : 'disabled title="Log sessions are read-only in Time Machine"'}><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
                </div>
            </li>`;
            });
            html += '</ul>';
            container.innerHTML = html;
        }

        function loadTimeMachineSession(index) {
            const sessions = Array.isArray(timeMachineSessionsCache) ? timeMachineSessionsCache : [];
            const session = sessions[index];
            if (!session) return;

            // Backup live state if not already in time machine mode
            if (!isViewingPastSession) {
                liveStudentGroups = {
                    _backup: JSON.parse(JSON.stringify(studentGroups)),
                    _activeGroup: selectedGroupName,
                    _objectives: currentObjectives,
                    _plannerEntryId: currentPlannerEntryId,
                    _groupExamModes: { ...groupExamModes },
                    _viewingId: session.id
                };
            } else {
                liveStudentGroups._viewingId = session.id;
            }

            isViewingPastSession = true;
            if (session.plannerEntryId) {
                currentPlannerEntryId = session.plannerEntryId;
            }

            // Load the snapshot
            studentGroups = {};
            Object.keys(session.groups).forEach(gName => {
                studentGroups[gName] = session.groups[gName];
            });

            // Re-select the group from the snapshot
            selectedGroupName = session.activeGroup;
            groupExamModes[session.activeGroup] = !!session.isExam;

            // Restore objectives from this session
            restoreObjectivesFromSession(session);

            // Update UI
            closeTimeMachine();

            // Re-render group buttons
            const gc = document.getElementById('group-container');
            gc.innerHTML = '';
            Object.keys(studentGroups).forEach(groupName => {
                const btn = document.createElement('button');
                btn.className = 'btn-group';
                btn.textContent = (rawMeta[groupName] && rawMeta[groupName].name) ? rawMeta[groupName].name : groupName;
                if (groupName === selectedGroupName) btn.classList.add('active');
                btn.onclick = function () {
                    selectedGroupName = groupName;
                    document.querySelectorAll('.btn-group').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderRoster();
                    renderRanking();
                };
                gc.appendChild(btn);
            });

            updateUtilityButtons();
            renderRoster();
            renderRanking();

            // Show banner
            showTimeMachineViewingBanner(session.date + ' at ' + session.time);
            updateDbAutosaveStatusLabel();
        }

        function showTimeMachineViewingBanner(label) {
            // Insert a banner below the title
            let banner = document.getElementById('tm-live-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'tm-live-banner';
                banner.style.cssText = 'background:#5a2d82;color:#fff;padding:8px 16px;border-radius:5px;font-size:0.8rem;font-weight:700;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;';
                const headerContainer = document.querySelector('.header-container') || document.querySelector('.main-wrapper');
                if (headerContainer && headerContainer.parentNode) {
                    headerContainer.parentNode.insertBefore(banner, headerContainer);
                }
            }
            banner.innerHTML = `
        <span>⏪ TIME MACHINE — Viewing session: ${label} <span class="tm-readonly-badge">Read Only</span></span>
        <button onclick="exitTimeMachineView()" style="background:#fff;color:#5a2d82;border:2px solid #fff;border-radius:4px;padding:3px 10px;font-size:0.7rem;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">✕ Return to Live</button>
    `;
            banner.style.display = 'flex';
        }

        function exitTimeMachineView() {
            if (!isViewingPastSession || !liveStudentGroups) return;

            isViewingPastSession = false;

            // Restore live state
            studentGroups = liveStudentGroups._backup;
            selectedGroupName = liveStudentGroups._activeGroup;
            currentObjectives = liveStudentGroups._objectives || '';
            currentPlannerEntryId = liveStudentGroups._plannerEntryId || '';
            groupExamModes = liveStudentGroups._groupExamModes || {};
            liveStudentGroups = null;
            updateExamSessionBanner();

            // Re-render group buttons
            const gc = document.getElementById('group-container');
            gc.innerHTML = '';
            Object.keys(studentGroups).forEach(groupName => {
                const btn = document.createElement('button');
                btn.className = 'btn-group';
                btn.textContent = (rawMeta[groupName] && rawMeta[groupName].name) ? rawMeta[groupName].name : groupName;
                if (groupName === selectedGroupName) btn.classList.add('active');
                btn.onclick = function () {
                    selectedGroupName = groupName;
                    document.querySelectorAll('.btn-group').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderRoster();
                    renderRanking();
                };
                gc.appendChild(btn);
            });

            // Remove viewing banner
            const banner = document.getElementById('tm-live-banner');
            if (banner) banner.style.display = 'none';

            // Close TM modal if open
            document.getElementById('time-machine-modal').style.display = 'none';

            if (selectedGroupName) {
                updateObjectivesDisplay();
                updateUtilityButtons();
                renderRoster();
                renderRanking();
            }

            updateDbAutosaveStatusLabel();
        }

        function applyTimeMachineToNow(index, e) {
            if (e) e.stopPropagation();
            const sessions = Array.isArray(timeMachineSessionsCache) ? timeMachineSessionsCache : [];
            const session = sessions[index];
            if (!session) return;

            // The live groups to update: if we're currently in time-machine view mode,
            // write into the backed-up live state; otherwise write directly.
            const targetGroups = isViewingPastSession ? liveStudentGroups._backup : studentGroups;

            // Count how many groups from the snapshot exist in the live state
            const matchingGroups = Object.keys(session.groups).filter(g => targetGroups[g]);
            if (matchingGroups.length === 0) {
                showToast('No matching groups found in the current session.\nThe saved snapshot belongs to a different class.');
                return;
            }

            const groupList = matchingGroups.join(', ');
            showConfirm(
                `Apply scores & badges from "${session.date} at ${session.time}" to the live session?\n\nAffected groups: ${groupList}\n\nExisting scores and badges will be overwritten.`,
                function () {
                    matchingGroups.forEach(gName => {
                        const srcStudents = session.groups[gName];
                        const dstStudents = targetGroups[gName];
                        srcStudents.forEach(src => {
                            const dst = dstStudents.find(s => s.name === src.name);
                            if (!dst) return;
                            dst.pluses = src.pluses || 0;
                            dst.minuses = src.minuses || 0;
                            dst.teamPluses = src.teamPluses || 0;
                            dst.teamMinuses = src.teamMinuses || 0;
                            dst.badges = src.badges ? JSON.parse(JSON.stringify(src.badges)) : [];
                            dst.plusHistory = src.plusHistory ? JSON.parse(JSON.stringify(src.plusHistory)) : [];
                            dst.minusHistory = src.minusHistory ? JSON.parse(JSON.stringify(src.minusHistory)) : [];
                            dst.teamPlusHistory = src.teamPlusHistory ? JSON.parse(JSON.stringify(src.teamPlusHistory)) : [];
                            dst.teamMinusHistory = src.teamMinusHistory ? JSON.parse(JSON.stringify(src.teamMinusHistory)) : [];
                        });
                    });

                    // If we were in time-machine view, exit back to live and show the applied data
                    if (isViewingPastSession) {
                        isViewingPastSession = false;
                        studentGroups = liveStudentGroups._backup;
                        selectedGroupName = liveStudentGroups._activeGroup;
                        liveStudentGroups = null;

                        const gc = document.getElementById('group-container');
                        gc.innerHTML = '';
                        Object.keys(studentGroups).forEach(groupName => {
                            const btn = document.createElement('button');
                            btn.className = 'btn-group';
                            btn.textContent = groupName;
                            if (groupName === selectedGroupName) btn.classList.add('active');
                            btn.onclick = function () {
                                selectedGroupName = groupName;
                                document.querySelectorAll('.btn-group').forEach(b => b.classList.remove('active'));
                                btn.classList.add('active');
                                renderRoster();
                                renderRanking();
                            };
                            gc.appendChild(btn);
                        });

                        const banner = document.getElementById('tm-live-banner');
                        if (banner) banner.style.display = 'none';
                        updateDbAutosaveStatusLabel();
                    }

                    document.getElementById('time-machine-modal').style.display = 'none';
                    if (selectedGroupName) {
                        updateUtilityButtons();
                        renderRoster();
                        renderRanking();
                    }
                }
            );
        }

        function deleteTimeMachineSession(index, e) {
            e.stopPropagation();

            const visibleSessions = Array.isArray(timeMachineSessionsCache) ? timeMachineSessionsCache : [];
            const s = visibleSessions[index];
            if (!s) return;

            if (s._tmSource !== 'local') {
                showToast('This session comes from log storage and is read-only in Time Machine.\n\nDelete it directly from the log folder if needed.');
                return;
            }

            const localSessions = getDb();
            const localIndex = localSessions.findIndex(item => String(item && item.id) === String(s.id));
            if (localIndex === -1) {
                showToast('This session is no longer present in local DB.');
                return;
            }

            showConfirm(`Delete session "${s.date} at ${s.time}" for ${s.activeGroup}?`, function () {
                localSessions.splice(localIndex, 1);
                saveDb(localSessions);
                renderTimeMachineSessions();
            });
        }

        // On page load, check for saved DB and notify user
        (async function () {
            if (window.Desktop && Desktop.isElectron && Desktop.isElectron()) {
                try {
                    const diskSessions = await _loadLogDbSessions();
                    if (diskSessions.length > 0) {
                        const localSessions = getDb();
                        // Disk is ground truth — pass as base so it wins on same class+day
                        const merged = _mergeSessionsById(diskSessions, localSessions);
                        // Strip display-only annotations before storing
                        const cleaned = merged.map(({ _tmSource, _tmSourcePath, ...s }) => s);
                        try { localStorage.setItem(DB_KEY, JSON.stringify(cleaned)); } catch (e) { }
                    }
                } catch (e) {
                    console.warn('[DB startup] Could not load disk sessions:', e);
                }
            }
            updateDbSessionCountLabel();
            hydrateLiveStateFromLatestTodaySession();
            initDbAutosave();
        })();

        function updateDbSessionCountLabel() {
            const sessions = getDb();
            const label = document.getElementById('db-session-count-label');
            if (label) {
                label.textContent = sessions.length === 0
                    ? 'No sessions saved yet'
                    : `${sessions.length} session${sessions.length > 1 ? 's' : ''} saved`;
            }
            updateDbInteractiveGroupsLabel();
        }

        function toggleDbPopup() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) return;
            const popup = document.getElementById('db-hub-popup');
            const btn = document.getElementById('db-hub-btn');
            if (!popup || !btn) return;
            const isOpen = popup.classList.contains('open');
            if (isOpen) {
                popup.classList.remove('open');
                btn.classList.remove('active');
            } else {
                closeSettingsPopup();
                updateDbSessionCountLabel();
                updateDbAutosaveStatusLabel();
                popup.classList.add('open');
                btn.classList.add('active');
            }
        }

        function closeDbPopup() {
            const popup = document.getElementById('db-hub-popup');
            const btn = document.getElementById('db-hub-btn');
            if (popup) popup.classList.remove('open');
            if (btn) btn.classList.remove('active');
        }

        function toggleLinksPopup(event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            const wrap = document.getElementById('app-hamburger');
            if (wrap) {
                const isOpen = wrap.classList.contains('open');
                if (isOpen) {
                    closeLinksPopup();
                } else {
                    closeDbPopup();
                    closeSettingsPopup();
                    wrap.classList.add('open');
                }
            }
        }

        function closeLinksPopup() {
            const wrap = document.getElementById('app-hamburger');
            if (wrap) wrap.classList.remove('open');
        }

        function openAppLink(pageFile) {
            closeLinksPopup();
            if (window.Desktop && Desktop.isElectron()) {
                Desktop.openTool(pageFile);
            } else {
                window.open(pageFile, '_blank');
            }
        }

        function savePlanAbbrevLenSetting(value) {
            const n = parseInt(value, 10);
            if (Number.isFinite(n) && n >= 1 && n <= 20) planAbbrevLen = n;
            if (!PRESENTATION_MODE) _broadcastPresentationState();
            persistSettingsToUserFile().catch(err => console.warn('savePlanAbbrevLenSetting: could not save config:', err));
        }

        function getDisplayName(student) {
            if (!student) return '';
            const rosterStudent = (student.uuid && studentRoster[student.uuid]) ? studentRoster[student.uuid] : student;
            if (window.StudentNameUtils && typeof StudentNameUtils.formatStudentDisplayName === 'function') {
                const formatted = StudentNameUtils.formatStudentDisplayName(rosterStudent, nameDisplayMode, 'firstLastInitial');
                if (formatted) return formatted;
            }
            const name = student.name || ((rosterStudent.firstName || '') + ' ' + (rosterStudent.lastName || '')).trim() || '';
            if (nameDisplayMode === 'custom') {
                return (rosterStudent && rosterStudent.customName) ? rosterStudent.customName : name;
            }
            if (nameDisplayMode === 'first') {
                if (rosterStudent && rosterStudent.firstName) return rosterStudent.firstName;
                const sp = name.indexOf(' ');
                return sp > 0 ? name.slice(0, sp) : name;
            }
            if (nameDisplayMode === 'last') {
                if (rosterStudent && rosterStudent.lastName) return rosterStudent.lastName;
                const sp = name.lastIndexOf(' ');
                return sp > 0 ? name.slice(sp + 1) : name;
            }
            return name;
        }

        function saveNameDisplayMode(value) {
            if (['full', 'first', 'last', 'custom'].includes(value)) nameDisplayMode = value;
            renderRoster();
            renderRanking();
            if (!PRESENTATION_MODE) _broadcastPresentationState();
            persistSettingsToUserFile().catch(err => console.warn('saveNameDisplayMode: could not save config:', err));
        }

        function getStudentSortNames(student) {
            if (!student) return { first: '', last: '', full: '' };
            const rosterStudent = (student.uuid && studentRoster[student.uuid]) ? studentRoster[student.uuid] : student;
            let fn = String(rosterStudent.firstName || student.firstName || '').trim();
            let ln = String(rosterStudent.lastName || student.lastName || '').trim();
            const fullName = String(student.name || rosterStudent.name || (fn + ' ' + ln).trim() || '').trim();

            if (!fn && !ln && fullName) {
                const spaceIdx = fullName.indexOf(' ');
                if (spaceIdx !== -1) {
                    fn = fullName.slice(0, spaceIdx).trim();
                    ln = fullName.slice(spaceIdx + 1).trim();
                } else {
                    fn = fullName;
                }
            }
            return {
                first: fn || fullName,
                last: ln || fn || fullName,
                full: fullName
            };
        }

        function compareStudentsByName(a, b) {
            const namesA = getStudentSortNames(a);
            const namesB = getStudentSortNames(b);

            if (rosterSortOrder === 'last') {
                const cmpLast = namesA.last.localeCompare(namesB.last, undefined, { sensitivity: 'base' });
                if (cmpLast !== 0) return cmpLast;
                const cmpFirst = namesA.first.localeCompare(namesB.first, undefined, { sensitivity: 'base' });
                if (cmpFirst !== 0) return cmpFirst;
                return namesA.full.localeCompare(namesB.full, undefined, { sensitivity: 'base' });
            } else {
                const cmpFirst = namesA.first.localeCompare(namesB.first, undefined, { sensitivity: 'base' });
                if (cmpFirst !== 0) return cmpFirst;
                const cmpLast = namesA.last.localeCompare(namesB.last, undefined, { sensitivity: 'base' });
                if (cmpLast !== 0) return cmpLast;
                return namesA.full.localeCompare(namesB.full, undefined, { sensitivity: 'base' });
            }
        }

        function setRosterSortOrder(value, persist = true) {
            if (['first', 'last'].includes(value)) {
                rosterSortOrder = value;
            }
            _syncRosterSortOrderInputs();
            renderRoster();
            renderRanking();
            if (persist) {
                try { localStorage.setItem('cms-roster-sort-order', rosterSortOrder); } catch (_) { }
                if (!PRESENTATION_MODE) _broadcastPresentationState();
                persistSettingsToUserFile().catch(err => console.warn('setRosterSortOrder: could not save config:', err));
            }
        }

        function _syncRosterSortOrderInputs() {
            const radios = document.querySelectorAll('input[name="rosterSortOrderRadio"]');
            radios.forEach(r => {
                r.checked = (r.value === rosterSortOrder);
            });

            const btnFirst = document.getElementById('rsp-sort-first-btn');
            const btnLast = document.getElementById('rsp-sort-last-btn');
            if (btnFirst) {
                btnFirst.classList.toggle('active', rosterSortOrder === 'first');
                btnFirst.classList.toggle('is-off', rosterSortOrder !== 'first');
            }
            if (btnLast) {
                btnLast.classList.toggle('active', rosterSortOrder === 'last');
                btnLast.classList.toggle('is-off', rosterSortOrder !== 'last');
            }
        }

        function setLessonRunnerLayout(value, persist = true) {
            if (!['compact', 'collapsible', 'single'].includes(value)) value = 'compact';
            lessonRunnerLayout = value;

            const container = document.getElementById('cms-lesson-runner-container');
            if (container) {
                container.classList.remove('cms-lr-mode-compact', 'cms-lr-mode-collapsible', 'cms-lr-mode-single');
                container.classList.add('cms-lr-mode-' + value);
                if (container.style.display !== 'none') {
                    container.style.display = '';
                }
            }

            // Sync settings-popup radio inputs
            const radios = document.querySelectorAll('input[name="lessonRunnerLayoutMode"]');
            radios.forEach(r => {
                r.checked = (r.value === value);
            });

            // Sync roster-settings-popup buttons
            const btnCompact = document.getElementById('rsp-lr-compact-btn');
            const btnCollapsible = document.getElementById('rsp-lr-collapsible-btn');
            const btnSingle = document.getElementById('rsp-lr-single-btn');
            if (btnCompact) btnCompact.classList.toggle('active', value === 'compact');
            if (btnCollapsible) btnCollapsible.classList.toggle('active', value === 'collapsible');
            if (btnSingle) btnSingle.classList.toggle('active', value === 'single');

            if (persist) {
                try { localStorage.setItem('cms-lesson-runner-layout', value); } catch (_) { }
                if (!PRESENTATION_MODE) _broadcastPresentationState();
                persistSettingsToUserFile().catch(err => console.warn('setLessonRunnerLayout: could not save config:', err));
            }
        }

        function _applyAppTitle() {
            let label = '';
            try { const t = CLASS_MANAGEMENT_CONFIG && CLASS_MANAGEMENT_CONFIG.launcherSettings && CLASS_MANAGEMENT_CONFIG.launcherSettings.appTitle && CLASS_MANAGEMENT_CONFIG.launcherSettings.appTitle.trim(); if (t) label = t; } catch { }
            const titleEl = document.getElementById('main-title');
            const fullTitle = label ? (label + ': Class Management') : 'Class Management';
            if (titleEl) titleEl.textContent = fullTitle;
            document.title = fullTitle;
        }

        async function openSettingsModal(tabName = 'general') {
            const modal = document.getElementById('settings-modal');
            if (!modal) return;
            closeDbPopup();
            closeRosterSettingsPopup();
            closeLinksPopup();
            closeClassSelectionPopup();
            modal.style.display = 'flex';
            const btn = document.getElementById('settings-btn');
            if (btn) btn.classList.add('active');
            await switchSettingsTab(tabName);
        }

        function closeSettingsModal() {
            const modal = document.getElementById('settings-modal');
            if (modal) modal.style.display = 'none';
            const btn = document.getElementById('settings-btn');
            if (btn) btn.classList.remove('active');
            if (typeof stopSoundFileAutoRefresh === 'function') stopSoundFileAutoRefresh();
            if (typeof stopAllTestSounds === 'function') stopAllTestSounds();
            if (typeof _cancelRecording === 'function') _cancelRecording();
            // Sync compatibility stubs
            const stubs = ['edit-teams-modal', 'edit-badges-modal', 'edit-sounds-modal', 'mode-manager-modal', 'edit-autoflag-modal', 'edit-shortcuts-modal'];
            stubs.forEach(id => {
                const s = document.getElementById(id);
                if (s) s.style.display = 'none';
            });
        }

        function toggleSettingsPopup(event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            const modal = document.getElementById('settings-modal');
            const isOpen = modal && modal.style.display === 'flex';
            if (isOpen) {
                closeSettingsModal();
            } else {
                openSettingsModal('general');
            }
        }

        function closeSettingsPopup() {
            closeSettingsModal();
        }

        async function switchSettingsTab(tabName) {
            if (!tabName) tabName = 'general';
            const validTabs = ['general', 'teams', 'badges', 'sounds', 'modes', 'roles', 'autoflag', 'shortcuts'];
            if (!validTabs.includes(tabName)) tabName = 'general';

            // Cleanup previous tab if leaving sounds or shortcuts
            if (typeof stopSoundFileAutoRefresh === 'function') stopSoundFileAutoRefresh();
            if (typeof stopAllTestSounds === 'function') stopAllTestSounds();
            if (typeof _cancelRecording === 'function') _cancelRecording();

            // Toggle tab buttons
            document.querySelectorAll('#settings-modal .settings-tab-btn').forEach(btn => {
                const isActive = btn.getAttribute('data-tab') === tabName;
                btn.classList.toggle('active', isActive);
            });

            // Toggle tab panes
            document.querySelectorAll('#settings-modal .settings-tab-pane').forEach(pane => {
                const isActive = pane.getAttribute('data-pane') === tabName;
                pane.classList.toggle('active', isActive);
            });

            // Update compatibility stub displays so listeners know which sub-section is active
            const stubMap = {
                'teams': 'edit-teams-modal',
                'badges': 'edit-badges-modal',
                'sounds': 'edit-sounds-modal',
                'modes': 'mode-manager-modal',
                'autoflag': 'edit-autoflag-modal',
                'shortcuts': 'edit-shortcuts-modal'
            };
            Object.keys(stubMap).forEach(key => {
                const el = document.getElementById(stubMap[key]);
                if (el) el.style.display = (tabName === key) ? 'flex' : 'none';
            });

            // Initialize tab specific content
            if (tabName === 'teams') {
                if (typeof renderEditTeamsModal === 'function') renderEditTeamsModal();
            } else if (tabName === 'badges') {
                try {
                    const curClassSet = selectedGroupName && badgeSetSettings?.classSets
                        ? (badgeSetSettings.classSets[selectedGroupName] || badgeSetSettings.defaultSetId || 'default')
                        : (badgeSetSettings?.defaultSetId || 'default');
                    if (typeof populateEditBadgesSetSelector === 'function') await populateEditBadgesSetSelector(curClassSet);
                    const loaded = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.loadSet === 'function')
                        ? await BadgeSets.loadSet(modalEditingSetId, getLoadedConfig()?.badgeDefinitions, participationSettings?.plusMinusCoefficient)
                        : null;
                    if (loaded && Array.isArray(loaded)) {
                        badgeDefinitions.length = 0;
                        badgeDefinitions.push(...loaded);
                    }
                    if (typeof renderEditBadgesModal === 'function') renderEditBadgesModal();
                } catch (err) {
                    console.warn('Error initializing badges tab:', err);
                }
            } else if (tabName === 'sounds') {
                try {
                    if (typeof refreshSoundFileList === 'function') await refreshSoundFileList(false);
                    if (typeof renderEditSoundsModal === 'function') renderEditSoundsModal();
                    if (typeof renderCustomButtonsModalEditor === 'function') renderCustomButtonsModalEditor();
                    if (typeof startSoundFileAutoRefresh === 'function') startSoundFileAutoRefresh();
                } catch (err) {
                    console.warn('Error initializing sounds tab:', err);
                }
            } else if (tabName === 'modes') {
                try {
                    await populateModeSetSelector();
                    renderModeManagerList();
                } catch (err) {
                    console.warn('Error initializing modes tab:', err);
                }
            } else if (tabName === 'roles') {
                try {
                    if (typeof loadRolesLibrary === 'function') await loadRolesLibrary();
                    renderRolesLibraryInSettings();
                } catch (err) {
                    console.warn('Error initializing roles tab:', err);
                }
            } else if (tabName === 'autoflag') {
                try {
                    const s = participationSettings || {};
                    const tl = s.autoFlagTimeline || {};
                    const afEn = document.getElementById('af-enabled');
                    if (afEn) afEn.checked = !!s.autoFlagLowParticipation;
                    const tlMode = ['all', 'weeks', 'date'].includes(tl.mode) ? tl.mode : 'all';
                    const r = document.querySelector(`input[name="af-timeline"][value="${tlMode}"]`);
                    if (r) r.checked = true;
                    const w = document.getElementById('af-tl-weeks-value');
                    if (w) w.value = tl.weeks ?? 4;
                    const d = document.getElementById('af-tl-date-value');
                    if (d) d.value = tl.sinceDate ?? '';
                    tempFlagRules = (s.flagRules && s.flagRules.length > 0)
                        ? JSON.parse(JSON.stringify(s.flagRules))
                        : (typeof getDefaultFlagRules === 'function' ? getDefaultFlagRules() : []);
                    if (typeof renderAutoFlagRulesTable === 'function') renderAutoFlagRulesTable();
                } catch (err) {
                    console.warn('Error initializing autoflag tab:', err);
                }
            } else if (tabName === 'shortcuts') {
                try {
                    if (typeof renderEditShortcutsTable === 'function') renderEditShortcutsTable();
                } catch (err) {
                    console.warn('Error initializing shortcuts tab:', err);
                }
            }
        }

        function toggleRosterSettingsPopup(event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            const popup = document.getElementById('roster-settings-popup');
            const btn = document.getElementById('roster-settings-btn');
            const isOpen = popup.classList.contains('open');
            if (isOpen) {
                closeRosterSettingsPopup();
            } else {
                if (typeof closeTimerPopup === 'function') closeTimerPopup();
                updateRosterSettingsPopupContext();
                popup.classList.add('open');
                if (btn) btn.classList.add('active');
            }
        }

        function closeRosterSettingsPopup(force = false) {
            const popup = document.getElementById('roster-settings-popup');
            const btn = document.getElementById('roster-settings-btn');
            if (popup) popup.classList.remove('open');
            if (btn) btn.classList.remove('active');
        }

        function switchRosterSettingsTab(event, tabId) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            const container = document.getElementById('roster-settings-popup');
            if (!container) return;

            // Deactivate all tab buttons
            const tabBtns = container.querySelectorAll('.rsp-tab-btn');
            tabBtns.forEach(btn => btn.classList.remove('active'));

            // Activate clicked button
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            }

            // Hide all tab contents
            const contents = container.querySelectorAll('.rsp-tab-content');
            contents.forEach(content => content.classList.remove('active'));

            // Show selected tab content
            const targetContent = container.querySelector(`#rsp-tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }

        // Close hub popups when clicking outside
        document.addEventListener('click', function (e) {
            const dbPopup = document.getElementById('db-hub-popup');
            const dbBtn = document.getElementById('db-hub-btn');
            if (dbPopup && dbPopup.classList.contains('open') && !dbPopup.contains(e.target) && e.target !== dbBtn && !dbBtn.contains(e.target)) {
                closeDbPopup();
            }

            const settingsPopup = document.getElementById('settings-popup');
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsPopup && settingsPopup.classList.contains('open') && !settingsPopup.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
                closeSettingsPopup();
            }

            const linksPopup = document.getElementById('links-popup');
            const linksBtn = document.getElementById('links-btn');
            if (linksPopup && linksPopup.classList.contains('open') && !linksPopup.contains(e.target) && e.target !== linksBtn && !linksBtn.contains(e.target)) {
                closeLinksPopup();
            }

            const rosterSettingsPopup = document.getElementById('roster-settings-popup');
            const rosterSettingsBtn = document.getElementById('roster-settings-btn');
            if (rosterSettingsPopup && rosterSettingsPopup.classList.contains('open') && !rosterSettingsPopup.contains(e.target) && e.target !== rosterSettingsBtn && !rosterSettingsBtn.contains(e.target)) {
                closeRosterSettingsPopup();
            }

            const classSelectionPopup = document.getElementById('class-selection-popup');
            const classSelectionBtn = document.getElementById('class-selection-btn');
            if (classSelectionPopup && classSelectionPopup.classList.contains('open')) {
                const inPopup = classSelectionPopup.contains(e.target) || (e.composedPath && e.composedPath().includes(classSelectionPopup));
                const isBtn = e.target === classSelectionBtn || (classSelectionBtn && classSelectionBtn.contains(e.target));
                if (!inPopup && !isBtn) {
                    closeClassSelectionPopup();
                }
            }
        });

        function toggleClassSelectionPopup(event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            const popup = document.getElementById('class-selection-popup');
            const btn = document.getElementById('class-selection-btn');
            if (!popup) return;
            const isOpen = popup.classList.contains('open');
            if (isOpen) {
                closeClassSelectionPopup();
            } else {
                closeRosterSettingsPopup(true);
                if (typeof closeTimerPopup === 'function') closeTimerPopup();
                popup.classList.add('open');
                if (btn) btn.classList.add('active');
            }
        }

        function closeClassSelectionPopup() {
            const popup = document.getElementById('class-selection-popup');
            const btn = document.getElementById('class-selection-btn');
            if (popup) popup.classList.remove('open');
            if (btn && !selectedGroupName) btn.classList.remove('active');
        }

        // ============================================================
        // EXPORT / IMPORT DB
        // ============================================================

        function exportDb() {
            const sessions = getDb()
                .map(sanitizeSessionForInteractionExport)
                .filter(Boolean);
            if (sessions.length === 0) {
                showToast('No active-group sessions to export yet.\nUse Save to DB or Save Active Classes first.');
                return;
            }

            const now = new Date();
            const stamp = now.toISOString().slice(0, 10); // e.g. 2026-03-02
            const filename = `cms-db_${stamp}.js`;
            const jsContent = buildDbFileContent(sessions);

            const blob = new Blob([jsContent], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        // ── Save DB to a fixed file using File System Access API ──
        // Remembers the file handle so subsequent saves overwrite the same file.
        let _dbFileHandle = null;

        async function saveDbToFile() {
            const sessions = getDb()
                .map(sanitizeSessionForInteractionExport)
                .filter(Boolean);
            if (sessions.length === 0) {
                showToast('No active-group sessions to export yet.\nUse Save to DB or Save Active Classes first.');
                return;
            }

            if (window.Desktop && Desktop.isElectron()) {
                await persistDbToDisk(sessions);

                const btn = document.getElementById('save-file-btn');
                if (btn) {
                    btn.classList.add('just-saved');
                    const small = btn.querySelector('small');
                    const origText = small ? small.textContent : '';
                    if (small) small.textContent = '✓ Saved!';
                    setTimeout(() => {
                        btn.classList.remove('just-saved');
                        if (small) small.textContent = origText;
                    }, 2000);
                }
                return;
            }

            const jsContent = buildDbFileContent(sessions);

            // Use File System Access API if available
            if (window.showSaveFilePicker) {
                try {
                    // If we already have a handle, try to reuse it (writes to same file)
                    if (!_dbFileHandle) {
                        _dbFileHandle = await window.showSaveFilePicker({
                            suggestedName: 'cms-db.js',
                            types: [{
                                description: 'JavaScript file',
                                accept: {
                                    'text/javascript': ['.js'],
                                    'application/javascript': ['.js']
                                }
                            }]
                        });
                    }
                    const writable = await _dbFileHandle.createWritable();
                    await writable.write(jsContent);
                    await writable.close();

                    // Flash button green as confirmation
                    const btn = document.getElementById('save-file-btn');
                    if (btn) {
                        btn.classList.add('just-saved');
                        const small = btn.querySelector('small');
                        const origText = small ? small.textContent : '';
                        if (small) small.textContent = '✓ Saved!';
                        setTimeout(() => {
                            btn.classList.remove('just-saved');
                            if (small) small.textContent = origText;
                        }, 2000);
                    }
                } catch (err) {
                    // User cancelled the picker — reset handle so they can re-pick
                    if (err.name === 'AbortError') {
                        _dbFileHandle = null;
                        return;
                    }
                    // Permission or other error — reset and fallback
                    _dbFileHandle = null;
                    console.warn('File System Access API error, falling back:', err);
                    _saveDbFallback(jsContent);
                }
            } else {
                // Fallback for browsers without File System Access API
                _saveDbFallback(jsContent);
            }
        }

        function _saveDbFallback(content) {
            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cms-db.js';
            a.click();
            URL.revokeObjectURL(url);
        }

        function _extractBalancedJsonArray(text, startIndex) {
            if ((text[startIndex] || '') !== '[') return null;

            let depth = 0;
            let quote = '';
            let escaped = false;

            for (let i = startIndex; i < text.length; i += 1) {
                const ch = text[i];

                if (quote) {
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (ch === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (ch === quote) {
                        quote = '';
                    }
                    continue;
                }

                if (ch === '"' || ch === '\'' || ch === '`') {
                    quote = ch;
                    continue;
                }

                if (ch === '[') {
                    depth += 1;
                    continue;
                }

                if (ch === ']') {
                    depth -= 1;
                    if (depth === 0) {
                        return text.slice(startIndex, i + 1);
                    }
                }
            }

            return null;
        }

        function _extractAssignedDbArray(text) {
            const sources = [
                /(?:window\.)?CMS_DB_EXPORT\s*=\s*/m,
                /(?:window\.)?DB_EXPORT\s*=\s*/m,
                /(?:const|let|var)\s+(?:CMS_DB_EXPORT|DB_EXPORT)\s*=\s*/m
            ];

            for (const pattern of sources) {
                const match = pattern.exec(text);
                if (!match) continue;

                let idx = match.index + match[0].length;
                while (/\s/.test(text[idx] || '')) idx += 1;

                if ((text[idx] || '') !== '[') continue;

                const extracted = _extractBalancedJsonArray(text, idx);
                if (extracted) return extracted;
            }

            return null;
        }

        function _parseDbText(text) {
            const normalized = String(text || '').replace(/^\uFEFF/, '').trim();
            if (!normalized) throw new Error('Empty DB file.');

            try {
                return JSON.parse(normalized);
            } catch (jsonError) {
                const extractedArray = _extractAssignedDbArray(normalized);
                if (!extractedArray) throw jsonError;
                return JSON.parse(extractedArray);
            }
        }

        function _isDbFileCandidate(file) {
            return !!(file && file.name && /\.(txt|js|json)$/i.test(file.name));
        }

        function _sortSessionsNewestFirst(sessions) {
            return [...sessions].sort((a, b) => new Date(b.id) - new Date(a.id));
        }

        function _mergeSessionsById(baseSessions, incomingSessions) {
            const seenIds = new Set();
            const merged = [];

            [...baseSessions, ...incomingSessions].forEach(session => {
                const id = session && session.id != null ? String(session.id) : null;
                if (id) {
                    if (seenIds.has(id)) return;
                    seenIds.add(id);
                }
                merged.push(session);
            });

            return _dedupeSessionsByClassDay(_sortSessionsNewestFirst(merged));
        }

        async function _loadSessionsFromFiles(filesLike) {
            const files = Array.from(filesLike || []).filter(_isDbFileCandidate);
            if (files.length === 0) {
                throw new Error('No valid .json/.js DB files found. Legacy .txt imports are also supported.');
            }

            const allSessions = [];
            const skippedFiles = [];
            let loadedFileCount = 0;

            for (const file of files) {
                try {
                    const text = await file.text();
                    const sessions = _parseDbText(text);
                    if (!Array.isArray(sessions)) throw new Error('Invalid format: expected an array of sessions.');
                    allSessions.push(...sessions);
                    loadedFileCount += 1;
                } catch (err) {
                    skippedFiles.push(file.name);
                }
            }

            if (loadedFileCount === 0) {
                throw new Error('None of the selected files contains a valid DB export.');
            }

            return {
                sessions: _mergeSessionsById([], allSessions),
                loadedFileCount,
                skippedFiles
            };
        }

        async function _collectDbFilesFromDirectoryHandle(dirHandle, outFiles = []) {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    await _collectDbFilesFromDirectoryHandle(entry, outFiles);
                    continue;
                }

                if (entry.kind === 'file' && /\.(txt|js|json)$/i.test(entry.name)) {
                    outFiles.push(await entry.getFile());
                }
            }

            return outFiles;
        }

        async function importDb(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            try {
                const loaded = await _loadSessionsFromFiles(files);
                const sessions = loaded.sessions;

                const existing = getDb();
                const choice = existing.length > 0
                    ? await new Promise(resolve => showConfirm(
                        `You already have ${existing.length} session(s) in your database.\n\nClick OK to MERGE (imported sessions added to existing ones).\nClick Cancel to REPLACE (overwrites your current database).`,
                        () => resolve(true),
                        () => resolve(false)
                    ))
                    : null; // No existing data — just load

                let merged;
                if (choice === true) {
                    merged = _mergeSessionsById(existing, sessions);
                } else {
                    merged = sessions;
                }

                saveDb(merged);

                let msg = `✓ Import successful!\n${merged.length} session(s) now in database.`;
                if (loaded.loadedFileCount > 1) msg += `\nLoaded ${loaded.loadedFileCount} files.`;
                if (loaded.skippedFiles.length > 0) msg += `\nSkipped ${loaded.skippedFiles.length} invalid file(s).`;
                showToast(msg);
                updateDbSessionCountLabel();
                syncDbAutosaveBaseline();
            } catch (err) {
                showToast('Import failed: ' + err.message, true);
            }

            // Reset file input so the same file/folder can be re-imported if needed
            event.target.value = '';
        }

        // ── Startup DB Load ──
        function dismissStartupBanner() {
            const banner = document.getElementById('startup-load-banner');
            if (banner) { banner.classList.remove('visible'); banner.style.display = 'none'; }
        }

        async function startupLoadDbFile() {
            // File picker flow (single or multiple files)
            if (window.showOpenFilePicker) {
                try {
                    const handles = await window.showOpenFilePicker({
                        types: [{ description: 'DB Backup File', accept: { 'application/json': ['.json'], 'text/javascript': ['.js'], 'text/plain': ['.txt'] } }],
                        multiple: true
                    });
                    // Reuse handle for Save to File session only when exactly one file is chosen
                    _dbFileHandle = handles.length === 1 ? handles[0] : null;

                    const files = await Promise.all(handles.map(h => h.getFile()));
                    const loaded = await _loadSessionsFromFiles(files);
                    _applyStartupDbSessions(loaded.sessions, loaded);
                    dismissStartupBanner();
                } catch (err) {
                    if (err.name === 'AbortError') return; // user cancelled
                    // Fallback to input
                    document.getElementById('startup-db-file-input').click();
                }
            } else {
                document.getElementById('startup-db-file-input').click();
            }
        }

        async function startupLoadDbFolder() {
            // Must be called directly from a click to satisfy browser user-gesture requirements.
            if (window.showDirectoryPicker) {
                try {
                    const dirHandle = await window.showDirectoryPicker();
                    const files = await _collectDbFilesFromDirectoryHandle(dirHandle);
                    const loaded = await _loadSessionsFromFiles(files);
                    _applyStartupDbSessions(loaded.sessions, loaded);
                    dismissStartupBanner();
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return; // user cancelled
                    showToast('Could not load DB folder: ' + err.message, true);
                    return;
                }
            }

            // Fallback: non-standard folder input (Chromium)
            const folderInput = document.getElementById('startup-db-folder-input');
            if (folderInput) {
                folderInput.click();
                return;
            }

            showToast('Folder loading is not supported in this browser. Use Load Files instead.');
        }

        async function startupImportDbFromInput(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            try {
                const loaded = await _loadSessionsFromFiles(files);
                _applyStartupDbSessions(loaded.sessions, loaded);
                dismissStartupBanner();
            } catch (err) {
                showToast('Could not load DB file: ' + err.message, true);
            }

            event.target.value = '';
        }

        function _applyStartupDbSessions(sessions, loadedInfo = null) {
            saveDb(sessions);
            updateDbSessionCountLabel();
            syncDbAutosaveBaseline();

            // Show brief confirmation in banner before it closes
            const sub = document.querySelector('.startup-banner-sub');
            if (!sub) return;

            let msg = `✓ ${sessions.length} session(s) loaded!`;
            if (loadedInfo && loadedInfo.loadedFileCount > 1) {
                msg += ` (${loadedInfo.loadedFileCount} files integrated)`;
            }
            if (loadedInfo && loadedInfo.skippedFiles.length > 0) {
                msg += ` — ${loadedInfo.skippedFiles.length} file(s) skipped.`;
            }
            sub.textContent = msg;
        }

        // ── Tutorial ─────────────────────────────────────────────────────────────────
        function startCmsTutorial() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            const steps = [
                { selector: '#class-selection-anchor', title: t('tut1_title'), text: t('tut1_text') },
                { selector: '.roster-panel', title: t('tut2_title'), text: t('tut2_text') },
                { selector: '#custom-action-buttons', title: t('tut_action_btns_title'), text: t('tut_action_btns_text') },
                { selector: '#pick-btn', title: t('tut_pick_title'), text: t('tut_pick_text') },
                { selector: '#roster-settings-btn', title: t('tut_roster_settings_title'), text: t('tut_roster_settings_text') },
                { selector: '#timer-open-btn', title: t('tut3_title'), text: t('tut3_text') },
                { selector: '#settings-btn', title: t('tut_general_settings_title'), text: t('tut_general_settings_text') }
            ];
            if (!isElectron) {
                steps.push({ selector: '#db-hub-btn', title: t('tut4_title'), text: t('tut4_text') });
            }
            Tutorial.start(steps, { next: t('tutNext'), prev: t('tutPrev'), skip: t('tutSkip'), done: t('tutDone') });
        }

        // Show the banner on startup (after a short delay so the UI is painted)
        document.addEventListener('DOMContentLoaded', () => {
            const banner = document.getElementById('startup-load-banner');
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) {
                if (banner) {
                    banner.classList.remove('visible');
                    banner.style.display = 'none';
                }
                const dbBtn = document.getElementById('db-hub-btn');
                if (dbBtn) dbBtn.style.display = 'none';
                const dbPopup = document.getElementById('db-hub-popup');
                if (dbPopup) dbPopup.style.display = 'none';
                const tmModal = document.getElementById('time-machine-modal');
                if (tmModal) tmModal.style.display = 'none';
                const histModal = document.getElementById('history-modal');
                if (histModal) histModal.style.display = 'none';
                const saveAllBtn = document.getElementById('save-all-db-btn');
                if (saveAllBtn) saveAllBtn.style.display = 'none';
                const saveFileBtn = document.getElementById('save-file-btn');
                if (saveFileBtn) saveFileBtn.style.display = 'none';
                const exportDbBtn = document.getElementById('export-db-btn');
                if (exportDbBtn) exportDbBtn.style.display = 'none';
                const importDbBtn = document.getElementById('import-db-btn');
                if (importDbBtn) importDbBtn.style.display = 'none';
                return;
            }

            if (banner) {
                setTimeout(() => {
                    banner.classList.add('visible');
                }, 400);
            }
        });

        // ── Presentation Mode init ───────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', () => {
            if (PRESENTATION_MODE) {
                document.body.classList.add('presentation-mode');
                document.body.classList.toggle('pres-show-autoflag', !!presSettings.autoflag);
                document.body.classList.toggle('pres-show-badges', !!presSettings.badges);
                document.body.classList.toggle('pres-show-roles', !!presSettings.roles);
                document.body.classList.toggle('pres-show-sen', !!presSettings.sen);
                window.addEventListener('resize', () => {
                    if (rosterPlanView) requestAnimationFrame(_presAdjustPlanViewHeight);
                    else _presAdjustRosterColumns();
                });
                if (_presChannel) {
                    _presChannel.addEventListener('message', (e) => _applyPresentationState(e.data));
                    // Ask the main window for its current state
                    _presChannel.postMessage({ type: 'request-state' });
                }
                // Notify the main window when this presentation window is closing
                window.addEventListener('beforeunload', () => {
                    if (_presChannel) {
                        try { _presChannel.postMessage({ type: 'pres-window-closing' }); } catch (_) { }
                    }
                });
            } else {
                ensurePresentationPopupMenu();
                initModeMinimisedPill();
                window.addEventListener('resize', () => {
                    clampUnifiedDockToViewport();
                });
                window.addEventListener('scroll', _broadcastScrollState, { passive: true });
                document.addEventListener('scroll', (e) => {
                    if (_openBadgePopupKey) {
                        _closeBadgePopupByKey(_openBadgePopupKey);
                        _openBadgePopupKey = null;
                    }
                    if (e.target && (e.target.id === 'roster-list' || e.target.id === 'clr-timeline-bar')) {
                        _broadcastScrollState();
                    }
                }, { passive: true, capture: true });

                // Allow smooth mouse wheel horizontal scrolling on the timeline bar
                document.addEventListener('wheel', (e) => {
                    const timelineBar = e.target && e.target.closest ? e.target.closest('#clr-timeline-bar') : null;
                    if (timelineBar && timelineBar.scrollWidth > timelineBar.clientWidth) {
                        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                            timelineBar.scrollLeft += e.deltaY;
                            e.preventDefault();
                            if (!PRESENTATION_MODE) _broadcastScrollState();
                        }
                    }
                }, { passive: false });

                // Main window: respond to state requests from the presentation window
                if (_presChannel) {
                    _presChannel.addEventListener('message', (e) => {
                        if (e.data && e.data.type === 'request-state') {
                            _presWindowOpen = true;
                            _updatePresWindowControls();
                            _broadcastPresentationState();
                        }
                        if (e.data && e.data.type === 'pres-control') {
                            if (e.data.command === 'close') cmsPresentationClose();
                            else if (e.data.command === 'freeze') toggleFreezePresentation();
                            else if (e.data.command === 'pin') toggleAlwaysOnTopPresentation();
                            else if (e.data.command === 'resize') cmsPresentationResizeWindow();
                            else if (e.data.command === 'right') cmsPresentationDockRight();
                            else if (e.data.command === 'left') cmsPresentationDockLeft();
                        }
                        if (e.data && e.data.type === 'pres-frozen-state') {
                            _presFrozen = !!e.data.on;
                            syncPresentationFreezeButtons();
                        }
                        if (e.data && e.data.type === 'pres-pin-state') {
                            _presAlwaysOnTop = !!e.data.on;
                            syncPresentationPinButtons();
                        }
                        if (e.data && e.data.type === 'pres-window-closing') {
                            _presWindowOpen = false;
                            _updatePresWindowControls();
                        }
                        if (e.data && e.data.type === 'start-timer') {
                            const sec = parseInt(e.data.seconds, 10);
                            if (sec > 0 && typeof startCountdownWithSeconds === 'function') {
                                startCountdownWithSeconds(sec);
                            }
                        }
                        if (e.data && e.data.type === 'timer-command') {
                            const cmd = e.data.cmd;
                            if (cmd === 'pause') {
                                if (!timerPaused && timerEndTime) timerTogglePause();
                            } else if (cmd === 'resume') {
                                if (timerPaused) timerTogglePause();
                            } else if (cmd === 'stop') {
                                stopCountdown();
                            } else if (cmd === 'skip') {
                                if (typeof intervalSkipStep === 'function') intervalSkipStep();
                            } else if (cmd === 'reset') {
                                stopCountdown();
                                if (e.data.seconds && typeof startCountdownWithSeconds === 'function') {
                                    startCountdownWithSeconds(e.data.seconds);
                                }
                            }
                        }
                    });
                }
            }
        });

        // Start initialization only after all class-management modules are loaded
        initApp().catch(error => {
            console.warn('Failed to initialize app from config.js:', error);
            if (typeof renderGroupButtons === 'function') renderGroupButtons();
        });


