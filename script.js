// ====== بداية كود script.js الكامل مع زر كتم الصوت ======

let quizData = [];

let currentIndex = 0;

let quizType = localStorage.getItem("quizType") || "mixed";

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
    
    if (!data || !data.kids || data.kids.length === 0) { console.log("Outdated DB, forcing refetch");
        console.log("Not in IndexedDB, fetching from server...");
        if (loadingOverlay) loadingOverlay.innerHTML = "<div style='font-size:1.5em; text-align:center;'>جاري تنزيل الأسئلة (لأول مرة فقط)...<br>يرجى الانتظار قليلاً (حوالي 45 ميجابايت)</div>";
        
        const response = await fetch('./quran.json');
        if (!response.ok) throw new Error("Could not fetch quran.json from server");
        data = await response.json();
        
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
    alert("خطأ في قراءة البيانات: " + err.message);
  }
}



function processParsedJSON(jsonData) {
  let source = [];
  if (!quizType) quizType = 'mixed';
  const types = quizType.split(',').map(t => t.trim());
  
  types.forEach(type => {
      if (type === "seerah" && jsonData.sera) source = source.concat(jsonData.sera);
      else if (type === "fiqh" && jsonData.sona) source = source.concat(jsonData.sona);
      else if (type === "mixed" && jsonData.quiz) source = source.concat(jsonData.quiz);
      else if (type === "meanings" && jsonData.words) source = source.concat(jsonData.words);
      else if (type === "kids" && jsonData.kids) source = source.concat(jsonData.kids);
      else if (type === "general" && jsonData.general) source = source.concat(jsonData.general);
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

      window.location.href = "results.html";

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

      total: currentIndex,

      type: quizType

    };

    let sessions = JSON.parse(localStorage.getItem("userSessions") || "[]");

    sessions.push(session);

    localStorage.setItem("userSessions", JSON.stringify(sessions));

    window.location.href = "finish.html";

    return;

  }



  const q = quizData[currentIndex];



  const questionTextElement = document.getElementById("question-text");

  if (!questionTextElement) return;



  if (q.question.startsWith("ما الآية التالية")) {

    const ayaText = q.question.replace("ما الآية التالية لهذه الآية؟", "").trim();

    questionTextElement.innerHTML = `

      <div style="font-size: 14px; color: #bbb;">ما الآية التالية لهذه الآية؟</div>

      <div style="font-size: 28px; margin-top: 10px; font-family: 'Amiri', serif; line-height: 2; color: #fff;">

        ❝ ${ayaText} ❞

      </div>

    `;

  } else {

    questionTextElement.textContent = q.question;

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



  buttons.forEach(btn => {

    btn.disabled = true;

    if (btn.textContent === correctAnswer) {

      btn.classList.add("correct");

    } else if (btn === button) {

      btn.classList.add("wrong");

    }

  });



if (button.textContent === correctAnswer) {
  playSound(winSound);

  if (quizType === "kids" && typeof showBalloonFestival === "function") {
    showBalloonFestival();  // 🎈 استدعاء البالونات عند الفوز في الأطفال فقط
  }

  correctCount++;
  const correctCounterElement = document.getElementById("correct-counter");
  if (correctCounterElement) correctCounterElement.textContent = correctCount;
} else {
  playSound(loseSound);
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

    total: currentIndex,

    type: quizType

  };

  let sessions = JSON.parse(localStorage.getItem("userSessions") || "[]");

  sessions.push(session);

  localStorage.setItem("userSessions", JSON.stringify(sessions));

  window.location.href = "finish.html";

}

// ====== نهاية الكود ======
