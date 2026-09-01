const fs = require('fs');

let js = fs.readFileSync('script.js', 'utf8');

// Inject showBalloonFestival logic globally in script.js
const balloonLogic = `
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
            style.innerHTML = \`
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
            \`;
            document.head.appendChild(style);
        }
    }
    
    container.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const balloon = document.createElement("div");
        balloon.className = "kid-balloon";
        balloon.style.left = Math.random() * 100 + "vw";
        balloon.style.backgroundColor = \`hsl(\${Math.random() * 360}, 100%, 65%)\`;
        balloon.style.animationDelay = \`\${Math.random() * 0.5}s\`;
        balloon.style.animationDuration = \`\${3 + Math.random() * 2}s\`;
        container.appendChild(balloon);
    }
};
`;

js = balloonLogic + "\n" + js;

// Update handleAnswer logic for WOW sound
const wowReplacement = `
  if (button.textContent === correctAnswer) {
    if (quizType.startsWith('kids')) {
        let wowSound = new Audio('assets/wow.mp3');
        wowSound.play().catch(e => console.log('Audio play failed:', e));
        if (typeof showBalloonFestival === "function") {
            showBalloonFestival();
        }
    } else {
        playSound(winSound);
    }

    if (quizType.startsWith('kids')) {
`;

// First, let's fix the handleAnswer inside script.js using a careful regex replace
js = js.replace(/if \(button\.textContent === correctAnswer\) \{\s*playSound\(winSound\);\s*if \(quizType\.startsWith\('kids'\) && typeof showBalloonFestival === "function"\) \{\s*showBalloonFestival\(\);\s*\}/, wowReplacement);

// Wait, the regex might be brittle. Let's just do an index based replace or a simpler string replacement.
fs.writeFileSync('script.js', js, 'utf8');
console.log("Patched script.js for balloons and wow sound");
