'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const net = require('node:net');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

const ROOT = path.resolve(__dirname, '..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    }).on('error', reject);
  });
}

function connectWs(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue = [];
    const waiters = [];

    ws.on('message', (raw) => {
      let parsed;
      try { parsed = JSON.parse(raw.toString('utf8')); }
      catch (_) { parsed = { raw: raw.toString('utf8') }; }
      if (waiters.length > 0) {
        const w = waiters.shift();
        w.resolve(parsed);
      } else {
        queue.push(parsed);
      }
    });

    ws.nextMsg = (predicate, timeoutMs = 4000) => {
      const idx = queue.findIndex((m) => !predicate || predicate(m));
      if (idx !== -1) return Promise.resolve(queue.splice(idx, 1)[0]);
      return new Promise((res, rej) => {
        const timer = setTimeout(() => rej(new Error('Timed out waiting for WS message')), timeoutMs);
        const check = (msg) => {
          if (!predicate || predicate(msg)) {
            clearTimeout(timer);
            res(msg);
          } else {
            queue.push(msg);
            waiters.push({ resolve: check });
          }
        };
        waiters.push({ resolve: check });
      });
    };

    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

test('IPC integration: js/main/ipc-file-ops.js against isolated temp user/ directory', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cmt-ipc-test-'));
  const userDir = path.join(tmpRoot, 'user');
  const gradesDir = path.join(userDir, 'grades');
  const plannerDir = path.join(userDir, 'planner');
  const constellationsDir = path.join(userDir, 'constellations');
  fs.mkdirSync(gradesDir, { recursive: true });
  fs.mkdirSync(plannerDir, { recursive: true });
  fs.mkdirSync(constellationsDir, { recursive: true });

  // Seed legacy name-keyed class-groups.js, students.js, planner-config.js, and planner/3A.js
  fs.writeFileSync(
    path.join(userDir, 'class-groups.js'),
    [
      'const CLASS_GROUPS_DATA = {',
      '  "activeYear": "2026",',
      '  "activeSemester": 1,',
      '  "classGroups": {',
      '    "3A": ["st-00000001", "st-00000002"]',
      '  },',
      '  "classGroupsMeta": {',
      '    "3A": { "year": 2026, "semester": 1, "level": "B1" }',
      '  }',
      '};',
      'var CLASS_GROUPS = CLASS_GROUPS_DATA.classGroups;',
      'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta;'
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(userDir, 'students.js'),
    'window.STUDENTS_ROSTER = [\n' +
    '  { uuid: "st-00000001", firstName: "Alice", lastName: "Dupont" },\n' +
    '  { uuid: "st-00000002", firstName: "Bob", lastName: "Martin" }\n' +
    '];\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(userDir, 'planner-config.js'),
    'window.PLANNER_CONFIG = { classes: { "3A": { color: "#5b8fcc" } } };\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(plannerDir, '3A.js'),
    'window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};\n' +
    'window.PLANNER_ENTRIES_BY_CLASS["3A"] = [{ id: "e1", classId: "3A", topic: "Intro" }];\n',
    'utf8'
  );

  const handlers = new Map();
  const broadcasts = [];
  const targets = {
    user: userDir,
    grades: gradesDir,
    planner: plannerDir,
    constellations: constellationsDir
  };

  const resolveDir = (t) => {
    const dir = targets[t];
    if (!dir) throw new Error(`Unknown target: ${t}`);
    return dir;
  };
  const resolveRel = (_page, t, rel) => {
    const base = resolveDir(t);
    const cleaned = String(rel || '').replace(/^\/+/, '');
    const full = path.resolve(base, cleaned);
    if (!full.startsWith(base)) throw new Error('Path traversal blocked');
    return full;
  };

  const { registerFileOpsIpc } = require(path.join(ROOT, 'js', 'main', 'ipc-file-ops.js'));
  registerFileOpsIpc({
    app: { getPath: () => tmpRoot },
    dialog: {},
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    fs: fsp,
    fsSync: fs,
    os,
    path,
    crypto,
    buildZip: async () => Buffer.alloc(0),
    getSaveTargets: () => targets,
    getRequestingPage: () => 'pages/file-manager.html',
    listAllowedPathFiles: async (_p, target, relPath) => {
      const dir = resolveRel(_p, target, relPath);
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).map((name) => ({ filename: name, relativePath: relPath ? `${relPath}/${name}` : name }));
    },
    createAllowedPathDirectory: async (_p, target, relPath) => {
      const dir = resolveRel(_p, target, relPath);
      fs.mkdirSync(dir, { recursive: true });
      return relPath;
    },
    _broadcastDataChanged: (_ev, page, info) => broadcasts.push({ page, info }),
    resolveAllowedTargetDir: (_p, target) => resolveDir(target),
    sanitizeFilename: (f) => path.basename(String(f || '')),
    renameAllowedPathEntry: async (_p, target, oldRel, newRel) => {
      await fsp.rename(resolveRel(_p, target, oldRel), resolveRel(_p, target, newRel));
      return newRel;
    },
    statAllowedPathEntry: async (_p, target, rel) => {
      const st = await fsp.stat(resolveRel(_p, target, rel));
      return { ok: true, size: st.size, isDirectory: st.isDirectory() };
    },
    copyAllowedPathEntry: async (_p, req) => {
      const srcTarget = req.sourceTarget || req.target;
      const dstTarget = req.destinationTarget || req.target;
      await fsp.copyFile(resolveRel(_p, srcTarget, req.sourceRelativePath), resolveRel(_p, dstTarget, req.destinationRelativePath));
      return { ok: true, relativePath: req.destinationRelativePath };
    },
    moveAllowedPathEntry: async (_p, req) => {
      const srcTarget = req.sourceTarget || req.target;
      const dstTarget = req.destinationTarget || req.target;
      await fsp.rename(resolveRel(_p, srcTarget, req.sourceRelativePath), resolveRel(_p, dstTarget, req.destinationRelativePath));
      return { ok: true, relativePath: req.destinationRelativePath };
    },
    deleteAllowedPathEntry: async (_p, target, rel) => {
      await fsp.rm(resolveRel(_p, target, rel), { recursive: true, force: true });
      return true;
    },
    sanitizeRelativePath: (p) => String(p || '').replace(/\.\./g, ''),
    resolveAllowedTargetPath: resolveRel
  });

  try {
    // 1. Migrate legacy class names to UUIDs
    const migrateRes = await handlers.get('app:migrate-class-uuids')({});
    assert.equal(migrateRes.ok, true);
    assert.equal(migrateRes.migrated, true);

    const migratedCg = fs.readFileSync(path.join(userDir, 'class-groups.js'), 'utf8');
    const cgSandbox = { window: {} };
    vm.runInNewContext(migratedCg.replace(/^(const|let)\s+/gm, 'var '), cgSandbox);
    const uuidKeys = Object.keys(cgSandbox.CLASS_GROUPS_DATA.classGroups);
    assert.equal(uuidKeys.length, 1);
    const classUuid = uuidKeys[0];
    assert.match(classUuid, /^ge-[0-9a-f]{8}$/);
    assert.equal(cgSandbox.CLASS_GROUPS_DATA.classGroupsMeta[classUuid].name, '3A');

    // Verify planner-config.js and planner/{uuid}.js were migrated too
    const plannerCfgText = fs.readFileSync(path.join(userDir, 'planner-config.js'), 'utf8');
    assert.ok(plannerCfgText.includes(classUuid), 'planner-config.js must use migrated class UUID');
    assert.ok(fs.existsSync(path.join(plannerDir, `${classUuid}.js`)), 'planner/{uuid}.js must be created');

    // Idempotency check
    const secondMigrate = await handlers.get('app:migrate-class-uuids')({});
    assert.equal(secondMigrate.migrated, false);
    assert.equal(secondMigrate.reason, 'already-done');

    // 2. Quick switcher index
    const qsRes = await handlers.get('app:quick-switcher-index')({});
    assert.equal(qsRes.ok, true);
    assert.equal(qsRes.classes.length, 1);
    assert.equal(qsRes.classes[0].name, '3A');
    assert.equal(qsRes.classes[0].students.length, 2);

    // 3. Directory & file ops by path
    await handlers.get('app:create-directory-by-path')({}, { target: 'user', relativePath: 'notes' });
    fs.writeFileSync(path.join(userDir, 'notes', 'a.txt'), 'hello', 'utf8');
    await handlers.get('app:copy-by-path')({}, { sourceTarget: 'user', sourceRelativePath: 'notes/a.txt', destinationTarget: 'user', destinationRelativePath: 'notes/b.txt' });
    await handlers.get('app:rename-by-path')({}, { target: 'user', oldRelativePath: 'notes/b.txt', newRelativePath: 'notes/c.txt' });
    const statRes = await handlers.get('app:stat-by-path')({}, { target: 'user', relativePath: 'notes/c.txt' });
    assert.equal(statRes.size, 5);
    const listRes = await handlers.get('app:list-by-path')({}, { target: 'user', relativePath: 'notes' });
    assert.deepEqual(listRes.files.map((f) => f.filename).sort(), ['a.txt', 'c.txt']);
    await handlers.get('app:delete-by-path')({}, { target: 'user', relativePath: 'notes/c.txt' });
    assert.equal(fs.existsSync(path.join(userDir, 'notes', 'c.txt')), false);
    assert.ok(broadcasts.length >= 3, 'Mutating IPC handlers must broadcast data-changed events');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Classroom Server integration: HTTP static routes and /quiz-ws + /cms-ws WebSocket flows', async () => {
  const port = await getFreePort();
  const proc = spawn(process.execPath, [path.join(ROOT, 'js', 'server', 'classroom-server.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Classroom server startup timeout')), 6000);
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString('utf8').includes('Classroom server running on port')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Classroom server exited early with code ${code}`));
    });
  });

  const sockets = [];
  try {
    // 1. HTTP route checks
    const quizPage = await httpGet(`http://127.0.0.1:${port}/quiz-player.html`);
    assert.equal(quizPage.status, 200);
    assert.ok(quizPage.body.includes('<html'), 'quiz-player.html must return HTML');

    const remotePage = await httpGet(`http://127.0.0.1:${port}/remote.html`);
    assert.equal(remotePage.status, 200);

    const missing = await httpGet(`http://127.0.0.1:${port}/definitely-not-a-page.html`);
    assert.equal(missing.status, 404);

    // 2. /quiz-ws host + player flow
    const hostWs = await connectWs(`ws://127.0.0.1:${port}/quiz-ws`);
    sockets.push(hostWs);
    hostWs.send(JSON.stringify({ type: 'hello', role: 'host', name: 'Teacher', hostSecret: 'sec-1' }));
    const hostWelcome = await hostWs.nextMsg((m) => m.type === 'welcome');
    assert.equal(hostWelcome.role, 'host');

    const playerWs = await connectWs(`ws://127.0.0.1:${port}/quiz-ws`);
    sockets.push(playerWs);
    playerWs.send(JSON.stringify({ type: 'hello', role: 'player', name: 'Alice' }));
    const playerWelcome = await playerWs.nextMsg((m) => m.type === 'welcome');
    assert.equal(playerWelcome.role, 'player');
    assert.equal(playerWelcome.name, 'Alice');

    const presence = await hostWs.nextMsg((m) => m.type === 'presence' && m.players.some((p) => p.name === 'Alice'));
    assert.equal(presence.players.length, 1);

    // Host sends a question
    hostWs.send(JSON.stringify({
      type: 'host_next_question',
      payload: { question: '2 + 2 = ?', answers: ['3', '4', '5'], correctIndex: 1 }
    }));
    const qMsg = await playerWs.nextMsg((m) => m.type === 'question');
    assert.equal(qMsg.payload.question, '2 + 2 = ?');

    // Player answers
    playerWs.send(JSON.stringify({
      type: 'player_answer',
      payload: { questionId: qMsg.payload.id, answerIndex: 1 }
    }));
    const ack = await playerWs.nextMsg((m) => m.type === 'answer_ack');
    assert.equal(ack.payload.questionId, qMsg.payload.id);

    // Host reveals answer -> player receives leaderboard with points > 0
    hostWs.send(JSON.stringify({ type: 'host_reveal' }));
    const reveal = await playerWs.nextMsg((m) => m.type === 'reveal');
    assert.equal(reveal.payload.correctIndex, 1);
    assert.ok(reveal.payload.leaderboard[0].score >= 500, 'Correct answer must award >= 500 points');

    // 3. /cms-ws remote relay flow
    const cmsHost = await connectWs(`ws://127.0.0.1:${port}/cms-ws`);
    sockets.push(cmsHost);
    cmsHost.send(JSON.stringify({ type: 'host_hello', secret: 'cms-sec', token: '123456' }));
    await cmsHost.nextMsg((m) => m.type === 'host_welcome' || m.type === 'welcome');

    const cmsClient = await connectWs(`ws://127.0.0.1:${port}/cms-ws`);
    sockets.push(cmsClient);
    cmsClient.send(JSON.stringify({ type: 'auth', token: '123456' }));
    const clientWelcome = await cmsClient.nextMsg((m) => m.type === 'auth_ok');
    assert.equal(clientWelcome.type, 'auth_ok', 'CMS client must authenticate with valid token');
  } finally {
    for (const s of sockets) {
      try { s.close(); } catch (_) {}
    }
    proc.kill();
  }
});
