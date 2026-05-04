// firebase-config.js
// Configuración de Firebase para el Admin Panel
// Instancia: trafico-map-general-v2

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA",
  authDomain: "trafico-map-general-v2.firebaseapp.com",
  projectId: "trafico-map-general-v2",
  storageBucket: "trafico-map-general-v2.appspot.com",
  messagingSenderId: "540631719751",
  appId: "1:540631719751:web:bd410f1bbee18e9fabb662"
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
