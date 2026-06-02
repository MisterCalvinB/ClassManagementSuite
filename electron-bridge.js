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

  async function remoteStart(port) {
    if (!isElectron()) return null;
    return getDesktopApi().remoteStart({ port });
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

  window.Desktop = Object.freeze({
    applyRestoreChoices,
    arrangeSideBySide,
    backupZip,
    exportFiles,
    isElectron,
    isTimerWindowOpen,
    listByPath,
    listFiles,
    openTool,
    openSplit,
    openTimerWindow,
    readByPath,
    readJson,
    resolvePath,
    readText,
    renameFile,
    renameByPath,
    deleteFile,
    deleteByPath,
    openHtml,
    printHtml,
    printPdf,
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
    remoteStart,
    remoteStop,
    remoteStatus,
    remotePushState,
    remoteNewToken,
    quizServerStart,
    quizServerStop,
    quizServerStatus
  });

  // In Electron, intercept app-nav links so they open in a new tool window
  // instead of being blocked by setWindowOpenHandler.
  function wireAppNav() {
    if (!isElectron()) return;
    const nav = document.getElementById('app-nav');
    if (!nav) return;
    nav.querySelectorAll('a.nav-link[href]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        const pageFile = link.getAttribute('href');
        window.Desktop.openTool(pageFile);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAppNav);
  } else {
    wireAppNav();
  }
})();
