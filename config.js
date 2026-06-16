// config.js — Firebase инициализация

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, get, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain:        "tarkovmap-376d0.firebaseapp.com",
  projectId:         "tarkovmap-376d0",
  storageBucket:     "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId:             "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL:       "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

const app      = initializeApp(firebaseConfig);
const db       = getDatabase(app);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

export {
  db, auth, provider,
  ref, get, push, onValue, update, remove,
  signInWithPopup, onAuthStateChanged, signOut
};
