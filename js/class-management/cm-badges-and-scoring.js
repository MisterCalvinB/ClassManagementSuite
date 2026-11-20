        function closeRosterContextMenu() {
            const menu = document.getElementById('roster-context-menu');
            if (!menu) return;
            menu.classList.remove('open');
            rosterContextStudentId = null;
        }

        function writeClipboard(text, onSuccess) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
                    writeClipboardFallback(text, onSuccess);
                });
            } else {
                writeClipboardFallback(text, onSuccess);
            }
        }
        function writeClipboardFallback(text, onSuccess) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); if (onSuccess) onSuccess(); } catch (e) { console.error('Clipboard copy failed', e); }
            document.body.removeChild(ta);
        }

        function copyRosterPlainText() {
            closeRosterSettingsPopup();
            closeRosterContextMenu();
            if (!selectedGroupName || !studentGroups[selectedGroupName]) return;

            const allStudents = studentGroups[selectedGroupName];
            const halfNames = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = halfNames ? allStudents.filter(s => halfNames.includes(s.name)) : allStudents;

            const sortedStudents = [...students].sort((a, b) => {
                if (!!a.isAbsent !== !!b.isAbsent) return a.isAbsent ? 1 : -1;
                const aid = a.teamId || 0;
                const bid = b.teamId || 0;
                if (aid !== bid) return aid - bid;
                return compareStudentsByName(a, b);
            });

            const lines = [];
            let lastTeamId = null;
            sortedStudents.forEach(function (student) {
                if (student.teamId && student.teamId !== lastTeamId) {
                    if (lines.length > 0) lines.push('');
                    const teamColor = teamColors[(student.teamId - 1) % teamColors.length];
                    const customName = (teamColor && teamColor.customName) ? teamColor.customName : (student.teamId + '. ' + (teamColor ? teamColor.name : '') + ' Team');
                    lines.push(customName);
                    lastTeamId = student.teamId;
                }
                let nameLine = student.teamId ? '  ' + getDisplayName(student) : getDisplayName(student);
                if (student.role) nameLine += ' (' + student.role + ')';
                if (student.isAbsent) nameLine += ' [absent]';
                lines.push(nameLine);
            });

            const text = lines.join('\n');
            writeClipboard(text, function () { showToast(t('alert_data_copied')); });
        }

        function handleRosterContextAction(action) {
            if (!selectedGroupName || rosterContextStudentId == null) return;

            const student = studentGroups[selectedGroupName].find(s => s.id === rosterContextStudentId);
            if (!student) {
                closeRosterContextMenu();
                return;
            }

            if (action === 'highlight') {
                closeRosterContextMenu();
                highlightStudentManually(rosterContextStudentId);
                return;
            }

            // Handle mode shortcuts (no need for student data)
            if (action === 'timer') {
                closeRosterContextMenu();
                openTimerFullscreen();
                return;
            } else if (action === 'quiet-mode') {
                closeRosterContextMenu();
                activateMode('quiet');
                return;
            } else if (action === 'conversation-mode') {
                closeRosterContextMenu();
                activateMode('conversation');
                return;
            } else if (action === 'group-mode') {
                closeRosterContextMenu();
                activateMode('group');
                return;
            }

            if (action === 'absent') {
                student.isAbsent = !student.isAbsent;
                if (student.isAbsent) {
                    delete student.teamId;
                    delete student.role;
                    student.isPicked = false;
                } else {
                    student.isPicked = false;
                }
                logHistory('attendance', student.name, student.isAbsent ? 'Marked absent' : 'Marked present', { studentId: student.id, isAbsent: student.isAbsent });
                renderRoster();
                renderRanking();
                if (typeof cmsSyncStudentAbsenceToGradeSheet === 'function') {
                    cmsSyncStudentAbsenceToGradeSheet(student, student.isAbsent);
                }
            }

            if (action === 'flag') {
                student.isFlagged = !student.isFlagged;
                renderRoster();
            }

            if (action === 'open-tracker') {
                openInParticipationTracker(rosterContextStudentId);
                return;
            }

            if (action === 'dossier') {
                openStudentDossierPopup(rosterContextStudentId);
                return;
            }

            if (action === 'open-grade-sheet') {
                openInGradeSheet(rosterContextStudentId);
                return;
            }

            if (action === 'exam-session') {
                closeRosterContextMenu();
                toggleExamSessionMode(selectedGroupName);
                return;
            }

            closeRosterContextMenu();
        }

        function slugifyForPath(name) {
            return String(name || '').trim()
                .replace(/[\\/:*?"<>|]/g, '-')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/^\.+/, '_') || '_unnamed';
        }

        // _cmsCurrentAssociatedTest and _cmsGradesChannel declared at top of script to prevent TDZ ReferenceError during initApp()

        function _cmsInitGradesSync() {
            if (typeof BroadcastChannel === 'undefined' || _cmsGradesChannel) return;
            try {
                _cmsGradesChannel = new BroadcastChannel('cmt-grades');
                _cmsGradesChannel.onmessage = function (ev) {
                    if (!ev || !ev.data || typeof ev.data !== 'object') return;
                    const msg = ev.data;
                    if (msg.action === 'grade-absence-changed') {
                        if (!selectedGroupName) return;
                        const meta = rawMeta[selectedGroupName] || {};
                        const gUuid = meta.uuid || selectedGroupName;
                        const matchesClass = (msg.groupId === selectedGroupName || msg.classId === selectedGroupName ||
                            msg.groupId === gUuid || msg.classId === gUuid ||
                            (meta.name && msg.className && meta.name.toLowerCase() === msg.className.toLowerCase()));
                        if (!matchesClass) return;

                        const isExam = isExamSessionActive(selectedGroupName);
                        const isThisTest = _cmsCurrentAssociatedTest &&
                            _cmsCurrentAssociatedTest.semester === msg.semester &&
                            _cmsCurrentAssociatedTest.testIndex === msg.testIndex;

                        if (isExam || isThisTest) {
                            const students = studentGroups[selectedGroupName] || [];
                            const student = students.find(s =>
                                (msg.studentId && (s.uuid === msg.studentId || s.id === msg.studentId)) ||
                                (msg.studentName && s.name.trim().toLowerCase() === msg.studentName.trim().toLowerCase())
                            );
                            if (student && !!student.isAbsent !== !!msg.isAbsent) {
                                student.isAbsent = !!msg.isAbsent;
                                if (student.isAbsent) {
                                    delete student.teamId;
                                    delete student.role;
                                    student.isPicked = false;
                                }
                                logHistory('attendance', student.name, student.isAbsent ? 'Marked absent (from Grade Sheet)' : 'Marked present (from Grade Sheet)', { studentId: student.id, isAbsent: student.isAbsent });
                                renderRoster();
                                renderRanking();
                            }
                        }
                    }
                };
            } catch (_) {}
        }

        async function cmsGetAssociatedGradeSheetTest(groupName = selectedGroupName) {
            if (!groupName) return null;
            const todayStr = new Date().toISOString().slice(0, 10);
            const meta = rawMeta[groupName] || {};
            const groupUuid = meta.uuid || groupName;

            // 1. Check if linked via Planner entry
            try {
                const entries = await loadPlannerEntriesForClass(groupName);
                let testEntry = null;
                if (currentPlannerEntryId) {
                    testEntry = entries.find(e => e && e.id === currentPlannerEntryId && (e.type === 'test' || e.isTest === true || e.gsLink));
                }
                if (!testEntry) {
                    testEntry = entries.find(e => e && e.date === todayStr && (e.type === 'test' || e.isTest === true || e.gsLink));
                }
                if (testEntry && testEntry.gsLink && testEntry.gsLink.semester && testEntry.gsLink.testIndex != null) {
                    return {
                        source: 'planner',
                        plannerEntryId: testEntry.id,
                        testName: testEntry.topic || testEntry.title || (window.i18n ? i18n.t('pl_typeTest') : 'Test'),
                        testDate: testEntry.date || todayStr,
                        classId: testEntry.gsLink.classId || groupUuid,
                        classSlug: testEntry.gsLink.classSlug || testEntry.gsLink.classId,
                        classFolder: testEntry.gsLink.classSlug || testEntry.gsLink.classId,
                        semester: testEntry.gsLink.semester,
                        testIndex: testEntry.gsLink.testIndex
                    };
                }
            } catch (e) {
                console.warn('[CMS] cmsGetAssociatedGradeSheetTest planner check failed:', e);
            }

            // 2. Query Grade Sheet window via BroadcastChannel (fast in-memory lookup)
            const bcPromise = new Promise(resolve => {
                if (typeof BroadcastChannel === 'undefined') return resolve(null);
                try {
                    const ch = new BroadcastChannel('cmt-grades');
                    const queryId = 'qry-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                    let timer = null;
                    const handler = ev => {
                        if (ev && ev.data && ev.data.action === 'active-test-response' && ev.data.queryId === queryId) {
                            clearTimeout(timer);
                            try { ch.removeEventListener('message', handler); ch.close(); } catch (_) {}
                            resolve(ev.data);
                        }
                    };
                    ch.addEventListener('message', handler);
                    ch.postMessage({
                        action: 'query-active-test',
                        queryId,
                        groupName,
                        groupUuid,
                        date: todayStr
                    });
                    timer = setTimeout(() => {
                        try { ch.removeEventListener('message', handler); ch.close(); } catch (_) {}
                        resolve(null);
                    }, 300);
                } catch (_) {
                    resolve(null);
                }
            });

            const bcRes = await bcPromise;
            if (bcRes && bcRes.semester && bcRes.testIndex != null) {
                return {
                    source: 'gradesheet-window',
                    testName: (bcRes.testConfig && bcRes.testConfig.testName) || (window.i18n ? i18n.t('pl_typeTest') : 'Test'),
                    testDate: (bcRes.testConfig && bcRes.testConfig.testDate) || todayStr,
                    classId: bcRes.classId || groupUuid,
                    classSlug: bcRes.classSlug || bcRes.classId,
                    classFolder: bcRes.classFolder || bcRes.classId,
                    semester: bcRes.semester,
                    testIndex: bcRes.testIndex,
                    testConfig: bcRes.testConfig,
                    absentStudentIds: bcRes.absentStudentIds || []
                };
            }

            // 3. Fallback: inspect Grade files on disk
            if (window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
                try {
                    const listRes = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
                    if (listRes && listRes.ok && Array.isArray(listRes.files)) {
                        const classFiles = listRes.files.filter(f => f.filename === '_class.js');
                        let targetFolder = null;
                        let targetClassMeta = null;

                        for (const cf of classFiles) {
                            const r = await Desktop.readByPath('grades', cf.relativePath);
                            if (!r || !r.content) continue;
                            let meta = null;
                            try {
                                const fake = {};
                                new Function('window', r.content)(fake);
                                meta = fake.GRADE_CLASS;
                            } catch (_) {}
                            if (meta && (meta.classId === groupUuid || meta.classId === groupName || meta.groupId === groupUuid || meta.groupId === groupName || (meta.className && meta.className.toLowerCase() === groupName.toLowerCase()))) {
                                targetFolder = cf.relativePath.split('/')[0];
                                targetClassMeta = meta;
                                break;
                            }
                        }

                        if (!targetFolder) {
                            const possibleFolders = [groupName, groupUuid, slugifyForPath(groupName)].filter(Boolean);
                            for (const pf of possibleFolders) {
                                if (listRes.files.some(f => f.relativePath.startsWith(pf + '/'))) {
                                    targetFolder = pf;
                                    break;
                                }
                            }
                        }

                        if (targetFolder) {
                            const testFiles = listRes.files.filter(f => f.relativePath.startsWith(targetFolder + '/') && f.filename.includes('-test-'));
                            for (const tf of testFiles) {
                                const r = await Desktop.readByPath('grades', tf.relativePath);
                                if (!r || !r.content) continue;
                                let testData = null;
                                try {
                                    const fake = {};
                                    new Function('window', r.content)(fake);
                                    testData = fake.GRADE_TEST_DATA;
                                } catch (_) {}
                                if (testData && testData.testConfig && (testData.testConfig.testDate === todayStr)) {
                                    return {
                                        source: 'disk',
                                        testName: testData.testConfig.testName || (window.i18n ? i18n.t('pl_typeTest') : 'Test'),
                                        testDate: testData.testConfig.testDate,
                                        classId: testData.classId || (targetClassMeta && targetClassMeta.classId) || groupUuid,
                                        classSlug: targetFolder,
                                        classFolder: targetFolder,
                                        semester: testData.semester,
                                        testIndex: testData.testIndex,
                                        testConfig: testData.testConfig,
                                        absentStudentIds: testData.testConfig.absentStudentIds || []
                                    };
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[CMS] Disk grade inspection error:', err);
                }
            }

            return null;
        }

        async function cmsSyncStudentAbsenceToGradeSheet(student, isAbsent, targetGroup = selectedGroupName) {
            if (!student || !targetGroup) return;
            if (!_cmsCurrentAssociatedTest) {
                _cmsCurrentAssociatedTest = await cmsGetAssociatedGradeSheetTest(targetGroup);
            }
            const test = _cmsCurrentAssociatedTest;
            if (!test) return;

            const studentUuid = student.uuid || student.id;
            const studentName = student.name || '';

            // 1. Broadcast via cmt-grades
            try {
                if (typeof BroadcastChannel !== 'undefined') {
                    const ch = new BroadcastChannel('cmt-grades');
                    ch.postMessage({
                        action: 'set-student-absent',
                        classId: test.classId,
                        groupId: targetGroup,
                        className: (rawMeta[targetGroup] && rawMeta[targetGroup].name) ? rawMeta[targetGroup].name : targetGroup,
                        semester: test.semester,
                        testIndex: test.testIndex,
                        studentId: student.id,
                        studentUuid: studentUuid,
                        studentName: studentName,
                        isAbsent: !!isAbsent
                    });
                    setTimeout(() => { try { ch.close(); } catch (_) {} }, 500);
                }
            } catch (e) {
                console.warn('[CMS] Failed to broadcast student absence to Grade Sheet:', e);
            }

            // 2. Persist to file on disk in case Grade Sheet is closed
            if (window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
                try {
                    const testLabel = `${test.semester}-test-${String(test.testIndex + 1).padStart(2, '0')}.js`;
                    const filePath = `${test.classFolder}/${testLabel}`;
                    const r = await Desktop.readByPath('grades', filePath);
                    if (r && r.ok && r.content) {
                        const sandbox = {};
                        new Function('window', r.content)(sandbox);
                        const testData = sandbox.GRADE_TEST_DATA;
                        if (testData && testData.testConfig) {
                            if (!Array.isArray(testData.testConfig.absentStudentIds)) {
                                testData.testConfig.absentStudentIds = [];
                            }
                            let matchedId = studentUuid;
                            if (Array.isArray(testData.results)) {
                                const rItem = testData.results.find(res => 
                                    res.studentId === studentUuid || 
                                    (res.name && res.name.trim().toLowerCase() === studentName.trim().toLowerCase())
                                );
                                if (rItem && rItem.studentId) matchedId = rItem.studentId;
                            }

                            const idx = testData.testConfig.absentStudentIds.indexOf(matchedId);
                            let modified = false;
                            if (isAbsent && idx === -1) {
                                testData.testConfig.absentStudentIds.push(matchedId);
                                modified = true;
                            } else if (!isAbsent && idx !== -1) {
                                testData.testConfig.absentStudentIds.splice(idx, 1);
                                modified = true;
                            }

                            if (modified) {
                                testData._savedAt = Date.now();
                                const newContent = '// _savedAt: ' + testData._savedAt + '\nwindow.GRADE_TEST_DATA = ' + JSON.stringify(testData, null, 2) + ';\n';
                                await Desktop.saveText('grades', testLabel, newContent, test.classFolder);
                                test.absentStudentIds = testData.testConfig.absentStudentIds;
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[CMS] Failed to save test absence to disk:', err);
                }
            }

            const toastKey = isAbsent ? 'cmToastAbsenceSyncedToGs' : 'cmToastPresenceSyncedToGs';
            const toastDefault = isAbsent ? '{name} marked absent (synced to Grade Sheet: {test}).' : '{name} marked present (synced to Grade Sheet: {test}).';
            const msg = (window.i18n ? i18n.t(toastKey) : toastDefault)
                .replace('{name}', studentName)
                .replace('{test}', test.testName || 'Test');
            if (typeof showToast === 'function') showToast(msg);
        }

        async function cmsSyncExamSessionWithGradeSheet(groupName) {
            if (!groupName) return;
            _cmsCurrentAssociatedTest = await cmsGetAssociatedGradeSheetTest(groupName);
            if (!_cmsCurrentAssociatedTest) return;

            const test = _cmsCurrentAssociatedTest;
            const groupStudents = studentGroups[groupName] || [];

            let rosterUpdated = false;
            if (Array.isArray(test.absentStudentIds) && test.absentStudentIds.length) {
                groupStudents.forEach(s => {
                    const sid = s.uuid || s.id;
                    if (test.absentStudentIds.includes(sid) && !s.isAbsent) {
                        s.isAbsent = true;
                        delete s.teamId;
                        delete s.role;
                        s.isPicked = false;
                        rosterUpdated = true;
                        logHistory('attendance', s.name, 'Marked absent (synced from Grade Sheet)', { studentId: s.id, isAbsent: true });
                    }
                });
            }

            const absentStudents = groupStudents.filter(s => s.isAbsent);
            for (const abs of absentStudents) {
                await cmsSyncStudentAbsenceToGradeSheet(abs, true, groupName);
            }

            if (rosterUpdated) {
                renderRoster();
                renderRanking();
            }

            updateExamSessionBanner();

            const syncedMsg = (window.i18n ? i18n.t('cmToastExamSessionSynced') : 'Exam session linked to Grade Sheet ({test}). Absences synchronized.')
                .replace('{test}', test.testName || 'Test');
            if (typeof showToast === 'function') showToast(syncedMsg);
        }

        function openLinkedGradeSheetForSession() {
            if (!_cmsCurrentAssociatedTest || !selectedGroupName) {
                openInGradeSheet();
                return;
            }
            const test = _cmsCurrentAssociatedTest;
            const groupName = (rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name) ? rawMeta[selectedGroupName].name : selectedGroupName;

            if (window.Desktop && typeof Desktop.openTool === 'function') {
                const query = {
                    group: selectedGroupName,
                    class: groupName
                };
                if (test.semester) query.sem = test.semester;
                if (test.testIndex != null) query.testIndex = String(test.testIndex);
                Desktop.openTool('grade-sheet.html', { query });
            } else {
                const params = new URLSearchParams();
                params.set('group', selectedGroupName);
                params.set('class', groupName);
                if (test.semester) params.set('sem', test.semester);
                if (test.testIndex != null) params.set('testIndex', String(test.testIndex));
                window.open('grade-sheet.html?' + params.toString(), '_blank');
            }
        }

        function isExamSessionActive(groupName = selectedGroupName) {
            if (!groupName) return false;
            if (groupExamModes[groupName] !== undefined) return !!groupExamModes[groupName];
            const students = studentGroups[groupName] || [];
            if (students.length > 0 && students.every(s => s.inExam === true)) {
                groupExamModes[groupName] = true;
                return true;
            }
            return false;
        }

        async function setExamSessionMode(groupName, enable) {
            if (!groupName) return;
            groupExamModes[groupName] = !!enable;
            const students = studentGroups[groupName] || [];
            students.forEach(s => {
                s.inExam = !!enable;
            });
            logHistory('exam-toggle', groupName, enable ? 'Exam session mode enabled' : 'Exam session mode ended', { inExam: !!enable });
            renderRoster();

            if (enable) {
                await cmsSyncExamSessionWithGradeSheet(groupName);
            } else {
                _cmsCurrentAssociatedTest = null;
                updateExamSessionBanner();
            }

            const msg = enable 
                ? (window.i18n ? i18n.t('msg_exam_session_started') : 'Exam session enabled. Students marked in exam.')
                : (window.i18n ? i18n.t('msg_exam_session_ended') : 'Exam session ended.');
            if (typeof showToast === 'function') {
                showToast(msg);
            }
            if (typeof forceSaveCurrentSessionToDb === 'function') {
                forceSaveCurrentSessionToDb('exam-toggle');
            } else if (typeof autosaveToDb === 'function') {
                autosaveToDb('exam-toggle');
            }
        }

        function toggleExamSessionMode(groupName = selectedGroupName) {
            if (!groupName) return;
            const current = isExamSessionActive(groupName);
            setExamSessionMode(groupName, !current);
        }

        function updateExamSessionBanner() {
            const banner = document.getElementById('cm-exam-session-banner');
            if (!banner) return;
            const isActive = isExamSessionActive(selectedGroupName);
            banner.style.display = isActive ? 'inline-flex' : 'none';

            const gsLink = document.getElementById('cm-exam-session-gs-link');
            const gsText = document.getElementById('cm-exam-session-gs-text');
            if (gsLink && gsText) {
                if (isActive && _cmsCurrentAssociatedTest) {
                    gsLink.style.display = 'inline-flex';
                    gsText.textContent = _cmsCurrentAssociatedTest.testName || (window.i18n ? i18n.t('ctx_grades') : 'Grade Sheet');
                    const linkTitle = (window.i18n ? i18n.t('cmExamSessionLinkedGsTitle') : 'Open this test in Grade Sheet');
                    gsLink.title = linkTitle;
                } else {
                    gsLink.style.display = 'none';
                }
            }
        }

        async function checkScheduledPlannerTest(groupName) {
            if (!groupName) return;
            const todayStr = new Date().toISOString().slice(0, 10);
            const promptKey = `${groupName}_${todayStr}`;
            if (_promptedExamSessionKeys.has(promptKey)) return;
            if (isExamSessionActive(groupName)) return;

            try {
                const entries = await loadPlannerEntriesForClass(groupName);
                if (!entries || !entries.length) return;
                const testEntry = entries.find(e => e && e.date === todayStr && (e.type === 'test' || e.isTest === true));
                if (!testEntry) return;

                _promptedExamSessionKeys.add(promptKey);

                const testTitle = testEntry.title || (window.i18n ? i18n.t('pl_typeTest') : 'Test');
                const rawMsg = window.i18n ? i18n.t('msg_prompt_exam_session') : 'A test ({title}) is scheduled for this class today in the Planner. Do you want to mark the whole session as an exam session?';
                const msg = rawMsg.replace('{title}', testTitle);

                const confirmed = await (typeof showConfirm === 'function' ? showConfirm(msg) : Promise.resolve(confirm(msg)));
                if (confirmed) {
                    if (testEntry.id && !currentPlannerEntryId) {
                        currentPlannerEntryId = testEntry.id;
                    }
                    await setExamSessionMode(groupName, true);
                }
            } catch (err) {
                console.warn('checkScheduledPlannerTest error:', err);
            }
        }

        function openInParticipationTracker(studentId) {
            closeRosterContextMenu();
            if (!selectedGroupName) return;
            if (studentId == null) studentId = rosterContextStudentId;
            const students = studentGroups[selectedGroupName] || [];
            const student = students.find(s => s.id === studentId) || students[studentId];
            const groupName = (rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name) ? rawMeta[selectedGroupName].name : selectedGroupName;
            const studentQuery = student ? (student.uuid || student.name) : '';

            if (window.Desktop && typeof Desktop.openTool === 'function') {
                Desktop.openTool('participation-tracker.html', {
                    query: {
                        group: selectedGroupName,
                        class: groupName,
                        student: studentQuery
                    }
                });
            } else {
                const params = new URLSearchParams();
                params.set('group', selectedGroupName);
                params.set('class', groupName);
                if (studentQuery) params.set('student', studentQuery);
                window.open('participation-tracker.html?' + params.toString(), '_blank');
            }
        }

        function openInGradeSheet(studentId) {
            closeRosterContextMenu();
            if (!selectedGroupName) return;
            if (studentId == null) studentId = rosterContextStudentId;
            const students = studentGroups[selectedGroupName] || [];
            const student = students.find(s => s.id === studentId) || students[studentId];
            const groupName = (rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name) ? rawMeta[selectedGroupName].name : selectedGroupName;
            const studentQuery = student ? (student.uuid || student.name) : '';
            const test = _cmsCurrentAssociatedTest;

            if (window.Desktop && typeof Desktop.openTool === 'function') {
                const query = {
                    group: selectedGroupName,
                    class: groupName,
                    student: studentQuery
                };
                if (test && test.semester) query.sem = test.semester;
                if (test && test.testIndex != null) query.testIndex = String(test.testIndex);
                Desktop.openTool('grade-sheet.html', { query });
            } else {
                const params = new URLSearchParams();
                params.set('group', selectedGroupName);
                params.set('class', groupName);
                if (studentQuery) params.set('student', studentQuery);
                if (test && test.semester) params.set('sem', test.semester);
                if (test && test.testIndex != null) params.set('testIndex', String(test.testIndex));
                window.open('grade-sheet.html?' + params.toString(), '_blank');
            }
        }

        // ---- Student Stats Popup ----

        function closeStudentStatsPopup() {
            const popup = document.getElementById('student-stats-popup');
            if (popup) popup.classList.remove('open');
        }

        // ---- Student Grades Popup ----

        function closeStudentGradesPopup() {
            const popup = document.getElementById('student-grades-popup');
            if (popup) popup.classList.remove('open');
        }

        function openStudentDossierPopup(studentId) {
            closeRosterContextMenu();
            if (studentId == null) studentId = rosterContextStudentId;
            if (studentId == null) return;

            const students = (selectedGroupName && studentGroups[selectedGroupName]) || [];
            const student = students.find(s => s.id === studentId) || students[studentId];
            const targetId = student ? (student.uuid || student.id || student.name) : studentId;

            if (typeof TagLinkModal !== 'undefined' && typeof TagLinkModal.openStudentDossier === 'function') {
                TagLinkModal.openStudentDossier(targetId, { title: student ? student.name : '' });
            }
        }
        window.openStudentDossierPopup = openStudentDossierPopup;

  async function openStudentGradesPopup(studentId) {
            closeRosterContextMenu();
            if (!selectedGroupName || studentId == null) return;

            const students = studentGroups[selectedGroupName] || [];
            const student = students.find(s => s.id === studentId) || students[studentId];
            if (!student) return;

            const popup = document.getElementById('student-grades-popup');
            const nameEl = document.getElementById('student-grades-name');
            const body = document.getElementById('student-grades-body');
            if (!popup || !nameEl || !body) return;

            nameEl.textContent = student.name || '';

            function _showAndPosition(html) {
                body.innerHTML = html;
                popup.classList.add('open');
                const pad = 8;
                const studentEl = document.querySelector(`[data-student-id="${studentId}"]`);
                requestAnimationFrame(() => {
                    const pw = popup.offsetWidth;
                    const ph = popup.offsetHeight;
                    let x = window.innerWidth / 2 - pw / 2;
                    let y = window.innerHeight / 2 - ph / 2;
                    if (studentEl) {
                        const rect = studentEl.getBoundingClientRect();
                        x = rect.right + pad;
                        y = rect.top;
                    }
                    popup.style.left = Math.min(Math.max(pad, x), window.innerWidth - pw - pad) + 'px';
                    popup.style.top = Math.min(Math.max(pad, y), window.innerHeight - ph - pad) + 'px';
                });
            }

            function _parseGradeJs(content) {
                try {
                    const sandbox = {};
                    (new Function('window', content))(sandbox);
                    return sandbox.GRADE_TEST_DATA || sandbox.GRADE_CLASS || null;
                } catch (e) { return null; }
            }

            function _fmtG(val) {
                if (val == null || isNaN(val)) return '–';
                return String(parseFloat(Number(val).toFixed(2)));
            }
            function _gradeStyle(g) {
                if (g == null) return 'color:#ccc;';
                if (g >= 6) return 'color:#16a34a;font-weight:700;';
                if (g >= 5) return 'color:#4d7c0f;font-weight:700;';
                if (g >= 4) return 'color:#b45309;font-weight:700;';
                return 'color:#dc2626;font-weight:700;';
            }
            function _calcAvg(tests, configs) {
                if (!Array.isArray(tests)) return null;
                let fixedSum = 0, fixedPct = 0, normalSum = 0, normalWeight = 0;
                tests.forEach((g, i) => {
                    if (g == null) return;
                    const cfg = Array.isArray(configs) ? configs[i] : null;
                    const fw = cfg && typeof cfg.fixedWeight === 'number' ? cfg.fixedWeight : null;
                    if (fw != null) {
                        fixedSum += g * fw / 100;
                        fixedPct += fw / 100;
                    } else {
                        const coeff = Math.max(0, (cfg && typeof cfg.coefficient === 'number' ? cfg.coefficient : null) ?? 1);
                        normalSum += g * coeff;
                        normalWeight += coeff;
                    }
                });
                if (fixedPct === 0 && normalWeight === 0) return null;
                const normalProportion = Math.max(0, 1 - fixedPct);
                const normalAvg = normalWeight > 0 ? normalSum / normalWeight : null;
                return fixedSum + (normalAvg != null ? normalProportion * normalAvg : 0);
            }

            if (!window.Desktop || typeof window.Desktop.listByPath !== 'function') {
                _showAndPosition('<div class="grades-empty">Grades can only be read in the desktop app.</div>');
                return;
            }

            // Show loading state immediately
            _showAndPosition('<div class="grades-empty" style="font-style:normal;">Loading…</div>');

            try {
                const listResult = await window.Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
                if (!listResult || !listResult.ok || !Array.isArray(listResult.files) || !listResult.files.length) {
                    _showAndPosition('<div class="grades-empty">No grade files found.<br>Save grades from the Grade Sheet first.</div>');
                    return;
                }

                const targetName = (student.name || '').trim().toUpperCase();
                const classFiles = listResult.files.filter(f => f.filename === '_class.js');
                const testFiles = listResult.files.filter(f => f.filename !== '_class.js');

                const classTitle = (rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name) ? rawMeta[selectedGroupName].name : selectedGroupName;

                // Find the _class.js matching selectedGroupName (current format: <classSlug>/_class.js)
                let gsStudentId = null;
                let matchedClassId = null;
                let matchedSubdir = null;
                let matchedClassName = null;

                for (const cf of classFiles) {
                    const res = await window.Desktop.readByPath('grades', cf.relativePath);
                    if (!res || !res.content) continue;
                    const meta = _parseGradeJs(res.content);
                    if (!meta) continue;
                    if (meta.groupId !== selectedGroupName && meta.className !== selectedGroupName && meta.className !== classTitle) continue;

                    const parts = cf.relativePath.replace(/\\/g, '/').split('/');
                    if (parts.length < 2) continue;
                    matchedClassId = meta.classId;
                    matchedClassName = meta.className;
                    matchedSubdir = parts.slice(0, -1).join('/');

                    const match = (meta.students || []).find(gs => {
                        const first = (gs.firstName || '').trim().toUpperCase();
                        const last = (gs.lastName || '').trim().toUpperCase();
                        const full = last ? (first + ' ' + last) : first;
                        return full === targetName || first === targetName;
                    });
                    if (match) gsStudentId = match.id;
                    break;
                }

                const displayClassTitle = matchedClassName || classTitle;

                if (!matchedSubdir) {
                    _showAndPosition(`<div class="grades-empty">No grade data for <em>${escapeSettingsHtml(displayClassTitle)}</em>.</div>`);
                    return;
                }
                if (!gsStudentId) {
                    _showAndPosition(`<div class="grades-empty">No grade record for <em>${escapeSettingsHtml(student.name)}</em>.</div>`);
                    return;
                }

                // Read test files — semester is stored in testData.semester (format: <classSlug>/sem1-test-NN.js)
                const TEST_COUNT = 8;
                const gradeBySem = {};

                const classTestFiles = testFiles.filter(f =>
                    f.relativePath.replace(/\\/g, '/').startsWith(matchedSubdir + '/'));

                for (const tf of classTestFiles) {
                    const res = await window.Desktop.readByPath('grades', tf.relativePath);
                    if (!res || !res.content) continue;
                    const testData = _parseGradeJs(res.content);
                    if (!testData || testData.classId !== matchedClassId) continue;
                    const sem = testData.semester;
                    if (sem !== 'sem1' && sem !== 'sem2') continue;
                    const idx = testData.testIndex;
                    if (typeof idx !== 'number' || idx < 0 || idx >= TEST_COUNT) continue;

                    if (!gradeBySem[sem]) {
                        gradeBySem[sem] = { tests: new Array(TEST_COUNT).fill(null), configs: new Array(TEST_COUNT).fill(null) };
                    }
                    if (testData.testConfig) gradeBySem[sem].configs[idx] = testData.testConfig;
                    const result = (testData.results || []).find(r => r.studentId === gsStudentId);
                    if (result) gradeBySem[sem].tests[idx] = result.score ?? null;
                }

                // Build HTML
                let html = '';
                const semAvgs = [];

                for (const sem of ['sem1', 'sem2']) {
                    const semData = gradeBySem[sem];
                    if (!semData) continue;
                    const { tests, configs } = semData;

                    const activeTests = tests
                        .map((g, i) => ({ index: i, grade: g, cfg: configs[i] || {} }))
                        .filter(t => t.grade != null || (t.cfg && (t.cfg.testName || t.cfg.testDate)));
                    if (activeTests.length === 0) continue;

                    const avg = _calcAvg(tests, configs);
                    if (avg != null) semAvgs.push(avg);

                    const semLabel = sem === 'sem1' ? t('gsSem1') : t('gsSem2');
                    const sectionTitle = displayClassTitle ? `${displayClassTitle} – ${semLabel}` : semLabel;
                    html += `<div class="stats-section-label">${escapeSettingsHtml(sectionTitle)}</div>`;

                    activeTests.forEach(({ index, grade, cfg }) => {
                        const label = escapeSettingsHtml((cfg && cfg.testName) || ('Test ' + (index + 1)));
                        const dateStr = (cfg && cfg.testDate)
                            ? ` <span style="color:#bbb;font-weight:400;font-size:0.75em;">(${escapeSettingsHtml(cfg.testDate)})</span>` : '';
                        const valStr = grade != null
                            ? `<span style="${_gradeStyle(grade)}">${_fmtG(grade)}</span>`
                            : '<span style="color:#ccc;">–</span>';
                        html += `<div class="stats-row"><span>${label}${dateStr}</span>${valStr}</div>`;
                    });

                    if (avg != null) {
                        html += `<div class="stats-row" style="padding-top:3px;border-top:1px solid #eee;margin-top:3px;"><span><b>Average</b></span><span style="${_gradeStyle(avg)}">${_fmtG(avg)}</span></div>`;
                    }
                }

                if (!html) html = '<div class="grades-empty">No grades recorded yet.</div>';
                else if (semAvgs.length === 2) {
                    const yearAvg = semAvgs.reduce((a, b) => a + b, 0) / 2;
                    html += `<div class="grades-year-avg"><span><b>Year average</b></span><span style="${_gradeStyle(yearAvg)}">${_fmtG(yearAvg)}</span></div>`;
                }

                _showAndPosition(html);

            } catch (err) {
                console.warn('openStudentGradesPopup: error reading grade files', err);
                _showAndPosition('<div class="grades-empty">Failed to load grades.</div>');
            }
        }

        // ---- End Student Grades Popup ----


        function _getGroupStudentsFromSession(session, groupKey) {
            if (!session || !session.groups) return null;
            if (Array.isArray(session.groups[groupKey])) return session.groups[groupKey];
            const meta = (typeof rawMeta !== 'undefined' && rawMeta) ? rawMeta[groupKey] : null;
            if (meta) {
                if (meta.name && Array.isArray(session.groups[meta.name])) return session.groups[meta.name];
                if (meta.id && Array.isArray(session.groups[meta.id])) return session.groups[meta.id];
            }
            const keys = Object.keys(session.groups);
            const targetName = meta?.name || groupKey;
            const matchedKey = keys.find(k => k.trim().toLowerCase() === targetName.trim().toLowerCase() || k.trim().toLowerCase() === groupKey.trim().toLowerCase());
            if (matchedKey && Array.isArray(session.groups[matchedKey])) return session.groups[matchedKey];
            return null;
        }

        function _findStudentInSessionList(studentsList, student) {
            if (!Array.isArray(studentsList) || !student) return null;
            const sId = student.id != null ? String(student.id).trim().toUpperCase() : null;
            const sUuid = student.uuid ? String(student.uuid).trim().toUpperCase() : null;
            const sName = (student.name || '').trim().toUpperCase();
            const sFirst = (student.firstName || '').trim().toUpperCase();
            const sLast = (student.lastName || '').trim().toUpperCase();
            const sFull = (sFirst && sLast) ? `${sFirst} ${sLast}` : sName;
            const sFullRev = (sFirst && sLast) ? `${sLast} ${sFirst}` : sName;

            return studentsList.find(s => {
                const curId = s.id != null ? String(s.id).trim().toUpperCase() : null;
                const curUuid = s.uuid ? String(s.uuid).trim().toUpperCase() : null;
                if (sUuid && (curUuid === sUuid || curId === sUuid)) return true;
                if (sId && (curId === sId || curUuid === sId)) return true;
                const curName = (s.name || '').trim().toUpperCase();
                if (curName && (curName === sName || curName === sFull || curName === sFullRev)) return true;
                const curFirst = (s.firstName || '').trim().toUpperCase();
                const curLast = (s.lastName || '').trim().toUpperCase();
                if (curFirst && curLast && sFirst && sLast && curFirst === sFirst && curLast === sLast) return true;
                return false;
            }) || null;
        }

        function resolveBadgeDefinition(badge) {
            if (!badge) return null;
            let icon = '';
            let label = '';
            if (typeof badge === 'object') {
                icon = String(badge.icon || '').trim();
                label = String(badge.label || '').trim();
            } else if (typeof badge === 'string') {
                label = badge.trim();
            }
            const definitions = (typeof badgeDefinitions !== 'undefined' && Array.isArray(badgeDefinitions)) ? badgeDefinitions : [];
            if (icon && label) {
                const exact = definitions.find(def => (def.icon || '').trim() === icon && (def.label || '').trim() === label);
                if (exact) return exact;
            }
            if (icon) {
                const iconMatch = definitions.find(def => (def.icon || '').trim() === icon);
                if (iconMatch) return iconMatch;
            }
            if (label) {
                const labelMatch = definitions.find(def => (def.label || '').trim() === label);
                if (labelMatch) return labelMatch;
                const comboMatch = definitions.find(def => `${(def.icon || '').trim()} ${(def.label || '').trim()}` === label);
                if (comboMatch) return comboMatch;
            }
            return null;
        }

        function resolveBadgeData(badge) {
            const configured = resolveBadgeDefinition(badge);
            const rawCoeff = configured?.coefficient !== undefined ? configured.coefficient : (typeof badge === 'object' ? badge?.coefficient : 1);
            const coefficient = Number.isFinite(Number(rawCoeff)) ? Number(rawCoeff) : 1;
            const tone = configured?.tone || (typeof badge === 'object' ? badge?.tone : 'positive') || 'positive';
            let icon = String(configured?.icon || (typeof badge === 'object' ? badge?.icon : '') || '').trim();
            let label = String(configured?.label || (typeof badge === 'object' ? badge?.label : (typeof badge === 'string' ? badge : 'Badge')) || '').trim();
            return { icon, label, tone, coefficient };
        }

        function countBadgeSentimentForStudent(badges) {
            return (badges || []).reduce((acc, badge) => {
                const data = resolveBadgeData(badge);
                if (data.tone === 'positive') acc.positive += data.coefficient;
                else if (data.tone === 'negative') acc.negative += data.coefficient;
                return acc;
            }, { positive: 0, negative: 0 });
        }

        function getStudentBadgeCounts(badges) {
            const counts = {};
            (badges || []).forEach(b => {
                const data = resolveBadgeData(b);
                const icon = data.icon;
                const label = data.label;
                if (icon) counts[icon] = (counts[icon] || 0) + 1;
                if (label) {
                    const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
                    counts[normalized] = (counts[normalized] || 0) + 1;
                }
            });
            return counts;
        }

        function getStudentSessionNetForStudent(studentMatch) {
            const defs = (typeof badgeDefinitions !== 'undefined' && Array.isArray(badgeDefinitions)) ? badgeDefinitions : [];
            const plusDef = defs.find(d => d.isBuiltin && d.icon === '+');
            const minusDef = defs.find(d => d.isBuiltin && d.icon === '-');
            const fallbackCoeff = (typeof participationSettings !== 'undefined' && participationSettings.plusMinusCoefficient) ? participationSettings.plusMinusCoefficient : 1;
            const plusCoeff = plusDef ? plusDef.coefficient : fallbackCoeff;
            const minusCoeff = minusDef ? minusDef.coefficient : fallbackCoeff;
            const sentiment = countBadgeSentimentForStudent(studentMatch.badges || []);
            const raw = ((studentMatch.pluses || 0) + (studentMatch.teamPluses || 0)) * plusCoeff
                - ((studentMatch.minuses || 0) + (studentMatch.teamMinuses || 0)) * minusCoeff
                + sentiment.positive - sentiment.negative;
            return parseFloat(raw.toFixed(2));
        }

        async function openStudentStatsPopup(studentId) {
            closeRosterContextMenu();
            if (!selectedGroupName || studentId == null) return;

            const students = studentGroups[selectedGroupName] || [];
            const student = students.find(s => s.id === studentId) || students[studentId];
            if (!student) return;

            const popup = document.getElementById('student-stats-popup');
            const nameEl = document.getElementById('student-stats-name');
            const body = document.getElementById('student-stats-body');
            if (!popup || !nameEl || !body) return;

            nameEl.textContent = student.name || '';

            // Current-session figures
            const pluses = student.pluses || 0;
            const minuses = student.minuses || 0;
            const teamPluses = student.teamPluses || 0;
            const teamMinuses = student.teamMinuses || 0;

            const badgeMap = {};
            (student.badges || []).forEach(b => {
                const resolved = resolveBadgeData(b);
                const key = resolved.icon || resolved.label;
                if (!badgeMap[key]) badgeMap[key] = { icon: resolved.icon || resolved.label, label: resolved.label, tone: resolved.tone, count: 0 };
                badgeMap[key].count++;
            });
            const badgeList = Object.values(badgeMap);

            const plusDef = badgeDefinitions.find(d => d.isBuiltin && d.icon === '+');
            const minusDef = badgeDefinitions.find(d => d.isBuiltin && d.icon === '-');
            const plusCoeff = plusDef ? plusDef.coefficient : participationSettings.plusMinusCoefficient;
            const minusCoeff = minusDef ? minusDef.coefficient : participationSettings.plusMinusCoefficient;

            const currentBadgeSentiment = countBadgeSentimentForStudent(student.badges || []);
            const netToday = (pluses + teamPluses) * plusCoeff - (minuses + teamMinuses) * minusCoeff + currentBadgeSentiment.positive - currentBadgeSentiment.negative;

            function fmtNet(n) {
                const num = Number(n) || 0;
                return num > 0 ? '+' + (Number.isInteger(num) ? num : num.toFixed(2)) : (Number.isInteger(num) ? String(num) : num.toFixed(2));
            }
            function valClass(n) { return n > 0 ? 'pos' : (n < 0 ? 'neg' : 'neutral'); }

            const historyLabel = (typeof t === 'function' ? (t('btn_history') || 'History') : 'History');
            const allSessionsLabel = (typeof t === 'function' ? (t('af_all_sessions') || 'All sessions') : 'All sessions');

            let html = '';
            html += '<div class="stats-section-label">This session</div>';

            const todayRows = [];
            if (pluses > 0) todayRows.push(['＋ Pluses', `<span class="stats-row-val pos">+${pluses}</span>`]);
            if (minuses > 0) todayRows.push(['－ Minuses', `<span class="stats-row-val neg">−${minuses}</span>`]);
            if (teamPluses > 0) todayRows.push(['T＋ Team+', `<span class="stats-row-val pos">+${teamPluses}</span>`]);
            if (teamMinuses > 0) todayRows.push(['T－ Team−', `<span class="stats-row-val neg">−${teamMinuses}</span>`]);
            if (badgeList.length > 0) {
                const badgeStr = badgeList.map(b => b.icon + (b.count > 1 ? '×' + b.count : '')).join(' ');
                todayRows.push(['🏅 Badges', `<span class="stats-row-val">${badgeStr}</span>`]);
            }
            if (todayRows.length === 0 && netToday === 0) {
                html += '<div class="stats-row" style="color:#bbb; font-style:italic; font-size:0.8rem;">No activity yet</div>';
            } else {
                todayRows.forEach(([label, val]) => {
                    html += `<div class="stats-row"><span>${label}</span>${val}</div>`;
                });
                html += `<div class="stats-row" style="padding-top:3px; border-top:1px solid #f0f0f0; margin-top:3px;"><span><b>Net today</b></span><span class="stats-row-val ${valClass(netToday)}">${fmtNet(netToday)}</span></div>`;
            }

            html += '<hr class="stats-divider">';
            html += `<div class="stats-section-label">${historyLabel} <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#bbb;">(${allSessionsLabel})</span></div>`;
            html += '<div id="student-stats-history" class="stats-loading">Loading…</div>';

            body.innerHTML = html;

            // Position near the student's roster row
            const studentEl = document.querySelector(`[data-student-id="${studentId}"]`);
            popup.classList.add('open');
            const pad = 8;
            requestAnimationFrame(() => {
                const pw = popup.offsetWidth;
                const ph = popup.offsetHeight;
                let x = window.innerWidth / 2 - pw / 2;
                let y = window.innerHeight / 2 - ph / 2;
                if (studentEl) {
                    const rect = studentEl.getBoundingClientRect();
                    x = rect.right + pad;
                    y = rect.top;
                }
                popup.style.left = Math.min(Math.max(pad, x), window.innerWidth - pw - pad) + 'px';
                popup.style.top = Math.min(Math.max(pad, y), window.innerHeight - ph - pad) + 'px';
            });

            // Async: load historical data (dissociated from auto-flag date range)
            const sessions = await getTimeMachineSessions();
            const histEl = document.getElementById('student-stats-history');
            if (!histEl) return; // popup was closed

            let sessionCount = 0;
            let attendedSessions = 0;
            let hAbsent = 0;
            let hPicks = 0;
            let hPluses = 0, hMinuses = 0, hTeamPluses = 0, hTeamMinuses = 0, hBadgePos = 0, hBadgeNeg = 0;
            let hTeamRoleEvents = 0;
            let hBadgesAccumulated = [];
            const hSessionNets = [];

            sessions.forEach(session => {
                const grpStudents = _getGroupStudentsFromSession(session, selectedGroupName);
                if (!grpStudents) return;

                const match = _findStudentInSessionList(grpStudents, student);
                if (!match) return;

                sessionCount++;
                if (match.isAbsent) {
                    hAbsent++;
                } else {
                    attendedSessions++;
                    hSessionNets.push(getStudentSessionNetForStudent(match));
                }
                if (match.isPicked) hPicks++;

                hPluses += match.pluses || 0;
                hMinuses += match.minuses || 0;
                hTeamPluses += match.teamPluses || 0;
                hTeamMinuses += match.teamMinuses || 0;
                const sBadges = match.badges || [];
                hBadgesAccumulated = hBadgesAccumulated.concat(sBadges);
                const bSent = countBadgeSentimentForStudent(sBadges);
                hBadgePos += bSent.positive;
                hBadgeNeg += bSent.negative;

                const events = (typeof getSessionTeamRoleEvents === 'function') ? getSessionTeamRoleEvents(session, selectedGroupName, student.name) : [];
                hTeamRoleEvents += events.length;
            });

            if (sessionCount === 0) {
                histEl.innerHTML = '<span style="color:#bbb; font-style:italic;">No history found</span>';
                return;
            }

            const totalNet = (hPluses + hTeamPluses) * plusCoeff - (hMinuses + hTeamMinuses) * minusCoeff + hBadgePos - hBadgeNeg;
            const netRatio = attendedSessions > 0 ? parseFloat((totalNet / attendedSessions).toFixed(2)) : 0;
            const posRatio = attendedSessions > 0 ? parseFloat(((hPluses + hTeamPluses + hBadgePos) / attendedSessions).toFixed(2)) : 0;
            const negRatio = attendedSessions > 0 ? parseFloat(((hMinuses + hTeamMinuses + hBadgeNeg) / attendedSessions).toFixed(2)) : 0;
            const trend = (hSessionNets.length > 0) ? (computeTrend(hSessionNets) === 'up' ? '↑ Improving' : computeTrend(hSessionNets) === 'down' ? '↓ Declining' : '→ Stable') : '→ Stable';

            let histHtml = '';
            histHtml += `<div class="stats-row"><span>Sessions</span><span class="stats-row-val neutral">${sessionCount}${hAbsent > 0 ? ` (${attendedSessions} attended)` : ''}</span></div>`;
            if (hPicks > 0) histHtml += `<div class="stats-row"><span>Times Picked</span><span class="stats-row-val neutral">${hPicks}</span></div>`;
            if (hPluses > 0) histHtml += `<div class="stats-row"><span>＋ Pluses</span><span class="stats-row-val pos">+${hPluses}</span></div>`;
            if (hMinuses > 0) histHtml += `<div class="stats-row"><span>－ Minuses</span><span class="stats-row-val neg">−${hMinuses}</span></div>`;
            if (hTeamPluses > 0) histHtml += `<div class="stats-row"><span>T＋ Team+</span><span class="stats-row-val pos">+${hTeamPluses}</span></div>`;
            if (hTeamMinuses > 0) histHtml += `<div class="stats-row"><span>T－ Team−</span><span class="stats-row-val neg">−${hTeamMinuses}</span></div>`;
            if (hBadgePos > 0 || hBadgeNeg > 0) {
                histHtml += `<div class="stats-row"><span>🏅 Badges net</span><span class="stats-row-val ${hBadgePos >= hBadgeNeg ? 'pos' : 'neg'}">${fmtNet(hBadgePos - hBadgeNeg)}</span></div>`;
            }
            histHtml += `<div class="stats-row"><span><b>Total Net</b></span><span class="stats-row-val ${valClass(totalNet)}">${fmtNet(totalNet)}</span></div>`;
            histHtml += `<div class="stats-row" style="padding-top:3px; border-top:1px solid #f0f0f0; margin-top:3px;"><span><b>Net/session</b></span><span class="stats-row-val ${valClass(netRatio)}">${fmtNet(netRatio)}</span></div>`;
            histHtml += `<div class="stats-row"><span>Trend</span><span class="stats-row-val ${hSessionNets.length > 0 && computeTrend(hSessionNets) === 'up' ? 'pos' : (hSessionNets.length > 0 && computeTrend(hSessionNets) === 'down' ? 'neg' : 'neutral')}">${trend}</span></div>`;

            histEl.innerHTML = histHtml;

            // Async: provisional participation grade from pt-rules
            try {
                const rulesMap = await getOrLoadParticipationRules();
                let config = (rulesMap && rulesMap[selectedGroupName]) ? rulesMap[selectedGroupName] : null;
                if (!config && rawMeta && rawMeta[selectedGroupName]) {
                    const m = rawMeta[selectedGroupName];
                    if (m.name && rulesMap && rulesMap[m.name]) config = rulesMap[m.name];
                    else if (m.id && rulesMap && rulesMap[m.id]) config = rulesMap[m.id];
                }
                if (!config && rulesMap && rulesMap['_default']) {
                    config = rulesMap['_default'];
                }

                if (config && config.rules && config.rules.length > 0) {
                    const mockOverviewData = {
                        picks: hPicks,
                        attendedSessions: attendedSessions,
                        pluses: hPluses,
                        minuses: hMinuses,
                        teamPluses: hTeamPluses,
                        teamMinuses: hTeamMinuses,
                        badgePositive: hBadgePos,
                        badgeNegative: hBadgeNeg,
                        badges: hBadgesAccumulated,
                        sessions: sessionCount,
                        absent: hAbsent,
                        teamRoleEvents: hTeamRoleEvents,
                        sessionNets: hSessionNets
                    };

                    const provGrade = calculateStudentProvisionalGrade(mockOverviewData, config, selectedGroupName);

                    if (provGrade !== null) {
                        const maxText = config.scaleToMax ? ` / ${config.maxGrade}` : '';
                        const sessionDenom = Math.max(1, sessionCount || 1);
                        const attendanceRate = sessionCount > 0 ? (attendedSessions / sessionCount) * 100 : 0;
                        const totalGood = hPluses + hTeamPluses + hBadgePos;
                        const totalBad = hMinuses + hTeamMinuses + hBadgeNeg;
                        const ratio = totalBad > 0 ? totalGood / totalBad : (totalGood > 0 ? 999 : 0);
                        const numTrend = (hSessionNets.length > 0) ? (computeTrend(hSessionNets) === 'up' ? 1 : computeTrend(hSessionNets) === 'down' ? -1 : 0) : 0;

                        const trHelper = (key, fallback) => {
                            if (typeof window.t === 'function') {
                                const res = window.t(key);
                                if (res && res !== key) return res;
                            }
                            return fallback;
                        };
                        const achievedRuleLabels = [];
                        config.rules.forEach((rule, idx) => {
                            let studentValue = 0;
                            let label = '';
                            let rulePoints = 0;
                            let possiblePoints = 0;

                            if (rule.metric === 'formula') {
                                let met = false;
                                let maxPts = Number(rule.maxPts) ?? 0;
                                possiblePoints = maxPts;
                                const context = {
                                    netPoints: totalNet, net: totalNet, picks: hPicks, attendanceRate: attendanceRate, attendance: attendanceRate,
                                    positivePoints: hPluses + hTeamPluses, positive: hPluses + hTeamPluses, pluses: hPluses,
                                    minuses: hMinuses, teamPluses: hTeamPluses, teamMinuses: hTeamMinuses,
                                    badgePositive: hBadgePos, badgeNegative: hBadgeNeg,
                                    badgePositiveSession: parseFloat((hBadgePos / sessionDenom).toFixed(2)),
                                    badgeNegativeSession: parseFloat((hBadgeNeg / sessionDenom).toFixed(2)),
                                    sessions: sessionCount,
                                    absent: hAbsent, posRatio: posRatio, negRatio: negRatio, netRatio: netRatio, ratio: ratio,
                                    trend: numTrend, teamRoleEvents: hTeamRoleEvents,
                                    ...getStudentBadgeCounts(hBadgesAccumulated)
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
                                }
                                label = `Criteria: ${rule.value || rule.formulaVal}`;
                                if (met) {
                                    achievedRuleLabels.push(`<span style="color:#2ca02c; font-weight:600;">✓ ${label} (${formatSummaryNumber(rulePoints)} / ${formatSummaryNumber(possiblePoints)} pts)</span>`);
                                } else {
                                    achievedRuleLabels.push(`<span style="color:#888;">✗ ${label} (0 / ${formatSummaryNumber(possiblePoints)} pts)</span>`);
                                }
                            } else {
                                if (rule.metric === 'netPoints') { studentValue = totalNet; label = `${trHelper('ptStatsNetPoints', 'Net Points')}: ${totalNet}`; }
                                else if (rule.metric === 'picks') { studentValue = hPicks; label = `${trHelper('ptStatsTimesPicked', 'Times Picked')}: ${hPicks}`; }
                                else if (rule.metric === 'attendanceRate') { studentValue = attendanceRate; label = `${trHelper('ptStatsSessionsRecorded', 'Attendance Rate')}: ${attendanceRate.toFixed(0)}%`; }
                                else if (rule.metric === 'positivePoints') { studentValue = hPluses + hTeamPluses; label = `${trHelper('ptStatPluses', 'Positive Points')}: ${hPluses + hTeamPluses}`; }
                                else if (rule.metric === 'badgePositive') { studentValue = hBadgePos; label = `${trHelper('ptStatsPosBadges', 'Positive Badges')}: ${hBadgePos}`; }
                                else if (rule.metric === 'badgeNegative') { studentValue = hBadgeNeg; label = `${trHelper('ptColBadgeMinus', 'Negative Badges')}: ${hBadgeNeg}`; }
                                else if (rule.metric === 'badgePositiveSession') { studentValue = parseFloat((hBadgePos / sessionDenom).toFixed(2)); label = `+Badges/session: ${studentValue}`; }
                                else if (rule.metric === 'badgeNegativeSession') { studentValue = parseFloat((hBadgeNeg / sessionDenom).toFixed(2)); label = `-Badges/session: ${studentValue}`; }
                                else if (rule.metric === 'pluses') { studentValue = hPluses; label = `${trHelper('ptColPluses', 'Pluses')}: ${hPluses}`; }
                                else if (rule.metric === 'minuses') { studentValue = hMinuses; label = `${trHelper('ptColMinuses', 'Minuses')}: ${hMinuses}`; }
                                else if (rule.metric === 'teamPluses') { studentValue = hTeamPluses; label = `${trHelper('ptColT', 'Team Pluses')}: ${hTeamPluses}`; }
                                else if (rule.metric === 'teamMinuses') { studentValue = hTeamMinuses; label = `${trHelper('ptColTm', 'Team Minuses')}: ${hTeamMinuses}`; }
                                else if (rule.metric === 'absent') { studentValue = hAbsent; label = `${trHelper('ptColAbsent', 'Absences')}: ${hAbsent}`; }
                                else if (rule.metric === 'sessions') { studentValue = sessionCount; label = `${trHelper('ptColSess', 'Total Sessions')}: ${sessionCount}`; }
                                else if (rule.metric === 'posRatio') { studentValue = posRatio; label = `${trHelper('ptColPosRatio', '+/session')}: ${posRatio.toFixed(2)}`; }
                                else if (rule.metric === 'negRatio') { studentValue = negRatio; label = `${trHelper('ptColNegRatio', '-/session')}: ${negRatio.toFixed(2)}`; }
                                else if (rule.metric === 'netRatio') { studentValue = netRatio; label = `${trHelper('ptColNetRatio', 'Net/session')}: ${netRatio.toFixed(2)}`; }
                                else if (rule.metric === 'ratio') { studentValue = ratio; label = `${trHelper('ptColGoodBad', 'Good/Bad Ratio')}: ${ratio === 999 ? '∞' : ratio.toFixed(2)}`; }
                                else if (rule.metric === 'trend') { studentValue = numTrend; label = `${trHelper('ptColTrend', 'Performance Trend')}: ${numTrend === 1 ? 'Up' : numTrend === -1 ? 'Down' : 'Flat'}`; }
                                else if (rule.metric === 'teamRoleEvents') { studentValue = hTeamRoleEvents; label = `${trHelper('ptColTeamRole', 'Team/Role Activity')}: ${hTeamRoleEvents}`; }
                                else if (rule.metric.startsWith('badge_icon_session:')) {
                                    const icon = rule.metric.replace('badge_icon_session:', '');
                                    studentValue = parseFloat(((getStudentBadgeCounts(hBadgesAccumulated)[icon] || 0) / sessionDenom).toFixed(2));
                                    label = `${icon}/session: ${studentValue}`;
                                } else if (rule.metric.startsWith('badge_label_session:')) {
                                    const bLabel = rule.metric.replace('badge_label_session:', '');
                                    const key = bLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    studentValue = parseFloat(((getStudentBadgeCounts(hBadgesAccumulated)[key] || 0) / sessionDenom).toFixed(2));
                                    label = `${bLabel}/session: ${studentValue}`;
                                } else if (rule.metric.startsWith('badge_icon:')) {
                                    const icon = rule.metric.replace('badge_icon:', '');
                                    studentValue = getStudentBadgeCounts(hBadgesAccumulated)[icon] || 0;
                                    label = `${icon} (Total): ${studentValue}`;
                                } else if (rule.metric.startsWith('badge_label:')) {
                                    const bLabel = rule.metric.replace('badge_label:', '');
                                    const key = bLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    studentValue = getStudentBadgeCounts(hBadgesAccumulated)[key] || 0;
                                    label = `${bLabel} (Total): ${studentValue}`;
                                }

                                rulePoints = calculateCriterionPoints(studentValue, rule);
                                possiblePoints = Number(rule.maxPts) ?? 0;

                                const isMet = rulePoints > (Number(rule.minPts) || 0);
                                if (isMet) {
                                    achievedRuleLabels.push(`<span style="color:#2ca02c; font-weight:600;">✓ ${label} (${formatSummaryNumber(rulePoints)} / ${formatSummaryNumber(possiblePoints)} pts)</span>`);
                                } else {
                                    achievedRuleLabels.push(`<span style="color:#888;">✗ ${label} (${formatSummaryNumber(rulePoints)} / ${formatSummaryNumber(possiblePoints)} pts)</span>`);
                                }
                            }
                        });

                        const provGradeHtml = `
                            <hr class="stats-divider">
                            <div class="detail-stat" style="display: flex; flex-direction: column; gap: 4px; border-left-color: #2ca02c; background: #f4faf4; margin-top: 6px; padding: 8px 10px; border-radius: 6px; border-left: 4px solid #2ca02c;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div class="detail-stat-label" style="color: #2ca02c; font-weight:700; margin-bottom: 0;">${trHelper('ptProvisionalGradeTitle', 'Provisional Participation Grade')}</div>
                                    <div class="detail-stat-value" style="color: #2ca02c; font-size: 1.15rem;">${formatSummaryNumber(provGrade)}${maxText}</div>
                                </div>
                                ${achievedRuleLabels.length > 0 ? `
                                <div style="font-size:11px; text-align:left; border-top: 1px solid #c8e6c9; padding-top: 5px; margin-top: 2px;">
                                    <strong style="color:#555;">${trHelper('ptAchievedRulesTitle', 'Criteria Met')}</strong><br>
                                    ${achievedRuleLabels.join('<br>')}
                                </div>` : ''}
                            </div>
                        `;
                        body.insertAdjacentHTML('beforeend', provGradeHtml);
                    }
                }
            } catch (err) {
                console.warn('openStudentStatsPopup: error computing provisional grade', err);
            }

            // Re-position after content update (height may have grown)
            requestAnimationFrame(() => {
                const ph2 = popup.offsetHeight;
                const curTop = parseFloat(popup.style.top) || 0;
                if (curTop + ph2 > window.innerHeight - pad) {
                    popup.style.top = Math.max(pad, window.innerHeight - ph2 - pad) + 'px';
                }
            });
        }

        // ---- End Student Stats Popup ----

        // ---- Provisional Participation Grade Calculation Helpers ----
        async function getOrLoadParticipationRules() {
            if (window.CMS_PARTICIPATION_RULES) return window.CMS_PARTICIPATION_RULES;
            window.CMS_PARTICIPATION_RULES = {};
            if (window.Desktop && typeof Desktop.readText === 'function') {
                try {
                    const rp = await Desktop.readText('groupParticipation', 'pt-rules.js');
                    if (rp?.ok && rp.content) {
                        const m = rp.content.match(/window\.CMS_PARTICIPATION_RULES\s*=\s*(\{[\s\S]*\});?\s*$/);
                        if (m) {
                            window.CMS_PARTICIPATION_RULES = JSON.parse(m[1]);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to load pt-rules.js:', e);
                }
            }
            return window.CMS_PARTICIPATION_RULES;
        }

        function countBadgeSentimentForStudent(badges) {
            return (badges || []).reduce((acc, b) => {
                const icon = b.icon || '';
                const tone = b.tone || 'positive';
                const def = (typeof badgeDefinitions !== 'undefined' && Array.isArray(badgeDefinitions)) ? badgeDefinitions.find(d => d.icon === icon) : null;
                const coeff = def ? (def.coefficient || 1) : (b.coefficient || 1);
                if (tone === 'negative') acc.negative += coeff;
                else acc.positive += coeff;
                return acc;
            }, { positive: 0, negative: 0 });
        }

        function getStudentBadgeCounts(badges) {
            const counts = {};
            (badges || []).forEach(b => {
                const icon = String(b.icon || '').trim();
                const label = String(b.label || b.icon || '').trim();
                if (icon) counts[icon] = (counts[icon] || 0) + 1;
                if (label) {
                    const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
                    counts[normalized] = (counts[normalized] || 0) + 1;
                }
            });
            return counts;
        }

        function getStudentSessionNetForStudent(studentMatch) {
            const defs = (typeof badgeDefinitions !== 'undefined' && Array.isArray(badgeDefinitions)) ? badgeDefinitions : [];
            const plusDef = defs.find(d => d.isBuiltin && d.icon === '+');
            const minusDef = defs.find(d => d.isBuiltin && d.icon === '-');
            const fallbackCoeff = (typeof participationSettings !== 'undefined' && participationSettings.plusMinusCoefficient) ? participationSettings.plusMinusCoefficient : 1;
            const plusCoeff = plusDef ? plusDef.coefficient : fallbackCoeff;
            const minusCoeff = minusDef ? minusDef.coefficient : fallbackCoeff;
            const sentiment = countBadgeSentimentForStudent(studentMatch.badges || []);
            const raw = ((studentMatch.pluses || 0) + (studentMatch.teamPluses || 0)) * plusCoeff
                - ((studentMatch.minuses || 0) + (studentMatch.teamMinuses || 0)) * minusCoeff
                + sentiment.positive - sentiment.negative;
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
            if (diff > 0.5) return 'up';
            if (diff < -0.5) return 'down';
            return 'flat';
        }

        function tokenize(str) {
            const tokens = [];
            let i = 0;
            while (i < str.length) {
                const char = str[i];
                if (/\s/.test(char)) { i++; continue; }
                if (char === '[') {
                    let start = i + 1;
                    let end = str.indexOf(']', start);
                    if (end === -1) throw new Error('Unterminated bracket in formula');
                    tokens.push({ type: 'IDENTIFIER', value: str.substring(start, end) });
                    i = end + 1;
                    continue;
                }
                if (char === '"' || char === "'") {
                    let quote = char;
                    let start = i + 1;
                    let end = str.indexOf(quote, start);
                    if (end === -1) throw new Error('Unterminated string literal');
                    tokens.push({ type: 'STRING', value: str.substring(start, end) });
                    i = end + 1;
                    continue;
                }
                if (/\d/.test(char) || (char === '.' && /\d/.test(str[i + 1]))) {
                    let numStr = '';
                    while (i < str.length && (/\d/.test(str[i]) || str[i] === '.')) {
                        numStr += str[i]; i++;
                    }
                    tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
                    continue;
                }
                if (i + 1 < str.length) {
                    const two = str.substr(i, 2);
                    if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
                        tokens.push({ type: 'OPERATOR', value: two }); i += 2; continue;
                    }
                }
                if ('+-*/(),><=!'.includes(char)) {
                    tokens.push({ type: 'OPERATOR', value: char }); i++; continue;
                }
                let identStr = '';
                while (i < str.length && (!/\s/.test(str[i]) && !'+-*/(),><=![]"\''.includes(str[i]))) {
                    identStr += str[i]; i++;
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
            let tokens;
            try { tokens = tokenize(exprStr); } catch (e) { throw new Error(`Syntax Error: ${e.message}`); }
            let position = 0;
            function peek() { return tokens[position]; }
            function consume(expectedValue) {
                const token = peek();
                if (!token) throw new Error('Unexpected end of formula');
                if (expectedValue !== undefined && token.value !== expectedValue) throw new Error(`Expected '${expectedValue}' but found '${token.value}'`);
                position++;
                return token;
            }
            function parsePrimary() {
                const token = peek();
                if (!token) throw new Error('Unexpected end of formula');
                if (token.type === 'NUMBER') { consume(); return token.value; }
                if (token.type === 'STRING') { consume(); return token.value; }
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
                    consume('('); const val = parseExpression(); consume(')'); return val;
                }
                throw new Error(`Unexpected token: ${token.value}`);
            }
            function parseUnary() {
                const token = peek();
                if (token && token.type === 'OPERATOR' && (token.value === '!' || token.value === '-')) {
                    consume(); const val = parseUnary(); return token.value === '!' ? !val : -val;
                }
                return parsePrimary();
            }
            function parseMultiplicative() {
                let val = parseUnary();
                while (true) {
                    const token = peek();
                    if (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
                        consume(); const right = parseUnary(); val = token.value === '*' ? val * right : val / right;
                    } else break;
                }
                return val;
            }
            function parseAdditive() {
                let val = parseMultiplicative();
                while (true) {
                    const token = peek();
                    if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
                        consume(); const right = parseMultiplicative(); val = token.value === '+' ? val + right : val - right;
                    } else break;
                }
                return val;
            }
            function parseComparison() {
                let val = parseAdditive();
                while (true) {
                    const token = peek();
                    if (token && token.type === 'OPERATOR' && (token.value === '>' || token.value === '<' || token.value === '>=' || token.value === '<=')) {
                        consume(); const right = parseAdditive();
                        if (token.value === '>') val = val > right;
                        else if (token.value === '<') val = val < right;
                        else if (token.value === '>=') val = val >= right;
                        else if (token.value === '<=') val = val <= right;
                    } else break;
                }
                return val;
            }
            function parseEquality() {
                let val = parseComparison();
                while (true) {
                    const token = peek();
                    if (token && token.type === 'OPERATOR' && (token.value === '==' || token.value === '!=' || token.value === '=')) {
                        consume(); const right = parseComparison();
                        if (token.value === '!=' || token.value === '!==') val = val != right;
                        else val = val == right;
                    } else break;
                }
                return val;
            }
            function parseLogicalAnd() {
                let val = parseEquality();
                while (true) {
                    const token = peek();
                    if (token && token.type === 'OPERATOR' && token.value === '&&') {
                        consume(); const right = parseEquality(); val = val && right;
                    } else break;
                }
                return val;
            }
            function parseLogicalOr() {
                let val = parseLogicalAnd();
                while (true) {
                    const token = peek();
                    if (token && token.type === 'OPERATOR' && token.value === '||') {
                        consume(); const right = parseLogicalAnd(); val = val || right;
                    } else break;
                }
                return val;
            }
            function parseExpression() { return parseLogicalOr(); }
            const result = parseExpression();
            if (position < tokens.length) throw new Error(`Extra characters at end of formula: ${tokens[position].value}`);
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

        function calculateStudentProvisionalGradeDetails(studentData, groupRulesConfig, groupName) {
            if (!groupRulesConfig || !groupRulesConfig.rules || groupRulesConfig.rules.length === 0) {
                return null;
            }

            const totalSessions = studentData.sessions || 0;
            const sessionDenom = Math.max(1, totalSessions || 1);
            const picks = studentData.picks || 0;
            const net = (studentData.pluses + studentData.teamPluses + studentData.badgePositive) - (studentData.minuses + studentData.teamMinuses + studentData.badgeNegative);
            const attendanceRate = totalSessions > 0 ? (studentData.attendedSessions / totalSessions) * 100 : 0;
            const badgePositive = studentData.badgePositive || 0;
            const positivePoints = (studentData.pluses || 0) + (studentData.teamPluses || 0);
            const badgeCounts = getStudentBadgeCounts(studentData.badges);

            const badgeSessionCounts = {};
            Object.keys(badgeCounts).forEach(k => {
                const val = parseFloat((badgeCounts[k] / sessionDenom).toFixed(2));
                badgeSessionCounts[k + '_session'] = val;
                badgeSessionCounts[k + '_per_session'] = val;
            });

            const attendedSessions = studentData.attendedSessions || 0;
            const posRatio = attendedSessions ? (studentData.pluses + studentData.teamPluses + studentData.badgePositive) / attendedSessions : 0;
            const negRatio = attendedSessions ? (studentData.minuses + studentData.teamMinuses + studentData.badgeNegative) / attendedSessions : 0;
            const netRatio = attendedSessions ? net / attendedSessions : 0;
            const totalGood = studentData.pluses + studentData.teamPluses + studentData.badgePositive;
            const totalBad = studentData.minuses + studentData.teamMinuses + studentData.badgeNegative;
            const ratio = totalBad > 0 ? totalGood / totalBad : (totalGood > 0 ? 999 : 0);
            const trend = (studentData.sessionNets && typeof computeTrend !== 'undefined') ? (computeTrend(studentData.sessionNets) === 'up' ? 1 : computeTrend(studentData.sessionNets) === 'down' ? -1 : 0) : 0;

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
                        positivePoints: positivePoints, positive: positivePoints, pluses: studentData.pluses,
                        minuses: studentData.minuses, teamPluses: studentData.teamPluses, teamMinuses: studentData.teamMinuses,
                        badgePositive: badgePositive, badgeNegative: studentData.badgeNegative,
                        badgePositiveSession: parseFloat((badgePositive / sessionDenom).toFixed(2)),
                        badgeNegativeSession: parseFloat((studentData.badgeNegative / sessionDenom).toFixed(2)),
                        sessions: studentData.sessions,
                        absent: studentData.absent, posRatio: posRatio, negRatio: negRatio, netRatio: netRatio, ratio: ratio,
                        trend: trend, teamRoleEvents: studentData.teamRoleEvents, ...badgeCounts, ...badgeSessionCounts
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
                    else if (rule.metric === 'badgeNegative') studentValue = studentData.badgeNegative;
                    else if (rule.metric === 'pluses') studentValue = studentData.pluses;
                    else if (rule.metric === 'minuses') studentValue = studentData.minuses;
                    else if (rule.metric === 'teamPluses') studentValue = studentData.teamPluses;
                    else if (rule.metric === 'teamMinuses') studentValue = studentData.teamMinuses;
                    else if (rule.metric === 'absent') studentValue = studentData.absent;
                    else if (rule.metric === 'sessions') studentValue = studentData.sessions;
                    else if (rule.metric === 'posRatio') studentValue = posRatio;
                    else if (rule.metric === 'negRatio') studentValue = negRatio;
                    else if (rule.metric === 'netRatio') studentValue = netRatio;
                    else if (rule.metric === 'ratio') studentValue = ratio;
                    else if (rule.metric === 'trend') studentValue = trend;
                    else if (rule.metric === 'teamRoleEvents') studentValue = studentData.teamRoleEvents;
                    else if (rule.metric === 'badgePositiveSession') studentValue = parseFloat((badgePositive / Math.max(1, studentData.sessions || 1)).toFixed(2));
                    else if (rule.metric === 'badgeNegativeSession') studentValue = parseFloat((studentData.badgeNegative / Math.max(1, studentData.sessions || 1)).toFixed(2));
                    else if (rule.metric.startsWith('badge_icon_session:')) {
                        const icon = rule.metric.replace('badge_icon_session:', '');
                        studentValue = parseFloat(((badgeCounts[icon] || 0) / Math.max(1, studentData.sessions || 1)).toFixed(2));
                    } else if (rule.metric.startsWith('badge_label_session:')) {
                        const labelKey = rule.metric.replace('badge_label_session:', '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        studentValue = parseFloat(((badgeCounts[labelKey] || 0) / Math.max(1, studentData.sessions || 1)).toFixed(2));
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

                ruleDetails.push({
                    ruleIndex: idx,
                    metric: rule.metric,
                    rawPoints: parseFloat(rulePoints.toFixed(2)),
                    maxPts: effectiveMaxPts
                });
            });

            let finalGrade = 0;
            const maxGrade = Number(groupRulesConfig.maxGrade) || 20;

            if (groupRulesConfig.scaleToMax) {
                if (totalPossiblePoints > 0) {
                    finalGrade = parseFloat(((achievedPoints / totalPossiblePoints) * maxGrade).toFixed(2));
                }
            } else {
                finalGrade = parseFloat(achievedPoints.toFixed(2));
            }

            return {
                grade: finalGrade,
                totalPoints: achievedPoints,
                totalPossible: totalPossiblePoints,
                rules: ruleDetails
            };
        }

        function calculateStudentProvisionalGrade(studentData, groupRulesConfig, groupName) {
            const details = calculateStudentProvisionalGradeDetails(studentData, groupRulesConfig, groupName);
            return details ? details.grade : null;
        }

        function formatSummaryNumber(value, decimals = 2) {
            const num = Number(value) || 0;
            if (Number.isInteger(num)) return String(num);
            return num.toFixed(decimals).replace(/\.00$/, '');
        }

        function renameTeam(teamId) {
            const teamIndex = (teamId - 1) % teamColors.length;
            const currentName = teamColors[teamIndex].customName || teamColors[teamIndex].name;
            showPrompt(`Enter a new name for the ${currentName} team:`, currentName, function (newName) {
                if (newName !== null && newName.trim() !== "") {
                    teamColors[teamIndex].customName = newName.trim();
                    saveSessionTeamNames();
                    renderRoster();
                    if (typeof renderRanking === 'function') renderRanking();
                    if (typeof autosaveToDb === 'function') {
                        dbAutosaveLastFingerprint = '';
                        autosaveToDb('team-rename');
                    }
                }
            });
        }

        let draggedStudentId = null;

        function dragStart(e) {
            draggedStudentId = e.currentTarget.getAttribute('data-student-id');
            e.currentTarget.style.opacity = '0.4';
            e.dataTransfer.effectAllowed = 'move';
        }

        function dragEnd(e) {
            e.currentTarget.style.opacity = '1';
            // Remove highlight from all potential drop zones
            document.querySelectorAll('.roster-item, [data-team-id]').forEach(el => {
                el.style.border = '';
            });
        }

        function dragOver(e) {
            e.preventDefault(); // Necessary to allow drop
            e.dataTransfer.dropEffect = 'move';
            // Subtly highlight the target
            e.currentTarget.style.border = '2px dashed #666';
        }

        function dragLeave(e) {
            e.currentTarget.style.border = '';
        }

        function dropOnTeam(e) {
            e.preventDefault();
            e.currentTarget.style.border = '';

            // 1. Identify the Target Team
            let targetTeamId = e.currentTarget.getAttribute('data-team-id');
            if (!targetTeamId) {
                const targetStudentId = e.currentTarget.getAttribute('data-student-id');
                const targetStudent = studentGroups[selectedGroupName].find(s => s.id == targetStudentId);
                targetTeamId = targetStudent ? targetStudent.teamId : null;
            }
            targetTeamId = parseInt(targetTeamId);

            // 2. Handle Case: Dragging a Team Header onto another Header (Merge)
            const sourceTeamId = parseInt(e.dataTransfer.getData('sourceTeamId'));

            if (sourceTeamId && targetTeamId && sourceTeamId !== targetTeamId) {
                showConfirm(`Merge all students from Team ${sourceTeamId} into Team ${targetTeamId}?`, function () {
                    let movedCount = 0;
                    studentGroups[selectedGroupName].forEach(s => {
                        if (s.teamId === sourceTeamId) {
                            s.teamId = targetTeamId;
                            movedCount++;
                            logHistory('teams', s.name, `Assigned to Team ${targetTeamId} (from Team ${sourceTeamId})`);
                        }
                    });
                    logHistory('teams', selectedGroupName, `Merged Team ${sourceTeamId} into Team ${targetTeamId} (${movedCount} students)`);
                    renderRoster();
                    renderRanking();
                });
                return; // Exit after merging
            }

            // 3. Handle Case: Dragging a Single Student (Original functionality)
            if (draggedStudentId && targetTeamId) {
                const student = studentGroups[selectedGroupName].find(s => s.id == draggedStudentId);
                if (student) {
                    const oldTeamId = student.teamId;
                    student.teamId = targetTeamId;
                    if (oldTeamId !== targetTeamId) {
                        logHistory('teams', student.name, `Moved from Team ${oldTeamId || '-'} to Team ${targetTeamId}`);
                    }
                    renderRoster();
                    renderRanking();
                }
            }
            draggedStudentId = null;
        }

        function mod(id, type, val) {
            const group = studentGroups[selectedGroupName];
            const student = group.find(s => s.id === id);
            if (!student) return;

            const now = new Date();
            const bTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const bTimestamp = now.toISOString();

            if (type === 'p') {
                student.pluses = Math.max(0, (student.pluses || 0) + val);
                if (!student.plusHistory) student.plusHistory = [];
                if (val > 0) {
                    for (let i = 0; i < val; i++) student.plusHistory.push({ time: bTime, timestamp: bTimestamp });
                } else {
                    for (let i = 0; i < Math.abs(val); i++) student.plusHistory.pop();
                }
            } else {
                student.minuses = Math.max(0, (student.minuses || 0) + val);
                if (!student.minusHistory) student.minusHistory = [];
                if (val > 0) {
                    for (let i = 0; i < val; i++) student.minusHistory.push({ time: bTime, timestamp: bTimestamp });
                } else {
                    for (let i = 0; i < Math.abs(val); i++) student.minusHistory.pop();
                }
            }

            if (val > 0) {
                const modIcon = type === 'p' ? '+' : '-';
                const modBadgeDef = (badgeDefinitions || []).find(d => d.icon === modIcon && d.isBuiltin);
                const shouldStrike = modBadgeDef ? modBadgeDef.strikeOnAward : true;
                if (shouldStrike) student.isPicked = true;
            }

            // Play score sound + flash feedback
            if (val > 0) {
                if (type === 'p') playScoreJingle(); else playScoreBuzzer();
                showScoreFlash(type === 'p' ? '+1' : '−1', type === 'p' ? '#16a34a' : '#dc2626');
            }

            // Log to history
            if (val > 0) {
                logHistory(type === 'p' ? 'plus' : 'minus', student.name, type === 'p' ? '+1 point' : '-1 point', { studentId: student.id, value: type === 'p' ? 1 : -1, time: bTime, timestamp: bTimestamp });
            } else {
                logHistory('remove', student.name, type === 'p' ? 'corrected +1' : 'corrected -1', { studentId: student.id, value: type === 'p' ? -1 : 1, time: bTime, timestamp: bTimestamp });
            }

            renderRoster();
            renderRanking();
            if (val > 0) _broadcastAnimation('score-flash', { label: type === 'p' ? '+1' : '−1', color: type === 'p' ? '#16a34a' : '#dc2626' });
            if (typeof queueDbAutosave === 'function') queueDbAutosave('score', 300);
            if (typeof _remotePushStateDebounced === 'function') _remotePushStateDebounced();
        }

        // New Function for Team-Wide Scoring
        function modTeam(teamId, type, val, studentId) {
            const group = studentGroups[selectedGroupName];
            const now = new Date();
            const bTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const bTimestamp = now.toISOString();

            if (teamId === null || teamId === undefined || teamId === 'null') {
                const student = group.find(s => s.id === studentId);
                if (student) {
                    if (type === 'p') {
                        student.teamPluses = Math.max(0, (student.teamPluses || 0) + val);
                        if (!student.teamPlusHistory) student.teamPlusHistory = [];
                        if (val > 0) {
                            for (let i = 0; i < val; i++) student.teamPlusHistory.push({ time: bTime, timestamp: bTimestamp });
                        } else {
                            for (let i = 0; i < Math.abs(val); i++) student.teamPlusHistory.pop();
                        }
                    } else {
                        student.teamMinuses = Math.max(0, (student.teamMinuses || 0) + val);
                        if (!student.teamMinusHistory) student.teamMinusHistory = [];
                        if (val > 0) {
                            for (let i = 0; i < val; i++) student.teamMinusHistory.push({ time: bTime, timestamp: bTimestamp });
                        } else {
                            for (let i = 0; i < Math.abs(val); i++) student.teamMinusHistory.pop();
                        }
                    }
                    logHistory('remove', student.name, type === 'p' ? 'corrected team +1' : 'corrected team -1', { studentId: student.id, value: type === 'p' ? -1 : 1, time: bTime, timestamp: bTimestamp });
                }
                renderRoster();
                renderRanking();
                if (typeof queueDbAutosave === 'function') queueDbAutosave('team-score', 300);
                if (typeof _remotePushStateDebounced === 'function') _remotePushStateDebounced();
                return;
            }

            const targets = group.filter(s => s.teamId === teamId);

            targets.forEach(s => {
                if (type === 'p') {
                    s.teamPluses = Math.max(0, (s.teamPluses || 0) + val);
                    if (!s.teamPlusHistory) s.teamPlusHistory = [];
                    if (val > 0) {
                        for (let i = 0; i < val; i++) s.teamPlusHistory.push({ time: bTime, timestamp: bTimestamp, teamId });
                    } else {
                        for (let i = 0; i < Math.abs(val); i++) s.teamPlusHistory.pop();
                    }
                } else {
                    s.teamMinuses = Math.max(0, (s.teamMinuses || 0) + val);
                    if (!s.teamMinusHistory) s.teamMinusHistory = [];
                    if (val > 0) {
                        for (let i = 0; i < val; i++) s.teamMinusHistory.push({ time: bTime, timestamp: bTimestamp, teamId });
                    } else {
                        for (let i = 0; i < Math.abs(val); i++) s.teamMinusHistory.pop();
                    }
                }
            });

            // Play score sound + flash feedback
            if (val > 0) {
                if (type === 'p') playScoreJingle(); else playScoreBuzzer();
                showScoreFlash(type === 'p' ? 'T+1' : 'T−1', type === 'p' ? '#2563eb' : '#dc2626');
            }

            const teamIndex = Number(teamId) - 1;
            if (!Number.isInteger(teamIndex) || teamIndex < 0) return;
            const tColor = teamColors[teamIndex];
            if (!tColor) return;
            const tName = tColor.customName || tColor.name + ' Team';
            if (val > 0) {
                logHistory(type === 'p' ? 'team-plus' : 'team-minus', tName, (type === 'p' ? 't+1' : 't-1') + ' to whole team', { teamId: teamId, value: type === 'p' ? 1 : -1, time: bTime, timestamp: bTimestamp });
            } else {
                logHistory('remove', tName, type === 'p' ? 'corrected team +1' : 'corrected team -1', { teamId: teamId, value: type === 'p' ? -1 : 1, time: bTime, timestamp: bTimestamp });
            }

            renderRoster();
            renderRanking();
            if (val > 0) _broadcastAnimation('score-flash', { label: type === 'p' ? 'T+1' : 'T−1', color: type === 'p' ? '#2563eb' : '#dc2626' });
            if (typeof queueDbAutosave === 'function') queueDbAutosave('team-score', 300);
        }

        function renderRanking() {
            if (!selectedGroupName) return;
            const listEl = document.getElementById('ranking-list');
            const rankedStudents = [...studentGroups[selectedGroupName]]
                .map(s => ({ ...s, score: ((s.pluses || 0) + (s.teamPluses || 0)) - ((s.minuses || 0) + (s.teamMinuses || 0)) }))
                .sort((a, b) => (b.score !== a.score) ? b.score - a.score : compareStudentsByName(a, b));

            listEl.innerHTML = "";
            rankedStudents.forEach((student, index) => {
                const li = document.createElement('li');
                li.className = 'ranking-item';
                const scoreClass = student.score > 0 ? 'positive' : student.score < 0 ? 'negative' : 'neutral';
                li.innerHTML = `
                <span class="rank-position">${index + 1}.</span>
                <span class="rank-name">${getDisplayName(student)}</span>
                <span class="rank-score ${scoreClass}">${student.score > 0 ? '+' : ''}${student.score}</span>
            `;
                listEl.appendChild(li);
            });
        }

        function openRankingModal() { openResultsRankingModal(); }

        function closeRankingModal() { closeResultsRankingModal(); }

        function toggleRanking() { openResultsRankingModal(); }

        function toggleStrike(id) {
            const student = studentGroups[selectedGroupName].find(s => s.id === id);
            if (!student || student.isAbsent) return;
            student.isPicked = !student.isPicked;
            renderRoster();
            if (typeof queueDbAutosave === 'function') queueDbAutosave('strike', 500);
        }

        function changeStudentRole(id) {
            const student = studentGroups[selectedGroupName].find(s => s.id === id);
            if (!student) return;

            const allRoles = [...new Set([...literatureRoles, ...activeRolePool])];
            const popup = document.getElementById('role-change-popup');
            document.getElementById('role-change-name').textContent = student.name;

            const listEl = document.getElementById('role-change-list');
            listEl.innerHTML = '';

            if (allRoles.length > 0) {
                allRoles.forEach(role => {
                    const btn = document.createElement('button');
                    btn.textContent = role;
                    btn.className = 'role-change-btn' + (student.role === role ? ' active' : '');
                    btn.onclick = function () {
                        setStudentRole(student, role);
                        popup.classList.remove('open');
                    };
                    listEl.appendChild(btn);
                });
            }

            // Always allow custom entry
            const customBtn = document.createElement('button');
            customBtn.textContent = '✏️ Custom…';
            customBtn.className = 'role-change-btn role-change-custom';
            customBtn.onclick = function () {
                popup.classList.remove('open');
                showPrompt('Enter custom role:', student.role || '', function (newRole) {
                    if (newRole !== null) {
                        if (newRole.trim()) setStudentRole(student, newRole.trim());
                        else setStudentRole(student, null);
                    }
                });
            };
            listEl.appendChild(customBtn);

            const clearBtn = document.createElement('button');
            clearBtn.textContent = '✕ Remove Role';
            clearBtn.className = 'role-change-btn role-change-clear';
            clearBtn.onclick = function () {
                setStudentRole(student, null);
                popup.classList.remove('open');
            };
            listEl.appendChild(clearBtn);

            popup.classList.add('open');
        }

        function addStudentToGroup() {
            if (!selectedGroupName) { showToast('Please select a group first!'); return; }
            showPrompt('Enter student name:', '', function (name) {
                if (!name || !name.trim()) return;
                const trimmed = name.trim().toUpperCase();
                const existing = studentGroups[selectedGroupName] || [];
                const seen = new Set(existing.map(s => s.id));
                const newId = _generateUniqueStudentSessionId(seen);
                existing.push({
                    id: newId,
                    name: trimmed,
                    isPicked: false,
                    isAbsent: false,
                    pluses: 0,
                    minuses: 0,
                    teamPluses: 0,
                    teamMinuses: 0,
                    teamId: currentTeamsActive ? null : null
                });
                studentGroups[selectedGroupName] = _ensureUniqueStudentSessionIds(existing);
                syncRawDataFromGroup(selectedGroupName);
                renderRoster();
                renderRanking();
            }); // end showPrompt callback
        }

        function syncRawDataFromGroup(groupName) {
            if (!groupName || !studentGroups[groupName]) return;
            rawData[groupName] = studentGroups[groupName].map(s => String(s.name || '').trim().toUpperCase()).filter(Boolean);
        }

        function resetStrikesOnly() {
            studentGroups[selectedGroupName].forEach(s => s.isPicked = !!s.isAbsent);
            renderRoster();
        }

        function manualResetFull() {
            showConfirm("Wipe points?", function () {
                studentGroups[selectedGroupName].forEach(s => {
                    s.pluses = 0; s.minuses = 0; s.teamPluses = 0; s.teamMinuses = 0; s.badges = [];
                    s.plusHistory = []; s.minusHistory = []; s.teamPlusHistory = []; s.teamMinusHistory = [];
                });
                renderRoster();
                renderRanking();
                if (typeof autosaveToDb === 'function') autosaveToDb('reset-points');
            });
        }

        function copyData() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) return;
            if (!selectedGroupName) {
                showToast(t('alert_select_group'));
                return;
            }
            let text = "Student Name\tPluses\tMinuses\tTeam Pluses\tTeam Minuses\tScore\tBadges\tNotes\n";
            studentGroups[selectedGroupName].forEach(s => {
                const badges = (s.badges || []).map(b => b.icon).join('');
                const notes = (s.comments || []).map(n => '[' + n.datetime + '] ' + n.text).join(' | ');
                const teamPluses = s.teamPluses || 0;
                const teamMinuses = s.teamMinuses || 0;
                const totalScore = ((s.pluses || 0) + teamPluses) - ((s.minuses || 0) + teamMinuses);
                text += `${s.name}\t${s.pluses || 0}\t${s.minuses || 0}\t${teamPluses}\t${teamMinuses}\t${totalScore}\t${badges}\t${notes}\n`;
            });
            writeClipboard(text, () => showToast(t('alert_data_copied')));
        }

        function exportToCSV() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) return;
            if (!selectedGroupName) {
                showToast('Please select a group first!');
                return;
            }
            let csv = 'Student Name,Pluses,Minuses,TeamPluses,TeamMinuses,Score,Badges,Notes\n';
            studentGroups[selectedGroupName].filter(studentHasInteraction).forEach(s => {
                const badges = (s.badges || []).map(b => b.icon).join('');
                const notes = (s.comments || []).map(n => '[' + n.datetime + '] ' + n.text).join(' | ').replace(/"/g, '""');
                const teamPluses = s.teamPluses || 0;
                const teamMinuses = s.teamMinuses || 0;
                const totalScore = ((s.pluses || 0) + teamPluses) - ((s.minuses || 0) + teamMinuses);
                csv += '"' + s.name + '",' + (s.pluses || 0) + ',' + (s.minuses || 0) + ',' + teamPluses + ',' + teamMinuses + ',' + totalScore + ',"' + badges + '","' + notes + '"\n';
            });

            // Separate notes section if any student has notes
            const studentsWithNotes = studentGroups[selectedGroupName].filter(s => s.comments && s.comments.length > 0);
            if (studentsWithNotes.length > 0) {
                csv += '\nStudent Notes\n';
                csv += 'Student,Date/Time,Note\n';
                studentsWithNotes.forEach(s => {
                    (s.comments || []).forEach(n => {
                        csv += '"' + s.name + '","' + n.datetime + '","' + n.text.replace(/"/g, '""') + '"\n';
                    });
                });
            }

            if (sessionHistory.length > 0) {
                csv += '\nSession History\n';
                csv += 'Time,Group,Student,Type,Detail\n';
                sessionHistory.forEach(function (e) {
                    csv += '"' + e.time + '","' + (e.group || '') + '","' + e.studentName + '","' + e.type + '","' + e.detail.replace(/"/g, '""') + '"\n';
                });
            }

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);

            const now = new Date();
            const timestamp = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') + '-' +
                String(now.getMinutes()).padStart(2, '0') + '-' +
                String(now.getSeconds()).padStart(2, '0');

            link.download = `${selectedGroupName}_Data_${timestamp}.csv`;
            link.click();
        }

        // ---- Multi-Color & Rule-Based Flag System ----

        const FLAG_PRESETS = [
            { key: 'red', name: 'Red Flag', hex: '#e74c3c' },
            { key: 'blue', name: 'Blue Flag', hex: '#3498db' },
            { key: 'green', name: 'Green Flag', hex: '#2ecc71' },
            { key: 'yellow', name: 'Yellow Flag', hex: '#f1c40f' },
            { key: 'purple', name: 'Purple Flag', hex: '#9b59b6' },
            { key: 'black', name: 'Black Flag', hex: '#34495e' },
            { key: 'orange', name: 'Orange Flag', hex: '#e67e22' },
            { key: 'pink', name: 'Pink Flag', hex: '#e84393' }
        ];

        function getFlagColorHex(keyOrHex) {
            if (!keyOrHex) return '#e74c3c';
            if (keyOrHex.startsWith('#')) return keyOrHex;
            const found = FLAG_PRESETS.find(p => p.key === keyOrHex.toLowerCase());
            return found ? found.hex : '#e74c3c';
        }

        function getFlagColorName(keyOrHex) {
            if (!keyOrHex) return 'Flag';
            const found = FLAG_PRESETS.find(p => p.key === keyOrHex.toLowerCase());
            return found ? found.name : `Flag (${keyOrHex})`;
        }

        function getActiveFlags(student) {
            if (!student) return [];
            const map = new Map();

            // Backward compatibility for legacy boolean student.isFlagged = true
            if (student.isFlagged && (!student.manualFlags || student.manualFlags.length === 0) && (!student.autoFlags || student.autoFlags.length === 0)) {
                map.set('red', { key: 'red', color: '#e74c3c', label: 'Red Flag', source: 'manual' });
            }

            if (Array.isArray(student.manualFlags)) {
                student.manualFlags.forEach(f => {
                    const colorKey = typeof f === 'string' ? f : (f.color || f.key || 'red');
                    const hex = getFlagColorHex(colorKey);
                    map.set(colorKey, { key: colorKey, color: hex, label: getFlagColorName(colorKey), source: 'manual' });
                });
            }

            if (Array.isArray(student.autoFlags)) {
                student.autoFlags.forEach(f => {
                    if (typeof f === 'object' && f !== null) {
                        const colorKey = f.color || 'red';
                        const hex = getFlagColorHex(colorKey);
                        const mapKey = f.ruleId || colorKey;
                        if (!map.has(colorKey) && !map.has(mapKey)) {
                            map.set(mapKey, {
                                key: colorKey,
                                ruleId: f.ruleId,
                                color: hex,
                                label: getFlagColorName(colorKey),
                                ruleName: f.name || '',
                                pickWeight: f.pickWeight,
                                source: 'auto'
                            });
                        }
                    } else if (typeof f === 'string') {
                        const hex = getFlagColorHex(f);
                        if (!map.has(f)) {
                            map.set(f, { key: f, color: hex, label: getFlagColorName(f), source: 'auto' });
                        }
                    }
                });
            }

            return Array.from(map.values());
        }

        function getFlagIconSvg(colorHex, size = 14, extraStyle = '') {
            const hex = colorHex || '#e74c3c';
            return `<svg class="flag-indicator-svg" viewBox="0 0 24 24" width="${size}" height="${size}" style="fill:${hex}; vertical-align:-2px; display:inline-block; filter:drop-shadow(0 1px 1px rgba(0,0,0,0.25)); ${extraStyle}"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>`;
        }

        function renderStudentFlagsHtml(student) {
            const isVisible = PRESENTATION_MODE ? !!presSettings.autoflag : autoFlagVisible;
            if (!isVisible || !student) return '';
            const flags = getActiveFlags(student);
            if (!flags || flags.length === 0) return '';

            return flags.map(f => {
                const title = f.ruleName ? `${f.label}: ${f.ruleName}` : `${f.label} (${f.source})`;
                return `<span class="flag-indicator" title="${title}" style="margin-left:3px; display:inline-block; cursor:default;">${getFlagIconSvg(f.color, 14)}</span>`;
            }).join('');
        }

        function toggleStudentManualFlag(studentId, colorKey) {
            if (!selectedGroupName || !studentGroups[selectedGroupName]) return;
            const student = studentGroups[selectedGroupName].find(s => s.id === studentId);
            if (!student) return;

            if (!Array.isArray(student.manualFlags)) student.manualFlags = [];

            const idx = student.manualFlags.indexOf(colorKey);
            if (idx !== -1) {
                student.manualFlags.splice(idx, 1);
            } else {
                student.manualFlags.push(colorKey);
            }

            student.isFlagged = getActiveFlags(student).length > 0;
            renderRoster();
            if (typeof renderClassPlanCards === 'function') renderClassPlanCards();
            openRosterContextMenu(null, studentId);
        }

        function clearStudentManualFlags(studentId) {
            if (!selectedGroupName || !studentGroups[selectedGroupName]) return;
            const student = studentGroups[selectedGroupName].find(s => s.id === studentId);
            if (!student) return;

            student.manualFlags = [];
            student.isFlagged = getActiveFlags(student).length > 0;
            renderRoster();
            if (typeof renderClassPlanCards === 'function') renderClassPlanCards();
            openRosterContextMenu(null, studentId);
        }

        // ---- Metrics & Auto-Flag Engine ----

        function computeStudentMetricsForSessions(studentOrName, groupName, sessions, groupRulesConfig = null) {
            const studentObj = (studentOrName && typeof studentOrName === 'object') ? studentOrName : null;
            const studentName = studentObj ? studentObj.name : studentOrName;
            const studentUuid = studentObj ? (studentObj.uuid || studentObj.id) : null;

            const plusDef = badgeDefinitions.find(d => d.isBuiltin && d.icon === '+');
            const minusDef = badgeDefinitions.find(d => d.isBuiltin && d.icon === '-');
            const plusCoeff = plusDef ? plusDef.coefficient : participationSettings.plusMinusCoefficient;
            const minusCoeff = minusDef ? minusDef.coefficient : participationSettings.plusMinusCoefficient;

            // Elements filter
            const el = participationSettings.autoFlagElements || {};
            const usePlus = el.plus !== false;
            const useMinus = el.minus !== false;
            const useTeamPlus = el.teamPlus !== false;
            const useTeamMinus = el.teamMinus !== false;
            const badgesFilter = el.badges; // true | string[] | []
            const useBadges = badgesFilter === true || (Array.isArray(badgesFilter) && badgesFilter.length > 0);

            const tl = participationSettings.autoFlagTimeline || {};
            let cutoffDate = null;
            if (tl.mode === 'weeks' && tl.weeks > 0) {
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - tl.weeks * 7);
                cutoffDate.setHours(0, 0, 0, 0);
            } else if (tl.mode === 'date' && tl.sinceDate) {
                cutoffDate = new Date(tl.sinceDate);
                cutoffDate.setHours(0, 0, 0, 0);
            }

            let totalNet = 0, totalPluses = 0, totalMinuses = 0, totalTeamPluses = 0, totalTeamMinuses = 0;
            let totalBadgePos = 0, totalBadgeNeg = 0, totalPicks = 0, sessionCount = 0, attendedCount = 0;
            const badgeCounts = {};
            let accumulatedBadges = [];
            const sessionNets = [];
            let totalTeamRoleEvents = 0;

            // Overall accumulators across all sessions for provisional grade (dissociated from auto-flag date range)
            let allSessionCount = 0, allAttendedCount = 0, allPicks = 0;
            let allPluses = 0, allMinuses = 0, allTeamPluses = 0, allTeamMinuses = 0;
            let allBadgePos = 0, allBadgeNeg = 0;
            let allAccumulatedBadges = [];
            const allSessionNets = [];
            let allTeamRoleEvents = 0;

            sessions.forEach(session => {
                if (session.activeGroup !== groupName) return;

                const students = (session.groups && session.groups[groupName]) || [];
                // Match by uuid, then id, then name
                const match = students.find(s => {
                    if (studentUuid && (s.uuid === studentUuid || s.id === studentUuid)) return true;
                    if (studentObj && studentObj.id != null && s.id === studentObj.id) return true;
                    return s.name === studentName;
                });
                if (!match) return;

                // Track overall session counters for provisional grade
                allSessionCount++;
                if (match.isAbsent) {
                    // absent
                } else {
                    allAttendedCount++;
                    if (typeof getStudentSessionNetForStudent === 'function') {
                        allSessionNets.push(getStudentSessionNetForStudent(match));
                    }
                }
                allPicks += (match.picks || 0);
                allPluses += match.pluses || 0;
                allMinuses += match.minuses || 0;
                allTeamPluses += match.teamPluses || 0;
                allTeamMinuses += match.teamMinuses || 0;
                const matchBadges = match.badges || [];
                allAccumulatedBadges = allAccumulatedBadges.concat(matchBadges);
                const matchSent = countBadgeSentimentForStudent(matchBadges);
                allBadgePos += matchSent.positive;
                allBadgeNeg += matchSent.negative;
                const matchRoleEvents = (typeof getSessionTeamRoleEvents === 'function') ? getSessionTeamRoleEvents(session, groupName, studentName) : [];
                allTeamRoleEvents += matchRoleEvents.length;

                // Auto-flag timeline cutoff
                if (cutoffDate) {
                    const sessionDate = new Date(session.date || session.savedAt || session._savedAt || session.createdAt || 0);
                    if (!isNaN(sessionDate.getTime()) && sessionDate < cutoffDate) return;
                }

                sessionCount++;
                if (match.isAbsent) {
                    // absent
                } else {
                    attendedCount++;
                    if (typeof getStudentSessionNetForStudent === 'function') {
                        sessionNets.push(getStudentSessionNetForStudent(match));
                    }
                }

                const p = match.pluses || 0;
                const m = match.minuses || 0;
                const tp = match.teamPluses || 0;
                const tm = match.teamMinuses || 0;

                totalPluses += p; totalMinuses += m; totalTeamPluses += tp; totalTeamMinuses += tm;
                totalPicks += (match.picks || 0);

                const sBadges = match.badges || [];
                accumulatedBadges = accumulatedBadges.concat(sBadges);

                let sessionBadgePos = 0, sessionBadgeNeg = 0;

                sBadges.forEach(b => {
                    const iconKey = b.icon;
                    badgeCounts[iconKey] = (badgeCounts[iconKey] || 0) + 1;
                    if (b.label) badgeCounts[`[${b.label}]`] = (badgeCounts[`[${b.label}]`] || 0) + 1;

                    if (useBadges) {
                        if (Array.isArray(badgesFilter) && !badgesFilter.includes(b.icon) && !badgesFilter.includes(b.label)) return;
                        const def = badgeDefinitions.find(d => d.icon === b.icon);
                        const tone = def ? def.tone : b.tone || 'positive';
                        const coeff = def ? (def.coefficient || 1) : 1;
                        if (tone === 'negative') sessionBadgeNeg += coeff;
                        else sessionBadgePos += coeff;
                    }
                });

                totalBadgePos += sessionBadgePos;
                totalBadgeNeg += sessionBadgeNeg;

                totalTeamRoleEvents += matchRoleEvents.length;

                const netPlus = usePlus ? (p * plusCoeff) : 0;
                const netMinus = useMinus ? (m * minusCoeff) : 0;
                const netTeamPlus = useTeamPlus ? (tp * plusCoeff) : 0;
                const netTeamMinus = useTeamMinus ? (tm * minusCoeff) : 0;

                totalNet += (netPlus - netMinus + netTeamPlus - netTeamMinus + sessionBadgePos - sessionBadgeNeg);
            });

            if (sessionCount === 0) return null;

            const attendanceRate = Math.round((attendedCount / sessionCount) * 100);
            const avgNet = parseFloat((totalNet / sessionCount).toFixed(2));

            const badgeSessionCounts = {};
            Object.keys(badgeCounts).forEach(k => {
                const val = parseFloat((badgeCounts[k] / Math.max(1, sessionCount)).toFixed(2));
                badgeSessionCounts[k] = val;
                badgeSessionCounts[k + '_session'] = val;
                badgeSessionCounts[k + '_per_session'] = val;
            });
            const badgePositiveSession = parseFloat((totalBadgePos / Math.max(1, sessionCount)).toFixed(2));
            const badgeNegativeSession = parseFloat((totalBadgeNeg / Math.max(1, sessionCount)).toFixed(2));

            let participationGrade = null;
            if (groupRulesConfig && groupRulesConfig.rules && groupRulesConfig.rules.length > 0 && typeof calculateStudentProvisionalGrade === 'function') {
                const mockOverviewData = {
                    picks: allPicks,
                    attendedSessions: allAttendedCount,
                    pluses: allPluses,
                    minuses: allMinuses,
                    teamPluses: allTeamPluses,
                    teamMinuses: allTeamMinuses,
                    badgePositive: allBadgePos,
                    badgeNegative: allBadgeNeg,
                    badges: allAccumulatedBadges,
                    sessions: allSessionCount,
                    absent: allSessionCount - allAttendedCount,
                    teamRoleEvents: allTeamRoleEvents,
                    sessionNets: allSessionNets
                };
                try {
                    participationGrade = calculateStudentProvisionalGrade(mockOverviewData, groupRulesConfig, groupName);
                } catch (e) {
                    console.warn('Failed to calculate provisional participation grade for auto-flag:', e);
                }
            }

            return {
                netPoints: avgNet,
                net: avgNet,
                picks: totalPicks,
                attendanceRate,
                participationGrade,
                pluses: totalPluses,
                minuses: totalMinuses,
                teamPluses: totalTeamPluses,
                teamMinuses: totalTeamMinuses,
                badgePositive: totalBadgePos,
                badgeNegative: totalBadgeNeg,
                badgePositiveSession,
                badgeNegativeSession,
                badgeCounts,
                badgeSessionCounts,
                sessionsCount: sessionCount
            };
        }

        function evaluateFlagRuleForStudent(student, rule, metrics, allMetrics) {
            if (!rule || rule.enabled === false) return false;

            const metric = rule.metric || 'bottomPercent';
            const op = rule.operator || '<=';
            const thresh = Number(rule.threshold) ?? 0;

            if (metric === 'bottomPercent') {
                const sorted = [...allMetrics].sort((a, b) => a.metrics.netPoints - b.metrics.netPoints);
                const cutoff = Math.ceil(sorted.length * (thresh / 100));
                const idx = sorted.findIndex(item => item.student.id === student.id);
                return idx !== -1 && idx < cutoff;
            }

            if (metric === 'topPercent') {
                const sorted = [...allMetrics].sort((a, b) => b.metrics.netPoints - a.metrics.netPoints);
                const cutoff = Math.ceil(sorted.length * (thresh / 100));
                const idx = sorted.findIndex(item => item.student.id === student.id);
                return idx !== -1 && idx < cutoff;
            }

            if (metric === 'formula') {
                if (!rule.formula) return false;
                try {
                    const context = {
                        netPoints: metrics.netPoints,
                        net: metrics.netPoints,
                        picks: metrics.picks,
                        attendanceRate: metrics.attendanceRate,
                        participationGrade: metrics.participationGrade ?? 0,
                        grade: metrics.participationGrade ?? 0,
                        pluses: metrics.pluses,
                        minuses: metrics.minuses,
                        teamPluses: metrics.teamPluses,
                        teamMinuses: metrics.teamMinuses,
                        badgePositive: metrics.badgePositive,
                        badgeNegative: metrics.badgeNegative,
                        badgePositiveSession: metrics.badgePositiveSession,
                        badgeNegativeSession: metrics.badgeNegativeSession,
                        sessionsCount: metrics.sessionsCount,
                        ...metrics.badgeCounts,
                        ...metrics.badgeSessionCounts
                    };
                    const result = evaluateExpression(rule.formula, context);
                    return Boolean(result);
                } catch (e) {
                    console.warn('Flag rule formula evaluation error:', e);
                    return false;
                }
            }

            let val = 0;
            if (metric === 'participationGrade') {
                if (metrics.participationGrade === null || metrics.participationGrade === undefined || isNaN(metrics.participationGrade)) {
                    return false;
                }
                val = metrics.participationGrade;
            } else if (metric.startsWith('badge_icon_session:')) {
                const icon = metric.replace('badge_icon_session:', '');
                val = metrics.badgeSessionCounts[icon] || 0;
            } else if (metric.startsWith('badge_icon:')) {
                const icon = metric.replace('badge_icon:', '');
                val = metrics.badgeCounts[icon] || 0;
            } else if (metric === 'badgePositiveSession') {
                val = metrics.badgePositiveSession || 0;
            } else if (metric === 'badgeNegativeSession') {
                val = metrics.badgeNegativeSession || 0;
            } else {
                val = metrics[metric] ?? 0;
            }

            switch (op) {
                case '<=': return val <= thresh;
                case '>=': return val >= thresh;
                case '<': return val < thresh;
                case '>': return val > thresh;
                case '==': return val == thresh;
                case '!=': return val != thresh;
                default: return val <= thresh;
            }
        }

        async function applyAutoFlags(groupName) {
            if (!groupName || !studentGroups[groupName]) return;

            studentGroups[groupName].forEach(s => {
                s.autoFlags = [];
                if (!s.manualFlags) s.manualFlags = [];
            });

            if (!participationSettings.autoFlagLowParticipation) {
                studentGroups[groupName].forEach(s => { s.isFlagged = getActiveFlags(s).length > 0; });
                renderRoster();
                return;
            }

            const rules = (participationSettings.flagRules && participationSettings.flagRules.length > 0)
                ? participationSettings.flagRules
                : getDefaultFlagRules();

            const sessions = await getTimeMachineSessions();
            let groupRulesConfig = null;
            try {
                const rulesMap = await getOrLoadParticipationRules();
                if (rulesMap && rulesMap[groupName]) groupRulesConfig = rulesMap[groupName];
                else if (rawMeta && rawMeta[groupName]) {
                    const m = rawMeta[groupName];
                    if (m.name && rulesMap && rulesMap[m.name]) groupRulesConfig = rulesMap[m.name];
                    else if (m.id && rulesMap && rulesMap[m.id]) groupRulesConfig = rulesMap[m.id];
                }
                if (!groupRulesConfig && rulesMap && rulesMap['_default']) {
                    groupRulesConfig = rulesMap['_default'];
                }
            } catch (e) {
                console.warn('Failed to load participation rules for auto-flag:', e);
            }

            const allMetrics = [];

            studentGroups[groupName].forEach(s => {
                const metrics = computeStudentMetricsForSessions(s, groupName, sessions, groupRulesConfig);
                if (metrics) allMetrics.push({ student: s, metrics });
            });

            if (allMetrics.length === 0) {
                renderRoster();
                return;
            }

            allMetrics.forEach(({ student, metrics }) => {
                rules.forEach(rule => {
                    if (rule.enabled === false) return;
                    const isMet = evaluateFlagRuleForStudent(student, rule, metrics, allMetrics);
                    if (isMet) {
                        const colorKey = rule.color || 'red';
                        const flagObj = {
                            ruleId: rule.id,
                            color: colorKey,
                            name: rule.name || 'Flag Rule',
                            pickWeight: Number(rule.pickWeight) || 2.0
                        };
                        const alreadyExists = student.autoFlags.some(f =>
                            (typeof f === 'object' && f !== null) ? (f.ruleId === rule.id || f.color === colorKey) : (f === colorKey)
                        );
                        if (!alreadyExists) {
                            student.autoFlags.push(flagObj);
                        }
                    }
                });

                student.isFlagged = getActiveFlags(student).length > 0;
            });

            renderRoster();
            if (typeof renderClassPlanCards === 'function') renderClassPlanCards();
        }

        function getStudentPickWeight(student) {
            if (!student) return 1.0;
            const flags = getActiveFlags(student);
            if (!flags || flags.length === 0) return 1.0;

            let maxWeight = 1.0;
            let hasFlagWeight = false;
            const rules = participationSettings.flagRules || [];

            flags.forEach(f => {
                // If flag object directly has pickWeight (from rich auto-flag)
                if (f && Number.isFinite(Number(f.pickWeight)) && Number(f.pickWeight) > 0) {
                    const pw = Number(f.pickWeight);
                    maxWeight = hasFlagWeight ? Math.max(maxWeight, pw) : pw;
                    hasFlagWeight = true;
                    return;
                }

                // Match against configured rules by ruleId, rule color, or key
                const rule = rules.find(r => (f.ruleId && r.id === f.ruleId) || r.id === f.key || r.color === f.key);
                if (rule && Number.isFinite(Number(rule.pickWeight)) && Number(rule.pickWeight) > 0) {
                    const pw = Number(rule.pickWeight);
                    maxWeight = hasFlagWeight ? Math.max(maxWeight, pw) : pw;
                    hasFlagWeight = true;
                } else if (f.source === 'manual') {
                    // Manual flag without a specific matching rule defaults to 2.0x weight
                    const manualDefault = 2.0;
                    maxWeight = hasFlagWeight ? Math.max(maxWeight, manualDefault) : manualDefault;
                    hasFlagWeight = true;
                }
            });

            return hasFlagWeight ? maxWeight : 1.0;
        }

        function getDefaultFlagRules() {
            return [
                {
                    id: 'rule_default_1',
                    name: 'Low Net Participation',
                    color: 'red',
                    metric: 'bottomPercent',
                    operator: '<=',
                    threshold: 25,
                    pickWeight: 3.0,
                    enabled: true
                }
            ];
        }

        // ---- Auto-Flag Rules Modal Management ----

        let tempFlagRules = [];

        function openEditAutoflagModal() {
            openSettingsModal('autoflag');
        }

        function closeEditAutoflagModal() {
            closeSettingsModal();
        }

        function renderAutoFlagRulesTable() {
            const tbody = document.getElementById('af-rules-tbody');
            if (!tbody) return;

            const badgeOpts = (badgeDefinitions || []).flatMap(b => {
                const iconEsc = (b.icon || '').replace(/"/g, '&quot;');
                const labelEsc = (b.label || b.icon).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return [
                    `<option value="badge_icon:${iconEsc}">${iconEsc} ${labelEsc} (Total)</option>`,
                    `<option value="badge_icon_session:${iconEsc}">${iconEsc} ${labelEsc} / session</option>`
                ];
            }).join('');

            tbody.innerHTML = tempFlagRules.map((r, idx) => {
                const isFormula = r.metric === 'formula';
                const isBottomOrTop = r.metric === 'bottomPercent' || r.metric === 'topPercent';
                const presetColors = FLAG_PRESETS.map(p => `<option value="${p.key}" ${r.color === p.key ? 'selected' : ''}>🚩 ${p.name}</option>`).join('');

                return `
                <tr data-rule-idx="${idx}" style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px; text-align: center;">
                        <input type="checkbox" class="af-rule-enabled" ${r.enabled !== false ? 'checked' : ''} onchange="tempFlagRules[${idx}].enabled = this.checked" style="width:16px;height:16px;cursor:pointer;">
                    </td>
                    <td style="padding: 6px;">
                        <input type="text" class="af-rule-name" value="${(r.name || '').replace(/"/g, '&quot;')}" onchange="tempFlagRules[${idx}].name = this.value" placeholder="Rule Name" style="width: 100%; font-size: 0.82rem; padding: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </td>
                    <td style="padding: 6px;">
                        <div style="display:flex; align-items:center; gap:4px;">
                            <select class="af-rule-color" onchange="_afRuleColorChange(${idx}, this)" style="font-size:0.82rem; padding:4px; border:1px solid #ccc; border-radius:4px;">
                                ${presetColors}
                                <option value="custom" ${!FLAG_PRESETS.some(p => p.key === r.color) ? 'selected' : ''}>🎨 Custom Color...</option>
                            </select>
                            <input type="color" class="af-rule-custom-color" value="${getFlagColorHex(r.color)}" onchange="tempFlagRules[${idx}].color = this.value" style="width:26px; height:26px; padding:0; border:none; background:none; cursor:pointer; ${!FLAG_PRESETS.some(p => p.key === r.color) ? '' : 'display:none;'}">
                        </div>
                    </td>
                    <td style="padding: 6px;">
                        <select class="af-rule-metric" onchange="_afMetricChange(${idx}, this)" style="width: 100%; font-size: 0.82rem; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
                            <optgroup label="Overall Performance">
                                <option value="bottomPercent" ${r.metric === 'bottomPercent' ? 'selected' : ''}>Bottom % Net Score</option>
                                <option value="topPercent" ${r.metric === 'topPercent' ? 'selected' : ''}>Top % Net Score</option>
                                <option value="netPoints" ${r.metric === 'netPoints' ? 'selected' : ''}>Net Score (per session)</option>
                                <option value="picks" ${r.metric === 'picks' ? 'selected' : ''}>Times Picked</option>
                                <option value="attendanceRate" ${r.metric === 'attendanceRate' ? 'selected' : ''}>Attendance Rate (%)</option>
                                <option value="participationGrade" ${r.metric === 'participationGrade' ? 'selected' : ''}>${(typeof t === 'function' && t('af_metric_participation_grade')) || 'Participation Grade'}</option>
                            </optgroup>
                            <optgroup label="Point Metrics">
                                <option value="pluses" ${r.metric === 'pluses' ? 'selected' : ''}>Individual Pluses (+)</option>
                                <option value="minuses" ${r.metric === 'minuses' ? 'selected' : ''}>Individual Minuses (-)</option>
                                <option value="teamPluses" ${r.metric === 'teamPluses' ? 'selected' : ''}>Team Pluses (T+)</option>
                                <option value="teamMinuses" ${r.metric === 'teamMinuses' ? 'selected' : ''}>Team Minuses (T-)</option>
                                <option value="badgePositive" ${r.metric === 'badgePositive' ? 'selected' : ''}>Positive Badges Total</option>
                                <option value="badgePositiveSession" ${r.metric === 'badgePositiveSession' ? 'selected' : ''}>Positive Badges / session</option>
                                <option value="badgeNegative" ${r.metric === 'badgeNegative' ? 'selected' : ''}>Negative Badges Total</option>
                                <option value="badgeNegativeSession" ${r.metric === 'badgeNegativeSession' ? 'selected' : ''}>Negative Badges / session</option>
                            </optgroup>
                            <optgroup label="Badges (Total & Per Session)">
                                ${badgeOpts.replace(`value="${r.metric}"`, `value="${r.metric}" selected`)}
                            </optgroup>
                            <optgroup label="Advanced">
                                <option value="formula" ${isFormula ? 'selected' : ''}>Expression Formula</option>
                            </optgroup>
                        </select>
                    </td>
                    <td style="padding: 6px;">
                        <select class="af-rule-op" onchange="tempFlagRules[${idx}].operator = this.value" style="font-size:0.82rem; padding:4px; border:1px solid #ccc; border-radius:4px; ${isBottomOrTop || isFormula ? 'display:none;' : ''}">
                            <option value="<=" ${r.operator === '<=' ? 'selected' : ''}>&le;</option>
                            <option value=">=" ${r.operator === '>=' ? 'selected' : ''}>&ge;</option>
                            <option value="<" ${r.operator === '<' ? 'selected' : ''}>&lt;</option>
                            <option value=">" ${r.operator === '>' ? 'selected' : ''}>&gt;</option>
                            <option value="==" ${r.operator === '==' ? 'selected' : ''}>=</option>
                            <option value="!=" ${r.operator === '!=' ? 'selected' : ''}>!=</option>
                        </select>
                    </td>
                    <td style="padding: 6px;">
                        ${isFormula
                        ? `<input type="text" class="af-rule-formula" value="${(r.formula || '').replace(/"/g, '&quot;')}" onchange="tempFlagRules[${idx}].formula = this.value" placeholder="e.g. minuses >= 2 and netPoints < 0" style="width:100%; font-size:0.8rem; padding:4px; border:1px solid #ccc; border-radius:4px;">`
                        : `<input type="number" class="af-rule-thresh" value="${r.threshold ?? 25}" onchange="tempFlagRules[${idx}].threshold = parseFloat(this.value)" step="any" style="width:60px; font-size:0.82rem; padding:4px; border:1px solid #ccc; border-radius:4px;">`
                    }
                    </td>
                    <td style="padding: 6px;">
                        <input type="number" class="af-rule-weight" value="${r.pickWeight ?? 2.0}" onchange="tempFlagRules[${idx}].pickWeight = parseFloat(this.value)" step="0.5" min="0.1" max="10" style="width:55px; font-size:0.82rem; padding:4px; border:1px solid #ccc; border-radius:4px;" title="${(typeof t === 'function' ? t('af_weight_tooltip') : '') || 'Pick weight multiplier: >1.0 increases chance, <1.0 decreases chance, 1.0 = normal chance.'}">
                    </td>
                    <td style="padding: 6px; text-align: center;">
                        <button type="button" onclick="removeAutoFlagRule(${idx})" style="background:none; border:none; color:#c0392b; cursor:pointer; font-size:1.1rem; padding:0;" title="Delete Rule">&times;</button>
                    </td>
                </tr>`;
            }).join('');
        }

        function _afRuleColorChange(idx, selectEl) {
            const val = selectEl.value;
            const customInput = selectEl.nextElementSibling;
            if (val === 'custom') {
                if (customInput) customInput.style.display = 'inline-block';
                tempFlagRules[idx].color = customInput ? customInput.value : '#e74c3c';
            } else {
                if (customInput) customInput.style.display = 'none';
                tempFlagRules[idx].color = val;
            }
        }

        function _afMetricChange(idx, selectEl) {
            const val = selectEl.value;
            tempFlagRules[idx].metric = val;
            if (val === 'participationGrade' && (tempFlagRules[idx].threshold === undefined || tempFlagRules[idx].threshold === 25)) {
                tempFlagRules[idx].threshold = 10;
            }
            renderAutoFlagRulesTable();
        }

        function addAutoFlagRule() {
            tempFlagRules.push({
                id: 'rule_' + Date.now(),
                name: 'New Flag Rule',
                color: 'blue',
                metric: 'minuses',
                operator: '>=',
                threshold: 2,
                formula: '',
                pickWeight: 2.0,
                enabled: true
            });
            renderAutoFlagRulesTable();
        }

        function removeAutoFlagRule(idx) {
            tempFlagRules.splice(idx, 1);
            renderAutoFlagRulesTable();
        }

        async function saveAutoFlagSettings() {
            const tlMode = document.querySelector('input[name="af-timeline"]:checked')?.value || 'all';
            const tlWeeks = parseInt(document.getElementById('af-tl-weeks-value').value, 10);
            const tlDate = document.getElementById('af-tl-date-value').value;

            // Flush active DOM inputs into tempFlagRules
            const rows = document.querySelectorAll('#af-rules-tbody tr[data-rule-idx]');
            rows.forEach(tr => {
                const idx = parseInt(tr.getAttribute('data-rule-idx'), 10);
                if (tempFlagRules[idx]) {
                    const nameInput = tr.querySelector('.af-rule-name');
                    if (nameInput) tempFlagRules[idx].name = nameInput.value;
                    const threshInput = tr.querySelector('.af-rule-thresh');
                    if (threshInput) tempFlagRules[idx].threshold = parseFloat(threshInput.value) || 0;
                    const formulaInput = tr.querySelector('.af-rule-formula');
                    if (formulaInput) tempFlagRules[idx].formula = formulaInput.value;
                    const weightInput = tr.querySelector('.af-rule-weight');
                    if (weightInput) tempFlagRules[idx].pickWeight = parseFloat(weightInput.value) || 1.0;
                }
            });

            participationSettings = normalizeParticipationSettings({
                ...participationSettings,
                autoFlagLowParticipation: document.getElementById('af-enabled').checked,
                flagRules: tempFlagRules,
                autoFlagTimeline: {
                    mode: tlMode,
                    weeks: Number.isFinite(tlWeeks) && tlWeeks > 0 ? tlWeeks : 4,
                    sinceDate: tlDate || ''
                }
            });

            const result = await persistSettingsToUserFile();
            if (result && !result.ok && result.mode !== 'download') {
                showToast('Save failed: ' + (result.error || 'Unable to save config.js'), true);
                return;
            }

            closeEditAutoflagModal();

            if (selectedGroupName) {
                applyAutoFlags(selectedGroupName);
            }

            if (typeof mdbToast === 'function') mdbToast('🚩 Auto-flag rules saved');
        }

        function pickStudent() {
            const halfArr = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const halfSet = halfArr ? new Set(_halfGroupFilter(studentGroups[selectedGroupName], halfArr).map(s => s.id)) : null;
            const pool = studentGroups[selectedGroupName].filter(s => !s.isPicked && !s.isAbsent && (!halfSet || halfSet.has(s.id)));
            if (pool.length === 0) {
                showToast(t('alert_everyone_called') || "Everyone has been called!");
                showConfirm((t('alert_everyone_called') || "Everyone has been called!") + "\n\nReset strikes?", function () {
                    resetStrikesOnly();
                });
                return;
            }
            // Flagged students get weighted selection based on active flag rules (scaled by 10 for fractional/sub-1.0 accuracy)
            const weightedPool = pool.flatMap(s => {
                const w = getStudentPickWeight(s);
                const tickets = Math.max(1, Math.round(w * 10));
                return Array(tickets).fill(s);
            });
            const winner = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            winner.isPicked = true;
            const dn = document.getElementById('display-name');
            dn.innerText = getDisplayName(winner);
            dn.style.color = '';
            dn.classList.remove('blinking');
            void dn.offsetWidth; // reflow to restart animation
            dn.classList.add('blinking');
            clearTimeout(dn._blinkTimeout);
            dn._blinkTimeout = setTimeout(() => {
                dn.classList.remove('blinking');
                dn.style.color = '';
            }, 4000);
            _activeBlinkStudentId = winner.id;
            _activeBlinkTime = Date.now();
            renderRoster();

            triggerStudentPickBlink(winner.id);
            logHistory('pick', winner.name, 'Selected by random picker', { studentId: winner.id });

            // Notify presentation windows to also animate the picked student and sync state
            if (!PRESENTATION_MODE) {
                _broadcastAnimation('pick-blink', { studentId: winner.id });
                _broadcastPresentationState();
            }
        }

        function pickTeam() {
            if (!selectedGroupName || !currentTeamsActive) return;
            const students = studentGroups[selectedGroupName];
            const teamIds = [...new Set(students.filter(s => s.teamId != null && !s.isAbsent).map(s => s.teamId))];
            if (teamIds.length === 0) return;

            const teamIdsKey = [...teamIds].sort((a, b) => a - b).join(',');
            let pickState = teamPickStateByGroup[selectedGroupName];
            if (!pickState || pickState.teamIdsKey !== teamIdsKey || !Array.isArray(pickState.remainingTeamIds)) {
                pickState = { teamIdsKey, remainingTeamIds: [] };
            }

            pickState.remainingTeamIds = pickState.remainingTeamIds.filter(id => teamIds.includes(id));
            if (pickState.remainingTeamIds.length === 0) {
                pickState.remainingTeamIds = [...teamIds].sort(() => 0.5 - Math.random());
            }

            const pickedId = pickState.remainingTeamIds.shift();
            teamPickStateByGroup[selectedGroupName] = pickState;

            const tColor = teamColors[(pickedId - 1) % teamColors.length];
            const displayName = tColor.customName || tColor.name;
            const dn = document.getElementById('display-name');
            dn.innerText = displayName;
            dn.style.color = tColor.border;
            dn.classList.remove('blinking');
            void dn.offsetWidth;
            dn.classList.add('blinking');
            clearTimeout(dn._blinkTimeout);
            dn._blinkTimeout = setTimeout(() => {
                dn.classList.remove('blinking');
                dn.style.color = '';
            }, 4000);
            logHistory('team-pick', displayName, 'Team selected by random picker', { teamId: pickedId });
            _broadcastPresentationState();
        }

        let senVisible = false;
        let badgesVisible = true;
        let rolesVisible = true;
        let autoFlagVisible = true;
        let animationsEnabled = true;
        let presSettings = { plan: false, anim: true, autoflag: false, badges: true, roles: true, modes: false, sen: false, lessonPlan: true };

        function updateDateTime() {
            const now = new Date();
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            document.getElementById('datetime').textContent = now.toLocaleDateString('en-UK', options);
        }

        updateDateTime();
        setInterval(updateDateTime, 1000);

        window.toggleMenuCollapse = function () {};

        let datetimeOverlayInterval = null;
        function openDatetimeOverlay() {
            if (typeof openTimerFullscreen === 'function') {
                openTimerFullscreen('clock');
            } else {
                const overlay = document.getElementById('datetime-overlay');
                if (overlay) overlay.classList.add('active');
            }
            if (!PRESENTATION_MODE && typeof _broadcastAnimation === 'function') _broadcastAnimation('datetime-open');
        }
        function closeDatetimeOverlay() {
            if (typeof closeTimerFullscreen === 'function') {
                closeTimerFullscreen();
            } else {
                const overlay = document.getElementById('datetime-overlay');
                if (overlay) overlay.classList.remove('active');
            }
            if (!PRESENTATION_MODE && typeof _broadcastAnimation === 'function') _broadcastAnimation('datetime-close');
        }
        function onDatetimeOverlayKey(e) {
            if (e.key === 'Escape') closeDatetimeOverlay();
        }
        function updateDatetimeOverlay() {
            if (typeof updateOverlayClock === 'function') {
                updateOverlayClock();
            } else {
                const now = new Date();
                const dt = document.getElementById('datetime-overlay-time');
                if (dt) dt.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dd = document.getElementById('datetime-overlay-date');
                if (dd) dd.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            }
        }

        // Timer functionality
        let timerEndTime = null;
        let timerInterval = null;
        let timerTotalMs = 0;
        let timerMode = 'timer'; // 'timer' or 'stopwatch'
        let stopwatchStart = null;
        let stopwatchInterval = null;
        let stopwatchElapsedMs = 0;
        let stopwatchPaused = false;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Warm up both audio contexts on the first user interaction to eliminate first-play lag
