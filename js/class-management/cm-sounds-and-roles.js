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
            await applyRoleSetForClass(groupName);
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
        let roleSetSettings = { defaultSetId: 'default', classSets: {} };
        let activeRoleSetId = 'default';
        let modalEditingRoleSetId = 'default';

        function openManageDatabaseForRoles() {
            if (window.Desktop && typeof window.Desktop.openTool === 'function') {
                window.Desktop.openTool('manage-database.html', { query: { type: 'rolebanks' } });
            } else {
                window.open('manage-database.html?type=rolebanks', '_blank');
            }
        }

        async function populateRoleSetSelector(desiredSetId) {
            const select = document.getElementById('cm-role-set-select');
            const defAllCb = document.getElementById('cm-role-set-default-all-cb');
            if (!select) return;

            const sets = (typeof RoleSets !== 'undefined' && typeof RoleSets.listSets === 'function')
                ? await RoleSets.listSets()
                : [{ id: 'default', name: 'Default (config.js)', isDefault: true }];

            const curClassSet = selectedGroupName && roleSetSettings?.classSets
                ? (roleSetSettings.classSets[selectedGroupName] || roleSetSettings.defaultSetId || 'default')
                : (roleSetSettings?.defaultSetId || 'default');

            const targetSetId = desiredSetId || (select.value && sets.some(s => s.id === select.value) ? select.value : curClassSet);

            select.innerHTML = sets.map(s => {
                const label = s.isDefault ? (typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t('eb_set_default', 'Default (config.js)') : 'Default (config.js)') : s.name;
                return `<option value="${escapeRoleHtml(s.id)}" ${s.id === targetSetId ? 'selected' : ''}>${escapeRoleHtml(label)}</option>`;
            }).join('');

            modalEditingRoleSetId = select.value || targetSetId || 'default';
            if (defAllCb) {
                defAllCb.checked = (roleSetSettings?.defaultSetId === modalEditingRoleSetId);
            }
        }

        async function onRoleSetChange(newSetId) {
            modalEditingRoleSetId = newSetId || 'default';
            const defAllCb = document.getElementById('cm-role-set-default-all-cb');
            if (defAllCb) {
                defAllCb.checked = (roleSetSettings?.defaultSetId === modalEditingRoleSetId);
            }

            if (selectedGroupName) {
                if (!roleSetSettings.classSets) roleSetSettings.classSets = {};
                if (modalEditingRoleSetId === (roleSetSettings.defaultSetId || 'default')) {
                    delete roleSetSettings.classSets[selectedGroupName];
                } else {
                    roleSetSettings.classSets[selectedGroupName] = modalEditingRoleSetId;
                }
            }

            const loaded = (typeof RoleSets !== 'undefined' && typeof RoleSets.loadSet === 'function')
                ? await RoleSets.loadSet(modalEditingRoleSetId, getLoadedConfig()?.roleDefinitions)
                : null;

            if (loaded && Array.isArray(loaded)) {
                activeRoleSetId = modalEditingRoleSetId;
                roleDefinitions = loaded.map(r => ({ ...r }));
                rolesLibraryLoaded = true;
                syncRoleCollections();
                renderRolesLibraryInSettings();
                renderRolesLibrary();
            }
            persistSettingsToUserFile().catch(err => console.warn('onRoleSetChange save config:', err));
        }

        function toggleRoleSetDefaultAll(checked) {
            if (!roleSetSettings) roleSetSettings = { defaultSetId: 'default', classSets: {} };
            if (checked) {
                roleSetSettings.defaultSetId = modalEditingRoleSetId;
            } else if (roleSetSettings.defaultSetId === modalEditingRoleSetId) {
                roleSetSettings.defaultSetId = 'default';
            }
            persistSettingsToUserFile().catch(err => console.warn('toggleRoleSetDefaultAll save config:', err));
        }

        async function copyConfigRolesToDatabaseFile() {
            const promptMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                ? i18n.t('role_copy_to_db_prompt', 'Enter filename for the new custom role database (.js):')
                : 'Enter filename for the new custom role database (.js):';
            const rawName = (typeof showPrompt === 'function')
                ? await showPrompt(promptMsg, 'custom-roles.js')
                : prompt(promptMsg, 'custom-roles.js');
            if (!rawName || !String(rawName).trim()) return;

            let filename = String(rawName).trim().replace(/[\\/:*?"<>|]/g, '-');
            if (!/\.js$/i.test(filename)) filename += '.js';

            const loadedCfg = (typeof getLoadedConfig === 'function') ? getLoadedConfig() : null;
            const sourceRoles = (activeRoleSetId === 'default' && Array.isArray(roleDefinitions) && roleDefinitions.length > 0)
                ? roleDefinitions
                : (Array.isArray(loadedCfg?.roleDefinitions) && loadedCfg.roleDefinitions.length > 0
                    ? loadedCfg.roleDefinitions
                    : (typeof RoleSets !== 'undefined' && typeof RoleSets.getCachedDefs === 'function' && RoleSets.getCachedDefs('default')) || DEFAULT_ROLE_DEFINITIONS);

            const normalized = (typeof RoleSets !== 'undefined' && typeof RoleSets.normalizeDefs === 'function')
                ? RoleSets.normalizeDefs(sourceRoles)
                : normalizeRoleDefinitions(sourceRoles);

            const fileContent = `// Custom Role Database — Class Management Tools\nconst customRoleBank = ${JSON.stringify(normalized, null, 2)};\n`;

            if (typeof Desktop !== 'undefined' && typeof Desktop.saveText === 'function') {
                const res = await Desktop.saveText('customRoles', filename, fileContent);
                if (!res || !res.ok) {
                    const errMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                        ? i18n.t('role_copy_to_db_error', 'Failed to save custom role database.')
                        : 'Failed to save custom role database.';
                    if (typeof showToast === 'function') showToast(res?.error || errMsg, true);
                    return;
                }
            } else {
                const errMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                    ? i18n.t('role_copy_to_db_error', 'Failed to save custom role database.')
                    : 'Failed to save custom role database.';
                if (typeof showToast === 'function') showToast(errMsg, true);
                return;
            }

            if (typeof RoleSets !== 'undefined' && typeof RoleSets.clearCache === 'function') {
                RoleSets.clearCache();
            }
            try {
                if (typeof BroadcastChannel !== 'undefined') {
                    const ch = new BroadcastChannel('cmt-rolebanks');
                    ch.postMessage({ type: 'rolebanks-updated', filename: filename, timestamp: Date.now() });
                    ch.close();
                }
            } catch (_) {}

            await populateRoleSetSelector(filename.replace(/\.js$/i, ''));
            const okMsg = (typeof i18n !== 'undefined' && typeof i18n.t === 'function')
                ? i18n.t('role_copy_to_db_success', 'Roles copied to')
                : 'Roles copied to';
            if (typeof showToast === 'function') showToast(`${okMsg} ${filename}`);
        }

        async function applyRoleSetForClass(classId) {
            if (!classId) return;
            const targetSetId = (typeof RoleSets !== 'undefined' && typeof RoleSets.resolveForClass === 'function')
                ? RoleSets.resolveForClass(classId, roleSetSettings)
                : (roleSetSettings?.defaultSetId || 'default');

            const loadedDefs = (typeof RoleSets !== 'undefined' && typeof RoleSets.loadSet === 'function')
                ? await RoleSets.loadSet(targetSetId, getLoadedConfig()?.roleDefinitions)
                : null;

            if (loadedDefs && Array.isArray(loadedDefs)) {
                activeRoleSetId = targetSetId;
                modalEditingRoleSetId = targetSetId;
                roleDefinitions = loadedDefs.map(r => ({ ...r }));
                rolesLibraryLoaded = true;
                syncRoleCollections();
            } else if (targetSetId !== 'default') {
                const defaultDefs = (typeof RoleSets !== 'undefined' && typeof RoleSets.loadSet === 'function')
                    ? await RoleSets.loadSet('default', getLoadedConfig()?.roleDefinitions)
                    : DEFAULT_ROLE_DEFINITIONS;
                activeRoleSetId = 'default';
                modalEditingRoleSetId = 'default';
                roleDefinitions = (defaultDefs || DEFAULT_ROLE_DEFINITIONS).map(r => ({ ...r }));
                rolesLibraryLoaded = true;
                syncRoleCollections();
            }
        }

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
            const setId = (typeof activeRoleSetId !== 'undefined' && activeRoleSetId) ? activeRoleSetId : 'default';
            if (typeof RoleSets !== 'undefined' && typeof RoleSets.setCachedDefs === 'function') {
                RoleSets.setCachedDefs(setId, roleDefinitions);
            }
            if (setId === 'default') {
                if (typeof window !== 'undefined') {
                    window.ROLE_DEFINITIONS = roleDefinitions.map(entry => ({ ...entry }));
                }
                const result = await persistSettingsToUserFile();
                if (!result?.ok) {
                    console.warn('Failed to save config.js:', result?.error || 'Unable to save config.js');
                }
                return result;
            }
            // Custom role set: persist directly to user/custom-data/roles/<setId>.js
            if (typeof Desktop !== 'undefined' && typeof Desktop.saveText === 'function') {
                const normalized = (typeof RoleSets !== 'undefined' && typeof RoleSets.normalizeDefs === 'function')
                    ? RoleSets.normalizeDefs(roleDefinitions)
                    : roleDefinitions;
                const filename = /\.js$/i.test(setId) ? setId : `${setId}.js`;
                const fileContent = `// Custom Role Database — Class Management Tools\nconst customRoleBank = ${JSON.stringify(normalized, null, 2)};\n`;
                const res = await Desktop.saveText('customRoles', filename, fileContent);
                try {
                    if (typeof BroadcastChannel !== 'undefined') {
                        const ch = new BroadcastChannel('cmt-rolebanks');
                        ch.postMessage({ type: 'rolebanks-updated', filename, timestamp: Date.now() });
                        ch.close();
                    }
                } catch (_) { }
                return res;
            }
            return { ok: false, error: 'Desktop API unavailable' };
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
                    html += `<button type="button" title="Add Custom Color Flag" onclick="window.UnifiedColorPicker && window.UnifiedColorPicker.open({ anchor: this, value: '#ef4444', onChange: function(col){ toggleStudentManualFlag(${student.id}, col); } })" style="padding:4px 8px; border-radius:4px; background:#fff; color:#555; border:1.5px dashed #ccc; cursor:pointer; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                        <img src="../assets/icons/palette.svg" class="btn-icon" style="width:12px; height:12px;" alt="" />
                        <span>Custom...</span>
                    </button>`;

                    paletteEl.innerHTML = html;
                }
            }

            // Populate quick-add badges grid
            const badgesSection = document.getElementById('ctx-badges-section');
            const badgesGrid = document.getElementById('ctx-badges-grid');
            if (badgesSection && badgesGrid) {
                const badgesHtml = (!student || student.isAbsent || typeof buildContextMenuBadgeButtons !== 'function')
                    ? ''
                    : buildContextMenuBadgeButtons();
                if (badgesHtml) {
                    badgesGrid.innerHTML = badgesHtml;
                    badgesSection.style.display = 'block';
                } else {
                    badgesGrid.innerHTML = '';
                    badgesSection.style.display = 'none';
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

