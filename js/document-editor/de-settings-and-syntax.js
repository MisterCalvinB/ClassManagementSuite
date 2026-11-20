function openSettingsModal() {
  _stgTab = 'prefs';
  _stgSnippetEdit = null;
  _stgShortcutEdit = null;
  _stgTriggerEdit = null;
  _stgCssRuleEdit = null;
  _stgKeyData = null;
  renderSettingsModal();
  showModal('settings-modal');
}

function renderSettingsModal() {
  const tabs = [
    { id: 'prefs', key: 'dePrefs', label: (window.t ? t('dePrefs', 'Preferences') : 'Preferences') || 'Preferences' },
    { id: 'shortcuts', key: 'deShortcuts', label: (window.t ? t('deShortcuts', 'Shortcuts') : 'Shortcuts') || 'Shortcuts' },
    { id: 'triggers', key: 'deTriggers', label: (window.t ? t('deTriggers', 'Triggers') : 'Triggers') || 'Triggers' },
    { id: 'snippets', key: 'deSnippets', label: (window.t ? t('deSnippets', 'Snippets') : 'Snippets') || 'Snippets' },
    { id: 'css-rules', key: 'deCssRules', label: (window.t ? t('deCssRules', 'Custom CSS Rules') : 'Custom CSS Rules') || 'Custom CSS Rules' }
  ];
  if (_stgTab !== 'css-rules') disposeStgCssRuleEditor();
  document.getElementById('stg-tabs').innerHTML = tabs.map(t =>
    `<button class="stg-tab${_stgTab === t.id ? ' active' : ''}" data-tab="${t.id}" data-i18n="${t.key}">${t.label}</button>`
  ).join('');
  document.querySelectorAll('.stg-tab').forEach(btn => {
    btn.addEventListener('click', function () {
      _stgTab = this.dataset.tab;
      _stgSnippetEdit = null; _stgShortcutEdit = null;
      _stgTriggerEdit = null; _stgCssRuleEdit = null;
      _stgKeyData = null;
      renderSettingsModal();
    });
  });
  const body = document.getElementById('stg-body');
  if (_stgTab === 'snippets') { body.innerHTML = renderSnippetsPanel(); bindSnippetEvents(); }
  else if (_stgTab === 'shortcuts') { body.innerHTML = renderShortcutsPanel(); bindShortcutEvents(); }
  else if (_stgTab === 'triggers') { body.innerHTML = renderTriggersPanel(); bindTriggerEvents(); }
  else if (_stgTab === 'css-rules') { body.innerHTML = renderCssRulesPanel(); bindCssRuleEvents(); }
  else if (_stgTab === 'prefs') { body.innerHTML = renderPrefsPanel(); bindPrefsEvents(); }
}

function escH(s) { return escHtml(String(s || '')); }

// ── Snippets tab ──────────────────────────────────────────

function renderSnippetsPanel() {
  const e = _stgSnippetEdit;
  let html = `<div class="stg-info">
<strong>Snippets</strong> expand a short prefix into longer text.<br>
<strong>Completion popup</strong> — type the prefix and pick from Monaco's suggestion list (Tab or Enter to expand).<br>
<strong>Auto-expand</strong> — the prefix is replaced immediately the moment you finish typing it.<br>
<strong>Both</strong> — does both. Snippet bodies support tab stops: <code>$1</code> <code>$2</code>… for cursor positions, <code>$0</code> for the final landing spot.
  </div>
  <div class="stg-toolbar"><button class="stg-add-btn" id="stg-snip-add">+ New Snippet</button></div>`;

  if (e !== null) {
    html += `<div class="stg-form">
  <div class="stg-form-title">${e.id ? 'Edit' : 'New'} Snippet</div>
  <div class="stg-form-row">
    <div class="stg-field">
      <label class="stg-label">Prefix <span style="color:#999;font-weight:600;text-transform:none">(trigger word)</span></label>
      <input class="stg-input" id="stg-snip-prefix" value="${escH(e.prefix)}" placeholder="e.g. sig" spellcheck="false">
    </div>
    <div class="stg-field">
      <label class="stg-label">Label</label>
      <input class="stg-input" id="stg-snip-label" value="${escH(e.label)}" placeholder="e.g. Insert signature">
    </div>
  </div>
  <div class="stg-field">
    <label class="stg-label">Body <span style="color:#999;font-weight:600;text-transform:none">(tab stops: $1 $2 $0)</span></label>
    <textarea class="stg-textarea" id="stg-snip-body" rows="4">${escH(e.body)}</textarea>
  </div>
  <div class="stg-field">
    <label class="stg-label">Trigger mode</label>
    <div class="stg-radio-group">
      <label class="stg-radio-label"><input type="radio" name="snip-mode" value="completion" ${e.triggerMode !== 'typed' && e.triggerMode !== 'both' ? 'checked' : ''}> Completion popup</label>
      <label class="stg-radio-label"><input type="radio" name="snip-mode" value="typed" ${e.triggerMode === 'typed' ? 'checked' : ''}> Auto-expand</label>
      <label class="stg-radio-label"><input type="radio" name="snip-mode" value="both" ${e.triggerMode === 'both' ? 'checked' : ''}> Both</label>
    </div>
  </div>
  <div class="stg-form-actions">
    <button class="stg-btn" id="stg-snip-save">Save</button>
    <button class="stg-btn stg-btn-cancel" id="stg-snip-cancel">Cancel</button>
  </div>
</div>`;
  }

  if (!editorSettings.snippets.length) {
    if (e === null) html += '<div class="stg-empty">No snippets yet.<br>Click <strong>+ New Snippet</strong> to add one.</div>';
  } else {
    editorSettings.snippets.forEach((s, i) => {
      const mode = s.triggerMode === 'both' ? 'both' : s.triggerMode === 'typed' ? 'typed' : 'completion';
      const modeLabel = mode === 'both' ? 'both' : mode === 'typed' ? 'auto' : 'popup';
      html += `<div class="stg-item-row">
    <div class="stg-item-main">
      <div class="stg-item-title" style="font-family:monospace">${escH(s.prefix)}</div>
      <div class="stg-item-sub">${escH(s.label || s.body.slice(0, 60))}</div>
    </div>
    <span class="stg-badge stg-badge-${mode}">${modeLabel}</span>
    <button class="stg-item-btn stg-item-btn-edit" data-i="${i}">Edit</button>
    <button class="stg-item-btn stg-item-btn-del" data-i="${i}">Del</button>
  </div>`;
    });
  }
  return html;
}

function bindSnippetEvents() {
  document.getElementById('stg-snip-add').addEventListener('click', () => {
    _stgSnippetEdit = { prefix: '', label: '', body: '', triggerMode: 'completion' };
    renderSettingsModal();
  });
  if (_stgSnippetEdit !== null) {
    document.getElementById('stg-snip-save').addEventListener('click', () => {
      const prefix = document.getElementById('stg-snip-prefix').value.trim();
      const label = document.getElementById('stg-snip-label').value.trim();
      const body = document.getElementById('stg-snip-body').value;
      const modeEl = document.querySelector('input[name="snip-mode"]:checked');
      if (!prefix || !body) { showToast('Prefix and body are required', true); return; }
      const triggerMode = modeEl ? modeEl.value : 'completion';
      const entry = { id: _stgSnippetEdit.id || genId(), prefix, label, body, triggerMode };
      if (_stgSnippetEdit.id) {
        const idx = editorSettings.snippets.findIndex(s => s.id === _stgSnippetEdit.id);
        if (idx >= 0) editorSettings.snippets[idx] = entry; else editorSettings.snippets.push(entry);
      } else {
        editorSettings.snippets.push(entry);
      }
      _stgSnippetEdit = null;
      saveEditorSettings(); applySnippetCompletions(); renderSettingsModal();
      showToast('Snippet saved');
    });
    document.getElementById('stg-snip-cancel').addEventListener('click', () => {
      _stgSnippetEdit = null; renderSettingsModal();
    });
  }
  document.querySelectorAll('.stg-item-btn-edit[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      _stgSnippetEdit = { ...editorSettings.snippets[+this.dataset.i] };
      renderSettingsModal();
    });
  });
  document.querySelectorAll('.stg-item-btn-del[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      editorSettings.snippets.splice(+this.dataset.i, 1);
      saveEditorSettings(); applySnippetCompletions(); renderSettingsModal();
      showToast('Snippet deleted');
    });
  });
}

// ── Shortcuts tab ─────────────────────────────────────────

function scSubtitle(s) {
  const type = s.type || 'wrap';
  const key = escH(formatKeyCombo(s));
  if (type === 'action') {
    const a = EDITOR_ACTIONS.find(a => a.id === s.actionId);
    return key + ' → [' + escH(a ? a.label : s.actionId || '?') + ']';
  }
  if (type === 'insert') {
    return key + ' → insert "' + escH((s.insertBody || '').replace(/\n/g, '↵').slice(0, 24)) + '"';
  }
  return key + ' → ' + escH(s.wrapBefore || '') + '…' + escH(s.wrapAfter || '');
}

function renderShortcutsPanel() {
  const e = _stgShortcutEdit;
  let html = `<div class="stg-info">
<strong>Shortcuts</strong> bind a key combo to an editor action. Three types:<br>
<strong>Wrap selection</strong> — inserts text before and after the selection; if nothing is selected the cursor lands between them. Good for <code>**bold**</code>, <code>_italic_</code>, headings (<code>## </code> + empty After), blockquotes (<code>&gt; </code> + empty After).<br>
<strong>Editor action</strong> — fires a built-in Monaco command: duplicate line, move line, sort, case transform, fold, find, and more.<br>
<strong>Insert at cursor</strong> — inserts a text snippet at the cursor. Supports tab stops (<code>$1</code>, <code>$0</code>) for jumping between positions after insertion.
  </div>
  <div class="stg-toolbar"><button class="stg-add-btn" id="stg-sc-add">+ New Shortcut</button></div>`;

  if (e !== null) {
    const type = e.type || 'wrap';
    const keyDisplay = _stgKeyData ? formatKeyCombo(_stgKeyData) : (e.key ? formatKeyCombo(e) : '');
    const actionOpts = EDITOR_ACTIONS.map(a =>
      `<option value="${escH(a.id)}"${e.actionId === a.id ? ' selected' : ''}>${escH(a.label)}</option>`
    ).join('');
    html += `<div class="stg-form">
  <div class="stg-form-title">${e.id ? 'Edit' : 'New'} Shortcut</div>
  <div class="stg-form-row">
    <div class="stg-field">
      <label class="stg-label">Label</label>
      <input class="stg-input" id="stg-sc-label" value="${escH(e.label)}" placeholder="e.g. Duplicate line">
    </div>
    <div class="stg-field">
      <label class="stg-label">Key combo</label>
      <input class="stg-input stg-key-input" id="stg-sc-key" readonly
        value="${escH(keyDisplay)}" placeholder="Click here, then press keys…">
    </div>
  </div>
  <div class="stg-field">
    <label class="stg-label">Action type</label>
    <select class="stg-select" id="stg-sc-type">
      <option value="wrap"${type === 'wrap' ? ' selected' : ''}>Wrap selection</option>
      <option value="action"${type === 'action' ? ' selected' : ''}>Editor action</option>
      <option value="insert"${type === 'insert' ? ' selected' : ''}>Insert at cursor</option>
    </select>
  </div>
  <div id="stg-sc-wrap-fields"${type !== 'wrap' ? ' style="display:none"' : ''}>
    <div class="stg-form-row">
      <div class="stg-field">
        <label class="stg-label">Before</label>
        <input class="stg-input" id="stg-sc-before" value="${escH(e.wrapBefore || '')}"
          placeholder="e.g. **" spellcheck="false" style="font-family:monospace">
      </div>
      <div class="stg-field">
        <label class="stg-label">After</label>
        <input class="stg-input" id="stg-sc-after" value="${escH(e.wrapAfter || '')}"
          placeholder="e.g. **" spellcheck="false" style="font-family:monospace">
      </div>
    </div>
    <p class="stg-hint">Wraps selected text. If nothing selected, cursor lands between before/after.</p>
  </div>
  <div id="stg-sc-action-fields"${type !== 'action' ? ' style="display:none"' : ''}>
    <div class="stg-field">
      <label class="stg-label">Editor action</label>
      <select class="stg-select" id="stg-sc-action-id">${actionOpts}</select>
    </div>
  </div>
  <div id="stg-sc-insert-fields"${type !== 'insert' ? ' style="display:none"' : ''}>
    <div class="stg-field">
      <label class="stg-label">Text / snippet <span style="color:#999;font-weight:600;text-transform:none">(tab stops: $1 $2 $0)</span></label>
      <textarea class="stg-textarea" id="stg-sc-insert-body" rows="3">${escH(e.insertBody || '')}</textarea>
    </div>
    <p class="stg-hint">For line prefixes (headings, blockquote) use <em>Wrap</em> with empty After. E.g. Before = "## ".</p>
  </div>
  <div class="stg-form-actions">
    <button class="stg-btn" id="stg-sc-save">Save</button>
    <button class="stg-btn stg-btn-cancel" id="stg-sc-cancel">Cancel</button>
  </div>
</div>`;
  }

  if (!editorSettings.shortcuts.length) {
    if (e === null) html += '<div class="stg-empty">No shortcuts yet.<br>Click <strong>+ New Shortcut</strong> to add one.</div>';
  } else {
    editorSettings.shortcuts.forEach((s, i) => {
      html += `<div class="stg-item-row">
    <div class="stg-item-main">
      <div class="stg-item-title">${escH(s.label || 'Untitled')}</div>
      <div class="stg-item-sub">${scSubtitle(s)}</div>
    </div>
    <button class="stg-item-btn stg-item-btn-edit" data-i="${i}">Edit</button>
    <button class="stg-item-btn stg-item-btn-del" data-i="${i}">Del</button>
  </div>`;
    });
  }
  return html;
}

function bindShortcutEvents() {
  document.getElementById('stg-sc-add').addEventListener('click', () => {
    _stgShortcutEdit = {
      label: '', key: '', ctrlKey: true, altKey: false, shiftKey: false,
      type: 'wrap', wrapBefore: '', wrapAfter: '',
      actionId: EDITOR_ACTIONS[0].id, insertBody: ''
    };
    _stgKeyData = null; renderSettingsModal();
  });

  if (_stgShortcutEdit !== null) {
    const keyInput = document.getElementById('stg-sc-key');
    keyInput.addEventListener('keydown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      if (e.key === 'Escape') { this.blur(); return; }
      _stgKeyData = {
        key: e.key === ' ' ? ' ' : e.key.toLowerCase(),
        ctrlKey: e.ctrlKey || e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey
      };
      this.value = formatKeyCombo(_stgKeyData);
    });

    document.getElementById('stg-sc-type').addEventListener('change', function () {
      const t = this.value;
      document.getElementById('stg-sc-wrap-fields').style.display = t === 'wrap' ? '' : 'none';
      document.getElementById('stg-sc-action-fields').style.display = t === 'action' ? '' : 'none';
      document.getElementById('stg-sc-insert-fields').style.display = t === 'insert' ? '' : 'none';
    });

    document.getElementById('stg-sc-save').addEventListener('click', () => {
      const label = document.getElementById('stg-sc-label').value.trim();
      const kd = _stgKeyData || (_stgShortcutEdit.key ? _stgShortcutEdit : null);
      if (!kd || !kd.key) { showToast('Set a key combo first', true); return; }
      if (!label) { showToast('Label is required', true); return; }
      const type = document.getElementById('stg-sc-type').value;
      const entry = {
        ...kd,
        id: _stgShortcutEdit.id || genId(),
        label, type,
        wrapBefore: type === 'wrap' ? document.getElementById('stg-sc-before').value : '',
        wrapAfter: type === 'wrap' ? document.getElementById('stg-sc-after').value : '',
        actionId: type === 'action' ? document.getElementById('stg-sc-action-id').value : '',
        insertBody: type === 'insert' ? document.getElementById('stg-sc-insert-body').value : '',
      };
      if (_stgShortcutEdit.id) {
        const idx = editorSettings.shortcuts.findIndex(s => s.id === _stgShortcutEdit.id);
        if (idx >= 0) editorSettings.shortcuts[idx] = entry; else editorSettings.shortcuts.push(entry);
      } else {
        editorSettings.shortcuts.push(entry);
      }
      _stgShortcutEdit = null; _stgKeyData = null;
      saveEditorSettings(); applyShortcuts(); renderSettingsModal();
      showToast('Shortcut saved');
    });

    document.getElementById('stg-sc-cancel').addEventListener('click', () => {
      _stgShortcutEdit = null; _stgKeyData = null; renderSettingsModal();
    });
  }

  document.querySelectorAll('.stg-item-btn-edit[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      _stgShortcutEdit = { ...editorSettings.shortcuts[+this.dataset.i] };
      _stgKeyData = null; renderSettingsModal();
    });
  });
  document.querySelectorAll('.stg-item-btn-del[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      editorSettings.shortcuts.splice(+this.dataset.i, 1);
      saveEditorSettings(); applyShortcuts(); renderSettingsModal();
      showToast('Shortcut deleted');
    });
  });
}

// ── Triggers tab ──────────────────────────────────────────

function renderTriggersPanel() {
  const e = _stgTriggerEdit;
  let html = `<div class="stg-info">
<strong>Typing triggers</strong> watch what you type and immediately replace a character sequence with an expansion — no key combo needed. The replacement fires the moment the trigger string is matched at the cursor.<br>
Good for things like <code>__</code> → <code>---</code> (horizontal rule) or <code>//</code> → <code>## </code> (section heading).<br>
Avoid trigger strings that appear naturally in your text (e.g. <code>//</code> inside a code block will also fire). For ambiguous sequences, use a snippet with <strong>Auto-expand</strong> mode instead — it behaves identically but lives alongside the completion popup option.
  </div>
  <div class="stg-toolbar"><button class="stg-add-btn" id="stg-tr-add">+ New Trigger</button></div>`;

  if (e !== null) {
    html += `<div class="stg-form">
  <div class="stg-form-title">${e.id ? 'Edit' : 'New'} Typing Trigger</div>
  <div class="stg-field">
    <label class="stg-label">Trigger <span style="color:#999;font-weight:600;text-transform:none">(typed characters)</span></label>
    <input class="stg-input" id="stg-tr-trigger" value="${escH(e.trigger)}"
      placeholder="e.g. __ or //" spellcheck="false"
      style="font-family:monospace;max-width:180px">
  </div>
  <div class="stg-field">
    <label class="stg-label">Expands to</label>
    <textarea class="stg-textarea" id="stg-tr-expand" rows="3">${escH(e.expand)}</textarea>
  </div>
  <p class="stg-hint">Replaced immediately when the trigger is typed at the cursor position.</p>
  <div class="stg-form-actions">
    <button class="stg-btn" id="stg-tr-save">Save</button>
    <button class="stg-btn stg-btn-cancel" id="stg-tr-cancel">Cancel</button>
  </div>
</div>`;
  }

  if (!editorSettings.typingTriggers.length) {
    if (e === null) html += '<div class="stg-empty">No triggers yet.<br>Click <strong>+ New Trigger</strong> to add one.</div>';
  } else {
    editorSettings.typingTriggers.forEach((t, i) => {
      html += `<div class="stg-item-row">
    <div class="stg-item-main">
      <div class="stg-item-title" style="font-family:monospace">${escH(t.trigger)}</div>
      <div class="stg-item-sub">${escH(t.expand.slice(0, 60))}</div>
    </div>
    <button class="stg-item-btn stg-item-btn-edit" data-i="${i}">Edit</button>
    <button class="stg-item-btn stg-item-btn-del" data-i="${i}">Del</button>
  </div>`;
    });
  }
  return html;
}

function bindTriggerEvents() {
  document.getElementById('stg-tr-add').addEventListener('click', () => {
    _stgTriggerEdit = { trigger: '', expand: '' };
    renderSettingsModal();
  });
  if (_stgTriggerEdit !== null) {
    document.getElementById('stg-tr-save').addEventListener('click', () => {
      const trigger = document.getElementById('stg-tr-trigger').value;
      const expand = document.getElementById('stg-tr-expand').value;
      if (!trigger) { showToast('Trigger text is required', true); return; }
      const entry = { id: _stgTriggerEdit.id || genId(), trigger, expand };
      if (_stgTriggerEdit.id) {
        const idx = editorSettings.typingTriggers.findIndex(t => t.id === _stgTriggerEdit.id);
        if (idx >= 0) editorSettings.typingTriggers[idx] = entry; else editorSettings.typingTriggers.push(entry);
      } else {
        editorSettings.typingTriggers.push(entry);
      }
      _stgTriggerEdit = null;
      saveEditorSettings(); renderSettingsModal();
      showToast('Trigger saved');
    });
    document.getElementById('stg-tr-cancel').addEventListener('click', () => {
      _stgTriggerEdit = null; renderSettingsModal();
    });
  }
  document.querySelectorAll('.stg-item-btn-edit[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      _stgTriggerEdit = { ...editorSettings.typingTriggers[+this.dataset.i] };
      renderSettingsModal();
    });
  });
  document.querySelectorAll('.stg-item-btn-del[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      editorSettings.typingTriggers.splice(+this.dataset.i, 1);
      saveEditorSettings(); renderSettingsModal();
      showToast('Trigger deleted');
    });
  });
}

// ── Custom CSS Rules tab ─────────────────────────────────

function disposeStgCssRuleEditor() {
  if (_stgCssRuleEditor) {
    try { _stgCssRuleEditor.dispose(); } catch (e) { }
    _stgCssRuleEditor = null;
  }
}

function deNormalizeCssRuleBlock(cssText) {
  return String(cssText || '').trim();
}

function deCssRuleAlreadyExists(docCss, ruleCss) {
  const existing = deNormalizeCssRuleBlock(docCss);
  const candidate = deNormalizeCssRuleBlock(ruleCss);
  if (!existing || !candidate) return false;
  return existing.includes(candidate);
}

function renderCssRulesPanel() {
  const e = _stgCssRuleEdit;
  let html = `<div class="stg-info">
<strong>Custom CSS Rules</strong> stores reusable CSS blocks in one place.<br>
Click <strong>Add to document CSS</strong> beside any rule to append it to the current document stylesheet.<br>
Rule insertion only happens when you click the button.
  </div>
  <div class="stg-toolbar"><button class="stg-add-btn" id="stg-cssr-add">+ New Rule</button></div>`;

  if (e !== null) {
    html += `<div class="stg-form">
  <div class="stg-form-title">${e.id ? 'Edit' : 'New'} CSS Rule</div>
  <div class="stg-field">
    <label class="stg-label">Rule name</label>
    <input class="stg-input" id="stg-cssr-name" value="${escH(e.name)}" placeholder="e.g. Table style" spellcheck="false">
  </div>
  <div class="stg-field">
    <label class="stg-label">CSS block</label>
    <div class="stg-rule-editor" id="stg-cssr-editor"></div>
  </div>
  <p class="stg-hint">Write one or more full CSS rules (selector + declarations).</p>
  <div class="stg-form-actions">
    <button class="stg-btn" id="stg-cssr-save">Save</button>
    <button class="stg-btn stg-btn-cancel" id="stg-cssr-cancel">Cancel</button>
  </div>
</div>`;
  }

  const rules = Array.isArray(editorSettings.customCssRules) ? editorSettings.customCssRules : [];
  if (!rules.length) {
    if (e === null) html += '<div class="stg-empty">No custom CSS rules yet.<br>Click <strong>+ New Rule</strong> to create one.</div>';
  } else {
    rules.forEach((r, i) => {
      const oneLine = String(r.css || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      html += `<div class="stg-item-row">
    <div class="stg-item-main">
      <div class="stg-item-title">${escH(r.name || 'Untitled rule')}</div>
      <div class="stg-item-sub">${escH(oneLine || '(empty)')}</div>
    </div>
    <button class="stg-item-btn stg-item-btn-add" data-css-add="${i}">Add to document CSS</button>
    <button class="stg-item-btn stg-item-btn-edit" data-css-edit="${i}">Edit</button>
    <button class="stg-item-btn stg-item-btn-del" data-css-del="${i}">Del</button>
  </div>`;
    });
  }
  return html;
}

function bindCssRuleEvents() {
  if (!Array.isArray(editorSettings.customCssRules)) editorSettings.customCssRules = [];

  const addBtn = document.getElementById('stg-cssr-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      _stgCssRuleEdit = { name: '', css: '' };
      renderSettingsModal();
    });
  }

  if (_stgCssRuleEdit !== null) {
    disposeStgCssRuleEditor();
    const editorEl = document.getElementById('stg-cssr-editor');
    if (editorEl && typeof monaco !== 'undefined' && monaco.editor) {
      _stgCssRuleEditor = monaco.editor.create(editorEl, {
        value: String(_stgCssRuleEdit.css || ''),
        language: 'css',
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        tabSize: 2,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });
      setTimeout(() => {
        if (_stgCssRuleEditor) _stgCssRuleEditor.layout();
      }, 20);
    }

    const saveBtn = document.getElementById('stg-cssr-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = document.getElementById('stg-cssr-name').value.trim();
        const cssText = deNormalizeCssRuleBlock(
          _stgCssRuleEditor ? _stgCssRuleEditor.getValue() : ''
        );
        if (!name) { showToast('Rule name is required', true); return; }
        if (!cssText) { showToast('CSS block is required', true); return; }

        const entry = {
          id: _stgCssRuleEdit.id || genId(),
          name,
          css: cssText
        };
        if (_stgCssRuleEdit.id) {
          const idx = editorSettings.customCssRules.findIndex(r => r.id === _stgCssRuleEdit.id);
          if (idx >= 0) editorSettings.customCssRules[idx] = entry;
          else editorSettings.customCssRules.push(entry);
        } else {
          editorSettings.customCssRules.push(entry);
        }
        _stgCssRuleEdit = null;
        saveEditorSettings();
        renderSettingsModal();
        showToast('Custom CSS rule saved');
      });
    }

    const cancelBtn = document.getElementById('stg-cssr-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        _stgCssRuleEdit = null;
        renderSettingsModal();
      });
    }
  }

  document.querySelectorAll('[data-css-edit]').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = Number(this.dataset.cssEdit);
      if (!Number.isFinite(idx) || !editorSettings.customCssRules[idx]) return;
      _stgCssRuleEdit = { ...editorSettings.customCssRules[idx] };
      renderSettingsModal();
    });
  });

  document.querySelectorAll('[data-css-del]').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = Number(this.dataset.cssDel);
      if (!Number.isFinite(idx) || !editorSettings.customCssRules[idx]) return;
      editorSettings.customCssRules.splice(idx, 1);
      saveEditorSettings();
      renderSettingsModal();
      showToast('Custom CSS rule deleted');
    });
  });

  document.querySelectorAll('[data-css-add]').forEach(btn => {
    btn.addEventListener('click', async function () {
      const idx = Number(this.dataset.cssAdd);
      const entry = editorSettings.customCssRules[idx];
      if (!entry || !cssEditor) return;
      const block = deNormalizeCssRuleBlock(entry.css);
      if (!block) {
        showToast('Rule has no CSS content', true);
        return;
      }

      const currentCss = cssEditor.getValue() || '';
      const userCss = deStripManagedLayoutCss(currentCss);
      if (deCssRuleAlreadyExists(userCss, block)) {
        const ok = await showConfirm('This rule already exists in the document CSS. Add it again?');
        if (!ok) return;
      }

      const nextCss = currentCss.replace(/\s+$/, '');
      cssEditor.setValue((nextCss ? nextCss + '\n\n' : '') + block + '\n');
      showToast('Rule added to document CSS');
    });
  });
}

// ── Preferences tab ───────────────────────────────────────

function renderPrefsPanel() {
  const p = editorSettings.editorPrefs;
  const l = deClonePageLayout(editorLayoutDefaults);
  const marginPreset = deDetectMarginPreset(l.margins) || 'Custom';
  return `<div class="stg-info">
Settings for the markdown editor pane. Changes apply immediately and are saved automatically.<br>
<strong>Word wrap</strong> — <em>On</em> wraps long lines at the pane edge; <em>Column (80)</em> wraps at 80 characters; <em>Off</em> shows a horizontal scrollbar.<br>
<strong>Line numbers</strong> — <em>Relative</em> shows the distance to the current line, useful for keyboard-based navigation.<br>
<strong>Stylesheet storage</strong> — the current CSS and page layout are always stored inside the document's inline <code>&lt;style&gt;</code> tag.
  </div>
  <div class="prefs-grid">
<div class="stg-field">
  <label class="stg-label">Font Size (px)</label>
  <input type="number" class="stg-input" id="pref-font-size" min="8" max="40" value="${p.fontSize || 14}">
</div>
<div class="stg-field">
  <label class="stg-label">Tab Size</label>
  <input type="number" class="stg-input" id="pref-tab-size" min="1" max="8" value="${p.tabSize || 2}">
</div>
<div class="stg-field">
  <label class="stg-label">Word Wrap</label>
  <select class="stg-select" id="pref-word-wrap">
    <option value="on"${p.wordWrap === 'on' ? ' selected' : ''}>On</option>
    <option value="off"${p.wordWrap === 'off' ? ' selected' : ''}>Off</option>
    <option value="wordWrapColumn"${p.wordWrap === 'wordWrapColumn' ? ' selected' : ''}>Column (80)</option>
  </select>
</div>
<div class="stg-field">
  <label class="stg-label">Line Numbers</label>
  <select class="stg-select" id="pref-line-numbers">
    <option value="on"${p.lineNumbers === 'on' ? ' selected' : ''}>On</option>
    <option value="off"${p.lineNumbers === 'off' ? ' selected' : ''}>Off</option>
    <option value="relative"${p.lineNumbers === 'relative' ? ' selected' : ''}>Relative</option>
  </select>
</div>
<div class="stg-field">
  <label class="stg-label">Stylesheet Storage</label>
  <label class="stg-radio-label" style="display:flex;gap:8px;align-items:center;margin-top:6px">
    <input type="checkbox" id="pref-inline-stylesheet" checked disabled>
    Always store stylesheet inline with the document
  </label>
</div>
  </div>

  <div class="stg-form" style="margin-top:18px">
<div class="stg-form-title">Default layout properties</div>
<p class="stg-hint" style="margin:-2px 0 12px">
  These defaults are used for new documents and any document with no embedded layout settings yet.
</p>

<div class="stg-field">
  <label class="stg-label">Orientation</label>
  <div class="pl-row">
    <button class="pl-orient-btn${l.orientation === 'portrait' ? ' active' : ''}" id="pref-layout-portrait">▯ Portrait</button>
    <button class="pl-orient-btn${l.orientation === 'landscape' ? ' active' : ''}" id="pref-layout-landscape">▭ Landscape</button>
  </div>
</div>

<div class="stg-form-row">
  <div class="stg-field">
    <label class="stg-label">Paper size</label>
    <select class="stg-select" id="pref-layout-size">
      <option value="A4"${l.size === 'A4' ? ' selected' : ''}>A4 (210 × 297 mm)</option>
      <option value="A3"${l.size === 'A3' ? ' selected' : ''}>A3 (297 × 420 mm)</option>
      <option value="A5"${l.size === 'A5' ? ' selected' : ''}>A5 (148 × 210 mm)</option>
      <option value="Letter"${l.size === 'Letter' ? ' selected' : ''}>Letter (216 × 279 mm)</option>
      <option value="Legal"${l.size === 'Legal' ? ' selected' : ''}>Legal (216 × 356 mm)</option>
      <option value="Custom"${l.size === 'Custom' ? ' selected' : ''}>Custom...</option>
    </select>
  </div>
  <div class="stg-field" id="pref-layout-custom-dims"${l.size === 'Custom' ? '' : ' style="display:none"'}>
    <label class="stg-label">Custom size (mm)</label>
    <div class="stg-form-row">
      <input class="stg-input" type="number" id="pref-layout-custom-w" min="50" max="1200" step="0.5" value="${round1(l.customW)}" placeholder="W">
      <input class="stg-input" type="number" id="pref-layout-custom-h" min="50" max="1200" step="0.5" value="${round1(l.customH)}" placeholder="H">
    </div>
  </div>
</div>

<div class="stg-field">
  <label class="stg-label">Margins</label>
  <select class="stg-select" id="pref-layout-margin-preset" style="margin-bottom:8px">
    <option value="Normal"${marginPreset === 'Normal' ? ' selected' : ''}>Normal (25 mm)</option>
    <option value="Narrow"${marginPreset === 'Narrow' ? ' selected' : ''}>Narrow (13 mm)</option>
    <option value="Wide"${marginPreset === 'Wide' ? ' selected' : ''}>Wide (25 mm top/bottom, 38 mm sides)</option>
    <option value="Minimal"${marginPreset === 'Minimal' ? ' selected' : ''}>Minimal (10 mm)</option>
    <option value="None"${marginPreset === 'None' ? ' selected' : ''}>None (0 mm)</option>
    <option value="Custom"${marginPreset === 'Custom' ? ' selected' : ''}>Custom...</option>
  </select>
  <div class="stg-form-row">
    <input class="stg-input" type="number" id="pref-layout-mt" min="0" max="100" step="0.5" value="${round1(l.margins.top)}" placeholder="Top">
    <input class="stg-input" type="number" id="pref-layout-mr" min="0" max="100" step="0.5" value="${round1(l.margins.right)}" placeholder="Right">
    <input class="stg-input" type="number" id="pref-layout-mb" min="0" max="100" step="0.5" value="${round1(l.margins.bottom)}" placeholder="Bottom">
    <input class="stg-input" type="number" id="pref-layout-ml" min="0" max="100" step="0.5" value="${round1(l.margins.left)}" placeholder="Left">
  </div>
</div>

<div class="stg-form-row">
  <div class="stg-field">
    <label class="stg-label">Font family</label>
    <select class="stg-select" id="pref-layout-font-family">
      <option value="'Segoe UI', system-ui, sans-serif"${l.fontFamily === "'Segoe UI', system-ui, sans-serif" ? ' selected' : ''}>Segoe UI (default)</option>
      <option value="'Lexend', sans-serif"${l.fontFamily === "'Lexend', sans-serif" ? ' selected' : ''}>Lexend</option>
      <option value="Arial, Helvetica, sans-serif"${l.fontFamily === 'Arial, Helvetica, sans-serif' ? ' selected' : ''}>Arial</option>
      <option value="Georgia, serif"${l.fontFamily === 'Georgia, serif' ? ' selected' : ''}>Georgia</option>
      <option value="Garamond, 'EB Garamond', serif"${l.fontFamily === "Garamond, 'EB Garamond', serif" ? ' selected' : ''}>Garamond</option>
      <option value="'Times New Roman', Times, serif"${l.fontFamily === "'Times New Roman', Times, serif" ? ' selected' : ''}>Times New Roman</option>
      <option value="'Calibri', sans-serif"${l.fontFamily === "'Calibri', sans-serif" ? ' selected' : ''}>Calibri</option>
      <option value="'Palatino Linotype', Palatino, serif"${l.fontFamily === "'Palatino Linotype', Palatino, serif" ? ' selected' : ''}>Palatino</option>
      <option value="'Courier New', Courier, monospace"${l.fontFamily === "'Courier New', Courier, monospace" ? ' selected' : ''}>Courier New</option>
    </select>
  </div>
  <div class="stg-field">
    <label class="stg-label">Font size (pt)</label>
    <input type="number" class="stg-input" id="pref-layout-font-size" min="6" max="72" step="0.5" value="${round1(l.fontSize)}">
  </div>
</div>

<div class="stg-form-row">
  <div class="stg-field">
    <label class="stg-label">Page numbers</label>
    <label class="stg-radio-label" style="display:flex;gap:8px;align-items:center;margin-top:6px">
      <input type="checkbox" id="pref-layout-page-numbers"${l.pageNumbers ? ' checked' : ''}>
      Show page numbers
    </label>
  </div>
  <div class="stg-field" id="pref-layout-page-numbers-pos-row"${l.pageNumbers ? '' : ' style="display:none"'}>
    <label class="stg-label">Number position</label>
    <select class="stg-select" id="pref-layout-page-numbers-pos">
      <option value="center"${l.pageNumbersPos === 'center' ? ' selected' : ''}>Center</option>
      <option value="left"${l.pageNumbersPos === 'left' ? ' selected' : ''}>Left</option>
      <option value="right"${l.pageNumbersPos === 'right' ? ' selected' : ''}>Right</option>
    </select>
  </div>
</div>

<div class="stg-field">
  <label class="stg-label">Footer</label>
  <label class="stg-radio-label" style="display:flex;gap:8px;align-items:center;margin-top:6px">
    <input type="checkbox" id="pref-layout-footer"${l.footer ? ' checked' : ''}>
    Show footer
  </label>
  <div id="pref-layout-footer-rows" style="display:${l.footer ? 'flex' : 'none'};flex-direction:column;gap:8px;margin-top:8px">
    <input type="text" class="stg-input" id="pref-layout-footer-text" value="${escH(l.footerText || '')}" placeholder="Footer text...">
    <div class="pl-row">
      <button class="pl-orient-btn${l.footerAlign === 'left' ? ' active' : ''}" id="pref-layout-footer-left">Left</button>
      <button class="pl-orient-btn${l.footerAlign !== 'left' && l.footerAlign !== 'right' ? ' active' : ''}" id="pref-layout-footer-center">Center</button>
      <button class="pl-orient-btn${l.footerAlign === 'right' ? ' active' : ''}" id="pref-layout-footer-right">Right</button>
    </div>
  </div>
</div>

<div class="stg-form-row">
  <div class="stg-field">
    <label class="stg-label">Image width</label>
    <select class="stg-select" id="pref-layout-image-width">
      <option value="auto"${l.imageWidth === 'auto' ? ' selected' : ''}>Auto (intrinsic size)</option>
      <option value="100%"${l.imageWidth === '100%' ? ' selected' : ''}>Fit to page width</option>
      <option value="75%"${l.imageWidth === '75%' ? ' selected' : ''}>75% of page width</option>
      <option value="50%"${l.imageWidth === '50%' ? ' selected' : ''}>50% of page width</option>
    </select>
  </div>
  <div class="stg-field" style="display:flex;align-items:flex-end;gap:8px;justify-content:flex-end">
    <button class="stg-btn stg-btn-cancel" id="pref-layout-reset-defaults" type="button">Reset defaults</button>
    <button class="stg-btn" id="pref-layout-apply-now" type="button">Apply to current document</button>
  </div>
</div>
  </div>`;
}

function bindPrefsEvents() {
  function onPrefChange() {
    editorSettings.editorPrefs.fontSize = parseInt(document.getElementById('pref-font-size').value) || 14;
    editorSettings.editorPrefs.tabSize = parseInt(document.getElementById('pref-tab-size').value) || 2;
    editorSettings.editorPrefs.wordWrap = document.getElementById('pref-word-wrap').value;
    editorSettings.editorPrefs.lineNumbers = document.getElementById('pref-line-numbers').value;
    editorSettings.editorPrefs.inlineStylesheet = true;
    applyEditorPrefs();
    saveEditorSettings();
  }

  function setActive(ids, activeId) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', id === activeId);
    });
  }

  function syncLayoutPrefUi() {
    const sizeSel = document.getElementById('pref-layout-size');
    const customDims = document.getElementById('pref-layout-custom-dims');
    if (sizeSel && customDims) customDims.style.display = sizeSel.value === 'Custom' ? '' : 'none';
    const pageNums = document.getElementById('pref-layout-page-numbers');
    const pagePosRow = document.getElementById('pref-layout-page-numbers-pos-row');
    if (pageNums && pagePosRow) pagePosRow.style.display = pageNums.checked ? '' : 'none';
    const footer = document.getElementById('pref-layout-footer');
    const footerRows = document.getElementById('pref-layout-footer-rows');
    if (footer && footerRows) footerRows.style.display = footer.checked ? 'flex' : 'none';
  }

  function saveLayoutDefaultsFromUi() {
    const orientation = document.getElementById('pref-layout-landscape').classList.contains('active') ? 'landscape' : 'portrait';
    const size = document.getElementById('pref-layout-size').value || 'A4';
    const customW = parseFloat(document.getElementById('pref-layout-custom-w').value);
    const customH = parseFloat(document.getElementById('pref-layout-custom-h').value);
    const marginPreset = document.getElementById('pref-layout-margin-preset').value;
    const margins = marginPreset !== 'Custom' && MARGIN_PRESETS[marginPreset]
      ? { ...MARGIN_PRESETS[marginPreset] }
      : {
        top: parseFloat(document.getElementById('pref-layout-mt').value),
        right: parseFloat(document.getElementById('pref-layout-mr').value),
        bottom: parseFloat(document.getElementById('pref-layout-mb').value),
        left: parseFloat(document.getElementById('pref-layout-ml').value)
      };
    const footerAlign = document.getElementById('pref-layout-footer-left').classList.contains('active')
      ? 'left'
      : (document.getElementById('pref-layout-footer-right').classList.contains('active') ? 'right' : 'center');

    editorLayoutDefaults = deClonePageLayout({
      orientation,
      size,
      customW,
      customH,
      margins,
      fontFamily: document.getElementById('pref-layout-font-family').value,
      fontSize: parseFloat(document.getElementById('pref-layout-font-size').value),
      pageNumbers: !!document.getElementById('pref-layout-page-numbers').checked,
      pageNumbersPos: document.getElementById('pref-layout-page-numbers-pos').value,
      footer: !!document.getElementById('pref-layout-footer').checked,
      footerText: document.getElementById('pref-layout-footer-text').value,
      footerAlign,
      imageWidth: document.getElementById('pref-layout-image-width').value
    });

    editorSettings.editorPrefs.defaultLayout = deClonePageLayout(editorLayoutDefaults);
    saveEditorSettings();
  }

  ['pref-font-size', 'pref-tab-size', 'pref-word-wrap', 'pref-line-numbers'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', onPrefChange);
    if (el.type === 'number') el.addEventListener('input', onPrefChange);
  });

  document.getElementById('pref-layout-portrait').addEventListener('click', function (e) {
    e.preventDefault();
    setActive(['pref-layout-portrait', 'pref-layout-landscape'], 'pref-layout-portrait');
    saveLayoutDefaultsFromUi();
  });
  document.getElementById('pref-layout-landscape').addEventListener('click', function (e) {
    e.preventDefault();
    setActive(['pref-layout-portrait', 'pref-layout-landscape'], 'pref-layout-landscape');
    saveLayoutDefaultsFromUi();
  });

  document.getElementById('pref-layout-margin-preset').addEventListener('change', function () {
    if (this.value !== 'Custom' && MARGIN_PRESETS[this.value]) {
      const p = MARGIN_PRESETS[this.value];
      document.getElementById('pref-layout-mt').value = round1(p.top);
      document.getElementById('pref-layout-mr').value = round1(p.right);
      document.getElementById('pref-layout-mb').value = round1(p.bottom);
      document.getElementById('pref-layout-ml').value = round1(p.left);
    }
    saveLayoutDefaultsFromUi();
  });

  ['pref-layout-mt', 'pref-layout-mr', 'pref-layout-mb', 'pref-layout-ml'].forEach(id => {
    const el = document.getElementById(id);
    const marginHandler = function () {
      document.getElementById('pref-layout-margin-preset').value = 'Custom';
      saveLayoutDefaultsFromUi();
    };
    el.addEventListener('change', marginHandler);
    el.addEventListener('input', marginHandler);
  });

  ['pref-layout-size', 'pref-layout-custom-w', 'pref-layout-custom-h', 'pref-layout-font-family', 'pref-layout-font-size',
    'pref-layout-page-numbers', 'pref-layout-page-numbers-pos', 'pref-layout-footer', 'pref-layout-footer-text',
    'pref-layout-image-width'].forEach(id => {
      const el = document.getElementById(id);
      const handler = function () {
        syncLayoutPrefUi();
        saveLayoutDefaultsFromUi();
      };
      el.addEventListener('change', handler);
      if (el.tagName === 'INPUT') el.addEventListener('input', handler);
    });

  document.getElementById('pref-layout-footer-left').addEventListener('click', function (e) {
    e.preventDefault();
    setActive(['pref-layout-footer-left', 'pref-layout-footer-center', 'pref-layout-footer-right'], 'pref-layout-footer-left');
    saveLayoutDefaultsFromUi();
  });
  document.getElementById('pref-layout-footer-center').addEventListener('click', function (e) {
    e.preventDefault();
    setActive(['pref-layout-footer-left', 'pref-layout-footer-center', 'pref-layout-footer-right'], 'pref-layout-footer-center');
    saveLayoutDefaultsFromUi();
  });
  document.getElementById('pref-layout-footer-right').addEventListener('click', function (e) {
    e.preventDefault();
    setActive(['pref-layout-footer-left', 'pref-layout-footer-center', 'pref-layout-footer-right'], 'pref-layout-footer-right');
    saveLayoutDefaultsFromUi();
  });

  document.getElementById('pref-layout-reset-defaults').addEventListener('click', function () {
    editorLayoutDefaults = deCloneDefaultPageLayout();
    editorSettings.editorPrefs.defaultLayout = deClonePageLayout(editorLayoutDefaults);
    saveEditorSettings();
    renderSettingsModal();
    showToast('Default layout properties reset');
  });

  document.getElementById('pref-layout-apply-now').addEventListener('click', function () {
    const defaults = deClonePageLayout(editorLayoutDefaults);
    Object.assign(pageLayout, defaults);
    pageLayout.margins = { ...defaults.margins };
    syncPopupToState();
    applyPageLayoutToPreview();
    updatePreviewFooter();
    savePageLayout();
    showToast('Default layout applied to current document');
  });

  syncLayoutPrefUi();
}

// ── Syntax Guide Modal ───────────────────────────────────
let _syntaxActiveTab = 'typ';
let _syntaxActiveCat = 'all';
let _syntaxSearchQuery = '';

const SYNTAX_DOCS = {
  typ: {
    badge: 'Typst (.typ)',
    intro: '<strong>Typst</strong> is a modern, ultra-fast typesetting engine with native mathematical layout, flexible page geometry, and high-fidelity vector PDF export. Ideal for worksheets, tests, exams, problem sets, and academic handouts.',
    categories: [
      { id: 'all', label: 'All' },
      { id: 'setup', label: 'Setup & Page' },
      { id: 'text', label: 'Text & Typography' },
      { id: 'math', label: 'Math & Formulas' },
      { id: 'table', label: 'Tables & Grids' },
      { id: 'exam', label: 'Exams & Quizzes' },
      { id: 'layout', label: 'Layout & Callouts' },
      { id: 'media', label: 'Media & Figures' }
    ],
    sections: [
      {
        cat: 'setup',
        title: 'Document & Page Geometry',
        badgeClass: 'badge-setup',
        desc: 'Configure page paper size, margins, header, and dynamic footer page numbering.',
        code: '#set page(\n paper: "a4",\n margin: (top: 2.5cm, bottom: 2.5cm, x: 2cm),\n header: align(right)[*Class Test — Semester 1*],\n footer: context align(center)[Page #counter(page).display()]\n)'
      },
      {
        cat: 'setup',
        title: 'Typography & Line Spacing',
        badgeClass: 'badge-setup',
        desc: 'Set base font family, text size, language, and paragraph line leading.',
        code: '#set text(font: "Segoe UI", size: 11pt, lang: "en")\n#set par(justify: true, leading: 0.75em)'
      },
      {
        cat: 'text',
        title: 'Headings with Custom Numbering',
        badgeClass: 'badge-setup',
        desc: 'Create structured document sections with automatic numbering patterns.',
        code: '#set heading(numbering: "1.1.")\n= Chapter 1: Introduction\n== Section 1.1: Foundations\n=== Subsection: Details'
      },
      {
        cat: 'text',
        title: 'Lists & Term Definitions',
        badgeClass: 'badge-setup',
        desc: 'Bulleted lists, numbered steps, and dictionary term lists.',
        code: '- Bullet point item\n - Nested sub-item\n+ Numbered item 1\n+ Numbered item 2\n\n/ Term: Definition of the concept'
      },
      {
        cat: 'text',
        title: 'Colors & Text Highlights',
        badgeClass: 'badge-setup',
        desc: 'Apply custom text fills, background highlights, and inline code formatting.',
        code: '#text(fill: rgb("#0284c7"), weight: "bold")[Blue text]\n#highlight(fill: rgb("#fef08a"))[Highlighted text]\n#underline[Underlined] and #strike[Strikethrough]\n`inline_code_symbol()`'
      },
      {
        cat: 'math',
        title: 'Quadratic & Algebraic Equations',
        badgeClass: 'badge-math',
        desc: 'Native math typesetting using $ ... $ for inline math or block display equations.',
        code: '// Inline math: $f(x) = a x^2 + b x + c$\n\n// Display equation\n$ x = (-b +- sqrt(b^2 - 4 a c)) / (2a) $'
      },
      {
        cat: 'math',
        title: 'Integrals & Summations with Limits',
        badgeClass: 'badge-math',
        desc: 'Calculus definite integrals, sums, and differentials.',
        code: '$ integral_0^infinity e^(-x^2) dif x = sqrt(pi) / 2 $\n\n$ sum_(i=1)^n i^2 = (n(n + 1)(2n + 1)) / 6 $'
      },
      {
        cat: 'math',
        title: 'Matrices & Column Vectors',
        badgeClass: 'badge-math',
        desc: 'Multi-dimensional matrices and column vectors.',
        code: '$ A = mat(1, 2, 3; 4, 5, 6; 7, 8, 9) $\n\n$ vec(v_x, v_y, v_z) $'
      },
      {
        cat: 'math',
        title: 'Piecewise Functions & Cases',
        badgeClass: 'badge-math',
        desc: 'Piecewise mathematical definitions with branch conditions.',
        code: '$ f(x) = cases(\n x^2 &"if" x >= 0,\n -x &"if" x < 0\n) $'
      },
      {
        cat: 'math',
        title: 'Aligned Equation Systems',
        badgeClass: 'badge-math',
        desc: 'Systems of equations aligned at the equals sign using &.',
        code: '$ 2x + 3y &= 12 \ x - y &= 1 $'
      },
      {
        cat: 'math',
        title: 'Greek Symbols & Logic Operators',
        badgeClass: 'badge-math',
        desc: 'Standard mathematical and Greek symbols.',
        code: '$ alpha, beta, gamma, theta, pi, lambda, Delta, Omega $\n$ forall x in RR, exists y > x : y - x >= epsilon $'
      },
      {
        cat: 'table',
        title: 'Assessment & Rubric Table',
        badgeClass: 'badge-table',
        desc: 'Multi-column tables with headers, alignments, and score fill-in lines.',
        code: '#table(\n columns: (3fr, 1fr, 1fr),\n align: (left, center, center),\n table.header([ *Assessment Criteria* ], [ *Max* ], [ *Score* ]),\n [ Grammar & Syntax ], [ 10 pts ], [ _____ ],\n [ Vocabulary Precision ], [ 10 pts ], [ _____ ],\n [ Structure & Coherence ], [ 10 pts ], [ _____ ],\n [ *Total* ], [ *30 pts* ], [ *_____* ]\n)'
      },
      {
        cat: 'table',
        title: 'Custom Table Styling & Fills',
        badgeClass: 'badge-table',
        desc: 'Alternate row coloring, custom strokes, and cell spans.',
        code: '#table(\n columns: (1fr, 2fr),\n fill: (col, row) => if row == 0 { rgb("#f1f5f9") },\n stroke: (x, y) => if y == 0 { (bottom: 1.5pt + rgb("#0284c7")) } else { 0.5pt + rgb("#e2e8f0") },\n [ *Term* ], [ *Definition* ],\n [ Velocity ], [ Rate of change of position with respect to time. ]\n)'
      },
      {
        cat: 'exam',
        title: 'Fill-in-the-Blank Question',
        badgeClass: 'badge-exam',
        desc: 'Question item with allocated marks and student writing lines.',
        code: '+ *Question 1* #h(1fr) *(4 points)*\n State Newton\'s Second Law of Motion:\n #v(6pt)\n #line(length: 100%, stroke: 0.5pt + gray)\n #v(8pt)\n #line(length: 100%, stroke: 0.5pt + gray)'
      },
      {
        cat: 'exam',
        title: 'Multiple Choice Question (MCQ)',
        badgeClass: 'badge-exam',
        desc: 'Multiple choice layout with choice option badges.',
        code: '+ *Which element has atomic number 6?* #h(1fr) *(2 pts)*\n #grid(\n columns: (1fr, 1fr),\n gutter: 8pt,\n [ #box(stroke: 0.5pt, inset: 4pt)[A] Oxygen ],\n [ #box(stroke: 0.5pt, inset: 4pt)[B] Carbon ],\n [ #box(stroke: 0.5pt, inset: 4pt)[C] Nitrogen ],\n [ #box(stroke: 0.5pt, inset: 4pt)[D] Hydrogen ]\n )'
      },
      {
        cat: 'layout',
        title: 'Multi-Column Grid Layout',
        badgeClass: 'badge-layout',
        desc: 'Side-by-side columns with custom gap spacing.',
        code: '#grid(\n columns: (1fr, 1fr),\n gutter: 20pt,\n [\n *Part A: Theory*\n + Question 1\n + Question 2\n ],\n [\n *Part B: Exercises*\n + Exercise 1\n + Exercise 2\n ]\n)'
      },
      {
        cat: 'layout',
        title: 'Information & Warning Callout Box',
        badgeClass: 'badge-layout',
        desc: 'Styled callout box with accent left border and soft background.',
        code: '#rect(width: 100%, fill: rgb("#f0f9ff"), stroke: (left: 4pt + rgb("#0284c7")), inset: 12pt, radius: (right: 4pt))[\n #text(weight: "bold", fill: rgb("#0369a1"))[Important Exam Notice]\n \n Calculators are permitted for Section B only.\n]'
      },
      {
        cat: 'layout',
        title: 'Page Breaks & Spacing',
        badgeClass: 'badge-layout',
        desc: 'Manual page breaks, vertical spacing, and horizontal rules.',
        code: '#v(16pt)\n#line(length: 100%, stroke: 0.5pt + gray)\n#pagebreak()\n#align(center)[ *Section 2: Practical Lab* ]'
      },
      {
        cat: 'media',
        title: 'Figures & Images with Captions',
        badgeClass: 'badge-setup',
        desc: 'Embed images with automatic numbering and captions.',
        code: '#figure(\n image("diagram.png", width: 65%),\n caption: [Cellular Mitosis Stages]\n)'
      }
    ]
  },
  md: {
    badge: 'Markdown (.md)',
    intro: '<strong>Markdown</strong> is a lightweight, easy-to-read markup language styled with CSS stylesheets. Ideal for lesson plans, lecture notes, outlines, and documents styled with web layouts.',
    categories: [
      { id: 'all', label: 'All' },
      { id: 'text', label: 'Headings & Text' },
      { id: 'math', label: 'KaTeX Math' },
      { id: 'table', label: 'Tables' },
      { id: 'exam', label: 'Questions & Rubrics' },
      { id: 'layout', label: 'Layout & Callouts' },
      { id: 'media', label: 'Media & Links' }
    ],
    sections: [
      {
        cat: 'text',
        title: 'Headings & Document Structure',
        badgeClass: 'badge-setup',
        desc: 'Standard Markdown headings from Level 1 to Level 4.',
        code: '# Heading 1 (Document Title)\n## Heading 2 (Major Section)\n### Heading 3 (Subsection)\n#### Heading 4 (Small Header)'
      },
      {
        cat: 'text',
        title: 'Text Formatting & Badges',
        badgeClass: 'badge-setup',
        desc: 'Bold, italic, strikethrough, highlights, code, and keyboard keys.',
        code: '**Bold text**, *Italic text*, ~~Strikethrough~~\n`inline_code()`\n<kbd>Ctrl</kbd> + <kbd>P</kbd>'
      },
      {
        cat: 'text',
        title: 'Lists & Interactive Task Checklists',
        badgeClass: 'badge-setup',
        desc: 'Bulleted lists, numbered steps, and interactive checkboxes.',
        code: '- [x] Chapter 1 reading completed\n- [ ] Laboratory report due Friday\n- [ ] Midterm review worksheet\n\n1. First step\n2. Second step'
      },
      {
        cat: 'text',
        title: 'Blockquotes & Teacher Notes',
        badgeClass: 'badge-setup',
        desc: 'Indented blockquotes for citations, rules, or tips.',
        code: '> **Teacher Note:**\n> Ensure all calculations show clear intermediate working steps.'
      },
      {
        cat: 'math',
        title: 'KaTeX Formulas & Fractions',
        badgeClass: 'badge-math',
        desc: 'Mathematical expressions using LaTeX syntax ($ for inline, $$ for block).',
        code: 'Inline: $f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$\n\nDisplay equation:\n$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$'
      },
      {
        cat: 'math',
        title: 'KaTeX Matrices & Inverses',
        badgeClass: 'badge-math',
        desc: 'Matrix brackets and linear algebra operations.',
        code: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad-bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}$$'
      },
      {
        cat: 'math',
        title: 'Aligned Multi-line Equations',
        badgeClass: 'badge-math',
        desc: 'Multi-line derivation aligned with &.',
        code: '$$\\begin{aligned}\n (x+y)^2 &= (x+y)(x+y) \\\\\n &= x^2 + 2xy + y^2\n\\end{aligned}$$'
      },
      {
        cat: 'table',
        title: 'Markdown Grade & Task Table',
        badgeClass: 'badge-table',
        desc: 'Tabular data with column alignments (:--- left, :---: center, ---: right).',
        code: '| Student Name | Quiz 1 (10) | Midterm (40) | Grade |\n| :--- | :---: | :---: | ---: |\n| Alice Johnson | 9.5 | 38 | A |\n| Bob Smith | 8.0 | 34 | B |\n| Charlie Brown | 10.0 | 39 | A+ |'
      },
      {
        cat: 'exam',
        title: 'Exam Question with Point Weight',
        badgeClass: 'badge-exam',
        desc: 'Numbered exam question with rubric allocation.',
        code: '### Question 1 (5 Points)\nSolve for $x$ in the equation $3x - 7 = 14$.\n\n**Answer:** `____________________________`'
      },
      {
        cat: 'layout',
        title: 'Callout Alert Box',
        badgeClass: 'badge-layout',
        desc: 'Styled HTML callout box inside Markdown.',
        code: '<div style="background:#f0f9ff; border-left:4px solid #0284c7; padding:10px 14px; border-radius:4px; margin:12px 0;">\n <strong>Important:</strong> Bring a scientific calculator to the test.\n</div>'
      },
      {
        cat: 'layout',
        title: 'Two-Column Flexbox Grid',
        badgeClass: 'badge-layout',
        desc: 'Side-by-side flex columns inside Markdown.',
        code: '<div style="display:flex; gap:20px; margin:16px 0;">\n <div style="flex:1;">\n <h4>Vocabulary List</h4>\n <ul><li>Hypothesis</li><li>Variable</li></ul>\n </div>\n <div style="flex:1;">\n <h4>Fill-in Exercises</h4>\n <p>1. A testable prediction is a _______.</p>\n </div>\n</div>'
      },
      {
        cat: 'layout',
        title: 'Printable Page Break',
        badgeClass: 'badge-layout',
        desc: 'Forces a clean page break during PDF export and print.',
        code: 'End of Section 1 content.\n\n<!-- pagebreak -->\n\n# Section 2: Written Essay'
      },
      {
        cat: 'media',
        title: 'Images & Captions',
        badgeClass: 'badge-setup',
        desc: 'Embedded image with center-aligned italic caption.',
        code: '![Diagram](diagram.png)\n*Figure 1: Standard double-slit apparatus.*'
      }
    ]
  },
  html: {
    badge: 'HTML (.html)',
    intro: '<strong>HTML</strong> provides unrestricted control over DOM markup, custom classes, inline styles, and embedded CSS <code>&lt;style&gt;</code> blocks.',
    categories: [
      { id: 'all', label: 'All' },
      { id: 'setup', label: 'Header & Meta' },
      { id: 'table', label: 'Tables' },
      { id: 'exam', label: 'Exam Cards' },
      { id: 'layout', label: 'Layout & Boxes' },
      { id: 'media', label: 'CSS Stylesheets' }
    ],
    sections: [
      {
        cat: 'setup',
        title: 'Handout Document Header',
        badgeClass: 'badge-setup',
        desc: 'Semantic header with title, subtitle, and metadata.',
        code: '<div style="border-bottom:2px solid #0284c7; padding-bottom:12px; margin-bottom:20px;">\n <h1 style="margin:0; font-size:24px; color:#0f172a;">Midterm Examination</h1>\n <p style="margin:4px 0 0; color:#64748b; font-size:14px;">Physics 101 — Instructor: Dr. Miller</p>\n</div>'
      },
      {
        cat: 'table',
        title: 'Styled Assessment Table',
        badgeClass: 'badge-table',
        desc: 'Full HTML table with clean borders, header fill, and alternating rows.',
        code: '<table style="width:100%; border-collapse:collapse; margin:16px 0;">\n <thead>\n <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1;">\n <th style="padding:10px; text-align:left;">Topic</th>\n <th style="padding:10px; text-align:center;">Max Points</th>\n <th style="padding:10px; text-align:center;">Score</th>\n </tr>\n </thead>\n <tbody>\n <tr style="border-bottom:1px solid #e2e8f0;">\n <td style="padding:8px 10px;">Mechanics</td>\n <td style="padding:8px 10px; text-align:center;">20</td>\n <td style="padding:8px 10px; text-align:center;">____</td>\n </tr>\n </tbody>\n</table>'
      },
      {
        cat: 'exam',
        title: 'Question Card with Points Badge',
        badgeClass: 'badge-exam',
        desc: 'Bordered question card with a pill badge and student answer space.',
        code: '<div style="border:1px solid #e2e8f0; border-radius:6px; padding:16px; margin:12px 0;">\n <div style="display:flex; justify-content:space-between; align-items:center;">\n <strong>Question 1</strong>\n <span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600;">5 Points</span>\n </div>\n <p style="margin:10px 0 0;">Explain the difference between speed and velocity.</p>\n <div style="border-bottom:1px dashed #94a3b8; height:40px; margin-top:10px;"></div>\n</div>'
      },
      {
        cat: 'layout',
        title: 'Two-Column Flexbox Worksheet',
        badgeClass: 'badge-layout',
        desc: 'Side-by-side exercise layout.',
        code: '<div style="display:flex; gap:20px; margin:16px 0;">\n <div style="flex:1; background:#f8fafc; padding:14px; border-radius:6px;">\n <h3 style="margin-top:0;">Vocabulary Bank</h3>\n <ul><li>Hypothesis</li><li>Variable</li></ul>\n </div>\n <div style="flex:1; padding:14px;">\n <h3 style="margin-top:0;">Fill in the blanks</h3>\n <p>1. A testable prediction is a _________.</p>\n </div>\n</div>'
      },
      {
        cat: 'layout',
        title: 'Printable Page Break',
        badgeClass: 'badge-layout',
        desc: 'Forces page break in Electron PDF generator.',
        code: '<div style="page-break-after: always; break-after: page;"></div>'
      },
      {
        cat: 'media',
        title: 'Embedded CSS Stylesheet',
        badgeClass: 'badge-setup',
        desc: 'Custom styles defined directly within the document.',
        code: '<style>\n .callout {\n background: #f0fdf4;\n border-left: 4px solid #10b981;\n padding: 12px 16px;\n border-radius: 4px;\n color: #065f46;\n }\n</style>\n<div class="callout">\n <strong>Tip:</strong> Remember to simplify all fractions.\n</div>'
      }
    ]
  },
  mailposting: {
    badge: 'Mailposting Tokens',
    intro: '<strong>Mailposting</strong> variables dynamically insert individual student and class data across Markdown, Typst, and HTML documents during preview and batch PDF export.',
    categories: [
      { id: 'all', label: 'All' },
      { id: 'student', label: 'Student Fields' },
      { id: 'class', label: 'Class & Dates' },
      { id: 'templates', label: 'Full Templates' }
    ],
    sections: [
      {
        cat: 'student',
        title: 'Student Identity Tokens',
        badgeClass: 'badge-setup',
        desc: 'Substituted with each student\'s personalized data.',
        code: '{{student.fullName}} // Full name (e.g. Jane Doe)\n{{student.firstName}} // First name (e.g. Jane)\n{{student.lastName}} // Last name (e.g. Doe)\n{{student.id}} // Student UUID / identifier\n{{student.email}} // Email address\n{{student.notes}} // Teacher notes'
      },
      {
        cat: 'class',
        title: 'Class & Date Tokens',
        badgeClass: 'badge-setup',
        desc: 'Substituted with connected class metadata and generation date.',
        code: '{{class.name}} // Class title (e.g. Grade 10-A)\n{{class.total}} // Total student count\n{{datetime.today}} // Formatted date (e.g. Oct 24, 2026)\n{{datetime.year}} // Current year'
      },
      {
        cat: 'templates',
        title: 'Full Typst Student Report Template',
        badgeClass: 'badge-exam',
        desc: 'Complete Typst template for generating personalized student report cards.',
        code: '#set page(paper: "a4", margin: 2cm)\n\n#align(center)[\n #text(18pt, weight: "bold")[Quarterly Progress Report]\n #v(4pt)\n #text(11pt, fill: gray)[Student: *{{student.fullName}}* | Class: *{{class.name}}* | ID: {{student.id}}]\n]\n\n#v(16pt)\n#table(\n columns: (2fr, 1fr, 3fr),\n table.header([ *Subject* ], [ *Grade* ], [ *Teacher Comments* ]),\n [ Mathematics ], [ A ], [ Outstanding problem solving. ],\n [ Science ], [ B+ ], [ Excellent lab experiment participation. ]\n)\n\n#v(20pt)\n#align(right)[ Date: {{datetime.today}} ]'
      },
      {
        cat: 'templates',
        title: 'Full Markdown Student Report Template',
        badgeClass: 'badge-exam',
        desc: 'Complete Markdown template for generating batch student evaluations.',
        code: '# Semester Progress Report\n\n**Student:** {{student.fullName}} \n**Class:** {{class.name}} \n**Student ID:** {{student.id}} \n**Date:** {{datetime.today}}\n\n---\n\n### Academic Performance\n\n| Assessment | Score | Out of | Status |\n| :--- | :---: | :---: | :--- |\n| Midterm Exam | 42 | 50 | Passed |\n| Homework Portfolio | 95% | 100% | Excellent |\n\n### Teacher Comments\nDear {{student.firstName}}, you have demonstrated great dedication this semester!'
      }
    ]
  },
  css: {
    badge: 'CSS Style',
    intro: '<strong>Custom CSS Rules & Styles</strong> provide reusable styling blocks for classes, tables, headers, callouts, and typography. Click <strong>Apply to Document CSS</strong> to inject any rule directly into your document stylesheet.',
    categories: [
      { id: 'all', label: 'All' },
      { id: 'custom', label: 'Custom Rules' },
      { id: 'boxes', label: 'Callout Boxes' },
      { id: 'tables', label: 'Table Themes' },
      { id: 'typography', label: 'Typography' },
      { id: 'print', label: 'Print & Page Breaks' }
    ],
    sections: [
      {
        cat: 'boxes',
        title: 'Highlighted Callout Box',
        badgeClass: 'badge-layout',
        desc: 'A prominent note box with rounded border and soft background.',
        code: '.callout-box {\n background: #f8fafc;\n border-left: 4px solid #3b82f6;\n padding: 12px 16px;\n margin: 12px 0;\n border-radius: 4px;\n}'
      },
      {
        cat: 'boxes',
        title: 'Exam Warning Notice',
        badgeClass: 'badge-exam',
        desc: 'Yellow alert block for test rules or caution notes.',
        code: '.exam-notice {\n background: #fefce8;\n border: 2px solid #ca8a04;\n padding: 10px 14px;\n margin: 10px 0;\n font-weight: 600;\n border-radius: 6px;\n}'
      },
      {
        cat: 'tables',
        title: 'Zebra Striped Table',
        badgeClass: 'badge-table',
        desc: 'Alternating table row background shading.',
        code: 'table.zebra tr:nth-child(even) {\n background-color: #f1f5f9;\n}\ntable.zebra th {\n background-color: #e2e8f0;\n font-weight: 700;\n}'
      },
      {
        cat: 'print',
        title: 'Force Page Break Before',
        badgeClass: 'badge-setup',
        desc: 'Ensures element starts cleanly on a new printed page.',
        code: '.page-break-before {\n break-before: page;\n page-break-before: always;\n}'
      }
    ]
  }
};

function openSyntaxHelpModal(defaultTab) {
  if (defaultTab) {
    _syntaxActiveTab = defaultTab;
  } else if (currentDocType === 'typ') {
    _syntaxActiveTab = 'typ';
  } else if (currentDocType === 'html') {
    _syntaxActiveTab = 'html';
  } else {
    _syntaxActiveTab = 'md';
  }
  _syntaxActiveCat = 'all';
  _syntaxSearchQuery = '';
  const searchInput = document.getElementById('syntax-search-input');
  if (searchInput) searchInput.value = '';
  renderSyntaxHelpModal();
  showModal('syntax-help-modal');
}

function renderSyntaxHelpModal() {
  const tabs = [
    { id: 'typ', label: 'Typst (.typ)' },
    { id: 'md', label: 'Markdown (.md)' },
    { id: 'html', label: 'HTML (.html)' },
    { id: 'css', label: window.t ? t('deTabCssRules') : 'CSS Styles' },
    { id: 'mailposting', label: 'Mailposting Tokens' }
  ];

  const tabsEl = document.getElementById('syntax-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = tabs.map(t =>
      `<button class="syntax-tab${_syntaxActiveTab === t.id ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');

    tabsEl.querySelectorAll('.syntax-tab').forEach(btn => {
      btn.addEventListener('click', function () {
        _syntaxActiveTab = this.dataset.tab;
        _syntaxActiveCat = 'all';
        _syntaxSearchQuery = '';
        const searchInput = document.getElementById('syntax-search-input');
        if (searchInput) searchInput.value = '';
        renderSyntaxHelpModal();
      });
    });
  }

  const doc = SYNTAX_DOCS[_syntaxActiveTab] || SYNTAX_DOCS.typ;
  const customSnippets = _syntaxActiveTab === 'css'
    ? (editorSettings.customCssRules || []).map(r => ({
        id: r.id,
        cat: 'custom',
        title: r.name || 'Custom CSS Rule',
        desc: 'Custom CSS style rule',
        code: r.css || '',
        badgeClass: 'badge-custom',
        custom: true,
        isCss: true
      }))
    : (editorSettings.customSyntaxSnippets || []).filter(s => s.targetType === _syntaxActiveTab);

  // Render category chips
  const catChipsEl = document.getElementById('syntax-cat-chips');
  if (catChipsEl) {
    let categories = [...(doc.categories || [{ id: 'all', label: 'All' }])];
    if (customSnippets.length > 0 && !categories.some(c => c.id === 'custom')) {
      categories.push({ id: 'custom', label: 'Custom' });
    }
    catChipsEl.innerHTML = categories.map(c =>
      `<button class="syntax-cat-chip${_syntaxActiveCat === c.id ? ' active' : ''}" data-cat="${c.id}">${c.label}</button>`
    ).join('');

    catChipsEl.querySelectorAll('.syntax-cat-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        _syntaxActiveCat = this.dataset.cat;
        renderSyntaxCardsOnly();
      });
    });
  }

  // Search input handler
  const searchInput = document.getElementById('syntax-search-input');
  if (searchInput && !searchInput._bound) {
    searchInput._bound = true;
    searchInput.addEventListener('input', function () {
      _syntaxSearchQuery = (this.value || '').trim().toLowerCase();
      renderSyntaxCardsOnly();
    });
  }

  renderSyntaxCardsOnly();
}

function renderSyntaxCardsOnly() {
  const body = document.getElementById('syntax-body');
  if (!body) return;

  const doc = SYNTAX_DOCS[_syntaxActiveTab] || SYNTAX_DOCS.typ;
  let html = `<div class="syntax-intro-banner">${doc.intro}</div>`;

  const customSnippets = _syntaxActiveTab === 'css'
    ? (editorSettings.customCssRules || []).map(r => ({
        id: r.id,
        cat: 'custom',
        title: r.name || 'Custom CSS Rule',
        desc: 'Custom CSS style rule',
        code: r.css || '',
        badgeClass: 'badge-custom',
        custom: true,
        isCss: true
      }))
    : (editorSettings.customSyntaxSnippets || []).filter(s => s.targetType === _syntaxActiveTab);
  let combinedSections = [...customSnippets, ...(doc.sections || [])];

  let filteredSections = combinedSections;

  if (_syntaxActiveCat && _syntaxActiveCat !== 'all') {
    filteredSections = filteredSections.filter(s => s.cat === _syntaxActiveCat);
  }

  if (_syntaxSearchQuery) {
    filteredSections = filteredSections.filter(s =>
      (s.title || '').toLowerCase().includes(_syntaxSearchQuery) ||
      (s.desc || '').toLowerCase().includes(_syntaxSearchQuery) ||
      (s.code || '').toLowerCase().includes(_syntaxSearchQuery)
    );
  }

  if (filteredSections.length === 0) {
    html += '<div class="syntax-empty">No matching syntax snippets found.</div>';
  } else {
    html += '<div class="syntax-grid">';
    filteredSections.forEach(sec => {
      const escCode = escHtml(sec.code);
      const jsonCode = JSON.stringify(sec.code).replace(/"/g, '&quot;');
      const isCustom = !!sec.custom;
      const badgeCls = isCustom ? 'badge-custom' : (sec.badgeClass || '');
      const badgeLabel = isCustom ? 'Custom' : doc.badge;
      html += `
        <div class="syntax-card${isCustom ? ' syntax-card-custom' : ''}">
          <div class="syntax-card-header">
            <span class="syntax-card-title">${escHtml(sec.title)}</span>
            <span class="syntax-badge ${badgeCls}">${badgeLabel}</span>
          </div>
          <div class="syntax-card-desc">${escHtml(sec.desc || '')}</div>
          <div class="syntax-code-wrap">
            <pre class="syntax-code-pre">${escCode}</pre>
            <div class="syntax-actions">
              <button class="syntax-action-btn" data-syntax-action="copy">Copy</button>
              ${_syntaxActiveTab === 'css' || sec.isCss
                ? `<button class="syntax-action-btn syntax-insert-btn" data-syntax-action="apply-css" title="Apply to document stylesheet">+ Apply to Document</button>`
                : `<button class="syntax-action-btn syntax-insert-btn" data-syntax-action="insert">+ Insert</button>`}
              ${isCustom ? (`${_syntaxActiveTab === 'css' || sec.isCss
                ? `<button class="syntax-action-btn syntax-edit-btn" data-syntax-action="edit-css" data-syntax-id="${escHtml(sec.id)}" title="${window.t ? t('deEditCssRuleTitle', 'Edit custom CSS rule') : 'Edit custom CSS rule'}">${window.t ? t('btnEdit', 'Edit') : 'Edit'}</button><button class="syntax-action-btn syntax-del-btn" data-syntax-action="del-css" data-syntax-id="${escHtml(sec.id)}" title="${window.t ? t('deDeleteCssRuleTitle', 'Delete custom CSS rule') : 'Delete custom CSS rule'}">${window.t ? t('btnDelete', 'Delete') : 'Delete'}</button>`
                : `<button class="syntax-action-btn syntax-edit-btn" data-syntax-action="edit-snippet" data-syntax-id="${escHtml(sec.id)}" title="${window.t ? t('deEditSnippetTitle', 'Edit custom snippet') : 'Edit custom snippet'}">${window.t ? t('btnEdit', 'Edit') : 'Edit'}</button><button class="syntax-action-btn syntax-del-btn" data-syntax-action="del-snippet" data-syntax-id="${escHtml(sec.id)}" title="${window.t ? t('deDeleteSnippetTitle', 'Delete custom snippet') : 'Delete custom snippet'}">${window.t ? t('btnDelete', 'Delete') : 'Delete'}</button>`}`) : ''}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  body.innerHTML = html;
  if (!body._deSyntaxDelegated) {
    body._deSyntaxDelegated = true;
    body.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-syntax-action]');
      if (!btn) return;
      var act = btn.getAttribute('data-syntax-action');
      var id = btn.getAttribute('data-syntax-id');
      var wrap = btn.closest('.syntax-code-wrap');
      var pre = wrap ? wrap.querySelector('.syntax-code-pre') : null;
      var code = pre ? pre.textContent : '';
      if (act === 'copy') copySyntaxSnippet(btn, code);
      else if (act === 'apply-css') applyCssRuleToDoc(code);
      else if (act === 'insert') insertSyntaxSnippet(code);
      else if (act === 'edit-css') editCustomCssRule(id);
      else if (act === 'del-css') deleteCustomCssRule(id);
      else if (act === 'edit-snippet') editCustomSyntaxSnippet(id);
      else if (act === 'del-snippet') deleteCustomSyntaxSnippet(id);
    });
  }
}

// ── Add to Syntax Snippet & Custom CSS Modal Controllers ────────────────
let _editingSyntaxSnippetId = null;
let _editingCssRuleId = null;

function closeAddSyntaxSnippetModal() {
  _editingSyntaxSnippetId = null;
  hideModal('add-syntax-snippet-modal');
}

function closeAddCustomCssModal() {
  _editingCssRuleId = null;
  const optLib = document.getElementById('add-css-opt-library');
  if (optLib) optLib.disabled = false;
  hideModal('add-custom-css-modal');
}

function openAddSyntaxSnippetModal(initialText, fileType) {
  _editingSyntaxSnippetId = null;
  const modalTitle = document.querySelector('#add-syntax-snippet-modal .modal-title');
  if (modalTitle) modalTitle.textContent = window.t ? t('deAddSyntaxSnippet', 'Add to Syntax Snippets') : 'Add to Syntax Snippets';
  const confirmBtn = document.getElementById('btn-add-snip-confirm');
  if (confirmBtn) confirmBtn.textContent = window.t ? t('deSaveSnippet', 'Save Snippet') : 'Save Snippet';

  const typeSelect = document.getElementById('add-snip-target-type');
  const titleInput = document.getElementById('add-snip-title');
  const descInput = document.getElementById('add-snip-desc');
  const codeInput = document.getElementById('add-snip-code');
  const prefixInput = document.getElementById('add-snip-prefix');
  const autoCompCheck = document.getElementById('add-snip-enable-autocomplete');
  const prefixRow = document.getElementById('add-snip-prefix-row');

  const targetType = (fileType === 'typ' || fileType === 'html') ? fileType : 'md';
  if (typeSelect) typeSelect.value = targetType;
  
  populateSyntaxCategoryOptions(targetType);

  if (codeInput) codeInput.value = initialText || '';
  
  // Suggest title from first line
  const firstLine = (initialText || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
  let suggestedTitle = firstLine.replace(/^[#/*\-+=<>\s]+/, '').slice(0, 32).trim();
  if (!suggestedTitle) suggestedTitle = 'Custom Snippet';
  if (titleInput) titleInput.value = suggestedTitle;
  if (descInput) descInput.value = '';

  // Suggest prefix
  let suggestedPrefix = suggestedTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  if (!suggestedPrefix) suggestedPrefix = 'snip';
  if (prefixInput) prefixInput.value = suggestedPrefix;
  if (autoCompCheck) autoCompCheck.checked = true;
  if (prefixRow) prefixRow.style.display = 'flex';

  showModal('add-syntax-snippet-modal');
  setTimeout(() => {
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  }, 50);
}

function editCustomSyntaxSnippet(snippetId) {
  if (!snippetId || !Array.isArray(editorSettings.customSyntaxSnippets)) return;
  const s = editorSettings.customSyntaxSnippets.find(item => item.id === snippetId);
  if (!s) return;

  _editingSyntaxSnippetId = snippetId;
  const modalTitle = document.querySelector('#add-syntax-snippet-modal .modal-title');
  if (modalTitle) modalTitle.textContent = window.t ? t('deEditSyntaxSnippet', 'Edit Syntax Snippet') : 'Edit Syntax Snippet';
  const confirmBtn = document.getElementById('btn-add-snip-confirm');
  if (confirmBtn) confirmBtn.textContent = window.t ? t('btnSave', 'Save') : 'Save';

  const typeSelect = document.getElementById('add-snip-target-type');
  const titleInput = document.getElementById('add-snip-title');
  const descInput = document.getElementById('add-snip-desc');
  const codeInput = document.getElementById('add-snip-code');
  const prefixInput = document.getElementById('add-snip-prefix');
  const autoCompCheck = document.getElementById('add-snip-enable-autocomplete');
  const prefixRow = document.getElementById('add-snip-prefix-row');

  const targetType = s.targetType || 'md';
  if (typeSelect) typeSelect.value = targetType;
  populateSyntaxCategoryOptions(targetType);

  const catSelect = document.getElementById('add-snip-category');
  if (catSelect && s.cat) catSelect.value = s.cat;

  if (titleInput) titleInput.value = s.title || '';
  if (descInput) descInput.value = s.desc || '';
  if (codeInput) codeInput.value = s.code || '';

  // Find if completion exists in editorSettings.snippets
  let matchingComp = null;
  if (Array.isArray(editorSettings.snippets)) {
    matchingComp = editorSettings.snippets.find(c => (s.prefix && c.prefix === s.prefix) || c.label === s.title);
  }
  const hasAuto = !!matchingComp || !!s.prefix;
  if (autoCompCheck) autoCompCheck.checked = hasAuto;
  if (prefixInput) prefixInput.value = (matchingComp ? matchingComp.prefix : (s.prefix || ''));
  if (prefixRow) prefixRow.style.display = hasAuto ? 'flex' : 'none';

  showModal('add-syntax-snippet-modal');
  setTimeout(() => {
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  }, 50);
}

function populateSyntaxCategoryOptions(targetType) {
  const catSelect = document.getElementById('add-snip-category');
  if (!catSelect) return;
  const doc = SYNTAX_DOCS[targetType] || SYNTAX_DOCS.md;
  const cats = (doc.categories || []).filter(c => c.id !== 'all');
  
  let html = '<option value="custom">Custom Snippets</option>';
  cats.forEach(c => {
    html += `<option value="${escHtml(c.id)}">${escHtml(c.label)}</option>`;
  });
  catSelect.innerHTML = html;
  catSelect.value = 'custom';
}

function handleAddSyntaxSnippetConfirm() {
  const typeSelect = document.getElementById('add-snip-target-type');
  const catSelect = document.getElementById('add-snip-category');
  const titleInput = document.getElementById('add-snip-title');
  const descInput = document.getElementById('add-snip-desc');
  const codeInput = document.getElementById('add-snip-code');
  const prefixInput = document.getElementById('add-snip-prefix');
  const autoCompCheck = document.getElementById('add-snip-enable-autocomplete');

  const targetType = typeSelect ? typeSelect.value : 'md';
  const cat = catSelect ? catSelect.value : 'custom';
  const title = titleInput ? titleInput.value.trim() : '';
  const desc = descInput ? descInput.value.trim() : '';
  const code = codeInput ? codeInput.value : '';
  const enableAuto = autoCompCheck ? autoCompCheck.checked : false;
  const prefix = prefixInput ? prefixInput.value.trim() : '';

  if (!title) {
    showToast('Snippet title is required', true);
    if (titleInput) titleInput.focus();
    return;
  }
  if (!code || !code.trim()) {
    showToast('Snippet code cannot be empty', true);
    if (codeInput) codeInput.focus();
    return;
  }

  if (!Array.isArray(editorSettings.customSyntaxSnippets)) {
    editorSettings.customSyntaxSnippets = [];
  }

  if (_editingSyntaxSnippetId) {
    const idx = editorSettings.customSyntaxSnippets.findIndex(s => s.id === _editingSyntaxSnippetId);
    if (idx !== -1) {
      const prev = editorSettings.customSyntaxSnippets[idx];
      const prevTitle = prev.title;
      const prevPrefix = prev.prefix;

      prev.targetType = targetType;
      prev.cat = cat;
      prev.title = title;
      prev.desc = desc;
      prev.code = code;
      prev.prefix = (enableAuto && prefix) ? prefix : '';

      if (enableAuto && prefix) {
        if (!Array.isArray(editorSettings.snippets)) editorSettings.snippets = [];
        const compIdx = editorSettings.snippets.findIndex(c => c.label === prevTitle || (prevPrefix && c.prefix === prevPrefix));
        if (compIdx >= 0) {
          editorSettings.snippets[compIdx].prefix = prefix;
          editorSettings.snippets[compIdx].label = title;
          editorSettings.snippets[compIdx].body = code;
        } else {
          editorSettings.snippets.push({
            id: genId(),
            prefix,
            label: title,
            body: code,
            triggerMode: 'both'
          });
        }
        applySnippetCompletions();
      } else {
        if (Array.isArray(editorSettings.snippets)) {
          const compIdx = editorSettings.snippets.findIndex(c => c.label === prevTitle || (prevPrefix && c.prefix === prevPrefix));
          if (compIdx >= 0) {
            editorSettings.snippets.splice(compIdx, 1);
            applySnippetCompletions();
          }
        }
      }

      saveEditorSettings();
      closeAddSyntaxSnippetModal();
      renderSyntaxHelpModal();
      showToast(window.t ? t('deSnippetUpdated', 'Custom snippet updated') : 'Custom snippet updated');
      return;
    }
  }

  const newSnippet = {
    id: 'snip_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    targetType,
    cat,
    title,
    desc,
    code,
    prefix: (enableAuto && prefix) ? prefix : '',
    badgeClass: 'badge-custom',
    custom: true,
    createdAt: new Date().toISOString()
  };

  editorSettings.customSyntaxSnippets.push(newSnippet);

  if (enableAuto && prefix) {
    if (!Array.isArray(editorSettings.snippets)) editorSettings.snippets = [];
    editorSettings.snippets.push({
      id: genId(),
      prefix,
      label: title,
      body: code,
      triggerMode: 'both'
    });
    applySnippetCompletions();
  }

  saveEditorSettings();
  closeAddSyntaxSnippetModal();
  renderSyntaxHelpModal();
  const fmtName = targetType === 'typ' ? 'Typst' : (targetType === 'html' ? 'HTML' : 'Markdown');
  showToast(`Added to ${fmtName} syntax snippets`);
}

async function deleteCustomSyntaxSnippet(snippetId) {
  if (!snippetId) return;
  if (!Array.isArray(editorSettings.customSyntaxSnippets)) return;
  const idx = editorSettings.customSyntaxSnippets.findIndex(s => s.id === snippetId);
  if (idx === -1) return;
  const snip = editorSettings.customSyntaxSnippets[idx];
  const confirmMsg = (window.t ? t('deConfirmDeleteSnippet', 'Delete custom snippet "{name}"?') : 'Delete custom snippet "{name}"?').replace('{name}', snip.title || '');
  if (window.showConfirm && !await window.showConfirm(confirmMsg)) return;
  editorSettings.customSyntaxSnippets.splice(idx, 1);
  saveEditorSettings();
  renderSyntaxHelpModal();
  showToast(window.t ? t('deSnippetDeleted', 'Custom snippet deleted') : 'Custom snippet deleted');
}

function openAddCustomCssModal(initialText) {
  _editingCssRuleId = null;
  const modalTitle = document.querySelector('#add-custom-css-modal .modal-title');
  if (modalTitle) modalTitle.textContent = window.t ? t('deAddToCustomCss', 'Add to Custom CSS') : 'Add to Custom CSS';
  const confirmBtn = document.getElementById('btn-add-css-confirm');
  if (confirmBtn) confirmBtn.textContent = window.t ? t('deAddCss', 'Add CSS') : 'Add CSS';

  const nameInput = document.getElementById('add-css-name');
  const codeInput = document.getElementById('add-css-code');
  const optDoc = document.getElementById('add-css-opt-doc');
  const optLib = document.getElementById('add-css-opt-library');

  if (codeInput) codeInput.value = initialText || '';

  // Suggest name based on CSS selectors
  let suggestedName = '';
  const selectorMatch = (initialText || '').match(/([.#a-zA-Z0-9_\-]+)\s*\{/);
  if (selectorMatch) {
    suggestedName = selectorMatch[1].replace(/^[.#]/, '').replace(/[-_]/g, ' ');
    suggestedName = suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1);
  } else {
    suggestedName = 'Custom Style';
  }

  if (nameInput) nameInput.value = suggestedName;
  if (optDoc) optDoc.checked = true;
  if (optLib) {
    optLib.checked = true;
    optLib.disabled = false;
  }

  showModal('add-custom-css-modal');
  setTimeout(() => {
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }, 50);
}

function editCustomCssRule(ruleId) {
  if (!ruleId || !Array.isArray(editorSettings.customCssRules)) return;
  const r = editorSettings.customCssRules.find(item => item.id === ruleId);
  if (!r) return;

  _editingCssRuleId = ruleId;
  const modalTitle = document.querySelector('#add-custom-css-modal .modal-title');
  if (modalTitle) modalTitle.textContent = window.t ? t('deEditCustomCssRule', 'Edit Custom CSS Rule') : 'Edit Custom CSS Rule';
  const confirmBtn = document.getElementById('btn-add-css-confirm');
  if (confirmBtn) confirmBtn.textContent = window.t ? t('btnSave', 'Save') : 'Save';

  const nameInput = document.getElementById('add-css-name');
  const codeInput = document.getElementById('add-css-code');
  const optDoc = document.getElementById('add-css-opt-doc');
  const optLib = document.getElementById('add-css-opt-library');

  if (nameInput) nameInput.value = r.name || '';
  if (codeInput) codeInput.value = r.css || '';
  if (optDoc) optDoc.checked = false;
  if (optLib) {
    optLib.checked = true;
    optLib.disabled = true;
  }

  showModal('add-custom-css-modal');
  setTimeout(() => {
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }, 50);
}

function handleAddCustomCssConfirm() {
  const nameInput = document.getElementById('add-css-name');
  const codeInput = document.getElementById('add-css-code');
  const optDoc = document.getElementById('add-css-opt-doc');
  const optLib = document.getElementById('add-css-opt-library');

  const name = nameInput ? nameInput.value.trim() : '';
  const rawCode = codeInput ? codeInput.value.trim() : '';
  const applyToDoc = optDoc ? optDoc.checked : true;
  const saveToLibrary = optLib ? optLib.checked : true;

  if (!name) {
    showToast('Style / Rule name is required', true);
    if (nameInput) nameInput.focus();
    return;
  }
  if (!rawCode) {
    showToast('CSS code cannot be empty', true);
    if (codeInput) codeInput.focus();
    return;
  }

  const cssBlock = deNormalizeCssRuleBlock(rawCode);

  if (_editingCssRuleId) {
    if (!Array.isArray(editorSettings.customCssRules)) editorSettings.customCssRules = [];
    const idx = editorSettings.customCssRules.findIndex(r => r.id === _editingCssRuleId);
    if (idx !== -1) {
      editorSettings.customCssRules[idx].name = name;
      editorSettings.customCssRules[idx].css = cssBlock;
      saveEditorSettings();
    }

    if (applyToDoc && cssEditor) {
      const currentCss = cssEditor.getValue() || '';
      const sep = currentCss && !currentCss.endsWith('\n') ? '\n\n' : (currentCss ? '\n' : '');
      cssEditor.setValue(currentCss + sep + cssBlock + '\n');
      cssModified = true;
      updateDocIndicator();
      const cssEl = document.getElementById('custom-css-style');
      if (cssEl) cssEl.textContent = deBuildScopedPreviewCss(cssEditor.getValue(), '#preview-content');
    }

    closeAddCustomCssModal();
    renderSyntaxHelpModal();
    showToast(window.t ? t('deCssRuleUpdated', 'Custom CSS rule updated') : 'Custom CSS rule updated');
    return;
  }

  if (saveToLibrary) {
    if (!Array.isArray(editorSettings.customCssRules)) editorSettings.customCssRules = [];
    editorSettings.customCssRules.push({
      id: genId(),
      name,
      css: cssBlock
    });
    saveEditorSettings();
  }

  if (applyToDoc && cssEditor) {
    const currentCss = cssEditor.getValue() || '';
    const nextCss = currentCss.replace(/\s+$/, '');
    cssEditor.setValue((nextCss ? nextCss + '\n\n' : '') + cssBlock + '\n');
    cssModified = true;
    updateDocIndicator();
    const cssEl = document.getElementById('custom-css-style');
    if (cssEl) cssEl.textContent = deBuildScopedPreviewCss(cssEditor.getValue(), '#preview-content');
  }

  closeAddCustomCssModal();
  renderSyntaxHelpModal();
  showToast('Custom CSS saved');
}

function applyCssRuleToDoc(cssCode) {
  if (!cssCode) return;
  if (!cssEditor) {
    showToast('CSS editor not available', true);
    return;
  }
  const cur = cssEditor.getValue() || '';
  const sep = cur && !cur.endsWith('\n') ? '\n\n' : (cur ? '\n' : '');
  cssEditor.setValue(cur + sep + cssCode + '\n');
  cssModified = true;
  updateDocIndicator();
  const cssEl = document.getElementById('custom-css-style');
  if (cssEl) cssEl.textContent = deBuildScopedPreviewCss(cssEditor.getValue(), '#preview-content');
  showToast(window.t ? t('deAppliedCssToast') : 'CSS rule applied to document stylesheet');
}

async function deleteCustomCssRule(ruleId) {
  if (!ruleId || !Array.isArray(editorSettings.customCssRules)) return;
  const idx = editorSettings.customCssRules.findIndex(r => r.id === ruleId);
  if (idx !== -1) {
    const rule = editorSettings.customCssRules[idx];
    const confirmMsg = (window.t ? t('deConfirmDeleteCssRule', 'Delete custom CSS rule "{name}"?') : 'Delete custom CSS rule "{name}"?').replace('{name}', rule.name || '');
    if (window.showConfirm && !await window.showConfirm(confirmMsg)) return;
    editorSettings.customCssRules.splice(idx, 1);
    saveEditorSettings();
    renderSyntaxHelpModal();
    showToast(window.t ? t('deCssRuleDeleted', 'Custom CSS rule deleted') : 'Custom CSS rule deleted');
  }
}

window.editCustomSyntaxSnippet = editCustomSyntaxSnippet;
window.editCustomCssRule = editCustomCssRule;
window.deleteCustomSyntaxSnippet = deleteCustomSyntaxSnippet;
window.deleteCustomCssRule = deleteCustomCssRule;

    function copySyntaxSnippet(btn, code) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(code).then(() => {
    const orig = btn.textContent;
    btn.textContent = ' Copied';
    btn.style.background = '#059669';
    btn.style.borderColor = '#059669';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 1500);
  }).catch(() => {
    showToast('Could not copy to clipboard', true);
  });
}

function insertSyntaxSnippet(snippet) {
  if (!mdEditor) return;
  const selection = mdEditor.getSelection();
  const op = { range: selection, text: snippet, forceMoveMarkers: true };
  mdEditor.executeEdits('syntax-guide', [op]);
  mdEditor.focus();
  hideModal('syntax-help-modal');
  showToast('Snippet inserted at cursor');
}

// ── Mailposting State & Controllers ─────────────────────
const mpState = {
  loaded: false,
  classesMeta: {},
  studentRoster: {},
  connectedClassId: null,
  connectedClass: null,
  studentList: [],
  previewEnabled: false,
  previewStudentIndex: 0
};
window.mpState = mpState;
let _mpInitPromise = null;

