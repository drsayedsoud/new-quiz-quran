// Keeps the phone screen on while the app is open (Screen Wake Lock API).
// Browsers only grant it after a user gesture and release it when the tab is hidden, so we
// request on the first interaction and again whenever the page becomes visible.
(function () {
    if (!('wakeLock' in navigator)) return;
    let lock = null;
    async function request() {
        if (lock || document.visibilityState !== 'visible') return;
        try {
            lock = await navigator.wakeLock.request('screen');
            lock.addEventListener('release', () => { lock = null; });
        } catch (e) { /* denied (low battery, etc.) - ignore */ }
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, request, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') request(); });
    request();
})();
