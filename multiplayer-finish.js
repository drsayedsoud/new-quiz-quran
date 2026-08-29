import { db, ref, get, update } from './firebase-init.js';

const roomCode = localStorage.getItem('mp_roomCode');
const localUserId = localStorage.getItem('mp_userId');

if (roomCode && localUserId) {
    document.getElementById('mp-results').style.display = 'block';
    
    update(ref(db, `rooms/${roomCode}/players/${localUserId}`), { hasFinished: true }).catch(e=>console.error(e));

    get(ref(db, `rooms/${roomCode}/players`)).then((snapshot) => {
        const players = snapshot.val();
        if (players) {
            const list = document.getElementById('mp-final-leaderboard');
            list.innerHTML = '';
            const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
            let rank = 1;
            sortedPlayers.forEach(p => {
                let crown = rank === 1 ? '👑' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : ''));
                list.innerHTML += `
                    <div style="display: flex; align-items: center; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
                        <div style="font-size: 1.5em; width: 30px;">${crown}</div>
                        <img src="${p.avatar}" style="width: 40px; height: 40px; border-radius: 50%; margin-left: 15px; border: 2px solid ${rank === 1 ? 'gold' : 'white'};">
                        <div style="flex-grow: 1; font-size: 1.2em;">${p.name}</div>
                        <div style="font-weight: bold; font-size: 1.2em; color: gold;">${p.score} نقطة</div>
                    </div>
                `;
                if (p.name === localStorage.getItem("mp_playerName") || document.getElementById('cert-name').innerText === '---') {
                     document.getElementById('cert-name').innerText = p.name;
                     document.getElementById('cert-score').innerText = p.score;
                }
                rank++;
            });
        }
    });
}

window.generateCertificate = function() {
    const certArea = document.getElementById('certificate-area');
    certArea.style.display = 'block';
    setTimeout(() => { window.print(); }, 500);
}
