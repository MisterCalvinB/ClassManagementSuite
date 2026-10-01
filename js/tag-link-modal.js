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
  var _cachedAvailableTags = [];
  var _candidatePageOffset = 250;
  var _candidatePageSize = 100;
  var _currentFilteredCandidates = [];
  var _currentLinkedUrns = new Set();

  function t(key, fallback) {
    if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, fallback);
    }
    return fallback;
  }

  function getLinksIconPath() {
    var isSubPage = typeof window !== 'undefined' && window.location.pathname.includes('/pages/');
    return (isSubPage ? '../' : '') + 'assets/icons/links.svg';
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

    var iconSrc = getLinksIconPath();
    var overlay = document.createElement('div');
    overlay.id = 'cmt-link-modal-overlay';
    overlay.innerHTML =
      '<div class="cmt-lm-card" role="dialog" aria-modal="true">' +
        '<div class="cmt-lm-header">' +
          '<div class="cmt-lm-title-group">' +
            '<div class="cmt-lm-title-bar">' +
              '<img src="' + iconSrc + '" class="cmt-lm-header-icon" alt="" />' +
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
            '<div class="cmt-lm-existing-tags-wrap" id="cmt-lm-existing-tags-container" style="display:none;">' +
              '<div class="cmt-lm-existing-tags-hdr">' +
                '<span class="cmt-lm-existing-tags-title">' + t('lmExistingTags', 'AVAILABLE SYSTEM TAGS') + '</span>' +
                '<span class="cmt-lm-existing-tags-hint">' + t('lmClickToAdd', '(Click to add)') + '</span>' +
              '</div>' +
              '<div class="cmt-lm-existing-tags-cloud" id="cmt-lm-existing-tags-cloud"></div>' +
            '</div>' +
          '</div>' +

          // ── Section 2: Connected Items
          '<div class="cmt-lm-section">' +
            '<div class="cmt-lm-sec-hdr">' +
              '<span class="cmt-lm-sec-title"><img src="' + iconSrc + '" class="cmt-lm-inline-icon" alt="" /> CONNECTED ITEMS</span>' +
              '<span class="cmt-lm-sec-count" id="cmt-lm-links-count">0</span>' +
            '</div>' +
            '<div class="cmt-lm-links-list" id="cmt-lm-links-container"></div>' +
          '</div>' +

          // ── Section 3: Add Link Drawer
          '<div class="cmt-lm-section cmt-lm-add-section">' +
            '<div class="cmt-lm-sec-hdr">' +
              '<span class="cmt-lm-sec-title"><img src="' + iconSrc + '" class="cmt-lm-inline-icon" alt="" /> CONNECT TO ANOTHER ITEM</span>' +
              '<button type="button" class="cmt-lm-btn" id="cmt-lm-btn-attach-file">[ATTACH FILE / PDF]</button>' +
              '<input type="file" id="cmt-lm-file-picker" style="display:none;" />' +
            '</div>' +
            '<div class="cmt-lm-tabs" id="cmt-lm-category-tabs">' +
              '<button type="button" class="cmt-lm-tab-btn active" data-cat="all">[ALL]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="classes">[CLASSES]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="databases">[DATABASES]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="docs">[DOCUMENTS]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="gradesheet">[GRADE SHEET]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="competences">[COMPETENCES]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="criteria">[CRITERIA]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="scales">[SCALES]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="tests">[TESTS]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="planner">[PLANNER]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="lessons">[LESSONS]</button>' +
              '<button type="button" class="cmt-lm-tab-btn" data-cat="board">[BOARD]</button>' +
            '</div>' +
            '<div class="cmt-lm-search-row">' +
              '<input type="text" class="cmt-lm-input" id="cmt-lm-search-input" placeholder="Search available items by title, class, or code..." />' +
              '<button type="button" class="cmt-lm-btn" id="cmt-lm-btn-clear-search" style="display:none;">[CLEAR]</button>' +
            '</div>' +
            '<div class="cmt-lm-search-status-bar" id="cmt-lm-search-status-bar" style="display:none;"></div>' +
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
    var tagInputEl = document.getElementById('cmt-lm-tag-input');
    if (tagInputEl) {
      tagInputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddTag();
        }
      });
      tagInputEl.addEventListener('input', function() {
        renderAvailableTags(tagInputEl.value);
      });
    }

    // Category Tabs
    var tabBtns = overlay.querySelectorAll('.cmt-lm-tab-btn');
    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        tabBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        _activeCategory = btn.getAttribute('data-cat') || 'all';
        _candidatePageOffset = _candidatePageSize;
        renderCandidates();
      });
    });

    // Search Input
    var searchInput = document.getElementById('cmt-lm-search-input');
    var clearSearchBtn = document.getElementById('cmt-lm-btn-clear-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        if (clearSearchBtn) clearSearchBtn.style.display = searchInput.value ? 'inline-block' : 'none';
        _candidatePageOffset = _candidatePageSize;
        renderCandidates();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', function() {
        if (searchInput) searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        _candidatePageOffset = _candidatePageSize;
        renderCandidates();
        if (searchInput) searchInput.focus();
      });
    }

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
    if (!opts) return;
    if (!opts.urn && opts.sourceUrn) opts.urn = opts.sourceUrn;
    if (!opts.urn) return;
    if (!opts.title && opts.sourceMeta && opts.sourceMeta.title) opts.title = opts.sourceMeta.title;
    if (!opts.subtitle && opts.sourceMeta && opts.sourceMeta.subtitle) opts.subtitle = opts.sourceMeta.subtitle;
    _currentOpts = opts;
    ensureModalDom();

    // Ensure roster is loaded so student names are available immediately
    if (window.LinksService && typeof window.LinksService.ensureRosterLoaded === 'function') {
      try {
        await window.LinksService.ensureRosterLoaded();
      } catch (_) {}
    }

    // Reset search & category filters for clean opening
    _activeCategory = (opts.defaultCategory || 'all');
    _candidatePageOffset = 250;
    var searchInput = document.getElementById('cmt-lm-search-input');
    if (searchInput) searchInput.value = '';
    var clearBtn = document.getElementById('cmt-lm-btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';

    // Synchronize category tab classes
    var catTabs = document.querySelectorAll('#cmt-lm-category-tabs .cmt-lm-tab-btn');
    catTabs.forEach(function(b) {
      var cat = b.getAttribute('data-cat') || 'all';
      if (cat === _activeCategory) b.classList.add('active');
      else b.classList.remove('active');
    });

    var overlay = document.getElementById('cmt-link-modal-overlay');
    var p = window.LinksService ? window.LinksService.parseUrn(opts.urn) : { type: 'item' };

    var displayInfo = null;
    if (window.LinksService && typeof window.LinksService.resolveUrnDisplay === 'function') {
      try {
        displayInfo = await window.LinksService.resolveUrnDisplay(opts.urn);
      } catch (_) {}
    }

    var isRawTitle = false;
    if (opts.title) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opts.title) ||
          /^st-[a-z0-9_-]+$/i.test(opts.title) ||
          /^student:\s*[0-9a-f-]{10,}$/i.test(opts.title) ||
          /^class:\s*[0-9a-f-]{10,}$/i.test(opts.title)) {
        isRawTitle = true;
      }
    }

    var finalTitle = (opts.title && !isRawTitle) ? opts.title : (displayInfo ? displayInfo.title : (opts.label || opts.urn));
    if (p && p.type === 'student' && (isRawTitle || !opts.title)) {
      var resolvedSName = window.LinksService && typeof window.LinksService.resolveStudentName === 'function' ? window.LinksService.resolveStudentName(p.id) : null;
      if (resolvedSName) finalTitle = resolvedSName;
    }
    var finalSub = opts.subtitle || opts.sub || (displayInfo ? displayInfo.subtitle : '');
    var finalBadge = (displayInfo && displayInfo.badge) ? displayInfo.badge : ('[' + (p ? p.type.toUpperCase() : 'ITEM') + ']');

    document.getElementById('cmt-lm-header-badge').textContent = finalBadge;
    document.getElementById('cmt-lm-header-title').textContent = finalTitle;
    document.getElementById('cmt-lm-header-sub').textContent = finalSub;

    overlay.classList.add('open');

    // Register this entity in the registry for future reverse discovery
    if (window.LinksService) {
      await window.LinksService.registerEntity(opts.urn, {
        title: finalTitle,
        subtitle: finalSub,
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

  function renderAvailableTags(filterQuery) {
    var container = document.getElementById('cmt-lm-existing-tags-container');
    var cloud = document.getElementById('cmt-lm-existing-tags-cloud');
    if (!container || !cloud) return;

    if (!_cachedAvailableTags || _cachedAvailableTags.length === 0) {
      container.style.display = 'none';
      return;
    }

    var q = (filterQuery || '').trim().toLowerCase();
    if (q.startsWith('#')) q = q.slice(1);

    var filtered = _cachedAvailableTags.filter(function(item) {
      if (!q) return true;
      var tName = (item.tag || '').toLowerCase();
      if (tName.startsWith('#')) tName = tName.slice(1);
      return tName.includes(q);
    });

    if (filtered.length === 0) {
      if (q) {
        container.style.display = 'block';
        cloud.innerHTML = '<span class="cmt-lm-empty" style="padding:4px 0;">' + t('lmNoOtherTags', 'No matching tags in system') + '</span>';
      } else {
        container.style.display = 'none';
      }
      return;
    }

    container.style.display = 'block';
    cloud.innerHTML = '';
    filtered.forEach(function(item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cmt-lm-existing-tag-chip';
      btn.title = t('lmClickToAdd', 'Click to add tag');
      btn.innerHTML =
        '<span class="cmt-lm-chip-label">+ ' + item.tag + '</span>' +
        (item.count ? '<span class="cmt-lm-chip-count">' + item.count + '</span>' : '');
      btn.addEventListener('click', async function(ev) {
        ev.preventDefault();
        if (!_currentOpts || !window.LinksService) return;
        await window.LinksService.addTag(_currentOpts.urn, item.tag);
        var input = document.getElementById('cmt-lm-tag-input');
        if (input) input.value = '';
        await refreshModalData();
        notifyUpdate();
      });
      cloud.appendChild(btn);
    });
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

    // 1b. Load System Available Tags for Quick Add
    try {
      var allSummaries = (typeof window.LinksService.getTagSummary === 'function')
        ? await window.LinksService.getTagSummary()
        : [];
      var attachedSet = new Set(tags.map(function(t) { return t.toLowerCase(); }));
      _cachedAvailableTags = allSummaries.filter(function(s) {
        return s && s.tag && !attachedSet.has(s.tag.toLowerCase());
      });
      var tagInput = document.getElementById('cmt-lm-tag-input');
      renderAvailableTags(tagInput ? tagInput.value : '');
    } catch (tagErr) {
      console.warn('TagLinkModal: error loading tag summary', tagErr);
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

    _currentLinkedUrns = new Set();
    context.direct.forEach(function(l) {
      if (l && l.otherUrn) _currentLinkedUrns.add(window.LinksService ? window.LinksService.canonicalizeUrn(l.otherUrn) : l.otherUrn);
    });
    context.inherited.forEach(function(l) {
      if (l && l.otherUrn) _currentLinkedUrns.add(window.LinksService ? window.LinksService.canonicalizeUrn(l.otherUrn) : l.otherUrn);
    });

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

    var p = window.LinksService ? window.LinksService.parseUrn(link.otherUrn) : null;
    var typeLabel = p ? p.type.toUpperCase() : 'LINK';
    var rawTitle = (link.targetMeta && link.targetMeta.title) || link.otherUrn;
    var title = rawTitle;
    var sub = (link.targetMeta && link.targetMeta.subtitle) || (link.meta && link.meta.label) || '';

    // Auto-resolve human-readable names for student and class
    if (p && window.LinksService) {
      if (p.type === 'student') {
        var sName = typeof window.LinksService.resolveStudentName === 'function' ? window.LinksService.resolveStudentName(p.id) : null;
        if (sName) title = sName;
        var sInfo = typeof window.LinksService.resolveStudentInfo === 'function' ? window.LinksService.resolveStudentInfo(p.id) : null;
        if (sInfo && sInfo.className && !sub) sub = 'Student • ' + sInfo.className;
      } else if (p.type === 'class') {
        var cName = typeof window.LinksService.resolveClassName === 'function' ? window.LinksService.resolveClassName(p.id) : null;
        if (cName) title = cName;
      }
    }

    // Safety fallback: if title looks like a student UUID, attempt student lookup
    if (/^st-[a-z0-9_-]+$/i.test(title) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(title)) {
      if (window.LinksService && typeof window.LinksService.resolveStudentName === 'function') {
        var candidateStudentName = window.LinksService.resolveStudentName(title);
        if (candidateStudentName) title = candidateStudentName;
      }
    }

    var badgeClass = isInherited ? 'cmt-lm-badge inherited' : 'cmt-lm-badge';
    var badgeText = isInherited ? '[INHERITED: ' + (_currentOpts.classId || 'CLASS').toUpperCase() + ']' : '[' + typeLabel + ']';

    var iconSrc = getLinksIconPath();
    row.innerHTML =
      '<div class="cmt-lm-link-info">' +
        '<div class="cmt-lm-link-title-line">' +
          '<img src="' + iconSrc + '" class="cmt-lm-ref-icon" alt="" />' +
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
    if (_currentOpts) {
      if (typeof _currentOpts.onUpdate === 'function') {
        _currentOpts.onUpdate();
      }
      if (typeof _currentOpts.onLinksChanged === 'function') {
        _currentOpts.onLinksChanged();
      }
    }
  }

  // Helper to test category match between item.type and tab activeCategory
  function matchesCategory(itemType, activeCat, itemUrn) {
    if (!activeCat || activeCat === 'all') return true;
    if (itemType === activeCat) return true;
    var t = String(itemType || '').toLowerCase();
    var c = String(activeCat || '').toLowerCase();
    var ut = '';
    if (itemUrn && window.LinksService && typeof window.LinksService.parseUrn === 'function') {
      var p = window.LinksService.parseUrn(itemUrn);
      if (p && p.type) ut = String(p.type).toLowerCase();
    }
    if (c === 'classes' && (t === 'class' || t === 'classes' || t === 'student' || t === 'students' || ut === 'class' || ut === 'student')) return true;
    if (c === 'databases' && (
      t === 'databases' || t === 'database' ||
      t === 'wordbank' || t === 'wordbanks' || t === 'word' || t === 'words' || t === 'vocab' ||
      t === 'quotebank' || t === 'quotebanks' || t === 'quote' || t === 'quotes' ||
      t === 'dictation' || t === 'dictations' ||
      t === 'grammarbank' || t === 'grammarbanks' || t === 'grammar' ||
      t === 'gapfillbank' || t === 'gapfillbanks' || t === 'gapfill' ||
      t === 'errorbank' || t === 'errorbanks' || t === 'error' ||
      t === 'sentencebank' || t === 'sentencebanks' || t === 'sentence' ||
      t === 'storybank' || t === 'storybanks' || t === 'story' ||
      t === 'quiz' || t === 'quizzes' ||
      t === 'testbank' || t === 'testbanks' || t === 'exercise' || t === 'exercises' ||
      t === 'phase' || t === 'phases' ||
      t === 'chip' || t === 'chips' ||
      t === 'criteria' || t === 'criterion' ||
      t === 'scale' || t === 'scales' ||
      ut === 'databases' || ut === 'database' ||
      ut === 'wordbank' || ut === 'wordbanks' || ut === 'word' || ut === 'words' || ut === 'vocab' ||
      ut === 'quotebank' || ut === 'quotebanks' || ut === 'quote' || ut === 'quotes' ||
      ut === 'dictation' || ut === 'dictations' ||
      ut === 'grammarbank' || ut === 'grammarbanks' || ut === 'grammar' ||
      ut === 'gapfillbank' || ut === 'gapfillbanks' || ut === 'gapfill' ||
      ut === 'errorbank' || ut === 'errorbanks' || ut === 'error' ||
      ut === 'sentencebank' || ut === 'sentencebanks' || ut === 'sentence' ||
      ut === 'storybank' || ut === 'storybanks' || ut === 'story' ||
      ut === 'quiz' || ut === 'quizzes' ||
      ut === 'testbank' || ut === 'testbanks' || ut === 'exercise' || ut === 'exercises' ||
      ut === 'phase' || ut === 'phases' ||
      ut === 'chip' || ut === 'chips' ||
      ut === 'criteria' || ut === 'criterion' ||
      ut === 'scale' || ut === 'scales'
    )) return true;
    if (c === 'docs' && (t === 'doc' || t === 'docs' || t === 'document' || t === 'template' || t === 'templates' || ut === 'doc' || ut === 'document')) return true;
    if (c === 'gradesheet' && (t === 'gradesheet' || t === 'eval' || t === 'evaluation' || t === 'submission' || t === 'grade' || t === 'grade_cell' || ut === 'gradesheet' || ut === 'eval' || ut === 'grade')) return true;
    if (c === 'competences' && (t === 'competence' || t === 'competences' || ut === 'competence')) return true;
    if (c === 'criteria' && (t === 'criteria' || t === 'criterion' || ut === 'criteria' || ut === 'criterion')) return true;
    if (c === 'scales' && (t === 'scale' || t === 'scales' || ut === 'scale')) return true;
    if (c === 'tests' && (t === 'test' || t === 'tests' || t === 'eval' || t === 'evaluation' || t === 'testbank' || ut === 'test' || ut === 'testbank')) return true;
    if (c === 'planner' && (t === 'planner' || t === 'slot' || t === 'schedule' || ut === 'planner' || ut === 'slot')) return true;
    if (c === 'lessons' && (t === 'lesson' || t === 'lessons' || t === 'lessonplan' || t === 'lesson_plan' || ut === 'lesson')) return true;
    if (c === 'board' && (
      t === 'board' || t === 'mindmap' || t === 'mindmaps' ||
      t === 'board_node' || t === 'board-node' || t === 'boardnode' ||
      t === 'board-note' || t === 'board_note' || t === 'boardnote' ||
      t === 'board-group' || t === 'board_group' || t === 'boardgroup' ||
      t === 'board-shape' || t === 'board_shape' || t === 'boardshape' ||
      t === 'wordbank' || t === 'wordbanks' || t === 'word' || t === 'words' || t === 'vocab' ||
      ut === 'board' || ut === 'mindmap' || ut === 'mindmaps' ||
      ut === 'board_node' || ut === 'board-node' || ut === 'boardnode' ||
      ut === 'board-note' || ut === 'board_note' || ut === 'boardnote' ||
      ut === 'board-group' || ut === 'board_group' || ut === 'boardgroup' ||
      ut === 'board-shape' || ut === 'board_shape' || ut === 'boardshape' ||
      ut === 'wordbank' || ut === 'wordbanks' || ut === 'word' || ut === 'words' || ut === 'vocab'
    )) return true;
    return false;
  }

  // ── Candidate Discovery & Linking ───────────────────────────────────────────
  async function loadCandidateEntities() {
    _cachedCandidates = [];
    var knownUrns = new Set();
    var desktop = window.Desktop;

    // Helper to safely add candidate without duplicates (using canonical URN)
    function addCandidate(candidate) {
      if (!candidate || !candidate.urn) return;
      var cUrn = window.LinksService ? window.LinksService.canonicalizeUrn(candidate.urn) : candidate.urn;
      if (knownUrns.has(cUrn)) return;
      knownUrns.add(cUrn);
      _cachedCandidates.push(Object.assign({}, candidate, { urn: cUrn }));
    }

    function addStudentsFromList(students, classId, className) {
      if (!Array.isArray(students)) return;
      var cName = (window.LinksService && typeof window.LinksService.resolveClassName === 'function')
        ? (window.LinksService.resolveClassName(classId) || className || classId || 'Class')
        : (className || classId || 'Class');
      students.forEach(function(s) {
        if (!s) return;
        var sId = typeof s === 'string' ? s : (s.id || s.uuid);
        var sName = '';
        if (typeof s === 'object') {
          sName = ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.customName || s.name || '').trim();
        }
        if (!sName && sId && window.LinksService && typeof window.LinksService.resolveStudentName === 'function') {
          sName = window.LinksService.resolveStudentName(sId);
        }
        if (!sName && typeof s === 'string' && !/^st-[a-z0-9_-]+$/i.test(s) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)) {
          sName = s;
        }
        if ((!sName || /^st-[a-z0-9_-]+$/i.test(sName) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(sName)) && typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER)) {
          var found = window.STUDENTS_ROSTER.find(function(r) { return r && (r.uuid === sId || r.id === sId); });
          if (found) {
            sName = ([found.firstName, found.lastName].filter(Boolean).join(' ') || found.customName || found.name || '').trim();
          }
        }
        if (!sName) sName = sId;
        if (!sId && !sName) return;
        var effectiveId = sId || sName;
        var sUrn = window.LinksService.makeUrn('student', effectiveId);
        var subParts = ['Student', cName];
        if (typeof s === 'object' && s && s.number) subParts.push('#' + s.number);
        addCandidate({
          urn: sUrn,
          type: 'classes',
          badge: '[STUDENT]',
          title: sName,
          subtitle: subParts.join(' • ')
        });
      });
    }

    // 1. Classes from Grade Sheet state, Globals, Services, or Disk
    try {
      // 1a. In-memory classes (Grade Sheet active state)
      var gsClasses = (typeof window.GRADE_SHEET_CLASSES === 'function')
        ? window.GRADE_SHEET_CLASSES()
        : (window.appState && Array.isArray(window.appState.classes) ? window.appState.classes : null);
      if (Array.isArray(gsClasses)) {
        gsClasses.forEach(function(cls) {
          if (!cls) return;
          var sCount = cls.students ? cls.students.length : 0;
          var extra = [cls.year, cls.level].filter(Boolean).join(' • ');
          addCandidate({
            urn: window.LinksService.makeUrn('class', cls.id),
            type: 'classes',
            badge: '[CLASS]',
            title: cls.name || cls.id,
            subtitle: 'Class Group • ' + sCount + ' students' + (extra ? ' • ' + extra : '')
          });
          if (cls.groupId && cls.groupId !== cls.id) {
            addCandidate({
              urn: window.LinksService.makeUrn('class', cls.groupId),
              type: 'classes',
              badge: '[CLASS]',
              title: cls.name || cls.groupId,
              subtitle: 'Class Group • ' + sCount + ' students' + (extra ? ' • ' + extra : '')
            });
          }
          if (cls.students) addStudentsFromList(cls.students, cls.id, cls.name);
        });
      }

      // 1b. Global CLASS_GROUPS_DATA, CLASS_GROUPS_META, or CLASS_GROUPS
      if (typeof window.CLASS_GROUPS_DATA !== 'undefined' && window.CLASS_GROUPS_DATA) {
        var cgd = window.CLASS_GROUPS_DATA;
        if (cgd.classGroupsMeta && typeof cgd.classGroupsMeta === 'object') {
          Object.keys(cgd.classGroupsMeta).forEach(function(k) {
            if (k === '_meta' || k.startsWith('_')) return;
            var m = cgd.classGroupsMeta[k];
            var sCount = (m && m.students && m.students.length) || 0;
            addCandidate({
              urn: window.LinksService.makeUrn('class', k),
              type: 'classes',
              badge: '[CLASS]',
              title: (m && m.name) || k,
              subtitle: 'Class Group • ' + sCount + ' students' + (m && m.year ? ' • ' + m.year : '')
            });
            if (m && m.students) addStudentsFromList(m.students, k, m.name);
          });
        }
        if (cgd.classGroups && typeof cgd.classGroups === 'object') {
          Object.keys(cgd.classGroups).forEach(function(k) {
            if (k === '_meta' || k.startsWith('_')) return;
            var g = cgd.classGroups[k];
            var sCount = Array.isArray(g) ? g.length : ((g && g.students && g.students.length) || 0);
            addCandidate({
              urn: window.LinksService.makeUrn('class', k),
              type: 'classes',
              badge: '[CLASS]',
              title: (g && g.name) || k,
              subtitle: 'Class Group • ' + sCount + ' students'
            });
            if (Array.isArray(g)) addStudentsFromList(g, k, k);
            else if (g && g.students) addStudentsFromList(g.students, k, g.name || k);
          });
        }
      }
      if (typeof window.CLASS_GROUPS_META !== 'undefined' && window.CLASS_GROUPS_META) {
        Object.keys(window.CLASS_GROUPS_META).forEach(function(k) {
          if (k === '_meta' || k.startsWith('_')) return;
          var m = window.CLASS_GROUPS_META[k];
          var sCount = (m && m.students && m.students.length) || 0;
          addCandidate({
            urn: window.LinksService.makeUrn('class', k),
            type: 'classes',
            badge: '[CLASS]',
            title: (m && m.name) || k,
            subtitle: 'Class Group • ' + sCount + ' students' + (m && m.year ? ' • ' + m.year : '')
          });
          if (m && m.students) addStudentsFromList(m.students, k, m.name);
        });
      }
      if (typeof window.CLASS_GROUPS !== 'undefined' && window.CLASS_GROUPS) {
        Object.keys(window.CLASS_GROUPS).forEach(function(k) {
          if (k === '_meta' || k.startsWith('_')) return;
          var g = window.CLASS_GROUPS[k];
          var sCount = Array.isArray(g) ? g.length : ((g && g.students && g.students.length) || 0);
          addCandidate({
            urn: window.LinksService.makeUrn('class', k),
            type: 'classes',
            badge: '[CLASS]',
            title: (g && g.name) || k,
            subtitle: 'Class Group • ' + sCount + ' students'
          });
          if (Array.isArray(g)) addStudentsFromList(g, k, k);
          else if (g && g.students) addStudentsFromList(g.students, k, g.name || k);
        });
      }

      // 1c. CompetenceAggregatorService groups
      if (typeof window.CompetenceAggregatorService !== 'undefined' && typeof window.CompetenceAggregatorService.getAllGroups === 'function') {
        try {
          var grpData = await window.CompetenceAggregatorService.getAllGroups();
          if (grpData) {
            if (grpData.classGroupsMeta) {
              Object.keys(grpData.classGroupsMeta).forEach(function(k) {
                if (k === '_meta' || k.startsWith('_')) return;
                var m = grpData.classGroupsMeta[k];
                var sCount = (m && m.students && m.students.length) || 0;
                addCandidate({
                  urn: window.LinksService.makeUrn('class', k),
                  type: 'classes',
                  badge: '[CLASS]',
                  title: (m && m.name) || k,
                  subtitle: 'Class Group • ' + sCount + ' students' + (m && m.year ? ' • ' + m.year : '')
                });
                if (m && m.students) addStudentsFromList(m.students, k, m.name);
              });
            }
            if (grpData.classGroups) {
              Object.keys(grpData.classGroups).forEach(function(k) {
                if (k === '_meta' || k.startsWith('_')) return;
                var g = grpData.classGroups[k];
                var sCount = Array.isArray(g) ? g.length : ((g && g.students && g.students.length) || 0);
                addCandidate({
                  urn: window.LinksService.makeUrn('class', k),
                  type: 'classes',
                  badge: '[CLASS]',
                  title: (g && g.name) || k,
                  subtitle: 'Class Group • ' + sCount + ' students'
                });
                if (Array.isArray(g)) addStudentsFromList(g, k, k);
                else if (g && g.students) addStudentsFromList(g.students, k, g.name || k);
              });
            }
          }
        } catch (_) {}
      }

      // 1d. Read students.js and class-groups.js from Desktop
      if (desktop && typeof desktop.readText === 'function') {
        try {
          var stRes = await desktop.readText('user', 'students.js');
          if (stRes && stRes.ok && stRes.content) {
            var fnSt = new Function(
              stRes.content +
              '\nreturn (typeof STUDENTS_ROSTER !== "undefined") ? STUDENTS_ROSTER : [];'
            );
            var parsedSt = fnSt();
            if (Array.isArray(parsedSt)) {
              window.STUDENTS_ROSTER = parsedSt;
            }
          }
        } catch (_) {}

        try {
          var cgRes = await desktop.readText('user', 'class-groups.js');
          if (cgRes && cgRes.ok && cgRes.content) {
            var fn = new Function(
              cgRes.content +
              '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA' +
              ' : { classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null),' +
              '   classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null) };'
            );
            var parsed = fn();
            if (parsed) {
              if (parsed.classGroupsMeta) {
                Object.keys(parsed.classGroupsMeta).forEach(function(k) {
                  if (k === '_meta' || k.startsWith('_')) return;
                  var m = parsed.classGroupsMeta[k];
                  var sCount = (m && m.students && m.students.length) || 0;
                  addCandidate({
                    urn: window.LinksService.makeUrn('class', k),
                    type: 'classes',
                    badge: '[CLASS]',
                    title: (m && m.name) || k,
                    subtitle: 'Class Group • ' + sCount + ' students' + (m && m.year ? ' • ' + m.year : '')
                  });
                  if (m && m.students) addStudentsFromList(m.students, k, m.name);
                });
              }
              if (parsed.classGroups) {
                Object.keys(parsed.classGroups).forEach(function(k) {
                  if (k === '_meta' || k.startsWith('_')) return;
                  var g = parsed.classGroups[k];
                  var sCount = Array.isArray(g) ? g.length : ((g && g.students && g.students.length) || 0);
                  addCandidate({
                    urn: window.LinksService.makeUrn('class', k),
                    type: 'classes',
                    badge: '[CLASS]',
                    title: (g && g.name) || k,
                    subtitle: 'Class Group • ' + sCount + ' students'
                  });
                  if (Array.isArray(g)) addStudentsFromList(g, k, k);
                  else if (g && g.students) addStudentsFromList(g.students, k, g.name || k);
                });
              }
            }
          }
        } catch (_) {}
      }

      // 1e. Add all students directly from STUDENTS_ROSTER to ensure no unassigned or enrolled students are missing
      if (typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER)) {
        window.STUDENTS_ROSTER.forEach(function(st) {
          if (!st || (!st.uuid && !st.id)) return;
          var sid = st.uuid || st.id;
          var sName = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || sid).trim();
          var primaryGroup = (st.enrollments && st.enrollments[0] && st.enrollments[0].groupName) || st.adminClass || '';
          var subParts = ['Student'];
          if (primaryGroup) subParts.push(primaryGroup);
          addCandidate({
            urn: window.LinksService.makeUrn('student', sid),
            type: 'classes',
            badge: '[STUDENT]',
            title: sName,
            subtitle: subParts.join(' • ')
          });
        });
      }

      // 1e. Fallback: localStorage grade sheet state
      try {
        var rawLs = localStorage.getItem('gradeSheetHtmlState.v1');
        if (rawLs) {
          var parsedLs = JSON.parse(rawLs);
          if (parsedLs && Array.isArray(parsedLs.classes)) {
            parsedLs.classes.forEach(function(cls) {
              if (!cls) return;
              var sCount = cls.students ? cls.students.length : 0;
              var extra = [cls.year, cls.level].filter(Boolean).join(' • ');
              addCandidate({
                urn: window.LinksService.makeUrn('class', cls.id),
                type: 'classes',
                badge: '[CLASS]',
                title: cls.name || cls.id,
                subtitle: 'Class Group • ' + sCount + ' students' + (extra ? ' • ' + extra : '')
              });
              if (cls.students) addStudentsFromList(cls.students, cls.id, cls.name);
            });
          }
        }
      } catch (_) {}

      // 1f. Fallback: folders in user/grades (each subdirectory is a class)
      if (desktop && typeof desktop.listByPath === 'function') {
        try {
          var grDirRes = await desktop.listByPath('grades', '');
          var grEntries = Array.isArray(grDirRes) ? grDirRes : (grDirRes && Array.isArray(grDirRes.files) ? grDirRes.files : []);
          grEntries.forEach(function(entry) {
            if (entry && entry.isDirectory) {
              var cName = entry.name || entry.filename || entry.relativePath;
              if (cName && !cName.startsWith('.') && !cName.startsWith('_')) {
                addCandidate({
                  urn: window.LinksService.makeUrn('class', cName),
                  type: 'classes',
                  badge: '[CLASS]',
                  title: cName,
                  subtitle: 'Class Group (from Saved Grades)'
                });
              }
            }
          });
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Documents from docEditorDocs or doceditor
    try {
      // 2a. Desktop listByPath in docEditorDocs
      if (desktop && typeof desktop.listByPath === 'function') {
        try {
          var docRes = await desktop.listByPath('docEditorDocs', '', { extensions: ['.md', '.html', '.txt', '.typ', '.pdf'] });
          var docs = Array.isArray(docRes) ? docRes : (docRes && Array.isArray(docRes.files) ? docRes.files : []);
          docs.forEach(function(d) {
            if (d.isDirectory) return;
            var rp = d.relativePath || d.filename || d.name;
            if (!rp) return;
            var fn = d.filename || rp.split(/[\\/]/).pop() || rp;
            addCandidate({
              urn: window.LinksService.makeUrn('doc', 'docEditorDocs/' + rp.replace(/\\/g, '/')),
              type: 'docs',
              badge: '[DOC]',
              title: fn,
              subtitle: 'Document Editor • ' + rp
            });
          });
        } catch (_) {}
      }

      // 2b. Desktop listFiles in docEditorDocs
      if (desktop && typeof desktop.listFiles === 'function') {
        try {
          var docRes2 = await desktop.listFiles('docEditorDocs', { extensions: ['.md', '.html', '.txt', '.typ', '.pdf'] });
          var docs2 = Array.isArray(docRes2) ? docRes2 : (docRes2 && Array.isArray(docRes2.files) ? docRes2.files : []);
          docs2.forEach(function(d) {
            var fn = typeof d === 'string' ? d : (d.filename || d.name);
            if (!fn) return;
            addCandidate({
              urn: window.LinksService.makeUrn('doc', 'docEditorDocs/' + fn),
              type: 'docs',
              badge: '[DOC]',
              title: fn,
              subtitle: 'Document Editor • ' + fn
            });
          });
        } catch (_) {}
      }

      // 2c. Desktop listByPath in user/document-editor/docs or user/doceditor
      if (desktop && typeof desktop.listByPath === 'function') {
        try {
          var userDocRes = await desktop.listByPath('user', 'document-editor/docs', { extensions: ['.md', '.html', '.txt', '.typ', '.pdf'] });
          var uDocs = Array.isArray(userDocRes) ? userDocRes : (userDocRes && Array.isArray(userDocRes.files) ? userDocRes.files : []);
          uDocs.forEach(function(d) {
            if (d.isDirectory) return;
            var rp = d.relativePath || d.filename || d.name;
            if (!rp) return;
            var fn = d.filename || rp.split(/[\\/]/).pop() || rp;
            addCandidate({
              urn: window.LinksService.makeUrn('doc', 'docEditorDocs/' + rp.replace(/\\/g, '/')),
              type: 'docs',
              badge: '[DOC]',
              title: fn,
              subtitle: 'Document Editor • ' + rp
            });
          });
        } catch (_) {}

        try {
          var userDocRes2 = await desktop.listByPath('user', 'doceditor', { extensions: ['.md', '.html', '.txt', '.typ', '.pdf'] });
          var uDocs2 = Array.isArray(userDocRes2) ? userDocRes2 : (userDocRes2 && Array.isArray(userDocRes2.files) ? userDocRes2.files : []);
          uDocs2.forEach(function(d) {
            if (d.isDirectory) return;
            var rp = d.relativePath || d.filename || d.name;
            if (!rp) return;
            var fn = d.filename || rp.split(/[\\/]/).pop() || rp;
            addCandidate({
              urn: window.LinksService.makeUrn('doc', 'docEditorDocs/' + rp.replace(/\\/g, '/')),
              type: 'docs',
              badge: '[DOC]',
              title: fn,
              subtitle: 'Document Editor • ' + rp
            });
          });
        } catch (_) {}
      }
    } catch (_) {}

    // 3. Grade Sheet Items (Class Sheets & Evaluations)
    try {
      var gsClassesSource = (typeof window.GRADE_SHEET_CLASSES === 'function')
        ? window.GRADE_SHEET_CLASSES()
        : (window.appState && Array.isArray(window.appState.classes) ? window.appState.classes : null);

      if (!gsClassesSource) {
        try {
          var rawGs = localStorage.getItem('gradeSheetHtmlState.v1');
          if (rawGs) {
            var pGs = JSON.parse(rawGs);
            if (pGs && Array.isArray(pGs.classes)) gsClassesSource = pGs.classes;
          }
        } catch (_) {}
      }

      if (Array.isArray(gsClassesSource)) {
        gsClassesSource.forEach(function(cls) {
          if (!cls) return;
          var sCount = cls.students ? cls.students.length : 0;
          var extra = [cls.year, cls.level].filter(Boolean).join(' • ');

          // 3a. Class-level Grade Sheet
          addCandidate({
            urn: window.LinksService.makeUrn('gradesheet', cls.id),
            type: 'gradesheet',
            badge: '[GRADE SHEET]',
            title: (cls.name || cls.id) + ' — Grade Sheet',
            subtitle: 'Class Grade Sheet Overview • ' + sCount + ' students' + (extra ? ' • ' + extra : '')
          });

          // 3b. Test evaluations for this class
          ['sem1', 'sem2'].forEach(function(sem) {
            var semLabel = sem === 'sem1' ? 'Semester 1' : 'Semester 2';
            var configs = (cls.testConfigs && cls.testConfigs[sem]) || [];
            configs.forEach(function(cfg, i) {
              if (!cfg) return;
              var hasScore = cls.students && cls.students.some(function(s) {
                var tests = sem === 'sem1' ? s.sem1Tests : s.sem2Tests;
                return Array.isArray(tests) && tests[i] != null;
              });
              var hasCfg = cfg.testName || cfg.testDate || cfg.type || cfg.scope || (Array.isArray(cfg.criteria) && cfg.criteria.length > 0);
              if (!hasScore && !hasCfg && !cfg.testName) return;

              var tName = cfg.testName || ('Test ' + (i + 1));
              var urn = window.LinksService.makeUrn('eval', cls.id + ':' + sem + ':' + i);
              var subParts = [cls.name, semLabel];
              if (cfg.testDate) subParts.push(cfg.testDate);
              if (cfg.type) subParts.push(cfg.type);

              addCandidate({
                urn: urn,
                type: 'eval',
                badge: '[EVALUATION]',
                title: tName + ' (' + cls.name + ' • ' + (sem === 'sem1' ? 'Sem 1' : 'Sem 2') + ')',
                subtitle: 'Grade Sheet Evaluation • ' + subParts.join(' • ')
              });
            });
          });
        });
      }

      // 3c. Saved grade files in user/grades via Desktop
      if (desktop && typeof desktop.listByPath === 'function') {
        try {
          var gradeFilesRes = await desktop.listByPath('grades', '', { extensions: ['.js', '.json'] });
          var gFiles = Array.isArray(gradeFilesRes) ? gradeFilesRes : (gradeFilesRes && Array.isArray(gradeFilesRes.files) ? gradeFilesRes.files : []);
          gFiles.forEach(function(f) {
            if (f.isDirectory) return;
            var rp = f.relativePath || f.filename || '';
            var parts = rp.split(/[\\/]/);
            if (parts.length >= 2) {
              var classFolder = parts[0];
              var fname = parts[1];
              if (fname === '_class.js') {
                addCandidate({
                  urn: window.LinksService.makeUrn('gradesheet', classFolder),
                  type: 'gradesheet',
                  badge: '[GRADE SHEET]',
                  title: classFolder + ' Grade Sheet',
                  subtitle: 'Saved Grade Sheet • user/grades/' + rp
                });
              } else if (fname.startsWith('sem1-test-') || fname.startsWith('sem2-test-')) {
                var sem = fname.startsWith('sem1') ? 'sem1' : 'sem2';
                var idxMatch = fname.match(/test-(\d+)/);
                var idx = idxMatch ? (parseInt(idxMatch[1], 10) - 1) : 0;
                addCandidate({
                  urn: window.LinksService.makeUrn('eval', classFolder + ':' + sem + ':' + idx),
                  type: 'eval',
                  badge: '[EVALUATION]',
                  title: fname.replace(/\.js$/, '') + ' (' + classFolder + ')',
                  subtitle: 'Saved Evaluation File • user/grades/' + rp
                });
              }
            }
          });
        } catch (_) {}
      }
    } catch (_) {}

    // 4. Competences
    if (typeof window.CompetenceAggregatorService !== 'undefined') {
      try {
        var comps = await window.CompetenceAggregatorService.loadAllCompetences();
        if (Array.isArray(comps)) {
          comps.forEach(function(c) {
            addCandidate({
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
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var compFiles = await desktop.listFiles('customCompetences', { extensions: ['.json', '.js'] });
        var cfList = Array.isArray(compFiles) ? compFiles : (compFiles && Array.isArray(compFiles.files) ? compFiles.files : []);
        cfList.forEach(function(cf) {
          var fn = typeof cf === 'string' ? cf : (cf.filename || cf.name);
          if (!fn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('competence', fn),
            type: 'competences',
            badge: '[COMPETENCE]',
            title: fn.replace(/\.(json|js)$/, ''),
            subtitle: 'Competence Standards Bank • ' + fn
          });
        });
      } catch (_) {}
    }

    // 5. Criteria Banks
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var critRes = await desktop.listFiles('customCriteria', { extensions: ['.js', '.json'] });
        var crits = Array.isArray(critRes) ? critRes : (critRes && Array.isArray(critRes.files) ? critRes.files : []);
        crits.forEach(function(c) {
          var fn = typeof c === 'string' ? c : (c.filename || c.name);
          if (!fn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('criteria', fn),
            type: 'criteria',
            badge: '[CRITERIA]',
            title: fn.replace(/\.(js|json)$/, ''),
            subtitle: 'Criteria Rubric Bank • ' + fn
          });
        });
      } catch (_) {}
    }
    try {
      var rawGsData = localStorage.getItem('gradeSheetHtmlState.v1');
      if (rawGsData) {
        var pGsState = JSON.parse(rawGsData);
        if (pGsState && pGsState.criteriaPresets && typeof pGsState.criteriaPresets === 'object') {
          Object.keys(pGsState.criteriaPresets).forEach(function(name) {
            addCandidate({
              urn: window.LinksService.makeUrn('criteria', name + '.json'),
              type: 'criteria',
              badge: '[CRITERIA]',
              title: name,
              subtitle: 'Criteria Rubric Preset (Grade Sheet)'
            });
          });
        }
      }
    } catch (_) {}

    // 5b. Grading Scale Models
    var builtInScales = [
      { key: 'swiss6', title: 'Swiss 1–6 Scale (Pass 4.0)', subtitle: 'Standard Swiss 1–6 scale' },
      { key: 'french20', title: 'French 0–20 Scale (Pass 10)', subtitle: 'Standard French 0–20 scale' },
      { key: 'percent100', title: 'Percentage 0–100%', subtitle: 'Linear percentage scale' },
      { key: 'letterAF', title: 'Letter Grades A–F', subtitle: 'US / International Letter Scale' },
      { key: 'german16', title: 'German 1–6 Scale', subtitle: 'Standard German 1–6 scale' }
    ];
    builtInScales.forEach(function(sc) {
      addCandidate({
        urn: window.LinksService.makeUrn('scale', sc.key),
        type: 'scales',
        badge: '[SCALE]',
        title: sc.title,
        subtitle: sc.subtitle
      });
    });
    if (typeof window !== 'undefined' && Array.isArray(window.XLSM_SCALE_MODELS)) {
      window.XLSM_SCALE_MODELS.forEach(function(m) {
        if (!m || !m.key) return;
        addCandidate({
          urn: window.LinksService.makeUrn('scale', m.key),
          type: 'scales',
          badge: '[SCALE]',
          title: m.label || m.key,
          subtitle: 'Grading Scale Model • ' + (m.minGrade || 1) + '–' + (m.maxGrade || 6)
        });
      });
    }
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var scaleRes = await desktop.listFiles('customScales', { extensions: ['.js', '.json'] });
        var sFiles = Array.isArray(scaleRes) ? scaleRes : (scaleRes && Array.isArray(scaleRes.files) ? scaleRes.files : []);
        sFiles.forEach(function(s) {
          var sfn = typeof s === 'string' ? s : (s.filename || s.name);
          if (!sfn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('scale', sfn),
            type: 'scales',
            badge: '[SCALE]',
            title: sfn.replace(/\.(js|json)$/, ''),
            subtitle: 'Scale Model Bank • ' + sfn
          });
        });
      } catch (_) {}
    }

    // 6. Tests (from Test Creator files, localStorage, and Grade Sheet)
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var testRes = await desktop.listFiles('tests', { extensions: ['.json', '.js'] });
        var tests = Array.isArray(testRes) ? testRes : (testRes && Array.isArray(testRes.files) ? testRes.files : []);
        for (var ti = 0; ti < tests.length; ti++) {
          var tEntry = tests[ti];
          var tFn = typeof tEntry === 'string' ? tEntry : (tEntry.filename || tEntry.name);
          if (!tFn) continue;
          var tTitle = tFn.replace(/^test_/, '').replace(/\.json$/, '').replace(/_[a-f0-9]{8,}$/, '').replace(/_/g, ' ');
          if (desktop && typeof desktop.readJson === 'function') {
            try {
              var rj = await desktop.readJson('tests', tFn);
              if (rj && (rj.title || (rj.data && rj.data.title))) {
                tTitle = rj.title || rj.data.title;
              }
            } catch (_) {}
          }
          addCandidate({
            urn: window.LinksService.makeUrn('test', tFn),
            type: 'tests',
            badge: '[TEST]',
            title: tTitle,
            subtitle: 'Test Creator • ' + tFn
          });
        }
      } catch (_) {}
    }
    try {
      var rawTests = localStorage.getItem('cmt_tests');
      if (rawTests) {
        var parsedTests = JSON.parse(rawTests);
        if (Array.isArray(parsedTests)) {
          parsedTests.forEach(function(t) {
            if (!t) return;
            var tId = t.id || t._filename || t.title;
            if (!tId) return;
            var fn = t._filename || (t.id ? (t.id + '.json') : tId);
            addCandidate({
              urn: window.LinksService.makeUrn('test', fn),
              type: 'tests',
              badge: '[TEST]',
              title: t.title || fn.replace(/^test_/, '').replace(/\.json$/, '').replace(/_/g, ' '),
              subtitle: 'Test Creator • ' + (t.subject || t.classId || 'Test') + (t.totalPoints ? ' • ' + t.totalPoints + ' pts' : '')
            });
          });
        }
      }
    } catch (_) {}

    // 7. Board Mindmaps
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var mmFiles = await desktop.listFiles('mindmaps', { extensions: ['.json', '.js', '.cstz'] });
        var mfList = Array.isArray(mmFiles) ? mmFiles : (mmFiles && Array.isArray(mmFiles.files) ? mmFiles.files : []);
        mfList.forEach(function(mf) {
          var fn = typeof mf === 'string' ? mf : (mf.filename || mf.name);
          if (!fn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('board', fn),
            type: 'board',
            badge: '[BOARD]',
            title: fn.replace(/\.(json|js|cstz)$/, ''),
            subtitle: 'Board Mindmap Session • ' + fn
          });
        });
      } catch (_) {}
    }
    var curBoardFileName = (typeof _conCurrentFileName !== 'undefined' && _conCurrentFileName) ? _conCurrentFileName : 'untitled.js';

    // 7a. Active Board Word Nodes
    if (typeof window.conGetNodes === 'function') {
      try {
        var activeNodes = window.conGetNodes();
        if (Array.isArray(activeNodes)) {
          activeNodes.forEach(function(bn) {
            if (!bn || !bn.id) return;
            var wText = bn.baseWord || (bn.el && bn.el.dataset && bn.el.dataset.baseWord) || (bn.el && bn.el.textContent) || bn.id;
            var nUrn = (typeof window.conGetActiveNodeUrn === 'function')
              ? window.conGetActiveNodeUrn(bn)
              : ('cmt:board-node:' + encodeURIComponent(curBoardFileName) + ':' + encodeURIComponent(bn.id));
            addCandidate({
              urn: nUrn,
              type: 'board',
              badge: '[BOARD NODE]',
              title: wText,
              subtitle: 'Board Word Node • ' + bn.id + ' (' + curBoardFileName.replace(/\.(json|js|cstz)$/, '') + ')'
            });
          });
        }
      } catch (_) {}
    }

    // 7b. Active Board Sticky Notes
    if (typeof window.conGetNotes === 'function') {
      try {
        var activeNotes = window.conGetNotes();
        if (Array.isArray(activeNotes)) {
          activeNotes.forEach(function(note) {
            if (!note || !note.id) return;
            var noteRaw = note.text || note.content || '';
            var noteTitle = noteRaw.split('\n')[0].replace(/^#+\s*/, '').trim() || ('Note ' + note.id);
            if (noteTitle.length > 40) noteTitle = noteTitle.slice(0, 37) + '...';
            var noteUrn = 'cmt:board-note:' + encodeURIComponent(curBoardFileName) + ':' + encodeURIComponent(note.id);
            addCandidate({
              urn: noteUrn,
              type: 'board',
              badge: '[BOARD NOTE]',
              title: noteTitle,
              subtitle: 'Board Sticky Note • ' + note.id + ' (' + curBoardFileName.replace(/\.(json|js|cstz)$/, '') + ')'
            });
          });
        }
      } catch (_) {}
    }

    // 7c. Active Board Mindmap Groups
    if (typeof window.conGetGroups === 'function') {
      try {
        var activeGroups = window.conGetGroups();
        if (Array.isArray(activeGroups)) {
          activeGroups.forEach(function(grp) {
            if (!grp || !grp.id) return;
            var grpTitle = grp.title || grp.name || ('Group ' + grp.id);
            var grpUrn = 'cmt:board-group:' + encodeURIComponent(curBoardFileName) + ':' + encodeURIComponent(grp.id);
            addCandidate({
              urn: grpUrn,
              type: 'board',
              badge: '[BOARD GROUP]',
              title: grpTitle,
              subtitle: 'Board Mindmap Group • ' + grp.id + ' (' + curBoardFileName.replace(/\.(json|js|cstz)$/, '') + ')'
            });
          });
        }
      } catch (_) {}
    }

    // 7d. Active Board Shapes
    if (typeof window.conGetShapes === 'function') {
      try {
        var activeShapes = window.conGetShapes();
        if (Array.isArray(activeShapes)) {
          activeShapes.forEach(function(shp) {
            if (!shp || !shp.id) return;
            var shpType = shp.type ? (shp.type.charAt(0).toUpperCase() + shp.type.slice(1)) : 'Shape';
            var shpLabel = shp.label || shp.text || ('Shape ' + shp.id);
            var shpUrn = 'cmt:board-shape:' + encodeURIComponent(curBoardFileName) + ':' + encodeURIComponent(shp.id);
            addCandidate({
              urn: shpUrn,
              type: 'board',
              badge: '[BOARD SHAPE]',
              title: shpLabel,
              subtitle: 'Board ' + shpType + ' • ' + shp.id + ' (' + curBoardFileName.replace(/\.(json|js|cstz)$/, '') + ')'
            });
          });
        }
      } catch (_) {}
    }

    // 7b. Lesson Plans
    if (typeof window.plannerLessonPlansList !== 'undefined' && Array.isArray(window.plannerLessonPlansList)) {
      window.plannerLessonPlansList.forEach(function(lp) {
        if (!lp) return;
        var lpId = lp.id || (lp._filename ? lp._filename.replace(/\.json$/, '') : 'plan');
        addCandidate({
          urn: window.LinksService.makeUrn('lesson', lpId),
          type: 'lessons',
          badge: '[LESSON]',
          title: lp.title || lpId,
          subtitle: 'Lesson Plan • ' + (lp.date || '') + (lp.classId ? ' • ' + lp.classId : '')
        });
      });
    }
    if (desktop && typeof desktop.listByPath === 'function') {
      try {
        var lpRes = await desktop.listByPath('user', 'lessons', { extensions: ['.json'] });
        var lpFiles = Array.isArray(lpRes) ? lpRes : (lpRes && Array.isArray(lpRes.files) ? lpRes.files : []);
        for (var lpi = 0; lpi < lpFiles.length; lpi++) {
          var lf = lpFiles[lpi];
          var lfn = lf.filename || (lf.relativePath ? lf.relativePath.split(/[\\/]/).pop() : '');
          if (!lfn || !lfn.endsWith('.json')) continue;
          var lpTitle = lfn.replace(/^lp_/, '').replace(/\.json$/, '').replace(/_/g, ' ');
          var lpId = lfn.replace(/\.json$/, '');
          addCandidate({
            urn: window.LinksService.makeUrn('lesson', lpId),
            type: 'lessons',
            badge: '[LESSON]',
            title: lpTitle,
            subtitle: 'Lesson Plan • ' + lfn
          });
        }
      } catch (_) {}
    }

    // 7c. Planner Slots
    var foundPlannerEntries = [];
    if (typeof window.entries !== 'undefined' && Array.isArray(window.entries)) {
      foundPlannerEntries = foundPlannerEntries.concat(window.entries);
    }
    if (typeof window.PLANNER_ENTRIES_BY_CLASS !== 'undefined' && window.PLANNER_ENTRIES_BY_CLASS) {
      Object.values(window.PLANNER_ENTRIES_BY_CLASS).forEach(function(list) {
        if (Array.isArray(list)) foundPlannerEntries = foundPlannerEntries.concat(list);
      });
    }
    foundPlannerEntries.forEach(function(e) {
      if (!e || !e.id) return;
      var urn = window.LinksService.makeUrn('planner', e.id);
      var tLabel = e.topic || e.type || 'Lesson';
      var clsTxt = (typeof window.plannerClassDisplayName === 'function' ? window.plannerClassDisplayName(e.classId) : '') || e.classId || 'No Class';
      addCandidate({
        urn: urn,
        type: 'planner',
        badge: '[PLANNER]',
        title: tLabel + ' (' + clsTxt + ')',
        subtitle: 'Planner Slot • ' + (e.date || '') + (e.time ? ' ' + e.time : '') + ' • ' + (e.type || 'lesson')
      });
    });

    // 8. Registered Entities from links-registry.json
    try {
      var reg = await window.LinksService.loadRegistry();
      if (reg && reg.entities) {
        Object.keys(reg.entities).forEach(function(u) {
          var ent = reg.entities[u];
          if (ent && (ent.title || ent.label)) {
            var p = window.LinksService.parseUrn(u);
            var entType = ent.type || (p ? p.type : 'all');
            var badgeText = '[' + entType.toUpperCase() + ']';
            addCandidate({
              urn: u,
              type: entType,
              badge: badgeText,
              title: ent.title || ent.label,
              subtitle: ent.subtitle || u
            });
          }
        });
      }
    } catch (_) {}

    // 9. Vocabulary & Wordbanks
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var wbFiles = await desktop.listFiles('customWordbanks', { extensions: ['.js', '.json'] });
        var wbList = Array.isArray(wbFiles) ? wbFiles : (wbFiles && Array.isArray(wbFiles.files) ? wbFiles.files : []);
        wbList.forEach(function(wb) {
          var fn = typeof wb === 'string' ? wb : (wb.filename || wb.name);
          if (!fn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('wordbank', fn),
            type: 'wordbank',
            badge: '[WORDBANK]',
            title: fn.replace(/\.(js|json)$/, ''),
            subtitle: 'Vocabulary Wordbank • ' + fn
          });
        });
      } catch (_) {}
    }
    if (desktop && typeof desktop.listByPath === 'function') {
      try {
        var wbRes = await desktop.listByPath('user', 'custom-data/wordbanks', { extensions: ['.js', '.json'] });
        var wbfList = Array.isArray(wbRes) ? wbRes : (wbRes && Array.isArray(wbRes.files) ? wbRes.files : []);
        wbfList.forEach(function(wbf) {
          if (wbf.isDirectory) return;
          var wfn = wbf.filename || (wbf.relativePath ? wbf.relativePath.split(/[\\/]/).pop() : '');
          if (!wfn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('wordbank', wfn),
            type: 'wordbank',
            badge: '[WORDBANK]',
            title: wfn.replace(/\.(js|json)$/, ''),
            subtitle: 'Vocabulary Wordbank • ' + wfn
          });
        });
      } catch (_) {}
    }

    // 9b. Active Wordbank Records / Open Database records (if in manage-database.html)
    if (typeof window.mdbGetActiveCandidates === 'function') {
      try {
        var mdbCands = window.mdbGetActiveCandidates();
        if (Array.isArray(mdbCands)) {
          mdbCands.forEach(function(c) {
            addCandidate(c);
          });
        }
      } catch (_) {}
    }

    // 9c. Board custom words (if in board.html)
    if (typeof window.awGetCustomWords === 'function') {
      try {
        var cWords = window.awGetCustomWords();
        if (Array.isArray(cWords)) {
          cWords.forEach(function(cw) {
            var w = typeof cw === 'string' ? cw : (cw && (cw.word || cw.term));
            if (!w) return;
            addCandidate({
              urn: window.LinksService.makeUrn('wordbank', encodeURIComponent(String(w).toLowerCase())),
              type: 'wordbank',
              badge: '[WORD]',
              title: String(w),
              subtitle: 'Custom Wordbank Entry'
            });
          });
        }
      } catch (_) {}
    }

    // 10. Document Templates & Custom Data Files
    if (desktop && typeof desktop.listFiles === 'function') {
      try {
        var tplFiles = await desktop.listFiles('docEditorTemplates', { extensions: ['.md', '.html', '.typ'] });
        var tplList = Array.isArray(tplFiles) ? tplFiles : (tplFiles && Array.isArray(tplFiles.files) ? tplFiles.files : []);
        tplList.forEach(function(tf) {
          var tfn = typeof tf === 'string' ? tf : (tf.filename || tf.name);
          if (!tfn) return;
          addCandidate({
            urn: window.LinksService.makeUrn('doc', 'docEditorTemplates/' + tfn),
            type: 'docs',
            badge: '[TEMPLATE]',
            title: tfn,
            subtitle: 'Document Template • ' + tfn
          });
        });
      } catch (_) {}
    }
    if (desktop && typeof desktop.listByPath === 'function') {
      try {
        var cdRes = await desktop.listByPath('user', 'custom-data', { extensions: ['.md', '.html', '.pdf', '.txt'], recursive: true });
        var cdList = Array.isArray(cdRes) ? cdRes : (cdRes && Array.isArray(cdRes.files) ? cdRes.files : []);
        cdList.forEach(function(cdf) {
          if (cdf.isDirectory) return;
          var rp = cdf.relativePath || cdf.filename || cdf.name;
          if (!rp) return;
          var fn = cdf.filename || rp.split(/[\\/]/).pop() || rp;
          addCandidate({
            urn: window.LinksService.makeUrn('doc', 'user/custom-data/' + rp.replace(/\\/g, '/')),
            type: 'docs',
            badge: '[FILE]',
            title: fn,
            subtitle: 'Custom Data File • ' + rp
          });
        });
      } catch (_) {}
    }

    // 11. Additional Databases (Quotes, Dictations, Grammar, Gapfill, Errors, Sentences, Stories, Quizzes, Exercises, Phases, Chips)
    var dbTargets = [
      { target: 'customQuotes', type: 'quotebank', badge: '[QUOTE]', label: 'Quotes Bank' },
      { target: 'customDictations', type: 'dictation', badge: '[DICTATION]', label: 'Dictations Bank' },
      { target: 'customGrammarbanks', type: 'grammarbank', badge: '[GRAMMAR]', label: 'Grammar Bank' },
      { target: 'customGapfillbanks', type: 'gapfillbank', badge: '[GAP-FILL]', label: 'Gap-Fill Bank' },
      { target: 'customErrorbanks', type: 'errorbank', badge: '[ERROR BANK]', label: 'Error Correction Bank' },
      { target: 'customSentences', type: 'sentencebank', badge: '[SENTENCE]', label: 'Sentences Bank' },
      { target: 'customStorybanks', type: 'storybank', badge: '[STORY]', label: 'Stories Bank' },
      { target: 'customQuizzes', type: 'quiz', badge: '[QUIZ]', label: 'Quiz Bank' },
      { target: 'customExercises', type: 'testbank', badge: '[TEST BANK]', label: 'Exercises Bank' },
      { target: 'customPhases', type: 'phase', badge: '[PHASE]', label: 'Lesson Phases Bank' },
      { target: 'customChips', type: 'chip', badge: '[CHIP]', label: 'Observation Chips' }
    ];

    for (var dbi = 0; dbi < dbTargets.length; dbi++) {
      var dbt = dbTargets[dbi];
      if (desktop && typeof desktop.listFiles === 'function') {
        try {
          var dbFiles = await desktop.listFiles(dbt.target, { extensions: ['.js', '.json'] });
          var dbList = Array.isArray(dbFiles) ? dbFiles : (dbFiles && Array.isArray(dbFiles.files) ? dbFiles.files : []);
          dbList.forEach(function(f) {
            var fn = typeof f === 'string' ? f : (f.filename || f.name);
            if (!fn) return;
            addCandidate({
              urn: window.LinksService.makeUrn(dbt.type, fn),
              type: 'databases',
              badge: dbt.badge,
              title: fn.replace(/\.(js|json)$/, ''),
              subtitle: dbt.label + ' • ' + fn
            });
          });
        } catch (_) {}
      }
    }

    renderCandidates();
  }

  function switchToAllCategories() {
    _activeCategory = 'all';
    var tabs = document.querySelectorAll('#cmt-lm-category-tabs .cmt-lm-tab-btn');
    tabs.forEach(function(b) {
      if ((b.getAttribute('data-cat') || 'all') === 'all') {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    _candidatePageOffset = _candidatePageSize;
    renderCandidates();
  }

  function buildCandidateRow(item) {
    var row = document.createElement('div');
    row.className = 'cmt-lm-candidate-row';
    var cItemUrn = window.LinksService ? window.LinksService.canonicalizeUrn(item.urn) : item.urn;
    var isAlreadyLinked = _currentLinkedUrns && _currentLinkedUrns.has(cItemUrn);

    // Resolve student title if it is a raw UUID
    var displayTitle = item.title;
    if (item.type === 'classes' || item.type === 'student' || (item.urn && item.urn.includes(':student:'))) {
      if (/^st-[a-z0-9_-]+$/i.test(displayTitle) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(displayTitle)) {
        if (window.LinksService && typeof window.LinksService.resolveStudentName === 'function') {
          var resolvedSt = window.LinksService.resolveStudentName(displayTitle);
          if (resolvedSt) displayTitle = resolvedSt;
        }
        if ((displayTitle === item.title) && typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER)) {
          var foundSt = window.STUDENTS_ROSTER.find(function(r) { return r && (r.uuid === item.title || r.id === item.title); });
          if (foundSt) {
            displayTitle = ([foundSt.firstName, foundSt.lastName].filter(Boolean).join(' ') || foundSt.customName || foundSt.name || '').trim();
          }
        }
      }
    }

    var iconSrc = getLinksIconPath();
    row.innerHTML =
      '<div class="cmt-lm-link-info">' +
        '<div class="cmt-lm-link-title-line">' +
          (isAlreadyLinked ? '<img src="' + iconSrc + '" class="cmt-lm-ref-icon" alt="" />' : '') +
          '<span class="cmt-lm-badge">' + item.badge + '</span>' +
          '<span class="cmt-lm-link-title">' + displayTitle + '</span>' +
        '</div>' +
        '<span class="cmt-lm-link-sub">' + item.subtitle + '</span>' +
      '</div>' +
      (isAlreadyLinked
        ? '<button type="button" class="cmt-lm-btn" disabled style="opacity:0.6;cursor:default;"><img src="' + iconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;" />[CONNECTED]</button>'
        : '<button type="button" class="cmt-lm-btn primary cmt-lm-btn-connect"><img src="' + iconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;" />[CONNECT]</button>');

    if (!isAlreadyLinked) {
      var connBtn = row.querySelector('.cmt-lm-btn-connect');
      if (connBtn) {
        connBtn.addEventListener('click', async function() {
          connBtn.disabled = true;
          connBtn.textContent = '...';
          var pOpt = window.LinksService ? window.LinksService.parseUrn(_currentOpts.urn) : null;
          await window.LinksService.addLink(_currentOpts.urn, item.urn, {
            sourceMeta: {
              title: _currentOpts.title || _currentOpts.label || _currentOpts.urn,
              subtitle: _currentOpts.subtitle || _currentOpts.sub || '',
              type: _currentOpts.type || (pOpt ? pOpt.type : 'general')
            },
            targetMeta: {
              title: displayTitle,
              subtitle: item.subtitle,
              type: item.type
            }
          });
          await refreshModalData();
          renderCandidates();
          notifyUpdate();
        });
      }
    }
    return row;
  }

  function renderCandidates() {
    var container = document.getElementById('cmt-lm-candidates-container');
    if (!container) return;
    var searchInput = document.getElementById('cmt-lm-search-input');
    var rawQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var tokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    var cOptUrn = (window.LinksService && _currentOpts && _currentOpts.urn)
      ? window.LinksService.canonicalizeUrn(_currentOpts.urn)
      : (_currentOpts ? _currentOpts.urn : '');

    _currentFilteredCandidates = _cachedCandidates.filter(function(item) {
      var cItemUrn = window.LinksService ? window.LinksService.canonicalizeUrn(item.urn) : item.urn;
      if (cOptUrn && cItemUrn === cOptUrn) return false; // Don't link to self
      if (!matchesCategory(item.type, _activeCategory, item.urn)) return false;
      if (tokens.length) {
        var itemText = ((item.title || '') + ' ' + (item.subtitle || '') + ' ' + (item.badge || '') + ' ' + (item.urn || '')).toLowerCase();
        for (var ti = 0; ti < tokens.length; ti++) {
          if (!itemText.includes(tokens[ti])) return false;
        }
      }
      return true;
    });

    // Check count of matches across ALL categories if active category != 'all'
    var allCategoryMatchesCount = 0;
    if (_activeCategory !== 'all') {
      allCategoryMatchesCount = _cachedCandidates.filter(function(item) {
        var cItemUrn = window.LinksService ? window.LinksService.canonicalizeUrn(item.urn) : item.urn;
        if (cOptUrn && cItemUrn === cOptUrn) return false;
        if (tokens.length) {
          var itemText = ((item.title || '') + ' ' + (item.subtitle || '') + ' ' + (item.badge || '') + ' ' + (item.urn || '')).toLowerCase();
          for (var ti = 0; ti < tokens.length; ti++) {
            if (!itemText.includes(tokens[ti])) return false;
          }
        }
        return true;
      }).length;
    }

    // Update Status Bar
    var statusBar = document.getElementById('cmt-lm-search-status-bar');
    if (statusBar) {
      var statusHtml = '';
      var totalFiltered = _currentFilteredCandidates.length;
      var totalLoaded = _cachedCandidates.length;

      if (tokens.length) {
        statusHtml = '<span class="cmt-lm-status-text">FOUND ' + totalFiltered + ' MATCH' + (totalFiltered === 1 ? '' : 'ES') + ' IN [' + _activeCategory.toUpperCase() + ']</span>';
        if (_activeCategory !== 'all' && allCategoryMatchesCount > totalFiltered) {
          statusHtml += '<button type="button" class="cmt-lm-btn-switch-all" id="cmt-lm-btn-switch-all">[SEARCH ALL CATEGORIES (' + allCategoryMatchesCount + ' FOUND)]</button>';
        }
      } else {
        if (_activeCategory === 'all') {
          statusHtml = '<span class="cmt-lm-status-text">ALL ' + totalFiltered + ' ITEMS AVAILABLE</span>';
        } else {
          statusHtml = '<span class="cmt-lm-status-text">' + totalFiltered + ' ITEMS IN [' + _activeCategory.toUpperCase() + '] (' + totalLoaded + ' TOTAL)</span>';
        }
      }
      statusBar.innerHTML = statusHtml;
      statusBar.style.display = 'flex';

      var switchAllBtn = statusBar.querySelector('#cmt-lm-btn-switch-all');
      if (switchAllBtn) {
        switchAllBtn.addEventListener('click', function() {
          switchToAllCategories();
        });
      }
    }

    container.innerHTML = '';
    if (!_currentFilteredCandidates.length) {
      var emptyMsg = tokens.length
        ? 'No items match your search in [' + _activeCategory.toUpperCase() + '].'
        : 'No items found in [' + _activeCategory.toUpperCase() + '].';

      if (_activeCategory !== 'all' && allCategoryMatchesCount > 0) {
        emptyMsg += '<br><br><button type="button" class="cmt-lm-btn primary" id="cmt-lm-empty-switch-all">[SEARCH ALL CATEGORIES (' + allCategoryMatchesCount + ' MATCH' + (allCategoryMatchesCount === 1 ? '' : 'ES') + ')]</button>';
      }
      container.innerHTML = '<div class="cmt-lm-empty">' + emptyMsg + '</div>';

      var emptySwitchBtn = container.querySelector('#cmt-lm-empty-switch-all');
      if (emptySwitchBtn) {
        emptySwitchBtn.addEventListener('click', function() {
          switchToAllCategories();
        });
      }
      return;
    }

    var prevScroll = container.scrollTop;
    var renderedSlice = _currentFilteredCandidates.slice(0, _candidatePageOffset);
    renderedSlice.forEach(function(item) {
      container.appendChild(buildCandidateRow(item));
    });

    if (_currentFilteredCandidates.length > _candidatePageOffset) {
      var loadMoreRow = document.createElement('div');
      loadMoreRow.className = 'cmt-lm-load-more-row';
      loadMoreRow.innerHTML =
        '<span class="cmt-lm-load-info">Showing ' + renderedSlice.length + ' of ' + _currentFilteredCandidates.length + ' items</span>' +
        '<div class="cmt-lm-load-btns">' +
          '<button type="button" class="cmt-lm-btn" id="cmt-lm-btn-load-more">[LOAD MORE (+' + _candidatePageSize + ')]</button>' +
          '<button type="button" class="cmt-lm-btn primary" id="cmt-lm-btn-show-all">[SHOW ALL (' + _currentFilteredCandidates.length + ')]</button>' +
        '</div>';

      var btnLoadMore = loadMoreRow.querySelector('#cmt-lm-btn-load-more');
      if (btnLoadMore) {
        btnLoadMore.addEventListener('click', function() {
          _candidatePageOffset += _candidatePageSize;
          renderCandidates();
        });
      }
      var btnShowAll = loadMoreRow.querySelector('#cmt-lm-btn-show-all');
      if (btnShowAll) {
        btnShowAll.addEventListener('click', function() {
          _candidatePageOffset = _currentFilteredCandidates.length;
          renderCandidates();
        });
      }
      container.appendChild(loadMoreRow);
    }

    if (prevScroll > 0) {
      container.scrollTop = prevScroll;
    }

    // Attach infinite scroll
    container.onscroll = function() {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 30) {
        if (_candidatePageOffset < _currentFilteredCandidates.length) {
          _candidatePageOffset += _candidatePageSize;
          renderCandidates();
        }
      }
    };
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
    closePreview: closePreview,
    getIconPath: getLinksIconPath,
    renderBadgeHtml: function(linksCount, tagsCount) {
      var icon = getLinksIconPath();
      var tagPart = tagsCount ? (' | TAGS: ' + tagsCount) : '';
      return '<img src="' + icon + '" class="btn-icon" alt="" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" /> [LINKS: ' + (linksCount || 0) + tagPart + ']';
    }
  };
});
