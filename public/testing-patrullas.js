/**
 * Script de Testing - Patrullas Simuladas
 * Crear datos de prueba en Firestore para ver el sistema funcionando
 * 
 * Uso desde consola del navegador (F12 → Console):
 * 
 * 1. Esperar a que cargue la página
 * 2. Copiar TODO este código en la consola
 * 3. Ejecutar: crearPatrullasPrueba()
 */

// Helper: Obtener instancia de Firebase Firestore
function getFirebaseDatabase() {
  if (typeof window.db !== 'undefined' && window.db) return window.db;
  if (typeof db !== 'undefined' && db) return db;
  if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
  throw new Error('Firebase Firestore no disponible. Recarga la página con Ctrl+Shift+R');
}

async function crearPatrullasPrueba() {
  console.log('🚓 INICIANDO CREACIÓN DE PATRULLAS DE PRUEBA...');
  
  // Validar que Firebase está disponible - com múltiples fallbacks
  let firebaseDb = null;
  
  if (typeof window.db !== 'undefined' && window.db) {
    firebaseDb = window.db;
    console.log('✅ Usando window.db (Firestore)');
  } else if (typeof db !== 'undefined' && db) {
    firebaseDb = db;
    console.log('✅ Usando db (Firestore)');
  } else if (typeof firebase !== 'undefined' && firebase.firestore) {
    firebaseDb = firebase.firestore();
    console.log('✅ Creando nueva instancia de firebase.firestore()');
  } else {
    console.error('❌ Firebase Firestore no está disponible.');
    console.error('   Posibles causas:');
    console.error('   1. Página no cargó correctamente');
    console.error('   2. Caché del navegador - intenta: Ctrl+Shift+R (hard refresh)');
    console.error('   3. Firebase no inicializado');
    console.log('\n💡 Intenta diagnosticar con: debugPatrullas.testConnection()');
    return;
  }

  if (typeof currentCity === 'undefined') {
    console.error('❌ currentCity no está definido');
    return;
  }

  console.log(`📍 Ciudad actual: ${currentCity}`);

  // Datos de patrullas de prueba
  const patrullasPrueba = [
    {
      patente: 'PATRULLA_01',
      lat: currentCity === 'cordoba' ? -31.415 : -38.0,
      lng: currentCity === 'cordoba' ? -64.189 : -57.55,
      online: true,
      emergencia: false,
      estado: 'activo',
      accuracy: 10,
      speed: 0,
      timestamp: new Date()
    },
    {
      patente: 'PATRULLA_02',
      lat: currentCity === 'cordoba' ? -31.42 : -38.01,
      lng: currentCity === 'cordoba' ? -64.19 : -57.54,
      online: true,
      emergencia: false,
      estado: 'activo',
      accuracy: 15,
      speed: 20,
      timestamp: new Date()
    },
    {
      patente: 'PATRULLA_03',
      lat: currentCity === 'cordoba' ? -31.41 : -37.99,
      lng: currentCity === 'cordoba' ? -64.18 : -57.56,
      online: true,
      emergencia: true, // Una en emergencia
      estado: 'emergencia',
      accuracy: 8,
      speed: 40,
      timestamp: new Date()
    },
    {
      patente: 'PATRULLA_04',
      lat: currentCity === 'cordoba' ? -31.42 : -38.02,
      lng: currentCity === 'cordoba' ? -64.20 : -57.53,
      online: false, // Una offline
      emergencia: false,
      estado: 'offline',
      accuracy: 25,
      speed: 0,
      timestamp: new Date()
    }
  ];

  try {
    const coleccion = `patrullas_${currentCity}`;
    console.log(`\n📝 Insertando en colección: ${coleccion}`);

    for (const patrulla of patrullasPrueba) {
      await firebaseDb.collection(coleccion).doc(patrulla.patente).set({
        lat: patrulla.lat,
        lng: patrulla.lng,
        online: patrulla.online,
        emergencia: patrulla.emergencia,
        estado: patrulla.estado,
        accuracy: patrulla.accuracy,
        speed: patrulla.speed,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`  ✓ ${patrulla.patente}: Lat=${patrulla.lat.toFixed(3)}, Lng=${patrulla.lng.toFixed(3)}, Online=${patrulla.online}, Emergencia=${patrulla.emergencia}`);
    }

    console.log('\n✅ PATRULLAS DE PRUEBA CREADAS EXITOSAMENTE');
    console.log('\n📋 Siguientes pasos:');
    console.log('  1. Ir a: https://trafico-map-general-v2.web.app/');
    console.log('  2. Activar el checkbox "🚓 Mostrar Patrullas"');
    console.log('  3. Deberías ver 4 markers en el mapa:');
    console.log('     🔵 PATRULLA_01 - Activa');
    console.log('     🔵 PATRULLA_02 - Activa (en movimiento)');
    console.log('     🔴 PATRULLA_03 - EMERGENCIA (parpadeante)');
    console.log('     ⚫ PATRULLA_04 - Offline');
    console.log('\n💡 Para simular movimiento, ejecuta:');
    console.log('  simularMovimiento()');

  } catch (error) {
    console.error('❌ Error creando patrullas:', error);
  }
}

// Función para simular movimiento de patrullas
async function simularMovimiento() {
  console.log('🚗 INICIANDO SIMULACIÓN DE MOVIMIENTO...');

  try {
    const firebaseDb = getFirebaseDatabase();
  } catch (error) {
    console.error('❌ ' + error.message);
    return;
  }

  if (typeof currentCity === 'undefined') {
    console.error('❌ currentCity no disponible');
    return;
  }

  const firebaseDb = getFirebaseDatabase();
  const coleccion = `patrullas_${currentCity}`;
  let movimiento = 0;

  const intervalo = setInterval(async () => {
    movimiento += 0.0001; // Incremento pequeño para simular movimiento

    // PATRULLA_01: Estacionada
    // (sin cambios)

    // PATRULLA_02: Moviéndose
    await firebaseDb.collection(coleccion).doc('PATRULLA_02').update({
      lat: (currentCity === 'cordoba' ? -31.42 : -38.01) + Math.sin(movimiento) * 0.01,
      lng: (currentCity === 'cordoba' ? -64.19 : -57.54) + Math.cos(movimiento) * 0.01,
      speed: Math.abs(Math.sin(movimiento) * 50),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // PATRULLA_03: Moviéndose rápido (emergencia)
    await firebaseDb.collection(coleccion).doc('PATRULLA_03').update({
      lat: (currentCity === 'cordoba' ? -31.41 : -37.99) + Math.sin(movimiento * 2) * 0.02,
      lng: (currentCity === 'cordoba' ? -64.18 : -57.56) + Math.cos(movimiento * 2) * 0.02,
      speed: 60,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // PATRULLA_04: Permanece offline

    if (movimiento % 10 === 0) {
      console.log(`  ↻ Movimiento simulado (${movimiento.toFixed(1)})`);
    }

    // Parar después de 2 minutos
    if (movimiento > 120) {
      clearInterval(intervalo);
      console.log('\n⏹️ Simulación detenida después de 2 minutos');
      console.log('💡 Para reiniciar: simularMovimiento()');
    }
  }, 1000); // Actualizar cada 1 segundo

  console.log('▶️ Simulación en progreso (detente con Ctrl+C)');
}

// Función para limpiar datos de prueba
async function limpiarPatrullasPrueba() {
  console.log('🗑️ LIMPIANDO PATRULLAS DE PRUEBA...');

  try {
    const firebaseDb = getFirebaseDatabase();
  } catch (error) {
    console.error('❌ ' + error.message);
    return;
  }

  if (typeof currentCity === 'undefined') {
    console.error('❌ currentCity no disponible');
    return;
  }

  const firebaseDb = getFirebaseDatabase();
  const coleccion = `patrullas_${currentCity}`;
  const patentes = ['PATRULLA_01', 'PATRULLA_02', 'PATRULLA_03', 'PATRULLA_04'];

  try {
    for (const patente of patentes) {
      await firebaseDb.collection(coleccion).doc(patente).delete();
      console.log(`  ✓ ${patente} eliminado`);
    }
    console.log('\n✅ PATRULLAS DE PRUEBA ELIMINADAS');
  } catch (error) {
    console.error('❌ Error limpiando patrullas:', error);
  }
}

// Función para ver datos actuales
async function verPatrullas() {
  console.log('📊 PATRULLAS ACTUALES EN FIRESTORE...');

  try {
    const firebaseDb = getFirebaseDatabase();
  } catch (error) {
    console.error('❌ ' + error.message);
    return;
  }

  if (typeof currentCity === 'undefined') {
    console.error('❌ currentCity no disponible');
    return;
  }

  const firebaseDb = getFirebaseDatabase();
  const coleccion = `patrullas_${currentCity}`;

  try {
    const snapshot = await firebaseDb.collection(coleccion).get();
    console.log(`\n📍 Colección: ${coleccion}`);
    console.log(`📊 Total de documentos: ${snapshot.size}`);

    if (snapshot.size === 0) {
      console.log('  (vacía)');
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n  🚓 ${doc.id}:`);
      console.log(`     Ubicación: (${data.lat?.toFixed(4)}, ${data.lng?.toFixed(4)})`);
      console.log(`     Estado: ${data.estado}`);
      console.log(`     Online: ${data.online}`);
      console.log(`     Emergencia: ${data.emergencia}`);
      console.log(`     Velocidad: ${data.speed?.toFixed(1)} m/s`);
      console.log(`     Precisión: ${data.accuracy?.toFixed(0)}m`);
    });

  } catch (error) {
    console.error('❌ Error leyendo patrullas:', error);
  }
}

// Mostrar instrucciones
console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🚓 SCRIPT DE TESTING - PATRULLAS                     ║
╚════════════════════════════════════════════════════════════════╝

📋 COMANDOS DISPONIBLES:

1. crearPatrullasPrueba()
   → Crea 4 patrullas de prueba en Firestore
   
2. simularMovimiento()
   → Simula movimiento continuo (2 minutos)
   
3. verPatrullas()
   → Muestra patrullas actuales en consola
   
4. limpiarPatrullasPrueba()
   → Elimina todas las patrullas de prueba

📍 UBICACIONES POR CIUDAD:
   • Mar del Plata: (-38.0, -57.55)
   • Córdoba: (-31.415, -64.189)

🔴 ESTADOS:
   🔵 Online/Activa: circulo azul en mapa
   🔴 Emergencia: circulo rojo parpadeante
   ⚫ Offline: circulo gris opaco

═══════════════════════════════════════════════════════════════

PASOS PARA VER FUNCIONAR:

1. Ejecuta en esta consola:
   crearPatrullasPrueba()

2. Activa el checkbox "🚓 Mostrar Patrullas" en el sidebar

3. Deberías ver 4 markers en el mapa

4. (Opcional) Para simular movimiento:
   simularMovimiento()

═══════════════════════════════════════════════════════════════
`);
