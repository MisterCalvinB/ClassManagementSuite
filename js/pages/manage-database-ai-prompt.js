/**
 * manage-database-ai-prompt.js — Customizable AI Prompt Modal for Manage Database
 */
(function (global) {
  'use strict';

  var STORAGE_PREFIX = 'mdb_custom_ai_prompt_';

  function _el(id) {
    return document.getElementById(id);
  }

  function _t(key, fallback) {
    if (typeof global.t === 'function') {
      var res = global.t(key);
      if (res && res !== key) return res;
    }
    if (global.i18n && typeof global.i18n.t === 'function') {
      var res2 = global.i18n.t(key);
      if (res2 && res2 !== key) return res2;
    }
    return fallback !== undefined ? fallback : key;
  }

  function getBaseTemplate(typeKey) {
    try {
      var custom = localStorage.getItem(STORAGE_PREFIX + typeKey);
      if (custom && custom.trim()) return custom;
    } catch (_) {}
    var prompts = global.AI_PROMPTS || {};
    return prompts[typeKey] || '';
  }

  function hasCustomDefault(typeKey) {
    try {
      var custom = localStorage.getItem(STORAGE_PREFIX + typeKey);
      return Boolean(custom && custom.trim());
    } catch (_) {
      return false;
    }
  }

  function buildCustomizedPrompt(typeKey) {
    var base = getBaseTemplate(typeKey);
    if (!base) return '';

    var topic = (_el('ai-prompt-topic')?.value || '').trim();
    var count = (_el('ai-prompt-count')?.value || '').trim();
    var level = (_el('ai-prompt-level')?.value || '').trim();
    var extra = (_el('ai-prompt-extra')?.value || '').trim();

    var text = base;

    if (topic) {
      if (text.includes('[PASTE WORDS HERE]')) {
        text = text.replace('[PASTE WORDS HERE]', topic);
      } else {
        text = text.replace(/\n/, '\nTopic / Focus: ' + topic + '\n');
      }
    }

    var extraRules = [];
    if (count && count !== 'default') {
      extraRules.push('- Generate ' + count + ' entries.');
    }
    if (level && level !== 'Any') {
      extraRules.push('- Target CEFR level: ' + level + '.');
    }
    if (extra) {
      extraRules.push('- Additional instructions: ' + extra);
    }

    if (extraRules.length) {
      text = text.trimEnd() + '\n' + extraRules.join('\n');
    }

    return text;
  }

  function updateCustomBadge(typeKey) {
    var badge = _el('ai-prompt-custom-badge');
    if (!badge) return;
    badge.classList.toggle('hidden', !hasCustomDefault(typeKey));
  }

  function rebuildAiPromptText() {
    var typeKey = (global.S && global.S.typeKey) || '';
    var ta = _el('ai-prompt-textarea');
    if (!ta || !typeKey) return;
    ta.value = buildCustomizedPrompt(typeKey);
  }

  function openAiPromptModal(prefill) {
    var typeKey = (global.S && global.S.typeKey) || '';
    var prompts = global.AI_PROMPTS || {};
    if (!typeKey || !prompts[typeKey]) {
      if (typeof global.showToast === 'function') {
        global.showToast(_t('mdbAiPromptUnavailable', 'No AI prompt template available for this database type.'), true);
      }
      return;
    }

    var bg = _el('ai-prompt-bg');
    if (!bg) return;

    var opts = prefill || {};
    var topicEl = _el('ai-prompt-topic');
    var countEl = _el('ai-prompt-count');
    var levelEl = _el('ai-prompt-level');
    var extraEl = _el('ai-prompt-extra');
    var typeLabelEl = _el('ai-prompt-modal-type');

    if (topicEl) topicEl.value = opts.topic || '';
    if (countEl) countEl.value = opts.count || 'default';
    if (levelEl) levelEl.value = opts.level || 'Any';
    if (extraEl) extraEl.value = opts.focus || '';
    if (typeLabelEl) typeLabelEl.textContent = typeKey;

    updateCustomBadge(typeKey);
    rebuildAiPromptText();

    bg.classList.remove('hidden');
    if (topicEl) {
      setTimeout(function () { topicEl.focus(); }, 30);
    }
  }

  function closeAiPromptModal() {
    var bg = _el('ai-prompt-bg');
    if (bg) bg.classList.add('hidden');
  }

  async function copyAiPromptFromModal(btn) {
    var ta = _el('ai-prompt-textarea');
    var text = ta ? ta.value : '';
    if (!text.trim()) return;

    var ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (_) {}
    }
    if (!ok) {
      try {
        ta.select();
        ok = document.execCommand('copy');
      } catch (_) {
        ok = false;
      }
    }

    if (ok) {
      if (btn) {
        var origHTML = btn.innerHTML;
        btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon btn-icon-xs" alt="" /> ' + _t('mdbAiCopied', 'Copied!');
        setTimeout(function () { btn.innerHTML = origHTML; }, 1800);
      }
      if (typeof global.showToast === 'function') {
        global.showToast(_t('mdbAiCopied', 'Copied!'));
      }
    } else if (typeof global.showToast === 'function') {
      global.showToast(_t('mdbErrClipboardUnavailable', 'Clipboard unavailable.'), true);
    }
  }

  function saveCustomAiPromptDefault() {
    var typeKey = (global.S && global.S.typeKey) || '';
    var ta = _el('ai-prompt-textarea');
    if (!typeKey || !ta) return;
    var val = ta.value.trim();
    if (!val) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + typeKey, val);
      updateCustomBadge(typeKey);
      if (typeof global.showToast === 'function') {
        global.showToast(_t('mdbAiPromptSavedDefault', 'Saved as custom default for this database type.'));
      }
    } catch (_) {}
  }

  function resetAiPromptDefault() {
    var typeKey = (global.S && global.S.typeKey) || '';
    if (!typeKey) return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + typeKey);
    } catch (_) {}
    if (_el('ai-prompt-topic')) _el('ai-prompt-topic').value = '';
    if (_el('ai-prompt-count')) _el('ai-prompt-count').value = 'default';
    if (_el('ai-prompt-level')) _el('ai-prompt-level').value = 'Any';
    if (_el('ai-prompt-extra')) _el('ai-prompt-extra').value = '';
    updateCustomBadge(typeKey);
    rebuildAiPromptText();
    if (typeof global.showToast === 'function') {
      global.showToast(_t('mdbAiPromptResetDone', 'Prompt reset to built-in default.'));
    }
  }

  global.openAiPromptModal = openAiPromptModal;
  global.closeAiPromptModal = closeAiPromptModal;
  global.rebuildAiPromptText = rebuildAiPromptText;
  global.copyAiPromptFromModal = copyAiPromptFromModal;
  global.saveCustomAiPromptDefault = saveCustomAiPromptDefault;
  global.resetAiPromptDefault = resetAiPromptDefault;
})(window);
