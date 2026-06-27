/**
 * Classroom Server — combined relay for quiz, notes, and CMS remote control.
 *
 * WebSocket endpoints
 *   /quiz-ws   — multiplayer quiz (host + players)
 *   /note-ws   — student note submission (note-host + note-students)
 *   /cms-ws    — CMS remote control relay (host app + phone clients)
 *
 * HTTP
 *   /                         → pages/quiz-player.html  (fallback for bare root)
 *   /remote, /remote.html     → pages/remote.html
 *   /quiz-player.html         → pages/quiz-player.html
 *   /student-note-player.html → pages/student-note-player.html
 *   everything else           → served from project root (static assets)
 */

'use strict';

const http   = require('http');
const fs     = require('fs');
const fsp    = require('fs/promises');
const path   = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const ROOT  = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const PORT  = Number(process.env.PORT || process.env.QUIZ_PORT || 8787);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon'
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeDecode(urlPath) {
  try { return decodeURIComponent(urlPath); }
  catch (_) { return urlPath; }
}

function sendJson(ws, payload) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(payload)); } catch (_) {}
}

function sha256(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz game state
// ─────────────────────────────────────────────────────────────────────────────

let quizHostWs    = null;
let quizSeq       = 0;
let quizCurrent   = null;
let quizEnded     = false;
const quizPlayers = new Map(); // playerId → { id, name, score, ws }
const quizSockets = new Map(); // ws → { role, playerId, name }

// Note room state
const noteHosts = new Map(); // noteId → { ws, noteId, classGroup, title }

function quizLeaderboard() {
  return Array.from(quizPlayers.values())
    .map(p => ({ id: p.id, name: p.name, score: Number(p.score || 0) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function quizPresence() {
  return {
    type: 'presence',
    players: Array.from(quizPlayers.values())
      .map(p => ({ id: p.id, name: p.name, score: Number(p.score || 0) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    leaderboard: quizLeaderboard()
  };
}

function quizAnswersPayload() {
  const answered = quizCurrent ? quizCurrent.responses.size : 0;
  return { type: 'answers', payload: { answered, total: quizPlayers.size } };
}

function quizPublicQuestion(q) {
  if (!q) return null;
  return { id: q.id, question: q.question, answers: q.answers };
}

function quizBroadcast(payload, filterFn) {
  const encoded = JSON.stringify(payload);
  for (const [ws, meta] of quizSockets.entries()) {
    if (ws.readyState !== 1) continue;
    if (filterFn && !filterFn(meta)) continue;
    try { ws.send(encoded); } catch (_) {}
  }
}

function quizScoreRound() {
  if (!quizCurrent) return quizLeaderboard();
  const q = quizCurrent;
  const base = 500, maxBonus = 500;
  const rows = [];

  for (const player of quizPlayers.values()) {
    const resp = q.responses.get(player.id);
    if (!resp) {
      rows.push({ id: player.id, name: player.name, scoreDelta: 0, score: player.score,
                  correct: false, answered: false, elapsedMs: null, speedRank: null });
      continue;
    }
    const correct = Number(resp.answerIndex) === Number(q.correctIndex);
    rows.push({ id: player.id, name: player.name, scoreDelta: 0, score: player.score,
                correct, answered: true, elapsedMs: Number(resp.elapsedMs || 0), speedRank: null });
  }

  const correctRows = rows.filter(r => r.correct)
    .sort((a, b) => Number(a.elapsedMs || 0) - Number(b.elapsedMs || 0));
  const n = correctRows.length;
  correctRows.forEach((row, idx) => {
    const ratio = n <= 1 ? 1 : 1 - (idx / (n - 1));
    const delta = base + Math.round(maxBonus * ratio);
    const player = quizPlayers.get(row.id);
    if (player) { player.score += delta; row.score = player.score; }
    row.scoreDelta = delta;
    row.speedRank = idx + 1;
  });

  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map(r => ({ id: r.id, name: r.name, score: r.score, scoreDelta: r.scoreDelta,
                 correct: r.correct, answered: r.answered, elapsedMs: r.elapsedMs, speedRank: r.speedRank }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz message handlers
// ─────────────────────────────────────────────────────────────────────────────

function quizHandleReveal(ws) {
  if (!quizCurrent) { sendJson(ws, { type: 'error', message: 'No active question.' }); return; }
  if (quizCurrent.revealed) return;
  quizCurrent.revealed = true;
  const leaderboard = quizScoreRound();
  quizBroadcast({ type: 'reveal', payload: {
    questionId: quizCurrent.id, correctIndex: quizCurrent.correctIndex,
    correctAnswer: quizCurrent.answers[quizCurrent.correctIndex] || '', leaderboard
  }});
  quizBroadcast(quizPresence());
}

function quizHandleNextQuestion(ws, payload) {
  const question = String((payload && payload.question) || '').trim();
  const answers  = Array.isArray(payload && payload.answers)
    ? payload.answers.map(v => String(v || '').trim()).filter(Boolean) : [];
  const correctIndex = Number(payload && payload.correctIndex);

  if (!question || answers.length < 2 || !Number.isInteger(correctIndex) ||
      correctIndex < 0 || correctIndex >= answers.length) {
    sendJson(ws, { type: 'error', message: 'Invalid question payload.' });
    return;
  }
  if (quizCurrent && !quizCurrent.revealed) quizHandleReveal(ws);

  quizSeq += 1;
  quizEnded  = false;
  quizCurrent = { id: quizSeq, question, answers, correctIndex,
                  startedAt: Date.now(), revealed: false, responses: new Map() };

  quizBroadcast({ type: 'question', payload: quizPublicQuestion(quizCurrent) });
  quizBroadcast(quizAnswersPayload());
}

function quizHandleEndGame(ws) {
  if (!quizCurrent && quizPlayers.size === 0) {
    sendJson(ws, { type: 'error', message: 'No active game.' }); return;
  }
  if (quizCurrent && !quizCurrent.revealed) quizHandleReveal(ws);

  quizEnded = true;
  const leaderboard = quizLeaderboard();
  const winner = leaderboard.length ? leaderboard[0] : null;
  const finalPayload = {
    leaderboard, winner,
    totalPlayers: quizPlayers.size,
    questionsPlayed: quizSeq,
    finishedAt: Date.now()
  };
  quizBroadcast({ type: 'final_results', payload: finalPayload });
}

function quizHandlePlayerAnswer(ws, meta, payload) {
  if (!meta || meta.role !== 'player' || !quizCurrent || quizCurrent.revealed || quizEnded) return;
  const questionId  = Number(payload && payload.questionId);
  const answerIndex = Number(payload && payload.answerIndex);
  if (questionId !== quizCurrent.id) return;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= quizCurrent.answers.length) return;
  if (quizCurrent.responses.has(meta.playerId)) return;

  quizCurrent.responses.set(meta.playerId, {
    answerIndex, elapsedMs: Math.max(0, Date.now() - quizCurrent.startedAt)
  });
  sendJson(ws, { type: 'answer_ack', payload: { questionId } });
  quizBroadcast(quizAnswersPayload());
}

// ─────────────────────────────────────────────────────────────────────────────
// Note room helpers
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeNoteId(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
}
function normalizeClassGroup(value) { return String(value || '').trim().slice(0, 80); }
function normalizeStudentText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 600);
}

function noteHandleHostOpen(ws, payload) {
  const noteId     = sanitizeNoteId(payload && payload.noteId);
  const classGroup = normalizeClassGroup(payload && payload.classGroup);
  const title      = String((payload && payload.title) || '').trim().slice(0, 120);

  if (!noteId) { sendJson(ws, { type: 'error', message: 'Invalid note room id.' }); return; }

  const room = noteHosts.get(noteId);
  if (room && room.ws !== ws && room.ws.readyState === 1) {
    sendJson(ws, { type: 'error', message: 'A different host is already using this note room id.' });
    return;
  }
  noteHosts.set(noteId, { ws, noteId, classGroup, title });
  sendJson(ws, { type: 'note_host_opened', payload: { noteId, classGroup, title } });
}

function noteHandleStudentSubmit(ws, meta, payload) {
  if (!meta || meta.role !== 'note-student') return;
  const text = normalizeStudentText(payload && payload.text);
  if (!text) { sendJson(ws, { type: 'error', message: 'Submission text is empty.' }); return; }

  const room = noteHosts.get(meta.noteId);
  if (!room || !room.ws || room.ws.readyState !== 1) {
    sendJson(ws, { type: 'error', message: 'Teacher note room is offline.' }); return;
  }
  sendJson(room.ws, { type: 'note_submission', payload: {
    noteId: meta.noteId, classGroup: meta.classGroup || '',
    studentName: meta.name || 'Student', text, timestamp: Date.now()
  }});
  sendJson(ws, { type: 'note_ack', payload: { noteId: meta.noteId, timestamp: Date.now() } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz/Note socket handler
// ─────────────────────────────────────────────────────────────────────────────

function quizNoteOnMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); }
  catch (_) { sendJson(ws, { type: 'error', message: 'Invalid JSON.' }); return; }

  const meta = quizSockets.get(ws);
  const type = String(msg && msg.type || '');

  if (type === 'hello') {
    const role    = String(msg && msg.role || '').trim();
    const rawName = String(msg && msg.name || '').trim();
    const safeName = (rawName || 'Player').slice(0, 24);

    if (role === 'host') {
      if (quizHostWs && quizHostWs !== ws && quizHostWs.readyState === 1) {
        sendJson(ws, { type: 'error', message: 'A host is already connected.' }); ws.close(); return;
      }
      quizHostWs = ws;
      quizSockets.set(ws, { role: 'host', name: safeName });
      sendJson(ws, { type: 'welcome', role: 'host' });
      sendJson(ws, quizPresence());
      sendJson(ws, quizAnswersPayload());
      if (quizCurrent) sendJson(ws, { type: 'question', payload: quizPublicQuestion(quizCurrent) });
      if (quizCurrent && quizCurrent.revealed) {
        sendJson(ws, { type: 'reveal', payload: {
          questionId: quizCurrent.id, correctIndex: quizCurrent.correctIndex,
          correctAnswer: quizCurrent.answers[quizCurrent.correctIndex] || '',
          leaderboard: quizLeaderboard()
        }});
      }
      if (quizEnded) {
        const lb = quizLeaderboard();
        sendJson(ws, { type: 'final_results', payload: {
          leaderboard: lb, winner: lb.length ? lb[0] : null,
          totalPlayers: quizPlayers.size, questionsPlayed: quizSeq, finishedAt: Date.now()
        }});
      }
      return;
    }

    if (role === 'player') {
      const playerId = 'p-' + Math.random().toString(36).slice(2, 10);
      quizPlayers.set(playerId, { id: playerId, name: safeName, score: 0, ws });
      quizSockets.set(ws, { role: 'player', playerId, name: safeName });
      sendJson(ws, { type: 'welcome', role: 'player', playerId, name: safeName });
      sendJson(ws, quizPresence());
      if (quizCurrent) sendJson(ws, { type: 'question', payload: quizPublicQuestion(quizCurrent) });
      if (quizCurrent && quizCurrent.revealed) {
        sendJson(ws, { type: 'reveal', payload: {
          questionId: quizCurrent.id, correctIndex: quizCurrent.correctIndex,
          correctAnswer: quizCurrent.answers[quizCurrent.correctIndex] || '',
          leaderboard: quizLeaderboard()
        }});
      }
      quizBroadcast(quizPresence());
      quizBroadcast(quizAnswersPayload(), m => m.role === 'host');
      return;
    }

    if (role === 'note-host') {
      quizSockets.set(ws, { role: 'note-host', name: safeName || 'Teacher' });
      sendJson(ws, { type: 'welcome', role: 'note-host' }); return;
    }

    if (role === 'note-student') {
      const noteId = sanitizeNoteId(msg && msg.noteId);
      const room   = noteHosts.get(noteId);
      if (!noteId || !room || !room.ws || room.ws.readyState !== 1) {
        sendJson(ws, { type: 'error', message: 'This note room is unavailable.' }); return;
      }
      const studentName = (safeName || 'Student').slice(0, 24);
      const classGroup  = normalizeClassGroup(msg && msg.classGroup);
      if (room.classGroup && classGroup && room.classGroup !== classGroup) {
        sendJson(ws, { type: 'error', message: 'Wrong class selected for this note room.' }); return;
      }
      quizSockets.set(ws, { role: 'note-student', noteId,
        classGroup: classGroup || room.classGroup || '', name: studentName });
      sendJson(ws, { type: 'welcome', role: 'note-student', noteId,
        classGroup: classGroup || room.classGroup || '', title: room.title || '' });
      return;
    }

    sendJson(ws, { type: 'error', message: 'Role must be host, player, note-host, or note-student.' });
    return;
  }

  if (!meta) { sendJson(ws, { type: 'error', message: 'Send hello first.' }); return; }

  if (type === 'host_next_question' && meta.role === 'host') quizHandleNextQuestion(ws, msg.payload || {});
  else if (type === 'host_reveal'   && meta.role === 'host') quizHandleReveal(ws);
  else if (type === 'host_end_game' && meta.role === 'host') quizHandleEndGame(ws);
  else if (type === 'player_answer' && meta.role === 'player') quizHandlePlayerAnswer(ws, meta, msg.payload || {});
  else if (type === 'note_host_open'  && meta.role === 'note-host')    noteHandleHostOpen(ws, msg.payload || {});
  else if (type === 'note_submit'     && meta.role === 'note-student') noteHandleStudentSubmit(ws, meta, msg.payload || {});
  else if (type === 'ping') sendJson(ws, { type: 'pong' });
}

function quizNoteOnClose(ws) {
  const meta = quizSockets.get(ws);
  quizSockets.delete(ws);
  if (!meta) return;

  if (meta.role === 'host') {
    if (quizHostWs === ws) quizHostWs = null;
    quizBroadcast({ type: 'status', payload: { hostOnline: false, message: 'Host disconnected.' } });
    return;
  }
  if (meta.role === 'player' && meta.playerId) {
    quizPlayers.delete(meta.playerId);
    if (quizCurrent && quizCurrent.responses) quizCurrent.responses.delete(meta.playerId);
    quizBroadcast(quizPresence());
    quizBroadcast(quizAnswersPayload(), m => m.role === 'host');
    return;
  }
  if (meta.role === 'note-host') {
    const closed = [];
    for (const [noteId, room] of noteHosts.entries()) {
      if (room && room.ws === ws) { noteHosts.delete(noteId); closed.push(noteId); }
    }
    if (closed.length) {
      const closedSet = new Set(closed);
      quizBroadcast(
        { type: 'status', payload: { hostOnline: false, message: 'Teacher note room went offline.' } },
        m => m.role === 'note-student' && closedSet.has(m.noteId)
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS relay state
// ─────────────────────────────────────────────────────────────────────────────

let cmsHostWs        = null;   // the Electron app's WS connection
let cmsHostSecretHash = null;  // SHA-256 of the host secret (set on first host_hello)
let cmsStudentToken  = null;   // 6-char token phones must send
let cmsLastState     = null;   // last cached state JSON (sent to new phone connections)
const cmsClients     = new Set(); // authenticated phone WS connections
const cmsSockets     = new Map(); // ws → { role: 'cms-host' | 'cms-client', authed: bool }

function cmsBroadcastToClients(payload) {
  const msg = JSON.stringify(payload);
  cmsLastState = msg;
  for (const ws of cmsClients) {
    if (ws.readyState === 1) try { ws.send(msg); } catch (_) {}
  }
}

function cmsNotifyHostClientCount() {
  if (!cmsHostWs || cmsHostWs.readyState !== 1) return;
  sendJson(cmsHostWs, { type: 'client_count', count: cmsClients.size });
}

function cmsCheckRate(ws) {
  const now = Date.now();
  if (!ws._rl) ws._rl = { n: 0, t: now };
  if (now - ws._rl.t > 2000) { ws._rl = { n: 1, t: now }; return true; }
  return (++ws._rl.n) <= 15;
}

const CMS_ALLOWED_ACTIONS = new Set(['score', 'badge_add', 'badge_remove']);

// ─────────────────────────────────────────────────────────────────────────────
// CMS socket handler
// ─────────────────────────────────────────────────────────────────────────────

function cmsOnMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); }
  catch (_) { sendJson(ws, { type: 'error', reason: 'Invalid JSON.' }); return; }

  const meta = cmsSockets.get(ws);
  const type = String(msg && msg.type || '');

  // ── Host hello ────────────────────────────────────────────────────────────
  if (type === 'host_hello') {
    const secret = String(msg.secret || '');
    const token  = String(msg.token || '').toUpperCase().trim();

    if (!secret) { sendJson(ws, { type: 'host_error', reason: 'Missing host secret.' }); return; }
    if (!token || token.length < 4) { sendJson(ws, { type: 'host_error', reason: 'Missing or invalid student token.' }); return; }

    const hash = sha256(secret);

    // If a host is already connected and alive, only allow reconnect with same secret
    if (cmsHostWs && cmsHostWs !== ws && cmsHostWs.readyState === 1) {
      if (cmsHostSecretHash && hash !== cmsHostSecretHash) {
        sendJson(ws, { type: 'host_error', reason: 'A host session is already active with a different secret.' });
        return;
      }
      // Same secret: allow takeover (e.g., app restarted while server kept running)
      try { cmsHostWs.close(); } catch (_) {}
    }

    cmsHostWs        = ws;
    cmsHostSecretHash = hash;
    cmsStudentToken  = token;
    cmsSockets.set(ws, { role: 'cms-host' });

    sendJson(ws, { type: 'host_welcome', clientCount: cmsClients.size });
    return;
  }

  // ── Client auth (phone) ───────────────────────────────────────────────────
  if (type === 'auth') {
    const token = String(msg.token || '').toUpperCase().trim();
    if (!cmsStudentToken) {
      sendJson(ws, { type: 'auth_fail', reason: 'Host not connected yet.' }); return;
    }
    if (token !== cmsStudentToken) {
      sendJson(ws, { type: 'auth_fail', reason: 'Invalid token.' }); return;
    }
    cmsSockets.set(ws, { role: 'cms-client', authed: true });
    cmsClients.add(ws);
    sendJson(ws, { type: 'auth_ok' });
    if (cmsLastState) try { ws.send(cmsLastState); } catch (_) {}
    // Ask app to push fresh state
    if (cmsHostWs && cmsHostWs.readyState === 1) {
      sendJson(cmsHostWs, { type: 'request_state' });
    }
    cmsNotifyHostClientCount();
    return;
  }

  if (!meta) { sendJson(ws, { type: 'error', reason: 'Send host_hello or auth first.' }); return; }

  // ── Host messages ─────────────────────────────────────────────────────────
  if (meta.role === 'cms-host') {
    if (type === 'state') {
      cmsBroadcastToClients(msg);
    } else if (type === 'new_token') {
      const newToken = String(msg.token || '').toUpperCase().trim();
      if (newToken && newToken.length >= 4) {
        cmsStudentToken = newToken;
        for (const ws of cmsClients) { try { ws.close(); } catch (_) {} }
        cmsClients.clear();
        cmsLastState = null;
        cmsNotifyHostClientCount();
      }
    } else if (type === 'ping') {
      sendJson(ws, { type: 'pong' });
    }
    return;
  }

  // ── Client messages (phone) ───────────────────────────────────────────────
  if (meta.role === 'cms-client' && meta.authed) {
    if (type === 'action') {
      const action = String(msg.action || '');
      if (!CMS_ALLOWED_ACTIONS.has(action)) {
        sendJson(ws, { type: 'error', cmdId: msg.cmdId, reason: 'Unknown action.' }); return;
      }
      if (!cmsCheckRate(ws)) {
        sendJson(ws, { type: 'error', cmdId: msg.cmdId, reason: 'Rate limit exceeded.' }); return;
      }
      // Deduplication
      const cmdId = msg.cmdId ? String(msg.cmdId) : null;
      if (cmdId) {
        if (!ws._seenCmds) ws._seenCmds = new Set();
        if (ws._seenCmds.has(cmdId)) {
          sendJson(ws, { type: 'ack', cmdId, ok: true, dedup: true }); return;
        }
        if (ws._seenCmds.size > 300) ws._seenCmds.clear();
        ws._seenCmds.add(cmdId);
      }

      // Send immediate ack to phone, relay action to host
      sendJson(ws, { type: 'ack', cmdId, ok: true });
      if (cmsHostWs && cmsHostWs.readyState === 1) {
        sendJson(cmsHostWs, { type: 'action', ...msg });
      }
    } else if (type === 'request_state') {
      if (cmsLastState) try { ws.send(cmsLastState); } catch (_) {}
    } else if (type === 'ping') {
      sendJson(ws, { type: 'pong' });
    }
  }
}

function cmsOnClose(ws) {
  const meta = cmsSockets.get(ws);
  cmsSockets.delete(ws);
  if (!meta) return;

  if (meta.role === 'cms-host') {
    if (cmsHostWs === ws) cmsHostWs = null;
    // Notify phones the host went offline
    for (const clientWs of cmsClients) {
      sendJson(clientWs, { type: 'status', payload: { hostOnline: false, message: 'Host disconnected.' } });
    }
    return;
  }
  if (meta.role === 'cms-client') {
    cmsClients.delete(ws);
    cmsNotifyHostClientCount();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP server
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_ROUTES = {
  '/':                         path.join(PAGES, 'remote.html'),
  '/remote':                   path.join(PAGES, 'remote.html'),
  '/remote.html':              path.join(PAGES, 'remote.html'),
  '/quiz-player.html':         path.join(PAGES, 'quiz-player.html'),
  '/student-note-player.html': path.join(PAGES, 'student-note-player.html'),
};

const server = http.createServer(async (req, res) => {
  const urlPath  = safeDecode((new URL(req.url || '/', 'http://localhost')).pathname || '/');
  const pagePath = PAGE_ROUTES[urlPath];

  if (pagePath) {
    try {
      const content = await fsp.readFile(pagePath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(content);
    } catch (_) {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  // Static assets from project root
  const resolved = path.normalize(path.join(ROOT, urlPath));
  if (!resolved.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  try {
    const stat = await fsp.stat(resolved);
    if (!stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext  = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    fs.createReadStream(resolved).pipe(res);
  } catch (_) {
    res.writeHead(404); res.end('Not found');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket servers
// ─────────────────────────────────────────────────────────────────────────────

const quizWss = new WebSocketServer({ noServer: true });
const noteWss = new WebSocketServer({ noServer: true });
const cmsWss  = new WebSocketServer({ noServer: true });

function attachServer(wss, onMsg, onClose) {
  wss.on('connection', (ws) => {
    ws.on('message', (raw) => onMsg(ws, raw));
    ws.on('close',   ()    => onClose(ws));
    ws.on('error',   ()    => onClose(ws));
  });
}

attachServer(quizWss, quizNoteOnMessage, quizNoteOnClose);
attachServer(noteWss, quizNoteOnMessage, quizNoteOnClose);
attachServer(cmsWss,  cmsOnMessage,      cmsOnClose);

server.on('upgrade', (req, socket, head) => {
  let pathname = '';
  try { pathname = new URL(req.url || '/', 'http://localhost').pathname; } catch (_) {}

  const target = pathname === '/quiz-ws' ? quizWss
               : pathname === '/note-ws' ? noteWss
               : pathname === '/cms-ws'  ? cmsWss
               : null;

  if (!target) {
    try { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); } catch (_) {}
    try { socket.destroy(); } catch (_) {}
    return;
  }
  target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Classroom server running on port ' + PORT);
  console.log('  Quiz WS:    ws://localhost:' + PORT + '/quiz-ws');
  console.log('  Note WS:    ws://localhost:' + PORT + '/note-ws');
  console.log('  CMS WS:     ws://localhost:' + PORT + '/cms-ws');
  console.log('  Quiz player: http://localhost:' + PORT + '/quiz-player.html');
  console.log('  Remote:      http://localhost:' + PORT + '/remote.html');
});
