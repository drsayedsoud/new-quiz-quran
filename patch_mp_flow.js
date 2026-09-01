const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace all startSingleQuiz(..., 'multi') with showMultiSettings(...)
html = html.replace(/startSingleQuiz\('([^']+)', 'multi'\)/g, "showMultiSettings('$1')");
html = html.replace(/startSingleQuiz\('([^']+)', 'multi', 'all'\)/g, "showMultiSettings('$1')");

// Also handle startJuzQuiz('multi')
// Let's replace the inline onclick for Juz
html = html.replace(/onclick="startJuzQuiz\('multi'\)"/g, "onclick=\"let juz=document.getElementById('multi-juz-select').value; if(!juz){alert('الرجاء اختيار الجزء');return;} showMultiSettings('mixed_juz_' + juz)\"");

// Add the settings HTML right after the multi-kids-options
const settingsHtml = `
  <div id="multi-settings-options" style="display: none; flex-direction: column; gap: 15px; margin-top: 5px;">
      <h3 style="color: white; margin: 0; text-align: center; font-size: 1.3em;">إعدادات الغرفة</h3>
      
      <div style="display: flex; gap: 10px; justify-content: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 12px;">
          <button id="btn-mode-questions" onclick="setMultiMode('questions')" style="flex: 1; padding: 10px; border-radius: 8px; border: none; background: var(--button-green); color: white; font-weight: bold; cursor: pointer; transition: 0.2s;">عدد الأسئلة</button>
          <button id="btn-mode-time" onclick="setMultiMode('time')" style="flex: 1; padding: 10px; border-radius: 8px; border: none; background: transparent; color: #a0aec0; font-weight: bold; cursor: pointer; transition: 0.2s;">وقت محدد</button>
      </div>

      <!-- Questions Selection -->
      <div id="multi-settings-questions" style="display: flex; flex-direction: column; gap: 5px;">
          <label style="color: #a0aec0; font-size: 0.9em;">اختر عدد الأسئلة:</label>
          <select id="multi-qcount-val" style="padding: 12px; border-radius: 10px; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); font-size: 1.1em; outline: none;">
              <option value="5">5 أسئلة</option>
              <option value="10" selected>10 أسئلة</option>
              <option value="20">20 سؤال</option>
              <option value="30">30 سؤال</option>
              <option value="50">50 سؤال</option>
          </select>
      </div>

      <!-- Time Selection -->
      <div id="multi-settings-time" style="display: none; flex-direction: column; gap: 5px;">
          <label style="color: #a0aec0; font-size: 0.9em;">اختر مدة التحدي (بالدقائق):</label>
          <select id="multi-time-val" style="padding: 12px; border-radius: 10px; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); font-size: 1.1em; outline: none;">
              <option value="1">دقيقة واحدة</option>
              <option value="2">دقيقتان</option>
              <option value="3" selected>3 دقائق</option>
              <option value="5">5 دقائق</option>
          </select>
      </div>

      <button onclick="confirmMultiplayerRoom()" style="background: var(--button-blue); color: white; padding: 15px; border-radius: 12px; border: none; font-weight: bold; font-size: 1.1em; cursor: pointer; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); margin-top: 10px;">🚀 إنشاء الغرفة الآن</button>
      
      <button onclick="hideMultiSettings()" style="background: transparent; color: #a0aec0; border: none; cursor: pointer; margin-top: 5px; font-size: 0.9em; padding: 8px;">🔙 رجوع لاختيار القسم</button>
  </div>
`;

// Remove the old mp-questions-count from wherever it is in multi-modal
html = html.replace(/<div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 15px; background: rgba\(0,0,0,0\.3\); padding: 10px; border-radius: 10px; border: 1px solid rgba\(255,255,255,0\.1\);">[\s\S]*?<\/select>\s*<\/div>/, "");

// Add settingsHtml after multi-kids-options
html = html.replace(/(<div id="multi-kids-options"[^>]*>[\s\S]*?<\/div>)/, "$1\n" + settingsHtml);

// Inject JS functions
const jsLogic = `
<script>
let tempMultiCategory = '';
let currentMultiMode = 'questions';

function showMultiSettings(category) {
    tempMultiCategory = category;
    document.getElementById('multi-categories-list').style.display = 'none';
    document.getElementById('multi-quran-options').style.display = 'none';
    document.getElementById('multi-kids-options').style.display = 'none';
    document.getElementById('multi-settings-options').style.display = 'flex';
}

function hideMultiSettings() {
    document.getElementById('multi-settings-options').style.display = 'none';
    document.getElementById('multi-categories-list').style.display = 'flex';
}

function setMultiMode(mode) {
    currentMultiMode = mode;
    const btnQ = document.getElementById('btn-mode-questions');
    const btnT = document.getElementById('btn-mode-time');
    const secQ = document.getElementById('multi-settings-questions');
    const secT = document.getElementById('multi-settings-time');
    
    if (mode === 'questions') {
        btnQ.style.background = 'var(--button-green)';
        btnQ.style.color = 'white';
        btnT.style.background = 'transparent';
        btnT.style.color = '#a0aec0';
        secQ.style.display = 'flex';
        secT.style.display = 'none';
    } else {
        btnT.style.background = 'var(--button-blue)';
        btnT.style.color = 'white';
        btnQ.style.background = 'transparent';
        btnQ.style.color = '#a0aec0';
        secT.style.display = 'flex';
        secQ.style.display = 'none';
    }
}

function confirmMultiplayerRoom() {
    if (typeof createMultiplayerRoomWithParams !== 'undefined') {
        let val;
        if (currentMultiMode === 'questions') {
            val = parseInt(document.getElementById('multi-qcount-val').value) || 10;
        } else {
            val = parseInt(document.getElementById('multi-time-val').value) || 3;
        }
        createMultiplayerRoomWithParams(tempMultiCategory, currentMultiMode, val);
    }
}
</script>
`;

html = html.replace('</body>', jsLogic + '\n</body>');

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patched index.html for new MP flow");
