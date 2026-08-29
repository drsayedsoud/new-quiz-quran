import { db, ref, set, get, child } from './firebase-init.js';

window.openMultiplayerModal = function() { document.getElementById('multiplayer-modal').style.display = 'flex'; }
window.closeMultiplayerModal = function() { document.getElementById('multiplayer-modal').style.display = 'none'; }
function generateRoomCode() { return Math.floor(10000 + Math.random() * 90000).toString(); }

window.createMultiplayerRoom = async function() {
    const checkboxes = document.querySelectorAll('#mp-category-select input[type="checkbox"]:checked');
    const category = Array.from(checkboxes).map(cb => cb.value).join(',');
    if (!category) { alert("الرجاء اختيار نوع واحد على الأقل"); return; }
    
    const qCount = parseInt(document.getElementById('mp-questions-count').value);
    const roomCode = generateRoomCode();
    const hostId = "host_" + Date.now();
    
    localStorage.setItem("mp_userId", hostId);
    localStorage.setItem("mp_isHost", "true");
    
    try {
        await set(ref(db, 'rooms/' + roomCode), {
            hostId: hostId, status: 'waiting',
            settings: { category: category, questionCount: qCount },
            currentQuestionIndex: 0, players: {}
        });
        window.location.href = 'lobby.html?room=' + roomCode;
    } catch (e) {
        console.error("Error creating room: ", e);
        alert("حدث خطأ أثناء إنشاء الغرفة. تأكد من تفعيل Realtime Database.");
    }
}

window.joinMultiplayerRoom = async function() {
    const code = document.getElementById('join-room-code').value.trim();
    if (code.length !== 5) { alert("الرجاء إدخال كود صحيح مكون من 5 أرقام"); return; }
    
    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, 'rooms/' + code));
        if (snapshot.exists()) {
            if (snapshot.val().status !== 'waiting') {
                alert("عذراً، اللعبة بدأت بالفعل في هذه الغرفة!"); return;
            }
            window.location.href = 'lobby.html?room=' + code;
        } else {
            alert("الغرفة غير موجودة. تأكد من الكود.");
        }
    } catch (e) { console.error(e); alert("خطأ في الاتصال بقاعدة البيانات."); }
}

window.openSoloMixModal = function() { document.getElementById('solo-mix-modal').style.display = 'flex'; }
window.closeSoloMixModal = function() { document.getElementById('solo-mix-modal').style.display = 'none'; }
window.startSoloMixQuiz = function() {
    const checkboxes = document.querySelectorAll('#solo-category-select input[type="checkbox"]:checked');
    const category = Array.from(checkboxes).map(cb => cb.value).join(',');
    if (!category) { alert("الرجاء اختيار نوع واحد على الأقل"); return; }
    localStorage.setItem("quizType", category);
    localStorage.setItem("quizTitle", "تشكيلة مخصصة");
    localStorage.removeItem("mp_roomCode");
    window.location.href = "quiz.html";
}
