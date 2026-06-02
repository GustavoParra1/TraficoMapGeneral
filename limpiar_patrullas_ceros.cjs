const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase
const serviceAccountPath = path.join(__dirname, 'functions', 'trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://trafico-map-general-v2.firebaseio.com'
  });
}

const db = admin.firestore();

async function limpiarPatrullas() {
  try {
    console.log('🧹 Iniciando limpieza de patrullas con lat/lng=0...');
    
    const clienteId = 'laplata';
    const patrullasRef = db.collection('clientes').doc(clienteId).collection('patrullas');
    const snapshot = await patrullasRef.get();
    
    console.log(`📊 Total de documentos: ${snapshot.size}`);
    
    let limpiados = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (data.lat === 0 || data.lng === 0) {
        // Resetear a coordenadas de La Plata (centro) como valores iniciales
        await doc.ref.update({
          lat: -34.9213,
          lng: -57.946,
          online: false,
          emergencia: false,
          speed: 0,
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Limpiado: ${doc.id} - Ahora en coordenadas de La Plata`);
        limpiados++;
      }
    }
    
    console.log(`\n✅ Limpieza completada: ${limpiados} patrullas actualizadas`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

limpiarPatrullas();
