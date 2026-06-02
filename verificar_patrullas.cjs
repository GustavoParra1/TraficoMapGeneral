const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'functions', 'trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://trafico-map-general-v2.firebaseio.com'
  });
}

const db = admin.firestore();

async function verificarYLimpiar() {
  try {
    console.log('📊 Verificando patrullas...\n');
    
    const clienteId = 'laplata';
    const patrullasRef = db.collection('clientes').doc(clienteId).collection('patrullas');
    const snapshot = await patrullasRef.get();
    
    console.log(`Total documentos: ${snapshot.size}\n`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`📍 ${doc.id}:`);
      console.log(`   lat: ${data.lat}, lng: ${data.lng}`);
      console.log(`   online: ${data.online}, emergencia: ${data.emergencia}`);
      
      if (data.lat === 0 && data.lng === 0) {
        console.log(`   ⚠️ TIENE CEROS - Actualizando...`);
        await doc.ref.update({
          lat: -34.9213,
          lng: -57.946,
          online: false,
          emergencia: false,
          speed: 0,
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✅ Actualizado`);
      }
      console.log('');
    }
    
    console.log('✅ Verificación completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarYLimpiar();
