        // Groups, roles, and settings are loaded from config.js at startup (see initApp below)
        let rawData = {};
        let rawMeta = {};
        let studentRoster = {}; // uuid → {uuid, firstName, lastName, dob, adminClass, sen}
        let plannerClasses = {}; // cfg.classes from planner-config.js keyed by class id
        let slotViewActive = true; // show planner slot buttons vs. plain group buttons
        let activeWeekdayTab = 'all'; // 'all', 'noslot', or '0'..'6'
        let groupSearchQuery = '';
        let weekdayTabInitialized = false;
        let collapseHeaderTimeout = null;

        const teamColors = [
            { name: "Red", hex: "#ffcccc", border: "#ff0000" },
            { name: "Blue", hex: "#cce5ff", border: "#0040ff" },
            { name: "Green", hex: "#ccffcc", border: "#008000" },
            { name: "Gold", hex: "#fff3cd", border: "#ffcc00" },
            { name: "Purple", hex: "#ebccff", border: "#8000ff" },
            { name: "Grey", hex: "#e0e0e0", border: "#757575" },
            { name: "Pink", hex: "#ffccf2", border: "#ff33cc" },
            { name: "Orange", hex: "#ffe5cc", border: "#ff8000" },
            { name: "Cyan", hex: "#ccffff", border: "#00cccc" },
            { name: "Brown", hex: "#d7ccc8", border: "#5d4037" }
        ];

        let studentGroups = {};
        let selectedGroupName = null;
        let selectedHalfGroup = null; // null = both halves, 'A' or 'B' = filtered half
        let selectedPlannerSlot = null; // { day, time, halfGroup } — set when a planner slot button is clicked
        let currentTeamsActive = false;
        let currentRequestedTeamCount = 0; // number of teams requested in the last createTeams call (mode='total')
        let teamPickStateByGroup = {};
        let rosterContextStudentId = null;
        let currentPlannerEntryId = '';
        let groupExamModes = {}; // { [groupName]: boolean }
        let _promptedExamSessionKeys = new Set(); // Prevent repeated prompts per class per day
        var _cmsCurrentAssociatedTest = null;
        var _cmsGradesChannel = null;

        const DEFAULT_TEAM_COLORS = teamColors.map(entry => ({ ...entry }));
        const EXTRA_TEAM_COLOR_PRESETS = [
            { hex: '#fde68a', border: '#d97706' },
            { hex: '#ddd6fe', border: '#7c3aed' },
            { hex: '#bfdbfe', border: '#2563eb' },
            { hex: '#fecdd3', border: '#e11d48' },
            { hex: '#bbf7d0', border: '#16a34a' },
            { hex: '#fed7aa', border: '#ea580c' }
        ];
        const CONFIG_FILE_TARGET = 'user';
        const CONFIG_FILE_NAME = 'config.js';
        const GROUPS_FILE_NAME = 'class-groups.js';
        const DEFAULT_BADGE_DEFINITIONS = [
            { icon: '+', label: 'Plus', tone: 'positive', meaning: 'Participation mark', coefficient: 1, inlineInRoster: true, strikeOnAward: true, scope: 'individual', hidden: false, isBuiltin: true },
            { icon: '-', label: 'Minus', tone: 'negative', meaning: 'Participation mark', coefficient: 1, inlineInRoster: true, strikeOnAward: true, scope: 'individual', hidden: false, isBuiltin: true },
            { icon: '💎', label: 'Diamond', tone: 'positive', meaning: 'Outstanding contribution', strikeOnAward: true, scope: 'individual', hidden: false },
            { icon: '👍', label: 'Good Job', tone: 'positive', meaning: 'Solid work and focus', scope: 'individual', hidden: false },
            { icon: '👏', label: 'Well Tried', tone: 'positive', meaning: 'Strong effort and perseverance', scope: 'individual', hidden: false },
            { icon: 'RV', label: 'RV', tone: 'negative', meaning: 'Renvoi', scope: 'individual', hidden: false },
            { icon: 'DNF', label: 'DNF', tone: 'negative', meaning: 'Devoir non fait', scope: 'individual', hidden: false },
            { icon: 'OM', label: 'OM', tone: 'negative', meaning: 'Oubli matériel', scope: 'individual', hidden: false },
            { icon: 'AT', label: 'AT', tone: 'negative', meaning: 'Arrivée tardive', scope: 'individual', hidden: false },
            { icon: '1️⃣', label: 'Level 1', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
            { icon: '2️⃣', label: 'Level 2', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
            { icon: '3️⃣', label: 'Level 3', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
            { icon: '4️⃣', label: 'Level 4', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
            { icon: '5️⃣', label: 'Level 5', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false },
            { icon: '6️⃣', label: 'Level 6', tone: 'positive', meaning: 'Progress marker', scope: 'individual', hidden: false }
        ];
        const SOUND_FILE_EXTENSIONS = []; // Empty list => show any file placed in user/custom-data/sounds
        const SOUND_FILE_ALIASES = Object.freeze({
            'bar-sounds.mp3': 'pub-sounds.mp3',
            'sounds/bar-sounds.mp3': 'sounds/pub-sounds.mp3'
        });
        const DEFAULT_SOUND_SETTINGS = {
            timerEnd: {
                mode: 'builtin',
                preset: 'beep',
                file: '',
                js: '',
                wave: 'triangle',
                volume: 100,
                iterations: 3,
                builder: [
                    { frequency: 659.25, rhythm: 'short' },
                    { frequency: 783.99, rhythm: 'short' },
                    { frequency: 1046.5, rhythm: 'medium' }
                ]
            },
            timerBackground: {
                mode: 'file',
                preset: 'none',
                file: '',
                js: '',
                wave: 'sine',
                volume: 100,
                iterations: 1,
                builder: [
                    { frequency: 261.63, rhythm: 'long' },
                    { frequency: 329.63, rhythm: 'long' }
                ]
            },
            drumroll: {
                mode: 'builtin',
                preset: 'classic',
                file: '',
                js: '',
                wave: 'sawtooth',
                volume: 100,
                iterations: 1,
                builder: [
                    { frequency: 180, rhythm: 'staccato' },
                    { frequency: 180, rhythm: 'staccato' },
                    { frequency: 220, rhythm: 'short' }
                ]
            },
            gavelAlarm: {
                mode: 'builtin',
                preset: 'gavel',
                file: '',
                js: '',
                wave: 'triangle',
                volume: 100,
                iterations: 1,
                builder: [
                    { frequency: 196, rhythm: 'short' },
                    { frequency: 146.83, rhythm: 'medium' }
                ]
            },
            scorePositive: {
                mode: 'builtin',
                preset: 'jingle',
                file: '',
                js: '',
                wave: 'sine',
                volume: 100,
                iterations: 1,
                builder: [
                    { frequency: 523.25, rhythm: 'short' },
                    { frequency: 659.25, rhythm: 'short' },
                    { frequency: 783.99, rhythm: 'medium' }
                ]
            },
            scoreNegative: {
                mode: 'builtin',
                preset: 'buzzer',
                file: '',
                js: '',
                wave: 'sawtooth',
                volume: 100,
                iterations: 1,
                builder: [
                    { frequency: 196, rhythm: 'medium' },
                    { frequency: 164.81, rhythm: 'medium' }
                ]
            }
        };
        let badgeDefinitions = DEFAULT_BADGE_DEFINITIONS.map(entry => ({ ...entry }));
        let badgeSetSettings = { defaultSetId: 'default', classSets: {} };
        let activeBadgeSetId = 'default';
        let modalEditingSetId = 'default';
        let soundSettings = JSON.parse(JSON.stringify(DEFAULT_SOUND_SETTINGS));
        const DEFAULT_PARTICIPATION_SETTINGS = {
            plusMinusCoefficient: 1,
            autoFlagLowParticipation: false,
            autoFlagBottomPercent: 25,
            autoFlagElements: { plus: true, minus: true, teamPlus: true, teamMinus: true, badges: true },
            autoFlagTimeline: { mode: 'all', weeks: 4, sinceDate: '' },
            flagRules: [
                { id: 'rule_default_1', name: 'Low Net Participation', color: 'red', metric: 'bottomPercent', operator: '<=', threshold: 25, pickWeight: 3.0, enabled: true }
            ]
        };
        let participationSettings = { ...DEFAULT_PARTICIPATION_SETTINGS };
        let availableSoundFiles = [];
        const DEFAULT_ACTION_BUTTON_SETTINGS = {
            custom: []
        };
        let actionButtonSettings = JSON.parse(JSON.stringify(DEFAULT_ACTION_BUTTON_SETTINGS));
        let planAbbrevLen = 3;                // Number of first-name letters shown in plan view cells
        let nameDisplayMode = 'full';         // 'full' | 'first' | 'last'
        let rosterSortOrder = 'first';        // 'first' | 'last'
        let lessonRunnerLayout = 'compact';   // 'compact' | 'collapsible' | 'single'
        let lessonRunnerCollapsed = false;
        let loadedConfigCache = null;
        let soundFileRefreshTimer = null;
        let classPlans = {};  // { groupName: [ {id, name, rows, cols, roomNumber, schedule, seats, isTemporary, isActive, createdAt} ] }
        let rosterPlanView = false;
        const NAME_SIZE_DEFAULT = 0.90;
        const NAME_SIZE_MIN = 0.55;
        const NAME_SIZE_MAX = 2.2;
        const NAME_SIZE_STEP = 0.10;
        let studentNameSizeRem = NAME_SIZE_DEFAULT;
        let presNameSizeRem = NAME_SIZE_DEFAULT;
        let soundFileRefreshInFlight = false;
        const SOUND_FILE_REFRESH_MS = 1500;

        // ── Presentation Mode ────────────────────────────────────────────────────
        const PRESENTATION_MODE = new URLSearchParams(window.location.search).get('presentation') === '1';
        const _presChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('cms-presentation') : null;
        let _presAnimEnabled = true; // controlled by presSettings.anim from main window
        let _presWindowOpen = false;
        let _presFrozen = false;

        function _updatePresWindowControls() {
            const el = document.getElementById('rsp-pres-controls');
            if (el) {
                el.style.display = _presWindowOpen ? 'flex' : 'none';
            }
            if (typeof ensurePresentationPopupMenu === 'function') {
                ensurePresentationPopupMenu();
            }
            const popup = document.getElementById('cms-pres-popup');
            if (popup) {
                popup.style.display = _presWindowOpen ? 'inline-flex' : 'none';
            }
            const toggleBtn = document.getElementById('ucm-pres-toggle-btn');
            const toggleLbl = document.getElementById('ucm-pres-toggle-label');
            if (toggleBtn) {
                toggleBtn.classList.toggle('is-open', !!_presWindowOpen);
            }
            if (toggleLbl) {
                toggleLbl.textContent = _presWindowOpen
                    ? (typeof t === 'function' && t('rsp_btn_close_pres') ? t('rsp_btn_close_pres') : 'Close')
                    : (typeof t === 'function' && t('rsp_btn_present') ? t('rsp_btn_present') : 'Present');
            }
            if (typeof updateUnifiedControlDock === 'function') {
                updateUnifiedControlDock();
            }
        }

        function toggleCmsPresentationFromHub() {
            if (_presWindowOpen) {
                cmsPresentationClose();
            } else {
                openCmsPresentation();
            }
        }

        function _broadcastPresentationState() {
            if (!_presChannel || PRESENTATION_MODE || _presFrozen) return;
            try {
                const _dn = document.getElementById('display-name');
                const runnerActive = !!(window.CmsLessonRunner && CmsLessonRunner.activePlan);
                const runnerPayload = runnerActive ? {
                    activePlan: JSON.parse(JSON.stringify(CmsLessonRunner.activePlan)),
                    activePhaseIndex: CmsLessonRunner.activePhaseIndex || 0,
                    lessonStartTime: CmsLessonRunner.lessonStartTime ? CmsLessonRunner.lessonStartTime.getTime() : null
                } : null;

                const docEl = document.documentElement;
                const scrollY = window.scrollY || docEl.scrollTop || 0;
                const maxScrollY = Math.max(1, (docEl.scrollHeight || document.body.scrollHeight) - window.innerHeight);
                const scrollRatio = maxScrollY > 0 ? (scrollY / maxScrollY) : 0;

                const rosterList = document.getElementById('roster-list');
                let rosterScrollRatio = null;
                let rosterScrollTop = null;
                if (rosterList && rosterList.scrollHeight > rosterList.clientHeight) {
                    const maxRosterScroll = rosterList.scrollHeight - rosterList.clientHeight;
                    rosterScrollTop = rosterList.scrollTop;
                    rosterScrollRatio = maxRosterScroll > 0 ? (rosterList.scrollTop / maxRosterScroll) : 0;
                }

                const timelineBar = document.getElementById('clr-timeline-bar');
                let timelineScrollRatio = null;
                let timelineScrollLeft = null;
                if (timelineBar && timelineBar.scrollWidth > timelineBar.clientWidth) {
                    const maxTimelineScroll = timelineBar.scrollWidth - timelineBar.clientWidth;
                    timelineScrollLeft = timelineBar.scrollLeft;
                    timelineScrollRatio = maxTimelineScroll > 0 ? (timelineBar.scrollLeft / maxTimelineScroll) : 0;
                }

                _presChannel.postMessage({
                    type: 'state',
                    groupName: selectedGroupName,
                    halfGroup: selectedHalfGroup,
                    studentGroups: JSON.parse(JSON.stringify(studentGroups)),
                    studentRoster: JSON.parse(JSON.stringify(studentRoster)),
                    rosterPlanView,
                    classPlans: JSON.parse(JSON.stringify(classPlans)),
                    currentTeamsActive,
                    displayName: _dn ? _dn.textContent : null,
                    displayNameBlinking: _dn ? _dn.classList.contains('blinking') : false,
                    displayNameColor: _dn ? (_dn.style.color || '') : '',
                    presSettings: { ...presSettings },
                    nameSizeRem: studentNameSizeRem,
                    presNameSizeRem: presNameSizeRem,
                    planAbbrevLen: planAbbrevLen,
                    nameDisplayMode: nameDisplayMode,
                    rosterSortOrder: rosterSortOrder,
                    lessonRunnerLayout: lessonRunnerLayout,
                    lessonRunnerCollapsed: lessonRunnerCollapsed,
                    lessonRunner: runnerPayload,
                    scroll: {
                        scrollY: Math.round(scrollY),
                        scrollRatio: scrollRatio,
                        rosterScrollTop: rosterScrollTop != null ? Math.round(rosterScrollTop) : null,
                        rosterScrollRatio: rosterScrollRatio,
                        timelineScrollLeft: timelineScrollLeft != null ? Math.round(timelineScrollLeft) : null,
                        timelineScrollRatio: timelineScrollRatio
                    },
                    timerActive: !!(timerEndTime || (timerPaused && timerPausedRemaining > 0) || stopwatchInterval || stopwatchPaused),
                    timerDisplayText: (() => { const d = document.getElementById('timer-active-display'); return d ? d.textContent : '--:--'; })(),
                    timerDisplayClass: (() => { const d = document.getElementById('timer-active-display'); return d ? d.className : ''; })(),
                    timerDisplayOpacity: (() => { const d = document.getElementById('timer-active-display'); return d ? (d.style.opacity || '') : ''; })(),
                    timerDisplayFontSize: (() => { const d = document.getElementById('timer-active-display'); return d ? (d.style.fontSize || '') : ''; })(),
                    overlayProgressWidth: (() => { const p = document.getElementById('timer-overlay-progress-bar'); return p ? p.style.width : ''; })(),
                    overlayProgressClass: (() => { const p = document.getElementById('timer-overlay-progress-bar'); return p ? p.className : ''; })(),
                    overlayBg: (() => { const o = document.getElementById('timer-overlay'); return o ? o.style.background : ''; })(),
                    modeTimerBg: (() => { const m = document.getElementById('mode-overlay-timer'); return m ? m.style.background : ''; })(),
                    modeTimerClass: (() => { const m = document.getElementById('mode-overlay-timer'); return m ? m.className : ''; })(),
                    modeProgressWidth: (() => { const p = document.getElementById('mode-overlay-progress-bar'); return p ? p.style.width : ''; })(),
                    modeProgressClass: (() => { const p = document.getElementById('mode-overlay-progress-bar'); return p ? p.className : ''; })(),
                    modeProgressVisible: (() => { const p = document.getElementById('mode-overlay-progress'); return p ? (p.style.display !== 'none') : false; })(),
                    isWarning: (() => { const d = document.getElementById('timer-active-display'); return !!((timerEndTime && (timerEndTime - Date.now()) < 60000) || (d && (d.classList.contains('warning') || d.classList.contains('timer-warning')))); })(),
                    intervalStepText: (() => { const m = typeof _getIntervalDisplayMeta === 'function' ? _getIntervalDisplayMeta() : null; return m ? m.stepText : ''; })(),
                    intervalNextText: (() => { const m = typeof _getIntervalDisplayMeta === 'function' ? _getIntervalDisplayMeta() : null; return m ? m.nextText : ''; })()
                });
            } catch (_) { }
        }

        let _scrollRafId = null;
        function _broadcastScrollState() {
            if (!_presChannel || PRESENTATION_MODE || _presFrozen) return;
            if (_scrollRafId) return;
            _scrollRafId = requestAnimationFrame(() => {
                _scrollRafId = null;
                try {
                    const docEl = document.documentElement;
                    const scrollY = window.scrollY || docEl.scrollTop || 0;
                    const maxScrollY = Math.max(1, (docEl.scrollHeight || document.body.scrollHeight) - window.innerHeight);
                    const scrollRatio = maxScrollY > 0 ? (scrollY / maxScrollY) : 0;

                    const rosterList = document.getElementById('roster-list');
                    let rosterScrollRatio = null;
                    let rosterScrollTop = null;
                    if (rosterList && rosterList.scrollHeight > rosterList.clientHeight) {
                        const maxRosterScroll = rosterList.scrollHeight - rosterList.clientHeight;
                        rosterScrollTop = rosterList.scrollTop;
                        rosterScrollRatio = maxRosterScroll > 0 ? (rosterList.scrollTop / maxRosterScroll) : 0;
                    }

                    const timelineBar = document.getElementById('clr-timeline-bar');
                    let timelineScrollRatio = null;
                    let timelineScrollLeft = null;
                    if (timelineBar && timelineBar.scrollWidth > timelineBar.clientWidth) {
                        const maxTimelineScroll = timelineBar.scrollWidth - timelineBar.clientWidth;
                        timelineScrollLeft = timelineBar.scrollLeft;
                        timelineScrollRatio = maxTimelineScroll > 0 ? (timelineBar.scrollLeft / maxTimelineScroll) : 0;
                    }

                    _presChannel.postMessage({
                        type: 'scroll',
                        scrollY: Math.round(scrollY),
                        scrollRatio: scrollRatio,
                        rosterScrollTop: rosterScrollTop != null ? Math.round(rosterScrollTop) : null,
                        rosterScrollRatio: rosterScrollRatio,
                        timelineScrollLeft: timelineScrollLeft != null ? Math.round(timelineScrollLeft) : null,
                        timelineScrollRatio: timelineScrollRatio
                    });
                } catch (_) { }
            });
        }

        function _broadcastAnimation(kind, payload = {}) {
            if (!_presChannel || PRESENTATION_MODE || _presFrozen) return;
            try { _presChannel.postMessage({ type: 'animation', kind, ...payload }); } catch (_) { }
        }

        function _broadcastTimerTick() {
            if (!_presChannel || PRESENTATION_MODE || _presFrozen) return;
            const display = document.getElementById('timer-active-display');
            const progressBar = document.getElementById('timer-overlay-progress-bar');
            const overlayEl = document.getElementById('timer-overlay');
            const modeTimer = document.getElementById('mode-overlay-timer');
            const isWarning = !!((timerEndTime && (timerEndTime - Date.now()) < 60000) || (display && (display.classList.contains('warning') || display.classList.contains('timer-warning'))));
            try {
                _presChannel.postMessage({
                    type: 'timer-tick',
                    timerActive: !!(timerEndTime || (timerPaused && timerPausedRemaining > 0) || stopwatchInterval || stopwatchPaused),
                    timerDisplayText: display ? display.textContent : '--:--',
                    timerDisplayClass: display ? display.className : '',
                    timerDisplayOpacity: display ? (display.style.opacity || '') : '',
                    timerDisplayFontSize: display ? (display.style.fontSize || '') : '',
                    overlayProgressWidth: progressBar ? progressBar.style.width : '',
                    overlayProgressClass: progressBar ? progressBar.className : '',
                    overlayView: typeof overlayCurrentView !== 'undefined' ? overlayCurrentView : 'timer',
                    overlayBg: overlayEl ? overlayEl.style.background : '',
                    modeTimerBg: modeTimer ? modeTimer.style.background : (overlayEl ? overlayEl.style.background : ''),
                    modeTimerClass: modeTimer ? modeTimer.className : '',
                    modeProgressWidth: (() => { const p = document.getElementById('mode-overlay-progress-bar'); return p ? p.style.width : (progressBar ? progressBar.style.width : ''); })(),
                    modeProgressClass: (() => { const p = document.getElementById('mode-overlay-progress-bar'); return p ? p.className : (progressBar ? progressBar.className : ''); })(),
                    modeProgressVisible: (() => { const p = document.getElementById('mode-overlay-progress'); return p ? (p.style.display !== 'none') : (timerMode !== 'stopwatch'); })(),
                    isWarning: isWarning,
                    intervalStepText: (() => { const m = typeof _getIntervalDisplayMeta === 'function' ? _getIntervalDisplayMeta() : null; return m ? m.stepText : ''; })(),
                    intervalNextText: (() => { const m = typeof _getIntervalDisplayMeta === 'function' ? _getIntervalDisplayMeta() : null; return m ? m.nextText : ''; })()
                });
            } catch (_) { }
        }

        let _activeBlinkStudentId = null;
        let _activeBlinkTime = 0;

        function triggerStudentPickBlink(studentId) {
            if (!studentId) return;
            _activeBlinkStudentId = studentId;
            _activeBlinkTime = Date.now();

            const applyBlink = () => {
                try {
                    const els = document.querySelectorAll(`[data-student-id="${studentId}"]`);
                    els.forEach(el => {
                        el.classList.remove('picked-blink');
                        void el.offsetWidth;
                        el.classList.add('picked-blink');
                    });
                } catch (_) { }
            };

            applyBlink();
            setTimeout(applyBlink, 40);
        }

        function highlightStudentManually(studentId) {
            if (!selectedGroupName || !studentGroups[selectedGroupName]) return;
            const student = studentGroups[selectedGroupName].find(s => s.id === studentId);
            if (!student) return;

            const dn = document.getElementById('display-name');
            if (dn) {
                dn.innerText = getDisplayName(student);
                dn.style.color = '';
                dn.classList.remove('blinking');
                void dn.offsetWidth;
                dn.classList.add('blinking');
                clearTimeout(dn._blinkTimeout);
                dn._blinkTimeout = setTimeout(() => {
                    dn.classList.remove('blinking');
                    dn.style.color = '';
                }, 4000);
            }

            _activeBlinkStudentId = student.id;
            _activeBlinkTime = Date.now();
            triggerStudentPickBlink(student.id);
            logHistory('pick', student.name, 'Highlighted manually', { studentId: student.id });

            if (!PRESENTATION_MODE) {
                _broadcastAnimation('pick-blink', { studentId: student.id });
                _broadcastPresentationState();
            }
        }

        function _applyPresentationState(data) {
            if (!data) return;
            if (data.type === 'animation') {
                if (data.kind === 'pick-blink') {
                    if (!_presAnimEnabled) return;
                    triggerStudentPickBlink(data.studentId);
                    return;
                }
                if (data.kind === 'mode-activate') { activateMode(data.mode, data.modeData || null); return; }
                if (data.kind === 'mode-close') { closeMode(); return; }
                if (data.kind === 'datetime-open') { openTimerFullscreen('clock'); return; }
                if (data.kind === 'datetime-close') { closeTimerFullscreen(); return; }
                if (data.kind === 'timer-fullscreen-open') {
                    openTimerFullscreen(data.view || 'timer');
                    if (data.theater !== undefined && data.theater !== overlayTheaterMode) toggleOverlayTheaterMode(false);
                    return;
                }
                if (data.kind === 'timer-fullscreen-close') { closeTimerFullscreen(); return; }
                if (data.kind === 'overlay-view-change') { if (typeof setOverlayView === 'function') setOverlayView(data.view, false); return; }
                if (data.kind === 'overlay-theater-toggle') { if (data.theater !== undefined && data.theater !== overlayTheaterMode) toggleOverlayTheaterMode(false); return; }
                if (!_presAnimEnabled) return;
                if (data.kind === 'score-flash') showScoreFlash(data.label, data.color);
                else if (data.kind === 'badge-flash') showBadgeFlash(data.icon);
                else if (data.kind === 'team-reveal') animateTeamReveal();
                return;
            }
            if (data.type === 'scroll') {
                if (_presFrozen) return;
                const docEl = document.documentElement;
                const maxScrollY = Math.max(0, (docEl.scrollHeight || document.body.scrollHeight) - window.innerHeight);
                if (data.scrollRatio !== undefined && maxScrollY > 0) {
                    window.scrollTo({ top: data.scrollRatio * maxScrollY, behavior: 'instant' });
                } else if (data.scrollY !== undefined) {
                    window.scrollTo({ top: data.scrollY, behavior: 'instant' });
                }

                if (data.rosterScrollRatio != null) {
                    const rosterList = document.getElementById('roster-list');
                    if (rosterList) {
                        const maxRoster = Math.max(0, rosterList.scrollHeight - rosterList.clientHeight);
                        rosterList.scrollTop = data.rosterScrollRatio * maxRoster;
                    }
                } else if (data.rosterScrollTop != null) {
                    const rosterList = document.getElementById('roster-list');
                    if (rosterList) rosterList.scrollTop = data.rosterScrollTop;
                }

                if (data.timelineScrollRatio != null) {
                    const timelineBar = document.getElementById('clr-timeline-bar');
                    if (timelineBar) {
                        const maxTimeline = Math.max(0, timelineBar.scrollWidth - timelineBar.clientWidth);
                        timelineBar.scrollLeft = data.timelineScrollRatio * maxTimeline;
                    }
                } else if (data.timelineScrollLeft != null) {
                    const timelineBar = document.getElementById('clr-timeline-bar');
                    if (timelineBar) timelineBar.scrollLeft = data.timelineScrollLeft;
                }
                return;
            }
            if (data.type === 'lesson-phase') {
                if (window.CmsLessonRunner && CmsLessonRunner.activePlan) {
                    CmsLessonRunner.activePhaseIndex = data.phaseIndex || 0;
                    CmsLessonRunner.renderCurrentPhase();
                }
                var presRunner = document.getElementById('cms-lesson-runner-container');
                if (presRunner) {
                    var showPlan = presSettings.lessonPlan !== false && !!(window.CmsLessonRunner && CmsLessonRunner.activePlan);
                    presRunner.style.display = showPlan ? '' : 'none';
                }
                if (data.timelineScrollRatio != null || data.timelineScrollLeft != null) {
                    requestAnimationFrame(() => {
                        const timelineBar = document.getElementById('clr-timeline-bar');
                        if (timelineBar) {
                            if (data.timelineScrollRatio != null) {
                                const maxTimeline = Math.max(0, timelineBar.scrollWidth - timelineBar.clientWidth);
                                timelineBar.scrollLeft = data.timelineScrollRatio * maxTimeline;
                            } else if (data.timelineScrollLeft != null) {
                                timelineBar.scrollLeft = data.timelineScrollLeft;
                            }
                        }
                    });
                }
                return;
            }
            if (data.type === 'timer-tick') {
                const area = document.getElementById('timer-active-area');
                const display = document.getElementById('timer-active-display');
                if (area) area.style.display = data.timerActive ? 'flex' : 'none';
                if (display) {
                    display.textContent = data.timerDisplayText;
                    display.className = data.timerDisplayClass || '';
                    if (data.isWarning) display.classList.add('warning');
                    display.style.opacity = data.timerDisplayOpacity || '';
                    if (data.timerDisplayFontSize !== undefined) display.style.fontSize = data.timerDisplayFontSize;
                }
                // Keep timer text and warning/colour states live inside the mode overlay
                const modeTimer = document.getElementById('mode-overlay-timer');
                if (modeTimer) {
                    modeTimer.textContent = data.timerDisplayText;
                    if (data.modeTimerClass) {
                        modeTimer.className = data.modeTimerClass;
                    } else if (data.isWarning !== undefined) {
                        modeTimer.classList.toggle('warning', !!data.isWarning);
                    }
                    if (data.modeTimerBg) {
                        modeTimer.style.background = data.modeTimerBg;
                    } else if (data.overlayBg) {
                        modeTimer.style.background = data.overlayBg;
                    }
                }
                // Keep mode overlay progress bar live
                let modeProgressBar = document.getElementById('mode-overlay-progress-bar');
                let modeProgressWrap = document.getElementById('mode-overlay-progress');
                if (modeTimer && !modeProgressWrap && data.modeProgressVisible !== false) {
                    modeTimer.insertAdjacentHTML('afterend', `
                        <div id="mode-overlay-progress" class="mode-overlay-progress">
                            <div id="mode-overlay-progress-bar" class="mode-overlay-progress-bar"></div>
                        </div>
                    `);
                    modeProgressBar = document.getElementById('mode-overlay-progress-bar');
                    modeProgressWrap = document.getElementById('mode-overlay-progress');
                }
                if (modeProgressWrap && data.modeProgressVisible !== undefined) {
                    modeProgressWrap.style.display = data.modeProgressVisible ? '' : 'none';
                }
                if (modeProgressBar) {
                    const widthVal = data.modeProgressWidth || data.overlayProgressWidth;
                    if (widthVal) modeProgressBar.style.width = widthVal;
                    const classVal = data.modeProgressClass !== undefined ? data.modeProgressClass : data.overlayProgressClass;
                    if (classVal !== undefined) modeProgressBar.className = 'mode-overlay-progress-bar ' + classVal;
                }
                // Keep fullscreen timer overlay display, progress bar, and colour live
                const overlayDisplay = document.getElementById('timer-overlay-display');
                if (overlayDisplay && data.timerDisplayText && overlayCurrentView !== 'clock') overlayDisplay.textContent = data.timerDisplayText;
                const overlayBar = document.getElementById('timer-overlay-progress-bar');
                if (overlayBar) {
                    if (data.overlayProgressWidth) overlayBar.style.width = data.overlayProgressWidth;
                    if (data.overlayProgressClass !== undefined) overlayBar.className = data.overlayProgressClass;
                }
                if (data.overlayView && typeof setOverlayView === 'function' && overlayCurrentView !== data.overlayView) {
                    setOverlayView(data.overlayView, false);
                }
                if (typeof _applyIntervalBadges === 'function') {
                    _applyIntervalBadges(data.intervalStepText || '', data.intervalNextText || '');
                }
                return;
            }
            if (data.type !== 'state') return;
            if (data.presSettings) {
                _presAnimEnabled = data.presSettings.anim !== false;
                document.body.classList.toggle('pres-show-autoflag', !!data.presSettings.autoflag);
                document.body.classList.toggle('pres-show-badges', !!data.presSettings.badges);
                document.body.classList.toggle('pres-show-roles', !!data.presSettings.roles);
                document.body.classList.toggle('pres-show-sen', !!data.presSettings.sen);
                presSettings = { ...presSettings, ...data.presSettings };
            }
            if (data.lessonRunnerLayout && ['compact', 'collapsible', 'single'].includes(data.lessonRunnerLayout)) {
                lessonRunnerLayout = data.lessonRunnerLayout;
                if (typeof data.lessonRunnerCollapsed === 'boolean') lessonRunnerCollapsed = data.lessonRunnerCollapsed;
            }
            if (data.lessonRunner !== undefined) {
                if (data.lessonRunner && data.lessonRunner.activePlan && window.CmsLessonRunner) {
                    CmsLessonRunner.activePlan = data.lessonRunner.activePlan;
                    CmsLessonRunner.activePhaseIndex = data.lessonRunner.activePhaseIndex || 0;
                    if (data.lessonRunner.lessonStartTime) {
                        CmsLessonRunner.lessonStartTime = new Date(data.lessonRunner.lessonStartTime);
                    }
                    CmsLessonRunner.renderCurrentPhase();
                } else if (window.CmsLessonRunner && !data.lessonRunner) {
                    CmsLessonRunner.activePlan = null;
                }
            }
            var presRunner = document.getElementById('cms-lesson-runner-container');
            if (presRunner) {
                var showPlan = presSettings.lessonPlan !== false && !!(window.CmsLessonRunner && CmsLessonRunner.activePlan);
                presRunner.classList.remove('cms-lr-mode-compact', 'cms-lr-mode-collapsible', 'cms-lr-mode-single');
                presRunner.classList.add('cms-lr-mode-' + lessonRunnerLayout);
                presRunner.classList.toggle('is-collapsed', !!lessonRunnerCollapsed);
                presRunner.style.display = showPlan ? '' : 'none';
            }
            if (data.studentGroups) {
                try { Object.assign(studentGroups, JSON.parse(JSON.stringify(data.studentGroups))); } catch (_) { }
            }
            if (data.studentRoster) {
                try { Object.assign(studentRoster, JSON.parse(JSON.stringify(data.studentRoster))); } catch (_) { }
            }
            if (data.groupName !== undefined) selectedGroupName = data.groupName;
            if (data.halfGroup !== undefined) selectedHalfGroup = data.halfGroup;
            if (typeof _updateClassBtnLabel === 'function') _updateClassBtnLabel();
            if (typeof renderGroupButtons === 'function') {
                try { renderGroupButtons(); } catch (_) { }
            }
            if (data.presSettings !== undefined) rosterPlanView = !!data.presSettings?.plan;
            if (data.classPlans) {
                try { classPlans = JSON.parse(JSON.stringify(data.classPlans)); } catch (_) { }
            }
            if (data.currentTeamsActive !== undefined) currentTeamsActive = data.currentTeamsActive;
            if (data.nameSizeRem !== undefined) { studentNameSizeRem = data.nameSizeRem; applyNameSize(); }
            if (data.presNameSizeRem !== undefined) { presNameSizeRem = data.presNameSizeRem; applyPresNameSize(); }
            if (data.planAbbrevLen !== undefined) { planAbbrevLen = data.planAbbrevLen; }
            if (data.nameDisplayMode !== undefined && ['full', 'first', 'last', 'custom'].includes(data.nameDisplayMode)) { nameDisplayMode = data.nameDisplayMode; }
            if (data.rosterSortOrder !== undefined && ['first', 'last'].includes(data.rosterSortOrder)) { rosterSortOrder = data.rosterSortOrder; }
            const dn = document.getElementById('display-name');
            if (dn) {
                const _resolvedGrpName = (rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name) ? rawMeta[selectedGroupName].name : (selectedGroupName || '--');
                dn.textContent = (data.displayName != null) ? data.displayName : _resolvedGrpName;
                dn.style.color = data.displayNameColor || '';
                if (data.displayNameBlinking) {
                    dn.classList.remove('blinking');
                    void dn.offsetWidth;
                    dn.classList.add('blinking');
                    clearTimeout(dn._blinkTimeout);
                    dn._blinkTimeout = setTimeout(() => { dn.classList.remove('blinking'); dn.style.color = ''; }, 4000);
                } else {
                    dn.classList.remove('blinking');
                }
            }
            if (data.timerActive !== undefined) {
                const area = document.getElementById('timer-active-area');
                const display = document.getElementById('timer-active-display');
                if (area) area.style.display = data.timerActive ? 'flex' : 'none';
                if (display && data.timerDisplayText !== undefined) {
                    display.textContent = data.timerDisplayText;
                    display.className = data.timerDisplayClass || '';
                    if (data.isWarning) display.classList.add('warning');
                    display.style.opacity = data.timerDisplayOpacity || '';
                    if (data.timerDisplayFontSize !== undefined) display.style.fontSize = data.timerDisplayFontSize;
                }
                const modeTimer = document.getElementById('mode-overlay-timer');
                if (modeTimer) {
                    if (data.timerDisplayText !== undefined) modeTimer.textContent = data.timerDisplayText;
                    if (data.modeTimerClass) modeTimer.className = data.modeTimerClass;
                    else if (data.isWarning !== undefined) modeTimer.classList.toggle('warning', !!data.isWarning);
                    if (data.modeTimerBg) modeTimer.style.background = data.modeTimerBg;
                    else if (data.overlayBg) modeTimer.style.background = data.overlayBg;

                    let modeProgressBar = document.getElementById('mode-overlay-progress-bar');
                    let modeProgressWrap = document.getElementById('mode-overlay-progress');
                    if (!modeProgressWrap && data.modeProgressVisible !== false) {
                        modeTimer.insertAdjacentHTML('afterend', `
                            <div id="mode-overlay-progress" class="mode-overlay-progress">
                                <div id="mode-overlay-progress-bar" class="mode-overlay-progress-bar"></div>
                            </div>
                        `);
                        modeProgressBar = document.getElementById('mode-overlay-progress-bar');
                        modeProgressWrap = document.getElementById('mode-overlay-progress');
                    }
                    if (modeProgressWrap && data.modeProgressVisible !== undefined) {
                        modeProgressWrap.style.display = data.modeProgressVisible ? '' : 'none';
                    }
                    if (modeProgressBar) {
                        const widthVal = data.modeProgressWidth || data.overlayProgressWidth;
                        if (widthVal) modeProgressBar.style.width = widthVal;
                        const classVal = data.modeProgressClass !== undefined ? data.modeProgressClass : data.overlayProgressClass;
                        if (classVal !== undefined) modeProgressBar.className = 'mode-overlay-progress-bar ' + classVal;
                    }
                }
                const overlayDisplay = document.getElementById('timer-overlay-display');
                if (overlayDisplay && data.timerDisplayText !== undefined) overlayDisplay.textContent = data.timerDisplayText;
                const overlayBar = document.getElementById('timer-overlay-progress-bar');
                if (overlayBar && data.overlayProgressWidth) overlayBar.style.width = data.overlayProgressWidth;
                const overlayEl = document.getElementById('timer-overlay');
                if (overlayEl && data.overlayBg) overlayEl.style.background = data.overlayBg;
                if (typeof _applyIntervalBadges === 'function') {
                    _applyIntervalBadges(data.intervalStepText || '', data.intervalNextText || '');
                }
            }
            if (data.scroll) {
                requestAnimationFrame(() => {
                    const docEl = document.documentElement;
                    const maxScrollY = Math.max(0, (docEl.scrollHeight || document.body.scrollHeight) - window.innerHeight);
                    if (data.scroll.scrollRatio !== undefined && maxScrollY > 0) {
                        window.scrollTo({ top: data.scroll.scrollRatio * maxScrollY, behavior: 'instant' });
                    } else if (data.scroll.scrollY !== undefined) {
                        window.scrollTo({ top: data.scroll.scrollY, behavior: 'instant' });
                    }

                    if (data.scroll.rosterScrollRatio != null) {
                        const rosterList = document.getElementById('roster-list');
                        if (rosterList) {
                            const maxRoster = Math.max(0, rosterList.scrollHeight - rosterList.clientHeight);
                            rosterList.scrollTop = data.scroll.rosterScrollRatio * maxRoster;
                        }
                    } else if (data.scroll.rosterScrollTop != null) {
                        const rosterList = document.getElementById('roster-list');
                        if (rosterList) rosterList.scrollTop = data.scroll.rosterScrollTop;
                    }

                    if (data.scroll.timelineScrollRatio != null) {
                        const timelineBar = document.getElementById('clr-timeline-bar');
                        if (timelineBar) {
                            const maxTimeline = Math.max(0, timelineBar.scrollWidth - timelineBar.clientWidth);
                            timelineBar.scrollLeft = data.scroll.timelineScrollRatio * maxTimeline;
                        }
                    } else if (data.scroll.timelineScrollLeft != null) {
                        const timelineBar = document.getElementById('clr-timeline-bar');
                        if (timelineBar) timelineBar.scrollLeft = data.scroll.timelineScrollLeft;
                    }
                });
            }
            renderRoster();
        }

        // ── Presentation layout helpers ───────────────────────────────────────────
        function _presAdjustPlanViewHeight() {
            if (!PRESENTATION_MODE || !rosterPlanView) return;
            const listEl = document.getElementById('roster-list');
            if (!listEl || !listEl.classList.contains('roster-plan-view')) return;
            const panelEl = listEl.closest('.roster-panel');
            const headerEl = panelEl ? panelEl.querySelector('.roster-panel-header') : null;
            if (!panelEl || !headerEl) return;
            // Use getBoundingClientRect so the measurement doesn't depend on the
            // list's own height (avoids the feedback loop where panel.clientHeight
            // includes panel padding + list height, causing drift on every render).
            const headerRect = headerEl.getBoundingClientRect();
            const panelPadBot = parseFloat(getComputedStyle(panelEl).paddingBottom) || 0;
            const available = window.innerHeight - headerRect.bottom - panelPadBot;
            if (available > 10) {
                listEl.style.height = available + 'px';
                listEl.style.gridAutoRows = '1fr';
            }
        }

        function _presAdjustRosterColumns() {
            if (!PRESENTATION_MODE || rosterPlanView) return;
            const listEl = document.getElementById('roster-list');
            if (!listEl) return;
            listEl.style.columns = '1';
            requestAnimationFrame(() => {
                const panelEl = listEl.closest('.roster-panel');
                if (panelEl && listEl.scrollHeight > panelEl.clientHeight) {
                    listEl.style.columns = '';   // revert to CSS default (2 columns)
                }
            });
        }

        async function openCmsPresentation() {
            closeRosterSettingsPopup();
            _presWindowOpen = true;
            _presAlwaysOnTop = false;
            syncPresentationPinButtons();
            _updatePresWindowControls();
            let cardCfg = {};
            try { cardCfg = JSON.parse(localStorage.getItem('cmt-card-config-classManagement') || localStorage.getItem('cmt-card-config-class-management') || '{}'); } catch (_) {}
            if (window.Desktop && typeof Desktop.openCmsPresentation === 'function') {
                const result = await Desktop.openCmsPresentation({ cardConfig: cardCfg });
                if (result && result.ok) {
                    _presWindowOpen = true;
                    _updatePresWindowControls();
                }
            } else {
                const sizeNum = Number(cardCfg.presWindowSize || cardCfg.presSize);
                const ratio = (!isNaN(sizeNum) && sizeNum >= 10 && sizeNum <= 100) ? (sizeNum / 100) : 0.8;
                const sw = (window.screen && window.screen.availWidth) || 1200;
                const sh = (window.screen && window.screen.availHeight) || 800;
                const w = Math.max(420, Math.round(sw * ratio));
                const h = Math.max(300, Math.round(sh * ratio));
                window.open(location.pathname + '?presentation=1', '_blank',
                    'width=' + w + ',height=' + h + ',menubar=no,toolbar=no,location=no');
            }
        }

        (function initCmsSecondScreenPrompt() {
            if (location.search.includes('presentation=1')) return;
            function showSecondScreenBanner(onStartPresentation) {
                if (document.getElementById('second-screen-prompt-banner')) return;
                const promptMsg = typeof window.t === 'function' ? window.t('secondDisplayPrompt') : 'Second display detected! Would you like to launch Presentation Mode on monitor 2?';
                const startBtnTxt = typeof window.t === 'function' ? window.t('btnStartPresentation') : 'Start Presentation Mode';
                const dismissBtnTxt = typeof window.t === 'function' ? window.t('btnDismissPrompt') : 'Dismiss';
                const banner = document.createElement('div');
                banner.id = 'second-screen-prompt-banner';
                banner.style.cssText = 'position:fixed;top:16px;right:20px;z-index:99999;display:flex;align-items:center;gap:12px;padding:10px 16px;border:1px solid rgba(74,144,217,0.4);border-radius:12px;background:#121826;box-shadow:0 8px 24px rgba(0,0,0,0.35);color:#fff;font-family:inherit;font-size:0.86rem;line-height:1.3;animation:slideDownPrompt 0.3s ease-out;';
                if (!document.getElementById('second-screen-banner-styles')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'second-screen-banner-styles';
                    styleEl.textContent = '@keyframes slideDownPrompt { from { transform: translateY(-20px); opacity:0; } to { transform: translateY(0); opacity:1; } }';
                    document.head.appendChild(styleEl);
                }
                banner.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.2rem;"></span><span>' + promptMsg + '</span></div>'
                    + '<div style="display:flex;align-items:center;gap:8px;margin-left:8px;">'
                    + '<button type="button" id="btn-start-second-pres" style="padding:6px 12px;border:none;border-radius:8px;background:linear-gradient(135deg, #28a745, #208637);color:#fff;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:0 2px 8px rgba(40,167,69,0.3);transition:transform 0.1s, background 0.15s;">' + startBtnTxt + '</button>'
                    + '<button type="button" id="btn-dismiss-second-pres" style="padding:6px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:#ccc;font-weight:600;font-size:0.8rem;cursor:pointer;transition:background 0.15s;">' + dismissBtnTxt + '</button>'
                    + '</div>';
                document.body.appendChild(banner);
                banner.querySelector('#btn-start-second-pres').onclick = function () {
                    banner.remove();
                    onStartPresentation();
                };
                banner.querySelector('#btn-dismiss-second-pres').onclick = function () {
                    sessionStorage.setItem('dismissed_second_screen_prompt', '1');
                    banner.remove();
                };
            }

            async function checkAndPrompt() {
                if (typeof _presWindowOpen !== 'undefined' && _presWindowOpen) return;
                if (sessionStorage.getItem('dismissed_second_screen_prompt')) return;
                let hasSecond = false;
                if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.hasSecondDisplay === 'function') {
                    hasSecond = await window.Desktop.hasSecondDisplay();
                } else if ('isExtended' in window.screen) {
                    hasSecond = !!window.screen.isExtended;
                }
                if (hasSecond) {
                    showSecondScreenBanner(function () {
                        if (typeof openCmsPresentation === 'function') openCmsPresentation();
                    });
                }
            }

            setTimeout(checkAndPrompt, 1500);
            if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.onDisplayChanged === 'function') {
                window.Desktop.onDisplayChanged(function (data) {
                    if (data && data.hasSecond) {
                        checkAndPrompt();
                    } else {
                        const existing = document.getElementById('second-screen-prompt-banner');
                        if (existing) existing.remove();
                    }
                });
            }
        })();

        async function cmsPresentationClose() {
            closeRosterSettingsPopup();
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('close');
            }
            _presWindowOpen = false;
            _presAlwaysOnTop = false;
            syncPresentationPinButtons();
            _updatePresWindowControls();
        }

        async function cmsPresentationFullscreen() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('fullscreen');
            }
        }

        async function cmsPresentationMaximize() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('maximize');
            }
        }

        async function cmsPresentationMinimize() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('minimize');
            }
        }

        async function cmsPresentationDockRight() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('dock-right');
            }
        }

        async function cmsPresentationDockLeft() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('dock-left');
            }
        }

        async function cmsPresentationResizeWindow() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('resize-window');
            }
        }

        async function cmsPresentationDefaultSize() {
            if (window.Desktop && typeof Desktop.cmsPresentationCommand === 'function') {
                await Desktop.cmsPresentationCommand('default-size');
            }
        }

        function syncPresentationFreezeButtons() {
            const btn = document.getElementById('rsp-pres-freeze-btn');
            if (btn) {
                btn.innerHTML = _presFrozen ? '<img src="../assets/icons/snowflake.svg" class="btn-icon" alt="" /> Frozen' : '<img src="../assets/icons/snowflake.svg" class="btn-icon" alt="" /> Freeze';
                btn.style.background = _presFrozen ? '#4a90d9' : '';
                btn.style.color = _presFrozen ? '#fff' : '';
            }
            const label = _presFrozen ? (t('pres_unfreeze_title') || t('pres_unfreeze')) : (t('pres_freeze_title') || t('pres_freeze'));
            document.querySelectorAll('[data-pres-action="freeze"]').forEach(popupBtn => {
                popupBtn.title = label;
                popupBtn.setAttribute('data-tooltip', label);
                popupBtn.setAttribute('aria-label', label);
                popupBtn.classList.toggle('is-frozen', !!_presFrozen);
            });
        }

        let _presAlwaysOnTop = false;

        function syncPresentationPinButtons() {
            const label = _presAlwaysOnTop
                ? (t('pres_unpin_title') || 'Disable always on top for presentation window')
                : (t('pres_pin_title') || 'Keep presentation window always on top');
            document.querySelectorAll('[data-pres-action="pin"]').forEach(popupBtn => {
                popupBtn.title = label;
                popupBtn.setAttribute('data-tooltip', label);
                popupBtn.setAttribute('aria-label', label);
                popupBtn.classList.toggle('is-pinned', !!_presAlwaysOnTop);
            });
        }

        async function toggleAlwaysOnTopPresentation() {
            if (window.Desktop && window.Desktop.isElectron() && typeof window.Desktop.cmsPresentationCommand === 'function') {
                const res = await window.Desktop.cmsPresentationCommand('toggle-always-on-top');
                if (res && typeof res.alwaysOnTop === 'boolean') {
                    _presAlwaysOnTop = res.alwaysOnTop;
                } else {
                    _presAlwaysOnTop = !_presAlwaysOnTop;
                }
            } else {
                _presAlwaysOnTop = !_presAlwaysOnTop;
                if (typeof showToast === 'function') {
                    showToast(t('pres_pin_web_notice') || 'Always on top is only available in the desktop application', true);
                }
            }
            syncPresentationPinButtons();
            if (_presChannel) {
                try { _presChannel.postMessage({ type: 'pres-pin-state', on: _presAlwaysOnTop }); } catch (_) { }
            }
        }

        if (!PRESENTATION_MODE) {
            document.addEventListener('click', function (ev) {
                const btn = ev.target && ev.target.closest ? ev.target.closest('#cms-pres-popup [data-pres-action="reorder-windows"]') : null;
                if (!btn) return;
                ev.preventDefault();
                ev.stopPropagation();
                if (window.WindowHelper && typeof window.WindowHelper.open === 'function') {
                    window.WindowHelper.open();
                }
            });
            if (window.Desktop && typeof window.Desktop.onWindowsChanged === 'function') {
                const _unsubCmsWin = window.Desktop.onWindowsChanged(function (snapshot) {
                    if (!snapshot || !Array.isArray(snapshot.windows)) return;
                    const presWin = snapshot.windows.find(function (w) {
                        return w && w.role === 'mirror' && w.pageFile === 'class-management.html';
                    });
                    if (presWin) {
                        if (!_presWindowOpen) {
                            _presWindowOpen = true;
                            if (typeof _updatePresWindowControls === 'function') _updatePresWindowControls();
                        }
                        if (_presAlwaysOnTop !== !!presWin.isAlwaysOnTop) {
                            _presAlwaysOnTop = !!presWin.isAlwaysOnTop;
                            syncPresentationPinButtons();
                        }
                    } else if (_presWindowOpen) {
                        _presWindowOpen = false;
                        _presAlwaysOnTop = false;
                        syncPresentationPinButtons();
                        if (typeof _updatePresWindowControls === 'function') _updatePresWindowControls();
                    }
                });
                window.addEventListener('beforeunload', function () {
                    try { _unsubCmsWin(); } catch (_) {}
                });
            }
        }

        let _unifiedDockPos = null;
        let _unifiedDockCollapsed = false;

        function isWidgetVisible(el) {
            if (!el || !document.body.contains(el)) return false;
            if (el.style.display === 'none') return false;
            if (typeof window !== 'undefined' && window.getComputedStyle) {
                try {
                    const cs = window.getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                } catch (_) {}
            }
            return true;
        }

        function syncUnifiedDockBottomClearance(allowAutoScroll) {
            if (PRESENTATION_MODE) return;
            const dock = document.getElementById('cms-unified-dock');
            if (!dock || !isWidgetVisible(dock)) {
                document.body.style.setProperty('--ucm-dock-clearance', '0px');
                return;
            }
            const dockRect = dock.getBoundingClientRect();
            const nearBottom = (!dock.style.top) || (dockRect.bottom >= window.innerHeight - 140);
            const clearancePx = nearBottom ? Math.max(0, Math.ceil(window.innerHeight - dockRect.top + 12)) : 0;
            document.body.style.setProperty('--ucm-dock-clearance', clearancePx + 'px');

            if (allowAutoScroll && clearancePx > 0) {
                const pickWrap = document.getElementById('drumroll-and-pick');
                if (pickWrap && isWidgetVisible(pickWrap)) {
                    const pickRect = pickWrap.getBoundingClientRect();
                    const overlapsHoriz = pickRect.right > dockRect.left - 4 && pickRect.left < dockRect.right + 4;
                    const overlapsVert = pickRect.bottom > dockRect.top - 4 && pickRect.top < dockRect.bottom + 4;
                    if (overlapsHoriz && overlapsVert) {
                        const delta = Math.ceil(pickRect.bottom - dockRect.top + 14);
                        if (delta > 0) {
                            window.scrollBy({ top: delta, behavior: 'smooth' });
                        }
                    }
                }
            }
        }

        function toggleUnifiedDockCollapse(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            _unifiedDockCollapsed = !_unifiedDockCollapsed;
            const dock = document.getElementById('cms-unified-dock');
            if (dock) {
                dock.classList.toggle('is-collapsed', _unifiedDockCollapsed);
            }
            const collapseBtn = document.getElementById('ucm-dock-collapse-btn');
            const collapseIcon = document.getElementById('ucm-dock-collapse-icon');
            if (collapseIcon) {
                collapseIcon.src = _unifiedDockCollapsed
                    ? '../assets/icons/maximize.svg'
                    : '../assets/icons/minimize.svg';
            }
            if (collapseBtn && typeof t === 'function') {
                collapseBtn.title = _unifiedDockCollapsed
                    ? t('ucm_dock_expand_title')
                    : t('ucm_dock_collapse_title');
            }
            updateUnifiedControlDock();
        }

        function clampUnifiedDockToViewport() {
            const dock = document.getElementById('cms-unified-dock');
            if (!dock || !isWidgetVisible(dock)) {
                syncUnifiedDockBottomClearance(false);
                return;
            }
            if (window.innerWidth <= 720) {
                dock.style.left = '';
                dock.style.top = '';
                dock.style.right = '';
                dock.style.bottom = '';
                syncUnifiedDockBottomClearance(false);
                return;
            }
            if (!dock.style.left && !dock.style.top) {
                syncUnifiedDockBottomClearance(false);
                return;
            }
            const rect = dock.getBoundingClientRect();
            const pad = 8;
            const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
            const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);
            const newLeft = Math.min(maxLeft, Math.max(pad, rect.left));
            const newTop = Math.min(maxTop, Math.max(pad, rect.top));
            dock.style.left = newLeft + 'px';
            dock.style.top = newTop + 'px';
            dock.style.right = 'auto';
            dock.style.bottom = 'auto';
            _unifiedDockPos = { left: newLeft, top: newTop };
            syncUnifiedDockBottomClearance(false);
        }

        function initUnifiedControlDock() {
            const dock = document.getElementById('cms-unified-dock');
            if (!dock || dock._dragInitialized) return;
            dock._dragInitialized = true;

            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            let startX = 0, startY = 0;
            let hasDragged = false;
            let dockDragRaf = null;

            dock.addEventListener('mousedown', dragMouseDown);
            dock.addEventListener('touchstart', dragMouseDown, { passive: false });

            function dragMouseDown(e) {
                if (window.innerWidth <= 720) return;
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('input') || e.target.closest('#mode-minimized-pill') || e.target.closest('#timer-minimized-pill') || e.target.closest('#ucm-dock-timer-readout')) return;
                e = e || window.event;
                hasDragged = false;
                if (e.type === 'touchstart') {
                    pos3 = e.touches[0].clientX;
                    pos4 = e.touches[0].clientY;
                } else {
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                }
                startX = pos3;
                startY = pos4;

                document.addEventListener('mouseup', closeDragElement);
                document.addEventListener('mousemove', elementDrag);
                document.addEventListener('touchend', closeDragElement);
                document.addEventListener('touchmove', elementDrag, { passive: false });
            }

            function elementDrag(e) {
                e = e || window.event;
                let clientX, clientY;
                if (e.type === 'touchmove') {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                if (!hasDragged) {
                    if (Math.hypot(clientX - startX, clientY - startY) < 4) {
                        return;
                    }
                    hasDragged = true;
                    dock.classList.add('is-dragging');
                    dock.classList.add('is-custom-pos');
                    dock.style.transition = 'none';
                    if (!dock.style.left) {
                        const rect = dock.getBoundingClientRect();
                        dock.style.left = rect.left + 'px';
                        dock.style.top = rect.top + 'px';
                        dock.style.right = 'auto';
                        dock.style.bottom = 'auto';
                        dock.style.transform = 'none';
                    }
                }

                if (e.type !== 'touchstart' && e.cancelable) {
                    e.preventDefault();
                }

                pos1 = pos3 - clientX;
                pos2 = pos4 - clientY;
                pos3 = clientX;
                pos4 = clientY;

                if (dockDragRaf) cancelAnimationFrame(dockDragRaf);
                dockDragRaf = requestAnimationFrame(() => {
                    const rect = dock.getBoundingClientRect();
                    let newTop = dock.offsetTop - pos2;
                    let newLeft = dock.offsetLeft - pos1;
                    const pad = 8;
                    const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
                    const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);
                    newLeft = Math.min(maxLeft, Math.max(pad, newLeft));
                    newTop = Math.min(maxTop, Math.max(pad, newTop));
                    dock.style.top = newTop + 'px';
                    dock.style.left = newLeft + 'px';
                    dock.style.right = 'auto';
                    dock.style.bottom = 'auto';
                    _unifiedDockPos = { left: newLeft, top: newTop };
                });
            }

            function closeDragElement() {
                document.removeEventListener('mouseup', closeDragElement);
                document.removeEventListener('mousemove', elementDrag);
                document.removeEventListener('touchend', closeDragElement);
                document.removeEventListener('touchmove', elementDrag);
                dock.classList.remove('is-dragging');
                dock.style.transition = '';
                if (dockDragRaf) {
                    cancelAnimationFrame(dockDragRaf);
                    dockDragRaf = null;
                }
                syncUnifiedDockBottomClearance(false);
            }
        }

        function initModeMinimisedPill() {
            initUnifiedControlDock();
        }

        function ensurePresentationPopupMenu() {
            initUnifiedControlDock();
            syncPresentationFreezeButtons();
            syncPresentationPinButtons();
        }

        function positionFloatingWidgetsWithoutOverlap() {
            clampUnifiedDockToViewport();
        }

        function updateUnifiedControlDock() {
            if (PRESENTATION_MODE) return;
            initUnifiedControlDock();

            const dock = document.getElementById('cms-unified-dock');
            if (!dock) return;

            const timerOverlayEl = document.getElementById('timer-overlay');
            const timerOverlayActive = !!(timerOverlayEl && timerOverlayEl.classList.contains('active'));
            const isClockView = !!(timerOverlayActive && timerOverlayEl.classList.contains('view-clock'));
            const overlayControlsActive = timerOverlayActive && !isClockView;
            const modeOverlayEl = document.getElementById('mode-animation-overlay');
            const modeOverlayActive = !!(modeOverlayEl && modeOverlayEl.classList.contains('active') && !overlayControlsActive);
            const anyOverlayControlsActive = overlayControlsActive || modeOverlayActive;
            const effectiveCollapsed = _unifiedDockCollapsed;

            dock.classList.toggle('overlay-active', anyOverlayControlsActive && !effectiveCollapsed);
            dock.classList.toggle('theater-mode', timerOverlayActive && timerOverlayEl.classList.contains('theater-mode'));
            if (!anyOverlayControlsActive && !_unifiedDockPos) {
                dock.style.transform = '';
            }

            const timerRunning = !!(
                (typeof timerInterval !== 'undefined' && timerInterval) ||
                (typeof stopwatchInterval !== 'undefined' && stopwatchInterval) ||
                (typeof timerPaused !== 'undefined' && timerPaused) ||
                (typeof stopwatchPaused !== 'undefined' && stopwatchPaused)
            );
            const hasTimerSeg = timerRunning || anyOverlayControlsActive;
            const timerMinActive = !!(typeof isTimerFullscreenMinimised !== 'undefined' && isTimerFullscreenMinimised && typeof isTimerFullscreenActive !== 'undefined' && isTimerFullscreenActive);
            const modeMinActive = !!(typeof isModeMinimised !== 'undefined' && isModeMinimised && typeof activeWorkingModeId !== 'undefined' && activeWorkingModeId);
            const soundActive = !!(typeof whiteNoisePlaying !== 'undefined' && whiteNoisePlaying) && !modeOverlayActive;
            const presActive = !!(typeof _presWindowOpen !== 'undefined' && _presWindowOpen);

            const timerSeg = document.getElementById('ucm-dock-timer-seg');
            const timerMinSeg = document.getElementById('timer-minimized-pill');
            const modeSeg = document.getElementById('mode-minimized-pill');
            const soundSeg = document.getElementById('ucm-dock-sound-seg');
            const presSeg = document.getElementById('cms-pres-popup');

            const sepTimerMin = document.getElementById('ucm-dock-sep-timer-min');
            const sepMode = document.getElementById('ucm-dock-sep-mode');
            const sepSound = document.getElementById('ucm-dock-sep-sound');
            const sepPres = document.getElementById('ucm-dock-sep-pres');

            if (timerSeg) {
                timerSeg.style.display = hasTimerSeg ? 'inline-flex' : 'none';
                const readoutEl = document.getElementById('ucm-dock-timer-readout');
                const inlineControlsEl = document.getElementById('timer-inline-controls');
                const overlayControlsEl = document.getElementById('ucm-dock-overlay-controls');
                const modeOverlayControlsEl = document.getElementById('ucm-dock-mode-overlay-controls');
                if (readoutEl) readoutEl.style.display = anyOverlayControlsActive ? 'none' : 'inline-flex';
                if (inlineControlsEl) inlineControlsEl.style.display = anyOverlayControlsActive ? 'none' : 'inline-flex';
                if (overlayControlsEl) overlayControlsEl.style.display = overlayControlsActive ? 'inline-flex' : 'none';
                if (modeOverlayControlsEl) modeOverlayControlsEl.style.display = modeOverlayActive ? 'inline-flex' : 'none';
                if (timerRunning && !anyOverlayControlsActive) {
                    const iconEl = document.getElementById('ucm-dock-timer-icon');
                    const textEl = document.getElementById('ucm-dock-timer-text');
                    const activeDisp = document.getElementById('timer-active-display');
                    const isSw = (typeof timerMode !== 'undefined' && timerMode === 'stopwatch');
                    if (iconEl) iconEl.src = isSw ? '../assets/icons/stopwatch.svg' : '../assets/icons/clock.svg';
                    if (textEl && activeDisp) textEl.textContent = activeDisp.textContent || '--:--';
                    if (readoutEl && activeDisp) {
                        const isWarn = activeDisp.classList.contains('warning');
                        readoutEl.classList.toggle('warning', isWarn);
                        readoutEl.classList.toggle('running', !isWarn);
                    }
                    const add30Btn = document.getElementById('timer-inline-add30s-btn');
                    if (add30Btn) {
                        add30Btn.style.display = isSw ? 'none' : 'inline-flex';
                    }
                }
            }

            if (timerMinSeg) {
                timerMinSeg.style.display = timerMinActive ? 'inline-flex' : 'none';
            }

            if (modeSeg) {
                modeSeg.style.display = modeMinActive ? 'inline-flex' : 'none';
                const modeTimerSpan = document.getElementById('mode-pill-timer');
                if (modeTimerSpan && timerRunning) {
                    modeTimerSpan.style.display = 'none';
                }
            }

            if (soundSeg) {
                soundSeg.style.display = soundActive ? 'inline-flex' : 'none';
                if (soundActive) {
                    const dockMuteBtn = document.getElementById('ucm-dock-mute-btn');
                    const dockVolSlider = document.getElementById('ucm-dock-vol-slider');
                    if (dockMuteBtn) {
                        const isMuted = !!(typeof whiteNoiseMuted !== 'undefined' && whiteNoiseMuted);
                        const nextSrc = isMuted ? '../assets/icons/mute.svg' : '../assets/icons/volume.svg';
                        let muteImg = dockMuteBtn.querySelector('img');
                        if (!muteImg) {
                            muteImg = document.createElement('img');
                            muteImg.className = 'btn-icon';
                            muteImg.alt = '';
                            dockMuteBtn.textContent = '';
                            dockMuteBtn.appendChild(muteImg);
                        }
                        if (window.DomSync) window.DomSync.setAttr(muteImg, 'src', nextSrc);
                        else if (muteImg.getAttribute('src') !== nextSrc) muteImg.setAttribute('src', nextSrc);
                        dockMuteBtn.classList.toggle('is-muted', isMuted);
                    }
                    if (dockVolSlider && typeof whiteNoiseVolume === 'number') {
                        dockVolSlider.value = Math.round(whiteNoiseVolume * 100);
                    }
                }
            }

            if (presSeg) {
                presSeg.style.display = presActive ? 'inline-flex' : 'none';
            }

            if (sepTimerMin) sepTimerMin.style.display = (!effectiveCollapsed && hasTimerSeg && timerMinActive) ? 'block' : 'none';
            if (sepMode) sepMode.style.display = (!effectiveCollapsed && (hasTimerSeg || timerMinActive) && modeMinActive) ? 'block' : 'none';
            if (sepSound) sepSound.style.display = (!effectiveCollapsed && (hasTimerSeg || timerMinActive || modeMinActive) && soundActive) ? 'block' : 'none';
            if (sepPres) sepPres.style.display = (!effectiveCollapsed && (hasTimerSeg || timerMinActive || modeMinActive || soundActive) && presActive) ? 'block' : 'none';

            const collapsedBadge = document.getElementById('ucm-dock-collapsed-badge');
            if (collapsedBadge) {
                const showCollapsedTimer = effectiveCollapsed && timerRunning;
                collapsedBadge.style.display = showCollapsedTimer ? 'inline-flex' : 'none';
                if (showCollapsedTimer) {
                    const colIcon = document.getElementById('ucm-dock-collapsed-icon');
                    const colText = document.getElementById('ucm-dock-collapsed-text');
                    const activeDisp = document.getElementById('timer-active-display');
                    const isSw = (typeof timerMode !== 'undefined' && timerMode === 'stopwatch');
                    if (colIcon) colIcon.src = isSw ? '../assets/icons/stopwatch.svg' : '../assets/icons/clock.svg';
                    if (colText && activeDisp) colText.textContent = activeDisp.textContent || '--:--';
                    const isWarn = !!(activeDisp && activeDisp.classList.contains('warning'));
                    collapsedBadge.classList.toggle('warning', isWarn);
                    collapsedBadge.classList.toggle('running', !isWarn);
                }
            }

            const anyActive = hasTimerSeg || timerMinActive || modeMinActive || soundActive || presActive;
            const wasVisible = isWidgetVisible(dock);
            dock.classList.toggle('is-collapsed', effectiveCollapsed);
            dock.style.display = anyActive ? 'inline-flex' : 'none';

            // Update active mode banner inside #timer-popup
            const modeBanner = document.getElementById('ucm-active-mode-banner');
            if (modeBanner) {
                const hasActiveMode = !!(typeof activeWorkingModeId !== 'undefined' && activeWorkingModeId);
                modeBanner.classList.toggle('visible', hasActiveMode);
                if (hasActiveMode && typeof classModes !== 'undefined') {
                    const curMode = classModes.find(m => m.id === activeWorkingModeId || m.name.toLowerCase() === String(activeWorkingModeId).toLowerCase());
                    const bannerIcon = document.getElementById('ucm-active-mode-icon');
                    const bannerName = document.getElementById('ucm-active-mode-name');
                    if (curMode) {
                        if (bannerIcon && typeof getModeSvgIcon === 'function') bannerIcon.src = getModeSvgIcon(curMode);
                        if (bannerName) bannerName.textContent = curMode.name || curMode.text?.title || 'Mode';
                    }
                }
            }

            if (anyActive) {
                clampUnifiedDockToViewport();
                syncUnifiedDockBottomClearance(!wasVisible);
            } else {
                syncUnifiedDockBottomClearance(false);
            }
        }

        window.addEventListener('resize', () => {
            clampUnifiedDockToViewport();
        });

        function toggleFreezePresentation() {
            _presFrozen = !_presFrozen;
            syncPresentationFreezeButtons();
            if (_presChannel) {
                try { _presChannel.postMessage({ type: 'pres-frozen-state', on: _presFrozen }); } catch (_) { }
            }
            if (!_presFrozen) _broadcastPresentationState();
        }

