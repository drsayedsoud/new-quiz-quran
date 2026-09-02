import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, set, get, child, update, onValue, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

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

export { db, ref, set, get, child, update, onValue, remove, onDisconnect };
