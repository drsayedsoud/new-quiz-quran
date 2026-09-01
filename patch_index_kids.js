const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Update Kids onclick to showKidsOptions
html = html.replace(/startSingleQuiz\('kids', 'solo'\)/g, "showKidsOptions('solo')");
html = html.replace(/startSingleQuiz\('kids', 'multi'\)/g, "showKidsOptions('multi')");

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

// Insert after solo-quran-options and multi-quran-options
html = html.replace(/(<div id="solo-quran-options"[\s\S]*?<\/div>)/, "$1" + soloKidsHtml);
html = html.replace(/(<div id="multi-quran-options"[\s\S]*?<\/div>)/, "$1" + multiKidsHtml);

// Add the JS functions
const functionsJs = `
function showKidsOptions(mode) {
    document.getElementById(mode + '-categories-list').style.display = 'none';
    document.getElementById(mode + '-kids-options').style.display = 'flex';
}
function hideKidsOptions(mode) {
    document.getElementById(mode + '-categories-list').style.display = 'flex';
    document.getElementById(mode + '-kids-options').style.display = 'none';
}
`;
html = html.replace(/function showQuranOptions/, functionsJs + "function showQuranOptions");

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patched index.html for kids options");
