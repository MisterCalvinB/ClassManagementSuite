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
  var _escHandler = null;

  function injectStyles() {
    if (document.getElementById('skm-styles')) return;
    var s = document.createElement('style');
    s.id = 'skm-styles';
    s.textContent = [
      '#skm-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;justify-content:center;align-items:center;backdrop-filter:blur(2px)}',
      '#skm-overlay.open{display:flex}',
      '#skm-panel{background:#fff;border:2px solid #111;border-radius:8px;box-shadow:4px 4px 0 #ccc;max-width:600px;width:calc(100% - 32px);max-height:85vh;overflow-y:auto;position:relative;padding:24px 28px 20px;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;box-sizing:border-box}',
      '#skm-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#888;line-height:1;padding:2px 6px;border-radius:4px}',
      '#skm-close:hover{background:#f0f0f0;color:#111}',
      '#skm-title{font-size:1rem;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#111;margin:0 0 18px;padding-right:30px}',
      '.skm-table{width:100%;border-collapse:collapse;font-size:.84rem}',
      '.skm-table td{padding:6px 8px;vertical-align:middle}',
      '.skm-table tr:not(.skm-sec-row)+tr:not(.skm-sec-row) td{border-top:1px solid #f0f0f0}',
      '.skm-sec-row td{padding-top:16px;padding-bottom:4px;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#999;border-top:none!important}',
      '.skm-sec-row:first-child td{padding-top:4px}',
      '.skm-keys{white-space:nowrap;width:1%;padding-right:14px}',
      '.skm-keys kbd{display:inline-block;background:#f0f0f0;border:1px solid #bbb;border-bottom:2px solid #999;border-radius:3px;padding:1px 6px;font-family:inherit;font-size:.8em;font-weight:700;color:#333}',
      '.skm-or{font-size:.72rem;color:#999;margin:0 3px}',
      '.skm-desc{color:#444;line-height:1.45}',
      '.skm-none{font-size:.85rem;color:#888;font-style:italic;margin:0}'
    ].join('');
    document.head.appendChild(s);
  }

  function renderKeys(keys) {
    return keys.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join(' ');
  }

  function renderTable(rows, noShortcutsText) {
    if (!rows || rows.length === 0) {
      return '<p class="skm-none">' + (noShortcutsText || 'No keyboard shortcuts yet.') + '</p>';
    }
    var html = '<table class="skm-table"><tbody>';
    rows.forEach(function (row) {
      if (row.section !== undefined) {
        html += '<tr class="skm-sec-row"><td colspan="2">' + row.section + '</td></tr>';
      } else {
        html += '<tr><td class="skm-keys">' + renderKeys(row.keys);
        if (row.alt) {
          html += ' <span class="skm-or">' + (row.orText || 'or') + '</span> ' + renderKeys(row.alt);
        }
        html += '</td><td class="skm-desc">' + row.desc + '</td></tr>';
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
      document.body.appendChild(overlay);
    }

    var panel = document.createElement('div');
    panel.id = 'skm-panel';

    var closeBtn = document.createElement('button');
    closeBtn.id = 'skm-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', close);

    var titleEl = document.createElement('h2');
    titleEl.id = 'skm-title';
    titleEl.textContent = config.title || '⌨ Keyboard Shortcuts';

    var bodyEl = document.createElement('div');
    bodyEl.innerHTML = renderTable(config.rows, config.noShortcutsText);

    panel.appendChild(closeBtn);
    panel.appendChild(titleEl);
    panel.appendChild(bodyEl);

    overlay.innerHTML = '';
    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.classList.add('open');

    _escHandler = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', _escHandler);
  }

  function close() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.classList.remove('open');
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler);
      _escHandler = null;
    }
  }

  window.ShortcutsModal = { open: open, close: close, renderTable: renderTable };
})();
