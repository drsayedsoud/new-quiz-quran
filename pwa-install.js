// "Add to Home Screen" flow shared by the home, results and profile pages.
// - Chrome/Edge/Samsung: one real tap through beforeinstallprompt.
// - iOS Safari: the exact steps inside the app. Other iOS browsers and in-app browsers (WhatsApp,
//   Facebook, Instagram, TikTok) cannot install, so they get "open in Safari/Chrome" + copy link.
// - Never nags: no prompt on the very first visit, "لاحقاً" snoozes for 7 days, one auto-open per session.
(function () {
    const SNOOZE_KEY = 'pwa-snooze-until', LEGACY_KEY = 'pwa-dismissed', VISITS_KEY = 'pwa-visits', INSTALLED_KEY = 'pwa-installed';
    const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
    const ua = navigator.userAgent || '';
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const inApp = /fban|fbav|fb_iab|instagram|tiktok|musical_ly|snapchat|line\/|twitter|; wv\)|whatsapp/i.test(ua);
    const iosOtherBrowser = isIOS && /crios|fxios|edgios|opios|opt\//i.test(ua);
    const iosSafari = isIOS && !inApp && !iosOtherBrowser;
    const page = location.pathname.toLowerCase();
    const onResults = page.endsWith('finish.html');
    let deferredPrompt = null;
    let modal = null;

    const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
    function snoozed() {
        if (store.get(LEGACY_KEY)) { store.del(LEGACY_KEY); store.set(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); }
        return parseInt(store.get(SNOOZE_KEY) || '0') > Date.now();
    }
    function snooze() { store.set(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); }
    function countVisit() {
        try { if (sessionStorage.getItem('pwa-counted')) return; sessionStorage.setItem('pwa-counted', '1'); } catch (e) {}
        store.set(VISITS_KEY, String((parseInt(store.get(VISITS_KEY) || '0') || 0) + 1));
    }
    function engaged() {
        if (onResults) return true; // a finished quiz is the best moment to offer the app
        const visits = parseInt(store.get(VISITS_KEY) || '0') || 0;
        let games = 0; try { games = (window.Progress && Progress.stats().games) || 0; } catch (e) {}
        return visits >= 2 || games >= 1;
    }
    // How this browser can install: 'native' | 'ios' | 'open-browser' | 'none'
    function mode() {
        if (deferredPrompt) return 'native';
        if (iosSafari) return 'ios';
        if (inApp || iosOtherBrowser) return 'open-browser';
        return 'none';
    }

    function ensureStyles() {
        if (document.getElementById('pwa-install-styles')) return;
        const s = document.createElement('style');
        s.id = 'pwa-install-styles';
        s.textContent = `
        #install-modal { position: fixed; inset: 0; z-index: 9999; display: none; align-items: flex-end; justify-content: center; background: rgba(8,10,25,0.7); backdrop-filter: blur(6px); direction: rtl; animation: pwaFade 0.2s ease-out; }
        @media (min-width: 560px) { #install-modal { align-items: center; padding: 20px; } }
        #install-modal .sheet { width: 100%; max-width: 420px; background: linear-gradient(160deg, #2b2b52 0%, #1b1b36 100%); color: #fff; border: 1px solid rgba(255,255,255,0.14); border-radius: 28px 28px 0 0; padding: 22px 20px calc(18px + env(safe-area-inset-bottom)); box-shadow: 0 -12px 50px rgba(0,0,0,0.5); font-family: 'Cairo', sans-serif; animation: pwaUp 0.28s cubic-bezier(0.2,1.1,0.4,1); position: relative; }
        @media (min-width: 560px) { #install-modal .sheet { border-radius: 28px; } }
        #install-modal .grab { width: 44px; height: 5px; border-radius: 999px; background: rgba(255,255,255,0.25); margin: -6px auto 14px; }
        #install-modal .head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        #install-modal .head img { width: 64px; height: 64px; border-radius: 18px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); flex-shrink: 0; }
        #install-modal h3 { margin: 0 0 2px; font-size: 1.2em; font-weight: 900; }
        #install-modal .sub { margin: 0; font-size: 0.85em; color: #b8c0d6; }
        #install-modal ul { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 8px; }
        #install-modal li { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 9px 12px; font-size: 0.92em; font-weight: 600; }
        #install-modal li span:first-child { font-size: 1.3em; width: 30px; text-align: center; }
        #install-modal .steps { margin: 0 0 16px; padding: 0; list-style: none; display: grid; gap: 8px; }
        #install-modal .steps li { justify-content: flex-start; }
        #install-modal .steps b { background: #4299e1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; }
        #install-modal .btns { display: flex; gap: 10px; }
        #install-modal button { flex: 1; padding: 13px 10px; border: none; border-radius: 999px; font-family: inherit; font-weight: 800; font-size: 1em; cursor: pointer; }
        #install-modal .go { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 6px 16px rgba(16,185,129,0.35); }
        #install-modal .later { background: rgba(255,255,255,0.08); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); flex: 0 0 auto; padding: 13px 18px; }
        #install-modal .x { position: absolute; top: 12px; left: 14px; background: none; border: none; color: #a0aec0; font-size: 1.6em; line-height: 1; padding: 4px 8px; flex: none; cursor: pointer; }
        body.kids-mode #install-modal .sheet { background: #fff; color: #2d2b55; border: 4px solid #c8b6ff; }
        body.kids-mode #install-modal .sub { color: #5f6c7b; }
        body.kids-mode #install-modal li { background: #f4f0ff; border-color: #e2dbff; }
        body.kids-mode #install-modal .later { color: #5f27cd; background: #f4f0ff; border-color: #c8b6ff; }
        @keyframes pwaFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pwaUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }`;
        document.head.appendChild(s);
    }

    function build() {
        ensureStyles();
        modal = document.getElementById('install-modal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'install-modal';
        modal.innerHTML = '<div class="sheet"><div class="grab"></div><button type="button" class="x" aria-label="إغلاق">&times;</button>' +
            '<div class="head"><img src="assets/icon-192.png" alt=""><div><h3>ثبّت التطبيق على جهازك</h3><p class="sub">مسابقة القرآن الكريم · مجاناً وبدون متجر</p></div></div>' +
            '<div class="body"></div><div class="btns"><button type="button" class="go"></button><button type="button" class="later">لاحقاً</button></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        modal.querySelector('.x').onclick = close;
        modal.querySelector('.later').onclick = close;
        modal.querySelector('.go').onclick = install;
        return modal;
    }
    function render() {
        const m = mode();
        const body = modal.querySelector('.body'), go = modal.querySelector('.go');
        const benefits = '<ul><li><span>⚡</span><span>يفتح فوراً كتطبيق مستقل بدون شريط المتصفح</span></li>' +
            '<li><span>📴</span><span>المسابقات الفردية تعمل بدون إنترنت</span></li>' +
            '<li><span>🏠</span><span>أيقونة على شاشتك الرئيسية لتعود متى شئت</span></li></ul>';
        if (m === 'ios') {
            body.innerHTML = benefits + '<ul class="steps"><li><b>1</b><span>اضغط زر المشاركة <span style="font-size:1.2em">⎋</span> أسفل Safari</span></li><li><b>2</b><span>اختر «إضافة إلى الشاشة الرئيسية»</span></li><li><b>3</b><span>اضغط «إضافة» في الأعلى</span></li></ul>';
            go.textContent = 'فهمت، سأفعل ذلك';
            go.onclick = () => { snooze(); close(); };
        } else if (m === 'open-browser') {
            const target = isIOS ? 'Safari' : 'Chrome';
            body.innerHTML = benefits + '<p class="sub" style="margin:0 0 14px;line-height:1.7;">هذا المتصفح لا يدعم التثبيت. انسخ الرابط وافتحه في <b>' + target + '</b> ثم اختر «تثبيت» أو «إضافة إلى الشاشة الرئيسية».</p>';
            go.textContent = '📋 نسخ الرابط';
            go.onclick = copyLink;
        } else {
            body.innerHTML = benefits;
            go.textContent = 'تثبيت الآن';
            go.onclick = install;
        }
    }
    function open() {
        if (isStandalone()) return;
        build();
        render();
        modal.style.display = 'flex';
    }
    function close() {
        if (modal) modal.style.display = 'none';
        snooze();
    }
    async function copyLink() {
        const url = location.origin + '/';
        try { await navigator.clipboard.writeText(url); if (window.UI) UI.toast('تم نسخ الرابط، افتحه في متصفحك الأساسي', { type: 'ok' }); }
        catch (e) { if (window.UI) UI.toast('انسخ الرابط يدوياً: ' + url, { type: 'info', ms: 6000 }); }
    }
    async function install() {
        if (!deferredPrompt) { open(); return; }
        const p = deferredPrompt;
        if (modal) modal.style.display = 'none';
        try {
            p.prompt();
            const choice = await p.userChoice;
            deferredPrompt = null;
            if (choice && choice.outcome === 'accepted') { chip(false); store.set(INSTALLED_KEY, '1'); }
            else snooze();
        } catch (e) { snooze(); }
    }
    function chip(on) {
        const el = document.getElementById('install-chip');
        if (el) el.style.display = on ? 'inline-flex' : 'none';
    }
    function maybeAutoOpen() {
        if (isStandalone() || snoozed() || store.get(INSTALLED_KEY)) return;
        try { if (sessionStorage.getItem('pwa-shown')) return; } catch (e) {}
        if (!engaged() || mode() === 'none') return;
        try { sessionStorage.setItem('pwa-shown', '1'); } catch (e) {}
        setTimeout(open, onResults ? 1800 : 2500);
    }

    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        chip(true);
        maybeAutoOpen();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        chip(false);
        store.set(INSTALLED_KEY, '1');
        if (modal) modal.style.display = 'none';
        if (window.UI) UI.toast('تم تثبيت التطبيق 🎉 افتحه من شاشتك الرئيسية', { type: 'ok', ms: 5000 });
    });
    try { window.matchMedia('(display-mode: standalone)').addEventListener('change', e => { if (e.matches) chip(false); }); } catch (e) {}

    window.installApp = install;
    window.closeInstallModal = close;
    window.openInstallModal = open;

    const start = () => {
        countVisit();
        if (isStandalone()) { chip(false); return; }
        if (mode() !== 'none') chip(true);
        maybeAutoOpen();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
