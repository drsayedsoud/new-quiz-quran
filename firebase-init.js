import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, linkWithPopup, signInWithCredential, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, update, onValue, remove, onDisconnect, increment, query, orderByChild, limitToLast, runTransaction } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { chooseSignIn } from './auth-ui.js';

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
  if (user) localStorage.setItem('mp_userId', user.uid);
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
}
function authFailed(e, title) {
  window.__authError = e; // ui-feedback.js explains later PERMISSION_DENIED errors with this root cause
  console.warn('auth:', e.code || e.message);
  if (window.UI && !QUIET.includes(e.code)) window.UI.fail(e, title);
}
function restoredUser() {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 6000);
    try {
      const stop = onAuthStateChanged(auth,
        user => { clearTimeout(timer); stop(); resolve(user); },
        () => { clearTimeout(timer); resolve(null); });
    } catch (e) { clearTimeout(timer); resolve(null); }
  });
}

export async function signInQuick() {
  try {
    const user = (await signInAnonymously(auth)).user;
    rememberUser(user);
    return user;
  } catch (e) { authFailed(e, 'تعذر الدخول السريع'); return null; }
}

export async function signInGoogle() {
  const current = auth.currentUser;
  try {
    // An anonymous player upgrading keeps the same uid, so the honour-board card and scores carry over
    const user = current && current.isAnonymous
      ? (await linkWithPopup(current, google)).user
      : (await signInWithPopup(auth, google)).user;
    rememberUser(user);
    return user;
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
      // This Google account already owns another player: switch to it
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (cred) {
        try { const user = (await signInWithCredential(auth, cred)).user; rememberUser(user); return user; }
        catch (e2) { authFailed(e2, 'تعذر الدخول بجوجل'); return null; }
      }
    }
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
      // Installed app / strict browser: leave for Google and come back
      try { sessionStorage.setItem('auth-redirect', '1'); } catch (x) {}
      await signInWithRedirect(auth, google);
      return null;
    }
    authFailed(e, 'تعذر الدخول بجوجل');
    return null;
  }
}

export async function signOutUser() {
  try { await signOut(auth); } catch (e) {}
  localStorage.removeItem('mp_userId');
  localStorage.removeItem('auth-choice');
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
  let redirected = false;
  try {
    if (sessionStorage.getItem('auth-redirect')) {
      sessionStorage.removeItem('auth-redirect');
      redirected = true;
      const r = await getRedirectResult(auth);
      if (r && r.user) { rememberUser(r.user); return r.user.uid; }
    }
  } catch (e) { authFailed(e, 'تعذر الدخول بجوجل'); }

  let user = await restoredUser();
  if (user) { rememberUser(user); return user.uid; }
  if (!navigator.onLine) return null;

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
