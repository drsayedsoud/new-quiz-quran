// "Prepare for offline": downloads every question category into IndexedDB so the app works with no connection.
(function () {
    const DB = 'QuranDB', STORE = 'quranData';
    const open = () => new Promise((res, rej) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = e => { const d = e.target.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE); };
        r.onsuccess = e => res(e.target.result);
        r.onerror = () => rej(new Error('IndexedDB'));
    });
    const put = async (key, value) => { const d = await open(); return new Promise(res => { const tx = d.transaction([STORE], 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); };
    const get = async key => { const d = await open(); return new Promise(res => { const r = d.transaction([STORE], 'readonly').objectStore(STORE).get(key); r.onsuccess = e => res(e.target.result || null); r.onerror = () => res(null); }); };

    window.prepareOffline = async function (btn) {
        const label = btn.innerHTML;
        const say = t => btn.innerHTML = t;
        try {
            if (!window.JSZip) throw new Error('مكتبة فك الضغط غير محمّلة');
            say('⏳ جاري التجهيز...');
            const manifest = await (await fetch('./data/manifest.json', { cache: 'no-cache' })).json();
            const cats = Object.keys(manifest.categories || {});
            let done = 0;
            for (const cat of cats) {
                const cached = await get('cat:' + cat);
                if (!(cached && cached.v === manifest.version && Array.isArray(cached.items) && cached.items.length)) {
                    const r = await fetch('./data/' + cat + '.zip');
                    if (!r.ok) throw new Error('تعذر تنزيل ' + cat);
                    const zip = await JSZip.loadAsync(await r.arrayBuffer());
                    const file = zip.file(cat + '.json') || zip.file(Object.keys(zip.files)[0]);
                    await put('cat:' + cat, { v: manifest.version, items: JSON.parse(await file.async('string')) });
                }
                done++;
                say('⏳ ' + done + '/' + cats.length + ' من الأقسام');
            }
            localStorage.setItem('offlineReady', manifest.version);
            say('✅ جاهز للعمل بدون إنترنت');
            setTimeout(() => say(label), 4000);
        } catch (e) {
            say('❌ ' + (e.message || 'فشل التجهيز'));
            setTimeout(() => say(label), 4000);
        }
    };
})();
