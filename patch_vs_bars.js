const fs = require('fs');

// 1. Update quiz.html to add mp-vertical-bars container
let html = fs.readFileSync('quiz.html', 'utf8');
if (!html.includes('id="mp-vertical-bars"')) {
    html = html.replace('<div class="container">', 
        '<div id="mp-vertical-bars" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50;"></div>\n  <div class="container">');
    fs.writeFileSync('quiz.html', html, 'utf8');
    console.log("Patched quiz.html");
}

// 2. Update multiplayer-quiz.js to render vertical bars
let js = fs.readFileSync('multiplayer-quiz.js', 'utf8');

const verticalBarsLogic = `
          if (players) {
              const barsContainer = document.getElementById('mp-vertical-bars');
              if (barsContainer) {
                  barsContainer.style.display = 'block';
                  const totalQ = parseInt(localStorage.getItem('mp_qCount')) || 10;
                  
                  const playerKeys = Object.keys(players);
                  playerKeys.forEach((playerKey, index) => {
                      let p = players[playerKey];
                      let isLeft = index % 2 !== 0; 
                      let horizontalOffset = 5 + Math.floor(index / 2) * 65;
                      let sideStyle = isLeft ? \`left: \${horizontalOffset}px;\` : \`right: \${horizontalOffset}px;\`;
                      let percent = Math.min(100, Math.max(0, (p.score / totalQ) * 100));
                      
                      let existingBar = document.getElementById(\`vs-bar-\${playerKey}\`);
                      if (!existingBar) {
                          existingBar = document.createElement('div');
                          existingBar.id = \`vs-bar-\${playerKey}\`;
                          existingBar.className = 'vs-bar-wrapper';
                          existingBar.style.cssText = \`position: absolute; \${sideStyle} top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; transition: all 0.3s;\`;
                          
                          existingBar.innerHTML = \`
                              <div class="vs-score-text" style="color: gold; font-weight: bold; font-size: 1.2em; text-shadow: 0 0 5px black; margin-bottom: 5px; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 10px;">\${p.score}</div>
                              <div style="width: 25px; height: 40vh; background: rgba(0,0,0,0.6); border: 2px solid rgba(255,255,255,0.3); border-radius: 12px; position: relative; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
                                   <div class="vs-bar-fill" style="position: absolute; bottom: 0; left: 0; width: 100%; height: \${percent}%; background: linear-gradient(to top, #10b981, #34d399); transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 0 10px #10b981;"></div>
                              </div>
                              <img src="\${p.avatar}" style="width: 40px; height: 40px; border-radius: 50%; margin-top: 10px; border: 3px solid \${isLeft ? '#3b82f6' : '#10b981'}; box-shadow: 0 0 8px rgba(0,0,0,0.8); background: #fff;">
                              <div style="color: white; font-size: 0.85em; font-weight: bold; background: rgba(0,0,0,0.7); padding: 3px 8px; border-radius: 8px; margin-top: 5px; max-width: 70px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">
                                  \${p.name}
                              </div>
                          \`;
                          barsContainer.appendChild(existingBar);
                      } else {
                          existingBar.querySelector('.vs-score-text').innerText = p.score;
                          existingBar.querySelector('.vs-bar-fill').style.height = percent + '%';
                      }
                  });
              }

              // Update the inline leaderboard as well
              const list = document.getElementById('mp-players-list');
              list.innerHTML = '';
`;

js = js.replace(/if \(players\) \{\s*const list = document\.getElementById\('mp-players-list'\);\s*list\.innerHTML = '';/, verticalBarsLogic);

fs.writeFileSync('multiplayer-quiz.js', js, 'utf8');
console.log("Patched multiplayer-quiz.js with vertical bars");
