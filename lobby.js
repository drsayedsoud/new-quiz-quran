// Waiting room: everyone (host included) identifies themselves here, then the host starts the game
import { db, ref, set, update, remove, onValue, onDisconnect } from './firebase-init.js';
import {
    AVATARS, getLocalUserId, saveRoomToLocal, clearMpState, isRoomExpired,
    categoryLabel, categoryIcon, modeLabel, modeDescription, escapeHtml, lobbyUrl, whatsappInviteUrl
} from './mp-common.js';

const urlParams = new URLSearchParams(window.location.search);
const roomCode = (urlParams.get('room') || '').replace(/\D/g, '');
if (!roomCode) window.location.href = 'index.html';

const myId = getLocalUserId();
let isHost = false;
let joined = false;
let starting = false;
let leaving = false;
let room = null;
let selectedAvatar = localStorage.getItem('mp_avatar') || AVATARS[0];
let presenceDisconnect = null;
let unsubscribeRoom = null;

const $ = id => document.getElementById(id);

// ---------- UI helpers ----------
function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => el.style.display = 'none', 2200);
}

function uiDialog(message, buttons) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'ui-dialog-overlay';
        overlay.innerHTML = `<div class="ui-dialog"><div class="ui-dialog-msg">${escapeHtml(message)}</div><div class="ui-dialog-btns"></div></div>`;
        const btnBox = overlay.querySelector('.ui-dialog-btns');
        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.textContent = b.label;
            btn.className = 'ui-dialog-btn ' + (b.kind || '');
            btn.onclick = () => { overlay.remove(); resolve(b.value); };
            btnBox.appendChild(btn);
        });
        document.body.appendChild(overlay);
    });
}
function uiConfirm(message, yesLabel) {
    return uiDialog(message, [{ label: yesLabel || 'نعم', value: true, kind: 'danger' }, { label: 'رجوع', value: false }]);
}

function goHome(message) {
    if (leaving) return;
    leaving = true;
    if (unsubscribeRoom) unsubscribeRoom();
    clearMpState();
    const go = () => window.location.href = 'index.html';
    if (!message) { go(); return; }
    uiDialog(message, [{ label: 'حسناً', value: true }]).then(go);
    setTimeout(go, 4000);
}

function renderAvatars() {
    const box = $('avatars');
    box.innerHTML = '';
    AVATARS.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'avatar-option' + (src === selectedAvatar ? ' selected' : '');
        img.onclick = () => {
            selectedAvatar = src;
            box.querySelectorAll('.avatar-option').forEach(el => el.classList.toggle('selected', el.src.endsWith(src)));
        };
        box.appendChild(img);
    });
}

function isKidsRoom() {
    return String((room && room.settings && room.settings.category) || '').startsWith('kids');
}
function kidsPlay(name) { if (isKidsRoom() && window.KidsTheme) window.KidsTheme.play(name); }

function renderRoomInfo() {
    const s = room.settings || {};
    if (isKidsRoom() && window.KidsTheme) {
        window.KidsTheme.activate();
        document.title = 'غرفة الأبطال الصغار 🎈';
        $('identity-panel').querySelector('h2').textContent = '🦸 اختر بطلك واكتب اسمك';
        $('identity-panel').querySelector('p').textContent = 'اضغط على الصورة التي تحبها ثم اكتب اسمك';
        $('join-btn').textContent = '🎉 أنا جاهز!';
        $('start-game-btn').textContent = '🚀 انطلاااق!';
        $('cancel-room-btn').textContent = '❌ إغلاق الغرفة';
        $('countdown-overlay').querySelector('div').textContent = '🎈 استعدوا يا أبطال! نبدأ خلال';
    }
    $('chip-category').textContent = categoryIcon(s.category) + ' ' + categoryLabel(s.category);
    $('chip-mode').textContent = modeLabel(s.mode, s.val);
    $('mode-desc').textContent = modeDescription(s.mode, s.val);
    const chips = $('chip-mode').closest('.chips');
    if (chips && !$('chip-extra')) {
        chips.insertAdjacentHTML('beforeend', `<span class="chip" id="chip-extra">⏳ <b>${parseInt(s.qTime) || 30} ث</b> لكل سؤال</span><span class="chip" id="chip-max">👥 حتى <b>${parseInt(s.maxPlayers) || 10}</b> لاعبين</span>`);
    }
    if (s.roomName) {
        const h = $('lobby-title');
        h.dataset.roomName = s.roomName;
        document.title = s.roomName + ' - غرفة الانتظار';
    }
}

function renderPlayers() {
    const list = $('players-list');
    const players = room.players || {};
    const entries = Object.entries(players).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
    list.innerHTML = '';
    entries.forEach(([id, p]) => {
        const card = document.createElement('div');
        const host = id === room.hostId;
        card.className = 'player-card' + (host ? ' is-host' : '') + (id === myId ? ' is-me' : '');
        card.innerHTML = `
            ${host ? '<div class="crown">👑</div>' : ''}
            <img src="${escapeHtml(p.avatar || AVATARS[0])}" alt="">
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="tag">${host ? 'المضيف' : ''}${id === myId ? (host ? ' • أنت' : 'أنت') : ''}</div>
        `;
        list.appendChild(card);
    });
    if (entries.length < 2) {
        const slot = document.createElement('div');
        slot.className = 'empty-slot';
        slot.textContent = entries.length === 0 ? 'لا يوجد لاعبون بعد' : 'بانتظار لاعب آخر...';
        list.appendChild(slot);
    }
    if (entries.length > (renderPlayers.lastCount || 0) && renderPlayers.lastCount !== undefined) kidsPlay('pop');
    renderPlayers.lastCount = entries.length;
    $('players-count').textContent = entries.length;

    // Host controls
    if (isHost && joined) {
        const canStart = entries.length >= 2;
        $('start-game-btn').disabled = !canStart || starting;
        $('start-hint').textContent = canStart
            ? 'الجميع جاهز! اضغط للبدء وسينتقل كل اللاعبين معاً'
            : 'شارك الكود وانتظر انضمام لاعب واحد على الأقل';
    }
}

function renderControls() {
    $('identity-panel').style.display = joined ? 'none' : 'block';
    $('host-controls').style.display = (isHost && joined) ? 'block' : 'none';
    $('guest-controls').style.display = (!isHost && joined) ? 'block' : 'none';
    const roomName = room && room.settings && room.settings.roomName;
    $('lobby-title').textContent = roomName ? (isHost ? '👑 ' : '') + roomName : (isHost ? '👑 أنت مضيف الغرفة' : 'غرفة الانتظار');
    $('leave-btn').textContent = isHost ? '🔙 إلغاء وخروج' : '🔙 مغادرة';
}

// ---------- Presence: player entry is removed if the tab closes while waiting ----------
function setupPresence() {
    const playerRef = ref(db, `rooms/${roomCode}/players/${myId}`);
    onValue(ref(db, '.info/connected'), async (snap) => {
        if (!snap.val() || !joined || starting) return;
        try {
            presenceDisconnect = onDisconnect(playerRef);
            await presenceDisconnect.remove();
            // Re-add ourselves after a reconnect (the disconnect handler may have removed us)
            await update(playerRef, {
                name: localStorage.getItem('mp_playerName') || 'لاعب',
                avatar: selectedAvatar,
                score: 0, answered: 0, hasFinished: false,
                joinedAt: (room && room.players && room.players[myId] && room.players[myId].joinedAt) || Date.now()
            });
        } catch (e) { console.error('presence error', e); }
    });
}

async function cancelPresence() {
    if (presenceDisconnect) {
        try { await presenceDisconnect.cancel(); } catch (e) { console.error(e); }
        presenceDisconnect = null;
    }
}

// ---------- Actions ----------
async function joinRoom() {
    const name = $('player-name').value.trim();
    if (!name) { $('player-name').focus(); toast('يرجى كتابة اسمك أولاً'); return; }
    if (room.status !== 'waiting') { toast('المسابقة بدأت بالفعل'); return; }
    const maxPlayers = parseInt(room.settings && room.settings.maxPlayers) || 10;
    if (Object.keys(room.players || {}).length >= maxPlayers && !(room.players && room.players[myId])) {
        toast('الغرفة ممتلئة (الحد ' + maxPlayers + ' لاعبين)'); $('join-btn').disabled = false; return;
    }
    $('join-btn').disabled = true;
    try {
        await set(ref(db, `rooms/${roomCode}/players/${myId}`), {
            name, avatar: selectedAvatar, score: 0, answered: 0, hasFinished: false, joinedAt: Date.now()
        });
        localStorage.setItem('mp_playerName', name);
        localStorage.setItem('mp_avatar', selectedAvatar);
        joined = true;
        setupPresence();
        renderControls();
        toast('تم الانضمام بنجاح 🎉');
        kidsPlay('join');
        if (isKidsRoom() && window.KidsTheme) window.KidsTheme.burst(window.innerWidth / 2, window.innerHeight / 2, 18);
    } catch (e) {
        console.error(e);
        alert('حدث خطأ أثناء الانضمام');
        $('join-btn').disabled = false;
    }
}

async function startGame() {
    const count = Object.keys(room.players || {}).length;
    if (count < 2) { toast('تحتاج لاعباً آخر على الأقل'); return; }
    $('start-game-btn').disabled = true;
    $('start-hint').textContent = 'جاري بدء المسابقة...';
    try {
        await update(ref(db, `rooms/${roomCode}`), { status: 'playing', startedAt: Date.now() });
    } catch (e) {
        $('start-game-btn').disabled = false;
        alert('خطأ في بدء اللعبة');
    }
}

async function leaveRoom() {
    if (isHost) {
        if (!(await uiConfirm('سيتم إلغاء الغرفة لجميع اللاعبين. هل أنت متأكد؟', 'نعم، إلغاء الغرفة'))) return;
        leaving = true;
        if (unsubscribeRoom) unsubscribeRoom();
        await cancelPresence();
        try { await remove(ref(db, `rooms/${roomCode}`)); } catch (e) { console.error(e); }
    } else if (joined) {
        if (!(await uiConfirm('هل تريد مغادرة الغرفة؟', 'نعم، مغادرة'))) return;
        leaving = true;
        if (unsubscribeRoom) unsubscribeRoom();
        await cancelPresence();
        try { await remove(ref(db, `rooms/${roomCode}/players/${myId}`)); } catch (e) { console.error(e); }
    }
    clearMpState();
    window.location.href = 'index.html';
}

async function runCountdownAndGo() {
    starting = true;
    await cancelPresence(); // navigating away must NOT remove us from the room
    saveRoomToLocal(roomCode, room);
    const overlay = $('countdown-overlay');
    const num = $('countdown-num');
    overlay.style.display = 'flex';
    let n = 3;
    num.textContent = n;
    kidsPlay('tick');
    const timer = setInterval(() => {
        n--;
        if (n <= 0) {
            clearInterval(timer);
            kidsPlay('go');
            num.textContent = isKidsRoom() ? '🚀' : '!';
            setTimeout(() => window.location.href = 'quiz.html', isKidsRoom() ? 500 : 0);
        } else {
            kidsPlay('tick');
            num.textContent = n;
            num.style.animation = 'none';
            void num.offsetWidth; // restart the beat animation
            num.style.animation = '';
        }
    }, 1000);
}

// ---------- Wire up ----------
$('display-room-code').textContent = roomCode;
$('display-room-code').onclick = () => navigator.clipboard?.writeText(roomCode).then(() => toast('تم نسخ الكود ✅'));
$('copy-link-btn').onclick = () => navigator.clipboard?.writeText(lobbyUrl(roomCode)).then(() => toast('تم نسخ الرابط ✅'));
$('whatsapp-invite-btn').onclick = () => window.open(whatsappInviteUrl(roomCode), '_blank');
$('join-btn').onclick = joinRoom;
$('player-name').value = localStorage.getItem('mp_playerName') || '';
$('player-name').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
$('start-game-btn').onclick = startGame;
$('cancel-room-btn').onclick = leaveRoom;
$('leave-btn').onclick = leaveRoom;
renderAvatars();

// ---------- Live room subscription ----------
unsubscribeRoom = onValue(ref(db, `rooms/${roomCode}`), (snapshot) => {
    if (leaving) return;
    const data = snapshot.val();
    if (!data) { goHome('تم إغلاق الغرفة من قبل المضيف.'); return; }
    if (isRoomExpired(data)) { goHome('انتهت صلاحية هذه الغرفة.'); return; }
    if (data.status === 'closed') { goHome('قام المضيف بإغلاق الغرفة.'); return; }

    const firstLoad = room === null;
    room = data;
    isHost = data.hostId === myId;
    const wasJoined = joined;
    joined = !!(data.players && data.players[myId]);

    if (firstLoad) {
        saveRoomToLocal(roomCode, data);
        renderRoomInfo();
        if (joined) setupPresence();
    }
    if (wasJoined && !joined && !starting) {
        // We got removed (e.g. presence cleanup after a reconnect race): let the user re-join
        toast('انقطع الاتصال، يرجى الدخول مرة أخرى');
    }

    if (data.status === 'playing') {
        if (joined) { if (!starting) runCountdownAndGo(); return; }
        // The host, or a player who was in this room before (e.g. reloaded the page), is let back in
        const wasInThisRoom = localStorage.getItem('mp_roomCode') === roomCode && localStorage.getItem('mp_playerName');
        if ((isHost || wasInThisRoom) && !starting) {
            starting = true;
            set(ref(db, `rooms/${roomCode}/players/${myId}`), {
                name: localStorage.getItem('mp_playerName') || (isHost ? 'المضيف' : 'لاعب'),
                avatar: selectedAvatar, score: 0, answered: 0, hasFinished: false, joinedAt: Date.now()
            }).then(() => { saveRoomToLocal(roomCode, data); window.location.href = 'quiz.html'; })
              .catch(() => goHome('تعذر الرجوع إلى المسابقة.'));
            return;
        }
        goHome('بدأت المسابقة قبل انضمامك. اطلب من المضيف إنشاء غرفة جديدة.');
        return;
    }
    if (data.status === 'finished' && !joined) { goHome('انتهت هذه المسابقة بالفعل.'); return; }

    renderControls();
    renderPlayers();
});
