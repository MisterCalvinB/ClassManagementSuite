'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

test('Electron E2E smoke suite: launcher, group-editor roster save, board constellation save, and .md/.html exports', () => {
  const electronBin = require('electron');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmt-e2e-'));
  const userDataDir = path.join(tmpDir, 'electron-userdata');
  fs.mkdirSync(userDataDir, { recursive: true });

  try {
    const childEnv = { ...process.env, PORTABLE_ROOT: tmpDir };
    delete childEnv.ELECTRON_RUN_AS_NODE;
    const res = spawnSync(
      electronBin,
      [path.join(ROOT, 'scripts', 'e2e-electron-runner.js'), `--user-data-dir=${userDataDir}`],
      {
        cwd: ROOT,
        env: childEnv,
        encoding: 'utf8',
        timeout: 45000
      }
    );
    assert.equal(res.status, 0, `Electron E2E exited with ${res.status}:\n${res.stdout}\n${res.stderr}`);
    const resultFile = path.join(tmpDir, 'e2e-result.json');
    assert.ok(fs.existsSync(resultFile), `Expected E2E result marker file at ${resultFile}`);
    const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    assert.equal(result.ok, true);
    assert.deepEqual(result.checks, ['launcher', 'group-editor', 'board', 'document-editor']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
