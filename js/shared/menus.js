// Shared hamburger-nav utility — CSS, app list, and initHamburger().
// initHamburger() builds the full menu at runtime; .hm-menu divs in HTML can be empty.
(function () {
  'use strict';

  if (window._cmtMenus) return;
  window._cmtMenus = true;

  // ── Injected CSS (fallback when css/menus.css is not linked) ─────────────────
  if (!document.querySelector('link[href*="menus.css"]')) {
  var style = document.createElement('style');
  style.textContent = [
    /* selection-disable */
    '#app-nav,#app-nav .nav-brand,#app-nav button,#app-nav .tut-trigger-btn,.tut-trigger-btn,.hm-btn,.hm-wrap,.hm-menu,.hm-item,.hm-lang-row,.hm-lang-btn{user-select:none;-webkit-user-select:none}',
    /* nav buttons */
    '#app-nav button,#app-nav .tut-trigger-btn,.tut-trigger-btn,.hm-btn{background:var(--neo-dark,#222222);color:#fff;border:2px solid #555555;padding:5px 12px;border-radius:var(--neo-radius-md,6px);cursor:pointer;font-family:inherit;font-size:0.85rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;transition:background-color 0.12s ease,border-color 0.12s ease,transform 0.12s ease;line-height:1.2;box-sizing:border-box}',
    '#app-nav button:hover,#app-nav .tut-trigger-btn:hover,.tut-trigger-btn:hover,.hm-btn:hover{background:#333333;border-color:#888888;color:#fff}',
    /* icon filters for dark buttons in nav */
    '#app-nav button img.btn-icon,#app-nav button .btn-icon,.hm-btn img.btn-icon,.hm-btn .btn-icon,.tut-trigger-btn img.btn-icon,.tut-trigger-btn .btn-icon{filter:brightness(0) invert(1) !important}',
    '#app-nav button img.btn-icon,#app-nav button .btn-icon,.hm-btn img.btn-icon,.hm-btn .btn-icon,.tut-trigger-btn img.btn-icon,.tut-trigger-btn .btn-icon{width:14px;height:14px;max-width:14px;max-height:14px;display:inline-block;vertical-align:middle;object-fit:contain;flex-shrink:0}',
    '#app-nav .dropdown-item:hover img.btn-icon,#app-nav .dropdown-item:hover .btn-icon,#app-nav .menu-item:hover img.btn-icon,#app-nav .menu-item:hover .btn-icon{filter:brightness(0) invert(1)}',
    /* hamburger wrapper */
    '.hm-wrap{position:relative;margin-left:auto;display:inline-flex;align-items:center;gap:8px}',
    /* dropdown panel — grid layout with responsive bounds */
    '.hm-menu{display:none;position:absolute;right:0;top:calc(100% + 6px);background:#1e1e1e;border:2px solid var(--neo-border-color,#333333);border-radius:var(--neo-radius-lg,10px);z-index:9999;padding:10px;box-shadow:var(--neo-shadow-lg,4px 4px 0 #555555);width:280px;max-width:calc(100vw - 16px);max-height:calc(100vh - 56px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box}',
    '.hm-wrap.open .hm-menu{display:block}',
    /* grid container inside the panel */
    '.hm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    /* individual tile */
    '.hm-item,.hm-grid .hm-item{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;padding:8px 4px 6px;color:#bbb;text-decoration:none;font-size:.62rem;font-weight:700;text-align:center;line-height:1.2;background:none;border:1.5px solid transparent;border-radius:var(--neo-radius-md,6px);cursor:pointer;font-family:inherit;width:auto;box-sizing:border-box;transition:background-color 0.12s ease,border-color 0.12s ease,color 0.12s ease;word-break:break-word;hyphens:auto}',
    '.hm-item:hover,.hm-grid .hm-item:hover{background:#2a2a2a;border-color:#555;color:#fff}',
    '.hm-item.nav-active,.hm-grid .hm-item.nav-active{background:#2f2f2f;border-color:var(--neo-yellow,#e2c96e);color:#fff}',
    /* icon inside tile */
    '.hm-icon-img,.hm-grid .hm-icon-img{width:22px;height:22px;flex-shrink:0;vertical-align:middle;margin-right:0;filter:invert(1) brightness(10) grayscale(1)!important;opacity:.75;transition:opacity 0.12s ease}',
    '.hm-item:hover .hm-icon-img,.hm-item.nav-active .hm-icon-img,.hm-grid .hm-item:hover .hm-icon-img,.hm-grid .hm-item.nav-active .hm-icon-img{opacity:1}',
    /* separators span full grid width */
    '.hm-sep{border:none;border-top:1px solid #2e2e2e;margin:6px 0;grid-column:1/-1}',
    /* lang row */
    '.hm-lang-row{display:flex;gap:4px;padding:4px 0 0;grid-column:1/-1}',
    '.hm-lang-btn{flex:1;background:none;border:1px solid #3a3a3a;color:#888;padding:4px 2px;border-radius:var(--neo-radius-sm,4px);cursor:pointer;font-size:.72rem;font-weight:700;transition:border-color .12s,background-color .12s,color .12s;min-width:0}',
    '.hm-lang-btn:hover{border-color:#888;color:#ddd}',
    '.hm-lang-btn.active{background:var(--neo-yellow,#e2c96e);color:#111111;border-color:var(--neo-yellow,#e2c96e)}',
    /* responsive narrow window styling for hamburger & navbars across all tools */
    '@media(max-width:600px){#app-nav{padding:4px 8px !important;gap:6px !important;min-height:38px !important;flex-wrap:nowrap !important;box-sizing:border-box !important}#app-nav .nav-brand{font-size:.8rem !important;max-width:140px !important;overflow:hidden !important;text-overflow:ellipsis !important;white-space:nowrap !important;min-width:0 !important;flex-shrink:1 !important}#app-nav button,#app-nav .tut-trigger-btn,.tut-trigger-btn,.hm-btn{padding:4px 7px !important;font-size:.76rem !important;height:28px !important;min-width:28px !important}.hm-wrap{gap:4px !important;flex-shrink:0 !important}.hm-menu{position:fixed !important;top:44px !important;left:8px !important;right:8px !important;width:auto !important;max-width:none !important;max-height:calc(100vh - 54px) !important;box-shadow:0 8px 32px rgba(0,0,0,.75) !important;border-radius:10px !important;z-index:100000 !important}}',
    '@media(max-width:360px){#app-nav .nav-brand{max-width:85px !important;font-size:.72rem !important}#app-nav button,#app-nav .tut-trigger-btn,.tut-trigger-btn,.hm-btn{padding:3px 5px !important;font-size:.72rem !important;min-width:25px !important;height:26px !important}.hm-grid{grid-template-columns:repeat(3,1fr) !important;gap:3px !important}.hm-item{padding:5px 2px 3px !important;font-size:.58rem !important;gap:3px !important}.hm-icon-img{width:18px !important;height:18px !important}}'
  ].join('');
  document.head.appendChild(style);
  }

  // ── App list ───────────────────────────────────────────────────────────────
  // null entries become <hr> separators.
  var _APPS = [
    { href: 'class-management.html', icon: 'class-management.svg', label: 'Class Management' },
    { href: 'board.html',            icon: 'board.svg',            label: 'Board'            },
    { href: 'learning-tools.html',   icon: 'learning-tools.svg',   label: 'Learning Tools'   },
    { href: 'manage-database.html',  icon: 'manage-database.svg',  label: 'Database'         },
    { href: 'grade-sheet.html',      icon: 'grade-sheet.svg',      label: 'Grade Sheet'      },
    { href: 'participation-tracker.html',  icon: 'participation-tracker.svg', label: 'Tracker'               },
    { href: 'competence-portfolio.html',  icon: 'competence-portfolio.svg', label: 'Competence Portfolio'  },
    { href: 'administrative-groups.html', icon: 'admin-groups.svg',         label: 'Administrative Groups' },
    { href: 'oral-marking.html',     icon: 'oral-marking.svg',     label: 'Oral Marking'     },
    null,
    { href: 'group-editor.html',     icon: 'group-editor.svg',     label: 'Group Editor'     },
    { href: 'class-plan.html',       icon: 'class-plan.svg',       label: 'Class Plan'       },
    { href: 'planner.html',          icon: 'planner.svg',          label: 'Planner'          },
    { href: 'lesson-creator.html',   icon: 'lesson-creator.svg',   label: 'Lesson Creator'   },
    { href: 'test-creator.html',     icon: 'test-creator.svg',     label: 'Test Creator'     },
    { href: 'schedule-maker.html',   icon: 'schedule-maker.svg',   label: 'Schedule Maker'   },
    { href: 'document-editor.html',  icon: 'document-editor.svg',  label: 'Document Editor'  },
    { href: 'pdf-viewer.html',       icon: 'pdf-viewer.svg',       label: 'PDF Viewer'       },
    { href: 'file-manager.html',     icon: 'file-manager.svg',     label: 'File Manager'     },
    { href: 'database-converter.html', icon: 'table.svg',          label: 'Data Studio'      },
    { href: 'media-converter.html',  icon: 'media-converter.svg',  label: 'Media Converter'  },
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
        var cls = 'hm-item' + (app.href === current ? ' nav-active' : '');
        var iconHtml = app.icon
          ? '<img src="' + baseDir + 'assets/icons/' + app.icon + '" class="hm-icon-img" alt="" />'
          : '';
        parts.push('<a href="' + app.href + '" class="' + cls + '" target="_blank">' + iconHtml + '<span>' + app.label + '</span></a>');
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
        '</div>',
        '<hr class="hm-sep">',
        '<div class="hm-lang-row">',
        '  <button type="button" class="hm-lang-btn" data-hm-action="window-helper" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:6px;"><img src="' + baseDir + 'assets/icons/layout.svg" alt="" style="width:14px;height:14px;"><span>' + (window.i18n && typeof window.i18n.t === 'function' && window.i18n.t('wh_open_helper') !== 'wh_open_helper' ? window.i18n.t('wh_open_helper') : 'Reorder Windows (Ctrl+Shift+W)') + '</span></button>',
        '</div>'
      );
      menu.innerHTML = parts.join('');
      var whBtn = menu.querySelector('[data-hm-action="window-helper"]');
      if (whBtn) {
        whBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          wrap.classList.remove('open');
          if (window.WindowHelper && typeof window.WindowHelper.open === 'function') {
            window.WindowHelper.open();
          }
        });
      }
      // Highlight the active lang button if i18n.js is loaded.
      if (typeof window.updateLangButtons === 'function') window.updateLangButtons();
    }

    // Wire button toggle (idempotent: prevent duplicate click listeners if initHamburger is called multiple times)
    var btn = wrap.querySelector('.hm-btn:not(.hm-wh-trigger)');
    var isPresUrl = /[?&](mirror|presentation|ltPresentation|wwPresentation|oralPresenter)=1/i.test(location.search);
    if (btn && !isPresUrl && !wrap.querySelector('.hm-wh-trigger')) {
      var whLabel = (window.i18n && typeof window.i18n.t === 'function' && window.i18n.t('wh_open_helper') !== 'wh_open_helper')
        ? window.i18n.t('wh_open_helper')
        : 'Reorder Windows (Ctrl+Shift+W)';
      var whTrig = document.createElement('button');
      whTrig.type = 'button';
      whTrig.className = 'hm-btn hm-wh-trigger';
      whTrig.title = whLabel;
      whTrig.setAttribute('aria-label', whLabel);
      whTrig.innerHTML = '<img src="' + baseDir + 'assets/icons/layout.svg" class="btn-icon" alt="" />';
      whTrig.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (window.WindowHelper && typeof window.WindowHelper.open === 'function') {
          window.WindowHelper.open();
        }
      });
      wrap.insertBefore(whTrig, btn);
    }
    if (btn && !btn._hmBound) {
      btn._hmBound = true;
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = !wrap.classList.contains('open');
        document.querySelectorAll('.hm-wrap.open').forEach(function (w) {
          if (w !== wrap) w.classList.remove('open');
        });
        if (typeof window.closeDbPopup === 'function') window.closeDbPopup();
        if (typeof window.closeSettingsPopup === 'function') window.closeSettingsPopup();
        wrap.classList.toggle('open', willOpen);
        if (willOpen) {
          requestAnimationFrame(function () {
            var menu = wrap.querySelector('.hm-menu');
            if (!menu) return;
            if (window.innerWidth > 480) {
              var rect = menu.getBoundingClientRect();
              if (rect.left < 8) {
                menu.style.right = 'auto';
                menu.style.left = '0';
              } else {
                menu.style.right = '0';
                menu.style.left = 'auto';
              }
            }
          });
        }
      });
    }

    // Wire link clicks to open in a new window (Desktop.openTool in Electron, new tab in browser)
    if (!wrap._hmLinksDelegated) {
      wrap._hmLinksDelegated = true;
      wrap.addEventListener('click', function (e) {
        var link = e.target.closest('a.hm-item[href]');
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();
        wrap.classList.remove('open');
        var href = link.getAttribute('href');
        if (!href) return;
        var pageFile = href.split('/').pop().split('?')[0];
        if (window.Desktop && typeof window.Desktop.openTool === 'function') {
          window.Desktop.openTool(pageFile);
        } else if (window.electronBridge && typeof window.electronBridge.openTool === 'function') {
          window.electronBridge.openTool(pageFile);
        } else if (window.electronApi && typeof window.electronApi.openTool === 'function') {
          window.electronApi.openTool(pageFile);
        } else {
          window.open(href, '_blank');
        }
      });
    }

    // Close on outside click or Escape key (idempotent: register once per wrapper)
    if (!wrap._hmDocBound) {
      wrap._hmDocBound = true;
      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) wrap.classList.remove('open');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') wrap.classList.remove('open');
      });
    }
  };

  window.CMT_APPS = _APPS;
  if (typeof document !== 'undefined') {
    if (!window.QuickSwitcher) {
      var qsPrefix = (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) ? '../js/shared/' : 'js/shared/';
      var qsScript = document.createElement('script');
      qsScript.src = qsPrefix + 'quick-switcher.js';
      qsScript.defer = true;
      (document.head || document.documentElement).appendChild(qsScript);
    }
    if (!window.WindowHelper) {
      var whPrefix = (typeof location !== 'undefined' && /\/pages\//.test(location.pathname)) ? '../js/shared/' : 'js/shared/';
      var whScript = document.createElement('script');
      whScript.src = whPrefix + 'window-helper.js';
      whScript.defer = true;
      (document.head || document.documentElement).appendChild(whScript);
    }
    var _applyA11yDefaults = function () {
      try {
        document.querySelectorAll('button').forEach(function (btn) {
          if (!btn.hasAttribute('aria-label') && !(btn.textContent || '').trim()) {
            var lbl = btn.getAttribute('title') || btn.getAttribute('data-hover-help');
            if (lbl) btn.setAttribute('aria-label', lbl);
          }
        });
        document.querySelectorAll('.modal-bg, .modal-overlay, .neo-modal-overlay').forEach(function (m) {
          if (!m.hasAttribute('role')) m.setAttribute('role', 'dialog');
          if (!m.hasAttribute('aria-modal')) m.setAttribute('aria-modal', 'true');
        });
      } catch (_) {}
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _applyA11yDefaults);
    } else {
      _applyA11yDefaults();
    }
  }

  // ── Unified Popup / Context-Menu / Dropdown Controller (CmtPopup) ──────────
  var _activePopups = {}; // group -> { el, unregEsc, onClose, docHandler }

  function _clampPopupToViewport(el, x, y) {
    if (!el) return;
    var pad = 8;
    var rect = el.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth || 1024;
    var vh = window.innerHeight || document.documentElement.clientHeight || 768;
    var w = rect.width || el.offsetWidth || 220;
    var h = rect.height || el.offsetHeight || 180;
    var nx = typeof x === 'number' ? x : rect.left;
    var ny = typeof y === 'number' ? y : rect.top;
    if (nx + w > vw - pad) nx = Math.max(pad, vw - w - pad);
    if (ny + h > vh - pad) ny = Math.max(pad, vh - h - pad);
    if (nx < pad) nx = pad;
    if (ny < pad) ny = pad;
    el.style.left = Math.round(nx) + 'px';
    el.style.top = Math.round(ny) + 'px';
  }

  function _closePopupEntry(group, entry) {
    if (!entry) return;
    if (_activePopups[group] === entry) delete _activePopups[group];
    if (entry.unregEsc) { try { entry.unregEsc(); } catch (_) {} }
    if (entry.docHandler) {
      document.removeEventListener('pointerdown', entry.docHandler, true);
    }
    if (entry.el) {
      entry.el.classList.remove('open', 'is-open');
      if (entry.useDisplay) entry.el.style.display = 'none';
    }
    if (typeof entry.onClose === 'function') {
      try { entry.onClose(entry.el); } catch (_) {}
    }
  }

  window.CmtPopup = {
    open: function (el, opts) {
      if (!el) return;
      opts = opts || {};
      var group = opts.group || 'default';
      if (_activePopups[group] && _activePopups[group].el !== el) {
        _closePopupEntry(group, _activePopups[group]);
      }
      var useDisplay = opts.useDisplay !== undefined ? !!opts.useDisplay : (el.style.display === 'none');
      if (useDisplay) el.style.display = opts.displayValue || 'block';
      el.classList.add('open', 'is-open');

      var entry = { el: el, onClose: opts.onClose, useDisplay: useDisplay, unregEsc: null, docHandler: null };
      if (typeof window.cmtPushEscapeHandler === 'function') {
        entry.unregEsc = window.cmtPushEscapeHandler({
          el: el,
          close: function () { _closePopupEntry(group, entry); }
        });
      }
      if (opts.outsideClick !== false) {
        entry.docHandler = function (ev) {
          if (!el.contains(ev.target) && (!opts.anchorEl || !opts.anchorEl.contains(ev.target))) {
            _closePopupEntry(group, entry);
          }
        };
        setTimeout(function () {
          if (_activePopups[group] === entry) {
            document.addEventListener('pointerdown', entry.docHandler, true);
          }
        }, 0);
      }
      _activePopups[group] = entry;

      if (opts.clamp !== false) {
        requestAnimationFrame(function () {
          if (_activePopups[group] === entry) {
            _clampPopupToViewport(el, opts.x, opts.y);
          }
        });
      }
    },
    close: function (elOrGroup) {
      if (typeof elOrGroup === 'string') {
        if (_activePopups[elOrGroup]) _closePopupEntry(elOrGroup, _activePopups[elOrGroup]);
        return;
      }
      Object.keys(_activePopups).forEach(function (g) {
        if (_activePopups[g] && _activePopups[g].el === elOrGroup) {
          _closePopupEntry(g, _activePopups[g]);
        }
      });
    },
    closeAll: function (group) {
      if (group) {
        if (_activePopups[group]) _closePopupEntry(group, _activePopups[group]);
        return;
      }
      Object.keys(_activePopups).forEach(function (g) {
        _closePopupEntry(g, _activePopups[g]);
      });
    },
    clamp: _clampPopupToViewport
  };
})();
