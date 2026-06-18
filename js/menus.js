// Shared hamburger-nav utility — CSS, app list, and initHamburger().
// initHamburger() builds the full menu at runtime; .hm-menu divs in HTML can be empty.
(function () {
  'use strict';

  if (window._cmtMenus) return;
  window._cmtMenus = true;

  // ── Injected CSS ───────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '.hm-wrap{position:relative;margin-left:auto}',
    '.hm-btn{background:none;border:1px solid #555;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:1.1rem;line-height:1;transition:border-color .12s}',
    '.hm-btn:hover{border-color:#fff}',
    '.hm-menu{display:none;position:absolute;right:0;top:calc(100% + 4px);background:#1e1e1e;border:1px solid #444;border-radius:6px;min-width:200px;z-index:9999;padding:4px 0;box-shadow:0 4px 16px rgba(0,0,0,.45)}',
    '.hm-wrap.open .hm-menu{display:block}',
    '.hm-item{display:block;padding:7px 16px;color:#ccc;text-decoration:none;font-size:.85rem;font-weight:600;white-space:nowrap;background:none;border:none;cursor:pointer;font-family:inherit;width:100%;text-align:left;box-sizing:border-box}',
    '.hm-item:hover,.hm-item.nav-active{background:#2d2d2d;color:#fff}',
    '.hm-sep{border:none;border-top:1px solid #333;margin:4px 0}',
  ].join('');
  document.head.appendChild(style);

  // ── App list ───────────────────────────────────────────────────────────────
  // null entries become <hr> separators.
  var _APPS = [
    { href: 'class-management.html', emoji: '🏫', label: 'Class Management' },
    { href: 'board.html',            emoji: '🌐', label: 'Board'            },
    { href: 'learning-tools.html',   emoji: '🎮', label: 'Learning Tools'   },
    { href: 'manage-database.html',  emoji: '🗄️', label: 'Database'         },
    { href: 'grade-sheet.html',      emoji: '📝', label: 'Grade Sheet'      },
    { href: 'participation-tracker.html', emoji: '📊', label: 'Tracker'     },
    null,
    { href: 'group-editor.html',     emoji: '✏️', label: 'Group Editor'     },
    { href: 'class-plan.html',       emoji: '📐', label: 'Class Plan'       },
    { href: 'planner.html',          emoji: '📅', label: 'Planner'          },
    { href: 'schedule-maker.html',   emoji: '📆', label: 'Schedule Maker'   },
    { href: 'document-editor.html',  emoji: '📄', label: 'Document Editor'  },
    { href: 'file-manager.html',     emoji: '📁', label: 'File Manager'     },
    null,
    { href: 'general-config.html',   emoji: '⚙️', label: 'General Config'  },
    { href: 'launcher.html',         emoji: '🏠', label: 'Launcher'         },
    { href: 'credits.html',          emoji: 'ℹ️', label: 'Credits'          },
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
    if (typeof window.setPageLang === 'function') window.setPageLang(lang);
    else if (typeof window.setLang === 'function') window.setLang(lang);
  };

  // ── initHamburger ──────────────────────────────────────────────────────────
  // Builds the menu HTML, wires toggle, and closes on outside click.
  // wrapperId defaults to 'app-hamburger'.
  window.initHamburger = function (wrapperId) {
    var id = wrapperId || 'app-hamburger';
    var wrap = document.getElementById(id);
    if (!wrap) return;

    // Detect current page for nav-active highlight.
    var current = location.pathname.split('/').pop() || '';

    // Build menu HTML.
    var menu = wrap.querySelector('.hm-menu');
    if (menu) {
      var parts = _APPS.map(function (app) {
        if (!app) return '<hr class="hm-sep">';
        var cls = 'nav-link hm-item' + (app.href === current ? ' nav-active' : '');
        return '<a href="' + app.href + '" class="' + cls + '">' + app.emoji + ' ' + app.label + '</a>';
      });
      parts.push(
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
