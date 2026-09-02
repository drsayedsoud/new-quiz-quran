// Connection banner: solo play works offline (bank + pages are cached), live rooms need the internet.
(function () {
    let bar = null;
    function render() {
        const offline = !navigator.onLine;
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
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
