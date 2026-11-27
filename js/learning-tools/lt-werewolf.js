    // =============================================
    // WEREWOLF MODERATOR
    // =============================================
    let wwSteps = [];
    let wwCurrentStep = -1;
    let wwAutoTimer = null;
    let wwKillSoundFiles = [];
    let wwKillAudio = null;
    let wwCurrentGroup = '';
    const WW_DEAD_STORAGE_KEY = 'werewolf_dead_students_v1';
    const WW_SOUND_STORAGE_KEY = 'werewolf_kill_sound_v1';
    const WW_TURN_SOUND_STORAGE_KEY = 'werewolf_turn_sounds_v1';
    const WW_AUTO_STORAGE_KEY = 'werewolf_auto_settings_v1';
    const WW_VOTE_TIMER_STORAGE_KEY = 'werewolf_vote_timer_v1';
    const WW_CUSTOM_REL_PATH = 'werewolf/werewolf-custom.js';
    const WW_ROLES_REL_PATH = 'werewolf/werewolves-roles.js';
    let wwActiveCustomRelPath = WW_CUSTOM_REL_PATH;
    let wwDeadByGroup = {};
    let wwRoles = [];
    let wwRoleCatalog = [];
    let wwRoleDragIndex = -1;
    let wwStepOrderDragIndex = -1;
    let wwBaseInstructionDragKey = '';
    let wwPickedPlayers = [];
    let wwStepOrder = [];
    const WW_BASE_STEP_TITLES = { sleep: 'Sleep', werewolf: 'Werewolves', seer: 'Seer', doctor: 'Doctor', wake: 'Wake Up', vote: 'Vote' };
    let wwBaseInstructions = {
      sleep: 'Now everybody goes to bed and sleep.',
      werewolf: 'Werewolves, wake up quietly and choose someone.',
      seer: 'Seer, wake up and check one player.',
      doctor: 'Doctor, wake up and protect one player.',
      wake: 'Everybody wake up. Discuss what happened last night.',
      vote: 'Now vote: who should be eliminated?'
    };
    let wwExtraSteps = [];
    let wwExtraStepNextId = 1;
    let wwTurnSoundsByStep = {};
    let wwTurnSoundChoiceEnabledByStep = {};
    let wwTurnSoundPromptTextByStep = {};
    let wwTurnKillStepEnabledByStep = {};
    let wwTurnAudio = null;
    let wwTurnSoundChoiceResolver = null;
    let wwShowRolesOnChips = false;
    let wwExpandedStepOptions = {};
    let wwVoteTimerState = {
      running: false,
      stepKey: '',
      endsAt: 0,
      tickId: null,
      timeoutId: null
    };

    function wwSetActiveTab(tabName) {
      const isSetup = tabName === 'setup';
      const playTab = document.getElementById('ww-tab-play');
      const setupTab = document.getElementById('ww-tab-setup');
      const playPanel = document.getElementById('ww-panel-play');
      const setupPanel = document.getElementById('ww-panel-setup');
      const fixedControls = document.getElementById('ww-fixed-controls');

      if (playTab) {
        playTab.classList.toggle('active', !isSetup);
        playTab.setAttribute('aria-selected', String(!isSetup));
      }
      if (setupTab) {
        setupTab.classList.toggle('active', isSetup);
        setupTab.setAttribute('aria-selected', String(isSetup));
      }
      if (playPanel) {
        playPanel.classList.toggle('hidden', isSetup);
        playPanel.classList.toggle('active', !isSetup);
      }
      if (setupPanel) {
        setupPanel.classList.toggle('hidden', !isSetup);
        setupPanel.classList.toggle('active', isSetup);
      }
      if (fixedControls) {
        fixedControls.classList.toggle('hidden', isSetup);
      }
    }

    function wwToggleRolesDrawer(forceOpen) {
      const drawer = document.getElementById('ww-roles-drawer');
      const btn = document.getElementById('ww-toggle-roles-drawer-btn');
      if (!drawer) return;
      const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : drawer.classList.contains('hidden');
      drawer.classList.toggle('hidden', !shouldOpen);
      if (btn) btn.setAttribute('aria-expanded', String(shouldOpen));
      if (shouldOpen) wwPopulateAllPlayers({ notifyIfMissing: false });
    }

    function wwToggleShowRoles() {
      const toggle = document.getElementById('ww-show-roles-toggle');
      wwShowRolesOnChips = !!(toggle && toggle.checked);
      wwRenderStudents();
    }

    function wwSetStatus(msg, isOk) {
      const el = document.getElementById('ww-save-status');
      if (!el) return;
      el.textContent = String(msg || '');
      el.style.color = isOk ? '#1f6a2d' : '#7a4d00';
      el.style.borderColor = isOk ? '#8ccf9a' : '#e0c08a';
      el.style.background = isOk ? '#e8f7ec' : '#fff4df';
    }

    function wwNormalizeRole(role) {
      const src = role && typeof role === 'object' ? role : {};
      return {
        name: String(src.name || '').trim(),
        instruction: String(src.instruction || '').trim(),
        alignment: wwNormalizeAlignment(src.alignment),
        count: Math.max(0, parseInt(src.count, 10) || 0)
      };
    }

    function wwNormalizeAlignment(value) {
      const raw = String(value || '').trim().toLowerCase();
      if (!raw) return '';
      if (raw === 'village' || raw === 'villager' || raw === 'good') return 'village';
      if (raw === 'werewolf' || raw === 'wolf' || raw === 'evil') return 'werewolf';
      if (raw === 'neutral') return 'neutral';
      return raw;
    }

    function wwGetAlignmentLabel(value) {
      const key = wwNormalizeAlignment(value);
      if (key === 'village') return 'Village';
      if (key === 'werewolf') return 'Werewolf';
      if (key === 'neutral') return 'Neutral';
      return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown';
    }

    function wwGetAlignmentClass(value) {
      const key = wwNormalizeAlignment(value);
      return key ? ('ww-align-' + key) : 'ww-align-unknown';
    }

    function wwGetRoleIdentity(role) {
      const normalized = wwNormalizeRole(role);
      return normalized.name.toLowerCase() + '|' + normalized.alignment;
    }

    function wwGetBaseRoleNames() {
      return ['Villager', 'Werewolf', 'Seer', 'Doctor'];
    }

    function wwGetAllRoleNames() {
      const out = new Set(wwGetBaseRoleNames());
      wwRoleCatalog.forEach(role => {
        const name = String(role && role.name || '').trim();
        if (name) out.add(name);
      });
      wwRoles.forEach(role => {
        const name = String(role && role.name || '').trim();
        if (name) out.add(name);
      });
      return Array.from(out);
    }

    function wwRenderRoleChips() {
      const root = document.getElementById('ww-role-chip-list');
      if (!root) return;
      root.innerHTML = '';

      const source = (Array.isArray(wwRoleCatalog) && wwRoleCatalog.length)
        ? wwRoleCatalog
        : wwRoles;

      if (!source.length) {
        root.innerHTML = '<p class="ww-student-empty">No roles available yet. Load external werewolf roles first.</p>';
        return;
      }

      source
        .map(wwNormalizeRole)
        .filter(role => role.name)
        .forEach(role => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'ww-role-chip ' + wwGetAlignmentClass(role.alignment);

          const chipName = document.createElement('span');
          chipName.textContent = role.name;
          const chipAlign = document.createElement('span');
          chipAlign.className = 'ww-align-badge ' + wwGetAlignmentClass(role.alignment);
          chipAlign.textContent = wwGetAlignmentLabel(role.alignment);
          chip.appendChild(chipName);
          chip.appendChild(chipAlign);

          const roleIdentity = wwGetRoleIdentity(role);
          const alreadyInserted = wwRoles.some(r => wwGetRoleIdentity(r) === roleIdentity);
          if (alreadyInserted) {
            chip.classList.add('active');
            chip.disabled = true;
          }

          chip.addEventListener('click', function () {
            wwInsertRoleFromChip(role);
          });
          root.appendChild(chip);
        });
    }

    function wwInsertRoleFromChip(roleInput) {
      const chosenRole = wwNormalizeRole(roleInput || {});
      const name = String(chosenRole.name || '').trim();
      if (!name) return;
      const roleIdentity = wwGetRoleIdentity(chosenRole);

      const existingIdx = wwRoles.findIndex(role => wwGetRoleIdentity(role) === roleIdentity);
      if (existingIdx >= 0) {
        const customSteps = wwGetCustomRoleSteps();
        const existingKey = customSteps[existingIdx] ? customSteps[existingIdx].key : '';
        if (existingKey) {
          const block = document.querySelector('#ww-fields-ordered [data-step-key="' + existingKey + '"]');
          if (block && typeof block.scrollIntoView === 'function') block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const fromCatalog = wwRoleCatalog.find(role => wwGetRoleIdentity(role) === roleIdentity)
        || wwRoleCatalog.find(role => String(role && role.name || '').trim() === name);
      wwRoles.push(wwNormalizeRole(fromCatalog || { name, instruction: '', count: 1 }));
      wwRenderRoles();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwRenderRoles() {
      wwRenderFieldsInOrder();
      wwRenderPickedPlayers();
      wwRenderStepOrderList();
      wwBroadcastPresentation();
    }

    function wwRenderFieldsInOrder() {
      const root = document.getElementById('ww-fields-ordered');
      if (!root) return;

      const raw = wwGetRawSteps();
      const byKey = new Map(raw.map(s => [s.key, s]));
      const availableSounds = wwGetAvailableTurnSounds();
      const soundMap = wwNormalizeTurnSoundMap(raw);
      const order = wwNormalizeStepOrder(raw);

      const customSteps = wwGetCustomRoleSteps();
      const roleByKey = new Map();
      customSteps.forEach((step, i) => roleByKey.set(step.key, { role: wwRoles[i], roleIdx: i }));

      let fieldsDragFrom = -1;
      root.innerHTML = '';

      order.forEach((key, idx) => {
        const step = byKey.get(key);
        if (!step) return;

        const isBaseKey = key in WW_BASE_STEP_TITLES;
        const isRoleKey = key.startsWith('role-');
        const isExtraKey = key.startsWith('extra-');

        const block = document.createElement('div');
        block.className = 'ww-instr-block';
        block.dataset.stepKey = key;
        block.draggable = true;
        block.addEventListener('dragstart', function (e) {
          fieldsDragFrom = idx;
          block.classList.add('dragging');
          if (e && e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); }
        });
        block.addEventListener('dragover', function (e) {
          if (fieldsDragFrom < 0 || fieldsDragFrom === idx) return;
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          block.classList.add('drop-target');
        });
        block.addEventListener('dragleave', function () { block.classList.remove('drop-target'); });
        block.addEventListener('drop', function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          block.classList.remove('drop-target');
          if (fieldsDragFrom >= 0 && fieldsDragFrom !== idx) wwMoveStepOrderToIndex(fieldsDragFrom, idx);
        });
        block.addEventListener('dragend', function () {
          fieldsDragFrom = -1;
          block.classList.remove('dragging');
          Array.from(root.querySelectorAll('.ww-instr-block.drop-target')).forEach(el => el.classList.remove('drop-target'));
        });

        // Head
        const head = document.createElement('div');
        head.className = 'ww-instr-head';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'ww-role-drag ww-instr-drag';
        dragHandle.title = 'Drag to reorder';
        dragHandle.innerHTML = '<img src="../assets/icons/grip.svg" class="btn-icon" alt="" />';
        head.appendChild(dragHandle);

        if (isBaseKey) {
          const lbl = document.createElement('label');
          lbl.className = 'ww-field-label';
          lbl.textContent = WW_BASE_STEP_TITLES[key];
          head.appendChild(lbl);
        } else if (isRoleKey) {
          const roleInfo = roleByKey.get(key);
          const role = roleInfo ? roleInfo.role : null;
          if (role) {
            const roleName = document.createElement('span');
            roleName.className = 'ww-role-name';
            roleName.textContent = String(role.name || '');
            const alignBadge = document.createElement('span');
            alignBadge.className = 'ww-align-badge ' + wwGetAlignmentClass(role.alignment);
            alignBadge.textContent = wwGetAlignmentLabel(role.alignment);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn btn-orange';
            removeBtn.textContent = 'Remove';
            removeBtn.style.marginLeft = 'auto';
            const ri = roleInfo.roleIdx;
            removeBtn.addEventListener('click', function () { wwRemoveRoleRow(ri); });
            head.appendChild(roleName);
            head.appendChild(alignBadge);
            head.appendChild(removeBtn);
          }
        } else if (isExtraKey) {
          const titleInput = document.createElement('input');
          titleInput.type = 'text';
          titleInput.className = 'ww-extra-title-input';
          titleInput.placeholder = 'Step name…';
          titleInput.value = step.title;
          titleInput.addEventListener('input', function () {
            const ei = wwExtraSteps.findIndex(s => s.key === key);
            if (ei >= 0) wwExtraSteps[ei].title = titleInput.value;
            wwBuildSteps();
            wwRenderStepOrderList();
          });
          const delBtn = document.createElement('button');
          delBtn.className = 'action-btn btn-orange';
          delBtn.innerHTML = '<img src="../assets/icons/close.svg" class="btn-icon" alt="" />';
          delBtn.title = 'Delete step';
          delBtn.style.marginLeft = 'auto';
          delBtn.addEventListener('click', function () { wwDeleteExtraStep(key); });
          head.appendChild(titleInput);
          head.appendChild(delBtn);
        }
        block.appendChild(head);

        // Textarea
        const textarea = document.createElement('textarea');
        textarea.className = isRoleKey ? 'ww-role-textarea' : 'ww-textarea';
        textarea.placeholder = isRoleKey ? 'Role instruction' : '';
        textarea.value = step.text;
        textarea.id = 'ww-msg-' + key;
        if (isBaseKey) {
          textarea.addEventListener('input', function () {
            wwBaseInstructions[key] = textarea.value;
            wwBuildSteps();
          });
        } else if (isRoleKey) {
          const roleInfo = roleByKey.get(key);
          if (roleInfo) {
            const ri = roleInfo.roleIdx;
            textarea.addEventListener('input', function () {
              if (wwRoles[ri]) wwRoles[ri].instruction = textarea.value;
              wwBuildSteps();
              wwBroadcastPresentation();
            });
          }
        } else if (isExtraKey) {
          textarea.addEventListener('input', function () {
            const ei = wwExtraSteps.findIndex(s => s.key === key);
            if (ei >= 0) wwExtraSteps[ei].text = textarea.value;
            wwBuildSteps();
          });
        }
        block.appendChild(textarea);

        // Controls: move + sound
        const controls = document.createElement('div');
        controls.className = 'ww-inline-controls ww-primary-controls';
        controls.style.marginTop = '6px';

        const upBtn = document.createElement('button');
        upBtn.className = 'action-btn btn-grey ww-icon-btn';
        upBtn.title = 'Move up';
        upBtn.innerHTML = '<img src="../assets/icons/arrow-up.svg" class="btn-icon" alt="Up" />';
        upBtn.disabled = idx === 0;
        upBtn.addEventListener('click', function () { wwMoveStepOrderItem(key, -1); });

        const downBtn = document.createElement('button');
        downBtn.className = 'action-btn btn-grey ww-icon-btn';
        downBtn.title = 'Move down';
        downBtn.innerHTML = '<img src="../assets/icons/arrow-down.svg" class="btn-icon" alt="Down" />';
        downBtn.disabled = idx === order.length - 1;
        downBtn.addEventListener('click', function () { wwMoveStepOrderItem(key, 1); });

        const soundSel = document.createElement('select');
        soundSel.className = 'ww-select ww-order-sound-select';
        soundSel.title = 'Sound for this turn';
        soundSel.id = 'ww-step-sound-' + key;
        soundSel.innerHTML = '<option value="">No sound</option>';
        availableSounds.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.value;
          opt.textContent = item.label;
          soundSel.appendChild(opt);
        });
        if (!availableSounds.length) {
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = 'No sound files found';
          soundSel.appendChild(empty);
        }
        const selectedSound = String(soundMap[key] || '');
        if (selectedSound && !availableSounds.some(item => item.value === selectedSound)) {
          const missing = document.createElement('option');
          missing.value = selectedSound;
          missing.textContent = selectedSound.replace(/^sounds\//, '') + ' (missing)';
          soundSel.appendChild(missing);
        }
        soundSel.value = selectedSound;
        soundSel.addEventListener('change', function () {
          wwSetTurnSoundForStep(key, soundSel.value || '');
        });

        const soundBtn = document.createElement('button');
        soundBtn.className = 'action-btn btn-orange ww-order-test-btn';
        soundBtn.title = 'Test turn sound';
        soundBtn.innerHTML = '<img src="../assets/icons/volume.svg" class="btn-icon" alt="Play" />';
        soundBtn.addEventListener('click', function () { wwPlayTurnSoundForKey(key); });

        const hasAdvancedOptions = wwIsTurnSoundChoiceEnabled(key) || wwIsTurnKillStepEnabled(key);
        const isOptionsOpen = !!wwExpandedStepOptions[key];
        const optionsBtn = document.createElement('button');
        optionsBtn.type = 'button';
        optionsBtn.className = 'action-btn btn-grey ww-step-options-btn' + (hasAdvancedOptions ? ' has-active' : '');
        optionsBtn.title = 'Step options';
        optionsBtn.innerHTML = '<img src="../assets/icons/settings.svg" class="btn-icon" alt="" /> Options';

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        controls.appendChild(soundSel);
        controls.appendChild(soundBtn);
        controls.appendChild(optionsBtn);
        block.appendChild(controls);

        const optionsPanel = document.createElement('div');
        optionsPanel.className = 'ww-step-options-panel' + (isOptionsOpen ? '' : ' hidden');

        optionsBtn.addEventListener('click', function () {
          const nextOpen = optionsPanel.classList.contains('hidden');
          wwExpandedStepOptions[key] = nextOpen;
          optionsPanel.classList.toggle('hidden', !nextOpen);
        });

        const choiceControls = document.createElement('div');
        choiceControls.className = 'ww-inline-controls ww-turn-choice-row';

        const askLabel = document.createElement('label');
        askLabel.className = 'ww-inline-label';
        askLabel.textContent = 'Ask popup before sound';

        const askCheck = document.createElement('input');
        askCheck.type = 'checkbox';
        askCheck.checked = wwIsTurnSoundChoiceEnabled(key);

        const promptInput = document.createElement('input');
        promptInput.type = 'text';
        promptInput.className = 'ww-turn-choice-text';
        promptInput.placeholder = 'Popup text (leave empty for default)';
        promptInput.value = String((wwTurnSoundPromptTextByStep || {})[key] || '');
        promptInput.disabled = !askCheck.checked;

        askCheck.addEventListener('change', function () {
          const enabled = !!askCheck.checked;
          wwSetTurnSoundChoiceEnabledForStep(key, enabled);
          promptInput.disabled = !enabled;
          optionsBtn.classList.toggle('has-active', enabled || wwIsTurnKillStepEnabled(key));
        });

        promptInput.addEventListener('input', function () {
          wwSetTurnSoundPromptForStep(key, promptInput.value || '');
        });

        choiceControls.appendChild(askLabel);
        choiceControls.appendChild(askCheck);
        choiceControls.appendChild(promptInput);
        optionsPanel.appendChild(choiceControls);

        const killControls = document.createElement('div');
        killControls.className = 'ww-inline-controls ww-turn-choice-row';

        const killLabel = document.createElement('label');
        killLabel.className = 'ww-inline-label';
        killLabel.textContent = 'Step involves killing someone';

        const killCheck = document.createElement('input');
        killCheck.type = 'checkbox';
        killCheck.checked = wwIsTurnKillStepEnabled(key);
        killCheck.addEventListener('change', function () {
          const enabled = !!killCheck.checked;
          wwSetTurnKillStepEnabledForStep(key, enabled);
          optionsBtn.classList.toggle('has-active', enabled || wwIsTurnSoundChoiceEnabled(key));
        });

        killControls.appendChild(killLabel);
        killControls.appendChild(killCheck);
        optionsPanel.appendChild(killControls);
        block.appendChild(optionsPanel);

        root.appendChild(block);
      });

      wwRenderRoleChips();
    }

    function wwAddExtraStep() {
      const key = 'extra-' + wwExtraStepNextId;
      wwExtraStepNextId += 1;
      wwExtraSteps.push({ key, title: 'New Step', text: '' });
      wwRenderFieldsInOrder();
      wwRenderStepOrderList();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwDeleteExtraStep(key) {
      wwExtraSteps = wwExtraSteps.filter(s => s.key !== key);
      wwStepOrder = wwStepOrder.filter(k => k !== key);
      wwRenderFieldsInOrder();
      wwRenderStepOrderList();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwGetActiveRoster() {
      if (Array.isArray(wwPickedPlayers) && wwPickedPlayers.length) {
        return wwPickedPlayers
          .filter(p => !p || !p.absent)
          .map(p => String(p && p.name || '').trim())
          .filter(Boolean);
      }
      return wwGetGroupStudents(wwCurrentGroup);
    }

    function wwGetPlayerRoleMap() {
      const out = Object.create(null);
      wwPickedPlayers.forEach(entry => {
        const key = String(entry && entry.name || '').trim();
        if (!key) return;
        const role = String(entry && entry.role || '').trim();
        out[key] = role || 'Villager';
      });
      return out;
    }

    function wwGetPlayerAbsentMap() {
      const out = Object.create(null);
      wwPickedPlayers.forEach(entry => {
        const key = String(entry && entry.name || '').trim();
        if (!key) return;
        out[key] = !!(entry && entry.absent);
      });
      return out;
    }

    function wwGetPlayerRole(studentName) {
      const key = String(studentName || '').trim();
      if (!key) return '';
      const roleMap = wwGetPlayerRoleMap();
      return String(roleMap[key] || '').trim();
    }

    function wwAddRoleRow(role) {
      wwRoles.push(wwNormalizeRole(role || { name: '', instruction: '', count: 1 }));
      wwRenderRoles();
    }

    function wwUpdateRoleField(index, field, value) {
      if (!wwRoles[index]) return;
      if (field === 'count') wwRoles[index][field] = Math.max(0, parseInt(value, 10) || 0);
      else wwRoles[index][field] = String(value || '').trim();
      wwRenderPickedPlayers();
      wwRenderStepOrderList();
      wwBroadcastPresentation();
    }

    function wwRemoveRoleRow(index) {
      wwRoles.splice(index, 1);
      wwStepOrder = wwStepOrder.filter(key => !String(key || '').startsWith('role-'));
      wwRenderRoles();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwMoveRoleToIndex(fromIndex, toIndex) {
      const from = parseInt(fromIndex, 10);
      const to = parseInt(toIndex, 10);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
      if (from < 0 || from >= wwRoles.length || to < 0 || to >= wwRoles.length) return;
      const moved = wwRoles.splice(from, 1)[0];
      wwRoles.splice(to, 0, moved);
      wwStepOrder = wwStepOrder.filter(key => !String(key || '').startsWith('role-'));
      wwRenderRoles();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwGetCustomRoleSteps() {
      const keyCount = Object.create(null);
      return wwRoles
        .map(wwNormalizeRole)
        .filter(role => role.name)
        .map(role => {
          const base = (role.name + '-' + (role.alignment || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom';
          keyCount[base] = (keyCount[base] || 0) + 1;
          const suffix = keyCount[base] > 1 ? '-' + keyCount[base] : '';
          const alignmentLabel = role.alignment ? (' [' + wwGetAlignmentLabel(role.alignment) + ']') : '';
          return {
            key: 'role-' + base + suffix,
            title: role.name + alignmentLabel,
            text: role.instruction
          };
        });
    }

    function wwRenderPickedPlayers() {
      const root = document.getElementById('ww-picked-players');
      if (!root) return;
      root.innerHTML = '';

      if (!wwPickedPlayers.length) {
        root.innerHTML = '<p class="ww-student-empty">No players loaded yet. Select a class to load all students.</p>';
        return;
      }

      const roleNames = wwGetAllRoleNames();
      wwPickedPlayers.forEach((entry, idx) => {
        const row = document.createElement('div');
        row.className = 'ww-picked-row' + (entry && entry.absent ? ' is-absent' : '');
        const safeName = String(entry.name || '').replace(/"/g, '&quot;');
        const absentChecked = entry && entry.absent ? ' checked' : '';
        const optionsHtml = roleNames.map(roleName => {
          const selected = roleName === entry.role ? ' selected' : '';
          const safeRole = String(roleName).replace(/"/g, '&quot;');
          return '<option value="' + safeRole + '"' + selected + '>' + safeRole + '</option>';
        }).join('');

        row.innerHTML = ''
          + '<span class="ww-picked-name">' + safeName + '</span>'
          + '<select class="ww-select" onchange="wwSetPickedPlayerRole(' + idx + ', this.value)">' + optionsHtml + '</select>'
          + '<label class="ww-absent-toggle"><input type="checkbox" onchange="wwSetPickedPlayerAbsent(' + idx + ', this.checked)"' + absentChecked + '>Absent</label>';
        root.appendChild(row);
      });
    }

    function wwSetPickedPlayerRole(index, roleName) {
      if (!wwPickedPlayers[index]) return;
      wwPickedPlayers[index].role = String(roleName || 'Villager').trim() || 'Villager';
      wwRenderStudents();
      wwBroadcastPresentation();
    }

    function wwSetPickedPlayerAbsent(index, absent) {
      if (!wwPickedPlayers[index]) return;
      wwPickedPlayers[index].absent = !!absent;
      wwRenderPickedPlayers();
      wwRenderStudents();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwPopulateAllPlayers(options) {
      const opts = options && typeof options === 'object' ? options : {};
      const groupStudents = wwGetGroupStudents(wwCurrentGroup);
      if (!groupStudents.length) {
        if (opts.notifyIfMissing) showToast('Select a class first.');
        return;
      }

      const previousRoles = wwGetPlayerRoleMap();
      const previousAbsent = wwGetPlayerAbsentMap();
      wwPickedPlayers = groupStudents.map(name => ({
        name,
        role: previousRoles[name] || 'Villager',
        absent: !!previousAbsent[name]
      }));

      // Auto-assign configured role counts only to unassigned players.
      const slots = wwRoles
        .map(wwNormalizeRole)
        .filter(r => r.name && r.count > 0)
        .flatMap(r => Array.from({ length: r.count }, () => r.name));
      let slotIndex = 0;
      for (let i = 0; i < wwPickedPlayers.length && slotIndex < slots.length; i += 1) {
        const currentRole = String(wwPickedPlayers[i].role || '').trim();
        if (!currentRole || currentRole === 'Villager') {
          wwPickedPlayers[i].role = slots[slotIndex++];
        }
      }

      wwRenderPickedPlayers();
      wwRenderStudents();
      wwBroadcastPresentation();
    }

    function wwPopulatePlayersByPicker() {
      wwPopulateAllPlayers({ notifyIfMissing: true });
    }

    function wwOpenRoleAssignments() {
      wwToggleRolesDrawer(true);
      const root = document.getElementById('ww-roles-drawer');
      if (root && typeof root.scrollIntoView === 'function') {
        root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function wwResetAllRoles() {
      wwPopulateAllPlayers({ notifyIfMissing: true });
      wwPickedPlayers = wwPickedPlayers.map(entry => ({
        name: entry.name,
        role: 'Villager',
        absent: !!(entry && entry.absent)
      }));
      wwRenderPickedPlayers();
      wwRenderStudents();
      wwBroadcastPresentation();
    }

    function wwBuildCustomConfig() {
      const turnSounds = {};
      const turnSoundChoices = {};
      const turnSoundPromptTexts = {};
      const turnKillSteps = {};
      wwNormalizeTurnSoundMap(wwGetRawSteps());
      wwNormalizeTurnSoundChoiceMap(wwGetRawSteps());
      wwNormalizeTurnSoundPromptMap(wwGetRawSteps());
      wwNormalizeTurnKillStepMap(wwGetRawSteps());
      Object.keys(wwTurnSoundsByStep || {}).forEach(key => {
        const rel = String((wwTurnSoundsByStep || {})[key] || '').trim();
        if (rel) turnSounds[key] = rel;
      });
      Object.keys(wwTurnSoundChoiceEnabledByStep || {}).forEach(key => {
        if ((wwTurnSoundChoiceEnabledByStep || {})[key]) turnSoundChoices[key] = true;
      });
      Object.keys(wwTurnSoundPromptTextByStep || {}).forEach(key => {
        const txt = String((wwTurnSoundPromptTextByStep || {})[key] || '').trim();
        if (txt) turnSoundPromptTexts[key] = txt;
      });
      Object.keys(wwTurnKillStepEnabledByStep || {}).forEach(key => {
        if ((wwTurnKillStepEnabledByStep || {})[key]) turnKillSteps[key] = true;
      });

      return {
        version: 1,
        savedAt: new Date().toISOString(),
        group: wwCurrentGroup || '',
        settings: {
          autoAdvanceEnabled: !!(document.getElementById('ww-auto-enable') && document.getElementById('ww-auto-enable').checked),
          autoAdvanceSeconds: Math.max(2, Math.min(120, parseInt((document.getElementById('ww-auto-seconds') || {}).value, 10) || 8)),
          voteTimerEnabled: !!(document.getElementById('ww-vote-timer-enable') && document.getElementById('ww-vote-timer-enable').checked),
          voteTimerSeconds: Math.max(5, Math.min(180, parseInt((document.getElementById('ww-vote-timer-seconds') || {}).value, 10) || 30)),
          killSound: String((document.getElementById('ww-kill-sound-select') || {}).value || ''),
          turnSounds,
          turnSoundChoices,
          turnSoundPromptTexts,
          turnKillSteps
        },
        instructions: {
          sleep: String(wwBaseInstructions.sleep || ''),
          werewolf: String(wwBaseInstructions.werewolf || ''),
          seer: String(wwBaseInstructions.seer || ''),
          doctor: String(wwBaseInstructions.doctor || ''),
          wake: String(wwBaseInstructions.wake || ''),
          vote: String(wwBaseInstructions.vote || '')
        },
        extraSteps: wwExtraSteps.map(s => ({ key: s.key, title: s.title, text: s.text })),
        roles: wwRoles.map(wwNormalizeRole).filter(r => r.name),
        stepOrder: Array.isArray(wwStepOrder) ? wwStepOrder.slice() : [],
        pickedPlayers: wwPickedPlayers.map(p => ({
          name: String(p && p.name || '').trim(),
          role: String(p && p.role || 'Villager').trim() || 'Villager',
          absent: !!(p && p.absent)
        })).filter(p => p.name)
      };
    }

    function wwApplyCustomConfig(cfg) {
      const safe = cfg && typeof cfg === 'object' ? cfg : {};
      const inst = safe.instructions && typeof safe.instructions === 'object' ? safe.instructions : {};
      const set = safe.settings && typeof safe.settings === 'object' ? safe.settings : {};

      wwBaseInstructions = {
        sleep: String(inst.sleep || 'Now everybody goes to bed and sleep.'),
        werewolf: String(inst.werewolf || 'Werewolves, wake up quietly and choose someone.'),
        seer: String(inst.seer || 'Seer, wake up and check one player.'),
        doctor: String(inst.doctor || 'Doctor, wake up and protect one player.'),
        wake: String(inst.wake || 'Everybody wake up. Discuss what happened last night.'),
        vote: String(inst.vote || 'Now vote: who should be eliminated?')
      };

      if (Array.isArray(safe.extraSteps) && safe.extraSteps.length) {
        wwExtraSteps = safe.extraSteps
          .map(s => ({ key: String(s.key || ''), title: String(s.title || 'Custom Step'), text: String(s.text || '') }))
          .filter(s => s.key.startsWith('extra-'));
        wwExtraStepNextId = wwExtraSteps.reduce((max, s) => {
          const n = parseInt(s.key.replace('extra-', ''), 10);
          return isFinite(n) && n >= max ? n + 1 : max;
        }, wwExtraStepNextId);
      } else {
        wwExtraSteps = [];
      }

      const autoEnable = document.getElementById('ww-auto-enable');
      const autoSeconds = document.getElementById('ww-auto-seconds');
      const voteEnable = document.getElementById('ww-vote-timer-enable');
      const voteSeconds = document.getElementById('ww-vote-timer-seconds');
      const killSel = document.getElementById('ww-kill-sound-select');
      if (autoEnable) autoEnable.checked = !!set.autoAdvanceEnabled;
      if (autoSeconds) autoSeconds.value = String(Math.max(2, Math.min(120, parseInt(set.autoAdvanceSeconds, 10) || 8)));
      if (voteEnable) voteEnable.checked = set.voteTimerEnabled !== false;
      if (voteSeconds) voteSeconds.value = String(Math.max(5, Math.min(180, parseInt(set.voteTimerSeconds, 10) || 30)));
      if (killSel) killSel.value = String(set.killSound || '');

      wwTurnSoundsByStep = {};
      if (set.turnSounds && typeof set.turnSounds === 'object') {
        Object.keys(set.turnSounds).forEach(key => {
          const stepKey = String(key || '').trim();
          const rel = String(set.turnSounds[key] || '').trim();
          if (stepKey && rel) wwTurnSoundsByStep[stepKey] = wwNormalizeSoundPath(rel);
        });
      }

      wwTurnSoundChoiceEnabledByStep = {};
      if (set.turnSoundChoices && typeof set.turnSoundChoices === 'object') {
        Object.keys(set.turnSoundChoices).forEach(key => {
          const stepKey = String(key || '').trim();
          if (!stepKey) return;
          if (set.turnSoundChoices[key]) wwTurnSoundChoiceEnabledByStep[stepKey] = true;
        });
      }

      wwTurnSoundPromptTextByStep = {};
      if (set.turnSoundPromptTexts && typeof set.turnSoundPromptTexts === 'object') {
        Object.keys(set.turnSoundPromptTexts).forEach(key => {
          const stepKey = String(key || '').trim();
          const txt = String(set.turnSoundPromptTexts[key] || '').trim();
          if (stepKey && txt) wwTurnSoundPromptTextByStep[stepKey] = txt;
        });
      }

      wwTurnKillStepEnabledByStep = {};
      if (set.turnKillSteps && typeof set.turnKillSteps === 'object') {
        Object.keys(set.turnKillSteps).forEach(key => {
          const stepKey = String(key || '').trim();
          if (!stepKey) return;
          if (set.turnKillSteps[key]) wwTurnKillStepEnabledByStep[stepKey] = true;
        });
      }

      if (Array.isArray(safe.roles) && safe.roles.length) {
        wwRoles = safe.roles.map(wwNormalizeRole).filter(r => r.name);
      }
      wwStepOrder = Array.isArray(safe.stepOrder) ? safe.stepOrder.map(v => String(v || '')).filter(Boolean) : [];
      wwRenderRoles();

      wwPickedPlayers = Array.isArray(safe.pickedPlayers)
        ? safe.pickedPlayers.map(p => ({
          name: String(p && p.name || '').trim(),
          role: String(p && p.role || 'Villager').trim() || 'Villager',
          absent: !!(p && p.absent)
        })).filter(p => p.name)
        : [];
      wwRenderPickedPlayers();

      if (safe.group) wwSetGroup(String(safe.group));
      else wwRenderStudents();

      wwStopVoteTimer();
      wwStoreAutoSettings();
      wwStoreVoteTimerSettings();
      wwOnKillSoundChange();
      wwStoreTurnSoundSettings();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwSerializeCustomConfig(cfg) {
      return ''
        + '// custom werewolf config\n'
        + 'const werewolfCustom = ' + JSON.stringify(cfg, null, 2) + ';\n'
        + 'window.WEREWOLF_CUSTOM = werewolfCustom;\n';
    }

    function wwParseCustomConfigSource(source) {
      const txt = String(source || '');
      const loaded = (new Function(txt + '\n; return (typeof werewolfCustom !== "undefined" ? werewolfCustom : (typeof WEREWOLF_CUSTOM !== "undefined" ? WEREWOLF_CUSTOM : null));'))();
      return loaded && typeof loaded === 'object' ? loaded : null;
    }

    function wwParseRolesSource(source) {
      const txt = String(source || '');
      const loaded = (new Function(txt + '\n; return (typeof werewolfRoles !== "undefined" ? werewolfRoles : (typeof WEREWOLF_ROLES !== "undefined" ? WEREWOLF_ROLES : null));'))();
      if (!Array.isArray(loaded)) return [];
      return loaded.map(wwNormalizeRole).filter(r => r.name);
    }

    function wwGetLeafFromRelativePath(relativePath) {
      const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = normalized.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    }

    function wwNormalizeConfigLeafName(name) {
      let leaf = String(name || '').trim();
      if (!leaf) return '';
      if (!/^[\w\- .]+$/.test(leaf)) return '';
      if (!/\.js$/i.test(leaf)) leaf += '.js';
      return leaf;
    }

    async function wwListSetupDbLeafFiles() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function')) {
        return [];
      }

      try {
        const result = await Desktop.listByPath('customData', 'werewolf', { extensions: ['.js'], recursive: false });
        if (!result || !result.ok || !Array.isArray(result.files)) return [];

        const names = result.files
          .map(f => wwGetLeafFromRelativePath((f && (f.relativePath || f.filename)) || ''))
          .filter(Boolean)
          .filter(name => !name.includes('/'));

        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      } catch {
        return [];
      }
    }

    async function wwGetValidSetupDbLeafFiles() {
      const allJs = await wwListSetupDbLeafFiles();
      const filtered = allJs.filter(name => name.toLowerCase() !== wwGetLeafFromRelativePath(WW_ROLES_REL_PATH).toLowerCase());
      const valid = [];

      for (const name of filtered) {
        try {
          const relPath = 'werewolf/' + name;
          const readResult = await Desktop.readByPath('customData', relPath, { encoding: 'utf8' });
          if (!readResult || !readResult.ok) continue;
          const parsed = wwParseCustomConfigSource(readResult.content || '');
          if (parsed && typeof parsed === 'object') valid.push(name);
        } catch {
          // Ignore non-setup JS files in the werewolf folder.
        }
      }

      return valid.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    async function wwPickSetupDbLeaf(mode) {
      const isLoad = mode === 'load';
      const allowNew = !isLoad;
      const existingFiles = isLoad ? await wwGetValidSetupDbLeafFiles() : await wwListSetupDbLeafFiles();

      if (isLoad && !existingFiles.length) {
        return '__none__';
      }

      return new Promise(resolve => {
        const overlay = document.getElementById('custom-db-picker-overlay');
        const titleEl = document.querySelector('#custom-db-picker-header h3');
        const hintEl = document.getElementById('custom-db-picker-hint');
        const listEl = document.getElementById('custom-db-picker-list');
        const newRow = document.getElementById('custom-db-picker-new-row');
        const newLabel = document.getElementById('custom-db-picker-new-label');
        const newInput = document.getElementById('custom-db-picker-new-name');
        const newErr = document.getElementById('custom-db-picker-new-err');
        const confirmBtn = document.getElementById('custom-db-picker-confirm');
        const cancelBtn = document.getElementById('custom-db-picker-cancel');
        const closeBtn = document.getElementById('custom-db-picker-close-btn');

        if (!overlay || !listEl || !newRow || !newInput || !newErr || !confirmBtn || !cancelBtn || !closeBtn || !titleEl || !hintEl || !newLabel) {
          resolve(null);
          return;
        }

        const prev = {
          title: titleEl.textContent,
          hint: hintEl.textContent,
          newLabel: newLabel.textContent,
          confirm: confirmBtn.textContent,
          placeholder: newInput.placeholder
        };

        titleEl.textContent = isLoad ? 'Load Werewolf Setup' : 'Save Werewolf Setup';
        hintEl.textContent = isLoad
          ? 'Choose a werewolf setup database to load.'
          : 'Choose a werewolf setup database to save into, or create a new one.';
        newLabel.textContent = 'Database file name';
        confirmBtn.textContent = isLoad ? 'Load' : 'Save';
        newInput.placeholder = 'e.g. werewolf-grade9.js';

        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const currentLeaf = wwGetLeafFromRelativePath(wwActiveCustomRelPath || WW_CUSTOM_REL_PATH);
        const radioName = 'cdbp-file-ww';

        listEl.innerHTML = existingFiles.map(fn =>
          '<label class="cdbp-file-item"><input type="radio" name="' + radioName + '" value="' + esc(fn) + '"><span>' + esc(fn) + '</span></label>'
        ).join('') + (allowNew
          ? '<label class="cdbp-file-item cdbp-new-item"><input type="radio" name="' + radioName + '" value="__new__"><span>New file...</span></label>'
          : '');

        newInput.value = allowNew ? wwNormalizeConfigLeafName(currentLeaf || 'werewolf-custom.js') : '';
        newErr.textContent = '';
        newRow.style.display = 'none';

        const radios = listEl.querySelectorAll('input[type="radio"]');
        if (radios.length) {
          let selected = false;
          if (currentLeaf) {
            radios.forEach(r => {
              if (r.value === currentLeaf) {
                r.checked = true;
                selected = true;
              }
            });
          }
          if (!selected) {
            if (allowNew && !existingFiles.length) {
              const last = radios[radios.length - 1];
              if (last) {
                last.checked = true;
                newRow.style.display = 'block';
              }
            } else {
              radios[0].checked = true;
            }
          }
        }

        function restorePickerText() {
          titleEl.textContent = prev.title;
          hintEl.textContent = prev.hint;
          newLabel.textContent = prev.newLabel;
          confirmBtn.textContent = prev.confirm;
          newInput.placeholder = prev.placeholder;
        }

        function cleanup() {
          overlay.classList.remove('active');
          listEl.onchange = null;
          newInput.onkeydown = null;
          confirmBtn.onclick = null;
          cancelBtn.onclick = null;
          closeBtn.onclick = null;
          overlay.onclick = null;
          restorePickerText();
        }

        function doCancel() {
          cleanup();
          resolve('');
        }

        function doConfirm() {
          const selected = listEl.querySelector('input[name="' + radioName + '"]:checked');
          if (!selected) {
            doCancel();
            return;
          }

          if (allowNew && selected.value === '__new__') {
            const normalized = wwNormalizeConfigLeafName(newInput.value);
            if (!normalized) {
              newErr.textContent = 'Enter a valid file name (letters, numbers, spaces, hyphens, dots).';
              newInput.focus();
              return;
            }
            cleanup();
            resolve(normalized);
            return;
          }

          cleanup();
          resolve(String(selected.value || '').trim());
        }

        listEl.onchange = function (e) {
          const target = e && e.target;
          if (!target || target.name !== radioName) return;
          newRow.style.display = allowNew && target.value === '__new__' ? 'block' : 'none';
          newErr.textContent = '';
        };

        newInput.onkeydown = function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            doConfirm();
          }
        };

        confirmBtn.onclick = doConfirm;
        cancelBtn.onclick = doCancel;
        closeBtn.onclick = doCancel;
        overlay.onclick = function (e) {
          if (e.target === overlay) doCancel();
        };

        overlay.classList.add('active');
      });
    }

    async function wwLoadExternalRoles(notifyIfMissing) {
      let sourceText = '';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
        const result = await Desktop.readByPath('customData', WW_ROLES_REL_PATH, { encoding: 'utf8' });
        if (!result || !result.ok) {
          if (notifyIfMissing) {
            wwSetStatus('No external roles found', false);
            showToast('No werewolf roles file was found in user/custom-data/werewolf/werewolves-roles.js', true);
          }
          return false;
        }
        sourceText = String(result.content || '');
      } else {
        try {
          const res = await fetch('user/custom-data/werewolf/werewolves-roles.js', { cache: 'no-store' });
          if (!res.ok) {
            if (notifyIfMissing) {
              wwSetStatus('No external roles found', false);
              showToast('No werewolf roles file was found in user/custom-data/werewolf/werewolves-roles.js', true);
            }
            return false;
          }
          sourceText = await res.text();
        } catch (e) {
          if (notifyIfMissing) {
            wwSetStatus('No external roles found', false);
            showToast('No werewolf roles file was found in user/custom-data/werewolf/werewolves-roles.js', true);
          }
          return false;
        }
      }

      let parsedRoles = [];
      try {
        parsedRoles = wwParseRolesSource(sourceText);
      } catch (e) {
        if (notifyIfMissing) {
          wwSetStatus('Invalid roles file', false);
          showToast('Saved werewolf roles file is invalid.', true);
        }
        return false;
      }

      if (!parsedRoles.length) {
        if (notifyIfMissing) {
          wwSetStatus('No roles in roles file', false);
          showToast('Saved werewolf roles file is empty or invalid.', true);
        }
        return false;
      }

      wwRoleCatalog = parsedRoles;
      wwRenderRoleChips();
      wwRenderRoles();
      return true;
    }

    async function wwSaveCustomConfig() {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.saveText === 'function')) {
        showToast('Werewolf setup save is available in Electron only.', true);
        return;
      }

      const pickedLeaf = await wwPickSetupDbLeaf('save');
      if (!pickedLeaf) return;

      const payload = wwBuildCustomConfig();
      const content = wwSerializeCustomConfig(payload);
      const result = await Desktop.saveText('customData', pickedLeaf, content, 'werewolf');
      if (result && result.ok) {
        wwActiveCustomRelPath = 'werewolf/' + pickedLeaf;
        wwSetStatus('Saved setup as ' + pickedLeaf, true);
      } else {
        wwSetStatus('Save failed', false);
        showToast((result && result.error) || 'Unable to save werewolf custom file.', true);
      }
    }

    async function wwLoadCustomConfig(notifyIfMissing) {
      if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function')) {
        if (notifyIfMissing) showToast('Werewolf setup load is available in Electron only.', true);
        return;
      }

      let relativePath = wwActiveCustomRelPath || WW_CUSTOM_REL_PATH;
      if (notifyIfMissing) {
        const pickedLeaf = await wwPickSetupDbLeaf('load');
        if (pickedLeaf === '__none__') {
          wwSetStatus('No saved setup found', false);
          showToast('No werewolf setup databases found in user/custom-data/werewolf.', true);
          return;
        }
        if (!pickedLeaf) return;
        relativePath = 'werewolf/' + pickedLeaf;
      }

      const result = await Desktop.readByPath('customData', relativePath, { encoding: 'utf8' });
      if (!result || !result.ok) {
        if (notifyIfMissing) wwSetStatus('No saved setup found', false);
        if (notifyIfMissing) showToast('Selected werewolf setup file could not be read.', true);
        return;
      }

      let parsed = null;
      try {
        parsed = wwParseCustomConfigSource(result.content || '');
      } catch (e) {
        if (notifyIfMissing) wwSetStatus('Invalid saved setup', false);
        if (notifyIfMissing) showToast('Saved werewolf setup is invalid.', true);
        return;
      }
      if (!parsed) {
        if (notifyIfMissing) wwSetStatus('Invalid saved setup', false);
        if (notifyIfMissing) showToast('Saved werewolf setup is invalid.', true);
        return;
      }

      wwApplyCustomConfig(parsed);
      wwActiveCustomRelPath = relativePath;
      wwSetStatus('Loaded setup ' + wwGetLeafFromRelativePath(relativePath), true);
    }

    function wwLoadDeadState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(WW_DEAD_STORAGE_KEY) || '{}');
        wwDeadByGroup = parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        wwDeadByGroup = {};
      }
    }

    function wwSaveDeadState() {
      try { localStorage.setItem(WW_DEAD_STORAGE_KEY, JSON.stringify(wwDeadByGroup)); } catch (e) { }
    }

    function wwGetGroupStudents(groupName) {
      const key = String(groupName || '').trim();
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[key] : null;
      if (!meta) return [];
      const students = Array.isArray(meta.students) ? meta.students : [];
      if (students.length === 0) return [];
      let names;
      if (typeof students[0] === 'string' && students[0].startsWith('st-')) {
        const roster = (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER)) ? STUDENTS_ROSTER : [];
        const rMap = {};
        roster.forEach(s => { if (s && s.uuid) rMap[s.uuid] = s; });
        names = students.map(sid => {
          const s = rMap[sid];
          return s ? ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() : null;
        }).filter(Boolean);
      } else {
        names = students.map(s => String(s || '').trim()).filter(Boolean);
      }
      return _ltHalfFilter(key, names);
    }

    function wwRenderGroupOptions() {
      const sel = document.getElementById('ww-group-select');
      if (!sel) return;
      const keys = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
        ? Object.keys(CLASS_GROUPS_META)
          .filter(key => !(CLASS_GROUPS_META[key] && CLASS_GROUPS_META[key].archived))
          .sort((a, b) => _ltGroupName(a).localeCompare(_ltGroupName(b)))
        : [];

      sel.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'No class selected';
      sel.appendChild(placeholder);

      keys.forEach(key => {
        const opt = document.createElement('option');
        const size = wwGetGroupStudents(key).length;
        opt.value = key;
        opt.textContent = _ltGroupName(key) + (size ? ' (' + size + ')' : '');
        sel.appendChild(opt);
      });

      const preferred = wwCurrentGroup || activeClassGroup;
      wwCurrentGroup = keys.includes(preferred) ? preferred : '';
      sel.value = wwCurrentGroup;
    }

    function wwRenderStudents() {
      const container = document.getElementById('ww-student-list');
      const countEl = document.getElementById('ww-player-counts');
      if (!container) return;
      container.innerHTML = '';

      const students = wwGetActiveRoster();
      if (!students.length) {
        if (countEl) countEl.textContent = '0 Alive';
        const p = document.createElement('p');
        p.className = 'ww-student-empty';
        p.textContent = 'Select a class to load students.';
        container.appendChild(p);
        wwRenderKillPickerForCurrentStep();
        wwBroadcastPresentation();
        return;
      }

      const deadMap = wwDeadByGroup[wwCurrentGroup] || {};
      let aliveCount = 0;
      let deadCount = 0;

      students.forEach(student => {
        const isDead = !!deadMap[student];
        if (isDead) deadCount += 1;
        else aliveCount += 1;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ww-student-chip' + (isDead ? ' dead' : '');
        const role = wwGetPlayerRole(student);
        if (isDead || (wwShowRolesOnChips && role)) {
          const nameSpan = document.createElement('span');
          nameSpan.textContent = student;
          btn.appendChild(nameSpan);
          if (role) {
            const roleSpan = document.createElement('span');
            roleSpan.className = 'ww-chip-role';
            roleSpan.textContent = role;
            btn.appendChild(roleSpan);
          }
        } else {
          btn.textContent = student;
        }
        btn.onclick = () => wwToggleStudentDead(student);
        container.appendChild(btn);
      });

      if (countEl) {
        countEl.textContent = deadCount > 0
          ? (aliveCount + ' Alive / ' + deadCount + ' Eliminated')
          : (aliveCount + ' Alive');
      }

      wwRenderKillPickerForCurrentStep();
      wwBroadcastPresentation();
    }

    function wwSetGroup(groupName) {
      wwCurrentGroup = String(groupName || '').trim();
      const sel = document.getElementById('ww-group-select');
      if (sel && sel.value !== wwCurrentGroup) sel.value = wwCurrentGroup;
      wwPopulateAllPlayers();
      wwRenderStudents();
      wwBroadcastPresentation();
    }

    function wwUseActiveClassGroup() {
      wwRenderGroupOptions();
      if (activeClassGroup) wwSetGroup(activeClassGroup);
      else wwRenderStudents();
    }

    async function wwToggleStudentDead(studentName) {
      if (!wwCurrentGroup) return;
      if (!wwDeadByGroup[wwCurrentGroup] || typeof wwDeadByGroup[wwCurrentGroup] !== 'object') wwDeadByGroup[wwCurrentGroup] = {};
      const current = !!wwDeadByGroup[wwCurrentGroup][studentName];
      if (current) {
        delete wwDeadByGroup[wwCurrentGroup][studentName];
      } else {
        wwDeadByGroup[wwCurrentGroup][studentName] = true;
      }
      wwSaveDeadState();
      wwRenderStudents();
      wwRenderCurrentStep();
      if (!current) await wwPlayKillSound();
    }

    function wwClearStrikes() {
      if (!wwCurrentGroup) return;
      wwDeadByGroup[wwCurrentGroup] = {};
      wwSaveDeadState();
      wwRenderStudents();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwNormalizeSoundPath(pathValue) {
      const normalized = String(pathValue || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (!normalized) return '';
      return normalized.startsWith('sounds/') ? normalized : ('sounds/' + normalized);
    }

    function wwPathToFileUrl(absPath) {
      return 'file:///' + encodeURI(String(absPath || '').replace(/\\/g, '/'));
    }

    function wwStoreAutoSettings() {
      const enabled = !!(document.getElementById('ww-auto-enable') && document.getElementById('ww-auto-enable').checked);
      const seconds = Math.max(2, Math.min(120, parseInt((document.getElementById('ww-auto-seconds') || {}).value, 10) || 8));
      try { localStorage.setItem(WW_AUTO_STORAGE_KEY, JSON.stringify({ enabled, seconds })); } catch (e) { }
    }

    function wwLoadAutoSettings() {
      let saved = { enabled: false, seconds: 8 };
      try {
        const parsed = JSON.parse(localStorage.getItem(WW_AUTO_STORAGE_KEY) || '{}');
        if (parsed && typeof parsed === 'object') saved = parsed;
      } catch (e) { }

      const autoEnable = document.getElementById('ww-auto-enable');
      const autoSeconds = document.getElementById('ww-auto-seconds');
      if (autoEnable) autoEnable.checked = !!saved.enabled;
      if (autoSeconds) autoSeconds.value = String(Math.max(2, Math.min(120, parseInt(saved.seconds, 10) || 8)));
    }

    function wwGetAutoConfig() {
      const enabled = !!(document.getElementById('ww-auto-enable') && document.getElementById('ww-auto-enable').checked);
      const seconds = Math.max(2, Math.min(120, parseInt((document.getElementById('ww-auto-seconds') || {}).value, 10) || 8));
      return { enabled, seconds };
    }

    function wwStoreVoteTimerSettings() {
      const enabled = !!(document.getElementById('ww-vote-timer-enable') && document.getElementById('ww-vote-timer-enable').checked);
      const seconds = Math.max(5, Math.min(180, parseInt((document.getElementById('ww-vote-timer-seconds') || {}).value, 10) || 30));
      try { localStorage.setItem(WW_VOTE_TIMER_STORAGE_KEY, JSON.stringify({ enabled, seconds })); } catch (e) { }
    }

    function wwLoadVoteTimerSettings() {
      let saved = { enabled: true, seconds: 30 };
      try {
        const parsed = JSON.parse(localStorage.getItem(WW_VOTE_TIMER_STORAGE_KEY) || '{}');
        if (parsed && typeof parsed === 'object') saved = parsed;
      } catch (e) { }

      const voteEnable = document.getElementById('ww-vote-timer-enable');
      const voteSeconds = document.getElementById('ww-vote-timer-seconds');
      if (voteEnable) voteEnable.checked = saved.enabled !== false;
      if (voteSeconds) voteSeconds.value = String(Math.max(5, Math.min(180, parseInt(saved.seconds, 10) || 30)));
    }

    function wwGetVoteTimerConfig() {
      const enabled = !!(document.getElementById('ww-vote-timer-enable') && document.getElementById('ww-vote-timer-enable').checked);
      const seconds = Math.max(5, Math.min(180, parseInt((document.getElementById('ww-vote-timer-seconds') || {}).value, 10) || 30));
      return { enabled, seconds };
    }

    function wwGetCurrentStepEntry() {
      return (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) ? wwSteps[wwCurrentStep] : null;
    }

    function wwFormatCountdown(totalSeconds) {
      const safe = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
      const minutes = Math.floor(safe / 60);
      const seconds = safe % 60;
      return minutes + ':' + String(seconds).padStart(2, '0');
    }

    function wwGetVoteTimerRemainingSeconds() {
      if (!wwVoteTimerState.running) return 0;
      return Math.max(0, Math.ceil((wwVoteTimerState.endsAt - Date.now()) / 1000));
    }

    function wwGetTurnCounterText() {
      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) {
        return 'Round complete';
      }

      const cfg = wwGetVoteTimerConfig();
      const step = wwGetCurrentStepEntry();
      const base = 'Turn ' + (wwCurrentStep + 1) + ' of ' + wwSteps.length;
      if (step && step.key === 'vote' && cfg.enabled) {
        const remaining = wwVoteTimerState.running ? wwGetVoteTimerRemainingSeconds() : cfg.seconds;
        return base + ' • vote ' + wwFormatCountdown(remaining);
      }
      return base;
    }

    function wwStopVoteTimer() {
      if (wwVoteTimerState.tickId) clearInterval(wwVoteTimerState.tickId);
      if (wwVoteTimerState.timeoutId) clearTimeout(wwVoteTimerState.timeoutId);
      wwVoteTimerState.running = false;
      wwVoteTimerState.stepKey = '';
      wwVoteTimerState.endsAt = 0;
      wwVoteTimerState.tickId = null;
      wwVoteTimerState.timeoutId = null;
    }

    function wwRefreshVoteTimerDisplay() {
      const counterEl = document.getElementById('ww-turn-counter');
      if (counterEl) counterEl.textContent = wwGetTurnCounterText();
      wwBroadcastPresentation();
    }

    function wwScheduleVoteTimer() {
      const step = wwGetCurrentStepEntry();
      const cfg = wwGetVoteTimerConfig();

      if (!step || step.key !== 'vote' || !cfg.enabled) {
        if (wwVoteTimerState.running) {
          wwStopVoteTimer();
        }
        return;
      }

      if (wwVoteTimerState.running && wwVoteTimerState.stepKey === step.key) {
        return;
      }

      wwStopVoteTimer();
      wwVoteTimerState.running = true;
      wwVoteTimerState.stepKey = step.key;
      wwVoteTimerState.endsAt = Date.now() + cfg.seconds * 1000;

      wwVoteTimerState.tickId = setInterval(() => {
        if (!wwVoteTimerState.running || wwVoteTimerState.stepKey !== step.key) return;
        if (Date.now() >= wwVoteTimerState.endsAt) {
          wwStopVoteTimer();
          wwNextTurn();
          return;
        }
        wwRefreshVoteTimerDisplay();
      }, 1000);

      wwVoteTimerState.timeoutId = setTimeout(() => {
        if (!wwVoteTimerState.running || wwVoteTimerState.stepKey !== step.key) return;
        wwStopVoteTimer();
        wwNextTurn();
      }, cfg.seconds * 1000);
    }

    function wwOnVoteTimerSettingsChanged() {
      wwStoreVoteTimerSettings();
      wwStopVoteTimer();
      if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) {
        wwRenderCurrentStep();
      }
      wwBroadcastPresentation();
    }

    function wwStopAutoAdvance() {
      if (wwAutoTimer) {
        clearTimeout(wwAutoTimer);
        wwAutoTimer = null;
      }
    }

    function wwScheduleAutoAdvance() {
      wwStopAutoAdvance();
      const cfg = wwGetAutoConfig();
      if (!cfg.enabled) return;
      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) return;

      wwAutoTimer = setTimeout(() => {
        wwNextTurn();
      }, cfg.seconds * 1000);
    }

    function wwOnAutoSettingsChanged() {
      wwStoreAutoSettings();
      if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) {
        wwScheduleAutoAdvance();
        wwRenderCurrentStep();
      }
      wwBroadcastPresentation();
    }

    function wwRenderKillSoundOptions() {
      const sel = document.getElementById('ww-kill-sound-select');
      if (!sel) return;
      const saved = String(localStorage.getItem(WW_SOUND_STORAGE_KEY) || '');
      const current = sel.value || saved;
      sel.innerHTML = '<option value="">No sound</option>';

      wwKillSoundFiles.forEach(rel => {
        const opt = document.createElement('option');
        opt.value = rel;
        opt.textContent = rel.replace(/^sounds\//, '');
        sel.appendChild(opt);
      });

      const canUseCurrent = current && wwKillSoundFiles.includes(current);
      sel.value = canUseCurrent ? current : '';
      if (canUseCurrent) {
        try { localStorage.setItem(WW_SOUND_STORAGE_KEY, current); } catch (e) { }
      }
    }

    async function wwLoadKillSounds(forceReload = false) {
      if (wwKillSoundFiles.length && !forceReload) {
        wwRenderKillSoundOptions();
        return;
      }

      wwKillSoundFiles = [];
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function') {
        try {
          const r = await Desktop.listByPath('customData', 'sounds', {
            extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
            recursive: true
          });
          if (r && r.ok && Array.isArray(r.files)) {
            wwKillSoundFiles = r.files
              .map(f => wwNormalizeSoundPath((f && (f.relativePath || f.filename || f.name)) || ''))
              .filter(Boolean)
              .filter((v, idx, arr) => arr.indexOf(v) === idx)
              .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          }
        } catch (e) {
          console.warn('Unable to list kill sounds:', e);
        }
      }

      wwRenderKillSoundOptions();
      wwRenderInlineStepSoundOptions();
      wwRenderStepOrderList();
      wwRenderRoles();
    }

    function wwOnKillSoundChange() {
      const sel = document.getElementById('ww-kill-sound-select');
      if (!sel) return;
      try { localStorage.setItem(WW_SOUND_STORAGE_KEY, sel.value || ''); } catch (e) { }
    }

    function wwLoadTurnSoundSettings() {
      let parsed = {};
      try {
        const raw = JSON.parse(localStorage.getItem(WW_TURN_SOUND_STORAGE_KEY) || '{}');
        if (raw && typeof raw === 'object') parsed = raw;
      } catch (e) { }

      const soundRaw = (parsed.sounds && typeof parsed.sounds === 'object') ? parsed.sounds : parsed;
      const choiceRaw = (parsed.askChoice && typeof parsed.askChoice === 'object') ? parsed.askChoice : {};
      const promptRaw = (parsed.promptText && typeof parsed.promptText === 'object') ? parsed.promptText : {};
      const killStepRaw = (parsed.killStep && typeof parsed.killStep === 'object') ? parsed.killStep : {};

      const out = {};
      Object.keys(soundRaw || {}).forEach(key => {
        const stepKey = String(key || '').trim();
        const rel = String(soundRaw[key] || '').trim();
        if (stepKey && rel) out[stepKey] = wwNormalizeSoundPath(rel);
      });
      wwTurnSoundsByStep = out;

      const choiceOut = {};
      Object.keys(choiceRaw || {}).forEach(key => {
        const stepKey = String(key || '').trim();
        if (!stepKey) return;
        if (choiceRaw[key]) choiceOut[stepKey] = true;
      });
      wwTurnSoundChoiceEnabledByStep = choiceOut;

      const promptOut = {};
      Object.keys(promptRaw || {}).forEach(key => {
        const stepKey = String(key || '').trim();
        const txt = String(promptRaw[key] || '').trim();
        if (stepKey && txt) promptOut[stepKey] = txt;
      });
      wwTurnSoundPromptTextByStep = promptOut;

      const killStepOut = {};
      Object.keys(killStepRaw || {}).forEach(key => {
        const stepKey = String(key || '').trim();
        if (!stepKey) return;
        if (killStepRaw[key]) killStepOut[stepKey] = true;
      });
      wwTurnKillStepEnabledByStep = killStepOut;

      wwNormalizeTurnSoundChoiceMap(wwGetRawSteps());
      wwNormalizeTurnSoundPromptMap(wwGetRawSteps());
      wwNormalizeTurnKillStepMap(wwGetRawSteps());
      wwRenderInlineStepSoundOptions();
    }

    function wwStoreTurnSoundSettings() {
      try {
        localStorage.setItem(WW_TURN_SOUND_STORAGE_KEY, JSON.stringify({
          sounds: wwTurnSoundsByStep || {},
          askChoice: wwTurnSoundChoiceEnabledByStep || {},
          promptText: wwTurnSoundPromptTextByStep || {},
          killStep: wwTurnKillStepEnabledByStep || {}
        }));
      } catch (e) { }
    }

    function wwNormalizeTurnSoundMap(rawSteps) {
      const steps = Array.isArray(rawSteps) ? rawSteps : wwGetRawSteps();
      const validKeys = new Set(steps.map(step => step.key));
      const out = {};

      Object.keys(wwTurnSoundsByStep || {}).forEach(key => {
        if (!validKeys.has(key)) return;
        const rel = String((wwTurnSoundsByStep || {})[key] || '').trim();
        if (!rel) return;
        if (wwKillSoundFiles.length && !wwKillSoundFiles.includes(rel)) return;
        out[key] = rel;
      });

      wwTurnSoundsByStep = out;
      return out;
    }

    function wwNormalizeTurnSoundChoiceMap(rawSteps) {
      const steps = Array.isArray(rawSteps) ? rawSteps : wwGetRawSteps();
      const validKeys = new Set(steps.map(step => step.key));
      const out = {};

      Object.keys(wwTurnSoundChoiceEnabledByStep || {}).forEach(key => {
        if (!validKeys.has(key)) return;
        if ((wwTurnSoundChoiceEnabledByStep || {})[key]) out[key] = true;
      });

      wwTurnSoundChoiceEnabledByStep = out;
      return out;
    }

    function wwNormalizeTurnSoundPromptMap(rawSteps) {
      const steps = Array.isArray(rawSteps) ? rawSteps : wwGetRawSteps();
      const validKeys = new Set(steps.map(step => step.key));
      const out = {};

      Object.keys(wwTurnSoundPromptTextByStep || {}).forEach(key => {
        if (!validKeys.has(key)) return;
        const txt = String((wwTurnSoundPromptTextByStep || {})[key] || '').trim();
        if (txt) out[key] = txt;
      });

      wwTurnSoundPromptTextByStep = out;
      return out;
    }

    function wwNormalizeTurnKillStepMap(rawSteps) {
      const steps = Array.isArray(rawSteps) ? rawSteps : wwGetRawSteps();
      const validKeys = new Set(steps.map(step => step.key));
      const out = {};

      Object.keys(wwTurnKillStepEnabledByStep || {}).forEach(key => {
        if (!validKeys.has(key)) return;
        if ((wwTurnKillStepEnabledByStep || {})[key]) out[key] = true;
      });

      wwTurnKillStepEnabledByStep = out;
      return out;
    }

    function wwSetTurnSoundForStep(stepKey, relativePath) {
      const key = String(stepKey || '').trim();
      if (!key) return;
      const rel = String(relativePath || '').trim();

      if (!rel) delete wwTurnSoundsByStep[key];
      else wwTurnSoundsByStep[key] = wwNormalizeSoundPath(rel);
      wwStoreTurnSoundSettings();
      wwRenderInlineStepSoundOptions();
    }

    function wwSetTurnSoundChoiceEnabledForStep(stepKey, enabled) {
      const key = String(stepKey || '').trim();
      if (!key) return;
      if (enabled) wwTurnSoundChoiceEnabledByStep[key] = true;
      else delete wwTurnSoundChoiceEnabledByStep[key];
      wwStoreTurnSoundSettings();
    }

    function wwSetTurnSoundPromptForStep(stepKey, promptText) {
      const key = String(stepKey || '').trim();
      if (!key) return;
      const txt = String(promptText || '').trim();
      if (txt) wwTurnSoundPromptTextByStep[key] = txt;
      else delete wwTurnSoundPromptTextByStep[key];
      wwStoreTurnSoundSettings();
    }

    function wwSetTurnKillStepEnabledForStep(stepKey, enabled) {
      const key = String(stepKey || '').trim();
      if (!key) return;
      if (enabled) wwTurnKillStepEnabledByStep[key] = true;
      else delete wwTurnKillStepEnabledByStep[key];
      wwStoreTurnSoundSettings();
      wwRenderCurrentStep();
    }

    function wwIsTurnSoundChoiceEnabled(stepKey) {
      return !!(wwTurnSoundChoiceEnabledByStep || {})[String(stepKey || '')];
    }

    function wwIsTurnKillStepEnabled(stepKey) {
      return !!(wwTurnKillStepEnabledByStep || {})[String(stepKey || '')];
    }

    function wwGetTurnSoundPopupText(stepKey, stepTitle, soundRelPath) {
      const key = String(stepKey || '');
      const custom = String((wwTurnSoundPromptTextByStep || {})[key] || '').trim();
      if (custom) return custom;
      const prettyName = String(soundRelPath || '').replace(/^sounds\//, '') || 'selected sound';
      return 'Turn "' + String(stepTitle || 'Unknown') + '" has sound "' + prettyName + '". Play it now?';
    }

    function wwGetAvailableTurnSounds() {
      const out = [];
      const pushUnique = (relPath, label) => {
        const rel = wwNormalizeSoundPath(relPath);
        if (!rel) return;
        if (out.some(item => item.value === rel)) return;
        out.push({ value: rel, label: String(label || '').trim() || rel.replace(/^sounds\//, '') });
      };

      const killSel = document.getElementById('ww-kill-sound-select');
      if (killSel && killSel.options) {
        Array.from(killSel.options).forEach(opt => {
          const v = String((opt && opt.value) || '').trim();
          if (v) pushUnique(v, (opt && opt.textContent) || '');
        });
      }

      return out;
    }

    function wwRenderInlineStepSoundOptions() {
      const availableSounds = wwGetAvailableTurnSounds();
      const raw = wwGetRawSteps();
      const soundMap = wwNormalizeTurnSoundMap(raw);

      raw.forEach(step => {
        const sel = document.getElementById('ww-step-sound-' + step.key);
        if (!sel) return;

        const selectedSound = String(soundMap[step.key] || '');
        sel.innerHTML = '<option value="">No sound</option>';

        availableSounds.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.value;
          opt.textContent = item.label;
          sel.appendChild(opt);
        });

        if (!availableSounds.length) {
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = 'No files found (use ↻ Sounds above)';
          sel.appendChild(empty);
        }

        if (selectedSound && !availableSounds.some(item => item.value === selectedSound)) {
          const missing = document.createElement('option');
          missing.value = selectedSound;
          missing.textContent = selectedSound.replace(/^sounds\//, '') + ' (missing)';
          sel.appendChild(missing);
        }

        sel.value = selectedSound;
      });
    }

    async function wwResolveKillSoundUrl(relativePath) {
      const normalized = wwNormalizeSoundPath(relativePath);
      if (!normalized) return '';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.resolvePath === 'function') {
        try {
          const resolved = await Desktop.resolvePath('customData', normalized);
          if (resolved && resolved.path) return wwPathToFileUrl(resolved.path);
        } catch (e) {
          console.warn('Unable to resolve kill sound path:', e);
        }
      }

      return 'user/custom-data/' + normalized;
    }

    async function wwPlayKillSound() {
      const sel = document.getElementById('ww-kill-sound-select');
      const rel = sel ? String(sel.value || '') : '';
      if (!rel) return;
      const url = await wwResolveKillSoundUrl(rel);
      if (!url) return;

      try {
        if (wwKillAudio) {
          wwKillAudio.pause();
          wwKillAudio.currentTime = 0;
        }
      } catch (e) { }

      wwKillAudio = new Audio(url);
      wwKillAudio.volume = 1;
      wwKillAudio.play().catch(err => {
        console.warn('Unable to play kill sound:', err);
      });
    }

    async function wwPlayTurnSoundForKey(stepKey) {
      const rel = String((wwTurnSoundsByStep || {})[String(stepKey || '')] || '');
      if (!rel) return;
      const url = await wwResolveKillSoundUrl(rel);
      if (!url) return;

      try {
        if (wwTurnAudio) {
          wwTurnAudio.pause();
          wwTurnAudio.currentTime = 0;
        }
      } catch (e) { }

      wwTurnAudio = new Audio(url);
      wwTurnAudio.volume = 1;
      wwTurnAudio.play().catch(err => {
        console.warn('Unable to play turn sound:', err);
      });
    }

    function wwPlayCurrentTurnSound() {
      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) return;
      const step = wwSteps[wwCurrentStep];
      if (!step || !step.key) return;
      wwPlayTurnSoundForKey(step.key);
    }

    function wwGetTurnSoundForStep(stepKey) {
      return String((wwTurnSoundsByStep || {})[String(stepKey || '')] || '');
    }

    function wwResolveTurnSoundChoice(shouldPlay) {
      const overlay = document.getElementById('ww-sound-choice-overlay');
      if (overlay) overlay.classList.remove('active');

      const resolver = wwTurnSoundChoiceResolver;
      wwTurnSoundChoiceResolver = null;
      if (resolver) resolver(!!shouldPlay);
    }

    function wwHandleTurnSoundChoiceOverlayClick(event) {
      if (!event || event.target !== event.currentTarget) return;
      wwResolveTurnSoundChoice(false);
    }

    function wwAskTurnSoundChoice(popupText) {
      const overlay = document.getElementById('ww-sound-choice-overlay');
      const textEl = document.getElementById('ww-sound-choice-text');
      if (!overlay || !textEl) return Promise.resolve(true);

      if (wwTurnSoundChoiceResolver) {
        const previous = wwTurnSoundChoiceResolver;
        wwTurnSoundChoiceResolver = null;
        previous(false);
      }

      textEl.textContent = String(popupText || 'Play this sound now?');
      overlay.classList.add('active');

      return new Promise(resolve => {
        wwTurnSoundChoiceResolver = resolve;
      });
    }

    async function wwMaybePlayCurrentTurnSound() {
      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) return;
      const step = wwSteps[wwCurrentStep];
      if (!step || !step.key) return;

      const rel = wwGetTurnSoundForStep(step.key);
      if (!rel) return;

      if (!wwIsTurnSoundChoiceEnabled(step.key)) {
        await wwPlayTurnSoundForKey(step.key);
        return;
      }

      const popupText = wwGetTurnSoundPopupText(step.key, step.title, rel);
      const shouldPlay = await wwAskTurnSoundChoice(popupText);
      if (!shouldPlay) return;
      await wwPlayTurnSoundForKey(step.key);
    }

    function wwGetAliveStudentsForCurrentGroup() {
      const students = wwGetActiveRoster();
      const deadMap = wwDeadByGroup[wwCurrentGroup] || {};
      return students.filter(name => !deadMap[name]);
    }

    async function wwKillStudentFromStep(studentName) {
      if (!wwCurrentGroup) return;
      if (!wwDeadByGroup[wwCurrentGroup] || typeof wwDeadByGroup[wwCurrentGroup] !== 'object') wwDeadByGroup[wwCurrentGroup] = {};
      if (wwDeadByGroup[wwCurrentGroup][studentName]) return;

      wwDeadByGroup[wwCurrentGroup][studentName] = true;
      wwSaveDeadState();
      wwRenderStudents();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
      await wwPlayKillSound();
    }

    function wwRenderKillPickerForCurrentStep() {
      const root = document.getElementById('ww-kill-picker');
      if (!root) return;

      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) {
        root.style.display = 'none';
        root.innerHTML = '';
        return;
      }

      const step = wwSteps[wwCurrentStep];
      if (!step || !step.key || !wwIsTurnKillStepEnabled(step.key)) {
        root.style.display = 'none';
        root.innerHTML = '';
        return;
      }

      root.style.display = 'block';
      root.innerHTML = '';

      const title = document.createElement('div');
      title.className = 'ww-kill-picker-title';
      title.textContent = 'Choose survivor to kill';
      root.appendChild(title);

      if (!wwCurrentGroup) {
        const msg = document.createElement('p');
        msg.className = 'ww-student-empty';
        msg.textContent = 'Select a class first to use kill chips.';
        root.appendChild(msg);
        return;
      }

      const alive = wwGetAliveStudentsForCurrentGroup();
      if (!alive.length) {
        const msg = document.createElement('p');
        msg.className = 'ww-student-empty';
        msg.textContent = 'No survivors left.';
        root.appendChild(msg);
        return;
      }

      const list = document.createElement('div');
      list.className = 'ww-kill-chip-list';
      alive.forEach(student => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ww-student-chip ww-kill-chip';
        btn.textContent = student;
        btn.addEventListener('click', async function () {
          await wwKillStudentFromStep(student);
        });
        list.appendChild(btn);
      });
      root.appendChild(list);
    }

    function wwGetRawSteps() {
      const customSteps = wwGetCustomRoleSteps();
      return [
        { key: 'sleep', title: 'Sleep', text: String(wwBaseInstructions.sleep || '') },
        { key: 'werewolf', title: 'Werewolves', text: String(wwBaseInstructions.werewolf || '') },
        { key: 'seer', title: 'Seer', text: String(wwBaseInstructions.seer || '') },
        { key: 'doctor', title: 'Doctor', text: String(wwBaseInstructions.doctor || '') },
        ...customSteps,
        { key: 'wake', title: 'Wake Up', text: String(wwBaseInstructions.wake || '') },
        { key: 'vote', title: 'Vote', text: String(wwBaseInstructions.vote || '') },
        ...wwExtraSteps.map(s => ({ key: s.key, title: s.title, text: s.text }))
      ];
    }

    function wwNormalizeStepOrder(rawSteps) {
      const steps = Array.isArray(rawSteps) ? rawSteps : wwGetRawSteps();
      const keys = steps.map(s => s.key);
      const out = [];

      wwStepOrder.forEach(key => {
        if (keys.includes(key) && !out.includes(key)) out.push(key);
      });
      keys.forEach(key => {
        if (!out.includes(key)) out.push(key);
      });

      const roleKeys = out.filter(key => String(key || '').startsWith('role-'));
      if (roleKeys.length) {
        const withoutRoles = out.filter(key => !String(key || '').startsWith('role-'));
        const doctorIdx = withoutRoles.indexOf('doctor');
        if (doctorIdx >= 0) {
          withoutRoles.splice(doctorIdx + 1, 0, ...roleKeys);
          out.length = 0;
          out.push(...withoutRoles);
        }
      }

      wwStepOrder = out;
      return out;
    }

    function wwRenderStepOrderList() {
      const root = document.getElementById('ww-order-list');
      if (!root) return;

      const raw = wwGetRawSteps().map(step => ({
        key: step.key,
        title: String(step.title || ''),
        active: !!String(step.text || '').trim()
      }));
      const availableSounds = wwGetAvailableTurnSounds();
      const byKey = new Map(raw.map(s => [s.key, s]));
      const order = wwNormalizeStepOrder(raw);
      const soundMap = wwNormalizeTurnSoundMap(raw);
      root.innerHTML = '';

      order.forEach((key, idx) => {
        const step = byKey.get(key);
        if (!step) return;
        const row = document.createElement('div');
        row.className = 'ww-order-row';
        row.draggable = true;
        row.addEventListener('dragstart', function (e) {
          wwStepOrderDragIndex = idx;
          row.classList.add('dragging');
          if (e && e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(idx));
          }
        });
        row.addEventListener('dragover', function (e) {
          if (wwStepOrderDragIndex < 0 || wwStepOrderDragIndex === idx) return;
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          row.classList.add('drop-target');
        });
        row.addEventListener('dragleave', function () {
          row.classList.remove('drop-target');
        });
        row.addEventListener('drop', function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          row.classList.remove('drop-target');
          wwMoveStepOrderToIndex(wwStepOrderDragIndex, idx);
        });
        row.addEventListener('dragend', function () {
          wwStepOrderDragIndex = -1;
          row.classList.remove('dragging');
          Array.from(root.querySelectorAll('.ww-order-row.drop-target')).forEach(el => el.classList.remove('drop-target'));
        });

        const label = document.createElement('span');
        label.className = 'ww-order-label' + (step.active ? '' : ' inactive');
        label.textContent = step.title + (step.active ? '' : ' (inactive)');

        const soundSel = document.createElement('select');
        soundSel.className = 'ww-select ww-order-sound-select';
        soundSel.title = 'Sound for this turn';
        soundSel.innerHTML = '<option value="">No sound</option>';
        availableSounds.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.value;
          opt.textContent = item.label;
          soundSel.appendChild(opt);
        });

        if (!availableSounds.length) {
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = 'No files found (use ↻ Sounds above)';
          soundSel.appendChild(empty);
        }

        const selectedSound = String(soundMap[key] || '');
        if (selectedSound && !availableSounds.some(item => item.value === selectedSound)) {
          const missing = document.createElement('option');
          missing.value = selectedSound;
          missing.textContent = selectedSound.replace(/^sounds\//, '') + ' (missing)';
          soundSel.appendChild(missing);
        }
        soundSel.value = selectedSound;
        soundSel.addEventListener('change', function () {
          wwSetTurnSoundForStep(key, soundSel.value || '');
        });

        const soundBtn = document.createElement('button');
        soundBtn.className = 'action-btn btn-orange ww-order-test-btn';
        soundBtn.title = 'Test turn sound';
        soundBtn.textContent = '🔊';
        soundBtn.addEventListener('click', function () {
          wwPlayTurnSoundForKey(key);
        });

        const upBtn = document.createElement('button');
        upBtn.className = 'action-btn btn-grey';
        upBtn.title = 'Move up';
        upBtn.textContent = '↑';
        upBtn.disabled = idx <= 0;
        upBtn.addEventListener('click', function () {
          wwMoveStepOrderItem(key, -1);
        });

        const downBtn = document.createElement('button');
        downBtn.className = 'action-btn btn-grey';
        downBtn.title = 'Move down';
        downBtn.textContent = '↓';
        downBtn.disabled = idx >= order.length - 1;
        downBtn.addEventListener('click', function () {
          wwMoveStepOrderItem(key, 1);
        });

        row.appendChild(label);
        row.appendChild(soundSel);
        row.appendChild(soundBtn);
        row.appendChild(upBtn);
        row.appendChild(downBtn);
        root.appendChild(row);
      });

      wwStoreTurnSoundSettings();
    }

    function wwMoveStepOrderItem(stepKey, delta) {
      const shift = parseInt(delta, 10);
      if (!shift) return;
      const order = wwNormalizeStepOrder(wwGetRawSteps());
      const from = order.indexOf(stepKey);
      const to = from + shift;
      if (from < 0 || to < 0 || to >= order.length) return;

      const tmp = order[from];
      order[from] = order[to];
      order[to] = tmp;
      wwStepOrder = order;

      wwRenderFieldsInOrder();
      wwRenderStepOrderList();
      wwRenderInlineStepSoundOptions();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwMoveStepOrderToIndex(fromIndex, toIndex) {
      const from = parseInt(fromIndex, 10);
      const to = parseInt(toIndex, 10);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;

      const order = wwNormalizeStepOrder(wwGetRawSteps());
      if (from < 0 || from >= order.length || to < 0 || to >= order.length) return;

      const moved = order.splice(from, 1)[0];
      order.splice(to, 0, moved);
      wwStepOrder = order;

      wwRenderFieldsInOrder();
      wwRenderStepOrderList();
      wwRenderInlineStepSoundOptions();
      wwBuildSteps();
      wwRenderCurrentStep();
      wwBroadcastPresentation();
    }

    function wwBuildSteps() {
      const raw = wwGetRawSteps().map(step => ({ key: step.key, title: step.title, text: String(step.text || '').trim() }));
      const byKey = new Map(raw.map(s => [s.key, s]));
      const orderedKeys = wwNormalizeStepOrder(raw);
      wwSteps = orderedKeys.map(k => byKey.get(k)).filter(step => step && step.text);
      if (!wwSteps.length) {
        wwSteps = [{ key: 'fallback', title: 'Moderator', text: 'Add at least one custom instruction to start the round.' }];
      }
      wwRenderStepOrderList();
    }

    function wwAnimateTurnCard() {
      const card = document.getElementById('ww-turn-card');
      if (!card) return;
      card.classList.remove('ww-anim');
      void card.offsetWidth;
      card.classList.add('ww-anim');
    }

    function wwRenderProgress() {
      const progress = document.getElementById('ww-progress');
      if (!progress) return;
      progress.innerHTML = '';
      wwSteps.forEach((step, idx) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'ww-step';
        if (idx < wwCurrentStep) el.classList.add('done');
        if (idx === wwCurrentStep) el.classList.add('active');
        el.textContent = step.title;
        el.title = 'Jump to ' + step.title;
        el.addEventListener('click', function () { wwJumpToStep(idx); });
        progress.appendChild(el);
      });
    }

    function wwUpdateStepSoundReplayBtn(step) {
      const btn = document.getElementById('ww-play-step-sound-btn');
      if (!btn) return;
      const hasSound = !!(step && step.key && wwGetTurnSoundForStep(step.key));
      btn.classList.toggle('hidden', !hasSound);
    }

    function wwRenderCurrentStep() {
      const titleEl = document.getElementById('ww-turn-title');
      const msgEl = document.getElementById('ww-turn-message');
      const counterEl = document.getElementById('ww-turn-counter');
      if (!titleEl || !msgEl || !counterEl) return;

      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) {
        titleEl.textContent = 'Round Complete';
        msgEl.textContent = 'Click Start Night to run another cycle, or edit instructions in Setup & Script.';
        counterEl.textContent = 'Round complete';
        wwUpdateStepSoundReplayBtn(null);
        wwRenderKillPickerForCurrentStep();
        wwAnimateTurnCard();
        wwRenderProgress();
        wwBroadcastPresentation();
        return;
      }

      const step = wwSteps[wwCurrentStep];
      titleEl.textContent = step.title;
      msgEl.textContent = step.text;
      wwUpdateStepSoundReplayBtn(step);
      wwScheduleVoteTimer();
      counterEl.textContent = wwGetTurnCounterText();
      wwRenderKillPickerForCurrentStep();
      wwAnimateTurnCard();
      wwRenderProgress();
      wwBroadcastPresentation();
    }

    async function wwJumpToStep(index) {
      if (!wwSteps.length) wwBuildSteps();
      const idx = parseInt(index, 10);
      if (!Number.isFinite(idx) || idx < 0 || idx >= wwSteps.length) return;
      wwStopAutoAdvance();
      wwStopVoteTimer();
      wwCurrentStep = idx;
      wwRenderCurrentStep();
      await wwMaybePlayCurrentTurnSound();
      wwScheduleAutoAdvance();
    }

    async function wwPrevTurn() {
      if (!wwSteps.length) wwBuildSteps();
      wwStopAutoAdvance();
      wwStopVoteTimer();
      if (wwCurrentStep <= 0) {
        wwResetRound();
        return;
      }
      wwCurrentStep = Math.min(wwSteps.length - 1, wwCurrentStep - 1);
      wwRenderCurrentStep();
      await wwMaybePlayCurrentTurnSound();
      wwScheduleAutoAdvance();
    }

    async function wwStartNight() {
      wwStopAutoAdvance();
      wwStopVoteTimer();
      wwBuildSteps();
      wwCurrentStep = 0;
      wwRenderCurrentStep();
      await wwMaybePlayCurrentTurnSound();
      wwScheduleAutoAdvance();
    }

    async function wwNextTurn() {
      if (!wwSteps.length) {
        await wwStartNight();
        return;
      }
      wwStopVoteTimer();
      if (wwCurrentStep < 0) {
        wwCurrentStep = 0;
      } else {
        wwCurrentStep += 1;
      }
      wwRenderCurrentStep();
      if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) await wwMaybePlayCurrentTurnSound();
      if (wwCurrentStep >= wwSteps.length) {
        wwStopAutoAdvance();
      } else {
        wwScheduleAutoAdvance();
      }
    }

    function wwResetRound() {
      wwStopAutoAdvance();
      wwStopVoteTimer();
      wwBuildSteps();
      wwCurrentStep = -1;
      const titleEl = document.getElementById('ww-turn-title');
      const msgEl = document.getElementById('ww-turn-message');
      const counterEl = document.getElementById('ww-turn-counter');
      if (titleEl) titleEl.textContent = 'Moderator';
      if (msgEl) msgEl.textContent = 'Click Start Night to begin the sequence.';
      if (counterEl) counterEl.textContent = 'Ready to start';
      wwUpdateStepSoundReplayBtn(null);
      wwRenderKillPickerForCurrentStep();
      wwRenderProgress();
      wwAnimateTurnCard();
    }

    function wwBindSimplifiedUiEvents() {
      const bind = (id, evt, fn) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.wwBound === '1') return;
        el.dataset.wwBound = '1';
        el.addEventListener(evt, fn);
      };
      bind('ww-tab-play', 'click', function () { wwSetActiveTab('play'); });
      bind('ww-tab-setup', 'click', function () { wwSetActiveTab('setup'); });
      bind('ww-prev-turn-btn', 'click', function () { wwPrevTurn(); });
      bind('ww-play-step-sound-btn', 'click', function () { wwPlayCurrentTurnSound(); });
      bind('ww-show-roles-toggle', 'change', function () { wwToggleShowRoles(); });
      bind('ww-toggle-roles-drawer-btn', 'click', function () { wwToggleRolesDrawer(); });
    }

    function wwInit() {
      wwBindSimplifiedUiEvents();
      wwBootProjectionReceiverIfNeeded();
      wwLoadDeadState();
      wwLoadAutoSettings();
      wwLoadVoteTimerSettings();
      wwLoadTurnSoundSettings();
      wwRenderRoles();
      wwRenderStepOrderList();
      wwRenderGroupOptions();
      if (!wwCurrentGroup && activeClassGroup) wwCurrentGroup = activeClassGroup;
      wwSetGroup(wwCurrentGroup);
      wwLoadKillSounds(false);
      wwLoadExternalRoles(false)
        .then(function () {
          return wwLoadCustomConfig(false);
        })
        .catch(function () {
          // Keep startup resilient if external role/config loading fails.
        });
      presentationSyncButtons();
      wwSetStatus('Ready', true);

      wwBuildSteps();
      if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) {
        wwResetRound();
      } else {
        wwRenderCurrentStep();
      }
    }

    function switchToTeam(idx) {
      if (idx === currentTeamIdx || idx < 0 || idx >= teams.length) return;
      currentTeamIdx = idx;
      renderMainScoreboard();
      renderGameTeamUI();
      // Flash the turn banner to confirm the switch
      const banner = document.getElementById('turn-banner');
      if (banner) {
        banner.style.transform = 'scale(1.06)';
        setTimeout(() => { banner.style.transform = ''; }, 300);
      }
    }

    function showPointsToast(pts, msg) {
      const toast = document.createElement('div');
      toast.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:14px 24px;border-radius:12px;font-size:1.5rem;font-weight:bold;color:white;background:${pts >= 0 ? '#2ecc71' : '#e74c3c'};box-shadow:0 4px 15px rgba(0,0,0,0.3);animation:fadeIn 0.3s;`;
      toast.textContent = (pts >= 0 ? '🎉 ' : '💀 ') + msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
      renderMainScoreboard();
      renderGameTeamUI();
    }

    // Patch navTo to start/stop timer
    const _origNavTo = navTo;
    // We'll override navTo inline below

    // =============================================
    // END TEAM MODE
    // =============================================

    // =============================================
    // PRE-GAME POPUP, COUNTDOWN & END-GAME
    // =============================================

    function pregameShow(sectionId) {
      // Pre-fill from stored values
      document.getElementById('pregame-turns').value = turnsPerTeam;
      document.getElementById('pregame-grace').value = timerCfg.grace;
      document.getElementById('pregame-timer-pts').value = timerCfg.points;
      document.getElementById('pregame-timer-int').value = timerCfg.interval;
      document.getElementById('pregame-timer-enable').checked = false;
      pregameToggleTimer();
      // Colour the top border with the first team's colour
      const color = teams.length > 0 ? teams[0].color : '#111';
      document.getElementById('pregame-modal').style.borderTopColor = color;
      document.getElementById('pregame-overlay').classList.add('active');
    }

    function pregameCancel() {
      document.getElementById('pregame-overlay').classList.remove('active');
      navTo('main-menu');
    }

    function pregameToggleTimer() {
      const enabled = document.getElementById('pregame-timer-enable').checked;
      const fields = document.getElementById('pregame-timer-fields');
      fields.style.opacity = enabled ? '1' : '0.4';
      fields.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    function pregameStart() {
      turnsPerTeam = Math.max(1, parseInt(document.getElementById('pregame-turns').value) || 5);
      // Save timer settings into timerCfg (and the timer-settings modal inputs)
      timerCfg.grace = Math.max(0, parseInt(document.getElementById('pregame-grace').value) || 1);
      timerCfg.points = Math.max(1, parseInt(document.getElementById('pregame-timer-pts').value) || 5);
      timerCfg.interval = Math.max(1, parseInt(document.getElementById('pregame-timer-int').value) || 10);
      document.getElementById('timer-grace').value = timerCfg.grace;
      document.getElementById('timer-points').value = timerCfg.points;
      document.getElementById('timer-interval').value = timerCfg.interval;
      const autoTimer = document.getElementById('pregame-timer-enable').checked;
      // Reset per-team turn counters
      teamTurnsUsed = {};
      teams.forEach((_, i) => { teamTurnsUsed[i] = 0; });
      document.getElementById('pregame-overlay').classList.remove('active');
      startCountdown(() => {
        refreshCurrentGame();
        renderGameTeamUI();
        if (autoTimer) { timerStop(); timerStart(); }
      });
    }

    function startCountdown(onFinish) {
      const overlay = document.getElementById('countdown-overlay');
      const numEl = document.getElementById('countdown-display');
      overlay.classList.add('active');
      const steps = [5, 4, 3, 2, 1, 'GO!'];
      let i = 0;
      function tick() {
        numEl.classList.remove('count-pop');
        void numEl.offsetWidth; // force reflow to restart animation
        numEl.textContent = steps[i];
        numEl.classList.toggle('go', steps[i] === 'GO!');
        numEl.classList.add('count-pop');
        if (steps[i] !== 'GO!') { playCountdownBeep(); } else { playCountdownGo(); }
        if (i < steps.length - 1) {
          i++;
          setTimeout(tick, 1000);
        } else {
          setTimeout(() => {
            overlay.classList.remove('active');
            numEl.classList.remove('count-pop', 'go');
            if (typeof onFinish === 'function') onFinish();
          }, 800);
        }
      }
      tick();
    }

    function playCountdownBeep() {
      if (soundMuted) return;
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 880;
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.19);
      } catch (e) { }
    }

    function playCountdownGo() {
      if (soundMuted) return;
      try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = freq;
          const t = ctx.currentTime + i * 0.08;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.start(t); osc.stop(t + 0.29);
        });
      } catch (e) { }
    }

    function endgameShow() {
      const sorted = [...teams]
        .map((tm, i) => ({ ...tm, origIdx: i }))
        .sort((a, b) => b.score - a.score);
      const medals = ['🥇', '🥈', '🥉'];
      let html = '';
      sorted.forEach((tm, rank) => {
        const medal = medals[rank] || `${rank + 1}.`;
        html += `<div class="endgame-score-row${rank === 0 ? ' endgame-winner' : ''}" style="border-left:5px solid ${tm.color};">
          <span style="font-size:1.4rem;">${medal}</span>
          <span class="team-color-dot" style="background:${tm.color};width:14px;height:14px;border-radius:50%;display:inline-block;flex-shrink:0;"></span>
          <span style="flex:1;text-align:left;">${tm.name}</span>
          <strong>${tm.score} pts</strong>
        </div>`;
      });
      document.getElementById('endgame-scores').innerHTML = html;
      document.getElementById('endgame-overlay').classList.add('active');
    }

    function endgameClose() {
      document.getElementById('endgame-overlay').classList.remove('active');
    }

    // =============================================
    // END PRE-GAME & COUNTDOWN
    // =============================================

