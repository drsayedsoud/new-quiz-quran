const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove the incorrectly placed kids options
html = html.replace(/<div id="solo-kids-options"[\s\S]*?<\/div>\s*<\/div>/, "");
html = html.replace(/<div id="multi-kids-options"[\s\S]*?<\/div>\s*<\/div>/, "");
html = html.replace(/<div id="solo-kids-options"[\s\S]*?<\/div>/, "");
html = html.replace(/<div id="multi-kids-options"[\s\S]*?<\/div>/, "");

// Actually, let's just find exactly what to remove.
// I will just use a generic regex to delete `<div id="solo-kids-options"...>...</div>` 
// and `<div id="multi-kids-options"...>...</div>`. Note that they only contain simple buttons, no nested divs except the root one.
// Let's re-read the file to ensure a clean state
html = fs.readFileSync('index.html', 'utf8');
const soloKidsRegex = /<div id="solo-kids-options".*?<\/div>\s*<\/div>/s; // wait, the previous code had </div> inside it? No, soloKidsHtml had no nested divs!
// Let's just look for `<div id="solo-kids-options"` up to its closing `</div>`
html = html.replace(/<div id="solo-kids-options"[\s\S]*?<\/div>\s*/g, "");
html = html.replace(/<div id="multi-kids-options"[\s\S]*?<\/div>\s*/g, "");

// Now, properly inject them after `<div id="solo-quran-options"...>...</div></div></div>`?
// No, the safest place to inject is right before the closing `</div></div></div>` of the modal!
// Or even better, replace `id="solo-categories-list" ... </div>` with a proper structure?
// Let's inject it by looking for `hideQuranOptions('solo')`
const soloKidsHtml = `
<div id="solo-kids-options" style="display: none; flex-direction: column; gap: 10px; margin-top: 5px;">
    <h4 style="color: white; margin: 0; text-align: center; font-size: 1.1em;">اختر مستوى الأطفال</h4>
    <button onclick="startSingleQuiz('kids_1', 'solo')" style="background-color: var(--button-green); color: white; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 1em; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">🎈 مستوى 1 (أسئلة سهلة)</button>
    <button onclick="startSingleQuiz('kids_2', 'solo')" style="background-color: var(--button-blue); color: white; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 1em; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">🚀 مستوى 2 (10 سنوات فأكثر)</button>
    <button onclick="hideKidsOptions('solo')" style="background: transparent; color: #a0aec0; border: none; cursor: pointer; margin-top: 5px; font-size: 0.9em; padding: 8px;">🔙 رجوع للأقسام</button>
</div>
`;

const multiKidsHtml = `
<div id="multi-kids-options" style="display: none; flex-direction: column; gap: 10px; margin-top: 5px;">
    <h4 style="color: white; margin: 0; text-align: center; font-size: 1.1em;">اختر مستوى الأطفال</h4>
    <button onclick="startSingleQuiz('kids_1', 'multi')" style="background-color: var(--button-green); color: white; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 1em; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">🎈 مستوى 1 (أسئلة سهلة)</button>
    <button onclick="startSingleQuiz('kids_2', 'multi')" style="background-color: var(--button-blue); color: white; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 1em; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">🚀 مستوى 2 (10 سنوات فأكثر)</button>
    <button onclick="hideKidsOptions('multi')" style="background: transparent; color: #a0aec0; border: none; cursor: pointer; margin-top: 5px; font-size: 0.9em; padding: 8px;">🔙 رجوع للأقسام</button>
</div>
`;

// Insert them correctly after the end of solo-quran-options
html = html.replace(/<button onclick="hideQuranOptions\('solo'\)"[^>]*>.*?<\/button><\/div>/, "$&" + soloKidsHtml);
html = html.replace(/<button onclick="hideQuranOptions\('multi'\)"[^>]*>.*?<\/button><\/div>/, "$&" + multiKidsHtml);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Fixed kids options placement in index.html");
