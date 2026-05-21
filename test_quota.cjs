const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
db.collection('patrullas_laplata').limit(1).get()
  .then(s => console.log('Conexion exitosa, docs:', s.size))
  .catch(e => console.error('Error:', e.message));
