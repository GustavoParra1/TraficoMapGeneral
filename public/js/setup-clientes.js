/**
 * Script para crear la colección de clientes en Firestore
 * Se ejecuta automáticamente al cargar
 */

async function setupClientesCollection() {
  try {
    console.log('🔧 ===== INICIANDO SETUP DE CLIENTES =====');
    
    // Datos de prueba
    const clientesData = [
      {
        email: 'admin@laplatamaps.com.ar',
        ciudad: 'la-plata',
        rol: 'cliente',
        firebase_config: null,
        nombre: 'La Plata Maps'
      },
      {
        email: 'cliente@cordoba.com',
        ciudad: 'cordoba',
        rol: 'cliente',
        firebase_config: null,
        nombre: 'Córdoba Maps'
      },
      {
        email: 'cliente@mardelplata.com',
        ciudad: 'mar-del-plata',
        rol: 'cliente',
        firebase_config: null,
        nombre: 'Mar del Plata Maps'
      }
    ];
    
    // Crear cada cliente
    for (const cliente of clientesData) {
      try {
        await db.collection('clientes').doc(cliente.email).set({
          ...cliente,
          created_at: firebase.firestore.Timestamp.now()
        });
        console.log(`✅ Cliente creado/actualizado: ${cliente.email} (${cliente.ciudad})`);
      } catch (err) {
        console.error(`❌ Error creando cliente ${cliente.email}:`, err);
      }
    }
    
    // Verificar que se crearon
    console.log('🔍 Verificando colección...');
    const snapshot = await db.collection('clientes').get();
    console.log(`📋 Total de clientes en Firestore: ${snapshot.size}`);
    
    snapshot.forEach(doc => {
      console.log(`   ✓ ${doc.id} → ${doc.data().ciudad}`);
    });
    
    console.log('✅ ===== SETUP COMPLETADO =====');
    console.log('📝 Elementos de prueba:');
    console.log('   Email: admin@laplatamaps.com.ar (La Plata)');
    console.log('   Email: cliente@cordoba.com (Córdoba)');
    console.log('   Email: cliente@mardelplata.com (Mar del Plata)');
    
    return true;
  } catch (error) {
    console.error('❌ Error en setupClientesCollection:', error);
    return false;
  }
}

// Esperar a que Firebase esté listo
function waitForFirebase() {
  return new Promise((resolve) => {
    let intentos = 0;
    const checkFirebase = setInterval(() => {
      if (window.db && typeof window.db.collection === 'function') {
        clearInterval(checkFirebase);
        console.log('✅ Firebase Firestore está listo');
        resolve();
      }
      intentos++;
      if (intentos > 100) {
        clearInterval(checkFirebase);
        console.error('❌ Timeout esperando Firestore');
        resolve();
      }
    }, 100);
  });
}

// Ejecutar al cargar la página
window.addEventListener('load', async () => {
  console.log('📄 Página cargada, esperando Firebase...');
  await waitForFirebase();
  
  // Ejecutar setup
  await setupClientesCollection();
});

// También disponible manualmente en consola
window.setupClientes = setupClientesCollection;
