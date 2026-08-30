const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');
js = js.replace('if (!data) {', 'if (!data || !data.kids || data.kids.length === 0) { console.log("Outdated DB, forcing refetch");');
fs.writeFileSync('script.js', js, 'utf8');
console.log('Patched script.js');
