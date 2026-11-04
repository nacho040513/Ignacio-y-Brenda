import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAFb2nTmv_GVWvihFtipmFgoeLkXUfgr24',
  authDomain: 'bd-amor09.firebaseapp.com',
  projectId: 'bd-amor09',
  storageBucket: 'bd-amor09.firebasestorage.app',
  messagingSenderId: '481511395643',
  appId: '1:481511395643:web:7ea2cb2eb1e0e32edae71e',
  measurementId: 'G-Y7VL6GL3E4'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
