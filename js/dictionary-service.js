'use strict';
/**
 * Quick Dictionary service (main process).
 *
 * Thin wrapper that lists word bank files, owns the lifecycle of the dictionary worker thread and
 * proxies sync/search requests to it. The worker (and all index memory) is terminated on dispose()
 * or after an idle period, so the dictionary costs nothing while it is not being used.
 */
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

const BANK_EXTENSIONS = new Set(['.js', '.json']);

function createDictionaryService(options) {
  const getBankDirs = options.getBankDirs;
  const workerPath = options.workerPath;
  const idleMs = typeof options.idleMs === 'number' ? options.idleMs : 10 * 60 * 1000;

  let worker = null;
  let seq = 0;
  let idleTimer = null;
  let selected = [];
  const pending = new Map();
  const status = { state: 'idle', loaded: {}, errors: {} };

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => dispose(), idleMs);
    if (idleTimer.unref) idleTimer.unref();
  }

  function failPending(reason) {
    pending.forEach((entry) => entry.reject(new Error(reason)));
    pending.clear();
  }

  function ensureWorker() {
    if (worker) return worker;
    const instance = new Worker(workerPath);
    worker = instance;
    instance.on('message', (message) => {
      const entry = message && pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      entry.resolve(message);
    });
    instance.on('error', (error) => {
      console.error('[Dictionary] worker error:', error);
      status.state = 'error';
      failPending(String((error && error.message) || error));
    });
    instance.on('exit', () => {
      if (worker === instance) worker = null;
      failPending('Dictionary worker stopped.');
    });
    return instance;
  }

  function request(message) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      try {
        ensureWorker().postMessage(Object.assign({ id }, message));
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
      resetIdleTimer();
    });
  }

  /** Lists every bank file (user folder wins over bundled copies with the same name). */
  async function scanBanks() {
    const found = new Map();
    for (const dir of getBankDirs()) {
      let entries = [];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (_) { continue; }
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!BANK_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        const key = entry.name.toLowerCase();
        if (found.has(key)) continue;
        const fullPath = path.join(dir, entry.name);
        let size = 0;
        try { size = (await fs.promises.stat(fullPath)).size; } catch (_) { /* ignore */ }
        found.set(key, { name: entry.name, path: fullPath, size });
      }
    }
    return Array.from(found.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async function listBanks() {
    const banks = await scanBanks();
    return banks.map((bank) => ({
      name: bank.name,
      size: bank.size,
      count: Object.prototype.hasOwnProperty.call(status.loaded, bank.name) ? status.loaded[bank.name] : null
    }));
  }

  async function setBanks(names) {
    const available = await scanBanks();
    const byName = new Map(available.map((bank) => [bank.name, bank]));
    const descriptors = [];
    for (const name of Array.isArray(names) ? names : []) {
      const bank = byName.get(String(name));
      if (bank && !descriptors.some((d) => d.name === bank.name)) descriptors.push({ name: bank.name, path: bank.path });
    }
    selected = descriptors.map((d) => d.name);
    status.state = 'loading';
    try {
      const outcome = await request({ type: 'sync', banks: descriptors });
      status.loaded = outcome.loaded || {};
      status.errors = outcome.errors || {};
      status.state = 'ready';
    } catch (error) {
      status.state = 'error';
      status.errors = { _: String((error && error.message) || error) };
    }
    return getStatus();
  }

  async function search(params) {
    const payload = params || {};
    const reply = await request({
      type: 'search',
      q: String(payload.q || '').slice(0, 200),
      scope: String(payload.scope || 'word'),
      banks: selected,
      limit: payload.limit
    });
    return {
      results: reply.results || [],
      total: reply.total || 0,
      suggestions: reply.suggestions || [],
      ms: reply.ms || 0
    };
  }

  function getStatus() {
    return {
      state: status.state,
      loaded: Object.assign({}, status.loaded),
      errors: Object.assign({}, status.errors),
      selected: selected.slice()
    };
  }

  function dispose() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    const instance = worker;
    worker = null;
    failPending('Dictionary worker disposed.');
    status.state = 'idle';
    status.loaded = {};
    if (instance) instance.terminate().catch(() => {});
  }

  return { listBanks, setBanks, search, getStatus, dispose };
}

module.exports = { createDictionaryService };
