// Clipboard, DOCX, and ODT export/import IPC handlers extracted from electron-main.js
'use strict';

function registerDocExportIpc(ctx) {
  const {
    app,
    clipboard,
    dialog,
    ipcMain,
    fs,
    path,
    getSaveTargets
  } = ctx;

let _docxExporter = null;
function _getDocxExporter() {
  if (_docxExporter) return _docxExporter;
  const { Marked } = require('marked');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
          WidthType, BorderStyle, AlignmentType, ExternalHyperlink, ImageRun,
          LevelFormat, convertMillimetersToTwip, PageBreak, Footer, PageNumber } = require('docx');

  const _markedDocx = (() => {
    const m = new Marked({ gfm: true, breaks: true });
    m.use({ extensions: [
      { name: 'math-block', level: 'block',
        start(src) { return src.indexOf('$$'); },
        tokenizer(src) {
          const mt = src.match(/^\$\$([\s\S]+?)\$\$/);
          if (mt) return { type: 'math-block', raw: mt[0], math: mt[1].trim() };
        }
      },
      { name: 'math-inline', level: 'inline',
        start(src) { return src.indexOf('$'); },
        tokenizer(src) {
          if (src.startsWith('$$')) return;
          const mt = src.match(/^\$([^\$\n]+?)\$/);
          if (mt) return { type: 'math-inline', raw: mt[0], math: mt[1] };
        }
      }
    ]});
    return m;
  })();

  const MM2T = mm => Math.round(convertMillimetersToTwip(mm));

  function parseCssColor(str) {
    if (!str) return null;
    const s = str.trim();
    const h6 = s.match(/^#([0-9a-fA-F]{6})$/);  if (h6) return h6[1].toUpperCase();
    const h3 = s.match(/^#([0-9a-fA-F]{3})$/);  if (h3) return h3[1].split('').map(c=>c+c).join('').toUpperCase();
    const h8 = s.match(/^#([0-9a-fA-F]{8})$/);  if (h8) return h8[1].slice(0,6).toUpperCase();
    const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) return [rgb[1],rgb[2],rgb[3]].map(n=>parseInt(n).toString(16).padStart(2,'0')).join('').toUpperCase();
    const named = { black:'000000', white:'FFFFFF', red:'FF0000', blue:'0000FF', green:'008000',
                    gray:'808080', grey:'808080', navy:'000080', maroon:'800000', silver:'C0C0C0' };
    return named[s.toLowerCase()] || null;
  }

  function parseCssLineHeight(str) {
    if (!str) return null;
    const num = str.trim().match(/^(\d+\.?\d*)(?:em)?$/);
    if (num) return Math.round(parseFloat(num[1]) * 240);
    const pct = str.trim().match(/^(\d+\.?\d*)%$/);
    if (pct) return Math.round(parseFloat(pct[1]) / 100 * 240);
    return null;
  }

  function parseCssFontSize(str, fallback) {
    if (!str) return fallback;
    const pt  = str.match(/^(\d+\.?\d*)pt$/i);  if (pt)  return parseFloat(pt[1]);
    const px  = str.match(/^(\d+\.?\d*)px$/i);  if (px)  return Math.round(parseFloat(px[1]) * 0.75);
    const num = str.match(/^(\d+\.?\d*)$/);      if (num) return parseFloat(num[1]);
    return fallback;
  }

  const PAGE_SIZES_MM_DOCX = {
    A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 }, A5: { w: 148, h: 210 },
    Letter: { w: 215.9, h: 279.4 }, Legal: { w: 215.9, h: 355.6 }
  };

  function docxInlineRuns(tokens, ctx, extra = {}) {
    const out = [];
    for (const tok of tokens) {
      switch (tok.type) {
        case 'text': {
          if (tok.tokens && tok.tokens.length) {
            out.push(...docxInlineRuns(tok.tokens, ctx, extra));
          } else {
            const t = String(tok.text || tok.raw || '');
            if (t) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, ...extra, text: t }));
          }
          break;
        }
        case 'strong':
          out.push(...docxInlineRuns(tok.tokens || [], ctx, { ...extra, bold: true }));
          break;
        case 'em':
          out.push(...docxInlineRuns(tok.tokens || [], ctx, { ...extra, italics: true }));
          break;
        case 'del':
          out.push(...docxInlineRuns(tok.tokens || [], ctx, { ...extra, strike: true }));
          break;
        case 'codespan':
          out.push(new TextRun({ font: 'Courier New', size: Math.round(ctx.halfPt * 0.9), color: '24292E', ...extra, text: String(tok.text || tok.raw || '') }));
          break;
        case 'link': {
          try {
            const lr = docxInlineRuns(
              tok.tokens || [{ type: 'text', text: tok.text || '', raw: tok.text || '' }],
              ctx, { ...extra, color: '0969DA', underline: { type: 'single' } }
            );
            out.push(new ExternalHyperlink({ link: String(tok.href || '#'), children: lr }));
          } catch {
            const t = String(tok.text || '');
            if (t) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, ...extra, text: t }));
          }
          break;
        }
        case 'image': {
          const src = String(tok.href || '');
          let imgData = ctx.images && ctx.images[src];
          if (typeof imgData === 'string') {
            let b64 = imgData;
            if (b64.startsWith('data:')) {
              const comma = b64.indexOf(',');
              if (comma !== -1) b64 = b64.slice(comma + 1);
            }
            imgData = { data: b64, width: 600, height: 400 };
          }
          if (imgData && imgData.data) {
            const imgW = imgData.width || 600;
            const imgH = imgData.height || 400;
            const textPx = ctx.textWidthPx || 600;
            const mode = ctx.imageWidthMode || 'auto';
            let targetW;
            if (mode === '100%') {
              targetW = textPx;
            } else if (mode.endsWith('%')) {
              targetW = textPx * (parseFloat(mode) / 100);
            } else {
              targetW = Math.min(imgW, textPx);
            }
            const scale = targetW / imgW;
            const w = Math.max(1, Math.round(imgW * scale));
            const h = Math.max(1, Math.round(imgH * scale));
            try {
              out.push(new ImageRun({
                data: Buffer.isBuffer(imgData.data) ? imgData.data : Buffer.from(String(imgData.data), 'base64'),
                transformation: { width: w, height: h }
              }));
            } catch(imgErr) {
              const alt = String(tok.text || '');
              if (alt) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, italics: true, color: '888888', ...extra, text: '[' + alt + ']' }));
            }
          } else {
            const alt = String(tok.text || '');
            if (alt) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, italics: true, color: '888888', ...extra, text: '[' + alt + ']' }));
          }
          break;
        }
        case 'br':
          out.push(new TextRun({ break: 1 }));
          break;
        case 'escape': {
          const t = String(tok.text || '');
          if (t) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, ...extra, text: t }));
          break;
        }
        case 'math-inline':
          out.push(new TextRun({ font: 'Courier New', size: ctx.halfPt, color: '555555', ...extra, text: '$' + tok.math + '$' }));
          break;
        case 'html': {
          const plain = String(tok.raw || '').replace(/<[^>]+>/g, '');
          if (plain.trim()) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, ...extra, text: plain }));
          break;
        }
      }
    }
    return out;
  }

  function docxListItemRuns(itemTokens, ctx) {
    for (const tok of itemTokens) {
      if (tok.type === 'text' || tok.type === 'paragraph') {
        return docxInlineRuns(tok.tokens || [{ type: 'text', text: tok.text, raw: tok.text }], ctx, ctx.bodyRun);
      }
    }
    return [];
  }

  function docxListToBlocks(listTok, ctx, level) {
    const out = [];
    let orderedRef = null;
    if (listTok.ordered) {
      orderedRef = 'ol-' + (ctx.numConfigs.length + 1);
      ctx.numConfigs.push({
        reference: orderedRef,
        levels: [0, 1, 2, 3].map(l => ({
          level: l, format: LevelFormat.DECIMAL, text: '%' + (l + 1) + '.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: MM2T(10 + l * 10), hanging: MM2T(6) } } }
        }))
      });
    }
    for (const item of listTok.items) {
      const runs = docxListItemRuns(item.tokens || [], ctx);
      out.push(new Paragraph({
        children: runs.length ? runs : [new TextRun({ text: '', font: ctx.font })],
        ...(listTok.ordered
          ? { numbering: { reference: orderedRef, level } }
          : { bullet: { level } }),
        ...(ctx.lineSpacing ? { spacing: { line: ctx.lineSpacing, lineRule: 'auto' } } : {})
      }));
      for (const sub of item.tokens || []) {
        if (sub.type === 'list') out.push(...docxListToBlocks(sub, ctx, level + 1));
      }
    }
    return out;
  }

  function docxBlockTokens(tokens, ctx, bq = false) {
    const borderSpec = { style: BorderStyle.SINGLE, size: 4, color: 'DFE2E5' };
    const out = [];
    for (const tok of tokens) {
      switch (tok.type) {
        case 'space': break;
        case 'heading': {
          // Sizes (half-points) and bold matching the preview CSS em scaling
          const hLevels   = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
                             HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
          const hScale    = [2.0, 1.5, 1.17, 1.0, 1.0, 1.0];
          const hBold     = [true, true, true, true, false, false];
          const hBefore   = [320, 280, 240, 200, 160, 160];
          const hAfter    = [80,  80,  60,  60,  40,  40];
          const d = Math.min(tok.depth - 1, 5);
          const hSize = Math.round(ctx.halfPt * hScale[d]);
          // Headings use explicit bold+size but inherit font; no body color override
          const runExtra = { bold: hBold[d], size: hSize };
          const hSpacing = { before: hBefore[d], after: hAfter[d] };
          if (ctx.lineSpacing) { hSpacing.line = ctx.lineSpacing; hSpacing.lineRule = 'auto'; }
          const paraProps = {
            heading: hLevels[d],
            children: docxInlineRuns(tok.tokens || [], ctx, runExtra),
            spacing: hSpacing
          };
          if (d < 2) {
            paraProps.border = { bottom: { style: BorderStyle.SINGLE, size: d === 0 ? 8 : 4, color: 'EEEEEE', space: 4 } };
          }
          out.push(new Paragraph(paraProps));
          break;
        }
        case 'paragraph': {
          const pSpacing = bq ? { before: 40, after: 40 } : { after: 200 };
          if (ctx.lineSpacing) { pSpacing.line = ctx.lineSpacing; pSpacing.lineRule = 'auto'; }
          const tokTokens = tok.tokens || [];
          const isImageOnly = tokTokens.length === 1 && tokTokens[0].type === 'image';
          const props = {
            children: docxInlineRuns(tokTokens, ctx, ctx.bodyRun),
            spacing: pSpacing
          };
          if (bq) {
            props.indent = { left: MM2T(8) };
            props.border = { left: { style: BorderStyle.SINGLE, size: 12, color: 'DFE2E5', space: 6 } };
          }
          if (isImageOnly) props.alignment = AlignmentType.CENTER;
          out.push(new Paragraph(props));
          break;
        }
        case 'blockquote':
          out.push(...docxBlockTokens(tok.tokens || [], ctx, true));
          break;
        case 'code': {
          const lines = String(tok.text).split('\n');
          const runs = [];
          for (let i = 0; i < lines.length; i++) {
            if (i > 0) runs.push(new TextRun({ break: 1 }));
            runs.push(new TextRun({ text: lines[i] || '', font: 'Courier New', size: Math.round(ctx.halfPt * 0.9), color: '24292E' }));
          }
          out.push(new Paragraph({
            children: runs,
            shading: { type: 'clear', color: 'auto', fill: 'F6F8FA' },
            border: {
              top:    { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
              left:   { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
              right:  { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
            },
            indent: { left: MM2T(4), right: MM2T(4) },
            spacing: { before: 160, after: 160 }
          }));
          break;
        }
        case 'list':
          out.push(...docxListToBlocks(tok, ctx, 0));
          break;
        case 'table': {
          const nCols = tok.header.length;
          const colPct = Math.floor(10000 / nCols);
          out.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { top: borderSpec, bottom: borderSpec, left: borderSpec, right: borderSpec,
                       insideH: borderSpec, insideV: borderSpec },
            rows: [
              new TableRow({
                tableHeader: true,
                children: tok.header.map(cell => new TableCell({
                  width: { size: colPct, type: WidthType.PERCENTAGE },
                  shading: { type: 'clear', color: 'auto', fill: 'F6F8FA' },
                  children: [new Paragraph({
                    children: docxInlineRuns(cell.tokens || [], ctx, { ...ctx.bodyRun, bold: true }),
                    alignment: cell.align === 'center' ? AlignmentType.CENTER : cell.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT
                  })]
                }))
              }),
              ...tok.rows.map(row => new TableRow({
                children: row.map(cell => new TableCell({
                  width: { size: colPct, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: docxInlineRuns(cell.tokens || [], ctx, ctx.bodyRun),
                    alignment: cell.align === 'center' ? AlignmentType.CENTER : cell.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT
                  })]
                }))
              }))
            ]
          }));
          break;
        }
        case 'hr':
          out.push(new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'EEEEEE', space: 4 } },
            spacing: { before: 240, after: 240 }
          }));
          break;
        case 'html': {
          const rawHtml = String(tok.raw || '');
          const withBreaks = rawHtml
            .replace(/<br\s*\/?>\s*\n?/gi, '\n')
            .replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n')
            .replace(/<\/h[1-6]>/gi, '\n').replace(/<\/li>/gi, '\n');
          const plain = withBreaks.replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
            .trim();
          if (plain) {
            for (const block of plain.split(/\n{2,}/)) {
              const lines = block.trim().split('\n').filter(l => l.trim());
              if (!lines.length) continue;
              const runs = [];
              for (let i = 0; i < lines.length; i++) {
                if (i > 0) runs.push(new TextRun({ break: 1 }));
                runs.push(new TextRun({ font: ctx.font, size: ctx.halfPt, ...ctx.bodyRun, text: lines[i].trim() }));
              }
              const pSpacing = { after: 200 };
              if (ctx.lineSpacing) { pSpacing.line = ctx.lineSpacing; pSpacing.lineRule = 'auto'; }
              out.push(new Paragraph({ children: runs, spacing: pSpacing }));
            }
          }
          break;
        }
        case 'math-block':
          out.push(new Paragraph({
            children: [new TextRun({ text: '$$' + tok.math + '$$', font: 'Courier New', size: ctx.halfPt, color: '555555' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 160 }
          }));
          break;
      }
    }
    return out;
  }

  function docxAlign(a) {
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.JUSTIFIED;
    return AlignmentType.LEFT;
  }

  function docxRunsFromAst(runs, ctx, extra = {}) {
    const out = [];
    const linkCol = parseCssColor(ctx.styles?.link?.color) || '0969DA';
    const codeBg = parseCssColor(ctx.styles?.code?.bg) || 'F6F8FA';
    const codeCol = parseCssColor(ctx.styles?.code?.color) || '24292E';
    const codeFont = ctx.styles?.code?.fontFamily ? String(ctx.styles.code.fontFamily).split(',')[0].trim().replace(/^['"]|['"]$/g, '') : 'Courier New';
    for (const r of (runs || [])) {
      if (r.type === 'br') { out.push(new TextRun({ break: 1 })); continue; }
      if (r.type === 'image') {
        const src = String(r.src || '');
        let imgData = ctx.images && ctx.images[src];
        if (typeof imgData === 'string') {
          let b64 = imgData;
          if (b64.startsWith('data:')) { const c = b64.indexOf(','); if (c !== -1) b64 = b64.slice(c + 1); }
          imgData = { data: b64, width: 600, height: 400 };
        }
        if (imgData && imgData.data) {
          const imgW = imgData.width || 600;
          const imgH = imgData.height || 400;
          const textPx = ctx.textWidthPx || 600;
          const mode = ctx.imageWidthMode || 'auto';
          let targetW = mode === '100%' ? textPx : (mode.endsWith('%') ? textPx * (parseFloat(mode) / 100) : Math.min(imgW, textPx));
          if (r.width && /^\d+(px)?$/.test(String(r.width))) targetW = Math.min(parseFloat(r.width), textPx);
          const scale = targetW / imgW;
          const w = Math.max(1, Math.round(imgW * scale));
          const h = Math.max(1, Math.round(imgH * scale));
          try {
            out.push(new ImageRun({
              data: Buffer.isBuffer(imgData.data) ? imgData.data : Buffer.from(String(imgData.data), 'base64'),
              transformation: { width: w, height: h }
            }));
            continue;
          } catch (_) {}
        }
        if (r.alt) out.push(new TextRun({ font: ctx.font, size: ctx.halfPt, italics: true, color: '888888', ...extra, text: '[' + r.alt + ']' }));
        continue;
      }
      if (r.type === 'link') {
        try {
          const lr = docxRunsFromAst(r.runs || [], ctx, { ...extra, color: linkCol, underline: { type: 'single' } });
          out.push(new ExternalHyperlink({ link: String(r.href || '#'), children: lr }));
        } catch (_) {
          out.push(...docxRunsFromAst(r.runs || [], ctx, extra));
        }
        continue;
      }
      const t = String(r.text || '');
      if (!t) continue;
      const runProps = {
        font: r.code ? codeFont : (r.font ? String(r.font).split(',')[0].trim().replace(/^['"]|['"]$/g, '') : ctx.font),
        size: r.fontSize ? Math.round(parseCssFontSize(r.fontSize, ctx.halfPt / 2) * 2) : (r.code ? Math.round(ctx.halfPt * 0.9) : ctx.halfPt),
        ...extra,
        text: t
      };
      if (r.bold) runProps.bold = true;
      if (r.italic) runProps.italics = true;
      if (r.underline) runProps.underline = { type: 'single' };
      if (r.strike) runProps.strike = true;
      if (r.sup) runProps.superScript = true;
      if (r.sub) runProps.subScript = true;
      const cCol = parseCssColor(r.color);
      if (cCol) runProps.color = cCol;
      else if (r.code && !extra.color) runProps.color = codeCol;
      const bgCol = parseCssColor(r.bg);
      if (bgCol) runProps.shading = { type: 'clear', color: 'auto', fill: bgCol };
      else if (r.code) runProps.shading = { type: 'clear', color: 'auto', fill: codeBg };
      out.push(new TextRun(runProps));
    }
    return out;
  }

  function docxBlocksFromAst(blocks, ctx, bq = false) {
    const tblBorderCol = parseCssColor(ctx.styles?.table?.borderColor) || 'DFE2E5';
    const thFill = parseCssColor(ctx.styles?.table?.thBg) || 'F6F8FA';
    const thCol = parseCssColor(ctx.styles?.table?.thColor);
    const bqBorderCol = parseCssColor(ctx.styles?.blockquote?.borderColor) || 'DFE2E5';
    const bqColor = parseCssColor(ctx.styles?.blockquote?.color);
    const bqBg = parseCssColor(ctx.styles?.blockquote?.backgroundColor);
    const codeBg = parseCssColor(ctx.styles?.code?.bg) || 'F6F8FA';
    const codeCol = parseCssColor(ctx.styles?.code?.color) || '24292E';
    const hrCol = parseCssColor(ctx.styles?.hr?.color) || 'EEEEEE';
    const borderSpec = { style: BorderStyle.SINGLE, size: 4, color: tblBorderCol };
    const out = [];

    function emitList(listBlk, level) {
      let orderedRef = null;
      let customBulletRef = null;
      if (listBlk.ordered) {
        orderedRef = 'ol-' + (ctx.numConfigs.length + 1);
        ctx.numConfigs.push({
          reference: orderedRef,
          levels: [0, 1, 2, 3].map(l => ({
            level: l, format: LevelFormat.DECIMAL, text: '%' + (l + 1) + '.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: MM2T(10 + l * 10), hanging: MM2T(6) } } }
          }))
        });
      } else if (listBlk.bulletChar) {
        customBulletRef = 'ulc-' + (ctx.numConfigs.length + 1);
        ctx.numConfigs.push({
          reference: customBulletRef,
          levels: [0, 1, 2, 3].map(l => ({
            level: l, format: LevelFormat.BULLET, text: String(listBlk.bulletChar),
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: MM2T(10 + l * 10), hanging: MM2T(6) } } }
          }))
        });
      }
      for (const item of (listBlk.items || [])) {
        const runs = docxRunsFromAst(item.runs || [], ctx, ctx.bodyRun);
        out.push(new Paragraph({
          children: runs.length ? runs : [new TextRun({ text: '', font: ctx.font })],
          ...(listBlk.ordered
            ? { numbering: { reference: orderedRef, level } }
            : (customBulletRef ? { numbering: { reference: customBulletRef, level } } : { bullet: { level } })),
          ...(ctx.lineSpacing ? { spacing: { line: ctx.lineSpacing, lineRule: 'auto' } } : {})
        }));
        for (const sub of (item.lists || item.children || [])) emitList(sub, level + 1);
      }
    }

    for (const blk of (blocks || [])) {
      switch (blk.type) {
        case 'pagebreak':
          out.push(new Paragraph({ children: [new PageBreak()] }));
          break;
        case 'heading': {
          const hLevels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
          const hScale = [2.0, 1.5, 1.17, 1.0, 1.0, 1.0];
          const hBold = [true, true, true, true, false, false];
          const hBefore = [320, 280, 240, 200, 160, 160];
          const hAfter = [80, 80, 60, 60, 40, 40];
          const d = Math.min(Math.max((blk.depth || 1) - 1, 0), 5);
          const hStyle = ctx.styles?.headings?.[d + 1] || {};
          const hSize = hStyle.fontSize ? Math.round(parseCssFontSize(hStyle.fontSize, (ctx.halfPt / 2) * hScale[d]) * 2) : Math.round(ctx.halfPt * hScale[d]);
          const hFont = hStyle.fontFamily ? String(hStyle.fontFamily).split(',')[0].trim().replace(/^['"]|['"]$/g, '') : ctx.font;
          const hColor = parseCssColor(hStyle.color) || ctx.bodyRun.color;
          const runExtra = { font: hFont, bold: hBold[d], size: hSize, ...(hColor ? { color: hColor } : {}) };
          const hSpacing = { before: hBefore[d], after: hAfter[d] };
          if (ctx.lineSpacing) { hSpacing.line = ctx.lineSpacing; hSpacing.lineRule = 'auto'; }
          const paraProps = {
            heading: hLevels[d],
            children: docxRunsFromAst(blk.runs || [], ctx, runExtra),
            spacing: hSpacing
          };
          const align = blk.align || hStyle.textAlign;
          if (align) paraProps.alignment = docxAlign(align);
          if (d < 2 || hStyle.borderBottomColor) {
            paraProps.border = { bottom: { style: BorderStyle.SINGLE, size: d === 0 ? 8 : 4, color: parseCssColor(hStyle.borderBottomColor) || 'EEEEEE', space: 4 } };
          }
          out.push(new Paragraph(paraProps));
          break;
        }
        case 'paragraph': {
          const pSpacing = bq ? { before: 40, after: 40 } : { after: 200 };
          if (blk.marginTop > 0) pSpacing.before = Math.round(blk.marginTop * 20);
          if (blk.marginBottom > 0) pSpacing.after = Math.round(blk.marginBottom * 20);
          if (ctx.lineSpacing) { pSpacing.line = ctx.lineSpacing; pSpacing.lineRule = 'auto'; }
          const runBase = bq && bqColor ? { ...ctx.bodyRun, color: bqColor } : ctx.bodyRun;
          const props = { children: docxRunsFromAst(blk.runs || [], ctx, runBase), spacing: pSpacing };
          if (bq) {
            props.indent = { left: MM2T(8) };
            props.border = { left: { style: BorderStyle.SINGLE, size: 12, color: bqBorderCol, space: 6 } };
            if (bqBg) props.shading = { type: 'clear', color: 'auto', fill: bqBg };
          } else {
            if (blk.marginLeft > 0 || blk.marginRight > 0) {
              props.indent = {};
              if (blk.marginLeft > 0) props.indent.left = Math.round(blk.marginLeft * 20);
              if (blk.marginRight > 0) props.indent.right = Math.round(blk.marginRight * 20);
            }
            const blkBg = parseCssColor(blk.bg);
            if (blkBg) props.shading = { type: 'clear', color: 'auto', fill: blkBg };
            if (blk.borderBottom && blk.borderBottom.widthPt > 0) {
              const bStyle = blk.borderBottom.style === 'dashed' ? BorderStyle.DASHED : (blk.borderBottom.style === 'dotted' ? BorderStyle.DOTTED : BorderStyle.SINGLE);
              props.border = { bottom: { style: bStyle, size: Math.max(2, Math.round(blk.borderBottom.widthPt * 8)), color: parseCssColor(blk.borderBottom.color) || '888888', space: 4 } };
            }
          }
          const isImageOnly = (blk.runs || []).length === 1 && blk.runs[0].type === 'image';
          if (blk.align) props.alignment = docxAlign(blk.align);
          else if (isImageOnly) props.alignment = AlignmentType.CENTER;
          out.push(new Paragraph(props));
          break;
        }
        case 'blockquote':
          out.push(...docxBlocksFromAst(blk.blocks || [], ctx, true));
          break;
        case 'code': {
          const lines = String(blk.text || '').split('\n');
          const runs = [];
          for (let i = 0; i < lines.length; i++) {
            if (i > 0) runs.push(new TextRun({ break: 1 }));
            runs.push(new TextRun({ text: lines[i] || '', font: 'Courier New', size: Math.round(ctx.halfPt * 0.9), color: codeCol }));
          }
          out.push(new Paragraph({
            children: runs,
            shading: { type: 'clear', color: 'auto', fill: codeBg },
            border: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'E1E4E8', space: 4 },
            },
            indent: { left: MM2T(4), right: MM2T(4) },
            spacing: { before: 160, after: 160 }
          }));
          break;
        }
        case 'list':
          emitList(blk, 0);
          break;
        case 'table': {
          const nCols = Math.max(1, (blk.header || []).length || (blk.rows?.[0]?.length || 1));
          const colPct = Math.floor(10000 / nCols);
          const rows = [];
          if (blk.header && blk.header.length) {
            rows.push(new TableRow({
              tableHeader: true,
              children: blk.header.map(cell => new TableCell({
                width: { size: colPct, type: WidthType.PERCENTAGE },
                shading: { type: 'clear', color: 'auto', fill: parseCssColor(cell.bg) || thFill },
                children: [new Paragraph({
                  children: docxRunsFromAst(cell.runs || [], ctx, { ...ctx.bodyRun, ...(thCol ? { color: thCol } : {}), bold: true }),
                  alignment: docxAlign(cell.align)
                })]
              }))
            }));
          }
          for (const r of (blk.rows || [])) {
            rows.push(new TableRow({
              children: r.map(cell => new TableCell({
                width: { size: colPct, type: WidthType.PERCENTAGE },
                ...(parseCssColor(cell.bg) ? { shading: { type: 'clear', color: 'auto', fill: parseCssColor(cell.bg) } } : {}),
                children: [new Paragraph({
                  children: docxRunsFromAst(cell.runs || [], ctx, ctx.bodyRun),
                  alignment: docxAlign(cell.align)
                })]
              }))
            }));
          }
          if (rows.length) {
            const tblBorder = blk.borderless ? { style: BorderStyle.NONE, size: 0, color: 'auto' } : borderSpec;
            out.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: { top: tblBorder, bottom: tblBorder, left: tblBorder, right: tblBorder, insideH: tblBorder, insideV: tblBorder },
              rows
            }));
          }
          break;
        }
        case 'hr':
          out.push(new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: hrCol, space: 4 } },
            spacing: { before: 240, after: 240 }
          }));
          break;
      }
    }
    return out;
  }

  _docxExporter = { _markedDocx, MM2T, parseCssColor, parseCssLineHeight, parseCssFontSize, PAGE_SIZES_MM_DOCX, docxBlockTokens, docxBlocksFromAst, docxAlign, Document, Packer, Paragraph, Footer, PageNumber, TextRun };
  return _docxExporter;
}

ipcMain.handle('app:clipboard-read-text', () => {
  try {
    return clipboard ? clipboard.readText() : '';
  } catch (e) {
    return '';
  }
});

ipcMain.handle('app:clipboard-read-html', () => {
  try {
    return clipboard ? clipboard.readHTML() : '';
  } catch (e) {
    return '';
  }
});

ipcMain.handle('app:clipboard-read-image', () => {
  try {
    if (!clipboard) return '';
    const img = clipboard.readImage();
    return (img && !img.isEmpty()) ? img.toDataURL() : '';
  } catch (e) {
    return '';
  }
});

ipcMain.handle('app:clipboard-write-text', (_event, text) => {
  try {
    if (clipboard && typeof clipboard.writeText === 'function') {
      clipboard.writeText(String(text || ''));
      return true;
    }
  } catch (e) {}
  return false;
});

ipcMain.handle('app:export-docx', async (event, request = {}) => {
  try {
    const { _markedDocx, MM2T, parseCssColor, parseCssLineHeight, parseCssFontSize, PAGE_SIZES_MM_DOCX, docxBlockTokens, docxBlocksFromAst, docxAlign, Document, Packer, Paragraph, Footer, PageNumber, TextRun } = _getDocxExporter();
    const cleanFont = String(request.fontFamily || 'Segoe UI')
      .split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'Segoe UI';
    const ptSize = parseCssFontSize(String(request.fontSize || ''), Number(request.fontSize) || 11);
    const halfPt = Math.round(ptSize * 2);
    const margins = request.margins || { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 };
    const pmm = request.size === 'Custom' && request.customW && request.customH
      ? { w: Number(request.customW), h: Number(request.customH) }
      : (PAGE_SIZES_MM_DOCX[request.size] || PAGE_SIZES_MM_DOCX.A4);
    const landscape = request.orientation === 'landscape';
    const pageW = MM2T(landscape ? pmm.h : pmm.w);
    const pageH = MM2T(landscape ? pmm.w : pmm.h);

    const bodyColor   = parseCssColor(request.color);
    const lineSpacing = parseCssLineHeight(request.lineHeight);
    const bodyRun = { ...(bodyColor ? { color: bodyColor } : {}) };
    const textWidthMm = (landscape ? pmm.h : pmm.w) - margins.left - margins.right;
    const textWidthPx = textWidthMm * 96 / 25.4;
    const ctx = {
      font: cleanFont, halfPt, numConfigs: [], bodyRun, lineSpacing,
      styles: request.styles || {},
      images: request.images || {},
      textWidthPx,
      imageWidthMode: String(request.imageWidth || 'auto')
    };
    let children;
    if (Array.isArray(request.blocks) && request.blocks.length) {
      children = docxBlocksFromAst(request.blocks, ctx);
    } else {
      const tokens = _markedDocx.lexer(String(request.markdown || ''));
      children = docxBlockTokens(tokens, ctx);
    }
    if (!children.length) children.push(new Paragraph({ children: [] }));

    const footerParas = [];
    if (request.footer && String(request.footerText || '').trim()) {
      footerParas.push(new Paragraph({
        alignment: docxAlign(request.footerAlign || 'center'),
        children: [new TextRun({ text: String(request.footerText).trim(), font: cleanFont, size: Math.max(16, halfPt - 4), color: '777777' })]
      }));
    }
    if (request.pageNumbers) {
      footerParas.push(new Paragraph({
        alignment: docxAlign(request.pageNumbersPos || 'center'),
        children: [
          new TextRun({ children: [PageNumber.CURRENT], font: cleanFont, size: Math.max(16, halfPt - 4), color: '777777' }),
          new TextRun({ text: ' / ', font: cleanFont, size: Math.max(16, halfPt - 4), color: '777777' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: cleanFont, size: Math.max(16, halfPt - 4), color: '777777' })
        ]
      }));
    }

    const doc = new Document({
      numbering: ctx.numConfigs.length ? { config: ctx.numConfigs } : undefined,
      sections: [{
        properties: {
          page: {
            size: { width: pageW, height: pageH },
            margin: { top: MM2T(margins.top), right: MM2T(margins.right), bottom: MM2T(margins.bottom), left: MM2T(margins.left) }
          }
        },
        ...(footerParas.length ? { footers: { default: new Footer({ children: footerParas }) } } : {}),
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const rawName = (typeof request.filename === 'string' && request.filename.trim())
      ? request.filename.trim()
      : ((typeof request.defaultName === 'string' && request.defaultName.trim()) ? request.defaultName.trim() : 'document');
    const baseName = rawName.replace(/\.(md|docx)$/i, '');
    let finalPath = request.targetPath || null;
    if (!finalPath) {
      const saveTargets = getSaveTargets();
      if (request.target && saveTargets[request.target]) {
        const targetDir = saveTargets[request.target];
        await fs.mkdir(targetDir, { recursive: true });
        finalPath = path.join(targetDir, baseName + '.docx');
      } else {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save as DOCX',
          defaultPath: path.join(app.getPath('downloads'), baseName + '.docx'),
          filters: [{ name: 'Word Document', extensions: ['docx'] }]
        });
        if (canceled || !filePath) return { ok: false, canceled: true };
        finalPath = filePath;
      }
    }
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, buffer);
    return { ok: true, path: finalPath, name: path.basename(finalPath) };
  } catch (err) {
    console.error('export-docx failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('app:export-odt', async (event, request = {}) => {
  try {
    const { markdownToOdtBuffer } = require('../odt-converter.js');
    const buffer = await markdownToOdtBuffer(request);
    const rawName = (typeof request.filename === 'string' && request.filename.trim())
      ? request.filename.trim()
      : ((typeof request.defaultName === 'string' && request.defaultName.trim()) ? request.defaultName.trim() : 'document');
    const baseName = rawName.replace(/\.(md|odt)$/i, '');
    let finalPath = request.targetPath || null;
    if (!finalPath) {
      const saveTargets = getSaveTargets();
      if (request.target && saveTargets[request.target]) {
        const targetDir = saveTargets[request.target];
        await fs.mkdir(targetDir, { recursive: true });
        finalPath = path.join(targetDir, baseName + '.odt');
      } else {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save as LibreOffice Writer Document',
          defaultPath: path.join(app.getPath('downloads'), baseName + '.odt'),
          filters: [{ name: 'OpenDocument Text', extensions: ['odt'] }]
        });
        if (canceled || !filePath) return { ok: false, canceled: true };
        finalPath = filePath;
      }
    }
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, buffer);
    return { ok: true, path: finalPath, name: path.basename(finalPath) };
  } catch (err) {
    console.error('export-odt failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle('app:read-odt', async (event, request = {}) => {
  try {
    const { absPath } = request;
    if (!absPath) return { ok: false, error: 'File not found: ' + absPath };
    try { await fs.access(absPath); } catch (_) { return { ok: false, error: 'File not found: ' + absPath }; }
    const buffer = await fs.readFile(absPath);
    const { odtBufferToMarkdown } = require('../odt-converter.js');
    const result = await odtBufferToMarkdown(buffer);
    result.path = absPath;
    result.name = path.basename(absPath);
    return result;
  } catch (err) {
    console.error('read-odt failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

}

module.exports = { registerDocExportIpc };
