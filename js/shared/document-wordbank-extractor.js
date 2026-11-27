(function (root) {
  'use strict';

  var STOPWORDS = {
    en: new Set(['the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','into','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','well','way','even','new','want','because','any','these','give','day','most','us','is','are','was','were','been','has','had','did']),
    fr: new Set(['le','la','les','de','des','du','un','une','et','est','en','que','qui','dans','il','elle','ils','elles','je','tu','nous','vous','on','ne','pas','plus','par','pour','sur','avec','ce','cette','ces','son','sa','ses','mon','ma','mes','ton','ta','tes','au','aux','ou','mais','donc','car','ni','se','si','tout','tous','toute','toutes','etre','avoir','faire','dire','aller','voir','savoir','pouvoir','falloir','vouloir','a','ont','ai','as','avons','avez','suis','es','sommes','etes','sont','etait','etaient','fut']),
    de: new Set(['der','die','das','und','in','den','von','zu','das','mit','sich','des','auf','fuer','ist','im','dem','nicht','ein','eine','als','auch','es','an','werden','aus','er','hat','dass','sie','nach','wird','bei','einer','um','am','sind','noch','wie','einem','ueber','einen','so','zum','war','haben','nur','oder','aber','vor','zur','bis','mehr','durch','man','sein','wurde','sei','ich','du','wir','ihr']),
    it: new Set(['il','lo','la','i','gli','le','di','a','da','in','con','su','per','tra','fra','un','uno','una','e','che','non','si','del','della','dei','delle','al','alla','ai','alle','dal','dalla','nel','nella','sul','sulla','sono','era','stato','ha','hanno','ho','hai','abbiamo','avete','ma','o','se','come','piu','anche','questo','questa','quello','quella','io','tu','lui','lei','noi','voi','loro'])
  };

  function stripMarkdown(md) {
    if (!md) return '';
    return String(md)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, ' $1 ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+>]+\s+/gm, '')
      .replace(/[*_~]+/g, '');
  }

  function extractTextFromHtmlString(html) {
    if (!html) return '';
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      if (!doc || !doc.body) return html.replace(/<[^>]+>/g, ' ');
      var removeNodes = doc.body.querySelectorAll('script, style, noscript, svg');
      for (var i = 0; i < removeNodes.length; i++) {
        removeNodes[i].remove();
      }
      var blocks = doc.body.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr, blockquote');
      for (var j = 0; j < blocks.length; j++) {
        blocks[j].insertAdjacentText('afterend', '\n');
      }
      return (doc.body.textContent || '').replace(/\s+\n/g, '\n');
    } catch (_) {
      return html.replace(/<[^>]+>/g, ' ');
    }
  }

  function readUint16LE(view, offset) {
    return view.getUint16(offset, true);
  }

  function readUint32LE(view, offset) {
    return view.getUint32(offset, true);
  }

  async function inflateRawBytes(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream is not supported in this browser');
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
      var fileName = decoder.decode(nameBytes);

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

  async function readZipEntryText(arrayBuffer, entry) {
    if (!entry) return '';
    var view = new DataView(arrayBuffer);
    var off = entry.localHeaderOffset;
    if (readUint32LE(view, off) !== 0x04034b50) {
      throw new Error('Invalid local file header in EPUB');
    }
    var fnLen = readUint16LE(view, off + 26);
    var exLen = readUint16LE(view, off + 28);
    var dataStart = off + 30 + fnLen + exLen;
    var slice = new Uint8Array(arrayBuffer, dataStart, entry.compressedSize);

    var rawBytes;
    if (entry.method === 0) {
      rawBytes = slice;
    } else if (entry.method === 8) {
      rawBytes = await inflateRawBytes(slice);
    } else {
      throw new Error('Unsupported ZIP compression method: ' + entry.method);
    }
    return new TextDecoder('utf-8').decode(rawBytes);
  }

  function resolveZipPath(baseDir, href) {
    if (!href) return '';
    var clean = href.split('#')[0].split('?')[0];
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

  async function extractEpubText(file) {
    var ab = await file.arrayBuffer();
    var entries = parseZipEntries(ab);
    var spinePaths = [];

    if (entries['META-INF/container.xml']) {
      try {
        var containerXml = await readZipEntryText(ab, entries['META-INF/container.xml']);
        var parser = new DOMParser();
        var cDoc = parser.parseFromString(containerXml, 'application/xml');
        var rootEl = cDoc.querySelector('rootfile[full-path]');
        var opfPath = rootEl ? rootEl.getAttribute('full-path') : '';
        if (opfPath && entries[opfPath]) {
          var opfDir = opfPath.indexOf('/') !== -1 ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
          var opfXml = await readZipEntryText(ab, entries[opfPath]);
          var opfDoc = parser.parseFromString(opfXml, 'application/xml');
          var manifestById = {};
          var items = opfDoc.querySelectorAll('manifest > item');
          for (var i = 0; i < items.length; i++) {
            var id = items[i].getAttribute('id');
            var href = items[i].getAttribute('href');
            var media = items[i].getAttribute('media-type') || '';
            if (id && href && (/html|xml/i.test(media) || /\.(x?html?|xml)$/i.test(href))) {
              manifestById[id] = resolveZipPath(opfDir, href);
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

    var chunks = [];
    for (var s = 0; s < spinePaths.length; s++) {
      var html = await readZipEntryText(ab, entries[spinePaths[s]]);
      var text = extractTextFromHtmlString(html);
      if (text && text.trim()) chunks.push(text.trim());
    }
    return chunks.join('\n\n');
  }

  async function ensurePdfjs() {
    if (root._cmtPdfjsLib) return root._cmtPdfjsLib;
    var base = /\/pages\//.test(location.pathname) ? '../modules/' : 'modules/';
    var mod = await import(base + 'pdf.min.mjs');
    mod.GlobalWorkerOptions.workerSrc = new URL(base + 'pdf.worker.min.mjs', location.href).href;
    root._cmtPdfjsLib = mod;
    return mod;
  }

  async function extractPdfText(file) {
    var pdfjsLib = await ensurePdfjs();
    var ab = await file.arrayBuffer();
    var base = /\/pages\//.test(location.pathname) ? '../modules/' : 'modules/';
    var doc = await pdfjsLib.getDocument({
      data: ab,
      standardFontDataUrl: new URL(base + 'standard_fonts/', location.href).href,
      wasmUrl: new URL(base + 'wasm/', location.href).href,
      disableFontFace: false,
      useSystemFonts: false
    }).promise;

    var pages = [];
    for (var p = 1; p <= doc.numPages; p++) {
      var page = await doc.getPage(p);
      var tc = await page.getTextContent();
      var parts = [];
      (tc.items || []).forEach(function (it) {
        if (!it || !it.str) return;
        parts.push(it.str);
        if (it.hasEOL) parts.push('\n');
        else parts.push(' ');
      });
      var pageText = parts.join('').replace(/[ \t]+\n/g, '\n').trim();
      if (pageText) pages.push(pageText);
    }
    return pages.join('\n\n');
  }

  async function extractRawTextFromFile(file) {
    if (!file) throw new Error('No file provided');
    var name = file.name || 'document.txt';
    var ext = name.split('.').pop().toLowerCase();
    var rawText = '';

    if (ext === 'txt') {
      rawText = (await file.text()).replace(/^\uFEFF/, '');
    } else if (ext === 'md' || ext === 'markdown') {
      rawText = stripMarkdown((await file.text()).replace(/^\uFEFF/, ''));
    } else if (ext === 'html' || ext === 'htm' || ext === 'xhtml') {
      rawText = extractTextFromHtmlString((await file.text()).replace(/^\uFEFF/, ''));
    } else if (ext === 'pdf') {
      rawText = await extractPdfText(file);
    } else if (ext === 'epub') {
      rawText = await extractEpubText(file);
    } else {
      throw new Error('Unsupported format: .' + ext + '. Supported: .epub, .pdf, .txt, .md');
    }

    return { ok: true, fileName: name, ext: ext, text: rawText };
  }

  function base64ToUint8Array(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  async function listAppDocumentSources() {
    var results = [];
    if (!root.Desktop || typeof root.Desktop.listByPath !== 'function') {
      return results;
    }

    var sources = [
      { target: 'customBooks', label: 'Books (custom-data/books)', exts: ['.epub', '.pdf', '.txt', '.md', '.markdown', '.html', '.htm'] },
      { target: 'docEditorDocs', label: 'Document Editor', exts: ['.md', '.markdown', '.txt', '.html', '.htm'] }
    ];

    for (var s = 0; s < sources.length; s++) {
      var src = sources[s];
      try {
        var r = await root.Desktop.listByPath(src.target, '', { extensions: src.exts, recursive: true });
        var files = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          var rel = (typeof f === 'string') ? f : (f.relativePath || f.filename || f.name || '');
          if (!rel) continue;
          var baseName = rel.split('/').pop();
          if (src.target === 'docEditorDocs' && root.LinksService && typeof root.LinksService.isDocumentVersionFile === 'function') {
            if (root.LinksService.isDocumentVersionFile(rel, baseName)) continue;
          }
          results.push({
            target: src.target,
            sourceLabel: src.label,
            relativePath: rel,
            name: baseName,
            ext: (baseName.split('.').pop() || '').toLowerCase()
          });
        }
      } catch (_) {}
    }

    results.sort(function (a, b) {
      if (a.target !== b.target) return a.target === 'customBooks' ? -1 : 1;
      return a.relativePath.localeCompare(b.relativePath);
    });
    return results;
  }

  async function extractRawTextFromAppTarget(target, relativePath) {
    if (!root.Desktop || typeof root.Desktop.readByPath !== 'function') {
      throw new Error('App file access requires Desktop mode');
    }
    var name = String(relativePath || '').split('/').pop() || 'document.txt';
    var ext = name.split('.').pop().toLowerCase();
    var isBinary = (ext === 'epub' || ext === 'pdf');
    var res = await root.Desktop.readByPath(target, relativePath, { encoding: isBinary ? 'base64' : 'utf8' });
    if (!res || !res.ok || res.content == null) {
      throw new Error((res && res.error) || ('Could not read ' + relativePath));
    }
    var pseudoFile;
    if (isBinary) {
      var bytes = base64ToUint8Array(res.content);
      pseudoFile = {
        name: name,
        arrayBuffer: async function () { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); },
        text: async function () { return new TextDecoder('utf-8').decode(bytes); }
      };
    } else {
      var textContent = String(res.content);
      pseudoFile = {
        name: name,
        text: async function () { return textContent; },
        arrayBuffer: async function () { return new TextEncoder().encode(textContent).buffer; }
      };
    }
    return await extractRawTextFromFile(pseudoFile);
  }

  async function linkWordbankToDocument(wordbankFilename, docTarget, docRelativePath) {
    if (!root.LinksService || typeof root.LinksService.addLink !== 'function') return false;
    var wbUrn = root.LinksService.makeUrn('wordbanks', wordbankFilename);
    var docId = (docTarget === 'docEditorDocs' ? 'docEditorDocs/' : (docTarget + '/')) + String(docRelativePath || '').replace(/^\/+/, '');
    var docUrn = root.LinksService.makeUrn('doc', docId);
    try {
      await root.LinksService.addLink(wbUrn, docUrn);
      return true;
    } catch (_) {
      return false;
    }
  }

  function buildSentenceIndex(text) {
    var clean = String(text || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
    var rawSentences = clean.split(/(?<=[.!?…])\s+|\n+/);
    var sentences = [];
    for (var i = 0; i < rawSentences.length; i++) {
      var s = rawSentences[i].trim();
      if (s.length >= 4) {
        sentences.push(s.length > 220 ? (s.slice(0, 217).trim() + '...') : s);
      }
    }
    return sentences;
  }

  function analyzeTextToWordbank(text, options) {
    var opts = Object.assign({
      caseMode: 'lower',
      minLength: 2,
      minOccurrences: 1,
      maxWords: 0,
      excludeStopwords: false,
      excludeContractions: false,
      excludeWords: '',
      excludeChars: '',
      sourceLanguage: 'en',
      theme: '',
      includeExample: true,
      sortBy: 'frequency_desc'
    }, options || {});

    var minLen = Math.max(1, parseInt(opts.minLength, 10) || 1);
    var minOcc = Math.max(1, parseInt(opts.minOccurrences, 10) || 1);
    var maxWords = Math.max(0, parseInt(opts.maxWords, 10) || 0);
    var lang = String(opts.sourceLanguage || 'en').trim().toLowerCase();
    var stopSet = (opts.excludeStopwords && STOPWORDS[lang]) ? STOPWORDS[lang] : null;
    var excludeWordSet = new Set(
      String(opts.excludeWords || '')
        .split(/[\s,;]+/)
        .map(function (s) { return s.trim().toLowerCase(); })
        .filter(Boolean)
    );
    var excludeCharsStr = String(opts.excludeChars || '').replace(/\s+/g, '');
    var excludeCharSet = excludeCharsStr ? new Set(Array.from(excludeCharsStr)) : null;

    var wordRegex = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;
    var sentences = opts.includeExample ? buildSentenceIndex(text) : [];
    var sentenceWordsMap = {};

    if (opts.includeExample && sentences.length) {
      for (var si = 0; si < sentences.length; si++) {
        var sent = sentences[si];
        var mList = sent.match(wordRegex);
        if (!mList) continue;
        for (var mi = 0; mi < mList.length; mi++) {
          var keyLower = mList[mi].toLowerCase();
          if (sentenceWordsMap[keyLower] === undefined) {
            sentenceWordsMap[keyLower] = sent;
          }
        }
      }
    }

    var counts = new Map();
    var firstForm = new Map();
    var orderIdx = 0;
    var firstOrder = new Map();
    var totalTokens = 0;
    var match;

    while ((match = wordRegex.exec(text)) !== null) {
      var rawToken = match[0].replace(/^['’\-]+|['’\-]+$/g, '');
      if (!rawToken || rawToken.length < minLen) continue;
      if (opts.excludeContractions && /['’]/.test(rawToken)) continue;
      var lower = rawToken.toLowerCase();
      if (stopSet && stopSet.has(lower)) continue;
      if (excludeWordSet.size && excludeWordSet.has(lower)) continue;
      if (excludeCharSet && Array.from(rawToken).some(function (ch) { return excludeCharSet.has(ch) || excludeCharSet.has(ch.toLowerCase()); })) continue;

      totalTokens++;
      var key = opts.caseMode === 'preserve' ? rawToken : lower;
      if (!counts.has(key)) {
        counts.set(key, 1);
        firstForm.set(key, opts.caseMode === 'preserve' ? rawToken : lower);
        firstOrder.set(key, orderIdx++);
      } else {
        counts.set(key, counts.get(key) + 1);
      }
    }

    var filtered = [];
    counts.forEach(function (cnt, key) {
      if (cnt < minOcc) return;
      filtered.push({
        key: key,
        word: firstForm.get(key),
        occurrences: cnt,
        order: firstOrder.get(key)
      });
    });

    // Compute percentage (of total tokens) and rank percentile (among unique filtered words)
    var totalUnique = filtered.length;
    var countValues = filtered.map(function (item) { return item.occurrences; }).sort(function (a, b) { return a - b; });
    var lowerMap = {};
    var equalMap = {};
    for (var ci = 0; ci < countValues.length; ci++) {
      var val = countValues[ci];
      if (lowerMap[val] === undefined) lowerMap[val] = ci;
      equalMap[val] = (equalMap[val] || 0) + 1;
    }

    var entries = filtered.map(function (item) {
      var pct = totalTokens > 0 ? Math.round((item.occurrences / totalTokens) * 1000000) / 10000 : 0;
      var below = lowerMap[item.occurrences] || 0;
      var eq = equalMap[item.occurrences] || 1;
      var pctl = totalUnique > 0 ? Math.round(((below + 0.5 * eq) / totalUnique) * 1000) / 10 : 100;

      var rec = {
        word: item.word,
        sourceLanguage: lang || 'en',
        occurrences: item.occurrences,
        percentage: pct,
        percentile: pctl
      };
      if (opts.theme && String(opts.theme).trim()) {
        rec.theme = String(opts.theme).trim();
      }
      if (opts.includeExample) {
        var ex = sentenceWordsMap[item.word.toLowerCase()];
        if (ex) rec.exampleSentence = ex;
      }
      rec._order = item.order;
      return rec;
    });

    if (opts.sortBy === 'alpha_asc') {
      entries.sort(function (a, b) { return a.word.localeCompare(b.word); });
    } else if (opts.sortBy === 'appearance') {
      entries.sort(function (a, b) { return a._order - b._order; });
    } else {
      entries.sort(function (a, b) {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        return a.word.localeCompare(b.word);
      });
    }

    if (maxWords > 0 && entries.length > maxWords) {
      entries = entries.slice(0, maxWords);
    }

    entries.forEach(function (e) { delete e._order; });

    return {
      totalTokens: totalTokens,
      uniqueWords: totalUnique,
      returnedWords: entries.length,
      entries: entries
    };
  }

  function toTableRows(entries) {
    var headers = ['word', 'sourceLanguage', 'occurrences', 'percentage', 'percentile', 'theme', 'exampleSentence'];
    var rows = (entries || []).map(function (e) {
      return [
        e.word || '',
        e.sourceLanguage || 'en',
        e.occurrences != null ? e.occurrences : 1,
        e.percentage != null ? e.percentage : 0,
        e.percentile != null ? e.percentile : 0,
        e.theme || '',
        e.exampleSentence || ''
      ];
    });
    return {
      ok: true,
      headers: headers,
      rows: rows,
      rawRows: [headers].concat(rows),
      headerRowIdx: 0,
      isDocumentWords: true
    };
  }

  async function saveWordbankRecords(entries, options) {
    var opts = options || {};
    var filename = String(opts.filename || 'document-wordbank').trim().replace(/\.js$/i, '') + '.js';
    var mode = opts.mode || 'new'; // 'new' | 'existing'
    var conflictMode = opts.conflictMode || 'overwrite'; // 'skip' | 'overwrite'

    var existing = [];
    if (mode === 'existing' && root.Desktop && typeof root.Desktop.readText === 'function') {
      try {
        var r = await root.Desktop.readText('customWordbanks', filename);
        if (r && r.ok && r.content) {
          var fn = new Function(r.content + '; try { return customVocabBank; } catch(e) { return []; }');
          existing = fn() || [];
          if (root.WordbankSchema && typeof root.WordbankSchema.normalizeWordbankArray === 'function') {
            existing = root.WordbankSchema.normalizeWordbankArray(existing);
          }
        }
      } catch (_) { existing = []; }
    }

    var existingByKey = {};
    existing.forEach(function (w, i) {
      var k = String((w && w.word) || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;
    (entries || []).forEach(function (entry) {
      var wordRaw = String((entry && entry.word) || '').trim();
      if (!wordRaw) return;
      var k = wordRaw.toLowerCase();
      var existIdx = existingByKey[k];
      if (existIdx !== undefined) {
        if (conflictMode === 'skip') {
          skipped++;
        } else {
          existing[existIdx] = Object.assign({}, existing[existIdx], entry);
          updated++;
        }
      } else {
        existing.push(Object.assign({}, entry));
        existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var outputRecords = (root.WordbankSchema && typeof root.WordbankSchema.compactWordbankArray === 'function')
      ? root.WordbankSchema.compactWordbankArray(existing)
      : existing;

    var content = 'const customVocabBank = ' + JSON.stringify(outputRecords, null, 2) + ';\n';

    if (root.Desktop && typeof root.Desktop.saveText === 'function') {
      var saveRes = await root.Desktop.saveText('customWordbanks', filename, content);
      if (!saveRes || !saveRes.ok) {
        return { ok: false, error: (saveRes && saveRes.error) || 'Failed to save wordbank file' };
      }
      return { ok: true, filename: filename, added: added, updated: updated, skipped: skipped, total: outputRecords.length };
    }

    // Web fallback download
    var blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return { ok: true, filename: filename, added: added, updated: updated, skipped: skipped, total: outputRecords.length, webDownload: true };
  }

  root.DocumentWordbankExtractor = {
    extractRawTextFromFile: extractRawTextFromFile,
    extractRawTextFromAppTarget: extractRawTextFromAppTarget,
    listAppDocumentSources: listAppDocumentSources,
    linkWordbankToDocument: linkWordbankToDocument,
    analyzeTextToWordbank: analyzeTextToWordbank,
    toTableRows: toTableRows,
    saveWordbankRecords: saveWordbankRecords
  };
})(typeof window !== 'undefined' ? window : globalThis);
