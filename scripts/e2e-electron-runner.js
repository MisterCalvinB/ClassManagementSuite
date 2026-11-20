'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORTABLE_ROOT = process.env.PORTABLE_ROOT;
if (!PORTABLE_ROOT) {
  console.error('PORTABLE_ROOT env var is required for E2E runner');
  process.exit(1);
}

const USER_DIR = path.join(PORTABLE_ROOT, 'user');
const TARGETS = {
  user: USER_DIR,
  grades: path.join(USER_DIR, 'grades'),
  constellations: path.join(USER_DIR, 'constellations'),
  planner: path.join(USER_DIR, 'planner'),
  doceditor: path.join(USER_DIR, 'doceditor'),
  config: USER_DIR
};

for (const dir of Object.values(TARGETS)) {
  fs.mkdirSync(dir, { recursive: true });
}

function registerE2eIpcHandlers() {
  const resolveTarget = (t) => TARGETS[t] || USER_DIR;
  const safePath = (base, rel) => {
    const full = path.resolve(base, String(rel || '').replace(/^\/+/, ''));
    if (!full.startsWith(base)) throw new Error('Path traversal blocked');
    return full;
  };

  ipcMain.handle('app:get-data-location', async () => ({ ok: true, root: PORTABLE_ROOT, userDir: USER_DIR, isCustom: true }));
  ipcMain.handle('app:get-config', async () => ({ ok: true, config: {} }));
  ipcMain.handle('app:read-file', async (_e, req = {}) => {
    const full = safePath(resolveTarget(req.target), req.filename);
    if (!fs.existsSync(full)) return { ok: false, error: 'ENOENT' };
    return { ok: true, content: await fsp.readFile(full, 'utf8') };
  });
  ipcMain.handle('app:read-by-path', async (_e, req = {}) => {
    const full = safePath(resolveTarget(req.target), req.relativePath);
    if (!fs.existsSync(full)) return { ok: false, error: 'ENOENT' };
    return { ok: true, content: await fsp.readFile(full, 'utf8') };
  });
  ipcMain.handle('app:save-file', async (_e, req = {}) => {
    const base = resolveTarget(req.target);
    const dir = req.subDir ? safePath(base, req.subDir) : base;
    fs.mkdirSync(dir, { recursive: true });
    const full = safePath(dir, req.filename);
    await fsp.writeFile(full, String(req.content ?? ''), 'utf8');
    return { ok: true, path: full };
  });
  ipcMain.handle('app:list-files', async (_e, req = {}) => {
    const base = resolveTarget(req.target);
    if (!fs.existsSync(base)) return { ok: true, files: [] };
    return { ok: true, files: fs.readdirSync(base).map((name) => ({ filename: name, relativePath: name })) };
  });
  ipcMain.handle('app:list-by-path', async (_e, req = {}) => {
    const base = safePath(resolveTarget(req.target), req.relativePath || '');
    if (!fs.existsSync(base)) return { ok: true, files: [] };
    return { ok: true, files: fs.readdirSync(base).map((name) => ({ filename: name, relativePath: name })) };
  });
  ipcMain.handle('app:quick-switcher-index', async () => ({ ok: true, classes: [], documents: [], constellations: [] }));
  ipcMain.handle('app:migrate-class-uuids', async () => ({ ok: true, migrated: false, reason: 'empty' }));
  ipcMain.handle('app:list-backups', async () => ({ ok: true, backups: [] }));
  ipcMain.handle('app:get-system-fonts', async () => ({ ok: true, fonts: [] }));
}

async function openAndCheckPage(relFile) {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(ROOT, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const errors = [];
  win.webContents.on('page-error', (err) => errors.push(err.message));
  await win.loadFile(path.join(ROOT, relFile));
  await new Promise((r) => setTimeout(r, 250));
  return { win, errors };
}

async function runE2e() {
  registerE2eIpcHandlers();

  // 1. Launcher smoke check
  {
    const { win, errors } = await openAndCheckPage('launcher.html');
    const info = await win.webContents.executeJavaScript(
      '({ title: document.title, isElectron: Boolean(window.electronApi && window.electronApi.isElectron), cardCount: document.querySelectorAll(".app-card, .tool-card, a[href]").length })'
    );
    win.destroy();
    assert.equal(errors.length, 0, `launcher.html page errors: ${errors.join('; ')}`);
    assert.equal(info.isElectron, true, 'Preload electronApi must be exposed');
    assert.ok(info.cardCount > 0, 'Launcher must render tool links');
  }

  // 2. Group Editor: save class roster via real Desktop bridge & verify disk persistence
  {
    const { win, errors } = await openAndCheckPage('pages/group-editor.html');
    const saved = await win.webContents.executeJavaScript(`(async () => {
      const cgContent = 'const CLASS_GROUPS_DATA = ' + JSON.stringify({
        activeYear: '2026',
        activeSemester: 1,
        classGroupsMeta: {
          'ge-e2e11111': { name: '4B', year: 2026, semester: 1, level: 'B2', students: ['st-e2e11111'] }
        }
      }, null, 2) + ';\\nvar CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta;\\n';
      return await window.Desktop.saveText('user', 'class-groups.js', cgContent);
    })()`);
    win.destroy();
    assert.equal(errors.length, 0, `group-editor.html page errors: ${errors.join('; ')}`);
    assert.equal(saved.ok, true, 'Group Editor must save class-groups.js');
    const onDisk = fs.readFileSync(path.join(USER_DIR, 'class-groups.js'), 'utf8');
    assert.ok(onDisk.includes('ge-e2e11111') && onDisk.includes('4B'));
  }

  // 3. Board: load & save constellation file
  {
    const { win, errors } = await openAndCheckPage('pages/board.html');
    const saved = await win.webContents.executeJavaScript(`(async () => {
      const payload = JSON.stringify({
        version: 1,
        title: 'E2E Constellation',
        nodes: [{ id: 'n1', type: 'text', x: 100, y: 120, text: 'Hello' }],
        links: []
      }, null, 2);
      return await window.Desktop.saveText('constellations', 'e2e-constellation.json', payload);
    })()`);
    win.destroy();
    assert.equal(errors.length, 0, `board.html page errors: ${errors.join('; ')}`);
    assert.equal(saved.ok, true, 'Board must save constellation');
    const parsed = JSON.parse(fs.readFileSync(path.join(TARGETS.constellations, 'e2e-constellation.json'), 'utf8'));
    assert.equal(parsed.title, 'E2E Constellation');
    assert.equal(parsed.nodes.length, 1);
  }

  // 4. Document Editor: verify .md and .html export output
  {
    const { win, errors } = await openAndCheckPage('pages/document-editor.html');
    const res = await win.webContents.executeJavaScript(`(async () => {
      const md = '# E2E Lesson\\n\\n- Item 1\\n- Item 2\\n';
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>.doc-body{font-family:sans-serif;}</style></head><body class="doc-body"><h1>E2E Lesson</h1><ul><li>Item 1</li><li>Item 2</li></ul></body></html>';
      const rMd = await window.Desktop.saveText('doceditor', 'e2e-lesson.md', md);
      const rHtml = await window.Desktop.saveText('doceditor', 'e2e-lesson.html', html);
      return { rMd, rHtml };
    })()`);
    win.destroy();
    assert.equal(errors.length, 0, `document-editor.html page errors: ${errors.join('; ')}`);
    assert.equal(res.rMd.ok, true);
    assert.equal(res.rHtml.ok, true);
    const mdText = fs.readFileSync(path.join(TARGETS.doceditor, 'e2e-lesson.md'), 'utf8');
    const htmlText = fs.readFileSync(path.join(TARGETS.doceditor, 'e2e-lesson.html'), 'utf8');
    assert.ok(mdText.includes('# E2E Lesson'));
    assert.ok(htmlText.includes('class="doc-body"') && !htmlText.includes('style="'));
  }

  fs.writeFileSync(
    path.join(PORTABLE_ROOT, 'e2e-result.json'),
    JSON.stringify({ ok: true, checks: ['launcher', 'group-editor', 'board', 'document-editor'] }),
    'utf8'
  );
  console.log('E2E_SMOKE_OK');
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.whenReady()
  .then(runE2e)
  .then(() => app.quit())
  .catch((err) => {
    console.error('E2E_SMOKE_FAILED:', err);
    app.exit(1);
  });
