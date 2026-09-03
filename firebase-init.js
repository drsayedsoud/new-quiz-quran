import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, linkWithPopup, signInWithCredential, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, update, onValue, remove, onDisconnect, increment, query, orderByChild, limitToLast, runTransaction, forceLongPolling } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { chooseSignIn } from './auth-ui.js';

// Same setup as the dental-quiz app, where Google sign-in is known to work well: default authDomain + popup.
const firebaseConfig = {
  apiKey: "AIzaSyCLjeoM82C5eGuM1vAz92sw6PoqDxkXA3U",
  authDomain: "newclinic1-f25d4.firebaseapp.com",
  projectId: "newclinic1-f25d4",
  storageBucket: "newclinic1-f25d4.firebasestorage.app",
  messagingSenderId: "399508085232",
  appId: "1:399508085232:web:652f7ae3f73e6ca5522535",
  measurementId: "G-TJ25W6BEN5",
  databaseURL: "https://newclinic1-f25d4-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

// Some mobile networks block the Realtime Database WebSocket while plain HTTPS works; the SDK's own fallback can
// stall for a long time. Remember per device: once the socket fails to connect, switch to long polling for good.
const RTDB_TRANSPORT = localStorage.getItem('rtdb_transport');
if (RTDB_TRANSPORT === 'lp') { try { forceLongPolling(); } catch (e) {} }
const db = getDatabase(app);
window.__rtdbTransport = RTDB_TRANSPORT === 'lp' ? 'long-polling' : 'websocket';

// Error reporting hook for ui-feedback.js: every device sends its errors to /errors (admin-only readable).
// At most 8 per page load, only when signed in; failures here are swallowed.
let reported = 0;
window.__reportError = async function (entry) {
  try {
    if (reported >= 8 || !auth.currentUser) return;
    reported++;
    const e = { at: Date.now(), page: String(location.pathname + location.search).slice(0, 120), msg: String(entry.msg || '').slice(0, 500), kind: String(entry.kind || 'error').slice(0, 30), ua: navigator.userAgent.slice(0, 200), uid: auth.currentUser.uid };
    if (entry.stack) e.stack = String(entry.stack).slice(0, 1500);
    if (window.APP_VERSION) e.ver = String(window.APP_VERSION).slice(0, 30);
    const key = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await set(ref(db, 'errors/' + key), e);
  } catch (x) { /* never let error reporting cause errors */ }
};
if (window.__errorQueue && window.__errorQueue.length) { const q = window.__errorQueue.splice(0); q.forEach(e => window.__reportError(e)); }
if (RTDB_TRANSPORT !== 'lp') {
  let connected = false;
  try { onValue(ref(db, '.info/connected'), s => { if (s.val() === true) connected = true; }); } catch (e) {}
  setTimeout(() => {
    if (connected || !navigator.onLine) return;
    localStorage.setItem('rtdb_transport', 'lp');
    console.warn('Realtime Database socket did not connect in 8s: switching this device to long polling');
    const page = location.pathname.toLowerCase();
    const safeToReload = !page.endsWith('quiz.html'); // never restart a quiz in progress; the next page uses the new transport
    if (safeToReload) {
      if (window.UI) window.UI.toast('الشبكة تحجب الاتصال المباشر، سنستخدم طريقة بديلة... ⏳', { type: 'info', ms: 3000 });
      setTimeout(() => location.reload(), 900);
    }
  }, 8000);
}
const auth = getAuth(app);
const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: 'select_account' });

// ---- Accounts ----
// The database rules only accept writes from a signed-in user (auth.uid), so every device gets an account:
// a "quick" anonymous one by default, or a Google one (same player on every device, name/photo prefilled).
// The uid becomes the player id that mp-common.getLocalUserId() hands out.
// Firebase console: Authentication > Sign-in method > enable Anonymous and Google.
const isHome = /\/(index\.html)?$/i.test(location.pathname);
const QUIET = ['auth/network-request-failed', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];

function rememberUser(user) {
  if (user) {
    localStorage.setItem('mp_userId', user.uid);
    // Remember that this device belongs to a Google account, so a slow restore never downgrades it to a guest
    if (!user.isAnonymous && user.email) { localStorage.setItem('lastGoogleEmail', user.email); if (user.displayName) localStorage.setItem('lastGoogleName', user.displayName); }
  }
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
}
function authFailed(e, title) {
  window.__authError = e; // ui-feedback.js explains later PERMISSION_DENIED errors with this root cause
  console.warn('auth:', e.code || e.message);
  if (window.UI && !QUIET.includes(e.code)) window.UI.fail(e, title);
}
// Nothing in sign-in may hang the app: every network step gets a hard deadline
const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise(res => setTimeout(() => res(fallback), ms))]);

// Wait for the SDK to finish restoring the persisted session (IndexedDB) before deciding anything.
// A short wait here used to create a fresh anonymous user on slow devices, silently replacing a Google login.
async function restoredUser() {
  try {
    if (typeof auth.authStateReady === 'function') await withTimeout(auth.authStateReady(), 15000, null);
    else await withTimeout(new Promise(res => { const stop = onAuthStateChanged(auth, u => { stop(); res(u); }, () => res(null)); }), 15000, null);
  } catch (e) { /* fall through */ }
  return auth.currentUser;
}

export async function signInQuick() {
  try {
    const cred = await withTimeout(signInAnonymously(auth), 12000, null);
    if (!cred) { console.warn('anonymous sign-in timed out'); return null; }
    rememberUser(cred.user);
    return cred.user;
  } catch (e) { authFailed(e, 'تعذر الدخول السريع'); return null; }
}

// This Google account already owns another player: switch to it (the anonymous progress stays on this device)
async function switchToExisting(e, title) {
  const cred = GoogleAuthProvider.credentialFromError(e);
  if (!cred) { authFailed(e, title); return null; }
  try { const user = (await signInWithCredential(auth, cred)).user; rememberUser(user); return user; }
  catch (e2) { authFailed(e2, title); return null; }
}

// Exactly like the dental-quiz app: one popup (account chooser) on every device.
// A quick (anonymous) player upgrading is linked through the same popup so the uid — and with it the
// honour-board card and scores — is kept; if that Google account already exists, we switch to it.
export async function signInGoogle() {
  const current = auth.currentUser;
  try {
    const user = current && current.isAnonymous
      ? (await linkWithPopup(current, google)).user
      : (await signInWithPopup(auth, google)).user;
    rememberUser(user);
    if (window.UI) window.UI.toast('تم الدخول بحساب Google: ' + (user.displayName || user.email || '') + ' ✅', { type: 'ok', ms: 5000 });
    return user;
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
      const user = await switchToExisting(e, 'تعذر الدخول بجوجل');
      if (user && window.UI) window.UI.toast('تم الدخول بحساب Google: ' + (user.displayName || user.email || '') + ' ✅', { type: 'ok', ms: 5000 });
      return user;
    }
    if (e.code === 'auth/popup-blocked') {
      if (window.UI) window.UI.dialog({ emoji: '🔐', title: 'المتصفح منع نافذة الدخول', text: 'اسمح بالنوافذ المنبثقة لهذا الموقع، أو افتحه من متصفح Chrome/Safari مباشرة (وليس من داخل واتساب أو فيسبوك) ثم حاول مرة أخرى.', primary: 'حسناً' });
      return null;
    }
    if (QUIET.includes(e.code)) return null; // the player closed the popup
    authFailed(e, 'تعذر الدخول بجوجل');
    return null;
  }
}

export async function signOutUser() {
  try { await signOut(auth); } catch (e) {}
  localStorage.removeItem('mp_userId');
  localStorage.removeItem('auth-choice');
  localStorage.removeItem('lastGoogleEmail'); localStorage.removeItem('lastGoogleName');
  location.href = 'index.html';
}

// The owner: a Google-verified email. database.rules.json grants the same email moderation rights server-side.
const ADMIN_EMAILS = ['drsayedsoudnew@gmail.com'];
export function isAdmin() {
  const u = auth.currentUser;
  return !!(u && !u.isAnonymous && u.email && u.emailVerified && ADMIN_EMAILS.includes(u.email.toLowerCase()));
}
export const currentUser = () => auth.currentUser;
export const isGoogleUser = () => !!(auth.currentUser && !auth.currentUser.isAnonymous);
export function accountLabel() {
  const u = auth.currentUser;
  if (!u) return 'غير مسجّل';
  if (u.isAnonymous) return 'دخول سريع (بدون حساب)';
  return u.displayName || u.email || 'حساب Google';
}

async function ensureSignedIn() {
  try { sessionStorage.removeItem('auth-redirect'); localStorage.removeItem('auth-redirect-at'); } catch (x) {} // leftovers of the old redirect flow
  const redirected = false;

  let user = await restoredUser();
  if (user) { rememberUser(user); return user.uid; }

  // This device signed in with Google before but the session is gone: never replace it with a guest account
  // (that would hide the admin tools and orphan the honour-board card). Ask for Google again instead.
  const lastGoogle = localStorage.getItem('lastGoogleEmail');
  if (lastGoogle) {
    if (window.UI) window.UI.toast('انتهت جلسة حساب Google (' + lastGoogle + ')، اضغط للدخول مجدداً', { type: 'warn', ms: 10000, icon: '🔐', action: { label: 'دخول', onClick: () => signInGoogle() } });
    return null;
  }
  // navigator.onLine lies on some phones (reports offline on a working connection), so never bail on it:
  // a real outage makes signInAnonymously fail fast with auth/network-request-failed, which is silent.

  // First time on this device: the home page lets the player choose; invite links and other pages start quickly
  if (isHome && window.UI && !localStorage.getItem('auth-choice') && !redirected) {
    const choice = await chooseSignIn();
    localStorage.setItem('auth-choice', choice);
    if (choice === 'google') {
      user = await signInGoogle();
      if (user) return user.uid;
    }
  }
  user = await signInQuick();
  return user ? user.uid : null;
}

// Top-level await: every module that imports db also waits for the uid, so no write goes out unsigned.
// Never let a sign-in failure kill this module: the pages must still load (reads and solo play work without auth).
let authUid = null;
try { authUid = await ensureSignedIn(); }
catch (e) { authFailed(e, 'تعذر تسجيل الدخول'); }

export { db, auth, authUid, ref, set, get, child, update, onValue, remove, onDisconnect, increment, query, orderByChild, limitToLast, runTransaction };
