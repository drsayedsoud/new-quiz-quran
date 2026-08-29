import { db, ref, set, get, child, update, onValue } from './firebase-init.js';

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

if (!roomCode) {
    window.location.href = 'index.html';
}

const isHost = localStorage.getItem('mp_isHost') === 'true';
const localUserId = localStorage.getItem('mp_userId') || ('player_' + Date.now());
if (!localStorage.getItem('mp_userId')) {
    localStorage.setItem('mp_userId', localUserId);
}

let selectedAvatar = 'assets/hulkman.png';

document.getElementById('display-room-code').innerText = roomCode;

if (isHost) {
    document.getElementById('host-view').style.display = 'block';
    document.getElementById('start-game-btn').style.display = 'inline-block';
    document.getElementById('lobby-title').innerText = "أنت المضيف - غرفة الانتظار";
} else {
    document.getElementById('join-form').style.display = 'block';
    document.getElementById('lobby-title').innerText = "الانضمام لغرفة " + roomCode;
}

document.querySelectorAll('.avatar-option').forEach(img => {
    img.addEventListener('click', (e) => {
        document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedAvatar = e.target.getAttribute('data-avatar');
    });
});

let joinBtn = document.getElementById('join-btn');
if(joinBtn) {
    joinBtn.addEventListener('click', async () => {
        const name = document.getElementById('player-name').value.trim();
        if (!name) { alert("يرجى كتابة اسمك"); return; }
        
        try {
            await update(ref(db, `rooms/${roomCode}/players/${localUserId}`), {
                name: name,
                avatar: selectedAvatar,
                score: 0,
                hasFinished: false
            });
            localStorage.setItem('mp_playerName', name);
            document.getElementById('join-form').style.display = 'none';
            document.getElementById('lobby-title').innerText = "في انتظار بدء المسابقة...";
        } catch(e) { console.error(e); alert("حدث خطأ أثناء الانضمام"); }
    });
}

let startBtn = document.getElementById('start-game-btn');
if(startBtn) {
    startBtn.addEventListener('click', async () => {
        try {
            await update(ref(db, `rooms/${roomCode}`), { status: 'playing' });
        } catch(e) { alert("خطأ في بدء اللعبة"); }
    });
}

const roomRef = ref(db, `rooms/${roomCode}`);
onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
        alert("الغرفة غير موجودة أو تم إغلاقها");
        window.location.href = 'index.html';
        return;
    }
    
    if (data.status === 'playing') {
        localStorage.setItem("quizType", data.settings.category);
        localStorage.setItem("mp_roomCode", roomCode);
        window.location.href = 'quiz.html?mp=true';
    }
    
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    let count = 0;
    
    if (data.players) {
        Object.values(data.players).forEach(p => {
            count++;
            playersList.innerHTML += `
                <div class="player-card">
                    <img src="${p.avatar}" alt="avatar">
                    <p>${p.name}</p>
                </div>
            `;
        });
    }
    document.getElementById('players-count').innerText = count;
});

const inviteBtn = document.getElementById('whatsapp-invite-btn');
if (inviteBtn) {
    inviteBtn.addEventListener('click', () => {
        const appUrl = "https://new-quiz-quran.vercel.app";
        const message = `مرحباً! أتحداك في مسابقة القرآن الكريم 🏆\nانضم إلي في الغرفة رقم: *${roomCode}*\nرابط اللعبة: ${appUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });
}
