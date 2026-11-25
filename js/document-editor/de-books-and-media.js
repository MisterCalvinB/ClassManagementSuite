function deBookHtmlToText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('p,div,br,h1,h2,h3,h4,h5,h6,li,tr,blockquote').forEach(el => {
    el.insertAdjacentText('afterend', '\n');
  });
  tmp.querySelectorAll('script,style,noscript').forEach(el => el.remove());
  return tmp.innerText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function deZipParse(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const u16 = o => view.getUint16(o, true);
  const u32 = o => view.getUint32(o, true);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (u32(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('Not a valid ZIP/EPUB file.');
  const cdOffset = u32(eocd + 16);
  const cdCount = u16(eocd + 10);
  const entries = [];
  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (u32(pos) !== 0x02014b50) break;
    const compMethod = u16(pos + 10);
    const compSize = u32(pos + 20);
    const nameLen = u16(pos + 28);
    const extraLen = u16(pos + 30);
    const commentLen = u16(pos + 32);
    const localOffset = u32(pos + 42);
    const name = new TextDecoder('utf-8').decode(buf.slice(pos + 46, pos + 46 + nameLen));
    entries.push({ name, compMethod, compSize, localOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, buf, view, u16, u32 };
}

async function deDecompressDeflate(compressedBytes) {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(compressedBytes);
  writer.close();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function deEpubExtractText(arrayBuffer) {
  const zip = deZipParse(arrayBuffer);
  const { buf, view, u16, u32 } = zip;
  async function extractBytes(entry) {
    const lh = entry.localOffset;
    const lNameLen = u16(lh + 26);
    const lExtraLen = u16(lh + 28);
    const dataStart = lh + 30 + lNameLen + lExtraLen;
    const compressed = buf.slice(dataStart, dataStart + entry.compSize);
    if (entry.compMethod === 0) return compressed;
    if (entry.compMethod === 8) return await deDecompressDeflate(compressed);
    throw new Error('Unsupported compression: ' + entry.compMethod);
  }
  async function extractText(entry) {
    return new TextDecoder('utf-8').decode(await extractBytes(entry));
  }
  const containerEntry = zip.entries.find(e => e.name === 'META-INF/container.xml');
  let opfPath = null;
  if (containerEntry) {
    const m = (await extractText(containerEntry)).match(/full-path="([^"]+\.opf)"/i);
    if (m) opfPath = m[1];
  }
  let orderedHtmlEntries = [];
  if (opfPath) {
    const opfEntry = zip.entries.find(e => e.name === opfPath);
    if (opfEntry) {
      const opfXml = await extractText(opfEntry);
      const manifest = {};
      const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
      let mm;
      const manifestRe = /<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*>/gi;
      while ((mm = manifestRe.exec(opfXml)) !== null) manifest[mm[1]] = opfDir + mm[2];
      const spineRe = /<itemref[^>]+idref="([^"]+)"/gi;
      let sm;
      while ((sm = spineRe.exec(opfXml)) !== null) {
        const href = manifest[sm[1]];
        if (href) {
          const e = zip.entries.find(en => en.name === href || en.name === href.replace(/^\//, ''));
          if (e) orderedHtmlEntries.push(e);
        }
      }
    }
  }
  if (!orderedHtmlEntries.length) {
    orderedHtmlEntries = zip.entries.filter(e =>
      /\.(xhtml|html|htm)$/i.test(e.name) && !e.name.includes('toc') && !e.name.includes('nav')
    ).sort((a, b) => a.name.localeCompare(b.name));
  }
  const parts = [];
  for (const entry of orderedHtmlEntries) parts.push(deBookHtmlToText(await extractText(entry)));
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function deBookPopulateDropdown() {
  const sel = document.getElementById('de-book-select');
  if (!sel) return;
  if (!(window.Desktop && Desktop.isElectron && Desktop.isElectron() && typeof Desktop.listFiles === 'function')) return;
  try {
    const result = await Desktop.listFiles('customBooks', { extensions: ['.epub', '.html', '.htm', '.xhtml', '.txt'] });
    const files = result && result.ok && Array.isArray(result.files) ? result.files : [];
    if (!files.length) return;
    files.forEach(file => {
      const opt = document.createElement('option');
      opt.value = file.relativePath || file.filename;
      opt.textContent = String(file.filename).replace(/\.(epub|html?|xhtml|txt)$/i, '');
      sel.appendChild(opt);
    });
    sel.style.display = '';
  } catch (e) {
    console.warn('Could not list customBooks:', e);
  }
}

async function deBookLoadSelected() {
  const sel = document.getElementById('de-book-select');
  if (!sel || !sel.value) return;
  const relativePath = sel.value;
  const label = sel.options[sel.selectedIndex].textContent;
  sel.disabled = true;
  try {
    const result = await Desktop.readByPath('customBooks', relativePath, { encoding: 'base64' });
    if (!result || !result.ok || !result.content) throw new Error(result && result.error ? result.error : 'Could not read file.');
    const binary = atob(result.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const lp = relativePath.toLowerCase();
    let text;
    if (lp.endsWith('.epub')) {
      text = await deEpubExtractText(bytes.buffer);
    } else {
      const rawText = new TextDecoder('utf-8').decode(bytes);
      text = (lp.endsWith('.html') || lp.endsWith('.htm') || lp.endsWith('.xhtml'))
        ? deBookHtmlToText(rawText)
        : rawText.trim();
    }
    if (!text) throw new Error('No readable text found.');
    deBookOpenModal(text, label);
  } catch (e) {
    showToast('Could not load book: ' + e.message, true);
  } finally {
    sel.disabled = false;
    sel.value = '';
  }
}

let _deBookSearchMatches = [];
let _deBookSearchIdx = -1;

function deBookOpenModal(text, label) {
  document.getElementById('de-book-modal-title').textContent = ' ' + label;
  const ta = document.getElementById('de-book-modal-text');
  ta.value = text;
  ta.onselect = ta.onmouseup = ta.onkeyup = deBookUpdateInsertBtn;
  ta.onkeydown = function (e) {
    if (e.key === 'Enter') { e.preventDefault(); deBookSearchStep(e.shiftKey ? -1 : 1); }
  };
  document.getElementById('de-book-modal-insert').disabled = true;
  document.getElementById('de-book-search-input').value = '';
  document.getElementById('de-book-search-count').textContent = '';
  document.getElementById('de-book-search-prev').disabled = true;
  document.getElementById('de-book-search-next').disabled = true;
  _deBookSearchMatches = [];
  _deBookSearchIdx = -1;
  document.getElementById('de-book-overlay').classList.add('active');
  document.getElementById('de-book-search-input').focus();
}

function deBookUpdateInsertBtn() {
  const ta = document.getElementById('de-book-modal-text');
  document.getElementById('de-book-modal-insert').disabled = ta.selectionStart === ta.selectionEnd;
}

function deBookSearchRun() {
  const query = document.getElementById('de-book-search-input').value;
  const ta = document.getElementById('de-book-modal-text');
  const countEl = document.getElementById('de-book-search-count');
  _deBookSearchMatches = [];
  _deBookSearchIdx = -1;
  if (!query) {
    countEl.textContent = '';
    document.getElementById('de-book-search-prev').disabled = true;
    document.getElementById('de-book-search-next').disabled = true;
    return;
  }
  const text = ta.value;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let pos = 0;
  while (true) {
    const idx = lower.indexOf(q, pos);
    if (idx === -1) break;
    _deBookSearchMatches.push(idx);
    pos = idx + 1;
  }
  const hasMatches = _deBookSearchMatches.length > 0;
  document.getElementById('de-book-search-prev').disabled = !hasMatches;
  document.getElementById('de-book-search-next').disabled = !hasMatches;
  if (hasMatches) {
    _deBookSearchIdx = 0;
    deBookSearchHighlight(query.length);
    countEl.textContent = _deBookSearchMatches.length + ' match' + (_deBookSearchMatches.length !== 1 ? 'es' : '') + ' — press Enter ↵';
  } else {
    countEl.textContent = 'No matches';
  }
}

function deBookSearchStep(dir) {
  if (!_deBookSearchMatches.length) return;
  _deBookSearchIdx = (_deBookSearchIdx + dir + _deBookSearchMatches.length) % _deBookSearchMatches.length;
  const query = document.getElementById('de-book-search-input').value;
  deBookSearchHighlight(query.length);
  document.getElementById('de-book-modal-text').focus();
}

function deBookScrollToPos(pos) {
  const ta = document.getElementById('de-book-modal-text');
  const style = window.getComputedStyle(ta);
  const mirror = document.createElement('div');
  mirror.style.cssText =
    'position:absolute;visibility:hidden;overflow:hidden;white-space:pre-wrap;word-wrap:break-word;' +
    'width:' + ta.clientWidth + 'px;' +
    'padding:' + style.padding + ';' +
    'font:' + style.font + ';' +
    'line-height:' + style.lineHeight + ';';
  mirror.textContent = ta.value.substring(0, pos);
  document.body.appendChild(mirror);
  const top = mirror.scrollHeight;
  document.body.removeChild(mirror);
  ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
}

function deBookSearchHighlight(len) {
  const ta = document.getElementById('de-book-modal-text');
  const start = _deBookSearchMatches[_deBookSearchIdx];
  ta.setSelectionRange(start, start + len);
  deBookScrollToPos(start);
  deBookUpdateInsertBtn();
  document.getElementById('de-book-search-count').textContent =
    (_deBookSearchIdx + 1) + ' / ' + _deBookSearchMatches.length;
}

function deBookSearchKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    deBookSearchStep(e.shiftKey ? -1 : 1);
  }
}

function deBookInsertSelection() {
  const ta = document.getElementById('de-book-modal-text');
  const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
  if (!selected) return;
  insertTextAtCursor(selected);
  deBookCloseModal();
  showToast('Text inserted');
}

function deBookCloseModal() {
  document.getElementById('de-book-overlay').classList.remove('active');
}

// ── Table insert ──────────────────────────────────────────
function insertTable(cols, rows) {
  if (currentViewMode === 'wysiwyg' && currentDocType === 'html') {
    let tableHtml = '<table><thead><tr>';
    for (let c = 1; c <= cols; c++) tableHtml += '<th>Header ' + c + '</th>';
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= cols; c++) tableHtml += '<td>Cell</td>';
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    if (typeof deExecCmd === 'function') {
      deExecCmd('insertHTML', tableHtml);
    }
    return;
  }
  if (currentDocType === 'html') {
    let tableHtml = '<table>\n <thead>\n <tr>\n';
    for (let c = 1; c <= cols; c++) tableHtml += ' <th>Header ' + c + '</th>\n';
    tableHtml += ' </tr>\n </thead>\n <tbody>\n';
    for (let r = 1; r <= rows; r++) {
      tableHtml += ' <tr>\n';
      for (let c = 1; c <= cols; c++) tableHtml += ' <td>Cell</td>\n';
      tableHtml += ' </tr>\n';
    }
    tableHtml += ' </tbody>\n</table>\n';
    insertTextAtCursor('\n' + tableHtml + '\n');
    return;
  }
  const header = '| ' + Array.from({ length: cols }, (_, i) => 'Col ' + (i + 1)).join(' | ') + ' |';
  const sep = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |';
  const row = '| ' + Array.from({ length: cols }, () => ' ').join(' | ') + ' |';
  const lines = [header, sep, ...Array.from({ length: rows }, () => row)];
  insertTextAtCursor('\n' + lines.join('\n') + '\n');
}

function dePromptInsertSpreadsheet() {
  const input = document.getElementById('de-spreadsheet-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

async function deHandleSpreadsheetSelect(evt) {
  const file = evt.target && evt.target.files && evt.target.files[0];
  if (!file) return;
  await deImportSpreadsheetFile(file);
  evt.target.value = '';
}

async function deImportSpreadsheetFile(file) {
  if (typeof XLSX === 'undefined') {
    showToast('Spreadsheet engine (XLSX) not available.', true);
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    if (!wb || !wb.SheetNames || !wb.SheetNames.length) {
      showToast('No sheets found in spreadsheet.', true);
      return;
    }
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!rawRows || !rawRows.length) {
      showToast('Spreadsheet sheet is empty.', true);
      return;
    }
    const rows = rawRows.filter(r => Array.isArray(r) && r.some(c => c != null && String(c).trim() !== ''));
    if (!rows.length) {
      showToast('Spreadsheet contains no data rows.', true);
      return;
    }
    const maxCols = Math.max(...rows.map(r => r.length));
    if (maxCols === 0) return;

    const headers = Array.from({ length: maxCols }, (_, i) => {
      const val = rows[0][i];
      return (val != null && String(val).trim()) ? String(val).replace(/\|/g, '\\|').trim() : ('Col ' + (i + 1));
    });
    const sep = Array.from({ length: maxCols }, () => '---');
    const lines = [
      '| ' + headers.join(' | ') + ' |',
      '| ' + sep.join(' | ') + ' |'
    ];

    for (let i = 1; i < rows.length; i++) {
      const rowVals = Array.from({ length: maxCols }, (_, c) => {
        const v = rows[i][c];
        return (v != null ? String(v) : '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
      });
      lines.push('| ' + rowVals.join(' | ') + ' |');
    }

    const mdTable = lines.join('\n');
    insertTextAtCursor('\n' + mdTable + '\n');
    showToast((t('deSpreadsheetImportSuccess') || 'Imported table from ') + (file.name || 'spreadsheet'));
  } catch (err) {
    console.error('Failed to parse spreadsheet', err);
    showToast('Could not import spreadsheet: ' + (err && err.message ? err.message : String(err)), true);
  }
}

function initTablePicker() {
  const grid = document.getElementById('tg-grid');
  const label = document.getElementById('tg-label');
  const COLS = 6, ROWS = 6;

  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const cell = document.createElement('span');
      cell.className = 'tg-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      grid.appendChild(cell);
    }
  }

  grid.addEventListener('mousemove', function (e) {
    const cell = e.target.closest('.tg-cell');
    if (!cell) return;
    const hr = +cell.dataset.r, hc = +cell.dataset.c;
    label.textContent = hc + ' × ' + hr + ' table';
    grid.querySelectorAll('.tg-cell').forEach(el => {
      el.classList.toggle('active', +el.dataset.r <= hr && +el.dataset.c <= hc);
    });
  });

  grid.addEventListener('mouseleave', function () {
    grid.querySelectorAll('.tg-cell').forEach(el => el.classList.remove('active'));
    label.textContent = '—';
  });

  grid.addEventListener('click', function (e) {
    const cell = e.target.closest('.tg-cell');
    if (!cell) return;
    const rows = +cell.dataset.r, cols = +cell.dataset.c;
    document.getElementById('table-insert-wrap').classList.remove('open');
    insertTable(cols, rows);
  });
}

// ── Image insert & paste handling ─────────────────────────
const IMAGE_MIME_MAP = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  bmp: 'image/bmp', avif: 'image/avif'
};

function getImageExtFromMime(mimeType) {
  if (!mimeType) return 'png';
  const m = mimeType.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('svg')) return 'svg';
  if (m.includes('bmp')) return 'bmp';
  if (m.includes('avif')) return 'avif';
  return 'png';
}

async function fixPreviewImages(container) {
  if (!container) return;
  if (!window.Desktop || !Desktop.isElectron()) return;
  const imgs = container.querySelectorAll('img[src]');
  await Promise.all([...imgs].map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:') || src.startsWith('http://') ||
      src.startsWith('https://') || src.startsWith('//')) return;
    const relativePath = decodeURIComponent(src.replace(/\?.*$/, ''));
    const filename = relativePath.split('/').pop();
    if (!filename) return;
    try {
      let r = await Desktop.readByPath('docEditorDocs', relativePath, { encoding: 'base64' });
      if ((!r || !r.ok || !r.content) && currentDocSubdir && !relativePath.startsWith(currentDocSubdir + '/')) {
        r = await Desktop.readByPath('docEditorDocs', currentDocSubdir + '/' + relativePath, { encoding: 'base64' });
      }
      if (r && r.content) {
        const ext = (filename.split('.').pop() || 'png').toLowerCase();
        img.src = 'data:' + (IMAGE_MIME_MAP[ext] || 'image/png') + ';base64,' + r.content;
      }
    } catch (e) { }
  }));
}

async function deInlineAllImages(containerOrHtml) {
  if (!containerOrHtml) return containerOrHtml;
  let div;
  let isHtmlString = false;
  if (typeof containerOrHtml === 'string') {
    div = document.createElement('div');
    div.innerHTML = containerOrHtml;
    isHtmlString = true;
  } else {
    div = containerOrHtml;
  }
  await fixPreviewImages(div);
  return isHtmlString ? div.innerHTML : div;
}

async function embedImageFile(file) {
  if (!file || !(file.type && file.type.startsWith('image/')) && !file.name) return;
  const mimeExt = getImageExtFromMime(file.type);
  
  let rawName = (file.name || '').trim();
  const isGenericName = !rawName || rawName === 'image.png' || rawName === 'image.jpg' ||
    rawName === 'image.jpeg' || rawName === 'blob' || rawName === 'image' || !rawName.includes('.');

  let name;
  if (isGenericName) {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + Date.now().toString().slice(-6);
    name = `pasted_image_${stamp}.${mimeExt}`;
  } else {
    name = rawName.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '');
    if (!name.includes('.')) name += `.${mimeExt}`;
  }

  if (window.Desktop && Desktop.isElectron()) {
    try {
      const r = await Desktop.saveBlob('docEditorDocs', name, file, currentDocSubdir);
      if (r && r.ok) {
        const filename = (r.file && r.file.filename) ? r.file.filename : name;
        const imgPath = currentDocSubdir ? currentDocSubdir + '/' + filename : filename;
        const altText = filename.replace(/\.[^.]+$/, '');
        const imgHtml = '<img src="' + escHtml(imgPath) + '" alt="' + escHtml(altText) + '" />';
        if (currentViewMode === 'wysiwyg' && currentDocType === 'html') {
          if (typeof deExecCmd === 'function') deExecCmd('insertHTML', imgHtml);
        } else if (currentDocType === 'html') {
          insertTextAtCursor('\n' + imgHtml + '\n');
        } else {
          insertTextAtCursor('\n![' + altText + '](' + imgPath + ')\n');
        }
        scheduleRender();
        showToast((t('deImageSaved') || 'Image saved: ') + name);
      } else {
        showToast((t('deImageSaveFailed') || 'Image save failed: ') + (r && r.error ? r.error : 'unknown'), true);
      }
    } catch (e) {
      showToast((t('deImageError') || 'Image error: ') + e.message, true);
    }
  } else {
    // Non-Electron fallback: embed as base64 data URL
    const reader = new FileReader();
    reader.onload = function (ev) {
      const altText = name.replace(/\.[^.]+$/, '') || 'image';
      const imgHtml = '<img src="' + ev.target.result + '" alt="' + escHtml(altText) + '" />';
      if (currentViewMode === 'wysiwyg' && currentDocType === 'html') {
        if (typeof deExecCmd === 'function') deExecCmd('insertHTML', imgHtml);
      } else if (currentDocType === 'html') {
        insertTextAtCursor('\n' + imgHtml + '\n');
      } else {
        insertTextAtCursor('\n![' + altText + '](' + ev.target.result + ')\n');
      }
      scheduleRender();
      showToast(t('deImageEmbedded') || 'Image embedded');
    };
    reader.readAsDataURL(file);
  }
}

function initImageDrop() {
  const overlay = document.getElementById('img-drop-overlay');
  const mainSplit = document.getElementById('main-split');
  let dragDepth = 0;

  mainSplit.addEventListener('dragenter', function (e) {
    const dt = e.dataTransfer;
    if (!dt || ![...dt.types].includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    overlay.classList.add('active');
  });

  mainSplit.addEventListener('dragleave', function () {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) overlay.classList.remove('active');
  });

  mainSplit.addEventListener('dragover', function (e) {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  });

  mainSplit.addEventListener('drop', async function (e) {
    dragDepth = 0;
    overlay.classList.remove('active');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    const fileList = Array.from(files);
    const odtFile = fileList.find(f => (f.name || '').toLowerCase().endsWith('.odt'));
    if (odtFile) {
      e.preventDefault();
      if (odtFile.path) {
        await loadExternalDocByAbsPath(odtFile.path);
      } else {
        showToast('Opening dropped ODT requires file path.', true);
      }
      return;
    }
    const sheetFile = fileList.find(f => /\.(ods|xlsx|xls|csv)$/i.test(f.name || ''));
    if (sheetFile) {
      e.preventDefault();
      await deImportSpreadsheetFile(sheetFile);
      return;
    }
    const imgFile = fileList.find(f => f.type && f.type.startsWith('image/'));
    if (imgFile) { e.preventDefault(); embedImageFile(imgFile); }
  });
}

function initImagePaste() {
  window.addEventListener('paste', function (e) {
    if (e.target && e.target.closest && e.target.closest('#db-panel-wrapper, #db-import-modal')) {
      return;
    }
    const cd = e.clipboardData || window.clipboardData;
    if (!cd) return;

    const items = Array.from(cd.items || []);
    const files = Array.from(cd.files || []);

    const imgItem = items.find(it => it.kind === 'file' && it.type && it.type.startsWith('image/'));
    const imgFile = imgItem ? imgItem.getAsFile() : files.find(f => f.type && f.type.startsWith('image/'));

    if (imgFile) {
      e.preventDefault();
      e.stopPropagation();
      embedImageFile(imgFile);
    }
  }, true);
}

// ── Monaco init ──────────────────────────────────────────
if (new URLSearchParams(window.location.search).get('presentation') !== '1') {
  require.config({ paths: { vs: '../modules/monaco-editor/min/vs' } });

  require(['vs/editor/editor.main'], async function () {
  if (typeof registerTypstLanguage === 'function') {
    registerTypstLanguage(monaco);
  }

  monaco.editor.defineTheme('cmt-markdown', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.md', foreground: 'c0397a' }, // # headings
      { token: 'strong.md', foreground: 'c0397a' }, // **bold** markers
      { token: 'emphasis.md', foreground: 'c0397a' }, // _italic_ markers
      { token: 'keyword.heading', foreground: '0d9488', fontStyle: 'bold' },
      { token: 'string.math', foreground: '2563eb' },
      { token: 'tag', foreground: 'd97706' },
      { token: 'type.identifier', foreground: '7c3aed' }
    ],
    colors: {}
  });

  mdEditor = monaco.editor.create(
    document.getElementById('md-editor-container'),
    {
      value: '',
      language: 'markdown',
      theme: 'cmt-markdown',
      wordWrap: 'on',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      renderWhitespace: 'none',
    }
  );

  cssEditor = monaco.editor.create(
    document.getElementById('css-editor-container'),
    {
      value: '',
      language: 'css',
      theme: 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'off',
      scrollBeyondLastLine: false,
      automaticLayout: true,
    }
  );

  scriptEditor = monaco.editor.create(
    document.getElementById('script-editor-container'),
    {
      value: deScriptTextCache || '',
      language: 'javascript',
      theme: 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
    }
  );
  scriptEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveDoc);
  scriptEditor.onDidChangeModelContent(function () {
    if (deScriptSetting) return;
    scriptModified = true;
    docModified = true;
    if (typeof updateDocIndicator === 'function') updateDocIndicator();
  });

  mdEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveDoc);
  mdEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => openSyntaxHelpModal());
  mdEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, newDoc);

  mdEditor.addAction({
    id: 'cmt-add-to-syntax-snippets',
    label: window.t ? t('deCtxAddToSnippets') : 'Add Selection to Syntax Snippets…',
    keybindings: [],
    precondition: 'editorHasSelection',
    contextMenuGroupId: '1_snippets',
    contextMenuOrder: 1.1,
    run: function (ed) {
      const sel = ed.getSelection();
      const text = ed.getModel().getValueInRange(sel);
      if (!text || !text.trim()) {
        showToast(window.t ? t('dePleaseSelectText') : 'Please select some text first', true);
        return;
      }
      openAddSyntaxSnippetModal(text.trim(), currentDocType);
    }
  });

  mdEditor.addAction({
    id: 'cmt-add-to-custom-css',
    label: window.t ? t('deCtxAddToCustomCss') : 'Add Selection to Custom CSS…',
    keybindings: [],
    precondition: 'editorHasSelection',
    contextMenuGroupId: '1_snippets',
    contextMenuOrder: 1.2,
    run: function (ed) {
      const sel = ed.getSelection();
      const text = ed.getModel().getValueInRange(sel);
      if (!text || !text.trim()) {
        showToast(window.t ? t('dePleaseSelectText') : 'Please select some text first', true);
        return;
      }
      openAddCustomCssModal(text.trim());
    }
  });

  mdEditor.addAction({
    id: 'cmt-lookup-word-in-dictionary',
    label: window.t ? t('deLookupInDict', 'Look up in Quick Dictionary') : 'Look up in Quick Dictionary',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
    contextMenuGroupId: '1_snippets',
    contextMenuOrder: 1.3,
    run: function (ed) {
      const sel = ed.getSelection();
      const text = ed.getModel().getValueInRange(sel);
      deLookupWordInDictionary(text);
    }
  });

  cssEditor.addAction({
    id: 'cmt-css-add-to-custom-css-rules',
    label: window.t ? t('deCtxSaveToCssRules') : 'Save Selection to Custom CSS Rules Library…',
    keybindings: [],
    precondition: 'editorHasSelection',
    contextMenuGroupId: '1_snippets',
    contextMenuOrder: 1.1,
    run: function (ed) {
      const sel = ed.getSelection();
      const text = ed.getModel().getValueInRange(sel);
      if (!text || !text.trim()) {
        showToast(window.t ? t('dePleaseSelectText') : 'Please select some text first', true);
        return;
      }
      openAddCustomCssModal(text.trim());
    }
  });

  mdEditor.onDidChangeModelContent(function () {
    if (wysiwygIsUpdatingFromEditor) return;
    if (mdHighlightDecorations.length > 0) {
      mdHighlightDecorations = mdEditor.deltaDecorations(mdHighlightDecorations, []);
    }
    docModified = true;
    updateDocIndicator();
    scheduleRender();
    checkTypingTriggers();
  });

  cssEditor.onDidChangeModelContent(function () {
    cssModified = true;
    if (cssHighlightDecorations.length > 0) {
      cssHighlightDecorations = cssEditor.deltaDecorations(cssHighlightDecorations, []);
    }
    currentStylesheetName = '@inline@';
    const cssText = cssEditor.getValue();
    document.getElementById('custom-css-style').textContent = deBuildScopedPreviewCss(cssText, '#preview-content');
    const fpCss = document.getElementById('full-preview-custom-css');
    if (fpCss) fpCss.textContent = deBuildScopedPreviewCss(cssText, '#full-preview-content');
    if (!window._deInspectorApplyingCss) scheduleRender();
    if (!deSyncingLayoutCss) {
      const parsed = deParsePageLayoutFromCss(cssText);
      if (parsed.found) {
        pageLayout = parsed.layout;
        syncPopupToState();
        applyPageLayoutToPreview();
        updatePreviewFooter();
      }
    }
  });

  renderPreview();
  await loadPersistedState();
  await openFromQueryParams(_initialSearchParams);
});
}

// ── Document management ──────────────────────────────────
