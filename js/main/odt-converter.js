// OpenDocument Text (.odt) Converter & Engine for Class Management Tools.
// Supports bidirectional conversion: Markdown -> ODT Buffer and ODT Buffer -> Markdown + Layout.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const JSZip = require('jszip');
    const { Marked } = require('marked');
    module.exports = factory(JSZip, Marked);
  } else {
    root.OdtConverter = factory(root.JSZip, root.marked ? (root.marked.Marked ? root.marked.Marked : null) : null);
  }
}(typeof self !== 'undefined' ? self : this, function (JSZip, MarkedClass) {
  'use strict';

  function escapeXml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const PAGE_SIZES_MM = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
    A5: { w: 148, h: 210 },
    Letter: { w: 215.9, h: 279.4 },
    Legal: { w: 215.9, h: 355.6 }
  };

  function parseMm(val, fallback) {
    if (val == null) return fallback;
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? fallback : n;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MARKDOWN TO ODT CONVERSION
  // ───────────────────────────────────────────────────────────────────────────

  function renderInlineTokens(tokens, imgContext) {
    if (!tokens || !tokens.length) return '';
    let xml = '';
    for (const t of tokens) {
      switch (t.type) {
        case 'text':
          xml += escapeXml(t.text);
          break;
        case 'escape':
          xml += escapeXml(t.text);
          break;
        case 'strong':
          xml += `<text:span text:style-name="Bold">${renderInlineTokens(t.tokens, imgContext)}</text:span>`;
          break;
        case 'em':
          xml += `<text:span text:style-name="Italic">${renderInlineTokens(t.tokens, imgContext)}</text:span>`;
          break;
        case 'codespan':
          xml += `<text:span text:style-name="Source_Text">${escapeXml(t.text)}</text:span>`;
          break;
        case 'del':
          xml += `<text:span text:style-name="Strikethrough">${renderInlineTokens(t.tokens, imgContext)}</text:span>`;
          break;
        case 'link':
          xml += `<text:a xlink:type="simple" xlink:href="${escapeXml(t.href)}">${renderInlineTokens(t.tokens || [{ type: 'text', text: t.text }], imgContext)}</text:a>`;
          break;
        case 'image':
          if (imgContext && typeof imgContext.addImage === 'function') {
            const frameXml = imgContext.addImage(t.href, t.text);
            if (frameXml) {
              xml += frameXml;
              break;
            }
          }
          xml += `<text:span text:style-name="Italic">[Image: ${escapeXml(t.text || t.href)}]</text:span>`;
          break;
        case 'br':
          xml += '<text:line-break/>';
          break;
        default:
          if (t.tokens) xml += renderInlineTokens(t.tokens, imgContext);
          else if (t.text) xml += escapeXml(t.text);
          break;
      }
    }
    return xml;
  }

  function renderBlockTokens(tokens, imgContext) {
    if (!tokens || !tokens.length) return '';
    let xml = '';
    for (const t of tokens) {
      switch (t.type) {
        case 'heading': {
          const lvl = Math.min(6, Math.max(1, t.depth || 1));
          xml += `<text:h text:outline-level="${lvl}" text:style-name="Heading_${lvl}">${renderInlineTokens(t.tokens, imgContext)}</text:h>`;
          break;
        }
        case 'paragraph': {
          xml += `<text:p text:style-name="Standard">${renderInlineTokens(t.tokens, imgContext)}</text:p>`;
          break;
        }
        case 'list': {
          const styleName = t.ordered ? 'Numbering_List' : 'Bullet_List';
          xml += `<text:list text:style-name="${styleName}">`;
          for (const item of (t.items || [])) {
            xml += '<text:list-item>';
            if (item.tokens && item.tokens.length) {
              for (const it of item.tokens) {
                if (it.type === 'text') {
                  xml += `<text:p text:style-name="Standard">${renderInlineTokens(it.tokens || [{ type: 'text', text: it.text }], imgContext)}</text:p>`;
                } else if (it.type === 'list') {
                  xml += renderBlockTokens([it], imgContext);
                } else {
                  xml += renderBlockTokens([it], imgContext);
                }
              }
            } else {
              xml += `<text:p text:style-name="Standard">${escapeXml(item.text)}</text:p>`;
            }
            xml += '</text:list-item>';
          }
          xml += '</text:list>';
          break;
        }
        case 'table': {
          if (!imgContext.tableCounter) imgContext.tableCounter = 0;
          imgContext.tableCounter++;
          const tableName = `Table_${imgContext.tableCounter}`;
          xml += `<table:table table:name="${tableName}" table:style-name="Table_Style">`;
          const colCount = (t.header || []).length || 1;
          xml += `<table:table-column table:number-columns-repeated="${colCount}"/>`;
          const hasRealHeader = t.header && t.header.length && t.header.some(c => (c.text && c.text.trim()) || (c.tokens && c.tokens.length));
          if (hasRealHeader) {
            xml += '<table:table-header-rows><table:table-row>';
            for (const cell of t.header) {
              xml += `<table:table-cell table:style-name="TableHeader" office:value-type="string"><text:p text:style-name="Table_Header_Text">${renderInlineTokens(cell.tokens, imgContext)}</text:p></table:table-cell>`;
            }
            xml += '</table:table-row></table:table-header-rows>';
          }
          if (t.rows && t.rows.length) {
            for (const row of t.rows) {
              xml += '<table:table-row>';
              for (const cell of row) {
                xml += `<table:table-cell table:style-name="TableCell" office:value-type="string"><text:p text:style-name="Standard">${renderInlineTokens(cell.tokens, imgContext)}</text:p></table:table-cell>`;
              }
              xml += '</table:table-row>';
            }
          }
          xml += '</table:table>';
          break;
        }
        case 'code': {
          const lines = (t.text || '').split('\n');
          for (const line of lines) {
            xml += `<text:p text:style-name="Preformatted_Text">${escapeXml(line)}</text:p>`;
          }
          break;
        }
        case 'blockquote': {
          if (Array.isArray(t.tokens) && t.tokens.length) {
            for (const sub of t.tokens) {
              if (sub.type === 'paragraph') {
                xml += `<text:p text:style-name="Blockquote">${renderInlineTokens(sub.tokens, imgContext)}</text:p>`;
              } else {
                xml += renderBlockTokens([sub], imgContext);
              }
            }
          } else {
            xml += `<text:p text:style-name="Blockquote">${escapeXml(t.text || '')}</text:p>`;
          }
          break;
        }
        case 'hr': {
          xml += '<text:p text:style-name="Horizontal_Line"/>';
          break;
        }
        case 'html': {
          if (t.text && (t.text.includes('page-break') || t.text.includes('pagebreak') || t.text.includes('class-page-break'))) {
            xml += '<text:p text:style-name="PageBreak"/>';
          }
          break;
        }
        case 'space':
          break;
        default:
          if (t.tokens) xml += renderBlockTokens(t.tokens, imgContext);
          break;
      }
    }
    return xml;
  }

  function cssLineHeightToOdt(val) {
    if (!val) return '150%';
    const s = String(val).trim();
    if (s.endsWith('%')) return s;
    const num = parseFloat(s);
    if (!isNaN(num) && /^[0-9.]+$/.test(s)) {
      return `${Math.round(num * 100)}%`;
    }
    if (s.endsWith('pt') || s.endsWith('mm') || s.endsWith('cm')) return s;
    if (s.endsWith('px') && !isNaN(num)) return `${(num * 0.75).toFixed(1)}pt`;
    return '150%';
  }

  function cssAlignToOdt(align) {
    if (!align) return '';
    const a = String(align).toLowerCase();
    if (a === 'center') return 'center';
    if (a === 'right' || a === 'end') return 'end';
    if (a === 'justify') return 'justify';
    if (a === 'left' || a === 'start') return 'start';
    return '';
  }

  function renderAstRunsToOdt(runs, ctx) {
    if (!Array.isArray(runs) || runs.length === 0) return '';
    let out = '';
    for (const r of runs) {
      if (!r) continue;
      if (r.type === 'br') {
        out += '<text:line-break/>';
        continue;
      }
      if (r.type === 'image') {
        const imgXml = ctx.addImage(r.src, r.alt, r.width);
        if (imgXml) out += imgXml;
        else if (r.alt) out += escapeXml(r.alt);
        continue;
      }
      if (r.type === 'link') {
        const inner = Array.isArray(r.runs)
          ? renderAstRunsToOdt(r.runs, ctx)
          : escapeXml(r.text || r.href || '');
        const linkStyle = ctx.getLinkStyle();
        const styledInner = linkStyle ? `<text:span text:style-name="${linkStyle}">${inner}</text:span>` : inner;
        out += `<text:a xlink:type="simple" xlink:href="${escapeXml(r.href || '')}">${styledInner}</text:a>`;
        continue;
      }
      const text = r.text || '';
      if (!text) continue;
      // Preserve leading/trailing spaces and newlines cleanly in ODT
      const escaped = escapeXml(text).replace(/\n/g, '<text:line-break/>');
      const styleName = ctx.getTextStyle(r);
      if (styleName) {
        out += `<text:span text:style-name="${styleName}">${escaped}</text:span>`;
      } else {
        out += escaped;
      }
    }
    return out;
  }

  function renderAstBlocksToOdt(blocks, ctx, listDepth = 0) {
    if (!Array.isArray(blocks) || blocks.length === 0) return '';
    let out = '';
    for (const b of blocks) {
      if (!b) continue;
      if (b.type === 'pagebreak') {
        out += '<text:p text:style-name="PageBreak"/>';
        continue;
      }
      if (b.type === 'hr') {
        out += '<text:p text:style-name="Horizontal_Line"/>';
        continue;
      }
      if (b.type === 'heading') {
        const lvl = Math.min(6, Math.max(1, parseInt(b.depth || b.level, 10) || 1));
        const pStyle = ctx.getParaStyle(`Heading_${lvl}`, b.align, b);
        out += `<text:p text:style-name="${pStyle}">${renderAstRunsToOdt(b.runs, ctx)}</text:p>`;
        continue;
      }
      if (b.type === 'paragraph') {
        const pStyle = ctx.getParaStyle('Standard', b.align, b);
        out += `<text:p text:style-name="${pStyle}">${renderAstRunsToOdt(b.runs, ctx)}</text:p>`;
        continue;
      }
      if (b.type === 'blockquote') {
        if (Array.isArray(b.blocks) && b.blocks.length > 0) {
          for (const sub of b.blocks) {
            if (sub && (sub.type === 'paragraph' || sub.type === 'heading')) {
              const pStyle = ctx.getParaStyle('Blockquote', sub.align || b.align);
              out += `<text:p text:style-name="${pStyle}">${renderAstRunsToOdt(sub.runs, ctx)}</text:p>`;
            } else if (sub) {
              out += renderAstBlocksToOdt([sub], ctx, listDepth);
            }
          }
        } else if (Array.isArray(b.runs)) {
          const pStyle = ctx.getParaStyle('Blockquote', b.align);
          out += `<text:p text:style-name="${pStyle}">${renderAstRunsToOdt(b.runs, ctx)}</text:p>`;
        }
        continue;
      }
      if (b.type === 'code') {
        const lines = String(b.text || '').split('\n');
        for (const line of lines) {
          out += `<text:p text:style-name="Preformatted_Text">${escapeXml(line)}</text:p>`;
        }
        continue;
      }
      if (b.type === 'list') {
        const listStyle = b.ordered ? 'List_Ordered' : (b.bulletChar ? ctx.getCustomListStyle(b.bulletChar) : 'List_Bullet');
        out += `<text:list text:style-name="${listStyle}">`;
        for (const item of (b.items || [])) {
          out += '<text:list-item>';
          const prefix = item.checked === true ? '[x] ' : (item.checked === false ? '[ ] ' : '');
          const subLists = item.lists || item.children || [];
          if (Array.isArray(item.runs) && item.runs.length > 0) {
            const pStyle = ctx.getParaStyle('Standard', item.align);
            out += `<text:p text:style-name="${pStyle}">${escapeXml(prefix)}${renderAstRunsToOdt(item.runs, ctx)}</text:p>`;
          }
          if (Array.isArray(subLists) && subLists.length > 0) {
            out += renderAstBlocksToOdt(subLists, ctx, listDepth + 1);
          }
          if ((!item.runs || item.runs.length === 0) && subLists.length === 0) {
            out += `<text:p text:style-name="Standard">${escapeXml(prefix)}</text:p>`;
          }
          out += '</text:list-item>';
        }
        out += '</text:list>';
        continue;
      }
      if (b.type === 'table') {
        const normalizedRows = [];
        if (Array.isArray(b.header) && b.header.length > 0) {
          normalizedRows.push(b.header.map(c => Object.assign({ header: true }, c)));
        }
        for (const row of (Array.isArray(b.rows) ? b.rows : [])) {
          if (Array.isArray(row)) normalizedRows.push(row);
          else if (row && Array.isArray(row.cells)) normalizedRows.push(row.cells);
        }
        if (normalizedRows.length === 0) continue;
        const colCount = Math.max(1, ...normalizedRows.map(r => r.length));
        ctx.tableCounter++;
        out += `<table:table table:name="Table_${ctx.tableCounter}" table:style-name="Table_Style">`;
        for (let c = 0; c < colCount; c++) {
          out += '<table:table-column/>';
        }
        for (const rowCells of normalizedRows) {
          out += '<table:table-row>';
          for (let c = 0; c < colCount; c++) {
            const cell = rowCells[c] || { runs: [] };
            const isHeader = !!cell.header;
            const cellStyle = b.borderless ? 'TableCellBorderless' : (isHeader ? 'TableHeader' : 'TableCell');
            const baseTextPara = isHeader ? 'Table_Header_Text' : 'Standard';
            const paraStyle = ctx.getParaStyle(baseTextPara, cell.align);
            out += `<table:table-cell table:style-name="${cellStyle}" office:value-type="string">`;
            out += `<text:p text:style-name="${paraStyle}">${renderAstRunsToOdt(cell.runs || [], ctx)}</text:p>`;
            out += '</table:table-cell>';
          }
          out += '</table:table-row>';
        }
        out += '</table:table>';
      }
    }
    return out;
  }

  async function markdownToOdtBuffer(options = {}) {
    if (!JSZip) throw new Error('JSZip library is required to create ODT files.');

    const markdown = String(options.markdown || '');
    const title = options.title || options.defaultName || 'Document';
    const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
    const paperName = options.size || 'A4';
    const pmm = paperName === 'Custom'
      ? { w: parseMm(options.customW, 210), h: parseMm(options.customH, 297) }
      : (PAGE_SIZES_MM[paperName] || PAGE_SIZES_MM.A4);
    const pageW = orientation === 'landscape' ? pmm.h : pmm.w;
    const pageH = orientation === 'landscape' ? pmm.w : pmm.h;

    const margins = options.margins || {};
    const mt = parseMm(margins.top, 15);
    const mr = parseMm(margins.right, 15);
    const mb = parseMm(margins.bottom, 15);
    const ml = parseMm(margins.left, 15);
    const textWidthMm = Math.max(20, pageW - ml - mr);

    const styles = options.styles || {};
    const rawFont = String(options.fontFamily || styles.fontFamily || 'Lexend, Segoe UI').split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'Lexend';
    const fontSizePt = parseFloat(options.fontSize || styles.fontSize) || 11;
    const bodyColor = options.color || styles.color || '#222222';
    const lineHeightOdt = cssLineHeightToOdt(options.lineHeight || styles.lineHeight || '1.6');

    const tblStyle = styles.table || {};
    const tableThBg = tblStyle.thBg || options.tableThBg || '#f6f8fa';
    const tableThColor = tblStyle.thColor || bodyColor;
    const borderColor = tblStyle.borderColor || options.borderColor || '#dfe2e5';

    const bqStyle = styles.blockquote || {};
    const bqBg = bqStyle.bg || '#fdfdf9';
    const bqColor = bqStyle.color || '#555555';
    const bqBorder = bqStyle.borderColor || '#dfe2e5';

    const codeStyle = styles.code || {};
    const codeBg = codeStyle.bg || '#f6f8fa';
    const codeColor = codeStyle.color || bodyColor;
    const codeFont = String(codeStyle.fontFamily || 'monospace').split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'monospace';

    const linkColor = (styles.link && styles.link.color) || '#5b8fcc';
    const hrColor = (styles.hr && styles.hr.color) || '#dfe2e5';
    const headingsMap = styles.headings || {};

    // 1. mimetype (MUST be first and uncompressed)
    const zip = new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

    // Track embedded pictures
    const manifestEntries = [];
    let imgCounter = 0;
    const dynamicTextStyles = new Map();
    const dynamicParaStyles = new Map();
    const dynamicListStyles = new Map();

    const imgContext = {
      tableCounter: 0,
      getTextStyle: function (r) {
        const props = [];
        if (r.bold) props.push('fo:font-weight="bold"');
        if (r.italic) props.push('fo:font-style="italic"');
        if (r.underline) props.push('style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"');
        if (r.strike) props.push('style:text-line-through-style="solid"');
        if (r.sup) props.push('style:text-position="super 58%"');
        else if (r.sub) props.push('style:text-position="sub 58%"');
        if (r.code) {
          props.push(`fo:font-family="${escapeXml(codeFont)}"`);
          if (!r.bg) props.push(`fo:background-color="${escapeXml(codeBg)}"`);
          if (!r.color && codeColor) props.push(`fo:color="${escapeXml(codeColor)}"`);
        }
        if (r.color) props.push(`fo:color="${escapeXml(r.color)}"`);
        if (r.bg) props.push(`fo:background-color="${escapeXml(r.bg)}"`);
        if (r.font) {
          const fn = String(r.font).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
          if (fn) props.push(`fo:font-family="${escapeXml(fn)}"`);
        }
        if (r.fontSize) {
          const fsPt = parseFloat(r.fontSize);
          if (!isNaN(fsPt) && fsPt > 0) props.push(`fo:font-size="${fsPt}pt"`);
        }
        if (props.length === 0) return '';
        const key = props.join(' ');
        if (!dynamicTextStyles.has(key)) {
          const name = `DT_${dynamicTextStyles.size + 1}`;
          dynamicTextStyles.set(key, `<style:style style:name="${name}" style:family="text"><style:text-properties ${key}/></style:style>`);
        }
        return dynamicTextStyles.get(key).match(/style:name="([^"]+)"/)[1];
      },
      getLinkStyle: function () {
        const key = `fo:color="${escapeXml(linkColor)}" style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"`;
        if (!dynamicTextStyles.has(key)) {
          const name = `DT_${dynamicTextStyles.size + 1}`;
          dynamicTextStyles.set(key, `<style:style style:name="${name}" style:family="text"><style:text-properties ${key}/></style:style>`);
        }
        return dynamicTextStyles.get(key).match(/style:name="([^"]+)"/)[1];
      },
      getParaStyle: function (baseStyle, align, box) {
        const odtAlign = cssAlignToOdt(align);
        const pProps = [];
        if (odtAlign) pProps.push(`fo:text-align="${odtAlign}"`);
        if (box) {
          if (box.bg) pProps.push(`fo:background-color="${escapeXml(box.bg)}"`);
          if (box.borderBottom && box.borderBottom.widthPt > 0) {
            const bStyle = box.borderBottom.style === 'dashed' || box.borderBottom.style === 'dotted' ? box.borderBottom.style : 'solid';
            pProps.push(`fo:border-bottom="${box.borderBottom.widthPt}pt ${bStyle} ${escapeXml(box.borderBottom.color || '#888888')}"`);
          }
          if (box.marginTop > 0) pProps.push(`fo:margin-top="${box.marginTop}pt"`);
          if (box.marginBottom > 0) pProps.push(`fo:margin-bottom="${box.marginBottom}pt"`);
          if (box.marginLeft > 0) pProps.push(`fo:margin-left="${box.marginLeft}pt"`);
          if (box.marginRight > 0) pProps.push(`fo:margin-right="${box.marginRight}pt"`);
          if (box.padding) {
            if (box.padding.top > 0) pProps.push(`fo:padding-top="${box.padding.top}pt"`);
            if (box.padding.bottom > 0) pProps.push(`fo:padding-bottom="${box.padding.bottom}pt"`);
            if (box.padding.left > 0) pProps.push(`fo:padding-left="${box.padding.left}pt"`);
          }
        }
        if (pProps.length === 0) return baseStyle;
        const propsStr = pProps.join(' ');
        const key = `${baseStyle}|${propsStr}`;
        if (!dynamicParaStyles.has(key)) {
          const name = `DP_${dynamicParaStyles.size + 1}`;
          dynamicParaStyles.set(key, `<style:style style:name="${name}" style:family="paragraph" style:parent-style-name="${baseStyle}"><style:paragraph-properties ${propsStr}/></style:style>`);
        }
        return dynamicParaStyles.get(key).match(/style:name="([^"]+)"/)[1];
      },
      getCustomListStyle: function (bulletChar) {
        const ch = String(bulletChar || '•').trim() || '•';
        if (!dynamicListStyles.has(ch)) {
          const name = `DL_${dynamicListStyles.size + 1}`;
          dynamicListStyles.set(ch, `<text:list-style style:name="${name}">
      <text:list-level-style-bullet text:level="1" text:bullet-char="${escapeXml(ch)}"><style:list-level-properties text:space-before="6mm" text:min-label-width="4.5mm"/></text:list-level-style-bullet>
      <text:list-level-style-bullet text:level="2" text:bullet-char="${escapeXml(ch)}"><style:list-level-properties text:space-before="12mm" text:min-label-width="4.5mm"/></text:list-level-style-bullet>
      <text:list-level-style-bullet text:level="3" text:bullet-char="${escapeXml(ch)}"><style:list-level-properties text:space-before="18mm" text:min-label-width="4.5mm"/></text:list-level-style-bullet>
    </text:list-style>`);
        }
        return dynamicListStyles.get(ch).match(/style:name="([^"]+)"/)[1];
      },
      addImage: function (href, alt, reqWidthPx) {
        if (!href) return null;
        let imgData = null;
        let mime = 'image/png';
        let ext = 'png';
        let natW = 0;
        let natH = 0;

        const parseDataUrl = (dataUrl) => {
          const semiIdx = dataUrl.indexOf(';');
          const commaIdx = dataUrl.indexOf(',');
          if (semiIdx !== -1 && commaIdx !== -1) {
            mime = dataUrl.slice(5, semiIdx);
            ext = mime.split('/')[1] || 'png';
            if (ext === 'jpeg') ext = 'jpg';
            else if (ext.includes('svg')) ext = 'svg';
            return dataUrl.slice(commaIdx + 1);
          }
          return null;
        };

        if (typeof href === 'string' && href.startsWith('data:image/')) {
          imgData = parseDataUrl(href);
        } else if (options.images && options.images[href]) {
          const mapped = options.images[href];
          if (typeof mapped === 'string') {
            if (mapped.startsWith('data:image/')) {
              imgData = parseDataUrl(mapped);
            } else {
              imgData = mapped;
              if (href.match(/\.jpe?g$/i)) { mime = 'image/jpeg'; ext = 'jpg'; }
              else if (href.match(/\.webp$/i)) { mime = 'image/webp'; ext = 'webp'; }
              else if (href.match(/\.gif$/i)) { mime = 'image/gif'; ext = 'gif'; }
            }
          } else if (mapped && typeof mapped === 'object' && mapped.data) {
            if (typeof mapped.data === 'string' && mapped.data.startsWith('data:image/')) {
              imgData = parseDataUrl(mapped.data);
            } else {
              imgData = mapped.data;
              if (href.match(/\.jpe?g$/i)) { mime = 'image/jpeg'; ext = 'jpg'; }
              else if (href.match(/\.webp$/i)) { mime = 'image/webp'; ext = 'webp'; }
              else if (href.match(/\.gif$/i)) { mime = 'image/gif'; ext = 'gif'; }
            }
            natW = Number(mapped.width) || 0;
            natH = Number(mapped.height) || 0;
          }
        }

        if (imgData) {
          imgCounter++;
          const imgName = `image_${imgCounter}.${ext}`;
          zip.folder('Pictures').file(imgName, imgData, { base64: typeof imgData === 'string' });
          manifestEntries.push(`<manifest:file-entry manifest:full-path="Pictures/${imgName}" manifest:media-type="${mime}"/>`);

          // Compute exact physical size in mm preserving aspect ratio & imageWidth option
          const pxToMm = 25.4 / 96;
          let targetW = natW > 0 ? natW * pxToMm : 120;
          let targetH = natH > 0 ? natH * pxToMm : 80;
          const aspect = (natW > 0 && natH > 0) ? (natH / natW) : (targetH / targetW);

          if (reqWidthPx && Number(reqWidthPx) > 0) {
            targetW = Number(reqWidthPx) * pxToMm;
            targetH = targetW * aspect;
          } else if (options.imageWidth === '100%') {
            targetW = textWidthMm;
            targetH = targetW * aspect;
          } else if (typeof options.imageWidth === 'string' && options.imageWidth.endsWith('%')) {
            const pct = parseFloat(options.imageWidth);
            if (!isNaN(pct) && pct > 0) {
              targetW = textWidthMm * (pct / 100);
              targetH = targetW * aspect;
            }
          }

          if (targetW > textWidthMm) {
            targetW = textWidthMm;
            targetH = targetW * aspect;
          }
          const maxH = Math.max(30, pageH - mt - mb - 10);
          if (targetH > maxH) {
            targetH = maxH;
            targetW = targetH / aspect;
          }

          return `<draw:frame draw:style-name="Graphics" draw:name="Graphic_${imgCounter}" text:anchor-type="as-char" svg:width="${targetW.toFixed(2)}mm" svg:height="${targetH.toFixed(2)}mm" draw:z-index="0"><draw:image xlink:href="Pictures/${imgName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
        }
        return null;
      }
    };

    let bodyContentXml = '';
    if (Array.isArray(options.blocks) && options.blocks.length > 0) {
      bodyContentXml = renderAstBlocksToOdt(options.blocks, imgContext);
    } else {
      // Tokenize Markdown (legacy fallback)
      let tokens = [];
      if (MarkedClass) {
        const m = new MarkedClass({ gfm: true, breaks: true });
        tokens = m.lexer(markdown);
      } else if (typeof marked !== 'undefined' && marked.lexer) {
        tokens = marked.lexer(markdown);
      } else {
        tokens = markdown.split(/\n\n+/).map(block => ({
          type: 'paragraph',
          tokens: [{ type: 'text', text: block.trim() }]
        }));
      }
      bodyContentXml = renderBlockTokens(tokens, imgContext);
    }

    // 2. META-INF/manifest.xml
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
  ${manifestEntries.join('\n  ')}
</manifest:manifest>`;
    zip.folder('META-INF').file('manifest.xml', manifestXml);

    // 3. meta.xml
    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">
  <office:meta>
    <meta:generator>ClassManagementTools</meta:generator>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:date>${new Date().toISOString()}</dc:date>
  </office:meta>
</office:document-meta>`;
    zip.file('meta.xml', metaXml);

    // Build footer XML for styles.xml if enabled
    const hasFooter = !!(options.footer && options.footerText);
    const hasPageNum = !!options.pageNumbers;
    let footerStyleXml = '';
    let masterFooterXml = '';
    if (hasFooter || hasPageNum) {
      const fAlign = cssAlignToOdt(options.footerAlign || options.pageNumbersPos || 'center') || 'center';
      footerStyleXml = `
    <style:style style:name="Footer_Style" style:family="paragraph">
      <style:paragraph-properties fo:text-align="${fAlign}" fo:margin-top="4pt"/>
      <style:text-properties fo:font-size="9pt" fo:color="#666666" style:font-name="${escapeXml(rawFont)}"/>
    </style:style>`;
      const parts = [];
      if (hasFooter) parts.push(escapeXml(String(options.footerText)));
      if (hasPageNum) parts.push('<text:page-number/> / <text:page-count/>');
      masterFooterXml = `<style:footer><text:p text:style-name="Footer_Style">${parts.join(' — ')}</text:p></style:footer>`;
    }

    // 4. styles.xml
    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:line-height="${escapeXml(lineHeightOdt)}" fo:margin-bottom="6pt"/>
      <style:text-properties fo:font-size="${fontSizePt}pt" style:font-name="${escapeXml(rawFont)}" fo:color="${escapeXml(bodyColor)}"/>
    </style:default-style>
    <style:style style:name="PageBreak" style:family="paragraph">
      <style:paragraph-properties fo:break-before="page"/>
    </style:style>${footerStyleXml}
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="${pageW}mm" fo:page-height="${pageH}mm" style:print-orientation="${orientation}" fo:margin-top="${mt}mm" fo:margin-bottom="${mb}mm" fo:margin-left="${ml}mm" fo:margin-right="${mr}mm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1">${masterFooterXml}</style:master-page>
  </office:master-styles>
</office:document-styles>`;
    zip.file('styles.xml', stylesXml);

    const buildHeadingStyle = (lvl, defaultPt) => {
      const h = headingsMap[lvl] || {};
      const pt = h.fontSize ? parseFloat(h.fontSize) : defaultPt;
      const col = h.color || bodyColor;
      const fn = h.fontFamily ? String(h.fontFamily).split(',')[0].trim().replace(/^['"]|['"]$/g, '') : rawFont;
      const textProps = [`fo:font-size="${pt}pt"`, 'fo:font-weight="bold"', `fo:color="${escapeXml(col)}"`];
      if (fn) textProps.push(`style:font-name="${escapeXml(fn)}"`);
      const paraProps = [`fo:margin-top="${Math.max(4, Math.round(defaultPt * 0.6))}pt"`, `fo:margin-bottom="${Math.max(2, Math.round(defaultPt * 0.3))}pt"`];
      if (h.align && cssAlignToOdt(h.align)) paraProps.push(`fo:text-align="${cssAlignToOdt(h.align)}"`);
      if (h.borderBottom) paraProps.push(`fo:border-bottom="1pt solid ${escapeXml(borderColor)}" fo:padding-bottom="2pt"`);
      if (h.bg) paraProps.push(`fo:background-color="${escapeXml(h.bg)}"`);
      return `<style:style style:name="Heading_${lvl}" style:family="paragraph"><style:text-properties ${textProps.join(' ')}/><style:paragraph-properties ${paraProps.join(' ')}/></style:style>`;
    };

    const listBulletStyle = `
    <text:list-style style:name="List_Bullet">
      <text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="6mm" text:min-label-width="4mm"/></text:list-level-style-bullet>
      <text:list-level-style-bullet text:level="2" text:bullet-char="◦"><style:list-level-properties text:space-before="12mm" text:min-label-width="4mm"/></text:list-level-style-bullet>
      <text:list-level-style-bullet text:level="3" text:bullet-char="▪"><style:list-level-properties text:space-before="18mm" text:min-label-width="4mm"/></text:list-level-style-bullet>
    </text:list-style>`;
    const listOrderedStyle = `
    <text:list-style style:name="List_Ordered">
      <text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:space-before="6mm" text:min-label-width="5mm"/></text:list-level-style-number>
      <text:list-level-style-number text:level="2" style:num-format="a" style:num-suffix="."><style:list-level-properties text:space-before="12mm" text:min-label-width="5mm"/></text:list-level-style-number>
      <text:list-level-style-number text:level="3" style:num-format="i" style:num-suffix="."><style:list-level-properties text:space-before="18mm" text:min-label-width="5mm"/></text:list-level-style-number>
    </text:list-style>`;

    // 5. content.xml
    const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
    <style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
    <style:style style:name="Strikethrough" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>
    <style:style style:name="Source_Text" style:family="text"><style:text-properties fo:font-family="${escapeXml(codeFont)}" fo:background-color="${escapeXml(codeBg)}" fo:color="${escapeXml(codeColor)}"/></style:style>
    <style:style style:name="PageBreak" style:family="paragraph"><style:paragraph-properties fo:break-before="page"/></style:style>
    <style:style style:name="Graphics" style:family="graphic"><style:graphic-properties svg:stroke-color="none" draw:fill="none"/></style:style>
    ${buildHeadingStyle(1, 20)}
    ${buildHeadingStyle(2, 16)}
    ${buildHeadingStyle(3, 13)}
    ${buildHeadingStyle(4, 11)}
    ${buildHeadingStyle(5, 10)}
    ${buildHeadingStyle(6, 9)}
    <style:style style:name="Preformatted_Text" style:family="paragraph"><style:text-properties fo:font-family="${escapeXml(codeFont)}" fo:font-size="9.5pt" fo:color="${escapeXml(codeColor)}"/><style:paragraph-properties fo:margin-top="2pt" fo:margin-bottom="2pt" fo:padding="4pt" fo:background-color="${escapeXml(codeBg)}"/></style:style>
    <style:style style:name="Horizontal_Line" style:family="paragraph"><style:paragraph-properties fo:border-bottom="1.5pt solid ${escapeXml(hrColor)}" fo:margin-top="8pt" fo:margin-bottom="12pt"/></style:style>
    <style:style style:name="Blockquote" style:family="paragraph"><style:paragraph-properties fo:margin-left="6pt" fo:margin-right="6pt" fo:margin-top="4pt" fo:margin-bottom="6pt" fo:border-left="3pt solid ${escapeXml(bqBorder)}" fo:padding-left="8pt" fo:background-color="${escapeXml(bqBg)}"/><style:text-properties fo:font-style="italic" fo:color="${escapeXml(bqColor)}"/></style:style>
    <style:style style:name="Table_Style" style:family="table"><style:table-properties style:width="100%" table:align="margins" fo:margin-top="4pt" fo:margin-bottom="8pt"/></style:style>
    <style:style style:name="TableHeader" style:family="table-cell"><style:table-cell-properties fo:border="1pt solid ${escapeXml(borderColor)}" fo:background-color="${escapeXml(tableThBg)}" fo:padding="5pt"/></style:style>
    <style:style style:name="TableCell" style:family="table-cell"><style:table-cell-properties fo:border="0.5pt solid ${escapeXml(borderColor)}" fo:padding="5pt"/></style:style>
    <style:style style:name="TableCellBorderless" style:family="table-cell"><style:table-cell-properties fo:border="none" fo:padding="2pt"/></style:style>
    <style:style style:name="Table_Header_Text" style:family="paragraph"><style:text-properties fo:font-weight="bold" fo:color="${escapeXml(tableThColor)}"/></style:style>
    ${listBulletStyle}
    ${listOrderedStyle}
    ${Array.from(dynamicListStyles.values()).join('\n    ')}
    ${Array.from(dynamicTextStyles.values()).join('\n    ')}
    ${Array.from(dynamicParaStyles.values()).join('\n    ')}
  </office:automatic-styles>
  <office:body>
    <office:text>
      ${bodyContentXml}
    </office:text>
  </office:body>
</office:document-content>`;
    zip.file('content.xml', contentXml);

    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ODT BUFFER TO MARKDOWN CONVERSION (OPEN & EDIT)
  // ───────────────────────────────────────────────────────────────────────────

  function unescapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  function cleanXmlText(xmlSnippet) {
    if (!xmlSnippet) return '';
    return unescapeXml(
      xmlSnippet
        .replace(/<text:line-break\s*\/?>/gi, '\n')
        .replace(/<text:tab\s*\/?>/gi, '\t')
        .replace(/<text:s\s+text:c="(\d+)"\s*\/?>/gi, (_, count) => ' '.repeat(parseInt(count, 10) || 1))
        .replace(/<text:s\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
    );
  }

  function parseOdtContentXmlToMarkdown(contentXml) {
    if (!contentXml) return '';

    const lines = [];

    // Match top-level text elements: headings, paragraphs, lists, tables
    const tagRegex = /<(text:h|text:p|text:list|table:table)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = tagRegex.exec(contentXml)) !== null) {
      const tagName = match[1];
      const tagAttrs = match[2];
      const tagBody = match[3];

      if (tagName === 'text:h') {
        const lvlMatch = tagAttrs.match(/text:outline-level="(\d+)"/i);
        const lvl = lvlMatch ? parseInt(lvlMatch[1], 10) : 1;
        const prefix = '#'.repeat(Math.max(1, Math.min(6, lvl))) + ' ';
        lines.push(prefix + parseOdtInlineXml(tagBody));
        lines.push('');
      } else if (tagName === 'text:p') {
        const pText = parseOdtInlineXml(tagBody).trim();
        if (pText) {
          lines.push(pText);
          lines.push('');
        }
      } else if (tagName === 'text:list') {
        // Extract list items
        const itemRegex = /<text:list-item[^>]*>([\s\S]*?)<\/text:list-item>/gi;
        let itemMatch;
        let idx = 1;
        const isOrdered = /number|ordered/i.test(tagAttrs);
        while ((itemMatch = itemRegex.exec(tagBody)) !== null) {
          const itemContent = itemMatch[1];
          const cleanItem = parseOdtInlineXml(itemContent).trim();
          if (cleanItem) {
            lines.push((isOrdered ? `${idx++}. ` : '- ') + cleanItem);
          }
        }
        lines.push('');
      } else if (tagName === 'table:table') {
        // Extract table rows
        const rowRegex = /<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/gi;
        const rows = [];
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tagBody)) !== null) {
          const rowContent = rowMatch[1];
          const cellRegex = /<table:table-cell[^>]*>([\s\S]*?)<\/table:table-cell>/gi;
          const cells = [];
          let cellMatch;
          while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            cells.push(cleanXmlText(cellMatch[1]).replace(/\|/g, '\\|').trim());
          }
          if (cells.length) rows.push(cells);
        }
        if (rows.length) {
          // Normalize column count
          const maxCols = Math.max(...rows.map(r => r.length));
          const header = rows[0];
          while (header.length < maxCols) header.push('');
          lines.push('| ' + header.join(' | ') + ' |');
          lines.push('| ' + header.map(() => '---').join(' | ') + ' |');
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            while (row.length < maxCols) row.push('');
            lines.push('| ' + row.join(' | ') + ' |');
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n').trim();
  }

  function parseOdtInlineXml(xmlSnippet) {
    if (!xmlSnippet) return '';

    // Convert styled spans
    let s = xmlSnippet;

    // Bold
    s = s.replace(/<text:span[^>]*style-name="[^"]*(bold|strong)[^"]*"[^>]*>([\s\S]*?)<\/text:span>/gi, '**$2**');
    // Italic
    s = s.replace(/<text:span[^>]*style-name="[^"]*(italic|emphasis|oblique)[^"]*"[^>]*>([\s\S]*?)<\/text:span>/gi, '*$2*');
    // Links
    s = s.replace(/<text:a[^>]*xlink:href="([^"]+)"[^>]*>([\s\S]*?)<\/text:a>/gi, '[$2]($1)');
    // Strikethrough
    s = s.replace(/<text:span[^>]*style-name="[^"]*(strike)[^"]*"[^>]*>([\s\S]*?)<\/text:span>/gi, '~~$2~~');
    // Code
    s = s.replace(/<text:span[^>]*style-name="[^"]*(source|code|mono)[^"]*"[^>]*>([\s\S]*?)<\/text:span>/gi, '`$2`');

    return cleanXmlText(s);
  }

  async function odtBufferToMarkdown(buffer) {
    if (!JSZip) throw new Error('JSZip library is required to read ODT files.');

    const zip = await JSZip.loadAsync(buffer);
    const contentXmlFile = zip.file('content.xml');
    if (!contentXmlFile) {
      throw new Error('Invalid ODT file: content.xml not found.');
    }

    const contentXml = await contentXmlFile.async('text');
    const markdown = parseOdtContentXmlToMarkdown(contentXml);

    // Extract layout & typography from styles.xml
    const layout = {
      size: 'A4',
      orientation: 'portrait',
      margins: { top: 25, right: 25, bottom: 25, left: 25 },
      fontFamily: 'Segoe UI',
      fontSize: 11
    };

    const stylesXmlFile = zip.file('styles.xml');
    if (stylesXmlFile) {
      try {
        const stylesXml = await stylesXmlFile.async('text');
        // Parse page layout dimensions
        const widthMatch = stylesXml.match(/fo:page-width="([0-9.]+)mm"/i);
        const heightMatch = stylesXml.match(/fo:page-height="([0-9.]+)mm"/i);
        if (widthMatch && heightMatch) {
          const w = parseFloat(widthMatch[1]);
          const h = parseFloat(heightMatch[1]);
          if (w > h) layout.orientation = 'landscape';
          // Match standard sizes
          for (const [name, dim] of Object.entries(PAGE_SIZES_MM)) {
            if ((Math.abs(dim.w - w) < 2 && Math.abs(dim.h - h) < 2) ||
                (Math.abs(dim.h - w) < 2 && Math.abs(dim.w - h) < 2)) {
              layout.size = name;
              break;
            }
          }
        }

        // Parse margins
        const mtMatch = stylesXml.match(/fo:margin-top="([0-9.]+)mm"/i);
        const mrMatch = stylesXml.match(/fo:margin-right="([0-9.]+)mm"/i);
        const mbMatch = stylesXml.match(/fo:margin-bottom="([0-9.]+)mm"/i);
        const mlMatch = stylesXml.match(/fo:margin-left="([0-9.]+)mm"/i);
        if (mtMatch) layout.margins.top = parseFloat(mtMatch[1]);
        if (mrMatch) layout.margins.right = parseFloat(mrMatch[1]);
        if (mbMatch) layout.margins.bottom = parseFloat(mbMatch[1]);
        if (mlMatch) layout.margins.left = parseFloat(mlMatch[1]);

        // Parse font
        const fontMatch = stylesXml.match(/style:font-name="([^"]+)"/i);
        if (fontMatch) layout.fontFamily = fontMatch[1];
        const sizeMatch = stylesXml.match(/fo:font-size="([0-9.]+)pt"/i);
        if (sizeMatch) layout.fontSize = parseFloat(sizeMatch[1]);
      } catch (e) {
        console.warn('Could not parse ODT styles.xml:', e);
      }
    }

    return {
      ok: true,
      markdown,
      layout
    };
  }

  return {
    markdownToOdtBuffer,
    odtBufferToMarkdown
  };
}));
