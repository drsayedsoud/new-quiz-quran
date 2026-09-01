const fs = require('fs');

// PATCH MULTIPLAYER-QUIZ.JS
let mpJs = fs.readFileSync('multiplayer-quiz.js', 'utf8');
// Fix the vertical bar math: use mp_val instead of mp_qCount, and if it's time mode, what is totalQ?
// If mode is time, the progress bar could represent "Time left" or "Score relative to a fixed number like 30".
// The easiest is just to keep the score relative to `mp_val` if it's questions, or maybe 50 if it's time.
const progressPatch = `
                  let mpMode = localStorage.getItem('mp_mode') || 'questions';
                  let mpVal = parseInt(localStorage.getItem('mp_val')) || 10;
                  const totalQ = mpMode === 'questions' ? mpVal : 50; // In time mode, visually max at 50 points
`;
mpJs = mpJs.replace(/const totalQ = parseInt\(localStorage\.getItem\('mp_qCount'\)\) \|\| 10;/, progressPatch);
fs.writeFileSync('multiplayer-quiz.js', mpJs, 'utf8');
console.log("Patched multiplayer-quiz.js for mp_mode and mp_val");


// PATCH SCRIPT.JS
let js = fs.readFileSync('script.js', 'utf8');

const targetLogic = `quizData = shuffle(filteredSource);`;

const newLogic = `quizData = shuffle(filteredSource);
    
    // MP LOGIC PATCH
    const isMp = localStorage.getItem('mp_roomCode');
    if (isMp) {
        const mpMode = localStorage.getItem('mp_mode') || 'questions';
        const mpVal = parseInt(localStorage.getItem('mp_val')) || 10;
        
        if (mpMode === 'questions') {
            quizData = quizData.slice(0, mpVal);
        } else if (mpMode === 'time') {
            // Time mode: they can answer as many as they want, time is limited
            totalTime = mpVal * 60; // mpVal is in minutes
        }
    } else {
        // For solo, let's just cap it at 20 to prevent infinite games, unless it's a specific Juz maybe?
        // Actually, we'll leave it as is or cap to 30.
        if (quizData.length > 50) {
            quizData = quizData.slice(0, 50); // Cap solo games to 50 max
        }
    }
`;

js = js.replace(targetLogic, newLogic);
fs.writeFileSync('script.js', js, 'utf8');
console.log("Patched script.js for mp_mode limits");
