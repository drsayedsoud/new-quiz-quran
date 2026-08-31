const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<div class="quiz-options"[\s\S]*?<\/div>\s*<\/div>/);
console.log(match[0]);
