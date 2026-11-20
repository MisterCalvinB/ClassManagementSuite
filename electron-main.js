const { app, BrowserWindow, clipboard, crashReporter, desktopCapturer, dialog, ipcMain, Menu, screen, session, shell } = require('electron');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const os     = require('os');
const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');

try {
  const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
  // Use up to 45% of total system RAM for V8 heap (clamped between 1024MB and 2048MB)
  // This prevents V8 from delaying GC until memory reaches excessive levels
  const maxOldSpace = Math.max(1024, Math.min(2048, Math.round(totalMemMB * 0.45)));
  app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${maxOldSpace} --expose-gc`);
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');

  // Linux hardening: prevent Chromium shared memory exhaustion in /dev/shm
  if (process.platform === 'linux') {
    app.commandLine.appendSwitch('disable-dev-shm-usage');
  }
} catch (swErr) {
  console.warn('Could not append Electron commandLine switches:', swErr?.message || swErr);
}

// On Linux, attempt to set OOM score to protect main process if allowed by system
if (process.platform === 'linux') {
  try {
    fsSync.writeFileSync('/proc/self/oom_score_adj', '0', 'utf8');
  } catch (_) {}
}

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
  /*learningDb2: 'manage-database2.html',*/
  learningTools: 'learning-tools.html',
  participationTracker: 'participation-tracker.html',
  launcher: 'launcher.html',
  generalConfig: 'general-config.html',
  fileManager: 'file-manager.html',
  howTo: 'how-to.html',
  about: 'about.html',
  /*credits: 'about.html',*/
  scheduleMaker: 'schedule-maker.html',
  classPlan: 'class-plan.html',
  documentEditor: 'document-editor.html',
  pdfViewer: 'pdf-viewer.html',
  planner: 'planner.html',
  lessonCreator: 'lesson-creator.html',
  importTool: 'import-tool.html',
  administrativeGroups: 'administrative-groups.html',
  oralMarking: 'oral-marking.html',
  competencePortfolio: 'competence-portfolio.html',
  databaseConverter: 'database-converter.html',
  testCreator: 'test-creator.html',
  mediaConverter: 'media-converter.html',
  dictionary: 'dictionary.html',
  setupWizard: 'setup-wizard.html'
};

const PAGE_ARG_MAP = {
  board: PAGE_FILES.board,
  classmanagement: PAGE_FILES.classManagement,
  cms: PAGE_FILES.classManagement,
  gradesheet: PAGE_FILES.gradeSheet,
  grades: PAGE_FILES.gradeSheet,
  learningdb: PAGE_FILES.learningDb,
  /*learningdb2: PAGE_FILES.learningDb2,
  dbmanager2: PAGE_FILES.learningDb2,*/
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
  /*credits: PAGE_FILES.about,*/
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
  pdfviewer: PAGE_FILES.pdfViewer,
  pdf: PAGE_FILES.pdfViewer,
  pdfstudio: PAGE_FILES.pdfViewer,
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
  maitrise: PAGE_FILES.administrativeGroups,
  competenceportfolio: PAGE_FILES.competencePortfolio,
  competences: PAGE_FILES.competencePortfolio,
  portfolio: PAGE_FILES.competencePortfolio,
  databaseconverter: PAGE_FILES.databaseConverter,
  dataconverter: PAGE_FILES.databaseConverter,
  converter: PAGE_FILES.databaseConverter,
  tableconverter: PAGE_FILES.databaseConverter,
  testcreator: PAGE_FILES.testCreator,
  test: PAGE_FILES.testCreator,
  tests: PAGE_FILES.testCreator,
  examcreator: PAGE_FILES.testCreator,
  exams: PAGE_FILES.testCreator,
  mediaconverter: PAGE_FILES.mediaConverter,
  videoconverter: PAGE_FILES.mediaConverter,
  audioconverter: PAGE_FILES.mediaConverter,
  soundconverter: PAGE_FILES.mediaConverter,
  audiotrimmer: PAGE_FILES.mediaConverter,
  mediatool: PAGE_FILES.mediaConverter,
  dictionary: PAGE_FILES.dictionary,
  dict: PAGE_FILES.dictionary,
  quickdictionary: PAGE_FILES.dictionary
};

const PAGE_LABELS = {
  [PAGE_FILES.board]: 'Board',
  [PAGE_FILES.classManagement]: 'Class Management',
  [PAGE_FILES.groupEditor]: 'Group Editor',
  [PAGE_FILES.gradeSheet]: 'Grade Sheet',
  [PAGE_FILES.learningDb]: 'Manage Database',
  /*[PAGE_FILES.learningDb2]: 'DB Manager v2',*/
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
  [PAGE_FILES.pdfViewer]: 'PDF Viewer',
  [PAGE_FILES.planner]: 'Planner',
  [PAGE_FILES.lessonCreator]: 'Lesson Creator',
  [PAGE_FILES.administrativeGroups]: 'Administrative Groups',
  [PAGE_FILES.oralMarking]: 'Oral Marking',
  [PAGE_FILES.competencePortfolio]: 'Competence Portfolio',
  [PAGE_FILES.databaseConverter]: 'Data Studio',
  [PAGE_FILES.testCreator]: 'Test Creator',
  [PAGE_FILES.mediaConverter]: 'Video & Sound Converter',
  [PAGE_FILES.dictionary]: 'Quick Dictionary',
  [PAGE_FILES.setupWizard]: 'Setup Wizard'
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

function getPortableRootConfigPath() {
  return path.join(app.getPath('userData'), 'portable-root.json');
}

function loadSavedPortableRootSync() {
  if (process.env.PORTABLE_ROOT) {
    try {
      fsSync.accessSync(path.join(process.env.PORTABLE_ROOT, 'user'), fsSync.constants.F_OK);
      return process.env.PORTABLE_ROOT;
    } catch {
      delete process.env.PORTABLE_ROOT;
    }
  }
  try {
    const configPath = getPortableRootConfigPath();
    if (fsSync.existsSync(configPath)) {
      const raw = fsSync.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      const saved = String(parsed?.portableRoot || '').trim();
      if (saved) {
        try {
          fsSync.accessSync(saved, fsSync.constants.W_OK);
          fsSync.accessSync(path.join(saved, 'user'), fsSync.constants.F_OK);
          process.env.PORTABLE_ROOT = saved;
          return saved;
        } catch {
          // Saved path inaccessible or user folder missing
        }
      }
    }
  } catch {}
  return null;
}

function getWritableRootDir() {
  if (!process.env.PORTABLE_ROOT) {
    loadSavedPortableRootSync();
  }
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

let _launcherBgCleanupInterval = null;
function startLauncherBackgroundCleanup() {
  if (_launcherBgCleanupInterval) clearInterval(_launcherBgCleanupInterval);
  _launcherBgCleanupInterval = setInterval(() => {
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.isFocused()) {
        mainWindow.webContents.executeJavaScript(
          'if (typeof window.runLauncherBackgroundMaintenance === "function") { window.runLauncherBackgroundMaintenance(); } else if (typeof window.gc === "function") { try { window.gc(); } catch(_) {} }'
        ).catch(() => {});
      }
    } catch (_) {}
  }, 10 * 60 * 1000);
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
    constellations: path.join(writableRoot, 'user/mindmaps'),
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
    customPhases: path.join(writableRoot, 'user/custom-data/phases'),
    customCriteria: path.join(writableRoot, 'user/custom-data/criteria'),
    customScales: path.join(writableRoot, 'user/custom-data/scales'),
    customChips: path.join(writableRoot, 'user/custom-data/chips'),
    customBadges: path.join(writableRoot, 'user/custom-data/badges'),
    customModes: path.join(writableRoot, 'user/custom-data/modes'),
    classPlans: path.join(writableRoot, 'user/class-plans'),
    seatingPlans: path.join(writableRoot, 'user/class-plans'),
    customExercises: path.join(writableRoot, 'user/custom-data/exercises'),
    tests: path.join(writableRoot, 'user/tests'),
    testImages: path.join(writableRoot, 'user/custom-data/test-images'),
    docEditorDocs: path.join(writableRoot, 'user/document-editor/docs'),
    docEditorStylesheets: path.join(writableRoot, 'user/document-editor/stylesheets'),
    docEditorTemplates: path.join(writableRoot, 'user/document-editor/templates'),
    docEditorSettings: path.join(writableRoot, 'user/document-editor'),
    gameResults: path.join(writableRoot, 'user/game-results'),
    gradeSheet:  path.join(writableRoot, 'user/log/grade-sheet'),
    toPrint:     path.join(writableRoot, 'user/to-print'),
    exportCss:     path.join(ROOT_DIR, 'css/export-css'),
    userExportCss: path.join(writableRoot, 'user/export-css')
  };
}

function getWritablePaths() {
  return getSaveTargets();
}

function getBundledDataRoot() {
  return path.join(ROOT_DIR, 'user', 'custom-data');
}

const PAGE_PERMISSIONS = {
  [PAGE_FILES.board]: new Set(['data', 'mindmaps', 'constellations', 'constellationTemplates', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'user', 'customBooks', 'lessons', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customChips', 'customBadges', 'customModes', 'customExercises', 'docEditorTemplates', 'docEditorStylesheets', 'docEditorSettings', 'classPlans', 'seatingPlans', 'toPrint', 'docEditorDocs', 'tests', 'customCriteria', 'customScales', 'grades', 'groupParticipation', 'gradeSheet']),
  [PAGE_FILES.classManagement]: new Set(['user', 'lessons', 'groupParticipation', 'data', 'grades', 'classPlans', 'seatingPlans', 'customBadges', 'customModes']),
  [PAGE_FILES.groupEditor]: new Set(['user', 'groupParticipation', 'grades', 'gradeSheet', 'classPlans', 'seatingPlans']),
  [PAGE_FILES.gradeSheet]: new Set(['grades', 'user', 'toPrint', 'customCriteria', 'customScales', 'customChips', 'customBadges', 'customCompetences', 'customDescriptors', 'docEditorDocs', 'tests', 'mindmaps', 'constellations', 'lessons', 'data', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customExercises', 'customBooks', 'docEditorTemplates', 'classPlans', 'seatingPlans', 'groupParticipation', 'gradeSheet', 'exportCss', 'userExportCss']),
  [PAGE_FILES.learningDb]: new Set(['data', 'user', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customCriteria', 'customScales', 'customChips', 'customBadges', 'customModes', 'customExercises', 'toPrint', 'docEditorDocs', 'tests']),
  [PAGE_FILES.learningDb2]: new Set(['data', 'user', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customBooks', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customCriteria', 'customScales', 'customChips', 'customBadges', 'customModes', 'toPrint', 'docEditorDocs', 'tests']),
  [PAGE_FILES.learningTools]: new Set(['data', 'user', 'groupParticipation', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'gameResults']),
  [PAGE_FILES.participationTracker]: new Set(['user', 'groupParticipation', 'toPrint', 'grades', 'exportCss', 'userExportCss', 'customBadges']),
  [PAGE_FILES.launcher]: new Set(['user', 'grades', 'gradeSheet', 'mindmaps', 'constellations', 'docEditorDocs', 'docEditorStylesheets', 'docEditorTemplates', 'toPrint', 'lessons', 'tests', 'data', 'customData', 'groupParticipation', 'classPlans', 'seatingPlans', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customCriteria', 'customScales', 'customChips', 'customBadges', 'customModes', 'customExercises', 'customWordbanks', 'customBooks', 'customDictations', 'customQuizzes', 'exportCss', 'userExportCss']),
  [PAGE_FILES.generalConfig]: new Set(['user']),
  [PAGE_FILES.fileManager]: new Set(['user', 'lessons', 'mindmaps', 'constellations', 'data', 'customData', 'customWordbanks', 'customBooks', 'customDictations', 'customQuizzes', 'grades', 'groupParticipation', 'docEditorDocs', 'docEditorStylesheets', 'docEditorTemplates', 'toPrint', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customCriteria', 'customScales', 'customChips', 'customBadges', 'customModes', 'customExercises', 'tests', 'testImages', 'classPlans', 'seatingPlans', 'gradeSheet', 'exportCss', 'userExportCss']),
  [PAGE_FILES.howTo]: new Set(['user', 'app']),
  [PAGE_FILES.credits]: new Set([]),
  [PAGE_FILES.scheduleMaker]: new Set(['user', 'data', 'toPrint', 'docEditorDocs', 'grades', 'groupParticipation', 'tests', 'customCriteria', 'customScales', 'customCompetences', 'lessons', 'mindmaps', 'exportCss', 'userExportCss']),
  [PAGE_FILES.classPlan]: new Set(['user', 'classPlans', 'seatingPlans', 'groupParticipation']),
  [PAGE_FILES.documentEditor]: new Set(['docEditorDocs', 'docEditorStylesheets', 'docEditorTemplates', 'docEditorSettings', 'user', 'app', 'mindmaps', 'constellations', 'data', 'customData', 'customWordbanks', 'customBooks', 'customDictations', 'customQuizzes', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customPhases', 'customActivities', 'customChips', 'customExercises', 'classPlans', 'seatingPlans', 'grades', 'groupParticipation', 'gradeSheet', 'toPrint', 'tests', 'customCriteria', 'customScales', 'customCompetences', 'customDescriptors', 'lessons', 'exportCss', 'userExportCss']),
  [PAGE_FILES.pdfViewer]: new Set(['user', 'toPrint', 'docEditorDocs', 'data', 'lessons', 'mindmaps', 'constellations', 'grades', 'exportCss', 'userExportCss']),
  [PAGE_FILES.planner]: new Set(['user', 'lessons', 'groupParticipation', 'grades', 'mindmaps', 'constellations', 'toPrint', 'docEditorDocs', 'tests', 'customCriteria', 'customScales', 'customCompetences', 'customDescriptors', 'data', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customBooks', 'customChips', 'customExercises', 'docEditorTemplates', 'classPlans', 'seatingPlans', 'exportCss', 'userExportCss']),
  [PAGE_FILES.lessonCreator]: new Set(['user', 'lessons', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'mindmaps', 'constellations', 'toPrint', 'docEditorDocs', 'tests', 'customCriteria', 'customScales', 'grades', 'groupParticipation', 'data', 'customData', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customBooks', 'customChips', 'customExercises', 'docEditorTemplates', 'classPlans', 'seatingPlans', 'exportCss', 'userExportCss']),
  [PAGE_FILES.importTool]: new Set(['user', 'lessons', 'groupParticipation', 'customWordbanks', 'customQuizzes', 'customGapfillbanks', 'customQuotes', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'data', 'docEditorDocs', 'customBooks', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customExercises', 'classPlans', 'seatingPlans']),
  [PAGE_FILES.administrativeGroups]: new Set(['user', 'grades', 'groupParticipation', 'data', 'customData', 'toPrint', 'docEditorDocs', 'exportCss', 'userExportCss']),
  [PAGE_FILES.oralMarking]: new Set(['user', 'grades', 'groupParticipation']),
  [PAGE_FILES.competencePortfolio]: new Set(['user', 'lessons', 'mindmaps', 'constellations', 'grades', 'groupParticipation', 'customCompetences', 'customDescriptors', 'toPrint', 'tests', 'docEditorDocs', 'customCriteria', 'customScales', 'data', 'customData', 'customWordbanks', 'docEditorTemplates']),
  [PAGE_FILES.testCreator]: new Set(['user', 'tests', 'testImages', 'customExercises', 'data', 'customData', 'grades', 'groupParticipation', 'classPlans', 'seatingPlans', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customCompetences', 'customDescriptors', 'customCriteria', 'customScales', 'customChips', 'toPrint', 'docEditorDocs', 'mindmaps', 'constellations', 'lessons', 'exportCss', 'userExportCss']),
  [PAGE_FILES.databaseConverter]: new Set(['user', 'data', 'customData', 'toPrint', 'docEditorDocs', 'groupParticipation', 'customWordbanks', 'customQuotes', 'customGapfillbanks', 'customErrorbanks', 'customDictations', 'customGrammarbanks', 'customSentences', 'customStorybanks', 'customQuizzes', 'customCompetences', 'customDescriptors', 'customPhases', 'customActivities', 'customCriteria', 'customScales', 'customChips', 'customExercises']),
  [PAGE_FILES.setupWizard]: new Set(['user', 'classPlans', 'seatingPlans', 'grades', 'gradeSheet'])
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

// ── Presentation & Mirror Window Registry ────────────────────────────────────
let mirrorWindow = null;
let mirrorWindowSource = null;
let cmsPresentationWindow = null;
let cmsPresentationSourceWindow = null;
let learningToolsPresentationWindow = null;
let learningToolsPresentationSourceWindow = null;
let oralPresenterWindow = null;
let oralPresenterSourceWindow = null;
let docPresentationWindow = null;
let docPresentationSourceWindow = null;
let pdfPresentationWindow = null;
let pdfPresentationSourceWindow = null;

function isPresentationWindow(win) {
  if (!win || win.isDestroyed()) return false;
  if (win === cmsPresentationWindow) return true;
  if (win === mirrorWindow) return true;
  if (win === learningToolsPresentationWindow) return true;
  if (win === oralPresenterWindow) return true;
  if (win === docPresentationWindow) return true;
  if (win === pdfPresentationWindow) return true;
  if (typeof timerDetachedWindow !== 'undefined' && win === timerDetachedWindow) return true;
  try {
    const u = win.webContents ? win.webContents.getURL() : '';
    if (u && /[?&](presentation|wwPresentation|ltPresentation)=/i.test(u)) {
      return true;
    }
  } catch (_) {}
  return false;
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

// ── Session State Persistence & Crash Recovery ──────────────────────────────
const _windowSessionContexts = new Map(); // win.id -> context object
let _sessionSaveDebounceTimer = null;
let _isQuittingCleanly = false;

function getSessionStateFilePath() {
  const writableRoot = getWritableRootDir();
  return path.join(writableRoot, 'user', 'session-state.json');
}

function getActiveSessionSnapshot(cleanQuit = false) {
  const windows = [];
  try {
    const allWins = BrowserWindow.getAllWindows();
    const validPageFiles = new Set(Object.values(PAGE_FILES));

    for (const win of allWins) {
      if (!win || win.isDestroyed()) continue;

      // Filter out internal presentation, mirror, or detached secondary display windows
      if (isPresentationWindow(win)) {
        continue;
      }

      const pageFile = getLoadedPageFile(win);
      if (!pageFile || pageFile === 'unknown' || !validPageFiles.has(pageFile)) {
        continue;
      }

      let bounds = null;
      try {
        bounds = win.getBounds();
      } catch (_) {}

      const isMaximized = typeof win.isMaximized === 'function' ? win.isMaximized() : false;
      const isFullScreen = typeof win.isFullScreen === 'function' ? win.isFullScreen() : false;
      const isMainWindow = (win === mainWindow);
      const context = _windowSessionContexts.get(win.id) || null;

      windows.push({
        pageFile,
        bounds,
        isMaximized,
        isFullScreen,
        isMainWindow,
        context
      });
    }
  } catch (err) {
    console.warn('[SessionState] Failed to snapshot windows:', err);
  }

  return {
    timestamp: Date.now(),
    cleanQuit: !!cleanQuit,
    windows
  };
}

function saveSessionStateSync(cleanQuit = false) {
  if (_sessionSaveDebounceTimer) {
    clearTimeout(_sessionSaveDebounceTimer);
    _sessionSaveDebounceTimer = null;
  }
  try {
    const snapshot = getActiveSessionSnapshot(cleanQuit);

    // If current snapshot has no windows (which happens during shutdown when windows
    // have already closed/been destroyed, or when Task Manager terminates windows),
    // preserve the last known non-empty windows list!
    if (!snapshot.windows || snapshot.windows.length === 0) {
      const existing = readSavedSessionState();
      if (existing && Array.isArray(existing.windows) && existing.windows.length > 0) {
        snapshot.windows = existing.windows;
      }
    }

    const filePath = getSessionStateFilePath();
    const userDir = path.dirname(filePath);
    if (!fsSync.existsSync(userDir)) {
      fsSync.mkdirSync(userDir, { recursive: true });
    }
    fsSync.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SessionState] Synchronous save failed:', err?.message || err);
  }
}

function scheduleSaveSessionState(delayMs = 600) {
  if (_isQuittingCleanly) return;
  if (_sessionSaveDebounceTimer) {
    clearTimeout(_sessionSaveDebounceTimer);
  }
  _sessionSaveDebounceTimer = setTimeout(() => {
    _sessionSaveDebounceTimer = null;
    try {
      saveSessionStateSync(false);
    } catch (_) {}
  }, delayMs);
}

function readSavedSessionState() {
  try {
    const filePath = getSessionStateFilePath();
    if (!fsSync.existsSync(filePath)) return null;
    const raw = fsSync.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[SessionState] Could not read saved session state:', err?.message || err);
    return null;
  }
}

function registerWindowForSessionState(win, initialContext = null) {
  if (!win || win.isDestroyed()) return;
  if (initialContext) {
    _windowSessionContexts.set(win.id, initialContext);
  }
  const onGeometryChange = () => scheduleSaveSessionState(800);
  win.on('move', onGeometryChange);
  win.on('resize', onGeometryChange);
  win.once('closed', () => {
    _windowSessionContexts.delete(win.id);
    // If other windows are still open, update snapshot.
    // If this was the last window closing, preserve the last state instead of writing []!
    const remaining = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed() && w !== win);
    if (remaining.length > 0) {
      scheduleSaveSessionState(300);
    }
  });
  scheduleSaveSessionState(500);
}

function _hasBoardFile(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.openLocalSession || item.localSession) {
    const id = String(item.openLocalEntryId || item.entryId || '').trim();
    if (id) return true;
  }
  const fn = String(item.openFilename || item.filename || item.openRelPath || item.relativePath || item.file || '').trim();
  return !!fn;
}

function _areBoardFilesEqual(a, b) {
  if (!a || !b) return false;
  const isLocalA = !!(a.openLocalSession || a.localSession);
  const isLocalB = !!(b.openLocalSession || b.localSession);
  if (isLocalA || isLocalB) {
    if (isLocalA !== isLocalB) return false;
    const modeA = String(a.openLocalMode || a.mode || '').trim().toLowerCase();
    const modeB = String(b.openLocalMode || b.mode || '').trim().toLowerCase();
    const idA = String(a.openLocalEntryId || a.entryId || '').trim();
    const idB = String(b.openLocalEntryId || b.entryId || '').trim();
    return modeA === modeB && idA === idB && idA !== '';
  }

  const fnA = String(a.openFilename || a.filename || a.file || '').trim().toLowerCase();
  const fnB = String(b.openFilename || b.filename || b.file || '').trim().toLowerCase();
  const relA = String(a.openRelPath || a.relativePath || a.file || a.openFilename || a.filename || '').trim().replace(/\\/g, '/').toLowerCase();
  const relB = String(b.openRelPath || b.relativePath || b.file || b.openFilename || b.filename || '').trim().replace(/\\/g, '/').toLowerCase();

  if (fnA && fnB && fnA === fnB) return true;
  if (relA && relB && relA === relB) return true;
  return false;
}

function _hasDocumentFile(item) {
  if (!item || typeof item !== 'object') return false;
  const disk = String(item.editAbsPath || item.absPath || item.diskPath || '').trim();
  if (disk) return true;
  const rel = String(item.editRelPath || item.relPath || item.relativePath || item.filename || item.file || '').trim();
  return !!rel;
}

function _normalizeDocTarget(target) {
  const t = String(target || '').trim().toLowerCase();
  return t || 'doceditordocs';
}

function _normalizeDocPath(p) {
  if (!p) return '';
  let s = String(p).trim().replace(/\\/g, '/').toLowerCase();
  s = s.replace(/^\/+/, '');
  if (s.startsWith('user/document-editor/docs/')) s = s.slice('user/document-editor/docs/'.length);
  else if (s.startsWith('document-editor/docs/')) s = s.slice('document-editor/docs/'.length);
  else if (s.startsWith('doceditordocs/')) s = s.slice('doceditordocs/'.length);
  else if (s.startsWith('doceditor/')) s = s.slice('doceditor/'.length);
  return s;
}

function _areDocumentFilesEqual(a, b) {
  if (!a || !b) return false;
  const diskA = String(a.editAbsPath || a.absPath || a.diskPath || '').trim().replace(/\\/g, '/').toLowerCase();
  const diskB = String(b.editAbsPath || b.absPath || b.diskPath || '').trim().replace(/\\/g, '/').toLowerCase();
  if (diskA && diskB) return diskA === diskB;
  if (diskA || diskB) return false;

  const targetA = _normalizeDocTarget(a.editTarget || a.target);
  const targetB = _normalizeDocTarget(b.editTarget || b.target);
  const relA = _normalizeDocPath(a.editRelPath || a.relPath || a.relativePath || a.filename || a.file);
  const relB = _normalizeDocPath(b.editRelPath || b.relPath || b.relativePath || b.filename || b.file);
  if (!relA || !relB) return false;
  return targetA === targetB && relA === relB;
}

function _hasPdfFile(item) {
  if (!item || typeof item !== 'object') return false;
  const disk = String(item.openAbsPath || item.absPath || item.diskPath || item.pdfPath || '').trim();
  if (disk) return true;
  const rel = String(item.openRelPath || item.relPath || item.relativePath || item.file || item.filename || item.pdfRelPath || item.pdfFilename || '').trim();
  return !!rel;
}

function _arePdfFilesEqual(a, b) {
  if (!a || !b) return false;
  const diskA = String(a.openAbsPath || a.absPath || a.diskPath || a.pdfPath || '').trim().replace(/\\/g, '/').toLowerCase();
  const diskB = String(b.openAbsPath || b.absPath || b.diskPath || b.pdfPath || '').trim().replace(/\\/g, '/').toLowerCase();
  if (diskA && diskB) return diskA === diskB;
  if (diskA || diskB) return false;

  const targetA = String(a.openTarget || a.target || a.pdfTarget || '').trim().toLowerCase();
  const targetB = String(b.openTarget || b.target || b.pdfTarget || '').trim().toLowerCase();
  const relA = String(a.openRelPath || a.relPath || a.relativePath || a.file || a.filename || a.pdfRelPath || a.pdfFilename || '').trim().replace(/\\/g, '/').toLowerCase();
  const relB = String(b.openRelPath || b.relPath || b.relativePath || b.file || b.filename || b.pdfRelPath || b.pdfFilename || '').trim().replace(/\\/g, '/').toLowerCase();
  if (!relA || !relB) return false;
  if (targetA || targetB) {
    return targetA === targetB && relA === relB;
  }
  return relA === relB;
}

function _isMultiWindowFileTool(pageFile) {
  return pageFile === PAGE_FILES.board ||
         pageFile === PAGE_FILES.documentEditor ||
         pageFile === PAGE_FILES.pdfViewer;
}

function _hasToolFile(pageFile, item) {
  if (!item || typeof item !== 'object') return false;
  if (pageFile === PAGE_FILES.board) return _hasBoardFile(item);
  if (pageFile === PAGE_FILES.documentEditor) return _hasDocumentFile(item);
  if (pageFile === PAGE_FILES.pdfViewer) return _hasPdfFile(item);
  return false;
}

function _areToolFilesEqual(pageFile, a, b) {
  if (!a || !b) return false;
  if (pageFile === PAGE_FILES.board) return _areBoardFilesEqual(a, b);
  if (pageFile === PAGE_FILES.documentEditor) return _areDocumentFilesEqual(a, b);
  if (pageFile === PAGE_FILES.pdfViewer) return _arePdfFilesEqual(a, b);
  return false;
}

function _extractInitialContext(pageFile, query) {
  if (!query) return null;
  if (pageFile === PAGE_FILES.board) {
    return {
      target: query.openTarget || query.target || 'mindmaps',
      filename: query.openFilename || query.filename || query.file || '',
      relativePath: query.openRelPath || query.relativePath || query.file || query.openFilename || '',
      section: query.openSection || query.section || 'constellation',
      isDirty: false
    };
  }
  if (pageFile === PAGE_FILES.documentEditor) {
    const diskPath = query.editAbsPath || query.absPath || query.diskPath || null;
    const rel = query.editRelPath || query.relPath || query.relativePath || query.file || query.filename || '';
    return {
      target: diskPath ? null : (query.editTarget || query.target || 'docEditorDocs'),
      filename: (diskPath || rel || '').split(/[\/\\]/).pop(),
      relativePath: rel,
      diskPath: diskPath,
      isDirty: false
    };
  }
  if (pageFile === PAGE_FILES.pdfViewer) {
    const diskPath = query.openAbsPath || query.absPath || query.diskPath || null;
    const rel = query.openRelPath || query.relPath || query.relativePath || query.file || query.filename || '';
    return {
      target: diskPath ? null : (query.openTarget || query.target || 'user'),
      filename: (diskPath || rel || '').split(/[\/\\]/).pop(),
      relativePath: rel,
      diskPath: diskPath,
      isDirty: false
    };
  }
  return null;
}

function _buildSessionWindowQuery(item) {
  const query = {};
  if (!item || !item.context) return query;
  if (item.pageFile === PAGE_FILES.board && item.context.filename) {
    query.openSession = '1';
    query.openTarget = item.context.target || 'mindmaps';
    query.openFilename = item.context.filename;
    query.openRelPath = item.context.relativePath || item.context.filename;
    query.openSection = item.context.section || 'constellation';
  } else if (item.pageFile === PAGE_FILES.documentEditor) {
    if (item.context.diskPath) {
      query.editAbsPath = item.context.diskPath;
    } else if (item.context.relativePath || item.context.filename) {
      query.editTarget = item.context.target || 'docEditorDocs';
      query.editRelPath = item.context.relativePath || item.context.filename;
    }
  } else if (item.pageFile === PAGE_FILES.pdfViewer) {
    if (item.context.diskPath) {
      query.openAbsPath = item.context.diskPath;
    } else if (item.context.relativePath || item.context.filename) {
      query.openTarget = item.context.target || 'user';
      query.openRelPath = item.context.relativePath || item.context.filename;
    }
  }
  return query;
}

function restoreSavedSession(savedSession) {
  if (!savedSession || !Array.isArray(savedSession.windows) || savedSession.windows.length === 0) {
    return false;
  }

  console.log(`[SessionState] Recovering ${savedSession.windows.length} window(s) after unexpected shutdown...`);

  // Identify launcher window if it was recorded as open
  const launcherEntry = savedSession.windows.find(w => w && w.pageFile === PAGE_FILES.launcher);
  // All other windows are tool windows (exclude duplicate launcher entries if any)
  const toolWindows = savedSession.windows.filter(w => w && w.pageFile && w.pageFile !== PAGE_FILES.launcher);

  // If launcher was open, restore it as mainWindow with its previous bounds/state.
  // If launcher was NOT open, the launcher must also open as mainWindow!
  if (launcherEntry) {
    const launcherQuery = { restore: '1', ..._buildSessionWindowQuery(launcherEntry) };
    const launcherOpts = {
      bounds: launcherEntry.bounds,
      isMaximized: launcherEntry.isMaximized,
      query: launcherQuery
    };
    createMainWindow(PAGE_FILES.launcher, launcherOpts);
    if (launcherEntry.context && mainWindow && !mainWindow.isDestroyed()) {
      _windowSessionContexts.set(mainWindow.id, launcherEntry.context);
    }
  } else {
    console.log('[SessionState] Launcher was not opened in saved session; reopening launcher alongside restored tools.');
    createMainWindow(PAGE_FILES.launcher, { query: { restore: '1' } });
  }

  // Restore all recorded tool windows
  for (const w of toolWindows) {
    const toolQuery = _buildSessionWindowQuery(w);
    const toolOpts = {
      ...(w.bounds || {}),
      isMaximized: w.isMaximized,
      query: Object.keys(toolQuery).length ? toolQuery : undefined
    };

    const toolWin = createToolWindow(w.pageFile, toolOpts);
    if (w.context && toolWin && !toolWin.isDestroyed()) {
      _windowSessionContexts.set(toolWin.id, w.context);
    }
  }

  return true;
}

function handleTerminationSignal(signal) {
  console.log(`[Signal] Received ${signal}. Flushing session state to disk...`);
  try {
    saveSessionStateSync(false); // Mark as killed/unclean exit so restart can recover
  } catch (err) {
    console.warn('Error flushing session state on signal:', err);
  }
  process.exit(128 + (signal === 'SIGTERM' ? 15 : (signal === 'SIGINT' ? 2 : 1)));
}

process.on('SIGTERM', () => handleTerminationSignal('SIGTERM'));
process.on('SIGINT', () => handleTerminationSignal('SIGINT'));
process.on('SIGHUP', () => handleTerminationSignal('SIGHUP'));

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

// ── Zoom Management & Presentation Synchronization ───────────────────────────
function getAssociatedPresenterWindow(win) {
  if (!win || win.isDestroyed()) return null;
  if (win === mirrorWindowSource && mirrorWindow && !mirrorWindow.isDestroyed()) return mirrorWindow;
  if (win === cmsPresentationSourceWindow && cmsPresentationWindow && !cmsPresentationWindow.isDestroyed()) return cmsPresentationWindow;
  if (win === learningToolsPresentationSourceWindow && learningToolsPresentationWindow && !learningToolsPresentationWindow.isDestroyed()) return learningToolsPresentationWindow;
  if (win === oralPresenterSourceWindow && oralPresenterWindow && !oralPresenterWindow.isDestroyed()) return oralPresenterWindow;
  if (win === docPresentationSourceWindow && docPresentationWindow && !docPresentationWindow.isDestroyed()) return docPresentationWindow;
  return null;
}

function getAssociatedSourceWindow(win) {
  if (!win || win.isDestroyed()) return null;
  if (win === mirrorWindow && mirrorWindowSource && !mirrorWindowSource.isDestroyed()) return mirrorWindowSource;
  if (win === cmsPresentationWindow && cmsPresentationSourceWindow && !cmsPresentationSourceWindow.isDestroyed()) return cmsPresentationSourceWindow;
  if (win === learningToolsPresentationWindow && learningToolsPresentationSourceWindow && !learningToolsPresentationSourceWindow.isDestroyed()) return learningToolsPresentationSourceWindow;
  if (win === oralPresenterWindow && oralPresenterSourceWindow && !oralPresenterSourceWindow.isDestroyed()) return oralPresenterSourceWindow;
  if (win === docPresentationWindow && docPresentationSourceWindow && !docPresentationSourceWindow.isDestroyed()) return docPresentationSourceWindow;
  return null;
}

function setWindowZoom(win, factor) {
  if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return;
  const clamped = Math.max(0.5, Math.min(3.0, Number(factor.toFixed(2))));
  try {
    win.webContents.setZoomFactor(clamped);
  } catch (err) {
    console.warn('Failed to setZoomFactor on window:', err);
  }

  // Synchronize to associated presenter/mirror window
  const presenter = getAssociatedPresenterWindow(win);
  if (presenter && !presenter.isDestroyed() && presenter.webContents && !presenter.webContents.isDestroyed()) {
    try {
      presenter.webContents.setZoomFactor(clamped);
    } catch (pErr) {
      console.warn('Failed to sync zoom to presenter window:', pErr);
    }
  }

  // Synchronize back to source window if zoom was changed directly from presenter window
  const source = getAssociatedSourceWindow(win);
  if (source && !source.isDestroyed() && source.webContents && !source.webContents.isDestroyed()) {
    try {
      source.webContents.setZoomFactor(clamped);
    } catch (sErr) {
      console.warn('Failed to sync zoom to source window:', sErr);
    }
  }
}

function setupWindowZoomShortcuts(win) {
  if (!win || win._zoomShortcutsSetup || !win.webContents) return;
  win._zoomShortcutsSetup = true;

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const isCtrl = process.platform === 'darwin' ? input.meta : input.control;
    if (!isCtrl) return;

    // Zoom In: Ctrl + +, Ctrl + =, Ctrl + NumpadAdd
    const isZoomIn = (
      input.key === '+' ||
      input.key === '=' ||
      input.code === 'NumpadAdd' ||
      (input.code === 'Equal' && input.shift)
    );

    // Zoom Out: Ctrl + -, Ctrl + _, Ctrl + NumpadSubtract
    const isZoomOut = (
      input.key === '-' ||
      input.key === '_' ||
      input.code === 'NumpadSubtract' ||
      input.code === 'Minus'
    );

    // Reset Zoom: Ctrl + 0, Ctrl + Numpad0
    const isZoomReset = (
      input.key === '0' ||
      input.code === 'Digit0' ||
      input.code === 'Numpad0'
    );

    if (isZoomIn) {
      event.preventDefault();
      const current = win.webContents.getZoomFactor() || 1.0;
      setWindowZoom(win, current + 0.1);
    } else if (isZoomOut) {
      event.preventDefault();
      const current = win.webContents.getZoomFactor() || 1.0;
      setWindowZoom(win, current - 0.1);
    } else if (isZoomReset) {
      event.preventDefault();
      setWindowZoom(win, 1.0);
    }
  });
}

app.on('browser-window-created', (event, win) => {
  setupWindowZoomShortcuts(win);
  if (win && !win._closeIntentTracked) {
    win._closeIntentTracked = true;
    win.on('close', () => {
      win._lastCloseAttemptAt = Date.now();
    });
  }
});

function setupWindowExternalLinkHandling(win) {
  if (!win || !win.webContents) return;
  setupWindowZoomShortcuts(win);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) {
      shell.openExternal(url).catch((err) => {
        console.warn('Failed to open external URL from window.open:', url, err);
      });
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url)) return;
      event.preventDefault();
      shell.openExternal(url).catch((err) => {
        console.warn('Failed to open external URL on will-navigate:', url, err);
      });
      return;
    }
    if (!/^file:\/\//i.test(url)) {
      event.preventDefault();
    }
  });

  win.webContents.on('render-process-gone', (event, details) => {
    const pageFile = typeof getLoadedPageFile === 'function' ? getLoadedPageFile(win) : 'unknown';
    console.error(`[ProcessCrash] Render process gone for window (${pageFile}):`, details);
    writeCrashDump('render-process-gone', { pageFile, details });
    if (win === mirrorWindow) {
      mirrorWindow = null;
      mirrorWindowSource = null;
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
      sandbox: true,
      backgroundThrottling: false
    }
  };
  if (typeof options.x === 'number') browserOpts.x = options.x;
  if (typeof options.y === 'number') browserOpts.y = options.y;

  const win = new BrowserWindow(browserOpts);

  if (options.isMaximized) {
    win.once('ready-to-show', () => {
      if (win && !win.isDestroyed()) win.maximize();
    });
  }

  setupWindowExternalLinkHandling(win);
  registerWindowForSessionState(win, options.initialContext || null);
  win.on('close', (event) => {
    const currentPage = getLoadedPageFile(win);

    // Close associated presentation/mirror windows when their parent tool closes
    if (currentPage === PAGE_FILES.board && mirrorWindow && !mirrorWindow.isDestroyed() && win === mirrorWindowSource) {
      mirrorWindow.close();
      mirrorWindow = null;
      mirrorWindowSource = null;
    }
    if (currentPage === PAGE_FILES.classManagement && cmsPresentationWindow && !cmsPresentationWindow.isDestroyed() && win === cmsPresentationSourceWindow) {
      cmsPresentationWindow.close();
      cmsPresentationWindow = null;
      cmsPresentationSourceWindow = null;
    }
    if (currentPage === PAGE_FILES.learningTools && learningToolsPresentationWindow && !learningToolsPresentationWindow.isDestroyed() && win === learningToolsPresentationSourceWindow) {
      learningToolsPresentationWindow.close();
      learningToolsPresentationWindow = null;
      learningToolsPresentationSourceWindow = null;
    }
    if (currentPage === PAGE_FILES.oralMarking && oralPresenterWindow && !oralPresenterWindow.isDestroyed() && win === oralPresenterSourceWindow) {
      oralPresenterWindow.close();
      oralPresenterWindow = null;
      oralPresenterSourceWindow = null;
    }
    if (currentPage === PAGE_FILES.documentEditor && docPresentationWindow && !docPresentationWindow.isDestroyed() && win === docPresentationSourceWindow) {
      docPresentationWindow.close();
      docPresentationWindow = null;
      docPresentationSourceWindow = null;
    }
    if (currentPage === PAGE_FILES.pdfViewer && pdfPresentationWindow && !pdfPresentationWindow.isDestroyed() && win === pdfPresentationSourceWindow) {
      pdfPresentationWindow.close();
      pdfPresentationWindow = null;
      pdfPresentationSourceWindow = null;
    }
  });
  loadTool(pageFile, win, options).catch((error) => {
    console.error(`Failed to load ${pageFile} in new window:`, error);
  });
  return win;
}

function buildMenu() {
  const MENU_GROUPS = [
    { label: 'Classroom', keys: ['launcher', 'classManagement', 'board', 'learningTools', 'oralMarking', 'classPlan'] },
    { label: 'Planning & Content', keys: ['planner', 'lessonCreator', 'testCreator', 'documentEditor', 'pdfViewer', 'dictionary'] },
    { label: 'Students & Grades', keys: ['groupEditor', 'administrativeGroups', 'gradeSheet', 'participationTracker', 'competencePortfolio', 'scheduleMaker'] },
    { label: 'Data & Utilities', keys: ['learningDb', 'databaseConverter', 'fileManager', 'mediaConverter'] },
    { label: 'App', keys: ['generalConfig', 'setupWizard', 'howTo', 'about'] }
  ];
  const makeItem = (pageFile) => ({
    label: PAGE_LABELS[pageFile],
    click: () => {
      createToolWindow(pageFile);
    }
  });
  const used = new Set();
  const toolMenu = [];
  MENU_GROUPS.forEach((group) => {
    const items = group.keys
      .map((key) => PAGE_FILES[key])
      .filter((pageFile) => pageFile && PAGE_LABELS[pageFile])
      .map((pageFile) => { used.add(pageFile); return makeItem(pageFile); });
    if (items.length) toolMenu.push({ label: group.label, submenu: items });
  });
  const otherItems = Object.values(PAGE_FILES)
    .filter((pageFile) => !used.has(pageFile) && PAGE_LABELS[pageFile])
    .map(makeItem);
  if (otherItems.length) toolMenu.push({ label: 'Other', submenu: otherItems });

  const template = [
    {
      label: 'Apps',
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

function createMainWindow(initialPageFile = PAGE_FILES.launcher, options = {}) {
  const browserOpts = {
    width: (options.bounds && typeof options.bounds.width === 'number') ? options.bounds.width : 1600,
    height: (options.bounds && typeof options.bounds.height === 'number') ? options.bounds.height : 1000,
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  };
  if (options.bounds && typeof options.bounds.x === 'number') browserOpts.x = options.bounds.x;
  if (options.bounds && typeof options.bounds.y === 'number') browserOpts.y = options.bounds.y;

  mainWindow = new BrowserWindow(browserOpts);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (options.isMaximized) {
        mainWindow.maximize();
      }
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
  registerWindowForSessionState(mainWindow);
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.executeJavaScript('if (typeof window.gc === "function") { try { window.gc(); } catch(_) {} }').catch(() => {});
    }
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_) {}
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadTool(initialPageFile, mainWindow, options).catch((error) => {
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
  let allowedTargets = PAGE_PERMISSIONS[pageFile];
  if (!allowedTargets && typeof pageFile === 'string' && pageFile.startsWith('cmt-open-')) {
    allowedTargets = new Set(['toPrint', 'user', 'grades', 'docEditorDocs']);
  }
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

// Map to serialize concurrent writes to the exact same file path,
// preventing concurrent write/rename collisions (e.g. rapid auto-saves or cloud sync).
const _fileWriteQueues = new Map();

async function _doAtomicWriteFile(filePath, finalDir, finalName, data, encoding, mtimeMs) {
  await fs.mkdir(finalDir, { recursive: true });

  // Use a unique process/timestamp-tagged sibling temp file so external watchers (OneDrive, AV)
  // or simultaneous calls will never collide on the exact same temp filename.
  const randTag = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  const tmpPath = path.join(finalDir, '.' + finalName + '.' + randTag + '.tmp');

  try {
    await fs.writeFile(tmpPath, data, encoding === 'base64' ? undefined : 'utf8');

    // Attempt atomic rename with retry mechanism for Windows/OneDrive locks
    let renamed = false;
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await fs.rename(tmpPath, filePath);
        renamed = true;
        break;
      } catch (renameErr) {
        lastErr = renameErr;
        // On Windows and cloud-synced folders (OneDrive, Dropbox), rename frequently fails with:
        // EPERM / EACCES (file locked by scanner or OneDrive sync)
        // EEXIST (destination exists and atomic rename unsupported on target filesystem)
        // EBUSY (resource busy)
        if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST' || renameErr.code === 'EBUSY' || renameErr.code === 'EACCES') {
          if (attempt >= 1) {
            await fs.unlink(filePath).catch(() => {});
          }
          await new Promise(r => setTimeout(r, (attempt + 1) * 35));
        } else {
          break;
        }
      }
    }

    if (!renamed) {
      // Fallback: If rename persistently failed (e.g. OneDrive virtual file lock or cross-link), try copyFile + unlink
      try {
        await fs.copyFile(tmpPath, filePath);
        await fs.unlink(tmpPath).catch(() => {});
        renamed = true;
      } catch (copyErr) {
        throw lastErr || copyErr;
      }
    }
  } catch (err) {
    // Clean up the temp file on failure so it doesn't linger.
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }

  if (mtimeMs) {
    const t = new Date(Number(mtimeMs));
    await fs.utimes(filePath, t, t).catch(() => {});
  }

  return {
    filename: finalName,
    path: filePath
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
  let data;
  if (encoding === 'base64') {
    let rawB64 = String(file.content || '');
    const commaIdx = rawB64.indexOf(',');
    if (rawB64.startsWith('data:') && commaIdx !== -1) {
      rawB64 = rawB64.slice(commaIdx + 1);
    }
    data = Buffer.from(rawB64, 'base64');
  } else {
    data = String(file.content || '');
  }

  const queueKey = path.resolve(filePath);
  const prevWritePromise = _fileWriteQueues.get(queueKey) || Promise.resolve();
  let releaseQueue;
  const currentWritePromise = new Promise(resolve => { releaseQueue = resolve; });
  _fileWriteQueues.set(queueKey, currentWritePromise);

  try {
    await prevWritePromise.catch(() => {});
    return await _doAtomicWriteFile(filePath, finalDir, finalName, data, encoding, file.mtimeMs);
  } finally {
    releaseQueue();
    if (_fileWriteQueues.get(queueKey) === currentWritePromise) {
      _fileWriteQueues.delete(queueKey);
    }
  }
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

const _sessionMetaCache = new Map();

function normalizePlannerEntryIds(...sources) {
  const out = [];
  const seen = new Set();
  const addOne = (val) => {
    if (Array.isArray(val)) {
      for (const item of val) addOne(item);
      return;
    }
    if (typeof val !== 'string' && typeof val !== 'number') return;
    const parts = String(val).split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  };
  for (const src of sources) addOne(src);
  return out;
}

async function readSessionTimestampMetaFast(filePath, ext, knownSize, mtimeMs = 0) {
  const cacheKey = `${filePath}:${knownSize || 0}:${mtimeMs || 0}`;
  if (_sessionMetaCache.has(cacheKey)) {
    return Object.assign({}, _sessionMetaCache.get(cacheKey));
  }

  const meta = {};
  if (ext === '.cstz' || ext === '.zip') {
    try {
      const zipBuffer = await fs.readFile(filePath);
      const entries = await parseZipEntries(zipBuffer, (name) => {
        const n = (normalizeZipEntryPath(name) || name).toLowerCase();
        return n === 'manifest.json' || n === 'board.json';
      });
      let manifest = null;
      let boardData = null;
      for (const entry of entries) {
        const normName = normalizeZipEntryPath(entry.name) || entry.name;
        if (normName === 'manifest.json') {
          try { manifest = JSON.parse(entry.data.toString('utf8')); } catch {}
          if (manifest && (manifest.classGroup || manifest.plannerEntryIds || manifest.plannerEntryId || manifest.createdAt || manifest.updatedAt)) {
            break;
          }
        } else if (normName === 'board.json' && !manifest) {
          try { boardData = JSON.parse(entry.data.toString('utf8')); } catch {}
        }
      }
      if (manifest || boardData) {
        meta.sessionType = (manifest && manifest.format) || (boardData && boardData._type) || 'constellation';
        meta.classGroup = (manifest && manifest.classGroup) || (boardData && (boardData._classGroup || boardData.classGroup)) || '';
        const pids = normalizePlannerEntryIds(
          manifest && manifest.plannerEntryIds,
          manifest && manifest._plannerEntryIds,
          manifest && manifest.plannerEntryId,
          boardData && boardData._plannerEntryIds,
          boardData && boardData.plannerEntryIds,
          boardData && boardData._plannerEntryId,
          boardData && boardData.plannerEntryId,
          boardData && boardData.manifest && boardData.manifest.plannerEntryIds,
          boardData && boardData.manifest && boardData.manifest.plannerEntryId
        );
        meta.plannerEntryIds = pids;
        meta.plannerEntryId = pids[0] || '';

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
    if (!meta.sessionType) meta.sessionType = 'constellation';
    if (_sessionMetaCache.size > 2000) _sessionMetaCache.clear();
    _sessionMetaCache.set(cacheKey, Object.assign({}, meta));
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

      const pidsMatch = text.match(/"_?plannerEntryIds"\s*:\s*\[([^\]]*)\]/);
      let parsedPids = [];
      if (pidsMatch && pidsMatch[1]) {
        const strMatches = pidsMatch[1].match(/"([^"]+)"/g) || [];
        parsedPids = strMatches.map(s => s.slice(1, -1).trim()).filter(Boolean);
      }
      const pidMatch = text.match(/"_plannerEntryId"\s*:\s*"([^"]*)"/) || text.match(/^\s*\/\/\s*_plannerEntryId:\s*([^\s]+)\s*$/m);
      const mergedPids = normalizePlannerEntryIds(meta.plannerEntryIds, parsedPids, pidMatch && pidMatch[1]);
      if (mergedPids.length) {
        meta.plannerEntryIds = mergedPids;
        meta.plannerEntryId = mergedPids[0] || '';
      }

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
  if (!meta.sessionType && (ext === '.js' || ext === '.json')) {
    meta.sessionType = 'constellation';
  }
  if (_sessionMetaCache.size > 2000) _sessionMetaCache.clear();
  _sessionMetaCache.set(cacheKey, Object.assign({}, meta));
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
        jsonMeta = await readSessionTimestampMetaFast(filePath, ext, stats.size, stats.mtimeMs);
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
  const finalEncoding = encoding === 'binary' ? 'binary' : (encoding === 'base64' ? 'base64' : 'utf8');
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

  if (finalEncoding === 'binary') {
    const buf = await fs.readFile(pathToRead);
    return {
      relativePath: safeRelative,
      path: pathToRead,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      encoding: 'binary',
      content: buf
    };
  }

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
          jsonMeta = await readSessionTimestampMetaFast(absolutePath, ext, stats.size, stats.mtimeMs);
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
  if (isSamePath(oldResolved.fullPath, newResolved.fullPath)) {
    return {
      oldRelativePath: oldResolved.safeRelative,
      newRelativePath: newResolved.safeRelative,
      path: newResolved.fullPath
    };
  }
  const srcStats = await fs.stat(oldResolved.fullPath);
  await fs.mkdir(path.dirname(newResolved.fullPath), { recursive: true });

  const destExists = await fs.access(newResolved.fullPath).then(() => true).catch(() => false);
  if (destExists) {
    await fs.rm(newResolved.fullPath, { recursive: true, force: true }).catch(() => {});
  }

  try {
    await fs.rename(oldResolved.fullPath, newResolved.fullPath);
  } catch (error) {
    if (srcStats.isDirectory()) {
      await fs.cp(oldResolved.fullPath, newResolved.fullPath, { recursive: true, force: true });
      await fs.rm(oldResolved.fullPath, { recursive: true, force: true });
    } else {
      await fs.copyFile(oldResolved.fullPath, newResolved.fullPath);
      await fs.unlink(oldResolved.fullPath);
    }
  }

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
    fs.mkdir(saveTargets.customPhases, { recursive: true }),
    fs.mkdir(saveTargets.customCriteria, { recursive: true }),
    fs.mkdir(saveTargets.customScales, { recursive: true }),
    fs.mkdir(saveTargets.customChips, { recursive: true }),
    fs.mkdir(saveTargets.customBadges, { recursive: true }),
    fs.mkdir(saveTargets.customModes, { recursive: true }),
    fs.mkdir(saveTargets.groupParticipation, { recursive: true }),
    fs.mkdir(saveTargets.mindmaps, { recursive: true }),
    fs.mkdir(saveTargets.constellationTemplates, { recursive: true }),
    fs.mkdir(saveTargets.grades, { recursive: true }),
    fs.mkdir(saveTargets.toPrint, { recursive: true }),
    fs.mkdir(saveTargets.userExportCss, { recursive: true })
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


async function loadSavedPortableRoot() {
  if (process.env.PORTABLE_ROOT) {
    try {
      fsSync.accessSync(path.join(process.env.PORTABLE_ROOT, 'user'), fsSync.constants.F_OK);
      return; // valid and user folder present
    } catch {
      delete process.env.PORTABLE_ROOT;
    }
  }
  try {
    const raw = await fs.readFile(getPortableRootConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    const saved = String(parsed?.portableRoot || '').trim();
    if (saved) {
      try {
        fsSync.accessSync(saved, fsSync.constants.W_OK);
        fsSync.accessSync(path.join(saved, 'user'), fsSync.constants.F_OK);
        process.env.PORTABLE_ROOT = saved;
      } catch {
        // Saved path is no longer accessible or user folder was moved/deleted
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
  const configPath = getPortableRootConfigPath();
  let savedConfiguredRoot = null;
  try {
    if (fsSync.existsSync(configPath)) {
      const raw = fsSync.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      savedConfiguredRoot = String(parsed?.portableRoot || '').trim() || null;
    }
  } catch {}

  // If a custom data root was configured in portable-root.json:
  if (savedConfiguredRoot) {
    try {
      await fs.access(savedConfiguredRoot, fsSync.constants.W_OK);
      await fs.access(path.join(savedConfiguredRoot, 'user'));
      return false; // Valid and user folder exists
    } catch {
      // Configured folder missing, moved, or user folder deleted
      return true;
    }
  }

  // Check default writableRoot:
  const writableRoot = getWritableRootDir();
  try {
    await fs.access(path.join(writableRoot, 'user'));
    return false;
  } catch {}
  return true;
}

async function ensureWritableSeedDataWithFallback() {
  // Restore previously chosen data folder across launches.
  await loadSavedPortableRoot();

  // Detect first run before seed data creates the folders.
  firstRunDetected = await checkIsFirstRun();
  if (firstRunDetected) {
    // On first run, we do not automatically write seed data or override directories
    // before the user makes their selection in the onboarding modal.
    return;
  }

  if (!app.isPackaged) {
    return;
  }

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
const { crc32, msToDosDateTime, dosDateTimeToMs, buildZip, collectDirEntries } = require('./js/main/zip-utils');

const { registerBackupBoardIpc } = require('./js/main/ipc-backup-board');
registerBackupBoardIpc({
  app, dialog, ipcMain, fs, path, zlib,
  getWritableRootDir, collectDirEntries, buildZip, dosDateTimeToMs,
  getRequestingPage, sanitizeFilename, resolveAllowedTargetPath, sanitizeRelativePath,
  _broadcastDataChanged, normalizePlannerEntryIds, _sessionMetaCache
});

ipcMain.handle('app:get-data-location', async () => {
  const configPath = getPortableRootConfigPath();
  let savedConfiguredRoot = null;
  try {
    if (fsSync.existsSync(configPath)) {
      const raw = fsSync.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      savedConfiguredRoot = String(parsed?.portableRoot || '').trim() || null;
    }
  } catch {}

  const isMissing = await checkIsFirstRun();
  const configuredPortableRoot = String(process.env.PORTABLE_ROOT || '').trim() || null;
  const resolvedWritableRoot = getWritableRootDir();

  let folderMissingReason = null;
  if (isMissing) {
    folderMissingReason = savedConfiguredRoot ? 'configured_missing' : 'first_run';
  }

  return {
    ok: true,
    configuredPortableRoot,
    resolvedWritableRoot,
    configPath: getPortableRootConfigPath(),
    isPackaged: app.isPackaged,
    isFirstRun: firstRunDetected || isMissing,
    folderMissingReason,
    lastConfiguredPath: savedConfiguredRoot
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
    'participation-tracker-config.js',
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
  firstRunDetected = false;

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

ipcMain.handle('app:confirm-default-data-location', async (event) => {
  firstRunDetected = false;
  const resolvedWritableRoot = getWritableRootDir();

  try {
    await ensureWritableSeedData();
  } catch (error) {
    console.error('Failed to initialize default seed data:', error);
    return {
      ok: false,
      error: `Could not initialize default app data folders in: ${resolvedWritableRoot}`,
      details: String(error?.message || error)
    };
  }

  return {
    ok: true,
    resolvedWritableRoot
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

ipcMain.handle('app:consume-close-intent', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin || senderWin.isDestroyed()) return false;
  const ts = senderWin._lastCloseAttemptAt || 0;
  senderWin._lastCloseAttemptAt = 0;
  return ts > 0 && (Date.now() - ts) < 5000;
});

ipcMain.handle('app:open-tool', async (event, request = {}) => {
  const rawPageInput = typeof request === 'string' ? request : (request.pageFile || request.tool || '');
  let rawPage = rawPageInput;
  let inlineQuery = {};
  if (typeof rawPage === 'string' && rawPage.includes('?')) {
    const qIndex = rawPage.indexOf('?');
    const qs = rawPage.slice(qIndex + 1);
    rawPage = rawPage.slice(0, qIndex);
    try {
      const searchParams = new URLSearchParams(qs);
      for (const [k, v] of searchParams.entries()) {
        inlineQuery[k] = v;
      }
    } catch (_) {}
  }
  let cleanPageKey = typeof rawPage === 'string' ? rawPage.replace(/^[./\\]*pages[/\\]/, '') : rawPage;
  const pageFile = PAGE_FILES[cleanPageKey] || PAGE_FILES[rawPage] || cleanPageKey;
  const knownPages = new Set(Object.values(PAGE_FILES));
  if (!pageFile || !knownPages.has(pageFile)) {
    return { ok: false, error: `Unknown page: ${pageFile}` };
  }
  const mergedQuery = Object.assign({}, inlineQuery, (request && typeof request.query === 'object' && request.query) ? request.query : {});
  const query = Object.keys(mergedQuery).length > 0 ? mergedQuery : null;

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

  const wantsNewWindow = !!(request.newWindow || request.forceNewWindow);

  // Multi-window file tool handling (Board, Document Editor, PDF Viewer):
  // allow opening multiple tool windows provided files are not the same
  if (_isMultiWindowFileTool(pageFile) && !request.sideBySide && !request.openOnSecondScreen) {
    const toolWins = BrowserWindow.getAllWindows().filter(
      w => !w.isDestroyed() && !isPresentationWindow(w) && getLoadedPageFile(w) === pageFile
    );
    const isTargetFileSpecified = _hasToolFile(pageFile, query);

    if (isTargetFileSpecified) {
      // 1. If an existing window already has this exact file loaded, focus it
      const sameFileWin = toolWins.find(w => _areToolFilesEqual(pageFile, _windowSessionContexts.get(w.id), query));
      if (sameFileWin) {
        if (targetBounds) _applySafeBounds(sameFileWin, targetBounds);
        if (sameFileWin.isMinimized()) sameFileWin.restore();
        sameFileWin.focus();
        return { ok: true, windowId: sameFileWin.id, alreadyOpen: true };
      }

      // 2. If an existing window is clean and blank (no file loaded and not dirty), reuse it (unless user explicitly forced a new window)
      if (!wantsNewWindow) {
        const isDirtyWin = (w) => (typeof w.getTitle === 'function' && w.getTitle().startsWith('●')) || !!(_windowSessionContexts.get(w.id)?.isDirty);
        const blankWin = toolWins.find(w => !_hasToolFile(pageFile, _windowSessionContexts.get(w.id)) && !isDirtyWin(w));
        if (blankWin) {
          if (query && !request.noReload) {
            loadTool(pageFile, blankWin, { query }).catch((err) => {
              console.error(`Failed to navigate ${pageFile}:`, err);
            });
          }
          const initCtx = _extractInitialContext(pageFile, query);
          if (initCtx) {
            _windowSessionContexts.set(blankWin.id, initCtx);
          }
          if (targetBounds) _applySafeBounds(blankWin, targetBounds);
          if (blankWin.isMinimized()) blankWin.restore();
          blankWin.focus();
          return { ok: true, windowId: blankWin.id, reusedBlank: true };
        }
      }

      // 3. Different file and no clean blank window to reuse -> fall through to create a new window!
    } else {
      // No specific file requested (e.g. clicking tool card in Launcher)
      if (!wantsNewWindow) {
        const isDirtyWin = (w) => (typeof w.getTitle === 'function' && w.getTitle().startsWith('●')) || !!(_windowSessionContexts.get(w.id)?.isDirty);
        const blankWin = toolWins.find(w => !_hasToolFile(pageFile, _windowSessionContexts.get(w.id)) && !isDirtyWin(w));
        if (blankWin) {
          if (targetBounds) _applySafeBounds(blankWin, targetBounds);
          if (blankWin.isMinimized()) blankWin.restore();
          blankWin.focus();
          return { ok: true, windowId: blankWin.id };
        }
        // If all existing windows have files loaded or are dirty, fall through to create a new blank window!
      }
    }
  } else if (!wantsNewWindow && !isLearningToolsPresentation && !request.sideBySide && !request.openOnSecondScreen && !request.maximize) {
    const existing = BrowserWindow.getAllWindows().find(
      w => !w.isDestroyed() && !isPresentationWindow(w) && getLoadedPageFile(w) === pageFile
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
  if (_isMultiWindowFileTool(pageFile) && _hasToolFile(pageFile, query)) {
    const initCtx = _extractInitialContext(pageFile, query);
    if (initCtx) {
      toolOptions.initialContext = initCtx;
    }
  }
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
    if (senderWin && !senderWin.isDestroyed() && toolWin && !toolWin.isDestroyed()) {
      try {
        const srcZoom = senderWin.webContents.getZoomFactor();
        toolWin.webContents.setZoomFactor(srcZoom);
      } catch (_) {}
    }
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
  if (payload.action === 'sync' || payload.action === 'sync-complete') return true;
  const target = payload.target;
  const filename = payload.filename;
  const subdir = _normalizeDataChangedPath(payload.subdir);
  const relativePath = _normalizeDataChangedPath(payload.relativePath);
  const oldRelativePath = _normalizeDataChangedPath(payload.oldRelativePath);
  const newRelativePath = _normalizeDataChangedPath(payload.newRelativePath);

  if (target === 'docEditorDocs' || target === 'mindmaps') return true;

  if (target === 'grades' || target === 'gradeSheet') return true;

  if (target === 'user') {
    if (['class-groups.js', 'config.js', 'planner-config.js', 'todos.js'].includes(filename)) return true;
    if (subdir === 'planner' || relativePath.startsWith('planner/') || oldRelativePath.startsWith('planner/') || newRelativePath.startsWith('planner/')) return true;
    if (subdir === 'custom-data' || subdir.startsWith('custom-data/') || relativePath.startsWith('custom-data/') || oldRelativePath.startsWith('custom-data/') || newRelativePath.startsWith('custom-data/')) return true;
    if (subdir === 'grades' || subdir.startsWith('grades/') || relativePath.startsWith('grades/') || oldRelativePath.startsWith('grades/') || newRelativePath.startsWith('grades/')) return true;
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
    const isSync = payload.action === 'sync' || payload.action === 'sync-complete';
    const senderWebContents = event && event.sender ? event.sender : null;
    if (!win.isDestroyed() && (isSync || !senderWebContents || win.webContents !== senderWebContents)) {
      win.webContents.send('app:data-changed', mergedPayload);
    }
  }
}

ipcMain.handle('app:save-file', async (event, request) => {
  const pageFile = getRequestingPage(event);
  const savedFile = await writeAllowedFile(pageFile, request.target, request);
  if (request && (request.filename === 'planner-entries.js' || request.subdir === 'planner')) {
    _loadPlannerEntries().catch(() => {});
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
  let finalPath = resolved.fullPath;
  if (request.target === 'data' && !fsSync.existsSync(finalPath)) {
    const bundledPath = path.resolve(path.join(getBundledDataRoot()), resolved.safeRelative);
    if (fsSync.existsSync(bundledPath)) {
      finalPath = bundledPath;
    }
  }
  return {
    ok: true,
    target: request.target,
    relativePath: resolved.safeRelative,
    path: finalPath
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
      sandbox: true,
      backgroundThrottling: false
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

ipcMain.handle('app:is-tool-open', (_event, request = {}) => {
  const req = typeof request === 'string' ? request : (request.pageFile || request.tool || '');
  const clean = req.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetFile = PAGE_FILES[req] || PAGE_ARG_MAP[clean] || req;
  const win = BrowserWindow.getAllWindows().find(
    w => !w.isDestroyed() && !isPresentationWindow(w) && getLoadedPageFile(w) === targetFile
  );
  return { open: !!win };
});

ipcMain.handle('app:timer-command', async (event, request = {}) => {
  const targetWin = _cmsFindClassManagementWindow()
    || (mainWindow && !mainWindow.isDestroyed() && !isPresentationWindow(mainWindow) && getLoadedPageFile(mainWindow) === PAGE_FILES.classManagement ? mainWindow : null)
    || (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null);
  if (!targetWin || targetWin.isDestroyed()) return { ok: false, error: 'no-cms-window' };
  const totalSec = Number(request.totalSec) || ((Number(request.h) || 0) * 3600 + (Number(request.m) || 5) * 60 + (Number(request.s) || 0));
  const ALLOWED = {
    start: `(function(){
      if (typeof window.cmsStartExternalTimer === 'function') {
        window.cmsStartExternalTimer(${totalSec});
      } else if (typeof window.startCountdownWithSeconds === 'function') {
        window.startCountdownWithSeconds(${totalSec});
      } else {
        var tot = ${totalSec};
        var h = Math.floor(tot / 3600);
        var m = Math.floor((tot % 3600) / 60);
        var ph = document.getElementById('popup-timer-hours');
        var pm = document.getElementById('popup-timer-minutes');
        if (ph) ph.value = h;
        if (pm) pm.value = m;
        if (typeof popupStartTimer === 'function') popupStartTimer();
      }
    })()`,
    stop:    `overlayStopTimer()`,
    pause:   `overlayPlayPauseTimer()`,
    resume:  `overlayPlayPauseTimer()`,
    add30:   `timerAdd30s()`,
    sub30:   `timerSubtract30s()`
  };
  const cmd = String(request.cmd || '');
  if (!ALLOWED[cmd]) return { ok: false, error: 'unknown-command' };
  try {
    await targetWin.webContents.executeJavaScript(ALLOWED[cmd]);
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

const _singletonWindows = new Map();

ipcMain.handle('app:open-html', async (event, request = {}) => {
  const html = String(request.html || '');
  const width = Number(request.width) || 1000;
  const height = Number(request.height) || 700;

  const targetReqFile = request.file || request.pageFile || request.page || request.path || '';
  const reuseKey = request.reuseId || ((typeof targetReqFile === 'string' && /dictionary(\.html)?$/i.test(targetReqFile)) ? 'dictionary' : null);
  if (reuseKey && _singletonWindows.has(reuseKey)) {
    const existing = _singletonWindows.get(reuseKey);
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.show();
      existing.focus();
      const q = (request.query && (request.query.q || request.query.word)) ? (request.query.q || request.query.word) : '';
      if (q) {
        existing.webContents.send('cmt:dictionary-search', q);
      }
      return { ok: true, reused: true };
    }
    _singletonWindows.delete(reuseKey);
  }

  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const winOpts = {
    width,
    height,
    title: request.title ? String(request.title) : 'Class Management Tools',
    autoHideMenuBar: request.autoHideMenuBar !== undefined ? !!request.autoHideMenuBar : false,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  };

  if (request.alwaysOnTop !== undefined) {
    winOpts.alwaysOnTop = !!request.alwaysOnTop;
  }
  if (request.resizable !== undefined) {
    winOpts.resizable = !!request.resizable;
  }
  if (request.minWidth) winOpts.minWidth = Number(request.minWidth);
  if (request.minHeight) winOpts.minHeight = Number(request.minHeight);

  if (request.x != null && request.y != null) {
    winOpts.x = Number(request.x);
    winOpts.y = Number(request.y);
  } else if (senderWin && !senderWin.isDestroyed()) {
    const sBounds = senderWin.getBounds();
    winOpts.x = Math.round(sBounds.x + Math.max(0, (sBounds.width - width) / 2));
    winOpts.y = Math.round(sBounds.y + Math.max(0, (sBounds.height - height) / 2));
  }

  const win = new BrowserWindow(winOpts);
  setupWindowExternalLinkHandling(win);

  if (reuseKey) {
    _singletonWindows.set(reuseKey, win);
    win.on('closed', () => {
      if (_singletonWindows.get(reuseKey) === win) {
        _singletonWindows.delete(reuseKey);
      }
    });
  }

  if (request.file || request.pageFile || request.page || request.path) {
    let p = request.file || request.pageFile || request.page || request.path;
    if (typeof p === 'string') {
      const normalizedKey = p.replace(/\.html$/i, '').toLowerCase().replace(/[-_.]/g, '');
      if (PAGE_ARG_MAP[normalizedKey]) {
        p = PAGE_ARG_MAP[normalizedKey];
      } else if (PAGE_FILES[p]) {
        p = PAGE_FILES[p];
      } else if (!p.endsWith('.html')) {
        p = p + '.html';
      }
    }
    let targetFile = path.isAbsolute(p) ? p : path.join(ROOT_DIR, 'pages', p);
    if (!fsSync.existsSync(targetFile)) {
      const rootCandidate = path.join(ROOT_DIR, p);
      if (fsSync.existsSync(rootCandidate)) {
        targetFile = rootCandidate;
      }
    }
    try {
      await win.loadFile(targetFile, request.query ? { query: request.query } : undefined);
    } catch (err) {
      console.error('app:open-html file load failed', err);
    }
    return { ok: true };
  }

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

ipcMain.handle('app:set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(!!flag);
    return { ok: true, alwaysOnTop: win.isAlwaysOnTop() };
  }
  return { ok: false };
});

ipcMain.handle('app:is-always-on-top', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    return { ok: true, alwaysOnTop: win.isAlwaysOnTop() };
  }
  return { ok: false, alwaysOnTop: false };
});

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

function readUserLauncherCardConfig(toolId) {
  try {
    const configPath = path.join(getWritableRootDir(), 'user', 'launcher-config.js');
    if (!fs.existsSync(configPath)) return null;
    const content = fs.readFileSync(configPath, 'utf8');
    const match = content.match(/window\.LAUNCHER_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]);
    if (parsed && parsed.cardConfigs && typeof parsed.cardConfigs === 'object') {
      return parsed.cardConfigs[toolId] || null;
    }
  } catch (err) {
    console.warn('Could not read user/launcher-config.js card config:', err);
  }
  return null;
}

function getPresentationDefaultBounds(toolId, targetWindow, sourceWindow, overrideConfig = null) {
  const cardCfg = overrideConfig || readUserLauncherCardConfig(toolId) || {};
  const targetDisplay = getPresenterTargetDisplay(targetWindow, sourceWindow);
  const wa = targetDisplay ? targetDisplay.workArea : screen.getPrimaryDisplay().workArea;

  const rawSize = cardCfg.presWindowSize || cardCfg.presSize;
  const numSize = Number(rawSize);
  const hasRatio = !isNaN(numSize) && numSize >= 10 && numSize <= 100;
  const ratio = hasRatio ? (numSize / 100) : 0.8;

  const pos = String(cardCfg.presWindowPosition || cardCfg.presPosition || '').trim();

  if (pos === 'maximize') {
    return { x: wa.x, y: wa.y, width: wa.width, height: wa.height, maximize: true };
  }

  let width = Math.max(420, Math.min(wa.width, Math.round(wa.width * ratio)));
  let height = Math.max(300, Math.min(wa.height, Math.round(wa.height * ratio)));

  if (pos === 'left' || pos === 'right') {
    height = wa.height;
    if (!hasRatio) width = Math.max(260, Math.round(wa.width * 0.2));
  }

  let x = wa.x + Math.round((wa.width - width) / 2);
  let y = wa.y + Math.round((wa.height - height) / 2);

  switch (pos) {
    case 'center':
      x = wa.x + Math.round((wa.width - width) / 2);
      y = wa.y + Math.round((wa.height - height) / 2);
      break;
    case 'top-left':
      x = wa.x;
      y = wa.y;
      break;
    case 'top-right':
      x = wa.x + wa.width - width;
      y = wa.y;
      break;
    case 'bottom-left':
      x = wa.x;
      y = wa.y + wa.height - height;
      break;
    case 'bottom-right':
      x = wa.x + wa.width - width;
      y = wa.y + wa.height - height;
      break;
    case 'left':
      x = wa.x;
      y = wa.y;
      break;
    case 'right':
      x = wa.x + wa.width - width;
      y = wa.y;
      break;
    default:
      if (screen.getAllDisplays().length <= 1 && sourceWindow && !sourceWindow.isDestroyed()) {
        const sBounds = sourceWindow.getBounds();
        const availableRight = wa.x + wa.width - (sBounds.x + sBounds.width + 10);
        if (availableRight >= 300) {
          x = sBounds.x + sBounds.width + 10;
          y = sBounds.y;
          width = Math.min(width, availableRight);
          height = Math.min(height, wa.height);
        }
      }
      break;
  }

  return { x, y, width, height, maximize: false };
}

function applyPresentationDefaultBounds(targetWindow, sourceWindow, toolId, overrideConfig = null) {
  if (!targetWindow || targetWindow.isDestroyed()) return false;
  if (targetWindow.isFullScreen()) targetWindow.setFullScreen(false);
  if (targetWindow.isMaximized()) targetWindow.unmaximize();
  const bounds = getPresentationDefaultBounds(toolId, targetWindow, sourceWindow, overrideConfig);
  if (bounds) {
    if (bounds.maximize) {
      maximizePresenterWindow(targetWindow, sourceWindow);
    } else {
      _applySafeBounds(targetWindow, bounds);
    }
    return true;
  }
  return false;
}

const { registerWindowsIpc } = require('./js/main/ipc-windows');
const { notifyWindowsChanged } = registerWindowsIpc({
  BrowserWindow, ipcMain, screen, fs, path, getWritableRootDir, PAGE_FILES, PAGE_LABELS,
  getLoadedPageFile, isPresentationWindow,
  getAssociatedPresenterWindow, getAssociatedSourceWindow,
  mapWindowBoundsToDisplay, _applySafeBounds, _teardownLinkedResize,
  createToolWindow
});

const { registerPresentationIpc } = require('./js/main/ipc-presentation');
registerPresentationIpc({
  BrowserWindow, ipcMain, screen, path, ROOT_DIR, PAGE_FILES,
  winRefs: {
    get mirror() { return mirrorWindow; }, set mirror(v) { mirrorWindow = v; },
    get mirrorSource() { return mirrorWindowSource; }, set mirrorSource(v) { mirrorWindowSource = v; },
    get cms() { return cmsPresentationWindow; }, set cms(v) { cmsPresentationWindow = v; },
    get cmsSource() { return cmsPresentationSourceWindow; }, set cmsSource(v) { cmsPresentationSourceWindow = v; },
    get learning() { return learningToolsPresentationWindow; }, set learning(v) { learningToolsPresentationWindow = v; },
    get learningSource() { return learningToolsPresentationSourceWindow; }, set learningSource(v) { learningToolsPresentationSourceWindow = v; },
    get oral() { return oralPresenterWindow; }, set oral(v) { oralPresenterWindow = v; },
    get oralSource() { return oralPresenterSourceWindow; }, set oralSource(v) { oralPresenterSourceWindow = v; },
    get doc() { return docPresentationWindow; }, set doc(v) { docPresentationWindow = v; },
    get docSource() { return docPresentationSourceWindow; }, set docSource(v) { docPresentationSourceWindow = v; },
    get pdf() { return pdfPresentationWindow; }, set pdf(v) { pdfPresentationWindow = v; },
    get pdfSource() { return pdfPresentationSourceWindow; }, set pdfSource(v) { pdfPresentationSourceWindow = v; }
  },
  getToolPath, getExtendedDisplayForBounds, readUserLauncherCardConfig,
  getPresentationDefaultBounds, mapWindowBoundsToDisplay, setupWindowExternalLinkHandling,
  syncTargetWindowToSource, applyPresentationDefaultBounds, dockTargetWindow, maximizePresenterWindow,
  notifyWindowsChanged
});
ipcMain.handle('app:adjust-zoom', (event, delta) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin || senderWin.isDestroyed() || !senderWin.webContents || senderWin.webContents.isDestroyed()) {
    return { ok: false };
  }
  const current = senderWin.webContents.getZoomFactor() || 1.0;
  const numDelta = typeof delta === 'number' ? delta : 0.1;
  const next = current + numDelta;
  setWindowZoom(senderWin, next);
  return { ok: true, zoomFactor: senderWin.webContents.getZoomFactor() };
});

ipcMain.handle('app:reset-zoom', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin || senderWin.isDestroyed() || !senderWin.webContents || senderWin.webContents.isDestroyed()) {
    return { ok: false };
  }
  setWindowZoom(senderWin, 1.0);
  return { ok: true, zoomFactor: 1.0 };
});

ipcMain.handle('app:set-zoom-factor', (event, factor) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin || senderWin.isDestroyed() || !senderWin.webContents || senderWin.webContents.isDestroyed()) {
    return { ok: false };
  }
  if (typeof factor === 'number' && !isNaN(factor)) {
    setWindowZoom(senderWin, factor);
  }
  return { ok: true, zoomFactor: senderWin.webContents.getZoomFactor() };
});

const { registerPrintIpc } = require('./js/main/ipc-print');
registerPrintIpc({ app, BrowserWindow, dialog, ipcMain, fs, fsSync, os, path, ROOT_DIR, getWritableRootDir, getRequestingPage, writeAllowedFile });
const { registerFileOpsIpc } = require('./js/main/ipc-file-ops');
registerFileOpsIpc({
  app, dialog, ipcMain, fs, fsSync, os, path, crypto, buildZip, getSaveTargets,
  getRequestingPage, listAllowedPathFiles, createAllowedPathDirectory, _broadcastDataChanged,
  resolveAllowedTargetDir, sanitizeFilename, renameAllowedPathEntry, statAllowedPathEntry,
  copyAllowedPathEntry, moveAllowedPathEntry, deleteAllowedPathEntry, sanitizeRelativePath, resolveAllowedTargetPath
});

const { registerBackupSyncIpc } = require('./js/main/ipc-backup-sync');
const {
  loadFtpConfig, saveFtpConfig, startFtpAutoSyncTimer, runFtpTransfer,
  loadDriveConfig, saveDriveConfig, startDriveOAuthFlow, runDriveTransfer,
  loadWebdavConfig, saveWebdavConfig, startWebdavAutoSyncTimer, runWebdavTransfer,
  loadAutoSyncEnabled, startAutoSyncWatcher
} = registerBackupSyncIpc({
  app, BrowserWindow, dialog, ipcMain, fs, fsSync, path, zlib, http, crypto,
  ROOT_DIR, getWritableRootDir, _broadcastDataChanged
});

// ── FTP Sync IPC ──────────────────────────────────────────────────────────────

const { registerCloudSyncIpc } = require('./js/main/ipc-cloud-sync');
registerCloudSyncIpc({
  ipcMain, fs, path, getWritableRootDir,
  loadFtpConfig, saveFtpConfig, startFtpAutoSyncTimer, runFtpTransfer,
  loadDriveConfig, saveDriveConfig, startDriveOAuthFlow, runDriveTransfer,
  loadWebdavConfig, saveWebdavConfig, startWebdavAutoSyncTimer, runWebdavTransfer
});

const { registerRemoteQuizIpc } = require('./js/main/ipc-remote-quiz');
const { stopQuizServer, findClassManagementWindow: _cmsFindClassManagementWindow } = registerRemoteQuizIpc({
  app, BrowserWindow, ipcMain, fs, path, http, os, crypto, spawn,
  ROOT_DIR, PAGE_FILES, isPresentationWindow, getLoadedPageFile, getRequestingPage, resolveAllowedTargetPath
});
ipcMain.handle('app:open-external', async (_event, request = {}) => {
  const url = String(request.url || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Invalid URL' };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('app:open-web-window', async (_event, request = {}) => {
  const url = String(request.url || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Invalid URL' };
  const title = request.title ? String(request.title) : 'Web Link';

  const win = new BrowserWindow({
    width: Number(request.width) || 1100,
    height: Number(request.height) || 780,
    title,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT_DIR, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  const targetFile = path.join(ROOT_DIR, 'pages', 'web-viewer.html');
  try {
    await win.loadFile(targetFile, { query: { url, title } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
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

const { registerArchiveIpc } = require('./js/main/ipc-archives');
registerArchiveIpc({ app, BrowserWindow, ipcMain, fs, path, getWritableRootDir, collectDirEntries, buildZip });

// ── DOCX Export ───────────────────────────────────────────────────────────────
const { registerDocExportIpc } = require('./js/main/ipc-doc-export');
registerDocExportIpc({ app, clipboard, dialog, ipcMain, fs, path, getSaveTargets });
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

const { registerPlannerRemindersIpc } = require('./js/main/ipc-planner-reminders');
const { loadPlannerEntries: _loadPlannerEntries, startReminderEngine: _startReminderEngine } = registerPlannerRemindersIpc({
  BrowserWindow, ipcMain, fs, fsSync, path, ROOT_DIR, getSaveTargets
});
const { registerSystemDictIpc } = require('./js/main/ipc-system-dict');
const { resolveRequestWebContents, dictionaryService: _dictionaryService, pendingDisplayCaptureTargets } = registerSystemDictIpc({
  BrowserWindow, desktopCapturer, ipcMain, shell, fs, path, ROOT_DIR, PAGE_FILES,
  getMirrorWindow: () => mirrorWindow, _windowSessionContexts,
  writeCrashDump, scheduleSaveSessionState, isPresentationWindow, getLoadedPageFile,
  _areBoardFilesEqual, _isMultiWindowFileTool, _areToolFilesEqual, readSavedSessionState,
  getCrashDumpsDir, getSaveTargets, getBundledDataRoot
});


const { registerMediaAiIpc } = require('./js/main/ipc-media-ai');
registerMediaAiIpc({
  app, BrowserWindow, dialog, ipcMain, fs, fsSync, path, http, https, spawn,
  ROOT_DIR, PAGE_FILES, getWritableRootDir
});

app.whenReady().then(async () => {
  startMemoryHeartbeat();
  startLauncherBackgroundCleanup();
  let initialPageFile = getInitialPageFile();

  try {
    session.defaultSession.setSpellCheckerLanguages(['en-GB', 'fr-FR']);
  } catch (error) {
    console.warn('Could not set spell checker languages:', error.message);
  }

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture' || permission === 'microphone' || permission === 'audio-capture') {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (typeof session.defaultSession.setDisplayMediaRequestHandler === 'function') {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      const requesterWc = resolveRequestWebContents(request);
      const pending = requesterWc ? pendingDisplayCaptureTargets.get(requesterWc.id) : null;
      if (pending) {
        pendingDisplayCaptureTargets.delete(requesterWc.id);
        if (pending.expires >= Date.now()) {
          let targetWc = null;
          if (pending.target === 'mirror' && mirrorWindow && !mirrorWindow.isDestroyed()) {
            targetWc = mirrorWindow.webContents;
          } else if (pending.target === 'self' && requesterWc && !requesterWc.isDestroyed()) {
            targetWc = requesterWc;
          }
          if (targetWc && !targetWc.isDestroyed()) {
            try {
              callback({ video: targetWc });
              return;
            } catch (tabErr) {
              console.warn('[DisplayMedia] WebContents capture failed, falling back:', tabErr?.message || tabErr);
            }
          }
        }
      }
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        const currentWin = BrowserWindow.fromWebContents(requesterWc || request.frame?.webContents || request.webContents);
        let selectedSource = sources[0];
        if (currentWin) {
          const winTitle = currentWin.getTitle();
          const matchingWin = sources.find(s => s.name === winTitle || (s.id && s.id.includes(String(currentWin.id))));
          if (matchingWin) selectedSource = matchingWin;
        }
        callback({ video: selectedSource, audio: 'loopback' });
      }).catch(() => {
        callback({});
      });
    });
  }

  buildMenu();

  await loadSavedPortableRoot();
  firstRunDetected = await checkIsFirstRun();

  const explicitCliPage = getInitialPageFile();
  const hasCliArg = (explicitCliPage !== PAGE_FILES.launcher);

  let didRestore = false;
  if (!firstRunDetected && !hasCliArg) {
    const savedSession = readSavedSessionState();
    if (savedSession && Array.isArray(savedSession.windows) && savedSession.windows.length > 0) {
      const hasRealTools = savedSession.windows.some(w => w && w.pageFile && w.pageFile !== PAGE_FILES.launcher);
      const isUnclean = !savedSession.cleanQuit;

      // Restore if unexpected termination (task manager, Linux OOM, crash) OR if active tools were open
      if (isUnclean || hasRealTools) {
        try {
          didRestore = restoreSavedSession(savedSession);
        } catch (restoreErr) {
          console.error('[SessionState] Failed to restore saved session:', restoreErr);
        }
      }
    }
  }

  if (!didRestore) {
    createMainWindow(initialPageFile);
  }

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
  _isQuittingCleanly = true;
  try {
    const activeSnapshot = getActiveSessionSnapshot(false);
    const hasTools = activeSnapshot.windows && activeSnapshot.windows.some(
      w => w && w.pageFile && w.pageFile !== PAGE_FILES.launcher
    );
    // If active tools were open (Board, Grade Sheet, etc.), keep cleanQuit = false so state restores!
    saveSessionStateSync(!hasTools);
  } catch (_) {}
  stopQuizServer();
  try { _dictionaryService.dispose(); } catch (_) {}
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