const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { WebSocketServer } = require('ws');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.QUIZ_PORT || process.env.PORT || 8787);
const USER_GAME_RESULTS_DIR = path.join(ROOT, 'user', 'game-results');
const GAME_RESULTS_FILE = path.join(USER_GAME_RESULTS_DIR, 'game-results.js');
const LEGACY_GAME_RESULTS_FILE = path.join(ROOT, 'user', 'log', 'game-results.js');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

let hostWs = null;
let questionSeq = 0;
let currentQuestion = null;
let gameEnded = false;
const players = new Map(); // playerId -> { id, name, score, ws }
const sockets = new Map(); // ws -> { role, playerId, name }
const noteHosts = new Map(); // noteId -> { ws, noteId, classGroup, title }

const GAME_RESULTS_FILE_HEADER = [
  'globalThis.GAME_RESULTS_LOG = globalThis.GAME_RESULTS_LOG || [];',
  'if (typeof module !== "undefined" && module.exports) {',
  '  module.exports = { GAME_RESULTS_LOG: globalThis.GAME_RESULTS_LOG };',
  '}',
  ''
].join('\n');

function safeDecode(urlPath) {
  try { return decodeURIComponent(urlPath); }
  catch (_) { return urlPath; }
}

function toPublicQuestion(q) {
  if (!q) return null;
  return {
    id: q.id,
    question: q.question,
    answers: q.answers
  };
}

function leaderboardRows() {
  return Array.from(players.values())
    .map(p => ({ id: p.id, name: p.name, score: Number(p.score || 0) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function sendJson(ws, payload) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(payload)); } catch (_) {}
}

function broadcast(payload, filterFn) {
  const encoded = JSON.stringify(payload);
  for (const [ws, meta] of sockets.entries()) {
    if (ws.readyState !== 1) continue;
    if (filterFn && !filterFn(meta)) continue;
    try { ws.send(encoded); } catch (_) {}
  }
}

function presencePayload() {
  return {
    type: 'presence',
    players: Array.from(players.values())
      .map(p => ({ id: p.id, name: p.name, score: Number(p.score || 0) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    leaderboard: leaderboardRows()
  };
}

function answersPayload() {
  const answered = currentQuestion ? currentQuestion.responses.size : 0;
  return {
    type: 'answers',
    payload: {
      answered,
      total: players.size
    }
  };
}

function sanitizeNoteId(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
}

function normalizeClassGroup(value) {
  return String(value || '').trim().slice(0, 80);
}

function normalizeStudentText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 600);
}

async function ensureGameResultsLogFile() {
  await fsp.mkdir(USER_GAME_RESULTS_DIR, { recursive: true });
  try {
    await fsp.access(GAME_RESULTS_FILE);
  } catch (_) {
    try {
      const legacy = await fsp.readFile(LEGACY_GAME_RESULTS_FILE, 'utf8');
      const content = String(legacy || '').trim();
      if (content) {
        await fsp.writeFile(GAME_RESULTS_FILE, legacy, 'utf8');
        return;
      }
    } catch (_) {}
    await fsp.writeFile(GAME_RESULTS_FILE, GAME_RESULTS_FILE_HEADER, 'utf8');
  }
}

async function persistGameResults(resultPayload) {
  const payload = resultPayload && typeof resultPayload === 'object' ? resultPayload : {};
  const leaderboard = Array.isArray(payload.leaderboard)
    ? payload.leaderboard.map((row) => ({
        id: String((row && row.id) || ''),
        name: String((row && row.name) || 'Player'),
        score: Number((row && row.score) || 0)
      }))
    : [];

  const entry = {
    savedAt: Date.now(),
    winner: payload.winner && typeof payload.winner === 'object'
      ? {
          id: String(payload.winner.id || ''),
          name: String(payload.winner.name || 'Player'),
          score: Number(payload.winner.score || 0)
        }
      : null,
    totalPlayers: Number(payload.totalPlayers || 0),
    questionsPlayed: Number(payload.questionsPlayed || 0),
    finishedAt: Number(payload.finishedAt || Date.now()),
    leaderboard
  };

  await ensureGameResultsLogFile();
  const line = 'globalThis.GAME_RESULTS_LOG.push(' + JSON.stringify(entry) + ');\n';
  await fsp.appendFile(GAME_RESULTS_FILE, line, 'utf8');
}

function handleNoteHostOpen(ws, payload) {
  const noteId = sanitizeNoteId(payload && payload.noteId);
  const classGroup = normalizeClassGroup(payload && payload.classGroup);
  const title = String((payload && payload.title) || '').trim().slice(0, 120);

  if (!noteId) {
    sendJson(ws, { type: 'error', message: 'Invalid note room id.' });
    return;
  }

  const room = noteHosts.get(noteId);
  if (room && room.ws !== ws && room.ws.readyState === 1) {
    sendJson(ws, { type: 'error', message: 'A different host is already using this note room id.' });
    return;
  }

  noteHosts.set(noteId, {
    ws,
    noteId,
    classGroup,
    title
  });

  sendJson(ws, {
    type: 'note_host_opened',
    payload: {
      noteId,
      classGroup,
      title
    }
  });
}

function handleNoteStudentSubmit(ws, meta, payload) {
  if (!meta || meta.role !== 'note-student') return;
  const text = normalizeStudentText(payload && payload.text);
  if (!text) {
    sendJson(ws, { type: 'error', message: 'Submission text is empty.' });
    return;
  }

  const room = noteHosts.get(meta.noteId);
  if (!room || !room.ws || room.ws.readyState !== 1) {
    sendJson(ws, { type: 'error', message: 'Teacher note room is offline.' });
    return;
  }

  sendJson(room.ws, {
    type: 'note_submission',
    payload: {
      noteId: meta.noteId,
      classGroup: meta.classGroup || '',
      studentName: meta.name || 'Student',
      text,
      timestamp: Date.now()
    }
  });

  sendJson(ws, {
    type: 'note_ack',
    payload: {
      noteId: meta.noteId,
      timestamp: Date.now()
    }
  });
}

function scoreQuestion() {
  if (!currentQuestion) return leaderboardRows();
  const q = currentQuestion;
  const base = 500;
  const maxBonus = 500;
  const responseRows = [];

  for (const player of players.values()) {
    const resp = q.responses.get(player.id);
    if (!resp) {
      responseRows.push({
        id: player.id,
        name: player.name,
        scoreDelta: 0,
        score: player.score,
        correct: false,
        answered: false,
        elapsedMs: null,
        speedRank: null
      });
      continue;
    }
    const isCorrect = Number(resp.answerIndex) === Number(q.correctIndex);
    responseRows.push({
      id: player.id,
      name: player.name,
      scoreDelta: 0,
      score: player.score,
      correct: isCorrect,
      answered: true,
      elapsedMs: Number(resp.elapsedMs || 0),
      speedRank: null
    });
  }

  const correctRows = responseRows
    .filter(r => r.correct)
    .sort((a, b) => Number(a.elapsedMs || 0) - Number(b.elapsedMs || 0));

  const correctCount = correctRows.length;
  correctRows.forEach((row, idx) => {
    const ratio = correctCount <= 1 ? 1 : (1 - (idx / (correctCount - 1)));
    const speedBonus = Math.round(maxBonus * ratio);
    const delta = base + speedBonus;
    const player = players.get(row.id);
    if (player) {
      player.score += delta;
      row.score = player.score;
    }
    row.scoreDelta = delta;
    row.speedRank = idx + 1;
  });

  return responseRows
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map(r => ({
      id: r.id,
      name: r.name,
      score: r.score,
      scoreDelta: r.scoreDelta,
      correct: r.correct,
      answered: r.answered,
      elapsedMs: r.elapsedMs,
      speedRank: r.speedRank
    }));
}

function handleHostNextQuestion(ws, payload) {
  const question = String((payload && payload.question) || '').trim();
  const answers = Array.isArray(payload && payload.answers)
    ? payload.answers.map(v => String(v || '').trim()).filter(Boolean)
    : [];
  const correctIndex = Number(payload && payload.correctIndex);

  if (!question || answers.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= answers.length) {
    sendJson(ws, { type: 'error', message: 'Invalid question payload from host.' });
    return;
  }

  // If the teacher advances without pressing reveal, finalize the current round first
  // so answers are scored and the leaderboard is preserved.
  if (currentQuestion && !currentQuestion.revealed) {
    handleHostReveal(ws);
  }

  questionSeq += 1;
  gameEnded = false;
  currentQuestion = {
    id: questionSeq,
    question,
    answers,
    correctIndex,
    startedAt: Date.now(),
    revealed: false,
    responses: new Map()
  };

  broadcast({ type: 'question', payload: toPublicQuestion(currentQuestion) });
  broadcast(answersPayload());
}

function handleHostEndGame(ws) {
  if (!currentQuestion && players.size === 0) {
    sendJson(ws, { type: 'error', message: 'No active game to end.' });
    return;
  }

  if (currentQuestion && !currentQuestion.revealed) {
    handleHostReveal(ws);
  }

  gameEnded = true;
  const leaderboard = leaderboardRows();
  const winner = leaderboard.length ? leaderboard[0] : null;
  const finalPayload = {
    leaderboard,
    winner,
    totalPlayers: players.size,
    questionsPlayed: questionSeq,
    finishedAt: Date.now()
  };

  persistGameResults(finalPayload).catch((err) => {
    console.warn('Could not persist game results:', err && err.message ? err.message : err);
  });

  broadcast({
    type: 'final_results',
    payload: finalPayload
  });
}

function handleHostReveal(ws) {
  if (!currentQuestion) {
    sendJson(ws, { type: 'error', message: 'No active question to reveal.' });
    return;
  }
  if (currentQuestion.revealed) return;

  currentQuestion.revealed = true;
  const leaderboard = scoreQuestion();
  broadcast({
    type: 'reveal',
    payload: {
      questionId: currentQuestion.id,
      correctIndex: currentQuestion.correctIndex,
      correctAnswer: currentQuestion.answers[currentQuestion.correctIndex] || '',
      leaderboard
    }
  });
  broadcast(presencePayload());
}

function handlePlayerAnswer(ws, meta, payload) {
  if (!meta || meta.role !== 'player' || !currentQuestion || currentQuestion.revealed || gameEnded) return;

  const questionId = Number(payload && payload.questionId);
  const answerIndex = Number(payload && payload.answerIndex);
  if (!Number.isInteger(questionId) || questionId !== currentQuestion.id) return;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= currentQuestion.answers.length) return;
  if (currentQuestion.responses.has(meta.playerId)) return;

  currentQuestion.responses.set(meta.playerId, {
    answerIndex,
    elapsedMs: Math.max(0, Date.now() - currentQuestion.startedAt)
  });

  sendJson(ws, { type: 'answer_ack', payload: { questionId } });
  broadcast(answersPayload());
}

function onSocketMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (_) {
    sendJson(ws, { type: 'error', message: 'Invalid JSON message.' });
    return;
  }

  const meta = sockets.get(ws);
  const type = String(msg && msg.type || '');

  if (type === 'hello') {
    const role = String(msg && msg.role || '').trim();
    const rawName = String(msg && msg.name || '').trim();
    const safeName = (rawName || 'Player').slice(0, 24);

    if (role === 'host') {
      if (hostWs && hostWs !== ws && hostWs.readyState === 1) {
        sendJson(ws, { type: 'error', message: 'A host is already connected.' });
        ws.close();
        return;
      }
      hostWs = ws;
      sockets.set(ws, { role: 'host', name: safeName });
      sendJson(ws, { type: 'welcome', role: 'host' });
      sendJson(ws, presencePayload());
      sendJson(ws, answersPayload());
      if (currentQuestion) sendJson(ws, { type: 'question', payload: toPublicQuestion(currentQuestion) });
      if (currentQuestion && currentQuestion.revealed) {
        sendJson(ws, {
          type: 'reveal',
          payload: {
            questionId: currentQuestion.id,
            correctIndex: currentQuestion.correctIndex,
            correctAnswer: currentQuestion.answers[currentQuestion.correctIndex] || '',
            leaderboard: leaderboardRows()
          }
        });
      }
      if (gameEnded) {
        const leaderboard = leaderboardRows();
        sendJson(ws, {
          type: 'final_results',
          payload: {
            leaderboard,
            winner: leaderboard.length ? leaderboard[0] : null,
            totalPlayers: players.size,
            questionsPlayed: questionSeq,
            finishedAt: Date.now()
          }
        });
      }
      return;
    }

    if (role === 'player') {
      const playerId = 'p-' + Math.random().toString(36).slice(2, 10);
      const player = { id: playerId, name: safeName, score: 0, ws };
      players.set(playerId, player);
      sockets.set(ws, { role: 'player', playerId, name: safeName });
      sendJson(ws, { type: 'welcome', role: 'player', playerId, name: safeName });
      sendJson(ws, presencePayload());
      if (currentQuestion) sendJson(ws, { type: 'question', payload: toPublicQuestion(currentQuestion) });
      if (currentQuestion && currentQuestion.revealed) {
        sendJson(ws, {
          type: 'reveal',
          payload: {
            questionId: currentQuestion.id,
            correctIndex: currentQuestion.correctIndex,
            correctAnswer: currentQuestion.answers[currentQuestion.correctIndex] || '',
            leaderboard: leaderboardRows()
          }
        });
      }
      broadcast(presencePayload());
      broadcast(answersPayload(), m => m.role === 'host');
      return;
    }

    if (role === 'note-host') {
      sockets.set(ws, { role: 'note-host', name: safeName || 'Teacher' });
      sendJson(ws, { type: 'welcome', role: 'note-host' });
      return;
    }

    if (role === 'note-student') {
      const noteId = sanitizeNoteId(msg && msg.noteId);
      const room = noteHosts.get(noteId);
      if (!noteId || !room || !room.ws || room.ws.readyState !== 1) {
        sendJson(ws, { type: 'error', message: 'This note room is unavailable. Ask your teacher to reopen it.' });
        return;
      }

      const studentName = (safeName || 'Student').slice(0, 24);
      const classGroup = normalizeClassGroup(msg && msg.classGroup);
      if (room.classGroup && classGroup && room.classGroup !== classGroup) {
        sendJson(ws, { type: 'error', message: 'Wrong class selected for this note room.' });
        return;
      }

      sockets.set(ws, {
        role: 'note-student',
        noteId,
        classGroup: classGroup || room.classGroup || '',
        name: studentName
      });

      sendJson(ws, {
        type: 'welcome',
        role: 'note-student',
        noteId,
        classGroup: classGroup || room.classGroup || '',
        title: room.title || ''
      });
      return;
    }

    sendJson(ws, { type: 'error', message: 'Role must be host, player, note-host, or note-student.' });
    return;
  }

  if (!meta) {
    sendJson(ws, { type: 'error', message: 'Send hello first.' });
    return;
  }

  if (type === 'host_next_question' && meta.role === 'host') {
    handleHostNextQuestion(ws, msg.payload || {});
  } else if (type === 'host_reveal' && meta.role === 'host') {
    handleHostReveal(ws);
  } else if (type === 'host_end_game' && meta.role === 'host') {
    handleHostEndGame(ws);
  } else if (type === 'player_answer' && meta.role === 'player') {
    handlePlayerAnswer(ws, meta, msg.payload || {});
  } else if (type === 'note_host_open' && meta.role === 'note-host') {
    handleNoteHostOpen(ws, msg.payload || {});
  } else if (type === 'note_submit' && meta.role === 'note-student') {
    handleNoteStudentSubmit(ws, meta, msg.payload || {});
  } else if (type === 'ping') {
    sendJson(ws, { type: 'pong' });
  }
}

function onSocketClose(ws) {
  const meta = sockets.get(ws);
  sockets.delete(ws);
  if (!meta) return;

  if (meta.role === 'host') {
    if (hostWs === ws) hostWs = null;
    broadcast({ type: 'status', payload: { hostOnline: false, message: 'Host disconnected. Waiting for host.' } });
    return;
  }

  if (meta.role === 'player' && meta.playerId) {
    players.delete(meta.playerId);
    if (currentQuestion && currentQuestion.responses) {
      currentQuestion.responses.delete(meta.playerId);
    }
    broadcast(presencePayload());
    broadcast(answersPayload(), m => m.role === 'host');
    return;
  }

  if (meta.role === 'note-host') {
    const closedRooms = [];
    for (const [noteId, room] of noteHosts.entries()) {
      if (room && room.ws === ws) {
        noteHosts.delete(noteId);
        closedRooms.push(noteId);
      }
    }
    if (closedRooms.length) {
      const closedSet = new Set(closedRooms);
      broadcast(
        {
          type: 'status',
          payload: { hostOnline: false, message: 'Teacher note room went offline.' }
        },
        m => m.role === 'note-student' && closedSet.has(m.noteId)
      );
    }
    return;
  }

  if (meta.role === 'note-student') {
    return;
  }
}

const server = http.createServer(async (req, res) => {
  const incomingPath = safeDecode((new URL(req.url || '/', 'http://localhost')).pathname || '/');
  const normalized = incomingPath === '/' ? '/learning-tools.html' : incomingPath;
  const resolved = path.normalize(path.join(ROOT, normalized));

  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fsp.stat(resolved);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    fs.createReadStream(resolved).pipe(res);
  } catch (_) {
    res.writeHead(404);
    res.end('Not found');
  }
});

function attachWsServer(wss) {
  wss.on('connection', (ws) => {
    ws.on('message', (raw) => onSocketMessage(ws, raw));
    ws.on('close', () => onSocketClose(ws));
    ws.on('error', () => onSocketClose(ws));
  });
}

const quizWss = new WebSocketServer({ noServer: true });
const noteWss = new WebSocketServer({ noServer: true });
attachWsServer(quizWss);
attachWsServer(noteWss);

server.on('upgrade', (req, socket, head) => {
  let pathname = '';
  try {
    pathname = new URL(req.url || '/', 'http://localhost').pathname;
  } catch (_) {
    pathname = '';
  }

  const target = pathname === '/quiz-ws'
    ? quizWss
    : pathname === '/note-ws'
      ? noteWss
      : null;

  if (!target) {
    try {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    } catch (_) {}
    try { socket.destroy(); } catch (_) {}
    return;
  }

  target.handleUpgrade(req, socket, head, (ws) => {
    target.emit('connection', ws, req);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Quiz multiplayer server running:');
  console.log('  Local:   http://localhost:' + PORT + '/learning-tools.html');
  console.log('  Player:  http://localhost:' + PORT + '/quiz-player.html');
  console.log('  Notes:   http://localhost:' + PORT + '/student-note-player.html');
  console.log('  WS path: ws://localhost:' + PORT + '/quiz-ws');
  console.log('  WS path: ws://localhost:' + PORT + '/note-ws');
});
