// Shared keyboard-shortcuts modal.
// Usage:
//   ShortcutsModal.open({ title, rows, noShortcutsText })
//   ShortcutsModal.renderTable(rows, noShortcutsText)  → HTML string (embed in existing modals)
//   ShortcutsModal.close()
//
// Row types:
//   { section: 'Section name' }          — section header row
//   { keys: ['Ctrl','S'], desc: '…' }    — shortcut row (keys joined with thin space)
//   { keys: ['Ctrl','S'], alt: ['Cmd','S'], desc: '…', orText: 'or' }  — with alternative combo
(function () {
  'use strict';

  var OVERLAY_ID = 'skm-overlay';

  function _iconPath(name) {
    return (typeof location !== 'undefined' && /\/pages\//.test(location.pathname))
      ? '../assets/icons/' + name
      : 'assets/icons/' + name;
  }

  function injectStyles() {
    if (document.getElementById('skm-styles')) return;
    var s = document.createElement('style');
    s.id = 'skm-styles';
    s.textContent = [
      '#skm-overlay{z-index:9500;user-select:none;-webkit-user-select:none}',
      '#skm-panel{font-family:"Lexend",system-ui,-apple-system,sans-serif}',
      '#skm-title{font-size:1rem;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;color:var(--neo-dark,#222);margin:0}',
      '.skm-table{width:100%;border-collapse:collapse;font-size:.84rem}',
      '.skm-table td{padding:6px 8px;vertical-align:middle}',
      '.skm-table tr:not(.skm-sec-row)+tr:not(.skm-sec-row) td{border-top:1px solid var(--neo-gray-mid,#e2e8f0)}',
      '.skm-sec-row td{padding-top:14px;padding-bottom:4px;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:1.2px;color:var(--neo-gray-dark,#475569);border-top:none!important;user-select:none;-webkit-user-select:none}',
      '.skm-sec-row:first-child td{padding-top:4px}',
      '.skm-keys{white-space:nowrap;width:1%;padding-right:14px;user-select:none;-webkit-user-select:none}',
      '.skm-keys kbd{display:inline-block;background:var(--neo-bg,#f5f5f0);border:1.5px solid var(--neo-border-color,#333);border-bottom-width:2.5px;border-radius:var(--neo-radius-sm,4px);padding:1px 6px;font-family:inherit;font-size:.8em;font-weight:700;color:var(--neo-dark,#222);user-select:none;-webkit-user-select:none}',
      '.skm-or{font-size:.72rem;color:var(--neo-gray-dark,#475569);margin:0 3px}',
      '.skm-desc{color:var(--neo-dark,#222);line-height:1.45}',
      '.skm-none{font-size:.85rem;color:var(--neo-gray-dark,#475569);font-style:italic;margin:0}'
    ].join('');
    document.head.appendChild(s);
  }

  function parseKeys(input) {
    if (Array.isArray(input)) return input;
    if (typeof input === 'string' && input.trim()) {
      return input.split('+').map(function (k) { return k.trim(); }).filter(Boolean);
    }
    return [];
  }

  function renderKeys(input) {
    var keys = parseKeys(input);
    if (!keys.length) return '';
    return keys.map(function (k) {
      return '<kbd>' + String(k || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</kbd>';
    }).join(' ');
  }

  function renderTable(rows, noShortcutsText) {
    if (!rows || rows.length === 0) {
      return '<p class="skm-none">' + (noShortcutsText || 'No keyboard shortcuts defined.') + '</p>';
    }
    var html = '<table class="skm-table"><tbody>';
    rows.forEach(function (row) {
      if (row.section !== undefined) {
        html += '<tr class="skm-sec-row"><td colspan="2">' + row.section + '</td></tr>';
      } else {
        var rawKeys = row.keys || row.key || [];
        var kHtml = renderKeys(rawKeys);
        html += '<tr><td class="skm-keys">' + kHtml;
        if (row.alt) {
          html += ' <span class="skm-or">' + (row.orText || 'or') + '</span> ' + renderKeys(row.alt);
        }
        html += '</td><td class="skm-desc">' + (row.desc || '') + '</td></tr>';
      }
    });
    html += '</tbody></table>';
    return html;
  }

  function open(config) {
    close();
    injectStyles();

    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.className = 'neo-modal-overlay';
      document.body.appendChild(overlay);
    }

    var panel = document.createElement('div');
    panel.id = 'skm-panel';
    panel.className = 'neo-modal neo-modal-md';

    var header = document.createElement('div');
    header.className = 'neo-modal-header';

    var titleEl = document.createElement('h2');
    titleEl.id = 'skm-title';
    titleEl.className = 'neo-modal-title';
    titleEl.textContent = config.title || 'Keyboard Shortcuts';

    var closeBtn = document.createElement('button');
    closeBtn.id = 'skm-close';
    closeBtn.type = 'button';
    closeBtn.className = 'neo-icon-btn neo-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '<img src="' + _iconPath('close.svg') + '" class="neo-icon" alt="" />';
    closeBtn.addEventListener('click', close);

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    var bodyEl = document.createElement('div');
    bodyEl.className = 'neo-modal-body';
    bodyEl.innerHTML = renderTable(config.rows, config.noShortcutsText);

    panel.appendChild(header);
    panel.appendChild(bodyEl);

    overlay.innerHTML = '';
    overlay.appendChild(panel);
    if (window.CmtModal && typeof window.CmtModal.open === 'function') {
      window.CmtModal.open(overlay, { initialFocus: closeBtn });
    } else {
      overlay.classList.add('open');
      if (window.cmtPushEscapeHandler) {
        _escUnreg = window.cmtPushEscapeHandler({ el: overlay, close: close });
      }
    }
  }

  var _escUnreg = null;
  function close() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (window.CmtModal && typeof window.CmtModal.close === 'function' && overlay) {
      window.CmtModal.close(overlay);
    } else {
      if (_escUnreg) { _escUnreg(); _escUnreg = null; }
      if (overlay) overlay.classList.remove('open');
    }
  }

  window.ShortcutsModal = { open: open, close: close, renderTable: renderTable };
})();
