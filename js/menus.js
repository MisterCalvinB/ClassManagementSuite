// Shared hamburger-nav utility — CSS, app list, and initHamburger().
// initHamburger() builds the full menu at runtime; .hm-menu divs in HTML can be empty.
(function () {
  'use strict';

  if (window._cmtMenus) return;
  window._cmtMenus = true;

  // ── Injected CSS ───────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    /* selection-disable */
    '#app-nav,#app-nav .nav-brand,#app-nav button,#app-nav .tut-trigger-btn,.tut-trigger-btn,.hm-btn,.hm-wrap,.hm-menu,.hm-item,.hm-lang-row,.hm-lang-btn{user-select:none;-webkit-user-select:none}',
    /* nav buttons */
    '#app-nav button,#app-nav .tut-trigger-btn,.tut-trigger-btn,.hm-btn{background:#111;color:#fff;border:1px solid #555;padding:5px 12px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.85rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;transition:background 0.12s ease,border-color 0.12s ease;line-height:1.2;box-sizing:border-box}',
    '#app-nav button:hover,#app-nav .tut-trigger-btn:hover,.tut-trigger-btn:hover,.hm-btn:hover{background:#222;border-color:#888;color:#fff}',
    /* icon filters for dark buttons */
    '.btn-primary img.btn-icon,.btn-success img.btn-icon,.btn-danger img.btn-icon,.btn-primary .btn-icon,.btn-success .btn-icon,.btn-danger .btn-icon,.hm-btn img.btn-icon,.hm-btn .btn-icon,.tut-trigger-btn img.btn-icon,.tut-trigger-btn .btn-icon,#app-nav button img.btn-icon,#app-nav button .btn-icon{filter:brightness(0) invert(1) !important}',
    '.dropdown-item:hover img.btn-icon,.dropdown-item:hover .btn-icon,.menu-item:hover img.btn-icon,.menu-item:hover .btn-icon{filter:brightness(0) invert(1)}',
    /* hamburger wrapper */
    '.hm-wrap{position:relative;margin-left:auto;display:inline-flex;align-items:center;gap:8px}',
    /* dropdown panel — grid layout */
    '.hm-menu{display:none;position:absolute;right:0;top:calc(100% + 6px);background:#1a1a1a;border:2px solid #3a3a3a;border-radius:10px;z-index:9999;padding:10px;box-shadow:0 8px 32px rgba(0,0,0,.6);width:280px}',
    '.hm-wrap.open .hm-menu{display:block}',
    /* grid container inside the panel */
    '.hm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    /* individual tile */
    '.hm-item{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;padding:8px 4px 6px;color:#bbb;text-decoration:none;font-size:.62rem;font-weight:700;text-align:center;line-height:1.2;background:none;border:1.5px solid transparent;border-radius:7px;cursor:pointer;font-family:inherit;box-sizing:border-box;transition:background 0.12s ease,border-color 0.12s ease,color 0.12s ease;word-break:break-word;hyphens:auto}',
    '.hm-item:hover{background:#2a2a2a;border-color:#555;color:#fff}',
    '.hm-item.nav-active{background:#252525;border-color:#666;color:#fff}',
    /* icon inside tile */
    '.hm-icon-img{width:22px;height:22px;flex-shrink:0;filter:invert(1) brightness(10) grayscale(1)!important;opacity:.75;transition:opacity 0.12s ease}',
    '.hm-item:hover .hm-icon-img,.hm-item.nav-active .hm-icon-img{opacity:1}',
    /* separators span full grid width */
    '.hm-sep{border:none;border-top:1px solid #2e2e2e;margin:6px 0;grid-column:1/-1}',
    /* lang row */
    '.hm-lang-row{display:flex;gap:4px;padding:4px 0 0;grid-column:1/-1}',
    '.hm-lang-btn{flex:1;background:none;border:1px solid #3a3a3a;color:#888;padding:4px 2px;border-radius:4px;cursor:pointer;font-size:.72rem;font-weight:700;transition:border-color .12s,background .12s,color .12s;min-width:0}',
    '.hm-lang-btn:hover{border-color:#888;color:#ddd}',
    '.hm-lang-btn.active{background:#333;color:#fff;border-color:#777}'
  ].join('');
  document.head.appendChild(style);

  // ── App list ───────────────────────────────────────────────────────────────
  // null entries become <hr> separators.
  var _APPS = [
    { href: 'class-management.html', icon: 'class-management.svg', label: 'Class Management' },
    { href: 'board.html',            icon: 'board.svg',            label: 'Board'            },
    { href: 'learning-tools.html',   icon: 'learning-tools.svg',   label: 'Learning Tools'   },
    { href: 'manage-database.html',  icon: 'manage-database.svg',  label: 'Database'         },
    { href: 'grade-sheet.html',      icon: 'grade-sheet.svg',      label: 'Grade Sheet'      },
    { href: 'participation-tracker.html',  icon: 'participation-tracker.svg', label: 'Tracker'               },
    { href: 'competence-portfolio.html',  icon: 'award.svg',                label: 'Competence Portfolio'  },
    { href: 'administrative-groups.html', icon: 'admin-groups.svg',         label: 'Administrative Groups' },
    { href: 'oral-marking.html',     icon: 'oral-marking.svg',     label: 'Oral Marking'     },
    null,
    { href: 'group-editor.html',     icon: 'group-editor.svg',     label: 'Group Editor'     },
    { href: 'class-plan.html',       icon: 'class-plan.svg',       label: 'Class Plan'       },
    { href: 'planner.html',          icon: 'planner.svg',          label: 'Planner'          },
    { href: 'lesson-creator.html',   icon: 'file-text.svg',        label: 'Lesson Creator'   },
    { href: 'schedule-maker.html',   icon: 'schedule-maker.svg',   label: 'Schedule Maker'   },
    { href: 'document-editor.html',  icon: 'document-editor.svg',  label: 'Document Editor'  },
    { href: 'file-manager.html',     icon: 'file-manager.svg',     label: 'File Manager'     },
    { href: 'import-tool.html',      icon: 'import-tool.svg',      label: 'Import'           },
    null,
    { href: 'general-config.html',   icon: 'general-config.svg',   label: 'General Config'  },
    { href: 'launcher.html',         icon: 'launcher.svg',         label: 'Launcher'         },
    { href: 'how-to.html',           icon: 'how-to.svg',           label: 'How-To'           },
    { href: 'about.html',            icon: 'about.svg',            label: 'About'            },
  ];

  // ── Nav brand ─────────────────────────────────────────────────────────────
  // Async: loads user/config.js if needed, then sets .nav-brand to appTitle.
  // Also prefixes document.title. Safe to call from any page with 'user' permission.
  window._cmtApplyNavBrand = async function () {
    if (typeof CLASS_MANAGEMENT_CONFIG === 'undefined') {
      try {
        if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
          var r = await Desktop.readText('user', 'config.js');
          if (r && r.ok && r.content) {
            var s = document.createElement('script');
            s.text = r.content;
            document.head.appendChild(s);
            if (s.parentNode) s.parentNode.removeChild(s);
          }
        }
      } catch (e) {}
    }
    var appTitle = '';
    try {
      appTitle = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' &&
        CLASS_MANAGEMENT_CONFIG.launcherSettings &&
        CLASS_MANAGEMENT_CONFIG.launcherSettings.appTitle &&
        CLASS_MANAGEMENT_CONFIG.launcherSettings.appTitle.trim()) || '';
    } catch (e) {}
    if (!appTitle) return;
    var el = document.querySelector('.nav-brand');
    if (el) el.textContent = appTitle;
    if (document.title && !document.title.startsWith(appTitle)) {
      document.title = appTitle + ': ' + document.title;
    }
  };

  // ── Lang shim ──────────────────────────────────────────────────────────────
  // Works for pages using i18n.js (setPageLang) and pages with a local setLang.
  window._cmtMenuLang = function (lang) {
    if (typeof window.setLang === 'function') window.setLang(lang);
    if (typeof window.setPageLang === 'function') window.setPageLang(lang);
  };

  // ── initHamburger ──────────────────────────────────────────────────────────
  // Builds the menu HTML, wires toggle, and closes on outside click.
  // wrapperId defaults to 'app-hamburger'.
  window.initHamburger = function (wrapperId) {
    var id = wrapperId || 'app-hamburger';
    var wrap = (wrapperId && document.getElementById(wrapperId))
      || document.getElementById('app-hamburger')
      || document.getElementById('hmWrap')
      || document.querySelector('.hm-wrap');
    if (!wrap) return;

    // Detect current page and base directory for assets/icons/ relative path.
    var current = location.pathname.split('/').pop() || '';
    var baseDir = location.pathname.includes('/pages/') ? '../' : '';

    // Build menu HTML — icon grid.
    var menu = wrap.querySelector('.hm-menu');
    if (menu) {
      // Open grid wrapper.
      var parts = ['<div class="hm-grid">'];
      _APPS.forEach(function (app) {
        if (!app) {
          // Close current grid, emit separator, open new grid.
          parts.push('</div><hr class="hm-sep"><div class="hm-grid">');
          return;
        }
        var cls = 'nav-link hm-item' + (app.href === current ? ' nav-active' : '');
        var iconHtml = app.icon
          ? '<img src="' + baseDir + 'assets/icons/' + app.icon + '" class="hm-icon-img" alt="" />'
          : '';
        parts.push('<a href="' + app.href + '" class="' + cls + '">' + iconHtml + '<span>' + app.label + '</span></a>');
      });
      // Close last grid, add lang row.
      parts.push(
        '</div>',
        '<hr class="hm-sep">',
        '<div class="hm-lang-row">',
        '  <button class="hm-lang-btn" data-lang="auto" onclick="window._cmtMenuLang(null)">Auto</button>',
        '  <button class="hm-lang-btn" data-lang="en"   onclick="window._cmtMenuLang(\'en\')">EN</button>',
        '  <button class="hm-lang-btn" data-lang="fr"   onclick="window._cmtMenuLang(\'fr\')">FR</button>',
        '  <button class="hm-lang-btn" data-lang="de"   onclick="window._cmtMenuLang(\'de\')">DE</button>',
        '  <button class="hm-lang-btn" data-lang="it"   onclick="window._cmtMenuLang(\'it\')">IT</button>',
        '</div>'
      );
      menu.innerHTML = parts.join('');
      // Highlight the active lang button if i18n.js is loaded.
      if (typeof window.updateLangButtons === 'function') window.updateLangButtons();
    }

    // Wire button toggle.
    var btn = wrap.querySelector('.hm-btn');
    if (btn) {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        wrap.classList.toggle('open');
      });
    }

    // Close on outside click.
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
  };
})();
