const fs = require('fs');

// Patch script.js
let js = fs.readFileSync('script.js', 'utf8');

// Inject parsing logic after let quizType = localStorage.getItem("quizType") || "mixed";
const parseLogic = `
let quizType = localStorage.getItem("quizType") || "mixed";

// Handle multiplayer juz selection embedded in quizType
if (quizType.includes('_juz_')) {
    const parts = quizType.split('_juz_');
    quizType = parts[0];
    localStorage.setItem('selectedJuz', parts[1]);
}
`;

js = js.replace(/let quizType = localStorage\.getItem\("quizType"\) \|\| "mixed";/, parseLogic);

fs.writeFileSync('script.js', js, 'utf8');
console.log("Patched script.js for multiplayer juz parsing");
