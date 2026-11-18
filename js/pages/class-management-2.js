        // ═══════════════════════════════════════════════════════════════════════
        //  i18n — Language Switcher
        // ═══════════════════════════════════════════════════════════════════════
        let currentLang = (function () { try { var ov = localStorage.getItem('cmt-lang-class-management'); if (ov) return ov; var c = JSON.parse(localStorage.getItem('cmt-general-config') || '{}'); return c.language || 'en'; } catch (e) { return 'en'; } })();

        function t(key, vars) {
            const dict = I18N[currentLang] || I18N.en;
            let str = dict[key] !== undefined ? dict[key] : (I18N.en && I18N.en[key] !== undefined ? I18N.en[key] : undefined);
            if (str === undefined && typeof window.i18nT === 'function') {
                try {
                    const fallback = window.i18nT(key);
                    if (fallback && fallback !== key) str = fallback;
                } catch (e) { }
            }
            if (str === undefined) str = key;
            if (vars) {
                Object.keys(vars).forEach(k => { str = str.replace('{' + k + '}', vars[k]); });
            }
            return str;
        }

        window.setLang = function setLang(lang) {
            if (lang === null || lang === 'auto') {
                try { localStorage.removeItem('cmt-lang-class-management'); } catch (e) { }
                try { var c = JSON.parse(localStorage.getItem('cmt-general-config') || '{}'); currentLang = c.language || 'en'; } catch (e) { currentLang = 'en'; }
            } else {
                if (!I18N[lang]) return;
                currentLang = lang;
                try { localStorage.setItem('cmt-lang-class-management', lang); } catch (e) { }
            }
            _updateCMLangBtns();
            applyLang();
        };

        function _updateCMLangBtns() {
            const override = localStorage.getItem('cmt-lang-class-management');
            ['en', 'fr', 'de', 'it'].forEach(l => {
                const btn = document.getElementById('lang-btn-' + l);
                if (!btn) return;
                const isActive = l === currentLang && !!override;
                btn.style.background = isActive ? '#111' : '#f5f5f5';
                btn.style.color = isActive ? '#fff' : '#555';
            });
            const autoBtn = document.getElementById('lang-btn-auto');
            if (autoBtn) {
                autoBtn.style.background = !override ? '#111' : '#f5f5f5';
                autoBtn.style.color = !override ? '#fff' : '#555';
            }
            document.querySelectorAll('.hm-lang-btn').forEach(b => {
                const dl = b.getAttribute('data-lang');
                b.classList.toggle('active', dl === 'auto' ? !override : dl === override);
            });
        }

        function renderHelpModal() {
            const body = document.getElementById('help-modal-body');
            if (!body) return;
            const d = I18N[currentLang] || I18N.en;
            const kbd = (s) => `<span class="kbd">${s}</span>`;
            // Helper: replace <kbd>x</kbd> in translated strings with proper spans
            const kbdify = (s) => s.replace(/<kbd>(.*?)<\/kbd>/g, (_, t) => kbd(t));

            body.innerHTML = `
    <h2 style="color:#111;text-align:center;margin-bottom:24px;text-transform:uppercase;letter-spacing:2px;font-weight:900;">${d.help_title}</h2>

    <div class="help-section">
      <h3>${d.help_s_groups_title}</h3>
      <p>${kbdify(d.help_s_groups_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_picker_title}</h3>
      <p>${kbdify(d.help_s_picker_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_points_title}</h3>
      <p>${kbdify(d.help_s_points_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_badges_title}</h3>
      <p>${kbdify(d.help_s_badges_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_notes_title}</h3>
      <p>${kbdify(d.help_s_notes_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_timer_title}</h3>
      <p>${kbdify(d.help_s_timer_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_objectives_title}</h3>
      <p>${kbdify(d.help_s_objectives_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_mode_title}</h3>
      <p>${kbdify(d.help_s_mode_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_teams_title}</h3>
      <p>${kbdify(d.help_s_teams_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_roles_title}</h3>
      <p>${kbdify(d.help_s_roles_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_results_title}</h3>
      <p>${kbdify(d.help_s_results_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_history_title}</h3>
      <p>${kbdify(d.help_s_history_p)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_db_title}</h3>
      <p>${kbdify(d.help_s_db_p1)}</p>
      <p>${kbdify(d.help_s_db_p2)}</p>
      <p>${kbdify(d.help_s_db_p3)}</p>
    </div>
    <div class="help-section">
      <h3>${d.help_s_export_title}</h3>
      <p>${kbdify(d.help_s_export_p)}</p>
    </div>
    <div class="help-section" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">
      <h3>${d.help_s_shortcuts_title}</h3>
      ${typeof ShortcutsModal !== 'undefined' ? ShortcutsModal.renderTable([
                { section: d.help_sc_sec_general },
                { keys: ['Ctrl', 'Space'], desc: d.help_sc_random },
                { keys: ['Ctrl', 'Shift', 'K'], desc: d.help_sc_team },
                { keys: ['Ctrl', 'M'], desc: d.help_sc_mode },
                { section: d.help_sc_sec_modes },
                { keys: ['1', '2', '3'], desc: d.help_sc_switch },
                { section: d.help_sc_sec_noise },
                { keys: ['W'], desc: d.help_sc_noise_on },
                { keys: ['M'], desc: d.help_sc_noise_mute },
                { keys: ['[', ']'], desc: d.help_sc_noise_vol }
            ]) : '<p>' + kbdify(d.help_s_shortcuts_p) + '</p>'}
    </div>
  `;
        }


        function applyLang() {
            const dict = I18N[currentLang] || I18N.en;

            // Re-render help modal content
            renderHelpModal();

            // Apply data-i18n (textContent or HTML with icon)
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key] !== undefined) {
                    const txt = dict[key];
                    var iconPath = el.getAttribute('data-icon');
                    var img = el.querySelector('img');
                    if (img || iconPath) {
                        if (!iconPath && img) {
                            iconPath = img.getAttribute('src');
                            if (iconPath) el.setAttribute('data-icon', iconPath);
                        }
                        if (!img && iconPath) {
                            img = document.createElement('img');
                            img.src = iconPath;
                            img.className = 'btn-icon';
                            img.alt = '';
                        }
                        el.innerHTML = '';
                        if (img) el.appendChild(img);
                        el.appendChild(document.createTextNode(' ' + txt));
                    } else {
                        el.textContent = txt;
                    }
                }
            });

            // Apply data-i18n-title (title attribute)
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (dict[key] !== undefined) el.title = dict[key];
            });

            // Apply data-i18n-help (Light Neobrutalist hover helper card)
            document.querySelectorAll('[data-i18n-help]').forEach(el => {
                const key = el.getAttribute('data-i18n-help');
                if (dict[key] !== undefined) el.setAttribute('data-hover-help', dict[key]);
            });

            // Apply data-i18n-placeholder (placeholder attribute)
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (dict[key] !== undefined) el.placeholder = dict[key];
            });

            // Apply data-i18n-aria (aria-label attribute)
            document.querySelectorAll('[data-i18n-aria]').forEach(el => {
                const key = el.getAttribute('data-i18n-aria');
                if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
            });

            // Students label (special: contains child spans we must preserve)
            const h2 = document.querySelector('[data-i18n-prefix="students_label"]');
            if (h2) {
                const span = h2.querySelector('#display-name');
                const countSpan = h2.querySelector('#students-present-count');
                h2.textContent = dict['students_label'].replace(/\s*:\s*$/, '') + ' ';
                if (countSpan) h2.appendChild(countSpan);
                h2.appendChild(document.createTextNode(': '));
                if (span) h2.appendChild(span);
            }

            // Objectives placeholder (only when empty)
            const objText = document.getElementById('objectives-bar-text');
            if (objText && objText.classList.contains('empty')) {
                objText.textContent = dict['objectives_placeholder'];
            }

            // Dynamic utility buttons (re-render)
            if (typeof renderUtilityButtons === 'function') renderUtilityButtons();
            if (typeof syncRosterInlineToggleButtonStates === 'function') syncRosterInlineToggleButtonStates();

            // Roles modal (re-render if open)
            if (typeof renderRolesLibrary === 'function') {
                const rolesModal = document.getElementById('roles-modal');
                if (rolesModal && rolesModal.style.display === 'flex') renderRolesLibrary();
            }

            // History empty item
            document.querySelectorAll('.history-empty').forEach(el => {
                el.textContent = dict['history_empty'];
            });

            // DB session count label — only if it still says "Loading…" or a translation of it
            const dbLabel = document.getElementById('db-session-count-label');
            // Don't overwrite dynamic count; only reset if it matches a known loading string
            // (handled by the DB loading code which calls t() directly)

            // Timer popup open btn label (in menu bar) — kept icon-only with localized title
            const timerBtn = document.getElementById('timer-open-btn');
            if (timerBtn) {
                timerBtn.innerHTML = `<img src="../assets/icons/clock.svg" class="btn-icon" alt="" />`;
                timerBtn.title = dict['btn_timer'] || t('btn_timer') || 'Timer';
            }

            // Keep user-defined labels/files for action buttons after i18n text updates.
            if (typeof renderCustomActionButtons === 'function') renderCustomActionButtons();

            if (typeof _updateClassBtnLabel === 'function') _updateClassBtnLabel();
        }

        // Override renderUtilityButtons after DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const origRender = window.renderUtilityButtons;
            if (origRender) {
                window.renderUtilityButtons = function () {
                    const isElectron = !!((window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) || (window.electronApi && window.electronApi.isElectron));
                    const utilSection = document.getElementById('utility-section');
                    if (!utilSection) return;
                    if (isElectron) {
                        utilSection.style.display = 'none';
                        utilSection.innerHTML = '';
                        return;
                    }
                    utilSection.style.display = 'contents';
                    utilSection.innerHTML = `
        <button class="btn-copy" onclick="copyData()">${t('btn_copy_data')}</button>
        <button class="btn-copy" onclick="exportToCSV()">${t('btn_export_csv2')}</button>
        ${!currentTeamsActive
                            ? `<button class="btn-blue" onclick="createTeams()">${t('btn_create_teams')}</button>`
                            : `<button class="btn-blue" onclick="reshuffleTeams()">${t('btn_reshuffle_teams')}</button>
             <button class="btn-blue" onclick="clearTeams()">${t('btn_clear_teams')}</button>`
                        }
        <button class="btn-blue" onclick="openRolesModal()">${t('btn_roles')}</button>
        <button class="btn-red" onclick="manualResetFull()">${t('btn_reset_points')}</button>
        <button class="btn-red" onclick="resetStrikesOnly()">${t('btn_reset_strikes')}</button>
      `;
                };
            }

            // Preserve the full roles editor and only refresh translatable labels
            const origRoles = window.renderRolesLibrary;
            if (origRoles) {
                window.renderRolesLibrary = function () {
                    origRoles();

                    const rolesListContainer = document.getElementById('roles-list-container');
                    if (rolesListContainer) {
                        const paragraphs = rolesListContainer.querySelectorAll('p');
                        if (paragraphs[0]) paragraphs[0].textContent = t('roles_toggle_label');
                        if (paragraphs[1]) paragraphs[1].textContent = '2. Add a New Temporary Role';
                    }

                    const newRoleInput = document.getElementById('new-role-input');
                    if (newRoleInput) newRoleInput.placeholder = t('roles_placeholder');

                    const addRoleBtn = newRoleInput?.parentElement?.querySelector('button');
                    if (addRoleBtn) addRoleBtn.textContent = t('roles_add_btn');

                    const editorTitle = document.getElementById('roles-editor-title-text');
                    if (editorTitle) editorTitle.textContent = '3. Edit roles in this modal';

                    const toggleLabel = document.getElementById('roles-editor-toggle-label');
                    if (toggleLabel) toggleLabel.textContent = getRolesEditorToggleLabel();
                };
            }
        });

        // ── Download/Upload Data Functions ──
        async function downloadData() {
            if (!Desktop.isElectron()) {
                mdbToast('Download is only available in the desktop app.');
                return;
            }
            const btn = document.querySelector('button[onclick="downloadData()"]');
            if (!btn) return;
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '⏳ Downloading…';
            try {
                const result = await Desktop.backupZip();
                if (!result) return;
                if (result.canceled) {
                    btn.textContent = origText;
                    btn.disabled = false;
                    return;
                }
                if (result.ok) {
                    btn.textContent = 'Saved!';
                    setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2500);
                } else {
                    mdbToast('Download failed: ' + (result.error || 'Unknown error'));
                    btn.textContent = origText;
                    btn.disabled = false;
                }
            } catch (err) {
                mdbToast('Download error: ' + (err && err.message ? err.message : err));
                btn.textContent = origText;
                btn.disabled = false;
            }
        }

        async function uploadData() {
            if (!Desktop.isElectron()) {
                mdbToast('Upload is only available in the desktop app.');
                return;
            }
            const btn = document.querySelector('button[onclick="uploadData()"]');
            if (!btn) return;
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '⏳ Scanning…';
            try {
                const result = await Desktop.restoreZip();
                if (!result) return;
                if (result.canceled) {
                    btn.textContent = origText;
                    btn.disabled = false;
                    return;
                }
                if (!result.ok) {
                    mdbToast('Upload failed: ' + (result.error || 'Unknown error'));
                    btn.textContent = origText;
                    btn.disabled = false;
                    return;
                }

                // If there are conflicts, show the modal
                if (result.conflicts && result.conflicts.length > 0) {
                    showRestoreConflictModal(result.conflicts, result.zipPath);
                } else {
                    // No conflicts, apply restore directly
                    await applyRestoreChoices(result.zipPath, []);
                }

                btn.textContent = origText;
                btn.disabled = false;
            } catch (err) {
                mdbToast('Upload error: ' + (err && err.message ? err.message : err));
                btn.textContent = origText;
                btn.disabled = false;
            }
        }

        function showRestoreConflictModal(conflicts, zipPath) {
            const modal = document.createElement('div');
            modal.id = 'restore-conflict-overlay';
            modal.onclick = (e) => { if (e.target === modal) closeRestoreConflictModal(); };

            let conflictsHtml = '';
            for (const conflict of conflicts) {
                conflictsHtml += `
      <div class="conflict-item">
        <div class="conflict-path"><strong>${conflict.path}</strong></div>
        <div class="conflict-options">
          <label><input type="radio" name="choice-${conflict.id}" value="skip" checked> Skip</label>
          <label><input type="radio" name="choice-${conflict.id}" value="overwrite"> Overwrite</label>
          <label><input type="radio" name="choice-${conflict.id}" value="rename"> Rename (backup)</label>
        </div>
      </div>
    `;
            }

            modal.innerHTML = `
    <div id="restore-conflict-modal">
      <h3>
        <span>File Conflicts Detected</span>
        <button onclick="document.getElementById('restore-conflict-overlay').remove()"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
      </h3>
      <div id="restore-conflict-body">
        <p>Some files already exist. Choose what to do for each:</p>
        <div id="conflicts-list">
          ${conflictsHtml}
        </div>
      </div>
      <div id="restore-conflict-footer">
        <button class="action-btn btn-grey" onclick="document.getElementById('restore-conflict-overlay').remove()">Cancel</button>
                <button class="action-btn" id="restore-conflict-apply-btn">Restore</button>
      </div>
    </div>
  `;

            document.body.appendChild(modal);

            const applyBtn = modal.querySelector('#restore-conflict-apply-btn');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const selectedChoices = Array.from(
                        document.querySelectorAll('#conflicts-list input[type=radio]:checked')
                    ).map((r) => ({
                        id: r.name.replace('choice-', ''),
                        choice: r.value
                    }));
                    applyRestoreChoices(String(zipPath || ''), selectedChoices);
                });
            }
        }

        async function applyRestoreChoices(zipPath, choices) {
            const choiceMap = {};
            for (const c of choices) {
                choiceMap[c.id] = c.choice;
            }

            const btn = document.querySelector('.action-btn');
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '⏳ Restoring…';

            try {
                const result = await Desktop.applyRestoreChoices({ zipPath, choices: choiceMap });
                if (result && result.ok) {
                    mdbToast('Data restored successfully! ' + (result.restored || 0) + ' files restored.');
                    document.getElementById('restore-conflict-overlay')?.remove();
                    setTimeout(() => { location.reload(); }, 1500);
                } else {
                    mdbToast('Restore failed: ' + (result?.error || 'Unknown error'));
                    btn.textContent = origText;
                    btn.disabled = false;
                }
            } catch (err) {
                mdbToast('Restore error: ' + (err && err.message ? err.message : err));
                btn.textContent = origText;
                btn.disabled = false;
            }
        }

        // ── Toast notification ──
        function mdbToast(msg) {
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:11px 26px;border-radius:8px;font-size:0.95rem;font-weight:700;color:#fff;background:#111;box-shadow:0 4px 18px rgba(0,0,0,0.25);white-space:nowrap;';
            t.textContent = msg;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 2500);
        }

        // ── Patch all alert calls to use t() ──
        // We wrap the native functions and intercept known strings.
        (function () {
            const _alert = window.alert.bind(window);

            window.alert = function (msg) {
                const d = I18N[currentLang] || I18N.en;
                // Map known English strings to translation keys
                const map = {
                    'Please select a group first!': 'alert_select_group',
                    "Please select a group first.": 'alert_select_group',
                    'Please select a group first before saving.': 'alert_select_before_save',
                    'Select at least one role!': 'alert_select_role',
                    'Please select at least one role from the list!': 'alert_select_role2',
                    'Data copied to clipboard!': 'alert_data_copied',
                    'Everyone has been called!': 'alert_everyone_called',
                    'Please set a valid time': 'alert_valid_time',
                    'No groups found to save.': 'alert_no_groups',
                };
                if (map[msg] && d[map[msg]]) return mdbToast(d[map[msg]]);
                // Partial matches
                if (msg && msg.startsWith('Could not save to database: '))
                    return mdbToast(d['alert_save_error'] + msg.slice('Could not save to database: '.length));
                if (msg && (msg.startsWith('No saved sessions to export yet.') || msg.startsWith('No active-group sessions to export yet.')))
                    return mdbToast(d['alert_no_sessions_export']);
                if (msg && msg.startsWith('Import successful!')) {
                    const m = msg.match(/(\d+) session/);
                    return mdbToast(d['alert_import_ok'].replace('{n}', m ? m[1] : '?'));
                }
                if (msg && msg.startsWith('Import failed: ')) {
                    const e = msg.slice('Import failed: '.length).split('\n')[0];
                    return mdbToast(d['alert_import_fail'].replace('{e}', e));
                }
                return mdbToast(msg);
            };
        })();

        // ── Patch Time Machine dynamic strings ──
        document.addEventListener('DOMContentLoaded', () => {
            // Patch openTimeMachine / renderTimeMachine to use t() for empty state
            const origOpen = window.openTimeMachine;
            if (origOpen) {
                window.openTimeMachine = function () {
                    origOpen.apply(this, arguments);
                    // Re-patch empty container after render
                    setTimeout(() => {
                        const container = document.getElementById('tm-sessions-container');
                        if (container && container.querySelector) {
                            const empty = container.querySelector('.tm-empty');
                            if (empty) empty.innerHTML = t('tm_no_sessions').replace('\n', '<br>') + '<br>' + '' + t('db_save');
                        }
                    }, 50);
                };
            }

            // Patch exitTimeMachineView banner
            const origExit = window.exitTimeMachineView;
            if (origExit) {
                window.exitTimeMachineView = function () {
                    origExit.apply(this, arguments);
                };
            }

            // Patch loadTimeMachineSession for readonly badge
            const origLoad = window.loadTimeMachineSession;
            if (origLoad) {
                window.loadTimeMachineSession = function () {
                    origLoad.apply(this, arguments);
                    setTimeout(() => {
                        document.querySelectorAll('.tm-readonly-badge').forEach(el => {
                            el.textContent = t('tm_readonly_badge');
                        });
                        const lbl = document.getElementById('tm-viewing-label');
                        if (lbl) {
                            // Preserve the session date suffix
                            const current = lbl.textContent;
                            const prefix = current.split('…')[0].split(':')[0];
                            // Replace just the prefix
                            const suffix = lbl.innerHTML.replace(/^[^:]+:?\s*/, '');
                            lbl.textContent = t('tm_viewing') + suffix;
                        }
                    }, 100);
                };
            }

            // Patch db-session-count-label initial "Loading…"
            const dbLabel = document.getElementById('db-session-count-label');
            // It gets set by JS elsewhere; we don't interfere here.

            // Apply initial lang
            _updateCMLangBtns();
            applyLang();
        });
