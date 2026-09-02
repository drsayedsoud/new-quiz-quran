// Live layer on top of quiz.html for multiplayer rooms: synced questions, live scores, room watchdog
import { db, ref, get, onValue, update } from './firebase-init.js';
import { getLocalUserId, clearMpState, escapeHtml, AVATARS } from './mp-common.js';

const roomCode = localStorage.getItem('mp_roomCode');
const myId = getLocalUserId();

if (roomCode) {
    // Seed Math.random so every player gets the EXACT same questions and choice order
    let seed = 0;
    for (let i = 0; i < roomCode.length; i++) seed += roomCode.charCodeAt(i) * (i + 1);
    seed += (parseInt(localStorage.getItem('mp_round')) || 1) * 7919; // new questions each rematch round
    Math.random = function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const mpMode = localStorage.getItem('mp_mode') || 'questions';
    const mpVal = parseInt(localStorage.getItem('mp_val')) || 10;
    let leaving = false;

    // Solo-only controls make no sense mid-challenge
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    const info = document.getElementById('quiz-info');
    if (info) info.textContent = mpMode === 'time'
        ? `⏱️ تحدي بوقت محدد: ${mpVal} ${mpVal > 2 ? 'دقائق' : 'دقيقة'} - أجب عن أكبر عدد ممكن`
        : `🎯 تحدي ${mpVal} ${mpVal > 10 ? 'سؤال' : 'أسئلة'} - نفس الأسئلة لجميع اللاعبين`;

    const showLive = localStorage.getItem('mp_showlive') !== 'false';

    // Kids rooms: drop the title/time lines and the solo hero track so the standings sit right above the question
    if ((localStorage.getItem('quizType') || '').startsWith('kids')) {
        document.body.classList.add('mp-kids');
        const tb = document.querySelector('.timer-box');
        const totalEl = document.getElementById('total-timer');
        const qEl = document.getElementById('question-timer');
        if (tb && totalEl && qEl) {
            [...tb.childNodes].filter(n => n.nodeType === 3).forEach(n => n.remove());
            const mini = document.createElement('div');
            mini.className = 'mini-timer';
            mini.append('⏱️ ');
            mini.appendChild(totalEl);
            mini.append(' · ');
            mini.appendChild(qEl);
            mini.append(' ث');
            tb.prepend(mini);
        }
    }
    document.getElementById('mp-leaderboard').style.display = showLive ? 'block' : 'none';

    // ---- Room watchdog: host closed the room ----
    onValue(ref(db, `rooms/${roomCode}`), (snapshot) => {
        if (leaving) return;
        const room = snapshot.val();
        if (!room) {
            leaving = true;
            clearMpState();
            alert('تم إغلاق الغرفة من قبل المضيف.');
            window.location.href = 'index.html';
        }
    });

    // ---- Live scores ----
    const barsContainer = document.getElementById('mp-vertical-bars');
    onValue(ref(db, `rooms/${roomCode}/players`), (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        const entries = Object.entries(players);
        const maxScore = Math.max(1, ...entries.map(([, p]) => p.score || 0));
        const totalQ = mpMode === 'questions' ? mpVal : Math.max(10, maxScore);

        if (!showLive) return; // host chose to hide live standings during play

        // Vertical "VS" bars on the sides (desktop)
        if (barsContainer) {
            barsContainer.style.display = 'block';
            entries.forEach(([key, p], index) => {
                const isLeft = index % 2 !== 0;
                const offset = 5 + Math.floor(index / 2) * 65;
                const percent = Math.min(100, Math.max(0, ((p.score || 0) / totalQ) * 100));
                let bar = document.getElementById(`vs-bar-${key}`);
                if (!bar) {
                    bar = document.createElement('div');
                    bar.id = `vs-bar-${key}`;
                    bar.className = 'vs-bar-wrapper';
                    bar.style.cssText = `position: absolute; ${isLeft ? 'left' : 'right'}: ${offset}px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; z-index: 50;`;
                    bar.innerHTML = `
                        <div class="vs-score-text" style="color: gold; font-weight: bold; font-size: 1.2em; text-shadow: 0 0 5px black; margin-bottom: 5px; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 10px;">${p.score || 0}</div>
                        <div style="width: 25px; height: 40vh; background: rgba(0,0,0,0.6); border: 2px solid rgba(255,255,255,0.3); border-radius: 12px; position: relative; overflow: hidden;">
                            <div class="vs-bar-fill" style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${percent}%; background: linear-gradient(to top, #10b981, #34d399); transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 0 10px #10b981;"></div>
                        </div>
                        <img src="${escapeHtml(p.avatar || AVATARS[0])}" style="width: 40px; height: 40px; border-radius: 50%; margin-top: 10px; border: 3px solid ${key === myId ? 'gold' : (isLeft ? '#3b82f6' : '#10b981')}; background: #fff;">
                        <div style="color: white; font-size: 0.85em; font-weight: bold; background: rgba(0,0,0,0.7); padding: 3px 8px; border-radius: 8px; margin-top: 5px; max-width: 70px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(p.name)}</div>`;
                    barsContainer.appendChild(bar);
                } else {
                    bar.querySelector('.vs-score-text').textContent = p.score || 0;
                    bar.querySelector('.vs-bar-fill').style.height = percent + '%';
                }
            });
        }

        // Team totals (when the room plays in two teams)
        const list = document.getElementById('mp-players-list');
        if (localStorage.getItem('mp_teams') === 'true') {
            const red = entries.filter(([, p]) => p.team === 'red').reduce((a, [, p]) => a + (p.score || 0), 0);
            const blue = entries.filter(([, p]) => p.team === 'blue').reduce((a, [, p]) => a + (p.score || 0), 0);
            const pct = red + blue ? Math.round(red / (red + blue) * 100) : 50;
            let bar = document.getElementById('team-bar');
            if (!bar) { bar = document.createElement('div'); bar.id = 'team-bar'; list.parentElement.insertBefore(bar, list); }
            bar.innerHTML = `<div style="display:flex;justify-content:space-between;font-weight:900;margin-bottom:4px;"><span style="color:#f87171;">🔴 الأحمر ${red}</span><span style="color:#60a5fa;">🔵 الأزرق ${blue}</span></div>
                <div style="height:14px;border-radius:999px;overflow:hidden;background:#3b82f6;"><div style="width:${pct}%;height:100%;background:#ef4444;transition:width 0.6s;"></div></div>`;
            bar.style.marginBottom = '10px';
        }
        const sorted = entries.sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
        list.innerHTML = sorted.map(([key, p], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            const progress = mpMode === 'questions' ? `${p.answered || 0}/${mpVal}` : `${p.answered || 0} سؤال`;
            return `
                <div class="player-row" style="display: flex; align-items: center; gap: 8px; background: ${key === myId ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}; border-radius: 10px; padding: 6px 10px; animation: fadeIn 0.3s ease;">
                    <span style="width: 28px; text-align: center; font-size: 0.9em;">${medal}</span>
                    <img src="${escapeHtml(p.avatar || AVATARS[0])}" style="width: 30px; height: 30px; border-radius: 50%; border: 2px solid ${key === myId ? 'gold' : '#10b981'}; background: #fff;">
                    <div style="flex-grow: 1; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.team ? (p.team === 'red' ? '🔴 ' : '🔵 ') : ''}${escapeHtml(p.name)}${key === myId ? ' <span style="color:#a0aec0;font-size:0.8em;">(أنت)</span>' : ''}${p.hasFinished ? ' ✅' : ''}</div>
                    <div style="font-size: 0.75em; color: #a0aec0;">${progress}</div>
                    <div style="font-weight: bold; color: gold; min-width: 24px; text-align: center;">${p.score || 0}</div>
                </div>`;
        }).join('');
    });

    // ---- Reconnect: pick up where this player stopped (not in teacher mode, which is driven by the room) ----
    if (localStorage.getItem('mp_sync') !== 'true') {
        const firstDisplay = window.displayQuestion;
        let restored = false;
        window.displayQuestion = function () {
            if (restored || !quizData || !quizData.length) { firstDisplay(); return; }
            restored = true;
            get(ref(db, `rooms/${roomCode}/players/${myId}`)).then(snap => {
                const me = snap.val();
                if (me && me.answered > 0 && me.answered < quizData.length && mpMode === 'questions') {
                    currentIndex = me.answered; correctCount = me.score || 0; answered = me.answered;
                    const c = document.getElementById('correct-counter'); if (c) c.textContent = correctCount;
                }
                firstDisplay();
            }).catch(() => firstDisplay());
        };
    }

    // ---- Push my score after every answer ----
    let answered = 0;
    const originalHandleAnswer = window.handleAnswer;
    if (typeof originalHandleAnswer === 'function') {
        window.handleAnswer = function(button, correctAnswer) {
            originalHandleAnswer(button, correctAnswer);
            answered++;
            const counter = document.getElementById('correct-counter');
            const score = counter ? parseInt(counter.textContent) || 0 : 0;
            update(ref(db, `rooms/${roomCode}/players/${myId}`), { score, answered }).catch(e => console.error(e));
        };
    }
}
