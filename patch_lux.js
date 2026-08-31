const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace the entire quiz-options and button-container
const oldBodyContentRegex = /<div class="quiz-options"[\s\S]*?<\/div>\s*<\/div>/i;

const newMainContent = `<div class="quiz-options" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 25px; width: 100%; max-width: 700px; margin: 30px auto;">
    <!-- Luxurious Solo Play Card -->
    <div class="card" onmousedown="startSoloPress()" onmouseup="cancelSoloPress(event)" onmouseleave="cancelSoloPress(event)" ontouchstart="startSoloPress()" ontouchend="cancelSoloPress(event)" onmouseenter="playHover()" style="position: relative; border-radius: 25px; padding: 35px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, rgba(74, 20, 140, 0.6) 0%, rgba(49, 27, 146, 0.8) 100%); backdrop-filter: blur(15px); border: 2px solid rgba(255, 255, 255, 0.15); box-shadow: 0 15px 35px rgba(49, 27, 146, 0.4), inset 0 0 20px rgba(255,255,255,0.05); overflow: hidden; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; user-select: none; -webkit-user-select: none;" onmouseover="this.style.transform='translateY(-10px) scale(1.03)'; this.style.boxShadow='0 20px 40px rgba(49, 27, 146, 0.6)';" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 15px 35px rgba(49, 27, 146, 0.4)';">
        <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(156, 39, 176, 0.4) 0%, rgba(0,0,0,0) 70%); z-index: 0; pointer-events: none;"></div>
        <div style="font-size: 4em; margin-bottom: 15px; z-index: 1; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.5));">👤</div>
        <div class="card-header" style="color: #e9d8fd; font-size: 1.8em; font-weight: 900; z-index: 1; margin-bottom: 10px; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">لعبة فردية</div>
        <p style="color: #b794f4; font-size: 0.95em; line-height: 1.6; text-align: center; margin: 0; z-index: 1; font-weight: 600;">تدرب واختبر معلوماتك بنفسك في أقسام المسابقة المختلفة.</p>
    </div>

    <!-- Luxurious Multiplayer Card -->
    <div class="card" onclick="openMultiplayerModal()" onmouseenter="playHover()" style="position: relative; border-radius: 25px; padding: 35px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, rgba(0, 77, 64, 0.6) 0%, rgba(0, 105, 92, 0.8) 100%); backdrop-filter: blur(15px); border: 2px solid rgba(255, 255, 255, 0.15); box-shadow: 0 15px 35px rgba(0, 77, 64, 0.4), inset 0 0 20px rgba(255,255,255,0.05); overflow: hidden; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer;" onmouseover="this.style.transform='translateY(-10px) scale(1.03)'; this.style.boxShadow='0 20px 40px rgba(0, 77, 64, 0.6)';" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 15px 35px rgba(0, 77, 64, 0.4)';">
        <div style="position: absolute; bottom: -50px; left: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(0, 191, 165, 0.4) 0%, rgba(0,0,0,0) 70%); z-index: 0; pointer-events: none;"></div>
        <div style="font-size: 4em; margin-bottom: 15px; z-index: 1; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.5));">👥</div>
        <div class="card-header" style="color: #b2f5ea; font-size: 1.8em; font-weight: 900; z-index: 1; margin-bottom: 10px; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">متعدد اللاعبين</div>
        <p style="color: #81e6d9; font-size: 0.95em; line-height: 1.6; text-align: center; margin: 0; z-index: 1; font-weight: 600;">تحدى أصدقاءك في غرفة خاصة واعرف من الأفضل!</p>
    </div>
</div>

<div class="button-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 10px; margin-bottom: 30px;">
  <button class="three-d-button small-button" onclick="window.location.href='downloaddata.html'" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px 20px; border-radius: 12px; font-weight: bold; font-family: 'Cairo'; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
    📦 تحميل الأسئلة
  </button>
  <button id="contact-btn" class="small-button" onclick="window.open('https://wa.me/201066415005', '_blank')" style="background: rgba(37, 211, 102, 0.2); border: 1px solid rgba(37, 211, 102, 0.5); color: #25D366; padding: 12px 20px; border-radius: 12px; font-weight: bold; font-family: 'Cairo'; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(37, 211, 102, 0.3)'" onmouseout="this.style.background='rgba(37, 211, 102, 0.2)'">
    📱 تواصل مع المطور
  </button>
</div>`;

// Delete old `button-container` and `quiz-options` logic (including any trailing `<div id="modal"` which we dumped earlier but might still be there)
html = html.replace(/<div class="quiz-options"[\s\S]*?<\/div>\s*<\/div>\s*<div class="button-container">[\s\S]*?<\/div>(\s*<div id="modal" class="modal">[\s\S]*?<\/div>)?/i, newMainContent);

// Also let's clean up any lingering modal just in case
html = html.replace(/<div id="modal" class="modal">[\s\S]*?<\/div>\s*<link rel="manifest"/, '<link rel="manifest"');

// 2. Fix the Modals UI to be thinner and re-order Kids Quiz to the bottom
function getThinnerCard(icon, title, color, onclickAttr, desc) {
    let descHtml = desc ? '<div style="font-size: 0.75em; color: #a0aec0; margin-top: 2px;">' + desc + '</div>' : '';
    return '<div class="category-card" onclick="' + onclickAttr + '" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: 0.2s;" onmouseenter="this.style.background=\\\'rgba(255,255,255,0.1)\\\';" onmouseleave="this.style.background=\\\'rgba(255,255,255,0.05)\\\';">' +
        '<span style="font-size: 2em; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + icon + '</span>' +
        '<div style="text-align: right; flex-grow: 1;">' +
            '<div style="font-weight: 800; font-size: 1.1em; color: ' + color + ';">' + title + '</div>' +
            descHtml +
        '</div>' +
    '</div>';
}

const juzOptionsHtml = function(mode) {
    return '<div id="' + mode + '-quran-options" style="display: none; flex-direction: column; gap: 10px; margin-top: 5px;">' +
        '<h4 style="color: white; margin: 0; text-align: center; font-size: 1.1em;">خيارات القرآن الكريم</h4>' +
        '<button onclick="startSingleQuiz(\\\'mixed\\\', \\\'' + mode + '\\\', \\\'all\\\')" style="background-color: var(--button-green); color: white; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 1em; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">📖 مسابقة في القرآن كله</button>' +
        '<div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">' +
            '<select id="' + mode + '-juz-select" style="flex-grow: 1; padding: 12px; border-radius: 10px; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); font-size: 1em; outline: none;">' +
                '<option value="">-- أو اختر الجزء المحدد --</option>' +
                '<script>' +
                    'for (let i = 1; i <= 30; i++) {' +
                        'document.write(\\\'<option value="\\\' + i + \\\'">الجزء \\\' + i + \\\'</option>\\\');' +
                    '}' +
                '</script>' +
            '</select>' +
            '<button onclick="startJuzQuiz(\\\'' + mode + '\\\')" style="background-color: var(--button-blue); color: white; padding: 12px 20px; border-radius: 10px; font-weight: bold; border: none; cursor: pointer;">ابدأ</button>' +
        '</div>' +
        '<button onclick="hideQuranOptions(\\\'' + mode + '\\\')" style="background: transparent; color: #a0aec0; border: none; cursor: pointer; margin-top: 5px; font-size: 0.9em; padding: 8px;">🔙 رجوع للأقسام</button>' +
    '</div>';
}

const newMultiModal = '<!-- Multiplayer Modal -->' +
    '<div id="multiplayer-modal" class="modal">' +
        '<div class="modal-content" style="max-width: 450px; padding: 20px; background: var(--modal-bg); border-radius: 20px;">' +
            '<span class="close-button" onclick="closeMultiplayerModal()">&times;</span>' +
            '<h3 style="color: var(--button-green); margin-top: 0; text-align: center; margin-bottom: 15px; font-size: 1.4em;">غرفة تحدي جديدة</h3>' +
            '<div id="multi-categories-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 55vh; overflow-y: auto; padding-right: 5px;">' +
                getThinnerCard('📖', 'القرآن الكريم', 'var(--button-green)', "showQuranOptions('multi')", 'مسابقة في أجزاء القرآن أو القرآن كاملاً') +
                getThinnerCard('🕌', 'السيرة النبوية', '#f6e05e', "startSingleQuiz('seerah', 'multi')") +
                getThinnerCard('⚖️', 'الفقه الإسلامي', '#f6ad55', "startSingleQuiz('fiqh', 'multi')") +
                getThinnerCard('💡', 'معلومات قرآنية', '#68d391', "startSingleQuiz('general', 'multi')") +
                getThinnerCard('🔤', 'معاني الكلمات', '#b794f4', "startSingleQuiz('meanings', 'multi')") +
                getThinnerCard('🎈', 'مسابقة الأطفال', '#fc8181', "startSingleQuiz('kids', 'multi')") +
            '</div>' +
            juzOptionsHtml('multi') +
            '<hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">' +
            '<h3 style="color: #a0aec0; text-align: center; font-size: 1.1em; margin-top: 0;">الانضمام لغرفة سابقة</h3>' +
            '<div style="display: flex; gap: 10px; justify-content: center;">' +
                '<input type="text" id="join-room-code" placeholder="أدخل الكود" style="padding: 10px; width: 60%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; text-align: center; font-size: 1.1em;">' +
                '<button onclick="joinMultiplayerRoom()" style="background-color: var(--button-green); color: white; border: none; border-radius: 10px; padding: 0 15px; font-weight: bold; cursor: pointer;">انضمام</button>' +
            '</div>' +
        '</div>' +
    '</div>';

const newSoloModal = '<!-- Solo Mix Modal -->' +
    '<div id="solo-mix-modal" class="modal">' +
        '<div class="modal-content" style="max-width: 450px; padding: 20px; background: var(--modal-bg); border-radius: 20px;">' +
            '<span class="close-button" onclick="closeSoloMixModal()">&times;</span>' +
            '<h3 style="color: var(--button-blue); margin-top: 0; text-align: center; margin-bottom: 15px; font-size: 1.5em;">اختر قسم المسابقة</h3>' +
            '<div id="solo-categories-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 65vh; overflow-y: auto; padding-right: 5px;">' +
                getThinnerCard('📖', 'القرآن الكريم', 'var(--button-blue)', "showQuranOptions('solo')", 'مسابقة في أجزاء القرآن أو القرآن كاملاً') +
                getThinnerCard('🕌', 'السيرة النبوية', '#f6e05e', "startSingleQuiz('seerah', 'solo')") +
                getThinnerCard('⚖️', 'الفقه الإسلامي', '#f6ad55', "startSingleQuiz('fiqh', 'solo')") +
                getThinnerCard('💡', 'معلومات قرآنية', '#68d391', "startSingleQuiz('general', 'solo')") +
                getThinnerCard('🔤', 'معاني الكلمات', '#b794f4', "startSingleQuiz('meanings', 'solo')") +
                getThinnerCard('🎈', 'مسابقة الأطفال', '#fc8181', "startSingleQuiz('kids', 'solo')") +
            '</div>' +
            juzOptionsHtml('solo') +
        '</div>' +
    '</div>';

html = html.replace(/<!-- Multiplayer Modal -->[\s\S]*?<!-- Admin Settings Gear -->/i, newMultiModal + '\n' + newSoloModal + '\n    <script type="module" src="multiplayer.js"></script>\n\n    <!-- Admin Settings Gear -->');

html = html.replace(/\\\'/g, "'");

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patched UX successfully!");
