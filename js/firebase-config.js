/**
 * Firebase Configuration
 */
const firebaseConfig = {
  apiKey: "AIzaSyBvCf7nncgnyjPM_nHWLVa99_JyWwBEnlc",
  authDomain: "allied-pnl-dashboard.firebaseapp.com",
  projectId: "allied-pnl-dashboard",
  storageBucket: "allied-pnl-dashboard.firebasestorage.app",
  messagingSenderId: "469215800298",
  appId: "1:469215800298:web:b93378ae8674910689e093"
};

let db, configRef, quartersRef, groupsRef;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  // Firestore collection refs
  configRef = db.collection('config');
  quartersRef = db.collection('quarters');
  groupsRef = db.collection('groups');

  console.log('[Firebase] Initialized successfully. Project:', firebaseConfig.projectId);
} catch (err) {
  console.error('[Firebase] Initialization failed:', err);
}
