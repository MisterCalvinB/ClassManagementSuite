'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function walkFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

test('JS syntax check: root Electron files and all js/**/*.js parse cleanly', () => {
  const targets = [
    path.join(ROOT, 'electron-main.js'),
    path.join(ROOT, 'electron-preload.js'),
    path.join(ROOT, 'electron-bridge.js'),
    ...walkFiles(path.join(ROOT, 'js'), '.js')
  ];
  assert.ok(targets.length > 50, 'Expected at least 50 JS files to check');
  for (const file of targets) {
    const code = fs.readFileSync(file, 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(code, { filename: file }),
      `Syntax error in ${path.relative(ROOT, file)}`
    );
  }
});

test('i18n 4-language parity: fr, de, it have zero missing keys vs en', () => {
  const i18n = require(path.join(ROOT, 'js', 'shared', 'i18n.js'));
  const S = i18n.STRINGS;
  assert.ok(S && S.en && S.fr && S.de && S.it, 'All 4 language dictionaries must load');
  const enKeys = Object.keys(S.en);
  assert.ok(enKeys.length > 9000, 'Expected >9000 English i18n keys');
  for (const lang of ['fr', 'de', 'it']) {
    const missing = enKeys.filter((k) => !(k in S[lang]));
    assert.equal(missing.length, 0, `${lang} is missing ${missing.length} keys (first: ${missing.slice(0, 5).join(', ')})`);
  }
});

test('i18n placeholder parity & runtime formatting (t / tFmt)', () => {
  const i18n = require(path.join(ROOT, 'js', 'shared', 'i18n.js'));
  const S = i18n.STRINGS;
  const extractVars = (str) => {
    const matches = String(str).match(/\{[a-zA-Z0-9_]+\}/g) || [];
    return [...new Set(matches)].sort();
  };

  for (const key of Object.keys(S.en)) {
    const enVars = extractVars(S.en[key]);
    if (enVars.length === 0) continue;
    for (const lang of ['fr', 'de', 'it']) {
      const langVars = extractVars(S[lang][key]);
      for (const v of enVars) {
        if (v === '{plural}' || v === '{s}') continue; // Grammatical plural suffixes vary by language
        assert.ok(
          langVars.includes(v),
          `Key "${key}" in ${lang} is missing placeholder ${v} (en has ${enVars.join(',')}, ${lang} has ${langVars.join(',')})`
        );
      }
    }
  }

  assert.equal(i18n.t('__nonexistent_key__', 'Fallback'), 'Fallback');
  assert.equal(
    i18n.tFmt('lcShowingCount', { count: 5, total: 20 }),
    i18n.t('lcShowingCount').replace('{count}', '5').replace('{total}', '20')
  );
});

test('HTML security: launcher.html and all pages/*.html include Content-Security-Policy (and unsafe-eval when needed)', () => {
  const htmlFiles = [
    path.join(ROOT, 'launcher.html'),
    ...walkFiles(path.join(ROOT, 'pages'), '.html')
  ];
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const cspMatch = content.match(/<meta[^>]*Content-Security-Policy[^>]*content="([^"]+)"/i);
    assert.ok(cspMatch, `Missing Content-Security-Policy in ${path.relative(ROOT, file)}`);
    if (!cspMatch[1].includes('unsafe-eval')) {
      const srcs = [...content.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
      for (const src of srcs) {
        const resolved = path.normalize(path.join(path.dirname(file), src));
        if (fs.existsSync(resolved) && !resolved.includes(`${path.sep}modules${path.sep}`)) {
          const js = fs.readFileSync(resolved, 'utf8');
          assert.equal(
            /new Function|\beval\s*\(/.test(js),
            false,
            `${path.relative(ROOT, file)} loads ${src} (uses eval/new Function) without 'unsafe-eval' in CSP`
          );
        }
      }
    }
  }
});

test('package.json: node script targets exist on disk', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
    const m = cmd.match(/^node\s+(?:--test\s+)?([^\s]+\.js)\b/);
    if (m) {
      const target = path.join(ROOT, m[1]);
      assert.ok(fs.existsSync(target), `Script "${name}" targets missing file: ${m[1]}`);
    }
  }
});

test('Main IPC modules export registration functions and contain no emojis', () => {
  const mediaAi = require(path.join(ROOT, 'js', 'main', 'ipc-media-ai.js'));
  const docExport = require(path.join(ROOT, 'js', 'main', 'ipc-doc-export.js'));
  const archives = require(path.join(ROOT, 'js', 'main', 'ipc-archives.js'));
  const backupBoard = require(path.join(ROOT, 'js', 'main', 'ipc-backup-board.js'));
  const printIpc = require(path.join(ROOT, 'js', 'main', 'ipc-print.js'));
  const remoteQuiz = require(path.join(ROOT, 'js', 'main', 'ipc-remote-quiz.js'));
  const cloudSync = require(path.join(ROOT, 'js', 'main', 'ipc-cloud-sync.js'));
  const zipUtils = require(path.join(ROOT, 'js', 'main', 'zip-utils.js'));
  const fileOps = require(path.join(ROOT, 'js', 'main', 'ipc-file-ops.js'));
  const plannerReminders = require(path.join(ROOT, 'js', 'main', 'ipc-planner-reminders.js'));
  const systemDict = require(path.join(ROOT, 'js', 'main', 'ipc-system-dict.js'));
  const presentation = require(path.join(ROOT, 'js', 'main', 'ipc-presentation.js'));
  const backupSync = require(path.join(ROOT, 'js', 'main', 'ipc-backup-sync.js'));
  assert.equal(typeof mediaAi.registerMediaAiIpc, 'function');
  assert.equal(typeof docExport.registerDocExportIpc, 'function');
  assert.equal(typeof archives.registerArchiveIpc, 'function');
  assert.equal(typeof backupBoard.registerBackupBoardIpc, 'function');
  assert.equal(typeof printIpc.registerPrintIpc, 'function');
  assert.equal(typeof remoteQuiz.registerRemoteQuizIpc, 'function');
  assert.equal(typeof cloudSync.registerCloudSyncIpc, 'function');
  assert.equal(typeof zipUtils.buildZip, 'function');
  assert.equal(typeof fileOps.registerFileOpsIpc, 'function');
  assert.equal(typeof plannerReminders.registerPlannerRemindersIpc, 'function');
  assert.equal(typeof systemDict.registerSystemDictIpc, 'function');
  assert.equal(typeof presentation.registerPresentationIpc, 'function');
  assert.equal(typeof backupSync.registerBackupSyncIpc, 'function');

  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const cleanFiles = [
    ...walkFiles(path.join(ROOT, 'js', 'main'), '.js'),
    ...walkFiles(path.join(ROOT, 'scripts'), '.js')
  ];
  for (const file of cleanFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(emojiRe.test(content), false, `Disallowed Unicode emoji/symbol in ${path.relative(ROOT, file)}`);
  }

  // Verify no js/main/*.js module uses an Electron/Node global without declaring/destructuring it
  const mainBuiltins = [
    'app', 'BrowserWindow', 'clipboard', 'desktopCapturer', 'dialog',
    'ipcMain', 'screen', 'shell', 'fs', 'fsSync', 'path', 'zlib',
    'os', 'http', 'https', 'crypto', 'spawn', 'ROOT_DIR', 'PAGE_FILES'
  ];
  for (const file of walkFiles(path.join(ROOT, 'js', 'main'), '.js')) {
    const content = fs.readFileSync(file, 'utf8');
    const fnIdx = content.indexOf('function ');
    const header = content.slice(0, fnIdx !== -1 ? fnIdx + 800 : 800);
    for (const g of mainBuiltins) {
      if (new RegExp(`\\b${g}\\.`).test(content)) {
        assert.ok(
          new RegExp(`\\b${g}\\b`).test(header),
          `${path.relative(ROOT, file)} accesses ${g}.* without declaring/destructuring ${g} in its header`
        );
      }
    }
  }

  // Deep cross-audit: verify no js/main/*.js references an electron-main.js top-level symbol without receiving/declaring it
  const mainSrc = fs.readFileSync(path.join(ROOT, 'electron-main.js'), 'utf8');
  const mainDefs = new Set();
  for (const m of mainSrc.matchAll(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm)) mainDefs.add(m[1]);
  for (const m of mainSrc.matchAll(/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm)) mainDefs.add(m[1]);

  for (const file of walkFiles(path.join(ROOT, 'js', 'main'), '.js')) {
    const content = fs.readFileSync(file, 'utf8');
    const fnIdx = content.indexOf('function ');
    const header = content.slice(0, fnIdx !== -1 ? fnIdx + 1200 : 1200);
    const innerDefs = new Set();
    for (const m of content.matchAll(/(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) innerDefs.add(m[1]);
    for (const m of content.matchAll(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) innerDefs.add(m[1]);

    const fileLines = content.split(/\r?\n/);
    for (const def of mainDefs) {
      if (innerDefs.has(def) || def === 'https') continue;
      if (new RegExp(`\\b${def}\\b`).test(content) && !new RegExp(`\\b${def}\\b`).test(header)) {
        const realUse = fileLines.some((l) => !l.trim().startsWith('//') && new RegExp(`(?<![.\\w$:-])${def}(?![\\w$:-])`).test(l));
        assert.equal(
          realUse,
          false,
          `${path.relative(ROOT, file)} references electron-main.js symbol "${def}" without receiving/declaring it`
        );
      }
    }
  }
});

test('ImportUtils pure helpers: UUIDs, header normalization, and autoDetectMapping', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'shared', 'import-utils.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  const ImportUtils = ctx.window.ImportUtils;
  assert.ok(ImportUtils, 'ImportUtils should attach to window');

  assert.match(ImportUtils.generateStudentUuid(), /^st-[0-9a-f]{8}$/);
  assert.match(ImportUtils.generateGroupUuid(), /^ge-[0-9a-f]{8}$/);
  assert.equal(ImportUtils.normalizeHeader('  First_Name! '), 'first name');

  const mapping = ImportUtils.autoDetectMapping(
    ['Email Address', 'Nom', 'Prénom'],
    [
      { key: 'firstName', autoMatch: ['first name', 'prénom'] },
      { key: 'lastName', autoMatch: ['last name', 'nom'] },
      { key: 'email', autoMatch: ['email', 'email address'] }
    ]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(mapping)),
    { firstName: 2, lastName: 1, email: 0 }
  );

  const mappedRows = ImportUtils.applyMapping(
    [['alice@school.org', 'Dupont', 'Alice']],
    ['Email', 'Nom', 'Prénom'],
    { firstName: 2, lastName: 1, email: 0, group: { type: 'manual', value: '3A' } },
    [
      { key: 'firstName' },
      { key: 'lastName' },
      { key: 'email' },
      { key: 'group' }
    ]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(mappedRows)),
    [{ firstName: 'Alice', lastName: 'Dupont', email: 'alice@school.org', group: '3A' }]
  );
});

test('zip-utils: crc32, DOS timestamp round-trip, and buildZip output structure', async () => {
  const { crc32, msToDosDateTime, dosDateTimeToMs, buildZip } = require(path.join(ROOT, 'js', 'main', 'zip-utils.js'));

  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);

  const sampleMs = new Date(2026, 4, 15, 14, 30, 10).getTime();
  const { dosTime, dosDate } = msToDosDateTime(sampleMs);
  const roundTripMs = dosDateTimeToMs(dosTime, dosDate);
  assert.equal(Math.abs(roundTripMs - sampleMs) <= 2000, true);

  const zipBuf = await buildZip([
    { name: 'hello.txt', data: Buffer.from('Hello Class Management Tools!'), mtimeMs: sampleMs }
  ]);
  assert.ok(Buffer.isBuffer(zipBuf));
  assert.equal(zipBuf.readUInt32LE(0), 0x04034b50);
  assert.ok(zipBuf.includes(Buffer.from('hello.txt')));
  assert.ok(zipBuf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])));
});

test('DomSync helpers: setText, setClass, setAttr, and patchListByKey preserve DOM node identity', () => {
  const DomSync = require(path.join(ROOT, 'js', 'shared', 'dom-sync.js'));

  const makeEl = (tag) => {
    const classes = new Set();
    const attrs = new Map();
    const el = {
      tagName: tag,
      _text: '',
      get textContent() { return this._text; },
      set textContent(v) { this._text = String(v); },
      dataset: {},
      children: [],
      classList: {
        contains: (c) => classes.has(c),
        toggle: (c, force) => {
          if (force === undefined) force = !classes.has(c);
          if (force) classes.add(c); else classes.delete(c);
        }
      },
      hasAttribute: (k) => attrs.has(k),
      getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
      setAttribute: (k, v) => attrs.set(k, String(v)),
      removeAttribute: (k) => attrs.delete(k),
      appendChild: (c) => { el.children.push(c); return c; },
      removeChild: (c) => {
        const idx = el.children.indexOf(c);
        if (idx !== -1) el.children.splice(idx, 1);
        return c;
      },
      insertBefore: (node, ref) => {
        const oldIdx = el.children.indexOf(node);
        if (oldIdx !== -1) el.children.splice(oldIdx, 1);
        if (!ref) {
          el.children.push(node);
        } else {
          const refIdx = el.children.indexOf(ref);
          el.children.splice(refIdx === -1 ? el.children.length : refIdx, 0, node);
        }
        return node;
      }
    };
    return el;
  };

  const container = makeEl('div');
  const firstItems = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }];
  DomSync.patchListByKey(
    container,
    firstItems,
    (x) => x.id,
    () => makeEl('span'),
    (node, x) => DomSync.setText(node, x.label)
  );
  assert.equal(container.children.length, 2);
  const nodeA = container.children[0];
  const nodeB = container.children[1];
  assert.equal(nodeA.textContent, 'Alpha');

  // Reorder + update + insert 'c' -> nodeA and nodeB must be the exact same object references
  const secondItems = [{ id: 'b', label: 'Beta-2' }, { id: 'c', label: 'Gamma' }, { id: 'a', label: 'Alpha' }];
  DomSync.patchListByKey(
    container,
    secondItems,
    (x) => x.id,
    () => makeEl('span'),
    (node, x) => DomSync.setText(node, x.label)
  );
  assert.equal(container.children.length, 3);
  assert.strictEqual(container.children[0], nodeB);
  assert.strictEqual(container.children[2], nodeA);
  assert.equal(nodeB.textContent, 'Beta-2');
  assert.equal(container.children[1].textContent, 'Gamma');
  assert.equal(DomSync.setText(nodeA, 'Alpha'), false);
  assert.equal(DomSync.setAttr(nodeA, 'data-test', '1'), true);
  assert.equal(DomSync.setAttr(nodeA, 'data-test', '1'), false);
  DomSync.setClass(nodeA, 'active', true);
  assert.equal(nodeA.classList.contains('active'), true);

  // Windowing math checks
  const emptyWin = DomSync.computeWindowRange(0, 0, 500, 40, 5);
  assert.deepEqual(emptyWin, { start: 0, end: 0, topHeight: 0, bottomHeight: 0 });

  const midWin = DomSync.computeWindowRange(200, 2000, 400, 40, 5);
  // firstVisible = 50, visibleCount = 10 -> start = 45, end = 65
  assert.equal(midWin.start, 45);
  assert.equal(midWin.end, 65);
  assert.equal(midWin.topHeight, 45 * 40);
  assert.equal(midWin.bottomHeight, (200 - 65) * 40);
});
