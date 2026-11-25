'use strict';

// ── Monaco Editor Worker Environment ─────────────────────
(function () {
  const ASSETS_PATH = '../modules/monaco-editor/min/vs/assets/';
  window.MonacoEnvironment = {
    getWorkerUrl(moduleId, label) {
      if (label === 'css' || label === 'less' || label === 'scss') {
        return ASSETS_PATH + 'css.worker-HnVq6Ewq.js';
      }
      return ASSETS_PATH + 'editor.worker-Be8ye1pW.js';
    }
  };
})();


const _initialSearchParams = new URLSearchParams(window.location.search);
let _initialLoadDone = false;

// ── State ────────────────────────────────────────────────
let mdEditor = null;
let cssEditor = null;
let currentDocName = null;
let currentDocSubdir = null; // null = legacy flat file; otherwise the full relative bundle path (e.g. 'unit-1/my-doc')
let currentStylesheetName = null;
let currentEditTarget = null; // non-null when editing a file from an external target
let currentEditRelPath = null;
let currentDocStoredInDocs = false;
let currentOpenedDiskPath = null;
let cssEditorVisible = false;
let scriptEditor = null;
let scriptEditorVisible = false;
let scriptModified = false;
let deScriptSetting = false;
let deScriptTextCache = '';
let splitFraction = 0.5;
let renderTimer = null;
let saveModalCallback = null;
let pdfExportModalCallback = null;
let fileModalMode = null;
let fileBrowserState = null;
let currentDocType = 'md'; // 'md', 'html', or 'typ'
let currentViewMode = 'split'; // 'code', 'split', or 'wysiwyg'
let wysiwygSyncTimer = null;
let wysiwygIsUpdatingFromEditor = false;
let docModified = false;
let cssModified = false;
let currentDocMeta = {}; // in-memory copy of the sidecar .json for the open document
let docSaveInProgress = false;
const DE_INLINE_STYLE_ATTR = 'data-cmt-inline-stylesheet="true"';
const DE_LAYOUT_START = '/* cmt-layout:start */';
const DE_LAYOUT_END = '/* cmt-layout:end */';
let deSyncingLayoutCss = false;

// ── Preview-to-Code & CSS Inspector State ────────────────
let mdHighlightDecorations = [];
let cssHighlightDecorations = [];
let lastInspectedPreviewEl = null;
let lastInspectedCodeRange = null;
let lastInspectedCssRange = null;

// ── Marked + KaTeX setup ─────────────────────────────────
function setupMarked() {
  marked.use({
    breaks: true,
    gfm: true,
    hooks: {
      processAllTokens(tokens) {
        let curLine = 1;
        for (let i = 0; i < tokens.length; i++) {
          const tok = tokens[i];
          tok.sourceStartLine = curLine;
          const nlCount = (tok.raw.match(/\n/g) || []).length;
          tok.sourceEndLine = curLine + nlCount;
          curLine = tok.sourceEndLine;

          if (tok.type === 'list' && Array.isArray(tok.items)) {
            let itemLine = tok.sourceStartLine;
            for (let j = 0; j < tok.items.length; j++) {
              const it = tok.items[j];
              it.sourceStartLine = itemLine;
              const itNl = (it.raw.match(/\n/g) || []).length;
              it.sourceEndLine = itemLine + itNl;
              itemLine = it.sourceEndLine;
            }
          }
        }
        return tokens;
      }
    },
    renderer: {
      heading(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        return `<h${token.depth}${lineAttr}>${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
      },
      paragraph(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        return `<p${lineAttr}>${this.parser.parseInline(token.tokens)}</p>\n`;
      },
      blockquote(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        return `<blockquote${lineAttr}>\n${this.parser.parse(token.tokens)}</blockquote>\n`;
      },
      list(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        const type = token.ordered ? 'ol' : 'ul';
        const start = (token.ordered && token.start !== 1) ? ` start="${token.start}"` : '';
        let body = '';
        for (let j = 0; j < token.items.length; j++) {
          body += this.listitem(token.items[j]);
        }
        return `<${type}${start}${lineAttr}>\n${body}</${type}>\n`;
      },
      listitem(item) {
        const lineAttr = item.sourceStartLine ? ` data-source-line="${item.sourceStartLine}" data-source-end-line="${item.sourceEndLine}"` : '';
        let itemBody = '';
        if (item.task) {
          itemBody += this.checkbox(item);
        }
        itemBody += this.parser.parse(item.tokens, !!item.loose);
        return `<li${lineAttr}>${itemBody}</li>\n`;
      },
      table(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        let header = '';
        let cell = '';
        for (let j = 0; j < token.header.length; j++) {
          cell += this.tablecell(token.header[j]);
        }
        header += this.tablerow({ text: cell });
        let body = '';
        for (let j = 0; j < token.rows.length; j++) {
          cell = '';
          for (let k = 0; k < token.rows[j].length; k++) {
            cell += this.tablecell(token.rows[j][k]);
          }
          body += this.tablerow({ text: cell });
        }
        return `<table${lineAttr}>\n<thead>\n${header}</thead>\n` +
          (body ? `<tbody>\n${body}</tbody>\n` : '') +
          `</table>\n`;
      },
      code(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        const lang = (token.lang || '').match(/^\S*/)?.[0];
        const codeText = token.escaped ? token.text : escHtml(token.text);
        return `<pre${lineAttr}><code${lang ? ` class="language-${lang}"` : ''}>${codeText}</code></pre>\n`;
      },
      html(token) {
        const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        const text = token.text || token.raw || '';
        if (lineAttr && /^<[a-zA-Z][a-zA-Z0-9_-]*(\s|>)/.test(text)) {
          return text.replace(/^<([a-zA-Z][a-zA-Z0-9_-]*)/, `<$1${lineAttr}`);
        }
        return text;
      },
      hr(token) {
        const lineAttr = token && token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
        return `<hr${lineAttr}>\n`;
      }
    },
    extensions: [
      {
        name: 'math-block',
        level: 'block',
        start(src) { return src.indexOf('$$'); },
        tokenizer(src) {
          const m = src.match(/^\$\$([\s\S]+?)\$\$/);
          if (m) return { type: 'math-block', raw: m[0], math: m[1].trim() };
        },
        renderer(token) {
          const lineAttr = token.sourceStartLine ? ` data-source-line="${token.sourceStartLine}" data-source-end-line="${token.sourceEndLine}"` : '';
          try {
            return '<div class="math-display"' + lineAttr + ' data-math="' + escHtml(token.math || '') + '">' +
              katex.renderToString(token.math, { displayMode: true, throwOnError: false }) +
              '</div>\n';
          } catch (e) {
            return '<div class="math-error"' + lineAttr + '>' + escHtml(String(e.message)) + '</div>\n';
          }
        }
      },
      {
        name: 'math-inline',
        level: 'inline',
        start(src) { return src.indexOf('$'); },
        tokenizer(src) {
          if (src.startsWith('$$')) return;
          const m = src.match(/^\$([^\$\n]+?)\$/);
          if (m) return { type: 'math-inline', raw: m[0], math: m[1] };
        },
        renderer(token) {
          try {
            return katex.renderToString(token.math, { displayMode: false, throwOnError: false });
          } catch (e) {
            return '<code>' + escHtml(token.math) + '</code>';
          }
        }
      },
      {
        name: 'page-break',
        level: 'block',
        start(src) {
          const match = src.match(/\x3c!--\s*page[-_ ]*break/i);
          return match ? match.index : -1;
        },
        tokenizer(src) {
          const m = src.match(/^\x3c!--\s*page[-_ ]*break\s*--\x3e\s*\r?\n?/i);
          if (m) return { type: 'page-break', raw: m[0] };
        },
        renderer(token) {
          return '<div class="de-page-break"></div>\n';
        }
      }
    ]
  });
}

function setDocType(type) {
  currentDocType = type;
  if (mdEditor) {
    const lang = type === 'html' ? 'html' : (type === 'typ' ? 'typst' : 'markdown');
    monaco.editor.setModelLanguage(mdEditor.getModel(), lang);
  }
  const btn = document.getElementById('btn-doc-type');
  if (btn) {
    btn.textContent = type.toUpperCase();
    btn.classList.toggle('html-mode', type === 'html');
    btn.classList.toggle('typ-mode', type === 'typ');
  }
  document.querySelectorAll('#doc-type-popover .doc-type-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.docType === type);
  });
  if (typeof deUpdateViewSwitcherState === 'function') {
    deUpdateViewSwitcherState();
  }
  deUpdateScriptEditorUi();
  deClearInspectorHighlights();
  renderPreview();
}

async function renderPreview() {
  if (!mdEditor) return;
  try {
    let raw = mdEditor.getValue();
    if (window.MailpostingService) {
      let activeStudent = null;
      let activeClass = mpState.connectedClass;

      if (mpState.connectedClass && mpState.studentList.length > 0) {
        activeStudent = mpState.studentList[mpState.previewStudentIndex] || mpState.studentList[0];
      } else {
        activeStudent = {
          id: 'st-sample',
          firstName: 'Jane',
          lastName: 'Doe',
          fullName: 'Jane Doe',
          email: 'jane.doe@school.edu'
        };
        activeClass = {
          name: 'Class 101 (Sample)',
          students: [
            { id: 'st-1', firstName: 'Alex', lastName: 'Smith', fullName: 'Alex Smith', email: 'alex.smith@school.edu' },
            { id: 'st-2', firstName: 'Emma', lastName: 'Johnson', fullName: 'Emma Johnson', email: 'emma.johnson@school.edu' },
            { id: 'st-3', firstName: 'Lucas', lastName: 'Brown', fullName: 'Lucas Brown', email: 'lucas.brown@school.edu' }
          ]
        };
      }

      raw = MailpostingService.renderTemplate(raw, activeStudent, activeClass, {
        roster: mpState.studentRoster,
        students: mpState.studentList,
        isHtml: currentDocType === 'html',
        miniDbRecord: window.DeMiniDb ? DeMiniDb.getActiveRecordDict() : null
      });
    }

    if (currentDocType === 'typ') {
      if (window.TypstService) {
        try {
          const res = await TypstService.compileToSvg(raw);
          const container = document.getElementById('preview-content');
          container.innerHTML = '<div class="typst-svg-container">' + res.svg + '</div>';
        } catch (e) {
          document.getElementById('preview-content').innerHTML =
            '<div class="typst-compile-error">Typst Error:\n' + escHtml(String(e.message)) + '</div>';
        }
      } else {
        document.getElementById('preview-content').innerHTML =
          '<div class="render-error">Typst service initializing…</div>';
      }
      updatePreviewFooter();
      return;
    }

    const html = currentDocType === 'html' ? raw : marked.parse(raw);
    const container = document.getElementById('preview-content');
    if (currentViewMode !== 'wysiwyg' || !container.isContentEditable || !container.contains(document.activeElement)) {
      if (currentViewMode === 'wysiwyg') {
        container.classList.remove('paged-mode', 'doc-pages-container');
        container.innerHTML = html;
        _deExpandPageBreakComments(container);
        await fixPreviewImages(container);
      } else if (previewExactPdfMode && window.Desktop && Desktop.isElectron()) {
        await renderExactPdfInPane(container, html);
      } else {
        await deRenderPagedPreview(container, html);
      }
    }
  } catch (e) {
    document.getElementById('preview-content').innerHTML =
      '<div class="render-error">Render error: ' + escHtml(String(e.message)) + '</div>';
  }
  updatePreviewFooter();
}

function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(renderPreview, previewExactPdfMode ? 450 : 150);
}

function deCloneDefaultPageLayout() {
  return {
    ...DEFAULT_PAGE_LAYOUT,
    margins: { ...DEFAULT_PAGE_LAYOUT.margins }
  };
}

function deClampNumber(value, fallback, min, max) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  if (Number.isFinite(min)) return Math.max(min, Math.min(max, n));
  return n;
}

function deDetectMarginPreset(margins) {
  const m = margins || {};
  return Object.keys(MARGIN_PRESETS).find(k => {
    const p = MARGIN_PRESETS[k];
    return Math.abs((p.top || 0) - (m.top || 0)) < 0.2 &&
      Math.abs((p.right || 0) - (m.right || 0)) < 0.2 &&
      Math.abs((p.bottom || 0) - (m.bottom || 0)) < 0.2 &&
      Math.abs((p.left || 0) - (m.left || 0)) < 0.2;
  }) || null;
}

function deSanitizePageLayout(layout) {
  const base = deCloneDefaultPageLayout();
  const src = layout && typeof layout === 'object' ? layout : {};
  const sizes = Object.keys(PAGE_SIZES).concat('Custom');
  base.orientation = src.orientation === 'landscape' ? 'landscape' : 'portrait';
  base.size = sizes.includes(src.size) ? src.size : base.size;
  base.customW = deClampNumber(src.customW, base.customW, 50, 1200);
  base.customH = deClampNumber(src.customH, base.customH, 50, 1200);
  const sm = src.margins && typeof src.margins === 'object' ? src.margins : {};
  base.margins.top = deClampNumber(sm.top, base.margins.top, 0, 100);
  base.margins.right = deClampNumber(sm.right, base.margins.right, 0, 100);
  base.margins.bottom = deClampNumber(sm.bottom, base.margins.bottom, 0, 100);
  base.margins.left = deClampNumber(sm.left, base.margins.left, 0, 100);
  base.fontFamily = String(src.fontFamily || base.fontFamily);
  base.fontSize = deClampNumber(src.fontSize, base.fontSize, 6, 72);
  base.pageNumbers = !!src.pageNumbers;
  base.pageNumbersPos = ['left', 'center', 'right'].includes(src.pageNumbersPos) ? src.pageNumbersPos : 'center';
  base.footer = !!src.footer;
  base.footerText = String(src.footerText || '');
  base.footerAlign = ['left', 'center', 'right'].includes(src.footerAlign) ? src.footerAlign : 'center';
  base.imageWidth = ['auto', '100%', '75%', '50%'].includes(src.imageWidth) ? src.imageWidth : 'auto';
  return base;
}

function deClonePageLayout(layout) {
  const next = deSanitizePageLayout(layout);
  return {
    ...next,
    margins: { ...next.margins }
  };
}

function deParseCssStringValue(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch (e) { }
  }
  return value.replace(/^['"]|['"]$/g, '');
}

function deParseMmValue(raw, fallback) {
  const match = String(raw || '').trim().match(/-?\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : fallback;
}

function deCssVar(css, name) {
  const match = String(css || '').match(new RegExp('--' + name + '\\s*:\\s*([^;]+);', 'i'));
  return match ? match[1].trim() : null;
}

function deStripManagedLayoutCss(css) {
  const source = String(css || '');
  const start = source.indexOf(DE_LAYOUT_START);
  const end = source.indexOf(DE_LAYOUT_END);
  if (start === -1 || end === -1 || end < start) return source.trim();
  return (source.slice(0, start) + source.slice(end + DE_LAYOUT_END.length)).trim();
}

function deParsePageLayoutFromCss(css) {
  const source = String(css || '');
  const layout = deCloneDefaultPageLayout();
  const hasLayoutVars = source.includes('--cmt-page-size') || source.includes('--cmt-page-orientation');
  if (!hasLayoutVars) return { found: false, layout };

  layout.size = deParseCssStringValue(deCssVar(source, 'cmt-page-size')) || layout.size;
  layout.orientation = deParseCssStringValue(deCssVar(source, 'cmt-page-orientation')) || layout.orientation;
  layout.customW = deParseMmValue(deCssVar(source, 'cmt-page-custom-width'), layout.customW);
  layout.customH = deParseMmValue(deCssVar(source, 'cmt-page-custom-height'), layout.customH);
  layout.margins.top = deParseMmValue(deCssVar(source, 'cmt-page-margin-top'), layout.margins.top);
  layout.margins.right = deParseMmValue(deCssVar(source, 'cmt-page-margin-right'), layout.margins.right);
  layout.margins.bottom = deParseMmValue(deCssVar(source, 'cmt-page-margin-bottom'), layout.margins.bottom);
  layout.margins.left = deParseMmValue(deCssVar(source, 'cmt-page-margin-left'), layout.margins.left);
  layout.fontFamily = deParseCssStringValue(deCssVar(source, 'cmt-font-family')) || layout.fontFamily;
  layout.fontSize = deParseFloatValue(deCssVar(source, 'cmt-font-size'), layout.fontSize);
  layout.pageNumbers = deParseCssStringValue(deCssVar(source, 'cmt-page-numbers')) === 'true';
  layout.pageNumbersPos = deParseCssStringValue(deCssVar(source, 'cmt-page-numbers-pos')) || layout.pageNumbersPos;
  layout.footer = deParseCssStringValue(deCssVar(source, 'cmt-footer-enabled')) === 'true';
  layout.footerText = deParseCssStringValue(deCssVar(source, 'cmt-footer-text')) || '';
  layout.footerAlign = deParseCssStringValue(deCssVar(source, 'cmt-footer-align')) || layout.footerAlign;
  layout.imageWidth = deParseCssStringValue(deCssVar(source, 'cmt-image-width')) || layout.imageWidth;
  return { found: true, layout };
}

function deParseFloatValue(raw, fallback) {
  const match = String(raw || '').trim().match(/-?\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : fallback;
}

function deBuildManagedLayoutCss(layout) {
  const m = layout.margins || DEFAULT_PAGE_LAYOUT.margins;
  const sizeToken = layout.size === 'Custom'
    ? round1(layout.customW) + 'mm ' + round1(layout.customH) + 'mm'
    : layout.size;
  const pageSizeRule = layout.orientation === 'landscape'
    ? sizeToken + ' landscape'
    : sizeToken + ' portrait';
  const imageRule = layout.imageWidth && layout.imageWidth !== 'auto'
    ? ' width: ' + layout.imageWidth + ';\n max-width: 100%;\n height: auto;'
    : ' max-width: 100%;\n height: auto;';
  return [
    DE_LAYOUT_START,
    ':root {',
    ' --cmt-page-size: ' + JSON.stringify(layout.size || 'A4') + ';',
    ' --cmt-page-orientation: ' + JSON.stringify(layout.orientation || 'portrait') + ';',
    ' --cmt-page-custom-width: ' + round1(layout.customW || 210) + 'mm;',
    ' --cmt-page-custom-height: ' + round1(layout.customH || 297) + 'mm;',
    ' --cmt-page-margin-top: ' + round1(m.top) + 'mm;',
    ' --cmt-page-margin-right: ' + round1(m.right) + 'mm;',
    ' --cmt-page-margin-bottom: ' + round1(m.bottom) + 'mm;',
    ' --cmt-page-margin-left: ' + round1(m.left) + 'mm;',
    ' --cmt-font-family: ' + JSON.stringify(layout.fontFamily || "'Segoe UI', system-ui, sans-serif") + ';',
    ' --cmt-font-size: ' + (layout.fontSize || 11) + 'pt;',
    ' --cmt-page-numbers: ' + JSON.stringify(layout.pageNumbers ? 'true' : 'false') + ';',
    ' --cmt-page-numbers-pos: ' + JSON.stringify(layout.pageNumbersPos || 'center') + ';',
    ' --cmt-footer-enabled: ' + JSON.stringify(layout.footer ? 'true' : 'false') + ';',
    ' --cmt-footer-text: ' + JSON.stringify(layout.footerText || '') + ';',
    ' --cmt-footer-align: ' + JSON.stringify(layout.footerAlign || 'center') + ';',
    ' --cmt-image-width: ' + JSON.stringify(layout.imageWidth || 'auto') + ';',
    '}',
    '',
    '@page {',
    ' size: ' + pageSizeRule + ';',
    ' margin: ' + round1(m.top) + 'mm ' + round1(m.right) + 'mm ' + round1(m.bottom) + 'mm ' + round1(m.left) + 'mm;',
    '}',
    '',
    '.doc-preview {',
    ' font-family: ' + (layout.fontFamily || "'Segoe UI', system-ui, sans-serif") + ';',
    ' font-size: ' + (layout.fontSize || 11) + 'pt;',
    ' padding: ' + round1(m.top) + 'mm ' + round1(m.right) + 'mm ' + round1(m.bottom) + 'mm ' + round1(m.left) + 'mm;',
    '}',
    '',
    '.doc-preview img {',
    imageRule,
    '}',
    DE_LAYOUT_END
  ].join('\n');
}

function deComposeManagedStylesheet(css) {
  const userCss = deStripManagedLayoutCss(css);
  const parts = [deBuildManagedLayoutCss(pageLayout)];
  if (userCss) parts.push(userCss);
  return parts.join('\n\n').trim();
}

function deSetCssEditorValue(css, preserveModified) {
  const content = String(css || '');
  currentStylesheetName = '@inline@';
  deSyncingLayoutCss = true;
  if (cssEditor) cssEditor.setValue(content);
  deSyncingLayoutCss = false;
  const cssEl = document.getElementById('custom-css-style');
  if (cssEl) cssEl.textContent = deBuildScopedPreviewCss(content, '#preview-content');
  cssModified = !!preserveModified;
}

function deSyncCssEditorWithLayout(preserveModified) {
  const baseCss = cssEditor ? cssEditor.getValue() : '';
  const nextCss = deComposeManagedStylesheet(baseCss);
  if (cssEditor && nextCss === cssEditor.getValue()) {
    const cssEl = document.getElementById('custom-css-style');
    if (cssEl) cssEl.textContent = deBuildScopedPreviewCss(nextCss, '#preview-content');
    if (preserveModified) cssModified = true;
    return;
  }
  deSetCssEditorValue(nextCss, preserveModified);
}

// ── Managed inline script (Script Editor) ──────────────
const DE_INLINE_SCRIPT_ATTR = 'data-cmt-inline-script="true"';
let dePendingScriptText = '';

function deExtractScriptBlocks(content) {
  const scripts = [];
  const stripped = String(content || '').replace(/<script\b[^>]*data-cmt-inline-script="true"[^>]*>([\s\S]*?)<\/script>\s*/gi, function (m, js) {
    const text = String(js || '').split('<\\' + '/script').join('<' + '/script').trim();
    if (text) scripts.push(text);
    return '';
  });
  return { content: stripped, scriptText: scripts.join('\n\n') };
}

function deInjectInlineScript(content, scriptText) {
  const text = String(scriptText || '').trim();
  if (!text) return content;
  const tag = '<' + 'script ' + DE_INLINE_SCRIPT_ATTR + '>\n' + text.split('<' + '/script').join('<\\' + '/script') + '\n<' + '/script>';
  if (/<\/body>/i.test(content)) return content.replace(/<\/body>/i, function () { return tag + '\n</body>'; });
  return content + '\n' + tag;
}

function deSetScriptEditorValue(text) {
  deScriptTextCache = String(text || '');
  if (scriptEditor) { deScriptSetting = true; scriptEditor.setValue(deScriptTextCache); deScriptSetting = false; }
  scriptModified = false;
}

function deUpdateScriptEditorUi() {
  document.body.classList.toggle('de-doc-html', currentDocType === 'html');
}

function deExtractStyleBlocks(rawContent) {
  const dbSplit = (window.DeMiniDb && typeof DeMiniDb.extractFromContent === 'function')
    ? DeMiniDb.extractFromContent(rawContent)
    : { content: rawContent };
  const scriptSplit = deExtractScriptBlocks(dbSplit.content);
  dePendingScriptText = scriptSplit.scriptText;
  const content = scriptSplit.content;
  const styles = [];
  const stripped = String(content || '').replace(/<style\b[^>]*>([\s\S]*?)<\/style>\s*/gi, function (match, css) {
    const text = String(css || '').trim();
    if (text) styles.push(text);
    return '';
  });
  return {
    content: stripped.replace(/^\s+/, ''),
    cssText: styles.join('\n\n').trim()
  };
}

function deMergeCssText(primaryCss, secondaryCss) {
  const parts = [deStripManagedLayoutCss(primaryCss), deStripManagedLayoutCss(secondaryCss)]
    .map(part => String(part || '').trim())
    .filter(Boolean);
  return parts.join('\n\n').trim();
}

function deSplitSelectorList(selectorText) {
  const selectors = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;
  let inString = '';

  for (let i = 0; i < selectorText.length; i++) {
    const ch = selectorText[i];
    const prev = i > 0 ? selectorText[i - 1] : '';

    if (inString) {
      current += ch;
      if (ch === inString && prev !== '\\') inString = '';
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      current += ch;
      continue;
    }

    if (ch === '(') depthParen++;
    else if (ch === ')' && depthParen > 0) depthParen--;
    else if (ch === '[') depthBracket++;
    else if (ch === ']' && depthBracket > 0) depthBracket--;

    if (ch === ',' && depthParen === 0 && depthBracket === 0) {
      selectors.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  if (current) selectors.push(current);
  return selectors;
}

function deScopeSingleSelector(selector, scopeSelector) {
  const original = String(selector || '');
  const trimmed = original.trim();
  if (!trimmed) return original;
  if (trimmed.startsWith(scopeSelector)) return trimmed;

  // The scope element IS .doc-preview, so root-like tokens map onto it.
  const rootPrefix = /^(?:(?:html|body|:root|\.doc-preview)(?![\w-])\s*)+/i;
  const rm = trimmed.match(rootPrefix);
  if (rm) {
    const rest = trimmed.slice(rm[0].length);
    if (!rest) return scopeSelector + ', ' + scopeSelector + ' .doc-page-body';
    return scopeSelector + (/\s$/.test(rm[0]) ? ' ' : '') + rest;
  }

  return scopeSelector + ' ' + trimmed;
}

function deFindMatchingBrace(source, openIndex) {
  let depth = 0;
  let inString = '';
  let inComment = false;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : '';
    const prev = i > 0 ? source[i - 1] : '';

    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (ch === inString && prev !== '\\') inString = '';
      continue;
    }

    if (ch === '/' && next === '*') {
      inComment = true;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function deScopeCssForContainer(cssText, scopeSelector) {
  const source = String(cssText || '');

  function rewrite(blockSource) {
    let out = '';
    let i = 0;

    while (i < blockSource.length) {
      const open = blockSource.indexOf('{', i);
      if (open === -1) {
        out += blockSource.slice(i);
        break;
      }

      const pre = blockSource.slice(i, open);
      const close = deFindMatchingBrace(blockSource, open);
      if (close === -1) {
        out += blockSource.slice(i);
        break;
      }

      const body = blockSource.slice(open + 1, close);
      const headTrim = pre.trim();
      const atName = headTrim.match(/^@[-a-z]+/i);

      if (atName) {
        const name = atName[0].toLowerCase();
        if (name === '@media' || name === '@supports' || name === '@container' || name === '@layer' || name === '@document') {
          out += pre + '{' + rewrite(body) + '}';
        } else {
          out += pre + '{' + body + '}';
        }
      } else {
        const selectors = deSplitSelectorList(pre);
        const scoped = selectors
          .map(sel => deScopeSingleSelector(sel, scopeSelector))
          .join(', ');
        out += scoped + '{' + body + '}';
      }

      i = close + 1;
    }

    return out;
  }

  return rewrite(source);
}

function deBuildScopedPreviewCss(cssText, scopeSelector) {
  const userCss = deStripManagedLayoutCss(cssText);
  return deScopeCssForContainer(userCss, scopeSelector);
}

function deInjectInlineStyles(content, docType, css) {
  const bodyContent = deExtractStyleBlocks(content).content;
  const stylesheet = deComposeManagedStylesheet(css);
  const styleTag = '<style ' + DE_INLINE_STYLE_ATTR + '>\n' + stylesheet + '\n</style>';
  if (docType === 'html') {
    if (/<head\b[^>]*>/i.test(bodyContent)) {
      return bodyContent.replace(/<\/head>/i, styleTag + '\n</head>');
    }
    if (/<html\b[^>]*>/i.test(bodyContent)) {
      return bodyContent.replace(/<html\b[^>]*>/i, function (match) {
        return match + '\n<head>\n' + styleTag + '\n</head>';
      });
    }
    return styleTag + '\n' + bodyContent;
  }
  return styleTag + '\n\n' + bodyContent;
}

function deBuildPersistedCurrentDocContent() {
  if (currentViewMode === 'wysiwyg' && currentDocType === 'html' && typeof deSyncWysiwygToEditor === 'function') {
    deSyncWysiwygToEditor();
  }
  const savedPending = dePendingScriptText;
  const extracted = deExtractStyleBlocks(mdEditor ? mdEditor.getValue() : '');
  const embeddedScript = dePendingScriptText;
  dePendingScriptText = savedPending;
  const mergedCss = deMergeCssText(cssEditor ? cssEditor.getValue() : '', extracted.cssText);
  let out = deInjectInlineStyles(extracted.content, currentDocType, mergedCss);
  if (currentDocType === 'html') {
    const js = [embeddedScript, scriptEditor ? scriptEditor.getValue() : ''].filter(s => String(s).trim()).join('\n\n');
    out = deInjectInlineScript(out, js);
  }
  if (window.DeMiniDb && typeof DeMiniDb.injectIntoContent === 'function') {
    out = DeMiniDb.injectIntoContent(out, currentDocType);
  }
  return out;
}

async function deLoadLegacyManagedDocState(relativePath) {
  const legacy = { cssText: '', pageLayout: null };
  if (!window.Desktop || !Desktop.isElectron()) return legacy;
  try {
    const metaR = await Desktop.readByPath('docEditorDocs', relativePath + '.json');
    if (!metaR || !metaR.ok || !metaR.content) return legacy;
    const meta = JSON.parse(metaR.content);
    if (meta && meta.pageLayout) legacy.pageLayout = meta.pageLayout;
    if (meta && typeof meta.stylesheetContent === 'string' && meta.stylesheetContent.trim()) {
      legacy.cssText = meta.stylesheetContent;
      return legacy;
    }
    if (meta && meta.stylesheet) {
      const cssFromDocs = meta.stylesheetInDocs;
      const cssPath = cssFromDocs ? deJoinRelPath(deDirname(relativePath), meta.stylesheet) : meta.stylesheet;
      const target = cssFromDocs ? 'docEditorDocs' : 'docEditorStylesheets';
      const cssR = await Desktop.readByPath(target, cssPath).catch(() => null);
      if (cssR && cssR.ok && cssR.content) legacy.cssText = cssR.content;
    }
  } catch (e) { }
  return legacy;
}

async function deDeleteLegacyManagedArtifacts(filename, subdir) {
  if (!window.Desktop || !Desktop.isElectron()) return;
  const cssFilename = String(filename || '').replace(/\.(md|html)$/i, '') + '.css';
  const normalizedSubdir = subdir || null;
  await Desktop.deleteByPath('docEditorDocs', deJoinRelPath(normalizedSubdir || '', filename + '.json')).catch(() => { });
  await Desktop.deleteByPath('docEditorDocs', deJoinRelPath(normalizedSubdir || '', cssFilename)).catch(() => { });
}

function deApplyManagedDocState(cssText, fallbackLayout) {
  resetPageLayout();
  const parsed = deParsePageLayoutFromCss(cssText);
  if (parsed.found) {
    pageLayout = parsed.layout;
  } else if (fallbackLayout) {
    const fallback = deClonePageLayout(fallbackLayout);
    Object.assign(pageLayout, fallback);
    pageLayout.margins = { ...fallback.margins };
  }
  deSetCssEditorValue(deComposeManagedStylesheet(cssText), false);
  deSetScriptEditorValue(dePendingScriptText);
  dePendingScriptText = '';
  deUpdateScriptEditorUi();
  if (window.DeMiniDb && typeof DeMiniDb.applyPendingOrReset === 'function') {
    DeMiniDb.applyPendingOrReset();
  }
}

async function deSaveManagedDocSnapshot(target, filename, subdir) {
  const content = deBuildPersistedCurrentDocContent();
  const result = await Desktop.saveText(target, filename, content, subdir || null);
  if (result && result.ok) {
    cssModified = false; scriptModified = false;
    document.getElementById('custom-css-style').textContent = deBuildScopedPreviewCss(cssEditor ? cssEditor.getValue() : '', '#preview-content');
  }
  return result;
}

function deConfigureInlineStylesheetUi() {
  const sel = document.getElementById('stylesheet-select');
  if (sel) {
    sel.innerHTML = '<option value="@inline@">Inline style tag</option>';
    sel.value = '@inline@';
    sel.disabled = true;
  }
  ['btn-new-ss', 'btn-save-ss', 'btn-delete-ss'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
  });
}

// ── Insert text at editor cursor ──────────────────────────
function insertTextAtCursor(text) {
  if (!mdEditor) return;
  const sel = mdEditor.getSelection();
  mdEditor.executeEdits('user-insert', [{ range: sel, text, forceMoveMarkers: true }]);
  mdEditor.focus();
}

window.deAiEditorBridge = {
  getSelectionContext: function () {
    const winSel = window.getSelection ? window.getSelection() : null;
    const winText = winSel ? String(winSel.toString() || '').trim() : '';
    const monacoFocused = Boolean(mdEditor && typeof mdEditor.hasTextFocus === 'function' && mdEditor.hasTextFocus());

    if (monacoFocused && currentViewMode !== 'wysiwyg') {
      const sel = mdEditor.getSelection();
      if (sel && !sel.isEmpty()) {
        const txt = mdEditor.getModel().getValueInRange(sel).trim();
        if (txt) {
          return { text: txt, source: 'monaco', monacoRange: sel, wysiwygRange: null, anchorRect: null };
        }
      }
    }

    if (winText && winSel.rangeCount > 0) {
      const pc = document.getElementById('preview-content');
      const range = winSel.getRangeAt(0);
      let rect = null;
      try {
        const r = range.getBoundingClientRect();
        if (r && (r.width > 0 || r.height > 0)) rect = r;
      } catch (_) {}
      if (currentViewMode === 'wysiwyg' && currentDocType === 'html' && pc && pc.contains(winSel.anchorNode)) {
        return {
          text: winText,
          source: 'wysiwyg',
          monacoRange: null,
          wysiwygRange: range.cloneRange(),
          anchorRect: rect
        };
      }
      return {
        text: winText,
        source: 'preview',
        monacoRange: null,
        wysiwygRange: null,
        anchorRect: rect
      };
    }

    if (mdEditor && currentViewMode !== 'wysiwyg') {
      const sel = mdEditor.getSelection();
      if (sel && !sel.isEmpty()) {
        const txt = mdEditor.getModel().getValueInRange(sel).trim();
        if (txt) {
          return { text: txt, source: 'monaco', monacoRange: sel, wysiwygRange: null, anchorRect: null };
        }
      }
    }

    return { text: '', source: 'none', monacoRange: null, wysiwygRange: null, anchorRect: null };
  },
  insertAnswer: function (text, html) {
    if (currentViewMode === 'wysiwyg' && currentDocType === 'html') {
      const pc = document.getElementById('preview-content');
      if (pc) {
        pc.focus();
        try {
          document.execCommand('insertHTML', false, html || text);
        } catch (_) {
          pc.appendChild(document.createTextNode(text));
        }
        if (typeof deSyncWysiwygToEditor === 'function') deSyncWysiwygToEditor();
        return true;
      }
    }
    if (mdEditor) {
      insertTextAtCursor(text);
      return true;
    }
    return false;
  },
  replaceSelection: function (text, html, captured) {
    if (captured && captured.source === 'wysiwyg' && captured.wysiwygRange && currentViewMode === 'wysiwyg' && currentDocType === 'html') {
      const pc = document.getElementById('preview-content');
      const winSel = window.getSelection ? window.getSelection() : null;
      if (pc && winSel) {
        pc.focus();
        winSel.removeAllRanges();
        winSel.addRange(captured.wysiwygRange);
        try {
          document.execCommand('insertHTML', false, html || text);
        } catch (_) {
          captured.wysiwygRange.deleteContents();
          captured.wysiwygRange.insertNode(document.createTextNode(text));
        }
        if (typeof deSyncWysiwygToEditor === 'function') deSyncWysiwygToEditor();
        return true;
      }
    }
    if (captured && captured.source === 'monaco' && captured.monacoRange && mdEditor) {
      mdEditor.executeEdits('de-ai-replace', [{ range: captured.monacoRange, text: text, forceMoveMarkers: true }]);
      mdEditor.focus();
      return true;
    }
    return this.insertAnswer(text, html);
  }
};

window.deOpenUniversalImportModal = function () {
  if (typeof UniversalImporter === 'undefined') {
    if (typeof showToast === 'function') showToast('Universal Importer module is not loaded.', true);
    return;
  }

  const docPath = currentDocName ? (currentDocSubdir ? currentDocSubdir + '/' + currentDocName : currentDocName) : 'active';
  const hostUrn = 'cmt:doc:docEditorDocs/' + docPath;

  UniversalImporter.open({
    host: 'document-editor',
    hostUrn: hostUrn,
    autoLink: true,
    initialDomain: 'learning',
    initialSubType: 'wordbanks',
    onInsert: (selectedItems, chosenFormat, meta) => {
      const markdown = UniversalImporter.toMarkdown(selectedItems, chosenFormat, meta);
      insertTextAtCursor('\n' + markdown + '\n');
      if (typeof showToast === 'function') {
        showToast(`Inserted ${selectedItems.length} items into document.`);
      }
    }
  });
};

// ── Book text import ─────────────────────────────────────
