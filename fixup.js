const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const h1Index = html.indexOf('<h1>');
const btnContainerIndex = html.indexOf('<div class="button-container">');

const newCards = `<h1>اختر نوع المسابقة</h1>

<div class="quiz-options" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; margin-top: 50px; margin-bottom: 50px;">
    <!-- Solo Play Card -->
    <div class="card" onclick="openSoloMixModal()" onmouseenter="playHover()" style="border: 3px solid var(--button-blue); box-shadow: 0 0 25px rgba(66, 153, 225, 0.4); border-radius: 25px; padding: 40px 20px; width: 100%; max-width: 320px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(145deg, #16213e, #2a2a4e);">
        <div style="font-size: 5em; margin-bottom: 20px;">👤</div>
        <div class="card-header" style="color: var(--button-blue); font-size: 1.8em; font-weight: 800;">لعبة فردية</div>
        <p style="color: #aaa; margin-top: 15px; font-size: 1.1em; line-height: 1.6; text-align: center;">اختبر معلوماتك وتدرب بنفسك في مختلف علوم القرآن والسيرة.</p>
    </div>

    <!-- Multiplayer Card -->
    <div class="card" onclick="openMultiplayerModal()" onmouseenter="playHover()" style="border: 3px solid var(--button-green); box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); border-radius: 25px; padding: 40px 20px; width: 100%; max-width: 320px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(145deg, #16213e, #2a2a4e);">
        <div style="font-size: 5em; margin-bottom: 20px;">👥</div>
        <div class="card-header" style="color: var(--button-green); font-size: 1.8em; font-weight: 800;">تحدي مباشر</div>
        <p style="color: #aaa; margin-top: 15px; font-size: 1.1em; line-height: 1.6; text-align: center;">تحدى أصدقاءك وعائلتك في غرفة خاصة ومنافسة مباشرة!</p>
    </div>
</div>

`;

const newHtml = html.substring(0, h1Index) + newCards + html.substring(btnContainerIndex);
fs.writeFileSync('index.html', newHtml, 'utf8');

// Also fixing script.js missing questions bug
let scriptJs = fs.readFileSync('script.js', 'utf8');
scriptJs = scriptJs.replace(
    /if \(!quizType\) quizType = "mixed";/,
    "if (!quizType) quizType = 'mixed';"
);
// Make sure split gets clean strings
scriptJs = scriptJs.replace(
    /const types = quizType\.split\(','\);/,
    "const types = quizType.split(',').map(t => t.trim());"
);

fs.writeFileSync('script.js', scriptJs, 'utf8');
console.log("Done.");
