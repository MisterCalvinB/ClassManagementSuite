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
  var _candidatePageOffset = 10000;
  var _candidatePageSize = 1000;
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
          '<div style="display:flex;align-items:center;gap:6px;margin-left:auto;"><button type="button" class="cmt-lm-btn primary" id="cmt-lm-btn-student-dossier" style="display:none;"><img src="' + iconSrc + '" class="btn-icon" alt="" />[360° DOSSIER]</button><button type="button" class="cmt-lm-close-btn" id="cmt-lm-btn-close">[CLOSE]</button></div>' +
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
              '<button type="button" class="cmt-lm-tab-btn" data-cat="dossier">[360° DOSSIER]</button>' +
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
    _candidatePageOffset = _candidatePageSize;
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

    var dossierBtn = document.getElementById('cmt-lm-btn-student-dossier');
    if (dossierBtn) {
      if (p && p.type === 'student') {
        dossierBtn.style.display = 'inline-flex';
        dossierBtn.onclick = function() {
          openStudentDossier(p.id, opts);
        };
      } else {
        dossierBtn.style.display = 'none';
      }
    }

    overlay.classList.add('open');
    if (document.body) document.body.classList.add('cmt-modal-open');

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
    if (document.body) document.body.classList.remove('cmt-modal-open');
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
        linksContainer.innerHTML = '<div class="cmt-lm-empty">' + t('lmNoLinks', 'No connected items yet. Choose an item below to connect.') + '</div>';
      } else {
        var groupsDef = [
          {
            id: 'docs',
            title: t('lmGroupDocs', 'DOCUMENTS'),
            match: function(mt, rt) {
              return mt === 'doc' || mt === 'docs' || mt === 'document' || mt === 'doc_section' ||
                     rt === 'doc' || rt === 'docs' || rt === 'document' || rt === 'doc_section';
            }
          },
          {
            id: 'classes',
            title: t('lmGroupClasses', 'CLASSES & STUDENTS'),
            match: function(mt, rt) {
              return mt === 'class' || mt === 'classes' || mt === 'student' || mt === 'students' || mt === 'level' || mt === 'yearlevel' ||
                     rt === 'class' || rt === 'classes' || rt === 'student' || rt === 'students' || rt === 'level' || rt === 'yearlevel';
            }
          },
          {
            id: 'lessons',
            title: t('lmGroupLessons', 'LESSONS & PLANNER'),
            match: function(mt, rt) {
              return mt === 'lesson' || mt === 'lessons' || mt === 'planner' || mt === 'slot' || mt === 'lessonplan' ||
                     rt === 'lesson' || rt === 'lessons' || rt === 'planner' || rt === 'slot' || rt === 'lessonplan';
            }
          },
          {
            id: 'board',
            title: t('lmGroupBoard', 'BOARD MINDMAPS'),
            match: function(mt, rt) {
              return mt === 'board' || mt === 'mindmap' || mt === 'mindmaps' || mt.startsWith('board-') || mt.startsWith('board_') ||
                     rt === 'board' || rt === 'mindmap' || rt === 'mindmaps' || rt.startsWith('board-') || rt.startsWith('board_');
            }
          },
          {
            id: 'gradesheet',
            title: t('lmGroupGradesheet', 'GRADE SHEETS & EVALUATIONS'),
            match: function(mt, rt) {
              return mt === 'gradesheet' || mt === 'eval' || mt === 'evaluation' || mt === 'submission' || mt === 'grade' || mt === 'grade_cell' ||
                     rt === 'gradesheet' || rt === 'eval' || rt === 'evaluation' || rt === 'submission' || rt === 'grade' || rt === 'grade_cell';
            }
          },
          {
            id: 'competences',
            title: t('lmGroupCompetences', 'CURRICULUM & RUBRICS'),
            match: function(mt, rt) {
              return mt === 'competence' || mt === 'competences' || mt === 'criteria' || mt === 'criterion' || mt === 'scale' || mt === 'scales' ||
                     rt === 'competence' || rt === 'competences' || rt === 'criteria' || rt === 'criterion' || rt === 'scale' || rt === 'scales';
            }
          },
          {
            id: 'databases',
            title: t('lmGroupDatabases', 'DATABASES & QUESTION BANKS'),
            match: function(mt, rt) {
              return mt === 'databases' || mt === 'database' || mt === 'wordbank' || mt === 'word' || mt === 'vocab' ||
                     mt === 'quotebank' || mt === 'quote' || mt === 'dictation' || mt === 'grammarbank' || mt === 'grammar' ||
                     mt === 'gapfillbank' || mt === 'gapfill' || mt === 'errorbank' || mt === 'error' || mt === 'sentencebank' ||
                     mt === 'sentence' || mt === 'storybank' || mt === 'story' || mt === 'quiz' || mt === 'testbank' ||
                     mt === 'exercise' || mt === 'phase' || mt === 'chip' ||
                     rt === 'databases' || rt === 'database' || rt === 'wordbank' || rt === 'word' || rt === 'vocab' ||
                     rt === 'quotebank' || rt === 'quote' || rt === 'dictation' || rt === 'grammarbank' || rt === 'grammar' ||
                     rt === 'gapfillbank' || rt === 'gapfill' || rt === 'errorbank' || rt === 'error' || rt === 'sentencebank' ||
                     rt === 'sentence' || rt === 'storybank' || rt === 'story' || rt === 'quiz' || rt === 'testbank' ||
                     rt === 'exercise' || rt === 'phase' || rt === 'chip';
            }
          },
          {
            id: 'files',
            title: t('lmGroupFiles', 'FILES & ATTACHMENTS'),
            match: function(mt, rt) {
              return mt === 'file' || mt === 'attachment' || rt === 'file' || rt === 'attachment';
            }
          },
          {
            id: 'other',
            title: t('lmGroupOther', 'OTHER LINKS'),
            match: function() { return true; }
          }
        ];

        var allItems = [];
        context.direct.forEach(function(link) {
          allItems.push(resolveLinkItem(link, false));
        });
        context.inherited.forEach(function(link) {
          allItems.push(resolveLinkItem(link, true));
        });

        var groupBuckets = groupsDef.map(function(g) {
          return { id: g.id, title: g.title, items: [] };
        });

        allItems.forEach(function(item) {
          for (var gi = 0; gi < groupsDef.length; gi++) {
            if (groupsDef[gi].match(item.metaType, item.rawType)) {
              groupBuckets[gi].items.push(item);
              break;
            }
          }
        });

        // Sort items within each bucket alphabetically by title
        groupBuckets.forEach(function(b) {
          b.items.sort(function(a, bItem) {
            return (a.title || '').localeCompare(bItem.title || '', undefined, { sensitivity: 'base', numeric: true });
          });
        });

        groupBuckets.forEach(function(b) {
          if (!b.items.length) return;
          var groupWrap = document.createElement('div');
          groupWrap.className = 'cmt-lm-type-group';

          var groupHdr = document.createElement('div');
          groupHdr.className = 'cmt-lm-type-group-hdr';
          groupHdr.innerHTML =
            '<span class="cmt-lm-type-group-title">' + b.title + '</span>' +
            '<span class="cmt-lm-type-group-count">' + b.items.length + '</span>';
          groupWrap.appendChild(groupHdr);

          var groupList = document.createElement('div');
          groupList.className = 'cmt-lm-type-group-items';
          b.items.forEach(function(item) {
            groupList.appendChild(createLinkRowFromResolved(item));
          });
          groupWrap.appendChild(groupList);

          linksContainer.appendChild(groupWrap);
        });
      }
    }
  }

  function resolveLinkItem(link, isInherited) {
    var p = window.LinksService ? window.LinksService.parseUrn(link.otherUrn) : null;
    var rawType = (p && p.type) ? p.type.toLowerCase() : 'unknown';
    var metaType = (link.targetMeta && link.targetMeta.type) ? String(link.targetMeta.type).toLowerCase() : '';
    var typeLabel = p ? p.type.toUpperCase() : 'LINK';
    var rawTitle = (link.targetMeta && link.targetMeta.title) || link.otherUrn;
    var title = rawTitle;
    var sub = (link.targetMeta && link.targetMeta.subtitle) || (link.meta && link.meta.label) || '';

    // Inferred / autonomous status
    var isInferred = !!(link.meta && link.meta.inferred) || link.relation === 'inferred_hierarchy';
    var cascadeType = (link.meta && link.meta.cascadeType) || '';

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
      } else if (p.type === 'level' || p.type === 'yearlevel') {
        title = (p.id || '').toUpperCase();
        if (!sub) sub = 'Academic Level';
      }
    }

    // Safety fallback: if title looks like a student UUID, attempt student lookup
    if (/^st-[a-z0-9_-]+$/i.test(title) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(title)) {
      if (window.LinksService && typeof window.LinksService.resolveStudentName === 'function') {
        var candidateStudentName = window.LinksService.resolveStudentName(title);
        if (candidateStudentName) title = candidateStudentName;
      }
    }

    return {
      link: link,
      isInherited: isInherited,
      isInferred: isInferred,
      cascadeType: cascadeType,
      parsed: p,
      rawType: rawType,
      metaType: metaType,
      typeLabel: typeLabel,
      title: title,
      sub: sub
    };
  }

  function createLinkRowFromResolved(item) {
    var link = item.link;
    var isInherited = item.isInherited;
    var isInferred = item.isInferred;
    var cascadeType = item.cascadeType;
    var p = item.parsed;
    var title = item.title;
    var sub = item.sub;
    var typeLabel = item.typeLabel;

    var row = document.createElement('div');
    row.className = 'cmt-lm-link-row' + (isInferred ? ' cmt-lm-link-inferred' : '');

    var badgeClass = 'cmt-lm-badge';
    var badgeText = '[' + typeLabel + ']';

    if (isInherited) {
      badgeClass = 'cmt-lm-badge inherited';
      badgeText = '[INHERITED: ' + (_currentOpts.classId || 'CLASS').toUpperCase() + ']';
    } else if (isInferred) {
      if (p && p.type === 'class') {
        badgeClass = 'cmt-lm-badge inferred-class';
        badgeText = t('lmBadgeAutoClass', '[AUTO: CLASS]');
      } else if (p && (p.type === 'level' || p.type === 'yearlevel')) {
        badgeClass = 'cmt-lm-badge inferred-level';
        badgeText = t('lmBadgeAutoLevel', '[AUTO: LEVEL]');
      } else if (p && (p.type === 'board' || p.type === 'doc' || p.type === 'lesson')) {
        badgeClass = 'cmt-lm-badge inferred-container';
        badgeText = t('lmBadgeAutoContainer', '[AUTO: CONTAINER]');
      } else {
        badgeClass = 'cmt-lm-badge inferred';
        badgeText = t('lmBadgeInferred', '[INFERRED]');
      }
    } else {
      badgeClass = 'cmt-lm-badge direct';
      badgeText = '[' + typeLabel + ']';
    }

    var iconSrc = getLinksIconPath();
      var dossierActionBtn = (p && p.type === 'student')
        ? '<button type="button" class="cmt-lm-btn" id="btn-dossier-link" style="background:#e2c96e;font-weight:800;" title="' + t('lmStudentDossier', '360° Academic Dossier') + '"><img src="' + iconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:3px;" />[360° DOSSIER]</button>'
        : '';

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
          dossierActionBtn +
          (isInferred ? '<button type="button" class="cmt-lm-btn" id="btn-promote" title="' + t('lmPromoteTitle', 'Convert to direct permanent link') + '">' + t('lmPromote', '[PROMOTE]') + '</button>' : '') +
          '<button type="button" class="cmt-lm-btn primary" id="btn-open-link">' + t('lmOpen', '[OPEN]') + '</button>' +
          (!isInherited ? '<button type="button" class="cmt-lm-btn danger" id="btn-unlink">' + t('lmUnlink', '[UNLINK]') + '</button>' : '') +
        '</div>';

      var dBtn = row.querySelector('#btn-dossier-link');
      if (dBtn && p) {
        dBtn.addEventListener('click', function() {
          openStudentDossier(p.id, { title: title });
        });
      }

    var promoteBtn = row.querySelector('#btn-promote');
    if (promoteBtn) {
      promoteBtn.addEventListener('click', async function() {
        promoteBtn.disabled = true;
        promoteBtn.textContent = '...';
        if (window.LinksService && typeof window.LinksService.promoteInferredLink === 'function') {
          await window.LinksService.promoteInferredLink(_currentOpts.urn, link.otherUrn);
        } else if (window.LinksService) {
          await window.LinksService.addLink(_currentOpts.urn, link.otherUrn, {
            relation: 'related',
            targetMeta: link.targetMeta || {}
          });
        }
        await refreshModalData();
        await renderCandidates();
        notifyUpdate();
      });
    }

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

  function createLinkRow(link, isInherited) {
    return createLinkRowFromResolved(resolveLinkItem(link, isInherited));
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
    if ((c === 'dossier' || c === 'dossiers' || c === 'student' || c === 'students') && (
      t === 'student' || t === 'students' || t === 'dossier' || t === 'dossiers' || t === 'student-360' || t === 'student_360' ||
      ut === 'student' || ut === 'dossier' || (itemUrn && (itemUrn.includes(':student:') || itemUrn.includes(':dossier:')))
    )) return true;
    if (c === 'classes' && (t === 'class' || t === 'classes' || t === 'student' || t === 'students' || t === 'level' || t === 'yearlevel' || ut === 'class' || ut === 'student' || ut === 'level' || ut === 'yearlevel')) return true;
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
    var candidateStudentId = '';
    if (item.urn && window.LinksService) {
      var pCand = window.LinksService.parseUrn(item.urn);
      if (pCand && pCand.type === 'student') candidateStudentId = pCand.id;
    }
    if (!candidateStudentId && (item.type === 'student' || item.type === 'classes') && item.id) {
      candidateStudentId = item.id;
    }
    var candDossierBtn = candidateStudentId
      ? '<button type="button" class="cmt-lm-btn" id="btn-cand-dossier" style="background:#e2c96e;font-weight:800;margin-right:4px;" title="' + t('lmStudentDossier', '360° Academic Dossier') + '"><img src="' + iconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:2px;" />[360° DOSSIER]</button>'
      : '';

    row.innerHTML =
      '<div class="cmt-lm-link-info">' +
        '<div class="cmt-lm-link-title-line">' +
          (isAlreadyLinked ? '<img src="' + iconSrc + '" class="cmt-lm-ref-icon" alt="" />' : '') +
          '<span class="cmt-lm-badge">' + item.badge + '</span>' +
          '<span class="cmt-lm-link-title">' + displayTitle + '</span>' +
        '</div>' +
        '<span class="cmt-lm-link-sub">' + item.subtitle + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:4px;">' +
        candDossierBtn +
        (isAlreadyLinked
          ? '<button type="button" class="cmt-lm-btn" disabled style="opacity:0.6;cursor:default;"><img src="' + iconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;" />[CONNECTED]</button>'
          : '<button type="button" class="cmt-lm-btn primary cmt-lm-btn-connect"><img src="' + iconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;" />[CONNECT]</button>') +
      '</div>';

    var cdBtn = row.querySelector('#btn-cand-dossier');
    if (cdBtn && candidateStudentId) {
      cdBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openStudentDossier(candidateStudentId, { title: displayTitle });
      });
    }

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
    if (document.body) document.body.classList.add('cmt-modal-open');
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
    if (document.body) document.body.classList.remove('cmt-modal-open');
  }

  var _activeDossierUrn = null;
  var _currentDossierData = null;

  function ensureDossierDom() {
    if (document.getElementById('cmt-dossier-modal-overlay')) return;
    ensureStylesheet();

    var iconSrc = getLinksIconPath();
    var isSubPage = typeof window !== 'undefined' && window.location.pathname.includes('/pages/');
    var printIconSrc = (isSubPage ? '../' : '') + 'assets/icons/printer.svg';

    var overlay = document.createElement('div');
    overlay.id = 'cmt-dossier-modal-overlay';
    overlay.innerHTML =
      '<div class="cmt-dossier-card" id="cmt-dossier-card" role="dialog" aria-modal="true">' +
        '<div class="cmt-dossier-header">' +
          '<div class="cmt-dossier-title-group">' +
            '<div class="cmt-dossier-title-line">' +
              '<img src="' + iconSrc + '" class="cmt-lm-header-icon" alt="" />' +
              '<span class="cmt-lm-badge" style="background:#6abf8e;color:#111;">[360° ACADEMIC DOSSIER]</span>' +
              '<h3 class="cmt-dossier-name" id="cmt-dos-name">STUDENT DOSSIER</h3>' +
            '</div>' +
            '<p class="cmt-dossier-subtitle" id="cmt-dos-sub"></p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            '<button type="button" class="cmt-lm-btn primary" id="cmt-dos-btn-export-pdf" style="background:#5b8fcc;color:#fff;font-weight:800;" title="' + (t('lmDossierPdfExportBtn', '[EXPORT PDF]') || '[EXPORT PDF]') + '"><img src="' + printIconSrc + '" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;" />' + (t('lmDossierPdfExportBtn', '[EXPORT PDF]') || '[EXPORT PDF]') + '</button>' +
            '<button type="button" class="cmt-lm-btn" id="cmt-dos-btn-toggle-all">[COLLAPSE ALL]</button>' +
            '<button type="button" class="cmt-lm-btn" id="cmt-dos-btn-maximize">[MAXIMIZE]</button>' +
            '<button type="button" class="cmt-lm-btn" id="cmt-dos-btn-open-links">[MANAGE LINKS & TAGS]</button>' +
            '<button type="button" class="cmt-lm-close-btn" id="cmt-dos-btn-close">[CLOSE]</button>' +
          '</div>' +
        '</div>' +
        '<div class="cmt-dossier-body" id="cmt-dos-body">' +
          '<div class="cmt-lm-empty">Loading academic dossier...</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('cmt-dos-btn-close').addEventListener('click', closeStudentDossier);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeStudentDossier();
    });

    document.getElementById('cmt-dos-btn-export-pdf').addEventListener('click', function() {
      if (_currentDossierData) {
        openDossierPdfExportModal(_currentDossierData);
      }
    });

    document.getElementById('cmt-dos-btn-maximize').addEventListener('click', function() {
      var card = document.getElementById('cmt-dossier-card');
      if (!card) return;
      var isMax = card.classList.toggle('maximized');
      this.textContent = isMax ? '[RESTORE]' : '[MAXIMIZE]';
    });

    document.getElementById('cmt-dos-btn-toggle-all').addEventListener('click', function() {
      var secs = document.querySelectorAll('#cmt-dos-body .cmt-dossier-sec');
      if (!secs.length) return;
      var anyOpen = Array.from(secs).some(function(s) { return !s.classList.contains('collapsed'); });
      secs.forEach(function(s) {
        if (anyOpen) s.classList.add('collapsed');
        else s.classList.remove('collapsed');
      });
      this.textContent = anyOpen ? ('[' + (t('lmExpandAll', 'EXPAND ALL') || 'EXPAND ALL').toUpperCase() + ']') : ('[' + (t('lmCollapseAll', 'COLLAPSE ALL') || 'COLLAPSE ALL').toUpperCase() + ']');
    });

    document.getElementById('cmt-dos-btn-open-links').addEventListener('click', function() {
      var sUrn = _activeDossierUrn;
      closeStudentDossier();
      if (sUrn) {
        open({ urn: sUrn });
      }
    });
  }

  // ── Dossier PDF & HTML Export Subsystem ──────────────────────────────────────

  var _dossierMindmapCache = {};
  var _dossierPreviewTimer = null;
  var _activeExportDossier = null;
  var _dossierPreviewZoom = 1.0;

  async function loadBoardMindmapData(boardUrnOrPath) {
    if (!boardUrnOrPath) return null;
    var rel = String(boardUrnOrPath).replace(/^cmt:board:/, '').replace(/^user\/mindmaps\//, '');
    if (_dossierMindmapCache[rel]) return _dossierMindmapCache[rel];

    if (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) {
      var isArchive = rel.endsWith('.cstz') || rel.endsWith('.zip');
      try {
        if (isArchive && typeof window.Desktop.readBoardArchive === 'function') {
          var res = await window.Desktop.readBoardArchive('mindmaps', rel);
          if (res && res.ok && res.boardData) {
            _dossierMindmapCache[rel] = res.boardData;
            return res.boardData;
          }
        } else {
          var rText = await window.Desktop.readText('mindmaps', rel);
          if (rText && rText.ok && rText.content) {
            var data = typeof rText.content === 'string' ? JSON.parse(rText.content) : rText.content;
            _dossierMindmapCache[rel] = data;
            return data;
          }
        }
      } catch (err) {
        console.warn('loadBoardMindmapData error:', err);
      }
    }
    return null;
  }

  function renderMindmapSessionToSvg(boardData, opts) {
    opts = opts || {};
    if (!boardData) return '';
    var nodes = Array.isArray(boardData.nodes) ? boardData.nodes : [];
    var edges = Array.isArray(boardData.edges) ? boardData.edges : (Array.isArray(boardData.links) ? boardData.links : []);
    var groups = Array.isArray(boardData.groups) ? boardData.groups : [];
    var notes = Array.isArray(boardData.notes) ? boardData.notes : [];
    var shapes = Array.isArray(boardData.shapes) ? boardData.shapes : [];

    if (!nodes.length && !groups.length && !notes.length && !shapes.length) {
      return '<div class="pdf-mindmap-empty" style="padding:10px;font-size:8pt;color:#666;font-style:italic;">Empty mindmap session</div>';
    }

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    function expand(x, y, w, h) {
      x = Number(x) || 0;
      y = Number(y) || 0;
      w = Number(w) || 140;
      h = Number(h) || 60;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }

    nodes.forEach(function(n) { expand(n.x, n.y, n.width || 160, n.height || 70); });
    groups.forEach(function(g) { expand(g.x, g.y, g.width || 300, g.height || 200); });
    notes.forEach(function(nt) { expand(nt.x, nt.y, nt.width || 140, nt.height || 90); });
    shapes.forEach(function(s) { expand(s.x, s.y, s.width || 150, s.height || 100); });

    if (!isFinite(minX) || !isFinite(minY)) {
      minX = 0; minY = 0; maxX = 800; maxY = 500;
    }

    var pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    var width = Math.max(400, maxX - minX);
    var height = Math.max(300, maxY - minY);

    var nodeMap = {};
    nodes.forEach(function(n) {
      var nid = n.id || String(n.x) + '_' + String(n.y);
      nodeMap[nid] = n;
    });

    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + minX + ' ' + minY + ' ' + width + ' ' + height + '" class="pdf-mindmap-svg" style="width:100%;height:auto;max-height:480px;background:#ffffff;border:1.5px solid #333333;border-radius:6px;display:block;margin:6px 0;page-break-inside:avoid;break-inside:avoid;">\n' +
      '<defs>\n' +
      '  <marker id="dossier-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
      '    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#333333" />\n' +
      '  </marker>\n' +
      '</defs>\n';

    // 1. Groups
    groups.forEach(function(g) {
      var gx = Number(g.x) || 0, gy = Number(g.y) || 0, gw = Number(g.width) || 280, gh = Number(g.height) || 180;
      var gColor = g.color || '#e2e8f0';
      var gTitle = g.title || g.name || '';
      svg += '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" rx="8" fill="' + gColor + '" fill-opacity="0.25" stroke="#333333" stroke-width="1.5" stroke-dasharray="4,4" />\n';
      if (gTitle) {
        svg += '<rect x="' + gx + '" y="' + gy + '" width="' + Math.min(gw, 160) + '" height="20" rx="4" fill="#333333" />\n';
        svg += '<text x="' + (gx + 6) + '" y="' + (gy + 14) + '" fill="#ffffff" font-family="Lexend, sans-serif" font-size="10" font-weight="800">' + esc(gTitle) + '</text>\n';
      }
    });

    // 2. Edges / Connections
    edges.forEach(function(e) {
      var fromNode = nodeMap[e.from || e.source];
      var toNode = nodeMap[e.to || e.target];
      if (fromNode && toNode) {
        var fx = (Number(fromNode.x) || 0) + (Number(fromNode.width) || 160) / 2;
        var fy = (Number(fromNode.y) || 0) + (Number(fromNode.height) || 70) / 2;
        var tx = (Number(toNode.x) || 0) + (Number(toNode.width) || 160) / 2;
        var ty = (Number(toNode.y) || 0) + (Number(toNode.height) || 70) / 2;
        var dx = tx - fx;
        var cx1 = fx + dx * 0.35;
        var cy1 = fy;
        var cx2 = tx - dx * 0.35;
        var cy2 = ty;
        var edgeColor = e.color || '#475569';
        svg += '<path d="M ' + fx + ' ' + fy + ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + tx + ' ' + ty + '" fill="none" stroke="' + edgeColor + '" stroke-width="2" marker-end="url(#dossier-arrow)" />\n';
        if (e.label) {
          var mx = (fx + tx) / 2;
          var my = (fy + ty) / 2 - 4;
          svg += '<text x="' + mx + '" y="' + my + '" fill="#334155" font-family="Lexend, sans-serif" font-size="9" font-weight="700" text-anchor="middle">' + esc(e.label) + '</text>\n';
        }
      }
    });

    // 3. Nodes
    nodes.forEach(function(n) {
      var nx = Number(n.x) || 0, ny = Number(n.y) || 0, nw = Number(n.width) || 160, nh = Number(n.height) || 70;
      var nBg = n.bgColor || '#ffffff';
      var nStroke = n.color || '#333333';
      var nText = n.text || n.title || n.label || '';
      var nColor = n.textColor || '#111111';
      var isRound = n.shape === 'ellipse' || n.shape === 'circle';

      if (isRound) {
        svg += '<ellipse cx="' + (nx + nw/2) + '" cy="' + (ny + nh/2) + '" rx="' + (nw/2) + '" ry="' + (nh/2) + '" fill="' + nBg + '" stroke="' + nStroke + '" stroke-width="2" />\n';
      } else {
        svg += '<rect x="' + nx + '" y="' + ny + '" width="' + nw + '" height="' + nh + '" rx="6" fill="' + nBg + '" stroke="' + nStroke + '" stroke-width="2" />\n';
      }

      var words = String(nText).split(/\s+/);
      var lines = [];
      var curLine = '';
      words.forEach(function(w) {
        if ((curLine + ' ' + w).length > 20) {
          if (curLine) lines.push(curLine);
          curLine = w;
        } else {
          curLine = curLine ? (curLine + ' ' + w) : w;
        }
      });
      if (curLine) lines.push(curLine);
      if (!lines.length) lines = [''];

      var lineH = 13;
      var startTextY = ny + (nh / 2) - ((lines.length - 1) * lineH / 2) + 4;
      lines.slice(0, 4).forEach(function(lineStr, lIdx) {
        svg += '<text x="' + (nx + nw / 2) + '" y="' + (startTextY + lIdx * lineH) + '" fill="' + nColor + '" font-family="Lexend, sans-serif" font-size="10.5" font-weight="700" text-anchor="middle">' + esc(lineStr) + '</text>\n';
      });
    });

    // 4. Sticky Notes
    notes.forEach(function(nt) {
      var tx = Number(nt.x) || 0, ty = Number(nt.y) || 0, tw = Number(nt.width) || 140, th = Number(nt.height) || 90;
      var nBg = nt.color || nt.bgColor || '#fef3c7';
      var nText = nt.text || nt.content || '';
      svg += '<rect x="' + tx + '" y="' + ty + '" width="' + tw + '" height="' + th + '" rx="4" fill="' + nBg + '" stroke="#d97706" stroke-width="1.5" />\n';
      svg += '<text x="' + (tx + 6) + '" y="' + (ty + 16) + '" fill="#78350f" font-family="Lexend, sans-serif" font-size="9" font-weight="600">' + esc(nText.slice(0, 45)) + (nText.length > 45 ? '...' : '') + '</text>\n';
    });

    svg += '</svg>\n';
    return svg;
  }

  function renderMindmapConceptsTable(boardData) {
    if (!boardData || !Array.isArray(boardData.nodes) || !boardData.nodes.length) return '';
    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    var html = '<div class="pdf-mm-concepts-table-wrap" style="margin-top:6px;page-break-inside:avoid;break-inside:avoid;">' +
      '<table class="pdf-table" style="width:100%;border-collapse:collapse;font-size:7.5pt;border:1px solid #333333;border-radius:4px;overflow:hidden;">' +
      '<thead><tr style="background:#f1f5f9;border-bottom:1.5px solid #333333;">' +
      '<th style="text-align:left;padding:4px 6px;width:35%;font-weight:900;text-transform:uppercase;">Topic / Concept Node</th>' +
      '<th style="text-align:left;padding:4px 6px;width:65%;font-weight:900;text-transform:uppercase;">Content & Details</th>' +
      '</tr></thead><tbody>';

    boardData.nodes.forEach(function(n) {
      var nText = n.text || n.title || n.label || '';
      var nNotes = n.note || n.notes || (n.meta && n.meta.note) || '';
      html += '<tr style="border-bottom:1px solid #e2e8f0;">' +
        '<td style="padding:3px 6px;font-weight:700;color:#111111;vertical-align:top;">' + esc(nText) + '</td>' +
        '<td style="padding:3px 6px;color:#475569;vertical-align:top;">' + (nNotes ? esc(nNotes) : '<span style="color:#94a3b8;font-style:italic;">--</span>') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function ensureDossierPdfModalDom() {
    if (document.getElementById('cmt-dossier-pdf-modal-overlay')) return;
    ensureStylesheet();

    var overlay = document.createElement('div');
    overlay.id = 'cmt-dossier-pdf-modal-overlay';
    overlay.innerHTML =
      '<div class="cmt-dossier-pdf-card" role="dialog" aria-modal="true">' +
        '<div class="cmt-dos-pdf-header">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="cmt-lm-badge" style="background:#5b8fcc;color:#fff;">[EXPORT STUDIO]</span>' +
            '<h3 style="font-size:1.05rem;font-weight:900;color:#111;margin:0;" id="cmt-dos-pdf-modal-title">' + (t('lmDossierPdfModalTitle', 'Student 360° Academic Dossier — Export Studio') || 'Student 360° Academic Dossier — Export Studio') + '</h3>' +
          '</div>' +
          '<button type="button" class="cmt-lm-close-btn" id="cmt-dos-pdf-btn-close">[CLOSE]</button>' +
        '</div>' +
        '<div class="cmt-dos-pdf-studio">' +
          '<!-- Left Column: Detailed Selectors -->' +
          '<div class="cmt-dos-pdf-sidebar" id="cmt-dos-pdf-sidebar">' +
            '<!-- Form inserted dynamically -->' +
          '</div>' +
          '<!-- Right Column: Live Scaled Preview -->' +
          '<div class="cmt-dos-pdf-preview-pane">' +
            '<div class="cmt-dos-pdf-preview-header">' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="cmt-lm-badge" style="background:#e2c96e;color:#111;">[LIVE PREVIEW]</span>' +
                '<span style="font-size:0.76rem;font-weight:800;color:#444;" id="cmt-dos-preview-page-info">A4 Portrait</span>' +
              '</div>' +
              '<div class="cmt-dos-pdf-preview-toolbar">' +
                '<button type="button" class="cmt-dos-preset-btn" id="cmt-dos-prev-zoom-fit">' + (t('lmDossierPreviewFit', 'Fit') || 'Fit') + '</button>' +
                '<button type="button" class="cmt-dos-preset-btn" id="cmt-dos-prev-zoom-75">75%</button>' +
                '<button type="button" class="cmt-dos-preset-btn active" id="cmt-dos-prev-zoom-100">' + (t('lmDossierPreviewActual', '100%') || '100%') + '</button>' +
                '<button type="button" class="cmt-dos-preset-btn" id="cmt-dos-prev-zoom-125">125%</button>' +
              '</div>' +
            '</div>' +
            '<div class="cmt-dos-pdf-preview-body" id="cmt-dos-preview-body">' +
              '<div class="cmt-dos-preview-scaler" id="cmt-dos-preview-scaler">' +
                '<div class="cmt-dos-preview-viewport" id="cmt-dos-preview-viewport" style="width:794px;min-height:1123px;">' +
                  '<iframe class="cmt-dos-preview-frame" id="cmt-dos-preview-frame" title="Dossier Document Preview"></iframe>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cmt-dos-pdf-footer">' +
          '<button type="button" class="cmt-lm-btn" id="cmt-dos-pdf-btn-cancel">' + (t('btnCancel', 'Cancel') || 'Cancel') + '</button>' +
          '<div class="cmt-dos-pdf-footer-actions">' +
            '<button type="button" class="cmt-lm-btn" id="cmt-dos-btn-export-mindmaps" style="background:#8b7cc2;color:#fff;font-weight:800;display:none;">' + (t('lmDossierExportMindmapsBtn', '[EXPORT MINDMAPS PDF ONLY]') || '[EXPORT MINDMAPS PDF ONLY]') + '</button>' +
            '<button type="button" class="cmt-lm-btn" id="cmt-dos-btn-export-html" style="background:#e2c96e;color:#111;font-weight:800;">' + (t('lmDossierExportHtmlBtn', '[EXPORT HTML]') || '[EXPORT HTML]') + '</button>' +
            '<button type="button" class="cmt-lm-btn primary" id="cmt-dos-pdf-btn-submit" style="background:#5b8fcc;color:#fff;font-weight:900;">' + (t('lmDossierPdfExportBtn', '[EXPORT PDF]') || '[EXPORT PDF]') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('cmt-dos-pdf-btn-close').addEventListener('click', closeDossierPdfExportModal);
    document.getElementById('cmt-dos-pdf-btn-cancel').addEventListener('click', closeDossierPdfExportModal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeDossierPdfExportModal();
    });

    // Dynamic Zoom & Sizing handlers
    function applyPreviewDimensions() {
      var frame = document.getElementById('cmt-dos-preview-frame');
      var vp = document.getElementById('cmt-dos-preview-viewport');
      var scaler = document.getElementById('cmt-dos-preview-scaler');
      if (!frame || !vp || !scaler) return;

      var options = collectDossierExportOptions();
      var isLandscape = options.orientation === 'landscape';
      var isLetter = options.pageSize === 'Letter';
      var naturalW = isLetter ? (isLandscape ? 1056 : 816) : (isLandscape ? 1123 : 794);
      var minNaturalH = isLetter ? (isLandscape ? 816 : 1056) : (isLandscape ? 794 : 1123);

      var docHeight = minNaturalH;
      try {
        var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        if (doc && doc.body) {
          var scrollH = Math.max(
            doc.body.scrollHeight || 0,
            doc.documentElement.scrollHeight || 0,
            doc.body.offsetHeight || 0
          );
          if (scrollH && scrollH > 100) {
            docHeight = Math.max(minNaturalH, scrollH + 30);
          }
        }
      } catch (err) {
        console.warn('Preview height read error:', err);
      }

      vp.style.width = naturalW + 'px';
      vp.style.height = docHeight + 'px';
      vp.style.transform = 'scale(' + _dossierPreviewZoom + ')';
      vp.style.transformOrigin = 'top left';

      frame.style.width = naturalW + 'px';
      frame.style.height = docHeight + 'px';

      scaler.style.width = Math.round(naturalW * _dossierPreviewZoom) + 'px';
      scaler.style.height = Math.round(docHeight * _dossierPreviewZoom) + 'px';
    }

    function setZoom(z, activeBtnId) {
      _dossierPreviewZoom = z;
      applyPreviewDimensions();
      ['cmt-dos-prev-zoom-fit', 'cmt-dos-prev-zoom-75', 'cmt-dos-prev-zoom-100', 'cmt-dos-prev-zoom-125'].forEach(function(bid) {
        var el = document.getElementById(bid);
        if (el) el.classList.toggle('active', bid === activeBtnId);
      });
    }

    document.getElementById('cmt-dos-prev-zoom-100').addEventListener('click', function() { setZoom(1.0, 'cmt-dos-prev-zoom-100'); });
    document.getElementById('cmt-dos-prev-zoom-75').addEventListener('click', function() { setZoom(0.75, 'cmt-dos-prev-zoom-75'); });
    document.getElementById('cmt-dos-prev-zoom-125').addEventListener('click', function() { setZoom(1.25, 'cmt-dos-prev-zoom-125'); });
    document.getElementById('cmt-dos-prev-zoom-fit').addEventListener('click', function() {
      var bodyW = document.getElementById('cmt-dos-preview-body');
      if (bodyW) {
        var options = collectDossierExportOptions();
        var isLandscape = options.orientation === 'landscape';
        var isLetter = options.pageSize === 'Letter';
        var naturalW = isLetter ? (isLandscape ? 1056 : 816) : (isLandscape ? 1123 : 794);
        var availableW = bodyW.clientWidth - 48;
        var fitScale = Math.max(0.35, Math.min(1.2, availableW / naturalW));
        setZoom(fitScale, 'cmt-dos-prev-zoom-fit');
      }
    });
  }

  function collectDossierExportOptions() {
    var semFilterVal = 'all';
    var semRadio = document.querySelector('input[name="cmt-dos-pdf-sem-filter"]:checked');
    if (semRadio) semFilterVal = semRadio.value;

    var pageSizeVal = 'A4';
    var psRadio = document.querySelector('input[name="cmt-dos-pdf-pagesize"]:checked');
    if (psRadio) pageSizeVal = psRadio.value;

    var orientationVal = 'portrait';
    var orientRadio = document.querySelector('input[name="cmt-dos-pdf-orientation"]:checked');
    if (orientRadio) orientationVal = orientRadio.value;

    var mmModeVal = 'diagram';
    var mmRadio = document.querySelector('input[name="cmt-dos-mm-mode"]:checked');
    if (mmRadio) mmModeVal = mmRadio.value;

    var fontScaleVal = 'md';
    var fsRadio = document.querySelector('input[name="cmt-dos-font-scale"]:checked');
    if (fsRadio) fontScaleVal = fsRadio.value;

    var remarksTa = document.getElementById('cmt-dos-pdf-remarks-text');

    function getSelectedCheckValues(containerId) {
      var container = document.getElementById(containerId);
      if (!container) return null;
      var checkboxes = container.querySelectorAll('input[type="checkbox"]');
      var ids = [];
      checkboxes.forEach(function(cb) {
        if (cb.checked) ids.push(cb.value);
      });
      return ids;
    }

    return {
      studentProfile: !!(document.getElementById('cmt-dos-pdf-chk-profile') && document.getElementById('cmt-dos-pdf-chk-profile').checked),
      academicPerformance: !!(document.getElementById('cmt-dos-pdf-chk-averages') && document.getElementById('cmt-dos-pdf-chk-averages').checked),
      evaluations: !!(document.getElementById('cmt-dos-pdf-chk-evals') && document.getElementById('cmt-dos-pdf-chk-evals').checked),
      semesterFilter: semFilterVal,
      includeCriteria: !!(document.getElementById('cmt-dos-pdf-chk-criteria') && document.getElementById('cmt-dos-pdf-chk-criteria').checked),
      includeNotes: !!(document.getElementById('cmt-dos-pdf-chk-notes') && document.getElementById('cmt-dos-pdf-chk-notes').checked),
      competences: !!(document.getElementById('cmt-dos-pdf-chk-comps') && document.getElementById('cmt-dos-pdf-chk-comps').checked),
      lessons: !!(document.getElementById('cmt-dos-pdf-chk-lessons') && document.getElementById('cmt-dos-pdf-chk-lessons').checked),
      work: !!(document.getElementById('cmt-dos-pdf-chk-docs') && document.getElementById('cmt-dos-pdf-chk-docs').checked),
      mindmaps: !!(document.getElementById('cmt-dos-pdf-chk-mindmaps') && document.getElementById('cmt-dos-pdf-chk-mindmaps').checked),
      mindmapMode: mmModeVal,
      teacherRemarks: !!(document.getElementById('cmt-dos-pdf-chk-remarks') && document.getElementById('cmt-dos-pdf-chk-remarks').checked),
      remarksText: remarksTa ? remarksTa.value : '',
      signatureBlock: !!(document.getElementById('cmt-dos-pdf-chk-signatures') && document.getElementById('cmt-dos-pdf-chk-signatures').checked),
      pageSize: pageSizeVal,
      orientation: orientationVal,
      fontScale: fontScaleVal,
      selectedEvals: getSelectedCheckValues('cmt-dos-evals-list'),
      selectedComps: getSelectedCheckValues('cmt-dos-comps-list'),
      selectedLessons: getSelectedCheckValues('cmt-dos-lessons-list'),
      selectedDocs: getSelectedCheckValues('cmt-dos-docs-list'),
      selectedBoards: getSelectedCheckValues('cmt-dos-mindmaps-list')
    };
  }

  async function updateDossierPreview(dossier) {
    if (!dossier) dossier = _activeExportDossier;
    if (!dossier) return;

    var options = collectDossierExportOptions();
    var frame = document.getElementById('cmt-dos-preview-frame');
    var vp = document.getElementById('cmt-dos-preview-viewport');
    var pageInfo = document.getElementById('cmt-dos-preview-page-info');

    if (pageInfo) {
      pageInfo.textContent = (options.pageSize || 'A4') + ' ' + (options.orientation === 'landscape' ? 'Landscape' : 'Portrait');
    }

    if (vp) {
      if (options.pageSize === 'Letter') {
        vp.style.width = options.orientation === 'landscape' ? '1056px' : '816px';
        vp.style.minHeight = options.orientation === 'landscape' ? '816px' : '1056px';
      } else {
        // A4
        vp.style.width = options.orientation === 'landscape' ? '1123px' : '794px';
        vp.style.minHeight = options.orientation === 'landscape' ? '794px' : '1123px';
      }
    }

    // Pre-load any selected mindmap boards
    if (options.mindmaps !== false && Array.isArray(options.selectedBoards) && options.selectedBoards.length > 0) {
      for (var i = 0; i < options.selectedBoards.length; i++) {
        var bUrn = options.selectedBoards[i];
        if (!_dossierMindmapCache[bUrn]) {
          await loadBoardMindmapData(bUrn);
        }
      }
    }

    var htmlDoc = generateDossierPdfHtml(dossier, options, _dossierMindmapCache);
    if (frame && frame.contentWindow) {
      try {
        var doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(htmlDoc);
        doc.close();

        var isLandscape = options.orientation === 'landscape';
        var isLetter = options.pageSize === 'Letter';
        var naturalW = isLetter ? (isLandscape ? 1056 : 816) : (isLandscape ? 1123 : 794);
        var minNaturalH = isLetter ? (isLandscape ? 816 : 1056) : (isLandscape ? 794 : 1123);

        function fitFrameHeight() {
          var vp = document.getElementById('cmt-dos-preview-viewport');
          var scaler = document.getElementById('cmt-dos-preview-scaler');
          if (!frame || !vp || !scaler) return;

          var docHeight = minNaturalH;
          try {
            var cDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            if (cDoc && cDoc.body) {
              var scrollH = Math.max(
                cDoc.body.scrollHeight || 0,
                cDoc.documentElement.scrollHeight || 0,
                cDoc.body.offsetHeight || 0
              );
              if (scrollH && scrollH > 100) {
                docHeight = Math.max(minNaturalH, scrollH + 30);
              }
            }
          } catch (e) {}

          vp.style.width = naturalW + 'px';
          vp.style.height = docHeight + 'px';
          vp.style.transform = 'scale(' + _dossierPreviewZoom + ')';
          vp.style.transformOrigin = 'top left';

          frame.style.width = naturalW + 'px';
          frame.style.height = docHeight + 'px';

          scaler.style.width = Math.round(naturalW * _dossierPreviewZoom) + 'px';
          scaler.style.height = Math.round(docHeight * _dossierPreviewZoom) + 'px';
        }

        fitFrameHeight();
        setTimeout(fitFrameHeight, 50);
        setTimeout(fitFrameHeight, 200);
      } catch (e) {
        console.warn('Preview render error:', e);
      }
    }
  }

  function queueDossierPreviewUpdate() {
    if (_dossierPreviewTimer) clearTimeout(_dossierPreviewTimer);
    _dossierPreviewTimer = setTimeout(function() {
      updateDossierPreview(_activeExportDossier);
    }, 60);
  }

  async function openDossierPdfExportModal(dossier) {
    if (!dossier) return;
    _activeExportDossier = dossier;
    ensureDossierPdfModalDom();

    var st = dossier.student || {};
    var evals = dossier.evaluations || [];
    var comps = dossier.competences || [];
    var lessons = dossier.lessons || [];
    var docs = dossier.documents || [];
    var boards = dossier.boards || [];

    var overlay = document.getElementById('cmt-dossier-pdf-modal-overlay');
    var sidebarEl = document.getElementById('cmt-dos-pdf-sidebar');
    var mmExportBtn = document.getElementById('cmt-dos-btn-export-mindmaps');
    if (!overlay || !sidebarEl) return;

    if (mmExportBtn) {
      mmExportBtn.style.display = boards.length > 0 ? 'inline-flex' : 'none';
    }

    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var formHtml =
      '<!-- Student Header Info -->' +
      '<div style="background:#ffffff;border:1.5px solid #333;border-radius:6px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
        '<div>' +
          '<span style="font-size:0.92rem;font-weight:900;color:#111;text-transform:uppercase;">' + esc(st.name || 'Student') + '</span> ' +
          '<span style="font-size:0.75rem;font-weight:700;color:#555;">(' + esc(st.className || '') + (st.level ? ' • ' + esc(st.level.toUpperCase()) : '') + ')</span>' +
        '</div>' +
        '<div class="cmt-dos-pdf-toolbar">' +
          '<button type="button" class="cmt-dos-preset-btn" id="cmt-dos-btn-select-all">' + (t('lmDossierPdfSelectAll', 'Select All') || 'Select All') + '</button>' +
          '<button type="button" class="cmt-dos-preset-btn" id="cmt-dos-btn-deselect-all">' + (t('lmDossierPdfDeselectAll', 'Deselect All') || 'Deselect All') + '</button>' +
        '</div>' +
      '</div>' +

      '<!-- Presets Bar -->' +
      '<div class="cmt-dos-presets-bar">' +
        '<span style="font-size:0.7rem;font-weight:900;color:#555;text-transform:uppercase;">' + (t('lmDossierPresetLabel', 'Presets:') || 'Presets:') + '</span>' +
        '<button type="button" class="cmt-dos-preset-btn active" data-preset="full">' + (t('lmDossierPresetFull', 'Full 360° Dossier') || 'Full 360° Dossier') + '</button>' +
        '<button type="button" class="cmt-dos-preset-btn" data-preset="transcript">' + (t('lmDossierPresetTranscript', 'Official Transcript') || 'Official Transcript') + '</button>' +
        '<button type="button" class="cmt-dos-preset-btn" data-preset="evals">' + (t('lmDossierPresetEvals', 'Evaluations & Feedback') || 'Evaluations & Feedback') + '</button>' +
        '<button type="button" class="cmt-dos-preset-btn" data-preset="summary">' + (t('lmDossierPresetSummary', 'Executive Summary') || 'Executive Summary') + '</button>' +
      '</div>' +

      '<!-- Section 1: Student Profile -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<label class="cmt-dos-pdf-check-label">' +
          '<input type="checkbox" id="cmt-dos-pdf-chk-profile" checked />' +
          '<span>' + (t('lmDossierPdfSecProfile', 'Student Profile & Identity') || 'Student Profile & Identity') + '</span>' +
        '</label>' +
      '</div>' +

      '<!-- Section 2: Academic Performance Summary -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<label class="cmt-dos-pdf-check-label">' +
          '<input type="checkbox" id="cmt-dos-pdf-chk-averages" checked />' +
          '<span>' + (t('lmDossierPdfSecAverages', 'Academic Performance Overview & Averages') || 'Academic Performance Overview & Averages') + '</span>' +
        '</label>' +
      '</div>' +

      '<!-- Section 3: Evaluations & Assessments -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<div class="cmt-dos-pdf-sec-hdr">' +
          '<label class="cmt-dos-pdf-check-label">' +
            '<input type="checkbox" id="cmt-dos-pdf-chk-evals" checked />' +
            '<span>' + (t('lmDossierPdfSecEvals', 'Evaluations & Grade Sheet Assessments') || 'Evaluations & Grade Sheet Assessments') + ' <span class="cmt-lm-badge" style="background:#5b8fcc;color:#fff;font-size:0.62rem;">' + evals.length + '</span></span>' +
          '</label>' +
          '<span class="cmt-dossier-sec-chevron" style="font-size:0.7rem;">▼</span>' +
        '</div>' +
        '<div class="cmt-dos-pdf-sub-options" id="cmt-dos-pdf-evals-sub">' +
          '<div class="cmt-dos-pdf-radios">' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="radio" name="cmt-dos-pdf-sem-filter" value="all" checked /> ' + (t('lmDossierPdfSemFilterAll', 'All Semesters') || 'All Semesters') + '</label>' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="radio" name="cmt-dos-pdf-sem-filter" value="sem1" /> ' + (t('lmDossierPdfSemFilterS1', 'Semester 1 (S1)') || 'Semester 1 (S1)') + '</label>' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="radio" name="cmt-dos-pdf-sem-filter" value="sem2" /> ' + (t('lmDossierPdfSemFilterS2', 'Semester 2 (S2)') || 'Semester 2 (S2)') + '</label>' +
          '</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="checkbox" id="cmt-dos-pdf-chk-criteria" checked /> ' + (t('lmDossierPdfOptCriteria', 'Include Rubric Criteria Breakdowns') || 'Include Rubric Criteria Breakdowns') + '</label>' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="checkbox" id="cmt-dos-pdf-chk-notes" checked /> ' + (t('lmDossierPdfOptNotes', 'Include Teacher Feedback & Observation Notes') || 'Include Teacher Feedback & Observation Notes') + '</label>' +
          '</div>' +
          '<!-- Granular Evaluations List -->' +
          '<input type="text" class="cmt-dos-filter-input" id="cmt-dos-filter-evals" placeholder="' + (t('lmDossierFilterAssessments', 'Filter assessments...') || 'Filter assessments...') + '" />' +
          '<div class="cmt-dos-item-list" id="cmt-dos-evals-list">' +
            evals.map(function(ev, idx) {
              var evId = ev.urn || ('eval_' + idx);
              var evTitle = ev.title || ev.urn || ('Assessment ' + (idx + 1));
              var evScore = ev.score != null ? (' (' + ev.score + (ev.maxScore ? '/' + ev.maxScore : '') + ')') : '';
              return '<label class="cmt-dos-item-row" data-search="' + esc(evTitle.toLowerCase()) + '">' +
                '<input type="checkbox" value="' + esc(evId) + '" checked />' +
                '<span>' + esc(evTitle) + '<span style="color:#166534;font-weight:800;">' + esc(evScore) + '</span></span>' +
              '</label>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Section 4: Competences -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<div class="cmt-dos-pdf-sec-hdr">' +
          '<label class="cmt-dos-pdf-check-label">' +
            '<input type="checkbox" id="cmt-dos-pdf-chk-comps" checked />' +
            '<span>' + (t('lmGroupCompetences', 'Curriculum Competences & Rubrics') || 'Curriculum Competences & Rubrics') + ' <span class="cmt-lm-badge" style="background:#6abf8e;color:#111;font-size:0.62rem;">' + comps.length + '</span></span>' +
          '</label>' +
          '<span class="cmt-dossier-sec-chevron" style="font-size:0.7rem;">▼</span>' +
        '</div>' +
        '<div class="cmt-dos-pdf-sub-options" id="cmt-dos-comps-sub">' +
          '<input type="text" class="cmt-dos-filter-input" id="cmt-dos-filter-comps" placeholder="' + (t('lmDossierFilterCompetences', 'Filter competences...') || 'Filter competences...') + '" />' +
          '<div class="cmt-dos-item-list" id="cmt-dos-comps-list">' +
            (comps.length ? comps.map(function(cp, idx) {
              var cpId = cp.urn || ('comp_' + idx);
              var cpTitle = cp.title || cp.urn;
              return '<label class="cmt-dos-item-row" data-search="' + esc(cpTitle.toLowerCase()) + '">' +
                '<input type="checkbox" value="' + esc(cpId) + '" checked />' +
                '<span>' + esc(cpTitle) + '</span>' +
              '</label>';
            }).join('') : '<div style="font-size:0.72rem;color:#888;padding:4px;">No linked competences</div>') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Section 5: Lessons -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<div class="cmt-dos-pdf-sec-hdr">' +
          '<label class="cmt-dos-pdf-check-label">' +
            '<input type="checkbox" id="cmt-dos-pdf-chk-lessons" checked />' +
            '<span>' + (t('lmDossierDeliveredLessons', 'Delivered Lesson Plans & Timetable') || 'Delivered Lesson Plans & Timetable') + ' <span class="cmt-lm-badge" style="background:#e2c96e;color:#111;font-size:0.62rem;">' + lessons.length + '</span></span>' +
          '</label>' +
          '<span class="cmt-dossier-sec-chevron" style="font-size:0.7rem;">▼</span>' +
        '</div>' +
        '<div class="cmt-dos-pdf-sub-options" id="cmt-dos-lessons-sub">' +
          '<input type="text" class="cmt-dos-filter-input" id="cmt-dos-filter-lessons" placeholder="' + (t('lmDossierFilterLessons', 'Filter lessons...') || 'Filter lessons...') + '" />' +
          '<div class="cmt-dos-item-list" id="cmt-dos-lessons-list">' +
            (lessons.length ? lessons.map(function(ls, idx) {
              var lsId = ls.urn || ('lesson_' + idx);
              var lsTitle = ls.title || ls.urn;
              return '<label class="cmt-dos-item-row" data-search="' + esc(lsTitle.toLowerCase()) + '">' +
                '<input type="checkbox" value="' + esc(lsId) + '" checked />' +
                '<span>' + esc(lsTitle) + '</span>' +
              '</label>';
            }).join('') : '<div style="font-size:0.72rem;color:#888;padding:4px;">No linked lessons</div>') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Section 6: Work & Documents -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<div class="cmt-dos-pdf-sec-hdr">' +
          '<label class="cmt-dos-pdf-check-label">' +
            '<input type="checkbox" id="cmt-dos-pdf-chk-docs" checked />' +
            '<span>' + (t('lmDossierDocAttachments', 'Attached Documents & Work Submissions') || 'Attached Documents & Work Submissions') + ' <span class="cmt-lm-badge" style="background:#8b7cc2;color:#fff;font-size:0.62rem;">' + docs.length + '</span></span>' +
          '</label>' +
          '<span class="cmt-dossier-sec-chevron" style="font-size:0.7rem;">▼</span>' +
        '</div>' +
        '<div class="cmt-dos-pdf-sub-options" id="cmt-dos-docs-sub">' +
          '<input type="text" class="cmt-dos-filter-input" id="cmt-dos-filter-docs" placeholder="' + (t('lmDossierFilterDocs', 'Filter documents...') || 'Filter documents...') + '" />' +
          '<div class="cmt-dos-item-list" id="cmt-dos-docs-list">' +
            (docs.length ? docs.map(function(dc, idx) {
              var dcId = dc.urn || ('doc_' + idx);
              var dcTitle = dc.title || dc.urn;
              return '<label class="cmt-dos-item-row" data-search="' + esc(dcTitle.toLowerCase()) + '">' +
                '<input type="checkbox" value="' + esc(dcId) + '" checked />' +
                '<span>' + esc(dcTitle) + '</span>' +
              '</label>';
            }).join('') : '<div style="font-size:0.72rem;color:#888;padding:4px;">No attached documents</div>') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Section 7: Board Mindmaps & Constellations -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<div class="cmt-dos-pdf-sec-hdr">' +
          '<label class="cmt-dos-pdf-check-label">' +
            '<input type="checkbox" id="cmt-dos-pdf-chk-mindmaps" checked />' +
            '<span>' + (t('lmDossierLinkedDocs', 'Board Constellation Mindmaps') || 'Board Constellation Mindmaps') + ' <span class="cmt-lm-badge" style="background:#3b82f6;color:#fff;font-size:0.62rem;">' + boards.length + '</span></span>' +
          '</label>' +
          '<span class="cmt-dossier-sec-chevron" style="font-size:0.7rem;">▼</span>' +
        '</div>' +
        '<div class="cmt-dos-pdf-sub-options" id="cmt-dos-mindmaps-sub">' +
          '<div style="font-size:0.72rem;font-weight:800;color:#555;text-transform:uppercase;margin-bottom:2px;">' + (t('lmDossierMindmapModeLabel', 'Mindmap Inclusion Mode:') || 'Mindmap Inclusion Mode:') + '</div>' +
          '<div class="cmt-dos-pdf-radios">' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="radio" name="cmt-dos-mm-mode" value="diagram" checked /> ' + (t('lmDossierMindmapModeDiagram', 'Full Vector Diagram (SVG)') || 'Full Vector Diagram (SVG)') + '</label>' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="radio" name="cmt-dos-mm-mode" value="full" /> ' + (t('lmDossierMindmapModeFull', 'Diagram + Node & Concept Index') || 'Diagram + Node & Concept Index') + '</label>' +
            '<label class="cmt-dos-pdf-check-label" style="font-weight:600;"><input type="radio" name="cmt-dos-mm-mode" value="list" /> ' + (t('lmDossierMindmapModeList', 'Summary list only') || 'Summary list only') + '</label>' +
          '</div>' +
          '<div class="cmt-dos-item-list" id="cmt-dos-mindmaps-list" style="margin-top:4px;">' +
            (boards.length ? boards.map(function(bd, idx) {
              var bdId = bd.urn || ('board_' + idx);
              var bdTitle = bd.title || bd.urn;
              return '<label class="cmt-dos-item-row" data-search="' + esc(bdTitle.toLowerCase()) + '">' +
                '<input type="checkbox" value="' + esc(bdId) + '" checked />' +
                '<span>' + esc(bdTitle) + '</span>' +
              '</label>';
            }).join('') : '<div style="font-size:0.72rem;color:#888;padding:4px;">No linked mindmaps</div>') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Section 8: Overall Remarks -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<label class="cmt-dos-pdf-check-label">' +
          '<input type="checkbox" id="cmt-dos-pdf-chk-remarks" />' +
          '<span>' + (t('lmDossierPdfSecRemarks', 'Overall Teacher Remarks / General Feedback') || 'Overall Teacher Remarks / General Feedback') + '</span>' +
        '</label>' +
        '<div class="cmt-dos-pdf-sub-options" id="cmt-dos-pdf-remarks-sub" style="display:none;">' +
          '<textarea class="cmt-dos-pdf-textarea" id="cmt-dos-pdf-remarks-text" placeholder="' + (t('lmDossierPdfRemarksPlaceholder', 'Type custom overall teacher observations, advice, or academic summary...') || 'Type custom overall teacher observations, advice, or academic summary...') + '"></textarea>' +
        '</div>' +
      '</div>' +

      '<!-- Section 9: Signature Block -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<label class="cmt-dos-pdf-check-label">' +
          '<input type="checkbox" id="cmt-dos-pdf-chk-signatures" />' +
          '<span>' + (t('lmDossierPdfSecSignatures', 'Teacher & Parent / Guardian Signature Block') || 'Teacher & Parent / Guardian Signature Block') + '</span>' +
        '</label>' +
      '</div>' +

      '<!-- Section 10: Page Format, Orientation & Font Scale -->' +
      '<div class="cmt-dos-pdf-sec">' +
        '<div class="cmt-dos-pdf-grid-options">' +
          '<div>' +
            '<label style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:#555;display:block;margin-bottom:2px;">' + (t('lmDossierPdfFormatLabel', 'Page Format:') || 'Page Format:') + '</label>' +
            '<div class="cmt-dos-pdf-radios">' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-pdf-pagesize" value="A4" checked /> A4</label>' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-pdf-pagesize" value="Letter" /> Letter</label>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:#555;display:block;margin-bottom:2px;">' + (t('lmDossierPdfOrientationLabel', 'Orientation:') || 'Orientation:') + '</label>' +
            '<div class="cmt-dos-pdf-radios">' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-pdf-orientation" value="portrait" checked /> ' + (t('lmDossierPdfPortrait', 'Portrait') || 'Portrait') + '</label>' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-pdf-orientation" value="landscape" /> ' + (t('lmDossierPdfLandscape', 'Landscape') || 'Landscape') + '</label>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label style="font-size:0.7rem;font-weight:800;text-transform:uppercase;color:#555;display:block;margin-bottom:2px;">' + (t('lmDossierFontScaleLabel', 'Font Scale:') || 'Font Scale:') + '</label>' +
            '<div class="cmt-dos-pdf-radios">' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-font-scale" value="sm" /> Sm</label>' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-font-scale" value="md" checked /> Md</label>' +
              '<label class="cmt-dos-pdf-check-label" style="font-weight:700;"><input type="radio" name="cmt-dos-font-scale" value="lg" /> Lg</label>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    sidebarEl.innerHTML = formHtml;
    overlay.classList.add('open');

    // Toggle remarks subarea
    var chkRemarks = document.getElementById('cmt-dos-pdf-chk-remarks');
    var remarksSub = document.getElementById('cmt-dos-pdf-remarks-sub');
    if (chkRemarks && remarksSub) {
      chkRemarks.addEventListener('change', function() {
        remarksSub.style.display = chkRemarks.checked ? 'block' : 'none';
        queueDossierPreviewUpdate();
      });
    }

    var remarksTextEl = document.getElementById('cmt-dos-pdf-remarks-text');
    if (remarksTextEl) {
      remarksTextEl.addEventListener('input', queueDossierPreviewUpdate);
    }

    // Toggle evals suboptions
    var chkEvals = document.getElementById('cmt-dos-pdf-chk-evals');
    var evalsSub = document.getElementById('cmt-dos-pdf-evals-sub');
    if (chkEvals && evalsSub) {
      chkEvals.addEventListener('change', function() {
        evalsSub.style.opacity = chkEvals.checked ? '1' : '0.4';
        evalsSub.style.pointerEvents = chkEvals.checked ? 'auto' : 'none';
        queueDossierPreviewUpdate();
      });
    }

    // Setup Filter Inputs for Lists
    function setupListFilter(inputId, listId) {
      var inp = document.getElementById(inputId);
      var list = document.getElementById(listId);
      if (!inp || !list) return;
      inp.addEventListener('input', function() {
        var query = inp.value.toLowerCase().trim();
        var rows = list.querySelectorAll('.cmt-dos-item-row');
        rows.forEach(function(r) {
          var sTxt = r.getAttribute('data-search') || '';
          r.style.display = (!query || sTxt.includes(query)) ? 'flex' : 'none';
        });
      });
    }
    setupListFilter('cmt-dos-filter-evals', 'cmt-dos-evals-list');
    setupListFilter('cmt-dos-filter-comps', 'cmt-dos-comps-list');
    setupListFilter('cmt-dos-filter-lessons', 'cmt-dos-lessons-list');
    setupListFilter('cmt-dos-filter-docs', 'cmt-dos-docs-list');

    // Attach change listeners to all checkboxes & radios for live preview sync
    sidebarEl.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(function(inp) {
      inp.addEventListener('change', queueDossierPreviewUpdate);
    });

    // Preset handlers
    sidebarEl.querySelectorAll('.cmt-dos-preset-btn[data-preset]').forEach(function(pBtn) {
      pBtn.addEventListener('click', function() {
        sidebarEl.querySelectorAll('.cmt-dos-preset-btn[data-preset]').forEach(function(b) { b.classList.remove('active'); });
        pBtn.classList.add('active');
        var preset = pBtn.getAttribute('data-preset');

        function setCheck(id, val) {
          var el = document.getElementById(id);
          if (el) el.checked = val;
        }

        if (preset === 'full') {
          ['profile', 'averages', 'evals', 'comps', 'lessons', 'docs', 'mindmaps', 'criteria', 'notes'].forEach(function(k) { setCheck('cmt-dos-pdf-chk-' + k, true); });
          setCheck('cmt-dos-pdf-chk-remarks', false);
          setCheck('cmt-dos-pdf-chk-signatures', false);
        } else if (preset === 'transcript') {
          setCheck('cmt-dos-pdf-chk-profile', true);
          setCheck('cmt-dos-pdf-chk-averages', true);
          setCheck('cmt-dos-pdf-chk-evals', true);
          setCheck('cmt-dos-pdf-chk-criteria', false);
          setCheck('cmt-dos-pdf-chk-notes', false);
          setCheck('cmt-dos-pdf-chk-comps', true);
          setCheck('cmt-dos-pdf-chk-lessons', false);
          setCheck('cmt-dos-pdf-chk-docs', false);
          setCheck('cmt-dos-pdf-chk-mindmaps', false);
          setCheck('cmt-dos-pdf-chk-remarks', true);
          setCheck('cmt-dos-pdf-chk-signatures', true);
        } else if (preset === 'evals') {
          setCheck('cmt-dos-pdf-chk-profile', true);
          setCheck('cmt-dos-pdf-chk-averages', true);
          setCheck('cmt-dos-pdf-chk-evals', true);
          setCheck('cmt-dos-pdf-chk-criteria', true);
          setCheck('cmt-dos-pdf-chk-notes', true);
          setCheck('cmt-dos-pdf-chk-comps', false);
          setCheck('cmt-dos-pdf-chk-lessons', false);
          setCheck('cmt-dos-pdf-chk-docs', false);
          setCheck('cmt-dos-pdf-chk-mindmaps', false);
          setCheck('cmt-dos-pdf-chk-remarks', true);
          setCheck('cmt-dos-pdf-chk-signatures', false);
        } else if (preset === 'summary') {
          setCheck('cmt-dos-pdf-chk-profile', true);
          setCheck('cmt-dos-pdf-chk-averages', true);
          setCheck('cmt-dos-pdf-chk-evals', false);
          setCheck('cmt-dos-pdf-chk-comps', false);
          setCheck('cmt-dos-pdf-chk-lessons', false);
          setCheck('cmt-dos-pdf-chk-docs', false);
          setCheck('cmt-dos-pdf-chk-mindmaps', false);
          setCheck('cmt-dos-pdf-chk-remarks', true);
          setCheck('cmt-dos-pdf-chk-signatures', true);
        }

        if (chkRemarks && remarksSub) {
          remarksSub.style.display = chkRemarks.checked ? 'block' : 'none';
        }
        queueDossierPreviewUpdate();
      });
    });

    // Select All / Deselect All
    var btnSelectAll = document.getElementById('cmt-dos-btn-select-all');
    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', function() {
        sidebarEl.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = true; });
        if (chkRemarks && remarksSub) remarksSub.style.display = 'block';
        queueDossierPreviewUpdate();
      });
    }

    var btnDeselectAll = document.getElementById('cmt-dos-btn-deselect-all');
    if (btnDeselectAll) {
      btnDeselectAll.addEventListener('click', function() {
        sidebarEl.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
        if (chkRemarks && remarksSub) remarksSub.style.display = 'none';
        queueDossierPreviewUpdate();
      });
    }

    // Submit / Export handler for PDF
    var submitBtn = document.getElementById('cmt-dos-pdf-btn-submit');
    if (submitBtn) {
      submitBtn.onclick = async function() {
        var options = collectDossierExportOptions();
        await exportDossierPdf(dossier, options);
      };
    }

    // Export handler for HTML
    var exportHtmlBtn = document.getElementById('cmt-dos-btn-export-html');
    if (exportHtmlBtn) {
      exportHtmlBtn.onclick = async function() {
        var options = collectDossierExportOptions();
        await exportDossierHtml(dossier, options);
      };
    }

    // Export handler for Standalone Mindmaps PDF
    if (mmExportBtn) {
      mmExportBtn.onclick = async function() {
        var options = collectDossierExportOptions();
        await exportDossierMindmapsPdf(dossier, options);
      };
    }

    // Initial preview render
    updateDossierPreview(dossier);
  }

  function closeDossierPdfExportModal() {
    var overlay = document.getElementById('cmt-dossier-pdf-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function generateDossierPdfHtml(dossier, options, mindmapCache) {
    options = options || {};
    mindmapCache = mindmapCache || _dossierMindmapCache || {};
    var st = (dossier && dossier.student) || {};
    var gs = (dossier && dossier.gradesSummary) || {};
    var evals = (dossier && dossier.evaluations) || [];
    var comps = (dossier && dossier.competences) || [];
    var lessons = (dossier && dossier.lessons) || [];
    var docs = (dossier && dossier.documents) || [];
    var boards = (dossier && dossier.boards) || [];

    function esc(s) {
      if (s == null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getGradePillClass(score, maxScore) {
      if (score == null || isNaN(score)) return 'neutral';
      var num = Number(score);
      var max = (maxScore && !isNaN(maxScore) && Number(maxScore) > 0) ? Number(maxScore) : 6;
      var ratio = num / max;
      if (ratio >= 0.85) return 'green';
      if (ratio >= 0.70) return 'lime';
      if (ratio >= 0.50) return 'amber';
      return 'red';
    }

    function formatDossierNote(n) {
      if (n == null) return '';
      if (typeof n === 'string' || typeof n === 'number') return String(n).trim();
      if (typeof n === 'object') {
        var checklist = [];
        if (Array.isArray(n.checklist)) {
          checklist = n.checklist.map(function(c) { return String(c || '').trim(); }).filter(Boolean);
        } else if (typeof n.checklist === 'string' && n.checklist.trim()) {
          checklist = [n.checklist.trim()];
        }
        var text = String(n.text || n.comment || n.note || n.feedback || n.content || n.value || n.body || '').trim();
        var label = String(n.label || n.title || '').trim();
        var parts = [];
        if (checklist.length > 0) parts.push(checklist.join(', '));
        if (text) parts.push(text);
        var combined = parts.join(' | ');
        if (label && combined) return label + ': ' + combined;
        else if (label) return label;
        if (combined) return combined;
        try {
          var nonObjKeys = Object.keys(n).filter(function(k) {
            return k !== 'kind' && n[k] != null && typeof n[k] !== 'object' && typeof n[k] !== 'function';
          });
          if (nonObjKeys.length > 0) return nonObjKeys.map(function(k) { return n[k]; }).join(' | ');
        } catch (e) {}
        return '';
      }
      return String(n).trim();
    }

    // Granular Filtering
    var semFilter = options.semesterFilter || 'all';
    var selectedEvalsSet = options.selectedEvals ? new Set(options.selectedEvals) : null;
    var filteredEvals = evals.filter(function(ev, idx) {
      var evId = ev.urn || ('eval_' + idx);
      if (selectedEvalsSet && !selectedEvalsSet.has(evId)) return false;
      if (semFilter === 'sem1') {
        return ev.semester === 'sem1' || (!ev.semester && !String(ev.badge || '').includes('SEM 2'));
      }
      if (semFilter === 'sem2') {
        return ev.semester === 'sem2' || (!ev.semester && !String(ev.badge || '').includes('SEM 1'));
      }
      return true;
    });

    var selectedCompsSet = options.selectedComps ? new Set(options.selectedComps) : null;
    var filteredComps = comps.filter(function(cp, idx) {
      var cpId = cp.urn || ('comp_' + idx);
      return !selectedCompsSet || selectedCompsSet.has(cpId);
    });

    var selectedLessonsSet = options.selectedLessons ? new Set(options.selectedLessons) : null;
    var filteredLessons = lessons.filter(function(ls, idx) {
      var lsId = ls.urn || ('lesson_' + idx);
      return !selectedLessonsSet || selectedLessonsSet.has(lsId);
    });

    var selectedDocsSet = options.selectedDocs ? new Set(options.selectedDocs) : null;
    var filteredDocs = docs.filter(function(dc, idx) {
      var dcId = dc.urn || ('doc_' + idx);
      return !selectedDocsSet || selectedDocsSet.has(dcId);
    });

    var selectedBoardsSet = options.selectedBoards ? new Set(options.selectedBoards) : null;
    var filteredBoards = boards.filter(function(bd, idx) {
      var bdId = bd.urn || ('board_' + idx);
      return !selectedBoardsSet || selectedBoardsSet.has(bdId);
    });

    var dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    var pageSize = options.pageSize === 'Letter' ? 'letter' : 'A4';
    var orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
    var baseFontSize = options.fontScale === 'sm' ? '8.5pt' : (options.fontScale === 'lg' ? '10.5pt' : '9.5pt');

    var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>' + esc(st.name || 'Student') + ' — ' + esc(t('lmDossierPdfDocHeader', 'Academic Dossier') || 'Academic Dossier') + '</title>\n' +
      '<link rel="stylesheet" href="../modules/lexend/lexend.css">\n' +
      '<style>\n' +
      '@page {\n' +
      '  size: ' + pageSize + ' ' + orientation + ';\n' +
      '  margin: 12mm 14mm 14mm 14mm;\n' +
      '}\n' +
      '@media print {\n' +
      '  body {\n' +
      '    -webkit-print-color-adjust: exact;\n' +
      '    print-color-adjust: exact;\n' +
      '    padding: 0 !important;\n' +
      '  }\n' +
      '}\n' +
      '@media screen {\n' +
      '  body {\n' +
      '    padding: 14mm 16mm;\n' +
      '    background: #ffffff;\n' +
      '  }\n' +
      '}\n' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      'body {\n' +
      '  font-family: "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n' +
      '  background: #ffffff;\n' +
      '  color: #111111;\n' +
      '  font-size: ' + baseFontSize + ';\n' +
      '  line-height: 1.35;\n' +
      '  padding: 0;\n' +
      '}\n' +
      '.pdf-header {\n' +
      '  border: 2px solid #333333;\n' +
      '  border-radius: 8px;\n' +
      '  background: #fafaf9;\n' +
      '  padding: 10px 14px;\n' +
      '  margin-bottom: 12px;\n' +
      '  page-break-inside: avoid;\n' +
      '}\n' +
      '.pdf-header-top {\n' +
      '  display: flex;\n' +
      '  justify-content: space-between;\n' +
      '  align-items: center;\n' +
      '  border-bottom: 1.5px solid #333333;\n' +
      '  padding-bottom: 6px;\n' +
      '  margin-bottom: 8px;\n' +
      '}\n' +
      '.pdf-header-title {\n' +
      '  font-size: 13pt;\n' +
      '  font-weight: 900;\n' +
      '  text-transform: uppercase;\n' +
      '  letter-spacing: 0.5px;\n' +
      '  color: #111111;\n' +
      '}\n' +
      '.pdf-header-badge {\n' +
      '  background: #6abf8e;\n' +
      '  color: #111111;\n' +
      '  border: 1.5px solid #333333;\n' +
      '  border-radius: 4px;\n' +
      '  font-size: 8pt;\n' +
      '  font-weight: 800;\n' +
      '  padding: 2px 8px;\n' +
      '  text-transform: uppercase;\n' +
      '}\n' +
      '.pdf-student-meta {\n' +
      '  display: flex;\n' +
      '  flex-wrap: wrap;\n' +
      '  gap: 6px 14px;\n' +
      '  font-size: 8.5pt;\n' +
      '  font-weight: 600;\n' +
      '  color: #333333;\n' +
      '}\n' +
      '.pdf-student-meta-item {\n' +
      '  display: inline-flex;\n' +
      '  align-items: center;\n' +
      '  gap: 4px;\n' +
      '}\n' +
      '.pdf-student-meta-label {\n' +
      '  font-weight: 800;\n' +
      '  text-transform: uppercase;\n' +
      '  font-size: 7.5pt;\n' +
      '  color: #666666;\n' +
      '}\n' +
      '.pdf-perf-bar {\n' +
      '  display: flex;\n' +
      '  flex-wrap: wrap;\n' +
      '  align-items: center;\n' +
      '  gap: 10px;\n' +
      '  background: #ffffff;\n' +
      '  border: 1.5px solid #333333;\n' +
      '  border-radius: 6px;\n' +
      '  padding: 6px 10px;\n' +
      '  margin-bottom: 12px;\n' +
      '  page-break-inside: avoid;\n' +
      '}\n' +
      '.pdf-perf-item {\n' +
      '  display: inline-flex;\n' +
      '  align-items: center;\n' +
      '  gap: 5px;\n' +
      '  font-size: 8.5pt;\n' +
      '  font-weight: 700;\n' +
      '}\n' +
      '.pdf-perf-label {\n' +
      '  color: #555555;\n' +
      '  text-transform: uppercase;\n' +
      '  font-size: 7.5pt;\n' +
      '  letter-spacing: 0.3px;\n' +
      '}\n' +
      '.pdf-grade-pill {\n' +
      '  display: inline-block;\n' +
      '  padding: 1.5px 6px;\n' +
      '  border-radius: 4px;\n' +
      '  border: 1.2px solid #333333;\n' +
      '  font-weight: 900;\n' +
      '  font-size: 8.5pt;\n' +
      '  line-height: 1.2;\n' +
      '}\n' +
      '.pdf-grade-pill.green { background: #dcfce7; color: #166534; }\n' +
      '.pdf-grade-pill.lime { background: #f7fee7; color: #3f6212; }\n' +
      '.pdf-grade-pill.amber { background: #fef3c7; color: #92400e; }\n' +
      '.pdf-grade-pill.red { background: #fee2e2; color: #991b1b; }\n' +
      '.pdf-grade-pill.neutral { background: #f1f5f9; color: #475569; }\n' +
      '.pdf-coeff-pill {\n' +
      '  display: inline-block;\n' +
      '  padding: 1px 5px;\n' +
      '  border-radius: 3px;\n' +
      '  background: #e2e8f0;\n' +
      '  border: 1px solid #64748b;\n' +
      '  font-size: 7pt;\n' +
      '  font-weight: 800;\n' +
      '  color: #334155;\n' +
      '}\n' +
      '.pdf-override-pill {\n' +
      '  display: inline-block;\n' +
      '  padding: 1px 4px;\n' +
      '  border-radius: 3px;\n' +
      '  background: #fed7aa;\n' +
      '  border: 1px solid #c2410c;\n' +
      '  font-size: 7pt;\n' +
      '  font-weight: 900;\n' +
      '  color: #9a3412;\n' +
      '}\n' +
      '.pdf-section {\n' +
      '  margin-bottom: 12px;\n' +
      '  border: 1.5px solid #333333;\n' +
      '  border-radius: 6px;\n' +
      '  background: #ffffff;\n' +
      '  page-break-inside: auto;\n' +
      '}\n' +
      '.pdf-sec-hdr {\n' +
      '  background: #fafaf9;\n' +
      '  border-bottom: 1.5px solid #333333;\n' +
      '  padding: 6px 10px;\n' +
      '  font-size: 8.5pt;\n' +
      '  font-weight: 900;\n' +
      '  text-transform: uppercase;\n' +
      '  letter-spacing: 0.4px;\n' +
      '  display: flex;\n' +
      '  justify-content: space-between;\n' +
      '  align-items: center;\n' +
      '  page-break-inside: avoid;\n' +
      '  page-break-after: avoid;\n' +
      '}\n' +
      '.pdf-sec-count {\n' +
      '  font-size: 7pt;\n' +
      '  font-weight: 900;\n' +
      '  background: #333333;\n' +
      '  color: #ffffff;\n' +
      '  padding: 1px 6px;\n' +
      '  border-radius: 3px;\n' +
      '}\n' +
      '.pdf-sec-list {\n' +
      '  padding: 8px 10px;\n' +
      '  display: flex;\n' +
      '  flex-direction: column;\n' +
      '  gap: 6px;\n' +
      '}\n' +
      '.pdf-item {\n' +
      '  background: #ffffff;\n' +
      '  border: 1px solid #333333;\n' +
      '  border-radius: 4px;\n' +
      '  padding: 6px 8px;\n' +
      '  page-break-inside: avoid;\n' +
      '  break-inside: avoid;\n' +
      '}\n' +
      '.pdf-item-top {\n' +
      '  display: flex;\n' +
      '  align-items: center;\n' +
      '  justify-content: space-between;\n' +
      '  gap: 6px;\n' +
      '  flex-wrap: wrap;\n' +
      '}\n' +
      '.pdf-item-left {\n' +
      '  display: flex;\n' +
      '  align-items: center;\n' +
      '  gap: 6px;\n' +
      '  flex-wrap: wrap;\n' +
      '}\n' +
      '.pdf-badge {\n' +
      '  display: inline-block;\n' +
      '  font-size: 7pt;\n' +
      '  font-weight: 800;\n' +
      '  padding: 1px 5px;\n' +
      '  border-radius: 3px;\n' +
      '  border: 1px solid #333333;\n' +
      '}\n' +
      '.pdf-item-title {\n' +
      '  font-size: 8.5pt;\n' +
      '  font-weight: 800;\n' +
      '  color: #111111;\n' +
      '}\n' +
      '.pdf-item-sub {\n' +
      '  font-size: 7.5pt;\n' +
      '  font-weight: 600;\n' +
      '  color: #555555;\n' +
      '  margin-top: 2px;\n' +
      '}\n' +
      '.pdf-item-notes {\n' +
      '  margin-top: 4px;\n' +
      '  padding: 4px 6px;\n' +
      '  background: #fffbeb;\n' +
      '  border: 1px dashed #d97706;\n' +
      '  border-radius: 3px;\n' +
      '  font-size: 7.5pt;\n' +
      '  font-style: italic;\n' +
      '  color: #78350f;\n' +
      '}\n' +
      '.pdf-item-criteria {\n' +
      '  margin-top: 4px;\n' +
      '  display: flex;\n' +
      '  flex-wrap: wrap;\n' +
      '  gap: 4px;\n' +
      '}\n' +
      '.pdf-crit-chip {\n' +
      '  background: #eff6ff;\n' +
      '  border: 1px solid #93c5fd;\n' +
      '  border-radius: 3px;\n' +
      '  padding: 1px 4px;\n' +
      '  font-size: 7pt;\n' +
      '  font-weight: 700;\n' +
      '  color: #1e40af;\n' +
      '}\n' +
      '.pdf-remarks-box {\n' +
      '  margin-bottom: 12px;\n' +
      '  border: 1.5px solid #333333;\n' +
      '  border-radius: 6px;\n' +
      '  background: #fffdf5;\n' +
      '  padding: 8px 10px;\n' +
      '  page-break-inside: avoid;\n' +
      '  break-inside: avoid;\n' +
      '}\n' +
      '.pdf-remarks-hdr {\n' +
      '  font-size: 8.5pt;\n' +
      '  font-weight: 900;\n' +
      '  text-transform: uppercase;\n' +
      '  color: #92400e;\n' +
      '  margin-bottom: 4px;\n' +
      '  border-bottom: 1px dashed #d97706;\n' +
      '  padding-bottom: 2px;\n' +
      '}\n' +
      '.pdf-remarks-body {\n' +
      '  font-size: 8pt;\n' +
      '  color: #333333;\n' +
      '  white-space: pre-wrap;\n' +
      '  line-height: 1.35;\n' +
      '}\n' +
      '.pdf-signatures {\n' +
      '  margin-top: 14px;\n' +
      '  display: grid;\n' +
      '  grid-template-columns: 1fr 1fr;\n' +
      '  gap: 12px;\n' +
      '  page-break-inside: avoid;\n' +
      '  break-inside: avoid;\n' +
      '}\n' +
      '.pdf-sig-box {\n' +
      '  border: 1.5px solid #333333;\n' +
      '  border-radius: 6px;\n' +
      '  background: #fafaf9;\n' +
      '  padding: 8px 10px;\n' +
      '  min-height: 70px;\n' +
      '  display: flex;\n' +
      '  flex-direction: column;\n' +
      '  justify-content: space-between;\n' +
      '}\n' +
      '.pdf-sig-label {\n' +
      '  font-size: 8pt;\n' +
      '  font-weight: 800;\n' +
      '  text-transform: uppercase;\n' +
      '  color: #333333;\n' +
      '}\n' +
      '.pdf-sig-line {\n' +
      '  border-bottom: 1px solid #666666;\n' +
      '  margin-top: 30px;\n' +
      '  display: flex;\n' +
      '  justify-content: space-between;\n' +
      '  font-size: 7pt;\n' +
      '  color: #777777;\n' +
      '  padding-bottom: 2px;\n' +
      '}\n' +
      '.pdf-footer {\n' +
      '  margin-top: 14px;\n' +
      '  padding-top: 4px;\n' +
      '  border-top: 1px solid #e2e8f0;\n' +
      '  display: flex;\n' +
      '  justify-content: space-between;\n' +
      '  font-size: 7pt;\n' +
      '  color: #666666;\n' +
      '  page-break-inside: avoid;\n' +
      '}\n' +
      '</style>\n</head>\n<body>\n';

    // 1. Header
    if (options.studentProfile !== false) {
      html +=
        '<div class="pdf-header">' +
          '<div class="pdf-header-top">' +
            '<h1 class="pdf-header-title">' + esc(st.name || 'STUDENT DOSSIER') + '</h1>' +
            '<span class="pdf-header-badge">' + esc(t('lmDossierPdfDocHeader', '360° ACADEMIC DOSSIER') || '360° ACADEMIC DOSSIER') + '</span>' +
          '</div>' +
          '<div class="pdf-student-meta">' +
            (st.className ? ('<div class="pdf-student-meta-item"><span class="pdf-student-meta-label">' + esc(t('lmClass', 'Class') || 'Class') + ':</span> <span>' + esc(st.className) + '</span></div>') : '') +
            (st.level ? ('<div class="pdf-student-meta-item"><span class="pdf-student-meta-label">' + esc(t('lmLevel', 'Level') || 'Level') + ':</span> <span>' + esc(st.level.toUpperCase()) + '</span></div>') : '') +
            (st.id ? ('<div class="pdf-student-meta-item"><span class="pdf-student-meta-label">ID:</span> <span>' + esc(st.id) + '</span></div>') : '') +
            ('<div class="pdf-student-meta-item" style="margin-left:auto;"><span class="pdf-student-meta-label">' + esc(t('lmDossierPdfDateLabel', 'Date:') || 'Date:') + '</span> <span>' + esc(dateStr) + '</span></div>') +
          '</div>' +
        '</div>';
    }

    // 2. Academic Performance Bar
    if (options.academicPerformance !== false) {
      var hasAvgs = (gs.yearAverage != null || gs.sem1Average != null || gs.sem2Average != null || gs.gradedCount > 0);
      if (hasAvgs) {
        html += '<div class="pdf-perf-bar">';
        if (semFilter !== 'sem2' && gs.sem1Average != null) {
          html +=
            '<div class="pdf-perf-item">' +
              '<span class="pdf-perf-label">' + esc(t('lmDossierSem1Avg', 'S1 Average') || 'S1 Average') + ':</span>' +
              '<span class="pdf-grade-pill ' + getGradePillClass(gs.sem1Average, 6) + '">' + esc(gs.sem1Average) + '</span>' +
            '</div>';
        }
        if (semFilter !== 'sem1' && gs.sem2Average != null) {
          html +=
            '<div class="pdf-perf-item">' +
              '<span class="pdf-perf-label">' + esc(t('lmDossierSem2Avg', 'S2 Average') || 'S2 Average') + ':</span>' +
              '<span class="pdf-grade-pill ' + getGradePillClass(gs.sem2Average, 6) + '">' + esc(gs.sem2Average) + '</span>' +
            '</div>';
        }
        if (semFilter === 'all' && gs.yearAverage != null) {
          html +=
            '<div class="pdf-perf-item" style="border-left:1.5px solid #333;padding-left:10px;">' +
              '<span class="pdf-perf-label" style="font-weight:900;color:#111;">' + esc(t('lmDossierYearAvg', 'Annual Avg') || 'Annual Avg') + ':</span>' +
              '<span class="pdf-grade-pill ' + getGradePillClass(gs.yearAverage, 6) + '" style="font-size:9pt;">' + esc(gs.yearAverage) + '</span>' +
            '</div>';
        }
        if (gs.totalTests > 0) {
          var countText = (t('lmDossierGradedCount', '{count} of {total} assessments graded') || '{count} of {total} assessments graded')
            .replace('{count}', gs.gradedCount || 0)
            .replace('{total}', gs.totalTests || 0);
          html += '<div class="pdf-perf-item" style="margin-left:auto;color:#555;font-size:7.5pt;">' + esc(countText) + '</div>';
        }
        html += '</div>';
      }
    }

    // 3. Evaluations Section
    if (options.evaluations !== false) {
      html +=
        '<div class="pdf-section">' +
          '<div class="pdf-sec-hdr">' +
            '<span>1. ' + esc(t('lmDossierPdfSecEvals', 'EVALUATIONS & ASSESSMENTS') || 'EVALUATIONS & ASSESSMENTS') + '</span>' +
            '<span class="pdf-sec-count">' + filteredEvals.length + '</span>' +
          '</div>' +
          '<div class="pdf-sec-list">';

      if (!filteredEvals.length) {
        html += '<div style="font-size:8pt;color:#666;padding:4px;">' + esc(t('lmNoEvalsStudent', 'No evaluations recorded for this student.')) + '</div>';
      } else {
        filteredEvals.forEach(function(evItem) {
          var isGsTest = evItem.type === 'gradesheet' || evItem.source === 'gradesheet' || (evItem.score !== undefined);
          var scoreVal = evItem.score;
          var maxScore = evItem.maxScore;
          var pillClass = isGsTest ? getGradePillClass(scoreVal, maxScore) : 'neutral';
          var scoreFormatted = scoreVal != null ? (scoreVal + (maxScore ? (' / ' + maxScore) : '')) : t('lmDossierNoScore', 'No grade recorded');
          var coeff = evItem.coefficient;
          var fixedW = evItem.fixedWeight;
          var isOverridden = !!evItem.isOverridden;

          var rawNotes = Array.isArray(evItem.testNotes) && evItem.testNotes.length > 0
            ? evItem.testNotes
            : (evItem.meta && Array.isArray(evItem.meta.testNotes) ? evItem.meta.testNotes : (evItem.testNotes ? [evItem.testNotes] : []));
          var notes = rawNotes.map(formatDossierNote).map(function(s) { return s.trim(); }).filter(Boolean);
          var critRes = evItem.criteriaResults || {};
          var critList = Array.isArray(evItem.criteria) ? evItem.criteria : [];

          html +=
            '<div class="pdf-item">' +
              '<div class="pdf-item-top">' +
                '<div class="pdf-item-left">' +
                  '<span class="pdf-badge" style="background:#5b8fcc;color:#fff;">' + esc(evItem.badge || '[EVAL]') + '</span>' +
                  '<span class="pdf-item-title">' + esc(evItem.title || evItem.urn) + '</span>' +
                  (isGsTest ? ('<span class="pdf-grade-pill ' + pillClass + '">' + esc(scoreFormatted) + '</span>') : '') +
                  (isGsTest && fixedW != null ? ('<span class="pdf-coeff-pill">Fixed: ' + esc(fixedW) + '%</span>') :
                    (isGsTest && coeff != null && coeff !== 1 ? ('<span class="pdf-coeff-pill">Coeff: ' + esc(coeff) + '</span>') : '')) +
                  (isOverridden ? ('<span class="pdf-override-pill">' + esc(t('lmDossierOverrideBadge', 'OVERRIDE') || 'OVERRIDE') + '</span>') : '') +
                '</div>' +
                (evItem.testDate ? ('<div class="pdf-item-date" style="font-size:7.5pt;color:#666;">' + esc(evItem.testDate) + '</div>') : '') +
              '</div>' +
              (evItem.subtitle && !isGsTest ? ('<div class="pdf-item-sub">' + esc(evItem.subtitle) + '</div>') : '');

          if (options.includeNotes !== false && notes.length > 0) {
            html += '<div class="pdf-item-notes">💬 ' + esc(notes.join(' • ')) + '</div>';
          }

          if (options.includeCriteria !== false && critList.length > 0 && Object.keys(critRes).length > 0) {
            var critChips = critList.map(function(cr) {
              var r = critRes[cr.id];
              if (!r || r.points == null) return '';
              return '<span class="pdf-crit-chip">' + esc(cr.name || cr.label || cr.id) + ': <b>' + esc(r.points) + '</b>' + (cr.maxPoints ? ('/' + esc(cr.maxPoints)) : '') + '</span>';
            }).filter(Boolean);
            if (critChips.length > 0) {
              html += '<div class="pdf-item-criteria">' + critChips.join('') + '</div>';
            }
          }

          html += '</div>';
        });
      }
      html += '</div></div>';
    }

    // 4. Competences Section
    if (options.competences !== false) {
      html +=
        '<div class="pdf-section">' +
          '<div class="pdf-sec-hdr">' +
            '<span>2. ' + esc(t('lmGroupCompetences', 'CURRICULUM COMPETENCES & RUBRICS') || 'CURRICULUM COMPETENCES & RUBRICS') + '</span>' +
            '<span class="pdf-sec-count">' + filteredComps.length + '</span>' +
          '</div>' +
          '<div class="pdf-sec-list">';
      if (!filteredComps.length) {
        html += '<div style="font-size:8pt;color:#666;padding:4px;">' + esc(t('lmNoCompsStudent', 'No curriculum competences linked yet.')) + '</div>';
      } else {
        filteredComps.forEach(function(cpItem) {
          html +=
            '<div class="pdf-item">' +
              '<div class="pdf-item-top">' +
                '<div class="pdf-item-left">' +
                  '<span class="pdf-badge" style="background:#6abf8e;color:#111;">' + esc(cpItem.badge || '[COMPETENCE]') + '</span>' +
                  '<span class="pdf-item-title">' + esc(cpItem.title || cpItem.urn) + '</span>' +
                '</div>' +
              '</div>' +
              (cpItem.subtitle ? ('<div class="pdf-item-sub">' + esc(cpItem.subtitle) + '</div>') : '') +
            '</div>';
        });
      }
      html += '</div></div>';
    }

    // 5. Lessons Section
    if (options.lessons !== false) {
      html +=
        '<div class="pdf-section">' +
          '<div class="pdf-sec-hdr">' +
            '<span>3. ' + esc(t('lmDossierDeliveredLessons', 'DELIVERED LESSON PLANS & TIMETABLE') || 'DELIVERED LESSON PLANS & TIMETABLE') + '</span>' +
            '<span class="pdf-sec-count">' + filteredLessons.length + '</span>' +
          '</div>' +
          '<div class="pdf-sec-list">';
      if (!filteredLessons.length) {
        html += '<div style="font-size:8pt;color:#666;padding:4px;">' + esc(t('lmNoLessonsStudent', 'No lesson plans linked to cohort.')) + '</div>';
      } else {
        filteredLessons.forEach(function(lsItem) {
          html +=
            '<div class="pdf-item">' +
              '<div class="pdf-item-top">' +
                '<div class="pdf-item-left">' +
                  '<span class="pdf-badge" style="background:#e2c96e;color:#111;">' + esc(lsItem.badge || '[LESSON]') + '</span>' +
                  '<span class="pdf-item-title">' + esc(lsItem.title || lsItem.urn) + '</span>' +
                '</div>' +
              '</div>' +
              (lsItem.subtitle ? ('<div class="pdf-item-sub">' + esc(lsItem.subtitle) + '</div>') : '') +
            '</div>';
        });
      }
      html += '</div></div>';
    }

    // 6. Documents & Work Section
    if (options.work !== false) {
      html +=
        '<div class="pdf-section">' +
          '<div class="pdf-sec-hdr">' +
            '<span>4. ' + esc(t('lmDossierDocAttachments', 'DOCUMENTS & WORK ATTACHMENTS') || 'DOCUMENTS & WORK ATTACHMENTS') + '</span>' +
            '<span class="pdf-sec-count">' + filteredDocs.length + '</span>' +
          '</div>' +
          '<div class="pdf-sec-list">';
      if (!filteredDocs.length) {
        html += '<div style="font-size:8pt;color:#666;padding:4px;">' + esc(t('lmNoDocsStudent', 'No individual documents or work attached.')) + '</div>';
      } else {
        filteredDocs.forEach(function(docItem) {
          html +=
            '<div class="pdf-item">' +
              '<div class="pdf-item-top">' +
                '<div class="pdf-item-left">' +
                  '<span class="pdf-badge" style="background:#8b7cc2;color:#fff;">' + esc(docItem.badge || '[DOC]') + '</span>' +
                  '<span class="pdf-item-title">' + esc(docItem.title || docItem.urn) + '</span>' +
                '</div>' +
              '</div>' +
              (docItem.subtitle ? ('<div class="pdf-item-sub">' + esc(docItem.subtitle) + '</div>') : '') +
            '</div>';
        });
      }
      html += '</div></div>';
    }

    // 7. Mindmaps & Constellations Section
    if (options.mindmaps !== false) {
      var mmMode = options.mindmapMode || 'diagram';
      html +=
        '<div class="pdf-section">' +
          '<div class="pdf-sec-hdr">' +
            '<span>5. ' + esc(t('lmDossierLinkedDocs', 'BOARD CONSTELLATION MINDMAPS') || 'BOARD CONSTELLATION MINDMAPS') + '</span>' +
            '<span class="pdf-sec-count">' + filteredBoards.length + '</span>' +
          '</div>' +
          '<div class="pdf-sec-list">';
      if (!filteredBoards.length) {
        html += '<div style="font-size:8pt;color:#666;padding:4px;">' + esc(t('lmNoDocsStudent', 'No linked board mindmaps.')) + '</div>';
      } else {
        filteredBoards.forEach(function(bdItem) {
          var bUrn = bdItem.urn || '';
          var rel = bUrn.replace(/^cmt:board:/, '').replace(/^user\/mindmaps\//, '');
          var bData = mindmapCache[rel] || null;

          html +=
            '<div class="pdf-item">' +
              '<div class="pdf-item-top">' +
                '<div class="pdf-item-left">' +
                  '<span class="pdf-badge" style="background:#3b82f6;color:#fff;">' + esc(bdItem.badge || '[MINDMAP]') + '</span>' +
                  '<span class="pdf-item-title">' + esc(bdItem.title || bdItem.urn) + '</span>' +
                '</div>' +
              '</div>' +
              (bdItem.subtitle ? ('<div class="pdf-item-sub">' + esc(bdItem.subtitle) + '</div>') : '');

          if (bData && (mmMode === 'diagram' || mmMode === 'full')) {
            html += '<div class="pdf-mindmap-container" style="margin-top:8px;">' + renderMindmapSessionToSvg(bData) + '</div>';
          }
          if (bData && mmMode === 'full') {
            html += renderMindmapConceptsTable(bData);
          }

          html += '</div>';
        });
      }
      html += '</div></div>';
    }

    // 8. Overall Teacher Remarks
    if (options.teacherRemarks && options.remarksText && options.remarksText.trim()) {
      html +=
        '<div class="pdf-remarks-box">' +
          '<div class="pdf-remarks-hdr">' + esc(t('lmDossierPdfSecRemarks', 'Overall Teacher Remarks / General Feedback') || 'Overall Teacher Remarks / General Feedback') + '</div>' +
          '<div class="pdf-remarks-body">' + esc(options.remarksText.trim()) + '</div>' +
        '</div>';
    }

    // 9. Signatures Block
    if (options.signatureBlock) {
      html +=
        '<div class="pdf-signatures">' +
          '<div class="pdf-sig-box">' +
            '<div class="pdf-sig-label">' + esc(t('lmDossierPdfSigTeacher', 'Teacher Signature & Date') || 'Teacher Signature & Date') + '</div>' +
            '<div class="pdf-sig-line"><span>' + esc(t('lmDossierPdfDateLabel', 'Date:') || 'Date:') + '</span><span>Signature:</span></div>' +
          '</div>' +
          '<div class="pdf-sig-box">' +
            '<div class="pdf-sig-label">' + esc(t('lmDossierPdfSigParents', 'Parent / Guardian Signature & Date') || 'Parent / Guardian Signature & Date') + '</div>' +
            '<div class="pdf-sig-line"><span>' + esc(t('lmDossierPdfDateLabel', 'Date:') || 'Date:') + '</span><span>Signature:</span></div>' +
          '</div>' +
        '</div>';
    }

    // 10. Footer
    html +=
      '<div class="pdf-footer">' +
        '<span>' + esc(t('lmDossierPdfDocHeader', 'Class Management Tools — Academic Dossier') || 'Class Management Tools — Academic Dossier') + '</span>' +
        '<span>' + esc(st.name || '') + (st.className ? ' (' + esc(st.className) + ')' : '') + ' • ' + esc(dateStr) + '</span>' +
      '</div>';

    html += '</body>\n</html>';
    return html;
  }

  async function exportDossierPdf(dossier, options) {
    if (!dossier) return;
    options = options || {};
    var st = dossier.student || {};
    var cleanName = (st.name || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var cleanClass = (st.className || 'class').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var dateStamp = new Date().toISOString().slice(0, 10);
    var defaultName = 'dossier_' + cleanName + '_' + cleanClass + '_' + dateStamp + '.pdf';

    // Ensure mindmaps cached
    if (options.mindmaps !== false && Array.isArray(options.selectedBoards)) {
      for (var i = 0; i < options.selectedBoards.length; i++) {
        await loadBoardMindmapData(options.selectedBoards[i]);
      }
    }

    var htmlDoc = generateDossierPdfHtml(dossier, options, _dossierMindmapCache);

    if (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) {
      try {
        var destRes = null;
        if (typeof window.promptExportDestination === 'function') {
          destRes = await window.promptExportDestination({
            title: t('lmDossierPdfModalTitle', 'Student 360° Academic Dossier — Export Studio') || 'Student 360° Academic Dossier — Export Studio',
            prompt: t('exportDestinationPrompt', 'Where do you want to save the exported file?') || 'Where do you want to save the exported file?',
            filename: defaultName,
            allowDocEditor: false
          });
          if (!destRes || destRes.canceled) return;
        }

        var targetFilename = (destRes && destRes.filename) ? destRes.filename : defaultName;
        var isLandscape = options.orientation === 'landscape';
        var pdfReq = {
          html: htmlDoc,
          landscape: isLandscape,
          pdfOptions: {
            pageSize: options.pageSize || 'A4',
            landscape: isLandscape,
            printBackground: true
          }
        };

        if (destRes && destRes.destination === 'to-print') {
          pdfReq.target = 'toPrint';
          pdfReq.filename = targetFilename;
        } else {
          pdfReq.defaultName = targetFilename;
        }

        var res = await Desktop.printPdf(pdfReq);
        if (res && res.ok) {
          closeDossierPdfExportModal();
          var successMsg = (destRes && destRes.destination === 'to-print')
            ? ((t('deExportPdfToPrintSuccess', 'PDF saved to Print folder: ') || 'PDF saved to Print folder: ') + (res.name || targetFilename))
            : (t('lmDossierPdfExportSuccess', 'Student Academic Dossier PDF exported successfully!') || 'Student Academic Dossier PDF exported successfully!');
          if (typeof window.showToast === 'function') {
            window.showToast(successMsg);
          }
          if (typeof window.showExportSuccessPopup === 'function' && res.path) {
            window.showExportSuccessPopup(res.path, res.name || targetFilename);
          }
        } else if (res && !res.ok && !res.canceled) {
          if (typeof window.showToast === 'function') {
            window.showToast((t('lmDossierPdfExportError', 'Failed to export Student Dossier PDF') || 'Failed to export Student Dossier PDF') + (res.error ? (': ' + res.error) : ''), true);
          }
        }
      } catch (err) {
        console.error('exportDossierPdf error:', err);
        if (typeof window.showToast === 'function') {
          window.showToast((t('lmDossierPdfExportError', 'Failed to export Student Dossier PDF') || 'Failed to export Student Dossier PDF') + ': ' + (err.message || err), true);
        }
      }
    } else {
      // Browser fallback
      var win = window.open('', '_blank');
      if (win && win.document) {
        win.document.write(htmlDoc);
        win.document.close();
        win.focus();
        setTimeout(function() {
          try { win.print(); } catch (e) {}
        }, 400);
        closeDossierPdfExportModal();
      } else {
        var blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = defaultName.replace(/\.pdf$/, '.html');
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 200);
        closeDossierPdfExportModal();
      }
    }
  }

  async function exportDossierHtml(dossier, options) {
    if (!dossier) return;
    options = options || {};
    var st = dossier.student || {};
    var cleanName = (st.name || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var cleanClass = (st.className || 'class').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var dateStamp = new Date().toISOString().slice(0, 10);
    var defaultName = 'dossier_' + cleanName + '_' + cleanClass + '_' + dateStamp + '.html';

    // Ensure mindmaps cached
    if (options.mindmaps !== false && Array.isArray(options.selectedBoards)) {
      for (var i = 0; i < options.selectedBoards.length; i++) {
        await loadBoardMindmapData(options.selectedBoards[i]);
      }
    }

    var htmlDoc = generateDossierPdfHtml(dossier, options, _dossierMindmapCache);

    if (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) {
      try {
        var destRes = null;
        if (typeof window.promptExportDestination === 'function') {
          destRes = await window.promptExportDestination({
            title: t('lmDossierPdfModalTitle', 'Student 360° Academic Dossier — Export Studio') || 'Student 360° Academic Dossier — Export Studio',
            prompt: t('exportDestinationPrompt', 'Where do you want to save the exported file?') || 'Where do you want to save the exported file?',
            filename: defaultName,
            allowDocEditor: true
          });
          if (!destRes || destRes.canceled) return;
        }

        var targetFilename = (destRes && destRes.filename) ? destRes.filename : defaultName;
        var saveTarget = 'docEditorDocs';
        if (destRes && destRes.destination === 'to-print') saveTarget = 'toPrint';
        else if (destRes && destRes.destination === 'custom') saveTarget = 'custom';

        var savedPath = '';
        if (saveTarget === 'custom' && destRes.customPath) {
          var saveRes = await Desktop.saveFile(destRes.customPath, htmlDoc);
          if (saveRes && saveRes.ok) savedPath = destRes.customPath;
        } else {
          var resSave = await Desktop.saveText(saveTarget, targetFilename, htmlDoc);
          if (resSave && resSave.ok) savedPath = resSave.path || targetFilename;
        }

        closeDossierPdfExportModal();
        if (typeof window.showToast === 'function') {
          window.showToast(t('lmDossierHtmlExportSuccess', 'Student Academic Dossier HTML exported successfully!') || 'Student Academic Dossier HTML exported successfully!');
        }
        if (typeof window.showExportSuccessPopup === 'function' && savedPath) {
          window.showExportSuccessPopup(savedPath, targetFilename);
        }
      } catch (err) {
        console.error('exportDossierHtml error:', err);
        if (typeof window.showToast === 'function') {
          window.showToast((t('lmDossierHtmlExportError', 'Failed to export Student Dossier HTML') || 'Failed to export Student Dossier HTML') + ': ' + (err.message || err), true);
        }
      }
    } else {
      // Browser download
      var blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      closeDossierPdfExportModal();
    }
  }

  async function exportDossierMindmapsPdf(dossier, options) {
    if (!dossier) return;
    options = options || {};
    var st = dossier.student || {};
    var boards = dossier.boards || [];
    var selectedBoards = options.selectedBoards || boards.map(function(b) { return b.urn; });

    if (!selectedBoards.length) {
      if (typeof window.showToast === 'function') {
        window.showToast(t('lmDossierNoMindmapsSelected', 'No mindmaps selected for export.') || 'No mindmaps selected for export.', true);
      }
      return;
    }

    var cleanName = (st.name || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var dateStamp = new Date().toISOString().slice(0, 10);
    var defaultName = 'mindmaps_' + cleanName + '_' + dateStamp + '.pdf';

    // Pre-load all selected boards
    for (var i = 0; i < selectedBoards.length; i++) {
      await loadBoardMindmapData(selectedBoards[i]);
    }

    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    var pageSize = options.pageSize === 'Letter' ? 'letter' : 'A4';
    var orientation = 'landscape'; // Default to landscape for wide mindmap diagrams

    var fullHtml = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>' + esc(st.name || 'Student') + ' — Mindmaps Booklet</title>\n<style>\n' +
      '@page { size: ' + pageSize + ' ' + orientation + '; margin: 12mm 14mm; }\n' +
      '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }\n' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      'body { font-family: "Lexend", sans-serif; background: #fff; color: #111; padding: 0; }\n' +
      '.page { page-break-after: always; break-after: page; padding-bottom: 20px; }\n' +
      '.page:last-child { page-break-after: avoid; break-after: avoid; }\n' +
      '.mm-hdr { border: 2px solid #333; border-radius: 6px; background: #fafaf9; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }\n' +
      '.mm-title { font-size: 13pt; font-weight: 900; text-transform: uppercase; }\n' +
      '.mm-meta { font-size: 8pt; font-weight: 700; color: #555; }\n' +
      '</style>\n</head>\n<body>\n';

    selectedBoards.forEach(function(bUrn, idx) {
      var rel = bUrn.replace(/^cmt:board:/, '').replace(/^user\/mindmaps\//, '');
      var bData = _dossierMindmapCache[rel];
      var bTitle = (bData && bData.title) ? bData.title : rel.replace(/\.(cstz|json|zip)$/i, '').replace(/_/g, ' ');

      fullHtml += '<div class="page">\n' +
        '<div class="mm-hdr">' +
          '<div>' +
            '<h2 class="mm-title">' + (idx + 1) + '. ' + esc(bTitle) + '</h2>' +
            '<div class="mm-meta">' + esc(st.name || '') + (st.className ? ' (' + esc(st.className) + ')' : '') + ' • ' + esc(dateStr) + '</div>' +
          '</div>' +
          '<span style="background:#3b82f6;color:#fff;border:1.5px solid #333;border-radius:4px;padding:2px 8px;font-size:8pt;font-weight:800;">[CONSTELLATION MINDMAP]</span>' +
        '</div>\n';

      if (bData) {
        fullHtml += '<div style="margin-bottom:12px;">' + renderMindmapSessionToSvg(bData) + '</div>\n';
        fullHtml += renderMindmapConceptsTable(bData);
      } else {
        fullHtml += '<div style="padding:20px;text-align:center;color:#666;font-style:italic;">Could not load mindmap data for ' + esc(rel) + '</div>';
      }

      fullHtml += '</div>\n';
    });

    fullHtml += '</body>\n</html>';

    if (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) {
      try {
        var destRes = null;
        if (typeof window.promptExportDestination === 'function') {
          destRes = await window.promptExportDestination({
            title: t('lmDossierExportMindmapsBtn', 'Export Mindmaps PDF') || 'Export Mindmaps PDF',
            prompt: t('exportDestinationPrompt', 'Where do you want to save the exported file?') || 'Where do you want to save the exported file?',
            filename: defaultName,
            allowDocEditor: false
          });
          if (!destRes || destRes.canceled) return;
        }

        var targetFilename = (destRes && destRes.filename) ? destRes.filename : defaultName;
        var pdfReq = {
          html: fullHtml,
          landscape: true,
          pdfOptions: {
            pageSize: options.pageSize || 'A4',
            landscape: true,
            printBackground: true
          }
        };

        if (destRes && destRes.destination === 'to-print') {
          pdfReq.target = 'toPrint';
          pdfReq.filename = targetFilename;
        } else {
          pdfReq.defaultName = targetFilename;
        }

        var res = await Desktop.printPdf(pdfReq);
        if (res && res.ok) {
          if (typeof window.showToast === 'function') {
            window.showToast(t('lmDossierMindmapsExportSuccess', 'Student Mindmaps PDF exported successfully!') || 'Student Mindmaps PDF exported successfully!');
          }
          if (typeof window.showExportSuccessPopup === 'function' && res.path) {
            window.showExportSuccessPopup(res.path, res.name || targetFilename);
          }
        }
      } catch (err) {
        console.error('exportDossierMindmapsPdf error:', err);
      }
    }
  }

  async function openStudentDossier(studentId, opts) {
    if (!studentId) return;
    ensureDossierDom();
    var cleanId = String(studentId).replace(/^cmt:student:/, '');
    _activeDossierUrn = 'cmt:student:' + cleanId;

    var overlay = document.getElementById('cmt-dossier-modal-overlay');
    var nameEl = document.getElementById('cmt-dos-name');
    var subEl = document.getElementById('cmt-dos-sub');
    var bodyEl = document.getElementById('cmt-dos-body');

    overlay.classList.add('open');
    if (document.body) document.body.classList.add('cmt-modal-open');
    bodyEl.innerHTML = '<div class="cmt-lm-empty">' + t('lmLoading', 'Loading 360° academic dossier...') + '</div>';

    var dossier = null;
    if (window.LinksService && typeof window.LinksService.getStudentAcademicDossier === 'function') {
      dossier = await window.LinksService.getStudentAcademicDossier(cleanId);
    }
    _currentDossierData = dossier;

    if (!dossier || !dossier.student) {
      bodyEl.innerHTML = '<div class="cmt-lm-empty">' + t('lmNoDossierData', 'Could not load student dossier.') + '</div>';
      return;
    }

    var st = dossier.student;
    nameEl.textContent = st.name;
    var subParts = [];
    if (st.className) subParts.push((t('lmClass', 'Class') || 'Class') + ': ' + st.className);
    if (st.level) subParts.push((t('lmLevel', 'Level') || 'Level') + ': ' + st.level.toUpperCase());
    if (st.id) subParts.push('ID: ' + st.id);
    subEl.textContent = subParts.join(' • ');

    var iconSrc = getLinksIconPath();

    // Reset toggle-all button
    var toggleAllBtn = document.getElementById('cmt-dos-btn-toggle-all');
    if (toggleAllBtn) {
      toggleAllBtn.textContent = '[' + (t('lmCollapseAll', 'COLLAPSE ALL') || 'COLLAPSE ALL').toUpperCase() + ']';
    }

    // Render Metrics & Sections
    var html =
      '<div class="cmt-dossier-metrics">' +
        '<div class="cmt-dossier-metric-card">' +
          '<span class="cmt-dossier-metric-num tests">' + dossier.evaluations.length + '</span>' +
          '<span class="cmt-dossier-metric-label">' + t('lmDossierStatsTests', 'Evaluations & Tests') + '</span>' +
        '</div>' +
        '<div class="cmt-dossier-metric-card">' +
          '<span class="cmt-dossier-metric-num comps">' + dossier.competences.length + '</span>' +
          '<span class="cmt-dossier-metric-label">' + t('lmDossierStatsComps', 'Assessed Competences') + '</span>' +
        '</div>' +
        '<div class="cmt-dossier-metric-card">' +
          '<span class="cmt-dossier-metric-num lessons">' + dossier.lessons.length + '</span>' +
          '<span class="cmt-dossier-metric-label">' + t('lmDossierStatsLessons', 'Delivered Lessons') + '</span>' +
        '</div>' +
        '<div class="cmt-dossier-metric-card">' +
          '<span class="cmt-dossier-metric-num docs">' + (dossier.documents.length + dossier.boards.length) + '</span>' +
          '<span class="cmt-dossier-metric-label">' + t('lmDossierStatsDocs', 'Work, Files & Mindmaps') + '</span>' +
        '</div>' +
      '</div>';

    // Grade styling helper
    function getGradePillClass(score, maxScore) {
      if (score == null || isNaN(score)) return 'neutral';
      var num = Number(score);
      var max = (maxScore && !isNaN(maxScore) && Number(maxScore) > 0) ? Number(maxScore) : 6;
      var ratio = num / max;
      if (ratio >= 0.85) return 'green';
      if (ratio >= 0.70) return 'lime';
      if (ratio >= 0.50) return 'amber';
      return 'red';
    }

    // Note / Observation section formatting helper
    function formatDossierNote(n) {
      if (n == null) return '';
      if (typeof n === 'string' || typeof n === 'number') {
        return String(n).trim();
      }
      if (typeof n === 'object') {
        var checklist = [];
        if (Array.isArray(n.checklist)) {
          checklist = n.checklist.map(function(c) { return String(c || '').trim(); }).filter(Boolean);
        } else if (typeof n.checklist === 'string' && n.checklist.trim()) {
          checklist = [n.checklist.trim()];
        }

        var text = String(n.text || n.comment || n.note || n.feedback || n.content || n.value || n.body || '').trim();
        var label = String(n.label || n.title || '').trim();

        var parts = [];
        if (checklist.length > 0) {
          parts.push(checklist.join(', '));
        }
        if (text) {
          parts.push(text);
        }

        var combined = parts.join(' | ');
        if (label && combined) {
          return label + ': ' + combined;
        } else if (label) {
          return label;
        }
        if (combined) return combined;

        try {
          var nonObjKeys = Object.keys(n).filter(function(k) {
            return k !== 'kind' && n[k] != null && typeof n[k] !== 'object' && typeof n[k] !== 'function';
          });
          if (nonObjKeys.length > 0) {
            return nonObjKeys.map(function(k) { return n[k]; }).join(' | ');
          }
        } catch (e) {}
        return '';
      }
      return String(n).trim();
    }

    var gs = dossier.gradesSummary || {};
    var hasAverages = (gs.yearAverage != null || gs.sem1Average != null || gs.sem2Average != null || gs.gradedCount > 0);

    // Section 1: Evaluations & Tests
    html +=
      '<div class="cmt-dossier-sec">' +
        '<div class="cmt-dossier-sec-hdr">' +
          '<span class="cmt-dossier-sec-title"><span class="cmt-dossier-sec-chevron">▼</span> <img src="' + iconSrc + '" class="cmt-lm-inline-icon" alt="" /> ' + (t('lmDossierAssessedComps', '1. EVALUATIONS & TESTS') || '1. EVALUATIONS & TESTS') + '</span>' +
          '<span class="cmt-dossier-sec-count">' + dossier.evaluations.length + '</span>' +
        '</div>';

    if (hasAverages) {
      html +=
        '<div class="cmt-dossier-perf-bar">' +
          (gs.sem1Average != null ?
            ('<div class="cmt-dossier-perf-item">' +
              '<span class="cmt-dossier-perf-label">' + (t('lmDossierSem1Avg', 'S1 Average') || 'S1 Average') + ':</span>' +
              '<span class="cmt-dossier-grade-pill ' + getGradePillClass(gs.sem1Average, 6) + '">' + gs.sem1Average + '</span>' +
            '</div>') : '') +
          (gs.sem2Average != null ?
            ('<div class="cmt-dossier-perf-item">' +
              '<span class="cmt-dossier-perf-label">' + (t('lmDossierSem2Avg', 'S2 Average') || 'S2 Average') + ':</span>' +
              '<span class="cmt-dossier-grade-pill ' + getGradePillClass(gs.sem2Average, 6) + '">' + gs.sem2Average + '</span>' +
            '</div>') : '') +
          (gs.yearAverage != null ?
            ('<div class="cmt-dossier-perf-item" style="border-color:#333;background:#fafaf9;">' +
              '<span class="cmt-dossier-perf-label" style="font-weight:900;color:#111;">' + (t('lmDossierYearAvg', 'Annual Avg') || 'Annual Avg') + ':</span>' +
              '<span class="cmt-dossier-grade-pill ' + getGradePillClass(gs.yearAverage, 6) + '" style="font-size:0.82rem;">' + gs.yearAverage + '</span>' +
            '</div>') : '') +
          (gs.totalTests > 0 ?
            ('<div class="cmt-dossier-perf-item" style="margin-left:auto;background:none;border:none;box-shadow:none;color:#555;font-size:0.68rem;">' +
              (t('lmDossierGradedCount', '{count} of {total} assessments graded') || '{count} of {total} assessments graded').replace('{count}', gs.gradedCount || 0).replace('{total}', gs.totalTests || 0) +
            '</div>') : '') +
        '</div>';
    }

    html += '<div class="cmt-dossier-sec-list">';
    if (!dossier.evaluations.length) {
      html += '<div class="cmt-lm-empty" style="padding:6px 0;">' + t('lmNoEvalsStudent', 'No evaluations recorded for this student.') + '</div>';
    } else {
      var isSub = typeof window !== 'undefined' && window.location.pathname.includes('/pages/');
      var gsIcon = (isSub ? '../' : '') + 'assets/icons/grade-sheet.svg';
      dossier.evaluations.forEach(function(evItem) {
        var isGsTest = evItem.type === 'gradesheet' || evItem.source === 'gradesheet' || (evItem.score !== undefined);
        var scoreVal = evItem.score;
        var maxScore = evItem.maxScore;
        var pillClass = isGsTest ? getGradePillClass(scoreVal, maxScore) : 'neutral';
        var scoreFormatted = scoreVal != null ? (scoreVal + (maxScore ? (' / ' + maxScore) : '')) : t('lmDossierNoScore', 'No grade recorded');
        var coeff = evItem.coefficient;
        var fixedW = evItem.fixedWeight;
        var isOverridden = !!evItem.isOverridden;
        var rawNotes = Array.isArray(evItem.testNotes) && evItem.testNotes.length > 0
          ? evItem.testNotes
          : (evItem.meta && Array.isArray(evItem.meta.testNotes) ? evItem.meta.testNotes : (evItem.testNotes ? [evItem.testNotes] : []));
        var notes = rawNotes.map(formatDossierNote).map(function(s) { return s.trim(); }).filter(Boolean);
        var critRes = evItem.criteriaResults || {};
        var critList = Array.isArray(evItem.criteria) ? evItem.criteria : [];

        html +=
          '<div class="cmt-dossier-item">' +
            '<div class="cmt-dossier-item-info">' +
              '<div class="cmt-dossier-item-top">' +
                '<span class="cmt-lm-badge" style="background:#5b8fcc;color:#fff;">' + (evItem.badge || '[EVAL]') + '</span>' +
                '<span class="cmt-dossier-item-title">' + (evItem.title || evItem.urn) + '</span>' +
                (isGsTest ?
                  ('<span class="cmt-dossier-grade-pill ' + pillClass + '">' + scoreFormatted + '</span>') : '') +
                (isGsTest && fixedW != null ?
                  ('<span class="cmt-dossier-coeff-pill">Fixed: ' + fixedW + '%</span>') :
                  (isGsTest && coeff != null && coeff !== 1 ? ('<span class="cmt-dossier-coeff-pill">Coeff: ' + coeff + '</span>') : '')) +
                (isOverridden ?
                  ('<span class="cmt-dossier-override-pill">' + (t('lmDossierOverrideBadge', 'OVERRIDE') || 'OVERRIDE') + '</span>') : '') +
              '</div>' +
              (evItem.subtitle && !isGsTest ? ('<span class="cmt-dossier-item-sub">' + evItem.subtitle + '</span>') : '') +
              (isGsTest && evItem.testDate ? ('<span class="cmt-dossier-item-sub">' + evItem.testDate + '</span>') : '') +
              (notes.length > 0 ?
                ('<div class="cmt-dossier-item-notes"><span>💬 ' + notes.map(function(n) { return String(n).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }).join(' • ') + '</span></div>') : '') +
              (critList.length > 0 && Object.keys(critRes).length > 0 ?
                ('<div class="cmt-dossier-item-criteria">' +
                  critList.map(function(cr) {
                    var r = critRes[cr.id];
                    if (!r || r.points == null) return '';
                    return '<span class="cmt-dossier-crit-chip">' + (cr.name || cr.label || cr.id) + ': <b>' + r.points + '</b>' + (cr.maxPoints ? '/' + cr.maxPoints : '') + '</span>';
                  }).filter(Boolean).join('') +
                '</div>') : '') +
            '</div>' +
            '<div class="cmt-dossier-item-actions">' +
              '<button type="button" class="cmt-lm-btn primary cmt-dos-btn-open" data-urn="' + evItem.urn + '" title="' + (t('lmDossierOpenInGs', 'Open in Grade Sheet') || 'Open in Grade Sheet') + '">' +
                (isGsTest ? ('<img src="' + gsIcon + '" class="btn-icon" alt="" style="width:11px;height:11px;vertical-align:-1px;margin-right:3px;" />') : '') +
                t('lmOpen', '[OPEN]') +
              '</button>' +
            '</div>' +
          '</div>';
      });
    }
    html += '</div></div>';

    // Section 2: Assessed Competences
    html +=
      '<div class="cmt-dossier-sec">' +
        '<div class="cmt-dossier-sec-hdr">' +
          '<span class="cmt-dossier-sec-title"><span class="cmt-dossier-sec-chevron">▼</span> <img src="' + iconSrc + '" class="cmt-lm-inline-icon" alt="" /> ' + t('lmGroupCompetences', '2. CURRICULUM COMPETENCES & RUBRICS') + '</span>' +
          '<span class="cmt-dossier-sec-count">' + dossier.competences.length + '</span>' +
        '</div>' +
        '<div class="cmt-dossier-sec-list">';
    if (!dossier.competences.length) {
      html += '<div class="cmt-lm-empty" style="padding:6px 0;">' + t('lmNoCompsStudent', 'No curriculum competences linked yet.') + '</div>';
    } else {
      dossier.competences.forEach(function(cpItem) {
        html +=
          '<div class="cmt-dossier-item">' +
            '<div class="cmt-dossier-item-info">' +
              '<div class="cmt-dossier-item-top">' +
                '<span class="cmt-lm-badge" style="background:#6abf8e;color:#111;">' + (cpItem.badge || '[COMPETENCE]') + '</span>' +
                '<span class="cmt-dossier-item-title">' + (cpItem.title || cpItem.urn) + '</span>' +
              '</div>' +
              (cpItem.subtitle ? '<span class="cmt-dossier-item-sub">' + cpItem.subtitle + '</span>' : '') +
            '</div>' +
            '<div class="cmt-dossier-item-actions">' +
              '<button type="button" class="cmt-lm-btn primary cmt-dos-btn-open" data-urn="' + cpItem.urn + '">' + t('lmOpen', '[OPEN]') + '</button>' +
            '</div>' +
          '</div>';
      });
    }
    html += '</div></div>';

    // Section 3: Delivered Lessons
    html +=
      '<div class="cmt-dossier-sec">' +
        '<div class="cmt-dossier-sec-hdr">' +
          '<span class="cmt-dossier-sec-title"><span class="cmt-dossier-sec-chevron">▼</span> <img src="' + iconSrc + '" class="cmt-lm-inline-icon" alt="" /> ' + t('lmDossierDeliveredLessons', '3. DELIVERED LESSON PLANS & TIMETABLE') + '</span>' +
          '<span class="cmt-dossier-sec-count">' + dossier.lessons.length + '</span>' +
        '</div>' +
        '<div class="cmt-dossier-sec-list">';
    if (!dossier.lessons.length) {
      html += '<div class="cmt-lm-empty" style="padding:6px 0;">' + t('lmNoLessonsStudent', 'No lesson plans linked to cohort.') + '</div>';
    } else {
      dossier.lessons.forEach(function(lsItem) {
        html +=
          '<div class="cmt-dossier-item">' +
            '<div class="cmt-dossier-item-info">' +
              '<div class="cmt-dossier-item-top">' +
                '<span class="cmt-lm-badge" style="background:#e2c96e;color:#111;">' + (lsItem.badge || '[LESSON]') + '</span>' +
                '<span class="cmt-dossier-item-title">' + (lsItem.title || lsItem.urn) + '</span>' +
              '</div>' +
              (lsItem.subtitle ? '<span class="cmt-dossier-item-sub">' + lsItem.subtitle + '</span>' : '') +
            '</div>' +
            '<div class="cmt-dossier-item-actions">' +
              '<button type="button" class="cmt-lm-btn primary cmt-dos-btn-open" data-urn="' + lsItem.urn + '">' + t('lmOpen', '[OPEN]') + '</button>' +
            '</div>' +
          '</div>';
      });
    }
    html += '</div></div>';

    // Section 4: Work, Documents & Mindmaps
    var allWork = [].concat(dossier.documents, dossier.boards);
    html +=
      '<div class="cmt-dossier-sec">' +
        '<div class="cmt-dossier-sec-hdr">' +
          '<span class="cmt-dossier-sec-title"><span class="cmt-dossier-sec-chevron">▼</span> <img src="' + iconSrc + '" class="cmt-lm-inline-icon" alt="" /> ' + t('lmDossierLinkedDocs', '4. DOCUMENTS, ATTACHMENTS & MINDMAPS') + '</span>' +
          '<span class="cmt-dossier-sec-count">' + allWork.length + '</span>' +
        '</div>' +
        '<div class="cmt-dossier-sec-list">';
    if (!allWork.length) {
      html += '<div class="cmt-lm-empty" style="padding:6px 0;">' + t('lmNoDocsStudent', 'No individual documents, work, or mindmaps attached.') + '</div>';
    } else {
      allWork.forEach(function(docItem) {
        var isFile = docItem.type === 'file' || (docItem.urn && docItem.urn.startsWith('cmt:file:'));
        html +=
          '<div class="cmt-dossier-item">' +
            '<div class="cmt-dossier-item-info">' +
              '<div class="cmt-dossier-item-top">' +
                '<span class="cmt-lm-badge" style="background:#8b7cc2;color:#fff;">' + (docItem.badge || '[DOC]') + '</span>' +
                '<span class="cmt-dossier-item-title">' + (docItem.title || docItem.urn) + '</span>' +
              '</div>' +
              (docItem.subtitle ? '<span class="cmt-dossier-item-sub">' + docItem.subtitle + '</span>' : '') +
            '</div>' +
            '<div class="cmt-dossier-item-actions">' +
              (isFile ? '<button type="button" class="cmt-lm-btn cmt-dos-btn-prev" data-urn="' + docItem.urn + '" data-title="' + (docItem.title || '') + '">' + t('lmPreview', '[PREVIEW]') + '</button>' : '') +
              '<button type="button" class="cmt-lm-btn primary cmt-dos-btn-open" data-urn="' + docItem.urn + '">' + t('lmOpen', '[OPEN]') + '</button>' +
            '</div>' +
          '</div>';
      });
    }
    html += '</div></div>';

    bodyEl.innerHTML = html;

    // Helper to update toggle-all button state
    function updateToggleAllBtnState() {
      var btn = document.getElementById('cmt-dos-btn-toggle-all');
      if (!btn) return;
      var secs = bodyEl.querySelectorAll('.cmt-dossier-sec');
      if (!secs.length) return;
      var anyOpen = Array.from(secs).some(function(s) { return !s.classList.contains('collapsed'); });
      btn.textContent = anyOpen ? ('[' + (t('lmCollapseAll', 'COLLAPSE ALL') || 'COLLAPSE ALL').toUpperCase() + ']') : ('[' + (t('lmExpandAll', 'EXPAND ALL') || 'EXPAND ALL').toUpperCase() + ']');
    }

    // Toggle individual sections
    bodyEl.querySelectorAll('.cmt-dossier-sec-hdr').forEach(function(hdr) {
      hdr.addEventListener('click', function() {
        var sec = hdr.closest('.cmt-dossier-sec');
        if (sec) {
          sec.classList.toggle('collapsed');
          updateToggleAllBtnState();
        }
      });
    });

    // Attach click listeners to open / preview buttons
    bodyEl.querySelectorAll('.cmt-dos-btn-open').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var targetUrn = btn.getAttribute('data-urn');
        if (targetUrn && window.LinksService) {
          await window.LinksService.openUrn(targetUrn);
        }
      });
    });

    bodyEl.querySelectorAll('.cmt-dos-btn-prev').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetUrn = btn.getAttribute('data-urn');
        var pTitle = btn.getAttribute('data-title');
        previewFile(targetUrn, pTitle);
      });
    });
  }

  function closeStudentDossier() {
    var overlay = document.getElementById('cmt-dossier-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    if (document.body) document.body.classList.remove('cmt-modal-open');
  }

  return {
    open: open,
    close: close,
    openStudentDossier: openStudentDossier,
    openDossier: openStudentDossier,
    closeStudentDossier: closeStudentDossier,
    openDossierPdfExportModal: openDossierPdfExportModal,
    closeDossierPdfExportModal: closeDossierPdfExportModal,
    generateDossierPdfHtml: generateDossierPdfHtml,
    exportDossierPdf: exportDossierPdf,
    exportDossierHtml: exportDossierHtml,
    exportDossierMindmapsPdf: exportDossierMindmapsPdf,
    renderMindmapSessionToSvg: renderMindmapSessionToSvg,
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
