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

            const rawRoleSets = config?.roleSetSettings;
            roleSetSettings = {
                defaultSetId: String(rawRoleSets?.defaultSetId || 'default').trim() || 'default',
                classSets: (rawRoleSets?.classSets && typeof rawRoleSets.classSets === 'object') ? { ...rawRoleSets.classSets } : {}
            };
            if (typeof RoleSets !== 'undefined' && typeof RoleSets.setCachedDefs === 'function') {
                const cfgRoles = Array.isArray(config?.roleDefinitions) ? config.roleDefinitions : [];
                RoleSets.setCachedDefs('default', cfgRoles);
            }
            activeRoleSetId = 'default';
            modalEditingRoleSetId = 'default';

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
                } else {
                    const appSettings = (typeof window !== 'undefined' && window.CMT_APP_SETTINGS && typeof window.CMT_APP_SETTINGS === 'object')
                        ? window.CMT_APP_SETTINGS
                        : config?.launcherSettings;
                    if (typeof appSettings?.defaultNameDisplayMode === 'string' && ['full', 'first', 'last', 'custom'].includes(appSettings.defaultNameDisplayMode)) {
                        nameDisplayMode = appSettings.defaultNameDisplayMode;
                    }
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
                    if (copy.text && typeof copy.text === 'object') {
                        if (copy.text.title !== undefined) copy.title = copy.text.title;
                        if (copy.text.subtitle !== undefined) copy.subtitle = copy.text.subtitle;
                        if (copy.text.color !== undefined) copy.textColor = copy.text.color;
                        if (copy.text.size !== undefined) copy.textSize = copy.text.size;
                    }
                    if (copy.picture && typeof copy.picture === 'object') {
                        if (copy.picture.type !== undefined) copy.pictureType = copy.picture.type;
                        if (copy.picture.src !== undefined) copy.pictureSrc = copy.picture.src;
                        if (copy.picture.animation !== undefined) copy.pictureAnim = copy.picture.animation;
                        if (copy.picture.fit !== undefined) copy.pictureFit = copy.picture.fit;
                    }
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
            if (typeof window !== 'undefined' && window.CMT_CLASS_PLANS && typeof window.CMT_CLASS_PLANS === 'object') {
                classPlans = window.CMT_CLASS_PLANS;
            } else if (config?.classPlans && typeof config.classPlans === 'object') {
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
                roleSetSettings: {
                    defaultSetId: String(roleSetSettings?.defaultSetId || 'default').trim() || 'default',
                    classSets: { ...(roleSetSettings?.classSets || {}) }
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
                roleDefinitions: (function () {
                    const defaultDefs = (typeof RoleSets !== 'undefined' && typeof RoleSets.getCachedDefs === 'function')
                        ? RoleSets.getCachedDefs('default')
                        : null;
                    if (activeRoleSetId === 'default' && rolesLibraryLoaded && Array.isArray(roleDefinitions)) {
                        return roleDefinitions.map(entry => ({ ...entry }));
                    }
                    if (Array.isArray(defaultDefs)) {
                        return defaultDefs.map(entry => ({ ...entry }));
                    }
                    if (Array.isArray(loadedConfig.roleDefinitions) && loadedConfig.roleDefinitions.length) {
                        return loadedConfig.roleDefinitions.map(entry => ({ ...entry }));
                    }
                    return (typeof ROLE_DEFINITIONS !== 'undefined' && Array.isArray(ROLE_DEFINITIONS))
                        ? ROLE_DEFINITIONS.map(entry => ({ ...entry }))
                        : [];
                })(),
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
                shortcuts: (overrides && overrides.shortcuts !== undefined)
                    ? overrides.shortcuts
                    : (typeof getCmsCustomShortcutsMap === 'function' ? getCmsCustomShortcutsMap() : (loadedConfig.shortcuts || {})),
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
                    }) || (activeSem.noClassRanges || []).some(function (h) {
                        return h.date && (!Array.isArray(h.classIds) || !h.classIds.length) && todayStr >= h.date && todayStr <= (h.dateTo || h.date);
                    });
                    if (onHoliday) return;
                }

                // Find first class + slot that covers now
                var matchedId = null, matchedSlot = null;
                Object.keys(classes).filter(k => !k.startsWith('_')).find(function (cid) {
                    if (rawMeta[cid] && rawMeta[cid].archived) return false;
                    if (activeSem && (activeSem.noClassRanges || []).some(function (h) {
                        return h.date && Array.isArray(h.classIds) && h.classIds.indexOf(cid) !== -1 && todayStr >= h.date && todayStr <= (h.dateTo || h.date);
                    })) return false;
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
            if (window.Desktop && typeof window.Desktop.readJson === 'function') {
                try {
                    const appRes = await window.Desktop.readJson('user', 'app-settings.json');
                    if (appRes && appRes.ok && appRes.data && typeof appRes.data === 'object') {
                        window.CMT_APP_SETTINGS = appRes.data;
                    }
                } catch (_) { }
            }
            if (window.Desktop && typeof window.Desktop.readText === 'function') {
                try {
                    const plansRes = await window.Desktop.readText('classPlans', 'plans.js');
                    if (plansRes && plansRes.ok && plansRes.content) {
                        const m = plansRes.content.match(/var\s+SAVED_CLASS_PLANS\s*=\s*(\{[\s\S]*?\});/);
                        if (m) {
                            const parsedPlans = JSON.parse(m[1]);
                            if (parsedPlans && typeof parsedPlans === 'object') {
                                window.CMT_CLASS_PLANS = parsedPlans;
                            }
                        }
                    }
                } catch (_) { }
            }
            await loadConfigFromDisk();

            const appSettings = (typeof window !== 'undefined' && window.CMT_APP_SETTINGS && typeof window.CMT_APP_SETTINGS === 'object')
                ? window.CMT_APP_SETTINGS
                : getLoadedConfig()?.launcherSettings;
            let showDevFeatures = !!(appSettings?.showDevFeatures);
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

