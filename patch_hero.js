const fs = require('fs');

// 1. Update quiz.html
let quizHtml = fs.readFileSync('quiz.html', 'utf8');

const heroTrackHtml = `
    <!-- Superhero Track for Kids -->
    <div id="kids-hero-track" style="display: none; width: 100%; height: 45px; background: rgba(0,0,0,0.3); border-radius: 25px; margin-bottom: 25px; position: relative; overflow: visible; border: 2px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 15px rgba(0,0,0,0.5);">
        <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); font-size: 2.2em; z-index: 3; filter: drop-shadow(0 0 8px gold);">🕌</div>
        <div id="kids-hero-progress" style="position: absolute; right: 0; top: 0; height: 100%; width: 0%; border-radius: 25px; background: linear-gradient(-90deg, #10b981 0%, #34d399 100%); transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 1;">
            <div id="kids-hero" style="position: absolute; left: 0; top: 50%; transform: translate(-30%, -50%); width: 55px; height: 55px; z-index: 4; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); transition: transform 0.2s;">
                <img src="assets/hulkman.png" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
        </div>
    </div>
    <div id="quiz-header">`;

quizHtml = quizHtml.replace('<div id="quiz-header">', heroTrackHtml);
fs.writeFileSync('quiz.html', quizHtml, 'utf8');
console.log("Patched quiz.html");

// 2. Update script.js
let scriptJs = fs.readFileSync('script.js', 'utf8');

const heroLogic = `
let heroPosition = 0;
let quizType = localStorage.getItem("quizType") || "mixed";
`;

scriptJs = scriptJs.replace(/let quizType = localStorage\.getItem\("quizType"\) \|\| "mixed";/, heroLogic);

const displayLogic = `
    if (quizType === 'kids') {
        const track = document.getElementById('kids-hero-track');
        if(track) track.style.display = 'block';
    }
    
    types.forEach(type => {
`;
scriptJs = scriptJs.replace(/types\.forEach\(type => \{/, displayLogic);

// Add handleAnswer logic
const answerLogic = `
function handleAnswer(button, correctAnswer) {
  const buttons = document.querySelectorAll(".option");
  clearInterval(questionTimerInterval);
  if (questionProgressBar) questionProgressBar.classList.remove('blinking');

  // Superhero Logic for Kids
  if (quizType === "kids") {
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
`;

scriptJs = scriptJs.replace(/function handleAnswer\(button, correctAnswer\) {[\s\S]*?buttons\.forEach\(btn => {/, answerLogic);

fs.writeFileSync('script.js', scriptJs, 'utf8');
console.log("Patched script.js");
