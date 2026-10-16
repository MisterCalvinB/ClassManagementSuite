/**
 * js/board-export-service.js - Universal Headless Export & Rendering Engine for Board Sessions
 * 
 * Provides centralized data-driven rendering of Board / Constellation sessions to:
 * 1. Vector SVG (infinitely scalable, crisp vector diagrams for 360 Dossier & embeds)
 * 2. Offscreen Canvas (pixel-perfect raster rendering for PNG exports & raster PDFs)
 * 3. Multi-page Board PDF Booklets (standalone PDF booklets & printable documents)
 * 4. Structured Vocabulary / Concept Tables (semantic HTML tables with embedded fonts)
 * 
 * Follows Light Neobrutalist design, export-standards (Open File / Folder / Doc Editor),
 * and supports standalone dual-execution (Electron printPdf and browser fallback).
 */

(function () {
  'use strict';

  var _cachedLexendCss = null;

  /**
   * Helper: Escape HTML special characters
   */
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Helper: Escape SVG XML special characters
   */
  function escapeXml(s) {
    return escapeHtml(s);
  }

  /**
   * Helper: Render KaTeX math formulas within a text string if katex is available
   */
  function renderMathInString(str) {
    if (!str) return '';
    var hasKatex = typeof window !== 'undefined' && typeof window.katex !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function';
    if (!/\$/.test(str)) {
      return /<[a-z][\s\S]*>/i.test(str) ? str : escapeHtml(str);
    }
    if (!hasKatex) {
      return /<[a-z][\s\S]*>/i.test(str) ? str : escapeHtml(str);
    }
    function replaceTex(raw) {
      // First display math $$...$$
      var s = raw.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) {
        try {
          return window.katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
        } catch (_) {
          return m;
        }
      });
      // Then inline math $...$
      s = s.replace(/\$([^\$\n\r]+?)\$/g, function (match, tex) {
        try {
          return window.katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
        } catch (_) {
          return match;
        }
      });
      return s;
    }

    if (/<[a-z][\s\S]*>/i.test(str) && typeof document !== 'undefined') {
      try {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = str;
        var walk = function (node) {
          Array.from(node.childNodes).forEach(function (child) {
            if (child.nodeType === 3) {
              if (/\$/.test(child.nodeValue)) {
                var span = document.createElement('span');
                span.innerHTML = replaceTex(child.nodeValue);
                child.replaceWith(span);
              }
            } else if (child.nodeType === 1 && !child.classList.contains('katex')) {
              walk(child);
            }
          });
        };
        walk(tempDiv);
        return tempDiv.innerHTML;
      } catch (_) {
        return replaceTex(str);
      }
    }

    return replaceTex(escapeHtml(str));
  }

  /**
   * Load and cache embedded Lexend WOFF2 fonts for offline PDF printing
   */
  async function getEmbeddedLexendFontsCss() {
    if (_cachedLexendCss) return _cachedLexendCss;
    var weights = [300, 400, 500, 600, 700];
    var css = '';
    var hasDesktop = typeof window.Desktop !== 'undefined' && window.Desktop && typeof window.Desktop.readByPath === 'function';

    if (hasDesktop) {
      for (var i = 0; i < weights.length; i++) {
        var weight = weights[i];
        try {
          var relPath = 'modules/lexend/lexend-latin-' + weight + '-normal.woff2';
          var r = await window.Desktop.readByPath('app', relPath, { encoding: 'base64' });
          if (r && r.ok && r.content) {
            css += '@font-face {\n  font-family: "Lexend";\n  font-weight: ' + weight + ';\n  font-style: normal;\n  src: url("data:font/woff2;base64,' + r.content + '") format("woff2");\n}\n';
          }
        } catch (e) {
          // fallback to standard font loading
        }
      }
    }

    if (!css) {
      css = '@import url("../modules/lexend/lexend.css");\n';
    }
    _cachedLexendCss = css;
    return css;
  }

  /**
   * Resolve export PDF settings (paper size, orientation, margins)
   */
  function getPdfExportSettings(options) {
    options = options || {};
    var cfg = (typeof window.CLASS_MANAGEMENT_CONFIG !== 'undefined' && window.CLASS_MANAGEMENT_CONFIG) ? window.CLASS_MANAGEMENT_CONFIG : {};
    var exp = cfg.export || {};

    var margin = options.margin || '16mm 14mm';
    if (!options.margin && exp.pdfMargin) {
      if (typeof exp.pdfMargin === 'string') margin = exp.pdfMargin;
      else if (typeof exp.pdfMargin === 'number') margin = exp.pdfMargin + 'mm';
      else if (typeof exp.pdfMargin === 'object') {
        var t = exp.pdfMargin.top || '16mm';
        var r = exp.pdfMargin.right || '14mm';
        var b = exp.pdfMargin.bottom || '16mm';
        var l = exp.pdfMargin.left || '14mm';
        margin = t + ' ' + r + ' ' + b + ' ' + l;
      }
    }

    var orientation = (options.orientation || exp.orientation || exp.pdfOrientation || 'landscape').toLowerCase();
    if (orientation !== 'landscape' && orientation !== 'portrait') orientation = 'landscape';

    var pageSize = (options.pageSize || exp.pageSize || exp.size || 'A4').trim();

    return {
      margin: margin,
      orientation: orientation,
      isLandscape: orientation === 'landscape',
      pageSize: pageSize
    };
  }

  /**
   * Normalize an incoming board data object or snapshot into a uniform data structure
   */
  function normalizeBoardData(raw) {
    if (!raw) {
      return { title: '', isMultiPage: false, nodes: [], edges: [], groups: [], shapes: [], notes: [], drawings: [], tables: [], media: [], boardBgColor: '#ffffff' };
    }

    // Handle JSON string input or JS assignments (e.g. window.BOARD_SESSION_EXPORT = ...)
    if (typeof raw === 'string') {
      var rawText = String(raw).replace(/^\uFEFF/, '').trim();
      try {
        raw = JSON.parse(rawText);
      } catch (_) {
        var stripped = rawText.replace(/^(\/\/[^\n]*\n?)+/, '').trim();
        var match = (stripped || rawText).match(/^(?:window\.[A-Za-z_$][\w$]*\s*=\s*|const\s+[A-Za-z_$][\w$]*\s*=\s*|let\s+[A-Za-z_$][\w$]*\s*=\s*|var\s+[A-Za-z_$][\w$]*\s*=\s*|export\s+default\s+)([\s\S]*?)\s*;?\s*$/);
        if (match) {
          try { raw = JSON.parse(match[1].trim()); } catch (e) {
            return { title: '', isMultiPage: false, nodes: [], edges: [], groups: [], shapes: [], notes: [], drawings: [], tables: [], media: [], boardBgColor: '#ffffff' };
          }
        } else {
          return { title: '', isMultiPage: false, nodes: [], edges: [], groups: [], shapes: [], notes: [], drawings: [], tables: [], media: [], boardBgColor: '#ffffff' };
        }
      }
    }

    // Handle API / archive result wrappers (e.g. { ok: true, boardData: ... }, { session: ... }, { data: ... })
    if (raw.boardData && typeof raw.boardData === 'object') return normalizeBoardData(raw.boardData);
    if (raw.session && typeof raw.session === 'object') return normalizeBoardData(raw.session);
    if (raw.data && typeof raw.data === 'object' && (raw.data.nodes || raw.data.pages || raw.data.words)) return normalizeBoardData(raw.data);
    if (raw.snapshot && typeof raw.snapshot === 'object') return normalizeBoardData(raw.snapshot);

    // If passed an array directly (e.g. conPageSnapshots.slice() or [page1, page2]):
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        return { title: '', isMultiPage: false, nodes: [], edges: [], groups: [], shapes: [], notes: [], drawings: [], tables: [], media: [], boardBgColor: '#ffffff' };
      }
      var flatPages = [];
      raw.forEach(function (p) {
        var normP = normalizeBoardData(p);
        if (normP.isMultiPage && Array.isArray(normP.pages)) {
          flatPages = flatPages.concat(normP.pages);
        } else {
          flatPages.push(normP);
        }
      });
      return {
        title: (raw[0] && (raw[0].title || raw[0].name)) || '',
        isMultiPage: true,
        pages: flatPages
      };
    }

    // If multi-page archive / session object: { pages: [ page1, ... ] }
    if (Array.isArray(raw.pages) && raw.pages.length > 0) {
      var flatPagesFromObj = [];
      raw.pages.forEach(function (p) {
        var normP = normalizeBoardData(p);
        if (normP.isMultiPage && Array.isArray(normP.pages)) {
          flatPagesFromObj = flatPagesFromObj.concat(normP.pages);
        } else {
          flatPagesFromObj.push(normP);
        }
      });
      return {
        title: raw.title || raw.name || '',
        isMultiPage: true,
        pages: flatPagesFromObj
      };
    }

    var nodes = Array.isArray(raw.nodes) ? raw.nodes : (Array.isArray(raw.words) ? raw.words : []);
    var edges = Array.isArray(raw.edges) ? raw.edges : (Array.isArray(raw.links) ? raw.links : (Array.isArray(raw.connections) ? raw.connections : []));
    var groups = Array.isArray(raw.groups) ? raw.groups : [];
    var shapes = Array.isArray(raw.shapes) ? raw.shapes : [];
    var notes = Array.isArray(raw.notes) ? raw.notes : [];
    var drawings = Array.isArray(raw.drawings) ? raw.drawings : [];
    var tables = Array.isArray(raw.tables) ? raw.tables : [];
    var media = Array.isArray(raw.media) ? raw.media : (Array.isArray(raw.mediaItems) ? raw.mediaItems : []);
    var masks = Array.isArray(raw.masks) ? raw.masks : [];
    var boardStickers = Array.isArray(raw.boardStickers) ? raw.boardStickers : [];

    return {
      title: raw.title || raw.name || '',
      isMultiPage: false,
      nodes: nodes,
      edges: edges,
      groups: groups,
      shapes: shapes,
      notes: notes,
      drawings: drawings,
      tables: tables,
      media: media,
      masks: masks,
      boardStickers: boardStickers,
      backgroundPdf: raw.backgroundPdf || null,
      boardBg: raw.boardBg || null,
      boardBgColor: raw.boardBgColor || raw.boardBackgroundColor || raw._conBoardBgColor || '#ffffff'
    };
  }

  /**
   * Helper: Parse positive numeric dimension from number, string ("250px"), or style property
   */
  function parseDim(val) {
    if (val == null || val === '') return 0;
    var num = typeof val === 'number' ? val : parseFloat(val);
    return (!isNaN(num) && num > 0) ? num : 0;
  }

  /**
   * Helper: Resolve accurate visual geometry for a node
   */
  function resolveNodeDims(n) {
    if (!n) return { w: 120, h: 40, fs: 16 };
    var rawW = parseDim(n.w) || parseDim(n.width) || parseDim(n._cachedW) || parseDim(n.offsetWidth) || parseDim(n.clientWidth) || (n.el ? (parseDim(n.el.offsetWidth) || parseDim(n.el.clientWidth)) : 0);
    var rawH = parseDim(n.h) || parseDim(n.height) || parseDim(n._cachedH) || parseDim(n.offsetHeight) || parseDim(n.clientHeight) || (n.el ? (parseDim(n.el.offsetHeight) || parseDim(n.el.clientHeight)) : 0);
    var fs = parseFloat(n.fontSize || n.fontPx || (n.fmt && n.fmt.fontSize)) || 16;
    var shape = String(n.shape || '').toLowerCase();
    var isSquareOrCircle = shape === 'circle' || shape === 'square';

    if (rawW > 0 && rawH > 0) {
      if (isSquareOrCircle) {
        var maxD = Math.max(rawW, rawH);
        return { w: maxD, h: maxD, fs: fs };
      }
      return { w: rawW, h: rawH, fs: fs };
    }

    var text = String(n.baseWord || n.text || n.title || n.label || '').trim();
    var rawLines = text ? text.split(/\/\/|\r?\n|<br\s*\/?>/i) : [''];
    var maxLineLen = 0;
    rawLines.forEach(function (l) { if (l.length > maxLineLen) maxLineLen = l.length; });

    // In Board, bold Lexend character width is ~0.68 * fontSize + 28px container padding + 4px border (32px total)
    var charW = fs * 0.68;
    var estimatedW = Math.max(48, Math.round(maxLineLen * charW + 32));
    var lineH = Math.max(16, Math.round(fs * 1.35));
    var estimatedH = Math.max(28, Math.round(rawLines.length * lineH + 16));

    if (n.relation === 'translation' || n.relation === 'ipa') estimatedW += 24;
    if (n.pageNum != null) estimatedW += 20;
    if (n.emoji) estimatedW += 16;

    var finalW = rawW > 0 ? rawW : estimatedW;
    var finalH = rawH > 0 ? rawH : estimatedH;

    if (isSquareOrCircle) {
      var maxDim = Math.max(finalW, finalH);
      finalW = maxDim;
      finalH = maxDim;
    }

    return { w: finalW, h: finalH, fs: fs };
  }

  /**
   * Helper: Resolve accurate visual geometry for a sticky note
   */
  function resolveNoteDims(nt) {
    if (!nt) return { w: 140, h: 80, fs: 16 };
    var rawW = parseDim(nt.w) || parseDim(nt.width) || parseDim(nt.liveBaseWidth) || parseDim(nt.styleWidth) || (nt.style ? parseDim(nt.style.width) : 0) || parseDim(nt._cachedW) || parseDim(nt.offsetWidth) || parseDim(nt.clientWidth) || (nt.el ? (parseDim(nt.el.offsetWidth) || parseDim(nt.el.clientWidth)) : 0);
    var rawH = parseDim(nt.h) || parseDim(nt.height) || parseDim(nt.liveBaseHeight) || parseDim(nt.styleHeight) || (nt.style ? parseDim(nt.style.height) : 0) || parseDim(nt._cachedH) || parseDim(nt.offsetHeight) || parseDim(nt.clientHeight) || (nt.el ? (parseDim(nt.el.offsetHeight) || parseDim(nt.el.clientHeight)) : 0);
    var fs = parseFloat(nt.fontSize || nt.fontPx || (nt.fmt && nt.fmt.fontSize)) || 16;

    if (rawW > 0 && rawH > 0) {
      return { w: rawW, h: rawH, fs: fs };
    }

    var text = String(nt.text || nt.content || nt.html || '').trim();
    var lines = text ? text.split(/\r?\n|<br\s*\/?>/i) : [''];
    var lineH = Math.max(16, Math.round(fs * 1.4));
    var estContentH = Math.max(40, lines.length * lineH + 16);

    // Never override non-zero dimensions with character-length presets
    var fallbackW = text.length > 60 ? 240 : (text.length > 25 ? 180 : 130);
    var fallbackH = Math.max(estContentH, text.length > 100 ? 120 : (text.length > 40 ? 80 : 50));

    var finalW = rawW > 0 ? rawW : fallbackW;
    var finalH = rawH > 0 ? rawH : fallbackH;
    return { w: finalW, h: finalH, fs: fs };
  }

  /**
   * 1. Vector SVG Rendering Engine
   * Converts a board session or snapshot directly into clean, scalable SVG vector XML.
   */
  function renderSessionToSvg(boardDataOrSnapshot, opts) {
    opts = opts || {};
    var data = normalizeBoardData(boardDataOrSnapshot);
    if (data.isMultiPage && Array.isArray(data.pages) && data.pages.length > 0) {
      if (opts.pageIndex != null && opts.pageIndex >= 0) {
        data = data.pages[opts.pageIndex] || data.pages[0];
      } else {
        // Pick the first page that contains active content, or fallback to page 0
        var foundPage = null;
        for (var pi = 0; pi < data.pages.length; pi++) {
          var pg = data.pages[pi];
          if ((pg.nodes && pg.nodes.length) || (pg.groups && pg.groups.length) || (pg.shapes && pg.shapes.length) || (pg.notes && pg.notes.length) || (pg.drawings && pg.drawings.length) || (pg.tables && pg.tables.length) || (pg.media && pg.media.length) || (pg.masks && pg.masks.length) || (pg.boardStickers && pg.boardStickers.length)) {
            foundPage = pg;
            break;
          }
        }
        data = foundPage || data.pages[0];
      }
    }

    var nodes = data.nodes || [];
    var edges = data.edges || [];
    var groups = data.groups || [];
    var shapes = data.shapes || [];
    var notes = data.notes || [];
    var drawings = data.drawings || [];
    var tables = data.tables || [];
    var media = data.media || [];
    var masks = data.masks || [];
    var boardStickers = data.boardStickers || [];

    var hasContent = (nodes && nodes.length > 0) ||
      (groups && groups.length > 0) ||
      (shapes && shapes.length > 0) ||
      (notes && notes.length > 0) ||
      (drawings && drawings.length > 0) ||
      (tables && tables.length > 0) ||
      (media && media.length > 0) ||
      (masks && masks.length > 0) ||
      (boardStickers && boardStickers.length > 0) ||
      (data.backgroundPdf && (data.backgroundPdf.relativePath || data.backgroundPdf.attachmentId));

    var customMaxH = opts.maxHeight ? ('max-height:' + opts.maxHeight + ';') : 'max-height:500px;';
    if (!hasContent) {
      if (opts.standalone) {
        return '<div class="pdf-mindmap-empty" style="padding:16px;text-align:center;font-size:9pt;color:#777;font-style:italic;border:1.5px dashed #ccc;border-radius:6px;background:#fafaf9;">Empty board session</div>';
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" class="bes-mindmap-svg" style="width:100%;height:auto;' + customMaxH + 'background:' + (data.boardBgColor || '#ffffff') + ';border:2px solid #333333;border-radius:8px;display:block;margin:8px 0;page-break-inside:avoid;break-inside:avoid;">\n' +
        '  <rect x="0" y="0" width="1000" height="650" fill="' + (data.boardBgColor || '#ffffff') + '" />\n' +
        '</svg>\n';
    }

    // Node lookup map
    var nodeMap = {};
    nodes.forEach(function (n) {
      var nid = n.id || (String(n.x) + '_' + String(n.y));
      nodeMap[nid] = n;
    });

    // Calculate bounds across all elements
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    function expand(x, y, w, h) {
      x = Number(x) || 0;
      y = Number(y) || 0;
      w = Math.max(1, Number(w) || 120);
      h = Math.max(1, Number(h) || 40);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }

    nodes.forEach(function (n) {
      var d = resolveNodeDims(n);
      expand(n.x, n.y, d.w, d.h);
    });
    groups.forEach(function (g) {
      var gw = Number(g.w || g.width || g.manualW || g._manualW) || 0;
      var gh = Number(g.h || g.height || g.manualH || g._manualH) || 0;
      if (!gw || !gh) {
        var memberNodes = (g.nodeIds || []).map(function (nid) { return nodeMap[nid]; }).filter(Boolean);
        if (memberNodes.length > 0) {
          var gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
          memberNodes.forEach(function (mn) {
            var mx = Number(mn.x) || 0, my = Number(mn.y) || 0;
            var md = resolveNodeDims(mn);
            var mw = md.w, mh = md.h;
            if (mx < gMinX) gMinX = mx;
            if (my < gMinY) gMinY = my;
            if (mx + mw > gMaxX) gMaxX = mx + mw;
            if (my + mh > gMaxY) gMaxY = my + mh;
          });
          var gPad = 20;
          g.x = gMinX - gPad;
          g.y = gMinY - gPad - 16;
          gw = (gMaxX - gMinX) + gPad * 2;
          gh = (gMaxY - gMinY) + gPad * 2 + 16;
        } else {
          gw = 280; gh = 180;
        }
      }
      g._resolvedW = gw;
      g._resolvedH = gh;
      expand(g.x, g.y, gw, gh);
    });
    notes.forEach(function (nt) {
      if (nt.hidden) return;
      var d = resolveNoteDims(nt);
      expand(nt.x, nt.y, d.w, d.h);
    });
    shapes.forEach(function (s) {
      if (s.type === 'line' || s.type === 'arrow') {
        expand(Math.min(s.lx1, s.lx2), Math.min(s.ly1, s.ly2), Math.abs(s.lx2 - s.lx1) || 20, Math.abs(s.ly2 - s.ly1) || 20);
      } else if (s.type === 'polygon' && Array.isArray(s.pts)) {
        s.pts.forEach(function (p) { expand(p.x, p.y, 10, 10); });
      } else {
        expand(s.x, s.y, s.w || s.width || 100, s.h || s.height || 80);
      }
    });
    drawings.forEach(function (d) {
      if (Array.isArray(d.points)) {
        d.points.forEach(function (p) {
          if (p) expand((d.x || 0) + p.x, (d.y || 0) + p.y, 4, 4);
        });
      }
    });
    tables.forEach(function (tbl) {
      var tw = tbl.colWidths ? tbl.colWidths.reduce(function (a, b) { return a + b; }, 0) : 240;
      var th = (tbl.rowHeights ? tbl.rowHeights.reduce(function (a, b) { return a + b; }, 0) : 100) + 24;
      expand(tbl.x, tbl.y, tw, th);
    });
    media.forEach(function (m) { expand(m.x, m.y, m.w || 200, m.h || 150); });
    masks.forEach(function (m) { expand(m.x, m.y, m.w || m.width || 120, m.h || m.height || 60); });
    boardStickers.forEach(function (st) { expand(st.x, st.y, st.size || 36, st.size || 36); });

    if (!isFinite(minX) || !isFinite(minY)) {
      minX = 0; minY = 0; maxX = 800; maxY = 500;
    }

    var pad = opts.padding != null ? opts.padding : 50;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    var width = Math.max(400, maxX - minX);
    var height = Math.max(300, maxY - minY);

    var markerId = 'bes-arrow-' + Math.random().toString(36).substring(2, 8);
    var customMaxH = opts.maxHeight ? ('max-height:' + opts.maxHeight + ';') : 'max-height:500px;';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + minX + ' ' + minY + ' ' + width + ' ' + height + '" class="bes-mindmap-svg" style="width:100%;height:auto;' + customMaxH + 'background:' + (data.boardBgColor || '#ffffff') + ';border:2px solid #333333;border-radius:8px;display:block;margin:8px 0;page-break-inside:avoid;break-inside:avoid;">\n' +
      '<defs>\n' +
      '  <marker id="' + markerId + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n' +
      '    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#333333" />\n' +
      '  </marker>\n' +
      '</defs>\n';

    // Background image
    if (data.boardBg) {
      var bgSrc = data.boardBg._cachedDataUrl || data.boardBg.dataUrl || '';
      if (!bgSrc && typeof window !== 'undefined' && typeof window.conFindAttachmentById === 'function' && data.boardBg.attachmentId) {
        var bgAtt = window.conFindAttachmentById(data.boardBg.attachmentId);
        if (bgAtt) {
          bgSrc = bgAtt._cachedDataUrl || bgAtt.dataUrl || (bgAtt.base64 ? ('data:' + (bgAtt.mime || 'image/png') + ';base64,' + bgAtt.base64) : (bgAtt._cachedObjectUrl || bgAtt.relativePath || ''));
        }
      }
      if (bgSrc) {
        svg += '  <image href="' + escapeXml(bgSrc) + '" x="' + minX + '" y="' + minY + '" width="' + width + '" height="' + height + '" preserveAspectRatio="none" opacity="0.9" />\n';
      }
    }

    // 1. Groups
    groups.forEach(function (g) {
      if (g.invisible) return;
      var gx = Number(g.x) || 0, gy = Number(g.y) || 0;
      var gw = Number(g._resolvedW || g.w || g.width || g.manualW || g._manualW) || 280;
      var gh = Number(g._resolvedH || g.h || g.height || g.manualH || g._manualH) || 180;
      var gColor = g.color || g.bg || '#f3f4f6';
      var gTitle = g.title || g.name || '';
      svg += '  <g class="bes-group">\n' +
        '    <rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" rx="8" fill="' + gColor + '" fill-opacity="0.3" stroke="#555555" stroke-width="2" stroke-dasharray="6,4" />\n';
      if (gTitle) {
        svg += '    <rect x="' + gx + '" y="' + gy + '" width="' + Math.min(gw, 180) + '" height="22" rx="4" fill="#333333" />\n' +
          '    <text x="' + (gx + 8) + '" y="' + (gy + 15) + '" fill="#ffffff" font-family="Lexend, sans-serif" font-size="10.5" font-weight="800">' + escapeXml(gTitle) + '</text>\n';
      }
      svg += '  </g>\n';
    });

    // 2. Media Widgets
    media.forEach(function (m) {
      if (m.hidden) return;
      var mx = Number(m.x) || 0, my = Number(m.y) || 0;
      var mw = Number(m.w) || 200, mh = Number(m.h) || 140;
      var mKind = String(m.kind || 'media').toLowerCase();
      var mName = m.name || (mKind.toUpperCase() + ' Document');

      var imgSrc = m.dataUrl || m.src || m.url || '';
      if (!imgSrc && m.base64) {
        imgSrc = 'data:' + (m.mime || 'image/png') + ';base64,' + m.base64;
      }
      if (!imgSrc && typeof window !== 'undefined') {
        if (typeof window.conFindAttachmentById === 'function' && m.attachmentId) {
          var att = window.conFindAttachmentById(m.attachmentId);
          if (att) {
            imgSrc = att.dataUrl || (att.data ? ('data:' + (att.mime || 'image/png') + ';base64,' + att.data) : (att.relativePath || ''));
          }
        }
        if (!imgSrc && typeof document !== 'undefined') {
          var domImg = document.querySelector('.con-media-item[data-id="' + m.id + '"] img') ||
            document.querySelector('img[data-attachment-id="' + m.attachmentId + '"]');
          if (domImg && domImg.src) imgSrc = domImg.src;
          var domCanvas = document.querySelector('.con-media-item[data-id="' + m.id + '"] canvas.con-media-pdf-canvas') ||
            document.querySelector('.con-media-item[data-id="' + m.id + '"] canvas');
          if (!imgSrc && domCanvas && typeof domCanvas.toDataURL === 'function') {
            try { imgSrc = domCanvas.toDataURL('image/png'); } catch (_) { }
          }
        }
      }

      var isImage = (mKind === 'pics' || mKind === 'image' || (m.mime && m.mime.startsWith('image/')) || (imgSrc && imgSrc.length > 5));

      if (isImage && imgSrc) {
        var clipId = 'bes-img-' + Math.random().toString(36).substring(2, 9);
        svg += '  <g class="bes-media">\n' +
          '    <defs>\n' +
          '      <clipPath id="' + clipId + '">\n' +
          '        <rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" rx="6" />\n' +
          '      </clipPath>\n' +
          '    </defs>\n' +
          '    <rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" rx="6" fill="#f8f9fa" stroke="#333333" stroke-width="1.5" />\n' +
          '    <image href="' + escapeXml(imgSrc) + '" x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" preserveAspectRatio="xMidYMid meet" clip-path="url(#' + clipId + ')" />\n' +
          '  </g>\n';
      } else {
        svg += '  <g class="bes-media">\n' +
          '    <rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" rx="6" fill="#f8f9fa" stroke="#333333" stroke-width="1.5" />\n' +
          '    <rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="24" rx="4" fill="#475569" />\n' +
          '    <text x="' + (mx + 8) + '" y="' + (my + 16) + '" fill="#ffffff" font-family="Lexend, sans-serif" font-size="10" font-weight="700">' + escapeXml(mKind.toUpperCase()) + ': ' + escapeXml(mName.slice(0, 24)) + '</text>\n' +
          '  </g>\n';
      }
    });

    // 3. Tables
    tables.forEach(function (tbl) {
      var tx = Number(tbl.x) || 0, ty = Number(tbl.y) || 0;
      var totalW = tbl.colWidths ? tbl.colWidths.reduce(function (a, b) { return a + b; }, 0) : 240;
      var totalH = (tbl.rowHeights ? tbl.rowHeights.reduce(function (a, b) { return a + b; }, 0) : 100) + 24;
      svg += '  <g class="bes-table">\n' +
        '    <rect x="' + tx + '" y="' + ty + '" width="' + totalW + '" height="' + totalH + '" rx="4" fill="#ffffff" stroke="#333333" stroke-width="1.5" />\n' +
        '    <rect x="' + tx + '" y="' + ty + '" width="' + totalW + '" height="22" fill="#f3f4f6" stroke="#333333" stroke-width="1" />\n' +
        '    <text x="' + (tx + 8) + '" y="' + (ty + 15) + '" fill="#444444" font-family="Lexend, sans-serif" font-size="10" font-weight="800">TABLE</text>\n';

      var curY = ty + 22;
      var rows = tbl.rows || 2;
      var cols = tbl.cols || 2;
      for (var r = 0; r < rows; r++) {
        var rh = (tbl.rowHeights && tbl.rowHeights[r]) ? tbl.rowHeights[r] : 32;
        var curX = tx;
        for (var c = 0; c < cols; c++) {
          var cw = (tbl.colWidths && tbl.colWidths[c]) ? tbl.colWidths[c] : 80;
          var cell = (tbl.cells && tbl.cells[r * cols + c]) ? tbl.cells[r * cols + c] : null;
          var cellText = cell ? (cell.text || (cell.nodeData ? cell.nodeData.baseWord : '')) : '';
          var cellBg = (cell && cell.bg) ? cell.bg : (r === 0 ? '#f9fafb' : '#ffffff');
          svg += '    <rect x="' + curX + '" y="' + curY + '" width="' + cw + '" height="' + rh + '" fill="' + cellBg + '" stroke="#e5e7eb" stroke-width="1" />\n';
          if (cellText) {
            svg += '    <text x="' + (curX + 6) + '" y="' + (curY + rh / 2 + 4) + '" fill="#111111" font-family="Lexend, sans-serif" font-size="9" font-weight="' + (r === 0 ? '700' : '400') + '">' + escapeXml(String(cellText).slice(0, 15)) + '</text>\n';
          }
          curX += cw;
        }
        curY += rh;
      }
      svg += '  </g>\n';
    });

    // 4. Freehand Drawings
    drawings.forEach(function (d) {
      if (!Array.isArray(d.points) || d.points.length < 2) return;
      var pts = d.points;
      var ox = Number(d.x) || 0, oy = Number(d.y) || 0;
      var pathD = 'M ' + (ox + pts[0].x) + ' ' + (oy + pts[0].y);
      for (var i = 1; i < pts.length; i++) {
        if (pts[i]) {
          pathD += ' L ' + (ox + pts[i].x) + ' ' + (oy + pts[i].y);
        }
      }
      var strokeColor = d.color || '#e53935';
      var strokeWidth = d.thickness || 3;
      var strokeOp = Number.isFinite(d.opacity) ? d.opacity : 1;
      svg += '  <path d="' + pathD + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '" stroke-opacity="' + strokeOp + '" stroke-linecap="round" stroke-linejoin="round" />\n';
    });

    // 5. Shapes
    shapes.forEach(function (s) {
      var sColor = s.color || '#333333';
      var sFill = s.fillColor && s.fillColor !== 'none' ? s.fillColor : 'none';
      var sThick = s.thickness || 2;
      var sOp = Number.isFinite(s.opacity) ? s.opacity : 1;
      var dash = s.dashStyle === 'dashed' ? 'stroke-dasharray="6,4"' : (s.dashStyle === 'dotted' ? 'stroke-dasharray="2,3"' : '');

      if (s.type === 'rect') {
        svg += '  <rect x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="4" fill="' + sFill + '" stroke="' + sColor + '" stroke-width="' + sThick + '" stroke-opacity="' + sOp + '" ' + dash + ' />\n';
      } else if (s.type === 'circle' || s.type === 'ellipse') {
        var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        svg += '  <ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (s.w / 2) + '" ry="' + (s.h / 2) + '" fill="' + sFill + '" stroke="' + sColor + '" stroke-width="' + sThick + '" stroke-opacity="' + sOp + '" ' + dash + ' />\n';
      } else if (s.type === 'diamond') {
        var dcx = s.x + s.w / 2, dcy = s.y + s.h / 2;
        var ptsStr = dcx + ',' + s.y + ' ' + (s.x + s.w) + ',' + dcy + ' ' + dcx + ',' + (s.y + s.h) + ' ' + s.x + ',' + dcy;
        svg += '  <polygon points="' + ptsStr + '" fill="' + sFill + '" stroke="' + sColor + '" stroke-width="' + sThick + '" stroke-opacity="' + sOp + '" ' + dash + ' />\n';
      } else if (s.type === 'line' || s.type === 'arrow') {
        var marker = s.type === 'arrow' ? ('marker-end="url(#' + markerId + ')"') : '';
        svg += '  <line x1="' + s.lx1 + '" y1="' + s.ly1 + '" x2="' + s.lx2 + '" y2="' + s.ly2 + '" stroke="' + sColor + '" stroke-width="' + sThick + '" stroke-opacity="' + sOp + '" ' + dash + ' ' + marker + ' />\n';
      } else if (s.type === 'polygon' && Array.isArray(s.pts) && s.pts.length >= 2) {
        var pStr = s.pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
        svg += '  <polygon points="' + pStr + '" fill="' + sFill + '" stroke="' + sColor + '" stroke-width="' + sThick + '" stroke-opacity="' + sOp + '" ' + dash + ' />\n';
      }
    });

    // 6. Edges / Connectors
    edges.forEach(function (e) {
      var fromNode = nodeMap[e.from || e.source || e.a];
      var toNode = nodeMap[e.to || e.target || e.b];
      if (fromNode && toNode) {
        var fnd = resolveNodeDims(fromNode);
        var fnW = fnd.w;
        var fnH = fnd.h;
        var tnd = resolveNodeDims(toNode);
        var tnW = tnd.w;
        var tnH = tnd.h;

        var fx = (Number(fromNode.x) || 0) + fnW / 2;
        var fy = (Number(fromNode.y) || 0) + fnH / 2;
        var tx = (Number(toNode.x) || 0) + tnW / 2;
        var ty = (Number(toNode.y) || 0) + tnH / 2;

        var dx = tx - fx;
        var cx1 = fx + dx * 0.35;
        var cy1 = fy;
        var cx2 = tx - dx * 0.35;
        var cy2 = ty;
        var edgeColor = e.strokeColor || e.color || '#475569';
        var edgeThick = Number(e.thickness) || 2;
        var edgeDash = e.strokeType === 'dashed' || e.dashStyle === 'dashed' ? 'stroke-dasharray="5,4"' : (e.strokeType === 'dotted' ? 'stroke-dasharray="2,3"' : '');
        var markerAttr = e.terminator !== 'none' ? ('marker-end="url(#' + markerId + ')"') : '';

        svg += '  <path d="M ' + fx + ' ' + fy + ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + tx + ' ' + ty + '" fill="none" stroke="' + edgeColor + '" stroke-width="' + edgeThick + '" ' + edgeDash + ' ' + markerAttr + ' />\n';

        if (e.label) {
          var mx = (fx + tx) / 2;
          var my = (fy + ty) / 2 - 4;
          svg += '  <text x="' + mx + '" y="' + my + '" fill="#334155" font-family="Lexend, sans-serif" font-size="9" font-weight="700" text-anchor="middle">' + escapeXml(e.label) + '</text>\n';
        }
      }
    });

    // 7. Nodes
    nodes.forEach(function (n) {
      var nx = Number(n.x) || 0, ny = Number(n.y) || 0;
      var dims = resolveNodeDims(n);
      var nw = dims.w;
      var nh = dims.h;
      var fs = dims.fs;
      var nBg = n.bg || n.bgColor || '#ffffff';
      var nStroke = n.border || n.borderColor || '#333333';
      var nStrokeW = n.borderWidth != null ? Number(n.borderWidth) : 2;
      var nText = n.baseWord || n.text || n.title || n.label || '';
      var nColor = n.color || n.textColor || '#111111';
      var shape = String(n.shape || '').toLowerCase();
      var isRound = shape === 'circle' || shape === 'oval' || shape === 'ellipse';
      var isDiamond = shape === 'diamond';
      var isSquare = shape === 'square';
      var rot = Number(n.rotation) || 0;

      var rotTransform = (rot && rot % 360 !== 0) ? (' transform="rotate(' + rot + ' ' + (nx + nw / 2) + ' ' + (ny + nh / 2) + ')"') : '';
      var strokeDash = n.borderStyle === 'dashed' ? 'stroke-dasharray="6,4"' : (n.borderStyle === 'dotted' ? 'stroke-dasharray="2,3"' : '');

      var ff = n.fontFamily || 'Lexend, "Segoe UI", Arial, sans-serif';
      var fw = ((n.fmt && n.fmt.bold) || n.bold || n.fontWeight === 'bold' || n.fontWeight === '700') ? '700' : '600';
      var fst = ((n.fmt && n.fmt.italic) || n.italic || n.fontStyle === 'italic') ? 'italic' : 'normal';
      var td = ((n.fmt && n.fmt.underline) || n.underline) ? 'text-decoration="underline"' : '';
      var lineH = Math.max(14, Math.round(fs * 1.3));

      var align = (n.textAlign || (n.fmt && (n.fmt.align || n.fmt.textAlign)) || (n.align) || 'center').toLowerCase();
      if (align !== 'left' && align !== 'right' && align !== 'center') align = 'center';
      var anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
      var padX = 10;
      var textX = anchor === 'middle' ? (nx + nw / 2) : (anchor === 'end' ? (nx + nw - padX) : (nx + padX));

      svg += '  <g class="bes-node"' + rotTransform + '>\n';

      // Highlight halo
      if (n.highlight) {
        if (isRound) {
          svg += '    <ellipse cx="' + (nx + nw / 2) + '" cy="' + (ny + nh / 2) + '" rx="' + (nw / 2 + 4) + '" ry="' + (nh / 2 + 4) + '" fill="none" stroke="' + n.highlight + '" stroke-width="4" opacity="0.85" />\n';
        } else if (isDiamond) {
          var dcx = nx + nw / 2, dcy = ny + nh / 2;
          svg += '    <polygon points="' + dcx + ',' + (ny - 4) + ' ' + (nx + nw + 4) + ',' + dcy + ' ' + dcx + ',' + (ny + nh + 4) + ' ' + (nx - 4) + ',' + dcy + '" fill="none" stroke="' + n.highlight + '" stroke-width="4" opacity="0.85" />\n';
        } else {
          svg += '    <rect x="' + (nx - 3) + '" y="' + (ny - 3) + '" width="' + (nw + 6) + '" height="' + (nh + 6) + '" rx="6" fill="none" stroke="' + n.highlight + '" stroke-width="4" opacity="0.85" />\n';
        }
      }

      // Shape background
      if (isRound) {
        svg += '    <ellipse cx="' + (nx + nw / 2) + '" cy="' + (ny + nh / 2) + '" rx="' + (nw / 2) + '" ry="' + (nh / 2) + '" fill="' + nBg + '" stroke="' + nStroke + '" stroke-width="' + nStrokeW + '" ' + strokeDash + ' />\n';
      } else if (isDiamond) {
        var dcx = nx + nw / 2, dcy = ny + nh / 2;
        var ptsStr = dcx + ',' + ny + ' ' + (nx + nw) + ',' + dcy + ' ' + dcx + ',' + (ny + nh) + ' ' + nx + ',' + dcy;
        svg += '    <polygon points="' + ptsStr + '" fill="' + nBg + '" stroke="' + nStroke + '" stroke-width="' + nStrokeW + '" ' + strokeDash + ' />\n';
      } else {
        var rxVal = isSquare ? 0 : 4;
        svg += '    <rect x="' + nx + '" y="' + ny + '" width="' + nw + '" height="' + nh + '" rx="' + rxVal + '" fill="' + nBg + '" stroke="' + nStroke + '" stroke-width="' + nStrokeW + '" ' + strokeDash + ' />\n';
      }

      // Phase 4: Shape Inscribed Bounds & ClipPaths
      // 1. Generate an SVG <clipPath> matching the exact node geometry
      var nodeClipId = 'bes-node-clip-' + Math.random().toString(36).substring(2, 9);
      svg += '    <defs>\n' +
        '      <clipPath id="' + nodeClipId + '">\n';
      if (isRound) {
        svg += '        <ellipse cx="' + (nx + nw / 2) + '" cy="' + (ny + nh / 2) + '" rx="' + (nw / 2) + '" ry="' + (nh / 2) + '" />\n';
      } else if (isDiamond) {
        var dcx = nx + nw / 2, dcy = ny + nh / 2;
        var ptsStr = dcx + ',' + ny + ' ' + (nx + nw) + ',' + dcy + ' ' + dcx + ',' + (ny + nh) + ' ' + nx + ',' + dcy;
        svg += '        <polygon points="' + ptsStr + '" />\n';
      } else {
        var rxVal = isSquare ? 0 : 4;
        svg += '        <rect x="' + nx + '" y="' + ny + '" width="' + nw + '" height="' + nh + '" rx="' + rxVal + '" />\n';
      }
      svg += '      </clipPath>\n' +
        '    </defs>\n';

      // 2. For diamond and circle shapes, scale the text container by sqrt(2)/2 ≈ 0.7071
      // so text fits cleanly inside the widest inscribed part of the shape.
      var shapeScale = (isDiamond || isRound) ? 0.7071 : 1.0;
      var tW = Math.max(20, Math.round(nw * shapeScale));
      var tH = Math.max(16, Math.round(nh * shapeScale));
      var tX = Math.round(nx + (nw - tW) / 2);
      var tY = Math.round(ny + (nh - tH) / 2);

      // Phase 3: Implement <foreignObject> for Word Nodes in renderSessionToSvg
      // Check if options.renderMode === 'vector' (Chromium / Electron print engine)
      var isVectorMode = (opts.renderMode === 'vector');
      var hasHtml = !!(n.html || (n.el && n.el.querySelector && n.el.querySelector('.katex, .wn-katex-inline, .wn-katex-display, i, b, strong, em, br, sub, sup')) || /<[a-z][\s\S]*>/i.test(nText));
      var hasMath = /\$|\\\(|\\\[/.test(nText) || (n.html && /\$|\\\(|\\\[/.test(n.html));
      var hasMultiLine = /\/\/|\r?\n|<br\s*\/?>/i.test(nText);
      var useForeignObject = isVectorMode && (hasHtml || hasMath || hasMultiLine || true);

      var align = (n.textAlign || (n.fmt && (n.fmt.align || n.fmt.textAlign)) || (n.align) || 'center').toLowerCase();
      if (align !== 'left' && align !== 'right' && align !== 'center') align = 'center';
      var justifyVal = align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start');

      if (useForeignObject) {
        var contentHtml = '';
        if (n.html) {
          contentHtml = renderMathInString(String(n.html));
        } else if (n.el && n.el.querySelector && n.el.querySelector('.katex, .wn-katex-inline, .wn-katex-display, i, b, strong, em, br, sub, sup')) {
          contentHtml = n.el.innerHTML;
        } else {
          var rawSegs = String(nText).split(/\/\/|\r?\n|<br\s*\/?>/i).map(function (s) { return s.trim(); });
          var processedSegs = rawSegs.map(function (seg) {
            return renderMathInString(seg);
          });
          contentHtml = processedSegs.join('<br/>');
        }

        var tdCss = td ? 'underline' : 'none';
        svg += '    <g class="bes-node-text-wrap" clip-path="url(#' + nodeClipId + ')">\n' +
          '      <foreignObject x="' + tX + '" y="' + tY + '" width="' + tW + '" height="' + tH + '">\n' +
          '        <div xmlns="http://www.w3.org/1999/xhtml" style="width:' + tW + 'px;height:' + tH + 'px;display:flex;align-items:center;justify-content:' + justifyVal + ';text-align:' + align + ';word-break:break-word;box-sizing:border-box;overflow:hidden;padding:0 2px;">\n' +
          '          <div style="width:100%;font-family:' + escapeXml(ff) + ';font-size:' + fs + 'px;font-weight:' + fw + ';font-style:' + fst + ';text-decoration:' + tdCss + ';color:' + nColor + ';line-height:1.25;text-align:' + align + ';word-break:break-word;overflow:hidden;">\n' +
          '            ' + contentHtml + '\n' +
          '          </div>\n' +
          '        </div>\n' +
          '      </foreignObject>\n' +
          '    </g>\n';
      } else {
        // Fallback to standard SVG <text> elements
        var rawLines = String(nText).split(/\/\/|\r?\n|<br\s*\/?>/i).map(function (s) { return s.trim(); });
        var lines = [];
        var availW = Math.max(20, tW - padX * 2);
        var avgCharW = fs * 0.58;
        var maxChars = Math.max(6, Math.floor(availW / avgCharW));
        rawLines.forEach(function (rawSeg) {
          if (rawSeg.length <= maxChars || !/\s+/.test(rawSeg)) {
            lines.push(rawSeg);
          } else {
            var words = rawSeg.split(/\s+/);
            var cur = '';
            words.forEach(function (w) {
              if ((cur + ' ' + w).trim().length > maxChars) {
                if (cur) lines.push(cur.trim());
                cur = w;
              } else {
                cur = cur ? (cur + ' ' + w) : w;
              }
            });
            if (cur) lines.push(cur.trim());
          }
        });
        if (!lines.length) lines = [''];

        var textAnchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
        var textAnchorX = textAnchor === 'middle' ? (tX + tW / 2) : (textAnchor === 'end' ? (tX + tW - padX) : (tX + padX));
        var startTextY = tY + (tH / 2) - ((lines.length - 1) * lineH / 2) + Math.round(fs * 0.35);

        svg += '    <g class="bes-node-text-wrap" clip-path="url(#' + nodeClipId + ')">\n';
        lines.forEach(function (lStr, lIdx) {
          svg += '      <text x="' + textAnchorX + '" y="' + (startTextY + lIdx * lineH) + '" fill="' + nColor + '" font-family="' + escapeXml(ff) + '" font-size="' + fs + '" font-weight="' + fw + '" font-style="' + fst + '" ' + td + ' text-anchor="' + textAnchor + '">' + escapeXml(lStr) + '</text>\n';
        });
        svg += '    </g>\n';
      }

      // Relation or page number badge
      var rel = String(n.relation || '').toLowerCase();
      if (rel === 'translation' || rel === 'ipa') {
        var badgeLabel = rel === 'translation' ? 'FR' : 'IPA';
        var badgeBg = rel === 'translation' ? '#e53935' : '#8e24aa';
        var badgeX = nx + nw - 22;
        var badgeY = ny + 3;
        svg += '    <rect x="' + badgeX + '" y="' + badgeY + '" width="18" height="12" rx="2" fill="' + badgeBg + '" />\n' +
          '    <text x="' + (badgeX + 9) + '" y="' + (badgeY + 9) + '" fill="#ffffff" font-family="Lexend, sans-serif" font-size="7.5" font-weight="800" text-anchor="middle">' + badgeLabel + '</text>\n';
      } else if (n.pageNum != null) {
        svg += '    <text x="' + (nx + nw - 4) + '" y="' + (ny + nh - 4) + '" fill="#888888" font-family="Lexend, sans-serif" font-size="8" font-weight="600" text-anchor="end">(' + n.pageNum + ')</text>\n';
      }

      // Emoji dot
      if (n.emoji) {
        svg += '    <text x="' + (nx + nw - 10) + '" y="' + (ny + 12) + '" font-size="11" text-anchor="middle">' + n.emoji + '</text>\n';
      }

      svg += '  </g>\n';
    });

    // 8. Sticky Notes
    notes.forEach(function (nt) {
      if (nt.hidden) return;
      var tx = Number(nt.x) || 0, ty = Number(nt.y) || 0;
      var dims = resolveNoteDims(nt);
      var tw = dims.w;
      var th = dims.h;
      var fs = dims.fs;
      var nBg = nt.bg || '#fef3c7';
      var nBorder = nt.borderColor || nt.border || '#d97706';
      var nBorderW = nt.borderWidth != null ? Number(nt.borderWidth) : 1.5;
      var nBorderDash = nt.borderStyle === 'dashed' ? 'stroke-dasharray="6,3"' : (nt.borderStyle === 'dotted' ? 'stroke-dasharray="2,3"' : '');

      var ff = nt.fontFamily || 'Lexend, "Segoe UI", Arial, sans-serif';
      var fw = nt.bold ? '700' : '400';
      var fst = nt.italic ? 'italic' : 'normal';
      var td = nt.underline ? 'underline' : (nt.strike ? 'line-through' : 'none');
      if (nt.wavy) td = 'underline';
      var tdStyle = nt.wavy ? 'text-decoration-style:wavy;' : '';

      var casing = String(nt.casing || '').toLowerCase();
      var textTransform = 'none';
      var fontVariant = 'normal';
      if (casing === 'uppercase') textTransform = 'uppercase';
      else if (casing === 'lowercase') textTransform = 'lowercase';
      else if (casing === 'titlecase') textTransform = 'capitalize';
      else if (casing === 'smallcaps') fontVariant = 'small-caps';

      var nTextColor = nt.textColor || nt.color || '#111111';
      if (nTextColor === nBg) nTextColor = '#111111';
      var lineH = Math.max(14, Math.round(fs * 1.4));
      var align = (nt.textAlign || (nt.fmt && nt.fmt.textAlign) || 'left').toLowerCase();
      if (align !== 'left' && align !== 'right' && align !== 'center') align = 'left';
      var anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');

      var padTop = 6, padRight = 12, padBottom = 10, padLeft = 8;

      var rawHtml = nt.html || '';
      var rawText = nt.text || nt.content || '';
      var cleanHtml = '';
      if (rawHtml) {
        cleanHtml = String(rawHtml).trim();
      } else if (rawText) {
        cleanHtml = escapeHtml(rawText).replace(/\r?\n/g, '<br/>');
      }

      // Process math formulas via KaTeX
      if (cleanHtml && typeof renderMathInString === 'function') {
        cleanHtml = renderMathInString(cleanHtml);
      }

      var hasBlockTags = /<(?:div|p|ul|ol|li|table|h[1-6])[\s\S]*>/i.test(cleanHtml);
      if (hasBlockTags) {
        cleanHtml = cleanHtml.replace(/(<\/(?:div|p|li|h[1-6])>)\s*[\r\n]+\s*(<(?:div|p|ul|ol|li|h[1-6]))/gi, '$1$2');
      }

      // Plain-text lines for fallback or pure SVG parsers
      var plainText = cleanHtml
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      var availW = Math.max(30, tw - padLeft - padRight);
      var avgCharW = fs * 0.58;
      var maxCharsPerLine = Math.max(8, Math.floor(availW / avgCharW));

      var paragraphs = plainText ? plainText.split(/\r?\n/) : [''];
      var allLines = [];
      paragraphs.forEach(function (para) {
        var trimmed = para.trim();
        if (!trimmed) { allLines.push(''); return; }
        if (trimmed.length <= maxCharsPerLine || !/\s+/.test(trimmed)) {
          allLines.push(trimmed);
        } else {
          var words = trimmed.split(/\s+/);
          var cur = '';
          words.forEach(function (w) {
            if ((cur + ' ' + w).trim().length > maxCharsPerLine) {
              if (cur) allLines.push(cur.trim());
              cur = w;
            } else {
              cur = cur ? (cur + ' ' + w) : w;
            }
          });
          if (cur) allLines.push(cur.trim());
        }
      });

      var clipId = 'bes-note-clip-' + Math.random().toString(36).substring(2, 9);
      svg += '  <g class="bes-note">\n' +
        '    <defs>\n' +
        '      <clipPath id="' + clipId + '">\n' +
        '        <rect x="' + tx + '" y="' + ty + '" width="' + tw + '" height="' + th + '" rx="6" />\n' +
        '      </clipPath>\n' +
        '    </defs>\n' +
        '    <rect x="' + tx + '" y="' + ty + '" width="' + tw + '" height="' + th + '" rx="6" fill="' + nBg + '" stroke="' + nBorder + '" stroke-width="' + nBorderW + '" ' + nBorderDash + ' />\n';

      // Use foreignObject for Chromium / Electron printPdf (preserves full rich HTML, KaTeX math, bullet lists, CSS word wrap)
      if (cleanHtml) {
        var wsStyle = hasBlockTags ? 'white-space:normal;' : 'white-space:pre-wrap;';
        var fontStyleAttr = 'font-family:' + escapeHtml(ff) + ';font-size:' + fs + 'px;font-weight:' + fw + ';font-style:' + fst + ';text-decoration:' + td + ';' + tdStyle + 'text-transform:' + textTransform + ';font-variant:' + fontVariant + ';text-align:' + align + ';color:' + nTextColor + ';';
        svg += '    <foreignObject x="' + tx + '" y="' + ty + '" width="' + tw + '" height="' + th + '" clip-path="url(#' + clipId + ')">\n' +
          '      <div xmlns="http://www.w3.org/1999/xhtml" class="bes-note-inner" style="width:' + tw + 'px;height:' + th + 'px;box-sizing:border-box;padding:' + padTop + 'px ' + padRight + 'px ' + padBottom + 'px ' + padLeft + 'px;' + fontStyleAttr + 'overflow:hidden;word-break:break-word;' + wsStyle + 'line-height:1.4;">' +
          '<style>.bes-note-inner p,.bes-note-inner div{margin:0;padding:0;}.bes-note-inner ul,.bes-note-inner ol{margin:0;padding-left:1.6em;box-sizing:border-box;}.bes-note-inner ul[data-checkbox-list="true"]{list-style:none;padding-left:0;}.bes-note-inner ul[data-checkbox-list="true"]>li{list-style:none;display:flex;align-items:center;}.bes-note-inner ul[data-checkbox-list="true"]>li>input[type="checkbox"]{margin:0 6px 0 0;vertical-align:middle;}</style>' +
          cleanHtml +
          '</div>\n' +
          '    </foreignObject>\n';
      } else {
        var textX = anchor === 'middle' ? (tx + tw / 2) : (anchor === 'end' ? (tx + tw - padRight) : (tx + padLeft));
        var startY = ty + padTop + fs;
        var maxLines = Math.max(1, Math.floor((th - padTop - padBottom) / lineH));

        allLines.forEach(function (l, i) {
          if (i < maxLines + 2) {
            svg += '    <text x="' + textX + '" y="' + (startY + i * lineH) + '" fill="' + nTextColor + '" font-family="' + escapeXml(ff) + '" font-size="' + fs + '" font-weight="' + fw + '" font-style="' + fst + '" text-decoration="' + td + '" text-anchor="' + anchor + '" clip-path="url(#' + clipId + ')">' + escapeXml(l) + '</text>\n';
          }
        });
      }

      // Emoji stickers attached to note
      if (Array.isArray(nt.emojiStickers) && nt.emojiStickers.length > 0) {
        nt.emojiStickers.forEach(function (st) {
          if (!st || !st.emoji) return;
          var sx = tx + (Number(st.x) || 0);
          var sy = ty + (Number(st.y) || 0);
          var sz = Number(st.size) || 28;
          svg += '    <text x="' + sx + '" y="' + (sy + sz * 0.85) + '" font-size="' + sz + '" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">' + st.emoji + '</text>\n';
        });
      }

      // Emoji dot
      if (nt.emoji) {
        svg += '    <text x="' + (tx + tw - 12) + '" y="' + (ty + 14) + '" font-size="12" text-anchor="middle">' + nt.emoji + '</text>\n';
      }

      svg += '  </g>\n';
    });

    // 9. Masks
    masks.forEach(function (m) {
      var mx = Number(m.x) || 0, my = Number(m.y) || 0;
      var mw = Number(m.w || m.width) || 120, mh = Number(m.h || m.height) || 60;
      var mColor = m.color || '#111111';
      var mOp = (m.opacity != null && Number.isFinite(Number(m.opacity))) ? Number(m.opacity) : 0.95;
      svg += '  <g class="bes-mask">\n' +
        '    <rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" rx="4" fill="' + mColor + '" opacity="' + mOp + '" />\n' +
        '  </g>\n';
    });

    // 10. Stickers
    boardStickers.forEach(function (st) {
      if (!st.emoji) return;
      var sx = Number(st.x) || 0, sy = Number(st.y) || 0;
      var sz = Number(st.size) || 36;
      svg += '  <text x="' + sx + '" y="' + (sy + sz * 0.85) + '" font-size="' + sz + '" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">' + st.emoji + '</text>\n';
    });

    svg += '</svg>\n';
    return svg;
  }

  /**
   * 2. Offscreen Canvas Raster Renderer
   * Renders the board session to an offscreen HTML5 canvas with device pixel ratio scaling.
   */
  async function renderSessionToCanvas(boardDataOrSnapshot, opts) {
    opts = opts || {};
    var data = normalizeBoardData(boardDataOrSnapshot);
    if (data.isMultiPage && Array.isArray(data.pages) && data.pages.length > 0) {
      if (opts.pageIndex != null && opts.pageIndex >= 0) {
        data = data.pages[opts.pageIndex] || data.pages[0];
      } else {
        var foundPage = null;
        for (var pi = 0; pi < data.pages.length; pi++) {
          var pg = data.pages[pi];
          if ((pg.nodes && pg.nodes.length) || (pg.groups && pg.groups.length) || (pg.shapes && pg.shapes.length) || (pg.notes && pg.notes.length) || (pg.drawings && pg.drawings.length) || (pg.tables && pg.tables.length) || (pg.media && pg.media.length)) {
            foundPage = pg;
            break;
          }
        }
        data = foundPage || data.pages[0];
      }
    }

    var nodes = data.nodes || [];
    var edges = data.edges || [];
    var groups = data.groups || [];
    var shapes = data.shapes || [];
    var notes = data.notes || [];
    var drawings = data.drawings || [];
    var tables = data.tables || [];
    var media = data.media || [];

    var maxX = 0, maxY = 0;
    nodes.forEach(function (n) {
      var d = resolveNodeDims(n);
      var rx = (n.x || 0) + d.w;
      var ry = (n.y || 0) + d.h;
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    });
    groups.forEach(function (g) {
      var rx = (g.x || 0) + (g.w || g.width || 280);
      var ry = (g.y || 0) + (g.h || g.height || 180);
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    });
    notes.forEach(function (nt) {
      if (nt.hidden) return;
      var d = resolveNoteDims(nt);
      var rx = (nt.x || 0) + d.w;
      var ry = (nt.y || 0) + d.h;
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    });
    shapes.forEach(function (s) {
      var rx = (s.x || 0) + (s.w || 100);
      var ry = (s.y || 0) + (s.h || 100);
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    });
    drawings.forEach(function (d) {
      if (Array.isArray(d.points)) {
        d.points.forEach(function (p) {
          if (p) {
            var rx = (d.x || 0) + p.x;
            var ry = (d.y || 0) + p.y;
            if (rx > maxX) maxX = rx;
            if (ry > maxY) maxY = ry;
          }
        });
      }
    });

    var bw = (maxX > 0) ? Math.max(800, maxX + 40) : 1000;
    var bh = (maxY > 0) ? Math.max(600, maxY + 40) : 700;
    var PAD = opts.padding || 30;
    var scale = opts.scale || Math.max(window.devicePixelRatio || 1, 2);

    var canvas = document.createElement('canvas');
    canvas.width = (bw + PAD * 2) * scale;
    canvas.height = (bh + PAD * 2) * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = data.boardBgColor || '#ffffff';
    ctx.fillRect(0, 0, bw + PAD * 2, bh + PAD * 2);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, bw + PAD * 2 - 2, bh + PAD * 2 - 2);

    // Groups
    groups.forEach(function (g) {
      if (g.invisible) return;
      var gx = PAD + (Number(g.x) || 0), gy = PAD + (Number(g.y) || 0);
      var gw = Number(g.w || g.width || 280), gh = Number(g.h || g.height || 180);
      ctx.fillStyle = g.color || g.bg || '#f3f4f6';
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillRect(gx, gy, gw, gh);
      ctx.restore();

      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.setLineDash([]);

      var gTitle = g.title || g.name || '';
      if (gTitle) {
        ctx.fillStyle = '#333333';
        ctx.fillRect(gx, gy, Math.min(gw, 160), 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10.5px "Lexend", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(gTitle.slice(0, 20), gx + 6, gy + 11);
      }
    });

    // Shapes
    shapes.forEach(function (s) {
      var sw = s.thickness || 2;
      var color = s.color || '#333333';
      var fill = s.fillColor && s.fillColor !== 'none' ? s.fillColor : 'none';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = sw;
      if (s.dashStyle === 'dashed') ctx.setLineDash([sw * 4, sw * 2]);
      else if (s.dashStyle === 'dotted') ctx.setLineDash([sw, sw * 2]);

      if (s.type === 'rect') {
        if (fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(PAD + s.x, PAD + s.y, s.w, s.h); }
        ctx.strokeRect(PAD + s.x, PAD + s.y, s.w, s.h);
      } else if (s.type === 'circle' || s.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(PAD + s.x + s.w / 2, PAD + s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
        if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); }
        ctx.stroke();
      } else if (s.type === 'line' || s.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(PAD + s.lx1, PAD + s.ly1);
        ctx.lineTo(PAD + s.lx2, PAD + s.ly2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Edges
    var nodeMap = {};
    nodes.forEach(function (n) { nodeMap[n.id || (String(n.x) + '_' + String(n.y))] = n; });
    edges.forEach(function (e) {
      var a = nodeMap[e.from || e.source || e.a];
      var b = nodeMap[e.to || e.target || e.b];
      if (a && b) {
        var ad = resolveNodeDims(a);
        var bd = resolveNodeDims(b);
        var ax = PAD + (a.x || 0) + ad.w / 2;
        var ay = PAD + (a.y || 0) + ad.h / 2;
        var bx = PAD + (b.x || 0) + bd.w / 2;
        var by = PAD + (b.y || 0) + bd.h / 2;

        ctx.strokeStyle = e.strokeColor || e.color || '#475569';
        ctx.lineWidth = Number(e.thickness) || 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    });

    // Media Widgets
    media.forEach(function (m) {
      if (m.hidden) return;
      var mx = PAD + (Number(m.x) || 0), my = PAD + (Number(m.y) || 0);
      var mw = Number(m.w) || 200, mh = Number(m.h) || 140;
      var mKind = String(m.kind || 'media').toUpperCase();
      var mName = m.name || (mKind + ' Document');

      ctx.save();
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx, my, mw, mh);

      ctx.fillStyle = '#475569';
      ctx.fillRect(mx, my, mw, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Lexend", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(mKind + ': ' + mName.slice(0, 24), mx + 8, my + 12);
      ctx.restore();
    });

    // Nodes
    nodes.forEach(function (n) {
      var nx = PAD + (n.x || 0), ny = PAD + (n.y || 0);
      var dims = resolveNodeDims(n);
      var nw = dims.w;
      var nh = dims.h;
      var fs = dims.fs;
      var bg = n.bg || n.bgColor || '#ffffff';
      var border = n.border || n.borderColor || '#333333';
      var text = n.baseWord || n.text || n.title || '';
      var textColor = n.color || n.textColor || '#111111';
      var shape = String(n.shape || '').toLowerCase();
      var isRound = shape === 'circle' || shape === 'oval' || shape === 'ellipse';
      var isDiamond = shape === 'diamond';
      var isSquare = shape === 'square';

      var ff = n.fontFamily || '"Lexend", "Segoe UI", Arial, sans-serif';
      var fw = ((n.fmt && n.fmt.bold) || n.bold || n.fontWeight === 'bold') ? 'bold' : '600';
      var fst = ((n.fmt && n.fmt.italic) || n.italic || n.fontStyle === 'italic') ? 'italic' : 'normal';
      var lineH = Math.max(14, Math.round(fs * 1.3));

      var align = (n.textAlign || (n.fmt && (n.fmt.align || n.fmt.textAlign)) || (n.align) || 'center').toLowerCase();
      if (align !== 'left' && align !== 'right' && align !== 'center') align = 'center';
      var anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
      var padX = 10;
      var textX = anchor === 'middle' ? (nx + nw / 2) : (anchor === 'end' ? (nx + nw - padX) : (nx + padX));

      ctx.save();
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = n.borderWidth != null ? Number(n.borderWidth) : 2;
      if (n.borderStyle === 'dashed') ctx.setLineDash([6, 4]);
      else if (n.borderStyle === 'dotted') ctx.setLineDash([2, 3]);

      if (isRound) {
        ctx.beginPath();
        ctx.ellipse(nx + nw / 2, ny + nh / 2, nw / 2, nh / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (isDiamond) {
        var dcx = nx + nw / 2, dcy = ny + nh / 2;
        ctx.beginPath();
        ctx.moveTo(dcx, ny);
        ctx.lineTo(nx + nw, dcy);
        ctx.lineTo(dcx, ny + nh);
        ctx.lineTo(nx, dcy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        var rxVal = isSquare ? 0 : 4;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(nx, ny, nw, nh, rxVal);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(nx, ny, nw, nh);
          ctx.strokeRect(nx, ny, nw, nh);
        }
      }
      ctx.setLineDash([]);

      ctx.fillStyle = textColor;
      ctx.font = fst + ' ' + fw + ' ' + fs + 'px ' + ff;
      ctx.textAlign = anchor === 'middle' ? 'center' : (anchor === 'end' ? 'right' : 'left');
      ctx.textBaseline = 'middle';

      var rawLines = String(text).split(/\/\/|\r?\n|<br\s*\/?>/i).map(function (s) { return s.trim(); });
      var lines = [];
      var availW = Math.max(30, nw - padX * 2);
      var avgCharW = fs * 0.58;
      var maxChars = Math.max(10, Math.floor(availW / avgCharW));
      rawLines.forEach(function (rawSeg) {
        if (rawSeg.length <= maxChars || !/\s+/.test(rawSeg)) {
          lines.push(rawSeg);
        } else {
          var words = rawSeg.split(/\s+/);
          var cur = '';
          words.forEach(function (w) {
            if ((cur + ' ' + w).trim().length > maxChars) {
              if (cur) lines.push(cur.trim());
              cur = w;
            } else {
              cur = cur ? (cur + ' ' + w) : w;
            }
          });
          if (cur) lines.push(cur.trim());
        }
      });
      if (!lines.length) lines = [''];

      var startTextY = ny + (nh / 2) - ((lines.length - 1) * lineH / 2);
      lines.forEach(function (lStr, lIdx) {
        ctx.fillText(lStr, textX, startTextY + lIdx * lineH);
      });

      // Relation badge
      var rel = String(n.relation || '').toLowerCase();
      if (rel === 'translation' || rel === 'ipa') {
        var badgeLabel = rel === 'translation' ? 'FR' : 'IPA';
        var badgeBg = rel === 'translation' ? '#e53935' : '#8e24aa';
        ctx.fillStyle = badgeBg;
        ctx.fillRect(nx + nw - 22, ny + 3, 18, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7.5px "Lexend", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(badgeLabel, nx + nw - 13, ny + 9);
      }

      if (n.emoji) {
        ctx.font = '12px "Segoe UI Emoji", Apple Color Emoji, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.emoji, nx + nw - 10, ny + 12);
      }
      ctx.restore();
    });

    // Sticky Notes
    notes.forEach(function (nt) {
      if (nt.hidden) return;
      var tx = PAD + (Number(nt.x) || 0), ty = PAD + (Number(nt.y) || 0);
      var dims = resolveNoteDims(nt);
      var tw = dims.w;
      var th = dims.h;
      var fs = dims.fs;
      var bg = nt.bg || nt.color || '#fef3c7';
      var border = nt.borderColor || nt.border || '#d97706';
      var textColor = nt.textColor || (nt.color && nt.color !== nt.bg ? nt.color : '#111111');

      var ff = nt.fontFamily || '"Lexend", "Segoe UI", Arial, sans-serif';
      var fw = nt.bold ? 'bold' : 'normal';
      var fst = nt.italic ? 'italic' : 'normal';
      var lineH = Math.max(14, Math.round(fs * 1.4));
      var align = (nt.textAlign || (nt.fmt && nt.fmt.textAlign) || 'left').toLowerCase();
      if (align !== 'left' && align !== 'right' && align !== 'center') align = 'left';

      var padTop = 6, padRight = 12, padBottom = 10, padLeft = 8;

      ctx.save();
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = nt.borderWidth || 1.5;
      if (nt.borderStyle === 'dashed') ctx.setLineDash([6, 3]);
      else if (nt.borderStyle === 'dotted') ctx.setLineDash([2, 3]);

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(tx, ty, tw, th, 6);
      } else {
        ctx.rect(tx, ty, tw, th);
      }
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      var nText = nt.text || nt.content || '';
      if (!nText && nt.html) {
        nText = String(nt.html)
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      }

      ctx.fillStyle = textColor;
      ctx.font = fst + ' ' + fw + ' ' + fs + 'px ' + ff;
      ctx.textAlign = align === 'center' ? 'center' : (align === 'right' ? 'right' : 'left');
      ctx.textBaseline = 'top';

      var availW = Math.max(30, tw - padLeft - padRight);
      var textX = align === 'center' ? (tx + tw / 2) : (align === 'right' ? (tx + tw - padRight) : (tx + padLeft));

      var paragraphs = String(nText).split(/\r?\n/);
      var allLines = [];
      paragraphs.forEach(function (para) {
        var trimmed = para.trim();
        if (!trimmed) { allLines.push(''); return; }
        var words = trimmed.split(/\s+/);
        var cur = '';
        words.forEach(function (w) {
          var testLine = cur ? (cur + ' ' + w) : w;
          var testW = ctx.measureText(testLine).width;
          if (testW > availW && cur) {
            allLines.push(cur);
            cur = w;
          } else {
            cur = testLine;
          }
        });
        if (cur) allLines.push(cur);
      });

      var maxLines = Math.max(1, Math.floor((th - padTop - padBottom) / lineH));
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(tx, ty, tw, th, 6);
      } else {
        ctx.rect(tx, ty, tw, th);
      }
      ctx.clip();
      allLines.forEach(function (l, i) {
        if (i < maxLines + 1) {
          ctx.fillText(l, textX, ty + padTop + i * lineH);
        }
      });
      ctx.restore();

      // Render attached emoji stickers on canvas
      if (Array.isArray(nt.emojiStickers) && nt.emojiStickers.length > 0) {
        nt.emojiStickers.forEach(function (st) {
          if (!st || !st.emoji) return;
          var sx = tx + (Number(st.x) || 0);
          var sy = ty + (Number(st.y) || 0);
          var sz = Number(st.size) || 28;
          ctx.save();
          ctx.font = sz + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
          ctx.fillText(st.emoji, sx, sy + sz * 0.85);
          ctx.restore();
        });
      }

      // Render emoji dot
      if (nt.emoji) {
        ctx.save();
        ctx.font = '12px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(nt.emoji, tx + tw - 12, ty + 14);
        ctx.restore();
      }

      ctx.restore();
    });

    // Freehand Drawings
    drawings.forEach(function (d) {
      if (!Array.isArray(d.points) || d.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = d.color || '#e53935';
      ctx.lineWidth = d.thickness || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(PAD + (d.x || 0) + d.points[0].x, PAD + (d.y || 0) + d.points[0].y);
      for (var i = 1; i < d.points.length; i++) {
        if (d.points[i]) ctx.lineTo(PAD + (d.x || 0) + d.points[i].x, PAD + (d.y || 0) + d.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Masks
    masks.forEach(function (m) {
      var mx = PAD + (Number(m.x) || 0), my = PAD + (Number(m.y) || 0);
      var mw = Number(m.w || m.width) || 120, mh = Number(m.h || m.height) || 60;
      var mColor = m.color || '#111111';
      var mOp = (m.opacity != null && Number.isFinite(Number(m.opacity))) ? Number(m.opacity) : 0.95;
      ctx.save();
      ctx.globalAlpha = mOp;
      ctx.fillStyle = mColor;
      ctx.fillRect(mx, my, mw, mh);
      ctx.restore();
    });

    // Stickers
    boardStickers.forEach(function (st) {
      if (!st.emoji) return;
      var sx = PAD + (Number(st.x) || 0), sy = PAD + (Number(st.y) || 0);
      var sz = Number(st.size) || 36;
      ctx.save();
      ctx.font = sz + 'px "Segoe UI Emoji", Apple Color Emoji, sans-serif';
      ctx.fillText(st.emoji, sx, sy + sz * 0.85);
      ctx.restore();
    });

    var dataUrl = canvas.toDataURL('image/png');
    return {
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      dataUrl: dataUrl
    };
  }

  /**
   * 3. Multi-page Board PDF Generation
   * Compiles one or more page snapshots into semantic printable HTML with embedded vector SVGs.
   */
  async function generatePagesPdfHtml(pagesOrSnapshot, options) {
    options = options || {};
    var lexendCss = await getEmbeddedLexendFontsCss();
    var pdfSettings = getPdfExportSettings(options);

    var norm = normalizeBoardData(pagesOrSnapshot);
    var pages = norm.isMultiPage ? norm.pages : [norm];
    var title = options.title || norm.title || 'board_export';

    // If multi-page, ignore trailing or intermediate empty pages unless all pages are empty
    if (pages.length > 1) {
      var activePages = pages.filter(function (p) {
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
      });
      if (activePages.length > 0) {
        pages = activePages;
      }
    }

    var isSnapshotMode = options.renderMode === 'snapshot' || !!options.useSnapshots;
    var snapshotImages = Array.isArray(options.snapshotImages) ? options.snapshotImages : null;

    var pagesHtml = '';
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var badgeText = pages.length > 1 ? ('[PAGE ' + (i + 1) + ' OF ' + pages.length + ']') : '[BOARD]';
      var snapUrl = (snapshotImages && snapshotImages[i]) || p.snapshotDataUrl || p._snapshotUrl || p.snapshotImage || null;

      if (isSnapshotMode && snapUrl) {
        pagesHtml += '<div class="pg">\n' +
          '  <div class="pg-hdr">\n' +
          '    <span class="pg-title">' + escapeHtml(title) + '</span>\n' +
          '    <span class="pg-badge">' + badgeText + '</span>\n' +
          '  </div>\n' +
          '  <img src="' + snapUrl + '" class="bes-mindmap-img" alt="Page ' + (i + 1) + '" style="flex:1;width:100%;max-height:calc(100vh - 46px);object-fit:contain;border:2px solid #333333;border-radius:8px;background:' + (p.boardBgColor || '#ffffff') + ';" />\n' +
          '</div>\n';
      } else {
        var svgStr = renderSessionToSvg(p, { maxHeight: 'calc(100vh - 46px)', padding: 40, renderMode: options.renderMode || 'vector' });
        pagesHtml += '<div class="pg">\n' +
          '  <div class="pg-hdr">\n' +
          '    <span class="pg-title">' + escapeHtml(title) + '</span>\n' +
          '    <span class="pg-badge">' + badgeText + '</span>\n' +
          '  </div>\n' +
          svgStr + '\n' +
          '</div>\n';
      }
    }

    var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n' +
      '<title>' + escapeHtml(title) + '</title>\n' +
      '<link rel="stylesheet" href="../modules/katex/dist/katex.min.css">\n' +
      '<style>\n' +
      lexendCss + '\n' +
      '@page { size: ' + pdfSettings.pageSize + ' ' + pdfSettings.orientation + '; margin: ' + pdfSettings.margin + '; }\n' +
      '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } button { display: none; } }\n' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      'body { font-family: "Lexend", "Segoe UI", Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; }\n' +
      '.pg { page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: flex-start; height: 100vh; max-height: 100vh; overflow: hidden; padding: 10px 0; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid; }\n' +
      '.pg:last-child { page-break-after: avoid; break-after: avoid; }\n' +
      '.pg-hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 10px; flex-shrink: 0; }\n' +
      '.pg-title { font-size: 13pt; font-weight: 800; text-transform: uppercase; color: #111; }\n' +
      '.pg-badge { font-size: 8pt; font-weight: 800; background: #3b82f6; color: #fff; padding: 2px 8px; border: 1.5px solid #333; border-radius: 4px; }\n' +
      '.bes-mindmap-svg, .bes-mindmap-img { flex: 1; width: 100%; max-height: calc(100vh - 46px); object-fit: contain; }\n' +
      '</style>\n</head>\n<body>\n' + pagesHtml + '</body>\n</html>';

    return html;
  }

  /**
   * Export Multi-page Board session to PDF via Desktop.printPdf or iframe fallback
   */
  async function exportPagesPdf(pagesOrSnapshot, options) {
    options = options || {};
    var title = options.title || 'board_export';
    var safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
    var defaultName = safeTitle + '.pdf';

    var html = await generatePagesPdfHtml(pagesOrSnapshot, options);
    var pdfSettings = getPdfExportSettings(options);

    if (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) {
      try {
        var destRes = null;
        if (typeof window.promptExportDestination === 'function') {
          destRes = await window.promptExportDestination({
            title: 'Export Board PDF',
            prompt: 'Where do you want to save the exported PDF?',
            filename: defaultName,
            allowDocEditor: false
          });
          if (!destRes || destRes.canceled) return { ok: false, canceled: true };
        }

        var targetFilename = (destRes && destRes.filename) ? destRes.filename : defaultName;
        var pdfReq = {
          html: html,
          landscape: pdfSettings.isLandscape,
          pdfOptions: {
            pageSize: pdfSettings.pageSize,
            landscape: pdfSettings.isLandscape,
            printBackground: true
          }
        };

        if (destRes && destRes.destination === 'to-print') {
          pdfReq.target = 'toPrint';
          pdfReq.filename = targetFilename;
        } else {
          pdfReq.defaultName = targetFilename;
        }

        var res = await window.Desktop.printPdf(pdfReq);
        if (res && res.ok) {
          if (typeof window.showToast === 'function') {
            window.showToast('Board PDF exported successfully: ' + (res.name || targetFilename));
          } else if (typeof window.mdbToast === 'function') {
            window.mdbToast('✓ Board PDF exported successfully: ' + (res.name || targetFilename));
          }
          if (typeof window.showExportSuccessPopup === 'function' && res.path) {
            window.showExportSuccessPopup(res.path, res.name || targetFilename);
          }
        } else if (res && !res.ok && !res.canceled) {
          if (typeof window.showToast === 'function') {
            window.showToast('Failed to export PDF: ' + (res.error || 'Unknown error'), true);
          } else if (typeof window.mdbToast === 'function') {
            window.mdbToast('⚠️ Failed to export PDF: ' + (res.error || 'Unknown error'));
          }
        }
        return res;
      } catch (err) {
        console.error('BoardExportService.exportPagesPdf error:', err);
        if (typeof window.mdbToast === 'function') {
          window.mdbToast('⚠️ Failed to export PDF: ' + (err && err.message ? err.message : String(err)));
        }
      }
    } else {
      // Browser fallback
      var iframe = document.getElementById('bes-export-pdf-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'bes-export-pdf-iframe';
        iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px';
        document.body.appendChild(iframe);
      }
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
      setTimeout(function () {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (_) { }
      }, 400);
    }
  }

  /**
   * Export Canvas Pages (high-fidelity rendered images) to PDF booklet
   * Captures pixel-perfect images, full notes, exact node labels, and rich elements.
   */
  async function exportCanvasPagesPdf(pagesInput, options) {
    options = options || {};
    var title = options.title || 'board_export';
    var safeTitle = title.replace(/[\\/:*?"<>|]/g, '_') || 'board_export';
    var defaultName = safeTitle + '.pdf';
    var pdfSettings = getPdfExportSettings(options);

    var dataUrls = [];
    if (Array.isArray(pagesInput)) {
      pagesInput.forEach(function (item) {
        if (typeof item === 'string') {
          dataUrls.push(item);
        } else if (item && typeof item.toDataURL === 'function') {
          dataUrls.push(item.toDataURL('image/png'));
        } else if (item && item.canvas && typeof item.canvas.toDataURL === 'function') {
          dataUrls.push(item.canvas.toDataURL('image/png'));
        } else if (item && item.dataUrl) {
          dataUrls.push(item.dataUrl);
        }
      });
    } else if (typeof pagesInput === 'string') {
      dataUrls.push(pagesInput);
    } else if (pagesInput && typeof pagesInput.toDataURL === 'function') {
      dataUrls.push(pagesInput.toDataURL('image/png'));
    }

    if (!dataUrls.length) {
      if (typeof window.mdbToast === 'function') window.mdbToast('⚠️ No pages available to export.');
      return;
    }

    var imgTags = dataUrls.map(function (url, i) {
      return '<div class="pg"><img src="' + url + '" alt="Page ' + (i + 1) + '" /></div>';
    }).join('\n');

    var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n' +
      '<title>' + escapeHtml(title) + '</title>\n' +
      '<style>\n' +
      '@page { size: ' + pdfSettings.pageSize + ' ' + pdfSettings.orientation + '; margin: 0; }\n' +
      '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }\n' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      'html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; }\n' +
      '.pg { width: 100vw; height: 100vh; page-break-after: always; break-after: page; display: flex; align-items: center; justify-content: center; overflow: hidden; box-sizing: border-box; padding: 0; margin: 0; }\n' +
      '.pg:last-child { page-break-after: avoid; break-after: avoid; }\n' +
      'img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; margin: auto; }\n' +
      '</style>\n</head>\n<body>\n' + imgTags + '\n</body>\n</html>';

    if (window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron()) {
      try {
        var destRes = null;
        if (typeof window.promptExportDestination === 'function') {
          destRes = await window.promptExportDestination({
            title: 'Export Board PDF',
            prompt: 'Where do you want to save the exported PDF?',
            filename: defaultName,
            allowDocEditor: false
          });
          if (!destRes || destRes.canceled) return;
        }

        var targetFilename = (destRes && destRes.filename) ? destRes.filename : defaultName;
        var pdfReq = {
          html: html,
          landscape: pdfSettings.isLandscape,
          pdfOptions: {
            pageSize: pdfSettings.pageSize,
            landscape: pdfSettings.isLandscape,
            printBackground: true
          }
        };

        if (destRes && destRes.destination === 'to-print') {
          pdfReq.target = 'toPrint';
          pdfReq.filename = targetFilename;
        } else {
          pdfReq.defaultName = targetFilename;
        }

        var res = await window.Desktop.printPdf(pdfReq);
        if (res && res.ok) {
          if (typeof window.showToast === 'function') {
            window.showToast('Board PDF exported successfully: ' + (res.name || targetFilename));
          } else if (typeof window.mdbToast === 'function') {
            window.mdbToast('✓ Board PDF exported successfully: ' + (res.name || targetFilename));
          }
          if (typeof window.showExportSuccessPopup === 'function' && res.path) {
            window.showExportSuccessPopup(res.path, res.name || targetFilename);
          }
        } else if (res && !res.ok && !res.canceled) {
          if (typeof window.showToast === 'function') {
            window.showToast('Failed to export PDF: ' + (res.error || 'Unknown error'), true);
          } else if (typeof window.mdbToast === 'function') {
            window.mdbToast('⚠️ Failed to export PDF: ' + (res.error || 'Unknown error'));
          }
        }
        return res;
      } catch (err) {
        console.error('BoardExportService.exportCanvasPagesPdf error:', err);
        if (typeof window.mdbToast === 'function') {
          window.mdbToast('⚠️ Failed to export PDF: ' + (err && err.message ? err.message : String(err)));
        }
      }
    } else {
      // Browser fallback
      var iframe = document.getElementById('bes-export-pdf-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'bes-export-pdf-iframe';
        iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px';
        document.body.appendChild(iframe);
      }
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(function () {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (_) { }
      }, 500);
    }
  }

  /**
   * 4. Vocabulary / Concepts Table HTML Generator
   * Produces semantic HTML with classes and stylesheet (NO inline styles per export-standards).
   */
  async function generateVocabTableHtml(nodesOrSnapshot, options) {
    options = options || {};
    var lexendCss = await getEmbeddedLexendFontsCss();
    var pdfSettings = getPdfExportSettings(options);

    var nodes = Array.isArray(nodesOrSnapshot) ? nodesOrSnapshot : (nodesOrSnapshot && nodesOrSnapshot.nodes ? nodesOrSnapshot.nodes : []);
    var title = options.title || 'vocabulary_list';

    var rows = [];
    nodes.forEach(function (n) {
      var word = (n.baseWord || n.text || '').trim();
      if (!word) return;
      var trans = n.translation || (n.fmt ? n.fmt.translation : '') || '';
      var ipa = n.ipa || (n.fmt ? n.fmt.ipa : '') || '';
      var def = n.definition || (n.fmt ? n.fmt.definition : '') || '';
      rows.push({ word: word, trans: trans, ipa: ipa, def: def });
    });

    var rowsHtml = '';
    rows.forEach(function (r, idx) {
      rowsHtml += '<tr class="vocab-row ' + (idx % 2 === 0 ? 'even' : 'odd') + '">\n' +
        '  <td class="col-word">' + escapeHtml(r.word) + '</td>\n' +
        '  <td class="col-trans">' + escapeHtml(r.trans) + '</td>\n' +
        '  <td class="col-ipa">' + escapeHtml(r.ipa) + '</td>\n' +
        '  <td class="col-def">' + escapeHtml(r.def) + '</td>\n' +
        '</tr>\n';
    });

    var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n' +
      '<title>' + escapeHtml(title) + '</title>\n' +
      '<style>\n' +
      lexendCss + '\n' +
      ':root { --border-c: #333333; --bg-head: #e2c96e; --bg-even: #ffffff; --bg-odd: #f8fafc; }\n' +
      '@page { size: ' + pdfSettings.pageSize + ' ' + pdfSettings.orientation + '; margin: ' + pdfSettings.margin + '; }\n' +
      '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }\n' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      'body { font-family: "Lexend", "Segoe UI", Arial, sans-serif; background: #fff; color: #111; padding: 20px; }\n' +
      '.vocab-header { border-bottom: 2.5px solid var(--border-c); padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: baseline; }\n' +
      '.vocab-title { font-size: 16pt; font-weight: 900; text-transform: uppercase; margin: 0; }\n' +
      '.vocab-count { font-size: 9pt; font-weight: 700; color: #555; }\n' +
      '.vocab-table { width: 100%; border-collapse: collapse; border: 2px solid var(--border-c); }\n' +
      '.vocab-table thead { display: table-header-group; }\n' +
      '.vocab-table th { background: var(--bg-head); color: #111; font-weight: 800; font-size: 9.5pt; text-align: left; padding: 8px 10px; border: 1.5px solid var(--border-c); text-transform: uppercase; }\n' +
      '.vocab-table td { padding: 6px 10px; font-size: 9pt; border: 1px solid #ccc; vertical-align: top; }\n' +
      '.vocab-table tr.even { background: var(--bg-even); }\n' +
      '.vocab-table tr.odd { background: var(--bg-odd); }\n' +
      '.vocab-table tr { page-break-inside: avoid; break-inside: avoid; }\n' +
      '.col-word { font-weight: 700; color: #000; width: 22%; }\n' +
      '.col-trans { color: #2563eb; width: 22%; font-weight: 600; }\n' +
      '.col-ipa { font-family: monospace; color: #64748b; width: 18%; }\n' +
      '.col-def { color: #334155; width: 38%; }\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="vocab-header">\n' +
      '  <h1 class="vocab-title">' + escapeHtml(title) + '</h1>\n' +
      '  <span class="vocab-count">' + rows.length + ' Concepts / Words</span>\n' +
      '</div>\n' +
      '<table class="vocab-table">\n' +
      '  <thead>\n' +
      '    <tr><th>Word</th><th>Translation</th><th>IPA</th><th>Definition</th></tr>\n' +
      '  </thead>\n' +
      '  <tbody>\n' +
      rowsHtml +
      '  </tbody>\n' +
      '</table>\n' +
      '</body>\n</html>';

    return html;
  }

  /**
   * Export Multi-page Board session using high-resolution raster snapshots
   */
  async function exportSnapshotPagesPdf(pagesOrSnapshot, options) {
    options = Object.assign({}, options, { renderMode: 'snapshot' });
    return exportPagesPdf(pagesOrSnapshot, options);
  }

  // Export to global window object
  window.BoardExportService = {
    renderSessionToSvg: renderSessionToSvg,
    renderSessionToCanvas: renderSessionToCanvas,
    generatePagesPdfHtml: generatePagesPdfHtml,
    exportPagesPdf: exportPagesPdf,
    exportSnapshotPagesPdf: exportSnapshotPagesPdf,
    exportCanvasPagesPdf: exportCanvasPagesPdf,
    generateVocabTableHtml: generateVocabTableHtml,
    getEmbeddedLexendFontsCss: getEmbeddedLexendFontsCss,
    getPdfExportSettings: getPdfExportSettings,
    normalizeBoardData: normalizeBoardData,
    resolveNodeDims: resolveNodeDims,
    resolveNoteDims: resolveNoteDims
  };

})();
