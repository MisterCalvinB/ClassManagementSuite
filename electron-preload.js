let contextBridge = null;
let ipcRenderer = null;
let webFrame = null;

try {
  const electronApi = require('electron') || {};
  contextBridge = electronApi.contextBridge || null;
  ipcRenderer = electronApi.ipcRenderer || null;
  webFrame = electronApi.webFrame || null;
} catch (error) {
  // Keep preload alive so renderer can still boot even if Electron internals fail.
  console.error('Failed to initialize Electron preload bridge:', error);
}

const bridgeUnavailableError = {
  ok: false,
  error: 'Electron desktop bridge is unavailable in this renderer context.'
};

function unavailable() {
  return Promise.resolve(bridgeUnavailableError);
}

function invoke(channel, request) {
  if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
    return unavailable();
  }
  return ipcRenderer.invoke(channel, request);
}

const exposedApi = {
  isElectron: !!(contextBridge && ipcRenderer),
  saveFile(request) {
    return invoke('app:save-file', request);
  },
  saveFiles(request) {
    return invoke('app:save-files', request);
  },
  listFiles(request) {
    return invoke('app:list-files', request);
  },
  listByPath(request) {
    return invoke('app:list-by-path', request);
  },
  readFile(request) {
    return invoke('app:read-file', request);
  },
  resolvePath(request) {
    return invoke('app:resolve-path', request);
  },
  readByPath(request) {
    return invoke('app:read-by-path', request);
  },
  openHtml(request) {
    return invoke('app:open-html', request);
  },
  printHtml(request) {
    return invoke('app:print-html', request);
  },
  printPdf(request) {
    return invoke('app:print-pdf', request);
  },
  renameFile(request) {
    return invoke('app:rename-file', request);
  },
  renameByPath(request) {
    return invoke('app:rename-by-path', request);
  },
  deleteFile(request) {
    return invoke('app:delete-file', request);
  },
  deleteByPath(request) {
    return invoke('app:delete-by-path', request);
  },
  backupZip() {
    return invoke('app:backup-zip');
  },
  restoreZip() {
    return invoke('app:restore-zip');
  },
  applyRestoreChoices(request) {
    return invoke('app:apply-restore-choices', request);
  },
  getDataLocation() {
    return invoke('app:get-data-location');
  },
  pickDataLocation() {
    return invoke('app:pick-data-location');
  },
  resetDataLocation() {
    return invoke('app:reset-data-location');
  },
  migrateDataLocation(request) {
    return invoke('app:migrate-data-location', request);
  },
  getBackupLocation() {
    return invoke('app:get-backup-location');
  },
  pickBackupLocation() {
    return invoke('app:pick-backup-location');
  },
  runBackup() {
    return invoke('app:run-backup');
  },
  getSyncLocation() {
    return invoke('app:get-sync-location');
  },
  pickSyncLocation() {
    return invoke('app:pick-sync-location');
  },
  runSync(request) {
    return invoke('app:run-sync', request);
  },
  applySyncChoices(request) {
    return invoke('app:apply-sync-choices', request);
  },
  getAutoSync() {
    return invoke('app:get-auto-sync');
  },
  setAutoSync(request) {
    return invoke('app:set-auto-sync', request);
  },
  getSeedConflicts() {
    return invoke('app:get-seed-conflicts');
  },
  applyMergeChoices(request) {
    return invoke('app:apply-merge-choices', request);
  },
  exportFiles(request) {
    return invoke('app:export-files', request);
  },
  openTool(request) {
    return invoke('app:open-tool', request);
  },
  openSplit(request) {
    return invoke('app:open-split', request);
  },
  arrangeSideBySide(request) {
    return invoke('app:arrange-side-by-side', request);
  },
  loadPage(request) {
    return invoke('app:load-page', request);
  },
  isTimerWindowOpen() {
    return invoke('app:is-timer-window-open');
  },
  timerCommand(request) {
    return invoke('app:timer-command', request);
  },
  timerState() {
    return invoke('app:timer-state');
  },
  openTimerWindow(request) {
    return invoke('app:open-timer-window', request);
  },
  openMirrorWindow(request) {
    return invoke('app:open-mirror-window', request);
  },
  mirrorWindowCommand(command) {
    return invoke('app:mirror-window-command', command);
  },
  openCmsPresentation(request) {
    return invoke('app:open-cms-presentation', request);
  },
  isCmsPresentationOpen() {
    return invoke('app:cms-presentation-open');
  },
  cmsPresentationCommand(command) {
    return invoke('app:cms-presentation-command', command);
  },
  setZoomFactor(factor) {
    if (webFrame && typeof webFrame.setZoomFactor === 'function') {
      webFrame.setZoomFactor(factor);
    }
  },
  getZoomFactor() {
    if (webFrame && typeof webFrame.getZoomFactor === 'function') {
      return webFrame.getZoomFactor();
    }
    return 1;
  },
  remoteStart(request) {
    return invoke('app:remote-start', request);
  },
  remoteStop() {
    return invoke('app:remote-stop');
  },
  remoteStatus() {
    return invoke('app:remote-status');
  },
  remotePushState(stateData) {
    return invoke('app:remote-push-state', stateData);
  },
  remoteNewToken() {
    return invoke('app:remote-new-token');
  },
  quizServerStart(request) {
    return invoke('app:quiz-server-start', request);
  },
  quizServerStop() {
    return invoke('app:quiz-server-stop');
  },
  quizServerStatus() {
    return invoke('app:quiz-server-status');
  }
};

if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
  try {
    contextBridge.exposeInMainWorld('electronApi', exposedApi);
  } catch (error) {
    // contextBridge throws when contextIsolation is disabled.
    globalThis.electronApi = exposedApi;
  }
} else {
  // Fallback for unexpected contexts; avoids total renderer failure.
  globalThis.electronApi = exposedApi;
}
