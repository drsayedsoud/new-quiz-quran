/**
 * Safe Database Operations
 * Server-side validated functions with proper error handling
 */
import { db, ref, set, update, get, child, runTransaction } from './firebase-init.js';

// ============= PLAYER PROFILE =============

export async function updatePlayerProfile(uid, { name, avatar }) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!name || name.length > 40) throw new Error('Invalid name');
  if (!avatar || !avatar.startsWith('assets/') || avatar.length > 64) throw new Error('Invalid avatar');

  return update(ref(db, `players/${uid}`), {
    name: name.trim(),
    avatar: avatar,
    updatedAt: Date.now()
  });
}

export async function updatePlayerGlobalBoard(uid, { name, place, photoUrl }) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!name || name.length > 30) throw new Error('Invalid name');
  if (place && place.length > 40) throw new Error('Place too long');
  if (photoUrl) {
    if (!photoUrl.startsWith('https://') && !photoUrl.startsWith('http://')) {
      throw new Error('Photo must be HTTPS URL');
    }
    if (photoUrl.length > 256) throw new Error('Photo URL too long');
  }

  const updates = {
    name: name.trim(),
    updatedAt: Date.now()
  };
  if (place) updates.place = place.trim();
  if (photoUrl) updates.photoUrl = photoUrl;

  return update(ref(db, `players/${uid}`), updates);
}

export async function getPlayerProfile(uid) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  const snapshot = await get(child(ref(db), `players/${uid}`));
  return snapshot.val();
}

// ============= ROOM OPERATIONS =============

export async function createRoom(hostId, { category, mode, val, qTime, maxPlayers, showLive, sync, teams, roomName, pick }) {
  if (!hostId || hostId.length > 64) throw new Error('Invalid host ID');
  if (!category || category.length > 64) throw new Error('Invalid category');

  // Validate settings
  const settings = {
    category: category.trim(),
    mode: (mode === 'time' ? 'time' : 'questions'),
    val: Math.max(1, Math.min(500, parseInt(val) || 10)),
    qTime: Math.max(5, Math.min(180, parseInt(qTime) || 30)),
    maxPlayers: Math.max(2, Math.min(50, parseInt(maxPlayers) || 10)),
    showLive: showLive !== false,
    sync: sync === true,
    teams: teams === true,
    roomName: String(roomName || '').trim().slice(0, 24),
    pick: String(pick || '').trim().slice(0, 800)
  };

  // Generate unique code
  let code;
  let attempts = 0;
  while (attempts < 5) {
    code = Math.floor(10000 + Math.random() * 90000).toString();
    const existing = await get(child(ref(db), `rooms/${code}`));
    if (!existing.exists()) break;
    attempts++;
  }
  if (attempts >= 5) throw new Error('Could not generate unique room code');

  const room = {
    code: code,
    hostId: hostId,
    status: 'waiting',
    createdAt: Date.now(),
    round: 1,
    currentQuestionIndex: 0,
    phase: 'question',
    settings: settings,
    players: {}
  };

  await set(ref(db, `rooms/${code}`), room);
  return room;
}

export async function getRoom(code) {
  if (!code || !/^\d{5}$/.test(code)) throw new Error('Invalid room code');
  const snapshot = await get(child(ref(db), `rooms/${code}`));
  return snapshot.val();
}

export async function updateRoomStatus(hostId, code, status) {
  if (!hostId || hostId.length > 64) throw new Error('Invalid host ID');
  if (!code || !/^\d{5}$/.test(code)) throw new Error('Invalid room code');
  if (!['waiting', 'playing', 'finished', 'closed'].includes(status)) throw new Error('Invalid status');

  // Verify host is the owner
  const room = await getRoom(code);
  if (!room || room.hostId !== hostId) {
    throw new Error('Not room host');
  }

  return update(ref(db, `rooms/${code}`), {
    status: status,
    updatedAt: Date.now()
  });
}

// ============= PLAYER IN ROOM =============

export async function joinRoom(uid, code, { name, avatar, team }) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!code || !/^\d{5}$/.test(code)) throw new Error('Invalid room code');
  if (!name || name.length > 40) throw new Error('Invalid name');
  if (!avatar || !avatar.startsWith('assets/') || avatar.length > 64) throw new Error('Invalid avatar');
  if (team && !['red', 'blue'].includes(team)) throw new Error('Invalid team');

  const playerData = {
    name: name.trim(),
    avatar: avatar,
    score: 0,
    answered: 0,
    hasFinished: false,
    joinedAt: Date.now()
  };
  if (team) playerData.team = team;

  return set(ref(db, `rooms/${code}/players/${uid}`), playerData);
}

export async function submitAnswer(uid, code, questionIndex, { answer, isCorrect, timeMs }) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!code || !/^\d{5}$/.test(code)) throw new Error('Invalid room code');
  if (questionIndex < 0 || questionIndex > 1000) throw new Error('Invalid question index');
  if (!answer || answer.length > 300) throw new Error('Invalid answer');
  if (typeof isCorrect !== 'boolean') throw new Error('Invalid correctness');
  if (timeMs < 0 || timeMs > 300000) throw new Error('Invalid time'); // max 5 min

  const answerData = {
    c: answer.trim(),
    ok: isCorrect,
    t: timeMs
  };

  return set(ref(db, `rooms/${code}/players/${uid}/answers/${questionIndex}`), answerData);
}

export async function updatePlayerInRoom(uid, code, updates) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!code || !/^\d{5}$/.test(code)) throw new Error('Invalid room code');

  const allowed = ['score', 'answered', 'hasFinished', 'team'];
  const safe = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.includes(key)) throw new Error(`Cannot update ${key}`);
    safe[key] = value;
  }

  return update(ref(db, `rooms/${code}/players/${uid}`), safe);
}

// ============= LEADERBOARD =============

export async function submitWeeklyScore(uid, week, { name, score, total }) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!/^\d{4}-W\d{2}$/.test(week)) throw new Error('Invalid week format (YYYY-Wnn)');
  if (!name || name.length > 30) throw new Error('Invalid name');
  if (score < 0 || score > 100) throw new Error('Score must be 0-100');
  if (total < 1 || total > 100) throw new Error('Total must be 1-100');

  // Use Cloud Function for safe submission (prevents score decrease)
  // This is just the client-side validation
  return { week, uid, name, score, total };
}

// ============= STATS =============

export async function recordGameStats(uid, { category, correct, answered, questionType }) {
  if (!uid || uid.length > 64) throw new Error('Invalid UID');
  if (!category || category.length > 64) throw new Error('Invalid category');
  if (correct < 0 || correct > answered || answered > 100) throw new Error('Invalid counts');

  // This should be called through Cloud Function
  return { uid, category, correct, answered, questionType };
}

// ============= QUERIES =============

export async function getLeaderboardWeek(week) {
  if (!/^\d{4}-W\d{2}$/.test(week)) throw new Error('Invalid week format');
  const snapshot = await get(child(ref(db), `leaderboard/${week}`));
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.keys(data)
    .map(uid => ({ uid, ...data[uid] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100); // Top 100
}

export async function getGlobalBoard() {
  const snapshot = await get(child(ref(db), 'players'));
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.keys(data)
    .map(uid => ({ uid, ...data[uid] }))
    .filter(p => p.points > 0) // Only players with points
    .sort((a, b) => b.points - a.points)
    .slice(0, 100); // Top 100
}

export async function getQuestionStats(hash) {
  if (!hash || !/^[a-z0-9]{1,16}$/.test(hash)) throw new Error('Invalid hash');
  const snapshot = await get(child(ref(db), `stats/questions/${hash}`));
  return snapshot.val();
}

export async function getDailyStats(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date format (YYYY-MM-DD)');
  const snapshot = await get(child(ref(db), `stats/daily/${date}`));
  return snapshot.val();
}
