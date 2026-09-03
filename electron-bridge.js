(function () {
  function getDesktopApi() { return window.electronApi; }

  function isElectron() {
    const desktopApi = getDesktopApi();
    return !!(desktopApi && desktopApi.isElectron);
  }

  async function saveText(target, filename, content, subdir = null) {
    if (!isElectron()) {
      return null;
    }
    const req = { target, filename, content, encoding: "utf8" };
    if (subdir) {
      req.subdir = subdir;
    } else if (typeof filename === 'string' && (filename.includes('/') || filename.includes('\\'))) {
      const parts = filename.replace(/\\/g, '/').split('/');
      const fn = parts.pop();
      const sd = parts.join('/');
      if (sd) {
        req.filename = fn;
        req.subdir = sd;
      }
    }
    return getDesktopApi().saveFile(req);
  }

  async function saveJson(target, filename, data) {
    return saveText(target, filename, JSON.stringify(data, null, 2));
  }

  async function saveBlob(target, filename, blob, subdir = null) {
    if (!isElectron()) {
      return null;
    }

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
    }

    const request = {
      target,
      filename,
      content: btoa(binary),
      encoding: "base64"
    };
    if (subdir) request.subdir = subdir;
    return getDesktopApi().saveFile(request);
  }

  function _pathToUrl(filePath) {
    if (!filePath) return "";
    let str = "";
    if (typeof filePath === "string") {
      str = filePath;
    } else if (typeof filePath === "object" && filePath !== null) {
      str = filePath.path || filePath.filepath || filePath.filename || "";
    } else {
      str = String(filePath);
    }
    if (!str) return "";
    if (str.startsWith("data:") || str.startsWith("http://") || str.startsWith("https://") || str.startsWith("file://")) {
      return str;
    }
    let p = str.replace(/\\/g, "/");
    if (!p.startsWith("/")) p = "/" + p;
    return "file://" + encodeURI(p).replace(/#/g, "%23").replace(/\?/g, "%3F");
  }

  async function resolvePath(target, relativePath) {
    if (!isElectron()) return null;
    try {
      const res = await getDesktopApi().resolvePath({ target, relativePath });
      return res?.path ? _pathToUrl(res.path) : null;
    } catch (_) {
      return null;
    }
  }

  async function saveFile(req) {
    if (!isElectron()) return null;
    let target = req.target || "user";
    let subdir = req.subdir || null;
    if (req.folder) {
      const parts = String(req.folder).replace(/\\/g, "/").split("/");
      if (parts[0] === "user") {
        target = "user";
        subdir = parts.slice(1).join("/");
      } else {
        subdir = req.folder;
      }
    }
    let content = req.content || "";
    let encoding = req.encoding || "utf8";
    if (typeof content === "string" && content.startsWith("data:")) {
      const commaIdx = content.indexOf(",");
      if (commaIdx !== -1) {
        content = content.substring(commaIdx + 1);
        encoding = "base64";
      }
    }
    const result = await getDesktopApi().saveFile({
      target,
      filename: req.filename,
      content,
      encoding,
      subdir
    });
    const savedAbsFile = result?.file || (result?.ok ? req.filename : null);
    const fileUrl = savedAbsFile ? _pathToUrl(savedAbsFile) : null;
    const relativeSavedPath = subdir ? `${target}/${subdir}/${req.filename}` : `${target}/${req.filename}`;
    return { ok: !!(result && result.ok !== false), path: relativeSavedPath, fileUrl, file: savedAbsFile, ...result };
  }

  async function saveFiles(target, files) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().saveFiles({
      target,
      files: files.map((file) => ({
        filename: file.filename,
        subdir: file.subdir || undefined,
        content: file.content,
        encoding: file.encoding || "utf8",
        mtimeMs: file.mtimeMs || undefined
      }))
    });
  }

  async function updateSessionContext(context) {
    if (!isElectron()) return null;
    return getDesktopApi().updateSessionContext(context);
  }

  async function getSessionState() {
    if (!isElectron()) return null;
    return getDesktopApi().getSessionState();
  }

  async function saveBoardArchive(target, filename, entries, subdir) {
    if (!isElectron()) return null;
    return getDesktopApi().saveBoardArchive({
      target: target || 'mindmaps',
      filename,
      subdir: subdir || undefined,
      entries: Array.isArray(entries) ? entries : []
    });
  }

  async function readBoardArchive(target, relativePath) {
    if (!isElectron()) return null;
    return getDesktopApi().readBoardArchive({
      target: target || 'mindmaps',
      relativePath
    });
  }

  async function inspectBoardArchive(target, relativePath) {
    if (!isElectron()) return null;
    return getDesktopApi().inspectBoardArchive({
      target: target || 'mindmaps',
      relativePath
    });
  }

  async function listFiles(target, options = {}) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().listFiles({
      target,
      extensions: Array.isArray(options.extensions) ? options.extensions : [".js", ".json"]
    });
  }

  async function listByPath(target, relativePath, options = {}) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().listByPath({
      target,
      relativePath,
      extensions: Array.isArray(options.extensions) ? options.extensions : [],
      recursive: options.recursive !== false,
      includeDirectories: options.includeDirectories === true
    });
  }

  async function createDirectoryByPath(target, relativePath) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().createDirectoryByPath({
      target,
      relativePath
    });
  }

  async function readText(target, filename) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().readFile({
      target,
      filename,
      encoding: "utf8"
    });
  }

  async function resolvePath(target, relativePath) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().resolvePath({
      target,
      relativePath
    });
  }

  async function readByPath(target, relativePath, options = {}) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().readByPath({
      target,
      relativePath,
      encoding: options.encoding || "utf8"
    });
  }

  async function openHtml(request) {
    if (!isElectron()) return null;
    return getDesktopApi().openHtml(request);
  }

  async function printHtml(request) {
    if (!isElectron()) return null;
    if (typeof request === 'string') {
      request = { html: request };
    }
    return getDesktopApi().printHtml(request);
  }

  async function migrateClassUuids() {
    if (!isElectron()) return null;
    return getDesktopApi().migrateClassUuids();
  }

  async function fetchUrl(url) {
    if (isElectron() && getDesktopApi() && typeof getDesktopApi().fetchUrl === 'function') {
      return getDesktopApi().fetchUrl({ url });
    }
    // Web fallback
    try {
      let fetchUrl = String(url || '').trim();
      if (fetchUrl.startsWith('webcal://')) fetchUrl = 'https://' + fetchUrl.slice(9);
      const resp = await fetch(fetchUrl, { method: 'GET', cache: 'no-cache' });
      if (!resp.ok) return { ok: false, status: resp.status, error: `HTTP ${resp.status} ${resp.statusText || ''}` };
      const content = await resp.text();
      return { ok: true, content, status: resp.status };
    } catch (e) {
      return { ok: false, error: e.message || 'Fetch failed' };
    }
  }

  async function resetSyncBaseline() {
    if (!isElectron()) return null;
    return getDesktopApi().resetSyncBaseline();
  }

  async function runSync(request) {
    if (!isElectron()) return null;
    return getDesktopApi().runSync(request);
  }

  async function renameFile(target, oldFilename, newFilename) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().renameFile({ target, oldFilename, newFilename });
  }

  async function renameByPath(target, oldRelativePath, newRelativePath) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().renameByPath({ target, oldRelativePath, newRelativePath });
  }

  async function statByPath(target, relativePath) {
    if (!isElectron()) {
      return null;
    }

    var api = getDesktopApi();
    if (!api || typeof api.statByPath !== 'function') {
      return { ok: false, error: 'statByPath API unavailable' };
    }
    return api.statByPath({ target, relativePath });
  }

  async function copyByPath(sourceTarget, sourceRelativePath, destinationTarget, destinationRelativePath, options = {}) {
    if (!isElectron()) {
      return null;
    }

    var api = getDesktopApi();
    if (!api || typeof api.copyByPath !== 'function') {
      return { ok: false, error: 'copyByPath API unavailable' };
    }
    return api.copyByPath({
      sourceTarget,
      sourceRelativePath,
      destinationTarget,
      destinationRelativePath,
      replace: options.replace === true
    });
  }

  async function moveByPath(sourceTarget, sourceRelativePath, destinationTarget, destinationRelativePath, options = {}) {
    if (!isElectron()) {
      return null;
    }

    var api = getDesktopApi();
    if (!api || typeof api.moveByPath !== 'function') {
      return { ok: false, error: 'moveByPath API unavailable' };
    }
    return api.moveByPath({
      sourceTarget,
      sourceRelativePath,
      destinationTarget,
      destinationRelativePath,
      replace: options.replace === true
    });
  }

  async function deleteFile(target, filename, options = {}) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().deleteFile({ target, filename, ...options });
  }

  async function deleteByPath(target, relativePath, options = {}) {
    if (!isElectron()) {
      return null;
    }

    return getDesktopApi().deleteByPath({ target, relativePath, ...options });
  }

  async function openNative(target, relativePath) {
    if (!isElectron()) return null;
    if (typeof target === 'object' && target !== null) {
      return getDesktopApi().openNative(target);
    }
    return getDesktopApi().openNative({ target, relativePath });
  }

  async function showInFolder(target, relativePath) {
    if (!isElectron()) return null;
    if (typeof target === 'object' && target !== null) {
      return getDesktopApi().showInFolder(target);
    }
    return getDesktopApi().showInFolder({ target, relativePath });
  }

  async function duplicateByPath(target, relativePath) {
    if (!isElectron()) return null;
    return getDesktopApi().duplicateByPath({ target, relativePath });
  }

  async function pickAndReadFile(filters) {
    if (!isElectron()) return null;
    return getDesktopApi().pickAndReadFile({ filters: filters || [] });
  }

  async function saveToDisk(request) {
    if (!isElectron()) return null;
    return getDesktopApi().saveToDisk(request || {});
  }

  async function pickFolder(options) {
    if (!isElectron()) return { ok: false, canceled: true };
    return getDesktopApi().pickFolder(options || {});
  }

  async function pickAndCopyFiles(target, options) {
    if (!isElectron()) return null;
    return getDesktopApi().pickAndCopyFiles({
      target,
      subdir: (options && options.subdir) || null,
      filters: (options && options.filters) || [],
      title: (options && options.title) || null
    });
  }

  async function zipAndDeleteArchived(target, items, zipFilename, subdir) {
    if (!isElectron()) return null;
    return getDesktopApi().zipAndDeleteArchived({
      target: target || 'mindmaps',
      items: Array.isArray(items) ? items : [],
      zipFilename,
      subdir: subdir || 'archived'
    });
  }

  function extractWrappedJsonValue(rawText) {
    const normalized = String(rawText || "");
    const assignmentMatch = normalized.match(/(?:window\.[A-Za-z_$][\w$]*\s*=\s*|const\s+[A-Za-z_$][\w$]*\s*=\s*|let\s+[A-Za-z_$][\w$]*\s*=\s*|var\s+[A-Za-z_$][\w$]*\s*=\s*|export\s+default\s+)/m);
    if (!assignmentMatch) {
      return null;
    }

    let start = assignmentMatch.index + assignmentMatch[0].length;
    while (/\s/.test(normalized[start] || "")) start += 1;

    const opener = normalized[start];
    const closer = opener === "{" ? "}" : opener === "[" ? "]" : null;
    if (!closer) {
      return null;
    }

    let depth = 0;
    let quote = "";
    let escaped = false;

    for (let index = start; index < normalized.length; index += 1) {
      const char = normalized[index];

      if (quote) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === quote) {
          quote = "";
        }
        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }

      if (char === opener) {
        depth += 1;
        continue;
      }

      if (char === closer) {
        depth -= 1;
        if (depth === 0) {
          return normalized.slice(start, index + 1);
        }
      }
    }

    return null;
  }

  function parseJsonLikeContent(rawContent, file) {
    const rawText = String(rawContent || "");
    const normalized = rawText.replace(/^\uFEFF/, "").trim();
    const hadNormalizationChanges = normalized !== rawText;

    const success = (data, reason = null) => ({
      ok: true,
      file,
      data,
      repair: reason || hadNormalizationChanges
        ? { recommended: true, reason: reason || "normalized-content" }
        : null
    });

    try {
      return success(JSON.parse(normalized));
    } catch (error) {
      if (normalized.startsWith('"') && normalized.endsWith('"') && normalized.length >= 2) {
        try {
          return success(JSON.parse(normalized.slice(1, -1)), "quoted-json-string");
        } catch {}
      }

      const wrappedValue = extractWrappedJsonValue(normalized);
      if (wrappedValue) {
        try {
          return success(JSON.parse(wrappedValue), "js-wrapper");
        } catch {}
      }

      return {
        ok: false,
        error: error && error.message ? error.message : "Invalid JSON content."
      };
    }
  }

  async function readJson(target, filename) {
    const result = await readText(target, filename);
    if (!result || !result.ok) {
      return result;
    }

    return parseJsonLikeContent(result.content, result.file);
  }

  async function openHtmlWindow(html, opts = {}) {
    if (!isElectron()) return null;
    return getDesktopApi().openHtml({ html, width: opts.width, height: opts.height });
  }

  async function printHtmlWindow(html) {
    if (!isElectron()) return null;
    return getDesktopApi().printHtml({ html });
  }

  async function openMirrorWindow(opts) {
    if (!isElectron()) return null;
    return getDesktopApi().openMirrorWindow(opts || {});
  }

  async function mirrorWindowCommand(command) {
    if (!isElectron()) return null;
    return getDesktopApi().mirrorWindowCommand(command);
  }

  async function hasSecondDisplay() {
    if (!isElectron()) return false;
    const api = getDesktopApi();
    if (api && typeof api.hasSecondDisplay === 'function') {
      return api.hasSecondDisplay();
    }
    return false;
  }

  function onDisplayChanged(callback) {
    if (!isElectron()) return;
    const api = getDesktopApi();
    if (api && typeof api.onDisplayChanged === 'function') {
      api.onDisplayChanged(callback);
    }
  }

  async function openCmsPresentation(opts) {
    if (!isElectron()) return null;
    return getDesktopApi().openCmsPresentation(opts || {});
  }

  async function isCmsPresentationOpen() {
    if (!isElectron()) return false;
    return getDesktopApi().isCmsPresentationOpen();
  }

  async function cmsPresentationCommand(command) {
    if (!isElectron()) return null;
    return getDesktopApi().cmsPresentationCommand(command);
  }

  async function learningToolsPresentationCommand(command) {
    if (!isElectron()) return null;
    const api = getDesktopApi();
    if (!api || typeof api.learningToolsPresentationCommand !== 'function') {
      return { ok: false, reason: 'unavailable' };
    }
    return api.learningToolsPresentationCommand(command);
  }

  async function openOralPresenter(opts) {
    if (!isElectron()) return null;
    return getDesktopApi().openOralPresenter(opts || {});
  }

  async function isOralPresenterOpen() {
    if (!isElectron()) return false;
    return getDesktopApi().isOralPresenterOpen();
  }

  async function oralPresenterCommand(command) {
    if (!isElectron()) return null;
    return getDesktopApi().oralPresenterCommand(command);
  }

  async function openDocPresentation(opts) {
    if (!isElectron()) return null;
    return getDesktopApi().openDocPresentation(opts || {});
  }

  async function isDocPresentationOpen() {
    if (!isElectron()) return false;
    return getDesktopApi().isDocPresentationOpen();
  }

  async function docPresentationCommand(command) {
    if (!isElectron()) return null;
    return getDesktopApi().docPresentationCommand(command);
  }

  async function remoteStart(opts) {
    if (!isElectron()) return null;
    const req = (opts && typeof opts === 'object') ? opts : { port: opts };
    return getDesktopApi().remoteStart(req);
  }

  async function remoteStop() {
    if (!isElectron()) return null;
    return getDesktopApi().remoteStop();
  }

  async function remoteStatus() {
    if (!isElectron()) return null;
    return getDesktopApi().remoteStatus();
  }

  async function remotePushState(stateData) {
    if (!isElectron()) return null;
    return getDesktopApi().remotePushState(stateData);
  }

  async function remoteNewToken() {
    if (!isElectron()) return null;
    return getDesktopApi().remoteNewToken();
  }

  async function remoteConfigRead() {
    if (!isElectron()) return null;
    return getDesktopApi().remoteConfigRead();
  }

  async function remoteConfigSave(config) {
    if (!isElectron()) return null;
    return getDesktopApi().remoteConfigSave(config);
  }

  async function quizSaveResult(payload) {
    if (!isElectron()) return null;
    return getDesktopApi().quizSaveResult(payload);
  }

  async function quizServerStart(port) {
    if (!isElectron()) return null;
    return getDesktopApi().quizServerStart({ port });
  }

  async function quizServerStop() {
    if (!isElectron()) return null;
    return getDesktopApi().quizServerStop();
  }

  async function quizServerStatus() {
    if (!isElectron()) return null;
    return getDesktopApi().quizServerStatus();
  }

  async function printPdf(request) {
    if (!isElectron()) return null;
    return getDesktopApi().printPdf(request);
  }

  async function exportDocx(request) {
    if (!isElectron()) return null;
    return getDesktopApi().exportDocx(request);
  }

  async function backupZip() {
    if (!isElectron()) {
      return null;
    }
    return getDesktopApi().backupZip();
  }

  async function restoreZip() {
    if (!isElectron()) {
      return null;
    }
    return getDesktopApi().restoreZip();
  }

  async function resetFolders(targets) {
    if (!isElectron()) return null;
    return getDesktopApi().resetFolders({ targets: Array.isArray(targets) ? targets : [] });
  }

  async function applyRestoreChoices(request) {
    if (!isElectron()) {
      return null;
    }
    return getDesktopApi().applyRestoreChoices(request);
  }

  async function exportFiles(files) {
    if (!isElectron()) {
      return null;
    }
    return getDesktopApi().exportFiles({ files: Array.isArray(files) ? files : [] });
  }

  async function openExternal(url) {
    if (!isElectron()) return null;
    return getDesktopApi().openExternal({ url });
  }

  async function goToLauncher() {
    if (!isElectron()) return null;
    return getDesktopApi().goToLauncher();
  }

  async function closeWindow() {
    if (!isElectron()) {
      try { window.close(); } catch (_) {}
      return null;
    }
    return getDesktopApi().closeWindow();
  }

  async function openTool(pageFile, opts) {
    if (!isElectron()) {
      let url = pageFile;
      if (opts && opts.query && typeof opts.query === 'object') {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(opts.query)) {
          if (v !== undefined && v !== null) params.set(k, String(v));
        }
        const qs = params.toString();
        if (qs) url += (url.includes('?') ? '&' : '?') + qs;
      }
      try {
        window.open(url, '_blank');
      } catch (_) {}
      return null;
    }
    const req = { pageFile };
    if (opts && opts.query && typeof opts.query === 'object') {
      req.query = opts.query;
    }
    if (opts && (opts.newWindow || opts.forceNewWindow)) req.newWindow = true;
    if (opts && opts.noReload) req.noReload = true;
    if (opts && opts.sideBySide) {
      req.sideBySide = true;
      req.mainFraction = opts.mainFraction || 0.20;
      req.cmOnRight = opts.cmOnRight !== false;
    }
    if (opts && opts.maximize) req.maximize = true;
    if (opts && opts.windowSizeRatio) req.windowSizeRatio = opts.windowSizeRatio;
    if (opts && opts.windowPosition)  req.windowPosition  = opts.windowPosition;
    return getDesktopApi().openTool(req);
  }

  async function openSplit(opts) {
    if (!isElectron()) return null;
    return getDesktopApi().openSplit(opts || {});
  }

  async function arrangeSideBySide(opts) {
    if (!isElectron()) return null;
    return getDesktopApi().arrangeSideBySide(opts || {});
  }

  async function timerCommand(request) {
    if (!isElectron()) return null;
    return getDesktopApi().timerCommand(request);
  }

  async function timerState() {
    if (!isElectron()) return null;
    return getDesktopApi().timerState();
  }

  async function openTimerWindow(html, opts) {
    if (!isElectron()) return null;
    return getDesktopApi().openTimerWindow({ html, width: opts && opts.width, height: opts && opts.height });
  }

  async function isTimerWindowOpen() {
    if (!isElectron()) return false;
    const res = await getDesktopApi().isTimerWindowOpen();
    return !!(res && res.open);
  }

  // ── Cross-app data change listener ─────────────────────────────────────────
  function onDataChanged(callback) {
    if (!isElectron()) return;
    var api = getDesktopApi();
    if (!api || typeof api.onDataChanged !== 'function') return;
    api.onDataChanged(callback);
  }

  // ── Planner reminder toast ──────────────────────────────────────────────────
  function wireReminderToast() {
    if (!isElectron()) return;
    var api = getDesktopApi();
    if (!api || typeof api.onPlannerReminder !== 'function') return;

    var style = document.createElement('style');
    style.textContent = [
      '#planner-reminder-toast{',
        'position:fixed;bottom:24px;right:24px;z-index:99999;',
        'background:#ffffff;color:#000000;border:2px solid #000000;',
        'border-radius:4px;padding:12px 34px 12px 14px;max-width:320px;min-width:200px;',
        'font-family:inherit;font-size:.84rem;line-height:1.4;',
        'box-shadow:4px 4px 0 #000000;',
        'opacity:0;transform:translateY(8px);',
        'transition:opacity .15s ease, transform .15s ease;pointer-events:none;',
      '}',
      '#planner-reminder-toast.prt-show{opacity:1;transform:translateY(0);pointer-events:auto;}',
      '#planner-reminder-toast .prt-title{font-weight:800;font-size:.88rem;color:#000000;margin-bottom:4px;letter-spacing:-0.01em;}',
      '#planner-reminder-toast .prt-body{font-size:.78rem;font-weight:600;color:#374151;line-height:1.4;}',
      '#planner-reminder-toast .prt-close{',
        'position:absolute;top:8px;right:8px;',
        'width:20px;height:20px;display:flex;align-items:center;justify-content:center;',
        'background:#ffffff;border:1.5px solid #000000;color:#000000;font-size:.7rem;font-weight:800;',
        'border-radius:2px;box-shadow:1.5px 1.5px 0 #000000;cursor:pointer;padding:0;line-height:1;',
        'transition:background .1s ease, transform .1s ease, box-shadow .1s ease;',
      '}',
      '#planner-reminder-toast .prt-close:hover{background:#fef08a;transform:translate(-1px,-1px);box-shadow:2.5px 2.5px 0 #000000;}',
      '#planner-reminder-toast .prt-close:active{transform:translate(1px,1px);box-shadow:0 0 0 #000000;}'
    ].join('');
    document.head.appendChild(style);

    var toast = document.createElement('div');
    toast.id = 'planner-reminder-toast';
    toast.innerHTML = '<button class="prt-close" aria-label="Close">✕</button>' +
      '<div class="prt-title"></div><div class="prt-body"></div>';
    document.body.appendChild(toast);

    var hideTimer = null;

    function hideToast() {
      toast.classList.remove('prt-show');
      clearTimeout(hideTimer);
    }

    toast.querySelector('.prt-close').addEventListener('click', function () {
      hideToast();
      if (typeof api.dismissPlannerReminder === 'function') api.dismissPlannerReminder();
    });

    if (typeof api.onPlannerReminderDismiss === 'function') {
      api.onPlannerReminderDismiss(hideToast);
    }

    api.onPlannerReminder(function (data) {
      var rawTitle = data && data.title ? String(data.title) : '';
      var rawBody  = data && data.body  ? String(data.body)  : '';
      var cleanTitle = rawTitle.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F2FF}\u{2300}-\u{23FF}]\s*/u, '').trim();
      var cleanBody  = rawBody.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F2FF}\u{2300}-\u{23FF}]\s*/u, '').trim();
      toast.querySelector('.prt-title').textContent = cleanTitle;
      toast.querySelector('.prt-body').textContent  = cleanBody;
      toast.classList.add('prt-show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideToast, 300000);
    });
  }

  async function clipboardReadText() {
    const api = getDesktopApi();
    if (api && typeof api.clipboardReadText === 'function') {
      try {
        return await api.clipboardReadText();
      } catch (e) {}
    }
    return null;
  }

  async function clipboardReadHtml() {
    const api = getDesktopApi();
    if (api && typeof api.clipboardReadHtml === 'function') {
      try {
        return await api.clipboardReadHtml();
      } catch (e) {}
    }
    return null;
  }

  async function clipboardReadImage() {
    const api = getDesktopApi();
    if (api && typeof api.clipboardReadImage === 'function') {
      try {
        return await api.clipboardReadImage();
      } catch (e) {}
    }
    return null;
  }

  async function clipboardWriteText(text) {
    const api = getDesktopApi();
    if (api && typeof api.clipboardWriteText === 'function') {
      try {
        return await api.clipboardWriteText(text);
      } catch (e) {
        console.error('electron-bridge: clipboardWriteText error:', e);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(String(text || ''));
        return true;
      } catch (e) {}
    }
    return false;
  }

  async function getScreenSources(types) {
    const api = getDesktopApi();
    if (api && typeof api.getScreenSources === 'function') {
      try {
        return await api.getScreenSources({ types: types || ['screen', 'window'] });
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    }
    return { ok: false, error: 'Screen capture API unavailable' };
  }

  window.Desktop = Object.freeze({
    applyRestoreChoices,
    arrangeSideBySide,
    backupZip,
    clipboardReadText,
    clipboardReadHtml,
    clipboardReadImage,
    clipboardWriteText,
    duplicateByPath,
    exportFiles,
    getScreenSources,
    goToLauncher,
    closeWindow,
    isElectron,
    isTimerWindowOpen,
    createDirectoryByPath,
    listByPath,
    listFiles,
    openExternal,
    openNative,
    showInFolder,
    openTool,
    openSplit,
    openTimerWindow,
    readByPath,
    readJson,
    resolvePath,
    readText,
    migrateClassUuids,
    renameFile,
    renameByPath,
    resetSyncBaseline,
    runSync,
    statByPath,
    copyByPath,
    moveByPath,
    deleteFile,
    deleteByPath,
    openHtml,
    printHtml,
    printPdf,
    exportDocx,
    resetFolders,
    resolvePath,
    restoreZip,
    saveBlob,
    saveFile,
    saveFiles,
    updateSessionContext,
    getSessionState,
    saveBoardArchive,
    readBoardArchive,
    inspectBoardArchive,
    saveJson,
    saveText,
    timerCommand,
    timerState,
    openMirrorWindow,
    mirrorWindowCommand,
    hasSecondDisplay,
    onDisplayChanged,
    openCmsPresentation,
    isCmsPresentationOpen,
    cmsPresentationCommand,
    openOralPresenter,
    isOralPresenterOpen,
    oralPresenterCommand,
    openDocPresentation,
    isDocPresentationOpen,
    docPresentationCommand,
    remoteStart,
    remoteStop,
    remoteStatus,
    remotePushState,
    remoteNewToken,
    remoteConfigRead,
    remoteConfigSave,
    quizSaveResult,
    quizServerStart,
    quizServerStop,
    quizServerStatus,
    onDataChanged,
    learningToolsPresentationCommand,
    saveToDisk,
    pickFolder,
    pickAndReadFile,
    pickAndCopyFiles,
    zipAndDeleteArchived,
    fetchUrl,
    reloadPlannerReminders() {
      var api = getDesktopApi();
      if (api && typeof api.reloadPlannerReminders === 'function') api.reloadPlannerReminders();
    }
  });

  // Global interceptor for external hyperlinks (http://, https://, mailto:)
  // Ensures external websites always open in the user's default browser or a new tab
  // instead of navigating the current tool window away and losing active state.
  function wireExternalLinks() {
    document.addEventListener('click', function (event) {
      const anchor = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('a[href]')
        : null;
      if (!anchor) return;

      // Ignore internal anchors (e.g. #section, javascript:, or nav-links handled by wireAppNav)
      if (anchor.classList && anchor.classList.contains('nav-link')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;

      const trimmed = rawHref.trim();
      const isExternal = /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed);
      if (!isExternal) return;

      if (isElectron()) {
        event.preventDefault();
        event.stopPropagation();
        if (window.Desktop && typeof window.Desktop.openExternal === 'function') {
          window.Desktop.openExternal(trimmed);
        }
      } else {
        // Standard browser fallback: ensure it opens in a new tab safely
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    }, true);
  }

  // In Electron, intercept app-nav links so they open in a new tool window
  // instead of being blocked by setWindowOpenHandler.
  // Uses event delegation so dynamically-injected menu links are handled.
  function wireAppNav() {
    if (!isElectron()) return;
    const nav = document.getElementById('app-nav') || document.getElementById('menu');
    if (!nav) return;
    nav.addEventListener('click', function (event) {
      const link = event.target.closest('a.nav-link[href]');
      if (!link) return;
      event.preventDefault();
      window.Desktop.openTool(link.getAttribute('href'));
    });
  }

  function wireHamburger() {
    const hm = document.getElementById('app-hamburger');
    if (!hm) return;
    document.addEventListener('click', function (e) {
      if (!hm.contains(e.target)) hm.classList.remove('open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireExternalLinks();
      wireAppNav();
      wireHamburger();
      wireReminderToast();
    });
  } else {
    wireExternalLinks();
    wireAppNav();
    wireHamburger();
    wireReminderToast();
  }

  try {
    if (isElectron()) {
      window.addEventListener('error', function(event) {
        try {
          const desktopApi = getDesktopApi();
          if (desktopApi && typeof desktopApi.reportRendererError === 'function') {
            desktopApi.reportRendererError({
              page: window.location.pathname.split('/').pop() || 'unknown',
              message: event.message,
              url: event.filename,
              line: event.lineno,
              col: event.colno,
              error: {
                message: event.error ? event.error.message : event.message,
                name: event.error ? event.error.name : 'Error',
                stack: event.error ? event.error.stack : ''
              }
            });
          }
        } catch (e) {}
      });

      window.addEventListener('unhandledrejection', function(event) {
        try {
          const desktopApi = getDesktopApi();
          if (desktopApi && typeof desktopApi.reportRendererError === 'function') {
            const reason = event.reason || {};
            desktopApi.reportRendererError({
              page: window.location.pathname.split('/').pop() || 'unknown',
              message: reason.message || String(reason),
              error: {
                message: reason.message || String(reason),
                name: reason.name || 'UnhandledRejection',
                stack: reason.stack || ''
              }
            });
          }
        } catch (e) {}
      });
    }
  } catch (e) {}
})();

