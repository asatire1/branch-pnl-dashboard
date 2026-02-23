/**
 * Firebase Configuration
 * Replace the config below with your actual Firebase project config.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBvCf7nncgnyjPM_nHWLVa99_JyWwBEnlc",
  authDomain: "allied-pnl-dashboard.firebaseapp.com",
  projectId: "allied-pnl-dashboard",
  storageBucket: "allied-pnl-dashboard.firebasestorage.app",
  messagingSenderId: "469215800298",
  appId: "1:469215800298:web:b93378ae8674910689e093"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firestore collection refs
const configRef = db.collection('config');
const quartersRef = db.collection('quarters');
const groupsRef = db.collection('groups');
