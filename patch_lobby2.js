const fs = require('fs');
let lobbyJs = fs.readFileSync('lobby.js', 'utf8');

// Replace: if (data.types) localStorage.setItem('quizType', data.types);
// With: if (data.settings && data.settings.category) localStorage.setItem('quizType', data.settings.category); else if (data.types) localStorage.setItem('quizType', data.types);

lobbyJs = lobbyJs.replace(/if \(data\.types\) localStorage\.setItem\('quizType', data\.types\);/, 
    "if (data.settings && data.settings.category) localStorage.setItem('quizType', data.settings.category);\n        else if (data.types) localStorage.setItem('quizType', data.types);");

fs.writeFileSync('lobby.js', lobbyJs, 'utf8');
console.log("Patched lobby.js to sync settings.category");
