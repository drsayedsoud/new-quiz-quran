// Results page, online part: anonymous usage stats for the admin panel + weekly honour board for the daily challenge
import { db, ref, get, update, increment, query, orderByChild, limitToLast } from './firebase-init.js';
import { getLocalUserId, escapeHtml } from './mp-common.js';
import { syncPoints } from './global-board.js';

// Keep the global honour board card up to date after every finished quiz
syncPoints();

const sessions = (() => { try { return JSON.parse(localStorage.getItem('userSessions') || '[]'); } catch (e) { return []; } })();
const session = sessions[sessions.length - 1];
const $ = id => document.getElementById(id);

function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36).slice(0, 12);
}
export function weekKey(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

// ---- 1. usage stats (once per saved session) ----
(async function reportStats() {
    if (!session || !session.total) return;
    const stamp = session.date + '|' + session.type + '|' + session.score;
    if (localStorage.getItem('statsSent') === stamp) return;
    localStorage.setItem('statsSent', stamp);
    const day = new Date().toISOString().slice(0, 10);
    const type = String(session.type || 'unknown').replace(/[.#$\[\]\/]/g, '_').slice(0, 40);
    const updates = {};
    updates[`stats/daily/${day}/sessions`] = increment(1);
    updates[`stats/daily/${day}/correct`] = increment(session.score || 0);
    updates[`stats/daily/${day}/answered`] = increment(session.total || 0);
    updates[`stats/daily/${day}/byType/${type}`] = increment(1);
    (Array.isArray(session.wrong) ? session.wrong.slice(0, 60) : []).forEach(w => {
        const text = String(w.question || '').slice(0, 300);
        if (!text) return;
        const h = hash(text);
        updates[`stats/questions/${h}/text`] = text;
        updates[`stats/questions/${h}/type`] = type;
        updates[`stats/questions/${h}/wrong`] = increment(1);
    });
    try { await update(ref(db), updates); } catch (e) { console.warn('stats not sent', e.message); }
})();

// ---- 2. weekly honour board (daily challenge only) ----
async function renderBoard(week, targetId, myId) {
    const el = $(targetId);
    if (!el) return;
    try {
        const snap = await get(query(ref(db, 'leaderboard/' + week), orderByChild('score'), limitToLast(20)));
        const rows = [];
        snap.forEach(c => { rows.push(Object.assign({ id: c.key }, c.val())); });
        rows.sort((a, b) => (b.score - a.score) || (a.at - b.at));
        if (!rows.length) { el.innerHTML = '<div class="empty">كن أول من يسجّل هذا الأسبوع!</div>'; return; }
        el.innerHTML = rows.slice(0, 20).map((r, i) => `
            <div class="lb-row${r.id === myId ? ' me' : ''}">
                <span class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</span>
                <span class="lb-name">${escapeHtml(r.name)}${r.id === myId ? ' <small>(أنت)</small>' : ''}</span>
                <span class="lb-score">${r.score}/${r.total}</span>
            </div>`).join('');
    } catch (e) { el.innerHTML = '<div class="empty">تعذر تحميل لوحة الشرف</div>'; }
}

export async function submitDaily(name) {
    if (!session || session.type !== 'daily' || !session.total) return false;
    const uid = getLocalUserId();
    const week = weekKey(new Date());
    const best = sessions.filter(s => s.type === 'daily' && s.total > 0 && weekKey(new Date(s.at || Date.now())) === week)
        .reduce((a, s) => Math.max(a, s.score), session.score);
    try {
        await update(ref(db, `leaderboard/${week}/${uid}`), { name: name.slice(0, 30), score: best, total: session.total, at: Date.now() });
        localStorage.setItem('mp_playerName', name.slice(0, 30));
        return true;
    } catch (e) { console.warn('leaderboard', e.message); return false; }
}

if (session && session.type === 'daily' && $('board-card')) {
    const card = $('board-card');
    card.style.display = 'block';
    const myId = getLocalUserId();
    const week = weekKey(new Date());
    const known = localStorage.getItem('mp_playerName');
    const form = $('board-form');
    const done = async (name) => {
        if (!name) return;
        $('board-status').textContent = '⏳ جاري التسجيل...';
        const ok = await submitDaily(name);
        $('board-status').textContent = ok ? '✅ تم تسجيل نتيجتك في لوحة الشرف' : 'تعذر التسجيل، حاول لاحقاً';
        form.style.display = 'none';
        renderBoard(week, 'board-list', myId);
    };
    if (known) done(known);
    else {
        form.style.display = 'flex';
        $('board-submit').onclick = () => done($('board-name').value.trim());
        renderBoard(week, 'board-list', myId);
    }
}
