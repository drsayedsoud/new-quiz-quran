const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace onmouseleave="cancelSoloPress(event)" with onmouseleave="abortSoloPress(event)"
html = html.replace('onmouseleave="cancelSoloPress(event)"', 'onmouseleave="abortSoloPress(event)"');

// Inject the abortSoloPress function
const scriptInjection = `
    function abortSoloPress(e) {
        clearTimeout(soloCardTimer);
    }
    function cancelSoloPress(e) {
`;

html = html.replace(/function cancelSoloPress\(e\) \{/, scriptInjection);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patched index.html for solo button hover bug");
