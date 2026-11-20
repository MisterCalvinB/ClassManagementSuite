// Participation Tracker — Orchestrator, Reset Helpers & Active Context
// ─── Reset helpers ────────────────────────────────────────────
async function handleResetGroupClick(e, targetGroupId) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    const targetGroup = targetGroupId || currentGroupId || (document.querySelector('.group-btn.active')?.dataset.group);

    if (!targetGroup) {
        const msg = (typeof t === 'function' ? t('ptMsgSelectGroup') : '') || 'Please select a class group first';
        if (typeof showToast === 'function') showToast(msg, true);
        if (typeof showMessage === 'function') showMessage(msg, 'error');
        return;
    }

    const groupName = (typeof groupDisplayName === 'function') ? groupDisplayName(targetGroup) : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[targetGroup]?.name) ? CLASS_GROUPS_META[targetGroup].name : targetGroup);
    const confirmMsg = `⚠️ RESET GROUP DATA\n\nAre you sure you want to permanently delete all participation data for "${groupName}"?\n\nThis will remove all recorded session logs for this group.`;

    let confirmed = false;
    if (typeof showConfirm === 'function') {
        confirmed = await showConfirm(confirmMsg);
    } else {
        confirmed = window.confirm(confirmMsg);
    }

    if (!confirmed) return;

    const finalMsg = `🛑 FINAL WARNING\n\nAll session data and student scores for "${groupName}" will be permanently erased. Proceed?`;
    let finalConfirmed = false;
    if (typeof showConfirm === 'function') {
        finalConfirmed = await showConfirm(finalMsg);
    } else {
        finalConfirmed = window.confirm(finalMsg);
    }

    if (!finalConfirmed) return;

    pendingResetAction = { type: 'group', payload: targetGroup };
    await executeReset();
}

async function openResetModal(type, payload) {
    if (type === 'session') {
        let dateStr = payload;
        const d = new Date(payload);
        if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        const confirmMsg = `⚠️ DELETE SESSION\n\nAre you sure you want to permanently delete the session from ${dateStr}?\n\nThis action cannot be undone.`;
        let confirmed = false;
        if (typeof showConfirm === 'function') {
            confirmed = await showConfirm(confirmMsg);
        } else {
            confirmed = window.confirm(confirmMsg);
        }
        if (!confirmed) return;

        pendingResetAction = { type: 'session', payload };
        await executeReset();
    } else if (type === 'group') {
        await handleResetGroupClick(null, payload);
    }
}

function closeResetModal1() {
    pendingResetAction = null;
}

function proceedResetStep2() {
}

function closeResetModal2() {
    pendingResetAction = null;
}

async function executeReset() {
    if (!pendingResetAction) return;
    const { type, payload } = pendingResetAction;
    pendingResetAction = null;

    if (type === 'session') {
        const idx = DB_EXPORT.findIndex(s => s && (s.id === payload || s.date === payload));
        if (idx !== -1) DB_EXPORT.splice(idx, 1);
        if (selectedHistorySessionId === payload) {
            selectedHistorySessionId = null;
        }
        syncGlobalDbExport();
        showMessage(t('ptMsgSessionDeleted'), 'success');
    } else if (type === 'group') {
        const candidateKeys = new Set([
            payload,
            String(payload),
            (typeof groupDisplayName === 'function') ? groupDisplayName(payload) : null,
            (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[payload]?.name) ? CLASS_GROUPS_META[payload].name : null
        ].filter(Boolean));

        DB_EXPORT.forEach(session => {
            if (session && session.groups) {
                candidateKeys.forEach(k => {
                    delete session.groups[k];
                });
            }
        });
        const filtered = DB_EXPORT.filter(s => s && s.groups && Object.keys(s.groups).length > 0);
        DB_EXPORT.splice(0, DB_EXPORT.length, ...filtered);
        syncGlobalDbExport();
        const groupName = (typeof groupDisplayName === 'function') ? groupDisplayName(payload) : ((typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[payload]?.name) ? CLASS_GROUPS_META[payload].name : payload);
        showMessage(tFmt('ptMsgGroupDeleted', { name: groupName }), 'success');
    }

    await persistResetToFile(type, payload);
    if (type === 'session' && currentGroupId) {
        await persistEditedGroupSessionsToDisk(currentGroupId);
    }
    if (type === 'group') {
        await persistNotesToFile();
    }
    currentStudentName = null;
    selectedHistorySessionId = null;
    currentHalfGroup = null;
    document.getElementById('studentDetailsArea').classList.add('hidden');
    document.getElementById('studentDetailTitle').classList.add('hidden');
    populateGroups();
    if (!currentGroupId || currentGroupId === payload || type === 'group') {
        currentGroupId = null;
        selectFirstGroup();
    }
    updateDashboard();
}

function groupNameToSafeDir(name) {
    return String(name)
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/^\.+/, '')
        .trim() || '_class';
}

async function persistResetToFile(type, payload) {
    if (!ELECTRON_AVAILABLE || !window.Desktop) return;
    if (type === 'group') {
        const candidateNames = new Set();
        if (payload) {
            candidateNames.add(String(payload));
            candidateNames.add(groupNameToSafeDir(payload));
            candidateNames.add(String(payload).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').replace(/^\.+/, '').trim());
            candidateNames.add(String(payload).replace(/[<>:"\/\\|?*]/g, '-').replace(/\s+/g, '_').replace(/^\.+/, '').trim());
        }
        const dispName = (typeof groupDisplayName === 'function') ? groupDisplayName(payload) : null;
        if (dispName) {
            candidateNames.add(String(dispName));
            candidateNames.add(groupNameToSafeDir(dispName));
            candidateNames.add(String(dispName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').replace(/^\.+/, '').trim());
            candidateNames.add(String(dispName).replace(/[<>:"\/\\|?*]/g, '-').replace(/\s+/g, '_').replace(/^\.+/, '').trim());
        }
        if (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META && CLASS_GROUPS_META[payload]?.name) {
            const mName = CLASS_GROUPS_META[payload].name;
            candidateNames.add(String(mName));
            candidateNames.add(groupNameToSafeDir(mName));
            candidateNames.add(String(mName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').replace(/^\.+/, '').trim());
            candidateNames.add(String(mName).replace(/[<>:"\/\\|?*]/g, '-').replace(/\s+/g, '_').replace(/^\.+/, '').trim());
        }
        candidateNames.delete('');

        // 1. Delete candidate folders directly
        for (const name of candidateNames) {
            try { await Desktop.deleteByPath('groupParticipation', name, { recursive: true, force: true }); } catch (_) {}
            try { await Desktop.deleteByPath('groupParticipation', 'archived/' + name, { recursive: true, force: true }); } catch (_) {}
        }

        // 2. Scan and clean all participation files
        try {
            const listResult = await Desktop.listByPath('groupParticipation', '.', {
                extensions: ['.js', '.json', '.txt'],
                recursive: true
            });
            const files = Array.isArray(listResult?.files) ? listResult.files : [];
            for (const fileInfo of files) {
                const relPath = fileInfo.relativePath || fileInfo.name || '';
                if (!relPath) continue;
                if (relPath === 'pt-rules.js' || relPath === 'pt-presets.js' || relPath === 'pt-deleted.js') continue;

                let matchesFolder = false;
                for (const name of candidateNames) {
                    if (relPath === name ||
                        relPath.startsWith(name + '/') ||
                        relPath.startsWith('archived/' + name + '/') ||
                        relPath.includes('/' + name + '/') ||
                        relPath.includes('_' + name + '.') ||
                        relPath.includes('-' + name + '.')) {
                        matchesFolder = true;
                        break;
                    }
                }

                if (matchesFolder) {
                    try {
                        await Desktop.deleteByPath('groupParticipation', relPath, { force: true });
                    } catch (_) {}
                    continue;
                }

                // Inspect content of other data files (e.g. flat cms-db.js or multi-class session files)
                try {
                    const readResult = await Desktop.readByPath('groupParticipation', relPath);
                    if (readResult && readResult.ok && readResult.content) {
                        const content = String(readResult.content);
                        let fileHasGroup = false;
                        for (const name of candidateNames) {
                            if (content.includes(name)) {
                                fileHasGroup = true;
                                break;
                            }
                        }

                        if (fileHasGroup) {
                            const fileSessions = extractSessionsFromContent(content);
                            if (Array.isArray(fileSessions) && fileSessions.length > 0) {
                                let modified = false;
                                fileSessions.forEach(session => {
                                    if (session && session.groups) {
                                        for (const name of candidateNames) {
                                            if (session.groups[name]) {
                                                delete session.groups[name];
                                                modified = true;
                                            }
                                        }
                                    }
                                });

                                if (modified) {
                                    const remainingSessions = fileSessions.filter(s => s && s.groups && Object.keys(s.groups).length > 0);
                                    if (remainingSessions.length === 0) {
                                        try {
                                            await Desktop.deleteByPath('groupParticipation', relPath, { force: true });
                                        } catch (_) {}
                                    } else {
                                        const newContent = `window.CMS_DB_EXPORT = ${JSON.stringify(remainingSessions, null, 2)};\nwindow.DB_EXPORT = window.CMS_DB_EXPORT;\n`;
                                        const pathParts = relPath.split('/');
                                        const filename = pathParts.pop();
                                        const subdir = pathParts.length > 0 ? pathParts.join('/') : null;
                                        try {
                                            await Desktop.saveFile({
                                                target: 'groupParticipation',
                                                filename: filename,
                                                subdir: subdir,
                                                content: newContent,
                                                encoding: 'utf8'
                                            });
                                        } catch (_) {}
                                    }
                                }
                            }
                        }
                    }
                } catch (_) {}
            }
        } catch (e) {
            console.warn('Failed listing/deleting group participation files:', e);
        }
    } else if (type === 'session') {
        await addSessionTombstone(payload);
    }
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const ptCh = new BroadcastChannel('cmt-participation');
            ptCh.postMessage({ action: 'participation-updated', timestamp: Date.now() });
            ptCh.close();
        } catch (_) {}
    }
}

async function addSessionTombstone(sessionId) {
    try {
        let existing = [];
        const result = await Desktop.readText('groupParticipation', 'pt-deleted.js');
        if (result?.ok && result.content) {
            const m = result.content.match(/window\.CMS_DELETED_SESSIONS\s*=\s*(\[[\s\S]*?\]);?/);
            if (m) existing = JSON.parse(m[1]);
        }
        if (!existing.includes(sessionId)) existing.push(sessionId);
        await Desktop.saveText('groupParticipation', 'pt-deleted.js', `window.CMS_DELETED_SESSIONS = ${JSON.stringify(existing)};\n`);
    } catch (e) {
        showMessage(t('ptMsgErrSavingDeletion') + e.message, 'error');
    }
}

// Close modal when clicking outside
document.getElementById('detailModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailModal();
    }
});

document.getElementById('confirmModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeConfirmModal();
    }
});

document.getElementById('importModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeImportModal();
    }
});

document.getElementById('compareGroupsModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeCompareGroupsModal();
    }
});

document.getElementById('resetWarn1Modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeResetModal1();
});

document.getElementById('resetWarn2Modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeResetModal2();
});

document.getElementById('savedRulesModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeSavedRulesModal();
});

document.getElementById('confirmNewRulesModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeConfirmNewRulesModal();
});

document.getElementById('ptExportModal')?.addEventListener('click', function(e) {
    if (e.target === this) closePtExportModal();
});



// Show message helper
function showMessage(text, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageEl = document.createElement('div');
    messageEl.className = type;
    messageEl.textContent = text;
    container.appendChild(messageEl);

    if (type !== 'error') {
        setTimeout(() => messageEl.remove(), 4000);
    }
}

function getActiveSemesterDates() {
    const cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : {};
    const pcfg = (typeof PLANNER_CONFIG !== 'undefined' && PLANNER_CONFIG) ? PLANNER_CONFIG : {};
    const semesters = Array.isArray(pcfg.semesters) ? pcfg.semesters : [];

    // 1. Direct active context semester dates from group-editor / class-groups.js
    if (cgd.activeSemesterStart && cgd.activeSemesterEnd) {
        const label = cgd.activeSemester ? `S${cgd.activeSemester}` : (t('ptDateSemester') || 'Active Semester');
        return {
            start: cgd.activeSemesterStart,
            end: cgd.activeSemesterEnd,
            label: label,
            source: 'group-editor'
        };
    }

    // 2. From planner activeSemesterId
    if (pcfg.activeSemesterId && semesters.length > 0) {
        const activeSem = semesters.find(s => s.id === pcfg.activeSemesterId);
        if (activeSem && activeSem.semesterStart && activeSem.semesterEnd) {
            return {
                start: activeSem.semesterStart,
                end: activeSem.semesterEnd,
                label: activeSem.label || `Semester ${activeSem.id}`,
                source: 'planner'
            };
        }
    }

    // 3. From planner matching activeSemester number / activeYear
    if (cgd.activeSemester && semesters.length > 0) {
        const targetStr = String(cgd.activeSemester).toLowerCase();
        const matched = semesters.find(s => {
            const idStr = String(s.id || '').toLowerCase();
            const labelStr = String(s.label || '').toLowerCase();
            return idStr.includes(targetStr) || labelStr.includes(targetStr) || (s.semester === cgd.activeSemester);
        });
        if (matched && matched.semesterStart && matched.semesterEnd) {
            return {
                start: matched.semesterStart,
                end: matched.semesterEnd,
                label: matched.label || `S${cgd.activeSemester}`,
                source: 'planner'
            };
        }
    }

    // 4. From planner matching today's date
    if (semesters.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentSem = semesters.find(s => s.semesterStart && s.semesterEnd && s.semesterStart <= todayStr && todayStr <= s.semesterEnd);
        if (currentSem) {
            return {
                start: currentSem.semesterStart,
                end: currentSem.semesterEnd,
                label: currentSem.label || (t('ptDateSemester') || 'Active Semester'),
                source: 'planner'
            };
        }
        // Fallback to first semester if it has dates
        const firstWithDates = semesters.find(s => s.semesterStart && s.semesterEnd);
        if (firstWithDates) {
            return {
                start: firstWithDates.semesterStart,
                end: firstWithDates.semesterEnd,
                label: firstWithDates.label || (t('ptDateSemester') || 'Active Semester'),
                source: 'planner'
            };
        }
    }

    // Fallback if partial dates exist on cgd
    if (cgd.activeSemesterStart || cgd.activeSemesterEnd) {
        return {
            start: cgd.activeSemesterStart || '',
            end: cgd.activeSemesterEnd || '',
            label: cgd.activeSemester ? `S${cgd.activeSemester}` : (t('ptDateSemester') || 'Active Semester'),
            source: 'group-editor'
        };
    }

    return { start: '', end: '', label: (t('ptDateSemester') || 'Active Semester'), source: 'none' };
}

function _initActiveContext() {
    const _cgd = (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) ? CLASS_GROUPS_DATA : {};
    const ay = _cgd.activeYear || '';
    const as = _cgd.activeSemester || null;
    const badge = document.getElementById('pt-active-context');
    if (badge && (ay || as)) {
        badge.textContent = [ay, as ? 'S' + as : ''].filter(Boolean).join(' · ');
        badge.style.display = '';
    }

    const semDates = getActiveSemesterDates();
    const hasSemesterDates = Boolean(semDates.start && semDates.end);

    const semBtn = document.getElementById('ptSemesterBtn');
    if (semBtn) {
        if (hasSemesterDates) {
            semBtn.style.display = '';
            if (semDates.label) {
                semBtn.title = `${semDates.label}: ${semDates.start} → ${semDates.end}`;
            }
        } else {
            semBtn.style.display = 'none';
        }
    }

    const modalSemBtn = document.getElementById('modalSemesterBtn');
    if (modalSemBtn) {
        if (hasSemesterDates) {
            modalSemBtn.style.display = '';
            if (semDates.label) {
                modalSemBtn.title = `${semDates.label}: ${semDates.start} → ${semDates.end}`;
            }
        } else {
            modalSemBtn.style.display = 'none';
        }
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', initializeApp);
