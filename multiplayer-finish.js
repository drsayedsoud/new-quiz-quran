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
            const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
            
            let podiumHtml = '<div style="display: flex; align-items: flex-end; justify-content: center; gap: 10px; margin: 40px 0; height: 200px;">';
            
            // 2nd Place (Silver)
            if (sortedPlayers[1]) {
                podiumHtml += `
                <div style="display: flex; flex-direction: column; items-align: center; width: 30%;">
                    <img src="${sortedPlayers[1].avatar}" style="width: 60px; height: 60px; border-radius: 50%; border: 4px solid silver; margin: 0 auto -20px auto; position: relative; z-index: 10; background: #000;">
                    <div style="background: linear-gradient(to top, #7f8c8d, #bdc3c7); height: 100px; border-radius: 10px 10px 0 0; text-align: center; padding-top: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <div style="font-size: 2em; margin-bottom: 5px;">🥈</div>
                        <div style="color: white; font-weight: bold; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px;">${sortedPlayers[1].name}</div>
                        <div style="color: #2c3e50; font-weight: 900;">${sortedPlayers[1].score}</div>
                    </div>
                </div>`;
            }

            // 1st Place (Gold)
            if (sortedPlayers[0]) {
                podiumHtml += `
                <div style="display: flex; flex-direction: column; items-align: center; width: 35%;">
                    <img src="${sortedPlayers[0].avatar}" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid gold; margin: 0 auto -25px auto; position: relative; z-index: 10; background: #000;">
                    <div style="background: linear-gradient(to top, #d35400, #f1c40f); height: 140px; border-radius: 10px 10px 0 0; text-align: center; padding-top: 30px; box-shadow: 0 4px 20px rgba(241,196,15,0.4);">
                        <div style="font-size: 2.5em; margin-bottom: 5px;">👑</div>
                        <div style="color: white; font-weight: bold; font-size: 1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px;">${sortedPlayers[0].name}</div>
                        <div style="color: #8e44ad; font-weight: 900; font-size: 1.2em;">${sortedPlayers[0].score}</div>
                    </div>
                </div>`;
            }

            // 3rd Place (Bronze)
            if (sortedPlayers[2]) {
                podiumHtml += `
                <div style="display: flex; flex-direction: column; items-align: center; width: 30%;">
                    <img src="${sortedPlayers[2].avatar}" style="width: 50px; height: 50px; border-radius: 50%; border: 4px solid #cd7f32; margin: 0 auto -15px auto; position: relative; z-index: 10; background: #000;">
                    <div style="background: linear-gradient(to top, #8e44ad, #cd7f32); height: 80px; border-radius: 10px 10px 0 0; text-align: center; padding-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <div style="font-size: 1.5em; margin-bottom: 5px;">🥉</div>
                        <div style="color: white; font-weight: bold; font-size: 0.8em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px;">${sortedPlayers[2].name}</div>
                        <div style="color: #2c3e50; font-weight: 900;">${sortedPlayers[2].score}</div>
                    </div>
                </div>`;
            }
            
            podiumHtml += '</div>';

            // Add remaining players (4th+)
            if (sortedPlayers.length > 3) {
                podiumHtml += '<div style="margin-top: 20px; border-top: 1px solid #444; padding-top: 15px;">';
                for (let i = 3; i < sortedPlayers.length; i++) {
                    podiumHtml += `
                        <div style="display: flex; align-items: center; margin-bottom: 10px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px;">
                            <div style="font-size: 1.2em; width: 30px; font-weight: bold; color: gray;">#${i+1}</div>
                            <img src="${sortedPlayers[i].avatar}" style="width: 30px; height: 30px; border-radius: 50%; margin-left: 10px;">
                            <div style="flex-grow: 1; font-size: 1em;">${sortedPlayers[i].name}</div>
                            <div style="font-weight: bold; color: white;">${sortedPlayers[i].score} نقطة</div>
                        </div>`;
                }
                podiumHtml += '</div>';
            }

            list.innerHTML = podiumHtml;

            // Certificate Info
            const myPlayer = sortedPlayers.find(p => p.name === localStorage.getItem("mp_playerName"));
            if (myPlayer) {
                document.getElementById('cert-name').innerText = myPlayer.name;
                document.getElementById('cert-score').innerText = myPlayer.score;
            } else if (sortedPlayers[0]) {
                document.getElementById('cert-name').innerText = sortedPlayers[0].name;
                document.getElementById('cert-score').innerText = sortedPlayers[0].score;
            }
        }
    });
}

window.generateCertificate = function() {
    const certArea = document.getElementById('certificate-area');
    certArea.style.display = 'block';
    setTimeout(() => { window.print(); }, 500);
}
