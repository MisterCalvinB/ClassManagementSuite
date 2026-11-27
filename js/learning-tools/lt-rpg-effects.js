// =============================================
// ROLE-PLAYING GAME (RPG) — SOUND & ANIMATION ENGINE
// =============================================

const RPG_ANIM_CLASSES = [
  'rpg-anim-pulse',
  'rpg-anim-flash',
  'rpg-anim-shake',
  'rpg-anim-spotlight',
  'rpg-anim-night-fade',
  'rpg-anim-reveal-flip',
  'rpg-anim-slash'
];

/**
 * Trigger a GPU-composited (transform/opacity) animation on a target element.
 * Cleans up animation classes automatically on animationend.
 */
function rpgTriggerAnimation(animName, targetEl) {
  const anim = String(animName || 'none').trim();
  const el = targetEl || document.getElementById('ww-turn-card');
  if (!el || !anim || anim === 'none') return;
  const cls = 'rpg-anim-' + anim;
  if (!RPG_ANIM_CLASSES.includes(cls)) return;

  RPG_ANIM_CLASSES.forEach(c => el.classList.remove(c));
  void el.offsetWidth;
  el.classList.add(cls);

  const onEnd = () => {
    el.classList.remove(cls);
    el.removeEventListener('animationend', onEnd);
  };
  el.addEventListener('animationend', onEnd);
}

/**
 * Synthesize built-in RPG sound effects via Web Audio API (no external files required).
 */
function rpgPlaySynthSound(soundKey) {
  if (typeof soundMuted !== 'undefined' && soundMuted) return;
  let ctx = null;
  try {
    ctx = typeof getAudioCtx === 'function' ? getAudioCtx() : new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    return;
  }
  if (!ctx) return;
  if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
    ctx.resume().catch(() => { });
  }

  const now = ctx.currentTime;
  const playTone = (freq, startOffset, duration, type, peakGain, endFreq) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + startOffset + duration);
      }
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.linearRampToValueAtTime(peakGain || 0.22, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    } catch (e) { }
  };

  switch (String(soundKey || '')) {
    case 'synth:chime':
      playTone(523.25, 0, 0.35, 'sine', 0.22);
      playTone(659.25, 0.1, 0.38, 'sine', 0.22);
      playTone(783.99, 0.2, 0.5, 'sine', 0.2);
      break;
    case 'synth:bell':
      playTone(880, 0, 0.6, 'triangle', 0.25);
      playTone(1320, 0, 0.4, 'sine', 0.12);
      break;
    case 'synth:howl':
      playTone(220, 0, 0.55, 'sawtooth', 0.12, 392);
      playTone(392, 0.52, 0.75, 'sawtooth', 0.1, 196);
      break;
    case 'synth:shield':
      playTone(330, 0, 0.22, 'triangle', 0.22, 494);
      playTone(494, 0.14, 0.35, 'sine', 0.22, 659);
      break;
    case 'synth:reveal':
      playTone(392, 0, 0.18, 'sine', 0.18);
      playTone(587.33, 0.12, 0.22, 'sine', 0.2);
      playTone(880, 0.24, 0.42, 'triangle', 0.2);
      break;
    case 'synth:drum':
      playTone(140, 0, 0.24, 'sine', 0.32, 55);
      playTone(130, 0.26, 0.28, 'sine', 0.3, 50);
      break;
    case 'synth:eliminated':
      playTone(280, 0, 0.22, 'sawtooth', 0.22, 110);
      playTone(150, 0.14, 0.45, 'sawtooth', 0.24, 65);
      break;
    case 'synth:alert':
      playTone(740, 0, 0.14, 'square', 0.12);
      playTone(987.77, 0.15, 0.2, 'square', 0.12);
      break;
    case 'synth:night-fade':
      playTone(329.63, 0, 0.4, 'sine', 0.18, 220);
      playTone(220, 0.25, 0.55, 'sine', 0.16, 146.83);
      break;
    default:
      playTone(587.33, 0, 0.25, 'sine', 0.2);
      break;
  }
}

async function wwResolveKillSoundUrl(relativePath) {
  const normalized = wwNormalizeSoundPath(relativePath);
  if (!normalized || normalized.startsWith('synth:')) return '';

  if (window.Desktop && Desktop.isElectron() && typeof Desktop.resolvePath === 'function') {
    try {
      const resolved = await Desktop.resolvePath('customData', normalized);
      if (resolved && resolved.path) return wwPathToFileUrl(resolved.path);
    } catch (e) {
      console.warn('Unable to resolve sound path:', e);
    }
  }
  return 'user/custom-data/' + normalized;
}

async function rpgPlaySoundValue(soundValue) {
  const val = wwNormalizeSoundPath(soundValue || '');
  if (!val) return;
  if (val.startsWith('synth:')) {
    rpgPlaySynthSound(val);
    return;
  }
  const url = await wwResolveKillSoundUrl(val);
  if (!url) return;
  try {
    if (wwTurnAudio) {
      wwTurnAudio.pause();
      wwTurnAudio.currentTime = 0;
    }
  } catch (e) { }
  wwTurnAudio = new Audio(url);
  wwTurnAudio.volume = 1;
  wwTurnAudio.play().catch(err => console.warn('Unable to play sound:', err));
}

async function wwPlayKillSound() {
  const sel = document.getElementById('ww-kill-sound-select');
  const rel = sel ? String(sel.value || '') : '';
  if (!rel) return;
  await rpgPlaySoundValue(rel);
}

async function wwPlayTurnSoundForKey(stepKey) {
  const rel = String((wwTurnSoundsByStep || {})[String(stepKey || '')] || '');
  if (!rel) return;
  await rpgPlaySoundValue(rel);
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

function wwGetAvailableTurnSounds() {
  const out = [];
  RPG_SYNTH_SOUNDS.forEach(item => out.push({ value: item.value, label: item.label }));
  wwKillSoundFiles.forEach(rel => {
    if (!out.some(item => item.value === rel)) {
      out.push({ value: rel, label: rel.replace(/^sounds\//, '') });
    }
  });
  return out;
}

function wwRenderKillSoundOptions() {
  const sel = document.getElementById('ww-kill-sound-select');
  if (!sel) return;
  const saved = String(localStorage.getItem(RPG_STORAGE_KEYS.killSound) || '');
  const current = sel.value || saved;
  sel.innerHTML = '<option value="">No sound</option>';

  RPG_SYNTH_SOUNDS.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    sel.appendChild(opt);
  });

  wwKillSoundFiles.forEach(rel => {
    const opt = document.createElement('option');
    opt.value = rel;
    opt.textContent = rel.replace(/^sounds\//, '');
    sel.appendChild(opt);
  });

  const allValues = new Set([...RPG_SYNTH_SOUNDS.map(s => s.value), ...wwKillSoundFiles]);
  const canUseCurrent = current && allValues.has(current);
  sel.value = canUseCurrent ? current : '';
  if (canUseCurrent) {
    try { localStorage.setItem(RPG_STORAGE_KEYS.killSound, current); } catch (e) { }
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
      console.warn('Unable to list sounds:', e);
    }
  }

  wwRenderKillSoundOptions();
  if (typeof wwRenderInlineStepSoundOptions === 'function') wwRenderInlineStepSoundOptions();
  if (typeof wwRenderStepOrderList === 'function') wwRenderStepOrderList();
  if (typeof wwRenderRoles === 'function') wwRenderRoles();
  if (typeof rpgRenderInteractionsLibrary === 'function') rpgRenderInteractionsLibrary();
}

function wwOnKillSoundChange() {
  const sel = document.getElementById('ww-kill-sound-select');
  if (!sel) return;
  try { localStorage.setItem(RPG_STORAGE_KEYS.killSound, sel.value || ''); } catch (e) { }
}
