/**
 * js/viewer/viewer-formats.js
 * Multi-format parsing & rendering helpers for Viewer (EPUB, HTML, TXT, Markdown, Images, PDF).
 */
(function (root) {
  'use strict';

  var IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif'];
  var EPUB_EXTS = ['.epub'];
  var HTML_EXTS = ['.html', '.htm', '.xhtml'];
  var TXT_EXTS = ['.txt'];
  var MD_EXTS = ['.md', '.markdown'];
  var PDF_EXTS = ['.pdf'];
  var ALL_EXTS = PDF_EXTS.concat(IMAGE_EXTS, EPUB_EXTS, HTML_EXTS, TXT_EXTS, MD_EXTS);

  function getLowerExt(name) {
    var s = String(name || '').split('?')[0].split('#')[0].trim().toLowerCase();
    var idx = s.lastIndexOf('.');
    return idx >= 0 ? s.slice(idx) : '';
  }

  function detectFormat(filename, mimeType) {
    var ext = getLowerExt(filename);
    if (PDF_EXTS.indexOf(ext) !== -1) return 'pdf';
    if (IMAGE_EXTS.indexOf(ext) !== -1) return 'image';
    if (EPUB_EXTS.indexOf(ext) !== -1) return 'epub';
    if (HTML_EXTS.indexOf(ext) !== -1) return 'html';
    if (TXT_EXTS.indexOf(ext) !== -1) return 'txt';
    if (MD_EXTS.indexOf(ext) !== -1) return 'md';

    var mime = String(mimeType || '').toLowerCase();
    if (mime === 'application/pdf') return 'pdf';
    if (mime.indexOf('image/') === 0) return 'image';
    if (mime === 'application/epub+zip') return 'epub';
    if (mime === 'text/html' || mime === 'application/xhtml+xml') return 'html';
    if (mime === 'text/markdown' || mime === 'text/x-markdown') return 'md';
    if (mime === 'text/plain') return 'txt';
    return null;
  }

  function isSupportedFilename(name) {
    return detectFormat(name) !== null;
  }

  function getFormatCategory(name) {
    var fmt = detectFormat(name);
    if (fmt === 'pdf') return 'pdf';
    if (fmt === 'image') return 'image';
    if (fmt === 'epub') return 'epub';
    if (fmt === 'html' || fmt === 'txt' || fmt === 'md') return 'text';
    return 'other';
  }

  function guessMime(name) {
    var ext = getLowerExt(name);
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.bmp') return 'image/bmp';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.avif') return 'image/avif';
    if (ext === '.css') return 'text/css';
    if (ext === '.woff') return 'font/woff';
    if (ext === '.woff2') return 'font/woff2';
    if (ext === '.ttf') return 'font/ttf';
    if (ext === '.otf') return 'font/otf';
    return 'application/octet-stream';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeHtmlFragment(html) {
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(String(html || ''), 'text/html');
      if (!doc || !doc.body) return '';
      var dangerous = doc.body.querySelectorAll('script, object, embed, base, meta[http-equiv="refresh"]');
      for (var i = 0; i < dangerous.length; i++) {
        dangerous[i].remove();
      }
      var all = doc.body.querySelectorAll('*');
      for (var j = 0; j < all.length; j++) {
        var el = all[j];
        var attrs = el.attributes;
        for (var k = attrs.length - 1; k >= 0; k--) {
          var attrName = attrs[k].name.toLowerCase();
          var attrVal = attrs[k].value || '';
          if (attrName.indexOf('on') === 0) {
            el.removeAttribute(attrs[k].name);
          } else if ((attrName === 'href' || attrName === 'src' || attrName === 'xlink:href') && /^\s*(javascript:|data:text\/html)/i.test(attrVal)) {
            el.removeAttribute(attrs[k].name);
          }
        }
      }
      return doc.body.innerHTML;
    } catch (_) {
      return '<pre>' + escapeHtml(html) + '</pre>';
    }
  }

  // ── ZIP / EPUB Parser (zero-dependency via DecompressionStream) ──
  function readUint16LE(view, offset) {
    return view.getUint16(offset, true);
  }

  function readUint32LE(view, offset) {
    return view.getUint32(offset, true);
  }

  async function inflateRawBytes(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream is not supported in this environment');
    }
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    var ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }

  function parseZipEntries(arrayBuffer) {
    var view = new DataView(arrayBuffer);
    var len = arrayBuffer.byteLength;
    var minEocd = Math.max(0, len - 65557);
    var eocdOffset = -1;
    for (var i = len - 22; i >= minEocd; i--) {
      if (readUint32LE(view, i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) {
      throw new Error('Invalid EPUB/ZIP archive: central directory not found');
    }

    var totalEntries = readUint16LE(view, eocdOffset + 10);
    var cdOffset = readUint32LE(view, eocdOffset + 16);
    var decoder = new TextDecoder('utf-8');
    var entries = {};
    var pos = cdOffset;

    for (var idx = 0; idx < totalEntries && pos + 46 <= len; idx++) {
      if (readUint32LE(view, pos) !== 0x02014b50) break;
      var compressionMethod = readUint16LE(view, pos + 10);
      var compressedSize = readUint32LE(view, pos + 20);
      var fileNameLen = readUint16LE(view, pos + 28);
      var extraLen = readUint16LE(view, pos + 30);
      var commentLen = readUint16LE(view, pos + 32);
      var localHeaderOffset = readUint32LE(view, pos + 42);
      var nameBytes = new Uint8Array(arrayBuffer, pos + 46, fileNameLen);
      var fileName = decoder.decode(nameBytes).replace(/\\/g, '/').replace(/^\/+/, '');

      entries[fileName] = {
        name: fileName,
        method: compressionMethod,
        compressedSize: compressedSize,
        localHeaderOffset: localHeaderOffset
      };
      pos += 46 + fileNameLen + extraLen + commentLen;
    }

    return entries;
  }

  async function readZipEntryBytes(arrayBuffer, entry) {
    if (!entry) return new Uint8Array(0);
    var view = new DataView(arrayBuffer);
    var off = entry.localHeaderOffset;
    if (readUint32LE(view, off) !== 0x04034b50) {
      throw new Error('Invalid local file header in EPUB');
    }
    var fnLen = readUint16LE(view, off + 26);
    var exLen = readUint16LE(view, off + 28);
    var dataStart = off + 30 + fnLen + exLen;
    var slice = new Uint8Array(arrayBuffer, dataStart, entry.compressedSize);

    if (entry.method === 0) {
      return slice;
    }
    if (entry.method === 8) {
      return await inflateRawBytes(slice);
    }
    throw new Error('Unsupported ZIP compression method: ' + entry.method);
  }

  async function readZipEntryText(arrayBuffer, entry) {
    var bytes = await readZipEntryBytes(arrayBuffer, entry);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function resolveZipPath(baseDir, href) {
    if (!href) return '';
    var clean = String(href).split('#')[0].split('?')[0];
    try { clean = decodeURIComponent(clean); } catch (_) {}
    if (!baseDir) return clean.replace(/^\/+/, '');
    var parts = (baseDir + '/' + clean).split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p || p === '.') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    return stack.join('/');
  }

  function dirOf(zipPath) {
    var idx = String(zipPath || '').lastIndexOf('/');
    return idx >= 0 ? zipPath.slice(0, idx) : '';
  }

  async function parseEpubArchive(arrayBuffer) {
    var entries = parseZipEntries(arrayBuffer);
    var entriesLower = {};
    var entriesByBase = {};
    Object.keys(entries).forEach(function (k) {
      var low = k.toLowerCase();
      entriesLower[low] = k;
      var base = low.split('/').pop();
      if (base && !entriesByBase[base]) entriesByBase[base] = k;
    });

    function findEntryKey(zipPath) {
      if (!zipPath) return null;
      var norm = String(zipPath).replace(/\\/g, '/').replace(/^\/+/, '');
      if (entries[norm]) return norm;
      var low = norm.toLowerCase();
      if (entriesLower[low]) return entriesLower[low];
      var base = low.split('/').pop();
      if (base && entriesByBase[base]) return entriesByBase[base];
      return null;
    }

    var blobUrls = [];
    var assetBlobCache = {};

    async function getAssetBlobUrl(zipPath, fallbackMime) {
      var actualKey = findEntryKey(zipPath);
      if (!actualKey || !entries[actualKey]) return null;
      if (assetBlobCache[actualKey]) return assetBlobCache[actualKey];
      var bytes = await readZipEntryBytes(arrayBuffer, entries[actualKey]);
      var mime = fallbackMime || guessMime(actualKey);
      var url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      blobUrls.push(url);
      assetBlobCache[actualKey] = url;
      return url;
    }

    var spinePaths = [];
    var bookTitle = '';
    var tocRaw = []; // { title, path }
    var opfDir = '';
    var ncxPath = '';
    var navPath = '';

    if (entries['META-INF/container.xml']) {
      try {
        var containerXml = await readZipEntryText(arrayBuffer, entries['META-INF/container.xml']);
        var parser = new DOMParser();
        var cDoc = parser.parseFromString(containerXml, 'application/xml');
        var rootEl = cDoc.querySelector('rootfile[full-path]');
        var opfPath = rootEl ? rootEl.getAttribute('full-path') : '';
        if (opfPath && entries[opfPath]) {
          opfDir = dirOf(opfPath);
          var opfXml = await readZipEntryText(arrayBuffer, entries[opfPath]);
          var opfDoc = parser.parseFromString(opfXml, 'application/xml');

          var titleEl = opfDoc.querySelector('metadata title, dc\\:title');
          if (titleEl && titleEl.textContent) {
            bookTitle = titleEl.textContent.trim();
          }

          var manifestById = {};
          var items = opfDoc.querySelectorAll('manifest > item');
          for (var i = 0; i < items.length; i++) {
            var id = items[i].getAttribute('id');
            var href = items[i].getAttribute('href');
            var media = items[i].getAttribute('media-type') || '';
            var props = items[i].getAttribute('properties') || '';
            if (id && href) {
              var resolved = resolveZipPath(opfDir, href);
              if (/html|xml/i.test(media) || /\.(x?html?|xml)$/i.test(href)) {
                manifestById[id] = resolved;
              }
              if (props.split(/\s+/).indexOf('nav') !== -1 && entries[resolved]) {
                navPath = resolved;
              }
              if ((id === 'ncx' || media === 'application/x-dtbncx+xml' || /\.ncx$/i.test(href)) && entries[resolved]) {
                ncxPath = resolved;
              }
            }
          }

          var itemrefs = opfDoc.querySelectorAll('spine > itemref');
          for (var j = 0; j < itemrefs.length; j++) {
            var idref = itemrefs[j].getAttribute('idref');
            if (idref && manifestById[idref] && entries[manifestById[idref]]) {
              spinePaths.push(manifestById[idref]);
            }
          }
        }
      } catch (_) {}
    }

    if (!spinePaths.length) {
      spinePaths = Object.keys(entries).filter(function (k) {
        return /\.(x?html?|htm)$/i.test(k) && !/nav\.(x?html?)$/i.test(k);
      }).sort();
    }

    // Parse TOC (EPUB3 nav or EPUB2 NCX)
    if (navPath && entries[navPath]) {
      try {
        var navHtml = await readZipEntryText(arrayBuffer, entries[navPath]);
        var navDoc = new DOMParser().parseFromString(navHtml, 'text/html');
        var navDir = dirOf(navPath);
        var links = navDoc.querySelectorAll('nav a[href]');
        for (var n = 0; n < links.length; n++) {
          var lHref = links[n].getAttribute('href');
          var lText = (links[n].textContent || '').trim();
          if (lHref && lText) {
            tocRaw.push({ title: lText, path: resolveZipPath(navDir, lHref) });
          }
        }
      } catch (_) {}
    } else if (ncxPath && entries[ncxPath]) {
      try {
        var ncxXml = await readZipEntryText(arrayBuffer, entries[ncxPath]);
        var ncxDoc = new DOMParser().parseFromString(ncxXml, 'application/xml');
        var ncxDir = dirOf(ncxPath);
        var navPoints = ncxDoc.querySelectorAll('navPoint');
        for (var np = 0; np < navPoints.length; np++) {
          var labelEl = navPoints[np].querySelector('navLabel > text');
          var contentEl = navPoints[np].querySelector('content[src]');
          if (labelEl && contentEl) {
            var t = (labelEl.textContent || '').trim();
            var s = contentEl.getAttribute('src');
            if (t && s) {
              tocRaw.push({ title: t, path: resolveZipPath(ncxDir, s) });
            }
          }
        }
      } catch (_) {}
    }

    // Map spine path -> chapter index
    var pathToIndex = {};
    for (var sp = 0; sp < spinePaths.length; sp++) {
      pathToIndex[spinePaths[sp]] = sp;
    }

    var chapters = [];
    for (var c = 0; c < spinePaths.length; c++) {
      var chPath = spinePaths[c];
      var chDir = dirOf(chPath);
      var rawXhtml = await readZipEntryText(arrayBuffer, entries[chPath]);
      var chDoc = null;
      if (/^\s*<\?xml|xmlns=["']http:\/\/www\.w3\.org\/1999\/xhtml["']/i.test(rawXhtml)) {
        try {
          var xDoc = new DOMParser().parseFromString(rawXhtml, 'application/xhtml+xml');
          if (xDoc && !xDoc.querySelector('parsererror')) chDoc = xDoc;
        } catch (_) {}
      }
      if (!chDoc) {
        chDoc = new DOMParser().parseFromString(rawXhtml, 'text/html');
      }
      var chBody = chDoc ? (chDoc.body || chDoc.querySelector('body') || chDoc.documentElement) : null;

      // Remove scripts and unsafe tags
      if (chBody) {
        var bad = chBody.querySelectorAll('script, object, embed');
        for (var b = 0; b < bad.length; b++) bad[b].remove();

        // Rewrite images & SVG <image> elements to blob URLs
        var imgs = chBody.querySelectorAll('img, image');
        for (var im = 0; im < imgs.length; im++) {
          var imgEl = imgs[im];
          var attr = imgEl.hasAttribute('src') ? 'src' : (imgEl.hasAttribute('xlink:href') ? 'xlink:href' : (imgEl.hasAttribute('href') ? 'href' : ''));
          if (!attr) continue;
          var val = imgEl.getAttribute(attr);
          if (val && !/^(data:|blob:|https?:)/i.test(val)) {
            var assetPath = resolveZipPath(chDir, val);
            var blobUrl = await getAssetBlobUrl(assetPath);
            if (!blobUrl && opfDir) {
              blobUrl = await getAssetBlobUrl(resolveZipPath(opfDir, val));
            }
            if (blobUrl) {
              imgEl.setAttribute(attr, blobUrl);
            }
          }
        }

        // Rewrite internal chapter links
        var anchors = chBody.querySelectorAll('a[href]');
        for (var a = 0; a < anchors.length; a++) {
          var aHref = anchors[a].getAttribute('href') || '';
          if (!/^(https?:|mailto:|#)/i.test(aHref)) {
            var targetPath = resolveZipPath(chDir, aHref);
            if (Object.prototype.hasOwnProperty.call(pathToIndex, targetPath)) {
              anchors[a].setAttribute('data-epub-chapter', String(pathToIndex[targetPath]));
              anchors[a].setAttribute('href', '#');
            }
          }
        }
      }

      var chTitle = '';
      for (var tr = 0; tr < tocRaw.length; tr++) {
        if (tocRaw[tr].path === chPath) {
          chTitle = tocRaw[tr].title;
          break;
        }
      }
      if (!chTitle && chBody) {
        var hEl = chBody.querySelector('h1, h2, h3');
        if (hEl && hEl.textContent) chTitle = hEl.textContent.trim().slice(0, 80);
      }
      if (!chTitle) chTitle = 'Chapter ' + (c + 1);

      var serializedBody = '';
      if (chBody) {
        if (chDoc.contentType === 'application/xhtml+xml' && typeof XMLSerializer !== 'undefined') {
          var ser = new XMLSerializer();
          for (var cn = 0; cn < chBody.childNodes.length; cn++) {
            serializedBody += ser.serializeToString(chBody.childNodes[cn]);
          }
        } else {
          serializedBody = chBody.innerHTML;
        }
      }

      chapters.push({
        index: c,
        path: chPath,
        title: chTitle,
        html: sanitizeHtmlFragment(serializedBody)
      });
    }

    var toc = [];
    for (var tc = 0; tc < tocRaw.length; tc++) {
      if (Object.prototype.hasOwnProperty.call(pathToIndex, tocRaw[tc].path)) {
        toc.push({
          title: tocRaw[tc].title,
          chapterIndex: pathToIndex[tocRaw[tc].path]
        });
      }
    }
    if (!toc.length) {
      toc = chapters.map(function (ch) {
        return { title: ch.title, chapterIndex: ch.index };
      });
    }

    return {
      title: bookTitle,
      chapters: chapters,
      toc: toc,
      destroy: function () {
        for (var i = 0; i < blobUrls.length; i++) {
          try { URL.revokeObjectURL(blobUrls[i]); } catch (_) {}
        }
        blobUrls = [];
        assetBlobCache = {};
      }
    };
  }

  function renderMarkdownToElement(mdText, containerEl) {
    if (!containerEl) return;
    var raw = String(mdText || '');
    var html = '';
    if (root.marked && typeof root.marked.parse === 'function') {
      html = root.marked.parse(raw, { gfm: true, breaks: false });
    } else {
      html = '<pre>' + escapeHtml(raw) + '</pre>';
    }
    containerEl.innerHTML = sanitizeHtmlFragment(html);
    if (root.katex && typeof root.katex.renderToString === 'function') {
      try {
        var walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null);
        var textNodes = [];
        var node;
        while ((node = walker.nextNode())) {
          if (node.parentElement && /^(CODE|PRE|SCRIPT|STYLE)$/i.test(node.parentElement.tagName)) continue;
          if (/\$|\\\(|\\\[/.test(node.nodeValue || '')) textNodes.push(node);
        }
        textNodes.forEach(function (tn) {
          var txt = tn.nodeValue || '';
          var replaced = txt
            .replace(/\$\$([\s\S]+?)\$\$/g, function (_, tex) {
              try { return root.katex.renderToString(tex, { displayMode: true, throwOnError: false }); } catch (_) { return _; }
            })
            .replace(/\$([^\n$]+?)\$/g, function (_, tex) {
              try { return root.katex.renderToString(tex, { displayMode: false, throwOnError: false }); } catch (_) { return _; }
            });
          if (replaced !== txt && tn.parentNode) {
            var span = document.createElement('span');
            span.innerHTML = replaced;
            tn.parentNode.replaceChild(span, tn);
          }
        });
      } catch (_) {}
    }
  }

  function createHtmlSandboxIframe(htmlText, onSelectionChange) {
    var iframe = document.createElement('iframe');
    iframe.className = 'viewer-html-frame';
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.srcdoc = String(htmlText || '');

    var syncHeight = function () {
      try {
        var doc = iframe.contentDocument;
        if (!doc) return;
        var h = Math.max(
          doc.documentElement ? doc.documentElement.scrollHeight : 0,
          doc.body ? doc.body.scrollHeight : 0,
          400
        );
        iframe.style.height = (h + 24) + 'px';
      } catch (_) {}
    };

    iframe.addEventListener('load', function () {
      syncHeight();
      try {
        var doc = iframe.contentDocument;
        if (doc) {
          if (typeof ResizeObserver === 'function' && doc.body) {
            var ro = new ResizeObserver(syncHeight);
            ro.observe(doc.body);
          }
          if (typeof onSelectionChange === 'function') {
            doc.addEventListener('mouseup', function () {
              var sel = doc.getSelection ? doc.getSelection() : null;
              onSelectionChange(sel, iframe);
            });
            doc.addEventListener('keyup', function () {
              var sel = doc.getSelection ? doc.getSelection() : null;
              onSelectionChange(sel, iframe);
            });
          }
        }
      } catch (_) {}
    });

    return iframe;
  }

  function renderTextToElement(txtText, containerEl, opts) {
    if (!containerEl) return;
    var options = opts || {};
    containerEl.className = 'viewer-txt-body' + (options.mono ? ' is-mono' : '') + (options.wrap === false ? ' is-nowrap' : '');
    containerEl.textContent = String(txtText || '');
  }

  root.ViewerFormats = {
    IMAGE_EXTS: IMAGE_EXTS,
    EPUB_EXTS: EPUB_EXTS,
    HTML_EXTS: HTML_EXTS,
    TXT_EXTS: TXT_EXTS,
    MD_EXTS: MD_EXTS,
    PDF_EXTS: PDF_EXTS,
    ALL_EXTS: ALL_EXTS,
    detectFormat: detectFormat,
    isSupportedFilename: isSupportedFilename,
    getFormatCategory: getFormatCategory,
    guessMime: guessMime,
    escapeHtml: escapeHtml,
    sanitizeHtmlFragment: sanitizeHtmlFragment,
    parseEpubArchive: parseEpubArchive,
    renderMarkdownToElement: renderMarkdownToElement,
    createHtmlSandboxIframe: createHtmlSandboxIframe,
    renderTextToElement: renderTextToElement
  };
})(window);
