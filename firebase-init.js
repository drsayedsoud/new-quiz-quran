import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, linkWithPopup, linkWithRedirect, signInWithCredential, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, update, onValue, remove, onDisconnect, increment, query, orderByChild, limitToLast, runTransaction } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { chooseSignIn } from './auth-ui.js';

// Google sign-in runs through our own domain (vercel.json proxies /__/auth/* to firebaseapp.com), so the
// redirect/popup handler is first-party and works on phones and installed apps that block third-party storage.
const OWN_AUTH_DOMAINS = ['new-quiz-quran-one.vercel.app'];
const firebaseConfig = {
  apiKey: "AIzaSyCLjeoM82C5eGuM1vAz92sw6PoqDxkXA3U",
  authDomain: OWN_AUTH_DOMAINS.includes(location.hostname) ? location.hostname : "newclinic1-f25d4.firebaseapp.com",
  projectId: "newclinic1-f25d4",
  storageBucket: "newclinic1-f25d4.firebasestorage.app",
  messagingSenderId: "399508085232",
  appId: "1:399508085232:web:652f7ae3f73e6ca5522535",
  measurementId: "G-TJ25W6BEN5",
  databaseURL: "https://newclinic1-f25d4-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
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

// Phones and installed apps: the Google popup opens in another tab and its result never comes back to the app,
// so there we leave for Google and return (redirect). Desktop browsers keep the popup.
const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// This Google account already owns another player: switch to it (the anonymous progress stays on this device)
async function switchToExisting(e, title) {
  const cred = GoogleAuthProvider.credentialFromError(e);
  if (!cred) { authFailed(e, title); return null; }
  try { const user = (await signInWithCredential(auth, cred)).user; rememberUser(user); return user; }
  catch (e2) { authFailed(e2, title); return null; }
}

async function goRedirect() {
  try { sessionStorage.setItem('auth-redirect', '1'); localStorage.setItem('auth-redirect-at', String(Date.now())); } catch (x) {}
  if (window.UI) window.UI.toast('سننتقل إلى Google للدخول ثم نعود إلى التطبيق...', { type: 'info', ms: 4000 });
  const current = auth.currentUser;
  // If the browser has not left for Google after a while, the redirect was blocked: say so instead of staying silent
  const watchdog = setTimeout(() => {
    if (window.UI) window.UI.dialog({ emoji: '🔐', title: 'لم يفتح الدخول بجوجل', text: 'المتصفح منع الانتقال. جرّب من متصفح Chrome أو Safari مباشرة (وليس من داخل واتساب أو فيسبوك)، أو استخدم الدخول السريع الآن والترقية لاحقاً من «ملفي».', primary: 'حسناً' });
  }, 12000);
  try {
    if (current && current.isAnonymous) await linkWithRedirect(current, google);
    else await signInWithRedirect(auth, google);
  } catch (e) { clearTimeout(watchdog); throw e; }
  return null; // the page leaves
}

export async function signInGoogle() {
  const current = auth.currentUser;
  if (isMobile) {
    try { return await goRedirect(); }
    catch (e) { window.__authError = e; console.warn('google redirect:', e.code || e.message); if (window.UI) window.UI.fail(e, 'تعذر الدخول بجوجل'); return null; }
  }
  try {
    // An anonymous player upgrading keeps the same uid, so the honour-board card and scores carry over
    const user = current && current.isAnonymous
      ? (await linkWithPopup(current, google)).user
      : (await signInWithPopup(auth, google)).user;
    rememberUser(user);
    return user;
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') return switchToExisting(e, 'تعذر الدخول بجوجل');
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
      try { return await goRedirect(); } catch (e2) { authFailed(e2, 'تعذر الدخول بجوجل'); return null; }
    }
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
  // Coming back from Google (redirect flow)? The flag may not survive in every installed app, so also
  // ask the SDK whenever a redirect started within the last few minutes.
  let redirected = false;
  try {
    const startedAt = parseInt(localStorage.getItem('auth-redirect-at') || '0') || 0;
    if (sessionStorage.getItem('auth-redirect') || (startedAt && Date.now() - startedAt < 10 * 60 * 1000)) {
      sessionStorage.removeItem('auth-redirect'); localStorage.removeItem('auth-redirect-at');
      redirected = true;
      // getRedirectResult can stall for a long time on phones when the auth iframe is blocked: cap it
      const r = await withTimeout(getRedirectResult(auth), 8000, null);
      if (r && r.user) {
        rememberUser(r.user);
        if (window.UI) window.UI.toast('تم الدخول بحساب Google: ' + (r.user.displayName || r.user.email || '') + ' ✅', { type: 'ok', ms: 5000 });
        return r.user.uid;
      }
    }
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
      const user = await switchToExisting(e, 'تعذر الدخول بجوجل');
      if (user) { if (window.UI) window.UI.toast('تم الدخول بحساب Google: ' + (user.displayName || user.email || '') + ' ✅', { type: 'ok', ms: 5000 }); return user.uid; }
    } else authFailed(e, 'تعذر الدخول بجوجل');
  }

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
