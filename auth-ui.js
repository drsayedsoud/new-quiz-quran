// First-launch sign-in sheet: quick (anonymous) start, or Google for a player that follows you across devices.
const GOOGLE_G = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

function ensureStyles() {
    if (document.getElementById('auth-sheet-styles')) return;
    const s = document.createElement('style');
    s.id = 'auth-sheet-styles';
    s.textContent = `
    #auth-sheet { position: fixed; inset: 0; z-index: 10020; display: flex; align-items: flex-end; justify-content: center; background: rgba(8,10,25,0.78); backdrop-filter: blur(8px); direction: rtl; animation: authFade 0.25s ease-out; }
    @media (min-width: 560px) { #auth-sheet { align-items: center; padding: 20px; } }
    #auth-sheet .sheet { width: 100%; max-width: 430px; background: linear-gradient(160deg, #2b2b52 0%, #1b1b36 100%); color: #fff; border: 1px solid rgba(255,255,255,0.14); border-radius: 30px 30px 0 0; padding: 26px 20px calc(20px + env(safe-area-inset-bottom)); box-shadow: 0 -12px 50px rgba(0,0,0,0.5); font-family: 'Cairo', sans-serif; animation: authUp 0.32s cubic-bezier(0.2,1.1,0.4,1); }
    @media (min-width: 560px) { #auth-sheet .sheet { border-radius: 30px; } }
    #auth-sheet .logo { width: 72px; height: 72px; margin: 0 auto 10px; border-radius: 22px; display: block; box-shadow: 0 10px 26px rgba(16,185,129,0.3); }
    #auth-sheet h3 { margin: 0; text-align: center; font-size: 1.3em; font-weight: 900; }
    #auth-sheet .sub { margin: 4px 0 18px; text-align: center; color: #b8c0d6; font-size: 0.9em; line-height: 1.7; }
    #auth-sheet .opt { width: 100%; display: flex; align-items: center; gap: 14px; text-align: right; border-radius: 20px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; font-family: inherit; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; transition: transform 0.15s, background 0.15s; }
    #auth-sheet .opt:active { transform: scale(0.98); }
    #auth-sheet .opt.quick { background: linear-gradient(135deg, #10b981, #059669); border-color: transparent; box-shadow: 0 8px 22px rgba(16,185,129,0.35); }
    #auth-sheet .opt.google { background: #fff; color: #1f2937; border-color: #fff; }
    #auth-sheet .opt .ic { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5em; flex-shrink: 0; background: rgba(255,255,255,0.18); }
    #auth-sheet .opt.google .ic { background: #f3f4f6; }
    #auth-sheet .opt b { display: block; font-size: 1.05em; font-weight: 900; }
    #auth-sheet .opt small { display: block; font-size: 0.8em; line-height: 1.6; opacity: 0.9; }
    #auth-sheet .opt.google small { color: #4b5563; }
    #auth-sheet .badge { display: inline-block; background: linear-gradient(135deg, #f6c343, #f59e0b); color: #1a1a2e; border-radius: 999px; padding: 1px 10px; font-size: 0.75em; font-weight: 900; margin-right: 6px; vertical-align: middle; }
    #auth-sheet .foot { margin: 6px 0 0; text-align: center; color: #8b93ad; font-size: 0.78em; }
    #auth-sheet .busy { opacity: 0.6; pointer-events: none; }
    @keyframes authFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes authUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }`;
    document.head.appendChild(s);
}

// Resolves with 'quick' or 'google' once the player taps a choice
export function chooseSignIn() {
    ensureStyles();
    return new Promise(resolve => {
        const el = document.createElement('div');
        el.id = 'auth-sheet';
        el.innerHTML = '<div class="sheet">' +
            '<img class="logo" src="assets/icon-192.png" alt="">' +
            '<h3>أهلاً بك في مسابقات القرآن الكريم</h3>' +
            '<p class="sub">اختر طريقة الدخول لتُحفظ نتائجك وتنافس في لوحة الشرف</p>' +
            '<button type="button" class="opt quick" data-choice="quick"><span class="ic">🚀</span><span><b>دخول سريع</b><small>بدون حساب، تبدأ اللعب فوراً</small></span></button>' +
            '<button type="button" class="opt google" data-choice="google"><span class="ic">' + GOOGLE_G + '</span><span><b>الدخول بحساب Google <span class="badge">مميزات أكثر</span></b><small>بطاقتك ونقاطك في لوحة الشرف على كل أجهزتك، واسمك وصورتك تُملآن تلقائياً، ولا تفقد حسابك عند تغيير الهاتف</small></span></button>' +
            '<p class="foot">يمكنك الترقية إلى حساب Google لاحقاً من صفحة «ملفي»</p></div>';
        const mount = () => document.body.appendChild(el);
        if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
        el.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
            el.querySelector('.sheet').classList.add('busy');
            setTimeout(() => el.remove(), 150);
            resolve(btn.dataset.choice);
        }));
    });
}
