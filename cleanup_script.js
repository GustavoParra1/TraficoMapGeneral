// Script para limpiar datos viejos en Firestore via Admin Panel
// Ejecútalo en la consola del Admin Panel (~admin/):

async function limpiarCamerasMdelPlata() {
  const db = firebase.firestore();
  
  // CONFIRMACIÓN
  if (!confirm('🗑️ ADVERTENCIA: Esto eliminará TODOS los datos de la colección "cameras"\n\n¿Estás seguro?')) {
    console.log('❌ Operación cancelada');
    return;
  }
  
  try {
    console.log('🔄 Obteniendo clientes...');
    const clientesSnap = await db.collection('clientes').get();
    
    console.log(`📋 Encontrados ${clientesSnap.size} clientes`);
    
    for (const clientDoc of clientesSnap.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      console.log(`\n🔍 Procesando cliente: ${clientData.nombre} (${clientData.email})`);
      
      // Obtener todas las colecciones de datos del cliente
      const collections = [
        'cameras',
        'cameras_privadas',
        'siniestros',
        'semaforos',
        'colegios_escuelas',
        'corredores_escolares',
        'flujo',
        'robo',
        'colectivos',
        'barrios'
      ];
      
      for (const collectionName of collections) {
        try {
          const ref = db.collection(`clientes/${clientId}/${collectionName}`);
          const snapshot = await ref.get();
          
          if (snapshot.size === 0) {
            console.log(`  ℹ️ ${collectionName}: vacío`);
            continue;
          }
          
          console.log(`  📊 ${collectionName}: eliminando ${snapshot.size} documentos...`);
          
          // Eliminar cada documento
          for (const doc of snapshot.docs) {
            await doc.ref.delete();
          }
          
          console.log(`  ✅ ${collectionName}: ${snapshot.size} eliminados`);
        } catch (error) {
          console.error(`  ❌ Error en ${collectionName}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ ===== LIMPEZA COMPLETADA =====');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Solo limpiar para UN cliente específico (más seguro):
async function limpiarClienteEspecifico(clientEmail) {
  const db = firebase.firestore();
  
  try {
    // Buscar cliente por email
    console.log(`🔍 Buscando cliente: ${clientEmail}`);
    const clientesSnap = await db.collection('clientes')
      .where('email', '==', clientEmail)
      .limit(1)
      .get();
    
    if (clientesSnap.empty) {
      console.error(`❌ Cliente no encontrado: ${clientEmail}`);
      return;
    }
    
    const clientDoc = clientesSnap.docs[0];
    const clientId = clientDoc.id;
    const clientData = clientDoc.data();
    
    console.log(`✅ Cliente encontrado: ${clientData.nombre}`);
    
    if (!confirm(`🗑️ Limpiar datos de: ${clientData.nombre}?\n\n¿Estás seguro?`)) {
      console.log('❌ Operación cancelada');
      return;
    }
    
    // Limpiar todas las colecciones del cliente
    const collections = [
      'cameras',
      'cameras_privadas',
      'siniestros',
      'semaforos',
      'colegios_escuelas',
      'corredores_escolares',
      'flujo',
      'robo',
      'colectivos',
      'barrios'
    ];
    
    console.log(`🔄 Limpiando colecciones...`);
    
    for (const collectionName of collections) {
      const ref = db.collection(`clientes/${clientId}/${collectionName}`);
      const snapshot = await ref.get();
      
      if (snapshot.size === 0) {
        console.log(`  ℹ️ ${collectionName}: ya está vacío`);
        continue;
      }
      
      console.log(`  🗑️ ${collectionName}: eliminando ${snapshot.size} documentos...`);
      
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
      }
      
      console.log(`  ✅ ${collectionName}: ${snapshot.size} eliminados`);
    }
    
    console.log(`\n✅ Datos del cliente ${clientData.nombre} limpiados exitosamente`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// EJECUCIÓN:
// Para limpiar TODOS los clientes:
// limpiarCamerasMdelPlata()

// Para limpiar SOLO La Plata:
// limpiarClienteEspecifico('admin@laplatamaps.com.ar')
