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

  function renderInlineTokens(tokens) {
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
          xml += `<text:span text:style-name="Bold">${renderInlineTokens(t.tokens)}</text:span>`;
          break;
        case 'em':
          xml += `<text:span text:style-name="Italic">${renderInlineTokens(t.tokens)}</text:span>`;
          break;
        case 'codespan':
          xml += `<text:span text:style-name="Source_Text">${escapeXml(t.text)}</text:span>`;
          break;
        case 'del':
          xml += `<text:span text:style-name="Strikethrough">${renderInlineTokens(t.tokens)}</text:span>`;
          break;
        case 'link':
          xml += `<text:a xlink:type="simple" xlink:href="${escapeXml(t.href)}">${renderInlineTokens(t.tokens || [{ type: 'text', text: t.text }])}</text:a>`;
          break;
        case 'image':
          xml += `<text:span text:style-name="Italic">[Image: ${escapeXml(t.text || t.href)}]</text:span>`;
          break;
        case 'br':
          xml += '<text:line-break/>';
          break;
        default:
          if (t.tokens) xml += renderInlineTokens(t.tokens);
          else if (t.text) xml += escapeXml(t.text);
          break;
      }
    }
    return xml;
  }

  function renderBlockTokens(tokens) {
    if (!tokens || !tokens.length) return '';
    let xml = '';
    for (const t of tokens) {
      switch (t.type) {
        case 'heading': {
          const lvl = Math.min(6, Math.max(1, t.depth || 1));
          xml += `<text:h text:outline-level="${lvl}" text:style-name="Heading_${lvl}">${renderInlineTokens(t.tokens)}</text:h>`;
          break;
        }
        case 'paragraph': {
          xml += `<text:p text:style-name="Standard">${renderInlineTokens(t.tokens)}</text:p>`;
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
                  xml += `<text:p text:style-name="Standard">${renderInlineTokens(it.tokens || [{ type: 'text', text: it.text }])}</text:p>`;
                } else if (it.type === 'list') {
                  xml += renderBlockTokens([it]);
                } else {
                  xml += renderBlockTokens([it]);
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
          xml += '<table:table table:name="Table">';
          const colCount = (t.header || []).length || 1;
          xml += `<table:table-column table:number-columns-repeated="${colCount}"/>`;
          if (t.header && t.header.length) {
            xml += '<table:table-header-rows><table:table-row>';
            for (const cell of t.header) {
              xml += `<table:table-cell table:style-name="TableHeader" office:value-type="string"><text:p text:style-name="Table_Header_Text">${renderInlineTokens(cell.tokens)}</text:p></table:table-cell>`;
            }
            xml += '</table:table-row></table:table-header-rows>';
          }
          if (t.rows && t.rows.length) {
            xml += '<table:table-rows>';
            for (const row of t.rows) {
              xml += '<table:table-row>';
              for (const cell of row) {
                xml += `<table:table-cell table:style-name="TableCell" office:value-type="string"><text:p text:style-name="Standard">${renderInlineTokens(cell.tokens)}</text:p></table:table-cell>`;
              }
              xml += '</table:table-row>';
            }
            xml += '</table:table-rows>';
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
          xml += `<text:p text:style-name="Blockquote">${renderBlockTokens(t.tokens)}</text:p>`;
          break;
        }
        case 'hr': {
          xml += '<text:p text:style-name="Horizontal_Line">________________________________________</text:p>';
          break;
        }
        case 'space':
          break;
        default:
          if (t.tokens) xml += renderBlockTokens(t.tokens);
          break;
      }
    }
    return xml;
  }

  async function markdownToOdtBuffer(options = {}) {
    if (!JSZip) throw new Error('JSZip library is required to create ODT files.');

    const markdown = String(options.markdown || '');
    const title = options.title || options.defaultName || 'Document';
    const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
    const paperName = options.size || 'A4';
    const pmm = PAGE_SIZES_MM[paperName] || PAGE_SIZES_MM.A4;
    const pageW = orientation === 'landscape' ? pmm.h : pmm.w;
    const pageH = orientation === 'landscape' ? pmm.w : pmm.h;

    const margins = options.margins || {};
    const mt = parseMm(margins.top, 25.4);
    const mr = parseMm(margins.right, 25.4);
    const mb = parseMm(margins.bottom, 25.4);
    const ml = parseMm(margins.left, 25.4);

    const rawFont = String(options.fontFamily || 'Segoe UI').split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'Segoe UI';
    const fontSizePt = parseFloat(options.fontSize) || 11;

    // Tokenize Markdown
    let tokens = [];
    if (MarkedClass) {
      const m = new MarkedClass({ gfm: true, breaks: true });
      tokens = m.lexer(markdown);
    } else if (typeof marked !== 'undefined' && marked.lexer) {
      tokens = marked.lexer(markdown);
    } else {
      // Basic fallback line splitter
      tokens = markdown.split(/\n\n+/).map(block => ({
        type: 'paragraph',
        tokens: [{ type: 'text', text: block.trim() }]
      }));
    }

    const bodyContentXml = renderBlockTokens(tokens);

    // 1. mimetype (MUST be first and uncompressed)
    const zip = new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

    // 2. META-INF/manifest.xml
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
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

    // 4. styles.xml
    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:line-height="125%" fo:margin-bottom="6pt"/>
      <style:text-properties fo:font-size="${fontSizePt}pt" style:font-name="${escapeXml(rawFont)}" fo:color="#222222"/>
    </style:default-style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="${pageW}mm" fo:page-height="${pageH}mm" style:print-orientation="${orientation}" fo:margin-top="${mt}mm" fo:margin-bottom="${mb}mm" fo:margin-left="${ml}mm" fo:margin-right="${mr}mm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1"/>
  </office:master-styles>
</office:document-styles>`;
    zip.file('styles.xml', stylesXml);

    // 5. content.xml
    const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
    <style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
    <style:style style:name="Strikethrough" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>
    <style:style style:name="Source_Text" style:family="text"><style:text-properties fo:font-family="monospace" fo:background-color="#f5f5f0"/></style:style>
    <style:style style:name="Heading_1" style:family="paragraph"><style:text-properties fo:font-size="20pt" fo:font-weight="bold"/><style:paragraph-properties fo:margin-top="12pt" fo:margin-bottom="6pt"/></style:style>
    <style:style style:name="Heading_2" style:family="paragraph"><style:text-properties fo:font-size="16pt" fo:font-weight="bold"/><style:paragraph-properties fo:margin-top="10pt" fo:margin-bottom="4pt"/></style:style>
    <style:style style:name="Heading_3" style:family="paragraph"><style:text-properties fo:font-size="13pt" fo:font-weight="bold"/><style:paragraph-properties fo:margin-top="8pt" fo:margin-bottom="3pt"/></style:style>
    <style:style style:name="Heading_4" style:family="paragraph"><style:text-properties fo:font-size="11pt" fo:font-weight="bold"/><style:paragraph-properties fo:margin-top="6pt" fo:margin-bottom="2pt"/></style:style>
    <style:style style:name="Heading_5" style:family="paragraph"><style:text-properties fo:font-size="10pt" fo:font-weight="bold"/><style:paragraph-properties fo:margin-top="4pt" fo:margin-bottom="2pt"/></style:style>
    <style:style style:name="Heading_6" style:family="paragraph"><style:text-properties fo:font-size="9pt" fo:font-weight="bold"/><style:paragraph-properties fo:margin-top="4pt" fo:margin-bottom="2pt"/></style:style>
    <style:style style:name="Preformatted_Text" style:family="paragraph"><style:text-properties fo:font-family="monospace" fo:font-size="9.5pt"/><style:paragraph-properties fo:margin-top="2pt" fo:margin-bottom="2pt" fo:background-color="#f9f9f6"/></style:style>
    <style:style style:name="Blockquote" style:family="paragraph"><style:paragraph-properties fo:margin-left="12pt" fo:border-left="2pt solid #666666" fo:padding-left="6pt"/><style:text-properties fo:font-style="italic"/></style:style>
    <style:style style:name="TableHeader" style:family="table-cell"><style:table-cell-properties fo:border="1pt solid #333333" fo:background-color="#f5f5f0" fo:padding="5pt"/></style:style>
    <style:style style:name="TableCell" style:family="table-cell"><style:table-cell-properties fo:border="0.5pt solid #cccccc" fo:padding="5pt"/></style:style>
    <style:style style:name="Table_Header_Text" style:family="paragraph"><style:text-properties fo:font-weight="bold"/></style:style>
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
