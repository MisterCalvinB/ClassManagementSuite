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
    if (subdir) req.subdir = subdir;
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
      recursive: options.recursive !== false
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
    return getDesktopApi().printHtml(request);
  }

  async function migrateClassUuids() {
    if (!isElectron()) return null;
    return getDesktopApi().migrateClassUuids();
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
    return getDesktopApi().openNative({ target, relativePath });
  }

  async function showInFolder(target, relativePath) {
    if (!isElectron()) return null;
    return getDesktopApi().showInFolder({ target, relativePath });
  }

  async function duplicateByPath(target, relativePath) {
    if (!isElectron()) return null;
    return getDesktopApi().duplicateByPath({ target, relativePath });
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

  async function openTool(pageFile, opts) {
    if (!isElectron()) {
      return null;
    }
    const req = { pageFile };
    if (opts && opts.query && typeof opts.query === 'object') {
      req.query = opts.query;
    }
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
        'position:fixed;bottom:20px;right:20px;z-index:99999;',
        'background:#1a1a2e;color:#e8e8f0;border-radius:10px;',
        'padding:12px 36px 12px 14px;max-width:300px;min-width:180px;',
        'font-size:.83rem;line-height:1.45;',
        'box-shadow:0 4px 22px rgba(0,0,0,.5);',
        'opacity:0;transition:opacity .25s;pointer-events:none;',
        'border-left:3px solid #6c8ef5;',
      '}',
      '#planner-reminder-toast.prt-show{opacity:1;pointer-events:auto;}',
      '#planner-reminder-toast .prt-title{font-weight:700;font-size:.82rem;margin-bottom:3px;}',
      '#planner-reminder-toast .prt-body{font-size:.78rem;color:#b0b4c8;}',
      '#planner-reminder-toast .prt-close{',
        'position:absolute;top:6px;right:8px;',
        'background:none;border:none;color:#888;font-size:.85rem;',
        'cursor:pointer;padding:2px 4px;border-radius:3px;line-height:1;',
      '}',
      '#planner-reminder-toast .prt-close:hover{color:#e8e8f0;background:#333;}'
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
      toast.querySelector('.prt-title').textContent = data.title || '';
      toast.querySelector('.prt-body').textContent  = data.body  || '';
      toast.classList.add('prt-show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideToast, 300000);
    });
  }

  window.Desktop = Object.freeze({
    applyRestoreChoices,
    arrangeSideBySide,
    backupZip,
    duplicateByPath,
    exportFiles,
    goToLauncher,
    isElectron,
    isTimerWindowOpen,
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
    deleteFile,
    deleteByPath,
    openHtml,
    printHtml,
    printPdf,
    exportDocx,
    resetFolders,
    restoreZip,
    saveBlob,
    saveFiles,
    saveJson,
    saveText,
    timerCommand,
    timerState,
    openMirrorWindow,
    mirrorWindowCommand,
    openCmsPresentation,
    isCmsPresentationOpen,
    cmsPresentationCommand,
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
    reloadPlannerReminders() {
      var api = getDesktopApi();
      if (api && typeof api.reloadPlannerReminders === 'function') api.reloadPlannerReminders();
    }
  });

  // In Electron, intercept app-nav links so they open in a new tool window
  // instead of being blocked by setWindowOpenHandler.
  // Uses event delegation so dynamically-injected menu links are handled.
  function wireAppNav() {
    if (!isElectron()) return;
    const nav = document.getElementById('app-nav');
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
    document.addEventListener('DOMContentLoaded', function () { wireAppNav(); wireHamburger(); wireReminderToast(); });
  } else {
    wireAppNav();
    wireHamburger();
    wireReminderToast();
  }
})();
