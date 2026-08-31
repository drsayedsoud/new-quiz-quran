const fs = require('fs');
let js = fs.readFileSync('multiplayer-quiz.js', 'utf8');

// We find the innerHTML line for the leaderboard
// list.innerHTML += `
//     <div style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">

js = js.replace(/<div style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">/g, 
    '<div class="player-row" style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px; animation: fadeIn 0.3s ease;">');

fs.writeFileSync('multiplayer-quiz.js', js, 'utf8');
console.log("Patched multiplayer-quiz.js with animation class");
