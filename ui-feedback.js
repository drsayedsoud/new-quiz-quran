// Shared user feedback for every page: toasts, a styled dialog that replaces alert()/confirm(),
// a loading overlay with real steps, and a global error boundary that turns raw errors into Arabic.
(function () {
    const KIDS = () => !!(document.body && document.body.classList.contains('kids-mode'));

    function ensureStyles() {
        if (document.getElementById('ui-feedback-styles')) return;
        const s = document.createElement('style');
        s.id = 'ui-feedback-styles';
        s.textContent = `
        #ui-toasts { position: fixed; bottom: 18px; left: 12px; right: 12px; z-index: 10050; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
        .ui-toast { pointer-events: auto; display: flex; align-items: center; gap: 10px; max-width: 460px; width: 100%; padding: 11px 16px; border-radius: 16px; font-family: 'Cairo', sans-serif; font-weight: 700; font-size: 0.93em; line-height: 1.5; color: #fff; background: #26264a; border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 14px 34px rgba(0,0,0,0.45); animation: uiToastIn 0.25s cubic-bezier(0.2,1.1,0.4,1); direction: rtl; text-align: right; }
        .ui-toast.out { animation: uiToastOut 0.22s ease-in forwards; }
        .ui-toast .ic { font-size: 1.25em; flex-shrink: 0; }
        .ui-toast .msg { flex: 1; min-width: 0; }
        .ui-toast button { flex-shrink: 0; border: none; border-radius: 999px; padding: 6px 14px; font-family: inherit; font-weight: 800; cursor: pointer; background: rgba(255,255,255,0.16); color: #fff; }
        .ui-toast.ok { background: linear-gradient(135deg, #0f766e, #10b981); }
        .ui-toast.warn { background: linear-gradient(135deg, #92400e, #d97706); }
        .ui-toast.err { background: linear-gradient(135deg, #7f1d1d, #dc2626); }
        body.kids-mode .ui-toast { background: #fff; color: #2d2b55; border: 3px solid #c8b6ff; }
        body.kids-mode .ui-toast.ok { background: #e6fff5; border-color: #1dd1a1; }
        body.kids-mode .ui-toast.warn { background: #fff8e1; border-color: #feca57; }
        body.kids-mode .ui-toast.err { background: #ffe9e9; border-color: #ff6b6b; }
        body.kids-mode .ui-toast button { background: #5f27cd; color: #fff; }
        @keyframes uiToastIn { from { transform: translateY(20px) scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes uiToastOut { to { transform: translateY(12px); opacity: 0; } }

        #ui-dialog { position: fixed; inset: 0; z-index: 10040; display: none; align-items: center; justify-content: center; padding: 20px; background: rgba(8,10,25,0.72); backdrop-filter: blur(6px); animation: uiFade 0.18s ease-out; direction: rtl; }
        #ui-dialog .box { width: 100%; max-width: 360px; border-radius: 26px; padding: 26px 22px 20px; text-align: center; background: linear-gradient(160deg, #2b2b52 0%, #1b1b36 100%); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 22px 60px rgba(0,0,0,0.55); color: #fff; font-family: 'Cairo', sans-serif; animation: uiPop 0.22s cubic-bezier(0.2,1.1,0.4,1); }
        #ui-dialog .emoji { width: 70px; height: 70px; margin: 0 auto 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.1em; background: linear-gradient(135deg, #4299e1, #7c3aed); box-shadow: 0 10px 24px rgba(124,58,237,0.45); }
        #ui-dialog.danger .emoji { background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 10px 24px rgba(239,68,68,0.4); }
        #ui-dialog h3 { margin: 0 0 6px; font-size: 1.25em; font-weight: 900; }
        #ui-dialog p { margin: 0 0 18px; font-size: 0.93em; color: #b8c0d6; line-height: 1.7; white-space: pre-line; }
        #ui-dialog .btns { display: flex; gap: 10px; }
        #ui-dialog button { flex: 1; padding: 13px 10px; border: none; border-radius: 999px; font-family: inherit; font-weight: 800; font-size: 1em; cursor: pointer; }
        #ui-dialog .primary { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 6px 16px rgba(16,185,129,0.35); }
        #ui-dialog .secondary { background: rgba(255,255,255,0.08); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); }
        body.kids-mode #ui-dialog .box { background: #fff; color: #2d2b55; border: 4px solid #c8b6ff; }
        body.kids-mode #ui-dialog p { color: #5f6c7b; }
        body.kids-mode #ui-dialog .secondary { color: #5f27cd; border-color: #c8b6ff; background: #f4f0ff; }
        @keyframes uiFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes uiPop { from { transform: scale(0.86) translateY(10px); opacity: 0; } to { transform: none; opacity: 1; } }

        .ui-spin { width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 50%; border: 5px solid rgba(255,255,255,0.15); border-top-color: #34d399; animation: uiSpin 0.9s linear infinite; }
        .ui-spin.sm { width: 26px; height: 26px; border-width: 3px; margin: 0 auto 8px; }
        body.kids-mode .ui-spin { border-color: #e2dbff; border-top-color: #5f27cd; }
        @keyframes uiSpin { to { transform: rotate(360deg); } }
        .ui-load { text-align: center; max-width: 340px; padding: 0 16px; font-family: 'Cairo', sans-serif; direction: rtl; }
        .ui-load .t { font-size: 1.25em; font-weight: 800; }
        .ui-load .s { font-size: 0.92em; color: #cbd5e0; margin-top: 4px; min-height: 1.4em; }
        .ui-load .h { font-size: 0.8em; color: #a0aec0; margin-top: 8px; }
        .ui-load .bar { width: 100%; height: 12px; background: rgba(255,255,255,0.15); border-radius: 999px; overflow: hidden; margin: 14px 0 8px; }
        .ui-load .bar > div { height: 100%; width: 0; background: linear-gradient(90deg, #10b981, #34d399); transition: width 0.3s; }
        .ui-load .steps { display: flex; justify-content: center; gap: 6px; margin-top: 14px; }
        .ui-load .steps span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); }
        .ui-load .steps span.on { background: #34d399; }
        .ui-load .steps span.done { background: #10b981; opacity: 0.6; }
        .ui-load button { margin-top: 16px; padding: 12px 26px; border: none; border-radius: 999px; background: #10b981; color: #fff; font-weight: 800; font-family: inherit; font-size: 1em; cursor: pointer; }
        .ui-load button.ghost { margin-top: 10px; background: transparent; color: #a0aec0; padding: 8px 16px; }
        .ui-inline-load { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px; color: #a0aec0; font-size: 0.9em; }
        #ui-loader { position: fixed; inset: 0; z-index: 10030; display: none; align-items: center; justify-content: center; background: rgba(8,10,25,0.8); backdrop-filter: blur(4px); color: #fff; }
        body.kids-mode #ui-loader, body.kids-mode #loading-overlay { color: #2d2b55; background: rgba(255,255,255,0.9); }
        body.kids-mode .ui-load .s, body.kids-mode .ui-load .h { color: #5f6c7b; }`;
        document.head.appendChild(s);
    }
    const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ready = fn => { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); };

    // ---------- toast ----------
    const ICONS = { info: 'ℹ️', ok: '✅', warn: '⚠️', err: '❌' };
    function toast(msg, opts) {
        opts = opts || {};
        ensureStyles();
        ready(() => {
            let wrap = document.getElementById('ui-toasts');
            if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ui-toasts'; document.body.appendChild(wrap); }
            const type = opts.type || 'info';
            const el = document.createElement('div');
            el.className = 'ui-toast ' + type;
            el.setAttribute('role', 'status');
            el.innerHTML = '<span class="ic">' + (opts.icon || ICONS[type] || '') + '</span><span class="msg">' + esc(msg) + '</span>' +
                (opts.action ? '<button type="button">' + esc(opts.action.label) + '</button>' : '');
            const close = () => { if (!el.parentNode) return; el.classList.add('out'); setTimeout(() => el.remove(), 220); };
            if (opts.action) el.querySelector('button').onclick = e => { e.stopPropagation(); close(); try { opts.action.onClick(); } catch (err) { console.error(err); } };
            el.onclick = close;
            while (wrap.children.length >= 3) wrap.firstChild.remove();
            wrap.appendChild(el);
            setTimeout(close, opts.ms || (type === 'err' ? 5500 : type === 'warn' ? 4200 : 3200));
        });
    }

    // ---------- dialog (replaces alert / confirm) ----------
    let dialogResolve = null;
    function dialog(o) {
        o = o || {};
        ensureStyles();
        return new Promise(resolve => ready(() => {
            let el = document.getElementById('ui-dialog');
            if (!el) {
                el = document.createElement('div');
                el.id = 'ui-dialog';
                el.innerHTML = '<div class="box"><div class="emoji"></div><h3></h3><p></p><div class="btns"><button type="button" class="secondary"></button><button type="button" class="primary"></button></div></div>';
                document.body.appendChild(el);
                el.addEventListener('click', e => { if (e.target === el && dialogResolve) dialogResolve(false); });
                document.addEventListener('keydown', e => { if (e.key === 'Escape' && dialogResolve) dialogResolve(false); });
            }
            if (dialogResolve) dialogResolve(false);
            el.classList.toggle('danger', !!o.danger);
            el.querySelector('.emoji').textContent = o.emoji || (o.danger ? '⚠️' : '💬');
            el.querySelector('h3').textContent = o.title || '';
            el.querySelector('p').textContent = o.text || '';
            el.querySelector('p').style.display = o.text ? '' : 'none';
            const primary = el.querySelector('.primary'), secondary = el.querySelector('.secondary');
            primary.textContent = o.primary || 'حسناً';
            secondary.textContent = o.secondary || '';
            secondary.style.display = o.secondary ? '' : 'none';
            const done = v => { dialogResolve = null; el.style.display = 'none'; resolve(v); };
            dialogResolve = done;
            primary.onclick = () => done(true);
            secondary.onclick = () => done(false);
            el.style.display = 'flex';
            setTimeout(() => { try { primary.focus(); } catch (e) {} }, 30);
        }));
    }

    // ---------- loading overlay ----------
    function spinnerHtml(text, sub) {
        ensureStyles();
        return '<div class="ui-inline-load"><div class="ui-spin sm"></div><div>' + esc(text || 'جاري التحميل...') + '</div>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    }
    function host() {
        let el = document.getElementById('loading-overlay');
        if (el) return { el, hide: () => el.classList.add('hidden'), show: () => { el.classList.remove('hidden'); el.style.display = ''; } };
        el = document.getElementById('ui-loader');
        if (!el) { el = document.createElement('div'); el.id = 'ui-loader'; document.body.appendChild(el); }
        return { el, hide: () => el.style.display = 'none', show: () => el.style.display = 'flex' };
    }
    const loader = {
        // {title, sub, hint, progress (0-100 | null), step, steps}
        show(o) {
            o = o || {};
            ensureStyles();
            const h = host();
            let dots = '';
            if (o.steps && o.step) dots = '<div class="steps">' + Array.from({ length: o.steps }, (_, i) => '<span class="' + (i + 1 < o.step ? 'done' : i + 1 === o.step ? 'on' : '') + '"></span>').join('') + '</div>';
            const bar = typeof o.progress === 'number' ? '<div class="bar"><div style="width:' + Math.max(0, Math.min(100, o.progress)) + '%"></div></div>' : '';
            h.el.innerHTML = '<div class="ui-load">' + (bar ? '' : '<div class="ui-spin"></div>') + '<div class="t">' + esc(o.title || 'جاري التحميل...') + '</div>' + bar +
                '<div class="s">' + esc(o.sub || '') + '</div>' + (o.hint ? '<div class="h">' + esc(o.hint) + '</div>' : '') + dots + '</div>';
            h.show();
        },
        // {title, text, retry, home, retryLabel}
        error(o) {
            o = o || {};
            ensureStyles();
            const h = host();
            h.el.innerHTML = '<div class="ui-load"><div style="font-size:2.6em;">' + (o.emoji || '📡') + '</div><div class="t">' + esc(o.title || 'حدث خطأ') + '</div><div class="s">' + esc(o.text || '') + '</div>' +
                (o.retry ? '<button type="button" class="retry">🔄 ' + esc(o.retryLabel || 'إعادة المحاولة') + '</button>' : '') +
                (o.home ? '<br><button type="button" class="ghost home">🏠 الرئيسية</button>' : '') + '</div>';
            if (o.retry) h.el.querySelector('.retry').onclick = o.retry;
            if (o.home) h.el.querySelector('.home').onclick = o.home;
            h.show();
        },
        hide() { host().hide(); }
    };

    // ---------- error explanations ----------
    function explain(err) {
        const code = String((err && (err.code || err.name)) || '');
        const raw = String((err && err.message) || err || '');
        const all = (code + ' ' + raw).toLowerCase();
        if (!navigator.onLine) return { title: 'لا يوجد اتصال بالإنترنت', text: 'تأكد من الاتصال ثم أعد المحاولة. اللعب الفردي يعمل بالأسئلة المحفوظة.', kind: 'offline' };
        if (/permission[_-]denied|permission denied/.test(all)) {
            if (window.__authError) return explain(window.__authError); // the write failed because sign-in failed first
            return { title: 'لا تملك صلاحية لهذه العملية', text: 'قد تحتاج إلى تحديث التطبيق أو إعادة فتحه. إن استمرت المشكلة فأخبرنا.', kind: 'permission' };
        }
        if (/operation-not-allowed|admin-restricted-operation|configuration-not-found/.test(all)) return { title: 'تسجيل الدخول غير مفعّل', text: 'يجب تفعيل الدخول المجهول (Anonymous) من إعدادات Firebase حتى تعمل الغرف ولوحة الشرف.', kind: 'auth' };
        if (/network-request-failed|failed to fetch|load failed|networkerror|network error|err_internet|timeout|timed out|unavailable/.test(all)) return { title: 'مشكلة في الاتصال', text: 'الاتصال بالخادم ضعيف أو متقطع، حاول مرة أخرى بعد قليل.', kind: 'network' };
        if (/quotaexceeded|quota exceeded|storage full|out of memory/.test(all)) return { title: 'مساحة التخزين ممتلئة', text: 'أفرغ بعض المساحة على جهازك أو امسح بيانات المتصفح لهذا الموقع.', kind: 'storage' };
        if (/disconnected|write was canceled|cancel/.test(all)) return { title: 'انقطع الاتصال أثناء الحفظ', text: 'أعد المحاولة عندما يستقر الاتصال.', kind: 'network' };
        if (/not[- ]found|does not exist/.test(all)) return { title: 'العنصر غير موجود', text: 'ربما حُذف أو انتهت صلاحيته.', kind: 'missing' };
        return { title: 'حدث خطأ غير متوقع', text: raw && raw.length < 140 && !/^\[object/.test(raw) ? raw : 'أعد المحاولة، وإن تكرر الخطأ أعد فتح التطبيق.', kind: 'unknown' };
    }
    // Show a friendly error toast for a caught exception (title overrides the generic one)
    function fail(err, title) {
        const why = explain(err);
        console.error(title || why.title, err);
        toast((title || why.title) + ' — ' + why.text, { type: why.kind === 'offline' || why.kind === 'network' ? 'warn' : 'err' });
        return why;
    }

    // ---------- global error boundary ----------
    const IGNORE = /ResizeObserver|AbortError|play\(\)|NotAllowedError|interrupted by a call to pause|user gesture|user didn't interact|^Script error\.?$|Loading chunk|importScripts|Non-Error promise rejection captured with value: (undefined|null)$|The operation was aborted|cancelled|speechSynthesis/i;
    const recent = new Map();
    let shown = [];
    function report(err, source) {
        const text = String((err && err.message) || err || '');
        if (!text || IGNORE.test(text)) return;
        const now = Date.now();
        if ((recent.get(text) || 0) > now - 8000) return;
        recent.set(text, now);
        shown = shown.filter(t => t > now - 30000);
        if (shown.length >= 3) return;
        shown.push(now);
        const why = explain(err);
        console.error('[' + source + ']', err);
        toast(why.title + ' — ' + why.text, { type: why.kind === 'unknown' ? 'err' : 'warn' });
    }
    window.addEventListener('error', e => {
        if (e.target && e.target !== window && e.target.tagName) {
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'script' || tag === 'link') {
                const src = e.target.src || e.target.href || '';
                if (/firebase|gstatic/.test(src)) return; // offline: multiplayer modules simply do not load
                report(new Error('تعذر تحميل جزء من التطبيق'), 'resource');
            }
            return;
        }
        report(e.error || e.message, 'error');
    }, true);
    window.addEventListener('unhandledrejection', e => report(e.reason, 'promise'));

    window.UI = { toast, dialog, closeDialog: () => { if (dialogResolve) dialogResolve(false); }, loader, spinnerHtml, explain, fail, esc };
    ensureStyles();
})();
