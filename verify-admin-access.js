const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-xyzab-abcdef123456.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trafico-map-general-v2'
});

const db = admin.firestore();
const auth = admin.auth();

async function diagnose() {
  try {
    console.log('🔍 DIAGNÓSTICO DE PERMISOS ADMIN...\n');

    // 1. Verificar custom claims del admin
    console.log('1️⃣ Verificando custom claims de admin@trafico-map.com...');
    const adminUser = await auth.getUserByEmail('admin@trafico-map.com');
    console.log('📋 Custom Claims:', JSON.stringify(adminUser.customClaims, null, 2));
    console.log('✅ UID:', adminUser.uid);

    // 2. Intentar leer clientes como admin (con sus custom claims)
    console.log('\n2️⃣ Intentando leer clientes desde Firestore...');
    const clientesSnapshot = await db.collection('clientes').get();
    console.log(`✅ Clientes encontrados: ${clientesSnapshot.size}`);
    
    clientesSnapshot.forEach((doc) => {
      console.log(`   - ${doc.id}: ${doc.data().nombre} (estado: ${doc.data().estado})`);
    });

    // 3. Verificar datos específicos de La Plata
    console.log('\n3️⃣ Verificando La Plata en Firestore...');
    const laPlataDoc = await db.collection('clientes').doc('laplatamaps-52a3b').get();
    if (laPlataDoc.exists) {
      console.log('✅ La Plata encontrada:');
      console.log(JSON.stringify(laPlataDoc.data(), null, 2));
    } else {
      console.log('❌ La Plata NO encontrada');
    }

    // 4. Verificar suscripciones
    console.log('\n4️⃣ Intentando leer suscripciones desde Firestore...');
    const subscripcionesSnapshot = await db.collection('suscripciones').get();
    console.log(`✅ Suscripciones encontradas: ${subscripcionesSnapshot.size}`);

    console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    process.exit(0);
  }
}

diagnose();
