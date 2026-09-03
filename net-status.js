// Connection banner: solo play works offline (bank + pages are cached), live rooms need the internet.
// navigator.onLine is only a hint (some phones report "offline" on a working connection), so before showing the
// banner we confirm with a tiny real request; the banner also clears itself as soon as a request succeeds.
(function () {
    let bar = null;
    let confirmedOffline = false;
    let checking = null;

    function ping() {
        if (checking) return checking;
        checking = new Promise(resolve => {
            const ctrl = 'AbortController' in window ? new AbortController() : null;
            const timer = setTimeout(() => { if (ctrl) ctrl.abort(); resolve(false); }, 4000);
            fetch('./manifest.json?ping=' + Date.now(), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
                .then(r => { clearTimeout(timer); resolve(!!r && (r.ok || r.type === 'opaque')); })
                .catch(() => { clearTimeout(timer); resolve(false); });
        }).finally(() => { checking = null; });
        return checking;
    }
    window.netCheck = ping; // pages can ask "are we really offline?" before refusing an action

    function paint(offline) {
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'net-banner';
            bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9700;display:none;background:#b45309;color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:0.9em;text-align:center;padding:8px 12px;box-shadow:0 4px 14px rgba(0,0,0,0.4);';
            document.body.appendChild(bar);
        }
        const page = location.pathname.toLowerCase();
        const inRoom = !!localStorage.getItem('mp_roomCode') && (page.endsWith('quiz.html') || page.endsWith('lobby.html') || page.endsWith('finish.html'));
        bar.textContent = inRoom
            ? '📡 انقطع الاتصال بالإنترنت. الغرفة المباشرة تحتاج اتصالاً، سنعود تلقائياً عند رجوعه'
            : '📡 لا يوجد اتصال بالإنترنت. اللعب الفردي يعمل بالأسئلة المحفوظة، والتحدي الجماعي يحتاج إنترنت';
        bar.style.display = offline ? 'block' : 'none';
        document.body.style.paddingTop = offline ? '40px' : '';
        // Home: the multiplayer card is greyed out while offline
        const mp = document.querySelector('.home-card.multi');
        if (mp) { mp.style.opacity = offline ? '0.45' : ''; mp.style.pointerEvents = offline ? 'none' : ''; mp.title = offline ? 'يحتاج اتصالاً بالإنترنت' : ''; }
        const daily = document.querySelector('.daily-tile');
        if (daily) daily.title = offline ? 'تحدي اليوم يعمل، لكن لوحة الشرف تحتاج إنترنت' : '';
    }

    async function render() {
        if (navigator.onLine) { confirmedOffline = false; paint(false); return; }
        // The browser says offline: believe it only if a real request fails too
        const ok = await ping();
        confirmedOffline = !ok;
        paint(confirmedOffline);
    }
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    // Re-check while the banner is up, so it disappears as soon as the connection actually works
    setInterval(() => { if (confirmedOffline) render(); }, 15000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
