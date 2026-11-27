// =============================================
// ROLE-PLAYING GAME (RPG) — PLAY ENGINE & PRESENTATION SYNC
// =============================================

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
    out[key] = role || (wwRoles[0] ? wwRoles[0].name : 'Villager');
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
  return String(wwGetPlayerRoleMap()[key] || '').trim();
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

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ww-picked-name';
    nameSpan.textContent = String(entry.name || '');

    const sel = document.createElement('select');
    sel.className = 'ww-select';
    roleNames.forEach(roleName => {
      const opt = document.createElement('option');
      opt.value = roleName;
      opt.textContent = roleName;
      if (roleName === entry.role) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => wwSetPickedPlayerRole(idx, sel.value));

    const absentLabel = document.createElement('label');
    absentLabel.className = 'ww-absent-toggle';
    const absentCb = document.createElement('input');
    absentCb.type = 'checkbox';
    absentCb.checked = !!(entry && entry.absent);
    absentCb.addEventListener('change', () => wwSetPickedPlayerAbsent(idx, absentCb.checked));
    absentLabel.appendChild(absentCb);
    absentLabel.appendChild(document.createTextNode('Absent'));

    row.appendChild(nameSpan);
    row.appendChild(sel);
    row.appendChild(absentLabel);
    root.appendChild(row);
  });
}

function wwSetPickedPlayerRole(index, roleName) {
  if (!wwPickedPlayers[index]) return;
  const fallback = wwRoles[0] ? wwRoles[0].name : 'Villager';
  wwPickedPlayers[index].role = String(roleName || fallback).trim() || fallback;
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

  const defaultRole = wwRoles[0] ? wwRoles[0].name : 'Villager';
  const previousRoles = wwGetPlayerRoleMap();
  const previousAbsent = wwGetPlayerAbsentMap();
  wwPickedPlayers = groupStudents.map(name => ({
    name,
    role: previousRoles[name] || defaultRole,
    absent: !!previousAbsent[name]
  }));

  const slots = wwRoles
    .map(wwNormalizeRole)
    .filter(r => r.name && r.count > 0)
    .flatMap(r => Array.from({ length: r.count }, () => r.name));
  let slotIndex = 0;
  for (let i = 0; i < wwPickedPlayers.length && slotIndex < slots.length; i += 1) {
    const currentRole = String(wwPickedPlayers[i].role || '').trim();
    if (!currentRole || currentRole === defaultRole) {
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
  const defaultRole = wwRoles[0] ? wwRoles[0].name : 'Villager';
  wwPickedPlayers = wwPickedPlayers.map(entry => ({
    name: entry.name,
    role: defaultRole,
    absent: !!(entry && entry.absent)
  }));
  wwRenderPickedPlayers();
  wwRenderStudents();
  wwBroadcastPresentation();
}

function wwLoadDeadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RPG_STORAGE_KEYS.dead) || '{}');
    wwDeadByGroup = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    wwDeadByGroup = {};
  }
}

function wwSaveDeadState() {
  try { localStorage.setItem(RPG_STORAGE_KEYS.dead, JSON.stringify(wwDeadByGroup)); } catch (e) { }
}

function rpgLoadPlayerTagsState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RPG_STORAGE_KEYS.tags) || '{}');
    rpgPlayerTagsByGroup = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    rpgPlayerTagsByGroup = {};
  }
}

function rpgSavePlayerTagsState() {
  try { localStorage.setItem(RPG_STORAGE_KEYS.tags, JSON.stringify(rpgPlayerTagsByGroup)); } catch (e) { }
}

function rpgGetStudentTags(studentName) {
  if (!wwCurrentGroup) return [];
  const groupTags = rpgPlayerTagsByGroup[wwCurrentGroup] || {};
  const list = groupTags[studentName];
  return Array.isArray(list) ? list : [];
}

function rpgApplyTagToStudent(studentName, statusTag, mode) {
  if (!wwCurrentGroup || !statusTag || !statusTag.label) return;
  if (!rpgPlayerTagsByGroup[wwCurrentGroup]) rpgPlayerTagsByGroup[wwCurrentGroup] = {};
  const current = Array.isArray(rpgPlayerTagsByGroup[wwCurrentGroup][studentName])
    ? rpgPlayerTagsByGroup[wwCurrentGroup][studentName].slice()
    : [];
  const tagId = String(statusTag.id || statusTag.label).toLowerCase();
  const existingIdx = current.findIndex(t => String(t.id || t.label).toLowerCase() === tagId);

  if (mode === 'remove_tag') {
    if (existingIdx >= 0) current.splice(existingIdx, 1);
  } else if (mode === 'toggle_tag') {
    if (existingIdx >= 0) current.splice(existingIdx, 1);
    else current.push({ ...statusTag });
  } else {
    if (existingIdx >= 0) current[existingIdx] = { ...statusTag };
    else current.push({ ...statusTag });
  }

  if (current.length) rpgPlayerTagsByGroup[wwCurrentGroup][studentName] = current;
  else delete rpgPlayerTagsByGroup[wwCurrentGroup][studentName];
  rpgSavePlayerTagsState();
}

function rpgClearAllPlayerTags() {
  if (!wwCurrentGroup) return;
  rpgPlayerTagsByGroup[wwCurrentGroup] = {};
  rpgSavePlayerTagsState();
  wwRenderStudents();
  wwBroadcastPresentation();
}

function wwGetGroupStudents(groupName) {
  const key = String(groupName || '').trim();
  if (!key || typeof CLASS_GROUPS === 'undefined' || !CLASS_GROUPS) return [];
  const list = CLASS_GROUPS[key];
  if (!Array.isArray(list)) return [];
  return _ltHalfFilter(key, list).map(s => String(s && (s.name || s.fullName || s) || '').trim()).filter(Boolean);
}

function wwRenderGroupOptions() {
  const sel = document.getElementById('ww-group-select');
  if (!sel) return;
  const keys = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? Object.keys(CLASS_GROUPS) : [];
  sel.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = keys.length ? 'Select a class…' : 'No classes found';
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

    const nameSpan = document.createElement('span');
    nameSpan.textContent = student;
    btn.appendChild(nameSpan);

    const role = wwGetPlayerRole(student);
    if (isDead || (wwShowRolesOnChips && role)) {
      if (role) {
        const roleObj = rpgGetRoleByName(role);
        const roleSpan = document.createElement('span');
        roleSpan.className = 'ww-chip-role';
        roleSpan.textContent = role;
        if (roleObj && roleObj.color && !isDead) {
          roleSpan.style.borderColor = roleObj.color;
        }
        btn.appendChild(roleSpan);
      }
    }

    const tags = rpgGetStudentTags(student);
    if (tags.length) {
      const tagsWrap = document.createElement('span');
      tagsWrap.className = 'rpg-chip-tags';
      tags.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'rpg-status-tag';
        pill.style.backgroundColor = tag.color || '#5b8fcc';
        if (tag.icon) pill.appendChild(rpgCreateSvgIcon(tag.icon, 'rpg-tag-icon'));
        const lbl = document.createElement('span');
        lbl.textContent = tag.label;
        pill.appendChild(lbl);
        tagsWrap.appendChild(pill);
      });
      btn.appendChild(tagsWrap);
    }

    btn.addEventListener('click', () => wwToggleStudentDead(student));
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

  const wasDead = !!wwDeadByGroup[wwCurrentGroup][studentName];
  if (wasDead) delete wwDeadByGroup[wwCurrentGroup][studentName];
  else wwDeadByGroup[wwCurrentGroup][studentName] = true;

  wwSaveDeadState();
  wwRenderStudents();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
  if (!wasDead) await wwPlayKillSound();
}

function wwClearStrikes() {
  if (!wwCurrentGroup) return;
  wwDeadByGroup[wwCurrentGroup] = {};
  wwSaveDeadState();
  wwRenderStudents();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
}

function wwStoreAutoSettings() {
  const enabled = !!(document.getElementById('ww-auto-enable') && document.getElementById('ww-auto-enable').checked);
  const seconds = Math.max(2, Math.min(120, parseInt((document.getElementById('ww-auto-seconds') || {}).value, 10) || 8));
  try { localStorage.setItem(RPG_STORAGE_KEYS.auto, JSON.stringify({ enabled, seconds })); } catch (e) { }
}

function wwLoadAutoSettings() {
  let saved = { enabled: false, seconds: 8 };
  try {
    const parsed = JSON.parse(localStorage.getItem(RPG_STORAGE_KEYS.auto) || '{}');
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
  try { localStorage.setItem(RPG_STORAGE_KEYS.voteTimer, JSON.stringify({ enabled, seconds })); } catch (e) { }
}

function wwLoadVoteTimerSettings() {
  let saved = { enabled: true, seconds: 30 };
  try {
    const parsed = JSON.parse(localStorage.getItem(RPG_STORAGE_KEYS.voteTimer) || '{}');
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
  if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) return 'Round complete';
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
    if (wwVoteTimerState.running) wwStopVoteTimer();
    return;
  }
  if (wwVoteTimerState.running && wwVoteTimerState.stepKey === step.key) return;

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
  if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) wwRenderCurrentStep();
  wwBroadcastPresentation();
}

function wwStopAutoAdvance() {
  if (wwAutoTimer) { clearTimeout(wwAutoTimer); wwAutoTimer = null; }
}

function wwScheduleAutoAdvance() {
  wwStopAutoAdvance();
  const cfg = wwGetAutoConfig();
  if (!cfg.enabled) return;
  if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) return;
  wwAutoTimer = setTimeout(() => wwNextTurn(), cfg.seconds * 1000);
}

function wwOnAutoSettingsChanged() {
  wwStoreAutoSettings();
  if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) {
    wwScheduleAutoAdvance();
    wwRenderCurrentStep();
  }
  wwBroadcastPresentation();
}

function wwLoadTurnSoundSettings() {
  let parsed = {};
  try {
    const raw = JSON.parse(localStorage.getItem(RPG_STORAGE_KEYS.turnSounds) || '{}');
    if (raw && typeof raw === 'object') parsed = raw;
  } catch (e) { }

  const soundRaw = (parsed.sounds && typeof parsed.sounds === 'object') ? parsed.sounds : parsed;
  const choiceRaw = (parsed.askChoice && typeof parsed.askChoice === 'object') ? parsed.askChoice : {};
  const promptRaw = (parsed.promptText && typeof parsed.promptText === 'object') ? parsed.promptText : {};
  const killStepRaw = (parsed.killStep && typeof parsed.killStep === 'object') ? parsed.killStep : {};
  const intRaw = (parsed.stepInteractions && typeof parsed.stepInteractions === 'object') ? parsed.stepInteractions : {};
  const animRaw = (parsed.stepAnimations && typeof parsed.stepAnimations === 'object') ? parsed.stepAnimations : {};

  wwTurnSoundsByStep = {};
  Object.keys(soundRaw || {}).forEach(key => {
    const stepKey = String(key || '').trim();
    const rel = String(soundRaw[key] || '').trim();
    if (stepKey && rel) wwTurnSoundsByStep[stepKey] = wwNormalizeSoundPath(rel);
  });

  wwTurnSoundChoiceEnabledByStep = {};
  Object.keys(choiceRaw || {}).forEach(key => {
    const stepKey = String(key || '').trim();
    if (stepKey && choiceRaw[key]) wwTurnSoundChoiceEnabledByStep[stepKey] = true;
  });

  wwTurnSoundPromptTextByStep = {};
  Object.keys(promptRaw || {}).forEach(key => {
    const stepKey = String(key || '').trim();
    const txt = String(promptRaw[key] || '').trim();
    if (stepKey && txt) wwTurnSoundPromptTextByStep[stepKey] = txt;
  });

  wwTurnKillStepEnabledByStep = {};
  Object.keys(killStepRaw || {}).forEach(key => {
    const stepKey = String(key || '').trim();
    if (stepKey && killStepRaw[key]) wwTurnKillStepEnabledByStep[stepKey] = true;
  });

  if (Object.keys(intRaw).length) {
    rpgStepInteractionByStep = { ...intRaw };
  } else {
    Object.keys(wwTurnKillStepEnabledByStep).forEach(k => {
      if (wwTurnKillStepEnabledByStep[k] && !rpgStepInteractionByStep[k]) rpgStepInteractionByStep[k] = 'elim';
    });
  }

  if (Object.keys(animRaw).length) {
    rpgStepAnimationByStep = { ...animRaw };
  }

  wwNormalizeTurnSoundChoiceMap(wwGetRawSteps());
  wwNormalizeTurnSoundPromptMap(wwGetRawSteps());
  wwNormalizeTurnKillStepMap(wwGetRawSteps());
  wwRenderInlineStepSoundOptions();
}

function wwStoreTurnSoundSettings() {
  try {
    localStorage.setItem(RPG_STORAGE_KEYS.turnSounds, JSON.stringify({
      sounds: wwTurnSoundsByStep || {},
      askChoice: wwTurnSoundChoiceEnabledByStep || {},
      promptText: wwTurnSoundPromptTextByStep || {},
      killStep: wwTurnKillStepEnabledByStep || {},
      stepInteractions: rpgStepInteractionByStep || {},
      stepAnimations: rpgStepAnimationByStep || {}
    }));
  } catch (e) { }
}

function wwNormalizeTurnSoundMap(rawSteps) {
  const steps = Array.isArray(rawSteps) ? rawSteps : wwGetRawSteps();
  const validKeys = new Set(steps.map(step => step.key));
  const out = {};
  Object.keys(wwTurnSoundsByStep || {}).forEach(key => {
    if (!validKeys.has(key)) return;
    const rel = String(wwTurnSoundsByStep[key] || '').trim();
    if (!rel) return;
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
    if (validKeys.has(key) && wwTurnSoundChoiceEnabledByStep[key]) out[key] = true;
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
    const txt = String(wwTurnSoundPromptTextByStep[key] || '').trim();
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
    if (validKeys.has(key) && wwTurnKillStepEnabledByStep[key]) out[key] = true;
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
  if (enabled) {
    wwTurnKillStepEnabledByStep[key] = true;
    rpgStepInteractionByStep[key] = 'elim';
  } else {
    delete wwTurnKillStepEnabledByStep[key];
    if (rpgStepInteractionByStep[key] === 'elim') delete rpgStepInteractionByStep[key];
  }
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
    if (selectedSound && !availableSounds.some(item => item.value === selectedSound)) {
      const missing = document.createElement('option');
      missing.value = selectedSound;
      missing.textContent = selectedSound.replace(/^sounds\//, '') + ' (missing)';
      sel.appendChild(missing);
    }
    sel.value = selectedSound;
  });
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
  return new Promise(resolve => { wwTurnSoundChoiceResolver = resolve; });
}

async function wwMaybePlayCurrentTurnSound() {
  if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) return;
  const step = wwSteps[wwCurrentStep];
  if (!step || !step.key) return;

  const anim = rpgGetStepAnimation(step.key);
  if (anim && anim !== 'none') {
    rpgLastAnimNonce += 1;
    rpgLastAnimName = anim;
    rpgTriggerAnimation(anim, document.getElementById('ww-turn-card'));
    wwBroadcastPresentation();
  }

  const rel = wwGetTurnSoundForStep(step.key);
  if (!rel) return;

  if (!wwIsTurnSoundChoiceEnabled(step.key)) {
    await wwPlayTurnSoundForKey(step.key);
    return;
  }

  const popupText = wwGetTurnSoundPopupText(step.key, step.title, rel);
  const shouldPlay = await wwAskTurnSoundChoice(popupText);
  if (shouldPlay) await wwPlayTurnSoundForKey(step.key);
}

function wwGetAliveStudentsForCurrentGroup() {
  const students = wwGetActiveRoster();
  const deadMap = wwDeadByGroup[wwCurrentGroup] || {};
  return students.filter(name => !deadMap[name]);
}

async function rpgApplyInteractionToTargets(interaction, targets) {
  if (!interaction || !wwCurrentGroup) return;
  const list = Array.isArray(targets) ? targets : [];
  if (!wwDeadByGroup[wwCurrentGroup] || typeof wwDeadByGroup[wwCurrentGroup] !== 'object') {
    wwDeadByGroup[wwCurrentGroup] = {};
  }

  list.forEach(studentName => {
    if (interaction.effectAction === 'eliminate') {
      wwDeadByGroup[wwCurrentGroup][studentName] = true;
    } else if (interaction.effectAction === 'restore') {
      delete wwDeadByGroup[wwCurrentGroup][studentName];
    } else if (interaction.statusTag) {
      rpgApplyTagToStudent(studentName, interaction.statusTag, interaction.effectAction);
    }
  });

  wwSaveDeadState();
  rpgMultiTargetSelection = [];

  if (interaction.animation && interaction.animation !== 'none') {
    rpgLastAnimNonce += 1;
    rpgLastAnimName = interaction.animation;
    rpgTriggerAnimation(interaction.animation, document.getElementById('ww-turn-card'));
  }

  wwRenderStudents();
  wwRenderCurrentStep();
  wwBroadcastPresentation();

  if (interaction.sound) {
    await rpgPlaySoundValue(interaction.sound);
  } else if (interaction.effectAction === 'eliminate') {
    await wwPlayKillSound();
  }
}

async function wwKillStudentFromStep(studentName) {
  const elim = rpgGetInteractionById('elim') || { effectAction: 'eliminate', animation: 'slash', sound: '' };
  await rpgApplyInteractionToTargets(elim, [studentName]);
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
  const interaction = step && step.key ? rpgGetStepInteraction(step.key) : null;
  if (!interaction) {
    root.style.display = 'none';
    root.innerHTML = '';
    return;
  }

  root.style.display = 'block';
  root.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'ww-kill-picker-title';
  if (interaction.targetMode === 'none') {
    title.textContent = interaction.name;
  } else if (interaction.targetMode === 'multi') {
    title.textContent = interaction.name + ' — select up to ' + interaction.maxTargets + ' player(s)';
  } else {
    title.textContent = interaction.name + ' — choose a player';
  }
  root.appendChild(title);

  if (interaction.targetMode === 'none') {
    const triggerBtn = document.createElement('button');
    triggerBtn.type = 'button';
    triggerBtn.className = 'action-btn btn-blue';
    triggerBtn.appendChild(rpgCreateSvgIcon('zap.svg', 'btn-icon'));
    triggerBtn.appendChild(document.createTextNode(' Trigger ' + interaction.name));
    triggerBtn.addEventListener('click', () => rpgApplyInteractionToTargets(interaction, []));
    root.appendChild(triggerBtn);
    return;
  }

  if (!wwCurrentGroup) {
    const msg = document.createElement('p');
    msg.className = 'ww-student-empty';
    msg.textContent = 'Select a class first to target players.';
    root.appendChild(msg);
    return;
  }

  const candidates = interaction.effectAction === 'restore'
    ? wwGetActiveRoster().filter(name => !!(wwDeadByGroup[wwCurrentGroup] || {})[name])
    : wwGetAliveStudentsForCurrentGroup();

  if (!candidates.length) {
    const msg = document.createElement('p');
    msg.className = 'ww-student-empty';
    msg.textContent = 'No eligible players.';
    root.appendChild(msg);
    return;
  }

  const list = document.createElement('div');
  list.className = 'ww-kill-chip-list';

  candidates.forEach(student => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = rpgMultiTargetSelection.includes(student);
    btn.className = 'ww-student-chip ww-kill-chip' + (isSelected ? ' rpg-target-selected' : '');
    btn.textContent = student;
    btn.addEventListener('click', async function () {
      if (interaction.targetMode === 'single') {
        await rpgApplyInteractionToTargets(interaction, [student]);
      } else {
        const idx = rpgMultiTargetSelection.indexOf(student);
        if (idx >= 0) rpgMultiTargetSelection.splice(idx, 1);
        else if (rpgMultiTargetSelection.length < interaction.maxTargets) rpgMultiTargetSelection.push(student);
        else showToast('Maximum ' + interaction.maxTargets + ' targets selected.', true);
        wwRenderKillPickerForCurrentStep();
      }
    });
    list.appendChild(btn);
  });
  root.appendChild(list);

  if (interaction.targetMode === 'multi') {
    const applyWrap = document.createElement('div');
    applyWrap.style.marginTop = '10px';
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'action-btn btn-blue';
    applyBtn.disabled = rpgMultiTargetSelection.length === 0;
    applyBtn.textContent = 'Apply ' + interaction.name + ' (' + rpgMultiTargetSelection.length + '/' + interaction.maxTargets + ')';
    applyBtn.addEventListener('click', async () => {
      await rpgApplyInteractionToTargets(interaction, rpgMultiTargetSelection.slice());
    });
    applyWrap.appendChild(applyBtn);
    root.appendChild(applyWrap);
  }
}

function wwBuildSteps() {
  const raw = wwGetRawSteps().map(step => ({ key: step.key, title: step.title, text: String(step.text || '').trim() }));
  const byKey = new Map(raw.map(s => [s.key, s]));
  const orderedKeys = wwNormalizeStepOrder(raw);
  wwSteps = orderedKeys.map(k => byKey.get(k)).filter(step => step && step.text);
  if (!wwSteps.length) {
    wwSteps = [{ key: 'fallback', title: 'Moderator', text: 'Add at least one instruction in Setup & Script to start the round.' }];
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
    msgEl.textContent = 'Click Start Round to run another cycle, or edit instructions in Setup & Script.';
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
  rpgMultiTargetSelection = [];
  wwCurrentStep = idx;
  wwRenderCurrentStep();
  await wwMaybePlayCurrentTurnSound();
  wwScheduleAutoAdvance();
}

async function wwPrevTurn() {
  if (!wwSteps.length) wwBuildSteps();
  wwStopAutoAdvance();
  wwStopVoteTimer();
  rpgMultiTargetSelection = [];
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
  rpgMultiTargetSelection = [];
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
  rpgMultiTargetSelection = [];
  if (wwCurrentStep < 0) wwCurrentStep = 0;
  else wwCurrentStep += 1;
  wwRenderCurrentStep();
  if (wwCurrentStep >= 0 && wwCurrentStep < wwSteps.length) await wwMaybePlayCurrentTurnSound();
  if (wwCurrentStep >= wwSteps.length) wwStopAutoAdvance();
  else wwScheduleAutoAdvance();
}

function wwResetRound() {
  wwStopAutoAdvance();
  wwStopVoteTimer();
  rpgMultiTargetSelection = [];
  wwBuildSteps();
  wwCurrentStep = -1;

  // Clear round-reset status tags for current class
  if (wwCurrentGroup && rpgPlayerTagsByGroup[wwCurrentGroup]) {
    const groupTags = rpgPlayerTagsByGroup[wwCurrentGroup];
    Object.keys(groupTags).forEach(student => {
      const filtered = (groupTags[student] || []).filter(t => t.clearOnRoundReset === false);
      if (filtered.length) groupTags[student] = filtered;
      else delete groupTags[student];
    });
    rpgSavePlayerTagsState();
    wwRenderStudents();
  }

  const titleEl = document.getElementById('ww-turn-title');
  const msgEl = document.getElementById('ww-turn-message');
  const counterEl = document.getElementById('ww-turn-counter');
  if (titleEl) titleEl.textContent = 'Moderator';
  if (msgEl) msgEl.textContent = 'Click Start Round to begin the sequence.';
  if (counterEl) counterEl.textContent = 'Ready to start';
  wwUpdateStepSoundReplayBtn(null);
  wwRenderKillPickerForCurrentStep();
  wwRenderProgress();
  wwAnimateTurnCard();
  wwBroadcastPresentation();
}

function wwBindSimplifiedUiEvents() {
  const bind = (id, evt, fn) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.wwBound === '1') return;
    el.dataset.wwBound = '1';
    el.addEventListener(evt, fn);
  };
  bind('ww-tab-play', 'click', () => wwSetActiveTab('play'));
  bind('ww-tab-setup', 'click', () => wwSetActiveTab('setup'));
  bind('ww-prev-turn-btn', 'click', () => wwPrevTurn());
  bind('ww-play-step-sound-btn', 'click', () => wwPlayCurrentTurnSound());
  bind('ww-show-roles-toggle', 'change', () => wwToggleShowRoles());
  bind('ww-toggle-roles-drawer-btn', 'click', () => wwToggleRolesDrawer());
  bind('rpg-clear-tags-btn', 'click', () => rpgClearAllPlayerTags());
  bind('rpg-preset-select', 'change', e => rpgApplyPreset(e.target.value));
  bind('rpg-new-role-btn', 'click', () => rpgOpenRoleModal(-1));
  bind('rpg-role-modal-save', 'click', () => rpgSaveRoleFromModal());
  bind('rpg-role-modal-cancel', 'click', () => rpgCloseRoleModal());
  bind('rpg-role-modal-close', 'click', () => rpgCloseRoleModal());
  bind('rpg-new-interaction-btn', 'click', () => rpgOpenInteractionModal(-1));
  bind('rpg-int-modal-save', 'click', () => rpgSaveInteractionFromModal());
  bind('rpg-int-modal-cancel', 'click', () => rpgCloseInteractionModal());
  bind('rpg-int-modal-close', 'click', () => rpgCloseInteractionModal());
}

function wwInit() {
  wwBindSimplifiedUiEvents();
  if (typeof wwBootProjectionReceiverIfNeeded === 'function') wwBootProjectionReceiverIfNeeded();
  wwLoadDeadState();
  rpgLoadPlayerTagsState();
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
    .then(() => wwLoadCustomConfig(false))
    .catch(() => { });
  if (typeof presentationSyncButtons === 'function') presentationSyncButtons();
  wwSetStatus('Ready', true);

  wwBuildSteps();
  if (wwCurrentStep < 0 || wwCurrentStep >= wwSteps.length) {
    wwResetRound();
  } else {
    wwRenderCurrentStep();
  }
}

function rpgInit() {
  return wwInit();
}
