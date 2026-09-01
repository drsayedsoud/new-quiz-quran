const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');

const targetStr = `if (button.textContent === correctAnswer) {
    playSound(winSound);

    if (quizType.startsWith('kids') && typeof showBalloonFestival === "function") {
      showBalloonFestival();  // ??? ??????? ????????? ??? ???? ?? ????? ??
    }`;

const newStr = `if (button.textContent === correctAnswer) {
    if (quizType.startsWith('kids')) {
        let wowSound = new Audio('assets/wow.mp3');
        wowSound.play().catch(e => console.log('Audio error:', e));
        if (typeof showBalloonFestival === "function") {
            showBalloonFestival();
        }
    } else {
        playSound(winSound);
    }`;

let index = js.indexOf("if (button.textContent === correctAnswer) {");
if(index !== -1) {
    // We will do a generic replacement of the handleAnswer body part
    let regex = /if \(button\.textContent === correctAnswer\) \{\s*playSound\(winSound\);\s*if \(quizType\.startsWith\('kids'\) && typeof showBalloonFestival === "function"\) \{\s*showBalloonFestival\(\);\s*\/\/[^\n]*\n\s*\}/;
    js = js.replace(regex, newStr);
    fs.writeFileSync('script.js', js, 'utf8');
    console.log("Successfully replaced handleAnswer win sound logic.");
}
