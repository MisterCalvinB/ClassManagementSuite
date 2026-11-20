        function buildBadgePopupButtons(targetId, targetType = 'individual') {
            const defs = (badgeDefinitions && badgeDefinitions.length ? badgeDefinitions : DEFAULT_BADGE_DEFINITIONS)
                .filter(badge => !badge.hidden && !badge.isBuiltin && !badge.inlineInRoster && _badgeAppliesToTarget(badge, targetType));

            const renderButton = (badge) => {
                const title = [badge.label, badge.meaning].filter(Boolean).join(' — ');
                const toneStyles = badge.tone === 'negative'
                    ? 'background:#fff7f7; border-color:#e9b9b9; color:#8a1c1c;'
                    : 'background:#f7fff7; border-color:#b7e0b7; color:#0c5c2a;';
                return `<button onclick='awardBadge(${targetId}, ${JSON.stringify(badge.icon)}, ${JSON.stringify(badge.label)}, ${JSON.stringify(badge.tone)}, ${JSON.stringify(badge.meaning)}, ${JSON.stringify(targetType)})' title="${escapeSettingsHtml(title)}" style="${toneStyles}">${escapeSettingsHtml(badge.icon)}</button>`;
            };

            const positive = defs.filter(badge => badge.tone !== 'negative').map(renderButton).join('');
            const negative = defs.filter(badge => badge.tone === 'negative').map(renderButton).join('');

            if (positive && negative) return `${positive}<div class="badge-popup-divider"></div>${negative}`;
            return positive || negative || '';
        }

        function buildTeamBadgeButtons(teamId) {
            const defs = (badgeDefinitions && badgeDefinitions.length ? badgeDefinitions : DEFAULT_BADGE_DEFINITIONS)
                .filter(badge => !badge.hidden && !badge.isBuiltin && _badgeAppliesToTarget(badge, 'team'));

            const renderButton = (badge) => {
                const title = [badge.label, badge.meaning].filter(Boolean).join(' — ');
                const isNeg = badge.tone === 'negative';
                const toneClass = isNeg ? 'tone-negative btn-badge-negative' : 'tone-positive btn-badge-positive';
                const toneAttr = isNeg ? 'negative' : 'positive';
                const toneStyles = isNeg
                    ? 'background:#fef2f2; border-color:#dc2626; color:#b91c1c;'
                    : 'background:#ecfdf5; border-color:#059669; color:#047857;';
                return `<button class="btn-mini btn-badge-inline ${toneClass}" data-tone="${toneAttr}" onclick='awardBadge(${teamId}, ${JSON.stringify(badge.icon)}, ${JSON.stringify(badge.label)}, ${JSON.stringify(badge.tone)}, ${JSON.stringify(badge.meaning)}, "team")' title="${escapeSettingsHtml(title)}" style="${toneStyles}">${escapeSettingsHtml(badge.icon)}</button>`;
            };

            return defs.map(renderButton).join('');
        }

        function buildBadgeInlineButtons(targetId, targetType, tone) {
            const defs = (badgeDefinitions && badgeDefinitions.length ? badgeDefinitions : DEFAULT_BADGE_DEFINITIONS)
                .filter(badge => !badge.hidden && !badge.isBuiltin && badge.inlineInRoster && badge.tone === tone && _badgeAppliesToTarget(badge, targetType));

            const renderButton = (badge) => {
                const title = [badge.label, badge.meaning].filter(Boolean).join(' — ');
                const isNeg = badge.tone === 'negative';
                const toneClass = isNeg ? 'tone-negative btn-badge-negative' : 'tone-positive btn-badge-positive';
                const toneAttr = isNeg ? 'negative' : 'positive';
                const toneStyles = isNeg
                    ? 'background:#fef2f2; border-color:#dc2626; color:#b91c1c;'
                    : 'background:#ecfdf5; border-color:#059669; color:#047857;';
                return `<button class="btn-mini btn-badge-inline ${toneClass}" data-tone="${toneAttr}" onclick='awardBadge(${targetId}, ${JSON.stringify(badge.icon)}, ${JSON.stringify(badge.label)}, ${JSON.stringify(badge.tone)}, ${JSON.stringify(badge.meaning)}, ${JSON.stringify(targetType)})' title="${escapeSettingsHtml(title)}" style="${toneStyles}">${escapeSettingsHtml(badge.icon)}</button>`;
            };

            return defs.map(renderButton).join('');
        }

        function toggleBadgePopup(event, targetId, targetType = 'individual') {
            event.stopPropagation();
            const popupKey = _badgePopupKey(targetId, targetType);
            // Close any already-open popup
            if (_openBadgePopupKey && _openBadgePopupKey !== popupKey) {
                _closeBadgePopupByKey(_openBadgePopupKey);
            }
            const popup = document.getElementById(_badgePopupElementId(targetId, targetType));
            if (!popup) return;
            const isOpen = popup.classList.toggle('open');
            _openBadgePopupKey = isOpen ? popupKey : null;

            if (isOpen) {
                // Attach popup to document.body so that containing blocks (contain:layout, transforms, overflow) on ancestor lists/cells never distort its fixed positioning
                document.body.appendChild(popup);

                // Position popup above the button using fixed viewport coords
                const btn = (event && (event.currentTarget || event.target)) || popup.parentElement?.querySelector('.btn-badge-open');
                const rect = btn ? btn.getBoundingClientRect() : { top: 0, bottom: 0, left: 0, right: 0 };
                popup.style.top = '';
                popup.style.bottom = '';
                popup.style.left = '';
                popup.style.right = '';

                const popW = popup.offsetWidth;
                const popH = popup.offsetHeight;
                // Prefer opening above the button
                let top = rect.top - popH - 6;
                if (top < 8) top = rect.bottom + 6; // flip below if no room above
                // Align right edge with button right, clamp to viewport
                let left = rect.right - popW;
                if (left < 8) left = 8;
                if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
                popup.style.top = top + 'px';
                popup.style.left = left + 'px';
            } else {
                popup.style.top = '';
                popup.style.left = '';
            }
        }

        // Close badge popups when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (_openBadgePopupKey) {
                _closeBadgePopupByKey(_openBadgePopupKey);
                _openBadgePopupKey = null;
            }

            const rosterMenu = document.getElementById('roster-context-menu');
            if (rosterMenu && rosterMenu.classList.contains('open') && !rosterMenu.contains(e.target)) {
                rosterMenu.classList.remove('open');
                rosterContextStudentId = null;
            }
        });

        document.addEventListener('keydown', function (e) {
            if (PRESENTATION_MODE) return;
            if (e.key === 'Escape') {
                if (_openBadgePopupKey) {
                    _closeBadgePopupByKey(_openBadgePopupKey);
                    _openBadgePopupKey = null;
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    return;
                }
                const rosterMenu = document.getElementById('roster-context-menu');
                if (rosterMenu && rosterMenu.classList.contains('open')) {
                    closeRosterContextMenu();
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    return;
                }
                const stats = document.getElementById('student-stats-popup');
                if (stats && stats.classList.contains('open')) {
                    closeStudentStatsPopup();
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    return;
                }
                const grades = document.getElementById('student-grades-popup');
                if (grades && grades.classList.contains('open')) {
                    closeStudentGradesPopup();
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    return;
                }
            }
        });

        function awardBadge(targetId, icon, label, tone = 'positive', meaning = '', targetType = 'individual') {
            const group = studentGroups[selectedGroupName];
            const targetStudents = targetType === 'team'
                ? (group || []).filter(student => student.teamId === targetId)
                : [group.find(s => s.id === targetId)];
            const validStudents = targetStudents.filter(Boolean);
            if (!validStudents.length) return;

            const badgeDef = (badgeDefinitions || []).find(d => d.icon === icon && d.label === label);
            const now = new Date();
            const bTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const bTimestamp = now.toISOString();

            validStudents.forEach(student => {
                if (!student.badges) student.badges = [];
                student.badges.push({ icon, label, tone, meaning, time: bTime, timestamp: bTimestamp });

                // Strike student if configured
                if (badgeDef?.strikeOnAward) {
                    student.isPicked = true;
                }

                // RV (Renvoi) badge = mark absent and remove from random selector
                if (icon === 'RV') {
                    student.isAbsent = true;
                    delete student.teamId;
                    delete student.role;
                    student.isPicked = false;
                    logHistory('attendance', student.name, 'Marked absent (RV badge)', { studentId: student.id, isAbsent: true });
                    if (typeof cmsSyncStudentAbsenceToGradeSheet === 'function') {
                        cmsSyncStudentAbsenceToGradeSheet(student, true);
                    }
                }
            });

            // Close popup
            const popup = document.getElementById(_badgePopupElementId(targetId, targetType));
            if (popup) {
                popup.classList.remove('open');
                popup.style.top = '';
                popup.style.left = '';
            }
            _openBadgePopupKey = null;

            // Play score sound feedback (positive or negative based on badge tone)
            const effectiveTone = badgeDef?.tone || tone || 'positive';
            if (effectiveTone === 'negative') {
                playScoreBuzzer();
            } else {
                playScoreJingle();
            }

            // Flash animation feedback
            showBadgeFlash(icon);
            logHistory('badge', targetType === 'team' ? _getTeamLabel(targetId) : validStudents[0].name, icon + ' ' + label, {
                badgeIcon: icon,
                badgeLabel: label,
                targetType: targetType,
                targetId: targetId,
                studentId: targetType === 'individual' ? validStudents[0]?.id : undefined,
                time: bTime,
                timestamp: bTimestamp
            });

            renderRoster();
            renderRanking();
            _broadcastAnimation('badge-flash', { icon });
            if (typeof autosaveToDb === 'function') autosaveToDb('badge-award');
            if (typeof _remotePushStateDebounced === 'function') _remotePushStateDebounced();
        }

        function removeBadge(studentId, icon) {
            const group = studentGroups[selectedGroupName];
            const student = group.find(s => s.id === studentId);
            if (!student || !student.badges) return;
            const idx = student.badges.findIndex(b => b.icon === icon);
            if (idx === -1) return;
            const removed = student.badges.splice(idx, 1)[0];
            const now = new Date();
            const bTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const bTimestamp = now.toISOString();
            // Diamond removal undoes the +1 point
            if (icon === '💎') {
                student.pluses = Math.max(0, (student.pluses || 0) - 1);
                if (student.plusHistory && student.plusHistory.length) student.plusHistory.pop();
            }
            if (icon === 'RV' && !student.badges.some(b => b.icon === 'RV')) {
                student.isAbsent = false;
                logHistory('attendance', student.name, 'Marked present (RV badge removed)', { studentId: student.id, isAbsent: false, time: bTime, timestamp: bTimestamp });
                if (typeof cmsSyncStudentAbsenceToGradeSheet === 'function') {
                    cmsSyncStudentAbsenceToGradeSheet(student, false);
                }
            }
            logHistory('remove', student.name, (removed?.label ? removed.label + ' ' : '') + 'badge (' + icon + ')', { badgeIcon: icon, studentId: student.id, time: bTime, timestamp: bTimestamp });
            renderRoster();
            renderRanking();
            if (typeof autosaveToDb === 'function') autosaveToDb('badge-remove');
            if (typeof _remotePushStateDebounced === 'function') _remotePushStateDebounced();
        }

        let _flashOverlayTimer = null;
        function showFlashOverlay(content, extraStyles = '') {
            if (!animationsEnabled) return;
            const flash = document.getElementById('badge-flash-overlay');
            if (!flash) return;
            if (_flashOverlayTimer) {
                clearTimeout(_flashOverlayTimer);
                _flashOverlayTimer = null;
            }
            flash.textContent = content;
            flash.style.cssText = extraStyles;
            // Force animation restart cleanly
            flash.classList.remove('active');
            void flash.offsetWidth;
            flash.classList.add('active');

            _flashOverlayTimer = setTimeout(() => {
                flash.classList.remove('active');
                flash.style.cssText = '';
                flash.textContent = '';
                _flashOverlayTimer = null;
            }, 750);
        }

        function showBadgeFlash(icon) {
            showFlashOverlay(icon, 'background: rgba(255,255,255,0.94); padding: 0.18em 0.38em;');
        }

        function showScoreFlash(label, color) {
            showFlashOverlay(label, `
                font-size: 3.2rem;
                font-weight: 900;
                color: ${color};
                background: rgba(255,255,255,0.94);
                padding: 0.18em 0.38em;
                border-radius: 14px;
                box-shadow: 0 10px 28px rgba(0,0,0,0.18);
                letter-spacing: 0.03em;
            `);
        }

        // ============================================================
        // LESSON OBJECTIVES
        // ============================================================

        let currentObjectives = '';

        function updateObjectivesDisplay() {
            const textEl = document.getElementById('objectives-bar-text');
            const placeholder = 'Click to set lesson objectives…';

            if (textEl) {
                if (currentObjectives) {
                    textEl.textContent = currentObjectives;
                    textEl.classList.remove('empty');
                } else {
                    textEl.textContent = placeholder;
                    textEl.classList.add('empty');
                }
            }

            const objEl = document.getElementById('timer-overlay-objective');
            if (objEl) {
                objEl.textContent = currentObjectives;
                objEl.className = currentObjectives ? 'has-content' : '';
            }
        }

        function restoreObjectivesFromSession(session) {
            currentObjectives = String((session && (session.lessonObjectives ?? session.objectives)) || '').trim();
            updateObjectivesDisplay();
        }

        function loadObjectivesForClass(className) {
            // Only restore objectives if a session for this class was saved today
            const todayStr = new Date().toDateString();
            const sessions = getDb()
                .filter(s => s && s.activeGroup === className && (s.lessonObjectives ?? s.objectives) && new Date(s.id).toDateString() === todayStr)
                .sort((a, b) => new Date(b.id) - new Date(a.id));

            if (sessions.length > 0) {
                currentObjectives = String((sessions[0].lessonObjectives ?? sessions[0].objectives) || '').trim();
            } else {
                currentObjectives = '';
            }

            updateObjectivesDisplay();
        }

        function toggleObjectivesBar() {
            const bar = document.getElementById('objectives-bar');
            bar.classList.toggle('visible');
        }

        function openObjectivesModal() {
            document.getElementById('objectives-textarea').value = currentObjectives;
            document.getElementById('objectives-modal').style.display = 'flex';
            setTimeout(() => document.getElementById('objectives-textarea').focus(), 100);
        }

        function closeObjectivesModal() {
            document.getElementById('objectives-modal').style.display = 'none';
        }

        function saveObjectives() {
            currentObjectives = document.getElementById('objectives-textarea').value.trim();
            updateObjectivesDisplay();
            if (typeof syncDbAutosaveBaseline === 'function') {
                dbAutosaveLastFingerprint = '';
                autosaveToDb('objectives');
            }
            closeObjectivesModal();
        }

        function clearObjectives() {
            document.getElementById('objectives-textarea').value = '';
            saveObjectives();
        }

        // Keyboard shortcut: Escape closes objectives modal
        document.addEventListener('keydown', function (e) {
            if (PRESENTATION_MODE) return;
            if (e.key === 'Escape') {
                const modal = document.getElementById('objectives-modal');
                if (modal && modal.style.display !== 'none') {
                    closeObjectivesModal();
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                }
            }
        });



        // ============================================================
        // SESSION HISTORY
        // ============================================================

        let sessionHistory = [];

        function logHistory(type, studentName, detail, meta) {
            const now = new Date();
            const time = (meta && meta.time) ? meta.time : now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const timestamp = (meta && meta.timestamp) ? meta.timestamp : now.toISOString();
            const entry = { type: type, studentName: studentName, detail: detail, time: time, timestamp: timestamp, group: selectedGroupName };
            if (meta && typeof meta === 'object') {
                entry.meta = meta;
            }
            sessionHistory.push(entry);
            if (document.getElementById('history-modal') && document.getElementById('history-modal').style.display === 'flex') {
                renderHistoryList();
            }
            if (typeof queueDbAutosave === 'function' && (typeof PRESENTATION_MODE === 'undefined' || !PRESENTATION_MODE)) {
                queueDbAutosave(type || 'history', 600);
            }
        }

        function openHistoryModal() {
            const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
            if (isElectron) return;
            const modal = document.getElementById('history-modal');
            if (!modal) return;
            renderHistoryList();
            modal.style.display = 'flex';
        }

        function closeHistoryModal() {
            const modal = document.getElementById('history-modal');
            if (modal) modal.style.display = 'none';
        }

        function renderHistoryList() {
            const ul = document.getElementById('history-list');
            if (!ul) return;
            if (sessionHistory.length === 0) {
                ul.innerHTML = '<li class="history-empty">No events yet this session.</li>';
                return;
            }
            ul.innerHTML = '';
            const reversed = sessionHistory.slice().reverse();
            reversed.forEach(function (entry) {
                const li = document.createElement('li');
                li.className = 'history-item';
                const tagClass = entry.type === 'plus' ? 'plus'
                    : entry.type === 'minus' ? 'minus'
                        : entry.type === 'team-plus' ? 'team-plus'
                            : entry.type === 'team-minus' ? 'team-minus'
                                : entry.type === 'pick' || entry.type === 'team-pick' ? 'pick'
                                    : entry.type === 'timer-start' || entry.type === 'timer-stop' || entry.type === 'timer-end' ? 'timer'
                                        : entry.type === 'attendance' ? 'attendance'
                                            : entry.type === 'mode-start' || entry.type === 'mode-end' ? 'mode'
                                                : entry.type === 'exam-toggle' ? 'exam'
                                                    : entry.type === 'teams' ? 'teams'
                                                        : entry.type === 'role' ? 'role'
                                                            : entry.type === 'rank' ? 'role'
                                                                : entry.type === 'role-change' ? 'role-change'
                                                                    : entry.type === 'badge' ? 'badge'
                                                                        : entry.type === 'comment' ? 'comment'
                                                                            : 'remove';
                const typeLabel = entry.type === 'team-plus' ? 't+'
                    : entry.type === 'team-minus' ? 't-'
                        : entry.type === 'role-change' ? 'role*'
                            : entry.type === 'rank' ? 'rank'
                                : entry.type === 'pick' ? 'pick'
                                    : entry.type === 'team-pick' ? 't-pick'
                                        : entry.type === 'timer-start' ? 'timer'
                                            : entry.type === 'timer-stop' ? 't-stop'
                                                : entry.type === 'timer-end' ? 't-end'
                                                    : entry.type === 'mode-start' ? 'mode'
                                                        : entry.type === 'mode-end' ? 'mode*'
                                                            : entry.type === 'exam-toggle' ? 'exam'
                                                                : entry.type;
                const groupTag = entry.group ? ' <span style="color:#bbb;font-size:0.7rem;">(' + entry.group + ')</span>' : '';
                li.innerHTML = '<span class="history-time">' + entry.time + '</span>'
                    + '<span class="history-tag ' + tagClass + '">' + typeLabel + '</span>'
                    + '<span class="history-body"><strong>' + entry.studentName + '</strong> — ' + entry.detail + groupTag + '</span>';
                ul.appendChild(li);
            });
        }

        function clearHistory() {
            showConfirm('Clear all session history?', function () {
                sessionHistory = [];
                renderHistoryList();
            });
        }

        function exportHistoryCSV() {
            let csv = 'Time,Group,Student,Type,Detail\n';
            sessionHistory.forEach(function (e) {
                csv += '"' + e.time + '","' + (e.group || '') + '","' + e.studentName + '","' + e.type + '","' + e.detail.replace(/"/g, '""') + '"\n';
            });
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const now = new Date();
            const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
            link.download = 'SessionHistory_' + ts + '.csv';
            link.click();
        }

        // ============================================================
        // QUICK COMMENT / NOTES LOG
        // ============================================================

        let _openCommentStudentId = null;

        function openCommentPopup(event, studentId) {
            event.stopPropagation();
            const popup = document.getElementById('comment-popup');

            if (_openCommentStudentId === studentId && popup.classList.contains('open')) {
                popup.classList.remove('open');
                _openCommentStudentId = null;
                return;
            }

            _openCommentStudentId = studentId;
            const student = studentGroups[selectedGroupName].find(function (s) { return s.id === studentId; });

            document.getElementById('comment-popup-name').textContent = student ? student.name : '';
            document.getElementById('comment-textarea').value = '';
            renderNotesLog(student);

            popup.classList.add('open');
            const dot = event.currentTarget;
            const rect = dot.getBoundingClientRect();
            popup.style.visibility = 'hidden';
            requestAnimationFrame(function () {
                const pw = popup.offsetWidth;
                const ph = popup.offsetHeight;
                let top = rect.bottom + 6;
                if (top + ph > window.innerHeight - 10) top = rect.top - ph - 6;
                let left = rect.left - pw / 2;
                if (left < 8) left = 8;
                if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
                popup.style.top = top + 'px';
                popup.style.left = left + 'px';
                popup.style.visibility = '';
                document.getElementById('comment-textarea').focus();
            });
        }

        function renderNotesLog(student) {
            const log = document.getElementById('comment-notes-log');
            const notes = student && student.comments ? student.comments : [];
            if (notes.length === 0) {
                log.innerHTML = '<div class="comment-notes-empty">No notes yet.</div>';
                return;
            }
            log.innerHTML = notes.slice().reverse().map(function (n, i) {
                const realIdx = notes.length - 1 - i;
                return `<div class="comment-note-entry">
            <div class="comment-note-time">${n.datetime}</div>
            <div class="comment-note-text">${n.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <button class="comment-note-delete" onclick="deleteNote(${realIdx})" title="Delete this note"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
        </div>`;
            }).join('');
        }

        function deleteNote(noteIndex) {
            if (_openCommentStudentId === null) return;
            const student = studentGroups[selectedGroupName].find(function (s) { return s.id === _openCommentStudentId; });
            if (!student || !student.comments) return;
            student.comments.splice(noteIndex, 1);
            renderNotesLog(student);
            renderRoster();
            if (typeof autosaveToDb === 'function') autosaveToDb('comment-delete');
        }

        function saveComment() {
            if (_openCommentStudentId === null) return;
            const student = studentGroups[selectedGroupName].find(function (s) { return s.id === _openCommentStudentId; });
            if (!student) return;
            const text = document.getElementById('comment-textarea').value.trim();
            if (!text) return;

            if (!student.comments) student.comments = [];
            const now = new Date();
            const datetime = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
                now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            student.comments.push({ text: text, datetime: datetime, timestamp: now.toISOString() });

            logHistory('comment', student.name, text.substring(0, 60) + (text.length > 60 ? '…' : ''));

            document.getElementById('comment-textarea').value = '';
            renderNotesLog(student);
            renderRoster();
            if (typeof autosaveToDb === 'function') autosaveToDb('comment-save');
        }

        function closeCommentPopup() {
            document.getElementById('comment-popup').classList.remove('open');
            _openCommentStudentId = null;
        }

        document.addEventListener('click', function (e) {
            const popup = document.getElementById('comment-popup');
            if (popup && popup.classList.contains('open') && !popup.contains(e.target)) {
                closeCommentPopup();
            }
            const rolePopup = document.getElementById('role-change-popup');
            // Do not close the role popup when clicking inside the roster context menu
            const rosterMenu = document.getElementById('roster-context-menu');
            const clickedInRosterMenu = rosterMenu && rosterMenu.contains(e.target);
            if (rolePopup && rolePopup.classList.contains('open') && !rolePopup.contains(e.target) && !clickedInRosterMenu) {
                rolePopup.classList.remove('open');
            }
            const statsPopup = document.getElementById('student-stats-popup');
            if (statsPopup && statsPopup.classList.contains('open') && !statsPopup.contains(e.target) && !clickedInRosterMenu) {
                closeStudentStatsPopup();
            }
            const gradesPopup = document.getElementById('student-grades-popup');
            if (gradesPopup && gradesPopup.classList.contains('open') && !gradesPopup.contains(e.target) && !clickedInRosterMenu) {
                closeStudentGradesPopup();
            }
        });

        document.getElementById('comment-textarea').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveComment();
            }
        });

        function toggleRolesVisibility() {
            rolesVisible = !rolesVisible;
            const btn = document.getElementById('roles-toggle-btn');
            if (btn) {
                btn.classList.toggle('badges-hidden', !rolesVisible);
                btn.innerHTML = rolesVisible ? 'Roles' : '<s>Roles</s>';
            }
            syncRosterInlineToggleButtonStates();
            renderRoster();
            persistSettingsToUserFile().catch(err => console.warn('toggleRolesVisibility: could not save config:', err));
        }

        function toggleBadgesVisibility() {
            badgesVisible = !badgesVisible;
            const btn = document.getElementById('badges-toggle-btn');
            if (btn) {
                btn.classList.toggle('badges-hidden', !badgesVisible);
                btn.innerHTML = badgesVisible ? 'Badges' : '<s>Badges</s>';
            }
            syncRosterInlineToggleButtonStates();
            renderRoster();
            persistSettingsToUserFile().catch(err => console.warn('toggleBadgesVisibility: could not save config:', err));
        }

        // ============================================================
        // MODE SYSTEM & CUSTOMIZABLE MODE MANAGER
        // ============================================================

        const DEFAULT_CLASS_MODES = [
            {
                id: 'quiet',
                name: 'Quiet',
                icon: '🤫',
                shortcutKey: '1',
                text: { title: 'Quiet Work', subtitle: '', size: 'large', color: '#222222' },
                picture: { type: 'emoji', src: '🤫', animation: 'shush' },
                sound: { type: 'none', volume: 20, chime: false },
                isBuiltIn: true
            },
            {
                id: 'conversation',
                name: 'Talk',
                icon: '💬',
                shortcutKey: '2',
                text: { title: 'Conversation', subtitle: '', size: 'large', color: '#222222' },
                picture: { type: 'speech_bubbles', src: '', animation: 'bubbles' },
                sound: { type: 'none', volume: 20, chime: false },
                isBuiltIn: true
            },
            {
                id: 'group',
                name: 'Group',
                icon: '👥',
                shortcutKey: '3',
                text: { title: 'Group Work', subtitle: 'Work together with your team', size: 'large', color: '#222222' },
                picture: { type: 'group_icons', src: '', animation: 'bounce' },
                sound: { type: 'none', volume: 20, chime: false },
                isBuiltIn: true
            }
        ];

        let classModes = JSON.parse(JSON.stringify(DEFAULT_CLASS_MODES));
        let modeSetSettings = { defaultSetId: 'default', classSets: {} };
        let activeModeSetId = 'default';
        let modalEditingModeSetId = 'default';
        let activeEditingModeId = null;
        let isModeMinimised = false;
        let activeWorkingModeId = null;

        function openManageDatabaseForModes() {
            if (window.Desktop && typeof window.Desktop.openTool === 'function') {
                window.Desktop.openTool('manage-database.html', { query: { type: 'modebanks' } });
            } else {
                window.open('manage-database.html?type=modebanks', '_blank');
            }
        }

        async function populateModeSetSelector(desiredSetId) {
            const select = document.getElementById('cm-mode-set-select');
            const defAllCb = document.getElementById('cm-mode-set-default-all-cb');
            if (!select) return;

            const sets = (typeof ModeSets !== 'undefined' && typeof ModeSets.listSets === 'function')
                ? await ModeSets.listSets()
                : [{ id: 'default', name: 'Default (config.js)' }];

            const curClassSet = selectedGroupName && modeSetSettings?.classSets
                ? (modeSetSettings.classSets[selectedGroupName] || modeSetSettings.defaultSetId || 'default')
                : (modeSetSettings?.defaultSetId || 'default');

            const targetSetId = desiredSetId || (select.value && sets.some(s => s.id === select.value) ? select.value : curClassSet);

            select.innerHTML = sets.map(s => {
                const label = s.isDefault ? (typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t('eb_set_default', 'Default (config.js)') : 'Default (config.js)') : s.name;
                return `<option value="${escapeSettingsHtml(s.id)}" ${s.id === targetSetId ? 'selected' : ''}>${escapeSettingsHtml(label)}</option>`;
            }).join('');

            modalEditingModeSetId = select.value || targetSetId || 'default';
            if (defAllCb) {
                defAllCb.checked = (modeSetSettings?.defaultSetId === modalEditingModeSetId);
            }
        }

        async function onModeSetChange(newSetId) {
            modalEditingModeSetId = newSetId || 'default';
            const defAllCb = document.getElementById('cm-mode-set-default-all-cb');
            if (defAllCb) {
                defAllCb.checked = (modeSetSettings?.defaultSetId === modalEditingModeSetId);
            }

            if (selectedGroupName) {
                if (!modeSetSettings.classSets) modeSetSettings.classSets = {};
                if (modalEditingModeSetId === (modeSetSettings.defaultSetId || 'default')) {
                    delete modeSetSettings.classSets[selectedGroupName];
                } else {
                    modeSetSettings.classSets[selectedGroupName] = modalEditingModeSetId;
                }
            }

            const loaded = (typeof ModeSets !== 'undefined' && typeof ModeSets.loadSet === 'function')
                ? await ModeSets.loadSet(modalEditingModeSetId, getLoadedConfig()?.classModes)
                : null;

            if (loaded && Array.isArray(loaded)) {
                activeModeSetId = modalEditingModeSetId;
                classModes = loaded.map(m => {
                    const copy = { ...m };
                    if (copy.picture && typeof copy.picture === 'object' && copy.picture.src) {
                        copy.picture = { ...copy.picture, src: sanitizeModeImgSrc(copy.picture.src) };
                    }
                    return copy;
                });
                renderModeManagerList();
                renderTimerModeShortcuts();
            }
            persistSettingsToUserFile().catch(err => console.warn('onModeSetChange save config:', err));
        }

        function toggleModeSetDefaultAll(checked) {
            if (!modeSetSettings) modeSetSettings = { defaultSetId: 'default', classSets: {} };
            if (checked) {
                modeSetSettings.defaultSetId = modalEditingModeSetId;
            } else if (modeSetSettings.defaultSetId === modalEditingModeSetId) {
                modeSetSettings.defaultSetId = 'default';
            }
            persistSettingsToUserFile().catch(err => console.warn('toggleModeSetDefaultAll save config:', err));
        }

        async function copyConfigModesToDatabaseFile() {
            const promptMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                ? i18n.t('mode_copy_to_db_prompt', 'Enter filename for the new custom mode database (.js):')
                : 'Enter filename for the new custom mode database (.js):';
            const rawName = (typeof showPrompt === 'function')
                ? await showPrompt(promptMsg, 'custom-modes.js')
                : prompt(promptMsg, 'custom-modes.js');
            if (!rawName || !String(rawName).trim()) return;

            let filename = String(rawName).trim().replace(/[\\/:*?"<>|]/g, '-');
            if (!/\.js$/i.test(filename)) filename += '.js';

            const loadedCfg = (typeof getLoadedConfig === 'function') ? getLoadedConfig() : null;
            const sourceModes = (activeModeSetId === 'default' && Array.isArray(classModes) && classModes.length > 0)
                ? classModes
                : (Array.isArray(loadedCfg?.classModes) && loadedCfg.classModes.length > 0
                    ? loadedCfg.classModes
                    : (typeof ModeSets !== 'undefined' && typeof ModeSets.getCachedDefs === 'function' && ModeSets.getCachedDefs('default')) || DEFAULT_CLASS_MODES);

            const normalized = (typeof ModeSets !== 'undefined' && typeof ModeSets.normalizeDefs === 'function')
                ? ModeSets.normalizeDefs(sourceModes)
                : JSON.parse(JSON.stringify(sourceModes));

            const fileContent = `// Custom Mode Database — Class Management Tools\nconst customModeBank = ${JSON.stringify(normalized, null, 2)};\n`;

            if (typeof Desktop !== 'undefined' && typeof Desktop.saveText === 'function') {
                const res = await Desktop.saveText('customModes', filename, fileContent);
                if (!res || !res.ok) {
                    const errMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                        ? i18n.t('mode_copy_to_db_error', 'Failed to save custom mode database.')
                        : 'Failed to save custom mode database.';
                    if (typeof showToast === 'function') showToast(res?.error || errMsg, true);
                    return;
                }
            } else {
                const errMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                    ? i18n.t('mode_copy_to_db_error', 'Failed to save custom mode database.')
                    : 'Failed to save custom mode database.';
                if (typeof showToast === 'function') showToast(errMsg, true);
                return;
            }

            if (typeof ModeSets !== 'undefined' && typeof ModeSets.clearCache === 'function') {
                ModeSets.clearCache();
            }
            try {
                if (typeof BroadcastChannel !== 'undefined') {
                    const ch = new BroadcastChannel('cmt-modebanks');
                    ch.postMessage({ type: 'modebanks-updated', filename: filename, timestamp: Date.now() });
                    ch.close();
                }
            } catch (_) {}

            await populateModeSetSelector(filename.replace(/\.js$/i, ''));
            const okMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                ? i18n.t('mode_copy_to_db_success', 'Modes copied to')
                : 'Modes copied to';
            if (typeof showToast === 'function') showToast(`${okMsg} ${filename}`);
        }

        async function applyModeSetForClass(classId) {
            if (!classId) return;
            const targetSetId = (typeof ModeSets !== 'undefined' && typeof ModeSets.resolveForClass === 'function')
                ? ModeSets.resolveForClass(classId, modeSetSettings)
                : (modeSetSettings?.defaultSetId || 'default');

            const loadedDefs = (typeof ModeSets !== 'undefined' && typeof ModeSets.loadSet === 'function')
                ? await ModeSets.loadSet(targetSetId, getLoadedConfig()?.classModes)
                : null;

            if (loadedDefs && Array.isArray(loadedDefs)) {
                activeModeSetId = targetSetId;
                classModes = loadedDefs.map(m => {
                    const copy = { ...m };
                    if (copy.picture && typeof copy.picture === 'object' && copy.picture.src) {
                        copy.picture = { ...copy.picture, src: sanitizeModeImgSrc(copy.picture.src) };
                    }
                    return copy;
                });
                renderTimerModeShortcuts();
            } else if (targetSetId !== 'default') {
                const defaultDefs = (typeof ModeSets !== 'undefined' && typeof ModeSets.loadSet === 'function')
                    ? await ModeSets.loadSet('default', getLoadedConfig()?.classModes)
                    : DEFAULT_CLASS_MODES;
                activeModeSetId = 'default';
                classModes = (defaultDefs || DEFAULT_CLASS_MODES).map(m => ({ ...m }));
                renderTimerModeShortcuts();
            }
        }

        function getModeSvgIcon(mode) {
            if (!mode) return '../assets/icons/theater.svg';
            if (mode.id === 'quiet') return '../assets/icons/shush.svg';
            if (mode.id === 'conversation') return '../assets/icons/speech-bubbles.svg';
            if (mode.id === 'group') return '../assets/icons/people-group.svg';
            if (mode.svgIcon) {
                const s = String(mode.svgIcon).replace(/\\/g, '/');
                if (s.startsWith('../') || s.startsWith('file://') || s.startsWith('data:')) return s;
                if (s.startsWith('assets/')) return '../' + s;
                return `../assets/icons/${s.replace(/^icons\//, '')}`;
            }
            if (typeof mode.icon === 'string') {
                const iconStr = mode.icon.replace(/\\/g, '/');
                if (iconStr.endsWith('.svg')) {
                    if (iconStr.startsWith('../') || iconStr.startsWith('file://') || iconStr.startsWith('data:')) return iconStr;
                    if (iconStr.startsWith('assets/')) return '../' + iconStr;
                    return `../assets/icons/${iconStr.replace(/^icons\//, '')}`;
                }
                if (mode.icon.includes('🤫') || mode.icon.toLowerCase().includes('quiet') || mode.icon.toLowerCase().includes('shush')) return '../assets/icons/shush.svg';
                if (mode.icon.includes('💬') || mode.icon.toLowerCase().includes('chat') || mode.icon.toLowerCase().includes('talk') || mode.icon.toLowerCase().includes('conversation')) return '../assets/icons/speech-bubbles.svg';
                if (mode.icon.includes('👥') || mode.icon.toLowerCase().includes('group') || mode.icon.toLowerCase().includes('team')) return '../assets/icons/people-group.svg';
                if (mode.icon.includes('🌬') || mode.icon.toLowerCase().includes('wind')) return '../assets/icons/wind.svg';
                if (mode.icon.includes('🌸') || mode.icon.toLowerCase().includes('flower')) return '../assets/icons/flower.svg';
                if (mode.icon.includes('🌊') || mode.icon.toLowerCase().includes('ocean') || mode.icon.toLowerCase().includes('wave')) return '../assets/icons/ocean.svg';
                if (mode.icon.includes('🎵') || mode.icon.toLowerCase().includes('music') || mode.icon.toLowerCase().includes('audio')) return '../assets/icons/music.svg';
                if (mode.icon.includes('📖') || mode.icon.includes('📚')) return '../assets/icons/book.svg';
                if (mode.icon.includes('✍️') || mode.icon.includes('📝')) return '../assets/icons/draw.svg';
                if (mode.icon.includes('⚡') || mode.icon.includes('💡')) return '../assets/icons/zap.svg';
                if (mode.icon.includes('🎮') || mode.icon.includes('🎲')) return '../assets/icons/dice.svg';
            }
            return '../assets/icons/theater.svg';
        }

        function renderTimerModeShortcuts() {
            // Render 1: Timer Popup shortcuts (.timer-mode-shortcuts)
            const popupContainer = document.getElementById('timer-mode-shortcuts-container');
            if (popupContainer) {
                let html = classModes.map(mode => {
                    const svgSrc = getModeSvgIcon(mode);
                    const name = mode.name || (mode.text && mode.text.title) || 'Mode';
                    const keyStr = mode.shortcutKey ? ` (${mode.shortcutKey})` : '';
                    const isAct = activeWorkingModeId && (mode.id === activeWorkingModeId || String(mode.name || '').toLowerCase() === String(activeWorkingModeId).toLowerCase());
                    return `<button class="timer-mode-shortcut${isAct ? ' active' : ''}" onclick="activateMode('${mode.id}')" title="${name}${keyStr}"><img src="${svgSrc}" class="btn-icon" alt="" /><span>${name}</span></button>`;
                }).join('');
                popupContainer.innerHTML = html;
            }

            // Render 2: Mode Picker options (.mode-options)
            const pickerContainer = document.getElementById('mode-picker-options-container');
            if (pickerContainer) {
                pickerContainer.innerHTML = classModes.map(mode => {
                    const icon = mode.icon || '🎭';
                    const name = mode.name || 'Mode';
                    const kbd = mode.shortcutKey ? `<span class="mode-kbd">${mode.shortcutKey}</span>` : '';
                    return `<button class="mode-option-btn" onclick="activateMode('${mode.id}')">
                        <span class="mode-icon">${icon}</span>
                        <span>${name}</span>
                        ${kbd}
                    </button>`;
                }).join('');
            }

            // Render 3: Fullscreen Mode Overlay shortcuts (#mode-overlay-shortcuts)
            const overlayContainer = document.getElementById('mode-overlay-shortcuts');
            if (overlayContainer) {
                const noisePanel = document.getElementById('mode-overlay-noise-panel');
                let btnsHtml = classModes.map(mode => {
                    const svgSrc = getModeSvgIcon(mode);
                    const kbd = mode.shortcutKey ? `<kbd>${mode.shortcutKey}</kbd>` : '';
                    return `<button class="mode-overlay-shortcut-btn" onclick="activateMode('${mode.id}')"><img src="${svgSrc}" class="btn-icon" alt="" />${kbd}</button>`;
                }).join('');
                if (noisePanel && noisePanel.parentNode === overlayContainer) {
                    // Preserve #mode-overlay-noise-panel DOM node so its delegated/bound event listeners remain attached
                    overlayContainer.querySelectorAll('.mode-overlay-shortcut-btn').forEach(btn => btn.remove());
                    if (btnsHtml) {
                        noisePanel.insertAdjacentHTML('beforebegin', btnsHtml);
                    }
                } else {
                    overlayContainer.innerHTML = btnsHtml;
                }
            }

            // Render 4: Fullscreen Timer overlay mode buttons (#timer-overlay-mode-btns)
            const timerOverlayModeBtns = document.getElementById('timer-overlay-mode-btns');
            if (timerOverlayModeBtns) {
                timerOverlayModeBtns.innerHTML = classModes.map((mode, index) => {
                    const svgSrc = getModeSvgIcon(mode);
                    const name = mode.name || (mode.text && mode.text.title) || 'Mode';
                    const kbd = mode.shortcutKey || (index + 1);
                    const title = `${name} (${kbd})`;
                    return `<button class="timer-overlay-mode-btn" onclick="activateMode('${mode.id}')" title="${title}"><img src="${svgSrc}" class="btn-icon" alt="" /><span>${kbd}</span></button>`;
                }).join('');
            }
            if (typeof intervalBuilderInitialized !== 'undefined' && intervalBuilderInitialized && document.getElementById('interval-inputs-section')?.style.display !== 'none' && typeof renderIntervalStepsList === 'function') {
                renderIntervalStepsList();
            }
        }

        function openModePicker() {
            renderTimerModeShortcuts();
            document.getElementById('mode-picker-modal').style.display = 'flex';
        }

        function closeModePicker() {
            document.getElementById('mode-picker-modal').style.display = 'none';
        }

        async function openModeManager() {
            closeModePicker();
            await openSettingsModal('modes');
        }

        function closeModeManager() {
            closeSettingsModal();
        }

        function renderModeManagerList() {
            const list = document.getElementById('mode-manager-list');
            if (!list) return;
            if (!classModes.length) {
                list.innerHTML = '<div style="color:#888; text-align:center; padding:12px;">No modes defined. Click "+ New Mode" to add one.</div>';
                return;
            }
            list.innerHTML = classModes.map((mode, index) => {
                const icon = mode.icon || '';
                const iconDisplay = icon ? `<span style="font-size:1.4rem;">${escapeSettingsHtml(icon)}</span>` : `<img src="${getModeSvgIcon(mode)}" class="btn-icon" style="width:24px;height:24px;" alt="" />`;
                const key = mode.shortcutKey ? `<span style="background:#eee; border:1px solid #ccc; border-radius:3px; padding:1px 5px; font-size:0.75rem; font-weight:bold;">${escapeSettingsHtml(mode.shortcutKey)}</span>` : '';
                const builtInBadge = mode.isBuiltIn ? '<span style="font-size:0.7rem; color:#888; background:#f0f0f0; border-radius:3px; padding:2px 6px;">Built-in</span>' : '';
                const isFirst = index === 0;
                const isLast = index === classModes.length - 1;

                return `<div class="mode-manager-item" style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#f9f9f9; border:2px solid #333333; border-radius:6px; box-shadow:2px 2px 0 #555555;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <button type="button" onclick="reorderMode(${index}, -1)" ${isFirst ? 'disabled style="opacity:0.3;"' : ''} style="background:none; border:none; cursor:pointer; padding:2px;" title="Move up"><img src="../assets/icons/arrow-up.svg" class="btn-icon" style="width:12px;height:12px;margin:0;" alt="" /></button>
                            <button type="button" onclick="reorderMode(${index}, 1)" ${isLast ? 'disabled style="opacity:0.3;"' : ''} style="background:none; border:none; cursor:pointer; padding:2px;" title="Move down"><img src="../assets/icons/arrow-down.svg" class="btn-icon" style="width:12px;height:12px;margin:0;" alt="" /></button>
                        </div>
                        ${iconDisplay}
                        <div>
                            <div style="font-weight:bold; font-size:0.95rem; display:flex; align-items:center; gap:6px;">${escapeSettingsHtml(mode.name || '')} ${key} ${builtInBadge}</div>
                            <div style="font-size:0.78rem; color:#666;">${escapeSettingsHtml(mode.text?.title || '')}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button type="button" onclick="openModeEditor('${escapeSettingsHtml(mode.id)}')" title="Edit Mode" class="btn btn-outline" style="border:1.5px solid #333333; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/edit.svg" class="btn-icon" style="width:12px;height:12px;margin:0;" alt="" /> Edit</button>
                        <button type="button" onclick="duplicateMode('${escapeSettingsHtml(mode.id)}')" title="Duplicate Mode" class="btn btn-outline" style="border:1.5px solid #333333; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/copy.svg" class="btn-icon" style="width:12px;height:12px;margin:0;" alt="" /> Duplicate</button>
                        <button type="button" onclick="deleteMode('${escapeSettingsHtml(mode.id)}')" title="Delete Mode" class="btn btn-outline" style="border:1.5px solid #c96b6b; color:#c96b6b; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><img src="../assets/icons/trash.svg" class="btn-icon" style="width:12px;height:12px;margin:0;" alt="" /> Delete</button>
                    </div>
                </div>`;
            }).join('');
        }

        async function persistActiveModes() {
            const setId = (typeof activeModeSetId !== 'undefined' && activeModeSetId) ? activeModeSetId : 'default';
            if (typeof ModeSets !== 'undefined' && typeof ModeSets.setCachedDefs === 'function') {
                ModeSets.setCachedDefs(setId, classModes);
            }
            if (setId === 'default') {
                return persistSettingsToUserFile();
            }
            // Custom mode set: persist directly to user/custom-data/modes/<setId>.js
            if (typeof Desktop !== 'undefined' && typeof Desktop.saveText === 'function') {
                const normalized = (typeof ModeSets !== 'undefined' && typeof ModeSets.normalizeDefs === 'function')
                    ? ModeSets.normalizeDefs(classModes)
                    : classModes;
                const filename = /\.js$/i.test(setId) ? setId : `${setId}.js`;
                const fileContent = `// Custom Mode Database — Class Management Tools\nconst customModeBank = ${JSON.stringify(normalized, null, 2)};\n`;
                const res = await Desktop.saveText('customModes', filename, fileContent);
                try {
                    if (typeof BroadcastChannel !== 'undefined') {
                        const ch = new BroadcastChannel('cmt-modebanks');
                        ch.postMessage({ type: 'modebanks-updated', filename, timestamp: Date.now() });
                        ch.close();
                    }
                } catch (_) { }
                return res;
            }
        }

        function reorderMode(index, delta) {
            const target = index + delta;
            if (target < 0 || target >= classModes.length) return;
            const item = classModes.splice(index, 1)[0];
            classModes.splice(target, 0, item);
            renderModeManagerList();
            renderTimerModeShortcuts();
            persistActiveModes().catch(err => console.warn('reorderMode config save error:', err));
        }

        function createNewMode() {
            const newId = 'mode_' + Date.now();
            const newMode = {
                id: newId,
                name: 'Custom Mode',
                icon: '⭐️',
                shortcutKey: String(Math.min(classModes.length + 1, 9)),
                title: 'Custom Mode',
                subtitle: 'Follow instructions',
                textColor: '#ffffff',
                textSize: 'large',
                pictureType: 'emoji',
                pictureSrc: '⭐️',
                pictureAnim: 'pulse',
                pictureFit: 'fit',
                soundType: 'none',
                soundFile: '',
                soundVol: 20,
                soundChime: false,
                text: { title: 'Custom Mode', subtitle: 'Follow instructions', size: 'large', color: '#ffffff' },
                picture: { type: 'emoji', src: '⭐️', animation: 'pulse', fit: 'fit' },
                sound: { type: 'none', file: '', volume: 20, chime: false },
                isBuiltIn: false
            };
            classModes.push(newMode);
            renderModeManagerList();
            renderTimerModeShortcuts();
            openModeEditor(newId);
        }

        function duplicateMode(modeId) {
            const original = classModes.find(m => m.id === modeId);
            if (!original) return;
            const dup = JSON.parse(JSON.stringify(original));
            dup.id = 'mode_' + Date.now();
            dup.name = original.name + ' (Copy)';
            dup.isBuiltIn = false;
            dup.shortcutKey = String(Math.min(classModes.length + 1, 9));
            classModes.push(dup);
            renderModeManagerList();
            renderTimerModeShortcuts();
            persistActiveModes().catch(err => console.warn('duplicateMode save config:', err));
        }

        async function deleteMode(modeId) {
            const index = classModes.findIndex(m => m.id === modeId);
            if (index === -1) return;
            const confirmed = (typeof showConfirm === 'function') ? await showConfirm(`Are you sure you want to delete "${classModes[index].name}"?`) : confirm(`Are you sure you want to delete "${classModes[index].name}"?`);
            if (confirmed) {
                if (activeWorkingModeId === modeId) {
                    closeMode();
                }
                classModes.splice(index, 1);
                renderModeManagerList();
                renderTimerModeShortcuts();
                persistActiveModes().catch(err => console.warn('deleteMode save config:', err));
            }
        }

        async function resetModesToDefault() {
            const confirmed = (typeof showConfirm === 'function') ? await showConfirm('Reset class modes to standard defaults (Quiet, Talk, Group)?') : confirm('Reset class modes to standard defaults (Quiet, Talk, Group)?');
            if (confirmed) {
                if (activeWorkingModeId) {
                    closeMode();
                }
                classModes = JSON.parse(JSON.stringify(DEFAULT_CLASS_MODES));
                renderModeManagerList();
                renderTimerModeShortcuts();
                persistActiveModes().catch(err => console.warn('resetModesToDefault save config:', err));
            }
        }

        function switchModeEditorTab(tabName, evt) {
            document.querySelectorAll('.mode-editor-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.mode-editor-tab-content').forEach(c => c.style.display = 'none');

            if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
            const target = document.getElementById('mode-editor-tab-' + tabName);
            if (target) target.style.display = 'block';
        }

        function openModeEditor(modeId) {
            stopModeEditorTestSound();
            const mode = classModes.find(m => m.id === modeId);
            if (!mode) return;
            activeEditingModeId = modeId;

            document.getElementById('mode-editor-title').textContent = 'Edit Mode: ' + mode.name;
            document.getElementById('mode-edit-name').value = mode.name || '';
            document.getElementById('mode-edit-icon').value = mode.icon || '🎭';
            document.getElementById('mode-edit-shortcut').value = mode.shortcutKey || '';

            document.getElementById('mode-edit-text-title').value = mode.text?.title || mode.name || '';
            document.getElementById('mode-edit-text-subtitle').value = mode.text?.subtitle || '';
            document.getElementById('mode-edit-text-color').value = resolveModeTextColor(mode.text?.color, mode.picture?.animation);
            document.getElementById('mode-edit-text-size').value = mode.text?.size || 'large';

            const picType = mode.picture?.type || 'emoji';
            document.getElementById('mode-edit-pic-type').value = picType;
            document.getElementById('mode-edit-pic-src').value = mode.picture?.src || '';
            document.getElementById('mode-edit-pic-url').value = (picType === 'custom_url' || picType === 'custom_file') ? (mode.picture?.src || '') : '';
            document.getElementById('mode-edit-pic-anim').value = mode.picture?.animation || 'none';
            document.getElementById('mode-edit-pic-fit').value = mode.picture?.fit || 'fit';
            togglePictureTypeFields();

            document.getElementById('mode-edit-sound-type').value = mode.sound?.type || 'none';
            populateModeAudioFileDropdown(mode.sound?.file || '');
            toggleSoundTypeFields();

            const vol = mode.sound?.volume ?? 20;
            document.getElementById('mode-edit-sound-vol').value = vol;
            document.getElementById('mode-edit-sound-vol-val').textContent = vol + '%';
            document.getElementById('mode-edit-sound-chime').checked = !!mode.sound?.chime;

            switchModeEditorTab('general', { currentTarget: document.getElementById('tab-btn-gen') });
            document.getElementById('mode-editor-modal').style.display = 'flex';
        }

        function closeModeEditor() {
            stopModeEditorTestSound();
            document.getElementById('mode-editor-modal').style.display = 'none';
            activeEditingModeId = null;
        }

        let _cachedUserBaseUrl = null;
        (function _initUserBaseUrl() {
            if (window.Desktop && typeof window.Desktop.resolvePath === 'function') {
                window.Desktop.resolvePath('user', '.').then(res => {
                    if (typeof res === 'string' && res) {
                        _cachedUserBaseUrl = res.replace(/\/?$/, '/');
                    } else if (res?.path) {
                        let p = String(res.path).replace(/\\/g, '/');
                        if (!p.startsWith('/')) p = '/' + p;
                        _cachedUserBaseUrl = 'file://' + encodeURI(p).replace(/\/?$/, '/');
                    }
                }).catch(() => { });
            }
        })();

        function sanitizeModeImgSrc(imgSrc) {
            if (!imgSrc) return '';
            let src = (typeof imgSrc === 'object' && imgSrc !== null)
                ? (imgSrc.path || imgSrc.fileUrl || imgSrc.filename || imgSrc.src || String(imgSrc))
                : String(imgSrc);
            src = src.trim().replace(/\\/g, '/');
            if (!src) return '';
            if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
                return src;
            }

            // Decode URI components in case it was stored as encoded file:// URL (e.g. %20 for spaces)
            let decoded = src;
            try { decoded = decodeURIComponent(src); } catch (_) { }
            decoded = decoded.replace(/\\/g, '/');

            // Extract relative portable path if it points to mode-image
            const modeImgIdx = decoded.toLowerCase().lastIndexOf('/user/mode-image/');
            if (modeImgIdx !== -1) {
                return 'user/mode-image/' + decoded.substring(modeImgIdx + '/user/mode-image/'.length).replace(/^\/+/, '');
            }
            const modeImgShortIdx = decoded.toLowerCase().lastIndexOf('/mode-image/');
            if (modeImgShortIdx !== -1) {
                return 'user/mode-image/' + decoded.substring(modeImgShortIdx + '/mode-image/'.length).replace(/^\/+/, '');
            }
            const userIdx = decoded.toLowerCase().lastIndexOf('/user/');
            if (userIdx !== -1 && !decoded.toLowerCase().includes('/node_modules/')) {
                return 'user/' + decoded.substring(userIdx + '/user/'.length).replace(/^\/+/, '');
            }
            const assetsIdx = decoded.toLowerCase().lastIndexOf('/assets/');
            if (assetsIdx !== -1) {
                return 'assets/' + decoded.substring(assetsIdx + '/assets/'.length).replace(/^\/+/, '');
            }

            if (decoded.startsWith('user/')) return decoded;
            if (decoded.startsWith('../user/')) return decoded.substring(3);
            if (decoded.startsWith('./user/')) return decoded.substring(2);
            if (decoded.startsWith('mode-image/')) return 'user/' + decoded;
            if (decoded.startsWith('../mode-image/')) return 'user/' + decoded.substring(3);

            // If it's a file:// or absolute path that couldn't be matched above, preserve it
            if (src.startsWith('file://') || src.startsWith('/') || /^[a-zA-Z]:\//.test(src)) {
                return src;
            }

            // Otherwise treat bare filename as user/mode-image/
            return 'user/mode-image/' + decoded.replace(/^(\.\/|\.\.\/)+/, '');
        }

        function resolveModeImgUrl(imgSrc) {
            if (!imgSrc) return '';
            let src = (typeof imgSrc === 'object' && imgSrc !== null)
                ? (imgSrc.path || imgSrc.fileUrl || imgSrc.filename || imgSrc.src || String(imgSrc))
                : String(imgSrc);
            src = src.trim().replace(/\\/g, '/');
            if (!src) return '';

            if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
                return src;
            }

            const sanitized = sanitizeModeImgSrc(src);

            if (sanitized.startsWith('data:') || sanitized.startsWith('http://') || sanitized.startsWith('https://') || sanitized.startsWith('blob:')) {
                return sanitized;
            }

            if (sanitized.startsWith('user/')) {
                if (_cachedUserBaseUrl) {
                    return _cachedUserBaseUrl + sanitized.substring(5);
                }
                return '../' + sanitized;
            }
            if (sanitized.startsWith('../user/') || sanitized.startsWith('../assets/')) {
                return sanitized;
            }
            if (sanitized.startsWith('assets/')) {
                return '../' + sanitized;
            }
            if (sanitized.startsWith('./')) {
                return '../' + sanitized.substring(2);
            }
            if (sanitized.startsWith('../')) {
                return sanitized;
            }

            // Fallback for file:// or absolute paths
            if (sanitized.startsWith('file://')) {
                return sanitized;
            }
            if (sanitized.startsWith('/')) {
                return 'file://' + encodeURI(sanitized);
            }
            if (/^[a-zA-Z]:\//.test(sanitized)) {
                return 'file:///' + encodeURI(sanitized);
            }

            if (_cachedUserBaseUrl) {
                return _cachedUserBaseUrl + 'mode-image/' + sanitized.replace(/^mode-image\//, '');
            }
            return '../user/mode-image/' + sanitized.replace(/^mode-image\//, '');
        }

        function togglePictureTypeFields() {
            const type = document.getElementById('mode-edit-pic-type').value;
            const fileWrap = document.getElementById('mode-edit-pic-file-wrap');
            const urlWrap = document.getElementById('mode-edit-pic-url-wrap');
            if (fileWrap) fileWrap.style.display = type === 'custom_file' ? 'block' : 'none';
            if (urlWrap) urlWrap.style.display = type === 'custom_url' ? 'block' : 'none';

            const previewWrap = document.getElementById('mode-edit-pic-preview');
            const previewImg = document.getElementById('mode-edit-pic-preview-img');
            const srcVal = document.getElementById('mode-edit-pic-src')?.value || '';
            if (previewWrap && previewImg) {
                if ((type === 'custom_file' || type === 'custom_url') && srcVal) {
                    previewImg.src = resolveModeImgUrl(srcVal);
                    previewWrap.style.display = 'block';
                } else {
                    previewWrap.style.display = 'none';
                }
            }
        }

        let _modeEditorTestAudio = null;
        let _modeEditorTestGain = null;
        let _modeEditorTestSource = null;

        function stopModeEditorTestSound() {
            if (_modeEditorTestAudio) {
                try {
                    _modeEditorTestAudio.pause();
                    _modeEditorTestAudio.currentTime = 0;
                } catch (_) { }
                _modeEditorTestAudio = null;
            }
            if (_modeEditorTestGain && audioContext) {
                try {
                    _modeEditorTestGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
                } catch (_) { }
            }
            if (_modeEditorTestSource) {
                try { _modeEditorTestSource.stop(); } catch (_) { }
                _modeEditorTestSource = null;
            }
            _modeEditorTestGain = null;
            const btn = document.getElementById('mode-editor-test-sound-btn');
            if (btn) {
                btn.classList.remove('playing');
                btn.innerHTML = '<img src="../assets/icons/volume.svg" class="btn-icon" alt="" style="width:14px; height:14px;" /> <span data-i18n="mode_test_sound">Test Sound</span>';
            }
        }

        async function toggleModeEditorTestSound() {
            const btn = document.getElementById('mode-editor-test-sound-btn');
            if (btn && btn.classList.contains('playing')) {
                stopModeEditorTestSound();
                return;
            }
            stopModeEditorTestSound();

            const soundType = document.getElementById('mode-edit-sound-type')?.value || 'none';
            const soundFile = document.getElementById('mode-edit-sound-file')?.value || '';
            const volNum = parseInt(document.getElementById('mode-edit-sound-vol')?.value, 10) || 20;
            const volFraction = Math.max(0, Math.min(1, volNum / 100));

            if (soundType === 'none') {
                if (typeof showToast === 'function') showToast('Select an ambient noise type first.', false);
                return;
            }

            if (audioContext && audioContext.state === 'suspended') {
                try { await audioContext.resume(); } catch (_) { }
            }

            if (soundType === 'file') {
                const filePath = normalizeSoundFilePath(soundFile);
                if (!filePath) {
                    if (typeof showToast === 'function') showToast('Please select or upload an audio file first.', true);
                    return;
                }
                const url = await getSoundFileUrl(filePath);
                if (!url) {
                    if (typeof showToast === 'function') showToast('Could not load sound file.', true);
                    return;
                }
                try {
                    const audio = new Audio(url);
                    audio.loop = true;
                    audio.volume = volFraction;
                    await audio.play();
                    _modeEditorTestAudio = audio;
                } catch (err) {
                    console.warn('Mode editor audio test play error:', err);
                    if (typeof showToast === 'function') showToast('Error playing audio file.', true);
                    return;
                }
            } else if (['white', 'pink', 'brown'].includes(soundType)) {
                try {
                    const sampleRate = audioContext.sampleRate;
                    const bufLen = 4 * sampleRate;
                    const buffer = audioContext.createBuffer(1, bufLen, sampleRate);
                    const data = buffer.getChannelData(0);

                    if (soundType === 'brown') {
                        let lastOut = 0;
                        for (let i = 0; i < bufLen; i++) {
                            const white = Math.random() * 2 - 1;
                            lastOut = (lastOut + 0.02 * white) / 1.02;
                            data[i] = lastOut;
                        }
                        let peak = 0;
                        for (let i = 0; i < bufLen; i++) if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
                        if (peak > 0) for (let i = 0; i < bufLen; i++) data[i] /= peak;
                    } else if (soundType === 'pink') {
                        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                        for (let i = 0; i < bufLen; i++) {
                            const white = Math.random() * 2 - 1;
                            b0 = 0.99886 * b0 + white * 0.0555179;
                            b1 = 0.99332 * b1 + white * 0.0750759;
                            b2 = 0.96900 * b2 + white * 0.1538520;
                            b3 = 0.86650 * b3 + white * 0.3104856;
                            b4 = 0.55000 * b4 + white * 0.5329522;
                            b5 = -0.7616 * b5 - white * 0.0168980;
                            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                            b6 = white * 0.115926;
                        }
                    } else {
                        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
                    }

                    const src = audioContext.createBufferSource();
                    src.buffer = buffer;
                    src.loop = true;

                    const gain = audioContext.createGain();
                    gain.gain.setValueAtTime(volFraction, audioContext.currentTime);

                    if (soundType === 'white') {
                        const lpf = audioContext.createBiquadFilter();
                        lpf.type = 'lowpass';
                        lpf.frequency.value = 3500;
                        src.connect(lpf);
                        lpf.connect(gain);
                    } else if (soundType === 'brown') {
                        const shelf = audioContext.createBiquadFilter();
                        shelf.type = 'lowshelf';
                        shelf.frequency.value = 200;
                        shelf.gain.value = 4;
                        src.connect(shelf);
                        shelf.connect(gain);
                    } else {
                        src.connect(gain);
                    }

                    gain.connect(audioContext.destination);
                    src.start();
                    _modeEditorTestSource = src;
                    _modeEditorTestGain = gain;
                } catch (err) {
                    console.warn('Mode editor noise test error:', err);
                    return;
                }
            }

            if (btn) {
                btn.classList.add('playing');
                btn.innerHTML = '<img src="../assets/icons/stop.svg" class="btn-icon" alt="" style="width:14px; height:14px;" /> <span data-i18n="mode_stop_sound">Stop Sound</span>';
            }
        }

        function onModeEditorVolumeInput(val) {
            const numVal = Math.max(0, Math.min(100, Number(val) || 0));
            const lbl = document.getElementById('mode-edit-sound-vol-val');
            if (lbl) lbl.textContent = numVal + '%';

            const volFraction = numVal / 100;
            if (_modeEditorTestAudio) {
                _modeEditorTestAudio.volume = volFraction;
            }
            if (_modeEditorTestGain && audioContext) {
                try { _modeEditorTestGain.gain.setTargetAtTime(volFraction, audioContext.currentTime, 0.05); } catch (_) { }
            }

            // If the mode being edited is currently active, update live
            if (activeWorkingModeId && activeWorkingModeId === activeEditingModeId) {
                overlayNoiseVolume(numVal);
            }
        }

        function toggleSoundTypeFields() {
            const type = document.getElementById('mode-edit-sound-type').value;
            const fileWrap = document.getElementById('mode-edit-sound-file-wrap');
            if (fileWrap) fileWrap.style.display = (type === 'file') ? 'block' : 'none';
            stopModeEditorTestSound();
        }

        function populateModeAudioFileDropdown(selectedPath = '') {
            const select = document.getElementById('mode-edit-sound-file');
            if (!select) return;
            if (!availableSoundFiles || !availableSoundFiles.length) {
                select.innerHTML = '<option value="">(No sound files found)</option>';
                return;
            }
            const normalizedSelected = resolveSoundFileMatch(selectedPath);
            select.innerHTML = buildSoundFileOptionsHtml(normalizedSelected);
        }

        async function handleModeAudioUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (window.Desktop && typeof window.Desktop.saveFile === 'function') {
                try {
                    const ext = file.name.split('.').pop() || 'mp3';
                    const targetName = `sound_${Date.now()}.${ext}`;
                    const targetFolder = 'user/custom-data/sounds';

                    const reader = new FileReader();
                    reader.onload = async function (e) {
                        const content = e.target.result;
                        const res = await window.Desktop.saveFile({
                            folder: targetFolder,
                            filename: targetName,
                            content: content
                        });
                        const filePath = res?.path || `sounds/${targetName}`;
                        if (!availableSoundFiles.includes(filePath)) availableSoundFiles.push(filePath);
                        populateModeAudioFileDropdown(filePath);
                        persistSettingsToUserFile({ soundFiles: availableSoundFiles }).catch(() => { });
                    };
                    reader.readAsDataURL(file);
                    return;
                } catch (err) {
                    console.warn('Custom audio upload error:', err);
                }
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const dataUrl = e.target.result;
                const nameKey = file.name;
                if (!availableSoundFiles.includes(nameKey)) availableSoundFiles.push(nameKey);
                populateModeAudioFileDropdown(nameKey);
            };
            reader.readAsDataURL(file);
        }

        async function handleModeImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const previewImg = document.getElementById('mode-edit-pic-preview-img');
            const previewWrap = document.getElementById('mode-edit-pic-preview');

            // If Desktop electron bridge available, save file into dedicated user/mode-image directory
            if (window.Desktop && typeof window.Desktop.saveFile === 'function') {
                try {
                    const ext = file.name.split('.').pop() || 'png';
                    const targetName = `mode_img_${Date.now()}.${ext}`;
                    const targetSubfolder = 'user/mode-image';

                    const reader = new FileReader();
                    reader.onload = async function (e) {
                        const content = e.target.result;
                        const res = await window.Desktop.saveFile({
                            folder: targetSubfolder,
                            filename: targetName,
                            content: content
                        });
                        const savedPath = `user/mode-image/${targetName}`;
                        document.getElementById('mode-edit-pic-src').value = savedPath;
                        if (previewImg) previewImg.src = content || resolveModeImgUrl(savedPath);
                        if (previewWrap) previewWrap.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                    return;
                } catch (err) {
                    console.warn('Dedicated mode image save failed, using reader data url fallback:', err);
                }
            }

            // Web fallback
            const reader = new FileReader();
            reader.onload = function (e) {
                const dataUrl = e.target.result;
                document.getElementById('mode-edit-pic-src').value = dataUrl;
                if (previewImg) previewImg.src = dataUrl;
                if (previewWrap) previewWrap.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        function saveModeFromEditor() {
            if (!activeEditingModeId) return;
            const mode = classModes.find(m => m.id === activeEditingModeId);
            if (!mode) return;

            stopModeEditorTestSound();

            const name = document.getElementById('mode-edit-name').value.trim() || 'Mode';
            const icon = document.getElementById('mode-edit-icon').value.trim() || '🎭';
            const shortcutKey = document.getElementById('mode-edit-shortcut').value.trim();

            const textTitle = document.getElementById('mode-edit-text-title').value.trim() || name;
            const textSubtitle = document.getElementById('mode-edit-text-subtitle').value.trim();
            const textColor = document.getElementById('mode-edit-text-color').value;
            const textSize = document.getElementById('mode-edit-text-size').value;

            const picType = document.getElementById('mode-edit-pic-type').value;
            let picSrc = document.getElementById('mode-edit-pic-src').value;
            if (picType === 'custom_url') {
                picSrc = document.getElementById('mode-edit-pic-url').value.trim();
            } else if (picType === 'emoji') {
                picSrc = icon;
            }
            picSrc = sanitizeModeImgSrc(picSrc);
            const picAnim = document.getElementById('mode-edit-pic-anim').value;
            const picFit = document.getElementById('mode-edit-pic-fit')?.value || 'fit';

            const soundType = document.getElementById('mode-edit-sound-type').value;
            const soundFile = document.getElementById('mode-edit-sound-file')?.value || '';
            const soundVol = parseInt(document.getElementById('mode-edit-sound-vol').value, 10) || 20;
            const soundChime = document.getElementById('mode-edit-sound-chime').checked;

            mode.name = name;
            mode.icon = icon;
            mode.shortcutKey = shortcutKey;
            mode.title = textTitle;
            mode.subtitle = textSubtitle;
            mode.textColor = textColor;
            mode.textSize = textSize;
            mode.pictureType = picType;
            mode.pictureSrc = picSrc;
            mode.pictureAnim = picAnim;
            mode.pictureFit = picFit;
            mode.soundType = soundType;
            mode.soundFile = soundFile;
            mode.soundVol = soundVol;
            mode.soundChime = soundChime;
            mode.text = { title: textTitle, subtitle: textSubtitle, color: textColor, size: textSize };
            mode.picture = { type: picType, src: picSrc, animation: picAnim, fit: picFit };
            mode.sound = { type: soundType, file: soundFile, volume: soundVol, chime: soundChime };

            closeModeEditor();
            renderModeManagerList();
            renderTimerModeShortcuts();
            persistActiveModes().catch(err => console.warn('saveModeFromEditor config save error:', err));

            // CRITICAL FIX: If the edited mode is currently active, apply changes immediately!
            if (activeWorkingModeId === mode.id || (activeWorkingModeId && mode.name.toLowerCase() === activeWorkingModeId.toLowerCase())) {
                playModeSound(mode).catch(e => console.warn('Mode sound update error on save:', e));

                const overlay = document.getElementById('mode-animation-overlay');
                if (overlay && overlay.classList.contains('active') && !isModeMinimised) {
                    const content = document.getElementById('mode-animation-content');
                    if (content) {
                        clearModeAnimationTimers();
                        applyModeOverlayAnimation(overlay, mode);
                        if (mode.id === 'quiet' && mode.picture?.type === 'emoji' && mode.picture?.animation === 'shush') {
                            content.innerHTML = buildQuietMode(mode);
                            spawnShushParticles();
                        } else if (mode.id === 'conversation' && mode.picture?.type === 'speech_bubbles') {
                            content.innerHTML = buildConversationMode(mode);
                            animateSpeechBubbles();
                        } else if (mode.id === 'group' && mode.picture?.type === 'group_icons') {
                            content.innerHTML = buildGroupMode(mode);
                        } else {
                            content.innerHTML = buildCustomModeHTML(mode);
                            if (mode.picture?.animation === 'shush') spawnShushParticles();
                            if (mode.picture?.animation === 'bubbles') animateSpeechBubbles();
                        }
                    }
                } else if (isModeMinimised) {
                    updateModeMinimisedPill();
                }

                if (!PRESENTATION_MODE && presSettings.modes) {
                    _broadcastAnimation('mode-activate', { mode: mode.id, modeData: mode });
                }
            }
        }

        async function playModeSound(mode) {
            if (PRESENTATION_MODE) return;
            if (!mode || !mode.sound || !mode.sound.type || mode.sound.type === 'none') {
                stopWhiteNoise();
                return;
            }

            if (audioContext && audioContext.state === 'suspended') {
                try { await audioContext.resume(); } catch (e) { }
            }

            const soundVol = typeof mode.sound.volume === 'number' ? mode.sound.volume : 20;
            let soundType = String(mode.sound.type || 'none').toLowerCase();
            if (soundType === 'whitenoise') soundType = 'white';
            else if (soundType === 'custom_audio') soundType = 'file';

            if (soundType === 'file') {
                const targetFile = mode.sound.file ? normalizeSoundFilePath(mode.sound.file) : '';
                if (!targetFile) {
                    _activeNoiseFile = null;
                    stopWhiteNoise();
                    return;
                }
                _activeNoiseFile = targetFile;
                ['white', 'pink', 'brown'].forEach(t => {
                    if (_noiseGains[t] && audioContext) {
                        try { _noiseGains[t].gain.setTargetAtTime(0, audioContext.currentTime, 0.05); } catch (e) { }
                    }
                });
                _noiseType = 'file';
                whiteNoiseVolume = Math.max(0, Math.min(1, soundVol / 100));
                whiteNoisePlaying = true;
                whiteNoiseMuted = false;
                _resetNoiseFilePlayers(true);
                const ok = await _playNoiseFileAudio(targetFile);
                if (!ok) {
                    whiteNoisePlaying = false;
                }
            } else if (['white', 'pink', 'brown'].includes(soundType)) {
                _activeNoiseFile = null;
                _stopNoiseFileAudio();
                ['white', 'pink', 'brown'].forEach(t => {
                    if (t !== soundType && _noiseGains[t] && audioContext) {
                        try { _noiseGains[t].gain.setTargetAtTime(0, audioContext.currentTime, 0.05); } catch (e) { }
                    }
                });
                _noiseType = soundType;
                _ensureNoiseNodes(soundType);
                whiteNoiseVolume = Math.max(0, Math.min(1, soundVol / 100));
                whiteNoisePlaying = true;
                whiteNoiseMuted = false;
                if (_noiseGains[soundType] && audioContext) {
                    _noiseGains[soundType].gain.setTargetAtTime(whiteNoiseVolume, audioContext.currentTime, 0.15);
                }
            } else {
                _activeNoiseFile = null;
                stopWhiteNoise();
                return;
            }

            overlayNoiseVolume(soundVol);
            _syncWhiteNoiseUI();
        }

        let _modeAnimationTimers = [];
        function clearModeAnimationTimers() {
            if (Array.isArray(_modeAnimationTimers)) {
                _modeAnimationTimers.forEach(id => clearTimeout(id));
            }
            _modeAnimationTimers = [];
        }

        function queueModeTimer(fn, delay) {
            const id = setTimeout(() => {
                const idx = _modeAnimationTimers.indexOf(id);
                if (idx !== -1) _modeAnimationTimers.splice(idx, 1);
                fn();
            }, delay);
            _modeAnimationTimers.push(id);
            return id;
        }

        function playModeChime() {
            if (PRESENTATION_MODE) return;
            if (audioContext && audioContext.state === 'suspended') {
                try { audioContext.resume(); } catch (_) { }
            }
            const prevScale = _soundVolumeScale;
            _soundVolumeScale = 1.0;
            try {
                playChimeBuiltin();
            } catch (err) {
                console.warn('Mode chime play error:', err);
            } finally {
                _soundVolumeScale = prevScale;
            }
        }

        const DARK_BG_MODE_ANIMS = new Set(['aurora-waves', 'starfield-twinkle']);
        const BG_MODE_ANIMS = new Set([
            'gradient-shift', 'shimmer-dots', 'aurora-waves', 'floating-shapes',
            'breathing-halo', 'ripple-rings', 'starfield-twinkle', 'lava-blobs',
            'confetti-drift', 'horizon-glow'
        ]);

        function resolveModeTextColor(rawColor, animId) {
            const c = String(rawColor || '').trim().toLowerCase();
            const isDarkBg = DARK_BG_MODE_ANIMS.has(String(animId || '').trim().toLowerCase());
            if (isDarkBg) {
                if (!c || c === '#222222' || c === '#222' || c === '#111111' || c === '#111' || c === '#000000' || c === '#000') {
                    return '#f8fafc';
                }
                return rawColor;
            }
            if (!c || c === '#ffffff' || c === '#fff') {
                return '#222222';
            }
            return rawColor;
        }

        function clearModeOverlayAnimation(overlay) {
            if (!overlay) return;
            const existingBg = overlay.querySelector('#mode-animation-bg');
            if (existingBg) existingBg.remove();
            overlay.classList.remove('mode-dark-bg');
            Array.from(overlay.classList).forEach(cls => {
                if (cls.startsWith('bg-anim-')) overlay.classList.remove(cls);
            });
        }

        function applyModeOverlayAnimation(overlay, mode) {
            if (!overlay) return;
            clearModeOverlayAnimation(overlay);
            const anim = String(mode?.picture?.animation || 'none').trim().toLowerCase();
            if (!BG_MODE_ANIMS.has(anim)) return;

            overlay.classList.add('bg-anim-' + anim);
            if (DARK_BG_MODE_ANIMS.has(anim)) {
                overlay.classList.add('mode-dark-bg');
            }

            const bg = document.createElement('div');
            bg.id = 'mode-animation-bg';
            bg.className = 'mode-animation-bg mode-bg-' + anim;
            bg.setAttribute('aria-hidden', 'true');

            const palette = ['#e2c96e', '#6abf8e', '#5b8fcc', '#8b7cc2', '#d97fa8', '#4aabac'];

            if (anim === 'shimmer-dots') {
                const count = 28;
                for (let i = 0; i < count; i++) {
                    const dot = document.createElement('span');
                    dot.className = 'mode-bg-dot';
                    const size = 6 + ((i * 7) % 14);
                    dot.style.width = size + 'px';
                    dot.style.height = size + 'px';
                    dot.style.left = ((i * 37 + 11) % 94 + 3) + '%';
                    dot.style.top = ((i * 53 + 7) % 90 + 5) + '%';
                    dot.style.background = palette[i % palette.length];
                    dot.style.animationDuration = (3.2 + (i % 5) * 0.7) + 's';
                    dot.style.animationDelay = ((i % 7) * -0.6) + 's';
                    bg.appendChild(dot);
                }
            } else if (anim === 'aurora-waves') {
                for (let i = 0; i < 3; i++) {
                    const band = document.createElement('div');
                    band.className = 'mode-aurora-band mode-aurora-band-' + (i + 1);
                    bg.appendChild(band);
                }
            } else if (anim === 'floating-shapes') {
                const shapeTypes = ['circle', 'square', 'diamond'];
                for (let i = 0; i < 16; i++) {
                    const shape = document.createElement('span');
                    const sType = shapeTypes[i % shapeTypes.length];
                    shape.className = 'mode-bg-shape mode-bg-shape-' + sType;
                    const size = 18 + ((i * 11) % 28);
                    shape.style.width = size + 'px';
                    shape.style.height = size + 'px';
                    shape.style.left = ((i * 29 + 5) % 92 + 4) + '%';
                    shape.style.borderColor = palette[i % palette.length];
                    shape.style.animationDuration = (11 + (i % 6) * 2.5) + 's';
                    shape.style.animationDelay = ((i % 8) * -2.1) + 's';
                    bg.appendChild(shape);
                }
            } else if (anim === 'breathing-halo') {
                for (let i = 0; i < 3; i++) {
                    const ring = document.createElement('div');
                    ring.className = 'mode-halo-ring mode-halo-ring-' + (i + 1);
                    bg.appendChild(ring);
                }
            } else if (anim === 'ripple-rings') {
                for (let i = 0; i < 4; i++) {
                    const ring = document.createElement('div');
                    ring.className = 'mode-ripple-ring';
                    ring.style.animationDelay = (i * -1.6) + 's';
                    bg.appendChild(ring);
                }
            } else if (anim === 'starfield-twinkle') {
                for (let i = 0; i < 40; i++) {
                    const star = document.createElement('span');
                    star.className = 'mode-bg-star';
                    const size = 2 + (i % 4);
                    star.style.width = size + 'px';
                    star.style.height = size + 'px';
                    star.style.left = ((i * 41 + 9) % 96 + 2) + '%';
                    star.style.top = ((i * 61 + 13) % 92 + 4) + '%';
                    star.style.animationDuration = (2.4 + (i % 6) * 0.65) + 's';
                    star.style.animationDelay = ((i % 9) * -0.5) + 's';
                    bg.appendChild(star);
                }
            } else if (anim === 'lava-blobs') {
                for (let i = 0; i < 5; i++) {
                    const blob = document.createElement('div');
                    blob.className = 'mode-lava-blob mode-lava-blob-' + (i + 1);
                    blob.style.background = palette[i % palette.length];
                    bg.appendChild(blob);
                }
            } else if (anim === 'confetti-drift') {
                for (let i = 0; i < 24; i++) {
                    const piece = document.createElement('span');
                    piece.className = 'mode-confetti-piece';
                    piece.style.left = ((i * 31 + 4) % 95 + 2) + '%';
                    piece.style.background = palette[i % palette.length];
                    piece.style.animationDuration = (7 + (i % 5) * 1.6) + 's';
                    piece.style.animationDelay = ((i % 7) * -1.3) + 's';
                    bg.appendChild(piece);
                }
            } else if (anim === 'horizon-glow') {
                const sun = document.createElement('div');
                sun.className = 'mode-horizon-sun';
                bg.appendChild(sun);
            }

            overlay.insertBefore(bg, overlay.firstChild);
        }

        function activateMode(modeId, modeOverride = null) {
            closeModePicker();
            clearModeAnimationTimers();
            activeWorkingModeId = modeId;
            isModeMinimised = false;
            const _pill = document.getElementById('mode-minimized-pill');
            if (_pill) _pill.style.display = 'none';

            // Close fullscreen timer overlay (main + presentation) when a mode is activated
            if (isTimerFullscreenActive || document.getElementById('timer-overlay')?.classList.contains('active')) {
                closeTimerFullscreen();
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
            const overlay = document.getElementById('mode-animation-overlay');
            const content = document.getElementById('mode-animation-content');

            const mode = (modeOverride && typeof modeOverride === 'object')
                ? modeOverride
                : classModes.find(m => m.id === modeId || m.name.toLowerCase() === modeId.toLowerCase());

            if (mode) {
                applyModeOverlayAnimation(overlay, mode);
                // Built-in presets custom handlers vs generic builder
                if (mode.id === 'quiet' && mode.picture?.type === 'emoji' && mode.picture?.animation === 'shush') {
                    content.innerHTML = buildQuietMode(mode);
                    spawnShushParticles();
                } else if (mode.id === 'conversation' && mode.picture?.type === 'speech_bubbles') {
                    content.innerHTML = buildConversationMode(mode);
                    animateSpeechBubbles();
                } else if (mode.id === 'group' && mode.picture?.type === 'group_icons') {
                    content.innerHTML = buildGroupMode(mode);
                } else {
                    // Custom Mode Renderer
                    content.innerHTML = buildCustomModeHTML(mode);
                    if (mode.picture?.animation === 'shush') spawnShushParticles();
                    if (mode.picture?.animation === 'bubbles') animateSpeechBubbles();
                }

                // Handle sound options (only on primary display, never in presentation mode)
                if (!PRESENTATION_MODE) {
                    playModeSound(mode).catch(e => console.warn('Mode sound play error:', e));
                    if (mode.sound && mode.sound.chime) {
                        playModeChime();
                    }
                }
            } else {
                clearModeOverlayAnimation(overlay);
                content.innerHTML = buildQuietMode();
                if (!PRESENTATION_MODE) stopWhiteNoise();
            }

            overlay.classList.add('active');

            // Synchronize current timer settings and state to mode overlay
            syncPopupSettingsToOverlay();
            syncOverlayTimerModeState();

            // Show timer control buttons if a countdown is active or paused
            const _timerActive = timerInterval || timerPaused;
            const _moa = document.getElementById('mode-overlay-add30s-btn');
            if (_moa) _moa.style.display = _timerActive ? '' : 'none';
            const _mos = document.getElementById('mode-overlay-sub30s-btn');
            if (_mos) _mos.style.display = _timerActive ? '' : 'none';
            updateOverlayTransportControls();

            // Mark active shortcut button
            document.querySelectorAll('.mode-overlay-shortcut-btn').forEach(btn => btn.classList.remove('active-mode'));
            const modeIndex = classModes.findIndex(m => m.id === modeId || m.id === mode?.id);
            const btns = document.querySelectorAll('.mode-overlay-shortcut-btn');
            if (btns[modeIndex]) btns[modeIndex].classList.add('active-mode');

            const modeTitle = mode ? (mode.text?.title || mode.name || mode.id) : modeId;
            logHistory('mode-start', modeTitle, `Working mode started: ${modeTitle}`, { modeId: mode ? mode.id : modeId });

            if (typeof renderTimerModeShortcuts === 'function') renderTimerModeShortcuts();
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();

            if (!PRESENTATION_MODE && presSettings.modes) _broadcastAnimation('mode-activate', { mode: modeId, modeData: mode || null });
        }

        function minimizeMode() {
            if (PRESENTATION_MODE) return;
            const overlay = document.getElementById('mode-animation-overlay');
            if (!overlay || !overlay.classList.contains('active')) return;

            clearModeAnimationTimers();
            clearModeOverlayAnimation(overlay);
            isModeMinimised = true;
            overlay.classList.remove('active');

            updateModeMinimisedPill();
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function restoreMode() {
            if (PRESENTATION_MODE) return;
            isModeMinimised = false;
            const pill = document.getElementById('mode-minimized-pill');
            if (pill) pill.style.display = 'none';

            const overlay = document.getElementById('mode-animation-overlay');
            if (overlay && activeWorkingModeId) {
                overlay.classList.add('active');
                const modeTimer = document.getElementById('mode-overlay-timer');
                if (modeTimer) {
                    const display = document.getElementById('timer-active-display');
                    if (display && display.textContent && display.textContent !== '--:--') {
                        modeTimer.textContent = display.textContent;
                    }
                }
                const currentMode = classModes.find(m => m.id === activeWorkingModeId || m.name.toLowerCase() === activeWorkingModeId.toLowerCase());
                if (currentMode) {
                    applyModeOverlayAnimation(overlay, currentMode);
                    if (currentMode.picture?.animation === 'shush') spawnShushParticles();
                    if (currentMode.picture?.animation === 'bubbles' || (currentMode.id === 'conversation' && currentMode.picture?.type === 'speech_bubbles')) animateSpeechBubbles();
                }
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function updateModeMinimisedPill() {
            if (PRESENTATION_MODE) return;
            const pill = document.getElementById('mode-minimized-pill');
            if (!pill) return;

            const mode = classModes.find(m => m.id === activeWorkingModeId || m.name.toLowerCase() === (activeWorkingModeId || '').toLowerCase());
            const iconEl = document.getElementById('mode-pill-icon');
            const titleEl = document.getElementById('mode-pill-title');
            const timerEl = document.getElementById('mode-pill-timer');

            if (mode) {
                const svgSrc = getModeSvgIcon(mode);
                const name = mode.name || (mode.text?.title) || 'Mode';
                if (iconEl) iconEl.innerHTML = `<img src="${svgSrc}" class="btn-icon" alt="" />`;
                if (titleEl) titleEl.textContent = name;
            } else {
                if (iconEl) iconEl.innerHTML = '<img src="../assets/icons/theater.svg" class="btn-icon" alt="" />';
                if (titleEl) titleEl.textContent = 'Class Mode';
            }

            if (timerEl) {
                const isTimerRunning = (timerInterval && timerEndTime) || (stopwatchInterval && stopwatchStart);
                const display = document.getElementById('timer-active-display');
                if (isTimerRunning && display && display.textContent && display.textContent !== '--:--') {
                    timerEl.textContent = display.textContent;
                    timerEl.style.display = 'none';
                    if (timerEndTime && (timerEndTime - Date.now()) < 60000) {
                        timerEl.classList.add('warning');
                    } else {
                        timerEl.classList.remove('warning');
                    }
                } else {
                    timerEl.style.display = 'none';
                    timerEl.textContent = '';
                }
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function buildCustomModeHTML(mode) {
            const title = mode.text?.title || mode.name || '';
            const subtitle = mode.text?.subtitle || '';
            const animId = mode.picture?.animation || 'none';
            const color = resolveModeTextColor(mode.text?.color, animId);
            const sizeClass = mode.text?.size === 'xlarge' ? 'size-xl' : (mode.text?.size === 'medium' ? 'size-m' : 'size-l');
            const animClass = (animId && !BG_MODE_ANIMS.has(animId) && animId !== 'none') ? 'anim-' + animId : '';

            let picHtml = '';
            if (mode.picture?.type === 'custom_file' || mode.picture?.type === 'custom_url') {
                const imgSrc = resolveModeImgUrl(mode.picture?.src || '');
                const icon = mode.icon || '🎭';
                const fit = mode.picture?.fit || 'fit';
                let fitStyle = 'object-fit:contain; max-height:45vh; max-width:85vw;';
                if (fit === 'stretch') {
                    fitStyle = 'object-fit:fill; width:85vw; height:45vh;';
                } else if (fit === 'clip') {
                    fitStyle = 'object-fit:cover; width:85vw; height:45vh;';
                }
                picHtml = `
                    <img src="${imgSrc}" class="custom-mode-img ${animClass}" style="${fitStyle} border-radius:12px; margin-bottom:16px;" onerror="this.onerror=null; console.warn('Custom mode image not found on disk:', this.src); this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='block';">
                    <div class="custom-mode-fallback-icon custom-mode-icon ${animClass}" style="display:none; font-size:5rem; margin-bottom:12px;">${icon}</div>
                `;
            } else if (mode.picture?.type === 'speech_bubbles') {
                picHtml = `<div class="speech-bubbles-container"><div class="speech-bubble left">Great idea!</div><div class="speech-bubble right">I agree!</div></div>`;
            } else if (mode.picture?.type === 'group_icons') {
                picHtml = `<div class="group-icons-row"><div class="group-person"><div class="group-person-icon">🧑🏿</div></div><div class="group-person"><div class="group-person-icon">👩🏼</div></div><div class="group-person"><div class="group-person-icon">🧒🏽</div></div></div>`;
            } else {
                const icon = mode.icon || mode.picture?.src || '🎭';
                picHtml = `<div class="custom-mode-icon ${animClass}" style="font-size:5rem; margin-bottom:12px;">${icon}</div>`;
            }

            return `
                <div class="custom-mode-anim ${sizeClass}" style="color:${color}; text-align:center;">
                    ${picHtml}
                    <div class="custom-mode-title" style="font-size:3rem; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">${title}</div>
                    ${subtitle ? `<div class="custom-mode-subtitle" style="font-size:1.3rem; opacity:0.9; margin-bottom:16px;">${subtitle}</div>` : ''}
                    ${getModeTimerHTML()}
                </div>
            `;
        }

        function closeMode() {
            clearModeAnimationTimers();
            if (activeWorkingModeId) {
                const prevMode = classModes.find(m => m.id === activeWorkingModeId || m.name.toLowerCase() === (activeWorkingModeId || '').toLowerCase());
                const prevTitle = prevMode ? (prevMode.text?.title || prevMode.name || prevMode.id) : activeWorkingModeId;
                logHistory('mode-end', prevTitle, `Working mode ended: ${prevTitle}`, { modeId: activeWorkingModeId });
            }
            isModeMinimised = false;
            activeWorkingModeId = null;
            stopWhiteNoise();
            _activeNoiseFile = null;
            const pill = document.getElementById('mode-minimized-pill');
            if (pill) pill.style.display = 'none';
            const overlayEl = document.getElementById('mode-animation-overlay');
            clearModeOverlayAnimation(overlayEl);
            if (overlayEl) overlayEl.classList.remove('active');
            document.getElementById('mode-animation-content').innerHTML = '';
            if (typeof renderTimerModeShortcuts === 'function') renderTimerModeShortcuts();
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
            if (!PRESENTATION_MODE && presSettings.modes) {
                _broadcastAnimation('mode-close');
                _broadcastAnimation('datetime-close');
            }
        }

        function getModeTimerHTML() {
            let timeStr, isWarning, bg, showProgress = false, progressPct = 100, progressClass = '';
            if (PRESENTATION_MODE) {
                const area = document.getElementById('timer-active-area');
                const display = document.getElementById('timer-active-display');
                const overlayEl = document.getElementById('timer-overlay');
                if (!area || area.style.display === 'none') return '';
                timeStr = display ? display.textContent : '--:--';
                isWarning = display && (display.classList.contains('warning') || display.classList.contains('timer-warning'));
                bg = overlayEl ? overlayEl.style.background : '';
                const ovBar = document.getElementById('timer-overlay-progress-bar');
                if (ovBar && timerMode !== 'stopwatch') {
                    showProgress = true;
                    progressPct = parseFloat(ovBar.style.width) || 100;
                    progressClass = ovBar.className || '';
                }
            } else {
                const isTimerRunning = timerInterval && timerEndTime;
                const isStopwatchRunning = stopwatchInterval && stopwatchStart;
                if (!isTimerRunning && !isStopwatchRunning) return ''; // timer not running
                const display = document.getElementById('timer-active-display');
                timeStr = display ? display.textContent : '--:--';
                isWarning = timerEndTime && (timerEndTime - Date.now()) < 60000;
                const overlayEl = document.getElementById('timer-overlay');
                bg = overlayEl ? overlayEl.style.background : '';
                if (isTimerRunning && timerMode !== 'stopwatch' && timerTotalMs > 0) {
                    showProgress = true;
                    const remaining = Math.max(0, timerEndTime - Date.now());
                    const pct = Math.max(0, Math.min(1, remaining / timerTotalMs));
                    progressPct = Math.round(pct * 1000) / 10;
                    if (remaining < 60000 || pct < 0.2) {
                        progressClass = 'finished';
                    } else if (pct < 0.5) {
                        progressClass = 'warning';
                    }
                }
            }
            const bgStyle = bg ? ` style="background:${bg};"` : '';
            const progressHtml = showProgress ? `
                <div id="mode-overlay-progress" class="mode-overlay-progress">
                    <div id="mode-overlay-progress-bar" class="mode-overlay-progress-bar ${progressClass}" style="width: ${progressPct}%;"></div>
                </div>` : '';
            const meta = (typeof _getIntervalDisplayMeta === 'function') ? _getIntervalDisplayMeta() : null;
            const intervalBadgeStyle = (meta && meta.stepText) ? '' : ' style="display:none;"';
            const intervalHtml = `<div id="mode-overlay-interval-info" class="mode-overlay-interval-badge"${intervalBadgeStyle}><span id="mode-overlay-interval-step">${meta ? meta.stepText : ''}</span><span id="mode-overlay-interval-next" class="mode-overlay-interval-badge-next"${meta && meta.nextText ? '' : ' style="display:none;"'}>${meta ? meta.nextText : ''}</span></div>`;
            return `<div class="mode-overlay-timer${isWarning ? ' warning' : ''}" id="mode-overlay-timer"${bgStyle} onclick="openTimerFullscreen()" title="Click to open fullscreen timer">${timeStr}</div>${progressHtml}${intervalHtml}`;
        }

        function buildQuietMode(mode) {
            const title = mode?.text?.title || mode?.name || 'Quiet Work';
            const subtitle = mode?.text?.subtitle || '';
            const color = resolveModeTextColor(mode?.text?.color, mode?.picture?.animation);
            const sizeClass = mode?.text?.size === 'xlarge' ? 'size-xl' : (mode?.text?.size === 'medium' ? 'size-m' : 'size-l');
            return `
        <div class="shush-particles" id="shush-particles"></div>
        <div class="quiet-mode-anim ${sizeClass}" style="color:${color}; text-align:center;">
            <div class="quiet-icon">🤫</div>
            <div class="quiet-label" style="font-size:3rem; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">${title}</div>
            ${subtitle ? `<div class="quiet-subtitle" style="font-size:1.3rem; opacity:0.9; margin-bottom:16px;">${subtitle}</div>` : ''}
            ${getModeTimerHTML()}
        </div>
    `;
        }

        function spawnShushParticles() {
            const container = document.getElementById('shush-particles');
            if (!container) return;
            container.innerHTML = '';
            const symbols = ['🤫', '🔇', '🔕', '💭', '✍️'];
            let count = 0;
            const MAX_PARTICLES = 10;
            function spawn() {
                const c = document.getElementById('shush-particles');
                const overlay = document.getElementById('mode-animation-overlay');
                if (!c || !overlay || !overlay.classList.contains('active')) return;
                
                // Limit maximum active particles in DOM
                if (c.children.length >= MAX_PARTICLES) {
                    if (c.firstChild) c.removeChild(c.firstChild);
                }

                const p = document.createElement('div');
                p.className = 'shush-particle';
                p.textContent = symbols[count % symbols.length];
                p.style.left = (5 + Math.random() * 90) + '%';
                p.style.bottom = '-5%';
                const duration = 6 + Math.random() * 6;
                p.style.animationDuration = duration + 's';
                p.style.animationDelay = '0s';
                c.appendChild(p);
                count++;
                
                queueModeTimer(() => {
                    if (p.parentNode) p.parentNode.removeChild(p);
                }, (duration + 0.1) * 1000);

                if (overlay.classList.contains('active')) {
                    queueModeTimer(spawn, 5000 + Math.random() * 2000);
                }
            }
            for (let i = 0; i < 4; i++) {
                queueModeTimer(spawn, i * 3000);
            }
        }

        function buildConversationMode(mode) {
            const title = mode?.text?.title || mode?.name || 'Conversation';
            const subtitle = mode?.text?.subtitle || '';
            const color = resolveModeTextColor(mode?.text?.color, mode?.picture?.animation);
            const sizeClass = mode?.text?.size === 'xlarge' ? 'size-xl' : (mode?.text?.size === 'medium' ? 'size-m' : 'size-l');
            return `
        <div class="conversation-mode-anim ${sizeClass}" style="color:${color}; text-align:center;">
            <div class="speech-bubbles-container">
                <div class="speech-bubble left" style="animation-delay:0s;">Great idea!</div>
                <div class="speech-bubble right" style="animation-delay:0.5s;">I agree, because…</div>
                <div class="speech-bubble center" style="animation-delay:1s;">What do you think?</div>
            </div>
            <div class="conversation-label" style="font-size:3rem; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">${title}</div>
            ${subtitle ? `<div class="conversation-subtitle" style="font-size:1.3rem; opacity:0.9; margin-bottom:16px;">${subtitle}</div>` : ''}
            ${getModeTimerHTML()}
        </div>
    `;
        }

        function animateSpeechBubbles() {
            const phrases = [
                ['Great idea!', "I agree, because…", "What do you think?"],
                ['In my opinion…', "That's interesting!", "Can you explain?"],
                ["I'd add that…", "Good point!", "Let's discuss!"],
                ["I don't agree with you…", "Mmh, are you sure?", "You might well be right, but..."],
                ["I would argue that...", "It is clearly an example of...", "Your point is sensible, yet..."],
                ["Could you walk me through your reasoning?", "What led you to that conclusion?", "How does that apply to this context?"],
                ["Building on what you said...", "How does that connect to our previous point?", "That reminds me of a similar situation where..."],
                ["If we changed one variable, would your view hold?", "What would be the best-case scenario?", "Suppose the opposite were true; what then?"],
                ["Just so I’m following—are you saying that...?", "I want to make sure I grasp your point; is it...?", "Could you give me a concrete example?"],
                ["It sounds like we agree on X, but differ on Y. Right?", "How can we reconcile these two viewpoints?", "If we had to find a middle ground, what would be it?"]
            ];
            let set = 0;
            function cycle() {
                const overlay = document.getElementById('mode-animation-overlay');
                if (!overlay || !overlay.classList.contains('active')) return;
                const bubbles = document.querySelectorAll('.speech-bubble');
                if (!bubbles.length) return;
                const current = phrases[set % phrases.length];
                bubbles.forEach((b, i) => { if (current[i]) b.textContent = current[i]; });
                set++;
                if (overlay.classList.contains('active')) {
                    queueModeTimer(cycle, 5000);
                }
            }
            queueModeTimer(cycle, 5000);
        }

        function buildGroupMode(mode) {
            const title = mode?.text?.title || mode?.name || 'Group Work';
            const subtitle = mode?.text?.subtitle !== undefined ? mode.text.subtitle : 'Work together with your team';
            const color = resolveModeTextColor(mode?.text?.color, mode?.picture?.animation);
            const sizeClass = mode?.text?.size === 'xlarge' ? 'size-xl' : (mode?.text?.size === 'medium' ? 'size-m' : 'size-l');
            return `
        <div class="group-mode-anim ${sizeClass}" style="color:${color}; text-align:center;">
            <div class="group-icons-row">
                <div class="group-person"><div class="group-person-icon">🧑🏿</div></div>
                <div class="group-person"><div class="group-person-icon">👩🏼</div></div>
                <div class="group-person"><div class="group-person-icon">🧒🏽</div></div>
                <div class="group-arrows">
                    <div class="group-arrow">↔</div>
                </div>
                <div class="group-person"><div class="group-person-icon">👦🏻</div></div>
                <div class="group-person"><div class="group-person-icon">👩🏾</div></div>
                <div class="group-person"><div class="group-person-icon">🧑🏼</div></div>
            </div>
            <div class="group-mode-label" style="font-size:3rem; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">${title}</div>
            ${subtitle ? `<div class="group-subtext" style="font-size:1.3rem; opacity:0.9; margin-bottom:16px;">${subtitle}</div>` : ''}
            ${getModeTimerHTML()}
        </div>
    `;
        }

        // ============================================================
        // KEYBOARD SHORTCUTS MANAGER & DISPATCHER
        // ============================================================

        const CMS_SHORTCUTS_STORAGE_KEY = 'CMS_CUSTOM_SHORTCUTS_V1';
        let _activeRecordingActionId = null;
        let _recordingKeydownHandler = null;

        const CMS_SHORTCUT_DEFINITIONS = [
            // --- Roster Toggles & Name Size ---
            { id: 'toggle_sen', nameKey: 'rsp_toggle_sen_title', defaultName: 'Toggle SEN indicator (*)', category: 'roster', defaultKeys: null, fn: () => toggleSenVisibility() },
            { id: 'toggle_roles', nameKey: 'rsp_toggle_roles_title', defaultName: 'Toggle roles visibility', category: 'roster', defaultKeys: null, fn: () => toggleRolesVisibility() },
            { id: 'toggle_badges', nameKey: 'rsp_toggle_badges_title', defaultName: 'Toggle badges visibility', category: 'roster', defaultKeys: { ctrl: true, key: 'b' }, fn: () => toggleBadgesVisibility() },
            { id: 'toggle_autoflag', nameKey: 'rsp_toggle_autoflag_title', defaultName: 'Toggle autoflag visibility', category: 'roster', defaultKeys: { ctrl: true, key: 'f' }, fn: () => toggleAutoFlagVisibility() },
            { id: 'toggle_anim', nameKey: 'rsp_toggle_anim_title', defaultName: 'Toggle visual animations', category: 'roster', defaultKeys: null, fn: () => toggleAnimations() },
            { id: 'toggle_plan', nameKey: 'rsp_toggle_plan_title', defaultName: 'Toggle seating plan view', category: 'roster', defaultKeys: { ctrl: true, key: 'p' }, fn: () => toggleRosterPlanView() },
            { id: 'toggle_sounds', nameKey: 'rsp_mute_score_title', defaultName: 'Mute / unmute score sounds', category: 'roster', defaultKeys: null, fn: () => toggleScoreMute() },
            { id: 'increase_name_size', nameKey: 'rsp_increase_title', defaultName: 'Increase name size (A+)', category: 'roster', defaultKeys: null, fn: () => changeNameSize(1) },
            { id: 'decrease_name_size', nameKey: 'rsp_decrease_title', defaultName: 'Decrease name size (A−)', category: 'roster', defaultKeys: null, fn: () => changeNameSize(-1) },
            { id: 'reset_name_size', nameKey: 'rsp_reset_title', defaultName: 'Reset name size (A)', category: 'roster', defaultKeys: null, fn: () => resetNameSize() },
            { id: 'toggle_roster_settings', nameKey: 'rsp_roster_settings_title', defaultName: 'Toggle roster settings menu', category: 'roster', defaultKeys: null, fn: () => toggleRosterSettingsPopup() },

            // --- Presentation & Mirroring ---
            { id: 'open_presentation', nameKey: 'rsp_present_title', defaultName: 'Open presentation window', category: 'presentation', defaultKeys: null, fn: () => openCmsPresentation() },
            { id: 'freeze_presentation', nameKey: 'rsp_freeze_title', defaultName: 'Freeze presentation window', category: 'presentation', defaultKeys: null, fn: () => toggleFreezePresentation() },
            { id: 'pin_presentation', nameKey: 'pres_pin_title', defaultName: 'Keep presentation window always on top', category: 'presentation', defaultKeys: null, fn: () => toggleAlwaysOnTopPresentation() },
            { id: 'close_presentation', nameKey: 'rsp_close_pres_title', defaultName: 'Close presentation window', category: 'presentation', defaultKeys: null, fn: () => cmsPresentationClose() },
            { id: 'fullscreen_presentation', nameKey: 'rsp_full_pres_title', defaultName: 'Toggle fullscreen on presentation', category: 'presentation', defaultKeys: null, fn: () => cmsPresentationFullscreen() },
            { id: 'maximize_presentation', nameKey: 'rsp_max_pres_title', defaultName: 'Maximise presentation window', category: 'presentation', defaultKeys: null, fn: () => cmsPresentationMaximize() },
            { id: 'minimize_presentation', nameKey: 'rsp_min_pres_title', defaultName: 'Minimise presentation window', category: 'presentation', defaultKeys: null, fn: () => cmsPresentationMinimize() },
            { id: 'dock_right_presentation', nameKey: 'rsp_right_pres_title', defaultName: 'Move presentation window right', category: 'presentation', defaultKeys: null, fn: () => cmsPresentationDockRight() },
            { id: 'increase_pres_font', nameKey: 'rsp_pres_increase_title', defaultName: 'Increase presentation font size (A+)', category: 'presentation', defaultKeys: null, fn: () => changePresentationNameSize(1) },
            { id: 'decrease_pres_font', nameKey: 'rsp_pres_decrease_title', defaultName: 'Decrease presentation font size (A−)', category: 'presentation', defaultKeys: null, fn: () => changePresentationNameSize(-1) },
            { id: 'reset_pres_font', nameKey: 'rsp_pres_reset_title', defaultName: 'Reset presentation font size (A)', category: 'presentation', defaultKeys: null, fn: () => resetPresentationNameSize() },
            { id: 'mirror_sen', nameKey: 'rsp_pres_sen_title', defaultName: 'Mirror SEN in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('sen') },
            { id: 'mirror_roles', nameKey: 'rsp_pres_roles_title', defaultName: 'Mirror roles in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('roles') },
            { id: 'mirror_badges', nameKey: 'rsp_pres_badges_title', defaultName: 'Mirror badges in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('badges') },
            { id: 'mirror_autoflag', nameKey: 'rsp_pres_autoflag_title', defaultName: 'Mirror autoflag in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('autoflag') },
            { id: 'mirror_anim', nameKey: 'rsp_pres_anim_title', defaultName: 'Mirror animations in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('anim') },
            { id: 'mirror_plan', nameKey: 'rsp_pres_plan_title', defaultName: 'Mirror plan view in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('plan') },
            { id: 'mirror_lesson_plan', nameKey: 'rsp_pres_lesson_plan_title', defaultName: 'Mirror lesson plan in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('lessonPlan') },
            { id: 'mirror_modes', nameKey: 'rsp_pres_modes_title', defaultName: 'Mirror modes in presentation', category: 'presentation', defaultKeys: null, fn: () => togglePresSetting('modes') },

            // --- Grouping & Roles ---
            { id: 'teams_create', nameKey: 'skmCmsTeams', defaultName: 'Create / reshuffle teams', category: 'grouping', defaultKeys: { ctrl: true, key: 't' }, fn: () => { const modal = document.getElementById('team-modal'); if (modal && modal.style.display === 'flex') closeTeamModal(); else createTeams(); } },
            { id: 'teams_clear', nameKey: 'btn_clear_teams', defaultName: 'Clear teams', category: 'grouping', defaultKeys: null, fn: () => clearTeams() },
            { id: 'roles_modal', nameKey: 'skmCmsRoles', defaultName: 'Assign roles modal', category: 'grouping', defaultKeys: { ctrl: true, key: 'r' }, fn: () => openRolesModal() },
            { id: 'roles_reassign', nameKey: 'rsp_reassign_roles', defaultName: 'Reassign roles', category: 'grouping', defaultKeys: null, fn: () => reassignRolesFromUtility() },
            { id: 'roles_clear', nameKey: 'rsp_clear_roles', defaultName: 'Clear roles', category: 'grouping', defaultKeys: null, fn: () => clearAssignedRolesFromUtility() },
            { id: 'roles_info', nameKey: 'btn_role_info', defaultName: 'Assigned role info', category: 'grouping', defaultKeys: null, fn: () => openAssignedRolesInfo() },

            // --- Tools & Classroom Actions ---
            { id: 'pick_student', nameKey: 'skmCmsRandomStudent', defaultName: 'Pick random student', category: 'actions', defaultKeys: { ctrl: true, key: ' ' }, fn: () => { const btn = document.getElementById('pick-btn'); if (btn && !btn.disabled) pickStudent(); } },
            { id: 'pick_team', nameKey: 'tut_pick_title', defaultName: 'Pick random team', category: 'actions', defaultKeys: null, fn: () => { const btn = document.getElementById('team-pick-btn'); if (btn && !btn.disabled) pickTeam(); } },
            { id: 'mode_picker', nameKey: 'skmCmsModes', defaultName: 'Open working mode picker', category: 'actions', defaultKeys: { ctrl: true, key: 'm' }, fn: () => {
                const modeOverlay = document.getElementById('mode-animation-overlay');
                const modePicker = document.getElementById('mode-picker-modal');
                if (modeOverlay && modeOverlay.classList.contains('active')) minimizeMode();
                else if (typeof isModeMinimised !== 'undefined' && isModeMinimised) restoreMode();
                else if (modePicker && modePicker.style.display === 'flex') closeModePicker();
                else openModePicker();
            } },
            { id: 'noise_toggle', nameKey: 'skmCmsNoiseToggle', defaultName: 'Toggle ambient noise', category: 'actions', defaultKeys: { ctrl: false, key: 'w' }, fn: () => overlaySetNoise(_noiseType) },
            { id: 'noise_mute', nameKey: 'skmCmsNoiseMute', defaultName: 'Mute / unmute ambient noise', category: 'actions', defaultKeys: { ctrl: false, key: 'm' }, fn: () => toggleWhiteNoiseMute() },
            { id: 'noise_vol_down', nameKey: 'skmCmsNoiseVolume', defaultName: 'Decrease ambient noise volume', category: 'actions', defaultKeys: { ctrl: false, key: '[' }, fn: () => stepWhiteNoiseVolume(-5) },
            { id: 'noise_vol_up', nameKey: 'skmCmsNoiseVolume', defaultName: 'Increase ambient noise volume', category: 'actions', defaultKeys: { ctrl: false, key: ']' }, fn: () => stepWhiteNoiseVolume(+5) },
            { id: 'copy_roster', nameKey: 'rsp_copy_roster_btn', defaultName: 'Copy roster plain text', category: 'actions', defaultKeys: null, fn: () => copyRosterPlainText() },
            { id: 'results_ranking', nameKey: 'rsp_results_ranking', defaultName: 'Results & Ranking', category: 'actions', defaultKeys: null, fn: () => openResultsRankingModal() },
            { id: 'reset_points', nameKey: 'btn_reset_points', defaultName: 'Reset points', category: 'actions', defaultKeys: null, fn: () => manualResetFull() },
            { id: 'reset_strikes', nameKey: 'btn_reset_strikes', defaultName: 'Reset strikes', category: 'actions', defaultKeys: null, fn: () => resetStrikesOnly() },
            { id: 'timer_toggle', nameKey: 'timer_pp_title', defaultName: 'Start / Pause timer', category: 'actions', defaultKeys: null, fn: () => {
                const pauseBtn = document.getElementById('popup-pause-btn');
                if (pauseBtn && pauseBtn.style.display !== 'none') timerTogglePause();
                else popupStartTimer();
            } },
            { id: 'timer_stop', nameKey: 'timer_stop', defaultName: 'Stop timer', category: 'actions', defaultKeys: null, fn: () => popupStopTimer() }
        ];

        function getCmsCustomShortcutsMap() {
            const cfg = getLoadedConfig();
            if (cfg && cfg.shortcuts && typeof cfg.shortcuts === 'object' && !Array.isArray(cfg.shortcuts)) {
                return { ...cfg.shortcuts };
            }
            if (cfg && cfg.customShortcuts && typeof cfg.customShortcuts === 'object' && !Array.isArray(cfg.customShortcuts)) {
                return { ...cfg.customShortcuts };
            }
            try {
                const raw = localStorage.getItem(CMS_SHORTCUTS_STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        }

        function saveCmsCustomShortcutsMap(map) {
            try {
                localStorage.setItem(CMS_SHORTCUTS_STORAGE_KEY, JSON.stringify(map));
            } catch (e) {
                console.warn('Could not save custom shortcuts to localStorage', e);
            }
            if (loadedConfigCache && typeof loadedConfigCache === 'object') {
                loadedConfigCache.shortcuts = { ...map };
            }
            if (typeof window !== 'undefined' && window.CLASS_MANAGEMENT_CONFIG && typeof window.CLASS_MANAGEMENT_CONFIG === 'object') {
                window.CLASS_MANAGEMENT_CONFIG.shortcuts = { ...map };
            }
            persistSettingsToUserFile().catch(e => {
                console.warn('Could not save custom shortcuts to config.js', e);
            });
        }

        function getActiveShortcutForDef(def, customMap = null) {
            const map = customMap || getCmsCustomShortcutsMap();
            if (map[def.id] !== undefined) return map[def.id];
            return def.defaultKeys;
        }

        function formatShortcutKeysList(sc) {
            if (!sc || !sc.key) return [];
            const list = [];
            if (sc.ctrl) list.push('Ctrl');
            if (sc.alt) list.push('Alt');
            if (sc.shift) list.push('Shift');
            
            let k = String(sc.key);
            if (k === ' ') k = 'Space';
            else if (k.toLowerCase() === 'arrowleft') k = '←';
            else if (k.toLowerCase() === 'arrowright') k = '→';
            else if (k.toLowerCase() === 'arrowup') k = '↑';
            else if (k.toLowerCase() === 'arrowdown') k = '↓';
            else if (k.length === 1) k = k.toUpperCase();
            list.push(k);
            return list;
        }

        function formatShortcutKeyHtml(sc) {
            const keys = formatShortcutKeysList(sc);
            if (!keys.length) {
                return `<span style="color:#94a3b8; font-style:italic;">${t('shortcuts_unassigned') || 'Unassigned'}</span>`;
            }
            return keys.map(k => `<kbd>${k}</kbd>`).join(' + ');
        }

        function shortcutKeysMatch(scA, scB) {
            if (!scA || !scB || !scA.key || !scB.key) return false;
            return !!scA.ctrl === !!scB.ctrl &&
                   !!scA.alt === !!scB.alt &&
                   !!scA.shift === !!scB.shift &&
                   String(scA.key).toLowerCase() === String(scB.key).toLowerCase();
        }

        function findShortcutConflict(defId, sc, customMap) {
            if (!sc || !sc.key) return null;
            for (const other of CMS_SHORTCUT_DEFINITIONS) {
                if (other.id === defId) continue;
                const otherSc = getActiveShortcutForDef(other, customMap);
                if (shortcutKeysMatch(sc, otherSc)) {
                    const name = t(other.nameKey) || other.defaultName;
                    return name;
                }
            }
            return null;
        }

        function openEditShortcutsModal() {
            openSettingsModal('shortcuts');
        }

        function closeEditShortcutsModal() {
            closeSettingsModal();
        }

        function filterShortcutsTable() {
            renderEditShortcutsTable();
        }

        function resetCmsShortcutsToDefault() {
            _cancelRecording();
            localStorage.removeItem(CMS_SHORTCUTS_STORAGE_KEY);
            if (loadedConfigCache && typeof loadedConfigCache === 'object') {
                loadedConfigCache.shortcuts = {};
                delete loadedConfigCache.customShortcuts;
            }
            if (typeof window !== 'undefined' && window.CLASS_MANAGEMENT_CONFIG && typeof window.CLASS_MANAGEMENT_CONFIG === 'object') {
                window.CLASS_MANAGEMENT_CONFIG.shortcuts = {};
                delete window.CLASS_MANAGEMENT_CONFIG.customShortcuts;
            }
            persistSettingsToUserFile({ shortcuts: {} }).catch(err => console.warn('resetCmsShortcutsToDefault: could not save config:', err));
            renderEditShortcutsTable();
            showToast(t('shortcuts_reset_toast') || 'Keyboard shortcuts reset to default');
        }

        function renderEditShortcutsTable() {
            const container = document.getElementById('shortcuts-table-container');
            if (!container) return;

            const searchInput = document.getElementById('shortcuts-search-input');
            const catFilter = document.getElementById('shortcuts-category-filter');
            const search = (searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '');
            const cat = (catFilter ? catFilter.value : 'all');

            const customMap = getCmsCustomShortcutsMap();
            let hasAnyConflict = false;
            let rowsHtml = '';

            const categoryLabels = {
                roster: t('shortcuts_cat_roster') || 'Roster Toggles',
                presentation: t('shortcuts_cat_presentation') || 'Presentation',
                grouping: t('shortcuts_cat_grouping') || 'Grouping & Roles',
                actions: t('shortcuts_cat_actions') || 'Classroom Actions'
            };

            const filtered = CMS_SHORTCUT_DEFINITIONS.filter(def => {
                if (cat !== 'all' && def.category !== cat) return false;
                if (!search) return true;
                const name = (t(def.nameKey) || def.defaultName).toLowerCase();
                const sc = getActiveShortcutForDef(def, customMap);
                const scText = formatShortcutKeysList(sc).join(' ').toLowerCase();
                return name.includes(search) || scText.includes(search) || def.category.includes(search);
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div style="padding:30px; text-align:center; color:#94a3b8; font-style:italic;">No matching shortcuts found.</div>`;
                return;
            }

            rowsHtml += `
                <table class="skm-editor-table">
                    <thead>
                        <tr>
                            <th style="width:40%;">Action</th>
                            <th style="width:20%;">Category</th>
                            <th style="width:30%;">Shortcut</th>
                            <th style="width:10%; text-align:right;">Reset</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            filtered.forEach(def => {
                const sc = getActiveShortcutForDef(def, customMap);
                const isRecording = (_activeRecordingActionId === def.id);
                const conflictWith = findShortcutConflict(def.id, sc, customMap);
                if (conflictWith) hasAnyConflict = true;

                const name = t(def.nameKey) || def.defaultName;
                const catLabel = categoryLabels[def.category] || def.category;
                const hasCustom = customMap[def.id] !== undefined;

                const conflictHtml = conflictWith
                    ? `<span class="skm-conflict-tag" title="${t('shortcuts_conflict') || 'Conflict with'}: ${conflictWith}">${conflictWith}</span>`
                    : '';

                const keyButtonHtml = isRecording
                    ? `<button class="skm-btn-key recording">${t('shortcuts_recording_prompt') || 'Press key combo… (Esc to cancel)'}</button>`
                    : `<button class="skm-btn-key" onclick="startRecordingShortcut('${def.id}', event)" title="${t('shortcuts_rebind_btn') || 'Click to rebind'}">${formatShortcutKeyHtml(sc)}</button>${conflictHtml}`;

                const clearBtnHtml = (sc && sc.key)
                    ? `<button class="skm-btn-icon-action" onclick="clearShortcutSingle('${def.id}', event)" title="${t('shortcuts_clear_btn') || 'Clear shortcut'}"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>`
                    : '';

                const resetBtnHtml = hasCustom
                    ? `<button class="skm-btn-icon-action" onclick="resetShortcutSingle('${def.id}', event)" title="${t('shortcuts_reset_btn') || 'Reset to default'}">↺</button>`
                    : '';

                rowsHtml += `
                    <tr>
                        <td><strong>${name}</strong></td>
                        <td><span class="skm-cat-tag skm-cat-${def.category}">${catLabel}</span></td>
                        <td>
                            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                ${keyButtonHtml}
                                ${clearBtnHtml}
                            </div>
                        </td>
                        <td style="text-align:right;">${resetBtnHtml}</td>
                    </tr>
                `;
            });

            rowsHtml += `</tbody></table>`;
            container.innerHTML = rowsHtml;

            // Conflict banner update
            const conflictBanner = document.getElementById('shortcuts-conflict-banner');
            if (conflictBanner) {
                conflictBanner.style.display = hasAnyConflict ? 'flex' : 'none';
            }
        }

        function _cancelRecording() {
            _activeRecordingActionId = null;
            if (_recordingKeydownHandler) {
                window.removeEventListener('keydown', _recordingKeydownHandler, true);
                _recordingKeydownHandler = null;
            }
        }

        function startRecordingShortcut(actionId, event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            _cancelRecording();

            _activeRecordingActionId = actionId;
            renderEditShortcutsTable();

            _recordingKeydownHandler = function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === 'Escape') {
                    _cancelRecording();
                    renderEditShortcutsTable();
                    return;
                }

                if (e.key === 'Backspace' || e.key === 'Delete') {
                    _cancelRecording();
                    clearShortcutSingle(actionId);
                    return;
                }

                // Ignore lone modifier presses
                if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
                    return;
                }

                const newShortcut = {
                    ctrl: !!(e.ctrlKey || e.metaKey),
                    alt: !!e.altKey,
                    shift: !!e.shiftKey,
                    key: e.key.toLowerCase()
                };

                const customMap = getCmsCustomShortcutsMap();
                customMap[actionId] = newShortcut;
                saveCmsCustomShortcutsMap(customMap);

                _cancelRecording();
                renderEditShortcutsTable();
                showToast(t('shortcuts_saved_toast') || 'Keyboard shortcuts saved');
            };

            window.addEventListener('keydown', _recordingKeydownHandler, true);
        }

        function clearShortcutSingle(actionId, event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            _cancelRecording();
            const customMap = getCmsCustomShortcutsMap();
            customMap[actionId] = null; // null represents explicitly cleared
            saveCmsCustomShortcutsMap(customMap);
            renderEditShortcutsTable();
        }

        function resetShortcutSingle(actionId, event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            _cancelRecording();
            const customMap = getCmsCustomShortcutsMap();
            delete customMap[actionId];
            saveCmsCustomShortcutsMap(customMap);
            renderEditShortcutsTable();
        }

        function openCmsShortcutsModal() {
            if (typeof ShortcutsModal === 'undefined') return;
            const customMap = getCmsCustomShortcutsMap();

            const sections = [
                { id: 'roster', title: t('shortcuts_cat_roster') || 'Roster Toggles' },
                { id: 'presentation', title: t('shortcuts_cat_presentation') || 'Presentation' },
                { id: 'grouping', title: t('shortcuts_cat_grouping') || 'Grouping & Roles' },
                { id: 'actions', title: t('shortcuts_cat_actions') || 'Classroom Actions' }
            ];

            const rows = [];
            sections.forEach(sec => {
                const defs = CMS_SHORTCUT_DEFINITIONS.filter(d => d.category === sec.id);
                const activeDefs = defs.map(d => ({ def: d, sc: getActiveShortcutForDef(d, customMap) }))
                                       .filter(item => item.sc && item.sc.key);
                if (activeDefs.length > 0) {
                    rows.push({ section: sec.title });
                    activeDefs.forEach(item => {
                        rows.push({
                            keys: formatShortcutKeysList(item.sc),
                            desc: t(item.def.nameKey) || item.def.defaultName
                        });
                    });
                }
            });

            // Extra static helpers
            rows.push({ section: t('skmSecGeneral') || 'General & Overlays' });
            rows.push({ keys: ['1-9'], desc: t('mode_title') || 'Activate working mode (when picker/overlay open)' });
            rows.push({ keys: ['Esc'], desc: t('skmCmsEsc') || 'Close active popup or overlay' });

            ShortcutsModal.open({
                title: t('skmTitle') || 'Keyboard Shortcuts',
                rows: rows,
                noShortcutsText: t('skmNone')
            });
        }

        // Global Dispatcher for customizable shortcuts
        document.addEventListener('keydown', function (e) {
            if (PRESENTATION_MODE) return;
            if (_activeRecordingActionId) return; // Handled by recording listener

            // Ignore shortcuts when typing in inputs, textareas, selects
            const tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const customMap = getCmsCustomShortcutsMap();
            const currentEventSc = {
                ctrl: !!(e.ctrlKey || e.metaKey),
                alt: !!e.altKey,
                shift: !!e.shiftKey,
                key: e.key.toLowerCase()
            };

            // Check against configured shortcuts
            for (const def of CMS_SHORTCUT_DEFINITIONS) {
                const activeSc = getActiveShortcutForDef(def, customMap);
                if (shortcutKeysMatch(currentEventSc, activeSc)) {
                    e.preventDefault();
                    if (typeof def.fn === 'function') def.fn();
                    return;
                }
            }

            // Legacy / Special Overlay Numeric & Ambient Fallbacks (when overlays are open)
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                const modeOverlay = document.getElementById('mode-animation-overlay');
                const modePicker = document.getElementById('mode-picker-modal');
                const timerFs = document.getElementById('timer-overlay');
                const pickerOpen = modePicker && modePicker.style.display === 'flex';
                const timerFsOpen = timerFs && timerFs.classList.contains('active');
                const modeOpen = modeOverlay && modeOverlay.classList.contains('active');

                if (pickerOpen || timerFsOpen || modeOpen) {
                    const matchedMode = classModes.find(m => m.shortcutKey === e.key);
                    if (matchedMode) {
                        e.preventDefault();
                        activateMode(matchedMode.id);
                    }
                }
            }
        });

        // ============================================================
        // CUSTOM TOOLTIPS (for DB menu buttons)
        // ============================================================

        (function () {
            let tooltipTimeout;

            document.querySelectorAll('.db-popup-btn[title]').forEach(btn => {
                btn.setAttribute('data-tooltip', btn.getAttribute('title'));
                btn.removeAttribute('title');
                btn.style.position = 'relative';

                btn.addEventListener('mouseenter', function () {
                    tooltipTimeout = setTimeout(() => {
                        this.classList.add('show-tooltip');
                    }, 500); // Show after 0.5s
                });

                btn.addEventListener('mouseleave', function () {
                    clearTimeout(tooltipTimeout);
                    this.classList.remove('show-tooltip');
                });
            });
        })();

        // ============================================================
        // DATABASE — localStorage-backed session storage
        // ============================================================

        const DB_KEY = 'cms-db';
        let isViewingPastSession = false;
        let liveStudentGroups = null; // backup of live state when viewing past
        const DB_AUTOSAVE_INTERVAL_MS = 20000;
        let dbAutosaveIntervalId = null;
        let dbAutosaveInitialized = false;
        let dbAutosaveLastFingerprint = '';
        let dbAutosaveLastSavedAt = null;
        let timeMachineSessionsCache = [];

