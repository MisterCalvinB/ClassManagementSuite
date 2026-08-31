process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
const { app, BrowserWindow, clipboard, crashReporter, dialog, ipcMain, Menu, screen, session, shell } = require('electron');

try {
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc');
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
} catch (swErr) {
  console.warn('Could not append Electron commandLine switches:', swErr?.message || swErr);
}

const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const os     = require('os');
const http   = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

try {
  crashReporter.start({
    submitURL: '',
    uploadToServer: false,
    compress: true
  });
} catch (err) {
  console.warn('CrashReporter initialization warning:', err?.message || err);
}

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
  launcher: 'launcher.html',
  generalConfig: 'general-config.html',
  fileManager: 'file-manager.html',
  howTo: 'how-to.html',
  about: 'about.html',
  credits: 'about.html',
  scheduleMaker: 'schedule-maker.html',
  classPlan: 'class-plan.html',
  documentEditor: 'document-editor.html',
  planner: 'planner.html',
  lessonCreator: 'lesson-creator.html',
  importTool: 'import-tool.html',
  administrativeGroups: 'administrative-groups.html',
  oralMarking: 'oral-marking.html'
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
  launcher: PAGE_FILES.launcher,
  home: PAGE_FILES.launcher,
  generalconfig: PAGE_FILES.generalConfig,
  config: PAGE_FILES.generalConfig,
  filemanager: PAGE_FILES.fileManager,
  files: PAGE_FILES.fileManager,
  recent: PAGE_FILES.fileManager,
  howto: PAGE_FILES.howTo,
  help: PAGE_FILES.howTo,
  about: PAGE_FILES.about,
  credits: PAGE_FILES.about,
  groupeditor: PAGE_FILES.groupEditor,
  groups: PAGE_FILES.groupEditor,
  schedulemaker: PAGE_FILES.scheduleMaker,
  schedule: PAGE_FILES.scheduleMaker,
  oralmarking: PAGE_FILES.oralMarking,
  oral: PAGE_FILES.oralMarking,
  oralmark: PAGE_FILES.oralMarking,
  classplan: PAGE_FILES.classPlan,
  plan: PAGE_FILES.classPlan,
  classp: PAGE_FILES.classPlan,
  documenteditor: PAGE_FILES.documentEditor,
  doceditor: PAGE_FILES.documentEditor,
  markdownkatex: PAGE_FILES.documentEditor,
  markdown: PAGE_FILES.documentEditor,
  planner: PAGE_FILES.planner,
  semplanner: PAGE_FILES.planner,
  lessoncreator: PAGE_FILES.lessonCreator,
  lessons: PAGE_FILES.lessonCreator,
  lessonplan: PAGE_FILES.lessonCreator,
  importtool: PAGE_FILES.importTool,
  import: PAGE_FILES.importTool,
  administrativegroups: PAGE_FILES.administrativeGroups,
  admingroups: PAGE_FILES.administrativeGroups,
  maitrisedegroupe: PAGE_FILES.administrativeGroups,
  maitrise: PAGE_FILES.administrativeGroups
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
  [PAGE_FILES.launcher]: 'Launcher',
  [PAGE_FILES.generalConfig]: 'General Config',
  [PAGE_FILES.fileManager]: 'File Manager',
  [PAGE_FILES.howTo]: 'How To',
  [PAGE_FILES.about]: 'About',
  [PAGE_FILES.scheduleMaker]: 'Schedule Maker',
  [PAGE_FILES.classPlan]: 'Class Plan',
  [PAGE_FILES.documentEditor]: 'Document Editor',
  [PAGE_FILES.planner]: 'Planner',
  [PAGE_FILES.lessonCreator]: 'Lesson Creator',
  [PAGE_FILES.importTool]: 'Import Tool',
  [PAGE_FILES.administrativeGroups]: 'Administrative Groups',
  [PAGE_FILES.oralMarking]: 'Oral Marking'
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
  const portableOverride = String(process.env.PORTABLE_ROOT || '').trim();
  if (portableOverride) {
    return path.resolve(portableOverride);
  }

  if (!app.isPackaged) {
    return ROOT_DIR;
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

function getCrashDumpsDir() {
  const writableRoot = getWritableRootDir();
  const dir = path.join(writableRoot, 'user', 'logs', 'crash-dumps');
  try {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {}
  return dir;
}

function writeCrashDump(type, details = {}, error = null) {
  try {
    const crashDir = getCrashDumpsDir();
    const now = new Date();
    const isoString = now.toISOString();
    const fileTimestamp = isoString.replace(/[:.]/g, '-');
    const dumpPath = path.join(crashDir, `crash-dump_${fileTimestamp}.json`);
    const latestPath = path.join(crashDir, 'latest-crash-dump.json');

    const processMem = typeof process.memoryUsage === 'function' ? process.memoryUsage() : {};
    const freeMemBytes = typeof os.freemem === 'function' ? os.freemem() : 0;
    const totalMemBytes = typeof os.totalmem === 'function' ? os.totalmem() : 0;

    const activeWindows = [];
    try {
      const allWins = BrowserWindow.getAllWindows();
      for (const win of allWins) {
        if (win && !win.isDestroyed()) {
          activeWindows.push({
            id: win.id,
            page: typeof getLoadedPageFile === 'function' ? getLoadedPageFile(win) : 'unknown',
            isVisible: win.isVisible(),
            isMinimized: win.isMinimized(),
            isFocused: win.isFocused()
          });
        }
      }
    } catch (winErr) {}

    const dumpData = {
      timestamp: isoString,
      crashType: type,
      appVersion: typeof app.getVersion === 'function' ? app.getVersion() : '1.0.0',
      electronVersion: process.versions.electron || '',
      nodeVersion: process.versions.node || '',
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.round(typeof process.uptime === 'function' ? process.uptime() : 0),
      systemMemory: {
        totalMB: Math.round(totalMemBytes / (1024 * 1024)),
        freeMB: Math.round(freeMemBytes / (1024 * 1024))
      },
      processMemory: {
        rssMB: Math.round((processMem.rss || 0) / (1024 * 1024)),
        heapTotalMB: Math.round((processMem.heapTotal || 0) / (1024 * 1024)),
        heapUsedMB: Math.round((processMem.heapUsed || 0) / (1024 * 1024)),
        externalMB: Math.round((processMem.external || 0) / (1024 * 1024))
      },
      activeWindowsCount: activeWindows.length,
      activeWindows,
      details: details || {},
      error: error ? {
        message: error.message || String(error),
        name: error.name || 'Error',
        stack: error.stack || ''
      } : null
    };

    const jsonStr = JSON.stringify(dumpData, null, 2);
    fsSync.writeFileSync(dumpPath, jsonStr, 'utf8');
    fsSync.writeFileSync(latestPath, jsonStr, 'utf8');

    try {
      const files = fsSync.readdirSync(crashDir)
        .filter(f => f.startsWith('crash-dump_') && f.endsWith('.json'))
        .sort();
      if (files.length > 20) {
        for (let i = 0; i < files.length - 20; i++) {
          try { fsSync.unlinkSync(path.join(crashDir, files[i])); } catch (e) {}
        }
      }
    } catch (purgeErr) {}

    return dumpPath;
  } catch (err) {
    console.error('Failed to write crash dump:', err);
    return null;
  }
}

process.on('uncaughtException', (error) => {
  console.error('[CRASH] Uncaught Exception in Main Process:', error);
  writeCrashDump('uncaughtException', {}, error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled Rejection in Main Process:', reason);
  const err = reason instanceof Error ? reason : new Error(String(reason));
  writeCrashDump('unhandledRejection', {}, err);
});

app.on('child-process-gone', (event, details) => {
  console.error('[ProcessCrash] Child process gone:', details);
  writeCrashDump('child-process-gone', { details });
});

let _memoryCheckInterval = null;
function startMemoryHeartbeat() {
  if (_memoryCheckInterval) clearInterval(_memoryCheckInterval);
  _memoryCheckInterval = setInterval(() => {
    try {
      const mem = process.memoryUsage();
      const heapMB = mem.heapUsed / (1024 * 1024);
      const rssMB = mem.rss / (1024 * 1024);
      if (heapMB > 1200 || rssMB > 1800) {
        console.warn(`[MemoryWarning] High memory footprint: Heap ${Math.round(heapMB)}MB, RSS ${Math.round(rssMB)}MB`);
        writeCrashDump('diagnostic-memory-warning', { heapMB, rssMB });
        if (typeof global.gc === 'function') {
          try {
            global.gc();
            console.log('[MemoryCleanup] Triggered Garbage Collection.');
          } catch (gcErr) {}
        }
      }
    } catch (e) {}
  }, 5 * 60 * 1000);
}

function getSaveTargets() {
  const writableRoot = getWritableRootDir();
  const customDataRoot = path.join(writableRoot, 'user/custom-data');

  return {
    app: ROOT_DIR,
    user: path.join(writableRoot, 'user'),
    lessons: path.join(writableRoot, 'user/lessons'),
    data: customDataRoot,
    grades: path.join(writableRoot, 'user/grades'),
    groupParticipation: path.join(writableRoot, 'user/group-participation'),
    mindmaps: path.join(writableRoot, 'user/mindmaps'),
    constellationTemplates: path.join(writableRoot, 'user/mindmaps/templates'),
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
    customCompetences: path.join(writableRoot, 'user/custom-data/competences'),
    customDescriptors: path.join(writableRoot, 'user/custom-data/competences'),
    classPlans: path.join(writableRoot, 'user/class-plans'),
    docEditorDocs: path.join(writableRoot, 'user/document-editor/docs'),
    docEditorStylesheets: path.join(writableRoot, 'user/document-editor/stylesheets'),
    docEditorTemplates: path.join(writableRoot, 'user/document-editor/templates'),
    docEditorSettings: path.join(writableRoot, 'user/document-editor'),
    gameResults: path.join(writableRoot, 'user/game-results'),
    gradeSheet:  path.join(writableRoot, 'user/log/grade-sheet'),
    toPrint:     path.join(writableRoot, 'user/to-print')
  };
}

function getBundledDataRoot() {
  return path.join(ROOT_DIR, 'user', 'custom-data');
}

const PAGE_PERMISSIONS = {
  [PAGE_FILES.board]: new Set(['data', 'mindmaps', 'constellationTemplates', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'user', 'customBooks', 'lessons']),
  [PAGE_FILES.classManagement]: new Set(['user', 'lessons', 'groupParticipation', 'data', 'grades']),
  [PAGE_FILES.groupEditor]: new Set(['user', 'groupParticipation', 'grades', 'gradeSheet']),
  [PAGE_FILES.gradeSheet]: new Set(['grades', 'user', 'toPrint']),
  [PAGE_FILES.learningDb]: new Set(['data', 'user', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customCompetences', 'customDescriptors']),
  [PAGE_FILES.learningDb2]: new Set(['data', 'user', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customBooks', 'customCompetences', 'customDescriptors']),
  [PAGE_FILES.learningTools]: new Set(['data', 'user', 'groupParticipation', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'gameResults']),
  [PAGE_FILES.participationTracker]: new Set(['user', 'groupParticipation', 'toPrint']),
  [PAGE_FILES.launcher]: new Set(['user', 'mindmaps', 'docEditorDocs', 'toPrint', 'lessons']),
  [PAGE_FILES.generalConfig]: new Set(['user']),
  [PAGE_FILES.fileManager]: new Set(['user', 'lessons', 'mindmaps', 'data', 'customData', 'customWordbanks', 'customBooks', 'customDictations', 'customQuizzes', 'grades', 'groupParticipation', 'docEditorDocs', 'docEditorStylesheets', 'docEditorTemplates', 'toPrint', 'customCompetences', 'customDescriptors']),
  [PAGE_FILES.howTo]: new Set(['user']),
  [PAGE_FILES.credits]: new Set([]),
  [PAGE_FILES.scheduleMaker]: new Set(['user', 'data']),
  [PAGE_FILES.classPlan]: new Set(['user', 'classPlans']),
  [PAGE_FILES.documentEditor]: new Set(['docEditorDocs', 'docEditorStylesheets', 'docEditorTemplates', 'docEditorSettings', 'user', 'app', 'mindmaps', 'data', 'customData', 'customWordbanks', 'customBooks', 'customDictations', 'customQuizzes', 'grades', 'groupParticipation', 'toPrint']),
  [PAGE_FILES.planner]: new Set(['user', 'lessons', 'groupParticipation', 'grades', 'mindmaps', 'toPrint']),
  [PAGE_FILES.lessonCreator]: new Set(['user', 'lessons', 'customCompetences', 'customDescriptors', 'mindmaps', 'toPrint']),
  [PAGE_FILES.importTool]: new Set(['user', 'lessons', 'customWordbanks', 'customQuizzes', 'customGapfillbanks', 'customQuotes', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'data', 'docEditorDocs', 'customBooks', 'customCompetences', 'customDescriptors']),
  [PAGE_FILES.administrativeGroups]: new Set(['user', 'grades', 'data', 'customData', 'toPrint']),
  [PAGE_FILES.oralMarking]: new Set(['user', 'grades'])
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
  const subdir = pageFile === PAGE_FILES.launcher ? '' : 'pages';
  return path.join(ROOT_DIR, subdir, pageFile);
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

    let insetL = 0, insetR = 0, insetB = 0;
    if (process.platform === 'win32') {
      const ob = mainWin.getBounds();
      const cb = mainWin.getContentBounds();
      if (cb && cb.width > 0 && cb.height > 0) {
        const rawL = cb.x - ob.x;
        const rawR = (ob.x + ob.width) - (cb.x + cb.width);
        const rawB = (ob.y + ob.height) - (cb.y + cb.height);
        if (rawL >= 0 && rawL < 50) insetL = rawL;
        if (rawR >= 0 && rawR < 50) insetR = rawR;
        if (rawB >= 0 && rawB < 50) insetB = rawB;
      }
    }

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

function _applySafeBounds(win, bounds) {
  if (!win || win.isDestroyed() || !bounds) return;
  let { x, y, width, height } = bounds;

  if (process.platform === 'win32') {
    const ob = win.getBounds();
    const cb = win.getContentBounds();
    if (cb && cb.width > 0 && cb.height > 0) {
      const rawL = cb.x - ob.x;
      const rawR = (ob.x + ob.width) - (cb.x + cb.width);
      const rawB = (ob.y + ob.height) - (cb.y + cb.height);
      const insetL = (rawL >= 0 && rawL < 50) ? rawL : 0;
      const insetR = (rawR >= 0 && rawR < 50) ? rawR : 0;
      const insetB = (rawB >= 0 && rawB < 50) ? rawB : 0;
      if (insetL > 0 || insetR > 0 || insetB > 0) {
        x -= insetL;
        width += (insetL + insetR);
        height += insetB;
      }
    }
  }

  win.setBounds({ x, y, width, height });
}

function setupWindowExternalLinkHandling(win) {
  if (!win || !win.webContents) return;
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) {
      shell.openExternal(url).catch((err) => {
        console.warn('Failed to open external URL from window.open:', url, err);
      });
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url).catch((err) => {
        console.warn('Failed to open external URL on will-navigate:', url, err);
      });
    }
  });

  win.webContents.on('render-process-gone', (event, details) => {
    const pageFile = typeof getLoadedPageFile === 'function' ? getLoadedPageFile(win) : 'unknown';
    console.error(`[ProcessCrash] Render process gone for window (${pageFile}):`, details);
    writeCrashDump('render-process-gone', { pageFile, details });
    if (win === mirrorWindow) {
      mirrorWindow = null;
    } else if (win === cmsPresentationWindow) {
      cmsPresentationWindow = null;
    } else if (win === oralPresenterWindow) {
      oralPresenterWindow = null;
    } else if (win === docPresentationWindow) {
      docPresentationWindow = null;
    } else if (win === timerDetachedWindow) {
      timerDetachedWindow = null;
    }
  });

  win.webContents.on('unresponsive', () => {
    const pageFile = typeof getLoadedPageFile === 'function' ? getLoadedPageFile(win) : 'unknown';
    console.warn(`[ProcessWarning] Window (${pageFile}) became unresponsive.`);
    writeCrashDump('window-unresponsive', { pageFile });
  });
}

function createToolWindow(pageFile, options = {}) {
  const browserOpts = {
    width: typeof options.width === 'number' ? options.width : 1600,
    height: typeof options.height === 'number' ? options.height : 1000,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  };
  if (typeof options.x === 'number') browserOpts.x = options.x;
  if (typeof options.y === 'number') browserOpts.y = options.y;

  const win = new BrowserWindow(browserOpts);

  setupWindowExternalLinkHandling(win);
  win.on('close', (event) => {
    const currentPage = getLoadedPageFile(win);

    // Close associated presentation/mirror windows when their parent tool closes
    if (currentPage === PAGE_FILES.board && mirrorWindow && !mirrorWindow.isDestroyed()) {
      mirrorWindow.close();
    }
    if (currentPage === PAGE_FILES.classManagement && cmsPresentationWindow && !cmsPresentationWindow.isDestroyed()) {
      cmsPresentationWindow.close();
    }
    if (currentPage === PAGE_FILES.learningTools && learningToolsPresentationWindow && !learningToolsPresentationWindow.isDestroyed()) {
      learningToolsPresentationWindow.close();
    }
    if (currentPage === PAGE_FILES.oralMarking && oralPresenterWindow && !oralPresenterWindow.isDestroyed()) {
      oralPresenterWindow.close();
    }
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
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Fallback to ensure window is shown even if ready-to-show is delayed
  const showFallbackTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 800);
  mainWindow.once('show', () => clearTimeout(showFallbackTimer));

  setupWindowExternalLinkHandling(mainWindow);
  mainWindow.on('closed', () => {
    mainWindow = null;
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

  let reqSubdir = file.subdir || null;
  let reqFilename = String(file.filename || '').trim();

  if (!reqSubdir && (reqFilename.includes('/') || reqFilename.includes('\\'))) {
    const norm = reqFilename.replace(/\\/g, '/');
    const lastSlash = norm.lastIndexOf('/');
    if (lastSlash !== -1) {
      reqSubdir = norm.slice(0, lastSlash);
      reqFilename = norm.slice(lastSlash + 1);
    }
  }

  const safeSubdir = reqSubdir ? sanitizeRelativePath(reqSubdir) : null;
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

  const finalName = sanitizeFilename(reqFilename);
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

async function readSessionTimestampMetaFast(filePath, ext, knownSize) {
  const meta = {};
  if (ext === '.cstz' || ext === '.zip') {
    try {
      const zipBuffer = await fs.readFile(filePath);
      const entries = parseZipEntries(zipBuffer);
      let manifest = null;
      let boardData = null;
      for (const entry of entries) {
        const normName = normalizeZipEntryPath(entry.name) || entry.name;
        if (normName === 'manifest.json') {
          try { manifest = JSON.parse(entry.data.toString('utf8')); } catch {}
          if (manifest && (manifest.classGroup || manifest.plannerEntryId || manifest.createdAt || manifest.updatedAt)) {
            break;
          }
        } else if (normName === 'board.json' && !manifest) {
          try { boardData = JSON.parse(entry.data.toString('utf8')); } catch {}
        }
      }
      if (manifest || boardData) {
        meta.sessionType = (manifest && manifest.format) || (boardData && boardData._type) || 'constellation';
        meta.classGroup = (manifest && manifest.classGroup) || (boardData && (boardData._classGroup || boardData.classGroup)) || '';
        meta.plannerEntryId = (manifest && manifest.plannerEntryId) || (boardData && (boardData._plannerEntryId || (boardData.manifest && boardData.manifest.plannerEntryId))) || '';

        const createdAt = Number(manifest && (manifest.createdAt || manifest._createdAt))
          || Number(boardData && (boardData._createdAt || boardData.createdAt))
          || ((boardData && boardData.dateCreated) ? Date.parse(String(boardData.dateCreated).replace(/_\d+$/, '')) : 0)
          || ((manifest && manifest.dateCreated) ? Date.parse(String(manifest.dateCreated).replace(/_\d+$/, '')) : 0)
          || 0;
        if (createdAt > 0) meta.createdAt = createdAt;

        const savedAt = Number(manifest && (manifest.updatedAt || manifest.savedAt || manifest._savedAt))
          || Number(boardData && (boardData._savedAt || boardData.savedAt))
          || 0;
        if (savedAt > 0) meta.savedAt = savedAt;
      }
    } catch {}
    return meta;
  }

  let fileHandle;
  try {
    fileHandle = await fs.open(filePath, 'r');
    const headBuf = Buffer.alloc(8192);
    const { bytesRead: headRead } = await fileHandle.read(headBuf, 0, 8192, 0);
    const headText = headBuf.toString('utf8', 0, headRead).replace(/^\uFEFF/, '');

    const parseTextMeta = (text) => {
      const createdComment = text.match(/^\s*\/\/\s*_createdAt:\s*(\d+)\s*$/m);
      const savedComment = text.match(/^\s*\/\/\s*_savedAt:\s*(\d+)\s*$/m);
      if (createdComment && !meta.createdAt) meta.createdAt = Number(createdComment[1]) || 0;
      if (savedComment && !meta.savedAt) meta.savedAt = Number(savedComment[1]) || 0;

      const typeMatch = text.match(/"_type"\s*:\s*"([^"]+)"/) || text.match(/"_typ"\s*:\s*"([^"]+)"/);
      if (typeMatch && !meta.sessionType) meta.sessionType = typeMatch[1];

      const cgMatch = text.match(/"_classGroup"\s*:\s*"([^"]*)"/) || text.match(/^\s*\/\/\s*_classGroup:\s*([^\s]+)\s*$/m);
      if (cgMatch && cgMatch[1] && !meta.classGroup) meta.classGroup = cgMatch[1];

      const pidMatch = text.match(/"_plannerEntryId"\s*:\s*"([^"]*)"/) || text.match(/^\s*\/\/\s*_plannerEntryId:\s*([^\s]+)\s*$/m);
      if (pidMatch && pidMatch[1] && !meta.plannerEntryId) meta.plannerEntryId = pidMatch[1];

      if (!meta.createdAt) {
        const createdKey = text.match(/"_createdAt"\s*:\s*(\d+)/);
        if (createdKey) meta.createdAt = Number(createdKey[1]) || 0;
      }
      if (!meta.savedAt) {
        const savedKey = text.match(/"_savedAt"\s*:\s*(\d+)/);
        if (savedKey) meta.savedAt = Number(savedKey[1]) || 0;
      }

      if (!meta.createdAt) {
        const dcMatch = text.match(/"dateCreated"\s*:\s*"([^"]+)"/);
        if (dcMatch) {
          const stripped = dcMatch[1].replace(/_\d+$/, '');
          const ms = Date.parse(stripped);
          if (Number.isFinite(ms) && ms > 0) meta.createdAt = ms;
        }
      }
    };

    parseTextMeta(headText);

    // If classGroup, plannerEntryId, or createdAt/savedAt is missing and file is larger than headRead, also inspect the tail
    const fileSize = typeof knownSize === 'number' ? knownSize : (await fileHandle.stat().then(s => s.size).catch(() => 0));
    if ((!meta.classGroup || !meta.plannerEntryId || !meta.createdAt || !meta.savedAt) && fileSize > headRead) {
      const tailLen = Math.min(8192, fileSize);
      const tailPos = Math.max(0, fileSize - tailLen);
      if (tailPos >= headRead) {
        const tailBuf = Buffer.alloc(tailLen);
        const { bytesRead: tailRead } = await fileHandle.read(tailBuf, 0, tailLen, tailPos);
        const tailText = tailBuf.toString('utf8', 0, tailRead);
        parseTextMeta(tailText);
      }
    }
  } catch {} finally {
    if (fileHandle) {
      try { await fileHandle.close(); } catch {}
    }
  }
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
  const fileDirents = dirents.filter(d => d.isFile());

  const fileResults = await Promise.all(fileDirents.map(async (dirent) => {
    const ext = path.extname(dirent.name).toLowerCase();
    if (normalizedExtensions.length && !normalizedExtensions.includes(ext)) return null;

    const filePath = path.join(targetDir, dirent.name);
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch {
      return null;
    }

    let jsonMeta = {};
    if (ext === '.json' || ext === '.js' || ext === '.cstz' || ext === '.zip') {
      try {
        jsonMeta = await readSessionTimestampMetaFast(filePath, ext, stats.size);
      } catch {}
    }

    if (!jsonMeta.createdAt) {
      const birthtimeMs = Number(stats.birthtimeMs) || 0;
      const mtimeMs = Number(stats.mtimeMs) || 0;
      if (birthtimeMs > 0 && mtimeMs > 0 && (birthtimeMs - mtimeMs) > 60_000) {
        jsonMeta.createdAt = mtimeMs;
      }
    }

    return {
      filename: dirent.name,
      path: filePath,
      size: stats.size,
      birthtimeMs: stats.birthtimeMs,
      ctimeMs: stats.ctimeMs,
      mtimeMs: stats.mtimeMs,
      ...jsonMeta
    };
  }));

  const files = fileResults.filter(Boolean);
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
  const includeDirectories = request.includeDirectories === true;
  const excludeDirs = Array.isArray(request.excludeDirs)
    ? new Set(request.excludeDirs.map((d) => String(d || '').trim().toLowerCase()).filter(Boolean))
    : null;

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

    const subDirs = [];
    const fileDirents = [];

    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        const dirNameLower = dirent.name.toLowerCase();
        if (excludeDirs && excludeDirs.has(dirNameLower)) continue;
        subDirs.push(dirent);
      } else if (dirent.isFile()) {
        fileDirents.push(dirent);
      }
    }

    for (const dirent of subDirs) {
      const absolutePath = path.join(currentDir, dirent.name);
      const childRelative = relativeDir
        ? path.posix.join(relativeDir, dirent.name)
        : dirent.name;
      const relativePathFromTarget = path.posix.join(safeRelative, childRelative);
      const dedupeKey = relativePathFromTarget.toLowerCase();

      if (includeDirectories && !seen.has(dedupeKey)) {
        let stats;
        try {
          stats = await fs.stat(absolutePath);
        } catch {
          stats = null;
        }

        seen.add(dedupeKey);
        files.push({
          filename: dirent.name,
          relativePath: relativePathFromTarget,
          path: absolutePath,
          size: 0,
          birthtimeMs: stats ? stats.birthtimeMs : 0,
          mtimeMs: stats ? stats.mtimeMs : 0,
          isDirectory: true
        });
      }

      if (recursive) {
        await walkDirectory(baseDir, absolutePath, childRelative);
      }
    }

    const fileResults = await Promise.all(fileDirents.map(async (dirent) => {
      const ext = path.extname(dirent.name).toLowerCase();
      if (normalizedExtensions.length && !normalizedExtensions.includes(ext)) return null;

      const absolutePath = path.join(currentDir, dirent.name);
      const childRelative = relativeDir
        ? path.posix.join(relativeDir, dirent.name)
        : dirent.name;
      const relativePathFromTarget = path.posix.join(safeRelative, childRelative);
      const dedupeKey = relativePathFromTarget.toLowerCase();

      if (seen.has(dedupeKey)) return null;

      let stats;
      try {
        stats = await fs.stat(absolutePath);
      } catch {
        return null;
      }

      seen.add(dedupeKey);

      let jsonMeta = {};
      if (ext === '.json' || ext === '.js' || ext === '.cstz' || ext === '.zip') {
        try {
          jsonMeta = await readSessionTimestampMetaFast(absolutePath, ext, stats.size);
        } catch {}
      }

      if (!jsonMeta.createdAt) {
        const birthtimeMs = Number(stats.birthtimeMs) || 0;
        const mtimeMs = Number(stats.mtimeMs) || 0;
        if (birthtimeMs > 0 && mtimeMs > 0 && (birthtimeMs - mtimeMs) > 60_000) {
          jsonMeta.createdAt = mtimeMs;
        }
      }

      return {
        filename: dirent.name,
        relativePath: relativePathFromTarget,
        path: absolutePath,
        size: stats.size,
        birthtimeMs: stats.birthtimeMs,
        ctimeMs: stats.ctimeMs,
        mtimeMs: stats.mtimeMs,
        isDirectory: false,
        ...jsonMeta
      };
    }));

    for (const f of fileResults) {
      if (f) files.push(f);
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
  return {
    relativePath: safeRelative,
    path: fullPath
  };
}

async function createAllowedPathDirectory(pageFile, target, relativePath) {
  const { fullPath, safeRelative } = resolveAllowedTargetPath(pageFile, target, relativePath);
  await fs.mkdir(fullPath, { recursive: true });
  return {
    relativePath: safeRelative,
    path: fullPath
  };
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

async function statAllowedPathEntry(pageFile, target, relativePath) {
  const { fullPath, safeRelative } = resolveAllowedTargetPath(pageFile, target, relativePath);
  try {
    const stats = await fs.stat(fullPath);
    return {
      ok: true,
      exists: true,
      relativePath: safeRelative,
      path: fullPath,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size,
      mtimeMs: stats.mtimeMs
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ok: true, exists: false, relativePath: safeRelative, path: fullPath };
    }
    throw error;
  }
}

function isSamePath(a, b) {
  const left = path.resolve(String(a || ''));
  const right = path.resolve(String(b || ''));
  if (process.platform === 'win32') {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function isPathInside(parentPath, childPath) {
  const parent = path.resolve(String(parentPath || ''));
  const child = path.resolve(String(childPath || ''));
  if (isSamePath(parent, child)) return true;
  if (process.platform === 'win32') {
    return child.toLowerCase().startsWith(parent.toLowerCase() + path.sep);
  }
  return child.startsWith(parent + path.sep);
}

async function copyAllowedPathEntry(pageFile, request = {}) {
  const source = resolveAllowedTargetPath(pageFile, request.sourceTarget, request.sourceRelativePath);
  const destination = resolveAllowedTargetPath(pageFile, request.destinationTarget, request.destinationRelativePath);
  const replace = request.replace === true;

  if (isSamePath(source.fullPath, destination.fullPath)) {
    const err = new Error('Source and destination are the same.');
    err.code = 'EINVAL';
    throw err;
  }

  const srcStats = await fs.stat(source.fullPath);
  if (srcStats.isDirectory() && isPathInside(source.fullPath, destination.fullPath)) {
    const err = new Error('Cannot copy a folder into itself.');
    err.code = 'EINVAL';
    throw err;
  }

  const destExists = await fs.access(destination.fullPath).then(() => true).catch(() => false);
  if (destExists && !replace) {
    const err = new Error('Destination already exists.');
    err.code = 'EEXIST';
    throw err;
  }
  if (destExists && replace) {
    await fs.rm(destination.fullPath, { recursive: true, force: true });
  }

  await fs.mkdir(path.dirname(destination.fullPath), { recursive: true });
  if (srcStats.isDirectory()) {
    await fs.cp(source.fullPath, destination.fullPath, { recursive: true, force: false, errorOnExist: true });
  } else {
    await fs.copyFile(source.fullPath, destination.fullPath);
  }

  const outStats = await fs.stat(destination.fullPath);
  return {
    ok: true,
    sourceRelativePath: source.safeRelative,
    destinationRelativePath: destination.safeRelative,
    isDirectory: outStats.isDirectory(),
    size: outStats.size,
    mtimeMs: outStats.mtimeMs
  };
}

async function moveAllowedPathEntry(pageFile, request = {}) {
  const source = resolveAllowedTargetPath(pageFile, request.sourceTarget, request.sourceRelativePath);
  const destination = resolveAllowedTargetPath(pageFile, request.destinationTarget, request.destinationRelativePath);
  const replace = request.replace === true;

  if (isSamePath(source.fullPath, destination.fullPath)) {
    const err = new Error('Source and destination are the same.');
    err.code = 'EINVAL';
    throw err;
  }

  const srcStats = await fs.stat(source.fullPath);
  if (srcStats.isDirectory() && isPathInside(source.fullPath, destination.fullPath)) {
    const err = new Error('Cannot move a folder into itself.');
    err.code = 'EINVAL';
    throw err;
  }

  const destExists = await fs.access(destination.fullPath).then(() => true).catch(() => false);
  if (destExists && !replace) {
    const err = new Error('Destination already exists.');
    err.code = 'EEXIST';
    throw err;
  }
  if (destExists && replace) {
    await fs.rm(destination.fullPath, { recursive: true, force: true });
  }

  await fs.mkdir(path.dirname(destination.fullPath), { recursive: true });

  try {
    await fs.rename(source.fullPath, destination.fullPath);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      if (srcStats.isDirectory()) {
        await fs.cp(source.fullPath, destination.fullPath, { recursive: true, force: false, errorOnExist: true });
        await fs.rm(source.fullPath, { recursive: true, force: true });
      } else {
        await fs.copyFile(source.fullPath, destination.fullPath);
        await fs.unlink(source.fullPath);
      }
    } else {
      throw error;
    }
  }

  const outStats = await fs.stat(destination.fullPath);
  return {
    ok: true,
    sourceRelativePath: source.safeRelative,
    destinationRelativePath: destination.safeRelative,
    isDirectory: outStats.isDirectory(),
    size: outStats.size,
    mtimeMs: outStats.mtimeMs
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

async function migrateLogFolders() {
  const writableRoot = getWritableRootDir();
  const migrations = [
    { from: path.join(writableRoot, 'user/log/grades'),              to: path.join(writableRoot, 'user/grades') },
    { from: path.join(writableRoot, 'user/log/group-participation'), to: path.join(writableRoot, 'user/group-participation') },
    { from: path.join(writableRoot, 'user/log/constellation'),       to: path.join(writableRoot, 'user/mindmaps') },
  ];
  for (const { from, to } of migrations) {
    try { await fs.access(from); } catch { continue; }
    let newExists = false;
    try { await fs.access(to); newExists = true; } catch {}
    if (newExists) {
      await copyMissingTree(from, to);
      await fs.rm(from, { recursive: true, force: true });
    } else {
      await fs.rename(from, to);
    }
  }
}

async function ensureWritableSeedData() {
  if (!app.isPackaged) {
    return;
  }

  const writableRoot = getWritableRootDir();
  try {
    await normalizeAndAdoptDataLocation(writableRoot);
  } catch {}

  const saveTargets = getSaveTargets();
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
    fs.mkdir(saveTargets.customCompetences, { recursive: true }),
    fs.mkdir(saveTargets.customDescriptors, { recursive: true }),
    fs.mkdir(saveTargets.groupParticipation, { recursive: true }),
    fs.mkdir(saveTargets.mindmaps, { recursive: true }),
    fs.mkdir(saveTargets.constellationTemplates, { recursive: true }),
    fs.mkdir(saveTargets.grades, { recursive: true }),
    fs.mkdir(saveTargets.toPrint, { recursive: true })
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

async function loadSavedBackupConfig() {
  try {
    const raw = await fs.readFile(getBackupLocationConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      backupLocation: String(parsed?.backupLocation || '').trim() || null,
      backupFormat: ['folder', 'zip', 'targz'].includes(parsed?.backupFormat) ? parsed.backupFormat : 'folder',
      backupScheduleEnabled: Boolean(parsed?.backupScheduleEnabled),
      backupIntervalDays: Number.isFinite(parsed?.backupIntervalDays) ? Math.max(1, Math.min(365, parseInt(parsed.backupIntervalDays, 10))) : 7,
      lastBackupTime: parsed?.lastBackupTime || null
    };
  } catch {
    return { backupLocation: null, backupFormat: 'folder', backupScheduleEnabled: false, backupIntervalDays: 7, lastBackupTime: null };
  }
}

async function loadSavedBackupLocation() {
  const cfg = await loadSavedBackupConfig();
  return cfg.backupLocation;
}

async function saveBackupConfig(updates = {}) {
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    const current = await loadSavedBackupConfig();
    const newConfig = {
      backupLocation: updates.backupLocation !== undefined ? updates.backupLocation : current.backupLocation,
      backupFormat: updates.backupFormat !== undefined ? updates.backupFormat : current.backupFormat,
      backupScheduleEnabled: updates.backupScheduleEnabled !== undefined ? updates.backupScheduleEnabled : current.backupScheduleEnabled,
      backupIntervalDays: updates.backupIntervalDays !== undefined ? updates.backupIntervalDays : current.backupIntervalDays,
      lastBackupTime: updates.lastBackupTime !== undefined ? updates.lastBackupTime : current.lastBackupTime
    };
    await fs.writeFile(
      getBackupLocationConfigPath(),
      JSON.stringify(newConfig, null, 2),
      'utf8'
    );
    return newConfig;
  } catch (err) {
    console.error('Failed to save backup config:', err);
    return { backupLocation: null, backupFormat: 'folder', backupScheduleEnabled: false, backupIntervalDays: 7, lastBackupTime: null };
  }
}

async function saveBackupLocation(dirPath) {
  return saveBackupConfig({ backupLocation: dirPath });
}

async function collectFilesForBackup(dir, baseDir = dir) {
  const fileList = [];
  async function walk(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        fileList.push({ fullPath, relativePath: 'user/' + relativePath });
      }
    }
  }
  await walk(dir);
  return fileList;
}

async function createZipBackup(sourceDir, destZipFile) {
  const files = await collectFilesForBackup(sourceDir);
  const zlib = require('zlib');
  const centralDirs = [];
  let currentOffset = 0;
  let copiedCount = 0;
  const errors = [];

  function calcCrc32(buf) {
    if (typeof zlib.crc32 === 'function') return zlib.crc32(buf);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function toDosDateTime(date) {
    const d = date || new Date();
    const year = Math.max(1980, d.getFullYear());
    const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    return { dosDate, dosTime };
  }

  const parts = [];

  for (const file of files) {
    try {
      const rawContent = await fs.readFile(file.fullPath);
      const stats = await fs.stat(file.fullPath);
      const { dosDate, dosTime } = toDosDateTime(stats.mtime);

      const uncompressedSize = rawContent.length;
      const crc = calcCrc32(rawContent);

      let deflated = zlib.deflateRawSync(rawContent);
      let compMethod = 8;
      let compData = deflated;
      let compSize = deflated.length;

      if (compSize >= uncompressedSize) {
        compMethod = 0;
        compData = rawContent;
        compSize = uncompressedSize;
      }

      const nameBuf = Buffer.from(file.relativePath, 'utf8');
      const nameLen = nameBuf.length;

      const lfh = Buffer.alloc(30 + nameLen);
      lfh.writeUInt32LE(0x04034b50, 0);
      lfh.writeUInt16LE(20, 4);
      lfh.writeUInt16LE(0x0800, 6);
      lfh.writeUInt16LE(compMethod, 8);
      lfh.writeUInt16LE(dosTime, 10);
      lfh.writeUInt16LE(dosDate, 12);
      lfh.writeUInt32LE(crc, 14);
      lfh.writeUInt32LE(compSize, 18);
      lfh.writeUInt32LE(uncompressedSize, 22);
      lfh.writeUInt16LE(nameLen, 26);
      lfh.writeUInt16LE(0, 28);
      nameBuf.copy(lfh, 30);

      const headerOffset = currentOffset;
      parts.push(lfh);
      parts.push(compData);
      currentOffset += lfh.length + compSize;

      const cdh = Buffer.alloc(46 + nameLen);
      cdh.writeUInt32LE(0x02014b50, 0);
      cdh.writeUInt16LE(20, 4);
      cdh.writeUInt16LE(20, 6);
      cdh.writeUInt16LE(0x0800, 8);
      cdh.writeUInt16LE(compMethod, 10);
      cdh.writeUInt16LE(dosTime, 12);
      cdh.writeUInt16LE(dosDate, 14);
      cdh.writeUInt32LE(crc, 16);
      cdh.writeUInt32LE(compSize, 20);
      cdh.writeUInt32LE(uncompressedSize, 24);
      cdh.writeUInt16LE(nameLen, 28);
      cdh.writeUInt16LE(0, 30);
      cdh.writeUInt16LE(0, 32);
      cdh.writeUInt16LE(0, 34);
      cdh.writeUInt16LE(0, 36);
      cdh.writeUInt32LE(0x81a40000, 38);
      cdh.writeUInt32LE(headerOffset, 42);
      nameBuf.copy(cdh, 46);

      centralDirs.push(cdh);
      copiedCount++;
    } catch (err) {
      errors.push({ filename: file.relativePath, error: String(err?.message || err) });
    }
  }

  const cdStartOffset = currentOffset;
  let cdSize = 0;
  for (const cdh of centralDirs) {
    parts.push(cdh);
    cdSize += cdh.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralDirs.length, 8);
  eocd.writeUInt16LE(centralDirs.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStartOffset, 16);
  eocd.writeUInt16LE(0, 20);
  parts.push(eocd);

  const finalZipBuffer = Buffer.concat(parts);
  await fs.mkdir(path.dirname(destZipFile), { recursive: true });
  await fs.writeFile(destZipFile, finalZipBuffer);
  return { ok: true, copied: copiedCount, errors };
}

async function createTarGzBackup(sourceDir, destTarGzFile) {
  const files = await collectFilesForBackup(sourceDir);
  const zlib = require('zlib');
  const blocks = [];
  let copiedCount = 0;
  const errors = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file.fullPath);
      const stats = await fs.stat(file.fullPath);

      const header = Buffer.alloc(512);

      let nameStr = file.relativePath;
      let prefixStr = '';
      if (Buffer.byteLength(nameStr) > 100) {
        const slashIdx = nameStr.indexOf('/', nameStr.length - 100);
        if (slashIdx > 0 && slashIdx <= 155) {
          prefixStr = nameStr.substring(0, slashIdx);
          nameStr = nameStr.substring(slashIdx + 1);
        }
      }

      header.write(nameStr, 0, Math.min(100, Buffer.byteLength(nameStr)), 'utf8');
      header.write('0000644\0', 100, 8, 'utf8');
      header.write('0000000\0', 108, 8, 'utf8');
      header.write('0000000\0', 116, 8, 'utf8');
      header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'utf8');
      const mtimeSec = Math.floor(stats.mtimeMs / 1000);
      header.write(mtimeSec.toString(8).padStart(11, '0') + '\0', 136, 12, 'utf8');
      header.write('        ', 148, 8, 'utf8');
      header.write('0', 156, 1, 'utf8');
      header.write('ustar\0', 257, 6, 'utf8');
      header.write('00', 263, 2, 'utf8');
      if (prefixStr) {
        header.write(prefixStr, 345, Math.min(155, Buffer.byteLength(prefixStr)), 'utf8');
      }

      let chksum = 0;
      for (let i = 0; i < 512; i++) {
        chksum += header[i];
      }
      header.write(chksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');

      blocks.push(header);
      blocks.push(content);

      const padLen = (512 - (content.length % 512)) % 512;
      if (padLen > 0) {
        blocks.push(Buffer.alloc(padLen));
      }

      copiedCount++;
    } catch (err) {
      errors.push({ filename: file.relativePath, error: String(err?.message || err) });
    }
  }

  blocks.push(Buffer.alloc(1024));

  const tarBuffer = Buffer.concat(blocks);
  const compressedGz = zlib.gzipSync(tarBuffer);
  await fs.mkdir(path.dirname(destTarGzFile), { recursive: true });
  await fs.writeFile(destTarGzFile, compressedGz);
  return { ok: true, copied: copiedCount, errors };
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

async function resetSyncBaseline() {
  _pendingBaselineEntries = [];
  try {
    const p = getSyncBaselinePath();
    try { await fs.unlink(p); } catch {}
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
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
    const srcDir  = path.join(writableRoot, 'user');
    const destDir = resolveSyncDestDir(syncLocation);
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
  } catch (err) {
    console.error('Auto-sync error:', err);
  } finally {
    _autoSyncRunning = false;
  }
}

function startAutoSyncWatcher() {
  stopAutoSyncWatcher();
  const writableRoot = getWritableRootDir();
  const dir = path.join(writableRoot, 'user');
  try {
    const w = fsSync.watch(dir, { recursive: true }, (_eventType, _filename) => {
      if (_autoSyncRunning) return;
      if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
      _autoSyncTimer = setTimeout(runAutoSync, 3000);
    });
    w.on('error', () => {}); // ignore watch errors silently
    _autoSyncWatcher = { close: () => { try { w.close(); } catch {} } };
  } catch {
    // Directory may not exist yet; ignore.
  }
}

// ── Remote Sync: shared folder catalogue ─────────────────────────────────────
// Each entry maps a UI checkbox id to the relative path under writableRoot/user/.
const REMOTE_SYNC_FOLDERS = [
  { id: 'config',     rel: null },               // root-level .js/.json files
  { id: 'grades',     rel: 'grades' },
  { id: 'groups',     rel: 'group-participation' },
  { id: 'mindmaps',   rel: 'mindmaps' },
  { id: 'customData', rel: 'custom-data' },
  { id: 'classPlans', rel: 'class-plans' },
  { id: 'documents',  rel: 'document-editor' },
];

// Build a list of { localPath, remoteSuffix, isDir } items for selected folder ids.
// If subfolders is empty/null the entire user dir is synced as one item.
async function collectRemoteItems(userDir, subfolders) {
  const selected = Array.isArray(subfolders) && subfolders.length > 0 ? subfolders : null;
  if (!selected) return [{ localPath: userDir, remoteSuffix: '', isDir: true }];

  const results = [];
  for (const { id, rel } of REMOTE_SYNC_FOLDERS) {
    if (!selected.includes(id)) continue;
    if (rel === null) {
      // Root-level config files
      let entries = [];
      try { entries = await fs.readdir(userDir, { withFileTypes: true }); } catch {}
      for (const e of entries) {
        if (e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.json'))) {
          results.push({ localPath: path.join(userDir, e.name), remoteSuffix: e.name, isDir: false });
        }
      }
    } else {
      const p = path.join(userDir, rel);
      try { await fs.access(p); results.push({ localPath: p, remoteSuffix: rel, isDir: true }); } catch {}
    }
  }
  return results;
}

// ── FTP Sync ──────────────────────────────────────────────────────────────────

function getFtpConfigPath() {
  return path.join(app.getPath('userData'), 'ftp-config.json');
}

async function loadFtpConfig() {
  try { return JSON.parse(await fs.readFile(getFtpConfigPath(), 'utf8')) || {}; } catch { return {}; }
}

async function saveFtpConfig(cfg) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(getFtpConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

function getFtpManifestPath() {
  return path.join(app.getPath('userData'), 'ftp-manifest.json');
}

async function loadFtpManifest() {
  try { return JSON.parse(await fs.readFile(getFtpManifestPath(), 'utf8')); } catch { return { version: 1, files: {} }; }
}

async function saveFtpManifest(manifest) {
  await fs.writeFile(getFtpManifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
}

async function hashFile(filePath) {
  const { createHash } = require('crypto');
  const buf = await fs.readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

let _ftpAutoSyncTimer = null;
let _ftpQuitSyncPending = false;

function stopFtpAutoSyncTimer() {
  if (_ftpAutoSyncTimer) { clearInterval(_ftpAutoSyncTimer); _ftpAutoSyncTimer = null; }
}

async function startFtpAutoSyncTimer() {
  stopFtpAutoSyncTimer();
  const cfg = await loadFtpConfig();
  if (!cfg.autoSync || !cfg.host) return;
  const intervalMs = Math.max(5, cfg.syncIntervalMinutes || 30) * 60 * 1000;
  _ftpAutoSyncTimer = setInterval(() => { runFtpTransfer('upload').catch(() => {}); }, intervalMs);
}

// Rename localPath → localPath.YYYY-MM-DDTHH-MM.bak before overwriting.
// Each call produces a uniquely-timestamped name so previous backups are never deleted.
async function bakIfExists(localPath) {
  try {
    await fs.access(localPath);
    const ts = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
    await fs.rename(localPath, `${localPath}.${ts}.bak`);
  } catch {}
}

function bakTimestamp() {
  return new Date().toISOString().slice(0, 16).replace(/:/g, '-');
}

async function ftpUploadDir(ftp, localDir, remotePath, remoteBase, manifest, updated) {
  await ftp.ensureDir(remotePath);
  let entries = [];
  try { entries = await fs.readdir(localDir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const lp = path.join(localDir, entry.name);
    const rp = remotePath.replace(/\/+$/, '') + '/' + entry.name;
    if (entry.isDirectory()) {
      await ftpUploadDir(ftp, lp, rp, remoteBase, manifest, updated);
    } else {
      const key = rp.slice(remoteBase.length).replace(/^\//, '');
      const hash = await hashFile(lp);
      if (manifest.files[key] === hash) continue;
      await ftp.cd(remotePath);
      await ftp.uploadFrom(lp, entry.name);
      updated.files[key] = hash;
      updated._changed = true;
    }
  }
}

async function ftpDownloadDir(ftp, remoteAbsPath, localDir, remoteBase, remoteManifest) {
  await fs.mkdir(localDir, { recursive: true });
  let items = [];
  try {
    await ftp.cd(remoteAbsPath);
    items = await ftp.list();
  } catch (e) {
    if (!String(e.message).includes('550')) throw e;
    return;
  }
  for (const item of items) {
    if (item.name === 'cmt-manifest.json') continue;
    const localPath = path.join(localDir, item.name);
    const remoteChild = remoteAbsPath.replace(/\/+$/, '') + '/' + item.name;
    if (item.isDirectory) {
      await ftpDownloadDir(ftp, remoteChild, localPath, remoteBase, remoteManifest);
      await ftp.cd(remoteAbsPath);
    } else {
      const key = remoteChild.slice(remoteBase.length).replace(/^\//, '');
      const remoteHash = remoteManifest.files[key];
      if (remoteHash) {
        try {
          const localHash = await hashFile(localPath);
          if (localHash === remoteHash) continue;
        } catch {} // file doesn't exist locally — download it
      }
      await ftp.cd(remoteAbsPath);
      await ftp.downloadTo(localPath, item.name);
    }
  }
}

async function runFtpTransfer(direction) {
  const cfg = await loadFtpConfig();
  if (!cfg.host) return { ok: false, error: 'No FTP host configured.' };
  const { Client } = require('basic-ftp');
  const ftp = new Client(60000);
  try {
    await ftp.access({
      host: cfg.host,
      port: cfg.port || 21,
      user: cfg.user || '',
      password: cfg.password || '',
      secure: cfg.secure === true,
    });
    const userDir = path.join(getWritableRootDir(), 'user');
    const remoteBase = ((cfg.remotePath || '/').replace(/\\/g, '/').replace(/\/+$/, '') || '/');
    const items = await collectRemoteItems(userDir, cfg.subfolders);

    if (direction === 'upload') {
      const manifest = await loadFtpManifest();
      const updated = { version: 1, files: { ...manifest.files }, _changed: false };

      for (const item of items) {
        const remoteDest = item.remoteSuffix
          ? (remoteBase + '/' + item.remoteSuffix).replace(/\/+/g, '/')
          : remoteBase;
        if (item.isDir) {
          await ftpUploadDir(ftp, item.localPath, remoteDest, remoteBase, manifest, updated);
        } else {
          const key = item.remoteSuffix;
          const hash = await hashFile(item.localPath);
          if (manifest.files[key] === hash) continue;
          const remoteDir = remoteDest.substring(0, remoteDest.lastIndexOf('/')) || '/';
          await ftp.ensureDir(remoteDir);
          await ftp.cd(remoteDir);
          await ftp.uploadFrom(item.localPath, path.basename(remoteDest));
          updated.files[key] = hash;
          updated._changed = true;
        }
      }

      if (updated._changed) {
        delete updated._changed;
        const { Readable } = require('stream');
        await ftp.cd(remoteBase);
        await ftp.uploadFrom(Readable.from([JSON.stringify(updated, null, 2)]), 'cmt-manifest.json');
        await saveFtpManifest(updated);
      }
    } else {
      let remoteManifest = { version: 1, files: {} };
      try {
        const { Writable } = require('stream');
        const chunks = [];
        const ws = new Writable({ write(c, _, cb) { chunks.push(c); cb(); } });
        await ftp.cd(remoteBase);
        await ftp.downloadTo(ws, 'cmt-manifest.json');
        remoteManifest = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {}

      for (const item of items) {
        const remoteDest = item.remoteSuffix
          ? (remoteBase + '/' + item.remoteSuffix).replace(/\/+/g, '/')
          : remoteBase;
        if (item.isDir) {
          await ftpDownloadDir(ftp, remoteDest, item.localPath, remoteBase, remoteManifest);
        } else {
          const key = item.remoteSuffix;
          const remoteHash = remoteManifest.files[key];
          if (remoteHash) {
            try {
              const localHash = await hashFile(item.localPath);
              if (localHash === remoteHash) continue;
            } catch {}
          }
          const remoteDir = remoteDest.substring(0, remoteDest.lastIndexOf('/')) || '/';
          try {
            await ftp.cd(remoteDir);
            await ftp.downloadTo(item.localPath, item.remoteSuffix);
          } catch (e) {
            if (!String(e.message).includes('550')) throw e;
          }
        }
      }
      await saveFtpManifest(remoteManifest);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    ftp.close();
  }
}

// ── Google Drive Sync ─────────────────────────────────────────────────────────

function getDriveConfigPath() {
  return path.join(app.getPath('userData'), 'drive-config.json');
}

async function loadDriveConfig() {
  try { return JSON.parse(await fs.readFile(getDriveConfigPath(), 'utf8')) || {}; } catch { return {}; }
}

async function saveDriveConfig(cfg) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(getDriveConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

function buildOAuth2Client(clientId, clientSecret, redirectPort) {
  const { auth } = require('@googleapis/drive');
  return new auth.OAuth2(clientId, clientSecret, `http://localhost:${redirectPort}`);
}

async function startDriveOAuthFlow(cfg) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const oauth2 = buildOAuth2Client(cfg.clientId, cfg.clientSecret, port);
      const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent',
      });

      let authWin = new BrowserWindow({
        width: 620, height: 720,
        title: 'Connect to Google Drive',
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      let handled = false;

      server.on('request', async (req, res) => {
        if (handled) return;
        const urlObj = new URL(req.url, `http://localhost:${port}`);
        const code = urlObj.searchParams.get('code');
        const oauthError = urlObj.searchParams.get('error');
        const msg = oauthError ? 'Authorization cancelled.' : 'Authorization successful! You can close this window.';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>${msg}</h2></body></html>`);
        setTimeout(() => { try { authWin && authWin.close(); } catch {} }, 1600);
        server.close();
        handled = true;

        if (oauthError || !code) { reject(new Error(oauthError || 'No authorization code received')); return; }

        try {
          const { tokens } = await oauth2.getToken(code);
          oauth2.setCredentials(tokens);
          let email = '';
          try {
            const info = await oauth2.request({ url: 'https://www.googleapis.com/oauth2/v2/userinfo' });
            email = (info.data && info.data.email) || '';
          } catch {}
          const updated = { ...cfg, tokens, userEmail: email };
          await saveDriveConfig(updated);
          resolve({ ok: true, email });
        } catch (err) { reject(err); }
      });

      server.on('error', (err) => { if (!handled) reject(err); });
      authWin.on('closed', () => {
        authWin = null;
        if (!handled) { handled = true; server.close(); reject(new Error('Window closed by user')); }
      });
      authWin.loadURL(authUrl);
    });
  });
}

async function getDriveApiClient(cfg) {
  if (!cfg.tokens) throw new Error('Not connected to Google Drive.');
  const { drive } = require('@googleapis/drive');
  const oauth2 = buildOAuth2Client(cfg.clientId, cfg.clientSecret, 0);
  oauth2.setCredentials(cfg.tokens);
  oauth2.on('tokens', async (newTokens) => {
    const latest = await loadDriveConfig();
    await saveDriveConfig({ ...latest, tokens: { ...latest.tokens, ...newTokens } }).catch(() => {});
  });
  return drive({ version: 'v3', auth: oauth2 });
}

async function driveEnsureFolder(drive, name, parentId) {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
            (parentId ? ` and '${parentId}' in parents` : '');
  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const f = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) },
    fields: 'id',
  });
  return f.data.id;
}

async function driveUpsertFile(drive, localPath, name, parentId) {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
  });
  const media = { mimeType: 'application/octet-stream', body: fsSync.createReadStream(localPath) };
  if (res.data.files.length > 0) {
    const existingId = res.data.files[0].id;
    // Try to rename the old copy to a timestamped .bak; fall back to update-in-place if it fails.
    let renamed = false;
    try {
      await drive.files.update({ fileId: existingId, requestBody: { name: `${name}.${bakTimestamp()}.bak` } });
      renamed = true;
    } catch {}
    if (renamed) {
      await drive.files.create({ requestBody: { name, parents: [parentId] }, media, fields: 'id' });
    } else {
      await drive.files.update({ fileId: existingId, media });
    }
  } else {
    await drive.files.create({ requestBody: { name, parents: [parentId] }, media, fields: 'id' });
  }
}

async function driveUploadDir(drive, localDir, parentId) {
  let entries = [];
  try { entries = await fs.readdir(localDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fullPath = path.join(localDir, e.name);
    if (e.isDirectory()) {
      const subId = await driveEnsureFolder(drive, e.name, parentId);
      await driveUploadDir(drive, fullPath, subId);
    } else {
      await driveUpsertFile(drive, fullPath, e.name, parentId);
    }
  }
}

async function driveDownloadDir(drive, driveFolderId, localDir) {
  await fs.mkdir(localDir, { recursive: true });
  const res = await drive.files.list({
    q: `'${driveFolderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType)',
    pageSize: 1000,
  });
  for (const file of res.data.files) {
    const localPath = path.join(localDir, file.name);
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      await driveDownloadDir(drive, file.id, localPath);
    } else {
      await bakIfExists(localPath);
      const dest = fsSync.createWriteStream(localPath);
      const dl = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'stream' });
      await new Promise((resolve, reject) => { dl.data.pipe(dest); dest.on('finish', resolve); dest.on('error', reject); });
    }
  }
}

async function runDriveTransfer(direction) {
  const cfg = await loadDriveConfig();
  if (!cfg.tokens) return { ok: false, error: 'Not connected to Google Drive.' };
  try {
    const drive = await getDriveApiClient(cfg);
    const folderName = cfg.driveFolderName || 'Class Management Tools';
    const rootId = await driveEnsureFolder(drive, folderName, null);
    const userFolderId = await driveEnsureFolder(drive, 'user', rootId);
    const userDir = path.join(getWritableRootDir(), 'user');
    const items = await collectRemoteItems(userDir, cfg.subfolders);

    for (const item of items) {
      if (direction === 'upload') {
        if (item.isDir) {
          const subId = await driveEnsureFolder(drive, item.remoteSuffix || 'data', userFolderId);
          await driveUploadDir(drive, item.localPath, subId);
        } else {
          await driveUpsertFile(drive, item.localPath, item.remoteSuffix, userFolderId);
        }
      } else {
        if (item.isDir) {
          const res = await drive.files.list({
            q: `name='${item.remoteSuffix}' and '${userFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id)',
          });
          if (res.data.files.length > 0) {
            await driveDownloadDir(drive, res.data.files[0].id, path.join(userDir, item.remoteSuffix));
          }
        } else {
          const res = await drive.files.list({
            q: `name='${item.remoteSuffix}' and '${userFolderId}' in parents and trashed=false`,
            fields: 'files(id)',
          });
          if (res.data.files.length > 0) {
            const localFilePath = path.join(userDir, item.remoteSuffix);
            await bakIfExists(localFilePath);
            const dest = fsSync.createWriteStream(localFilePath);
            const dl = await drive.files.get({ fileId: res.data.files[0].id, alt: 'media' }, { responseType: 'stream' });
            await new Promise((resolve, reject) => { dl.data.pipe(dest); dest.on('finish', resolve); dest.on('error', reject); });
          }
        }
      }
    }
    await saveDriveConfig({ ...cfg, driveFolderId: rootId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── WebDAV Sync ───────────────────────────────────────────────────────────────

function getWebdavConfigPath() {
  return path.join(app.getPath('userData'), 'webdav-config.json');
}

async function loadWebdavConfig() {
  try { return JSON.parse(await fs.readFile(getWebdavConfigPath(), 'utf8')) || {}; } catch { return {}; }
}

async function saveWebdavConfig(cfg) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(getWebdavConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

let _webdavAutoSyncTimer = null;

function stopWebdavAutoSyncTimer() {
  if (_webdavAutoSyncTimer) { clearInterval(_webdavAutoSyncTimer); _webdavAutoSyncTimer = null; }
}

async function startWebdavAutoSyncTimer() {
  stopWebdavAutoSyncTimer();
  const cfg = await loadWebdavConfig();
  if (!cfg.autoSync || !cfg.serverUrl) return;
  const intervalMs = Math.max(5, cfg.syncIntervalMinutes || 30) * 60 * 1000;
  _webdavAutoSyncTimer = setInterval(() => { runWebdavTransfer('upload').catch(() => {}); }, intervalMs);
}

async function webdavEnsureDir(client, remotePath) {
  const parts = remotePath.replace(/\/+$/, '').split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try { if (!await client.exists(current)) await client.createDirectory(current); } catch {}
  }
}

async function webdavBakRemote(client, remotePath) {
  try {
    await client.moveFile(remotePath, `${remotePath}.${bakTimestamp()}.bak`);
  } catch {}
}

async function webdavUploadDir(client, localDir, remotePath) {
  await webdavEnsureDir(client, remotePath);
  let entries = [];
  try { entries = await fs.readdir(localDir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const lp = path.join(localDir, entry.name);
    const rp = remotePath.replace(/\/+$/, '') + '/' + entry.name;
    if (entry.isDirectory()) {
      await webdavUploadDir(client, lp, rp);
    } else {
      await webdavBakRemote(client, rp);
      const content = await fs.readFile(lp);
      await client.putFileContents(rp, content, { overwrite: true });
    }
  }
}

async function webdavDownloadDir(client, remotePath, localDir) {
  await fs.mkdir(localDir, { recursive: true });
  let items = [];
  try { items = await client.getDirectoryContents(remotePath); } catch { return; }
  for (const item of items) {
    const lp = path.join(localDir, item.basename);
    if (item.type === 'directory') {
      await webdavDownloadDir(client, item.filename, lp);
    } else {
      await bakIfExists(lp);
      const content = await client.getFileContents(item.filename);
      await fs.writeFile(lp, Buffer.isBuffer(content) ? content : Buffer.from(content));
    }
  }
}

async function runWebdavTransfer(direction) {
  const cfg = await loadWebdavConfig();
  if (!cfg.serverUrl) return { ok: false, error: 'No server URL configured.' };
  try {
    const { createClient } = require('webdav');
    const client = createClient(cfg.serverUrl, {
      username: cfg.username || '',
      password: cfg.password || '',
    });
    const userDir = path.join(getWritableRootDir(), 'user');
    const remoteBase = (cfg.remotePath || '/classtools').replace(/\/+$/, '') || '/classtools';
    const items = await collectRemoteItems(userDir, cfg.subfolders);

    for (const item of items) {
      const remoteDest = item.remoteSuffix
        ? (remoteBase + '/' + item.remoteSuffix).replace(/\/+/g, '/')
        : remoteBase;
      if (direction === 'upload') {
        if (item.isDir) {
          await webdavUploadDir(client, item.localPath, remoteDest);
        } else {
          const remoteDir = remoteDest.substring(0, remoteDest.lastIndexOf('/')) || '/';
          await webdavEnsureDir(client, remoteDir);
          await webdavBakRemote(client, remoteDest);
          const content = await fs.readFile(item.localPath);
          await client.putFileContents(remoteDest, content, { overwrite: true });
        }
      } else {
        if (item.isDir) {
          await webdavDownloadDir(client, remoteDest, item.localPath);
        } else {
          try {
            await bakIfExists(item.localPath);
            const content = await client.getFileContents(remoteDest);
            await fs.writeFile(item.localPath, Buffer.isBuffer(content) ? content : Buffer.from(content));
          } catch (e) {
            if (!String(e.message).includes('404') && !String(e.message).includes('Not Found')) throw e;
          }
        }
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Resolve the effective destination directory for sync.
// The user picks a sync folder that should directly mirror writableRoot/user/.
// For backward compat, if syncLocation/user/ already has content, use that
// (old installs that synced to a parent folder).
function resolveSyncDestDir(syncLocation) {
  const nestedUserPath = path.join(syncLocation, 'user');
  try {
    const entries = fsSync.readdirSync(nestedUserPath).filter(e => e !== 'sync-baseline.json');
    if (entries.length > 0) return nestedUserPath;
  } catch {}
  return syncLocation;
}

// mode: 'to-target' | 'to-source' | 'both'
// source = writableRoot/user, dest = resolved sync destination
// baseline: { map: Map<string,{mtimeMs,size}>, prefix: string } | null
//   map keys are relative paths within srcDir; prefix is prepended (empty = no prefix).
async function syncTrees(srcDir, destDir, mode, { autoNew = true, baseline = null, mtimeTolMs = 0 } = {}) {
  let copied = 0;
  const errors = [];
  const conflicts = [];
  const added = [];
  const newFiles = [];
  const synced = []; // files auto-resolved via baseline; entries: { relativePath, mtimeMs, size }

  function sameFile(a, b) {
    const diff = Math.abs(a.mtimeMs - b.mtimeMs);
    if (diff < 1000) return true;
    if (isTzOnlyDiff(a, b)) return true;
    return mtimeTolMs > 0 && diff <= mtimeTolMs && a.size === b.size;
  }

  function changedVsBase(entry, base) {
    if (entry.size !== base.size) return true;
    const diff = Math.abs(entry.mtimeMs - base.mtimeMs);
    return diff >= 1000 && (mtimeTolMs === 0 || diff > mtimeTolMs);
  }

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

  const deleted = [];

  async function deleteAndPrune(targetDir, relativePath) {
    const fullPath = path.join(targetDir, relativePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    let dir = path.dirname(fullPath);
    const resolvedTarget = path.resolve(targetDir);
    while (dir.startsWith(resolvedTarget) && dir !== resolvedTarget) {
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
          dir = path.dirname(dir);
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  }

  if (mode === 'mirror-to-target') {
    // 1. Copy / update from src (user/) to dest (sync target)
    for (const [rel, srcEntry] of srcFiles) {
      const destEntry = destFiles.get(rel);
      if (!destEntry || !sameFile(srcEntry, destEntry)) {
        try {
          await copyOne(srcEntry.fullPath, path.join(destDir, rel));
          const stat = await fs.stat(path.join(destDir, rel));
          copied++;
          synced.push({ relativePath: rel, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch (err) {
          errors.push({ path: rel, error: String(err?.message || err) });
        }
      } else {
        synced.push({ relativePath: rel, mtimeMs: destEntry.mtimeMs, size: destEntry.size });
      }
    }
    // 2. Delete any files in dest that do not exist in src
    for (const [rel, destEntry] of destFiles) {
      if (!srcFiles.has(rel)) {
        try {
          await deleteAndPrune(destDir, rel);
          deleted.push(rel);
        } catch (err) {
          errors.push({ path: rel, error: String(err?.message || err) });
        }
      }
    }
  } else if (mode === 'mirror-to-source') {
    // 1. Copy / update from dest (sync target) to src (user/)
    for (const [rel, destEntry] of destFiles) {
      const srcEntry = srcFiles.get(rel);
      if (!srcEntry || !sameFile(srcEntry, destEntry)) {
        try {
          await copyOne(destEntry.fullPath, path.join(srcDir, rel));
          const stat = await fs.stat(path.join(srcDir, rel));
          copied++;
          synced.push({ relativePath: rel, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch (err) {
          errors.push({ path: rel, error: String(err?.message || err) });
        }
      } else {
        synced.push({ relativePath: rel, mtimeMs: srcEntry.mtimeMs, size: srcEntry.size });
      }
    }
    // 2. Delete any files in src that do not exist in dest
    for (const [rel, srcEntry] of srcFiles) {
      if (!destFiles.has(rel)) {
        try {
          await deleteAndPrune(srcDir, rel);
          deleted.push(rel);
        } catch (err) {
          errors.push({ path: rel, error: String(err?.message || err) });
        }
      }
    }
  } else if (mode === 'to-target') {
    for (const [rel, srcEntry] of srcFiles) {
      const destEntry = destFiles.get(rel);
      if (!destEntry) {
        if (autoNew) {
          // new file on source side → copy to dest automatically
          try { await copyOne(srcEntry.fullPath, path.join(destDir, rel)); copied++; added.push(rel); }
          catch (err) { errors.push({ path: rel, error: String(err?.message || err) }); }
        } else {
          newFiles.push({ relativePath: rel, kind: 'new', side: 'src-only', changeType: 'new', srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs, destSize: null, destMtimeMs: null });
        }
      } else if (!sameFile(srcEntry, destEntry)) {
        conflicts.push({
          relativePath: rel,
          kind: 'conflict',
          sideChanged: 'src',
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
          newFiles.push({ relativePath: rel, kind: 'new', side: 'dest-only', changeType: 'new', srcSize: null, srcMtimeMs: null, destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs });
        }
      } else if (!sameFile(srcEntry, destEntry)) {
        conflicts.push({
          relativePath: rel,
          kind: 'conflict',
          sideChanged: 'dest',
          srcSize: srcEntry.size, srcMtimeMs: srcEntry.mtimeMs,
          destSize: destEntry.size, destMtimeMs: destEntry.mtimeMs
        });
      }
    }
  } else {
    // both: 2-way sync with comprehensive diff detection (additions, deletions, modifications, conflicts)
    const allRels = new Set([...srcFiles.keys(), ...destFiles.keys()]);
    // Also clean up obsolete baseline entries where file was deleted on BOTH sides
    if (baseline && baseline.map) {
      for (const [baseKey] of baseline.map) {
        const rel = baseline.prefix && baseKey.startsWith(baseline.prefix + '/')
          ? baseKey.slice(baseline.prefix.length + 1)
          : baseKey;
        if (!srcFiles.has(rel) && !destFiles.has(rel)) {
          baseline.map.delete(baseKey);
        }
      }
    }

    for (const rel of allRels) {
      const srcEntry  = srcFiles.get(rel);
      const destEntry = destFiles.get(rel);
      const baseKey   = baseline ? (baseline.prefix ? baseline.prefix + '/' + rel : rel) : null;
      const base      = (baseline && baseKey) ? baseline.map.get(baseKey) : null;

      try {
        if (srcEntry && !destEntry) {
          if (autoNew) {
            await copyOne(srcEntry.fullPath, path.join(destDir, rel)); copied++; added.push(rel);
          } else {
            if (base) {
              const srcChanged = changedVsBase(srcEntry, base);
              if (!srcChanged) {
                // File in baseline and unchanged on src, but missing on dest → Deleted on dest (Sync)
                newFiles.push({
                  relativePath: rel,
                  kind: 'deleted-dest',
                  side: 'src-only',
                  changeType: 'deleted-dest',
                  srcSize: srcEntry.size,
                  srcMtimeMs: srcEntry.mtimeMs,
                  destSize: null,
                  destMtimeMs: null,
                  baseSize: base.size,
                  baseMtimeMs: base.mtimeMs
                });
              } else {
                // File modified on src, but deleted on dest → Delete vs Modify conflict
                conflicts.push({
                  relativePath: rel,
                  kind: 'conflict-delete-dest',
                  side: 'src-only',
                  changeType: 'conflict-delete-dest',
                  sideChanged: 'both',
                  srcSize: srcEntry.size,
                  srcMtimeMs: srcEntry.mtimeMs,
                  destSize: null,
                  destMtimeMs: null
                });
              }
            } else {
              // No baseline → Brand new file added on App
              newFiles.push({
                relativePath: rel,
                kind: 'new',
                side: 'src-only',
                changeType: 'new',
                srcSize: srcEntry.size,
                srcMtimeMs: srcEntry.mtimeMs,
                destSize: null,
                destMtimeMs: null
              });
            }
          }
        } else if (!srcEntry && destEntry) {
          if (autoNew) {
            await copyOne(destEntry.fullPath, path.join(srcDir, rel)); copied++; added.push(rel);
          } else {
            if (base) {
              const destChanged = changedVsBase(destEntry, base);
              if (!destChanged) {
                // File in baseline and unchanged on dest, but missing on src → Deleted on src (App)
                newFiles.push({
                  relativePath: rel,
                  kind: 'deleted-src',
                  side: 'dest-only',
                  changeType: 'deleted-src',
                  srcSize: null,
                  srcMtimeMs: null,
                  destSize: destEntry.size,
                  destMtimeMs: destEntry.mtimeMs,
                  baseSize: base.size,
                  baseMtimeMs: base.mtimeMs
                });
              } else {
                // File modified on dest, but deleted on src → Delete vs Modify conflict
                conflicts.push({
                  relativePath: rel,
                  kind: 'conflict-delete-src',
                  side: 'dest-only',
                  changeType: 'conflict-delete-src',
                  sideChanged: 'both',
                  srcSize: null,
                  srcMtimeMs: null,
                  destSize: destEntry.size,
                  destMtimeMs: destEntry.mtimeMs
                });
              }
            } else {
              // No baseline → Brand new file added on Sync
              newFiles.push({
                relativePath: rel,
                kind: 'new',
                side: 'dest-only',
                changeType: 'new',
                srcSize: null,
                srcMtimeMs: null,
                destSize: destEntry.size,
                destMtimeMs: destEntry.mtimeMs
              });
            }
          }
        } else if (srcEntry && destEntry) {
          if (sameFile(srcEntry, destEntry)) continue;

          if (base) {
            const srcChanged  = changedVsBase(srcEntry,  base);
            const destChanged = changedVsBase(destEntry, base);

            if (!srcChanged && !destChanged) {
              // Platform rounding artefact — files are effectively identical
              continue;
            }

            const sideChanged = (srcChanged && destChanged) ? 'both' : (srcChanged ? 'src' : 'dest');
            const kind = (srcChanged && destChanged) ? 'conflict' : (srcChanged ? 'modified-src' : 'modified-dest');

            conflicts.push({
              relativePath: rel,
              kind: kind,
              sideChanged: sideChanged,
              srcSize: srcEntry.size,
              srcMtimeMs: srcEntry.mtimeMs,
              destSize: destEntry.size,
              destMtimeMs: destEntry.mtimeMs
            });
          } else {
            // No baseline record: treat differing file as conflict
            conflicts.push({
              relativePath: rel,
              kind: 'conflict',
              sideChanged: 'both',
              srcSize: srcEntry.size,
              srcMtimeMs: srcEntry.mtimeMs,
              destSize: destEntry.size,
              destMtimeMs: destEntry.mtimeMs
            });
          }
        }
      } catch (err) {
        errors.push({ path: rel, error: String(err?.message || err) });
      }
    }
  }
  return { copied, errors, conflicts, added, newFiles, synced, deleted };
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
  // Restore previously chosen data folder across launches.
  await loadSavedPortableRoot();

  if (!app.isPackaged) {
    return;
  }

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
  // entries: Array<{ name: string, data: Buffer, mtimeMs?: number, store?: boolean, compressionMethod?: number }>
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const isStore = entry.store === true || entry.compressionMethod === 0;
    const method = isStore ? 0 : 8;
    const compressed = isStore ? entry.data : zlib.deflateRawSync(entry.data, { level: 1 });
    const crc = crc32(entry.data);
    const { dosTime, dosDate } = msToDosDateTime(entry.mtimeMs);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
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
    central.writeUInt16LE(method, 10);
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

// ── Board Archive (.cstz) IPC Handlers ────────────────────────────────
ipcMain.handle('app:save-board-archive', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const target = request.target || 'mindmaps';
  const rawFilename = request.filename || request.name || 'board.cstz';
  const filename = sanitizeFilename(rawFilename);
  const { targetDir } = resolveAllowedTargetPath(pageFile, target, request.subdir ? path.join(request.subdir, filename) : filename);

  const rawEntries = Array.isArray(request.entries) ? request.entries : [];
  const zipEntries = [];

  for (const entry of rawEntries) {
    if (!entry || !entry.name) continue;
    const name = String(entry.name).replace(/\\/g, '/');
    let data;
    if (Buffer.isBuffer(entry.data)) {
      data = entry.data;
    } else if (entry.encoding === 'base64') {
      data = Buffer.from(String(entry.data || ''), 'base64');
    } else {
      data = Buffer.from(String(entry.data || ''), 'utf8');
    }
    const store = entry.store !== false && entry.compressionMethod !== 8;
    zipEntries.push({
      name,
      data,
      store,
      compressionMethod: store ? 0 : 8,
      mtimeMs: entry.mtimeMs || Date.now()
    });
  }

  const zipBuffer = buildZip(zipEntries);
  const finalDir = request.subdir ? path.resolve(targetDir, sanitizeRelativePath(request.subdir)) : targetDir;
  await fs.mkdir(finalDir, { recursive: true });
  const finalPath = path.join(finalDir, filename);
  const tmpPath = finalPath + '.tmp';

  try {
    await fs.writeFile(tmpPath, zipBuffer);
    try {
      await fs.rename(tmpPath, finalPath);
    } catch (renameErr) {
      if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST') {
        await fs.unlink(finalPath).catch(() => {});
        await fs.rename(tmpPath, finalPath);
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }

  _broadcastDataChanged(event, pageFile, {
    action: 'save-file',
    filename,
    target,
    subdir: request.subdir || null
  });

  return { ok: true, filename, path: finalPath, size: zipBuffer.length };
});

ipcMain.handle('app:read-board-archive', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const target = request.target || 'mindmaps';
  const relativePath = request.relativePath || request.filename || '';
  const { fullPath } = resolveAllowedTargetPath(pageFile, target, relativePath);

  try {
    const zipBuffer = await fs.readFile(fullPath);
    const parsedEntries = parseZipEntries(zipBuffer);

    let manifest = null;
    let boardData = null;
    const history = [];
    const media = {};
    const thumbnails = {};

    for (const entry of parsedEntries) {
      const normName = normalizeZipEntryPath(entry.name) || entry.name;
      if (normName === 'manifest.json') {
        try { manifest = JSON.parse(entry.data.toString('utf8')); } catch {}
      } else if (normName === 'board.json') {
        try { boardData = JSON.parse(entry.data.toString('utf8')); } catch {}
      } else if (normName.startsWith('history/') && normName.endsWith('.json')) {
        try {
          history.push({
            name: normName.slice('history/'.length),
            data: JSON.parse(entry.data.toString('utf8')),
            mtimeMs: entry.mtimeMs
          });
        } catch {}
      } else if (normName.startsWith('page-snapshots/') || normName.startsWith('thumbnails/') || normName === 'thumbnail.png') {
        const base64 = entry.data.toString('base64');
        const dataUrl = 'data:image/png;base64,' + base64;
        thumbnails[normName] = dataUrl;
        const fileName = normName.split('/').pop();
        const mediaEntry = {
          name: fileName,
          kind: 'pics',
          subPath: normName,
          base64: base64,
          size: entry.data.length,
          mtimeMs: entry.mtimeMs
        };
        media[normName] = mediaEntry;
      } else if (normName.startsWith('media/') || /^(pdf|pics|images|sounds|sound|videos|video)\//i.test(normName)) {
        const mediaSubPath = normName.startsWith('media/') ? normName.slice('media/'.length) : normName;
        const parts = mediaSubPath.split('/');
        const rawKind = parts[0].toLowerCase();
        const kind = rawKind === 'images' ? 'pics' : (rawKind === 'sound' ? 'sounds' : (rawKind === 'video' ? 'videos' : rawKind));
        const fileName = parts.slice(1).join('/');
        const mediaEntry = {
          name: fileName,
          kind: kind,
          subPath: mediaSubPath,
          base64: entry.data.toString('base64'),
          size: entry.data.length,
          mtimeMs: entry.mtimeMs
        };
        media[mediaSubPath] = mediaEntry;
        media['media/' + mediaSubPath] = mediaEntry;
        media[kind + '/' + fileName] = mediaEntry;
        media[fileName] = mediaEntry;
        media[fileName.toLowerCase()] = mediaEntry;
      }
    }

    if (manifest && boardData) {
      if (!boardData._createdAt && (manifest.createdAt || manifest._createdAt)) {
        boardData._createdAt = Number(manifest.createdAt || manifest._createdAt);
      }
      if (!boardData._savedAt && (manifest.updatedAt || manifest.savedAt || manifest._savedAt)) {
        boardData._savedAt = Number(manifest.updatedAt || manifest.savedAt || manifest._savedAt);
      }
      if (!boardData.dateCreated && manifest.dateCreated) {
        boardData.dateCreated = manifest.dateCreated;
      }
    }

    return {
      ok: true,
      filename: path.basename(fullPath),
      manifest,
      boardData,
      history,
      media,
      thumbnails,
      size: zipBuffer.length
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle('app:inspect-board-archive', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const target = request.target || 'mindmaps';
  const relativePath = request.relativePath || request.filename || '';
  const { fullPath } = resolveAllowedTargetPath(pageFile, target, relativePath);

  try {
    const zipBuffer = await fs.readFile(fullPath);
    const parsedEntries = parseZipEntries(zipBuffer);

    let manifest = null;
    let boardDataSummary = null;
    let thumbnail = null;

    for (const entry of parsedEntries) {
      const normName = normalizeZipEntryPath(entry.name) || entry.name;
      if (normName === 'manifest.json') {
        try { manifest = JSON.parse(entry.data.toString('utf8')); } catch {}
      } else if (normName === 'board.json') {
        try {
          const parsed = JSON.parse(entry.data.toString('utf8'));
          boardDataSummary = {
            title: parsed.title,
            _type: parsed._type,
            classGroup: parsed._classGroup || parsed.classGroup || '',
            _classGroup: parsed._classGroup || parsed.classGroup || '',
            _plannerEntryId: parsed._plannerEntryId || (parsed.manifest && parsed.manifest.plannerEntryId),
            plannerEntryId: parsed._plannerEntryId || (parsed.manifest && parsed.manifest.plannerEntryId),
            pageCount: Array.isArray(parsed.pages) ? parsed.pages.length : 1
          };
        } catch {}
      } else if (!thumbnail && (normName === 'page-snapshots/page-001.png' || normName === 'thumbnail.png' || normName.startsWith('page-snapshots/'))) {
        thumbnail = 'data:image/png;base64,' + entry.data.toString('base64');
      }
    }

    if (manifest && !manifest.classGroup && boardDataSummary && boardDataSummary.classGroup) {
      manifest.classGroup = boardDataSummary.classGroup;
    }

    const stat = await fs.stat(fullPath);
    const createdAt = Number(manifest && (manifest.createdAt || manifest._createdAt))
      || Number(boardDataSummary && (boardDataSummary._createdAt || boardDataSummary.createdAt))
      || ((boardDataSummary && boardDataSummary.dateCreated) ? Date.parse(String(boardDataSummary.dateCreated).replace(/_\d+$/, '')) : 0)
      || ((manifest && manifest.dateCreated) ? Date.parse(String(manifest.dateCreated).replace(/_\d+$/, '')) : 0)
      || 0;
    const savedAt = Number(manifest && (manifest.updatedAt || manifest.savedAt || manifest._savedAt))
      || Number(boardDataSummary && (boardDataSummary._savedAt || boardDataSummary.savedAt))
      || stat.mtimeMs;

    return {
      ok: true,
      filename: path.basename(fullPath),
      relativePath,
      manifest: manifest || boardDataSummary,
      thumbnail: thumbnail || (manifest && manifest.thumbnail) || null,
      classGroup: (manifest && manifest.classGroup) || (boardDataSummary && boardDataSummary.classGroup) || '',
      plannerEntryId: (manifest && manifest.plannerEntryId) || (boardDataSummary && boardDataSummary._plannerEntryId) || '',
      createdAt: createdAt || undefined,
      savedAt: savedAt || stat.mtimeMs,
      mtimeMs: stat.mtimeMs,
      size: stat.size
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
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

async function normalizeAndAdoptDataLocation(selectedPath) {
  let effectivePath = path.resolve(selectedPath);
  let wasNormalized = false;
  let adoptedLooseFiles = false;

  const keyMarkers = [
    'class-groups.js',
    'config.js',
    'students.js',
    'planner-config.js',
    'board-config.js',
    'ui-prefs.json',
    'remote-config.js',
    'roles.js',
    'sync-baseline.json',
    'board-sessions-backup.json',
    'grades',
    'planner',
    'custom-data',
    'constellations',
    'doceditor',
    'document-editor',
    'group-participation',
    'class-plans',
    'mindmaps',
    'game-results',
    'to-print'
  ];

  // 1. Check if user selected the "user" folder directly
  const basename = path.basename(effectivePath).toLowerCase();
  if (basename === 'user') {
    let hasUserFiles = false;
    for (const marker of keyMarkers) {
      if (fsSync.existsSync(path.join(effectivePath, marker))) {
        hasUserFiles = true;
        break;
      }
    }
    if (hasUserFiles) {
      effectivePath = path.dirname(effectivePath);
      wasNormalized = true;
    }
  }

  // 2. Check if the effectivePath contains loose user data files in its root
  const userSubdir = path.join(effectivePath, 'user');
  let looseMarkers = [];
  for (const marker of keyMarkers) {
    const loosePath = path.join(effectivePath, marker);
    if (fsSync.existsSync(loosePath)) {
      looseMarkers.push(marker);
    }
  }

  if (looseMarkers.length > 0) {
    await fs.mkdir(userSubdir, { recursive: true });
    for (const marker of looseMarkers) {
      const src = path.join(effectivePath, marker);
      const dest = path.join(userSubdir, marker);
      if (!fsSync.existsSync(dest)) {
        try {
          await fs.rename(src, dest);
          adoptedLooseFiles = true;
        } catch {
          try {
            const stat = await fs.stat(src);
            if (stat.isDirectory()) {
              await copyTreeForBackup(src, dest);
              await fs.rm(src, { recursive: true, force: true });
            } else {
              await fs.copyFile(src, dest);
              await fs.unlink(src);
            }
            adoptedLooseFiles = true;
          } catch {}
        }
      }
    }
  }

  return {
    effectivePath,
    wasNormalized,
    adoptedLooseFiles
  };
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

  const { effectivePath, wasNormalized, adoptedLooseFiles } = await normalizeAndAdoptDataLocation(selected);

  process.env.PORTABLE_ROOT = effectivePath;
  await savePortableRoot(effectivePath);

  try {
    await ensureWritableSeedData();
  } catch (error) {
    return {
      ok: false,
      canceled: false,
      error: `Could not initialize app data folders in: ${effectivePath}`,
      details: String(error?.message || error)
    };
  }

  reloadOtherWindows(event.sender);

  // If auto-sync is active, restart the watcher on the new data root.
  loadAutoSyncEnabled().then(enabled => { if (enabled) startAutoSyncWatcher(); }).catch(() => {});

  return {
    ok: true,
    canceled: false,
    selected: effectivePath,
    wasNormalized,
    adoptedLooseFiles,
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

ipcMain.handle('app:close-window', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (senderWin && !senderWin.isDestroyed()) {
    senderWin.close();
  }
  return { ok: true };
});

ipcMain.handle('app:open-tool', async (event, request = {}) => {
  const pageFile = typeof request === 'string' ? request : (request.pageFile || '');
  const knownPages = new Set(Object.values(PAGE_FILES));
  if (!pageFile || !knownPages.has(pageFile)) {
    return { ok: false, error: `Unknown page: ${pageFile}` };
  }
  const query = request && typeof request.query === 'object' ? request.query : null;

  const winSizeRatio = Number(request.windowSizeRatio) || 0;
  const winPosition  = typeof request.windowPosition === 'string' ? request.windowPosition : '';
  const hasCustomSize = winSizeRatio >= 0.1 && winSizeRatio <= 1.0;
  const hasCustomPos  = !!(winPosition && winPosition !== 'default');

  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const senderBounds = senderWin && !senderWin.isDestroyed() ? senderWin.getBounds() : null;
  const targetDisplay = senderBounds
    ? (screen.getDisplayMatching(senderBounds) || screen.getPrimaryDisplay())
    : screen.getPrimaryDisplay();

  let targetBounds = null;
  if (!request.sideBySide && !request.maximize && !request.openOnSecondScreen && (hasCustomSize || hasCustomPos)) {
    const wa = targetDisplay.workArea;

    let vW = hasCustomSize ? Math.max(400, Math.round(wa.width  * winSizeRatio)) : Math.min(1600, wa.width);
    let vH = hasCustomSize ? Math.max(300, Math.round(wa.height * winSizeRatio)) : Math.min(1000, wa.height);
    if (winPosition === 'left' || winPosition === 'right') {
      vH = wa.height;
    }

    let vX = wa.x + Math.round((wa.width  - vW) / 2);
    let vY = wa.y + Math.round((wa.height - vH) / 2);

    if (hasCustomPos) {
      switch (winPosition) {
        case 'center':       vX = wa.x + Math.round((wa.width  - vW) / 2); vY = wa.y + Math.round((wa.height - vH) / 2); break;
        case 'top-left':     vX = wa.x;                                   vY = wa.y; break;
        case 'top-right':    vX = wa.x + wa.width - vW;                   vY = wa.y; break;
        case 'bottom-left':  vX = wa.x;                                   vY = wa.y + wa.height - vH; break;
        case 'bottom-right': vX = wa.x + wa.width - vW;                   vY = wa.y + wa.height - vH; break;
        case 'left':         vX = wa.x;                                   vY = wa.y; break;
        case 'right':        vX = wa.x + wa.width - vW;                   vY = wa.y; break;
      }
    }

    targetBounds = { x: vX, y: vY, width: vW, height: vH };
  }

  const isLearningToolsPresentation =
    pageFile === PAGE_FILES.learningTools
    && query
    && (String(query.wwPresentation || '') === '1' || String(query.ltPresentation || '') === '1');

  // If an existing window for this page is already open (and no side-by-side, second screen, or presentation query)
  if (!isLearningToolsPresentation && !request.sideBySide && !request.openOnSecondScreen && !request.maximize) {
    const existing = BrowserWindow.getAllWindows().find(
      w => !w.isDestroyed() && getLoadedPageFile(w) === pageFile
    );
    if (existing) {
      if (query && !request.noReload) {
        loadTool(pageFile, existing, { query }).catch((err) => {
          console.error(`Failed to navigate ${pageFile}:`, err);
        });
      }
      if (targetBounds) {
        _applySafeBounds(existing, targetBounds);
      }
      if (existing.isMinimized()) existing.restore();
      existing.focus();
      return { ok: true, windowId: existing.id };
    }
  }

  const toolOptions = query ? { query } : {};
  if (targetBounds) {
    toolOptions.width  = targetBounds.width;
    toolOptions.height = targetBounds.height;
    toolOptions.x      = targetBounds.x;
    toolOptions.y      = targetBounds.y;
  }

  const toolWin = createToolWindow(pageFile, toolOptions);

  if (isLearningToolsPresentation) {
    learningToolsPresentationWindow = toolWin;
    learningToolsPresentationSourceWindow = senderWin || null;
    toolWin.once('closed', () => {
      if (learningToolsPresentationWindow === toolWin) learningToolsPresentationWindow = null;
      if (learningToolsPresentationSourceWindow === senderWin) learningToolsPresentationSourceWindow = null;
    });
  }

  const wantsSecondary = !!(
    request.openOnSecondScreen
    || (
      pageFile === PAGE_FILES.learningTools
      && query
      && (String(query.wwPresentation || '') === '1' || String(query.ltPresentation || '') === '1')
    )
  );

  if (wantsSecondary) {
    const extendedDisplay = getExtendedDisplayForBounds(senderBounds);
    if (extendedDisplay) {
      const sourceDisplay = senderBounds
        ? (screen.getDisplayMatching(senderBounds) || screen.getPrimaryDisplay())
        : screen.getPrimaryDisplay();
      const mappedBounds = mapWindowBoundsToDisplay(senderBounds, sourceDisplay, extendedDisplay);
      if (mappedBounds) {
        toolWin.setBounds(mappedBounds);
      }
    }
  } else if (targetBounds && !toolWin.isDestroyed()) {
    _applySafeBounds(toolWin, targetBounds);
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

function _normalizeDataChangedPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function _isCrossAppDataChange(payload = {}) {
  const target = payload.target;
  const filename = payload.filename;
  const subdir = _normalizeDataChangedPath(payload.subdir);
  const relativePath = _normalizeDataChangedPath(payload.relativePath);
  const oldRelativePath = _normalizeDataChangedPath(payload.oldRelativePath);
  const newRelativePath = _normalizeDataChangedPath(payload.newRelativePath);

  if (target === 'docEditorDocs' || target === 'mindmaps') return true;

  if (target === 'user') {
    if (['class-groups.js', 'config.js', 'planner-config.js', 'todos.js'].includes(filename)) return true;
    if (subdir === 'planner' || relativePath.startsWith('planner/') || oldRelativePath.startsWith('planner/') || newRelativePath.startsWith('planner/')) return true;
    if (subdir === 'custom-data' || subdir.startsWith('custom-data/') || relativePath.startsWith('custom-data/') || oldRelativePath.startsWith('custom-data/') || newRelativePath.startsWith('custom-data/')) return true;
  }

  if (target === 'classPlans' && filename === 'plans.js') return true;
  if (target === 'classPlans' && (relativePath === 'plans.js' || oldRelativePath === 'plans.js' || newRelativePath === 'plans.js')) return true;

  return false;
}

function _broadcastDataChanged(event, pageFile, payload = {}) {
  if (!_isCrossAppDataChange(payload)) return;
  const sourceTitle = PAGE_LABELS[pageFile] || pageFile;
  const mergedPayload = Object.assign({}, payload, { sourceTitle });
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents !== event.sender) {
      win.webContents.send('app:data-changed', mergedPayload);
    }
  }
}

ipcMain.handle('app:save-file', async (event, request) => {
  const pageFile = getRequestingPage(event);
  const savedFile = await writeAllowedFile(pageFile, request.target, request);
  if (request && (request.filename === 'planner-entries.js' || request.subdir === 'planner')) {
    _loadPlannerEntries();
  }
  if (request) {
    _broadcastDataChanged(event, pageFile, {
      action: 'save-file',
      filename: request.filename,
      target: request.target,
      subdir: request.subdir || null
    });
  }
  return { ok: true, file: savedFile };
});

ipcMain.handle('app:save-files', async (event, request) => {
  const pageFile = getRequestingPage(event);
  const files = Array.isArray(request.files) ? request.files : [];
  const savedFiles = [];

  for (const file of files) {
    savedFiles.push(await writeAllowedFile(pageFile, request.target, file));
  }

  _broadcastDataChanged(event, pageFile, {
    action: 'save-files',
    target: request.target,
    fileCount: files.length
  });

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
  try {
    const pageFile = getRequestingPage(event);
    const file = await readAllowedPathFile(
      pageFile,
      request.target,
      request.relativePath,
      request.encoding
    );
    return { ok: true, file, content: file.content, encoding: file.encoding };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
});

ipcMain.handle('app:fetch-url', async (event, request = {}) => {
  const targetUrl = String(request.url || '').trim();
  if (!targetUrl) return { ok: false, error: 'Empty URL' };

  let clean = targetUrl;
  if (clean.startsWith('webcal://')) clean = 'https://' + clean.slice(9);

  return new Promise((resolve) => {
    function doFetch(curUrl, redirectCount = 0) {
      if (redirectCount > 5) {
        return resolve({ ok: false, error: 'Too many redirects' });
      }
      try {
        const urlObj = new URL(curUrl);
        const client = urlObj.protocol === 'https:' ? require('https') : require('http');
        const req = client.get(curUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClassManagementSuite/1.0',
            'Accept': 'text/calendar, text/plain, */*'
          },
          timeout: 20000
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, curUrl).toString();
            return doFetch(nextUrl, redirectCount + 1);
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return resolve({ ok: false, status: res.statusCode, error: `HTTP ${res.statusCode} ${res.statusMessage || ''}` });
          }
          let data = '';
          res.setEncoding('utf8');
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => { resolve({ ok: true, content: data, status: res.statusCode }); });
        });

        req.on('error', (err) => {
          resolve({ ok: false, error: err.message });
        });
        req.on('timeout', () => {
          req.destroy();
          resolve({ ok: false, error: 'Request timed out' });
        });
      } catch (err) {
        resolve({ ok: false, error: err.message });
      }
    }

    doFetch(clean, 0);
  });
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
        var ph=document.getElementById('popup-timer-hours') || document.getElementById('overlay-timer-hours');
        var pm=document.getElementById('popup-timer-minutes') || document.getElementById('overlay-timer-minutes');
        var pb=document.getElementById('overlay-playpause-btn');
        var mode = typeof timerMode !== 'undefined' ? timerMode : 'timer';
        var txt = d ? d.textContent : '';
        if (!txt || txt === '--:--') {
          if (mode === 'stopwatch') {
            txt = '00:00';
          } else {
            var h = ph ? (parseInt(ph.value) || 0) : 0;
            var m = pm ? (parseInt(pm.value) || 5) : 5;
            txt = h > 0 
              ? (String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00')
              : (String(m).padStart(2, '0') + ':00');
          }
        }
        return {
          text: txt,
          cls:  d ? d.className  : '',
          running: !!(typeof timerInterval !== 'undefined' && timerInterval || typeof stopwatchInterval !== 'undefined' && stopwatchInterval),
          paused:  !!(pb && pb.classList.contains('paused')),
          canAdj:  !!(typeof timerInterval !== 'undefined' && timerInterval || typeof timerPaused !== 'undefined' && timerPaused),
          mode: mode,
          barWidth: bar ? bar.style.width : '100%',
          h: ph ? (parseInt(ph.value) || 0) : 0,
          m: pm ? (parseInt(pm.value) || 5) : 5
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
let mirrorWindowSource = null;
let cmsPresentationWindow = null;
let cmsPresentationSourceWindow = null;
let learningToolsPresentationWindow = null;
let learningToolsPresentationSourceWindow = null;

function getExtendedDisplayForBounds(bounds) {
  const allDisplays = screen.getAllDisplays();
  if (!Array.isArray(allDisplays) || allDisplays.length < 2) return null;

  const sourceDisplay = bounds
    ? screen.getDisplayMatching(bounds)
    : screen.getPrimaryDisplay();

  return allDisplays.find((d) => d.id !== sourceDisplay.id) || null;
}

function getPresenterTargetDisplay(targetWindow, sourceWindow) {
  const allDisplays = screen.getAllDisplays();
  if (!Array.isArray(allDisplays) || allDisplays.length <= 1) {
    return screen.getPrimaryDisplay();
  }

  // 1. If we have a source window (the teacher's main controller window), target the display that is NOT the source display
  if (sourceWindow && !sourceWindow.isDestroyed()) {
    const sBounds = sourceWindow.getBounds();
    const sourceDisplay = screen.getDisplayMatching(sBounds) || screen.getPrimaryDisplay();
    const secondDisplay = allDisplays.find(d => d.id !== sourceDisplay.id);
    if (secondDisplay) return secondDisplay;
  }

  // 2. If targetWindow is already located on a secondary (non-primary) display, keep it on that display
  const primaryDisplay = screen.getPrimaryDisplay();
  if (targetWindow && !targetWindow.isDestroyed()) {
    const tBounds = targetWindow.getBounds();
    const currentDisplay = screen.getDisplayMatching(tBounds);
    if (currentDisplay && currentDisplay.id !== primaryDisplay.id) {
      return currentDisplay;
    }
  }

  // 3. Fallback: find any display that is not the primary display
  const secondDisplay = allDisplays.find(d => d.id !== primaryDisplay.id);
  return secondDisplay || primaryDisplay;
}

function maximizePresenterWindow(targetWindow, sourceWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) return false;
  if (targetWindow.isFullScreen()) {
    targetWindow.setFullScreen(false);
  }
  if (targetWindow.isMaximized()) {
    targetWindow.unmaximize();
    return true;
  }
  const targetDisplay = getPresenterTargetDisplay(targetWindow, sourceWindow);
  if (targetDisplay) {
    const wa = targetDisplay.workArea;
    targetWindow.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
  }
  targetWindow.maximize();
  return true;
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

function syncTargetWindowToSource(targetWindow, sourceWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) return false;
  const sourceBounds = sourceWindow && !sourceWindow.isDestroyed() ? sourceWindow.getBounds() : null;
  if (!sourceBounds) return false;
  if (targetWindow.isFullScreen()) targetWindow.setFullScreen(false);
  if (targetWindow.isMaximized()) targetWindow.unmaximize();
  const targetDisplay = getPresenterTargetDisplay(targetWindow, sourceWindow);
  const sourceDisplay = screen.getDisplayMatching(sourceBounds) || screen.getPrimaryDisplay();
  const mappedBounds = mapWindowBoundsToDisplay(sourceBounds, sourceDisplay, targetDisplay);
  if (mappedBounds) {
    targetWindow.setBounds(mappedBounds);
  } else {
    const targetBounds = targetWindow.getBounds();
    targetWindow.setBounds({
      x: targetBounds.x,
      y: targetBounds.y,
      width: sourceBounds.width,
      height: sourceBounds.height
    });
  }
  return true;
}

function dockTargetWindow(targetWindow, edge, ratio = 0.2, sourceWindow = null) {
  if (!targetWindow || targetWindow.isDestroyed()) return false;
  if (targetWindow.isFullScreen()) targetWindow.setFullScreen(false);
  if (targetWindow.isMaximized()) targetWindow.unmaximize();
  const display = getPresenterTargetDisplay(targetWindow, sourceWindow);
  const wa = display.workArea;
  const width = Math.max(260, Math.round(wa.width * ratio));
  const bounds = { y: wa.y, width, height: wa.height };
  bounds.x = edge === 'left' ? wa.x : wa.x + wa.width - width;
  targetWindow.setBounds(bounds);
  return true;
}

ipcMain.handle('app:has-second-display', async () => {
  return screen.getAllDisplays().length > 1;
});

ipcMain.handle('app:open-mirror-window', async (event, request = {}) => {
  if (mirrorWindow && !mirrorWindow.isDestroyed()) {
    mirrorWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const sBounds   = senderWin ? senderWin.getBounds() : null;
  mirrorWindowSource = senderWin || null;

  // Detect second screen relative to sender window
  const secondDisplay = getExtendedDisplayForBounds(sBounds);
  const primaryDisplay = screen.getPrimaryDisplay();

  let winOpts;
  if (secondDisplay) {
    // Mirror the same relative position and size ratio from the main window's display onto the second display
    const srcDisplay = sBounds
      ? (screen.getDisplayMatching(sBounds) || primaryDisplay)
      : primaryDisplay;
    const mappedBounds = mapWindowBoundsToDisplay(sBounds, srcDisplay, secondDisplay)
      || { x: secondDisplay.workArea.x, y: secondDisplay.workArea.y, width: 1200, height: 800 };

    winOpts = {
      x: mappedBounds.x, y: mappedBounds.y, width: mappedBounds.width, height: mappedBounds.height,
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
  setupWindowExternalLinkHandling(mirrorWindow);
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
    await mirrorWindow.loadFile(getToolPath(PAGE_FILES.board), { query: { mirror: '1' } });
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
    case 'resize-window':
      syncTargetWindowToSource(mirrorWindow, mirrorWindowSource);
      break;
    case 'dock-left':
      dockTargetWindow(mirrorWindow, 'left', 0.2, mirrorWindowSource);
      break;
    case 'dock-right':
      dockTargetWindow(mirrorWindow, 'right', 0.2, mirrorWindowSource);
      break;
    case 'maximise':
    case 'maximize':
      maximizePresenterWindow(mirrorWindow, mirrorWindowSource);
      break;
    default:
      return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

ipcMain.handle('app:open-cms-presentation', async (event, request = {}) => {
  if (cmsPresentationWindow && !cmsPresentationWindow.isDestroyed()) {
    cmsPresentationWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const sBounds   = senderWin ? senderWin.getBounds() : null;
  cmsPresentationSourceWindow = senderWin || null;

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
  setupWindowExternalLinkHandling(cmsPresentationWindow);
  cmsPresentationWindow.on('closed', () => { cmsPresentationWindow = null; });

  try {
    await cmsPresentationWindow.loadFile(
      getToolPath(PAGE_FILES.classManagement),
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
    case 'resize-window': syncTargetWindowToSource(cmsPresentationWindow, cmsPresentationSourceWindow); break;
    case 'maximize':
    case 'maximise':   maximizePresenterWindow(cmsPresentationWindow, cmsPresentationSourceWindow); break;
    case 'minimize':   cmsPresentationWindow.minimize(); break;
    case 'dock-left':  dockTargetWindow(cmsPresentationWindow, 'left', 0.2, cmsPresentationSourceWindow); break;
    case 'dock-right': dockTargetWindow(cmsPresentationWindow, 'right', 0.2, cmsPresentationSourceWindow); break;
    default: return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

ipcMain.handle('app:learning-tools-presentation-command', (event, command) => {
  if (!learningToolsPresentationWindow || learningToolsPresentationWindow.isDestroyed()) {
    return { ok: false, reason: 'not-open' };
  }
  switch (command) {
    case 'close':
      learningToolsPresentationWindow.close();
      break;
    case 'fullscreen':
      learningToolsPresentationWindow.setFullScreen(!learningToolsPresentationWindow.isFullScreen());
      break;
    case 'resize-window':
      syncTargetWindowToSource(learningToolsPresentationWindow, learningToolsPresentationSourceWindow);
      break;
    case 'dock-left':
      dockTargetWindow(learningToolsPresentationWindow, 'left', 0.2, learningToolsPresentationSourceWindow);
      break;
    case 'dock-right':
      dockTargetWindow(learningToolsPresentationWindow, 'right', 0.2, learningToolsPresentationSourceWindow);
      break;
    case 'maximize':
    case 'maximise':
      maximizePresenterWindow(learningToolsPresentationWindow, learningToolsPresentationSourceWindow);
      break;
    default:
      return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

// ── Oral Marking Presenter Window ─────────────────────────────────────────────
let oralPresenterWindow = null;
let oralPresenterSourceWindow = null;
ipcMain.handle('app:open-oral-presenter', async (event, request = {}) => {
  if (oralPresenterWindow && !oralPresenterWindow.isDestroyed()) {
    oralPresenterWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  oralPresenterSourceWindow = senderWin || null;
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
      autoHideMenuBar: true, title: 'Oral Marking – Presenter',
      webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false }
    };
  } else {
    const width  = sBounds ? sBounds.width  : 1200;
    const height = sBounds ? sBounds.height : 800;
    winOpts = {
      width, height, autoHideMenuBar: true, title: 'Oral Marking – Presenter',
      webPreferences: { preload: path.join(ROOT_DIR, 'electron-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false }
    };
    if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
  }
  oralPresenterWindow = new BrowserWindow(winOpts);
  setupWindowExternalLinkHandling(oralPresenterWindow);
  oralPresenterWindow.on('closed', () => { oralPresenterWindow = null; });
  try {
    await oralPresenterWindow.loadFile(getToolPath(PAGE_FILES.oralMarking), { query: { presentation: '1' } });
  } catch (err) {
    console.error('app:open-oral-presenter load failed', err);
    return { ok: false, error: String(err) };
  }
  return { ok: true };
});

ipcMain.handle('app:oral-presenter-open', () => {
  return !!(oralPresenterWindow && !oralPresenterWindow.isDestroyed());
});

ipcMain.handle('app:oral-presenter-command', (event, command) => {
  if (!oralPresenterWindow || oralPresenterWindow.isDestroyed()) return { ok: false, reason: 'not-open' };
  switch (command) {
    case 'close':      oralPresenterWindow.close(); break;
    case 'fullscreen': oralPresenterWindow.setFullScreen(!oralPresenterWindow.isFullScreen()); break;
    case 'maximize':
    case 'maximise':   maximizePresenterWindow(oralPresenterWindow, oralPresenterSourceWindow); break;
    case 'minimize':   oralPresenterWindow.minimize(); break;
    default: return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

// ── Document Editor Presentation Window ────────────────────────────────────────
let docPresentationWindow = null;
let docPresentationSourceWindow = null;
ipcMain.handle('app:open-doc-presentation', async (event, request = {}) => {
  if (docPresentationWindow && !docPresentationWindow.isDestroyed()) {
    docPresentationWindow.focus();
    return { ok: true, alreadyOpen: true };
  }
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  docPresentationSourceWindow = senderWin || null;
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
      title: 'Document Editor – Presentation',
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
      title: 'Document Editor – Presentation',
      webPreferences: {
        preload: path.join(ROOT_DIR, 'electron-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };
    if (sBounds) { winOpts.x = sBounds.x + sBounds.width + 10; winOpts.y = sBounds.y; }
  }

  docPresentationWindow = new BrowserWindow(winOpts);
  setupWindowExternalLinkHandling(docPresentationWindow);
  docPresentationWindow.on('closed', () => { docPresentationWindow = null; });

  try {
    await docPresentationWindow.loadFile(
      getToolPath(PAGE_FILES.documentEditor),
      { query: { presentation: '1' } }
    );
  } catch (err) {
    console.error('app:open-doc-presentation load failed', err);
    return { ok: false, error: String(err) };
  }
  return { ok: true };
});

ipcMain.handle('app:doc-presentation-open', () => {
  return !!(docPresentationWindow && !docPresentationWindow.isDestroyed());
});

ipcMain.handle('app:doc-presentation-command', (event, command) => {
  if (!docPresentationWindow || docPresentationWindow.isDestroyed()) return { ok: false, reason: 'not-open' };
  switch (command) {
    case 'close':         docPresentationWindow.close(); break;
    case 'fullscreen':    docPresentationWindow.setFullScreen(!docPresentationWindow.isFullScreen()); break;
    case 'maximize':
    case 'maximise':      maximizePresenterWindow(docPresentationWindow, docPresentationSourceWindow); break;
    case 'resize-window': syncTargetWindowToSource(docPresentationWindow, docPresentationSourceWindow); break;
    case 'dock-left':     dockTargetWindow(docPresentationWindow, 'left', 0.2, docPresentationSourceWindow); break;
    case 'dock-right':    dockTargetWindow(docPresentationWindow, 'right', 0.2, docPresentationSourceWindow); break;
    default: return { ok: false, reason: 'unknown-command' };
  }
  return { ok: true };
});

ipcMain.handle('app:print-html', async (event, request = {}) => {
  const html = typeof request === 'string' ? request : String((request && request.html) || '');
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
  const pageFile = getRequestingPage(event);
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

    const reqOpts = (request.pdfOptions && typeof request.pdfOptions === 'object') ? { ...request.pdfOptions } : {};
    if (typeof reqOpts.marginsType !== 'number' && reqOpts.margins && typeof reqOpts.margins === 'object') {
      const mt = String(reqOpts.margins.marginType || '').toLowerCase();
      if (mt === 'none') reqOpts.marginsType = 1;
      else if (mt === 'minimum') reqOpts.marginsType = 2;
      else if (mt === 'custom') reqOpts.marginsType = 3;
      else if (mt === 'default') reqOpts.marginsType = 0;
      delete reqOpts.margins;
    }
    const pdfOptions = Object.assign(
      { landscape: false, pageSize: 'A4', marginsType: 1, preferCSSPageSize: true },
      reqOpts,
      { printBackground: true }
    );
    const pdfBuffer = await win.webContents.printToPDF(pdfOptions);

    // Ask user where to save
    const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,'-');
    const defaultName = (typeof request.defaultName === 'string' && request.defaultName.trim())
      ? request.defaultName.trim()
      : `results-${dateStr}.pdf`;

    if (typeof request.absolutePath === 'string' && request.absolutePath.trim()) {
      const absolutePath = path.resolve(request.absolutePath.trim());
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, pdfBuffer);
      try { win.close(); } catch {}
      return { ok: true, path: absolutePath, name: path.basename(absolutePath) };
    }

    if (request.target) {
      const savedFile = await writeAllowedFile(pageFile, request.target, {
        filename: typeof request.filename === 'string' && request.filename.trim()
          ? request.filename.trim()
          : defaultName,
        subdir: request.subdir ? String(request.subdir) : null,
        content: pdfBuffer.toString('base64'),
        encoding: 'base64'
      });
      try { win.close(); } catch {}
      return { ok: true, path: savedFile.path, name: savedFile.filename };
    }

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

ipcMain.handle('app:create-directory-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const created = await createAllowedPathDirectory(
    pageFile,
    request.target,
    request.relativePath
  );
  _broadcastDataChanged(event, pageFile, {
    action: 'create-directory-by-path',
    target: request.target,
    relativePath: request.relativePath
  });
  return { ok: true, created };
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
  _broadcastDataChanged(event, pageFile, {
    action: 'rename-file',
    target: request.target,
    filename: newName,
    oldFilename: oldName,
    newFilename: newName
  });
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
  _broadcastDataChanged(event, pageFile, {
    action: 'rename-by-path',
    target: request.target,
    oldRelativePath: request.oldRelativePath,
    newRelativePath: request.newRelativePath,
    relativePath: request.newRelativePath
  });
  return { ok: true, renamed };
});

ipcMain.handle('app:stat-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  return statAllowedPathEntry(pageFile, request.target, request.relativePath);
});

ipcMain.handle('app:copy-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const result = await copyAllowedPathEntry(pageFile, request);
  _broadcastDataChanged(event, pageFile, {
    action: 'copy-by-path',
    target: request.destinationTarget || request.target,
    relativePath: request.destinationRelativePath,
    sourceTarget: request.sourceTarget,
    sourceRelativePath: request.sourceRelativePath
  });
  return result;
});

ipcMain.handle('app:move-by-path', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const result = await moveAllowedPathEntry(pageFile, request);
  _broadcastDataChanged(event, pageFile, {
    action: 'move-by-path',
    target: request.destinationTarget || request.target,
    oldRelativePath: request.sourceRelativePath,
    newRelativePath: request.destinationRelativePath,
    relativePath: request.destinationRelativePath,
    sourceTarget: request.sourceTarget
  });
  return result;
});

// ── UUID helpers for class migration ────────────────────────────────────────
function generateClassUuid() {
  return 'ge-' + require('crypto').randomBytes(4).toString('hex');
}
function isClassUuid(key) {
  return /^ge-[0-9a-f]{8}$/.test(key);
}
function sanitizeGroupName(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .trim() || '_class';
}

ipcMain.handle('app:migrate-class-uuids', async () => {
  const targets = getSaveTargets();
  const userDir = targets.user;
  const gpDir = targets.groupParticipation;
  const classPlansDir = targets.classPlans;
  const gradesDir = targets.grades;

  // 1. Read class-groups.js
  const cgPath = path.join(userDir, 'class-groups.js');
  if (!fsSync.existsSync(cgPath)) return { ok: true, migrated: false, reason: 'no-file' };

  let cgContent;
  try { cgContent = await fs.readFile(cgPath, 'utf8'); }
  catch (e) { return { ok: false, error: 'read: ' + e.message }; }

  let cgData;
  try {
    const fn = new Function(cgContent + '\nreturn typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : null;');
    cgData = fn();
  } catch (e) { return { ok: false, error: 'parse: ' + e.message }; }

  if (!cgData || !cgData.classGroups) return { ok: true, migrated: false, reason: 'empty' };

  // 2. Check if already migrated
  const allKeys = Object.keys(cgData.classGroups);
  if (allKeys.length > 0 && allKeys.every(k => isClassUuid(k)))
    return { ok: true, migrated: false, reason: 'already-done' };

  // 3. Build nameToUuid map
  const nameToUuid = {};
  for (const key of allKeys)
    nameToUuid[key] = isClassUuid(key) ? key : generateClassUuid();

  // 4. Rewrite class-groups.js with UUID keys + name field in meta
  const newGroups = {}, newMeta = {};
  for (const [name, students] of Object.entries(cgData.classGroups)) {
    const uuid = nameToUuid[name];
    newGroups[uuid] = students;
    const oldM = (cgData.classGroupsMeta || {})[name] || {};
    newMeta[uuid] = Object.assign({}, oldM, { name: String(name) });
  }
  const groupLines = Object.keys(newGroups).map(u =>
    `    ${JSON.stringify(u)}: [${(newGroups[u] || []).map(s => JSON.stringify(s)).join(', ')}]`);
  const metaLines = Object.keys(newMeta).map(u =>
    `    ${JSON.stringify(u)}: ${JSON.stringify(newMeta[u])}`);
  const newCgContent = [
    'const CLASS_GROUPS_DATA = {',
    `  "activeYear": ${JSON.stringify(cgData.activeYear || '')},`,
    `  "activeSemester": ${JSON.stringify(cgData.activeSemester || null)},`,
    `  "activeSemesterStart": ${JSON.stringify(cgData.activeSemesterStart || '')},`,
    `  "activeSemesterEnd": ${JSON.stringify(cgData.activeSemesterEnd || '')},`,
    '  "classGroups": {',
    groupLines.join(',\n').split('\n').map(l => '  ' + l).join('\n'),
    '  },',
    '  "classGroupsMeta": {',
    metaLines.join(',\n').split('\n').map(l => '  ' + l).join('\n'),
    '  }',
    '};',
    '',
    'var CLASS_GROUPS = CLASS_GROUPS_DATA.classGroups || {};',
    'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};',
    ''
  ].join('\n');
  try { await fs.writeFile(cgPath, newCgContent, 'utf8'); }
  catch (e) { return { ok: false, error: 'write-cg: ' + e.message }; }

  // 5. Migrate planner-config.js (cfg.classes keys)
  const plannerCfgPath = path.join(userDir, 'planner-config.js');
  if (fsSync.existsSync(plannerCfgPath)) {
    try {
      const cfgContent = await fs.readFile(plannerCfgPath, 'utf8');
      const fn = new Function('window', cfgContent + '\nreturn window.PLANNER_CONFIG || null;');
      const cfg = fn({ PLANNER_CONFIG: null });
      if (cfg && cfg.classes) {
        const newClasses = {};
        for (const [name, data] of Object.entries(cfg.classes))
          newClasses[nameToUuid[name] || name] = data;
        cfg.classes = newClasses;
        await fs.writeFile(plannerCfgPath, 'window.PLANNER_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n', 'utf8');
      }
    } catch (e) { console.warn('migrate planner-config:', e.message); }
  }

  // 6. Migrate planner entry files (user/planner/{name}.js → {uuid}.js)
  const plannerDir = path.join(userDir, 'planner');
  if (fsSync.existsSync(plannerDir)) {
    for (const [name, uuid] of Object.entries(nameToUuid)) {
      if (name === uuid) continue;
      const oldFile = path.join(plannerDir, name + '.js');
      if (!fsSync.existsSync(oldFile)) continue;
      try {
        const entryContent = await fs.readFile(oldFile, 'utf8');
        const sandbox = { PLANNER_ENTRIES_BY_CLASS: {} };
        const fn = new Function('window', entryContent);
        fn(sandbox);
        const entries = (sandbox.PLANNER_ENTRIES_BY_CLASS || {})[name] || [];
        const updated = entries.map(e => e.classId === name ? Object.assign({}, e, { classId: uuid }) : e);
        const newContent =
          'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
          'window.PLANNER_ENTRIES_BY_CLASS[' + JSON.stringify(uuid) + '] = ' +
          JSON.stringify(updated, null, 2) + ';\n';
        await fs.writeFile(path.join(plannerDir, uuid + '.js'), newContent, 'utf8');
        await fs.unlink(oldFile);
      } catch (e) { console.warn('migrate planner entry "' + name + '":', e.message); }
    }
  }

  // 7. Migrate class-plan data (classPlans/plans.js group keys)
  if (fsSync.existsSync(classPlansDir)) {
    const classPlansFile = path.join(classPlansDir, 'plans.js');
    if (fsSync.existsSync(classPlansFile)) {
      try {
        const plansContent = await fs.readFile(classPlansFile, 'utf8');
        const fn = new Function(plansContent + '\nreturn { plans: (typeof SAVED_CLASS_PLANS !== "undefined" ? SAVED_CLASS_PLANS : null), layouts: (typeof SAVED_CLASSROOM_LAYOUTS !== "undefined" ? SAVED_CLASSROOM_LAYOUTS : null) };');
        const result = fn();
        const plans = result.plans;
        const layouts = result.layouts;
        if (plans && typeof plans === 'object') {
          const newPlans = {};
          for (const [name, arr] of Object.entries(plans))
            newPlans[nameToUuid[name] || name] = arr;
          let out = 'var SAVED_CLASS_PLANS = ' + JSON.stringify(newPlans, null, 2) + ';';
          if (layouts) {
            out += '\nvar SAVED_CLASSROOM_LAYOUTS = ' + JSON.stringify(layouts, null, 2) + ';';
          }
          await fs.writeFile(classPlansFile, out, 'utf8');
        }
      } catch (e) { console.warn('migrate class-plan plans.js:', e.message); }
    }
  }

  // 8. Migrate participation session files (update groups keys + rename folders)
  if (fsSync.existsSync(gpDir)) {
    const safeToUuid = {};
    for (const [name, uuid] of Object.entries(nameToUuid))
      safeToUuid[sanitizeGroupName(name)] = uuid;

    async function migratePtFolder(folderPath, folderName) {
      let files;
      try { files = await fs.readdir(folderPath); } catch { return; }
      for (const file of files) {
        if (!file.endsWith('.js')) continue;
        const filePath = path.join(folderPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const sandbox = { window: {} };
          new Function('window', content)(sandbox.window);
          let sessions = sandbox.window.CMS_DB_EXPORT || sandbox.window.DB_EXPORT;
          if (!Array.isArray(sessions)) continue;
          let changed = false;
          sessions = sessions.map(session => {
            if (!session || !session.groups) return session;
            const ng = {};
            let sc = false;
            for (const [k, v] of Object.entries(session.groups)) {
              const mu = nameToUuid[k];
              if (mu && mu !== k) { ng[mu] = v; sc = true; }
              else ng[k] = v;
            }
            if (sc) { changed = true; return Object.assign({}, session, { groups: ng }); }
            return session;
          });
          if (changed) {
            await fs.writeFile(filePath,
              'window.CMS_DB_EXPORT = ' + JSON.stringify(sessions, null, 2) + ';\nwindow.DB_EXPORT = window.CMS_DB_EXPORT;\n',
              'utf8');
          }
        } catch (e) { console.warn('migrate pt file ' + filePath + ':', e.message); }
      }
      const targetUuid = safeToUuid[folderName];
      if (targetUuid && folderName !== targetUuid) {
        const newPath = path.join(path.dirname(folderPath), targetUuid);
        try { await fs.rename(folderPath, newPath); }
        catch (e) { console.warn('migrate pt rename ' + folderName + ':', e.message); }
      }
    }

    let gpEntries = [];
    try { gpEntries = await fs.readdir(gpDir, { withFileTypes: true }); } catch {}
    for (const entry of gpEntries) {
      if (entry.isDirectory() && entry.name !== 'archived')
        await migratePtFolder(path.join(gpDir, entry.name), entry.name);
    }
    const archivedDir = path.join(gpDir, 'archived');
    if (fsSync.existsSync(archivedDir)) {
      let archEntries = [];
      try { archEntries = await fs.readdir(archivedDir, { withFileTypes: true }); } catch {}
      for (const entry of archEntries) {
        if (entry.isDirectory())
          await migratePtFolder(path.join(archivedDir, entry.name), entry.name);
      }
    }
  }

  // 9. Add groupId to grade _class.js files
  if (fsSync.existsSync(gradesDir)) {
    async function migrateGradeDir(dir) {
      let entries = [];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.isDirectory()) { await migrateGradeDir(path.join(dir, entry.name)); continue; }
        if (entry.name !== '_class.js') continue;
        const filePath = path.join(dir, entry.name);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const sandbox = { window: {} };
          new Function('window', content)(sandbox.window);
          const cls = sandbox.window.GRADE_CLASS;
          if (!cls || cls.groupId) continue;
          const gid = nameToUuid[cls.className];
          if (!gid) continue;
          cls.groupId = gid;
          await fs.writeFile(filePath,
            '// _savedAt: ' + (cls._savedAt || Date.now()) + '\nwindow.GRADE_CLASS = ' + JSON.stringify(cls, null, 2) + ';\n',
            'utf8');
        } catch (e) { console.warn('migrate grade _class ' + filePath + ':', e.message); }
      }
    }
    await migrateGradeDir(gradesDir);
  }

  return { ok: true, migrated: true, uuidMap: nameToUuid };
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

  _broadcastDataChanged(event, pageFile, {
    action: 'delete-file',
    target: request.target,
    filename,
    deleteCompanionFolder: companionFolderDeleted
  });

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
  _broadcastDataChanged(event, pageFile, {
    action: 'delete-by-path',
    target: request.target,
    relativePath: request.relativePath
  });
  return { ok: true, deleted };
});

ipcMain.handle('app:pick-folder', async (_event, request = {}) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: String(request.title || 'Choose destination folder'),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: String(request.buttonLabel || 'Select folder')
  });
  if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
  return { ok: true, canceled: false, folderPath: path.resolve(filePaths[0]) };
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

ipcMain.handle('app:zip-and-delete-archived', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const target = request.target || 'mindmaps';
  const targetDir = resolveAllowedTargetDir(pageFile, target);
  const destSubdir = sanitizeRelativePath(request.subdir || 'archived');
  const archivedDir = path.resolve(targetDir, destSubdir);

  const rawZipFilename = request.zipFilename || `archived-${new Date().toISOString().slice(0, 10)}.zip`;
  let zipFilename = sanitizeFilename(rawZipFilename);
  if (!zipFilename.toLowerCase().endsWith('.zip')) {
    zipFilename += '.zip';
  }

  const items = Array.isArray(request.items) ? request.items : [];
  if (!items.length) {
    return { ok: false, error: 'No files provided to zip.' };
  }

  const zipEntries = [];
  const entriesToDelete = [];
  const processedFullPaths = new Set();

  for (const item of items) {
    const rawRel = typeof item === 'string' ? item : (item.relativePath || item.filename || '');
    const relPath = sanitizeRelativePath(rawRel);
    if (!relPath) continue;

    let fullPath;
    try {
      fullPath = resolveAllowedTargetPath(pageFile, target, relPath).fullPath;
    } catch {
      continue;
    }

    if (processedFullPaths.has(fullPath)) continue;

    let stats;
    try {
      stats = await fs.stat(fullPath);
    } catch {
      continue;
    }

    processedFullPaths.add(fullPath);

    let entryZipPath = relPath.replace(/\\/g, '/');
    if (destSubdir && entryZipPath.toLowerCase().startsWith(destSubdir.toLowerCase() + '/')) {
      entryZipPath = entryZipPath.slice(destSubdir.length + 1);
    }

    if (stats.isDirectory()) {
      const dirEntries = await collectDirEntries(fullPath, entryZipPath);
      zipEntries.push(...dirEntries);
      entriesToDelete.push({ fullPath, isDir: true, relPath });
    } else if (stats.isFile()) {
      try {
        const data = await fs.readFile(fullPath);
        zipEntries.push({
          name: entryZipPath,
          data,
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
          birthtimeMs: stats.birthtimeMs
        });
        entriesToDelete.push({ fullPath, isDir: false, relPath });
      } catch (err) {
        console.warn('Failed to read file for zip:', fullPath, err);
      }

      if (target === 'mindmaps' && (relPath.endsWith('.js') || relPath.endsWith('.json'))) {
        const parsed = path.parse(fullPath);
        const companionFullPath = path.join(parsed.dir, parsed.name);
        if (!processedFullPaths.has(companionFullPath)) {
          try {
            const compStats = await fs.stat(companionFullPath);
            if (compStats.isDirectory()) {
              processedFullPaths.add(companionFullPath);
              const compZipPath = entryZipPath.replace(/\.(js|json)$/i, '');
              const dirEntries = await collectDirEntries(companionFullPath, compZipPath);
              zipEntries.push(...dirEntries);
              const compRelPath = relPath.replace(/\.(js|json)$/i, '');
              entriesToDelete.push({ fullPath: companionFullPath, isDir: true, relPath: compRelPath });
            }
          } catch {}
        }
      }
    }
  }

  if (!zipEntries.length) {
    return { ok: false, error: 'No files found to archive.' };
  }

  const zipBuffer = buildZip(zipEntries);
  await fs.mkdir(archivedDir, { recursive: true });
  const finalZipPath = path.join(archivedDir, zipFilename);
  const tmpZipPath = finalZipPath + '.tmp';

  try {
    await fs.writeFile(tmpZipPath, zipBuffer);
    try {
      await fs.rename(tmpZipPath, finalZipPath);
    } catch (renameErr) {
      if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST') {
        await fs.unlink(finalZipPath).catch(() => {});
        await fs.rename(tmpZipPath, finalZipPath);
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    await fs.unlink(tmpZipPath).catch(() => {});
    return { ok: false, error: 'Failed to write zip file: ' + (err && err.message ? err.message : String(err)) };
  }

  let deletedCount = 0;
  for (const entry of entriesToDelete) {
    if (path.resolve(entry.fullPath) === path.resolve(finalZipPath)) continue;
    try {
      if (entry.isDir) {
        await fs.rm(entry.fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(entry.fullPath);
      }
      deletedCount++;
    } catch (delErr) {
      console.warn('Failed to delete original file after zip:', entry.fullPath, delErr);
    }
  }

  _broadcastDataChanged(event, pageFile, {
    action: 'zip-archived-files',
    target,
    zipFilename,
    deletedCount
  });

  return {
    ok: true,
    zipFilename,
    path: finalZipPath,
    count: entriesToDelete.length,
    deletedCount,
    size: zipBuffer.length
  };
});

ipcMain.handle('app:save-to-disk', async (_event, request = {}) => {
  const filters = Array.isArray(request.filters) ? request.filters : [];
  const defaultPath = String(request.defaultPath || '').trim();
  const options = {
    title: String(request.title || 'Save file'),
    filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]
  };
  if (defaultPath) options.defaultPath = defaultPath;

  const { canceled, filePath } = await dialog.showSaveDialog(options);
  if (canceled || !filePath) {
    return { ok: false, canceled: true };
  }

  try {
    const encoding = request.encoding === 'base64' ? 'base64' : 'utf8';
    const data = encoding === 'base64'
      ? Buffer.from(String(request.content || ''), 'base64')
      : String(request.content || '');
    await fs.writeFile(filePath, data, encoding === 'base64' ? undefined : 'utf8');
    return { ok: true, canceled: false, path: filePath, name: path.basename(filePath) };
  } catch (err) {
    return { ok: false, canceled: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('app:pick-and-read-file', async (_event, request = {}) => {
  const filters = Array.isArray(request.filters) ? request.filters : [];
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: String(request.title || 'Open file'),
    properties: ['openFile'],
    filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]
  });
  if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
  const filePath = filePaths[0];
  const name = path.basename(filePath);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { ok: true, canceled: false, name, content };
  } catch (err) {
    return { ok: false, canceled: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('app:pick-and-copy-files', async (event, request = {}) => {
  const pageFile = getRequestingPage(event);
  const target = String(request.target || '');
  const filters = Array.isArray(request.filters) ? request.filters : [];

  const targetDir = resolveAllowedTargetDir(pageFile, target);
  const subdir = request.subdir ? sanitizeRelativePath(String(request.subdir)) : null;
  const destDir = (subdir && subdir !== '.')
    ? (() => {
        const resolved = path.resolve(targetDir, subdir);
        const targetRoot = path.resolve(targetDir);
        if (resolved !== targetRoot && !resolved.startsWith(targetRoot + path.sep)) {
          throw new Error('Subdir is outside the allowed target directory.');
        }
        return resolved;
      })()
    : targetDir;

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: String(request.title || 'Select files'),
    properties: ['openFile', 'multiSelections'],
    filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }]
  });
  if (canceled || !filePaths?.length) return { ok: false, canceled: true };

  await fs.mkdir(destDir, { recursive: true });
  const copied = [];
  const errors = [];
  for (const srcPath of filePaths) {
    const name = path.basename(srcPath);
    const destPath = path.join(destDir, name);
    try {
      await fs.copyFile(srcPath, destPath);
      copied.push({ name });
    } catch (err) {
      errors.push({ name, error: String(err?.message || err) });
    }
  }
  return { ok: true, canceled: false, copied, errors };
});

ipcMain.handle('app:get-backup-location', async () => {
  const cfg = await loadSavedBackupConfig();
  return {
    ok: true,
    backupLocation: cfg.backupLocation,
    backupFormat: cfg.backupFormat,
    backupScheduleEnabled: cfg.backupScheduleEnabled,
    backupIntervalDays: cfg.backupIntervalDays,
    lastBackupTime: cfg.lastBackupTime
  };
});

ipcMain.handle('app:set-backup-format', async (_event, { format } = {}) => {
  const valid = ['folder', 'zip', 'targz'].includes(format) ? format : 'folder';
  await saveBackupConfig({ backupFormat: valid });
  return { ok: true, backupFormat: valid };
});

ipcMain.handle('app:set-backup-schedule', async (_event, { enabled, intervalDays } = {}) => {
  const validInterval = Number.isFinite(intervalDays) ? Math.max(1, Math.min(365, parseInt(intervalDays, 10))) : 7;
  const cfg = await saveBackupConfig({
    backupScheduleEnabled: Boolean(enabled),
    backupIntervalDays: validInterval
  });
  return { ok: true, backupScheduleEnabled: cfg.backupScheduleEnabled, backupIntervalDays: cfg.backupIntervalDays };
});

ipcMain.handle('app:check-scheduled-backup', async () => {
  const cfg = await loadSavedBackupConfig();
  if (!cfg.backupScheduleEnabled || !cfg.backupLocation) {
    return { ok: true, due: false, backupScheduleEnabled: cfg.backupScheduleEnabled, backupLocation: cfg.backupLocation };
  }
  const intervalMs = (cfg.backupIntervalDays || 7) * 24 * 60 * 60 * 1000;
  let due = false;
  let daysElapsed = 0;
  if (!cfg.lastBackupTime) {
    due = true;
    daysElapsed = cfg.backupIntervalDays;
  } else {
    const lastMs = new Date(cfg.lastBackupTime).getTime();
    if (isNaN(lastMs)) {
      due = true;
      daysElapsed = cfg.backupIntervalDays;
    } else {
      const diffMs = Date.now() - lastMs;
      daysElapsed = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffMs >= intervalMs) {
        due = true;
      }
    }
  }
  return {
    ok: true,
    due,
    daysElapsed,
    intervalDays: cfg.backupIntervalDays,
    lastBackupTime: cfg.lastBackupTime,
    backupLocation: cfg.backupLocation
  };
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

  const cfg = await saveBackupConfig({ backupLocation: selected });
  return { ok: true, canceled: false, backupLocation: selected, backupFormat: cfg.backupFormat };
});

ipcMain.handle('app:run-backup', async (_event, request = {}) => {
  const cfg = await loadSavedBackupConfig();
  const backupLocation = cfg.backupLocation;
  if (!backupLocation) {
    return { ok: false, error: 'No backup location configured.' };
  }

  try {
    fsSync.accessSync(backupLocation, fsSync.constants.W_OK);
  } catch {
    return { ok: false, error: 'Backup folder is not accessible or not writable.' };
  }

  const format = ['folder', 'zip', 'targz'].includes(request?.format)
    ? request.format
    : cfg.backupFormat;

  const writableRoot = getWritableRootDir();
  const userDir = path.join(writableRoot, 'user');

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

  let response;
  if (format === 'zip') {
    const targetFile = path.join(backupLocation, `backup_${timestamp}.zip`);
    const result = await createZipBackup(userDir, targetFile);
    response = { ok: result.ok, copied: result.copied, errors: result.errors, backupLocation: targetFile };
  } else if (format === 'targz') {
    const targetFile = path.join(backupLocation, `backup_${timestamp}.tar.gz`);
    const result = await createTarGzBackup(userDir, targetFile);
    response = { ok: result.ok, copied: result.copied, errors: result.errors, backupLocation: targetFile };
  } else {
    const sources = [
      { dir: userDir, prefix: 'user' }
    ];
    const destRoot = path.join(backupLocation, timestamp);
    let totalCopied = 0;
    const allErrors = [];

    for (const { dir, prefix } of sources) {
      const destDir = path.join(destRoot, prefix);
      const result = await copyTreeForBackup(dir, destDir);
      totalCopied += result.copied;
      allErrors.push(...result.errors);
    }

    response = { ok: true, copied: totalCopied, errors: allErrors, backupLocation: destRoot };
  }

  if (response && response.ok) {
    await saveBackupConfig({ lastBackupTime: now.toISOString() });
  }

  return response;
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

ipcMain.handle('app:reset-sync-baseline', async () => {
  return resetSyncBaseline();
});

ipcMain.handle('app:run-sync', async (_event, { mode, mtimeTolMs = 0 } = {}) => {
  const syncLocation = await loadSavedSyncLocation();
  if (!syncLocation) {
    return { ok: false, error: 'No sync location configured.' };
  }

  const validModes = ['to-target', 'to-source', 'both', 'mirror-to-target', 'mirror-to-source'];
  const syncMode = validModes.includes(mode) ? mode : 'to-target';

  try {
    fsSync.accessSync(syncLocation, fsSync.constants.R_OK);
  } catch {
    return { ok: false, error: 'Sync folder is not accessible.' };
  }

  if (syncMode === 'to-target' || syncMode === 'both' || syncMode === 'mirror-to-target') {
    try {
      fsSync.accessSync(syncLocation, fsSync.constants.W_OK);
    } catch {
      return { ok: false, error: 'Sync folder is not writable.' };
    }
  }

  const writableRoot = getWritableRootDir();
  const srcDir  = path.join(writableRoot, 'user');
  const destDir = resolveSyncDestDir(syncLocation);

  const baselineMap = await loadSyncBaseline();

  const result = await syncTrees(srcDir, destDir, syncMode, {
    autoNew: false,
    baseline: { map: baselineMap, prefix: '' },
    mtimeTolMs: Math.max(0, mtimeTolMs)
  });

  const allErrors    = result.errors;
  const allConflicts = result.conflicts;
  const allNewFiles  = result.newFiles;
  const allAdded     = result.added;
  const allDeleted   = result.deleted || [];

  if (syncMode === 'mirror-to-target' || syncMode === 'mirror-to-source') {
    for (const e of result.synced) {
      baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
    }
    for (const d of allDeleted) {
      baselineMap.delete(d);
    }
    await saveSyncBaseline(baselineMap);
    _pendingBaselineEntries = [];

    if (syncMode === 'mirror-to-source') {
      _broadcastDataChanged(_event, 'general-config.html', {
        action: 'sync',
        target: 'user',
        filename: 'config.js'
      });
    }

    return {
      ok: true,
      copied: result.copied,
      deleted: allDeleted.length,
      deletedFiles: allDeleted,
      errors: allErrors,
      conflicts: [],
      newFiles: [],
      added: allAdded,
      syncLocation
    };
  }

  // Save pending entries for baseline update after conflict resolution.
  // If there are no conflicts the baseline is committed immediately.
  _pendingBaselineEntries = result.synced.map(s => ({ relativePath: s.relativePath, mtimeMs: s.mtimeMs, size: s.size }));

  if (allConflicts.length === 0 && allNewFiles.length === 0) {
    // All done — commit baseline now
    for (const e of _pendingBaselineEntries) {
      baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
    }
    await saveSyncBaseline(baselineMap);
    _pendingBaselineEntries = [];
  }

  return { ok: true, copied: result.copied, deleted: allDeleted.length, deletedFiles: allDeleted, errors: allErrors, conflicts: allConflicts, newFiles: allNewFiles, added: allAdded, syncLocation };
});

ipcMain.handle('app:apply-sync-choices', async (_event, { decisions = [] } = {}) => {
  const syncLocation = await loadSavedSyncLocation();
  if (!syncLocation) {
    return { ok: false, error: 'No sync location configured.' };
  }

  const writableRoot = getWritableRootDir();
  const srcDir  = path.join(writableRoot, 'user');
  const destDir = resolveSyncDestDir(syncLocation);

  async function copyOne(fromPath, toPath) {
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.copyFile(fromPath, toPath);
    const stat = await fs.stat(fromPath);
    await fs.utimes(toPath, stat.atime, stat.mtime).catch(() => {});
  }

  async function deleteAndPrune(targetDir, relativePath) {
    const fullPath = path.join(targetDir, relativePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    let dir = path.dirname(fullPath);
    const resolvedTarget = path.resolve(targetDir);
    while (dir.startsWith(resolvedTarget) && dir !== resolvedTarget) {
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
          dir = path.dirname(dir);
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  }

  let applied = 0;
  const errors = [];
  const archivedAllPaths = []; // paths where files were deleted/archived on both sides — removed from baseline

  for (const decision of decisions) {
    if (decision.action === 'skip') continue;

    const relPath = String(decision.relativePath || '').replace(/\\/g, '/');
    // Validate: must not contain traversal segments
    if (relPath.split('/').some(seg => seg === '..' || seg === '.')) {
      errors.push({ relativePath: relPath, error: 'Invalid path.' });
      continue;
    }

    const srcPath  = path.join(srcDir,  relPath);
    const destPath = path.join(destDir, relPath);

    // Confirm resolved paths stay within their roots
    if (!srcPath.startsWith(srcDir + path.sep) && srcPath !== srcDir) {
      errors.push({ relativePath: relPath, error: 'Path is outside data root.' });
      continue;
    }
    if (!destPath.startsWith(destDir + path.sep) && destPath !== destDir) {
      errors.push({ relativePath: relPath, error: 'Path is outside sync root.' });
      continue;
    }

    try {
      if (decision.action === 'keep-source') {
        const srcExists = await fs.access(srcPath).then(() => true).catch(() => false);
        if (srcExists) {
          await copyOne(srcPath, destPath);
          applied++;
          try {
            const stat = await fs.stat(destPath);
            _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
          } catch {}
        } else {
          await deleteAndPrune(destDir, relPath);
          archivedAllPaths.push(relPath);
          applied++;
        }
      } else if (decision.action === 'keep-target') {
        const destExists = await fs.access(destPath).then(() => true).catch(() => false);
        if (destExists) {
          await copyOne(destPath, srcPath);
          applied++;
          try {
            const stat = await fs.stat(srcPath);
            _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
          } catch {}
        } else {
          await deleteAndPrune(srcDir, relPath);
          archivedAllPaths.push(relPath);
          applied++;
        }
      } else if (decision.action === 'delete-source') {
        await deleteAndPrune(srcDir, relPath);
        archivedAllPaths.push(relPath);
        applied++;
      } else if (decision.action === 'delete-target') {
        await deleteAndPrune(destDir, relPath);
        archivedAllPaths.push(relPath);
        applied++;
      } else if (decision.action === 'archive-older') {
        const [srcStat, destStat] = await Promise.all([
          fs.stat(srcPath).catch(() => null),
          fs.stat(destPath).catch(() => null),
        ]);
        if (srcStat && destStat) {
          if (srcStat.mtimeMs < destStat.mtimeMs) {
            // src is strictly older — archive it, copy dest → src
            await bakIfExists(srcPath);
            await copyOne(destPath, srcPath);
            const s = await fs.stat(srcPath);
            _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: s.mtimeMs, size: s.size });
          } else if (destStat.mtimeMs < srcStat.mtimeMs) {
            // dest is strictly older — archive it, copy src → dest
            await bakIfExists(destPath);
            await copyOne(srcPath, destPath);
            const s = await fs.stat(destPath);
            _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: s.mtimeMs, size: s.size });
          } else {
            // identical timestamps — archive both, neither wins
            await bakIfExists(srcPath);
            await bakIfExists(destPath);
            archivedAllPaths.push(relPath);
          }
        } else if (srcStat) {
          await bakIfExists(srcPath);
          archivedAllPaths.push(relPath);
        } else if (destStat) {
          await bakIfExists(destPath);
          archivedAllPaths.push(relPath);
        }
        applied++;
      } else if (decision.action === 'archive-all') {
        await bakIfExists(srcPath);
        await bakIfExists(destPath);
        archivedAllPaths.push(relPath);
        applied++;
      } else if (decision.action === 'bak-source') {
        // Rename app (source) file to .bak, then copy sync → app if sync file exists
        await bakIfExists(srcPath);
        const destExists = await fs.access(destPath).then(() => true).catch(() => false);
        if (destExists) {
          await copyOne(destPath, srcPath);
          const stat = await fs.stat(srcPath);
          _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
        } else {
          archivedAllPaths.push(relPath);
        }
        applied++;
      } else if (decision.action === 'bak-target') {
        // Rename sync (target) file to .bak, then copy app → sync if app file exists
        await bakIfExists(destPath);
        const srcExists = await fs.access(srcPath).then(() => true).catch(() => false);
        if (srcExists) {
          await copyOne(srcPath, destPath);
          const stat = await fs.stat(destPath);
          _pendingBaselineEntries.push({ relativePath: relPath, mtimeMs: stat.mtimeMs, size: stat.size });
        } else {
          archivedAllPaths.push(relPath);
        }
        applied++;
      }
    } catch (err) {
      errors.push({ relativePath: relPath, error: String(err?.message || err) });
    }
  }

  // Commit the baseline
  try {
    const baselineMap = await loadSyncBaseline();
    for (const e of _pendingBaselineEntries) {
      baselineMap.set(e.relativePath, { mtimeMs: e.mtimeMs, size: e.size });
    }
    for (const p of archivedAllPaths) baselineMap.delete(p);
    await saveSyncBaseline(baselineMap);
  } catch (err) {
    console.error('Failed to update sync baseline after apply:', err);
  } finally {
    _pendingBaselineEntries = [];
  }

  _broadcastDataChanged(_event, 'general-config.html', {
    action: 'sync',
    target: 'user'
  });

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

// ── FTP Sync IPC ──────────────────────────────────────────────────────────────

ipcMain.handle('app:ftp-get-config', async () => {
  const cfg = await loadFtpConfig();
  const safe = { ...cfg };
  safe.hasPassword = !!cfg.password;
  delete safe.password; // password never leaves main process
  return { ok: true, config: safe };
});

ipcMain.handle('app:ftp-save-config', async (_event, incoming = {}) => {
  const existing = await loadFtpConfig();
  const merged = { ...existing, ...incoming };
  // If the renderer sent the placeholder '***' back (masked), keep existing password
  if (incoming.password === '***') merged.password = existing.password || '';
  await saveFtpConfig(merged);
  await startFtpAutoSyncTimer();
  return { ok: true };
});

ipcMain.handle('app:ftp-test', async () => {
  const cfg = await loadFtpConfig();
  if (!cfg.host) return { ok: false, error: 'No host configured.' };
  const { Client } = require('basic-ftp');
  const ftp = new Client(15000);
  try {
    await ftp.access({ host: cfg.host, port: cfg.port || 21, user: cfg.user || '', password: cfg.password || '', secure: cfg.secure === true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    ftp.close();
  }
});

ipcMain.handle('app:ftp-upload',   async () => runFtpTransfer('upload'));
ipcMain.handle('app:ftp-download', async () => runFtpTransfer('download'));

// ── Google Drive Sync IPC ─────────────────────────────────────────────────────

ipcMain.handle('app:drive-get-config', async () => {
  const cfg = await loadDriveConfig();
  return {
    ok: true,
    config: {
      clientId: cfg.clientId || '',
      clientSecretSet: !!(cfg.clientSecret),
      driveFolderName: cfg.driveFolderName || 'Class Management Tools',
      subfolders: cfg.subfolders || [],
      isConnected: !!(cfg.tokens && cfg.tokens.refresh_token),
      userEmail: cfg.userEmail || '',
    },
  };
});

ipcMain.handle('app:drive-save-credentials', async (_event, { clientId, clientSecret, driveFolderName, subfolders } = {}) => {
  const existing = await loadDriveConfig();
  const updated = { ...existing };
  if (typeof clientId     === 'string') updated.clientId     = clientId;
  if (typeof driveFolderName === 'string') updated.driveFolderName = driveFolderName || 'Class Management Tools';
  if (Array.isArray(subfolders)) updated.subfolders = subfolders;
  if (typeof clientSecret === 'string' && clientSecret) updated.clientSecret = clientSecret;
  await saveDriveConfig(updated);
  return { ok: true };
});

ipcMain.handle('app:drive-auth-start', async () => {
  const cfg = await loadDriveConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    return { ok: false, error: 'Enter your Client ID and Client Secret first.' };
  }
  try {
    return await startDriveOAuthFlow(cfg);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:drive-disconnect', async () => {
  const cfg = await loadDriveConfig();
  const { tokens: _t, userEmail: _e, driveFolderId: _f, ...rest } = cfg;
  await saveDriveConfig(rest);
  return { ok: true };
});

ipcMain.handle('app:drive-upload',   async () => runDriveTransfer('upload'));
ipcMain.handle('app:drive-download', async () => runDriveTransfer('download'));

// ── WebDAV Sync IPC ───────────────────────────────────────────────────────────

ipcMain.handle('app:webdav-get-config', async () => {
  const cfg = await loadWebdavConfig();
  const safe = { ...cfg };
  delete safe.password;
  return { ok: true, config: safe };
});

ipcMain.handle('app:webdav-save-config', async (_event, incoming = {}) => {
  const existing = await loadWebdavConfig();
  const merged = { ...existing, ...incoming };
  if (incoming.password === '***') merged.password = existing.password || '';
  await saveWebdavConfig(merged);
  await startWebdavAutoSyncTimer();
  return { ok: true };
});

ipcMain.handle('app:webdav-test', async () => {
  const cfg = await loadWebdavConfig();
  if (!cfg.serverUrl) return { ok: false, error: 'No server URL configured.' };
  try {
    const { createClient } = require('webdav');
    const client = createClient(cfg.serverUrl, { username: cfg.username || '', password: cfg.password || '' });
    await client.getQuota(); // lightweight connectivity check
    return { ok: true };
  } catch (err) {
    // Fall back to checking if root path exists — getQuota not supported on all servers
    try {
      const { createClient } = require('webdav');
      const client = createClient(cfg.serverUrl, { username: cfg.username || '', password: cfg.password || '' });
      await client.exists('/');
      return { ok: true };
    } catch (err2) {
      return { ok: false, error: err2.message };
    }
  }
});

ipcMain.handle('app:webdav-upload',   async () => runWebdavTransfer('upload'));
ipcMain.handle('app:webdav-download', async () => runWebdavTransfer('download'));

// ── Backup file management ────────────────────────────────────────────────────

const BAK_RE = /\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}\.bak$/;

ipcMain.handle('app:list-bak-files', async () => {
  const userDir = path.join(getWritableRootDir(), 'user');
  const results = [];
  async function scan(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(full);
      } else if (BAK_RE.test(entry.name)) {
        const stat = await fs.stat(full).catch(() => null);
        const originalFull = full.replace(BAK_RE, '');
        const tsMatch = entry.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2})\.bak$/);
        const ts = tsMatch ? tsMatch[1].replace('T', ' ').replace(/-(\d{2})$/, ':$1') : '';
        const originalExists = await fs.access(originalFull).then(() => true).catch(() => false);
        results.push({
          path: full,
          relativePath: path.relative(userDir, full).replace(/\\/g, '/'),
          originalName: path.basename(originalFull),
          timestamp: ts,
          size: stat ? stat.size : 0,
          originalExists,
        });
      }
    }
  }
  await scan(userDir);
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { ok: true, files: results };
});

ipcMain.handle('app:delete-bak-files', async (_event, { paths: filePaths = [] } = {}) => {
  const userDir = path.join(getWritableRootDir(), 'user');
  let deleted = 0;
  const errors = [];
  for (const p of filePaths) {
    if (!p.startsWith(userDir + path.sep) || !BAK_RE.test(path.basename(p))) {
      errors.push({ path: p, error: 'Not a valid backup file path.' });
      continue;
    }
    try { await fs.unlink(p); deleted++; }
    catch (e) { errors.push({ path: p, error: e.message }); }
  }
  return { ok: true, deleted, errors };
});

ipcMain.handle('app:restore-bak-file', async (_event, { path: bakPath } = {}) => {
  const userDir = path.join(getWritableRootDir(), 'user');
  if (!bakPath.startsWith(userDir + path.sep) || !BAK_RE.test(path.basename(bakPath))) {
    return { ok: false, error: 'Not a valid backup file path.' };
  }
  const originalPath = bakPath.replace(BAK_RE, '');
  const alreadyExists = await fs.access(originalPath).then(() => true).catch(() => false);
  if (alreadyExists) return { ok: false, error: 'original_exists' };
  try {
    await fs.rename(bakPath, originalPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LOCAL CLASSROOM SERVER  (spawned child process, used by both CMS
// remote and quiz / note features)
// ─────────────────────────────────────────────────────────────────────────────

let _localServerProc = null;
let _localServerPort = 8787;

function _localServerRunning() {
  return !!(_localServerProc && !_localServerProc.killed && _localServerProc.exitCode == null);
}

async function ensureLocalServerRunning(port) {
  const requestedPort = Number(port) || 8787;

  if (_localServerRunning()) {
    if (_localServerPort === requestedPort) {
      return { ok: true, port: _localServerPort };
    }
    if (_localServerProc) {
      try { _localServerProc.kill(); } catch (_) {}
      _localServerProc = null;
    }
  }

  const scriptPath    = path.join(ROOT_DIR, 'js', 'classroom-server.js');

  if (!fsSync.existsSync(scriptPath)) {
    return { ok: false, error: 'classroom-server.js not found.' };
  }

  _localServerPort = requestedPort;
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(requestedPort) };

  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT_DIR, env, detached: false, stdio: 'ignore', windowsHide: true
    });
    child.on('exit',  () => { if (_localServerProc === child) _localServerProc = null; });
    child.on('error', () => { if (_localServerProc === child) _localServerProc = null; });
    _localServerProc = child;

    // Brief wait for the server process to bind its port
    await new Promise(resolve => setTimeout(resolve, 450));

    // Best-effort: open Windows Firewall
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const ruleName = 'CMT Classroom Server';
      exec(
        `netsh advfirewall firewall delete rule name="${ruleName}" >nul 2>&1 & ` +
        `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow ` +
        `protocol=TCP localport=${requestedPort} profile=any`,
        () => {}
      );
    }

    return { ok: true, port: _localServerPort };
  } catch (err) {
    _localServerProc = null;
    return { ok: false, error: err && err.message ? err.message : 'Failed to start server.' };
  }
}

function stopLocalServerIfUnused() {
  if (_cmsRelayConnected) return; // keep the server alive while CMS is connected
  if (_localServerProc) { try { _localServerProc.kill(); } catch (_) {} _localServerProc = null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS REMOTE RELAY CLIENT
// ─────────────────────────────────────────────────────────────────────────────

let _cmsRelayWs        = null;
let _cmsRelayConnected = false;
let _cmsRelayMode      = 'local';   // 'local' | 'external'
let _cmsRelayServerUrl = '';        // external server URL, kept for status responses
let _remoteToken       = null;      // 6-char student token shown to phones
let _remoteHostSecret  = null;      // host secret used to authenticate with relay
let _cmsConnectedCount = 0;

function _remoteGenToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

function _remoteGenSecret() {
  return crypto.randomBytes(16).toString('hex');
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

function _cmsFindClassManagementWindow() {
  return BrowserWindow.getAllWindows().find(
    w => !w.isDestroyed() && getLoadedPageFile(w) === PAGE_FILES.classManagement
  ) || null;
}

function _cmsNotifyStatus() {
  const win = _cmsFindClassManagementWindow();
  if (!win) return;
  win.webContents.executeJavaScript(
    `window._cmsRemoteStatusUpdate && window._cmsRemoteStatusUpdate(${_cmsConnectedCount})`
  ).catch(() => {});
}

const _CMS_ALLOWED_ACTIONS = new Set(['score', 'badge_add', 'badge_remove']);

function _cmsDispatchAction(msg) {
  const { action, studentId, groupName, delta, icon, label, tone } = msg;
  if (!_CMS_ALLOWED_ACTIONS.has(action)) return;
  if (studentId === undefined || studentId === null || typeof groupName !== 'string') return;

  const sId  = JSON.stringify(studentId);
  const sGrp = JSON.stringify(String(groupName).substring(0, 128));
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

  if (jsCall) {
    const win = _cmsFindClassManagementWindow();
    if (win) win.webContents.executeJavaScript(jsCall).catch(() => {});
  }
}

function _cmsRelayDisconnect() {
  if (_cmsRelayWs) { try { _cmsRelayWs.close(); } catch (_) {} _cmsRelayWs = null; }
  _cmsRelayConnected = false;
  _cmsConnectedCount = 0;
  _cmsRelayServerUrl = '';
}

function _cmsBuildWsUrl(serverUrl) {
  const s = String(serverUrl || '').trim().replace(/\/+$/, '');
  if (!s) throw new Error('No server URL');
  if (/^wss?:\/\//i.test(s)) return /\/cms-ws$/i.test(s) ? s : s + '/cms-ws';
  const withProto = /^https?:\/\//i.test(s) ? s : 'https://' + s;
  const u = new URL(withProto);
  return (u.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + u.host + '/cms-ws';
}

function _cmsBuildHttpUrl(serverUrl) {
  const s = String(serverUrl || '').trim().replace(/\/+$/, '');
  if (!s) throw new Error('No server URL');
  let base = s;
  if (/^wss?:\/\//i.test(s)) base = s.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:').replace(/\/cms-ws$/i, '');
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
  return base.replace(/\/+$/, '') + '/remote.html';
}

async function _connectCmsRelay(wsUrl, secret, token) {
  _cmsRelayDisconnect();

  let WS;
  try { WS = require('ws'); }
  catch { return { ok: false, error: "'ws' package not available — run: npm install" }; }

  return new Promise((resolve) => {
    const ws = new WS(wsUrl);
    let settled = false;
    let pingInterval = null;

    const fail = (reason) => {
      if (settled) return;
      settled = true;
      clearInterval(pingInterval);
      try { ws.close(); } catch (_) {}
      resolve({ ok: false, error: reason });
    };

    ws.on('open', () => {
      try { ws.send(JSON.stringify({ type: 'host_hello', secret, token })); } catch (_) {}
      // Keepalive: prevents nginx/proxy from closing idle WS connections
      pingInterval = setInterval(() => {
        if (ws.readyState === 1) {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch (_) {}
        }
      }, 20000);
    });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (!settled) {
        if (msg.type === 'host_welcome') {
          settled = true;
          _cmsRelayWs        = ws;
          _cmsRelayConnected = true;
          _cmsConnectedCount = Number(msg.clientCount || 0);
          resolve({ ok: true });
        } else if (msg.type === 'host_error') {
          fail(msg.reason || 'Authentication failed');
        }
        return;
      }

      if (msg.type === 'client_count') {
        _cmsConnectedCount = Number(msg.count || 0);
        _cmsNotifyStatus();
      } else if (msg.type === 'action') {
        _cmsDispatchAction(msg);
      } else if (msg.type === 'request_state') {
        const cmsWin = _cmsFindClassManagementWindow();
        if (cmsWin) {
          cmsWin.webContents.executeJavaScript(
            'window._remotePushStateDebounced && window._remotePushStateDebounced()'
          ).catch(() => {});
        }
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      const wasConnected = _cmsRelayConnected;
      _cmsRelayWs        = null;
      _cmsRelayConnected = false;
      if (wasConnected) _cmsNotifyStatus();
      if (!settled) fail('Connection closed before authentication');
    });

    ws.on('error', (err) => {
      if (!settled) fail(err && err.message ? err.message : 'WebSocket error');
    });

    setTimeout(() => fail('Connection timed out'), 8000);
  });
}

// Remote Control IPC handlers

ipcMain.handle('app:remote-start', async (_event, opts = {}) => {
  const { port, mode, serverUrl, hostSecret } = opts;
  _cmsRelayMode   = mode === 'external' ? 'external' : 'local';
  _remoteToken    = _remoteGenToken();

  if (_cmsRelayMode === 'local') {
    _remoteHostSecret = _remoteGenSecret(); // ephemeral secret, not user-visible
    const srv = await ensureLocalServerRunning(port || 8787);
    if (!srv.ok) return srv;
    const wsUrl  = `ws://127.0.0.1:${_localServerPort}/cms-ws`;
    const result = await _connectCmsRelay(wsUrl, _remoteHostSecret, _remoteToken);
    if (!result.ok) return result;
    const ip = _remoteGetLocalIp();
    return { ok: true, mode: 'local', port: _localServerPort, ip, token: _remoteToken, connected: 0 };
  }

  // External mode
  _remoteHostSecret = String(hostSecret || '').trim();
  if (!_remoteHostSecret) return { ok: false, error: 'Host secret required for external mode.' };

  let wsUrl;
  try { wsUrl = _cmsBuildWsUrl(serverUrl); }
  catch (e) { return { ok: false, error: 'Invalid server URL.' }; }

  const result = await _connectCmsRelay(wsUrl, _remoteHostSecret, _remoteToken);
  if (!result.ok) return result;

  _cmsRelayServerUrl = serverUrl;
  let httpUrl = '';
  try { httpUrl = _cmsBuildHttpUrl(serverUrl); } catch (_) {}
  return { ok: true, mode: 'external', serverUrl, httpUrl, token: _remoteToken, connected: 0 };
});

ipcMain.handle('app:remote-stop', async () => {
  _cmsRelayDisconnect();
  _remoteToken = null;
  stopLocalServerIfUnused();
  return { ok: true };
});

ipcMain.handle('app:remote-status', async () => {
  if (!_cmsRelayConnected) return { running: false };
  const ip = _remoteGetLocalIp();
  let httpUrl = '';
  if (_cmsRelayMode === 'external' && _cmsRelayServerUrl) {
    try { httpUrl = _cmsBuildHttpUrl(_cmsRelayServerUrl); } catch (_) {}
  }
  return {
    running: true, mode: _cmsRelayMode,
    port: _localServerPort, ip, token: _remoteToken, connected: _cmsConnectedCount,
    httpUrl
  };
});

ipcMain.handle('app:remote-push-state', async (_event, stateData) => {
  if (_cmsRelayConnected && _cmsRelayWs && stateData) {
    try { _cmsRelayWs.send(JSON.stringify({ type: 'state', ...stateData })); } catch (_) {}
  }
  return { ok: true };
});

ipcMain.handle('app:remote-new-token', async () => {
  if (!_cmsRelayConnected) return { ok: false, error: 'Not connected to relay' };
  _remoteToken = _remoteGenToken();
  try { _cmsRelayWs.send(JSON.stringify({ type: 'new_token', token: _remoteToken })); } catch (_) {}
  _cmsConnectedCount = 0;
  _cmsNotifyStatus();
  const ip = _remoteGetLocalIp();
  return { ok: true, token: _remoteToken, mode: _cmsRelayMode, port: _localServerPort, ip };
});

ipcMain.handle('app:remote-config-read', async (event) => {
  const pageFile = getRequestingPage(event);
  try {
    const { fullPath } = resolveAllowedTargetPath(pageFile, 'user', 'remote-config.js');
    const raw = await fs.readFile(fullPath, 'utf8');
    const match = raw.match(/globalThis\.__REMOTE_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      try { return { ok: true, config: JSON.parse(match[1]) }; } catch (_) {}
    }
    return { ok: true, config: {} };
  } catch (_) {
    return { ok: true, config: {} };
  }
});

ipcMain.handle('app:remote-config-save', async (event, config) => {
  const pageFile = getRequestingPage(event);
  const safe = config && typeof config === 'object' ? config : {};
  const content =
    'globalThis.__REMOTE_CONFIG = ' + JSON.stringify(safe, null, 2) + ';\n' +
    'if (typeof module !== "undefined" && module.exports) ' +
    '{ module.exports = { __REMOTE_CONFIG: globalThis.__REMOTE_CONFIG }; }\n';
  try {
    const { fullPath } = resolveAllowedTargetPath(pageFile, 'user', 'remote-config.js');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'Write failed' };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MULTIPLAYER SERVER  (uses the shared combined classroom-server.js)
// ─────────────────────────────────────────────────────────────────────────────

function _quizStatus() {
  const ip      = _remoteGetLocalIp();
  const running = _localServerRunning();
  return {
    running,
    port:      _localServerPort,
    ip,
    hostUrl:   `http://${ip}:${_localServerPort}/learning-tools.html`,
    playerUrl: `http://${ip}:${_localServerPort}/quiz-player.html`
  };
}

async function startQuizServer(port) {
  const srv = await ensureLocalServerRunning(port || 8787);
  if (!srv.ok) return { ok: false, error: srv.error };
  return { ok: true, ..._quizStatus() };
}

function stopQuizServer() {
  // Only stop if CMS relay is also inactive
  if (!_cmsRelayConnected) stopLocalServerIfUnused();
  return { ok: true, ..._quizStatus() };
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

ipcMain.handle('app:quiz-save-result', async (event, resultPayload) => {
  const pageFile = getRequestingPage(event);
  const payload  = resultPayload && typeof resultPayload === 'object' ? resultPayload : {};
  const entry = {
    savedAt:         Date.now(),
    winner:          payload.winner  || null,
    totalPlayers:    Number(payload.totalPlayers    || 0),
    questionsPlayed: Number(payload.questionsPlayed || 0),
    finishedAt:      Number(payload.finishedAt      || Date.now()),
    leaderboard:     Array.isArray(payload.leaderboard) ? payload.leaderboard : []
  };
  const line = 'globalThis.GAME_RESULTS_LOG.push(' + JSON.stringify(entry) + ');\n';
  const header =
    'globalThis.GAME_RESULTS_LOG = globalThis.GAME_RESULTS_LOG || [];\n' +
    'if (typeof module !== "undefined" && module.exports) ' +
    '{ module.exports = { GAME_RESULTS_LOG: globalThis.GAME_RESULTS_LOG }; }\n';
  try {
    const { fullPath } = resolveAllowedTargetPath(pageFile, 'gameResults', 'game-results.js');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    // Initialise file if missing
    let exists = false;
    try { await fs.access(fullPath); exists = true; } catch (_) {}
    if (!exists) await fs.writeFile(fullPath, header, 'utf8');
    await fs.appendFile(fullPath, line, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'Write failed' };
  }
});

ipcMain.handle('app:open-external', async (_event, request = {}) => {
  const url = String(request.url || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Invalid URL' };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('app:open-native', async (event, request = {}) => {
  let fullPath;
  if (request.absolutePath) {
    fullPath = path.resolve(String(request.absolutePath));
  } else {
    const pageFile = getRequestingPage(event);
    const resolved = resolveAllowedTargetPath(pageFile, request.target, request.relativePath);
    fullPath = resolved.fullPath;
  }
  const errMsg = await shell.openPath(fullPath);
  return errMsg ? { ok: false, error: errMsg } : { ok: true };
});

ipcMain.handle('app:show-in-folder', async (event, request = {}) => {
  let fullPath;
  if (request.absolutePath) {
    fullPath = path.resolve(String(request.absolutePath));
  } else {
    const pageFile = getRequestingPage(event);
    const resolved = resolveAllowedTargetPath(pageFile, request.target, request.relativePath);
    fullPath = resolved.fullPath;
  }
  shell.showItemInFolder(fullPath);
  return { ok: true };
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

// ── Reset folders ─────────────────────────────────────────────────────────────

ipcMain.handle('app:reset-folders', async (event, { targets: targetNames = [] } = {}) => {
  const ALLOWED = new Set(['mindmaps', 'grades', 'gradeSheet', 'groupParticipation', 'customData', 'classPlans', 'user']);
  const targets = getSaveTargets();
  const writableRoot = path.resolve(getWritableRootDir());

  for (const name of targetNames) {
    if (!ALLOWED.has(name)) return { ok: false, error: `Unknown target: ${name}` };
    const dir = targets[name];
    if (!dir || !path.resolve(dir).startsWith(writableRoot)) return { ok: false, error: `Invalid path for target: ${name}` };
  }

  // If 'user' is included it already covers everything — no need to delete sub-folders separately
  if (targetNames.includes('user')) {
    await fs.rm(targets['user'], { recursive: true, force: true });
    return { ok: true };
  }

  for (const name of targetNames) {
    try { await fs.rm(targets[name], { recursive: true, force: true }); } catch {}
  }
  return { ok: true };
});

// ── DOCX Export ───────────────────────────────────────────────────────────────
let _docxExporter = null;
function _getDocxExporter() {
  if (_docxExporter) return _docxExporter;
  const { Marked } = require('marked');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
          WidthType, BorderStyle, AlignmentType, ExternalHyperlink, ImageRun,
          LevelFormat, convertMillimetersToTwip } = require('docx');

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
          const imgData = ctx.images && ctx.images[src];
          if (imgData && imgData.data && imgData.width && imgData.height) {
            const textPx = ctx.textWidthPx || 600;
            const mode = ctx.imageWidthMode || 'auto';
            let targetW;
            if (mode === '100%') {
              targetW = textPx;
            } else if (mode.endsWith('%')) {
              targetW = textPx * (parseFloat(mode) / 100);
            } else {
              targetW = Math.min(imgData.width, textPx);
            }
            const scale = targetW / imgData.width;
            const w = Math.max(1, Math.round(imgData.width * scale));
            const h = Math.max(1, Math.round(imgData.height * scale));
            try {
              out.push(new ImageRun({
                data: Buffer.from(String(imgData.data), 'base64'),
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

  _docxExporter = { _markedDocx, MM2T, parseCssColor, parseCssLineHeight, parseCssFontSize, PAGE_SIZES_MM_DOCX, docxBlockTokens, Document, Packer, Paragraph };
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
    const { _markedDocx, MM2T, parseCssColor, parseCssLineHeight, parseCssFontSize, PAGE_SIZES_MM_DOCX, docxBlockTokens, Document, Packer, Paragraph } = _getDocxExporter();
    const cleanFont = String(request.fontFamily || 'Segoe UI')
      .split(',')[0].trim().replace(/^['"]|['"]$/g, '') || 'Segoe UI';
    const ptSize = parseCssFontSize(String(request.fontSize || ''), Number(request.fontSize) || 11);
    const halfPt = Math.round(ptSize * 2);
    const margins = request.margins || { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 };
    const pmm = PAGE_SIZES_MM_DOCX[request.size] || PAGE_SIZES_MM_DOCX.A4;
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
      images: request.images || {},
      textWidthPx,
      imageWidthMode: String(request.imageWidth || 'auto')
    };
    const tokens = _markedDocx.lexer(String(request.markdown || ''));
    const children = docxBlockTokens(tokens, ctx);
    if (!children.length) children.push(new Paragraph({ children: [] }));

    const doc = new Document({
      numbering: ctx.numConfigs.length ? { config: ctx.numConfigs } : undefined,
      sections: [{
        properties: {
          page: {
            size: { width: pageW, height: pageH },
            margin: { top: MM2T(margins.top), right: MM2T(margins.right), bottom: MM2T(margins.bottom), left: MM2T(margins.left) }
          }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const baseName = (typeof request.defaultName === 'string' && request.defaultName.trim())
      ? request.defaultName.trim().replace(/\.md$/, '')
      : 'document';
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save as DOCX',
      defaultPath: path.join(app.getPath('downloads'), baseName + '.docx'),
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    await fs.writeFile(filePath, buffer);
    return { ok: true, path: filePath, name: path.basename(filePath) };
  } catch (err) {
    console.error('export-docx failed', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
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

// ── Planner reminder engine ──────────────────────────────────────────────────

let _plannerReminderEntries = [];
let _todoReminderItems = [];
let _autoLessonEnd5Min = true;
const _shownReminders = new Set();
let _reminderInterval = null;

function _loadPlannerEntries() {
  try {
    const targets = getSaveTargets();
    const userDir = targets.user;

    // Read auto-end-reminder setting from planner-config.js
    try {
      const cfgPath = path.join(userDir, 'planner-config.js');
      if (fsSync.existsSync(cfgPath)) {
        const cfgContent = fsSync.readFileSync(cfgPath, 'utf8');
        const cfgMatch = cfgContent.match(/PLANNER_CONFIG\s*=\s*(\{[\s\S]*\})\s*;/);
        if (cfgMatch) {
          const cfgObj = JSON.parse(cfgMatch[1]);
          _autoLessonEnd5Min = !(cfgObj.reminderSettings && cfgObj.reminderSettings.autoLessonEnd5Min === false);
        }
      }
    } catch (_ce) {}

    let all = [];
    const plannerDir = path.join(userDir, 'planner');
    if (fsSync.existsSync(plannerDir)) {
      const perClassFiles = fsSync.readdirSync(plannerDir).filter(f => f.endsWith('.js'));
      for (const file of perClassFiles) {
        try {
          const content = fsSync.readFileSync(path.join(plannerDir, file), 'utf8');
          const match = content.match(/PLANNER_ENTRIES_BY_CLASS\[[^\]]+\]\s*=\s*(\[[\s\S]*\]);/);
          if (match) all = all.concat(JSON.parse(match[1]));
        } catch (_e) {}
      }
    }
    if (all.length === 0) {
      const filePath = path.join(userDir, 'planner-entries.js');
      if (fsSync.existsSync(filePath)) {
        const content = fsSync.readFileSync(filePath, 'utf8');
        const match = content.match(/PLANNER_ENTRIES\s*=\s*(\[[\s\S]*\])\s*;/);
        if (match) all = JSON.parse(match[1]);
      }
    }
    // Include entries with explicit reminders, plus all lesson entries with timeEnd for auto-end check
    _plannerReminderEntries = all.filter(
      e => e && e.date && (
        (e.reminder    && e.reminder.minutesBefore    > 0) ||
        (e.reminderEnd && e.reminderEnd.minutesBefore > 0) ||
        (e.timeEnd && (!e.type || e.type === 'lesson'))
      )
    );

    // Load todos for reminder engine
    try {
      const todosPath = path.join(userDir, 'todos.js');
      if (fsSync.existsSync(todosPath)) {
        const todosContent = fsSync.readFileSync(todosPath, 'utf8');
        const todosMatch = todosContent.match(/TODOS\s*=\s*(\[[\s\S]*\])\s*;/);
        if (todosMatch) {
          const allTodos = JSON.parse(todosMatch[1]);
          _todoReminderItems = allTodos.filter(td => !td.archivedAt && td.reminderAt);
        } else {
          _todoReminderItems = [];
        }
      } else {
        _todoReminderItems = [];
      }
    } catch (_te) { _todoReminderItems = []; }
  } catch (_err) {
    _plannerReminderEntries = [];
    _todoReminderItems = [];
  }
}

function _broadcastReminder(data) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('planner:reminder', data);
    }
  }
}

function _checkPlannerReminders() {
  const nowMs = Date.now();
  for (const entry of _plannerReminderEntries) {
    const classLabel = entry.classId || '';
    const timeLabel  = entry.time ? entry.time + (entry.timeEnd ? '–' + entry.timeEnd : '') : '';
    const bodyParts  = [timeLabel, entry.type || '', entry.topic || ''].filter(Boolean);
    const body       = bodyParts.join(' · ');

    // ── Start reminder ─────────────────────────────────────────────
    if (entry.reminder && entry.reminder.minutesBefore > 0) {
      const key = String(entry.id) + '@start@' + String(entry.reminder.minutesBefore);
      if (!_shownReminders.has(key)) {
        const timeParts = (entry.time || '09:00').split(':');
        const entryMs = new Date(entry.date + 'T'
          + String(parseInt(timeParts[0], 10) || 9).padStart(2, '0') + ':'
          + String(parseInt(timeParts[1], 10) || 0).padStart(2, '0') + ':00').getTime();
        if (!isNaN(entryMs)) {
          const fireMs = entryMs - entry.reminder.minutesBefore * 60000;
          if (nowMs >= fireMs && nowMs < fireMs + 120000 && entryMs > nowMs) {
            _shownReminders.add(key);
            const mb = entry.reminder.minutesBefore;
            const whenStr = mb < 60 ? 'in ' + mb + ' min'
                          : mb === 60 ? 'in 1 hour'
                          : mb < 1440 ? 'in ' + (mb / 60) + ' hours'
                          : 'tomorrow';
            _broadcastReminder({ title: '⏰ ' + (classLabel ? classLabel + ' — ' : '') + whenStr, body });
          }
        }
      }
    }

    // ── Auto end reminder (5 min, lesson slots only) ───────────────
    if (_autoLessonEnd5Min && entry.timeEnd && (!entry.type || entry.type === 'lesson') &&
        !(entry.reminderEnd && entry.reminderEnd.minutesBefore > 0)) {
      const key = String(entry.id) + '@auto-end@5';
      if (!_shownReminders.has(key)) {
        const aeParts = entry.timeEnd.split(':');
        const aeEndMs = new Date(entry.date + 'T'
          + String(parseInt(aeParts[0], 10) || 0).padStart(2, '0') + ':'
          + String(parseInt(aeParts[1], 10) || 0).padStart(2, '0') + ':00').getTime();
        if (!isNaN(aeEndMs)) {
          const aeFireMs = aeEndMs - 5 * 60000;
          if (nowMs >= aeFireMs && nowMs < aeFireMs + 120000 && aeEndMs > nowMs) {
            _shownReminders.add(key);
            _broadcastReminder({ title: '⏰ ' + (entry.classId ? entry.classId + ' — ' : '') + '5 min left', body });
          }
        }
      }
    }

    // ── End reminder ───────────────────────────────────────────────
    if (entry.reminderEnd && entry.reminderEnd.minutesBefore > 0 && entry.timeEnd) {
      const key = String(entry.id) + '@end@' + String(entry.reminderEnd.minutesBefore);
      if (!_shownReminders.has(key)) {
        const endParts = entry.timeEnd.split(':');
        const endMs = new Date(entry.date + 'T'
          + String(parseInt(endParts[0], 10) || 0).padStart(2, '0') + ':'
          + String(parseInt(endParts[1], 10) || 0).padStart(2, '0') + ':00').getTime();
        if (!isNaN(endMs)) {
          const fireMs = endMs - entry.reminderEnd.minutesBefore * 60000;
          if (nowMs >= fireMs && nowMs < fireMs + 120000 && endMs > nowMs) {
            _shownReminders.add(key);
            const mb = entry.reminderEnd.minutesBefore;
            const whenStr = mb === 1 ? '1 min left' : mb < 60 ? mb + ' min left' : '1 hour left';
            _broadcastReminder({ title: '⏰ ' + (classLabel ? classLabel + ' — ' : '') + whenStr, body });
          }
        }
      }
    }
  }

  // ── Todo reminders ─────────────────────────────────────────────
  for (const td of _todoReminderItems) {
    if (!td.reminderAt) continue;
    const key = 'td@' + String(td.id) + '@' + td.reminderAt.slice(0, 16);
    if (!_shownReminders.has(key)) {
      const fireMs = new Date(td.reminderAt).getTime();
      if (!isNaN(fireMs) && nowMs >= fireMs && nowMs < fireMs + 120000) {
        _shownReminders.add(key);
        const label = td.text || '';
        const sub = td.dueDate ? 'Due: ' + td.dueDate : '';
        _broadcastReminder({ title: '☑ ' + label, body: sub });
      }
    }
  }
}

function _startReminderEngine() {
  _loadPlannerEntries();
  if (_reminderInterval) clearInterval(_reminderInterval);
  _reminderInterval = setInterval(_checkPlannerReminders, 60000);
  // Delay first check so windows have time to open
  setTimeout(_checkPlannerReminders, 8000);
}

ipcMain.on('planner:reload-entries', _loadPlannerEntries);

ipcMain.on('planner:reminder-dismiss', () => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('planner:reminder-dismiss');
    }
  }
});

ipcMain.handle('app:report-renderer-error', async (_event, data) => {
  try {
    const errObj = data?.error || {};
    const page = data?.page || 'unknown';
    writeCrashDump('renderer-error', { page, url: data?.url, line: data?.line, col: data?.col }, {
      message: errObj.message || data?.message || 'Renderer Error',
      name: errObj.name || 'RendererError',
      stack: errObj.stack || ''
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:get-crash-dumps', async () => {
  try {
    const dir = getCrashDumpsDir();
    if (!fsSync.existsSync(dir)) return { ok: true, dumps: [] };
    const files = (await fs.readdir(dir))
      .filter(f => f.startsWith('crash-dump_') && f.endsWith('.json'))
      .sort()
      .reverse();
    const dumps = [];
    for (const file of files.slice(0, 20)) {
      try {
        const content = await fs.readFile(path.join(dir, file), 'utf8');
        dumps.push({ filename: file, data: JSON.parse(content) });
      } catch (e) {}
    }
    return { ok: true, dumps };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:open-crash-dumps-dir', async () => {
  try {
    const dir = getCrashDumpsDir();
    shell.openPath(dir);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('app:get-latest-crash-dump', async () => {
  try {
    const dir = getCrashDumpsDir();
    const latestPath = path.join(dir, 'latest-crash-dump.json');
    if (!fsSync.existsSync(latestPath)) return { ok: true, dump: null };
    const content = await fs.readFile(latestPath, 'utf8');
    return { ok: true, dump: JSON.parse(content) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(async () => {
  startMemoryHeartbeat();
  let initialPageFile = getInitialPageFile();

  try {
    session.defaultSession.setSpellCheckerLanguages(['en-GB', 'fr-FR']);
  } catch (error) {
    console.warn('Could not set spell checker languages:', error.message);
  }

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (firstRunDetected) {
    initialPageFile = PAGE_FILES.generalConfig;
  }

  buildMenu();
  createMainWindow(initialPageFile);

  const _notifyDisplayChanged = () => {
    const count = screen.getAllDisplays().length;
    const hasSecond = count > 1;
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('display-changed', { count, hasSecond });
      }
    }
  };
  screen.on('display-added', _notifyDisplayChanged);
  screen.on('display-removed', _notifyDisplayChanged);

  // Defer heavy disk migration and seed folder initialization to background
  (async () => {
    try {
      await migrateLogFolders();
    } catch (error) {
      console.error('Log folder migration failed:', error);
    }

    try {
      await ensureWritableSeedDataWithFallback();
    } catch (error) {
      console.error('Data initialization failed:', error);
    }

    if (firstRunDetected && mainWindow && !mainWindow.isDestroyed()) {
      loadTool(PAGE_FILES.generalConfig, mainWindow).catch(() => {});
    }

    _startReminderEngine();

    // Start auto-sync watcher if the user had it enabled.
    loadAutoSyncEnabled().then(enabled => { if (enabled) startAutoSyncWatcher(); }).catch(() => {});

    // Start FTP / WebDAV auto-sync timers if configured.
    startFtpAutoSyncTimer().catch(() => {});
    startWebdavAutoSyncTimer().catch(() => {});
  })();

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

let _remoteQuitSyncDone = false;
app.on('before-quit', (event) => {
  stopQuizServer();
  if (_remoteQuitSyncDone) return;
  Promise.all([loadFtpConfig(), loadWebdavConfig()]).then(([ftpCfg, wdCfg]) => {
    const tasks = [];
    if (ftpCfg.autoSync && ftpCfg.host) tasks.push(runFtpTransfer('upload').catch(() => {}));
    if (wdCfg.autoSync && wdCfg.serverUrl) tasks.push(runWebdavTransfer('upload').catch(() => {}));
    if (tasks.length === 0) return;
    _remoteQuitSyncDone = true;
    event.preventDefault();
    Promise.all(tasks).finally(() => app.quit());
  }).catch(() => {});
});