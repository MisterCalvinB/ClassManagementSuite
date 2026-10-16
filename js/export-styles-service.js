/**
 * export-styles-service.js
 * Centralized service for discovering, caching, previewing, and embedding
 * selectable CSS export styles (Light Neobrutalist, Modern, Classic, Plain, Dyslexic & ADHD Friendly, plus user custom styles).
 *
 * Conforms to:
 * - export-standards: clean semantic CSS classes, embedded stylesheet, no inline styles
 * - smooth-dom-sync: instant in-place <style> updates in preview iframes without reloading
 * - neobrutalist-css: Light Neobrutalist dropdown styling
 * - i18n-key-manager: localized string support
 */

(function () {
  'use strict';

  var DEFAULT_BUILTIN_STYLES = [
    {
      id: 'export-light-neobrutalist.css',
      filename: 'export-light-neobrutalist.css',
      name: 'Light Neobrutalist',
      description: 'Bold charcoal borders, solid block offset shadows, and warm neutral tones.',
      tags: ['default', 'neobrutalist', 'bold'],
      isCustom: false,
      target: 'exportCss'
    },
    {
      id: 'export-modern.css',
      filename: 'export-modern.css',
      name: 'Modern Minimalist',
      description: 'Crisp white canvas, refined hairline borders, modern sans-serif typography, and subtle rounded corners.',
      tags: ['modern', 'clean', 'minimalist'],
      isCustom: false,
      target: 'exportCss'
    },
    {
      id: 'export-classic.css',
      filename: 'export-classic.css',
      name: 'Classic Academic',
      description: 'Traditional academic styling with serif typography, formal horizontal rules, and booktabs table layout.',
      tags: ['classic', 'academic', 'serif', 'formal'],
      isCustom: false,
      target: 'exportCss'
    },
    {
      id: 'export-plain.css',
      filename: 'export-plain.css',
      name: 'Plain / Eco (Black & White)',
      description: 'High-contrast, zero-ink-waste stylesheet designed for school photocopiers and monochrome handouts.',
      tags: ['plain', 'eco', 'bw', 'monochrome', 'print'],
      isCustom: false,
      target: 'exportCss'
    },
    {
      id: 'export-dys.css',
      filename: 'export-dys.css',
      name: 'Dyslexic & ADHD Friendly',
      description: 'High-readability OpenDyslexic & Lexend typography, increased letter and line spacing, warm anti-glare canvas, and chunked focus anchors.',
      tags: ['dys', 'dyslexia', 'adhd', 'accessibility', 'inclusive', 'readable', 'sen'],
      isCustom: false,
      target: 'exportCss'
    }
  ];

  var _styleListCache = null;
  var _styleContentCache = {};
  var _activeDropdowns = [];

  // Helper to get localized string if i18n is available
  function t(key, fallback) {
    if (typeof window.t === 'function') {
      var val = window.t(key);
      if (val && val !== key) return val;
    }
    if (window.i18n && typeof window.i18n.t === 'function') {
      var v2 = window.i18n.t(key);
      if (v2 && v2 !== key) return v2;
    }
    return fallback || key;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Parse metadata header from CSS comment:
   * /*
   *  * Name: ...
   *  * Description: ...
   *  * Tags: ...
   *  *\/
   */
  function parseCssMetadata(cssText, fallbackFilename) {
    var meta = {
      name: '',
      description: '',
      tags: []
    };

    if (!cssText) return meta;

    var headerMatch = cssText.match(/\/\*([\s\S]*?)\*\//);
    if (headerMatch && headerMatch[1]) {
      var block = headerMatch[1];
      var nameM = block.match(/Name:\s*([^\r\n*]+)/i);
      if (nameM) meta.name = nameM[1].trim();

      var descM = block.match(/Description:\s*([^\r\n*]+)/i);
      if (descM) meta.description = descM[1].trim();

      var tagsM = block.match(/Tags:\s*([^\r\n*]+)/i);
      if (tagsM) {
        meta.tags = tagsM[1].split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      }
    }

    if (!meta.name && fallbackFilename) {
      meta.name = fallbackFilename
        .replace(/\.css$/i, '')
        .replace(/^export[-_]?/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    return meta;
  }

  /**
   * Inject dropdown styling into host page
   */
  function injectDropdownStyles() {
    if (document.getElementById('cmt-export-styles-service-css')) return;
    var s = document.createElement('style');
    s.id = 'cmt-export-styles-service-css';
    s.textContent = [
      '.exp-style-dropdown-wrap { position: relative; display: inline-flex; align-items: center; font-family: "Lexend", system-ui, sans-serif; font-size: 12px; }',
      '.exp-style-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #ffffff; border: 2px solid #333333; border-radius: 6px; box-shadow: 2px 2px 0 #555555; cursor: pointer; font-weight: 700; color: #222222; font-size: 11.5px; transition: transform 0.1s ease, box-shadow 0.1s ease; user-select: none; }',
      '.exp-style-btn:hover { background: #fafaf7; }',
      '.exp-style-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #555555; }',
      '.exp-style-btn .arrow-icon { font-size: 9px; margin-left: 2px; color: #555555; }',
      '.exp-style-popover { position: absolute; top: calc(100% + 4px); left: 0; min-width: 280px; max-width: 340px; background: #ffffff; border: 2px solid #333333; border-radius: 8px; box-shadow: 4px 4px 0 #555555; z-index: 10050; padding: 8px; display: none; flex-direction: column; gap: 6px; }',
      '.exp-style-popover.open { display: flex; }',
      '.exp-style-search-input { width: 100%; box-sizing: border-box; padding: 6px 8px; font-size: 11px; font-family: inherit; font-weight: 600; border: 1.5px solid #333333; border-radius: 4px; outline: none; background: #fafaf7; }',
      '.exp-style-search-input:focus { border-color: #222222; background: #ffffff; }',
      '.exp-style-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; margin: 0; padding: 0; list-style: none; }',
      '.exp-style-group-header { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #777777; padding: 4px 6px 2px; letter-spacing: 0.04em; }',
      '.exp-style-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 5px; cursor: pointer; border: 1.5px solid transparent; transition: background 0.1s ease; }',
      '.exp-style-item:hover { background: #f5f5f0; }',
      '.exp-style-item.selected { background: #faf5e4; border-color: #e2c96e; }',
      '.exp-style-item-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; }',
      '.exp-style-item-title { font-weight: 700; color: #222222; font-size: 11.5px; }',
      '.exp-style-item-badge { font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; border: 1px solid #333333; }',
      '.exp-style-item-badge.builtin { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }',
      '.exp-style-item-badge.custom { background: #fef3c7; color: #92400e; border-color: #fde68a; }',
      '.exp-style-item-desc { font-size: 10px; color: #555555; line-height: 1.3; }',
      '.exp-style-empty { font-size: 11px; color: #888888; font-style: italic; padding: 8px; text-align: center; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Close open dropdown popovers on outside click
  document.addEventListener('click', function (e) {
    _activeDropdowns.forEach(function (dd) {
      if (!dd.wrapEl.contains(e.target)) {
        dd.popoverEl.classList.remove('open');
      }
    });
  });

  var ExportStylesService = {
    DEFAULT_STYLE_ID: 'export-light-neobrutalist.css',

    /**
     * Discover all available styles across css/export-css/ and user/export-css/
     * @param {boolean} forceRefresh
     * @returns {Promise<Array>} Array of style metadata objects
     */
    async loadAvailableStyles(forceRefresh) {
      if (_styleListCache && !forceRefresh) {
        return _styleListCache;
      }

      var styles = [];
      var isElectron = !!(window.Desktop && Desktop.isElectron());

      if (isElectron) {
        // 1. Scan built-in styles in css/export-css
        try {
          var resBuiltin = await Desktop.listByPath('exportCss', '', { extensions: ['.css'], recursive: false });
          if (resBuiltin && resBuiltin.ok && Array.isArray(resBuiltin.files) && resBuiltin.files.length) {
            for (var i = 0; i < resBuiltin.files.length; i++) {
              var f = resBuiltin.files[i];
              var filename = f.name || f.relativePath.split('/').pop() || f.relativePath;
              if (!/\.css$/i.test(filename)) continue;

              var styleId = filename;
              var content = await this.getStyleContent(styleId, 'exportCss');
              var meta = parseCssMetadata(content, filename);

              styles.push({
                id: styleId,
                filename: filename,
                name: meta.name || filename,
                description: meta.description || '',
                tags: meta.tags || [],
                isCustom: false,
                target: 'exportCss'
              });
            }
          }
        } catch (err) {
          console.warn('[ExportStylesService] Built-in styles scan failed:', err);
        }

        // 2. Scan user custom styles in user/export-css
        try {
          var resUser = await Desktop.listByPath('userExportCss', '', { extensions: ['.css'], recursive: false });
          if (resUser && resUser.ok && Array.isArray(resUser.files) && resUser.files.length) {
            for (var j = 0; j < resUser.files.length; j++) {
              var uf = resUser.files[j];
              var uFilename = uf.name || uf.relativePath.split('/').pop() || uf.relativePath;
              if (!/\.css$/i.test(uFilename)) continue;

              var uStyleId = 'user:' + uFilename;
              var uContent = await this.getStyleContent(uStyleId, 'userExportCss');
              var uMeta = parseCssMetadata(uContent, uFilename);

              styles.push({
                id: uStyleId,
                filename: uFilename,
                name: uMeta.name || uFilename,
                description: uMeta.description || '',
                tags: uMeta.tags || [],
                isCustom: true,
                target: 'userExportCss'
              });
            }
          }
        } catch (err) {
          // If user/export-css directory doesn't exist yet, it's normal
        }
      }

      // If no styles were discovered (web mode or read issue), use default builtin models
      if (!styles.length) {
        styles = DEFAULT_BUILTIN_STYLES.slice();
      } else {
        // Ensure default models are present if somehow missed
        DEFAULT_BUILTIN_STYLES.forEach(function (def) {
          var found = styles.some(function (s) { return s.filename === def.filename; });
          if (!found) styles.push(def);
        });
      }

      _styleListCache = styles;
      return styles;
    },

    /**
     * Get CSS content by styleId with memory caching
     * @param {string} styleId e.g. "export-light-neobrutalist.css" or "user:custom.css"
     * @param {string} [target] "exportCss" or "userExportCss"
     * @returns {Promise<string>} CSS text
     */
    async getStyleContent(styleId, target) {
      if (!styleId) styleId = this.DEFAULT_STYLE_ID;
      if (_styleContentCache[styleId]) {
        return _styleContentCache[styleId];
      }

      var isUser = styleId.startsWith('user:');
      var filename = isUser ? styleId.replace(/^user:/, '') : styleId;
      var fileTarget = target || (isUser ? 'userExportCss' : 'exportCss');

      var cssText = '';

      if (window.Desktop && Desktop.isElectron()) {
        try {
          var r = await Desktop.readByPath(fileTarget, filename);
          if (r && r.ok && r.content) {
            cssText = r.content;
          }
        } catch (err) {
          console.warn('[ExportStylesService] Read by path failed for ' + styleId + ':', err);
        }
      }

      // Web fallback: fetch from ../css/export-css/
      if (!cssText && !isUser) {
        try {
          var fetchUrl = '../css/export-css/' + filename;
          var res = await fetch(fetchUrl);
          if (res.ok) {
            cssText = await res.text();
          }
        } catch (_) {}
      }

      if (cssText) {
        _styleContentCache[styleId] = cssText;
      }
      return cssText;
    },

    /**
     * Get teacher's saved preference for a tool, or suite default
     * @param {string} [toolKey] e.g. "planner", "scheduleMaker", "lessonCreator", "testCreator", "gradeSheet"
     * @returns {string} styleId
     */
    getSelectedStyle(toolKey) {
      var key = toolKey ? ('cmt_export_style_' + toolKey) : 'cmt_export_style_default';
      try {
        var saved = localStorage.getItem(key);
        if (saved) return saved;
        if (toolKey) {
          var def = localStorage.getItem('cmt_export_style_default');
          if (def) return def;
        }
      } catch (_) {}
      return this.DEFAULT_STYLE_ID;
    },

    /**
     * Save teacher's selected style
     * @param {string} [toolKey]
     * @param {string} styleId
     */
    setSelectedStyle(toolKey, styleId) {
      if (!styleId) return;
      try {
        if (toolKey) {
          localStorage.setItem('cmt_export_style_' + toolKey, styleId);
        }
        localStorage.setItem('cmt_export_style_default', styleId);
      } catch (_) {}
    },

    /**
     * Apply chosen style directly to a live preview iframe without reloading srcdoc
     * @param {HTMLIFrameElement} iframeEl
     * @param {string} styleId
     */
    async applyStyleToIframe(iframeEl, styleId) {
      if (!iframeEl || !iframeEl.contentDocument) return;
      var doc = iframeEl.contentDocument;
      var head = doc.head || doc.getElementsByTagName('head')[0];
      if (!head) return;

      var cssText = await this.getStyleContent(styleId);
      if (!cssText) return;

      var existing = doc.getElementById('cmt-export-theme');
      if (existing) {
        existing.textContent = cssText;
      } else {
        var styleEl = doc.createElement('style');
        styleEl.id = 'cmt-export-theme';
        styleEl.textContent = cssText;
        head.appendChild(styleEl);
      }
    },

    /**
     * Embed chosen CSS into an HTML string before exporting to file or printPdf
     * @param {string} html
     * @param {string} styleId
     * @returns {Promise<string>} modified HTML string
     */
    async injectStyleIntoHtml(html, styleId) {
      var css = await this.getStyleContent(styleId);
      if (!css) return html;

      var styleTag = '<style id="cmt-export-theme">\n' + css + '\n</style>';

      // If document already has #cmt-export-theme, replace it
      if (html.indexOf('id="cmt-export-theme"') !== -1) {
        return html.replace(/<style\s+id="cmt-export-theme"[^>]*>[\s\S]*?<\/style>/i, styleTag);
      }

      // If document has </head>, append right before </head> so theme overrides base inline styles
      if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, '  ' + styleTag + '\n</head>');
      }

      // If document has <head> without </head>, append after <head>
      if (/<head[^>]*>/i.test(html)) {
        return html.replace(/(<head[^>]*>)/i, '$1\n  ' + styleTag);
      }

      // Fallback: prepend to entire html
      return styleTag + '\n' + html;
    },

    /**
     * Create and mount a Searchable Style Dropdown UI component
     * @param {HTMLElement} containerEl Target container
     * @param {Object} options Configuration options
     * @param {string} [options.toolKey] Tool identifier for saving preference
     * @param {string} [options.currentStyleId] Initially selected style
     * @param {function} [options.onChange] Callback on style change: (styleId, styleObj) => void
     * @returns {Object} Controller object with { getSelected(), setSelected() }
     */
    async renderStyleSelector(containerEl, options) {
      if (!containerEl) return null;
      injectDropdownStyles();

      options = options || {};
      var toolKey = options.toolKey || '';
      var currentStyleId = options.currentStyleId || this.getSelectedStyle(toolKey);
      var onChange = options.onChange || function () {};

      var allStyles = await this.loadAvailableStyles();

      var wrap = document.createElement('div');
      wrap.className = 'exp-style-dropdown-wrap';

      var triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.className = 'exp-style-btn';
      triggerBtn.setAttribute('data-i18n-title', 'exportStyleLabel');

      var popover = document.createElement('div');
      popover.className = 'exp-style-popover';

      var searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.className = 'exp-style-search-input';
      searchInput.placeholder = t('exportStyleSearchPlaceholder', 'Search styles...');

      var listEl = document.createElement('ul');
      listEl.className = 'exp-style-list';

      popover.appendChild(searchInput);
      popover.appendChild(listEl);

      wrap.appendChild(triggerBtn);
      wrap.appendChild(popover);
      containerEl.innerHTML = '';
      containerEl.appendChild(wrap);

      var ddState = {
        wrapEl: wrap,
        popoverEl: popover,
        selectedId: currentStyleId
      };
      _activeDropdowns.push(ddState);

      function updateTriggerLabel() {
        var cur = allStyles.find(function (s) { return s.id === ddState.selectedId; });
        var label = cur ? cur.name : (t('exportStyleLabel', 'Export Style'));
        triggerBtn.innerHTML = '<img src="../assets/icons/layout.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /> ' +
          '<span>' + esc(label) + '</span> ' +
          '<span class="arrow-icon">▾</span>';
      }

      function renderList(query) {
        listEl.innerHTML = '';
        var q = String(query || '').trim().toLowerCase();

        var filtered = allStyles.filter(function (s) {
          if (!q) return true;
          if (s.name.toLowerCase().indexOf(q) !== -1) return true;
          if (s.description && s.description.toLowerCase().indexOf(q) !== -1) return true;
          if (s.tags && s.tags.some(function (tg) { return tg.indexOf(q) !== -1; })) return true;
          return false;
        });

        if (!filtered.length) {
          var empty = document.createElement('li');
          empty.className = 'exp-style-empty';
          empty.textContent = t('exportStyleNoResults', 'No matching styles found');
          listEl.appendChild(empty);
          return;
        }

        var builtin = filtered.filter(function (s) { return !s.isCustom; });
        var custom = filtered.filter(function (s) { return s.isCustom; });

        function appendGroup(title, items, isCustomGroup) {
          if (!items.length) return;
          var gh = document.createElement('li');
          gh.className = 'exp-style-group-header';
          gh.textContent = title;
          listEl.appendChild(gh);

          items.forEach(function (st) {
            var li = document.createElement('li');
            li.className = 'exp-style-item' + (st.id === ddState.selectedId ? ' selected' : '');

            var header = document.createElement('div');
            header.className = 'exp-style-item-header';

            var titleSpan = document.createElement('span');
            titleSpan.className = 'exp-style-item-title';
            titleSpan.textContent = st.name;

            var badgeSpan = document.createElement('span');
            badgeSpan.className = 'exp-style-item-badge ' + (isCustomGroup ? 'custom' : 'builtin');
            badgeSpan.textContent = isCustomGroup ? t('exportStyleUserCustom', 'Custom') : t('exportStyleBuiltIn', 'Built-in');

            header.appendChild(titleSpan);
            header.appendChild(badgeSpan);
            li.appendChild(header);

            if (st.description) {
              var descSpan = document.createElement('span');
              descSpan.className = 'exp-style-item-desc';
              descSpan.textContent = st.description;
              li.appendChild(descSpan);
            }

            li.addEventListener('click', function () {
              ddState.selectedId = st.id;
              ExportStylesService.setSelectedStyle(toolKey, st.id);
              updateTriggerLabel();
              popover.classList.remove('open');
              onChange(st.id, st);
            });

            listEl.appendChild(li);
          });
        }

        appendGroup(t('exportStyleBuiltInHeader', 'Standard Models'), builtin, false);
        appendGroup(t('exportStyleUserCustomHeader', 'Custom Styles (user/)'), custom, true);
      }

      triggerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = popover.classList.contains('open');
        _activeDropdowns.forEach(function (d) { d.popoverEl.classList.remove('open'); });
        if (!isOpen) {
          popover.classList.add('open');
          searchInput.value = '';
          renderList('');
          setTimeout(function () { searchInput.focus(); }, 50);
        }
      });

      searchInput.addEventListener('input', function () {
        renderList(searchInput.value);
      });

      updateTriggerLabel();
      renderList('');

      return {
        getSelected() {
          return ddState.selectedId;
        },
        setSelected(id) {
          ddState.selectedId = id;
          ExportStylesService.setSelectedStyle(toolKey, id);
          updateTriggerLabel();
          renderList(searchInput.value);
        }
      };
    }
  };

  window.ExportStylesService = ExportStylesService;
})();
