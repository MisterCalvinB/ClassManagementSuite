const { app, BrowserWindow, dialog, ipcMain, Menu, screen, session, shell } = require('electron');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const os   = require('os');
const http = require('http');
const { spawn } = require('child_process');

const ROOT_DIR = __dirname;
const PAGE_FILES = {
  board: 'board.html',
  classManagement: 'class-management.html',
  groupEditor: 'group-editor.html',
  gradeSheet: 'grade-sheet.html',
  learningDb: 'manage-database.html',
  learningDb2: 'manage-database2.html',
  learningTools: 'learning-tools.html',
  participationTracker: 'participation-tracker.html',
  dataLocation: 'data-location.html',
  launcher: 'launcher.html',
  generalConfig: 'general-config.html',
  fileManager: 'file-manager.html',
  howTo: 'how-to.html',
  credits: 'credits.html',
  scheduleMaker: 'schedule-maker.html',
  classPlan: 'class-plan.html'
};

const PAGE_ARG_MAP = {
  board: PAGE_FILES.board,
  classmanagement: PAGE_FILES.classManagement,
  cms: PAGE_FILES.classManagement,
  gradesheet: PAGE_FILES.gradeSheet,
  grades: PAGE_FILES.gradeSheet,
  learningdb: PAGE_FILES.learningDb,
  learningdb2: PAGE_FILES.learningDb2,
  dbmanager2: PAGE_FILES.learningDb2,
  learningtools: PAGE_FILES.learningTools,
  participationtracker: PAGE_FILES.participationTracker,
  participationtracking: PAGE_FILES.participationTracker,
  tracker: PAGE_FILES.participationTracker,
  datalocation: PAGE_FILES.dataLocation,
  datasettings: PAGE_FILES.dataLocation,
  datafolder: PAGE_FILES.dataLocation,
  launcher: PAGE_FILES.launcher,
  home: PAGE_FILES.launcher,
  generalconfig: PAGE_FILES.generalConfig,
  config: PAGE_FILES.generalConfig,
  filemanager: PAGE_FILES.fileManager,
  files: PAGE_FILES.fileManager,
  recentfiles: PAGE_FILES.fileManager,
  recent: PAGE_FILES.fileManager,
  howto: PAGE_FILES.howTo,
  help: PAGE_FILES.howTo,
  groupeditor: PAGE_FILES.groupEditor,
  groups: PAGE_FILES.groupEditor,
  schedulemaker: PAGE_FILES.scheduleMaker,
  schedule: PAGE_FILES.scheduleMaker,
  classplan: PAGE_FILES.classPlan,
  plan: PAGE_FILES.classPlan,
  classp: PAGE_FILES.classPlan
};

const PAGE_LABELS = {
  [PAGE_FILES.board]: 'Board',
  [PAGE_FILES.classManagement]: 'Class Management',
  [PAGE_FILES.groupEditor]: 'Group Editor',
  [PAGE_FILES.gradeSheet]: 'Grade Sheet',
  [PAGE_FILES.learningDb]: 'Learning DB',
  [PAGE_FILES.learningDb2]: 'DB Manager v2',
  [PAGE_FILES.learningTools]: 'Learning Tools',
  [PAGE_FILES.participationTracker]: 'Participation Tracker',
  [PAGE_FILES.dataLocation]: 'Data Location',
  [PAGE_FILES.launcher]: 'Launcher',
  [PAGE_FILES.generalConfig]: 'General Config',
  [PAGE_FILES.fileManager]: 'File Manager',
  [PAGE_FILES.howTo]: 'How To',
  [PAGE_FILES.credits]: 'Credits',
  [PAGE_FILES.scheduleMaker]: 'Schedule Maker',
  [PAGE_FILES.classPlan]: 'Class Plan'
};

function getDefaultWritableRootDir() {
  // Returns the natural default root without honouring PORTABLE_ROOT.
  if (!app.isPackaged) {
    return ROOT_DIR;
  }

  const portableExeDir = String(process.env.PORTABLE_EXECUTABLE_DIR || '').trim();
  if (portableExeDir) {
    return path.resolve(portableExeDir);
  }

  const executableDir = path.dirname(process.execPath || '');
  if (executableDir) {
    try {
      fsSync.accessSync(executableDir, fsSync.constants.W_OK);
      return path.resolve(executableDir);
    } catch {}
  }

  const appImagePath = String(process.env.APPIMAGE || '').trim();
  if (appImagePath) {
    const appImageDir = path.dirname(appImagePath);
    try {
      fsSync.accessSync(appImageDir, fsSync.constants.W_OK);
      return appImageDir;
    } catch {}
  }

  return app.getPath('userData');
}

function getWritableRootDir() {
  if (!app.isPackaged) {
    return ROOT_DIR;
  }

  const portableOverride = String(process.env.PORTABLE_ROOT || '').trim();
  if (portableOverride) {
    return path.resolve(portableOverride);
  }

  // Electron sets this for portable Windows builds.
  const portableExeDir = String(process.env.PORTABLE_EXECUTABLE_DIR || '').trim();
  if (portableExeDir) {
    return path.resolve(portableExeDir);
  }

  // Fallback for packaged builds where PORTABLE_EXECUTABLE_DIR is not set.
  // If the folder containing the current executable is writable, prefer it.
  const executableDir = path.dirname(process.execPath || '');
  if (executableDir) {
    try {
      fsSync.accessSync(executableDir, fsSync.constants.W_OK);
      return path.resolve(executableDir);
    } catch {}
  }

  // In AppImage environments, this points to the AppImage file path.
  const appImagePath = String(process.env.APPIMAGE || '').trim();
  if (appImagePath) {
    const appImageDir = path.dirname(appImagePath);
    try {
      fsSync.accessSync(appImageDir, fsSync.constants.W_OK);
      return appImageDir;
    } catch {}
  }

  return app.getPath('userData');
}

function getSaveTargets() {
  const writableRoot = getWritableRootDir();
  const customDataRoot = path.join(writableRoot, 'user/custom-data');

  return {
    app: ROOT_DIR,
    user: path.join(writableRoot, 'user'),
    data: customDataRoot,
    gradeSheet: path.join(writableRoot, 'user/log/grade-sheet'),
    grades: path.join(writableRoot, 'user/log/grades'),
    groupParticipation: path.join(writableRoot, 'user/log/group-participation'),
    mindmaps: path.join(writableRoot, 'user/log/constellation'),
    constellationTemplates: path.join(writableRoot, 'user/log/constellation/templates'),
    textualAnalyses: path.join(writableRoot, 'user/log/textual-analyses'),
    notes: path.join(writableRoot, 'user/log/notes'),
    customData: customDataRoot,
    customBooks: path.join(writableRoot, 'user/custom-data/books'),
    customDictations: path.join(writableRoot, 'user/custom-data/dictations'),
    customErrorbanks: path.join(writableRoot, 'user/custom-data/errorbanks'),
    customGapfillbanks: path.join(writableRoot, 'user/custom-data/gapfillbanks'),
    customGrammarbanks: path.join(writableRoot, 'user/custom-data/grammarbanks'),
    customQuizzes: path.join(writableRoot, 'user/custom-data/quizzes'),
    customQuotes: path.join(writableRoot, 'user/custom-data/quotebanks'),
    customSentences: path.join(writableRoot, 'user/custom-data/sentencebanks'),
    customStorybanks: path.join(writableRoot, 'user/custom-data/storybanks'),
    customSounds: path.join(writableRoot, 'user/custom-data/custom-sounds'),
    customWordbanks: path.join(writableRoot, 'user/custom-data/wordbanks'),
    classPlans: path.join(writableRoot, 'user/class-plans')
  };
}

function getBundledDataRoot() {
  return path.join(ROOT_DIR, 'user', 'custom-data');
}

const PAGE_PERMISSIONS = {
  [PAGE_FILES.board]: new Set(['data', 'mindmaps', 'constellationTemplates', 'textualAnalyses', 'notes', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'user', 'customBooks']),
  [PAGE_FILES.classManagement]: new Set(['user', 'groupParticipation', 'data', 'grades']),
  [PAGE_FILES.groupEditor]: new Set(['user', 'groupParticipation']),
  [PAGE_FILES.gradeSheet]: new Set(['gradeSheet', 'grades', 'user']),
  [PAGE_FILES.learningDb]: new Set(['data', 'user', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes']),
  [PAGE_FILES.learningDb2]: new Set(['data', 'user', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customBooks']),
  [PAGE_FILES.learningTools]: new Set(['data', 'user', 'groupParticipation', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes']),
  [PAGE_FILES.participationTracker]: new Set(['user', 'groupParticipation']),
  [PAGE_FILES.launcher]: new Set(['user', 'mindmaps']),
  [PAGE_FILES.generalConfig]: new Set(['user']),
  [PAGE_FILES.fileManager]: new Set(['user', 'mindmaps', 'data', 'customData', 'customWordbanks', 'customBooks', 'customDictations', 'customQuizzes', 'grades', 'gradeSheet', 'groupParticipation']),
  [PAGE_FILES.howTo]: new Set(['user']),
  [PAGE_FILES.credits]: new Set([]),
  [PAGE_FILES.scheduleMaker]: new Set(['user', 'data']),
  [PAGE_FILES.classPlan]: new Set(['user', 'classPlans'])
};

let mainWindow;
let mainWindowClosingAfterExport = false;
let timerDetachedWindow = null;
let firstRunDetected = false;

// ── linked-resize snap state ─────────────────────────────────────────
let _snapState = null;  // { mainWin, toolWin, cmOnRight, workArea, insetL, insetR, insetB, onMainResize, onToolResize }

function _teardownLinkedResize() {
  if (!_snapState) return;
  const { mainWin, toolWin, onMainResize, onToolResize } = _snapState;
  if (onMainResize && !mainWin.isDestroyed()) mainWin.off('resize', onMainResize);
  if (onToolResize && !toolWin.isDestroyed()) toolWin.off('resize', onToolResize);
  _snapState = null;
}

function _setupLinkedResize(mainWin, toolWin, cmOnRight, workArea, insetL, insetR, insetB) {
  _teardownLinkedResize();
  let guard = false;

  const onMainResize = () => {
    if (guard || mainWin.isDestroyed() || toolWin.isDestroyed()) return;
    guard = true;
    const { x, y, width, height } = workArea;
    const ob = mainWin.getBounds();
    if (cmOnRight) {
      // CM on right — its left content edge is the split
      const split = ob.x + insetL;
      const toolW = Math.max(100, split - x);
      toolWin.setBounds({ x: x - insetL, y, width: toolW + insetL + insetR, height: height + insetB });
    } else {
      // CM on left — its right content edge is the split
      const split = ob.x + ob.width - insetR;
      const toolW = Math.max(100, x + width - split);
      toolWin.setBounds({ x: split - insetL, y, width: toolW + insetL + insetR, height: height + insetB });
    }
    // Delay releasing the guard so any resize events queued by setBounds
    // (emitted asynchronously on Linux) are still suppressed.
    setImmediate(() => { guard = false; });
  };

  const onToolResize = () => {
    if (guard || mainWin.isDestroyed() || toolWin.isDestroyed()) return;
    guard = true;
    const { x, y, width, height } = workArea;
    const ob = toolWin.getBounds();
    if (cmOnRight) {
      // Tool on left — its right content edge is the split
      const split = ob.x + ob.width - insetR;
      const mainW = Math.max(100, x + width - split);
      mainWin.setBounds({ x: split - insetL, y, width: mainW + insetL + insetR, height: height + insetB });
    } else {
      // Tool on right — its left content edge is the split
      const split = ob.x + insetL;
      const mainW = Math.max(100, split - x);
      mainWin.setBounds({ x: x - insetL, y, width: mainW + insetL + insetR, height: height + insetB });
    }
    // Delay releasing the guard so any resize events queued by setBounds
    // (emitted asynchronously on Linux) are still suppressed.
    setImmediate(() => { guard = false; });
  };

  mainWin.on('resize', onMainResize);
  toolWin.on('resize', onToolResize);
  mainWin.once('closed', _teardownLinkedResize);
  toolWin.once('closed', _teardownLinkedResize);

  _snapState = { mainWin, toolWin, cmOnRight, workArea, insetL, insetR, insetB, onMainResize, onToolResize };
}

// ── auto-sync watcher state ───────────────────────────────────────────
let _autoSyncWatcher = null;   // composite { close() } object
let _autoSyncTimer   = null;   // debounce timer handle
let _autoSyncRunning = false;  // prevent re-entrant syncs

function normalizePageArg(value) {
  const baseName = path.basename(String(value || '').trim()).toLowerCase();
  const withoutExtension = baseName.replace(/\.[^.]+$/, '');
  return withoutExtension.replace(/[^a-z0-9]+/g, '');
}

function getInitialPageFile(argv = process.argv.slice(1)) {
  for (const arg of argv) {
    const pageFile = PAGE_ARG_MAP[normalizePageArg(arg)];
    if (pageFile) {
      return pageFile;
    }
  }

  return PAGE_FILES.launcher;
}

function getToolPath(pageFile) {
  if (!Object.values(PAGE_FILES).includes(pageFile)) {
    throw new Error(`Unknown page: ${pageFile}`);
  }
  return path.join(ROOT_DIR, pageFile);
}

function getLoadedPageFile(window = mainWindow) {
  const sourceUrl = window?.webContents?.getURL?.() || '';
  if (!sourceUrl) {
    return '';
  }

  try {
    return path.basename(new URL(sourceUrl).pathname);
  } catch {
    return path.basename(sourceUrl);
  }
}

async function loadTool(pageFile, window = mainWindow, options = {}) {
  if (!window || window.isDestroyed()) {
    return;
  }
  const loadOptions = (options && options.query && typeof options.query === 'object')
    ? { query: options.query }
    : undefined;
  await window.loadFile(getToolPath(pageFile), loadOptions);
}

function _arrangeSideBySide(mainWin, toolWin, mainFrac, cmOnRight = true) {
  try {
    const { workArea } = screen.getDisplayMatching(mainWin.getBounds());
    const { x, y, width, height } = workArea;
    const mainW = Math.round(width * mainFrac);
    const toolW = width - mainW;

    const ob = mainWin.getBounds();
    const cb = mainWin.getContentBounds();
    const insetL = Math.max(0, cb.x - ob.x);
    const insetR = Math.max(0, (ob.x + ob.width) - (cb.x + cb.width));
    const insetB = Math.max(0, (ob.y + ob.height) - (cb.y + cb.height));

    const leftBounds  = (vx, vw) => ({ x: vx - insetL, y, width: vw + insetL + insetR, height: height + insetB });
    const rightBounds = (vx, vw) => ({ x: vx - insetL, y, width: vw + insetL + insetR, height: height + insetB });

    mainWin.unmaximize();
    toolWin.unmaximize();

    if (cmOnRight) {
      toolWin.setBounds(leftBounds(x, toolW));
      mainWin.setBounds(rightBounds(x + toolW, mainW));
    } else {
      mainWin.setBounds(leftBounds(x, mainW));
      toolWin.setBounds(rightBounds(x + mainW, toolW));
    }
    toolWin.focus();

    _setupLinkedResize(mainWin, toolWin, cmOnRight, workArea, insetL, insetR, insetB);
  } catch (err) {
    console.warn('_arrangeSideBySide failed:', err);
  }
}

function createToolWindow(pageFile, options = {}) {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let closingAfterExport = false;
  win.on('close', (event) => {
    if (closingAfterExport) {
      return;
    }
    if (getLoadedPageFile(win) !== PAGE_FILES.board) {
      return;
    }

    event.preventDefault();
    closingAfterExport = true;
    win.webContents.executeJavaScript(
      'window.boardExportSessionsBeforeQuit ? window.boardExportSessionsBeforeQuit() : null',
      true
    ).catch((error) => {
      console.error('Failed to export board sessions before quit:', error);
    }).finally(() => {
      if (!win.isDestroyed()) {
        win.close();
      }
    });
  });
  loadTool(pageFile, win, options).catch((error) => {
    console.error(`Failed to load ${pageFile} in new window:`, error);
  });
  return win;
}

function buildMenu() {
  const toolMenu = Object.values(PAGE_FILES).map((pageFile) => ({
    label: PAGE_LABELS[pageFile],
    click: () => {
      createToolWindow(pageFile);
    }
  }));

  const template = [
    {
      label: 'Tools',
      submenu: toolMenu
    },
    {
      role: 'viewMenu'
    },
    {
      role: 'windowMenu'
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow(initialPageFile = PAGE_FILES.launcher) {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.on('close', (event) => {
    if (mainWindowClosingAfterExport) {
      return;
    }
    if (getLoadedPageFile(mainWindow) !== PAGE_FILES.board) {
      return;
    }

    event.preventDefault();
    mainWindowClosingAfterExport = true;
    mainWindow.webContents.executeJavaScript(
      'window.boardExportSessionsBeforeQuit ? window.boardExportSessionsBeforeQuit() : null',
      true
    ).catch((error) => {
      console.error('Failed to export board sessions before quit:', error);
    }).finally(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
    });
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    mainWindowClosingAfterExport = false;
  });

  loadTool(initialPageFile, mainWindow).catch((error) => {
    console.error('Failed to load initial page:', error);
  });
}

function getRequestingPage(event) {
  const sourceUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!sourceUrl) {
    throw new Error('Could not determine the requesting page.');
  }

  try {
    return path.basename(new URL(sourceUrl).pathname);
  } catch {
    return path.basename(sourceUrl);
  }
}

function sanitizeFilename(filename) {
  const baseName = path.basename(String(filename || '').trim());
  if (!baseName || baseName === '.' || baseName === '..' || baseName.includes('\0')) {
    throw new Error('Invalid file name.');
  }
  return baseName;
}

function sanitizeRelativePath(relativePath) {
  const raw = String(relativePath || '').trim().replace(/\\/g, '/');
  if (raw.includes('\0') || path.isAbsolute(raw)) {
    throw new Error('Invalid relative path.');
  }

  if (!raw) return '.';

  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error('Path traversal is not allowed.');
  }

  return normalized;
}

function resolveAllowedTargetDir(pageFile, target) {
  const allowedTargets = PAGE_PERMISSIONS[pageFile];
  if (!allowedTargets) {
    throw new Error(`Saving is not configured for ${pageFile}.`);
  }
  if (!allowedTargets.has(target)) {
    throw new Error(`${pageFile} cannot access ${target}.`);
  }

  const targetDir = getSaveTargets()[target];
  if (!targetDir) {
    throw new Error(`Unknown save target: ${target}.`);
  }

  return targetDir;
}

function resolveAllowedTargetPath(pageFile, target, relativePath) {
  const targetDir = resolveAllowedTargetDir(pageFile, target);
  const safeRelative = sanitizeRelativePath(relativePath);
  const fullPath = path.resolve(targetDir, safeRelative);
  const targetRoot = path.resolve(targetDir) + path.sep;
  if (fullPath !== path.resolve(targetDir) && !fullPath.startsWith(targetRoot)) {
    throw new Error('Resolved path is outside allowed target.');
  }
  return {
    targetDir,
    safeRelative,
    fullPath
  };
}

async function writeAllowedFile(pageFile, target, file) {
  const targetDir = resolveAllowedTargetDir(pageFile, target);

  const safeSubdir = file.subdir ? sanitizeRelativePath(file.subdir) : null;
  const finalDir = (safeSubdir && safeSubdir !== '.')
    ? (() => {
        const resolved = path.resolve(targetDir, safeSubdir);
        const targetRoot = path.resolve(targetDir);
        if (resolved !== targetRoot && !resolved.startsWith(targetRoot + path.sep)) {
          throw new Error('Subdir is outside the allowed target directory.');
        }
        return resolved;
      })()
    : targetDir;

  const finalName = sanitizeFilename(file.filename);
  const filePath = path.join(finalDir, finalName);
  const encoding = file.encoding === 'base64' ? 'base64' : 'utf8';
  const data = encoding === 'base64'
    ? Buffer.from(String(file.content || ''), 'base64')
    : String(file.content || '');

  await fs.mkdir(finalDir, { recursive: true });

  // Atomic write: write to a sibling .tmp file first, then rename over the
  // target so a crash/premature exit never leaves the real file truncated to
  // 0 bytes (which happens on Windows when fs.writeFile is interrupted after
  // it has already truncated the original file but before data is flushed).
  const tmpPath = filePath + '.tmp';
  try {
    await fs.writeFile(tmpPath, data, encoding === 'base64' ? undefined : 'utf8');
    // Attempt an atomic rename. On Unix this is always atomic. On Windows it
    // succeeds when the destination is not locked. Only if rename fails with
    // EPERM (destination open by another process) do we unlink first and retry
    // — this minimises the window during which the original file is absent.
    try {
      await fs.rename(tmpPath, filePath);
    } catch (renameErr) {
      if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST') {
        await fs.unlink(filePath).catch(() => {});
        await fs.rename(tmpPath, filePath);
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    // Clean up the temp file on failure so it doesn't linger.
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }

  if (file.mtimeMs) {
    const t = new Date(Number(file.mtimeMs));
    await fs.utimes(filePath, t, t).catch(() => {});
  }

  return {
    filename: finalName,
    path: filePath
  };
}

function extractWrappedJsonValue(rawText) {
  const normalized = String(rawText || '');
  const assignmentMatch = normalized.match(/(?:window\.[A-Za-z_$][\w$]*\s*=\s*|const\s+[A-Za-z_$][\w$]*\s*=\s*|let\s+[A-Za-z_$][\w$]*\s*=\s*|var\s+[A-Za-z_$][\w$]*\s*=\s*|export\s+default\s+)/m);
  if (!assignmentMatch) {
    return null;
  }

  let start = assignmentMatch.index + assignmentMatch[0].length;
  while (/\s/.test(normalized[start] || '')) start += 1;

  const opener = normalized[start];
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : null;
  if (!closer) {
    return null;
  }

  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = start; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === '\'' || char === '`') {
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

function readSessionTimestampMeta(rawText, ext) {
  const text = String(rawText || '').replace(/^\uFEFF/, '');
  const meta = {};

  const createdComment = text.match(/^\s*\/\/\s*_createdAt:\s*(\d+)\s*$/m);
  const savedComment = text.match(/^\s*\/\/\s*_savedAt:\s*(\d+)\s*$/m);
  if (createdComment) meta.createdAt = Number(createdComment[1]) || 0;
  if (savedComment) meta.savedAt = Number(savedComment[1]) || 0;

  if (meta.createdAt || meta.savedAt) {
    return meta;
  }

  try {
    const parsed = ext === '.json'
      ? JSON.parse(text)
      : JSON.parse(extractWrappedJsonValue(text) || 'null');
    if (parsed && typeof parsed === 'object') {
      const createdAt = Number(parsed._createdAt);
      const savedAt = Number(parsed._savedAt);
      if (Number.isFinite(createdAt) && createdAt > 0) meta.createdAt = createdAt;
      if (Number.isFinite(savedAt) && savedAt > 0) meta.savedAt = savedAt;
      // Fallback for older files that only have a dateCreated ISO string (e.g. "2026-04-28T19:48:11.051Z_1")
      if (!meta.createdAt && parsed.dateCreated) {
        const stripped = String(parsed.dateCreated).replace(/_\d+$/, '');
        const ms = Date.parse(stripped);
        if (Number.isFinite(ms) && ms > 0) meta.createdAt = ms;
      }
    }
  } catch {}

  return meta;
}

async function listAllowedFiles(pageFile, target, request = {}) {
  const targetDir = resolveAllowedTargetDir(pageFile, target);
  const extensions = Array.isArray(request.extensions) ? request.extensions : ['.json'];
  const normalizedExtensions = extensions
    .map((ext) => String(ext || '').trim().toLowerCase())
    .filter(Boolean)
    .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));

  await fs.mkdir(targetDir, { recursive: true });
  const dirents = await fs.readdir(targetDir, { withFileTypes: true });
  const files = [];

  for (const dirent of dirents) {
    if (!dirent.isFile()) continue;
    const ext = path.extname(dirent.name).toLowerCase();
    if (normalizedExtensions.length && !normalizedExtensions.includes(ext)) continue;

    const filePath = path.join(targetDir, dirent.name);
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch {
      continue;
    }

    let jsonMeta = {};
    if (ext === '.json' || ext === '.js') {
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        jsonMeta = readSessionTimestampMeta(raw, ext);
      } catch {}
    }

    if (!jsonMeta.createdAt) {
      const birthtimeMs = Number(stats.birthtimeMs) || 0;
      const mtimeMs = Number(stats.mtimeMs) || 0;
      // Restored/imported files on Windows can get a fresh birthtime even when mtime is restored.
      if (birthtimeMs > 0 && mtimeMs > 0 && (birthtimeMs - mtimeMs) > 60_000) {
        jsonMeta.createdAt = mtimeMs;
      }
    }

    files.push({
      filename: dirent.name,
      path: filePath,
      size: stats.size,
      birthtimeMs: stats.birthtimeMs,
      ctimeMs: stats.ctimeMs,
      mtimeMs: stats.mtimeMs,
      ...jsonMeta
    });
  }

  files.sort((a, b) => (Number(b.mtimeMs) || 0) - (Number(a.mtimeMs) || 0));
  return files;
}

async function readAllowedFile(pageFile, target, filename) {
  const targetDir = resolveAllowedTargetDir(pageFile, target);
  const finalName = sanitizeFilename(filename);
  const filePath = path.join(targetDir, finalName);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    return {
      ok: true,
      filename: finalName,
      path: filePath,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      content
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        ok: false,
        filename: finalName,
        path: filePath,
        error: 'File not found.',
        code: 'ENOENT'
      };
    }
    throw error;
  }
}

async function readAllowedPathFile(pageFile, target, relativePath, encoding = 'utf8') {
  const { fullPath, safeRelative } = resolveAllowedTargetPath(pageFile, target, relativePath);
  const finalEncoding = encoding === 'base64' ? 'base64' : 'utf8';
  let pathToRead = fullPath;

  try {
    await fs.access(pathToRead, fsSync.constants.F_OK);
  } catch (error) {
    // In packaged builds, data might still be available only inside app resources.
    // Fall back to read-only bundled data for imports like books/*.epub.
    if (target === 'data') {
      const bundledPath = path.resolve(path.join(getBundledDataRoot()), safeRelative);
      try {
        await fs.access(bundledPath, fsSync.constants.F_OK);
        pathToRead = bundledPath;
      } catch {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const stats = await fs.stat(pathToRead);

  if (finalEncoding === 'base64') {
    const buf = await fs.readFile(pathToRead);
    return {
      relativePath: safeRelative,
      path: pathToRead,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      encoding: 'base64',
      content: buf.toString('base64')
    };
  }

  const content = await fs.readFile(pathToRead, 'utf8');
  return {
    relativePath: safeRelative,
    path: pathToRead,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    encoding: 'utf8',
    content
  };
}

async function listAllowedPathFiles(pageFile, target, relativePath, request = {}) {
  const { fullPath, safeRelative } = resolveAllowedTargetPath(pageFile, target, relativePath);
  const extensions = Array.isArray(request.extensions) ? request.extensions : [];
  const normalizedExtensions = extensions
    .map((ext) => String(ext || '').trim().toLowerCase())
    .filter(Boolean)
    .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
  const recursive = request.recursive !== false;

  const candidateDirs = [fullPath];
  if (target === 'data') {
    const bundledPath = path.resolve(path.join(getBundledDataRoot()), safeRelative);
    if (!candidateDirs.includes(bundledPath)) candidateDirs.push(bundledPath);
  }

  const files = [];
  const seen = new Set();

  async function walkDirectory(baseDir, currentDir, relativeDir = '') {
    let dirents;
    try {
      dirents = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }

    for (const dirent of dirents) {
      const absolutePath = path.join(currentDir, dirent.name);
      const childRelative = relativeDir
        ? path.posix.join(relativeDir, dirent.name)
        : dirent.name;

      if (dirent.isDirectory()) {
        if (recursive) {
          await walkDirectory(baseDir, absolutePath, childRelative);
        }
        continue;
      }

      if (!dirent.isFile()) continue;
      const ext = path.extname(dirent.name).toLowerCase();
      if (normalizedExtensions.length && !normalizedExtensions.includes(ext)) continue;

      const relativePathFromTarget = path.posix.join(safeRelative, childRelative);
      const dedupeKey = relativePathFromTarget.toLowerCase();
      if (seen.has(dedupeKey)) continue;

      let stats;
      try {
        stats = await fs.stat(absolutePath);
      } catch {
        continue;
      }

      seen.add(dedupeKey);

      let jsonMeta = {};
      if (ext === '.json' || ext === '.js') {
        try {
          const raw = await fs.readFile(absolutePath, 'utf8');
          jsonMeta = readSessionTimestampMeta(raw, ext);
        } catch {}
      }

      if (!jsonMeta.createdAt) {
        const birthtimeMs = Number(stats.birthtimeMs) || 0;
        const mtimeMs = Number(stats.mtimeMs) || 0;
        if (birthtimeMs > 0 && mtimeMs > 0 && (birthtimeMs - mtimeMs) > 60_000) {
          jsonMeta.createdAt = mtimeMs;
        }
      }

      files.push({
        filename: dirent.name,
        relativePath: relativePathFromTarget,
        path: absolutePath,
        size: stats.size,
        birthtimeMs: stats.birthtimeMs,
        mtimeMs: stats.mtimeMs,
        ...jsonMeta
      });
    }
  }

  for (const dirPath of candidateDirs) {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) continue;
      await walkDirectory(dirPath, dirPath, '');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  return files;
}

async function deleteAllowedPathEntry(pageFile, target, relativePath, options = {}) {
  const { fullPath, safeRelative } = resolveAllowedTargetPath(pageFile, target, relativePath);
  const recursive = options.recursive !== false;
  const force = options.force !== false;
  await fs.rm(fullPath, { recursive, force });
  return {
    relativePath: safeRelative,
    path: fullPath
  };
}

async function renameAllowedPathEntry(pageFile, target, oldRelativePath, newRelativePath) {
  const oldResolved = resolveAllowedTargetPath(pageFile, target, oldRelativePath);
  const newResolved = resolveAllowedTargetPath(pageFile, target, newRelativePath);
  await fs.mkdir(path.dirname(newResolved.fullPath), { recursive: true });
  await fs.rename(oldResolved.fullPath, newResolved.fullPath);
  return {
    oldRelativePath: oldResolved.safeRelative,
    newRelativePath: newResolved.safeRelative,
    path: newResolved.fullPath
  };
}

async function copyMissingTree(sourceDir, destinationDir, options = {}, relativePrefix = '') {
  const skipRelativePaths = options && options.skipRelativePaths instanceof Set
    ? options.skipRelativePaths
    : null;
  let sourceEntries;
  try {
    sourceEntries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    return;
  }

  await fs.mkdir(destinationDir, { recursive: true });

  for (const entry of sourceEntries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    const relPath = relativePrefix
      ? path.posix.join(relativePrefix, entry.name)
      : entry.name;
    const normalizedRelPath = relPath.replace(/\\/g, '/').toLowerCase();

    if (skipRelativePaths && skipRelativePaths.has(normalizedRelPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyMissingTree(sourcePath, destinationPath, options, relPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    try {
      await fs.access(destinationPath);
    } catch {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

// Collects files in sourceDir that already exist in destinationDir but differ
// in size or mtime (bundled file is newer). Returns an array of conflict records.
async function collectConflicts(sourceDir, destinationDir, relativePrefix = '') {
  let sourceEntries;
  try {
    sourceEntries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const conflicts = [];
  for (const entry of sourceEntries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const sub = await collectConflicts(sourcePath, destinationPath, relPath);
      conflicts.push(...sub);
      continue;
    }
    if (!entry.isFile()) continue;

    let destStat;
    try {
      destStat = await fs.stat(destinationPath);
    } catch {
      // File doesn't exist in destination — not a conflict, will be seeded normally.
      continue;
    }

    let srcStat;
    try {
      srcStat = await fs.stat(sourcePath);
    } catch {
      continue;
    }

    const differs = srcStat.size !== destStat.size || srcStat.mtimeMs > destStat.mtimeMs;
    if (differs) {
      conflicts.push({
        relativePath: relPath,
        sourcePath,
        destinationPath,
        srcSize: srcStat.size,
        srcMtimeMs: srcStat.mtimeMs,
        destSize: destStat.size,
        destMtimeMs: destStat.mtimeMs
      });
    }
  }
  return conflicts;
}

async function ensureWritableSeedData() {
  if (!app.isPackaged) {
    return;
  }

  const saveTargets = getSaveTargets();
  const writableRoot = getWritableRootDir();
  const legacyDataRoot = path.join(writableRoot, 'data');
  const legacyCustomDataRoot = path.join(writableRoot, 'user/log/custom-data');
  // Create all writable target folders up front so portable builds mirror Linux behavior.
  await Promise.all([
    fs.mkdir(saveTargets.user, { recursive: true }),
    fs.mkdir(saveTargets.data, { recursive: true }),
    fs.mkdir(saveTargets.customWordbanks, { recursive: true }),
    fs.mkdir(saveTargets.customQuotes, { recursive: true }),
    fs.mkdir(saveTargets.customGapfillbanks, { recursive: true }),
    fs.mkdir(saveTargets.customErrorbanks, { recursive: true }),
    fs.mkdir(saveTargets.customDictations, { recursive: true }),
    fs.mkdir(saveTargets.customGrammarbanks, { recursive: true }),
    fs.mkdir(saveTargets.customQuizzes, { recursive: true }),
    fs.mkdir(saveTargets.customSentences, { recursive: true }),
    fs.mkdir(saveTargets.customStorybanks, { recursive: true }),
    fs.mkdir(saveTargets.groupParticipation, { recursive: true }),
    fs.mkdir(saveTargets.mindmaps, { recursive: true }),
    fs.mkdir(saveTargets.constellationTemplates, { recursive: true }),
    fs.mkdir(saveTargets.textualAnalyses, { recursive: true }),
    fs.mkdir(saveTargets.notes, { recursive: true }),
    fs.mkdir(saveTargets.grades, { recursive: true })
  ]);

  await copyMissingTree(getBundledDataRoot(), saveTargets.data, {
    // Keep root wordDb.js from being recreated on every launch.
    // Word banks are expected under user/custom-data/wordbanks.
    skipRelativePaths: new Set(['worddb.js'])
  });
  await copyMissingTree(legacyDataRoot, saveTargets.data);
  await copyMissingTree(legacyCustomDataRoot, saveTargets.customData);
  await copyMissingTree(path.join(ROOT_DIR, 'user'), saveTargets.user);

  const legacyCustomFolders = [
    { from: path.join(saveTargets.customData, 'custom-books'), to: saveTargets.customBooks },
    { from: path.join(saveTargets.customData, 'custom-dictations'), to: saveTargets.customDictations },
    { from: path.join(saveTargets.customData, 'custom-errorbanks'), to: saveTargets.customErrorbanks },
    { from: path.join(saveTargets.customData, 'custom-gapfillbanks'), to: saveTargets.customGapfillbanks },
    { from: path.join(saveTargets.customData, 'custom-grammarbanks'), to: saveTargets.customGrammarbanks },
    { from: path.join(saveTargets.customData, 'custom-quizzes'), to: saveTargets.customQuizzes },
    { from: path.join(saveTargets.customData, 'custom-quotes'), to: saveTargets.customQuotes },
    { from: path.join(saveTargets.customData, 'custom-sentences'), to: saveTargets.customSentences },
    { from: path.join(saveTargets.customData, 'custom-storybanks'), to: saveTargets.customStorybanks }
  ];
  for (const pair of legacyCustomFolders) {
    await copyMissingTree(pair.from, pair.to);
  }

  const rootFileMigrations = [
    { name: 'chooseStory.js', toDir: saveTargets.customStorybanks },
    { name: 'dictation.js', toDir: saveTargets.customDictations },
    { name: 'errorBank.js', toDir: saveTargets.customErrorbanks },
    { name: 'gapFillBank.js', toDir: saveTargets.customGapfillbanks },
    { name: 'grammar.js', toDir: saveTargets.customGrammarbanks },
    { name: 'quiz.js', toDir: saveTargets.customQuizzes },
    { name: 'orderSentences.js', toDir: saveTargets.customSentences },
    { name: 'quoteBank.js', toDir: saveTargets.customQuotes }
  ];
  for (const migration of rootFileMigrations) {
    const fromPath = path.join(saveTargets.customData, migration.name);
    const toPath = path.join(migration.toDir, migration.name);
    try {
      await fs.mkdir(migration.toDir, { recursive: true });
      try {
        await fs.access(toPath, fsSync.constants.F_OK);
      } catch {
        await fs.copyFile(fromPath, toPath);
      }
      try {
        await fs.unlink(fromPath);
      } catch {}
    } catch {}
  }

  const nonWordbankFiles = new Set([
    'choosestory.js',
    'dictation.js',
    'errorbank.js',
    'gapfillbank.js',
    'grammar.js',
    'quiz.js',
    'ordersentences.js',
    'quotebank.js'
  ]);
  try {
    const rootEntries = await fs.readdir(saveTargets.customData, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== '.js') continue;
      if (nonWordbankFiles.has(entry.name.toLowerCase())) continue;
      const fromPath = path.join(saveTargets.customData, entry.name);
      const toPath = path.join(saveTargets.customWordbanks, entry.name);
      try {
        await fs.access(toPath, fsSync.constants.F_OK);
      } catch {
        await fs.rename(fromPath, toPath);
      }
    }
  } catch {}
}

function getPortableRootConfigPath() {
  return path.join(app.getPath('userData'), 'portable-root.json');
}

function getBackupLocationConfigPath() {
  return path.join(app.getPath('userData'), 'backup-location.json');
}

async function loadSavedBackupLocation() {
  try {
    const raw = await fs.readFile(getBackupLocationConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    const saved = String(parsed?.backupLocation || '').trim();
    return saved || null;
  } catch {
    return null;
  }
}

async function saveBackupLocation(dirPath) {
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(
      getBackupLocationConfigPath(),
      JSON.stringify({ backupLocation: dirPath }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save backup location config:', err);
  }
}

function getSyncLocationConfigPath() {
  return path.join(app.getPath('userData'), 'sync-location.json');
}

async function loadSavedSyncLocation() {
  try {
    const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    const saved = String(parsed?.syncLocation || '').trim();
    return saved || null;
  } catch {
    return null;
  }
}

async function saveSyncLocation(dirPath) {
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    // Preserve any existing fields (e.g. autoSync) when updating syncLocation.
    let existing = {};
    try {
      const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
      existing = JSON.parse(raw);
    } catch {}
    existing.syncLocation = dirPath;
    await fs.writeFile(
      getSyncLocationConfigPath(),
      JSON.stringify(existing, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save sync location config:', err);
  }
}

async function loadAutoSyncEnabled() {
  try {
    const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.autoSync === true;
  } catch {
    return false;
  }
}

async function saveAutoSyncEnabled(enabled) {
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    let config = {};
    try {
      const raw = await fs.readFile(getSyncLocationConfigPath(), 'utf8');
      config = JSON.parse(raw);
    } catch {}
    config.autoSync = enabled;
    await fs.writeFile(
      getSyncLocationConfigPath(),
      JSON.stringify(config, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save autoSync setting:', err);
  }
}

// ── Sync baseline (FreeFileSync-style last-known-state) ──────────────────────
// Stored in userData so it never appears as a sync conflict itself.
// Each entry: relativePath (with sub-dir prefix) → { mtimeMs, size }
// After a successful sync, both sides have an identical file; we record
// that agreed state here so future syncs can detect which side changed.

function getSyncBaselinePath() {
  return path.join(getWritableRootDir(), 'user', 'sync-baseline.json');
}

async function loadSyncBaseline() {
  try {
    const raw = await fs.readFile(getSyncBaselinePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed || {}));
  } catch {
    return new Map();
  }
}

async function saveSyncBaseline(baselineMap) {
  try {
    await fs.mkdir(path.dirname(getSyncBaselinePath()), { recursive: true });
    const obj = Object.fromEntries(baselineMap);
    const tmp = getSyncBaselinePath() + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
    try { await fs.unlink(getSyncBaselinePath()); } catch {}
    await fs.rename(tmp, getSyncBaselinePath());
  } catch (err) {
    console.error('Failed to save sync baseline:', err);
  }
}

// Pending baseline entries collected during a sync run; committed after all
// conflicts are resolved (or immediately if there are none).
let _pendingBaselineEntries = [];

function stopAutoSyncWatcher() {
  if (_autoSyncTimer) {
    clearTimeout(_autoSyncTimer);
    _autoSyncTimer = null;
  }
  if (_autoSyncWatcher) {
    _autoSyncWatcher.close();
    _autoSyncWatcher = null;
  }
}

async function runAutoSync() {
  _autoSyncTimer = null;
  if (_autoSyncRunning) return;
  const syncLocation = await loadSavedSyncLocation();
  if (!syncLocation) return;
  try {
    fsSync.accessSync(syncLocation, fsSync.constants.W_OK);
  } catch {
    return; // target inaccessible — skip silently
  }
  _autoSyncRunning = true;
  try {
    const writableRoot = getWritableRootDir();
    const subDirs = ['user', 'data'];
    for (const sub of subDirs) {
      const srcDir  = path.join(writableRoot, sub);
      const destDir = path.join(syncLocation, sub);
      const result  = await syncTrees(srcDir, destDir, 'to-target');
      // Auto-resolve conflicts: source always wins
      for (const c of result.conflicts) {
        const relPath = c.relativePath.replace(/\\/g, '/');
        if (relPath.split('/').some(seg => seg === '..' || seg === '.')) continue;
        try {
          const srcPath  = path.join(srcDir,  relPath);
          const destPath = path.join(destDir, relPath);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(srcPath, destPath);
          const stat = await fs.stat(srcPath);
          await fs.utimes(destPath, stat.atime, stat.mtime).catch(() => {});
        } catch {}
      }
    }
  } catch (err) {
    console.error('Auto-sync error:', err);
  } finally {
    _autoSyncRunning = false;
  }
}

function startAutoSyncWatcher() {
  stopAutoSyncWatcher();
  const writableRoot = getWritableRootDir();
  const subDirs = ['user', 'data'];
  const handles = [];

  for (const sub of subDirs) {
    const dir = path.join(writableRoot, sub);
    try {
      const w = fsSync.watch(dir, { recursive: true }, (_eventType, _filename) => {
        if (_autoSyncRunning) return;
        if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
        _autoSyncTimer = setTimeout(runAutoSync, 3000);
      });
      w.on('error', () => {}); // ignore watch errors silently
      handles.push(w);
    } catch {
      // Directory may not exist yet; ignore.
    }
  }

  if (handles.length > 0) {
    _autoSyncWatcher = { close: () => handles.forEach(w => { try { w.close(); } catch {} }) };
  }
}

// mode: 'to-target' | 'to-source' | 'both'
// source = current data sub-dir, dest = sync location sub-dir
// baseline: { map: Map<string,{mtimeMs,size}>, prefix: string } | null
//   map keys are full relative paths (prefix + '/' + rel), values are the
//   last-known agreed state after the previous successful sync.
async function syncTrees(srcDir, destDir, mode, { autoNew = true, baseline = null } = {}) {
  let copied = 0;
  const errors = [];
  const conflicts = [];
  const added = [];
  const newFiles = [];
  const synced = []; // files auto-resolved via baseline; entries: { relativePath, mtimeMs, size }

  async function collectFiles(dir, prefix) {
    const result = new Map();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return result;
    }
    for (const entry of entries) {
      // Never sync the baseline file — it is machine-specific
      if (entry.isFile() && entry.name === 'sync-baseline.json') continue;
      const rel = prefix ? prefix + '/' + entry.name : entry.name;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await collectFiles(fullPath, rel);
        for (const [k, v] of sub) result.set(k, v);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          result.set(rel, { fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch {
          result.set(rel, { fullPath, mtimeMs: 0, size: 0 });
        }
      }
    }
    return result;
  }

  async function copyOne(fromPath, toPath) {
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.copyFile(fromPath, toPath);
    const stat = await fs.stat(fromPath);
    await fs.utimes(toPath, stat.atime, stat.mtime).catch(() => {});
  }

  const srcFiles  = await collectFiles(srcDir,  '');
  const destFiles = await collectFiles(destDir, '');

  // FAT32 / Windows filesystems store timestamps in local time; on Linux these appear
  // offset by a whole number of hours (commonly 1 or 2 h) compared to an ext4 folder.
  // If sizes match and the diff is exactly a multiple of 3 600 s, treat files as identical.
  function isTzOnlyDiff(a, b) {
    if (a.size !== b.size) return false;
    const diffMs = Math.abs(a.mtimeMs - b.mtimeMs);
    return diffMs > 0 && diffMs % 3_600_000 === 0;
  }

  if (mode === 'to-target') {
    for (const [rel, srcEntry] of srcFiles) {
      const destEntry = destFiles.get(rel);
      if (!destEntry) {
        if (autoNew) {
          // new file on source side → copy to dest automatically
          try { await copyOne(srcEntry.fullPath, path.join(destDir, rel)); copied++; added.push(rel); }
          catch (err) { errors.push({ path: rel, error: String(err?.message || err) }); }
        } else {
          newFiles.push({ relativePath: rel, side: 'src-only', srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs, destSize: null, destMtimeMs: null });
        }
      } else if (Math.abs(srcEntry.mtimeMs - destEntry.mtimeMs) >= 1000 && !isTzOnlyDiff(srcEntry, destEntry)) {
        conflicts.push({
          relativePath: rel,
          srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs,
          destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs
        });
      }
      // same timestamp (or tz-only offset with same size) → skip
    }
  } else if (mode === 'to-source') {
    for (const [rel, destEntry] of destFiles) {
      const srcEntry = srcFiles.get(rel);
      if (!srcEntry) {
        if (autoNew) {
          // new file in sync folder → copy to source automatically
          try { await copyOne(destEntry.fullPath, path.join(srcDir, rel)); copied++; added.push(rel); }
          catch (err) { errors.push({ path: rel, error: String(err?.message || err) }); }
        } else {
          newFiles.push({ relativePath: rel, side: 'dest-only', srcSize: null, srcMtimeMs: null, destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs });
        }
      } else if (Math.abs(srcEntry.mtimeMs - destEntry.mtimeMs) >= 1000 && !isTzOnlyDiff(srcEntry, destEntry)) {
        conflicts.push({
          relativePath: rel,
          srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs,
          destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs
        });
      }
    }
  } else {
    // both: unique files shown for approval (autoNew=false) or copied automatically; shared files that differ are conflicts
    const allRels = new Set([...srcFiles.keys(), ...destFiles.keys()]);
    for (const rel of allRels) {
      const srcEntry  = srcFiles.get(rel);
      const destEntry = destFiles.get(rel);
      try {
        if (srcEntry && !destEntry) {
          if (autoNew) {
            await copyOne(srcEntry.fullPath, path.join(destDir, rel)); copied++; added.push(rel);
          } else {
            newFiles.push({ relativePath: rel, side: 'src-only', srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs, destSize: null, destMtimeMs: null });
          }
        } else if (!srcEntry && destEntry) {
          if (autoNew) {
            await copyOne(destEntry.fullPath, path.join(srcDir, rel)); copied++; added.push(rel);
          } else {
            newFiles.push({ relativePath: rel, side: 'dest-only', srcSize: null, srcMtimeMs: null, destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs });
          }
        } else if (srcEntry && destEntry) {
          if (Math.abs(srcEntry.mtimeMs - destEntry.mtimeMs) < 1000 || isTzOnlyDiff(srcEntry, destEntry)) continue;

          // Consult baseline to detect which side actually changed
          const baseKey = baseline ? (baseline.prefix + '/' + rel) : null;
          const base    = baseKey ? baseline.map.get(baseKey) : null;
          if (base) {
            const srcChanged  = Math.abs(srcEntry.mtimeMs  - base.mtimeMs) >= 1000 || srcEntry.size  !== base.size;
            const destChanged = Math.abs(destEntry.mtimeMs - base.mtimeMs) >= 1000 || destEntry.size !== base.size;

            if (!srcChanged && !destChanged) {
              // Platform rounding artefact — files are effectively identical
              continue;
            } else if (srcChanged && !destChanged) {
              // Only source changed → auto-copy to dest
              try {
                await copyOne(srcEntry.fullPath, path.join(destDir, rel));
                const stat = await fs.stat(path.join(destDir, rel));
                copied++;
                synced.push({ relativePath: rel, mtimeMs: stat.mtimeMs, size: stat.size });
              } catch (err) {
                errors.push({ path: rel, error: String(err?.message || err) });
              }
              continue;
            } else if (!srcChanged && destChanged) {
              // Only dest changed → auto-copy to source
              try {
                await copyOne(destEntry.fullPath, path.join(srcDir, rel));
                const stat = await fs.stat(path.join(srcDir, rel));
                copied++;
                synced.push({ relativePath: rel, mtimeMs: stat.mtimeMs, size: stat.size });
              } catch (err) {
                errors.push({ path: rel, error: String(err?.message || err) });
              }
              continue;
            }
            // Both changed → fall through to conflict
          }

          conflicts.push({
            relativePath: rel,
            srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs,
            destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs
          });
        }
      } catch (err) {
        errors.push({ path: rel, error: String(err?.message || err) });
      }
    }
  }

  return { copied, errors, conflicts, added, newFiles, synced };
}

async function copyTreeForBackup(sourceDir, destDir) {
  let dirents;
  try {
    dirents = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    return { copied: 0, errors: [] };
  }

  await fs.mkdir(destDir, { recursive: true });

  let copied = 0;
  const errors = [];

  for (const entry of dirents) {
    const srcPath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      const sub = await copyTreeForBackup(srcPath, destPath);
      copied += sub.copied;
      errors.push(...sub.errors);
    } else if (entry.isFile()) {
      try {
        await fs.copyFile(srcPath, destPath);
        const stats = await fs.stat(srcPath);
        await fs.utimes(destPath, stats.atime, stats.mtime).catch(() => {});
        copied++;
      } catch (err) {
        errors.push({ path: srcPath, error: String(err?.message || err) });
      }
    }
  }

  return { copied, errors };
}

async function loadSavedPortableRoot() {
  if (process.env.PORTABLE_ROOT) {
    return; // already set, nothing to do
  }
  try {
    const raw = await fs.readFile(getPortableRootConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    const saved = String(parsed?.portableRoot || '').trim();
    if (saved) {
      // Verify the saved path is still writable before restoring it.
      try {
        fsSync.accessSync(saved, fsSync.constants.W_OK);
        process.env.PORTABLE_ROOT = saved;
      } catch {
        // Saved path is no longer accessible; ignore it so we can re-detect.
      }
    }
  } catch {
    // no saved config or unreadable — ignore
  }
}

async function savePortableRoot(dirPath) {
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(
      getPortableRootConfigPath(),
      JSON.stringify({ portableRoot: dirPath }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save portable root config:', err);
  }
}

async function checkIsFirstRun() {
  const writableRoot = getWritableRootDir();
  for (const folder of ['data', 'user']) {
    try {
      await fs.access(path.join(writableRoot, folder));
      return false;
    } catch {}
  }
  return true;
}

async function ensureWritableSeedDataWithFallback() {
  if (!app.isPackaged) {
    return;
  }

  // Restore previously chosen data folder across launches.
  await loadSavedPortableRoot();

  // Detect first run before seed data creates the folders.
  firstRunDetected = await checkIsFirstRun();

  try {
    await ensureWritableSeedData();
    return;
  } catch (firstError) {
    console.error('Failed to initialize writable data folders at default location:', firstError);
  }

  // Automatically retry with the Electron user data directory before prompting.
  // This handles read-only environments (e.g. AppImage on read-only media) without
  // requiring any user interaction.
  process.env.PORTABLE_ROOT = app.getPath('userData');
  try {
    await ensureWritableSeedData();
    return;
  } catch (userDataError) {
    console.error('Failed to initialize writable data folders in userData:', userDataError);
  }

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose a folder to store app data',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Save data here'
  });

  if (canceled || !filePaths?.[0]) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'No data folder selected',
      message: 'No folder was selected. The app will open but saving may not work correctly.',
      buttons: ['OK']
    });
    return;
  }

  process.env.PORTABLE_ROOT = filePaths[0];
  await savePortableRoot(filePaths[0]);

  try {
    await ensureWritableSeedData();
  } catch (retryError) {
    console.error('Failed to initialize writable data folders in chosen directory:', retryError);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Data folder error',
      message: `Could not create data folders in:\n${filePaths[0]}\n\nThe app will open but saving may not work correctly.`,
      buttons: ['OK']
    });
  }
}

// ── ZIP builder (no external dependencies) ────────────────────────────
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buffer[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function msToDosDateTime(ms) {
  const d = new Date(Number(ms) || Date.now());
  let year = d.getFullYear();
  if (year < 1980) year = 1980;
  if (year > 2107) year = 2107;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = Math.floor(d.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

function dosDateTimeToMs(dosTime, dosDate) {
  if (!dosDate && !dosTime) return null;

  const year = 1980 + ((dosDate >> 9) & 0x7f);
  const month = (dosDate >> 5) & 0x0f;
  const day = dosDate & 0x1f;
  const hours = (dosTime >> 11) & 0x1f;
  const minutes = (dosTime >> 5) & 0x3f;
  const seconds = (dosTime & 0x1f) * 2;

  const ms = new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function buildZip(entries) {
  // entries: Array<{ name: string, data: Buffer, mtimeMs?: number }>
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compressed = zlib.deflateRawSync(entry.data, { level: 6 });
    const crc = crc32(entry.data);
    const { dosTime, dosDate } = msToDosDateTime(entry.mtimeMs);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centralParts.push(central);

    offset += local.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(centralParts.length, 8);
  end.writeUInt16LE(centralParts.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, end]);
}

async function collectDirEntries(dirPath, zipPrefix) {
  const entries = [];
  let dirents;
  try {
    dirents = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return entries;
  }
  for (const dirent of dirents) {
    const full = path.join(dirPath, dirent.name);
    const zipName = zipPrefix ? `${zipPrefix}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      entries.push(...await collectDirEntries(full, zipName));
    } else if (dirent.isFile()) {
      try {
        const data = await fs.readFile(full);
        const stats = await fs.stat(full);
        entries.push({
          name: zipName,
          data,
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
          birthtimeMs: stats.birthtimeMs
        });
      } catch {}
    }
  }
  return entries;
}
// ──────────────────────────────────────────────────────────────────────

ipcMain.handle('app:backup-zip', async (event) => {
  const BACKUP_META_ENTRY = '__backup_meta__.json';
  const writableRoot = getWritableRootDir();
  const targets = [
    { dir: path.join(writableRoot, 'user'), prefix: 'user' }
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Backup',
    defaultPath: path.join(app.getPath('downloads'), `backup-${dateStr}.zip`),
    filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
  });

  if (canceled || !filePath) {
    return { ok: false, canceled: true };
  }

  const entries = [];
  for (const t of targets) {
    entries.push(...await collectDirEntries(t.dir, t.prefix));
  }

  const timestampMap = {};
  for (const entry of entries) {
    timestampMap[entry.name] = {
      mtimeMs: Number(entry.mtimeMs) || undefined,
      ctimeMs: Number(entry.ctimeMs) || undefined,
      birthtimeMs: Number(entry.birthtimeMs) || undefined
    };
  }

  const backupMeta = {
    version: 1,
    generatedAt: Date.now(),
    timestamps: timestampMap
  };
  entries.push({
    name: BACKUP_META_ENTRY,
    data: Buffer.from(JSON.stringify(backupMeta), 'utf8'),
    mtimeMs: Date.now()
  });

  const zipBuffer = buildZip(entries);
  await fs.writeFile(filePath, zipBuffer);
  return { ok: true, path: filePath, count: entries.length };
});

// Extract zip entries into an array of { name, data, mtimeMs }
function parseZipEntries(zipBuffer) {
  const entries = [];
  let offset = 0;

  while (offset < zipBuffer.length - 22) {
    const signature = zipBuffer.readUInt32LE(offset);
    
    // Local file header
    if (signature === 0x04034b50) {
      const filenameLen = zipBuffer.readUInt16LE(offset + 26);
      const extraLen = zipBuffer.readUInt16LE(offset + 28);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const uncompressedSize = zipBuffer.readUInt32LE(offset + 22);
      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const dosTime = zipBuffer.readUInt16LE(offset + 10);
      const dosDate = zipBuffer.readUInt16LE(offset + 12);
      const mtimeMs = dosDateTimeToMs(dosTime, dosDate);
      
      const filename = zipBuffer.toString('utf8', offset + 30, offset + 30 + filenameLen);
      const dataStart = offset + 30 + filenameLen + extraLen;
      const dataEnd = dataStart + compressedSize;
      
      let data;
      if (compressionMethod === 8) {
        // Deflate compressed
        data = zlib.inflateRawSync(zipBuffer.slice(dataStart, dataEnd));
      } else if (compressionMethod === 0) {
        // Stored (no compression)
        data = zipBuffer.slice(dataStart, dataEnd);
      }
      
      if (data && uncompressedSize === data.length) {
        entries.push({ name: filename, data, mtimeMs: mtimeMs || undefined });
      }
      
      offset = dataEnd;
    } else {
      offset += 1;
    }
  }

  return entries;
}

function normalizeZipEntryPath(entryName) {
  const raw = String(entryName || '').replace(/\\+/g, '/').trim();
  if (!raw) return null;

  // Normalize separators and remove leading "./" segments.
  const normalized = path.posix.normalize(raw).replace(/^\.\//, '');
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
    return null;
  }

  return normalized;
}

ipcMain.handle('app:restore-zip', async (event) => {
  const BACKUP_META_ENTRY = '__backup_meta__.json';
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Backup ZIP File',
    filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
    properties: ['openFile']
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { ok: false, canceled: true };
  }

  const zipPath = filePaths[0];
  
  try {
    const zipBuffer = await fs.readFile(zipPath);
    const parsedEntries = parseZipEntries(zipBuffer);
    const entries = parsedEntries.filter((entry) => normalizeZipEntryPath(entry.name) !== BACKUP_META_ENTRY);
    
    const writableRoot = getWritableRootDir();
    const targets = {
      log: path.join(writableRoot, 'user', 'log'),
      user: path.join(writableRoot, 'user')
    };

    // Check for conflicts
    const conflicts = [];
    for (const entry of entries) {
      const normalizedEntryPath = normalizeZipEntryPath(entry.name);
      if (!normalizedEntryPath) continue;

      const parts = normalizedEntryPath.split('/');
      if (parts.length < 2) continue;
      
      const target = parts[0];
      const relativePath = parts.slice(1).join('/');
      const targetDir = targets[target];
      
      if (!targetDir) continue;
      
      const fullPath = path.join(targetDir, relativePath);
      
      try {
        await fs.access(fullPath);
        // File exists, add to conflicts
        conflicts.push({
          id: normalizedEntryPath.replace(/\//g, '_'),
          path: normalizedEntryPath
        });
      } catch {
        // File doesn't exist, no conflict
      }
    }

    return {
      ok: true,
      zipPath,
      conflicts,
      fileCount: entries.length
    };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? err.message : 'Failed to read zip file'
    };
  }
});

ipcMain.handle('app:apply-restore-choices', async (event, request = {}) => {
  const BACKUP_META_ENTRY = '__backup_meta__.json';
  const { zipPath, choices = {} } = request;
  
  if (!zipPath) {
    return { ok: false, error: 'No zip path provided' };
  }

  try {
    const zipBuffer = await fs.readFile(zipPath);
    const parsedEntries = parseZipEntries(zipBuffer);
    const backupMetaEntry = parsedEntries.find((entry) => normalizeZipEntryPath(entry.name) === BACKUP_META_ENTRY);
    let backupMetaTimestamps = null;

    if (backupMetaEntry) {
      try {
        const parsed = JSON.parse(backupMetaEntry.data.toString('utf8'));
        if (parsed && typeof parsed === 'object' && parsed.timestamps && typeof parsed.timestamps === 'object') {
          backupMetaTimestamps = parsed.timestamps;
        }
      } catch {}
    }

    const entries = parsedEntries.filter((entry) => normalizeZipEntryPath(entry.name) !== BACKUP_META_ENTRY);
    
    const writableRoot = getWritableRootDir();
    const targets = {
      log: path.join(writableRoot, 'user', 'log'),
      user: path.join(writableRoot, 'user')
    };

    let restored = 0;

    for (const entry of entries) {
      const normalizedEntryPath = normalizeZipEntryPath(entry.name);
      if (!normalizedEntryPath) continue;

      const parts = normalizedEntryPath.split('/');
      if (parts.length < 2) continue;
      
      const target = parts[0];
      const relativePath = parts.slice(1).join('/');
      const targetDir = targets[target];
      
      if (!targetDir) continue;
      
      const fullPath = path.join(targetDir, relativePath);
      const entryId = normalizedEntryPath.replace(/\//g, '_');
      const choice = choices[entryId];

      // Check if file exists
      let fileExists = false;
      try {
        await fs.access(fullPath);
        fileExists = true;
      } catch {}

      // Skip if file exists and choice is 'skip' or not specified
      if (fileExists && (!choice || choice === 'skip')) {
        continue;
      }

      // Handle rename (backup original)
      if (fileExists && choice === 'rename') {
        const ext = path.extname(fullPath);
        const base = fullPath.slice(0, -ext.length);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const backupPath = `${base}.bak-${timestamp}${ext}`;
        await fs.rename(fullPath, backupPath);
      }

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file (overwrite or new) — use atomic temp+rename to avoid 0-byte
      // files if the process is interrupted mid-write.
      const tmpRestorePath = fullPath + '.tmp';
      try {
        await fs.writeFile(tmpRestorePath, entry.data);
        await fs.unlink(fullPath).catch(() => {});
        await fs.rename(tmpRestorePath, fullPath);
      } catch (writeErr) {
        await fs.unlink(tmpRestorePath).catch(() => {});
        throw writeErr;
      }

      const metaTs = backupMetaTimestamps && backupMetaTimestamps[normalizedEntryPath]
        ? backupMetaTimestamps[normalizedEntryPath]
        : null;
      const mtimeMs = Number(
        (metaTs && metaTs.mtimeMs) ||
        entry.mtimeMs ||
        0
      );
      if (Number.isFinite(mtimeMs) && mtimeMs > 0) {
        const t = new Date(mtimeMs);
        await fs.utimes(fullPath, t, t).catch(() => {});
      }

      restored++;
    }

    return {
      ok: true,
      restored,
      message: `Successfully restored ${restored} files`
    };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? err.message : 'Failed to restore files'
    };
  }
});

ipcMain.handle('app:get-data-location', async () => {
  const configuredPortableRoot = String(process.env.PORTABLE_ROOT || '').trim() || null;
  const resolvedWritableRoot = getWritableRootDir();

  return {
    ok: true,
    configuredPortableRoot,
    resolvedWritableRoot,
    configPath: getPortableRootConfigPath(),
    isPackaged: app.isPackaged,
    isFirstRun: firstRunDetected
  };
});

ipcMain.handle('app:go-to-launcher', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (mainWindow && !mainWindow.isDestroyed() && senderWin !== mainWindow) {
    if (getLoadedPageFile(mainWindow) !== PAGE_FILES.launcher) {
      await loadTool(PAGE_FILES.launcher, mainWindow);
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    if (senderWin && !senderWin.isDestroyed()) senderWin.close();
  } else {
    await loadTool(PAGE_FILES.launcher, senderWin || mainWindow);
  }
  return { ok: true };
});

ipcMain.handle('app:load-page', async (event, request = {}) => {
  const pageFile = request.pageFile;
  const knownPages = new Set(Object.values(PAGE_FILES));
  if (!pageFile || !knownPages.has(pageFile)) {
    return { ok: false, error: `Unknown page: ${pageFile}` };
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    return { ok: false, error: 'Window not available.' };
  }
  await loadTool(pageFile, win);
  return { ok: true };
});

function reloadOtherWindows(senderWebContents) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents !== senderWebContents) {
      win.webContents.reload();
    }
  }
}

ipcMain.handle('app:pick-data-location', async (event) => {
  const previousRoot = getWritableRootDir();

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose a folder to store app data',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use this folder'
  });

  if (canceled || !filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  const selected = path.resolve(String(filePaths[0]));

  try {
    fsSync.accessSync(selected, fsSync.constants.W_OK);
  } catch {
    return {
      ok: false,
      canceled: false,
      error: 'Selected folder is not writable.'
    };
  }

  process.env.PORTABLE_ROOT = selected;
  await savePortableRoot(selected);

  try {
    await ensureWritableSeedData();
  } catch (error) {
    return {
      ok: false,
      canceled: false,
      error: `Could not initialize app data folders in: ${selected}`,
      details: String(error?.message || error)
    };
  }

  reloadOtherWindows(event.sender);

  // If auto-sync is active, restart the watcher on the new data root.
  loadAutoSyncEnabled().then(enabled => { if (enabled) startAutoSyncWatcher(); }).catch(() => {});

  return {
    ok: true,
    canceled: false,
    selected,
    previousRoot,
    resolvedWritableRoot: getWritableRootDir()
  };
});

ipcMain.handle('app:reset-data-location', async (event) => {
  const previousRoot = getWritableRootDir();

  // Clear the saved override so the default is used on next launch too.
  delete process.env.PORTABLE_ROOT;
  try {
    await fs.unlink(getPortableRootConfigPath());
  } catch { /* already gone */ }

  const defaultRoot = getDefaultWritableRootDir();

  try {
    await ensureWritableSeedData();
  } catch (error) {
    return {
      ok: false,
      error: `Could not initialize app data folders at: ${defaultRoot}`,
      details: String(error?.message || error)
    };
  }

  reloadOtherWindows(event.sender);

  // If auto-sync is active, restart the watcher on the new data root.
  loadAutoSyncEnabled().then(enabled => { if (enabled) startAutoSyncWatcher(); }).catch(() => {});

  return {
    ok: true,
    previousRoot,
    resolvedWritableRoot: getWritableRootDir()
  };
});

ipcMain.handle('app:migrate-data-location', async (_event, { from } = {}) => {
  if (!from || typeof from !== 'string') {
    return { ok: false, error: 'No source path provided.' };
  }

  const fromRoot = path.resolve(from);
  const toRoot   = getWritableRootDir();

  if (fromRoot === toRoot) {
    return { ok: true, copied: 0, errors: [], skipped: true };
  }

  const subDirs = ['user', 'data'];
  let totalCopied = 0;
  const allErrors = [];

  for (const sub of subDirs) {
    const srcDir  = path.join(fromRoot, sub);
    const destDir = path.join(toRoot,   sub);
    const result  = await copyTreeForBackup(srcDir, destDir);
    totalCopied += result.copied;
    allErrors.push(...result.errors);
  }

  return { ok: true, copied: totalCopied, errors: allErrors };
});

ipcMain.handle('app:get-seed-conflicts', async () => {
  if (!app.isPackaged) {
    return { ok: true, conflicts: [] };
  }

  const saveTargets = getSaveTargets();
  const [dataConflicts, userConflicts] = await Promise.all([
    collectConflicts(getBundledDataRoot(), saveTargets.data, 'data'),
    collectConflicts(path.join(ROOT_DIR, 'user'), saveTargets.user, 'user')
  ]);

  const conflicts = [...dataConflicts, ...userConflicts].map((c) => ({
    relativePath: c.relativePath,
    srcSize: c.srcSize,
    srcMtimeMs: c.srcMtimeMs,
    destSize: c.destSize,
    destMtimeMs: c.destMtimeMs
  }));

  return { ok: true, conflicts };
});

// decisions: Array<{ relativePath: string, action: 'keep' | 'replace' | 'rename' }>
// 'keep'    – do nothing
// 'replace' – overwrite destination with bundled source
// 'rename'  – rename destination to <name>_bak<ext>, then copy bundled source
ipcMain.handle('app:apply-merge-choices', async (_event, { decisions = [] } = {}) => {
  if (!app.isPackaged) {
    return { ok: true, applied: 0 };
  }

  const saveTargets = getSaveTargets();
  const bundledRoots = {
    data: { src: getBundledDataRoot(), dest: saveTargets.data },
    user: { src: path.join(ROOT_DIR, 'user'), dest: saveTargets.user }
  };

  let applied = 0;
  const errors = [];

  for (const decision of decisions) {
    if (decision.action === 'keep') continue;

    const relPath = String(decision.relativePath || '').replace(/\\/g, '/');
    // relPath is like "data/foo.js" or "user/config.js"
    const parts = relPath.split('/');
    const rootKey = parts[0];
    const rest = parts.slice(1).join('/');

    const roots = bundledRoots[rootKey];
    if (!roots || !rest) {
      errors.push({ relativePath: relPath, error: 'Unknown root or empty path.' });
      continue;
    }

    const srcPath = path.resolve(roots.src, rest);
    const destPath = path.resolve(roots.dest, rest);

    // Security: ensure resolved paths stay within allowed roots.
    if (!srcPath.startsWith(path.resolve(roots.src) + path.sep) &&
        srcPath !== path.resolve(roots.src)) {
      errors.push({ relativePath: relPath, error: 'Path traversal detected in source.' });
      continue;
    }
    if (!destPath.startsWith(path.resolve(roots.dest) + path.sep) &&
        destPath !== path.resolve(roots.dest)) {
      errors.push({ relativePath: relPath, error: 'Path traversal detected in destination.' });
      continue;
    }

    try {
      if (decision.action === 'rename') {
        // Rename existing destination file to <basename>_bak<ext>
        const ext = path.extname(destPath);
        const base = path.basename(destPath, ext);
        const dir = path.dirname(destPath);
        const bakPath = path.join(dir, `${base}_bak${ext}`);
        try {
          await fs.rename(destPath, bakPath);
        } catch (renameErr) {
          errors.push({ relativePath: relPath, error: `Rename failed: ${renameErr?.message || renameErr}` });
          continue;
        }
      }

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
      applied++;
    } catch (err) {
      errors.push({ relativePath: relPath, error: String(err?.message || err) });
    }
  }

  return { ok: true, applied, errors };
});

ipcMain.handle('app:open-tool', async (event, request = {}) => {
  const pageFile = typeof request === 'string' ? request : (request.pageFile || '');
  const knownPages = new Set(Object.values(PAGE_FILES));
  if (!pageFile || !knownPages.has(pageFile)) {
    return { ok: false, error: `Unknown page: ${pageFile}` };
  }
  const query = request && typeof request.query === 'object' ? request.query : null;
  const toolWin = createToolWindow(pageFile, query ? { query } : {});

  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const senderBounds = senderWin && !senderWin.isDestroyed() ? senderWin.getBounds() : null;
  const wantsSecondary = !!(
    request.openOnSecondScreen
    || (
      pageFile === PAGE_FILES.learningTools
      && query
      && (String(query.wwPresentation || '') === '1' || String(query.ltPresentation || '') === '1')
    )
  );

  if (wantsSecondary) {
    const targetDisplay = getExtendedDisplayForBounds(senderBounds);
    if (targetDisplay) {
      const sourceDisplay = senderBounds
        ? (screen.getDisplayMatching(senderBounds) || screen.getPrimaryDisplay())
        : screen.getPrimaryDisplay();
      const mappedBounds = mapWindowBoundsToDisplay(senderBounds, sourceDisplay, targetDisplay);
      if (mappedBounds) {
        toolWin.setBounds(mappedBounds);
      }
    }
  }

  if (!request.sideBySide && !request.maximize && !wantsSecondary && !toolWin.isDestroyed()) {
    const winSizeRatio = Number(request.windowSizeRatio) || 0;
    const winPosition  = typeof request.windowPosition === 'string' ? request.windowPosition : '';
    const hasSize = winSizeRatio >= 0.1 && winSizeRatio <= 1.0;
    const hasPos  = !!(winPosition && winPosition !== 'default');

    if (hasSize || hasPos) {
      const display = screen.getDisplayMatching(toolWin.getBounds());
      const wa = display.workArea;

      // Measure invisible resize border (DWM shadow on Windows) so tiled
      // windows meet flush without overlap, matching _arrangeSideBySide.
      const ob = toolWin.getBounds();
      const cb = toolWin.getContentBounds();
      const insetL = Math.max(0, cb.x - ob.x);
      const insetR = Math.max(0, (ob.x + ob.width)  - (cb.x + cb.width));
      const insetB = Math.max(0, (ob.y + ob.height) - (cb.y + cb.height));

      // Work in visual (inset-excluded) dimensions
      let vW = hasSize ? Math.max(400, Math.round(wa.width  * winSizeRatio)) : ob.width  - insetL - insetR;
      let vH = hasSize ? Math.max(300, Math.round(wa.height * winSizeRatio)) : ob.height - insetB;
      if (winPosition === 'left' || winPosition === 'right') vH = wa.height;

      if (hasPos) {
        let vX = wa.x, vY = wa.y;
        switch (winPosition) {
          case 'center':       vX = wa.x + Math.round((wa.width  - vW) / 2); vY = wa.y + Math.round((wa.height - vH) / 2); break;
          case 'top-left':     vX = wa.x;                vY = wa.y; break;
          case 'top-right':    vX = wa.x + wa.width - vW; vY = wa.y; break;
          case 'bottom-left':  vX = wa.x;                vY = wa.y + wa.height - vH; break;
          case 'bottom-right': vX = wa.x + wa.width - vW; vY = wa.y + wa.height - vH; break;
          case 'left':         vX = wa.x;                vY = wa.y; break;
          case 'right':        vX = wa.x + wa.width - vW; vY = wa.y; break;
        }
        toolWin.setBounds({ x: vX - insetL, y: vY, width: vW + insetL + insetR, height: vH + insetB });
      } else {
        toolWin.setSize(vW + insetL + insetR, vH + insetB);
      }
    }
  }

  if (request.sideBySide) {
    if (senderWin && !senderWin.isDestroyed()) {
      const mainFrac = Number(request.mainFraction) || 0.20;
      const cmOnRight = request.cmOnRight !== false;
      _arrangeSideBySide(senderWin, toolWin, mainFrac, cmOnRight);
    }
  }
  if (request.maximize && !toolWin.isDestroyed()) {
    toolWin.maximize();
  }
  return { ok: true, windowId: toolWin.id };
});

ipcMain.handle('app:open-split', async (event, request = {}) => {
  const knownPages = new Set(Object.values(PAGE_FILES));
  const pageFile1 = String(request.pageFile1 || '');
  const pageFile2 = String(request.pageFile2 || '');
  if (!pageFile1 || !knownPages.has(pageFile1)) return { ok: false, error: `Unknown page: ${pageFile1}` };
  if (!pageFile2 || !knownPages.has(pageFile2)) return { ok: false, error: `Unknown page: ${pageFile2}` };
  const fraction = Math.min(Math.max(Number(request.fraction) || 0.5, 0.1), 0.9);
  const win1 = createToolWindow(pageFile1);
  const win2 = createToolWindow(pageFile2);
  await new Promise(resolve => setImmediate(resolve));
  const { workArea } = screen.getPrimaryDisplay();
  const { x, y, width, height } = workArea;
  const w1 = Math.round(width * fraction);
  if (!win1.isDestroyed()) win1.setBounds({ x, y, width: w1, height });
  if (!win2.isDestroyed()) win2.setBounds({ x: x + w1, y, width: width - w1, height });
  if (!win2.isDestroyed()) win2.focus();
  return { ok: true };
});

ipcMain.handle('app:arrange-side-by-side', async (event, request = {}) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin || senderWin.isDestroyed()) return { ok: false, error: 'no-sender' };
  const allWins = BrowserWindow.getAllWindows();
  const toolWin = request.windowId
    ? allWins.find(w => w.id === request.windowId && !w.isDestroyed())
    : [...allWins].reverse().find(w => w !== senderWin && !w.isDestroyed());
  if (!toolWin) return { ok: false, error: 'no-tool-window' };
  _arrangeSideBySide(senderWin, toolWin, Number(request.mainFraction) || 0.20, request.cmOnRight !== false);
  return { ok: true };
});

ipcMain.handle('app:save-file', async (event, request) => {
  const pageFile = getRequestingPage(event);
  const savedFile = await writeAllowedFile(pageFile, request.target, request);
  return { ok: true, file: savedFile };
});

ipcMain.handle('app:save-files', async (event, request) => {
  const pageFile = getRequestingPage(event);
  const files = Array.isArray(request.files) ? request.files : [];
  const savedFiles = [];

  for (const file of files) {
    savedFiles.push(await writeAllowedFile(pageFile, request.target, file));
  }

  return { ok: true, files: savedFiles };
});

ipcMain.handle('app:list-files', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const files = await listAllowedFiles(pageFile, request.target, request);
  return { ok: true, files };
});

ipcMain.handle('app:read-file', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const file = await readAllowedFile(pageFile, request.target, request.filename);
  if (!file?.ok) {
    return {
      ok: false,
      file,
      error: file?.error || 'Unable to read file.'
    };
  }
  return { ok: true, file, content: file.content };
});

ipcMain.handle('app:resolve-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const resolved = resolveAllowedTargetPath(pageFile, request.target, request.relativePath);
  return {
    ok: true,
    target: request.target,
    relativePath: resolved.safeRelative,
    path: resolved.fullPath
  };
});

ipcMain.handle('app:read-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const file = await readAllowedPathFile(
    pageFile,
    request.target,
    request.relativePath,
    request.encoding
  );
  return { ok: true, file, content: file.content, encoding: file.encoding };
});

ipcMain.handle('app:open-timer-window', async (event, request = {}) => {
  if (timerDetachedWindow && !timerDetachedWindow.isDestroyed()) {
    timerDetachedWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const html = String(request.html || '');
  const width  = Number(request.width)  || 280;
  const height = Number(request.height) || 380;
  timerDetachedWindow = new BrowserWindow({
    width,
    height,
    resizable: true,
    alwaysOnTop: true,
    frame: false,
    title: '⏱ Timer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  timerDetachedWindow.on('closed', () => { timerDetachedWindow = null; });
  timerDetachedWindow.webContents.on('system-context-menu', (event) => { event.preventDefault(); });
  const tmpFile = path.join(os.tmpdir(), `cmt-timer-${Date.now()}.html`);
  try {
    await fs.writeFile(tmpFile, html, 'utf8');
    await timerDetachedWindow.loadFile(tmpFile);
  } catch (err) {
    console.error('app:open-timer-window load failed', err);
    return { ok: false, error: String(err) };
  } finally {
    fs.unlink(tmpFile).catch(() => {});
  }
  return { ok: true };
});

ipcMain.handle('app:is-timer-window-open', () => {
  return { open: !!(timerDetachedWindow && !timerDetachedWindow.isDestroyed()) };
});

ipcMain.handle('app:timer-command', async (event, request = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'no-main-window' };
  const ALLOWED = {
    start: `(function(){
      var h=arguments[0],m=arguments[1];
      document.getElementById('popup-timer-hours').value=h;
      document.getElementById('popup-timer-minutes').value=m;
      popupStartTimer();
    })(${Number(request.h)||0},${Number(request.m)||5})`,
    stop:    `overlayStopTimer()`,
    pause:   `overlayPlayPauseTimer()`,
    add30:   `timerAdd30s()`,
    sub30:   `timerSubtract30s()`
  };
  const cmd = String(request.cmd || '');
  if (!ALLOWED[cmd]) return { ok: false, error: 'unknown-command' };
  try {
    await mainWindow.webContents.executeJavaScript(ALLOWED[cmd]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('app:timer-state', async (event) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  try {
    const state = await mainWindow.webContents.executeJavaScript(`
      (function(){
        var d=document.getElementById('timer-active-display');
        var bar=document.getElementById('timer-overlay-progress-bar');
        var ph=document.getElementById('popup-timer-hours');
        var pm=document.getElementById('popup-timer-minutes');
        var pb=document.getElementById('overlay-playpause-btn');
        return {
          text: d ? d.textContent : '--:--',
          cls:  d ? d.className  : '',
          running: !!(timerInterval || stopwatchInterval),
          paused:  !!(pb && pb.classList.contains('paused')),
          canAdj:  !!(timerInterval  || timerPaused),
          mode: timerMode || 'timer',
          barWidth: bar ? bar.style.width : '100%',
          h: ph ? ph.value : 0,
          m: pm ? pm.value : 5
        };
      })()`
    );
    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('app:open-html', async (event, request = {}) => {
  const html = String(request.html || '');
  const width = Number(request.width) || 1000;
  const height = Number(request.height) || 700;

  const win = new BrowserWindow({
    width,
    height,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Load via temp file to avoid data: URL blocking in Electron 28+
  const tmpFile = path.join(os.tmpdir(), `cmt-open-${Date.now()}.html`);
  try {
    await fs.writeFile(tmpFile, html, 'utf8');
    await win.loadFile(tmpFile);
  } catch (err) {
    console.error('app:open-html load failed', err);
  } finally {
    fs.unlink(tmpFile).catch(() => {});
  }

  return { ok: true };
});

let mirrorWindow = null;

function getExtendedDisplayForBounds(bounds) {
  const allDisplays = screen.getAllDisplays();
  if (!Array.isArray(allDisplays) || allDisplays.length < 2) return null;

  const sourceDisplay = bounds
    ? screen.getDisplayMatching(bounds)
    : screen.getPrimaryDisplay();

  return allDisplays.find((d) => d.id !== sourceDisplay.id) || null;
}

function mapWindowBoundsToDisplay(sourceBounds, sourceDisplay, targetDisplay) {
  if (!targetDisplay || !targetDisplay.bounds) return null;

  const sb = sourceBounds || null;
  const sd = (sourceDisplay && sourceDisplay.bounds) || null;
  const td = targetDisplay.bounds;

  const minW = 420;
  const minH = 300;

  let width;
  let height;
  let x;
  let y;

  if (sb && sd && sd.width > 0 && sd.height > 0) {
    const relX = (sb.x - sd.x) / sd.width;
    const relY = (sb.y - sd.y) / sd.height;
    width = sb.width;
    height = sb.height;
    x = td.x + Math.round(relX * td.width);
    y = td.y + Math.round(relY * td.height);
  } else {
    width = 1200;
    height = 800;
    x = td.x + Math.round((td.width - width) / 2);
    y = td.y + Math.round((td.height - height) / 2);
  }

  width = Math.max(minW, Math.min(Math.round(width), td.width));
  height = Math.max(minH, Math.min(Math.round(height), td.height));

  const maxX = td.x + td.width - width;
  const maxY = td.y + td.height - height;
  x = Math.max(td.x, Math.min(Math.round(x), maxX));
  y = Math.max(td.y, Math.min(Math.round(y), maxY));

  return { x, y, width, height };
}

ipcMain.handle('app:open-mirror-window', async (event, request = {}) => {
  if (mirrorWindow && !mirrorWindow.isDestroyed()) {
    mirrorWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const sBounds   = senderWin ? senderWin.getBounds() : null;

  // Detect second screen
  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const secondDisplay = allDisplays.find(d => d.id !== primaryDisplay.id);

  let winOpts;
  if (secondDisplay) {
    // Mirror the same relative position and size ratio from the main window's display onto the second display
    const srcDisplay = sBounds
      ? (screen.getDisplayMatching(sBounds) || primaryDisplay)
      : primaryDisplay;
    const sd = srcDisplay.bounds;
    const dd = secondDisplay.bounds;

    let newWidth, newHeight, newX, newY;
    if (sBounds && sd.width > 0 && sd.height > 0) {
      const relX = (sBounds.x - sd.x) / sd.width;
      const relY = (sBounds.y - sd.y) / sd.height;
      const ratioW = sBounds.width  / sd.width;
      const ratioH = sBounds.height / sd.height;
      newWidth  = Math.round(ratioW * dd.width);
      newHeight = Math.round(ratioH * dd.height);
      newX      = dd.x + Math.round(relX * dd.width);
      newY      = dd.y + Math.round(relY * dd.height);
    } else {
      // Fallback: centre with same absolute size as main window
      newWidth  = sBounds ? sBounds.width  : 1200;
      newHeight = sBounds ? sBounds.height : 800;
      newX      = dd.x + Math.round((dd.width  - newWidth)  / 2);
      newY      = dd.y + Math.round((dd.height - newHeight) / 2);
    }

    winOpts = {
      x: newX, y: newY, width: newWidth, height: newHeight,
      autoHideMenuBar: true,
      title: 'Board – Presentation Mode',
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };
  } else {
    const width  = sBounds ? sBounds.width  : (Number(request.width)  || 1200);
    const height = sBounds ? sBounds.height : (Number(request.height) || 800);
    winOpts = {
      width, height,
      autoHideMenuBar: true,
      title: 'Board – Presentation Mode',
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };
    // Place beside the main window when no second screen is available
    if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
  }

  mirrorWindow = new BrowserWindow(winOpts);
  mirrorWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mirrorWindow.on('closed', () => { mirrorWindow = null; });
  // When no second screen: keep presentation window the same size as the main window
  if (!secondDisplay && senderWin) {
    const _syncSize = () => {
      if (!mirrorWindow || mirrorWindow.isDestroyed()) return;
      const b = senderWin.getBounds();
      mirrorWindow.setSize(b.width, b.height);
    };
    senderWin.on('resize', _syncSize);
    mirrorWindow.once('closed', () => senderWin.off('resize', _syncSize));
  }
  try {
    await mirrorWindow.loadFile(path.join(ROOT_DIR, PAGE_FILES.board), { query: { mirror: '1' } });
  } catch (err) {
    console.error('app:open-mirror-window load failed', err);
    return { ok: false, error: String(err) };
  }
  return { ok: true };
});

ipcMain.handle('app:mirror-window-command', (event, command) => {
  if (!mirrorWindow || mirrorWindow.isDestroyed()) return { ok: false, reason: 'not-open' };
  switch (command) {
    case 'close':
      mirrorWindow.close();
      break;
    default:
      return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

// ── CMS Presentation Window ───────────────────────────────────────────────────
let cmsPresentationWindow = null;
ipcMain.handle('app:open-cms-presentation', async (event, request = {}) => {
  if (cmsPresentationWindow && !cmsPresentationWindow.isDestroyed()) {
    cmsPresentationWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const sBounds   = senderWin ? senderWin.getBounds() : null;

  const secondDisplay = getExtendedDisplayForBounds(sBounds);

  let winOpts;
  if (secondDisplay) {
    const sourceDisplay = sBounds
      ? (screen.getDisplayMatching(sBounds) || screen.getPrimaryDisplay())
      : screen.getPrimaryDisplay();
    const mappedBounds = mapWindowBoundsToDisplay(sBounds, sourceDisplay, secondDisplay)
      || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };
    winOpts = {
      x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
      autoHideMenuBar: true,
      title: 'Class Management – Presentation',
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };
  } else {
    const width  = sBounds ? sBounds.width  : 1200;
    const height = sBounds ? sBounds.height : 800;
    winOpts = {
      width, height,
      autoHideMenuBar: true,
      title: 'Class Management – Presentation',
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };
    // Place beside the main window when no second screen is available
    if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
  }

  cmsPresentationWindow = new BrowserWindow(winOpts);
  cmsPresentationWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  cmsPresentationWindow.on('closed', () => { cmsPresentationWindow = null; });

  try {
    await cmsPresentationWindow.loadFile(
      path.join(ROOT_DIR, PAGE_FILES.classManagement),
      { query: { presentation: '1' } }
    );
  } catch (err) {
    console.error('app:open-cms-presentation load failed', err);
    return { ok: false, error: String(err) };
  }
  return { ok: true };
});

ipcMain.handle('app:cms-presentation-open', () => {
  return !!(cmsPresentationWindow && !cmsPresentationWindow.isDestroyed());
});

ipcMain.handle('app:cms-presentation-command', (event, command) => {
  if (!cmsPresentationWindow || cmsPresentationWindow.isDestroyed()) return { ok: false, reason: 'not-open' };
  switch (command) {
    case 'close':      cmsPresentationWindow.close(); break;
    case 'fullscreen': cmsPresentationWindow.setFullScreen(!cmsPresentationWindow.isFullScreen()); break;
    case 'maximize': {
      if (cmsPresentationWindow.isMaximized()) {
        cmsPresentationWindow.unmaximize();
        break;
      }
      const targetDisplay = getExtendedDisplayForBounds(cmsPresentationWindow.getBounds());
      if (targetDisplay) {
        const wa = targetDisplay.workArea;
        cmsPresentationWindow.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
      }
      cmsPresentationWindow.maximize();
      break;
    }
    case 'minimize':   cmsPresentationWindow.minimize(); break;
    case 'dock-right': {
      if (cmsPresentationWindow.isFullScreen()) cmsPresentationWindow.setFullScreen(false);
      if (cmsPresentationWindow.isMaximized()) cmsPresentationWindow.unmaximize();
      const disp = screen.getDisplayMatching(cmsPresentationWindow.getBounds());
      const { x, y, width, height } = disp.workArea;
      const w = Math.round(width * 0.2);
      cmsPresentationWindow.setBounds({ x: x + width - w, y, width: w, height });
      break;
    }
    default: return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

ipcMain.handle('app:print-html', async (event, request = {}) => {
  const html = String(request.html || '');
  const win = new BrowserWindow({
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  let result = { ok: false };
  const tmpFile = path.join(os.tmpdir(), `cmt-print-${Date.now()}.html`);
  try {
    await fs.writeFile(tmpFile, html, 'utf8');
    await win.loadFile(tmpFile);
    result = await new Promise((resolve) => {
      win.webContents.once('did-finish-load', () => {
        win.webContents.print({ printBackground: true }, (success, failureReason) => {
          resolve({ ok: !!success, success: !!success, failureReason: failureReason || null });
        });
      });
    });
  } catch (err) {
    console.error('Print failed', err);
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  } finally {
    fs.unlink(tmpFile).catch(() => {});
    try { win.close(); } catch {}
  }

  return result;
});

ipcMain.handle('app:print-pdf', async (event, request = {}) => {
  const html = String(request.html || '');
  const tmpFile = path.join(os.tmpdir(), `cmt-pdf-${Date.now()}.html`);
  try {
    const win = new BrowserWindow({ show: false, webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }});

    await fs.writeFile(tmpFile, html, 'utf8');
    await win.loadFile(tmpFile);

    // Wait for layout/images/fonts so printToPDF captures fully rendered pages.
    await win.webContents.executeJavaScript(`
      (async () => {
        const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const imgList = Array.from(document.images || []);
        const pending = imgList
          .filter(img => !(img && img.complete))
          .map(img => new Promise(resolve => {
            const done = () => resolve(true);
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }));

        const fontsReady = (document.fonts && document.fonts.ready)
          ? document.fonts.ready.catch(() => {})
          : Promise.resolve();

        await Promise.race([
          Promise.all(pending.concat([fontsReady])),
          waitMs(5000)
        ]);
        await waitMs(120);
        return true;
      })();
    `, true);

    const pdfOptions = { printBackground: true, landscape: false, marginsType: 0 };
    const pdfBuffer = await win.webContents.printToPDF(pdfOptions);

    // Ask user where to save
    const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,'-');
    const defaultName = (typeof request.defaultName === 'string' && request.defaultName.trim())
      ? request.defaultName.trim()
      : `results-${dateStr}.pdf`;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save PDF',
      defaultPath: path.join(app.getPath('downloads'), defaultName),
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      try { win.close(); } catch {}
      return { ok: false, canceled: true };
    }

    await fs.writeFile(filePath, pdfBuffer);
    try { win.close(); } catch {}
    return { ok: true, path: filePath };
  } catch (err) {
    console.error('print-pdf failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  } finally {
    fs.unlink(tmpFile).catch(() => {});
  }
});

ipcMain.handle('app:list-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const files = await listAllowedPathFiles(
    pageFile,
    request.target,
    request.relativePath,
    request
  );
  return { ok: true, files };
});

ipcMain.handle('app:rename-file', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const targetDir = resolveAllowedTargetDir(pageFile, request.target);
  const oldName = sanitizeFilename(request.oldFilename);
  const newName = sanitizeFilename(request.newFilename);
  const oldPath = path.join(targetDir, oldName);
  const newPath = path.join(targetDir, newName);
  try {
    await fs.access(newPath);
    throw new Error('A file with that name already exists.');
  } catch (err) {
    if (err.message === 'A file with that name already exists.') throw err;
  }
  await fs.rename(oldPath, newPath);
  return { ok: true, filename: newName };
});

ipcMain.handle('app:rename-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const renamed = await renameAllowedPathEntry(
    pageFile,
    request.target,
    request.oldRelativePath,
    request.newRelativePath
  );
  return { ok: true, renamed };
});

ipcMain.handle('app:delete-file', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const targetDir = resolveAllowedTargetDir(pageFile, request.target);
  const filename = sanitizeFilename(request.filename);
  const filePath = path.join(targetDir, filename);
  await fs.unlink(filePath);

  // Constellation saves can include a companion folder (same basename) with media.
  // When requested, remove that folder too.
  let companionFolderDeleted = false;
  if (request.deleteCompanionFolder && request.target === 'mindmaps') {
    const companionRelativePath = path.parse(filename).name;
    if (companionRelativePath) {
      try {
        await deleteAllowedPathEntry(pageFile, request.target, companionRelativePath, { recursive: true, force: true });
        companionFolderDeleted = true;
      } catch {}
    }
  }

  return { ok: true, companionFolderDeleted };
});

ipcMain.handle('app:delete-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const deleted = await deleteAllowedPathEntry(
    pageFile,
    request.target,
    request.relativePath,
    {
      recursive: request.recursive,
      force: request.force
    }
  );
  return { ok: true, deleted };
});

ipcMain.handle('app:export-files', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const files = Array.isArray(request.files) ? request.files : [];

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Export files – choose destination folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Export here'
  });

  if (canceled || !filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  const destDir = path.resolve(String(filePaths[0]));
  // Strip trailing separator so drive-root paths (e.g. 'E:\') don't produce a double-separator prefix
  const destBase = destDir.endsWith(path.sep) ? destDir.slice(0, -1) : destDir;
  const exported = [];
  const errors = [];
  const destRoot = destBase + path.sep;

  for (const item of files) {
    try {
      const exportRelative = item.relativeExportPath
        ? sanitizeRelativePath(String(item.relativeExportPath || ''))
        : sanitizeFilename(String(item.filename || path.basename(String(item.relativePath || '')) || ''));
      const destPath = path.resolve(destDir, exportRelative);
      if (destPath !== destBase && !destPath.startsWith(destRoot)) {
        throw new Error('Export path is outside the selected folder.');
      }

      await fs.mkdir(path.dirname(destPath), { recursive: true });

      if (Object.prototype.hasOwnProperty.call(item, 'content')) {
        const encoding = item.encoding === 'base64' ? 'base64' : 'utf8';
        const data = encoding === 'base64'
          ? Buffer.from(String(item.content || ''), 'base64')
          : String(item.content || '');
        await fs.writeFile(destPath, data, encoding === 'base64' ? undefined : 'utf8');
        if (item.mtimeMs) {
          const t = new Date(Number(item.mtimeMs));
          await fs.utimes(destPath, t, t).catch(() => {});
        }
        exported.push(exportRelative);
        continue;
      }

      const target = String(item.target || '');
      const relativePath = String(item.relativePath || '').trim();
      const filename = sanitizeFilename(String(item.filename || path.basename(relativePath) || ''));
      const srcPath = relativePath
        ? resolveAllowedTargetPath(pageFile, target, relativePath).fullPath
        : path.join(resolveAllowedTargetDir(pageFile, target), filename);
      await fs.copyFile(srcPath, destPath);
      exported.push(exportRelative);
    } catch (err) {
      errors.push({ filename: String(item.filename || ''), error: String(err?.message || err) });
    }
  }

  return { ok: true, canceled: false, folderPath: destDir, exported, errors };
});

ipcMain.handle('app:get-backup-location', async () => {
  const backupLocation = await loadSavedBackupLocation();
  return { ok: true, backupLocation };
});

ipcMain.handle('app:pick-backup-location', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose a folder for backups',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use this folder'
  });

  if (canceled || !filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  const selected = path.resolve(String(filePaths[0]));

  try {
    fsSync.accessSync(selected, fsSync.constants.W_OK);
  } catch {
    return { ok: false, canceled: false, error: 'Selected folder is not writable.' };
  }

  await saveBackupLocation(selected);
  return { ok: true, canceled: false, backupLocation: selected };
});

ipcMain.handle('app:run-backup', async () => {
  const backupLocation = await loadSavedBackupLocation();
  if (!backupLocation) {
    return { ok: false, error: 'No backup location configured.' };
  }

  try {
    fsSync.accessSync(backupLocation, fsSync.constants.W_OK);
  } catch {
    return { ok: false, error: 'Backup folder is not accessible or not writable.' };
  }

  const writableRoot = getWritableRootDir();
  const sources = [
    { dir: path.join(writableRoot, 'user'), prefix: 'user' }
  ];

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const destRoot = path.join(backupLocation, timestamp);

  let totalCopied = 0;
  const allErrors = [];

  for (const { dir, prefix } of sources) {
    const destDir = path.join(destRoot, prefix);
    const result = await copyTreeForBackup(dir, destDir);
    totalCopied += result.copied;
    allErrors.push(...result.errors);
  }

  return { ok: true, copied: totalCopied, errors: allErrors, backupLocation: destRoot };
});

ipcMain.handle('app:get-sync-location', async () => {
  const syncLocation = await loadSavedSyncLocation();
  return { ok: true, syncLocation };
});

ipcMain.handle('app:pick-sync-location', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose a folder to sync with',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use this folder'
  });

  if (canceled || !filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  const selected = path.resolve(String(filePaths[0]));

  try {
    fsSync.accessSync(selected, fsSync.constants.R_OK);
  } catch {
    return { ok: false, canceled: false, error: 'Selected folder is not accessible.' };
  }

  await saveSyncLocation(selected);
  return { ok: true, canceled: false, syncLocation: selected };
});

ipcMain.handle('app:run-sync', async (_event, { mode } = {}) => {
  const syncLocation = await loadSavedSyncLocation();
  if (!syncLocation) {
    return { ok: false, error: 'No sync location configured.' };
  }

  const validModes = ['to-target', 'to-source', 'both'];
  const syncMode = validModes.includes(mode) ? mode : 'to-target';

  try {
    fsSync.accessSync(syncLocation, fsSync.constants.R_OK);
  } catch {
    return { ok: false, error: 'Sync folder is not accessible.' };
  }

  if (syncMode === 'to-target' || syncMode === 'both') {
    try {
      fsSync.accessSync(syncLocation, fsSync.constants.W_OK);
    } catch {
      return { ok: false, error: 'Sync folder is not writable.' };
    }
  }

  const writableRoot = getWritableRootDir();
  const subDirs = ['user', 'data'];
  let totalCopied = 0;
  const allErrors = [];
  const allConflicts = [];
  const allAdded = [];
  const allNewFiles = [];

  const baselineMap = await loadSyncBaseline();
  const pendingEntries = [];

  for (const sub of subDirs) {
    const srcDir  = path.join(writableRoot, sub);
    const destDir = path.join(syncLocation, sub);
    const result  = await syncTrees(srcDir, destDir, syncMode, {
      autoNew: false,
      baseline: { map: baselineMap, prefix: sub }
    });
    totalCopied  += result.copied;
    allErrors.push(...result.errors);
    for (const c of result.conflicts) {
      allConflicts.push({ ...c, relativePath: sub + '/' + c.relativePath });
    }
    for (const f of result.newFiles) {
      allNewFiles.push({ ...f, relativePath: sub + '/' + f.relativePath });
    }
    for (const f of result.added) {
      allAdded.push(sub + '/' + f);
    }
    for (const s of result.synced) {
      pendingEntries.push({ relativePath: sub + '/' + s.relativePath, mtimeMs: s.mtimeMs, size: s.size });
    }
  }

  // Save pending entries for baseline update after conflict resolution.
  // If there are no conflicts the baseline is committed immediately.
  _pendingBaselineEntries = pendingEntries;

  if (allConflicts.length === 0 && allNewFiles.length === 0) {
    // All done — commit baseline now
    for (const e of _pendingBaselineEntries) {
      baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
    }
    await saveSyncBaseline(baselineMap);
    _pendingBaselineEntries = [];
  }

  return { ok: true, copied: totalCopied, errors: allErrors, conflicts: allConflicts, newFiles: allNewFiles, added: allAdded, syncLocation };
});

ipcMain.handle('app:apply-sync-choices', async (_event, { decisions = [] } = {}) => {
  const syncLocation = await loadSavedSyncLocation();
  if (!syncLocation) {
    return { ok: false, error: 'No sync location configured.' };
  }

  const writableRoot = getWritableRootDir();

  async function copyOne(fromPath, toPath) {
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.copyFile(fromPath, toPath);
    const stat = await fs.stat(fromPath);
    await fs.utimes(toPath, stat.atime, stat.mtime).catch(() => {});
  }

  let applied = 0;
  const errors = [];

  for (const decision of decisions) {
    if (decision.action === 'skip') continue;

    const relPath = String(decision.relativePath || '').replace(/\\/g, '/');
    // Validate: must not contain traversal segments
    if (relPath.split('/').some(seg => seg === '..' || seg === '.')) {
      errors.push({ relativePath: relPath, error: 'Invalid path.' });
      continue;
    }

    const srcPath  = path.join(writableRoot, relPath);
    const destPath = path.join(syncLocation, relPath);

    // Confirm resolved paths stay within their roots
    if (!srcPath.startsWith(writableRoot + path.sep) && srcPath !== writableRoot) {
      errors.push({ relativePath: relPath, error: 'Path is outside data root.' });
      continue;
    }
    if (!destPath.startsWith(syncLocation + path.sep) && destPath !== syncLocation) {
      errors.push({ relativePath: relPath, error: 'Path is outside sync root.' });
      continue;
    }

    try {
      if (decision.action === 'keep-source') {
        await copyOne(srcPath, destPath);
        applied++;
        // Record the agreed state for the baseline (read back the actual stored mtime)
        try {
          const stat = await fs.stat(destPath);
          _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch {}
      } else if (decision.action === 'keep-target') {
        await copyOne(destPath, srcPath);
        applied++;
        try {
          const stat = await fs.stat(srcPath);
          _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch {}
      } else if (decision.action === 'delete-source') {
        await fs.unlink(srcPath);
        applied++;
      } else if (decision.action === 'delete-target') {
        await fs.unlink(destPath);
        applied++;
      }
    } catch (err) {
      errors.push({ relativePath: relPath, error: String(err?.message || err) });
    }
  }

  // Commit the baseline — merge pending entries (auto-resolved during run-sync)
  // with the newly resolved ones from this call.
  try {
    const baselineMap = await loadSyncBaseline();
    for (const e of _pendingBaselineEntries) {
      baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
    }
    await saveSyncBaseline(baselineMap);
  } catch (err) {
    console.error('Failed to update sync baseline after apply:', err);
  } finally {
    _pendingBaselineEntries = [];
  }

  return { ok: true, applied, errors };
});

ipcMain.handle('app:get-auto-sync', async () => {
  const [autoSync, syncLocation] = await Promise.all([
    loadAutoSyncEnabled(),
    loadSavedSyncLocation()
  ]);
  return { ok: true, autoSync, syncLocation };
});

ipcMain.handle('app:set-auto-sync', async (_event, { enabled } = {}) => {
  const autoSync = enabled === true;
  await saveAutoSyncEnabled(autoSync);
  if (autoSync) {
    startAutoSyncWatcher();
  } else {
    stopAutoSyncWatcher();
  }
  return { ok: true, autoSync };
});

// ─────────────────────────────────────────────────────────────────────────────
// REMOTE CONTROL SERVER
// ─────────────────────────────────────────────────────────────────────────────

let _remoteServer    = null;
let _remoteWss       = null;
let _remotePort      = 7823;
let _remoteToken     = null;
let _remoteClients   = new Set(); // Set<ws.WebSocket>
let _remoteLastState = null;      // last broadcast state JSON (for new joiners)

function _remoteGenToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

function _remoteGetLocalIp() {
  const ifaces = os.networkInterfaces();
  // Words in adapter names that indicate virtual/tunnel/VPN adapters to skip
  const skipWords = ['wsl', 'hyper-v', 'vmware', 'virtualbox', 'docker',
                     'vethernet', 'virtual', 'pseudo', 'tap-windows',
                     'npcap', 'teredo', 'isatap', 'vpn', 'tunnel'];
  const candidates = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const iface of addrs) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const lname = name.toLowerCase();
      if (skipWords.some(w => lname.includes(w))) continue;
      // Score: prefer Wi-Fi, then Ethernet, then anything else
      const score =
        (lname.includes('wi-fi') || lname.includes('wifi') ||
         lname.includes('wireless') || lname.includes('wlan')) ? 3 :
        (lname.includes('ethernet') || lname.includes('local area')) ? 2 : 1;
      candidates.push({ ip: iface.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length > 0 ? candidates[0].ip : '127.0.0.1';
}

function _remoteBroadcast(data) {
  const msg = JSON.stringify(data);
  _remoteLastState = msg;
  for (const ws of _remoteClients) {
    if (ws._remoteAuth && ws.readyState === 1 /* OPEN */) {
      try { ws.send(msg); } catch (_) {}
    }
  }
}

function _remoteNotifyStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const count = [..._remoteClients].filter(ws => ws._remoteAuth).length;
  mainWindow.webContents.executeJavaScript(
    `window._cmsRemoteStatusUpdate && window._cmsRemoteStatusUpdate(${count})`
  ).catch(() => {});
}

function _remoteHandleMsg(ws, msg) {
  if (!msg || typeof msg.type !== 'string') return;

  if (msg.type === 'auth') {
    if (String(msg.token || '').toUpperCase() === _remoteToken) {
      ws._remoteAuth = true;
      ws.send(JSON.stringify({ type: 'auth_ok' }));
      _remoteNotifyStatus();
      if (_remoteLastState) { try { ws.send(_remoteLastState); } catch (_) {} }
      // Ask the renderer to push a fresh state; the broadcast will reach this ws too
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(
          'window._remotePushStateDebounced && window._remotePushStateDebounced()'
        ).catch(() => {});
      }
    } else {
      ws.send(JSON.stringify({ type: 'auth_fail', reason: 'Invalid token' }));
    }
    return;
  }

  if (!ws._remoteAuth) {
    ws.send(JSON.stringify({ type: 'error', reason: 'Not authenticated' }));
    return;
  }

  if (msg.type === 'action') {
    _remoteHandleAction(ws, msg);
  } else if (msg.type === 'request_state') {
    if (_remoteLastState) { try { ws.send(_remoteLastState); } catch (_) {} }
  } else if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
  }
}

const _REMOTE_ALLOWED = new Set(['score', 'badge_add', 'badge_remove']);

function _remoteCheckRate(ws) {
  const now = Date.now();
  if (!ws._rl) ws._rl = { n: 0, t: now };
  if (now - ws._rl.t > 2000) { ws._rl = { n: 1, t: now }; return true; }
  return (++ws._rl.n) <= 15;
}

function _remoteHandleAction(ws, msg) {
  const { cmdId, action, studentId, groupName, delta, icon, label, tone } = msg;

  if (!_REMOTE_ALLOWED.has(action)) {
    ws.send(JSON.stringify({ type: 'error', cmdId, reason: 'Unknown action' }));
    return;
  }

  // Deduplication
  if (cmdId) {
    if (!ws._seenCmds) ws._seenCmds = new Set();
    if (ws._seenCmds.has(String(cmdId))) {
      ws.send(JSON.stringify({ type: 'ack', cmdId, ok: true, dedup: true }));
      return;
    }
    if (ws._seenCmds.size > 300) ws._seenCmds.clear();
    ws._seenCmds.add(String(cmdId));
  }

  // Rate limit
  if (!_remoteCheckRate(ws)) {
    ws.send(JSON.stringify({ type: 'error', cmdId, reason: 'Rate limit exceeded' }));
    return;
  }

  // Validate inputs
  if (studentId === undefined || studentId === null || typeof groupName !== 'string') {
    ws.send(JSON.stringify({ type: 'error', cmdId, reason: 'Invalid parameters' }));
    return;
  }

  // Build a safe JS call string for the renderer
  const sId  = JSON.stringify(studentId);
  const sGrp = JSON.stringify(groupName.substring(0, 128));
  let jsCall;

  if (action === 'score') {
    const d = (Number(delta) < 0) ? -1 : 1;
    jsCall = `window._cmsRemoteAction && window._cmsRemoteAction({action:'score',studentId:${sId},groupName:${sGrp},delta:${d}})`;
  } else if (action === 'badge_add') {
    const sIcon  = JSON.stringify(String(icon  || '').substring(0, 8));
    const sLabel = JSON.stringify(String(label || '').substring(0, 64));
    const sTone  = (tone === 'negative') ? '"negative"' : '"positive"';
    jsCall = `window._cmsRemoteAction && window._cmsRemoteAction({action:'badge_add',studentId:${sId},groupName:${sGrp},icon:${sIcon},label:${sLabel},tone:${sTone}})`;
  } else if (action === 'badge_remove') {
    const sIcon = JSON.stringify(String(icon || '').substring(0, 8));
    jsCall = `window._cmsRemoteAction && window._cmsRemoteAction({action:'badge_remove',studentId:${sId},groupName:${sGrp},icon:${sIcon}})`;
  }

  if (!jsCall || !mainWindow || mainWindow.isDestroyed()) {
    ws.send(JSON.stringify({ type: 'error', cmdId, reason: 'App not ready' }));
    return;
  }

  mainWindow.webContents.executeJavaScript(jsCall)
    .then(() => { try { ws.send(JSON.stringify({ type: 'ack', cmdId, ok: true })); } catch (_) {} })
    .catch(() => { try { ws.send(JSON.stringify({ type: 'error', cmdId, reason: 'Action failed' })); } catch (_) {} });
}

async function startRemoteServer(port) {
  if (_remoteServer) return { ok: false, error: 'Server already running' };

  _remotePort  = port || 7823;
  _remoteToken = _remoteGenToken();

  let WebSocketServer;
  try { WebSocketServer = require('ws').Server; }
  catch { return { ok: false, error: "'ws' package not available — run: npm install" }; }

  const remoteHtmlPath = path.join(ROOT_DIR, 'remote.html');

  const server = http.createServer((req, res) => {
    const urlPath = (new URL(req.url || '/', 'http://x')).pathname;
    if (urlPath === '/' || urlPath === '/remote' || urlPath === '/remote.html') {
      fs.readFile(remoteHtmlPath)
        .then(content => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        })
        .catch(() => { res.writeHead(404); res.end('remote.html not found'); });
    } else {
      res.writeHead(404); res.end();
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws._remoteAuth = false;
    _remoteClients.add(ws);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { ws.close(); return; }
      _remoteHandleMsg(ws, msg);
    });

    ws.on('close', () => { _remoteClients.delete(ws); _remoteNotifyStatus(); });
    ws.on('error', () => { _remoteClients.delete(ws); });
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(_remotePort, '0.0.0.0', resolve);
    });
  } catch (err) {
    return { ok: false, error: `Port ${_remotePort} in use or unavailable` };
  }

  _remoteServer = server;
  _remoteWss    = wss;

  // Best-effort: open the port in Windows Firewall so phones on the LAN can reach it
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    const ruleName = 'CMS Remote Control';
    exec(
      `netsh advfirewall firewall delete rule name="${ruleName}" >nul 2>&1 & ` +
      `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=TCP localport=${_remotePort} profile=any`,
      () => {}
    );
  }

  const ip = _remoteGetLocalIp();
  return { ok: true, port: _remotePort, ip, token: _remoteToken };
}

function stopRemoteServer() {
  for (const ws of _remoteClients) { try { ws.close(); } catch (_) {} }
  _remoteClients.clear();
  if (_remoteWss)    { try { _remoteWss.close();    } catch (_) {} _remoteWss    = null; }
  if (_remoteServer) { try { _remoteServer.close(); } catch (_) {} _remoteServer = null; }
  _remoteToken     = null;
  _remoteLastState = null;
}

// Remote Control IPC handlers

ipcMain.handle('app:remote-start', async (_event, { port } = {}) => {
  return startRemoteServer(port || 7823);
});

ipcMain.handle('app:remote-stop', async () => {
  stopRemoteServer();
  return { ok: true };
});

ipcMain.handle('app:remote-status', async () => {
  if (!_remoteServer) return { running: false };
  const ip        = _remoteGetLocalIp();
  const connected = [..._remoteClients].filter(ws => ws._remoteAuth).length;
  return { running: true, port: _remotePort, ip, token: _remoteToken, connected };
});

ipcMain.handle('app:remote-push-state', async (_event, stateData) => {
  if (_remoteServer && stateData) _remoteBroadcast({ type: 'state', ...stateData });
  return { ok: true };
});

ipcMain.handle('app:remote-new-token', async () => {
  if (!_remoteServer) return { ok: false, error: 'Server not running' };
  _remoteToken = _remoteGenToken();
  // Disconnect authenticated clients so they must re-pair
  for (const ws of _remoteClients) {
    if (ws._remoteAuth) { ws._remoteAuth = false; try { ws.close(); } catch (_) {} }
  }
  const ip = _remoteGetLocalIp();
  return { ok: true, token: _remoteToken, port: _remotePort, ip };
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MULTIPLAYER LOCAL SERVER (Electron-managed)
// ─────────────────────────────────────────────────────────────────────────────

let _quizServerProc = null;
let _quizServerPort = 8787;

function _quizStatus() {
  const ip = _remoteGetLocalIp();
  const running = !!(_quizServerProc && !_quizServerProc.killed && _quizServerProc.exitCode == null);
  return {
    running,
    port: _quizServerPort,
    ip,
    hostUrl: `http://${ip}:${_quizServerPort}/learning-tools.html`,
    playerUrl: `http://${ip}:${_quizServerPort}/quiz-player.html`
  };
}

function stopQuizServer() {
  if (!_quizServerProc) return { ok: true, ..._quizStatus() };
  try {
    _quizServerProc.kill();
  } catch (_) {}
  _quizServerProc = null;
  return { ok: true, ..._quizStatus() };
}

function startQuizServer(port) {
  if (_quizServerProc && !_quizServerProc.killed && _quizServerProc.exitCode == null) {
    return { ok: true, ..._quizStatus() };
  }

  const requestedPort = Number(port) || 8787;
  const scriptPath = path.join(ROOT_DIR, 'quiz-multiplayer-server.js');
  if (!fsSync.existsSync(scriptPath)) {
    return { ok: false, error: 'quiz-multiplayer-server.js not found.' };
  }

  _quizServerPort = requestedPort;
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    QUIZ_PORT: String(requestedPort)
  };

  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT_DIR,
      env,
      detached: false,
      stdio: 'ignore',
      windowsHide: true
    });
    child.on('exit', () => {
      if (_quizServerProc === child) _quizServerProc = null;
    });
    child.on('error', () => {
      if (_quizServerProc === child) _quizServerProc = null;
    });
    _quizServerProc = child;
    return { ok: true, ..._quizStatus() };
  } catch (error) {
    _quizServerProc = null;
    return { ok: false, error: error && error.message ? error.message : 'Failed to start quiz server.' };
  }
}

ipcMain.handle('app:quiz-server-start', async (_event, { port } = {}) => {
  return startQuizServer(port || 8787);
});

ipcMain.handle('app:quiz-server-stop', async () => {
  return stopQuizServer();
});

ipcMain.handle('app:quiz-server-status', async () => {
  return _quizStatus();
});

ipcMain.handle('app:open-native', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const { fullPath } = resolveAllowedTargetPath(pageFile, request.target, request.relativePath);
  const errMsg = await shell.openPath(fullPath);
  return errMsg ? { ok: false, error: errMsg } : { ok: true };
});

ipcMain.handle('app:duplicate-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const { fullPath: srcPath, safeRelative: srcRelPath } = resolveAllowedTargetPath(pageFile, request.target, request.relativePath);

  const ext = path.extname(srcPath);
  const basePath    = ext ? srcPath.slice(0, -ext.length)    : srcPath;
  const baseRelPath = ext ? srcRelPath.slice(0, -ext.length) : srcRelPath;

  let destPath, destRelPath, n = 1;
  while (true) {
    const suffix = n === 1 ? ' - Copy' : ` - Copy (${n})`;
    destPath    = basePath    + suffix + ext;
    destRelPath = baseRelPath + suffix + ext;
    try { await fs.access(destPath); n++; } catch { break; }
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(srcPath, destPath);
  const stats = await fs.stat(destPath);
  return {
    ok: true,
    relativePath: destRelPath,
    filename: path.basename(destPath),
    size: stats.size,
    mtimeMs: stats.mtimeMs
  };
});

// ─────────────────────────────────────────────────────────────────────────────

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus the existing window when a second instance is launched
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  let initialPageFile = getInitialPageFile();

  try {
    session.defaultSession.setSpellCheckerLanguages(['en-GB', 'fr-FR']);
  } catch (error) {
    console.warn('Could not set spell checker languages:', error.message);
  }

  try {
    await ensureWritableSeedDataWithFallback();
  } catch (error) {
    console.error('Data initialization failed, opening app anyway:', error);
  }

  // On first run (no data/log/user folders yet) open the data-location page
  // unless the user explicitly launched with a specific page argument.
  if (firstRunDetected && initialPageFile === PAGE_FILES.classManagement) {
    initialPageFile = PAGE_FILES.dataLocation;
  }

  buildMenu();
  createMainWindow(initialPageFile);

  // Start auto-sync watcher if the user had it enabled.
  loadAutoSyncEnabled().then(enabled => { if (enabled) startAutoSyncWatcher(); }).catch(() => {});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(initialPageFile);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopQuizServer();
});