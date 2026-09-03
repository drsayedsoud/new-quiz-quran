// Global honour board: every player can publish a card (name, place, photo) and appear in the top 100.
import { db, ref, get, set, query, orderByChild, limitToLast } from './firebase-init.js';
import { getLocalUserId, escapeHtml } from './mp-common.js';

const KEY = 'gbCard';
export const myCard = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };

export async function publishCard(card) {
    const stats = window.Progress ? Progress.stats() : { correct: 0, games: 0, best: 0 };
    const payload = {
        name: String(card.name || '').trim().slice(0, 30),
        place: String(card.place || '').trim().slice(0, 40),
        points: Math.max(0, Math.min(1000000, stats.correct || 0)),
        games: Math.max(0, Math.min(100000, stats.games || 0)),
        best: Math.max(0, Math.min(100, stats.best || 0)),
        updatedAt: Date.now()
    };
    if (card.photo) payload.photo = String(card.photo).slice(0, 60000);
    else if (card.avatar) payload.avatar = String(card.avatar).slice(0, 64);
    if (!payload.name) throw new Error('الاسم مطلوب');
    await set(ref(db, 'players/' + getLocalUserId()), payload);
    localStorage.setItem(KEY, JSON.stringify({ name: payload.name, place: payload.place, photo: payload.photo || '', avatar: payload.avatar || '' }));
    return payload;
}

// Called after a finished quiz so the published card keeps up with the player's progress
export async function syncPoints() {
    const card = myCard();
    if (!card || !card.name) return;
    try { await publishCard(card); } catch (e) { /* offline */ }
}

export async function loadTop(limit = 100) {
    const snap = await get(query(ref(db, 'players'), orderByChild('points'), limitToLast(limit)));
    const rows = [];
    snap.forEach(c => rows.push(Object.assign({ id: c.key }, c.val())));
    rows.sort((a, b) => (b.points - a.points) || (a.updatedAt - b.updatedAt));
    return rows;
}

export function rowHtml(r, i, meId) {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
    const img = r.photo || r.avatar || 'assets/hulkman.png';
    return `<div class="gb-row${r.id === meId ? ' me' : ''}">
        <span class="gb-rank">${medal}</span>
        <img class="gb-img" src="${escapeHtml(img)}" alt="" loading="lazy">
        <span class="gb-name">${escapeHtml(r.name)}${r.place ? '<small>' + escapeHtml(r.place) + '</small>' : ''}</span>
        <span class="gb-points">${r.points}<small>نقطة</small></span>
    </div>`;
}

export { getLocalUserId };
