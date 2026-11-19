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
                if (data.kind === 'mode-activate') { activateMode(data.mode); return; }
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

        function escapeSettingsHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
        const escapeHtml = escapeSettingsHtml;

        function normalizeSoundFilePath(value) {
            let cleaned = String(value || '').trim().replace(/\\/g, '/').replace(/^\.?\//, '');
            if (cleaned.startsWith('data/')) cleaned = cleaned.slice(5);
            if (cleaned.startsWith('user/custom-data/')) cleaned = cleaned.slice('user/custom-data/'.length);

            const aliasBeforePrefix = SOUND_FILE_ALIASES[cleaned.toLowerCase()];
            if (aliasBeforePrefix) cleaned = aliasBeforePrefix;

            if (cleaned && !cleaned.startsWith('sounds/')) cleaned = `sounds/${cleaned}`;

            const aliasAfterPrefix = SOUND_FILE_ALIASES[cleaned.toLowerCase()];
            if (aliasAfterPrefix) cleaned = aliasAfterPrefix;

            return cleaned;
        }

        function normalizeSoundFileList(files) {
            return [...new Set((Array.isArray(files) ? files : [])
                .map(file => normalizeSoundFilePath(file))
                .filter(Boolean))].sort();
        }

        function areSoundFileListsEqual(a, b) {
            const left = normalizeSoundFileList(a);
            const right = normalizeSoundFileList(b);
            return left.length === right.length && left.every((entry, index) => entry === right[index]);
        }

        function resolveSoundFileMatch(filePath) {
            let normalized = normalizeSoundFilePath(filePath);
            if (!normalized) return '';
            if (Array.isArray(availableSoundFiles) && availableSoundFiles.length) {
                if (availableSoundFiles.includes(normalized)) return normalized;
                const baseName = normalized.split('/').pop().toLowerCase();
                const match = availableSoundFiles.find(f => {
                    const fLower = f.toLowerCase();
                    return fLower === normalized.toLowerCase() || fLower.endsWith('/' + baseName);
                });
                if (match) return match;
            }
            return normalized;
        }

        function buildSoundFileOptionsHtml(selectedFile = '') {
            const normalizedSelected = resolveSoundFileMatch(selectedFile);
            if (!availableSoundFiles || !availableSoundFiles.length) {
                return '<option value="">No files found yet</option>';
            }

            const rootFiles = [];
            const folderGroups = new Map();

            availableSoundFiles.forEach(file => {
                const rel = file.replace(/^sounds\//, '');
                const slashIdx = rel.lastIndexOf('/');
                if (slashIdx === -1) {
                    rootFiles.push({ full: file, rel, name: rel });
                } else {
                    const folder = rel.slice(0, slashIdx);
                    const name = rel.slice(slashIdx + 1);
                    if (!folderGroups.has(folder)) {
                        folderGroups.set(folder, []);
                    }
                    folderGroups.get(folder).push({ full: file, rel, name });
                }
            });

            if (folderGroups.size === 0) {
                return rootFiles.map(item =>
                    `<option value="${escapeSettingsHtml(item.full)}" ${normalizedSelected === item.full ? 'selected' : ''}>${escapeSettingsHtml(item.name)}</option>`
                ).join('');
            }

            let html = '';
            if (rootFiles.length) {
                html += `<optgroup label="General / Root">`;
                html += rootFiles.map(item =>
                    `<option value="${escapeSettingsHtml(item.full)}" ${normalizedSelected === item.full ? 'selected' : ''}>${escapeSettingsHtml(item.name)}</option>`
                ).join('');
                html += `</optgroup>`;
            }

            const sortedFolders = Array.from(folderGroups.keys()).sort((a, b) => a.localeCompare(b));
            for (const folder of sortedFolders) {
                const items = folderGroups.get(folder);
                html += `<optgroup label="${escapeSettingsHtml(folder)}">`;
                html += items.map(item =>
                    `<option value="${escapeSettingsHtml(item.full)}" ${normalizedSelected === item.full ? 'selected' : ''}>${escapeSettingsHtml(item.name)}</option>`
                ).join('');
                html += `</optgroup>`;
            }

            return html;
        }

        function refreshSoundFileSelectOptions() {
            document.querySelectorAll('.sound-editor-card').forEach(card => {
                const select = card.querySelector('.sound-file');
                const manualInput = card.querySelector('.sound-file-manual');
                if (!select) return;

                const currentValue = resolveSoundFileMatch(manualInput?.value || select.value || '');
                select.innerHTML = buildSoundFileOptionsHtml(currentValue);
                if (currentValue) {
                    select.value = currentValue;
                    if (manualInput) manualInput.value = currentValue;
                }
            });

            if (typeof renderCustomButtonsModalEditor === 'function') {
                renderCustomButtonsModalEditor();
            }
        }

        function normalizeSoundBuilderRows(rows, fallbackRows = []) {
            const source = Array.isArray(rows) && rows.length ? rows : fallbackRows;
            const normalized = source
                .map(row => ({
                    frequency: Math.max(40, Number(row?.frequency) || 440),
                    rhythm: String(row?.rhythm || 'medium').trim() || 'medium'
                }))
                .filter(row => Number.isFinite(row.frequency) && row.frequency > 0);

            return normalized.length ? normalized : [{ frequency: 440, rhythm: 'medium' }];
        }

        function normalizeSoundSlot(slot, fallback) {
            const source = slot && typeof slot === 'object' ? slot : {};
            const mode = ['builtin', 'file', 'js'].includes(String(source.mode || '').trim())
                ? String(source.mode).trim()
                : fallback.mode;
            const wave = ['sine', 'triangle', 'square', 'sawtooth'].includes(String(source.wave || '').trim())
                ? String(source.wave).trim()
                : (fallback.wave || 'sine');
            const rawVolume = source.volume !== undefined ? source.volume : fallback.volume;
            const volume = Math.round(Math.min(100, Math.max(0, Number(rawVolume) || 100)));
            const rawIterations = source.iterations !== undefined ? source.iterations : (fallback?.iterations ?? 1);
            const iterations = Math.max(1, Math.min(100, Math.round(Number(rawIterations) || 1)));
            return {
                mode,
                preset: String(source.preset || fallback.preset || '').trim() || fallback.preset,
                file: normalizeSoundFilePath(source.file || fallback.file || ''),
                js: String(source.js || '').replace(/\r\n/g, '\n').trim(),
                wave,
                volume,
                iterations,
                builder: normalizeSoundBuilderRows(source.builder, fallback.builder || [])
            };
        }

        function normalizeSoundSettings(settings) {
            const source = settings && typeof settings === 'object' ? settings : {};
            return {
                timerEnd: normalizeSoundSlot(source.timerEnd, DEFAULT_SOUND_SETTINGS.timerEnd),
                timerBackground: normalizeSoundSlot(source.timerBackground, DEFAULT_SOUND_SETTINGS.timerBackground),
                drumroll: normalizeSoundSlot(source.drumroll, DEFAULT_SOUND_SETTINGS.drumroll),
                gavelAlarm: normalizeSoundSlot(source.gavelAlarm, DEFAULT_SOUND_SETTINGS.gavelAlarm),
                scorePositive: normalizeSoundSlot(source.scorePositive, DEFAULT_SOUND_SETTINGS.scorePositive),
                scoreNegative: normalizeSoundSlot(source.scoreNegative, DEFAULT_SOUND_SETTINGS.scoreNegative)
            };
        }

        function createActionButtonId() {
            return 'btn-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        }

        function normalizeActionButtonSettings(settings) {
            const src = settings && typeof settings === 'object' ? settings : {};
            const normalizeItem = (item, fallbackLabel) => {
                const row = item && typeof item === 'object' ? item : {};
                const label = String(row.label || fallbackLabel || '').trim() || fallbackLabel;
                return {
                    id: String(row.id || createActionButtonId()),
                    label,
                    file: normalizeSoundFilePath(row.file || '')
                };
            };

            const custom = Array.isArray(src.custom)
                ? src.custom.map(item => normalizeItem(item, 'Custom Sound')).filter(item => item.label)
                : [];

            return { custom };
        }

        function triggerActionButton(kind, customId = null) {
            if (kind === 'custom' && customId) {
                const entry = (actionButtonSettings.custom || []).find(item => item.id === customId);
                if (!entry || !entry.file) return;
                playSoundFileClip(entry.file, 1, 180, 1.0);
            }
        }

        function renderCustomActionButtons() {
            const host = document.getElementById('custom-action-buttons');
            if (!host) return;

            host.querySelectorAll('[data-dynamic-btn]').forEach(b => b.remove());
            const entries = (actionButtonSettings.custom || []).filter(item => item.label && item.file);
            host.insertAdjacentHTML('beforeend', entries.map(item => (
                `<button class="custom-action-btn" data-dynamic-btn onclick="triggerActionButton('custom', '${escapeSettingsHtml(item.id)}')">${escapeSettingsHtml(item.label)}</button>`
            )).join(''));
        }

        function _buildCustomButtonEditorRowsHtml() {
            const rows = actionButtonSettings.custom || [];
            if (!rows.length) {
                return '<div class="settings-custom-buttons-empty">No extra buttons yet. Click Add button.</div>';
            }

            return rows.map((item, index) => {
                const optionHtml = `<option value="">Default slot sound</option>${buildSoundFileOptionsHtml(item.file)}`;
                return `
                <div class="settings-custom-row" data-custom-index="${index}">
                    <input type="text" class="settings-startup-select scb-name" value="${escapeSettingsHtml(item.label)}" placeholder="Button name">
                    <select class="settings-startup-select scb-file">${optionHtml}</select>
                    <button class="settings-custom-mini-btn" onclick="previewCustomButtonSound(${index})" type="button">▶</button>
                    <button class="settings-custom-mini-btn danger" onclick="removeCustomButtonRow(${index})" type="button"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
                </div>
            `;
            }).join('');
        }

        function renderCustomButtonsModalEditor() {
            const host = document.getElementById('custom-buttons-modal-section');
            if (!host) return;

            host.innerHTML = `
            <div class="settings-custom-subtitle">Extra sound buttons</div>
            <div id="custom-buttons-extra-rows">${_buildCustomButtonEditorRowsHtml()}</div>
            <div class="settings-custom-actions">
                <button class="settings-custom-mini-btn" onclick="addCustomButtonRow()" type="button">+ Add button</button>
                <button class="settings-custom-mini-btn primary" onclick="saveCustomButtonSettings()" type="button">Save buttons</button>
            </div>
        `;

            document.querySelectorAll('#custom-buttons-extra-rows .settings-custom-row').forEach(row => {
                const index = Number(row.getAttribute('data-custom-index'));
                const select = row.querySelector('.scb-file');
                const value = normalizeSoundFilePath(actionButtonSettings.custom[index]?.file || '');
                if (select) select.value = value;
            });
        }

        function addCustomButtonRow() {
            actionButtonSettings.custom.push({ id: createActionButtonId(), label: 'Custom Sound', file: '' });
            renderCustomButtonsModalEditor();
        }

        function removeCustomButtonRow(index) {
            actionButtonSettings.custom.splice(index, 1);
            renderCustomButtonsModalEditor();
        }

        function previewCustomButtonSound(index) {
            const rows = Array.from(document.querySelectorAll('#custom-buttons-extra-rows .settings-custom-row'));
            const row = rows[index];
            if (!row) return;
            const file = normalizeSoundFilePath(row.querySelector('.scb-file')?.value || '');
            if (!file) return;
            playSoundFileClip(file, 1, 180, 1.0);
        }

        async function saveCustomButtonSettings() {
            const custom = Array.from(document.querySelectorAll('#custom-buttons-extra-rows .settings-custom-row')).map((row, index) => {
                const prev = actionButtonSettings.custom[index] || {};
                return {
                    id: String(prev.id || createActionButtonId()),
                    label: String(row.querySelector('.scb-name')?.value || '').trim() || 'Custom Sound',
                    file: normalizeSoundFilePath(row.querySelector('.scb-file')?.value || '')
                };
            }).filter(item => item.label);

            actionButtonSettings = normalizeActionButtonSettings({ custom });

            renderCustomActionButtons();
            renderCustomButtonsModalEditor();
            await persistSettingsToUserFile();
        }

        function normalizeBadgeScope(scope) {
            if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.normalizeScope === 'function') {
                return BadgeSets.normalizeScope(scope);
            }
            const value = String(scope || 'individual').trim().toLowerCase();
            return ['individual', 'team', 'both'].includes(value) ? value : 'individual';
        }

        function normalizeBadgeDefinitions(definitions) {
            if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.normalizeDefs === 'function') {
                return BadgeSets.normalizeDefs(definitions);
            }
            const source = Array.isArray(definitions) ? definitions : [];
            const seen = new Set();
            return source.map(entry => ({
                icon: String(entry?.icon || '').trim(),
                label: String(entry?.label || '').trim(),
                tone: String(entry?.tone || 'positive').trim().toLowerCase() === 'negative' ? 'negative' : 'positive',
                meaning: String(entry?.meaning || '').trim(),
                coefficient: Number.isFinite(Number(entry?.coefficient)) ? Number(entry.coefficient) : 1,
                inlineInRoster: entry?.inlineInRoster === true,
                strikeOnAward: entry?.strikeOnAward === true,
                scope: normalizeBadgeScope(entry?.scope),
                hidden: entry?.hidden === true,
                isBuiltin: entry?.isBuiltin === true
            }))
                .filter(entry => {
                    const key = `${entry.icon}|${entry.label}`.toLowerCase();
                    if (!entry.icon || !entry.label || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        }

        function normalizeParticipationSettings(settings) {
            const src = settings && typeof settings === 'object' ? settings : {};
            const plusMinusCoefficient = Number(src.plusMinusCoefficient);
            const autoFlagBottomPercent = Number(src.autoFlagBottomPercent);

            // Normalize elements
            const elSrc = src.autoFlagElements && typeof src.autoFlagElements === 'object' ? src.autoFlagElements : {};
            // badges: true = all, [] = none, ['icon1',...] = specific set
            let normalizedBadges;
            if (Array.isArray(elSrc.badges)) {
                normalizedBadges = elSrc.badges.map(String).filter(Boolean);
            } else {
                normalizedBadges = elSrc.badges === false ? [] : true;
            }
            const autoFlagElements = {
                plus: elSrc.plus !== false,
                minus: elSrc.minus !== false,
                teamPlus: elSrc.teamPlus !== false,
                teamMinus: elSrc.teamMinus !== false,
                badges: normalizedBadges
            };

            // Normalize timeline
            const tlSrc = src.autoFlagTimeline && typeof src.autoFlagTimeline === 'object' ? src.autoFlagTimeline : {};
            const tlMode = ['all', 'weeks', 'date'].includes(tlSrc.mode) ? tlSrc.mode : 'all';
            const tlWeeks = Number.isFinite(Number(tlSrc.weeks)) && Number(tlSrc.weeks) > 0 ? Number(tlSrc.weeks) : 4;
            const tlSinceDate = typeof tlSrc.sinceDate === 'string' ? tlSrc.sinceDate.trim() : '';
            const autoFlagTimeline = { mode: tlMode, weeks: tlWeeks, sinceDate: tlSinceDate };

            const flagRulesSrc = Array.isArray(src.flagRules) ? src.flagRules : null;
            const flagRules = flagRulesSrc ? flagRulesSrc.map(r => ({
                id: r.id || ('rule_' + Math.random().toString(36).substr(2, 6)),
                name: typeof r.name === 'string' ? r.name.trim() : 'Flag Rule',
                color: typeof r.color === 'string' ? r.color.trim() : 'red',
                metric: typeof r.metric === 'string' ? r.metric.trim() : 'bottomPercent',
                operator: ['<=', '>=', '<', '>', '==', '!='].includes(r.operator) ? r.operator : '<=',
                threshold: Number.isFinite(Number(r.threshold)) ? Number(r.threshold) : 25,
                formula: typeof r.formula === 'string' ? r.formula.trim() : '',
                pickWeight: Number.isFinite(Number(r.pickWeight)) && Number(r.pickWeight) >= 0 ? Number(r.pickWeight) : 2.0,
                enabled: r.enabled !== false
            })) : [
                { id: 'rule_default_1', name: 'Low Net Participation', color: 'red', metric: 'bottomPercent', operator: '<=', threshold: (Number.isFinite(autoFlagBottomPercent) && autoFlagBottomPercent >= 0 && autoFlagBottomPercent <= 100) ? autoFlagBottomPercent : 25, pickWeight: 3.0, enabled: true }
            ];

            return {
                plusMinusCoefficient: Number.isFinite(plusMinusCoefficient) ? plusMinusCoefficient : 1,
                autoFlagLowParticipation: src.autoFlagLowParticipation === true,
                autoFlagBottomPercent: (Number.isFinite(autoFlagBottomPercent) && autoFlagBottomPercent >= 0 && autoFlagBottomPercent <= 100) ? autoFlagBottomPercent : 25,
                autoFlagElements,
                autoFlagTimeline,
                flagRules
            };
        }

        function buildDefaultTeamEntry(index) {
            const fallback = DEFAULT_TEAM_COLORS[index];
            if (fallback) return { ...fallback };
            const extra = EXTRA_TEAM_COLOR_PRESETS[(index - DEFAULT_TEAM_COLORS.length) % EXTRA_TEAM_COLOR_PRESETS.length] || EXTRA_TEAM_COLOR_PRESETS[0];
            return {
                name: `Team ${index + 1}`,
                hex: extra.hex,
                border: extra.border
            };
        }

        function getSessionTeamCustomNames() {
            const names = {};
            teamColors.forEach((tc, idx) => {
                if (tc.customName) names[idx + 1] = tc.customName;
            });
            return Object.keys(names).length ? names : null;
        }

        function applySessionTeamCustomNames(tNames) {
            if (!tNames || typeof tNames !== 'object') return;
            teamColors.forEach((tc, idx) => {
                const teamId = idx + 1;
                const val = tNames[teamId] !== undefined ? tNames[teamId] : tNames[String(teamId)];
                if (val !== undefined) {
                    tc.customName = String(val).trim();
                }
            });
        }

        function saveSessionTeamNames() {
            try {
                const names = getSessionTeamCustomNames() || {};
                sessionStorage.setItem('cms-session-team-names', JSON.stringify(names));
            } catch (e) { }
        }

        function applySessionTeamNames() {
            try {
                const raw = sessionStorage.getItem('cms-session-team-names');
                if (raw) {
                    const names = JSON.parse(raw);
                    applySessionTeamCustomNames(names);
                }
            } catch (e) { }
        }

        function applyUserConfig(config) {
            const savedTeams = Array.isArray(config?.teamColors) ? config.teamColors : [];
            const teamCount = savedTeams.length > 0 ? savedTeams.length : DEFAULT_TEAM_COLORS.length;
            const restoredTeams = Array.from({ length: Math.max(1, teamCount) }, (_, index) => {
                const fallback = buildDefaultTeamEntry(index);
                const saved = savedTeams[index] || {};
                const storedName = String(saved?.name || '').trim();
                return {
                    name: fallback.name,
                    hex: saved?.hex ? String(saved.hex).trim() : fallback.hex,
                    border: saved?.border ? String(saved.border).trim() : fallback.border,
                    ...(storedName ? { customName: storedName } : {})
                };
            });
            teamColors.splice(0, teamColors.length, ...restoredTeams);
            applySessionTeamNames();

            const rawBadgeSets = config?.badgeSetSettings;
            badgeSetSettings = {
                defaultSetId: String(rawBadgeSets?.defaultSetId || 'default').trim() || 'default',
                classSets: (rawBadgeSets?.classSets && typeof rawBadgeSets.classSets === 'object') ? { ...rawBadgeSets.classSets } : {}
            };

            const rawModeSets = config?.modeSetSettings;
            modeSetSettings = {
                defaultSetId: String(rawModeSets?.defaultSetId || 'default').trim() || 'default',
                classSets: (rawModeSets?.classSets && typeof rawModeSets.classSets === 'object') ? { ...rawModeSets.classSets } : {}
            };

            const savedBadges = Array.isArray(config?.badgeDefinitions) ? config.badgeDefinitions : DEFAULT_BADGE_DEFINITIONS;
            const normalizedDefaults = normalizeBadgeDefinitions(savedBadges && savedBadges.length ? savedBadges : DEFAULT_BADGE_DEFINITIONS);
            // Ensure builtin + and - entries always exist (inject for backward compat with old configs)
            const legacyPmCoeff = normalizeParticipationSettings(config?.participationSettings).plusMinusCoefficient;
            for (const builtin of DEFAULT_BADGE_DEFINITIONS.filter(d => d.isBuiltin).reverse()) {
                if (!normalizedDefaults.find(d => d.isBuiltin && d.icon === builtin.icon)) {
                    normalizedDefaults.unshift({ ...builtin, coefficient: legacyPmCoeff });
                }
            }
            if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.setCachedDefs === 'function') {
                BadgeSets.setCachedDefs('default', normalizedDefaults);
            }
            badgeDefinitions = normalizedDefaults;
            activeBadgeSetId = 'default';
            modalEditingSetId = 'default';

            soundSettings = normalizeSoundSettings(config?.soundSettings);
            syncTimerBeepsFromSoundSettings();
            actionButtonSettings = normalizeActionButtonSettings(config?.uiSettings?.actionButtons);
            availableSoundFiles = normalizeSoundFileList(Array.isArray(config?.soundFiles) && config.soundFiles.length ? config.soundFiles : availableSoundFiles);
            participationSettings = normalizeParticipationSettings(config?.participationSettings);
            const rosterCfg = config?.rosterSettings || config?.uiSettings?.rosterSettings || null;
            if (rosterCfg && typeof rosterCfg === 'object') {
                if (typeof rosterCfg.studentNameSizeRem === 'number' && !isNaN(rosterCfg.studentNameSizeRem) && rosterCfg.studentNameSizeRem >= NAME_SIZE_MIN && rosterCfg.studentNameSizeRem <= NAME_SIZE_MAX) {
                    studentNameSizeRem = +(Number(rosterCfg.studentNameSizeRem).toFixed(2));
                }
                if (typeof rosterCfg.presNameSizeRem === 'number' && !isNaN(rosterCfg.presNameSizeRem) && rosterCfg.presNameSizeRem >= NAME_SIZE_MIN && rosterCfg.presNameSizeRem <= NAME_SIZE_MAX) {
                    presNameSizeRem = +(Number(rosterCfg.presNameSizeRem).toFixed(2));
                }
                if (typeof rosterCfg.sortOrder === 'string' && ['first', 'last'].includes(rosterCfg.sortOrder)) {
                    rosterSortOrder = rosterCfg.sortOrder;
                }
                if (typeof rosterCfg.scoreMuted === 'boolean') scoreMuted = rosterCfg.scoreMuted;
                if (typeof rosterCfg.senVisible === 'boolean') senVisible = rosterCfg.senVisible;
                if (typeof rosterCfg.rolesVisible === 'boolean') rolesVisible = rosterCfg.rolesVisible;
                if (typeof rosterCfg.badgesVisible === 'boolean') badgesVisible = rosterCfg.badgesVisible;
                if (typeof rosterCfg.autoFlagVisible === 'boolean') autoFlagVisible = rosterCfg.autoFlagVisible;
                if (typeof rosterCfg.animationsEnabled === 'boolean') animationsEnabled = rosterCfg.animationsEnabled;
                if (typeof rosterCfg.rosterPlanView === 'boolean') rosterPlanView = rosterCfg.rosterPlanView;
                if (typeof rosterCfg.lessonRunnerLayout === 'string' && ['compact', 'collapsible', 'single'].includes(rosterCfg.lessonRunnerLayout)) {
                    lessonRunnerLayout = rosterCfg.lessonRunnerLayout;
                }
                if (rosterCfg.presSettings && typeof rosterCfg.presSettings === 'object') {
                    ['sen', 'plan', 'anim', 'autoflag', 'badges', 'roles', 'modes', 'lessonPlan'].forEach(k => {
                        if (typeof rosterCfg.presSettings[k] === 'boolean') presSettings[k] = rosterCfg.presSettings[k];
                    });
                }
            }
            if (config?.uiSettings) {
                const ui = config.uiSettings;
                if (typeof ui.studentNameSizeRem === 'number' && !isNaN(ui.studentNameSizeRem) && ui.studentNameSizeRem >= NAME_SIZE_MIN && ui.studentNameSizeRem <= NAME_SIZE_MAX) {
                    studentNameSizeRem = +(Number(ui.studentNameSizeRem).toFixed(2));
                } else if (typeof ui.nameSizeRem === 'number' && !isNaN(ui.nameSizeRem) && ui.nameSizeRem >= NAME_SIZE_MIN && ui.nameSizeRem <= NAME_SIZE_MAX) {
                    studentNameSizeRem = +(Number(ui.nameSizeRem).toFixed(2));
                }
                if (typeof ui.presNameSizeRem === 'number' && !isNaN(ui.presNameSizeRem) && ui.presNameSizeRem >= NAME_SIZE_MIN && ui.presNameSizeRem <= NAME_SIZE_MAX) {
                    presNameSizeRem = +(Number(ui.presNameSizeRem).toFixed(2));
                }
                if (typeof ui.rosterPlanView === 'boolean') {
                    rosterPlanView = ui.rosterPlanView;
                }
                if (typeof ui.senVisible === 'boolean') senVisible = ui.senVisible;
                if (typeof ui.badgesVisible === 'boolean') badgesVisible = ui.badgesVisible;
                if (typeof ui.rolesVisible === 'boolean') rolesVisible = ui.rolesVisible;
                if (typeof ui.autoFlagVisible === 'boolean') autoFlagVisible = ui.autoFlagVisible;
                if (typeof ui.animationsEnabled === 'boolean') animationsEnabled = ui.animationsEnabled;
                if (typeof ui.scoreMuted === 'boolean') scoreMuted = ui.scoreMuted;
                if (ui.presSettings && typeof ui.presSettings === 'object') {
                    if (typeof ui.presSettings.sen === 'boolean') presSettings.sen = ui.presSettings.sen;
                    if (typeof ui.presSettings.plan === 'boolean') presSettings.plan = ui.presSettings.plan;
                    if (typeof ui.presSettings.anim === 'boolean') presSettings.anim = ui.presSettings.anim;
                    if (typeof ui.presSettings.autoflag === 'boolean') presSettings.autoflag = ui.presSettings.autoflag;
                    if (typeof ui.presSettings.badges === 'boolean') presSettings.badges = ui.presSettings.badges;
                    if (typeof ui.presSettings.roles === 'boolean') presSettings.roles = ui.presSettings.roles;
                    if (typeof ui.presSettings.modes === 'boolean') presSettings.modes = ui.presSettings.modes;
                    if (typeof ui.presSettings.lessonPlan === 'boolean') presSettings.lessonPlan = ui.presSettings.lessonPlan;
                }
                if (typeof ui.planAbbrevLen === 'number' && ui.planAbbrevLen >= 1 && ui.planAbbrevLen <= 20) planAbbrevLen = Math.round(ui.planAbbrevLen);
                if (typeof ui.nameDisplayMode === 'string' && ['full', 'first', 'last', 'custom'].includes(ui.nameDisplayMode)) {
                    nameDisplayMode = ui.nameDisplayMode;
                } else if (typeof config?.launcherSettings?.defaultNameDisplayMode === 'string' && ['full', 'first', 'last', 'custom'].includes(config.launcherSettings.defaultNameDisplayMode)) {
                    nameDisplayMode = config.launcherSettings.defaultNameDisplayMode;
                }
                if (typeof ui.rosterSortOrder === 'string' && ['first', 'last'].includes(ui.rosterSortOrder)) {
                    rosterSortOrder = ui.rosterSortOrder;
                } else {
                    try {
                        const lsSort = localStorage.getItem('cms-roster-sort-order');
                        if (lsSort && ['first', 'last'].includes(lsSort)) rosterSortOrder = lsSort;
                    } catch (_) { }
                }
                _syncRosterSortOrderInputs();
                if (typeof ui.lessonRunnerLayout === 'string' && ['compact', 'collapsible', 'single'].includes(ui.lessonRunnerLayout)) {
                    if (typeof setLessonRunnerLayout === 'function') setLessonRunnerLayout(ui.lessonRunnerLayout, false);
                } else {
                    try {
                        const lsLayout = localStorage.getItem('cms-lesson-runner-layout');
                        if (lsLayout && ['compact', 'collapsible', 'single'].includes(lsLayout)) {
                            if (typeof setLessonRunnerLayout === 'function') setLessonRunnerLayout(lsLayout, false);
                        } else if (typeof setLessonRunnerLayout === 'function') {
                            setLessonRunnerLayout('compact', false);
                        }
                    } catch (_) {
                        if (typeof setLessonRunnerLayout === 'function') setLessonRunnerLayout('compact', false);
                    }
                }
                try {
                    const lsCollapsed = localStorage.getItem('cms-lr-collapsed');
                    if (lsCollapsed === '1') {
                        lessonRunnerCollapsed = true;
                        const container = document.getElementById('cms-lesson-runner-container');
                        if (container) container.classList.add('is-collapsed');
                        const cBtn = document.getElementById('clr-collapse-btn');
                        if (cBtn) cBtn.textContent = '▼';
                    }
                } catch (_) {}
            }

            try {
                if (config?.rosterSettings?.studentNameSizeRem === undefined && config?.uiSettings?.studentNameSizeRem === undefined && config?.uiSettings?.nameSizeRem === undefined) {
                    const lsName = parseFloat(localStorage.getItem('cms-student-name-size'));
                    if (!isNaN(lsName) && lsName >= NAME_SIZE_MIN && lsName <= NAME_SIZE_MAX) studentNameSizeRem = +(lsName.toFixed(2));
                }
                if (config?.rosterSettings?.presNameSizeRem === undefined && config?.uiSettings?.presNameSizeRem === undefined) {
                    const lsPres = parseFloat(localStorage.getItem('cms-pres-name-size'));
                    if (!isNaN(lsPres) && lsPres >= NAME_SIZE_MIN && lsPres <= NAME_SIZE_MAX) presNameSizeRem = +(lsPres.toFixed(2));
                }
                if (config?.rosterSettings?.rosterPlanView === undefined && config?.uiSettings?.rosterPlanView === undefined) {
                    const lsPlan = localStorage.getItem('cms-roster-plan-view');
                    if (lsPlan !== null) rosterPlanView = (lsPlan === '1');
                }
            } catch (_) { }

            if (typeof applyNameSize === 'function') applyNameSize();
            if (typeof applyPresNameSize === 'function') applyPresNameSize();
            if (Array.isArray(config?.classModes) && config.classModes.length > 0) {
                classModes = config.classModes.map(m => {
                    const copy = { ...m };
                    if (copy.picture && typeof copy.picture === 'object' && copy.picture.src) {
                        copy.picture = { ...copy.picture, src: sanitizeModeImgSrc(copy.picture.src) };
                        copy.pictureSrc = copy.picture.src;
                    }
                    // Heal legacy/out-of-sync entries where saveModeFromEditor updated nested sound/text/picture without flat fields
                    if (copy.sound && typeof copy.sound === 'object') {
                        if (copy.sound.type && copy.sound.type !== 'none' && (!copy.soundType || copy.soundType === 'none')) {
                            copy.soundType = copy.sound.type;
                            if (copy.sound.file !== undefined) copy.soundFile = copy.sound.file;
                            if (copy.sound.volume !== undefined) copy.soundVol = copy.sound.volume;
                            if (copy.sound.chime !== undefined) copy.soundChime = !!copy.sound.chime;
                        }
                    }
                    return copy;
                });
                if (typeof renderTimerModeShortcuts === 'function') renderTimerModeShortcuts();
            }
            if (typeof ModeSets !== 'undefined' && typeof ModeSets.setCachedDefs === 'function') {
                ModeSets.setCachedDefs('default', classModes);
            }
            if (config?.shortcuts && typeof config.shortcuts === 'object' && !Array.isArray(config.shortcuts)) {
                try {
                    localStorage.setItem(CMS_SHORTCUTS_STORAGE_KEY, JSON.stringify(config.shortcuts));
                } catch (_) { }
            } else if (config?.customShortcuts && typeof config.customShortcuts === 'object' && !Array.isArray(config.customShortcuts)) {
                try {
                    localStorage.setItem(CMS_SHORTCUTS_STORAGE_KEY, JSON.stringify(config.customShortcuts));
                } catch (_) { }
            }
            if (config?.classPlans && typeof config.classPlans === 'object') {
                classPlans = config.classPlans;
            } else {
                // fall back to localStorage if no disk data
                try {
                    const lsPlans = localStorage.getItem('cms-class-plans');
                    if (lsPlans) classPlans = JSON.parse(lsPlans) || {};
                } catch (_) { }
            }
            if (typeof _applyIntervalSequencesFromConfig === 'function') {
                _applyIntervalSequencesFromConfig(config?.intervalSequences);
            }
        }

        function getLoadedConfig() {
            if (loadedConfigCache && typeof loadedConfigCache === 'object') {
                return loadedConfigCache;
            }

            if (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG) {
                loadedConfigCache = CLASS_MANAGEMENT_CONFIG;
                return loadedConfigCache;
            }

            if (typeof window !== 'undefined' && window.CLASS_MANAGEMENT_CONFIG && typeof window.CLASS_MANAGEMENT_CONFIG === 'object') {
                loadedConfigCache = window.CLASS_MANAGEMENT_CONFIG;
                return loadedConfigCache;
            }

            return {};
        }

        async function loadConfigFromDisk(forceReload = false) {
            if (!forceReload && loadedConfigCache && typeof loadedConfigCache === 'object' && Object.keys(loadedConfigCache).length) {
                return loadedConfigCache;
            }

            const fallbackConfig = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG)
                ? CLASS_MANAGEMENT_CONFIG
                : ((typeof window !== 'undefined' && window.CLASS_MANAGEMENT_CONFIG && typeof window.CLASS_MANAGEMENT_CONFIG === 'object')
                    ? window.CLASS_MANAGEMENT_CONFIG
                    : {});

            if (window.Desktop && typeof window.Desktop.readJson === 'function') {
                try {
                    const result = await window.Desktop.readJson(CONFIG_FILE_TARGET, CONFIG_FILE_NAME);
                    if (result?.ok && result.data && typeof result.data === 'object') {
                        loadedConfigCache = { ...fallbackConfig, ...result.data };
                        if (typeof window !== 'undefined') {
                            window.CLASS_MANAGEMENT_CONFIG = loadedConfigCache;
                            window.ROLE_DEFINITIONS = loadedConfigCache.roleDefinitions || [];
                        }
                    }
                } catch (error) {
                    console.warn('Unable to read config.js from disk:', error);
                }

                if (!loadedConfigCache || !Object.keys(loadedConfigCache).length) {
                    loadedConfigCache = (fallbackConfig && typeof fallbackConfig === 'object') ? { ...fallbackConfig } : {};
                }

                // Read class groups from the separate class-groups.js file.
                // Falls back to data already present in loadedConfigCache (migration: old config.js had them embedded).
                // Use readText + sandboxed Function eval so the file is parsed correctly even when
                // classGroupsMeta objects use unquoted JS keys (which strict JSON.parse rejects).
                try {
                    const groupsTextResult = await window.Desktop.readText(CONFIG_FILE_TARGET, GROUPS_FILE_NAME);
                    if (groupsTextResult?.ok && groupsTextResult.content) {
                        try {
                            // eslint-disable-next-line no-new-func
                            const _extractGroups = new Function(
                                groupsTextResult.content +
                                '; return (typeof CLASS_GROUPS_DATA !== "undefined" && CLASS_GROUPS_DATA)' +
                                ' ? CLASS_GROUPS_DATA' +
                                ' : { classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null),' +
                                '   classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null) };'
                            );
                            const _parsed = _extractGroups();
                            if (_parsed && typeof _parsed === 'object') {
                                loadedConfigCache.classGroups = _parsed.classGroups || {};
                                loadedConfigCache.classGroupsMeta = _parsed.classGroupsMeta || {};
                                loadedConfigCache.activeYear = _parsed.activeYear || '';
                                loadedConfigCache.activeSemester = _parsed.activeSemester || null;
                                loadedConfigCache.activeSemesterStart = _parsed.activeSemesterStart || '';
                                loadedConfigCache.activeSemesterEnd = _parsed.activeSemesterEnd || '';
                            }
                        } catch (parseError) {
                            console.warn('Unable to parse class-groups.js content:', parseError);
                        }
                    }
                    // else: keep whatever classGroups/Meta came from config.js (migration scenario)
                } catch (error) {
                    console.warn('Unable to read class-groups.js from disk:', error);
                }

                // Fallback: if readText failed, read active context from the bootstrap-injected global.
                if (!loadedConfigCache.activeYear && typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) {
                    loadedConfigCache.activeYear = CLASS_GROUPS_DATA.activeYear || '';
                    loadedConfigCache.activeSemester = CLASS_GROUPS_DATA.activeSemester || null;
                    loadedConfigCache.activeSemesterStart = CLASS_GROUPS_DATA.activeSemesterStart || '';
                    loadedConfigCache.activeSemesterEnd = CLASS_GROUPS_DATA.activeSemesterEnd || '';
                }

                // Ensure classGroups/Meta always fall back to script-tag globals when still absent.
                if (!loadedConfigCache.classGroups) {
                    loadedConfigCache.classGroups = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : {};
                }
                if (!loadedConfigCache.classGroupsMeta) {
                    loadedConfigCache.classGroupsMeta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
                }

                if (typeof window !== 'undefined') {
                    window.CLASS_GROUPS = loadedConfigCache.classGroups;
                    window.CLASS_GROUPS_META = loadedConfigCache.classGroupsMeta;
                }

                return loadedConfigCache;
            }

            loadedConfigCache = (fallbackConfig && typeof fallbackConfig === 'object') ? fallbackConfig : {};
            // In non-Electron environments fall back to globals set by the script tag.
            if (!loadedConfigCache.classGroups) {
                loadedConfigCache.classGroups = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : {};
            }
            if (!loadedConfigCache.classGroupsMeta) {
                loadedConfigCache.classGroupsMeta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
            }
            return loadedConfigCache;
        }

        function loadCustomSettingsFromConfig() {
            try {
                applyUserConfig(getLoadedConfig());
            } catch (error) {
                console.warn('Unable to restore settings from config.js:', error);
                applyUserConfig({});
            }
        }

        function buildConfigPayload(overrides = {}) {
            const loadedConfig = getLoadedConfig();
            const payload = {
                teamColors: teamColors.map(entry => ({
                    name: entry.customName || '',
                    hex: entry.hex,
                    border: entry.border
                })),
                badgeDefinitions: (function () {
                    const defaultDefs = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.getCachedDefs === 'function')
                        ? BadgeSets.getCachedDefs('default')
                        : null;
                    const source = (activeBadgeSetId === 'default') ? badgeDefinitions : (defaultDefs || loadedConfig.badgeDefinitions || DEFAULT_BADGE_DEFINITIONS);
                    return (source || []).map(entry => ({ ...entry }));
                })(),
                badgeSetSettings: {
                    defaultSetId: String(badgeSetSettings?.defaultSetId || 'default').trim() || 'default',
                    classSets: { ...(badgeSetSettings?.classSets || {}) }
                },
                modeSetSettings: {
                    defaultSetId: String(modeSetSettings?.defaultSetId || 'default').trim() || 'default',
                    classSets: { ...(modeSetSettings?.classSets || {}) }
                },
                classModes: (function () {
                    const defaultDefs = (typeof ModeSets !== 'undefined' && typeof ModeSets.getCachedDefs === 'function')
                        ? ModeSets.getCachedDefs('default')
                        : null;
                    const source = (activeModeSetId === 'default') ? classModes : (defaultDefs || loadedConfig.classModes || DEFAULT_CLASS_MODES);
                    return (source || []).map(entry => ({ ...entry }));
                })(),
                soundSettings: normalizeSoundSettings(soundSettings),
                participationSettings: normalizeParticipationSettings(participationSettings),
                roleDefinitions: (rolesLibraryLoaded && Array.isArray(roleDefinitions))
                    ? roleDefinitions.map(entry => ({ ...entry }))
                    : (Array.isArray(loadedConfig.roleDefinitions) && loadedConfig.roleDefinitions.length
                        ? loadedConfig.roleDefinitions.map(entry => ({ ...entry }))
                        : (typeof ROLE_DEFINITIONS !== 'undefined' && Array.isArray(ROLE_DEFINITIONS)
                            ? ROLE_DEFINITIONS.map(entry => ({ ...entry }))
                            : [])),
                ...overrides,
                soundFiles: normalizeSoundFileList(
                    Array.isArray(overrides?.soundFiles)
                        ? overrides.soundFiles
                        : (availableSoundFiles.length ? availableSoundFiles : loadedConfig.soundFiles)
                ),
                constellationPresets: (Array.isArray(loadedConfig.constellationPresets) && loadedConfig.constellationPresets.length)
                    ? loadedConfig.constellationPresets
                    : undefined,
                uiSettings: {
                    senVisible: senVisible,
                    badgesVisible: badgesVisible,
                    rolesVisible: rolesVisible,
                    autoFlagVisible: autoFlagVisible,
                    animationsEnabled: animationsEnabled,
                    scoreMuted: scoreMuted,
                    presSettings: { ...presSettings },
                    planAbbrevLen: planAbbrevLen,
                    nameDisplayMode: nameDisplayMode,
                    rosterSortOrder: rosterSortOrder,
                    lessonRunnerLayout: lessonRunnerLayout,
                    actionButtons: normalizeActionButtonSettings(actionButtonSettings),
                    studentNameSizeRem: studentNameSizeRem,
                    presNameSizeRem: presNameSizeRem,
                    rosterPlanView: rosterPlanView,
                    rosterSettings: {
                        studentNameSizeRem: studentNameSizeRem,
                        presNameSizeRem: presNameSizeRem,
                        sortOrder: rosterSortOrder,
                        scoreMuted: scoreMuted,
                        senVisible: senVisible,
                        rolesVisible: rolesVisible,
                        badgesVisible: badgesVisible,
                        autoFlagVisible: autoFlagVisible,
                        animationsEnabled: animationsEnabled,
                        rosterPlanView: rosterPlanView,
                        lessonRunnerLayout: lessonRunnerLayout,
                        presSettings: { ...presSettings }
                    }
                },
                rosterSettings: {
                    studentNameSizeRem: studentNameSizeRem,
                    presNameSizeRem: presNameSizeRem,
                    sortOrder: rosterSortOrder,
                    scoreMuted: scoreMuted,
                    senVisible: senVisible,
                    rolesVisible: rolesVisible,
                    badgesVisible: badgesVisible,
                    autoFlagVisible: autoFlagVisible,
                    animationsEnabled: animationsEnabled,
                    rosterPlanView: rosterPlanView,
                    lessonRunnerLayout: lessonRunnerLayout,
                    presSettings: { ...presSettings }
                },
                launcherSettings: loadedConfig.launcherSettings || {},
                export: (overrides && overrides.export !== undefined)
                    ? overrides.export
                    : (loadedConfig.export || {}),
                shortcuts: (overrides && overrides.shortcuts !== undefined)
                    ? overrides.shortcuts
                    : (typeof getCmsCustomShortcutsMap === 'function' ? getCmsCustomShortcutsMap() : (loadedConfig.shortcuts || {})),
                classPlans: _cpSerializablePlans(),
                intervalSequences: (typeof _getSerializableIntervalSequences === 'function')
                    ? _getSerializableIntervalSequences()
                    : (loadedConfig.intervalSequences || undefined)
            };

            // Preserve classGroups/classGroupsMeta and active context in the cache (they live in class-groups.js, not config.js).
            loadedConfigCache = {
                classGroups: rawData || loadedConfig.classGroups || {},
                classGroupsMeta: rawMeta || loadedConfig.classGroupsMeta || {},
                activeYear: loadedConfig.activeYear || '',
                activeSemester: loadedConfig.activeSemester || null,
                activeSemesterStart: loadedConfig.activeSemesterStart || '',
                activeSemesterEnd: loadedConfig.activeSemesterEnd || '',
                ...payload
            };
            return payload;
        }

        function buildConfigFileContent(overrides = {}) {
            const payload = buildConfigPayload(overrides);
            return [
                `const CLASS_MANAGEMENT_CONFIG = ${JSON.stringify(payload, null, 2)};`,
                '',
                'var CLASS_GROUPS = CLASS_GROUPS || (typeof CLASS_GROUPS_DATA !== \'undefined\' && CLASS_GROUPS_DATA.classGroups) || {};',
                'var CLASS_GROUPS_META = CLASS_GROUPS_META || (typeof CLASS_GROUPS_DATA !== \'undefined\' && CLASS_GROUPS_DATA.classGroupsMeta) || {};',
                'const ROLE_DEFINITIONS = CLASS_MANAGEMENT_CONFIG.roleDefinitions || [];',
                ''
            ].join('\n');
        }

        async function persistSettingsToUserFile(overrides = {}) {
            const content = buildConfigFileContent(overrides);

            if (window.Desktop && typeof window.Desktop.saveText === 'function') {
                try {
                    return await window.Desktop.saveText(CONFIG_FILE_TARGET, CONFIG_FILE_NAME, content);
                } catch (error) {
                    console.warn('Unable to save config.js:', error);
                    return { ok: false, error: error?.message || 'Unable to save config.js' };
                }
            }

            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.js';
            a.click();
            URL.revokeObjectURL(url);
            return { ok: true, mode: 'download' };
        }

        function persistTeamSettings() {
            return persistSettingsToUserFile();
        }

        function persistBadgeSettings() {
            return persistSettingsToUserFile();
        }

        // showConfirm / showPrompt — callback-based wrappers around the shared
        // Promise-based dialogs.js versions. All existing call sites continue to
        // work unchanged; the functions also return the Promise so await works too.
        //
        // Uses window._dlgShowConfirm / window._dlgShowPrompt (private aliases set
        // by dialogs.js) to avoid the hoisting trap: function declarations are
        // hoisted before any assignment runs, so saving window.showConfirm into a
        // variable at this scope would just capture the hoisted local function.
        function showConfirm(message, onOk, onCancel) {
            const p = window._dlgShowConfirm(message);
            p.then(function (ok) {
                if (ok) { if (onOk) onOk(); }
                else { if (onCancel) onCancel(); }
            });
            return p;
        }

        function showPrompt(message, defaultValue, callback) {
            const p = window._dlgShowPrompt(message, defaultValue);
            p.then(function (val) { if (callback) callback(val); });
            return p;
        }

        async function _cmsLoadStudentRoster() {
            if (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER)) {
                studentRoster = {};
                STUDENTS_ROSTER.forEach(s => { if (s && s.uuid) studentRoster[s.uuid] = s; });
                return;
            }
            if (!window.Desktop || !Desktop.isElectron() || typeof Desktop.readText !== 'function') return;
            try {
                const r = await Desktop.readText(CONFIG_FILE_TARGET, 'students.js');
                if (r?.ok && r.content) {
                    const fn = new Function(r.content + '; return typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : [];');
                    const arr = fn();
                    if (Array.isArray(arr)) {
                        studentRoster = {};
                        arr.forEach(s => { if (s && s.uuid) studentRoster[s.uuid] = s; });
                    }
                }
            } catch (e) { }
        }

        function _resolveStudentsForGroup(groupId) {
            const meta = rawMeta[groupId];
            const uuids = meta && Array.isArray(meta.students) && meta.students.length > 0 ? meta.students : null;
            if (uuids && typeof uuids[0] === 'string' && uuids[0].startsWith('st-')) {
                return uuids.map(sid => {
                    const s = studentRoster[sid] || { uuid: sid, firstName: '', lastName: '', customName: '', sen: false, enrollments: [] };
                    const name = ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() || sid;
                    return { uuid: sid, name, firstName: s.firstName || '', lastName: s.lastName || '', customName: s.customName || '', sen: !!s.sen, enrollments: s.enrollments || [] };
                });
            }
            const names = rawData[groupId] || [];
            return names.map(name => {
                const s = Object.values(studentRoster).find(st => {
                    const fn = (st.firstName || '').trim().toUpperCase();
                    const ln = (st.lastName || '').trim().toUpperCase();
                    return (fn + ' ' + ln).trim() === String(name).trim().toUpperCase();
                });
                return { uuid: s ? s.uuid : null, name: String(name), firstName: s?.firstName || '', lastName: s?.lastName || '', customName: s?.customName || '', sen: !!(s && s.sen), enrollments: (s && s.enrollments) || [] };
            });
        }

        function _halfGroupFilter(allStudents, halfGroupArray) {
            if (!halfGroupArray || !halfGroupArray.length) return allStudents;
            if (typeof halfGroupArray[0] === 'string' && halfGroupArray[0].startsWith('st-')) {
                const uuidSet = new Set(halfGroupArray);
                return allStudents.filter(s => s.uuid && uuidSet.has(s.uuid));
            }
            const nameSet = new Set(halfGroupArray.map(n => String(n).toUpperCase()));
            return allStudents.filter(s => nameSet.has(String(s.name || '').toUpperCase()));
        }

        function _generateUniqueStudentSessionId(seenIds) {
            let id;
            do {
                id = Date.now() + Math.random();
            } while (seenIds && seenIds.has(id));
            if (seenIds) seenIds.add(id);
            return id;
        }

        function _ensureUniqueStudentSessionIds(groupStudents) {
            if (!Array.isArray(groupStudents)) return groupStudents;
            const seenIds = new Set();
            const seenUuids = new Set();

            groupStudents.forEach(s => {
                if (!s || typeof s !== 'object') return;
                if (s.id == null || seenIds.has(s.id)) {
                    s.id = _generateUniqueStudentSessionId(seenIds);
                } else {
                    seenIds.add(s.id);
                }

                if (s.uuid) {
                    if (seenUuids.has(s.uuid)) {
                        const rand = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
                        s.uuid = 'st-' + rand;
                    }
                    seenUuids.add(s.uuid);
                }
            });

            return groupStudents;
        }

        // Build studentGroups from rawMeta/rawData (called after script load)
        function buildStudentGroups() {
            const allGroupIds = Object.keys(rawMeta).length ? Object.keys(rawMeta) : Object.keys(rawData);
            allGroupIds.forEach(group => {
                if (rawMeta[group] && rawMeta[group].archived) return;
                if (!studentGroups[group]) {
                    const rawList = _resolveStudentsForGroup(group).map(s => ({
                        id: Date.now() + Math.random(),
                        uuid: s.uuid || null,
                        name: s.name,
                        firstName: s.firstName || '',
                        lastName: s.lastName || '',
                        customName: s.customName || '',
                        sen: !!s.sen,
                        enrollments: s.enrollments || [],
                        isPicked: false,
                        isAbsent: false,
                        pluses: 0,
                        minuses: 0,
                        teamId: null
                    }));
                    studentGroups[group] = _ensureUniqueStudentSessionIds(rawList);
                }
            });
        }

        function _plannerTimeAdd(timeStr, mins) {
            if (!timeStr || typeof timeStr !== 'string') return '';
            var p = timeStr.split(':');
            if (p.length < 2) return '';
            var h = parseInt(p[0], 10);
            var m = parseInt(p[1], 10);
            if (isNaN(h) || isNaN(m)) return '';
            var total = h * 60 + m + (mins || 0);
            return String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
        }

        async function loadPlannerClasses() {
            try {
                if (!window.Desktop || !Desktop.isElectron()) return;
                var r = await Desktop.readText('user', 'planner-config.js');
                if (!r || !r.ok || !r.content) return;
                var prefix = 'window.PLANNER_CONFIG = ';
                var body = r.content.split('\n').filter(function (l) { return !l.trim().startsWith('//'); }).join('\n');
                var startIdx = body.indexOf(prefix);
                if (startIdx === -1) return;
                var plannerCfg = JSON.parse(body.slice(startIdx + prefix.length).trim().replace(/;\s*$/, ''));
                if (plannerCfg && plannerCfg.classes) {
                    plannerClasses = plannerCfg.classes;
                    // Store semester info for auto-select
                    plannerClasses._semesters = plannerCfg.semesters || [];
                    plannerClasses._activeSemId = plannerCfg.activeSemesterId || '';
                }
            } catch (e) {
                console.warn('loadPlannerClasses:', e);
            }
        }

        async function loadPlannerEntriesForClass(classId) {
            if (!classId) return [];
            try {
                if (window.PLANNER_ENTRIES_BY_CLASS && Array.isArray(window.PLANNER_ENTRIES_BY_CLASS[classId])) {
                    return window.PLANNER_ENTRIES_BY_CLASS[classId];
                }
                if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
                    var r = await Desktop.readText('user', (classId || '__unassigned') + '.js', 'planner');
                    if (r && r.ok && r.content) {
                        try {
                            new Function(r.content)();
                            if (window.PLANNER_ENTRIES_BY_CLASS && Array.isArray(window.PLANNER_ENTRIES_BY_CLASS[classId])) {
                                return window.PLANNER_ENTRIES_BY_CLASS[classId];
                            }
                        } catch (_) {}
                    }
                }
            } catch (e) {
                console.warn('loadPlannerEntriesForClass:', e);
            }
            if (typeof window.PLANNER_CONFIG !== 'undefined' && Array.isArray(window.PLANNER_CONFIG.entries)) {
                return window.PLANNER_CONFIG.entries.filter(function (e) {
                    if (!e) return false;
                    var cIds = e.classIds || (e.classId ? [e.classId] : []);
                    return cIds.includes(classId);
                });
            }
            return [];
        }

        async function resolvePlannerEntryUuid(classId, slotTime, targetDate) {
            if (!classId) return '';
            var todayStr = targetDate || new Date().toISOString().slice(0, 10);
            var entries = await loadPlannerEntriesForClass(classId);
            if (!entries || !entries.length) return '';

            // 1. If slotTime is provided (e.g. "09:00"), match on date and exact or close start time
            if (slotTime) {
                var slotPrefix = slotTime.slice(0, 5);
                var matchSlot = entries.find(function (e) {
                    if (!e || e.date !== todayStr) return false;
                    return (e.time || '').slice(0, 5) === slotPrefix;
                });
                if (matchSlot && matchSlot.id) return matchSlot.id;
            }

            // 2. Find all entries for this class on the target date
            var todayMatches = entries.filter(function (e) {
                return e && e.date === todayStr;
            });

            if (todayMatches.length === 1 && todayMatches[0].id) {
                return todayMatches[0].id;
            }

            if (todayMatches.length > 1) {
                var now = new Date();
                var nowTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                // Find entry that covers the current time
                var currentMatch = todayMatches.find(function (e) {
                    var st = e.time || '';
                    var en = e.timeEnd || (st ? _plannerTimeAdd(st, 60) : '');
                    return st && nowTime >= st && nowTime <= en;
                });
                if (currentMatch && currentMatch.id) return currentMatch.id;
                // Otherwise pick the earliest entry today
                return todayMatches[0].id || '';
            }

            return '';
        }

        async function autoSelectPlannerGroup() {
            try {
                var classes = plannerClasses;
                if (!Object.keys(classes).filter(k => !k.startsWith('_')).length) return;

                // Current day and time
                var now = new Date();
                var dow = now.getDay();
                var nowTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                var todayStr = now.toISOString().slice(0, 10);

                // Check active semester dates and holidays
                var semesters = classes._semesters || [];
                var activeSem = semesters.find(function (s) { return s.id === classes._activeSemId; }) || semesters[0];
                if (activeSem) {
                    if (activeSem.semesterStart && todayStr < activeSem.semesterStart) return;
                    if (activeSem.semesterEnd && todayStr > activeSem.semesterEnd) return;
                    var onHoliday = (activeSem.holidays || []).some(function (h) {
                        return h.date && todayStr >= h.date && todayStr <= (h.dateTo || h.date);
                    });
                    if (onHoliday) return;
                }

                // Find first class + slot that covers now
                var matchedId = null, matchedSlot = null;
                Object.keys(classes).filter(k => !k.startsWith('_')).find(function (cid) {
                    if (rawMeta[cid] && rawMeta[cid].archived) return false;
                    var slot = (classes[cid].schedule || []).find(function (s) {
                        if (parseInt(s.day) !== dow) return false;
                        var start = s.time || '';
                        var end = s.timeEnd || (start ? _plannerTimeAdd(start, 60) : '');
                        return start && nowTime >= start && nowTime <= end;
                    });
                    if (slot) { matchedId = cid; matchedSlot = slot; return true; }
                });

                if (matchedId && rawMeta[matchedId] && !selectedGroupName) {
                    var halfGroup = (matchedSlot && matchedSlot.halfGroup) || null;
                    var btn = document.querySelector(`.btn-group[data-group="${CSS.escape(matchedId)}"][data-half="${halfGroup || ''}"]`)
                        || document.querySelector(`.btn-group[data-group="${CSS.escape(matchedId)}"]`);
                    if (matchedSlot) {
                        selectedPlannerSlot = {
                            day: matchedSlot.day,
                            time: (matchedSlot.time || '').slice(0, 5),
                            timeEnd: (matchedSlot.timeEnd || '').slice(0, 5),
                            halfGroup: matchedSlot.halfGroup || ''
                        };
                    }
                    if (matchedSlot && matchedSlot.time) {
                        var slotUuid = await resolvePlannerEntryUuid(matchedId, matchedSlot.time);
                        if (slotUuid) currentPlannerEntryId = slotUuid;
                    }
                    selectGroup(matchedId, halfGroup, btn);
                }
            } catch (e) {
                console.warn('planner auto-select:', e);
            }
        }

        async function initApp() {
            if (typeof _cmsInitGradesSync === 'function') _cmsInitGradesSync();
            await Promise.resolve(window.__cmUserBootstrapPromise).catch(function () { });
            await loadConfigFromDisk();

            let showDevFeatures = !!(getLoadedConfig()?.launcherSettings?.showDevFeatures);
            if (!showDevFeatures) {
                try {
                    const generalCfg = JSON.parse(localStorage.getItem('cmt-general-config') || '{}');
                    showDevFeatures = generalCfg.showDevFeatures === true;
                } catch (_) { }
            }
            const remoteBtn = document.getElementById('remote-settings-btn');
            if (remoteBtn) remoteBtn.style.display = showDevFeatures ? 'flex' : 'none';

            const config = getLoadedConfig();
            if (config?.classGroups && Object.keys(config.classGroups).length) {
                rawData = config.classGroups;
            } else if (typeof CLASS_GROUPS !== 'undefined') {
                rawData = CLASS_GROUPS;
            } else {
                console.warn('config.js not loaded — starting with empty groups.');
            }
            if (config?.classGroupsMeta) {
                rawMeta = config.classGroupsMeta;
            } else if (typeof CLASS_GROUPS_META !== 'undefined') {
                rawMeta = CLASS_GROUPS_META;
            }
            loadCustomSettingsFromConfig();
            await refreshSoundFileList(false);
            await _cmsLoadStudentRoster();
            buildStudentGroups();
            await loadPlannerClasses();
            renderGroupButtons();
            _updateActiveContextChip();
            // Apply saved UI toggle states
            syncRosterInlineToggleButtonStates();
            const _badgesToggleBtn = document.getElementById('badges-toggle-btn');
            if (_badgesToggleBtn) { _badgesToggleBtn.classList.toggle('badges-hidden', !badgesVisible); _badgesToggleBtn.innerHTML = badgesVisible ? 'Badges' : '<s>Badges</s>'; }
            const _rolesToggleBtn = document.getElementById('roles-toggle-btn');
            if (_rolesToggleBtn) { _rolesToggleBtn.classList.toggle('badges-hidden', !rolesVisible); _rolesToggleBtn.innerHTML = rolesVisible ? 'Roles' : '<s>Roles</s>'; }
            const _scoreMuteBtn = document.getElementById('score-mute-btn');
            if (_scoreMuteBtn) {
                const nextScoreSrc = scoreMuted ? '../assets/icons/mute.svg' : '../assets/icons/volume.svg';
                let scoreImg = _scoreMuteBtn.querySelector('img');
                if (!scoreImg) {
                    scoreImg = document.createElement('img');
                    scoreImg.className = 'btn-icon';
                    scoreImg.alt = '';
                    _scoreMuteBtn.textContent = '';
                    _scoreMuteBtn.appendChild(scoreImg);
                }
                if (window.DomSync) window.DomSync.setAttr(scoreImg, 'src', nextScoreSrc);
                else if (scoreImg.getAttribute('src') !== nextScoreSrc) scoreImg.setAttribute('src', nextScoreSrc);
                _scoreMuteBtn.title = scoreMuted ? 'Score sounds muted (click to unmute)' : 'Score sounds on (click to mute)';
                _scoreMuteBtn.style.color = scoreMuted ? '#bbb' : '#111';
            }
            _applyAppTitle();
            const _planAbbrevIn = document.getElementById('settings-plan-abbrev-len');
            if (_planAbbrevIn) _planAbbrevIn.value = planAbbrevLen;
            const _ndmRadio = document.querySelector(`input[name="nameDisplayMode"][value="${nameDisplayMode}"]`);
            if (_ndmRadio) _ndmRadio.checked = true;
            _syncRosterSortOrderInputs();
            renderCustomActionButtons();
            renderCustomButtonsModalEditor();

            var params = new URLSearchParams(window.location.search);
            var qClass = params.get('classId');
            var qPlannerEntryId = params.get('plannerEntryId');
            if (qPlannerEntryId) {
                currentPlannerEntryId = qPlannerEntryId;
            }
            var navRaw = localStorage.getItem('cmt-cm-nav');
            if (navRaw) {
                try {
                    var navObj = JSON.parse(navRaw);
                    if (navObj && navObj.plannerEntryId && !currentPlannerEntryId) {
                        currentPlannerEntryId = navObj.plannerEntryId;
                    }
                    if (navObj && navObj.classId && !qClass) {
                        qClass = navObj.classId;
                    }
                } catch (_) {}
                localStorage.removeItem('cmt-cm-nav');
            }

            if (qClass && studentGroups && studentGroups[qClass]) {
                if (!currentPlannerEntryId) {
                    var qDate = params.get('date') || '';
                    var resolvedId = await resolvePlannerEntryUuid(qClass, '', qDate);
                    if (resolvedId) currentPlannerEntryId = resolvedId;
                }
                selectGroup(qClass);
            } else {
                await autoSelectPlannerGroup();
            }

            var qTimerSec = parseInt(params.get('startTimerSec'), 10);
            if (qTimerSec > 0) {
                setTimeout(function () {
                    if (typeof startCountdownWithSeconds === 'function') {
                        startCountdownWithSeconds(qTimerSec);
                    } else if (typeof window.cmsStartExternalTimer === 'function') {
                        window.cmsStartExternalTimer(qTimerSec);
                    }
                }, 600);
            }
        }

        document.addEventListener('DOMContentLoaded', function () {
            if (typeof initHamburger === 'function') initHamburger();
        });

        initApp().catch(error => {
            console.warn('Failed to initialize app from config.js:', error);
            renderGroupButtons();
        });

        window.addEventListener('focus', () => {
            const modal = document.getElementById('edit-sounds-modal');
            if (!modal || modal.style.display !== 'flex') return;
            refreshSoundFileList(false).catch(error => console.warn('Unable to refresh sound file list on focus:', error));
        });

        function showHalfGroupPicker(groupName, anchorEl) {
            const existing = document.getElementById('half-group-picker-popup');
            if (existing) {
                existing.remove();
                if (existing.dataset.forGroup === groupName) return; // toggle off
            }
            const picker = document.createElement('div');
            picker.id = 'half-group-picker-popup';
            picker.className = 'half-group-picker';
            picker.dataset.forGroup = groupName;
            const opts = [
                { label: t('half_a_label'), value: 'A', cls: 'hg-a' },
                { label: t('half_b_label'), value: 'B', cls: 'hg-b' },
                { label: t('both_halves_label'), value: null, cls: 'hg-both' }
            ];
            opts.forEach(opt => {
                const b = document.createElement('button');
                b.className = 'half-group-picker-btn ' + opt.cls;
                b.textContent = opt.label;
                if (opt.value === selectedHalfGroup && selectedGroupName === groupName) b.classList.add('active');
                b.onclick = (e) => {
                    e.stopPropagation();
                    picker.remove();
                    selectGroup(groupName, opt.value, anchorEl);
                };
                picker.appendChild(b);
            });
            const rect = anchorEl.getBoundingClientRect();
            picker.style.left = rect.left + 'px';
            picker.style.top = (rect.bottom + 4) + 'px';
            document.body.appendChild(picker);
            setTimeout(() => {
                function closePicker(e) {
                    if (!picker.contains(e.target) && e.target !== anchorEl) {
                        picker.remove();
                        document.removeEventListener('click', closePicker, true);
                    }
                }
                document.addEventListener('click', closePicker, true);
            }, 0);
        }

        // ---- END HALF-GROUP HELPERS ------------------------------------

        // ---- ARCHIVE GROUP ----------------------------------------

        async function archiveGroup(groupName) {
            if (!rawMeta[groupName]) rawMeta[groupName] = {};
            rawMeta[groupName].archived = true;

            // Save updated meta to class-groups.js
            const result = await persistGroupsToUserFile(rawMeta);
            if (!result?.ok && result?.mode !== 'download') {
                showToast('Failed to save archive status: ' + (result?.error || 'unknown error'), true);
                delete rawMeta[groupName].archived;
                return;
            }

            // Move participation log folder to archived/
            if (window.Desktop && typeof window.Desktop.renameByPath === 'function') {
                try {
                    await window.Desktop.renameByPath(
                        'groupParticipation',
                        groupName,
                        'archived/' + groupName
                    );
                } catch (_) {
                    // Folder may not exist yet — silently ignore
                }
            }

            // Rebuild runtime state
            if (selectedGroupName === groupName) {
                selectedGroupName = null;
                selectedHalfGroup = null;
            }
            delete studentGroups[groupName];

            const container = document.getElementById('group-container');
            container.innerHTML = '';
            renderGroupButtons();

            if (selectedGroupName) {
                renderRoster();
                renderRanking();
            } else {
                document.getElementById('display-name').textContent = '--';
                document.getElementById('roster-list').innerHTML =
                    '<li style="color:#999; padding: 20px; text-align: center;">Select a group...</li>';
            }
        }

        async function unarchiveGroup(groupName) {
            if (!rawMeta[groupName]) rawMeta[groupName] = {};
            delete rawMeta[groupName].archived;

            const result = await persistGroupsToUserFile(rawMeta);
            if (!result?.ok && result?.mode !== 'download') {
                showToast('Failed to save unarchive status: ' + (result?.error || 'unknown error'), true);
                rawMeta[groupName].archived = true;
                return;
            }

            // Move participation log folder back from archived/
            if (window.Desktop && typeof window.Desktop.renameByPath === 'function') {
                try {
                    await window.Desktop.renameByPath(
                        'groupParticipation',
                        'archived/' + groupName,
                        groupName
                    );
                } catch (_) {
                    // Folder may not exist in archived/ — silently ignore
                }
            }

            // Re-add to runtime studentGroups
            if (!studentGroups[groupName]) {
                const rawList = _resolveStudentsForGroup(groupName).map(s => ({
                    id: Date.now() + Math.random(),
                    uuid: s.uuid || null,
                    name: s.name,
                    sen: !!s.sen,
                    isPicked: false,
                    isAbsent: false,
                    pluses: 0,
                    minuses: 0,
                    teamId: null
                }));
                studentGroups[groupName] = _ensureUniqueStudentSessionIds(rawList);
            }

            const container = document.getElementById('group-container');
            container.innerHTML = '';
            renderGroupButtons();
        }

        // ---- END ARCHIVE GROUP ------------------------------------

        let _addStudentsTargetRow = null;

        function openAddStudentsModal(newGroupName, targetRow) {
            _addStudentsTargetRow = targetRow;
            document.getElementById('add-students-subtitle').textContent =
                'Group: ' + newGroupName;
            document.getElementById('add-students-new').value = '';
            autoResizeEgStudents(document.getElementById('add-students-new'));

            // Build chip list from all unique students in roster (or rawData fallback pre-migration).
            const allStudents = Object.keys(studentRoster).length
                ? [...new Set(Object.values(studentRoster).map(s => ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase()).filter(Boolean))].sort()
                : [...new Set(Object.values(rawData).flat())].sort();
            const existingContainer = document.getElementById('add-students-existing');
            existingContainer.innerHTML = '';
            if (allStudents.length > 0) {
                const label = document.createElement('label');
                label.style.cssText = 'font-size:0.8rem; color:#888; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;';
                label.textContent = 'Pick from existing students';
                existingContainer.appendChild(label);
                const chips = document.createElement('div');
                chips.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px;';
                allStudents.forEach(student => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.textContent = student;
                    chip.dataset.selected = 'false';
                    chip.style.cssText = 'padding:4px 10px; border:1.5px solid #ccc; border-radius:16px; font-size:0.8rem; cursor:pointer; background:#f8f8f8; color:#333; transition:all 0.1s;';
                    chip.onclick = () => {
                        const sel = chip.dataset.selected === 'true';
                        chip.dataset.selected = sel ? 'false' : 'true';
                        chip.style.background = sel ? '#f8f8f8' : '#111';
                        chip.style.color = sel ? '#333' : '#fff';
                        chip.style.borderColor = sel ? '#ccc' : '#111';
                    };
                    chips.appendChild(chip);
                });
                existingContainer.appendChild(chips);
            }

            document.getElementById('add-students-modal').style.display = 'flex';
            setTimeout(() => document.getElementById('add-students-new').focus(), 80);
        }

        function closeAddStudentsModal() {
            document.getElementById('add-students-modal').style.display = 'none';
            _addStudentsTargetRow = null;
        }

        async function confirmAddStudents() {
            if (!_addStudentsTargetRow) { closeAddStudentsModal(); return; }

            const selectedChips = Array.from(
                document.querySelectorAll('#add-students-existing button[data-selected="true"]')
            ).map(btn => btn.textContent.trim());

            const typedNames = document.getElementById('add-students-new').value
                .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

            const allAdded = [...new Set([...selectedChips, ...typedNames])];

            if (allAdded.length > 0) {
                const studentsInput = _addStudentsTargetRow.querySelector('.eg-row-students');
                if (studentsInput) {
                    const existing = studentsInput.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                    const merged = [...new Set([...existing, ...allAdded])];
                    studentsInput.value = merged.join(', ');
                    autoResizeEgStudents(studentsInput);
                }
            }

            closeAddStudentsModal();
        }

        // ---- END ADD STUDENTS ------------------------------------------

        function autoResizeEgStudents(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }

        function _updateActiveContextChip() {
            const chip = document.getElementById('cms-active-context');
            if (!chip) return;
            const ay = (loadedConfigCache && loadedConfigCache.activeYear) || '';
            const as = (loadedConfigCache && loadedConfigCache.activeSemester) || null;
            if (ay || as) {
                chip.textContent = [ay, as ? 'S' + as : ''].filter(Boolean).join(' · ');
                chip.style.display = '';
            } else {
                chip.style.display = 'none';
            }
        }

        function buildGroupsFileContent(meta) {
            const metaLines = Object.keys(meta).map(uuid => {
                const m = meta[uuid] || {};
                const metaEntry = { year: m.year ?? '', semester: m.semester === '' ? '' : m.semester, level: m.level === '' ? '' : m.level };
                if (m.name) metaEntry.name = m.name;
                if (m.halfGroups && (m.halfGroups.A?.length || m.halfGroups.B?.length)) metaEntry.halfGroups = m.halfGroups;
                if (m.students && m.students.length) metaEntry.students = m.students;
                if (m.archived) metaEntry.archived = true;
                return `    ${JSON.stringify(uuid)}: ${JSON.stringify(metaEntry)}`;
            });
            const _ay = (loadedConfigCache && loadedConfigCache.activeYear) || '';
            const _as = (loadedConfigCache && loadedConfigCache.activeSemester) || null;
            const _ass = (loadedConfigCache && loadedConfigCache.activeSemesterStart) || '';
            const _ase = (loadedConfigCache && loadedConfigCache.activeSemesterEnd) || '';
            return [
                'const CLASS_GROUPS_DATA = {',
                `  "activeYear": ${JSON.stringify(_ay)},`,
                `  "activeSemester": ${JSON.stringify(_as)},`,
                `  "activeSemesterStart": ${JSON.stringify(_ass)},`,
                `  "activeSemesterEnd": ${JSON.stringify(_ase)},`,
                '  "classGroupsMeta": {',
                metaLines.join(',\n').split('\n').map(l => '  ' + l).join('\n'),
                '  }',
                '};',
                '',
                'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};',
                ''
            ].join('\n');
        }

        async function persistGroupsToUserFile(meta) {
            const content = buildGroupsFileContent(meta);

            if (window.Desktop && typeof window.Desktop.saveText === 'function') {
                try {
                    return await window.Desktop.saveText(CONFIG_FILE_TARGET, GROUPS_FILE_NAME, content);
                } catch (error) {
                    console.warn('Unable to save class-groups.js:', error);
                    return { ok: false, error: error?.message || 'Unable to save class-groups.js' };
                }
            }

            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = GROUPS_FILE_NAME;
            a.click();
            URL.revokeObjectURL(url);
            return { ok: true, mode: 'download' };
        }

        async function syncGradeSheetRenames(renames) {
            if (!window.Desktop || !Desktop.isElectron() || !renames.length) return;
            try {
                const listResult = await Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js'] });
                if (!listResult?.ok || !Array.isArray(listResult.files)) return;
                const classFiles = listResult.files.filter(f => f.filename === '_class.js');
                for (const { oldName, newName } of renames) {
                    for (const cf of classFiles) {
                        const res = await Desktop.readByPath('grades', cf.relativePath);
                        if (!res?.content) continue;
                        const match = res.content.match(/"className"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        if (!match || match[1] !== oldName) continue;
                        const patched = res.content.replace(
                            /"className"\s*:\s*"(?:[^"\\]|\\.)*"/,
                            `"className": ${JSON.stringify(newName)}`
                        );
                        const parts = cf.relativePath.split('/');
                        const subdir = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;
                        await Desktop.saveText('grades', '_class.js', patched, subdir);
                        break;
                    }
                }
            } catch (e) {
                console.warn('syncGradeSheetRenames failed:', e);
            }
        }

        function openEditTeamsModal() {
            openSettingsModal('teams');
        }

        function closeEditTeamsModal() {
            closeSettingsModal();
        }

        function syncTeamSettingsDraftFromModal() {
            const rows = Array.from(document.querySelectorAll('#edit-teams-body .team-settings-row'));
            if (!rows.length) return;

            const updated = rows.map((row, index) => {
                const fallback = buildDefaultTeamEntry(index);
                const existing = teamColors[index] || fallback;
                const nameVal = row.querySelector('.team-settings-name')?.value.trim() || existing.customName || existing.name || fallback.name;
                const fillVal = row.querySelector('.team-settings-hex')?.value || existing.hex || fallback.hex;
                const borderVal = row.querySelector('.team-settings-border')?.value || existing.border || fallback.border;
                return {
                    name: fallback.name,
                    hex: fillVal,
                    border: borderVal,
                    ...(nameVal && nameVal !== fallback.name ? { customName: nameVal } : {})
                };
            });

            teamColors.splice(0, teamColors.length, ...(updated.length ? updated : [buildDefaultTeamEntry(0)]));
        }

        function remapStudentTeamIds(idMap) {
            Object.values(studentGroups).forEach(group => {
                if (!Array.isArray(group)) return;
                group.forEach(student => {
                    if (typeof student.teamId === 'number' && idMap.has(student.teamId)) {
                        student.teamId = idMap.get(student.teamId);
                    }
                });
            });
        }

        function renderEditTeamsModal() {
            const body = document.getElementById('edit-teams-body');
            if (!body) return;

            body.innerHTML = teamColors.map((entry, index) => `
            <div class="team-settings-row" data-index="${index}" style="border:1px solid #ddd; border-radius:8px; background:#fafafa; padding:12px;">
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <div style="font-weight:800; color:#111; min-width:28px;">${index + 1}.</div>
                    <input type="text" class="team-settings-name" value="${escapeSettingsHtml(entry.customName || entry.name)}" placeholder="Team name"
                        style="flex:1; min-width:180px; padding:7px 9px; border:1px solid #ccc; border-radius:5px;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:#555; font-weight:700;">
                        Fill <input type="color" class="team-settings-hex" value="${escapeSettingsHtml(entry.hex)}" style="width:42px; height:34px; border:1px solid #ccc; border-radius:5px; background:#fff;">
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:#555; font-weight:700;">
                        Border <input type="color" class="team-settings-border" value="${escapeSettingsHtml(entry.border)}" style="width:42px; height:34px; border:1px solid #ccc; border-radius:5px; background:#fff;">
                    </label>
                    <button onclick="moveTeamDefinition(${index}, -1)" title="Move up" style="padding:7px 9px; border:2px solid #111; border-radius:5px; background:#fff; color:#111; font-weight:700; cursor:pointer;">↑</button>
                    <button onclick="moveTeamDefinition(${index}, 1)" title="Move down" style="padding:7px 9px; border:2px solid #111; border-radius:5px; background:#fff; color:#111; font-weight:700; cursor:pointer;">↓</button>
                    <button onclick="deleteTeamDefinition(${index})" style="padding:7px 10px; border:2px solid #b33; border-radius:5px; background:#fff; color:#b33; font-weight:700; cursor:pointer;">Remove</button>
                </div>
            </div>
        `).join('');
        }

        function addTeamDefinitionRow() {
            syncTeamSettingsDraftFromModal();
            teamColors.push(buildDefaultTeamEntry(teamColors.length));
            renderEditTeamsModal();
        }

        function moveTeamDefinition(index, direction) {
            syncTeamSettingsDraftFromModal();

            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= teamColors.length) return;

            const originalIds = teamColors.map((_, idx) => idx + 1);
            const reorderedIds = [...originalIds];
            const [movedId] = reorderedIds.splice(index, 1);
            reorderedIds.splice(targetIndex, 0, movedId);

            const [movedTeam] = teamColors.splice(index, 1);
            teamColors.splice(targetIndex, 0, movedTeam);

            const idMap = new Map();
            reorderedIds.forEach((oldId, newIndex) => idMap.set(oldId, newIndex + 1));
            remapStudentTeamIds(idMap);

            renderEditTeamsModal();
            renderRoster();
            renderRanking();
        }

        function deleteTeamDefinition(index) {
            if (teamColors.length <= 1) {
                showToast('At least one team must remain.');
                return;
            }

            syncTeamSettingsDraftFromModal();

            const removedTeamId = index + 1;
            const removedName = teamColors[index]?.customName || teamColors[index]?.name || `Team ${removedTeamId}`;
            showConfirm(`Delete ${removedName}? Students in that team will be unassigned.`, function () {
                teamColors.splice(index, 1);
                Object.values(studentGroups).forEach(group => {
                    if (!Array.isArray(group)) return;
                    group.forEach(student => {
                        if (student.teamId === removedTeamId) {
                            delete student.teamId;
                            delete student.role;
                        } else if (typeof student.teamId === 'number' && student.teamId > removedTeamId) {
                            student.teamId -= 1;
                        }
                    });
                });
                renderEditTeamsModal();
                renderRoster();
                renderRanking();
            });
        }

        async function saveTeamSettings() {
            syncTeamSettingsDraftFromModal();

            const result = await persistTeamSettings();
            if (!result?.ok) {
                showToast('Save failed: ' + (result?.error || 'Unable to save config.js'), true);
                return;
            }

            try { sessionStorage.removeItem('cms-session-team-names'); } catch (e) { }
            closeEditTeamsModal();
            renderRoster();
            renderRanking();
            mdbToast('Teams saved to config.js');
        }

        function resetTeamSettings() {
            teamColors.splice(0, teamColors.length, ...DEFAULT_TEAM_COLORS.map(entry => ({ ...entry })));
            try { sessionStorage.removeItem('cms-session-team-names'); } catch (e) { }
            persistTeamSettings();
            renderEditTeamsModal();
            renderRoster();
            renderRanking();
        }

        function findBadgeDef(icon, label) {
            if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.findBadgeDef === 'function') {
                return BadgeSets.findBadgeDef(icon, label, badgeDefinitions);
            }
            const normIcon = String(icon || '').trim();
            const normLabel = String(label || '').trim();
            return (badgeDefinitions || []).find(d => {
                if (normIcon && normLabel) return d.icon === normIcon && d.label === normLabel;
                if (normIcon) return d.icon === normIcon;
                return d.label === normLabel;
            }) || null;
        }

        async function applyBadgeSetForClass(classId) {
            if (!classId) return;
            const targetSetId = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.resolveForClass === 'function')
                ? BadgeSets.resolveForClass(classId, badgeSetSettings)
                : (badgeSetSettings?.defaultSetId || 'default');

            const loadedDefs = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.loadSet === 'function')
                ? await BadgeSets.loadSet(targetSetId, getLoadedConfig()?.badgeDefinitions, participationSettings?.plusMinusCoefficient)
                : null;

            if (loadedDefs && Array.isArray(loadedDefs)) {
                activeBadgeSetId = targetSetId;
                // Swap in-place preserving array identity
                badgeDefinitions.length = 0;
                badgeDefinitions.push(...loadedDefs);
            } else if (targetSetId !== 'default') {
                // Set file was missing or renamed -> fall back to default
                const missingMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                    ? i18n.t('eb_set_missing_toast', { set: targetSetId })
                    : `Badge set "${targetSetId}" not found. Reverted to default.`;
                showToast(missingMsg, true);
                const defaultDefs = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.loadSet === 'function')
                    ? await BadgeSets.loadSet('default', getLoadedConfig()?.badgeDefinitions, participationSettings?.plusMinusCoefficient)
                    : DEFAULT_BADGE_DEFINITIONS;
                activeBadgeSetId = 'default';
                badgeDefinitions.length = 0;
                badgeDefinitions.push(...(defaultDefs || DEFAULT_BADGE_DEFINITIONS));
            }

            updateCmsBadgeSetChip();
            if (typeof _remotePushStateDebounced === 'function') _remotePushStateDebounced();
        }

        function updateCmsBadgeSetChip() {
            const chip = document.getElementById('cms-badge-set-chip');
            const labelEl = document.getElementById('cms-badge-set-chip-label');
            if (!chip) return;
            if (!selectedGroupName) {
                chip.style.display = 'none';
                return;
            }
            const setName = (activeBadgeSetId === 'default') ? 'Default' : activeBadgeSetId;
            if (labelEl) labelEl.textContent = setName;
            const tooltip = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                ? i18n.t('eb_chip_tooltip', { set: setName })
                : `Active badge set: ${setName}. Click to configure.`;
            chip.title = tooltip;
            chip.style.display = 'inline-flex';
        }

        async function populateEditBadgesSetSelector(desiredSetId) {
            const select = document.getElementById('eb-set-select');
            const defAllCb = document.getElementById('eb-set-default-all-cb');
            if (!select) return;

            const sets = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.listSets === 'function')
                ? await BadgeSets.listSets()
                : [{ id: 'default', name: 'Default (config.js)' }];

            const curClassSet = selectedGroupName && badgeSetSettings?.classSets
                ? (badgeSetSettings.classSets[selectedGroupName] || badgeSetSettings.defaultSetId || 'default')
                : (badgeSetSettings?.defaultSetId || 'default');

            const targetSetId = desiredSetId || (select.value && sets.some(s => s.id === select.value) ? select.value : curClassSet);

            select.innerHTML = sets.map(s => {
                const label = s.isDefault ? t('eb_set_default', 'Default (config.js)') : s.name;
                return `<option value="${escapeSettingsHtml(s.id)}" ${s.id === targetSetId ? 'selected' : ''}>${escapeSettingsHtml(label)}</option>`;
            }).join('');

            modalEditingSetId = select.value || targetSetId || 'default';
            if (defAllCb) {
                defAllCb.checked = (badgeSetSettings?.defaultSetId === modalEditingSetId);
            }
            updateEditBadgesSaveButtonLabel();
            renderAssignedClassesSection();
        }

        function renderAssignedClassesSection() {
            const section = document.getElementById('eb-classes-section');
            const grid = document.getElementById('eb-classes-grid');
            const linkNoticeText = document.getElementById('eb-link-notice-text');
            if (!section || !grid) return;

            if (modalEditingSetId === 'default') {
                // When "default" is selected, hide the per-class custom assignment list
                section.style.display = 'none';
                return;
            }

            // When a custom badge set is selected (i.e. unselecting "default")
            section.style.display = 'block';

            if (linkNoticeText) {
                const fileName = modalEditingSetId + '.js';
                linkNoticeText.textContent = `Linked file: user/custom-data/badges/${fileName}`;
            }

            const allGroups = (typeof studentGroups !== 'undefined' && studentGroups)
                ? Object.keys(studentGroups).filter(g => !rawMeta[g]?.archived)
                : [];

            if (!allGroups.length) {
                grid.innerHTML = `<span style="font-size:0.82rem;color:#888;">${t('eb_classes_none_created', 'No classes available.')}</span>`;
                return;
            }

            grid.innerHTML = allGroups.map(groupId => {
                const groupName = (rawMeta && rawMeta[groupId]?.name) ? rawMeta[groupId].name : groupId;
                // A class uses this set if explicitly mapped, or if this set is the defaultSetId and class has no override
                const assignedSet = badgeSetSettings.classSets?.[groupId] || badgeSetSettings.defaultSetId || 'default';
                const isAssigned = (assignedSet === modalEditingSetId);
                const isCurrentClass = (selectedGroupName === groupId);

                return `
                    <label class="badge-set-class-pill ${isAssigned ? 'selected' : ''}" title="${escapeSettingsHtml(groupName)}">
                        <input type="checkbox" style="display:none;" value="${escapeSettingsHtml(groupId)}" ${isAssigned ? 'checked' : ''} onchange="onToggleClassBadgeSet('${escapeSettingsHtml(groupId)}', this.checked)">
                        <span>${escapeSettingsHtml(groupName)}</span>
                        ${isCurrentClass ? `<span style="font-size:0.70rem;background:#333;color:#fff;padding:1px 5px;border-radius:4px;margin-left:2px;">current</span>` : ''}
                        <span>${isAssigned ? '✓' : ''}</span>
                    </label>
                `;
            }).join('');
        }

        async function onToggleClassBadgeSet(classId, isChecked) {
            if (!badgeSetSettings.classSets) badgeSetSettings.classSets = {};
            if (isChecked) {
                badgeSetSettings.classSets[classId] = modalEditingSetId;
            } else {
                if (badgeSetSettings.classSets[classId] === modalEditingSetId) {
                    delete badgeSetSettings.classSets[classId];
                }
            }
            renderAssignedClassesSection();

            // Persist assignment mapping to config.js immediately
            await persistBadgeSettings();

            // If the toggled class is currently active in Class Management, update activeBadgeSetId and chip
            if (selectedGroupName === classId) {
                await applyBadgeSetForClass(classId);
                renderRoster();
            }
        }

        async function selectAllClassesForBadgeSet(select) {
            if (!badgeSetSettings.classSets) badgeSetSettings.classSets = {};
            const allGroups = (typeof studentGroups !== 'undefined' && studentGroups)
                ? Object.keys(studentGroups).filter(g => !rawMeta[g]?.archived)
                : [];

            allGroups.forEach(groupId => {
                if (select) {
                    badgeSetSettings.classSets[groupId] = modalEditingSetId;
                } else {
                    if (badgeSetSettings.classSets[groupId] === modalEditingSetId) {
                        delete badgeSetSettings.classSets[groupId];
                    }
                }
            });

            renderAssignedClassesSection();
            await persistBadgeSettings();

            if (selectedGroupName) {
                await applyBadgeSetForClass(selectedGroupName);
                renderRoster();
            }
        }

        async function onEditBadgesSetChange(newSetId) {
            modalEditingSetId = newSetId || 'default';
            const defAllCb = document.getElementById('eb-set-default-all-cb');
            if (defAllCb) {
                defAllCb.checked = (badgeSetSettings?.defaultSetId === modalEditingSetId);
            }
            updateEditBadgesSaveButtonLabel();
            renderAssignedClassesSection();

            // Auto-assign to current class if chosen
            if (selectedGroupName) {
                if (!badgeSetSettings.classSets) badgeSetSettings.classSets = {};
                if (modalEditingSetId === (badgeSetSettings.defaultSetId || 'default')) {
                    delete badgeSetSettings.classSets[selectedGroupName];
                } else {
                    badgeSetSettings.classSets[selectedGroupName] = modalEditingSetId;
                }
                await persistBadgeSettings();
                renderAssignedClassesSection();
            }

            // Load definitions for the selected set
            const loaded = (typeof BadgeSets !== 'undefined' && typeof BadgeSets.loadSet === 'function')
                ? await BadgeSets.loadSet(modalEditingSetId, getLoadedConfig()?.badgeDefinitions, participationSettings?.plusMinusCoefficient)
                : null;

            if (loaded && Array.isArray(loaded)) {
                badgeDefinitions.length = 0;
                badgeDefinitions.push(...loaded);
                activeBadgeSetId = modalEditingSetId;
                updateCmsBadgeSetChip();
                renderEditBadgesModal();
                if (selectedGroupName) renderRoster();
            }
        }

        function updateEditBadgesSaveButtonLabel() {
            const btn = document.getElementById('eb-save-btn');
            if (!btn) return;
            if (modalEditingSetId === 'default') {
                btn.textContent = t('eb_save_btn', 'Save to config.js');
            } else {
                const fileLabel = modalEditingSetId + '.js';
                btn.textContent = tFmt ? tFmt('eb_save_to_file', { file: fileLabel }) : `Save to ${fileLabel}`;
            }
        }

        function openManageDatabaseForBadges() {
            if (window.Desktop && typeof window.Desktop.openTool === 'function') {
                window.Desktop.openTool('manage-database.html', { query: { type: 'badgebanks' } });
            } else {
                window.open('manage-database.html?type=badgebanks', '_blank');
            }
        }

        async function openEditBadgesModal() {
            await openSettingsModal('badges');
        }

        function closeEditBadgesModal() {
            closeSettingsModal();
        }

        function renderEditBadgesModal() {
            const body = document.getElementById('edit-badges-body');
            if (!body) return;

            body.innerHTML = (badgeDefinitions.map((badge, index) => {
                const isBuiltin = badge.isBuiltin === true;
                const toneLabel = badge.tone === 'negative' ? 'Negative' : 'Positive';
                const tonePill = badge.tone === 'negative'
                    ? '<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:12px;background:#fde8e8;border:1px solid #e9b9b9;color:#8a1c1c;font-size:0.8rem;font-weight:600;">Negative</span>'
                    : '<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:12px;background:#e8f8e8;border:1px solid #b7e0b7;color:#0c5c2a;font-size:0.8rem;font-weight:600;">Positive</span>';

                if (isBuiltin) {
                    return `
                <div class="badge-editor-row" data-index="${index}" data-builtin="true" data-tone="${badge.tone}" style="border:1px solid #b0c4de; border-radius:8px; background:#f0f6ff; padding:12px;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                        <input type="text" class="badge-editor-icon" value="${escapeSettingsHtml(badge.icon)}" disabled
                            style="width:72px; padding:7px 8px; border:1px solid #b0c4de; border-radius:5px; text-align:center; font-size:1rem; background:#e8eef8; color:#555; cursor:default;">
                        <input type="text" class="badge-editor-label" value="${escapeSettingsHtml(badge.label)}" placeholder="Label"
                            style="flex:1; min-width:140px; padding:7px 9px; border:1px solid #ccc; border-radius:5px;">
                        ${tonePill}
                        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap;" title="Multiplier applied to this mark in the Net score">
                            ×<input type="number" class="badge-editor-coeff" value="${badge.coefficient !== undefined ? badge.coefficient : 1}" min="0" step="0.1"
                                style="width:56px; padding:5px 6px; border:1px solid #ccc; border-radius:5px; font-size:0.85rem;" title="Score coefficient">
                        </label>
                        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap;">
                            <span>scope</span>
                            <select class="badge-editor-scope" style="padding:5px 8px; border:1px solid #ccc; border-radius:5px; font-size:0.84rem;">
                                <option value="individual" ${normalizeBadgeScope(badge.scope) === 'individual' ? 'selected' : ''}>Individual</option>
                                <option value="team" ${normalizeBadgeScope(badge.scope) === 'team' ? 'selected' : ''}>Team</option>
                                <option value="both" ${normalizeBadgeScope(badge.scope) === 'both' ? 'selected' : ''}>Both</option>
                            </select>
                        </label>
                        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap; cursor:pointer;" title="Hide this badge from the award lists">
                            <input type="checkbox" class="badge-editor-hidden" ${badge.hidden ? 'checked' : ''}
                                style="width:14px; height:14px; cursor:pointer;">
                            hidden
                        </label>
                        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap; cursor:pointer;" title="Automatically strike through this student when the badge is awarded">
                            <input type="checkbox" class="badge-editor-strike" ${badge.strikeOnAward ? 'checked' : ''}
                                style="width:14px; height:14px; cursor:pointer;">
                            strike
                        </label>
                        <span style="font-size:0.72rem; color:#2255aa; font-style:italic; white-space:nowrap;">built-in</span>
                    </div>
                    <textarea class="badge-editor-meaning" placeholder="Meaning / note"
                        style="width:100%; min-height:40px; padding:8px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box; resize:vertical;">${escapeSettingsHtml(badge.meaning || '')}</textarea>
                </div>`;
                }

                return `
            <div class="badge-editor-row" data-index="${index}" style="border:1px solid #ddd; border-radius:8px; background:#fafafa; padding:12px;">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                    <input type="text" class="badge-editor-icon" value="${escapeSettingsHtml(badge.icon)}" placeholder="Logo" maxlength="8"
                        style="width:72px; padding:7px 8px; border:1px solid #ccc; border-radius:5px; text-align:center; font-size:1rem;">
                    <input type="text" class="badge-editor-label" value="${escapeSettingsHtml(badge.label)}" placeholder="Badge name"
                        style="flex:1; min-width:140px; padding:7px 9px; border:1px solid #ccc; border-radius:5px;">
                    <select class="badge-editor-tone" style="width:110px; padding:7px 8px; border:1px solid #ccc; border-radius:5px;">
                        <option value="positive" ${badge.tone === 'positive' ? 'selected' : ''}>Positive</option>
                        <option value="negative" ${badge.tone === 'negative' ? 'selected' : ''}>Negative</option>
                    </select>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap;" title="Multiplier applied to this badge in the Net score">
                        ×<input type="number" class="badge-editor-coeff" value="${badge.coefficient !== undefined ? badge.coefficient : 1}" min="0" step="0.1"
                            style="width:56px; padding:5px 6px; border:1px solid #ccc; border-radius:5px; font-size:0.85rem;" title="Score coefficient">
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap;">
                        <span>scope</span>
                        <select class="badge-editor-scope" style="padding:5px 8px; border:1px solid #ccc; border-radius:5px; font-size:0.84rem;">
                            <option value="individual" ${normalizeBadgeScope(badge.scope) === 'individual' ? 'selected' : ''}>Individual</option>
                            <option value="team" ${normalizeBadgeScope(badge.scope) === 'team' ? 'selected' : ''}>Team</option>
                            <option value="both" ${normalizeBadgeScope(badge.scope) === 'both' ? 'selected' : ''}>Both</option>
                        </select>
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap; cursor:pointer;" title="Show this badge directly in the roster card instead of in the popup">
                        <input type="checkbox" class="badge-editor-inline" ${badge.inlineInRoster ? 'checked' : ''}
                            style="width:14px; height:14px; cursor:pointer;">
                        inline
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap; cursor:pointer;" title="Hide this badge from the award lists">
                        <input type="checkbox" class="badge-editor-hidden" ${badge.hidden ? 'checked' : ''}
                            style="width:14px; height:14px; cursor:pointer;">
                        hidden
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#555; white-space:nowrap; cursor:pointer;" title="Automatically strike through this student when the badge is awarded">
                        <input type="checkbox" class="badge-editor-strike" ${badge.strikeOnAward ? 'checked' : ''}
                            style="width:14px; height:14px; cursor:pointer;">
                        strike
                    </label>
                    <button onclick="deleteBadgeDefinition(${index})" style="padding:7px 10px; border:2px solid #b33; border-radius:5px; background:#fff; color:#b33; font-weight:700; cursor:pointer;">Remove</button>
                </div>
                <textarea class="badge-editor-meaning" placeholder="Meaning / note"
                    style="width:100%; min-height:40px; padding:8px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box; resize:vertical;">${escapeSettingsHtml(badge.meaning || '')}</textarea>
            </div>`;
            }).join('') || '<div style="padding:12px; border:1px dashed #ccc; border-radius:8px; color:#666;">No badges defined yet. Add one below.</div>');
        }

        function addBadgeDefinitionRow() {
            badgeDefinitions.push({ icon: '🏅', label: 'New Badge', tone: 'positive', meaning: '', scope: 'individual', hidden: false });
            renderEditBadgesModal();
        }

        function deleteBadgeDefinition(index) {
            const badge = badgeDefinitions[index];
            if (!badge) return;
            if (badge.isBuiltin) return; // built-in entries cannot be removed

            const badgeName = [badge.icon, badge.label].filter(Boolean).join(' ').trim() || 'this badge';
            showConfirm(`Delete ${badgeName}?`, function () {
                badgeDefinitions.splice(index, 1);
                renderEditBadgesModal();
            });
        }

        async function saveBadgeSettings() {
            const rows = Array.from(document.querySelectorAll('#edit-badges-body .badge-editor-row'));
            const updated = rows.map(row => {
                const isBuiltin = row.dataset.builtin === 'true';
                const tone = isBuiltin ? row.dataset.tone : (row.querySelector('.badge-editor-tone')?.value || 'positive');
                const inlineInRoster = isBuiltin ? true : (row.querySelector('.badge-editor-inline')?.checked || false);
                const scope = normalizeBadgeScope(row.querySelector('.badge-editor-scope')?.value || 'individual');
                const hidden = row.querySelector('.badge-editor-hidden')?.checked || false;
                const strikeOnAward = row.querySelector('.badge-editor-strike')?.checked || false;
                return {
                    icon: row.querySelector('.badge-editor-icon')?.value || '',
                    label: row.querySelector('.badge-editor-label')?.value || '',
                    tone,
                    meaning: row.querySelector('.badge-editor-meaning')?.value || '',
                    coefficient: parseFloat(row.querySelector('.badge-editor-coeff')?.value ?? 1),
                    inlineInRoster,
                    scope,
                    hidden,
                    strikeOnAward,
                    ...(isBuiltin ? { isBuiltin: true } : {})
                };
            });

            const norm = normalizeBadgeDefinitions(updated.length ? updated : DEFAULT_BADGE_DEFINITIONS);
            badgeDefinitions.length = 0;
            badgeDefinitions.push(...(norm.length ? norm : DEFAULT_BADGE_DEFINITIONS.map(entry => ({ ...entry }))));

            // Derive plusMinusCoefficient from the + badge for backward compat
            const plusBadge = badgeDefinitions.find(d => d.isBuiltin && d.icon === '+');
            participationSettings = normalizeParticipationSettings({
                ...participationSettings,
                plusMinusCoefficient: plusBadge && Number.isFinite(plusBadge.coefficient) ? plusBadge.coefficient : participationSettings.plusMinusCoefficient
            });

            // Update badgeSetSettings mappings
            const select = document.getElementById('eb-set-select');
            const chosenSetId = select ? select.value : modalEditingSetId;
            const defAllCb = document.getElementById('eb-set-default-all-cb');

            if (defAllCb && defAllCb.checked) {
                badgeSetSettings.defaultSetId = chosenSetId;
            }
            if (selectedGroupName) {
                if (chosenSetId === badgeSetSettings.defaultSetId) {
                    delete badgeSetSettings.classSets[selectedGroupName];
                } else {
                    badgeSetSettings.classSets[selectedGroupName] = chosenSetId;
                }
            }

            // Save to file or config.js
            let saveSuccess = false;
            if (chosenSetId !== 'default' && window.Desktop && window.Desktop.isElectron && window.Desktop.isElectron()) {
                const cleanDefsForBank = badgeDefinitions.filter(d => !d.isBuiltin);
                const jsContent = `var customBadgeBank = ${JSON.stringify(cleanDefsForBank, null, 2)};\n`;
                const filename = chosenSetId + '.js';
                const fileSaveRes = await window.Desktop.saveText('customBadges', filename, jsContent);
                if (fileSaveRes?.ok) {
                    if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.setCachedDefs === 'function') {
                        BadgeSets.setCachedDefs(chosenSetId, badgeDefinitions);
                    }
                    saveSuccess = true;
                } else {
                    showToast('Save failed: ' + (fileSaveRes?.error || 'Unable to save ' + filename), true);
                    return;
                }
            } else {
                if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.setCachedDefs === 'function') {
                    BadgeSets.setCachedDefs('default', badgeDefinitions);
                }
            }

            const result = await persistBadgeSettings();
            if (!result?.ok) {
                showToast('Save failed: ' + (result?.error || 'Unable to save config.js'), true);
                return;
            }

            activeBadgeSetId = chosenSetId;
            updateCmsBadgeSetChip();
            closeEditBadgesModal();
            renderRoster();
            const toastMsg = (chosenSetId === 'default') ? 'Badges saved to config.js' : `Badges saved to ${chosenSetId}.js`;
            mdbToast(toastMsg);
            if (typeof _remotePushStateDebounced === 'function') _remotePushStateDebounced();
        }

        async function resetBadgeSettings() {
            badgeDefinitions = DEFAULT_BADGE_DEFINITIONS.map(entry => ({ ...entry }));
            const plusBadge = badgeDefinitions.find(d => d.isBuiltin && d.icon === '+');
            participationSettings = normalizeParticipationSettings({
                ...participationSettings,
                plusMinusCoefficient: plusBadge && Number.isFinite(plusBadge.coefficient) ? plusBadge.coefficient : 1
            });
            if (modalEditingSetId === 'default') {
                if (typeof BadgeSets !== 'undefined' && typeof BadgeSets.setCachedDefs === 'function') {
                    BadgeSets.setCachedDefs('default', badgeDefinitions);
                }
                persistBadgeSettings();
            }
            renderEditBadgesModal();
            renderRoster();
        }

        function getSoundPresetOptions(slotKey) {
            const map = {
                timerEnd: [
                    { value: 'beep', label: 'Classic Beeps' },
                    { value: 'gavel', label: 'Gavel' },
                    { value: 'chime', label: 'Chime' },
                    { value: 'bell', label: 'Bell' }
                ],
                timerBackground: [
                    { value: 'none', label: 'No built-in preset' }
                ],
                drumroll: [
                    { value: 'classic', label: 'Classic Drumroll' }
                ],
                gavelAlarm: [
                    { value: 'gavel', label: 'Gavel' },
                    { value: 'bell', label: 'Bell' },
                    { value: 'beep', label: 'Beep' }
                ],
                scorePositive: [
                    { value: 'jingle', label: 'Success Jingle' },
                    { value: 'bell', label: 'Bell' },
                    { value: 'pop', label: 'Pop' }
                ],
                scoreNegative: [
                    { value: 'buzzer', label: 'Buzzer' },
                    { value: 'thunk', label: 'Low Thunk' },
                    { value: 'tap', label: 'Wood Tap' }
                ]
            };
            return map[slotKey] || [];
        }

        function getSoundTuneOptions() {
            return [
                { value: '130.81', label: 'C3 (130.81 Hz)' },
                { value: '146.83', label: 'D3 (146.83 Hz)' },
                { value: '164.81', label: 'E3 (164.81 Hz)' },
                { value: '174.61', label: 'F3 (174.61 Hz)' },
                { value: '196.00', label: 'G3 (196.00 Hz)' },
                { value: '220.00', label: 'A3 (220.00 Hz)' },
                { value: '246.94', label: 'B3 (246.94 Hz)' },
                { value: '261.63', label: 'C4 (261.63 Hz)' },
                { value: '293.66', label: 'D4 (293.66 Hz)' },
                { value: '329.63', label: 'E4 (329.63 Hz)' },
                { value: '349.23', label: 'F4 (349.23 Hz)' },
                { value: '392.00', label: 'G4 (392.00 Hz)' },
                { value: '440.00', label: 'A4 (440.00 Hz)' },
                { value: '493.88', label: 'B4 (493.88 Hz)' },
                { value: '523.25', label: 'C5 (523.25 Hz)' },
                { value: '587.33', label: 'D5 (587.33 Hz)' },
                { value: '659.25', label: 'E5 (659.25 Hz)' },
                { value: '698.46', label: 'F5 (698.46 Hz)' },
                { value: '783.99', label: 'G5 (783.99 Hz)' },
                { value: '880.00', label: 'A5 (880.00 Hz)' },
                { value: '987.77', label: 'B5 (987.77 Hz)' },
                { value: '1046.50', label: 'C6 (1046.50 Hz)' }
            ];
        }

        function getSoundRhythmOptions() {
            return [
                { value: 'staccato', label: 'Staccato', duration: 0.07, gap: 0.04 },
                { value: 'short', label: 'Short', duration: 0.12, gap: 0.03 },
                { value: 'medium', label: 'Medium', duration: 0.18, gap: 0.04 },
                { value: 'long', label: 'Long', duration: 0.28, gap: 0.05 },
                { value: 'hold', label: 'Hold', duration: 0.42, gap: 0.06 }
            ];
        }

        function getSoundRhythmMeta(value) {
            return getSoundRhythmOptions().find(entry => entry.value === value) || getSoundRhythmOptions()[2];
        }

        function getDefaultSoundJsExample(slotKey) {
            const defaults = normalizeSoundSlot(DEFAULT_SOUND_SETTINGS[slotKey], DEFAULT_SOUND_SETTINGS[slotKey]);
            return buildSoundJsFromBuilder(slotKey, defaults.builder, defaults.wave);
        }

        function buildSoundJsFromBuilder(slotKey, rows, wave = 'sine') {
            const safeRows = normalizeSoundBuilderRows(rows, DEFAULT_SOUND_SETTINGS[slotKey]?.builder || []);
            const safeWave = ['sine', 'triangle', 'square', 'sawtooth'].includes(String(wave || '').trim()) ? wave : 'sine';
            const volume = slotKey === 'scoreNegative' ? 0.06 : 0.08;
            const filterFrequency = slotKey === 'scoreNegative' ? 1200 : 5200;
            const lines = ['// Generated from the tune builder', 'let offset = 0;'];

            safeRows.forEach(row => {
                const rhythm = getSoundRhythmMeta(row.rhythm);
                const freq = Math.max(40, Number(row.frequency) || 440).toFixed(2);
                lines.push(`playTone(${freq}, { type: '${safeWave}', startTime: now + offset, duration: ${rhythm.duration.toFixed(2)}, volume: ${volume.toFixed(2)}, filterFrequency: ${filterFrequency} });`);
                lines.push(`offset += ${(rhythm.duration + rhythm.gap).toFixed(2)};`);
            });

            return lines.join('\n');
        }

        async function loadSoundFilesFromConfig(forceReload = false) {
            const config = forceReload ? await loadConfigFromDisk(true) : getLoadedConfig();
            return normalizeSoundFileList(config?.soundFiles);
        }

        async function importSoundFiles() {
            if (!window.Desktop || !Desktop.isElectron()) return;
            const r = await Desktop.pickAndCopyFiles('data', {
                subdir: 'sounds',
                filters: [{ name: t('es_import_audio_filter') || 'Audio files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }],
                title: t('es_import_btn') || 'Select audio files to import'
            });
            if (!r || r.canceled) return;
            if (r.errors && r.errors.length) {
                const names = r.errors.map(e => e.name).join(', ');
                if (typeof mdbToast === 'function') mdbToast('' + (t('es_import_errors') || 'Some files could not be imported') + ': ' + names);
                else showToast('' + (t('es_import_errors') || 'Some files could not be imported') + ': ' + names);
            }
            if (r.copied && r.copied.length) {
                await refreshSoundFileList(true);
            }
        }

        async function refreshSoundFileList(showFeedback = false) {
            const previousFiles = normalizeSoundFileList(availableSoundFiles);
            availableSoundFiles = [];
            const isElectron = !!(window.Desktop && Desktop.isElectron && Desktop.isElectron());
            let electronScanAttempted = false;

            if (isElectron && typeof window.Desktop.listByPath === 'function') {
                electronScanAttempted = true;
                try {
                    const response = await window.Desktop.listByPath('data', 'sounds', {
                        extensions: SOUND_FILE_EXTENSIONS,
                        recursive: true
                    });
                    const rawFiles = Array.isArray(response)
                        ? response
                        : (Array.isArray(response?.files) ? response.files : []);
                    const files = rawFiles.filter(entry => !entry?.isDirectory);
                    availableSoundFiles = files
                        .map(entry => String(entry?.relativePath || entry?.filename || '').trim())
                        .filter(Boolean);

                    // Filter out common non-sound / hidden / temp system files if extensions list is open
                    const audioExtRegex = /\.(mp3|wav|ogg|m4a|aac|flac|webm|weba|opus|mp4)$/i;
                    const systemFilesRegex = /(^|[\\/])(\.DS_Store|desktop\.ini|Thumbs\.db|\.gitkeep)$/i;
                    availableSoundFiles = availableSoundFiles.filter(file => {
                        if (systemFilesRegex.test(file)) return false;
                        if (SOUND_FILE_EXTENSIONS.length > 0) return true;
                        return audioExtRegex.test(file) || !/\.(txt|json|md|csv|bak|tmp|zip|pdf|html|css|js)$/i.test(file);
                    });

                    const previousSoundFiles = normalizeSoundFileList(getLoadedConfig().soundFiles);
                    availableSoundFiles = normalizeSoundFileList(availableSoundFiles);
                    buildConfigPayload({ soundFiles: availableSoundFiles });
                    if (typeof window !== 'undefined') {
                        window.CLASS_MANAGEMENT_CONFIG = loadedConfigCache;
                    }
                    if (JSON.stringify(previousSoundFiles) !== JSON.stringify(availableSoundFiles)) {
                        persistSettingsToUserFile({ soundFiles: availableSoundFiles }).catch(error => {
                            console.warn('Unable to sync sound file list into config.js:', error);
                        });
                    }
                } catch (error) {
                    console.warn('Unable to list sound files dynamically in Electron:', error);
                }
            }

            if (!availableSoundFiles.length && !electronScanAttempted) {
                availableSoundFiles = await loadSoundFilesFromConfig(true);
            }

            if (showFeedback) {
                const message = availableSoundFiles.length
                    ? `${availableSoundFiles.length} sound file${availableSoundFiles.length === 1 ? '' : 's'} found in user/custom-data/sounds (including subfolders)`
                    : 'No sound files found in user/custom-data/sounds yet';
                if (typeof mdbToast === 'function') mdbToast(message);
                else showToast(message);
            }

            const filesChanged = !areSoundFileListsEqual(previousFiles, availableSoundFiles);
            const modal = document.getElementById('edit-sounds-modal');
            if (modal && modal.style.display === 'flex' && filesChanged) {
                refreshSoundFileSelectOptions();
            }
        }

        function stopSoundFileAutoRefresh() {
            if (soundFileRefreshTimer) {
                clearInterval(soundFileRefreshTimer);
                soundFileRefreshTimer = null;
            }
            soundFileRefreshInFlight = false;
        }

        function startSoundFileAutoRefresh() {
            stopSoundFileAutoRefresh();
            const isElectron = !!(window.Desktop && Desktop.isElectron && Desktop.isElectron());
            if (!isElectron) return;

            soundFileRefreshTimer = setInterval(async () => {
                const modal = document.getElementById('edit-sounds-modal');
                if (!modal || modal.style.display !== 'flex' || soundFileRefreshInFlight) return;

                soundFileRefreshInFlight = true;
                try {
                    await refreshSoundFileList(false);
                } catch (error) {
                    console.warn('Unable to auto-refresh sound file list:', error);
                } finally {
                    soundFileRefreshInFlight = false;
                }
            }, SOUND_FILE_REFRESH_MS);
        }

        function buildSoundBuilderRowsHtml(slotKey, rows) {
            const tuneOptions = getSoundTuneOptions();
            const rhythmOptions = getSoundRhythmOptions();
            const safeRows = normalizeSoundBuilderRows(rows, DEFAULT_SOUND_SETTINGS[slotKey]?.builder || []);

            return safeRows.map((row, index) => {
                const freqValue = (Math.max(40, Number(row.frequency) || 440)).toFixed(2);
                const hasPresetMatch = tuneOptions.some(opt => opt.value === freqValue);
                const tuneMarkup = tuneOptions
                    .map(opt => `<option value="${opt.value}" ${opt.value === freqValue ? 'selected' : ''}>${escapeSettingsHtml(opt.label)}</option>`)
                    .join('') + (!hasPresetMatch ? `<option value="${freqValue}" selected>Custom (${freqValue} Hz)</option>` : '');
                const rhythmMarkup = rhythmOptions
                    .map(opt => `<option value="${opt.value}" ${opt.value === row.rhythm ? 'selected' : ''}>${escapeSettingsHtml(opt.label)}</option>`)
                    .join('');

                return `
                <div class="sound-builder-row" data-index="${index}" style="display:grid; grid-template-columns:minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(130px, 1fr) auto; gap:8px; align-items:end; margin-bottom:8px;">
                    <label style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#555; font-weight:700;">
                        Tune (frequency)
                        <select class="sound-tune-select" onchange="syncSoundTuneFrequency('${slotKey}', ${index}); syncSoundBuilderToTextarea('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">${tuneMarkup}</select>
                    </label>
                    <label style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#555; font-weight:700;">
                        Hz
                        <input type="number" class="sound-tune-frequency" value="${escapeSettingsHtml(freqValue)}" min="40" max="4000" step="0.01" oninput="syncSoundBuilderToTextarea('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                    </label>
                    <label style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#555; font-weight:700;">
                        Rhythm
                        <select class="sound-rhythm" onchange="syncSoundBuilderToTextarea('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">${rhythmMarkup}</select>
                    </label>
                    <button onclick="removeSoundBuilderRow('${slotKey}', ${index})" title="Remove tune" style="padding:8px 10px; border:2px solid #b33; border-radius:5px; background:#fff; color:#b33; font-weight:700; cursor:pointer;"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
                </div>`;
            }).join('');
        }

        function buildSoundEditorCard(slotKey, title, hint) {
            const cfg = normalizeSoundSettings(soundSettings)[slotKey];
            const presetOptions = getSoundPresetOptions(slotKey)
                .map(opt => `<option value="${escapeSettingsHtml(opt.value)}" ${cfg.preset === opt.value ? 'selected' : ''}>${escapeSettingsHtml(opt.label)}</option>`)
                .join('');
            const fileOptions = buildSoundFileOptionsHtml(cfg.file);
            const waveOptions = ['sine', 'triangle', 'square', 'sawtooth']
                .map(type => `<option value="${type}" ${cfg.wave === type ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`)
                .join('');

            return `
            <div class="sound-editor-card" data-sound-slot="${slotKey}" style="border:1px solid #ddd; border-radius:8px; background:#fafafa; padding:12px;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap; margin-bottom:8px;">
                    <div>
                        <div style="font-weight:800; color:#111;">${title}</div>
                        <div style="font-size:0.82rem; color:#666; margin-top:2px;">${hint}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:#555; font-weight:700; white-space:nowrap;">
                            
                            <input type="range" class="sound-volume-slider" min="0" max="100" value="${cfg.volume}" step="1"
                                oninput="this.nextElementSibling.textContent = this.value"
                                style="width:80px; cursor:pointer; accent-color:#111;">
                            <span class="sound-volume-display" style="min-width:2.2em; text-align:right;">${cfg.volume}</span>
                        </label>
                        <button class="sound-test-btn" onclick="testSoundFromEditor('${slotKey}')" style="padding:7px 12px; border:2px solid #111; border-radius:5px; background:#fff; color:#111; font-weight:700; cursor:pointer;">▶ Test</button>
                        <button class="sound-pause-btn" onclick="pauseTestSound('${slotKey}')" style="display:none; padding:7px 12px; border:2px solid #555; border-radius:5px; background:#fff; color:#555; font-weight:700; cursor:pointer;">⏸ Pause</button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:10px;">
                    <label style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#555; font-weight:700;">
                        Mode
                        <select class="sound-mode" onchange="updateSoundEditorVisibility('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                            <option value="builtin" ${cfg.mode === 'builtin' ? 'selected' : ''}>Built-in</option>
                            <option value="file" ${cfg.mode === 'file' ? 'selected' : ''}>Sound file</option>
                            <option value="js" ${cfg.mode === 'js' ? 'selected' : ''}>Custom JS tune</option>
                        </select>
                    </label>
                    <label style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#555; font-weight:700;">
                        ${(typeof t === 'function' && t('es_iterations')) || 'Iterations (repeats)'}
                        <input type="number" class="sound-iterations" min="1" max="100" step="1" value="${cfg.iterations || 1}"
                            style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                    </label>
                </div>
                <div class="sound-mode-panel sound-mode-panel-builtin" style="display:none;">
                    <label style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#555; font-weight:700;">
                        Built-in preset
                        <select class="sound-preset" style="padding:8px; border:1px solid #ccc; border-radius:5px;">${presetOptions}</select>
                    </label>
                </div>
                <div class="sound-mode-panel sound-mode-panel-file" style="display:none;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
                        <label style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#555; font-weight:700;">
                            Pick from user/custom-data/sounds
                            <select class="sound-file" onchange="syncSelectedSoundFile('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">${fileOptions}</select>
                        </label>
                        <label style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#555; font-weight:700;">
                            Or type a file name
                            <input type="text" class="sound-file-manual" value="${escapeSettingsHtml(cfg.file)}" placeholder="sounds/my-audio-file"
                                oninput="syncManualSoundFile('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                        </label>
                    </div>
                    <div style="margin-top:6px; font-size:0.78rem; color:#777;">Any audio file in user/custom-data/sounds can be selected here.</div>
                </div>
                <div class="sound-mode-panel sound-mode-panel-js" style="display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div style="font-size:0.8rem; color:#555; font-weight:700;">Custom JS tune builder</div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button onclick="addSoundBuilderRow('${slotKey}')" style="padding:6px 10px; border:1px solid #111; border-radius:5px; background:#fff; color:#111; font-weight:700; cursor:pointer;">+ Add tune</button>
                            <button onclick="insertSoundJsExample('${slotKey}')" style="padding:6px 10px; border:1px solid #bbb; border-radius:5px; background:#fff; color:#444; font-weight:700; cursor:pointer;">Reset example</button>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:8px;">
                        <label style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#555; font-weight:700;">
                            Waveform
                            <select class="sound-wave" onchange="syncSoundBuilderToTextarea('${slotKey}')" style="padding:8px; border:1px solid #ccc; border-radius:5px;">${waveOptions}</select>
                        </label>
                    </div>
                    <div class="sound-builder-list">${buildSoundBuilderRowsHtml(slotKey, cfg.builder)}</div>
                    <div style="margin:4px 0 8px 0; font-size:0.78rem; color:#777;">Use the Tune (frequency) and Rhythm menus to build several notes in one sound.</div>
                    <div style="font-size:0.8rem; color:#555; font-weight:700; margin-bottom:4px;">Generated JS (editable)</div>
                    <textarea class="sound-js" placeholder="playTone(...);"
                        style="width:100%; min-height:96px; padding:8px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box; resize:vertical; font-family:Consolas, monospace;">${escapeSettingsHtml(cfg.js || '')}</textarea>
                    <div style="margin-top:6px; font-size:0.78rem; color:#777;">Available helpers: playTone(...), playToneSequence(...), gavelHit().</div>
                </div>
            </div>`;
        }

        function renderEditSoundsModal() {
            const body = document.getElementById('edit-sounds-body');
            if (!body) return;

            stopAllTestSounds();
            soundSettings = normalizeSoundSettings(soundSettings);
            body.innerHTML = [
                buildSoundEditorCard('timerEnd', 'Timer alarm', 'Used when the countdown reaches 00:00.'),
                buildSoundEditorCard('timerBackground', 'Timer background audio', 'Used by the MP3 button next to White, Pink, and Brown.'),
                buildSoundEditorCard('scorePositive', 'Positive score', 'Used for +1 and team +1 feedback.'),
                buildSoundEditorCard('scoreNegative', 'Negative score', 'Used for −1 and team −1 feedback.')
            ].join('');

            ['timerEnd', 'timerBackground', 'scorePositive', 'scoreNegative'].forEach(slotKey => {
                updateSoundEditorVisibility(slotKey);
                const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
                const textarea = card ? card.querySelector('.sound-js') : null;
                if (textarea && !textarea.value.trim()) syncSoundBuilderToTextarea(slotKey);
            });
        }

        function updateSoundEditorVisibility(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return;

            const mode = card.querySelector('.sound-mode')?.value || 'builtin';
            const builtin = card.querySelector('.sound-mode-panel-builtin');
            const file = card.querySelector('.sound-mode-panel-file');
            const js = card.querySelector('.sound-mode-panel-js');

            if (builtin) builtin.style.display = mode === 'builtin' ? 'block' : 'none';
            if (file) file.style.display = mode === 'file' ? 'block' : 'none';
            if (js) js.style.display = mode === 'js' ? 'block' : 'none';
            if (mode === 'js') syncSoundBuilderToTextarea(slotKey, true);
        }

        function syncSoundTuneFrequency(slotKey, index) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            const row = card ? card.querySelectorAll('.sound-builder-row')[index] : null;
            if (!row) return;

            const select = row.querySelector('.sound-tune-select');
            const input = row.querySelector('.sound-tune-frequency');
            if (select && input && select.value) input.value = select.value;
        }

        function syncSelectedSoundFile(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return;

            const select = card.querySelector('.sound-file');
            const input = card.querySelector('.sound-file-manual');
            const normalized = resolveSoundFileMatch(select?.value || '');

            if (input) input.value = normalized;
        }

        function syncManualSoundFile(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return;

            const select = card.querySelector('.sound-file');
            const input = card.querySelector('.sound-file-manual');
            const normalized = resolveSoundFileMatch(input?.value || '');
            if (!select) return;

            const hasMatch = Array.from(select.options).some(option => option.value === normalized);
            if (hasMatch) {
                select.value = normalized;
            }
        }

        function collectSoundBuilderRows(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return normalizeSoundBuilderRows([], DEFAULT_SOUND_SETTINGS[slotKey]?.builder || []);

            const rows = Array.from(card.querySelectorAll('.sound-builder-row')).map(row => ({
                frequency: Number(row.querySelector('.sound-tune-frequency')?.value) || Number(row.querySelector('.sound-tune-select')?.value) || 440,
                rhythm: row.querySelector('.sound-rhythm')?.value || 'medium'
            }));

            return normalizeSoundBuilderRows(rows, DEFAULT_SOUND_SETTINGS[slotKey]?.builder || []);
        }

        function renderSoundBuilderRows(slotKey, rows) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            const list = card ? card.querySelector('.sound-builder-list') : null;
            if (!list) return;

            list.innerHTML = buildSoundBuilderRowsHtml(slotKey, rows);
        }

        function addSoundBuilderRow(slotKey) {
            const rows = collectSoundBuilderRows(slotKey);
            const last = rows[rows.length - 1] || { frequency: 440, rhythm: 'medium' };
            rows.push({ ...last });
            renderSoundBuilderRows(slotKey, rows);
            syncSoundBuilderToTextarea(slotKey);
        }

        function removeSoundBuilderRow(slotKey, index) {
            const rows = collectSoundBuilderRows(slotKey);
            if (rows.length <= 1) {
                renderSoundBuilderRows(slotKey, DEFAULT_SOUND_SETTINGS[slotKey]?.builder || [{ frequency: 440, rhythm: 'medium' }]);
            } else {
                rows.splice(index, 1);
                renderSoundBuilderRows(slotKey, rows);
            }
            syncSoundBuilderToTextarea(slotKey);
        }

        function syncSoundBuilderToTextarea(slotKey, preserveExisting = false) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            const textarea = card ? card.querySelector('.sound-js') : null;
            if (!card || !textarea) return;

            if (preserveExisting && textarea.value.trim()) return;

            const rows = collectSoundBuilderRows(slotKey);
            const wave = card.querySelector('.sound-wave')?.value || DEFAULT_SOUND_SETTINGS[slotKey]?.wave || 'sine';
            textarea.value = buildSoundJsFromBuilder(slotKey, rows, wave);
        }

        function collectSoundDraftFromCard(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return { ...DEFAULT_SOUND_SETTINGS[slotKey] };

            const mode = card.querySelector('.sound-mode')?.value || 'builtin';
            const preset = card.querySelector('.sound-preset')?.value || DEFAULT_SOUND_SETTINGS[slotKey].preset;
            const file = card.querySelector('.sound-file-manual')?.value || card.querySelector('.sound-file')?.value || '';
            const wave = card.querySelector('.sound-wave')?.value || DEFAULT_SOUND_SETTINGS[slotKey].wave || 'sine';
            const volume = Math.round(Math.min(100, Math.max(0, Number(card.querySelector('.sound-volume-slider')?.value) || 100)));
            const rawIterations = card.querySelector('.sound-iterations')?.value;
            const iterations = Math.max(1, Math.min(100, Math.round(Number(rawIterations) || 1)));
            const builder = collectSoundBuilderRows(slotKey);
            const js = (card.querySelector('.sound-js')?.value || '').trim() || buildSoundJsFromBuilder(slotKey, builder, wave);

            return normalizeSoundSlot({ mode, preset, file, js, wave, volume, iterations, builder }, DEFAULT_SOUND_SETTINGS[slotKey]);
        }

        function insertSoundJsExample(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return;

            const defaults = normalizeSoundSlot(DEFAULT_SOUND_SETTINGS[slotKey], DEFAULT_SOUND_SETTINGS[slotKey]);
            const waveSelect = card.querySelector('.sound-wave');
            if (waveSelect) waveSelect.value = defaults.wave || 'sine';
            renderSoundBuilderRows(slotKey, defaults.builder);
            syncSoundBuilderToTextarea(slotKey);

            const textarea = card.querySelector('.sound-js');
            if (textarea) textarea.focus();
        }

        const _testSoundState = {};

        function _getTestState(slotKey) {
            if (!_testSoundState[slotKey]) {
                _testSoundState[slotKey] = { playing: false, paused: false, audio: null, timeout: null };
            }
            return _testSoundState[slotKey];
        }

        function _updateTestButtons(slotKey) {
            const card = document.querySelector(`[data-sound-slot="${slotKey}"]`);
            if (!card) return;
            const state = _getTestState(slotKey);
            const testBtn = card.querySelector('.sound-test-btn');
            const pauseBtn = card.querySelector('.sound-pause-btn');
            if (testBtn) {
                testBtn.textContent = state.playing ? '⏹ Stop' : '▶ Test';
                testBtn.style.background = state.playing ? '#111' : '#fff';
                testBtn.style.color = state.playing ? '#fff' : '#111';
            }
            if (pauseBtn) {
                pauseBtn.style.display = (state.playing && state.audio) ? '' : 'none';
                pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
            }
        }

        function stopTestSound(slotKey) {
            const state = _getTestState(slotKey);
            if (state.timeout) { clearTimeout(state.timeout); state.timeout = null; }
            if (state.clipHandle && typeof state.clipHandle.stop === 'function') {
                state.clipHandle.stop();
                state.clipHandle = null;
            }
            if (state.audio) {
                try { state.audio.pause(); state.audio.currentTime = 0; } catch (e) { }
                state.audio = null;
            }
            state.playing = false;
            state.paused = false;
            _updateTestButtons(slotKey);
        }

        function stopAllTestSounds() {
            Object.keys(_testSoundState).forEach(stopTestSound);
        }

        function pauseTestSound(slotKey) {
            const state = _getTestState(slotKey);
            if (!state.playing || !state.audio) return;
            if (state.paused) {
                state.audio.play().catch(e => { });
                state.paused = false;
            } else {
                state.audio.pause();
                state.paused = true;
            }
            _updateTestButtons(slotKey);
        }

        function testSoundFromEditor(slotKey) {
            const state = _getTestState(slotKey);
            if (state.playing) {
                stopTestSound(slotKey);
                return;
            }

            const draft = collectSoundDraftFromCard(slotKey);
            const volumeScale = Math.min(1, Math.max(0, (typeof draft.volume === 'number' ? draft.volume : 100) / 100));
            const repeatCount = Math.max(1, Number(draft.iterations) || 1);

            const previous = soundSettings[slotKey];
            soundSettings[slotKey] = draft;

            state.playing = true;
            state.paused = false;
            _updateTestButtons(slotKey);

            const onComplete = () => {
                stopTestSound(slotKey);
            };

            if (draft.mode === 'file' && draft.file) {
                const clipHandle = playSoundFileClip(draft.file, repeatCount, 150, volumeScale, onComplete);
                if (clipHandle && clipHandle.stop) {
                    state.clipHandle = clipHandle;
                } else if (!clipHandle) {
                    stopTestSound(slotKey);
                    showToast('That sound could not be played. Check the file name.', true);
                }
                soundSettings[slotKey] = previous;
                return;
            }

            const played = playConfiguredSound(slotKey, {
                repeatCount: repeatCount,
                spacingMs: 150,
                onComplete: onComplete
            });
            soundSettings[slotKey] = previous;

            if (played === false) {
                stopTestSound(slotKey);
                showToast('That sound could not be played. Check the file name or JS code.', true);
            }
        }

        async function openEditSoundsModal() {
            await openSettingsModal('sounds');
        }

        function closeEditSoundsModal() {
            closeSettingsModal();
        }

        async function saveSoundSettings() {
            soundSettings = normalizeSoundSettings({
                timerEnd: collectSoundDraftFromCard('timerEnd'),
                timerBackground: collectSoundDraftFromCard('timerBackground'),
                drumroll: collectSoundDraftFromCard('drumroll'),
                gavelAlarm: collectSoundDraftFromCard('gavelAlarm'),
                scorePositive: collectSoundDraftFromCard('scorePositive'),
                scoreNegative: collectSoundDraftFromCard('scoreNegative')
            });

            syncTimerBeepsFromSoundSettings();

            const result = await persistSettingsToUserFile();
            if (!result?.ok) {
                showToast('Save failed: ' + (result?.error || 'Unable to save config.js'), true);
                return;
            }

            closeEditSoundsModal();
            if (typeof mdbToast === 'function') mdbToast('Sounds saved to config.js');
        }

        async function resetSoundSettings() {
            soundSettings = JSON.parse(JSON.stringify(DEFAULT_SOUND_SETTINGS));
            syncTimerBeepsFromSoundSettings();
            renderEditSoundsModal();
            const result = await persistSettingsToUserFile();
            if (!result?.ok) {
                showToast('Reset failed: ' + (result?.error || 'Unable to save config.js'), true);
                return;
            }
            if (typeof mdbToast === 'function') mdbToast('Default sounds restored');
        }

        function toggleHelp() {
            const modal = document.getElementById('help-modal');
            const opening = modal.style.display !== 'flex';
            modal.style.display = opening ? 'flex' : 'none';
            if (opening) renderHelpModal();
        }

        function openResultsRankingModal() {
            if (!selectedGroupName) {
                showToast("Please select a group first!");
                return;
            }
            renderRanking();
            // reuse existing medals logic
            const container = document.getElementById('medals-container');
            const students = studentGroups[selectedGroupName];

            const rankedStudents = students
                .map(s => ({ ...s, score: s.pluses - s.minuses }))
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score);

            const teamScores = {};
            if (currentTeamsActive) {
                students.forEach(s => {
                    if (s.teamId) {
                        if (!teamScores[s.teamId]) {
                            const tColor = teamColors[(s.teamId - 1) % teamColors.length];
                            const displayName = tColor.customName || tColor.name;
                            teamScores[s.teamId] = { pluses: 0, minuses: 0, count: 0, color: tColor, displayName: displayName };
                        }
                        teamScores[s.teamId].pluses += s.pluses;
                        teamScores[s.teamId].minuses += s.minuses;
                        teamScores[s.teamId].count++;
                    }
                });
            }

            const rankedTeams = Object.keys(teamScores)
                .map(id => ({
                    id,
                    name: teamScores[id].displayName,
                    avg: ((teamScores[id].pluses - teamScores[id].minuses) / teamScores[id].count).toFixed(2),
                    color: teamScores[id].color
                }))
                .sort((a, b) => b.avg - a.avg);

            let html = '';

            if (rankedStudents.length === 0) {
                html += '<div class="no-winners">No individual scores yet!</div>';
            } else {
                const scores = [...new Set(rankedStudents.map(s => s.score))].sort((a, b) => b - a);
                const medals = [
                    { label: 'Gold', icon: '🥇', class: 'gold-section', score: scores[0] },
                    { label: 'Silver', icon: '🥈', class: 'silver-section', score: scores[1] },
                    { label: 'Bronze', icon: '🥉', class: 'bronze-section', score: scores[2] }
                ];
                medals.forEach(m => {
                    if (m.score !== undefined) {
                        const winners = rankedStudents.filter(s => s.score === m.score);
                        html += `
                    <div class="medal-section ${m.class}">
                        <div class="medal-header">
                            <div class="medal-icon">${m.icon}</div>
                            <div class="medal-label">${m.label} Medal</div>
                        </div>
                        <ul class="medal-students">
                            ${winners.map(s => `
                                <li class="medal-student">
                                    <span>${getDisplayName(s)}</span>
                                    <span class="student-score">+${s.score}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>`;
                    }
                });
            }

            if (currentTeamsActive && rankedTeams.length > 0) {
                html += `
            <h3 style="text-align:center; color: #111; margin-top:20px;">Team Standings (Avg Score)</h3>
            <div class="medal-section" style="padding: 10px;">
                <table style="width:100%; border-collapse: collapse; text-align:left;">
                    <thead>
                        <tr style="border-bottom: 2px solid #eee;">
                            <th style="padding:10px;">Rank</th>
                            <th>Team</th>
                            <th style="text-align:right; padding:10px;">Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rankedTeams.map((t, i) => `
                            <tr style="background: ${t.color.hex}44; border-bottom: 1px solid #eee;">
                                <td style="padding:10px; font-weight:bold;">#${i + 1}</td>
                                <td style="font-weight:bold;">${t.name}</td>
                                <td style="text-align:right; padding:10px; font-family:monospace; font-weight:bold;">
                                    ${t.avg > 0 ? '+' : ''}${t.avg}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
            }

            container.innerHTML = html;
            document.getElementById('results-ranking-modal').style.display = 'flex';
        }

        function closeResultsRankingModal() {
            document.getElementById('results-ranking-modal').style.display = 'none';
        }

        function showBestStudents() { openResultsRankingModal(); }
        function closeBestStudents() { closeResultsRankingModal(); }

        const _SLOT_DAY_KEYS = ['cms_daySun', 'cms_dayMon', 'cms_dayTue', 'cms_dayWed', 'cms_dayThu', 'cms_dayFri', 'cms_daySat'];

        function renderGroupButtons() {
            const container = document.getElementById("group-container");
            container.innerHTML = '';

            if (!weekdayTabInitialized) {
                weekdayTabInitialized = true;
                const today = new Date().getDay(); // 0-6
                let hasTodaySlots = false;
                Object.keys(studentGroups).forEach(groupName => {
                    if (rawMeta[groupName] && rawMeta[groupName].archived) return;
                    const slots = (plannerClasses[groupName] && plannerClasses[groupName].schedule) || [];
                    if (slots.some(slot => String(slot.day) === String(today))) {
                        hasTodaySlots = true;
                    }
                });
                activeWeekdayTab = hasTodaySlots ? String(today) : 'all';
            }

            const anySlots = Object.keys(plannerClasses).filter(k => !k.startsWith('_'))
                .some(id => (plannerClasses[id].schedule || []).length > 0);
            const toggleBtn = document.getElementById('group-view-toggle');
            if (toggleBtn) {
                toggleBtn.style.display = anySlots ? '' : 'none';
                const iconSrc = slotViewActive ? '../assets/icons/groups.svg' : '../assets/icons/planner.svg';
                const labelTxt = slotViewActive ? t('cms_view_groups') : t('cms_view_slots');
                toggleBtn.innerHTML = `<img src="${iconSrc}" class="btn-icon" alt="" /> ${labelTxt}`;
            }

            // Render weekday tabs
            const tabsContainer = document.getElementById('weekday-tabs');
            if (tabsContainer) {
                tabsContainer.innerHTML = '';
                if (slotViewActive && anySlots) {
                    tabsContainer.style.display = 'flex';

                    // Determine active days that have slots
                    const activeDays = new Set();
                    let hasNoSlotGroups = false;
                    Object.keys(studentGroups).forEach(groupName => {
                        if (rawMeta[groupName] && rawMeta[groupName].archived) return;
                        const slots = (plannerClasses[groupName] && plannerClasses[groupName].schedule) || [];
                        if (slots.length > 0) {
                            slots.forEach(slot => {
                                if (slot.day !== undefined && slot.day !== null) {
                                    activeDays.add(String(slot.day));
                                }
                            });
                        } else {
                            hasNoSlotGroups = true;
                        }
                    });

                    if (activeWeekdayTab !== 'all' && activeWeekdayTab !== 'noslot' && !activeDays.has(activeWeekdayTab)) {
                        activeWeekdayTab = 'all';
                    }

                    const allDays = [
                        { id: '1', label: t('cms_dayMon') },
                        { id: '2', label: t('cms_dayTue') },
                        { id: '3', label: t('cms_dayWed') },
                        { id: '4', label: t('cms_dayThu') },
                        { id: '5', label: t('cms_dayFri') },
                        { id: '6', label: t('cms_daySat') },
                        { id: '0', label: t('cms_daySun') }
                    ];

                    const tabs = [{ id: 'all', label: t('cms_tab_all') }];
                    allDays.forEach(d => {
                        if (activeDays.has(d.id)) {
                            tabs.push(d);
                        }
                    });
                    if (hasNoSlotGroups) {
                        tabs.push({ id: 'noslot', label: t('cms_tab_no_slot') });
                    }

                    tabs.forEach(tab => {
                        const tabBtn = document.createElement('button');
                        tabBtn.type = 'button';
                        tabBtn.className = 'weekday-tab' + (activeWeekdayTab === tab.id ? ' active' : '');
                        tabBtn.textContent = tab.label;
                        tabBtn.onclick = (e) => {
                            if (e) e.stopPropagation();
                            activeWeekdayTab = tab.id;
                            renderGroupButtons();
                        };
                        tabsContainer.appendChild(tabBtn);
                    });
                } else {
                    tabsContainer.style.display = 'none';
                }
            }

            const allItems = [];

            Object.keys(studentGroups).forEach(groupName => {
                if (rawMeta[groupName] && rawMeta[groupName].archived) return;
                const displayName = (rawMeta[groupName] && rawMeta[groupName].name) ? rawMeta[groupName].name : groupName;
                const meta = rawMeta[groupName];
                const hasHalves = meta && meta.halfGroups &&
                    ((meta.halfGroups.A && meta.halfGroups.A.length > 0) || (meta.halfGroups.B && meta.halfGroups.B.length > 0));
                const slots = (plannerClasses[groupName] && plannerClasses[groupName].schedule) || [];

                if (slotViewActive && slots.length > 0) {
                    slots.forEach(slot => {
                        // Filter by weekday tab
                        if (activeWeekdayTab !== 'all') {
                            if (activeWeekdayTab === 'noslot') return;
                            if (String(slot.day) !== activeWeekdayTab) return;
                        }

                        // Filter by search query
                        const dayLabel = t(_SLOT_DAY_KEYS[parseInt(slot.day)] || '') || '';
                        const timeLabel = slot.time ? slot.time.slice(0, 5) : '';
                        const halfLabel = slot.halfGroup ? ' ½' + slot.halfGroup : '';
                        const buttonText = displayName + (dayLabel ? ' ' + dayLabel : '') + (timeLabel ? ' ' + timeLabel : '') + halfLabel;

                        if (groupSearchQuery && !buttonText.toLowerCase().includes(groupSearchQuery)) return;

                        allItems.push({
                            type: 'slot',
                            groupName,
                            displayName,
                            slot,
                            day: slot.day !== undefined && slot.day !== null ? parseInt(slot.day, 10) : 99,
                            time: slot.time ? slot.time.slice(0, 5) : '',
                            halfGroup: slot.halfGroup || '',
                            dayLabel,
                            timeLabel,
                            halfLabel
                        });
                    });
                } else {
                    if (slotViewActive) {
                        if (activeWeekdayTab !== 'all' && activeWeekdayTab !== 'noslot') return;
                    }

                    // Filter by search query
                    if (groupSearchQuery && !displayName.toLowerCase().includes(groupSearchQuery)) return;

                    allItems.push({
                        type: 'group',
                        groupName,
                        displayName,
                        hasHalves
                    });
                }
            });

            // Sort buttons chronologically (by day Mon->Sun, then start time, then name, then half group)
            allItems.sort((a, b) => {
                if (a.type === 'slot' && b.type === 'slot') {
                    // Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0 -> 7)
                    const getDayOrder = (d) => {
                        const n = parseInt(d, 10);
                        if (isNaN(n)) return 99;
                        return n === 0 ? 7 : n;
                    };
                    const dayDiff = getDayOrder(a.day) - getDayOrder(b.day);
                    if (dayDiff !== 0) return dayDiff;

                    const timeDiff = (a.time || '').localeCompare(b.time || '');
                    if (timeDiff !== 0) return timeDiff;

                    const nameDiff = (a.displayName || '').localeCompare(b.displayName || '');
                    if (nameDiff !== 0) return nameDiff;

                    return (a.halfGroup || '').localeCompare(b.halfGroup || '');
                }

                if (a.type === 'slot' && b.type !== 'slot') return -1;
                if (a.type !== 'slot' && b.type === 'slot') return 1;

                return (a.displayName || '').localeCompare(b.displayName || '');
            });

            allItems.forEach(item => {
                if (item.type === 'slot') {
                    const { groupName, displayName, slot, dayLabel, timeLabel, halfLabel } = item;
                    const btn = document.createElement("button");
                    btn.className = "btn-group";
                    btn.dataset.group = groupName;
                    btn.dataset.half = slot.halfGroup || '';
                    btn.innerHTML = `<span class="btn-group-name">${displayName}</span>` +
                        `<span class="btn-group-time-badge">${dayLabel ? dayLabel + ' ' : ''}${timeLabel}${halfLabel}</span>`;

                    // Check active state
                    if (selectedGroupName === groupName &&
                        selectedHalfGroup === (slot.halfGroup || null) &&
                        selectedPlannerSlot &&
                        String(selectedPlannerSlot.day) === String(slot.day) &&
                        (selectedPlannerSlot.time || '').slice(0, 5) === timeLabel) {
                        btn.classList.add("active");
                    }

                    btn.onclick = () => {
                        selectedPlannerSlot = { day: slot.day, time: (slot.time || '').slice(0, 5), timeEnd: (slot.timeEnd || '').slice(0, 5), halfGroup: slot.halfGroup || '' };
                        selectGroup(groupName, slot.halfGroup || null, btn);
                    };
                    container.appendChild(btn);
                } else {
                    const { groupName, displayName, hasHalves } = item;
                    const btn = document.createElement("button");
                    btn.className = "btn-group";
                    btn.dataset.group = groupName;
                    btn.dataset.half = '';
                    btn.innerHTML = `<span class="btn-group-name">${displayName}</span>`;

                    // Check active state
                    if (selectedGroupName === groupName && !selectedHalfGroup && !selectedPlannerSlot) {
                        btn.classList.add("active");
                    }

                    if (hasHalves) {
                        btn.onclick = (e) => { selectedPlannerSlot = null; e.stopPropagation(); showHalfGroupPicker(groupName, btn); };
                    } else {
                        btn.onclick = () => { selectedPlannerSlot = null; selectGroup(groupName, null, btn); };
                    }
                    container.appendChild(btn);
                }
            });
        }

        function toggleGroupView() {
            slotViewActive = !slotViewActive;
            renderGroupButtons();
        }

        function handleGroupSearch(value) {
            groupSearchQuery = (value || '').toLowerCase().trim();
            renderGroupButtons();
        }

        function _updateClassBtnLabel() {
            const classBtn = document.getElementById('class-selection-btn');
            if (!classBtn) return;
            classBtn.innerHTML = `<img src="../assets/icons/class-management.svg" class="btn-icon" alt="" />`;
            if (selectedGroupName) {
                const displayName = (typeof rawMeta !== 'undefined' && rawMeta[selectedGroupName] && rawMeta[selectedGroupName].name) ? rawMeta[selectedGroupName].name : selectedGroupName;
                const halfSuffix = selectedHalfGroup ? ' ½' + selectedHalfGroup : '';
                classBtn.title = `${displayName}${halfSuffix}`;
                classBtn.classList.add('active');
            } else {
                const titleTxt = (typeof dict !== 'undefined' && dict['btn_select_class_title']) ? dict['btn_select_class_title'] : (t('btn_select_class_title') || 'Select class');
                classBtn.title = titleTxt;
                classBtn.classList.remove('active');
            }
        }

        async function selectGroup(groupName, halfGroup, activeBtn) {
            const isGroupSwitch = selectedGroupName && selectedGroupName !== groupName;
            selectedGroupName = groupName;
            selectedHalfGroup = (halfGroup !== undefined) ? halfGroup : null;
            if (isGroupSwitch) {
                currentPlannerEntryId = '';
            }

            // Associate today's planner entry UUID automatically if not explicitly set
            if (!currentPlannerEntryId) {
                var slotTime = (selectedPlannerSlot && selectedPlannerSlot.time) || '';
                resolvePlannerEntryUuid(groupName, slotTime).then(function (matchedUuid) {
                    if (matchedUuid && !currentPlannerEntryId && selectedGroupName === groupName) {
                        currentPlannerEntryId = matchedUuid;
                    }
                }).catch(function () {});
            }
            document.querySelectorAll(".btn-group").forEach(b => {
                b.classList.remove("active");
                const sup = b.querySelector('.btn-group-half-badge');
                if (sup) sup.remove();
            });
            const btn = activeBtn || document.querySelector(`.btn-group[data-group="${CSS.escape(groupName)}"]`);
            if (btn) {
                btn.classList.add("active");
                if (selectedHalfGroup) {
                    const badge = document.createElement('sup');
                    badge.className = 'btn-group-half-badge';
                    badge.textContent = ' ½' + selectedHalfGroup;
                    badge.style.cssText = 'font-size:0.6em; vertical-align:super; margin-left:1px;';
                    btn.appendChild(badge);
                }
            }
            document.getElementById("pick-btn").disabled = false;
            currentTeamsActive = studentGroups[groupName].some(s => s.teamId != null);
            const teamBtn = document.getElementById('pick-team-btn');
            if (teamBtn) { teamBtn.style.display = currentTeamsActive ? '' : 'none'; teamBtn.disabled = !currentTeamsActive; }
            loadObjectivesForClass(groupName);
            updateUtilityButtons();
            _cmsUpdatePlanChip();
            await applyBadgeSetForClass(groupName);
            await applyModeSetForClass(groupName);
            renderRoster();
            updateExamSessionBanner();
            renderRanking();
            updateDbAutosaveStatusLabel();
            applyAutoFlags(groupName);
            checkScheduledPlannerTest(groupName);
            if (typeof cmsGetAssociatedGradeSheetTest === 'function') {
                cmsGetAssociatedGradeSheetTest(groupName).then(t => {
                    _cmsCurrentAssociatedTest = t;
                    updateExamSessionBanner();
                }).catch(() => {});
            }

            if (typeof _updateClassBtnLabel === 'function') _updateClassBtnLabel();
            closeClassSelectionPopup();

            if (typeof CmsLessonRunner !== 'undefined' && typeof CmsLessonRunner.checkClassPlanOnSelect === 'function') {
                CmsLessonRunner.checkClassPlanOnSelect(groupName);
            }
        }

        function cmsOpenLinkedPlan() {
            const chip = document.getElementById('cms-plan-chip');
            const classId = (chip && chip.dataset.groupId) || selectedGroupName;
            const planId = (chip && chip.dataset.planId) || (cpGetActivePlan(classId)?.id) || null;
            if (!classId) return;
            const query = { classId };
            if (planId) query.planId = planId;
            if (window.Desktop && typeof window.Desktop.openTool === 'function') {
                window.Desktop.openTool('class-plan.html', { query });
            } else {
                const qs = new URLSearchParams(query).toString();
                window.open('class-plan.html?' + qs, '_blank');
            }
        }

        function _cmsUpdatePlanChip() {
            const chip = document.getElementById('cms-plan-chip');
            const chipBtn = document.getElementById('cms-plan-chip-btn');
            if (!chip || !chipBtn) return;
            if (!selectedPlannerSlot || !selectedGroupName) {
                chip.style.display = 'none';
                chip.dataset.groupId = '';
                chip.dataset.planId = '';
                return;
            }
            const ps = selectedPlannerSlot;
            const plans = (classPlans[selectedGroupName] || []);
            const matched = plans.find(p => {
                if (!p) return false;
                const pSlots = Array.isArray(p.plannerSlots) && p.plannerSlots.length
                    ? p.plannerSlots
                    : (p.plannerSlot ? (Array.isArray(p.plannerSlot) ? p.plannerSlot : [p.plannerSlot]) : []);
                return pSlots.some(s => {
                    if (!s) return false;
                    return String(s.day) === String(ps.day) &&
                        (s.time || '').slice(0, 5) === (ps.time || '').slice(0, 5) &&
                        (s.halfGroup || '') === (ps.halfGroup || '');
                });
            });
            if (!matched) {
                chip.style.display = 'none';
                chip.dataset.groupId = '';
                chip.dataset.planId = '';
                return;
            }
            chip.dataset.groupId = selectedGroupName;
            chip.dataset.planId = matched.id;
            chipBtn.textContent = matched.name;
            chip.style.display = 'inline-flex';
            // Activate the linked plan
            cpSetActive(selectedGroupName, matched.id);
        }

        function updateUtilityButtons() {
            const utilSection = document.getElementById('utility-section');
            if (!utilSection) return;

            utilSection.style.display = "none";
            utilSection.innerHTML = '';
            const teamBtn = document.getElementById('pick-team-btn');
            if (teamBtn) { teamBtn.style.display = currentTeamsActive ? '' : 'none'; teamBtn.disabled = !currentTeamsActive; }
        }

        function updateRosterSettingsPopupContext() {
            const hasTeams = !!currentTeamsActive;
            const hasRoles = getAssignedRolesForSelectedGroup().length > 0;
            ['rsp-reshuffle-teams-btn', 'rsp-clear-teams-btn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = hasTeams ? '' : 'none';
            });
            const toggleRolesEl = document.getElementById('rsp-toggle-roles-btn');
            if (toggleRolesEl) toggleRolesEl.style.display = hasRoles ? '' : 'none';
            ['rsp-role-info-btn', 'rsp-reassign-roles-btn', 'rsp-clear-roles-btn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = hasRoles ? '' : 'none';
            });
            syncRosterInlineToggleButtonStates();
        }
        function reshuffleTeams() {
            if (!selectedGroupName || !currentTeamsActive) return;

            const allStudents = studentGroups[selectedGroupName];
            const _halfArr = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = _halfArr ? _halfGroupFilter(allStudents, _halfArr) : allStudents;
            const activeStudents = students.filter(s => !s.isAbsent);

            if (activeStudents.length === 0) {
                showToast('No present students available for teams.');
                return;
            }

            const previousTeamsById = {};
            activeStudents.forEach(s => { previousTeamsById[s.id] = s.teamId ?? null; });

            // Capture the exact set of existing team IDs (preserves custom/merged teams)
            const teamIds = [...new Set(activeStudents.map(s => s.teamId).filter(id => id != null))];
            const numTeams = teamIds.length;

            if (numTeams === 0) return;

            // Shuffle the students
            const shuffled = [...activeStudents].sort(() => 0.5 - Math.random());

            // Distribute evenly across the original team IDs in round-robin order
            // so the exact same team IDs are reused and team count stays identical
            shuffled.forEach((student, i) => {
                student.teamId = teamIds[i % numTeams];
            });

            let movedCount = 0;
            activeStudents.forEach(student => {
                const previousTeam = previousTeamsById[student.id];
                const nextTeam = student.teamId ?? null;
                if (previousTeam !== nextTeam && nextTeam != null) {
                    movedCount++;
                    logHistory('teams', student.name, `Assigned to Team ${nextTeam} (from Team ${previousTeam ?? '-'})`);
                }
            });
            logHistory('teams', selectedGroupName, `Reshuffled teams (${movedCount} student${movedCount === 1 ? '' : 's'} moved)`);

            // Refresh the UI
            animateTeamReveal();
            renderRanking();
        }

        function createTeams() {
            if (!selectedGroupName) {
                showToast("Please select a group first!");
                return;
            }
            const actionWrap = document.getElementById('team-modal-actions');
            if (actionWrap) actionWrap.style.display = currentTeamsActive ? 'block' : 'none';
            document.getElementById('team-modal').style.display = 'flex';
            loadSavedTeamSetups();
        }


        function closeTeamModal() {
            document.getElementById('team-modal').style.display = 'none';
        }

        function loadSavedTeamSetups() {
            const container = document.getElementById('saved-teams-container');
            if (!container) return;

            if (!selectedGroupName) {
                container.innerHTML = `<div style="color: #666; font-size: 0.8rem; font-style: italic; text-align: center; padding: 10px 0;">Please select a class first.</div>`;
                return;
            }

            const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
            const groupSetups = allSaved[selectedGroupName] || {};
            const titles = Object.keys(groupSetups);

            if (titles.length === 0) {
                container.innerHTML = `<div style="color: #666; font-size: 0.8rem; font-style: italic; text-align: center; padding: 10px 0;">No saved team setups for this class.</div>`;
                return;
            }

            container.innerHTML = '';
            titles.forEach(title => {
                const setup = groupSetups[title];
                const studentCount = Object.keys(setup.assignments || {}).length;

                // Escape title for attributes and JS call
                const escapedTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                const item = document.createElement('div');
                item.style = 'display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #ddd; gap: 8px; margin-bottom: 4px;';

                item.innerHTML = `
            <span style="font-weight: 600; font-size: 0.85rem; color: #333; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;" title="${escapedTitle} (${studentCount} students)">
                ${title} <span style="font-weight: 400; font-size: 0.75rem; color: #666;">(${studentCount})</span>
            </span>
            <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700; background: #16a34a; border: 2px solid #16a34a; color: #fff; border-radius: 4px; cursor: pointer; transition: all 0.12s; font-family: inherit; line-height: 1.2;" onmouseover="this.style.background='#fff';this.style.color='#16a34a';" onmouseout="this.style.background='#16a34a';this.style.color='#fff';" onclick="loadTeamSetup('${escapedTitle}')">Load</button>
                <button style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700; background: #dc2626; border: 2px solid #dc2626; color: #fff; border-radius: 4px; cursor: pointer; transition: all 0.12s; font-family: inherit; line-height: 1.2;" onmouseover="this.style.background='#fff';this.style.color='#dc2626';" onmouseout="this.style.background='#dc2626';this.style.color='#fff';" onclick="deleteTeamSetup('${escapedTitle}')"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
            </div>
        `;
                container.appendChild(item);
            });
        }

        function saveCurrentTeamSetup() {
            if (!selectedGroupName) {
                showToast("Please select a group first!");
                return;
            }

            const students = studentGroups[selectedGroupName] || [];
            const activeAssignments = {};
            students.forEach(s => {
                if (s.teamId != null) {
                    activeAssignments[s.name] = s.teamId;
                }
            });

            if (Object.keys(activeAssignments).length === 0) {
                showToast("No active team assignments to save. Please create teams first!", true);
                return;
            }

            showPrompt("Enter a title for this team setup:", "", function (title) {
                if (title === null) return;
                title = title.trim();
                if (!title) {
                    showToast("Please enter a valid title.", true);
                    return;
                }

                // Save team custom names
                const customNames = {};
                teamColors.forEach((tc, idx) => {
                    if (tc.customName) {
                        customNames[idx + 1] = tc.customName;
                    }
                });

                const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
                if (!allSaved[selectedGroupName]) {
                    allSaved[selectedGroupName] = {};
                }

                allSaved[selectedGroupName][title] = {
                    assignments: activeAssignments,
                    customNames: customNames
                };

                try {
                    localStorage.setItem('cms-saved-teams', JSON.stringify(allSaved));
                    showToast(`Team setup "${title}" saved successfully!`);
                    loadSavedTeamSetups();
                } catch (e) {
                    showToast("Failed to save team setup: " + e.message, true);
                }
            });
        }

        function loadTeamSetup(title) {
            if (!selectedGroupName) return;
            const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
            const groupSetups = allSaved[selectedGroupName] || {};
            const setup = groupSetups[title];
            if (!setup) {
                showToast("Setup not found!", true);
                return;
            }

            // Apply assignments to current students
            const students = studentGroups[selectedGroupName] || [];
            let assignedCount = 0;
            students.forEach(student => {
                const savedTeamId = setup.assignments[student.name];
                if (savedTeamId !== undefined) {
                    student.teamId = savedTeamId;
                    assignedCount++;
                } else {
                    delete student.teamId;
                }
            });

            // Apply custom team names if present
            if (setup.customNames) {
                teamColors.forEach((tc, idx) => {
                    const teamId = idx + 1;
                    if (setup.customNames[teamId] !== undefined) {
                        tc.customName = setup.customNames[teamId];
                    } else {
                        delete tc.customName;
                    }
                });
                persistTeamSettings();
            }

            currentTeamsActive = assignedCount > 0;
            // Log history
            logHistory('teams', selectedGroupName, `Loaded team setup: "${title}" (${assignedCount} student assignments restored)`);

            // Refresh UI
            renderRoster();
            updateUtilityButtons();

            // Close modal
            closeTeamModal();
            showToast(`Loaded team setup: "${title}"`);
        }

        function deleteTeamSetup(title) {
            if (!selectedGroupName) return;
            showConfirm(`Are you sure you want to delete the team setup "${title}"?`, function () {
                const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
                if (allSaved[selectedGroupName] && allSaved[selectedGroupName][title]) {
                    delete allSaved[selectedGroupName][title];
                    localStorage.setItem('cms-saved-teams', JSON.stringify(allSaved));
                    showToast(`Deleted team setup: "${title}"`);
                    loadSavedTeamSetups();
                }
            });
        }

        function processTeamCreation(value, mode) {
            if (!selectedGroupName) {
                showToast("Please select a group first!");
                return;
            }

            const allStudents = studentGroups[selectedGroupName];
            const _halfArr2 = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = _halfArr2 ? _halfGroupFilter(allStudents, _halfArr2) : allStudents;
            const activeStudents = students.filter(s => !s.isAbsent);
            const previousTeamsById = {};
            activeStudents.forEach(s => { previousTeamsById[s.id] = s.teamId || null; });

            activeStudents.forEach(s => delete s.teamId);

            if (activeStudents.length === 0) {
                showToast('No present students available for teams.');
                return;
            }

            let finalTeamSize;

            if (mode === 'total') {
                // Mode: Number of Teams (e.g., "I want 4 teams")
                finalTeamSize = Math.ceil(activeStudents.length / value);
            } else {
                // Mode: Students per Team (e.g., "I want 3 students per team")
                finalTeamSize = value;
            }

            // Shuffle and Assign
            const shuffled = [...activeStudents].sort(() => 0.5 - Math.random());
            shuffled.forEach((student, i) => {
                student.teamId = Math.floor(i / finalTeamSize) + 1;
            });

            // If the final team is much smaller than the penultimate team,
            // move students from the penultimate to the final team until
            // their sizes differ by at most 1. This keeps the last two
            // teams reasonably balanced when students don't divide evenly.
            const assignedTeams = {};
            shuffled.forEach(s => {
                assignedTeams[s.teamId] = assignedTeams[s.teamId] || [];
                assignedTeams[s.teamId].push(s);
            });
            const teamIds = Object.keys(assignedTeams).map(n => parseInt(n, 10)).sort((a, b) => a - b);
            if (teamIds.length >= 2) {
                const lastId = teamIds[teamIds.length - 1];
                const penultId = teamIds[teamIds.length - 2];
                let lastSize = assignedTeams[lastId].length;
                let penultSize = assignedTeams[penultId].length;
                while ((penultSize - lastSize) > 1) {
                    // move one student from penultimate to last
                    const mover = assignedTeams[penultId].pop();
                    mover.teamId = lastId;
                    assignedTeams[lastId].push(mover);
                    lastSize = assignedTeams[lastId].length;
                    penultSize = assignedTeams[penultId].length;
                }
            }

            currentTeamsActive = true;
            currentRequestedTeamCount = (mode === 'total') ? value : 0;
            const createdTeamCount = [...new Set(activeStudents.map(s => s.teamId).filter(id => id != null))].length;
            const modeLabel = mode === 'total' ? `${value} teams` : `${value} students/team`;
            logHistory('teams', selectedGroupName, `Created ${createdTeamCount} teams (${modeLabel})`);
            activeStudents.forEach(student => {
                const previousTeam = previousTeamsById[student.id];
                const nextTeam = student.teamId || null;
                if (nextTeam != null) {
                    if (previousTeam == null) {
                        logHistory('teams', student.name, `Assigned to Team ${nextTeam}`);
                    } else if (previousTeam !== nextTeam) {
                        logHistory('teams', student.name, `Assigned to Team ${nextTeam} (from Team ${previousTeam})`);
                    }
                }
            });
            closeTeamModal();
            updateUtilityButtons();
            animateTeamReveal();
        }

        function animateTeamReveal() {
            renderRoster();
            if (!animationsEnabled) return;
            _broadcastAnimation('team-reveal');
            const listEl = document.getElementById('roster-list');
            const allItems = Array.from(listEl.children);
            if (allItems.length === 0) return;

            // Group DOM elements by team: each bucket = [headerEl, member1, member2, ...]
            const buckets = [];
            let currentBucket = null;
            allItems.forEach(el => {
                if (el.dataset.teamId !== undefined && !el.dataset.studentId) {
                    // team header
                    currentBucket = [el];
                    buckets.push(currentBucket);
                } else if (currentBucket) {
                    currentBucket.push(el);
                } else {
                    // non-team items (absent students without a team) — treat as own bucket
                    buckets.push([el]);
                }
            });

            // Build reveal sequence: round-robin across teams, one member per team per round
            // Round 0: header+first-member of team1, header+first-member of team2, …
            // Round 1: second member of team1, second member of team2, …
            const sequence = []; // each entry is an array of elements to reveal together
            const maxMembers = Math.max(...buckets.map(b => b.length));
            for (let round = 0; round < maxMembers; round++) {
                buckets.forEach(bucket => {
                    if (round === 0) {
                        // First slot: header + first member together
                        const batch = [];
                        if (bucket[0]) batch.push(bucket[0]); // header
                        if (bucket[1]) batch.push(bucket[1]); // first member
                        if (batch.length) sequence.push(batch);
                    } else {
                        // Subsequent slots: index round+1 (skip header at index 0)
                        const member = bucket[round + 1];
                        if (member) sequence.push([member]);
                    }
                });
            }

            // Hide everything first
            allItems.forEach(el => el.classList.add('team-reveal-pending'));

            // Stagger reveals over 5 seconds (budget: totalDuration / number of batches)
            const totalDuration = 5000;
            const stagger = totalDuration / sequence.length;
            sequence.forEach((batch, i) => {
                setTimeout(() => {
                    batch.forEach(el => {
                        el.classList.remove('team-reveal-pending');
                        el.classList.add('team-reveal-enter');
                    });
                }, i * stagger);
            });
        }

        function clearTeams() {
            if (!selectedGroupName) return;
            const groupedBefore = (studentGroups[selectedGroupName] || []).filter(s => s.teamId != null).length;
            studentGroups[selectedGroupName].forEach(s => {
                if (s.teamId != null) {
                    logHistory('teams', s.name, `Cleared from Team ${s.teamId}`);
                    delete s.teamId;
                }
            });
            // Reset any custom names that were assigned
            teamColors.forEach(tc => { if (tc.customName) delete tc.customName; });
            persistTeamSettings();
            logHistory('teams', selectedGroupName, `Cleared teams (${groupedBefore} students ungrouped)`);
            currentTeamsActive = false;
            currentRequestedTeamCount = 0;
            updateUtilityButtons();
            renderRoster();
        }

        function processEmptyTeamCreation(teamCount) {
            if (!selectedGroupName) {
                showToast((window.i18n ? i18n.t('toast_select_class_first') : null) || 'Please select a group first!');
                return;
            }
            const val = parseInt(teamCount, 10);
            if (!val || val < 1) return;
            const allStudents = studentGroups[selectedGroupName] || [];
            allStudents.forEach(s => { delete s.teamId; });
            currentTeamsActive = true;
            currentRequestedTeamCount = val;
            logHistory('teams', selectedGroupName, `Created ${val} empty teams for manual assignment`);
            closeTeamModal();
            updateUtilityButtons();
            renderRoster();
            showToast((window.i18n ? i18n.t('teams_empty_created_toast', { count: val }) : null) || `${val} empty teams created. Drag students into teams or use context menu.`);
        }

        function assignStudentToTeam(studentId, teamId) {
            if (!selectedGroupName || !studentGroups[selectedGroupName]) return;
            const student = studentGroups[selectedGroupName].find(s => s.id === studentId);
            if (!student) return;
            const oldTeam = student.teamId;
            if (teamId == null) {
                delete student.teamId;
                logHistory('teams', student.name, `Removed from Team ${oldTeam || '-'}`);
            } else {
                student.teamId = parseInt(teamId, 10);
                logHistory('teams', student.name, `Assigned to Team ${teamId}`);
            }
            closeRosterContextMenu();
            renderRoster();
            renderRanking();
        }

        let teamRoles = [];
        const ROLES_FILE_TARGET = 'user';
        const ROLES_FILE_NAME = 'roles.js';
        const LEGACY_ROLES_FILE_TARGET = 'groupParticipation';
        const LEGACY_ROLES_FILE_NAME = 'roles.json';
        const DEFAULT_ROLE_DEFINITIONS = [];

        let roleDefinitions = DEFAULT_ROLE_DEFINITIONS.map(entry => ({ ...entry }));
        let literatureRoles = roleDefinitions.map(entry => entry.role);
        let activeRolePool = [];
        let rolesLibraryLoaded = false;
        let rolesEditorCollapsed = true;
        let rolesModalMode = 'assignment';

        function normalizeRoleDefinitions(raw) {
            const seen = new Set();
            const source = Array.isArray(raw) ? raw : [];
            return source
                .map(entry => {
                    if (typeof entry === 'string') {
                        return { role: entry.trim(), explanation: '' };
                    }
                    return {
                        role: String(entry?.role || '').trim(),
                        explanation: String(entry?.explanation || '').trim()
                    };
                })
                .filter(entry => {
                    if (!entry.role) return false;
                    const key = entry.role.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        }

        function syncRoleCollections() {
            literatureRoles = roleDefinitions.map(entry => entry.role).filter(Boolean);
            activeRolePool = activeRolePool.filter(role => literatureRoles.includes(role));
        }

        function getRolesEditorToggleLabel() {
            return rolesEditorCollapsed ? '[+]' : '[-]';
        }

        function toggleRolesEditor() {
            rolesEditorCollapsed = !rolesEditorCollapsed;
            const details = document.getElementById('roles-editor-details');
            const label = document.getElementById('roles-editor-toggle-label');
            if (details) details.style.display = rolesEditorCollapsed ? 'none' : 'block';
            if (label) label.textContent = getRolesEditorToggleLabel();
        }

        function parseArrayAssignment(rawContent, variableName) {
            const raw = String(rawContent || '').replace(/^\uFEFF/, '').trim();
            const match = raw.match(new RegExp(`${variableName}\\s*=\\s*([\\s\\S]*?);\\s*$`));
            if (!match || !match[1]) return null;
            return JSON.parse(match[1]);
        }

        async function persistRolesLibrary() {
            roleDefinitions = normalizeRoleDefinitions(roleDefinitions);
            syncRoleCollections();
            if (typeof window !== 'undefined') {
                window.ROLE_DEFINITIONS = roleDefinitions.map(entry => ({ ...entry }));
            }

            const result = await persistSettingsToUserFile();
            if (!result?.ok) {
                console.warn('Failed to save config.js:', result?.error || 'Unable to save config.js');
            }
            return result;
        }

        async function loadRolesLibrary(forceReload = false) {
            if (rolesLibraryLoaded && !forceReload) {
                syncRoleCollections();
                return roleDefinitions;
            }

            let loadedDefinitions = null;

            // Prefer window.ROLE_DEFINITIONS (set by loadConfigFromDisk from the external user file) over
            // the const ROLE_DEFINITIONS from the <script src> tag, which in a packaged/ASAR build may
            // be the bundled (empty) version rather than the user's saved roles.
            const _rdWindow = (typeof window !== 'undefined' && Array.isArray(window.ROLE_DEFINITIONS) && window.ROLE_DEFINITIONS.length)
                ? window.ROLE_DEFINITIONS : null;
            const _rdGlobal = (typeof ROLE_DEFINITIONS !== 'undefined' && Array.isArray(ROLE_DEFINITIONS) && ROLE_DEFINITIONS.length)
                ? ROLE_DEFINITIONS : null;
            if (_rdWindow) {
                loadedDefinitions = _rdWindow;
            } else if (_rdGlobal) {
                loadedDefinitions = _rdGlobal;
            }

            if ((!loadedDefinitions || !loadedDefinitions.length) && window.Desktop && typeof window.Desktop.readText === 'function') {
                try {
                    const result = await window.Desktop.readText(ROLES_FILE_TARGET, ROLES_FILE_NAME);
                    if (result?.ok) {
                        const parsed = parseArrayAssignment(result.content, 'ROLE_DEFINITIONS');
                        if (Array.isArray(parsed)) loadedDefinitions = parsed;
                    }
                } catch (error) {
                    console.warn('Failed to load roles.js:', error);
                }
            }

            if ((!loadedDefinitions || !loadedDefinitions.length) && window.Desktop && typeof window.Desktop.readJson === 'function') {
                try {
                    const legacy = await window.Desktop.readJson(LEGACY_ROLES_FILE_TARGET, LEGACY_ROLES_FILE_NAME);
                    if (legacy?.ok && Array.isArray(legacy.data)) {
                        loadedDefinitions = legacy.data;
                    }
                } catch (error) {
                    console.warn('Failed to load legacy roles.json:', error);
                }
            }

            roleDefinitions = normalizeRoleDefinitions(loadedDefinitions && loadedDefinitions.length ? loadedDefinitions : DEFAULT_ROLE_DEFINITIONS);
            syncRoleCollections();
            rolesLibraryLoaded = true;

            if (!loadedDefinitions || !loadedDefinitions.length) {
                await persistRolesLibrary();
            }

            return roleDefinitions;
        }

        async function openRolesModal(mode = 'assignment') {
            if (mode === 'settings') {
                await openSettingsModal('roles');
                return;
            }
            if (!selectedGroupName) {
                showToast('Please select a group first!');
                return;
            }

            rolesModalMode = mode;
            document.getElementById('roles-modal').style.display = 'flex';
            await loadRolesLibrary();
            renderRolesLibrary();
            loadSavedRolesSetups();
        }

        function closeRolesModal() {
            document.getElementById('roles-modal').style.display = 'none';
        }

        function loadSavedRolesSetups() {
            const container = document.getElementById('saved-roles-container');
            if (!container) return;

            if (!selectedGroupName) {
                container.innerHTML = `<div style="color: #666; font-size: 0.8rem; font-style: italic; text-align: center; padding: 10px 0;">Please select a class first.</div>`;
                return;
            }

            const allSaved = JSON.parse(localStorage.getItem('cms-saved-roles') || '{}');
            const groupSetups = allSaved[selectedGroupName] || {};
            const titles = Object.keys(groupSetups);

            if (titles.length === 0) {
                container.innerHTML = `<div style="color: #666; font-size: 0.8rem; font-style: italic; text-align: center; padding: 10px 0;">No saved role setups for this class.</div>`;
                return;
            }

            container.innerHTML = '';
            titles.forEach(title => {
                const setup = groupSetups[title];
                const studentCount = Object.keys(setup.assignments || {}).length;

                // Escape title for attributes and JS call
                const escapedTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                const item = document.createElement('div');
                item.style = 'display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #ddd; gap: 8px; margin-bottom: 4px;';

                item.innerHTML = `
            <span style="font-weight: 600; font-size: 0.85rem; color: #333; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;" title="${escapedTitle} (${studentCount} students)">
                ${title} <span style="font-weight: 400; font-size: 0.75rem; color: #666;">(${studentCount})</span>
            </span>
            <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700; background: #16a34a; border: 2px solid #16a34a; color: #fff; border-radius: 4px; cursor: pointer; transition: all 0.12s; font-family: inherit; line-height: 1.2;" onmouseover="this.style.background='#fff';this.style.color='#16a34a';" onmouseout="this.style.background='#16a34a';this.style.color='#fff';" onclick="loadRolesSetup('${escapedTitle}')">Load</button>
                <button style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700; background: #dc2626; border: 2px solid #dc2626; color: #fff; border-radius: 4px; cursor: pointer; transition: all 0.12s; font-family: inherit; line-height: 1.2;" onmouseover="this.style.background='#fff';this.style.color='#dc2626';" onmouseout="this.style.background='#dc2626';this.style.color='#fff';" onclick="deleteRolesSetup('${escapedTitle}')"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
            </div>
        `;
                container.appendChild(item);
            });
        }

        function saveCurrentRolesSetup() {
            if (!selectedGroupName) {
                showToast("Please select a group first!");
                return;
            }

            const students = studentGroups[selectedGroupName] || [];
            const activeAssignments = {};
            students.forEach(s => {
                if (s.role) {
                    activeAssignments[s.name] = s.role;
                }
            });

            if (Object.keys(activeAssignments).length === 0) {
                showToast("No active role assignments to save. Please assign roles first!", true);
                return;
            }

            showPrompt("Enter a title for this roles setup:", "", function (title) {
                if (title === null) return;
                title = title.trim();
                if (!title) {
                    showToast("Please enter a valid title.", true);
                    return;
                }

                const allSaved = JSON.parse(localStorage.getItem('cms-saved-roles') || '{}');
                if (!allSaved[selectedGroupName]) {
                    allSaved[selectedGroupName] = {};
                }

                allSaved[selectedGroupName][title] = {
                    assignments: activeAssignments
                };

                try {
                    localStorage.setItem('cms-saved-roles', JSON.stringify(allSaved));
                    showToast(`Roles setup "${title}" saved successfully!`);
                    loadSavedRolesSetups();
                } catch (e) {
                    showToast("Failed to save roles setup: " + e.message, true);
                }
            });
        }

        function loadRolesSetup(title) {
            if (!selectedGroupName) return;
            const allSaved = JSON.parse(localStorage.getItem('cms-saved-roles') || '{}');
            const groupSetups = allSaved[selectedGroupName] || {};
            const setup = groupSetups[title];
            if (!setup) {
                showToast("Setup not found!", true);
                return;
            }

            // Apply assignments to current students
            const students = studentGroups[selectedGroupName] || [];
            let assignedCount = 0;
            students.forEach(student => {
                const savedRole = setup.assignments[student.name];
                const previousRole = student.role || '';
                if (savedRole !== undefined) {
                    student.role = savedRole;
                    assignedCount++;
                } else {
                    delete student.role;
                }
                const nextRole = student.role || '';
                if (previousRole !== nextRole) {
                    const fromPart = previousRole ? ` (from ${previousRole})` : '';
                    if (nextRole) {
                        logHistory('role', student.name, `Assigned role ${nextRole}${fromPart}`);
                    } else if (previousRole) {
                        logHistory('role', student.name, `Cleared role ${previousRole}`);
                    }
                }
            });

            logHistory('role', selectedGroupName, `Loaded role setup: "${title}" (${assignedCount} student role assignments restored)`);

            // Refresh UI
            renderRoster();
            updateUtilityButtons();
            if (typeof autosaveToDb === 'function') autosaveToDb('roles');

            // Close modal
            closeRolesModal();
            showToast(`Loaded role setup: "${title}"`);
        }

        function deleteRolesSetup(title) {
            if (!selectedGroupName) return;
            showConfirm(`Are you sure you want to delete the roles setup "${title}"?`, function () {
                const allSaved = JSON.parse(localStorage.getItem('cms-saved-roles') || '{}');
                if (allSaved[selectedGroupName] && allSaved[selectedGroupName][title]) {
                    delete allSaved[selectedGroupName][title];
                    localStorage.setItem('cms-saved-roles', JSON.stringify(allSaved));
                    showToast(`Deleted roles setup: "${title}"`);
                    loadSavedRolesSetups();
                }
            });
        }

        function getAssignedRolesForSelectedGroup() {
            if (!selectedGroupName || !Array.isArray(studentGroups[selectedGroupName])) return [];
            const seen = new Set();
            return studentGroups[selectedGroupName]
                .map(student => String(student?.role || '').trim())
                .filter(role => {
                    if (!role) return false;
                    const key = role.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        }

        function reassignRolesFromUtility() {
            if (!selectedGroupName) {
                showToast('Please select a group first!');
                return;
            }

            if (activeRolePool.length === 0) {
                const assignedRoles = getAssignedRolesForSelectedGroup();
                activeRolePool = assignedRoles.length ? [...assignedRoles] : [...literatureRoles];
            }

            if (activeRolePool.length === 0) {
                showToast('No roles are available yet. Open Roles first to create or select some.');
                return;
            }

            assignRoles();
        }

        function clearAssignedRolesFromUtility() {
            if (!selectedGroupName) {
                showToast('Please select a group first!');
                return;
            }

            showConfirm('Clear assigned roles from students in this group?', function () {
                const students = studentGroups[selectedGroupName] || [];
                let clearedCount = 0;

                students.forEach(student => {
                    if (student.role) {
                        logHistory('role', student.name, `Cleared role ${student.role}`);
                        delete student.role;
                        clearedCount++;
                    }
                });

                if (clearedCount > 0) {
                    logHistory('role', selectedGroupName, `Cleared ${clearedCount} assigned role${clearedCount === 1 ? '' : 's'}`);
                }

                renderRoster();
                updateUtilityButtons();
                if (typeof autosaveToDb === 'function') autosaveToDb('clear-assigned-roles');
            });
        }

        async function openAssignedRolesInfo() {
            if (!selectedGroupName) {
                showToast('Please select a group first!');
                return;
            }

            await loadRolesLibrary();

            const content = document.getElementById('roles-info-content');
            const modal = document.getElementById('roles-info-modal');
            if (!content || !modal) return;

            const assignedRoles = getAssignedRolesForSelectedGroup();
            if (!assignedRoles.length) {
                content.innerHTML = `<p style="margin:0; color:#666; font-size:0.95rem;">${escapeRoleHtml(t('roles_info_empty'))}</p>`;
            } else {
                content.innerHTML = assignedRoles.map(role => {
                    const def = roleDefinitions.find(entry => entry.role.toLowerCase() === role.toLowerCase());
                    const explanation = def?.explanation || t('roles_info_missing');
                    return `
                <div style="border:1px solid #ddd; border-radius:8px; background:#fafafa; padding:12px 14px;">
                    <div style="font-weight:800; color:#111; margin-bottom:4px;">${escapeRoleHtml(role)}</div>
                    <div style="color:#444; line-height:1.45;">${escapeRoleHtml(explanation)}</div>
                </div>`;
                }).join('');
            }

            modal.style.display = 'flex';
        }

        function closeAssignedRolesInfo() {
            const modal = document.getElementById('roles-info-modal');
            if (modal) modal.style.display = 'none';
        }

        function renderRolesInputs() {
            renderRolesLibrary();
        }

        function addRoleInput() {
            teamRoles.push('');
            renderRolesInputs();
        }

        function removeRoleInput(index) {
            teamRoles.splice(index, 1);
            renderRolesInputs();
        }

        async function updateRoleDefinition(index, key, value) {
            if (!roleDefinitions[index]) return;
            roleDefinitions[index][key] = String(value || '').trim();
            await persistRolesLibrary();
            renderRolesLibrary();
        }

        async function removeLibraryRole(index) {
            const removed = roleDefinitions[index];
            if (!removed) return;
            roleDefinitions.splice(index, 1);
            activeRolePool = activeRolePool.filter(role => role !== removed.role);
            await persistRolesLibrary();
            renderRolesLibrary();
        }

        async function saveRolesFromOverlay() {
            const rows = Array.from(document.querySelectorAll('.role-editor-row'));
            if (rows.length > 0) {
                roleDefinitions = rows.map(row => ({
                    role: row.querySelector('[data-field="role"]')?.value || '',
                    explanation: row.querySelector('[data-field="explanation"]')?.value || ''
                }));
            }

            const result = await persistRolesLibrary();
            renderRolesLibrary();

            if (result?.ok) {
                mdbToast('Roles saved to config.js');
                console.log('config.js saved successfully');
            } else {
                showToast('Save failed: ' + (result?.error || 'Unable to save config.js'), true);
            }
        }

        function escapeRoleHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function renderRolesLibrary() {
            const container = document.getElementById('roles-list-container');
            const editorHost = document.getElementById('roles-editor-section');
            const randomBtn = document.getElementById('roles-random-rank-btn');
            const distributeBtn = document.getElementById('roles-distribute-btn');
            const modalTitle = document.getElementById('roles-modal-title');
            const actionsHelp = document.getElementById('roles-actions-help');
            const choiceGrid = document.getElementById('roles-choice-grid');
            if (!container || !editorHost) return;

            const settingsMode = rolesModalMode === 'settings';
            syncRoleCollections();

            const chipsHtml = roleDefinitions.map(entry => {
                const role = entry.role;
                const explanation = entry.explanation || '';
                const isActive = activeRolePool.includes(role);
                return `
            <div
                title="${escapeRoleHtml(explanation || role)}"
                onclick="toggleRoleChip(${JSON.stringify(role).replace(/"/g, '&quot;')})"
                style="padding:5px 12px; border-radius:4px; cursor:pointer; font-size:0.85rem; border:2px solid ${isActive ? '#111' : '#bbb'}; background:${isActive ? '#111' : '#f5f5f5'}; color:${isActive ? 'white' : '#333'}; transition:all 0.12s; font-weight:600;">
                ${escapeRoleHtml(role)}
            </div>`;
            }).join('');

            const rowsHtml = roleDefinitions.map((entry, index) => `
        <div class="role-editor-row" style="border:1px solid #ddd; border-radius:6px; background:#fafafa; padding:8px;">
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                <input type="text" value="${escapeRoleHtml(entry.role)}" placeholder="Role" data-field="role"
                       onchange="updateRoleDefinition(${index}, 'role', this.value)"
                       style="flex:1; padding:7px 8px; border:1px solid #ccc; border-radius:5px;">
                <button onclick="removeLibraryRole(${index})"
                        style="padding:7px 10px; border:2px solid #b33; border-radius:5px; background:#fff; color:#b33; font-weight:700; cursor:pointer;">Remove</button>
            </div>
            <textarea placeholder="Explanation" data-field="explanation"
                      onchange="updateRoleDefinition(${index}, 'explanation', this.value)"
                      style="width:100%; min-height:54px; padding:7px 8px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box; resize:vertical;">${escapeRoleHtml(entry.explanation || '')}</textarea>
        </div>
    `).join('');

            if (modalTitle) modalTitle.textContent = settingsMode ? 'Edit Roles' : 'Choose Roles or Ranks';
            if (actionsHelp) actionsHelp.style.display = settingsMode ? 'none' : '';
            if (choiceGrid) choiceGrid.style.display = settingsMode ? 'none' : '';
            if (randomBtn) randomBtn.style.display = settingsMode ? 'none' : '';
            if (distributeBtn) {
                distributeBtn.style.display = settingsMode ? 'none' : '';
                distributeBtn.disabled = !settingsMode && activeRolePool.length === 0;
                distributeBtn.title = (!settingsMode && activeRolePool.length === 0)
                    ? 'Select one or more roles above first'
                    : 'Distribute the selected roles to students';
            }

            container.innerHTML = settingsMode ? '' : `
        <p style="font-size: 0.9rem; font-weight: bold; margin-bottom: 8px;">Option A · Choose role titles to use:</p>
        <div id="role-chips" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px;">${chipsHtml}</div>

        <p style="font-size: 0.9rem; font-weight: bold; margin-bottom: 8px;">Add a Temporary Role:</p>
        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">
            <input type="text" id="new-role-input" placeholder="Role name"
                   style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px; box-sizing:border-box;">
            <textarea id="new-role-explanation" placeholder="Explanation"
                      style="width:100%; min-height:56px; padding:8px; border:1px solid #ddd; border-radius:5px; box-sizing:border-box; resize:vertical;"></textarea>
            <button onclick="addNewRole()"
                    style="background:#111; color:white; border:2px solid #111; border-radius:5px; padding:8px 15px; font-weight:700;">Add</button>
        </div>
    `;

            editorHost.innerHTML = settingsMode ? `
        <div id="roles-edition-section" style="border-top:1px solid #eee; padding:12px 0 6px 0; margin-top:4px;">
            <p id="roles-editor-title-text" style="font-size:0.9rem; font-weight:bold; margin:0 0 8px 0;">Edit roles in config.js</p>
            <div id="role-editor-empty" style="font-size:0.85rem; color:#666; margin-bottom:10px;">${roleDefinitions.length ? 'Edit any role below and save to config.js.' : 'No roles defined yet. Add one below.'}</div>
            <p style="font-size:0.9rem; font-weight:bold; margin:0 0 8px 0;">Add a New Role:</p>
            <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">
                <input type="text" id="new-role-input" placeholder="Role name"
                       style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px; box-sizing:border-box;">
                <textarea id="new-role-explanation" placeholder="Explanation"
                          style="width:100%; min-height:56px; padding:8px; border:1px solid #ddd; border-radius:5px; box-sizing:border-box; resize:vertical;"></textarea>
                <button onclick="addNewRole()"
                        style="background:#111; color:white; border:2px solid #111; border-radius:5px; padding:8px 15px; font-weight:700;">Add</button>
            </div>
            <div id="role-editor-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">${rowsHtml}</div>
            <button onclick="saveRolesFromOverlay()" style="width:100%; margin:0 0 8px 0; padding:8px 12px; border:2px solid #111; border-radius:5px; background:#fff; color:#111; font-weight:700; cursor:pointer;">Save to config.js</button>
        </div>
    ` : `
        <div style="border-top:1px solid #eee; padding:12px 0 0 0; margin-top:4px; color:#666; font-size:0.85rem;">
            To edit role definitions, use Settings → Edit Roles.
        </div>
    `;
        }

        function toggleRoleChip(role) {
            if (activeRolePool.includes(role)) activeRolePool = activeRolePool.filter(r => r !== role);
            else activeRolePool.push(role);
            renderRolesLibrary();
        }

        async function addNewRole() {
            const input = document.getElementById('new-role-input');
            const explanationInput = document.getElementById('new-role-explanation');
            const role = String(input?.value || '').trim();
            const explanation = String(explanationInput?.value || '').trim();

            if (!role) return;

            const settingsMode = rolesModalMode === 'settings';
            const existing = roleDefinitions.find(entry => entry.role.toLowerCase() === role.toLowerCase());
            if (existing) {
                if (explanation) existing.explanation = explanation;
            } else {
                roleDefinitions.push({ role, explanation });
            }

            if (!activeRolePool.includes(role)) activeRolePool.push(role);

            if (input) input.value = '';
            if (explanationInput) explanationInput.value = '';

            if (settingsMode) {
                await persistRolesLibrary();
            }
            renderRolesLibrary();
        }

        function renderRolesLibraryInSettings() {
            const editorHost = document.getElementById('roles-settings-editor-section');
            if (!editorHost) return;
            syncRoleCollections();
            if (!roleDefinitions.length) {
                editorHost.innerHTML = `<div style="font-size:0.85rem; color:#666; font-style:italic; padding:10px 0;">No roles defined. Click "+ Add Role" below to create one.</div>`;
                return;
            }
            editorHost.innerHTML = roleDefinitions.map((entry, index) => `
                <div class="role-editor-row" style="border:2px solid #333; border-radius:8px; background:#fafafa; padding:10px 12px; box-shadow:2px 2px 0 #555;">
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                        <input type="text" value="${escapeRoleHtml(entry.role)}" placeholder="Role title"
                               onchange="updateRoleDefinition(${index}, 'role', this.value); renderRolesLibraryInSettings();"
                               style="flex:1; padding:7px 10px; border:2px solid #333; border-radius:6px; font-weight:700; font-size:0.9rem;">
                        <button type="button" onclick="removeLibraryRole(${index}).then(() => renderRolesLibraryInSettings())"
                                class="btn-mini"
                                style="padding:6px 12px; border:2px solid #b33; border-radius:6px; background:#fff; color:#b33; font-weight:700; cursor:pointer;">Remove</button>
                    </div>
                    <textarea placeholder="Role explanation or expectations"
                              onchange="updateRoleDefinition(${index}, 'explanation', this.value)"
                              style="width:100%; min-height:48px; padding:7px 10px; border:2px solid #333; border-radius:6px; box-sizing:border-box; resize:vertical; font-family:inherit; font-size:0.84rem;">${escapeRoleHtml(entry.explanation || '')}</textarea>
                </div>
            `).join('');
        }

        async function addLibraryRole() {
            roleDefinitions.push({ role: 'New Role', explanation: '' });
            syncRoleCollections();
            renderRolesLibraryInSettings();
            await persistRolesLibrary();
        }

        async function saveRolesLibrary() {
            await persistRolesLibrary();
            showToast('Roles saved successfully');
        }

        async function resetRolesToDefault() {
            roleDefinitions = [];
            syncRoleCollections();
            await persistRolesLibrary();
            renderRolesLibraryInSettings();
            showToast('Roles reset to defaults');
        }

        function getShuffledArray(items) {
            const arr = [...items];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function assignRandomRanks() {
            if (!selectedGroupName) {
                showToast(t('alert_select_group'));
                return;
            }

            const allStudents = studentGroups[selectedGroupName] || [];
            const _halfArr = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = _halfArr ? _halfGroupFilter(allStudents, _halfArr) : allStudents;
            const activeStudents = students.filter(s => !s.isAbsent);

            students.forEach(s => {
                if (s.isAbsent) delete s.role;
            });

            if (activeStudents.length === 0) {
                showToast(t('alert_no_present_ranks'));
                return;
            }

            const hasTeams = activeStudents.some(s => s.teamId != null);
            currentTeamsActive = hasTeams;

            if (hasTeams) {
                const teamIds = [...new Set(activeStudents.map(s => s.teamId).filter(id => id != null))].sort((a, b) => a - b);
                teamIds.forEach(tId => {
                    const teamMembers = activeStudents.filter(s => s.teamId === tId);
                    const shuffledRanks = getShuffledArray(Array.from({ length: teamMembers.length }, (_, i) => String(i + 1)));

                    teamMembers.forEach((student, index) => {
                        const previousRole = student.role || '';
                        student.role = shuffledRanks[index];
                        const nextRole = student.role || '';
                        if (previousRole !== nextRole) {
                            const fromPart = previousRole ? ` (from ${previousRole})` : '';
                            logHistory('rank', student.name, `Assigned rank ${nextRole}${fromPart} in Team ${tId}`);
                        }
                    });
                });

                const unassignedMembers = activeStudents.filter(s => s.teamId == null);
                if (unassignedMembers.length > 0) {
                    const unassignedRanks = getShuffledArray(Array.from({ length: unassignedMembers.length }, (_, i) => String(i + 1)));
                    unassignedMembers.forEach((student, index) => {
                        const previousRole = student.role || '';
                        student.role = unassignedRanks[index];
                        const nextRole = student.role || '';
                        if (previousRole !== nextRole) {
                            const fromPart = previousRole ? ` (from ${previousRole})` : '';
                            logHistory('rank', student.name, `Assigned rank ${nextRole}${fromPart}`);
                        }
                    });
                }

                logHistory('rank', selectedGroupName, `Assigned random ranks to ${activeStudents.length} students across ${teamIds.length} teams`);
            } else {
                const shuffledRanks = getShuffledArray(Array.from({ length: activeStudents.length }, (_, i) => String(i + 1)));

                activeStudents.forEach((student, index) => {
                    const previousRole = student.role || '';
                    student.role = shuffledRanks[index];
                    const nextRole = student.role || '';
                    if (previousRole !== nextRole) {
                        const fromPart = previousRole ? ` (from ${previousRole})` : '';
                        logHistory('rank', student.name, `Assigned rank ${nextRole}${fromPart}`);
                    }
                });
                logHistory('rank', selectedGroupName, `Assigned random ranks to ${activeStudents.length} students`);
            }

            closeRolesModal();
            renderRoster();
            updateUtilityButtons();
            if (typeof autosaveToDb === 'function') autosaveToDb('random-ranks');
        }

        function setRoleValue(index, val) {
            teamRoles[index] = val;
            renderRolesInputs();
        }

        function handleRoleDropdownChange(selectEl, index) {
            teamRoles[index] = selectEl.value;
            renderRolesInputs(); // Re-render to show/hide the text input
        }

        function assignRoles() {
            if (!selectedGroupName) {
                showToast("Please select a group first!");
                return;
            }

            if (activeRolePool.length === 0) {
                showToast("Please select at least one role from the list!");
                return;
            }

            const allStudents = studentGroups[selectedGroupName] || [];
            const _halfArr3 = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = _halfArr3 ? _halfGroupFilter(allStudents, _halfArr3) : allStudents;
            const activeStudents = students.filter(s => !s.isAbsent);

            students.forEach(s => {
                if (s.isAbsent) delete s.role;
            });

            if (activeStudents.length === 0) {
                showToast('No present students to assign roles to.');
                return;
            }

            const hasTeams = activeStudents.some(s => s.teamId != null);
            currentTeamsActive = hasTeams;

            if (hasTeams) {
                // --- TEAM LOGIC ---
                const teamIds = [...new Set(activeStudents.map(s => s.teamId).filter(id => id != null))].sort((a, b) => a - b);
                teamIds.forEach(tId => {
                    const teamMembers = activeStudents.filter(s => s.teamId === tId);
                    const shuffledRoles = getShuffledArray(activeRolePool);
                    teamMembers.forEach((student, index) => {
                        const previousRole = student.role || '';
                        const roleIndex = index % shuffledRoles.length;
                        student.role = shuffledRoles[roleIndex] || "";
                        const nextRole = student.role || '';
                        if (previousRole !== nextRole) {
                            if (nextRole) {
                                const fromPart = previousRole ? ` (from ${previousRole})` : '';
                                logHistory('role', student.name, `Assigned role ${nextRole}${fromPart} in Team ${tId}`);
                            } else if (previousRole) {
                                logHistory('role', student.name, `Cleared role ${previousRole} in Team ${tId}`);
                            }
                        }
                    });
                });

                const unassignedMembers = activeStudents.filter(s => s.teamId == null);
                if (unassignedMembers.length > 0) {
                    const shuffledRoles = getShuffledArray(activeRolePool);
                    unassignedMembers.forEach((student, index) => {
                        const previousRole = student.role || '';
                        const roleIndex = index % shuffledRoles.length;
                        student.role = shuffledRoles[roleIndex] || "";
                        const nextRole = student.role || '';
                        if (previousRole !== nextRole) {
                            if (nextRole) {
                                const fromPart = previousRole ? ` (from ${previousRole})` : '';
                                logHistory('role', student.name, `Assigned role ${nextRole}${fromPart}`);
                            } else if (previousRole) {
                                logHistory('role', student.name, `Cleared role ${previousRole}`);
                            }
                        }
                    });
                }

                logHistory('role', selectedGroupName, `Assigned roles to ${activeStudents.length} students across ${teamIds.length} teams`);
            } else {
                // --- WHOLE CLASS LOGIC ---
                // Shuffle the roles once, then loop through the class
                const shuffledRoles = getShuffledArray(activeRolePool);

                activeStudents.forEach((student, index) => {
                    // Assign roles sequentially from the shuffled pool
                    // For example, if you have 3 roles and 30 students, 
                    // the 3 roles will repeat 10 times.
                    const roleIndex = index % shuffledRoles.length;
                    const previousRole = student.role || '';
                    student.role = shuffledRoles[roleIndex];
                    const nextRole = student.role || '';
                    if (previousRole !== nextRole) {
                        const fromPart = previousRole ? ` (from ${previousRole})` : '';
                        logHistory('role', student.name, `Assigned role ${nextRole}${fromPart}`);
                    }
                });
                logHistory('role', selectedGroupName, `Assigned roles to ${activeStudents.length} students`);
            }

            closeRolesModal();
            renderRoster();
            updateUtilityButtons();
            if (typeof autosaveToDb === 'function') autosaveToDb('roles');
        }

        function clearAllRoles() {
            showConfirm("Remove all assigned roles from students?", function () {
                activeRolePool = [];

                const students = selectedGroupName ? (studentGroups[selectedGroupName] || []) : [];
                students.forEach(student => {
                    if (student.role) {
                        logHistory('role', student.name, `Cleared role ${student.role}`);
                        delete student.role;
                    }
                });

                renderRolesInputs();
                renderRoster();
                updateUtilityButtons();
                closeRolesModal();
                if (typeof autosaveToDb === 'function') autosaveToDb('clear-roles');
            });
        }

        // Open the role-change popup for a single student (manual role assignment)
        async function openRoleChangePopup(studentId) {
            console.log('openRoleChangePopup called, studentId:', studentId, 'rosterContextStudentId:', rosterContextStudentId, 'selectedGroupName:', selectedGroupName);
            if (!selectedGroupName) { showToast('Please select a group first!'); return; }

            await loadRolesLibrary();

            const students = studentGroups[selectedGroupName] || [];
            if (studentId == null) studentId = rosterContextStudentId;

            console.log('Looking up student for id:', studentId, 'in group:', selectedGroupName, 'students count:', students.length);

            let student = null;
            const idx = Number(studentId);
            if (!isNaN(idx) && students[idx]) student = students[idx];
            if (!student) student = students.find(s => s.id === studentId || s.studentId === studentId || s.name === studentId);
            if (!student) {
                student = students.find(s => (s.id != null && Number(s.id) === Number(studentId)));
            }
            if (!student) {
                console.log('openRoleChangePopup: student not found for id', studentId);
                showToast('Student not found.');
                return;
            }

            rosterContextStudentId = student.id || studentId;
            const nameEl = document.getElementById('role-change-name');
            if (nameEl) nameEl.textContent = student.name || '';
            const list = document.getElementById('role-change-list');
            if (list) list.innerHTML = '';
            console.log('openRoleChangePopup: found student', student.name, 'id', student.id);

            const clearBtn = document.createElement('button');
            clearBtn.textContent = 'Clear Role';
            clearBtn.onclick = () => setStudentRole(student, null);
            list.appendChild(clearBtn);

            const poolMap = new Map();
            (roleDefinitions || []).forEach(entry => {
                if (entry?.role) poolMap.set(entry.role, entry);
            });
            [...(activeRolePool || []), ...(literatureRoles || [])].forEach(role => {
                if (role && !poolMap.has(role)) poolMap.set(role, { role, explanation: '' });
            });

            Array.from(poolMap.values()).forEach(entry => {
                const b = document.createElement('button');
                b.textContent = entry.role;
                b.title = entry.explanation || entry.role;
                b.onclick = () => setStudentRole(student, entry.role);
                list.appendChild(b);
            });

            const hint = document.createElement('div');
            hint.textContent = 'Edit the roles list from the Roles modal.';
            hint.style = 'margin-top:8px; font-size:0.85rem; color:#666;';
            list.appendChild(hint);

            document.getElementById('role-change-popup').classList.add('open');
        }

        function setStudentRole(studentOrId, role) {
            if (!selectedGroupName) return;
            const students = studentGroups[selectedGroupName] || [];
            let student = (typeof studentOrId === 'object') ? studentOrId : null;
            if (!student) {
                const id = studentOrId;
                const idx = Number(id);
                if (!isNaN(idx) && students[idx]) student = students[idx];
                if (!student) student = students.find(s => s.id == id || s.studentId == id || s.name == id);
            }
            if (!student) { showToast('Student not found.'); return; }

            const previousRole = student.role || '';
            if (role == null) {
                delete student.role;
            } else {
                student.role = role;
                const existing = roleDefinitions.find(entry => entry.role.toLowerCase() === String(role).toLowerCase());
                if (!existing) {
                    roleDefinitions.push({ role: String(role).trim(), explanation: '' });
                    if (!activeRolePool.includes(role)) activeRolePool.push(role);
                    persistRolesLibrary().catch(error => console.warn('Failed to persist custom role:', error));
                }
            }
            const nextRole = student.role || '';
            if (previousRole !== nextRole) {
                const changeLabel = nextRole ? `${previousRole || 'none'} -> ${nextRole}` : `${previousRole || 'none'} -> none`;
                logHistory('role-change', student.name, `Role changed (${changeLabel})`);
            }
            document.getElementById('role-change-popup').classList.remove('open');
            renderRoster();
            updateUtilityButtons();
            if (typeof autosaveToDb === 'function') autosaveToDb('role-change');
            closeRosterContextMenu();
        }

        function renderRoster() {
            if (!PRESENTATION_MODE) _broadcastPresentationState();
            if (rosterPlanView) { renderRosterPlanView(); return; }
            const listEl = document.getElementById('roster-list');
            listEl.classList.remove('roster-plan-view');
            listEl.style.removeProperty('--cp-cols');
            listEl.style.height = '';
            listEl.style.gridAutoRows = '';
            listEl.innerHTML = "";
            closeRosterContextMenu();
            document.body.querySelectorAll(':scope > .badge-popup').forEach(el => el.remove());
            _openBadgePopupKey = null;
            listEl.classList.toggle('teams-active', !!currentTeamsActive);

            if (!selectedGroupName || !studentGroups[selectedGroupName]) {
                listEl.innerHTML = '<li style="color:#999; padding: 20px; text-align: center;" data-i18n="roster_select_group">Select a group...</li>';
                updatePresentCount();
                return;
            }

            const allStudents = studentGroups[selectedGroupName];
            const halfNames = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = halfNames ? _halfGroupFilter(allStudents, halfNames) : allStudents;

            const sortedStudents = [...students].sort((a, b) => {
                if (!!a.isAbsent !== !!b.isAbsent) return a.isAbsent ? 1 : -1;
                const aid = a.teamId || 0;
                const bid = b.teamId || 0;
                if (aid !== bid) return aid - bid;
                return compareStudentsByName(a, b);
            });

            let lastTeamId = null;
            sortedStudents.forEach(student => {
                const teamColor = student.teamId ? teamColors[(student.teamId - 1) % teamColors.length] : null;

                if (student.teamId && student.teamId !== lastTeamId) {
                    const teamMembers = students.filter(s => s.teamId === student.teamId);
                    const totalTeamScore = teamMembers.reduce((acc, s) => acc + (((s.pluses || 0) + (s.teamPluses || 0)) - ((s.minuses || 0) + (s.teamMinuses || 0))), 0);
                    const avgScore = (totalTeamScore / teamMembers.length).toFixed(1);
                    const teamBadgeMap = {};
                    teamMembers.forEach(function (member) {
                        (member.badges || []).forEach(function (b) {
                            if (_badgeScopeForBadge(b) === 'individual') return;
                            if (!teamBadgeMap[b.icon]) teamBadgeMap[b.icon] = { icon: b.icon, label: b.label, tone: b.tone || 'positive', count: 0 };
                            teamBadgeMap[b.icon].count++;
                        });
                    });
                    const teamBadgeSpans = Object.values(teamBadgeMap).map(function (b) {
                        const sup = b.count > 1 ? '<sup>' + b.count + '</sup>' : '';
                        const toneClass = b.tone === 'negative' ? ' badge-chip-negative' : ' badge-chip-positive';
                        return '<span class="earned-badge-chip' + toneClass + '" title="Team badge: ' + b.label + '">' + b.icon + sup + '</span>';
                    }).join('');
                    const teamBadgeButtons = buildTeamBadgeButtons(student.teamId);

                    // Fetch custom name or use default
                    const customName = teamColor.customName || `${student.teamId}. ${teamColor.name} Team`;

                    const divider = document.createElement('li');
                    divider.style = `grid-column: 1 / -1; background: ${teamColor.hex}; padding: 8px; font-weight: bold; border-radius: 5px 5px 0 0; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;`;

                    divider.setAttribute('draggable', 'true'); // Make the header draggable
                    divider.setAttribute('data-team-id', student.teamId);

                    // Add the dragstart listener to the header
                    divider.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('sourceTeamId', student.teamId);
                        e.currentTarget.style.opacity = '0.5';
                    });

                    divider.addEventListener('dragend', (e) => {
                        e.currentTarget.style.opacity = '1';
                        document.querySelectorAll('[data-team-id]').forEach(el => el.style.border = '');
                    });

                    divider.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="cursor: pointer; text-decoration: underline dashed; text-underline-offset: 3px;" 
                          onclick="renameTeam(${student.teamId})" title="Click to rename">
                        ${customName} <span style="font-weight: 400; font-size: 0.85rem; opacity: 0.7;">(${teamMembers.length})</span>
                    </span>
                    <span style="background: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; border: 1px solid ${teamColor.border}; cursor: default;${badgesVisible ? '' : ' display:none'}">
                        Avg: ${avgScore > 0 ? '+' : ''}${avgScore}
                    </span>
                </div>
                <div class="roster-controls">
                    <button class="btn-mini btn-plus" onclick="modTeam(${student.teamId}, 'p', 1)" title="Team plus">T+</button>
                    <button class="btn-mini btn-minus" onclick="modTeam(${student.teamId}, 'm', 1)" title="Team minus">T-</button>
                    ${teamBadgeButtons}
                    ${teamBadgeSpans ? `<span class="team-badges-earned">${teamBadgeSpans}</span>` : ''}
                </div>
            `;

                    divider.setAttribute('data-team-id', student.teamId);
                    divider.addEventListener('dragover', dragOver);
                    divider.addEventListener('dragleave', dragLeave);
                    divider.addEventListener('drop', dropOnTeam);

                    listEl.appendChild(divider);
                    lastTeamId = student.teamId;
                }

                const isBlinking = typeof _activeBlinkStudentId !== 'undefined' && _activeBlinkStudentId === student.id && (Date.now() - _activeBlinkTime < 4000);
                const li = document.createElement('li');
                li.className = `roster-item ${student.isPicked ? 'picked' : ''} ${student.isAbsent ? 'absent' : ''} ${student.isFlagged ? 'flagged-student' : ''} ${student.inExam ? 'in-exam' : ''} ${isBlinking ? 'picked-blink' : ''}`;
                li.setAttribute('draggable', currentTeamsActive && !student.isAbsent ? 'true' : 'false');
                li.setAttribute('data-student-id', student.id);
                li.addEventListener('contextmenu', function (event) {
                    openRosterContextMenu(event, student.id);
                });

                if (currentTeamsActive && !student.isAbsent) {
                    li.style.backgroundColor = teamColor ? teamColor.hex : '';
                    li.style.cursor = 'grab';
                    li.addEventListener('dragstart', dragStart);
                    li.addEventListener('dragend', dragEnd);
                    li.addEventListener('dragover', dragOver);
                    li.addEventListener('dragleave', dragLeave);
                    li.addEventListener('drop', dropOnTeam);
                }

                const plusDisplay = student.pluses > 0 ? `+${student.pluses}` : '';
                const minusDisplay = student.minuses > 0 ? `−${student.minuses}` : '';
                const teamPlusDisplay = student.teamPluses > 0 ? `T+${student.teamPluses}` : '';
                const teamMinusDisplay = student.teamMinuses > 0 ? `T−${student.teamMinuses}` : '';

                const badgeMap = {};
                (student.badges || []).forEach(function (b) {
                    if (!badgeMap[b.icon]) badgeMap[b.icon] = { icon: b.icon, label: b.label, tone: b.tone || 'positive', count: 0 };
                    badgeMap[b.icon].count++;
                });
                const badgeSpans = Object.values(badgeMap).map(function (b) {
                    const sup = b.count > 1 ? '<sup>' + b.count + '</sup>' : '';
                    const toneClass = b.tone === 'negative' ? ' badge-chip-negative' : ' badge-chip-positive';
                    return '<span class="earned-badge-chip' + toneClass + '" onclick="removeBadge(' + student.id + ',\'' + b.icon + '\')" title="Click to remove one ' + b.label + '">' + b.icon + sup + '</span>';
                }).join('');

                const teamBadgeMap = {};
                (student.badges || []).forEach(function (b) {
                    if (_badgeScopeForBadge(b) === 'individual') return;
                    if (!teamBadgeMap[b.icon]) teamBadgeMap[b.icon] = { icon: b.icon, label: b.label, tone: b.tone || 'positive', count: 0 };
                    teamBadgeMap[b.icon].count++;
                });
                const teamBadgeSpans = Object.values(teamBadgeMap).map(function (b) {
                    const sup = b.count > 1 ? '<sup>' + b.count + '</sup>' : '';
                    const toneClass = b.tone === 'negative' ? ' badge-chip-negative' : ' badge-chip-positive';
                    return '<span class="earned-badge-chip' + toneClass + '" onclick="removeBadge(' + student.id + ',\'' + b.icon + '\')" title="Click to remove one ' + b.label + '">' + b.icon + sup + '</span>';
                }).join('');

                const hasNotes = student.comments && student.comments.length > 0;
                const isSen = !!(student.sen || (student.uuid && studentRoster[student.uuid]?.sen));
                const senStarHtml = (senVisible && !PRESENTATION_MODE && isSen) ? '<span class="sen-indicator" title="SEN" style="color:#e11d48;font-weight:bold;margin-left:2px;">*</span>' : '';
                const examBadgeHtml = student.inExam ? `<span class="student-exam-badge" title="${window.i18n ? i18n.t('studentInExamBadge') : 'In Exam'}"><img src="../assets/icons/test-creator.svg" class="btn-icon" style="width:12px;height:12px;vertical-align:middle;margin-right:2px;" alt="" />${window.i18n ? i18n.t('studentInExamBadge') : 'In Exam'}</span>` : '';

                li.innerHTML = `
    <div class="student-info">
        <span class="student-name" onclick="if (event.altKey || event.shiftKey) { event.stopPropagation(); highlightStudentManually(${student.id}); } else { toggleStrike(${student.id}); }" title="${student.name}">
            ${getDisplayName(student)}${senStarHtml}${renderStudentFlagsHtml(student)}${examBadgeHtml}
            ${student.role && rolesVisible ? `<i class="student-role-tag" onclick="event.stopPropagation(); changeStudentRole(${student.id})" title="Click to change role" style="color: #444; font-size: var(--student-role-size, 0.81rem); margin-left: 8px; cursor: pointer; border-bottom: 1px dashed #aaa;">(${student.role})</i>` : ''}
        </span>
        <span class="comment-dot ${hasNotes ? 'has-comment' : ''}" onclick="openCommentPopup(event, ${student.id})" title="${hasNotes ? 'View notes' : 'Add note'}"></span>
        <div class="badges" id="badges-row-${student.id}" style="${badgesVisible ? '' : 'display:none'}">
            <span class="student-badges-earned">${badgeSpans}</span>
            ${plusDisplay ? `<span class="p-plus" onclick="mod(${student.id}, 'p', -1)">${plusDisplay}</span>` : ''}
            ${minusDisplay ? `<span class="p-minus" onclick="mod(${student.id}, 'm', -1)">${minusDisplay}</span>` : ''}
            ${teamPlusDisplay ? `<span class="p-team-plus" onclick="modTeam(${student.teamId || 'null'}, 'p', -1, ${student.id})" title="Click to remove one team plus" style="cursor:pointer;">${teamPlusDisplay}</span>` : ''}
            ${teamMinusDisplay ? `<span class="p-team-minus" onclick="modTeam(${student.teamId || 'null'}, 'm', -1, ${student.id})" title="Click to remove one team minus" style="cursor:pointer;">${teamMinusDisplay}</span>` : ''}
            ${teamBadgeSpans ? `<span class="team-badges-earned">${teamBadgeSpans}</span>` : ''}
        </div>
    </div>
    <div class="roster-controls">
        <button type="button" class="btn-mini btn-highlight" onclick="event.stopPropagation(); highlightStudentManually(${student.id})" title="${window.i18n ? i18n.t('btn_highlight_student') : 'Highlight student'}" data-i18n-title="btn_highlight_student" ${student.isAbsent ? 'style="display:none"' : ''}><img src="../assets/icons/eye.svg" class="btn-icon" style="width:13px;height:13px;vertical-align:middle;" alt="" /></button>
        <button class="btn-mini btn-badge-open" onclick="toggleBadgePopup(event, ${student.id}, 'individual')" title="Award a badge" ${student.isAbsent || !buildBadgePopupButtons(student.id, 'individual') ? 'style="display:none"' : ''}>★</button>
        <div class="badge-popup" id="${_badgePopupElementId(student.id, 'individual')}">
            ${buildBadgePopupButtons(student.id, 'individual')}
        </div>
        ${!student.isAbsent ? buildBadgeInlineButtons(student.id, 'individual', 'positive') : ''}
        <button class="btn-mini btn-plus" onclick="mod(${student.id}, 'p', 1)" ${student.isAbsent ? 'style="display:none"' : ''}>+</button>
        <button class="btn-mini btn-minus" onclick="mod(${student.id}, 'm', 1)" ${student.isAbsent ? 'style="display:none"' : ''}>-</button>
        ${!student.isAbsent ? buildBadgeInlineButtons(student.id, 'individual', 'negative') : ''}
    </div>
`;
                listEl.appendChild(li);
            });

            // Render empty team headers for requested teams that got no students
            if (currentTeamsActive && currentRequestedTeamCount > 0) {
                const renderedTeamIds = new Set(sortedStudents.filter(s => s.teamId != null).map(s => s.teamId));
                for (let tid = 1; tid <= currentRequestedTeamCount; tid++) {
                    if (renderedTeamIds.has(tid)) continue;
                    const teamColor = teamColors[(tid - 1) % teamColors.length];
                    const customName = (teamColor && teamColor.customName) ? teamColor.customName : `${tid}. ${teamColor.name} Team`;
                    const teamBadgePopup = buildBadgePopupButtons(tid, 'team');
                    const teamBadgeInlinePositive = buildBadgeInlineButtons(tid, 'team', 'positive');
                    const teamBadgeInlineNegative = buildBadgeInlineButtons(tid, 'team', 'negative');
                    const teamBadgeButtons = buildTeamBadgeButtons(tid);
                    const divider = document.createElement('li');
                    divider.style = `grid-column: 1 / -1; background: ${teamColor.hex}; padding: 8px; font-weight: bold; border-radius: 5px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;`;
                    divider.setAttribute('draggable', 'true');
                    divider.setAttribute('data-team-id', tid);
                    divider.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('sourceTeamId', tid);
                        e.currentTarget.style.opacity = '0.5';
                    });
                    divider.addEventListener('dragend', (e) => {
                        e.currentTarget.style.opacity = '1';
                        document.querySelectorAll('[data-team-id]').forEach(el => el.style.border = '');
                    });
                    divider.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="cursor: pointer; text-decoration: underline dashed; text-underline-offset: 3px;"
                          onclick="renameTeam(${tid})" title="Click to rename">
                        ${customName} <span style="font-weight: 400; font-size: 0.85rem; opacity: 0.7;">(0)</span>
                    </span>
                </div>
                <div class="roster-controls">
                    ${teamBadgeButtons}
                    ${teamBadgePopup ? `<button class="btn-mini btn-badge-open" onclick="toggleBadgePopup(event, ${tid}, 'team')" title="Award a team badge">★</button><div class="badge-popup" id="${_badgePopupElementId(tid, 'team')}">${teamBadgePopup}</div>` : ''}
                    ${teamBadgeInlinePositive}
                    <button class="btn-mini btn-plus" onclick="modTeam(${tid}, 'p', 1)" title="Team plus">T+</button>
                    <button class="btn-mini btn-minus" onclick="modTeam(${tid}, 'm', 1)" title="Team minus">T-</button>
                    ${teamBadgeInlineNegative}
                </div>
            `;
                    divider.addEventListener('dragover', dragOver);
                    divider.addEventListener('dragleave', dragLeave);
                    divider.addEventListener('drop', dropOnTeam);
                    listEl.appendChild(divider);

                    const dropzone = document.createElement('li');
                    dropzone.className = 'empty-team-dropzone';
                    dropzone.setAttribute('data-team-id', tid);
                    dropzone.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;font-style:italic;"><img src="../assets/icons/arrow-down.svg" class="btn-icon" style="width:14px;height:14px;opacity:0.6;" alt="" /> ${window.i18n ? i18n.t('team_empty_drop_hint') : 'Drop students here to assign to team'}</span>`;
                    dropzone.addEventListener('dragover', dragOver);
                    dropzone.addEventListener('dragleave', dragLeave);
                    dropzone.addEventListener('drop', dropOnTeam);
                    listEl.appendChild(dropzone);
                }
            }

            updatePresentCount();
            updateRosterSettingsPopupContext();
            applyNameSize();
            if (PRESENTATION_MODE) _presAdjustRosterColumns();
        }

        function updatePresentCount() {
            const countEl = document.getElementById('students-present-count');
            if (!countEl) return;
            if (!selectedGroupName || !studentGroups[selectedGroupName]) {
                countEl.textContent = '';
                return;
            }
            const allStudents = studentGroups[selectedGroupName];
            const halfNames = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || [])
                : null;
            const students = halfNames ? allStudents.filter(s => halfNames.includes(s.name)) : allStudents;
            const total = students.length;
            const present = students.filter(s => !s.isAbsent).length;
            countEl.textContent = total > 0 ? `(${present}/${total})` : '';
        }

        function openRosterContextMenu(event, studentId) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            let menu = document.getElementById('roster-context-menu');
            if (!menu) return;

            // Ensure menu is attached to body so position: fixed uses TRUE viewport screen coordinates
            if (menu.parentNode !== document.body) {
                document.body.appendChild(menu);
            }

            rosterContextStudentId = studentId;

            const student = selectedGroupName && studentGroups[selectedGroupName] ? studentGroups[selectedGroupName].find(s => s.id === studentId) : null;
            const absentBtn = menu.querySelector('[data-action="absent"]');
            if (absentBtn) absentBtn.textContent = student && student.isAbsent ? 'Present' : 'Absent';

            const examBtn = menu.querySelector('[data-action="exam-session"]');
            if (examBtn) {
                const isExam = isExamSessionActive(selectedGroupName);
                const textSpan = examBtn.querySelector('#ctx-exam-session-text') || examBtn;
                textSpan.textContent = isExam
                    ? (window.i18n ? i18n.t('ctx_exit_exam_session') : 'Exit Exam Session')
                    : (window.i18n ? i18n.t('ctx_exam_session') : 'Exam Session');
            }

            // Collapse flags and team details on fresh open
            const flagsDetails = document.getElementById('ctx-flags-details');
            if (flagsDetails && event !== null) {
                flagsDetails.removeAttribute('open');
            }
            const teamDetails = document.getElementById('ctx-team-assign-details');
            if (teamDetails && event !== null) {
                teamDetails.removeAttribute('open');
            }

            // Populate team assignment details if teams are active
            const teamPalette = document.getElementById('ctx-team-palette');
            const teamSummary = document.getElementById('ctx-team-summary-label');
            if (currentTeamsActive && currentRequestedTeamCount > 0) {
                if (teamDetails) teamDetails.style.display = 'block';
                if (teamSummary) {
                    teamSummary.textContent = student && student.teamId ? ` (Team ${student.teamId})` : ' (None)';
                }
                if (teamPalette) {
                    let paletteHtml = '';
                    if (student && student.teamId) {
                        paletteHtml += `<button type="button" onclick="assignStudentToTeam(${student.id}, null)" style="padding:5px 8px; border-radius:4px; background:#f0f0f0; color:#b33; border:1px solid #ccc; cursor:pointer; font-size:0.75rem; text-align:left; font-weight:700; display:flex; align-items:center; gap:6px;"><span>✕</span> <span>${window.i18n ? i18n.t('ctx_remove_from_team') : 'Remove from team'}</span></button>`;
                    }
                    for (let tid = 1; tid <= currentRequestedTeamCount; tid++) {
                        const color = teamColors[(tid - 1) % teamColors.length];
                        const teamName = (color && color.customName) ? color.customName : `Team ${tid} (${color ? color.name : ''})`;
                        const isCurrent = student && student.teamId === tid;
                        paletteHtml += `
                            <button type="button" onclick="assignStudentToTeam(${student.id}, ${tid})" style="padding:5px 8px; border-radius:4px; background:${isCurrent ? '#333' : '#fff'}; color:${isCurrent ? '#fff' : '#222'}; border:1.5px solid ${color ? color.hex : '#333'}; cursor:pointer; font-size:0.76rem; text-align:left; font-weight:700; display:flex; align-items:center; gap:7px;">
                                <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${color ? color.hex : '#888'}; border:1px solid #333;"></span>
                                <span style="flex:1;">${teamName}</span>
                                ${isCurrent ? '<span>✓</span>' : ''}
                            </button>`;
                    }
                    teamPalette.innerHTML = paletteHtml;
                }
            } else {
                if (teamDetails) teamDetails.style.display = 'none';
            }

            // Populate multi-color flag palette
            const paletteEl = document.getElementById('ctx-flag-palette');
            const summaryCountEl = document.getElementById('ctx-flags-summary-count');
            if (student) {
                const manualFlags = Array.isArray(student.manualFlags) ? student.manualFlags : (student.isFlagged ? ['red'] : []);
                if (summaryCountEl) {
                    summaryCountEl.textContent = manualFlags.length > 0 ? ` (${manualFlags.length})` : '';
                }

                if (paletteEl) {
                    let html = FLAG_PRESETS.map(p => {
                        const isActive = manualFlags.includes(p.key);
                        return `<button type="button" onclick="toggleStudentManualFlag(${student.id}, '${p.key}')" title="Toggle ${p.name}" style="padding:4px 8px; border-radius:4px; background:${isActive ? p.hex : '#f5f5f5'}; color:${isActive ? '#fff' : '#333'}; border:1.5px solid ${p.hex}; cursor:pointer; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px; font-weight:700; transition:all 0.1s;">
                            ${getFlagIconSvg(isActive ? '#fff' : p.hex, 12)}
                            <span>${p.name.replace(' Flag', '')}</span>
                        </button>`;
                    }).join('');

                    // Custom color picker button
                    html += `<label title="Add Custom Color Flag" style="padding:4px 8px; border-radius:4px; background:#fff; color:#555; border:1.5px dashed #ccc; cursor:pointer; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px; font-weight:700; position:relative; overflow:hidden;">
                        <input type="color" onchange="toggleStudentManualFlag(${student.id}, this.value)" style="position:absolute; opacity:0; width:100%; height:100%; cursor:pointer;">
                        <span>🎨 Custom...</span>
                    </label>`;

                    paletteEl.innerHTML = html;
                }
            }

            const studentEl = (event && event.target && event.target.closest && event.target.closest('[data-student-id]')) || document.querySelector(`[data-student-id="${studentId}"]`);

            const pad = 6;
            let clickX, clickY;

            if (event && Number.isFinite(event.clientX) && (event.clientX > 0 || event.clientY > 0)) {
                clickX = event.clientX;
                clickY = event.clientY;
            } else if (studentEl) {
                const rect = studentEl.getBoundingClientRect();
                clickX = rect.left + 20;
                clickY = rect.top + rect.height / 2;
            } else {
                clickX = window.innerWidth / 2;
                clickY = window.innerHeight / 2;
            }

            // Position menu synchronously right under the click
            menu.style.visibility = 'hidden';
            menu.classList.add('open');

            const menuWidth = menu.offsetWidth || 180;
            const menuHeight = menu.offsetHeight || 200;

            let finalLeft = Math.min(clickX, window.innerWidth - menuWidth - pad);
            let finalTop = Math.min(clickY, window.innerHeight - menuHeight - pad);

            finalLeft = Math.max(pad, finalLeft);
            finalTop = Math.max(pad, finalTop);

            menu.style.left = finalLeft + 'px';
            menu.style.top = finalTop + 'px';
            menu.style.visibility = 'visible';
        }

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
        function _warmUpAudio() {
            [audioContext, ...(typeof audioCtx !== 'undefined' ? [audioCtx] : [])].forEach(ctx => {
                if (ctx && ctx.state === 'suspended') ctx.resume();
            });
            // Play a completely silent buffer to fully initialise the audio graph
            const buf = audioContext.createBuffer(1, 1, audioContext.sampleRate);
            const src = audioContext.createBufferSource();
            src.buffer = buf;
            src.connect(audioContext.destination);
            src.start(0);
            ['pointerdown', 'pointermove', 'keydown'].forEach(e => document.removeEventListener(e, _warmUpAudio));
        }
        ['pointerdown', 'pointermove', 'keydown'].forEach(e => document.addEventListener(e, _warmUpAudio, { once: false }));

        // Score sound toggle — muted by default
        let scoreMuted = true;
        // Per-slot volume scale (0–1); set by playConfiguredSound before calling any builtin
        let _soundVolumeScale = 1.0;

        function playTone(freq, opts = {}) {
            if (!freq) return;
            if (audioContext.state === 'suspended') audioContext.resume();

            const startTime = Number.isFinite(opts.startTime) ? opts.startTime : audioContext.currentTime;
            const duration = Math.max(0.04, Number(opts.duration) || 0.18);
            const volume = Math.max(0.0001, Number(opts.volume) || 0.08);
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();

            osc.type = opts.type || 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            if (Number.isFinite(opts.endFreq) && opts.endFreq > 0) {
                osc.frequency.exponentialRampToValueAtTime(opts.endFreq, startTime + duration);
            }

            filter.type = opts.filterType || 'lowpass';
            filter.frequency.setValueAtTime(Number(opts.filterFrequency) || 6000, startTime);

            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.03, duration / 3));
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioContext.destination);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);
        }

        function playToneSequence(frequencies, opts = {}) {
            const notes = Array.isArray(frequencies) ? frequencies : [];
            const gap = Number(opts.gap) || 0.04;
            const noteDuration = Number(opts.noteDuration) || 0.16;
            const baseTime = Number.isFinite(opts.startTime) ? opts.startTime : audioContext.currentTime;

            notes.forEach((freq, index) => {
                if (!freq) return;
                playTone(freq, {
                    ...opts,
                    startTime: baseTime + index * (noteDuration + gap),
                    duration: noteDuration
                });
            });
        }

        function playScoreJingleBuiltin() {
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = audioContext.currentTime;
            const master = audioContext.createGain();
            master.gain.setValueAtTime(0.07 * _soundVolumeScale, now);
            master.connect(audioContext.destination);
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const g = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                g.gain.setValueAtTime(0.0, now + i * 0.1);
                g.gain.linearRampToValueAtTime(1.0, now + i * 0.1 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.18);
                osc.connect(g);
                g.connect(master);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.2);
            });
        }

        function playScoreBuzzerBuiltin() {
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = audioContext.currentTime;
            const master = audioContext.createGain();
            master.gain.setValueAtTime(0.06 * _soundVolumeScale, now);
            master.connect(audioContext.destination);
            [196, 164.81].forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const g = audioContext.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + i * 0.13);
                g.gain.setValueAtTime(0.0, now + i * 0.13);
                g.gain.linearRampToValueAtTime(1.0, now + i * 0.13 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.22);
                const lpf = audioContext.createBiquadFilter();
                lpf.type = 'lowpass';
                lpf.frequency.setValueAtTime(600, now + i * 0.13);
                osc.connect(lpf);
                lpf.connect(g);
                g.connect(master);
                osc.start(now + i * 0.13);
                osc.stop(now + i * 0.13 + 0.25);
            });
        }

        function playTimerBeepBuiltin(duration = 0.24) {
            playToneSequence([220, 330], {
                type: 'sine',
                noteDuration: duration,
                gap: 0,
                volume: 0.11 * _soundVolumeScale
            });
        }

        function playBellBuiltin() {
            playToneSequence([659.25, 987.77], {
                type: 'triangle',
                noteDuration: 0.2,
                gap: 0.03,
                volume: 0.08 * _soundVolumeScale,
                filterFrequency: 5200
            });
        }

        function playChimeBuiltin() {
            playToneSequence([523.25, 659.25, 783.99, 1046.5], {
                type: 'triangle',
                noteDuration: 0.12,
                gap: 0.04,
                volume: 0.08 * _soundVolumeScale,
                filterFrequency: 5200
            });
        }

        function playPopBuiltin() {
            playTone(880, { type: 'square', duration: 0.06, endFreq: 1320, volume: 0.035 * _soundVolumeScale, filterFrequency: 2600 });
            playTone(1174.66, { type: 'triangle', duration: 0.09, volume: 0.03 * _soundVolumeScale, startTime: audioContext.currentTime + 0.04 });
        }

        function playThunkBuiltin() {
            playToneSequence([170, 120], {
                type: 'sawtooth',
                noteDuration: 0.16,
                gap: 0.03,
                volume: 0.05 * _soundVolumeScale,
                filterFrequency: 800
            });
        }

        function playTimerGavelSequenceBuiltin() {
            const scale = _soundVolumeScale;
            const spacing = 380;
            for (let i = 0; i < 3; i++) {
                setTimeout(() => gavelHit(0.2, scale), i * spacing);
            }
        }

        function playDrumrollBuiltin() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const scale = _soundVolumeScale;

            const now = audioCtx.currentTime;
            const totalHits = 30;
            const spacing = 0.07;

            for (let i = 0; i < totalHits; i++) {
                const volume = (0.15 + (i / totalHits) * 0.75) * scale;
                const jitter = Math.random() * 0.025;
                playHybridHit(now + (i * spacing) + jitter, volume);
            }
        }

        function playTimerBeepsBuiltin(count, frequency) {
            const scale = _soundVolumeScale;
            let beepCount = 0;
            const beepInterval = setInterval(() => {
                if (beepCount < count) {
                    _soundVolumeScale = scale;
                    playTimerBeepBuiltin();
                    beepCount++;
                } else {
                    clearInterval(beepInterval);
                }
            }, frequency);
        }

        async function getSoundFileUrl(relativePath) {
            const normalized = resolveSoundFileMatch(relativePath);
            if (!normalized) return '';
            if (/^(https?:|file:|data:|blob:)/i.test(normalized)) return normalized;

            const isElectron = !!(window.Desktop && Desktop.isElectron && Desktop.isElectron());
            if (isElectron && typeof window.Desktop.resolvePath === 'function') {
                try {
                    const resolved = await window.Desktop.resolvePath('data', normalized);
                    if (typeof resolved === 'string' && resolved) {
                        return resolved;
                    }
                    if (resolved?.path) {
                        const p = String(resolved.path).replace(/\\/g, '/');
                        return p.startsWith('/') ? ('file://' + encodeURI(p)) : ('file:///' + encodeURI(p));
                    }
                } catch (error) {
                    console.warn('Unable to resolve sound path:', error);
                }
            }

            return `../user/custom-data/sounds/${normalized.replace(/^sounds\//, '')}`;
        }

        function playSoundFileClip(relativePath, repeatCount = 1, spacingMs = 150, volumeScale = 1.0, onComplete = null) {
            const normalized = resolveSoundFileMatch(relativePath);
            if (!normalized) {
                if (typeof onComplete === 'function') onComplete();
                return false;
            }
            const vol = Math.min(1, Math.max(0, Number(volumeScale) || 1));
            const repeats = Math.max(1, Number(repeatCount) || 1);
            const gap = Math.max(0, Number(spacingMs) || 0);

            let cancelled = false;
            let activeAudio = null;
            let activeTimer = null;

            const stop = () => {
                cancelled = true;
                if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
                if (activeAudio) {
                    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch (e) {}
                    activeAudio = null;
                }
            };

            getSoundFileUrl(normalized).then(url => {
                if (cancelled) return;
                let iteration = 0;

                function step() {
                    if (cancelled || iteration >= repeats) {
                        activeAudio = null;
                        if (typeof onComplete === 'function') onComplete();
                        return;
                    }
                    iteration++;
                    const audio = new Audio(url);
                    audio.volume = vol;
                    activeAudio = audio;

                    let done = false;
                    const finish = () => {
                        if (done) return;
                        done = true;
                        audio.removeEventListener('ended', finish);
                        audio.removeEventListener('error', finish);
                        activeAudio = null;
                        if (cancelled) return;

                        if (gap > 0 && iteration < repeats) {
                            activeTimer = setTimeout(step, gap);
                        } else {
                            step();
                        }
                    };

                    audio.addEventListener('ended', finish);
                    audio.addEventListener('error', finish);
                    audio.play().catch(err => {
                        console.warn('Unable to play sound file clip:', err);
                        finish();
                    });
                }

                step();
            }).catch(err => {
                console.warn('Unable to prepare sound file URL:', err);
                if (typeof onComplete === 'function') onComplete();
            });

            return { stop };
        }

        function getCustomJsDuration(jsCode, volumeScale = 1.0) {
            let maxTime = 0.4;
            const mockPlayTone = (freq, opts = {}) => {
                const start = Number.isFinite(opts.startTime) ? Number(opts.startTime) : 0;
                const dur = Math.max(0.04, Number(opts.duration) || 0.18);
                if (start + dur > maxTime) maxTime = start + dur;
            };
            const mockPlayToneSequence = (freqs, opts = {}) => {
                const notes = Array.isArray(freqs) ? freqs : [];
                const gap = Number(opts.gap) || 0.04;
                const noteDuration = Number(opts.noteDuration) || 0.16;
                const start = Number.isFinite(opts.startTime) ? Number(opts.startTime) : 0;
                const total = start + notes.length * (noteDuration + gap);
                if (total > maxTime) maxTime = total;
            };
            const mockGavelHit = () => {
                if (0.3 > maxTime) maxTime = 0.3;
            };

            try {
                const runner = new Function('audioContext', 'now', 'playTone', 'playToneSequence', 'gavelHit', 'slotKey', 'repeatIndex', 'repeatCount', 'volumeScale', jsCode);
                runner({ currentTime: 0, state: 'running' }, 0, mockPlayTone, mockPlayToneSequence, mockGavelHit, 'test', 0, 1, volumeScale);
            } catch (e) { }

            return Math.max(0.2, maxTime);
        }

        function playCustomSoundCode(jsCode, slotKey, repeatIndex = 0, repeatCount = 1, volumeScale = 1.0, customNow = null) {
            const code = String(jsCode || '').trim();
            if (!code) return false;
            const vol = Math.min(1, Math.max(0, Number(volumeScale) || 1));

            try {
                if (audioContext.state === 'suspended') audioContext.resume();
                const baseNow = customNow !== null && Number.isFinite(customNow) ? customNow : audioContext.currentTime;
                const runner = new Function('audioContext', 'now', 'playTone', 'playToneSequence', 'gavelHit', 'slotKey', 'repeatIndex', 'repeatCount', 'volumeScale', code);
                runner(audioContext, baseNow, playTone, playToneSequence, gavelHit, slotKey, repeatIndex, repeatCount, vol);
                return true;
            } catch (error) {
                console.warn('Custom sound JS failed:', error);
                return false;
            }
        }

        function playCustomSoundCodeRepeated(jsCode, slotKey, repeatCount = 1, spacingMs = 150, volumeScale = 1.0, onComplete = null) {
            const repeats = Math.max(1, Number(repeatCount) || 1);
            const gapSec = Math.max(0, Number(spacingMs) || 0) / 1000;
            const singleDurationSec = getCustomJsDuration(jsCode, volumeScale);
            const stepSec = singleDurationSec + gapSec;

            if (audioContext.state === 'suspended') audioContext.resume();
            const startTime = audioContext.currentTime;

            let ok = false;
            for (let i = 0; i < repeats; i++) {
                const iterNow = startTime + i * stepSec;
                const res = playCustomSoundCode(jsCode, slotKey, i, repeats, volumeScale, iterNow);
                if (res) ok = true;
            }

            if (typeof onComplete === 'function') {
                const totalMs = (repeats * stepSec) * 1000;
                setTimeout(onComplete, Math.max(10, totalMs));
            }

            return ok;
        }

        function getBuiltinPresetDurationSec(slotKey, preset) {
            if (slotKey === 'timerEnd') {
                if (preset === 'gavel') return 0.38;
                if (preset === 'chime') return 0.64;
                if (preset === 'bell') return 0.46;
                return 0.48;
            }
            if (slotKey === 'drumroll') return 2.1;
            if (slotKey === 'gavelAlarm') {
                if (preset === 'bell') return 0.46;
                if (preset === 'beep') return 0.48;
                return 0.3;
            }
            if (slotKey === 'scorePositive') {
                if (preset === 'bell') return 0.46;
                if (preset === 'pop') return 0.15;
                return 0.4;
            }
            if (slotKey === 'scoreNegative') {
                if (preset === 'thunk') return 0.38;
                if (preset === 'tap') return 0.2;
                return 0.38;
            }
            return 0.4;
        }

        function playBuiltinSoundSingleIteration(slotKey, preset, customNow = null) {
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = customNow !== null && Number.isFinite(customNow) ? customNow : audioContext.currentTime;

            if (slotKey === 'timerEnd') {
                if (preset === 'gavel') {
                    gavelHit(0.2, _soundVolumeScale, now);
                    return true;
                }
                if (preset === 'chime') {
                    playToneSequence([523.25, 659.25, 783.99, 1046.5], {
                        type: 'triangle', noteDuration: 0.12, gap: 0.04, volume: 0.08 * _soundVolumeScale, filterFrequency: 5200, startTime: now
                    });
                    return true;
                }
                if (preset === 'bell') {
                    playToneSequence([659.25, 987.77], {
                        type: 'triangle', noteDuration: 0.2, gap: 0.03, volume: 0.08 * _soundVolumeScale, filterFrequency: 5200, startTime: now
                    });
                    return true;
                }
                playToneSequence([220, 330], {
                    type: 'sine', noteDuration: 0.24, gap: 0, volume: 0.11 * _soundVolumeScale, startTime: now
                });
                return true;
            }

            if (slotKey === 'drumroll') {
                playDrumrollBuiltin();
                return true;
            }

            if (slotKey === 'gavelAlarm') {
                if (preset === 'bell') {
                    playToneSequence([659.25, 987.77], {
                        type: 'triangle', noteDuration: 0.2, gap: 0.03, volume: 0.08 * _soundVolumeScale, filterFrequency: 5200, startTime: now
                    });
                    return true;
                }
                if (preset === 'beep') {
                    playToneSequence([220, 330], {
                        type: 'sine', noteDuration: 0.24, gap: 0, volume: 0.11 * _soundVolumeScale, startTime: now
                    });
                    return true;
                }
                gavelHit(0.12, _soundVolumeScale, now);
                return true;
            }

            if (slotKey === 'scorePositive') {
                if (preset === 'bell') {
                    playToneSequence([659.25, 987.77], {
                        type: 'triangle', noteDuration: 0.2, gap: 0.03, volume: 0.08 * _soundVolumeScale, filterFrequency: 5200, startTime: now
                    });
                    return true;
                }
                if (preset === 'pop') {
                    playPopBuiltin();
                    return true;
                }
                playScoreJingleBuiltin();
                return true;
            }

            if (slotKey === 'scoreNegative') {
                if (preset === 'thunk') {
                    playThunkBuiltin();
                    return true;
                }
                if (preset === 'tap') {
                    gavelHit(0.12, _soundVolumeScale, now);
                    return true;
                }
                playScoreBuzzerBuiltin();
                return true;
            }

            return false;
        }

        function playBuiltinSound(slotKey, preset, options = {}) {
            const repeatCount = Math.max(1, Number(options.repeatCount) || 1);
            const spacingMs = Math.max(0, Number(options.spacingMs) || 150);
            const gapSec = spacingMs / 1000;
            const singleDurSec = getBuiltinPresetDurationSec(slotKey, preset);
            const stepSec = singleDurSec + gapSec;

            if (audioContext.state === 'suspended') audioContext.resume();
            const baseNow = audioContext.currentTime;

            let ok = false;
            for (let i = 0; i < repeatCount; i++) {
                const iterNow = baseNow + i * stepSec;
                const res = playBuiltinSoundSingleIteration(slotKey, preset, iterNow);
                if (res) ok = true;
            }

            if (typeof options.onComplete === 'function') {
                const totalMs = (repeatCount * stepSec) * 1000;
                setTimeout(options.onComplete, Math.max(10, totalMs));
            }

            return ok;
        }

        function interruptAmbientNoiseForAlarm() {
            if (typeof stopWhiteNoise === 'function') {
                stopWhiteNoise();
            }
        }

        function playTimerBeep(count = 1, frequency = 600) {
            return playBeeps(count, frequency);
        }

        function playConfiguredSound(slotKey, options = {}) {
            soundSettings = normalizeSoundSettings(soundSettings);
            const cfg = soundSettings[slotKey] || DEFAULT_SOUND_SETTINGS[slotKey];
            const repeatCount = Math.max(1, Number(options.repeatCount !== undefined ? options.repeatCount : cfg.iterations) || 1);
            const spacingMs = Math.max(0, Number(options.spacingMs !== undefined ? options.spacingMs : 150));
            const volumeScale = Math.min(1, Math.max(0, (typeof cfg.volume === 'number' ? cfg.volume : 100) / 100));

            if (slotKey === 'timerEnd' || slotKey === 'gavelAlarm') {
                interruptAmbientNoiseForAlarm();
            }

            if (cfg.mode === 'file' && cfg.file) {
                return playSoundFileClip(cfg.file, repeatCount, spacingMs, volumeScale, options.onComplete);
            }

            if (cfg.mode === 'js' && cfg.js) {
                return playCustomSoundCodeRepeated(cfg.js, slotKey, repeatCount, spacingMs, volumeScale, options.onComplete);
            }

            _soundVolumeScale = volumeScale;
            return playBuiltinSound(slotKey, cfg.preset, { repeatCount, spacingMs, onComplete: options.onComplete });
        }

        function playScoreJingle() {
            if (scoreMuted) return;
            playConfiguredSound('scorePositive', { spacingMs: 150 });
        }

        function playScoreBuzzer() {
            if (scoreMuted) return;
            playConfiguredSound('scoreNegative', { spacingMs: 150 });
        }

        function syncRosterInlineToggleButtonStates() {
            const scoreBtn = document.getElementById('rsp-score-mute-btn');
            if (scoreBtn) {
                scoreBtn.classList.toggle('is-off', !!scoreMuted);
                scoreBtn.title = scoreMuted ? 'Score sounds muted' : 'Score sounds on';
            }

            const senBtn = document.getElementById('rsp-toggle-sen-btn');
            if (senBtn) {
                senBtn.classList.toggle('is-off', !senVisible);
                senBtn.title = senVisible ? 'SEN indicator visible' : 'SEN indicator hidden';
            }

            const rolesBtn = document.getElementById('rsp-toggle-roles-btn');
            if (rolesBtn) {
                rolesBtn.classList.toggle('is-off', !rolesVisible);
                rolesBtn.title = rolesVisible ? 'Roles visible' : 'Roles hidden';
            }

            const badgesBtn = document.getElementById('rsp-toggle-badges-btn');
            if (badgesBtn) {
                badgesBtn.classList.toggle('is-off', !badgesVisible);
                badgesBtn.title = badgesVisible ? 'Badges visible' : 'Badges hidden';
            }

            const autoflagBtn = document.getElementById('rsp-toggle-autoflag-btn');
            if (autoflagBtn) {
                autoflagBtn.classList.toggle('is-off', !autoFlagVisible);
                autoflagBtn.title = autoFlagVisible ? 'Autoflag visible (Ctrl+F)' : 'Autoflag hidden (Ctrl+F)';
            }

            const animationsBtn = document.getElementById('rsp-toggle-animations-btn');
            if (animationsBtn) {
                animationsBtn.classList.toggle('is-off', !animationsEnabled);
                animationsBtn.title = animationsEnabled ? 'Animations on' : 'Animations off';
            }

            const planViewBtn = document.getElementById('roster-plan-view-btn');
            if (planViewBtn) {
                planViewBtn.classList.toggle('active', !!rosterPlanView);
                planViewBtn.classList.toggle('is-off', !rosterPlanView);
                planViewBtn.title = rosterPlanView ? 'Seating plan view on' : 'Seating plan view off';
            }

            ['plan', 'anim', 'autoflag', 'badges', 'roles', 'modes', 'sen', 'lessonPlan'].forEach(key => {
                const btn = document.getElementById('rsp-pres-' + key + '-btn');
                if (btn) btn.classList.toggle('is-off', !presSettings[key]);
            });
            const rspSortFirst = document.getElementById('rsp-sort-first-btn');
            const rspSortLast = document.getElementById('rsp-sort-last-btn');
            if (rspSortFirst) {
                rspSortFirst.classList.toggle('active', rosterSortOrder === 'first');
                rspSortFirst.classList.toggle('is-off', rosterSortOrder !== 'first');
            }
            if (rspSortLast) {
                rspSortLast.classList.toggle('active', rosterSortOrder === 'last');
                rspSortLast.classList.toggle('is-off', rosterSortOrder !== 'last');
            }
            const bInd = document.getElementById('rsp-board-size-indicator');
            if (bInd) bInd.textContent = studentNameSizeRem.toFixed(2) + 'rem';
            const pInd = document.getElementById('rsp-pres-size-indicator');
            if (pInd) pInd.textContent = presNameSizeRem.toFixed(2) + 'rem';
            syncUcmSfxMuteButton();
        }

        function syncUcmSfxMuteButton() {
            const ucmBtn = document.getElementById('ucm-sfx-mute-btn');
            if (ucmBtn) {
                ucmBtn.classList.toggle('is-muted', !!scoreMuted);
                const lbl = (typeof t === 'function' && t('ucm_sfx_label')) ? t('ucm_sfx_label') : 'Score SFX';
                ucmBtn.innerHTML = scoreMuted
                    ? '<img src="../assets/icons/mute.svg" class="btn-icon" alt="" /> <span data-i18n="ucm_sfx_label">' + lbl + '</span>'
                    : '<img src="../assets/icons/bell.svg" class="btn-icon" alt="" /> <span data-i18n="ucm_sfx_label">' + lbl + '</span>';
                ucmBtn.title = scoreMuted ? 'Score sounds muted (click to unmute)' : 'Score sounds on (click to mute)';
            }
        }

        function toggleScoreMute() {
            scoreMuted = !scoreMuted;
            const btn = document.getElementById('score-mute-btn');
            if (btn) {
                btn.innerHTML = scoreMuted ? '<img src="../assets/icons/mute.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/volume.svg" class="btn-icon" alt="" />';
                btn.title = scoreMuted ? 'Score sounds muted (click to unmute)' : 'Score sounds on (click to mute)';
                btn.style.color = scoreMuted ? '#bbb' : '#111';
            }
            const rspBtn = document.getElementById('rsp-score-mute-btn');
            if (rspBtn) {
                rspBtn.innerHTML = scoreMuted ? '<img src="../assets/icons/mute.svg" class="btn-icon" alt="" /> Sounds' : '<img src="../assets/icons/volume.svg" class="btn-icon" alt="" /> Sounds';
                rspBtn.style.color = scoreMuted ? '' : '#2d6a4f';
            }
            syncRosterInlineToggleButtonStates();
            persistSettingsToUserFile().catch(err => console.warn('toggleScoreMute: could not save config:', err));
        }

        function toggleSenVisibility() {
            senVisible = !senVisible;
            syncRosterInlineToggleButtonStates();
            renderRoster();
            persistSettingsToUserFile().catch(err => console.warn('toggleSenVisibility: could not save config:', err));
        }

        function toggleRolesVisibility() {
            rolesVisible = !rolesVisible;
            syncRosterInlineToggleButtonStates();
            renderRoster();
            persistSettingsToUserFile().catch(err => console.warn('toggleRolesVisibility: could not save config:', err));
        }

        function toggleBadgesVisibility() {
            badgesVisible = !badgesVisible;
            syncRosterInlineToggleButtonStates();
            renderRoster();
            persistSettingsToUserFile().catch(err => console.warn('toggleBadgesVisibility: could not save config:', err));
        }

        function toggleAutoFlagVisibility() {
            autoFlagVisible = !autoFlagVisible;
            syncRosterInlineToggleButtonStates();
            renderRoster();
            persistSettingsToUserFile().catch(err => console.warn('toggleAutoFlagVisibility: could not save config:', err));
        }

        function toggleAnimations() {
            animationsEnabled = !animationsEnabled;
            syncRosterInlineToggleButtonStates();
            persistSettingsToUserFile().catch(err => console.warn('toggleAnimations: could not save config:', err));
        }

        function togglePresSetting(key) {
            if (key in presSettings) {
                presSettings[key] = !presSettings[key];
                syncRosterInlineToggleButtonStates();
                if (!PRESENTATION_MODE) _broadcastPresentationState();
                persistSettingsToUserFile().catch(err => console.warn('togglePresSetting: could not save config:', err));
            }
        }

        // ---- Timer Popup ----

        // ============================================================
        // WHITE NOISE ENGINE
        // ============================================================

        // ============================================================
        // NOISE ENGINE  (white + brown, shared gain/mute/volume)
        // ============================================================

        let _noiseNodes = { white: null, pink: null, brown: null }; // BufferSourceNode per generated noise type
        let _noiseGains = { white: null, pink: null, brown: null }; // GainNode per generated noise type
        let _noiseFileAudio = null;
        let _noiseFileAudioPool = [];
        let _noiseFileUrl = '';
        let _activeNoiseFile = null;
        let _noiseFileMonitor = null;
        let _noiseFileCrossfading = false;
        const NOISE_FILE_CROSSFADE_MS = 1200;
        let _noiseType = 'white';   // active ambient source
        let whiteNoisePlaying = false;
        let whiteNoiseMuted = true;
        let whiteNoiseVolume = 0.10;  // 0–1, default 10 %

        function _getNoiseFileTargetVolume() {
            return (!whiteNoiseMuted && whiteNoisePlaying && _noiseType === 'file') ? whiteNoiseVolume : 0;
        }

        function _stopNoiseFileMonitor() {
            if (_noiseFileMonitor) {
                clearInterval(_noiseFileMonitor);
                _noiseFileMonitor = null;
            }
        }

        function _resetNoiseFilePlayers(resetUrl = false) {
            _stopNoiseFileMonitor();
            _noiseFileCrossfading = false;
            _noiseFileAudioPool.forEach(audio => {
                if (!audio) return;
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 0;
                } catch { }
            });
            _noiseFileAudioPool = [];
            _noiseFileAudio = null;
            if (resetUrl) _noiseFileUrl = '';
        }

        function _startNoiseFileMonitor() {
            if (_noiseFileMonitor) return;
            _noiseFileMonitor = setInterval(() => {
                if (_noiseType !== 'file' || !whiteNoisePlaying || whiteNoiseMuted || _noiseFileCrossfading || !_noiseFileAudio) return;
                const active = _noiseFileAudio;
                if (!Number.isFinite(active.duration) || active.duration <= 0) return;
                const fadeWindow = Math.min(NOISE_FILE_CROSSFADE_MS / 1000, Math.max(0.35, active.duration / 4));
                const remaining = active.duration - active.currentTime;
                if (remaining <= fadeWindow) {
                    _crossfadeNoiseFileLoop().catch(error => console.warn('Unable to crossfade timer audio file:', error));
                }
            }, 150);
        }

        async function _crossfadeNoiseFileLoop() {
            if (_noiseType !== 'file' || _noiseFileCrossfading || !_noiseFileAudioPool.length) return false;

            const current = _noiseFileAudio;
            const next = _noiseFileAudioPool.find(audio => audio !== current) || null;
            if (!current || !next) return false;

            _noiseFileCrossfading = true;
            const fadeMs = Math.min(NOISE_FILE_CROSSFADE_MS, Math.max(320, (Number(current.duration) || 4) * 250));

            try {
                next.pause();
                next.currentTime = 0;
                next.volume = 0;
                await next.play();
            } catch (error) {
                _noiseFileCrossfading = false;
                throw error;
            }

            await new Promise(resolve => {
                const startTs = performance.now();
                const tick = (now) => {
                    const progress = Math.min(1, (now - startTs) / fadeMs);
                    const target = _getNoiseFileTargetVolume();
                    try {
                        current.volume = Math.max(0, target * (1 - progress));
                        next.volume = Math.max(0, target * progress);
                    } catch { }

                    if (progress < 1 && _noiseType === 'file' && whiteNoisePlaying) {
                        requestAnimationFrame(tick);
                        return;
                    }

                    try {
                        current.pause();
                        current.currentTime = 0;
                        current.volume = 0;
                    } catch { }
                    _noiseFileAudio = next;
                    _noiseFileCrossfading = false;
                    resolve();
                };
                requestAnimationFrame(tick);
            });

            return true;
        }

        async function _playNoiseFileAudio(specificFile = null) {
            if (specificFile) _activeNoiseFile = specificFile;
            const audio = await _ensureNoiseFileAudio(specificFile);
            if (!audio) return false;

            try {
                audio.volume = 0;
                await audio.play();
                _startNoiseFileMonitor();

                const fadeInMs = 260;
                const startTs = performance.now();
                const tick = (now) => {
                    const progress = Math.min(1, (now - startTs) / fadeInMs);
                    const currentTarget = _getNoiseFileTargetVolume();
                    try {
                        audio.volume = currentTarget * progress;
                    } catch { }
                    if (progress < 1 && _noiseType === 'file' && whiteNoisePlaying && !whiteNoiseMuted) {
                        requestAnimationFrame(tick);
                    }
                };
                requestAnimationFrame(tick);
                return true;
            } catch (error) {
                console.warn('Unable to play timer audio file:', error);
                return false;
            }
        }

        function _stopNoiseFileAudio() {
            _stopNoiseFileMonitor();
            _noiseFileCrossfading = false;
            _noiseFileAudioPool.forEach(audio => {
                if (!audio) return;
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 0;
                } catch { }
            });
        }

        async function _ensureNoiseFileAudio(specificFile = null) {
            soundSettings = normalizeSoundSettings(soundSettings);
            const cfg = soundSettings.timerBackground || DEFAULT_SOUND_SETTINGS.timerBackground;
            const chosen = specificFile || _activeNoiseFile || cfg?.file || '';
            const filePath = normalizeSoundFilePath(chosen);
            if (!filePath) return null;

            const url = await getSoundFileUrl(filePath);
            if (!url) return null;

            if (!_noiseFileAudioPool.length || _noiseFileUrl !== url) {
                _resetNoiseFilePlayers();
                const primary = new Audio(url);
                const secondary = new Audio(url);
                [primary, secondary].forEach(audio => {
                    audio.loop = false;
                    audio.preload = 'auto';
                    audio.volume = 0;
                });
                _noiseFileAudioPool = [primary, secondary];
                _noiseFileAudio = primary;
                _noiseFileUrl = url;
            }

            if (_noiseFileAudio) {
                _noiseFileAudio.volume = _getNoiseFileTargetVolume();
            }
            return _noiseFileAudio;
        }

        // Build and start a looping noise source for the given type (idempotent)
        function _ensureNoiseNodes(type) {
            if (_noiseGains[type]) return;
            if (audioContext.state === 'suspended') audioContext.resume();

            const sampleRate = audioContext.sampleRate;
            const bufLen = 4 * sampleRate; // 4 s of unique noise
            const buffer = audioContext.createBuffer(1, bufLen, sampleRate);
            const data = buffer.getChannelData(0);

            if (type === 'brown') {
                // Brown (red) noise: integrate white noise with a gentle high-shelf cut
                let lastOut = 0;
                for (let i = 0; i < bufLen; i++) {
                    const white = Math.random() * 2 - 1;
                    lastOut = (lastOut + 0.02 * white) / 1.02;
                    data[i] = lastOut;
                }
                // Normalise to ±1 range
                let peak = 0;
                for (let i = 0; i < bufLen; i++) if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
                if (peak > 0) for (let i = 0; i < bufLen; i++) data[i] /= peak;
            } else if (type === 'pink') {
                // Pink noise via Voss-McCartney algorithm (6-stage)
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
                // White noise
                for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
            }

            const src = audioContext.createBufferSource();
            src.buffer = buffer;
            src.loop = true;

            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // start silent; toggleWhiteNoise fades in

            if (type === 'white') {
                // Gentle low-pass to soften extreme highs
                const lpf = audioContext.createBiquadFilter();
                lpf.type = 'lowpass';
                lpf.frequency.value = 3500;
                src.connect(lpf);
                lpf.connect(gainNode);
            } else if (type === 'pink') {
                // Pink is already spectrally balanced; connect directly
                src.connect(gainNode);
            } else {
                // Brown is already bass-heavy; apply subtle shelving boost for warmth
                const shelf = audioContext.createBiquadFilter();
                shelf.type = 'lowshelf';
                shelf.frequency.value = 200;
                shelf.gain.value = 4; // +4 dB low boost
                src.connect(shelf);
                shelf.connect(gainNode);
            }

            gainNode.connect(audioContext.destination);
            src.start();

            _noiseNodes[type] = src;
            _noiseGains[type] = gainNode;
        }

        function _ensureWhiteNoiseNodes() { if (_noiseType !== 'file') _ensureNoiseNodes(_noiseType); } // legacy alias

        async function showMp3Picker(event) {
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
            const popup = document.getElementById('mp3-picker-popup');
            const list = document.getElementById('mp3-picker-list');
            if (!popup || !list) return;

            if (!availableSoundFiles || !availableSoundFiles.length) {
                await refreshSoundFileList(false);
            }

            const currentFile = resolveSoundFileMatch(_activeNoiseFile || soundSettings?.timerBackground?.file || '');

            if (!availableSoundFiles.length) {
                list.innerHTML = '<div class="mp3-picker-empty">No sound files found.<br>Add audio files to <strong>user/custom-data/sounds</strong> (subfolders supported) and refresh.</div>';
            } else {
                list.innerHTML = availableSoundFiles.map(file => {
                    const rel = file.replace(/^sounds\//, '');
                    const lastSlash = rel.lastIndexOf('/');
                    const folderPath = lastSlash !== -1 ? rel.slice(0, lastSlash) : '';
                    const fileName = lastSlash !== -1 ? rel.slice(lastSlash + 1) : rel;
                    const sel = (file === currentFile) ? ' selected' : '';
                    const folderBadge = folderPath ? `<span class="mp3-picker-folder-tag" style="display:inline-block; font-size:0.62rem; font-weight:700; opacity:0.6; margin-right:4px;">${escapeSettingsHtml(folderPath)}/</span>` : '';
                    return `<button class="mp3-picker-item${sel}" onclick="selectMp3File('${file.replace(/'/g, '\\\'')}')">${folderBadge}<span class="mp3-picker-name">${escapeSettingsHtml(fileName)}</span></button>`;
                }).join('');
            }

            // Position near the clicked button
            const btn = event ? (event.currentTarget || event.target) : null;
            if (btn && typeof btn.getBoundingClientRect === 'function') {
                const rect = btn.getBoundingClientRect();
                const popupWidth = 240;
                const popupEstimatedHeight = 200;
                let left = Math.max(10, Math.min(rect.left, window.innerWidth - popupWidth - 10));
                let top = rect.bottom + 4;
                if (top + popupEstimatedHeight > window.innerHeight) {
                    top = Math.max(10, rect.top - popupEstimatedHeight - 4);
                }
                popup.style.left = left + 'px';
                popup.style.top = top + 'px';
            }
            popup.classList.add('open');

            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', _closeMp3PickerOutside, { once: true, capture: true });
            }, 0);
        }

        function _closeMp3PickerOutside(e) {
            const popup = document.getElementById('mp3-picker-popup');
            if (!popup) return;

            const triggerBtns = ['mode-noise-btn-file', 'timer-noise-btn-file', 'datetime-noise-btn-file', 'wn-type-file'];
            const isTrigger = triggerBtns.some(id => {
                const btn = document.getElementById(id);
                return btn && (btn === e.target || btn.contains(e.target));
            });
            if (isTrigger) return;

            if (!popup.contains(e.target)) {
                popup.classList.remove('open');
            } else if (popup.classList.contains('open')) {
                // clicked inside; re-attach listener if still open after a tick
                setTimeout(() => {
                    if (popup.classList.contains('open')) {
                        document.addEventListener('click', _closeMp3PickerOutside, { once: true, capture: true });
                    }
                }, 0);
            }
        }

        function closeMp3Picker() {
            document.getElementById('mp3-picker-popup')?.classList.remove('open');
        }

        async function selectMp3File(file) {
            closeMp3Picker();
            _activeNoiseFile = file;
            _resetNoiseFilePlayers(true);
            // Mode sound must NOT get persisted when changing sound in-session!
            // Only Edit Mode settings or manage-database modebanks are sources of truth.
            if (!activeWorkingModeId) {
                soundSettings = normalizeSoundSettings(soundSettings);
                soundSettings.timerBackground = Object.assign({}, soundSettings.timerBackground, { mode: 'file', file });
                persistSettingsToUserFile().catch(err => console.warn('selectMp3File: could not save config:', err));
            }
            if (_noiseType !== 'file') {
                _noiseType = 'file';
                document.querySelectorAll('.wn-type-btn').forEach(b => b.classList.remove('active'));
                const activeBtn = document.getElementById('wn-type-file');
                if (activeBtn) activeBtn.classList.add('active');
            }
            whiteNoisePlaying = true;
            whiteNoiseMuted = false;
            _stopNoiseFileAudio();
            const ok = await _playNoiseFileAudio(file);
            if (!ok) whiteNoisePlaying = false;
            _syncWhiteNoiseUI();
        }


        async function setNoiseType(type) {
            if (type === _noiseType) return;

            const wasPlaying = whiteNoisePlaying && !whiteNoiseMuted;
            const now = audioContext.currentTime;

            if (_noiseType === 'file') {
                _stopNoiseFileAudio();
            } else if (_noiseGains[_noiseType]) {
                _noiseGains[_noiseType].gain.setTargetAtTime(0, now, 0.1);
            }

            _noiseType = type;

            if (type === 'file') {
                if (wasPlaying) {
                    const ok = await _playNoiseFileAudio();
                    if (!ok) whiteNoisePlaying = false;
                }
            } else {
                _ensureNoiseNodes(type);
                if (wasPlaying) {
                    _noiseGains[type].gain.setTargetAtTime(whiteNoiseVolume, now + 0.05, 0.15);
                }
            }

            document.querySelectorAll('.wn-type-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = document.getElementById('wn-type-' + type);
            if (activeBtn) activeBtn.classList.add('active');
        }

        async function toggleWhiteNoise() {
            if (audioContext.state === 'suspended') audioContext.resume();

            whiteNoisePlaying = !whiteNoisePlaying;

            if (whiteNoisePlaying) {
                whiteNoiseMuted = false;
                if (_noiseType === 'file') {
                    const ok = await _playNoiseFileAudio();
                    if (!ok) {
                        whiteNoisePlaying = false;
                        if (typeof mdbToast === 'function') mdbToast('🎵 Pick a timer background audio file in Edit Sounds first');
                        else showToast('Pick a timer background audio file in Edit Sounds first.');
                    }
                } else {
                    _ensureNoiseNodes(_noiseType);
                    _noiseGains[_noiseType].gain.setTargetAtTime(whiteNoiseVolume, audioContext.currentTime, 0.15);
                }
            } else if (_noiseType === 'file') {
                _stopNoiseFileAudio();
            } else {
                _noiseGains[_noiseType].gain.setTargetAtTime(0, audioContext.currentTime, 0.15);
            }

            _syncWhiteNoiseUI();
        }

        function stopWhiteNoise() {
            whiteNoisePlaying = false;
            whiteNoiseMuted = true;
            _stopNoiseFileAudio();
            ['white', 'pink', 'brown'].forEach(t => {
                if (_noiseGains[t] && audioContext) {
                    try { _noiseGains[t].gain.setTargetAtTime(0, audioContext.currentTime, 0.05); } catch (e) { }
                }
            });
            _syncWhiteNoiseUI();
        }

        async function toggleWhiteNoiseMute() {
            whiteNoiseMuted = !whiteNoiseMuted;

            if (_noiseType === 'file') {
                if (whiteNoiseMuted) {
                    _noiseFileAudioPool.forEach(audio => { if (audio) audio.volume = 0; });
                } else {
                    if (!whiteNoisePlaying) whiteNoisePlaying = true;
                    const ok = await _playNoiseFileAudio();
                    if (!ok) whiteNoisePlaying = false;
                }
            } else {
                _ensureNoiseNodes(_noiseType);
                if (whiteNoiseMuted) {
                    _noiseGains[_noiseType].gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
                } else {
                    if (!whiteNoisePlaying) whiteNoisePlaying = true;
                    _noiseGains[_noiseType].gain.setTargetAtTime(whiteNoiseVolume, audioContext.currentTime, 0.1);
                }
            }

            _syncWhiteNoiseUI();
        }

        function setWhiteNoiseVolume(val) {
            whiteNoiseVolume = Math.max(0, Math.min(1, Number(val) / 100));
            if (audioContext && audioContext.state === 'suspended' && whiteNoisePlaying && !whiteNoiseMuted) {
                try { audioContext.resume(); } catch (e) { }
            }
            const target = (!whiteNoiseMuted && whiteNoisePlaying) ? whiteNoiseVolume : 0;
            if (_noiseType === 'file') {
                if (_noiseFileAudio) _noiseFileAudio.volume = target;
                if (!_noiseFileCrossfading) {
                    _noiseFileAudioPool.forEach(audio => {
                        if (audio && audio !== _noiseFileAudio) audio.volume = 0;
                    });
                }
            } else {
                _ensureNoiseNodes(_noiseType);
                if (_noiseGains[_noiseType] && audioContext) {
                    _noiseGains[_noiseType].gain.setTargetAtTime(target, audioContext.currentTime, 0.05);
                }
            }
            _syncWhiteNoiseUI();
        }

        function stepWhiteNoiseVolume(delta) {
            const slider = document.getElementById('wn-volume-slider');
            const cur = slider ? parseInt(slider.value) : Math.round(whiteNoiseVolume * 100);
            const next = Math.max(0, Math.min(100, cur + delta));
            if (slider) slider.value = next;
            setWhiteNoiseVolume(next);
        }

        function _syncWhiteNoiseUI() {
            const muteBtn = document.getElementById('wn-mute-btn');
            const playBtn = document.getElementById('wn-play-btn');
            const slider = document.getElementById('wn-volume-slider');

            if (muteBtn) {
                muteBtn.innerHTML = whiteNoiseMuted ? '<img src="../assets/icons/mute.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/volume.svg" class="btn-icon" alt="" />';
                muteBtn.title = whiteNoiseMuted ? 'Unmute noise (M)' : 'Mute noise (M)';
                muteBtn.classList.toggle('muted', whiteNoiseMuted);
            }
            if (playBtn) {
                const playLbl = whiteNoisePlaying ? (t('timer_stop') || 'Stop') : (t('noise_play') || 'Play');
                playBtn.innerHTML = whiteNoisePlaying ? '<img src="../assets/icons/stop.svg" class="btn-icon" alt="" /> ' + playLbl : '<img src="../assets/icons/play.svg" class="btn-icon" alt="" /> ' + playLbl;
                playBtn.classList.toggle('playing', whiteNoisePlaying);
            }
            const vol = Math.round(whiteNoiseVolume * 100);
            if (slider) slider.value = vol;
            const wnVolVal = document.getElementById('wn-volume-val');
            if (wnVolVal) wnVolVal.textContent = vol + '%';
            ['white', 'pink', 'brown', 'file'].forEach(tType => {
                const tBtn = document.getElementById('wn-type-' + tType);
                if (tBtn) tBtn.classList.toggle('active', _noiseType === tType);
            });

            // Sync overlay noise panels
            const isOn = whiteNoisePlaying && !whiteNoiseMuted;
            ['white', 'pink', 'brown', 'file'].forEach(t => {
                ['mode-noise-btn-', 'timer-noise-btn-', 'datetime-noise-btn-'].forEach(prefix => {
                    const btn = document.getElementById(prefix + t);
                    if (btn) btn.classList.toggle('active', isOn && _noiseType === t);
                });
            });
            ['mode-noise-volume', 'timer-noise-volume', 'datetime-noise-volume'].forEach(id => {
                const s = document.getElementById(id); if (s) s.value = vol;
                const v = document.getElementById(id + '-val'); if (v) v.textContent = vol;
            });

            // Legacy single-button compat
            const modeBtn = document.getElementById('mode-overlay-wn-btn');
            if (modeBtn) {
                modeBtn.classList.toggle('playing', isOn);
                modeBtn.title = isOn ? 'Stop noise (W)' : 'Play noise (W)';
            }
            const overlayBtn = document.getElementById('overlay-wn-btn');
            if (overlayBtn) {
                overlayBtn.style.background = isOn ? 'rgba(26,86,160,0.7)' : '';
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        // Shared handler for overlay noise type buttons
        async function overlaySetNoise(type, event) {
            if (audioContext.state === 'suspended') audioContext.resume();

            if (type === 'file') {
                const popup = document.getElementById('mp3-picker-popup');
                const isPopupOpen = popup && popup.classList.contains('open');

                if (whiteNoisePlaying && !whiteNoiseMuted && _noiseType === 'file') {
                    if (isPopupOpen) {
                        closeMp3Picker();
                    } else if (event) {
                        await showMp3Picker(event);
                    }
                } else {
                    await setNoiseType('file');
                    whiteNoisePlaying = true;
                    whiteNoiseMuted = false;
                    const ok = await _playNoiseFileAudio();
                    if (!ok) {
                        whiteNoisePlaying = false;
                    }
                    if (event) {
                        await showMp3Picker(event);
                    }
                }
            } else {
                closeMp3Picker();
                if (whiteNoisePlaying && !whiteNoiseMuted && _noiseType === type) {
                    if (_noiseGains[_noiseType]) {
                        _noiseGains[_noiseType].gain.setTargetAtTime(0, audioContext.currentTime, 0.15);
                    }
                    whiteNoisePlaying = false;
                } else {
                    await setNoiseType(type);
                    if (!whiteNoisePlaying || whiteNoiseMuted) {
                        whiteNoisePlaying = true;
                        whiteNoiseMuted = false;
                        _ensureNoiseNodes(_noiseType);
                        _noiseGains[_noiseType].gain.setTargetAtTime(whiteNoiseVolume, audioContext.currentTime, 0.15);
                    }
                }
            }
            // Note: Changing active noise in session does NOT mutate or persist curMode.sound!
            // Edit Mode settings & manage-database modebanks are the only sources of truth.
            _syncWhiteNoiseUI();
        }

        function overlayNoiseVolume(val) {
            const numVal = Math.max(0, Math.min(100, Number(val) || 0));
            // Sync all sliders and value displays
            ['mode-noise-volume', 'timer-noise-volume', 'datetime-noise-volume'].forEach(id => {
                const s = document.getElementById(id); if (s) s.value = numVal;
                const v = document.getElementById(id + '-val'); if (v) v.textContent = numVal;
            });
            const wnSlider = document.getElementById('wn-volume-slider');
            if (wnSlider) wnSlider.value = numVal;
            setWhiteNoiseVolume(numVal);
            // Note: Adjusting session noise volume does NOT mutate or persist curMode.sound!
            // Edit Mode settings & manage-database modebanks are the only sources of truth.
        }

        function toggleTimerPopup(event) {
            if (event) { event.stopPropagation(); event.preventDefault(); }
            const popup = document.getElementById('timer-popup');
            const btn = document.getElementById('timer-open-btn');
            if (!popup) return;
            const isOpen = popup.classList.contains('open');
            if (isOpen) {
                closeTimerPopup();
            } else {
                if (typeof closeClassSelectionPopup === 'function') closeClassSelectionPopup();
                if (typeof closeRosterSettingsPopup === 'function') closeRosterSettingsPopup(true);
                const dockBtn = document.getElementById('ucm-dock-expand-btn');
                const openedFromDock = !!(event && event.target && dockBtn && (event.target === dockBtn || dockBtn.contains(event.target)));
                const overlayActive = !!(document.getElementById('mode-animation-overlay')?.classList.contains('active') || document.getElementById('timer-overlay')?.classList.contains('active'));
                if (openedFromDock || overlayActive) {
                    popup.classList.add('dock-anchored');
                    popup.classList.add('open');
                    const dock = document.getElementById('cms-unified-dock');
                    if (dock && isWidgetVisible(dock)) {
                        const dockRect = dock.getBoundingClientRect();
                        const popRect = popup.getBoundingClientRect();
                        const pad = 8;
                        const preferredBottom = Math.max(pad, window.innerHeight - dockRect.top + 8);
                        const clampedLeft = Math.min(
                            Math.max(pad, window.innerWidth - popRect.width - pad),
                            Math.max(pad, dockRect.right - popRect.width)
                        );
                        popup.style.left = clampedLeft + 'px';
                        popup.style.right = 'auto';
                        popup.style.bottom = preferredBottom + 'px';
                        popup.style.top = 'auto';
                    }
                } else {
                    popup.classList.remove('dock-anchored');
                    popup.style.left = '';
                    popup.style.right = '';
                    popup.style.bottom = '';
                    popup.style.top = '';
                    popup.classList.add('open');
                }
                if (btn) btn.classList.add('active');
                // Sync stop btn visibility
                const running = timerInterval || stopwatchInterval || timerPaused;
                document.getElementById('popup-stop-btn').style.display = running ? 'block' : 'none';
                document.getElementById('popup-start-btn').style.display = running ? 'none' : 'block';
                document.getElementById('popup-add30s-btn').style.display = (timerInterval || timerPaused) ? 'block' : 'none';
                const sub30Btn = document.getElementById('popup-sub30s-btn');
                if (sub30Btn) sub30Btn.style.display = (timerInterval || timerPaused) ? 'block' : 'none';
                document.getElementById('popup-pause-btn').style.display = (timerInterval || timerPaused) ? 'block' : 'none';
                syncUcmSfxMuteButton();
                if (typeof _updatePresWindowControls === 'function') _updatePresWindowControls();
                if (typeof renderTimerModeShortcuts === 'function') renderTimerModeShortcuts();
                if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
            }
        }

        function closeTimerPopup() {
            const popup = document.getElementById('timer-popup');
            const btn = document.getElementById('timer-open-btn');
            if (popup) {
                popup.classList.remove('open', 'dock-anchored');
                popup.style.left = '';
                popup.style.right = '';
                popup.style.bottom = '';
                popup.style.top = '';
            }
            if (btn) btn.classList.remove('active');
        }

        // Close popup when clicking outside
        document.addEventListener('click', function (e) {
            const popup = document.getElementById('timer-popup');
            const btn = document.getElementById('timer-open-btn');
            const dockBtn = document.getElementById('ucm-dock-expand-btn');
            const display = document.getElementById('timer-active-display');
            const mp3Picker = document.getElementById('mp3-picker-popup');
            if (popup && popup.classList.contains('open')) {
                const inPopup = popup.contains(e.target) || (e.composedPath && e.composedPath().includes(popup));
                const isBtn = (e.target === btn || (btn && btn.contains(e.target)));
                const isDockBtn = (e.target === dockBtn || (dockBtn && dockBtn.contains(e.target)));
                const isDisplay = (e.target === display || (display && display.contains(e.target)));
                if (!inPopup && !isBtn && !isDockBtn && !isDisplay && !(mp3Picker && mp3Picker.contains(e.target))) {
                    closeTimerPopup();
                }
            }
        });

        // Clicking the active timer display opens fullscreen directly
        document.getElementById('timer-active-display').addEventListener('click', function (e) {
            e.stopPropagation();
            openTimerFullscreen();
        });

        // Drag to resize: dragging the handle adjusts the timer display font-size
        (function () {
            const handle = document.getElementById('timer-resize-handle');
            if (!handle) return;
            handle.addEventListener('mousedown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const display = document.getElementById('timer-active-display');
                const startY = e.clientY;
                const startRem = parseFloat(display.style.fontSize) ||
                    parseFloat(getComputedStyle(display).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize);
                let _resizeRAF = null;
                function onMove(ev) {
                    const delta = ev.clientY - startY;
                    const newRem = Math.max(0.7, Math.min(9, startRem + delta * 0.05));
                    display.style.fontSize = newRem + 'rem';
                    if (_resizeRAF) cancelAnimationFrame(_resizeRAF);
                    _resizeRAF = requestAnimationFrame(() => { _resizeRAF = null; if (!PRESENTATION_MODE) _broadcastTimerTick(); });
                }
                function onUp() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    if (!PRESENTATION_MODE) _broadcastTimerTick();
                }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
            // Prevent handle click from opening fullscreen
            handle.addEventListener('click', function (e) { e.stopPropagation(); });
        })();

        function setTimerQuickPreset(mins) {
            const m = Math.max(1, parseInt(mins, 10) || 5);
            if (timerMode !== 'timer') setTimerMode('timer');
            const ph = document.getElementById('popup-timer-hours');
            const pm = document.getElementById('popup-timer-minutes');
            const ps = document.getElementById('popup-timer-seconds');
            if (ph) ph.value = 0;
            if (pm) pm.value = m;
            if (ps) ps.value = 0;
            syncPopupSettingsToOverlay();
            popupStartTimer();
        }

        function setTimerMode(mode) {
            timerMode = mode;
            const btnTimer = document.getElementById('mode-btn-timer');
            const btnSw = document.getElementById('mode-btn-stopwatch');
            const btnInt = document.getElementById('mode-btn-interval');
            if (btnTimer) btnTimer.classList.toggle('active', mode === 'timer');
            if (btnSw) btnSw.classList.toggle('active', mode === 'stopwatch');
            if (btnInt) btnInt.classList.toggle('active', mode === 'interval');
            const popup = document.getElementById('timer-popup');
            if (popup) popup.classList.toggle('interval-mode', mode === 'interval');
            const timerInputs = document.getElementById('timer-inputs-section');
            const intervalInputs = document.getElementById('interval-inputs-section');
            if (timerInputs) timerInputs.style.display = mode === 'timer' ? 'block' : 'none';
            if (intervalInputs) intervalInputs.style.display = mode === 'interval' ? 'block' : 'none';
            const qp = document.querySelector('#ucm-timer-section .ucm-quick-presets');
            if (qp) qp.style.display = mode === 'timer' ? 'flex' : 'none';
            if (mode === 'interval' && typeof initIntervalBuilder === 'function') {
                initIntervalBuilder();
            }
            const titleEl = document.getElementById('timer-popup-title');
            if (titleEl) {
                const ucmTitle = (typeof t === 'function' && t('ucm_title')) ? t('ucm_title') : 'Control Menu';
                titleEl.innerHTML = '<img src="../assets/icons/settings.svg" class="btn-icon" alt="" /> ' + ucmTitle;
            }
            syncOverlayTimerModeState();
            updateOverlayTransportControls();
        }

        function syncOverlayTimerModeState() {
            const isStopwatch = timerMode === 'stopwatch';
            const isInterval = timerMode === 'interval';

            // Fullscreen timer duration setting
            const durationWrap = document.getElementById('overlay-duration-setting');
            if (durationWrap) {
                durationWrap.style.opacity = (isStopwatch || isInterval) ? '0.4' : '1';
                durationWrap.style.pointerEvents = (isStopwatch || isInterval) ? 'none' : 'auto';
            }

            // Mode overlay duration setting
            const modeDurationWrap = document.getElementById('mode-overlay-duration-setting');
            if (modeDurationWrap) {
                modeDurationWrap.style.opacity = (isStopwatch || isInterval) ? '0.4' : '1';
                modeDurationWrap.style.pointerEvents = (isStopwatch || isInterval) ? 'none' : 'auto';
            }

            // Mode overlay toggle button
            const modeSwBtn = document.getElementById('mode-overlay-stopwatch-btn') || document.getElementById('overlay-stopwatch-btn');
            if (modeSwBtn) {
                modeSwBtn.classList.toggle('active', isStopwatch);
                const iconSrc = isStopwatch ? '../assets/icons/clock.svg' : '../assets/icons/stopwatch.svg';
                const labelTxt = isStopwatch ? 'Timer' : 'Stopwatch';
                modeSwBtn.innerHTML = `<img src="${iconSrc}" class="btn-icon" alt="" /> <span class="btn-text">${labelTxt}</span>`;
            }

            // Fullscreen overlay segmented buttons (if present)
            const segTimerBtn = document.getElementById('overlay-view-timer-btn');
            const segSwBtn = document.getElementById('overlay-view-stopwatch-btn');
            if (segTimerBtn && segSwBtn) {
                segTimerBtn.classList.toggle('active', !isStopwatch);
                segSwBtn.classList.toggle('active', isStopwatch);
            }

            // Mode overlay progress bar (only show for countdown timer, not stopwatch)
            const modeProgress = document.getElementById('mode-overlay-progress');
            if (modeProgress) {
                modeProgress.style.display = isStopwatch ? 'none' : '';
            }
        }

        function updateOverlayTransportControls() {
            const ppBtn = document.getElementById('overlay-playpause-btn');
            const moPPBtn = document.getElementById('mode-overlay-playpause-btn');
            const stopBtn = document.getElementById('overlay-stop-main-btn');
            const moStopBtn = document.getElementById('mode-overlay-stop-main-btn');

            let running = false;
            let paused = false;
            if (timerMode === 'stopwatch') {
                running = !!stopwatchInterval;
                paused = !!stopwatchPaused;
            } else {
                running = !!timerInterval;
                paused = !!timerPaused;
            }

            const iconSrc = (!running && !paused) ? '../assets/icons/play.svg' : (paused ? '../assets/icons/play.svg' : '../assets/icons/pause.svg');
            const labelTxt = (!running && !paused) ? 'Play' : (paused ? 'Resume' : 'Pause');
            const labelHtml = `<img src="${iconSrc}" class="btn-icon" alt="" /> ${labelTxt}`;
            if (ppBtn) { ppBtn.innerHTML = labelHtml; ppBtn.classList.toggle('paused', paused); }
            if (moPPBtn) { moPPBtn.innerHTML = labelHtml; moPPBtn.classList.toggle('paused', paused); }
            if (stopBtn) stopBtn.disabled = !(running || paused);
            if (moStopBtn) moStopBtn.disabled = !(running || paused);
            const inlinePP = document.getElementById('timer-inline-pp-btn');
            const inlineStop = document.getElementById('timer-inline-stop-btn');
            if (inlinePP) inlinePP.innerHTML = paused ? '<img src="../assets/icons/play.svg" class="btn-icon" alt="" />' : (running ? '<img src="../assets/icons/pause.svg" class="btn-icon" alt="" />' : '<img src="../assets/icons/play.svg" class="btn-icon" alt="" />');
            if (inlineStop) inlineStop.disabled = !(running || paused);
            const showSkip = (intervalActiveSteps.length > 0) && (running || paused);
            const popupSkip = document.getElementById('popup-skip-step-btn');
            const inlineSkip = document.getElementById('timer-inline-skip-btn');
            const ovSkip = document.getElementById('overlay-skip-btn');
            const moSkip = document.getElementById('mode-overlay-skip-btn');
            if (popupSkip) popupSkip.style.display = showSkip ? 'inline-flex' : 'none';
            if (inlineSkip) inlineSkip.style.display = showSkip ? 'inline-flex' : 'none';
            if (ovSkip) ovSkip.style.display = showSkip ? 'inline-flex' : 'none';
            if (moSkip) moSkip.style.display = showSkip ? 'inline-flex' : 'none';
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function overlayPlayPauseTimer() {
            if (PRESENTATION_MODE) {
                if (_presChannel) {
                    try { _presChannel.postMessage({ type: 'timer-command', cmd: 'pause' }); } catch (_) {}
                }
                return;
            }
            if (timerMode === 'stopwatch') {
                if (stopwatchInterval) {
                    toggleStopwatchPause(); // pause or resume
                } else {
                    // Ensure the popup inputs reflect the active overlay settings
                    const modeOverlayEl = document.getElementById('mode-animation-overlay');
                    const modeActive = modeOverlayEl && modeOverlayEl.classList && modeOverlayEl.classList.contains('active');
                    if (modeActive) {
                        syncModeOverlayToPopup();
                    } else if (document.getElementById('overlay-timer-hours')) {
                        syncOverlaySettingsToPopup();
                    }
                    popupStartTimer(); // start
                }
            } else {
                if (timerInterval || timerPaused) {
                    timerTogglePause(); // pause or resume
                } else {
                    // Ensure the popup inputs reflect the active overlay settings
                    const modeOverlayEl = document.getElementById('mode-animation-overlay');
                    const modeActive = modeOverlayEl && modeOverlayEl.classList && modeOverlayEl.classList.contains('active');
                    if (modeActive) {
                        syncModeOverlayToPopup();
                    } else if (document.getElementById('overlay-timer-hours')) {
                        syncOverlaySettingsToPopup();
                    }
                    popupStartTimer(); // start
                }
            }
            updateOverlayTransportControls();
        }

        function overlayStopTimer() {
            if (PRESENTATION_MODE) {
                if (_presChannel) {
                    try { _presChannel.postMessage({ type: 'timer-command', cmd: 'stop' }); } catch (_) {}
                }
                return;
            }
            popupStopTimer();
            updateOverlayTransportControls();
        }

        function popupStartTimer() {
            if (timerMode === 'stopwatch') {
                startStopwatch();
            } else if (timerMode === 'interval') {
                if (typeof startIntervalSequence === 'function' && !startIntervalSequence()) return;
            } else {
                startCountdown();
            }
            document.getElementById('popup-stop-btn').style.display = 'block';
            document.getElementById('popup-start-btn').style.display = 'none';
            updateOverlayTransportControls();

            // If the mode animation overlay is visible but the mode timer or progress
            // element is not present, inject it so the overlay shows the running time and progress.
            const modeOverlay = document.getElementById('mode-animation-overlay');
            if (modeOverlay && modeOverlay.classList && modeOverlay.classList.contains('active')) {
                const existingTimer = document.getElementById('mode-overlay-timer');
                if (!existingTimer) {
                    const html = typeof getModeTimerHTML === 'function' ? getModeTimerHTML() : '';
                    if (html) {
                        const targetContainer = modeOverlay.querySelector('.quiet-mode-anim, .conversation-mode-anim, .group-mode-anim, .custom-mode-anim') || document.getElementById('mode-animation-content');
                        if (targetContainer) targetContainer.insertAdjacentHTML('beforeend', html);
                    }
                } else if (!document.getElementById('mode-overlay-progress') && timerMode !== 'stopwatch') {
                    existingTimer.insertAdjacentHTML('afterend', `
                        <div id="mode-overlay-progress" class="mode-overlay-progress">
                            <div id="mode-overlay-progress-bar" class="mode-overlay-progress-bar" style="width: 100%;"></div>
                        </div>
                    `);
                } else if (document.getElementById('mode-overlay-progress')) {
                    document.getElementById('mode-overlay-progress').style.display = timerMode === 'stopwatch' ? 'none' : '';
                }
            }
        }

        function popupStopTimer() {
            if (timerMode === 'stopwatch') {
                stopStopwatch();
            } else {
                stopCountdown();
            }
            document.getElementById('popup-stop-btn').style.display = 'none';
            document.getElementById('popup-start-btn').style.display = 'block';
            document.getElementById('popup-add30s-btn').style.display = 'none';
            document.getElementById('popup-sub30s-btn').style.display = 'none';
            document.getElementById('popup-pause-btn').style.display = 'none';
            const popupSkip = document.getElementById('popup-skip-step-btn');
            if (popupSkip) popupSkip.style.display = 'none';
            updateOverlayTransportControls();
        }

        let overlayCurrentView = 'timer'; // 'timer', 'stopwatch', 'clock', 'merged'
        let overlayPreviousTimerView = 'timer';
        let overlayTheaterMode = (function () {
            try { return localStorage.getItem('cmt-overlay-theater-mode') === 'true'; } catch (_) { return false; }
        })();
        let overlayClockInterval = null;

        function updateOverlayClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let dateLocale = 'en-GB';
            if (currentLang === 'fr') dateLocale = 'fr-FR';
            else if (currentLang === 'de') dateLocale = 'de-DE';
            else if (currentLang === 'it') dateLocale = 'it-IT';
            const dateStr = now.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            const mTime = document.getElementById('timer-overlay-merged-time');
            if (mTime) mTime.textContent = timeStr;
            const mDate = document.getElementById('timer-overlay-merged-date');
            if (mDate) mDate.textContent = dateStr;

            const cDate = document.getElementById('timer-overlay-clock-date');
            if (cDate) cDate.textContent = dateStr;

            if (overlayCurrentView === 'clock') {
                const d = document.getElementById('timer-overlay-display');
                if (d) d.textContent = timeStr;
            }

            const dtTime = document.getElementById('datetime-overlay-time');
            if (dtTime) dtTime.textContent = timeStr;
            const dtDate = document.getElementById('datetime-overlay-date');
            if (dtDate) dtDate.textContent = dateStr;
        }

        function setOverlayView(viewMode, broadcast = true) {
            if (!['timer', 'stopwatch', 'clock', 'merged'].includes(viewMode)) viewMode = 'timer';
            if (viewMode === 'timer' || viewMode === 'stopwatch') {
                overlayPreviousTimerView = viewMode;
            }
            overlayCurrentView = viewMode;

            const overlay = document.getElementById('timer-overlay');
            if (!overlay) return;

            overlay.classList.remove('view-timer', 'view-stopwatch', 'view-clock', 'view-merged');
            overlay.classList.add('view-' + viewMode);

            const timerBtn = document.getElementById('overlay-view-timer-btn');
            const swBtn = document.getElementById('overlay-view-stopwatch-btn');
            const clockBtn = document.getElementById('overlay-view-clock-btn');
            const mergedBtn = document.getElementById('overlay-view-merged-btn');

            if (timerBtn) timerBtn.classList.toggle('active', viewMode === 'timer');
            if (swBtn) swBtn.classList.toggle('active', viewMode === 'stopwatch');
            if (clockBtn) clockBtn.classList.toggle('active', viewMode === 'clock');
            if (mergedBtn) mergedBtn.classList.toggle('active', viewMode === 'merged');

            if (viewMode === 'stopwatch' && timerMode !== 'stopwatch') {
                setTimerMode('stopwatch');
            } else if (viewMode === 'timer' && timerMode === 'stopwatch') {
                setTimerMode('timer');
            }

            if (viewMode === 'clock') {
                updateOverlayClock();
            } else if (viewMode === 'stopwatch') {
                updateStopwatchDisplay();
            } else {
                const activeDisplay = document.getElementById('timer-active-display');
                const overlayDisplay = document.getElementById('timer-overlay-display');
                if (activeDisplay && overlayDisplay) {
                    overlayDisplay.textContent = (activeDisplay.textContent && activeDisplay.textContent !== '--:--')
                        ? activeDisplay.textContent
                        : getFormattedTimerInputTime();
                }
            }

            updateOverlayTransportControls();

            if (broadcast && !PRESENTATION_MODE && typeof _broadcastAnimation === 'function') {
                _broadcastAnimation('overlay-view-change', { view: viewMode });
            }
            if (typeof isTimerFullscreenMinimised !== 'undefined' && isTimerFullscreenMinimised && typeof updateTimerMinimisedPill === 'function') {
                updateTimerMinimisedPill();
            }
        }

        function toggleOverlayMergedView() {
            if (overlayCurrentView === 'merged') {
                setOverlayView(overlayPreviousTimerView || 'timer');
            } else {
                setOverlayView('merged');
            }
        }

        function toggleOverlayTheaterMode(broadcast = true) {
            overlayTheaterMode = !overlayTheaterMode;
            const overlay = document.getElementById('timer-overlay');
            if (overlay) overlay.classList.toggle('theater-mode', overlayTheaterMode);
            const thBtn = document.getElementById('overlay-theater-btn');
            if (thBtn) thBtn.classList.toggle('active', overlayTheaterMode);
            try { localStorage.setItem('cmt-overlay-theater-mode', overlayTheaterMode ? 'true' : 'false'); } catch (_) {}
            if (broadcast && !PRESENTATION_MODE && typeof _broadcastAnimation === 'function') {
                _broadcastAnimation('overlay-theater-toggle', { theater: overlayTheaterMode });
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function toggleOverlayNoisePanel() {
            const panel = document.getElementById('timer-overlay-noise-panel');
            const btn = document.getElementById('overlay-noise-toggle-btn');
            if (panel) {
                const isOpen = panel.classList.toggle('open');
                if (btn) btn.classList.toggle('active', isOpen);
            }
        }

        function onOverlayKeyDown(e) {
            if (e.key === 'Escape') {
                closeTimerFullscreen();
            }
        }

        let isTimerFullscreenActive = false;
        let isTimerFullscreenMinimised = false;

        function openTimerFullscreen(initialView = null) {
            document.getElementById('timer-popup').classList.remove('open');
            syncPopupSettingsToOverlay();
            syncOverlayTimerModeState();
            updateOverlayTransportControls();
            if (typeof renderTimerModeShortcuts === 'function') renderTimerModeShortcuts();

            isTimerFullscreenActive = true;
            isTimerFullscreenMinimised = false;
            const _tPill = document.getElementById('timer-minimized-pill');
            if (_tPill) _tPill.style.display = 'none';

            const overlay = document.getElementById('timer-overlay');
            overlay.classList.add('active');
            overlay.classList.toggle('theater-mode', overlayTheaterMode);

            const thBtn = document.getElementById('overlay-theater-btn');
            if (thBtn) thBtn.classList.toggle('active', overlayTheaterMode);

            if (!overlayClockInterval) {
                updateOverlayClock();
                overlayClockInterval = setInterval(updateOverlayClock, 1000);
            }

            document.removeEventListener('keydown', onOverlayKeyDown);
            document.addEventListener('keydown', onOverlayKeyDown);

            const viewToSet = initialView || (overlayCurrentView === 'clock' ? 'timer' : (overlayCurrentView || 'timer'));
            setOverlayView(viewToSet, false);

            if (!PRESENTATION_MODE && typeof _broadcastAnimation === 'function') {
                _broadcastAnimation('timer-fullscreen-open', { view: viewToSet, theater: overlayTheaterMode });
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function updateTimerMinimisedPill() {
            if (PRESENTATION_MODE) return;
            const iconImg = document.getElementById('timer-pill-icon-img');
            const titleEl = document.getElementById('timer-pill-title');
            const view = overlayCurrentView || 'timer';
            let iconSrc = '../assets/icons/clock.svg';
            let label = (typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t('timer_view_timer', 'Timer') : 'Timer';
            if (view === 'stopwatch') {
                iconSrc = '../assets/icons/stopwatch.svg';
                label = (typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t('timer_view_stopwatch', 'Stopwatch') : 'Stopwatch';
            } else if (view === 'clock') {
                iconSrc = '../assets/icons/calendar.svg';
                label = (typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t('timer_view_clock', 'Clock') : 'Clock';
            } else if (view === 'merged') {
                iconSrc = '../assets/icons/split.svg';
                label = (typeof i18n !== 'undefined' && typeof i18n.t === 'function') ? i18n.t('timer_view_merged', 'Dual View') : 'Dual View';
            }
            if (iconImg) {
                if (window.DomSync) window.DomSync.setAttr(iconImg, 'src', iconSrc);
                else if (iconImg.getAttribute('src') !== iconSrc) iconImg.setAttribute('src', iconSrc);
            }
            if (titleEl && titleEl.textContent !== label) titleEl.textContent = label;
        }

        function minimizeTimerFullscreen() {
            if (PRESENTATION_MODE) return;
            const overlay = document.getElementById('timer-overlay');
            if (!overlay || !overlay.classList.contains('active')) return;

            syncOverlaySettingsToPopup();
            isTimerFullscreenActive = true;
            isTimerFullscreenMinimised = true;
            overlay.classList.remove('active');
            if (overlayClockInterval) {
                clearInterval(overlayClockInterval);
                overlayClockInterval = null;
            }
            document.removeEventListener('keydown', onOverlayKeyDown);

            // If a mode overlay was underneath, minimize it too so the main classroom UI is revealed
            const modeOverlay = document.getElementById('mode-animation-overlay');
            if (modeOverlay && modeOverlay.classList.contains('active') && typeof minimizeMode === 'function') {
                minimizeMode();
            }

            updateTimerMinimisedPill();
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function restoreTimerFullscreen() {
            if (PRESENTATION_MODE) return;
            isTimerFullscreenMinimised = false;
            const _tPill = document.getElementById('timer-minimized-pill');
            if (_tPill) _tPill.style.display = 'none';
            openTimerFullscreen(overlayCurrentView || 'timer');
        }

        function closeTimerFullscreen() {
            isTimerFullscreenActive = false;
            isTimerFullscreenMinimised = false;
            const _tPill = document.getElementById('timer-minimized-pill');
            if (_tPill) _tPill.style.display = 'none';
            syncOverlaySettingsToPopup();
            const overlay = document.getElementById('timer-overlay');
            overlay.classList.remove('active');
            if (overlayClockInterval) {
                clearInterval(overlayClockInterval);
                overlayClockInterval = null;
            }
            document.removeEventListener('keydown', onOverlayKeyDown);
            if (!PRESENTATION_MODE && typeof _broadcastAnimation === 'function') {
                _broadcastAnimation('timer-fullscreen-close');
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
        }

        function getFormattedTimerInputTime() {
            if (typeof timerMode !== 'undefined' && timerMode === 'stopwatch') {
                return '00:00';
            }
            if (typeof timerMode !== 'undefined' && timerMode === 'interval') {
                if (!intervalBuilderInitialized && typeof initIntervalBuilder === 'function') initIntervalBuilder();
                const firstValid = (intervalSteps || []).find(st => ((parseInt(st.minutes, 10) || 0) * 60 + (parseInt(st.seconds, 10) || 0)) > 0);
                if (firstValid) {
                    const sec = (parseInt(firstValid.minutes, 10) || 0) * 60 + (parseInt(firstValid.seconds, 10) || 0);
                    return _formatStepDuration(sec);
                }
                return '00:00';
            }
            const overlayActive = document.getElementById('timer-overlay') && document.getElementById('timer-overlay').classList.contains('active');
            const hoursInput = overlayActive ? document.getElementById('overlay-timer-hours') : document.getElementById('popup-timer-hours');
            const minutesInput = overlayActive ? document.getElementById('overlay-timer-minutes') : document.getElementById('popup-timer-minutes');
            const secondsInput = overlayActive ? document.getElementById('overlay-timer-seconds') : document.getElementById('popup-timer-seconds');
            const h = hoursInput ? (parseInt(hoursInput.value, 10) || 0) : 0;
            const m = minutesInput ? (parseInt(minutesInput.value, 10) || 0) : 5;
            const s = secondsInput ? Math.max(0, Math.min(59, parseInt(secondsInput.value, 10) || 0)) : 0;
            if (h > 0) {
                return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            }
            return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }

        function detachTimerWindow() {
            const initDisplayEl = document.getElementById('timer-active-display');
            let initText = (initDisplayEl && initDisplayEl.textContent && initDisplayEl.textContent !== '--:--')
                ? initDisplayEl.textContent
                : getFormattedTimerInputTime();
            const initCls = initDisplayEl ? initDisplayEl.className : '';

            const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>&#x23F1; Timer</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:#18181f;-webkit-app-region:drag}
body{display:flex;align-items:center;justify-content:center}
#dtw-display{font-size:min(28vw,75vh);font-weight:900;text-align:center;letter-spacing:0.08em;color:#e8e8e8;font-family:'Segoe UI',Arial,sans-serif;transition:color 0.2s;white-space:nowrap}
#dtw-display.running{color:#2ecc71}
#dtw-display.warning{color:#e74c3c;animation:w 1s ease-in-out infinite}
#dtw-display.stopwatch-mode{color:#4a9eed}
@keyframes w{0%,100%{opacity:1}50%{opacity:0.35}}
#dtw-btns{position:fixed;top:4px;right:4px;display:flex;gap:2px;-webkit-app-region:no-drag}
#dtw-close,#dtw-menu-btn{background:none;border:none;color:#555;font-size:1rem;cursor:pointer;line-height:1;padding:2px 5px;-webkit-app-region:no-drag}
#dtw-close:hover,#dtw-menu-btn:hover{color:#e8e8e8}
#dtw-overlay{display:none;position:fixed;inset:0;z-index:998;-webkit-app-region:no-drag}
#dtw-menu{display:none;position:fixed;background:#1e1e28;border:1px solid #333;border-radius:6px;overflow:hidden;z-index:999;min-width:110px;box-shadow:0 4px 16px rgba(0,0,0,0.6);-webkit-app-region:no-drag}
.dtw-mi{padding:8px 14px;font-size:0.82rem;font-family:'Segoe UI',Arial,sans-serif;color:#ddd;cursor:pointer;white-space:nowrap;-webkit-app-region:no-drag}
.dtw-mi:hover{background:#2e2e3e;color:#fff}
.dtw-sep{height:1px;background:#333;margin:2px 0}
</style></head><body>
<div id="dtw-overlay" onclick="hideMenu()"></div>
<div id="dtw-btns"><button id="dtw-menu-btn" onclick="toggleMenu()" title="Controls">&#x22EE;</button><button id="dtw-close" onclick="window.close()" title="Close">&#x2715;</button></div>
<div id="dtw-display" class="${initCls}">${initText}</div>
<div id="dtw-menu">
  <div class="dtw-mi" id="dtw-mi-pp" onclick="dtwCmd('pause')">&#x23F8; Pause</div>
  <div class="dtw-mi" id="dtw-mi-stop" onclick="dtwCmd('stop')">&#x25A0; Stop</div>
  <div class="dtw-sep"></div>
  <div class="dtw-mi" onclick="dtwCmd('add30')">+30s</div>
  <div class="dtw-mi" id="dtw-mi-sub30" onclick="dtwCmd('sub30')">&minus;30s</div>
</div>
<script>
var api = window.electronApi;
var _state = {};
function dtwCmd(cmd) {
  hideMenu();
  if (!api) return;
  if (cmd === 'pause') _state.paused = !_state.paused;
  api.timerCommand({ cmd: cmd });
}
function toggleMenu() {
  var m = document.getElementById('dtw-menu');
  if (m.style.display === 'block') { hideMenu(); return; }
  var pp = document.getElementById('dtw-mi-pp');
  if (pp) pp.textContent = _state.paused ? '\u25B6 Resume' : '\u23F8 Pause';
  var btn = document.getElementById('dtw-menu-btn');
  var r = btn.getBoundingClientRect();
  m.style.display = 'block';
  var mx = Math.min(r.left, window.innerWidth  - m.offsetWidth  - 4);
  m.style.left = Math.max(0, mx) + 'px';
  m.style.top  = (r.bottom + 2) + 'px';
  document.getElementById('dtw-overlay').style.display = 'block';
  scheduleMenuClose();
}
var _menuTimer = null;
function scheduleMenuClose() {
  if (_menuTimer) clearTimeout(_menuTimer);
  _menuTimer = setTimeout(hideMenu, 3000);
}
function hideMenu() {
  if (_menuTimer) { clearTimeout(_menuTimer); _menuTimer = null; }
  document.getElementById('dtw-menu').style.display = 'none';
  document.getElementById('dtw-overlay').style.display = 'none';
}
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.getElementById('dtw-menu').addEventListener('mousemove', scheduleMenuClose);
function syncState() {
  if (!api) return;
  api.timerState().then(function(res) {
    if (!res || !res.ok) return;
    _state = res.state;
    var d = document.getElementById('dtw-display');
    if (d && _state.text) {
      d.textContent = _state.text;
      d.className   = _state.cls || '';
    }
  }).catch(function(){});
}
setInterval(syncState, 500);
syncState();
<\/script></body></html>`;
            if (window.Desktop && window.Desktop.isElectron()) {
                window.Desktop.openTimerWindow(html, { width: 260, height: 120 }).then(function (res) {
                    if (res && res.alreadyOpen) return;
                    const detachBtn = document.getElementById('timer-inline-detach-btn');
                    if (detachBtn) detachBtn.classList.add('active');
                    // Hide the inline timer display while detached
                    const area = document.getElementById('timer-active-area');
                    if (area) area.style.display = 'none';
                    // Poll until the detached window closes, then restore
                    const poll = setInterval(function () {
                        window.Desktop.isTimerWindowOpen().then(function (open) {
                            if (!open) {
                                clearInterval(poll);
                                if (detachBtn) detachBtn.classList.remove('active');
                                // Restore the area only if timer is still running
                                const running = timerInterval || stopwatchInterval || timerPaused || stopwatchPaused;
                                if (area && running) area.style.display = 'flex';
                            }
                        });
                    }, 1000);
                });
            }
        }

        let _saveTimerBeepsTimeout = null;
        function _debounceSaveTimerBeeps() {
            if (_saveTimerBeepsTimeout) clearTimeout(_saveTimerBeepsTimeout);
            _saveTimerBeepsTimeout = setTimeout(() => {
                _saveTimerBeepsTimeout = null;
                if (typeof persistSettingsToUserFile === 'function') {
                    persistSettingsToUserFile().catch(err => console.warn('persistSettingsToUserFile (timer beeps) failed:', err));
                }
            }, 800);
        }

        function syncTimerBeepsFromSoundSettings() {
            const iters = (soundSettings && soundSettings.timerEnd && typeof soundSettings.timerEnd.iterations === 'number' && soundSettings.timerEnd.iterations >= 1)
                ? soundSettings.timerEnd.iterations
                : 3;
            const pEl = document.getElementById('popup-timer-beeps');
            const oEl = document.getElementById('overlay-timer-beeps');
            const mEl = document.getElementById('mode-overlay-timer-beeps');
            const tEl = document.getElementById('timer-beeps');
            if (pEl) pEl.value = iters;
            if (oEl) oEl.value = iters;
            if (mEl) mEl.value = iters;
            if (tEl) tEl.value = iters;
        }

        function onTimerBeepsInputChanged(newVal) {
            const val = Math.max(1, Math.min(100, parseInt(newVal, 10) || 1));
            const pEl = document.getElementById('popup-timer-beeps');
            const oEl = document.getElementById('overlay-timer-beeps');
            const mEl = document.getElementById('mode-overlay-timer-beeps');
            const tEl = document.getElementById('timer-beeps');
            if (pEl && parseInt(pEl.value, 10) !== val) pEl.value = val;
            if (oEl && parseInt(oEl.value, 10) !== val) oEl.value = val;
            if (mEl && parseInt(mEl.value, 10) !== val) mEl.value = val;
            if (tEl && parseInt(tEl.value, 10) !== val) tEl.value = val;
            if (soundSettings && soundSettings.timerEnd) {
                soundSettings.timerEnd.iterations = val;
            }
            _debounceSaveTimerBeeps();
        }

        function syncPopupSettingsToOverlay() {
            const hours = document.getElementById('popup-timer-hours')?.value ?? 0;
            const minutes = document.getElementById('popup-timer-minutes')?.value ?? 5;
            const seconds = document.getElementById('popup-timer-seconds')?.value ?? 0;
            const beeps = document.getElementById('popup-timer-beeps')?.value || soundSettings?.timerEnd?.iterations || 3;
            if (document.getElementById('overlay-timer-hours')) document.getElementById('overlay-timer-hours').value = hours;
            if (document.getElementById('overlay-timer-minutes')) document.getElementById('overlay-timer-minutes').value = minutes;
            if (document.getElementById('overlay-timer-seconds')) document.getElementById('overlay-timer-seconds').value = seconds;
            if (document.getElementById('overlay-timer-beeps')) document.getElementById('overlay-timer-beeps').value = beeps;
            if (document.getElementById('mode-overlay-timer-hours')) document.getElementById('mode-overlay-timer-hours').value = hours;
            if (document.getElementById('mode-overlay-timer-minutes')) document.getElementById('mode-overlay-timer-minutes').value = minutes;
            if (document.getElementById('mode-overlay-timer-seconds')) document.getElementById('mode-overlay-timer-seconds').value = seconds;
            if (document.getElementById('mode-overlay-timer-beeps')) document.getElementById('mode-overlay-timer-beeps').value = beeps;
            if (document.getElementById('timer-seconds')) document.getElementById('timer-seconds').value = seconds;
            if (document.getElementById('timer-beeps')) document.getElementById('timer-beeps').value = beeps;
        }

        function syncOverlaySettingsToPopup() {
            const hours = document.getElementById('overlay-timer-hours')?.value ?? 0;
            const minutes = document.getElementById('overlay-timer-minutes')?.value ?? 5;
            const seconds = document.getElementById('overlay-timer-seconds')?.value ?? 0;
            const beeps = document.getElementById('overlay-timer-beeps')?.value || soundSettings?.timerEnd?.iterations || 3;
            if (document.getElementById('popup-timer-hours')) document.getElementById('popup-timer-hours').value = hours;
            if (document.getElementById('popup-timer-minutes')) document.getElementById('popup-timer-minutes').value = minutes;
            if (document.getElementById('popup-timer-seconds')) document.getElementById('popup-timer-seconds').value = seconds;
            if (document.getElementById('popup-timer-beeps')) document.getElementById('popup-timer-beeps').value = beeps;
            if (document.getElementById('mode-overlay-timer-hours')) document.getElementById('mode-overlay-timer-hours').value = hours;
            if (document.getElementById('mode-overlay-timer-minutes')) document.getElementById('mode-overlay-timer-minutes').value = minutes;
            if (document.getElementById('mode-overlay-timer-seconds')) document.getElementById('mode-overlay-timer-seconds').value = seconds;
            if (document.getElementById('mode-overlay-timer-beeps')) document.getElementById('mode-overlay-timer-beeps').value = beeps;
            if (document.getElementById('timer-seconds')) document.getElementById('timer-seconds').value = seconds;
            if (document.getElementById('timer-beeps')) document.getElementById('timer-beeps').value = beeps;
            if (soundSettings?.timerEnd) soundSettings.timerEnd.iterations = parseInt(beeps, 10) || 1;
        }

        function syncModeOverlayToPopup() {
            const mh = document.getElementById('mode-overlay-timer-hours');
            if (!mh) return; // nothing to sync
            const mm = document.getElementById('mode-overlay-timer-minutes');
            const ms = document.getElementById('mode-overlay-timer-seconds');
            const mb = document.getElementById('mode-overlay-timer-beeps');
            const ph = document.getElementById('popup-timer-hours');
            const pm = document.getElementById('popup-timer-minutes');
            const ps = document.getElementById('popup-timer-seconds');
            const pb = document.getElementById('popup-timer-beeps');
            const oh = document.getElementById('overlay-timer-hours');
            const om = document.getElementById('overlay-timer-minutes');
            const os = document.getElementById('overlay-timer-seconds');
            const ob = document.getElementById('overlay-timer-beeps');
            const ts = document.getElementById('timer-seconds');
            const tb = document.getElementById('timer-beeps');
            const hours = mh.value ?? 0;
            const minutes = mm ? (mm.value ?? 5) : 5;
            const seconds = ms ? (ms.value ?? 0) : 0;
            if (ph) ph.value = hours;
            if (pm) pm.value = minutes;
            if (ps) ps.value = seconds;
            if (oh) oh.value = hours;
            if (om) om.value = minutes;
            if (os) os.value = seconds;
            if (ts) ts.value = seconds;
            if (mb) {
                const beeps = mb.value || soundSettings?.timerEnd?.iterations || 3;
                if (pb) pb.value = beeps;
                if (ob) ob.value = beeps;
                if (tb) tb.value = beeps;
                if (soundSettings?.timerEnd) soundSettings.timerEnd.iterations = parseInt(beeps, 10) || 1;
            }
        }

        (function _bindTimerSecondsSyncListeners() {
            const pSec = document.getElementById('popup-timer-seconds');
            if (pSec) pSec.addEventListener('change', syncPopupSettingsToOverlay);
            const oSec = document.getElementById('overlay-timer-seconds');
            if (oSec) oSec.addEventListener('change', syncOverlaySettingsToPopup);
            const mSec = document.getElementById('mode-overlay-timer-seconds');
            if (mSec) mSec.addEventListener('change', syncModeOverlayToPopup);
        })();

        function toggleOverlayStopwatchMode() {
            setTimerMode(timerMode === 'stopwatch' ? 'timer' : 'stopwatch');
        }

        // ---- Countdown Timer ----

        window.cmsStartExternalTimer = function (totalSeconds) {
            if (PRESENTATION_MODE) {
                if (_presChannel) {
                    try { _presChannel.postMessage({ type: 'start-timer', seconds: totalSeconds }); } catch (_) {}
                }
                return;
            }
            if (typeof startCountdownWithSeconds === 'function') {
                startCountdownWithSeconds(totalSeconds);
                return;
            }
            const tot = Math.max(1, parseInt(totalSeconds, 10) || 300);
            const h = Math.floor(tot / 3600);
            const m = Math.floor((tot % 3600) / 60);
            const s = tot % 60;
            const ph = document.getElementById('popup-timer-hours');
            const pm = document.getElementById('popup-timer-minutes');
            const ps = document.getElementById('popup-timer-seconds');
            if (ph) ph.value = h;
            if (pm) pm.value = m;
            if (ps) ps.value = s;
            const hiddenSec = document.getElementById('timer-seconds');
            if (hiddenSec) hiddenSec.value = s;
            const totalMs = tot * 1000;
            intervalActiveSteps = [];
            intervalCurrentStepIdx = 0;
            intervalCurrentCycle = 1;
            if (typeof _applyIntervalBadges === 'function') _applyIntervalBadges('', '');

            timerTotalMs = totalMs;
            timerEndTime = Date.now() + totalMs;
            const stopBtn = document.getElementById('popup-stop-btn');
            if (stopBtn) stopBtn.style.display = 'block';
            const startBtn = document.getElementById('popup-start-btn');
            if (startBtn) startBtn.style.display = 'none';
            if (typeof updateOverlayTransportControls === 'function') updateOverlayTransportControls();
            const bar = document.getElementById('timer-overlay-progress-bar');
            if (bar) { bar.style.width = '100%'; bar.className = ''; }
            const mBar = document.getElementById('mode-overlay-progress-bar');
            if (mBar) { mBar.style.width = '100%'; mBar.className = ''; }
            const mProg = document.getElementById('mode-overlay-progress');
            if (mProg) { mProg.style.display = ''; }
            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) { modeTimer.style.display = ''; }
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimerDisplay, 500);
            const display = document.getElementById('timer-active-display');
            const area = document.getElementById('timer-active-area');
            if (area) area.style.display = 'flex';
            if (display) display.className = 'running';
            updateTimerDisplay();
            const pAdd = document.getElementById('popup-add30s-btn');
            if (pAdd) pAdd.style.display = 'block';
            const pSub = document.getElementById('popup-sub30s-btn');
            if (pSub) pSub.style.display = 'block';
            const pPause = document.getElementById('popup-pause-btn');
            if (pPause) pPause.style.display = 'block';
            if (!PRESENTATION_MODE && typeof _broadcastTimerTick === 'function') _broadcastTimerTick();
        };

        // ============================================================
        // INTERVAL / SEQUENCE TIMER BUILDER & RUNNER
        // ============================================================
        const INTERVAL_CURRENT_KEY = 'cmt-interval-current';
        const INTERVAL_PRESETS_KEY = 'cmt-interval-presets';

        let intervalSteps = [
            { label: '', minutes: 5, seconds: 0, beeps: null, modeId: '', sound: '' },
            { label: '', minutes: 3, seconds: 0, beeps: null, modeId: '', sound: '' }
        ];
        let intervalCycles = 1;
        let intervalInfinite = false;
        let intervalPresets = [];
        let intervalSelectedPresetId = '';
        let intervalBuilderInitialized = false;
        let _intervalSaveConfigTimer = null;

        // Active runtime state
        let intervalActiveSteps = [];
        let intervalCurrentStepIdx = 0;
        let intervalCurrentCycle = 1;

        function _tInterval(key, fallback) {
            const val = (typeof t === 'function') ? t(key) : '';
            return (val && val !== key) ? val : fallback;
        }

        function _normalizeIntervalStep(st) {
            return {
                label: typeof st?.label === 'string' ? st.label : '',
                minutes: Math.max(0, Math.min(999, parseInt(st?.minutes, 10) || 0)),
                seconds: Math.max(0, Math.min(59, parseInt(st?.seconds, 10) || 0)),
                beeps: (st?.beeps === null || st?.beeps === undefined || st?.beeps === '')
                    ? null
                    : Math.max(0, Math.min(20, parseInt(st.beeps, 10) || 0)),
                modeId: typeof st?.modeId === 'string' ? st.modeId : '',
                sound: typeof st?.sound === 'string' ? st.sound : ''
            };
        }

        function _getDefaultIntervalPresets() {
            return [
                {
                    id: 'preset-work-review',
                    name: '5m + 3m',
                    steps: [
                        { label: 'Work', minutes: 5, seconds: 0, beeps: null, modeId: '', sound: '' },
                        { label: 'Review', minutes: 3, seconds: 0, beeps: null, modeId: '', sound: '' }
                    ],
                    cycles: 1,
                    infinite: false
                },
                {
                    id: 'preset-stations',
                    name: 'Stations (5m + 1m x4)',
                    steps: [
                        { label: 'Station', minutes: 5, seconds: 0, beeps: null, modeId: '', sound: '' },
                        { label: 'Switch', minutes: 1, seconds: 0, beeps: 1, modeId: '', sound: '' }
                    ],
                    cycles: 4,
                    infinite: false
                }
            ];
        }

        function _formatStepDuration(totalSec) {
            const s = Math.max(0, Math.round(totalSec));
            const m = Math.floor(s / 60);
            const rem = s % 60;
            return String(m).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
        }

        function _loadIntervalStateFromStorage() {
            try {
                const raw = localStorage.getItem(INTERVAL_CURRENT_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
                        intervalSteps = parsed.steps.map(_normalizeIntervalStep);
                    }
                    if (parsed.cycles) intervalCycles = Math.max(1, Math.min(99, parseInt(parsed.cycles, 10) || 1));
                    intervalInfinite = !!parsed.infinite;
                    if (typeof parsed.presetId === 'string') intervalSelectedPresetId = parsed.presetId;
                }
            } catch (_) { }

            try {
                const rawPresets = localStorage.getItem(INTERVAL_PRESETS_KEY);
                if (rawPresets) {
                    const parsedPresets = JSON.parse(rawPresets);
                    if (Array.isArray(parsedPresets)) {
                        intervalPresets = parsedPresets.map(p => ({
                            id: String(p?.id || ('preset-' + Date.now())),
                            name: String(p?.name || 'Preset'),
                            steps: Array.isArray(p?.steps) ? p.steps.map(_normalizeIntervalStep) : [],
                            cycles: Math.max(1, Math.min(99, parseInt(p?.cycles, 10) || 1)),
                            infinite: !!p?.infinite
                        }));
                    }
                } else {
                    intervalPresets = _getDefaultIntervalPresets();
                    localStorage.setItem(INTERVAL_PRESETS_KEY, JSON.stringify(intervalPresets));
                }
            } catch (_) { }
        }

        function _getSerializableIntervalSequences() {
            if (!intervalBuilderInitialized) {
                _loadIntervalStateFromStorage();
                intervalBuilderInitialized = true;
            }
            return {
                current: {
                    steps: (intervalSteps || []).map(_normalizeIntervalStep),
                    cycles: Math.max(1, Math.min(99, parseInt(intervalCycles, 10) || 1)),
                    infinite: !!intervalInfinite,
                    presetId: typeof intervalSelectedPresetId === 'string' ? intervalSelectedPresetId : ''
                },
                presets: (intervalPresets || []).map(p => ({
                    id: String(p?.id || ''),
                    name: String(p?.name || ''),
                    steps: Array.isArray(p?.steps) ? p.steps.map(_normalizeIntervalStep) : [],
                    cycles: Math.max(1, Math.min(99, parseInt(p?.cycles, 10) || 1)),
                    infinite: !!p?.infinite
                }))
            };
        }

        function _applyIntervalSequencesFromConfig(seqConfig) {
            if (PRESENTATION_MODE) return;
            if (!seqConfig || typeof seqConfig !== 'object') {
                if (!intervalBuilderInitialized) {
                    _loadIntervalStateFromStorage();
                    intervalBuilderInitialized = true;
                }
                return;
            }
            if (Array.isArray(seqConfig.presets)) {
                intervalPresets = seqConfig.presets.map(p => ({
                    id: String(p?.id || ('preset-' + Date.now())),
                    name: String(p?.name || 'Preset'),
                    steps: Array.isArray(p?.steps) ? p.steps.map(_normalizeIntervalStep) : [],
                    cycles: Math.max(1, Math.min(99, parseInt(p?.cycles, 10) || 1)),
                    infinite: !!p?.infinite
                }));
                try {
                    localStorage.setItem(INTERVAL_PRESETS_KEY, JSON.stringify(intervalPresets));
                } catch (_) { }
            }
            if (seqConfig.current && typeof seqConfig.current === 'object') {
                if (Array.isArray(seqConfig.current.steps) && seqConfig.current.steps.length > 0) {
                    intervalSteps = seqConfig.current.steps.map(_normalizeIntervalStep);
                }
                if (seqConfig.current.cycles) {
                    intervalCycles = Math.max(1, Math.min(99, parseInt(seqConfig.current.cycles, 10) || 1));
                }
                intervalInfinite = !!seqConfig.current.infinite;
                intervalSelectedPresetId = typeof seqConfig.current.presetId === 'string' ? seqConfig.current.presetId : '';
                try {
                    localStorage.setItem(INTERVAL_CURRENT_KEY, JSON.stringify({
                        steps: intervalSteps,
                        cycles: intervalCycles,
                        infinite: intervalInfinite,
                        presetId: intervalSelectedPresetId
                    }));
                } catch (_) { }
            }
            intervalBuilderInitialized = true;
            if (document.getElementById('interval-inputs-section')?.style.display !== 'none') {
                initIntervalBuilder();
            }
        }

        function _persistIntervalSequencesToConfig(immediate = false) {
            if (PRESENTATION_MODE) return;
            if (!(window.Desktop && typeof Desktop.isElectron === 'function' && Desktop.isElectron())) return;
            if (typeof persistSettingsToUserFile !== 'function') return;
            if (_intervalSaveConfigTimer) {
                clearTimeout(_intervalSaveConfigTimer);
                _intervalSaveConfigTimer = null;
            }
            if (immediate) {
                persistSettingsToUserFile().catch(err => console.warn('persistSettingsToUserFile (interval) failed:', err));
                return;
            }
            _intervalSaveConfigTimer = setTimeout(() => {
                _intervalSaveConfigTimer = null;
                persistSettingsToUserFile().catch(err => console.warn('persistSettingsToUserFile (interval) failed:', err));
            }, 700);
        }

        function _saveIntervalStateToStorage(immediateConfigSave = false) {
            if (PRESENTATION_MODE) return;
            try {
                localStorage.setItem(INTERVAL_CURRENT_KEY, JSON.stringify({
                    steps: intervalSteps,
                    cycles: intervalCycles,
                    infinite: intervalInfinite,
                    presetId: intervalSelectedPresetId
                }));
            } catch (_) { }
            _persistIntervalSequencesToConfig(immediateConfigSave);
        }

        function _saveIntervalPresetsToStorage() {
            if (PRESENTATION_MODE) return;
            try {
                localStorage.setItem(INTERVAL_PRESETS_KEY, JSON.stringify(intervalPresets));
            } catch (_) { }
            _persistIntervalSequencesToConfig(true);
        }

        function initIntervalBuilder() {
            if (!intervalBuilderInitialized) {
                _loadIntervalStateFromStorage();
                intervalBuilderInitialized = true;
            }
            const cycInput = document.getElementById('interval-cycles-input');
            if (cycInput) {
                cycInput.value = intervalCycles;
                cycInput.disabled = intervalInfinite;
            }
            const infBtn = document.getElementById('interval-infinite-btn');
            if (infBtn) infBtn.classList.toggle('active', intervalInfinite);
            renderIntervalPresetSelect();
            renderIntervalStepsList();
            updateIntervalSummary();
        }

        function renderIntervalPresetSelect() {
            const sel = document.getElementById('interval-preset-select');
            const delBtn = document.getElementById('interval-preset-delete-btn');
            if (!sel) return;
            sel.innerHTML = '';
            const customOpt = document.createElement('option');
            customOpt.value = '';
            customOpt.textContent = _tInterval('interval_preset_custom', 'Custom sequence');
            sel.appendChild(customOpt);
            intervalPresets.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                sel.appendChild(opt);
            });
            sel.value = intervalSelectedPresetId || '';
            if (delBtn) delBtn.style.display = intervalSelectedPresetId ? 'inline-flex' : 'none';
        }

        function onIntervalPresetSelected(presetId) {
            intervalSelectedPresetId = presetId || '';
            const delBtn = document.getElementById('interval-preset-delete-btn');
            if (delBtn) delBtn.style.display = intervalSelectedPresetId ? 'inline-flex' : 'none';
            if (!presetId) {
                _saveIntervalStateToStorage(true);
                return;
            }
            const preset = intervalPresets.find(p => p.id === presetId);
            if (!preset) return;
            intervalSteps = (preset.steps || []).map(_normalizeIntervalStep);
            intervalCycles = Math.max(1, parseInt(preset.cycles, 10) || 1);
            intervalInfinite = !!preset.infinite;
            const cycInput = document.getElementById('interval-cycles-input');
            if (cycInput) {
                cycInput.value = intervalCycles;
                cycInput.disabled = intervalInfinite;
            }
            const infBtn = document.getElementById('interval-infinite-btn');
            if (infBtn) infBtn.classList.toggle('active', intervalInfinite);
            renderIntervalStepsList();
            updateIntervalSummary();
            _saveIntervalStateToStorage(true);
        }

        async function saveIntervalPreset() {
            const promptMsg = _tInterval('interval_preset_name_prompt', 'Preset name:');
            const currentPreset = intervalPresets.find(p => p.id === intervalSelectedPresetId);
            const defaultName = currentPreset ? currentPreset.name : '';
            const name = (typeof showPrompt === 'function')
                ? await showPrompt(promptMsg, defaultName)
                : prompt(promptMsg, defaultName);
            if (!name || !name.trim()) return;
            const cleanName = name.trim();
            const existing = intervalPresets.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
            const clonedSteps = intervalSteps.map(st => ({ ...st }));
            if (existing) {
                existing.name = cleanName;
                existing.steps = clonedSteps;
                existing.cycles = intervalCycles;
                existing.infinite = intervalInfinite;
                intervalSelectedPresetId = existing.id;
            } else {
                const newId = 'preset-' + Date.now();
                intervalPresets.push({
                    id: newId,
                    name: cleanName,
                    steps: clonedSteps,
                    cycles: intervalCycles,
                    infinite: intervalInfinite
                });
                intervalSelectedPresetId = newId;
            }
            _saveIntervalPresetsToStorage();
            _saveIntervalStateToStorage();
            renderIntervalPresetSelect();
            if (typeof showToast === 'function') showToast(_tInterval('interval_preset_saved', 'Preset saved'));
        }

        function deleteIntervalPreset() {
            if (!intervalSelectedPresetId) return;
            intervalPresets = intervalPresets.filter(p => p.id !== intervalSelectedPresetId);
            intervalSelectedPresetId = '';
            _saveIntervalPresetsToStorage();
            _saveIntervalStateToStorage();
            renderIntervalPresetSelect();
            if (typeof showToast === 'function') showToast(_tInterval('interval_preset_deleted', 'Preset deleted'));
        }

        function _getIntervalSoundOptionGroups() {
            const defaultOpt = {
                value: '',
                label: _tInterval('interval_step_sound_default', 'Default sound')
            };
            const groups = [
                {
                    label: _tInterval('interval_sound_group_builtin', 'Built-in'),
                    items: [
                        { value: 'preset:beep', label: _tInterval('interval_step_sound_beep', 'Classic Beeps') },
                        { value: 'preset:gavel', label: _tInterval('interval_step_sound_gavel', 'Gavel') },
                        { value: 'preset:chime', label: _tInterval('interval_step_sound_chime', 'Chime') },
                        { value: 'preset:bell', label: _tInterval('interval_step_sound_bell', 'Bell') }
                    ]
                }
            ];

            if (Array.isArray(availableSoundFiles) && availableSoundFiles.length > 0) {
                const rootFiles = [];
                const folderGroups = new Map();

                availableSoundFiles.forEach(file => {
                    const rel = String(file || '').replace(/^sounds\//i, '');
                    if (!rel) return;
                    const slashIdx = rel.lastIndexOf('/');
                    if (slashIdx === -1) {
                        const cleanName = rel.replace(/\.[^.]+$/, '');
                        if (cleanName) rootFiles.push({ value: 'file:' + file, label: cleanName });
                    } else {
                        const folder = rel.slice(0, slashIdx);
                        const fileName = rel.slice(slashIdx + 1);
                        const cleanName = fileName.replace(/\.[^.]+$/, '');
                        if (cleanName) {
                            if (!folderGroups.has(folder)) folderGroups.set(folder, []);
                            folderGroups.get(folder).push({ value: 'file:' + file, label: cleanName });
                        }
                    }
                });

                if (rootFiles.length > 0) {
                    rootFiles.sort((a, b) => a.label.localeCompare(b.label));
                    groups.push({
                        label: _tInterval('interval_sound_group_root', 'General / Root'),
                        items: rootFiles
                    });
                }

                const sortedFolders = Array.from(folderGroups.keys()).sort((a, b) => a.localeCompare(b));
                sortedFolders.forEach(folder => {
                    const items = folderGroups.get(folder).sort((a, b) => a.label.localeCompare(b.label));
                    groups.push({
                        label: folder,
                        items
                    });
                });
            }
            return { defaultOpt, groups };
        }

        function renderIntervalStepsList() {
            const listEl = document.getElementById('interval-steps-list');
            if (!listEl) return;
            listEl.innerHTML = '';
            const labelPh = _tInterval('interval_step_label_placeholder', 'Step label (optional)');
            const beepsTitle = _tInterval('interval_step_beeps_title', 'Beeps for this step (blank = default, 0 = silent)');
            const modeNoneLabel = _tInterval('interval_step_mode_none', 'No mode');
            const modeTitle = _tInterval('interval_step_mode_title', 'Working mode for this phase');
            const soundTitle = _tInterval('interval_step_sound_title', 'Timer end sound for this phase');
            const upTitle = _tInterval('interval_move_up_title', 'Move up');
            const downTitle = _tInterval('interval_move_down_title', 'Move down');
            const rmTitle = _tInterval('interval_remove_step_title', 'Remove step');
            const isRunning = timerMode === 'interval' && (timerInterval || timerPaused);
            const soundData = _getIntervalSoundOptionGroups();
            const modesList = Array.isArray(classModes) ? classModes : [];

            intervalSteps.forEach((step, idx) => {
                const row = document.createElement('div');
                row.className = 'interval-step-row' + (isRunning && idx === intervalCurrentStepIdx ? ' active-step' : '');

                const mainLine = document.createElement('div');
                mainLine.className = 'interval-step-main';

                const numBadge = document.createElement('span');
                numBadge.className = 'interval-step-num';
                numBadge.textContent = String(idx + 1);
                mainLine.appendChild(numBadge);

                const labelInput = document.createElement('input');
                labelInput.type = 'text';
                labelInput.className = 'interval-step-label-input';
                labelInput.placeholder = labelPh;
                labelInput.value = step.label || '';
                labelInput.oninput = () => updateIntervalStepField(idx, 'label', labelInput.value);
                mainLine.appendChild(labelInput);

                const timeWrap = document.createElement('div');
                timeWrap.className = 'interval-step-time-wrap';

                const minInput = document.createElement('input');
                minInput.type = 'number';
                minInput.className = 'interval-step-num-input';
                minInput.min = '0';
                minInput.max = '999';
                minInput.value = step.minutes;
                minInput.onchange = () => updateIntervalStepField(idx, 'minutes', minInput.value);
                minInput.oninput = () => updateIntervalStepField(idx, 'minutes', minInput.value);
                timeWrap.appendChild(minInput);

                const mSep = document.createElement('span');
                mSep.className = 'timer-popup-sep';
                mSep.textContent = 'm';
                timeWrap.appendChild(mSep);

                const secInput = document.createElement('input');
                secInput.type = 'number';
                secInput.className = 'interval-step-num-input';
                secInput.min = '0';
                secInput.max = '59';
                secInput.value = step.seconds;
                secInput.onchange = () => updateIntervalStepField(idx, 'seconds', secInput.value);
                secInput.oninput = () => updateIntervalStepField(idx, 'seconds', secInput.value);
                timeWrap.appendChild(secInput);

                const sSep = document.createElement('span');
                sSep.className = 'timer-popup-sep';
                sSep.textContent = 's';
                timeWrap.appendChild(sSep);
                mainLine.appendChild(timeWrap);

                const actions = document.createElement('div');
                actions.className = 'interval-step-actions';

                const upBtn = document.createElement('button');
                upBtn.type = 'button';
                upBtn.className = 'interval-mini-btn';
                upBtn.title = upTitle;
                upBtn.disabled = idx === 0;
                upBtn.innerHTML = '<img src="../assets/icons/arrow-up.svg" class="btn-icon" alt="" />';
                upBtn.onclick = () => moveIntervalStep(idx, -1);
                actions.appendChild(upBtn);

                const downBtn = document.createElement('button');
                downBtn.type = 'button';
                downBtn.className = 'interval-mini-btn';
                downBtn.title = downTitle;
                downBtn.disabled = idx === intervalSteps.length - 1;
                downBtn.innerHTML = '<img src="../assets/icons/arrow-down.svg" class="btn-icon" alt="" />';
                downBtn.onclick = () => moveIntervalStep(idx, 1);
                actions.appendChild(downBtn);

                const rmBtn = document.createElement('button');
                rmBtn.type = 'button';
                rmBtn.className = 'interval-mini-btn danger';
                rmBtn.title = rmTitle;
                rmBtn.disabled = intervalSteps.length <= 1;
                rmBtn.innerHTML = '<img src="../assets/icons/close.svg" class="btn-icon" alt="" />';
                rmBtn.onclick = () => removeIntervalStep(idx);
                actions.appendChild(rmBtn);

                mainLine.appendChild(actions);
                row.appendChild(mainLine);

                const extrasLine = document.createElement('div');
                extrasLine.className = 'interval-step-extras';

                const modeWrap = document.createElement('div');
                modeWrap.className = 'interval-step-field-wrap';
                modeWrap.title = modeTitle;
                const modeImg = document.createElement('img');
                modeImg.src = '../assets/icons/theater.svg';
                modeImg.className = 'btn-icon interval-step-field-icon';
                modeImg.alt = '';
                modeWrap.appendChild(modeImg);

                const modeSelect = document.createElement('select');
                modeSelect.className = 'interval-step-select';
                modeSelect.setAttribute('aria-label', modeTitle);
                const noneOpt = document.createElement('option');
                noneOpt.value = '';
                noneOpt.textContent = modeNoneLabel;
                modeSelect.appendChild(noneOpt);
                let hasModeMatch = !step.modeId;
                modesList.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.name || (m.text && m.text.title) || m.id;
                    if (step.modeId === m.id) hasModeMatch = true;
                    modeSelect.appendChild(opt);
                });
                if (!hasModeMatch && step.modeId) {
                    const fallbackOpt = document.createElement('option');
                    fallbackOpt.value = step.modeId;
                    fallbackOpt.textContent = step.modeId;
                    modeSelect.appendChild(fallbackOpt);
                }
                modeSelect.value = step.modeId || '';
                modeSelect.onchange = () => updateIntervalStepField(idx, 'modeId', modeSelect.value);
                modeWrap.appendChild(modeSelect);
                extrasLine.appendChild(modeWrap);

                const soundWrap = document.createElement('div');
                soundWrap.className = 'interval-step-field-wrap';
                soundWrap.title = soundTitle;
                const soundImg = document.createElement('img');
                soundImg.src = '../assets/icons/music.svg';
                soundImg.className = 'btn-icon interval-step-field-icon';
                soundImg.alt = '';
                soundWrap.appendChild(soundImg);

                const soundSelect = document.createElement('select');
                soundSelect.className = 'interval-step-select';
                soundSelect.setAttribute('aria-label', soundTitle);
                const defSoundOpt = document.createElement('option');
                defSoundOpt.value = soundData.defaultOpt.value;
                defSoundOpt.textContent = soundData.defaultOpt.label;
                soundSelect.appendChild(defSoundOpt);

                let hasSoundMatch = !step.sound;
                soundData.groups.forEach(grp => {
                    const optGroup = document.createElement('optgroup');
                    optGroup.label = grp.label;
                    grp.items.forEach(so => {
                        const opt = document.createElement('option');
                        opt.value = so.value;
                        opt.textContent = so.label;
                        if (step.sound === so.value) hasSoundMatch = true;
                        optGroup.appendChild(opt);
                    });
                    soundSelect.appendChild(optGroup);
                });
                if (!hasSoundMatch && step.sound) {
                    const fallbackSoundOpt = document.createElement('option');
                    fallbackSoundOpt.value = step.sound;
                    fallbackSoundOpt.textContent = step.sound.replace(/^(preset:|file:)/, '');
                    soundSelect.appendChild(fallbackSoundOpt);
                }
                soundSelect.value = step.sound || '';
                soundSelect.onchange = () => updateIntervalStepField(idx, 'sound', soundSelect.value);
                soundWrap.appendChild(soundSelect);
                extrasLine.appendChild(soundWrap);

                const beepsWrap = document.createElement('div');
                beepsWrap.className = 'interval-step-beeps-wrap';
                beepsWrap.title = beepsTitle;
                const bellImg = document.createElement('img');
                bellImg.src = '../assets/icons/bell.svg';
                bellImg.className = 'btn-icon';
                bellImg.alt = '';
                bellImg.style.width = '11px';
                bellImg.style.height = '11px';
                bellImg.style.margin = '0';
                beepsWrap.appendChild(bellImg);

                const beepsInput = document.createElement('input');
                beepsInput.type = 'number';
                beepsInput.className = 'interval-step-beeps-input';
                beepsInput.min = '0';
                beepsInput.max = '20';
                beepsInput.placeholder = '-';
                beepsInput.value = (step.beeps === null || step.beeps === undefined) ? '' : String(step.beeps);
                beepsInput.onchange = () => updateIntervalStepField(idx, 'beeps', beepsInput.value);
                beepsWrap.appendChild(beepsInput);
                extrasLine.appendChild(beepsWrap);

                row.appendChild(extrasLine);
                listEl.appendChild(row);
            });
        }

        function addIntervalStep() {
            intervalSteps.push({ label: '', minutes: 3, seconds: 0, beeps: null, modeId: '', sound: '' });
            intervalSelectedPresetId = '';
            renderIntervalPresetSelect();
            renderIntervalStepsList();
            updateIntervalSummary();
            _saveIntervalStateToStorage(true);
        }

        function removeIntervalStep(idx) {
            if (intervalSteps.length <= 1) return;
            intervalSteps.splice(idx, 1);
            intervalSelectedPresetId = '';
            renderIntervalPresetSelect();
            renderIntervalStepsList();
            updateIntervalSummary();
            _saveIntervalStateToStorage(true);
        }

        function moveIntervalStep(idx, dir) {
            const target = idx + dir;
            if (target < 0 || target >= intervalSteps.length) return;
            const tmp = intervalSteps[idx];
            intervalSteps[idx] = intervalSteps[target];
            intervalSteps[target] = tmp;
            intervalSelectedPresetId = '';
            renderIntervalPresetSelect();
            renderIntervalStepsList();
            _saveIntervalStateToStorage(true);
        }

        function updateIntervalStepField(idx, field, value) {
            const step = intervalSteps[idx];
            if (!step) return;
            if (field === 'label') {
                step.label = String(value || '');
            } else if (field === 'minutes') {
                step.minutes = Math.max(0, Math.min(999, parseInt(value, 10) || 0));
            } else if (field === 'seconds') {
                step.seconds = Math.max(0, Math.min(59, parseInt(value, 10) || 0));
            } else if (field === 'beeps') {
                const trimmed = String(value ?? '').trim();
                step.beeps = trimmed === '' ? null : Math.max(0, Math.min(20, parseInt(trimmed, 10) || 0));
            } else if (field === 'modeId') {
                step.modeId = String(value || '');
            } else if (field === 'sound') {
                step.sound = String(value || '');
            }
            intervalSelectedPresetId = '';
            const delBtn = document.getElementById('interval-preset-delete-btn');
            if (delBtn) delBtn.style.display = 'none';
            const sel = document.getElementById('interval-preset-select');
            if (sel) sel.value = '';
            updateIntervalSummary();
            _saveIntervalStateToStorage(field === 'modeId' || field === 'sound');
        }

        function toggleIntervalInfinite() {
            intervalInfinite = !intervalInfinite;
            const infBtn = document.getElementById('interval-infinite-btn');
            if (infBtn) infBtn.classList.toggle('active', intervalInfinite);
            const cycInput = document.getElementById('interval-cycles-input');
            if (cycInput) cycInput.disabled = intervalInfinite;
            updateIntervalSummary();
            _saveIntervalStateToStorage();
        }

        function updateIntervalCycles(val) {
            intervalCycles = Math.max(1, Math.min(99, parseInt(val, 10) || 1));
            updateIntervalSummary();
            _saveIntervalStateToStorage();
        }

        function updateIntervalSummary() {
            const el = document.getElementById('interval-total-summary');
            if (!el) return;
            const cycleSec = intervalSteps.reduce((acc, st) => acc + (st.minutes * 60 + st.seconds), 0);
            const totalLbl = _tInterval('interval_total_label', 'Total');
            if (intervalInfinite) {
                el.textContent = `${totalLbl}: ${_formatStepDuration(cycleSec)} ${_tInterval('interval_per_cycle', '/ cycle')}`;
            } else {
                const totalSec = cycleSec * intervalCycles;
                const cycPart = intervalCycles > 1 ? ` (${_formatStepDuration(cycleSec)} x ${intervalCycles})` : '';
                el.textContent = `${totalLbl}: ${_formatStepDuration(totalSec)}${cycPart}`;
            }
        }

        function _getIntervalDisplayMeta() {
            if ((!timerInterval && !timerPaused) || !intervalActiveSteps.length) {
                return null;
            }
            const cur = intervalActiveSteps[intervalCurrentStepIdx];
            if (!cur) return null;
            const stepWord = _tInterval('interval_step_badge', 'Step');
            const cycleWord = _tInterval('interval_cycle_badge', 'Cycle');
            const infWord = _tInterval('interval_infinite', 'Infinite');
            const stepPart = `${stepWord} ${intervalCurrentStepIdx + 1}/${intervalActiveSteps.length}`;
            const labelPart = cur.label ? ` · ${cur.label}` : '';
            const cyclePart = intervalInfinite
                ? ` · ${cycleWord} ${intervalCurrentCycle} (${infWord})`
                : (intervalCycles > 1 ? ` · ${cycleWord} ${intervalCurrentCycle}/${intervalCycles}` : '');
            const stepText = stepPart + labelPart + cyclePart;

            let nextStep = null;
            if (intervalCurrentStepIdx + 1 < intervalActiveSteps.length) {
                nextStep = intervalActiveSteps[intervalCurrentStepIdx + 1];
            } else if (intervalInfinite || intervalCurrentCycle < intervalCycles) {
                nextStep = intervalActiveSteps[0];
            }
            let nextText = '';
            if (nextStep) {
                const nextWord = _tInterval('interval_next_label', 'Next:');
                const dur = _formatStepDuration(nextStep.durationSec);
                nextText = nextStep.label ? `${nextWord} ${nextStep.label} (${dur})` : `${nextWord} ${dur}`;
            }
            return { stepText, nextText };
        }

        function _applyIntervalBadges(stepText, nextText) {
            const show = !!stepText;
            const targets = [
                ['timer-active-interval-info', 'timer-active-interval-step', 'timer-active-interval-next'],
                ['timer-overlay-interval-info', 'timer-overlay-interval-step', 'timer-overlay-interval-next'],
                ['mode-overlay-interval-info', 'mode-overlay-interval-step', 'mode-overlay-interval-next']
            ];
            targets.forEach(([wrapId, stepId, nextId]) => {
                const wrap = document.getElementById(wrapId);
                const stepEl = document.getElementById(stepId);
                const nextEl = document.getElementById(nextId);
                if (!wrap) return;
                if (stepEl) stepEl.textContent = stepText || '';
                if (nextEl) {
                    nextEl.textContent = nextText || '';
                    nextEl.style.display = nextText ? '' : 'none';
                }
                wrap.style.display = show ? 'inline-flex' : 'none';
            });
        }

        function _startIntervalStep(stepIdx, cycleNum) {
            const step = intervalActiveSteps[stepIdx];
            if (!step) return;
            intervalCurrentStepIdx = stepIdx;
            intervalCurrentCycle = cycleNum;
            const totalMs = step.durationSec * 1000;
            timerTotalMs = totalMs;
            timerEndTime = Date.now() + totalMs;
            timerPaused = false;
            timerPausedRemaining = 0;

            const bar = document.getElementById('timer-overlay-progress-bar');
            if (bar) { bar.style.width = '100%'; bar.className = ''; }
            const mBar = document.getElementById('mode-overlay-progress-bar');
            if (mBar) { mBar.style.width = '100%'; mBar.className = ''; }
            const mProg = document.getElementById('mode-overlay-progress');
            if (mProg) mProg.style.display = '';
            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) modeTimer.style.display = '';

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimerDisplay, 500);

            const display = document.getElementById('timer-active-display');
            document.getElementById('timer-active-area').style.display = 'flex';
            if (display) {
                display.style.opacity = '';
                display.className = 'running';
            }

            if (document.getElementById('interval-inputs-section')?.style.display !== 'none') {
                renderIntervalStepsList();
            }
            if (!PRESENTATION_MODE && step.modeId && typeof activateMode === 'function') {
                const matchedMode = (Array.isArray(classModes) ? classModes : []).find(
                    m => m.id === step.modeId || (m.name && m.name.toLowerCase() === step.modeId.toLowerCase())
                );
                if (matchedMode) {
                    activateMode(matchedMode.id);
                }
            }
            updateTimerDisplay();
        }

        function startIntervalSequence() {
            if (!intervalBuilderInitialized) initIntervalBuilder();
            const valid = intervalSteps
                .map(st => ({
                    label: (st.label || '').trim(),
                    durationSec: Math.max(0, (parseInt(st.minutes, 10) || 0) * 60 + (parseInt(st.seconds, 10) || 0)),
                    beeps: st.beeps,
                    modeId: typeof st.modeId === 'string' ? st.modeId : '',
                    sound: typeof st.sound === 'string' ? st.sound : ''
                }))
                .filter(st => st.durationSec > 0);
            if (!valid.length) {
                if (typeof showToast === 'function') showToast(_tInterval('interval_invalid_error', 'Add at least one step with a duration greater than 0'), true);
                return false;
            }
            intervalActiveSteps = valid;
            _startIntervalStep(0, 1);

            const objEl = document.getElementById('timer-overlay-objective');
            const objText = currentObjectives.trim();
            if (objEl) { objEl.textContent = objText; objEl.className = objText ? 'has-content' : ''; }

            document.getElementById('popup-add30s-btn').style.display = 'block';
            document.getElementById('popup-sub30s-btn').style.display = 'block';
            document.getElementById('popup-pause-btn').style.display = 'block';
            const popupSkip = document.getElementById('popup-skip-step-btn');
            if (popupSkip) popupSkip.style.display = 'inline-flex';
            const oa = document.getElementById('overlay-add30s-btn');
            if (oa) oa.style.display = '';
            const os = document.getElementById('overlay-sub30s-btn');
            if (os) os.style.display = '';
            const moa = document.getElementById('mode-overlay-add30s-btn');
            if (moa) moa.style.display = '';
            const mos = document.getElementById('mode-overlay-sub30s-btn');
            if (mos) mos.style.display = '';

            logHistory('timer-start', 'Timer', `Started interval sequence (${valid.length} steps, ${intervalInfinite ? 'infinite' : intervalCycles + ' cycles'})`, { timerMode: 'interval' });
            if (!PRESENTATION_MODE) _broadcastTimerTick();
            return true;
        }

        function intervalSkipStep() {
            if ((!timerInterval && !timerPaused) || !intervalActiveSteps.length) return;
            const nextIdx = intervalCurrentStepIdx + 1;
            if (nextIdx < intervalActiveSteps.length) {
                _startIntervalStep(nextIdx, intervalCurrentCycle);
            } else if (intervalInfinite || intervalCurrentCycle < intervalCycles) {
                _startIntervalStep(0, intervalCurrentCycle + 1);
            } else {
                popupStopTimer();
                return;
            }
            updateOverlayTransportControls();
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        function overlaySkipIntervalStep() {
            if (PRESENTATION_MODE) {
                if (_presChannel) {
                    try { _presChannel.postMessage({ type: 'timer-command', cmd: 'skip' }); } catch (_) {}
                }
                return;
            }
            intervalSkipStep();
        }

        function startCountdown() {
            // Check if timer is in fullscreen mode or mode overlay
            const overlayActive = document.getElementById('timer-overlay') && document.getElementById('timer-overlay').classList.contains('active');
            const modeOverlayEl = document.getElementById('mode-animation-overlay');
            const modeActive = modeOverlayEl && modeOverlayEl.classList && modeOverlayEl.classList.contains('active');

            let hoursInput, minutesInput, secondsInput, beepsInput;
            if (modeActive && document.getElementById('mode-overlay-timer-hours')) {
                hoursInput = document.getElementById('mode-overlay-timer-hours');
                minutesInput = document.getElementById('mode-overlay-timer-minutes');
                secondsInput = document.getElementById('mode-overlay-timer-seconds');
                beepsInput = document.getElementById('mode-overlay-timer-beeps');
            } else if (overlayActive && document.getElementById('overlay-timer-hours')) {
                hoursInput = document.getElementById('overlay-timer-hours');
                minutesInput = document.getElementById('overlay-timer-minutes');
                secondsInput = document.getElementById('overlay-timer-seconds');
                beepsInput = document.getElementById('overlay-timer-beeps');
            } else {
                hoursInput = document.getElementById('popup-timer-hours');
                minutesInput = document.getElementById('popup-timer-minutes');
                secondsInput = document.getElementById('popup-timer-seconds');
                beepsInput = document.getElementById('popup-timer-beeps');
            }

            const hours = parseInt(hoursInput ? hoursInput.value : 0, 10) || 0;
            const minutes = parseInt(minutesInput ? minutesInput.value : 0, 10) || 0;
            const seconds = Math.max(0, Math.min(59, parseInt(secondsInput ? secondsInput.value : 0, 10) || 0));
            const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

            if (totalMs <= 0) { showToast('Please set a valid time'); return; }

            const beepsVal = Math.max(1, parseInt(beepsInput ? beepsInput.value : 0, 10) || soundSettings?.timerEnd?.iterations || 1);

            // Sync legacy hidden inputs for fullscreen overlay
            if (document.getElementById('timer-minutes')) document.getElementById('timer-minutes').value = hours * 60 + minutes;
            if (document.getElementById('timer-seconds')) document.getElementById('timer-seconds').value = seconds;
            if (document.getElementById('timer-beeps')) document.getElementById('timer-beeps').value = beepsVal;
            if (document.getElementById('timer-freq')) document.getElementById('timer-freq').value = 1000;
            if (soundSettings && soundSettings.timerEnd) {
                soundSettings.timerEnd.iterations = beepsVal;
            }

            intervalActiveSteps = [];
            intervalCurrentStepIdx = 0;
            intervalCurrentCycle = 1;
            if (typeof _applyIntervalBadges === 'function') _applyIntervalBadges('', '');

            timerTotalMs = totalMs;
            timerEndTime = Date.now() + totalMs;
            const bar = document.getElementById('timer-overlay-progress-bar');
            if (bar) { bar.style.width = '100%'; bar.className = ''; }
            const mBar = document.getElementById('mode-overlay-progress-bar');
            if (mBar) { mBar.style.width = '100%'; mBar.className = ''; }
            const mProg = document.getElementById('mode-overlay-progress');
            if (mProg) { mProg.style.display = ''; }
            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) { modeTimer.style.display = ''; }

            const objEl = document.getElementById('timer-overlay-objective');
            const objText = currentObjectives.trim();
            if (objEl) { objEl.textContent = objText; objEl.className = objText ? 'has-content' : ''; }

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimerDisplay, 500);

            const display = document.getElementById('timer-active-display');
            document.getElementById('timer-active-area').style.display = 'flex';
            display.className = 'running';

            updateTimerDisplay();
            // Keep popup open — do NOT close it
            document.getElementById('popup-add30s-btn').style.display = 'block';
            document.getElementById('popup-sub30s-btn').style.display = 'block';
            document.getElementById('popup-pause-btn').style.display = 'block';
            // Show overlay +30s / -30s controls
            const oa = document.getElementById('overlay-add30s-btn');
            if (oa) oa.style.display = '';
            const os = document.getElementById('overlay-sub30s-btn');
            if (os) os.style.display = '';
            const moa = document.getElementById('mode-overlay-add30s-btn');
            if (moa) moa.style.display = '';
            const mos = document.getElementById('mode-overlay-sub30s-btn');
            if (mos) mos.style.display = '';
            logHistory('timer-start', 'Timer', `Started countdown (${hours > 0 ? hours + 'h ' : ''}${minutes}m${seconds > 0 ? ' ' + seconds + 's' : ''})`, { durationSec: Math.round(totalMs / 1000), timerMode: 'timer' });
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        function startCountdownWithSeconds(totalSec) {
            setTimerMode('timer');
            const sec = Math.max(1, parseInt(totalSec, 10) || 60);
            const totalMs = sec * 1000;
            const hours = Math.floor(sec / 3600);
            const minutes = Math.floor((sec % 3600) / 60);
            const remSeconds = sec % 60;

            const hInput = document.getElementById('popup-timer-hours');
            const mInput = document.getElementById('popup-timer-minutes');
            const sInput = document.getElementById('popup-timer-seconds');
            if (hInput) hInput.value = hours;
            if (mInput) mInput.value = minutes;
            if (sInput) sInput.value = remSeconds;
            syncPopupSettingsToOverlay();

            if (timerInterval) clearInterval(timerInterval);
            intervalActiveSteps = [];
            intervalCurrentStepIdx = 0;
            intervalCurrentCycle = 1;
            if (typeof _applyIntervalBadges === 'function') _applyIntervalBadges('', '');

            timerTotalMs = totalMs;
            timerEndTime = Date.now() + totalMs;
            timerPaused = false;
            timerPausedRemaining = 0;

            const prog = document.getElementById('timer-overlay-progress-bar');
            if (prog) { prog.style.width = '100%'; prog.className = ''; }
            const mBar = document.getElementById('mode-overlay-progress-bar');
            if (mBar) { mBar.style.width = '100%'; mBar.className = ''; }
            const mProg = document.getElementById('mode-overlay-progress');
            if (mProg) { mProg.style.display = ''; }
            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) { modeTimer.style.display = ''; }

            timerInterval = setInterval(updateTimerDisplay, 500);
            const display = document.getElementById('timer-active-display');
            if (document.getElementById('timer-active-area')) document.getElementById('timer-active-area').style.display = 'flex';
            if (display) display.className = 'running';

            updateTimerDisplay();

            const pStop = document.getElementById('popup-stop-btn');
            const pStart = document.getElementById('popup-start-btn');
            if (pStop) pStop.style.display = 'block';
            if (pStart) pStart.style.display = 'none';

            if (document.getElementById('popup-add30s-btn')) document.getElementById('popup-add30s-btn').style.display = 'block';
            if (document.getElementById('popup-sub30s-btn')) document.getElementById('popup-sub30s-btn').style.display = 'block';
            if (document.getElementById('popup-pause-btn')) document.getElementById('popup-pause-btn').style.display = 'block';

            updateOverlayTransportControls();
            logHistory('timer-start', 'Timer', `Started countdown (${Math.floor(sec / 60)}m ${sec % 60}s)`, { durationSec: sec, timerMode: 'timer' });
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }
        window.startCountdownWithSeconds = startCountdownWithSeconds;

        function stopCountdown() {
            const remSec = timerEndTime ? Math.max(0, Math.round((timerEndTime - Date.now()) / 1000)) : 0;
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            timerEndTime = null;
            timerTotalMs = 0;
            timerPaused = false;
            timerPausedRemaining = 0;
            intervalActiveSteps = [];
            intervalCurrentStepIdx = 0;
            intervalCurrentCycle = 1;
            if (typeof _applyIntervalBadges === 'function') _applyIntervalBadges('', '');
            if (document.getElementById('interval-inputs-section')?.style.display !== 'none' && typeof renderIntervalStepsList === 'function') {
                renderIntervalStepsList();
            }
            document.getElementById('timer-display').textContent = '--:--';
            document.getElementById('timer-overlay-display').textContent = '--:--';
            const bar = document.getElementById('timer-overlay-progress-bar');
            if (bar) { bar.style.width = '100%'; bar.className = ''; }
            const mBar = document.getElementById('mode-overlay-progress-bar');
            if (mBar) { mBar.style.width = '100%'; mBar.className = ''; }
            const mProg = document.getElementById('mode-overlay-progress');
            if (mProg) { mProg.style.display = 'none'; }
            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) { modeTimer.style.display = 'none'; }

            const display = document.getElementById('timer-active-display');
            document.getElementById('timer-active-area').style.display = 'none';
            display.style.opacity = '';
            display.className = '';
            display.textContent = '--:--';
            document.getElementById('popup-add30s-btn').style.display = 'none';
            document.getElementById('popup-sub30s-btn').style.display = 'none';
            document.getElementById('popup-pause-btn').style.display = 'none';
            const pauseLbl = (typeof t === 'function' && t('timer_pause')) ? t('timer_pause') : 'Pause';
            document.getElementById('popup-pause-btn').innerHTML = '<img src="../assets/icons/pause.svg" class="btn-icon" alt="" /> ' + pauseLbl;
            document.getElementById('popup-pause-btn').classList.remove('paused');
            const oa = document.getElementById('overlay-add30s-btn');
            if (oa) oa.style.display = 'none';
            const os2 = document.getElementById('overlay-sub30s-btn');
            if (os2) os2.style.display = 'none';
            const moa2 = document.getElementById('mode-overlay-add30s-btn');
            if (moa2) moa2.style.display = 'none';
            const mos2 = document.getElementById('mode-overlay-sub30s-btn');
            if (mos2) mos2.style.display = 'none';
            updateOverlayTransportControls();
            logHistory('timer-stop', 'Timer', `Stopped countdown (${remSec}s remaining)`, { remainingSec: remSec });
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        function timerAdd30s() {
            if (!timerEndTime && !timerPaused) return; // only works while countdown is running or paused
            if (timerPaused) {
                timerPausedRemaining += 30000;
                timerTotalMs += 30000;
                timerEndTime = Date.now() + timerPausedRemaining;
                updateTimerDisplay();
                timerEndTime = Date.now() + timerPausedRemaining;
            } else {
                timerEndTime += 30000;
                timerTotalMs += 30000;
                updateTimerDisplay();
            }
            // Flash the +30s button as feedback
            const btn = document.getElementById('popup-add30s-btn');
            if (btn) {
                btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> +30s';
                setTimeout(() => { btn.textContent = '+30s'; }, 800);
            }
            const overlayBtn = document.getElementById('overlay-add30s-btn');
            if (overlayBtn) {
                overlayBtn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> +30s';
                setTimeout(() => { overlayBtn.textContent = '+30s'; }, 800);
            }
        }

        function timerSubtract30s() {
            if (!timerEndTime && !timerPaused) return; // only works while countdown is running or paused
            const minRemaining = 5000; // don't go below 5s remaining
            if (timerPaused) {
                timerPausedRemaining = Math.max(timerPausedRemaining - 30000, minRemaining);
                timerTotalMs = Math.max(timerTotalMs - 30000, minRemaining);
                timerEndTime = Date.now() + timerPausedRemaining;
                updateTimerDisplay();
            } else {
                timerEndTime = Math.max(timerEndTime - 30000, Date.now() + minRemaining);
                timerTotalMs = Math.max(timerTotalMs - 30000, minRemaining);
                updateTimerDisplay();
            }
            // Flash the -30s button as feedback
            const btn = document.getElementById('popup-sub30s-btn');
            if (btn) {
                btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> -30s';
                setTimeout(() => { btn.textContent = '-30s'; }, 800);
            }
            const overlayBtn = document.getElementById('overlay-sub30s-btn');
            if (overlayBtn) {
                overlayBtn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> -30s';
                setTimeout(() => { overlayBtn.textContent = '-30s'; }, 800);
            }
        }

        // Mode overlay add30s wrapper (with flash feedback on that button)
        function modeOverlayAdd30s() {
            timerAdd30s();
            const btn = document.getElementById('mode-overlay-add30s-btn');
            if (btn) {
                btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> +30s';
                setTimeout(() => { btn.textContent = '+30s'; }, 800);
            }
        }

        // Mode overlay subtract30s wrapper (with flash feedback on that button)
        function modeOverlaySubtract30s() {
            timerSubtract30s();
            const btn = document.getElementById('mode-overlay-sub30s-btn');
            if (btn) {
                btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon" alt="" /> -30s';
                setTimeout(() => { btn.textContent = '-30s'; }, 800);
            }
        }

        // Pause/resume state
        let timerPaused = false;
        let timerPausedRemaining = 0;

        function timerTogglePause() {
            if (!timerEndTime && !timerPaused) return; // nothing running

            const pauseBtn = document.getElementById('popup-pause-btn');

            if (!timerPaused) {
                // PAUSE: save remaining, clear interval
                timerPausedRemaining = timerEndTime - Date.now();
                clearInterval(timerInterval);
                timerInterval = null;
                timerPaused = true;

                if (pauseBtn) {
                    const resLbl = (typeof t === 'function' && t('timer_resume')) ? t('timer_resume') : 'Resume';
                    pauseBtn.innerHTML = '<img src="../assets/icons/play.svg" class="btn-icon" alt="" /> ' + resLbl;
                    pauseBtn.classList.add('paused');
                }

                // Show paused indicator on active display
                const display = document.getElementById('timer-active-display');
                if (display) display.style.opacity = '0.5';

            } else {
                // RESUME: recalculate end time from remaining
                timerEndTime = Date.now() + timerPausedRemaining;
                timerPausedRemaining = 0;
                timerPaused = false;
                timerInterval = setInterval(updateTimerDisplay, 500);
                updateTimerDisplay();

                if (pauseBtn) {
                    const pauseLbl = (typeof t === 'function' && t('timer_pause')) ? t('timer_pause') : 'Pause';
                    pauseBtn.innerHTML = '<img src="../assets/icons/pause.svg" class="btn-icon" alt="" /> ' + pauseLbl;
                    pauseBtn.classList.remove('paused');
                }

                const display = document.getElementById('timer-active-display');
                if (display) display.style.opacity = '';
            }
            updateOverlayTransportControls();
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        // Name size control & persistence
        let _saveNameSizeTimeout = null;
        function _debounceSaveNameSize(immediate = false) {
            if (PRESENTATION_MODE) return;
            try { localStorage.setItem('cms-student-name-size', String(studentNameSizeRem)); } catch (_) { }
            if (_saveNameSizeTimeout) clearTimeout(_saveNameSizeTimeout);
            const doSave = () => {
                _saveNameSizeTimeout = null;
                if (typeof persistSettingsToUserFile === 'function') {
                    persistSettingsToUserFile().catch(err => console.warn('persistSettingsToUserFile (name size) failed:', err));
                }
            };
            if (immediate) {
                doSave();
            } else {
                _saveNameSizeTimeout = setTimeout(doSave, 500);
            }
        }

        let _savePresNameSizeTimeout = null;
        function _debounceSavePresNameSize(immediate = false) {
            if (PRESENTATION_MODE) return;
            try { localStorage.setItem('cms-pres-name-size', String(presNameSizeRem)); } catch (_) { }
            if (_savePresNameSizeTimeout) clearTimeout(_savePresNameSizeTimeout);
            const doSave = () => {
                _savePresNameSizeTimeout = null;
                if (typeof persistSettingsToUserFile === 'function') {
                    persistSettingsToUserFile().catch(err => console.warn('persistSettingsToUserFile (pres name size) failed:', err));
                }
            };
            if (immediate) {
                doSave();
            } else {
                _savePresNameSizeTimeout = setTimeout(doSave, 500);
            }
        }

        function changeNameSize(dir) {
            studentNameSizeRem = Math.min(NAME_SIZE_MAX, Math.max(NAME_SIZE_MIN, +(studentNameSizeRem + dir * NAME_SIZE_STEP).toFixed(2)));
            applyNameSize();
            if (!PRESENTATION_MODE) _broadcastPresentationState();
            _debounceSaveNameSize();
        }

        function resetNameSize() {
            studentNameSizeRem = NAME_SIZE_DEFAULT;
            applyNameSize();
            if (!PRESENTATION_MODE) _broadcastPresentationState();
            _debounceSaveNameSize(true);
        }

        function applyNameSize() {
            document.querySelectorAll('.student-name').forEach(el => {
                el.style.fontSize = studentNameSizeRem + 'rem';
            });
            // Also scale role tags proportionally
            const roleMultiplier = 0.9; // roles slightly smaller than names
            document.querySelectorAll('.student-role-tag').forEach(el => {
                el.style.fontSize = (studentNameSizeRem * roleMultiplier).toFixed(2) + 'rem';
            });
            // Persist via CSS variables for future renders
            document.documentElement.style.setProperty('--student-name-size', studentNameSizeRem + 'rem');
            document.documentElement.style.setProperty('--student-role-size', (studentNameSizeRem * roleMultiplier).toFixed(2) + 'rem');
            const ind = document.getElementById('rsp-board-size-indicator');
            if (ind) ind.textContent = studentNameSizeRem.toFixed(2) + 'rem';
        }

        function applyPresNameSize() {
            document.documentElement.style.setProperty('--pres-student-name-size', presNameSizeRem + 'rem');
            const roleMultiplier = 0.9;
            document.documentElement.style.setProperty('--pres-student-role-size', (presNameSizeRem * roleMultiplier).toFixed(2) + 'rem');
            const badgeMultiplier = 0.8 / 0.9; // badges default is 0.8rem, names default is 0.9rem
            document.documentElement.style.setProperty('--pres-badge-size', (presNameSizeRem * badgeMultiplier).toFixed(2) + 'rem');
            const ind = document.getElementById('rsp-pres-size-indicator');
            if (ind) ind.textContent = presNameSizeRem.toFixed(2) + 'rem';
            if (!PRESENTATION_MODE) _broadcastPresentationState();
        }

        function changePresentationNameSize(dir) {
            presNameSizeRem = Math.min(NAME_SIZE_MAX, Math.max(NAME_SIZE_MIN, +(presNameSizeRem + dir * NAME_SIZE_STEP).toFixed(2)));
            applyPresNameSize();
            _debounceSavePresNameSize();
        }

        function resetPresentationNameSize() {
            presNameSizeRem = NAME_SIZE_DEFAULT;
            applyPresNameSize();
            _debounceSavePresNameSize(true);
        }

        // ---- Stopwatch ----

        function startStopwatch() {
            if (stopwatchInterval) { clearInterval(stopwatchInterval); }
            if (!stopwatchPaused) stopwatchElapsedMs = 0;
            stopwatchStart = Date.now() - stopwatchElapsedMs;
            stopwatchInterval = setInterval(updateStopwatchDisplay, 500);
            stopwatchPaused = false;

            const display = document.getElementById('timer-active-display');
            document.getElementById('timer-active-area').style.display = 'flex';
            display.className = 'stopwatch-mode';

            updateStopwatchDisplay();
            // Keep popup open — do NOT close it
            updateOverlayTransportControls();
            logHistory('timer-start', 'Stopwatch', 'Started stopwatch', { timerMode: 'stopwatch' });
        }

        function toggleStopwatchPause() {
            if (!stopwatchInterval && !stopwatchPaused) return;

            if (stopwatchInterval) {
                stopwatchElapsedMs = Date.now() - stopwatchStart;
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
                stopwatchPaused = true;

                const display = document.getElementById('timer-active-display');
                if (display) display.style.opacity = '0.5';
                if (!PRESENTATION_MODE) _broadcastTimerTick();
            } else if (stopwatchPaused) {
                stopwatchStart = Date.now() - stopwatchElapsedMs;
                stopwatchInterval = setInterval(updateStopwatchDisplay, 500);
                stopwatchPaused = false;
                updateStopwatchDisplay();

                const display = document.getElementById('timer-active-display');
                if (display) display.style.opacity = '';
            }

            updateOverlayTransportControls();
        }

        function stopStopwatch() {
            const elapsedSec = stopwatchStart ? Math.max(0, Math.round((Date.now() - stopwatchStart) / 1000)) : (stopwatchElapsedMs ? Math.round(stopwatchElapsedMs / 1000) : 0);
            if (stopwatchInterval) { clearInterval(stopwatchInterval); stopwatchInterval = null; }
            stopwatchStart = null;
            stopwatchElapsedMs = 0;
            stopwatchPaused = false;

            const display = document.getElementById('timer-active-display');
            document.getElementById('timer-active-area').style.display = 'none';
            display.className = '';
            display.textContent = '00:00';

            document.getElementById('timer-overlay-display').textContent = '00:00';
            updateOverlayTransportControls();
            logHistory('timer-stop', 'Stopwatch', `Stopped stopwatch (${elapsedSec}s elapsed)`, { elapsedSec });
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        function updateStopwatchDisplay() {
            if (!stopwatchStart && !stopwatchPaused) return;
            const elapsed = Date.now() - stopwatchStart;
            const totalSec = Math.floor(elapsed / 1000);
            const hours = Math.floor(totalSec / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;

            let timeStr;
            if (hours > 0) {
                timeStr = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            } else {
                timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }

            document.getElementById('timer-active-display').textContent = timeStr;
            document.getElementById('timer-overlay-display').textContent = timeStr;

            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) { modeTimer.textContent = timeStr; }
            if (typeof isModeMinimised !== 'undefined' && isModeMinimised && typeof updateModeMinimisedPill === 'function') {
                updateModeMinimisedPill();
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        function testBeep() {
            return playConfiguredSound('gavelAlarm', { repeatCount: 1, spacingMs: 220 });
        }

        function beep(duration = 600) {
            return playTimerBeepBuiltin(Math.max(0.08, duration / 1000));
        }

        function playBeeps(count, frequency) {
            return playConfiguredSound('timerEnd', { repeatCount: count, spacingMs: frequency });
        }

        function _playIntervalStepSound(step, count, spacingMs) {
            const soundSpec = (step && typeof step.sound === 'string') ? step.sound.trim() : '';
            if (!soundSpec) {
                return playBeeps(count, spacingMs);
            }
            interruptAmbientNoiseForAlarm();
            const cfg = soundSettings?.timerEnd || DEFAULT_SOUND_SETTINGS.timerEnd;
            const volumeScale = Math.min(1, Math.max(0, (typeof cfg.volume === 'number' ? cfg.volume : 100) / 100));
            if (soundSpec.startsWith('preset:')) {
                const preset = soundSpec.slice(7);
                _soundVolumeScale = volumeScale;
                return playBuiltinSound('timerEnd', preset, { repeatCount: count, spacingMs });
            }
            if (soundSpec.startsWith('file:')) {
                const filePath = soundSpec.slice(5);
                return playSoundFileClip(filePath, count, spacingMs, volumeScale);
            }
            return playBeeps(count, spacingMs);
        }

        function updateTimerDisplay() {
            if (!timerEndTime) return;

            const now = Date.now();
            const remaining = timerEndTime - now;

            if (remaining <= 0) {
                const defaultBeepsInput = document.getElementById('timer-beeps') || document.getElementById('popup-timer-beeps');
                const defaultBeeps = Math.max(1, parseInt(defaultBeepsInput ? defaultBeepsInput.value : 0, 10) || soundSettings?.timerEnd?.iterations || 1);
                const freqInput = document.getElementById('timer-freq');
                const freq = parseInt(freqInput ? freqInput.value : 0, 10) || 1000;

                if (intervalActiveSteps.length > 0) {
                    const finishedStep = intervalActiveSteps[intervalCurrentStepIdx];
                    const stepBeeps = (finishedStep && finishedStep.beeps !== null && finishedStep.beeps !== undefined)
                        ? finishedStep.beeps
                        : defaultBeeps;
                    if (stepBeeps > 0) _playIntervalStepSound(finishedStep, stepBeeps, freq);

                    const nextIdx = intervalCurrentStepIdx + 1;
                    if (nextIdx < intervalActiveSteps.length) {
                        _startIntervalStep(nextIdx, intervalCurrentCycle);
                        return;
                    } else if (intervalInfinite || intervalCurrentCycle < intervalCycles) {
                        _startIntervalStep(0, intervalCurrentCycle + 1);
                        return;
                    }
                    // Entire sequence finished: fall through to final stop
                    intervalActiveSteps = [];
                    intervalCurrentStepIdx = 0;
                    intervalCurrentCycle = 1;
                    if (typeof _applyIntervalBadges === 'function') _applyIntervalBadges('', '');
                    if (document.getElementById('interval-inputs-section')?.style.display !== 'none' && typeof renderIntervalStepsList === 'function') {
                        renderIntervalStepsList();
                    }
                } else {
                    playBeeps(defaultBeeps, freq);
                }

                stopWhiteNoise();
                document.getElementById('timer-display').textContent = '00:00';
                document.getElementById('timer-overlay-display').textContent = '00:00';
                document.getElementById('timer-display').style.color = '#555';
                const pBar = document.getElementById('timer-overlay-progress-bar');
                if (pBar) {
                    pBar.style.width = '0%';
                    pBar.className = 'finished';
                }
                const mBar = document.getElementById('mode-overlay-progress-bar');
                if (mBar) {
                    mBar.style.width = '0%';
                    mBar.className = 'finished';
                }

                const display = document.getElementById('timer-active-display');
                display.textContent = '00:00';
                display.className = 'warning';

                // Sync mode overlay timer
                const modeTimerEnd = document.getElementById('mode-overlay-timer');
                if (modeTimerEnd) { modeTimerEnd.textContent = '00:00'; modeTimerEnd.classList.add('warning'); modeTimerEnd.style.background = '#c0392b'; }
                if (typeof isModeMinimised !== 'undefined' && isModeMinimised && typeof updateModeMinimisedPill === 'function') {
                    updateModeMinimisedPill();
                }
                clearInterval(timerInterval);
                timerInterval = null;
                timerEndTime = null;
                if (!PRESENTATION_MODE && activeWorkingModeId && typeof closeMode === 'function') {
                    closeMode();
                }
                updateOverlayTransportControls();
                logHistory('timer-end', 'Timer', 'Countdown timer completed', { durationSec: Math.round(timerTotalMs / 1000) });

                // Reset popup buttons after a moment
                setTimeout(() => {
                    document.getElementById('popup-stop-btn').style.display = 'none';
                    document.getElementById('popup-start-btn').style.display = 'block';
                    document.getElementById('popup-pause-btn').style.display = 'none';
                    const pauseLbl = (typeof t === 'function' && t('timer_pause')) ? t('timer_pause') : 'Pause';
                    document.getElementById('popup-pause-btn').innerHTML = '<img src="../assets/icons/pause.svg" class="btn-icon" alt="" /> ' + pauseLbl;
                    document.getElementById('popup-pause-btn').classList.remove('paused');
                    document.getElementById('popup-add30s-btn').style.display = 'none';
                    const pSub = document.getElementById('popup-sub30s-btn');
                    if (pSub) pSub.style.display = 'none';
                    const oa = document.getElementById('overlay-add30s-btn');
                    if (oa) oa.style.display = 'none';
                    const os = document.getElementById('overlay-sub30s-btn');
                    if (os) os.style.display = 'none';
                    const moa3 = document.getElementById('mode-overlay-add30s-btn');
                    if (moa3) moa3.style.display = 'none';
                    const mos3 = document.getElementById('mode-overlay-sub30s-btn');
                    if (mos3) mos3.style.display = 'none';
                    updateOverlayTransportControls();
                }, 500);

                if (window.CmsLessonRunner && CmsLessonRunner.activePlan) {
                    try { CmsLessonRunner.onTimerFinished(); } catch (_) {}
                }
                if (!PRESENTATION_MODE) _broadcastTimerTick();
                return;
            }

            const totalSec = Math.floor(remaining / 1000);
            const hours = Math.floor(totalSec / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;

            let timeStr;
            if (hours > 0) {
                timeStr = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            } else {
                timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }

            document.getElementById('timer-display').textContent = timeStr;
            document.getElementById('timer-overlay-display').textContent = timeStr;
            document.getElementById('timer-display').style.color = '#333';

            const display = document.getElementById('timer-active-display');
            display.textContent = timeStr;
            display.className = remaining < 60000 ? 'warning' : 'running';

            if (typeof _getIntervalDisplayMeta === 'function' && typeof _applyIntervalBadges === 'function') {
                const meta = _getIntervalDisplayMeta();
                _applyIntervalBadges(meta ? meta.stepText : '', meta ? meta.nextText : '');
            }

            // Sync mode overlay timer if visible
            const modeTimer = document.getElementById('mode-overlay-timer');
            if (modeTimer) {
                modeTimer.textContent = timeStr;
                const isWarning = remaining < 60000;
                modeTimer.classList.toggle('warning', isWarning);
            }
            if (typeof isModeMinimised !== 'undefined' && isModeMinimised && typeof updateModeMinimisedPill === 'function') {
                updateModeMinimisedPill();
            }

            // Update progress bar and smooth status color
            if (timerTotalMs > 0) {
                const pct = remaining / timerTotalMs; // 1 = full, 0 = done
                const widthStyle = (pct * 100) + '%';
                let barClass = '';
                if (remaining < 60000 || pct < 0.2) {
                    barClass = 'finished';
                } else if (pct < 0.5) {
                    barClass = 'warning';
                }

                const progressBar = document.getElementById('timer-overlay-progress-bar');
                if (progressBar) {
                    progressBar.style.width = widthStyle;
                    progressBar.className = barClass;
                }

                const modeProgressBar = document.getElementById('mode-overlay-progress-bar');
                if (modeProgressBar) {
                    modeProgressBar.style.width = widthStyle;
                    modeProgressBar.className = barClass;
                }

                let bg;
                if (pct > 0.5) {
                    // green -> amber  (pct 1.0 -> 0.5)
                    const t = (1 - pct) * 2; // 0 -> 1
                    const r = Math.round(42 + t * (230 - 42));
                    const g = Math.round(157 + t * (126 - 157));
                    const b = Math.round(42 + t * (0 - 42));
                    bg = 'rgb(' + r + ',' + g + ',' + b + ')';
                } else {
                    // amber -> red  (pct 0.5 -> 0)
                    const t = (0.5 - pct) * 2; // 0 -> 1
                    const r = Math.round(230 + t * (192 - 230));
                    const g = Math.round(126 + t * (57 - 126));
                    const b = 0;
                    bg = 'rgb(' + r + ',' + g + ',' + b + ')';
                }
                // Apply color to mode overlay timer if active
                if (modeTimer) { modeTimer.style.background = bg; }
            }
            if (typeof updateUnifiedControlDock === 'function') updateUnifiedControlDock();
            if (!PRESENTATION_MODE) _broadcastTimerTick();
        }

        // Legacy timer event listeners - now handled by popup functions above
        document.getElementById('timer-start').addEventListener('click', () => {
            // Legacy: handled by popupStartTimer
        });

        document.getElementById('timer-stop').addEventListener('click', () => {
            // Legacy: handled by popupStopTimer
        });


        document.getElementById('timer-fullscreen').addEventListener('click', () => {
            openTimerFullscreen();
        });

        document.getElementById('timer-overlay-close').addEventListener('click', () => {
            closeTimerFullscreen();
        });

        document.getElementById('timer-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'timer-overlay') {
                closeTimerFullscreen();
            }
        });


        // Drumroll button
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Re-register warm-up now that audioCtx exists, so it gets resumed too
        ['pointerdown', 'pointermove', 'keydown'].forEach(e => document.addEventListener(e, _warmUpAudio, { once: false }));

        function playHybridHit(time, volume) {
            // 1. GENERATE NOISE SOURCE
            const bufferSize = audioCtx.sampleRate * 0.2;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }

            const noiseSource = audioCtx.createBufferSource();
            noiseSource.buffer = buffer;

            // 2. THE "THUMP" LAYER (Low Frequencies)
            const lowFilter = audioCtx.createBiquadFilter();
            lowFilter.type = "lowpass";
            lowFilter.frequency.setValueAtTime(150, time); // Deep bass focus

            // 3. THE "SNAP" LAYER (Mid-High Frequencies)
            const snareFilter = audioCtx.createBiquadFilter();
            snareFilter.type = "bandpass";
            snareFilter.frequency.setValueAtTime(1200, time); // The rattle focus
            snareFilter.Q.setValueAtTime(1, time);

            // 4. MIXING & ENVELOPE
            const masterGain = audioCtx.createGain();
            masterGain.gain.setValueAtTime(volume, time);
            masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

            // Routing: Source splits to both filters, then merges at the Gain
            noiseSource.connect(lowFilter);
            noiseSource.connect(snareFilter);

            lowFilter.connect(masterGain);
            snareFilter.connect(masterGain);

            masterGain.connect(audioCtx.destination);

            noiseSource.start(time);
            noiseSource.stop(time + 0.2);
        }

        // Function specifically for the gavel effect with wooden impact and room echo
        function gavelHit(duration = 0.2, volumeScale = null, customNow = null) {
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = customNow !== null && Number.isFinite(customNow) ? customNow : audioContext.currentTime;
            const scale = volumeScale !== null ? Math.min(1, Math.max(0, Number(volumeScale))) : _soundVolumeScale;

            const strike = (time, volume, isEcho = false) => {
                // 1. THE IMPACT (Wooden Crack)
                const bufferSize = audioContext.sampleRate * 0.05;
                const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }

                const noise = audioContext.createBufferSource();
                noise.buffer = buffer;

                // Use Bandpass instead of Highpass to remove the "screechy" highs
                const noiseFilter = audioContext.createBiquadFilter();
                noiseFilter.type = "bandpass";
                noiseFilter.frequency.setValueAtTime(isEcho ? 600 : 800, time);
                noiseFilter.Q.setValueAtTime(1, time);

                const noiseGain = audioContext.createGain();
                noiseGain.gain.setValueAtTime(volume * 0.5, time);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

                // 2. THE BODY (Deep Thump)
                const thump = audioContext.createOscillator();
                const thumpGain = audioContext.createGain();
                thump.type = 'sine';
                // Lowered frequency (from 120Hz to 85Hz) for a much deeper "thud"
                thump.frequency.setValueAtTime(isEcho ? 70 : 85, time);

                thumpGain.gain.setValueAtTime(volume * 0.9, time);
                thumpGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

                // Connections
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(audioContext.destination);
                thump.connect(thumpGain);
                thumpGain.connect(audioContext.destination);

                noise.start(time);
                thump.start(time);
                thump.stop(time + duration);
            };

            // Main sequence: Hit -> Echo 1 -> Echo 2
            strike(now, 0.9 * scale);           // Powerful main hit
            strike(now + 0.05, 0.25 * scale, true); // Deep room reflection
            strike(now + 0.12, 0.1 * scale, true);  // Fading reflection
        }

        // Gavel test beep - legacy btn (hidden, also accessible via popup)
        document.getElementById('timer-test-beep').addEventListener('click', () => { testBeep(); });

        // Event Listener for the 3-hit sequence (Test Button) - second duplicate listener removed
        // ============================================================
        // BADGES SYSTEM
        // ============================================================

        let _openBadgePopupKey = null;

        function _badgePopupKey(targetId, targetType = 'individual') {
            return `${targetType}:${targetId}`;
        }

        function _badgePopupElementId(targetId, targetType = 'individual') {
            return `badge-popup-${targetType}-${targetId}`;
        }

        function _badgeAppliesToTarget(badge, targetType) {
            const scope = normalizeBadgeScope(badge?.scope);
            return scope === 'both' || scope === targetType;
        }

        function _badgeScopeForBadge(badge) {
            const def = (badgeDefinitions || []).find(entry => entry.icon === badge?.icon && entry.label === badge?.label);
            return normalizeBadgeScope(def?.scope || badge?.scope || 'individual');
        }

        function _closeBadgePopupByKey(key) {
            if (!key) return;
            const [targetType, targetId] = key.split(':');
            const popup = document.getElementById(_badgePopupElementId(targetId, targetType));
            if (popup) {
                popup.classList.remove('open');
                popup.style.top = '';
                popup.style.left = '';
            }
        }

        function _getTeamLabel(teamId) {
            const teamColor = teamColors[(teamId - 1) % teamColors.length];
            return (teamColor && teamColor.customName) ? teamColor.customName : `${teamId}. ${teamColor ? teamColor.name : 'Team'} Team`;
        }

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
                const noiseHtml = noisePanel ? noisePanel.outerHTML : '';
                let btnsHtml = classModes.map(mode => {
                    const svgSrc = getModeSvgIcon(mode);
                    const kbd = mode.shortcutKey ? `<kbd>${mode.shortcutKey}</kbd>` : '';
                    return `<button class="mode-overlay-shortcut-btn" onclick="activateMode('${mode.id}')"><img src="${svgSrc}" class="btn-icon" alt="" />${kbd}</button>`;
                }).join('');
                overlayContainer.innerHTML = btnsHtml + noiseHtml;
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
                    _broadcastAnimation('mode-activate', { mode: mode.id });
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

        function activateMode(modeId) {
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

            const mode = classModes.find(m => m.id === modeId || m.name.toLowerCase() === modeId.toLowerCase());

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

            if (!PRESENTATION_MODE && presSettings.modes) _broadcastAnimation('mode-activate', { mode: modeId });
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
                    if (currentMode.id === 'quiet' || currentMode.picture?.animation === 'shush') spawnShushParticles();
                    if (currentMode.id === 'conversation' || currentMode.picture?.animation === 'bubbles') animateSpeechBubbles();
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
            const color = mode?.text?.color || '#ffffff';
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
            const color = mode?.text?.color || '#ffffff';
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
            if (titleEl) titleEl.textContent = label + ': Class Management';
            document.title = label + ': Class Management';
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

