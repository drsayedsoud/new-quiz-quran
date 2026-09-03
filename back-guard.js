// Android back gesture / back button: close what is open, step back a screen, and confirm before leaving the app.
(function () {
    const page = location.pathname.toLowerCase();
    const isHome = page.endsWith('/') || page.endsWith('index.html');
    let dialogOpen = false;

    function ensureStyles() {
        if (document.getElementById('exit-dialog-styles')) return;
        const s = document.createElement('style');
        s.id = 'exit-dialog-styles';
        s.textContent = `
        #exit-overlay { position: fixed; inset: 0; z-index: 10000; display: none; align-items: center; justify-content: center; padding: 20px;
            background: rgba(8,10,25,0.72); backdrop-filter: blur(6px); animation: exitFade 0.18s ease-out; }
        #exit-overlay .box { width: 100%; max-width: 340px; border-radius: 26px; padding: 26px 22px 20px; text-align: center;
            background: linear-gradient(160deg, #2b2b52 0%, #1b1b36 100%); border: 1px solid rgba(255,255,255,0.14);
            box-shadow: 0 22px 60px rgba(0,0,0,0.55); color: #fff; font-family: 'Cairo', sans-serif; animation: exitPop 0.22s cubic-bezier(0.2,1.1,0.4,1); }
        #exit-overlay .emoji { width: 70px; height: 70px; margin: 0 auto 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 2.1em; background: linear-gradient(135deg, #4299e1, #7c3aed); box-shadow: 0 10px 24px rgba(124,58,237,0.45); }
        #exit-overlay h3 { margin: 0 0 6px; font-size: 1.3em; font-weight: 900; }
        #exit-overlay p { margin: 0 0 18px; font-size: 0.92em; color: #b8c0d6; line-height: 1.7; }
        #exit-overlay .btns { display: flex; gap: 10px; }
        #exit-overlay button { flex: 1; padding: 13px 10px; border: none; border-radius: 999px; font-family: inherit; font-weight: 800; font-size: 1em; cursor: pointer; }
        #exit-overlay .stay { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 6px 16px rgba(16,185,129,0.35); }
        #exit-overlay .leave { background: rgba(255,255,255,0.08); color: #f8b4b4; border: 1px solid rgba(248,180,180,0.35); }
        body.kids-mode #exit-overlay .box { background: #fff; color: #2d2b55; border: 4px solid #c8b6ff; }
        body.kids-mode #exit-overlay p { color: #5f6c7b; }
        @keyframes exitFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes exitPop { from { transform: scale(0.86) translateY(10px); opacity: 0; } to { transform: none; opacity: 1; } }`;
        document.head.appendChild(s);
    }

    function ask({ title, text, stay, leave, emoji }) {
        ensureStyles();
        return new Promise(resolve => {
            let el = document.getElementById('exit-overlay');
            if (!el) {
                el = document.createElement('div');
                el.id = 'exit-overlay';
                el.innerHTML = '<div class="box"><div class="emoji"></div><h3></h3><p></p><div class="btns"><button class="stay"></button><button class="leave"></button></div></div>';
                document.body.appendChild(el);
            }
            el.querySelector('.emoji').textContent = emoji || '👋';
            el.querySelector('h3').textContent = title;
            el.querySelector('p').textContent = text;
            el.querySelector('.stay').textContent = stay;
            el.querySelector('.leave').textContent = leave;
            el.style.display = 'flex';
            dialogOpen = true;
            const done = v => { el.style.display = 'none'; dialogOpen = false; resolve(v); };
            el.querySelector('.stay').onclick = () => done(false);
            el.querySelector('.leave').onclick = () => done(true);
        });
    }
    window.askToLeave = ask;

    // Any visible overlay that a back gesture should simply close
    function closeTopLayer() {
        const closers = [
            ['#pick-panel', el => el.style.display = 'none'],
            ['#install-modal', el => { el.style.display = 'none'; localStorage.setItem('pwa-dismissed', 'true'); }],
            ['#admin-password-modal', el => el.style.display = 'none'],
            ['#solo-mix-modal', el => el.style.display = 'none'],
            ['#multiplayer-modal', el => el.style.display = 'none']
        ];
        for (const [sel, close] of closers) {
            const el = document.querySelector(sel);
            if (el && getComputedStyle(el).display !== 'none') { close(el); return true; }
        }
        return false;
    }

    history.pushState({ guard: 1 }, '');
    window.addEventListener('popstate', async () => {
        if (dialogOpen) { history.pushState({ guard: 1 }, ''); return; }
        if (closeTopLayer()) { history.pushState({ guard: 1 }, ''); return; }

        if (isHome) {
            history.pushState({ guard: 1 }, '');
            const leave = await ask({ emoji: '👋', title: 'هل تريد المغادرة؟', text: 'يسعدنا وجودك، يمكنك متابعة المسابقات في أي وقت.', stay: 'البقاء هنا', leave: 'مغادرة' });
            if (leave) { history.go(-2); setTimeout(() => window.close(), 250); }
            return;
        }

        if (page.endsWith('quiz.html')) {
            history.pushState({ guard: 1 }, '');
            const inRoom = !!localStorage.getItem('mp_roomCode');
            const leave = await ask({
                emoji: inRoom ? '🚪' : '⏸️',
                title: inRoom ? 'مغادرة التحدي؟' : 'إنهاء المسابقة؟',
                text: inRoom ? 'ستخرج من الغرفة وتُحتسب نتيجتك الحالية.' : 'يمكنك متابعتها لاحقاً من زر «متابعة المسابقة» في الرئيسية.',
                stay: 'أكمل اللعب', leave: 'خروج'
            });
            if (leave) { if (typeof saveResume === 'function') try { saveResume(); } catch (e) {} location.href = 'index.html'; }
            return;
        }

        if (page.endsWith('lobby.html')) {
            history.pushState({ guard: 1 }, '');
            const leave = await ask({ emoji: '🚪', title: 'مغادرة الغرفة؟', text: 'يمكنك الرجوع إليها بالكود ما دامت مفتوحة.', stay: 'البقاء', leave: 'مغادرة' });
            if (leave) location.href = 'index.html';
            return;
        }

        location.href = 'index.html';
    });
})();
