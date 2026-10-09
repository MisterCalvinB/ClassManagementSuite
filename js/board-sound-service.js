/**
 * Board Sound Service
 * Procedural Web Audio API sound synthesizers & custom sound file playback
 * with recursive subfolder discovery, caching, and debounce protection.
 */
(function (global) {
  'use strict';

  var DEFAULT_SOUND_CONFIG = {
    enabled: true,
    masterVolume: 0.6,
    hostOnly: true,
    customSoundFolder: 'user/custom-data/sounds',
    actions: {
      reveal_node: { sound: 'preset:chime', volume: 1.0, enabled: true },
      mask_node: { sound: 'preset:click', volume: 0.7, enabled: true },
      reveal_note: { sound: 'preset:chime', volume: 1.0, enabled: true },
      mask_note: { sound: 'preset:click', volume: 0.7, enabled: true },
      reveal_group: { sound: 'preset:fanfare', volume: 1.0, enabled: true },
      mask_group: { sound: 'preset:whoosh', volume: 0.8, enabled: true },
      reveal_all: { sound: 'preset:fanfare', volume: 1.0, enabled: true },
      mask_all: { sound: 'preset:whoosh', volume: 0.8, enabled: true },
      create_node: { sound: 'preset:pop', volume: 0.6, enabled: true },
      create_note: { sound: 'preset:pop', volume: 0.6, enabled: true },
      create_table: { sound: 'preset:snap', volume: 0.8, enabled: true },
      create_mask: { sound: 'preset:snap', volume: 0.8, enabled: true },
      paste_item: { sound: 'preset:click', volume: 0.6, enabled: true },
      import_vocab: { sound: 'preset:sparkle', volume: 0.9, enabled: true },
      connect_link: { sound: 'preset:snap', volume: 0.8, enabled: true },
      group_items: { sound: 'preset:snap', volume: 0.8, enabled: true },
      ungroup_items: { sound: 'preset:click', volume: 0.7, enabled: true },
      align_snap: { sound: 'preset:click', volume: 0.5, enabled: false },
      delete_items: { sound: 'preset:whoosh', volume: 0.7, enabled: true },
      clear_drawings: { sound: 'preset:whoosh', volume: 0.7, enabled: true },
      page_switch: { sound: 'preset:whoosh', volume: 0.5, enabled: false },
      freeze_toggle: { sound: 'preset:sparkle', volume: 0.7, enabled: true },
      search_match: { sound: 'preset:ding', volume: 0.7, enabled: true },
      dice_roll: { sound: 'preset:fanfare', volume: 1.0, enabled: true },
      timer_buzzer: { sound: 'preset:ding', volume: 1.0, enabled: true },
      session_save: { sound: 'preset:ding', volume: 0.8, enabled: true },
      autosave_success: { sound: 'preset:click', volume: 0.3, enabled: false },
      export_complete: { sound: 'preset:ding', volume: 0.8, enabled: true }
    }
  };

  var PRESET_DEFINITIONS = [
    { id: 'preset:chime', name: 'Built-in: Chime (High)' },
    { id: 'preset:pop', name: 'Built-in: Bubble Pop' },
    { id: 'preset:click', name: 'Built-in: Soft Click' },
    { id: 'preset:snap', name: 'Built-in: Latch Snap' },
    { id: 'preset:whoosh', name: 'Built-in: Soft Whoosh' },
    { id: 'preset:fanfare', name: 'Built-in: Ascending Fanfare' },
    { id: 'preset:shutter', name: 'Built-in: Camera Shutter' },
    { id: 'preset:ding', name: 'Built-in: Resonant Ding' },
    { id: 'preset:drop', name: 'Built-in: Drop Thud' },
    { id: 'preset:sparkle', name: 'Built-in: Shimmer Sparkle' }
  ];

  var ACTION_METADATA = [
    { id: 'reveal_node', nameKey: 'act_reveal_node', defaultName: 'Reveal Word / Node', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'mask_node', nameKey: 'act_mask_node', defaultName: 'Mask Word / Node', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'reveal_note', nameKey: 'act_reveal_note', defaultName: 'Reveal Sticky Note', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'mask_note', nameKey: 'act_mask_note', defaultName: 'Mask Sticky Note', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'reveal_group', nameKey: 'act_reveal_group', defaultName: 'Reveal Group', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'mask_group', nameKey: 'act_mask_group', defaultName: 'Mask Group', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'reveal_all', nameKey: 'act_reveal_all', defaultName: 'Reveal All Words', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'mask_all', nameKey: 'act_mask_all', defaultName: 'Mask All Words', category: 'visibility', categoryKey: 'act_cat_visibility', defaultCat: 'Visibility & Reveal' },
    { id: 'create_node', nameKey: 'act_create_node', defaultName: 'Add Word Node', category: 'creation', categoryKey: 'act_cat_creation', defaultCat: 'Creation & Placement' },
    { id: 'create_note', nameKey: 'act_create_note', defaultName: 'Add Sticky Note', category: 'creation', categoryKey: 'act_cat_creation', defaultCat: 'Creation & Placement' },
    { id: 'create_table', nameKey: 'act_create_table', defaultName: 'Insert Table Grid', category: 'creation', categoryKey: 'act_cat_creation', defaultCat: 'Creation & Placement' },
    { id: 'create_mask', nameKey: 'act_create_mask', defaultName: 'Add Mask Box', category: 'creation', categoryKey: 'act_cat_creation', defaultCat: 'Creation & Placement' },
    { id: 'paste_item', nameKey: 'act_paste_item', defaultName: 'Paste Clipboard Item', category: 'creation', categoryKey: 'act_cat_creation', defaultCat: 'Creation & Placement' },
    { id: 'import_vocab', nameKey: 'act_import_vocab', defaultName: 'Import Vocab Words', category: 'creation', categoryKey: 'act_cat_creation', defaultCat: 'Creation & Placement' },
    { id: 'connect_link', nameKey: 'act_connect_link', defaultName: 'Connect Link / Edge', category: 'linking', categoryKey: 'act_cat_linking', defaultCat: 'Linking & Structure' },
    { id: 'group_items', nameKey: 'act_group_items', defaultName: 'Group Selection', category: 'linking', categoryKey: 'act_cat_linking', defaultCat: 'Linking & Structure' },
    { id: 'ungroup_items', nameKey: 'act_ungroup_items', defaultName: 'Ungroup Items', category: 'linking', categoryKey: 'act_cat_linking', defaultCat: 'Linking & Structure' },
    { id: 'align_snap', nameKey: 'act_align_snap', defaultName: 'Align / Snap Items', category: 'linking', categoryKey: 'act_cat_linking', defaultCat: 'Linking & Structure' },
    { id: 'delete_items', nameKey: 'act_delete_items', defaultName: 'Delete Selection', category: 'deletion', categoryKey: 'act_cat_deletion', defaultCat: 'Deletion & Clearing' },
    { id: 'clear_drawings', nameKey: 'act_clear_drawings', defaultName: 'Clear Annotations', category: 'deletion', categoryKey: 'act_cat_deletion', defaultCat: 'Deletion & Clearing' },
    { id: 'page_switch', nameKey: 'act_page_switch', defaultName: 'Page Switch (Prev/Next)', category: 'presentation', categoryKey: 'act_cat_presentation', defaultCat: 'Presentation & Tools' },
    { id: 'freeze_toggle', nameKey: 'act_freeze_toggle', defaultName: 'Freeze Presentation', category: 'presentation', categoryKey: 'act_cat_presentation', defaultCat: 'Presentation & Tools' },
    { id: 'search_match', nameKey: 'act_search_match', defaultName: 'Search Match Jump', category: 'presentation', categoryKey: 'act_cat_presentation', defaultCat: 'Presentation & Tools' },
    { id: 'dice_roll', nameKey: 'act_dice_roll', defaultName: 'Dice / Random Picker Finish', category: 'presentation', categoryKey: 'act_cat_presentation', defaultCat: 'Presentation & Tools' },
    { id: 'timer_buzzer', nameKey: 'act_timer_buzzer', defaultName: 'Timer Alarm / Buzzer', category: 'presentation', categoryKey: 'act_cat_presentation', defaultCat: 'Presentation & Tools' },
    { id: 'session_save', nameKey: 'act_session_save', defaultName: 'Manual Session Save', category: 'system', categoryKey: 'act_cat_system', defaultCat: 'State & System' },
    { id: 'autosave_success', nameKey: 'act_autosave_success', defaultName: 'Autosave Complete', category: 'system', categoryKey: 'act_cat_system', defaultCat: 'State & System' },
    { id: 'export_complete', nameKey: 'act_export_complete', defaultName: 'Export Complete', category: 'system', categoryKey: 'act_cat_system', defaultCat: 'State & System' }
  ];

  var BoardAudioService = {
    ctx: null,
    config: JSON.parse(JSON.stringify(DEFAULT_SOUND_CONFIG)),
    availableSoundFiles: [],
    audioElementCache: new Map(),
    lastPlayedTimes: new Map(),
    DEBOUNCE_MS: 40,

    getPresetDefinitions: function () {
      return PRESET_DEFINITIONS.slice();
    },

    getActionMetadata: function () {
      return ACTION_METADATA.slice();
    },

    getDefaultConfig: function () {
      return JSON.parse(JSON.stringify(DEFAULT_SOUND_CONFIG));
    },

    init: function (userConfig) {
      if (userConfig && typeof userConfig === 'object') {
        this.config = this.mergeConfig(userConfig);
      }
      this.scanSoundFiles();
    },

    mergeConfig: function (custom) {
      var base = JSON.parse(JSON.stringify(DEFAULT_SOUND_CONFIG));
      if (!custom || typeof custom !== 'object') return base;
      if (typeof custom.enabled === 'boolean') base.enabled = custom.enabled;
      if (typeof custom.masterVolume === 'number') base.masterVolume = Math.max(0, Math.min(1, custom.masterVolume));
      if (typeof custom.hostOnly === 'boolean') base.hostOnly = custom.hostOnly;
      if (typeof custom.customSoundFolder === 'string' && custom.customSoundFolder.trim()) {
        base.customSoundFolder = custom.customSoundFolder.trim();
      }
      if (custom.actions && typeof custom.actions === 'object') {
        Object.keys(base.actions).forEach(function (actId) {
          if (custom.actions[actId] && typeof custom.actions[actId] === 'object') {
            var cAct = custom.actions[actId];
            if (typeof cAct.sound === 'string') base.actions[actId].sound = cAct.sound;
            if (typeof cAct.volume === 'number') base.actions[actId].volume = Math.max(0, Math.min(1, cAct.volume));
            if (typeof cAct.enabled === 'boolean') base.actions[actId].enabled = cAct.enabled;
          }
        });
        // Also capture any custom action IDs not in base
        Object.keys(custom.actions).forEach(function (actId) {
          if (!base.actions[actId] && typeof custom.actions[actId] === 'object') {
            base.actions[actId] = Object.assign({}, custom.actions[actId]);
          }
        });
      }
      return base;
    },

    getAudioContext: function () {
      if (!this.ctx) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () { });
      }
      return this.ctx;
    },

    scanSoundFiles: async function () {
      var self = this;
      var isElectron = !!(window.Desktop && Desktop.isElectron && Desktop.isElectron());
      var filesCollected = [];
      var audioExtRegex = /\.(mp3|wav|ogg|m4a|aac|flac|webm|weba|opus|mp4)$/i;
      var systemFilesRegex = /(^|[\\/])(\.DS_Store|desktop\.ini|Thumbs\.db|\.gitkeep)$/i;

      function normalize(file) {
        var cleaned = String(file || '').trim().replace(/\\/g, '/').replace(/^\.?\//, '');
        if (cleaned.startsWith('data/')) cleaned = cleaned.slice(5);
        if (cleaned.startsWith('user/custom-data/')) cleaned = cleaned.slice('user/custom-data/'.length);
        if (cleaned && !cleaned.startsWith('sounds/')) cleaned = 'sounds/' + cleaned;
        return cleaned;
      }

      if (isElectron && typeof window.Desktop.listByPath === 'function') {
        try {
          var resData = await window.Desktop.listByPath('data', 'sounds', { recursive: true });
          var rawData = Array.isArray(resData) ? resData : (resData && Array.isArray(resData.files) ? resData.files : []);
          rawData.forEach(function (entry) {
            if (entry && !entry.isDirectory) {
              var p = String(entry.relativePath || entry.filename || '').trim();
              if (p && audioExtRegex.test(p) && !systemFilesRegex.test(p)) {
                filesCollected.push(normalize(p));
              }
            }
          });
        } catch (_) { }

        try {
          var resUser = await window.Desktop.listByPath('user', 'custom-data/sounds', { recursive: true });
          var rawUser = Array.isArray(resUser) ? resUser : (resUser && Array.isArray(resUser.files) ? resUser.files : []);
          rawUser.forEach(function (entry) {
            if (entry && !entry.isDirectory) {
              var p = String(entry.relativePath || entry.filename || '').trim();
              if (p && audioExtRegex.test(p) && !systemFilesRegex.test(p)) {
                filesCollected.push(normalize(p));
              }
            }
          });
        } catch (_) { }
      }

      self.availableSoundFiles = Array.from(new Set(filesCollected)).sort(function (a, b) {
        return a.localeCompare(b);
      });

      return self.availableSoundFiles;
    },

    getSubfolderGroupedFiles: function () {
      var rootFiles = [];
      var folderGroups = new Map();

      (this.availableSoundFiles || []).forEach(function (file) {
        var rel = file.replace(/^sounds\//, '');
        var slashIdx = rel.lastIndexOf('/');
        if (slashIdx === -1) {
          rootFiles.push({ full: file, rel: rel, name: rel });
        } else {
          var folder = rel.slice(0, slashIdx);
          var name = rel.slice(slashIdx + 1);
          if (!folderGroups.has(folder)) {
            folderGroups.set(folder, []);
          }
          folderGroups.get(folder).push({ full: file, rel: rel, name: name });
        }
      });

      return {
        rootFiles: rootFiles,
        folderGroups: folderGroups
      };
    },

    playAction: function (actionId, overrideVolume) {
      if (!this.config || !this.config.enabled) return;

      // Check presentation display isolation
      if (this.config.hostOnly) {
        var isMirror = !!(window._conIsMirrorWindow || document.body.classList.contains('con-mirror-body') || document.body.classList.contains('mirror-active-body'));
        if (isMirror) return;
      }

      var actCfg = this.config.actions && this.config.actions[actionId];
      if (!actCfg || actCfg.enabled === false) return;

      var soundSource = actCfg.sound;
      if (!soundSource || soundSource === 'none') return;

      // Debounce burst limiter
      var now = Date.now();
      var last = this.lastPlayedTimes.get(actionId) || 0;
      if (now - last < this.DEBOUNCE_MS) return;
      this.lastPlayedTimes.set(actionId, now);

      var masterVol = typeof this.config.masterVolume === 'number' ? this.config.masterVolume : 0.6;
      var actVol = typeof actCfg.volume === 'number' ? actCfg.volume : 1.0;
      if (typeof overrideVolume === 'number') actVol = overrideVolume;
      var finalVolume = Math.max(0, Math.min(1, masterVol * actVol));

      if (finalVolume <= 0) return;

      this.playSoundSource(soundSource, finalVolume);
    },

    playSoundSource: function (soundSource, volume) {
      if (!soundSource || soundSource === 'none') return;
      if (soundSource.startsWith('preset:')) {
        this.synthesizePreset(soundSource.slice('preset:'.length), volume);
      } else if (soundSource.startsWith('file:')) {
        this.playCustomFile(soundSource.slice('file:'.length), volume);
      } else {
        // Assume direct file path or preset name
        if (PRESET_DEFINITIONS.some(function (p) { return p.id === soundSource; })) {
          this.synthesizePreset(soundSource.replace(/^preset:/, ''), volume);
        } else {
          this.playCustomFile(soundSource, volume);
        }
      }
    },

    testSound: function (soundSource, volume) {
      var masterVol = (this.config && typeof this.config.masterVolume === 'number') ? this.config.masterVolume : 0.6;
      var vol = (typeof volume === 'number') ? volume : 1.0;
      var finalVolume = Math.max(0, Math.min(1, masterVol * vol));
      this.playSoundSource(soundSource, finalVolume);
    },

    playCustomFile: async function (rawPath, volume) {
      if (!rawPath) return;
      var filePath = String(rawPath).trim().replace(/\\/g, '/');
      var resolvedUrl = filePath;

      if (!filePath.startsWith('http://') && !filePath.startsWith('https://') && !filePath.startsWith('file://') && !filePath.startsWith('blob:') && !filePath.startsWith('data:')) {
        var cleanRel = filePath.replace(/^user\/custom-data\//, '').replace(/^data\//, '');
        if (cleanRel.startsWith('sounds/')) {
          cleanRel = cleanRel.slice('sounds/'.length);
        }

        if (window.Desktop && typeof window.Desktop.resolvePath === 'function') {
          try {
            var res = await window.Desktop.resolvePath('user', 'custom-data/sounds/' + cleanRel);
            if (res && res.path) {
              resolvedUrl = 'file:///' + res.path.replace(/\\/g, '/').replace(/^\/+/, '');
            } else {
              resolvedUrl = '../user/custom-data/sounds/' + cleanRel;
            }
          } catch (_) {
            resolvedUrl = '../user/custom-data/sounds/' + cleanRel;
          }
        } else {
          resolvedUrl = '../user/custom-data/sounds/' + cleanRel;
        }
      }

      try {
        var audio = this.audioElementCache.get(resolvedUrl);
        if (!audio) {
          audio = new Audio(resolvedUrl);
          this.audioElementCache.set(resolvedUrl, audio);
        } else {
          audio.currentTime = 0;
        }
        audio.volume = Math.max(0, Math.min(1, volume !== undefined ? volume : 1.0));
        var playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(function (err) {
            // Audio play was prevented or failed
          });
        }
      } catch (_) { }
    },

    synthesizePreset: function (presetName, volume) {
      var ctx = this.getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;
      var vol = Math.max(0.001, Math.min(1, volume !== undefined ? volume : 0.6));

      try {
        switch (presetName) {
          case 'chime': {
            // Crisp dual-tone chime (660Hz -> 1320Hz)
            var osc1 = ctx.createOscillator();
            var osc2 = ctx.createOscillator();
            var gain = ctx.createGain();
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(660, now);
            osc2.frequency.setValueAtTime(1320, now);
            gain.gain.setValueAtTime(vol * 0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.36);
            osc2.stop(now + 0.36);
            break;
          }

          case 'pop': {
            // Bubble pop with quick upward frequency sweep
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);
            gain.gain.setValueAtTime(vol * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
            break;
          }

          case 'click': {
            // Subtle high-pitch tactile click
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.02);
            gain.gain.setValueAtTime(vol * 0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
            break;
          }

          case 'snap': {
            // Crisp latch / magnetic snap
            var osc1 = ctx.createOscillator();
            var osc2 = ctx.createOscillator();
            var gain = ctx.createGain();
            osc1.type = 'triangle';
            osc2.type = 'square';
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(200, now + 0.03);
            osc2.frequency.setValueAtTime(1600, now);
            osc2.frequency.exponentialRampToValueAtTime(400, now + 0.02);
            gain.gain.setValueAtTime(vol * 0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.045);
            osc2.stop(now + 0.045);
            break;
          }

          case 'whoosh': {
            // Soft downward whoosh
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
            gain.gain.setValueAtTime(vol * 0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
            break;
          }

          case 'fanfare': {
            // 3-note ascending chord (C5 523Hz -> E5 659Hz -> G5 784Hz)
            var notes = [523.25, 659.25, 783.99];
            notes.forEach(function (freq, i) {
              var noteTime = now + i * 0.07;
              var osc = ctx.createOscillator();
              var gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, noteTime);
              gain.gain.setValueAtTime(vol * 0.35, noteTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.22);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(noteTime);
              osc.stop(noteTime + 0.23);
            });
            break;
          }

          case 'shutter': {
            // Dual shutter click
            [0, 0.035].forEach(function (offset) {
              var clickTime = now + offset;
              var osc = ctx.createOscillator();
              var gain = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(1200, clickTime);
              osc.frequency.exponentialRampToValueAtTime(400, clickTime + 0.015);
              gain.gain.setValueAtTime(vol * 0.3, clickTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.02);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(clickTime);
              osc.stop(clickTime + 0.025);
            });
            break;
          }

          case 'ding': {
            // Long metallic resonant ding (1046.5Hz)
            var osc = ctx.createOscillator();
            var oscHarmonic = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            oscHarmonic.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, now);
            oscHarmonic.frequency.setValueAtTime(2093.0, now);
            gain.gain.setValueAtTime(vol * 0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
            osc.connect(gain);
            oscHarmonic.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            oscHarmonic.start(now);
            osc.stop(now + 0.46);
            oscHarmonic.stop(now + 0.46);
            break;
          }

          case 'drop': {
            // Low thud drop
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
            gain.gain.setValueAtTime(vol * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.11);
            break;
          }

          case 'sparkle': {
            // 4-note rapid shimmering sparkle
            [1046.5, 1318.5, 1567.98, 2093.0].forEach(function (freq, i) {
              var sTime = now + i * 0.045;
              var osc = ctx.createOscillator();
              var gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, sTime);
              gain.gain.setValueAtTime(vol * 0.3, sTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, sTime + 0.16);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(sTime);
              osc.stop(sTime + 0.17);
            });
            break;
          }

          default:
            break;
        }
      } catch (_) { }
    }
  };

  global.BoardAudioService = BoardAudioService;

  // Auto-init if BOARD_CONFIG is already present on window
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function () {
      var cfg = (window.BOARD_CONFIG && window.BOARD_CONFIG.soundEffects) ? window.BOARD_CONFIG.soundEffects : null;
      BoardAudioService.init(cfg);
    });
  }

})(typeof window !== 'undefined' ? window : globalThis);
