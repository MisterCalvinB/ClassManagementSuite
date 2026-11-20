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
                sound: typeof st?.sound === 'string' ? st.sound : '',
                lessonPlanId: typeof st?.lessonPlanId === 'string' ? st.lessonPlanId : '',
                lessonPhaseIndex: Number.isInteger(st?.lessonPhaseIndex) ? st.lessonPhaseIndex : null
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

        function refreshIntervalPlanImportBtn() {
            const btn = document.getElementById('interval-import-plan-btn');
            if (!btn) return;
            const hasPlan = !!(window.CmsLessonRunner && window.CmsLessonRunner.activePlan && Array.isArray(window.CmsLessonRunner.activePlan.sections) && window.CmsLessonRunner.activePlan.sections.length > 0);
            btn.style.display = hasPlan ? 'inline-flex' : 'none';
        }
        window.refreshIntervalPlanImportBtn = refreshIntervalPlanImportBtn;

        function _mapInteractionTypeToModeId(interactionTypeId) {
            if (!interactionTypeId) return '';
            const modes = Array.isArray(classModes) ? classModes : [];
            const findMode = (candidates) => {
                for (const c of candidates) {
                    const hit = modes.find(m => m.id === c || (m.name && m.name.toLowerCase() === c));
                    if (hit) return hit.id;
                }
                return '';
            };
            if (interactionTypeId === 'individual') return findMode(['quiet']);
            if (interactionTypeId === 'pairs') return findMode(['conversation', 'talk']);
            if (interactionTypeId === 'small_groups') return findMode(['group']);
            return '';
        }

        function importLessonPlanToSequence(plan, autoStart = false) {
            const targetPlan = plan || (window.CmsLessonRunner && window.CmsLessonRunner.activePlan);
            if (!targetPlan || !Array.isArray(targetPlan.sections) || !targetPlan.sections.length) {
                if (typeof showToast === 'function') {
                    showToast(_tInterval('interval_import_plan_empty', 'No active lesson plan phases to import'), true);
                }
                return false;
            }
            const planId = String(targetPlan.id || '');
            const actTypes = (typeof LessonCreatorService !== 'undefined' && Array.isArray(LessonCreatorService.DEFAULT_ACTIVITY_TYPES))
                ? LessonCreatorService.DEFAULT_ACTIVITY_TYPES
                : [];
            const imported = targetPlan.sections.map((sec, idx) => {
                const durMinFloat = Math.max(0, Number(sec.duration) || 0);
                const wholeMin = Math.floor(durMinFloat);
                const remSec = Math.round((durMinFloat - wholeMin) * 60);
                const actDef = sec.activityTypeId ? actTypes.find(a => a.id === sec.activityTypeId) : null;
                const fallbackLabel = (actDef && (actDef.shortName || actDef.name)) || `Phase ${idx + 1}`;
                const label = (sec.title && String(sec.title).trim()) ? String(sec.title).trim() : fallbackLabel;
                return _normalizeIntervalStep({
                    label,
                    minutes: wholeMin + (remSec >= 60 ? 1 : 0),
                    seconds: remSec >= 60 ? 0 : remSec,
                    beeps: null,
                    modeId: _mapInteractionTypeToModeId(sec.interactionTypeId),
                    sound: '',
                    lessonPlanId: planId,
                    lessonPhaseIndex: idx
                });
            });

            intervalSteps = imported;
            intervalCycles = 1;
            intervalInfinite = false;
            intervalSelectedPresetId = '';
            intervalBuilderInitialized = true;

            setTimerMode('interval');
            const cycInput = document.getElementById('interval-cycles-input');
            if (cycInput) {
                cycInput.value = 1;
                cycInput.disabled = false;
            }
            const infBtn = document.getElementById('interval-infinite-btn');
            if (infBtn) infBtn.classList.remove('active');
            renderIntervalPresetSelect();
            renderIntervalStepsList();
            updateIntervalSummary();
            _saveIntervalStateToStorage(true);

            // Open the timer popup in control menu if not already visible
            const popup = document.getElementById('timer-popup');
            if (popup && !popup.classList.contains('active') && typeof toggleTimerPopup === 'function') {
                toggleTimerPopup(true);
            }

            if (typeof showToast === 'function') {
                const msg = _tInterval('clr_sequence_loaded', 'Loaded {count} lesson phases into Sequence Timer')
                    .replace('{count}', String(imported.length));
                showToast(msg);
            }
            if (autoStart) {
                startIntervalSequence();
            }
            return true;
        }
        window.importLessonPlanToSequence = importLessonPlanToSequence;

        function jumpIntervalToLessonPhase(phaseIdx) {
            if (PRESENTATION_MODE) return false;
            if ((!timerInterval && !timerPaused) || !intervalActiveSteps.length) return false;
            const activePlanId = (window.CmsLessonRunner && window.CmsLessonRunner.activePlan)
                ? String(window.CmsLessonRunner.activePlan.id || '')
                : '';
            const matchIdx = intervalActiveSteps.findIndex(st =>
                st.lessonPhaseIndex === phaseIdx && (!st.lessonPlanId || !activePlanId || st.lessonPlanId === activePlanId)
            );
            if (matchIdx === -1) return false;
            if (matchIdx !== intervalCurrentStepIdx) {
                _startIntervalStep(matchIdx, intervalCurrentCycle);
                updateOverlayTransportControls();
                _broadcastTimerTick();
            }
            return true;
        }
        window.jumpIntervalToLessonPhase = jumpIntervalToLessonPhase;

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
            refreshIntervalPlanImportBtn();
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
            if (!PRESENTATION_MODE && step.lessonPhaseIndex !== null && Number.isInteger(step.lessonPhaseIndex)
                && window.CmsLessonRunner && window.CmsLessonRunner.activePlan
                && (!step.lessonPlanId || String(window.CmsLessonRunner.activePlan.id || '') === String(step.lessonPlanId))) {
                const phases = window.CmsLessonRunner.activePlan.sections || [];
                if (step.lessonPhaseIndex >= 0 && step.lessonPhaseIndex < phases.length && window.CmsLessonRunner.activePhaseIndex !== step.lessonPhaseIndex) {
                    window.CmsLessonRunner.activePhaseIndex = step.lessonPhaseIndex;
                    if (typeof window.CmsLessonRunner.renderCurrentPhase === 'function') {
                        window.CmsLessonRunner.renderCurrentPhase({ skipTimerPreset: true });
                    }
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
                    sound: typeof st.sound === 'string' ? st.sound : '',
                    lessonPlanId: typeof st.lessonPlanId === 'string' ? st.lessonPlanId : '',
                    lessonPhaseIndex: Number.isInteger(st.lessonPhaseIndex) ? st.lessonPhaseIndex : null
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

