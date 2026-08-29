const fs = require('fs');

let scriptJs = fs.readFileSync('script.js', 'utf8');

const oldLoadQuestions = `async function loadQuestions() {
  try {
    const indexedDBData = await loadQuestionsFromIndexedDB();
    if (indexedDBData) {
      processParsedJSON(indexedDBData);
      return;
    } else {
      alert("لا توجد بيانات أسئلة! يرجى الذهاب إلى صفحة التحديث وتحميل ملف القرآن.");
    }
  } catch (err) {
    alert("خطأ في قراءة البيانات: " + err.message);
  }
}`;

// Use regex since the arabic text might be encoded differently or have extra spaces
const regex = /async function loadQuestions\(\) \{[\s\S]*?catch \(err\) \{[\s\S]*?\}\s*\}/;

const newLoadQuestions = `async function loadQuestions() {
  try {
    let data = await loadQuestionsFromIndexedDB();
    
    if (!data) {
        // Fallback: Fetch it from server automatically!
        console.log("Not in IndexedDB, fetching from server...");
        const response = await fetch('./quran.json');
        if (!response.ok) throw new Error("Could not fetch quran.json from server");
        data = await response.json();
        
        // Save to IndexedDB so next time it's instant!
        try {
           const db = await openDatabase();
           const tx = db.transaction([storeName], 'readwrite');
           tx.objectStore(storeName).put(data, dataKey);
        } catch(e) { console.error("Could not save to IndexedDB", e); }
    }
    
    if (data) {
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
    console.log("Successfully updated loadQuestions()");
} else {
    console.log("Could not find loadQuestions() using regex. Let's try another way.");
}
