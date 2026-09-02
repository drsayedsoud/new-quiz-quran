// Multiplayer entry flow on index.html: create a room or join one by code
import { db, ref, set, get, child, remove } from './firebase-init.js';
import { getLocalUserId, saveRoomToLocal, clearMpState, isRoomExpired, fetchRoom } from './mp-common.js';

function generateRoomCode() { return Math.floor(10000 + Math.random() * 90000).toString(); }

// Best-effort housekeeping: drop rooms nobody can use anymore (older than the expiry window)
async function cleanupExpiredRooms() {
    try {
        const snapshot = await get(ref(db, 'rooms'));
        if (!snapshot.exists()) return;
        const rooms = snapshot.val();
        const deletions = Object.keys(rooms)
            .filter(code => !rooms[code] || !rooms[code].createdAt || isRoomExpired(rooms[code]))
            .map(code => remove(ref(db, 'rooms/' + code)).catch(() => {}));
        await Promise.all(deletions);
    } catch (e) { /* housekeeping must never block room creation */ }
}

async function generateUniqueRoomCode() {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateRoomCode();
        const snapshot = await get(child(ref(db), 'rooms/' + code));
        if (!snapshot.exists() || isRoomExpired(snapshot.val())) return code;
    }
    throw new Error('تعذر توليد كود غرفة فريد');
}

function setBusy(buttonId, busy, busyText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    if (busy) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = busyText || '⏳ جاري التنفيذ...';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
        btn.disabled = false;
    }
}

// ---------- Create ----------
window.createMultiplayerRoomWithParams = async function(category, mode, val, extra) {
    if (!category) { alert('يرجى اختيار قسم أولاً'); return; }
    mode = mode === 'time' ? 'time' : 'questions';
    val = parseInt(val) || (mode === 'time' ? 3 : 10);
    extra = extra || {};
    const settingsExtra = {
        qTime: Math.min(180, Math.max(5, parseInt(extra.qTime) || 30)),
        maxPlayers: Math.min(50, Math.max(2, parseInt(extra.maxPlayers) || 10)),
        showLive: extra.showLive !== false,
        roomName: String(extra.roomName || '').trim().slice(0, 24)
    };

    setBusy('mp-create-btn', true, '⏳ جاري إنشاء الغرفة...');
    cleanupExpiredRooms();
    try {
        const roomCode = await generateUniqueRoomCode();
        const hostId = getLocalUserId();
        const room = {
            code: roomCode,
            hostId: hostId,
            status: 'waiting',
            createdAt: Date.now(),
            round: 1,
            settings: Object.assign({ category: category, mode: mode, val: val }, settingsExtra),
            players: {}
        };
        await set(ref(db, 'rooms/' + roomCode), room);
        saveRoomToLocal(roomCode, room);
        window.location.href = 'lobby.html?room=' + roomCode;
    } catch (e) {
        console.error('Error creating room: ', e);
        alert('حدث خطأ أثناء إنشاء الغرفة. تأكد من اتصالك بالإنترنت.');
        setBusy('mp-create-btn', false);
    }
};

// ---------- Join ----------
window.joinMultiplayerRoom = async function() {
    const input = document.getElementById('join-room-code');
    const code = (input ? input.value : '').replace(/\D/g, '').trim();
    if (code.length !== 5) { alert('الرجاء إدخال كود صحيح مكون من 5 أرقام'); return; }

    setBusy('mp-join-btn', true, '⏳ جاري البحث...');
    try {
        const room = await fetchRoom(code);
        if (!room || isRoomExpired(room)) {
            alert('الغرفة غير موجودة أو انتهت صلاحيتها. تأكد من الكود.');
            return;
        }
        const myId = getLocalUserId();
        const alreadyIn = room.players && room.players[myId];

        if (room.status === 'closed') {
            alert('قام المضيف بإغلاق هذه الغرفة.');
            return;
        }
        if (room.status !== 'waiting' && !alreadyIn) {
            alert('عذراً، اللعبة بدأت بالفعل في هذه الغرفة!');
            return;
        }
        saveRoomToLocal(code, room);
        // A player who already joined and got disconnected mid-game goes straight back to the game
        if (room.status === 'playing' && alreadyIn) {
            window.location.href = 'quiz.html';
            return;
        }
        window.location.href = 'lobby.html?room=' + code;
    } catch (e) {
        console.error(e);
        alert('خطأ في الاتصال بقاعدة البيانات.');
    } finally {
        setBusy('mp-join-btn', false);
    }
};

// ---------- Solo helpers (kept here so index.html keeps working) ----------
window.openSoloMixModal = function() { document.getElementById('solo-mix-modal').style.display = 'flex'; };
window.closeSoloMixModal = function() { document.getElementById('solo-mix-modal').style.display = 'none'; };
window.clearMultiplayerState = clearMpState;
