const fs = require('fs');
let js = fs.readFileSync('multiplayer.js', 'utf8');

// The original signature was: window.createMultiplayerRoomWithParams = async function(category, qCount) {
// Replace the signature and the logic
js = js.replace(/window\.createMultiplayerRoomWithParams\s*=\s*async function\(category, qCount\) \{/, "window.createMultiplayerRoomWithParams = async function(category, mode, val) {");

// Inside, it used to write: `settings: { category, qCount }`
// We need to change that to: `settings: { category, mode, val }`
js = js.replace(/settings:\s*\{\s*category(,\s*qCount)?\s*\}/, "settings: { category, mode: mode || 'questions', val: val || 10 }");

fs.writeFileSync('multiplayer.js', js, 'utf8');
console.log("Patched multiplayer.js for MP flow");
