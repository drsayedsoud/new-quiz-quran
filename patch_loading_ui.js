const fs = require('fs');

// 1. Fix quiz.html premature hiding of loading overlay
let quizHtml = fs.readFileSync('quiz.html', 'utf8');
quizHtml = quizHtml.replace('document.getElementById("loading-overlay").classList.add("hidden");', '');
fs.writeFileSync('quiz.html', quizHtml, 'utf8');

// 2. Add loading texts to script.js loadQuestions()
let scriptJs = fs.readFileSync('script.js', 'utf8');

const regex = /async function loadQuestions\(\) \{[\s\S]*?catch \(err\) \{[\s\S]*?\}\s*\}/;

const newLoadQuestions = `async function loadQuestions() {
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden");
      loadingOverlay.innerHTML = "<div style='font-size:1.5em;'>جاري التجهيز...</div>";
  }

  try {
    let data = await loadQuestionsFromIndexedDB();
    
    if (!data) {
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
}`;

if (regex.test(scriptJs)) {
    scriptJs = scriptJs.replace(regex, newLoadQuestions);
    fs.writeFileSync('script.js', scriptJs, 'utf8');
    console.log("Successfully updated loadQuestions() with better loading state.");
} else {
    console.log("Could not find loadQuestions() to patch.");
}
