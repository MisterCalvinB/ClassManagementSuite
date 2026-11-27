// =============================================
// ROLE-PLAYING GAME (RPG) MODERATOR — DATA & PRESETS
// =============================================

const RPG_STORAGE_KEYS = {
  dead: 'werewolf_dead_students_v1',
  tags: 'rpg_player_tags_v1',
  killSound: 'werewolf_kill_sound_v1',
  turnSounds: 'werewolf_turn_sounds_v1',
  auto: 'werewolf_auto_settings_v1',
  voteTimer: 'werewolf_vote_timer_v1',
  activePreset: 'rpg_active_preset_v1'
};

const RPG_DIR = 'rpg';
const RPG_DEFAULT_REL_PATH = 'rpg/rpg-custom.js';
const WW_LEGACY_CUSTOM_REL_PATH = 'werewolf/werewolf-custom.js';
const WW_LEGACY_ROLES_REL_PATH = 'werewolf/werewolves-roles.js';

const RPG_ICON_OPTIONS = [
  { value: 'werewolf.svg', label: 'Werewolf' },
  { value: 'theater.svg', label: 'Theater' },
  { value: 'eye.svg', label: 'Eye / Seer' },
  { value: 'lock.svg', label: 'Shield / Lock' },
  { value: 'sparkles.svg', label: 'Sparkles / Magic' },
  { value: 'award.svg', label: 'Award / Crown' },
  { value: 'users.svg', label: 'Villagers / Group' },
  { value: 'bell.svg', label: 'Bell / Alert' },
  { value: 'zap.svg', label: 'Lightning / Action' },
  { value: 'flag.svg', label: 'Flag / Faction' },
  { value: 'lightbulb.svg', label: 'Idea / Clue' },
  { value: 'mute.svg', label: 'Mute / Silence' },
  { value: 'dice.svg', label: 'Dice / Chance' },
  { value: 'book.svg', label: 'Book / Lore' },
  { value: 'star.svg', label: 'Star / Special' },
  { value: 'brain.svg', label: 'Mind / Psychic' },
  { value: 'check-circle.svg', label: 'Check / Safe' }
];

const RPG_COLOR_OPTIONS = [
  { value: '#6abf8e', label: 'Sage Green' },
  { value: '#c96b6b', label: 'Rose Red' },
  { value: '#5b8fcc', label: 'Slate Blue' },
  { value: '#8b7cc2', label: 'Muted Violet' },
  { value: '#e2c96e', label: 'Warm Amber' },
  { value: '#d4895a', label: 'Terracotta' },
  { value: '#d97fa8', label: 'Muted Rose' },
  { value: '#4aabac', label: 'Muted Teal' }
];

const RPG_ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'flash', label: 'Flash' },
  { value: 'shake', label: 'Shake' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'night-fade', label: 'Night Fade' },
  { value: 'reveal-flip', label: 'Reveal Flip' },
  { value: 'slash', label: 'Strike / Slash' }
];

const RPG_SYNTH_SOUNDS = [
  { value: 'synth:chime', label: 'Synth: Gentle Chime' },
  { value: 'synth:bell', label: 'Synth: Town Bell' },
  { value: 'synth:howl', label: 'Synth: Night Howl' },
  { value: 'synth:shield', label: 'Synth: Shield Ward' },
  { value: 'synth:reveal', label: 'Synth: Mystery Reveal' },
  { value: 'synth:drum', label: 'Synth: Tension Drum' },
  { value: 'synth:eliminated', label: 'Synth: Elimination Hit' },
  { value: 'synth:alert', label: 'Synth: Quick Alert' }
];

const RPG_DEFAULT_INTERACTIONS = [
  {
    id: 'elim',
    name: 'Eliminate',
    targetMode: 'single',
    maxTargets: 1,
    effectAction: 'eliminate',
    statusTag: null,
    animation: 'slash',
    sound: 'synth:eliminated'
  },
  {
    id: 'protect',
    name: 'Protect',
    targetMode: 'single',
    maxTargets: 1,
    effectAction: 'add_tag',
    statusTag: { id: 'protected', label: 'Protected', color: '#6abf8e', icon: 'lock.svg', clearOnRoundReset: true },
    animation: 'pulse',
    sound: 'synth:shield'
  },
  {
    id: 'inspect',
    name: 'Inspect',
    targetMode: 'single',
    maxTargets: 1,
    effectAction: 'add_tag',
    statusTag: { id: 'inspected', label: 'Inspected', color: '#5b8fcc', icon: 'eye.svg', clearOnRoundReset: true },
    animation: 'reveal-flip',
    sound: 'synth:reveal'
  },
  {
    id: 'silence',
    name: 'Silence',
    targetMode: 'single',
    maxTargets: 1,
    effectAction: 'toggle_tag',
    statusTag: { id: 'silenced', label: 'Silenced', color: '#8b7cc2', icon: 'mute.svg', clearOnRoundReset: true },
    animation: 'night-fade',
    sound: 'synth:bell'
  },
  {
    id: 'charm',
    name: 'Charm (Multi)',
    targetMode: 'multi',
    maxTargets: 2,
    effectAction: 'toggle_tag',
    statusTag: { id: 'charmed', label: 'Charmed', color: '#d97fa8', icon: 'sparkles.svg', clearOnRoundReset: false },
    animation: 'spotlight',
    sound: 'synth:chime'
  }
];

const RPG_PRESETS = {
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf (Classic)',
    baseStepTitles: {
      sleep: 'Sleep',
      werewolf: 'Werewolves',
      seer: 'Seer',
      doctor: 'Doctor',
      wake: 'Wake Up',
      vote: 'Vote'
    },
    instructions: {
      sleep: 'Now everybody goes to bed and sleeps.',
      werewolf: 'Werewolves, wake up quietly and choose someone.',
      seer: 'Seer, wake up and check one player.',
      doctor: 'Doctor, wake up and protect one player.',
      wake: 'Everybody wake up. Discuss what happened last night.',
      vote: 'Now vote: who should be eliminated?'
    },
    roles: [
      { id: 'role-villager', name: 'Villager', alignment: 'village', icon: 'users.svg', color: '#6abf8e', count: 0, instruction: 'Villagers sleep through the night and debate during the day.', defaultInteractionId: '' },
      { id: 'role-werewolf', name: 'Werewolf', alignment: 'werewolf', icon: 'werewolf.svg', color: '#c96b6b', count: 2, instruction: 'Werewolves, wake up quietly and choose a target.', defaultInteractionId: 'elim' },
      { id: 'role-seer', name: 'Seer', alignment: 'village', icon: 'eye.svg', color: '#5b8fcc', count: 1, instruction: 'Seer, wake up and inspect one player.', defaultInteractionId: 'inspect' },
      { id: 'role-doctor', name: 'Doctor', alignment: 'village', icon: 'lock.svg', color: '#6abf8e', count: 1, instruction: 'Doctor, wake up and protect one player.', defaultInteractionId: 'protect' }
    ],
    stepInteractions: {
      werewolf: 'elim',
      seer: 'inspect',
      doctor: 'protect',
      vote: 'elim'
    },
    stepAnimations: {
      sleep: 'night-fade',
      werewolf: 'shake',
      seer: 'reveal-flip',
      doctor: 'pulse',
      wake: 'spotlight',
      vote: 'flash'
    },
    turnSounds: {
      sleep: 'synth:night-fade',
      wake: 'synth:bell'
    }
  },
  mystery: {
    id: 'mystery',
    name: 'Mystery / Syndicate',
    baseStepTitles: {
      sleep: 'Lights Out',
      werewolf: 'Syndicate',
      seer: 'Detective',
      doctor: 'Guardian',
      wake: 'Morning Briefing',
      vote: 'Town Trial'
    },
    instructions: {
      sleep: 'Everyone closes their eyes as night falls over the city.',
      werewolf: 'Syndicate agents, open your eyes and select a target.',
      seer: 'Detective, inspect one suspect file.',
      doctor: 'Guardian, choose one citizen to shield tonight.',
      wake: 'Morning arrives. Share clues and debate!',
      vote: 'Cast your votes to detain a suspect.'
    },
    roles: [
      { id: 'role-citizen', name: 'Citizen', alignment: 'village', icon: 'users.svg', color: '#6abf8e', count: 0, instruction: 'Gather clues and vote wisely during the day.', defaultInteractionId: '' },
      { id: 'role-syndicate', name: 'Syndicate', alignment: 'werewolf', icon: 'zap.svg', color: '#c96b6b', count: 2, instruction: 'Syndicate, choose your target silently.', defaultInteractionId: 'elim' },
      { id: 'role-detective', name: 'Detective', alignment: 'village', icon: 'lightbulb.svg', color: '#5b8fcc', count: 1, instruction: 'Detective, investigate one player.', defaultInteractionId: 'inspect' },
      { id: 'role-guardian', name: 'Guardian', alignment: 'village', icon: 'lock.svg', color: '#4aabac', count: 1, instruction: 'Guardian, shield one player.', defaultInteractionId: 'protect' }
    ],
    stepInteractions: {
      werewolf: 'elim',
      seer: 'inspect',
      doctor: 'protect',
      vote: 'elim'
    },
    stepAnimations: {
      sleep: 'night-fade',
      werewolf: 'slash',
      seer: 'reveal-flip',
      doctor: 'pulse',
      wake: 'spotlight',
      vote: 'flash'
    },
    turnSounds: {
      wake: 'synth:chime'
    }
  },
  blank: {
    id: 'blank',
    name: 'Blank Custom RPG',
    baseStepTitles: {
      sleep: 'Phase 1: Setup',
      werewolf: '',
      seer: '',
      doctor: '',
      wake: 'Phase 2: Discussion',
      vote: 'Phase 3: Resolution'
    },
    instructions: {
      sleep: 'Prepare your roles and begin the round.',
      werewolf: '',
      seer: '',
      doctor: '',
      wake: 'Players discuss and share information.',
      vote: 'Resolve the round actions.'
    },
    roles: [
      { id: 'role-player', name: 'Player', alignment: 'neutral', icon: 'users.svg', color: '#e2c96e', count: 0, instruction: '', defaultInteractionId: '' }
    ],
    stepInteractions: {},
    stepAnimations: {
      sleep: 'pulse',
      wake: 'spotlight',
      vote: 'flash'
    },
    turnSounds: {}
  }
};

// Shared mutable RPG state (also powers legacy ww* aliases)
let wwSteps = [];
let wwCurrentStep = -1;
let wwAutoTimer = null;
let wwKillSoundFiles = [];
let wwKillAudio = null;
let wwCurrentGroup = '';
let wwActiveCustomRelPath = RPG_DEFAULT_REL_PATH;
let wwDeadByGroup = {};
let rpgPlayerTagsByGroup = {};
let wwRoles = [];
let wwRoleCatalog = [];
let rpgInteractions = RPG_DEFAULT_INTERACTIONS.map(item => rpgCloneInteraction(item));
let rpgActivePresetId = 'werewolf';
let wwRoleDragIndex = -1;
let wwStepOrderDragIndex = -1;
let wwPickedPlayers = [];
let wwStepOrder = [];
let WW_BASE_STEP_TITLES = { ...RPG_PRESETS.werewolf.baseStepTitles };
let wwBaseInstructions = { ...RPG_PRESETS.werewolf.instructions };
let wwExtraSteps = [];
let wwExtraStepNextId = 1;
let wwTurnSoundsByStep = {};
let wwTurnSoundChoiceEnabledByStep = {};
let wwTurnSoundPromptTextByStep = {};
let wwTurnKillStepEnabledByStep = {};
let rpgStepInteractionByStep = { ...RPG_PRESETS.werewolf.stepInteractions };
let rpgStepAnimationByStep = { ...RPG_PRESETS.werewolf.stepAnimations };
let wwTurnAudio = null;
let wwTurnSoundChoiceResolver = null;
let wwShowRolesOnChips = false;
let wwExpandedStepOptions = {};
let rpgMultiTargetSelection = [];
let rpgLastAnimNonce = 0;
let rpgLastAnimName = 'none';
let wwVoteTimerState = {
  running: false,
  stepKey: '',
  endsAt: 0,
  tickId: null,
  timeoutId: null
};

function rpgGenerateId(prefix) {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return (prefix ? prefix + '-' : '') + crypto.randomUUID();
    }
  } catch (e) { }
  return (prefix ? prefix + '-' : '') + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function rpgCloneInteraction(item) {
  const src = item && typeof item === 'object' ? item : {};
  return {
    id: String(src.id || rpgGenerateId('int')),
    name: String(src.name || 'Custom Interaction').trim(),
    targetMode: ['none', 'single', 'multi'].includes(src.targetMode) ? src.targetMode : 'single',
    maxTargets: Math.max(1, Math.min(10, parseInt(src.maxTargets, 10) || 1)),
    effectAction: ['eliminate', 'restore', 'add_tag', 'remove_tag', 'toggle_tag', 'announce_only'].includes(src.effectAction)
      ? src.effectAction
      : 'add_tag',
    statusTag: src.statusTag && typeof src.statusTag === 'object' && String(src.statusTag.label || '').trim()
      ? {
          id: String(src.statusTag.id || rpgGenerateId('tag')),
          label: String(src.statusTag.label || '').trim(),
          color: String(src.statusTag.color || '#5b8fcc'),
          icon: String(src.statusTag.icon || 'sparkles.svg'),
          clearOnRoundReset: src.statusTag.clearOnRoundReset !== false
        }
      : null,
    animation: RPG_ANIMATION_OPTIONS.some(a => a.value === src.animation) ? src.animation : 'none',
    sound: wwNormalizeSoundPath(src.sound || '')
  };
}

function wwNormalizeAlignment(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'neutral';
  if (raw === 'village' || raw === 'villager' || raw === 'good' || raw === 'town') return 'village';
  if (raw === 'werewolf' || raw === 'wolf' || raw === 'evil' || raw === 'mafia') return 'werewolf';
  if (raw === 'neutral') return 'neutral';
  return raw;
}

function wwGetAlignmentLabel(value) {
  const key = wwNormalizeAlignment(value);
  if (key === 'village') return 'Village / Allies';
  if (key === 'werewolf') return 'Werewolf / Antagonist';
  if (key === 'neutral') return 'Neutral / Custom';
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Neutral';
}

function wwGetAlignmentClass(value) {
  const key = wwNormalizeAlignment(value);
  if (key === 'village' || key === 'werewolf' || key === 'neutral') return 'ww-align-' + key;
  return 'ww-align-unknown';
}

function wwNormalizeRole(role) {
  const src = role && typeof role === 'object' ? role : {};
  const alignment = wwNormalizeAlignment(src.alignment || src.faction);
  const defaultColor = alignment === 'werewolf' ? '#c96b6b' : (alignment === 'village' ? '#6abf8e' : '#e2c96e');
  const defaultIcon = alignment === 'werewolf' ? 'werewolf.svg' : (alignment === 'village' ? 'users.svg' : 'star.svg');
  return {
    id: String(src.id || rpgGenerateId('role')),
    name: String(src.name || '').trim(),
    instruction: String(src.instruction || '').trim(),
    alignment,
    icon: String(src.icon || defaultIcon).trim() || defaultIcon,
    color: String(src.color || defaultColor).trim() || defaultColor,
    count: Math.max(0, parseInt(src.count, 10) || 0),
    defaultInteractionId: String(src.defaultInteractionId || '').trim()
  };
}

function wwGetRoleIdentity(role) {
  const normalized = wwNormalizeRole(role);
  return normalized.name.toLowerCase() + '|' + normalized.alignment;
}

function wwGetBaseRoleNames() {
  return ['Villager', 'Werewolf', 'Seer', 'Doctor'];
}

function wwGetAllRoleNames() {
  const out = new Set();
  wwRoles.forEach(role => {
    const name = String(role && role.name || '').trim();
    if (name) out.add(name);
  });
  wwRoleCatalog.forEach(role => {
    const name = String(role && role.name || '').trim();
    if (name) out.add(name);
  });
  if (!out.size) {
    wwGetBaseRoleNames().forEach(n => out.add(n));
  }
  return Array.from(out);
}

function rpgGetRoleByName(roleName) {
  const target = String(roleName || '').trim().toLowerCase();
  if (!target) return null;
  return wwRoles.find(r => String(r.name || '').trim().toLowerCase() === target)
    || wwRoleCatalog.find(r => String(r.name || '').trim().toLowerCase() === target)
    || null;
}

function rpgGetInteractionById(id) {
  const target = String(id || '').trim();
  if (!target) return null;
  return rpgInteractions.find(i => i.id === target) || null;
}

function rpgGetStepInteraction(stepKey) {
  const key = String(stepKey || '').trim();
  if (!key) return null;
  const id = (rpgStepInteractionByStep || {})[key] || (wwIsTurnKillStepEnabled(key) ? 'elim' : '');
  return id ? rpgGetInteractionById(id) : null;
}

function rpgSetStepInteraction(stepKey, interactionId) {
  const key = String(stepKey || '').trim();
  if (!key) return;
  const id = String(interactionId || '').trim();
  if (!id) {
    delete rpgStepInteractionByStep[key];
    delete wwTurnKillStepEnabledByStep[key];
  } else {
    rpgStepInteractionByStep[key] = id;
    if (id === 'elim') wwTurnKillStepEnabledByStep[key] = true;
    else delete wwTurnKillStepEnabledByStep[key];
  }
  wwStoreTurnSoundSettings();
  if (typeof wwRenderCurrentStep === 'function') wwRenderCurrentStep();
}

function rpgGetStepAnimation(stepKey) {
  const key = String(stepKey || '').trim();
  if (!key) return 'none';
  return String((rpgStepAnimationByStep || {})[key] || 'none');
}

function rpgSetStepAnimation(stepKey, animName) {
  const key = String(stepKey || '').trim();
  if (!key) return;
  const val = String(animName || 'none').trim();
  if (!val || val === 'none') delete rpgStepAnimationByStep[key];
  else rpgStepAnimationByStep[key] = val;
  wwStoreTurnSoundSettings();
}

function wwNormalizeSoundPath(pathValue) {
  const raw = String(pathValue || '').trim();
  if (!raw) return '';
  if (raw.startsWith('synth:')) return raw;
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return '';
  return normalized.startsWith('sounds/') ? normalized : ('sounds/' + normalized);
}

function wwPathToFileUrl(absPath) {
  return 'file:///' + encodeURI(String(absPath || '').replace(/\\/g, '/'));
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

function wwBuildCustomConfig() {
  const turnSounds = {};
  const turnSoundChoices = {};
  const turnSoundPromptTexts = {};
  const turnKillSteps = {};
  const stepInteractions = {};
  const stepAnimations = {};

  const rawSteps = typeof wwGetRawSteps === 'function' ? wwGetRawSteps() : [];
  wwNormalizeTurnSoundMap(rawSteps);
  wwNormalizeTurnSoundChoiceMap(rawSteps);
  wwNormalizeTurnSoundPromptMap(rawSteps);
  wwNormalizeTurnKillStepMap(rawSteps);

  Object.keys(wwTurnSoundsByStep || {}).forEach(key => {
    const rel = String(wwTurnSoundsByStep[key] || '').trim();
    if (rel) turnSounds[key] = rel;
  });
  Object.keys(wwTurnSoundChoiceEnabledByStep || {}).forEach(key => {
    if (wwTurnSoundChoiceEnabledByStep[key]) turnSoundChoices[key] = true;
  });
  Object.keys(wwTurnSoundPromptTextByStep || {}).forEach(key => {
    const txt = String(wwTurnSoundPromptTextByStep[key] || '').trim();
    if (txt) turnSoundPromptTexts[key] = txt;
  });
  Object.keys(wwTurnKillStepEnabledByStep || {}).forEach(key => {
    if (wwTurnKillStepEnabledByStep[key]) turnKillSteps[key] = true;
  });
  Object.keys(rpgStepInteractionByStep || {}).forEach(key => {
    const id = String(rpgStepInteractionByStep[key] || '').trim();
    if (id) stepInteractions[key] = id;
  });
  Object.keys(rpgStepAnimationByStep || {}).forEach(key => {
    const anim = String(rpgStepAnimationByStep[key] || '').trim();
    if (anim && anim !== 'none') stepAnimations[key] = anim;
  });

  return {
    version: 2,
    presetId: rpgActivePresetId || 'werewolf',
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
      turnKillSteps,
      stepInteractions,
      stepAnimations
    },
    baseStepTitles: { ...WW_BASE_STEP_TITLES },
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
    interactions: rpgInteractions.map(rpgCloneInteraction),
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

  rpgActivePresetId = String(safe.presetId || 'werewolf');
  const presetSelect = document.getElementById('rpg-preset-select');
  if (presetSelect && RPG_PRESETS[rpgActivePresetId]) presetSelect.value = rpgActivePresetId;

  if (safe.baseStepTitles && typeof safe.baseStepTitles === 'object') {
    WW_BASE_STEP_TITLES = {
      sleep: String(safe.baseStepTitles.sleep || 'Sleep'),
      werewolf: String(safe.baseStepTitles.werewolf || 'Werewolves'),
      seer: String(safe.baseStepTitles.seer || 'Seer'),
      doctor: String(safe.baseStepTitles.doctor || 'Doctor'),
      wake: String(safe.baseStepTitles.wake || 'Wake Up'),
      vote: String(safe.baseStepTitles.vote || 'Vote')
    };
  } else {
    WW_BASE_STEP_TITLES = { ...RPG_PRESETS.werewolf.baseStepTitles };
  }

  wwBaseInstructions = {
    sleep: String(inst.sleep ?? RPG_PRESETS.werewolf.instructions.sleep),
    werewolf: String(inst.werewolf ?? RPG_PRESETS.werewolf.instructions.werewolf),
    seer: String(inst.seer ?? RPG_PRESETS.werewolf.instructions.seer),
    doctor: String(inst.doctor ?? RPG_PRESETS.werewolf.instructions.doctor),
    wake: String(inst.wake ?? RPG_PRESETS.werewolf.instructions.wake),
    vote: String(inst.vote ?? RPG_PRESETS.werewolf.instructions.vote)
  };

  if (Array.isArray(safe.interactions) && safe.interactions.length) {
    rpgInteractions = safe.interactions.map(rpgCloneInteraction);
  } else {
    rpgInteractions = RPG_DEFAULT_INTERACTIONS.map(rpgCloneInteraction);
  }

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
      if (stepKey && set.turnSoundChoices[key]) wwTurnSoundChoiceEnabledByStep[stepKey] = true;
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
      if (stepKey && set.turnKillSteps[key]) wwTurnKillStepEnabledByStep[stepKey] = true;
    });
  }

  rpgStepInteractionByStep = {};
  if (set.stepInteractions && typeof set.stepInteractions === 'object') {
    Object.keys(set.stepInteractions).forEach(key => {
      const stepKey = String(key || '').trim();
      const id = String(set.stepInteractions[key] || '').trim();
      if (stepKey && id) rpgStepInteractionByStep[stepKey] = id;
    });
  } else {
    // Legacy v1 migration: convert turnKillSteps to 'elim' interaction
    Object.keys(wwTurnKillStepEnabledByStep).forEach(stepKey => {
      if (wwTurnKillStepEnabledByStep[stepKey]) rpgStepInteractionByStep[stepKey] = 'elim';
    });
  }

  rpgStepAnimationByStep = {};
  if (set.stepAnimations && typeof set.stepAnimations === 'object') {
    Object.keys(set.stepAnimations).forEach(key => {
      const stepKey = String(key || '').trim();
      const anim = String(set.stepAnimations[key] || '').trim();
      if (stepKey && anim && anim !== 'none') rpgStepAnimationByStep[stepKey] = anim;
    });
  }

  if (Array.isArray(safe.roles) && safe.roles.length) {
    wwRoles = safe.roles.map(wwNormalizeRole).filter(r => r.name);
  }
  wwStepOrder = Array.isArray(safe.stepOrder) ? safe.stepOrder.map(v => String(v || '')).filter(Boolean) : [];
  if (typeof wwRenderRoles === 'function') wwRenderRoles();

  wwPickedPlayers = Array.isArray(safe.pickedPlayers)
    ? safe.pickedPlayers.map(p => ({
        name: String(p && p.name || '').trim(),
        role: String(p && p.role || 'Villager').trim() || 'Villager',
        absent: !!(p && p.absent)
      })).filter(p => p.name)
    : [];
  if (typeof wwRenderPickedPlayers === 'function') wwRenderPickedPlayers();

  if (safe.group && typeof wwSetGroup === 'function') wwSetGroup(String(safe.group));
  else if (typeof wwRenderStudents === 'function') wwRenderStudents();

  if (typeof wwStopVoteTimer === 'function') wwStopVoteTimer();
  if (typeof wwStoreAutoSettings === 'function') wwStoreAutoSettings();
  if (typeof wwStoreVoteTimerSettings === 'function') wwStoreVoteTimerSettings();
  if (typeof wwOnKillSoundChange === 'function') wwOnKillSoundChange();
  if (typeof wwStoreTurnSoundSettings === 'function') wwStoreTurnSoundSettings();
  if (typeof wwBuildSteps === 'function') wwBuildSteps();
  if (typeof wwRenderCurrentStep === 'function') wwRenderCurrentStep();
  if (typeof wwBroadcastPresentation === 'function') wwBroadcastPresentation();
}

function rpgApplyPreset(presetId) {
  const preset = RPG_PRESETS[presetId];
  if (!preset) return;
  rpgActivePresetId = preset.id;
  try { localStorage.setItem(RPG_STORAGE_KEYS.activePreset, preset.id); } catch (e) { }

  WW_BASE_STEP_TITLES = { ...preset.baseStepTitles };
  wwBaseInstructions = { ...preset.instructions };
  wwRoles = preset.roles.map(wwNormalizeRole);
  wwExtraSteps = [];
  wwStepOrder = [];
  rpgInteractions = RPG_DEFAULT_INTERACTIONS.map(rpgCloneInteraction);
  rpgStepInteractionByStep = { ...(preset.stepInteractions || {}) };
  rpgStepAnimationByStep = { ...(preset.stepAnimations || {}) };
  wwTurnSoundsByStep = { ...(preset.turnSounds || {}) };
  wwTurnKillStepEnabledByStep = {};
  Object.keys(rpgStepInteractionByStep).forEach(k => {
    if (rpgStepInteractionByStep[k] === 'elim') wwTurnKillStepEnabledByStep[k] = true;
  });

  if (typeof wwRenderRoles === 'function') wwRenderRoles();
  if (typeof wwBuildSteps === 'function') wwBuildSteps();
  if (typeof wwRenderCurrentStep === 'function') wwRenderCurrentStep();
  if (typeof wwBroadcastPresentation === 'function') wwBroadcastPresentation();
  if (typeof wwSetStatus === 'function') wwSetStatus('Loaded preset: ' + preset.name, true);
}

function wwSerializeCustomConfig(cfg) {
  return ''
    + '// Role-Playing Game (RPG) Moderator config\n'
    + 'const rpgCustom = ' + JSON.stringify(cfg, null, 2) + ';\n'
    + 'window.RPG_CUSTOM = rpgCustom;\n'
    + 'window.WEREWOLF_CUSTOM = rpgCustom;\n';
}

function wwParseCustomConfigSource(source) {
  const txt = String(source || '');
  const loaded = (new Function(txt + '\n; return (typeof rpgCustom !== "undefined" ? rpgCustom : (typeof RPG_CUSTOM !== "undefined" ? RPG_CUSTOM : (typeof werewolfCustom !== "undefined" ? werewolfCustom : (typeof WEREWOLF_CUSTOM !== "undefined" ? WEREWOLF_CUSTOM : null))));'))();
  return loaded && typeof loaded === 'object' ? loaded : null;
}

function wwParseRolesSource(source) {
  const txt = String(source || '');
  const loaded = (new Function(txt + '\n; return (typeof rpgRoles !== "undefined" ? rpgRoles : (typeof RPG_ROLES !== "undefined" ? RPG_ROLES : (typeof werewolfRoles !== "undefined" ? werewolfRoles : (typeof WEREWOLF_ROLES !== "undefined" ? WEREWOLF_ROLES : null))));'))();
  if (!Array.isArray(loaded)) return [];
  return loaded.map(wwNormalizeRole).filter(r => r.name);
}

async function wwListSetupDbLeafFiles() {
  if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.listByPath === 'function')) {
    return [];
  }
  const entries = [];
  for (const dir of [RPG_DIR, 'werewolf']) {
    try {
      const result = await Desktop.listByPath('customData', dir, { extensions: ['.js'], recursive: false });
      if (!result || !result.ok || !Array.isArray(result.files)) continue;
      result.files.forEach(f => {
        const leaf = wwGetLeafFromRelativePath((f && (f.relativePath || f.filename)) || '');
        if (!leaf || leaf.includes('/')) return;
        if (dir === 'werewolf' && leaf.toLowerCase() === wwGetLeafFromRelativePath(WW_LEGACY_ROLES_REL_PATH).toLowerCase()) return;
        entries.push({ dir, leaf, relPath: dir + '/' + leaf, isLegacy: dir === 'werewolf' });
      });
    } catch { }
  }
  return entries.sort((a, b) => a.relPath.localeCompare(b.relPath, undefined, { sensitivity: 'base' }));
}

async function wwGetValidSetupDbLeafFiles() {
  const all = await wwListSetupDbLeafFiles();
  const valid = [];
  for (const item of all) {
    try {
      const readResult = await Desktop.readByPath('customData', item.relPath, { encoding: 'utf8' });
      if (!readResult || !readResult.ok) continue;
      const parsed = wwParseCustomConfigSource(readResult.content || '');
      if (parsed && typeof parsed === 'object') valid.push(item);
    } catch { }
  }
  return valid;
}

async function wwPickSetupDbLeaf(mode) {
  const isLoad = mode === 'load';
  const allowNew = !isLoad;
  const existingFiles = isLoad
    ? await wwGetValidSetupDbLeafFiles()
    : (await wwListSetupDbLeafFiles()).filter(f => f.dir === RPG_DIR);

  if (isLoad && !existingFiles.length) return '__none__';

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

    titleEl.textContent = isLoad ? 'Load RPG Setup' : 'Save RPG Setup';
    hintEl.textContent = isLoad
      ? 'Choose an RPG (or legacy Werewolf) setup to load.'
      : 'Choose an RPG setup file in user/custom-data/rpg/ or create a new one.';
    newLabel.textContent = 'Setup file name';
    confirmBtn.textContent = isLoad ? 'Load' : 'Save';
    newInput.placeholder = 'e.g. rpg-grade9.js';

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const currentLeaf = wwGetLeafFromRelativePath(wwActiveCustomRelPath || RPG_DEFAULT_REL_PATH);
    const radioName = 'cdbp-file-rpg';

    listEl.innerHTML = existingFiles.map(item => {
      const val = isLoad ? item.relPath : item.leaf;
      const label = item.isLegacy ? ('[Legacy] ' + item.leaf) : item.leaf;
      return '<label class="cdbp-file-item"><input type="radio" name="' + radioName + '" value="' + esc(val) + '"><span>' + esc(label) + '</span></label>';
    }).join('') + (allowNew
      ? '<label class="cdbp-file-item cdbp-new-item"><input type="radio" name="' + radioName + '" value="__new__"><span>New file...</span></label>'
      : '');

    newInput.value = allowNew ? wwNormalizeConfigLeafName(currentLeaf || 'rpg-custom.js') : '';
    newErr.textContent = '';
    newRow.style.display = 'none';

    const radios = listEl.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      let selected = false;
      radios.forEach(r => {
        if (r.value === (isLoad ? wwActiveCustomRelPath : currentLeaf)) {
          r.checked = true;
          selected = true;
        }
      });
      if (!selected) {
        if (allowNew && !existingFiles.length) {
          const last = radios[radios.length - 1];
          if (last) { last.checked = true; newRow.style.display = 'block'; }
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

    function doCancel() { cleanup(); resolve(''); }

    function doConfirm() {
      const selected = listEl.querySelector('input[name="' + radioName + '"]:checked');
      if (!selected) { doCancel(); return; }
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
    newInput.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); doConfirm(); } };
    confirmBtn.onclick = doConfirm;
    cancelBtn.onclick = doCancel;
    closeBtn.onclick = doCancel;
    overlay.onclick = function (e) { if (e.target === overlay) doCancel(); };
    overlay.classList.add('active');
  });
}

async function wwLoadExternalRoles(notifyIfMissing) {
  let sourceText = '';
  const candidatePaths = ['rpg/rpg-roles.js', WW_LEGACY_ROLES_REL_PATH];

  if (window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
    for (const rel of candidatePaths) {
      const result = await Desktop.readByPath('customData', rel, { encoding: 'utf8' });
      if (result && result.ok && result.content) {
        sourceText = String(result.content);
        break;
      }
    }
  } else {
    for (const rel of candidatePaths) {
      try {
        const res = await fetch('user/custom-data/' + rel, { cache: 'no-store' });
        if (res.ok) {
          sourceText = await res.text();
          break;
        }
      } catch (e) { }
    }
  }

  if (!sourceText) {
    if (notifyIfMissing) {
      if (typeof wwSetStatus === 'function') wwSetStatus('No external roles found', false);
      showToast('No external roles file found in user/custom-data/rpg/ or werewolf/', true);
    }
    return false;
  }

  let parsedRoles = [];
  try {
    parsedRoles = wwParseRolesSource(sourceText);
  } catch (e) {
    if (notifyIfMissing) showToast('Saved roles file is invalid.', true);
    return false;
  }

  if (!parsedRoles.length) return false;
  wwRoleCatalog = parsedRoles;
  if (typeof wwRenderRoleChips === 'function') wwRenderRoleChips();
  if (typeof wwRenderRoles === 'function') wwRenderRoles();
  return true;
}

async function wwSaveCustomConfig() {
  if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.saveText === 'function')) {
    showToast('RPG setup save is available in Electron only.', true);
    return;
  }
  const pickedLeaf = await wwPickSetupDbLeaf('save');
  if (!pickedLeaf) return;

  const payload = wwBuildCustomConfig();
  const content = wwSerializeCustomConfig(payload);
  const result = await Desktop.saveText('customData', pickedLeaf, content, RPG_DIR);
  if (result && result.ok) {
    wwActiveCustomRelPath = RPG_DIR + '/' + pickedLeaf;
    if (typeof wwSetStatus === 'function') wwSetStatus('Saved setup as ' + pickedLeaf, true);
  } else {
    if (typeof wwSetStatus === 'function') wwSetStatus('Save failed', false);
    showToast((result && result.error) || 'Unable to save RPG setup file.', true);
  }
}

async function wwLoadCustomConfig(notifyIfMissing) {
  if (!(window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function')) {
    if (notifyIfMissing) showToast('RPG setup load is available in Electron only.', true);
    return;
  }

  let relativePath = wwActiveCustomRelPath || RPG_DEFAULT_REL_PATH;
  if (notifyIfMissing) {
    const picked = await wwPickSetupDbLeaf('load');
    if (picked === '__none__') {
      if (typeof wwSetStatus === 'function') wwSetStatus('No saved setup found', false);
      showToast('No RPG or Werewolf setups found in user/custom-data/.', true);
      return;
    }
    if (!picked) return;
    relativePath = picked;
  }

  let result = await Desktop.readByPath('customData', relativePath, { encoding: 'utf8' });
  if ((!result || !result.ok) && !notifyIfMissing && relativePath === RPG_DEFAULT_REL_PATH) {
    // Fallback to legacy werewolf-custom.js on startup if rpg-custom.js does not exist yet
    result = await Desktop.readByPath('customData', WW_LEGACY_CUSTOM_REL_PATH, { encoding: 'utf8' });
    if (result && result.ok) relativePath = WW_LEGACY_CUSTOM_REL_PATH;
  }

  if (!result || !result.ok) {
    if (notifyIfMissing) {
      if (typeof wwSetStatus === 'function') wwSetStatus('No saved setup found', false);
      showToast('Selected RPG setup file could not be read.', true);
    }
    return;
  }

  let parsed = null;
  try {
    parsed = wwParseCustomConfigSource(result.content || '');
  } catch (e) {
    if (notifyIfMissing) showToast('Saved RPG setup is invalid.', true);
    return;
  }
  if (!parsed) {
    if (notifyIfMissing) showToast('Saved RPG setup is invalid.', true);
    return;
  }

  wwApplyCustomConfig(parsed);
  wwActiveCustomRelPath = relativePath;
  if (typeof wwSetStatus === 'function') wwSetStatus('Loaded setup ' + wwGetLeafFromRelativePath(relativePath), true);
}
