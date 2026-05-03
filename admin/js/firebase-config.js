// firebase-config.js
// Configuración de Firebase para el Admin Panel
// Instancia: trafico-map-general-v2

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD_example_key_here",
  authDomain: "trafico-map-general-v2.firebaseapp.com",
  projectId: "trafico-map-general-v2",
  storageBucket: "trafico-map-general-v2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
firebase.initializeApp(FIREBASE_CONFIG);

// Obtenemos referencias
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// Configurar Firestore
db.settings({
  experimentalForceLongPolling: false,
  merge: true
});

console.log("Firebase Admin Config Loaded");
