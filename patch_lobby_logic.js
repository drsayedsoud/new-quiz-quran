const fs = require('fs');
let js = fs.readFileSync('lobby.js', 'utf8');

// Previously: if (data.settings && data.settings.qCount) localStorage.setItem('mp_qCount', data.settings.qCount);
js = js.replace(/if \(data\.settings && data\.settings\.qCount\) localStorage\.setItem\('mp_qCount', data\.settings\.qCount\);/, 
  "if (data.settings) { localStorage.setItem('mp_mode', data.settings.mode || 'questions'); localStorage.setItem('mp_val', data.settings.val || 10); }");

fs.writeFileSync('lobby.js', js, 'utf8');
console.log("Patched lobby.js to save mode and val");
