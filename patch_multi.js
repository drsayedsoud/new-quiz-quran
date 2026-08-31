const fs = require('fs');
let js = fs.readFileSync('multiplayer.js', 'utf8');

const newFunc = `
window.createMultiplayerRoomWithParams = async function(category, qCount) {
    if (!category) { alert("يرجى اختيار قسم أولاً"); return; }
    
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
        alert("حدث خطأ في إنشاء الغرفة.");
    }
}
`;

if(!js.includes('createMultiplayerRoomWithParams')) {
    js += newFunc;
    fs.writeFileSync('multiplayer.js', js, 'utf8');
    console.log("Patched multiplayer.js with createMultiplayerRoomWithParams");
}
