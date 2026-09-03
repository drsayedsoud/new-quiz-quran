// "زوّد رصيد حصالتك" — kids level 4. Same quiz engine and the level-2 question bank, but the hero track becomes a
// piggy bank: +10 piasters per correct answer, −10 per wrong one, the balance is read aloud in Egyptian Arabic,
// every new high is celebrated, and the child can cash the balance as a bank cheque (which resets it to zero).
(function () {
    const TYPE = 'kids_piggy', STEP = 10;
    const K = { bal: 'piggyBalance', best: 'piggyBest', name: 'piggyName', total: 'piggyEarnedTotal', cheques: 'piggyCheques' };
    const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
    const set = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };
    const num = k => parseInt(get(k, '0')) || 0;
    const ar = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const soundOn = () => get('soundOn', 'true') !== 'false';
    const page = location.pathname.toLowerCase();

    const Piggy = { active: false, TYPE };
    window.Piggy = Piggy;
    Piggy.name = () => get(K.name, '').trim();
    Piggy.balance = () => num(K.bal);

    // 250 -> "جنيهان و٥٠ قرشاً"
    function words(p) {
        p = Math.max(0, p | 0);
        const pounds = Math.floor(p / 100), pt = p % 100;
        const pw = pounds === 0 ? '' : pounds === 1 ? 'جنيه واحد' : pounds === 2 ? 'جنيهان' : pounds <= 10 ? ar(pounds) + ' جنيهات' : ar(pounds) + ' جنيهاً';
        const qw = pt === 0 ? '' : pt === 1 ? 'قرش واحد' : pt === 2 ? 'قرشان' : pt <= 10 ? ar(pt) + ' قروش' : ar(pt) + ' قرشاً';
        if (!pw && !qw) return 'صفر قرش';
        return pw && qw ? pw + ' و' + qw : (pw || qw);
    }
    // 250 -> "٢٫٥٠ جنيه" (cheque box)
    const figure = p => ar(Math.floor(p / 100)) + '٫' + ar(String(p % 100).padStart(2, '0')) + ' جنيه';
    Piggy.words = words;

    // ---------- speech: balance messages get priority, the question reading waits its turn ----------
    let busy = false, pending = null, origSpeak = null;
    function patchSpeak() {
        if (!window.KidsTheme || origSpeak) return;
        origSpeak = KidsTheme.speak;
        KidsTheme.speak = function (t, c) { if (busy) { pending = [t, c]; return; } origSpeak.call(KidsTheme, t, c); };
    }
    // Voices load lazily on some phones: warm the list up so the first message picks the right one
    if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices()); } catch (e) {} }
    const voiceFor = re => { try { return speechSynthesis.getVoices().find(v => re.test(v.lang)); } catch (e) { return null; } };
    const arabicVoice = () => voiceFor(/^ar[-_]EG/i) || voiceFor(/^ar/i);
    // No Arabic voice on this device: cheer in English instead ("Wow!" for a win, "Oh no!" for a loss)
    const ENGLISH = {
        good:   ['Wow! Great job!', 'Awesome!', 'Excellent! Well done!', 'Yes! Amazing!', 'Wow! Super!'],
        bad:    ['Oh no!', 'Oops! Try again!', 'Almost! Next time!', 'Oh no, not this one!'],
        pound:  ['Wow! A whole pound! Amazing!', 'Wow! One pound! You are a star!'],
        cheque: ['Wow! Cha-ching! Enjoy your money!'],
        info:   ['Here is your balance!']
    };
    function playClip(file) {
        if (!soundOn()) return;
        try { const a = new Audio(file); a.volume = 1; a.play().catch(() => {}); } catch (e) {}
    }
    function speak(text, kind) {
        if (!soundOn()) return;
        kind = kind || 'good';
        if (!('speechSynthesis' in window)) { if (kind === 'bad') playClip('assets/lose.mp3'); return; }
        patchSpeak();
        try {
            speechSynthesis.cancel();
            const arV = arabicVoice();
            const u = new SpeechSynthesisUtterance();
            if (arV) {
                u.text = KidsTheme && KidsTheme.arabicizeForSpeech ? KidsTheme.arabicizeForSpeech(text).replace(/ كم؟/g, '؟') : text;
                u.lang = arV.lang; u.voice = arV; u.rate = 0.92; u.pitch = 1.1;
            } else {
                const list = ENGLISH[kind] || ENGLISH.good;
                u.text = list[Math.floor(Math.random() * list.length)];
                const en = voiceFor(/^en[-_]US/i) || voiceFor(/^en/i);
                u.lang = en ? en.lang : 'en-US'; if (en) u.voice = en; u.rate = 1; u.pitch = kind === 'bad' ? 0.9 : 1.25;
                if (kind === 'bad') playClip('assets/lose.mp3');
            }
            busy = true;
            const release = () => { busy = false; if (pending && origSpeak) { const p = pending; pending = null; origSpeak.call(KidsTheme, p[0], p[1]); } };
            u.onend = release; u.onerror = release;
            setTimeout(() => { if (busy) release(); }, 9000); // never block the question reading for good
            speechSynthesis.speak(u);
        } catch (e) { busy = false; }
    }

    // ---------- overlays (name prompt, cheque) ----------
    function overlay(html) {
        let el = document.getElementById('piggy-overlay');
        if (!el) { el = document.createElement('div'); el.id = 'piggy-overlay'; document.body.appendChild(el); }
        el.innerHTML = html;
        el.style.display = 'flex';
        return el;
    }
    const closeOverlay = () => { const el = document.getElementById('piggy-overlay'); if (el) el.style.display = 'none'; };

    function askName(done) {
        const el = overlay('<div class="piggy-card"><div class="pg-pig">🐷</div><h3>اكتب اسمك يا بطل</h3><p>عشان نكتب اسمك على الشيك ونقول لك مبروك باسمك</p>' +
            '<input id="piggy-name-input" maxlength="20" placeholder="اسمك هنا…" autocomplete="off"><button type="button" class="pg-go">يلا نبدأ 🚀</button></div>');
        const input = el.querySelector('#piggy-name-input');
        input.value = Piggy.name();
        const go = () => { const n = input.value.trim().slice(0, 20); if (!n) { input.focus(); input.classList.add('kids-shake'); setTimeout(() => input.classList.remove('kids-shake'), 600); return; } set(K.name, n); closeOverlay(); done(n); };
        el.querySelector('.pg-go').onclick = go;
        input.onkeydown = e => { if (e.key === 'Enter') go(); };
        setTimeout(() => input.focus(), 50);
    }
    Piggy.askName = askName;

    function showCheque() {
        const bal = Piggy.balance();
        if (bal <= 0) {
            if (window.UI) UI.toast('حصالتك فاضية دلوقتي، جاوب صح عشان تزوّد رصيدك 🐷', { type: 'info' });
            return;
        }
        const name = Piggy.name() || 'البطل الصغير';
        const n = num(K.cheques) + 1;
        const date = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        const el = overlay('<div class="cheque">' +
            '<div class="ch-stamp">✔ مستحق الدفع</div>' +
            '<div class="ch-head"><span>🏦 بنك الأبطال الصغار</span><span>شيك رقم ' + ar(n) + '</span></div>' +
            '<div class="ch-date">التاريخ: ' + date + '</div>' +
            '<div class="ch-line">يُرجى صرف مبلغ <b>' + words(bal) + '</b> فقط لا غير</div>' +
            '<div class="ch-line">للبطل / البطلة: <b>' + esc(name) + '</b></div>' +
            '<div class="ch-amount">' + figure(bal) + '</div>' +
            '<div class="ch-sign"><span>التوقيع: ـــــــــــــــ</span><span>ماما / بابا</span></div>' +
            '<div class="ch-btns"><button type="button" class="ch-done">✅ تم الصرف</button><button type="button" class="ch-back">رجوع</button></div></div>');
        el.querySelector('.ch-back').onclick = closeOverlay;
        el.querySelector('.ch-done').onclick = () => {
            set(K.cheques, n);
            set(K.bal, 0); set(K.best, 0);
            closeOverlay();
            render(false);
            if (window.KidsTheme) { KidsTheme.play('tada'); KidsTheme.confetti(4000); KidsTheme.cheer('🧾 مبروك، اتصرف الشيك!', '#ffd166'); }
            speak('مبروك يا بطل ' + name + '! صرفت شيك بمبلغ ' + words(bal) + '. يلا نبدأ رصيد جديد', 'cheque');
            if (window.UI) UI.toast('رصيد الحصالة رجع صفر، ابدأ تجميع من جديد 🐷', { type: 'ok' });
        };
    }
    Piggy.cheque = showCheque;

    // ---------- home: start the level ----------
    Piggy.start = function () {
        const go = () => {
            ['mp_roomCode', 'mp_isHost', 'selectedJuz', 'selectedSura', 'mp_pick', 'resumeNow'].forEach(k => localStorage.removeItem(k));
            localStorage.setItem('quizType', TYPE);
            localStorage.setItem('quizTitle', '🐷 زوّد رصيد حصالتك');
            location.href = 'quiz.html';
        };
        if (Piggy.name()) go(); else askName(go);
    };

    // ---------- quiz page: the piggy bar replaces the hero track ----------
    let bar = null;
    function render(animate, delta) {
        if (!bar) return;
        const bal = Piggy.balance();
        const amount = bar.querySelector('.amount');
        amount.textContent = words(bal);
        bar.querySelector('.who').textContent = Piggy.name() || 'البطل';
        bar.querySelector('.pig').textContent = bal >= 500 ? '🐷💎' : bal >= 100 ? '🐷✨' : '🐷';
        if (animate) {
            amount.classList.remove('pop', 'dip'); void amount.offsetWidth;
            amount.classList.add(delta > 0 ? 'pop' : 'dip');
            const f = document.createElement('span');
            f.className = 'piggy-delta ' + (delta > 0 ? 'up' : 'down');
            f.textContent = (delta > 0 ? '+' : '−') + ar(Math.abs(delta));
            bar.appendChild(f);
            setTimeout(() => f.remove(), 1200);
        }
    }
    function buildBar() {
        const track = document.getElementById('kids-hero-track');
        const host = track ? track.parentElement : document.querySelector('.container');
        if (!host) return;
        if (track) track.style.display = 'none';
        bar = document.createElement('div');
        bar.id = 'piggy-bar';
        bar.innerHTML = '<div class="pig">🐷</div><div class="bal"><small>رصيد حصالة <b class="who"></b> <button type="button" class="edit" title="تغيير الاسم">✏️</button></small><div class="amount"></div></div>' +
            '<button type="button" class="cheque-btn">🧾 اصرف شيك</button>';
        if (track) host.insertBefore(bar, track); else host.prepend(bar);
        bar.querySelector('.cheque-btn').onclick = showCheque;
        bar.querySelector('.edit').onclick = () => askName(() => render(false));
        render(false);
    }
    function smallCelebration(bal) {
        if (!window.KidsTheme) return;
        setTimeout(() => {
            KidsTheme.play('star');
            KidsTheme.burst(window.innerWidth / 2, 120, 18);
            KidsTheme.cheer('🎉 وصلت ' + words(bal) + '!', '#ffd166');
        }, 1300);
    }
    function bigCelebration(bal) {
        if (!window.KidsTheme) return;
        setTimeout(() => {
            KidsTheme.play('tada');
            KidsTheme.confetti(5000);
            const el = document.createElement('div');
            el.className = 'piggy-pound';
            el.innerHTML = '<div class="coin">🏆</div><div>جنيه كامل!</div><small>' + words(bal) + ' في حصالتك</small>';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3200);
        }, 1300);
    }
    function onAnswer(ok) {
        let bal = Piggy.balance();
        const best = num(K.best);
        if (ok) { bal += STEP; set(K.total, num(K.total) + STEP); } else bal = Math.max(0, bal - STEP);
        set(K.bal, bal);
        render(true, ok ? STEP : -STEP);
        const who = Piggy.name() ? 'يا بطل ' + Piggy.name() : 'يا بطل';
        if (ok) {
            const newHigh = bal > best;
            if (newHigh) set(K.best, bal);
            const fullPound = newHigh && bal % 100 === 0;
            setTimeout(() => speak(fullPound ? 'جنيه كامل ' + who + '! برافو عليك، معاك دلوقتي ' + words(bal) : 'مبروك ' + who + '! معاك دلوقتي ' + words(bal), fullPound ? 'pound' : 'good'), 1000);
            if (fullPound) bigCelebration(bal); else if (newHigh) smallCelebration(bal);
        } else {
            setTimeout(() => speak('يا خسارة! رصيدك نقص عشرة قروش. معاك دلوقتي ' + words(bal), 'bad'), 900);
        }
    }

    if (page.endsWith('quiz.html') && get('quizType', '') === TYPE) {
        Piggy.active = true;
        const init = () => { document.body.classList.add('piggy-mode'); buildBar(); patchSpeak(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
        document.addEventListener('quiz-answer', e => onAnswer(!!(e.detail && e.detail.ok)));
    }

    // ---------- results page: show the balance and offer the cheque ----------
    if (page.endsWith('finish.html')) {
        const init = () => {
            let session = null;
            try { session = JSON.parse(localStorage.getItem('userSessions') || '[]').pop(); } catch (e) {}
            if (!session || session.type !== TYPE) return;
            document.body.classList.add('piggy-mode');
            const box = document.createElement('div');
            box.className = 'piggy-finish';
            box.innerHTML = '<div class="pig">🐷</div><div class="t"><small>رصيد حصالة ' + esc(Piggy.name() || 'البطل') + ' دلوقتي</small><b>' + words(Piggy.balance()) + '</b></div>' +
                '<div class="btns"><button type="button" class="cheque-btn">🧾 اصرف شيك</button><button type="button" class="again">🐷 العب تاني</button></div>';
            const container = document.querySelector('.container');
            const h1 = container && container.querySelector('h1');
            if (h1) h1.after(box); else if (container) container.prepend(box);
            box.querySelector('.cheque-btn').onclick = () => { showCheque(); const w = () => { const b = box.querySelector('.t b'); if (b) b.textContent = words(Piggy.balance()); }; const ov = document.getElementById('piggy-overlay'); if (ov) ov.addEventListener('click', () => setTimeout(w, 50)); };
            box.querySelector('.again').onclick = () => Piggy.start();
            setTimeout(() => speak('رصيد حصالتك دلوقتي ' + words(Piggy.balance()), 'info'), 1800);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    }
})();
