const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

// ============= STATS FUNCTIONS =============

/**
 * تسجيل جلسة لعبة وتحديث الإحصائيات اليومية
 * Called from client after finishing a game
 */
exports.recordGameSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const uid = context.auth.uid;
  const { category, correct, answered, questionType } = data;

  if (!category || typeof correct !== 'number' || typeof answered !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  if (correct < 0 || correct > answered || answered > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid counts');
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Update daily stats
    const statsRef = db.ref(`stats/daily/${today}`);
    await statsRef.transaction((current) => {
      if (!current) current = { sessions: 0, correct: 0, answered: 0, byType: {} };
      current.sessions = (current.sessions || 0) + 1;
      current.correct = (current.correct || 0) + correct;
      current.answered = (current.answered || 0) + answered;
      if (questionType) {
        current.byType = current.byType || {};
        current.byType[questionType] = (current.byType[questionType] || 0) + answered;
      }
      return current;
    });

    // Update player's best score and games count
    const playerRef = db.ref(`players/${uid}`);
    await playerRef.transaction((current) => {
      if (!current) return null;
      current.games = (current.games || 0) + 1;
      const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
      current.best = Math.max(current.best || 0, percentage);
      current.updatedAt = Date.now();
      return current;
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording session:', error);
    throw new functions.https.HttpsError('internal', 'Failed to record session');
  }
});

/**
 * تحديث درجات لوحة الشرف الأسبوعية
 * Called from client when player finishes a weekly game
 */
exports.updateLeaderboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const uid = context.auth.uid;
  const { week, score, total, name } = data;

  if (!week || typeof score !== 'number' || typeof total !== 'number' || !name) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  if (!/^\d{4}-W\d{2}$/.test(week)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid week format (YYYY-Wnn)');
  }
  if (score < 0 || score > 100 || total < 1 || total > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid score/total');
  }
  if (name.length > 30) {
    throw new functions.https.HttpsError('invalid-argument', 'Name too long');
  }

  try {
    const leaderboardRef = db.ref(`leaderboard/${week}/${uid}`);
    await leaderboardRef.transaction((current) => {
      // Only allow score to increase
      if (current && current.score >= score) {
        return; // abort transaction
      }
      return {
        name: name,
        score: score,
        total: total,
        at: Date.now()
      };
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update leaderboard');
  }
});

/**
 * تسجيل سؤال صعب (خطأ متكرر)
 * Called from client to track problematic questions
 */
exports.recordQuestionWrong = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const { questionHash, questionText, questionType } = data;

  if (!questionHash || questionHash.length > 16 || !/^[a-z0-9]{1,16}$/.test(questionHash)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid question hash');
  }
  if (!questionText || questionText.length > 300) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid question text');
  }

  try {
    const questionRef = db.ref(`stats/questions/${questionHash}`);
    await questionRef.transaction((current) => {
      if (!current) {
        current = {
          text: questionText,
          type: questionType || 'unknown',
          wrong: 1
        };
      } else {
        current.wrong = (current.wrong || 0) + 1;
        // Update text and type if provided and changed
        if (questionText) current.text = questionText;
        if (questionType) current.type = questionType;
      }
      return current;
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording wrong question:', error);
    throw new functions.https.HttpsError('internal', 'Failed to record question');
  }
});

/**
 * إضافة لاعب إلى لوحة الشرف العالمية (Global Honour Board)
 * Validates player data before publishing
 */
exports.publishToGlobalBoard = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const uid = context.auth.uid;
  const { name, place, photoUrl } = data;

  if (!name || name.length > 30) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid name');
  }
  if (place && place.length > 40) {
    throw new functions.https.HttpsError('invalid-argument', 'Place too long');
  }
  if (photoUrl && (!photoUrl.startsWith('https://') && !photoUrl.startsWith('http://')) || photoUrl.length > 256) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid photo URL');
  }

  try {
    // Fetch player's current points
    const playerSnapshot = await db.ref(`players/${uid}`).get();
    if (!playerSnapshot.exists()) {
      throw new functions.https.HttpsError('not-found', 'Player profile not found');
    }

    const playerData = playerSnapshot.val();
    const updates = {
      'players/' + uid + '/name': name,
      'players/' + uid + '/place': place || '',
      'players/' + uid + '/updatedAt': Date.now()
    };

    if (photoUrl) {
      updates['players/' + uid + '/photoUrl'] = photoUrl;
    }

    await db.ref().update(updates);
    return { success: true, points: playerData.points };
  } catch (error) {
    console.error('Error publishing to global board:', error);
    throw new functions.https.HttpsError('internal', 'Failed to publish');
  }
});

/**
 * Cleanup expired rooms (runs daily)
 */
exports.cleanupExpiredRooms = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
  const ROOM_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();

  try {
    const roomsSnapshot = await db.ref('rooms').get();
    if (!roomsSnapshot.exists()) return;

    const rooms = roomsSnapshot.val();
    const deletions = [];

    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (!room.createdAt || (now - room.createdAt) > ROOM_EXPIRY_MS) {
        deletions.push(db.ref(`rooms/${code}`).remove());
      }
    }

    await Promise.all(deletions);
    console.log(`Cleaned up ${deletions.length} expired rooms`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});
