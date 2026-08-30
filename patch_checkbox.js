const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace ALL instances of 'value="mixed" checked>' with 'value="mixed">'
indexHtml = indexHtml.replace(/value="mixed"\s*checked/g, 'value="mixed"');

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log("Successfully removed 'checked' from checkboxes.");
