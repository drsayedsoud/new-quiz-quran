// Teacher mode ("سؤال بسؤال"): everyone sees the same question at the same time, the host reveals the answer
// and moves to the next one. Layered on top of script.js + multiplayer-quiz.js; active only when mp_sync is set.
import { db, ref, onValue, update } from './firebase-init.js';
import { getLocalUserId, escapeHtml, AVATARS } from './mp-common.js';

const roomCode = localStorage.getItem('mp_roomCode');
const enabled = roomCode && localStorage.getItem('mp_sync') === 'true';

if (enabled) {
    const myId = getLocalUserId();
    const isHost = localStorage.getItem('mp_isHost') === 'true';
    const roomRef = ref(db, `rooms/${roomCode}`);
    let room = null;
    let shownIdx = -1;
    let answeredIdx = -1;
    let pending = false;
    let ended = false;
    let autoRevealTimer = null;

    // ---------- UI ----------
    const style = document.createElement('style');
    style.textContent = `
      #sync-overlay { position: fixed; inset: 0; z-index: 8000; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(10,10,30,0.9); backdrop-filter: blur(4px); }
      #sync-overlay .box { background: #22223f; border: 1px solid #52528c; border-radius: 22px; padding: 20px 18px; max-width: 460px; width: 100%; text-align: center; color: #fff; font-family: 'Cairo', sans-serif; max-height: 90vh; overflow-y: auto; }
      #sync-overlay h3 { margin: 0 0 6px; font-size: 1.25em; }
      #sync-overlay .sub { color: #a0aec0; font-size: 0.9em; margin-bottom: 12px; }
      #sync-overlay .answer { background: rgba(16,185,129,0.15); border: 1px solid #10b981; border-radius: 14px; padding: 12px; font-size: 1.15em; font-weight: 800; margin: 8px 0 14px; line-height: 1.7; }
      #sync-overlay .rows { display: flex; flex-direction: column; gap: 6px; text-align: right; }
      #sync-overlay .row { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 6px 10px; font-size: 0.92em; }
      #sync-overlay .row img { width: 28px; height: 28px; border-radius: 50%; background: #fff; }
      #sync-overlay .row .n { flex-grow: 1; }
      #sync-overlay .row .s { color: gold; font-weight: 800; }
      #sync-overlay .pulse { font-size: 2.6em; animation: syncPulse 1.4s ease-in-out infinite; }
      @keyframes syncPulse { 0%,100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 1; } }
      #sync-bar { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 8100; display: none; gap: 8px; background: #111827; border: 1px solid #10b981; border-radius: 999px; padding: 8px 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: 'Cairo', sans-serif; align-items: center; max-width: 96vw; }
      #sync-bar span { color: #cbd5e0; font-size: 0.85em; white-space: nowrap; padding: 0 6px; }
      #sync-bar button { border: none; border-radius: 999px; padding: 9px 14px; font-weight: 800; font-family: inherit; cursor: pointer; color: #fff; white-space: nowrap; }
      #sync-bar .reveal { background: #f59e0b; } #sync-bar .next { background: #10b981; } #sync-bar button:disabled { opacity: 0.4; cursor: default; }
      body.kids-mode #sync-overlay .box { background: #fff; color: #2d2b55; border: 4px solid #c8b6ff; border-radius: 28px; }
      body.kids-mode #sync-overlay .sub { color: #5f6c7b; }
      body.kids-mode #sync-overlay .row { background: #f4f0ff; }
      body.kids-mode #sync-overlay .answer { background: #e6fff5; border-color: #1dd1a1; color: #059669; }
      body.kids-mode #sync-bar { background: #fff; border: 3px solid #c8b6ff; }
      body.kids-mode #sync-bar span { color: #5f27cd; font-weight: 800; }`;
    document.head.appendChild(style);
    const overlay = document.createElement('div');
    overlay.id = 'sync-overlay';
    overlay.innerHTML = '<div class="box" id="sync-box"></div>';
    document.body.appendChild(overlay);
    const bar = document.createElement('div');
    bar.id = 'sync-bar';
    bar.innerHTML = `<span id="sync-count">—</span><button class="reveal" id="sync-reveal">👁️ إظهار الإجابة</button><button class="next" id="sync-next">⏭️ التالي</button>`;
    document.body.appendChild(bar);
    const box = () => document.getElementById('sync-box');
    const show = html => { box().innerHTML = html; overlay.style.display = 'flex'; };
    const hide = () => { overlay.style.display = 'none'; };

    const players = () => Object.entries((room && room.players) || {});
    const answersFor = idx => players().map(([id, p]) => [id, p, p.answers && p.answers[idx]]);
    const rowsHtml = (idx) => answersFor(idx).sort((a, b) => (b[1].score || 0) - (a[1].score || 0)).map(([id, p, a]) => `
        <div class="row"><img src="${escapeHtml(p.avatar || AVATARS[0])}"><span class="n">${escapeHtml(p.name)}${id === myId ? ' <small>(أنت)</small>' : ''}</span><span>${a ? (a.ok ? '✅' : '❌') : '⏳'}</span><span class="s">${p.score || 0}</span></div>`).join('');

    function showWait() {
        const idx = room ? (room.currentQuestionIndex || 0) : 0;
        const total = players().length;
        const done = answersFor(idx).filter(x => x[2]).length;
        show(`<div class="pulse">⏳</div><h3>${answeredIdx === idx ? 'أجبت! في انتظار المعلّم' : 'في انتظار المعلّم'}</h3>
              <div class="sub">أجاب ${done} من ${total} لاعبين · السؤال ${idx + 1} من ${quizData.length}</div>
              <div class="rows">${rowsHtml(idx)}</div>`);
    }
    function showReveal() {
        const idx = room.currentQuestionIndex || 0;
        const q = quizData[idx];
        const list = answersFor(idx);
        const okCount = list.filter(x => x[2] && x[2].ok).length;
        show(`<h3>الإجابة الصحيحة</h3><div class="answer">${escapeHtml(q ? q.correct_answer : '')}</div>
              <div class="sub">أجاب صحيحاً ${okCount} من ${list.length} · السؤال ${idx + 1} من ${quizData.length}</div>
              <div class="rows">${rowsHtml(idx)}</div>
              ${isHost ? '' : '<div class="sub" style="margin-top:10px;">انتظر المعلّم للانتقال إلى السؤال التالي</div>'}`);
    }

    // ---------- engine hooks ----------
    const origDisplay = window.displayQuestion;
    window.displayQuestion = function () {
        if (ended) return;
        // The per-question timer ran out without an answer: count it so the teacher can auto-reveal
        if (room && (room.phase || 'question') === 'question') {
            const idx = room.currentQuestionIndex || 0;
            if (answeredIdx !== idx && currentIndex === idx + 1) { answeredIdx = idx; update(ref(db, `rooms/${roomCode}/players/${myId}/answers/${idx}`), { c: '', ok: false, t: Date.now() }).catch(() => {}); }
        }
        if (!room || !quizData || !quizData.length) { pending = true; show('<div class="pulse">📡</div><h3>جاري الاتصال بالغرفة...</h3>'); return; }
        apply();
    };
    function apply() {
        if (ended || !room) return;
        const idx = room.currentQuestionIndex || 0;
        const phase = room.phase || 'question';
        if (phase === 'done' || idx >= quizData.length) { ended = true; hide(); bar.style.display = 'none'; try { speechSynthesis && speechSynthesis.cancel(); } catch (e) {} if (typeof finishQuiz === 'function') finishQuiz(); return; }
        if (phase === 'reveal') { clearInterval(questionTimerInterval); showReveal(); return; }
        if (shownIdx !== idx) { shownIdx = idx; currentIndex = idx; hide(); origDisplay(); return; }
        if (answeredIdx === idx || currentIndex !== idx) showWait(); else hide();
    }

    const prevHandle = window.handleAnswer;
    window.handleAnswer = function (button, correctAnswer) {
        const idx = room ? (room.currentQuestionIndex || 0) : currentIndex;
        const ok = typeof isCorrectChoice === 'function' ? isCorrectChoice(button, correctAnswer) : button.textContent === correctAnswer;
        answeredIdx = idx;
        prevHandle(button, correctAnswer);
        const chosen = button && button.dataset && button.dataset.value !== undefined ? button.dataset.value : (button ? button.textContent : '');
        update(ref(db, `rooms/${roomCode}/players/${myId}/answers/${idx}`), { c: String(chosen).slice(0, 300), ok: !!ok, t: Date.now() }).catch(() => {});
    };

    // ---------- host controls ----------
    if (isHost) {
        bar.style.display = 'flex';
        document.getElementById('sync-reveal').onclick = () => update(roomRef, { phase: 'reveal', phaseAt: Date.now() });
        document.getElementById('sync-next').onclick = () => {
            const idx = room.currentQuestionIndex || 0;
            if (idx + 1 >= quizData.length) update(roomRef, { phase: 'done', phaseAt: Date.now() });
            else update(roomRef, { currentQuestionIndex: idx + 1, phase: 'question', phaseAt: Date.now() });
        };
    }

    onValue(roomRef, snap => {
        const data = snap.val();
        if (!data) return; // multiplayer-quiz.js handles a closed room
        room = data;
        if (typeof totalTime !== 'undefined') totalTime = 3 * 60 * 60; // the teacher decides when it ends, not the global clock
        if (isHost) {
            const idx = room.currentQuestionIndex || 0;
            const total = players().length;
            const done = answersFor(idx).filter(x => x[2]).length;
            document.getElementById('sync-count').textContent = `أجاب ${done}/${total}`;
            document.getElementById('sync-reveal').disabled = (room.phase || 'question') !== 'question';
            document.getElementById('sync-next').disabled = (room.phase || 'question') !== 'reveal';
            clearTimeout(autoRevealTimer);
            if ((room.phase || 'question') === 'question' && total > 0 && done >= total) autoRevealTimer = setTimeout(() => update(roomRef, { phase: 'reveal', phaseAt: Date.now() }), 1200);
        }
        if (pending && quizData && quizData.length) { pending = false; apply(); return; }
        if (quizData && quizData.length) apply();
    });
}
