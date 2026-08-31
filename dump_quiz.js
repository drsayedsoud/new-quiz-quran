const fs = require('fs');
const html = fs.readFileSync('quiz.html', 'utf8');
const bodyStart = html.indexOf('<body');
console.log(html.substring(bodyStart, bodyStart + 1000));
