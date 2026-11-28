/**
 * js/pages/reference-builder.js
 * Page orchestrator for Reference Builder: Library, Subject/Manual/Module editors,
 * Custom Module Type Builder, Live Preview (rAF-throttled), and Tutorial tour.
 */
(function (root) {
  'use strict';

  var state = {
    index: null,
    activeSubjectId: '',
    activeManual: null,
    activeChapterId: '',
    editingSubjectId: '',
    subjColor: '#5b8fcc',
    ctypeColor: '#e2c96e',
    ctypeFields: [{ key: 'body', defaultLabel: 'Content', kind: 'richtext' }],
    previewVisible: true,
    previewMode: 'html',
    previewPdfUrl: '',
    previewRaf: 0,
    dirty: false
  };

  function _t(key, fallback) {
    if (root.i18n && typeof root.i18n.t === 'function') {
      return root.i18n.t(key, fallback);
    }
    return fallback || key;
  }

  function _esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _el(id) { return document.getElementById(id); }

  function _getActiveChapter() {
    if (!state.activeManual || !Array.isArray(state.activeManual.chapters)) return null;
    for (var i = 0; i < state.activeManual.chapters.length; i++) {
      if (state.activeManual.chapters[i].id === state.activeChapterId) {
        return state.activeManual.chapters[i];
      }
    }
    return state.activeManual.chapters[0] || null;
  }

  function _getSubjectById(subjId) {
    var list = (state.index && state.index.subjects) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === subjId) return list[i];
    }
    return null;
  }

  function _allTypes() {
    return root.RbModuleTypes.getAllTypes((state.index && state.index.customModuleTypes) || []);
  }

  // ── Library Rendering ────────────────────────────────────────────────────

  function renderSubjectsSidebar() {
    var listEl = _el('rb-subjects-list');
    if (!listEl || !state.index) return;
    var subjects = state.index.subjects || [];
    var html = [
      '<div class="rb-subject-item ' + (!state.activeSubjectId ? 'is-active' : '') + '" data-rb-select-subject="">' +
        '<span>' + _esc(_t('rbAllSubjects', 'All Subjects')) + '</span>' +
        '<span class="rb-chip">' + (state.index.manualSummaries || []).length + '</span>' +
      '</div>'
    ];
    subjects.forEach(function (s) {
      var count = (state.index.manualSummaries || []).filter(function (m) { return m.subjectId === s.id; }).length;
      html.push(
        '<div class="rb-subject-item ' + (state.activeSubjectId === s.id ? 'is-active' : '') + '" data-rb-select-subject="' + _esc(s.id) + '">' +
          '<span style="display:flex;align-items:center;gap:8px;">' +
            '<span class="rb-subject-dot" style="background:' + _esc(s.color || '#5b8fcc') + '"></span>' +
            '<span>' + _esc(s.name) + '</span>' +
          '</span>' +
          '<span style="display:flex;align-items:center;gap:4px;">' +
            '<span class="rb-chip">' + count + '</span>' +
            '<button type="button" class="rb-btn rb-btn-sm" data-rb-edit-subject="' + _esc(s.id) + '" title="Edit">…</button>' +
          '</span>' +
        '</div>'
      );
    });
    listEl.innerHTML = html.join('');
  }

  function renderReferenceCards() {
    var grid = _el('rb-cards-grid');
    if (!grid || !state.index) return;
    var filtered = root.RbStore.filterSummaries(state.index.manualSummaries, {
      subjectId: state.activeSubjectId,
      query: (_el('rb-search-input') || {}).value || '',
      level: (_el('rb-filter-level') || {}).value || '',
      year: (_el('rb-filter-year') || {}).value || '',
      subDiscipline: (_el('rb-filter-subdisc') || {}).value || ''
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="rb-empty-state">' + _esc(_t('rbNoManualsFound', 'No reference manuals yet. Create a subject and add your first reference card!')) + '</div>';
      return;
    }

    grid.innerHTML = filtered.map(function (m) {
      var subj = _getSubjectById(m.subjectId);
      var chips = [
        subj ? subj.name : '',
        m.level,
        m.year,
        m.subDiscipline
      ].filter(Boolean).map(function (c) {
        return '<span class="rb-chip">' + _esc(c) + '</span>';
      }).join('');
      return (
        '<article class="rb-ref-card" data-rb-open-manual="' + _esc(m.id) + '">' +
          '<div class="rb-ref-card-strip" style="background:' + _esc((subj && subj.color) || m.coverColor || '#e2c96e') + '"></div>' +
          '<h3 class="rb-ref-card-title">' + _esc(m.title) + '</h3>' +
          (m.subtitle ? '<p class="rb-ref-card-sub">' + _esc(m.subtitle) + '</p>' : '') +
          '<div class="rb-chip-row">' + chips + '<span class="rb-chip">' + (m.chapterCount || 0) + ' topics · ' + (m.moduleCount || 0) + ' modules</span></div>' +
          '<div class="rb-ref-card-actions">' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-delete-manual="' + _esc(m.id) + '">' + _esc(_t('btnDelete', 'Delete')) + '</button>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-amber" data-rb-open-manual="' + _esc(m.id) + '">' + _esc(_t('rbOpenBtn', 'Open')) + '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function showLibraryView() {
    _el('rb-library-view').classList.remove('is-hidden');
    _el('rb-editor-view').classList.add('is-hidden');
    renderSubjectsSidebar();
    renderReferenceCards();
  }

  // ── Editor View Rendering ────────────────────────────────────────────────

  function showEditorView() {
    _el('rb-library-view').classList.add('is-hidden');
    _el('rb-editor-view').classList.remove('is-hidden');
    renderEditorAll();
  }

  function renderPalette() {
    var pal = _el('rb-module-palette');
    if (!pal) return;
    pal.innerHTML = _allTypes().map(function (t) {
      return (
        '<button type="button" class="rb-palette-btn" data-rb-add-module="' + _esc(t.id) + '">' +
          '<img src="../assets/icons/' + _esc(t.icon || 'reference-builder.svg') + '" alt="" />' +
          '<span>+ ' + _esc(_t(t.nameKey, t.defaultName)) + '</span>' +
        '</button>'
      );
    }).join('');
  }

  function renderOutline() {
    var m = state.activeManual;
    if (!m) return;
    _el('rb-manual-title').value = m.title || '';
    _el('rb-manual-subtitle').value = m.subtitle || '';
    _el('rb-manual-level').value = m.level || '';
    _el('rb-manual-year').value = m.year || '';
    _el('rb-manual-subdisc').value = m.subDiscipline || '';
    _el('rb-manual-tags').value = (m.tags || []).join(', ');

    var list = _el('rb-outline-list');
    list.innerHTML = (m.chapters || []).map(function (ch, idx) {
      var active = ch.id === state.activeChapterId ? 'is-active' : '';
      return (
        '<div class="rb-outline-item ' + active + '" data-rb-select-chapter="' + _esc(ch.id) + '" draggable="true" data-rb-ch-idx="' + idx + '">' +
          '<span class="rb-outline-label">' + (idx + 1) + '. ' + _esc(ch.title || 'Topic') + '</span>' +
          '<span class="rb-outline-actions">' +
            '<span class="rb-chip">' + (ch.modules ? ch.modules.length : 0) + '</span>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-outline-btn" data-rb-ch-up="' + idx + '" title="Move topic up">↑</button>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-outline-btn" data-rb-ch-down="' + idx + '" title="Move topic down">↓</button>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose rb-outline-btn" data-rb-ch-del="' + idx + '" title="Delete topic">×</button>' +
          '</span>' +
        '</div>'
      );
    }).join('');
  }

  function _renderQuizFieldHtml(modId, fieldKey, quizObj) {
    var qs = (quizObj && Array.isArray(quizObj.questions)) ? quizObj.questions : [];
    var qCards = qs.map(function (q, qi) {
      var optsHtml = '';
      if (q.kind !== 'short') {
        optsHtml = (q.options || []).map(function (opt, oi) {
          var checked = (q.correctIndex || 0) === oi ? 'checked' : '';
          return (
            '<div class="rb-list-row">' +
              '<input type="radio" name="rb-q-ans-' + _esc(modId + '-' + q.id) + '" value="' + oi + '" ' + checked + ' data-rb-q-correct="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + qi + '|' + oi + '" />' +
              '<input type="text" class="rb-input" value="' + _esc(opt) + '" data-rb-q-opt="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + qi + '|' + oi + '" />' +
            '</div>'
          );
        }).join('');
      } else {
        optsHtml = '<input type="text" class="rb-input" placeholder="Expected answer" value="' + _esc(q.answerText || '') + '" data-rb-q-anstext="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + qi + '" />';
      }
      return (
        '<div class="rb-quiz-q-card">' +
          '<div class="rb-list-row">' +
            '<strong>Q' + (qi + 1) + ' (' + _esc(q.kind || 'mcq') + ')</strong>' +
            '<span style="flex:1"></span>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-q-del="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + qi + '">×</button>' +
          '</div>' +
          '<input type="text" class="rb-input" placeholder="Question prompt" value="' + _esc(q.prompt || '') + '" data-rb-q-prompt="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + qi + '" />' +
          optsHtml +
          '<input type="text" class="rb-input" placeholder="Explanation (optional)" value="' + _esc(q.explanation || '') + '" data-rb-q-exp="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + qi + '" />' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="rb-field-block">' +
        qCards +
        '<div class="rb-list-row">' +
          '<button type="button" class="rb-btn rb-btn-sm" data-rb-q-add="' + _esc(modId) + '|' + _esc(fieldKey) + '|mcq">+ MCQ</button>' +
          '<button type="button" class="rb-btn rb-btn-sm" data-rb-q-add="' + _esc(modId) + '|' + _esc(fieldKey) + '|tf">+ True/False</button>' +
          '<button type="button" class="rb-btn rb-btn-sm" data-rb-q-add="' + _esc(modId) + '|' + _esc(fieldKey) + '|short">+ Short Answer</button>' +
          '<button type="button" class="rb-btn rb-btn-sm rb-btn-amber" data-rb-q-import="' + _esc(modId) + '|' + _esc(fieldKey) + '">Import CMT Quiz Bank…</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _renderModuleField(mod, field) {
    var val = (mod.data && mod.data[field.key] != null) ? mod.data[field.key] : '';
    var fov = (mod.fieldOverrides && mod.fieldOverrides[field.key]) || {};
    var defLabel = _t(field.labelKey, field.defaultLabel || field.key);
    var curLabel = (fov.label != null && fov.label !== '') ? fov.label : defLabel;
    var showLbl = fov.showLabel !== undefined ? fov.showLabel : (field.kind === 'text');
    var curStyle = fov.style || 'default';
    var fieldHeader =
      '<div class="rb-field-cust-bar">' +
        '<input type="text" class="rb-input rb-field-lbl-input" value="' + _esc(curLabel) + '" placeholder="' + _esc(defLabel) + '" data-rb-fov-label="' + _esc(mod.id) + '|' + _esc(field.key) + '" />' +
        '<button type="button" class="rb-btn rb-btn-sm" data-rb-phrase-save="' + _esc(mod.id) + '|' + _esc(field.key) + '|label" title="Save label phrase">+Lbl</button>' +
        '<button type="button" class="rb-btn rb-btn-sm rb-btn-amber" data-rb-phrase-pick="' + _esc(mod.id) + '|' + _esc(field.key) + '|label" title="Reuse saved label">▾</button>' +
        '<select class="rb-input rb-field-style-sel" data-rb-fov-style="' + _esc(mod.id) + '|' + _esc(field.key) + '">' +
          '<option value="default" ' + (curStyle === 'default' ? 'selected' : '') + '>Style: Default</option>' +
          '<option value="highlight" ' + (curStyle === 'highlight' ? 'selected' : '') + '>Style: Highlight</option>' +
          '<option value="badge" ' + (curStyle === 'badge' ? 'selected' : '') + '>Style: Badge</option>' +
          '<option value="boxed" ' + (curStyle === 'boxed' ? 'selected' : '') + '>Style: Boxed</option>' +
          '<option value="muted" ' + (curStyle === 'muted' ? 'selected' : '') + '>Style: Muted</option>' +
        '</select>' +
        '<input type="text" class="rb-input rb-field-cls-input" value="' + _esc(fov.customClass || '') + '" placeholder="CSS class" data-rb-fov-cls="' + _esc(mod.id) + '|' + _esc(field.key) + '" />' +
        '<label class="rb-inline-check"><input type="checkbox" ' + (showLbl ? 'checked' : '') + ' data-rb-fov-showlbl="' + _esc(mod.id) + '|' + _esc(field.key) + '" /> Label</label>' +
        '<label class="rb-inline-check"><input type="checkbox" ' + (fov.hidden ? 'checked' : '') + ' data-rb-fov-hide="' + _esc(mod.id) + '|' + _esc(field.key) + '" /> Hide</label>' +
        '<button type="button" class="rb-btn rb-btn-sm" data-rb-phrase-save="' + _esc(mod.id) + '|' + _esc(field.key) + '|value" title="Save phrase from this field">+Phrase</button>' +
        '<button type="button" class="rb-btn rb-btn-sm rb-btn-sage" data-rb-phrase-pick="' + _esc(mod.id) + '|' + _esc(field.key) + '|value" title="Insert saved phrase">Phrases ▾</button>' +
      '</div>';
    var label = fieldHeader;

    if (field.kind === 'text') {
      return '<div class="rb-field-block">' + label +
        '<input type="text" class="rb-input" value="' + _esc(val) + '" data-rb-field="' + _esc(mod.id) + '|' + _esc(field.key) + '" /></div>';
    }
    if (field.kind === 'richtext') {
      return '<div class="rb-field-block">' + label +
        '<textarea class="rb-input rb-textarea" data-rb-field="' + _esc(mod.id) + '|' + _esc(field.key) + '">' + _esc(val) + '</textarea></div>';
    }
    if (field.kind === 'list') {
      var arr = Array.isArray(val) ? val : [''];
      return '<div class="rb-field-block">' + label +
        arr.map(function (rawItem, idx) {
          var itemText = typeof rawItem === 'object' && rawItem !== null ? (rawItem.text || '') : (rawItem || '');
          var itemIndent = (typeof rawItem === 'object' && rawItem !== null && typeof rawItem.indent === 'number') ? Math.max(0, Math.min(8, rawItem.indent)) : 0;
          return '<div class="rb-list-row" style="padding-left:' + (itemIndent * 22) + 'px">' +
            '<button type="button" class="rb-btn rb-btn-sm rb-outline-btn" data-rb-list-outdent="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '" title="Outdent (Shift+Tab)">←</button>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-outline-btn" data-rb-list-indent="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '" title="Indent (Tab)">→</button>' +
            '<input type="text" class="rb-input" value="' + _esc(itemText) + '" data-rb-list-item="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '" />' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-list-del="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '">×</button>' +
          '</div>';
        }).join('') +
        '<button type="button" class="rb-btn rb-btn-sm" data-rb-list-add="' + _esc(mod.id) + '|' + _esc(field.key) + '">+ Item</button></div>';
    }
    if (field.kind === 'keyvalue') {
      var pairs = Array.isArray(val) ? val : [{ left: '', right: '' }];
      return '<div class="rb-field-block">' + label +
        pairs.map(function (p, idx) {
          return '<div class="rb-kv-row">' +
            '<input type="text" class="rb-input" placeholder="Key / Prompt" value="' + _esc(p.left || '') + '" data-rb-kv="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '|left" />' +
            '<input type="text" class="rb-input" placeholder="Value / Analysis" value="' + _esc(p.right || '') + '" data-rb-kv="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '|right" />' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-kv-del="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + idx + '">×</button>' +
          '</div>';
        }).join('') +
        '<button type="button" class="rb-btn rb-btn-sm" data-rb-kv-add="' + _esc(mod.id) + '|' + _esc(field.key) + '">+ Row</button></div>';
    }
    if (field.kind === 'table') {
      var tbl = (val && Array.isArray(val.headers)) ? val : { headers: ['Col 1', 'Col 2'], rows: [['', '']] };
      return '<div class="rb-field-block">' + label +
        '<div class="rb-list-row">' +
          '<input type="text" class="rb-input" value="' + _esc(tbl.headers.join(' | ')) + '" data-rb-tbl-headers="' + _esc(mod.id) + '|' + _esc(field.key) + '" placeholder="Headers separated by |" />' +
        '</div>' +
        (tbl.rows || []).map(function (r, ri) {
          return '<div class="rb-list-row">' +
            '<input type="text" class="rb-input" value="' + _esc((r || []).join(' | ')) + '" data-rb-tbl-row="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + ri + '" placeholder="Cells separated by |" />' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-tbl-del="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + ri + '">×</button>' +
          '</div>';
        }).join('') +
        '<button type="button" class="rb-btn rb-btn-sm" data-rb-tbl-add="' + _esc(mod.id) + '|' + _esc(field.key) + '">+ Row</button></div>';
    }
    if (field.kind === 'media') {
      var mObj = (val && typeof val === 'object') ? val : { src: '' };
      var preview = '';
      if (mObj.src || mObj.dataUrl) {
        preview = field.mediaKind === 'video'
          ? '<video class="rb-media-preview" controls src="' + _esc(mObj.src || mObj.dataUrl) + '"></video>'
          : '<img class="rb-media-preview" src="' + _esc(mObj.src || mObj.dataUrl) + '" alt="" />';
      }
      return '<div class="rb-field-block">' + label +
        '<div class="rb-list-row">' +
          '<input type="text" class="rb-input" placeholder="URL or local file" value="' + _esc(mObj.fileName || mObj.src || '') + '" data-rb-media-src="' + _esc(mod.id) + '|' + _esc(field.key) + '" />' +
          '<button type="button" class="rb-btn rb-btn-sm rb-btn-amber" data-rb-media-pick="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + _esc(field.mediaKind || 'image') + '">Browse…</button>' +
        '</div>' + preview + '</div>';
    }
    if (field.kind === 'quiz') {
      return '<div class="rb-field-block">' + label + _renderQuizFieldHtml(mod.id, field.key, val) + '</div>';
    }
    if (field.kind === 'tool_link') {
      var links = Array.isArray(val) ? val : [];
      return '<div class="rb-field-block">' + label +
        '<div class="rb-chip-row">' +
          links.map(function (lnk, li) {
            return '<span class="rb-chip">' +
              '<a href="#" data-rb-open-urn="' + _esc(lnk.urn) + '">' + _esc(lnk.label || lnk.urn) + '</a> ' +
              '<button type="button" class="rb-btn rb-btn-sm" data-rb-link-del="' + _esc(mod.id) + '|' + _esc(field.key) + '|' + li + '">×</button>' +
            '</span>';
          }).join('') +
        '</div>' +
        '<div class="rb-list-row">' +
          '<button type="button" class="rb-btn rb-btn-sm rb-btn-slate" data-rb-link-pick="' + _esc(mod.id) + '|' + _esc(field.key) + '">+ Link CMT Tool / Resource</button>' +
        '</div></div>';
    }
    return '';
  }

  function renderChapterWorkspace() {
    var ch = _getActiveChapter();
    var listEl = _el('rb-modules-list');
    if (!ch || !listEl) return;
    _el('rb-chapter-title').value = ch.title || '';
    _el('rb-chapter-prefix').value = ch.prefix || '';
    _el('rb-chapter-title-style').value = ch.titleStyle || 'default';
    _el('rb-chapter-show-num').checked = ch.showNumber !== false;
    _el('rb-chapter-level').value = ch.level || '';
    _el('rb-chapter-year').value = ch.year || '';
    _el('rb-chapter-subdisc').value = ch.subDiscipline || '';

    var mods = Array.isArray(ch.modules) ? ch.modules : [];
    if (!mods.length) {
      listEl.innerHTML = '<div class="rb-empty-state">' + _esc(_t('rbNoModulesYet', 'Click a module type above to add content, pictures, videos, quizzes, or CMT tool links.')) + '</div>';
      return;
    }

    var customTypes = (state.index && state.index.customModuleTypes) || [];
    listEl.innerHTML = mods.map(function (mod, idx) {
      var tDef = root.RbModuleTypes.getTypeById(mod.typeId, customTypes);
      var fieldsHtml = (tDef.fields || []).map(function (f) {
        return _renderModuleField(mod, f);
      }).join('');
      var modLayout = mod.layoutStyle || tDef.styleVariant || 'callout';
      var modColor = mod.accentColor || tDef.color || '#5b8fcc';
      return (
        '<section class="rb-mod-card" id="rb-editor-mod-' + _esc(mod.id) + '" style="border-left:6px solid ' + _esc(modColor) + '">' +
          '<div class="rb-mod-head">' +
            '<span class="rb-mod-badge">' + _esc((mod.customTypeLabel != null && mod.customTypeLabel !== '') ? mod.customTypeLabel : _t(tDef.nameKey, tDef.defaultName)) + '</span>' +
            '<input type="text" class="rb-input rb-mod-title-input" value="' + _esc(mod.title || '') + '" placeholder="Module title" data-rb-mod-title="' + _esc(mod.id) + '" />' +
            '<button type="button" class="rb-btn rb-btn-sm" data-rb-mod-up="' + idx + '" title="Move up">↑</button>' +
            '<button type="button" class="rb-btn rb-btn-sm" data-rb-mod-down="' + idx + '" title="Move down">↓</button>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-mod-del="' + idx + '" title="Delete">×</button>' +
          '</div>' +
          '<div class="rb-mod-style-bar">' +
            '<input type="text" class="rb-input" value="' + _esc(mod.customTypeLabel || '') + '" placeholder="Custom badge label" data-rb-mod-style-badge="' + _esc(mod.id) + '" />' +
            '<select class="rb-input" data-rb-mod-style-layout="' + _esc(mod.id) + '">' +
              '<option value="callout" ' + (modLayout === 'callout' ? 'selected' : '') + '>Layout: Callout</option>' +
              '<option value="card" ' + (modLayout === 'card' ? 'selected' : '') + '>Layout: Card</option>' +
              '<option value="banner" ' + (modLayout === 'banner' ? 'selected' : '') + '>Layout: Banner</option>' +
              '<option value="minimal" ' + (modLayout === 'minimal' ? 'selected' : '') + '>Layout: Minimal</option>' +
            '</select>' +
            '<input type="text" class="rb-input" value="' + _esc(mod.customClass || '') + '" placeholder="CSS class" data-rb-mod-style-cls="' + _esc(mod.id) + '" />' +
            '<input type="color" value="' + _esc(modColor) + '" title="Accent color" data-rb-mod-style-color="' + _esc(mod.id) + '" />' +
            '<label class="rb-inline-check"><input type="checkbox" ' + (mod.showTitle !== false ? 'checked' : '') + ' data-rb-mod-style-showtitle="' + _esc(mod.id) + '" /> Title</label>' +
            '<label class="rb-inline-check"><input type="checkbox" ' + (mod.showTypeBadge !== false ? 'checked' : '') + ' data-rb-mod-style-showbadge="' + _esc(mod.id) + '" /> Badge</label>' +
          '</div>' +
          fieldsHtml +
        '</section>'
      );
    }).join('');
  }

  async function _buildExportPreviewHtml() {
    if (!state.activeManual) return '';
    var subj = _getSubjectById(state.activeManual.subjectId);
    if (typeof root.RbExporter.buildPdfHtml === 'function') {
      return await root.RbExporter.buildPdfHtml(
        state.activeManual,
        subj,
        (state.index && state.index.customModuleTypes) || []
      );
    }
    return root.RbExporter.compileHtml(
      state.activeManual,
      subj,
      (state.index && state.index.customModuleTypes) || [],
      { interactive: false, forPdf: true }
    );
  }

  async function refreshExportPreviewModal() {
    var ifr = _el('rb-export-preview-iframe');
    if (!ifr) return;
    ifr.srcdoc = await _buildExportPreviewHtml();
  }

  async function openExportPreviewModal() {
    if (!state.activeManual) return;
    closeAllModals();
    if (root.ExportStylesService) {
      var wrap = _el('rb-modal-preview-style-selector-wrap');
      if (wrap) {
        root.ExportStylesService.renderStyleSelector(wrap, {
          toolKey: 'referenceBuilder',
          className: 'rb-input',
          onChange: function () {
            refreshExportPreviewModal();
          }
        });
      }
    }
    _el('rb-export-preview-modal').classList.remove('is-hidden');
    await refreshExportPreviewModal();
  }

  async function openPreviewInExternalBrowser() {
    var html = await _buildExportPreviewHtml();
    if (!html) return;
    if (root.Desktop && typeof root.Desktop.openTempHtml === 'function') {
      await root.Desktop.openTempHtml({ html: html, filename: 'reference-preview.html' });
      return;
    }
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  function printExportPreviewIframe() {
    var ifr = _el('rb-export-preview-iframe');
    if (ifr && ifr.contentWindow) {
      ifr.contentWindow.focus();
      ifr.contentWindow.print();
    }
  }

  function setPreviewMode(mode) {
    state.previewMode = mode === 'pdf' ? 'pdf' : 'html';
    var htmlBtn = _el('rb-preview-mode-html');
    var pdfBtn = _el('rb-preview-mode-pdf');
    var htmlFrame = _el('rb-preview-frame');
    var pdfFrame = _el('rb-preview-pdf-frame');
    if (htmlBtn) htmlBtn.classList.toggle('rb-btn-amber', state.previewMode === 'html');
    if (pdfBtn) pdfBtn.classList.toggle('rb-btn-amber', state.previewMode === 'pdf');
    if (htmlFrame) htmlFrame.classList.toggle('is-hidden', state.previewMode !== 'html');
    if (pdfFrame) pdfFrame.classList.toggle('is-hidden', state.previewMode !== 'pdf');
    if (state.previewMode === 'pdf') {
      _buildExportPreviewHtml().then(function (html) {
        if (pdfFrame) pdfFrame.srcdoc = html;
      });
    } else {
      schedulePreviewUpdate();
    }
  }

  function schedulePreviewUpdate() {
    if (!state.previewVisible || !state.activeManual) return;
    if (state.previewMode === 'pdf') return;
    if (state.previewRaf) cancelAnimationFrame(state.previewRaf);
    state.previewRaf = requestAnimationFrame(async function () {
      state.previewRaf = 0;
      var frame = _el('rb-preview-frame');
      if (!frame) return;
      var subj = _getSubjectById(state.activeManual.subjectId);
      var html = root.RbExporter.compileHtml(
        state.activeManual,
        subj,
        (state.index && state.index.customModuleTypes) || [],
        { interactive: true, forPdf: false }
      );
      if (root.ExportStylesService) {
        var sId = root.ExportStylesService.getSelectedStyle('referenceBuilder');
        html = await root.ExportStylesService.injectStyleIntoHtml(html, sId, 'referenceBuilder');
      }
      var htmlPreserve = '<style id="rb-html-layout-preserve">.rb-doc { max-width: 920px; margin: 0 auto !important; padding: 2rem 2.5rem !important; }</style>';
      if (html.indexOf('</head>') !== -1) {
        html = html.replace('</head>', htmlPreserve + '\n</head>');
      }
      frame.srcdoc = html;
    });
  }

  function renderPreviewStyleSelector() {
    if (!root.ExportStylesService) return;
    var wrap = _el('rb-preview-style-selector-wrap');
    if (!wrap) return;
    root.ExportStylesService.renderStyleSelector(wrap, {
      toolKey: 'referenceBuilder',
      className: 'rb-input',
      onChange: function () {
        schedulePreviewUpdate();
      }
    });
  }

  function renderEditorAll() {
    renderPalette();
    renderOutline();
    renderChapterWorkspace();
    renderPreviewStyleSelector();
    schedulePreviewUpdate();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function openManual(manualId, targetChapterId, targetModuleId) {
    var manual = await root.RbStore.loadManual(manualId);
    if (!manual) {
      if (typeof root.showToast === 'function') root.showToast('Reference manual not found.', true);
      return;
    }
    state.activeManual = manual;
    state.activeChapterId = targetChapterId || (manual.chapters[0] && manual.chapters[0].id) || '';
    showEditorView();
    if (targetModuleId) {
      var modEl = _el('rb-editor-mod-' + targetModuleId);
      if (modEl) modEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function saveCurrentManual(silent) {
    if (!state.activeManual) return;
    var res = await root.RbStore.saveManual(state.activeManual, state.index);
    state.index = res.index;
    state.dirty = false;
    if (!silent && typeof root.showToast === 'function') {
      root.showToast(_t('rbSavedToast', 'Reference manual saved.'));
    }
  }

  function openSubjectModal(subjectId) {
    state.editingSubjectId = subjectId || '';
    var subj = subjectId ? _getSubjectById(subjectId) : null;
    _el('rb-subj-name').value = subj ? subj.name : '';
    _el('rb-subj-desc').value = subj ? subj.description : '';
    state.subjColor = subj ? subj.color : '#5b8fcc';
    _el('rb-subj-delete-btn').classList.toggle('is-hidden', !subj);
    _renderColorRow('rb-subj-colors', state.subjColor, 'subj');
    _el('rb-subject-modal').classList.remove('is-hidden');
  }

  function _renderColorRow(containerId, selected, kind) {
    var wrap = _el(containerId);
    if (!wrap) return;
    wrap.innerHTML = root.RbModuleTypes.ACCENT_PALETTE.map(function (c) {
      var cls = c === selected ? 'rb-color-swatch is-selected' : 'rb-color-swatch';
      return '<button type="button" class="' + cls + '" style="background:' + c + '" data-rb-pick-color="' + kind + '|' + c + '"></button>';
    }).join('');
  }

  function openNewManualModal() {
    var sel = _el('rb-new-manual-subject');
    var subjects = (state.index && state.index.subjects) || [];
    if (!subjects.length) {
      if (typeof root.showToast === 'function') root.showToast(_t('rbCreateSubjectFirst', 'Please create a subject first.'), true);
      openSubjectModal('');
      return;
    }
    sel.innerHTML = subjects.map(function (s) {
      var selected = s.id === state.activeSubjectId ? 'selected' : '';
      return '<option value="' + _esc(s.id) + '" ' + selected + '>' + _esc(s.name) + '</option>';
    }).join('');
    _el('rb-new-manual-title').value = '';
    _el('rb-new-manual-level').value = '';
    _el('rb-new-manual-year').value = '';
    _el('rb-new-manual-subdisc').value = '';
    _el('rb-manual-modal').classList.remove('is-hidden');
  }

  function openTypeBuilderModal() {
    var list = _el('rb-custom-types-list');
    var customs = (state.index && state.index.customModuleTypes) || [];
    list.innerHTML = customs.length
      ? customs.map(function (ct) {
          return '<div class="rb-list-row"><span class="rb-chip" style="border-left:5px solid ' + _esc(ct.color) + '">' + _esc(ct.defaultName) + '</span>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-del-ctype="' + _esc(ct.id) + '">×</button></div>';
        }).join('')
      : '<p class="rb-ref-card-sub">' + _esc(_t('rbNoCustomTypes', 'No custom module types created yet.')) + '</p>';
    _renderColorRow('rb-ctype-colors', state.ctypeColor, 'ctype');
    renderCtypeFields();
    _el('rb-type-modal').classList.remove('is-hidden');
  }

  function renderCtypeFields() {
    var wrap = _el('rb-ctype-fields');
    if (!wrap) return;
    wrap.innerHTML = state.ctypeFields.map(function (f, i) {
      return (
        '<div class="rb-list-row">' +
          '<input type="text" class="rb-input" value="' + _esc(f.defaultLabel) + '" data-rb-ctype-flabel="' + i + '" placeholder="Field Label" />' +
          '<select class="rb-input" data-rb-ctype-fkind="' + i + '">' +
            '<option value="richtext" ' + (f.kind === 'richtext' ? 'selected' : '') + '>Markdown / KaTeX</option>' +
            '<option value="text" ' + (f.kind === 'text' ? 'selected' : '') + '>Short Text</option>' +
            '<option value="list" ' + (f.kind === 'list' ? 'selected' : '') + '>Bullet List</option>' +
            '<option value="keyvalue" ' + (f.kind === 'keyvalue' ? 'selected' : '') + '>Key-Value Pairs</option>' +
            '<option value="table" ' + (f.kind === 'table' ? 'selected' : '') + '>Table</option>' +
          '</select>' +
        '</div>'
      );
    }).join('');
  }

  function openExportModal() {
    if (!state.activeManual) {
      if (typeof root.showToast === 'function') root.showToast(_t('rbOpenManualToExport', 'Open a reference manual first to export.'), true);
      return;
    }
    if (root.ExportStylesService) {
      var wrap = _el('rb-export-style-selector-wrap');
      if (wrap) {
        root.ExportStylesService.renderStyleSelector(wrap, {
          toolKey: 'referenceBuilder',
          className: 'rb-input'
        });
      }
    }
    var es = state.activeManual.exportSettings || {};
    var gc = (root.Desktop && typeof root.Desktop.getPdfExportSettings === 'function')
      ? root.Desktop.getPdfExportSettings()
      : { pageSize: 'A4', orientation: 'portrait', margin: '16mm 14mm' };
    _el('rb-exp-pagesize').value = es.pageSize || 'general';
    _el('rb-exp-orientation').value = es.orientation || 'general';
    _el('rb-exp-margin').value = es.margin || '';
    _el('rb-exp-margin').placeholder = gc.margin || '16mm 14mm';
    _el('rb-exp-fontsize').value = es.fontSize || '';
    _el('rb-exp-cover').checked = es.showCover !== false;
    _el('rb-exp-toc').checked = es.showToc !== undefined ? es.showToc : (state.activeManual.showToc !== false);
    _el('rb-exp-anskey').checked = es.includeAnswerKey !== false;
    _el('rb-exp-pagebreak').checked = !!es.pageBreakChapters;
    _el('rb-export-modal').classList.remove('is-hidden');
  }

  function openCssModal() {
    if (!state.activeManual) {
      if (typeof root.showToast === 'function') root.showToast(_t('rbOpenManualFirst', 'Open a reference manual first.'), true);
      return;
    }
    renderCssSheetsList();
    _el('rb-css-modal').classList.remove('is-hidden');
  }

  function renderCssSheetsList() {
    var listEl = _el('rb-css-sheets-list');
    if (!listEl || !state.activeManual) return;
    var sheets = Array.isArray(state.activeManual.customCssList) ? state.activeManual.customCssList : [];
    if (!sheets.length) {
      listEl.innerHTML = '<p class="rb-ref-card-sub">' + _esc(_t('rbNoCustomCss', 'No custom CSS sheets yet. Click "+ Add Custom CSS Sheet" to layer custom styles.')) + '</p>';
      return;
    }
    listEl.innerHTML = sheets.map(function (sh, idx) {
      return (
        '<div class="rb-css-sheet-card">' +
          '<div class="rb-list-row">' +
            '<label class="rb-inline-check"><input type="checkbox" ' + (sh.enabled !== false ? 'checked' : '') + ' data-rb-css-toggle="' + idx + '" /> Active</label>' +
            '<input type="text" class="rb-input" value="' + _esc(sh.name || '') + '" placeholder="Stylesheet name" data-rb-css-name="' + idx + '" />' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-css-del="' + idx + '">×</button>' +
          '</div>' +
          '<textarea class="rb-input rb-css-code" placeholder=".rb-module { ... }" data-rb-css-code="' + idx + '">' + _esc(sh.css || '') + '</textarea>' +
        '</div>'
      );
    }).join('');
  }

  function closeAllModals() {
    ['rb-subject-modal', 'rb-manual-modal', 'rb-type-modal', 'rb-css-modal', 'rb-export-modal', 'rb-export-preview-modal'].forEach(function (id) {
      var m = _el(id);
      if (m) m.classList.add('is-hidden');
    });
    closePhrasePopover();
  }

  function closePhrasePopover() {
    var pop = _el('rb-phrase-popover');
    if (pop) pop.classList.add('is-hidden');
  }

  function openPhrasePopover(anchorEl, modId, fieldKey, targetKind) {
    var pop = _el('rb-phrase-popover');
    if (!pop || !state.index) return;
    var phrases = Array.isArray(state.index.savedPhrases) ? state.index.savedPhrases : [];
    if (!phrases.length) {
      pop.innerHTML = '<div class="rb-ref-card-sub">No saved phrases yet. Use +Lbl or +Phrase to save one.</div>';
    } else {
      pop.innerHTML = phrases.map(function (p, idx) {
        return (
          '<div class="rb-phrase-row">' +
            '<button type="button" class="rb-btn rb-btn-sm rb-phrase-apply-btn" data-rb-phrase-apply="' + _esc(modId) + '|' + _esc(fieldKey) + '|' + _esc(targetKind) + '|' + idx + '">' + _esc(p.text) + '</button>' +
            '<button type="button" class="rb-btn rb-btn-sm rb-btn-rose" data-rb-phrase-del="' + idx + '">×</button>' +
          '</div>'
        );
      }).join('');
    }
    var rect = anchorEl.getBoundingClientRect();
    pop.style.left = Math.min(window.innerWidth - 260, Math.max(8, rect.left)) + 'px';
    pop.style.top = Math.min(window.innerHeight - 220, rect.bottom + 4) + 'px';
    pop.classList.remove('is-hidden');
  }

  function startTour() {
    if (!root.Tutorial || typeof root.Tutorial.start !== 'function') return;
    var steps = [
      { selector: '#rb-subjects-list', title: _t('tutRbSubjectsTitle', 'Subjects & Categories'), text: _t('tutRbSubjectsText', 'Create subjects (English, Biology, History, etc.) to organize your reference manuals.') },
      { selector: '#rb-search-input', title: _t('tutRbSearchTitle', 'Search & Filter'), text: _t('tutRbSearchText', 'Filter references by keyword, level, year, or sub-discipline.') },
      { selector: '#rb-btn-library', title: _t('tutRbLibraryTitle', 'Library & Editor'), text: _t('tutRbLibraryText', 'Switch between your subject library and the modular reference manual editor.') }
    ].filter(function (s) { return !!document.querySelector(s.selector); });
    if (steps.length) root.Tutorial.start(steps);
  }

  async function init() {
    state.index = await root.RbStore.loadIndex();
    var params = new URLSearchParams(location.search || '');
    var manualId = params.get('manual');
    var chapterId = params.get('chapter');
    var moduleId = params.get('module');
    if (manualId) {
      await openManual(manualId, chapterId, moduleId);
    } else {
      showLibraryView();
    }
  }

  root.RbApp = {
    state: state,
    init: init,
    _getActiveChapter: _getActiveChapter,
    _getSubjectById: _getSubjectById,
    _allTypes: _allTypes,
    renderSubjectsSidebar: renderSubjectsSidebar,
    renderReferenceCards: renderReferenceCards,
    showLibraryView: showLibraryView,
    showEditorView: showEditorView,
    renderOutline: renderOutline,
    renderChapterWorkspace: renderChapterWorkspace,
    renderEditorAll: renderEditorAll,
    setPreviewMode: setPreviewMode,
    openExportPreviewModal: openExportPreviewModal,
    openPreviewInExternalBrowser: openPreviewInExternalBrowser,
    printExportPreviewIframe: printExportPreviewIframe,
    schedulePreviewUpdate: schedulePreviewUpdate,
    openManual: openManual,
    saveCurrentManual: saveCurrentManual,
    openSubjectModal: openSubjectModal,
    openNewManualModal: openNewManualModal,
    openTypeBuilderModal: openTypeBuilderModal,
    renderCtypeFields: renderCtypeFields,
    openCssModal: openCssModal,
    renderCssSheetsList: renderCssSheetsList,
    openExportModal: openExportModal,
    closeAllModals: closeAllModals,
    closePhrasePopover: closePhrasePopover,
    openPhrasePopover: openPhrasePopover,
    startTour: startTour
  };

  document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
