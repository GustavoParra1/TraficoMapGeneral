/**
 * Firebase Configuration (Compat)
 * Inicializa Firebase usando scripts CDN de compat
 */

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA",
  authDomain: "trafico-map-general-v2.firebaseapp.com",
  projectId: "trafico-map-general-v2",
  storageBucket: "trafico-map-general-v2.appspot.com",
  messagingSenderId: "555701169844",
  appId: "1:555701169844:web:0df09c7d73ef0de19f88b2"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Variables globales de Firebase
const auth = firebase.auth();
const db = firebase.firestore();

console.log('✅ Firebase Admin Config Loaded');
