const fs = require('fs');

const islamicQuestions = [
    { q: "من هو الصحابي الذي لُقب بسيف الله المسلول؟", c: ["خالد بن الوليد", "علي بن أبي طالب", "عمر بن الخطاب", "حمزة بن عبد المطلب"], a: "خالد بن الوليد" },
    { q: "في أي مدينة ولد النبي محمد ﷺ؟", c: ["مكة المكرمة", "المدينة المنورة", "الطائف", "القدس"], a: "مكة المكرمة" },
    { q: "ما هي أطول سورة في القرآن الكريم؟", c: ["سورة البقرة", "سورة آل عمران", "سورة النساء", "سورة الكهف"], a: "سورة البقرة" },
    { q: "من هي أول امرأة أسلمت؟", c: ["خديجة بنت خويلد", "عائشة بنت أبي بكر", "فاطمة الزهراء", "أسماء بنت أبي بكر"], a: "خديجة بنت خويلد" },
    { q: "كم عدد أجزاء القرآن الكريم؟", c: ["30 جزءاً", "114 جزءاً", "60 جزءاً", "20 جزءاً"], a: "30 جزءاً" },
    { q: "ما هي أول سورة نزلت من القرآن الكريم؟", c: ["سورة العلق", "سورة الفاتحة", "سورة المدثر", "سورة البقرة"], a: "سورة العلق" },
    { q: "من هو النبي الذي ابتلعه الحوت؟", c: ["يونس عليه السلام", "موسى عليه السلام", "نوح عليه السلام", "عيسى عليه السلام"], a: "يونس عليه السلام" },
    { q: "كم عدد الصلوات المفروضة في اليوم والليلة؟", c: ["5 صلوات", "3 صلوات", "4 صلوات", "6 صلوات"], a: "5 صلوات" },
    { q: "من هو الخليفة الأول للمسلمين بعد وفاة النبي ﷺ؟", c: ["أبو بكر الصديق", "عمر بن الخطاب", "عثمان بن عفان", "علي بن أبي طالب"], a: "أبو بكر الصديق" },
    { q: "ما هي القبلة الأولى للمسلمين؟", c: ["المسجد الأقصى", "المسجد الحرام", "المسجد النبوي", "مسجد قباء"], a: "المسجد الأقصى" },
    { q: "من هو النبي الذي أمره الله ببناء الكعبة؟", c: ["إبراهيم عليه السلام", "محمد ﷺ", "إسماعيل عليه السلام", "آدم عليه السلام"], a: "إبراهيم عليه السلام" },
    { q: "ما هو الشهر الذي يصوم فيه المسلمون؟", c: ["رمضان", "شوال", "رجب", "شعبان"], a: "رمضان" },
    { q: "من هو مؤذن الرسول ﷺ؟", c: ["بلال بن رباح", "عمار بن ياسر", "سلمان الفارسي", "صهيب الرومي"], a: "بلال بن رباح" },
    { q: "في أي غار كان يتعبد الرسول ﷺ قبل البعثة؟", c: ["غار حراء", "غار ثور", "غار الأنبياء", "غار الطائف"], a: "غار حراء" },
    { q: "من الذي كفل الرسول ﷺ بعد وفاة أمه؟", c: ["جده عبد المطلب", "عمه أبو طالب", "أبو لهب", "أبو جهل"], a: "جده عبد المطلب" },
    { q: "ما هي السورة التي تسمى عروس القرآن؟", c: ["سورة الرحمن", "سورة يس", "سورة الواقعة", "سورة تبارك"], a: "سورة الرحمن" },
    { q: "كم عدد أركان الإسلام؟", c: ["5 أركان", "6 أركان", "4 أركان", "7 أركان"], a: "5 أركان" },
    { q: "كم عدد أركان الإيمان؟", c: ["6 أركان", "5 أركان", "4 أركان", "7 أركان"], a: "6 أركان" },
    { q: "من هو النبي الذي كان يفهم لغة الحيوانات؟", c: ["سليمان عليه السلام", "داود عليه السلام", "يوسف عليه السلام", "أيوب عليه السلام"], a: "سليمان عليه السلام" },
    { q: "أين يوجد المسجد الأقصى؟", c: ["فلسطين", "السعودية", "مصر", "سوريا"], a: "فلسطين" }
];

let kids2 = [];

// Add Islamic Questions
for(let item of islamicQuestions) {
    kids2.push({
        question: item.q,
        choice1: item.c[0], choice2: item.c[1], choice3: item.c[2], choice4: item.c[3],
        correct_answer: item.a,
        explanation: "إجابة صحيحة!",
        type: "إسلاميات (مستوى 2)"
    });
}

// Generate Math Questions (2-digit)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

for(let i=0; i<150; i++) {
    let a = Math.floor(Math.random() * 90) + 10; // 10-99
    let b = Math.floor(Math.random() * 90) + 10;
    let sum = a + b;
    let choices = shuffle([sum, sum + Math.floor(Math.random()*10)+1, sum - (Math.floor(Math.random()*10)+1), sum + 10]);
    kids2.push({
        question: `${a} + ${b} = ?`,
        choice1: choices[0].toString(), choice2: choices[1].toString(), choice3: choices[2].toString(), choice4: choices[3].toString(),
        correct_answer: sum.toString(),
        explanation: `${a} + ${b} = ${sum}`,
        type: 'رياضيات (مستوى 2)'
    });
}

for(let i=0; i<150; i++) {
    let a = Math.floor(Math.random() * 90) + 10;
    let b = Math.floor(Math.random() * 90) + 10;
    if (a < b) { let temp = a; a = b; b = temp; }
    let diff = a - b;
    let choices = shuffle([diff, diff + Math.floor(Math.random()*5)+1, Math.abs(diff - (Math.floor(Math.random()*5)+1)), diff + 10]);
    kids2.push({
        question: `${a} - ${b} = ?`,
        choice1: choices[0].toString(), choice2: choices[1].toString(), choice3: choices[2].toString(), choice4: choices[3].toString(),
        correct_answer: diff.toString(),
        explanation: `${a} - ${b} = ${diff}`,
        type: 'رياضيات (مستوى 2)'
    });
}

let data = JSON.parse(fs.readFileSync('quran.json', 'utf8'));

// Rename current kids to kids_1 if not already done
if(data.kids) {
    data.kids_1 = data.kids;
    delete data.kids;
}

// Set kids_2
data.kids_2 = kids2;

fs.writeFileSync('quran.json', JSON.stringify(data, null, 2), 'utf8');
console.log("Created kids_1 (Level 1) and kids_2 (Level 2) in quran.json");
