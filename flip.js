const fs = require('fs');
let html = fs.readFileSync('quiz.html', 'utf8');
html = html.replace('<img src="assets/hulkman.png" style="width: 100%; height: 100%; object-fit: contain;">', 
                    '<img src="assets/hulkman.png" style="width: 100%; height: 100%; object-fit: contain; transform: scaleX(-1);">');
fs.writeFileSync('quiz.html', html, 'utf8');
console.log('Flipped hero image');
