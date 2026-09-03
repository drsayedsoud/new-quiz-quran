// Shared helpers for the multiplayer flow (index -> lobby -> quiz -> finish)
import { db, ref, get, child } from './firebase-init.js';

export const AVATARS = [
    'assets/hulkman.png',
    'assets/superman.png',
    'assets/patman.png',
    'assets/child.jpeg',
    'assets/mahmoud.png'
];

export const ROOM_MAX_AGE_MS = 6 * 60 * 60 * 1000; // rooms older than 6 hours are considered expired
export const APP_URL = (typeof location !== 'undefined' && /^https?:/.test(location.origin)) ? location.origin : 'https://new-quiz-quran.vercel.app';

const CATEGORY_LABELS = {
    mixed: 'القرآن الكريم كاملاً',
    seerah: 'السيرة النبوية',
    fiqh: 'الفقه الإسلامي',
    general: 'معلومات قرآنية',
    meanings: 'معاني الكلمات',
    kids_1: 'الأطفال - مستوى 1',
    kids_2: 'الأطفال - مستوى 2',
    kids_3: 'الأطفال - مستوى 3',
    kids_piggy: 'الأطفال - زوّد رصيد حصالتك',
    complete: 'أكمل الآية'
};

const CATEGORY_ICONS = {
    mixed: '📖', seerah: '🕌', fiqh: '⚖️', general: '💡', meanings: '🔤', kids_1: '🎈', kids_2: '🚀', kids_3: '🏅', kids_piggy: '🐷', complete: '🧩'
};

export function categoryLabel(category) {
    if (!category) return 'غير محدد';
    if (category.includes('_juz_')) {
        const juz = category.split('_juz_')[1];
        return (category.startsWith('complete') ? 'أكمل الآية - الجزء ' : 'القرآن الكريم - الجزء ') + juz;
    }
    return CATEGORY_LABELS[category] || category;
}

export function categoryIcon(category) {
    if (!category) return '❓';
    const base = category.split('_juz_')[0];
    return CATEGORY_ICONS[base] || '❓';
}

export function modeLabel(mode, val) {
    if (mode === 'time') {
        const minutes = parseInt(val) || 3;
        if (minutes === 1) return 'دقيقة واحدة';
        if (minutes === 2) return 'دقيقتان';
        return minutes + ' دقائق';
    }
    const count = parseInt(val) || 10;
    return count + ' ' + (count > 10 ? 'سؤال' : 'أسئلة');
}

export function modeDescription(mode, val) {
    if (mode === 'time') return 'من يجيب أكثر خلال ' + modeLabel(mode, val) + ' يفوز';
    return 'نفس ' + modeLabel(mode, val) + ' للجميع، والأعلى نقاطاً يفوز';
}

// Stable per-device player id (kept across games so a player can rejoin)
export function getLocalUserId() {
    let id = localStorage.getItem('mp_userId');
    if (!id) {
        id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('mp_userId', id);
    }
    return id;
}

// Stable short id for a question text (same function in script.js) so a teacher's picked list survives any shuffling
export function questionHash(text) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36).slice(0, 10);
}

export function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Everything the quiz engine (script.js) reads from localStorage for a multiplayer game
export function saveRoomToLocal(roomCode, room) {
    const settings = room.settings || {};
    localStorage.setItem('mp_roomCode', roomCode);
    localStorage.setItem('mp_isHost', room.hostId === getLocalUserId() ? 'true' : 'false');
    localStorage.setItem('mp_mode', settings.mode || 'questions');
    localStorage.setItem('mp_val', String(settings.val || 10));
    localStorage.setItem('mp_round', String(room.round || 1));
    localStorage.setItem('mp_qtime', String(parseInt(settings.qTime) || 30));
    localStorage.setItem('mp_showlive', settings.showLive === false ? 'false' : 'true');
    localStorage.setItem('mp_sync', settings.sync === true ? 'true' : 'false');
    localStorage.setItem('mp_teams', settings.teams === true ? 'true' : 'false');
    if (settings.pick) localStorage.setItem('mp_pick', settings.pick); else localStorage.removeItem('mp_pick');
    localStorage.setItem('quizType', settings.category || 'mixed');
    localStorage.setItem('quizTitle', '🔴 تحدي مباشر: ' + categoryLabel(settings.category));
    // Stale solo filters must not leak into the shared game
    localStorage.removeItem('selectedJuz');
    localStorage.removeItem('selectedSura');
}

export function clearMpState() {
    ['mp_roomCode', 'mp_isHost', 'mp_mode', 'mp_val', 'mp_round', 'mp_sync', 'mp_teams', 'mp_pick'].forEach(k => localStorage.removeItem(k));
}

export function isRoomExpired(room) {
    if (!room || !room.createdAt) return false;
    return Date.now() - room.createdAt > ROOM_MAX_AGE_MS;
}

export async function fetchRoom(roomCode) {
    const snapshot = await get(child(ref(db), 'rooms/' + roomCode));
    return snapshot.exists() ? snapshot.val() : null;
}

export function lobbyUrl(roomCode) {
    return APP_URL + '/lobby.html?room=' + roomCode;
}

export function whatsappInviteUrl(roomCode) {
    const message = `مرحباً! أتحداك في مسابقة القرآن الكريم 🏆\nكود الغرفة: *${roomCode}*\nاضغط الرابط للانضمام مباشرة:\n${lobbyUrl(roomCode)}`;
    return 'https://wa.me/?text=' + encodeURIComponent(message);
}
