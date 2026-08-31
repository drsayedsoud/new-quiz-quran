const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const match = html.match(/<!-- Multiplayer Modal -->[\s\S]*?<!-- Admin Settings Gear -->/);
if(match) {
    fs.writeFileSync('modals_dump.html', match[0], 'utf8');
    console.log("Saved modals to modals_dump.html");
} else {
    console.log("Not found");
}
