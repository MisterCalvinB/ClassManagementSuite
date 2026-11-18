        (function () {
            'use strict';

            var _currentMode = 'local'; // 'local' | 'external'

            // ── State push (debounced 250 ms) ──────────────────────────
            let _remotePushTimer = null;
            function _remotePushStateDebounced() {
                clearTimeout(_remotePushTimer);
                _remotePushTimer = setTimeout(function () {
                    if (!window.Desktop || !window.Desktop.isElectron()) return;
                    try {
                        const groupNames = Object.keys(studentGroups || {});
                        const groupLabels = {};
                        groupNames.forEach(function (gId) {
                            groupLabels[gId] = (rawMeta[gId] && rawMeta[gId].name) ? rawMeta[gId].name : gId;
                        });
                        const statePayload = {
                            activeGroup: selectedGroupName,
                            groupNames,
                            groupLabels,
                            groups: {},
                            badgeDefinitions: (badgeDefinitions || []).map(function (b) {
                                return { ...b };
                            })
                        };
                        groupNames.forEach(function (gName) {
                            statePayload.groups[gName] = (studentGroups[gName] || []).map(function (s) {
                                return {
                                    id: s.id,
                                    name: s.name,
                                    isAbsent: !!s.isAbsent,
                                    pluses: s.pluses || 0,
                                    minuses: s.minuses || 0,
                                    teamPluses: s.teamPluses || 0,
                                    teamMinuses: s.teamMinuses || 0,
                                    badges: (s.badges || []).map(function (b) {
                                        return { icon: b.icon, label: b.label, tone: b.tone };
                                    }),
                                    role: s.role || null,
                                    isFlagged: !!s.isFlagged
                                };
                            });
                        });
                        window.Desktop.remotePushState(statePayload).catch(function () { });
                    } catch (e) { /* ignore */ }
                }, 250);
            }

            // Expose globally so mod/awardBadge/removeBadge can call it
            window._remotePushStateDebounced = _remotePushStateDebounced;

            // ── Incoming remote action from phone ─────────────────────
            window._cmsRemoteAction = function (act) {
                try {
                    var action = act.action;
                    var studentId = act.studentId;
                    var groupName = act.groupName;
                    // Switch active class group if different to process remote action in correct context
                    if (groupName !== selectedGroupName) {
                        if (typeof selectGroup === 'function') {
                            selectGroup(groupName);
                        } else {
                            return;
                        }
                    }
                    if (action === 'score') {
                        mod(studentId, act.delta > 0 ? 'p' : 'm', 1);
                    } else if (action === 'badge_add') {
                        awardBadge(studentId, act.icon, act.label, act.tone || 'positive', '');
                    } else if (action === 'badge_remove') {
                        removeBadge(studentId, act.icon);
                    }
                    _remotePushStateDebounced();
                } catch (e) { console.warn('_cmsRemoteAction error:', e); }
            };

            // ── Status update from main process (connected phone count) ─
            window._cmsRemoteStatusUpdate = function (count) {
                var badge = document.getElementById('remote-connected-badge');
                if (badge) {
                    badge.textContent = count > 0 ? String(count) : '';
                    badge.style.display = count > 0 ? 'inline-block' : 'none';
                }
                var statusEl = document.getElementById('remote-modal-status');
                if (statusEl) {
                    statusEl.textContent = count > 0
                        ? (t('remote_phones_connected') || '{count} phone(s) connected').replace('{count}', count)
                        : (t('remote_no_phones_connected') || 'No phones connected');
                    statusEl.style.color = count > 0 ? '#16a34a' : '#888';
                }
            };

            // ── Mode toggle ────────────────────────────────────────────
            window._remoteSetMode = function (mode) {
                _currentMode = mode;
                var localBtn = document.getElementById('remote-mode-local-btn');
                var extBtn = document.getElementById('remote-mode-ext-btn');
                var localFlds = document.getElementById('remote-local-fields');
                var extFlds = document.getElementById('remote-ext-fields');
                if (mode === 'external') {
                    if (localBtn) { localBtn.style.background = '#f8fafc'; localBtn.style.color = '#334155'; }
                    if (extBtn) { extBtn.style.background = '#2563eb'; extBtn.style.color = '#fff'; }
                    if (localFlds) localFlds.style.display = 'none';
                    if (extFlds) extFlds.style.display = 'block';
                } else {
                    if (localBtn) { localBtn.style.background = '#2563eb'; localBtn.style.color = '#fff'; }
                    if (extBtn) { extBtn.style.background = '#f8fafc'; extBtn.style.color = '#334155'; }
                    if (localFlds) localFlds.style.display = 'block';
                    if (extFlds) extFlds.style.display = 'none';
                }
                // Persist choice
                if (window.Desktop && window.Desktop.isElectron() && typeof Desktop.remoteConfigSave === 'function') {
                    Desktop.remoteConfigSave(_remoteGetConfig()).catch(function () { });
                }
            };

            function _remoteGetConfig() {
                return {
                    mode: _currentMode,
                    serverUrl: (document.getElementById('remote-server-url') || {}).value || '',
                    hostSecret: (document.getElementById('remote-host-secret') || {}).value || ''
                };
            }

            // ── Modal open / close ─────────────────────────────────────
            window.openRemoteModal = function () {
                var overlay = document.getElementById('remote-overlay');
                if (!overlay) return;
                overlay.style.display = 'flex';

                if (window.Desktop && window.Desktop.isElectron()) {
                    // Load saved config then sync server state
                    var loadCfg = typeof Desktop.remoteConfigRead === 'function'
                        ? Desktop.remoteConfigRead()
                        : Promise.resolve({ ok: true, config: {} });

                    loadCfg.then(function (r) {
                        var cfg = (r && r.config) || {};
                        if (cfg.serverUrl) {
                            var urlEl = document.getElementById('remote-server-url');
                            if (urlEl) urlEl.value = cfg.serverUrl;
                        }
                        if (cfg.hostSecret) {
                            var secEl = document.getElementById('remote-host-secret');
                            if (secEl) secEl.value = cfg.hostSecret;
                        }
                        _remoteSetMode(cfg.mode === 'external' ? 'external' : 'local');

                        return Desktop.remoteStatus();
                    }).then(function (s) {
                        if (s && s.running) { _showServerOn(s); } else { _showServerOff(); }
                    }).catch(function () { _showServerOff(); });
                }
            };

            window.closeRemoteModal = function () {
                var overlay = document.getElementById('remote-overlay');
                if (overlay) overlay.style.display = 'none';
            };

            function _showServerOff() {
                document.getElementById('remote-server-off').style.display = 'block';
                document.getElementById('remote-server-on').style.display = 'none';
            }

            function _showServerOn(s) {
                document.getElementById('remote-server-off').style.display = 'none';
                document.getElementById('remote-server-on').style.display = 'block';

                var url;
                if (s.mode === 'external' && s.httpUrl) {
                    url = s.httpUrl.replace(/\/remote\.html$/, '') + '/?t=' + s.token;
                    var hintEl = document.getElementById('remote-local-hint');
                    if (hintEl) hintEl.style.display = 'none';
                } else {
                    url = 'http://' + s.ip + ':' + s.port + '/?t=' + s.token;
                    var hintEl2 = document.getElementById('remote-local-hint');
                    if (hintEl2) {
                        hintEl2.style.display = 'block';
                        var cmdEl = document.getElementById('remote-firewall-cmd');
                        if (cmdEl) cmdEl.textContent =
                            'netsh advfirewall firewall add rule name="CMT Classroom Server" dir=in action=allow protocol=TCP localport=' + s.port + ' profile=any';
                    }
                }

                document.getElementById('remote-url-display').textContent = url;
                document.getElementById('remote-token-display').textContent = s.token;
                var qrImg = document.getElementById('remote-qr-img');
                if (qrImg) {
                    qrImg.style.display = 'block';
                    qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=4&data=' + encodeURIComponent(url);
                }
                window._cmsRemoteStatusUpdate(s.connected || 0);
                _remotePushStateDebounced();
            }

            // ── Start / stop server ────────────────────────────────────
            window._remoteStartServer = function () {
                if (!window.Desktop || !window.Desktop.isElectron()) { showToast('Desktop API not available.', true); return; }
                var cfg = _remoteGetConfig();
                // Save config before starting
                if (typeof Desktop.remoteConfigSave === 'function') Desktop.remoteConfigSave(cfg).catch(function () { });

                var opts = { mode: cfg.mode };
                if (cfg.mode === 'local') {
                    opts.port = parseInt((document.getElementById('remote-port-input') || {}).value, 10) || 8787;
                } else {
                    opts.serverUrl = cfg.serverUrl;
                    opts.hostSecret = cfg.hostSecret;
                }

                window.Desktop.remoteStart(opts).then(function (res) {
                    if (res && res.ok) {
                        _showServerOn(res);
                    } else {
                        showToast('Could not start remote server: ' + (res && res.error ? res.error : 'Unknown error'), true);
                    }
                }).catch(function (e) { showToast('Error: ' + (e && e.message ? e.message : String(e)), true); });
            };

            window._remoteStopServer = function () {
                if (!window.Desktop || !window.Desktop.isElectron()) return;
                window.Desktop.remoteStop().then(function () { _showServerOff(); }).catch(function () { });
            };

            window._remoteCopyUrl = function () {
                var url = document.getElementById('remote-url-display').textContent;
                if (url && navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(function () {
                        var btn = document.querySelector('[onclick="_remoteCopyUrl()"]');
                        if (btn) { btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" style="width:13px;height:13px;" />'; setTimeout(function () { btn.innerHTML = '<img src="../assets/icons/copy.svg" class="btn-icon" alt="" style="width:13px;height:13px;" />'; }, 1500); }
                    }).catch(function () { });
                }
            };

            window._remoteNewToken = async function () {
                if (!window.Desktop || !window.Desktop.isElectron()) return;
                if (!await showConfirm('Generate a new token? Connected phones will be disconnected.')) return;
                window.Desktop.remoteNewToken().then(function (res) {
                    if (res && res.ok) {
                        var ip = res.ip || '';
                        var port = res.port || 8787;
                        var url = res.mode === 'external' && res.httpUrl
                            ? res.httpUrl.replace(/\/remote\.html$/, '') + '/?t=' + res.token
                            : 'http://' + ip + ':' + port + '/?t=' + res.token;
                        document.getElementById('remote-url-display').textContent = url;
                        document.getElementById('remote-token-display').textContent = res.token;
                        var qrImg = document.getElementById('remote-qr-img');
                        if (qrImg) {
                            qrImg.style.display = 'block';
                            qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=4&data=' + encodeURIComponent(url);
                        }
                        window._cmsRemoteStatusUpdate(0);
                    }
                }).catch(function () { });
            };
        })();

        // u2500u2500 Cross-app data sync u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
        if (window.Desktop && typeof Desktop.onDataChanged === 'function') {
            window._cmtHotReload = async function (data) {
                if (!data) return;
                if (data.filename === 'class-groups.js' && typeof Desktop.readText === 'function') {
                    try {
                        var r = await Desktop.readText('user', 'class-groups.js');
                        if (r && r.ok && r.content) {
                            var fn = new Function(r.content + '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA : { classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : {}) };');
                            var parsed = fn();
                            if (parsed && (parsed.classGroupsMeta || parsed.classGroups)) {
                                rawData = parsed.classGroups || {};
                                rawMeta = parsed.classGroupsMeta || {};
                                window.CLASS_GROUPS = rawData;
                                window.CLASS_GROUPS_META = rawMeta;
                                studentGroups = {};
                                if (typeof buildStudentGroups === 'function') buildStudentGroups();
                                if (typeof renderGroupButtons === 'function') renderGroupButtons();
                            }
                        }
                    } catch (e) { location.reload(); }
                } else {
                    location.reload();
                }
            };
            Desktop.onDataChanged(function (data) {
                if (PRESENTATION_MODE) return;
                if (data && (data.filename === 'class-groups.js' || data.filename === 'config.js')) {
                    showDataChangedBanner(data);
                }
            });
        }

        // ── Lesson Runner Integration (Lesson Creator) ───────────────────────────
        (function () {
            function escapeHtml(str) {
                if (typeof escapeSettingsHtml === 'function') return escapeSettingsHtml(str);
                return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            function getCmsClassDisplayName(cid) {
                if (!cid) return '';
                var meta = (loadedConfigCache && loadedConfigCache.classGroupsMeta) || (typeof CLASS_GROUPS_META !== 'undefined' ? CLASS_GROUPS_META : {}) || {};
                if (meta[cid] && meta[cid].name) return meta[cid].name;
                for (var k in meta) {
                    if (k === cid && meta[k].name) return meta[k].name;
                }
                return cid;
            }

            function isPlanMatchingClass(pClassId, targetClassId) {
                if (!pClassId || !targetClassId) return false;
                if (pClassId === targetClassId) return true;
                if (selectedGroupName && pClassId === selectedGroupName) return true;
                var nameA = getCmsClassDisplayName(pClassId);
                var nameB = getCmsClassDisplayName(targetClassId);
                if (nameA && nameB && nameA.toLowerCase() === nameB.toLowerCase()) return true;
                return false;
            }

            window.CmsLessonRunner = {
                activePlan: null,
                activePhaseIndex: 0,
                pendingDetectedPlan: null,

                init: async function () {
                    var params = new URLSearchParams(window.location.search);
                    var planId = params.get('loadLessonPlanId');
                    if (planId) {
                        await this.loadPlanById(planId);
                    } else if (typeof selectedGroupName !== 'undefined' && selectedGroupName) {
                        await this.checkClassPlanOnSelect(selectedGroupName);
                    }
                },

                checkClassPlanOnSelect: async function (classId) {
                    if (!classId || this.activePlan) return;
                    try {
                        var todayStr = new Date().toISOString().slice(0, 10);
                        var matchingPlans = [];

                        if (window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
                            var allFilesToScan = [];
                            var listRes = await Desktop.listByPath('user', 'lessons', { extensions: ['.json'] });
                            var files = (listRes && listRes.ok && Array.isArray(listRes.files)) ? listRes.files : [];
                            files.forEach(function (f) {
                                if (f && f.filename && f.filename.endsWith('.json')) {
                                    allFilesToScan.push({ target: 'user', relPath: f.relativePath || ('lessons/' + f.filename) });
                                }
                            });

                            for (var i = 0; i < allFilesToScan.length; i++) {
                                var item = allFilesToScan[i];
                                var res = await Desktop.readByPath(item.target, item.relPath);
                                if (res && res.ok && res.content) {
                                    try {
                                        var p = JSON.parse(res.content);
                                        if (p && isPlanMatchingClass(p.classId, classId)) {
                                            var planDate = p.date ? String(p.date).slice(0, 10) : '';
                                            if (planDate === todayStr) {
                                                matchingPlans.push(p);
                                            }
                                        }
                                    } catch (_) {}
                                }
                            }
                        } else {
                            for (var key in localStorage) {
                                if (key.startsWith('cmt-lesson-')) {
                                    try {
                                        var p = JSON.parse(localStorage.getItem(key));
                                        if (p && isPlanMatchingClass(p.classId, classId)) {
                                            var planDate = p.date ? String(p.date).slice(0, 10) : '';
                                            if (planDate === todayStr) {
                                                matchingPlans.push(p);
                                            }
                                        }
                                    } catch (_) {}
                                }
                            }
                        }

                        if (matchingPlans.length === 1) {
                            this.loadPlan(matchingPlans[0]);
                        } else if (matchingPlans.length > 1) {
                            this.showMultiplePlansChoice(matchingPlans);
                        }
                    } catch (e) {
                        console.warn('CmsLessonRunner checkClassPlanOnSelect:', e);
                    }
                },

                showMultiplePlansChoice: function (plans) {
                    var listContainer = document.getElementById('clr-multiple-plans-list');
                    if (!listContainer) return;
                    listContainer.innerHTML = '';
                    var self = this;
                    plans.forEach(function (plan) {
                        var card = document.createElement('div');
                        card.className = 'choice-plan-card';
                        card.style.cssText = 'border:2px solid #111; border-radius:6px; padding:10px 12px; cursor:pointer; background:#f8fafc; display:flex; justify-content:space-between; align-items:center;';
                        var clsName = getCmsClassDisplayName(plan.classId);
                        card.innerHTML = '<div>' +
                            '<div style="font-weight:800; font-size:0.92rem; color:#111;">' + escapeHtml(plan.title || 'Untitled') + '</div>' +
                            '<div style="font-size:0.78rem; color:#555; margin-top:2px;">' + (clsName ? '<strong>' + escapeHtml(clsName) + '</strong> &bull; ' : '') + (plan.sections || []).length + ' phases &bull; ' + (plan.totalDuration || plan.targetDuration || 60) + ' min' + (plan.unitTopic ? ' &bull; ' + escapeHtml(plan.unitTopic) : '') + '</div>' +
                            '</div>' +
                            '<span style="background:#111; color:#fff; font-size:0.75rem; font-weight:700; padding:4px 10px; border-radius:4px;">Load</span>';
                        
                        card.onmouseenter = function () { card.style.background = '#e0f2fe'; };
                        card.onmouseleave = function () { card.style.background = '#f8fafc'; };
                        card.onclick = function () {
                            self.loadPlan(plan);
                            self.dismissDetectedModal();
                        };
                        listContainer.appendChild(card);
                    });

                    var modal = document.getElementById('clr-plan-detected-modal');
                    if (modal) modal.style.display = 'flex';
                },

                dismissDetectedModal: function () {
                    this.pendingDetectedPlan = null;
                    var modal = document.getElementById('clr-plan-detected-modal');
                    if (modal) modal.style.display = 'none';
                },

                acceptDetectedPlan: function () {
                    if (this.pendingDetectedPlan) {
                        this.loadPlan(this.pendingDetectedPlan);
                    }
                    this.dismissDetectedModal();
                },

                loadPlanById: async function (planId) {
                    if (!planId) return;
                    try {
                        if (window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
                            var allFilesToScan = [];
                            
                            // 1. Scan user/lessons/
                            var listRes = await Desktop.listByPath('user', 'lessons', { extensions: ['.json'] });
                            var files = (listRes && listRes.ok && Array.isArray(listRes.files)) ? listRes.files : [];
                            files.forEach(function (f) {
                                if (f && f.filename) {
                                    allFilesToScan.push({ target: 'user', relPath: f.relativePath || ('lessons/' + f.filename) });
                                }
                            });

                            // 2. Scan user/ root for legacy/flat lp_ files
                            if (typeof Desktop.listFiles === 'function') {
                                var rootRes = await Desktop.listFiles('user', { extensions: ['.json'] });
                                var rootFiles = (rootRes && rootRes.ok && Array.isArray(rootRes.files)) ? rootRes.files : [];
                                rootFiles.forEach(function (f) {
                                    if (f && f.filename && f.filename.startsWith('lp_')) {
                                        allFilesToScan.push({ target: 'user', relPath: f.filename });
                                    }
                                });
                            }

                            for (var i = 0; i < allFilesToScan.length; i++) {
                                var item = allFilesToScan[i];
                                var res = await Desktop.readByPath(item.target, item.relPath);
                                if (res && res.ok && res.content) {
                                    try {
                                        var p = JSON.parse(res.content);
                                        if (p && (p.id === planId || String(p.id) === String(planId))) {
                                            this.loadPlan(p);
                                            return;
                                        }
                                    } catch (_) {}
                                }
                            }
                        } else {
                            var stored = localStorage.getItem('cmt-lesson-' + planId);
                            if (stored) {
                                var p = JSON.parse(stored);
                                if (p) {
                                    this.loadPlan(p);
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('CmsLessonRunner loadPlanById failed:', e);
                    }
                },

                lessonStartTime: null,

                setLessonStartTime: function (timeVal) {
                    if (timeVal instanceof Date && !isNaN(timeVal.getTime())) {
                        this.lessonStartTime = new Date(timeVal);
                    } else if (typeof timeVal === 'string' && timeVal.indexOf(':') !== -1) {
                        var parts = timeVal.trim().split(':');
                        var now = new Date();
                        now.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
                        this.lessonStartTime = now;
                    } else {
                        this.lessonStartTime = new Date();
                    }
                },

                startActivityNow: function () {
                    this.lessonStartTime = new Date();
                    this.renderCurrentPhase();
                    
                    if (this.activePlan && Array.isArray(this.activePlan.sections) && this.activePlan.sections[this.activePhaseIndex]) {
                        var durMins = Number(this.activePlan.sections[this.activePhaseIndex].duration) || 5;
                        var minsInput = document.getElementById('overlay-timer-minutes');
                        var hrsInput = document.getElementById('overlay-timer-hours');
                        if (minsInput && hrsInput) {
                            hrsInput.value = 0;
                            minsInput.value = durMins;
                            if (typeof syncOverlaySettingsToPopup === 'function') syncOverlaySettingsToPopup();
                        }
                    }

                    if (typeof showToast === 'function') {
                        var timeSpan = this.getPhaseTimeSpan(this.activePhaseIndex);
                        showToast('Activity started at ' + timeSpan.startStr + '!');
                    }
                },

                formatTimeStr: function (dateObj) {
                    if (!dateObj || isNaN(dateObj.getTime())) return '--:--';
                    var hh = String(dateObj.getHours()).padStart(2, '0');
                    var mm = String(dateObj.getMinutes()).padStart(2, '0');
                    return hh + ':' + mm;
                },

                getPhaseTimeSpan: function (phaseIdx) {
                    if (!this.activePlan || !Array.isArray(this.activePlan.sections)) {
                        return { startStr: '--:--', endStr: '--:--' };
                    }
                    var baseTime = this.lessonStartTime || new Date();
                    var offsetMins = 0;
                    for (var i = 0; i < phaseIdx; i++) {
                        offsetMins += Number(this.activePlan.sections[i].duration) || 0;
                    }
                    var phaseDur = Number(this.activePlan.sections[phaseIdx].duration) || 0;
                    var startTime = new Date(baseTime.getTime() + offsetMins * 60000);
                    var endTime = new Date(startTime.getTime() + phaseDur * 60000);
                    return {
                        startStr: this.formatTimeStr(startTime),
                        endStr: this.formatTimeStr(endTime),
                        startTime: startTime,
                        endTime: endTime
                    };
                },

                toggleCollapse: function () {
                    lessonRunnerCollapsed = !lessonRunnerCollapsed;
                    var container = document.getElementById('cms-lesson-runner-container');
                    if (container) {
                        container.classList.toggle('is-collapsed', lessonRunnerCollapsed);
                    }
                    var btn = document.getElementById('clr-collapse-btn');
                    if (btn) {
                        btn.textContent = lessonRunnerCollapsed ? '▼' : '▲';
                    }
                    try { localStorage.setItem('cms-lr-collapsed', lessonRunnerCollapsed ? '1' : '0'); } catch (_) {}
                    if (!PRESENTATION_MODE && typeof _broadcastPresentationState === 'function') {
                        _broadcastPresentationState();
                    }
                },

                loadPlan: function (plan) {
                    if (!plan || !Array.isArray(plan.sections)) return;
                    this.activePlan = plan;
                    this.activePhaseIndex = 0;

                    // Initialize startTime from planner slot time, plan scheduled startTime, or current clock time
                    if (typeof selectedPlannerSlot !== 'undefined' && selectedPlannerSlot && selectedPlannerSlot.time) {
                        this.setLessonStartTime(selectedPlannerSlot.time);
                    } else if (plan.startTime) {
                        this.setLessonStartTime(plan.startTime);
                    } else {
                        this.setLessonStartTime(new Date());
                    }

                    var container = document.getElementById('cms-lesson-runner-container');
                    if (container) {
                        container.classList.remove('cms-lr-mode-compact', 'cms-lr-mode-collapsible', 'cms-lr-mode-single');
                        container.classList.add('cms-lr-mode-' + (lessonRunnerLayout || 'compact'));
                        container.classList.toggle('is-collapsed', !!lessonRunnerCollapsed);
                        container.style.display = '';
                    }

                    var cBtn = document.getElementById('clr-collapse-btn');
                    if (cBtn) cBtn.textContent = lessonRunnerCollapsed ? '▼' : '▲';

                    // Auto-select class group if specified in plan and available
                    if (plan.classId && typeof selectGroup === 'function' && selectedGroupName !== plan.classId) {
                        if (typeof studentGroups !== 'undefined' && studentGroups[plan.classId]) {
                            selectGroup(plan.classId);
                        }
                    }

                    this.renderCurrentPhase();
                    if (!PRESENTATION_MODE && typeof _broadcastPresentationState === 'function') {
                        _broadcastPresentationState();
                    }
                    if (typeof showToast === 'function') showToast('Lesson Plan Loaded: ' + (plan.title || 'Untitled'));
                },

                unloadPlan: function () {
                    this.activePlan = null;
                    this.activePhaseIndex = 0;
                    var container = document.getElementById('cms-lesson-runner-container');
                    if (container) container.style.display = 'none';
                    if (!PRESENTATION_MODE && typeof _broadcastPresentationState === 'function') {
                        _broadcastPresentationState();
                    }
                },

                renderCurrentPhase: function () {
                    if (!this.activePlan || !this.activePlan.sections) return;
                    var phases = this.activePlan.sections;
                    var phase = phases[this.activePhaseIndex];
                    if (!phase) return;

                    var numEl = document.getElementById('clr-phase-num');
                    if (numEl) numEl.textContent = 'PHASE ' + (this.activePhaseIndex + 1) + ' / ' + phases.length;

                    var titleEl = document.getElementById('clr-phase-title');
                    if (titleEl) {
                        titleEl.textContent = (phase.title || 'Phase') + ' (' + (phase.duration || 0) + 'm)';
                        titleEl.title = 'Teacher: ' + (phase.teacherAction || phase.objective || '—') + '\nStudent: ' + (phase.studentAction || '—');
                    }

                    var badgeEl = document.getElementById('clr-phase-badge');
                    if (badgeEl) {
                        badgeEl.textContent = (phase.activityTypeId || 'ACTIVITY').replace(/_/g, ' ').toUpperCase();
                        badgeEl.title = 'Teacher: ' + (phase.teacherAction || phase.objective || '—') + '\nStudent: ' + (phase.studentAction || '—');
                    }

                    // Render start and end clock times badge
                    var currentSpan = this.getPhaseTimeSpan(this.activePhaseIndex);
                    var timesEl = document.getElementById('clr-phase-times');
                    if (timesEl) {
                        timesEl.textContent = '⏱ ' + currentSpan.startStr + ' – ' + currentSpan.endStr;
                    }

                    var boardBtn = document.getElementById('clr-phase-board-btn');
                    var boardText = document.getElementById('clr-phase-board-text');
                    if (boardBtn) {
                        if (phase.boardFile) {
                            boardBtn.style.display = 'inline-flex';
                            if (boardText) boardText.textContent = '[BOARD: ' + phase.boardFile.replace(/\.(js|json)$/i, '') + ']';
                            boardBtn.title = 'Open Board session: ' + phase.boardFile + (phase.boardNodeId ? (' (Focus: ' + phase.boardNodeId + ')') : '');
                            boardBtn.onclick = function () {
                                var bQuery = { file: phase.boardFile };
                                if (phase.boardNodeId) bQuery.focusNode = phase.boardNodeId;
                                if (window.Desktop && Desktop.isElectron() && typeof Desktop.openTool === 'function') {
                                    Desktop.openTool('board.html', { query: bQuery });
                                } else {
                                    window.open('board.html?file=' + encodeURIComponent(phase.boardFile) + (phase.boardNodeId ? ('&focusNode=' + encodeURIComponent(phase.boardNodeId)) : ''), '_blank');
                                }
                            };
                        } else {
                            boardBtn.style.display = 'none';
                        }
                    }

                    var tpEl = document.getElementById('clr-teacher-prompt');
                    if (tpEl) tpEl.textContent = phase.teacherAction || phase.objective || '—';

                    var spEl = document.getElementById('clr-student-prompt');
                    if (spEl) spEl.textContent = phase.studentAction || '—';

                    var teamsWrap = document.getElementById('clr-teams-wrap');
                    var teamsText = document.getElementById('clr-teams-text');
                    if (teamsWrap && teamsText) {
                        if (this.activePlan.teamConfig && this.activePlan.teamConfig.enabled) {
                            teamsWrap.style.display = 'inline-flex';
                            teamsText.textContent = 'Teams of ' + this.activePlan.teamConfig.teamSize;
                        } else {
                            teamsWrap.style.display = 'none';
                        }
                    }

                    // Render timeline schedule bar
                    var timelineEl = document.getElementById('clr-timeline-bar');
                    if (timelineEl) {
                        timelineEl.innerHTML = '';
                        var self = this;
                        phases.forEach(function (p, idx) {
                            var pSpan = self.getPhaseTimeSpan(idx);
                            var chip = document.createElement('div');
                            chip.className = 'clr-timeline-chip' + (idx === self.activePhaseIndex ? ' active' : '');
                            chip.title = (p.title || 'Phase') + ' (' + (p.duration || 0) + 'm)\n' + pSpan.startStr + ' – ' + pSpan.endStr + '\nT: ' + (p.teacherAction || p.objective || '—') + '\nS: ' + (p.studentAction || '—');
                            chip.innerHTML = (idx + 1) + '. ' + pSpan.startStr + '-' + pSpan.endStr + ' <span style="font-weight:400; opacity:0.85;">' + escapeHtml(p.title || 'Phase') + '</span>';
                            if (!PRESENTATION_MODE) {
                                chip.onclick = function () {
                                    self.activePhaseIndex = idx;
                                    self.renderCurrentPhase();
                                };
                            }
                            timelineEl.appendChild(chip);
                        });

                        if (!PRESENTATION_MODE) {
                            var activeChip = timelineEl.children[self.activePhaseIndex];
                            if (activeChip) {
                                activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                            }
                        }
                    }

                    // Auto-preset timer duration
                    var durMins = Number(phase.duration) || 5;
                    var minsInput = document.getElementById('overlay-timer-minutes');
                    var hrsInput = document.getElementById('overlay-timer-hours');
                    if (minsInput && hrsInput) {
                        hrsInput.value = 0;
                        minsInput.value = durMins;
                        if (typeof syncOverlaySettingsToPopup === 'function') syncOverlaySettingsToPopup();
                    }

                    // Broadcast to presentation window
                    if (_presChannel && !PRESENTATION_MODE) {
                        try {
                            const timelineEl = document.getElementById('clr-timeline-bar');
                            let timelineScrollLeft = null;
                            let timelineScrollRatio = null;
                            if (timelineEl && timelineEl.scrollWidth > timelineEl.clientWidth) {
                                const maxTimelineScroll = timelineEl.scrollWidth - timelineEl.clientWidth;
                                timelineScrollLeft = timelineEl.scrollLeft;
                                timelineScrollRatio = maxTimelineScroll > 0 ? (timelineEl.scrollLeft / maxTimelineScroll) : 0;
                            }
                            _presChannel.postMessage({
                                type: 'lesson-phase',
                                phaseIndex: this.activePhaseIndex,
                                totalPhases: phases.length,
                                title: phase.title || '',
                                duration: durMins,
                                startTimeStr: currentSpan.startStr,
                                endTimeStr: currentSpan.endStr,
                                studentPrompt: phase.studentAction || '',
                                activityType: phase.activityTypeId || '',
                                timelineScrollLeft: timelineScrollLeft != null ? Math.round(timelineScrollLeft) : null,
                                timelineScrollRatio: timelineScrollRatio
                            });
                        } catch (_) {}
                    }
                },

                nextPhase: function () {
                    if (!this.activePlan || !this.activePlan.sections) return;
                    if (this.activePhaseIndex < this.activePlan.sections.length - 1) {
                        this.activePhaseIndex++;
                        this.renderCurrentPhase();
                    } else {
                        if (typeof showToast === 'function') showToast('All lesson phases completed!');
                    }
                },

                prevPhase: function () {
                    if (!this.activePlan || !this.activePlan.sections) return;
                    if (this.activePhaseIndex > 0) {
                        this.activePhaseIndex--;
                        this.renderCurrentPhase();
                    }
                },

                completePhase: function () {
                    if (!this.activePlan || !this.activePlan.sections) return;
                    var phase = this.activePlan.sections[this.activePhaseIndex];
                    var sndPreset = (this.activePlan.soundAlert && this.activePlan.soundAlert.preset) || 'chime';
                    var sndVol = (this.activePlan.soundAlert && this.activePlan.soundAlert.volume) || 90;

                    if (typeof LessonCreatorService !== 'undefined' && LessonCreatorService.playPresetSound) {
                        LessonCreatorService.playPresetSound(sndPreset, sndVol);
                    }

                    var isLast = this.activePhaseIndex >= this.activePlan.sections.length - 1;
                    var nextTitle = !isLast ? this.activePlan.sections[this.activePhaseIndex + 1].title : '';

                    if (typeof showToast === 'function') {
                        showToast('Phase ' + (this.activePhaseIndex + 1) + ' completed!' + (nextTitle ? ' Ready for: ' + nextTitle : ''));
                    }

                    if (!isLast) {
                        this.nextPhase();
                    }
                },

                onTimerFinished: function () {
                    this.completePhase();
                }
            };

            // Listen for cross-window live plan execution broadcasts (no page reload)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    var _runnerCh = new BroadcastChannel('cms-lesson-runner');
                    _runnerCh.onmessage = function (e) {
                        if (e.data && e.data.action === 'load-plan' && e.data.planId) {
                            if (e.data.classId && typeof selectGroup === 'function' && selectedGroupName !== e.data.classId) {
                                if (typeof studentGroups !== 'undefined' && studentGroups[e.data.classId]) {
                                    selectGroup(e.data.classId);
                                }
                            }
                            CmsLessonRunner.loadPlanById(e.data.planId);
                        }
                    };

                    var _badgeCh = new BroadcastChannel('cmt-badgebanks');
                    _badgeCh.onmessage = function (e) {
                        if (e.data && e.data.type === 'badgebanks-updated') {
                            if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.clearCache === 'function') {
                                if (e.data.filename) {
                                    BadgeSets.clearCache(e.data.filename.replace(/\.(js|json)$/i, ''));
                                } else {
                                    BadgeSets.clearCache();
                                }
                            }
                            var modal = document.getElementById('edit-badges-modal');
                            if (modal && modal.style.display !== 'none' && typeof populateEditBadgesSetSelector === 'function') {
                                populateEditBadgesSetSelector();
                            }
                            if (typeof applyBadgeSetForClass === 'function' && typeof selectedGroupName !== 'undefined' && selectedGroupName) {
                                applyBadgeSetForClass(selectedGroupName).then(function () {
                                    if (typeof renderRoster === 'function') renderRoster();
                                });
                            }
                        }
                    };

                    var _modeCh = new BroadcastChannel('cmt-modebanks');
                    _modeCh.onmessage = function (e) {
                        if (e.data && e.data.type === 'modebanks-updated') {
                            if (typeof ModeSets !== 'undefined' && typeof ModeSets.clearCache === 'function') {
                                if (e.data.filename) {
                                    ModeSets.clearCache(e.data.filename.replace(/\.(js|json)$/i, ''));
                                } else {
                                    ModeSets.clearCache();
                                }
                            }
                            var modal = document.getElementById('mode-manager-modal');
                            if (modal && modal.style.display !== 'none' && typeof populateModeSetSelector === 'function') {
                                populateModeSetSelector();
                            }
                            if (typeof applyModeSetForClass === 'function' && typeof selectedGroupName !== 'undefined' && selectedGroupName) {
                                applyModeSetForClass(selectedGroupName).then(function () {
                                    if (typeof renderModeManagerList === 'function' && modal && modal.style.display !== 'none') {
                                        renderModeManagerList();
                                    }
                                });
                            }
                        }
                    };
                } catch (_) {}
            }

            // Initialize runner
            window.addEventListener('DOMContentLoaded', function () {
                setTimeout(function () { CmsLessonRunner.init(); }, 400);
            });
        })();
