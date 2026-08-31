const fs = require('fs');
let js = fs.readFileSync('lobby.js', 'utf8');

// The original line: const appUrl = "https://new-quiz-quran.vercel.app";
// We want to change it to point directly to the room.
js = js.replace(/const appUrl = "https:\/\/new-quiz-quran\.vercel\.app";/g, 'const appUrl = "https://new-quiz-quran.vercel.app/lobby.html?room=" + roomCode;');

fs.writeFileSync('lobby.js', js, 'utf8');
console.log("Patched lobby.js WhatsApp link");
