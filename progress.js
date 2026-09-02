// Player progress kept on the device: wrong-answer bank, favourites, achievements, stickers, daily streak.
// Classic script shared by quiz.html, finish.html, profile.html and index.html.
(function () {
    const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } };
    const key = q => String(q && q.question || '').trim();
    const slim = q => ({ question: q.question, choice1: q.choice1, choice2: q.choice2, choice3: q.choice3, choice4: q.choice4, correct_answer: q.correct_answer, explanation: q.explanation || '', src: q.src || q.type || '' });

    const Progress = {};

    // ---------- wrong-answer bank (for the smart review mode) ----------
    Progress.getWrong = () => read('wrongBank', []);
    Progress.addWrong = function (q, src) {
        if (!q || !key(q)) return;
        const bank = Progress.getWrong().filter(x => key(x) !== key(q));
        const item = slim(q); item.src = src || item.src; item.misses = ((Progress.getWrong().find(x => key(x) === key(q)) || {}).misses || 0) + 1; item.at = Date.now();
        bank.unshift(item);
        write('wrongBank', bank.slice(0, 300));
    };
    Progress.removeWrong = function (q) { write('wrongBank', Progress.getWrong().filter(x => key(x) !== key(q))); };

    // ---------- favourites ----------
    Progress.getFav = () => read('favBank', []);
    Progress.isFav = q => Progress.getFav().some(x => key(x) === key(q));
    Progress.toggleFav = function (q, src) {
        if (!q || !key(q)) return false;
        const bank = Progress.getFav();
        const i = bank.findIndex(x => key(x) === key(q));
        if (i >= 0) { bank.splice(i, 1); write('favBank', bank); return false; }
        const item = slim(q); item.src = src || item.src; item.at = Date.now();
        bank.unshift(item); write('favBank', bank.slice(0, 500)); return true;
    };
    Progress.removeFav = q => { write('favBank', Progress.getFav().filter(x => key(x) !== key(q))); };

    // ---------- daily streak (days in a row with at least one quiz) ----------
    Progress.touchDay = function () {
        const today = new Date().toISOString().slice(0, 10);
        const s = read('dailyStreak', { last: null, count: 0, best: 0 });
        if (s.last === today) return s;
        const y = new Date(); y.setDate(y.getDate() - 1);
        s.count = s.last === y.toISOString().slice(0, 10) ? s.count + 1 : 1;
        s.last = today; s.best = Math.max(s.best || 0, s.count);
        write('dailyStreak', s); return s;
    };
    Progress.streak = () => read('dailyStreak', { last: null, count: 0, best: 0 });

    // ---------- stats over saved sessions ----------
    Progress.sessions = () => read('userSessions', []).filter(s => s && typeof s.score === 'number');
    Progress.stats = function () {
        const ss = Progress.sessions();
        const withTotal = ss.filter(s => s.total > 0);
        const pct = s => Math.round(s.score / s.total * 100);
        const kids = withTotal.filter(s => String(s.type || '').startsWith('kids'));
        return {
            games: ss.length,
            correct: ss.reduce((a, s) => a + (s.score || 0), 0),
            answered: ss.reduce((a, s) => a + (s.total || 0), 0),
            best: withTotal.length ? Math.max(...withTotal.map(pct)) : 0,
            avg: withTotal.length ? Math.round(withTotal.reduce((a, s) => a + pct(s), 0) / withTotal.length) : 0,
            perfect: withTotal.filter(s => s.score === s.total && s.total >= 5).length,
            bestStreak: Math.max(0, ...ss.map(s => s.bestStreak || 0)),
            kidsStars: kids.reduce((a, s) => a + (pct(s) >= 90 ? 3 : pct(s) >= 60 ? 2 : pct(s) > 0 ? 1 : 0), 0),
            kidsGames: kids.length,
            types: [...new Set(ss.map(s => s.type).filter(Boolean))].length,
            dailyPlayed: ss.filter(s => s.type === 'daily').length,
            reviewCleared: read('reviewCleared', 0),
            favs: Progress.getFav().length,
            streakDays: Progress.streak().best || 0
        };
    };

    // ---------- achievements ----------
    Progress.DEFS = [
        { id: 'first', icon: '🎯', title: 'أول خطوة', desc: 'أنهيت أول مسابقة', check: s => s.games >= 1 },
        { id: 'ten', icon: '🎮', title: 'لاعب مثابر', desc: '10 مسابقات', check: s => s.games >= 10 },
        { id: 'fifty', icon: '🏋️', title: 'محترف', desc: '50 مسابقة', check: s => s.games >= 50 },
        { id: 'c100', icon: '💯', title: 'مئة إجابة', desc: '100 إجابة صحيحة', check: s => s.correct >= 100 },
        { id: 'c500', icon: '🧠', title: 'عقل حافظ', desc: '500 إجابة صحيحة', check: s => s.correct >= 500 },
        { id: 'c2000', icon: '🏛️', title: 'عالم', desc: '2000 إجابة صحيحة', check: s => s.correct >= 2000 },
        { id: 's5', icon: '🔥', title: 'سلسلة نارية', desc: '5 إجابات صحيحة متتالية', check: s => s.bestStreak >= 5 },
        { id: 's10', icon: '⚡', title: 'لا يُوقَف', desc: '10 إجابات صحيحة متتالية', check: s => s.bestStreak >= 10 },
        { id: 'perfect', icon: '🌟', title: 'العلامة الكاملة', desc: 'مسابقة بلا أي خطأ', check: s => s.perfect >= 1 },
        { id: 'perfect5', icon: '👑', title: 'ملك الدقة', desc: '5 مسابقات بلا أخطاء', check: s => s.perfect >= 5 },
        { id: 'd3', icon: '📅', title: 'ثلاثة أيام', desc: 'لعبت 3 أيام متتالية', check: s => s.streakDays >= 3 },
        { id: 'd7', icon: '🗓️', title: 'أسبوع كامل', desc: 'لعبت 7 أيام متتالية', check: s => s.streakDays >= 7 },
        { id: 'daily5', icon: '⭐', title: 'صاحب التحدي', desc: '5 تحديات يومية', check: s => s.dailyPlayed >= 5 },
        { id: 'explorer', icon: '🧭', title: 'مستكشف', desc: 'لعبت في 4 أقسام مختلفة', check: s => s.types >= 4 },
        { id: 'review', icon: '📝', title: 'يتعلم من أخطائه', desc: 'صحّحت 10 أخطاء في وضع المراجعة', check: s => s.reviewCleared >= 10 },
        { id: 'fav', icon: '💛', title: 'جامع الكنوز', desc: 'حفظت 10 أسئلة في المفضلة', check: s => s.favs >= 10 },
        { id: 'stars10', icon: '🎈', title: 'بطل صغير', desc: 'جمعت 10 نجوم في مسابقات الأطفال', check: s => s.kidsStars >= 10 },
        { id: 'stars50', icon: '🦸', title: 'بطل خارق', desc: 'جمعت 50 نجمة في مسابقات الأطفال', check: s => s.kidsStars >= 50 }
    ];
    Progress.unlocked = () => read('achievements', {});
    // Re-evaluates everything and returns the achievements unlocked just now
    Progress.evaluate = function () {
        const stats = Progress.stats();
        const have = Progress.unlocked();
        const fresh = [];
        Progress.DEFS.forEach(d => { if (!have[d.id] && d.check(stats)) { have[d.id] = Date.now(); fresh.push(d); } });
        write('achievements', have);
        return fresh;
    };

    // ---------- kids stickers: one per 3-star kids result, from a growing collection ----------
    Progress.STICKERS = ['🦁', '🐘', '🦒', '🐬', '🦋', '🐝', '🌈', '🚀', '🌙', '⭐', '🌻', '🍉', '🦄', '🐢', '🦜', '🐼', '🎈', '🏆', '🧸', '🎠', '🐙', '🦊', '🍭', '🎨'];
    Progress.stickers = () => read('stickers', []);
    Progress.awardSticker = function () {
        const have = Progress.stickers();
        const left = Progress.STICKERS.filter(s => !have.includes(s));
        if (!left.length) return null;
        const s = left[Math.floor(Math.random() * left.length)];
        have.push(s); write('stickers', have); return s;
    };

    // Called once per finished quiz (from the engine) with the saved session
    Progress.onSessionSaved = function (session) {
        Progress.touchDay();
        const result = { achievements: Progress.evaluate(), sticker: null };
        if (session && String(session.type || '').startsWith('kids') && session.total >= 5 && session.score / session.total >= 0.9) result.sticker = Progress.awardSticker();
        if (session && session.type === 'review' && session.score > 0) write('reviewCleared', read('reviewCleared', 0) + session.score);
        try { sessionStorage.setItem('justUnlocked', JSON.stringify(result)); } catch (e) {}
        return result;
    };

    window.Progress = Progress;
})();
