'use strict';
/**
 * Main-process client helper for running backup jobs in js/workers/backup-worker.js.
 *
 * Uses Electron's utilityProcess (separate OS process with its own V8 heap and
 * libuv threadpool) when running inside Electron, and falls back to Node's
 * worker_threads when running in plain Node (e.g. unit tests).
 */
const path = require('path');

const WORKER_PATH = path.join(__dirname, '..', 'workers', 'backup-worker.js');

function getElectronUtilityProcess() {
  try {
    if (process.versions && process.versions.electron) {
      const electron = require('electron');
      if (electron && electron.utilityProcess && typeof electron.utilityProcess.fork === 'function') {
        return electron.utilityProcess;
      }
    }
  } catch { }
  return null;
}

function runWithUtilityProcess(utilityProcess, task) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = utilityProcess.fork(WORKER_PATH, [], {
      serviceName: 'cmt-backup-worker'
    });

    child.on('message', (msg) => {
      if (settled) return;
      settled = true;
      resolve(msg);
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new Error(`Backup worker process exited with code ${code}`));
      } else {
        resolve({ ok: false, error: 'Backup worker process exited without a result.' });
      }
    });

    child.postMessage(task);
  });
}

function runWithWorkerThread(task) {
  const { Worker } = require('worker_threads');
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(WORKER_PATH, { workerData: task });

    worker.on('message', (msg) => {
      if (settled) return;
      settled = true;
      resolve(msg);
    });

    worker.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    worker.on('exit', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new Error(`Backup worker exited with code ${code}`));
      } else {
        resolve({ ok: false, error: 'Backup worker exited without a result.' });
      }
    });
  });
}

function runBackupWorker(task) {
  const utilityProcess = getElectronUtilityProcess();
  if (utilityProcess) {
    return runWithUtilityProcess(utilityProcess, task);
  }
  return runWithWorkerThread(task);
}

module.exports = { runBackupWorker };
