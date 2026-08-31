const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace the share button
const oldShareRegex = /<div style="position: absolute; top: 15px; left: 15px; display: flex; gap: 10px; z-index: 100;">[\s\S]*?<\/button>\s*<\/div>/i;

const newShareBtn = `<div style="position: absolute; top: 15px; left: 15px; display: flex; gap: 10px; z-index: 100;">
        <button onclick="shareApp()" title="مشاركة التطبيق" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.3s ease, background 0.3s ease;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1.1)';" onmouseleave="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='scale(1)';">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        </button>
    </div>`;

html = html.replace(oldShareRegex, newShareBtn);

// 2. Replace the main cards
const oldCardsRegex = /<div class="quiz-options"[\s\S]*?<\/div>\s*<\/div>/i;

const newCards = `<div class="quiz-options" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; width: 100%; max-width: 600px; margin: 30px auto;">
    <!-- Solo Play Card -->
    <div class="card" onclick="openSoloMixModal()" onmouseenter="playHover()" style="position: relative; border-radius: 20px; padding: 30px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
        <!-- Vibrant background glow -->
        <div style="position: absolute; top: -40px; left: -40px; width: 120px; height: 120px; background: rgba(66, 153, 225, 0.5); filter: blur(50px); z-index: 0; pointer-events: none;"></div>
        
        <div style="font-size: 3.5em; margin-bottom: 15px; z-index: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">👤</div>
        <div class="card-header" style="color: #63b3ed; font-size: 1.5em; font-weight: 800; z-index: 1; margin-bottom: 8px;">لعبة فردية</div>
        <p style="color: #cbd5e0; font-size: 0.9em; line-height: 1.5; text-align: center; margin: 0; z-index: 1;">تدرب واختبر معلوماتك بنفسك في مختلف الأقسام.</p>
    </div>

    <!-- Multiplayer Card -->
    <div class="card" onclick="openMultiplayerModal()" onmouseenter="playHover()" style="position: relative; border-radius: 20px; padding: 30px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);">
        <!-- Vibrant background glow -->
        <div style="position: absolute; bottom: -40px; right: -40px; width: 120px; height: 120px; background: rgba(16, 185, 129, 0.5); filter: blur(50px); z-index: 0; pointer-events: none;"></div>

        <div style="font-size: 3.5em; margin-bottom: 15px; z-index: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">👥</div>
        <div class="card-header" style="color: #6ee7b7; font-size: 1.5em; font-weight: 800; z-index: 1; margin-bottom: 8px;">متعدد اللاعبين</div>
        <p style="color: #cbd5e0; font-size: 0.9em; line-height: 1.5; text-align: center; margin: 0; z-index: 1;">تحدى أصدقاءك في غرفة خاصة واعرف من الأفضل!</p>
    </div>
</div>`;

html = html.replace(oldCardsRegex, newCards);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Applied new UI layout for cards and share button.');
