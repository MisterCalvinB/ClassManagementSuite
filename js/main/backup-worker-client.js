'use strict';
/**
 * Main-process client helper for running backup jobs in js/workers/backup-worker.js
 * so archive compression and recursive file copying never block the Electron main thread.
 */
const path = require('path');
const { Worker } = require('worker_threads');

const WORKER_PATH = path.join(__dirname, '..', 'workers', 'backup-worker.js');

function runBackupWorker(task) {
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

module.exports = { runBackupWorker };
