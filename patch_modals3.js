const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Update Solo Card Long Press
const soloCardRegex = /<div class="card" onclick="openSoloMixModal\(\)"[\s\S]*?<\/div>/i;
const newSoloCard = `<div class="card" onmousedown="startSoloPress()" onmouseup="cancelSoloPress(event)" onmouseleave="cancelSoloPress(event)" ontouchstart="startSoloPress()" ontouchend="cancelSoloPress(event)" onmouseenter="playHover()" style="position: relative; border-radius: 20px; padding: 30px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); user-select: none; -webkit-user-select: none;">
        <!-- Vibrant background glow -->
        <div style="position: absolute; top: -40px; left: -40px; width: 120px; height: 120px; background: rgba(66, 153, 225, 0.5); filter: blur(50px); z-index: 0; pointer-events: none;"></div>
        <div style="font-size: 3.5em; margin-bottom: 15px; z-index: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">👤</div>
        <div class="card-header" style="color: #63b3ed; font-size: 1.5em; font-weight: 800; z-index: 1; margin-bottom: 8px;">لعبة فردية</div>
        <p style="color: #cbd5e0; font-size: 0.9em; line-height: 1.5; text-align: center; margin: 0; z-index: 1;">تدرب واختبر معلوماتك بنفسك في مختلف الأقسام.</p>
    </div>`;
html = html.replace(soloCardRegex, newSoloCard);

const longPressJs = `
<script>
    let soloCardTimer;
    let isLongPress = false;
    function startSoloPress() {
        isLongPress = false;
        soloCardTimer = setTimeout(() => {
            isLongPress = true;
            if(confirm("هل تريد مسح ذاكرة التخزين (الكاش) وإعادة تحميل التطبيق من جديد؟")) {
                localStorage.clear();
                indexedDB.deleteDatabase("QuranDB");
                location.reload(true);
            }
        }, 1000); 
    }
    function cancelSoloPress(e) {
        clearTimeout(soloCardTimer);
        if(!isLongPress) {
            openSoloMixModal();
        }
    }
    
    function showQuranOptions(mode) {
        document.getElementById(mode + '-categories-list').style.display = 'none';
        document.getElementById(mode + '-quran-options').style.display = 'flex';
    }
    
    function hideQuranOptions(mode) {
        document.getElementById(mode + '-categories-list').style.display = 'flex';
        document.getElementById(mode + '-quran-options').style.display = 'none';
    }

    function startSingleQuiz(category, mode, juz) {
        if(mode === 'solo') {
            localStorage.setItem("quizType", category);
            if (juz) {
                if (juz === 'all') {
                    localStorage.removeItem("selectedJuz");
                } else {
                    localStorage.setItem("selectedJuz", juz);
                }
            } else {
                localStorage.removeItem("selectedJuz");
            }
            window.location.href = "quiz.html";
        } else if (mode === 'multi') {
            let qCount = 10;
            let roomCategory = category;
            if (juz && juz !== 'all') {
                roomCategory = category + "_juz_" + juz;
            }
            window.createMultiplayerRoomWithParams(roomCategory, qCount);
        }
    }

    function startJuzQuiz(mode) {
        const juzSelect = document.getElementById(mode + '-juz-select');
        const val = juzSelect.value;
        if(!val) {
            alert("يرجى اختيار الجزء أولاً");
            return;
        }
        startSingleQuiz('mixed', mode, val);
    }
</script>
`;
if(!html.includes('startSoloPress() {')) {
    html = html.replace('</body>', longPressJs + '\n</body>');
}

function getCard(icon, title, color, onclickAttr, desc) {
    let descHtml = desc ? '<div style="font-size: 0.85em; color: #a0aec0; margin-top: 5px;">' + desc + '</div>' : '';
    return '<div class="category-card" onclick="' + onclickAttr + '" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 15px 20px; border-radius: 15px; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: 0.3s;" onmouseenter="this.style.background=\\\'rgba(255,255,255,0.1)\\\'; this.style.transform=\\\'scale(1.02)\\\';" onmouseleave="this.style.background=\\\'rgba(255,255,255,0.05)\\\'; this.style.transform=\\\'scale(1)\\\';">' +
        '<span style="font-size: 2.5em; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">' + icon + '</span>' +
        '<div style="text-align: right; flex-grow: 1;">' +
            '<div style="font-weight: 800; font-size: 1.3em; color: ' + color + ';">' + title + '</div>' +
            descHtml +
        '</div>' +
    '</div>';
}

const juzOptionsHtml = function(mode) {
    return '<div id="' + mode + '-quran-options" style="display: none; flex-direction: column; gap: 15px; margin-top: 10px;">' +
        '<h4 style="color: white; margin: 0; text-align: center; font-size: 1.3em;">خيارات القرآن الكريم</h4>' +
        '<button onclick="startSingleQuiz(\\\'mixed\\\', \\\'' + mode + '\\\', \\\'all\\\')" style="background-color: var(--button-green); color: white; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.1em; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">📖 مسابقة في القرآن كله</button>' +
        '<div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">' +
            '<select id="' + mode + '-juz-select" style="flex-grow: 1; padding: 15px; border-radius: 12px; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); font-size: 1.1em; outline: none;">' +
                '<option value="">-- أو اختر الجزء المحدد --</option>' +
                '<script>' +
                    'for (let i = 1; i <= 30; i++) {' +
                        'document.write(\\\'<option value="\\\' + i + \\\'">الجزء \\\' + i + \\\'</option>\\\');' +
                    '}' +
                '</script>' +
            '</select>' +
            '<button onclick="startJuzQuiz(\\\'' + mode + '\\\')" style="background-color: var(--button-blue); color: white; padding: 15px 25px; border-radius: 12px; font-weight: bold; border: none; cursor: pointer;">ابدأ</button>' +
        '</div>' +
        '<button onclick="hideQuranOptions(\\\'' + mode + '\\\')" style="background: transparent; color: #a0aec0; border: none; cursor: pointer; margin-top: 10px; font-size: 1em; padding: 10px;">🔙 رجوع للأقسام</button>' +
    '</div>';
}

const newMultiModal = '<!-- Multiplayer Modal -->' +
    '<div id="multiplayer-modal" class="modal">' +
        '<div class="modal-content" style="max-width: 500px; padding: 25px; background: var(--modal-bg); border-radius: 20px;">' +
            '<span class="close-button" onclick="closeMultiplayerModal()">&times;</span>' +
            '<h3 style="color: var(--button-green); margin-top: 0; text-align: center; margin-bottom: 20px; font-size: 1.6em;">غرفة تحدي جديدة</h3>' +
            '<div id="multi-categories-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 50vh; overflow-y: auto; padding-right: 5px;">' +
                getCard('📖', 'القرآن الكريم', 'var(--button-green)', "showQuranOptions('multi')", 'مسابقة في أجزاء القرآن أو القرآن كاملاً') +
                getCard('🕌', 'السيرة النبوية', '#f6e05e', "startSingleQuiz('seerah', 'multi')") +
                getCard('⚖️', 'الفقه الإسلامي', '#f6ad55', "startSingleQuiz('fiqh', 'multi')") +
                getCard('🎈', 'مسابقة الأطفال', '#fc8181', "startSingleQuiz('kids', 'multi')") +
                getCard('💡', 'معلومات قرآنية', '#68d391', "startSingleQuiz('general', 'multi')") +
                getCard('🔤', 'معاني الكلمات', '#b794f4', "startSingleQuiz('meanings', 'multi')") +
            '</div>' +
            juzOptionsHtml('multi') +
            '<hr style="border-color: rgba(255,255,255,0.1); margin: 25px 0;">' +
            '<h3 style="color: #a0aec0; text-align: center; font-size: 1.2em; margin-top: 0;">الانضمام لغرفة سابقة</h3>' +
            '<div style="display: flex; gap: 10px; justify-content: center;">' +
                '<input type="text" id="join-room-code" placeholder="أدخل الكود" style="padding: 12px; width: 60%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; text-align: center; font-size: 1.2em;">' +
                '<button onclick="joinMultiplayerRoom()" style="background-color: var(--button-green); color: white; border: none; border-radius: 10px; padding: 0 20px; font-weight: bold; cursor: pointer;">انضمام</button>' +
            '</div>' +
        '</div>' +
    '</div>';

const newSoloModal = '<!-- Solo Mix Modal -->' +
    '<div id="solo-mix-modal" class="modal">' +
        '<div class="modal-content" style="max-width: 500px; padding: 25px; background: var(--modal-bg); border-radius: 20px;">' +
            '<span class="close-button" onclick="closeSoloMixModal()">&times;</span>' +
            '<h3 style="color: var(--button-blue); margin-top: 0; text-align: center; margin-bottom: 25px; font-size: 1.8em;">اختر قسم المسابقة</h3>' +
            '<div id="solo-categories-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding-right: 5px;">' +
                getCard('📖', 'القرآن الكريم', 'var(--button-blue)', "showQuranOptions('solo')", 'مسابقة في أجزاء القرآن أو القرآن كاملاً') +
                getCard('🕌', 'السيرة النبوية', '#f6e05e', "startSingleQuiz('seerah', 'solo')") +
                getCard('⚖️', 'الفقه الإسلامي', '#f6ad55', "startSingleQuiz('fiqh', 'solo')") +
                getCard('🎈', 'مسابقة الأطفال', '#fc8181', "startSingleQuiz('kids', 'solo')") +
                getCard('💡', 'معلومات قرآنية', '#68d391', "startSingleQuiz('general', 'solo')") +
                getCard('🔤', 'معاني الكلمات', '#b794f4', "startSingleQuiz('meanings', 'solo')") +
            '</div>' +
            juzOptionsHtml('solo') +
        '</div>' +
    '</div>';

// Replace modals
html = html.replace(/<!-- Multiplayer Modal -->[\s\S]*?<!-- Admin Settings Gear -->/, newMultiModal + '\n' + newSoloModal + '\n    <script type="module" src="multiplayer.js"></script>\n\n    <!-- Admin Settings Gear -->');

html = html.replace(/\\\'/g, "'");

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patched Modals & Long Press");
