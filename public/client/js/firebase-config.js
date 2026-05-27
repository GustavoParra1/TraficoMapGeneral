// public/client/js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA",
  authDomain: "trafico-map-general-v2.firebaseapp.com",
  projectId: "trafico-map-general-v2",
  storageBucket: "trafico-map-general-v2.appspot.com",
  messagingSenderId: "540631719751",
  appId: "1:540631719751:web:bd410f1bbee18e9fabb662"
};
if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado desde firebase-config.js');
} else if (typeof firebase !== 'undefined') {
  console.log('ℹ️ Firebase ya estaba inicializado');
}
