/**
 * js/tag-link-modal.js - Universal Plain-Text Neobrutalist Link & Tag Modal
 * Class Management Tools (CMT)
 *
 * STRICT REQUIREMENT: NO EMOJIS, NO ICONS - PLAIN TEXT ONLY.
 * Thick solid black borders, hard offset shadows, high contrast, blocky buttons.
 */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TagLinkModal = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var _currentOpts = null;
  var _activeCategory = 'all';
  var _cachedCandidates = [];

  function t(key, fallback) {
    if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, fallback);
    }
    return fallback;
  }

  function ensureStylesheet() {
    if (document.getElementById('cmt-tag-link-modal-css')) return;
    var link = document.createElement('link');
    link.id = 'cmt-tag-link-modal-css';
    link.rel = 'stylesheet';
    // Handle both root-relative and subfolder-relative paths
    var isSubPage = window.location.pathname.includes('/pages/');
    link.href = (isSubPage ? '../' : '') + 'css/tag-link-modal.css';
    document.head.appendChild(link);
  }

  function ensureModalDom() {
    if (document.getElementById('cmt-link-modal-overlay')) return;
    ensureStylesheet();

    var overlay = document.createElement('div');
    overlay.id = 'cmt-link-modal-overlay';
    overlay.innerHTML =
      '<div class="cmt-lm-card" role="dialog" aria-modal="true">' +
        '<div class="cmt-lm-header">' +
          '<div class="cmt-lm-title-group">' +
            '<div class="cmt-lm-title-bar">' +
              '<span class="cmt-lm-badge" id="cmt-lm-header-badge">[ITEM]</span>' +
              '<h3 class="cmt-lm-title" id="cmt-lm-header-title">LINKS AND TAGS</h3>' +
            '</div>' +
            '<p class="cmt-lm-subtitle" id="cmt-lm-header-sub"></p>' +
          '</div>' +
          '<button type="button" class="cmt-lm-close-btn" id="cmt-lm-btn-close">[CLOSE]</button>' +
        '</div>' +
        '<div class="cmt-lm-body">' +
          // ── Section 1: Tags
          '<div class="cmt-lm-section">' +
            '<div class="cmt-lm-sec-hdr">' +
              '<span class="cmt-lm-sec-title">TAGS</span>' +
              '<span class="cmt-lm-sec-count" id="cmt-lm-tags-count">0</span>' +
            '</div>' +
            '<div class="cmt-lm-tags-wrap" id="cmt-lm-tags-container"></div>' +
            '<div class="cmt-lm-tag-add-form">' +
              '<input type="text" class="cmt-lm-input" id="cmt-lm-tag-input" placeholder="Type tag (e.g. #unit3) and press enter..." />' +
              '<button type="button" class="cmt-lm-btn primary" id="cmt-lm-btn-add-tag">[ADD TAG]</button>' +
            '</div>' +
          '</div>' +

          // ── Section 2: Connected Items
          '<div class="cmt-lm-section">' +
            '<div class="cmt-lm-sec-hdr">' +
              '<span class="cmt-lm-sec-title">CONNECTED ITEMS</span>' +
              '<span class="cmt-lm-sec-count" id="cmt-lm-links-count">0</span>' +
            '</div>' +
            '<div class="cmt-lm-links-list" id="cmt-lm-links-container"></div>' +
          '</div>' +

          // ── Section 3: Add Link Drawer
          '<div class="cmt-lm-section cmt-lm-add-section">' +
            '<div class="cmt-lm-sec-hdr">' +
              '<span class="cmt-lm-sec-title">CONNECT TO ANOTHER ITEM</span>' +
              '<button type="button" class="cmt-lm-btn" id="cmt-lm-btn-attach-file">[ATTACH FILE / PDF]</button>' +
              '<input type="file" id="cmt-lm-file-picker" style="display:none;" />' +
            '</div>' +
            '<div class="cmt-lm-tabs" id="cmt-lm-category-tabs">' +
              '<button type="button" class="cmt-lm-tab-btn active" data-cat="all">[ALL]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="classes">[CLASSES]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="docs">[DOCUMENTS]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="gradesheet">[GRADE SHEET]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="competences">[COMPETENCES]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="criteria">[CRITERIA]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="tests">[TESTS]</button>' +
            '</div>' +
            '<div class="cmt-lm-search-row">' +
              '<input type="text" class="cmt-lm-input" id="cmt-lm-search-input" placeholder="Search available items by title, class, or code..." />' +
            '</div>' +
            '<div class="cmt-lm-candidates-list" id="cmt-lm-candidates-container">' +
              '<div class="cmt-lm-empty">Loading candidate items...</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Close button & overlay click
    document.getElementById('cmt-lm-btn-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    // Add Tag Handlers
    document.getElementById('cmt-lm-btn-add-tag').addEventListener('click', handleAddTag);
    document.getElementById('cmt-lm-tag-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    });

    // Category Tabs
    var tabBtns = overlay.querySelectorAll('.cmt-lm-tab-btn');
    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        tabBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        _activeCategory = btn.getAttribute('data-cat') || 'all';
        renderCandidates();
      });
    });

    // Search Input
    document.getElementById('cmt-lm-search-input').addEventListener('input', function() {
      renderCandidates();
    });

    // File Attachment Handler
    var filePicker = document.getElementById('cmt-lm-file-picker');
    document.getElementById('cmt-lm-btn-attach-file').addEventListener('click', function() {
      filePicker.click();
    });
    filePicker.addEventListener('change', handleFilePicked);

    // Escape Key Listener
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (document.getElementById('cmt-preview-modal-overlay')?.classList.contains('open')) {
          closePreview();
        } else if (overlay.classList.contains('open')) {
          close();
        }
      }
    });
  }

  function ensurePreviewDom() {
    if (document.getElementById('cmt-preview-modal-overlay')) return;
    ensureStylesheet();

    var overlay = document.createElement('div');
    overlay.id = 'cmt-preview-modal-overlay';
    overlay.innerHTML =
      '<div class="cmt-preview-card" role="dialog" aria-modal="true">' +
        '<div class="cmt-preview-header">' +
          '<div class="cmt-lm-title-bar">' +
            '<span class="cmt-lm-badge">[PREVIEW]</span>' +
            '<h3 class="cmt-lm-title" id="cmt-prev-title">FILE PREVIEW</h3>' +
          '</div>' +
          '<button type="button" class="cmt-lm-close-btn" id="cmt-prev-btn-close">[CLOSE]</button>' +
        '</div>' +
        '<div class="cmt-preview-body" id="cmt-prev-body">' +
          '<div class="cmt-lm-empty">Loading file preview...</div>' +
        '</div>' +
        '<div class="cmt-preview-footer">' +
          '<span class="cmt-preview-info" id="cmt-prev-path"></span>' +
          '<button type="button" class="cmt-lm-btn primary" id="cmt-prev-btn-open-os">[OPEN IN DEFAULT APP]</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('cmt-prev-btn-close').addEventListener('click', closePreview);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePreview();
    });
  }

  // ── Modal Actions & Data Loading ──────────────────────────────────────────
  async function open(opts) {
    if (!opts || !opts.urn) return;
    _currentOpts = opts;
    ensureModalDom();

    var overlay = document.getElementById('cmt-link-modal-overlay');
    var p = window.LinksService ? window.LinksService.parseUrn(opts.urn) : { type: 'item' };

    document.getElementById('cmt-lm-header-badge').textContent = '[' + (p ? p.type.toUpperCase() : 'ITEM') + ']';
    document.getElementById('cmt-lm-header-title').textContent = opts.title || opts.urn;
    document.getElementById('cmt-lm-header-sub').textContent = opts.subtitle || opts.urn;

    overlay.classList.add('open');

    // Register this entity in the registry for future reverse discovery
    if (window.LinksService) {
      await window.LinksService.registerEntity(opts.urn, {
        title: opts.title || opts.urn,
        subtitle: opts.subtitle || '',
        type: p ? p.type : 'general',
        classId: opts.classId || null
      });
    }

    await refreshModalData();
    await loadCandidateEntities();
  }

  function close() {
    var overlay = document.getElementById('cmt-link-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    if (_currentOpts && typeof _currentOpts.onClose === 'function') {
      _currentOpts.onClose();
    }
  }

  async function refreshModalData() {
    if (!_currentOpts || !window.LinksService) return;
    var urn = _currentOpts.urn;

    // 1. Load Tags
    var tags = await window.LinksService.getTagsFor(urn);
    var tagsCount = document.getElementById('cmt-lm-tags-count');
    var tagsContainer = document.getElementById('cmt-lm-tags-container');
    if (tagsCount) tagsCount.textContent = tags.length;

    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      if (!tags.length) {
        tagsContainer.innerHTML = '<span class="cmt-lm-empty" style="padding:4px 0;">No tags attached</span>';
      } else {
        tags.forEach(function(tag) {
          var pill = document.createElement('span');
          pill.className = 'cmt-lm-tag-pill';
          pill.innerHTML =
            '<span>' + tag + '</span>' +
            '<button type="button" class="cmt-lm-tag-del" title="Remove tag">[X]</button>';
          pill.querySelector('.cmt-lm-tag-del').addEventListener('click', async function() {
            await window.LinksService.removeTag(urn, tag);
            await refreshModalData();
            notifyUpdate();
          });
          tagsContainer.appendChild(pill);
        });
      }
    }

    // 2. Load Links (Direct & Inherited Context)
    var context = await window.LinksService.resolveContext({
      urn: urn,
      classId: _currentOpts.classId
    });

    var linksCount = document.getElementById('cmt-lm-links-count');
    var linksContainer = document.getElementById('cmt-lm-links-container');
    var totalLinks = context.direct.length + context.inherited.length;
    if (linksCount) linksCount.textContent = totalLinks;

    if (linksContainer) {
      linksContainer.innerHTML = '';
      if (totalLinks === 0) {
        linksContainer.innerHTML = '<div class="cmt-lm-empty">No connected items yet. Choose an item below to connect.</div>';
      } else {
        // Render Direct Links
        context.direct.forEach(function(link) {
          linksContainer.appendChild(createLinkRow(link, false));
        });
        // Render Inherited Links
        context.inherited.forEach(function(link) {
          linksContainer.appendChild(createLinkRow(link, true));
        });
      }
    }
  }

  function createLinkRow(link, isInherited) {
    var row = document.createElement('div');
    row.className = 'cmt-lm-link-row';

    var p = window.LinksService.parseUrn(link.otherUrn);
    var typeLabel = p ? p.type.toUpperCase() : 'LINK';
    var title = (link.targetMeta && link.targetMeta.title) || link.otherUrn;
    var sub = (link.targetMeta && link.targetMeta.subtitle) || (link.meta && link.meta.label) || '';

    var badgeClass = isInherited ? 'cmt-lm-badge inherited' : 'cmt-lm-badge';
    var badgeText = isInherited ? '[INHERITED: ' + (_currentOpts.classId || 'CLASS').toUpperCase() + ']' : '[' + typeLabel + ']';

    row.innerHTML =
      '<div class="cmt-lm-link-info">' +
        '<div class="cmt-lm-link-title-line">' +
          '<span class="' + badgeClass + '">' + badgeText + '</span>' +
          '<span class="cmt-lm-link-title">' + title + '</span>' +
        '</div>' +
        (sub ? '<span class="cmt-lm-link-sub">' + sub + '</span>' : '') +
      '</div>' +
      '<div class="cmt-lm-link-actions">' +
        '<button type="button" class="cmt-lm-btn primary" id="btn-open-link">[OPEN]</button>' +
        (!isInherited ? '<button type="button" class="cmt-lm-btn danger" id="btn-unlink">[UNLINK]</button>' : '') +
      '</div>';

    row.querySelector('#btn-open-link').addEventListener('click', async function() {
      if (p && p.type === 'file') {
        previewFile(p.id, title);
      } else {
        await window.LinksService.openUrn(link.otherUrn);
      }
    });

    var unlinkBtn = row.querySelector('#btn-unlink');
    if (unlinkBtn) {
      unlinkBtn.addEventListener('click', async function() {
        await window.LinksService.removeLink(_currentOpts.urn, link.otherUrn);
        await refreshModalData();
        await renderCandidates();
        notifyUpdate();
      });
    }

    return row;
  }

  async function handleAddTag() {
    var input = document.getElementById('cmt-lm-tag-input');
    if (!input || !input.value.trim() || !_currentOpts) return;
    var rawTag = input.value.trim();
    input.value = '';
    await window.LinksService.addTag(_currentOpts.urn, rawTag);
    await refreshModalData();
    notifyUpdate();
  }

  async function handleFilePicked(ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file || !_currentOpts) return;

    var reader = new FileReader();
    reader.onload = async function(e) {
      var content = e.target.result;
      var isBinary = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('audio/');
      var encoding = isBinary ? 'base64' : 'utf8';

      var storeRes = await window.LinksService.storeGradeAttachment({
        classId: _currentOpts.classId || 'general',
        evalId: _currentOpts.evalId || 'eval',
        studentId: _currentOpts.studentId || null,
        filename: file.name,
        content: content,
        encoding: encoding,
        title: file.name
      });

      if (storeRes && storeRes.ok && storeRes.urn) {
        await window.LinksService.addLink(_currentOpts.urn, storeRes.urn, {
          relation: 'attachment',
          targetMeta: {
            title: file.name,
            subtitle: 'Attached file • ' + (file.size ? Math.round(file.size / 1024) + ' KB' : ''),
            type: 'file',
            target: 'user',
            relativePath: storeRes.relPath
          }
        });
        await refreshModalData();
        notifyUpdate();
      }
    };

    if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('audio/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }

  function notifyUpdate() {
    if (_currentOpts && typeof _currentOpts.onUpdate === 'function') {
      _currentOpts.onUpdate();
    }
  }

  // ── Candidate Discovery & Linking ───────────────────────────────────────────
  async function loadCandidateEntities() {
    _cachedCandidates = [];
    var desktop = window.Desktop;

    // 1. Classes from ClassGroups
    if (typeof window.CLASS_GROUPS !== 'undefined') {
      var groups = window.CLASS_GROUPS;
      var keys = Object.keys(groups).filter(function(k) { return k !== '_meta' && !k.startsWith('_'); });
      keys.forEach(function(k) {
        var g = groups[k];
        _cachedCandidates.push({
          urn: window.LinksService.makeUrn('class', k),
          type: 'classes',
          badge: '[CLASS]',
          title: (g && g.name) || k,
          subtitle: 'Class Group • ' + ((g && g.students && g.students.length) || 0) + ' students'
        });
      });
    }

    // 2. Documents in doceditor
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var docRes = await desktop.listFiles('user', { subdir: 'doceditor', extensions: ['.md', '.html', '.txt'] });
        var docs = Array.isArray(docRes) ? docRes : (docRes && Array.isArray(docRes.files) ? docRes.files : []);
        docs.forEach(function(d) {
          var fn = typeof d === 'string' ? d : (d.filename || d.name);
          if (!fn) return;
          _cachedCandidates.push({
            urn: window.LinksService.makeUrn('doc', 'user/doceditor/' + fn),
            type: 'docs',
            badge: '[DOC]',
            title: fn,
            subtitle: 'Document Editor • user/doceditor/' + fn
          });
        });
      } catch (_) {}
    }

    // 3. Competences
    if (typeof window.CompetenceAggregatorService !== 'undefined') {
      try {
        var comps = await window.CompetenceAggregatorService.loadAllCompetences();
        if (Array.isArray(comps)) {
          comps.slice(0, 80).forEach(function(c) {
            _cachedCandidates.push({
              urn: window.LinksService.makeUrn('competence', c.code || c.id),
              type: 'competences',
              badge: '[COMPETENCE]',
              title: (c.code ? c.code + ': ' : '') + (c.title || c.statement || c.id),
              subtitle: (c.category || 'General') + ' • ' + (c.level || '')
            });
          });
        }
      } catch (_) {}
    }

    // 4. Criteria Banks
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var critRes = await desktop.listFiles('customCriteria', { extensions: ['.js', '.json'] });
        var crits = Array.isArray(critRes) ? critRes : (critRes && Array.isArray(critRes.files) ? critRes.files : []);
        crits.forEach(function(c) {
          var fn = typeof c === 'string' ? c : (c.filename || c.name);
          if (!fn) return;
          _cachedCandidates.push({
            urn: window.LinksService.makeUrn('criteria', fn),
            type: 'criteria',
            badge: '[CRITERIA]',
            title: fn.replace(/\.(js|json)$/, ''),
            subtitle: 'Criteria Rubric Bank • ' + fn
          });
        });
      } catch (_) {}
    }

    // 5. Tests
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var testRes = await desktop.listFiles('tests', { extensions: ['.json'] });
        var tests = Array.isArray(testRes) ? testRes : (testRes && Array.isArray(testRes.files) ? testRes.files : []);
        tests.forEach(function(t) {
          var fn = typeof t === 'string' ? t : (t.filename || t.name);
          if (!fn) return;
          _cachedCandidates.push({
            urn: window.LinksService.makeUrn('test', fn),
            type: 'tests',
            badge: '[TEST]',
            title: fn.replace(/^test_/, '').replace(/\.json$/, '').replace(/_[a-f0-9]{8,}$/, ''),
            subtitle: 'Test Creator • ' + fn
          });
        });
      } catch (_) {}
    }

    // 6. Registered Entities from links-registry.json
    var reg = await window.LinksService.loadRegistry();
    if (reg && reg.entities) {
      Object.keys(reg.entities).forEach(function(u) {
        var ent = reg.entities[u];
        if (ent && ent.title && !_cachedCandidates.some(function(c) { return c.urn === u; })) {
          var p = window.LinksService.parseUrn(u);
          _cachedCandidates.push({
            urn: u,
            type: p ? p.type : 'all',
            badge: '[' + (p ? p.type.toUpperCase() : 'ITEM') + ']',
            title: ent.title,
            subtitle: ent.subtitle || u
          });
        }
      });
    }

    renderCandidates();
  }

  function renderCandidates() {
    var container = document.getElementById('cmt-lm-candidates-container');
    if (!container) return;
    var searchInput = document.getElementById('cmt-lm-search-input');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    var filtered = _cachedCandidates.filter(function(item) {
      if (item.urn === _currentOpts?.urn) return false; // Don't link to self
      if (_activeCategory !== 'all' && item.type !== _activeCategory) return false;
      if (query) {
        var matchTitle = item.title && item.title.toLowerCase().includes(query);
        var matchSub = item.subtitle && item.subtitle.toLowerCase().includes(query);
        var matchUrn = item.urn && item.urn.toLowerCase().includes(query);
        return matchTitle || matchSub || matchUrn;
      }
      return true;
    });

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = '<div class="cmt-lm-empty">No items match your filter.</div>';
      return;
    }

    filtered.slice(0, 50).forEach(function(item) {
      var row = document.createElement('div');
      row.className = 'cmt-lm-candidate-row';
      row.innerHTML =
        '<div class="cmt-lm-link-info">' +
          '<div class="cmt-lm-link-title-line">' +
            '<span class="cmt-lm-badge">' + item.badge + '</span>' +
            '<span class="cmt-lm-link-title">' + item.title + '</span>' +
          '</div>' +
          '<span class="cmt-lm-link-sub">' + item.subtitle + '</span>' +
        '</div>' +
        '<button type="button" class="cmt-lm-btn primary" id="btn-add-candidate">[CONNECT]</button>';

      row.querySelector('#btn-add-candidate').addEventListener('click', async function() {
        await window.LinksService.addLink(_currentOpts.urn, item.urn, {
          targetMeta: {
            title: item.title,
            subtitle: item.subtitle,
            type: item.type
          }
        });
        await refreshModalData();
        renderCandidates();
        notifyUpdate();
      });

      container.appendChild(row);
    });
  }

  // ── Embedded Previewer Modal ────────────────────────────────────────────────
  function previewFile(pathOrUrn, title) {
    ensurePreviewDom();
    var overlay = document.getElementById('cmt-preview-modal-overlay');
    var titleEl = document.getElementById('cmt-prev-title');
    var pathEl = document.getElementById('cmt-prev-path');
    var bodyEl = document.getElementById('cmt-prev-body');
    var openOsBtn = document.getElementById('cmt-prev-btn-open-os');

    var cleanPath = String(pathOrUrn || '').replace(/^cmt:file:/, '');
    titleEl.textContent = title || cleanPath.split('/').pop() || 'FILE PREVIEW';
    pathEl.textContent = cleanPath;

    // Resolve URL for iframe / media
    var resolvedUrl = cleanPath;
    if (!cleanPath.startsWith('http://') && !cleanPath.startsWith('https://') && !cleanPath.startsWith('data:')) {
      if (cleanPath.startsWith('user/')) {
        resolvedUrl = '../' + cleanPath;
      }
    }

    var lower = cleanPath.toLowerCase();
    if (lower.endsWith('.pdf')) {
      bodyEl.innerHTML = '<iframe src="' + resolvedUrl + '#toolbar=1&navpanes=0" title="PDF Preview"></iframe>';
    } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.svg')) {
      bodyEl.innerHTML = '<img src="' + resolvedUrl + '" alt="Preview" />';
    } else if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a')) {
      bodyEl.innerHTML = '<audio controls autoplay src="' + resolvedUrl + '"></audio>';
    } else {
      bodyEl.innerHTML =
        '<div class="cmt-lm-empty">' +
          'No inline preview available for this file type.<br><br>' +
          '<button type="button" class="cmt-lm-btn primary" id="btn-preview-direct-open">[OPEN IN EXTERNAL APP]</button>' +
        '</div>';
      var directBtn = bodyEl.querySelector('#btn-preview-direct-open');
      if (directBtn) {
        directBtn.addEventListener('click', function() {
          openInOs(cleanPath);
        });
      }
    }

    openOsBtn.onclick = function() {
      openInOs(cleanPath);
    };

    overlay.classList.add('open');
  }

  function openInOs(filePath) {
    if (window.Desktop && typeof window.Desktop.openPath === 'function') {
      window.Desktop.openPath(filePath);
    } else {
      window.open(filePath, '_blank');
    }
  }

  function closePreview() {
    var overlay = document.getElementById('cmt-preview-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  return {
    open: open,
    close: close,
    previewFile: previewFile,
    closePreview: closePreview
  };
});
