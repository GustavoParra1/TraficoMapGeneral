const admin = require('firebase-admin');
const cred = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json');

admin.initializeApp({
  credential: admin.credential.cert(cred)
});

const db = admin.firestore();

db.collection('clientes').doc('laplata').update({
  firebase_cliente: {
    apiKey: 'AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA',
    authDomain: 'trafico-map-general-v2.firebaseapp.com',
    projectId: 'trafico-map-general-v2',
    storageBucket: 'trafico-map-general-v2.firebasestorage.app',
    messagingSenderId: '540631719751',
    appId: '1:540631719751:web:bd410f1bbee18e9fabb662',
    databaseURL: 'https://trafico-map-general-v2-default-rtdb.firebaseio.com'
  }
}).then(() => {
  console.log('✅ La Plata actualizado con firebase_cliente');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
