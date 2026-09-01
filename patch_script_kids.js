const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');
js = js.replace(/quizType === 'kids'/g, "quizType.startsWith('kids')");
js = js.replace(/quizType === "kids"/g, "quizType.startsWith('kids')");
fs.writeFileSync('script.js', js, 'utf8');
console.log("Patched script.js for kids levels");
