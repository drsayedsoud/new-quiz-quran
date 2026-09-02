// Multiplayer results: live leaderboard while others finish, podium when everyone is done, rematch loop
import { db, ref, get, update, onValue } from './firebase-init.js';
import { getLocalUserId, clearMpState, escapeHtml, AVATARS, categoryLabel, modeLabel } from './mp-common.js';

const roomCode = localStorage.getItem('mp_roomCode');
const myId = getLocalUserId();
const myRound = parseInt(localStorage.getItem('mp_round')) || 1;

if (roomCode) {
    const $ = id => document.getElementById(id);
    let room = null;
    let leaving = false;
    let allFinished = false;

    // Solo-only bits are noise here
    const topButtons = document.querySelector('.top-buttons');
    if (topButtons) topButtons.style.display = 'none';
    const emailLine = $('email-line');
    if (emailLine) emailLine.style.display = 'none';
    $('mp-results').style.display = 'block';

    update(ref(db, `rooms/${roomCode}/players/${myId}`), { hasFinished: true }).catch(e => console.error(e));

    function podiumSlot(p, place) {
        const cfg = {
            1: { emoji: '👑', color: 'linear-gradient(to top, #d35400, #f1c40f)', h: 140, w: 35, img: 80, border: 'gold' },
            2: { emoji: '🥈', color: 'linear-gradient(to top, #7f8c8d, #bdc3c7)', h: 100, w: 30, img: 60, border: 'silver' },
            3: { emoji: '🥉', color: 'linear-gradient(to top, #8e44ad, #cd7f32)', h: 80, w: 30, img: 50, border: '#cd7f32' }
        }[place];
        if (!p) return `<div style="width: ${cfg.w}%;"></div>`;
        return `
            <div style="display: flex; flex-direction: column; width: ${cfg.w}%;">
                <img src="${escapeHtml(p.avatar || AVATARS[0])}" style="width: ${cfg.img}px; height: ${cfg.img}px; border-radius: 50%; border: 4px solid ${cfg.border}; margin: 0 auto -${cfg.img / 4}px auto; position: relative; z-index: 10; background: #fff; object-fit: cover;">
                <div style="background: ${cfg.color}; height: ${cfg.h}px; border-radius: 10px 10px 0 0; text-align: center; padding-top: ${cfg.img / 4 + 8}px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <div style="font-size: ${place === 1 ? 2.2 : 1.6}em; line-height: 1;">${cfg.emoji}</div>
                    <div style="color: white; font-weight: bold; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px;">${escapeHtml(p.name)}</div>
                    <div style="color: #1a1a2e; font-weight: 900;">${p.score || 0}</div>
                </div>
            </div>`;
    }

    function renderPlayers(players) {
        const entries = Object.entries(players || {});
        const sorted = entries.sort((a, b) => (b[1].score || 0) - (a[1].score || 0) || (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
        const finishedCount = sorted.filter(([, p]) => p.hasFinished).length;
        allFinished = sorted.length > 0 && finishedCount === sorted.length;

        const status = $('mp-status');
        if (allFinished) {
            const winner = sorted[0][1];
            const tie = sorted.length > 1 && (sorted[1][1].score || 0) === (winner.score || 0);
            status.innerHTML = tie
                ? '🤝 تعادل في الصدارة! نتيجة مشرفة للجميع'
                : (sorted[0][0] === myId ? '🎉 مبروك! أنت الفائز بهذا التحدي' : `🏆 الفائز: <b>${escapeHtml(winner.name)}</b>`);
            status.style.color = '#f6c343';
        } else {
            status.innerHTML = `⏳ انتهى ${finishedCount} من ${sorted.length} لاعبين... الترتيب يتحدث مباشرة`;
            status.style.color = '#a0aec0';
        }

        let html = '';
        if (allFinished) {
            html += '<div style="display: flex; align-items: flex-end; justify-content: center; gap: 10px; margin: 30px 0 20px; height: 210px;">';
            html += podiumSlot(sorted[1] && sorted[1][1], 2) + podiumSlot(sorted[0] && sorted[0][1], 1) + podiumSlot(sorted[2] && sorted[2][1], 3);
            html += '</div>';
        }
        const rest = allFinished ? sorted.slice(3) : sorted;
        if (rest.length) {
            html += '<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">';
            rest.forEach(([key, p], i) => {
                const rank = allFinished ? i + 4 : i + 1;
                html += `
                    <div style="display: flex; align-items: center; gap: 10px; background: ${key === myId ? 'rgba(16,185,129,0.18)' : 'rgba(0,0,0,0.3)'}; padding: 8px 10px; border-radius: 10px; border: 1px solid ${key === myId ? '#10b981' : 'transparent'};">
                        <div style="font-size: 1.1em; width: 30px; font-weight: bold; color: #a0aec0;">#${rank}</div>
                        <img src="${escapeHtml(p.avatar || AVATARS[0])}" style="width: 32px; height: 32px; border-radius: 50%; background: #fff;">
                        <div style="flex-grow: 1; text-align: right;">${escapeHtml(p.name)}${key === myId ? ' <span style="color:#a0aec0;font-size:0.8em;">(أنت)</span>' : ''}</div>
                        <div style="font-size: 0.8em; color: ${p.hasFinished ? '#10b981' : '#a0aec0'};">${p.hasFinished ? '✅ انتهى' : '⏳ يلعب'}</div>
                        <div style="font-weight: bold; color: gold; min-width: 40px; text-align: left;">${p.score || 0} نقطة</div>
                    </div>`;
            });
            html += '</div>';
        }
        $('mp-final-leaderboard').innerHTML = html;

        const me = players && players[myId];
        if (me) {
            $('cert-name').textContent = me.name;
            $('cert-score').textContent = me.score || 0;
        }
        if (allFinished && room && room.hostId === myId && room.status === 'playing') {
            update(ref(db, `rooms/${roomCode}`), { status: 'finished' }).catch(() => {});
        }
    }

    onValue(ref(db, `rooms/${roomCode}`), (snapshot) => {
        if (leaving) return;
        const data = snapshot.val();
        if (!data) {
            $('mp-status').innerHTML = 'ℹ️ أغلق المضيف الغرفة. النتائج أدناه نهائية.';
            $('mp-rematch-btn').style.display = 'none';
            return;
        }
        room = data;
        const s = data.settings || {};
        $('mp-room-meta').textContent = `غرفة ${roomCode} • ${categoryLabel(s.category)} • ${modeLabel(s.mode, s.val)}`;

        // Host started a new round: everyone goes back to the lobby
        if (data.status === 'waiting' && (data.round || 1) > myRound) {
            leaving = true;
            localStorage.setItem('mp_round', String(data.round));
            window.location.href = 'lobby.html?room=' + roomCode;
            return;
        }
        const isHost = data.hostId === myId;
        $('mp-rematch-btn').style.display = isHost ? 'inline-block' : 'none';
        $('mp-guest-hint').style.display = isHost ? 'none' : 'block';
        renderPlayers(data.players);
    });

    $('mp-rematch-btn').onclick = async () => {
        if (!room) return;
        if (!allFinished && !confirm('لم ينتهِ الجميع بعد. هل تريد بدء جولة جديدة الآن؟')) return;
        $('mp-rematch-btn').disabled = true;
        try {
            const updates = { status: 'waiting', round: (room.round || 1) + 1, startedAt: null };
            Object.keys(room.players || {}).forEach(id => {
                updates[`players/${id}/score`] = 0;
                updates[`players/${id}/answered`] = 0;
                updates[`players/${id}/hasFinished`] = false;
            });
            await update(ref(db, `rooms/${roomCode}`), updates);
        } catch (e) {
            console.error(e);
            alert('تعذر بدء جولة جديدة');
            $('mp-rematch-btn').disabled = false;
        }
    };

    $('mp-home-btn').onclick = () => {
        leaving = true;
        clearMpState();
        window.location.href = 'index.html';
    };
}

window.generateCertificate = function() {
    const certArea = document.getElementById('certificate-area');
    certArea.style.display = 'block';
    setTimeout(() => { window.print(); }, 500);
};
