/**
 * SCRIPT DE DIAGNÓSTICO - Panel Cliente de Carga de Datos
 * Ejecuta este script en la consola del navegador (F12) para diagnosticar problemas
 * 
 * Para usar: diagnosticClientDataLoading()
 */

async function diagnosticClientDataLoading() {
  console.log('\n🔍 ===== INICIANDO DIAGNOSTICO DE CLIENTE =====\n');
  
  // 1. Verificar si el usuario está autenticado
  console.log('1️⃣ VERIFICANDO AUTENTICACIÓN:');
  if (!clientAuth || !clientAuth.user) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  console.log('✅ Usuario:', clientAuth.user.email);
  
  // 2. Verificar datos del cliente
  console.log('\n2️⃣ VERIFICANDO DATOS DEL CLIENTE:');
  if (!clientAuth.clientData) {
    console.error('❌ No hay datos del cliente');
    return;
  }
  console.log('✅ Cliente ID:', clientAuth.clientData.id);
  console.log('✅ Nombre:', clientAuth.clientData.nombre);
  console.log('✅ Plan:', clientAuth.clientData.plan);
  
  // 3. Verificar Firebase del cliente
  console.log('\n3️⃣ VERIFICANDO FIREBASE DEL CLIENTE:');
  if (!clientAuth.clientDb) {
    console.error('❌ No hay instancia de Firestore del cliente');
    return;
  }
  console.log('✅ Firestore del cliente inicializado');
  
  // 4. Intentar leer un documento de prueba
  console.log('\n4️⃣ INTENTANDO LEER DATOS:');
  try {
    const testRef = clientAuth.clientDb.collection(`clientes/${clientAuth.clientData.id}/cameras`);
    const testSnap = await testRef.limit(1).get();
    console.log(`✅ Acceso exitoso a colección cameras: ${testSnap.size} documentos encontrados`);
  } catch (error) {
    console.error('❌ Error accediendo a cameras:', error.message);
    console.error('Error code:', error.code);
    if (error.code === 'permission-denied') {
      console.warn('⚠️ ERROR DE PERMISOS - Verificar Firestore Rules');
    }
  }
  
  // 5. Verificar que exista la colección de cámaras
  console.log('\n5️⃣ VERIFICANDO COLECCIONES:');
  const collections = ['cameras', 'cameras_privadas', 'siniestros', 'barrios'];
  for (const col of collections) {
    try {
      const ref = clientAuth.clientDb.collection(`clientes/${clientAuth.clientData.id}/${col}`);
      const snap = await ref.limit(1).get();
      console.log(`  ✅ ${col}: ${snap.size} documentos`);
    } catch (error) {
      console.error(`  ❌ ${col}: ${error.message}`);
    }
  }
  
  // 6. Verificar csvParser
  console.log('\n6️⃣ VERIFICANDO CSV PARSER:');
  if (!typeof csvParser === 'undefined') {
    console.log('✅ csvParser cargado');
    try {
      const testCSV = 'lat,lng,nombre\n-34.921,-57.955,Test';
      const parsed = csvParser.parseCSV(testCSV);
      console.log(`✅ parseCSV funcionando: ${parsed.length} registros`);
    } catch (err) {
      console.error('❌ Error en parseCSV:', err.message);
    }
  } else {
    console.error('❌ csvParser no está definido');
  }
  
  // 7. Probar carga simple
  console.log('\n7️⃣ INTENTANDO CARGA DE PRUEBA:');
  try {
    const clientId = clientAuth.clientData.id;
    const testRef = clientAuth.clientDb.collection(`clientes/${clientId}/cameras`);
    
    // Intentar agregar un documento
    const docRef = await testRef.add({
      nombre: 'TEST - Cámara de Prueba',
      lat: -34.921,
      lng: -57.955,
      camera_number: 9999,
      type: 'Prueba',
      created_at: new Date(),
      test: true
    });
    
    console.log('✅ Documento de prueba guardado:', docRef.id);
    
    // Intentar leerlo
    const docSnap = await docRef.get();
    console.log('✅ Documento de prueba leído:', docSnap.data());
    
    // Borrarlo
    await docRef.delete();
    console.log('✅ Documento de prueba eliminado');
    
  } catch (error) {
    console.error('❌ Error en prueba de carga:', error.message);
    console.error('Error code:', error.code);
  }
  
  console.log('\n✅ ===== DIAGNOSTICO COMPLETADO =====\n');
  console.log('💡 Si hay errores, revisa:');
  console.log('   - Firestore Rules (permission-denied)');
  console.log('   - CSV Parser (undefined)');
  console.log('   - Datos del cliente (null/undefined)');
}

// NO ejecutar automáticamente - solo ejecutar si el usuario lo solicita
// Para usar: diagnosticClientDataLoading()
// diagnosticClientDataLoading();
