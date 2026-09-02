
window.showBalloonFestival = function() {
    let container = document.getElementById("balloon-festival");
    if (!container) {
        container = document.createElement('div');
        container.id = "balloon-festival";
        container.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; overflow: hidden;";
        document.body.appendChild(container);

        // Inject balloon CSS if not present
        if (!document.getElementById('balloon-styles')) {
            const style = document.createElement('style');
            style.id = 'balloon-styles';
            style.innerHTML = `
                .kid-balloon {
                    position: absolute;
                    bottom: -100px;
                    width: 40px;
                    height: 60px;
                    border-radius: 50% 50% 40% 40%;
                    animation: floatUp 4s ease-out forwards;
                    z-index: 9999;
                    box-shadow: inset -5px -5px 10px rgba(0,0,0,0.2);
                }
                .kid-balloon::before {
                    content: '';
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 2px;
                    height: 50px;
                    background: rgba(255,255,255,0.5);
                }
                @keyframes floatUp {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    container.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const balloon = document.createElement("div");
        balloon.className = "kid-balloon";
        balloon.style.left = Math.random() * 100 + "vw";
        balloon.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 65%)`;
        balloon.style.animationDelay = `${Math.random() * 0.5}s`;
        balloon.style.animationDuration = `${3 + Math.random() * 2}s`;
        container.appendChild(balloon);
    }
};

// ====== بداية كود script.js الكامل مع زر كتم الصوت ======

let quizData = [];

let currentIndex = 0;



let heroPosition = 0;
let streak = 0;
let bestStreak = 0;
let wrongAnswers = [];
let answeredCount = 0;

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

function showStreakToast(count) {
  let el = document.getElementById('streak-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'streak-toast';
    el.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%) scale(0.8);background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:900;font-family:Cairo,sans-serif;padding:10px 22px;border-radius:999px;box-shadow:0 8px 20px rgba(239,68,68,0.4);z-index:9000;opacity:0;transition:all 0.25s;pointer-events:none;font-size:1.05em;';
    document.body.appendChild(el);
  }
  el.textContent = '🔥 ' + count + ' إجابات صحيحة متتالية!';
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) scale(1)';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) scale(0.8)'; }, 1600);
}
let quizType = localStorage.getItem("quizType") || "mixed";


// Handle multiplayer juz selection embedded in quizType
if (quizType.includes('_juz_')) {
    const parts = quizType.split('_juz_');
    quizType = parts[0];
    localStorage.setItem('selectedJuz', parts[1]);
}


let selectedSura = localStorage.getItem("selectedSura") || null;

let selectedJuz = localStorage.getItem("selectedJuz") || null;

let totalTime = 600;

let questionTime = 30; // مدة السؤال الواحدة

let totalTimerInterval;

let questionTimerInterval;

let correctCount = 0;

// متغير شريط التقدم وساعة السؤال

let questionProgressBar;

let questionTimeLeft = questionTime;

// حالة الصوت (مفعّل أو مكتوم)

let soundEnabled = localStorage.getItem("soundOn");

if (soundEnabled === null) {

  soundEnabled = true; // القيمة الافتراضية صوت شغال

} else {

  soundEnabled = (soundEnabled === "true");

}



// الأصوات
// الأصوات
let winSound;
try {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("child.html")) {
    winSound = new Audio("assets/wow.mp3");
  } else {
    winSound = new Audio("assets/win.mp3");
  }
} catch (e) {
  winSound = new Audio("assets/win.mp3"); // fallback
}
const loseSound = new Audio("assets/lose.mp3");

// دالة لتشغيل الصوت فقط إذا كانت مفعلة

function playSound(sound) {

  if (soundEnabled) {

    sound.currentTime = 0;

    sound.play().catch(() => {});

  }

}



// دالة إنشاء زر كتم الصوت أسفل شريط التقدم

function createMuteButton() {

  const container = document.querySelector(".progress-bar-container-3d");

  if (!container) return;

  // تأكد من عدم إضافة الزر مرتين

  if (document.getElementById("mute-sound-btn")) return;

  const btn = document.createElement("button");

  btn.id = "mute-sound-btn";

  btn.textContent = soundEnabled ? "🔊" : "🔇";

  btn.title = "تشغيل / إيقاف الصوت";

  btn.style.cssText = `

    margin-top: 10px;

    font-size: 24px;

    background: none;

    border: none;

    color: white;

    cursor: pointer;

    display: block;

    margin-left: auto;

    margin-right: auto;

  `;

  btn.onclick = () => {

    soundEnabled = !soundEnabled;

    localStorage.setItem("soundOn", soundEnabled);

    btn.textContent = soundEnabled ? "🔊" : "🔇";

  };

  container.parentElement.appendChild(btn);

}





window.onload = function () {

  checkIndexedDB();

  startTotalTimer();

  loadQuestions();

  questionProgressBar = document.getElementById('question-progress-bar');

  updateProgressBar3D(questionTime);

  createMuteButton();

};



// IndexedDB إعدادات

const dbName = 'QuranDB';

const storeName = 'quranData';

const dataKey = 'quranJSON';

let db;



function openDatabase() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {

      db = event.target.result;

      if (!db.objectStoreNames.contains(storeName)) {

        db.createObjectStore(storeName);

      }

    };

    request.onsuccess = (event) => {

      db = event.target.result;

      resolve(db);

    };

    request.onerror = (event) => {

      reject('خطأ في فتح قاعدة البيانات: ' + event.target.errorCode);

    };

  });

}



async function loadQuestionsFromIndexedDB() {

  return new Promise(async (resolve, reject) => {

    try {

      db = await openDatabase();

      const transaction = db.transaction([storeName], 'readonly');

      const objectStore = transaction.objectStore(storeName);

      const request = objectStore.get(dataKey);



      request.onsuccess = async (event) => {

        const blob = event.target.result;

        if (!blob) {

          return resolve(null);

        }



        try {

          let jsonData;

          if (blob instanceof Blob) {

            const arrayBuffer = await blob.arrayBuffer();

            jsonData = JSON.parse(new TextDecoder().decode(arrayBuffer));

          } else {

            jsonData = blob;

          }

          resolve(jsonData);

        } catch (err) {

          reject(err);

        }

      };



      request.onerror = (event) => {

        reject(event.target.error);

      };



    } catch (error) {

      reject(error);

    }

  });

}



async function loadQuestions() {
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden");
      loadingOverlay.innerHTML = "<div style='font-size:1.5em;'>جاري التجهيز...</div>";
  }

  try {
    let data = await loadQuestionsFromIndexedDB();
    
    if (!data || !Array.isArray(data.kids_1) || data.kids_1.length === 0) { console.log("Outdated DB, forcing refetch");
        console.log("Not in IndexedDB, fetching from server...");
        if (loadingOverlay) loadingOverlay.innerHTML = "<div style='font-size:1.5em; text-align:center;'>جاري تنزيل الأسئلة (لأول مرة فقط)...<br>يرجى الانتظار قليلاً (حوالي 45 ميجابايت)</div>";
        
        const response = await fetch('./quran.zip');
        if (!response.ok) throw new Error("Could not fetch quran.zip from server");
        data = await readJsonWithProgress(response, (pct, mb) => {
            if (!loadingOverlay) return;
            const bar = pct === null ? '' : '<div style="width:100%;height:14px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden;margin:14px 0 8px;"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#10b981,#34d399);transition:width 0.3s;"></div></div>';
            loadingOverlay.innerHTML = '<div style="text-align:center;max-width:320px;padding:0 16px;">' +
                '<div style="font-size:1.3em;font-weight:800;">⬇️ جاري تنزيل الأسئلة (لأول مرة فقط)</div>' + bar +
                '<div style="font-size:0.95em;color:#cbd5e0;">' + (pct === null ? '' : pct + '% · ') + mb + ' ميجابايت</div>' +
                '<div style="font-size:0.8em;color:#a0aec0;margin-top:8px;">تُحفظ الأسئلة على جهازك ولن تُنزَّل مرة أخرى</div></div>';
        });
        
        try {
           if (loadingOverlay) loadingOverlay.innerHTML = "<div style='font-size:1.5em;'>جاري حفظ الأسئلة في جهازك...</div>";
           const db = await openDatabase();
           const tx = db.transaction([storeName], 'readwrite');
           tx.objectStore(storeName).put(data, dataKey);
        } catch(e) { console.error("Could not save to IndexedDB", e); }
    }
    
    if (data) {
      if (loadingOverlay) loadingOverlay.innerHTML = "<div style='font-size:1.5em;'>جاري تهيئة المسابقة...</div>";
      processParsedJSON(data);
    } else {
      alert("تعذر تحميل الأسئلة. يرجى التأكد من اتصالك بالإنترنت.");
    }
  } catch (err) {
    console.error(err);
    if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden");
      loadingOverlay.innerHTML = '<div style="text-align:center;max-width:320px;padding:0 16px;">' +
        '<div style="font-size:2.5em;">📡</div><div style="font-size:1.2em;font-weight:800;margin:6px 0;">تعذر تحميل الأسئلة</div>' +
        '<div style="font-size:0.9em;color:#cbd5e0;">تأكد من اتصالك بالإنترنت ثم أعد المحاولة</div>' +
        '<button onclick="location.reload()" style="margin-top:16px;padding:12px 26px;border:none;border-radius:999px;background:#10b981;color:#fff;font-weight:800;font-family:inherit;font-size:1em;cursor:pointer;">🔄 إعادة المحاولة</button>' +
        '<br><button onclick="location.href=\'index.html\'" style="margin-top:10px;background:transparent;border:none;color:#a0aec0;font-family:inherit;cursor:pointer;">الرئيسية</button></div>';
    } else {
      alert("خطأ في قراءة البيانات: " + err.message);
    }
  }
}

// Reads a JSON body chunk by chunk so the first-time download can show real progress
async function readJsonWithProgress(response, onProgress) {
  if (!response.body || !response.body.getReader) return response.json();
  const total = parseInt(response.headers.get('Content-Length')) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0, lastTick = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (Date.now() - lastTick > 150) {
      lastTick = Date.now();
      onProgress(total ? Math.min(99, Math.round(received / total * 100)) : null, (received / 1048576).toFixed(1));
    }
  }
  onProgress(100, (received / 1048576).toFixed(1));
  const all = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) { all.set(c, offset); offset += c.length; }
      if (onProgress) onProgress(100, (received / 1048576).toFixed(1) + " (فك الضغط...)");
    try {
        const zip = await JSZip.loadAsync(all);
        const jsonText = await zip.file("quran.json").async("string");
        return JSON.parse(jsonText);
    } catch (e) {
        // Fallback in case it's actually just plain json (for some reason)
        return JSON.parse(new TextDecoder().decode(all));
    }
}

// Strips numbering artefacts such as "Q(462): " from imported questions
function cleanQuestionText(text) {
  return String(text || '').replace(/^\s*Q\s*\(\s*\d+\s*\)\s*[:：\-]?\s*/i, '').replace(/^\s*س\s*\d+\s*[:：\-]\s*/, '').trim();
}

// Daily challenge: same 10 questions for everyone on a given day
function dailyQuestions(jsonData) {
  const pool = [].concat(jsonData.sera || [], jsonData.sona || [], jsonData.general || []);
  const dayKey = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < dayKey.length; i++) seed = (seed * 31 + dayKey.charCodeAt(i)) % 233280;
  const picked = [];
  const used = new Set();
  while (picked.length < 10 && used.size < pool.length) {
    seed = (seed * 9301 + 49297) % 233280;
    const idx = Math.floor(seed / 233280 * pool.length);
    if (!used.has(idx)) { used.add(idx); picked.push(pool[idx]); }
  }
  return picked;
}

function recordDaily(session) {
  if (session.type !== 'daily') return;
  const dayKey = new Date().toISOString().slice(0, 10);
  let best = null;
  try { best = JSON.parse(localStorage.getItem('daily_best') || 'null'); } catch (e) {}
  if (!best || best.date !== dayKey || session.score > best.score) {
    localStorage.setItem('daily_best', JSON.stringify({ date: dayKey, score: session.score, total: session.total }));
  }
}



function processParsedJSON(jsonData) {
  let source = [];
  if (!quizType) quizType = 'mixed';
  const types = quizType.split(',').map(t => t.trim());
  
  
    if (quizType.startsWith('kids')) {
        const track = document.getElementById('kids-hero-track');
        if(track) track.style.display = 'block';
    }
    
    types.forEach(type => {

      if (type === "seerah" && jsonData.sera) source = source.concat(jsonData.sera);
      else if (type === "fiqh" && jsonData.sona) source = source.concat(jsonData.sona);
      else if (type === "mixed" && jsonData.quiz) source = source.concat(jsonData.quiz);
      else if (type === "meanings" && jsonData.words) source = source.concat(jsonData.words);
      else if (type === "kids" && jsonData.kids) source = source.concat(jsonData.kids);
      else if (type === "general" && jsonData.general) source = source.concat(jsonData.general);
      else if (type === "daily") source = source.concat(dailyQuestions(jsonData));
      else if (Array.isArray(jsonData[type])) source = source.concat(jsonData[type]);
      else if (jsonData.quiz) {
          const filtered = jsonData.quiz.filter(q => q.type === type);
          if (filtered) source = source.concat(filtered);
      }
  });



  if (!source || source.length === 0) {

    alert("لا توجد بيانات متاحة لهذا النوع من المسابقة.");

    document.getElementById("loading-overlay").classList.add("hidden");

    return;

  }



  let filteredSource = source.filter(q =>

    q &&

    typeof q.question === 'string' && q.question.trim() !== '' &&

    typeof q.correct_answer === 'string' && q.correct_answer.trim() !== '' &&

    typeof q.choice1 === 'string' &&

    typeof q.choice2 === 'string' &&

    typeof q.choice3 === 'string' &&

    typeof q.choice4 === 'string' &&

    q.choice1.trim() !== '' &&

    q.choice2.trim() !== '' &&

    q.choice3.trim() !== '' &&

    q.choice4.trim() !== ''

  );



  if (selectedSura) {

    filteredSource = filteredSource.filter(q => q.sura_info === selectedSura);

  } else if (selectedJuz) {

    filteredSource = filteredSource.filter(q => String(q.juz_number).replace(".0", "") === selectedJuz);

  }



  quizData = shuffle(filteredSource);
    
    // MP LOGIC PATCH
    const isMp = localStorage.getItem('mp_roomCode');
    if (isMp) {
        const mpMode = localStorage.getItem('mp_mode') || 'questions';
        const mpVal = parseInt(localStorage.getItem('mp_val')) || 10;
        
        const mpQTime = parseInt(localStorage.getItem('mp_qtime'));
        if (mpQTime >= 5 && mpQTime <= 180) { questionTime = mpQTime; questionTimeLeft = questionTime; }
        if (mpMode === 'questions') {
            quizData = quizData.slice(0, mpVal);
        } else if (mpMode === 'time') {
            // Time mode: they can answer as many as they want, time is limited
            totalTime = mpVal * 60; // mpVal is in minutes
        }
    } else {
        // For solo, let's just cap it at 20 to prevent infinite games, unless it's a specific Juz maybe?
        // Actually, we'll leave it as is or cap to 30.
        if (quizType === 'daily') quizData = quizData.slice(0, 10);
        if (quizData.length > 50) {
            quizData = quizData.slice(0, 50); // Cap solo games to 50 max
        }
    }




  if (!quizData || quizData.length === 0) {

    alert("لا توجد أسئلة متاحة بعد التصفية النهائية.");

    document.getElementById("loading-overlay").classList.add("hidden");

    return;

  }



  document.getElementById("loading-overlay").classList.add("hidden");

  displayQuestion();

}



let mpSeed = null;
function getRandom() {
    if (localStorage.getItem('mp_roomCode')) {
        if (mpSeed === null) {
            const code = localStorage.getItem('mp_roomCode');
            mpSeed = 0;
            for (let i = 0; i < code.length; i++) {
                mpSeed += code.charCodeAt(i) * (i + 1);
            }
        }
        mpSeed = (mpSeed * 9301 + 49297) % 233280;
        return mpSeed / 233280;
    }
    return Math.random();
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(getRandom() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}



function finishQuiz() {
  clearInterval(totalTimerInterval);
  clearInterval(questionTimerInterval);
  const email = localStorage.getItem("userEmail") || "غير معروف";
  const session = {
    date: new Date().toLocaleString("ar-EG"),
    email: email,
    score: correctCount,
    total: Math.max(answeredCount, currentIndex),
    type: quizType,
    wrong: wrongAnswers.slice(0, 60),
    bestStreak: bestStreak,
    title: localStorage.getItem("quizTitle") || ""
  };
  let sessions = JSON.parse(localStorage.getItem("userSessions") || "[]");
  sessions.push(session);
  localStorage.setItem("userSessions", JSON.stringify(sessions));
  recordDaily(session);
  window.location.href = "finish.html";
}

function startTotalTimer() {

  updateTotalTimerDisplay();

  totalTimerInterval = setInterval(() => {

    totalTime--;

    updateTotalTimerDisplay();

    if (totalTime <= 0) {

      clearInterval(totalTimerInterval);

      clearInterval(questionTimerInterval);

      if (questionProgressBar) {

        questionProgressBar.classList.remove('blinking');

        questionProgressBar.style.width = '0%';

        questionProgressBar.style.background = '#dc3545';

      }

      finishQuiz();

    }

  }, 1000);

}



function updateTotalTimerDisplay() {

  const min = Math.floor(totalTime / 60).toString().padStart(2, "0");

  const sec = (totalTime % 60).toString().padStart(2, "0");

  const totalTimerElement = document.getElementById("total-timer");

  if (totalTimerElement) {

    totalTimerElement.textContent = `${min}:${sec}`;

  }

}



// تحديث شريط التقدم 3D

function updateProgressBar3D(timeRemaining) {

  if (!questionProgressBar) return;



  const percentage = (timeRemaining / questionTime) * 100;

  questionProgressBar.style.width = `${percentage}%`;



  const hue = (percentage / 100) * 120;

  questionProgressBar.style.background = `hsl(${hue}, 70%, 50%)`;



  if (timeRemaining <= 10 && timeRemaining > 0) {

    questionProgressBar.classList.add('blinking');

    questionProgressBar.style.background = '#dc3545';

  } else {

    questionProgressBar.classList.remove('blinking');

  }

}



function displayQuestion() {

  if (currentIndex >= quizData.length) {

    clearInterval(totalTimerInterval);

    clearInterval(questionTimerInterval);

    if (questionProgressBar) {

      questionProgressBar.classList.remove('blinking');

      questionProgressBar.style.width = '0%';

      questionProgressBar.style.background = '#dc3545';

    }

    const email = localStorage.getItem("userEmail") || "غير معروف";

    const session = {

      date: new Date().toLocaleString("ar-EG"),

      email: email,

      score: correctCount,

      total: Math.max(answeredCount, currentIndex),

      type: quizType,

      wrong: wrongAnswers.slice(0, 60),

      bestStreak: bestStreak,

      title: localStorage.getItem("quizTitle") || ""

    };

    let sessions = JSON.parse(localStorage.getItem("userSessions") || "[]");

    sessions.push(session);

    localStorage.setItem("userSessions", JSON.stringify(sessions));
  recordDaily(session);

    window.location.href = "finish.html";

    return;

  }



  const q = quizData[currentIndex];



  const questionTextElement = document.getElementById("question-text");

  if (!questionTextElement) return;



  if (q.question.includes("ما الآية التالية")) {

    const ayaText = q.question.replace("ما الآية التالية لهذه الآية؟", "").replace(/^\s*الآية\s*[:：]\s*/, "").trim();

    questionTextElement.innerHTML = `

      <div style="font-size: 14px; color: #bbb;">ما الآية التالية لهذه الآية؟</div>

      <div style="font-size: 28px; margin-top: 10px; font-family: 'Amiri', serif; line-height: 2; color: #fff;">

        ❝ ${ayaText} ❞

      </div>

    `;

  } else {

    questionTextElement.textContent = cleanQuestionText(q.question);

  }



  const currentQuestionElement = document.getElementById("current-question");

  if (currentQuestionElement) currentQuestionElement.textContent = currentIndex + 1;



  const correctCounterElement = document.getElementById("correct-counter");

  if (correctCounterElement) correctCounterElement.textContent = correctCount;



  const options = shuffle([q.choice1, q.choice2, q.choice3, q.choice4]);

  const buttons = document.querySelectorAll(".option");



  if (buttons.length === 0) return;



  buttons.forEach((btn, i) => {

    btn.textContent = options[i];

    btn.className = "option";

    btn.disabled = false;

    btn.onclick = () => handleAnswer(btn, q.correct_answer);

  });



  const explanationBtn = document.getElementById("explanation-btn");

  if (explanationBtn) {

    explanationBtn.onclick = () => {

      alert(q.explanation || "لا يوجد تفسير متاح لهذا السؤال.");

    };

  }



  clearInterval(questionTimerInterval);

  questionTimeLeft = questionTime;

  const questionTimerElement = document.getElementById("question-timer");

  if (questionTimerElement) questionTimerElement.textContent = questionTimeLeft;

  updateProgressBar3D(questionTimeLeft);



  questionTimerInterval = setInterval(() => {

    questionTimeLeft--;

    if (questionTimerElement) questionTimerElement.textContent = questionTimeLeft;

    updateProgressBar3D(questionTimeLeft);



    if (questionTimeLeft <= 0) {

      clearInterval(questionTimerInterval);

      currentIndex++;

      displayQuestion();

    }

  }, 1000);

}




function handleAnswer(button, correctAnswer) {
  const buttons = document.querySelectorAll(".option");
  clearInterval(questionTimerInterval);
  if (questionProgressBar) questionProgressBar.classList.remove('blinking');

  // Superhero Logic for Kids
  if (quizType.startsWith('kids')) {
      const heroProgress = document.getElementById('kids-hero-progress');
      if (heroProgress) {
          if (button.textContent === correctAnswer) {
              heroPosition += 10;
              if (heroPosition > 90) {
                  heroPosition = 90;
                  // Reset after a celebration delay
                  setTimeout(() => {
                      heroPosition = 0;
                      heroProgress.style.width = heroPosition + '%';
                  }, 2500);
              }
          } else {
              heroPosition -= 10;
              if (heroPosition < 0) heroPosition = 0;
          }
          heroProgress.style.width = heroPosition + '%';
      }
  }

  buttons.forEach(btn => {


    btn.disabled = true;

    if (btn.textContent === correctAnswer) {

      btn.classList.add("correct");

    } else if (btn === button) {

      btn.classList.add("wrong");

    }

  });



if (button.textContent === correctAnswer) {
    if (quizType.startsWith('kids')) {
        if (window.KidsTheme) {
            KidsTheme.correct(button);
        } else {
            let wowSound = new Audio('assets/wow.mp3');
            wowSound.play().catch(e => console.log('Audio error:', e));
            if (typeof showBalloonFestival === "function") showBalloonFestival();
        }
    } else {
        playSound(winSound);
    }

  answeredCount++;
  correctCount++;
  streak++;
  if (streak > bestStreak) bestStreak = streak;
  if (streak >= 3) showStreakToast(streak);
  vibrate(40);
  const correctCounterElement = document.getElementById("correct-counter");
  if (correctCounterElement) correctCounterElement.textContent = correctCount;
} else {
  answeredCount++;
  streak = 0;
  vibrate([60, 40, 60]);
  const currentQ = quizData[currentIndex] || {};
  wrongAnswers.push({
    question: cleanQuestionText(currentQ.question),
    chosen: button ? button.textContent : '',
    correct: String(correctAnswer),
    explanation: currentQ.explanation ? String(currentQ.explanation) : ''
  });
  if (quizType.startsWith('kids') && window.KidsTheme) KidsTheme.wrong(button);
  else playSound(loseSound);
}



  setTimeout(() => {

    currentIndex++;

    displayQuestion();

  }, 3000);

}



async function checkIndexedDB() {

  try {

    db = await openDatabase();

    const transaction = db.transaction([storeName], 'readonly');

    const objectStore = transaction.objectStore(storeName);

    const request = objectStore.get(dataKey);

    request.onsuccess = (event) => {

      if (event.target.result) {

        // ملف موجود

      } else {

        // ملف غير موجود

      }

    };

    request.onerror = (event) => {

      // خطأ أثناء التحقق

    };

  } catch (e) {

    // خطأ عام أثناء التحقق

  }

}



function endQuiz() {

  clearInterval(totalTimerInterval);

  clearInterval(questionTimerInterval);

  if (questionProgressBar) {

    questionProgressBar.classList.remove('blinking');

    questionProgressBar.style.width = '0%';

    questionProgressBar.style.background = '#dc3545';

  }

  const email = localStorage.getItem("userEmail") || "غير معروف";

  const session = {

    date: new Date().toLocaleString("ar-EG"),

    email: email,

    score: correctCount,

    total: Math.max(answeredCount, currentIndex),

    type: quizType,

    wrong: wrongAnswers.slice(0, 60),

    bestStreak: bestStreak,

    title: localStorage.getItem("quizTitle") || ""

  };

  let sessions = JSON.parse(localStorage.getItem("userSessions") || "[]");

  sessions.push(session);

  localStorage.setItem("userSessions", JSON.stringify(sessions));
  recordDaily(session);

  window.location.href = "finish.html";

}

// ====== نهاية الكود ======
