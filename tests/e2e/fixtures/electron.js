'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test: base, expect, _electron: electron } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Playwright test fixture that launches the real Electron app with an isolated
 * PORTABLE_ROOT and Chromium --user-data-dir.
 */
const test = base.extend({
  /** Optional CLI args passed to Electron after ROOT (e.g. ['group-editor']). */
  electronArgs: [[], { option: true }],

  /** Whether to pre-seed user/config.js so first-run / tour overlays stay quiet. */
  seedConfig: [true, { option: true }],

  /** Optional map of relative paths under user/ to initial file contents. */
  seedFiles: [{}, { option: true }],

  portableRoot: async ({ seedConfig, seedFiles }, use) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmt-pw-'));
    const userDir = path.join(tmpDir, 'user');
    for (const sub of ['', 'grades', 'constellations', 'planner', 'doceditor']) {
      fs.mkdirSync(path.join(userDir, sub), { recursive: true });
    }

    if (seedConfig) {
      const configContent = 'window.USER_CONFIG = ' + JSON.stringify({
        lang: 'en',
        setupWizardCompleted: true,
        tutorialsSeen: {
          launcher: true,
          'group-editor': true,
          board: true,
          'class-management': true,
          'grade-sheet': true,
          planner: true,
          'document-editor': true
        }
      }, null, 2) + ';\n';
      fs.writeFileSync(path.join(userDir, 'config.js'), configContent, 'utf8');
    }

    for (const [relPath, content] of Object.entries(seedFiles || {})) {
      const full = path.join(userDir, relPath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }

    await use(tmpDir);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  },

  electronApp: async ({ portableRoot, electronArgs }, use) => {
    const userDataDir = path.join(portableRoot, 'electron-userdata');
    fs.mkdirSync(userDataDir, { recursive: true });

    const env = {
      ...process.env,
      PORTABLE_ROOT: portableRoot,
      CMT_TEST_ALLOW_MULTI_INSTANCE: '1'
    };
    delete env.ELECTRON_RUN_AS_NODE;

    const app = await electron.launch({
      args: [ROOT, `--user-data-dir=${userDataDir}`, ...electronArgs],
      cwd: ROOT,
      env
    });

    try {
      await use(app);
    } finally {
      await app.close().catch(() => {});
    }
  },

  page: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow();
    const pageErrors = [];
    win.on('pageerror', (err) => pageErrors.push(err.message));

    await win.waitForLoadState('domcontentloaded');
    await use(win);

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join('; ')}`).toEqual([]);
  },

  readUserFile: async ({ portableRoot }, use) => {
    await use((relPath) => fs.readFileSync(path.join(portableRoot, 'user', relPath), 'utf8'));
  },

  stubDialog: async ({ electronApp }, use) => {
    await use(async (method, returnValue) => {
      await electronApp.evaluate(({ dialog }, { methodName, val }) => {
        dialog[methodName] = async () => val;
      }, { methodName: method, val: returnValue });
    });
  }
});

module.exports = { test, expect };
