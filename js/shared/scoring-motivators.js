// Scoring Motivators Service
// Provides playful, encouraging micro-feedback and milestone celebrations
// for teachers scoring tests in Grade Sheet and reviewing deadlines in Launcher.
(function () {
  'use strict';

  var _lastPickedKey = null;

  var MOTIVATOR_KEYS = {
    start: [
      'gsMotivStart1',
      'gsMotivStart2',
      'gsMotivStart3'
    ],
    milestone25: [
      'gsMotiv25_1',
      'gsMotiv25_2',
      'gsMotiv25_3'
    ],
    milestone50: [
      'gsMotiv50_1',
      'gsMotiv50_2',
      'gsMotiv50_3'
    ],
    milestone75: [
      'gsMotiv75_1',
      'gsMotiv75_2',
      'gsMotiv75_3'
    ],
    last3: [
      'gsMotivLast3_1',
      'gsMotivLast3_2',
      'gsMotivLast3_3'
    ],
    last2: [
      'gsMotivLast2_1'
    ],
    last1: [
      'gsMotivLast1_1',
      'gsMotivLast1_2'
    ],
    completed: [
      'gsMotivDone1',
      'gsMotivDone2',
      'gsMotivDone3',
      'gsMotivDone4'
    ],
    speed: [
      'gsMotivSpeed1',
      'gsMotivSpeed2'
    ],
    deadlineOnTrack: [
      'gsMotivDlOnTrack1',
      'gsMotivDlOnTrack2'
    ],
    deadlineBehind: [
      'gsMotivDlBehind1',
      'gsMotivDlBehind2'
    ],
    deadlineOverdue: [
      'gsMotivDlOverdue1'
    ],
    general: [
      'gsMotivGen1',
      'gsMotivGen2',
      'gsMotivGen3',
      'gsMotivGen4'
    ]
  };

  function isEnabled() {
    try {
      if (localStorage.getItem('cmt-scoring-motivators-enabled') === 'false') return false;
      if (window.CONFIG && window.CONFIG.motivatorsEnabled === false) return false;
    } catch (e) {}
    return true;
  }

  function pickRandomKey(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return null;
    var candidates = keys.filter(function (k) { return k !== _lastPickedKey; });
    if (candidates.length === 0) candidates = keys;
    var selected = candidates[Math.floor(Math.random() * candidates.length)];
    _lastPickedKey = selected;
    return selected;
  }

  function pick(context) {
    if (!isEnabled()) return null;
    context = context || {};

    var pool = [];

    if (context.remaining === 0 && context.total > 0) {
      pool = MOTIVATOR_KEYS.completed;
    } else if (context.remaining === 1 && context.total > 1) {
      pool = MOTIVATOR_KEYS.last1;
    } else if (context.remaining <= 2 && context.remaining > 1 && context.total >= 3) {
      pool = MOTIVATOR_KEYS.last2;    
    } else if (context.remaining <= 3 && context.remaining > 1 && context.total >= 4) {
      pool = MOTIVATOR_KEYS.last3;
    } else if (context.deadlineStatus === 'overdue') {
      pool = MOTIVATOR_KEYS.deadlineOverdue;
    } else if (context.deadlineStatus === 'behind') {
      pool = MOTIVATOR_KEYS.deadlineBehind;
    } else if (context.pct >= 75) {
      pool = MOTIVATOR_KEYS.milestone75;
    } else if (context.pct >= 50) {
      pool = MOTIVATOR_KEYS.milestone50;
    } else if (context.pct >= 25) {
      pool = MOTIVATOR_KEYS.milestone25;
    } else if (context.deadlineStatus === 'on-track') {
      pool = MOTIVATOR_KEYS.deadlineOnTrack;
    } else if (context.scored === 0) {
      pool = MOTIVATOR_KEYS.start;
    } else {
      pool = MOTIVATOR_KEYS.general;
    }

    var key = pickRandomKey(pool);
    if (!key) return null;

    var text = '';
    if (typeof window.t === 'function') {
      text = window.t(key);
    }
    return {
      key: key,
      text: text || key,
      category: pool === MOTIVATOR_KEYS.completed ? 'celebrate' : (context.deadlineStatus === 'overdue' ? 'warning' : 'encouragement')
    };
  }

  window.ScoringMotivators = {
    isEnabled: isEnabled,
    pick: pick,
    MOTIVATOR_KEYS: MOTIVATOR_KEYS
  };
})();
