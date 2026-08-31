import { db, ref, onValue, update } from './firebase-init.js';

const roomCode = localStorage.getItem('mp_roomCode');
const localUserId = localStorage.getItem('mp_userId');
const isHost = localStorage.getItem('mp_isHost') === 'true';

if (roomCode) {
    // Seed Math.random so all players generate the EXACT same questions and choices
    let seed = 0;
    for (let i = 0; i < roomCode.length; i++) {
        seed += roomCode.charCodeAt(i) * (i + 1);
    }
    Math.random = function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

if (roomCode && localUserId) {
    document.getElementById('mp-leaderboard').style.display = 'block';
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const list = document.getElementById('mp-players-list');
            list.innerHTML = '';
            const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
            sortedPlayers.forEach(p => {
                list.innerHTML += `
                    <div class="player-row" style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px; animation: fadeIn 0.3s ease;">
                        <img src="${p.avatar}" style="width: 30px; height: 30px; border-radius: 50%; margin-left: 10px; border: 2px solid var(--button-green);">
                        <div style="flex-grow: 1; font-size: 0.9em;">${p.name}</div>
                        <div style="font-weight: bold; color: gold;">${p.score}</div>
                    </div>
                `;
            });
        }
    });

    const originalHandleAnswer = window.handleAnswer;
    if (typeof originalHandleAnswer === 'function') {
        window.handleAnswer = function(button, correctAnswer) {
            originalHandleAnswer(button, correctAnswer);
            setTimeout(() => {
                const counterElement = document.getElementById("correct-counter");
                const currentScore = counterElement ? parseInt(counterElement.textContent) || 0 : 0;
                update(ref(db, `rooms/${roomCode}/players/${localUserId}`), { score: currentScore }).catch(e=>console.error(e));
            }, 100);
        };
    } else {
        setInterval(() => {
            const counterElement = document.getElementById("correct-counter");
            const currentScore = counterElement ? parseInt(counterElement.textContent) || 0 : 0;
            const lastScore = window._lastMpScore || 0;
            if (currentScore > lastScore) {
                window._lastMpScore = currentScore;
                update(ref(db, `rooms/${roomCode}/players/${localUserId}`), { score: currentScore }).catch(e=>console.error(e));
            }
        }, 1000);
    }
}
