/**
 * Class Management Tools — Board Multi-Page & Snapshot Engine
 * Manages multi-page tabs, in-memory detached DOM cache, page navigation, merging, and snapshots.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var CON_PALETTES = global.CON_PALETTES = global.CON_PALETTES || [];
  var conDrawingSelected = global.conDrawingSelected = global.conDrawingSelected || new Set();
  var conMultiSelected = global.conMultiSelected = global.conMultiSelected || new Set();
  var conNoteSelected = global.conNoteSelected = global.conNoteSelected || new Set();
  var _conShapeSelected = global._conShapeSelected = global._conShapeSelected || new Set();
  var conTableSelected = global.conTableSelected = global.conTableSelected || new Set();
  // _conPageSnapshotPngs is shared globally via board-state.js descriptors
  var _conCopiedPages = global._conCopiedPages = global._conCopiedPages || [];
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  // Active session file and folder names are bound globally in board-state.js

  var boardEscapeHtml = global.boardEscapeHtml = window.boardEscapeHtml || function (text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var escapeSearchHtml = global.escapeSearchHtml = window.escapeSearchHtml || boardEscapeHtml;
  var conEscapeSearchHtml = global.conEscapeSearchHtml = window.conEscapeSearchHtml || escapeSearchHtml;
  var conTitle = global.conTitle = window.conTitle = (typeof window.conTitle !== 'undefined' ? window.conTitle : '');
  var wnRenderMathHtml = global.wnRenderMathHtml = window.wnRenderMathHtml || function (html) { return html; };
  var boardBuildPersistedSessionData = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardBuildPersistedSessionData === 'function') {
      return window.boardBuildPersistedSessionData(...args);
    }
    return args[1] || {};
  };
  var boardSourceLabel = function (source) {
    if (typeof window !== 'undefined' && typeof window.boardSourceLabel === 'function') {
      return window.boardSourceLabel(source);
    }
    return source || '';
  };
  var boardFormatWhen = function (ts) {
    if (typeof window !== 'undefined' && typeof window.boardFormatWhen === 'function') {
      return window.boardFormatWhen(ts);
    }
    return String(ts || '');
  };
  var boardSectionLabel = function (section) {
    if (typeof window !== 'undefined' && typeof window.boardSectionLabel === 'function') {
      return window.boardSectionLabel(section);
    }
    return section || '';
  };
  var boardPersistLocalSession = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardPersistLocalSession === 'function') {
      return window.boardPersistLocalSession(...args);
    }
  };
  var boardSetAutosaveFingerprint = function (...args) {
    if (typeof window !== 'undefined' && typeof window.boardSetAutosaveFingerprint === 'function') {
      return window.boardSetAutosaveFingerprint(...args);
    }
  };

  var conResolvePdfBackgroundAttachment = global.conResolvePdfBackgroundAttachment || window.conResolvePdfBackgroundAttachment || function (bg) {
    if (typeof window !== 'undefined' && typeof window.conResolvePdfBackgroundAttachment === 'function' && window.conResolvePdfBackgroundAttachment !== conResolvePdfBackgroundAttachment) {
      return window.conResolvePdfBackgroundAttachment(bg);
    }
    return null;
  };
  var conRenderPagePdfBackground = global.conRenderPagePdfBackground || window.conRenderPagePdfBackground || function (opts) {
    if (typeof window !== 'undefined' && typeof window.conRenderPagePdfBackground === 'function' && window.conRenderPagePdfBackground !== conRenderPagePdfBackground) {
      return window.conRenderPagePdfBackground(opts);
    }
  };
  var conRenderBoardBg = global.conRenderBoardBg || window.conRenderBoardBg || function (opts) {
    if (typeof window !== 'undefined' && typeof window.conRenderBoardBg === 'function' && window.conRenderBoardBg !== conRenderBoardBg) {
      return window.conRenderBoardBg(opts);
    }
  };
  var conApplyBoardBgColor = global.conApplyBoardBgColor || window.conApplyBoardBgColor || function () {
    if (typeof window !== 'undefined' && typeof window.conApplyBoardBgColor === 'function' && window.conApplyBoardBgColor !== conApplyBoardBgColor) {
      return window.conApplyBoardBgColor();
    }
  };
  var conNormalizeColorHex = global.conNormalizeColorHex || window.conNormalizeColorHex || function (hex) {
    if (typeof window !== 'undefined' && typeof window.conNormalizeColorHex === 'function' && window.conNormalizeColorHex !== conNormalizeColorHex) {
      return window.conNormalizeColorHex(hex);
    }
    return String(hex || '');
  };

      // ---- Mini-Thumb context menu & Drag-and-Drop reorder ----
      let _conMiniThumbDragIdx = null;

    function conWordExportFields(word) {
      const dbEntries = window.conLookupDbEntries ? window.conLookupDbEntries(word, null) : [];
      if (!dbEntries.length) return [{ trans: '', ipa: '', def: '', synonyms: '', antonyms: '', etymology: '' }];
      return dbEntries.map(e => {
        const defRaw = e.definition;
        const def = Array.isArray(defRaw) ? defRaw[0] : (defRaw || '');
        const etyRaw = e.etymology;
        const etymology = Array.isArray(etyRaw) ? etyRaw.join(' ') : (etyRaw || '');
        return {
          trans: e.french || e.translation || '',
          ipa: e.ipa || '',
          def,
          synonyms: Array.isArray(e.synonyms) ? e.synonyms.join(', ') : (e.synonyms || ''),
          antonyms: Array.isArray(e.antonyms) ? e.antonyms.join(', ') : (e.antonyms || ''),
          etymology,
        };
      });
    }

    function conShouldSkipWordExportNode(node) {
      const relation = String((node && node.relation) || '').toLowerCase();
      return relation === 'translation' || relation === 'ipa' || relation === 'etymology';
    }

    function conExportCSV() {
      const nodes = conGetAllPagesNodeData();
      const rows = [['Word', 'Page', 'Translation', 'IPA', 'Definition']];
      nodes.forEach(n => {
        if (conShouldSkipWordExportNode(n)) return;
        const rawText = (n.baseWord || (n.el ? n.el.textContent : '') || '').trim().replace(/\n[\s\S]*/, '');
        if (!rawText) return;
        const page = n.pageNum != null ? String(n.pageNum) : '';

        // Split node text into individual words/entries. Split on commas, slashes, semicolons or newlines.
        const parts = rawText.split(/[,/;\n]+/).map(s => s.trim()).filter(Boolean);

        parts.forEach(word => {
          const entries = conWordExportFields(word);
          entries.forEach(({ trans, ipa, def }) => {
            rows.push([word, page, trans, ipa, def]);
          });
        });
      });
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'board';
      const filename = titleVal.replace(/[\/\\?*:|"<>]/g, '-') + '-words.csv';

      if (window.Desktop && Desktop.isElectron()) {
        Desktop.saveToDisk({
          title: 'Save CSV File',
          defaultPath: filename,
          filters: [{ name: 'CSV Files', extensions: ['csv'] }],
          content: '\uFEFF' + csv,
          encoding: 'utf8'
        }).then(result => {
          if (result && result.ok) {
            if (window.showExportSuccessPopup) showExportSuccessPopup(result.path, filename);
          } else if (result && !result.ok && !result.canceled) {
            if (typeof mdbToast === 'function') mdbToast(' Save failed: ' + (result.error || 'unknown'));
          }
        });
      } else {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
    }


    // Offer CSV or PDF export. PDF exports only the words/definitions table (printable HTML -> print/save as PDF).
    function conExport(triggerEvent) {
      if (window.CmtWizard && typeof window.conOpenExportWizard === 'function' && !(triggerEvent && triggerEvent.shiftKey)) {
        const existing = document.getElementById('con-export-chooser');
        if (existing) existing.remove();
        window.conOpenExportWizard(triggerEvent);
        return;
      }
      conOpenLegacyExportChooser(triggerEvent);
    }

    function conOpenLegacyExportChooser(triggerEvent) {
      // Inline chooser shown next to the Export button
      const existing = document.getElementById('con-export-chooser');
      if (existing) { existing.remove(); return; }

      const evObj = triggerEvent || (typeof event !== 'undefined' ? event : null);
      const btn = evObj && evObj.currentTarget ? evObj.currentTarget : document.querySelector('[data-bev-481]');
      const rect = btn ? btn.getBoundingClientRect() : { left: 100, top: 100, bottom: 132, height: 28 };

      const chooser = document.createElement('div');
      chooser.id = 'con-export-chooser';
      chooser.style.position = 'fixed';
      chooser.style.left = Math.max(10, Math.min(window.innerWidth - 240, rect.left)) + 'px';
      chooser.style.top = (rect.bottom + 6) + 'px';
      chooser.style.background = '#f5f5f0';
      chooser.style.border = '2px solid #333333';
      chooser.style.boxShadow = '4px 4px 0 #555555';
      chooser.style.padding = '8px';
      chooser.style.zIndex = 99999;
      chooser.style.borderRadius = '8px';
      chooser.style.fontFamily = '"Lexend", "Segoe UI", Arial, sans-serif';
      chooser.style.width = '210px';
      chooser.style.display = 'flex';
      chooser.style.flexDirection = 'column';
      chooser.style.gap = '4px';

      const titleEl = document.createElement('div');
      titleEl.textContent = 'EXPORT OPTIONS';
      titleEl.style.fontSize = '9.5px';
      titleEl.style.fontWeight = '800';
      titleEl.style.letterSpacing = '0.5px';
      titleEl.style.color = '#555555';
      titleEl.style.padding = '2px 4px 6px';
      titleEl.style.borderBottom = '1.5px solid #ddddda';
      titleEl.style.marginBottom = '2px';
      chooser.appendChild(titleEl);

      function createExportBtn(text, bg, isPrimary) {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.display = 'flex';
        b.style.alignItems = 'center';
        b.style.width = '100%';
        b.style.padding = '6px 10px';
        b.style.fontSize = '11px';
        b.style.fontWeight = isPrimary ? '800' : '700';
        b.style.border = '2px solid #333333';
        b.style.borderRadius = '6px';
        b.style.boxShadow = '2px 2px 0 #555555';
        b.style.background = bg || '#ffffff';
        b.style.color = '#111111';
        b.style.cursor = 'pointer';
        b.style.textAlign = 'left';
        b.style.transition = 'transform 0.1s, box-shadow 0.1s';
        b.onmouseenter = () => { b.style.transform = 'translate(-1px, -1px)'; b.style.boxShadow = '3px 3px 0 #555555'; };
        b.onmouseleave = () => { b.style.transform = 'none'; b.style.boxShadow = '2px 2px 0 #555555'; };
        b.onmousedown = () => { b.style.transform = 'translate(1px, 1px)'; b.style.boxShadow = '1px 1px 0 #555555'; };
        b.onmouseup = () => { b.style.transform = 'none'; b.style.boxShadow = '2px 2px 0 #555555'; };
        return b;
      }

      const pagesPdfVectorBtn = createExportBtn('Export Pages PDF (Vector)', '#e2c96e', true);
      pagesPdfVectorBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportPagesPDF('vector'); };

      const pagesPdfSnapshotBtn = createExportBtn('Export Pages PDF (Snapshots)', '#ffffff');
      pagesPdfSnapshotBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conOpenExportSettingsModal('pdf_snapshots'); };

      const webpBtn = createExportBtn(window.i18n ? i18n.t('conExportOptWebpImg') : 'Export WebP Image', '#ffffff');
      webpBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conOpenExportSettingsModal('webp'); };

      const pdfBtn = createExportBtn('Export Words Table PDF', '#ffffff');
      pdfBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportPDF(); };

      const pngBtn = createExportBtn('Export PNG', '#ffffff');
      pngBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportPNG(); };

      const copyPngBtn = createExportBtn('Copy PNG', '#ffffff');
      copyPngBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conCopyPNG(); };

      const csvBtn = createExportBtn('Export CSV', '#ffffff');
      csvBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportCSV(); };

      const jsBtn = createExportBtn('Export as JS', '#ffffff');
      jsBtn.onclick = e => { e.stopPropagation(); chooser.remove(); conExportJS(); };

      const cancelBtn = createExportBtn('Cancel', '#f1f1f0');
      cancelBtn.style.color = '#666666';
      cancelBtn.style.boxShadow = '1px 1px 0 #888888';
      cancelBtn.style.border = '1.5px solid #666666';
      cancelBtn.onclick = e => { e.stopPropagation(); chooser.remove(); };

      chooser.appendChild(pagesPdfVectorBtn);
      chooser.appendChild(pagesPdfSnapshotBtn);
      chooser.appendChild(webpBtn);
      chooser.appendChild(pdfBtn);
      chooser.appendChild(pngBtn);
      chooser.appendChild(copyPngBtn);
      chooser.appendChild(csvBtn);
      chooser.appendChild(jsBtn);
      chooser.appendChild(cancelBtn);
      document.body.appendChild(chooser);

      // Close chooser on outside click or Escape
      function onBodyClick(ev) {
        if (!chooser.contains(ev.target)) { chooser.remove(); document.removeEventListener('click', onBodyClick); document.removeEventListener('keydown', onKey); }
      }
      function onKey(ev) { if (ev.key === 'Escape') { chooser.remove(); document.removeEventListener('click', onBodyClick); document.removeEventListener('keydown', onKey); } }
      setTimeout(() => document.addEventListener('click', onBodyClick));
      document.addEventListener('keydown', onKey);
    }

    async function conExportJS() {
      const data = conBuildSessionData();
      if (!conSessionHasContent(data)) {
        mdbToast(' Nothing to export — add at least one node, note, or title first.');
        return;
      }
      const persistedData = boardBuildPersistedSessionData('constellation', data);
      const titleVal = window.conGetTitle ? window.conGetTitle() : '';
      const filename = boardDefaultFileName('constellation', titleVal);

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.exportFiles === 'function') {
        try {
          const bundle = await conBuildSessionFolderBundle(filename, persistedData, { isManualSave: true });
          const result = await Desktop.exportFiles(bundle.files.map(file => ({
            filename: file.filename,
            relativeExportPath: (file.subdir ? (file.subdir + '/') : '') + file.filename,
            content: file.content,
            encoding: file.encoding || 'utf8',
            mtimeMs: file.mtimeMs || undefined
          })));
          if (!result || result.canceled) return;
          if (!result.ok) {
            throw new Error(result.error || 'Export failed.');
          }
          const errors = Array.isArray(result.errors) ? result.errors : [];
          const errCount = Array.isArray(result.errors) ? result.errors.length : 0;
          if (errCount > 0) {
            const firstError = errors[0] && errors[0].error ? ' First error: ' + errors[0].error : '';
            mdbToast(' Exported Constellation folder with ' + errCount + ' error(s).' + firstError);
          } else {
            mdbToast(' Exported Constellation folder: ' + bundle.folderName);
            if (window.showExportSuccessPopup && result.folderPath) {
              showExportSuccessPopup(result.folderPath, bundle.folderName, true);
            }
          }
          return;
        } catch (error) {
          mdbToast(' Could not export Constellation folder: ' + (error && error.message ? error.message : String(error)));
          return;
        }
      }

      const blob = boardBuildSessionBlob(persistedData, 'CONSTELLATION_SESSION_EXPORT');
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'JavaScript Files', accept: { 'text/javascript': ['.js'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          _conCurrentFileName = handle.name;
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error('File System API error:', err);
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function conExportPDF() {
      const nodes = conGetAllPagesNodeData();
      const drawings = window.conGetDrawings ? window.conGetDrawings() : [];
      const shapes = window.conGetShapes ? window.conGetShapes() : [];
      document.getElementById('con-pdf-picker-overlay').classList.add('active');
    }

    function conPdfPickerClose() {
      document.getElementById('con-pdf-picker-overlay').classList.remove('active');
    }

    async function conGetEmbeddedLexendFontsCss() {
      const weights = [300, 400, 500, 600, 700];
      let css = '';
      for (const weight of weights) {
        try {
          const relPath = 'modules/lexend/lexend-latin-' + weight + '-normal.woff2';
          const r = await Desktop.readByPath('app', relPath, { encoding: 'base64' });
          if (r && r.ok && r.content) {
            css += '@font-face {\n font-family: \'Lexend\';\n font-weight: ' + weight + ';\n font-style: normal;\n src: url(\'data:font/woff2;base64,' + r.content + '\') format(\'woff2\');\n}\n';
          }
        } catch (e) {
          console.warn('Failed to embed Lexend font weight ' + weight, e);
        }
      }
      return css;
    }

    async function _doConExportPDF() {
      conPdfPickerClose();
      const lexendFontsCss = await conGetEmbeddedLexendFontsCss();
      const chk = id => document.getElementById(id).checked;
      const fields = {
        page: chk('cpf-page'),
        translation: chk('cpf-translation'),
        ipa: chk('cpf-ipa'),
        definition: chk('cpf-definition'),
        synonyms: chk('cpf-synonyms'),
        antonyms: chk('cpf-antonyms'),
        etymology: chk('cpf-etymology'),
      };

      const nodes = conGetAllPagesNodeData();
      const _pdfDrawings = window.conGetDrawings ? window.conGetDrawings() : [];
      const _pdfShapes = window.conGetShapes ? window.conGetShapes() : [];
      // Build column definitions
      const cols = [{ label: 'Word' }];
      if (fields.page) cols.push({ label: 'Page' });
      if (fields.translation) cols.push({ label: 'Translation' });
      if (fields.ipa) cols.push({ label: 'IPA' });
      if (fields.definition) cols.push({ label: 'Definition' });
      if (fields.synonyms) cols.push({ label: 'Synonyms' });
      if (fields.antonyms) cols.push({ label: 'Antonyms' });
      if (fields.etymology) cols.push({ label: 'Etymology' });

      const dataRows = [];
      nodes.forEach(n => {
        if (conShouldSkipWordExportNode(n)) return;
        const rawText = (n.baseWord || (n.el ? n.el.textContent : '') || '').trim().replace(/\n[\s\S]*/, '');
        if (!rawText) return;
        const page = n.pageNum != null ? String(n.pageNum) : '';
        const parts = rawText.split(/[,/;\n]+/).map(s => s.trim()).filter(Boolean);
        parts.forEach(word => {
          const entries = conWordExportFields(word);
          entries.forEach(({ trans, ipa, def, synonyms, antonyms, etymology }) => {
            const row = [word];
            if (fields.page) row.push(page);
            if (fields.translation) row.push(trans);
            if (fields.ipa) row.push(ipa);
            if (fields.definition) row.push(def);
            if (fields.synonyms) row.push(synonyms);
            if (fields.antonyms) row.push(antonyms);
            if (fields.etymology) row.push(etymology);
            dataRows.push(row);
          });
        });
      });

      function getPdfExportSettings() {
        const cfg = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG)
          ? CLASS_MANAGEMENT_CONFIG
          : (window.CLASS_MANAGEMENT_CONFIG || {});
        const exp = cfg.export || {};
        
        let margin = '16mm 14mm';
        if (exp.pdfMargin) {
          if (typeof exp.pdfMargin === 'string') margin = exp.pdfMargin;
          else if (typeof exp.pdfMargin === 'number') margin = exp.pdfMargin + 'mm';
          else if (typeof exp.pdfMargin === 'object') {
            const t = exp.pdfMargin.top || '16mm';
            const r = exp.pdfMargin.right || '14mm';
            const b = exp.pdfMargin.bottom || '16mm';
            const l = exp.pdfMargin.left || '14mm';
            margin = `${t} ${r} ${b} ${l}`;
          }
        } else if (exp.margin) {
          if (typeof exp.margin === 'string') margin = exp.margin;
          else if (typeof exp.margin === 'number') margin = exp.margin + 'mm';
        }

        let orientation = (exp.orientation || exp.pdfOrientation || 'portrait').toLowerCase();
        if (orientation !== 'landscape' && orientation !== 'portrait') orientation = 'portrait';

        const pageSize = (exp.pageSize || exp.size || 'A4').trim();

        return {
          margin: margin,
          orientation: orientation,
          isLandscape: orientation === 'landscape',
          pageSize: pageSize
        };
      }

      function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'board';
      const displayTitle = escapeHtml(titleVal);
      const pdfSettings = getPdfExportSettings();

      const headerCells = cols.map(c => '<th>' + escapeHtml(c.label) + '</th>').join('');
      let tableHtml = '<table><thead><tr>' + headerCells + '</tr></thead><tbody>';
      dataRows.forEach(r => { tableHtml += '<tr>' + r.map(c => '<td>' + escapeHtml(c) + '</td>').join('') + '</tr>'; });
      tableHtml += '</tbody></table>';

      const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + displayTitle + '</title>'
        + '<style>' + lexendFontsCss + 'body{font-family:\'Lexend\',\'Segoe UI\',Arial,sans-serif;margin:0;padding:0;}h1{font-size:18px;margin-bottom:8px;border-bottom:2.5px solid #111;padding-bottom:4px}table{border-collapse:collapse;width:100%;border:2px solid #111}thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}th,td{border:2px solid #111;padding:6px;text-align:left;vertical-align:top}th{background:#f0f0f0;font-weight:800}@page{size:' + pdfSettings.pageSize + ' ' + pdfSettings.orientation + ';margin:' + pdfSettings.margin + ';}@media print{button{display:none};body{margin:0;padding:0;}}</style>'
        + '</head><body><h1>' + displayTitle + '</h1>' + tableHtml + '</body></html>';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.printPdf === 'function') {
        const safeTitle = titleVal.replace(/[\\/:*?"<>|]/g, '_') || 'vocabulary';
        const defaultName = safeTitle + '.pdf';

        const doPrint = (targetFilename, isToPrint) => {
          const pdfReq = {
            html,
            landscape: pdfSettings.isLandscape,
            pdfOptions: { pageSize: pdfSettings.pageSize, landscape: pdfSettings.isLandscape, printBackground: true }
          };
          if (isToPrint) {
            pdfReq.target = 'toPrint';
            pdfReq.filename = targetFilename;
          } else {
            pdfReq.defaultName = targetFilename;
          }
          Desktop.printPdf(pdfReq).then(result => {
            if (result && result.ok) {
              if (window.showExportSuccessPopup && result.path) {
                showExportSuccessPopup(result.path, result.name || targetFilename);
              } else if (typeof mdbToast === 'function') {
                mdbToast(' PDF saved: ' + (result.name || targetFilename));
              }
            } else if (!result.ok && !result.canceled) {
              mdbToast(' Could not save PDF: ' + (result.error || 'unknown error'));
            }
          }).catch(err => {
            mdbToast(' Could not save PDF: ' + (err && err.message ? err.message : String(err)));
          });
        };

        if (typeof window.promptExportDestination === 'function') {
          window.promptExportDestination({
            title: 'Export Vocabulary Table PDF',
            prompt: 'Where do you want to save the exported PDF?',
            filename: defaultName,
            allowDocEditor: false
          }).then(destRes => {
            if (!destRes || destRes.canceled) return;
            doPrint(destRes.filename || defaultName, destRes.destination === 'to-print');
          });
        } else {
          doPrint(defaultName, false);
        }
      } else {
        let iframe = document.getElementById('con-pdf-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'con-pdf-iframe';
          iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px';
          document.body.appendChild(iframe);
        }
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { /* ignore */ } }, 350);
      }
    }

    async function conPrepareAttachmentBundle(folderName) {
      const metadata = [];
      const files = [];
      const taken = new Set();
      const mediaDirs = ['pics', 'sounds', 'videos', 'pdf'];

      mediaDirs.forEach(dir => {
        files.push({
          filename: '.keep',
          subdir: folderName + '/' + dir,
          content: '',
          encoding: 'utf8'
        });
      });

      for (const item of conAttachments) {
        const kind = conAttachmentKind(item.name, item.mime) || item.kind;
        if (!kind) continue;
        const fallbackExt = kind === 'pdf' ? '.pdf' : '';
        let safeName = conSanitizeAttachmentName(item.name, fallbackExt);
        const ext = (() => {
          const idx = safeName.lastIndexOf('.');
          return idx >= 0 ? safeName.slice(idx) : '';
        })();
        const baseNoExt = ext ? safeName.slice(0, -ext.length) : safeName;
        let suffix = 2;
        while (taken.has((kind + '/' + safeName).toLowerCase())) {
          safeName = baseNoExt + '-' + suffix + ext;
          suffix += 1;
        }
        taken.add((kind + '/' + safeName).toLowerCase());

        const nextRelativePath = folderName + '/' + kind + '/' + safeName;
        let base64 = item.base64 || '';

        if (!base64 && item.file) {
          try {
            base64 = await conReadAttachmentFileBase64(item.file);
          } catch (error) {
            console.info('Could not read selected attachment:', item.name, error);
          }
        }
        if (!base64 && item._cachedDataUrl && item._cachedDataUrl.startsWith('data:')) {
          const commaIdx = item._cachedDataUrl.indexOf(',');
          if (commaIdx >= 0) base64 = item._cachedDataUrl.slice(commaIdx + 1);
        }
        if (!base64 && item._cachedObjectUrl && item._cachedObjectUrl.startsWith('blob:')) {
          try {
            const resp = await fetch(item._cachedObjectUrl);
            const blob = await resp.blob();
            base64 = await conReadAttachmentFileBase64(blob);
          } catch (e) {
            console.warn('Could not read blob url for attachment:', item.name, e);
          }
        }
        if (!base64 && window.Desktop && Desktop.isElectron() && typeof Desktop.readByPath === 'function') {
          const candidates = conAttachmentCandidateRelativePaths(item);
          for (const candidatePath of candidates) {
            try {
              const readResult = await Desktop.readByPath('mindmaps', candidatePath, { encoding: 'base64' });
              if (readResult && readResult.ok && readResult.content) {
                base64 = String(readResult.content);
                break;
              }
            } catch { }
          }
          if (!base64) {
            console.info('Could not copy existing attachment from known paths:', candidates);
          }
        }

        if (base64) {
          if (base64.startsWith('data:')) {
            const commaIdx = base64.indexOf(',');
            if (commaIdx >= 0) base64 = base64.slice(commaIdx + 1);
          }
          item.base64 = base64;
          files.push({
            filename: safeName,
            subdir: folderName + '/' + kind,
            content: base64,
            encoding: 'base64'
          });
        }

        metadata.push({
          id: item.id,
          name: safeName,
          mime: item.mime || conGuessMimeByName(item.name, kind) || '',
          kind,
          size: Number(item.size) || (base64 ? Math.round(base64.length * 0.75) : 0),
          relativePath: base64 ? nextRelativePath : (item.relativePath || nextRelativePath)
        });
      }

      return { files, metadata };
    }

    function conExtractSearchTextFromSession(dataObj, maxLen = 50000) {
      if (!dataObj || typeof dataObj !== 'object') return '';
      const tokens = [];
      let totalLen = 0;

      function addText(str) {
        if (!str || totalLen >= maxLen) return;
        const clean = String(str).trim();
        if (!clean) return;
        tokens.push(clean);
        totalLen += clean.length + 1;
      }

      function processPage(page) {
        if (!page || typeof page !== 'object') return;
        addText(page.title);

        if (Array.isArray(page.nodes)) {
          for (const node of page.nodes) {
            if (!node) continue;
            addText(node.baseWord);
            addText(node.dbWord);
            addText(node.sourceWord);
            addText(node.notes);
            addText(node.comment);
            addText(node.label);
          }
        }

        if (Array.isArray(page.notes)) {
          for (const note of page.notes) {
            if (!note) continue;
            addText(note.title);
            addText(note.text);
            addText(note.content);
          }
        }

        if (Array.isArray(page.tables)) {
          for (const table of page.tables) {
            if (!table) continue;
            addText(table.title);
            if (Array.isArray(table.headers)) {
              for (const h of table.headers) addText(h);
            }
            if (Array.isArray(table.rows)) {
              for (const row of table.rows) {
                if (Array.isArray(row)) {
                  for (const cell of row) addText(cell);
                }
              }
            }
          }
        }

        if (Array.isArray(page.groups)) {
          for (const group of page.groups) {
            if (!group) continue;
            addText(group.title);
            addText(group.label);
          }
        }

        if (Array.isArray(page.edges)) {
          for (const edge of page.edges) {
            if (!edge) continue;
            addText(edge.label);
          }
        }

        if (Array.isArray(page.shapes)) {
          for (const shape of page.shapes) {
            if (!shape) continue;
            addText(shape.text);
            addText(shape.label);
          }
        }

        if (Array.isArray(page.media)) {
          for (const m of page.media) {
            if (!m) continue;
            addText(m.title);
            addText(m.name);
            addText(m.caption);
          }
        }
      }

      addText(dataObj.title);
      if (Array.isArray(dataObj.pages) && dataObj.pages.length > 0) {
        for (const page of dataObj.pages) {
          processPage(page);
        }
      } else {
        processPage(dataObj);
      }

      return tokens.join(' ').slice(0, maxLen);
    }

    async function conRebuildPageVisualSnapshots(pages, options = {}) {
      const isAutosave = !!(options && options.isAutosave);
      const total = Array.isArray(pages) ? pages.length : 0;
      if (!Array.isArray(_conPageSnapshotPngs)) _conPageSnapshotPngs = [];

      // 1. Refresh active page visual snapshot with full-resolution live board canvas
      if (typeof conCurrentPageIndex === 'number' && conCurrentPageIndex >= 0 && conCurrentPageIndex < total) {
        const liveSnap = (typeof conBuildPageSnapshot === 'function')
          ? conBuildPageSnapshot()
          : (conPageSnapshots && conPageSnapshots[conCurrentPageIndex]);
        if (liveSnap && Array.isArray(conPageSnapshots)) {
          conPageSnapshots[conCurrentPageIndex] = liveSnap;
        }
        let activeDataUrl = '';
        if (typeof _conBuildBoardCanvas === 'function') {
          try {
            const liveRes = await _conBuildBoardCanvas({ scale: 0.5 });
            if (liveRes && liveRes.canvas) {
              activeDataUrl = liveRes.canvas.toDataURL('image/webp', 0.92);
              if (!activeDataUrl || !activeDataUrl.startsWith('data:image/webp')) {
                activeDataUrl = liveRes.canvas.toDataURL('image/png');
              }
              try {
                liveRes.canvas.width = 0;
                liveRes.canvas.height = 0;
              } catch (_) {}
            }
          } catch (err) {
            console.warn('[Board] _conBuildBoardCanvas error on snapshot capture:', err);
          }
        }
        if (!activeDataUrl && liveSnap && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            activeDataUrl = conBuildPageThumbnailDataUrl(liveSnap, 800, 533);
          } catch (_) {}
        }
        if (activeDataUrl) {
          _conPageSnapshotPngs[conCurrentPageIndex] = activeDataUrl;
        }
      }

      // 2. For inactive pages: preserve existing real high-res snapshots; only generate if missing
      for (let i = 0; i < total; i++) {
        if (i === conCurrentPageIndex) continue;
        if (!_conPageSnapshotPngs[i] && typeof conBuildPageThumbnailDataUrl === 'function' && pages[i]) {
          try {
            const url = conBuildPageThumbnailDataUrl(pages[i], 800, 533);
            if (url) _conPageSnapshotPngs[i] = url;
          } catch (_) {}
        }
      }

      // 3. Update DOM mini-strip thumbnails in-place so UI matches fresh snapshots
      if (!isAutosave) {
        const strip = document.getElementById('con-page-mini-strip');
        if (strip) {
          const thumbs = strip.querySelectorAll('.con-page-mini-thumb');
          thumbs.forEach((btn, i) => {
            if (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) {
              const img = btn.querySelector('img');
              const canvas = btn.querySelector('canvas');
              if (img && img.src !== _conPageSnapshotPngs[i]) {
                img.src = _conPageSnapshotPngs[i];
                img.style.display = 'block';
                img.dataset.pngLoaded = '1';
                if (canvas) canvas.style.display = 'none';
              }
            }
          });
        }
      }
    }

    async function conBuildSessionArchiveBundle(sessionFilename, persistedData, options = {}) {
      const isAutosave = !!(options && options.isAutosave);
      const normalizedFilename = sessionFilename.endsWith('.cstz')
        ? sessionFilename
        : (sessionFilename.endsWith('.js') || sessionFilename.endsWith('.json') || sessionFilename.endsWith('.zip'))
          ? boardStripJsonExt(sessionFilename) + '.cstz'
          : sessionFilename + '.cstz';
      const baseName = boardStripJsonExt(normalizedFilename);
      const attachmentBundle = await conPrepareAttachmentBundle(baseName);

      const attachmentById = {};
      (attachmentBundle.metadata || []).forEach(meta => {
        if (!meta || !meta.id) return;
        attachmentById[String(meta.id)] = meta;
      });

      function conNormalizeMediaPathRefsInSession(dataObj) {
        if (!dataObj || typeof dataObj !== 'object') return dataObj;
        function patchPage(pageObj) {
          if (!pageObj || typeof pageObj !== 'object') return;
          const mediaList = Array.isArray(pageObj.media) ? pageObj.media : [];
          mediaList.forEach(m => {
            const linked = m && m.attachmentId ? attachmentById[String(m.attachmentId)] : null;
            if (!linked) return;
            m.name = linked.name || m.name;
            m.mime = linked.mime || m.mime;
            m.relativePath = linked.relativePath || m.relativePath;
          });
          if (pageObj.backgroundPdf && pageObj.backgroundPdf.attachmentId) {
            const linkedPdf = attachmentById[String(pageObj.backgroundPdf.attachmentId)];
            if (linkedPdf) {
              pageObj.backgroundPdf.name = linkedPdf.name || pageObj.backgroundPdf.name;
              pageObj.backgroundPdf.mime = linkedPdf.mime || pageObj.backgroundPdf.mime;
              pageObj.backgroundPdf.relativePath = linkedPdf.relativePath || pageObj.backgroundPdf.relativePath;
            }
          }
        }

        if (Array.isArray(dataObj.pages)) {
          dataObj.pages.forEach(patchPage);
        } else {
          patchPage(dataObj);
        }
        return dataObj;
      }

      const dataToSave = Object.assign({}, persistedData, {
        attachments: attachmentBundle.metadata
      });
      conNormalizeMediaPathRefsInSession(dataToSave);

      const pages = (Array.isArray(dataToSave.pages) && dataToSave.pages.length > 0)
        ? dataToSave.pages
        : [dataToSave];

      // Rebuild visual snapshots: all pages on manual save, fast cache on autosave
      await conRebuildPageVisualSnapshots(pages, options);

      const createdAtMs = Number(dataToSave._createdAt || dataToSave.createdAt)
        || (dataToSave.dateCreated ? Date.parse(String(dataToSave.dateCreated).replace(/_\d+$/, '')) : 0)
        || Date.now();
      const savedAtMs = Number(dataToSave._savedAt || dataToSave.savedAt) || Date.now();

      const savedPlannerIds = (typeof bpNormalizeEntryIds === 'function')
        ? bpNormalizeEntryIds(dataToSave._plannerEntryIds, dataToSave.plannerEntryIds, dataToSave._plannerEntryId, dataToSave.plannerEntryId)
        : (Array.isArray(dataToSave._plannerEntryIds) ? dataToSave._plannerEntryIds : (dataToSave._plannerEntryId ? [dataToSave._plannerEntryId] : []));
      const manifest = {
        version: 1,
        format: 'cstz',
        title: dataToSave.title || baseName,
        classGroup: dataToSave._classGroup || dataToSave.classGroup || '',
        plannerEntryIds: savedPlannerIds,
        plannerEntryId: savedPlannerIds[0] || dataToSave._plannerEntryId || '',
        lessonId: dataToSave._lessonId || dataToSave.lessonId || '',
        competences: Array.isArray(dataToSave.competences) ? dataToSave.competences : ((typeof global._conCurrentCompetences !== 'undefined' && Array.isArray(global._conCurrentCompetences)) ? global._conCurrentCompetences : []),
        pageCount: pages.length,
        nodeCount: Array.isArray(dataToSave.nodes) ? dataToSave.nodes.length : 0,
        thumbnail: 'page-snapshots/page-001.webp',
        createdAt: createdAtMs,
        dateCreated: dataToSave.dateCreated || new Date(createdAtMs).toISOString(),
        updatedAt: savedAtMs,
        savedAt: savedAtMs,
        searchText: conExtractSearchTextFromSession(dataToSave, 50000)
      };

      const entries = [
        {
          name: 'manifest.json',
          data: isAutosave ? JSON.stringify(manifest) : JSON.stringify(manifest, null, 2),
          encoding: 'utf8',
          store: true
        },
        {
          name: 'board.json',
          data: isAutosave ? JSON.stringify(dataToSave) : JSON.stringify(dataToSave, null, 2),
          encoding: 'utf8',
          store: true
        }
      ];

      // Add thumbnail entries for all pages into the archive
      for (let i = 0; i < pages.length; i += 1) {
        let snapDataUrl = (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) || '';
        if (!snapDataUrl && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            snapDataUrl = conBuildPageThumbnailDataUrl(pages[i], 480, 320);
            if (snapDataUrl) {
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[i] = snapDataUrl;
            }
          } catch (_) {}
        }
        if (snapDataUrl) {
          let ext = 'webp';
          let base64Data = '';
          const commaIdx = snapDataUrl.indexOf(',');
          if (commaIdx >= 0) {
            const header = snapDataUrl.slice(0, commaIdx);
            if (header.includes('image/png')) ext = 'png';
            else if (header.includes('image/jpeg') || header.includes('image/jpg')) ext = 'jpg';
            else ext = 'webp';
            base64Data = snapDataUrl.slice(commaIdx + 1);
          } else {
            base64Data = snapDataUrl;
          }
          const padded = String(i + 1).padStart(3, '0');
          entries.push({
            name: 'page-snapshots/page-' + padded + '.' + ext,
            data: base64Data,
            encoding: 'base64',
            store: true
          });
          if (i === 0) {
            entries.push({
              name: 'thumbnail.' + ext,
              data: base64Data,
              encoding: 'base64',
              store: true
            });
            manifest.thumbnail = 'page-snapshots/page-001.' + ext;
          }
        }
      }

      for (const f of attachmentBundle.files) {
        if (f.filename === '.keep') continue;
        const mediaPath = f.subdir ? (f.subdir.replace(/^[^/]+\//, '') + '/' + f.filename) : f.filename;
        entries.push({
          name: 'media/' + mediaPath,
          data: f.content,
          encoding: f.encoding || 'utf8',
          store: true
        });
      }

      return {
        filename: normalizedFilename,
        baseName,
        data: dataToSave,
        entries,
        attachments: attachmentBundle.metadata
      };
    }

    async function conParseBoardArchiveArrayBuffer(buffer) {
      const bytes = new Uint8Array(buffer);
      const view = new DataView(buffer);
      let offset = 0;
      let manifest = null;
      let boardData = null;
      const history = [];
      const media = {};
      const thumbnails = {};

      while (offset < bytes.length - 22) {
        const sig = view.getUint32(offset, true);
        if (sig === 0x04034b50) {
          const filenameLen = view.getUint16(offset + 26, true);
          const extraLen = view.getUint16(offset + 28, true);
          const compressedSize = view.getUint32(offset + 18, true);
          const compressionMethod = view.getUint16(offset + 8, true);

          const filenameBytes = bytes.subarray(offset + 30, offset + 30 + filenameLen);
          const filename = new TextDecoder('utf-8').decode(filenameBytes);
          const dataStart = offset + 30 + filenameLen + extraLen;
          const dataEnd = dataStart + compressedSize;

          let entryDataBytes = null;
          if (compressionMethod === 8) {
            if (typeof DecompressionStream === 'function') {
              try {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(bytes.subarray(dataStart, dataEnd));
                writer.close();
                const res = await new Response(ds.readable).arrayBuffer();
                entryDataBytes = new Uint8Array(res);
              } catch (e) {
                console.error('DecompressionStream error:', e);
              }
            }
          } else if (compressionMethod === 0) {
            entryDataBytes = bytes.subarray(dataStart, dataEnd);
          }

          if (entryDataBytes) {
            if (filename === 'manifest.json') {
              try { manifest = JSON.parse(new TextDecoder('utf-8').decode(entryDataBytes)); } catch {}
            } else if (filename === 'board.json') {
              try { boardData = JSON.parse(new TextDecoder('utf-8').decode(entryDataBytes)); } catch {}
            } else if (filename.startsWith('history/') && filename.endsWith('.json')) {
              try {
                history.push({
                  name: filename.slice('history/'.length),
                  data: JSON.parse(new TextDecoder('utf-8').decode(entryDataBytes))
                });
              } catch {}
            } else if (filename.startsWith('page-snapshots/') || filename.startsWith('thumbnails/') || filename.startsWith('thumbnail.') || filename === 'thumbnail.png') {
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < entryDataBytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, entryDataBytes.subarray(i, i + chunkSize));
              }
              const base64 = btoa(binary);
              const mimeType = (filename.endsWith('.png')) ? 'image/png' : (filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/webp');
              const dataUrl = 'data:' + mimeType + ';base64,' + base64;
              thumbnails[filename] = dataUrl;
              const mediaEntry = {
                name: filename.split('/').pop(),
                kind: 'pics',
                subPath: filename,
                base64: base64,
                size: entryDataBytes.length
              };
              media[filename] = mediaEntry;
            } else if (filename.startsWith('media/') || /^(pdf|pics|images|sounds|sound|audio|videos|video)\//i.test(filename)) {
              const mediaSubPath = filename.startsWith('media/') ? filename.slice('media/'.length) : filename;
              const parts = mediaSubPath.split('/');
              const rawKind = parts[0].toLowerCase();
              const kind = rawKind === 'images' ? 'pics' : ((rawKind === 'sound' || rawKind === 'audio' || rawKind === 'sounds') ? 'sounds' : ((rawKind === 'video' || rawKind === 'videos') ? 'videos' : rawKind));
              const mediaName = parts.slice(1).join('/');
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < entryDataBytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, entryDataBytes.subarray(i, i + chunkSize));
              }
              const base64 = btoa(binary);
              const mime = conGuessMimeByName(mediaName, kind) || (kind === 'pics' ? 'image/webp' : (kind === 'sounds' ? 'audio/wav' : (kind === 'videos' ? 'video/webm' : 'application/octet-stream')));
              const mediaEntry = {
                name: mediaName,
                kind: kind,
                mime: mime,
                subPath: mediaSubPath,
                base64: base64,
                size: entryDataBytes.length
              };
              media[mediaSubPath] = mediaEntry;
              media['media/' + mediaSubPath] = mediaEntry;
              media[kind + '/' + mediaName] = mediaEntry;
              media[mediaName] = mediaEntry;
              media[mediaName.toLowerCase()] = mediaEntry;
            }
          }

          offset = dataEnd;
        } else {
          offset += 1;
        }
      }

      if (manifest && boardData) {
        if (!boardData._createdAt && (manifest.createdAt || manifest._createdAt)) {
          boardData._createdAt = Number(manifest.createdAt || manifest._createdAt) || undefined;
        }
        if (!boardData._savedAt && (manifest.updatedAt || manifest.savedAt || manifest._savedAt)) {
          boardData._savedAt = Number(manifest.updatedAt || manifest.savedAt || manifest._savedAt) || undefined;
        }
        if (!boardData.dateCreated && manifest.dateCreated) {
          boardData.dateCreated = manifest.dateCreated;
        }
      }

      return { ok: true, manifest, boardData, history, media, thumbnails };
    }

    async function conBuildSessionFolderBundle(sessionFilename, persistedData, options = {}) {
      const normalizedFilename = sessionFilename.endsWith('.js') ? sessionFilename : boardStripJsonExt(sessionFilename) + '.js';
      const folderName = boardStripJsonExt(normalizedFilename);
      const attachmentBundle = await conPrepareAttachmentBundle(folderName);

      const attachmentById = {};
      (attachmentBundle.metadata || []).forEach(meta => {
        if (!meta || !meta.id) return;
        attachmentById[String(meta.id)] = meta;
      });

      function conNormalizeMediaPathRefsInSession(dataObj) {
        if (!dataObj || typeof dataObj !== 'object') return dataObj;
        function patchPage(pageObj) {
          if (!pageObj || typeof pageObj !== 'object') return;
          const mediaList = Array.isArray(pageObj.media) ? pageObj.media : [];
          mediaList.forEach(m => {
            const linked = m && m.attachmentId ? attachmentById[String(m.attachmentId)] : null;
            if (!linked) return;
            m.name = linked.name || m.name;
            m.mime = linked.mime || m.mime;
            m.relativePath = linked.relativePath || m.relativePath;
          });
          if (pageObj.backgroundPdf && pageObj.backgroundPdf.attachmentId) {
            const linkedPdf = attachmentById[String(pageObj.backgroundPdf.attachmentId)];
            if (linkedPdf) {
              pageObj.backgroundPdf.name = linkedPdf.name || pageObj.backgroundPdf.name;
              pageObj.backgroundPdf.mime = linkedPdf.mime || pageObj.backgroundPdf.mime;
              pageObj.backgroundPdf.relativePath = linkedPdf.relativePath || pageObj.backgroundPdf.relativePath;
            }
          }
        }

        if (Array.isArray(dataObj.pages)) {
          dataObj.pages.forEach(patchPage);
        } else {
          patchPage(dataObj);
        }
        return dataObj;
      }

      const dataToSave = Object.assign({}, persistedData, {
        attachments: attachmentBundle.metadata
      });
      conNormalizeMediaPathRefsInSession(dataToSave);
      const pages = (Array.isArray(dataToSave.pages) && dataToSave.pages.length > 0)
        ? dataToSave.pages
        : [dataToSave];

      // Rebuild visual snapshots: all pages on manual save, fast cache on autosave
      await conRebuildPageVisualSnapshots(pages, options);

      const snapshotFiles = [];
      for (let i = 0; i < pages.length; i += 1) {
        let snapDataUrl = (_conPageSnapshotPngs && _conPageSnapshotPngs[i]) || '';
        if (!snapDataUrl && typeof conBuildPageThumbnailDataUrl === 'function') {
          try {
            snapDataUrl = conBuildPageThumbnailDataUrl(pages[i], 480, 320);
            if (snapDataUrl) {
              if (!_conPageSnapshotPngs) _conPageSnapshotPngs = [];
              _conPageSnapshotPngs[i] = snapDataUrl;
            }
          } catch (_) {}
        }
        if (snapDataUrl) {
          let ext = 'webp';
          let base64Data = '';
          const commaIdx = snapDataUrl.indexOf(',');
          if (commaIdx >= 0) {
            const header = snapDataUrl.slice(0, commaIdx);
            if (header.includes('image/png')) ext = 'png';
            else if (header.includes('image/jpeg') || header.includes('image/jpg')) ext = 'jpg';
            else ext = 'webp';
            base64Data = snapDataUrl.slice(commaIdx + 1);
          } else {
            base64Data = snapDataUrl;
          }
          const padded = String(i + 1).padStart(3, '0');
          snapshotFiles.push({
            filename: 'page-' + padded + '.' + ext,
            subdir: folderName + '/page-snapshots',
            content: base64Data,
            encoding: 'base64'
          });
        }
      }

      const jsContent = boardBuildSessionFileContent(dataToSave, 'CONSTELLATION_SESSION_EXPORT');
      const files = [{
        filename: normalizedFilename,
        subdir: folderName,
        content: jsContent,
        encoding: 'utf8'
      }].concat(attachmentBundle.files, snapshotFiles);

      return {
        filename: normalizedFilename,
        folderName,
        data: dataToSave,
        files,
        attachments: attachmentBundle.metadata
      };
    }

    // ── Canvas / export helpers (restored from git) ───────────────────

    function conCanvasFontFromStyles(styles, fallbackFamily) {
      const fontStyle = styles.fontStyle || 'normal';
      const fontWeight = styles.fontWeight || '400';
      const fontSize = styles.fontSize || '16px';
      const fontFamily = styles.fontFamily || fallbackFamily || '"Segoe UI", Arial, sans-serif';
      return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
    }

    function conGetPrimaryTextNode(el) {
      return [...el.childNodes].find(child => {
        if (child.nodeType === Node.TEXT_NODE) return !!child.textContent.trim();
        return !(child.classList && child.classList.contains('con-node-ann'));
      }) || null;
    }

    function conGetNodeWordText(node, el) {
      const baseWord = node.baseWord || (el && el.dataset ? el.dataset.baseWord : '');
      const fmt = node && node.fmt ? node.fmt : {};
      const casing = fmt.casing || window._bcNodeDefaultCasing || 'none';
      if (baseWord) return boardTransformCasingText(baseWord.trim(), casing);
      let wordText = '';
      if (el && el.childNodes) {
        el.childNodes.forEach(child => { if (child.nodeType === Node.TEXT_NODE) wordText += child.textContent; });
      }
      if (!wordText.trim() && el) { const primary = conGetPrimaryTextNode(el); wordText = primary ? primary.textContent : el.textContent; }
      return boardTransformCasingText(wordText.trim(), casing);
    }

    function conGetRelativeTextCenterY(el, target, fallbackHeight) {
      if (!target) return fallbackHeight / 2;
      if (target.nodeType === Node.ELEMENT_NODE) {
        const nodeRect = el.getBoundingClientRect(); const targetRect = target.getBoundingClientRect();
        return (targetRect.top - nodeRect.top) + (targetRect.height / 2);
      }
      const range = document.createRange(); range.selectNodeContents(target);
      const rect = range.getBoundingClientRect();
      if (!rect.height) return fallbackHeight / 2;
      const nodeRect = el.getBoundingClientRect();
      return (rect.top - nodeRect.top) + (rect.height / 2);
    }

    function conDrawNodeLabelToCanvas(ctx, node, pad, color) {
      const el = node.el; const nx = node.x; const ny = node.y; const nw = el.offsetWidth; const nh = el.offsetHeight;
      const primaryTextNode = conGetPrimaryTextNode(el);
      const wordStyles = primaryTextNode && primaryTextNode.nodeType === Node.ELEMENT_NODE ? getComputedStyle(primaryTextNode) : getComputedStyle(el);
      const fmt = node.fmt || {};
      const fontWeight = fmt.bold ? 'bold' : (wordStyles.fontWeight || '400');
      const fontStyle = fmt.italic ? 'italic' : (wordStyles.fontStyle || 'normal');
      const fontSize = wordStyles.fontSize || '14px';
      const fontFamily = wordStyles.fontFamily || '"Segoe UI", Arial, sans-serif';
      const wordText = conGetNodeWordText(node, el);
      const wordCenterY = pad + ny + conGetRelativeTextCenterY(el, primaryTextNode, nh);

      const rel = String(node.relation || '').toLowerCase();
      const hasRelBadge = rel === 'translation' || rel === 'ipa';
      const relLabel = rel === 'translation' ? 'FR' : (rel === 'ipa' ? 'IPA' : '');
      const relBg = rel === 'translation' ? '#e53935' : '#8e24aa';

      const hasPageBadge = node.pageNum != null;
      const pageText = hasPageBadge ? `(${node.pageNum})` : '';

      ctx.fillStyle = wordStyles.color || color;
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1;

      const hasMaxWidth = !!(fmt && typeof fmt.maxWidth === 'number' && fmt.maxWidth > 0 && node.shape !== 'circle' && node.shape !== 'square');

      if (wordText) {
        let wordLines = (wordText.includes('//') || wordText.includes('\n') || /<br\s*\/?>/i.test(wordText))
          ? wordText.split(/\/\/|\r?\n|<br\s*\/?>/i).map(s => s.trim())
          : null;
        if (!wordLines && hasMaxWidth && typeof canvasWrapText === 'function') {
          const wrapped = canvasWrapText(ctx, wordText, fmt.maxWidth - 18);
          if (wrapped && wrapped.length > 1) {
            wordLines = wrapped;
          }
        }
        const fsPx = parseFloat(fontSize) || 14; const lineH = fsPx * 1.25;
        const renderLines = wordLines || [wordText];
        const lineStartY = wordLines ? wordCenterY - ((renderLines.length - 1) * lineH) / 2 : wordCenterY;

        renderLines.forEach((line, li) => {
          const lineY = lineStartY + li * lineH;
          const isLastLine = li === renderLines.length - 1;

          let badgeExtraW = 0;
          let relW = 0;
          let pageW = 0;

          if (isLastLine && (hasRelBadge || hasPageBadge)) {
            if (hasRelBadge) relW = 20;
            if (hasPageBadge) {
              ctx.save();
              ctx.font = `600 ${Math.max(9, Math.round(fsPx * 0.75))}px "Segoe UI", Arial, sans-serif`;
              pageW = ctx.measureText(pageText).width + 4;
              ctx.restore();
            }
            badgeExtraW = (hasRelBadge ? relW + 4 : 0) + (hasPageBadge ? pageW : 0);
          }

          const mainTextW = ctx.measureText(line).width;
          const totalRowW = mainTextW + badgeExtraW;
          const mainTextX = hasMaxWidth ? (pad + nx + 9) : (pad + nx + (nw - totalRowW) / 2);

          ctx.textAlign = 'left';

          if (node.textStrokeWidth > 0 && node.textStrokeColor) {
            ctx.save(); ctx.strokeStyle = node.textStrokeColor; ctx.lineWidth = node.textStrokeWidth * 2; ctx.lineJoin = 'round';
            ctx.strokeText(line, mainTextX, lineY); ctx.restore();
          }
          ctx.fillText(line, mainTextX, lineY);

          if (fmt.underline || fmt.strike) {
            ctx.save(); ctx.strokeStyle = wordStyles.color || color; ctx.lineWidth = Math.max(1, fsPx / 14); ctx.setLineDash([]);
            if (fmt.underline) { ctx.beginPath(); ctx.moveTo(mainTextX, lineY + fsPx * 0.55); ctx.lineTo(mainTextX + mainTextW, lineY + fsPx * 0.55); ctx.stroke(); }
            if (fmt.strike) { ctx.beginPath(); ctx.moveTo(mainTextX, lineY); ctx.lineTo(mainTextX + mainTextW, lineY); ctx.stroke(); }
            ctx.restore();
          }

          let curBadgeX = mainTextX + mainTextW + 4;
          if (isLastLine && hasRelBadge) {
            ctx.save();
            const bw = 18, bh = 12;
            const by = lineY - bh / 2;
            ctx.fillStyle = relBg;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') ctx.roundRect(curBadgeX, by, bw, bh, 3);
            else ctx.rect(curBadgeX, by, bw, bh);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(relLabel, curBadgeX + bw / 2, lineY);
            ctx.restore();
            curBadgeX += bw + 4;
          }

          if (isLastLine && hasPageBadge) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.font = `600 ${Math.max(9, Math.round(fsPx * 0.75))}px "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(pageText, curBadgeX, lineY);
            ctx.restore();
          }
        });
      }

      const isStarred = node.starred || (node.dbWord && node.dbWord.starred) || (el && el.querySelector('.con-node-star-btn.active'));
      if (isStarred) {
        ctx.save();
        ctx.font = '12px "Segoe UI Emoji", "Segoe UI Symbol", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('⭐', pad + nx + nw - 4, pad + ny + 3);
        ctx.restore();
      }

      const anns = el.querySelectorAll('.con-node-ann');
      anns.forEach(ann => {
        const text = ann.textContent.trim(); if (!text) return;
        const annStyles = getComputedStyle(ann); const annOpacity = parseFloat(annStyles.opacity);
        const annRect = ann.getBoundingClientRect(); const nodeRect = el.getBoundingClientRect();
        ctx.font = conCanvasFontFromStyles(annStyles, '"Segoe UI", Arial, sans-serif');
        ctx.fillStyle = annStyles.color || color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = Number.isFinite(annOpacity) ? annOpacity : 1;
        ctx.fillText(text, pad + nx + nw / 2, pad + ny + (annRect.top - nodeRect.top) + (annRect.height / 2));
      });
      ctx.globalAlpha = 1;
    }

    function conDrawTablesToCanvas(ctx, PAD) {
      const tables = window.conGetTables ? window.conGetTables() : [];
      tables.forEach(tbl => {
        if (!tbl) return;
        const totalW = tbl.colWidths ? tbl.colWidths.reduce((s, w) => s + w, 0) : 200;
        const totalH = tbl.rowHeights ? tbl.rowHeights.reduce((s, h) => s + h, 0) : 100;
        const barH = 24;
        const tx = PAD + (tbl.x || 0);
        const ty = PAD + (tbl.y || 0);

        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(tx, ty, totalW, barH);
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, totalW, barH);

        ctx.fillStyle = '#666666';
        ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⠿ Table', tx + 8, ty + barH / 2);

        const gridY = ty + barH;
        ctx.fillStyle = tbl.defaultBg || '#ffffff';
        ctx.fillRect(tx, gridY, totalW, totalH);
        ctx.strokeStyle = '#bbbbbb';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, gridY, totalW, totalH);

        let curY = gridY;
        for (let r = 0; r < tbl.rows; r++) {
          const rh = tbl.rowHeights[r] || 36;
          let curX = tx;
          for (let c = 0; c < tbl.cols; c++) {
            const cw = tbl.colWidths[c] || 80;
            const cell = tbl.cells ? tbl.cells[r * tbl.cols + c] : null;

            const cellBg = (cell && cell.bg) || (r === 0 && tbl.hasHeader ? '#f7f7f7' : (tbl.defaultBg || '#ffffff'));
            ctx.fillStyle = cellBg;
            ctx.fillRect(curX, curY, cw, rh);

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.strokeRect(curX, curY, cw, rh);

            if (cell) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(curX + 2, curY + 2, Math.max(1, cw - 4), Math.max(1, rh - 4));
              ctx.clip();

              if (cell.type === 'node' && cell.nodeData) {
                const nd = cell.nodeData;
                const nodeBg = nd.bg || '#ffffff';
                const nodeColor = nd.color || '#111111';
                const nodeBorder = nd.border || '#111111';
                const nodeText = nd.baseWord || '';

                ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
                const tw = Math.min(cw - 8, ctx.measureText(nodeText).width + 12);
                const th = 22;
                const nx = curX + (cw - tw) / 2;
                const ny = curY + (rh - th) / 2;

                ctx.fillStyle = nodeBg;
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') ctx.roundRect(nx, ny, tw, th, 4);
                else ctx.rect(nx, ny, tw, th);
                ctx.fill();
                ctx.strokeStyle = nodeBorder;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = nodeColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(nodeText, nx + tw / 2, ny + th / 2);
              } else if (cell.text && cell.text.trim()) {
                const fontStyle = cell.italic ? 'italic ' : '';
                const fontWeight = (cell.bold || (tbl.hasHeader && r === 0)) ? 'bold ' : '';
                const fontSize = cell.fontSize || tbl.defaultFontSize || 14;
                ctx.font = `${fontStyle}${fontWeight}${fontSize}px "Segoe UI", Arial, sans-serif`;
                ctx.fillStyle = cell.color || tbl.defaultColor || (r === 0 && tbl.hasHeader ? '#111111' : '#333333');

                const align = cell.textAlign || 'left';
                let textX = curX + 6;
                if (align === 'center') textX = curX + cw / 2;
                else if (align === 'right') textX = curX + cw - 6;

                ctx.textAlign = align;
                ctx.textBaseline = 'middle';
                ctx.fillText(cell.text.trim(), textX, curY + rh / 2);
              }
              ctx.restore();
            }

            curX += cw;
          }
          curY += rh;
        }
      });
    }

    function canvasWrapText(ctx, text, maxWidth) {
      const result = [];
      for (const paragraph of text.split('\n')) {
        const words = paragraph.split(' '); let line = '';
        for (const word of words) {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > maxWidth && line) { result.push(line); line = word; } else { line = test; }
        }
        result.push(line);
      }
      return result;
    }

    function _conCanvasRichNote(ctx, note, x, y, w, h) {
      if (note.classList.contains('wn-note-hidden')) return;
      const editor = note.querySelector('.wn-note-editor, textarea');
      if (!editor) return;
      const noteCS = getComputedStyle(note);
      const baseFontPx = parseFloat(note.style.fontSize) || parseFloat(noteCS.fontSize) || 14;
      const baseColor = note.style.color || noteCS.color || '#111111';
      const baseFontFamily = note.style.fontFamily || noteCS.fontFamily || window._bcNoteFontFamily || '"Segoe UI", Arial, sans-serif';
      const rawLH = parseFloat(note.style.lineHeight || noteCS.lineHeight);
      const lineh = (Number.isFinite(rawLH) && rawLH >= baseFontPx * 0.8) ? rawLH : baseFontPx * 1.4;
      const padLeft = 8, padRight = 12, padTop = 6, padBottom = 10;
      const contentW = Math.max(30, w - padLeft - padRight);
      if (editor.tagName === 'TEXTAREA') {
        const txt = (editor.value || '').trim(); if (!txt) return;
        ctx.fillStyle = baseColor; ctx.font = `normal 400 ${baseFontPx}px ${baseFontFamily}`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        canvasWrapText(ctx, txt, contentW).forEach((line, i) => { ctx.fillText(line, x + padLeft, y + padTop + i * lineh); });
        return;
      }
      const segs = [];
      const noteIsBold = note.style.fontWeight === '700' || note.style.fontWeight === 'bold';
      const noteIsItalic = note.style.fontStyle === 'italic';
      const noteTD = note.style.textDecoration || '';
      function _walkNote(node, st) {
        if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) segs.push({ ...st, text: node.textContent }); return; }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'br') { segs.push({ br: true }); return; }
        if (node.classList && node.classList.contains('con-emoji-dot')) return;
        const cs = getComputedStyle(node); const ns = { ...st };
        const fw = parseInt(cs.fontWeight) || 0;
        if (fw >= 600 || cs.fontWeight === 'bold') ns.bold = true;
        if (cs.fontStyle === 'italic' || cs.fontStyle === 'oblique') ns.italic = true;
        const td = node.style.textDecoration || cs.textDecoration || '';
        if (td.includes('underline')) ns.underline = true;
        if (td.includes('line-through')) ns.strike = true;
        const ibg = node.style.backgroundColor;
        if (ibg && ibg !== 'transparent' && ibg !== '' && !/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(ibg)) ns.bgColor = ibg;
        const ic = node.style.color; if (ic && ic !== '' && ic !== 'inherit') ns.color = ic;
        const fsPx = parseFloat(cs.fontSize); if (Number.isFinite(fsPx) && fsPx > 0) ns.fontSize = fsPx;
        const ff = cs.fontFamily; if (ff && ff !== 'inherit') ns.fontFamily = ff;
        if (tag === 'ul' || tag === 'ol') ns.indentDepth = (st.indentDepth || 0) + 1;
        if (tag === 'li') {
          if (segs.length > 0 && !segs[segs.length - 1].br) segs.push({ br: true });
          const listEl = node.closest('ol, ul'); const isOrdered = listEl && listEl.tagName.toLowerCase() === 'ol';
          const depth = Math.max(0, (ns.indentDepth || 1) - 1);
          let marker; if (isOrdered) { let idx = 1; let prev = node.previousElementSibling; while (prev) { if (prev.tagName.toLowerCase() === 'li') idx++; prev = prev.previousElementSibling; } marker = idx + '. '; } else { marker = (depth % 2 === 1) ? '◦ ' : '• '; }
          const indentPx = depth * 14;
          const liState = { ...ns, indentPx };
          segs.push({ ...liState, text: marker }); node.childNodes.forEach(c => _walkNote(c, liState)); return;
        }
        if ((tag === 'div' || tag === 'p') && node !== editor && segs.length > 0 && !segs[segs.length - 1].br) segs.push({ br: true });
        if ((tag === 'ul' || tag === 'ol') && segs.length > 0 && !segs[segs.length - 1].br) segs.push({ br: true });
        node.childNodes.forEach(c => _walkNote(c, ns));
      }
      _walkNote(editor, { bold: noteIsBold, italic: noteIsItalic, underline: noteTD.includes('underline'), strike: noteTD.includes('line-through'), color: baseColor, bgColor: null, fontSize: baseFontPx, fontFamily: baseFontFamily, indentDepth: 0 });
      while (segs.length && segs[segs.length - 1].br) segs.pop();
      function _segFont(s) { return `${s.italic ? 'italic' : 'normal'} ${s.bold ? 'bold' : 'normal'} ${s.fontSize || baseFontPx}px ${s.fontFamily || baseFontFamily}`; }
      const paras = [[]];
      segs.forEach(s => { if (s.br) { paras.push([]); return; } (s.text.match(/\S+|\s+/g) || []).forEach(tok => paras[paras.length - 1].push({ word: tok, seg: s })); });
      const lines = [];
      paras.forEach(para => {
        if (!para.length) { lines.push([]); return; }
        let curLine = [], curW = 0;
        const indentPx = (para[0] && para[0].seg && para[0].seg.indentPx) ? para[0].seg.indentPx : 0;
        const availW = Math.max(30, contentW - indentPx);
        para.forEach(item => {
          ctx.font = _segFont(item.seg); const tw = ctx.measureText(item.word).width; const isWs = /^\s+$/.test(item.word);
          if (!isWs && curW + tw > availW && curLine.length > 0) { lines.push(curLine); curLine = [item]; curW = tw; } else { curLine.push(item); curW += tw; }
        });
        if (curLine.length) lines.push(curLine);
      });
      const noteTextAlign = editor.style.textAlign || 'left';
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      let cy = y + padTop; const maxY = y + h - padBottom;
      lines.forEach(line => {
        if (cy > maxY) return;
        let trimLine = [...line]; while (trimLine.length && /^\s+$/.test(trimLine[trimLine.length - 1].word)) trimLine.pop();
        const lineIndent = (line.length && line[0].seg && line[0].seg.indentPx) ? line[0].seg.indentPx : 0;
        let cx = x + padLeft + lineIndent;
        if (noteTextAlign === 'center' || noteTextAlign === 'right') {
          let lineW = 0;
          trimLine.forEach(item => { ctx.font = _segFont(item.seg); lineW += ctx.measureText(item.word).width; });
          if (noteTextAlign === 'center') cx = x + padLeft + lineIndent + Math.max(0, (contentW - lineIndent - lineW) / 2);
          else cx = x + w - padRight - lineW;
        }
        trimLine.forEach(item => {
          ctx.font = _segFont(item.seg); const tw = ctx.measureText(item.word).width; const fsPx = item.seg.fontSize || baseFontPx;
          const textTop = cy + Math.max(0, (lineh - fsPx) / 2);
          if (item.seg.bgColor) { ctx.fillStyle = item.seg.bgColor; ctx.fillRect(cx, cy, tw, lineh); }
          ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = item.seg.color || baseColor; ctx.fillText(item.word, cx, textTop);
          if (item.seg.underline) { ctx.save(); ctx.strokeStyle = item.seg.color || baseColor; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cx, textTop + fsPx + 1); ctx.lineTo(cx + tw, textTop + fsPx + 1); ctx.stroke(); ctx.restore(); }
          if (item.seg.strike) { ctx.save(); ctx.strokeStyle = item.seg.color || baseColor; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cx, textTop + fsPx * 0.55); ctx.lineTo(cx + tw, textTop + fsPx * 0.55); ctx.stroke(); ctx.restore(); }
          cx += tw;
        });
        cy += lineh;
      });
      ctx.restore();
    }

    function conNormalizeNodeShapeSafe(shape) {
      const normalized = String(shape || '').trim().toLowerCase();
      if (normalized === 'losange' || normalized === 'triangle') return 'rectangle';
      return ['oval', 'circle', 'square', 'rectangle'].includes(normalized) ? normalized : 'rectangle';
    }

    function conCanvasTraceNodePath(ctx, x, y, w, h, shape) {
      const normalized = (window.conNormalizeNodeShape ? window.conNormalizeNodeShape(shape) : conNormalizeNodeShapeSafe(shape));
      ctx.beginPath();
      if (normalized === 'circle' || normalized === 'oval') {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else {
        const r = 4;
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
    }

    function conCanvasTraceRoundedRect(ctx, x, y, w, h, r) {
      const rr = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
    }

    function conDrawMediaWidgetsToCanvas(ctx, PAD, allowedKinds) {
      const board = document.getElementById('constellation-board');
      if (!board) return;
      const widgets = Array.from(board.querySelectorAll('.con-media-item'));
      const allMedia = (window.conGetMediaItems ? window.conGetMediaItems() : (typeof conMediaItems !== 'undefined' ? conMediaItems : [])) || [];
      widgets.forEach(wrap => {
        const wrapId = wrap.dataset.id;
        const m = allMedia.find(it => String(it.id) === String(wrapId)) || {};
        const kind = wrap.classList.contains('con-media-kind-pdf') ? 'pdf' : wrap.classList.contains('con-media-kind-pics') ? 'pics' : (wrap.classList.contains('con-media-kind-videos') || wrap.classList.contains('con-media-kind-video')) ? 'videos' : (wrap.classList.contains('con-media-kind-sounds') || wrap.classList.contains('con-media-kind-sound') || wrap.classList.contains('con-media-kind-audio')) ? 'sounds' : '';
        if (allowedKinds && Array.isArray(allowedKinds) && !allowedKinds.includes(kind)) return;
        const x = PAD + wrap.offsetLeft; const y = PAD + wrap.offsetTop;
        const w = Math.max(1, wrap.offsetWidth); const h = Math.max(1, wrap.offsetHeight);
        if (w < 2 || h < 2) return;
        const wrapStyles = getComputedStyle(wrap);
        const wrapOpacity = parseFloat(wrapStyles.opacity);
        const widgetOp = Number.isFinite(wrapOpacity) ? wrapOpacity : 1;
        ctx.save();
        ctx.globalAlpha = widgetOp;
        const radius = parseFloat(wrapStyles.borderTopLeftRadius) || 7;
        const borderW = parseFloat(wrapStyles.borderWidth) || 1.5;
        const borderColor = wrapStyles.borderColor || '#444';
        const bgColor = wrapStyles.backgroundColor || '#ffffff';
        ctx.save(); conCanvasTraceRoundedRect(ctx, x, y, w, h, radius); ctx.fillStyle = bgColor; ctx.fill(); ctx.strokeStyle = borderColor; ctx.lineWidth = borderW; ctx.stroke(); ctx.restore();
        const header = wrap.querySelector('.con-media-header');
        const headerH = header ? Math.max(0, header.offsetHeight) : 0;
        if (headerH > 0) {
          const hs = header ? getComputedStyle(header) : null;
          const headerBg = hs ? (hs.backgroundColor || '#f2f2f2') : '#f2f2f2';
          const headerFg = hs ? (hs.color || '#222') : '#222';
          const headerFontSize = hs ? (parseFloat(hs.fontSize) || 11) : 11;
          const headerWeight = hs ? (hs.fontWeight || '700') : '700';
          ctx.save(); conCanvasTraceRoundedRect(ctx, x, y, w, Math.min(headerH, h), radius); ctx.clip(); ctx.fillStyle = headerBg; ctx.fillRect(x, y, w, Math.min(headerH, h)); ctx.restore();
          if (header) {
            const rawTitle = String(header.textContent || '').replace(/\s*✕\s*/g, ' ').trim();
            if (rawTitle) {
              ctx.save(); ctx.rect(x + 6, y, Math.max(1, w - 30), Math.min(headerH, h)); ctx.clip();
              ctx.fillStyle = headerFg; ctx.font = `${headerWeight} ${Math.max(9, headerFontSize)}px "Segoe UI", Arial, sans-serif`;
              ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(rawTitle, x + 6, y + Math.min(headerH, h) / 2); ctx.restore();
            }
          }
        }
        const content = wrap.querySelector('.con-media-content'); if (!content) { ctx.restore(); return; }
        const contentX = x + content.offsetLeft; const contentY = y + content.offsetTop;
        const contentW = Math.max(1, content.offsetWidth); const contentH = Math.max(1, content.offsetHeight);
        const contentStyles = getComputedStyle(content);
        ctx.save(); ctx.fillStyle = contentStyles.backgroundColor || '#fafafa'; ctx.fillRect(contentX, contentY, contentW, contentH);
        ctx.beginPath(); ctx.rect(contentX, contentY, contentW, contentH); ctx.clip();
        const drawSource = src => {
          try {
            if (!src) return false;
            if (src.tagName === 'IMG' && (!src.complete || !src.naturalWidth || !src.naturalHeight)) return false;
            if (src.tagName === 'VIDEO' && (!src.videoWidth || !src.videoHeight)) return false;
            if (src.tagName === 'CANVAS' && (!src.width || !src.height)) return false;
            const sw = src.tagName === 'IMG' ? src.naturalWidth : (src.tagName === 'VIDEO' ? src.videoWidth : src.width);
            const sh = src.tagName === 'IMG' ? src.naturalHeight : (src.tagName === 'VIDEO' ? src.videoHeight : src.height);
            if (!sw || !sh) return false;
            const srcRect = src.getBoundingClientRect(); const contentRect = content.getBoundingClientRect();
            const relX = srcRect.left - contentRect.left; const relY = srcRect.top - contentRect.top;
            const dw = srcRect.width; const dh = srcRect.height; if (!dw || !dh) return false;
            var _tb = (m.brightness != null && Number.isFinite(Number(m.brightness))) ? Number(m.brightness) : 100;
            var _tc = (m.contrast != null && Number.isFinite(Number(m.contrast))) ? Number(m.contrast) : 100;
            var _ts = (m.saturation != null && Number.isFinite(Number(m.saturation))) ? Number(m.saturation) : 100;
            var _hasF = (_tb !== 100 || _tc !== 100 || _ts !== 100);
            if (_hasF && src.tagName === 'IMG') ctx.filter = 'brightness(' + _tb + '%) contrast(' + _tc + '%) saturate(' + _ts + '%)';
            ctx.drawImage(src, contentX + relX, contentY + relY, dw, dh);
            if (_hasF && src.tagName === 'IMG') ctx.filter = 'none';
            return true;
          } catch { return false; }
        };
        let drawn = false;
        if (kind === 'pdf') {
          const pdfCanvases = wrap.querySelectorAll('canvas');
          if (pdfCanvases && pdfCanvases.length > 0) {
            pdfCanvases.forEach(c => {
              if (drawSource(c)) drawn = true;
            });
          }
          if (!drawn) {
            drawn = drawSource(wrap.querySelector('.con-media-asset')) || drawSource(wrap.querySelector('img'));
          }
        } else {
          drawn = drawSource(wrap.querySelector('.con-media-asset')) || drawSource(wrap.querySelector('canvas')) || drawSource(wrap.querySelector('img'));
          if (!drawn && kind === 'pics') {
            const cacheKey = String(m.attachmentId || m.id || wrapId || '');
            if (window._conThumbImgCache && window._conThumbImgCache.has(cacheKey)) {
              const cImg = window._conThumbImgCache.get(cacheKey);
              if (cImg && cImg.complete && cImg.naturalWidth > 0) {
                drawn = drawSource(cImg);
              }
            }
          }
        }

        if (!drawn) {
          if (kind === 'pdf') {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(contentX, contentY, contentW, contentH);
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.strokeRect(contentX, contentY, contentW, contentH);

            // Draw red PDF badge
            ctx.fillStyle = '#e53935';
            ctx.fillRect(contentX + 6, contentY + 6, 32, 16);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PDF', contentX + 22, contentY + 14);

            // Draw PDF document title
            ctx.fillStyle = '#424242';
            ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const pdfTitle = (header && header.textContent.trim()) ? header.textContent.trim().replace(/\s*✕\s*/g, '') : 'PDF Document';
            ctx.fillText(pdfTitle.length > 25 ? pdfTitle.substring(0, 22) + '...' : pdfTitle, contentX + contentW / 2, contentY + contentH / 2 + 6);
            drawn = true;
          } else if (kind === 'sounds') {
            ctx.fillStyle = '#4b5563';
            ctx.font = '700 16px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AUDIO', contentX + contentW / 2, contentY + contentH / 2);
          } else if (kind === 'pics' || kind === 'videos') {
            ctx.fillStyle = '#e8f0fe';
            ctx.fillRect(contentX, contentY, contentW, contentH);
            ctx.fillStyle = '#1a73e8';
            ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(kind === 'pics' ? 'IMAGE' : 'VIDEO', contentX + contentW / 2, contentY + contentH / 2);
          }
        }
        ctx.restore();
        ctx.restore();
      });
    }

    function _conDrawCanvasTerminator(ctx, term, x, y, angle, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = color || '#333333';
      ctx.strokeStyle = color || '#333333';
      ctx.lineWidth = 1.8;
      if (term === 'circle' || term === 'dot') {
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (term === 'diamond' || term === 'square') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, -4);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (term === 'open') {
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-7, 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-9, -4.5);
        ctx.lineTo(-9, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    async function _conBuildBoardCanvas(opts = {}) {
      const board = document.getElementById('constellation-board');
      if (!board) return null;

      document.documentElement.classList.add('con-exporting');
      try {
        // Pre-wait for any board images and web fonts to finish loading
      if (document.fonts && typeof document.fonts.ready !== 'undefined') {
        try { await document.fonts.ready; } catch (_) { }
      }
      const allImgs = Array.from(board.querySelectorAll('img'));
      await Promise.all(allImgs.map(img => {
        if (img.complete || !img.src) return Promise.resolve();
        return new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 600); });
      }));
      if (typeof conAwaitAllPdfRendersOnBoard === 'function') {
        try { await conAwaitAllPdfRendersOnBoard(); } catch (_) { }
      }
      if (typeof conAwaitAllMediaRendersOnBoard === 'function') {
        try { await conAwaitAllMediaRendersOnBoard(); } catch (_) { }
      }

      const nodes = window.conGetNodes ? window.conGetNodes() : [];

      let maxX = 0;
      let maxY = 0;

      nodes.forEach(n => {
        if (n && n.el) {
          const bb = (typeof conGetNodeBoundingBox === 'function')
            ? conGetNodeBoundingBox(n)
            : { x: n.x || 0, y: n.y || 0, w: n.el.offsetWidth || 100, h: n.el.offsetHeight || 40 };
          const rx = bb.x + bb.w;
          const ry = bb.y + bb.h;
          if (rx > maxX) maxX = rx;
          if (ry > maxY) maxY = ry;
        }
      });

      document.querySelectorAll('#constellation-board .con-word-note').forEach(note => {
        const rx = note.offsetLeft + note.offsetWidth;
        const ry = note.offsetTop + note.offsetHeight;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      document.querySelectorAll('.con-group').forEach(grp => {
        const rx = grp.offsetLeft + grp.offsetWidth;
        const ry = grp.offsetTop + grp.offsetHeight;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      document.querySelectorAll('#constellation-board .con-media-item, #constellation-board .con-media-wrap, #constellation-board img').forEach(wrap => {
        const rx = wrap.offsetLeft + wrap.offsetWidth;
        const ry = wrap.offsetTop + wrap.offsetHeight;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetMediaItems ? window.conGetMediaItems() : []).forEach(m => {
        if (!m) return;
        const rx = (m.x || 0) + (m.w || m.width || m.offsetWidth || 200);
        const ry = (m.y || 0) + (m.h || m.height || m.offsetHeight || 200);
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetTables ? window.conGetTables() : []).forEach(tbl => {
        if (!tbl) return;
        const tw = tbl.colWidths ? tbl.colWidths.reduce((s, w) => s + w, 0) : 200;
        const th = (tbl.rowHeights ? tbl.rowHeights.reduce((s, h) => s + h, 0) : 100) + 24;
        const rx = (tbl.x || 0) + tw;
        const ry = (tbl.y || 0) + th;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetShapes ? window.conGetShapes() : []).forEach(s => {
        const rx = (s.x || 0) + (s.w || s.width || 100);
        const ry = (s.y || 0) + (s.h || s.height || 100);
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      });

      (window.conGetDrawings ? window.conGetDrawings() : []).forEach(d => {
        if (Array.isArray(d.points)) {
          d.points.forEach(p => {
            const px = (d.x || 0) + p.x;
            const py = (d.y || 0) + p.y;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          });
        }
      });

      (window.conGetMasks ? window.conGetMasks() : []).forEach(mask => {
        if (mask && mask.el) {
          const rx = mask.el.offsetLeft + mask.el.offsetWidth;
          const ry = mask.el.offsetTop + mask.el.offsetHeight;
          if (rx > maxX) maxX = rx;
          if (ry > maxY) maxY = ry;
        }
      });

      if (typeof conPageBackgroundPdf !== 'undefined' && conPageBackgroundPdf) {
        const pw = conPageBackgroundPdf.width || 800;
        const ph = conPageBackgroundPdf.height || 1000;
        if (pw > maxX) maxX = pw;
        if (ph > maxY) maxY = ph;
      }

      let bw, bh, PAD;
      const hasLayoutDims = window._bcBoardLayoutConfig && window._bcBoardLayoutConfig.dims;
      if (hasLayoutDims) {
        const targetW = window._bcBoardLayoutConfig.dims.w;
        const targetH = window._bcBoardLayoutConfig.dims.h;
        if (maxX <= targetW && maxY <= targetH) {
          bw = targetW;
          bh = targetH;
          PAD = 0;
        } else {
          const scaleFactor = Math.max(maxX / targetW, maxY / targetH);
          bw = Math.round(targetW * scaleFactor);
          bh = Math.round(targetH * scaleFactor);
          PAD = 0;
        }
      } else {
        bw = (maxX > 0) ? Math.max(600, maxX + 40) : Math.max(600, board.clientWidth || 800);
        bh = (maxY > 0) ? Math.max(400, maxY + 40) : Math.max(400, board.clientHeight || 600);
        PAD = 24;
      }

      const defaultScale = Math.max(window.devicePixelRatio || 1, 2);
      let scale = (opts && typeof opts.scale === 'number' && opts.scale > 0) ? opts.scale : defaultScale;
      let targetW = Math.round((bw + PAD * 2) * scale);
      let targetH = Math.round((bh + PAD * 2) * scale);
      const MAX_PIXELS = 12 * 1024 * 1024;
      if (targetW * targetH > MAX_PIXELS) {
        const factor = Math.sqrt(MAX_PIXELS / (targetW * targetH));
        scale *= factor;
        targetW = Math.round((bw + PAD * 2) * scale);
        targetH = Math.round((bh + PAD * 2) * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d'); ctx.scale(scale, scale);

      const computedBg = board ? getComputedStyle(board).backgroundColor : '';
      const activeBg = _conBoardBgColor || (computedBg && computedBg !== 'transparent' && !/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(computedBg) ? computedBg : '#ffffff');
      ctx.fillStyle = activeBg;
      ctx.fillRect(0, 0, bw + PAD * 2, bh + PAD * 2);

      if (_conBoardBg && _conBoardBg._cachedDataUrl) {
        await new Promise(resolve => { const img = new Image(); img.onload = () => { ctx.drawImage(img, PAD, PAD, _conBoardBg._cachedW, _conBoardBg._cachedH); resolve(); }; img.onerror = resolve; img.src = _conBoardBg._cachedDataUrl; });
      }
      if (PAD > 0) {
        ctx.strokeStyle = '#111111'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, bw + PAD * 2 - 2, bh + PAD * 2 - 2);
      }

      // Render background media widgets (Images, PDFs) first so they act as background elements underneath groups
      conDrawMediaWidgetsToCanvas(ctx, PAD, ['pics', 'pdf']);

      // 1. Render groups first so they serve as background containers underneath video/audio, lines, nodes, and notes
      document.querySelectorAll('.con-group').forEach(grp => {
        const rx = grp.offsetLeft; const ry = grp.offsetTop; const rw = grp.offsetWidth; const rh = grp.offsetHeight;
        const grpCS = getComputedStyle(grp);
        const grpBS = grp.style.borderStyle || grpCS.borderStyle || 'solid';
        const grpBW = parseFloat(grp.style.borderWidth || grpCS.borderWidth) || 2;
        ctx.fillStyle = grp.style.background || grpCS.backgroundColor || '#f3f4f6'; const r = 8;
        ctx.beginPath(); ctx.moveTo(PAD + rx + r, PAD + ry); ctx.lineTo(PAD + rx + rw - r, PAD + ry); ctx.quadraticCurveTo(PAD + rx + rw, PAD + ry, PAD + rx + rw, PAD + ry + r); ctx.lineTo(PAD + rx + rw, PAD + ry + rh - r); ctx.quadraticCurveTo(PAD + rx + rw, PAD + ry + rh, PAD + rx + rw - r, PAD + ry + rh); ctx.lineTo(PAD + rx + r, PAD + ry + rh); ctx.quadraticCurveTo(PAD + rx, PAD + ry + rh, PAD + rx, PAD + ry + rh - r); ctx.lineTo(PAD + rx, PAD + ry + r); ctx.quadraticCurveTo(PAD + rx, PAD + ry, PAD + rx + r, PAD + ry); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = grp.style.borderColor || grpCS.borderColor || '#aaa'; ctx.lineWidth = grpBW;
        if (grpBS === 'dashed') ctx.setLineDash([grpBW * 4, grpBW * 2]); else if (grpBS === 'dotted') ctx.setLineDash([grpBW, grpBW * 2]); else ctx.setLineDash([]);
        ctx.stroke(); ctx.setLineDash([]);
        const titleEl = grp.querySelector('.con-group-title');
        if (titleEl && titleEl.textContent.trim() && titleEl.style.display !== 'none') {
          const tx = rx + titleEl.offsetLeft; const ty = ry + titleEl.offsetTop; const tw = titleEl.offsetWidth; const th = titleEl.offsetHeight;
          const borderColor = titleEl.style.borderColor || grp.style.borderColor || '#aaa';
          const textColor = titleEl.style.color || grp.style.borderColor || '#333';
          const bgColor = grp.style.background || grpCS.backgroundColor || '#f3f4f6'; const tr = 4;
          ctx.fillStyle = bgColor;
          ctx.beginPath(); ctx.moveTo(PAD + tx + tr, PAD + ty); ctx.lineTo(PAD + tx + tw - tr, PAD + ty); ctx.quadraticCurveTo(PAD + tx + tw, PAD + ty, PAD + tx + tw, PAD + ty + tr); ctx.lineTo(PAD + tx + tw, PAD + ty + th - tr); ctx.quadraticCurveTo(PAD + tx + tw, PAD + ty + th, PAD + tx + tw - tr, PAD + ty + th); ctx.lineTo(PAD + tx + tr, PAD + ty + th); ctx.quadraticCurveTo(PAD + tx, PAD + ty + th, PAD + tx, PAD + ty + th - tr); ctx.lineTo(PAD + tx, PAD + ty + tr); ctx.quadraticCurveTo(PAD + tx, PAD + ty, PAD + tx + tr, PAD + ty); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = borderColor; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = textColor;
          const _titleFontPx = parseFloat(titleEl.style.fontSize) || parseFloat(getComputedStyle(titleEl).fontSize) || 11;
          ctx.font = `bold ${_titleFontPx}px "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.save(); ctx.rect(PAD + tx + 2, PAD + ty, tw - 4, th); ctx.clip(); ctx.fillText(titleEl.textContent.trim(), PAD + tx + 7, PAD + ty + th / 2); ctx.restore();
        }
      });

      // Render foreground media widgets (Videos, Sounds) above groups (matching DOM z-index)
      conDrawMediaWidgetsToCanvas(ctx, PAD, ['sounds', 'videos']);

      // 2. Render constellation SVG lines & edges (connecting nodes, notes, and groups)
      const svgEl = document.getElementById('constellation-svg');
      if (svgEl) {
        svgEl.querySelectorAll('.con-line-group').forEach(grp => {
          const line = grp.querySelector('.con-line'); if (!line) return;
          const pathD = line.getAttribute('d');
          const edgeId = grp.dataset.eid;
          const edge = (typeof conEdges !== 'undefined' && Array.isArray(conEdges)) ? conEdges.find(ed => ed && ed.id == edgeId) : null;
          let strokeColor = line.style.stroke || '#111111';
          if (strokeColor.startsWith('url(') && edge) {
            const strokeInfo = (typeof conResolveEdgeStroke === 'function') ? conResolveEdgeStroke(edge) : null;
            strokeColor = (strokeInfo && strokeInfo.solid) ? strokeInfo.solid : '#111111';
          }
          const sw = parseFloat(line.style.strokeWidth) || parseFloat(line.getAttribute('stroke-width')) || 2;
          const dashStyle = edge ? edge.dashStyle : null;
          const strokeType = edge ? edge.strokeType : null;

          if (pathD) {
            ctx.save();
            ctx.translate(PAD, PAD);
            const pathObj = new Path2D(pathD);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = sw;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (strokeType === 'dashed' || dashStyle === 'dashed') {
              ctx.setLineDash([sw * 3, sw * 2]);
            } else if (strokeType === 'dotted' || dashStyle === 'dotted') {
              ctx.setLineDash([sw, sw * 1.5]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.stroke(pathObj);
            ctx.restore();
          }

          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          let hasEndpoints = false;
          if (edge && edge.a && edge.b && typeof conResolveLinkAnchor === 'function') {
            const na = conResolveLinkAnchor(edge.a);
            const nb = conResolveLinkAnchor(edge.b);
            if (na && nb) {
              let ax = na.cx, ay = na.cy, bx = nb.cx, by = nb.cy;
              if (edge.anchorA && typeof conGetAnchorPoint === 'function') {
                const ptA = conGetAnchorPoint(na, edge.anchorA);
                if (ptA) { ax = ptA.x; ay = ptA.y; }
              }
              if (edge.anchorB && typeof conGetAnchorPoint === 'function') {
                const ptB = conGetAnchorPoint(nb, edge.anchorB);
                if (ptB) { bx = ptB.x; by = ptB.y; }
              }
              x1 = ax; y1 = ay; x2 = bx; y2 = by;
              const dx = bx - ax, dy = by - ay;
              const dist = Math.hypot(dx, dy);
              if (dist > 8) {
                const nx = dx / dist, ny = dy / dist;
                const rawRA = !edge.anchorA && typeof conNodeEdgeOffset === 'function' ? conNodeEdgeOffset(na, dx, dy) : 0;
                const rawRB = !edge.anchorB && typeof conNodeEdgeOffset === 'function' ? conNodeEdgeOffset(nb, -dx, -dy) : 0;
                let rA = rawRA, rB = rawRB;
                if (rawRA + rawRB + 8 > dist) {
                  const scale = Math.max(0, (dist - 8) / ((rawRA + rawRB) || 1));
                  rA = rawRA * scale;
                  rB = rawRB * scale;
                }
                if (!edge.anchorA) { x1 = ax + nx * rA; y1 = ay + ny * rA; }
                if (!edge.anchorB) { x2 = bx - nx * rB; y2 = by - ny * rB; }
              }
              hasEndpoints = true;

              const t = edge.type || 'none';
              const term = edge.terminator || 'arrow';
              const routing = edge.routing || 'straight';
              const curv = (typeof edge.curvature === 'number' && Number.isFinite(edge.curvature)) ? edge.curvature : 30;
              let endAngle = Math.atan2(y2 - y1, x2 - x1);
              let startAngle = endAngle + Math.PI;
              if (routing === 'curved') {
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                const cx = mx + (-dy / (dist || 1)) * curv;
                const cy = my + (dx / (dist || 1)) * curv;
                endAngle = Math.atan2(y2 - cy, x2 - cx);
                startAngle = Math.atan2(y1 - cy, x1 - cx);
              } else if (routing === 'orthogonal') {
                if (Math.abs(dx) >= Math.abs(dy)) {
                  endAngle = (x2 >= x1) ? 0 : Math.PI;
                  startAngle = (x2 >= x1) ? 0 : Math.PI;
                } else {
                  endAngle = (y2 >= y1) ? Math.PI / 2 : -Math.PI / 2;
                  startAngle = (y2 >= y1) ? Math.PI / 2 : -Math.PI / 2;
                }
              }
              if (t === 'forward' || t === 'both') {
                _conDrawCanvasTerminator(ctx, term, PAD + x2, PAD + y2, endAngle, strokeColor);
              }
              if (t === 'backward' || t === 'both') {
                _conDrawCanvasTerminator(ctx, term, PAD + x1, PAD + y1, startAngle, strokeColor);
              }
            }
          }

          const labelEl = grp.querySelector('.con-line-label');
          const labelBgEl = grp.querySelector('.con-line-label-bg');
          if (labelEl && labelEl.textContent.trim()) {
            const labelText = labelEl.textContent.trim();
            const lx = parseFloat(labelEl.getAttribute('x')) || (hasEndpoints ? (x1 + x2) / 2 : 0);
            const ly = parseFloat(labelEl.getAttribute('y')) || (hasEndpoints ? (y1 + y2) / 2 : 0);
            const dyAttr = parseFloat(labelEl.getAttribute('dy') || '-5');
            const rotTransform = labelEl.getAttribute('transform');
            let rotDeg = 0;
            if (rotTransform) {
              const rm = rotTransform.match(/rotate\(([-0-9.]+)/);
              if (rm) rotDeg = parseFloat(rm[1]) || 0;
            }
            const labelStyles = getComputedStyle(labelEl);
            const fontSize = parseFloat(labelStyles.fontSize) || (edge && edge.labelSize) || 14;

            ctx.save();
            ctx.translate(PAD + lx, PAD + ly);
            if (rotDeg) ctx.rotate(rotDeg * Math.PI / 180);

            if (labelBgEl && labelBgEl.style.display !== 'none') {
              const bw = parseFloat(labelBgEl.getAttribute('width')) || Math.max(20, labelText.length * fontSize * 0.6 + 12);
              const bh = parseFloat(labelBgEl.getAttribute('height')) || Math.max(14, fontSize * 1.25);
              const bx = parseFloat(labelBgEl.getAttribute('x')) - lx || (-bw / 2);
              const by = parseFloat(labelBgEl.getAttribute('y')) - ly || (dyAttr - bh * 0.75);
              ctx.fillStyle = labelBgEl.getAttribute('fill') || '#ffffff';
              ctx.strokeStyle = labelBgEl.getAttribute('stroke') || '#111111';
              ctx.lineWidth = parseFloat(labelBgEl.getAttribute('stroke-width')) || 1.5;
              ctx.beginPath();
              const r = 4;
              ctx.moveTo(bx + r, by);
              ctx.lineTo(bx + bw - r, by);
              ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
              ctx.lineTo(bx + bw, by + bh - r);
              ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
              ctx.lineTo(bx + r, by + bh);
              ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
              ctx.lineTo(bx, by + r);
              ctx.quadraticCurveTo(bx, by, bx + r, by);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }

            ctx.font = conCanvasFontFromStyles(labelStyles, '"Segoe UI", Arial, sans-serif');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const strokeW = parseFloat(labelStyles.strokeWidth);
            if (Number.isFinite(strokeW) && strokeW > 0) {
              ctx.strokeStyle = labelStyles.stroke || 'rgba(255,255,255,0.85)';
              ctx.lineWidth = strokeW;
              ctx.lineJoin = 'round';
              ctx.strokeText(labelText, 0, dyAttr);
            }
            ctx.fillStyle = labelStyles.fill || '#333333';
            ctx.fillText(labelText, 0, dyAttr);
            ctx.restore();
          }
        });
      }

      conDrawTablesToCanvas(ctx, PAD);

      (window.conGetShapes ? window.conGetShapes() : []).forEach(s => {
        const sw = s.thickness || 2; const op = Number.isFinite(s.opacity) ? s.opacity : 1; const color = s.color || '#333333'; const fill = s.fillColor || 'none';
        ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = color; ctx.lineWidth = sw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const dashStyle = s.dashStyle || 'solid';
        if (dashStyle === 'dashed') ctx.setLineDash([sw * 4, sw * 2]); else if (dashStyle === 'dotted') ctx.setLineDash([sw * 0.5, sw * 2.5]); else ctx.setLineDash([]);
        if (s.type === 'rect') { if (fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(PAD + s.x, PAD + s.y, s.w, s.h); } ctx.strokeRect(PAD + s.x, PAD + s.y, s.w, s.h); }
        else if (s.type === 'circle' || s.type === 'ellipse') { const cx = PAD + s.x + s.w / 2, cy = PAD + s.y + s.h / 2; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, s.w / 2), Math.max(0.5, s.h / 2), 0, 0, Math.PI * 2); if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); }
        else if (s.type === 'diamond') { const cx = PAD + s.x + s.w / 2, mid_y = PAD + s.y + s.h / 2; ctx.beginPath(); ctx.moveTo(cx, PAD + s.y); ctx.lineTo(PAD + s.x + s.w, mid_y); ctx.lineTo(cx, PAD + s.y + s.h); ctx.lineTo(PAD + s.x, mid_y); ctx.closePath(); if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); }
        else if (s.type === 'line') { ctx.beginPath(); ctx.moveTo(PAD + s.lx1, PAD + s.ly1); ctx.lineTo(PAD + s.lx2, PAD + s.ly2); ctx.stroke(); }
        else if (s.type === 'arrow') { const adx = s.lx2 - s.lx1, ady = s.ly2 - s.ly1; const dist = Math.sqrt(adx * adx + ady * ady); if (dist > 1) { const angle = Math.atan2(ady, adx); const ahPx = s.arrowheadSize || Math.max(8, sw * 2.5); const aw = Math.min(ahPx, 40), ah = aw * 0.6; ctx.beginPath(); ctx.moveTo(PAD + s.lx1, PAD + s.ly1); ctx.lineTo(PAD + s.lx2 - Math.cos(angle) * sw, PAD + s.ly2 - Math.sin(angle) * sw); ctx.stroke(); ctx.setLineDash([]); ctx.save(); ctx.translate(PAD + s.lx2, PAD + s.ly2); ctx.rotate(angle); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-aw, -ah / 2); ctx.lineTo(-aw, ah / 2); ctx.closePath(); ctx.fill(); ctx.restore(); } }
        else if (s.type === 'polygon' && s.pts && s.pts.length >= 2) { ctx.beginPath(); ctx.moveTo(PAD + s.pts[0].x, PAD + s.pts[0].y); for (let i = 1; i < s.pts.length; i++) ctx.lineTo(PAD + s.pts[i].x, PAD + s.pts[i].y); ctx.closePath(); if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke(); }
        ctx.restore();
      });
      nodes.forEach(n => {
        if (!n || !n.el) return;
        const el = n.el; const nx = n.x, ny = n.y; const nw = el.offsetWidth, nh = el.offsetHeight;
        const bg = el.style.background || '#ffffff'; const color = el.style.color || '#111111'; const border = el.style.borderColor || '#111111';
        const shape = n.shape || (el.dataset && el.dataset.shape);
        const bw2 = (n.borderWidth != null ? n.borderWidth : parseInt(el.style.borderWidth)) || 2;
        const bs = n.borderStyle || el.style.borderStyle || 'solid';
        const rot = (typeof n.rotation === 'number')
          ? ((typeof window.conNormalizeNodeRotation === 'function') ? window.conNormalizeNodeRotation(n.rotation) : (Math.round(n.rotation) % 360))
          : 0;

        ctx.save();
        if (rot && rot % 360 !== 0) {
          const cx = PAD + nx + nw / 2;
          const cy = PAD + ny + nh / 2;
          ctx.translate(cx, cy);
          ctx.rotate(rot * Math.PI / 180);
          ctx.translate(-cx, -cy);
        }

        const savedTransform = (rot && rot % 360 !== 0) ? el.style.transform : null;
        if (savedTransform !== null) {
          el.style.transform = 'none';
        }

        try {
          if (n.highlight) { ctx.save(); ctx.strokeStyle = n.highlight; ctx.lineWidth = 4; ctx.globalAlpha = 0.85; ctx.setLineDash([]); conCanvasTraceNodePath(ctx, PAD + nx - 3, PAD + ny - 3, nw + 6, nh + 6, shape); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore(); }
          ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; ctx.fillStyle = bg; conCanvasTraceNodePath(ctx, PAD + nx, PAD + ny, nw, nh, shape); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          ctx.strokeStyle = border; ctx.lineWidth = bw2;
          if (bs === 'dashed') ctx.setLineDash([Math.max(4, bw2 * 3), Math.max(3, bw2 * 2)]); else if (bs === 'dotted') ctx.setLineDash([bw2, Math.max(2, bw2 * 2)]); else ctx.setLineDash([]);
          conCanvasTraceNodePath(ctx, PAD + nx, PAD + ny, nw, nh, shape); ctx.stroke();
          if (bs === 'double' && bw2 >= 2) { ctx.lineWidth = Math.max(1, bw2 - 2); ctx.setLineDash([]); const inset = Math.max(2, bw2); conCanvasTraceNodePath(ctx, PAD + nx + inset, PAD + ny + inset, nw - inset * 2, nh - inset * 2, shape); ctx.stroke(); }
          ctx.setLineDash([]); conDrawNodeLabelToCanvas(ctx, n, PAD, color);
          if (n.emoji) { const dotEl = el.querySelector('.con-emoji-dot'); if (dotEl) { const dr = dotEl.getBoundingClientRect(); const er = el.getBoundingClientRect(); const dx = dr.left - er.left + dr.width / 2; const dy = dr.top - er.top + dr.height / 2; const dotFontPx = parseFloat(getComputedStyle(dotEl).fontSize) || 11; ctx.font = `${dotFontPx}px "Segoe UI",Arial,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.emoji, PAD + nx + dx, PAD + ny + dy); } }
        } finally {
          if (savedTransform !== null) {
            el.style.transform = savedTransform;
          }
          ctx.restore();
        }
      });
      document.querySelectorAll('#constellation-board .con-word-note').forEach(note => {
        const nx = note.offsetLeft; const ny = note.offsetTop; const nw = note.offsetWidth; const nh = note.offsetHeight;
        const bg = note.style.background || '#ffffff'; const border = note.style.borderColor || '#cdc9c9';
        const noteBW = parseInt(note.style.borderWidth) || 1; const noteBS = note.style.borderStyle || 'solid';
        ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = noteBW; const r = 4;
        ctx.beginPath(); ctx.moveTo(PAD + nx + r, PAD + ny); ctx.lineTo(PAD + nx + nw - r, PAD + ny); ctx.quadraticCurveTo(PAD + nx + nw, PAD + ny, PAD + nx + nw, PAD + ny + r); ctx.lineTo(PAD + nx + nw, PAD + ny + nh - r); ctx.quadraticCurveTo(PAD + nx + nw, PAD + ny + nh, PAD + nx + nw - r, PAD + ny + nh); ctx.lineTo(PAD + nx + r, PAD + ny + nh); ctx.quadraticCurveTo(PAD + nx, PAD + ny + nh, PAD + nx, PAD + ny + nh - r); ctx.lineTo(PAD + nx, PAD + ny + r); ctx.quadraticCurveTo(PAD + nx, PAD + ny, PAD + nx + r, PAD + ny); ctx.closePath(); ctx.fill();
        if (noteBS === 'dashed') ctx.setLineDash([6, 3]); else if (noteBS === 'dotted') ctx.setLineDash([2, 3]); else ctx.setLineDash([]);
        ctx.stroke(); ctx.setLineDash([]);
        _conCanvasRichNote(ctx, note, PAD + nx, PAD + ny, nw, nh);
        const noteMeta = (typeof conNotes !== 'undefined') ? conNotes.find(m => m.id === note.dataset.id) : null;
        if (noteMeta && noteMeta.emoji) { const dotEl = note.querySelector('.con-emoji-dot'); if (dotEl) { const _noteRect = note.getBoundingClientRect(); const dr = dotEl.getBoundingClientRect(); const dx = dr.left - _noteRect.left + dr.width / 2; const dy = dr.top - _noteRect.top + dr.height / 2; const dotFontPx = parseFloat(getComputedStyle(dotEl).fontSize) || 11; ctx.font = `${dotFontPx}px "Segoe UI",Arial,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteMeta.emoji, PAD + nx + dx, PAD + ny + dy); } }
      });
      (window._conBoardStickers || []).forEach(st => {
        if (!st || !st.emoji) return;
        const sx = PAD + (Number(st.x) || 0), sy = PAD + (Number(st.y) || 0);
        const sz = Number(st.size) || 36;
        ctx.save();
        ctx.font = `${sz}px "Segoe UI Emoji", Apple Color Emoji, sans-serif`;
        ctx.fillText(st.emoji, sx, sy + sz * 0.85);
        ctx.restore();
      });
      (window.conGetDrawings ? window.conGetDrawings() : []).forEach(d => {
        if (!d.points || d.points.length < 2) return;
        const op = Number.isFinite(d.opacity) ? d.opacity : 1;
        ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = d.color || '#e53935'; ctx.lineWidth = d.thickness || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(PAD + d.x + d.points[0].x, PAD + d.y + d.points[0].y);
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(PAD + d.x + d.points[i].x, PAD + d.y + d.points[i].y);
        ctx.stroke(); ctx.restore();
      });
      (window.conGetMasks ? window.conGetMasks() : []).forEach(mask => {
        if (!mask || !mask.el) return;
        const mx = mask.el.offsetLeft; const my = mask.el.offsetTop; const mw = mask.el.offsetWidth; const mh = mask.el.offsetHeight;
        const bg = mask.color || '#111111'; const op = Math.max(0.05, Math.min(1, Number(mask.opacity) || parseFloat(mask.el.style.opacity) || 0.95));
        ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = bg; ctx.fillRect(PAD + mx, PAD + my, mw, mh); ctx.restore();
      });
      const now = new Date();
      const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      ctx.font = '500 11px "Segoe UI",Arial,sans-serif'; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(ts, bw + PAD * 2 - 8, bh + PAD * 2 - 6);
      return { canvas, now, scale, PAD, bw, bh };
    } finally {
      document.documentElement.classList.remove('con-exporting');
    }
  }

    async function conExportPNG() {
      const result = await _conBuildBoardCanvas(); if (!result) return;
      const { canvas, now } = result;
      const defaultFilename = 'constellation_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + '.png';
      canvas.toBlob(blob => {
        if (window.Desktop && Desktop.isElectron()) {
          const reader = new FileReader();
          reader.onloadend = function () {
            const base64data = reader.result.split(',')[1];
            Desktop.saveToDisk({
              title: 'Save PNG Image',
              defaultPath: defaultFilename,
              filters: [{ name: 'PNG Images', extensions: ['png'] }],
              content: base64data,
              encoding: 'base64'
            }).then(res => {
              if (res && res.ok) {
                if (window.showExportSuccessPopup) showExportSuccessPopup(res.path, defaultFilename);
              } else if (res && !res.ok && !res.canceled) {
                mdbToast(' Save failed: ' + (res.error || 'unknown'));
              }
            });
          };
          reader.readAsDataURL(blob);
        } else {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = defaultFilename;
          a.click(); URL.revokeObjectURL(a.href);
        }
      }, 'image/png');
    }

    async function conCopyPNG() {
      const result = await _conBuildBoardCanvas(); if (!result) return;
      const { canvas } = result;
      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          const btn = document.querySelector('[onclick="conCopyPNG()"]');
          if (btn) { const o = btn.textContent; btn.textContent = ' Copied!'; setTimeout(() => btn.textContent = o, 1800); }
        } catch (err) { mdbToast(' Clipboard write failed — try Export PNG instead.'); }
      }, 'image/png');
    }

    // ── Export Settings Modal & Export Execution ────────────────────────
    function conOpenExportSettingsModal(defaultFormat = 'pdf_snapshots') {
      const overlay = document.getElementById('con-export-settings-overlay');
      if (!overlay) return;

      const pdfRadio = document.getElementById('con-export-fmt-pdf');
      const webpRadio = document.getElementById('con-export-fmt-webp');
      if (defaultFormat === 'webp' && webpRadio) {
        webpRadio.checked = true;
      } else if (pdfRadio) {
        pdfRadio.checked = true;
      }

      // Update scope labels with actual page count
      const curPageIdx = (typeof conCurrentPageIndex === 'number') ? conCurrentPageIndex : 0;
      const totalPages = (Array.isArray(conPageSnapshots) && conPageSnapshots.length > 0) ? conPageSnapshots.length : 1;
      const curLabel = document.getElementById('con-export-scope-current-label');
      if (curLabel) {
        curLabel.textContent = (window.i18n ? i18n.t('conExportScopeCurrent') : 'Current page only') + ` (Page ${curPageIdx + 1})`;
      }
      const allLabel = document.getElementById('con-export-scope-all-label');
      if (allLabel) {
        allLabel.textContent = (window.i18n ? i18n.t('conExportScopeAll') : 'All pages booklet') + ` (${totalPages} ${totalPages > 1 ? 'pages' : 'page'})`;
      }

      // Default scope: for webp, default to current page; for pdf, default to all pages
      const scopeCurrent = document.getElementById('con-export-scope-current');
      const scopeAll = document.getElementById('con-export-scope-all');
      if (defaultFormat === 'webp') {
        if (scopeCurrent) scopeCurrent.checked = true;
      } else {
        if (scopeAll) scopeAll.checked = true;
      }

      conOnExportSettingsChange();
      overlay.style.display = 'flex';
    }

    function conCloseExportSettingsModal() {
      const overlay = document.getElementById('con-export-settings-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    function conOnExportQualitySlider(val) {
      const badge = document.getElementById('con-export-quality-badge');
      if (badge) badge.textContent = val + '%';
      conUpdateExportEstimate();
    }

    function conApplyExportQualityPreset(val) {
      const slider = document.getElementById('con-export-quality-slider');
      if (slider) {
        slider.value = val;
        conOnExportQualitySlider(val);
      }
    }

    function conOnExportSettingsChange() {
      conUpdateExportEstimate();
    }

    function conUpdateExportEstimate() {
      const scaleSelect = document.getElementById('con-export-scale-select');
      const scale = scaleSelect ? parseFloat(scaleSelect.value) || 1.5 : 1.5;
      const slider = document.getElementById('con-export-quality-slider');
      const quality = slider ? parseInt(slider.value, 10) || 82 : 82;

      const board = document.getElementById('constellation-board');
      const baseW = Math.max(600, board ? board.clientWidth : 1200);
      const baseH = Math.max(400, board ? board.clientHeight : 800);
      const estW = Math.round(baseW * scale);
      const estH = Math.round(baseH * scale);

      const dimsEl = document.getElementById('con-export-dims-preview');
      if (dimsEl) {
        const pixels = estW * estH;
        const approxKb = Math.round((pixels / 10000) * (quality / 100) * 0.18);
        dimsEl.textContent = `~${estW} × ${estH} px (≈${Math.max(40, approxKb)} KB / page)`;
      }
    }

    async function conExecuteExportWithOptions() {
      const isWebp = document.getElementById('con-export-fmt-webp')?.checked;
      const scope = document.getElementById('con-export-scope-current')?.checked ? 'current' : 'all';
      const scaleSelect = document.getElementById('con-export-scale-select');
      const scale = scaleSelect ? parseFloat(scaleSelect.value) || 1.5 : 1.5;
      const slider = document.getElementById('con-export-quality-slider');
      const quality = slider ? parseInt(slider.value, 10) || 82 : 82;

      conCloseExportSettingsModal();

      const options = {
        format: isWebp ? 'webp' : 'pdf_snapshots',
        scope,
        scale,
        quality
      };

      if (isWebp) {
        await conExportWebP(options);
      } else {
        await conExportPagesPDF('snapshots', options);
      }
    }

    function conCreateStoreZipUint8Array(entries) {
      const prepared = entries.map(e => {
        let fileBytes;
        if (e.data instanceof Uint8Array) {
          fileBytes = e.data;
        } else if (typeof e.data === 'string') {
          if (e.encoding === 'base64') {
            const bin = atob(e.data);
            fileBytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) fileBytes[i] = bin.charCodeAt(i);
          } else {
            fileBytes = new TextEncoder().encode(e.data);
          }
        } else {
          fileBytes = new Uint8Array(0);
        }
        const nameBytes = new TextEncoder().encode(e.name);
        return { nameBytes, fileBytes };
      });

      const crcTable = (function () {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
          t[i] = c;
        }
        return t;
      })();

      function calcCrc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
          crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }

      let localSize = 0;
      let cdSize = 0;
      prepared.forEach(p => {
        p.crc = calcCrc32(p.fileBytes);
        localSize += 30 + p.nameBytes.length + p.fileBytes.length;
        cdSize += 46 + p.nameBytes.length;
      });
      const endSize = 22;
      const totalLen = localSize + cdSize + endSize;
      const buf = new Uint8Array(totalLen);
      const view = new DataView(buf.buffer);

      let offset = 0;
      const cdOffsets = [];

      prepared.forEach(p => {
        cdOffsets.push(offset);
        view.setUint32(offset, 0x04034b50, true);
        view.setUint16(offset + 4, 10, true);
        view.setUint16(offset + 6, 0, true);
        view.setUint16(offset + 8, 0, true);
        view.setUint16(offset + 10, 0, true);
        view.setUint16(offset + 12, 0, true);
        view.setUint32(offset + 14, p.crc, true);
        view.setUint32(offset + 18, p.fileBytes.length, true);
        view.setUint32(offset + 22, p.fileBytes.length, true);
        view.setUint16(offset + 26, p.nameBytes.length, true);
        view.setUint16(offset + 28, 0, true);
        offset += 30;
        buf.set(p.nameBytes, offset);
        offset += p.nameBytes.length;
        buf.set(p.fileBytes, offset);
        offset += p.fileBytes.length;
      });

      const cdStartOffset = offset;
      prepared.forEach((p, idx) => {
        view.setUint32(offset, 0x02014b50, true);
        view.setUint16(offset + 4, 10, true);
        view.setUint16(offset + 6, 10, true);
        view.setUint16(offset + 8, 0, true);
        view.setUint16(offset + 10, 0, true);
        view.setUint16(offset + 12, 0, true);
        view.setUint16(offset + 14, 0, true);
        view.setUint32(offset + 16, p.crc, true);
        view.setUint32(offset + 20, p.fileBytes.length, true);
        view.setUint32(offset + 24, p.fileBytes.length, true);
        view.setUint16(offset + 28, p.nameBytes.length, true);
        view.setUint16(offset + 30, 0, true);
        view.setUint16(offset + 32, 0, true);
        view.setUint16(offset + 34, 0, true);
        view.setUint16(offset + 36, 0, true);
        view.setUint32(offset + 38, 0, true);
        view.setUint32(offset + 42, cdOffsets[idx], true);
        offset += 46;
        buf.set(p.nameBytes, offset);
        offset += p.nameBytes.length;
      });

      view.setUint32(offset, 0x06054b50, true);
      view.setUint16(offset + 4, 0, true);
      view.setUint16(offset + 6, 0, true);
      view.setUint16(offset + 8, prepared.length, true);
      view.setUint16(offset + 10, prepared.length, true);
      view.setUint32(offset + 12, cdSize, true);
      view.setUint32(offset + 16, cdStartOffset, true);
      view.setUint16(offset + 20, 0, true);

      return buf;
    }

    async function conExportWebP(exportOpts = {}) {
      conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
      const allPages = conPageSnapshots.slice();
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'constellation';
      const safeTitle = titleVal.replace(/[\\/:*?"<>|]/g, '_') || 'constellation';
      const targetScale = (exportOpts && typeof exportOpts.scale === 'number') ? exportOpts.scale : 1.5;
      const targetQuality = (exportOpts && typeof exportOpts.quality === 'number') ? Math.max(0.2, Math.min(1.0, exportOpts.quality / 100)) : 0.82;
      const scope = (exportOpts && exportOpts.scope) || 'current';

      const isPageNonEmpty = p => {
        if (!p) return false;
        return (p.nodes && p.nodes.length > 0) ||
          (p.groups && p.groups.length > 0) ||
          (p.shapes && p.shapes.length > 0) ||
          (p.notes && p.notes.length > 0) ||
          (p.drawings && p.drawings.length > 0) ||
          (p.tables && p.tables.length > 0) ||
          (p.media && p.media.length > 0) ||
          (p.masks && p.masks.length > 0) ||
          (p.boardStickers && p.boardStickers.length > 0) ||
          (p.backgroundPdf && (p.backgroundPdf.relativePath || p.backgroundPdf.attachmentId));
      };

      const now = new Date();
      const timeStamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');

      if (scope === 'current') {
        const result = await _conBuildBoardCanvas({ scale: targetScale });
        if (!result || !result.canvas) return;
        const pageNumPadded = String(conCurrentPageIndex + 1).padStart(2, '0');
        const defaultFilename = safeTitle + '_p' + pageNumPadded + '_' + timeStamp + '.webp';

        result.canvas.toBlob(blob => {
          if (!blob) {
            mdbToast(' Failed to encode WebP image.');
            return;
          }
          if (window.Desktop && Desktop.isElectron()) {
            const reader = new FileReader();
            reader.onloadend = function () {
              const base64data = reader.result.split(',')[1];
              Desktop.saveToDisk({
                title: 'Save WebP Image',
                defaultPath: defaultFilename,
                filters: [{ name: 'WebP Images', extensions: ['webp'] }],
                content: base64data,
                encoding: 'base64'
              }).then(res => {
                if (res && res.ok) {
                  const savedName = res.name || defaultFilename;
                  if (typeof showToast === 'function') {
                    showToast(i18n.tFmt('conExportWebpSaved', { name: savedName }));
                  } else {
                    mdbToast(' ' + i18n.tFmt('conExportWebpSaved', { name: savedName }));
                  }
                  if (window.showExportSuccessPopup && res.path) {
                    showExportSuccessPopup(res.path, savedName);
                  }
                } else if (res && !res.ok && !res.canceled) {
                  mdbToast(' Save failed: ' + (res.error || 'unknown'));
                }
              });
            };
            reader.readAsDataURL(blob);
          } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = defaultFilename;
            a.click();
            URL.revokeObjectURL(a.href);
          }
        }, 'image/webp', targetQuality);
      } else {
        const origIndex = conCurrentPageIndex;
        const pagesToProcess = (allPages.length > 1)
          ? (allPages.filter(isPageNonEmpty).length > 0 ? allPages.filter(isPageNonEmpty) : allPages.slice(0, 1))
          : allPages;

        let overlay = document.getElementById('con-pdf-export-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'con-pdf-export-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;transition:opacity 0.2s ease;';
          overlay.innerHTML = `
            <div style="background:rgba(30,41,59,0.9);padding:24px 36px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;gap:12px;">
              <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;animation:con-pdf-spin 0.8s linear infinite;"></div>
              <div id="con-pdf-export-loading-title" style="font-weight:600;font-size:15px;letter-spacing:0.3px;">Exporting WebP Images...</div>
              <div id="con-pdf-export-loading-progress" style="font-size:13px;color:#94a3b8;">Preparing pages...</div>
            </div>
            <style>@keyframes con-pdf-spin { to { transform: rotate(360deg); } }</style>
          `;
          document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';

        const boardEl = document.getElementById('constellation-board');
        const prevVisibility = boardEl ? boardEl.style.visibility : '';
        if (boardEl) boardEl.style.visibility = 'hidden';

        const webpEntries = [];
        try {
          const progressEl = document.getElementById('con-pdf-export-loading-progress');
          for (let i = 0; i < pagesToProcess.length; i++) {
            if (progressEl) progressEl.textContent = `Processing page ${i + 1} of ${pagesToProcess.length}...`;
            _conRestorePageToBoard(pagesToProcess[i], { isExport: true });
            if (typeof conAwaitAllPdfRendersOnBoard === 'function') {
              try { await conAwaitAllPdfRendersOnBoard(); } catch (_) { }
            }
            if (typeof conAwaitAllMediaRendersOnBoard === 'function') {
              try { await conAwaitAllMediaRendersOnBoard(); } catch (_) { }
            }
            await new Promise(r => setTimeout(r, 80));
            const res = await _conBuildBoardCanvas({ scale: targetScale });
            if (res && res.canvas) {
              let u = res.canvas.toDataURL('image/webp', targetQuality);
              if (!u || !u.startsWith('data:image/webp')) u = res.canvas.toDataURL('image/png');
              const b64 = u.split(',')[1];
              const pageNumPadded = String(i + 1).padStart(3, '0');
              webpEntries.push({
                name: safeTitle + '_page_' + pageNumPadded + '.webp',
                data: b64,
                encoding: 'base64',
                store: true
              });
            }
          }
        } finally {
          _conRestorePageToBoard(allPages[origIndex]);
          if (boardEl) boardEl.style.visibility = prevVisibility;
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 200);
          }
        }

        if (webpEntries.length === 0) {
          mdbToast(' No pages could be converted to WebP.');
          return;
        }

        if (webpEntries.length === 1) {
          const single = webpEntries[0];
          if (window.Desktop && Desktop.isElectron()) {
            Desktop.saveToDisk({
              title: 'Save WebP Image',
              defaultPath: single.name,
              filters: [{ name: 'WebP Images', extensions: ['webp'] }],
              content: single.data,
              encoding: 'base64'
            }).then(res => {
              if (res && res.ok) {
                const savedName = res.name || single.name;
                if (typeof showToast === 'function') {
                  showToast(i18n.tFmt('conExportWebpSaved', { name: savedName }));
                } else {
                  mdbToast(' ' + i18n.tFmt('conExportWebpSaved', { name: savedName }));
                }
                if (window.showExportSuccessPopup && res.path) {
                  showExportSuccessPopup(res.path, savedName);
                }
              }
            });
          } else {
            const byteCharacters = atob(single.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/webp' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = single.name;
            a.click();
            URL.revokeObjectURL(a.href);
          }
          return;
        }

        const zipBytes = conCreateStoreZipUint8Array(webpEntries);
        const zipFilename = safeTitle + '_webp_pages_' + timeStamp + '.zip';

        if (window.Desktop && Desktop.isElectron()) {
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < zipBytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, zipBytes.subarray(i, i + chunkSize));
          }
          const base64Zip = btoa(binary);

          Desktop.saveToDisk({
            title: 'Save WebP Pages Archive',
            defaultPath: zipFilename,
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
            content: base64Zip,
            encoding: 'base64'
          }).then(res => {
            if (res && res.ok) {
              const savedName = res.name || zipFilename;
              if (typeof showToast === 'function') {
                showToast('WebP archive exported: ' + savedName);
              } else {
                mdbToast(' WebP archive exported: ' + savedName);
              }
              if (window.showExportSuccessPopup && res.path) {
                showExportSuccessPopup(res.path, savedName, true);
              }
            } else if (res && !res.ok && !res.canceled) {
              mdbToast(' Save failed: ' + (res.error || 'unknown'));
            }
          });
        } else {
          const blob = new Blob([zipBytes], { type: 'application/zip' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = zipFilename;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
    }

    async function conExportPagesPDF(mode = 'vector', exportOpts = {}) {
      if (typeof window.conGroupRefitAll === 'function') {
        try { window.conGroupRefitAll(); } catch (_) { }
      }
      conPageSnapshots[conCurrentPageIndex] = conBuildPageSnapshot();
      if (Array.isArray(conPageSnapshots) && typeof conEnsureSnapshotDimensions === 'function') {
        conPageSnapshots.forEach(snap => conEnsureSnapshotDimensions(snap));
      }
      const allPages = conPageSnapshots.slice();
      const titleVal = (document.getElementById('con-title-input')?.value || '').trim() || 'constellation';

      const isPageNonEmpty = p => {
        if (!p) return false;
        return (p.nodes && p.nodes.length > 0) ||
          (p.groups && p.groups.length > 0) ||
          (p.shapes && p.shapes.length > 0) ||
          (p.notes && p.notes.length > 0) ||
          (p.drawings && p.drawings.length > 0) ||
          (p.tables && p.tables.length > 0) ||
          (p.media && p.media.length > 0) ||
          (p.masks && p.masks.length > 0) ||
          (p.boardStickers && p.boardStickers.length > 0) ||
          (p.backgroundPdf && (p.backgroundPdf.relativePath || p.backgroundPdf.attachmentId));
      };

      let pagesToProcess;
      if (exportOpts && exportOpts.scope === 'current') {
        pagesToProcess = [allPages[conCurrentPageIndex]];
      } else {
        pagesToProcess = (allPages.length > 1)
          ? (allPages.filter(isPageNonEmpty).length > 0 ? allPages.filter(isPageNonEmpty) : allPages.slice(0, 1))
          : allPages;
      }

      const targetScale = (exportOpts && typeof exportOpts.scale === 'number') ? exportOpts.scale : 1.5;
      const targetQuality = (exportOpts && typeof exportOpts.quality === 'number') ? Math.max(0.2, Math.min(1.0, exportOpts.quality / 100)) : 0.82;

      const curLayout = window._bcBoardLayoutConfig || {};
      const isPortrait = curLayout.preset === 'a4-portrait' ||
        (curLayout.preset === 'custom' && curLayout.customOrientation === 'portrait') ||
        (curLayout.dims && curLayout.dims.h > curLayout.dims.w);
      const resolvedOrientation = isPortrait ? 'portrait' : 'landscape';

      // 1. PRIMARY: Headless vector SVG BoardExportService (if mode is 'vector' or default)
      if (mode !== 'snapshots' && window.BoardExportService && typeof window.BoardExportService.exportPagesPdf === 'function') {
        try {
          const res = await window.BoardExportService.exportPagesPdf(pagesToProcess, {
            title: titleVal,
            orientation: resolvedOrientation,
            renderMode: 'vector',
            margin: '4mm'
          });
          if (res && (res.ok || res.canceled)) {
            return res;
          }
        } catch (err) {
          console.warn('[Board Export] Headless exportPagesPdf error, falling back to raster canvas loader:', err);
        }
      }

      // 2. High-DPI Canvas rasterization loader (for 'snapshots' mode or fallback)
      const origIndex = conCurrentPageIndex;
      const dataUrls = [];

      let overlay = document.getElementById('con-pdf-export-loading-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'con-pdf-export-loading-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;transition:opacity 0.2s ease;';
        overlay.innerHTML = `
          <div style="background:rgba(30,41,59,0.9);padding:24px 36px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;gap:12px;">
            <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;animation:con-pdf-spin 0.8s linear infinite;"></div>
            <div id="con-pdf-export-loading-title" style="font-weight:600;font-size:15px;letter-spacing:0.3px;">Generating PDF...</div>
            <div id="con-pdf-export-loading-progress" style="font-size:13px;color:#94a3b8;">Preparing pages...</div>
          </div>
          <style>@keyframes con-pdf-spin { to { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(overlay);
      }
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';

      const boardEl = document.getElementById('constellation-board');
      const prevVisibility = boardEl ? boardEl.style.visibility : '';
      if (boardEl) boardEl.style.visibility = 'hidden';

      try {
        const progressEl = document.getElementById('con-pdf-export-loading-progress');
        for (let i = 0; i < pagesToProcess.length; i++) {
          if (progressEl) progressEl.textContent = `Processing page ${i + 1} of ${pagesToProcess.length}...`;
          _conRestorePageToBoard(pagesToProcess[i], { isExport: true });
          if (typeof conAwaitAllPdfRendersOnBoard === 'function') {
            try { await conAwaitAllPdfRendersOnBoard(); } catch (_) { }
          }
          if (typeof conAwaitAllMediaRendersOnBoard === 'function') {
            try { await conAwaitAllMediaRendersOnBoard(); } catch (_) { }
          }
          await new Promise(r => setTimeout(r, 80));
          const res = await _conBuildBoardCanvas({ scale: targetScale });
          if (res && res.canvas) {
            let u = res.canvas.toDataURL('image/webp', targetQuality);
            if (!u || !u.startsWith('data:image/webp')) u = res.canvas.toDataURL('image/png');
            dataUrls.push(u);
          }
        }
      } finally {
        _conRestorePageToBoard(allPages[origIndex]);
        if (boardEl) boardEl.style.visibility = prevVisibility;
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => { overlay.style.display = 'none'; }, 200);
        }
      }

      if (window.BoardExportService && typeof window.BoardExportService.exportCanvasPagesPdf === 'function') {
        return window.BoardExportService.exportCanvasPagesPdf(dataUrls, {
          title: titleVal,
          orientation: resolvedOrientation,
          quality: targetQuality,
          scale: targetScale
        });
      }

      function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      const displayTitle = escapeHtml(titleVal);
      const imgTags = dataUrls.map((url, i) => `<div class="pg"><img src="${url}" alt="Page ${i + 1}"></div>`).join('\n');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${displayTitle}</title><style>@page{margin:0;size:${resolvedOrientation}}html,body{margin:0;padding:0;background:#fff;width:100%;height:100%}.pg{width:100vw;height:100vh;page-break-after:always;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box}.pg:last-child{page-break-after:auto}img{max-width:100%;max-height:100%;object-fit:contain;display:block}</style></head><body>\n${imgTags}\n</body></html>`;
      const safeTitle = titleVal.replace(/[\\/:*?"<>|]/g, '_') || 'constellation';
      const defaultName = safeTitle + '_pages.pdf';

      if (window.Desktop && Desktop.isElectron() && typeof Desktop.printPdf === 'function') {
        const doPrint = (targetFilename, isToPrint) => {
          const pdfReq = {
            html,
            landscape: true,
            pdfOptions: { pageSize: 'A4', landscape: true, printBackground: true }
          };
          if (isToPrint) {
            pdfReq.target = 'toPrint';
            pdfReq.filename = targetFilename;
          } else {
            pdfReq.defaultName = targetFilename;
          }
          Desktop.printPdf(pdfReq).then(result => {
            if (result && result.ok) {
              if (window.showExportSuccessPopup && result.path) {
                showExportSuccessPopup(result.path, result.name || targetFilename);
              } else if (typeof mdbToast === 'function') {
                mdbToast(' PDF saved: ' + (result.name || targetFilename));
              }
            } else if (!result.ok && !result.canceled) {
              mdbToast(' Could not save PDF: ' + (result.error || 'unknown error'));
            }
          }).catch(err => {
            mdbToast(' Could not save PDF: ' + (err && err.message ? err.message : String(err)));
          });
        };

        if (typeof window.promptExportDestination === 'function') {
          window.promptExportDestination({
            title: 'Export Board PDF',
            prompt: 'Where do you want to save the exported PDF?',
            filename: defaultName,
            allowDocEditor: false
          }).then(destRes => {
            if (!destRes || destRes.canceled) return;
            doPrint(destRes.filename || defaultName, destRes.destination === 'to-print');
          });
        } else {
          doPrint(defaultName, false);
        }
      } else {
        let iframe = document.getElementById('con-pages-pdf-iframe');
        if (!iframe) { iframe = document.createElement('iframe'); iframe.id = 'con-pages-pdf-iframe'; iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px'; document.body.appendChild(iframe); }
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { } }, 500);
      }
    }

    // ── End canvas / export helpers ───────────────────────────────────

    function _conDownsampleCanvas(srcCanvas, maxDim = 600) {
      if (!srcCanvas || !srcCanvas.width || !srcCanvas.height) return srcCanvas;
      const sw = srcCanvas.width;
      const sh = srcCanvas.height;
      if (sw <= maxDim && sh <= maxDim) return srcCanvas;

      const scale = Math.min(maxDim / sw, maxDim / sh);
      const dw = Math.max(1, Math.round(sw * scale));
      const dh = Math.max(1, Math.round(sh * scale));

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = dw;
      thumbCanvas.height = dh;
      const ctx = thumbCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, dw, dh);
      }
      return thumbCanvas;
    }

    function _conBuildThumbnailDataUrl(srcCanvas, maxDim = 600) {
      if (!srcCanvas) return '';
      const thumbCanvas = _conDownsampleCanvas(srcCanvas, maxDim);
      let url = thumbCanvas.toDataURL('image/webp', 0.82);
      if (!url || !url.startsWith('data:image/webp')) {
        url = thumbCanvas.toDataURL('image/png');
      }
      return url;
    }

    // Save a WebP/PNG snapshot of the current board state for a given page index.
    // Save a WebP/PNG snapshot of the current board state for a given page index.
    // Captures visual fidelity canvas and updates in-memory snapshot cache and DOM preview.
  // Cross-module exports
  window.conExport = global.conExport = conExport;
  window.conOpenLegacyExportChooser = global.conOpenLegacyExportChooser = conOpenLegacyExportChooser;
  window.conExportJS = global.conExportJS = conExportJS;
  window.conPdfPickerClose = global.conPdfPickerClose = conPdfPickerClose;
  window._doConExportPDF = global._doConExportPDF = _doConExportPDF;
  window.conBuildSessionArchiveBundle = global.conBuildSessionArchiveBundle = conBuildSessionArchiveBundle;
  window.conParseBoardArchiveArrayBuffer = global.conParseBoardArchiveArrayBuffer = conParseBoardArchiveArrayBuffer;
  window.conBuildSessionFolderBundle = global.conBuildSessionFolderBundle = conBuildSessionFolderBundle;
  window.conNormalizeNodeShapeSafe = global.conNormalizeNodeShapeSafe = conNormalizeNodeShapeSafe;
  window._conBuildBoardCanvas = global._conBuildBoardCanvas = _conBuildBoardCanvas;
  window.conCloseExportSettingsModal = global.conCloseExportSettingsModal = conCloseExportSettingsModal;
  window.conOnExportQualitySlider = global.conOnExportQualitySlider = conOnExportQualitySlider;
  window.conApplyExportQualityPreset = global.conApplyExportQualityPreset = conApplyExportQualityPreset;
  window.conOnExportSettingsChange = global.conOnExportSettingsChange = conOnExportSettingsChange;
  window.conExecuteExportWithOptions = global.conExecuteExportWithOptions = conExecuteExportWithOptions;
  window._conBuildThumbnailDataUrl = global._conBuildThumbnailDataUrl = _conBuildThumbnailDataUrl;

})(typeof window !== "undefined" ? window : this);
