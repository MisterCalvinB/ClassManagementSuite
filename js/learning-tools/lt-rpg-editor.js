// =============================================
// ROLE-PLAYING GAME (RPG) — SETUP, ROLES & INTERACTION EDITOR
// =============================================

let rpgEditingRoleIndex = -1;
let rpgEditingInteractionIndex = -1;

function rpgCreateSvgIcon(iconName, extraClass) {
  const img = document.createElement('img');
  const safeIcon = String(iconName || 'star.svg').replace(/[^a-z0-9._-]/gi, '');
  img.src = '../assets/icons/' + safeIcon;
  img.className = extraClass || 'btn-icon';
  img.alt = '';
  return img;
}

function wwRenderRoleChips() {
  const root = document.getElementById('ww-role-chip-list');
  if (root) {
    root.innerHTML = '';
    const source = wwRoles.length ? wwRoles : wwRoleCatalog;
    if (!source.length) {
      root.innerHTML = '<p class="ww-student-empty">No roles defined yet. Create a role below or load a preset.</p>';
    } else {
      source.map(wwNormalizeRole).filter(r => r.name).forEach(role => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ww-role-chip ' + wwGetAlignmentClass(role.alignment);
        chip.style.borderLeftWidth = '5px';
        chip.style.borderLeftColor = role.color || '#e2c96e';

        chip.appendChild(rpgCreateSvgIcon(role.icon, 'btn-icon'));

        const chipName = document.createElement('span');
        chipName.textContent = role.name;
        const chipAlign = document.createElement('span');
        chipAlign.className = 'ww-align-badge ' + wwGetAlignmentClass(role.alignment);
        chipAlign.textContent = wwGetAlignmentLabel(role.alignment);
        chip.appendChild(chipName);
        chip.appendChild(chipAlign);

        const roleIdentity = wwGetRoleIdentity(role);
        const customSteps = wwGetCustomRoleSteps();
        const inOrder = customSteps.some(s => {
          const r = wwRoles.find(item => wwGetRoleIdentity(item) === roleIdentity);
          return r && wwStepOrder.includes(s.key) && s.title.toLowerCase().startsWith(role.name.toLowerCase());
        });
        if (inOrder && role.instruction) {
          chip.classList.add('active');
        }

        chip.addEventListener('click', function () {
          wwInsertRoleFromChip(role);
        });
        root.appendChild(chip);
      });
    }
  }
  rpgRenderRolesLibrary();
  rpgRenderInteractionsLibrary();
}

function rpgRenderRolesLibrary() {
  const root = document.getElementById('rpg-roles-library-list');
  if (!root) return;
  root.innerHTML = '';

  if (!wwRoles.length) {
    root.innerHTML = '<p class="ww-student-empty">No roles yet. Click "+ New Role" to create one.</p>';
    return;
  }

  wwRoles.forEach((rawRole, idx) => {
    const role = wwNormalizeRole(rawRole);
    const card = document.createElement('div');
    card.className = 'rpg-lib-card';
    card.style.borderLeftColor = role.color || '#e2c96e';

    const head = document.createElement('div');
    head.className = 'rpg-lib-card-head';
    head.appendChild(rpgCreateSvgIcon(role.icon, 'btn-icon'));

    const title = document.createElement('strong');
    title.textContent = role.name;
    head.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'ww-align-badge ' + wwGetAlignmentClass(role.alignment);
    badge.textContent = wwGetAlignmentLabel(role.alignment);
    head.appendChild(badge);

    if (role.count > 0) {
      const cnt = document.createElement('span');
      cnt.className = 'rpg-count-pill';
      cnt.textContent = 'x' + role.count;
      head.appendChild(cnt);
    }

    const actions = document.createElement('div');
    actions.className = 'rpg-lib-card-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'action-btn btn-grey ww-icon-btn';
    editBtn.title = 'Edit role';
    editBtn.appendChild(rpgCreateSvgIcon('edit.svg', 'btn-icon'));
    editBtn.addEventListener('click', () => rpgOpenRoleModal(idx));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'action-btn btn-orange ww-icon-btn';
    delBtn.title = 'Delete role';
    delBtn.appendChild(rpgCreateSvgIcon('trash.svg', 'btn-icon'));
    delBtn.addEventListener('click', () => rpgDeleteRole(idx));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    head.appendChild(actions);
    card.appendChild(head);

    if (role.instruction) {
      const desc = document.createElement('div');
      desc.className = 'rpg-lib-card-desc';
      desc.textContent = role.instruction;
      card.appendChild(desc);
    }

    root.appendChild(card);
  });
}

function rpgOpenRoleModal(index) {
  rpgEditingRoleIndex = typeof index === 'number' && index >= 0 ? index : -1;
  const overlay = document.getElementById('rpg-role-modal-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('rpg-role-modal-title');
  const nameInput = document.getElementById('rpg-role-name');
  const alignSel = document.getElementById('rpg-role-alignment');
  const iconSel = document.getElementById('rpg-role-icon');
  const colorSel = document.getElementById('rpg-role-color');
  const countInput = document.getElementById('rpg-role-count');
  const intSel = document.getElementById('rpg-role-default-interaction');
  const instrInput = document.getElementById('rpg-role-instruction');

  if (iconSel && !iconSel.options.length) {
    RPG_ICON_OPTIONS.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      iconSel.appendChild(opt);
    });
  }
  if (colorSel && !colorSel.options.length) {
    RPG_COLOR_OPTIONS.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      colorSel.appendChild(opt);
    });
  }
  if (intSel) {
    intSel.innerHTML = '<option value="">None (no target picker)</option>';
    rpgInteractions.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      intSel.appendChild(opt);
    });
  }

  const role = rpgEditingRoleIndex >= 0 && wwRoles[rpgEditingRoleIndex]
    ? wwNormalizeRole(wwRoles[rpgEditingRoleIndex])
    : wwNormalizeRole({ name: '', alignment: 'neutral', icon: 'star.svg', color: '#e2c96e', count: 1, instruction: '' });

  if (titleEl) titleEl.textContent = rpgEditingRoleIndex >= 0 ? 'Edit Role' : 'Create New Role';
  if (nameInput) nameInput.value = role.name;
  if (alignSel) alignSel.value = ['village', 'werewolf', 'neutral'].includes(role.alignment) ? role.alignment : 'neutral';
  if (iconSel) iconSel.value = role.icon || 'star.svg';
  if (colorSel) colorSel.value = role.color || '#e2c96e';
  if (countInput) countInput.value = String(role.count);
  if (intSel) intSel.value = role.defaultInteractionId || '';
  if (instrInput) instrInput.value = role.instruction || '';

  overlay.classList.add('active');
  if (nameInput) nameInput.focus();
}

function rpgCloseRoleModal() {
  const overlay = document.getElementById('rpg-role-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  rpgEditingRoleIndex = -1;
}

function rpgSaveRoleFromModal() {
  const name = String((document.getElementById('rpg-role-name') || {}).value || '').trim();
  if (!name) {
    showToast('Please enter a role name.', true);
    return;
  }
  const alignment = String((document.getElementById('rpg-role-alignment') || {}).value || 'neutral');
  const icon = String((document.getElementById('rpg-role-icon') || {}).value || 'star.svg');
  const color = String((document.getElementById('rpg-role-color') || {}).value || '#e2c96e');
  const count = Math.max(0, parseInt((document.getElementById('rpg-role-count') || {}).value, 10) || 0);
  const defaultInteractionId = String((document.getElementById('rpg-role-default-interaction') || {}).value || '').trim();
  const instruction = String((document.getElementById('rpg-role-instruction') || {}).value || '').trim();

  const existing = rpgEditingRoleIndex >= 0 ? wwRoles[rpgEditingRoleIndex] : null;
  const normalized = wwNormalizeRole({
    id: existing && existing.id ? existing.id : rpgGenerateId('role'),
    name,
    alignment,
    icon,
    color,
    count,
    defaultInteractionId,
    instruction
  });

  if (rpgEditingRoleIndex >= 0 && wwRoles[rpgEditingRoleIndex]) {
    wwRoles[rpgEditingRoleIndex] = normalized;
  } else {
    wwRoles.push(normalized);
  }

  // If the role has an instruction and default interaction, link it to its step key
  const customSteps = wwGetCustomRoleSteps();
  const matchedStep = customSteps.find(s => s.title.toLowerCase().startsWith(normalized.name.toLowerCase()));
  if (matchedStep && normalized.defaultInteractionId) {
    rpgStepInteractionByStep[matchedStep.key] = normalized.defaultInteractionId;
  }

  rpgCloseRoleModal();
  wwRenderRoles();
  wwBuildSteps();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
}

function rpgDeleteRole(index) {
  if (index < 0 || index >= wwRoles.length) return;
  wwRoles.splice(index, 1);
  wwStepOrder = wwStepOrder.filter(key => !String(key || '').startsWith('role-'));
  wwRenderRoles();
  wwBuildSteps();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
}

function rpgRenderInteractionsLibrary() {
  const root = document.getElementById('rpg-interactions-library-list');
  if (!root) return;
  root.innerHTML = '';

  if (!rpgInteractions.length) {
    root.innerHTML = '<p class="ww-student-empty">No interactions yet. Click "+ New Interaction" to create one.</p>';
    return;
  }

  rpgInteractions.forEach((rawItem, idx) => {
    const item = rpgCloneInteraction(rawItem);
    const card = document.createElement('div');
    card.className = 'rpg-lib-card';
    card.style.borderLeftColor = (item.statusTag && item.statusTag.color) || '#5b8fcc';

    const head = document.createElement('div');
    head.className = 'rpg-lib-card-head';
    if (item.statusTag && item.statusTag.icon) {
      head.appendChild(rpgCreateSvgIcon(item.statusTag.icon, 'btn-icon'));
    } else {
      head.appendChild(rpgCreateSvgIcon('zap.svg', 'btn-icon'));
    }

    const title = document.createElement('strong');
    title.textContent = item.name;
    head.appendChild(title);

    const modeBadge = document.createElement('span');
    modeBadge.className = 'rpg-meta-pill';
    modeBadge.textContent = item.targetMode === 'multi'
      ? ('Multi (' + item.maxTargets + ')')
      : (item.targetMode === 'single' ? 'Single Target' : 'No Target');
    head.appendChild(modeBadge);

    if (item.animation && item.animation !== 'none') {
      const animBadge = document.createElement('span');
      animBadge.className = 'rpg-meta-pill';
      animBadge.textContent = item.animation;
      head.appendChild(animBadge);
    }

    const actions = document.createElement('div');
    actions.className = 'rpg-lib-card-actions';

    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'action-btn btn-orange ww-icon-btn';
    testBtn.title = 'Preview sound & animation';
    testBtn.appendChild(rpgCreateSvgIcon('play.svg', 'btn-icon'));
    testBtn.addEventListener('click', () => {
      if (item.sound) rpgPlaySoundValue(item.sound);
      if (item.animation && item.animation !== 'none') rpgTriggerAnimation(item.animation, card);
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'action-btn btn-grey ww-icon-btn';
    editBtn.title = 'Edit interaction';
    editBtn.appendChild(rpgCreateSvgIcon('edit.svg', 'btn-icon'));
    editBtn.addEventListener('click', () => rpgOpenInteractionModal(idx));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'action-btn btn-orange ww-icon-btn';
    delBtn.title = 'Delete interaction';
    delBtn.appendChild(rpgCreateSvgIcon('trash.svg', 'btn-icon'));
    delBtn.addEventListener('click', () => rpgDeleteInteraction(idx));

    actions.appendChild(testBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    head.appendChild(actions);
    card.appendChild(head);

    if (item.statusTag) {
      const tagPreview = document.createElement('div');
      tagPreview.className = 'rpg-lib-card-desc';
      tagPreview.textContent = 'Applies tag: ' + item.statusTag.label + ' (' + item.effectAction.replace('_', ' ') + ')';
      card.appendChild(tagPreview);
    }

    root.appendChild(card);
  });
}

function rpgOpenInteractionModal(index) {
  rpgEditingInteractionIndex = typeof index === 'number' && index >= 0 ? index : -1;
  const overlay = document.getElementById('rpg-interaction-modal-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('rpg-int-modal-title');
  const nameInput = document.getElementById('rpg-int-name');
  const targetModeSel = document.getElementById('rpg-int-target-mode');
  const maxTargetsInput = document.getElementById('rpg-int-max-targets');
  const effectSel = document.getElementById('rpg-int-effect');
  const tagLabelInput = document.getElementById('rpg-int-tag-label');
  const tagColorSel = document.getElementById('rpg-int-tag-color');
  const tagIconSel = document.getElementById('rpg-int-tag-icon');
  const animSel = document.getElementById('rpg-int-animation');
  const soundSel = document.getElementById('rpg-int-sound');

  if (tagColorSel && !tagColorSel.options.length) {
    RPG_COLOR_OPTIONS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = c.label;
      tagColorSel.appendChild(opt);
    });
  }
  if (tagIconSel && !tagIconSel.options.length) {
    RPG_ICON_OPTIONS.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i.value;
      opt.textContent = i.label;
      tagIconSel.appendChild(opt);
    });
  }
  if (animSel && !animSel.options.length) {
    RPG_ANIMATION_OPTIONS.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.value;
      opt.textContent = a.label;
      animSel.appendChild(opt);
    });
  }
  if (soundSel) {
    soundSel.innerHTML = '<option value="">No sound</option>';
    wwGetAvailableTurnSounds().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = s.label;
      soundSel.appendChild(opt);
    });
  }

  const item = rpgEditingInteractionIndex >= 0 && rpgInteractions[rpgEditingInteractionIndex]
    ? rpgCloneInteraction(rpgInteractions[rpgEditingInteractionIndex])
    : rpgCloneInteraction({
        id: rpgGenerateId('int'),
        name: '',
        targetMode: 'single',
        maxTargets: 1,
        effectAction: 'add_tag',
        statusTag: { id: rpgGenerateId('tag'), label: '', color: '#5b8fcc', icon: 'sparkles.svg', clearOnRoundReset: true },
        animation: 'pulse',
        sound: 'synth:chime'
      });

  if (titleEl) titleEl.textContent = rpgEditingInteractionIndex >= 0 ? 'Edit Interaction' : 'Create New Interaction';
  if (nameInput) nameInput.value = item.name;
  if (targetModeSel) targetModeSel.value = item.targetMode;
  if (maxTargetsInput) maxTargetsInput.value = String(item.maxTargets || 2);
  if (effectSel) effectSel.value = item.effectAction;
  if (tagLabelInput) tagLabelInput.value = item.statusTag ? item.statusTag.label : '';
  if (tagColorSel) tagColorSel.value = item.statusTag ? item.statusTag.color : '#5b8fcc';
  if (tagIconSel) tagIconSel.value = item.statusTag ? item.statusTag.icon : 'sparkles.svg';
  if (animSel) animSel.value = item.animation || 'none';
  if (soundSel) soundSel.value = item.sound || '';

  overlay.classList.add('active');
  if (nameInput) nameInput.focus();
}

function rpgCloseInteractionModal() {
  const overlay = document.getElementById('rpg-interaction-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  rpgEditingInteractionIndex = -1;
}

function rpgSaveInteractionFromModal() {
  const name = String((document.getElementById('rpg-int-name') || {}).value || '').trim();
  if (!name) {
    showToast('Please enter an interaction name.', true);
    return;
  }
  const targetMode = String((document.getElementById('rpg-int-target-mode') || {}).value || 'single');
  const maxTargets = Math.max(1, Math.min(10, parseInt((document.getElementById('rpg-int-max-targets') || {}).value, 10) || 1));
  const effectAction = String((document.getElementById('rpg-int-effect') || {}).value || 'add_tag');
  const tagLabel = String((document.getElementById('rpg-int-tag-label') || {}).value || '').trim();
  const tagColor = String((document.getElementById('rpg-int-tag-color') || {}).value || '#5b8fcc');
  const tagIcon = String((document.getElementById('rpg-int-tag-icon') || {}).value || 'sparkles.svg');
  const animation = String((document.getElementById('rpg-int-animation') || {}).value || 'none');
  const sound = String((document.getElementById('rpg-int-sound') || {}).value || '');

  const existing = rpgEditingInteractionIndex >= 0 ? rpgInteractions[rpgEditingInteractionIndex] : null;
  const saved = rpgCloneInteraction({
    id: existing && existing.id ? existing.id : rpgGenerateId('int'),
    name,
    targetMode,
    maxTargets,
    effectAction,
    statusTag: tagLabel ? {
      id: (existing && existing.statusTag && existing.statusTag.id) || tagLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label: tagLabel,
      color: tagColor,
      icon: tagIcon,
      clearOnRoundReset: true
    } : null,
    animation,
    sound
  });

  if (rpgEditingInteractionIndex >= 0 && rpgInteractions[rpgEditingInteractionIndex]) {
    rpgInteractions[rpgEditingInteractionIndex] = saved;
  } else {
    rpgInteractions.push(saved);
  }

  rpgCloseInteractionModal();
  rpgRenderInteractionsLibrary();
  wwRenderFieldsInOrder();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
}

function rpgDeleteInteraction(index) {
  if (index < 0 || index >= rpgInteractions.length) return;
  const removed = rpgInteractions[index];
  rpgInteractions.splice(index, 1);
  if (removed && removed.id) {
    Object.keys(rpgStepInteractionByStep).forEach(k => {
      if (rpgStepInteractionByStep[k] === removed.id) delete rpgStepInteractionByStep[k];
    });
  }
  rpgRenderInteractionsLibrary();
  wwRenderFieldsInOrder();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
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
  wwRoles.push(wwNormalizeRole(fromCatalog || { ...chosenRole, count: 1 }));
  wwRenderRoles();
  wwBuildSteps();
  wwRenderCurrentStep();
  wwBroadcastPresentation();
}

function wwRenderRoles() {
  wwRenderFieldsInOrder();
  if (typeof wwRenderPickedPlayers === 'function') wwRenderPickedPlayers();
  wwRenderStepOrderList();
  if (typeof wwBroadcastPresentation === 'function') wwBroadcastPresentation();
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

    const head = document.createElement('div');
    head.className = 'ww-instr-head';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'ww-role-drag ww-instr-drag';
    dragHandle.title = 'Drag to reorder';
    dragHandle.appendChild(rpgCreateSvgIcon('grip.svg', 'btn-icon'));
    head.appendChild(dragHandle);

    if (isBaseKey) {
      const lbl = document.createElement('label');
      lbl.className = 'ww-field-label';
      lbl.textContent = WW_BASE_STEP_TITLES[key] || key;
      head.appendChild(lbl);
    } else if (isRoleKey) {
      const roleInfo = roleByKey.get(key);
      const role = roleInfo ? roleInfo.role : null;
      if (role) {
        head.appendChild(rpgCreateSvgIcon(role.icon || 'star.svg', 'btn-icon'));
        const roleName = document.createElement('span');
        roleName.className = 'ww-role-name';
        roleName.textContent = String(role.name || '');
        const alignBadge = document.createElement('span');
        alignBadge.className = 'ww-align-badge ' + wwGetAlignmentClass(role.alignment);
        alignBadge.textContent = wwGetAlignmentLabel(role.alignment);
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
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
      delBtn.type = 'button';
      delBtn.className = 'action-btn btn-orange';
      delBtn.appendChild(rpgCreateSvgIcon('close.svg', 'btn-icon'));
      delBtn.title = 'Delete step';
      delBtn.style.marginLeft = 'auto';
      delBtn.addEventListener('click', function () { wwDeleteExtraStep(key); });
      head.appendChild(titleInput);
      head.appendChild(delBtn);
    }
    block.appendChild(head);

    const textarea = document.createElement('textarea');
    textarea.className = isRoleKey ? 'ww-role-textarea' : 'ww-textarea';
    textarea.placeholder = 'Step / Role instruction shown to players…';
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

    const controls = document.createElement('div');
    controls.className = 'ww-inline-controls ww-primary-controls';
    controls.style.marginTop = '6px';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'action-btn btn-grey ww-icon-btn';
    upBtn.title = 'Move up';
    upBtn.appendChild(rpgCreateSvgIcon('arrow-up.svg', 'btn-icon'));
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', function () { wwMoveStepOrderItem(key, -1); });

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'action-btn btn-grey ww-icon-btn';
    downBtn.title = 'Move down';
    downBtn.appendChild(rpgCreateSvgIcon('arrow-down.svg', 'btn-icon'));
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
    soundBtn.type = 'button';
    soundBtn.className = 'action-btn btn-orange ww-order-test-btn';
    soundBtn.title = 'Test turn sound';
    soundBtn.appendChild(rpgCreateSvgIcon('volume.svg', 'btn-icon'));
    soundBtn.addEventListener('click', function () { wwPlayTurnSoundForKey(key); });

    // Interaction selector
    const intSel = document.createElement('select');
    intSel.className = 'ww-select rpg-step-int-select';
    intSel.title = 'Interaction for this step';
    intSel.innerHTML = '<option value="">No interaction</option>';
    rpgInteractions.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = 'Action: ' + item.name;
      intSel.appendChild(opt);
    });
    const currentInt = rpgGetStepInteraction(key);
    intSel.value = currentInt ? currentInt.id : '';
    intSel.addEventListener('change', function () {
      rpgSetStepInteraction(key, intSel.value || '');
    });

    // Animation selector
    const animSel = document.createElement('select');
    animSel.className = 'ww-select rpg-step-anim-select';
    animSel.title = 'Animation on turn start';
    RPG_ANIMATION_OPTIONS.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.value;
      opt.textContent = a.value === 'none' ? 'No animation' : ('Anim: ' + a.label);
      animSel.appendChild(opt);
    });
    animSel.value = rpgGetStepAnimation(key);
    animSel.addEventListener('change', function () {
      rpgSetStepAnimation(key, animSel.value || 'none');
      if (animSel.value && animSel.value !== 'none') rpgTriggerAnimation(animSel.value, block);
    });

    const hasAdvancedOptions = wwIsTurnSoundChoiceEnabled(key);
    const isOptionsOpen = !!wwExpandedStepOptions[key];
    const optionsBtn = document.createElement('button');
    optionsBtn.type = 'button';
    optionsBtn.className = 'action-btn btn-grey ww-step-options-btn' + (hasAdvancedOptions ? ' has-active' : '');
    optionsBtn.title = 'Popup options';
    optionsBtn.appendChild(rpgCreateSvgIcon('settings.svg', 'btn-icon'));
    optionsBtn.appendChild(document.createTextNode(' Options'));

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(soundSel);
    controls.appendChild(soundBtn);
    controls.appendChild(intSel);
    controls.appendChild(animSel);
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
      optionsBtn.classList.toggle('has-active', enabled);
    });
    promptInput.addEventListener('input', function () {
      wwSetTurnSoundPromptForStep(key, promptInput.value || '');
    });

    choiceControls.appendChild(askLabel);
    choiceControls.appendChild(askCheck);
    choiceControls.appendChild(promptInput);
    optionsPanel.appendChild(choiceControls);
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

function wwAddRoleRow(role) {
  wwRoles.push(wwNormalizeRole(role || { name: '', instruction: '', count: 1 }));
  wwRenderRoles();
}

function wwUpdateRoleField(index, field, value) {
  if (!wwRoles[index]) return;
  if (field === 'count') wwRoles[index][field] = Math.max(0, parseInt(value, 10) || 0);
  else wwRoles[index][field] = String(value || '').trim();
  if (typeof wwRenderPickedPlayers === 'function') wwRenderPickedPlayers();
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

function wwGetRawSteps() {
  const customSteps = wwGetCustomRoleSteps();
  const base = [];
  ['sleep', 'werewolf', 'seer', 'doctor'].forEach(k => {
    const title = WW_BASE_STEP_TITLES[k];
    const text = String(wwBaseInstructions[k] || '');
    if (title || text) base.push({ key: k, title: title || k, text });
  });
  return [
    ...base,
    ...customSteps,
    ...['wake', 'vote'].filter(k => WW_BASE_STEP_TITLES[k] || wwBaseInstructions[k]).map(k => ({
      key: k,
      title: WW_BASE_STEP_TITLES[k] || k,
      text: String(wwBaseInstructions[k] || '')
    })),
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

  wwStepOrder = out;
  return out;
}

function wwRenderStepOrderList() {
  const root = document.getElementById('ww-order-list');
  if (!root) return;
  const raw = wwGetRawSteps();
  wwNormalizeStepOrder(raw);
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
