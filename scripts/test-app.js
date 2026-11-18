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
  const i18n = require(path.join(ROOT, 'js', 'i18n.js'));
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
  const i18n = require(path.join(ROOT, 'js', 'i18n.js'));
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
  assert.equal(typeof mediaAi.registerMediaAiIpc, 'function');
  assert.equal(typeof docExport.registerDocExportIpc, 'function');
  assert.equal(typeof archives.registerArchiveIpc, 'function');
  assert.equal(typeof backupBoard.registerBackupBoardIpc, 'function');
  assert.equal(typeof printIpc.registerPrintIpc, 'function');
  assert.equal(typeof remoteQuiz.registerRemoteQuizIpc, 'function');

  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const cleanFiles = [
    ...walkFiles(path.join(ROOT, 'js', 'main'), '.js'),
    ...walkFiles(path.join(ROOT, 'scripts'), '.js')
  ];
  for (const file of cleanFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(emojiRe.test(content), false, `Disallowed Unicode emoji/symbol in ${path.relative(ROOT, file)}`);
  }
});

test('ImportUtils pure helpers: UUIDs, header normalization, and autoDetectMapping', () => {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'import-utils.js'), 'utf8');
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
});
