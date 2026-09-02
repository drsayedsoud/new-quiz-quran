// Kids theme: playful visuals, synthesized sounds and micro-interactions for players aged 10 and under.
// Classic script (no module) so every page can include it. Activates itself when the quiz type is a kids category,
// or when a page calls KidsTheme.activate() explicitly (the lobby does this from the room settings).
(function () {
    const KidsTheme = {};
    let active = false;
    let audioCtx = null;

    // ---------- Sounds (WebAudio, no files needed) ----------
    function soundEnabled() {
        const v = localStorage.getItem('soundOn');
        return v === null ? true : v === 'true';
    }
    function ctx() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        }
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
    }
    function tone(freq, start, duration, type, volume, slideTo) {
        const c = ctx(); if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, c.currentTime + start);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + duration);
        gain.gain.setValueAtTime(0.0001, c.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(volume || 0.2, c.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
        osc.connect(gain).connect(c.destination);
        osc.start(c.currentTime + start);
        osc.stop(c.currentTime + start + duration + 0.05);
    }
    function noise(start, duration, volume) {
        const c = ctx(); if (!c) return;
        const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = c.createBufferSource();
        src.buffer = buffer;
        const gain = c.createGain();
        gain.gain.value = volume || 0.15;
        src.connect(gain).connect(c.destination);
        src.start(c.currentTime + start);
    }
    const SOUNDS = {
        pop:     () => tone(600, 0, 0.08, 'sine', 0.25, 900),
        click:   () => tone(400, 0, 0.06, 'triangle', 0.2),
        whoosh:  () => { noise(0, 0.25, 0.12); tone(300, 0, 0.25, 'sine', 0.15, 900); },
        correct: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.25)); },
        wrong:   () => { tone(300, 0, 0.35, 'sawtooth', 0.12, 120); tone(220, 0.05, 0.3, 'sine', 0.1, 100); },
        tick:    () => tone(880, 0, 0.1, 'square', 0.12),
        go:      () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.06, 0.15, 'square', 0.15)); tone(1046, 0.2, 0.5, 'triangle', 0.25); },
        tada:    () => { [523, 523, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, i === 5 ? 0.8 : 0.18, 'triangle', 0.25)); noise(0.6, 0.6, 0.08); },
        star:    () => { tone(1200, 0, 0.12, 'sine', 0.15, 1800); tone(1600, 0.08, 0.15, 'sine', 0.12, 2400); },
        join:    () => { [659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.2, 'sine', 0.2)); },
        boing:   () => tone(200, 0, 0.3, 'sine', 0.2, 600)
    };
    KidsTheme.play = function (name) {
        if (!soundEnabled()) return;
        const fn = SOUNDS[name];
        if (fn) { try { fn(); } catch (e) { /* ignore */ } }
    };
    // Browsers need a gesture before audio can start
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => ctx(), { once: true, passive: true }));

    // ---------- Visual effects ----------
    const EMOJIS = ['⭐', '🌟', '✨', '🎈', '🎉', '💫', '🌈', '🎊'];
    const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#54a0ff', '#f368e0', '#ff9f43'];

    KidsTheme.burst = function (x, y, count) {
        const n = count || 14;
        for (let i = 0; i < n; i++) {
            const el = document.createElement('div');
            el.className = 'kids-particle';
            el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
            const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
            const dist = 70 + Math.random() * 90;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            el.style.fontSize = (16 + Math.random() * 18) + 'px';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1100);
        }
    };

    KidsTheme.cheer = function (text, color) {
        const el = document.createElement('div');
        el.className = 'kids-cheer';
        el.textContent = text;
        el.style.color = color || '#ff9f43';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    };

    KidsTheme.confetti = function (durationMs) {
        const canvas = document.createElement('canvas');
        canvas.className = 'kids-confetti';
        document.body.appendChild(canvas);
        const g = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        const pieces = Array.from({ length: 160 }, () => ({
            x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height,
            w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
            c: COLORS[Math.floor(Math.random() * COLORS.length)],
            vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2, r: Math.random() * Math.PI, vr: -0.1 + Math.random() * 0.2
        }));
        const end = Date.now() + (durationMs || 4500);
        (function frame() {
            g.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.r += p.vr;
                if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
                g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
            });
            if (Date.now() < end) requestAnimationFrame(frame); else canvas.remove();
        })();
    };

    function addBackdrop() {
        if (document.querySelector('.kids-sky')) return;
        const sky = document.createElement('div');
        sky.className = 'kids-sky';
        sky.innerHTML = `
            <div class="kids-cloud c1"></div><div class="kids-cloud c2"></div><div class="kids-cloud c3"></div>
            <div class="kids-float f1">⭐</div><div class="kids-float f2">🎈</div><div class="kids-float f3">🌟</div>
            <div class="kids-float f4">🎈</div><div class="kids-float f5">✨</div><div class="kids-float f6">🚀</div>`;
        document.body.prepend(sky);
    }

    // ---------- Activation ----------
    KidsTheme.isKids = function () {
        const t = localStorage.getItem('quizType') || '';
        return t.startsWith('kids');
    };
    KidsTheme.isActive = function () { return active; };
    KidsTheme.activate = function () {
        if (active) return;
        active = true;
        document.body.classList.add('kids-mode');
        addBackdrop();
        // Every button click pops
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, .option, .avatar-option, .category-card, .mp-choice');
            if (btn) KidsTheme.play('pop');
        }, true);
    };

    // Called by the quiz engine on a correct / wrong answer (kids mode only)
    // Recorded kids cheering ("wooow") for correct answers, layered with the synthesized chime
    let wowAudio = null;
    KidsTheme.playWow = function () {
        if (!soundEnabled()) return;
        try {
            if (!wowAudio) { wowAudio = new Audio('assets/wow.mp3'); wowAudio.preload = 'auto'; }
            wowAudio.currentTime = 0;
            wowAudio.volume = 1;
            wowAudio.play().catch(() => {});
        } catch (e) { /* ignore */ }
    };
    KidsTheme.correct = function (button) {
        KidsTheme.playWow();
        KidsTheme.play('correct');
        const r = button ? button.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        KidsTheme.burst(r.left + r.width / 2, r.top + r.height / 2);
        KidsTheme.cheer(['رائع! 🌟', 'أحسنت! 👏', 'ممتاز! 🎉', 'بطل! 🦸', 'عبقري! 💡'][Math.floor(Math.random() * 5)], '#1dd1a1');
        if (typeof window.showBalloonFestival === 'function') window.showBalloonFestival();
    };
    KidsTheme.wrong = function (button) {
        KidsTheme.play('wrong');
        if (button) { button.classList.add('kids-shake'); setTimeout(() => button.classList.remove('kids-shake'), 600); }
        KidsTheme.cheer(['حاول مرة أخرى! 💪', 'قريب جداً! 🙂', 'لا بأس، استمر! 🌈'][Math.floor(Math.random() * 3)], '#ff6b6b');
    };

    // ---------- Read the question aloud (Web Speech API, Arabic voice when available) ----------
    KidsTheme.readEnabled = function () { return localStorage.getItem('kids_read') !== 'off'; };
    KidsTheme.toggleRead = function () {
        const on = !KidsTheme.readEnabled();
        localStorage.setItem('kids_read', on ? 'on' : 'off');
        if (!on && window.speechSynthesis) speechSynthesis.cancel();
        const b = document.getElementById('kids-read-btn');
        if (b) b.textContent = on ? '🔊 القراءة: تعمل' : '🔇 القراءة: متوقفة';
        return on;
    };
    // Make maths and symbols readable by an Arabic voice: "15 × 6 = ؟" -> "١٥ ضرب ٦ يساوي كم"
    KidsTheme.arabicizeForSpeech = function (text) {
        return String(text || '')
            .replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
            .replace(/\s*[×x\*]\s*/g, ' ضرب ')
            .replace(/\s*÷\s*/g, ' على ')
            .replace(/\s*\+\s*/g, ' زائد ')
            .replace(/(?<=[٠-٩\)])\s*[-−]\s*(?=[٠-٩\(])/g, ' ناقص ')
            .replace(/\s*=\s*/g, ' يساوي ')
            .replace(/([٠-٩])\s*\/\s*([٠-٩])/g, '$1 على $2')
            .replace(/([٠-٩])\s*%/g, '$1 بالمئة')
            .replace(/[?؟]/g, ' كم؟')
            .replace(/\.\.\.+|…|▢+/g, ' فراغ ')
            .replace(/\s{2,}/g, ' ').trim();
    };
    KidsTheme.speak = function (text, choices) {
        if (!('speechSynthesis' in window) || !text) return;
        text = KidsTheme.arabicizeForSpeech(text);
        if (choices) choices = choices.map(KidsTheme.arabicizeForSpeech);
        try {
            speechSynthesis.cancel();
            const say = (t, rate) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'ar-SA'; u.rate = rate || 0.9; const v = speechSynthesis.getVoices().find(v => /^ar/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); };
            say(text, 0.9);
            if (choices && choices.length) say('الاختيارات: ' + choices.map(String).join('، '), 0.95);
        } catch (e) { /* ignore */ }
    };
    function addReadButton() {
        if (document.getElementById('kids-read-btn')) return;
        const host = document.querySelector('.footer');
        if (!host) return;
        const b = document.createElement('button');
        b.id = 'kids-read-btn';
        b.textContent = KidsTheme.readEnabled() ? '🔊 القراءة: تعمل' : '🔇 القراءة: متوقفة';
        b.style.cssText = 'background:#6b46c1;color:#fff;';
        b.onclick = () => { if (KidsTheme.toggleRead()) { const q = document.getElementById('question-text'); if (q) KidsTheme.speak(q.textContent); } };
        host.prepend(b);
    }
    const _activate = KidsTheme.activate;
    KidsTheme.activate = function () { _activate(); if (location.pathname.toLowerCase().endsWith('quiz.html') && 'speechSynthesis' in window) addReadButton(); };

    window.KidsTheme = KidsTheme;

    // Finish page: trophy, stars and confetti sized to the result
    function celebrateFinish() {
        KidsTheme.activate();
        const session = (JSON.parse(localStorage.getItem('userSessions') || '[]')).pop() || {};
        const score = session.score || 0, total = session.total || 1;
        const ratio = score / total;
        const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
        const container = document.querySelector('.container');
        if (container) {
            const box = document.createElement('div');
            box.style.textAlign = 'center';
            box.innerHTML = `
                <div class="kids-trophy">${stars === 3 ? '🏆' : stars === 2 ? '🥇' : stars === 1 ? '🎖️' : '🌈'}</div>
                <div class="kids-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
                <div style="font-size:1.4em;font-weight:900;color:#5f27cd;">${stars === 3 ? 'بطل خارق! 🦸' : stars === 2 ? 'رائع جداً! 👏' : stars === 1 ? 'أحسنت، استمر! 💪' : 'حاول مرة أخرى يا بطل! 🚀'}</div>`;
            const anchor = container.querySelector('h1');
            if (anchor) anchor.before(box); else container.prepend(box);
        }
        setTimeout(() => {
            KidsTheme.play(stars >= 2 ? 'tada' : 'star');
            if (stars >= 1) KidsTheme.confetti(stars === 3 ? 6000 : 3500);
        }, 400);
    }

    // Auto-activate on quiz / finish pages
    const page = location.pathname.toLowerCase();
    if (page.endsWith('quiz.html') && KidsTheme.isKids()) {
        if (document.body) KidsTheme.activate();
        else document.addEventListener('DOMContentLoaded', KidsTheme.activate);
    }
    if (page.endsWith('finish.html') && KidsTheme.isKids()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', celebrateFinish);
        else celebrateFinish();
    }
})();
